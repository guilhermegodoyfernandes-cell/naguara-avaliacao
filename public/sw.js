// =============================================================================
// Service Worker — PWA da Na'Guará
// Estratégias:
//   * navegações (HTML): rede primeiro; se falhar, usa /offline.html
//   * assets estáticos (css/js/fonts/ícones): cache-first com revalidação
// =============================================================================

const CACHE_VERSION = 'naguara-v1';
const OFFLINE_URL = '/offline.html';
const PRECACHE = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/css/app.css',
  '/js/app.js',
  '/img/banner.png',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(PRECACHE)),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(names
        .filter((n) => n !== CACHE_VERSION)
        .map((n) => caches.delete(n)));
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return; // POST nunca vai pro cache

  // Navegações: rede → offline
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL)),
    );
    return;
  }

  // Assets: cache primeiro
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok || response.type === 'opaque') {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((c) => c.put(request, copy));
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    }),
  );
});
