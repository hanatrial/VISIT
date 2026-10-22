/* Halaman "Tarik Data Call": ambil Call & Order dari Google Sheet lalu simpan ke Firestore
   (mds-sulawesi / pjmds_data) — sama dengan tombol Update Data / Tarik Data di dashboard dan
   penarikan otomatis GitHub Actions. Tanpa password, bisa dipasang sebagai aplikasi (PWA). */
const SHEET_ID='18659aHA0dQiBW-dRd616uOuujYoABeo7l1d2AeUXvsU';
const FS_PROJECT='mds-sulawesi', FS_KEY='AIzaSyCA8Q8athqYIsY3By5wPxcU97GjDBR6DAs';
const DB='https://firestore.googleapis.com/v1/projects/'+FS_PROJECT+'/databases/(default)/documents/pjmds_data';
const PJ_CHUNK_SIZE=700000, MAX_CHUNK_BYTES=900000;
const XLSX_URL='https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js';
const $=id=>document.getElementById(id);
let busy=false, deferredInstall=null, wakeLock=null;

/* ── util ─────────────────────────────────────────────────────────────── */
const nf=n=>Number(n).toLocaleString('id-ID');
function fmtWita(iso){
  const d=new Date(iso);if(isNaN(d))return '-';
  return d.toLocaleString('id-ID',{timeZone:'Asia/Makassar',day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(/\./g,':').replace(/(\d{2}):(\d{2})$/,'$1.$2')+' WITA';
}
function ago(iso){
  const s=(Date.now()-new Date(iso))/1000;if(!isFinite(s)||s<0)return '';
  if(s<90)return 'baru saja';
  if(s<3600)return Math.round(s/60)+' menit lalu';
  if(s<86400)return Math.round(s/3600)+' jam lalu';
  return Math.round(s/86400)+' hari lalu';
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
function setStep(n,state,text){
  const li=$('s'+n);li.className=state;
  if(text!==undefined)$('s'+n+'t').textContent=text;
}
function bar(p){$('barI').style.width=Math.max(0,Math.min(100,p))+'%';}

/* ── Firestore REST ───────────────────────────────────────────────────── */
async function fsGet(path){
  const r=await fetch(DB+'/'+path+'?key='+FS_KEY);
  if(r.status===404)return null;
  if(!r.ok)throw new Error('Firestore GET '+path+' gagal ('+r.status+')'+(r.status===429?' — kuota harian Firestore habis, coba lagi nanti':''));
  return r.json();
}
async function fsPatch(path,fields){
  const r=await fetch(DB+'/'+path+'?key='+FS_KEY,{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({fields})});
  if(!r.ok)throw new Error('Firestore simpan '+path+' gagal ('+r.status+')'+(r.status===429?' — kuota harian Firestore habis, coba lagi nanti':''));
}
async function fsDelete(path){
  const r=await fetch(DB+'/'+path+'?key='+FS_KEY,{method:'DELETE'});
  if(!r.ok&&r.status!==404)throw new Error('Firestore hapus '+path+' gagal ('+r.status+')');
}
const intVal=f=>f&&f.integerValue!==undefined?Number(f.integerValue):null;

/* ── info "terakhir diperbarui" ───────────────────────────────────────── */
async function loadLast(){
  try{
    const m=await fsGet('meta');
    if(!m){$('lastV').textContent='Belum ada data';$('lastS').textContent='';return null;}
    const f=m.fields||{};const at=f.updatedAt&&f.updatedAt.stringValue;
    const info={at,call:intVal(f.callCount),order:intVal(f.orderCount),chunkCount:intVal(f.chunkCount)||0};
    $('lastV').textContent=at?fmtWita(at):'-';
    $('lastS').textContent=(at?ago(at):'')+(info.call!=null?' · '+nf(info.call)+' call, '+nf(info.order)+' order':'');
    return info;
  }catch(e){$('lastV').textContent='Tidak bisa memuat';$('lastS').textContent=e.message;return null;}
}

/* ── notifikasi ───────────────────────────────────────────────────────── */
function notifSupported(){return 'Notification' in window;}
async function notify(title,body,tag){
  try{navigator.vibrate&&navigator.vibrate(title.startsWith('✅')?[180,70,180]:[400]);}catch(e){}
  if(!notifSupported()||Notification.permission!=='granted')return;
  try{
    const reg=await navigator.serviceWorker.ready;
    await reg.showNotification(title,{body,tag:tag||'tarik',icon:'tarik-icon-192.png',badge:'tarik-icon-192.png',renotify:true,data:{url:'tarik.html'}});
  }catch(e){try{new Notification(title,{body,icon:'tarik-icon-192.png'});}catch(_){}}
}
function refreshNotifBtn(){
  const b=$('notifBtn');
  b.hidden=!(notifSupported()&&Notification.permission==='default');
}
$('notifBtn').addEventListener('click',async()=>{
  try{await Notification.requestPermission();}catch(e){}
  refreshNotifBtn();
  if(Notification.permission==='granted')notify('🔔 Notifikasi aktif','Anda akan diberi tahu saat data selesai diunggah.','test');
});

/* ── pasang aplikasi ──────────────────────────────────────────────────── */
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();deferredInstall=e;$('installBtn').hidden=false;});
$('installBtn').addEventListener('click',async()=>{
  if(!deferredInstall)return;
  deferredInstall.prompt();try{await deferredInstall.userChoice;}catch(e){}
  deferredInstall=null;$('installBtn').hidden=true;
});
window.addEventListener('appinstalled',()=>{$('installBtn').hidden=true;});
(function(){
  const ios=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const standalone=window.matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  if(ios&&!standalone)$('iosHint').style.display='block';
  if(!notifSupported()&&!ios)$('notifBtn').hidden=true;
})();
if('serviceWorker' in navigator){
  navigator.serviceWorker.register('tarik-sw.js').catch(e=>console.warn('SW gagal',e));
}

/* ── pustaka xlsx (dimuat saat dibutuhkan) ────────────────────────────── */
let _xlsx=null;
function ensureXlsx(){
  if(window.XLSX)return Promise.resolve();
  if(!_xlsx)_xlsx=new Promise((res,rej)=>{
    const s=document.createElement('script');s.src=XLSX_URL;
    s.onload=()=>res();s.onerror=()=>{_xlsx=null;rej(new Error('Gagal memuat pustaka pembaca Excel (cek internet)'));};
    document.head.appendChild(s);
  });
  return _xlsx;
}

/* ── unduh dengan progres ─────────────────────────────────────────────── */
async function downloadSheet(){
  const res=await fetch('https://docs.google.com/spreadsheets/d/'+SHEET_ID+'/export?format=xlsx');
  if(!res.ok)throw new Error('Google Sheet tidak bisa diakses (HTTP '+res.status+'). Pastikan sheet masih bisa dilihat siapa saja yang punya link.');
  const total=Number(res.headers.get('content-length'))||0;
  if(!res.body||!res.body.getReader){const b=new Uint8Array(await res.arrayBuffer());return b;}
  const reader=res.body.getReader();const parts=[];let got=0;
  for(;;){
    const {done,value}=await reader.read();if(done)break;
    parts.push(value);got+=value.length;
    $('s1t').textContent=(got/1048576).toFixed(1)+' MB'+(total?' dari '+(total/1048576).toFixed(1)+' MB':'');
    if(total)bar(Math.min(30,got/total*30));
  }
  const out=new Uint8Array(got);let o=0;for(const p of parts){out.set(p,o);o+=p.length;}
  return out;
}

/* ── proses utama ─────────────────────────────────────────────────────── */
async function run(){
  if(busy)return;busy=true;
  const btn=$('go');btn.disabled=true;$('goT').textContent='Sedang menarik…';
  $('res').className='result';$('res').innerHTML='';
  $('prog').style.display='block';bar(0);
  ['s1','s2','s3','s4'].forEach((id,i)=>{setStep(i+1,'',' ');});
  setStep(1,'on','');
  try{wakeLock=await navigator.wakeLock.request('screen');}catch(e){wakeLock=null;}
  try{
    const before=await loadLast();
    const bytes=await downloadSheet();
    setStep(1,'done',(bytes.length/1048576).toFixed(1)+' MB diunduh');bar(32);

    setStep(2,'on','Memuat pembaca Excel…');
    await ensureXlsx();await sleep(30);
    setStep(2,'on','Membaca sheet Call & Order…');await sleep(30);
    const wb=XLSX.read(bytes,{type:'array',sheets:['Call','Merchandise','Order']});
    const {call,order}=SheetMap.mapSheet(XLSX,wb);
    setStep(2,'done',nf(call.length)+' call · '+nf(order.length)+' order');bar(50);

    // pengaman: jangan timpa data bagus dengan hasil kosong / jauh lebih kecil
    if(call.length<100)throw new Error('Baris call terlalu sedikit ('+call.length+'). Penarikan dibatalkan, data lama aman.');
    if(before&&before.call&&call.length<before.call*0.5)throw new Error('Baris call turun drastis ('+nf(before.call)+' → '+nf(call.length)+'). Penarikan dibatalkan, data lama aman.');
    if(before&&before.order&&order.length<before.order*0.5)throw new Error('Baris order turun drastis ('+nf(before.order)+' → '+nf(order.length)+'). Penarikan dibatalkan, data lama aman.');

    setStep(3,'on','Menyiapkan…');await sleep(30);
    const payload=JSON.stringify({call,order,meta:{filename:'Tarik Data (aplikasi HP)',uploadedAt:new Date().toISOString()}});
    let size=PJ_CHUNK_SIZE;
    const chunksOf=n=>{const a=[];for(let i=0;i<payload.length;i+=n)a.push(payload.slice(i,i+n));return a;};
    let chunks=chunksOf(size);
    const bytesOf=s=>new Blob([s]).size;
    while(chunks.some(c=>bytesOf(c)>MAX_CHUNK_BYTES)){size=Math.floor(size*0.8);chunks=chunksOf(size);}
    const oldCount=before?before.chunkCount:0;
    for(let i=0;i<chunks.length;i++){
      setStep(3,'on','Bagian '+(i+1)+' dari '+chunks.length);
      await fsPatch('chunk_'+i,{data:{stringValue:chunks[i]}});
      bar(50+(i+1)/chunks.length*48);
    }
    const nowIso=new Date().toISOString();
    await fsPatch('meta',{chunkCount:{integerValue:String(chunks.length)},updatedAt:{stringValue:nowIso},
      callCount:{integerValue:String(call.length)},orderCount:{integerValue:String(order.length)}});
    for(let i=chunks.length;i<oldCount;i++)await fsDelete('chunk_'+i);
    setStep(3,'done','Tersimpan di cloud');bar(96);

    // Data halaman Insight MDS (insight-mds.html): dihitung dari workbook yang sama. Gagal di sini tidak membatalkan tarikan.
    setStep(4,'on','Menghitung…');
    try{
      await sleep(30);
      const stat=await(await fetch('scripts/insight-static.json?v=1')).json();
      const ins=InsightBuild.buildInsight(XLSX,wb,stat);
      const js=JSON.stringify(ins);
      let isz=PJ_CHUNK_SIZE,ic=[];
      const ichunks=n=>{const a=[];for(let i=0;i<js.length;i+=n)a.push(js.slice(i,i+n));return a;};
      ic=ichunks(isz);while(ic.some(c=>new Blob([c]).size>MAX_CHUNK_BYTES)){isz=Math.floor(isz*0.8);ic=ichunks(isz);}
      for(let i=0;i<ic.length;i++)await fsPatch('insight_chunk_'+i,{data:{stringValue:ic[i]}});
      await fsPatch('insight_meta',{chunkCount:{integerValue:String(ic.length)},updatedAt:{stringValue:ins.generatedAt}});
      setStep(4,'done','Tersimpan ('+(js.length/1048576).toFixed(1)+' MB)');
    }catch(e){console.warn('Insight dilewati',e);setStep(4,'fail','Dilewati: '+String(e.message||e).slice(0,80));}
    bar(100);
    window.PJ_CACHE={call,order,at:nowIso};   // dipakai bagian gambar per area, tanpa unduh ulang

    const dCall=before&&before.call!=null?call.length-before.call:null;
    const dOrder=before&&before.order!=null?order.length-before.order:null;
    const sign=n=>n==null?'':(n>=0?'+':'')+nf(n);
    $('res').className='result ok';
    $('res').innerHTML='<h2>✅ Data berhasil diupload</h2>'+
      '<p>Selesai pukul <b>'+fmtWita(nowIso)+'</b>. Dashboard sudah memakai data terbaru; buka ulang dashboard untuk melihatnya.</p>'+
      '<div class="nums"><div><b>'+nf(call.length)+'</b><span>baris Call'+(dCall!=null?' ('+sign(dCall)+')':'')+'</span></div>'+
      '<div><b>'+nf(order.length)+'</b><span>baris Order'+(dOrder!=null?' ('+sign(dOrder)+')':'')+'</span></div></div>';
    await loadLast();
    notify('✅ Data berhasil diupload',nf(call.length)+' call · '+nf(order.length)+' order'+(dCall!=null?' ('+sign(dCall)+' call baru)':'')+' · '+fmtWita(nowIso),'tarik-ok');
  }catch(e){
    console.error(e);
    const cur=['s1','s2','s3','s4'].find(id=>$(id).className==='on');
    if(cur)setStep(Number(cur[1]),'fail');
    $('res').className='result err';
    $('res').innerHTML='<h2>❌ Gagal tarik data</h2><p>'+String(e.message||e).replace(/</g,'&lt;')+'</p><p>Data lama di dashboard tidak berubah (kecuali proses simpan sudah sebagian berjalan; ulangi saja).</p>';
    notify('❌ Gagal tarik data',String(e.message||e).slice(0,140),'tarik-err');
  }finally{
    try{wakeLock&&wakeLock.release();}catch(e){}
    busy=false;btn.disabled=false;$('goT').textContent='Tarik Data Lagi';
  }
}

$('go').addEventListener('click',()=>{
  // izin notifikasi harus diminta langsung dari ketukan pengguna
  if(notifSupported()&&Notification.permission==='default'){try{Notification.requestPermission().then(refreshNotifBtn);}catch(e){}}
  run();
});
refreshNotifBtn();
loadLast();
