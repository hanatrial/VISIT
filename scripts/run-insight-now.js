/* Jalankan sekali: tarik sheet, cadangkan arsip database (v1) ke berkas lokal,
   lalu hitung insight (Imadur + Hibatullah) dan simpan ke Firestore insight_*.
   Pakai: node scripts/run-insight-now.js [--dry] */
const XLSX=require('xlsx'),fs=require('fs'),path=require('path');
const SHEET_ID='18659aHA0dQiBW-dRd616uOuujYoABeo7l1d2AeUXvsU';
const FS='https://firestore.googleapis.com/v1/projects/mds-sulawesi/databases/(default)/documents/pjmds_data';
const KEY=/FS_KEY='([^']+)'/.exec(fs.readFileSync(__dirname+'/pull-call.js','utf8'))[1];
const DRY=process.argv.includes('--dry');
const PJ_CHUNK_SIZE=700000;
async function fsGet(p){const r=await fetch(`${FS}/${p}?key=${KEY}`);if(r.status===404)return null;if(!r.ok)throw new Error('GET '+p+' '+r.status);return r.json();}
async function fsPatch(p,f){const r=await fetch(`${FS}/${p}?key=${KEY}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields:f})});if(!r.ok)throw new Error('PATCH '+p+' '+r.status+' '+(await r.text()).slice(0,200));}
async function fsDelete(p){const r=await fetch(`${FS}/${p}?key=${KEY}`,{method:'DELETE'});if(!r.ok&&r.status!==404)throw new Error('DELETE '+p+' '+r.status);}

(async()=>{
  const BI=require('./build-insight.js');
  const stat=JSON.parse(fs.readFileSync(path.join(__dirname,'insight-static.json'),'utf8'));
  // cadangan arsip database sebelum ditulis ulang
  const meta=await fsGet('insight_db_meta');
  if(meta){
    const n=Number(meta.fields.chunkCount.integerValue);let s='';
    for(let i=0;i<n;i++){const d=await fsGet('insight_db_chunk_'+i);s+=d.fields.data.stringValue;}
    const bak=path.join(__dirname,'..','.arsip-insight-db-'+new Date().toISOString().slice(0,10)+'.json');
    fs.writeFileSync(bak,s);
    console.log('Cadangan arsip:',bak,(s.length/1e6).toFixed(2),'MB,',n,'bagian');
    const o=JSON.parse(s);
    const c={};for(const mo of Object.keys(o.months||{}))c[mo]=Object.values(o.months[mo]).map(a=>a.length);
    console.log('Arsip lama (v'+(o.v||1)+'):',JSON.stringify(c));
  }
  const res=await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`,{redirect:'follow'});
  if(!res.ok)throw new Error('Unduh sheet gagal: HTTP '+res.status);
  const buf=Buffer.from(await res.arrayBuffer());
  console.log('Sheet',(buf.length/1048576).toFixed(1),'MB');
  const wb=XLSX.read(buf,{type:'buffer',sheets:BI.READ_SHEETS});
  const {out,info}=await BI.runInsight({XLSX,wb,stat,fsGet,fsPatch,fsDelete});
  console.log('Info:',JSON.stringify(info));
  if(!out){console.log('Tidak ada out (pause).');return;}
  console.log('Area:',out.areas.map(a=>a.key+' ['+a.pic+'] titik '+a.titik+' bulanlalu '+(a.before?'ada':'tidak ada')).join(' | '));
  if(DRY){console.log('--dry: insight tidak ditulis.');return;}
  const js=JSON.stringify(out),ic=[];
  for(let i=0;i<js.length;i+=PJ_CHUNK_SIZE)ic.push(js.slice(i,i+PJ_CHUNK_SIZE));
  for(let i=0;i<ic.length;i++)await fsPatch('insight_chunk_'+i,{data:{stringValue:ic[i]}});
  const old=await fsGet('insight_meta');
  const oldN=old&&old.fields&&old.fields.chunkCount?Number(old.fields.chunkCount.integerValue):0;
  await fsPatch('insight_meta',{chunkCount:{integerValue:String(ic.length)},updatedAt:{stringValue:out.generatedAt}});
  for(let i=ic.length;i<oldN;i++)await fsDelete('insight_chunk_'+i);
  fs.writeFileSync(path.join(__dirname,'..','insight-data.json'),js);
  console.log('Insight:',(js.length/1e6).toFixed(2),'MB ->',ic.length,'bagian, tersimpan. insight-data.json diperbarui.');
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
