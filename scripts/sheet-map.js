/* Ubah workbook Google Sheet (tab Call & Order) menjadi baris yang disimpan ke Firestore.
   Dipakai bersama oleh:
     - scripts/pull-call.js        (GitHub Actions, Node)
     - tarik.html / tarik.js       (halaman Tarik Data di HP/browser)
   Format identik dengan "Update Data" di dashboard.js. Tanggal dikonversi dari nomor seri Excel
   secara deterministik (tidak bergantung zona waktu perangkat), meniru hasil upload dari browser WITA:
     - tanggal (bilangan bulat)  -> tengah malam WITA dikurangi 36 detik
     - jam saja (< 1)            -> jam dinding WITA di tanggal 1899-12-30 (+144 detik)           */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.SheetMap=factory();
})(typeof self!=='undefined'?self:this,function(){
  function toIso(v){
    if(v instanceof Date)return v.toISOString();
    if(typeof v==='number'&&isFinite(v)){
      const ms=Date.UTC(1899,11,30)+v*864e5;
      return new Date(ms-8*3600e3+(v<1?144e3:-36e3)).toISOString();
    }
    return v;
  }
  function findSheet(wb,name){
    const n=wb.SheetNames.find(s=>s.trim().toLowerCase()===name.toLowerCase());
    return n?wb.Sheets[n]:null;
  }
  /* XLSX = pustaka SheetJS; wb = hasil XLSX.read(...,{sheets:['Call','Order']}) TANPA cellDates. */
  function mapSheet(XLSX,wb){
    const callSheet=findSheet(wb,'Call'),orderSheet=findSheet(wb,'Order');
    if(!callSheet)throw new Error('Sheet "Call" tidak ditemukan. Sheet yang ada: '+wb.SheetNames.join(', '));
    const callRaw=XLSX.utils.sheet_to_json(callSheet,{defval:null});
    const orderRaw=orderSheet?XLSX.utils.sheet_to_json(orderSheet,{defval:null}):[];
    const call=callRaw.map(r=>({
      Bulan:Number(r['Bulan']),Tanggal:toIso(r['Tanggal']),
      NamaMDS:r['Nama MDS'],PIC:r['PIC'],Provinsi:r['Provinsi'],
      KodeCustomer:String(r['Kode Customer']),NamaCustomer:r['Nama Customer'],Kabupaten:r['Kabupaten'],
      Klasifikasi:r['Klasifikasi'],Sekolah:r['Sekolah'],StatusSekolah:r['Status Sekolah']===true,
      OmzetNS:Number(r['Omzet NS'])||0,OmzetHILO:Number(r['Omzet HILO'])||0,TotalOrder:Number(r['Total Order'])||0,
      CheckIn:toIso(r['Check In']),
      KoordinatCall:r['Koordinat Call']||null
    }));
    // Value kosong dibiarkan 0: dashboard menghitungnya saat dibaca (pjOrderValue = Value || Qty*harga).
    const order=orderRaw.map(r=>({
      Bulan:Number(r['Bulan']),Tanggal:toIso(r['Tanggal']),
      NamaMDS:r['Nama MDS'],KodeCustomer:String(r['Kode Customer']),
      NamaCustomer:r['Nama Customer'],Kabupaten:r['Kabupaten'],Klasifikasi:r['Klasifikasi'],
      Brand:r['Brand'],NamaItem:r['Nama Item']||'',Qty:Number(r['Qty'])||0,Value:Number(r['Value'])||0
    }));
    return{call,order};
  }
  /* Gabungkan data lama di cloud dengan hasil tarikan Sheet. Sheet hanya memuat periode berjalan (isi lama dibersihkan tiap
     ganti bulan), jadi menimpa penuh = data bulan lalu hilang. Aturan: baris Sheet SELALU dipakai penuh (Sheet = sumber
     kebenaran untuk tanggal yang dicakupnya); baris lama hanya dipertahankan bila tanggalnya SEBELUM baris tertua di Sheet
     dan bulannya masih dalam jendela keepMonths (default 2 = bulan berjalan + bulan lalu). Bulan mengikuti kolom "Bulan". */
  function ymOf(r){
    const t=Date.parse(r&&r.Tanggal);if(!isFinite(t)||!r.Bulan)return null;
    const d=new Date(t+8*3600e3);let y=d.getUTCFullYear();const mo=d.getUTCMonth()+1;
    if(r.Bulan-mo>6)y--;else if(mo-r.Bulan>6)y++;
    return y*12+r.Bulan;
  }
  function mergeKeep(old,call,order,keepMonths){
    keepMonths=keepMonths||2;
    let latest=-1;call.concat(order).forEach(r=>{const y=ymOf(r);if(y!=null&&y>latest)latest=y;});
    const from=latest-(keepMonths-1);
    const part=(oldArr,newArr)=>{
      let cut='9999';newArr.forEach(r=>{if(r.Tanggal&&r.Tanggal<cut)cut=r.Tanggal;});
      const keep=latest<0?[]:(oldArr||[]).filter(r=>{const y=ymOf(r);return r.Tanggal&&r.Tanggal<cut&&y!=null&&y>=from;});
      return{rows:keep.concat(newArr),kept:keep.length};
    };
    const c=part(old&&old.call,call),o=part(old&&old.order,order);
    return{call:c.rows,order:o.rows,keptCall:c.kept,keptOrder:o.kept};
  }
  return{toIso,mapSheet,mergeKeep};
});
