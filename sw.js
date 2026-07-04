const CACHE_NAME='yeowoobang-v9';
self.addEventListener('install',event=>{self.skipWaiting();event.waitUntil(caches.open(CACHE_NAME).then(cache=>cache.addAll(['./','./index.html?v=9','./style.css?v=9','./script.js?v=9','./manifest.json?v=9','./icon-192.png?v=9','./icon-512.png?v=9'])))});
self.addEventListener('activate',event=>{event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE_NAME).map(k=>caches.delete(k)))));self.clients.claim();});
self.addEventListener('fetch',event=>{if(event.request.url.includes('docs.google.com')) return; event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request)));});
