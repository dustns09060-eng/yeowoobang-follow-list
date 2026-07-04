const CACHE="yeowoobang-v12";
self.addEventListener("install",e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(["./","index.html","style.css","script.js","manifest.json","icon-192.png","icon-512.png"])))});
self.addEventListener("fetch",e=>{e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)))})
