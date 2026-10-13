/* Service worker halaman Tarik Data: cache kecil agar aplikasi cepat dibuka / bisa dipasang,
   dan menangani klik notifikasi. Hanya menyentuh file milik halaman ini; halaman lain tidak diubah. */
const CACHE='tarik-v2';
const SHELL=['tarik.html','tarik.js','tarik-img.js','sekolah_db.js','scripts/sheet-map.js','tarik.webmanifest','tarik-icon-192.png','tarik-icon-512.png'];

self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('tarik-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  const mine=SHELL.some(p=>u.pathname.endsWith('/'+p))||u.pathname.endsWith('/tarik.html');
  if(!mine)return;                                   // file lain: biarkan browser menanganinya
  // jaringan dulu (selalu versi terbaru), cache sebagai cadangan saat offline
  e.respondWith(fetch(e.request).then(r=>{
    const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
    return r;
  }).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
self.addEventListener('notificationclick',e=>{
  e.notification.close();
  const url=(e.notification.data&&e.notification.data.url)||'tarik.html';
  e.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(list=>{
    for(const c of list){if(c.url.includes('tarik.html')&&'focus' in c)return c.focus();}
    return self.clients.openWindow(url);
  }));
});
