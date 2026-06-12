const STATIC_CACHE = "zantua-static-v1";
const OFFLINE_URL = "/offline.html";
const STATIC_PATHS = [
  "/",
  OFFLINE_URL,
  "/manifest.json",
  "/Logo.jpg",
  "/icons/icon-192.png",
  "/icons/icon-512.png",
  "/icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(STATIC_PATHS)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys
        .filter((key) => key !== STATIC_CACHE)
        .map((key) => caches.delete(key))
    )).then(() => self.clients.claim())
  );
});

function isStaticAssetRequest(requestUrl, request) {
  return request.method === "GET"
    && requestUrl.origin === self.location.origin
    && (
      request.mode === "navigate"
      || request.destination === "script"
      || request.destination === "style"
      || request.destination === "image"
      || request.destination === "font"
      || request.destination === "manifest"
    );
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const requestUrl = new URL(request.url);

  if (requestUrl.hostname.includes("supabase.co")) {
    return;
  }

  if (!isStaticAssetRequest(requestUrl, request)) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          return cached || caches.match(OFFLINE_URL);
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }

      return fetch(request).then((response) => {
        if (!response || response.status !== 200 || response.type !== "basic") {
          return response;
        }

        const responseClone = response.clone();
        caches.open(STATIC_CACHE).then((cache) => cache.put(request, responseClone));
        return response;
      });
    })
  );
});
