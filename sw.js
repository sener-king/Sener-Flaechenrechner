const CACHE_NAME = "sener-flaechenrechner-v4";
const CACHE_PREFIX = "sener-flaechenrechner-";
const BASE = "/Sener-Flaechenrechner/";

const urlsToCache = [
  BASE,
  BASE + "index.html",
  BASE + "manifest.json",
  BASE + "sw.js",

  // Icons / Assets (so wie bei dir im Repo)
  BASE + "Apple-Touch-Symbol.png",
  BASE + "Symbol-192.png",
  BASE + "Symbol-512.png",
  BASE + "icon-192-maskable.png",
  BASE + "icon-512-maskable.png",

  // Optional: Datenschutz Seite (liegt bei dir)
  BASE + "Datenschutz.html"
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
      Promise.all(
        keys.map((key) => {
          const isOld = key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME;
          return isOld ? caches.delete(key) : null;
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // nur eigene Origin
  if (url.origin !== self.location.origin) return;

  // Navigation (Seitenaufrufe): network-first, fallback cache index.html
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(BASE + "index.html", copy));
          return res;
        })
        .catch(() => caches.match(BASE + "index.html"))
    );
    return;
  }

  // Assets: cache-first
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
        .catch(() => caches.match(BASE + "index.html"));
    })
  );
});
