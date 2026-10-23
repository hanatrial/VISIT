/* Hitung data halaman insight-mds.html dari Google Sheet Call.
   Dipanggil scripts/pull-call.js tiap tarikan Call (hasil ke Firestore insight_*), atau dijalankan langsung untuk berkas lokal.
   Bagian statis (batas kecamatan, penduduk, sekolah, titik keramaian OSM per kecamatan) ada di
   scripts/insight-static.json; script ini hanya menghitung ulang bagian yang berasal dari sheet.
   Pakai: node scripts/build-insight.js [--file path.xlsx]  (--file = pakai berkas lokal, tanpa unduh) */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.InsightBuild=factory();
})(typeof self!=='undefined'?self:this,function(){
const SHEET_ID='18659aHA0dQiBW-dRd616uOuujYoABeo7l1d2AeUXvsU';
const PIC='Muhammad Imadur';
const BB={'Sulawesi Selatan':[-8,-1.5,117,122.5],'Gorontalo':[0,1.6,121,124.5]};
const GR=[['NutriSari',['Jeruk Peras','NS Tea','ASO','Mango','Nipis','Anggur','NS Lainnya']],['HI LO',['Matcha','Coklat','Swiss','Thai Tea','White','School','Hilo Lainnya']]];
const PATS=[/JERUK PERAS/,/^NS .*(LEMON|LYCHEE|BLACKCURRANT|PEACH|ORANGE|APPLE) TEA/,/\bASO\b/,/SWEET MANGO/,s=>/JERUK NIPIS/.test(s)&&!/JAHE/.test(s),/ANGGUR/,null,/CREAMY MATCHA/,/^HI ?LO CHOCOLATE PLS/,/SWISS CHOCOLATE/,/THAI TEA/,/WHITE CHOCOLATE/,/HI ?LO SCHOOL/,null];
const OTHER={NUTRISARI:6,'HI LO':13};
const FOKUS=GR.flatMap(g=>g[1]);
FOKUS.push('Peras + ASO'); // indeks 14: visit yang menjual Jeruk Peras atau ASO (dipakai Gorontalo)

const iso=v=>new Date(Date.UTC(1899,11,30)+v*864e5).toISOString().slice(0,10);
const parse=s=>{const m=/^(-?\d+\.\d+), ?(-?\d+\.\d+)$/.exec(s||'');return m?[+m[1],+m[2]]:null;};
const kabKey=s=>{s=String(s||'').toLowerCase().replace(/^kab\.\s*/,'').replace(/\bkabupaten\b/,'').trim();
  const kota=/^kota\s+/.test(s);s=s.replace(/^kota\s+/,'').replace(/\bdan\b/g,'').replace(/[^a-z]/g,'');
  return(kota&&s==='gorontalo')?'kotagorontalo':s;};
const inRing=(x,y,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
const inPoly=(x,y,p)=>inRing(x,y,p[0])&&!p.slice(1).some(h=>inRing(x,y,h));
const pct=arr=>arr.map(v=>{const below=arr.filter(w=>w<v).length,eq=arr.filter(w=>w===v).length;return 100*(below+(eq-1)/2)/Math.max(arr.length-1,1);});

/* ---- Database 3 bulan (arsip bulan lalu) ----
   Isi: baris PIC yang sudah diringkas per tabel (Call, Order, Merchandise), dikelompokkan per bulan.
   Bulan berjalan tidak disimpan di sini: diambil langsung dari sheet. Tutup bulan = pindahkan bulan yang sudah lewat
   dari sheet ke database, lalu buang bulan tertua sampai tersisa MAKS_BULAN. */
const MAKS_BULAN=4; // 3 bulan database + bulan berjalan; dibuang hanya saat pergantian bulan disetujui
const COLS={
  call:['ID Call','Tanggal','Provinsi','Kabupaten'],
  ord:['ID Order','ID Call','Tanggal','Provinsi','Nama MDS','Brand','Nama Item','Value','Koordinat Call'],
  mer:['ID Merch','ID Call','Tanggal','Check In','Provinsi','Nama MDS','Kode Customer','Nama Customer','Kabupaten','Tipe Customer','Koordinat Call','Total SKU']
};
const monthOf=v=>iso(v).slice(0,7);
function emptyDb(){return{months:{}};}
function pickRows(XLSX,wb){
  const rows=n=>wb.Sheets[n]?XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:null}).filter(r=>r.PIC===PIC):[];
  return{call:rows('Call'),ord:rows('Order'),mer:rows('Merchandise')};
}
function slim(t,rows){return rows.filter(r=>Number.isFinite(r.Tanggal)).map(r=>COLS[t].map(c=>r[c]===undefined?null:r[c]));}
/* gabungkan baris sheet ke database; onlyBefore ('YYYY-MM') = hanya bulan sebelum bulan itu; duplikat (ID sama) diganti yang terbaru */
function mergeIntoDb(db,picked,onlyBefore){
  const added={};
  for(const t of ['call','ord','mer']){
    const idc=COLS[t].indexOf(t==='call'?'ID Call':t==='ord'?'ID Order':'ID Merch'),tc=COLS[t].indexOf('Tanggal');
    const idx={};
    for(const row of slim(t,picked[t])){
      const m=monthOf(row[tc]);if(onlyBefore&&m>=onlyBefore)continue;
      const M=db.months[m]||(db.months[m]={call:[],ord:[],mer:[]});
      const map=idx[m]||(idx[m]=new Map(M[t].map((r,i)=>[r[idc],i])));
      const k=row[idc];
      if(k!=null&&map.has(k))M[t][map.get(k)]=row;else{M[t].push(row);if(k!=null)map.set(k,M[t].length-1);added[m]=(added[m]||0)+1;}
    }
  }
  return added;
}
function trimDb(db,max){
  const keys=Object.keys(db.months).sort(),drop=keys.slice(0,Math.max(0,keys.length-(max||MAKS_BULAN)));
  drop.forEach(k=>delete db.months[k]);return drop;
}
/* tutup bulan: pindahkan semua bulan yang sudah lewat (sebelum bulan terbaru di sheet) ke database, buang yang tertua */
function closeMonths(db,picked){
  const ds=picked.call.map(r=>r.Tanggal).filter(Number.isFinite);
  if(!ds.length)throw new Error('Sheet tidak punya data call.');
  const current=monthOf(Math.max(...ds));
  const added=mergeIntoDb(db,picked,current);
  const dropped=trimDb(db);
  return{current,added,dropped};
}
function packDb(db){return JSON.stringify({v:1,months:db.months});}
function unpackDb(str){const o=JSON.parse(str);return{months:o.months||{}};}
function dbExtra(db){
  const ex={call:[],ord:[],mer:[]};
  for(const m of Object.keys(db.months).sort())for(const t of ['call','ord','mer'])
    for(const row of db.months[m][t]){const o={PIC};COLS[t].forEach((c,i)=>o[c]=row[i]);ex[t].push(o);}
  return ex;
}
const DB_CHUNK=500000;
async function loadDb(fsGet){
  const m=await fsGet('insight_db_meta');
  if(!m||!m.fields||!m.fields.chunkCount)return emptyDb();
  const n=Number(m.fields.chunkCount.integerValue);let str='';
  for(let i=0;i<n;i++){const d=await fsGet('insight_db_chunk_'+i);str+=d&&d.fields?d.fields.data.stringValue:'';}
  return str?unpackDb(str):emptyDb();
}
async function saveDb(db,fsPatch,fsDelete,oldCount){
  const str=packDb(db),ch=[];for(let i=0;i<str.length;i+=DB_CHUNK)ch.push(str.slice(i,i+DB_CHUNK));
  for(let i=0;i<ch.length;i++)await fsPatch('insight_db_chunk_'+i,{data:{stringValue:ch[i]}});
  await fsPatch('insight_db_meta',{chunkCount:{integerValue:String(ch.length)},updatedAt:{stringValue:new Date().toISOString()},months:{stringValue:Object.keys(db.months).sort().join(',')}});
  for(let i=ch.length;i<(oldCount||0);i++)await fsDelete('insight_db_chunk_'+i);
  return{chunks:ch.length,bytes:str.length};
}

/* ---- Persetujuan pergantian bulan ----
   Penarikan otomatis berjalan sampai closing bulan berjalan. Begitu sheet berisi bulan yang lebih baru dari bulan yang disetujui,
   data insight berhenti di bulan itu (final) dan menunggu persetujuan pemilik. Setelah disetujui, tarikan berikutnya menutup bulan
   (bulan lama masuk database, bulan tertua dibuang) dan data serta gambar insight diganti dengan bulan baru. */
function liveMonth(picked){const ds=picked.call.map(r=>r.Tanggal).filter(Number.isFinite);return ds.length?monthOf(Math.max(...ds)):null;}
function decideState(state,cm){
  if(!state||!state.month||!cm||cm<=state.month)return{mode:'normal'};
  if(state.approveMonth&&state.approveMonth>=cm)return{mode:'advance'};
  return{mode:'pause',upTo:state.month,pending:cm};
}
async function loadState(fsGet){
  const d=await fsGet('insight_state');if(!d||!d.fields)return null;
  const g=k=>d.fields[k]&&d.fields[k].stringValue||'';
  return{month:g('month'),approveMonth:g('approveMonth'),pendingMonth:g('pendingMonth')};
}
async function saveState(fsPatch,st){
  await fsPatch('insight_state',{month:{stringValue:st.month||''},approveMonth:{stringValue:st.approveMonth||''},pendingMonth:{stringValue:st.pendingMonth||''},updatedAt:{stringValue:new Date().toISOString()}});
}
/* satu pintu untuk pull-call.js dan tarik.js: tentukan mode (normal/pause/advance), tutup bulan bila disetujui, hitung insight */
async function runInsight(env){
  const{XLSX,wb,stat,fsGet,fsPatch,fsDelete}=env;
  const picked=pickRows(XLSX,wb),cm=liveMonth(picked);
  let state=await loadState(fsGet);
  const d=decideState(state,cm);
  const db=await loadDb(fsGet);
  const info={mode:d.mode,cm,approved:state&&state.month||null};
  // Sheet hanya menyimpan sekitar satu bulan: setiap tarikan, baris yang baru dicadangkan ke database (ID yang sama diganti).
  // Tidak ada yang dihapus kecuali pergantian bulan disetujui.
  const added=mergeIntoDb(db,picked,null);
  info.added=Object.values(added).reduce((x,y)=>x+y,0);
  let month;
  if(d.mode==='advance'){
    info.dropped=trimDb(db,MAKS_BULAN);
    state={month:cm,approveMonth:'',pendingMonth:''};await saveState(fsPatch,state);
    month=cm;
  }else if(d.mode==='pause'){
    state=Object.assign({},state,{pendingMonth:cm});await saveState(fsPatch,state);
    month=state.month;
  }else{
    if(!state||!state.month){state={month:cm,approveMonth:'',pendingMonth:''};await saveState(fsPatch,state);}
    month=state.month||cm;
  }
  if(info.added>0||d.mode==='advance'){
    const old=await fsGet('insight_db_meta');const oldCount=old&&old.fields&&old.fields.chunkCount?Number(old.fields.chunkCount.integerValue):0;
    await saveDb(db,fsPatch,fsDelete,oldCount);
  }
  const out=buildInsight(XLSX,wb,stat,db,{month,pending:d.pending});
  return{out,info};
}

const prevMonth=m=>{const p=m.split('-').map(Number);return new Date(Date.UTC(p[0],p[1]-2,1)).toISOString().slice(0,7);};
function buildInsight(XLSX,wb,stat,db,opts){
  opts=opts||{};
  const live=pickRows(XLSX,wb);
  if(live.call.length<20)throw new Error('Baris call terlalu sedikit ('+live.call.length+'), dibatalkan.');
  // sheet + database digabung (ID yang sama: sheet menang), lalu disaring per bulan
  const all={call:live.call.slice(),ord:live.ord.slice(),mer:live.mer.slice()};
  const dbMonths=db?Object.keys(db.months).sort():[];
  if(db&&dbMonths.length){
    const ex=dbExtra(db),idk={call:'ID Call',ord:'ID Order',mer:'ID Merch'};
    for(const t of ['call','ord','mer']){const have=new Set(live[t].map(r=>r[idk[t]]));all[t]=all[t].concat(ex[t].filter(r=>!have.has(r[idk[t]])));}
  }
  const inM=(rows,m)=>rows.filter(r=>Number.isFinite(r.Tanggal)&&monthOf(r.Tanggal)===m);
  const cmpCm=opts.month||liveMonth(live),cmpPm=prevMonth(cmpCm);
  // analisis utama = bulan berjalan saja; bulan lalu hanya untuk perbandingan
  const call=inM(all.call,cmpCm),ord=inM(all.ord,cmpCm),mer=inM(all.mer,cmpCm);
  if(!call.length)throw new Error('Tidak ada data call untuk bulan '+cmpCm);
  const cmpMer=inM(all.mer,cmpPm).concat(mer);
  const dates=call.map(r=>r.Tanggal).filter(Number.isFinite);
  const out={generatedAt:new Date().toISOString(),periode:[iso(Math.min(...dates)),iso(Math.max(...dates))],dbMonths,month:cmpCm,pending:opts.pending||null,fokus:FOKUS,groups:GR.map(g=>({b:g[0],n:g[1].length})),prov:{}};

  // heatmap dari penjualan: visit transaksi (nominal > 0, bukan bonus)
  const heat={};
  for(const r of ord){
    if(!(r.Value>0)||r.Brand==='BONUS')continue;
    const nm=String(r['Nama Item']||'').toUpperCase();
    const h=heat[r['ID Call']]||(heat[r['ID Call']]={mds:r['Nama MDS'],prov:r.Provinsi,g:new Set(),xy:null});
    if(!h.xy)h.xy=r['Koordinat Call'];
    let hit=false;
    PATS.forEach((p,gi)=>{if(p&&(typeof p==='function'?p(nm):p.test(nm))){h.g.add(gi);hit=true;}});
    if(!hit&&OTHER[r.Brand]!==undefined)h.g.add(OTHER[r.Brand]);
    if(h.g.has(0)||h.g.has(2))h.g.add(14);
  }
  const covered={};call.forEach(r=>{(covered[r.Provinsi]=covered[r.Provinsi]||{})[kabKey(r.Kabupaten)]=1;});

  for(const prov of Object.keys(stat)){
    const P={mds:{},titik:[],kec:stat[prov].map(k=>({...k}))};
    for(const c of Object.values(heat)){
      if(c.prov!==prov)continue;
      const m=P.mds[c.mds]||(P.mds[c.mds]={n:0,ada:FOKUS.map(()=>0)});
      m.n++;c.g.forEach(gi=>m.ada[gi]++);
    }
    for(const k of Object.keys(P.mds))if(P.mds[k].n<10)delete P.mds[k];

    // titik = toko unik yang AV-nya pernah diinput (sheet Merchandise), koordinat check-in terbaru
    const tx={};
    for(const r of mer){
      if(r.Provinsi!==prov||!P.mds[r['Nama MDS']])continue;
      const p=parse(r['Koordinat Call']),b=BB[prov];
      if(!p||p[0]<b[0]||p[0]>b[1]||p[1]<b[2]||p[1]>b[3])continue;
      const k=r['Kode Customer'],t=(r.Tanggal||0)+(r['Check In']||0);
      if(!tx[k]||t>tx[k].t)tx[k]={t,p,mds:r['Nama MDS'],nama:r['Nama Customer'],kab:r.Kabupaten,tipe:r['Tipe Customer'],tgl:iso(r.Tanggal),sku:Number(r['Total SKU'])||0};
    }
    P.titik=Object.values(tx).map(x=>[+x.p[0].toFixed(6),+x.p[1].toFixed(6),x.mds,x.nama,x.kab,x.tipe,x.tgl,1]);

    // kecamatan: bbox + centroid, indeks kecamatan tiap titik
    P.kec.forEach(k=>{
      const r=k.g.reduce((a,b)=>b[0].length>a[0].length?b:a)[0];
      k.bb=[Math.min(...r.map(c=>c[0])),Math.min(...r.map(c=>c[1])),Math.max(...r.map(c=>c[0])),Math.max(...r.map(c=>c[1]))];
      k.cx=r.reduce((a,c)=>a+c[0],0)/r.length;k.cy=r.reduce((a,c)=>a+c[1],0)/r.length;k.tx=0;
      k.cov=(covered[prov]||{})[kabKey(k.kab)]||(kabKey(k.kab)==='pangkajenedankepulauan'&&(covered[prov]||{}).pangkajenekepulauan)?1:0;
    });
    const skus=Object.values(tx).map(x=>x.sku);
    // heatmap per kecamatan untuk tiap MDS (dipakai saat filter satu MDS): [jumlah visit transaksi, ...jumlah per kelompok item]
    P.hk={};
    for(const c of Object.values(heat)){
      if(c.prov!==prov||!P.mds[c.mds])continue;
      const p=parse(c.xy);let idx=-1;
      if(p)for(let i=0;i<P.kec.length&&idx<0;i++){const k=P.kec[i];if(p[1]<k.bb[0]||p[1]>k.bb[2]||p[0]<k.bb[1]||p[0]>k.bb[3])continue;if(k.g.some(g=>inPoly(p[1],p[0],g)))idx=i;}
      const o=P.hk[c.mds]||(P.hk[c.mds]={});const a=o[idx]||(o[idx]=[0].concat(FOKUS.map(()=>0)));
      a[0]++;c.g.forEach(gi=>a[gi+1]++);
    }
    P.titik.forEach((t,ti)=>{
      let idx=-1;
      for(let i=0;i<P.kec.length&&idx<0;i++){const k=P.kec[i];if(t[1]<k.bb[0]||t[1]>k.bb[2]||t[0]<k.bb[1]||t[0]>k.bb[3])continue;if(k.g.some(p=>inPoly(t[1],t[0],p)))idx=i;}
      t.push(idx);t.push(skus[ti]);if(idx>=0)P.kec[idx].tx++;
    });

    // perbandingan titik operator ber-AV: bulan lalu vs bulan berjalan, per kecamatan. Baris: [lat,lon,MDS,idx kecamatan,total SKU]
    P.cmp={pm:cmpPm,cm:cmpCm,prev:[],cur:[]};
    for(const [lab,month] of [['prev',cmpPm],['cur',cmpCm]]){
      const last={};
      for(const r of cmpMer){
        if(r.Provinsi!==prov||!P.mds[r['Nama MDS']]||!Number.isFinite(r.Tanggal)||monthOf(r.Tanggal)!==month)continue;
        const p=parse(r['Koordinat Call']),bb=BB[prov];
        if(!p||p[0]<bb[0]||p[0]>bb[1]||p[1]<bb[2]||p[1]>bb[3])continue;
        const k=r['Kode Customer'],t=(r.Tanggal||0)+(r['Check In']||0);
        if(!last[k]||t>last[k].t)last[k]={t,p,mds:r['Nama MDS'],sku:Number(r['Total SKU'])||0};
      }
      P.cmp[lab]=Object.values(last).map(x=>{
        let idx=-1;
        for(let i=0;i<P.kec.length&&idx<0;i++){const k=P.kec[i];if(x.p[1]<k.bb[0]||x.p[1]>k.bb[2]||x.p[0]<k.bb[1]||x.p[0]>k.bb[3])continue;if(k.g.some(g=>inPoly(x.p[1],x.p[0],g)))idx=i;}
        return[+x.p[0].toFixed(5),+x.p[1].toFixed(5),x.mds,idx,x.sku];
      });
    }

    // potensi (50% penduduk + 50% keramaian) vs jumlah toko ber-AV, hanya kabupaten yang dikunjungi
    const U=P.kec.filter(k=>k.cov);
    const ker=U.map(k=>k.pasar*5+k.term*3+k.spbu+k.toko);
    const pp=pct(U.map(k=>k.pend||0)),pk=pct(ker),pt=pct(U.map(k=>k.tx));
    U.forEach((k,i)=>{k.ker=ker[i];k.pot=Math.round(.5*pp[i]+.5*pk[i]);k.txs=Math.round(pt[i]);k.celah=k.pot-k.txs;});
    const dom=P.kec.map(()=>({}));P.titik.forEach(t=>{if(t[8]>=0)dom[t[8]][t[2]]=(dom[t[8]][t[2]]||0)+1;});
    const withTx=P.kec.map((k,i)=>({k,i})).filter(x=>x.k.tx);
    P.kec.forEach((k,i)=>{
      if(!k.cov)return;let j=i;
      if(!k.tx){let bd=1e18;withTx.forEach(x=>{const d=(x.k.cx-k.cx)**2+(x.k.cy-k.cy)**2;if(d<bd){bd=d;j=x.i;}});}
      const e=Object.entries(dom[j]).sort((a,b)=>b[1]-a[1])[0];k.mds=e?e[0]:null;
    });
    P.kec.forEach(k=>{delete k.bb;delete k.cx;delete k.cy;});
    out.prov[prov]=P;
    console.log(prov,'MDS',Object.keys(P.mds).length,'titik',P.titik.length,'kecamatan dicakup',U.length);
  }
  return out;
}
return{buildInsight,runInsight,loadState,saveState,decideState,liveMonth,pickRows,mergeIntoDb,trimDb,closeMonths,emptyDb,packDb,unpackDb,loadDb,saveDb,READ_SHEETS:['Call','Merchandise','Order'],MAKS_BULAN};
});

if(typeof module==='object'&&require.main===module)(async()=>{
  const XLSX=require('xlsx'),fs=require('fs'),path=require('path');
  const SHEET_ID='18659aHA0dQiBW-dRd616uOuujYoABeo7l1d2AeUXvsU';
  const {buildInsight,READ_SHEETS}=module.exports;
  const stat=JSON.parse(fs.readFileSync(path.join(__dirname,'insight-static.json'),'utf8'));
  const fi=process.argv.indexOf('--file');
  let buf;
  if(fi>0)buf=fs.readFileSync(process.argv[fi+1]);
  else{
    const res=await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`,{redirect:'follow'});
    if(!res.ok)throw new Error('Unduh Google Sheet gagal: HTTP '+res.status);
    buf=Buffer.from(await res.arrayBuffer());
  }
  let db=null;try{const k=/FS_KEY='([^']+)'/.exec(fs.readFileSync(path.join(__dirname,'pull-call.js'),'utf8'))[1];db=await module.exports.loadDb(async p=>{const r=await fetch('https://firestore.googleapis.com/v1/projects/mds-sulawesi/databases/(default)/documents/pjmds_data/'+p+'?key='+k);return r.ok?r.json():null;});}catch(e){console.warn('Database tidak terbaca:',e.message);}
  const out=buildInsight(XLSX,XLSX.read(buf,{type:'buffer',sheets:READ_SHEETS}),stat,db);
  fs.writeFileSync(path.join(__dirname,'..','insight-data.json'),JSON.stringify(out));
  console.log('insight-data.json ditulis,',(JSON.stringify(out).length/1e6).toFixed(2),'MB');
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
