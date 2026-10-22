/* Service worker Insight MDS: agar bisa dipasang sebagai aplikasi dan cepat dibuka.
   Hanya menyentuh file milik halaman ini (jaringan dulu, cache cadangan saat offline). */
const CACHE='insight-v1';
const SHELL=['insight-mds.html','insight.webmanifest','insight-icon-192.png','insight-icon-512.png'];
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(CACHE).then(c=>c.addAll(SHELL).catch(()=>{})).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',e=>{
  e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('insight-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));
});
self.addEventListener('fetch',e=>{
  const u=new URL(e.request.url);
  if(e.request.method!=='GET'||u.origin!==location.origin)return;
  if(!SHELL.some(p=>u.pathname.endsWith('/'+p)))return;
  e.respondWith(fetch(e.request,{cache:'no-cache'}).then(r=>{
    const copy=r.clone();caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{});
    return r;
  }).catch(()=>caches.match(e.request,{ignoreSearch:true})));
});
