const CACHE_VERSION = 'triangle-packing-atlas-offline-v1';
const MAX_ENTRIES = 32;
const RELEASE_PATH = /^\/(?:atlas-v2(?:\.json|\.sha256|-shards\.json|-shards\/[^/]+\.json)|assets\/)/;

function cacheable(request) {
  const url = new URL(request.url);
  return request.method === 'GET' && url.origin === self.location.origin
    && (request.mode === 'navigate' || RELEASE_PATH.test(url.pathname));
}

async function trim(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.slice(0, Math.max(0, keys.length - MAX_ENTRIES)).map(key => cache.delete(key)));
}

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_VERSION).then(cache => cache.addAll(['/'])));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter(name => name !== CACHE_VERSION).map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  if (!cacheable(event.request)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_VERSION);
    try {
      const response = await fetch(event.request);
      if (response.ok && response.type === 'basic') {
        await cache.put(event.request, response.clone());
        await trim(cache);
      }
      return response;
    } catch {
      const cached = await cache.match(event.request, { ignoreSearch: event.request.mode === 'navigate' });
      if (cached) return cached;
      if (event.request.mode === 'navigate') {
        const shell = await cache.match('/');
        if (shell) return shell;
      }
      return new Response(JSON.stringify({ error: 'offline_cache_miss' }), {
        status: 503,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
      });
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data?.type !== 'ATLAS_OFFLINE_STATUS') return;
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_VERSION);
    const keys = await cache.keys();
    event.source?.postMessage({ type: 'ATLAS_OFFLINE_STATUS', version: CACHE_VERSION, entries: keys.length });
  })());
});
