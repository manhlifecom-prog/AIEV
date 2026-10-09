const OFFLINE = '/studio/offline.html';
const CACHE = 'aiev-offline-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.add(OFFLINE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('aiev-offline-') && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
// Account data, payment requests, video files and Studio HTML always use the network.
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => caches.match(OFFLINE)));
});
