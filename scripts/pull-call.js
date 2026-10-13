/* Tarik data Call & Order dari Google Sheet ke Firestore (mds-sulawesi / pjmds_data),
   format sama dengan tombol "Update Data" di dashboard.js (handlePjmdsDataFile + pjStorageSet).
   Dijalankan terjadwal oleh .github/workflows/pull-call.yml (tiap 06.00 WITA).
   Pakai: node scripts/pull-call.js [--dry]   (--dry = hanya baca & cek, tidak menulis) */
const XLSX=require('xlsx');
const SHEET_ID='18659aHA0dQiBW-dRd616uOuujYoABeo7l1d2AeUXvsU';
const FS_PROJECT='mds-sulawesi', FS_KEY='AIzaSyCA8Q8athqYIsY3By5wPxcU97GjDBR6DAs';
const COLLECTION='pjmds_data';
const DB=`https://firestore.googleapis.com/v1/projects/${FS_PROJECT}/databases/(default)/documents/${COLLECTION}`;
const DRY=process.argv.includes('--dry');
const MAX_CHUNK_BYTES=900000;     // batas dokumen Firestore 1 MiB
const PJ_CHUNK_SIZE=700000;       // sama dengan dashboard.js

const iso=v=>v instanceof Date?v.toISOString():v;
function findSheet(wb,name){
  const n=wb.SheetNames.find(s=>s.trim().toLowerCase()===name.toLowerCase());
  return n?wb.Sheets[n]:null;
}
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
  const wb=XLSX.read(buf,{type:'buffer',cellDates:true});
  const callSheet=findSheet(wb,'Call'),orderSheet=findSheet(wb,'Order');
  if(!callSheet)throw new Error('Sheet "Call" tidak ditemukan. Sheet yang ada: '+wb.SheetNames.join(', '));
  const callRaw=XLSX.utils.sheet_to_json(callSheet,{defval:null});
  const orderRaw=orderSheet?XLSX.utils.sheet_to_json(orderSheet,{defval:null}):[];

  const call=callRaw.map(r=>({
    Bulan:Number(r['Bulan']),Tanggal:iso(r['Tanggal']),
    NamaMDS:r['Nama MDS'],PIC:r['PIC'],Provinsi:r['Provinsi'],
    KodeCustomer:String(r['Kode Customer']),NamaCustomer:r['Nama Customer'],Kabupaten:r['Kabupaten'],
    Klasifikasi:r['Klasifikasi'],Sekolah:r['Sekolah'],StatusSekolah:r['Status Sekolah']===true,
    OmzetNS:Number(r['Omzet NS'])||0,OmzetHILO:Number(r['Omzet HILO'])||0,TotalOrder:Number(r['Total Order'])||0,
    CheckIn:iso(r['Check In']),
    KoordinatCall:r['Koordinat Call']||null
  }));
  // Value kosong dibiarkan 0: dashboard menghitungnya saat dibaca (pjOrderValue = Value || Qty*harga).
  const order=orderRaw.map(r=>({
    Bulan:Number(r['Bulan']),Tanggal:iso(r['Tanggal']),
    NamaMDS:r['Nama MDS'],KodeCustomer:String(r['Kode Customer']),
    NamaCustomer:r['Nama Customer'],Kabupaten:r['Kabupaten'],Klasifikasi:r['Klasifikasi'],
    Brand:r['Brand'],NamaItem:r['Nama Item']||'',Qty:Number(r['Qty'])||0,Value:Number(r['Value'])||0
  }));
  console.log(`Sheet: ${call.length} baris call, ${order.length} baris order`);

  // Pengaman: jangan timpa data bagus dengan hasil kosong / jauh lebih kecil.
  const cur=await currentCounts();
  if(cur)console.log(`Firestore sekarang: ${cur.call} call, ${cur.order} order`);
  if(call.length<100)throw new Error('Baris call terlalu sedikit ('+call.length+'), dibatalkan.');
  if(cur&&call.length<cur.call*0.5)throw new Error(`Baris call turun drastis (${cur.call} -> ${call.length}), dibatalkan.`);
  if(cur&&order.length<cur.order*0.5)throw new Error(`Baris order turun drastis (${cur.order} -> ${order.length}), dibatalkan.`);

  const payload=JSON.stringify({call,order,meta:{filename:'Google Sheet Call (otomatis 06.00 WITA)',uploadedAt:new Date().toISOString()}});
  let size=PJ_CHUNK_SIZE;
  const chunksOf=n=>{const a=[];for(let i=0;i<payload.length;i+=n)a.push(payload.slice(i,i+n));return a;};
  let chunks=chunksOf(size);
  while(chunks.some(c=>Buffer.byteLength(c,'utf8')>MAX_CHUNK_BYTES)){size=Math.floor(size*0.8);chunks=chunksOf(size);}
  console.log(`Payload ${(payload.length/1024/1024).toFixed(1)} MB -> ${chunks.length} bagian`);
  if(DRY){console.log('--dry: tidak menulis ke Firestore.');return;}

  for(let i=0;i<chunks.length;i++)await fsPatch('chunk_'+i,{data:{stringValue:chunks[i]}});
  const oldCount=cur?cur.chunkCount:0;
  await fsPatch('meta',{chunkCount:{integerValue:String(chunks.length)},updatedAt:{stringValue:new Date().toISOString()}});
  for(let i=chunks.length;i<oldCount;i++)await fsDelete('chunk_'+i);
  console.log('Selesai: data tersimpan di Firestore.');
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
