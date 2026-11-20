// Mode hors-ligne pour la version navigateur (l'appli native embarque déjà ses fichiers).
const CACHE = 'kingarena-v22';
const FILES = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/intro.js', 'js/storage.js', 'js/fx.js', 'js/music.js', 'js/tutorial.js', 'icon.svg', 'manifest.webmanifest',
  'js/minigolf/game.js', 'js/minigolf/physics.js', 'js/minigolf/levels.js', 'js/minigolf/scenery.js', 'js/minigolf/game3d.js', 'js/minigolf/realism.js', 'vendor/Sky.js', 'textures/grass.jpg', 'textures/wood.jpg', 'textures/wood_bump.jpg', 'textures/waternormals.jpg', 'vendor/three.module.js', 'js/billard/game.js', 'js/billard/table.js',
  'js/petanque/game.js', 'js/pog/game.js', 'js/pog/art.js', 'js/snake/game.js', 'js/chess/engine.js', 'js/chess/game.js', 'js/tarot/tarot.js', 'js/tarot/ui.js', 'js/stratego/rules.js', 'js/stratego/game.js', 'js/stratego/art.js', 'js/stratego/art_fr.js', 'js/learn/quiz.js', 'js/tower/game.js', 'js/cards/cards.js', 'js/cards/golf.js', 'js/cards/rami.js', 'js/cards/rami_rules.js', 'js/island/game.js', 'js/hubart.js', 'textures/td_grass.webp', 'textures/td_path.webp', 'textures/td_stone.webp', 'textures/td_cobble.webp'];
self.addEventListener('install', (e) => e.waitUntil(caches.open(CACHE).then((c) => c.addAll(FILES))));
self.addEventListener('activate', (e) => e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k))))));
self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
