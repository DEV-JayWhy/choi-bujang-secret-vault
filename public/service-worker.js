const SHELL_CACHE = 'vault-offline-v1';
self.addEventListener('install', event => {
  event.waitUntil(caches.open(SHELL_CACHE).then(cache => cache.add('/offline.html')));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  // Only root navigation has an offline fallback. APIs always use the network.
  if (event.request.mode !== 'navigate' || event.request.method !== 'GET'
      || url.origin !== self.location.origin || url.pathname !== '/' || url.search) return;
  event.respondWith(fetch(event.request).catch(() => caches.open(SHELL_CACHE)
    .then(cache => cache.match('/offline.html'))));
});
