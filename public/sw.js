// Tony's Kitchen — SW Auto-Cleanup & Self-Unregister
// This script ensures any previously installed service worker is removed and caches are cleared.

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.map((k) => caches.delete(k)));
    }).then(() => {
      return self.registration.unregister();
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// Do not intercept any fetch events - pass directly to network
self.addEventListener('fetch', () => {
  // Let network handle directly
});
