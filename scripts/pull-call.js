/* Tarik data Call & Order dari Google Sheet ke Firestore (mds-sulawesi / pjmds_data),
   format sama dengan tombol "Update Data" di dashboard.js (handlePjmdsDataFile + pjStorageSet).
   Dijalankan terjadwal oleh .github/workflows/pull-call.yml (sekitar 06.00 dan 19.00 WITA).
   Pemetaan data ada di scripts/sheet-map.js (dipakai bersama halaman tarik.html).
   Pakai: node scripts/pull-call.js [--dry]   (--dry = hanya baca & cek, tidak menulis) */
const XLSX=require('xlsx');
const {mapSheet}=require('./sheet-map.js');
const SHEET_ID='18659aHA0dQiBW-dRd616uOuujYoABeo7l1d2AeUXvsU';
const FS_PROJECT='mds-sulawesi', FS_KEY='AIzaSyCA8Q8athqYIsY3By5wPxcU97GjDBR6DAs';
const COLLECTION='pjmds_data';
const DB=`https://firestore.googleapis.com/v1/projects/${FS_PROJECT}/databases/(default)/documents/${COLLECTION}`;
const DRY=process.argv.includes('--dry');
const MAX_CHUNK_BYTES=900000;     // batas dokumen Firestore 1 MiB
const PJ_CHUNK_SIZE=700000;       // sama dengan dashboard.js

async function fsGet(path){
  const r=await fetch(`${DB}/${path}?key=${FS_KEY}`);
  if(r.status===404)return null;
  if(!r.ok)throw new Error(`GET ${path} -> ${r.status} ${(await r.text()).slice(0,200)}`);
  return r.json();
}
async function fsPatch(path,fields){
  const r=await fetch(`${DB}/${path}?key=${FS_KEY}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields})});
  if(!r.ok)throw new Error(`PATCH ${path} -> ${r.status} ${(await r.text()).slice(0,200)}`);
}
async function fsDelete(path){
  const r=await fetch(`${DB}/${path}?key=${FS_KEY}`,{method:'DELETE'});
  if(!r.ok&&r.status!==404)throw new Error(`DELETE ${path} -> ${r.status}`);
}
async function currentCounts(){
  try{
    const meta=await fsGet('meta');if(!meta)return null;
    const n=Number(meta.fields.chunkCount.integerValue||0);let full='';
    for(let i=0;i<n;i++){const d=await fsGet('chunk_'+i);full+=d?d.fields.data.stringValue:'';}
    const cur=JSON.parse(full);return{call:cur.call.length,order:cur.order.length,chunkCount:n};
  }catch(e){console.warn('Tidak bisa membaca data lama:',e.message);return null;}
}

(async()=>{
  const url=`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`;
  const res=await fetch(url,{redirect:'follow'});
  if(!res.ok)throw new Error('Unduh Google Sheet gagal: HTTP '+res.status);
  const buf=Buffer.from(await res.arrayBuffer());
  console.log('Diunduh',(buf.length/1024/1024).toFixed(1),'MB');
  const wb=XLSX.read(buf,{type:'buffer',sheets:['Call','Order']});
  const {call,order}=mapSheet(XLSX,wb);
  console.log(`Sheet: ${call.length} baris call, ${order.length} baris order`);

  // Pengaman: jangan timpa data bagus dengan hasil kosong / jauh lebih kecil.
  const cur=await currentCounts();
  if(cur)console.log(`Firestore sekarang: ${cur.call} call, ${cur.order} order`);
  if(call.length<100)throw new Error('Baris call terlalu sedikit ('+call.length+'), dibatalkan.');
  if(cur&&call.length<cur.call*0.5)throw new Error(`Baris call turun drastis (${cur.call} -> ${call.length}), dibatalkan.`);
  if(cur&&order.length<cur.order*0.5)throw new Error(`Baris order turun drastis (${cur.order} -> ${order.length}), dibatalkan.`);

  const payload=JSON.stringify({call,order,meta:{filename:'Google Sheet Call (otomatis)',uploadedAt:new Date().toISOString()}});
  let size=PJ_CHUNK_SIZE;
  const chunksOf=n=>{const a=[];for(let i=0;i<payload.length;i+=n)a.push(payload.slice(i,i+n));return a;};
  let chunks=chunksOf(size);
  while(chunks.some(c=>Buffer.byteLength(c,'utf8')>MAX_CHUNK_BYTES)){size=Math.floor(size*0.8);chunks=chunksOf(size);}
  console.log(`Payload ${(payload.length/1024/1024).toFixed(1)} MB -> ${chunks.length} bagian`);
  if(DRY){console.log('--dry: tidak menulis ke Firestore.');return;}

  for(let i=0;i<chunks.length;i++)await fsPatch('chunk_'+i,{data:{stringValue:chunks[i]}});
  const oldCount=cur?cur.chunkCount:0;
  await fsPatch('meta',{chunkCount:{integerValue:String(chunks.length)},updatedAt:{stringValue:new Date().toISOString()},
    callCount:{integerValue:String(call.length)},orderCount:{integerValue:String(order.length)}});
  for(let i=chunks.length;i<oldCount;i++)await fsDelete('chunk_'+i);
  console.log('Selesai: data tersimpan di Firestore.');

  // Data halaman insight-mds.html (ikut tarikan yang sama; gagal di sini tidak boleh mengganggu scorecard).
  try{
    const lk=await fsGet('insight_lock');
    if(lk&&lk.fields&&lk.fields.locked&&lk.fields.locked.booleanValue){console.log('Insight dibekukan (insight_lock), dilewati.');}else{
    const BI=require('./build-insight.js');
    const stat=JSON.parse(require('fs').readFileSync(require('path').join(__dirname,'insight-static.json'),'utf8'));
    const {out,info}=await BI.runInsight({XLSX,wb:XLSX.read(buf,{type:'buffer',sheets:BI.READ_SHEETS}),stat,fsGet,fsPatch,fsDelete});
    console.log('Insight mode:',info.mode,'| bulan sheet:',info.cm,'| bulan disetujui:',info.approved,info.closed?'| bulan ditutup: '+JSON.stringify(info.closed):'');
    if(!out){console.log('Insight menunggu persetujuan bulan baru: data insight tidak diperbarui.');}else{
    const js=JSON.stringify(out);const ic=[];for(let i=0;i<js.length;i+=PJ_CHUNK_SIZE)ic.push(js.slice(i,i+PJ_CHUNK_SIZE));
    for(let i=0;i<ic.length;i++)await fsPatch('insight_chunk_'+i,{data:{stringValue:ic[i]}});
    await fsPatch('insight_meta',{chunkCount:{integerValue:String(ic.length)},updatedAt:{stringValue:out.generatedAt}});
    console.log('Insight: '+(js.length/1e6).toFixed(2)+' MB -> '+ic.length+' bagian, tersimpan.');
    }
    }
  }catch(e){console.warn('Insight dilewati:',e.message);}
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
