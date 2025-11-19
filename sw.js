// sw.js - Angepasst an manifest.json mit Sener_Dreieck_logo_*.png
const CACHE_NAME = 'sener-flaechenrechner-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/manifest.json',
    '/Sener_Dreieck_logo_192x192.png', // Angepasst
    '/Sener_Dreieck_logo_512x512.png'  // Angepasst
];

self.addEventListener('install', function(event) {
    console.log('Service Worker installiert.');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(function(cache) {
                console.log('Cache geöffnet und Ressourcen werden hinzugefügt.');
                return cache.addAll(urlsToCache);
            })
            .catch(error => console.error('Fehler beim Hinzufügen zu Cache:', error))
    );
});

self.addEventListener('activate', function(event) {
    console.log('Service Worker aktiviert.');
    event.waitUntil(
        caches.keys().then(function(cacheNames) {
            return Promise.all(
                cacheNames.map(function(cacheName) {
                    // Lösche alte Caches
                    if (cacheName !== CACHE_NAME) {
                        console.log('Alten Cache gelöscht:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

self.addEventListener('fetch', function(event) {
    event.respondWith(
        // Versuche, die Ressource aus dem Cache zu holen
        caches.match(event.request)
            .then(function(response) {
                // Wenn die Ressource im Cache ist, gib sie zurück
                if (response) {
                    console.log('Ressource aus Cache geladen:', event.request.url);
                    return response;
                }
                // Andernfalls führe den regulären Fetch-Durchgang aus
                console.log('Ressource online geladen:', event.request.url);
                return fetch(event.request);
            })
            .catch(function(error) {
                console.error('Fetch fehlgeschlagen:', error);
                // Optional: Gib ein Fallback zurück, z.B. eine Offline-Seite
                // return caches.match('/offline.html');
            })
    );
});
