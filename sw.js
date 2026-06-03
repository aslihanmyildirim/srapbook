/* Scrapbook service worker - offline app shell + asset caching.
 * Strategy:
 *  - Navigation (the HTML page): network-first, fall back to cached index.html when offline.
 *  - Same-origin + CDN/font assets: stale-while-revalidate (instant from cache, refresh in background).
 *  - Supabase API/storage/auth: never handled here -> always goes to the network and
 *    fails to the app's local fallback when offline (so we never serve stale auth/data).
 */
const CACHE = 'scrapbook-cache-v1';
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => Promise.allSettled(
        CORE.map((url) => cache.add(new Request(url, { cache: 'reload' })))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function isSupabaseApi(url) {
  // The project backend + storage (e.g. xxxx.supabase.co). Must never be cached.
  return url.hostname.endsWith('.supabase.co');
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  // Only handle http(s); ignore chrome-extension:, etc.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return;

  // Never intercept Supabase backend/storage calls -> let them hit the network and
  // fail into the app's built-in local fallback when offline.
  if (isSupabaseApi(url)) return;

  // App shell: network-first so updates land when online, cache when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((cache) => cache.put('./index.html', copy));
          return res;
        })
        .catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Everything else (images, fonts, supabase-js lib, css): stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
