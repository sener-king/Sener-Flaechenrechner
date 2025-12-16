const CACHE_NAME = "sener-flaechenrechner-v3";
const BASE = "/Sener-Flaechenrechner/";

const urlsToCache = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.json",
  BASE + "sw.js",
  BASE + "logo.png",
  BASE + "Sener_Dreieck_logo_192x192.png",
  BASE + "Sener_Dreieck_logo_512x512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Nur für deine GitHub-Pages Origin arbeiten (Sicherheit)
  if (url.origin !== self.location.origin) return;

  // 1) Navigations-Requests (Seitenaufrufe) -> index.html als Fallback
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          // Update index im Cache
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(BASE + "index.html", copy));
          return res;
        })
        .catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }

  // 2) Für HTML: network-first (damit Updates schneller kommen)
  if (req.headers.get("accept")?.includes("text/html")) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match(BASE + "index.html")))
    );
    return;
  }

  // 3) Für Assets: cache-first
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;

      return fetch(req)
        .then((res) => {
          if (!res || res.status !== 200) return res;
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          return res;
        })
        .catch(() => cached);
    })
  );
});
