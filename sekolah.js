/* Halaman standalone "Sekolah Baru" — sekolah dari data Call/Order (Firestore mds-sulawesi)
   yang belum ada di database sekolah (sekolah_db.js). Dipindah dari tab Penjualan MDS di dashboard. */
const SB_PIN='SEKOLAH2026';
const PJ_COLLECTION='pjmds_data';
const PJ_SEKOLAH_EXCLUDE=new Set(['BUKAN SEKOLAH','OTHERS','BUKAN SEKOLA','TIDAK ADA']);
const SEKOLAH_DB_SET=(typeof SEKOLAH_DB_NAMES!=='undefined')?new Set(SEKOLAH_DB_NAMES):new Set();
const MDS_BY_AREA={
  'Bau Bau':['Rizal'],
  'Bone':['A. Arwandi Amrah','M. Murdiono Arma','Amal Akbar','Ilham','Andi Reski'],
  'Gorontalo':['Aditya Hulopi','Mohammad Rahman Marwan','Abd. Rahman Lahay','Satrio Yusuf'],
  'Kendari':['Laode Asrad Ilhamid','Abdul Rahman (Rangga)','Dwi Haryanto','Rosa Sasmita'],
  'Luwuk':['Kadek Adi Merta Sastrawan'],
  'Makassar':['Sulfiana Rusdy','A. Mappanyukki','Andi Iswan Tenri Bau','Rahmat','Hasrar','Andi Muh. Nurfikrahturrahman','Musdalifah','Syafri'],
  'Mamuju':['Muhammad Rizky Sandria','Sugiono'],
  'Manado':['Melisa Pungky Mapaliey','Rivanti Gusti Husein','Ignacia Regina Naung','Ridlan Mangilong','Tesar','Meilani Watung'],
  'Palopo':['Tio Setiawan Rappun','Hijrayanti Mahruddin','Firman'],
  'Palu':['Muh Nasir K','Yuliana Rusli','Rafdi'],
  'Pare-Pare':['Marwan','Yurike Kyusuchi','Muhlis'],
  'Poso':['Syaifullah','Selvia Risvin Bandola'],
};
/* Roster name -> NamaMDS as spelled in the Call/Order upload, for names pjNormName can't reconcile. */
const PJ_DEFAULT_MATCH={'Selvia Risvin Bandola':'Selvia Risvin B'};
let PJMDS_MANUAL_MATCH={};
let PJ_RAW={call:[],order:[]};
let MF='';
let SB_SORT='area',SB_DIR=1,SB_ROWS=[],SB_MODAL_NAME='Sekolah',SB_CUR=null;

var dbSulawesi;
try{
  const FB2={apiKey:"AIzaSyCA8Q8athqYIsY3By5wPxcU97GjDBR6DAs",authDomain:"mds-sulawesi.firebaseapp.com",projectId:"mds-sulawesi",storageBucket:"mds-sulawesi.firebasestorage.app",messagingSenderId:"511949021685",appId:"1:511949021685:web:bc32007af0555449e7c0bc"};
  firebase.initializeApp(FB2,"sulawesi");
  dbSulawesi=firebase.app("sulawesi").firestore();
}catch(e){console.warn('Firebase (sulawesi) init failed',e);}

// ── tema + PIN ──────────────────────────────────────────────────────────────
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  try{localStorage.setItem('mds_sekolah_theme',t);}catch(e){}
  const b=document.getElementById('theme-toggle');if(b)b.textContent=t==='light'?'☀️':'🌙';
}
function toggleTheme(){applyTheme(document.documentElement.getAttribute('data-theme')==='light'?'dark':'light');}
(function(){let t='light';try{t=localStorage.getItem('mds_sekolah_theme')||'light';}catch(e){}applyTheme(t);})();

function checkPin(){
  if(document.getElementById('pin-input').value.replace(/\s+/g,'')===SB_PIN){
    try{sessionStorage.setItem('mds_sekolah_pin_ok','1');}catch(e){}
    enter();
  }else{
    document.getElementById('pin-err').textContent='Password salah, coba lagi.';
    document.getElementById('pin-input').value='';
  }
}
function enter(){
  document.getElementById('pin-screen').classList.add('hidden');
  document.getElementById('app').classList.add('visible');
  init();
}
(function(){try{if(sessionStorage.getItem('mds_sekolah_pin_ok')==='1')enter();}catch(e){}})();

// ── data ────────────────────────────────────────────────────────────────────
function pjNormName(s){return String(s||'').toUpperCase().trim().replace(/[.,]/g,'').replace(/\s+/g,' ');}
function pjToDate(v){if(v instanceof Date)return v;if(typeof v==='string'){const d=new Date(v);return isNaN(d)?null:d;}return null;}
function sekNormKey(s){return String(s||'').trim().replace(/\s+/g,' ').toUpperCase();}
function pjResolveMdsName(selName){
  if(!selName)return null;
  if(PJMDS_MANUAL_MATCH[selName])return PJMDS_MANUAL_MATCH[selName];
  if(PJ_DEFAULT_MATCH[selName]&&PJ_RAW.call.some(r=>r.NamaMDS===PJ_DEFAULT_MATCH[selName]))return PJ_DEFAULT_MATCH[selName];
  const target=pjNormName(selName);
  const names=[...new Set(PJ_RAW.call.map(r=>r.NamaMDS).filter(Boolean))];
  return names.find(n=>pjNormName(n)===target)||null;
}
function mdsAreaOf(name){
  for(const[a,list]of Object.entries(MDS_BY_AREA))if(list.some(m=>m.toLowerCase()===name.toLowerCase()))return a;
  return '—';
}
function monthKey(d){return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}
function filterCall(rows){
  if(!MF)return rows;
  return rows.filter(r=>{const d=pjToDate(r.Tanggal);return !d||monthKey(d)===MF;});
}
function filterOrder(rows,callRows){
  if(!MF)return rows;
  if(rows.some(r=>pjToDate(r.Tanggal)))return rows.filter(r=>{const d=pjToDate(r.Tanggal);return !d||monthKey(d)===MF;});
  const monthNum=Number(MF.split('-')[1]);
  return rows.filter(r=>r.Bulan===monthNum);
}
async function pjStorageGet(){
  const metaSnap=await dbSulawesi.collection(PJ_COLLECTION).doc('meta').get();
  if(!metaSnap.exists)return null;
  const n=metaSnap.data().chunkCount||0;
  let full='';
  for(let i=0;i<n;i++){const snap=await dbSulawesi.collection(PJ_COLLECTION).doc('chunk_'+i).get();full+=snap.exists?(snap.data().data||''):'';}
  return full||null;
}
async function init(){
  const st=document.getElementById('sb-status');
  const areaSel=document.getElementById('sb-area');
  if(areaSel.options.length<=1)Object.keys(MDS_BY_AREA).sort().forEach(a=>{const o=document.createElement('option');o.value=a;o.textContent=a;areaSel.appendChild(o);});
  if(!dbSulawesi){st.textContent='Cloud belum terhubung.';return;}
  try{
    const mm=await dbSulawesi.collection('pjmds_manual_match').doc('main').get();
    if(mm.exists)PJMDS_MANUAL_MATCH=mm.data().map||{};
  }catch(e){console.warn('manual match load failed',e);}
  try{
    const raw=await pjStorageGet();
    if(!raw){st.textContent='Belum ada data Call/Order.';return;}
    const parsed=JSON.parse(raw);
    PJ_RAW={call:parsed.call||[],order:parsed.order||[]};
    st.textContent=`${PJ_RAW.call.length.toLocaleString('id-ID')} baris call · ${PJ_RAW.order.length.toLocaleString('id-ID')} baris order · ${SEKOLAH_DB_SET.size.toLocaleString('id-ID')} sekolah di database`;
  }catch(e){
    console.error('load failed',e);
    st.textContent='Gagal memuat data (kemungkinan kuota Firestore habis — coba lagi nanti).';
    return;
  }
  render();
}
function render(){
  renderSekolahBaru();
}

// ── hitungan ────────────────────────────────────────────────────────────────
function computeSekolahBaru(){
  const fa=document.getElementById('sb-area').value;
  const names=Object.values(MDS_BY_AREA).flat().filter(n=>!fa||mdsAreaOf(n)===fa);
  const rows=[],detail=[];
  names.forEach(name=>{
    const mds=pjResolveMdsName(name)||name;
    const c=filterCall(PJ_RAW.call.filter(r=>r.NamaMDS===mds));
    const area=mdsAreaOf(name);
    if(!c.length){rows.push({name,area,total:0,sek:0,schools:[],hilo:0,tea:0,ea:0,line:0,lineEa:0});return;}
    const o=filterOrder(PJ_RAW.order.filter(r=>r.NamaMDS===mds),c).filter(r=>!String(r.NamaItem).toUpperCase().startsWith('BONUS'));
    const hiloCust=new Set(o.filter(r=>String(r.Brand).toUpperCase()==='HI LO').map(r=>r.KodeCustomer));
    const teaCust=new Set(o.filter(r=>r.Brand==='NUTRISARI'&&String(r.NamaItem).toUpperCase().includes('TEA PLS')).map(r=>r.KodeCustomer));
    const sek={},custSek={};
    c.forEach(r=>{
      const key=sekNormKey(r.Sekolah);
      if(!key||PJ_SEKOLAH_EXCLUDE.has(key))return;
      if(!sek[key])sek[key]={nama:r.Sekolah,kab:r.Kabupaten,baru:!SEKOLAH_DB_SET.has(key),hilo:false,tea:false,items:new Set()};
      custSek[r.KodeCustomer]=key;
      if(hiloCust.has(r.KodeCustomer))sek[key].hilo=true;
      if(teaCust.has(r.KodeCustomer))sek[key].tea=true;
    });
    o.forEach(r=>{const k=custSek[r.KodeCustomer];if(k&&sek[k]&&r.NamaItem)sek[k].items.add(String(r.NamaItem).trim().toUpperCase());});
    const allList=Object.values(sek);
    const list=allList.filter(x=>x.baru);
    const withItems=list.filter(x=>x.items.size>0),lineTot=withItems.reduce((a,x)=>a+x.items.size,0);
    const schools=allList.filter(x=>x.items.size>0).sort((a,b)=>b.baru-a.baru||a.nama.localeCompare(b.nama)).map(x=>({nama:x.nama,kab:x.kab,baru:x.baru,hilo:x.hilo,tea:x.tea,item:x.items.size,itemNames:[...x.items]}));
    rows.push({name,area,total:list.length,sek:schools.length,schools,hilo:list.filter(x=>x.hilo).length,tea:list.filter(x=>x.tea).length,ea:withItems.length,line:lineTot,lineEa:withItems.length?lineTot/withItems.length:0});
    list.forEach(x=>detail.push({area,mds:name,sekolah:x.nama,kab:x.kab,hilo:x.hilo,tea:x.tea,line:x.items.size}));
  });
  return{rows,detail};
}
function sbSortBy(c){if(SB_SORT===c)SB_DIR*=-1;else{SB_SORT=c;SB_DIR=c==='area'||c==='name'?1:-1;}renderSekolahBaru();}
function sbShowSekolah(i){
  const r=SB_ROWS[i];if(!r)return;
  SB_CUR=r;
  document.getElementById('sekolah-modal-title').textContent=`🏫 Sekolah Transaksi — ${r.name}`;
  sbFillModal(0,r.schools.length,'');
  document.getElementById('sekolah-modal').classList.remove('hidden');
  SB_MODAL_NAME='Sekolah_'+r.name.replace(/[^A-Za-z0-9]+/g,'_');
}
const SB_MAX_PER_IMAGE=30;
function sbFillModal(from,to,partLabel){
  const r=SB_CUR;if(!r)return;
  const yn=(v,label)=>v?`<span class="tag g sm">✓ ${label}</span>`:`<span class="tag b sm">Belum</span>`;
  document.getElementById('sekolah-modal-sub').textContent=`${r.sek} sekolah sudah transaksi · ${r.schools.filter(s=>s.baru).length} baru, ${r.schools.filter(s=>!s.baru).length} sudah ada di database${partLabel?' · '+partLabel:''}`;
  document.getElementById('sekolah-modal-body').innerHTML=r.schools.slice(from,to).map((s,k)=>`<tr><td>${from+k+1}</td><td>${s.nama}</td><td>${s.kab||'-'}</td><td>${s.baru?'<span class="tag g sm">Baru</span>':'<span class="tag b sm">Lama</span>'}</td><td>${yn(s.hilo,'Hilo')}</td><td>${yn(s.tea,'NS Tea')}</td><td style="text-align:center">${s.item}</td></tr>`).join('');
}
/* Detail sekolah: sampai 30 sekolah = 1 gambar; lebih dari 30 dibagi 2 gambar (baris dibagi dua rata). */
async function exportSekolahDetail(){
  const r=SB_CUR;if(!r)return;
  const el=document.querySelector('#sekolah-modal .modal');
  const n=r.schools.length;
  if(n<=SB_MAX_PER_IMAGE){await exportImage(el,SB_MODAL_NAME);return;}
  const mid=Math.ceil(n/2);
  sbFillModal(0,mid,'Bagian 1 dari 2');
  await exportImage(el,SB_MODAL_NAME+'_1dari2');
  await new Promise(res=>setTimeout(res,600));
  sbFillModal(mid,n,'Bagian 2 dari 2');
  await exportImage(el,SB_MODAL_NAME+'_2dari2');
  sbFillModal(0,n,'');
}
function renderSekolahBaru(){
  const wrap=document.getElementById('sb-content');if(!wrap)return;
  if(!PJ_RAW.call.length){wrap.innerHTML='<div class="panel-shell"><div class="panel-body" style="text-align:center;color:var(--t3);padding:32px">Data Call/Order belum dimuat.</div></div>';return;}
  const{rows}=computeSekolahBaru();
  SB_ROWS=rows;
  rows.sort((a,b)=>{const av=a[SB_SORT],bv=b[SB_SORT];const cmp=typeof av==='string'?av.localeCompare(bv):av-bv;return SB_DIR*(cmp||a.name.localeCompare(b.name));});
  const ar=c=>`<span style="opacity:.25;margin-left:2px;font-size:9px">${SB_SORT===c?(SB_DIR>0?'↑':'↓'):'↕'}</span>`;
  const sum=k=>rows.reduce((s,r)=>s+r[k],0);
  wrap.innerHTML=`<div class="panel-shell"><div class="panel-body">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:6px">
      <div class="ch-label" style="margin-bottom:0">🆕 Sekolah Baru (belum ada di database sekolah)</div>
      <button class="exp-btn" onclick="exportImage(document.querySelector('#sb-content .panel-shell'),'Sekolah_Baru')">⬇ Gambar (PNG)</button>
    </div>
    <div style="font-size:11px;color:var(--t3);margin-bottom:10px">Sekolah = total sekolah yang sudah transaksi (termasuk yang sudah ada di database) — klik angkanya untuk lihat detail. Sekolah Hilo / NS Tea = sekolah baru yang kantin/customernya order item Hilo / NS Tea. LINE/EA = total item unik per sekolah baru ÷ jumlah sekolah baru yang order.</div>
    <div style="max-height:70vh;overflow-y:auto"><table class="sc-table"><thead><tr>
      <th onclick="sbSortBy('area')" style="cursor:pointer">Area${ar('area')}</th>
      <th onclick="sbSortBy('name')" style="cursor:pointer">MDS${ar('name')}</th>
      <th onclick="sbSortBy('sek')" style="cursor:pointer;text-align:center">Sekolah${ar('sek')}</th>
      <th onclick="sbSortBy('hilo')" style="cursor:pointer;text-align:center">Sekolah Hilo${ar('hilo')}</th>
      <th onclick="sbSortBy('tea')" style="cursor:pointer;text-align:center">Sekolah NS Tea${ar('tea')}</th>
      <th onclick="sbSortBy('lineEa')" style="cursor:pointer;text-align:center">LINE/EA${ar('lineEa')}</th>
    </tr></thead><tbody>${rows.length?rows.map((r,i)=>`<tr><td>${r.area}</td><td>${r.name}</td><td style="text-align:center">${r.sek?`<a href="#" onclick="sbShowSekolah(${i});return false" style="color:var(--violet);font-weight:700;text-decoration:underline">${r.sek}</a>`:'0'}</td><td style="text-align:center">${r.hilo}</td><td style="text-align:center">${r.tea}</td><td style="text-align:center">${r.ea?r.lineEa.toFixed(1):'-'}</td></tr>`).join(''):'<tr><td colspan="6" style="text-align:center;color:var(--t3);padding:24px">Tidak ada data.</td></tr>'}</tbody>
    <tfoot><tr><td colspan="2" style="font-weight:700">Total</td><td style="text-align:center;font-weight:700">${sum('sek')}</td><td style="text-align:center;font-weight:700">${sum('hilo')}</td><td style="text-align:center;font-weight:700">${sum('tea')}</td><td style="text-align:center;font-weight:700">${sum('ea')?(sum('line')/sum('ea')).toFixed(1):'-'}</td></tr></tfoot></table></div>
  </div></div>`;
}
/* Export gambar kualitas tinggi (html2canvas, skala 3x). Area scroll dilebarkan penuh supaya semua baris ikut. */
let _h2cPromise=null;
function ensureHtml2Canvas(){
  if(window.html2canvas)return Promise.resolve();
  if(!_h2cPromise)_h2cPromise=new Promise((res,rej)=>{
    const sc=document.createElement('script');
    sc.src='https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    sc.onload=()=>res();sc.onerror=()=>{_h2cPromise=null;rej(new Error('Gagal memuat pustaka gambar'));};
    document.head.appendChild(sc);
  });
  return _h2cPromise;
}
function solidBg(el){
  for(let e=el;e;e=e.parentElement){const c=getComputedStyle(e).backgroundColor;if(c&&c!=='transparent'&&!/rgba?(s*d+,s*d+,s*d+,s*0(.0+)?s*)/.test(c))return c;}
  return document.documentElement.getAttribute('data-theme')==='light'?'#f5f2e9':'#0a0a14';
}
async function exportImage(el,name){
  if(!el)return;
  try{
    await ensureHtml2Canvas();
    const bg=solidBg(document.body);
    const canvas=await html2canvas(el,{
      scale:3,backgroundColor:bg,useCORS:true,logging:false,
      windowWidth:Math.max(el.scrollWidth,1200),
      ignoreElements:n=>n.classList&&(n.classList.contains('exp-btn')||n.classList.contains('modal-x')||n.classList.contains('img-btn')),
      onclone:(doc,cl)=>{
        cl.querySelectorAll('*').forEach(n=>{const st=n.style;if(st&&(st.maxHeight||st.overflowY||st.overflow)){st.maxHeight='none';st.overflow='visible';st.overflowY='visible';}});
        let p=cl;while(p){if(p.style){p.style.maxHeight='none';p.style.overflow='visible';}p=p.parentElement;}
        const th=cl.querySelectorAll('th');th.forEach(t=>{t.style.position='static';});
      }
    });
    await new Promise(res=>canvas.toBlob(b=>{
      const url=URL.createObjectURL(b);
      const a=document.createElement('a');a.href=url;a.download=name+'_'+new Date().toISOString().slice(0,10)+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);res();
    },'image/png'));
  }catch(e){console.error(e);alert('Gagal membuat gambar: '+e.message);}
}

/* ── Gambar khusus sekolah baru: nama sekolah + item yang sudah masuk (disingkat) ───────────────
   Nutrisari -> "NS <rasa>", Hilo -> "Hilo <varian>". Ukuran kemasan (mis. 4PX40SX11G) dan kata PLS dibuang. */
function abbrevItem(raw){
  let n=String(raw||'').toUpperCase().trim();
  n=n.replace(/\b\d+(\.\d+)?[A-Z]{1,2}X\d+[A-Z]{1,2}X\d+(\.\d+)?[A-Z]{1,2}\b/g,'')   // 4PX40SX11G, 15RX10SX14G
     .replace(/\b\d+[A-Z]{1,2}X\d+[A-Z]{1,2}X\d+[A-Z]{1,2}\b/g,'')                    // 14GX18PX40S
     .replace(/\bPLS\b/g,'').replace(/\bDRINK\b/g,'').replace(/\s+/g,' ').trim();
  let brand='';
  if(/^NS\b/.test(n)){brand='NS';n=n.replace(/^NS\s*/,'');}
  else if(/^HI ?LO\b/.test(n)){brand='Hilo';n=n.replace(/^HI ?LO\s*/,'');}
  const small=new Set(['ASO','JP','TS','3IN1']);
  const title=n.split(' ').filter(Boolean).map(w=>small.has(w)?(w==='3IN1'?'3in1':w):w.charAt(0)+w.slice(1).toLowerCase()).join(' ');
  return (brand?brand+' ':'')+title;
}
function abbrevItems(list){
  const seen=new Set(),out=[];
  list.map(abbrevItem).forEach(a=>{if(a&&!seen.has(a)){seen.add(a);out.push(a);}});
  const order=a=>a.startsWith('NS ')?0:a.startsWith('Hilo ')?1:2;
  return out.sort((a,b)=>order(a)-order(b)||a.localeCompare(b));
}
const esc=t=>String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
function buildBaruImageEl(r,from,to,partLabel){
  const baru=r.schools.filter(s=>s.baru);
  const el=document.createElement('div');
  el.style.cssText='position:fixed;left:0;top:0;z-index:-1;width:1100px;box-sizing:border-box;padding:28px 30px;font-family:inherit;background:'+solidBg(document.body)+';color:var(--t1,#222)';
  const rows=baru.slice(from,to).map((s,k)=>`<tr><td style="padding:9px 8px;border-bottom:1px solid rgba(120,110,90,.25);vertical-align:top;color:#8a8270;width:36px">${from+k+1}</td><td style="padding:9px 8px;border-bottom:1px solid rgba(120,110,90,.25);vertical-align:top;font-weight:600;width:330px">${esc(s.nama)}</td><td style="padding:9px 8px;border-bottom:1px solid rgba(120,110,90,.25);vertical-align:top;line-height:1.55">${abbrevItems(s.itemNames||[]).map(esc).join(', ')||'-'}</td></tr>`).join('');
  el.innerHTML=`<div style="font-size:22px;font-weight:800;margin-bottom:4px">🆕 Sekolah Baru — ${esc(r.name)}</div>
    <div style="font-size:12px;color:#8a8270;margin-bottom:14px">${baru.length} sekolah baru yang sudah transaksi · item yang sudah masuk${partLabel?' · '+partLabel:''}</div>
    <table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:rgba(120,110,90,.12)"><th style="text-align:left;padding:8px;font-size:11px;letter-spacing:.06em;color:#8a8270">#</th><th style="text-align:left;padding:8px;font-size:11px;letter-spacing:.06em;color:#8a8270">SEKOLAH</th><th style="text-align:left;padding:8px;font-size:11px;letter-spacing:.06em;color:#8a8270">ITEM SUDAH MASUK</th></tr></thead><tbody>${rows}</tbody></table>`;
  document.body.appendChild(el);
  return el;
}
/* Sampai 30 sekolah baru = 1 gambar; lebih dari 30 dibagi 2. */
async function exportSekolahBaruImage(){
  const r=SB_CUR;if(!r)return;
  const n=r.schools.filter(s=>s.baru).length;
  if(!n){alert('Tidak ada sekolah baru yang sudah transaksi di MDS ini.');return;}
  const base=SB_MODAL_NAME+'_SekolahBaru';
  const parts=n<=SB_MAX_PER_IMAGE?[[0,n,'']]:[[0,Math.ceil(n/2),'Bagian 1 dari 2'],[Math.ceil(n/2),n,'Bagian 2 dari 2']];
  for(let i=0;i<parts.length;i++){
    const el=buildBaruImageEl(r,parts[i][0],parts[i][1],parts[i][2]);
    try{await exportImage(el,parts.length>1?base+'_'+(i+1)+'dari'+parts.length:base);}finally{el.remove();}
    if(i<parts.length-1)await new Promise(res=>setTimeout(res,600));
  }
}
