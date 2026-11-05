/* MAtSapp Service Worker – basic offline shell */
const CACHE = 'matsapp-v1';
const ASSETS = [
  './',
  './index.html',
  './css/styles.css',
  './js/config.js',
  './js/db.js',
  './js/auth.js',
  './js/ui.js',
  './js/chat.js',
  './js/app.js',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  // Network-first for API / Supabase, cache-first for app shell
  const url = new URL(event.request.url);
  if (url.origin.includes('supabase') || url.pathname.includes('/rest/') || url.pathname.includes('/realtime/')) {
    event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
    return;
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  );
});
