const FIREBASE_CONFIG={apiKey:"AIzaSyCtYc8uZICLzQrA1b7l00Yo_9V_rqNVOu0",authDomain:"mds-visit.firebaseapp.com",projectId:"mds-visit",storageBucket:"mds-visit.firebasestorage.app",messagingSenderId:"732603054928",appId:"1:732603054928:web:9f946bfa13d56d860a8a55"};
function initFirebaseApp(){
  try{
    firebase.initializeApp(FIREBASE_CONFIG);
    window.db=firebase.firestore();
    window.db.enablePersistence({synchronizeTabs:true}).catch(e=>console.warn('persistence unavailable',e.code||e));
    window.storage=firebase.storage();
  }catch(e){console.warn('Firebase init failed',e);}
}
initFirebaseApp();
loadCustomStores();
loadSpgCustomStores();
loadSpgNames();

async function compressAndUpload(dataUrl){
  const img=new Image();
  await new Promise(r=>{img.onload=r;img.src=dataUrl;});
  const MAX=800;let w=img.width,h=img.height;
  if(w>MAX||h>MAX){if(w>h){h=Math.round(h*MAX/w);w=MAX;}else{w=Math.round(w*MAX/h);h=MAX;}}
  const c=document.createElement('canvas');c.width=w;c.height=h;
  c.getContext('2d').drawImage(img,0,0,w,h);
  const blob=await new Promise(r=>c.toBlob(r,'image/jpeg',0.6));
  return await new Promise(r=>{const rd=new FileReader();rd.onload=()=>r(rd.result);rd.readAsDataURL(blob);});
}
