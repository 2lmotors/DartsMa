// DartsMa Service Worker - PWA Network-First Strategy for Instant Updates
const CACHE_NAME = 'dartsma-v1.0.3';
const STATIC_ASSETS = [
  '/manifest.json',
  '/icon-192.svg',
  '/icon-512.svg'
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      // Purge TOUS les anciens caches pour forcer le chargement immédiat des nouveautés
      return Promise.all(
        keys.map((key) => caches.delete(key))
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  // Transmettre directement sans cache les appels WebSocket et API
  if (event.request.url.includes('/socket.io/') || event.request.url.includes('/api/')) {
    return;
  }

  // Network First : Toujours interroger le réseau d'abord pour avoir la dernière version instantanément !
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response && response.status === 200 && event.request.method === 'GET') {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => {
        // En cas de coupure réseau uniquement, secours sur le cache local
        return caches.match(event.request).then((cached) => {
          return cached || caches.match('/index.html');
        });
      })
  );
});
