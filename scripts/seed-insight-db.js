/* Isi database 3 bulan halaman Insight MDS (Firestore pjmds_data / insight_db_meta + insight_db_chunk_*)
   dari berkas export sheet yang sudah ada. Database ini baru DISIMPAN; halaman insight belum memakainya.
   Pakai: node scripts/seed-insight-db.js --months 2026-07,2026-08,2026-09 --files a.xlsx b.xlsx ... [--dry]
   Urutan --files penting hanya untuk baris duplikat: yang belakangan menimpa yang awal (ID sama). */
const XLSX=require('xlsx'),fs=require('fs'),path=require('path');
const B=require('./build-insight.js');
const KEY=/FS_KEY='([^']+)'/.exec(fs.readFileSync(path.join(__dirname,'pull-call.js'),'utf8'))[1];
const DB='https://firestore.googleapis.com/v1/projects/mds-sulawesi/databases/(default)/documents/pjmds_data';
async function fsGet(p){const r=await fetch(`${DB}/${p}?key=${KEY}`);if(r.status===404)return null;if(!r.ok)throw new Error('GET '+p+' '+r.status);return r.json();}
async function fsPatch(p,fields){const r=await fetch(`${DB}/${p}?key=${KEY}`,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields})});if(!r.ok)throw new Error('PATCH '+p+' '+r.status+' '+(await r.text()).slice(0,150));}
async function fsDelete(p){const r=await fetch(`${DB}/${p}?key=${KEY}`,{method:'DELETE'});if(!r.ok&&r.status!==404)throw new Error('DELETE '+p+' '+r.status);}
(async()=>{
  const a=process.argv,mi=a.indexOf('--months'),fi=a.indexOf('--files');
  if(mi<0||fi<0)throw new Error('Pakai: --months 2026-07,2026-08,2026-09 --files a.xlsx b.xlsx [--dry]');
  const months=a[mi+1].split(','),files=a.slice(fi+1).filter(x=>!x.startsWith('--')),dry=a.includes('--dry');
  const db=B.emptyDb();
  for(const f of files){
    const wb=XLSX.read(fs.readFileSync(f),{type:'buffer',sheets:B.READ_SHEETS});
    const added=B.mergeIntoDb(db,B.pickRows(XLSX,wb),null);
    console.log(path.basename(f),'baru per bulan',JSON.stringify(added));
  }
  Object.keys(db.months).forEach(m=>{if(!months.includes(m))delete db.months[m];});
  const iso=v=>new Date(Date.UTC(1899,11,30)+v*864e5).toISOString().slice(0,10);
  for(const m of Object.keys(db.months).sort()){
    const M=db.months[m],days=new Set(M.call.map(r=>r[1]));const ds=[...days].sort((x,y)=>x-y);
    console.log(m,'call',M.call.length,'order',M.ord.length,'merch',M.mer.length,'| hari',days.size,iso(ds[0])+'..'+iso(ds[ds.length-1]));
  }
  const bytes=B.packDb(db).length;console.log('ukuran database',(bytes/1e6).toFixed(2),'MB');
  if(dry){console.log('--dry: tidak menulis.');return;}
  const old=await fsGet('insight_db_meta');const oldCount=old&&old.fields&&old.fields.chunkCount?Number(old.fields.chunkCount.integerValue):0;
  const r=await B.saveDb(db,fsPatch,fsDelete,oldCount);
  console.log('Tersimpan:',r.chunks,'bagian,',(r.bytes/1e6).toFixed(2),'MB');
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
