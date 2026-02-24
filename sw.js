/* Sener Flächenrechner - Service Worker (v5) */

const CACHE_VERSION = "v5";
const CACHE_NAME = `sener-flaechenrechner-${CACHE_VERSION}`;

// Wichtig: KEIN harter BASE-Pfad (funktioniert in / und in /repo/ auf GitHub Pages)
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./privacy.html",
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

// Hilfsfunktion: beim Caching fehlende Dateien nicht die Installation killen
async function safeAddAll(cache, urls) {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(`Fetch failed ${res.status} for ${url}`);
      await cache.put(url, res);
    })
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.log("[SW] Skip cache:", urls[i], r.reason?.message || r.reason);
    }
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await safeAddAll(cache, CORE_ASSETS);
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null)));
    await self.clients.claim();
  })());
});

// Message: erlaubt deinem index.html "SKIP_WAITING" zu senden
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  // nur GET & same-origin
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML Navigation: Network-first, fallback cache
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put("./index.html", res.clone());
        return res;
      } catch {
        const cached = await caches.match("./index.html");
        return cached || Response.error();
      }
    })());
    return;
  }

  // Assets: Cache-first, dann Network + in Cache schreiben
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res && res.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      return cached || Response.error();
    }
  })());
});
