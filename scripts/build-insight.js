/* Bekukan data halaman insight-mds.html dari Google Sheet Call (snapshot).
   Dijalankan .github/workflows/insight-snapshot.yml (tanggal 3 tiap bulan + tombol Run workflow).
   Bagian statis (batas kecamatan, penduduk, sekolah, titik keramaian OSM per kecamatan) ada di
   scripts/insight-static.json; script ini hanya menghitung ulang bagian yang berasal dari sheet.
   Pakai: node scripts/build-insight.js [--file path.xlsx]  (--file = pakai berkas lokal, tanpa unduh) */
const XLSX=require('xlsx'),fs=require('fs'),path=require('path');
const SHEET_ID='18659aHA0dQiBW-dRd616uOuujYoABeo7l1d2AeUXvsU';
const PIC='Muhammad Imadur';
const BB={'Sulawesi Selatan':[-8,-1.5,117,122.5],'Gorontalo':[0,1.6,121,124.5]};
const GR=[['NutriSari',['Jeruk Peras','American Sweet Orange','Anggur','Nipis','Mango','Manis','NS Tea']],['HI LO',['Matcha','Swiss','School','Coklat','Chocomalt']]];
const PATS=[/JERUK PERAS/,/\bASO\b/,/ANGGUR/,s=>/JERUK NIPIS/.test(s)&&!/JAHE/.test(s),/SWEET MANGO/,/JERUK \(EX\) MANIS|JERUK MANIS/,/^NS .*(LEMON|LYCHEE|BLACKCURRANT|PEACH|ORANGE|APPLE) TEA/,/CREAMY MATCHA/,/SWISS CHOCOLATE/,/HI ?LO SCHOOL/,/^HI ?LO CHOCOLATE PLS/,/CHOCO MALT/];
const FOKUS=GR.flatMap(g=>g[1]);

const iso=v=>new Date(Date.UTC(1899,11,30)+v*864e5).toISOString().slice(0,10);
const parse=s=>{const m=/^(-?\d+\.\d+), ?(-?\d+\.\d+)$/.exec(s||'');return m?[+m[1],+m[2]]:null;};
const kabKey=s=>{s=String(s||'').toLowerCase().replace(/^kab\.\s*/,'').replace(/\bkabupaten\b/,'').trim();
  const kota=/^kota\s+/.test(s);s=s.replace(/^kota\s+/,'').replace(/\bdan\b/g,'').replace(/[^a-z]/g,'');
  return(kota&&s==='gorontalo')?'kotagorontalo':s;};
const inRing=(x,y,r)=>{let c=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const[xi,yi]=r[i],[xj,yj]=r[j];if((yi>y)!==(yj>y)&&x<(xj-xi)*(y-yi)/(yj-yi)+xi)c=!c;}return c;};
const inPoly=(x,y,p)=>inRing(x,y,p[0])&&!p.slice(1).some(h=>inRing(x,y,h));
const pct=arr=>arr.map(v=>{const below=arr.filter(w=>w<v).length,eq=arr.filter(w=>w===v).length;return 100*(below+(eq-1)/2)/Math.max(arr.length-1,1);});

(async()=>{
  const fi=process.argv.indexOf('--file');
  let buf;
  if(fi>0)buf=fs.readFileSync(process.argv[fi+1]);
  else{
    const res=await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/export?format=xlsx`,{redirect:'follow'});
    if(!res.ok)throw new Error('Unduh Google Sheet gagal: HTTP '+res.status);
    buf=Buffer.from(await res.arrayBuffer());
  }
  const wb=XLSX.read(buf,{type:'buffer',sheets:['Call','Merchandise','Order']});
  const rows=n=>XLSX.utils.sheet_to_json(wb.Sheets[n],{defval:null}).filter(r=>r.PIC===PIC);
  const call=rows('Call'),mer=rows('Merchandise'),ord=rows('Order');
  if(call.length<500)throw new Error('Baris call terlalu sedikit ('+call.length+'), dibatalkan.');
  const stat=JSON.parse(fs.readFileSync(path.join(__dirname,'insight-static.json'),'utf8'));
  const dates=call.map(r=>r.Tanggal).filter(Number.isFinite);
  const out={generatedAt:new Date().toISOString(),periode:[iso(Math.min(...dates)),iso(Math.max(...dates))],fokus:FOKUS,groups:GR.map(g=>({b:g[0],n:g[1].length})),prov:{}};

  // heatmap dari penjualan: visit transaksi (nominal > 0, bukan bonus)
  const heat={};
  for(const r of ord){
    if(!(r.Value>0)||r.Brand==='BONUS')continue;
    const nm=String(r['Nama Item']||'').toUpperCase();
    const h=heat[r['ID Call']]||(heat[r['ID Call']]={mds:r['Nama MDS'],prov:r.Provinsi,g:new Set()});
    PATS.forEach((p,gi)=>{if(typeof p==='function'?p(nm):p.test(nm))h.g.add(gi);});
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
    P.titik.forEach((t,ti)=>{
      let idx=-1;
      for(let i=0;i<P.kec.length&&idx<0;i++){const k=P.kec[i];if(t[1]<k.bb[0]||t[1]>k.bb[2]||t[0]<k.bb[1]||t[0]>k.bb[3])continue;if(k.g.some(p=>inPoly(t[1],t[0],p)))idx=i;}
      t.push(idx);t.push(skus[ti]);if(idx>=0)P.kec[idx].tx++;
    });

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
  fs.writeFileSync(path.join(__dirname,'..','insight-data.json'),JSON.stringify(out));
  console.log('insight-data.json ditulis,',(JSON.stringify(out).length/1e6).toFixed(2),'MB');
})().catch(e=>{console.error('GAGAL:',e.message);process.exit(1);});
