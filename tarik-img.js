/* Tarik Data — gambar Sekolah Baru per area (Makassar / Gorontalo).
   Hasilnya sama dengan halaman sekolah.html yang difilter per area: gambar tabel semua MDS,
   gambar detail sekolah per MDS, dan gambar sekolah baru per MDS (item NS / Hilo).
   Memakai fungsi dari tarik.js (fsGet, $, nf, fmtWita, sleep) dan sekolah_db.js. */
(function(){
  const AREAS={
    'Makassar':['Sulfiana Rusdy','A. Mappanyukki','Andi Iswan Tenri Bau','Rahmat','Hasrar','Andi Muh. Nurfikrahturrahman','Musdalifah','Syafri'],
    'Gorontalo':['Aditya Hulopi','Mohammad Rahman Marwan','Abd. Rahman Lahay','Satrio Yusuf']
  };
  const PJ_SEKOLAH_EXCLUDE=new Set(['BUKAN SEKOLAH','OTHERS','BUKAN SEKOLA','TIDAK ADA']);
  const DB_SET=(typeof SEKOLAH_DB_NAMES!=='undefined')?new Set(SEKOLAH_DB_NAMES):new Set();
  const MAX_PER_IMAGE=30;
  let PJ=null, MANUAL={}, busyImg=false, current=null;   // current = {area, groups:[{title,items:[]}]}

  /* ── data ───────────────────────────────────────────────────────────── */
  const normName=s=>String(s||'').toUpperCase().trim().replace(/[.,]/g,'').replace(/\s+/g,' ');
  const sekKey=s=>String(s||'').trim().replace(/\s+/g,' ').toUpperCase();
  function resolveMds(sel){
    if(MANUAL[sel])return MANUAL[sel];
    const t=normName(sel);
    return PJ.names.find(n=>normName(n)===t)||null;
  }
  async function loadPJ(setMsg,metaAt){
    // pakai data yang baru ditarik di halaman ini bila versinya sama dengan di cloud
    if(window.PJ_CACHE&&(!metaAt||window.PJ_CACHE.at===metaAt)){PJ={call:window.PJ_CACHE.call,order:window.PJ_CACHE.order,at:window.PJ_CACHE.at};}
    else if(!(PJ&&metaAt&&PJ.at===metaAt)){
      setMsg('Memuat data dari cloud…');
      const meta=await fsGet('meta');
      if(!meta)throw new Error('Belum ada data Call/Order di cloud. Tarik data dulu.');
      const n=Number(meta.fields.chunkCount.integerValue||0);let full='';
      for(let i=0;i<n;i++){
        setMsg('Memuat data dari cloud ('+(i+1)+'/'+n+')…');
        const d=await fsGet('chunk_'+i);full+=d?d.fields.data.stringValue:'';
      }
      const parsed=JSON.parse(full);
      PJ={call:parsed.call||[],order:parsed.order||[],at:meta.fields.updatedAt&&meta.fields.updatedAt.stringValue};
    }
    PJ.names=[...new Set(PJ.call.map(r=>r.NamaMDS).filter(Boolean))];
    try{
      const mm=await fsGet('../pjmds_manual_match/main');
      MANUAL={};
      const f=mm&&mm.fields&&mm.fields.map&&mm.fields.map.mapValue&&mm.fields.map.mapValue.fields;
      if(f)Object.keys(f).forEach(k=>{if(f[k].stringValue)MANUAL[k]=f[k].stringValue;});
    }catch(e){MANUAL={};}
  }

  /* ── simpanan gambar (memori + IndexedDB) ───────────────────────────── */
  const REC_V=2;   // naikkan bila tampilan gambar berubah, agar gambar lama dibuat ulang
  const MEM={};   // area -> {area,sig,at,time,v,items:[{g,name,file,blob,w,h,fit}]}
  function idb(){
    return new Promise((res,rej)=>{
      if(!window.indexedDB)return rej(new Error('no idb'));
      const rq=indexedDB.open('tarik-img',1);
      rq.onupgradeneeded=()=>rq.result.createObjectStore('area',{keyPath:'area'});
      rq.onsuccess=()=>res(rq.result);rq.onerror=()=>rej(rq.error);
    });
  }
  async function idbGet(area){
    try{const db=await idb();return await new Promise((res,rej)=>{const r=db.transaction('area').objectStore('area').get(area);r.onsuccess=()=>res(r.result||null);r.onerror=()=>rej(r.error);});}catch(e){return null;}
  }
  async function idbPut(rec){
    try{const db=await idb();await new Promise((res,rej)=>{const tx=db.transaction('area','readwrite');tx.objectStore('area').put(rec);tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);});}catch(e){console.warn('Simpanan gambar gagal',e);}
  }
  async function loadStored(area){
    if(MEM[area])return MEM[area];
    const rec=await idbGet(area);
    if(rec&&rec.v===REC_V&&rec.items&&rec.items.length){MEM[area]=rec;return rec;}
    return null;
  }
  function groupsOf(rec){
    const groups=[{title:'Gambar Semua',items:[]},{title:'Detail Sekolah',items:[]},{title:'Sekolah Baru',items:[]}];
    rec.items.forEach(it=>{groups[it.g].items.push(Object.assign({},it,{url:URL.createObjectURL(it.blob)}));});
    return groups;
  }
  // tanda isi: berubah hanya bila isi sekolah/item berubah (bukan sekadar waktu tarik)
  async function signature(rows){
    const txt=(rows.latest||'')+(rows.prev||'')+JSON.stringify(rows.map(r=>[r.name,r.sek,r.hilo,r.tea,r.dHilo||0,r.dTea||0,r.ea,r.line,r.dLineEa||0,r.schools.map(s=>[s.nama,s.kab,s.baru,s.hilo,s.tea,s.item,(s.itemNames||[]).slice().sort()])]));
    try{
      const h=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(txt));
      return Array.from(new Uint8Array(h)).map(b=>b.toString(16).padStart(2,'0')).join('');
    }catch(e){let x=5381;for(let i=0;i<txt.length;i++)x=((x<<5)+x+txt.charCodeAt(i))|0;return 'd'+x+'_'+txt.length;}
  }

  /* ── hitungan (sama dengan sekolah.js) ──────────────────────────────── */
  function computeArea(area,upto){
    const rows=[];
    AREAS[area].forEach(name=>{
      const mds=resolveMds(name)||name;
      const c=PJ.call.filter(r=>r.NamaMDS===mds&&inRange(r,upto));
      if(!c.length){rows.push({name,area,sek:0,schools:[],hilo:0,tea:0,ea:0,line:0,lineEa:0});return;}
      const o=PJ.order.filter(r=>r.NamaMDS===mds&&inRange(r,upto)).filter(r=>!String(r.NamaItem).toUpperCase().startsWith('BONUS'));
      const hiloCust=new Set(o.filter(r=>String(r.Brand).toUpperCase()==='HI LO').map(r=>r.KodeCustomer));
      const teaCust=new Set(o.filter(r=>r.Brand==='NUTRISARI'&&String(r.NamaItem).toUpperCase().includes('TEA PLS')).map(r=>r.KodeCustomer));
      const sek={},custSek={};
      c.forEach(r=>{
        const key=sekKey(r.Sekolah);
        if(!key||PJ_SEKOLAH_EXCLUDE.has(key))return;
        if(!sek[key])sek[key]={nama:r.Sekolah,kab:r.Kabupaten,baru:!DB_SET.has(key),hilo:false,tea:false,items:new Set()};
        custSek[r.KodeCustomer]=key;
        if(hiloCust.has(r.KodeCustomer))sek[key].hilo=true;
        if(teaCust.has(r.KodeCustomer))sek[key].tea=true;
      });
      o.forEach(r=>{const k=custSek[r.KodeCustomer];if(k&&sek[k]&&r.NamaItem)sek[k].items.add(String(r.NamaItem).trim().toUpperCase());});
      const all=Object.values(sek),list=all.filter(x=>x.baru);
      const withItems=list.filter(x=>x.items.size>0),lineTot=withItems.reduce((a,x)=>a+x.items.size,0);
      const schools=all.filter(x=>x.items.size>0).sort((a,b)=>b.baru-a.baru||a.nama.localeCompare(b.nama))
        .map(x=>({nama:x.nama,kab:x.kab,baru:x.baru,hilo:x.hilo,tea:x.tea,item:x.items.size,itemNames:[...x.items]}));
      rows.push({name,area,sek:schools.length,schools,hilo:list.filter(x=>x.hilo).length,tea:list.filter(x=>x.tea).length,
        ea:withItems.length,line:lineTot,lineEa:withItems.length?lineTot/withItems.length:0});
    });
    rows.sort((a,b)=>a.name.localeCompare(b.name));
    return rows;
  }

  /* Tanggal data (WITA) dari nilai ISO hasil sheet-map: tengah malam WITA dikurangi 36 detik.
     Ditambah 8 jam + 36 detik lalu dipotong ke tanggal. */
  function dkey(iso){
    const t=Date.parse(iso);if(isNaN(t))return null;
    return new Date(t+8*3600e3+36e3).toISOString().slice(0,10);
  }
  function inRange(r,upto){if(!upto)return true;const k=dkey(r.Tanggal);return !k||k<=upto;}
  function prevDay(key){const d=new Date(key+'T00:00:00Z');d.setUTCDate(d.getUTCDate()-1);return d.toISOString().slice(0,10);}
  const BLN=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  function fmtKey(k){const p=k.split('-');return Number(p[2])+' '+BLN[Number(p[1])-1]+' '+p[0];}
  /* Tanggal pembanding: mundur N hari dari tanggal data ditarik (WITA), Minggu tidak dihitung.
     N = 2 bila data ditarik sebelum 12.00 WITA, N = 1 bila 12.00 WITA atau sesudahnya. */
  function baselineKey(atIso){
    const wita=new Date((atIso?Date.parse(atIso):Date.now())+8*3600e3);   // kolom UTC = jam dinding WITA
    const n=wita.getUTCHours()<12?2:1;
    const d=new Date(wita.toISOString().slice(0,10)+'T00:00:00Z');
    for(let c=0;c<n;){d.setUTCDate(d.getUTCDate()-1);if(d.getUTCDay()!==0)c++;}
    return{key:d.toISOString().slice(0,10),n};
  }
  window.__baselineKey=baselineKey;   // untuk pengujian
  /* Hitungan terkini + selisih Hilo / NS Tea / LINE/EA dibanding data sampai tanggal pembanding. */
  function computeAreaDelta(area){
    const rows=computeArea(area,null);
    let latest=null;PJ.call.forEach(r=>{const k=dkey(r.Tanggal);if(k&&(!latest||k>latest))latest=k;});
    const base=baselineKey(PJ.at);
    const old=computeArea(area,base.key);
    rows.forEach(r=>{
      const o=old.find(x=>x.name===r.name)||{hilo:0,tea:0,ea:0,line:0,lineEa:0};
      r.dHilo=r.hilo-o.hilo;r.dTea=r.tea-o.tea;
      r.dEa=r.ea-o.ea;r.dLine=r.line-o.line;
      r.dLineEa=(r.ea?r.lineEa:0)-(o.ea?o.lineEa:0);   // selisih rata-rata item unik per sekolah baru
    });
    rows.latest=latest;rows.prev=base.key;rows.nHari=base.n;
    return{rows,latest,prev:base.key};
  }

  /* ── singkatan item: NS / Hilo ──────────────────────────────────────── */
  function abbrevItem(raw){
    let n=String(raw||'').toUpperCase().trim();
    n=n.replace(/\b\d+(\.\d+)?[A-Z]{1,2}X\d+[A-Z]{1,2}X\d+(\.\d+)?[A-Z]{1,2}\b/g,'')
       .replace(/\b\d+[A-Z]{1,2}X\d+[A-Z]{1,2}X\d+[A-Z]{1,2}\b/g,'')
       .replace(/\bPLS\b/g,'').replace(/\bDRINK\b/g,'').replace(/\s+/g,' ').trim();
    let brand='';
    if(/^NS\b/.test(n)){brand='NS';n=n.replace(/^NS\s*/,'');}
    else if(/^HI ?LO\b/.test(n)){brand='Hilo';n=n.replace(/^HI ?LO\s*/,'');}
    const small=new Set(['ASO','JP','TS','3IN1']);
    const flavor=n.split(' ').filter(Boolean).map(w=>small.has(w)?(w==='3IN1'?'3in1':w):w.charAt(0)+w.slice(1).toLowerCase()).join(' ');
    return{brand,flavor};
  }
  function flavorsByBrand(list){
    const out={NS:[],Hilo:[]};
    list.map(abbrevItem).forEach(x=>{if(x.flavor&&out[x.brand]&&!out[x.brand].includes(x.flavor))out[x.brand].push(x.flavor);});
    out.NS.sort((a,b)=>a.localeCompare(b));out.Hilo.sort((a,b)=>a.localeCompare(b));
    return out;
  }

  /* ── elemen gambar (gaya terang, tanpa bergantung CSS halaman) ──────── */
  const BG='#F4F1E8',INK='#12261F',MUT='#8a8270',LINE='rgba(120,110,90,.25)';
  const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  const TD='padding:9px 8px;border-bottom:1px solid '+LINE+';vertical-align:top';
  const TH='text-align:left;padding:8px;font-size:11px;letter-spacing:.06em;color:'+MUT;
  const chip=(ok,txt)=>ok?'<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:#d6f2e3;color:#146c43;font-weight:700;font-size:12px">'+txt+'</span>'
                         :'<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:#e3ecfb;color:#2a5db0;font-weight:700;font-size:12px">Belum</span>';
  function shell(width,html){
    const el=document.createElement('div');
    el.style.cssText='position:fixed;left:0;top:0;z-index:-1;width:'+width+'px;box-sizing:border-box;padding:28px 30px;font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;background:'+BG+';color:'+INK;
    el.innerHTML=html;document.body.appendChild(el);return el;
  }
  const head=(title,sub)=>'<div style="font-size:22px;font-weight:800;margin-bottom:4px">'+title+'</div><div style="font-size:12px;color:'+MUT+';margin-bottom:14px">'+sub+'</div>';

  /* Gambar ringkasan dibuat RAMPING (lebar 560) supaya muat tanpa geser di layar HP.
     Hilo / NS Tea diberi catatan (+n) = tambahan dibanding data sampai hari sebelumnya.
     LINE/EA juga diberi (+n), n = selisih rata-rata item unik per sekolah baru (2 angka di belakang koma). */
  const dBadge=n=>!n?'':'<span style="font-size:12px;font-weight:800;margin-left:4px;color:'+(n>0?'#1f9d63':'#c0392b')+'">('+(n>0?'+':'')+n+')</span>';
  /* Badge khusus LINE/EA: nilainya pecahan, dibulatkan 2 angka lalu nol di belakang dihapus (+0.30 -> +0.3). */
  const dBadge1=n=>{
    const v=Math.round((n||0)*100)/100;
    if(!isFinite(v)||!v)return '';
    const txt=v.toFixed(2).replace(/0$/,'');
    return '<span style="font-size:12px;font-weight:800;margin-left:4px;color:'+(v>0?'#1f9d63':'#c0392b')+'">('+(v>0?'+':'')+txt+')</span>';
  };
  function elMain(area,rows){
    const sum=k=>rows.reduce((s,r)=>s+(r[k]||0),0);
    const P='padding:11px 4px;border-bottom:1px solid '+LINE+';vertical-align:middle';
    const body=rows.map(r=>'<tr><td style="'+P+';font-size:17px;font-weight:600;line-height:1.25">'+esc(r.name)+'</td><td style="'+P+';text-align:center;font-weight:800;font-size:18px">'+r.sek+'</td><td style="'+P+';text-align:center;font-size:17px;white-space:nowrap">'+r.hilo+dBadge(r.dHilo)+'</td><td style="'+P+';text-align:center;font-size:17px;white-space:nowrap">'+r.tea+dBadge(r.dTea)+'</td><td style="'+P+';text-align:center;font-size:17px;white-space:nowrap">'+(r.ea?r.lineEa.toFixed(1):'-')+dBadge1(r.dLineEa)+'</td></tr>').join('');
    const T='padding:12px 4px;font-weight:800;font-size:17px';
    const ratio=(line,ea)=>ea?line/ea:0;
    const dTot=ratio(sum('line'),sum('ea'))-ratio(sum('line')-sum('dLine'),sum('ea')-sum('dEa'));
    const tot='<tr><td style="'+T+'">Total</td><td style="'+T+';text-align:center;font-size:18px">'+sum('sek')+'</td><td style="'+T+';text-align:center;white-space:nowrap">'+sum('hilo')+dBadge(sum('dHilo'))+'</td><td style="'+T+';text-align:center;white-space:nowrap">'+sum('tea')+dBadge(sum('dTea'))+'</td><td style="'+T+';text-align:center;white-space:nowrap">'+(sum('ea')?ratio(sum('line'),sum('ea')).toFixed(1):'-')+dBadge1(dTot)+'</td></tr>';
    const H='text-align:center;padding:9px 4px;font-size:11.5px;letter-spacing:.03em;color:'+MUT+';line-height:1.2';
    const note=rows.prev?'<b style="color:#1f9d63">(+n)</b> = tambahan dibanding data s.d. '+esc(fmtKey(rows.prev))+' ('+rows.nHari+' hari lalu, Minggu tidak dihitung) · ':'';
    return shell(560,'<div style="font-size:24px;font-weight:800;margin-bottom:4px">🆕 Sekolah Baru — '+esc(area)+'</div>'+
      '<div style="font-size:12.5px;color:'+MUT+';margin-bottom:12px;line-height:1.4">'+(rows.latest?'Data sampai '+esc(fmtKey(rows.latest)):(PJ.at?'Data per '+esc(fmtWita(PJ.at)):''))+'</div>'+
      '<table style="width:100%;border-collapse:collapse;table-layout:fixed"><colgroup><col style="width:31%"><col style="width:13%"><col style="width:17%"><col style="width:18%"><col style="width:21%"></colgroup>'+
      '<thead><tr style="background:rgba(120,110,90,.12)"><th style="'+H+';text-align:left">MDS</th><th style="'+H+'">SEKOLAH</th><th style="'+H+'">HILO</th><th style="'+H+'">NS TEA</th><th style="'+H+'">LINE/EA</th></tr></thead><tbody>'+body+tot+'</tbody></table>'+
      '<div style="font-size:11.5px;color:'+MUT+';margin-top:12px;line-height:1.45">'+note+'<b>Sekolah</b> = sudah transaksi (baru + lama) · <b>Hilo / NS Tea</b> = sekolah baru yang order · <b>LINE/EA</b> = item unik per sekolah baru ÷ yang order · pada LINE/EA, (+n) = selisih rata-rata (bisa turun walau item bertambah)</div>');
  }
  function elDetail(r,from,to,part){
    const nb=r.schools.filter(s=>s.baru).length;
    const rows=r.schools.slice(from,to).map((s,k)=>'<tr><td style="'+TD+';color:'+MUT+';width:34px">'+(from+k+1)+'</td><td style="'+TD+'">'+esc(s.nama)+'</td><td style="'+TD+'">'+esc(s.kab||'-')+'</td><td style="'+TD+'">'+(s.baru?chip(true,'Baru'):'<span style="display:inline-block;padding:2px 10px;border-radius:99px;background:#e3ecfb;color:#2a5db0;font-weight:700;font-size:12px">Lama</span>')+'</td><td style="'+TD+'">'+chip(s.hilo,'✓ Hilo')+'</td><td style="'+TD+'">'+chip(s.tea,'✓ NS Tea')+'</td><td style="'+TD+';text-align:center">'+s.item+'</td></tr>').join('');
    return shell(1100,head('🏫 Sekolah Transaksi — '+esc(r.name),r.sek+' sekolah sudah transaksi · '+nb+' baru, '+(r.sek-nb)+' sudah ada di database'+(part?' · '+part:''))+
      '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:rgba(120,110,90,.12)"><th style="'+TH+'">#</th><th style="'+TH+'">SEKOLAH</th><th style="'+TH+'">KABUPATEN</th><th style="'+TH+'">STATUS</th><th style="'+TH+'">HILO</th><th style="'+TH+'">NS TEA</th><th style="'+TH+';text-align:center">ITEM UNIK</th></tr></thead><tbody>'+rows+'</tbody></table>');
  }
  function elBaru(r,from,to,part){
    const baru=r.schools.filter(s=>s.baru);
    const cell=a=>a.length?a.map(esc).join(' / '):'-';
    const rows=baru.slice(from,to).map((s,k)=>{const fb=flavorsByBrand(s.itemNames||[]);
      return '<tr><td style="'+TD+';color:'+MUT+';width:36px">'+(from+k+1)+'</td><td style="'+TD+';font-weight:600;width:290px">'+esc(s.nama)+'</td><td style="'+TD+';line-height:1.55;width:370px">'+cell(fb.NS)+'</td><td style="'+TD+';line-height:1.55">'+cell(fb.Hilo)+'</td></tr>';}).join('');
    return shell(1250,head('🆕 Sekolah Baru — '+esc(r.name),baru.length+' sekolah baru yang sudah transaksi'+(part?' · '+part:''))+
      '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:rgba(120,110,90,.12)"><th style="'+TH+'">#</th><th style="'+TH+'">SEKOLAH</th><th style="'+TH+'">ITEM SUDAH MASUK NS</th><th style="'+TH+'">ITEM SUDAH MASUK HILO</th></tr></thead><tbody>'+rows+'</tbody></table>');
  }
  const splitParts=n=>n<=MAX_PER_IMAGE?[[0,n,'']]:[[0,Math.ceil(n/2),'Bagian 1 dari 2'],[Math.ceil(n/2),n,'Bagian 2 dari 2']];

  /* ── html2canvas ────────────────────────────────────────────────────── */
  let _h2c=null;
  function ensureH2C(){
    if(window.html2canvas)return Promise.resolve();
    if(!_h2c)_h2c=new Promise((res,rej)=>{
      const s=document.createElement('script');s.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      s.onload=()=>res();s.onerror=()=>{_h2c=null;rej(new Error('Gagal memuat pustaka gambar (cek internet)'));};
      document.head.appendChild(s);
    });
    return _h2c;
  }
  async function snap(el){
    const scale=(window.devicePixelRatio>=2&&innerWidth<700)?2:3;
    try{
      const c=await html2canvas(el,{scale,backgroundColor:BG,logging:false,windowWidth:Math.max(el.scrollWidth,1000)});
      const blob=await new Promise(r=>c.toBlob(r,'image/png'));
      const out={blob,url:URL.createObjectURL(blob),w:c.width,h:c.height};
      c.width=c.height=0;return out;
    }finally{el.remove();}
  }

  /* ── pipeline ───────────────────────────────────────────────────────── */
  const safe=s=>String(s).replace(/[^A-Za-z0-9]+/g,'_').replace(/^_|_$/g,'');
  async function generate(area,rows){
    const msg=t=>{$('imgMsg').textContent=t;};
    const tasks=[];
    tasks.push({g:0,name:area+' — semua MDS',file:area+'_1-Semua',make:()=>elMain(area,rows)});
    rows.filter(r=>r.sek>0).forEach(r=>{
      splitParts(r.schools.length).forEach((p,i,arr)=>tasks.push({g:1,name:r.name+(arr.length>1?' ('+(i+1)+'/'+arr.length+')':''),file:area+'_2-Detail_'+safe(r.name)+(arr.length>1?'_'+(i+1)+'dari'+arr.length:''),make:()=>elDetail(r,p[0],p[1],p[2])}));
    });
    rows.filter(r=>r.schools.some(s=>s.baru)).forEach(r=>{
      const nb=r.schools.filter(s=>s.baru).length;
      splitParts(nb).forEach((p,i,arr)=>tasks.push({g:2,name:r.name+(arr.length>1?' ('+(i+1)+'/'+arr.length+')':''),file:area+'_3-SekolahBaru_'+safe(r.name)+(arr.length>1?'_'+(i+1)+'dari'+arr.length:''),make:()=>elBaru(r,p[0],p[1],p[2])}));
    });
    const items=[];
    const stamp=new Date().toISOString().slice(0,10);
    for(let i=0;i<tasks.length;i++){
      const t=tasks[i];
      msg('Membuat gambar '+(i+1)+' dari '+tasks.length+'…');
      $('imgBarI').style.width=((i)/tasks.length*100)+'%';
      await sleep(20);
      const s=await snap(t.make());
      URL.revokeObjectURL(s.url);   // URL dibuat ulang saat ditampilkan
      items.push({g:t.g,name:t.name,file:t.file+'_'+stamp+'.png',blob:s.blob,w:s.w,h:s.h,fit:t.g===0});
    }
    $('imgBarI').style.width='100%';
    return items;
  }

  /* ── tampilan hasil ─────────────────────────────────────────────────── */
  function download(it){const a=document.createElement('a');a.href=it.url;a.download=it.file;document.body.appendChild(a);a.click();a.remove();}
  function render(area,groups){
    const total=groups.reduce((s,g)=>s+g.items.length,0);
    const out=$('imgOut');out.innerHTML='';
    const bar=document.createElement('div');bar.className='row';bar.style.margin='12px 0';
    const files=()=>groups.flatMap(g=>g.items).map(it=>new File([it.blob],it.file,{type:'image/png'}));
    const canShare=navigator.canShare&&navigator.canShare({files:files().slice(0,1)});
    if(canShare){
      const b=document.createElement('button');b.className='ghost';b.textContent='📤 Bagikan semua ('+total+')';
      b.onclick=async()=>{try{await navigator.share({files:files(),title:'Sekolah Baru — '+area});}catch(e){if(e&&e.name!=='AbortError')alert('Gagal membagikan: '+e.message);}};
      bar.appendChild(b);
    }
    const dl=document.createElement('button');dl.className='ghost';dl.textContent='⬇ Unduh semua ('+total+')';
    dl.onclick=async()=>{for(const g of groups)for(const it of g.items){download(it);await sleep(450);}};
    bar.appendChild(dl);out.appendChild(bar);
    groups.forEach(g=>{
      if(!g.items.length)return;
      const h=document.createElement('div');h.className='imgH';h.textContent=g.title+' ('+g.items.length+')';out.appendChild(h);
      const grid=document.createElement('div');grid.className='imgGrid';
      g.items.forEach(it=>{
        const card=document.createElement('div');card.className='imgCard';
        const im=document.createElement('img');im.src=it.url;im.alt=it.name;im.loading='lazy';im.onclick=()=>openBox(it);
        const cap=document.createElement('div');cap.className='imgCap';cap.textContent=it.name;
        const sv=document.createElement('a');sv.href=it.url;sv.download=it.file;sv.textContent='Simpan';sv.className='lnk';
        card.append(im,cap,sv);grid.appendChild(card);
      });
      out.appendChild(grid);
    });
  }
  function openBox(it){
    const box=document.createElement('div');box.className='imgBox'+(it.fit?' fit':'');
    box.innerHTML='<div class="imgBoxBar"><span>'+esc(it.name)+'</span><a class="lnk" download="'+esc(it.file)+'" href="'+it.url+'">Simpan</a><button class="ghost" type="button">Tutup</button></div><div class="imgBoxScroll"><img src="'+it.url+'" alt=""></div>';
    box.querySelector('button').onclick=()=>box.remove();
    document.body.appendChild(box);
  }

  let shownUrls=[];
  function showRec(area,rec,note){
    shownUrls.forEach(u=>URL.revokeObjectURL(u));shownUrls=[];
    const groups=groupsOf(rec);
    groups.forEach(g=>g.items.forEach(it=>shownUrls.push(it.url)));
    render(area,groups);
    $('imgNote').textContent=note||'';
  }
  async function pick(area){
    if(busyImg)return;busyImg=true;
    document.querySelectorAll('#seg button').forEach(b=>{b.classList.toggle('on',b.dataset.area===area);b.disabled=true;});
    $('imgProg').style.display='none';$('imgNote').textContent='';
    const msg=t=>{$('imgMsg').textContent=t;};
    try{
      try{window.__wl=await navigator.wakeLock.request('screen');}catch(e){}
      const stored=await loadStored(area);
      if(stored){showRec(area,stored,'Gambar tersimpan (dibuat '+fmtWita(stored.time)+'). Memeriksa data terbaru…');}
      else{$('imgOut').innerHTML='';}

      // 1) cek versi data di cloud (1 bacaan kecil)
      let metaAt=null,online=true;
      try{const m=await fsGet('meta');metaAt=m&&m.fields&&m.fields.updatedAt&&m.fields.updatedAt.stringValue;}catch(e){online=false;}
      if(stored&&(!online||(metaAt&&stored.at===metaAt))){
        $('imgNote').textContent=online?'✓ Data belum berubah sejak gambar ini dibuat ('+fmtWita(stored.time)+'). Tidak perlu dibuat ulang.'
                                      :'Tidak ada internet, memakai gambar tersimpan ('+fmtWita(stored.time)+').';
        return;
      }
      if(!online)throw new Error('Tidak ada internet / cloud tidak bisa dihubungi, dan belum ada gambar tersimpan.');

      // 2) data berbeda -> hitung ulang isi; buat gambar baru hanya bila isi berubah
      $('imgProg').style.display='block';$('imgBarI').style.width='0';
      await loadPJ(msg,metaAt);
      const rows=computeAreaDelta(area).rows;
      const sig=await signature(rows);
      if(stored&&sig===stored.sig){
        stored.at=PJ.at||metaAt;MEM[area]=stored;await idbPut(stored);
        $('imgProg').style.display='none';
        $('imgNote').textContent='✓ Data ditarik ulang tetapi isi sekolah tidak berubah. Memakai gambar tersimpan ('+fmtWita(stored.time)+').';
        return;
      }
      await ensureH2C();
      const items=await generate(area,rows);
      const rec={area,v:REC_V,sig,at:PJ.at||metaAt,time:new Date().toISOString(),items};
      MEM[area]=rec;await idbPut(rec);
      $('imgProg').style.display='none';
      showRec(area,rec,'Gambar baru dibuat '+fmtWita(rec.time)+(stored?' karena data berubah.':'.'));
      notify('✅ Gambar '+area+' siap',items.length+' gambar (semua, detail sekolah, sekolah baru)','tarik-img');
    }catch(e){
      console.error(e);
      $('imgProg').style.display='block';
      $('imgMsg').textContent='❌ '+(e.message||e);
      $('imgBarI').style.width='0';
      notify('❌ Gagal membuat gambar',String(e.message||e).slice(0,140),'tarik-img-err');
    }finally{
      try{window.__wl&&window.__wl.release();}catch(e){}
      document.querySelectorAll('#seg button').forEach(b=>b.disabled=false);
      busyImg=false;
    }
  }
  document.querySelectorAll('#seg button').forEach(b=>b.addEventListener('click',()=>pick(b.dataset.area)));
})();
