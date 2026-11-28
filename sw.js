const CACHE="ssm-shell-v30";
const ASSETS=["/","/index.html","/styles.css","/app.js","/manifest.json"];
self.addEventListener("install",event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener("activate",event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(key=>key!==CACHE).map(key=>caches.delete(key)))).then(()=>self.clients.claim())));
self.addEventListener("fetch",event=>{
 if(event.request.method!=="GET"||new URL(event.request.url).origin!==location.origin)return;
 const request=event.request;
 const isShell=request.mode==="navigate"||ASSETS.includes(new URL(request.url).pathname);
 if(!isShell)return;
 event.respondWith(fetch(request).then(response=>{
  if(response&&response.ok){const copy=response.clone();caches.open(CACHE).then(cache=>cache.put(request,copy));}
  return response;
 }).catch(()=>caches.match(request).then(cached=>cached||caches.match("/index.html"))));
});