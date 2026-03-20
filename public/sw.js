const CACHE_NAME = "bossfit-runtime-v2";
const OFFLINE_FALLBACK_URL = "/";
const CORE_ASSETS = [OFFLINE_FALLBACK_URL, "/manifest.webmanifest", "/favicon.svg"];
const CACHED_DESTINATIONS = new Set(["document", "script", "style", "font", "image", "manifest", "worker"]);

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => undefined)
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request, { cache: "no-store" });

    if (response && response.ok && (response.type === "basic" || response.type === "default")) {
      cache.put(request, response.clone());
    }

    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }

    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) {
        return fallback;
      }
    }

    return Response.error();
  }
}

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  const isNavigation =
    request.mode === "navigate" ||
    request.destination === "document" ||
    request.headers.get("accept")?.includes("text/html");

  if (isNavigation) {
    event.respondWith(networkFirst(request, OFFLINE_FALLBACK_URL));
    return;
  }

  if (CACHED_DESTINATIONS.has(request.destination)) {
    event.respondWith(networkFirst(request));
  }
});
