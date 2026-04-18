// English Studio — Service Worker
// Caches app shell and serves offline fallback for navigation requests.

const CACHE_NAME = "english-studio-v1";
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

  // Static assets: stale-while-revalidate
  if (
    url.pathname.match(
      /\.(js|css|png|jpg|jpeg|svg|gif|webp|woff2?|ico|json)$/
    )
  ) {
    event.respondWith(
      caches.match(event.request).then(
        (cached) =>
          cached ||
          fetch(event.request).then((response) => {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
            return response;
          })
      )
    );
  }
});
