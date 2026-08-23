// English Studio — Service Worker
// Caches app shell and serves offline fallback for navigation requests.

// Bumped to v2 to evict v1. `activate` deletes every cache whose key is not
// this one, so raising the version is what forces existing installs to drop
// whatever they cached under the old, never-revalidating rules below.
const CACHE_NAME = "english-studio-v2";
const OFFLINE_URL = "/~offline";

const APP_SHELL = ["/", OFFLINE_URL, "/manifest.json"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // Only handle same-origin GET requests
  if (event.request.method !== "GET") return;
  if (!event.request.url.startsWith(self.location.origin)) return;

  // Skip API routes and auth endpoints — always go to network
  const url = new URL(event.request.url);
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/auth/")) return;

  // Navigation requests: network-first with offline fallback
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() => caches.match(OFFLINE_URL))
    );
    return;
  }

  /*
    Static assets: stale-while-revalidate.

    This previously read `cached || fetch(...)`, which is cache-first and never
    refetches on a hit — so anything that once entered the cache was served for
    good. A chunk could outlive the code it came from indefinitely, which is
    exactly how a browser kept requesting a socket.io endpoint months after the
    socket.io client was deleted from the app.

    Revalidation is started before any await and handed to `waitUntil`, so the
    worker is not terminated mid-refresh, and the response the user gets does
    not wait on it.
  */
  if (
    url.pathname.match(
      /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ico|json)$/
    )
  ) {
    const revalidate = fetch(event.request).then(async (response) => {
      // Store only genuine same-origin successes. Caching an error or an opaque
      // response would pin that failure the same way a stale chunk gets pinned.
      if (response.ok && response.type === "basic") {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(event.request, response.clone());
      }
      return response;
    });

    // Offline with a cached copy is not a failure, so the refresh swallows its
    // own rejection. A miss still rejects through `respondWith`, which is the
    // same network error the page would see with no worker at all.
    event.waitUntil(revalidate.catch(() => {}));
    event.respondWith(
      caches.match(event.request).then((cached) => cached || revalidate)
    );
  }
});
