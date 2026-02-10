const CACHE_NAME = 'cantina-duca-v3';

const APP_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './script.js',
  './manifest.json',
  './logo.png'
];

// 1) Install
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_ASSETS))
  );
  self.skipWaiting();
});

// 2) Activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// 3) Fetch strategy
self.addEventListener('fetch', (event) => {
  if (!event.request.url.startsWith('http')) return;
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  // NON cacheare Supabase (dati + immagini dinamiche)
  // così eviti immagini vecchie / token / problemi di aggiornamento
  if (url.hostname.endsWith('.supabase.co')) {
    return; // lascia andare in rete
  }

  // Cache solo della tua app (GitHub Pages) + asset statici
  event.respondWith(
    caches.open(CACHE_NAME).then((cache) =>
      cache.match(event.request).then((cachedResponse) => {
        const fetchedResponse = fetch(event.request)
          .then((networkResponse) => {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchedResponse;
      })
    )
  );
});
