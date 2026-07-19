// Route old getElementById('table-head/body') to correct suffixed IDs — cache-proof patch
(function(){const _g=document.getElementById.bind(document);document.getElementById=function(id){const T=typeof TAB!=='undefined'?TAB:'rka';if(id==='table-head')return _g(T==='beli'?'table-head-beli':'table-head-rka')||_g(id);if(id==='table-body')return _g(T==='beli'?'table-body-beli':'table-body-rka')||_g(id);if(id==='tfoot')return _g(T==='beli'?'tfoot-beli':T==='stock'?'tfoot-stock':'tfoot-rka')||_g(id);return _g(id);};})();

const DASH_PIN='NFI2026';
const MDS_BY_AREA={
  'Bau Bau':['Rizal'],
  'Bone':['A. Arwandi Amrah','M. Murdiono Arma'],
  'Gorontalo':['Aditya Hulopi','Mohammad Rahman Marwan','Abd. Rahman Lahay','Satrio Yusuf'],
  'Kendari':['Laode Asrad Ilhamid','Abdul Rahman (Rangga)','Dwi Haryanto','Rosa Sasmita'],
  'Luwuk':['Kadek Adi Merta Sastrawan'],
  'Makassar':['Sulfiana Rusdy','A. Mappanyukki','Andi Iswan Tenri Bau','Rahmat','Hasrar','Andi Muh. Nurfikrahturrahman','Nurul Ramadhani','Syafri'],
  'Mamuju':['Muhammad Rizky Sandria','Sugiono'],
  'Manado':['Melisa Pungky Mapaliey','Rivanti Gusti Husein','Ignacia Regina Naung','Ridlan Mangilong','Tesar','Meilani Watung'],
  'Palopo':['Tio Setiawan Rappun','Hijrayanti Mahruddin','Firman'],
  'Palu':['Muh Nasir K','Yuliana Rusli','Rafdi'],
  'Pare-Pare':['Marwan'],
  'Poso':['Syaifullah'],
};
const NS_PRICE=11250, HILO_PRICE=16000, HILOPLS_PRICE=31500;
// NS items to spotlight (partial match is fine)
const NS_JP_KEY  = 'NS JERUK PERAS PLS';
const NS_ASO_KEY = 'NS AMERICAN SWEET ORANGE PLS';

var db;
try{const FB={apiKey:"AIzaSyCtYc8uZICLzQrA1b7l00Yo_9V_rqNVOu0",authDomain:"mds-visit.firebaseapp.com",projectId:"mds-visit",storageBucket:"mds-visit.firebasestorage.app",messagingSenderId:"732603054928",appId:"1:732603054928:web:9f946bfa13d56d860a8a55"};
firebase.initializeApp(FB);
db=firebase.firestore();}catch(e){console.warn("Firebase init failed",e);}

var dbSulawesi;
try{const FB2={apiKey:"AIzaSyCA8Q8athqYIsY3By5wPxcU97GjDBR6DAs",authDomain:"mds-sulawesi.firebaseapp.com",projectId:"mds-sulawesi",storageBucket:"mds-sulawesi.firebasestorage.app",messagingSenderId:"511949021685",appId:"1:511949021685:web:bc32007af0555449e7c0bc"};
const sulawesiApp=firebase.initializeApp(FB2,"sulawesi");
dbSulawesi=sulawesiApp.firestore();}catch(e){console.warn("Firebase (sulawesi) init failed",e);}

let RKA_ALL=[],BELI_ALL=[],TAB='rka',DF='',NM=0,MF='',RF_FROM='',RF_TO='',SC='timestamp',SD=-1,FI='';
function isLightTheme(){return document.documentElement.getAttribute('data-theme')==='light';}
function ov(n){
  const dark=['','rgba(255,255,255,.015)','rgba(255,255,255,.03)','rgba(255,255,255,.04)','rgba(255,255,255,.06)','rgba(255,255,255,.07)'];
  const light=['','rgba(60,50,30,.025)','rgba(60,50,30,.04)','rgba(60,50,30,.05)','rgba(60,50,30,.08)','rgba(60,50,30,.12)'];
  return isLightTheme()?light[n]:dark[n];
}
function applyTheme(t){
  document.documentElement.setAttribute('data-theme',t);
  localStorage.setItem('mds_theme',t);
  const btn=document.getElementById('theme-toggle');
  if(btn)btn.textContent=t==='light'?'☀️':'🌙';
}
function toggleTheme(){
  applyTheme(isLightTheme()?'dark':'light');
  render();
}
applyTheme(localStorage.getItem('mds_theme')||'dark');
let _expandedRkaVid=null,_expandedBeliVid=null;
let KEDAI_DB={stores:[],meta:null},PJMDS_SEL=null,PJMDS_SHOW_TOKO=false;
let PJMDS_MANUAL_MATCH={};
let PJ_ROUTE_DATE=null;
let cAV=null,cTrend=null,cBrand=null,mcAV=null,mcBrand=null;

// ── PIN ─────────────────────────────────────────────────────────────────────
function checkPin(){
  if(document.getElementById('pin-input').value===DASH_PIN){
    document.getElementById('pin-screen').classList.add('hidden');
    document.getElementById('app').classList.add('visible');
    initDash();
  }else{
    document.getElementById('pin-err').textContent='PIN salah, coba lagi.';
    document.getElementById('pin-input').value='';
  }
}
document.getElementById('pin-input').focus();

// ── HELPERS ─────────────────────────────────────────────────────────────────
function brandOf(n){
  if(!n)return'O';const u=n.toUpperCase();
  if(u.startsWith('HI LO')||u.startsWith('HILO'))return'HILO';
  if(u.startsWith('NS '))return'NS';
  if(u.startsWith('TS '))return'TS';
  return'O';
}
function isJP(n){return n&&n.toUpperCase().includes('NS JERUK PERAS PLS');}
function isASO(n){return n&&n.toUpperCase().includes('NS ASO PLS');}
function kalc(r){return((r.groupTotals&&r.groupTotals.NS||0)*NS_PRICE)+((r.groupTotals&&r.groupTotals.HILO||0)*HILO_PRICE)+((r.groupTotals&&r.groupTotals.HILOPLS||0)*HILOPLS_PRICE);}
function rp(n){return'Rp '+Math.round(n).toLocaleString('id-ID');}
function fmtNum(n){return Math.round(n||0).toLocaleString('id-ID');}
// Stock item category helpers
const ITEM_PRICE={"TS EXTRA LIGHT OLIVE OIL 12BTLX500ML":{"ctn":1500000,"pcs":125000},"TS BERAS PORANG INSTAN 12PCHX1000G":{"ctn":2112000,"pcs":176000},"TS BERAS PORANG INSTAN SACHET 12DX10SX40G":{"ctn":780000,"pcs":65000},"TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML":{"ctn":1656000,"pcs":138000},"TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G":{"ctn":780000,"pcs":65000},"TS CANOLA OIL 12BTLX946ML":{"ctn":840000,"pcs":70000},"TS SWT CLASSIC IND 12PX125SX2.5G":{"ctn":900000,"pcs":75000},"HI LO PLATINUM ORIGINAL 12DX12SX30G":{"ctn":1272000,"pcs":106000},"TS SWT DIABTX 12DX100SX1.8G":{"ctn":936000,"pcs":78000},"HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G":{"ctn":1080000,"pcs":90000},"TS CORN OIL 12BTLX946ML":{"ctn":1080000,"pcs":90000},"TS CORN OIL REF 16PCHX1000ML":{"ctn":1520000,"pcs":95000},"TS SWT CLASSIC 12DX100SX2.5G":{"ctn":912000,"pcs":76000},"TS BERAS MERAH ORGANIK 12PCHX1000G":{"ctn":528000,"pcs":44000},"TS SWT CLASSIC 24DX50SX2.5G":{"ctn":960000,"pcs":40000},"TS SOY SAUCE 24BTLX200ML":{"ctn":636000,"pcs":26500},"TS HONEY 12BTLX350ML":{"ctn":744000,"pcs":62000},"TS COOKIES HOKKAIDO CHEESE 12DX5SX20G":{"ctn":276000,"pcs":23000},"TS CHOCOLATE SPREAD 12BTLX300G":{"ctn":1056000,"pcs":88000},"HI LO PLATINUM +HMB VANILLA 12DX8SX42G":{"ctn":1500000,"pcs":125000},"TS SUNFLOWER OIL 12BTLX946ML":{"ctn":912000,"pcs":76000},"HI LO SCHOOL VANILLA 12DX250G":{"ctn":480000,"pcs":40000},"TS SWT DIABTX 24DX50SX1.8G":{"ctn":1008000,"pcs":42000},"TS NFDM FIBER PRO 6DX500G":{"ctn":624000,"pcs":104000},"HI LO TEEN CHOCOLATE 12DX500G":{"ctn":960000,"pcs":80000},"TS PEANUT ALMOND BUTTER 12BTLX300G":{"ctn":816000,"pcs":68000},"TS STRAWBERRY JAM 12BTLX375G":{"ctn":816000,"pcs":68000},"TS SWT STEVIA 24DX50SX1.8G":{"ctn":1416000,"pcs":59000},"HI LO TEEN CHOCOLATE 6DX750G":{"ctn":696000,"pcs":116000},"HI LO SCHOOL CHOCOLATE 12DX500G":{"ctn":924000,"pcs":77000},"HI LO GOLD ORIGINAL 6DX750G":{"ctn":702000,"pcs":117000},"HI LO SCHOOL CHOCOLATE 6DX750G":{"ctn":684000,"pcs":114000},"L-MEN PLATINUM BASIC UNFLAVOURED 6PCHX800G":{"ctn":1980000,"pcs":330000},"TS GULA JAWA 12BTLX350ML":{"ctn":708000,"pcs":59000},"TS COLLAGEN DRINK STRAWBERRY 12KLRX200G":{"ctn":1980000,"pcs":165000},"NS AMERICAN SWEET ORANGE PLS 18PX40SX14G":{"ctn":810000,"pcs":11250},"TS KENTAL MANIS 24BTLX150ML":{"ctn":744000,"pcs":31000},"HI LO SCHOOL COKELAT SUSU PLS 12RX10SX30G":{"ctn":378000,"pcs":31500},"TS NFDM ORIGINAL 6DX1000G":{"ctn":1104000,"pcs":184000},"TS NFDM COFFEE 12DX500G":{"ctn":1248000,"pcs":104000},"HI LO TEEN VANILLA CARAMEL 6DX750G":{"ctn":696000,"pcs":116000},"NS JERUK PERAS PLS 18PX40SX14G":{"ctn":810000,"pcs":11250},"HI LO TEEN VANILLA CARAMEL 12DX500G":{"ctn":960000,"pcs":80000},"TS LOW FAT MILK VANILLA 12DX500G":{"ctn":936000,"pcs":78000},"TS RTD OAT DRINK VANILLICIOUS 24TPKX190ML":{"ctn":180000,"pcs":7500},"TS 7 FRUITS FIBER DAILY 12DX12SX15G":{"ctn":1224000,"pcs":102000},"HI LO SCHOOL VANILLA SUSU PLS 12RX10SX27G":{"ctn":378000,"pcs":31500},"L-MEN PROTEIN 2GO RTD CHOCOLATE 24TPKX200ML":{"ctn":276000,"pcs":11500},"TS DIABETAMIL SWT 24DX50SX1G":{"ctn":552000,"pcs":23000},"NS LEMON TEA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"TS ROYAL MATCHA SPREAD 12BTLX300G":{"ctn":1080000,"pcs":90000},"HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G":{"ctn":924000,"pcs":77000},"TS COOKIES CHOCOLATE 12DX10SX20G":{"ctn":540000,"pcs":45000},"HI LO SCHOOL HONEY 12DX500G":{"ctn":924000,"pcs":77000},"TS SWT CLASSIC 24DX25SX2.5G":{"ctn":528000,"pcs":22000},"HI LO PLATINUM +HMB CHOCO MOCHA 12DX8SX40G":{"ctn":1500000,"pcs":125000},"L-MEN PLATINUM CHOCO LATTE 6DX6SX38.5G":{"ctn":720000,"pcs":120000},"TS CAFE LATTE 12DX10SX14G":{"ctn":336000,"pcs":28000},"HI LO SCHOOL SUSU VANILLA 8GUSX10SX35G":{"ctn":384000,"pcs":48000},"TS RTD ALMOND DRINK CHOCOLICIOUS 24TPKX190ML":{"ctn":199200,"pcs":8300},"HI LO ACTIVE CHOCOLATE 6DX750G":{"ctn":630000,"pcs":105000},"TS NFDM CHOCOLATE 12DX500G":{"ctn":1248000,"pcs":104000},"TS SWT DIABTX 12DX25SX1.8G":{"ctn":276000,"pcs":23000},"TS DIABTX MILK VANILLA MALT 12DX500G":{"ctn":1236000,"pcs":103000},"NS MARKISA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS LYCHEE TEA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"L-MEN LOSE WEIGHT CHOCOLATE CEREAL 6DX12SX25G":{"ctn":792000,"pcs":132000},"NS BLACKCURRANT TEA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"HI LO ACTIVE CHOCOLATE 12DX500G":{"ctn":900000,"pcs":75000},"TS BUMBU KALDU AYAM JAMUR 24PX100G":{"ctn":552000,"pcs":23000},"NS SWEET MANGO PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"HI LO ACTIVE HIPROTEIN BERRY FITSHAKE 12DX8SX33.5G":{"ctn":1440000,"pcs":120000},"L-MEN ADVANCE GOLD VANILLA 6DX500G":{"ctn":1080000,"pcs":180000},"TS WHITE COFFEE 12DX4SX15G":{"ctn":216000,"pcs":18000},"NS JERUK MANIS REF 12DX500G":{"ctn":420000,"pcs":35000},"L-MEN PROTEIN BAR CHOCOLATE 6SBX12SX22G":{"ctn":690000,"pcs":9583},"HI LO SCHOOL VANILLA VEGIBERI 6DX750G":{"ctn":684000,"pcs":114000},"TS SANTAN 24DX5SX20G":{"ctn":456000,"pcs":19000},"NS JERUK (EX) MANIS PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"L-MEN PROTEIN 2GO RTD CAPPUCCINO 24TPKX190ML":{"ctn":276000,"pcs":11500},"HI LO GOLD CHOCOLATE 12DX500G":{"ctn":960000,"pcs":80000},"TS COOKIES KOREAN GARLIC BUTTER 12DX5SX20G":{"ctn":276000,"pcs":23000},"HI LO SCHOOL VANILLA VEGIBERI 12DX500G":{"ctn":924000,"pcs":77000},"TS WAFER KOREAN STRAWBERRY CHEESE 12DX5SX20G":{"ctn":264000,"pcs":22000},"L-MEN GAINMASS CHOCOLATE 6DX500G":{"ctn":912000,"pcs":152000},"L-MEN GAINMASS CHOCOLATE 12DX225G":{"ctn":900000,"pcs":75000},"TS RTD COLLAGEN SHOT PEACH BLOSSOM 24TPKX190ML":{"ctn":180000,"pcs":7500},"TS SYRUP COCOPANDAN 12BTLX750ML":{"ctn":360000,"pcs":30000},"NS ANGGUR PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"HI LO ACTIVE VANILLA 12DX500G":{"ctn":900000,"pcs":75000},"TS SYRUP LYCHEE 12BTLX750ML":{"ctn":360000,"pcs":30000},"NS PREMIUM JUS MANGGA PLS 12RX10SX15G":{"ctn":192000,"pcs":16000},"TS AVOCADO COFFEE 12DX4SX14G":{"ctn":192000,"pcs":16000},"TS SWT CLASSIC REF 24DX100G":{"ctn":672000,"pcs":28000},"TS COOKIES KLEPON 12DX5SX20G":{"ctn":276000,"pcs":23000},"TS COOKIES KOREAN GOGUMA 12DX5SX20G":{"ctn":276000,"pcs":23000},"NS W'DANK SEREH JAHE NIPIS PLS 12RX10SX11G":{"ctn":192000,"pcs":16000},"HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G":{"ctn":384000,"pcs":48000},"HI LO TEEN CHOCOLATE 12DX250G":{"ctn":504000,"pcs":42000},"HI LO TEEN VANILLA CARAMEL 12DX250G":{"ctn":504000,"pcs":42000},"HI LO ACTIVE CLEAR PROTEIN PEACH 12PX8SX30G":{"ctn":1500000,"pcs":125000},"TS SWT GULA AREN 24DX50SX2G":{"ctn":972000,"pcs":40500},"NS PEACH TEA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS JERUK MANIS REF 12DX250G":{"ctn":240000,"pcs":20000},"TS COLLAGEN DRINK STRAWBERRY STICK 12DX6SX12G":{"ctn":720000,"pcs":60000},"TS SAUS TIRAM 24BTLX200ML":{"ctn":720000,"pcs":30000},"HI LO SCHOOL CHOCOLATE 12DX250G":{"ctn":468000,"pcs":39000},"TS SYRUP ORANGE 12BTLX750ML":{"ctn":360000,"pcs":30000},"TS LOW FAT MILK KOREAN STRAWBERRY 12DX500G":{"ctn":936000,"pcs":78000},"L-MEN PROTEIN BAR STRONGBERY 6SBX12SX20G":{"ctn":690000,"pcs":9583},"HI LO DRINK RTD CHOCOFIT 24TPKX200ML":{"ctn":264000,"pcs":11000},"NS RTD JAMBU BIJI 24TPKX200ML":{"ctn":141600,"pcs":5900},"HI LO DRINK CHOCO MALT PLS 8RX10SX14G":{"ctn":128000,"pcs":16000},"NS JERUK PERAS REF 12BAGX500G":{"ctn":420000,"pcs":35000},"HI LO ACTIVE VANILLA 12DX200G":{"ctn":408000,"pcs":34000},"TS SWT CLASSIC REF 12DX500G":{"ctn":1212000,"pcs":101000},"TS RTD ALMOND DRINK BANANA DELIGHT 24TPKX190ML":{"ctn":199200,"pcs":8300},"TS SALTY SOY SAUCE 24BTLX200ML":{"ctn":588000,"pcs":24500},"HI LO SCHOOL BUBBLE GUM 12DX500G":{"ctn":924000,"pcs":77000},"HI LO 3IN1 SUSU COKLAT BELGIA PLS 12RX10SX25G":{"ctn":378000,"pcs":31500},"HI LO SCHOOL STRAWBERRY PLS 12RX10SX27G":{"ctn":378000,"pcs":31500},"HI LO SCHOOL RTD COKELAT 24TPKX200ML":{"ctn":163200,"pcs":6800},"NS RTD JERUK MADU 24TPKX200ML":{"ctn":141600,"pcs":5900},"NS APPLE TEA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS ORANGE TEA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS JERUK NIPIS PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"TS LOW FAT MILK VANILLA 12DX180G":{"ctn":420000,"pcs":35000},"TS DIABTX MILK VANILLA MALT 12DX150G":{"ctn":414000,"pcs":34500},"HI LO DRINK SWISS CHOCOLATE PLS 8RX10SX28G":{"ctn":152000,"pcs":19000},"TS MINT COCOA 12DX4SX15G":{"ctn":204000,"pcs":17000},"NS LOKALATE KOPI GULA AREN PLS 12RX10SX15G":{"ctn":192000,"pcs":16000},"HI LO TEEN HIPROTEIN MELON 12DX400G":{"ctn":960000,"pcs":80000},"HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G":{"ctn":960000,"pcs":80000},"L-MEN ADVANCE CHOCO VANILLA 6DX500G":{"ctn":960000,"pcs":160000},"HI LO GOLD ORIGINAL 12DX500G":{"ctn":936000,"pcs":78000},"HI LO ACTIVE POWERMELON 12DX7SX32G":{"ctn":936000,"pcs":78000},"HI LO SCHOOL COTTON CANDY 12DX500G":{"ctn":924000,"pcs":77000},"NS SEMANGKA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"TS BALI ARTISAN SEA SALT 12BTLX300G":{"ctn":600000,"pcs":50000},"L-MEN PROTEIN 2GO RTD OGURA 24TPKX190ML":{"ctn":288000,"pcs":12000},"NS W'DANK JAHE KAYU MANIS 24DX4SX15G":{"ctn":288000,"pcs":12000},"NS RTD SQUEEZED ORANGE 24TPKX200ML":{"ctn":141600,"pcs":5900},"HI LO ACTIVE BELGIAN CHOCOLATE 8GUSX10SX30G":{"ctn":424000,"pcs":53000},"NS FLORIDA ORANGE PLS 18PX40SX11G":{"ctn":810000,"pcs":11250},"NS MILKY ORANGE PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS LESS SUGAR JERUK PONTIANAK PLS 4PX40SX6G":{"ctn":180000,"pcs":11250},"NS MELON PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"TS RTD OAT DRINK CANTALOUPE MELON 24TPKX190ML":{"ctn":180000,"pcs":7500},"HI LO DRINK CHOCO HAZELNUT PLS 15RX10SX14G":{"ctn":240000,"pcs":16000},"L-MEN DAILY CHOCOLATE 12DX250G":{"ctn":708000,"pcs":59000},"HI LO GOLD CHOCOLATE 6DX750G":{"ctn":702000,"pcs":117000},"TS SWEET ORANGE 12DX10SX6G":{"ctn":234000,"pcs":19500},"TS SWT CLASSIC REF 12DX250G":{"ctn":696000,"pcs":58000},"TS DRIP COFFEE SEVILLE ORANGE 12DX4SX12G":{"ctn":660000,"pcs":55000},"HI LO TEEN RTD COKELAT 24TPKX200ML":{"ctn":163200,"pcs":6800},"L-MEN ISOPOWER STARGIZING 6DX30SX7.8G":{"ctn":618000,"pcs":103000},"L-MEN ADVANCE CAPPUCINO 12DX250G":{"ctn":1056000,"pcs":88000},"HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G":{"ctn":600000,"pcs":50000},"NS LOKALATE KOPI ALPUKAT PLS 12RX10SX15G":{"ctn":192000,"pcs":16000},"HI LO ACTIVE BELGIAN CHOCOLATE 14GUSX4SX30G":{"ctn":315000,"pcs":22500},"TS SWT LEMON 12DX25SX2.5G":{"ctn":288000,"pcs":24000},"NS LECI PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS MADU LEMON PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS JERUK MAROKO PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"HI LO DRINK THAI TEA PLS 8RX10SX15G":{"ctn":128000,"pcs":16000},"HI LO GOLD CHOCOLATE 12DX250G":{"ctn":504000,"pcs":42000},"HI LO TEEN KOREAN BANANA 12DX250G":{"ctn":504000,"pcs":42000},"HI LO TEEN RTD COFFEE TIRAMISU 24TPKX200ML":{"ctn":163200,"pcs":6800},"HI LO DRINK CHOCOLATE PLS 15RX10SX14G":{"ctn":240000,"pcs":16000},"HI LO DRINK CREAMY MARIE PLS 15RX10SX14G":{"ctn":240000,"pcs":16000},"NS AMERICAN SWEET ORANGE FC 72OX10SX14G":{"ctn":936000,"pcs":13000},"NS FLORIDA ORANGE FC 72OX10SX11G":{"ctn":936000,"pcs":13000},"NS JERUK NIPIS 72OX10SX11G":{"ctn":936000,"pcs":13000},"HI LO ACTIVE CHOCOLATE 12DX250G":{"ctn":456000,"pcs":38000},"HI LO GOLD VANILLA 12DX500G":{"ctn":936000,"pcs":78000},"HI LO GOLD VANILLA 12DX200G":{"ctn":444000,"pcs":37000},"NS W'DANK BAJIGUR 24DX4SX15G":{"ctn":288000,"pcs":12000},"NS KELAPA MUDA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS LESS SUGAR JERUK SONKIT PLS 4PX40SX6G":{"ctn":180000,"pcs":11250},"NS NANAS PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS SIRSAK PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS SWEET GUAVA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS ANGGUR HIJAU PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"HI LO DRINK RTD MILKY BROWN SUGAR 24TPKX200ML":{"ctn":163200,"pcs":6800},"NS JERUK JEJU FC 72OX10SX11G":{"ctn":1152000,"pcs":16000},"TS SWT I SWEET 12DX25SX1.5G":{"ctn":288000,"pcs":24000},"HI LO DRINK TEH TARIK PLS 8RX10SX15G":{"ctn":128000,"pcs":16000},"L-MEN PROTEIN CRUNCH BBQ BEEF 20BAGX20G":{"ctn":250000,"pcs":12500},"HI LO DRINK CHOCOLATE BANANA PLS 15RX10SX14G":{"ctn":240000,"pcs":16000},"HI LO DRINK CHOCOLATE TARO PLS 15RX10SX14G":{"ctn":240000,"pcs":16000},"HI LO GOLD ORIGINAL 12DX200G":{"ctn":444000,"pcs":37000},"HI LO DRINK WHITE CHOCOLATE PLS 15RX10SX14G":{"ctn":240000,"pcs":16000},"HI LO DRINK CHOCO HAZELNUT 8GUSX10SX14G":{"ctn":220000,"pcs":27500},"NS JERUK PERAS 72GUSX5SX14G":{"ctn":590400,"pcs":8200},"NS MANGGA GANDARIA PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS COCOPANDAN PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS STRAWBERRY PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS BLEWAH PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS LOKALATE KOPI SHOWBERRY 24DX4SX15G":{"ctn":288000,"pcs":12000},"NS MADU JERUK PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS BRAZILIAN SWEET ORANGE FC 72OX10SX11G":{"ctn":936000,"pcs":13000},"NS APEL JERUK PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"HI LO SCHOOL RTD VEGIBERI 24TPKX200ML":{"ctn":163200,"pcs":6800},"HI LO DRINK RTD CHOCOLATE TARO 24TPKX200ML":{"ctn":141600,"pcs":5900},"TS SWT GULA BUAH 24DX50SX2.5G":{"ctn":984000,"pcs":41000},"HI LO DRINK RTD PROTEIN BERRYFIT 24TPKX190ML":{"ctn":264000,"pcs":11000},"TS SHIRATAKI NOODLES 40OX71G":{"ctn":740000,"pcs":18500},"NS JERUK JEJU PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS YUZU ORANGE PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"HI LO SCHOOL HONEY 12DX250G":{"ctn":480000,"pcs":40000},"HI LO DRINK CREAMY MATCHA PLS 8RX10SX20G":{"ctn":136000,"pcs":17000},"HI LO DRINK AVOCADO CHOCOLATE PLS 15RX10SX14G":{"ctn":240000,"pcs":16000},"HI LO DRINK ES KETAN HITAM PLS 8RX10SX14G":{"ctn":128000,"pcs":16000},"HI LO SCHOOL ORIGINAL 12DX12SX25G":{"ctn":924000,"pcs":77000},"HI LO TEEN POPCORN CARAMEL 12DX500G":{"ctn":960000,"pcs":80000},"L-MEN GAINMASS BANANA 12DX225G":{"ctn":900000,"pcs":75000},"L-MEN PLANTPROTEIN OGURA 12DX216G":{"ctn":1200000,"pcs":100000},"L-MEN PLATINUM NOODLE SEMUR DAGING 18BAGX56.5G":{"ctn":405000,"pcs":22500},"NS ISOTONIK REFRESHING CITRUS PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS JERUK PERAS FC 72OX10SX14G":{"ctn":792000,"pcs":11000},"NS LESS SUGAR BELIMBING PLS 4PX40SX6G":{"ctn":180000,"pcs":11250},"NS LYCHEE TEA REF PLS 12BAGX400G":{"ctn":402000,"pcs":33500},"NS MILKY PEACH PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS PREMIUM JUS MANGGA REF PLS 12BAGX420G":{"ctn":456000,"pcs":38000},"NS W'DANK BAJIGUR PLS 12RX10SX15G":{"ctn":192000,"pcs":16000},"NS W'DANK BANDREK PLS 12RX10SX15G":{"ctn":192000,"pcs":16000},"NS ES CINCAU PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS ES RUJAK PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"NS LESS SUGAR JERUK BALI PLS 4PX40SX6G":{"ctn":180000,"pcs":11250},"NS JERUK MANADO PLS 4PX40SX11G":{"ctn":180000,"pcs":11250},"TS SWT DIABTX PLS 10PX80SX1.8G":{"ctn":530000,"pcs":53000},"TS DIABETAMIL SWT PLS 10PX80SX1G":{"ctn":300000,"pcs":30000},"TS BERAS PORANG INSTAN NASI GORENG 12DX7SX38.5G":{"ctn":780000,"pcs":65000},"TS MAYO ROASTED SESAME 24BTLX200ML":{"ctn":588000,"pcs":24500},"TS SOY LATTE 12DX10SX15G":{"ctn":480000,"pcs":40000},"TS SWT STEVIA 12DX100SX1.8G":{"ctn":1296000,"pcs":108000}};
function isPolosStock(name){if(!name)return false;const n=name.toUpperCase();if(n.startsWith('NS ')&&n.includes('PLS'))return true;if((n.startsWith('HI LO ')||n.startsWith('HILO '))&&n.includes('PLS')&&!n.includes('RTD'))return true;return false;}

function sn(n){const p=n.split(' ');return p.length>=2?p.slice(0,2).join(' '):n;}
function avC(p){return p>=80?'var(--accent)':p>=60?'var(--blue)':'var(--red)';}
function avTag(p,sm=''){const cls=p>=80?'g':p>=60?'au':'r';return`<span class="tag ${cls}${sm}">${p}%</span>`;}
function ar(c){return`<span style="opacity:.25;margin-left:2px;font-size:9px">${SC===c?(SD>0?'↑':'↓'):'↕'}</span>`;}
function tenure(d){
  const days=Math.floor((new Date()-d)/864e5);
  if(days<1)return'Hari ini';
  if(days<30)return days+' hari';
  if(days<365)return Math.floor(days/30)+' bln';
  return(days/365).toFixed(1)+' thn';
}

// ── PENJUALAN MDS: DATA CALL/ORDER ──────────────────────────────────────────
const PJ_COLLECTION='pjmds_data', PJ_CHUNK_SIZE=700000;
const PJ_UPDATE_PASSWORD='1';
function pjGuardedClick(inputId){
  const pw=prompt('Masukkan password untuk melanjutkan:');
  if(pw===null)return;
  if(pw!==PJ_UPDATE_PASSWORD){alert('Password salah.');return;}
  document.getElementById(inputId).click();
}
const PJ_TARGET={tea:2500000,hilo:3000000,call:550,ea:200,sekolah:35};
const PJ_SEKOLAH_EXCLUDE=new Set(['BUKAN SEKOLAH','OTHERS','BUKAN SEKOLA','TIDAK ADA']);
const PJ_ASO_JUPE_ITEMS=new Set(['NS JERUK PERAS PLS 18PX40SX14G','NS ASO PLS 14GX18PX40S','NS AMERICAN SWEET ORANGE PLS 18PX40SX14G']);
let PJ_RAW={call:[],order:[],meta:null};
function pjIsJP(n){return n&&n.toUpperCase().includes('JERUK PERAS');}
function pjIsASO(n){return n&&(n.toUpperCase().includes(' ASO ')||n.toUpperCase().includes('AMERICAN SWEET ORANGE'));}
function pjMode(arr){const f={};let best='',bc=0;arr.forEach(v=>{if(!v)return;f[v]=(f[v]||0)+1;if(f[v]>bc){bc=f[v];best=v;}});return best;}
function pjFmtUpdatedAt(iso){
  const d=new Date(iso);
  if(isNaN(d))return '-';
  return d.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'});
}
function pjToDate(v){if(v instanceof Date)return v;if(typeof v==='string'){const d=new Date(v);return isNaN(d)?null:d;}return null;}
function pjIsoWeek(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const dayNum=(d.getUTCDay()+6)%7;
  d.setUTCDate(d.getUTCDate()-dayNum+3);
  const firstThursday=new Date(Date.UTC(d.getUTCFullYear(),0,4));
  const weekNum=1+Math.round(((d-firstThursday)/86400000-3+((firstThursday.getUTCDay()+6)%7))/7);
  return d.getUTCFullYear()*100+weekNum;
}
function findSheetPj(wb,name){
  const exact=wb.Sheets[name];if(exact)return exact;
  const key=wb.SheetNames.find(n=>n.trim().toLowerCase()===name.toLowerCase());
  return key?wb.Sheets[key]:null;
}
let ITEM_PRICE_NORM=null;
function pjBuildItemPriceNorm(){
  ITEM_PRICE_NORM={};
  Object.keys(ITEM_PRICE).forEach(k=>{ITEM_PRICE_NORM[k.toUpperCase().trim().replace(/\s+/g,' ')]=ITEM_PRICE[k].pcs;});
}
function pjExpandSynonyms(s){
  return String(s||'').replace(/\bASO\b/g,'AMERICAN SWEET ORANGE');
}
function pjCoreName(s){
  return pjExpandSynonyms(String(s||'').toUpperCase().trim().replace(/[.,]/g,'').replace(/\s+/g,' '))
    .split(' ').filter(tok=>tok&&!/\d/.test(tok)).join(' ');
}
let ITEM_PRICE_CORE=null;
function pjBuildItemPriceCore(){
  ITEM_PRICE_CORE={};
  Object.keys(ITEM_PRICE).forEach(k=>{
    const core=pjCoreName(k);
    if(!core)return;
    if(!ITEM_PRICE_CORE[core])ITEM_PRICE_CORE[core]=[];
    ITEM_PRICE_CORE[core].push(ITEM_PRICE[k].pcs);
  });
}
function pjCoreNoPls(core){return core.split(' ').filter(t=>t!=='PLS').join(' ');}
let ITEM_PRICE_CORE_NOPLS=null;
function pjBuildItemPriceCoreNoPls(){
  if(!ITEM_PRICE_CORE)pjBuildItemPriceCore();
  ITEM_PRICE_CORE_NOPLS={};
  Object.keys(ITEM_PRICE_CORE).forEach(core=>{
    const c2=pjCoreNoPls(core);
    if(!ITEM_PRICE_CORE_NOPLS[c2])ITEM_PRICE_CORE_NOPLS[c2]=[];
    ITEM_PRICE_CORE_NOPLS[c2].push(...ITEM_PRICE_CORE[core]);
  });
}
function pjItemPrice(name){
  if(!name)return 0;
  if(ITEM_PRICE[name])return ITEM_PRICE[name].pcs||0;
  if(!ITEM_PRICE_NORM)pjBuildItemPriceNorm();
  const norm=String(name).toUpperCase().trim().replace(/\s+/g,' ');
  if(ITEM_PRICE_NORM[norm])return ITEM_PRICE_NORM[norm];
  if(!ITEM_PRICE_CORE)pjBuildItemPriceCore();
  const core=pjCoreName(name);
  const arr=ITEM_PRICE_CORE[core];
  if(arr&&arr.length)return Math.round(arr.reduce((a,b)=>a+b,0)/arr.length);
  if(!ITEM_PRICE_CORE_NOPLS)pjBuildItemPriceCoreNoPls();
  const core2=pjCoreNoPls(core);
  const arr2=ITEM_PRICE_CORE_NOPLS[core2];
  if(arr2&&arr2.length)return Math.round(arr2.reduce((a,b)=>a+b,0)/arr2.length);
  return 0;
}
function pjOrderValue(r){return r.Value||((r.Qty||0)*pjItemPrice(r.NamaItem));}
function pjPeriodDays(){
  if(MF)return 31;
  if(DF==='today')return 1;
  if(DF==='week')return 7;
  if(DF==='30d')return 30;
  if(DF==='range'&&RF_FROM){
    const a=new Date(RF_FROM),b=RF_TO?new Date(RF_TO):new Date();
    return Math.max(1,Math.round((b-a)/864e5)+1);
  }
  return 9999;
}
function pjAnchorDate(){
  let max=null;
  PJ_RAW.call.forEach(r=>{const d=pjToDate(r.Tanggal);if(d&&(!max||d>max))max=d;});
  return max||new Date();
}
function pjGetCutoff(){
  const anchor=pjAnchorDate();
  if(DF==='today'){const d=new Date(anchor);d.setHours(0,0,0,0);return d;}
  if(DF==='week'){const d=new Date(anchor);d.setDate(d.getDate()-7);return d;}
  if(DF==='30d'){const d=new Date(anchor);d.setDate(d.getDate()-30);return d;}
  if(DF==='nmonths'&&NM>0){const d=new Date(anchor);d.setMonth(d.getMonth()-NM);return d;}
  if(DF==='range'&&RF_FROM){const d=new Date(RF_FROM);d.setHours(0,0,0,0);return d;}
  return new Date(0);
}
function pjPeriodFilterCall(rows){
  const cutoff=pjGetCutoff();
  let rangeEnd=null;
  if(DF==='range'&&RF_TO){rangeEnd=new Date(RF_TO);rangeEnd.setHours(23,59,59,999);}
  return rows.filter(r=>{
    const d=pjToDate(r.Tanggal);
    if(!d)return true;
    if(MF){const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if(k!==MF)return false;}
    else{if(d<cutoff)return false;if(rangeEnd&&d>rangeEnd)return false;}
    return true;
  });
}
function pjPeriodFilterOrder(orderRows,filteredCallRows){
  const hasDates=orderRows.some(r=>pjToDate(r.Tanggal));
  if(hasDates){
    const cutoff=pjGetCutoff();
    let rangeEnd=null;
    if(DF==='range'&&RF_TO){rangeEnd=new Date(RF_TO);rangeEnd.setHours(23,59,59,999);}
    return orderRows.filter(r=>{
      const d=pjToDate(r.Tanggal);
      if(!d)return true;
      if(MF){const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;if(k!==MF)return false;}
      else{if(d<cutoff)return false;if(rangeEnd&&d>rangeEnd)return false;}
      return true;
    });
  }
  if(MF){
    const monthNum=Number(MF.split('-')[1]);
    return orderRows.filter(r=>r.Bulan===monthNum);
  }
  const allowedMonths=new Set(filteredCallRows.map(r=>r.Bulan));
  if(!allowedMonths.size)return orderRows;
  return orderRows.filter(r=>allowedMonths.has(r.Bulan));
}
async function pjStorageSet(value){
  try{
    const chunks=[];
    for(let i=0;i<value.length;i+=PJ_CHUNK_SIZE)chunks.push(value.slice(i,i+PJ_CHUNK_SIZE));
    const oldMetaSnap=await dbSulawesi.collection(PJ_COLLECTION).doc('meta').get();
    const oldCount=oldMetaSnap.exists?(oldMetaSnap.data().chunkCount||0):0;
    await Promise.all(chunks.map((chunk,i)=>dbSulawesi.collection(PJ_COLLECTION).doc('chunk_'+i).set({data:chunk})));
    for(let i=chunks.length;i<oldCount;i++)await dbSulawesi.collection(PJ_COLLECTION).doc('chunk_'+i).delete();
    await dbSulawesi.collection(PJ_COLLECTION).doc('meta').set({chunkCount:chunks.length,updatedAt:new Date().toISOString()});
    return true;
  }catch(e){console.error('pjStorageSet failed',e);return false;}
}
async function pjStorageGet(){
  try{
    const metaSnap=await dbSulawesi.collection(PJ_COLLECTION).doc('meta').get();
    if(!metaSnap.exists)return null;
    const n=metaSnap.data().chunkCount||0;
    let full='';
    for(let i=0;i<n;i++){const snap=await dbSulawesi.collection(PJ_COLLECTION).doc('chunk_'+i).get();full+=snap.exists?(snap.data().data||''):'';}
    return full||null;
  }catch(e){console.error('pjStorageGet failed',e);return null;}
}
async function loadPjmdsData(){
  const el=document.getElementById('pjdata-status');
  if(!dbSulawesi){if(el)el.textContent='Cloud belum terhubung.';return;}
  try{
    const raw=await pjStorageGet();
    if(raw){
      const parsed=JSON.parse(raw);
      PJ_RAW={call:parsed.call||[],order:parsed.order||[],meta:parsed.meta||null};
      const updTxt=PJ_RAW.meta?.uploadedAt?pjFmtUpdatedAt(PJ_RAW.meta.uploadedAt):'-';
      if(el)el.textContent=`Data tersimpan: ${PJ_RAW.meta?.filename||'file sebelumnya'} · ${PJ_RAW.call.length} baris call, ${PJ_RAW.order.length} baris order · terakhir update ${updTxt}`;
    }else if(el){
      el.textContent='Belum ada data Call/Order diupload — klik "⟲ Update Data".';
    }
  }catch(e){console.error('loadPjmdsData failed',e);if(el)el.textContent='Gagal memuat data tersimpan.';}
  render();
}
async function handlePjmdsDataFile(file){
  const el=document.getElementById('pjdata-status');
  el.textContent='<span class="spinner"></span>Membaca '+file.name+'…';
  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array',cellDates:true});
    const callSheet=findSheetPj(wb,'Call');
    const orderSheet=findSheetPj(wb,'Order');
    if(!callSheet){el.textContent='Sheet "Call" tidak ditemukan. Sheet yang ada: '+wb.SheetNames.join(', ');return;}
    const callRaw=XLSX.utils.sheet_to_json(callSheet,{defval:null});
    const orderRaw=orderSheet?XLSX.utils.sheet_to_json(orderSheet,{defval:null}):[];
    const call=callRaw.map(r=>({
      Bulan:Number(r['Bulan']),Tanggal:r['Tanggal']instanceof Date?r['Tanggal'].toISOString():r['Tanggal'],
      NamaMDS:r['Nama MDS'],PIC:r['PIC'],Provinsi:r['Provinsi'],
      KodeCustomer:String(r['Kode Customer']),NamaCustomer:r['Nama Customer'],Kabupaten:r['Kabupaten'],
      Klasifikasi:r['Klasifikasi'],Sekolah:r['Sekolah'],StatusSekolah:r['Status Sekolah']===true,
      OmzetNS:Number(r['Omzet NS'])||0,OmzetHILO:Number(r['Omzet HILO'])||0,TotalOrder:Number(r['Total Order'])||0,
      CheckIn:r['Check In']instanceof Date?r['Check In'].toISOString():r['Check In'],
      KoordinatCall:r['Koordinat Call']||null
    }));
    const order=orderRaw.map(r=>{
      const qty=Number(r['Qty'])||0;
      const nm=r['Nama Item']||'';
      const rawValue=Number(r['Value'])||0;
      const value=rawValue||(qty*pjItemPrice(nm));
      return{
        Bulan:Number(r['Bulan']),Tanggal:r['Tanggal']instanceof Date?r['Tanggal'].toISOString():r['Tanggal'],
        NamaMDS:r['Nama MDS'],KodeCustomer:String(r['Kode Customer']),
        NamaCustomer:r['Nama Customer'],Kabupaten:r['Kabupaten'],Klasifikasi:r['Klasifikasi'],
        Brand:r['Brand'],NamaItem:nm,Qty:qty,Value:value
      };
    });
    PJ_RAW={call,order,meta:{filename:file.name,uploadedAt:new Date().toISOString()}};
    el.textContent=`Berhasil diproses: ${file.name} · ${call.length} baris call, ${order.length} baris order · terakhir update ${pjFmtUpdatedAt(PJ_RAW.meta.uploadedAt)}`;
    render();
    const payload=JSON.stringify(PJ_RAW);
    const sizeMB=(new TextEncoder().encode(payload)).length/1024/1024;
    el.textContent+=` (${sizeMB.toFixed(1)}MB, menyimpan ke cloud dalam ${Math.ceil(payload.length/PJ_CHUNK_SIZE)} bagian…)`;
    const ok=await pjStorageSet(payload);
    el.textContent+=ok?' · tersimpan di cloud, semua device sinkron':' (upload ke cloud gagal, data cuma untuk sesi ini)';
  }catch(err){
    console.error(err);
    el.textContent='Gagal membaca file: '+(err.message||err);
  }
}
function pjNormName(s){return String(s||'').toUpperCase().trim().replace(/[.,]/g,'').replace(/\s+/g,' ');}
function pjResolveMdsName(selName){
  if(!selName)return null;
  if(PJMDS_MANUAL_MATCH[selName])return PJMDS_MANUAL_MATCH[selName];
  const target=pjNormName(selName);
  const names=[...new Set(PJ_RAW.call.map(r=>r.NamaMDS).filter(Boolean))];
  const found=names.find(n=>pjNormName(n)===target);
  if(found)return found;
  return null;
}
function computePjmdsMdsData(selName){
  const resolvedName=pjResolveMdsName(selName);
  const mds=resolvedName||selName;
  const cAll=PJ_RAW.call.filter(r=>r.NamaMDS===mds);
  const oAll=PJ_RAW.order.filter(r=>r.NamaMDS===mds);
  const c=pjPeriodFilterCall(cAll);
  const o=pjPeriodFilterOrder(oAll,c);
  if(!c.length)return null;
  const provinsi=pjMode(c.map(r=>r.Provinsi));
  const omzetOf=r=>(r.OmzetNS||0)+(r.OmzetHILO||0);

  const custMap={};
  c.forEach(r=>{
    const k=r.KodeCustomer;
    if(!custMap[k])custMap[k]={nama:r.NamaCustomer,klas:[],kab:r.Kabupaten,omzet:0,visits:0,totalOrder:0};
    custMap[k].klas.push(r.Klasifikasi);custMap[k].omzet+=omzetOf(r);custMap[k].visits+=1;custMap[k].totalOrder+=(r.TotalOrder||0);
  });
  const custList=Object.entries(custMap).map(([kode,x])=>({kode,nama:x.nama,klasifikasi:pjMode(x.klas),kabupaten:x.kab,omzet:x.omzet,visits:x.visits}));
  const topCustomer=[...custList].sort((a,b)=>b.omzet-a.omzet).slice(0,10);
  const eaCount=Object.values(custMap).filter(x=>x.totalOrder>0).length;

  const sekMap={};
  c.filter(r=>!PJ_SEKOLAH_EXCLUDE.has(String(r.Sekolah||'').trim().toUpperCase())).forEach(r=>{
    const key=String(r.Sekolah||'').trim().toUpperCase();
    if(!key)return;
    if(!sekMap[key])sekMap[key]={namaList:[],kabList:[],omzet:0,dates:new Set(),kantinCodes:new Set()};
    sekMap[key].namaList.push(r.Sekolah);sekMap[key].kabList.push(r.Kabupaten);sekMap[key].omzet+=omzetOf(r);
    const dd=pjToDate(r.Tanggal);if(dd)sekMap[key].dates.add(dd.toISOString().slice(0,10));
    sekMap[key].kantinCodes.add(r.KodeCustomer);
  });
  const topSekolah=Object.values(sekMap).map(x=>({nama:pjMode(x.namaList),kabupaten:pjMode(x.kabList),omzet:x.omzet,visits:x.dates.size,kantin:x.kantinCodes.size}))
    .sort((a,b)=>b.omzet-a.omzet).slice(0,5);

  const itemMap={};
  o.filter(r=>!String(r.NamaItem).toUpperCase().startsWith('BONUS')).forEach(r=>{
    const k=r.KodeCustomer;if(!itemMap[k])itemMap[k]=new Set();itemMap[k].add(r.NamaItem);
  });
  const singleSku=[];
  Object.keys(itemMap).forEach(k=>{
    const items=[...itemMap[k]];
    if(items.length===1&&(pjIsJP(items[0])||pjIsASO(items[0]))){
      const crows=c.filter(r=>r.KodeCustomer===k);
      const orows=o.filter(r=>r.KodeCustomer===k&&!String(r.NamaItem).toUpperCase().startsWith('BONUS'));
      const nama=crows[0]?crows[0].NamaCustomer:(orows[0]?orows[0].NamaCustomer:k);
      const kab=crows[0]?crows[0].Kabupaten:(orows[0]?orows[0].Kabupaten:'');
      const klas=pjMode(crows.map(r=>r.Klasifikasi));
      const qty=orows.reduce((s,r)=>s+r.Qty,0),val=orows.reduce((s,r)=>s+pjOrderValue(r),0);
      singleSku.push({nama,kabupaten:kab,klasifikasi:klas,item:pjIsJP(items[0])?'Jeruk Peras':'ASO',qty,omzet:val});
    }
  });
  singleSku.sort((a,b)=>b.omzet-a.omzet);

  const nd=c.filter(r=>r.Klasifikasi!=='Retail'&&r.Klasifikasi!=='Grosir');
  const perCust={};
  nd.forEach(r=>{
    const d=pjToDate(r.Tanggal);if(!d)return;
    const dateKey=d.toISOString().slice(0,10),wk=pjIsoWeek(d),k=r.KodeCustomer;
    if(!perCust[k])perCust[k]={datesAll:new Set(),weekDates:{}};
    perCust[k].datesAll.add(dateKey);
    if(!perCust[k].weekDates[wk])perCust[k].weekDates[wk]=new Set();
    perCust[k].weekDates[wk].add(dateKey);
  });
  const periodDays=pjPeriodDays();
  const efektivitas=[];
  Object.keys(perCust).forEach(k=>{
    const info=perCust[k];
    const totalDates=info.datesAll.size;
    const maxWeekDates=Math.max(...Object.values(info.weekDates).map(s=>s.size));
    const flagged=periodDays<30?totalDates>2:(maxWeekDates>2||totalDates>4);
    if(flagged){
      const crows=nd.filter(r=>r.KodeCustomer===k);
      efektivitas.push({nama:crows[0].NamaCustomer,kabupaten:crows[0].Kabupaten,klasifikasi:pjMode(crows.map(r=>r.Klasifikasi)),
        total_visit:totalDates,max_minggu:maxWeekDates,omzet:crows.reduce((s,r)=>s+omzetOf(r),0)});
    }
  });
  efektivitas.sort((a,b)=>b.total_visit-a.total_visit);

  const allItemMap={};
  o.filter(r=>!String(r.NamaItem).toUpperCase().startsWith('BONUS')).forEach(r=>{
    const k=r.KodeCustomer;if(!allItemMap[k])allItemMap[k]=new Set();allItemMap[k].add(r.NamaItem);
  });
  const nooPengembangan=[];
  if(KEDAI_DB.stores.length){
    const kodeSet=new Set(KEDAI_DB.stores.map(s=>String(s.kode||'').trim().toLowerCase()));
    Object.keys(custMap).forEach(k=>{
      const x=custMap[k],skuCount=allItemMap[k]?allItemMap[k].size:0;
      const isNewCode=!kodeSet.has(String(k||'').trim().toLowerCase());
      if(isNewCode&&x.omzet>0&&skuCount>=3){
        nooPengembangan.push({kode:k,nama:x.nama,kabupaten:x.kab,klasifikasi:pjMode(x.klas),sku_count:skuCount,omzet:x.omzet});
      }
    });
  }
  nooPengembangan.sort((a,b)=>b.omzet-a.omzet);

  const teaVolume=o.filter(r=>r.Brand==='NUTRISARI'&&String(r.NamaItem).toUpperCase().includes('TEA PLS')).reduce((s,r)=>s+pjOrderValue(r),0);
  const hiloVolume=o.filter(r=>String(r.Brand).toUpperCase()==='HI LO').reduce((s,r)=>s+pjOrderValue(r),0);
  const totalPenjualan=o.reduce((s,r)=>s+pjOrderValue(r),0);
  const singleSkuCount=singleSku.length;
  const singleSkuTotalValue=singleSku.reduce((s,r)=>s+r.omzet,0);

  return{
    provinsi,resolvedName,
    kpi:{total_call:c.length,total_customer:eaCount,total_sekolah:Object.keys(sekMap).length,tea_volume:teaVolume,hilo_volume:hiloVolume,total_penjualan:totalPenjualan},
    top_customer:topCustomer,top_sekolah:topSekolah,single_sku_aso_jupe:singleSku,single_sku_count:singleSkuCount,single_sku_total_value:singleSkuTotalValue,
    noo_pengembangan:nooPengembangan,efektivitas,
    rawCall:c,rawOrder:o
  };
}
function pjKpiCard(label,value,target,fmt){
  const pct=target>0?(value/target)*100:0,cls=pct>=100?'g':'r',barW=Math.min(pct,100);
  return`<div class="kpi-shell"><div class="kpi-inner" style="padding:12px 14px">
    <div class="kpi-label" style="margin-bottom:4px">${label}</div>
    <div class="kpi-val" style="font-size:16px">${fmt(value)}</div>
    <div class="kpi-sub">Target: ${fmt(target)}</div>
    <div class="av-bg" style="margin-top:6px"><div class="av-fill" style="width:${barW}%;background:${cls==='g'?'var(--accent)':'var(--red)'}"></div></div>
    <div style="font-size:11px;font-weight:700;margin-top:4px;color:${cls==='g'?'var(--accent)':'var(--red)'}">${pct.toFixed(0)}%</div>
  </div></div>`;
}
function pjTable(headers,rows,rowFn,emptyMsg){
  if(!rows.length)return`<div class="empty-state">${emptyMsg}</div>`;
  return`<table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead><tbody>${rows.map(rowFn).join('')}</tbody></table>`;
}
function pjCheckInSeconds(iso){
  const dt=pjToDate(iso);
  if(!dt)return 0;
  return dt.getUTCHours()*3600+dt.getUTCMinutes()*60+dt.getUTCSeconds();
}
function pjAvailableDates(mds){
  const resolved=pjResolveMdsName(mds);
  if(!resolved)return[];
  const dates=new Set();
  PJ_RAW.call.filter(r=>r.NamaMDS===resolved).forEach(r=>{
    const dt=pjToDate(r.Tanggal);if(dt)dates.add(dt.toISOString().slice(0,10));
  });
  return[...dates].sort().reverse();
}
function pjRouteStops(mds,dateKey){
  const resolved=pjResolveMdsName(mds);
  if(!resolved)return[];
  const rows=PJ_RAW.call.filter(r=>r.NamaMDS===resolved).filter(r=>{
    const dt=pjToDate(r.Tanggal);return dt&&dt.toISOString().slice(0,10)===dateKey;
  });
  const withCoord=rows.filter(r=>r.KoordinatCall&&/-?\d+(\.\d+)?\s*,\s*-?\d+(\.\d+)?/.test(r.KoordinatCall));
  withCoord.sort((a,b)=>pjCheckInSeconds(a.CheckIn)-pjCheckInSeconds(b.CheckIn));
  const stops=withCoord.map(r=>({nama:r.NamaCustomer,sekolah:r.Sekolah,koordinat:r.KoordinatCall.trim(),checkIn:r.CheckIn}));
  const PJ_MAX_JUMP_KM=100;
  for(let i=1;i<stops.length;i++){
    const km=pjHaversineKm(pjParseCoord(stops[i-1].koordinat),pjParseCoord(stops[i].koordinat));
    if(km!==null&&km>PJ_MAX_JUMP_KM)stops[i].koordinat=stops[i-1].koordinat;
  }
  return stops;
}
function pjBuildMapsUrl(stops){
  const coords=stops.map(s=>s.koordinat.replace(/\s+/g,''));
  return'https://www.google.com/maps/dir/'+coords.join('/');
}
function pjSelectRouteDate(v){
  PJ_ROUTE_DATE=v||null;
  const b=document.getElementById('pjmds-modal-body');
  if(b&&PJMDS_SEL)b.innerHTML=pjRouteModalBody(PJMDS_SEL,PJ_ROUTE_DATE);
}
function pjOpenRoute(){
  if(!PJMDS_SEL||!PJ_ROUTE_DATE)return;
  const stops=pjRouteStops(PJMDS_SEL,PJ_ROUTE_DATE);
  if(!stops.length){alert('Tidak ada koordinat kunjungan untuk tanggal ini.');return;}
  window.open(pjBuildMapsUrl(stops),'_blank');
}
function pjParseCoord(s){
  const m=String(s||'').match(/(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/);
  return m?{lat:parseFloat(m[1]),lng:parseFloat(m[2])}:null;
}
function pjHaversineKm(a,b){
  if(!a||!b)return null;
  const R=6371,toRad=d=>d*Math.PI/180;
  const dLat=toRad(b.lat-a.lat),dLng=toRad(b.lng-a.lng);
  const x=Math.sin(dLat/2)**2+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*Math.sin(dLng/2)**2;
  return R*2*Math.atan2(Math.sqrt(x),Math.sqrt(1-x));
}
function pjRouteModalBody(mds,dateKey){
  const dates=pjAvailableDates(mds);
  if(!dates.length)return'<div class="empty-state">Belum ada data Call untuk MDS ini.</div>';
  if(!dateKey||!dates.includes(dateKey))dateKey=dates[0];
  const stops=pjRouteStops(mds,dateKey);
  const withCoordCount=stops.length;
  const totalVisitCount=PJ_RAW.call.filter(r=>r.NamaMDS===pjResolveMdsName(mds)).filter(r=>{const dt=pjToDate(r.Tanggal);return dt&&dt.toISOString().slice(0,10)===dateKey;}).length;
  return`<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px">
      <select class="fi" style="width:180px" onchange="pjSelectRouteDate(this.value)">
        ${dates.map(dk=>{const dt=new Date(dk);const label=dt.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'});return`<option value="${dk}"${dk===dateKey?' selected':''}>${label}</option>`;}).join('')}
      </select>
      <button class="exp-btn" onclick="pjOpenRoute()" ${withCoordCount?'':'disabled'}>🗺️ Buka Rute (${withCoordCount} titik)</button>
    </div>
    ${withCoordCount<totalVisitCount?`<div style="font-size:11px;color:var(--t3);margin-bottom:8px">${totalVisitCount-withCoordCount} visit tanpa koordinat tidak diikutkan</div>`:''}
    ${stops.length?(()=>{
      let totalKm=0;
      const rows=stops.map((s,i)=>{
        const dt=pjToDate(s.checkIn);
        const tStr=dt?new Date(dt.getTime()+8*3600*1000).toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'}):'-';
        const km=i>0?pjHaversineKm(pjParseCoord(stops[i-1].koordinat),pjParseCoord(s.koordinat)):null;
        if(km!==null)totalKm+=km;
        const jarakStr=km===null?'—':`+${km.toFixed(1)} km`;
        return`<tr><td class="td-dim">${i+1}</td><td class="td-dim">${tStr}</td><td class="td-main">${s.nama}${s.sekolah?` <span style="color:var(--t3);font-size:10px">(${s.sekolah})</span>`:''}</td><td class="td-dim">${jarakStr}</td></tr>`;
      }).join('');
      return`<table><thead><tr><th>#</th><th>Waktu</th><th>Customer</th><th>Jarak</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="tfoot-row" style="font-weight:700">Total jarak: ${totalKm.toFixed(1)} km</div>`;
    })():'<div class="empty-state">Tidak ada koordinat kunjungan pada tanggal ini.</div>'}`;
}
function pjOpenRouteModal(){
  if(!PJMDS_SEL){alert('Pilih MDS dulu.');return;}
  const dates=pjAvailableDates(PJMDS_SEL);
  if(!dates.length){alert('Belum ada data Call untuk MDS ini.');return;}
  if(!PJ_ROUTE_DATE||!dates.includes(PJ_ROUTE_DATE))PJ_ROUTE_DATE=dates[0];
  pjShowModal('🗺️ Rute Kunjungan Harian — '+PJMDS_SEL,pjRouteModalBody(PJMDS_SEL,PJ_ROUTE_DATE));
}
function pjCustomerVisits(kode,c,o){
  const ordersByDate={};
  o.filter(r=>r.KodeCustomer===kode).forEach(r=>{
    const dd=pjToDate(r.Tanggal);const key=dd?dd.toISOString().slice(0,10):'—';
    if(!ordersByDate[key])ordersByDate[key]=[];
    ordersByDate[key].push(r);
  });
  return c.filter(r=>r.KodeCustomer===kode).map(r=>{
    const dd=pjToDate(r.Tanggal);const key=dd?dd.toISOString().slice(0,10):'—';
    const items=ordersByDate[key]||[];
    return{tanggal:r.Tanggal,klasifikasi:r.Klasifikasi,omzet:(r.OmzetNS||0)+(r.OmzetHILO||0),items:items.map(it=>({nama:it.NamaItem,qty:it.Qty,value:pjOrderValue(it)}))};
  }).sort((a,b)=>new Date(b.tanggal)-new Date(a.tanggal));
}
function pjShowModal(title,bodyHtml){
  const t=document.getElementById('pjmds-modal-title'),b=document.getElementById('pjmds-modal-body'),m=document.getElementById('pjmds-modal');
  if(!t||!b||!m)return;
  t.textContent=title;
  b.innerHTML=bodyHtml;
  m.classList.remove('hidden');
}
function pjCustomerDetailBody(kode,c,o){
  const visits=pjCustomerVisits(kode,c,o);
  return visits.length?visits.map(v=>{
    const dt=pjToDate(v.tanggal);
    const dtStr=dt?dt.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-';
    const itemsHtml=v.items.length?v.items.map(it=>`<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid rgba(255,255,255,.04);font-size:11px"><span>${it.nama}</span><span style="color:var(--t3)">x${it.qty} · ${rp(it.value)}</span></div>`).join(''):'<div style="font-size:11px;color:var(--t3);padding:4px 0">Tidak ada data item di sheet Order untuk tanggal ini.</div>';
    return`<div style="margin-bottom:10px;padding:10px 12px;background:rgba(255,255,255,.03);border-radius:10px">
      <div style="display:flex;justify-content:space-between;font-size:11px;font-weight:700;margin-bottom:6px"><span>${dtStr} <span style="color:var(--t3);font-weight:500">· ${v.klasifikasi||'-'}</span></span><span style="color:var(--accent)">${v.omzet?rp(v.omzet):'—'}</span></div>
      ${itemsHtml}
    </div>`;
  }).join(''):'<div class="empty-state">Tidak ada riwayat visit.</div>';
}
function pjOpenCustomerModal(kode,backNama){
  const d=computePjmdsMdsData(PJMDS_SEL);
  if(!d)return;
  const nama=(d.rawCall.find(r=>r.KodeCustomer===kode)||{}).NamaCustomer||kode;
  const backBtn=backNama?`<div class="freset" style="margin-bottom:10px;display:inline-block" onclick="pjOpenSekolahModal('${backNama.replace(/'/g,"\\'")}')">← Kembali ke ${backNama}</div>`:'';
  pjShowModal('🧾 Riwayat Visit — '+nama, backBtn+pjCustomerDetailBody(kode,d.rawCall,d.rawOrder));
}
function pjOpenSekolahModal(namaSekolah){
  const d=computePjmdsMdsData(PJMDS_SEL);
  if(!d)return;
  const key=String(namaSekolah||'').trim().toUpperCase();
  const rows=d.rawCall.filter(r=>String(r.Sekolah||'').trim().toUpperCase()===key);
  const custMap={};
  rows.forEach(r=>{
    const k=r.KodeCustomer;
    if(!custMap[k])custMap[k]={kode:k,nama:r.NamaCustomer,visits:[]};
    custMap[k].visits.push({tanggal:r.Tanggal,omzet:(r.OmzetNS||0)+(r.OmzetHILO||0)});
  });
  const custs=Object.values(custMap).sort((a,b)=>b.visits.length-a.visits.length);
  const body=`<table><thead><tr><th>Customer</th><th>Tanggal Visit</th><th>Value</th></tr></thead><tbody>
    ${custs.length?custs.map(cu=>cu.visits.map((v,i)=>{
      const dt=pjToDate(v.tanggal);
      const dtStr=dt?dt.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'-';
      return`<tr class="clickrow" style="cursor:pointer" onclick="pjOpenCustomerModal('${String(cu.kode).replace(/'/g,"\\'")}','${namaSekolah.replace(/'/g,"\\'")}')">
        <td class="td-main">${i===0?cu.nama:''}</td>
        <td class="td-dim">${dtStr}</td>
        <td style="color:var(--accent);font-weight:700">${v.omzet?rp(v.omzet):'—'}</td>
      </tr>`;
    }).join('')).join(''):'<tr><td colspan="3"><div class="empty-state">Tidak ada data kantin.</div></td></tr>'}
    </tbody></table>`;
  pjShowModal('🏫 Kantin di '+namaSekolah, body);
}
function renderPjmdsSalesDetail(mds){
  const d=computePjmdsMdsData(mds);
  if(!d){
    return`<div class="panel-shell" style="margin-top:12px"><div class="panel-body" style="text-align:center;padding:24px;color:var(--t3)">Belum ada data Call/Order untuk MDS ini. Upload lewat "⟲ Update Data".</div></div>`;
  }
  const nameNote=d.resolvedName&&d.resolvedName!==mds?` <span style="color:var(--t3);font-weight:500">(dicocokkan sbg "${d.resolvedName}")</span>`:'';
  let html=`<div class="ch-label" style="margin:16px 0 10px">📊 Laporan Aktivitas — ${mds}${nameNote} <span style="color:var(--t3);font-weight:500">· ${d.provinsi||'-'}</span></div>`;
  html+=`<div class="bento" style="grid-template-columns:repeat(5,1fr)">
    ${pjKpiCard('Volume NS Tea',d.kpi.tea_volume,PJ_TARGET.tea,rp)}
    ${pjKpiCard('Volume HILO',d.kpi.hilo_volume,PJ_TARGET.hilo,rp)}
    ${pjKpiCard('Call',d.kpi.total_call,PJ_TARGET.call,fmtNum)}
    ${pjKpiCard('EA / Total Customer',d.kpi.total_customer,PJ_TARGET.ea,fmtNum)}
    ${pjKpiCard('Sekolah Dikunjungi',d.kpi.total_sekolah,PJ_TARGET.sekolah,fmtNum)}
  </div>`;
  html+=`<div class="ch-label" style="margin:16px 0 8px">Top 10 Customer <span style="color:var(--t3);font-weight:500">· klik baris untuk lihat detail visit</span></div><div class="panel-shell"><div class="panel-body">
    ${pjTable(['','Customer','Klasifikasi','Kabupaten','Visit','Omzet'],d.top_customer,(r,i)=>`<tr class="clickrow" style="cursor:pointer" onclick="pjOpenCustomerModal('${String(r.kode).replace(/'/g,"\\'")}')"><td>${i+1}</td><td class="td-main">${r.nama}</td><td class="td-dim">${r.klasifikasi||'-'}</td><td class="td-dim">${r.kabupaten||'-'}</td><td>${r.visits}x</td><td style="color:var(--accent);font-weight:700">${rp(r.omzet)}</td></tr>`,'Tidak ada data customer.')}
  </div></div>`;
  html+=`<div class="ch-label" style="margin:16px 0 8px">Top 5 Sekolah <span style="color:var(--t3);font-weight:500">· klik baris untuk lihat kantin & customer</span></div><div class="panel-shell"><div class="panel-body">
    ${pjTable(['','Nama Sekolah','Kabupaten','Kantin','Visit','Omzet'],d.top_sekolah,(r,i)=>`<tr class="clickrow" style="cursor:pointer" onclick="pjOpenSekolahModal('${r.nama.replace(/'/g,"\\'")}')"><td>${i+1}</td><td class="td-main">${r.nama}</td><td class="td-dim">${r.kabupaten||'-'}</td><td>${r.kantin}</td><td>${r.visits}x</td><td style="color:var(--accent);font-weight:700">${rp(r.omzet)}</td></tr>`,'Tidak ada data sekolah.')}
  </div></div>`;
  html+=`<div class="ch-label" style="margin:16px 0 8px">Customer Hanya Beli 1 SKU (Jeruk Peras / ASO)</div><div class="panel-shell"><div class="panel-body">
    <div class="bento bento-2">
      <div class="kpi-shell"><div class="kpi-inner" style="padding:12px 14px"><div class="kpi-label">Jumlah Customer</div><div class="kpi-val" style="font-size:18px;color:var(--gold)">${d.single_sku_count}</div></div></div>
      <div class="kpi-shell"><div class="kpi-inner" style="padding:12px 14px"><div class="kpi-label">Total Value</div><div class="kpi-val" style="font-size:18px;color:var(--accent)">${d.single_sku_total_value?rp(d.single_sku_total_value):'—'}</div></div></div>
    </div>
  </div></div>`;
  html+=`<div class="ch-label" style="margin:16px 0 8px">NOO Pengembangan (${d.noo_pengembangan.length} customer) <span style="color:var(--t3);font-weight:500">· klik baris untuk lihat detail visit</span> ${KEDAI_DB.stores.length?'':'<span style="color:var(--t3);font-weight:500">(upload database kedai dulu)</span>'}</div><div class="panel-shell"><div class="panel-body">
    ${KEDAI_DB.stores.length?pjTable(['Customer','Klasifikasi','Kabupaten','Jumlah SKU','Omzet'],d.noo_pengembangan,r=>`<tr class="clickrow" style="cursor:pointer" onclick="pjOpenCustomerModal('${String(r.kode).replace(/'/g,"\\'")}')"><td class="td-main">${r.nama}</td><td class="td-dim">${r.klasifikasi||'-'}</td><td class="td-dim">${r.kabupaten||'-'}</td><td>${r.sku_count} SKU</td><td style="color:var(--accent);font-weight:700">${rp(r.omzet)}</td></tr>`,'Tidak ada customer NOO Pengembangan.'):'<div class="empty-state">Belum ada database kedai diupload.</div>'}
  </div></div>`;
  html+=`<div class="ch-label" style="margin:16px 0 8px">Efektivitas Kunjungan</div><div class="panel-shell"><div class="panel-body">
    ${pjTable(['Customer','Klasifikasi','Kabupaten','Total Visit','Max/Minggu','Omzet'],d.efektivitas,r=>`<tr><td class="td-main">${r.nama}</td><td class="td-dim">${r.klasifikasi||'-'}</td><td class="td-dim">${r.kabupaten||'-'}</td><td>${r.total_visit}x</td><td>${r.max_minggu}x</td><td style="color:var(--accent);font-weight:700">${rp(r.omzet)}</td></tr>`,'Tidak ada customer yang ditandai tidak efektif. ✅')}
  </div></div>`;
  return html;
}

// ── INIT ─────────────────────────────────────────────────────────────────────
function loadAll(){
  if(!db){console.error('loadAll: db undefined');return;}
  const SRV={source:'server'};
  db.collection('rka_logs').limit(2000).get(SRV).then(s=>{
    RKA_ALL=[];s.forEach(d=>{const v=d.data();RKA_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    RKA_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    buildMonthOpts();render();
  }).catch(e=>console.error('rka_logs get failed',e.code,e.message));
  db.collection('beli_logs').limit(2000).get(SRV).then(s=>{
    BELI_ALL=[];s.forEach(d=>{const v=d.data();BELI_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    BELI_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    buildMonthOpts();render();
  }).catch(e=>console.error('beli_logs get failed',e.code,e.message));
  db.collection('stock_logs').get(SRV)
    .catch(()=>db.collection('stock_logs').get())
    .then(s=>{
    STOCK_ALL=[];s.forEach(d=>{const v=d.data();STOCK_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    STOCK_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    console.log('[stock_logs] loaded',STOCK_ALL.length,'docs');
    render();
  }).catch(e=>console.error('stock_logs FAILED',e.code,e.message));
  db.collection('ned_logs').limit(2000).get(SRV)
    .catch(()=>db.collection('ned_logs').get())
    .then(s=>{
    NED_ALL=[];s.forEach(d=>{const v=d.data();NED_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    NED_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    render();
  }).catch(e=>console.error('ned_logs FAILED',e.code,e.message));
  db.collection('spg_daily_logs').limit(2000).get(SRV)
    .catch(()=>db.collection('spg_daily_logs').get())
    .then(s=>{
    SPG_ALL=[];s.forEach(d=>{const v=d.data();SPG_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    SPG_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    render();
  }).catch(e=>console.error('spg_daily_logs FAILED',e.code,e.message));
}
function loadKedaiDb(){
  if(!dbSulawesi)return;
  dbSulawesi.collection('kedai_db').doc('main').get().then(doc=>{
    if(doc.exists){
      const v=doc.data();
      KEDAI_DB={stores:v.stores||[],meta:v.meta||null};
    }
    renderKedaiStatus();
  }).catch(e=>{console.error('kedai_db load failed',e.code,e.message);renderKedaiStatus();});
}
function renderKedaiStatus(){
  const el=document.getElementById('kedai-status');if(!el)return;
  if(KEDAI_DB.stores.length){
    el.textContent=`Tersimpan: ${KEDAI_DB.meta?.filename||'file sebelumnya'} · ${KEDAI_DB.stores.length} toko (update ${KEDAI_DB.meta?.uploadedAt?new Date(KEDAI_DB.meta.uploadedAt).toLocaleDateString('id-ID'):'-'})`;
  }else{
    el.textContent='Belum ada database kedai diupload.';
  }
}
async function handleKedaiFile(file){
  const el=document.getElementById('kedai-status');
  el.textContent='Membaca '+file.name+'…';
  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const sheet=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(sheet,{defval:null});
    const stores=rows.map(r=>({
      kode:String(r['Kode Customer']||r['Kode Toko']||r['Kode']||'').trim(),
      nama:String(r['Nama Customer']||r['Nama Toko']||r['Nama']||'').trim(),
      mds:String(r['Nama MDS']||r['MDS']||'').trim(),
      area:String(r['Area']||r['Kabupaten']||'').trim()
    })).filter(s=>s.kode||s.nama);
    const meta={filename:file.name,uploadedAt:new Date().toISOString(),rowCount:stores.length};
    KEDAI_DB={stores,meta};
    await dbSulawesi.collection('kedai_db').doc('main').set({stores,meta});
    el.textContent=`Berhasil: ${file.name} · ${stores.length} toko tersimpan.`;
    render();
  }catch(err){
    console.error(err);
    el.textContent='Gagal membaca file: '+(err.message||err);
  }
}
function initDash(){
  switchTab('rka');
  document.getElementById('tb-date').textContent=new Date().toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const dl=document.getElementById('item-beli-list');
  if(dl)Object.keys(ITEM_PRICE).sort().forEach(k=>{const o=document.createElement('option');o.value=k;dl.appendChild(o);});
  const kf=document.getElementById('kedai-file-input');
  if(kf)kf.addEventListener('change',e=>{if(e.target.files[0])handleKedaiFile(e.target.files[0]);});
  const pf=document.getElementById('pjdata-file-input');
  if(pf)pf.addEventListener('change',e=>{if(e.target.files[0])handlePjmdsDataFile(e.target.files[0]);});
  const ff=document.getElementById('formula-import-input');
  if(ff)ff.addEventListener('change',e=>{if(e.target.files[0])handleFormulaImportFile(e.target.files[0]);e.target.value='';});
  const tf=document.getElementById('tx-import-input');
  if(tf)tf.addEventListener('change',e=>{if(e.target.files[0])handleTxImportFile(e.target.files[0]);e.target.value='';});
  loadKedaiDb();
  loadPjmdsData();
  loadPjmdsManualMatch();
  loadDashState();
  loadAll();
  setInterval(loadAll,30000);
  db.collection('rka_logs').limit(2000).onSnapshot({includeMetadataChanges:true},s=>{
    if(s.metadata.fromCache)return;
    RKA_ALL=[];s.forEach(d=>{const v=d.data();RKA_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    RKA_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    buildMonthOpts();render();
  },e=>console.error('rka snap err',e));
  db.collection('beli_logs').limit(2000).onSnapshot({includeMetadataChanges:true},s=>{
    if(s.metadata.fromCache)return;
    BELI_ALL=[];s.forEach(d=>{const v=d.data();BELI_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    BELI_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    buildMonthOpts();render();
  },e=>console.error('beli snap err',e));
  db.collection('stock_logs').limit(2000).onSnapshot({includeMetadataChanges:true},s=>{
    if(s.metadata.fromCache)return;
    STOCK_ALL=[];s.forEach(d=>{const v=d.data();STOCK_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    STOCK_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    console.log('[stock_logs] SNAP loaded',STOCK_ALL.length,'docs');
    render();
  },e=>console.error('stock snap err',e));
  db.collection('ned_logs').limit(2000).onSnapshot({includeMetadataChanges:true},s=>{
    if(s.metadata.fromCache)return;
    NED_ALL=[];s.forEach(d=>{const v=d.data();NED_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    NED_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    render();
  },e=>console.error('ned snap err',e));
  db.collection('spg_daily_logs').limit(2000).onSnapshot({includeMetadataChanges:true},s=>{
    if(s.metadata.fromCache)return;
    SPG_ALL=[];s.forEach(d=>{const v=d.data();SPG_ALL.push({...v,timestamp:v.timestamp?v.timestamp.toDate():new Date()});});
    SPG_ALL.sort((a,b)=>b.timestamp-a.timestamp);
    render();
  },e=>console.error('spg snap err',e));
}
function buildMonthOpts(){
  const ms=new Set([...RKA_ALL,...BELI_ALL].map(r=>{const d=r.timestamp;return`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;}));
  const container=document.getElementById('f-month-pills');
  container.innerHTML='';
  // "Semua" pill
  const all=document.createElement('div');
  all.className='pill'+(MF===''?' on':'');
  all.textContent='Semua';
  all.onclick=()=>{MF='';DF='today';NM=0;document.querySelectorAll('.pill[data-f],.pill[data-mn]').forEach(p=>p.classList.remove('on'));buildMonthOpts();render();};
  container.appendChild(all);
  [...ms].sort().reverse().forEach(m=>{
    const[y,mo]=m.split('-');
    const label=new Date(+y,+mo-1,1).toLocaleDateString('id-ID',{month:'short',year:'numeric'});
    const p=document.createElement('div');
    p.className='pill'+(MF===m?' on':'');
    p.textContent=label;
    p.onclick=()=>setMonthFilter(m);
    container.appendChild(p);
  });
}

// ── FILTERS ─────────────────────────────────────────────────────────────────
function getCutoff(){
  const now=new Date();
  if(DF==='today'){const d=new Date(now);d.setHours(0,0,0,0);return d;}
  if(DF==='week'){const d=new Date(now);d.setDate(d.getDate()-7);return d;}
  if(DF==='30d'){const d=new Date(now);d.setDate(d.getDate()-30);return d;}
  if(DF==='nmonths'&&NM>0){const d=new Date(now);d.setMonth(d.getMonth()-NM);return d;}
  if(DF==='range'&&RF_FROM){const d=new Date(RF_FROM);d.setHours(0,0,0,0);return d;}
  return new Date(0);
}
function setDateFilter(f,el){
  DF=f;NM=0;MF='';
  document.querySelectorAll('.pill[data-f]').forEach(p=>p.classList.remove('on'));
  document.querySelectorAll('.pill[data-mn]').forEach(p=>p.classList.remove('on'));
  el.classList.add('on');render();
}
function setDateFilterSel(f){
  DF=f;NM=0;MF='';
  const sel=document.getElementById('f-month-sel');if(sel)sel.value='0';
  const rw=document.getElementById('f-range-wrap');
  if(rw)rw.style.display=f==='range'?'inline-flex':'none';
  if(f!=='range'){RF_FROM='';RF_TO='';render();}
}
function setRangeDates(){
  RF_FROM=document.getElementById('f-date-from').value;
  RF_TO=document.getElementById('f-date-to').value;
  render();
}
function setMonthPill(mo){
  if(!mo){MF='';render();return;}
  const yr=new Date().getFullYear();
  MF=`${yr}-${String(mo).padStart(2,'0')}`;DF='';NM=0;
  document.querySelectorAll('.pill[data-f]').forEach(p=>p.classList.remove('on'));
  render();
}
function setMonthFilter(m){
  MF=m;DF='';NM=0;
  document.querySelectorAll('.pill[data-f],.pill[data-mn]').forEach(p=>p.classList.remove('on'));
  buildMonthOpts();
  render();
}
function clearFilters(){
  DF='';NM=0;MF='';RF_FROM='';RF_TO='';
  ['f-area','f-mds','f-store','f-item','f-date-from','f-date-to'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.querySelectorAll('.pill[data-f],.pill[data-mn]').forEach(p=>p.classList.remove('on'));
  const ps=document.getElementById('f-period-sel');if(ps)ps.value='all';
  const rw=document.getElementById('f-range-wrap');if(rw)rw.style.display='none';
  render();
}
function filtered(data){
  const cutoff=getCutoff();
  let rangeEnd=null;
  if(DF==='range'&&RF_TO){rangeEnd=new Date(RF_TO);rangeEnd.setHours(23,59,59,999);}
  const fa=document.getElementById('f-area').value.toLowerCase();
  const fm=document.getElementById('f-mds').value.toLowerCase();
  const fs=document.getElementById('f-store').value.toLowerCase();
  return data.filter(r=>{
    const ts=r.timestamp;
    if(MF){const k=`${ts.getFullYear()}-${String(ts.getMonth()+1).padStart(2,'0')}`;if(k!==MF)return false;}
    else{if(ts<cutoff)return false;if(rangeEnd&&ts>rangeEnd)return false;}
    if(fa&&!(r.area||'').toLowerCase().includes(fa))return false;
    if(fm&&!(r.mds||'').toLowerCase().includes(fm))return false;
    if(fs&&!(r.store||'').toLowerCase().includes(fs))return false;
    return true;
  });
}

// ── SORT ─────────────────────────────────────────────────────────────────────
function sortBy(c){if(SC===c)SD*=-1;else{SC=c;SD=-1;}render();}
function doSort(data){
  return[...data].sort((a,b)=>{
    let av=a[SC],bv=b[SC];
    if(av instanceof Date)return SD*(av-bv);
    if(typeof av==='number')return SD*(av-bv);
    return SD*String(av||'').localeCompare(String(bv||''));
  });
}

// ── CHARTS ───────────────────────────────────────────────────────────────────
function chartTick(){return isLightTheme()?'rgba(70,60,40,.75)':'rgba(77,96,112,.9)';}
function chartGrid(){return isLightTheme()?'rgba(60,50,30,.08)':'rgba(255,255,255,.03)';}
function chartTooltipBg(){return isLightTheme()?'rgba(255,255,255,.97)':'rgba(4,5,10,.96)';}
function chartTooltipTitle(){return isLightTheme()?'rgba(43,36,23,.7)':'rgba(232,238,248,.5)';}
function chartTooltipBody(){return isLightTheme()?'#2B2417':'#e8eef8';}
function chartBorder(){return isLightTheme()?'rgba(60,50,30,.15)':'rgba(255,255,255,.07)';}
function getBase(){return{
  responsive:true,maintainAspectRatio:false,
  plugins:{legend:{display:false},tooltip:{backgroundColor:chartTooltipBg(),titleColor:chartTooltipTitle(),bodyColor:chartTooltipBody(),borderColor:chartBorder(),borderWidth:1,padding:10,cornerRadius:10}},
  scales:{
    x:{ticks:{color:chartTick(),font:{size:9,family:"'Plus Jakarta Sans',sans-serif"}},grid:{color:chartGrid()}},
    y:{ticks:{color:chartTick(),font:{size:9,family:"'Plus Jakarta Sans',sans-serif"}},grid:{color:chartGrid()}}
  }
};}

function buildCharts(rkaF,beliF){
  const BASE=getBase();
  // 1. AV% bar
  const mav={};
  rkaF.forEach(r=>{const m=r.mds||'?';if(!mav[m])mav[m]={a:0,t:0};mav[m].a+=(r.avail||0);mav[m].t+=(r.avail||0)+(r.unavail||0);});
  const avE=Object.entries(mav).map(([m,v])=>({m,p:v.t?Math.round(v.a/v.t*100):0})).sort((a,b)=>b.p-a.p).slice(0,10);
  if(cAV)cAV.destroy();
  cAV=new Chart(document.getElementById('chart-av'),{type:'bar',
    data:{labels:avE.map(e=>sn(e.m)),datasets:[{data:avE.map(e=>e.p),backgroundColor:avE.map(e=>e.p>=80?'rgba(16,214,106,.7)':e.p>=60?'rgba(110,168,254,.7)':'rgba(242,95,92,.7)'),borderRadius:6,borderSkipped:false}]},
    options:{...BASE,scales:{...BASE.scales,y:{...BASE.scales.y,max:100,ticks:{...BASE.scales.y.ticks,callback:v=>v+'%'}}},plugins:{...BASE.plugins,tooltip:{...BASE.plugins.tooltip,callbacks:{label:c=>c.raw+'%'}}}}});

  // 2. Trend line
  const dm={};
  rkaF.forEach(r=>{const k=r.timestamp.toLocaleDateString('id-ID',{day:'numeric',month:'short'});dm[k]=(dm[k]||0)+1;});
  const days=Object.entries(dm).slice(-14);
  if(cTrend)cTrend.destroy();
  cTrend=new Chart(document.getElementById('chart-trend'),{type:'line',
    data:{labels:days.map(d=>d[0]),datasets:[{data:days.map(d=>d[1]),borderColor:'#10d66a',backgroundColor:'rgba(16,214,106,.07)',tension:.45,fill:true,pointBackgroundColor:'#10d66a',pointRadius:3,pointHoverRadius:5}]},
    options:{...BASE}});

  // 3. NS vs HILO stacked
  const mb={};
  beliF.forEach(r=>{const m=r.mds||'?';if(!mb[m])mb[m]={ns:0,hi:0};mb[m].ns+=(r.groupTotals&&r.groupTotals.NS||0);mb[m].hi+=(r.groupTotals&&r.groupTotals.HILO||0);});
  const bE=Object.entries(mb).sort((a,b)=>(b[1].ns+b[1].hi)-(a[1].ns+a[1].hi)).slice(0,8);
  if(cBrand)cBrand.destroy();
  cBrand=new Chart(document.getElementById('chart-brand'),{type:'bar',
    data:{labels:bE.map(e=>sn(e[0])),datasets:[
      {label:'NS',data:bE.map(e=>e[1].ns),backgroundColor:'rgba(110,168,254,.7)',borderRadius:4,borderSkipped:false},
      {label:'HILO',data:bE.map(e=>e[1].hi),backgroundColor:'rgba(245,185,68,.7)',borderRadius:4,borderSkipped:false}
    ]},
    options:{...BASE,scales:{...BASE.scales,x:{...BASE.scales.x,stacked:true},y:{...BASE.scales.y,stacked:true}},plugins:{...BASE.plugins,legend:{display:false}}}});
}

// ── NS SPOTLIGHT ─────────────────────────────────────────────────────────────
function isCreamyMatcha(n){return n&&n.toUpperCase().includes('CREAMY MATCHA');}
function buildSpotlight(rkaF,beliF){
  let jpQty=0, asoQty=0, nsTotal=0, creamyMatchaQty=0, hiloTotal=0, txCount=0;
  beliF.forEach(r=>{
    const iq=r.itemQty;
    nsTotal+=(r.groupTotals&&r.groupTotals.NS||0);
    hiloTotal+=(r.groupTotals&&r.groupTotals.HILO||0);
    if(!iq)return;
    txCount++;
    Object.entries(iq).forEach(([n,v])=>{
      if(isJP(n)) jpQty+=Number(v)||0;
      else if(isASO(n)) asoQty+=Number(v)||0;
      else if(isCreamyMatcha(n)) creamyMatchaQty+=Number(v)||0;
    });
  });
  const maxVal=Math.max(jpQty,asoQty,creamyMatchaQty,1);
  function setItem(idPct,idBar,idCount,qty,color,label){
    document.getElementById(idPct).textContent=qty?qty+' renceng':'—';
    document.getElementById(idPct).style.color=color;
    document.getElementById(idBar).style.width=Math.round(qty/maxVal*100)+'%';
    document.getElementById(idBar).style.background=color;
    document.getElementById(idCount).textContent=qty?label:'Tidak ada data';
  }
  setItem('sp-jp-pct','sp-jp-bar','sp-jp-count',jpQty,'var(--accent)','NS JERUK PERAS PLS 18PX40SX14G');
  setItem('sp-aso-pct','sp-aso-bar','sp-aso-count',asoQty,'var(--blue)','NS ASO PLS 14GX18PX40S');
  setItem('sp-cm-pct','sp-cm-bar','sp-cm-count',creamyMatchaQty,'var(--green)','HI LO DRINK CREAMY MATCHA PLS');
  document.getElementById('sp-other-pct').textContent=nsTotal?nsTotal+' renceng':'—';
  document.getElementById('sp-other-pct').style.color='var(--gold)';
  document.getElementById('sp-other-bar').style.width='100%';
  document.getElementById('sp-other-bar').style.background='var(--gold)';
  document.getElementById('sp-other-count').textContent=nsTotal?`Total semua NS dari ${beliF.length} transaksi`:'Tidak ada data';
  document.getElementById('sp-hilo-pct').textContent=hiloTotal?hiloTotal+' renceng':'—';
  document.getElementById('sp-hilo-pct').style.color='var(--amber)';
  document.getElementById('sp-hilo-bar').style.width='100%';
  document.getElementById('sp-hilo-bar').style.background='var(--amber)';
  document.getElementById('sp-hilo-count').textContent=hiloTotal?`Total semua HILO dari ${beliF.length} transaksi`:'Tidak ada data';
  document.getElementById('sp-visits').textContent=txCount||beliF.length;
}

// ── RENDER ────────────────────────────────────────────────────────────────────
let STOCK_ALL=[], SUBTAB_STOCK='log';
let SUBTAB_RKA='log', SUBTAB_BELI='log', SUBTAB_FORMULA='summary', SUBTAB_PJMDS='mds', SUBTAB_NED='log', SUBTAB_SPG='log';
let NED_ALL=[], SPG_ALL=[];
function switchTab(t){
  TAB=t;
  ['rka','beli','stock','pjmds','formula','ned','spg'].forEach(x=>{
    const el=document.getElementById('ntab-'+x);
    if(el){el.classList.toggle('on',x===t);el.classList.toggle(x,true);}
  });
  document.getElementById('sec-rka').style.display=t==='rka'?'block':'none';
  document.getElementById('sec-beli').style.display=t==='beli'?'block':'none';
  const ss=document.getElementById('sec-stock');if(ss)ss.style.display=t==='stock'?'block':'none';
  const sp=document.getElementById('sec-pjmds');if(sp)sp.style.display=t==='pjmds'?'block':'none';
  const sf=document.getElementById('sec-formula');if(sf)sf.style.display=t==='formula'?'block':'none';
  const sn=document.getElementById('sec-ned');if(sn)sn.style.display=t==='ned'?'block':'none';
  const sg=document.getElementById('sec-spg');if(sg)sg.style.display=t==='spg'?'block':'none';
  render();
}
function switchSubTab(main,sub){
  if(main==='rka'){
    SUBTAB_RKA=sub;
    ['log','store'].forEach(s=>{const el=document.getElementById('stab-rka-'+s);if(el)el.classList.toggle('on',s===sub);});
  }else if(main==='stock'){
    SUBTAB_STOCK=sub;
    ['log','item'].forEach(s=>{const el=document.getElementById('stab-stock-'+s);if(el)el.classList.toggle('on',s===sub);});
  }else if(main==='formula'){
    SUBTAB_FORMULA=sub;
    ['summary','calc','detail'].forEach(s=>{const el=document.getElementById('stab-formula-'+s);if(el)el.classList.toggle('on',s===sub);});
    const sw=document.getElementById('formula-summary-wrap');if(sw)sw.style.display=sub==='summary'?'block':'none';
    const cw=document.getElementById('formula-calc-wrap');if(cw)cw.style.display=sub==='calc'?'block':'none';
    const dw=document.getElementById('formula-detail-wrap');if(dw)dw.style.display=sub==='detail'?'block':'none';
  }else if(main==='pjmds'){
    SUBTAB_PJMDS=sub;
    ['mds','scorecard'].forEach(s=>{const el=document.getElementById('stab-pjmds-'+s);if(el)el.classList.toggle('on',s===sub);});
    const mw=document.getElementById('pjmds-mds-wrap');if(mw)mw.style.display=sub==='mds'?'block':'none';
    const sw2=document.getElementById('pjmds-scorecard-wrap');if(sw2)sw2.style.display=sub==='scorecard'?'block':'none';
  }else if(main==='ned'){
    SUBTAB_NED=sub;
    ['log','urgent'].forEach(s=>{const el=document.getElementById('stab-ned-'+s);if(el)el.classList.toggle('on',s===sub);});
  }else if(main==='spg'){
    SUBTAB_SPG=sub;
    ['log','report'].forEach(s=>{const el=document.getElementById('stab-spg-'+s);if(el)el.classList.toggle('on',s===sub);});
    const lw=document.getElementById('spg-log-wrap');if(lw)lw.style.display=sub==='log'?'block':'none';
    const rw=document.getElementById('spg-report-wrap');if(rw)rw.style.display=sub==='report'?'block':'none';
  }else{
    SUBTAB_BELI=sub;
    ['log','analisis'].forEach(s=>{const el=document.getElementById('stab-beli-'+s);if(el)el.classList.toggle('on',s===sub);});
  }
  render();
}

function render(){
  const rkaF=filtered(RKA_ALL);
  let beliF=filtered(BELI_ALL);
  FI=(document.getElementById('f-item')?.value||'').trim().toLowerCase();
  if(FI)beliF=beliF.filter(r=>r.itemQty&&Object.keys(r.itemQty).some(k=>(Number(r.itemQty[k])||0)>0&&k.toLowerCase().includes(FI)));

  // KPI
  document.getElementById('ds-rka').textContent=rkaF.length||'—';
  const totA=rkaF.reduce((s,r)=>s+(r.avail||0),0),totI=rkaF.reduce((s,r)=>s+(r.avail||0)+(r.unavail||0),0);
  document.getElementById('ds-av').textContent=totI?Math.round(totA/totI*100)+'%':'—';
  const totNS=beliF.reduce((s,r)=>s+(r.groupTotals&&r.groupTotals.NS||0),0);
  const totHI=beliF.reduce((s,r)=>s+(r.groupTotals&&r.groupTotals.HILO||0),0);
  const totHILOPLS=beliF.reduce((s,r)=>s+(r.groupTotals&&r.groupTotals.HILOPLS||0),0);
  document.getElementById('ds-ns').textContent=totNS||'—';
  document.getElementById('ds-hilo').textContent=(totHI+totHILOPLS)||'—';
  const k=FI
    ?beliF.reduce((s,r)=>{if(!r.itemQty)return s;return s+Object.entries(r.itemQty).reduce((ss,[nm,v])=>nm.toLowerCase().includes(FI)?ss+(Number(v)||0)*(ITEM_PRICE[nm]?.pcs||0):ss,0);},0)
    :totNS*NS_PRICE+totHI*HILO_PRICE+totHILOPLS*HILOPLS_PRICE;
  document.getElementById('ds-kalc').textContent=k?rp(k):'—';
  const sub=document.getElementById('ds-kalc-sub');
  if(sub)sub.textContent=FI?`Value item: ${document.getElementById('f-item').value}`:'NS×11.250 + HILO×16.000 + HILO SCHOOL PLS×31.500';

  buildCharts(rkaF,beliF);
  buildSpotlight(rkaF,beliF);

  const nbRka=document.getElementById('nb-rka');if(nbRka)nbRka.textContent=rkaF.length||'—';
  const nbBeli=document.getElementById('nb-beli');if(nbBeli)nbBeli.textContent=beliF.length||'—';
  const stockF=filteredStock();
  const nbStk=document.getElementById('nb-stock');if(nbStk)nbStk.textContent=stockF.length||'—';
  const nedF=filteredNed();
  const nbNed=document.getElementById('nb-ned');if(nbNed)nbNed.textContent=nedF.length||'—';
  const spgF=filteredSpg();
  const nbSpg=document.getElementById('nb-spg');if(nbSpg)nbSpg.textContent=spgF.length||'—';
  if(TAB==='rka'){
    if(SUBTAB_RKA==='log')renderRKA(rkaF);
    else renderStore(rkaF);
  }else if(TAB==='stock'){
    if(SUBTAB_STOCK==='log')renderStockLog(stockF);
    else renderStockItem(stockF);
  }else if(TAB==='beli'){
    if(SUBTAB_BELI==='log')renderBeli(beliF);
    else renderAnalisis(rkaF,beliF);
  }else if(TAB==='pjmds'){
    renderPjmds(beliF);
    if(SUBTAB_PJMDS==='scorecard')renderScorecard();
  }else if(TAB==='formula'){
    if(SUBTAB_FORMULA==='summary')renderFormula(stockF);
    else if(SUBTAB_FORMULA==='calc'){populateFcSelects();renderInTransitImports();renderFcTable();fcPreview();}
    else{populateFdStoreSelect(stockF);renderFormulaDetail(stockF);}
  }else if(TAB==='ned'){
    if(SUBTAB_NED==='log')renderNedLog(nedF);
    else renderNedUrgent(nedF);
  }else if(TAB==='spg'){
    if(SUBTAB_SPG==='log')renderSpgLog(spgF);
    else renderSpgReport(spgF);
  }
}

// ── PENJUALAN MDS ────────────────────────────────────────────────────────────
function allMdsNames(){
  const set=new Set();
  Object.values(MDS_BY_AREA).forEach(list=>list.forEach(n=>set.add(n)));
  return[...set].sort();
}
function renderPjmds(beliF){
  renderKedaiStatus();
  const sel=document.getElementById('pjmds-select');
  if(sel&&sel.dataset.built!=='1'){
    sel.innerHTML='<option value="">— Pilih MDS —</option>'+allMdsNames().map(m=>`<option value="${m}">${m}</option>`).join('');
    sel.dataset.built='1';
  }
  if(sel)sel.value=PJMDS_SEL||'';
  const nb=document.getElementById('nb-pjmds');if(nb)nb.textContent=beliF.length||'—';
  const noteEl=document.getElementById('pjmds-match-note');
  if(noteEl){
    if(!PJMDS_SEL){noteEl.innerHTML='';}
    else if(!PJ_RAW.call.length){noteEl.innerHTML='<span style="color:var(--t3)">Data Call belum diupload — validasi nama menyusul setelah upload.</span>';}
    else{
      const resolved=pjResolveMdsName(PJMDS_SEL);
      if(!resolved){
        const callNames=[...new Set(PJ_RAW.call.map(r=>r.NamaMDS).filter(Boolean))].sort();
        noteEl.innerHTML=`<div style="color:var(--red);margin-bottom:6px">⚠ "${PJMDS_SEL}" tidak ditemukan pasangannya di data penjualan (Call). Pilih manual nama yang sesuai:</div>
          <select class="fi" style="width:260px" onchange="setPjmdsManualMatch(this.value)">
            <option value="">— Pilih nama di data Call —</option>
            ${callNames.map(n=>`<option value="${n}">${n}</option>`).join('')}
          </select>`;
      }
      else if(pjNormName(resolved)===pjNormName(PJMDS_SEL)){noteEl.innerHTML=`<span style="color:var(--accent)">✓ Nama cocok persis dengan data penjualan.</span>`;}
      else{
        const manualTag=PJMDS_MANUAL_MATCH[PJMDS_SEL]?' <span style="color:var(--t3)">(dipilih manual — <a href="#" onclick="setPjmdsManualMatch(\'\');return false;" style="color:var(--t3);text-decoration:underline">reset</a>)</span>':'';
        noteEl.innerHTML=`<span style="color:var(--amber)">✓ "${PJMDS_SEL}" dicocokkan dengan data penjualan sebagai "<b>${resolved}</b>"</span>${manualTag}`;
      }
    }
  }
  renderPjmdsDetail(beliF);
}
function selectPjmds(name){
  PJMDS_SEL=name||null;
  PJMDS_SHOW_TOKO=false;
  render();
}
async function loadPjmdsManualMatch(){
  if(!dbSulawesi)return;
  try{
    const doc=await dbSulawesi.collection('pjmds_manual_match').doc('main').get();
    if(doc.exists)PJMDS_MANUAL_MATCH=doc.data().map||{};
  }catch(e){console.error('loadPjmdsManualMatch failed',e);}
  render();
}
async function savePjmdsManualMatch(){
  if(!dbSulawesi)return;
  try{
    await dbSulawesi.collection('pjmds_manual_match').doc('main').set({map:PJMDS_MANUAL_MATCH,updatedAt:new Date().toISOString()});
  }catch(e){console.error('savePjmdsManualMatch failed',e);}
}
function setPjmdsManualMatch(callName){
  if(!PJMDS_SEL)return;
  if(callName)PJMDS_MANUAL_MATCH[PJMDS_SEL]=callName;
  else delete PJMDS_MANUAL_MATCH[PJMDS_SEL];
  render();
  savePjmdsManualMatch();
}
function togglePjmdsToko(){
  if(!PJMDS_SEL)return;
  PJMDS_SHOW_TOKO=!PJMDS_SHOW_TOKO;
  render();
}
function renderPjmdsDetail(beliF){
  const el=document.getElementById('pjmds-detail');
  if(!el)return;
  if(!PJMDS_SEL){el.innerHTML='<div class="panel-shell"><div class="panel-body" style="text-align:center;padding:32px;color:var(--t3)">Pilih nama MDS di atas untuk lihat detail pengambilan barang.</div></div>';return;}
  const rows=beliF.filter(r=>r.mds===PJMDS_SEL).sort((a,b)=>b.timestamp-a.timestamp);
  const totNota=rows.reduce((s,r)=>s+(r.nominal||0),0);
  const totValue=rows.reduce((s,r)=>{
    const nsR=r.groupTotals&&r.groupTotals.NS||0,hiR=r.groupTotals&&r.groupTotals.HILO||0;
    return s+nsR*NS_PRICE+hiR*HILO_PRICE;
  },0);
  const storeMap={};
  rows.forEach(r=>{
    const k=r.store||'—';
    if(!storeMap[k])storeMap[k]={store:k,area:r.area||'—',count:0,nota:0,dates:[]};
    storeMap[k].count++;storeMap[k].nota+=(r.nominal||0);
    if(r.timestamp)storeMap[k].dates.push(r.timestamp);
  });
  const storeRows=Object.values(storeMap).sort((a,b)=>b.count-a.count);
  const kedaiCount=KEDAI_DB.stores.filter(s=>s.mds===PJMDS_SEL).length;
  const pjData=computePjmdsMdsData(PJMDS_SEL);
  const totPenjualan=pjData?pjData.kpi.total_penjualan:null;

  let tokoDetailHtml='';
  if(PJMDS_SHOW_TOKO){
    tokoDetailHtml=`<div class="panel-shell" style="margin-top:12px"><div class="panel-body">
      <div class="ch-label" style="margin-bottom:10px">🏪 Toko yang Diambil — ${PJMDS_SEL}</div>
      <table><thead><tr><th>Toko</th><th>Area</th><th>Pengambilan</th><th>Tanggal</th><th>Total Nota</th></tr></thead><tbody>
        ${storeRows.length?storeRows.map(s=>{
          const tglStr=s.dates.slice().sort((a,b)=>b-a).map(d=>d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})).join(', ');
          return`<tr><td class="td-mid">${s.store}</td><td class="td-dim">${s.area}</td><td><span class="tag t sm">${s.count}x</span></td><td class="td-dim" style="font-size:10px">${tglStr}</td><td class="td-dim">${s.nota?rp(s.nota):'—'}</td></tr>`;
        }).join(''):'<tr><td colspan="5"><div class="empty-state">Belum ada toko yang diambil pada periode ini.</div></td></tr>'}
      </tbody></table>
      <div class="tfoot-row">${storeRows.length} toko</div>
    </div></div>`;
  }

  el.innerHTML=`
    <div class="bento bento-4">
      <div class="kpi-shell"><div class="kpi-border" style="--gc:rgba(236,72,153,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 0% 0%,var(--pink),transparent 70%)"></div><div class="kpi-label">Total Pengambilan</div><div class="kpi-val" style="color:var(--pink)">${rows.length}</div><div class="kpi-sub">transaksi/nota pada periode ini</div></div></div>
      <div class="kpi-shell"><div class="kpi-border" style="--gc:rgba(16,185,129,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 50% 0%,var(--green),transparent 70%)"></div><div class="kpi-label">Total Nilai Nota</div>
        <div style="display:flex;gap:14px;margin-top:2px">
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Total Nota</div><div class="kpi-val sm" style="color:var(--green)">${totNota?rp(totNota):'—'}</div></div>
          <div><div style="font-size:9px;color:var(--t3);text-transform:uppercase;letter-spacing:.06em">Total Value</div><div class="kpi-val sm" style="color:var(--accent)">${totValue?rp(totValue):'—'}</div></div>
        </div>
        <div class="kpi-sub">dari data Beli Barang MDS</div></div></div>
      <div class="kpi-shell" style="cursor:pointer" onclick="togglePjmdsToko()"><div class="kpi-border" style="--gc:rgba(6,182,212,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 100% 0%,var(--cyan),transparent 70%)"></div><div class="kpi-label">Toko Diambil</div><div class="kpi-val" style="color:var(--cyan)">${storeRows.length}${PJMDS_SHOW_TOKO?' ▲':' ▼'}</div><div class="kpi-sub">${kedaiCount?`dari ${kedaiCount} toko di database kedai · klik utk detail`:'klik utk lihat detail toko'}</div></div></div>
      <div class="kpi-shell"${totPenjualan===null?' style="opacity:.5"':''}><div class="kpi-border" style="--gc:rgba(139,92,246,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 100% 0%,var(--violet),transparent 70%)"></div><div class="kpi-label">Total Penjualan</div><div class="kpi-val sm" style="color:var(--violet)">${totPenjualan===null?'—':rp(totPenjualan)}</div><div class="kpi-sub">${totPenjualan===null?'menunggu upload data Call':'omzet NS + HILO dari data Call'}</div></div></div>
    </div>
    ${tokoDetailHtml}
    ${renderPjmdsSalesDetail(PJMDS_SEL)}`;
}

// ── STOCK HELPERS ───────────────────────────────────────────────────────────
function filteredStock(){
  const area=(document.getElementById('f-area')?.value||'').toLowerCase();
  const mds=(document.getElementById('f-mds')?.value||'').toLowerCase();
  const store=(document.getElementById('f-store')?.value||'').toLowerCase();
  const cut=getCutoff();
  return STOCK_ALL.filter(r=>{
    if(r.timestamp<cut)return false;
    if(MF){const d=r.timestamp;const m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(m!==MF)return false;}
    if(area&&!((r.area||'').toLowerCase().includes(area)))return false;
    if(mds&&!((r.nama||'').toLowerCase().includes(mds)))return false;
    if(store&&!((r.store||'').toLowerCase().includes(store)))return false;
    return true;
  });
}
function filteredNed(){
  const area=(document.getElementById('f-area')?.value||'').toLowerCase();
  const mds=(document.getElementById('f-mds')?.value||'').toLowerCase();
  const store=(document.getElementById('f-store')?.value||'').toLowerCase();
  const cut=getCutoff();
  return NED_ALL.filter(r=>{
    if(r.timestamp<cut)return false;
    if(MF){const d=r.timestamp;const m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(m!==MF)return false;}
    if(area&&!((r.area||'').toLowerCase().includes(area)))return false;
    if(mds&&!((r.nama||'').toLowerCase().includes(mds)))return false;
    if(store&&!((r.store||'').toLowerCase().includes(store)))return false;
    return true;
  });
}
function filteredSpg(){
  const area=(document.getElementById('f-area')?.value||'').toLowerCase();
  const mds=(document.getElementById('f-mds')?.value||'').toLowerCase();
  const store=(document.getElementById('f-store')?.value||'').toLowerCase();
  const cut=getCutoff();
  return SPG_ALL.filter(r=>{
    if(r.timestamp<cut)return false;
    if(MF){const d=r.timestamp;const m=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');if(m!==MF)return false;}
    if(area&&!((r.area||'').toLowerCase().includes(area)))return false;
    if(mds&&!((r.nama||'').toLowerCase().includes(mds)))return false;
    if(store&&!((r.store||'').toLowerCase().includes(store)))return false;
    return true;
  });
}
function nedExpDaysLeft(exp){
  if(!exp)return null;
  const[y,m]=exp.split('-').map(Number);
  const expDate=new Date(y,m,0); // last day of that month
  return Math.ceil((expDate-new Date())/864e5);
}
function nedExpLabelDash(exp){
  if(!exp)return'—';
  const[y,m]=exp.split('-');
  const bln=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  return (bln[+m-1]||m)+' '+y;
}
let _NED_ROWS=[];
function renderNedLog(nedF){
  _NED_ROWS=[...nedF].sort((a,b)=>b.timestamp-a.timestamp);
  let totalItems=0,urgent=0,soon=0;
  nedF.forEach(r=>{
    const items=r.items||{};
    Object.values(items).forEach(it=>{
      totalItems++;
      const d=nedExpDaysLeft(it.exp);
      if(d!==null){if(d<=30)urgent++;else if(d<=90)soon++;}
    });
  });
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v||'—';};
  set('ds-ned-total',nedF.length);
  set('ds-ned-items',totalItems);
  set('ds-ned-urgent',urgent);
  set('ds-ned-soon',soon);
  const th=document.getElementById('table-head-ned');
  const tb=document.getElementById('table-body-ned');
  const tf=document.getElementById('tfoot-ned');
  if(!th)return;
  th.innerHTML='<tr><th>Waktu</th><th>Nama</th><th>Status</th><th>Area</th><th>Toko</th><th>Item NED</th></tr>';
  tb.innerHTML=_NED_ROWS.length?_NED_ROWS.map((r,i)=>{
    const ts=r.timestamp;
    const cnt=r.items?Object.keys(r.items).length:0;
    return`<tr class="${cnt?'clickrow':''}" ${cnt?`onclick="toggleNedDetail(this,${i})"`:''} style="cursor:${cnt?'pointer':'default'}">
      <td class="td-dim">${ts.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} ${ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td>
      <td class="td-main">${r.nama||'—'} ${cnt?'<span style="font-size:9px;color:var(--t3)">▾</span>':''}</td>
      <td class="td-dim">${r.status||'—'}</td>
      <td class="td-dim">${r.area||'—'}</td>
      <td class="td-mid">${r.store||'—'}</td>
      <td><span class="tag r sm">${cnt} item</span></td>
    </tr>`;
  }).join(''):'<tr><td colspan="6"><div class="empty-state">Belum ada data NED untuk periode/filter ini.</div></td></tr>';
  if(tf)tf.textContent=`${_NED_ROWS.length} entri kunjungan`;
}
function toggleNedDetail(tr,idx){
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('item-detail-row')){
    next.style.display=next.style.display==='none'?'':'none';
    const sp=tr.querySelector('span[style*="▾"]')||tr.querySelector('span[style*="▴"]');
    if(sp)sp.textContent=next.style.display===''?'▴':'▾';
    return;
  }
  const r=_NED_ROWS[idx]||{};
  const items=Object.entries(r.items||{}).sort(([,a],[,b])=>nedExpDaysLeft(a.exp)-nedExpDaysLeft(b.exp));
  let html=`<td colspan="99" style="padding:8px 16px 14px;background:${ov(1)};border-top:none">`;
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:5px">';
  items.forEach(([nm,{exp,qty}])=>{
    const d=nedExpDaysLeft(exp);
    const col=d!==null&&d<=30?'var(--red)':d!==null&&d<=90?'var(--amber)':'var(--t2)';
    html+=`<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:5px 8px;border-radius:5px;background:${ov(3)}">
      <span style="color:var(--t2)">${nm}</span>
      <span style="text-align:right;white-space:nowrap;margin-left:8px"><span style="color:${col};font-weight:700">${nedExpLabelDash(exp)}</span><br><span style="color:var(--t3)">${qty} rnc</span></span>
    </div>`;
  });
  html+='</div></td>';
  const det=document.createElement('tr');
  det.className='item-detail-row';
  det.innerHTML=html;
  tr.parentNode.insertBefore(det,tr.nextSibling);
  const sp=tr.querySelector('span[style*="▾"]');
  if(sp)sp.textContent='▴';
}
function renderNedUrgent(nedF){
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v||'—';};
  const flat=[];
  nedF.forEach(r=>{
    Object.entries(r.items||{}).forEach(([nm,{exp,qty}])=>{
      const d=nedExpDaysLeft(exp);
      flat.push({item:nm,exp,qty,daysLeft:d,store:r.store,area:r.area,nama:r.nama,ts:r.timestamp});
    });
  });
  flat.sort((a,b)=>(a.daysLeft??9e9)-(b.daysLeft??9e9));
  const totalItems=flat.length;
  const urgent=flat.filter(x=>x.daysLeft!==null&&x.daysLeft<=30).length;
  const soon=flat.filter(x=>x.daysLeft!==null&&x.daysLeft>30&&x.daysLeft<=90).length;
  set('ds-ned-total',nedF.length);
  set('ds-ned-items',totalItems);
  set('ds-ned-urgent',urgent);
  set('ds-ned-soon',soon);
  const th=document.getElementById('table-head-ned');
  const tb=document.getElementById('table-body-ned');
  const tf=document.getElementById('tfoot-ned');
  if(!th)return;
  th.innerHTML='<tr><th>Item</th><th>Toko</th><th>Area</th><th>Nama</th><th>Expired</th><th>Sisa Hari</th><th>Qty</th></tr>';
  tb.innerHTML=flat.length?flat.map(x=>{
    const col=x.daysLeft!==null&&x.daysLeft<=30?'var(--red)':x.daysLeft!==null&&x.daysLeft<=90?'var(--amber)':'var(--t2)';
    const badge=x.daysLeft!==null&&x.daysLeft<0?'Sudah lewat':x.daysLeft!==null?x.daysLeft+' hari':'—';
    return`<tr>
      <td class="td-main">${x.item}</td>
      <td class="td-mid">${x.store||'—'}</td>
      <td class="td-dim">${x.area||'—'}</td>
      <td class="td-dim">${x.nama||'—'}</td>
      <td style="color:${col};font-weight:700">${nedExpLabelDash(x.exp)}</td>
      <td style="color:${col};font-weight:700">${badge}</td>
      <td><span class="tag t sm">${x.qty} rnc</span></td>
    </tr>`;
  }).join(''):'<tr><td colspan="7"><div class="empty-state">Belum ada item NED untuk periode/filter ini.</div></td></tr>';
  if(tf)tf.textContent=`${flat.length} item · diurutkan dari yang paling dekat expired`;
}
let _SPG_ROWS=[];
function renderSpgLog(spgF){
  _SPG_ROWS=[...spgF].sort((a,b)=>b.timestamp-a.timestamp);
  const totalOmzet=spgF.reduce((s,r)=>s+(r.totalOmzet||0),0);
  const avgOmzet=spgF.length?Math.round(totalOmzet/spgF.length):0;
  const storesActive=new Set(spgF.map(r=>r.store||'?')).size;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v?rp(v):'—';};
  const setN=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v||'—';};
  setN('ds-spg-total',spgF.length);
  set('ds-spg-omzet',totalOmzet);
  set('ds-spg-avg',avgOmzet);
  setN('ds-spg-stores',storesActive);
  const th=document.getElementById('table-head-spg');
  const tb=document.getElementById('table-body-spg');
  const tf=document.getElementById('tfoot-spg');
  if(!th)return;
  th.innerHTML='<tr><th>Waktu</th><th>SPG</th><th>Area</th><th>Toko</th><th>Item</th><th>Total Omzet</th></tr>';
  tb.innerHTML=_SPG_ROWS.length?_SPG_ROWS.map((r,i)=>{
    const ts=r.timestamp;
    const cnt=r.items?Object.keys(r.items).length:0;
    return`<tr class="${cnt?'clickrow':''}" ${cnt?`onclick="toggleSpgDetail(this,${i})"`:''} style="cursor:${cnt?'pointer':'default'}">
      <td class="td-dim">${ts.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} ${ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td>
      <td class="td-main">${r.nama||'—'} ${cnt?'<span style="font-size:9px;color:var(--t3)">▾</span>':''}</td>
      <td class="td-dim">${r.area||'—'}</td>
      <td class="td-mid">${r.store||'—'}</td>
      <td><span class="tag au sm">${cnt} item</span></td>
      <td style="font-weight:700;color:var(--green)">${r.totalOmzet?rp(r.totalOmzet):'—'}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="6"><div class="empty-state">Belum ada laporan harian SPG untuk periode/filter ini.</div></td></tr>';
  if(tf)tf.textContent=`${_SPG_ROWS.length} laporan · Total Omzet ${rp(totalOmzet)}`;
}
function toggleSpgDetail(tr,idx){
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('item-detail-row')){
    next.style.display=next.style.display==='none'?'':'none';
    const sp=tr.querySelector('span[style*="▾"]')||tr.querySelector('span[style*="▴"]');
    if(sp)sp.textContent=next.style.display===''?'▴':'▾';
    return;
  }
  const r=_SPG_ROWS[idx]||{};
  const items=Object.entries(r.items||{}).sort(([,a],[,b])=>b.omzet-a.omzet);
  let html=`<td colspan="99" style="padding:8px 16px 14px;background:${ov(1)};border-top:none">`;
  html+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:5px">';
  items.forEach(([nm,{qty,omzet}])=>{
    html+=`<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:5px 8px;border-radius:5px;background:${ov(3)}">
      <span style="color:var(--t2)">${nm}</span>
      <span style="text-align:right;white-space:nowrap;margin-left:8px"><span style="color:var(--green);font-weight:700">${rp(omzet)}</span><br><span style="color:var(--t3)">${qty} rnc</span></span>
    </div>`;
  });
  html+='</div></td>';
  const det=document.createElement('tr');
  det.className='item-detail-row';
  det.innerHTML=html;
  tr.parentNode.insertBefore(det,tr.nextSibling);
  const sp=tr.querySelector('span[style*="▾"]');
  if(sp)sp.textContent='▴';
}
/* ── SPG REPORT (per-SPG evaluation) ─────────────────────────────────────── */
const SPG_PRIO_GROUPS=[
  {label:'HI LO School, Teen & Platinum',items:[
    "HI LO SCHOOL CHOCOLATE 12DX250G","HI LO SCHOOL CHOCOLATE 12DX500G","HI LO SCHOOL CHOCOLATE 6DX750G",
    "HI LO SCHOOL VANILLA 12DX250G","HI LO SCHOOL VANILLA VEGIBERI 12DX500G","HI LO SCHOOL VANILLA VEGIBERI 6DX750G",
    "HI LO SCHOOL HONEY 12DX250G","HI LO SCHOOL HONEY 12DX500G","HI LO SCHOOL STRAWBERRY CHEESECAKE 12DX500G",
    "HI LO SCHOOL BUBBLE GUM 12DX500G","HI LO SCHOOL COTTON CANDY 12DX500G","HI LO SCHOOL ORIGINAL 12DX12SX25G",
    "HI LO SCHOOL SUSU COKELAT 8GUSX10SX35G","HI LO SCHOOL SUSU VANILLA 8GUSX10SX35G",
    "HI LO TEEN CHOCOLATE 12DX250G","HI LO TEEN CHOCOLATE 12DX500G","HI LO TEEN CHOCOLATE 6DX750G",
    "HI LO TEEN VANILLA CARAMEL 12DX250G","HI LO TEEN VANILLA CARAMEL 12DX500G","HI LO TEEN VANILLA CARAMEL 6DX750G",
    "HI LO TEEN KOREAN BANANA 12DX250G","HI LO TEEN POPCORN CARAMEL 12DX500G",
    "HI LO TEEN HIPROTEIN ORIGINAL 12DX10SX33G","HI LO TEEN HIPROTEIN MELON 12DX400G",
    "HI LO PLATINUM ORIGINAL 12DX12SX30G","HI LO PLATINUM SWISS CHOCOLATE 12DX12SX34G",
    "HI LO PLATINUM +HMB VANILLA 12DX8SX42G","HI LO PLATINUM +HMB CHOCO MOCHA 12DX8SX40G"
  ]},
  {label:'TS Beras (kecuali Shirataki Noodles)',items:[
    "TS BERAS PORANG INSTAN 12PCHX1000G","TS BERAS PORANG INSTAN SACHET 12DX10SX40G",
    "TS BERAS PORANG INSTAN GOLDEN UBE 12DX7SX40G","TS BERAS PORANG INSTAN NASI GORENG 12DX7SX38.5G",
    "TS BERAS MERAH ORGANIK 12PCHX1000G"
  ]},
  {label:'Oil',items:[
    "TS CANOLA OIL 12BTLX946ML","TS CORN OIL 12BTLX946ML","TS CORN OIL REF 16PCHX1000ML",
    "TS EXTRA VIRGIN OLIVE OIL 12BTLX500ML","TS EXTRA LIGHT OLIVE OIL 12BTLX500ML","TS SUNFLOWER OIL 12BTLX946ML"
  ]},
  {label:'Stevia',items:["TS SWT STEVIA 24DX50SX1.8G","TS SWT STEVIA 12DX100SX1.8G"]},
  {label:'Diabtx Milk',items:["TS DIABTX MILK VANILLA MALT 12DX150G","TS DIABTX MILK VANILLA MALT 12DX500G"]},
  {label:'TS Spread Jam',items:[
    "TS CHOCOLATE SPREAD 12BTLX300G","TS ROYAL MATCHA SPREAD 12BTLX300G","TS PEANUT ALMOND BUTTER 12BTLX300G",
    "TS BALI ARTISAN SEA SALT 12BTLX300G","TS STRAWBERRY JAM 12BTLX375G"
  ]},
  {label:'HI LO Active Granola Berry Berry Honey',items:["HI LO ACTIVE GRANOLA BERRY BERRY HONEY 12PX150G"]}
];
let SPG_REPORT_SEL='';
function selectSpgReportName(name){
  SPG_REPORT_SEL=name;
  renderSpgReport(filteredSpg());
}
function renderSpgReport(spgF){
  const names=[...new Set(spgF.map(r=>r.nama||'?'))].sort((a,b)=>a.localeCompare(b));
  if(SPG_REPORT_SEL&&!names.includes(SPG_REPORT_SEL))SPG_REPORT_SEL='';
  if(!SPG_REPORT_SEL&&names.length)SPG_REPORT_SEL=names[0];
  const listEl=document.getElementById('spg-report-list');
  const detEl=document.getElementById('spg-report-detail');
  if(!listEl||!detEl)return;
  if(!names.length){
    listEl.innerHTML='';
    detEl.innerHTML='<div class="empty-state">Belum ada laporan harian SPG untuk periode/filter ini.</div>';
    return;
  }
  listEl.innerHTML=names.map(n=>{
    const cnt=spgF.filter(r=>(r.nama||'?')===n).length;
    return`<div class="pill ${n===SPG_REPORT_SEL?'on':''}" onclick="selectSpgReportName(${JSON.stringify(n)})">${n} <span style="opacity:.7">(${cnt})</span></div>`;
  }).join('');
  const rows=spgF.filter(r=>(r.nama||'?')===SPG_REPORT_SEL).sort((a,b)=>a.timestamp-b.timestamp);
  const totalOmzet=rows.reduce((s,r)=>s+(r.totalOmzet||0),0);
  const avgOmzet=rows.length?Math.round(totalOmzet/rows.length):0;
  const storesActive=new Set(rows.map(r=>r.store||'?')).size;
  const areasActive=new Set(rows.map(r=>r.area||'?')).size;

  // per-group totals across all rows for this SPG
  const groupTotals=SPG_PRIO_GROUPS.map(g=>{
    let omzet=0,qty=0;
    rows.forEach(r=>{
      Object.entries(r.items||{}).forEach(([nm,{qty:q,omzet:o}])=>{
        if(g.items.includes(nm)){omzet+=(o||0);qty+=(q||0);}
      });
    });
    return{label:g.label,omzet,qty};
  });
  const prioSet=new Set(SPG_PRIO_GROUPS.flatMap(g=>g.items));
  const prioTotal=groupTotals.reduce((s,g)=>s+g.omzet,0);
  const lainTotal=totalOmzet-prioTotal;

  let html='';
  html+=`<div class="bento bento-4" style="margin-bottom:16px">
    <div class="kpi-shell"><div class="kpi-border" style="--gc:rgba(245,158,11,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 0% 0%,var(--gold),transparent 70%)"></div><div class="kpi-label">Total Laporan</div><div class="kpi-val" style="color:var(--gold)">${rows.length||'—'}</div><div class="kpi-sub">${areasActive} area · ${storesActive} toko</div></div></div>
    <div class="kpi-shell"><div class="kpi-border" style="--gc:rgba(16,185,129,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 50% 0%,var(--green),transparent 70%)"></div><div class="kpi-label">Total Omzet</div><div class="kpi-val sm" style="color:var(--green)">${totalOmzet?rp(totalOmzet):'—'}</div><div class="kpi-sub">akumulasi periode terfilter</div></div></div>
    <div class="kpi-shell"><div class="kpi-border" style="--gc:rgba(6,182,212,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 100% 0%,var(--cyan),transparent 70%)"></div><div class="kpi-label">Avg Omzet / Hari</div><div class="kpi-val sm" style="color:var(--cyan)">${avgOmzet?rp(avgOmzet):'—'}</div><div class="kpi-sub">rata-rata per laporan</div></div></div>
    <div class="kpi-shell"><div class="kpi-border" style="--gc:rgba(139,92,246,.9)"></div><div class="kpi-inner"><div class="kpi-glow" style="background:radial-gradient(circle at 100% 0%,var(--violet),transparent 70%)"></div><div class="kpi-label">Omzet Item Prioritas</div><div class="kpi-val sm" style="color:var(--violet)">${prioTotal?rp(prioTotal):'—'}</div><div class="kpi-sub">${totalOmzet?Math.round(prioTotal/totalOmzet*100):0}% dari total omzet</div></div></div>
  </div>`;

  html+='<div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:8px">Omzet Harian — '+SPG_REPORT_SEL+'</div>';
  html+='<div class="panel-shell" style="margin-bottom:20px"><div class="panel-body">';
  html+='<table><thead><tr><th>Tanggal</th><th>Area</th><th>Toko</th><th>Item</th><th>Total Omzet</th></tr></thead><tbody>';
  html+=rows.length?rows.map(r=>{
    const ts=r.timestamp;
    const cnt=r.items?Object.keys(r.items).length:0;
    return`<tr><td class="td-dim">${ts.toLocaleDateString('id-ID',{weekday:'short',day:'numeric',month:'short',year:'numeric'})}</td><td class="td-dim">${r.area||'—'}</td><td class="td-mid">${r.store||'—'}</td><td><span class="tag au sm">${cnt} item</span></td><td style="font-weight:700;color:var(--green)">${r.totalOmzet?rp(r.totalOmzet):'—'}</td></tr>`;
  }).join(''):'<tr><td colspan="5"><div class="empty-state">Belum ada laporan.</div></td></tr>';
  html+='</tbody></table></div></div>';

  html+='<div style="font-size:12px;font-weight:700;color:var(--t2);margin-bottom:8px">Rekap per Grup Item Prioritas — '+SPG_REPORT_SEL+'</div>';
  html+='<div class="panel-shell"><div class="panel-body">';
  html+='<table><thead><tr><th>Grup Item</th><th>Qty (renceng)</th><th>Omzet</th><th>% dari Total</th></tr></thead><tbody>';
  html+=groupTotals.map(g=>`<tr><td class="td-main">${g.label}</td><td class="td-mid">${g.qty||'—'}</td><td style="font-weight:700;color:var(--green)">${g.omzet?rp(g.omzet):'—'}</td><td class="td-dim">${totalOmzet?Math.round(g.omzet/totalOmzet*100):0}%</td></tr>`).join('');
  html+=`<tr style="border-top:1px solid var(--border)"><td class="td-main">Item Lainnya (non-prioritas)</td><td class="td-mid">—</td><td style="font-weight:700;color:var(--t2)">${lainTotal?rp(lainTotal):'—'}</td><td class="td-dim">${totalOmzet?Math.round(lainTotal/totalOmzet*100):0}%</td></tr>`;
  html+='</tbody></table></div></div>';

  detEl.innerHTML=html;
}
function renderStockLog(stockF){
  const awal=stockF.filter(r=>r.stockType==='awal').length;
  const akhir=stockF.filter(r=>r.stockType==='akhir').length;
  const totalNilai=stockF.reduce((s,r)=>s+(r.totalNilai||0),0);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('ds-stk-total',stockF.length||'—');
  set('ds-stk-awal',awal||'—');
  set('ds-stk-akhir',akhir||'—');
  set('ds-stk-nilai',totalNilai?rp(totalNilai):'—');
  const th=document.getElementById('table-head-stock');
  const tb=document.getElementById('table-body-stock');
  const tf=document.getElementById('tfoot-stock');
  if(!th)return;
  th.innerHTML='<tr><th>ID</th><th>Waktu</th><th>Nama</th><th>Status</th><th>Area</th><th>Toko</th><th>Tipe</th><th>Item</th><th>Total Nilai</th></tr>';
  tb.innerHTML=stockF.length?stockF.map(r=>{
    const ts=r.timestamp;
    const cnt=r.items?Object.keys(r.items).length:0;
    const tipeTag=r.stockType==='awal'
      ?'<span class="tag" style="background:rgba(6,182,212,.15);color:var(--cyan);font-size:9px;padding:2px 8px;border-radius:10px;white-space:nowrap">Awal</span>'
      :'<span class="tag" style="background:rgba(245,158,11,.15);color:var(--amber);font-size:9px;padding:2px 8px;border-radius:10px;white-space:nowrap">Akhir</span>';
    return '<tr>'+
      '<td class="td-id">'+(r.id||'—')+'</td>'+
      '<td class="td-dim">'+ts.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+' '+ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})+'</td>'+
      '<td class="td-main">'+(r.nama||'—')+'</td>'+
      '<td class="td-dim">'+(r.status||'—')+'</td>'+
      '<td class="td-dim">'+(r.area||'—')+'</td>'+
      '<td class="td-mid">'+(r.store||'—')+'</td>'+
      '<td>'+tipeTag+'</td>'+
      '<td><span class="tag b sm">'+cnt+'</span></td>'+
      '<td class="td-main" style="color:var(--amber)">'+(r.totalNilai?rp(r.totalNilai):'—')+'</td>'+
    '</tr>';
  }).join(''):'<tr><td colspan="9" style="text-align:center;color:var(--t3);padding:32px">Belum ada data stock ('+STOCK_ALL.length+' doc di Firestore, '+stockF.length+' setelah filter)</td></tr>';
  if(tf)tf.innerHTML=stockF.length?'<span style="color:var(--t3);font-size:11px">'+stockF.length+' entri · Total Nilai: <strong style="color:var(--amber)">'+rp(totalNilai)+'</strong></span>':'';
}
let _STOCK_ROWS=[];
function renderStockItem(stockF){
  const map={};
  stockF.forEach(r=>{
    const key=(r.store||'?')+' | '+(r.stockType==='awal'?'Awal':'Akhir');
    if(!map[key])map[key]={store:r.store,tipe:r.stockType,area:r.area,nama:r.nama,items:{},nilaiPolos:0,nilaiNonPolos:0,ts:r.timestamp};
    if(r.items)Object.entries(r.items).forEach(([nm,v])=>{
      if(!map[key].items[nm])map[key].items[nm]={krt:0,rncg:0};
      map[key].items[nm].krt+=(v.krt||0);
      map[key].items[nm].rncg+=(v.rncg||0);
      const ip=ITEM_PRICE[nm]||{};
      const itemNilai=(v.krt||0)*(ip.ctn||0)+(v.rncg||0)*(ip.pcs||0);
      if(isPolosStock(nm))map[key].nilaiPolos+=itemNilai;
      else map[key].nilaiNonPolos+=itemNilai;
    });
  });
  _STOCK_ROWS=Object.values(map).sort((a,b)=>b.ts-a.ts);
  const th=document.getElementById('table-head-stock');
  const tb=document.getElementById('table-body-stock');
  const tf=document.getElementById('tfoot-stock');
  if(!th)return;
  th.innerHTML='<tr><th>Toko</th><th>Area</th><th>MDS/SPG</th><th>Tipe</th><th>Item Terisi</th><th style="color:var(--accent)">Nilai Polos</th><th style="color:var(--gold)">Nilai Non Polos</th><th>Total Nilai</th></tr>';
  tb.innerHTML=_STOCK_ROWS.length?_STOCK_ROWS.map((r,i)=>{
    const cnt=Object.keys(r.items).length;
    const total=r.nilaiPolos+r.nilaiNonPolos;
    const tipeTag=r.tipe==='awal'
      ?'<span class="tag" style="background:rgba(6,182,212,.15);color:var(--cyan);font-size:9px;padding:2px 8px;border-radius:10px">Awal</span>'
      :'<span class="tag" style="background:rgba(245,158,11,.15);color:var(--amber);font-size:9px;padding:2px 8px;border-radius:10px">Akhir</span>';
    return`<tr class="${cnt?'clickrow':''}" ${cnt?`onclick="toggleStockDetail(this,${i})"`:''}style="cursor:${cnt?'pointer':'default'}">
      <td class="td-main">${r.store||'—'} ${cnt?'<span style="font-size:9px;color:var(--t3)">▾</span>':''}</td>
      <td class="td-dim">${r.area||'—'}</td>
      <td class="td-dim">${r.nama||'—'}</td>
      <td>${tipeTag}</td>
      <td><span class="tag b sm">${cnt} item</span></td>
      <td style="font-weight:700;font-size:11px;color:var(--accent)">${r.nilaiPolos?rp(r.nilaiPolos):'—'}</td>
      <td style="font-weight:700;font-size:11px;color:var(--gold)">${r.nilaiNonPolos?rp(r.nilaiNonPolos):'—'}</td>
      <td class="td-main" style="color:var(--amber)">${total?rp(total):'—'}</td>
    </tr>`;
  }).join(''):'<tr><td colspan="8" style="text-align:center;color:var(--t3);padding:32px">Belum ada data</td></tr>';
  if(tf)tf.innerHTML='';
}
function toggleStockDetail(tr, idx){
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('item-detail-row')){
    next.style.display=next.style.display==='none'?'':'none';
    const sp=tr.querySelector('span[style*="▾"]')||tr.querySelector('span[style*="▴"]');
    if(sp)sp.textContent=next.style.display===''?'▴':'▾';
    return;
  }
  const r=_STOCK_ROWS[idx]||{};
  const items=r.items||{};
  const groups={NS:[],HILO:[],TS:[],O:[]};
  Object.entries(items).sort(([a],[b])=>a.localeCompare(b)).forEach(([nm,v])=>{
    const b=brandOf(nm);(groups[b]||groups.O).push({nm,v});
  });
  let html=`<td colspan="99" style="padding:8px 16px 14px;background:${ov(1)};border-top:none">`;
  // Split into Polos and Non Polos
  const polosList=[], nonPolosList=[];
  Object.entries(items).sort(([a],[b])=>a.localeCompare(b)).forEach(([nm,v])=>{
    (isPolosStock(nm)?polosList:nonPolosList).push({nm,v});
  });
  const renderSection=(list,label,col)=>{
    if(!list.length)return'';
    let s=`<div style="margin-bottom:10px"><div style="font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:${col};margin-bottom:5px;padding-bottom:4px;border-bottom:1px solid ${ov(4)}">${label}</div>`;
    s+='<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:3px">';
    list.forEach(({nm,v})=>{
      const short=nm.replace(/^(NS|HI LO|HILO|TS|L-MEN)\s+/i,'').trim().replace(/\s+PLS\s+.*/i,'').replace(/\s+\d+[A-Z]+X.*/i,'').slice(0,30);
      s+=`<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px;padding:4px 8px;border-radius:5px;background:${ov(3)}">
        <span style="color:var(--t2)">${short}</span>
        <span style="color:${col};font-weight:700;white-space:nowrap;margin-left:8px"><span style="color:var(--t3)">${v.krt||0}krt / ${v.rncg||0}rnc</span></span>
      </div>`;
    });
    s+='</div></div>';
    return s;
  };
  html+=renderSection(polosList,'Polos (NS & HILO Renceng)','var(--accent)');
  html+=renderSection(nonPolosList,'Non Polos','var(--gold)');
  html+='</td>';
  const det=document.createElement('tr');
  det.className='item-detail-row';
  det.innerHTML=html;
  tr.parentNode.insertBefore(det,tr.nextSibling);
  const sp=tr.querySelector('span[style*="▾"]');
  if(sp)sp.textContent='▴';
}

// ── TAB: Sell Out Formula ───────────────────────────────────────────────────
function parseNum(v){return parseInt(String(v).replace(/[.,]/g,''),10)||0;}
let IN_TRANSIT={};
try{IN_TRANSIT=JSON.parse(localStorage.getItem('mds_in_transit')||'{}');}catch(e){IN_TRANSIT={};}
function saveInTransit(){localStorage.setItem('mds_in_transit',JSON.stringify(IN_TRANSIT));}
function storeStockValue(items){
  let val=0;
  if(items)Object.entries(items).forEach(([nm,v])=>{
    const ip=ITEM_PRICE[nm]||{};
    val+=(v.krt||0)*(ip.ctn||0)+(v.rncg||0)*(ip.pcs||0);
  });
  return val;
}
let IN_TRANSIT_ITEMS={};
try{IN_TRANSIT_ITEMS=JSON.parse(localStorage.getItem('mds_in_transit_items')||'{}');}catch(e){IN_TRANSIT_ITEMS={};}
function saveInTransitItems(){localStorage.setItem('mds_in_transit_items',JSON.stringify(IN_TRANSIT_ITEMS));}
function storeItemBreakdown(stockF,store){
  const awal={},akhir={};
  stockF.forEach(r=>{
    if((r.store||'—')!==store||!r.items)return;
    const target=r.stockType==='awal'?awal:r.stockType==='akhir'?akhir:null;
    if(!target)return;
    Object.entries(r.items).forEach(([nm,v])=>{
      const ip=ITEM_PRICE[nm]||{};
      const val=(v.krt||0)*(ip.ctn||0)+(v.rncg||0)*(ip.pcs||0);
      const rncgEquiv=(v.rncg||0)+(v.krt||0)*((ip.ctn&&ip.pcs)?Math.round(ip.ctn/ip.pcs):0);
      if(!target[nm])target[nm]={val:0,rncg:0};
      target[nm].val+=val;
      target[nm].rncg+=rncgEquiv;
    });
  });
  return{awal,akhir};
}
const BULAN_ID=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
function monthKey(d){return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function monthLabel(key){if(!key)return'—';const[y,m]=key.split('-');return`${BULAN_ID[+m-1]||m} ${y}`;}
let MONTH_OVERRIDE={};
try{MONTH_OVERRIDE=JSON.parse(localStorage.getItem('mds_month_override')||'{}');}catch(e){MONTH_OVERRIDE={};}
function saveMonthOverride(){localStorage.setItem('mds_month_override',JSON.stringify(MONTH_OVERRIDE));saveDashState();}
// ── Shared dashboard state (Firestore sync) ─────────────────────────────────
let _dashStateTimer=null,_dashStateLoaded=false;
function saveDashState(){
  if(!db||!_dashStateLoaded)return;
  clearTimeout(_dashStateTimer);
  _dashStateTimer=setTimeout(()=>{
    db.collection('app_data').doc('dashboard_state').set({
      monthOverride:MONTH_OVERRIDE,
      inTransitImports:JSON.stringify(IN_TRANSIT_IMPORTS),
      selloutCalcs:JSON.stringify(SELLOUT_CALCS),
      updatedAt:new Date().toISOString()
    }).catch(e=>console.warn('saveDashState failed',e));
  },800);
}
async function loadDashState(){
  try{
    const snap=await db.collection('app_data').doc('dashboard_state').get();
    if(snap.exists){
      const d=snap.data();
      if(d.monthOverride)MONTH_OVERRIDE=d.monthOverride;
      if(d.inTransitImports)IN_TRANSIT_IMPORTS=JSON.parse(d.inTransitImports);
      if(d.selloutCalcs)SELLOUT_CALCS=JSON.parse(d.selloutCalcs);
      localStorage.setItem('mds_month_override',JSON.stringify(MONTH_OVERRIDE));
      localStorage.setItem('mds_in_transit_imports',JSON.stringify(IN_TRANSIT_IMPORTS));
      localStorage.setItem('mds_sellout_calcs',JSON.stringify(SELLOUT_CALCS));
    }
  }catch(e){console.warn('loadDashState failed (pakai data lokal)',e);}
  _dashStateLoaded=true;
  render();
}
function updateMonthOverride(el){
  MONTH_OVERRIDE[el.dataset.store]=el.value;
  saveMonthOverride();
  render();
}
function computeStoreStockMap(stockF){
  const map={};
  stockF.forEach(r=>{
    const store=r.store||'—', area=r.area||'—';
    if(!map[store])map[store]={store,area,awal:0,akhir:0,lastTs:null};
    let val=storeStockValue(r.items);
    if(!val&&r.totalNilai)val=r.totalNilai;
    if(r.stockType==='awal')map[store].awal+=val;
    else if(r.stockType==='akhir')map[store].akhir+=val;
    if(r.timestamp&&(!map[store].lastTs||r.timestamp>map[store].lastTs))map[store].lastTs=r.timestamp;
  });
  return Object.values(map).map(r=>({...r,monthKey:r.lastTs?monthKey(r.lastTs):null})).sort((a,b)=>a.store.localeCompare(b.store));
}
function renderFormula(stockF){
  const rows=computeStoreStockMap(stockF);
  const allMonthKeys=[...new Set(stockF.filter(r=>r.timestamp).map(r=>monthKey(r.timestamp)))].sort();
  let totalAwal=0,totalAkhir=0,totalDiff=0;
  const tb=document.getElementById('table-body-formula');
  if(!tb)return;
  tb.innerHTML=rows.length?rows.map(r=>{
    const key=r.store.toLowerCase();
    const diff=r.awal-r.akhir;
    totalAwal+=r.awal;totalAkhir+=r.akhir;totalDiff+=diff;
    const curMonth=MONTH_OVERRIDE[key]||r.monthKey||'';
    const monthOpts=[...new Set([...allMonthKeys,curMonth].filter(Boolean))].sort();
    const monthSelect=`<select class="fi" style="width:130px" data-store="${key}" onchange="updateMonthOverride(this)">
      ${!curMonth?'<option value="" selected>—</option>':''}
      ${monthOpts.map(mk=>`<option value="${mk}" ${mk===curMonth?'selected':''}>${monthLabel(mk)}</option>`).join('')}
    </select>`;
    return`<tr>
      <td class="td-main">${r.store}</td>
      <td class="td-dim">${r.area}</td>
      <td>${monthSelect}</td>
      <td class="td-dim">${r.awal?rp(r.awal):'—'}</td>
      <td class="td-dim">${r.akhir?rp(r.akhir):'—'}</td>
      <td style="font-weight:800;color:${diff>=0?'var(--accent)':'var(--red)'}">${rp(diff)}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="6"><div class="empty-state">Belum ada data stock untuk periode/filter ini.</div></td></tr>`;
  const totalTransit=IN_TRANSIT_IMPORTS.reduce((s,t)=>s+t.value,0);
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v?rp(v):'—';};
  set('fm-awal',totalAwal);set('fm-akhir',totalAkhir);set('fm-transit',totalTransit);set('fm-sellout',totalDiff);
  const nbF=document.getElementById('nb-formula');if(nbF)nbF.textContent=rows.length||'—';
  const tf=document.getElementById('tfoot-formula');if(tf)tf.textContent=`${rows.length} toko · Awal − Akhir (belum termasuk In Transit — gabungkan di sub-tab "Kalkulasi Manual")`;
}
function downloadFormulaTemplate(){
  const stockF=filteredStock();
  const rows=computeStoreStockMap(stockF);
  const data=[['Toko','Nilai In Transit (Rp)']].concat(rows.map(r=>[r.store,0]));
  const ws=XLSX.utils.aoa_to_sheet(data);
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'In Transit');
  XLSX.writeFile(wb,'template_in_transit.xlsx');
}
async function handleFormulaImportFile(file){
  const el=document.getElementById('formula-import-status');
  if(el)el.textContent='Membaca '+file.name+'…';
  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const sheet=wb.Sheets[wb.SheetNames[0]];
    const rows=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null});
    let count=0;
    rows.forEach((row,i)=>{
      if(i===0)return;
      const store=String(row[0]||'').trim();
      const val=parseNum(row[1]);
      if(!store||!val)return;
      IN_TRANSIT_IMPORTS.push({
        id:Date.now()+'-'+Math.random().toString(36).slice(2,7),
        store,value:val,items:{},dateCount:0,itemCount:0,
        savedAt:new Date().toISOString()
      });
      count++;
    });
    saveInTransitImports();
    if(el)el.textContent=`Berhasil diimpor: ${count} toko dari ${file.name} — ditambahkan sebagai baris terpisah di sub-tab "Kalkulasi Manual".`;
    render();
  }catch(e){
    console.error('Import in transit failed',e);
    if(el)el.textContent='Gagal membaca file: '+e.message;
  }
}

// ── In Transit from transaction detail (pick dates) ─────────────────────────
let TX_ALL=[], TX_SELECTED_STORE='', TX_SELECTED_DATES=new Set();
const MONTH_ORDER={January:1,February:2,March:3,April:4,May:5,June:6,July:7,August:8,September:9,October:10,November:11,December:12,
  Januari:1,Februari:2,Maret:3,Mei:5,Juni:6,Juli:7,Agustus:8,Oktober:10,Desember:12};
async function handleTxImportFile(file){
  const el=document.getElementById('tx-import-status');
  if(el)el.textContent='Membaca '+file.name+'…';
  try{
    const buf=await file.arrayBuffer();
    const wb=XLSX.read(buf,{type:'array'});
    const sheet=wb.Sheets[wb.SheetNames[0]];
    const aoa=XLSX.utils.sheet_to_json(sheet,{header:1,defval:null,raw:true});
    if(!aoa.length)throw new Error('Sheet kosong');
    const parseVal=v=>{
      if(v==null)return 0;
      if(typeof v==='number')return v;
      const cleaned=String(v).replace(/[^0-9.\-]/g,'');
      return parseFloat(cleaned)||0;
    };
    // find the header row (first row containing a cell with "customer")
    let hdrIdx=aoa.findIndex(row=>row&&row.some(c=>String(c||'').toLowerCase().includes('customer')));
    if(hdrIdx<0)hdrIdx=0;
    const hdr=aoa[hdrIdx].map(c=>String(c||'').trim().toLowerCase());
    const findCol=(subs,fallback)=>{
      for(const s of subs){const i=hdr.findIndex(h=>h.includes(s));if(i>=0)return i;}
      return fallback;
    };
    const iCust=findCol(['customer'],0);
    const iMonth=findCol(['month','bulan'],1);
    const iDay=findCol(['day','tanggal'],2);
    const iItem=findCol(['item'],3);
    let iVal=findCol(['value','nilai','total'],-1);
    if(iVal<0)iVal=hdr.length-1; // fallback: last column
    window._TX_DEBUG_HEADERS=aoa[hdrIdx];
    window._TX_DEBUG_COLS={iCust,iMonth,iDay,iItem,iVal};
    TX_ALL=aoa.slice(hdrIdx+1).filter(row=>row&&String(row[iCust]||'').trim()).map(row=>({
      customer:String(row[iCust]||'').trim(),
      month:String(row[iMonth]||'').trim(),
      day:parseVal(row[iDay]),
      item:String(row[iItem]||'').trim(),
      value:parseVal(row[iVal])
    }));
    window._TX_DEBUG_RAW=TX_ALL.slice(0,3);
    TX_SELECTED_STORE='';TX_SELECTED_DATES=new Set();
    const grandTotal=TX_ALL.reduce((s,r)=>s+r.value,0);
    if(el)el.textContent=`Berhasil diimpor: ${TX_ALL.length} baris transaksi, ${new Set(TX_ALL.map(r=>r.customer)).size} toko/customer · Total value: ${rp(grandTotal)}`;
    populateTxStoreSelect();
    renderTxDates();
  }catch(e){
    console.error('Import transaksi failed',e);
    if(el)el.textContent='Gagal membaca file: '+e.message;
  }
}
function populateTxStoreSelect(){
  const sel=document.getElementById('tx-store-select');
  if(!sel)return;
  const stores=[...new Set(TX_ALL.map(r=>r.customer))].sort();
  sel.innerHTML='<option value="">— Pilih Toko —</option>'+stores.map(s=>`<option value="${s.replace(/"/g,'&quot;')}">${s}</option>`).join('');
}
function selectTxStore(store){
  TX_SELECTED_STORE=store;
  TX_SELECTED_DATES=new Set();
  renderTxDates();
}
function renderTxDates(){
  const wrap=document.getElementById('tx-dates-wrap');
  if(!wrap)return;
  if(!TX_SELECTED_STORE){wrap.innerHTML='';const box=document.getElementById('tx-sum-box');if(box)box.style.display='none';return;}
  const rowsForStore=TX_ALL.filter(r=>r.customer===TX_SELECTED_STORE);
  const dateMap={};
  rowsForStore.forEach(r=>{
    const key=r.month+'-'+r.day;
    if(!dateMap[key])dateMap[key]={month:r.month,day:r.day,total:0,count:0};
    dateMap[key].total+=r.value;
    dateMap[key].count++;
  });
  const dates=Object.values(dateMap).sort((a,b)=>(MONTH_ORDER[a.month]||99)-(MONTH_ORDER[b.month]||99)||a.day-b.day);
  wrap.innerHTML=dates.map(d=>{
    const key=d.month+'-'+d.day;
    const checked=TX_SELECTED_DATES.has(key)?'checked':'';
    return`<label style="display:inline-flex;align-items:center;gap:5px;background:${ov(3)};border:1px solid var(--border);border-radius:8px;padding:5px 10px;margin:3px 4px 3px 0;font-size:10px;cursor:pointer">
      <input type="checkbox" ${checked} onchange="toggleTxDate('${key}')" style="cursor:pointer">
      <span style="color:var(--t1)">${d.month.slice(0,3)} ${d.day}</span>
      <span style="color:var(--t3)">(${rp(d.total)})</span>
    </label>`;
  }).join('');
  updateTxSum();
}
function toggleTxDate(key){
  if(TX_SELECTED_DATES.has(key))TX_SELECTED_DATES.delete(key);
  else TX_SELECTED_DATES.add(key);
  updateTxSum();
}
function updateTxSum(){
  const box=document.getElementById('tx-sum-box');
  if(!box)return;
  if(!TX_SELECTED_STORE||!TX_SELECTED_DATES.size){box.style.display='none';return;}
  const rowsForStore=TX_ALL.filter(r=>r.customer===TX_SELECTED_STORE&&TX_SELECTED_DATES.has(r.month+'-'+r.day));
  const total=rowsForStore.reduce((s,r)=>s+r.value,0);
  box.style.display='flex';
  document.getElementById('tx-sum-val').textContent=rp(total);
  document.getElementById('tx-sum-count').textContent=`${TX_SELECTED_DATES.size} tanggal · ${rowsForStore.length} baris item`;
  document.getElementById('tx-apply-btn').dataset.value=total;
}
let IN_TRANSIT_IMPORTS=[];
try{IN_TRANSIT_IMPORTS=JSON.parse(localStorage.getItem('mds_in_transit_imports')||'[]');}catch(e){IN_TRANSIT_IMPORTS=[];}
function saveInTransitImports(){localStorage.setItem('mds_in_transit_imports',JSON.stringify(IN_TRANSIT_IMPORTS));saveDashState();}
function applyTxToStore(){
  const btn=document.getElementById('tx-apply-btn');
  const val=Number(btn.dataset.value)||0;
  if(!TX_SELECTED_STORE)return;
  const rowsForStore=TX_ALL.filter(r=>r.customer===TX_SELECTED_STORE&&TX_SELECTED_DATES.has(r.month+'-'+r.day));
  const itemMap={};
  rowsForStore.forEach(r=>{
    const nm=r.item||'—';
    itemMap[nm]=(itemMap[nm]||0)+r.value;
  });
  IN_TRANSIT_IMPORTS.push({
    id:Date.now()+'-'+Math.random().toString(36).slice(2,7),
    store:TX_SELECTED_STORE,
    value:val,
    items:itemMap,
    dateCount:TX_SELECTED_DATES.size,
    itemCount:Object.keys(itemMap).length,
    savedAt:new Date().toISOString()
  });
  saveInTransitImports();
  render();
  alert(`In Transit untuk "${TX_SELECTED_STORE}" (${rp(val)}, ${Object.keys(itemMap).length} item) disimpan sebagai baris terpisah. Buka sub-tab "Kalkulasi Manual" untuk memilih pasangannya (Stock Awal/Akhir toko manapun) — nama toko tidak dicocokkan otomatis.`);
}

// ── Manual Sell Out calculation composer ─────────────────────────────────────
let SELLOUT_CALCS=[];
try{SELLOUT_CALCS=JSON.parse(localStorage.getItem('mds_sellout_calcs')||'[]');}catch(e){SELLOUT_CALCS=[];}
function saveSelloutCalcs(){localStorage.setItem('mds_sellout_calcs',JSON.stringify(SELLOUT_CALCS));saveDashState();}
let _FC_COMBOS=[];
function buildStockCombos(){
  const map={};
  STOCK_ALL.forEach(r=>{
    if(!r.stockType)return;
    const store=r.store||'—';
    const override=MONTH_OVERRIDE[store.toLowerCase()];
    const mk=override||(r.timestamp?monthKey(r.timestamp):'');
    const key=r.stockType+'|'+store+'|'+mk;
    if(!map[key])map[key]={type:r.stockType,store,mk,value:0,items:{}};
    let val=storeStockValue(r.items);
    if(!val&&r.totalNilai)val=r.totalNilai;
    map[key].value+=val;
    if(r.items)Object.entries(r.items).forEach(([nm,v])=>{
      const ip=ITEM_PRICE[nm]||{};
      const iv=(v.krt||0)*(ip.ctn||0)+(v.rncg||0)*(ip.pcs||0);
      const rncgEquiv=(v.rncg||0)+(v.krt||0)*((ip.ctn&&ip.pcs)?Math.round(ip.ctn/ip.pcs):0);
      if(!map[key].items[nm])map[key].items[nm]={val:0,qty:0};
      map[key].items[nm].val+=iv;
      map[key].items[nm].qty+=rncgEquiv;
    });
  });
  _FC_COMBOS=Object.values(map).sort((a,b)=>a.store.localeCompare(b.store)||a.mk.localeCompare(b.mk));
}
function populateFcSelects(){
  buildStockCombos();
  const fill=(id,type)=>{
    const sel=document.getElementById(id);
    if(!sel)return;
    const cur=sel.value;
    const opts=_FC_COMBOS.map((c,i)=>({c,i})).filter(({c})=>c.type===type);
    sel.innerHTML='<option value="">— Pilih —</option>'+opts.map(({c,i})=>`<option value="${i}" ${String(i)===cur?'selected':''}>${c.store} · ${monthLabel(c.mk)} · ${rp(c.value)}</option>`).join('');
  };
  fill('fc-awal','awal');
  fill('fc-akhir','akhir');
  const tsel=document.getElementById('fc-transit-select');
  if(tsel){
    const cur=tsel.value;
    tsel.innerHTML='<option value="">— Pilih dari daftar —</option>'+IN_TRANSIT_IMPORTS.map(t=>`<option value="${t.id}" ${t.id===cur?'selected':''}>${t.store} · ${rp(t.value)} (${t.itemCount} item)</option>`).join('');
  }
}
function fcUseSavedTransit(id){
  if(!id){return;}
  const entry=IN_TRANSIT_IMPORTS.find(t=>t.id===id);
  if(!entry)return;
  document.getElementById('fc-transit').value=entry.value;
  _FC_TRANSIT_ITEMS=entry.items||{};
  fcPreview();
}
function tiDelete(id){
  IN_TRANSIT_IMPORTS=IN_TRANSIT_IMPORTS.filter(t=>t.id!==id);
  saveInTransitImports();
  render();
}
function renderInTransitImports(){
  const tb=document.getElementById('ti-body');
  if(!tb)return;
  let total=0;
  tb.innerHTML=IN_TRANSIT_IMPORTS.length?IN_TRANSIT_IMPORTS.slice().reverse().map(t=>{
    total+=t.value;
    return`<tr>
      <td class="td-main">${t.store}</td>
      <td class="td-dim">${t.dateCount} tanggal</td>
      <td class="td-dim">${t.itemCount} item</td>
      <td style="font-weight:800;color:var(--violet)">${rp(t.value)}</td>
      <td><span style="cursor:pointer;color:var(--red);font-size:11px" onclick="tiDelete('${t.id}')">✕</span></td>
    </tr>`;
  }).join(''):`<tr><td colspan="5"><div class="empty-state">Belum ada In Transit tersimpan. Pilih toko &amp; tanggal di panel di atas lalu klik "Simpan sebagai In Transit".</div></td></tr>`;
  const tf=document.getElementById('ti-tfoot');
  if(tf)tf.textContent=IN_TRANSIT_IMPORTS.length?`${IN_TRANSIT_IMPORTS.length} baris · Total ${rp(total)}`:'';
}
function fcGet(id){const v=document.getElementById(id)?.value;return v===''?null:_FC_COMBOS[+v];}
function fcPreview(){
  const awal=fcGet('fc-awal'),akhir=fcGet('fc-akhir');
  const transit=parseNum(document.getElementById('fc-transit')?.value||'');
  const el=document.getElementById('fc-preview-val');
  if(!el)return;
  if(!awal&&!akhir&&!transit){el.textContent='—';return;}
  const sellOut=(awal?awal.value:0)+transit-(akhir?akhir.value:0);
  el.textContent=rp(sellOut);
  el.style.color=sellOut>=0?'var(--green)':'var(--red)';
}
let _FC_TRANSIT_ITEMS={};
function fcSave(){
  const awal=fcGet('fc-awal'),akhir=fcGet('fc-akhir');
  const transit=parseNum(document.getElementById('fc-transit')?.value||'');
  if(!awal&&!akhir){alert('Pilih minimal Stock Awal atau Stock Akhir dulu.');return;}
  const store=awal?awal.store:akhir.store;
  SELLOUT_CALCS.push({
    store,
    awalLabel:awal?`${monthLabel(awal.mk)}`:'—',
    awalVal:awal?awal.value:0,
    transitVal:transit,
    akhirLabel:akhir?`${monthLabel(akhir.mk)} (${akhir.store})`:'—',
    akhirVal:akhir?akhir.value:0,
    awalItems:awal?awal.items:{},
    akhirItems:akhir?akhir.items:{},
    transitItems:transit?_FC_TRANSIT_ITEMS:{},
    savedAt:new Date().toISOString()
  });
  saveSelloutCalcs();
  renderFcTable();
  document.getElementById('fc-awal').value='';
  document.getElementById('fc-akhir').value='';
  document.getElementById('fc-transit').value='';
  document.getElementById('fc-transit-select').value='';
  _FC_TRANSIT_ITEMS={};
  fcPreview();
}
function fcDelete(i){
  SELLOUT_CALCS.splice(i,1);
  saveSelloutCalcs();
  renderFcTable();
}
function renderFcTable(){
  const tb=document.getElementById('fc-body');
  if(!tb)return;
  let tA=0,tT=0,tK=0,tS=0;
  tb.innerHTML=SELLOUT_CALCS.length?SELLOUT_CALCS.map((r,i)=>{
    const sellOut=r.awalVal+r.transitVal-r.akhirVal;
    tA+=r.awalVal;tT+=r.transitVal;tK+=r.akhirVal;tS+=sellOut;
    return`<tr>
      <td class="td-main">${r.store}</td>
      <td class="td-dim">${r.awalVal?rp(r.awalVal):'—'} <span style="font-size:9px;color:var(--t3)">${r.awalLabel}</span></td>
      <td class="td-dim">${r.transitVal?rp(r.transitVal):'—'}</td>
      <td class="td-dim">${r.akhirVal?rp(r.akhirVal):'—'} <span style="font-size:9px;color:var(--t3)">${r.akhirLabel}</span></td>
      <td style="font-weight:800;color:${sellOut>=0?'var(--accent)':'var(--red)'}">${rp(sellOut)}</td>
      <td style="white-space:nowrap"><span style="cursor:pointer;color:var(--cyan);font-size:10px;font-weight:700;margin-right:10px" onclick="exportFcCsv(${i})">⬇ CSV</span><span style="cursor:pointer;color:var(--red);font-size:11px" onclick="fcDelete(${i})">✕</span></td>
    </tr>`;
  }).join(''):`<tr><td colspan="6"><div class="empty-state">Belum ada kalkulasi tersimpan. Pilih Stock Awal, Stock Akhir, dan In Transit di atas lalu klik Simpan.</div></td></tr>`;
  const tf=document.getElementById('fc-tfoot');
  if(tf)tf.textContent=SELLOUT_CALCS.length?`${SELLOUT_CALCS.length} kalkulasi · Total: Awal ${rp(tA)} + In Transit ${rp(tT)} − Akhir ${rp(tK)} = Sell Out ${rp(tS)}`:'';
}
function exportFcCsv(i){
  const r=SELLOUT_CALCS[i];
  if(!r)return;
  const awalItems=r.awalItems||{},transitItems=r.transitItems||{},akhirItems=r.akhirItems||{};
  const allItems=[...new Set([...Object.keys(awalItems),...Object.keys(transitItems),...Object.keys(akhirItems)])].sort();
  const q=s=>`"${String(s).replace(/"/g,'""')}"`;
  // awal/akhir items are {val,qty} (from Stock Sell Out krt/rncg); transit items are flat value-only
  // (from transaction Excel, which has no qty column) — estimate qty from ITEM_PRICE per-renceng price when known
  const transitQty=(nm,val)=>{const p=ITEM_PRICE[nm]?.pcs;return p?Math.round(val/p):'';};
  let csv=`Toko,${q(r.store)}\nStock Awal,${q(r.awalLabel)}\nStock Akhir,${q(r.akhirLabel)}\n\n`;
  csv+='Item,Stock Awal Qty (rnc),Stock Awal Value,In Transit Qty (rnc)*,In Transit Value,Stock Akhir Qty (rnc),Stock Akhir Value,Sell Out Qty (rnc),Sell Out Value\n';
  let tAq=0,tAv=0,tTv=0,tTq=0,tKq=0,tKv=0;
  // old saved calcs stored flat values without qty — estimate missing qty from per-renceng price
  const asObj=(nm,x)=>{
    if(x&&typeof x==='object')return x;
    const val=Number(x)||0;
    const p=ITEM_PRICE[nm]?.pcs;
    return{val,qty:(val&&p)?Math.round(val/p):(val?'':0)};
  };
  csv+=allItems.map(nm=>{
    const a=asObj(nm,awalItems[nm]),k=asObj(nm,akhirItems[nm]);
    const tv=transitItems[nm]||0,tq=transitQty(nm,tv);
    tAq+=Number(a.qty)||0;tAv+=a.val;tTv+=tv;tTq+=Number(tq)||0;tKq+=Number(k.qty)||0;tKv+=k.val;
    const sellOutQty=a.qty===''||k.qty===''?'':(Number(a.qty)||0)+(Number(tq)||0)-(Number(k.qty)||0);
    const sellOutVal=a.val+tv-k.val;
    return[q(nm),a.qty,a.val,tq,tv,k.qty,k.val,sellOutQty,sellOutVal].join(',');
  }).join('\n');
  if(allItems.length)csv+='\n';
  csv+=['TOTAL',tAq,r.awalVal||tAv,tTq,r.transitVal||tTv,tKq,r.akhirVal||tKv,tAq+tTq-tKq,(r.awalVal||tAv)+(r.transitVal||tTv)-(r.akhirVal||tKv)].join(',');
  csv+='\n\n*Qty adalah renceng-equivalent; jika data qty asli tidak tersimpan (kalkulasi lama / file transaksi tanpa kolom qty) maka diestimasi dari Value ÷ harga per renceng.';
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');
  a.href=url;
  a.download=`SellOut_${r.store.replace(/[^\w-]+/g,'_')}_${new Date().toISOString().slice(0,10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
function populateFdStoreSelect(stockF){
  const sel=document.getElementById('fd-store-select');
  if(!sel)return;
  const cur=sel.value;
  const stores=[...new Set(stockF.map(r=>r.store||'—'))].sort();
  sel.innerHTML='<option value="">— Pilih Toko —</option>'+stores.map(s=>`<option value="${s.replace(/"/g,'&quot;')}" ${s===cur?'selected':''}>${s}</option>`).join('');
}
function renderFormulaDetail(stockF){
  stockF=stockF||filteredStock();
  const store=document.getElementById('fd-store-select')?.value||'';
  const tb=document.getElementById('table-body-formula-detail');
  const tf=document.getElementById('tfoot-formula-detail');
  if(!tb)return;
  if(!store){tb.innerHTML=`<tr><td colspan="6"><div class="empty-state">Pilih toko untuk melihat detail per item.</div></td></tr>`;if(tf)tf.textContent='';return;}
  const{awal,akhir}=storeItemBreakdown(stockF,store);
  const transitItems=IN_TRANSIT_ITEMS[store.toLowerCase()]||{};
  const allItems=[...new Set([...Object.keys(awal),...Object.keys(akhir),...Object.keys(transitItems)])].sort();
  let totAwal=0,totTransit=0,totAkhir=0,totSellOutVal=0,totSellOutQty=0;
  tb.innerHTML=allItems.length?allItems.map(nm=>{
    const a=awal[nm]||{val:0,rncg:0};
    const k=akhir[nm]||{val:0,rncg:0};
    const tVal=transitItems[nm]||0;
    const sellOutVal=a.val+tVal-k.val;
    const sellOutQty=a.rncg-k.rncg;
    totAwal+=a.val;totTransit+=tVal;totAkhir+=k.val;totSellOutVal+=sellOutVal;totSellOutQty+=sellOutQty;
    const short=nm.replace(/\s+\d+[A-Z]+X.*/i,'').slice(0,40);
    return`<tr>
      <td class="td-main">${short}</td>
      <td class="td-dim">${a.val?rp(a.val):'—'}</td>
      <td class="td-dim">${tVal?rp(tVal):'—'}</td>
      <td class="td-dim">${k.val?rp(k.val):'—'}</td>
      <td><span class="tag ${sellOutQty>=0?'g':'r'} sm">${sellOutQty}</span></td>
      <td style="font-weight:800;color:${sellOutVal>=0?'var(--accent)':'var(--red)'}">${rp(sellOutVal)}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="6"><div class="empty-state">Belum ada data stock/in transit untuk toko ini.</div></td></tr>`;
  if(tf)tf.textContent=allItems.length?`${allItems.length} item · Total: Stock Awal ${rp(totAwal)} + In Transit ${rp(totTransit)} − Stock Akhir ${rp(totAkhir)} = Sell Out ${rp(totSellOutVal)} (${totSellOutQty} rnc)`:'';
}

// ── TAB: Visit RKA ─────────────────────────────────────────────────────────
function renderRKA(rkaF){
  const rows=doSort(rkaF);
  document.getElementById('table-head-rka').innerHTML=`<tr>
    <th onclick="sortBy('id')">ID${ar('id')}</th>
    <th onclick="sortBy('timestamp')">Waktu${ar('timestamp')}</th>
    <th onclick="sortBy('mds')">MDS${ar('mds')}</th>
    <th onclick="sortBy('area')">Area${ar('area')}</th>
    <th onclick="sortBy('store')">Toko${ar('store')}</th>
    <th onclick="sortBy('avail')">Ada${ar('avail')}</th>
    <th onclick="sortBy('unavail')">Tdk${ar('unavail')}</th>
    <th>AV%</th><th>NS AV</th><th>HILO AV</th><th>TS AV</th>
  </tr>`;
  document.getElementById('table-body-rka').innerHTML=rows.length?rows.map(r=>{
    const pct=r.avail+r.unavail>0?Math.round(r.avail/(r.avail+r.unavail)*100):0;
    const ts=r.timestamp;
    const bav={NS:{a:0,t:0},HILO:{a:0,t:0},TS:{a:0,t:0}};
    if(r.items)Object.entries(r.items).forEach(([n,v])=>{const b=brandOf(n);if(bav[b]){bav[b].t++;if(v)bav[b].a++;}});
    function bTag(b){const d=bav[b];if(!d||!d.t)return'<span class="tag b sm">—</span>';const p=Math.round(d.a/d.t*100);return avTag(p,' sm');}
    const hasPhotos=(r.photoUrls&&Object.values(r.photoUrls).some(Boolean))||(r.photoData&&Object.values(r.photoData).some(Boolean));
    const hasItems=r.items&&Object.keys(r.items).length>0;
    const canExpand=hasPhotos||hasItems;
    const vid=r.id||'';
    return`<tr class="${canExpand?'clickrow':''}" ${canExpand?`data-vid="${vid}" onclick="toggleRkaDetail(this,'${vid}')"`:''}style="cursor:${canExpand?'pointer':'default'}">
      <td class="td-id">${r.id||'—'}</td>
      <td class="td-dim">${ts.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} ${ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td>
      <td class="td-main">${r.mds||'—'}</td>
      <td class="td-dim">${r.area||'—'}</td>
      <td class="td-mid">${r.store||'—'}${hasPhotos?' <span style="font-size:9px;color:var(--accent)">📷</span>':canExpand?' <span style="font-size:9px;color:var(--t3)">▾</span>':''}</td>
      <td><span class="tag g sm">${r.avail||0}</span></td>
      <td><span class="tag r sm">${r.unavail||0}</span></td>
      <td>${avTag(pct,' sm')}</td>
      <td>${bTag('NS')}</td><td>${bTag('HILO')}</td><td>${bTag('TS')}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="11"><div class="empty-state">Tidak ada data kunjungan.</div></td></tr>`;
  document.getElementById('tfoot').textContent=`${rows.length} kunjungan`;
  if(_expandedRkaVid){const tr=document.querySelector(`tr[data-vid="${_expandedRkaVid}"]`);if(tr)toggleRkaDetail(tr,_expandedRkaVid);}
}

// ── TAB: AV per Toko ───────────────────────────────────────────────────────
function renderStore(rkaF){
  const st={};
  rkaF.forEach(r=>{
    const s=r.store||'—';
    if(!st[s])st[s]={store:s,area:r.area||'—',visits:0,a:0,u:0,ns:{a:0,t:0},hilo:{a:0,t:0},ts:{a:0,t:0}};
    const e=st[s];e.visits++;e.a+=(r.avail||0);e.u+=(r.unavail||0);
    if(r.items)Object.entries(r.items).forEach(([n,v])=>{
      const b=brandOf(n).toLowerCase();
      if(e[b]){e[b].t++;if(v)e[b].a++;}
    });
  });
  let rows=Object.values(st).map(v=>({...v,pct:v.a+v.u>0?Math.round(v.a/(v.a+v.u)*100):0}));
  rows.sort((a,b)=>b.pct-a.pct);

  document.getElementById('table-head-rka').innerHTML=`<tr>
    <th onclick="sortBy('store')">Toko${ar('store')}</th>
    <th onclick="sortBy('area')">Area${ar('area')}</th>
    <th onclick="sortBy('visits')">Visit${ar('visits')}</th>
    <th>AV% Total</th><th>Bar</th>
    <th>NS AV%</th><th>HILO AV%</th><th>TS AV%</th><th>Status</th>
  </tr>`;
  document.getElementById('table-body-rka').innerHTML=rows.length?rows.map(e=>{
    function bCell(k){
      const d=e[k];if(!d||!d.t)return'<td><span class="tag b sm">—</span></td>';
      const p=Math.round(d.a/d.t*100);
      return`<td>${avTag(p,' sm')} <span style="font-size:9px;color:var(--t3)">${d.a}/${d.t}</span></td>`;
    }
    const s=e.pct>=80?'<span class="tag g sm">✓ Baik</span>':e.pct>=60?'<span class="tag b sm">~ Cukup</span>':'<span class="tag r sm">⚠ Perlu Perhatian</span>';
    return`<tr>
      <td class="td-main">${e.store}</td>
      <td class="td-dim">${e.area}</td>
      <td><span class="tag t sm">${e.visits}</span></td>
      <td>${avTag(e.pct,' sm')}</td>
      <td><div class="av-wrap"><div class="av-bg"><div class="av-fill" style="width:${e.pct}%;background:${avC(e.pct)}"></div></div></div></td>
      ${bCell('ns')}${bCell('hilo')}${bCell('ts')}
      <td>${s}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="9"><div class="empty-state">Tidak ada data toko.</div></td></tr>`;
  document.getElementById('tfoot').textContent=`${rows.length} toko`;
}

// ── TAB: Beli Barang ────────────────────────────────────────────────────────
function renderBeli(beliF){
  document.getElementById('beli-area-cards').style.display='none';
  const rows=doSort(beliF);
  document.getElementById('table-head-beli').innerHTML=`<tr>
    <th onclick="sortBy('id')">ID${ar('id')}</th>
    <th onclick="sortBy('timestamp')">Waktu${ar('timestamp')}</th>
    <th onclick="sortBy('mds')">MDS${ar('mds')}</th>
    <th onclick="sortBy('area')">Area${ar('area')}</th>
    <th onclick="sortBy('store')">Toko${ar('store')}</th>
    <th>NS Rnc</th><th>HILO Rnc</th>
    <th onclick="sortBy('totalRenceng')">Total Rnc${ar('totalRenceng')}</th>
    <th>Value</th>
    <th onclick="sortBy('nominal')">Nota${ar('nominal')}</th>
    <th>Selisih</th>
  </tr>`;
  document.getElementById('table-body-beli').innerHTML=rows.length?rows.map(r=>{
    const ts=r.timestamp;
    const nsR=r.groupTotals&&r.groupTotals.NS||0;
    const hiR=r.groupTotals&&r.groupTotals.HILO||0;
    const fullK=nsR*NS_PRICE+hiR*HILO_PRICE;
    const k=FI&&r.itemQty?Object.entries(r.itemQty).reduce((s,[nm,v])=>nm.toLowerCase().includes(FI)?s+(Number(v)||0)*(ITEM_PRICE[nm]?.pcs||0):s,0):fullK;
    const nota=r.nominal||0, diff=fullK-nota;
    const dTag=diff===0?'<span class="tag t sm">0</span>':diff>0?`<span class="tag g sm">+${rp(diff)}</span>`:`<span class="tag r sm">${rp(diff)}</span>`;
    const hasPhoto=!!(r.photoData||r.photoUrl);
    const bid=r.id||'';
    return`<tr class="${hasPhoto?'clickrow':''}" ${hasPhoto?`data-bid="${bid}" onclick="toggleBeliDetail(this,'${bid}')"`:''}style="cursor:${hasPhoto?'pointer':'default'}">
      <td class="td-id">${r.id||'—'}</td>
      <td class="td-dim">${ts.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} ${ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td>
      <td class="td-main">${r.mds||'—'}</td>
      <td class="td-dim">${r.area||'—'}</td>
      <td class="td-mid">${r.store||'—'}${hasPhoto?' <span style="font-size:9px;color:var(--accent)">📷</span>':''}</td>
      <td><span class="tag b sm">${nsR}</span></td>
      <td><span class="tag au sm">${hiR}</span></td>
      <td><span class="tag t sm">${r.totalRenceng||0}</span></td>
      <td style="color:var(--accent);font-weight:700;font-size:11px">${k?rp(k):'—'}</td>
      <td class="td-dim">${nota?rp(nota):'—'}</td>
      <td>${dTag}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="11"><div class="empty-state">Tidak ada data pembelian.</div></td></tr>`;
  document.getElementById('tfoot').textContent=`${rows.length} transaksi`;
  if(_expandedBeliVid){const tr=document.querySelector(`tr[data-bid="${_expandedBeliVid}"]`);if(tr)toggleBeliDetail(tr,_expandedBeliVid);}
}

// ── TAB: Analisis Beli MDS ──────────────────────────────────────────────────
let _LAST_ANALISIS_ENTRIES=[];
function renderAnalisis(rkaF,beliF){
  // ── 1. MDS roster per area (from registered MDS_BY_AREA list) ──
  const rosterByArea={};
  Object.entries(MDS_BY_AREA).forEach(([a,list])=>{
    rosterByArea[a]=new Set(list);
  });

  // ── 2. Who submitted beli in filtered period ──
  const submittedByArea={}, areaVars={};
  beliF.forEach(r=>{
    const a=r.area||'—',m=r.mds||'—';
    if(!submittedByArea[a])submittedByArea[a]=new Set();
    submittedByArea[a].add(m.toLowerCase());
    if(!areaVars[a])areaVars[a]={jp:0,aso:0,nsOther:0,hilo:0,value:0};
    if(FI){if(r.itemQty)Object.entries(r.itemQty).forEach(([nm,v])=>{if(nm.toLowerCase().includes(FI))areaVars[a].value+=(Number(v)||0)*(ITEM_PRICE[nm]?.pcs||0);});}
    else{areaVars[a].value+=((r.groupTotals&&r.groupTotals.NS||0)*NS_PRICE)+((r.groupTotals&&r.groupTotals.HILO||0)*HILO_PRICE)+((r.groupTotals&&r.groupTotals.HILOPLS||0)*HILOPLS_PRICE);}
    if(!r.itemQty)return;
    Object.entries(r.itemQty).forEach(([nm,qty])=>{
      const q=Number(qty)||0; if(!q)return;
      const nu=nm.toUpperCase();
      if(isJP(nm))areaVars[a].jp+=q;
      else if(isASO(nm))areaVars[a].aso+=q;
      else if(nu.startsWith('NS '))areaVars[a].nsOther+=q;
      else if(nu.startsWith('HI LO ')||nu.startsWith('HILO '))areaVars[a].hilo+=q;
    });
  });

  // ── 3. Variant aggregation from itemQty ──
  const varTot={},nsRnc={},hiRnc={};
  let totalNS=0,totalHILO=0,totalJPASO=0,nsVariants=0,hiVariants=0;
  beliF.forEach(r=>{
    if(!r.itemQty)return;
    Object.entries(r.itemQty).forEach(([nm,qty])=>{
      const q=Number(qty)||0; if(!q)return;
      varTot[nm]=(varTot[nm]||0)+q;
      const b=brandOf(nm);
      if(b==='NS'||nm.toUpperCase().startsWith('NS ')){
        nsRnc[nm]=(nsRnc[nm]||0)+q; totalNS+=q;
        if(isJP(nm)||isASO(nm))totalJPASO+=q;
      } else if(b==='HILO'||nm.toUpperCase().startsWith('HI LO ')||nm.toUpperCase().startsWith('HILO ')){
        hiRnc[nm]=(hiRnc[nm]||0)+q; totalHILO+=q;
      }
    });
  });
  nsVariants=Object.keys(nsRnc).length;
  hiVariants=Object.keys(hiRnc).length;
  const top5=Object.entries(varTot).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const jpPct=totalNS?Math.round(totalJPASO/totalNS*100):0;

  // ── 4. Area status cards ──
  const areas=Object.keys(rosterByArea).sort();
  const cardsEl=document.getElementById('beli-area-cards');
  cardsEl.style.display='block';

  let cardsHtml=`<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:12px;margin-bottom:16px">`;
  areas.forEach(area=>{
    const roster=[...rosterByArea[area]].sort();
    const submitted=submittedByArea[area]||new Set();
    const done=roster.filter(m=>submitted.has(m.toLowerCase()));
    const missing=roster.filter(m=>!submitted.has(m.toLowerCase()));
    const pct=roster.length?Math.round(done.length/roster.length*100):0;
    const barCol=pct===100?'var(--accent)':pct>=60?'var(--gold)':'var(--red)';
    const av=areaVars[area]||{jp:0,aso:0,nsOther:0,hilo:0};
    const nsTotal=av.jp+av.aso+av.nsOther;
    const varBadge=(label,val,col)=>val?`<span style="font-size:9px;padding:2px 8px;border-radius:5px;background:${col}22;color:${col};font-weight:700">${label} ${val}rnc</span>`:'';
    cardsHtml+=`<div style="background:${ov(2)};border:1px solid ${ov(5)};border-radius:16px;padding:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:12px;font-weight:700;color:var(--t1)">${area}</span>
        <span style="font-size:11px;font-weight:800;color:${barCol}">${done.length}/${roster.length}</span>
      </div>
      <div style="background:${ov(4)};border-radius:6px;height:6px;margin-bottom:10px;overflow:hidden">
        <div style="width:${pct}%;height:100%;background:${barCol};border-radius:6px;transition:width .4s"></div>
      </div>
      ${done.length?`<div style="margin-bottom:6px"><div style="font-size:8px;color:var(--accent);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px">Sudah isi (${done.length})</div><div style="display:flex;flex-wrap:wrap;gap:3px">${done.map(m=>`<span style="font-size:9px;padding:2px 7px;border-radius:5px;background:rgba(16,214,106,.1);color:var(--accent)">${sn(m)}</span>`).join('')}</div></div>`:''}
      ${missing.length?`<div style="margin-bottom:6px"><div style="font-size:8px;color:var(--red);font-weight:700;letter-spacing:.1em;text-transform:uppercase;margin-bottom:3px">Belum isi (${missing.length})</div><div style="display:flex;flex-wrap:wrap;gap:3px">${missing.map(m=>`<span style="font-size:9px;padding:2px 7px;border-radius:5px;background:rgba(239,68,68,.1);color:var(--red)">${sn(m)}</span>`).join('')}</div></div>`:'<div style="font-size:9px;color:var(--accent);margin-bottom:6px">✅ Semua MDS sudah isi</div>'}
      ${nsTotal||av.hilo?`<div style="border-top:1px solid ${ov(4)};padding-top:8px;margin-top:2px"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:5px"><div style="font-size:8px;color:var(--t3);font-weight:700;letter-spacing:.1em;text-transform:uppercase">Pengambilan</div>${av.value?`<div style="font-size:10px;font-weight:800;color:var(--pink)">${rp(av.value)}</div>`:''}</div><div style="display:flex;flex-wrap:wrap;gap:3px">${varBadge('JP',av.jp,'var(--accent)')}${varBadge('ASO',av.aso,'var(--blue)')}${av.nsOther?varBadge('NS Lain',av.nsOther,'var(--cyan)'):''}${varBadge('HILO',av.hilo,'var(--gold)')}</div></div>`:''}
    </div>`;
  });
  cardsHtml+='</div>';

  // ── 5. Variant analytics row ──
  const totalRnc=totalNS+totalHILO;
  cardsHtml+=`<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
    <div style="background:${ov(2)};border:1px solid ${ov(5)};border-radius:16px;padding:14px">
      <div style="font-size:8px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Varian NS vs HILO</div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:10px;color:var(--t2)">NS</span>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:9px;color:var(--t3)">${nsVariants} varian · ${totalNS} rnc</span>
          <span style="font-size:11px;font-weight:800;color:var(--blue)">${totalRnc?Math.round(totalNS/totalRnc*100):0}%</span>
        </div>
      </div>
      <div style="background:${ov(4)};border-radius:4px;height:5px;margin-bottom:8px;overflow:hidden">
        <div style="width:${totalRnc?Math.round(totalNS/totalRnc*100):0}%;height:100%;background:var(--blue);border-radius:4px"></div>
      </div>
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">
        <span style="font-size:10px;color:var(--t2)">HILO</span>
        <div style="display:flex;align-items:center;gap:6px">
          <span style="font-size:9px;color:var(--t3)">${hiVariants} varian · ${totalHILO} rnc</span>
          <span style="font-size:11px;font-weight:800;color:var(--gold)">${totalRnc?Math.round(totalHILO/totalRnc*100):0}%</span>
        </div>
      </div>
      <div style="background:${ov(4)};border-radius:4px;height:5px;overflow:hidden">
        <div style="width:${totalRnc?Math.round(totalHILO/totalRnc*100):0}%;height:100%;background:var(--gold);border-radius:4px"></div>
      </div>
    </div>

    <div style="background:${ov(2)};border:1px solid ${ov(5)};border-radius:16px;padding:14px">
      <div style="font-size:8px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Jeruk Peras & ASO dari NS</div>
      <div style="font-size:32px;font-weight:900;color:var(--accent);line-height:1;margin-bottom:4px">${jpPct}%</div>
      <div style="font-size:9px;color:var(--t3);margin-bottom:10px">${totalJPASO} rnc dari ${totalNS} total NS rnc</div>
      <div style="background:${ov(4)};border-radius:6px;height:6px;overflow:hidden">
        <div style="width:${jpPct}%;height:100%;background:var(--accent);border-radius:6px"></div>
      </div>
    </div>

    <div style="background:${ov(2)};border:1px solid ${ov(5)};border-radius:16px;padding:14px">
      <div style="font-size:8px;color:var(--t3);font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:10px">Top 5 Varian Terlaris</div>
      ${top5.length?top5.map(([nm,qty],i)=>{
        const short=nm.replace(/^(NS|HI LO|HILO)\s+/i,'').replace(/\s+PLS.*$/i,'').replace(/\s+\d+.*$/,'').trim().slice(0,28);
        const col=brandOf(nm)==='NS'?'var(--blue)':brandOf(nm)==='HILO'?'var(--gold)':'var(--t3)';
        const maxQty=top5[0][1];
        return`<div style="margin-bottom:5px"><div style="display:flex;justify-content:space-between;font-size:9px;margin-bottom:2px"><span style="color:var(--t2)">${i+1}. ${short}</span><span style="font-weight:700;color:${col}">${qty} rnc</span></div><div style="background:${ov(4)};border-radius:3px;height:3px;overflow:hidden"><div style="width:${Math.round(qty/maxQty*100)}%;height:100%;background:${col};border-radius:3px"></div></div></div>`;
      }).join(''):'<div style="color:var(--t3);font-size:10px">Belum ada data</div>'}
    </div>
  </div>`;

  cardsEl.innerHTML=cardsHtml;

  // ── 6. MDS summary table (existing) ──
  const fMds=(document.getElementById('f-mds')?.value||'').toLowerCase();
  const fArea=(document.getElementById('f-area')?.value||'').toLowerCase();
  const fStore=(document.getElementById('f-store')?.value||'').toLowerCase();
  const mds={};
  RKA_ALL.forEach(r=>{
    if(fMds&&!(r.mds||'').toLowerCase().includes(fMds))return;
    if(fArea&&!(r.area||'').toLowerCase().includes(fArea))return;
    if(fStore&&!(r.store||'').toLowerCase().includes(fStore))return;
    const m=r.mds||'—';if(!mds[m])mds[m]={name:m,area:r.area||'—',fd:r.timestamp,visits:0,a:0,t:0,ns:0,hi:0,nom:0,beli:0,stores:new Set()};if(r.timestamp<mds[m].fd)mds[m].fd=r.timestamp;});
  rkaF.forEach(r=>{const m=r.mds||'—';if(!mds[m])mds[m]={name:m,area:r.area||'—',fd:r.timestamp,visits:0,a:0,t:0,ns:0,hi:0,nom:0,beli:0,stores:new Set()};mds[m].visits++;mds[m].a+=(r.avail||0);mds[m].t+=(r.avail||0)+(r.unavail||0);mds[m].stores.add(r.store||'?');});
  beliF.forEach(r=>{const m=r.mds||'—';if(!mds[m])mds[m]={name:m,area:r.area||'—',fd:new Date(),visits:0,a:0,t:0,ns:0,hi:0,nom:0,beli:0,stores:new Set()};mds[m].ns+=(r.groupTotals&&r.groupTotals.NS||0);mds[m].hi+=(r.groupTotals&&r.groupTotals.HILO||0);mds[m].nom+=(r.nominal||0);mds[m].beli++;mds[m].stores.add(r.store||'?');});
  let entries=Object.values(mds).map(v=>({...v,storesCnt:v.stores.size,av:v.t?Math.round(v.a/v.t*100):null,k:v.ns*NS_PRICE+v.hi*HILO_PRICE,tdays:Math.floor((new Date()-v.fd)/864e5)}));
  const analysisFields=['name','tdays','visits','av','ns','hi','k','nom','beli'];
  entries=analysisFields.includes(SC)?doSort(entries):entries.sort((a,b)=>b.visits-a.visits);

  document.getElementById('table-head-beli').innerHTML=`<tr>
    <th onclick="sortBy('name')">MDS${ar('name')}</th><th>Area</th>
    <th onclick="sortBy('tdays')">Aktif Sejak${ar('tdays')}</th>
    <th onclick="sortBy('visits')">Visit${ar('visits')}</th>
    <th onclick="sortBy('av')">AV%${ar('av')}</th>
    <th onclick="sortBy('ns')">NS Rnc${ar('ns')}</th><th onclick="sortBy('hi')">HILO Rnc${ar('hi')}</th>
    <th onclick="sortBy('k')">Value${ar('k')}</th><th onclick="sortBy('nom')">Nota${ar('nom')}</th>
    <th>Selisih</th><th onclick="sortBy('beli')">Transaksi${ar('beli')}</th>
  </tr>`;
  document.getElementById('table-body-beli').innerHTML=entries.length?entries.map(e=>{
    const avL=e.av!==null?avTag(e.av,' sm'):'<span class="tag b sm">—</span>';
    const diff=e.k-e.nom;
    const dTag=diff===0?'<span class="tag t sm">0</span>':diff>0?`<span class="tag g sm">+${rp(diff)}</span>`:`<span class="tag r sm">${rp(diff)}</span>`;
    const sinceStr=e.fd.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'2-digit'});
    const hasBeli=submittedByArea[e.area]&&submittedByArea[e.area].has(e.name);
    return`<tr class="clickrow" onclick="openMDS('${e.name.replace(/'/g,"\\'")}')">
      <td class="td-main">${e.name} ${hasBeli?'<span style="font-size:9px;color:var(--accent)">✓</span>':'<span style="font-size:9px;color:var(--red)">✗</span>'}</td>
      <td class="td-dim">${e.area}</td>
      <td><span class="tag t sm">${sinceStr}</span> <span style="font-size:9px;color:var(--t3)">${tenure(e.fd)}</span></td>
      <td><span class="tag g sm">${e.visits}</span></td><td>${avL}</td>
      <td><span class="tag b sm">${e.ns}</span></td><td><span class="tag au sm">${e.hi}</span></td>
      <td style="color:var(--accent);font-weight:700;font-size:11px">${e.k?rp(e.k):'—'}</td>
      <td class="td-dim">${e.nom?rp(e.nom):'—'}</td><td>${dTag}</td>
      <td><span class="tag p sm">${e.beli}</span></td>
    </tr>`;
  }).join(''):`<tr><td colspan="11"><div class="empty-state">Tidak ada data MDS.</div></td></tr>`;
  document.getElementById('tfoot').textContent=`${entries.length} MDS — klik untuk detail modal`;
  _LAST_ANALISIS_ENTRIES=entries.map(e=>({...e,hasBeli:submittedByArea[e.area]&&submittedByArea[e.area].has(e.name)}));
}

// ── TAB: Evaluasi MDS ───────────────────────────────────────────────────────
function renderEval(rkaF,beliF){
  const mds={};
  rkaF.forEach(r=>{const m=r.mds||'—';if(!mds[m])mds[m]={name:m,area:r.area||'—',v:0,a:0,t:0,nom:0,stores:new Set()};mds[m].v++;mds[m].a+=(r.avail||0);mds[m].t+=(r.avail||0)+(r.unavail||0);mds[m].stores.add(r.store||'?');});
  beliF.forEach(r=>{const m=r.mds||'—';if(!mds[m])mds[m]={name:m,area:r.area||'—',v:0,a:0,t:0,nom:0,stores:new Set()};mds[m].nom+=(r.nominal||0);mds[m].stores.add(r.store||'?');});
  const rows=Object.values(mds).map(v=>({...v,sc:v.stores.size,av:v.t?Math.round(v.a/v.t*100):null})).sort((a,b)=>b.v-a.v);

  document.getElementById('table-head-beli').innerHTML=`<tr>
    <th>MDS</th><th>Area</th>
    <th onclick="sortBy('v')">Visit${ar('v')}</th><th>Toko</th>
    <th>AV%</th><th>Bar</th><th>Total Beli</th><th>Status</th>
  </tr>`;
  document.getElementById('table-body-beli').innerHTML=rows.length?rows.map(e=>{
    const avL=e.av!==null?avTag(e.av,' sm'):'<span class="tag b sm">—</span>';
    const bw=e.av||0;
    const s=e.av===null?'<span class="tag b sm">No Data</span>':e.av>=80?'<span class="tag g sm">✓ Baik</span>':e.av>=60?'<span class="tag b sm">~ Cukup</span>':'<span class="tag r sm">⚠ Perhatian</span>';
    return`<tr class="clickrow" onclick="openMDS('${e.name.replace(/'/g,"\\'")}')">
      <td class="td-main">${e.name}</td><td class="td-dim">${e.area}</td>
      <td><span class="tag g sm">${e.v}</span></td><td class="td-dim">${e.sc}</td>
      <td>${avL}</td>
      <td><div class="av-wrap"><div class="av-bg"><div class="av-fill" style="width:${bw}%;background:${avC(bw)}"></div></div></div></td>
      <td><span class="tag au sm">${e.nom?rp(e.nom):'—'}</span></td>
      <td>${s}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="8"><div class="empty-state">Tidak ada data.</div></td></tr>`;
  document.getElementById('tfoot').textContent=`${rows.length} MDS — klik untuk detail`;
}

// ── MODAL ────────────────────────────────────────────────────────────────────
function openMDS(name){
  const rkaF=filtered(RKA_ALL).filter(r=>r.mds===name);
  const beliF=filtered(BELI_ALL).filter(r=>r.mds===name);
  const allRka=RKA_ALL.filter(r=>r.mds===name);

  document.getElementById('modal-name').textContent=name;
  const areas=[...new Set(rkaF.map(r=>r.area||'—'))].join(', ');
  document.getElementById('modal-sub').textContent=`Area: ${areas||'—'}`;

  const fd=allRka.length?new Date(Math.min(...allRka.map(r=>r.timestamp))):null;
  document.getElementById('m-since').textContent=fd?fd.toLocaleDateString('id-ID',{day:'numeric',month:'short',year:'numeric'}):'—';
  document.getElementById('m-tenure').textContent=fd?tenure(fd):'';
  document.getElementById('m-visits').textContent=rkaF.length||'—';
  const tA=rkaF.reduce((s,r)=>s+(r.avail||0),0),tI=rkaF.reduce((s,r)=>s+(r.avail||0)+(r.unavail||0),0);
  document.getElementById('m-av').textContent=tI?Math.round(tA/tI*100)+'%':'—';
  const ns=beliF.reduce((s,r)=>s+(r.groupTotals&&r.groupTotals.NS||0),0);
  const hi=beliF.reduce((s,r)=>s+(r.groupTotals&&r.groupTotals.HILO||0),0);
  document.getElementById('m-ns').textContent=ns||'—';
  document.getElementById('m-hilo-sub').textContent=`HILO: ${hi}`;
  const k=ns*NS_PRICE+hi*HILO_PRICE;
  document.getElementById('m-kalc').textContent=k?rp(k):'—';
  const nota=beliF.reduce((s,r)=>s+(r.nominal||0),0);
  document.getElementById('m-nota-sub').textContent=`Nota: ${nota?rp(nota):'—'}`;

  // Chart: AV per day
  const da={};
  rkaF.forEach(r=>{const k=r.timestamp.toLocaleDateString('id-ID',{day:'numeric',month:'short'});if(!da[k])da[k]={a:0,t:0};da[k].a+=(r.avail||0);da[k].t+=(r.avail||0)+(r.unavail||0);});
  const dK=Object.keys(da).slice(-10);
  if(mcAV)mcAV.destroy();
  mcAV=new Chart(document.getElementById('mc-av'),{type:'line',
    data:{labels:dK,datasets:[{data:dK.map(k=>da[k].t?Math.round(da[k].a/da[k].t*100):0),borderColor:'#10d66a',backgroundColor:'rgba(16,214,106,.06)',tension:.45,fill:true,pointRadius:3,pointBackgroundColor:'#10d66a'}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>c.raw+'%'},backgroundColor:chartTooltipBg(),bodyColor:chartTooltipBody(),borderColor:chartBorder(),borderWidth:1,cornerRadius:8}},
      scales:{x:{ticks:{color:chartTick(),font:{size:8}},grid:{color:chartGrid()}},y:{max:100,ticks:{color:chartTick(),font:{size:8},callback:v=>v+'%'},grid:{color:chartGrid()}}}}});

  // Chart: NS vs HILO per month
  const mb={};
  beliF.forEach(r=>{const k=r.timestamp.toLocaleDateString('id-ID',{month:'short',year:'2-digit'});if(!mb[k])mb[k]={ns:0,hi:0};mb[k].ns+=(r.groupTotals&&r.groupTotals.NS||0);mb[k].hi+=(r.groupTotals&&r.groupTotals.HILO||0);});
  const moK=Object.keys(mb);
  if(mcBrand)mcBrand.destroy();
  mcBrand=new Chart(document.getElementById('mc-brand'),{type:'bar',
    data:{labels:moK,datasets:[
      {label:'NS',data:moK.map(k=>mb[k].ns),backgroundColor:'rgba(110,168,254,.7)',borderRadius:4,borderSkipped:false},
      {label:'HILO',data:moK.map(k=>mb[k].hi),backgroundColor:'rgba(245,185,68,.7)',borderRadius:4,borderSkipped:false}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,labels:{color:chartTick(),font:{size:9},boxWidth:8,padding:8}},tooltip:{backgroundColor:chartTooltipBg(),bodyColor:chartTooltipBody(),borderColor:chartBorder(),borderWidth:1,cornerRadius:8}},
      scales:{x:{stacked:true,ticks:{color:chartTick(),font:{size:8}},grid:{color:chartGrid()}},y:{stacked:true,ticks:{color:chartTick(),font:{size:8}},grid:{color:chartGrid()}}}}});

  // NS beli breakdown (purchase quantities per item)
  const nsBeliQty={};
  beliF.forEach(r=>{
    if(!r.itemQty)return;
    Object.entries(r.itemQty).forEach(([name,qty])=>{
      if(brandOf(name)!=='NS')return;
      nsBeliQty[name]=(nsBeliQty[name]||0)+(parseInt(qty)||0);
    });
  });
  const jpBK=Object.keys(nsBeliQty).find(k=>k.includes('JERUK PERAS'))||null;
  const asoBK=Object.keys(nsBeliQty).find(k=>k.includes('NS ASO'))||null;
  const jpBQ=jpBK?nsBeliQty[jpBK]:0, asoBQ=asoBK?nsBeliQty[asoBK]:0;
  const otherBQ=Object.entries(nsBeliQty).filter(([k])=>k!==jpBK&&k!==asoBK).reduce((s,[,v])=>s+v,0);
  const totalBQ=jpBQ+asoBQ+otherBQ;
  function beliNsBar(label,qty,total){
    if(!total)return`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="font-size:10px;color:var(--t2);font-weight:600">${label}</span><span style="font-size:10px;color:var(--t3)">0 renceng</span></div>`;
    const pct=Math.round(qty/total*100);
    const col=pct>=40?'var(--accent)':pct>=20?'var(--gold)':'var(--blue)';
    return`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px"><span style="font-size:10px;color:var(--t2);font-weight:600">${label}</span><span style="font-size:13px;font-weight:800;color:${col}">${qty}<span style="font-size:9px;color:var(--t3);font-weight:500"> renceng (${pct}%)</span></span></div><div style="height:5px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:4px"></div></div></div>`;
  }
  // Create NS beli section dynamically if not in HTML (cache-proof)
  if(!document.getElementById('modal-ns-beli-sec')){
    const sec=document.createElement('div');
    sec.className='msec'; sec.id='modal-ns-beli-sec';
    sec.innerHTML='<div class="msec-title">Rincian Pembelian NS</div><div id="modal-ns-beli-bars" style="padding-top:4px"></div>';
    const mb=document.querySelector('.modal-body');
    if(mb) mb.insertBefore(sec,mb.firstChild);
  }
  document.getElementById('modal-ns-beli-bars').innerHTML=totalBQ
    ?beliNsBar('NS Jeruk Peras PLS',jpBQ,totalBQ)+beliNsBar('NS ASO PLS',asoBQ,totalBQ)+beliNsBar('NS Lainnya',otherBQ,totalBQ)
    :'<div style="color:var(--t3);font-size:11px;padding:8px 0">Belum ada data pembelian NS per item</div>';
  document.getElementById('modal-ns-beli-sec').style.display='';

  // NS item comparison
  const nsMap={};
  rkaF.forEach(r=>{
    if(!r.items)return;
    Object.entries(r.items).forEach(([name,ada])=>{
      if(brandOf(name)!=='NS')return;
      if(!nsMap[name])nsMap[name]={ada:0,tot:0};
      nsMap[name].tot++;
      if(ada)nsMap[name].ada++;
    });
  });
  const jpK=Object.keys(nsMap).find(k=>k.includes('JERUK PERAS'))||null;
  const asoK=Object.keys(nsMap).find(k=>k.includes('AMERICAN SWEET ORANGE')||k.includes('NS ASO PLS'))||null;
  const others=Object.entries(nsMap).filter(([k])=>k!==jpK&&k!==asoK);
  const oAda=others.reduce((s,[,v])=>s+v.ada,0), oTot=others.reduce((s,[,v])=>s+v.tot,0);
  function nsBarHtml(label,ada,tot){
    if(!tot)return`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid var(--border)"><span style="font-size:10px;color:var(--t2);font-weight:600">${label}</span><span style="font-size:10px;color:var(--t3)">Tidak dicek</span></div>`;
    const pct=Math.round(ada/tot*100);
    const col=pct>=60?'var(--accent)':pct>=40?'var(--gold)':'var(--red)';
    return`<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:5px"><span style="font-size:10px;color:var(--t2);font-weight:600">${label}</span><span style="font-size:12px;font-weight:800;color:${col}">${ada}<span style="font-size:9px;color:var(--t3);font-weight:500"> / ${tot} kunjungan (${pct}%)</span></span></div><div style="height:5px;background:var(--border);border-radius:4px;overflow:hidden"><div style="height:100%;width:${pct}%;background:${col};border-radius:4px"></div></div></div>`;
  }
  document.getElementById('modal-ns-bars').innerHTML=
    nsBarHtml('NS Jeruk Peras PLS',jpK?nsMap[jpK].ada:0,jpK?nsMap[jpK].tot:0)+
    nsBarHtml('NS ASO (American Sweet Orange) PLS',asoK?nsMap[asoK].ada:0,asoK?nsMap[asoK].tot:0)+
    (oTot?nsBarHtml(`NS Lainnya — ${others.length} varian lain (rata-rata)`,oAda,oTot):'');
  document.getElementById('modal-ns-sec').style.display=Object.keys(nsMap).length?'':'none';

  // RKA log
  const rkaRows=rkaF.slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,20);
  document.getElementById('modal-rka-body').innerHTML=rkaRows.length?rkaRows.map(r=>{
    const pct=r.avail+r.unavail>0?Math.round(r.avail/(r.avail+r.unavail)*100):0;
    const bav={NS:{a:0,t:0},HILO:{a:0,t:0},TS:{a:0,t:0}};
    if(r.items)Object.entries(r.items).forEach(([n,v])=>{const b=brandOf(n);if(bav[b]){bav[b].t++;if(v)bav[b].a++;}});
    function bT(b){const d=bav[b];if(!d||!d.t)return'—';return Math.round(d.a/d.t*100)+'%';}
    const ts=r.timestamp;
    const hasItems=r.items&&Object.keys(r.items).length>0;
    const hasPhotos=(r.photoUrls&&Object.values(r.photoUrls).some(Boolean))||(r.photoData&&Object.values(r.photoData).some(Boolean));
    const canExpand=hasItems||hasPhotos;
    const vid=r.id||'';
    return`<tr class="${canExpand?'clickrow':''}" ${canExpand?`data-vid="${vid}" onclick="toggleRkaDetail(this,'${vid}')"`:''}><td class="td-dim">${ts.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} ${ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td><td class="td-mid">${r.store||'—'}${hasPhotos?' <span style="font-size:9px;color:var(--accent)">📷</span>':canExpand?' <span style="font-size:9px;color:var(--t3)">▾</span>':''}</td><td class="td-dim">${r.area||'—'}</td><td>${r.avail||0}</td><td>${r.unavail||0}</td><td>${avTag(pct,' sm')}</td><td style="color:var(--blue)">${bT('NS')}</td><td style="color:var(--gold)">${bT('HILO')}</td><td style="color:var(--t3)">${bT('TS')}</td></tr>`;
  }).join(''):'<tr><td colspan="9" style="text-align:center;padding:14px;color:var(--t3)">Tidak ada data</td></tr>';

  // Beli log
  const beliRows=beliF.slice().sort((a,b)=>b.timestamp-a.timestamp).slice(0,20);
  document.getElementById('modal-beli-body').innerHTML=beliRows.length?beliRows.map(r=>{
    const ts=r.timestamp;
    const nsR=r.groupTotals&&r.groupTotals.NS||0,hiR=r.groupTotals&&r.groupTotals.HILO||0;
    const k=nsR*NS_PRICE+hiR*HILO_PRICE,nota=r.nominal||0,diff=k-nota;
    const hasPhoto=!!(r.photoData||r.photoUrl);
    const bid=r.id||'';
    return`<tr class="${hasPhoto?'clickrow':''}" ${hasPhoto?`data-bid="${bid}" onclick="toggleBeliDetail(this,'${bid}')"`:''}><td class="td-dim">${ts.toLocaleDateString('id-ID',{day:'numeric',month:'short'})} ${ts.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'})}</td><td class="td-mid">${r.store||'—'}${hasPhoto?' <span style="font-size:9px;color:var(--accent)">📷</span>':''}</td><td style="color:var(--blue)">${nsR}</td><td style="color:var(--gold)">${hiR}</td><td>${r.totalRenceng||0}</td><td style="color:var(--accent);font-weight:700">${k?rp(k):'—'}</td><td class="td-dim">${nota?rp(nota):'—'}</td><td style="color:${diff>0?'var(--accent)':diff<0?'var(--red)':'var(--t3)'}">${diff?rp(diff):'—'}</td></tr>`;
  }).join(''):'<tr><td colspan="8" style="text-align:center;padding:14px;color:var(--t3)">Tidak ada data</td></tr>';

  document.getElementById('mds-modal').classList.remove('hidden');
}

// ── ITEM DETAIL TOGGLE ───────────────────────────────────────────────────────
function toggleRkaDetail(tr, vid){
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('item-detail-row')){
    next.style.display=next.style.display==='none'?'':'none';
    const sp=tr.querySelector('span[style*="▾"]')||tr.querySelector('span[style*="▴"]');
    if(sp)sp.textContent=next.style.display===''?'▴':'▾';
    _expandedRkaVid=next.style.display===''?vid:null;
    return;
  }
  _expandedRkaVid=vid;
  const r=RKA_ALL.find(x=>x.id===vid)||{};
  const items=r.items||{};
  const photos=Object.assign({},r.photoUrls||{},r.photoData||{});
  const groups={NS:[],HILO:[],TS:[],O:[]};
  Object.entries(items).sort(([a],[b])=>a.localeCompare(b)).forEach(([n,ada])=>{
    const b=brandOf(n); (groups[b]||groups.O).push({n,ada});
  });
  let html=`<td colspan="99" style="padding:6px 16px 12px;background:${ov(1)};border-top:none">`;
  const photoVals=Object.values(photos).filter(Boolean);
  const photoLabels=['TS Sweetener','HILO Box','NS & HILO Polos'];
  if(photoVals.length){
    html+='<div style="display:flex;gap:8px;margin-bottom:10px">';
    Object.entries(photos).forEach(([idx,url])=>{
      if(!url)return;
      const isData=url.startsWith('data:');
      html+=`<div style="flex:1;max-width:140px"><div style="font-size:8px;color:var(--t3);margin-bottom:3px;text-transform:uppercase;letter-spacing:.08em">${photoLabels[idx]||'Foto '+(+idx+1)}</div>${isData?`<img src="${url}" style="width:100%;border-radius:8px;border:1px solid var(--border);object-fit:cover;aspect-ratio:4/3;cursor:zoom-in" onclick="this.style.maxWidth=this.style.maxWidth?'':'none';this.style.width=this.style.width==='auto'?'100%':'auto'">` :`<a href="${url}" target="_blank"><img src="${url}" style="width:100%;border-radius:8px;border:1px solid var(--border);object-fit:cover;aspect-ratio:4/3" loading="lazy"></a>`}</div>`;
    });
    html+='</div>';
  }
  ['NS','HILO','TS'].forEach(brand=>{
    const list=groups[brand]; if(!list.length)return;
    html+=`<div style="margin-bottom:7px"><div style="font-size:8px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--t3);margin-bottom:4px">${brand}</div><div style="display:flex;flex-wrap:wrap;gap:3px">`;
    list.forEach(({n,ada})=>{
      const short=n.replace(/^(NS|HI LO|HILO|TS)\s+/i,'').replace(/\s+PLS.*$/i,'').trim();
      html+=`<span style="font-size:9px;padding:2px 7px;border-radius:5px;background:${ada?'rgba(16,214,106,.12)':'rgba(239,68,68,.1)'};color:${ada?'var(--accent)':'var(--red)'};font-weight:600">${ada?'✓':'✗'} ${short}</span>`;
    });
    html+='</div></div>';
  });
  html+='</td>';
  const det=document.createElement('tr');
  det.className='item-detail-row';
  det.innerHTML=html;
  tr.parentNode.insertBefore(det,tr.nextSibling);
  tr.querySelector('span[style*="▾"]').textContent='▴';
}

function toggleBeliDetail(tr, bid){
  const next=tr.nextElementSibling;
  if(next&&next.classList.contains('item-detail-row')){
    next.style.display=next.style.display==='none'?'':'none';
    const sp=tr.querySelector('span[style*="▾"]')||tr.querySelector('span[style*="▴"]');
    if(sp)sp.textContent=next.style.display===''?'▴':'▾';
    _expandedBeliVid=next.style.display===''?bid:null;
    return;
  }
  _expandedBeliVid=bid;
  const r=BELI_ALL.find(x=>x.id===bid)||{};
  const photo=r.photoData||r.photoUrl||'';
  const iq=r.itemQty||{};
  let html=`<td colspan="99" style="padding:8px 16px 14px;background:${ov(1)};border-top:none;display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start">`;
  // photo
  if(photo){
    const isData=photo.startsWith('data:');
    const imgHtml=isData
      ?`<img src="${photo}" style="max-width:220px;width:100%;border-radius:8px;border:1px solid var(--border);object-fit:contain;cursor:zoom-in" onclick="this.style.maxWidth=this.style.maxWidth?'':'none';this.style.width=this.style.width==='auto'?'100%':'auto'">`
      :`<a href="${photo}" target="_blank"><img src="${photo}" style="max-width:220px;width:100%;border-radius:8px;border:1px solid var(--border);object-fit:contain" loading="lazy"></a>`;
    html+=`<div><div style="font-size:8px;color:var(--t3);margin-bottom:5px;text-transform:uppercase;letter-spacing:.08em">Foto Nota</div>${imgHtml}</div>`;
  }
  // items
  if(Object.keys(iq).length){
    const groups={NS:[],HILO:[],O:[]};
    Object.entries(iq).sort(([a],[b])=>a.localeCompare(b)).forEach(([n,qty])=>{
      const b=brandOf(n);(groups[b]||groups.O).push({n,qty});
    });
    let ihtml='<div style="flex:1;min-width:180px"><div style="font-size:8px;color:var(--t3);margin-bottom:6px;text-transform:uppercase;letter-spacing:.08em">Item Dibeli</div><div style="display:flex;flex-direction:column;gap:4px">';
    ['NS','HILO','O'].forEach(brand=>{
      const list=groups[brand];if(!list.length)return;
      list.forEach(({n,qty})=>{
        const short=n.replace(/^(NS|HI LO|HILO|TS)\s+/i,'').replace(/\s+PLS.*$/i,'').trim();
        const col=brand==='NS'?'var(--blue)':brand==='HILO'?'var(--gold)':'var(--t3)';
        ihtml+=`<div style="display:flex;justify-content:space-between;align-items:center;font-size:10px"><span style="color:var(--t2)">${short}</span><span style="font-weight:700;color:${col};background:${ov(4)};padding:1px 8px;border-radius:4px">${qty} rnc</span></div>`;
      });
    });
    ihtml+='</div></div>';
    html+=ihtml;
  }
  html+='</td>';
  const det=document.createElement('tr');
  det.className='item-detail-row';
  det.innerHTML=html;
  tr.parentNode.insertBefore(det,tr.nextSibling);
}

// ── EXPORT CSV ────────────────────────────────────────────────────────────────
function exportCSV(){
  const rkaF=filtered(RKA_ALL),beliF=filtered(BELI_ALL),stockF=filtered(STOCK_ALL);
  const q=s=>`"${(s||'').toString().replace(/"/g,'""')}"`;
  let csv='',fn='MDS';
  if(TAB==='rka'){
    csv='ID,Waktu,MDS,Area,Toko,Ada,Tdk,AV%,NS AV%,HILO AV%,TS AV%,Item Ada,Item Tidak Ada\n';
    csv+=doSort(rkaF).map(r=>{
      const ts=r.timestamp,pct=r.avail+r.unavail>0?Math.round(r.avail/(r.avail+r.unavail)*100):0;
      const bav={NS:{a:0,t:0},HILO:{a:0,t:0},TS:{a:0,t:0}};
      const ada=[],tdk=[];
      if(r.items)Object.entries(r.items).forEach(([n,v])=>{
        const b=brandOf(n);
        if(b!=='O'){bav[b].t++;if(v)bav[b].a++;}
        if(v===true)ada.push(n);else if(v===false)tdk.push(n);
      });
      const bp=b=>bav[b].t?Math.round(bav[b].a/bav[b].t*100)+'%':'—';
      return[r.id,ts.toLocaleString('id-ID'),r.mds,r.area,q(r.store),r.avail,r.unavail,pct+'%',bp('NS'),bp('HILO'),bp('TS'),q(ada.join('; ')),q(tdk.join('; '))].join(',');
    }).join('\n');fn='RKA';
  }else if(TAB==='beli'&&SUBTAB_BELI==='analisis'){
    csv='MDS,Area,Aktif Sejak,Sudah Beli (Periode Ini),Visit,AV%,NS Rnc,HILO Rnc,Value,Nota,Selisih,Transaksi\n';
    csv+=_LAST_ANALISIS_ENTRIES.map(e=>{
      const diff=e.k-e.nom;
      return[q(e.name),q(e.area),e.fd.toLocaleDateString('id-ID'),e.hasBeli?'Ya':'Tidak',e.visits,e.av!==null?e.av+'%':'—',e.ns,e.hi,e.k,e.nom,diff,e.beli].join(',');
    }).join('\n');fn='Analisis_Beli_MDS';
  }else if(TAB==='beli'){
    csv='ID,Waktu,MDS,Area,Toko,NS Rnc,HILO Rnc,Total Rnc,Value,Nota,Selisih,Detail Item\n';
    csv+=doSort(beliF).map(r=>{
      const ts=r.timestamp,nsR=r.groupTotals&&r.groupTotals.NS||0,hiR=r.groupTotals&&r.groupTotals.HILO||0,k=nsR*NS_PRICE+hiR*HILO_PRICE;
      const detail=r.itemQty?Object.entries(r.itemQty).map(([n,v])=>`${n}:${v}`).join('; '):'';
      return[r.id,ts.toLocaleString('id-ID'),r.mds,r.area,q(r.store),nsR,hiR,r.totalRenceng||0,k,r.nominal||0,k-(r.nominal||0),q(detail)].join(',');
    }).join('\n');fn='Beli';
  }else if(TAB==='stock'){
    csv='ID,Waktu,Nama,Status,Area,Toko,Tipe,Total Nilai,Detail Item\n';
    csv+=stockF.map(r=>{
      const ts=r.timestamp;
      const detail=r.items?Object.entries(r.items).map(([n,v])=>`${n}:${v.krt||0}krt/${v.rncg||0}rncg`).join('; '):'';
      return[r.id,ts.toLocaleString('id-ID'),r.nama,r.status,r.area,q(r.store),r.stockType==='awal'?'Awal':'Akhir',r.totalNilai||0,q(detail)].join(',');
    }).join('\n');fn='Stock';
  }
  const blob=new Blob(['﻿'+csv],{type:'text/csv;charset=utf-8'});
  const url=URL.createObjectURL(blob);
  const a=document.createElement('a');a.href=url;a.download=`MDS_${fn}_${new Date().toISOString().slice(0,10)}.csv`;a.click();URL.revokeObjectURL(url);
}

// ── MDS SCORECARD: Beli Barang vs Penjualan MDS ─────────────────────────────
function mdsAreaOf(name){
  for(const[a,list]of Object.entries(MDS_BY_AREA))if(list.some(m=>m.toLowerCase()===name.toLowerCase()))return a;
  return '—';
}
function computeScorecardRows(){
  const beliF=filtered(BELI_ALL);
  return allMdsNames().map(name=>{
    const nLow=name.toLowerCase();
    const beli=beliF.filter(r=>(r.mds||'').toLowerCase()===nLow);
    const trx=beli.length;
    const ns=beli.reduce((s,r)=>s+(r.groupTotals&&r.groupTotals.NS||0),0);
    const hilo=beli.reduce((s,r)=>s+(r.groupTotals&&r.groupTotals.HILO||0)+(r.groupTotals&&r.groupTotals.HILOPLS||0),0);
    const beliVal=beli.reduce((s,r)=>s+kalc(r),0);
    const nota=beli.reduce((s,r)=>s+(r.nominal||0),0);
    const stores=new Set(beli.map(r=>r.store||'?')).size;
    const resolved=pjResolveMdsName(name);
    let omzetNS=0,omzetHILO=0,custCount=0,callCount=0,omzet=0;
    if(resolved){
      const cAll=PJ_RAW.call.filter(r=>r.NamaMDS===resolved);
      const oAll=PJ_RAW.order.filter(r=>r.NamaMDS===resolved);
      const c=pjPeriodFilterCall(cAll);
      const o=pjPeriodFilterOrder(oAll,c);
      callCount=c.length;
      omzetNS=c.reduce((s,r)=>s+(r.OmzetNS||0),0);
      omzetHILO=c.reduce((s,r)=>s+(r.OmzetHILO||0),0);
      custCount=new Set(c.map(r=>r.KodeCustomer)).size;
      omzet=o.reduce((s,r)=>s+pjOrderValue(r),0);
    }
    const maxBeliNota=Math.max(beliVal,nota);
    return{name,area:mdsAreaOf(name),trx,stores,ns,hilo,beliVal,nota,callCount,custCount,omzetNS,omzetHILO,omzet,selisih:omzet-maxBeliNota,matched:!!resolved};
  }).filter(r=>r.trx>0||r.omzet>0);
}
let SC_SORT='omzet',SC_DIR=-1;
function scSortBy(c){if(SC_SORT===c)SC_DIR*=-1;else{SC_SORT=c;SC_DIR=-1;}renderScorecard();}
function renderScorecard(){
  const tb=document.getElementById('sc-body');
  if(!tb)return;
  const rows=computeScorecardRows();
  rows.sort((a,b)=>{
    const av=a[SC_SORT],bv=b[SC_SORT];
    if(typeof av==='number')return SC_DIR*(av-bv);
    return SC_DIR*String(av||'').localeCompare(String(bv||''));
  });
  const maxOmzet=Math.max(...rows.map(r=>r.omzet),1);
  let tB=0,tO=0,tD=0,unmatched=0;
  tb.innerHTML=rows.length?rows.map(r=>{
    tB+=r.beliVal;tO+=r.omzet;tD+=r.selisih;if(!r.matched&&r.trx>0)unmatched++;
    const dTag=r.selisih===0?'<span class="tag t sm">0</span>':r.selisih>0?`<span class="tag g sm">+${rp(r.selisih)}</span>`:`<span class="tag r sm">${rp(r.selisih)}</span>`;
    const dNote=r.selisih>2000000?'<div style="margin-top:2px"><span class="tag r sm" title="Omzet jauh lebih besar dari pengambilan, kemungkinan nota belum diinput">⚠️ Cek Nota</span></div>'
      :r.selisih<-2000000?'<div style="margin-top:2px"><span class="tag r sm" title="Pengambilan jauh lebih besar dari omzet, kemungkinan salah input nota/beli">⚠️ Cek Pengambilan</span></div>'
      :'';
    const barW=Math.round(r.omzet/maxOmzet*100);
    return`<tr class="clickrow" onclick="selectPjmds('${r.name.replace(/'/g,"\\'")}');switchSubTab('pjmds','mds')">
      <td class="td-main">${r.name} ${r.matched?'':'<span style="font-size:8px;color:var(--red)" title="Nama tidak ketemu di data Penjualan">⚠</span>'}</td>
      <td class="td-dim">${r.area}</td>
      <td><span class="tag p sm">${r.trx||'—'}</span></td>
      <td><span class="tag b sm">${r.ns}</span></td>
      <td><span class="tag au sm">${r.hilo}</span></td>
      <td style="color:var(--violet);font-weight:700;font-size:11px">${r.beliVal?rp(r.beliVal):'—'}</td>
      <td class="td-dim">${r.nota?rp(r.nota):'—'}</td>
      <td><span class="tag t sm">${r.custCount||'—'}</span></td>
      <td><div style="font-weight:800;color:var(--pink);font-size:11px">${r.omzet?rp(r.omzet):'—'}</div><div class="av-bg" style="margin-top:3px;max-width:90px"><div class="av-fill" style="width:${barW}%;background:var(--pink)"></div></div></td>
      <td>${dTag}${dNote}</td>
    </tr>`;
  }).join(''):`<tr><td colspan="10"><div class="empty-state">Tidak ada data untuk periode/filter ini.${PJ_RAW.call.length?'':' Upload data Penjualan (Call & Order) untuk kolom Omzet.'}</div></td></tr>`;
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.textContent=v;};
  set('sc-beli',tB?rp(tB):'—');
  set('sc-omzet',tO?rp(tO):'—');
  const diffEl=document.getElementById('sc-diff');
  if(diffEl){diffEl.textContent=tD?rp(tD):'—';diffEl.style.color=tD>=0?'var(--green)':'var(--red)';}
  set('sc-count',rows.length||'—');
  set('sc-unmatched',unmatched?`⚠ ${unmatched} MDS belum match nama Penjualan`:'semua nama match');
  const tf=document.getElementById('sc-tfoot');
  if(tf)tf.textContent=`${rows.length} MDS · klik baris untuk buka detail · klik judul kolom untuk sortir`;
}
function exportMdsScorecard(){
  if(!PJ_RAW.call.length){alert('Data Penjualan (Call & Order) belum diupload — scorecard butuh data itu untuk kolom Omzet.');return;}
  const rows=computeScorecardRows();
  if(!rows.length){alert('Tidak ada data untuk periode/filter ini.');return;}
  rows.sort((a,b)=>b.omzet-a.omzet);
  const header=['MDS','Area','Trx Beli','Toko Beli','NS Rnc','HILO Rnc','Value Beli (Rp)','Nota (Rp)','Call Penjualan','Customer','Omzet NS (Rp)','Omzet HILO (Rp)','Total Omzet (Rp)','Selisih Omzet-Max(Beli,Nota) (Rp)','Match Nama'];
  const aoa=[header].concat(rows.map(r=>[r.name,r.area,r.trx,r.stores,r.ns,r.hilo,r.beliVal,r.nota,r.callCount,r.custCount,r.omzetNS,r.omzetHILO,r.omzet,r.selisih,r.matched?'OK':'TIDAK KETEMU']));
  const t=rows.reduce((s,r)=>({trx:s.trx+r.trx,ns:s.ns+r.ns,hilo:s.hilo+r.hilo,beliVal:s.beliVal+r.beliVal,nota:s.nota+r.nota,omzetNS:s.omzetNS+r.omzetNS,omzetHILO:s.omzetHILO+r.omzetHILO,omzet:s.omzet+r.omzet,selisih:s.selisih+r.selisih}),{trx:0,ns:0,hilo:0,beliVal:0,nota:0,omzetNS:0,omzetHILO:0,omzet:0,selisih:0});
  aoa.push(['TOTAL','',t.trx,'',t.ns,t.hilo,t.beliVal,t.nota,'','',t.omzetNS,t.omzetHILO,t.omzet,t.selisih,'']);
  const ws=XLSX.utils.aoa_to_sheet(aoa);
  ws['!cols']=header.map((h,i)=>({wch:i===0?26:Math.max(h.length+2,12)}));
  const wb=XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb,ws,'Scorecard MDS');
  const period=MF?monthLabel(MF):(DF||'semua periode');
  XLSX.writeFile(wb,`Scorecard_MDS_${String(period).replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`);
}

