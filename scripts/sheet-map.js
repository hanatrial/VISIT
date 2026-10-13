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
  return{toIso,mapSheet};
});
