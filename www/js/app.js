import * as store from './storage.js';
import { DIFFICULTIES, LEVELS, maxShots } from './minigolf/levels.js';
import { Game as MiniGolf } from './minigolf/game.js';
import { Billard } from './billard/game.js';
import { Petanque } from './petanque/game.js';
import { Pog } from './pog/game.js';
import { Snake, SNAKE_LEVELS } from './snake/game.js';
import { playIntro } from './intro.js';
import { fx, setPrefs, unlockAudio } from './fx.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const starsHtml = (n, total = 3) => Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');

// ---------- Illustrations des cartes ----------
const ART = {
  snake: `<svg viewBox="0 0 240 120"><rect x="6" y="8" width="228" height="104" rx="14" fill="#2e6b3c" stroke="#b07a45" stroke-width="6"/>
    <g class="slither">${['#ffbe0b','#3a86ff','#ff006e','#06d6a0','#8338ec','#fb5607'].map((c,i)=>`<circle cx="${150-i*22}" cy="${62+Math.sin(i*1.1)*16}" r="${11-i*0.6}" fill="${c}"/><circle cx="${147-i*22}" cy="${58+Math.sin(i*1.1)*16}" r="3" fill="rgba(255,255,255,.7)"/>`).join('')}
    <circle cx="176" cy="58" r="15" fill="#2ec27e"/><circle cx="181" cy="52" r="5" fill="#fff"/><circle cx="181" cy="64" r="5" fill="#fff"/><circle cx="183" cy="52" r="2.4" fill="#111"/><circle cx="183" cy="64" r="2.4" fill="#111"/>
    <path d="M191 58 l10 0 m0 0 l4 -4 m-4 4 l4 4" stroke="#ff3355" stroke-width="2.5" stroke-linecap="round" fill="none" class="tongue"/></g>
    <circle cx="212" cy="58" r="9" fill="#ffcc33" class="bob"/><rect x="40" y="20" width="14" height="14" rx="3" fill="#8a929c"/><rect x="92" y="88" width="14" height="14" rx="3" fill="#8a929c"/></svg>`,
  minigolf: `<svg viewBox="0 0 120 120"><defs><radialGradient id="gb" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9d1da"/></radialGradient></defs>
    <path d="M10 100 Q 40 60 70 78 T 112 58" stroke="#e9cf98" stroke-width="22" fill="none" stroke-linecap="round"/>
    <ellipse cx="92" cy="64" rx="9" ry="6" fill="#111"/><line x1="92" y1="64" x2="92" y2="18" stroke="#fff" stroke-width="3"/>
    <path d="M92 18 L114 25 L92 32Z" fill="#e63946" class="flag"/><circle cx="30" cy="86" r="10" fill="url(#gb)" class="bob"/></svg>`,
  pog: `<svg viewBox="0 0 120 120"><g class="spin"><ellipse cx="60" cy="74" rx="40" ry="20" fill="#2a0f45"/>
    <ellipse cx="60" cy="68" rx="40" ry="20" fill="#5b2a86"/><ellipse cx="60" cy="62" rx="40" ry="20" fill="#ff006e"/>
    <ellipse cx="60" cy="62" rx="26" ry="13" fill="none" stroke="#ffbe0b" stroke-width="5"/><ellipse cx="60" cy="62" rx="12" ry="6" fill="#3a86ff"/></g>
    <g class="bob"><ellipse cx="60" cy="26" rx="30" ry="12" fill="#5a6270"/><ellipse cx="60" cy="22" rx="30" ry="12" fill="#c5ccd6"/>
    <path d="M60 14 l3 6 7 1 -5 4 1 7 -6 -3 -6 3 1 -7 -5 -4 7 -1z" fill="#e63946"/></g></svg>`,
  billard: `<svg viewBox="0 0 120 120"><rect x="10" y="14" width="100" height="92" rx="12" fill="#6b3a1c"/><rect x="18" y="22" width="84" height="76" rx="4" fill="#16794b"/>
    <circle cx="20" cy="24" r="6" fill="#111"/><circle cx="100" cy="24" r="6" fill="#111"/><circle cx="20" cy="96" r="6" fill="#111"/><circle cx="100" cy="96" r="6" fill="#111"/>
    <circle cx="60" cy="44" r="8" fill="#111"/><circle cx="60" cy="44" r="3.6" fill="#fff"/><circle cx="51" cy="36" r="8" fill="#f5c400"/><circle cx="69" cy="36" r="8" fill="#e0261b"/>
    <circle cx="60" cy="78" r="8" fill="#f6f2e8" class="bob"/><rect x="58" y="86" width="4" height="40" fill="#d7aa66" class="cue"/></svg>`,
  petanque: `<svg viewBox="0 0 120 120"><defs><radialGradient id="st" cx=".35" cy=".3"><stop offset="0" stop-color="#fff"/><stop offset=".4" stop-color="#c9d0d8"/><stop offset="1" stop-color="#4a525c"/></radialGradient>
    <radialGradient id="br" cx=".35" cy=".3"><stop offset="0" stop-color="#fff3dc"/><stop offset=".4" stop-color="#b08a5a"/><stop offset="1" stop-color="#3a2a18"/></radialGradient></defs>
    <ellipse cx="60" cy="96" rx="52" ry="12" fill="rgba(0,0,0,.18)"/><circle cx="62" cy="78" r="6" fill="#ff9f1c"/>
    <circle cx="38" cy="74" r="17" fill="url(#st)" class="bob"/><circle cx="86" cy="70" r="17" fill="url(#br)"/><circle cx="70" cy="34" r="15" fill="url(#st)" class="drop"/></svg>`,
};

const GAMES = [
  { id: 'minigolf', name: 'Mini Golf', tag: '15 parcours · ponts, bosses, moulins', cls: 'g-golf' },
  { id: 'pog', name: 'Pogs', tag: 'Frappe la pile, retourne les pogs', cls: 'g-pog' },
  { id: 'billard', name: 'Billard américain', tag: 'Le 8-ball, seul ou à deux', cls: 'g-pool' },
  { id: 'petanque', name: 'Pétanque', tag: 'Pointe ou tire, vise le cochonnet', cls: 'g-boule' },
  { id: 'snake', name: 'Serpent', tag: 'Mange les billes, allonge ta queue, ne te mords pas !', cls: 'g-snake wide', badge: 'NOUVEAU' },
];
const ARENA = {
  snake: { cls: Snake, name: 'Serpent', desc: '' },
  pog: { cls: Pog, name: 'Pogs', desc: "Chacun met 5 pogs face cachée dans la pile. Vise, dose ta frappe dans la zone verte : tous les pogs qui retombent face visible sont à toi. Celui qui en gagne le plus remporte la partie." },
  billard: { cls: Billard, name: 'Billard américain', desc: "Règles du 8-ball : empoche toutes tes billes (pleines ou rayées) puis la noire. Glisse le doigt sur la table pour viser, tire la jauge vers le bas pour frapper." },
  petanque: { cls: Petanque, name: 'Pétanque', desc: 'Tête-à-tête, 3 boules chacun. Place la cible, choisis roulette, demi-portée, plombée ou tir, et arrête la jauge au centre. Le joueur le plus près du cochonnet marque.' },
};

// ---------- Navigation ----------
let stack = [];
function show(id, push = true) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (push) stack.push(id);
  render[id]?.();
}
function back() {
  const m = document.querySelector('.modal.show');
  if (m) {
    if (m.id === 'mdPause') resume();
    else if (m.id === 'mdConfirm') closeModal('mdConfirm');
    return true;
  }
  const cur = stack[stack.length - 1];
  if (cur === 'scr-game' || cur === 'scr-arena') { pause(); return true; }
  if (stack.length <= 1) return false;
  stack.pop();
  show(stack[stack.length - 1], false);
  return true;
}
function resetTo(id) { stack = []; show(id); }
const openModal = (id) => $(id).classList.add('show');
const closeModal = (id) => $(id).classList.remove('show');

document.addEventListener('click', (e) => { if (e.target.closest('[data-back]')) { fx.tap(); back(); } });
document.addEventListener('pointerdown', unlockAudio, { capture: true });

function confirmBox(title, text, okLabel, onOk) {
  $('cfTitle').textContent = title; $('cfText').textContent = text; $('cfOk').textContent = okLabel;
  $('cfOk').onclick = () => { closeModal('mdConfirm'); onOk(); };
  $('cfCancel').onclick = () => closeModal('mdConfirm');
  openModal('mdConfirm');
}

// ---------- Progression ----------
const prof = () => store.current();
const done = (lv) => !!prof()?.progress[lv.id];
const levelUnlocked = (lv) => lv.index === 0 || done(LEVELS[lv.difficulty][lv.index - 1]);
function diffUnlocked(i) {
  if (i === 0) return true;
  const prev = LEVELS[DIFFICULTIES[i - 1].id];
  return done(prev[prev.length - 1]);
}
const diffStars = (d) => LEVELS[d.id].reduce((a, lv) => a + (prof().progress[lv.id]?.stars || 0), 0);
const totalGolfStars = () => DIFFICULTIES.reduce((a, d) => a + LEVELS[d.id].length * 3, 0);

function gameStat(id) {
  const p = prof(), s = p.stats?.[id];
  if (id === 'minigolf') return `★ ${store.totalStars(p)} / ${totalGolfStars()}`;
  if (id === 'snake') { const st = Object.values(s?.levels || {}).reduce((a, r) => a + r.stars, 0); return `★ ${st} / ${SNAKE_LEVELS.length * 3} · record infini : ${s?.record || 0}`; }
  if (!s) return 'Pas encore joué';
  if (id === 'pog') return `${s.pogs || 0} pogs gagnés · ${s.wins || 0} victoire${s.wins > 1 ? 's' : ''}`;
  return `${s.wins || 0} victoire${s.wins > 1 ? 's' : ''} · ${s.played || 0} partie${s.played > 1 ? 's' : ''}`;
}

function swatches(container, selected, onPick) {
  container.innerHTML = store.MARBLE_COLORS.map((c) =>
    `<button data-c="${c}" class="${c === selected ? 'sel' : ''}" aria-label="Couleur"><div class="marble" style="--c:${c}"></div></button>`).join('');
  container.onclick = (e) => {
    const b = e.target.closest('button'); if (!b) return;
    container.querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
    fx.tap(); onPick(b.dataset.c);
  };
}

// ---------- Écrans ----------
let newColor = store.MARBLE_COLORS[0];
let curDiff = DIFFICULTIES[0];
let curLevel = null;
let curArena = null;           // id du jeu de l'écran « mode »
let aiLevel = 'moyen', ptsTarget = 13;

const render = {
  'scr-profiles'() {
    const list = store.profiles();
    const last = store.current()?.id;
    $('profileList').innerHTML = list.length ? list.map((p) => `
      <div class="profile ${p.id === last ? 'last' : ''}" data-id="${p.id}">
        <div class="marble" style="--c:${p.color}"></div>
        <div class="info"><div class="name">${esc(p.name)}</div>
          <div class="sub">★ ${store.totalStars(p)} au mini golf · ${Object.values(p.stats || {}).reduce((a, s) => a + (s.wins || 0), 0)} victoire(s)</div></div>
        <button class="del" data-del="${p.id}" aria-label="Supprimer">🗑</button>
      </div>`).join('') : '<div class="empty">Crée ton profil pour commencer.</div>';
    $('btnNewProfile').style.display = list.length >= store.MAX_PROFILES ? 'none' : '';
  },
  'scr-new'() {
    $('newName').value = '';
    newColor = store.MARBLE_COLORS[store.profiles().length % store.MARBLE_COLORS.length];
    $('newPreview').style.setProperty('--c', newColor);
    swatches($('swatches'), newColor, (c) => { newColor = c; $('newPreview').style.setProperty('--c', c); });
  },
  'scr-hub'() {
    const p = prof();
    $('hubMarble').style.setProperty('--c', p.color);
    $('hubName').textContent = p.name;
    $('gameGrid').innerHTML = GAMES.map((gm, i) => `
      <button class="game-card ${gm.cls}" data-g="${gm.id}" style="animation-delay:${i * 90}ms">
        ${gm.badge ? `<span class="badge">${gm.badge}</span>` : ''}<div class="art">${ART[gm.id]}</div>
        <div class="gc-text"><h3>${gm.name}</h3><p>${gm.tag}</p><span class="gc-stat">${gameStat(gm.id)}</span></div>
      </button>`).join('');
  },
  'scr-diff'() {
    $('diffList').innerHTML = DIFFICULTIES.map((d, i) => {
      const locked = !diffUnlocked(i);
      const lvls = LEVELS[d.id];
      const dots = lvls.map((lv) => `<i class="${done(lv) ? 'on' : ''}"></i>`).join('');
      return `<button class="diff ${d.id} ${locked ? 'locked' : ''}" data-d="${i}">
        ${locked ? '<span class="lock">🔒</span>' : ''}
        <div><h3>${d.name}</h3><div class="sub">${d.subtitle} · ${lvls.length} parcours${locked ? ` · termine « ${DIFFICULTIES[i - 1].name} » pour débloquer` : ''}</div></div>
        <div class="meta"><span class="dots">${dots}</span><span>★ ${diffStars(d)} / ${lvls.length * 3}</span></div>
      </button>`;
    }).join('');
  },
  'scr-levels'() {
    $('levelsTitle').textContent = `${curDiff.name} · ${curDiff.subtitle}`;
    const lvls = LEVELS[curDiff.id];
    const firstOpen = lvls.find((lv) => levelUnlocked(lv) && !done(lv));
    $('levelGrid').innerHTML = lvls.map((lv) => {
      const r = prof().progress[lv.id], locked = !levelUnlocked(lv);
      return `<button class="lvl ${locked ? 'locked' : ''} ${lv === firstOpen ? 'next' : ''}" data-i="${lv.index}">
        <div class="num">${locked ? '🔒' : lv.index + 1}</div>
        <div class="nm">${lv.name}</div>
        <div class="stars">${starsHtml(r?.stars || 0)}</div>
        <div class="best">${r ? `Record : ${r.best} coup${r.best > 1 ? 's' : ''}` : `Par ${lv.par}`}</div>
      </button>`;
    }).join('');
  },
  'scr-snake'() {
    const s = prof().stats?.snake || { levels: {}, record: 0 };
    const firstOpen = SNAKE_LEVELS.findIndex((_, i) => !s.levels[i]);
    $('snakeGrid').innerHTML = SNAKE_LEVELS.map((lv, i) => {
      const r = s.levels[i], locked = i > 0 && !s.levels[i - 1];
      return `<button class="lvl ${locked ? 'locked' : ''} ${i === firstOpen ? 'next' : ''}" data-i="${i}">
        <div class="num">${locked ? '🔒' : i + 1}</div><div class="nm">${lv.name}</div>
        <div class="stars">${starsHtml(r?.stars || 0)}</div>
        <div class="best">${r ? `Record : ${r.best.toFixed(1)} s` : `${lv.goal} billes · vitesse ${lv.speed}`}</div></button>`;
    }).join('') + `<button class="lvl endless" data-i="endless"><div class="num">∞</div><div class="nm">Mode infini</div>
        <div class="best">La vitesse augmente à chaque bille · record : ${s.record || 0}</div></button>`;
  },
  'scr-mode'() {
    const a = ARENA[curArena];
    $('modeTitle').textContent = a.name;
    $('modeArt').innerHTML = ART[curArena];
    $('modeArt').className = `mode-art ${GAMES.find((g) => g.id === curArena).cls}`;
    $('modeDesc').textContent = a.desc;
    $('optPoints').style.display = curArena === 'petanque' ? '' : 'none';
    $('modeStats').textContent = gameStat(curArena);
    $('aiLevel').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.l === aiLevel));
  },
  'scr-settings'() {
    const p = prof();
    $('setSound').checked = p.settings.sound;
    $('setHaptics').checked = p.settings.haptics;
    swatches($('setSwatches'), p.color, (c) => store.updateProfile(p.id, { color: c }));
  },
};

// Profils
$('profileList').onclick = (e) => {
  const del = e.target.closest('[data-del]');
  if (del) {
    e.stopPropagation();
    const p = store.profiles().find((x) => x.id === del.dataset.del);
    confirmBox('Supprimer le profil ?', `« ${p.name} » et toute sa progression seront effacés.`, 'Supprimer', () => {
      store.deleteProfile(p.id); render['scr-profiles']();
    });
    return;
  }
  const card = e.target.closest('.profile'); if (!card) return;
  fx.tap();
  store.selectProfile(card.dataset.id);
  applyPrefs();
  resetTo('scr-hub');
};
$('btnNewProfile').onclick = () => { fx.tap(); show('scr-new'); };
$('btnCreate').onclick = () => {
  const name = $('newName').value.trim();
  if (!name) { $('newName').focus(); return; }
  fx.tap();
  store.createProfile(name, newColor);
  applyPrefs();
  resetTo('scr-hub');
};
$('newName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnCreate').click(); });

// Menu des jeux
$('btnProfile').onclick = () => { fx.tap(); resetTo('scr-profiles'); };
$('btnSettings').onclick = () => { fx.tap(); show('scr-settings'); };
$('gameGrid').onclick = (e) => {
  const c = e.target.closest('.game-card'); if (!c) return;
  fx.tap();
  const id = c.dataset.g;
  if (id === 'minigolf') show('scr-diff');
  else if (id === 'snake') show('scr-snake');
  else { curArena = id; show('scr-mode'); }
};

// Réglages
function applyPrefs() { const p = prof(); if (p) setPrefs(p.settings); }
$('setSound').onchange = (e) => { const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, sound: e.target.checked } }); applyPrefs(); fx.tap(); };
$('setHaptics').onchange = (e) => { const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, haptics: e.target.checked } }); applyPrefs(); fx.tap(); };
$('btnResetProgress').onclick = () => confirmBox('Tout recommencer ?', 'Les étoiles, records et victoires de ce profil seront effacés.', 'Remettre à zéro', () => store.resetProgress(prof().id));
$('btnDeleteProfile').onclick = () => {
  const p = prof();
  confirmBox('Supprimer le profil ?', `« ${p.name} » et toute sa progression seront effacés.`, 'Supprimer', () => { store.deleteProfile(p.id); resetTo('scr-profiles'); });
};
$('btnReplayIntro').onclick = () => startIntro();

// Mini golf : difficultés et niveaux
$('diffList').onclick = (e) => {
  const b = e.target.closest('.diff'); if (!b) return;
  const i = +b.dataset.d;
  if (!diffUnlocked(i)) { fx.lose(); return; }
  fx.tap(); curDiff = DIFFICULTIES[i]; show('scr-levels');
};
$('levelGrid').onclick = (e) => {
  const b = e.target.closest('.lvl'); if (!b) return;
  const lv = LEVELS[curDiff.id][+b.dataset.i];
  if (!levelUnlocked(lv)) { fx.lose(); return; }
  fx.tap(); startLevel(lv);
};

// Serpent
$('snakeGrid').onclick = (e) => {
  const b = e.target.closest('.lvl'); if (!b) return;
  if (b.classList.contains('locked')) { fx.lose(); return; }
  fx.tap(); curArena = 'snake';
  startArena({ mode: 'solo', level: b.dataset.i === 'endless' ? 'endless' : +b.dataset.i });
};

// Mode (billard / pétanque / pogs)
$('aiLevel').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; fx.tap(); aiLevel = b.dataset.l; render['scr-mode'](); };
$('ptsSeg').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; fx.tap(); ptsTarget = +b.dataset.p;
  $('ptsSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
};
$('btnVsAI').onclick = () => { fx.tap(); startArena({ mode: 'ai', level: aiLevel }); };
$('btnDuo').onclick = () => { fx.tap(); startArena({ mode: 'duo', level: aiLevel, p2: $('p2Name').value.trim() || 'Joueur 2' }); };

// ---------- Parties ----------
let golf = null, arena = null, arenaOpts = null, active = null;
let hintShown = false;

function startLevel(lv) {
  curLevel = lv; active = 'golf';
  if (stack[stack.length - 1] !== 'scr-game') show('scr-game');
  closeModal('mdResult'); closeModal('mdPause');
  $('hudLevel').textContent = `${lv.index + 1}. ${lv.name}`;
  $('hudPar').textContent = `${DIFFICULTIES.find((d) => d.id === lv.difficulty).name} · Par ${lv.par}`;
  $('hint').classList.toggle('hide', hintShown && store.totalStars(prof()) > 0);
  if (!golf) {
    golf = new MiniGolf($('canvas'), {
      onHud: ({ shots, max }) => {
        $('hudShots').textContent = `Coups ${shots} / ${max}`;
        $('hudShots').classList.toggle('warn', max - shots <= 1);
      },
      onAimStart: () => { hintShown = true; $('hint').classList.add('hide'); },
      onEnd: showGolfResult,
    });
  }
  golf.resize();
  golf.start(lv, prof());
}

let toastTimer = 0;
const hud = {
  setScore: (html) => { $('scoreBar').innerHTML = html; },
  setChip: (txt) => { $('arenaChip').textContent = txt; },
  toast: (txt, ms = 1400) => {
    const el = $('toast'); el.textContent = txt; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },
  controls: (html) => { const el = $('arenaControls'); el.innerHTML = html || ''; el.classList.toggle('show', !!html); return el; },
  end: (r) => showArenaResult(r),
};

function startArena(opts) {
  const p = prof();
  arenaOpts = {
    ...opts, game: curArena, target: ptsTarget,
    names: [p.name, opts.mode === 'ai' ? 'Ordi' : opts.p2],
    colors: [p.color, '#ff006e'], color: p.color,
  };
  active = 'arena';
  if (stack[stack.length - 1] !== 'scr-arena') show('scr-arena');
  closeModal('mdResult'); closeModal('mdPause');
  $('arenaTitle').textContent = ARENA[curArena].name;
  $('scr-arena').classList.toggle('snake-mode', curArena === 'snake');
  hud.controls(null);
  arena?.stop();
  arena = new ARENA[curArena].cls($('arena'), hud);
  arena.start(arenaOpts);
}

function current() { return active === 'golf' ? golf : arena; }
function pause() { const g = current(); if (!g) return; g.setPaused(true); openModal('mdPause'); }
function resume() { closeModal('mdPause'); current()?.setPaused(false); }
function quitGame() {
  closeModal('mdPause'); closeModal('mdResult');
  current()?.stop();
  if (active === 'arena') hud.controls(null);
  stack.pop();
  show(stack[stack.length - 1], false);
}

$('btnPause').onclick = () => { fx.tap(); pause(); };
$('btnPause2').onclick = () => { fx.tap(); pause(); };
$('btnResume').onclick = () => { fx.tap(); resume(); };
$('btnRestart').onclick = () => { fx.tap(); if (active === 'golf') startLevel(curLevel); else startArena(arenaOpts); };
$('btnQuit').onclick = () => { fx.tap(); quitGame(); };
$('btnOverview').onclick = () => { fx.tap(); golf?.toggleOverview(); };

function nextLevel() {
  const list = LEVELS[curLevel.difficulty];
  if (curLevel.index + 1 < list.length) return list[curLevel.index + 1];
  const di = DIFFICULTIES.findIndex((d) => d.id === curLevel.difficulty);
  if (di + 1 < DIFFICULTIES.length) return LEVELS[DIFFICULTIES[di + 1].id][0];
  return null;
}

function popStars(n) {
  $('resStars').style.display = '';
  $('resStars').innerHTML = starsHtml(n);
  $('resStars').querySelectorAll('i').forEach((el, i) => setTimeout(() => {
    el.classList.add('pop');
    if (el.classList.contains('on')) fx.star(i);
  }, 250 + i * 220));
}

function showGolfResult({ won, shots, stars }) {
  const lv = curLevel;
  let record = false;
  if (won) record = store.recordResult(lv.id, shots, stars);
  $('resTitle').textContent = won
    ? (shots === 1 ? 'Trou en un !' : stars === 3 ? 'Parfait !' : stars === 2 ? 'Bien joué !' : 'Dans le trou !')
    : 'Plus de coups…';
  $('resText').textContent = won
    ? `Trou réussi en ${shots} coup${shots > 1 ? 's' : ''} (par ${lv.par}).${record ? ' Nouveau record !' : ''}`
    : `Tu avais ${maxShots(lv)} coups pour mettre la balle dans le trou. Réessaie !`;
  popStars(won ? stars : 0);
  const nxt = won ? nextLevel() : null;
  $('btnNext').style.display = nxt ? '' : 'none';
  $('btnNext').textContent = nxt && nxt.difficulty !== lv.difficulty ? `Passer en ${DIFFICULTIES.find((d) => d.id === nxt.difficulty).name}` : 'Parcours suivant';
  $('btnNext').onclick = () => { fx.tap(); curDiff = DIFFICULTIES.find((d) => d.id === nxt.difficulty); startLevel(nxt); };
  $('btnRetry').textContent = won ? 'Rejouer' : 'Réessayer';
  $('btnLevels').textContent = 'Liste des parcours';
  openModal('mdResult');
}

function showSnakeResult(r) {
  const lv = arenaOpts.level;
  let extra = '';
  if (r.endless) { if (store.recordSnakeEndless(r.score)) extra = ' Nouveau record !'; }
  else if (r.won && store.recordSnake(lv, r.stars, r.time)) extra = ' Nouveau record de temps !';
  $('resTitle').textContent = r.title;
  $('resText').textContent = r.text + extra;
  if (r.endless) $('resStars').style.display = 'none'; else popStars(r.won ? r.stars : 0);
  const next = !r.endless && r.won && lv + 1 < SNAKE_LEVELS.length ? lv + 1 : null;
  $('btnNext').style.display = next != null ? '' : 'none';
  $('btnNext').textContent = 'Niveau suivant';
  $('btnNext').onclick = () => { fx.tap(); startArena({ mode: 'solo', level: next }); };
  $('btnRetry').textContent = r.won ? 'Rejouer' : 'Réessayer';
  $('btnLevels').textContent = 'Liste des niveaux';
  openModal('mdResult');
}

function showArenaResult(r) {
  if (arenaOpts.game === 'snake') return showSnakeResult(r);
  store.recordGame(arenaOpts.game, { mode: arenaOpts.mode, won: r.won, pogs: r.pogs });
  $('resTitle').textContent = r.title;
  $('resText').textContent = r.text;
  if (arenaOpts.mode === 'ai') popStars(r.won ? { facile: 1, moyen: 2, difficile: 3 }[arenaOpts.level] : 0);
  else $('resStars').style.display = 'none';
  $('btnNext').style.display = 'none';
  $('btnRetry').textContent = 'Rejouer';
  $('btnLevels').textContent = 'Retour';
  openModal('mdResult');
}
$('btnRetry').onclick = () => { fx.tap(); if (active === 'golf') startLevel(curLevel); else startArena(arenaOpts); };
$('btnLevels').onclick = () => { fx.tap(); quitGame(); };

// Pause automatique quand l'appli passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  const cur = stack[stack.length - 1];
  if (document.hidden && (cur === 'scr-game' || cur === 'scr-arena') && !$('mdResult').classList.contains('show')) pause();
});

// Bouton retour Android
const App = window.Capacitor?.Plugins?.App;
App?.addListener('backButton', () => { if (!back()) App.exitApp(); });

// ---------- Démarrage ----------
function afterIntro() {
  if (store.current()) { stack = ['scr-profiles']; show('scr-hub'); }
  else resetTo('scr-profiles');
}
function startIntro() {
  stack = [];
  show('scr-intro', false);
  playIntro($('introCanvas'), afterIntro);
}

(async () => {
  await store.load();
  applyPrefs();
  startIntro();
  window.Capacitor?.Plugins?.SplashScreen?.hide?.();
})();

if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
