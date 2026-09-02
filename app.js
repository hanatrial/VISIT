/* ─────────── FIRESTORE RECOVERY ───────────
   The SDK internally kills ("terminates") the Firestore client when its IndexedDB
   persistence layer hits an unrecoverable error — commonly when the app is
   backgrounded on very low battery, mid-write. Every further call then throws
   "The client has already been terminated." with no way to recover the SAME client;
   the fix is to delete the Firebase app instance and re-run initFirebaseApp() (from
   app-init.js) to get a fresh one, then retry the write. */
function isFirestoreTerminated(e){ return !!(e&&/already been terminated/i.test(e.message||'')); }
let _reinitInFlight=null;
async function reinitFirebase(){
  if(_reinitInFlight)return _reinitInFlight;
  _reinitInFlight=(async()=>{
    try{
      if(typeof firebase!=='undefined'&&firebase.apps)await Promise.all(firebase.apps.map(a=>a.delete().catch(()=>{})));
    }catch(e){console.warn('firebase app delete failed',e);}
    if(typeof initFirebaseApp==='function')initFirebaseApp();
  })();
  try{ await _reinitInFlight; } finally { _reinitInFlight=null; }
}
async function withFirestoreRetry(writeFn){
  try{
    return await writeFn();
  }catch(e){
    if(!isFirestoreTerminated(e))throw e;
    console.warn('Firestore client terminated — reconnecting and retrying save once');
    await reinitFirebase();
    return await writeFn();
  }
}

/* ─────────── DATA ─────────── */
const MDS_BY_AREA = {
  'Bau Bau':        ['Rizal'],
  'Bone':           ['A. Arwandi Amrah','M. Murdiono Arma','Amal Akbar','Ilham','Andi Reski'],
  'Gorontalo':      ['Aditya Hulopi','Mohammad Rahman Marwan','Abd. Rahman Lahay','Satrio Yusuf'],
  'Kendari':        ['Laode Asrad Ilhamid','Abdul Rahman (Rangga)','Dwi Haryanto','Rosa Sasmita'],
  'Luwuk':          ['Kadek Adi Merta Sastrawan'],
  'Makassar':       ['Sulfiana Rusdy','A. Mappanyukki','Andi Iswan Tenri Bau','Rahmat','Hasrar','Andi Muh. Nurfikrahturrahman','Nurul Ramadhani','Syafri'],
  'Mamuju':         ['Muhammad Rizky Sandria','Sugiono'],
  'Manado':         ['Melisa Pungky Mapaliey','Rivanti Gusti Husein','Ignacia Regina Naung','Ridlan Mangilong','Tesar','Meilani Watung'],
  'Palopo':         ['Tio Setiawan Rappun','Hijrayanti Mahruddin','Firman'],
  'Palu':           ['Muh Nasir K','Yuliana Rusli','Rafdi'],
  'Pare-Pare':      ['Marwan','Yurike Kyusuchi','Muhlis'],
  'Poso':           ['Syaifullah'],
};
const STORES_BY_AREA = {
  'Bone':     ['HYPERMART BONE','SURYA INDAH AHMAD YANI','SURYA INDAH COKRO','SURYA INDAH MAKMUR','SURYA INDAH MH THAMRIN','SURYA INDAH SUDIRMAN','SURYA INDAH WAHIDIN'],
  'Gorontalo':['CV AGUNG BERKAT JAYA','DHIDI SWALAYAN','DK MART TELAGA','GELAEL GORONTALO','HYPERMART GORONTALO','INDOGROSIR GORONTALO','MAKRO SPM','MURAA SUPERMARKET','MURAA SUPERMARKET 2'],
  'Kendari':  ['ADE SULTRA PERSADA','INDOGROSIR KENDARI','KABA MART','MARINA MART','MGM KOTA KENDARI','PT BANDA MULTI BAHANA','Tk. Nana Jaya 2 ( Hendrawan Sumus Gia )'],
  'Luwuk':    ['CV ALL BERKEMBANG BERSAMA','FOUR MART'],
  'Makassar': ['BENTENG MART','BENTENG MART SIGNATURE','BINTANG MODE','CITRA COSMETIC PERINTIS','CITRA KOSMETIK','CV CAHAYA SEJAHTERA MANDIRI','FARMERS MARKET MAKASSAR','FOODMART PHINISI POINT MAKASSAR','GRAND TOSERBA HERTASNING','GRAND TOSERBA TANJUNG BUNGA','HERO ALAUDDIN MAKASSAR','HERO TAMALANREA','HYPERMART PANAKKUKANG MAKASSAR','INDOGROSIR MAKASSAR','LOTTE MART MAKASSAR','MIDI SUPER LIMBUNG','MIDI SUPER PANAKKUKANG','OLALA MURAH','SINAR ALAM (RANGGONG)','TOP MODE KAKATUA'],
  'Mamuju':   ['CV ALAM JAYA (SUBUR UNION)','FAMILY MART MAMUJU'],
  'Manado':   ['DWI LESTARI/JL. SOEPRAPTO','FRESH MART SPM (Kembang)','FRESH MART SPM (Teling)','FRESH MART SPM (Tikala)','GIRIAN JAYA','HYPERMART MANADO TOWN SQUARE','INDOGROSIR MANADO','LOTTE SHOPPING MANADO','MIDI SUPER KOTAMOBAGU','PT ABDI KARYA TOTABUAN','PT CITRA PARISINDO UTAMA','PT DRAGON BULAWAN','SAKURA MART','TITA (KOTAMOBAGU)'],
  'Palopo':   ['ALIF MART','CITRA SULAWESI SEJAHTERA PALOPO','FRIDA MART','HYPERMART PALOPO','KANAAN TK. / PASAR BOLU (BESAR)','KANAAN TK. / PASAR BOLU (KECIL)','KHEYLA MART/BARAKA NO. 5 RT. 01 RW. 02','KITA TK. /JL.ABDUL GANI','LAPANGAN (RANTEPAO)','MATAHARI SWALAYAN PALOPO','MIDI SUPER JENSUD 2 PALOPO','RESKY MART/Jl.POROS BARAKA','TOKO ANISA BARAKA/ DEPAN PASA BARAKA','TOKO BARU CEMERLANG / JL. RATULANGI, 5 METER DARI'],
  'Palu':     ['ANEKA SWALAYAN','CV FITRA NIAGA','HYPERMART KOTA PALU','KOTA PALU MITRA UTAMA','SEVEN MART','SWALAYAN MARIO'],
  'Pare-Pare':['77 MART','CITRA SULAWESI SEJAHTERA KOTA PAREPARE','CITRA SULAWESI SEJAHTERA PINRANG','SINAR MANIS PARE-PARE','TOSERBA DIANA KOTA PAREPARE','VARIA BARU PINRANG'],
};
const ITEMS_BY_STORE = {
  "HENGKY TRANKU": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM FIBER PRO 6DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS KENTAL MANIS 24BTLX150ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COLLAGEN DRINK STRAWBERRY 12KLRX200G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "77 MART": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "CITRA SULAWESI SEJAHTERA KOTA PAREPARE": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL ORIGINAL 12DX12SX25G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "CITRA SULAWESI SEJAHTERA PINRANG": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COLLAGEN DRINK STRAWBERRY STICK 12DX6SX12G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "CV ALAM JAYA (SUBUR UNION)": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "FAMILY MART MAMUJU": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL ORIGINAL 12DX12SX25G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK BANANA DELIGHT 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SINAR MANIS PARE-PARE": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SURYA INDAH SUKAWATI": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "TOSERBA DIANA KOTA PAREPARE": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "ADE SULTRA PERSADA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "ALIF MART": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "ANEKA SWALAYAN": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "CITRA SULAWESI SEJAHTERA PALOPO": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM FIBER PRO 6DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WAFER KOREAN STRAWBERRY CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "CV AGUNG BERKAT JAYA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "CV ALL BERKEMBANG BERSAMA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "CV FITRA NIAGA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "DHIDI SWALAYAN": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "DK MART TELAGA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "DWI LESTARI/JL. SOEPRAPTO": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "FOUR MART": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "FRESH MART SPM": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM FIBER PRO 6DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK BANANA DELIGHT 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WAFER KOREAN STRAWBERRY CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS AVOCADO COFFEE 12DX4SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "FRIDA MART": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "GELAEL GORONTALO": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK KOREAN STRAWBERRY 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KLEPON 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS 7 FRUITS FIBER DAILY 12DX12SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "GIRIAN JAYA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL BUBBLE GUM 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM FIBER PRO 6DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "KANAAN TK. / PASAR BOLU": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "KHEYLA MART/BARAKA NO. 5 RT. 01 RW. 02": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "KITA TK. /JL.ABDUL GANI": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "KOTA PALU MITRA UTAMA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ISOPOWER STARGIZING 6DX30SX7.8G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "LAPANGAN (RANTEPAO)": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM FIBER PRO 6DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "MAKRO SPM": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM FIBER PRO 6DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLANTPROTEIN OGURA 12DX216G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "MARINA MART": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KLEPON 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WAFER KOREAN STRAWBERRY CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "MATAHARI SWALAYAN PALOPO": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "MGM KOTA KENDARI": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA AREN 24DX50SX2G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "MURAA SUPERMARKET": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL ORIGINAL 12DX12SX25G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COLLAGEN DRINK STRAWBERRY 12KLRX200G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "MURAA SUPERMARKET 2": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL ORIGINAL 12DX12SX25G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COLLAGEN DRINK STRAWBERRY 12KLRX200G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "PT ABDI KARYA TOTABUAN": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA AREN 24DX50SX2G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "PT BANDA MULTI BAHANA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK BANANA DELIGHT 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "PT CITRA PARISINDO UTAMA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM FIBER PRO 6DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "PT DRAGON BULAWAN": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL COTTON CANDY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL ORIGINAL 12DX12SX25G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM NOODLE SEMUR DAGING 18BAGX56.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CLEAR PROTEIN PEACH 12PX8SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "RESKY TK": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SAKURA MART": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SEVEN MART": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SURYA INDAH AHMAD YANI": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA AREN 24DX50SX2G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SURYA INDAH COKRO": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA AREN 24DX50SX2G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SURYA INDAH MAKMUR": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SURYA INDAH MH THAMRIN": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SURYA INDAH SUDIRMAN": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SURYA INDAH WAHIDIN": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM ORIGINAL 12DX12SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA AREN 24DX50SX2G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "SWALAYAN MARIO": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "TITA (KOTAMOBAGU)": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "Tk. Nana Jaya 2 ( Hendrawan Sumus Gia )": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "TOKO ANISA BARAKA/ DEPAN PASA BARAKA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "TOKO BARU CEMERLANG / JL. RATULANGI, 5 METER DARI": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MARKISA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "VARIA BARU PINRANG": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "RESKY MART/Jl.POROS BARAKA": [
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABTX MILK VANILLA MALT 12DX150G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JERUK MADU 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS PEANUT ALMOND BUTTER 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL REF 16PCHX1000ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    }
  ],
  "MIDI SUPER JENSUD 2 PALOPO": [
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN CRUNCH BBQ BEEF 20BAGX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR STRONGBERY 6SBX12SX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS LOKALATE KOPI ALPUKAT FC 36OX10SX15G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX250G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SHIRATAKI NOODLES 40OX71G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SANTAN 24DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MAYO ROASTED SESAME 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "MIDI SUPER KOTAMOBAGU": [
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN CRUNCH BBQ BEEF 20BAGX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR STRONGBERY 6SBX12SX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS LOKALATE KOPI ALPUKAT FC 36OX10SX15G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX250G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SHIRATAKI NOODLES 40OX71G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SANTAN 24DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MAYO ROASTED SESAME 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "MIDI SUPER LIMBUNG": [
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN CRUNCH BBQ BEEF 20BAGX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR STRONGBERY 6SBX12SX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS LOKALATE KOPI ALPUKAT FC 36OX10SX15G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX250G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SHIRATAKI NOODLES 40OX71G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SANTAN 24DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MAYO ROASTED SESAME 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "MIDI SUPER PANAKKUKANG": [
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN CRUNCH BBQ BEEF 20BAGX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR STRONGBERY 6SBX12SX20G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD JAMBU BIJI 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS LOKALATE KOPI ALPUKAT FC 36OX10SX15G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX250G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SHIRATAKI NOODLES 40OX71G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SANTAN 24DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MAYO ROASTED SESAME 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "HYPERMART BONE": [
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN MELON 12DX400G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX500G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS W'DANK BAJIGUR 24DX4SX15G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX250G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT HONEY 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "HYPERMART GORONTALO": [
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN MELON 12DX400G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX500G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS W'DANK BAJIGUR 24DX4SX15G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX250G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT HONEY 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "HYPERMART KOTA PALU": [
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN MELON 12DX400G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX500G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS W'DANK BAJIGUR 24DX4SX15G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX250G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT HONEY 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "HYPERMART MANADO TOWN SQUARE": [
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN MELON 12DX400G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX500G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS W'DANK BAJIGUR 24DX4SX15G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX250G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT HONEY 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "HYPERMART PALOPO": [
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN MELON 12DX400G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX500G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS W'DANK BAJIGUR 24DX4SX15G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX250G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT HONEY 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "HYPERMART PANAKKUKANG MAKASSAR": [
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN POPCORN CARAMEL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN MELON 12DX400G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN DAILY CHOCOLATE 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CHOCO VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS BANANA 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE GOLD VANILLA 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK NIPIS 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX500G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS W'DANK BAJIGUR 24DX4SX15G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS DIABETAMIL SWT 24DX50SX1G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM COFFEE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM CHOCOLATE 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX250G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT HONEY 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX25SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT I SWEET 12DX25SX1.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT GULA BUAH 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS GULA JAWA 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS MINT COCOA 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS WHITE COFFEE 12DX4SX15G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CHOCOLATE SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES HOKKAIDO CHEESE 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES KOREAN GOGUMA 12DX5SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS HONEY 12BTLX350ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS COOKIES CHOCOLATE 12DX10SX20G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS ROYAL MATCHA SPREAD 12BTLX300G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SUNFLOWER OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS MERAH ORGANIK 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS BERAS PORANG INSTAN 12PCHX1000G",
      "b": "TS",
      "c": "NON POLOS"
    }
  ],
  "LOTTE SHOPPING MANADO": [
    {
      "n": "HI LO 3IN1 SUSU COKLAT BELGIA PLS 12RX10SX25G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO ACTIVE VANILLA 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK AVOCADO CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO HAZELNUT PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCO MALT PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK ES KETAN HITAM PLS 8RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOFIT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD CHOCOLATE TARO 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO DRINK SWISS CHOCOLATE PLS 8RX10SX28G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK THAI TEA PLS 8RX10SX15G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD CHOCOLATE 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD ORIGINAL 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO GOLD VANILLA 12DX200G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL HONEY 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL STRAWBERRY PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "b": "HI LO",
      "c": "POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN CHOCOLATE 12DX500G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN RTD COKELAT 24TPKX200ML",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 12DX250G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "HI LO TEEN VANILLA CARAMEL 6DX750G",
      "b": "HI LO",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN ADVANCE CAPPUCINO 12DX250G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 12DX225G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN GAINMASS CHOCOLATE 6DX500G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML",
      "b": "L-MEN",
      "c": "NON POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE FC 72OX10SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS AMERICAN SWEET ORANGE PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR HIJAU PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ANGGUR PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS APPLE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS BLEWAH PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ES CINCAU PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ES KUWUD NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE FC 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS FLORIDA ORANGE PLS 18PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS GULA ASEM PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ISOTONIK REFRESHING CITRUS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX250G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK MANIS REF 12DX500G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK NIPIS 72OX10SX11G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK NIPIS PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS JERUK PERAS 72GUSX5SX14G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS JERUK PERAS PLS 18PX40SX14G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS KELAPA MUDA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LEMON TEA REF PLS 12BAGX400G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LESS SUGAR BELIMBING PLS 4PX40SX6G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LOKALATE KOPI ALPUKAT PLS 12RX10SX15G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LOKALATE KOPI GULA AREN PLS 12RX10SX15G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS LYCHEE TEA REF PLS 12BAGX400G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MADU JERUK PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MADU LEMON PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MANGGA GANDARIA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MELON PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY ORANGE PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS MILKY PEACH PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS ORANGE TEA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS RTD SQUEEZED ORANGE 24TPKX200ML",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "NS SEMANGKA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS STRAWBERRY PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET GUAVA PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS SWEET MANGO PLS 4PX40SX11G",
      "b": "NUTRISARI",
      "c": "POLOS"
    },
    {
      "n": "NS W'DANK BAJIGUR 24DX4SX15G",
      "b": "NUTRISARI",
      "c": "NON POLOS"
    },
    {
      "n": "TS CAFE LATTE 12DX10SX14G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CANOLA OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS CORN OIL 12BTLX946ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX180G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS LOW FAT MILK VANILLA 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS NFDM ORIGINAL 6DX1000G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK CANTALOUPE MELON 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SOY SAUCE 24BTLX200ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS STRAWBERRY JAM 12BTLX375G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 12DX100SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX25SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC 24DX50SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC IND 12PX125SX2.5G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 12DX500G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT CLASSIC REF 24DX100G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 12DX100SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT DIABTX 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SWT STEVIA 24DX50SX1.8G",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP COCOPANDAN 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP LYCHEE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    },
    {
      "n": "TS SYRUP ORANGE 12BTLX750ML",
      "b": "TS",
      "c": "NON POLOS"
    }
  ]
};
const IDEAL_ITEMS_LIST=["HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G","HI LO SCHOOL VANILLA 12DX250G","HI LO TEEN CHOCOLATE 12DX500G","HI LO SCHOOL CHOCOLATE 12DX500G","HI LO TEEN VANILLA CARAMEL 12DX500G","HI LO TEEN CHOCOLATE 12DX250G","HI LO SCHOOL CHOCOLATE 12DX250G","HI LO DRINK RTD CHOCOFIT 24TPKX200ML","HI LO SCHOOL RTD COKELAT 24TPKX200ML","HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G","HI LO TEEN RTD COKELAT 24TPKX200ML","HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G","L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML","L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML","NS RTD JAMBU BIJI 24TPKX200ML","NS RTD JERUK MADU 24TPKX200ML","NS RTD SQUEEZED ORANGE 24TPKX200ML","TS BERAS PORANG INSTAN SACHET 12DX10SX40G","TS CANOLA OIL 12BTLX946ML","TS SWT DIABTX 12DX100SX1.8G","TS CORN OIL 12BTLX946ML","TS SWT CLASSIC 12DX100SX2.5G","TS BERAS MERAH ORGANIK 12PCHX1000G","TS SWT CLASSIC 24DX50SX2.5G","TS SOY SAUCE 24BTLX200ML","TS HONEY 12BTLX350ML","TS COOKIES HOKKAIDO CHEESE 12DX5SX20G","TS CHOCOLATE SPREAD 12BTLX300G","TS SUNFLOWER OIL 12BTLX946ML","TS SWT DIABTX 24DX50SX1.8G","TS PEANUT ALMOND BUTTER 12BTLX300G","TS SWT STEVIA 24DX50SX1.8G","TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML","TS SWT CLASSIC 24DX25SX2.5G","TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML","TS SWT DIABTX 12DX25SX1.8G","TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML","TS SYRUP COCOPANDAN 12BTLX750ML","TS DIABTX MILK VANILLA MALT 12DX150G","HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G","HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G","HI LO DRINK CHOCO MALT PLS 8RX10SX14G","HI LO DRINK SWISS CHOCOLATE PLS 8RX10SX28G","HI LO DRINK CHOCOLATE PLS 15RX10SX14G","HI LO DRINK CREAMY MARIE PLS 15RX10SX14G","HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G","NS AMERICAN SWEET ORANGE PLS 18PX40SX14G","NS JERUK PERAS PLS 18PX40SX14G","NS LEMON TEA PLS 4PX40SX11G","NS BLACKCURRANT TEA PLS 4PX40SX11G","NS SWEET MANGO PLS 4PX40SX11G","NS ANGGUR PLS 4PX40SX11G","NS JERUK NIPIS PLS 4PX40SX11G","NS JERUK (EX) MANIS PLS 4PX40SX11G","NS MILKY ORANGE PLS 4PX40SX11G"];
let _SGO=null;
function getStoreItems(){
  const s=ITEMS_BY_STORE[R.store];
  const items=s?s.map(x=>x.n):IDEAL_ITEMS_LIST;
  const st=(R.store||'').toUpperCase();
  if(st.includes('MIDI')||st.includes('HYPERMART')||st.includes('GELAEL')){
    if(!_SGO){_SGO={};STOCK_PRODUCTS.forEach((g,gi)=>g.items.forEach(it=>_SGO[it]=gi));}
    items.sort((a,b)=>{const ai=_SGO[a]??999,bi=_SGO[b]??999;return ai!==bi?ai-bi:a.localeCompare(b);});
  }
  return items;
}
const AREAS = Object.keys(MDS_BY_AREA).sort((a,b)=>a.localeCompare(b));
const BELI_STORES_BY_AREA = {};

// Merge stores from any source into both lookup tables + localStorage cache
// Duplicate check is case-insensitive so "Hengky tranku" reuses "Hengky Tranku"
function _sameName(a,b){return String(a).trim().toLowerCase()===String(b).trim().toLowerCase();}
function canonicalStore(area,name){
  const n=String(name).trim();
  const all=[...(STORES_BY_AREA[area]||[]),...(BELI_STORES_BY_AREA[area]||[])];
  return all.find(s=>_sameName(s,n))||n;
}
function canonicalMds(area,name){
  const n=String(name).trim();
  return (MDS_BY_AREA[area]||[]).find(m=>_sameName(m,n))||n;
}
function _mergeStores(area,stores){
  if(!Array.isArray(stores))return;
  if(!STORES_BY_AREA[area])STORES_BY_AREA[area]=[];
  if(!BELI_STORES_BY_AREA[area])BELI_STORES_BY_AREA[area]=[];
  stores.forEach(s=>{
    if(!STORES_BY_AREA[area].some(x=>_sameName(x,s)))STORES_BY_AREA[area].push(s);
    if(!BELI_STORES_BY_AREA[area].some(x=>_sameName(x,s)))BELI_STORES_BY_AREA[area].push(s);
  });
  try{
    const saved=JSON.parse(localStorage.getItem('mds_custom_stores')||'{}');
    if(!saved[area])saved[area]=[];
    stores.forEach(s=>{if(!saved[area].includes(s))saved[area].push(s);});
    localStorage.setItem('mds_custom_stores',JSON.stringify(saved));
  }catch(e){}
}
// Seed from localStorage immediately (fast, offline-safe)
(function(){try{const s=JSON.parse(localStorage.getItem('mds_custom_stores')||'{}');Object.entries(s).forEach(([a,v])=>_mergeStores(a,v));}catch(e){}})();

function addNewStore(flow){
  const inputId=flow+'-store-new', selId=flow+'-store-sel', boxId=flow+'-store-box';
  let nw=document.getElementById(inputId).value.trim();
  if(!nw)return;
  const area=flow==='rka'?R.area:flow==='beli'?B.area:flow==='ned'?ND.area:flow==='spg'?SG.area:SK.area;
  if(!area){alert('Pilih area dulu sebelum tambah toko.');return;}
  nw=flow==='spg'?canonicalSpgStore(area,nw):canonicalStore(area,nw);
  const sel=document.getElementById(selId);
  if(![...sel.options].some(o=>o.value===nw)){
    flow==='spg'?saveSpgStore(area,nw):saveCustomStore(area,nw);
    const o=document.createElement('option');o.value=nw;o.textContent=nw;sel.appendChild(o);
  }
  sel.value=nw;
  document.getElementById(inputId).value='';
  // class only — an inline display:none here would outrank .add-box.open and stop the
  // box from ever reopening for the rest of the session
  document.getElementById(boxId).classList.remove('open');
  if(flow==='rka')rkaCheck(1);
  else if(flow==='beli')beliCheck(1);
  else if(flow==='ned')nedCheck(1);
  else if(flow==='spg')spgCheck(1);
  else stockCheck(1);
}
function saveCustomStore(area,name){
  _mergeStores(area,[name]);
  // Persist to Firestore for cross-device sync
  try{
    if(typeof db!=='undefined'){
      db.collection('app_data').doc('stores').set(
        {[area]:firebase.firestore.FieldValue.arrayUnion(name)},{merge:true}
      ).catch(e=>console.warn('store save failed',e));
    }
  }catch(e){}
}
async function loadCustomStores(){
  try{
    if(typeof db==='undefined')return;
    const doc=await db.collection('app_data').doc('stores').get();
    if(!doc.exists)return;
    Object.entries(doc.data()).forEach(([a,v])=>_mergeStores(a,v));
  }catch(e){console.warn('loadCustomStores failed',e);}
}

/* SPG has its own isolated store list — not shared with RKA/Beli/NED/Stock */
const SPG_INDOGROSIR_ONLY_NAMES = ['Sarwendah - Indogrosir','Tiara - Indogrosir','Rosa - Indogrosir','Sri Rahayu Dongio'];
const SPG_STORES_BY_AREA = {
  'Makassar': ['Satu Sama Landak','Satu Sama Perintis','Satu Sama Hertasning','Hengky Tranku','Top Mode Perintis','Grand Toserba Pengayoman','Ektong','Grand Toserba Hertasning','Satu Sama Karlink','Gelael','Grand Mall','Diamond','Indogrosir Makassar'],
  'Gorontalo': ['Indogrosir Gorontalo'],
  'Kendari': ['Indogrosir Kendari'],
  'Manado': ['Indogrosir Manado']
};
function canonicalSpgStore(area,name){
  const n=String(name).trim();
  return (SPG_STORES_BY_AREA[area]||[]).find(s=>_sameName(s,n))||n;
}
function _mergeSpgStores(area,stores){
  if(!Array.isArray(stores))return;
  if(!SPG_STORES_BY_AREA[area])SPG_STORES_BY_AREA[area]=[];
  stores.forEach(s=>{ if(!SPG_STORES_BY_AREA[area].some(x=>_sameName(x,s)))SPG_STORES_BY_AREA[area].push(s); });
  try{
    const saved=JSON.parse(localStorage.getItem('mds_spg_custom_stores')||'{}');
    if(!saved[area])saved[area]=[];
    stores.forEach(s=>{if(!saved[area].includes(s))saved[area].push(s);});
    localStorage.setItem('mds_spg_custom_stores',JSON.stringify(saved));
  }catch(e){}
}
(function(){try{const s=JSON.parse(localStorage.getItem('mds_spg_custom_stores')||'{}');Object.entries(s).forEach(([a,v])=>_mergeSpgStores(a,v));}catch(e){}})();
function saveSpgStore(area,name){
  _mergeSpgStores(area,[name]);
  try{
    if(typeof db!=='undefined'){
      db.collection('app_data').doc('spg_stores').set(
        {[area]:firebase.firestore.FieldValue.arrayUnion(name)},{merge:true}
      ).catch(e=>console.warn('spg store save failed',e));
    }
  }catch(e){}
}
async function loadSpgCustomStores(){
  try{
    if(typeof db==='undefined')return;
    const doc=await db.collection('app_data').doc('spg_stores').get();
    if(!doc.exists)return;
    Object.entries(doc.data()).forEach(([a,v])=>_mergeSpgStores(a,v));
  }catch(e){console.warn('loadSpgCustomStores failed',e);}
}

/* SPG name roster — seeded from the names already submitted in spg_daily_logs, so the
   field becomes a picker instead of free text (which was producing typo variants of
   the same person). New names added in the app are persisted and shared across devices. */
const SPG_NAMES_BY_AREA = {
  'Makassar': ['Amel','Ike Putri Magfirah','Kamalia','Lilis Suriani','Muliani','Nadia','Natasya','Resky Audina','Rhiby Aliyah Pratiwi','Salsa Syabilla Zahra','Sujar Event','Yuninda Natasya Amey'],
  'Kendari': ['Andi Sriwahyuni','Nabila Febriani','Nur Alvina Azizah Buburanda','Yuliana']
};
function canonicalSpgName(area,name){
  // collapse internal whitespace too, not just trim: "siti  RAHMA" and "siti RAHMA"
  // must resolve to one person, otherwise the picker just moves the duplicate problem
  const n=String(name).trim().replace(/\s+/g,' ');
  return (SPG_NAMES_BY_AREA[area]||[]).find(s=>_sameName(s,n))||n;
}
function _mergeSpgNames(area,names){
  if(!Array.isArray(names))return;
  if(!SPG_NAMES_BY_AREA[area])SPG_NAMES_BY_AREA[area]=[];
  names.forEach(s=>{ if(s&&!SPG_NAMES_BY_AREA[area].some(x=>_sameName(x,s)))SPG_NAMES_BY_AREA[area].push(s); });
  SPG_NAMES_BY_AREA[area].sort((a,b)=>a.localeCompare(b));
  try{
    const saved=JSON.parse(localStorage.getItem('mds_spg_names')||'{}');
    if(!saved[area])saved[area]=[];
    names.forEach(s=>{if(s&&!saved[area].includes(s))saved[area].push(s);});
    localStorage.setItem('mds_spg_names',JSON.stringify(saved));
  }catch(e){}
}
(function(){try{const s=JSON.parse(localStorage.getItem('mds_spg_names')||'{}');Object.entries(s).forEach(([a,v])=>_mergeSpgNames(a,v));}catch(e){}})();
function saveSpgName(area,name){
  _mergeSpgNames(area,[name]);
  try{
    if(typeof db!=='undefined'){
      db.collection('app_data').doc('spg_names').set(
        {[area]:firebase.firestore.FieldValue.arrayUnion(name)},{merge:true}
      ).catch(e=>console.warn('spg name save failed',e));
    }
  }catch(e){}
}
async function loadSpgNames(){
  try{
    if(typeof db==='undefined')return;
    const doc=await db.collection('app_data').doc('spg_names').get();
    if(!doc.exists)return;
    Object.entries(doc.data()).forEach(([a,v])=>_mergeSpgNames(a,v));
    if(typeof spgFillNames==='function'&&document.getElementById('spg-area-sel'))spgFillNames();
  }catch(e){console.warn('loadSpgNames failed',e);}
}

/* ─────────── STATE ─────────── */
const R = { step:0, area:'', mds:'', store:'', photos:{}, items:{}, photoUploads:{}, uploadsDone:{} };
const B = { step:0, area:'', mds:'', store:'', photo:null, qty:{}, photoUpload:null };
const BELI_PRODUCTS = [
  {
    "group": "HILO",
    "items": [
      "HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G",
      "HI LO DRINK CREAMY MARIE PLS 15RX10SX14G",
      "HILO CHOCOLATE PLS 15RX10SX14G",
      "HILO THAI TEA PLS 8RX10SX15G",
      "HILO WHITE CHOCOLATE PLS 15RX10SX14G",
      "HI LO DRINK CHOCO MALT 8RX10SX14G",
      "HILO SWISS CHOCOLATE PLS 8RX10SX28G",
      "HI LO DRINK CHOCOLATE TARO PLS 15RX10SX14G",
      "HI LO DRINK TEH TARIK PLS 8RX10SX15G",
      "HILO AVOCADO CHOCOLATE PLS 15RX10SX14G",
      "HILO CHOCO HAZELNUT PLS 15RX10SX14G",
      "HILO CHOCOLATE BANANA PLS 15RX10SX14G",
      "HILO CHOCOLATE TARO PLS 15RX10SX14G",
      "HILO ES KETAN HITAM PLS 8RX10SX14G"
    ],
    "priority": 7
  },
  {
    "group": "HILOPLS",
    "items": [
      "HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G",
      "HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G",
      "HI LO SCHOOL STRAWBERRY PLS 12RX10SX27G"
    ],
    "priority": 3
  },
  {
    "group": "NS",
    "items": [
      "NS LESS SUGAR JERUK PONTIANAK PLS 4PX40SX6G",
      "NS LESS SUGAR JERUK SONKIT PLS 4PX40SX6G",
      "NS BLACKCURRANT TEA PLS 4PX40SX11G",
      "NS LEMON TEA PLS 4PX40SX11G",
      "NS LYCHEE TEA PLS 4PX40SX11G",
      "NS ORANGE TEA PLS 4PX40SX11G",
      "NS APPLE TEA PLS 4PX40SX11G",
      "NS PEACH TEA PLS 4PX40SX11G",
      "NS JERUK PERAS PLS 18PX40SX14G",
      "NS ASO PLS 14GX18PX40S",
      "NS JERUK NIPIS PLS 4PX40SX11G",
      "NS ANGGUR PLS 4PX40SX11G",
      "NS SWEET MANGO PLS 4PX40SX11G",
      "NS JERUK (EX) MANIS PLS 4PX40SX11G",
      "NS MILKY ORANGE PLS 4PX40SX11G",
      "NS ANGGUR HIJAU PLS 4PX40SX11G",
      "NS APEL JERUK PLS 4PX40SX11G",
      "NS BLEWAH PLS 4PX40SX11G",
      "NS COCOPANDAN PLS 4PX40SX11G",
      "NS ES CINCAU PLS 4PX40SX11G",
      "NS ES KUWUD NIPIS PLS 4PX40SX11G",
      "NS ES RUJAK PLS 4PX40SX11G",
      "NS FLORIDA ORANGE PLS 18PX40SX11G",
      "NS GULA ASEM PLS 4PX40SX11G",
      "NS ISOTONIK REFRESHING CITRUS PLS 4PX40SX11G",
      "NS JERUK JEJU PLS 4PX40SX11G",
      "NS JERUK MANADO PLS 4PX40SX11G",
      "NS JERUK MAROKO PLS 4PX40SX11G",
      "NS KELAPA MUDA PLS 4PX40SX11G",
      "NS LECI PLS 4PX40SX11G",
      "NS LESS SUGAR BELIMBING PLS 4PX40SX6G",
      "NS MADU JERUK PLS 4PX40SX11G",
      "NS MADU LEMON PLS 4PX40SX11G",
      "NS MANGGA GANDARIA PLS 4PX40SX11G",
      "NS MARKISA PLS 4PX40SX11G",
      "NS MELON PLS 4PX40SX11G",
      "NS MILKY PEACH PLS 4PX40SX11G",
      "NS NANAS PLS 4PX40SX11G",
      "NS SEMANGKA PLS 4PX40SX11G",
      "NS SIRSAK PLS 4PX40SX11G",
      "NS STRAWBERRY PLS 4PX40SX11G",
      "NS SWEET GUAVA PLS 4PX40SX11G",
      "NS YUZU ORANGE PLS 4PX40SX11G"
    ],
    "priority": 15
  }
];
const BELI_FLAT = BELI_PRODUCTS.flatMap(g=>g.items);
const STOCK_PRODUCTS = [{"group":"HILO BOX","price":0,"items":["HI LO SCHOOL CHOCOLATE 12DX250G","HI LO SCHOOL CHOCOLATE 12DX500G","HI LO SCHOOL CHOCOLATE 6DX750G","HI LO SCHOOL VANILLA 12DX250G","HI LO SCHOOL VANILLA VEGIBERI 12DX500G","HI LO SCHOOL VANILLA VEGIBERI 6DX750G","HI LO SCHOOL HONEY 12DX250G","HI LO SCHOOL HONEY 12DX500G","HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G","HI LO SCHOOL BUBBLE GUM 12DX500G","HI LO SCHOOL COTTON CANDY 12DX500G","HI LO SCHOOL ORIGINAL 12DX12SX25G","HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G","HI LO SCHOOL SUSU VANILLA 8GUSX10SX35G","HI LO TEEN CHOCOLATE 12DX250G","HI LO TEEN CHOCOLATE 12DX500G","HI LO TEEN CHOCOLATE 6DX750G","HI LO TEEN VANILLA CARAMEL 12DX250G","HI LO TEEN VANILLA CARAMEL 12DX500G","HI LO TEEN VANILLA CARAMEL 6DX750G","HI LO TEEN KOREAN BANANA 12DX250G","HI LO TEEN POPCORN CARAMEL 12DX500G","HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G","HI LO TEEN HIPROTEIN MELON 12DX400G","HI LO ACTIVE CHOCOLATE 12DX250G","HI LO ACTIVE CHOCOLATE 12DX500G","HI LO ACTIVE CHOCOLATE 6DX750G","HI LO ACTIVE VANILLA 12DX200G","HI LO ACTIVE VANILLA 12DX500G","HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G","HI LO ACTIVE CLEAR PROTEIN PEACH 12PX8SX30G","HI LO ACTIVE POWERMELON 12DX7SX32G","HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G","HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G","HI LO PLATINUM ORIGINAL 12DX12SX30G","HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G","HI LO PLATINUM +HMB VANILLA 12DX8SX42G","HI LO PLATINUM +HMB CHOCO MOCHA 12DX8SX40G","HI LO GOLD ORIGINAL 12DX200G","HI LO GOLD ORIGINAL 12DX500G","HI LO GOLD ORIGINAL 6DX750G","HI LO GOLD CHOCOLATE 12DX250G","HI LO GOLD CHOCOLATE 12DX500G","HI LO GOLD CHOCOLATE 6DX750G","HI LO GOLD VANILLA 12DX200G","HI LO GOLD VANILLA 12DX500G","HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G"]},{"group":"TS NFDM","price":0,"items":["TS NFDM ORIGINAL 6DX1000G","TS NFDM FIBER PRO 6DX500G","TS NFDM CHOCOLATE 12DX500G","TS NFDM COFFEE 12DX500G"]},{"group":"TS DIABTX MILK","price":0,"items":["TS DIABTX MILK VANILLA MALT 12DX150G","TS DIABTX MILK VANILLA MALT 12DX500G"]},{"group":"TS LOW FAT MILK","price":0,"items":["TS LOW FAT MILK VANILLA 12DX180G","TS LOW FAT MILK VANILLA 12DX500G","TS LOW FAT MILK KOREAN STRAWBERRY 12DX500G"]},{"group":"LMEN BOX","price":0,"items":["L-MEN GAINMASS CHOCOLATE 12DX225G","L-MEN GAINMASS CHOCOLATE 6DX500G","L-MEN GAINMASS BANANA 12DX225G","L-MEN ADVANCE CAPPUCINO 12DX250G","L-MEN ADVANCE GOLD VANILLA 6DX500G","L-MEN ADVANCE CHOCO VANILLA 6DX500G","L-MEN DAILY CHOCOLATE 12DX250G","L-MEN PLANTPROTEIN OGURA 12DX216G","L-MEN ISOPOWER STARGIZING 6DX30SX7.8G","L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G","L-MEN PLATINUM BASIC UNFLAVOURED 6PCHX800G","L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G"]},{"group":"TS SWT","price":0,"items":["TS SWT CLASSIC IND 12PX125SX2.5G","TS SWT CLASSIC 12DX100SX2.5G","TS SWT CLASSIC 24DX50SX2.5G","TS SWT CLASSIC 24DX25SX2.5G","TS SWT CLASSIC REF 12DX250G","TS SWT CLASSIC REF 12DX500G","TS SWT CLASSIC REF 24DX100G","TS SWT DIABTX 12DX100SX1.8G","TS SWT DIABTX 24DX50SX1.8G","TS SWT DIABTX 12DX25SX1.8G","TS SWT DIABTX PLS 10PX80SX1.8G","TS SWT STEVIA 24DX50SX1.8G","TS SWT STEVIA 12DX100SX1.8G","TS SWT GULA AREN 24DX50SX2G","TS SWT LEMON 12DX25SX2.5G","TS SWT I SWEET 12DX25SX1.5G","TS SWT GULA BUAH 24DX50SX2.5G","TS DIABETAMIL SWT 24DX50SX1G","TS DIABETAMIL SWT PLS 10PX80SX1G"]},{"group":"RTD","price":0,"items":["HI LO SCHOOL RTD COKELAT 24TPKX200ML","HI LO SCHOOL RTD VEGIBERI 24TPKX200ML","HI LO TEEN RTD COKELAT 24TPKX200ML","HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML","HI LO DRINK RTD CHOCOFIT 24TPKX200ML","HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML","HI LO DRINK RTD CHOCOLATE TARO 24TPKX200ML","HI LO DRINK RTD PROTEIN BERRYFIT 24TPKX190ML","L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML","L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML","L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML","NS RTD JAMBU BIJI 24TPKX200ML","NS RTD JERUK MADU 24TPKX200ML","NS RTD SQUEEZED ORANGE 24TPKX200ML","TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML","TS RTD OAT DRINK CANTALOUPE MELON 24TPKX190ML","TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML","TS RTD ALMOND DRINK BANANA DELIGHT 24TPKX190ML","TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML"]},{"group":"TS SPREAD JAM","price":0,"items":["TS CHOCOLATE SPREAD 12BTLX300G","TS ROYAL MATCHA SPREAD 12BTLX300G","TS PEANUT ALMOND BUTTER 12BTLX300G","TS BALI ARTISAN SEA SALT 12BTLX300G","TS STRAWBERRY JAM 12BTLX375G"]},{"group":"TS COOKIES","price":0,"items":["TS COOKIES HOKKAIDO CHEESE 12DX5SX20G","TS COOKIES CHOCOLATE 12DX10SX20G","TS COOKIES KOREAN GARLIC BUTTER 12DX5SX20G","TS COOKIES KLEPON 12DX5SX20G","TS COOKIES KOREAN GOGUMA 12DX5SX20G","TS WAFER KOREAN STRAWBERRY CHEESE 12DX5SX20G"]},{"group":"TS COFFEE","price":0,"items":["TS CAFE LATTE 12DX10SX14G","TS WHITE COFFEE 12DX4SX15G","TS AVOCADO COFFEE 12DX4SX14G","TS MINT COCOA 12DX4SX15G","TS SWEET ORANGE 12DX10SX6G","TS DRIP COFFEE SEVILLE ORANGE 12DX4SX12G","TS SOY LATTE 12DX10SX15G"]},{"group":"TS GULA HONEY","price":0,"items":["TS HONEY 12BTLX350ML","TS GULA JAWA 12BTLX350ML","TS KENTAL MANIS 24BTLX150ML","TS SANTAN 24DX5SX20G"]},{"group":"TS COLLAGEN","price":0,"items":["TS COLLAGEN DRINK STRAWBERRY 12KLRX200G","TS COLLAGEN DRINK STRAWBERRY STICK 12DX6SX12G","TS 7 FRUITS FIBER DAILY 12DX12SX15G"]},{"group":"LMEN BAR SNACK","price":0,"items":["L-MEN PLATINUM NOODLE SEMUR DAGING 18BAGX56.5G","L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G","L-MEN PROTEIN BAR STRONGBERY 6SBX12SX20G","L-MEN PROTEIN CRUNCH BBQ BEEF 20BAGX20G","HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G"]},{"group":"TS BERAS","price":0,"items":["TS BERAS PORANG INSTAN 12PCHX1000G","TS BERAS PORANG INSTAN SACHET 12DX10SX40G","TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G","TS BERAS PORANG INSTAN NASI GORENG 12DX7SX38.5G","TS BERAS MERAH ORGANIK 12PCHX1000G","TS SHIRATAKI NOODLES 40OX71G"]},{"group":"TS OILS","price":0,"items":["TS CANOLA OIL 12BTLX946ML","TS CORN OIL 12BTLX946ML","TS CORN OIL REF 16PCHX1000ML","TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML","TS EXTRA LIGHT OLIVE OIL 12BTLX500ML","TS SUNFLOWER OIL 12BTLX946ML","TS SOY SAUCE 24BTLX200ML","TS SALTY SOY SAUCE 24BTLX200ML","TS SAUS TIRAM 24BTLX200ML","TS MAYO ROASTED SESAME 24BTLX200ML","TS BUMBU KALDU AYAM JAMUR 24PX100G","TS SYRUP COCOPANDAN 12BTLX750ML","TS SYRUP LYCHEE 12BTLX750ML","TS SYRUP ORANGE 12BTLX750ML"]},{"group":"NS","price":11250,"items":["NS AMERICAN SWEET ORANGE PLS 18PX40SX14G","NS JERUK PERAS PLS 18PX40SX14G","NS FLORIDA ORANGE PLS 18PX40SX11G","NS LEMON TEA PLS 4PX40SX11G","NS LYCHEE TEA PLS 4PX40SX11G","NS ORANGE TEA PLS 4PX40SX11G","NS APPLE TEA PLS 4PX40SX11G","NS BLACKCURRANT TEA PLS 4PX40SX11G","NS PEACH TEA PLS 4PX40SX11G","NS SWEET MANGO PLS 4PX40SX11G","NS MARKISA PLS 4PX40SX11G","NS ANGGUR PLS 4PX40SX11G","NS ANGGUR HIJAU PLS 4PX40SX11G","NS JERUK (EX) MANIS PLS 4PX40SX11G","NS MILKY ORANGE PLS 4PX40SX11G","NS MILKY PEACH PLS 4PX40SX11G","NS APEL JERUK PLS 4PX40SX11G","NS BLEWAH PLS 4PX40SX11G","NS COCOPANDAN PLS 4PX40SX11G","NS ES CINCAU PLS 4PX40SX11G","NS ES RUJAK PLS 4PX40SX11G","NS ISOTONIK REFRESHING CITRUS PLS 4PX40SX11G","NS JERUK JEJU PLS 4PX40SX11G","NS JERUK MANADO PLS 4PX40SX11G","NS JERUK MAROKO PLS 4PX40SX11G","NS JERUK NIPIS PLS 4PX40SX11G","NS KELAPA MUDA PLS 4PX40SX11G","NS LECI PLS 4PX40SX11G","NS LESS SUGAR BELIMBING PLS 4PX40SX6G","NS LESS SUGAR JERUK BALI PLS 4PX40SX6G","NS LESS SUGAR JERUK PONTIANAK PLS 4PX40SX6G","NS LESS SUGAR JERUK SONKIT PLS 4PX40SX6G","NS MADU JERUK PLS 4PX40SX11G","NS MADU LEMON PLS 4PX40SX11G","NS MANGGA GANDARIA PLS 4PX40SX11G","NS MELON PLS 4PX40SX11G","NS NANAS PLS 4PX40SX11G","NS SEMANGKA PLS 4PX40SX11G","NS SIRSAK PLS 4PX40SX11G","NS STRAWBERRY PLS 4PX40SX11G","NS SWEET GUAVA PLS 4PX40SX11G","NS YUZU ORANGE PLS 4PX40SX11G","NS JERUK MANIS REF 12DX250G","NS JERUK MANIS REF 12DX500G","NS JERUK PERAS REF 12BAGX500G","NS PREMIUM JUS MANGGA PLS 12RX10SX15G","NS PREMIUM JUS MANGGA REF PLS 12BAGX420G","NS LYCHEE TEA REF PLS 12BAGX400G","NS AMERICAN SWEET ORANGE FC 72OX10SX14G","NS FLORIDA ORANGE FC 72OX10SX11G","NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G","NS JERUK JEJU FC 72OX10SX11G","NS JERUK NIPIS 72OX10SX11G","NS JERUK PERAS 72GUSX5SX14G","NS JERUK PERAS FC 72OX10SX14G","NS LOKALATE KOPI ALPUKAT PLS 12RX10SX15G","NS LOKALATE KOPI GULA AREN PLS 12RX10SX15G","NS LOKALATE KOPI SHOWBERRY 24DX4SX15G","NS W'DANK BAJIGUR 24DX4SX15G","NS W'DANK BAJIGUR PLS 12RX10SX15G","NS W'DANK BANDREK PLS 12RX10SX15G","NS W'DANK JAHE KAYU MANIS 24DX4SX15G","NS W'DANK SEREH JAHE NIPIS PLS 12RX10SX11G"]},{"group":"HILO DRINK PLS","price":16000,"items":["HI LO 3IN1 SUSU COKLAT BELGIA PLS 12RX10SX25G","HI LO DRINK CHOCO MALT PLS 8RX10SX14G","HI LO DRINK SWISS CHOCOLATE PLS 8RX10SX28G","HI LO DRINK CHOCO HAZELNUT PLS 15RX10SX14G","HI LO DRINK THAI TEA PLS 8RX10SX15G","HI LO DRINK TEH TARIK PLS 8RX10SX15G","HI LO DRINK CHOCOLATE PLS 15RX10SX14G","HI LO DRINK CREAMY MARIE PLS 15RX10SX14G","HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G","HI LO DRINK AVOCADO CHOCOLATE PLS 15RX10SX14G","HI LO DRINK CHOCOLATE BANANA PLS 15RX10SX14G","HI LO DRINK CHOCOLATE TARO PLS 15RX10SX14G","HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G","HI LO DRINK ES KETAN HITAM PLS 8RX10SX14G"]},{"group":"HILO SCHOOL PLS","price":31500,"items":["HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G","HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G","HI LO SCHOOL STRAWBERRY PLS 12RX10SX27G"]}];
const STOCK_PRICE = {"HILO BOX":0,"TS NFDM":0,"TS DIABTX MILK":0,"TS LOW FAT MILK":0,"LMEN BOX":0,"TS SWT":0,"RTD":0,"TS SPREAD JAM":0,"TS COOKIES":0,"TS COFFEE":0,"TS GULA HONEY":0,"TS COLLAGEN":0,"LMEN BAR SNACK":0,"TS BERAS":0,"TS OILS":0,"NS":11250,"HILO DRINK PLS":16000,"HILO SCHOOL PLS":31500};
const ITEM_PRICE = {"TS EXTRA LIGHT OLIVE OIL 12BTLX500ML":{"ctn":1500000,"ratio":12,"pcs":125000},"TS BERAS PORANG INSTAN 12PCHX1000G":{"ctn":2112000,"ratio":12,"pcs":176000},"TS BERAS PORANG INSTAN SACHET 12DX10SX40G":{"ctn":780000,"ratio":12,"pcs":65000},"TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML":{"ctn":1656000,"ratio":12,"pcs":138000},"TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G":{"ctn":780000,"ratio":12,"pcs":65000},"TS CANOLA OIL 12BTLX946ML":{"ctn":840000,"ratio":12,"pcs":70000},"TS SWT CLASSIC IND 12PX125SX2.5G":{"ctn":900000,"ratio":12,"pcs":75000},"HI LO PLATINUM ORIGINAL 12DX12SX30G":{"ctn":1272000,"ratio":12,"pcs":106000},"TS SWT DIABTX 12DX100SX1.8G":{"ctn":936000,"ratio":12,"pcs":78000},"HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G":{"ctn":1080000,"ratio":12,"pcs":90000},"TS CORN OIL 12BTLX946ML":{"ctn":1080000,"ratio":12,"pcs":90000},"TS CORN OIL REF 16PCHX1000ML":{"ctn":1520000,"ratio":16,"pcs":95000},"TS SWT CLASSIC 12DX100SX2.5G":{"ctn":912000,"ratio":12,"pcs":76000},"TS BERAS MERAH ORGANIK 12PCHX1000G":{"ctn":528000,"ratio":12,"pcs":44000},"TS SWT CLASSIC 24DX50SX2.5G":{"ctn":960000,"ratio":24,"pcs":40000},"TS SOY SAUCE 24BTLX200ML":{"ctn":636000,"ratio":24,"pcs":26500},"TS HONEY 12BTLX350ML":{"ctn":744000,"ratio":12,"pcs":62000},"TS COOKIES HOKKAIDO CHEESE 12DX5SX20G":{"ctn":276000,"ratio":12,"pcs":23000},"TS CHOCOLATE SPREAD 12BTLX300G":{"ctn":1056000,"ratio":12,"pcs":88000},"HI LO PLATINUM +HMB VANILLA 12DX8SX42G":{"ctn":1500000,"ratio":12,"pcs":125000},"TS SUNFLOWER OIL 12BTLX946ML":{"ctn":912000,"ratio":12,"pcs":76000},"HI LO SCHOOL VANILLA 12DX250G":{"ctn":480000,"ratio":12,"pcs":40000},"TS SWT DIABTX 24DX50SX1.8G":{"ctn":1008000,"ratio":24,"pcs":42000},"TS NFDM FIBER PRO 6DX500G":{"ctn":624000,"ratio":6,"pcs":104000},"HI LO TEEN CHOCOLATE 12DX500G":{"ctn":960000,"ratio":12,"pcs":80000},"TS PEANUT ALMOND BUTTER 12BTLX300G":{"ctn":816000,"ratio":12,"pcs":68000},"TS STRAWBERRY JAM 12BTLX375G":{"ctn":816000,"ratio":12,"pcs":68000},"TS SWT STEVIA 24DX50SX1.8G":{"ctn":1416000,"ratio":24,"pcs":59000},"HI LO TEEN CHOCOLATE 6DX750G":{"ctn":696000,"ratio":6,"pcs":116000},"HI LO SCHOOL CHOCOLATE 12DX500G":{"ctn":924000,"ratio":12,"pcs":77000},"HI LO GOLD ORIGINAL 6DX750G":{"ctn":702000,"ratio":6,"pcs":117000},"HI LO SCHOOL CHOCOLATE 6DX750G":{"ctn":684000,"ratio":6,"pcs":114000},"L-MEN PLATINUM BASIC UNFLAVOURED 6PCHX800G":{"ctn":1980000,"ratio":6,"pcs":330000},"TS GULA JAWA 12BTLX350ML":{"ctn":708000,"ratio":12,"pcs":59000},"TS COLLAGEN DRINK STRAWBERRY 12KLRX200G":{"ctn":1980000,"ratio":12,"pcs":165000},"NS AMERICAN SWEET ORANGE PLS 18PX40SX14G":{"ctn":810000,"ratio":72,"pcs":11250},"TS KENTAL MANIS 24BTLX150ML":{"ctn":744000,"ratio":24,"pcs":31000},"HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G":{"ctn":378000,"ratio":12,"pcs":31500},"TS NFDM ORIGINAL 6DX1000G":{"ctn":1104000,"ratio":6,"pcs":184000},"TS NFDM COFFEE 12DX500G":{"ctn":1248000,"ratio":12,"pcs":104000},"HI LO TEEN VANILLA CARAMEL 6DX750G":{"ctn":696000,"ratio":6,"pcs":116000},"NS JERUK PERAS PLS 18PX40SX14G":{"ctn":810000,"ratio":72,"pcs":11250},"HI LO TEEN VANILLA CARAMEL 12DX500G":{"ctn":960000,"ratio":12,"pcs":80000},"TS LOW FAT MILK VANILLA 12DX500G":{"ctn":936000,"ratio":12,"pcs":78000},"TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML":{"ctn":180000,"ratio":24,"pcs":7500},"TS 7 FRUITS FIBER DAILY 12DX12SX15G":{"ctn":1224000,"ratio":12,"pcs":102000},"HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G":{"ctn":378000,"ratio":12,"pcs":31500},"L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML":{"ctn":276000,"ratio":24,"pcs":11500},"TS DIABETAMIL SWT 24DX50SX1G":{"ctn":552000,"ratio":24,"pcs":23000},"NS LEMON TEA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"TS ROYAL MATCHA SPREAD 12BTLX300G":{"ctn":1080000,"ratio":12,"pcs":90000},"HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G":{"ctn":924000,"ratio":12,"pcs":77000},"TS COOKIES CHOCOLATE 12DX10SX20G":{"ctn":540000,"ratio":12,"pcs":45000},"HI LO SCHOOL HONEY 12DX500G":{"ctn":924000,"ratio":12,"pcs":77000},"TS SWT CLASSIC 24DX25SX2.5G":{"ctn":528000,"ratio":24,"pcs":22000},"HI LO PLATINUM +HMB CHOCO MOCHA 12DX8SX40G":{"ctn":1500000,"ratio":12,"pcs":125000},"L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G":{"ctn":720000,"ratio":6,"pcs":120000},"TS CAFE LATTE 12DX10SX14G":{"ctn":336000,"ratio":12,"pcs":28000},"HI LO SCHOOL SUSU VANILLA 8GUSX10SX35G":{"ctn":384000,"ratio":8,"pcs":48000},"TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML":{"ctn":199200,"ratio":24,"pcs":8300},"HI LO ACTIVE CHOCOLATE 6DX750G":{"ctn":630000,"ratio":6,"pcs":105000},"TS NFDM CHOCOLATE 12DX500G":{"ctn":1248000,"ratio":12,"pcs":104000},"TS SWT DIABTX 12DX25SX1.8G":{"ctn":276000,"ratio":12,"pcs":23000},"TS DIABTX MILK VANILLA MALT 12DX500G":{"ctn":1236000,"ratio":12,"pcs":103000},"NS MARKISA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS LYCHEE TEA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G":{"ctn":792000,"ratio":6,"pcs":132000},"NS BLACKCURRANT TEA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"HI LO ACTIVE CHOCOLATE 12DX500G":{"ctn":900000,"ratio":12,"pcs":75000},"TS BUMBU KALDU AYAM JAMUR 24PX100G":{"ctn":552000,"ratio":24,"pcs":23000},"NS SWEET MANGO PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G":{"ctn":1440000,"ratio":12,"pcs":120000},"L-MEN ADVANCE GOLD VANILLA 6DX500G":{"ctn":1080000,"ratio":6,"pcs":180000},"TS WHITE COFFEE 12DX4SX15G":{"ctn":216000,"ratio":12,"pcs":18000},"NS JERUK MANIS REF 12DX500G":{"ctn":420000,"ratio":12,"pcs":35000},"L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G":{"ctn":690000,"ratio":72,"pcs":9583},"HI LO SCHOOL VANILLA VEGIBERI 6DX750G":{"ctn":684000,"ratio":6,"pcs":114000},"TS SANTAN 24DX5SX20G":{"ctn":456000,"ratio":24,"pcs":19000},"NS JERUK (EX) MANIS PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML":{"ctn":276000,"ratio":24,"pcs":11500},"HI LO GOLD CHOCOLATE 12DX500G":{"ctn":960000,"ratio":12,"pcs":80000},"TS COOKIES KOREAN GARLIC BUTTER 12DX5SX20G":{"ctn":276000,"ratio":12,"pcs":23000},"HI LO SCHOOL VANILLA VEGIBERI 12DX500G":{"ctn":924000,"ratio":12,"pcs":77000},"TS WAFER KOREAN STRAWBERRY CHEESE 12DX5SX20G":{"ctn":264000,"ratio":12,"pcs":22000},"L-MEN GAINMASS CHOCOLATE 6DX500G":{"ctn":912000,"ratio":6,"pcs":152000},"L-MEN GAINMASS CHOCOLATE 12DX225G":{"ctn":900000,"ratio":12,"pcs":75000},"TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML":{"ctn":180000,"ratio":24,"pcs":7500},"TS SYRUP COCOPANDAN 12BTLX750ML":{"ctn":360000,"ratio":12,"pcs":30000},"NS ANGGUR PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"HI LO ACTIVE VANILLA 12DX500G":{"ctn":900000,"ratio":12,"pcs":75000},"TS SYRUP LYCHEE 12BTLX750ML":{"ctn":360000,"ratio":12,"pcs":30000},"NS PREMIUM JUS MANGGA PLS 12RX10SX15G":{"ctn":192000,"ratio":12,"pcs":16000},"TS AVOCADO COFFEE 12DX4SX14G":{"ctn":192000,"ratio":12,"pcs":16000},"TS SWT CLASSIC REF 24DX100G":{"ctn":672000,"ratio":24,"pcs":28000},"TS COOKIES KLEPON 12DX5SX20G":{"ctn":276000,"ratio":12,"pcs":23000},"TS COOKIES KOREAN GOGUMA 12DX5SX20G":{"ctn":276000,"ratio":12,"pcs":23000},"NS W'DANK SEREH JAHE NIPIS PLS 12RX10SX11G":{"ctn":192000,"ratio":12,"pcs":16000},"HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G":{"ctn":384000,"ratio":8,"pcs":48000},"HI LO TEEN CHOCOLATE 12DX250G":{"ctn":504000,"ratio":12,"pcs":42000},"HI LO TEEN VANILLA CARAMEL 12DX250G":{"ctn":504000,"ratio":12,"pcs":42000},"HI LO ACTIVE CLEAR PROTEIN PEACH 12PX8SX30G":{"ctn":1500000,"ratio":12,"pcs":125000},"TS SWT GULA AREN 24DX50SX2G":{"ctn":972000,"ratio":24,"pcs":40500},"NS PEACH TEA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS JERUK MANIS REF 12DX250G":{"ctn":240000,"ratio":12,"pcs":20000},"TS COLLAGEN DRINK STRAWBERRY STICK 12DX6SX12G":{"ctn":720000,"ratio":12,"pcs":60000},"TS SAUS TIRAM 24BTLX200ML":{"ctn":720000,"ratio":24,"pcs":30000},"HI LO SCHOOL CHOCOLATE 12DX250G":{"ctn":468000,"ratio":12,"pcs":39000},"TS SYRUP ORANGE 12BTLX750ML":{"ctn":360000,"ratio":12,"pcs":30000},"TS LOW FAT MILK KOREAN STRAWBERRY 12DX500G":{"ctn":936000,"ratio":12,"pcs":78000},"L-MEN PROTEIN BAR STRONGBERY 6SBX12SX20G":{"ctn":690000,"ratio":72,"pcs":9583},"HI LO DRINK RTD CHOCOFIT 24TPKX200ML":{"ctn":264000,"ratio":24,"pcs":11000},"NS RTD JAMBU BIJI 24TPKX200ML":{"ctn":141600,"ratio":24,"pcs":5900},"HI LO DRINK CHOCO MALT PLS 8RX10SX14G":{"ctn":128000,"ratio":8,"pcs":16000},"NS JERUK PERAS REF 12BAGX500G":{"ctn":420000,"ratio":12,"pcs":35000},"HI LO ACTIVE VANILLA 12DX200G":{"ctn":408000,"ratio":12,"pcs":34000},"TS SWT CLASSIC REF 12DX500G":{"ctn":1212000,"ratio":12,"pcs":101000},"TS RTD ALMOND DRINK BANANA DELIGHT 24TPKX190ML":{"ctn":199200,"ratio":24,"pcs":8300},"TS SALTY SOY SAUCE 24BTLX200ML":{"ctn":588000,"ratio":24,"pcs":24500},"HI LO SCHOOL BUBBLE GUM 12DX500G":{"ctn":924000,"ratio":12,"pcs":77000},"HI LO 3IN1 SUSU COKLAT BELGIA PLS 12RX10SX25G":{"ctn":378000,"ratio":12,"pcs":31500},"HI LO SCHOOL STRAWBERRY PLS 12RX10SX27G":{"ctn":378000,"ratio":12,"pcs":31500},"HI LO SCHOOL RTD COKELAT 24TPKX200ML":{"ctn":163200,"ratio":24,"pcs":6800},"NS RTD JERUK MADU 24TPKX200ML":{"ctn":141600,"ratio":24,"pcs":5900},"NS APPLE TEA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS ORANGE TEA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS JERUK NIPIS PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"TS LOW FAT MILK VANILLA 12DX180G":{"ctn":420000,"ratio":12,"pcs":35000},"TS DIABTX MILK VANILLA MALT 12DX150G":{"ctn":414000,"ratio":12,"pcs":34500},"HI LO DRINK SWISS CHOCOLATE PLS 8RX10SX28G":{"ctn":152000,"ratio":8,"pcs":19000},"TS MINT COCOA 12DX4SX15G":{"ctn":204000,"ratio":12,"pcs":17000},"NS LOKALATE KOPI GULA AREN PLS 12RX10SX15G":{"ctn":192000,"ratio":12,"pcs":16000},"HI LO TEEN HIPROTEIN MELON 12DX400G":{"ctn":960000,"ratio":12,"pcs":80000},"HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G":{"ctn":960000,"ratio":12,"pcs":80000},"L-MEN ADVANCE CHOCO VANILLA 6DX500G":{"ctn":960000,"ratio":6,"pcs":160000},"HI LO GOLD ORIGINAL 12DX500G":{"ctn":936000,"ratio":12,"pcs":78000},"HI LO ACTIVE POWERMELON 12DX7SX32G":{"ctn":936000,"ratio":12,"pcs":78000},"HI LO SCHOOL COTTON CANDY 12DX500G":{"ctn":924000,"ratio":12,"pcs":77000},"NS SEMANGKA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"TS BALI ARTISAN SEA SALT 12BTLX300G":{"ctn":600000,"ratio":12,"pcs":50000},"L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML":{"ctn":288000,"ratio":24,"pcs":12000},"NS W'DANK JAHE KAYU MANIS 24DX4SX15G":{"ctn":288000,"ratio":24,"pcs":12000},"NS RTD SQUEEZED ORANGE 24TPKX200ML":{"ctn":141600,"ratio":24,"pcs":5900},"HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G":{"ctn":424000,"ratio":8,"pcs":53000},"NS FLORIDA ORANGE PLS 18PX40SX11G":{"ctn":810000,"ratio":72,"pcs":11250},"NS MILKY ORANGE PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS LESS SUGAR JERUK PONTIANAK PLS 4PX40SX6G":{"ctn":180000,"ratio":16,"pcs":11250},"NS MELON PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"TS RTD OAT DRINK CANTALOUPE MELON 24TPKX190ML":{"ctn":180000,"ratio":24,"pcs":7500},"HI LO DRINK CHOCO HAZELNUT PLS 15RX10SX14G":{"ctn":240000,"ratio":15,"pcs":16000},"L-MEN DAILY CHOCOLATE 12DX250G":{"ctn":708000,"ratio":12,"pcs":59000},"HI LO GOLD CHOCOLATE 6DX750G":{"ctn":702000,"ratio":6,"pcs":117000},"TS SWEET ORANGE 12DX10SX6G":{"ctn":234000,"ratio":12,"pcs":19500},"TS SWT CLASSIC REF 12DX250G":{"ctn":696000,"ratio":12,"pcs":58000},"TS DRIP COFFEE SEVILLE ORANGE 12DX4SX12G":{"ctn":660000,"ratio":12,"pcs":55000},"HI LO TEEN RTD COKELAT 24TPKX200ML":{"ctn":163200,"ratio":24,"pcs":6800},"L-MEN ISOPOWER STARGIZING 6DX30SX7.8G":{"ctn":618000,"ratio":6,"pcs":103000},"L-MEN ADVANCE CAPPUCINO 12DX250G":{"ctn":1056000,"ratio":12,"pcs":88000},"HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G":{"ctn":600000,"ratio":12,"pcs":50000},"NS LOKALATE KOPI ALPUKAT PLS 12RX10SX15G":{"ctn":192000,"ratio":12,"pcs":16000},"HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G":{"ctn":315000,"ratio":14,"pcs":22500},"TS SWT LEMON 12DX25SX2.5G":{"ctn":288000,"ratio":12,"pcs":24000},"NS LECI PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS MADU LEMON PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS JERUK MAROKO PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"HI LO DRINK THAI TEA PLS 8RX10SX15G":{"ctn":128000,"ratio":8,"pcs":16000},"HI LO GOLD CHOCOLATE 12DX250G":{"ctn":504000,"ratio":12,"pcs":42000},"HI LO TEEN KOREAN BANANA 12DX250G":{"ctn":504000,"ratio":12,"pcs":42000},"HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML":{"ctn":163200,"ratio":24,"pcs":6800},"HI LO DRINK CHOCOLATE PLS 15RX10SX14G":{"ctn":240000,"ratio":15,"pcs":16000},"HI LO DRINK CREAMY MARIE PLS 15RX10SX14G":{"ctn":240000,"ratio":15,"pcs":16000},"NS AMERICAN SWEET ORANGE FC 72OX10SX14G":{"ctn":936000,"ratio":72,"pcs":13000},"NS FLORIDA ORANGE FC 72OX10SX11G":{"ctn":936000,"ratio":72,"pcs":13000},"NS JERUK NIPIS 72OX10SX11G":{"ctn":936000,"ratio":72,"pcs":13000},"HI LO ACTIVE CHOCOLATE 12DX250G":{"ctn":456000,"ratio":12,"pcs":38000},"HI LO GOLD VANILLA 12DX500G":{"ctn":936000,"ratio":12,"pcs":78000},"HI LO GOLD VANILLA 12DX200G":{"ctn":444000,"ratio":12,"pcs":37000},"NS W'DANK BAJIGUR 24DX4SX15G":{"ctn":288000,"ratio":24,"pcs":12000},"NS KELAPA MUDA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS LESS SUGAR JERUK SONKIT PLS 4PX40SX6G":{"ctn":180000,"ratio":16,"pcs":11250},"NS NANAS PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS SIRSAK PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS SWEET GUAVA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS ANGGUR HIJAU PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML":{"ctn":163200,"ratio":24,"pcs":6800},"NS JERUK JEJU FC 72OX10SX11G":{"ctn":1152000,"ratio":72,"pcs":16000},"TS SWT I SWEET 12DX25SX1.5G":{"ctn":288000,"ratio":12,"pcs":24000},"HI LO DRINK TEH TARIK PLS 8RX10SX15G":{"ctn":128000,"ratio":8,"pcs":16000},"L-MEN PROTEIN CRUNCH BBQ BEEF 20BAGX20G":{"ctn":250000,"ratio":20,"pcs":12500},"HI LO DRINK CHOCOLATE BANANA PLS 15RX10SX14G":{"ctn":240000,"ratio":15,"pcs":16000},"HI LO DRINK CHOCOLATE TARO PLS 15RX10SX14G":{"ctn":240000,"ratio":15,"pcs":16000},"HI LO GOLD ORIGINAL 12DX200G":{"ctn":444000,"ratio":12,"pcs":37000},"HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G":{"ctn":240000,"ratio":15,"pcs":16000},"HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G":{"ctn":220000,"ratio":8,"pcs":27500},"NS JERUK PERAS 72GUSX5SX14G":{"ctn":590400,"ratio":72,"pcs":8200},"NS MANGGA GANDARIA PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS COCOPANDAN PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS STRAWBERRY PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS BLEWAH PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS LOKALATE KOPI SHOWBERRY 24DX4SX15G":{"ctn":288000,"ratio":24,"pcs":12000},"NS MADU JERUK PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G":{"ctn":936000,"ratio":72,"pcs":13000},"NS APEL JERUK PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"HI LO SCHOOL RTD VEGIBERI 24TPKX200ML":{"ctn":163200,"ratio":24,"pcs":6800},"HI LO DRINK RTD CHOCOLATE TARO 24TPKX200ML":{"ctn":141600,"ratio":24,"pcs":5900},"TS SWT GULA BUAH 24DX50SX2.5G":{"ctn":984000,"ratio":24,"pcs":41000},"HI LO DRINK RTD PROTEIN BERRYFIT 24TPKX190ML":{"ctn":264000,"ratio":24,"pcs":11000},"TS SHIRATAKI NOODLES 40OX71G":{"ctn":740000,"ratio":40,"pcs":18500},"NS JERUK JEJU PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS YUZU ORANGE PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"HI LO SCHOOL HONEY 12DX250G":{"ctn":480000,"ratio":12,"pcs":40000},"HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G":{"ctn":136000,"ratio":8,"pcs":17000},"HI LO DRINK AVOCADO CHOCOLATE PLS 15RX10SX14G":{"ctn":240000,"ratio":15,"pcs":16000},"HI LO DRINK ES KETAN HITAM PLS 8RX10SX14G":{"ctn":128000,"ratio":8,"pcs":16000},"HI LO SCHOOL ORIGINAL 12DX12SX25G":{"ctn":924000,"ratio":12,"pcs":77000},"HI LO TEEN POPCORN CARAMEL 12DX500G":{"ctn":960000,"ratio":12,"pcs":80000},"L-MEN GAINMASS BANANA 12DX225G":{"ctn":900000,"ratio":12,"pcs":75000},"L-MEN PLANTPROTEIN OGURA 12DX216G":{"ctn":1200000,"ratio":12,"pcs":100000},"L-MEN PLATINUM NOODLE SEMUR DAGING 18BAGX56.5G":{"ctn":405000,"ratio":18,"pcs":22500},"NS ISOTONIK REFRESHING CITRUS PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS JERUK PERAS FC 72OX10SX14G":{"ctn":792000,"ratio":72,"pcs":11000},"NS LESS SUGAR BELIMBING PLS 4PX40SX6G":{"ctn":180000,"ratio":16,"pcs":11250},"NS LYCHEE TEA REF PLS 12BAGX400G":{"ctn":402000,"ratio":12,"pcs":33500},"NS MILKY PEACH PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS PREMIUM JUS MANGGA REF PLS 12BAGX420G":{"ctn":456000,"ratio":12,"pcs":38000},"NS W'DANK BAJIGUR PLS 12RX10SX15G":{"ctn":192000,"ratio":12,"pcs":16000},"NS W'DANK BANDREK PLS 12RX10SX15G":{"ctn":192000,"ratio":12,"pcs":16000},"NS ES CINCAU PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS ES RUJAK PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"NS LESS SUGAR JERUK BALI PLS 4PX40SX6G":{"ctn":180000,"ratio":16,"pcs":11250},"NS JERUK MANADO PLS 4PX40SX11G":{"ctn":180000,"ratio":16,"pcs":11250},"TS SWT DIABTX PLS 10PX80SX1.8G":{"ctn":530000,"ratio":10,"pcs":53000},"TS DIABETAMIL SWT PLS 10PX80SX1G":{"ctn":300000,"ratio":10,"pcs":30000},"TS BERAS PORANG INSTAN NASI GORENG 12DX7SX38.5G":{"ctn":780000,"ratio":12,"pcs":65000},"TS MAYO ROASTED SESAME 24BTLX200ML":{"ctn":588000,"ratio":24,"pcs":24500},"TS SOY LATTE 12DX10SX15G":{"ctn":480000,"ratio":12,"pcs":40000},"TS SWT STEVIA 12DX100SX1.8G":{"ctn":1296000,"ratio":12,"pcs":108000}};
/* ─────────── SCREEN ─────────── */
function showScreen(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}
function goHome(){ showScreen('s-home'); }
function openMod(m){
  showScreen('s-'+m);
  m==='rka' ? initRka() : initBeli();
}

/* ─────────── HOME INIT ─────────── */
(function(){
  const d=new Date();
  const days=['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const mos=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Ags','Sep','Okt','Nov','Des'];
  document.getElementById('home-date').textContent=
    `${days[d.getDay()]}, ${d.getDate()} ${mos[d.getMonth()]} ${d.getFullYear()}`;
})();

/* ═══════════════════════════════════════
   VISIT RKA
═══════════════════════════════════════ */
function initRka(){
  const as=document.getElementById('rka-area-sel');
  as.innerHTML='<option value="">— Pilih Area —</option>';
  AREAS.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; as.appendChild(o); });

  document.getElementById('rka-mds-sel').innerHTML='<option value="">— Pilih Area dulu —</option>';
  document.getElementById('rka-store-sel').innerHTML='<option value="">— Pilih Toko —</option>';

  rkaGoTo(0);
}

function rkaFillMds(){
  const area=document.getElementById('rka-area-sel').value;
  const ms=document.getElementById('rka-mds-sel');
  ms.innerHTML='<option value="">— Pilih MDS —</option>';
  (MDS_BY_AREA[area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ms.appendChild(o); });
  if(!area) ms.innerHTML='<option value="">— Pilih Area dulu —</option>';
  rkaCheck(0);
}

function rkaFillStore(){
  const area=R.area||document.getElementById('rka-area-sel').value;
  const ss=document.getElementById('rka-store-sel');
  ss.innerHTML='<option value="">— Pilih Toko —</option>';
  (STORES_BY_AREA[area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ss.appendChild(o); });
}

function rkaGoTo(step){
  R.step=step;
  // stepper
  for(let i=0;i<4;i++){
    const el=document.getElementById('rs'+i);
    el.className='s-item'+(i<step?' done':i===step?' active':'');
    el.querySelector('.s-dot').textContent=i<step?'✓':(i+1);
  }
  // sections
  document.querySelectorAll('#s-rka .step-section').forEach((s,i)=>s.classList.toggle('active',i===step));
  // back btn
  document.getElementById('rka-bb').style.display=step===0?'none':'';
  // next label
  document.getElementById('rka-nb').textContent=step===3?'Submit':'Lanjut';
  // items init
  if(step===1){ rkaFillStore(); }
  if(step===2){
    const s=(R.store||'').toUpperCase();
    const isRtd=s.includes('MIDI')||s.includes('HYPERMART')||s.includes('GELAEL');
    const lbls=document.querySelectorAll('#rka-s2 .nota-lbl');
    const lbl=lbls[lbls.length-1];
    if(lbl)lbl.textContent='3. Foto Pajangan '+(isRtd?'RTD':'NS DAN HILO POLOS');
  }
  if(step===3){ renderItems(); document.getElementById('rka-store-chip').textContent=R.store; }
  rkaCheck(step);
}

function rkaCheck(step){
  let ok=false;
  if(step===0){
    const area=document.getElementById('rka-area-sel').value;
    const sel=document.getElementById('rka-mds-sel').value;
    const box=document.getElementById('rka-mds-box');
    const nw=document.getElementById('rka-mds-new').value.trim();
    ok=area!==''&&(sel!==''||(box.classList.contains('open')&&nw!==''));
  } else if(step===1){
    const sel=document.getElementById('rka-store-sel').value;
    const box=document.getElementById('rka-store-box');
    const nw=document.getElementById('rka-store-new').value.trim();
    ok=sel!==''||(box.classList.contains('open')&&nw!=='');
  } else if(step===2){
    const taken=Object.values(R.photos).filter(v=>v!==null).length;
    const done=Object.keys(R.uploadsDone).length;
    ok=taken===3&&done===taken;
  } else if(step===3){
    const checked=Object.values(R.items).filter(v=>v!==null).length;
    ok=(checked===getStoreItems().length);
    document.getElementById('rka-cnt').textContent=
      `${checked} / ${getStoreItems().length} diperiksa`;
  }
  document.getElementById('rka-nb').disabled=!ok;
}

function rkaNext(){
  if(R.step===0){
    R.area=document.getElementById('rka-area-sel').value;
    const sel=document.getElementById('rka-mds-sel').value;
    const nw=canonicalMds(R.area,document.getElementById('rka-mds-new').value);
    R.mds=sel||nw;
    if(nw&&!sel){
      if(!MDS_BY_AREA[R.area]) MDS_BY_AREA[R.area]=[];
      if(!MDS_BY_AREA[R.area].some(m=>_sameName(m,nw))) MDS_BY_AREA[R.area].push(nw);
    }
  }
  if(R.step===1){
    const sel=document.getElementById('rka-store-sel').value;
    const box=document.getElementById('rka-store-box');
    const nw=canonicalStore(R.area,document.getElementById('rka-store-new').value);
    if(box.classList.contains('open')&&nw){
      R.store=nw;
      if(!STORES_BY_AREA[R.area].some(s=>_sameName(s,nw))){ saveCustomStore(R.area,nw); const o=document.createElement('option'); o.value=nw; o.textContent=nw; document.getElementById('rka-store-sel').appendChild(o); }
    } else { R.store=sel; }
  }
  if(R.step===3){ submitRka(); return; }
  rkaGoTo(R.step+1);
  document.getElementById('rka-wrap').scrollTop=0;
}
function rkaBack(){
  if(R.step>0){ rkaGoTo(R.step-1); document.getElementById('rka-wrap').scrollTop=0; }
}

function renderItems(){
  const list=document.getElementById('rka-items');
  list.innerHTML='';
  const ITEMS=getStoreItems();
  if(!ITEMS.length){
    list.innerHTML='<div style="padding:32px 16px;text-align:center;color:rgba(255,255,255,.3);font-size:13px">Tidak ada item untuk toko ini.</div>';
    rkaCheck(3); return;
  }
  ITEMS.forEach((item,i)=>{
    const st=R.items[i];
    const row=document.createElement('div');
    row.className='item-row'+(st!==undefined&&st!==null?' ok':'');
    row.id='irow'+i;
    row.innerHTML=`
      <div class="item-name">${item}</div>
      <div class="tgl-grp">
        <button class="tgl avail${st===true?' on':''}" onclick="setItem(${i},true)">Ada</button>
        <button class="tgl notavail${st===false?' on':''}" onclick="setItem(${i},false)">Tdk</button>
      </div>`;
    list.appendChild(row);
  });
  rkaCheck(3);
}

function setItem(i,v){
  R.items[i]=v;
  const row=document.getElementById('irow'+i);
  row.classList.add('ok');
  row.querySelectorAll('.tgl')[0].classList.toggle('on',v===true);
  row.querySelectorAll('.tgl')[1].classList.toggle('on',v===false);
  rkaCheck(3);
}

async function submitRka(){
  const avail=Object.values(R.items).filter(v=>v===true).length;
  const unavail=Object.values(R.items).filter(v=>v===false).length;
  const id='VISIT-'+String(Math.floor(Math.random()*9000)+1000);
  const now=new Date();
  const ds=now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  try{
    const _rkaLog=JSON.parse(localStorage.getItem('mds_rka_log')||'[]');
    _rkaLog.push({id,area:R.area,mds:R.mds,store:R.store,timestamp:now.toISOString(),avail,unavail});
    localStorage.setItem('mds_rka_log',JSON.stringify(_rkaLog));
  }catch(e){console.warn('localStorage write failed',e);}

  // show success screen first so user sees progress
  document.getElementById('rka-sid').textContent='ID: #'+id;
  document.getElementById('rka-savail').textContent=avail;
  document.getElementById('rka-sunavail').textContent=unavail;
  document.getElementById('rka-sm-area').textContent=R.area;
  document.getElementById('rka-sm-mds').textContent=R.mds;
  document.getElementById('rka-sm-store').textContent=R.store;
  document.getElementById('rka-sm-date').textContent=ds;
  // collect compressed photos (already done instantly when photo was taken)
  const photoData={};let photoOk=0;
  for(const [idx,promise] of Object.entries(R.photoUploads)){
    try{photoData[idx]=await promise;photoOk++;}catch(e){console.warn('compress failed',idx,e);}
  }

  document.getElementById('rka-sm-status').textContent='⏳ Menyimpan...';
  document.getElementById('rka-sm-foto').textContent=photoOk>0?`⏳ ${photoOk} foto...`:'—';
  document.getElementById('rka-stepper').classList.add('hidden');
  document.getElementById('rka-wrap').classList.add('hidden');
  document.getElementById('rka-botbar').classList.add('hidden');
  document.getElementById('rka-back-hdr').classList.add('hidden');
  document.getElementById('rka-suc').classList.add('show');

  // save to Firestore with photos included
  try{
    if(typeof db==='undefined') throw new Error('db not initialized');
    const _tout=new Promise((_,r)=>setTimeout(()=>r(new Error('Tersimpan offline — akan sinkron otomatis saat sinyal bagus')),30000));
    const _SITEMS=getStoreItems();
    const _namedItems={};Object.entries(R.items).forEach(([i,v])=>{const nm=_SITEMS[+i];if(nm)_namedItems[nm]=v;});
    await withFirestoreRetry(()=>Promise.race([db.collection('rka_logs').add({id,area:R.area,mds:R.mds,store:R.store,timestamp:firebase.firestore.FieldValue.serverTimestamp(),avail,unavail,items:_namedItems,...(photoOk>0?{photoData}:{})}),_tout]));
    document.getElementById('rka-sm-status').textContent='✅ Tersimpan ke server';
    document.getElementById('rka-sm-foto').textContent=photoOk>0?`✅ ${photoOk} foto`:'—';
  }catch(e){
    console.warn('Firestore rka failed',e);
    const offline=String(e.message).includes('offline');
    const msg=isFirestoreTerminated(e)?'Gagal tersambung ke server — data ini TIDAK tersimpan, mohon input ulang.':e.message;
    document.getElementById('rka-sm-status').textContent=(offline?'⏳ ':'❌ ')+msg;
    document.getElementById('rka-sm-foto').textContent='—';
  }
}

function resetRka(){
  Object.assign(R,{step:0,area:'',mds:'',store:'',photos:{},items:{},photoUploads:{},uploadsDone:{}});
  // reset photos
  for(let i=0;i<3;i++){
    document.getElementById('rka-pzone'+i).classList.remove('shot');
    document.getElementById('rka-pview'+i).src='';
    document.getElementById('rka-cam'+i).value='';
  }
  document.getElementById('rka-dt').classList.add('hidden');
  // reset fields
  document.getElementById('rka-area-sel').value='';
  document.getElementById('rka-mds-sel').value='';
  document.getElementById('rka-mds-new').value='';
  document.getElementById('rka-store-sel').value='';

  document.getElementById('rka-store-new').value='';
  document.getElementById('rka-mds-box').classList.remove('open');
  document.getElementById('rka-store-box').classList.remove('open');
  // restore
  document.getElementById('rka-stepper').classList.remove('hidden');
  document.getElementById('rka-wrap').classList.remove('hidden');
  document.getElementById('rka-botbar').classList.remove('hidden');
  document.getElementById('rka-back-hdr').classList.remove('hidden');
  document.getElementById('rka-suc').classList.remove('show');
  rkaGoTo(0);
}

/* ═══════════════════════════════════════
   VALIDASI DISPLAY WOW
═══════════════════════════════════════ */
const WOW = { step:0, area:'', mds:'', date:'', store:'', storePasangan:'', photo:null, photoUpload:null, uploadDone:false, items:{} };
let WOW_CUSTOM_STORES=[];
(function(){try{WOW_CUSTOM_STORES=JSON.parse(localStorage.getItem('mds_wow_custom_stores')||'[]');}catch(e){}})();
function wowCustomName(s){ return typeof s==='string'?s:s.name; }
async function loadWowCustomStores(){
  try{
    if(typeof db==='undefined')return;
    const doc=await db.collection('app_data').doc('wow_stores').get();
    if(!doc.exists)return;
    const data=doc.data();
    const entries=(data.entries||[]).concat(data.names||[]);
    entries.forEach(n=>{if(!WOW_CUSTOM_STORES.some(s=>_sameName(wowCustomName(s),wowCustomName(n))))WOW_CUSTOM_STORES.push(n);});
  }catch(e){console.warn('loadWowCustomStores failed',e);}
}
function wowFindTokoEntry(name){
  const n=String(name).trim();
  return WOW_TOKO_MASTER.find(t=>_sameName(t.name,n)||(t.pair&&_sameName(t.pair,n)));
}
function addNewWowStore(){
  const nw=document.getElementById('wow-store-new').value.trim();
  if(!nw)return;
  if(!WOW_CUSTOM_STORES.some(s=>_sameName(wowCustomName(s),nw))){
    const area=document.getElementById('wow-area-sel')?document.getElementById('wow-area-sel').value:'';
    const mds=document.getElementById('wow-mds-sel')?document.getElementById('wow-mds-sel').value:'';
    const entry={name:nw,area:area||'',mds:mds||''};
    WOW_CUSTOM_STORES.push(entry);
    try{localStorage.setItem('mds_wow_custom_stores',JSON.stringify(WOW_CUSTOM_STORES));}catch(e){}
    try{
      if(typeof db!=='undefined')db.collection('app_data').doc('wow_stores').set({entries:firebase.firestore.FieldValue.arrayUnion(entry)},{merge:true}).catch(e=>console.warn('wow store save failed',e));
    }catch(e){}
  }
  document.getElementById('wow-store-input').value=nw;
  document.getElementById('wow-store-new').value='';
  document.getElementById('wow-store-box').classList.remove('open');
  wowStoreInputChanged();
}
function wowStoreInputChanged(){
  const val=document.getElementById('wow-store-input').value.trim();
  const entry=wowFindTokoEntry(val);
  const pasWrap=document.getElementById('wow-store-pasangan-wrap');
  const pasInput=document.getElementById('wow-store-pasangan');
  if(entry&&entry.pair){
    const other=_sameName(entry.name,val)?entry.pair:entry.name;
    pasInput.value=other;
    pasWrap.classList.remove('hidden');
  } else {
    pasInput.value='';
    pasWrap.classList.add('hidden');
  }
  wowCheck(1);
}
function openWow(){ showScreen('s-wow'); loadWowCustomStores().then(()=>{ document.getElementById('wow-store-datalist').dataset.built=''; wowFillStore(); }); initWow(); }
function wowGetItems(){
  const ns=SPG_INDOGROSIR_GROUPS[0].items.map(n=>({name:n,section:'NS'}));
  const hilo=SPG_INDOGROSIR_GROUPS[1].items.concat(SPG_INDOGROSIR_GROUPS[2].items).map(n=>({name:n,section:'HI LO'}));
  const ts=spgGroupItems('TS SWT').filter(n=>/PLS/i.test(n)).map(n=>({name:n,section:'TS'}));
  return ns.concat(hilo,ts);
}
function initWow(){
  Object.assign(WOW,{step:0,area:'',mds:'',date:'',store:'',storePasangan:'',photo:null,photoUpload:null,uploadDone:false,items:{}});
  const as=document.getElementById('wow-area-sel');
  as.innerHTML='<option value="">— Pilih Area —</option>';
  AREAS.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; as.appendChild(o); });
  document.getElementById('wow-mds-sel').innerHTML='<option value="">— Pilih Area dulu —</option>';
  document.getElementById('wow-store-input').value='';
  document.getElementById('wow-store-pasangan').value='';
  document.getElementById('wow-store-pasangan-wrap').classList.add('hidden');
  wowFillStore();
  const dt=document.getElementById('wow-date-input');
  dt.value=new Date().toISOString().slice(0,10);
  wowGoTo(0);
}
function wowFillMds(){
  const area=document.getElementById('wow-area-sel').value;
  const ms=document.getElementById('wow-mds-sel');
  ms.innerHTML='<option value="">— Pilih MDS —</option>';
  (MDS_BY_AREA[area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ms.appendChild(o); });
  if(!area) ms.innerHTML='<option value="">— Pilih Area dulu —</option>';
  wowCheck(0);
}
const WOW_MDS_SHORT_TO_FULL={
  'Gorontalo':{'Apin':'Mohammad Rahman Marwan','Rio':'Satrio Yusuf','Abdul':'Abd. Rahman Lahay','Adit':'Aditya Hulopi'}
};
function wowFillStore(){
  const dl=document.getElementById('wow-store-datalist');
  const area=document.getElementById('wow-area-sel')?document.getElementById('wow-area-sel').value:'';
  const mds=document.getElementById('wow-mds-sel')?document.getElementById('wow-mds-sel').value:'';
  const shortMap=WOW_MDS_SHORT_TO_FULL[area];
  let pool=WOW_TOKO_MASTER;
  if(area){
    pool=pool.filter(t=>(t.formArea||t.area)===area);
  }
  if(mds){
    const directMatches=pool.filter(t=>t.mds && (t.mds===mds || (shortMap && shortMap[t.mds]===mds)));
    if(directMatches.length)pool=directMatches;
  }
  const names=new Set();
  pool.forEach(t=>{ names.add(t.name); if(t.pair)names.add(t.pair); });
  WOW_CUSTOM_STORES.forEach(s=>{
    if(typeof s==='string'){ names.add(s); return; }
    if(s.excludeArea && area && s.excludeArea===area)return;
    if(s.area && area && s.area!==area)return;
    if(s.mds && mds && s.mds!==mds)return;
    names.add(s.name);
  });
  dl.innerHTML=[...names].map(n=>`<option value="${n.replace(/"/g,'&quot;')}">`).join('');
}
function wowGoTo(step){
  WOW.step=step;
  for(let i=0;i<4;i++){
    const el=document.getElementById('ws'+i);
    el.className='s-item'+(i<step?' done':i===step?' active':'');
    el.querySelector('.s-dot').textContent=i<step?'✓':(i+1);
  }
  document.querySelectorAll('#s-wow .step-section').forEach((s,i)=>s.classList.toggle('active',i===step));
  document.getElementById('wow-bb').style.display=step===0?'none':'';
  document.getElementById('wow-nb').textContent=step===3?'Submit':'Lanjut';
  if(step===3){ renderWowItems(); document.getElementById('wow-store-chip').textContent=WOW.store; }
  wowCheck(step);
}
function wowCheck(step){
  let ok=false;
  if(step===0){
    const area=document.getElementById('wow-area-sel').value;
    const sel=document.getElementById('wow-mds-sel').value;
    const box=document.getElementById('wow-mds-box');
    const nw=document.getElementById('wow-mds-new').value.trim();
    const date=document.getElementById('wow-date-input').value;
    ok=area!==''&&(sel!==''||(box.classList.contains('open')&&nw!==''))&&date!=='';
  } else if(step===1){
    const val=document.getElementById('wow-store-input').value.trim();
    ok=val!=='';
  } else if(step===2){
    ok=!!WOW.photo&&WOW.uploadDone;
  } else if(step===3){
    const ITEMS=wowGetItems();
    const checked=Object.values(WOW.items).filter(v=>v!==null&&v!==undefined).length;
    ok=true;
    document.getElementById('wow-cnt').textContent=`${checked} / ${ITEMS.length} diperiksa`;
  }
  document.getElementById('wow-nb').disabled=!ok;
}
function wowNext(){
  if(WOW.step===0){
    WOW.area=document.getElementById('wow-area-sel').value;
    WOW.date=document.getElementById('wow-date-input').value;
    const sel=document.getElementById('wow-mds-sel').value;
    const nw=canonicalMds(WOW.area,document.getElementById('wow-mds-new').value);
    WOW.mds=sel||nw;
    if(nw&&!sel){
      if(!MDS_BY_AREA[WOW.area]) MDS_BY_AREA[WOW.area]=[];
      if(!MDS_BY_AREA[WOW.area].some(m=>_sameName(m,nw))) MDS_BY_AREA[WOW.area].push(nw);
    }
  }
  if(WOW.step===1){
    WOW.store=document.getElementById('wow-store-input').value.trim();
    WOW.storePasangan=document.getElementById('wow-store-pasangan').value.trim();
  }
  if(WOW.step===3){
    wowGetItems().forEach((_,i)=>{ if(WOW.items[i]===undefined||WOW.items[i]===null) WOW.items[i]=false; });
    submitWow(); return;
  }
  wowGoTo(WOW.step+1);
  document.getElementById('wow-wrap').scrollTop=0;
}
function wowBack(){
  if(WOW.step>0){ wowGoTo(WOW.step-1); document.getElementById('wow-wrap').scrollTop=0; }
}
function renderWowItems(){
  const list=document.getElementById('wow-items');
  list.innerHTML='';
  const ITEMS=wowGetItems();
  let lastSection=null;
  ITEMS.forEach((it,i)=>{
    if(it.section!==lastSection){
      const hdr=document.createElement('div');
      hdr.className='qty-group-hdr'; hdr.textContent=it.section;
      list.appendChild(hdr);
      lastSection=it.section;
    }
    const st=WOW.items[i];
    const row=document.createElement('div');
    row.className='item-row'+(st!==undefined&&st!==null?' ok':'');
    row.id='wrow'+i;
    row.innerHTML=`
      <div class="item-name">${it.name}</div>
      <div class="tgl-grp">
        <button class="tgl avail${st===true?' on':''}" onclick="setWowItem(${i},true)">Ada</button>
        <button class="tgl notavail${st===false?' on':''}" onclick="setWowItem(${i},false)">Tdk</button>
      </div>`;
    list.appendChild(row);
  });
  wowCheck(3);
}
function setWowItem(i,v){
  WOW.items[i]=v;
  const row=document.getElementById('wrow'+i);
  row.classList.add('ok');
  row.querySelectorAll('.tgl')[0].classList.toggle('on',v===true);
  row.querySelectorAll('.tgl')[1].classList.toggle('on',v===false);
  wowCheck(3);
}
function handleWowPhoto(){
  const file=document.getElementById('wow-cam0').files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const src=e.target.result;
    WOW.photo=src;
    document.getElementById('wow-pview0').src=src;
    document.getElementById('wow-pzone0').classList.add('shot');
    const now=new Date();
    document.getElementById('wow-dt-txt').textContent=
      now.toLocaleDateString('id-ID')+' · '+now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
    document.getElementById('wow-dt').classList.remove('hidden');
    WOW.uploadDone=false;
    wowCheck(2);
    const _st=document.getElementById('wow-upstatus0');
    if(_st)_st.textContent='⬆ Kompres...';
    WOW.photoUpload=compressAndUpload(src)
      .then(b64=>{if(_st)_st.textContent='✅ Siap';WOW.uploadDone=true;wowCheck(2);return b64;})
      .catch(e=>{if(_st)_st.textContent='⚠️ Gagal';WOW.uploadDone=true;wowCheck(2);throw e;});
  };
  reader.readAsDataURL(file);
}
async function submitWow(){
  const avail=Object.values(WOW.items).filter(v=>v===true).length;
  const unavail=Object.values(WOW.items).filter(v=>v===false).length;
  const id='WOW-'+String(Math.floor(Math.random()*9000)+1000);
  const ds=new Date(WOW.date+'T12:00:00').toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'});

  document.getElementById('wow-sid').textContent='ID: #'+id;
  document.getElementById('wow-savail').textContent=avail;
  document.getElementById('wow-sunavail').textContent=unavail;
  document.getElementById('wow-sm-area').textContent=WOW.area;
  document.getElementById('wow-sm-mds').textContent=WOW.mds;
  document.getElementById('wow-sm-store').textContent=WOW.store;
  document.getElementById('wow-sm-date').textContent=ds;
  const pasRow=document.getElementById('wow-sm-pasangan-row');
  if(WOW.storePasangan){ pasRow.classList.remove('hidden'); document.getElementById('wow-sm-pasangan').textContent=WOW.storePasangan; }
  else pasRow.classList.add('hidden');

  let photoB64=null;
  try{ if(WOW.photoUpload) photoB64=await WOW.photoUpload; }catch(e){console.warn('compress failed',e);}

  document.getElementById('wow-sm-status').textContent='⏳ Menyimpan...';
  document.getElementById('wow-sm-foto').textContent=photoB64?'⏳ foto...':'—';
  document.getElementById('wow-stepper').classList.add('hidden');
  document.getElementById('wow-wrap').classList.add('hidden');
  document.getElementById('wow-botbar').classList.add('hidden');
  document.getElementById('wow-back-hdr').classList.add('hidden');
  document.getElementById('wow-suc').classList.add('show');

  try{
    if(typeof db==='undefined') throw new Error('db not initialized');
    const _tout=new Promise((_,r)=>setTimeout(()=>r(new Error('Tersimpan offline — akan sinkron otomatis saat sinyal bagus')),30000));
    const _ITEMS=wowGetItems();
    const _namedItems={};Object.entries(WOW.items).forEach(([i,v])=>{const it=_ITEMS[+i];if(it)_namedItems[it.name]=v;});
    await withFirestoreRetry(()=>Promise.race([db.collection('wow_logs').add({id,area:WOW.area,mds:WOW.mds,store:WOW.store,...(WOW.storePasangan?{storePasangan:WOW.storePasangan}:{}),tanggalVisit:WOW.date,timestamp:firebase.firestore.FieldValue.serverTimestamp(),avail,unavail,items:_namedItems,...(photoB64?{photoData:photoB64}:{})}),_tout]));
    document.getElementById('wow-sm-status').textContent='✅ Tersimpan ke server';
    document.getElementById('wow-sm-foto').textContent=photoB64?'✅ 1 foto':'—';
  }catch(e){
    console.warn('Firestore wow failed',e);
    const offline=String(e.message).includes('offline');
    const msg=isFirestoreTerminated(e)?'Gagal tersambung ke server — data ini TIDAK tersimpan, mohon input ulang.':e.message;
    document.getElementById('wow-sm-status').textContent=(offline?'⏳ ':'❌ ')+msg;
    document.getElementById('wow-sm-foto').textContent='—';
  }
}
function resetWow(){
  Object.assign(WOW,{step:0,area:'',mds:'',date:'',store:'',storePasangan:'',photo:null,photoUpload:null,uploadDone:false,items:{}});
  document.getElementById('wow-pzone0').classList.remove('shot');
  document.getElementById('wow-pview0').src='';
  document.getElementById('wow-cam0').value='';
  document.getElementById('wow-dt').classList.add('hidden');
  document.getElementById('wow-area-sel').value='';
  document.getElementById('wow-mds-sel').value='';
  document.getElementById('wow-mds-new').value='';
  document.getElementById('wow-store-input').value='';
  document.getElementById('wow-store-pasangan').value='';
  document.getElementById('wow-store-pasangan-wrap').classList.add('hidden');
  document.getElementById('wow-store-new').value='';
  document.getElementById('wow-mds-box').classList.remove('open');
  document.getElementById('wow-store-box').classList.remove('open');
  document.getElementById('wow-stepper').classList.remove('hidden');
  document.getElementById('wow-wrap').classList.remove('hidden');
  document.getElementById('wow-botbar').classList.remove('hidden');
  document.getElementById('wow-back-hdr').classList.remove('hidden');
  document.getElementById('wow-suc').classList.remove('show');
  wowGoTo(0);
}

/* ═══════════════════════════════════════
   BELI BARANG
═══════════════════════════════════════ */
function initBeli(){
  B.step=0; B.area=''; B.mds=''; B.store=''; B.photo=null;
  const as=document.getElementById('beli-area-sel');
  as.innerHTML='<option value="">— Pilih Area —</option>';
  AREAS.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; as.appendChild(o); });
  document.getElementById('beli-store-sel').innerHTML='<option value="">— Pilih Toko —</option>';

  // Pre-fill from last RKA session
  try{
    const log=JSON.parse(localStorage.getItem('mds_rka_log')||'[]');
    if(log.length){
      const last=log[log.length-1];
      if(last.area){ as.value=last.area; beliFillMds(); }
      if(last.mds){
        const ms=document.getElementById('beli-mds-sel');
        if([...ms.options].some(o=>o.value===last.mds)) ms.value=last.mds;
        else{ document.getElementById('beli-mds-box').classList.add('open'); document.getElementById('beli-mds-new').value=last.mds; }
      }
      if(last.store){ beliFillStore(); const ss=document.getElementById('beli-store-sel'); if([...ss.options].some(o=>o.value===last.store)) ss.value=last.store; }
    }
  }catch(e){}

  beliGoTo(0);
}

function beliGoTo(step){
  B.step=step;
  if(step===1) beliFillStore();
  if(step===3) renderBeliQty();
  for(let i=0;i<4;i++){
    const el=document.getElementById('bs'+i);
    el.className='s-item'+(i<step?' done':i===step?' active':'');
    el.querySelector('.s-dot').textContent=i<step?'✓':(i+1);
  }
  document.querySelectorAll('#s-beli .step-section').forEach((s,i)=>s.classList.toggle('active',i===step));
  document.getElementById('beli-bb').style.display=step===0?'none':'';
  document.getElementById('beli-nb').textContent=step===3?'Submit':'Lanjut';
  beliCheck(step);
}

function parseNominal(v){return parseInt(String(v).replace(/[.,]/g,''),10)||0;}
function beliCheck(step){
  let ok=false;
  if(step===0){
    const area=document.getElementById('beli-area-sel').value;
    const sel=document.getElementById('beli-mds-sel').value;
    const box=document.getElementById('beli-mds-box');
    const nw=document.getElementById('beli-mds-new').value.trim();
    ok=area!==''&&(sel!==''||(box.classList.contains('open')&&nw!==''));
  } else if(step===1){
    const sel=document.getElementById('beli-store-sel').value;
    const box=document.getElementById('beli-store-box');
    const nw=document.getElementById('beli-store-new').value.trim();
    ok=sel!==''||(box.classList.contains('open')&&nw!=='');
  } else if(step===2){
    const hasPhoto=B.photo!==null;
    const hasNom=parseNominal(document.getElementById('beli-nominal').value)>0;
    ok=hasPhoto&&hasNom;
  } else if(step===3){
    ok=true; // allow submit even if all zero
  }
  document.getElementById('beli-nb').disabled=!ok;
}

function beliNext(){
  if(B.step===0){
    B.area=document.getElementById('beli-area-sel').value;
    const sel=document.getElementById('beli-mds-sel').value;
    const box=document.getElementById('beli-mds-box');
    const nw=canonicalMds(B.area,document.getElementById('beli-mds-new').value);
    if(box.classList.contains('open')&&nw){
      B.mds=nw;
      if(!MDS_BY_AREA[B.area]) MDS_BY_AREA[B.area]=[];
      if(!MDS_BY_AREA[B.area].some(m=>_sameName(m,nw))) MDS_BY_AREA[B.area].push(nw);
    } else {
      B.mds=sel;
    }
  }
  if(B.step===1){
    const sel=document.getElementById('beli-store-sel').value;
    const box=document.getElementById('beli-store-box');
    const nw=canonicalStore(B.area,document.getElementById('beli-store-new').value);
    if(box.classList.contains('open')&&nw){
      B.store=nw;
      if(!BELI_STORES_BY_AREA[B.area].some(s=>_sameName(s,nw))){ saveCustomStore(B.area,nw); const o=document.createElement('option'); o.value=nw; o.textContent=nw; document.getElementById('beli-store-sel').appendChild(o); }
    } else {
      B.store=sel;
    }
  }
  if(B.step===3){ submitBeli(); return; }
  beliGoTo(B.step+1);
  document.getElementById('beli-wrap').scrollTop=0;
}
function beliBack(){
  if(B.step>0){ beliGoTo(B.step-1); document.getElementById('beli-wrap').scrollTop=0; }
}

async function submitBeli(){
  const id='BELI-'+String(Math.floor(Math.random()*9000)+1000);
  const now=new Date();
  const ds=now.toLocaleDateString('id-ID',{day:'numeric',month:'long',year:'numeric'})+
    ' · '+now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
  const nom=parseNominal(document.getElementById('beli-nominal').value).toLocaleString('id-ID');

  document.getElementById('beli-sid').textContent='ID: #'+id;
  document.getElementById('beli-sm-area').textContent=B.area;
  document.getElementById('beli-sm-mds').textContent=B.mds;
  document.getElementById('beli-sm-store').textContent=B.store;
  document.getElementById('beli-sm-date').textContent=ds;
  document.getElementById('beli-sm-nom').textContent='Rp '+nom;
  // per-group totals
  let flatIdx=0;
  const groupTotals={};
  BELI_PRODUCTS.forEach(g=>{
    let t=0;
    g.items.forEach(()=>{ t+=(parseInt(B.qty[flatIdx])||0); flatIdx++; });
    groupTotals[g.group]=t;
  });
  const totalRenceng=Object.values(groupTotals).reduce((s,v)=>s+v,0);
  try{
    const _beliLog=JSON.parse(localStorage.getItem('mds_beli_log')||'[]');
    _beliLog.push({id,area:B.area,mds:B.mds,store:B.store,timestamp:now.toISOString(),nominal:parseNominal(document.getElementById('beli-nominal').value),groupTotals:Object.assign({},groupTotals),totalRenceng});
    localStorage.setItem('mds_beli_log',JSON.stringify(_beliLog));
  }catch(e){console.warn('localStorage write failed',e);}
  document.getElementById('beli-sm-qty-hilo').textContent=(groupTotals['HILO']||0)+' renceng';
  document.getElementById('beli-sm-qty-ns').textContent=(groupTotals['NS']||0)+' renceng';
  document.getElementById('beli-sm-qty').textContent=totalRenceng+' renceng';

  // collect compressed photo (already done instantly when photo was taken)
  let photoData=null;
  if(B.photo&&B.photoUpload){
    try{photoData=await B.photoUpload;}catch(e){console.warn('compress beli failed',e);}
  }

  document.getElementById('beli-sm-status').textContent='⏳ Menyimpan...';
  document.getElementById('beli-sm-foto').textContent=photoData?'⏳ Foto...':'—';
  document.getElementById('beli-stepper').classList.add('hidden');
  document.getElementById('beli-wrap').classList.add('hidden');
  document.getElementById('beli-botbar').classList.add('hidden');
  document.getElementById('beli-back-hdr').classList.add('hidden');
  document.getElementById('beli-suc').classList.add('show');

  // save to Firestore with photo included
  try{
    if(typeof db==='undefined') throw new Error('db not initialized');
    const _iq={};BELI_FLAT.forEach((nm,ii)=>{if(B.qty[ii])_iq[nm]=B.qty[ii];});
    const _tout=new Promise((_,r)=>setTimeout(()=>r(new Error('Tersimpan offline — akan sinkron otomatis saat sinyal bagus')),30000));
    await withFirestoreRetry(()=>Promise.race([db.collection('beli_logs').add({id,area:B.area,mds:B.mds,store:B.store,timestamp:firebase.firestore.FieldValue.serverTimestamp(),nominal:parseNominal(document.getElementById('beli-nominal').value),groupTotals:Object.assign({},groupTotals),totalRenceng,itemQty:_iq,...(photoData?{photoData}:{})}),_tout]));
    document.getElementById('beli-sm-status').textContent='✅ Tersimpan ke server';
    document.getElementById('beli-sm-foto').textContent=photoData?'✅ Foto':'—';
  }catch(e){
    console.warn('Firestore beli failed',e);
    const offline=String(e.message).includes('offline');
    const msg=isFirestoreTerminated(e)?'Gagal tersambung ke server — data ini TIDAK tersimpan, mohon input ulang.':e.message;
    document.getElementById('beli-sm-status').textContent=(offline?'⏳ ':'❌ ')+msg;
    document.getElementById('beli-sm-foto').textContent='—';
  }
}

function resetBeli(){
  B.photo=null; B.area=''; B.mds=''; B.store=''; B.qty={}; B.photoUpload=null;
  const pz=document.getElementById('beli-pzone');
  pz.classList.remove('shot');
  document.getElementById('beli-pview').src='';
  document.getElementById('beli-cam').value='';
  document.getElementById('beli-area-sel').value='';
  document.getElementById('beli-mds-sel').innerHTML='<option value="">— Pilih Area dulu —</option>';
  document.getElementById('beli-store-sel').value='';
  document.getElementById('beli-mds-new').value='';
  document.getElementById('beli-store-new').value='';

  document.getElementById('beli-nominal').value='';
  document.getElementById('beli-mds-box').classList.remove('open');
  document.getElementById('beli-store-box').classList.remove('open');

  document.getElementById('beli-stepper').classList.remove('hidden');
  document.getElementById('beli-wrap').classList.remove('hidden');
  document.getElementById('beli-botbar').classList.remove('hidden');
  document.getElementById('beli-back-hdr').classList.remove('hidden');
  document.getElementById('beli-suc').classList.remove('show');
  beliGoTo(0);
}

/* ─── QTY ─── */
function renderBeliQty(){
  const list=document.getElementById('beli-qty-list');
  list.innerHTML='';
  let fi=0;
  BELI_PRODUCTS.forEach(group=>{
    const hdr=document.createElement('div');
    hdr.className='qty-group-hdr';
    hdr.textContent=group.group;
    list.appendChild(hdr);
    group.items.forEach((name,gi)=>{
      const i=fi++;
      const val=B.qty[i]||0;
      const isPri=group.priority&&gi<group.priority;
      const row=document.createElement('div');
      row.className='qty-row'+(isPri?' beli-priority':'')+(val>0?' has-val':'');
      row.id='qrow'+i;
      row.innerHTML=`
        <div class="qty-name">${name}</div>
        <div class="qty-ctrl">
          <button class="qty-btn" onclick="adjQty(${i},-1)">−</button>
          <input type="number" class="qty-val" id="qval${i}" value="${val}" min="0"
            oninput="setQty(${i},this.value)">
          <button class="qty-btn" onclick="adjQty(${i},1)">+</button>
        </div>`;
      list.appendChild(row);
    });
  });
  updateQtyTotal();
}
function adjQty(i,d){
  const inp=document.getElementById('qval'+i);
  const cur=parseInt(inp.value)||0;
  const next=Math.max(0,cur+d);
  inp.value=next;
  setQty(i,next);
}
function setQty(i,v){
  const n=Math.max(0,parseInt(v)||0);
  B.qty[i]=n;
  document.getElementById('qval'+i).value=n;
  document.getElementById('qrow'+i).classList.toggle('has-val',n>0);
  updateQtyTotal();
}
function updateQtyTotal(){
  const t=Object.values(B.qty).reduce((s,v)=>s+(parseInt(v)||0),0);
  document.getElementById('beli-qty-total').textContent=t;
}

/* ─── SEARCH ─── */
function beliAreaChange(){
  B.mds='';
  beliFillMds();
  beliCheck(0);
}

function beliFillMds(){
  const area=document.getElementById('beli-area-sel').value;
  const ms=document.getElementById('beli-mds-sel');
  ms.innerHTML='<option value="">— Pilih MDS —</option>';
  (MDS_BY_AREA[area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ms.appendChild(o); });
  if(!area) ms.innerHTML='<option value="">— Pilih Area dulu —</option>';
}

function beliFillStore(){
  const area=B.area||document.getElementById('beli-area-sel').value;
  const ss=document.getElementById('beli-store-sel');
  ss.innerHTML='<option value="">— Pilih Toko —</option>';
  (BELI_STORES_BY_AREA[area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ss.appendChild(o); });
}

function filterList(type){
  const inId  = type==='mds' ? 'beli-mds-in'    : 'beli-store-in';
  const dropId= type==='mds' ? 'beli-mds-drop'  : 'beli-store-drop';
  const q=document.getElementById(inId).value.trim().toLowerCase();
  const drop=document.getElementById(dropId);

  let src;
  if(type==='mds'){
    const area=document.getElementById('beli-area-sel').value;
    src=area ? (MDS_BY_AREA[area]||[]) : Object.values(MDS_BY_AREA).flat();
  } else {
    src=STORES;
  }

  if(!q){ drop.classList.remove('open'); return; }
  const hits=src.filter(s=>s.toLowerCase().includes(q)).slice(0,8);
  if(!hits.length){ drop.classList.remove('open'); return; }
  drop.innerHTML=hits.map(h=>`<div class="drop-item" onclick="pickItem('${type}','${h}')">${h}</div>`).join('');
  drop.classList.add('open');
}

function pickItem(type,val){
  const inId  = type==='mds' ? 'beli-mds-in'    : 'beli-store-in';
  const dropId= type==='mds' ? 'beli-mds-drop'  : 'beli-store-drop';
  const chipId= type==='mds' ? 'beli-mds-chip'  : 'beli-store-chip';

  if(type==='mds') B.mds=val; else B.store=val;

  document.getElementById(inId).value='';
  document.getElementById(dropId).classList.remove('open');
  const area=document.getElementById(chipId);
  area.innerHTML=`<div class="s-chip">${val} <button onclick="clearChip('${type}')">×</button></div>`;
  beliCheck(B.step);
}

function clearChip(type){
  if(type==='mds'){ B.mds=''; document.getElementById('beli-mds-chip').innerHTML=''; }
  else{ B.store=''; document.getElementById('beli-store-chip').innerHTML=''; }
  beliCheck(B.step);
}

/* ─── PHOTO ─── */
function trigCam(id){ document.getElementById(id).click(); }
function handleRkaPhoto(idx){
  const file=document.getElementById('rka-cam'+idx).files[0];
  if(!file) return;
  const reader=new FileReader();
  reader.onload=e=>{
    const src=e.target.result;
    R.photos[idx]=src;
    document.getElementById('rka-pview'+idx).src=src;
    document.getElementById('rka-pzone'+idx).classList.add('shot');
    if(Object.values(R.photos).filter(v=>v).length===1){
      const now=new Date();
      document.getElementById('rka-dt-txt').textContent=
        now.toLocaleDateString('id-ID')+' · '+now.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
      document.getElementById('rka-dt').classList.remove('hidden');
    }
    rkaCheck(2);
    const _st=document.getElementById('rka-upstatus'+idx);
    if(_st){_st.textContent='⬆ Kompres...';}
    R.photoUploads[idx]=compressAndUpload(src)
      .then(b64=>{if(_st)_st.textContent='✅ Siap';R.uploadsDone[idx]=true;rkaCheck(2);return b64;})
      .catch(e=>{if(_st)_st.textContent='⚠️ Gagal';R.uploadsDone[idx]=true;rkaCheck(2);throw e;});
  };
  reader.readAsDataURL(file);
}
function handlePhoto(mod){
  const file=document.getElementById(mod+'-cam').files[0];
  if(!file) return;
  const r=new FileReader();
  r.onload=e=>{
    const src=e.target.result;
    document.getElementById(mod+'-pview').src=src;
    document.getElementById(mod+'-pzone').classList.add('shot');
    B.photo=src;
    beliCheck(2);
    const _bst=document.getElementById('beli-upstatus');
    if(_bst){_bst.textContent='⬆ Kompres...';}
    B.photoUpload=compressAndUpload(src)
      .then(b64=>{if(_bst)_bst.textContent='✅ Siap';return b64;})
      .catch(e=>{if(_bst)_bst.textContent='⚠️ Gagal';throw e;});
  };
  r.readAsDataURL(file);
}

/* ─── ADD BOX ─── */
function toggleBox(id){
  document.getElementById(id).classList.toggle('open');
  rkaCheck(R.step);
  beliCheck(B.step);
}

/* ─── CLOSE DROPS ON OUTSIDE TAP ─── */
document.addEventListener('click',e=>{
  if(!e.target.closest('.search-wrap')){
    document.querySelectorAll('.search-drop').forEach(d=>d.classList.remove('open'));
  }
});



/* ─────────── STOCK SELL OUT ─────────── */
// Price per renceng by group


const SK = { area:'', status:'', nama:'', store:'', stockType:'awal', items:{} };
let stockStep = 0;

function openStock(){
  showScreen('s-stock');
  initStock();
}

function initStock(){
  stockStep=0;
  SK.area=''; SK.status=''; SK.nama=''; SK.store=''; SK.stockType='awal'; SK.items={};
  const as=document.getElementById('stock-area-sel');
  as.innerHTML='<option value="">— Pilih Area —</option>';
  AREAS.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; as.appendChild(o); });
  document.getElementById('stock-nama-input').value='';
  document.getElementById('stock-store-sel').innerHTML='<option value="">— Pilih Toko —</option>';
  document.getElementById('stock-store-new').value='';
  // reset radios
  document.getElementById('stock-r-mds').checked=false;
  document.getElementById('stock-r-spg').checked=false;
  document.getElementById('stock-r-awal').checked=true;
  document.getElementById('stock-next-0').disabled=true;
  document.getElementById('stock-next-1').disabled=true;
  document.getElementById('stock-nama-mds-wrap').style.display='block';
  document.getElementById('stock-nama-spg-wrap').style.display='none';
  stockUpdateStepper();
  document.querySelectorAll('#s-stock .step-section').forEach((s,i)=>s.classList.toggle('active',i===0));
}

function stockAreaChange(){
  const area=document.getElementById('stock-area-sel').value;
  const mdsSel=document.getElementById('stock-mds-sel');
  mdsSel.innerHTML='';
  if(!area){ mdsSel.innerHTML='<option value="">— Pilih Area dulu —</option>'; stockCheck(0); return; }
  mdsSel.innerHTML='<option value="">— Pilih MDS —</option>';
  (MDS_BY_AREA[area]||[]).forEach(m=>{ const o=document.createElement('option'); o.value=m; o.textContent=m; mdsSel.appendChild(o); });
  stockCheck(0);
}

function stockStatusChange(){
  const isMds=document.getElementById('stock-r-mds').checked;
  document.getElementById('stock-nama-label').textContent=isMds?'Nama MDS':'Nama SPG';
  document.getElementById('stock-nama-input').value='';
  stockCheck(0);
}

function stockCheck(step){
  let ok=false;
  if(step===0){
    const area=document.getElementById('stock-area-sel').value;
    const hasStatus=document.getElementById('stock-r-mds').checked||document.getElementById('stock-r-spg').checked;
    const nama=document.getElementById('stock-nama-input').value.trim();
    ok=!!(area&&hasStatus&&nama);
    document.getElementById('stock-next-0').disabled=!ok;
  } else if(step===1){
    const store=document.getElementById('stock-store-sel').value||document.getElementById('stock-store-new').value.trim();
    ok=!!store;
    document.getElementById('stock-next-1').disabled=!ok;
  }
  return ok;
}

function stockNext(step){
  if(step===0){
    if(!stockCheck(0)) return;
    SK.area=document.getElementById('stock-area-sel').value;
    SK.status=document.getElementById('stock-r-mds').checked?'MDS':'SPG';
    SK.nama=canonicalMds(SK.area,document.getElementById('stock-nama-input').value);
    // fill stores
    const ss=document.getElementById('stock-store-sel');
    ss.innerHTML='<option value="">— Pilih Toko —</option>';
    (BELI_STORES_BY_AREA[SK.area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ss.appendChild(o); });
  } else if(step===1){
    if(!stockCheck(1)) return;
    const box=document.getElementById('stock-store-box');
    const nw=canonicalStore(SK.area,document.getElementById('stock-store-new').value);
    SK.store=(box.classList.contains('open')&&nw)?nw:document.getElementById('stock-store-sel').value;
    if(box.classList.contains('open')&&nw){
      if(!BELI_STORES_BY_AREA[SK.area].some(s=>_sameName(s,nw))){ saveCustomStore(SK.area,nw); const o=document.createElement('option'); o.value=nw; o.textContent=nw; document.getElementById('stock-store-sel').appendChild(o); }
    }
    SK.stockType=document.getElementById('stock-r-awal').checked?'awal':'akhir';
    document.getElementById('stock-input-title').textContent='Stock '+(SK.stockType==='awal'?'Awal':'Akhir')+' Bulan';
    renderStockItems();
  }
  stockStep=step+1;
  stockUpdateStepper();
  document.querySelectorAll('#s-stock .step-section').forEach((s,i)=>s.classList.toggle('active',i===stockStep));
  document.getElementById('stock-wrap').scrollTop=0;
}

function stockPrev(step){
  stockStep=step-1;
  stockUpdateStepper();
  document.querySelectorAll('#s-stock .step-section').forEach((s,i)=>s.classList.toggle('active',i===stockStep));
  document.getElementById('stock-wrap').scrollTop=0;
}

function renderStockItems(){
  const list=document.getElementById('stock-item-list');
  list.innerHTML='';
  let fi=0;
  STOCK_PRODUCTS.forEach(group=>{
    const hdr=document.createElement('div');
    hdr.className='qty-group-hdr'; hdr.textContent=group.group;
    list.appendChild(hdr);
    group.items.forEach(name=>{
      const ip=ITEM_PRICE[name]||{};
      const i=fi;
      const row=document.createElement('div');
      row.className='qty-row';
      row.innerHTML=
        '<div class="qty-name" style="flex:1;min-width:0">'+
          '<div style="font-size:10px;font-weight:600;line-height:1.3">'+name+'</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px">'+
          '<div style="font-size:8px;color:var(--t3);margin-bottom:1px">Karton</div>'+
          '<div class="qty-ctrl" style="width:100%">'+
            '<button class="qty-btn" onclick="adjSK('+i+',\'krt\',-1)" style="width:20px;font-size:12px">−</button>'+
            '<input type="number" class="qty-val" id="sk-krt-'+i+'" value="0" min="0" style="width:28px;font-size:11px" oninput="stockCalcTotal()" onfocus="if(this.value==\'0\')this.value=\'\'" onblur="if(this.value===\'\')this.value=\'0\'">'+
            '<button class="qty-btn" onclick="adjSK('+i+',\'krt\',1)" style="width:20px;font-size:12px">+</button>'+
          '</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px">'+
          '<div style="font-size:8px;color:var(--t3);margin-bottom:1px">Pcs/Rncg</div>'+
          '<div class="qty-ctrl" style="width:100%">'+
            '<button class="qty-btn" onclick="adjSK('+i+',\'rncg\',-1)" style="width:20px;font-size:12px">−</button>'+
            '<input type="number" class="qty-val" id="sk-rncg-'+i+'" value="0" min="0" style="width:28px;font-size:11px" oninput="stockCalcTotal()" onfocus="if(this.value==\'0\')this.value=\'\'" onblur="if(this.value===\'\')this.value=\'0\'">'+
            '<button class="qty-btn" onclick="adjSK('+i+',\'rncg\',1)" style="width:20px;font-size:12px">+</button>'+
          '</div>'+
        '</div>';
      list.appendChild(row);
      fi++;
    });
  });
  stockCalcTotal();
}

function adjSK(i,field,d){
  const id='sk-'+field+'-'+i;
  const el=document.getElementById(id); if(!el) return;
  el.value=Math.max(0,(parseInt(el.value)||0)+d);
  stockCalcTotal();
}

function stockCalcTotal(){
  let total=0,fi=0;
  STOCK_PRODUCTS.forEach(group=>{
    group.items.forEach(name=>{
      const ip=ITEM_PRICE[name]||{};
      const krt=parseInt(document.getElementById('sk-krt-'+fi)?.value)||0;
      const rncg=parseInt(document.getElementById('sk-rncg-'+fi)?.value)||0;
      total+=krt*(ip.ctn||0)+rncg*(ip.pcs||0);
      fi++;
    });
  });
  document.getElementById('stock-total-rp').textContent='Rp '+total.toLocaleString('id-ID');
  return total;
}

function stockGoReview(){
  // collect items
  SK.items={};
  let fi=0;
  STOCK_PRODUCTS.forEach(group=>{
    group.items.forEach(name=>{
      const ip=ITEM_PRICE[name]||{};
      const krt=parseInt(document.getElementById('sk-krt-'+fi)?.value)||0;
      const rncg=parseInt(document.getElementById('sk-rncg-'+fi)?.value)||0;
      if(krt||rncg) SK.items[name]={krt,rncg,priceCtn:ip.ctn||0,pricePcs:ip.pcs||0,nilai:krt*(ip.ctn||0)+rncg*(ip.pcs||0)};
      fi++;
    });
  });
  // build review
  document.getElementById('stock-rev-area').textContent=SK.area;
  document.getElementById('stock-rev-status').textContent=SK.status;
  document.getElementById('stock-rev-nama').textContent=SK.nama;
  document.getElementById('stock-rev-store').textContent=SK.store;
  document.getElementById('stock-rev-type').textContent=SK.stockType==='awal'?'Awal Bulan':'Akhir Bulan';
  const tbody=document.getElementById('stock-review-body');
  tbody.innerHTML='';
  let grandTotal=0;
  const entries=Object.entries(SK.items);
  if(!entries.length){
    tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:14px;font-size:11px">Tidak ada item yang diisi</td></tr>';
  } else {
    entries.forEach(([name,{krt,rncg,nilai}])=>{
      grandTotal+=nilai;
      const tr=document.createElement('tr');
      tr.innerHTML='<td style="font-size:10px;padding:5px 8px;border-bottom:1px solid var(--border)">'+name+'</td>'+
        '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700">'+krt+'</td>'+
        '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700">'+rncg+'</td>'+
        '<td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--border);font-size:10px">'+(nilai?'Rp '+nilai.toLocaleString('id-ID'):'-')+'</td>';
      tbody.appendChild(tr);
    });
  }
  document.getElementById('stock-rev-total').textContent='Rp '+grandTotal.toLocaleString('id-ID');
  stockStep=3;
  stockUpdateStepper();
  document.querySelectorAll('#s-stock .step-section').forEach((s,i)=>s.classList.toggle('active',i===stockStep));
  document.getElementById('stock-wrap').scrollTop=0;
}

function submitStock(){
  const id='STOCK-'+String(Math.floor(Math.random()*9000)+1000);
  let grandTotal=Object.values(SK.items).reduce((s,v)=>s+v.nilai,0);
  document.getElementById('stock-success-store').textContent=SK.store+' · '+SK.area+' ('+SK.stockType==='awal'?'Awal Bulan':'Akhir Bulan'+')';
  document.getElementById('stock-success-total').textContent='Nilai: Rp '+grandTotal.toLocaleString('id-ID');
  // flatten items for Firestore
  const itemsFlat={};
  Object.entries(SK.items).forEach(([name,v])=>{ itemsFlat[name]={krt:v.krt,rncg:v.rncg}; });
  if(typeof db!=='undefined'){
    withFirestoreRetry(()=>db.collection('stock_logs').add({
      id, area:SK.area, status:SK.status, nama:SK.nama, store:SK.store,
      stockType:SK.stockType,
      timestamp:firebase.firestore.FieldValue.serverTimestamp(),
      items:itemsFlat,
      totalNilai:grandTotal
    })).then(()=>{
      console.log('stock_logs write OK', id);
    }).catch(e=>{
      console.error('stock_logs FAILED',e);
      alert('Gagal menyimpan, silakan input ulang. ('+(e.code||'')+' — '+e.message+')');
    });
  } else {
    alert('DB not initialized — Firebase failed to load');
  }
  stockStep=4;
  stockUpdateStepper();
  document.querySelectorAll('#s-stock .step-section').forEach((s,i)=>s.classList.toggle('active',i===stockStep));
  document.getElementById('stock-wrap').scrollTop=0;
}

function resetStock(){ initStock(); document.getElementById('stock-wrap').scrollTop=0; }

function stockUpdateStepper(){
  ['ss0','ss1','ss2','ss3'].forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.className='s-item'+(i<stockStep?' done':i===stockStep?' active':'');
    el.querySelector('.s-dot').textContent=i<stockStep?'✓':(i+1);
  });
}


/* ─────────── KENDARI ─────────── */
const KENDARI_STORES = [
  "Marina Swalayan ( CV. Marina Sukses Abadi )",
  "PT. MATAHARI PUTRA PRIMA TBK. ( The Park Kendari )",
  "Tk. Sanya ( Tn.Jonny Mulyanto )",
  "PT. Top Mandiri Perkasa",
  "Tk. Damai ( CV. SUMBER BERKAT ABADI )",
  "Tk. Damai 2 ( CV.SUMBER BERKAT ABADI )",
  "CV. Alaska Jaya Abadi"
];
const KD = { nama:'', store:'', distributor:'', jenis:'', date:'', arrivalDate:'', items:{}, sourcePoId:'', sourceItems:{} };
let kendariStep = 0;

/* Matakar Kendari excludes HILO DRINK PLS, HILO SCHOOL PLS, and NS items whose name contains
   "PLS" (but NS "FC" items stay with Matakar). Borwita Citra Prima Kendari gets exactly that
   excluded set instead — the two distributors' item lists are a strict partition. */
function kendariItemIsBorwita(group, name){
  if(group==='HILO DRINK PLS' || group==='HILO SCHOOL PLS') return true;
  if(group==='NS' && name.includes('PLS') && !name.includes('FC')) return true;
  return false;
}
function kendariItemAllowed(group, name, distributor){
  const isBorwitaItem = kendariItemIsBorwita(group, name);
  return distributor==='Borwita Citra Prima Kendari' ? isBorwitaItem : !isBorwitaItem;
}
function kendariVisibleProducts(){
  if(!KD.distributor) return STOCK_PRODUCTS;
  return STOCK_PRODUCTS
    .map(g=>({group:g.group, items:g.items.filter(nm=>kendariItemAllowed(g.group, nm, KD.distributor))}))
    .filter(g=>g.items.length>0);
}

function openKendari(){ showScreen('s-kendari'); initKendari(); }

function initKendari(){
  kendariStep=0;
  KD.nama=''; KD.store=''; KD.distributor=''; KD.jenis=''; KD.date=''; KD.arrivalDate=''; KD.items={}; KD.sourcePoId=''; KD.sourceItems={};
  document.getElementById('kendari-nama-input').value='';
  const ss=document.getElementById('kendari-store-sel');
  ss.innerHTML='<option value="">— Pilih Toko —</option>';
  KENDARI_STORES.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ss.appendChild(o); });
  document.getElementById('kendari-r-matakar').checked=false;
  document.getElementById('kendari-r-borwita').checked=false;
  document.getElementById('kendari-r-order').checked=false;
  document.getElementById('kendari-r-barang').checked=false;
  document.getElementById('kendari-date-input').value='';
  document.getElementById('kendari-arrival-date-input').value='';
  document.getElementById('kendari-po-sel').innerHTML='<option value="">— Pilih Toko dulu —</option>';
  document.getElementById('kendari-po-hint').textContent='';
  document.getElementById('kendari-order-date-wrap').style.display='none';
  document.getElementById('kendari-barang-wrap').style.display='none';
  document.getElementById('kendari-next-0').disabled=true;
  kendariUpdateStepper();
  document.querySelectorAll('#s-kendari .step-section').forEach((s,i)=>s.classList.toggle('active',i===0));
}

function kendariStoreChange(){
  document.getElementById('kendari-po-sel').innerHTML='<option value="">— Pilih Toko dulu —</option>';
  document.getElementById('kendari-po-hint').textContent='';
  if(document.getElementById('kendari-r-barang').checked) kendariLoadPoOptions();
  kendariCheck(0);
}

function kendariDistributorChange(){
  document.getElementById('kendari-po-sel').innerHTML='<option value="">— Pilih Toko dulu —</option>';
  document.getElementById('kendari-po-hint').textContent='';
  if(document.getElementById('kendari-r-barang').checked) kendariLoadPoOptions();
  kendariCheck(0);
}

function kendariJenisChange(){
  const isBarang=document.getElementById('kendari-r-barang').checked;
  document.getElementById('kendari-order-date-wrap').style.display=isBarang?'none':'block';
  document.getElementById('kendari-barang-wrap').style.display=isBarang?'block':'none';
  if(isBarang) kendariLoadPoOptions();
  kendariCheck(0);
}

async function kendariLoadPoOptions(){
  const sel=document.getElementById('kendari-po-sel');
  const store=document.getElementById('kendari-store-sel').value;
  const distributor=(document.getElementById('kendari-r-matakar').checked && 'Matakar Kendari')
    || (document.getElementById('kendari-r-borwita').checked && 'Borwita Citra Prima Kendari') || '';
  if(!store || !distributor){ sel.innerHTML='<option value="">— Pilih Toko & Distributor dulu —</option>'; return; }
  sel.innerHTML='<option value="">Memuat…</option>';
  if(typeof db==='undefined'){ sel.innerHTML='<option value="">DB tidak tersedia</option>'; return; }
  try{
    const snap=await db.collection('kendari_po_logs').where('store','==',store).where('jenis','==','order').where('distributor','==',distributor).get();
    const docs=snap.docs.map(d=>({...d.data(),_docId:d.id})).sort((a,b)=>(b.tanggalPo||'').localeCompare(a.tanggalPo||''));
    sel.innerHTML='<option value="">— Pilih Tanggal PO —</option>';
    docs.forEach(d=>{ const o=document.createElement('option'); o.value=d._docId; o.textContent=d.tanggalPo+' · '+(d.id||d._docId); sel.appendChild(o); });
    if(!docs.length) sel.innerHTML='<option value="">Belum ada PO untuk toko & distributor ini</option>';
  }catch(e){
    console.error('kendariLoadPoOptions failed',e);
    sel.innerHTML='<option value="">Gagal memuat PO</option>';
  }
}

function kendariPoSelChange(){
  const sel=document.getElementById('kendari-po-sel');
  const hint=document.getElementById('kendari-po-hint');
  if(!sel.value){ hint.textContent=''; kendariCheck(0); return; }
  db.collection('kendari_po_logs').doc(sel.value).get().then(doc=>{
    if(!doc.exists){ hint.textContent='PO tidak ditemukan'; return; }
    const d=doc.data();
    const items=d.items||{};
    const itemCount=Object.keys(items).length;
    hint.textContent='Fulfillment terakhir: '+itemCount+' item · Total Rp '+(d.totalNilai||0).toLocaleString('id-ID');
    KD._pendingSourceDoc=d;
  }).catch(e=>{ console.error(e); hint.textContent='Gagal memuat PO'; });
  kendariCheck(0);
}

function kendariCheck(step){
  let ok=false;
  if(step===0){
    const nama=document.getElementById('kendari-nama-input').value.trim();
    const store=document.getElementById('kendari-store-sel').value;
    const hasDistributor=document.getElementById('kendari-r-matakar').checked || document.getElementById('kendari-r-borwita').checked;
    const isOrder=document.getElementById('kendari-r-order').checked;
    const isBarang=document.getElementById('kendari-r-barang').checked;
    if(isOrder){
      const date=document.getElementById('kendari-date-input').value;
      ok=!!(nama&&store&&hasDistributor&&date);
    } else if(isBarang){
      const arrivalDate=document.getElementById('kendari-arrival-date-input').value;
      const poSel=document.getElementById('kendari-po-sel').value;
      ok=!!(nama&&store&&hasDistributor&&arrivalDate&&poSel);
    }
    document.getElementById('kendari-next-0').disabled=!ok;
  }
  return ok;
}

function kendariNext(step){
  if(step===0){
    if(!kendariCheck(0)) return;
    KD.nama=document.getElementById('kendari-nama-input').value.trim();
    KD.store=document.getElementById('kendari-store-sel').value;
    KD.distributor=document.getElementById('kendari-r-matakar').checked?'Matakar Kendari':'Borwita Citra Prima Kendari';
    KD.jenis=document.getElementById('kendari-r-order').checked?'order':'barang';
    if(KD.jenis==='order'){
      KD.date=document.getElementById('kendari-date-input').value;
      renderKendariItems();
    } else {
      KD.arrivalDate=document.getElementById('kendari-arrival-date-input').value;
      KD.sourcePoId=document.getElementById('kendari-po-sel').value;
      KD.sourceItems=(KD._pendingSourceDoc&&KD._pendingSourceDoc.items)||{};
      renderKendariCrosscheck();
    }
  }
  kendariStep=step+1;
  kendariUpdateStepper();
  document.querySelectorAll('#s-kendari .step-section').forEach((s,i)=>s.classList.toggle('active',i===kendariStep));
  document.getElementById('kendari-wrap').scrollTop=0;
}

function kendariPrev(step){
  kendariStep=step-1;
  kendariUpdateStepper();
  document.querySelectorAll('#s-kendari .step-section').forEach((s,i)=>s.classList.toggle('active',i===kendariStep));
  document.getElementById('kendari-wrap').scrollTop=0;
}

function renderKendariItems(){
  document.getElementById('kendari-item-title').textContent='Item PO';
  document.getElementById('kendari-item-sub').textContent='Isi jumlah karton dan renceng per item';
  document.getElementById('kendari-item-hdr').innerHTML='<span>ITEM</span><span style="text-align:center;width:72px">KARTON</span><span style="text-align:center;width:72px">RENCENG</span>';
  document.getElementById('kendari-total-lbl').textContent='Total Nilai PO';
  const list=document.getElementById('kendari-item-list');
  list.innerHTML='';
  let fi=0;
  kendariVisibleProducts().forEach(group=>{
    const hdr=document.createElement('div');
    hdr.className='qty-group-hdr'; hdr.textContent=group.group;
    list.appendChild(hdr);
    group.items.forEach(name=>{
      const i=fi;
      const row=document.createElement('div');
      row.className='qty-row';
      row.innerHTML=
        '<div class="qty-name" style="flex:1;min-width:0">'+
          '<div style="font-size:10px;font-weight:600;line-height:1.3">'+name+'</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px">'+
          '<div style="font-size:8px;color:var(--t3);margin-bottom:1px">Karton</div>'+
          '<div class="qty-ctrl" style="width:100%">'+
            '<button class="qty-btn" onclick="adjKD('+i+',\'krt\',-1)" style="width:20px;font-size:12px">−</button>'+
            '<input type="number" class="qty-val" id="kd-krt-'+i+'" value="0" min="0" style="width:28px;font-size:11px" oninput="kendariCalcTotal()" onfocus="if(this.value==\'0\')this.value=\'\'" onblur="if(this.value===\'\')this.value=\'0\'">'+
            '<button class="qty-btn" onclick="adjKD('+i+',\'krt\',1)" style="width:20px;font-size:12px">+</button>'+
          '</div>'+
        '</div>'+
        '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px">'+
          '<div style="font-size:8px;color:var(--t3);margin-bottom:1px">Pcs/Rncg</div>'+
          '<div class="qty-ctrl" style="width:100%">'+
            '<button class="qty-btn" onclick="adjKD('+i+',\'rncg\',-1)" style="width:20px;font-size:12px">−</button>'+
            '<input type="number" class="qty-val" id="kd-rncg-'+i+'" value="0" min="0" style="width:28px;font-size:11px" oninput="kendariCalcTotal()" onfocus="if(this.value==\'0\')this.value=\'\'" onblur="if(this.value===\'\')this.value=\'0\'">'+
            '<button class="qty-btn" onclick="adjKD('+i+',\'rncg\',1)" style="width:20px;font-size:12px">+</button>'+
          '</div>'+
        '</div>';
      list.appendChild(row);
      fi++;
    });
  });
  kendariCalcTotal();
}

function renderKendariCrosscheck(){
  document.getElementById('kendari-item-title').textContent='Cross-check Barang Datang';
  document.getElementById('kendari-item-sub').textContent='Isi jumlah yang benar-benar diterima per item (default = jumlah order)';
  document.getElementById('kendari-item-hdr').innerHTML='<span>ITEM (ORDER)</span><span style="text-align:center;width:72px">KRT DITERIMA</span><span style="text-align:center;width:72px">RNCG DITERIMA</span>';
  document.getElementById('kendari-total-lbl').textContent='Item Sesuai / Total Item';
  const list=document.getElementById('kendari-item-list');
  list.innerHTML='';
  const entries=Object.entries(KD.sourceItems);
  if(!entries.length){
    list.innerHTML='<div class="step-hint">PO ini tidak memiliki item.</div>';
    document.getElementById('kendari-total-rp').textContent='0 / 0';
    return;
  }
  entries.forEach(([name,ord],i)=>{
    const row=document.createElement('div');
    row.className='qty-row';
    row.innerHTML=
      '<div class="qty-name" style="flex:1;min-width:0">'+
        '<div style="font-size:10px;font-weight:600;line-height:1.3">'+name+'</div>'+
        '<div style="font-size:9px;color:var(--t3)">Order: '+(ord.krt||0)+' krt · '+(ord.rncg||0)+' rncg</div>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px">'+
        '<div class="qty-ctrl" style="width:100%">'+
          '<button class="qty-btn" onclick="adjKD('+i+',\'krt\',-1)" style="width:20px;font-size:12px">−</button>'+
          '<input type="number" class="qty-val" id="kd-krt-'+i+'" value="'+(ord.krt||0)+'" min="0" style="width:28px;font-size:11px" oninput="kendariCalcTotal()" onfocus="if(this.value==\'0\')this.value=\'\'" onblur="if(this.value===\'\')this.value=\'0\'">'+
          '<button class="qty-btn" onclick="adjKD('+i+',\'krt\',1)" style="width:20px;font-size:12px">+</button>'+
        '</div>'+
      '</div>'+
      '<div style="display:flex;flex-direction:column;align-items:center;gap:2px;min-width:72px">'+
        '<div class="qty-ctrl" style="width:100%">'+
          '<button class="qty-btn" onclick="adjKD('+i+',\'rncg\',-1)" style="width:20px;font-size:12px">−</button>'+
          '<input type="number" class="qty-val" id="kd-rncg-'+i+'" value="'+(ord.rncg||0)+'" min="0" style="width:28px;font-size:11px" oninput="kendariCalcTotal()" onfocus="if(this.value==\'0\')this.value=\'\'" onblur="if(this.value===\'\')this.value=\'0\'">'+
          '<button class="qty-btn" onclick="adjKD('+i+',\'rncg\',1)" style="width:20px;font-size:12px">+</button>'+
        '</div>'+
      '</div>';
    list.appendChild(row);
  });
  kendariCalcTotal();
}

function adjKD(i,field,d){
  const id='kd-'+field+'-'+i;
  const el=document.getElementById(id); if(!el) return;
  el.value=Math.max(0,(parseInt(el.value)||0)+d);
  kendariCalcTotal();
}

function kendariCalcTotal(){
  if(KD.jenis==='barang'){
    let matched=0,fi=0;
    const entries=Object.entries(KD.sourceItems);
    entries.forEach(([name,ord])=>{
      const krt=parseInt(document.getElementById('kd-krt-'+fi)?.value)||0;
      const rncg=parseInt(document.getElementById('kd-rncg-'+fi)?.value)||0;
      if(krt===(ord.krt||0)&&rncg===(ord.rncg||0)) matched++;
      fi++;
    });
    document.getElementById('kendari-total-rp').textContent=matched+' / '+entries.length;
    return matched;
  }
  let total=0,fi=0;
  kendariVisibleProducts().forEach(group=>{
    group.items.forEach(name=>{
      const ip=ITEM_PRICE[name]||{};
      const krt=parseInt(document.getElementById('kd-krt-'+fi)?.value)||0;
      const rncg=parseInt(document.getElementById('kd-rncg-'+fi)?.value)||0;
      total+=krt*(ip.ctn||0)+rncg*(ip.pcs||0);
      fi++;
    });
  });
  document.getElementById('kendari-total-rp').textContent='Rp '+total.toLocaleString('id-ID');
  return total;
}

function kendariGoReview(){
  document.getElementById('kendari-rev-nama').textContent=KD.nama;
  document.getElementById('kendari-rev-store').textContent=KD.store;
  document.getElementById('kendari-rev-distributor').textContent=KD.distributor;
  document.getElementById('kendari-rev-jenis').textContent=KD.jenis==='order'?'Order PO':'Barang Datang';
  const tbody=document.getElementById('kendari-review-body');
  tbody.innerHTML='';

  if(KD.jenis==='order'){
    document.getElementById('kendari-rev-date-lbl').textContent='Tanggal PO';
    document.getElementById('kendari-rev-date').textContent=KD.date;
    document.getElementById('kendari-review-thead').innerHTML='<tr style="background:rgba(22,163,74,.08)"><th style="text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)">Item</th><th style="text-align:center;padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap">Krt</th><th style="text-align:center;padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap">Rncg</th><th style="text-align:right;padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap">Nilai</th></tr>';
    document.getElementById('kendari-review-tfoot').innerHTML='<tr style="font-weight:800;background:rgba(22,163,74,.07)"><td colspan="3" style="padding:8px;font-size:11px">TOTAL NILAI</td><td id="kendari-rev-total" style="padding:8px;text-align:right;font-size:11px;color:var(--ok)"></td></tr>';

    KD.items={};
    let fi=0;
    kendariVisibleProducts().forEach(group=>{
      group.items.forEach(name=>{
        const ip=ITEM_PRICE[name]||{};
        const krt=parseInt(document.getElementById('kd-krt-'+fi)?.value)||0;
        const rncg=parseInt(document.getElementById('kd-rncg-'+fi)?.value)||0;
        if(krt||rncg) KD.items[name]={krt,rncg,priceCtn:ip.ctn||0,pricePcs:ip.pcs||0,nilai:krt*(ip.ctn||0)+rncg*(ip.pcs||0)};
        fi++;
      });
    });
    let grandTotal=0;
    const entries=Object.entries(KD.items);
    if(!entries.length){
      tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:14px;font-size:11px">Tidak ada item yang diisi</td></tr>';
    } else {
      entries.forEach(([name,{krt,rncg,nilai}])=>{
        grandTotal+=nilai;
        const tr=document.createElement('tr');
        tr.innerHTML='<td style="font-size:10px;padding:5px 8px;border-bottom:1px solid var(--border)">'+name+'</td>'+
          '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700">'+krt+'</td>'+
          '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700">'+rncg+'</td>'+
          '<td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--border);font-size:10px">'+(nilai?'Rp '+nilai.toLocaleString('id-ID'):'-')+'</td>';
        tbody.appendChild(tr);
      });
    }
    document.getElementById('kendari-rev-total').textContent='Rp '+grandTotal.toLocaleString('id-ID');
  } else {
    document.getElementById('kendari-rev-date-lbl').textContent='Tanggal Barang Datang';
    document.getElementById('kendari-rev-date').textContent=KD.arrivalDate;
    document.getElementById('kendari-review-thead').innerHTML='<tr style="background:rgba(22,163,74,.08)"><th style="text-align:left;padding:7px 8px;border-bottom:1px solid var(--border)">Item</th><th style="text-align:center;padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap">Order</th><th style="text-align:center;padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap">Diterima</th><th style="text-align:center;padding:7px 8px;border-bottom:1px solid var(--border);white-space:nowrap">Status</th></tr>';
    document.getElementById('kendari-review-tfoot').innerHTML='<tr style="font-weight:800;background:rgba(22,163,74,.07)"><td colspan="3" style="padding:8px;font-size:11px">ITEM SESUAI</td><td id="kendari-rev-total" style="padding:8px;text-align:right;font-size:11px;color:var(--ok)"></td></tr>';

    KD.items={};
    let fi=0,matched=0;
    Object.entries(KD.sourceItems).forEach(([name,ord])=>{
      const krt=parseInt(document.getElementById('kd-krt-'+fi)?.value)||0;
      const rncg=parseInt(document.getElementById('kd-rncg-'+fi)?.value)||0;
      const ok=(krt===(ord.krt||0)&&rncg===(ord.rncg||0));
      if(ok) matched++;
      KD.items[name]={orderedKrt:ord.krt||0,orderedRncg:ord.rncg||0,diterimaKrt:krt,diterimaRncg:rncg,sesuai:ok};
      const tr=document.createElement('tr');
      tr.innerHTML='<td style="font-size:10px;padding:5px 8px;border-bottom:1px solid var(--border)">'+name+'</td>'+
        '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border)">'+(ord.krt||0)+'/'+(ord.rncg||0)+'</td>'+
        '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700">'+krt+'/'+rncg+'</td>'+
        '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border)">'+(ok?'✅':'⚠️')+'</td>';
      tbody.appendChild(tr);
      fi++;
    });
    if(!Object.keys(KD.sourceItems).length){
      tbody.innerHTML='<tr><td colspan="4" style="text-align:center;color:var(--t3);padding:14px;font-size:11px">PO sumber tidak memiliki item</td></tr>';
    }
    document.getElementById('kendari-rev-total').textContent=matched+' / '+Object.keys(KD.sourceItems).length;
  }

  kendariStep=2;
  kendariUpdateStepper();
  document.querySelectorAll('#s-kendari .step-section').forEach((s,i)=>s.classList.toggle('active',i===kendariStep));
  document.getElementById('kendari-wrap').scrollTop=0;
}

function submitKendari(){
  if(KD.jenis==='order'){
    const id='KDPO-'+String(Math.floor(Math.random()*9000)+1000);
    let grandTotal=Object.values(KD.items).reduce((s,v)=>s+v.nilai,0);
    document.getElementById('kendari-success-store').textContent=KD.store+' · '+KD.date;
    document.getElementById('kendari-success-total').textContent='Nilai: Rp '+grandTotal.toLocaleString('id-ID');
    const itemsFlat={};
    Object.entries(KD.items).forEach(([name,v])=>{ itemsFlat[name]={krt:v.krt,rncg:v.rncg}; });
    if(typeof db!=='undefined'){
      withFirestoreRetry(()=>db.collection('kendari_po_logs').add({
        id, jenis:'order', nama:KD.nama, store:KD.store, distributor:KD.distributor, tanggalPo:KD.date,
        timestamp:firebase.firestore.FieldValue.serverTimestamp(),
        items:itemsFlat,
        totalNilai:grandTotal
      })).then(()=>{
        console.log('kendari_po_logs write OK', id);
      }).catch(e=>{
        console.error('kendari_po_logs FAILED',e);
        alert('Gagal menyimpan, silakan input ulang. ('+(e.code||'')+' — '+e.message+')');
      });
    } else {
      alert('DB not initialized — Firebase failed to load');
    }
  } else {
    const id='KDBD-'+String(Math.floor(Math.random()*9000)+1000);
    const matched=Object.values(KD.items).filter(v=>v.sesuai).length;
    const totalItems=Object.keys(KD.items).length;
    document.getElementById('kendari-success-store').textContent=KD.store+' · '+KD.arrivalDate;
    document.getElementById('kendari-success-total').textContent='Sesuai: '+matched+' / '+totalItems+' item';
    if(typeof db!=='undefined'){
      withFirestoreRetry(()=>db.collection('kendari_po_logs').add({
        id, jenis:'barang', nama:KD.nama, store:KD.store, distributor:KD.distributor, tanggalBarangDatang:KD.arrivalDate,
        poRef:KD.sourcePoId,
        timestamp:firebase.firestore.FieldValue.serverTimestamp(),
        items:KD.items,
        matched, totalItems
      })).then(()=>{
        console.log('kendari_po_logs (barang) write OK', id);
      }).catch(e=>{
        console.error('kendari_po_logs (barang) FAILED',e);
        alert('Gagal menyimpan, silakan input ulang. ('+(e.code||'')+' — '+e.message+')');
      });
    } else {
      alert('DB not initialized — Firebase failed to load');
    }
  }
  kendariStep=3;
  kendariUpdateStepper();
  document.querySelectorAll('#s-kendari .step-section').forEach((s,i)=>s.classList.toggle('active',i===kendariStep));
  document.getElementById('kendari-wrap').scrollTop=0;
}

function resetKendari(){ initKendari(); document.getElementById('kendari-wrap').scrollTop=0; }

function kendariUpdateStepper(){
  ['ks0','ks1','ks2'].forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.className='s-item'+(i<kendariStep?' done':i===kendariStep?' active':'');
    el.querySelector('.s-dot').textContent=i<kendariStep?'✓':(i+1);
  });
}


/* ─────────── NED TOKO ─────────── */
const ND = { area:'', status:'', nama:'', store:'', items:{} };
let nedStep = 0;

function openNed(){ showScreen('s-ned'); initNed(); }
function initNed(){
  nedStep=0;
  ND.area=''; ND.status=''; ND.nama=''; ND.store=''; ND.items={};
  const as=document.getElementById('ned-area-sel');
  as.innerHTML='<option value="">— Pilih Area —</option>';
  AREAS.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; as.appendChild(o); });
  document.getElementById('ned-nama-input').value='';
  document.getElementById('ned-store-sel').innerHTML='<option value="">— Pilih Toko —</option>';
  document.getElementById('ned-store-new').value='';
  document.getElementById('ned-r-mds').checked=false;
  document.getElementById('ned-r-spg').checked=false;
  document.getElementById('ned-next-0').disabled=true;
  document.getElementById('ned-next-1').disabled=true;
  nedUpdateStepper();
  document.querySelectorAll('#s-ned .step-section').forEach((s,i)=>s.classList.toggle('active',i===0));
}
function nedCheck(step){
  let ok=false;
  if(step===0){
    const area=document.getElementById('ned-area-sel').value;
    const hasStatus=document.getElementById('ned-r-mds').checked||document.getElementById('ned-r-spg').checked;
    const nama=document.getElementById('ned-nama-input').value.trim();
    ok=!!(area&&hasStatus&&nama);
    document.getElementById('ned-next-0').disabled=!ok;
  } else if(step===1){
    const store=document.getElementById('ned-store-sel').value||document.getElementById('ned-store-new').value.trim();
    ok=!!store;
    document.getElementById('ned-next-1').disabled=!ok;
  }
  return ok;
}
function nedNext(step){
  if(step===0){
    if(!nedCheck(0)) return;
    ND.area=document.getElementById('ned-area-sel').value;
    ND.status=document.getElementById('ned-r-mds').checked?'MDS':'SPG';
    ND.nama=canonicalMds(ND.area,document.getElementById('ned-nama-input').value);
    const ss=document.getElementById('ned-store-sel');
    ss.innerHTML='<option value="">— Pilih Toko —</option>';
    (BELI_STORES_BY_AREA[ND.area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ss.appendChild(o); });
  } else if(step===1){
    if(!nedCheck(1)) return;
    const box=document.getElementById('ned-store-box');
    const nw=canonicalStore(ND.area,document.getElementById('ned-store-new').value);
    ND.store=(box.classList.contains('open')&&nw)?nw:document.getElementById('ned-store-sel').value;
    if(box.classList.contains('open')&&nw){
      if(!BELI_STORES_BY_AREA[ND.area].some(s=>_sameName(s,nw))){ saveCustomStore(ND.area,nw); const o=document.createElement('option'); o.value=nw; o.textContent=nw; document.getElementById('ned-store-sel').appendChild(o); }
    }
    renderNedItems();
  }
  nedStep=step+1;
  nedUpdateStepper();
  document.querySelectorAll('#s-ned .step-section').forEach((s,i)=>s.classList.toggle('active',i===nedStep));
  document.getElementById('ned-wrap').scrollTop=0;
}
function nedPrev(step){
  nedStep=step-1;
  nedUpdateStepper();
  document.querySelectorAll('#s-ned .step-section').forEach((s,i)=>s.classList.toggle('active',i===nedStep));
  document.getElementById('ned-wrap').scrollTop=0;
}
function renderNedItems(){
  const list=document.getElementById('ned-item-list');
  list.innerHTML='';
  let fi=0;
  STOCK_PRODUCTS.forEach(group=>{
    const hdr=document.createElement('div');
    hdr.className='qty-group-hdr'; hdr.textContent=group.group;
    list.appendChild(hdr);
    group.items.forEach(name=>{
      const row=document.createElement('div');
      row.className='qty-row';
      row.innerHTML=
        '<div class="qty-name" style="flex:1;min-width:0">'+
          '<div style="font-size:10px;font-weight:600;line-height:1.3">'+name+'</div>'+
        '</div>'+
        '<div style="min-width:104px">'+
          '<input type="month" class="f-input" id="ned-exp-'+fi+'" style="padding:6px 6px;font-size:11px;width:104px" oninput="nedCountFilled()">'+
        '</div>'+
        '<div style="min-width:60px">'+
          '<input type="number" class="qty-val" id="ned-qty-'+fi+'" value="0" min="0" style="width:52px;font-size:11px;padding:6px 4px" oninput="nedCountFilled()" onfocus="if(this.value==&quot;0&quot;)this.value=&quot;&quot;" onblur="if(this.value===&quot;&quot;)this.value=&quot;0&quot;">'+
        '</div>';
      list.appendChild(row);
      fi++;
    });
  });
  nedCountFilled();
}
function nedCountFilled(){
  let cnt=0,fi=0;
  STOCK_PRODUCTS.forEach(group=>group.items.forEach(()=>{
    const exp=document.getElementById('ned-exp-'+fi)?.value;
    if(exp)cnt++;
    fi++;
  }));
  document.getElementById('ned-count').textContent=cnt+' item';
  return cnt;
}
function nedExpLabel(exp){
  if(!exp)return'—';
  const[y,m]=exp.split('-');
  const bln=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return (bln[+m-1]||m)+' '+y;
}
function nedGoReview(){
  ND.items={};
  let fi=0;
  STOCK_PRODUCTS.forEach(group=>group.items.forEach(name=>{
    const exp=document.getElementById('ned-exp-'+fi)?.value;
    const qty=parseInt(document.getElementById('ned-qty-'+fi)?.value)||0;
    if(exp) ND.items[name]={exp,qty};
    fi++;
  }));
  if(!Object.keys(ND.items).length){alert('Belum ada item yang diisi bulan expired-nya.');return;}
  document.getElementById('ned-rev-area').textContent=ND.area;
  document.getElementById('ned-rev-status').textContent=ND.status;
  document.getElementById('ned-rev-nama').textContent=ND.nama;
  document.getElementById('ned-rev-store').textContent=ND.store;
  const tbody=document.getElementById('ned-review-body');
  tbody.innerHTML='';
  Object.entries(ND.items).forEach(([name,{exp,qty}])=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td style="font-size:10px;padding:5px 8px;border-bottom:1px solid var(--border)">'+name+'</td>'+
      '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700;color:#EF4444">'+nedExpLabel(exp)+'</td>'+
      '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700">'+qty+'</td>';
    tbody.appendChild(tr);
  });
  nedStep=3;
  nedUpdateStepper();
  document.querySelectorAll('#s-ned .step-section').forEach((s,i)=>s.classList.toggle('active',i===nedStep));
  document.getElementById('ned-wrap').scrollTop=0;
}
function submitNed(){
  const id='NED-'+String(Math.floor(Math.random()*9000)+1000);
  const cnt=Object.keys(ND.items).length;
  document.getElementById('ned-success-store').textContent=ND.store+' · '+ND.area;
  document.getElementById('ned-success-count').textContent=cnt+' item NED tercatat';
  if(typeof db!=='undefined'){
    withFirestoreRetry(()=>db.collection('ned_logs').add({
      id, area:ND.area, status:ND.status, nama:ND.nama, store:ND.store,
      timestamp:firebase.firestore.FieldValue.serverTimestamp(),
      items:ND.items,
      itemCount:cnt
    })).then(()=>console.log('ned_logs write OK',id))
    .catch(e=>{console.error('ned_logs FAILED',e);alert('Gagal menyimpan, silakan input ulang. ('+(e.code||'')+' — '+e.message+')');});
  } else { alert('DB not initialized'); }
  nedStep=4;
  nedUpdateStepper();
  document.querySelectorAll('#s-ned .step-section').forEach((s,i)=>s.classList.toggle('active',i===nedStep));
  document.getElementById('ned-wrap').scrollTop=0;
}
function resetNed(){ initNed(); document.getElementById('ned-wrap').scrollTop=0; }
function nedUpdateStepper(){
  ['ns0','ns1','ns2','ns3'].forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.className='s-item'+(i<nedStep?' done':i===nedStep?' active':'');
    el.querySelector('.s-dot').textContent=i<nedStep?'✓':(i+1);
  });
}

/* ─────────── REPORT HARIAN SPG ─────────── */
const SG = { area:'', nama:'', store:'', date:'', items:{}, total:0 };
let spgStep = 0;

function openSpg(){ showScreen('s-spg'); initSpg(); }
function initSpg(){
  spgStep=0;
  SG.area=''; SG.nama=''; SG.store=''; SG.date=''; SG.items={}; SG.total=0;
  const as=document.getElementById('spg-area-sel');
  as.innerHTML='<option value="">— Pilih Area —</option>';
  AREAS.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; as.appendChild(o); });
  document.getElementById('spg-nama-input').value='';
  spgFillNames();
  // visibility is driven purely by the .open class (.add-box{display:none} /
  // .add-box.open{display:block}); setting inline display here would outrank the
  // class and permanently prevent toggleBox() from ever showing the box
  const nbox=document.getElementById('spg-nama-box');
  if(nbox)nbox.classList.remove('open');
  const todayStr=new Date().toISOString().slice(0,10);
  const dateInput=document.getElementById('spg-date-input');
  dateInput.value=todayStr;
  dateInput.max=todayStr;
  document.getElementById('spg-store-sel').innerHTML='<option value="">— Pilih Toko —</option>';
  document.getElementById('spg-store-new').value='';
  document.getElementById('spg-next-0').disabled=true;
  document.getElementById('spg-next-1').disabled=true;
  spgUpdateStepper();
  document.querySelectorAll('#s-spg .step-section').forEach((s,i)=>s.classList.toggle('active',i===0));
}
/* Repopulate the name picker for the chosen area. Called on init, on area change,
   and again once the shared roster finishes loading from Firestore. */
function spgFillNames(){
  const sel=document.getElementById('spg-nama-sel');
  if(!sel)return;
  const area=document.getElementById('spg-area-sel').value;
  const prev=sel.value;
  sel.innerHTML='<option value="">— Pilih Nama SPG —</option>';
  (SPG_NAMES_BY_AREA[area]||[]).forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; sel.appendChild(o); });
  if(prev&&[...sel.options].some(o=>o.value===prev))sel.value=prev;
}
function spgAreaChanged(){
  spgFillNames();
  spgCheck(0);
}
function addNewSpgName(){
  const area=document.getElementById('spg-area-sel').value;
  if(!area){alert('Pilih area dulu sebelum tambah nama SPG.');return;}
  let nw=document.getElementById('spg-nama-input').value.trim();
  if(!nw)return;
  nw=canonicalSpgName(area,nw);
  const sel=document.getElementById('spg-nama-sel');
  if(![...sel.options].some(o=>o.value===nw)){
    saveSpgName(area,nw);
    spgFillNames();
  }
  sel.value=nw;
  document.getElementById('spg-nama-input').value='';
  document.getElementById('spg-nama-box').classList.remove('open');
  spgCheck(0);
}
function spgCheck(step){
  let ok=false;
  if(step===0){
    const area=document.getElementById('spg-area-sel').value;
    const nama=document.getElementById('spg-nama-sel').value||document.getElementById('spg-nama-input').value.trim();
    const date=document.getElementById('spg-date-input').value;
    ok=!!(area&&nama&&date);
    document.getElementById('spg-next-0').disabled=!ok;
  } else if(step===1){
    const store=document.getElementById('spg-store-sel').value||document.getElementById('spg-store-new').value.trim();
    ok=!!store;
    document.getElementById('spg-next-1').disabled=!ok;
  }
  return ok;
}
function spgNext(step){
  if(step===0){
    if(!spgCheck(0)) return;
    SG.area=document.getElementById('spg-area-sel').value;
    const typed=document.getElementById('spg-nama-input').value.trim();
    const picked=document.getElementById('spg-nama-sel').value;
    SG.nama=canonicalSpgName(SG.area,picked||typed);
    if(!picked&&typed)saveSpgName(SG.area,SG.nama);
    SG.date=document.getElementById('spg-date-input').value;
    const ss=document.getElementById('spg-store-sel');
    ss.innerHTML='<option value="">— Pilih Toko —</option>';
    const isIndogrosirSpg=SPG_INDOGROSIR_ONLY_NAMES.some(n=>_sameName(n,SG.nama));
    let storeList=SPG_STORES_BY_AREA[SG.area]||[];
    if(isIndogrosirSpg)storeList=storeList.filter(n=>/indogrosir/i.test(n));
    storeList.forEach(n=>{ const o=document.createElement('option'); o.value=n; o.textContent=n; ss.appendChild(o); });
  } else if(step===1){
    if(!spgCheck(1)) return;
    const box=document.getElementById('spg-store-box');
    const nw=canonicalSpgStore(SG.area,document.getElementById('spg-store-new').value);
    SG.store=(box.classList.contains('open')&&nw)?nw:document.getElementById('spg-store-sel').value;
    if(box.classList.contains('open')&&nw){
      if(!(SPG_STORES_BY_AREA[SG.area]||[]).some(s=>_sameName(s,nw))){ saveSpgStore(SG.area,nw); const o=document.createElement('option'); o.value=nw; o.textContent=nw; document.getElementById('spg-store-sel').appendChild(o); }
    }
    renderSpgItems();
  }
  spgStep=step+1;
  spgUpdateStepper();
  document.querySelectorAll('#s-spg .step-section').forEach((s,i)=>s.classList.toggle('active',i===spgStep));
  document.getElementById('spg-wrap').scrollTop=0;
}
function spgPrev(step){
  spgStep=step-1;
  spgUpdateStepper();
  document.querySelectorAll('#s-spg .step-section').forEach((s,i)=>s.classList.toggle('active',i===spgStep));
  document.getElementById('spg-wrap').scrollTop=0;
}
const SPG_PRIORITY_ITEMS=[
  // TS Beras (kecuali TS Shirataki Noodles)
  "TS BERAS PORANG INSTAN 12PCHX1000G",
  "TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
  "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G",
  "TS BERAS PORANG INSTAN NASI GORENG 12DX7SX38.5G",
  "TS BERAS MERAH ORGANIK 12PCHX1000G",
  // Oil
  "TS CANOLA OIL 12BTLX946ML",
  "TS CORN OIL 12BTLX946ML",
  "TS CORN OIL REF 16PCHX1000ML",
  "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML",
  "TS EXTRA LIGHT OLIVE OIL 12BTLX500ML",
  "TS SUNFLOWER OIL 12BTLX946ML",
  // Stevia
  "TS SWT STEVIA 24DX50SX1.8G",
  "TS SWT STEVIA 12DX100SX1.8G",
  // Diabtx Milk
  "TS DIABTX MILK VANILLA MALT 12DX150G",
  "TS DIABTX MILK VANILLA MALT 12DX500G",
  // TS Spread Jam
  "TS CHOCOLATE SPREAD 12BTLX300G",
  "TS ROYAL MATCHA SPREAD 12BTLX300G",
  "TS PEANUT ALMOND BUTTER 12BTLX300G",
  "TS BALI ARTISAN SEA SALT 12BTLX300G",
  "TS STRAWBERRY JAM 12BTLX375G",
  // HI LO Active Granola Berry Berry Honey
  "HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G",
  // HI LO School, HI LO Teen, HI LO Platinum (Hilo Box)
  "HI LO SCHOOL CHOCOLATE 12DX250G",
  "HI LO SCHOOL CHOCOLATE 12DX500G",
  "HI LO SCHOOL CHOCOLATE 6DX750G",
  "HI LO SCHOOL VANILLA 12DX250G",
  "HI LO SCHOOL VANILLA VEGIBERI 12DX500G",
  "HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
  "HI LO SCHOOL HONEY 12DX250G",
  "HI LO SCHOOL HONEY 12DX500G",
  "HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
  "HI LO SCHOOL BUBBLE GUM 12DX500G",
  "HI LO SCHOOL COTTON CANDY 12DX500G",
  "HI LO SCHOOL ORIGINAL 12DX12SX25G",
  "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G",
  "HI LO SCHOOL SUSU VANILLA 8GUSX10SX35G",
  "HI LO TEEN CHOCOLATE 12DX250G",
  "HI LO TEEN CHOCOLATE 12DX500G",
  "HI LO TEEN CHOCOLATE 6DX750G",
  "HI LO TEEN VANILLA CARAMEL 12DX250G",
  "HI LO TEEN VANILLA CARAMEL 12DX500G",
  "HI LO TEEN VANILLA CARAMEL 6DX750G",
  "HI LO TEEN KOREAN BANANA 12DX250G",
  "HI LO TEEN POPCORN CARAMEL 12DX500G",
  "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G",
  "HI LO TEEN HIPROTEIN MELON 12DX400G",
  "HI LO PLATINUM ORIGINAL 12DX12SX30G",
  "HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
  "HI LO PLATINUM +HMB VANILLA 12DX8SX42G",
  "HI LO PLATINUM +HMB CHOCO MOCHA 12DX8SX40G"
].filter(nm=>STOCK_PRODUCTS.some(g=>g.items.includes(nm)));
function spgGroupOf(name){
  for(const g of STOCK_PRODUCTS) if(g.items.includes(name)) return g.group;
  return '';
}
const SPG_GROUP_LABEL_OVERRIDE={'TS OILS':'TS Merah','TS BERAS':'TS Noodle'};
function spgGroupLabel(g){ return SPG_GROUP_LABEL_OVERRIDE[g]||g; }
function spgGroupItems(g){ const grp=STOCK_PRODUCTS.find(x=>x.group===g); return grp?grp.items:[]; }
const SPG_INDOGROSIR_GROUPS=[
  {label:'NS PLS', items: spgGroupItems('NS').filter(n=>/PLS/i.test(n)&&!/\bREF\b/i.test(n)&&!/BAG/i.test(n)&&!/\bFC\b/i.test(n))},
  {label:'HI LO DRINK PLS', items: spgGroupItems('HILO DRINK PLS')},
  {label:'HI LO SCHOOL PLS', items: spgGroupItems('HILO SCHOOL PLS')},
  {label:'NS RTD', items:['NS RTD JAMBU BIJI 24TPKX200ML','NS RTD SQUEEZED ORANGE 24TPKX200ML','NS RTD JERUK MADU 24TPKX200ML']},
  {label:'HI LO BOX', items:['HI LO ACTIVE CHOCOLATE 12DX250G','HI LO ACTIVE CHOCOLATE 12DX500G','HI LO GOLD CHOCOLATE 12DX250G','HI LO GOLD CHOCOLATE 12DX500G','HI LO GOLD ORIGINAL 12DX500G','HI LO GOLD VANILLA 12DX500G','HI LO SCHOOL CHOCOLATE 12DX250G','HI LO SCHOOL CHOCOLATE 12DX500G','HI LO SCHOOL CHOCOLATE 6DX750G','HI LO SCHOOL HONEY 12DX500G','HI LO TEEN CHOCOLATE 12DX500G','HI LO TEEN CHOCOLATE 6DX750G','HI LO TEEN VANILLA CARAMEL 12DX250G','HI LO TEEN VANILLA CARAMEL 6DX750G']},
  {label:'TS SWT', items: spgGroupItems('TS SWT').filter(n=>['TS DIABETAMIL SWT PLS 10PX80SX1G','TS SWT CLASSIC IND 12PX125SX2.5G','TS SWT CLASSIC 12DX100SX2.5G','TS SWT CLASSIC 24DX50SX2.5G','TS SWT CLASSIC 24DX25SX2.5G','TS SWT DIABTX 12DX100SX1.8G','TS SWT DIABTX 24DX50SX1.8G','TS SWT DIABTX 12DX25SX1.8G','TS SWT DIABTX PLS 10PX80SX1.8G'].includes(n))},
  {label:'TS MILK', items:['TS DIABETAMIL SWT 24DX50SX1G','TS LOW FAT MILK VANILLA 12DX180G']}
];
function spgIndogrosirItems(){ return SPG_INDOGROSIR_GROUPS.flatMap(g=>g.items); }
function spgIndogrosirGroupOf(name){ const g=SPG_INDOGROSIR_GROUPS.find(g=>g.items.includes(name)); return g?g.label:''; }
const SPG_SINAR_PLASTIK_GROUPS=[
  {label:'NS PLS', items: spgGroupItems('NS').filter(n=>/PLS/i.test(n)&&!/\bREF\b/i.test(n)&&!/BAG/i.test(n)&&!/\bFC\b/i.test(n))},
  {label:'NS Bag', items:['NS JERUK PERAS REF 12BAGX500G','NS PREMIUM JUS MANGGA REF PLS 12BAGX420G','NS LYCHEE TEA REF PLS 12BAGX400G']},
  {label:'HI LO DRINK PLS', items: spgGroupItems('HILO DRINK PLS')},
  {label:'HI LO SCHOOL PLS', items: spgGroupItems('HILO SCHOOL PLS')},
  {label:'TS SWT PLS', items: spgGroupItems('TS SWT').filter(n=>/PLS/i.test(n))}
];
function spgSinarPlastikItems(){ return SPG_SINAR_PLASTIK_GROUPS.flatMap(g=>g.items); }
function spgSinarPlastikGroupOf(name){ const g=SPG_SINAR_PLASTIK_GROUPS.find(g=>g.items.includes(name)); return g?g.label:''; }
function spgOrderedItems(){
  if(/^sinar plastik 3$/i.test((SG.store||'').trim())) return spgSinarPlastikItems();
  if(/indogrosir/i.test(SG.store||'')) return spgIndogrosirItems();
  const prio=new Set(SPG_PRIORITY_ITEMS);
  const rest=[];
  STOCK_PRODUCTS.forEach(group=>group.items.forEach(name=>{ if(!prio.has(name)) rest.push(name); }));
  return SPG_PRIORITY_ITEMS.concat(rest);
}
function renderSpgItems(){
  const list=document.getElementById('spg-item-list');
  list.innerHTML='';
  const order=spgOrderedItems();
  const isSinarPlastik=/^sinar plastik 3$/i.test((SG.store||'').trim());
  const isIndogrosir=!isSinarPlastik&&/indogrosir/i.test(SG.store||'');
  let lastGroup=null;
  order.forEach((name,fi)=>{
    if(isSinarPlastik){
      const g=spgSinarPlastikGroupOf(name);
      if(g!==lastGroup){
        const hdr=document.createElement('div');
        hdr.className='qty-group-hdr'; hdr.textContent=g;
        list.appendChild(hdr);
        lastGroup=g;
      }
    } else if(isIndogrosir){
      const g=spgIndogrosirGroupOf(name);
      if(g!==lastGroup){
        const hdr=document.createElement('div');
        hdr.className='qty-group-hdr'; hdr.textContent=g;
        list.appendChild(hdr);
        lastGroup=g;
      }
    } else if(fi<SPG_PRIORITY_ITEMS.length){
      if(fi===0){
        const hdr=document.createElement('div');
        hdr.className='qty-group-hdr'; hdr.style.color='#F59E0B'; hdr.textContent='⭐ PRIORITAS';
        list.appendChild(hdr);
      }
    } else {
      const g=spgGroupOf(name);
      if(g!==lastGroup){
        const hdr=document.createElement('div');
        hdr.className='qty-group-hdr'; hdr.textContent=spgGroupLabel(g);
        list.appendChild(hdr);
        lastGroup=g;
      }
    }
    const row=document.createElement('div');
    row.className='qty-row';
    row.innerHTML=
      '<div class="qty-name" style="flex:1;min-width:0">'+
        '<div style="font-size:10px;font-weight:600;line-height:1.3">'+name+'</div>'+
      '</div>'+
      '<div style="min-width:72px">'+
        '<div class="qty-ctrl" style="width:100%">'+
          '<button class="qty-btn" onclick="adjSG('+fi+',-1)" style="width:20px;font-size:12px">−</button>'+
          '<input type="number" class="qty-val" id="sg-qty-'+fi+'" value="0" min="0" style="width:28px;font-size:11px" oninput="spgCalcTotal()" onfocus="if(this.value==&quot;0&quot;)this.value=&quot;&quot;" onblur="if(this.value===&quot;&quot;)this.value=&quot;0&quot;">'+
          '<button class="qty-btn" onclick="adjSG('+fi+',1)" style="width:20px;font-size:12px">+</button>'+
        '</div>'+
      '</div>'+
      '<div id="sg-omz-'+fi+'" style="min-width:80px;text-align:right;font-size:10px;font-weight:700;color:var(--ok)">—</div>';
    list.appendChild(row);
  });
  spgCalcTotal();
}
function adjSG(i,d){
  const el=document.getElementById('sg-qty-'+i); if(!el) return;
  el.value=Math.max(0,(parseInt(el.value)||0)+d);
  spgCalcTotal();
}
function spgCalcTotal(){
  let total=0;
  spgOrderedItems().forEach((name,fi)=>{
    const ip=ITEM_PRICE[name]||{};
    const qty=parseInt(document.getElementById('sg-qty-'+fi)?.value)||0;
    const omz=qty*(ip.pcs||0);
    total+=omz;
    const oEl=document.getElementById('sg-omz-'+fi);
    if(oEl)oEl.textContent=omz?'Rp '+omz.toLocaleString('id-ID'):'—';
  });
  document.getElementById('spg-total-rp').textContent='Rp '+total.toLocaleString('id-ID');
  return total;
}
function spgGoReview(){
  SG.items={};
  SG.total=0;
  spgOrderedItems().forEach((name,fi)=>{
    const ip=ITEM_PRICE[name]||{};
    const qty=parseInt(document.getElementById('sg-qty-'+fi)?.value)||0;
    if(qty){ const omzet=qty*(ip.pcs||0); SG.items[name]={qty,omzet}; SG.total+=omzet; }
  });
  if(!Object.keys(SG.items).length){alert('Belum ada item jualan yang diisi.');return;}
  document.getElementById('spg-rev-area').textContent=SG.area;
  document.getElementById('spg-rev-nama').textContent=SG.nama;
  document.getElementById('spg-rev-store').textContent=SG.store;
  document.getElementById('spg-rev-date').textContent=spgDateLabel(SG.date);
  const tbody=document.getElementById('spg-review-body');
  tbody.innerHTML='';
  Object.entries(SG.items).forEach(([name,{qty,omzet}])=>{
    const tr=document.createElement('tr');
    tr.innerHTML='<td style="font-size:10px;padding:5px 8px;border-bottom:1px solid var(--border)">'+name+'</td>'+
      '<td style="text-align:center;padding:5px 8px;border-bottom:1px solid var(--border);font-weight:700">'+qty+'</td>'+
      '<td style="text-align:right;padding:5px 8px;border-bottom:1px solid var(--border);font-size:10px">Rp '+omzet.toLocaleString('id-ID')+'</td>';
    tbody.appendChild(tr);
  });
  document.getElementById('spg-rev-total').textContent='Rp '+SG.total.toLocaleString('id-ID');
  spgStep=3;
  spgUpdateStepper();
  document.querySelectorAll('#s-spg .step-section').forEach((s,i)=>s.classList.toggle('active',i===spgStep));
  document.getElementById('spg-wrap').scrollTop=0;
}
function spgDateLabel(dateStr){
  if(!dateStr)return'—';
  const d=new Date(dateStr+'T12:00:00');
  return d.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
function submitSpg(){
  const id='SPG-'+String(Math.floor(Math.random()*9000)+1000);
  document.getElementById('spg-success-store').textContent=SG.nama+' · '+SG.store+' · '+SG.area;
  document.getElementById('spg-success-total').textContent='Total Omzet: Rp '+SG.total.toLocaleString('id-ID');
  const salesTimestamp=SG.date?firebase.firestore.Timestamp.fromDate(new Date(SG.date+'T12:00:00')):firebase.firestore.FieldValue.serverTimestamp();
  if(typeof db!=='undefined'){
    withFirestoreRetry(()=>db.collection('spg_daily_logs').add({
      id, area:SG.area, nama:SG.nama, store:SG.store,
      tanggalJualan:SG.date,
      timestamp:salesTimestamp,
      submittedAt:firebase.firestore.FieldValue.serverTimestamp(),
      items:SG.items,
      totalOmzet:SG.total
    })).then(()=>console.log('spg_daily_logs write OK',id))
    .catch(e=>{console.error('spg_daily_logs FAILED',e);alert('Gagal menyimpan, silakan input ulang. ('+(e.code||'')+' — '+e.message+')');});
  } else { alert('DB not initialized'); }
  spgStep=4;
  spgUpdateStepper();
  document.querySelectorAll('#s-spg .step-section').forEach((s,i)=>s.classList.toggle('active',i===spgStep));
  document.getElementById('spg-wrap').scrollTop=0;
}
function spgItemLine(name,qty,omzet){
  const line=qty+' rc = Rp '+omzet.toLocaleString('id-ID');
  if(omzet>150000)return '• *'+name+'*\n   *'+line+'*\n';
  return '• '+name+'\n   '+line+'\n';
}
function shareSpgWhatsApp(){
  const tgl=spgDateLabel(SG.date);
  const isSinarPlastik=/^sinar plastik 3$/i.test((SG.store||'').trim());
  const isIndogrosir=!isSinarPlastik&&/indogrosir/i.test(SG.store);
  let text='*REPORT HARIAN SPG*\n';
  text+='📅 '+tgl+'\n';
  text+='👤 '+SG.nama+'\n';
  text+='🏪 '+SG.store+' ('+SG.area+')\n';
  text+='─────────────────\n';
  if(isSinarPlastik){
    const prioMatch=name=>name.includes('JERUK PERAS')&&!name.includes('BAG');
    const nsBagNames=new Set(['NS JERUK PERAS REF 12BAGX500G','NS PREMIUM JUS MANGGA REF PLS 12BAGX420G','NS LYCHEE TEA REF PLS 12BAGX400G']);
    const entries=Object.entries(SG.items);
    const nsAll=entries.filter(([name])=>(spgGroupOf(name)==='NS'&&name.includes('PLS')&&!nsBagNames.has(name))||nsBagNames.has(name));
    const nsTea=nsAll.filter(([name])=>name.includes('TEA')&&!nsBagNames.has(name));
    const nsBag=nsAll.filter(([name])=>nsBagNames.has(name));
    const nsRasa=nsAll.filter(([name])=>!nsBagNames.has(name)&&!name.includes('TEA')&&!prioMatch(name));
    const hiloAll=entries.filter(([name])=>{ const g=spgGroupOf(name); return g==='HILO DRINK PLS'||g==='HILO SCHOOL PLS'; });
    const used=new Set([...nsTea,...nsRasa,...nsBag,...hiloAll].map(([name])=>name));
    const lainEntries=entries.filter(([name])=>!used.has(name));
    const sumQty=arr=>arr.reduce((s,[,{qty}])=>s+qty,0);
    const sumOmz=arr=>arr.reduce((s,[,{omzet}])=>s+omzet,0);
    if(nsAll.length){
      text+='🍊 *ALL NS*\n   '+sumQty(nsAll)+' rc = Rp '+sumOmz(nsAll).toLocaleString('id-ID')+'\n';
      text+='─────────────────\n';
    }
    if(nsTea.length){
      text+='🍵 *NS TEA*\n   '+sumQty(nsTea)+' rc = Rp '+sumOmz(nsTea).toLocaleString('id-ID')+'\n';
      nsTea.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    if(nsRasa.length){
      text+='🍹 *NS RASA-RASA*\n   '+sumQty(nsRasa)+' rc = Rp '+sumOmz(nsRasa).toLocaleString('id-ID')+'\n';
      nsRasa.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    if(nsBag.length){
      text+='📦 *NS BAG*\n   '+sumQty(nsBag)+' rc = Rp '+sumOmz(nsBag).toLocaleString('id-ID')+'\n';
      nsBag.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    if(hiloAll.length){
      text+='🥛 *HI LO*\n   '+sumQty(hiloAll)+' rc = Rp '+sumOmz(hiloAll).toLocaleString('id-ID')+'\n';
      hiloAll.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    if(lainEntries.length){
      text+='*ITEM LAINNYA*\n';
      lainEntries.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    text+='*TOTAL OMZET: Rp '+SG.total.toLocaleString('id-ID')+'*';
    location.href='https://wa.me/?text='+encodeURIComponent(text);
    return;
  }
  if(isIndogrosir){
    const isAso=SG.area==='Manado'||SG.area==='Gorontalo';
    const prioMatch=name=>isAso?name.includes('AMERICAN SWEET ORANGE'):name.includes('JERUK PERAS');
    const entries=Object.entries(SG.items);
    const nsAll=entries.filter(([name])=>spgGroupOf(name)==='NS'&&name.includes('PLS'));
    const nsTea=nsAll.filter(([name])=>name.includes('TEA'));
    const nsRasa=nsAll.filter(([name])=>!name.includes('TEA')&&!prioMatch(name));
    const hiloAll=entries.filter(([name])=>{ const g=spgGroupOf(name); return g==='HILO DRINK PLS'||g==='HILO SCHOOL PLS'; });
    const used=new Set([...nsTea,...nsRasa,...hiloAll].map(([name])=>name));
    const lainEntries=entries.filter(([name])=>!used.has(name)&&!name.includes('PLS'));
    const sumQty=arr=>arr.reduce((s,[,{qty}])=>s+qty,0);
    const sumOmz=arr=>arr.reduce((s,[,{omzet}])=>s+omzet,0);
    if(nsAll.length){
      text+='🍊 *ALL NS*\n   '+sumQty(nsAll)+' rc = Rp '+sumOmz(nsAll).toLocaleString('id-ID')+'\n';
      text+='─────────────────\n';
    }
    if(nsTea.length){
      text+='🍵 *NS TEA*\n   '+sumQty(nsTea)+' rc = Rp '+sumOmz(nsTea).toLocaleString('id-ID')+'\n';
      nsTea.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    if(nsRasa.length){
      text+='🍹 *NS RASA-RASA*\n   '+sumQty(nsRasa)+' rc = Rp '+sumOmz(nsRasa).toLocaleString('id-ID')+'\n';
      nsRasa.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    if(hiloAll.length){
      text+='🥛 *HI LO*\n   '+sumQty(hiloAll)+' rc = Rp '+sumOmz(hiloAll).toLocaleString('id-ID')+'\n';
      hiloAll.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    if(lainEntries.length){
      text+='*ITEM LAINNYA*\n';
      lainEntries.forEach(([name,{qty,omzet}])=>{ text+=spgItemLine(name,qty,omzet); });
      text+='─────────────────\n';
    }
    const polosEntries=entries.filter(([name])=>name.includes('PLS'));
    const nonPolosEntries=entries.filter(([name])=>!name.includes('PLS'));
    const polosTotal=sumOmz(polosEntries);
    const nonPolosTotal=sumOmz(nonPolosEntries);
    text+='*Total Omzet Polos: Rp '+polosTotal.toLocaleString('id-ID')+'*\n';
    text+='*Total Omzet Non Polos: Rp '+nonPolosTotal.toLocaleString('id-ID')+'*\n';
    text+='*TOTAL OMZET KESELURUHAN: Rp '+SG.total.toLocaleString('id-ID')+'*';
    location.href='https://wa.me/?text='+encodeURIComponent(text);
    return;
  }
  const prioSet=new Set(SPG_PRIORITY_ITEMS);
  const prioEntries=Object.entries(SG.items).filter(([name])=>prioSet.has(name));
  const lainEntries=Object.entries(SG.items).filter(([name])=>!prioSet.has(name));
  const prioTotal=prioEntries.reduce((s,[,{omzet}])=>s+omzet,0);
  const lainTotal=lainEntries.reduce((s,[,{omzet}])=>s+omzet,0);
  if(prioEntries.length){
    text+='⭐ *PRIORITAS*\n';
    prioEntries.forEach(([name,{qty,omzet}])=>{
      const line=qty+' rnc = Rp '+omzet.toLocaleString('id-ID');
      if(qty>=5)text+='• *'+name+'*\n   *'+line+'*\n';
      else text+='• '+name+'\n   '+line+'\n';
    });
    text+='_Subtotal Prioritas: Rp '+prioTotal.toLocaleString('id-ID')+'_\n';
    text+='─────────────────\n';
  }
  if(lainEntries.length){
    text+='*ITEM LAINNYA*\n';
    const lainByGroup={};
    lainEntries.forEach(([name,{qty,omzet}])=>{
      const g=spgGroupLabel(spgGroupOf(name))||'Lainnya';
      if(!lainByGroup[g])lainByGroup[g]={qty:0,omzet:0};
      lainByGroup[g].qty+=qty; lainByGroup[g].omzet+=omzet;
    });
    Object.entries(lainByGroup).forEach(([g,{qty,omzet}])=>{
      text+='• '+g+'\n   '+qty+' rnc = Rp '+omzet.toLocaleString('id-ID')+'\n';
    });
    text+='_Subtotal Lainnya: Rp '+lainTotal.toLocaleString('id-ID')+'_\n';
    text+='─────────────────\n';
  }
  text+='*TOTAL OMZET: Rp '+SG.total.toLocaleString('id-ID')+'*';
  location.href='https://wa.me/?text='+encodeURIComponent(text);
}
function resetSpg(){ initSpg(); document.getElementById('spg-wrap').scrollTop=0; }
function spgUpdateStepper(){
  ['gs0','gs1','gs2','gs3'].forEach((id,i)=>{
    const el=document.getElementById(id); if(!el) return;
    el.className='s-item'+(i<spgStep?' done':i===spgStep?' active':'');
    el.querySelector('.s-dot').textContent=i<spgStep?'✓':(i+1);
  });
}
