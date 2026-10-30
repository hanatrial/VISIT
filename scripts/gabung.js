/* Penyimpanan GABUNGAN Call & Order per bulan (Firestore, koleksi pjmds_data, dokumen gabung_*).
   Sheet hanya berisi bulan berjalan, jadi tiap tarikan MENYIMPAN baris bulan itu ke sini dan bulan-bulan
   sebelumnya tetap ada. Dipakai gambar Makassar/Gorontalo di tarik.html (data Okt + Nov + ...).
   Aturan: tiap bulan disimpan terpisah (bulan lama tidak pernah ditulis ulang oleh sheet bulan baru);
   sheet menggantikan bulan yang sama hanya bila isinya tidak lebih sedikit dari yang tersimpan.
   Dipakai bersama oleh tarik.js (browser) dan pull-call.js (Node). dashboard & Insight tidak membacanya. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.Gabung=factory();
})(typeof self!=='undefined'?self:this,function(){
  const CHUNK=600000, MAX_BYTES=900000, META='gabung_meta';
  const bytesOf=s=>typeof Buffer!=='undefined'?Buffer.byteLength(s,'utf8'):new Blob([s]).size;
  /* tanggal WITA dari ISO hasil sheet-map (tengah malam WITA dikurangi 36 detik) */
  function dkey(iso){const t=Date.parse(iso);return isNaN(t)?null:new Date(t+8*3600e3+36e3).toISOString().slice(0,10);}
  const OK_KEY=/^20\d\d-(0[1-9]|1[0-2])$/;
  function splitByMonth(call,order){
    const m={};
    [['call',call],['order',order]].forEach(([f,rows])=>rows.forEach(r=>{
      const d=dkey(r.Tanggal),k=d&&d.slice(0,7);
      if(!k||!OK_KEY.test(k))return;
      (m[k]||(m[k]={call:[],order:[]}))[f].push(r);
    }));
    return m;
  }
  function hash(s){let x=5381;for(let i=0;i<s.length;i++)x=((x<<5)+x+s.charCodeAt(i))|0;return (x>>>0).toString(36)+'_'+s.length;}
  function chunksOf(payload){
    let size=CHUNK,c;
    const cut=n=>{const a=[];for(let i=0;i<payload.length;i+=n)a.push(payload.slice(i,i+n));return a;};
    c=cut(size);while(c.some(x=>bytesOf(x)>MAX_BYTES)){size=Math.floor(size*0.8);c=cut(size);}
    return c;
  }
  async function readMeta(fsGet){
    const d=await fsGet(META);
    if(!d)return{months:{},updatedAt:null};
    const f=d.fields||{};
    return{months:JSON.parse((f.months&&f.months.stringValue)||'{}'),updatedAt:(f.updatedAt&&f.updatedAt.stringValue)||null};
  }
  const cname=(k,v,i)=>'gabung_'+k+'_'+v+'_chunk_'+i;

  /* Simpan baris sheet per bulan. Mengembalikan {written:[bulan],same:[bulan],kept:[bulan]}. */
  async function mergeSheet({fsGet,fsPatch,fsDelete,call,order}){
    const meta=await readMeta(fsGet),res={written:[],same:[],kept:[]},stale=[];
    const parts=splitByMonth(call,order);
    for(const k of Object.keys(parts).sort()){
      const p=parts[k],cur=meta.months[k],payload=JSON.stringify(p),h=hash(payload);
      if(cur&&cur.h===h){res.same.push(k);continue;}
      if(cur&&p.call.length+p.order.length<cur.call+cur.order){res.kept.push(k);continue;}   // sheet lebih sedikit: simpanan lama dipertahankan
      const v=Date.now().toString(36),ch=chunksOf(payload);
      for(let i=0;i<ch.length;i++)await fsPatch(cname(k,v,i),{data:{stringValue:ch[i]}});
      if(cur)for(let i=0;i<cur.chunks;i++)stale.push(cname(k,cur.v,i));
      meta.months[k]={v,chunks:ch.length,call:p.call.length,order:p.order.length,at:new Date().toISOString(),h};
      res.written.push(k);
    }
    if(res.written.length){
      meta.updatedAt=new Date().toISOString();
      await fsPatch(META,{months:{stringValue:JSON.stringify(meta.months)},updatedAt:{stringValue:meta.updatedAt}});
      for(const n of stale){try{await fsDelete(n);}catch(e){}}   // meta sudah menunjuk versi baru; sisa lama aman dibuang
    }
    return res;
  }
  /* Versi data gabungan (untuk cek "data berubah?"), null bila belum ada. */
  async function metaAt(fsGet){const m=await readMeta(fsGet);return Object.keys(m.months).length?m.updatedAt:null;}
  /* Baca semua bulan. null bila belum ada simpanan gabungan. */
  async function loadAll({fsGet,onProgress}){
    const meta=await readMeta(fsGet),keys=Object.keys(meta.months).sort();
    if(!keys.length)return null;
    const total=keys.reduce((a,k)=>a+meta.months[k].chunks,0);let n=0;const call=[],order=[];
    for(const k of keys){
      const m=meta.months[k];let full='';
      for(let i=0;i<m.chunks;i++){
        const d=await fsGet(cname(k,m.v,i));
        if(!d)throw new Error('Data gabungan '+k+' tidak lengkap (bagian '+i+'). Tarik data ulang.');
        full+=d.fields.data.stringValue;if(onProgress)onProgress(++n,total);
      }
      const o=JSON.parse(full);
      for(const r of o.call)call.push(r);for(const r of o.order)order.push(r);
    }
    return{call,order,at:meta.updatedAt,months:keys};
  }
  return{mergeSheet,loadAll,metaAt,splitByMonth,dkey};
});
