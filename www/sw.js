// Mode hors-ligne pour la version navigateur (l'appli native embarque déjà ses fichiers).
const CACHE = 'calot-v1';
const FILES = ['./', 'index.html', 'css/style.css', 'js/main.js', 'js/game.js', 'js/physics.js', 'js/levels.js',
  'js/storage.js', 'js/fx.js', 'icon.svg', 'manifest.webmanifest'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
