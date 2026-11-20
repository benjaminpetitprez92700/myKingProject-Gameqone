// Mode hors-ligne pour la version navigateur (l'appli native embarque déjà ses fichiers).
const CACHE = 'kingarena-v7';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/intro.js', 'js/storage.js', 'js/fx.js', 'js/music.js', 'icon.svg', 'manifest.webmanifest',
  'js/minigolf/game.js', 'js/minigolf/physics.js', 'js/minigolf/levels.js', 'js/minigolf/scenery.js', 'js/minigolf/game3d.js', 'vendor/three.module.js', 'js/billard/game.js', 'js/billard/table.js',
  'js/petanque/game.js', 'js/pog/game.js', 'js/snake/game.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
