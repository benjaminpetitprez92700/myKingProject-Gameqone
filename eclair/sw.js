// Mode hors-ligne : réseau d'abord, cache en secours.
const CACHE = 'eclair-v7';
const FILES = ['./', 'index.html', 'css/style.css', 'css/eclair.css', 'js/main.js', 'js/fx.js', 'js/net.js', 'js/tutorial.js', 'icon.svg', 'manifest.webmanifest', 'vendor/peerjs.min.js',
  'js/stratego/rules.js', 'js/stratego/game.js', 'js/stratego/art.js', 'js/stratego/art_fr.js', 'js/stratego/art_gear.js', 'js/stratego/game3d.js', 'js/intro.js', 'vendor/three.module.js', 'vendor/BufferGeometryUtils.js', 'js/march.js', 'js/guide.js'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
