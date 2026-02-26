/* Flächenrechner King - Service Worker (v7) */
const CACHE_VERSION = "v7";
const CACHE_NAME    = `flaechenrechner-king-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./sw.js",
  "./datenschutz.html",
  "./impressum.html",
  "./logo.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-192-maskable.png",
  "./icon-512-maskable.png",
  "./apple-touch-icon.png"
];

// Einzelne Assets sicher cachen – fehlende Dateien killen nicht die Installation
async function safeAddAll(cache, urls) {
  const results = await Promise.allSettled(
    urls.map(async (url) => {
      const res = await fetch(url, { cache: "no-cache" });
      if (!res.ok) throw new Error(`HTTP ${res.status} – ${url}`);
      await cache.put(url, res);
    })
  );
  results.forEach((r, i) => {
    if (r.status === "rejected") {
      console.log("[SW] Cache übersprungen:", urls[i], r.reason?.message ?? r.reason);
    }
  });
}

// ── Install ──────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await safeAddAll(cache, CORE_ASSETS);
  })());
});

// ── Activate ─────────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.map(k => k !== CACHE_NAME ? caches.delete(k) : null)
    );
    await self.clients.claim();
  })());
});

// ── Message (SKIP_WAITING) ────────────────────────────────────────────────────
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const req = event.request;

  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // HTML-Navigation: Network-first → immer aktuelle Version
  if (req.mode === "navigate") {
    event.respondWith((async () => {
      try {
        const res   = await fetch(req, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(req.url, res.clone());
        return res;
      } catch {
        // Offline-Fallback
        return (await caches.match(req))
            ?? (await caches.match("./index.html"))
            ?? Response.error();
      }
    })());
    return;
  }

  // Alle anderen Assets: Cache-first → Netzwerk als Fallback
  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;
    try {
      const res = await fetch(req);
      if (res?.status === 200) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res;
    } catch {
      return Response.error();
    }
  })());
});
