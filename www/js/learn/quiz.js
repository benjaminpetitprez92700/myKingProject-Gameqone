// Jeux d'apprentissage : calcul mental (addition, soustraction, multiplication) et dictée à voix haute.
// 10 questions par niveau, clavier à l'écran, correction immédiate, étoiles.

const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Calcul ----------
export const OPS = {
  add: { name: 'Addition', sign: '+', color: '#06d6a0' },
  sub: { name: 'Soustraction', sign: '−', color: '#3a86ff' },
  mul: { name: 'Multiplication', sign: '×', color: '#ff006e' },
  mix: { name: 'Mélange', sign: '±', color: '#ffbe0b' },
};
export const MATH_LEVELS = [
  { n: 1, add: 'jusqu’à 10', sub: 'jusqu’à 10', mul: 'tables de 1 à 5' },
  { n: 2, add: 'jusqu’à 20', sub: 'jusqu’à 20', mul: 'tables de 2 à 5 (×10)' },
  { n: 3, add: 'dizaines + unités', sub: 'dizaines − unités', mul: 'tables de 6 à 9' },
  { n: 4, add: 'deux chiffres', sub: 'deux chiffres', mul: 'toutes les tables' },
  { n: 5, add: 'trois chiffres', sub: 'trois chiffres', mul: '2 chiffres × 1 chiffre' },
];
export function mathQuestion(op, lvl) {
  if (op === 'mix') op = ['add', 'sub', 'mul'][rnd(0, 2)];
  let a, b;
  if (op === 'add') {
    [a, b] = lvl === 1 ? [rnd(0, 9), 0] : lvl === 2 ? [rnd(2, 15), 0] : lvl === 3 ? [rnd(11, 89), rnd(2, 9)] : lvl === 4 ? [rnd(12, 89), rnd(12, 89)] : [rnd(105, 899), rnd(12, 99)];
    if (lvl === 1) b = rnd(0, 10 - a); if (lvl === 2) b = rnd(1, 20 - a);
    return { text: `${a} + ${b}`, answer: a + b, op };
  }
  if (op === 'sub') {
    [a, b] = lvl === 1 ? [rnd(1, 10), 0] : lvl === 2 ? [rnd(8, 20), 0] : lvl === 3 ? [rnd(20, 99), rnd(2, 9)] : lvl === 4 ? [rnd(30, 99), rnd(11, 29)] : [rnd(120, 999), rnd(15, 99)];
    if (lvl <= 2) b = rnd(0, a);
    return { text: `${a} − ${b}`, answer: a - b, op };
  }
  [a, b] = lvl === 1 ? [rnd(1, 5), rnd(1, 5)] : lvl === 2 ? [rnd(2, 5), rnd(1, 10)] : lvl === 3 ? [rnd(6, 9), rnd(2, 10)] : lvl === 4 ? [rnd(2, 10), rnd(2, 10)] : [rnd(11, 49), rnd(2, 9)];
  if (Math.random() < 0.5) [a, b] = [b, a];
  return { text: `${a} × ${b}`, answer: a * b, op };
}

// ---------- Dictée ----------
export const DICTEE_LEVELS = [
  { n: 1, name: 'Niveau 1', sub: 'mots simples (CP)', words: ['chat', 'papa', 'maman', 'lune', 'vélo', 'robe', 'moto', 'pomme', 'ami', 'lit', 'nez', 'rat', 'sol', 'mur', 'tapis', 'bébé', 'école', 'livre', 'table', 'fusée', 'sucre', 'loup', 'pied', 'main'] },
  { n: 2, name: 'Niveau 2', sub: 'sons complexes (CE1)', words: ['maison', 'jardin', 'soleil', 'cheval', 'oiseau', 'poisson', 'mouton', 'chanson', 'bateau', 'gâteau', 'crayon', 'lapin', 'sapin', 'nuage', 'voiture', 'chemin', 'fenêtre', 'pantalon', 'étoile', 'chocolat', 'cadeau', 'genou', 'vague', 'froid'] },
  { n: 3, name: 'Niveau 3', sub: 'mots longs (CE2)', words: ['château', 'histoire', 'montagne', 'princesse', 'grenouille', 'papillon', 'citrouille', 'écureuil', 'bouteille', 'cuisine', 'éléphant', 'téléphone', 'hôpital', 'parapluie', 'dimanche', 'champignon', 'boulanger', 'guitare', 'médecin', 'tortue', 'pyjama', 'chaussure', 'aiguille', 'feuille'] },
  { n: 4, name: 'Niveau 4', sub: 'pièges d’orthographe (CM1)', words: ['bibliothèque', 'ordinateur', 'aventure', 'magnifique', 'température', 'chevalier', 'pharmacie', 'orchestre', 'accident', 'rhinocéros', 'mystérieux', 'habitude', 'paysage', 'kilomètre', 'appétit', 'géographie', 'squelette', 'horizon', 'tempête', 'écharpe', 'souterrain', 'cerise', 'gentiment', 'heureux'] },
  { n: 5, name: 'Niveau 5', sub: 'mots experts (CM2)', words: ['chrysanthème', 'anniversaire', 'extraordinaire', 'enthousiasme', 'labyrinthe', 'hippopotame', 'catastrophe', 'symphonie', 'millionnaire', 'développement', 'atmosphère', 'philosophie', 'psychologue', 'incroyable', 'accueillir', 'rythme', 'gymnastique', 'connaissance', 'territoire', 'abbaye', 'œuvre', 'cœur', 'naïveté', 'ambiguïté'] },
];

// voix : module natif de l'appli (Android / iPhone) ou synthèse vocale du navigateur
export async function speak(text, rate = 0.9) {
  const T = window.Capacitor?.Plugins?.TextToSpeech;
  try {
    if (T) { await T.stop?.(); await T.speak({ text, lang: 'fr-FR', rate, pitch: 1, volume: 1, category: 'playback' }); return true; }
  } catch (e) { /* on essaie le navigateur */ }
  const S = window.speechSynthesis;
  if (!S) return false;
  S.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'fr-FR'; u.rate = rate;
  const v = S.getVoices().find((x) => x.lang?.startsWith('fr'));
  if (v) u.voice = v;
  S.speak(u);
  return true;
}

const norm = (s) => s.trim().toLowerCase().replace(/\s+/g, ' ');

// ---------- Moteur de quiz ----------
export function runQuiz(root, { kind, op, level, fx, onEnd, onQuit }) {
  const total = 10;
  let i = 0, ok = 0, input = '', q = null, start = performance.now(), locked = false, caps = false;
  const words = kind === 'dictee' ? [...DICTEE_LEVELS[level - 1].words].sort(() => Math.random() - 0.5).slice(0, total) : null;
  const color = kind === 'math' ? OPS[op].color : '#8338ec';

  const next = () => {
    if (i >= total) return finish();
    q = kind === 'math' ? mathQuestion(op, level) : { text: words[i], answer: words[i] };
    input = ''; locked = false;
    draw();
    if (kind === 'dictee') setTimeout(() => speak(q.text), 350);
  };

  const keys = kind === 'math'
    ? [['7', '8', '9'], ['4', '5', '6'], ['1', '2', '3'], ['⌫', '0', '✓']]
    : [['a', 'z', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['q', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm'], ['w', 'x', 'c', 'v', 'b', 'n', '-', '⌫'],
      ['é', 'è', 'ê', 'ë', 'à', 'â', 'ç', 'ù', 'û', 'ô'], ['î', 'ï', 'œ', 'æ', '\'', 'espace', '✓']];

  function draw(feedback) {
    const pct = (i / total) * 100;
    root.innerHTML = `
      <div class="quiz" style="--qc:${color}">
        <div class="q-top"><span>Question ${i + 1} / ${total}</span><span>✅ ${ok}</span></div>
        <div class="q-prog"><i style="width:${pct}%"></i></div>
        <div class="q-card ${feedback ? feedback.cls : ''}">
          ${kind === 'math'
            ? `<div class="q-op">${esc(q.text)} =</div>`
            : `<button class="q-listen" data-a="say">🔊</button><div class="q-hint">Écoute le mot et écris-le</div><div class="q-row"><button class="q-small" data-a="slow">🐢 Lentement</button></div>`}
          <div class="q-input ${kind}">${input ? esc(input) : '<span class="ph">…</span>'}<span class="caret"></span></div>
          ${feedback ? `<div class="q-fb">${feedback.html}</div>` : ''}
        </div>
        <div class="kbd ${kind}">${keys.map((row) => `<div class="kr">${row.map((k) => `<button data-k="${esc(k)}" class="${k === '✓' ? 'ok' : k === '⌫' ? 'del' : k === 'espace' ? 'space' : ''}">${k === 'espace' ? '␣' : esc(k)}</button>`).join('')}</div>`).join('')}</div>
      </div>`;
    root.querySelectorAll('[data-k]').forEach((b) => b.addEventListener('pointerdown', (e) => { e.preventDefault(); press(b.dataset.k); }));
    root.querySelector('[data-a="say"]')?.addEventListener('click', () => speak(q.text));
    root.querySelector('[data-a="slow"]')?.addEventListener('click', () => speak(q.text, 0.55));
  }

  function press(k) {
    if (locked) return;
    fx.tick();
    if (k === '⌫') input = input.slice(0, -1);
    else if (k === '✓') return check();
    else if (k === 'espace') input += ' ';
    else if (input.length < (kind === 'math' ? 6 : 24)) input += k;
    const el = root.querySelector('.q-input');
    el.innerHTML = (input ? esc(input) : '<span class="ph">…</span>') + '<span class="caret"></span>';
  }

  function check() {
    if (!input.trim()) return;
    locked = true;
    const good = kind === 'math' ? +input === q.answer : norm(input) === norm(q.answer);
    if (good) { ok++; fx.star(1); } else fx.lose();
    let html;
    if (good) html = '<b class="ok">Bravo !</b>';
    else if (kind === 'math') html = `<b class="ko">Raté</b> · la réponse était <b>${q.answer}</b>`;
    else html = `<b class="ko">Pas tout à fait</b> · ça s'écrit <b class="word">${diff(input, q.answer)}</b>`;
    draw({ cls: good ? 'good' : 'bad', html });
    i++;
    setTimeout(next, good ? 900 : 2400);
  }

  // met en évidence les lettres fausses
  function diff(a, b) {
    return [...b].map((ch, k) => (a[k] && a[k].toLowerCase() === ch ? esc(ch) : `<u>${esc(ch)}</u>`)).join('');
  }

  function finish() {
    const secs = Math.round((performance.now() - start) / 1000);
    const stars = ok >= 10 ? 3 : ok >= 8 ? 2 : ok >= 6 ? 1 : 0;
    onEnd({ ok, total, stars, secs });
  }

  // clavier physique (ordinateur)
  const onKey = (e) => {
    if (!root.isConnected || root.offsetParent === null) return document.removeEventListener('keydown', onKey);
    if (e.key === 'Enter') press('✓'); else if (e.key === 'Backspace') press('⌫'); else if (e.key === ' ') press('espace');
    else if (e.key.length === 1) press(e.key.toLowerCase());
  };
  document.addEventListener('keydown', onKey);
  next();
  return { stop: () => { document.removeEventListener('keydown', onKey); window.speechSynthesis?.cancel(); } };
}
