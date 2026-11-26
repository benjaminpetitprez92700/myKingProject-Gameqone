// Guerre Éclair : appli dédiée (menu, partie, jeu en ligne).
import { Stratego } from './stratego/game.js';
import { Stratego3D } from './stratego/game3d.js';
import { portrait } from './stratego/art.js';
import { hostGame, joinGame } from './net.js';
import { guideHTML } from './guide.js';
import { playIntro } from './intro.js';
import { fx, setPrefs, unlockAudio, audio } from './fx.js';

const $ = (id) => document.getElementById(id);
const KEY = 'guerre-eclair';

// ---------- Réglages (dans le navigateur) ----------
const DEF = { name: '', p2: '', rules: 'complet', place: 'auto', style: 'france', level: 'moyen', view: '3d', sound: true, tuto: false, stats: { ai: { w: 0, l: 0 }, duo: 0, online: { w: 0, l: 0 } } };
let S;
try { S = { ...DEF, ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch (e) { S = { ...DEF }; }
S.stats = { ...DEF.stats, ...S.stats };
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
const applyPrefs = () => setPrefs({ sound: S.sound, haptics: true });
applyPrefs();

// ---------- Menu ----------
function seg(id, key) {
  const el = $(id);
  const paint = () => el.querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.v === S[key]));
  el.onclick = (e) => { const b = e.target.closest('button'); if (!b) return; fx.tap(); S[key] = b.dataset.v; save(); paint(); };
  paint();
}
seg('placeSeg', 'place');
$('myName').value = S.name; $('p2Name').value = S.p2;
$('myName').oninput = (e) => { S.name = e.target.value.trim(); save(); };
$('p2Name').oninput = (e) => { S.p2 = e.target.value.trim(); save(); };
$('setSound').checked = S.sound;
$('setSound').onchange = (e) => { S.sound = e.target.checked; save(); applyPrefs(); fx.tap(); };
const myName = () => S.name || 'Joueur';

function renderStats() {
  const { ai, online } = S.stats;
  const parts = [];
  if (ai.w + ai.l) parts.push(`Contre l'ordi : ${ai.w} victoire${ai.w > 1 ? 's' : ''} / ${ai.w + ai.l}`);
  if (online.w + online.l) parts.push(`En ligne : ${online.w} / ${online.w + online.l}`);
  $('stats').textContent = parts.join(' · ');
}
renderStats();

function drawHero() {
  try {
    const c = $('heroArt'), g = c.getContext('2d');
    const img = portrait('general', { main: '#1f4e9e', dark: '#0f2a5a', light: '#4f86d9', side: 1, style: 'france' }, 220);
    g.clearRect(0, 0, 220, 220); g.drawImage(img, 0, 0, 220, 220);
  } catch (e) {}
}
drawHero();
// règles + fiches des figurines (portraits 3D calculés après l'affichage)
let guide = '';
setTimeout(() => { guide = guideHTML(); $('guide').innerHTML = guide; }, 50);

const openModal = (id) => $(id).classList.add('show');
const closeModal = (id) => $(id).classList.remove('show');
function show(id) { document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id)); }

// ---------- Partie ----------
let game = null, opts = null, toastTimer = 0;
const hud = {
  setScore: (html) => {
    const t = document.createElement('div'); t.innerHTML = html;
    const sp = t.querySelectorAll('.sp');
    $('score0').innerHTML = sp[0]?.outerHTML || ''; $('score1').innerHTML = sp[1]?.outerHTML || '';
  },
  setChip: (txt) => { $('arenaChip').textContent = txt; },
  toast: (txt, ms = 1400) => {
    const el = $('toast'); el.textContent = txt; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), ms);
  },
  controls: (html) => { const el = $('arenaControls'); el.innerHTML = html || ''; el.classList.toggle('show', !!html); return el; },
  end: (r) => showResult(r),
};

let sizeObs = null;
function watchSize(el) {
  sizeObs?.disconnect();
  if (!window.ResizeObserver) return;
  let w = 0, h = 0;
  sizeObs = new ResizeObserver(() => {
    if (el.clientWidth === w && el.clientHeight === h) return;
    w = el.clientWidth; h = el.clientHeight;
    if (w > 50 && h > 50 && game?.running) game.resize();
  });
  sizeObs.observe(el);
}

function startGame(o) {
  unlockAudio();
  opts = {
    ...o, game: 'stratego', pieceStyle: 'france', rules: 'complet', place: S.place, level: 'moyen',
    names: o.names || [myName(), o.mode === 'ai' ? 'Ordi' : (S.p2 || 'Joueur 2')],
    colors: ['#3a86ff', '#ff006e'], color: '#3a86ff',
  };
  show('scr-arena');
  closeModal('mdResult'); closeModal('mdPause');
  hud.controls(null);
  game?.stop();
  let G3 = true;
  if (G3) { try { const t = document.createElement('canvas'); G3 = !!(t.getContext('webgl2') || t.getContext('webgl')); } catch (e) { G3 = false; } }
  document.body.classList.toggle('view3d', G3);
  game = G3 ? new Stratego3D($('arena'), hud) : new Stratego($('arena'), hud);
  game.start(opts); window.__eg = game;
  watchSize($('arena'));
}
function quit() {
  closeModal('mdPause'); closeModal('mdResult');
  game?.stop(); game = null; hud.controls(null);
  show('scr-menu'); renderStats();
}
function pause() { if (!game) return; game.setPaused(true); openModal('mdPause'); }
function resume() { closeModal('mdPause'); game?.setPaused(false); }
function rules(onClose) {
  $('guide2').innerHTML = guide || guideHTML(); $('guide2').scrollTop = 0;
  openModal('mdRules'); rulesClose = onClose;
}
let rulesClose = null;
$('btnRulesClose').onclick = () => { fx.tap(); closeModal('mdRules'); const f = rulesClose; rulesClose = null; f?.(); };
function help() {
  const was = !!game?.paused; game?.setPaused(true);
  rules(() => { if (!was) game?.setPaused(false); });
}

function showResult(r) {
  const m = opts.mode;
  if (m === 'ai') S.stats.ai[r.won ? 'w' : 'l']++;
  else if (m === 'online') S.stats.online[r.won ? 'w' : 'l']++;
  else S.stats.duo++;
  save();
  $('resTitle').textContent = r.title; $('resText').textContent = r.text;
  $('btnRetry').style.display = m === 'online' ? 'none' : '';
  openModal('mdResult');
}

$('btnVsAI').onclick = () => { fx.tap(); startGame({ mode: 'ai' }); };
$('btnDuo').onclick = () => { fx.tap(); startGame({ mode: 'duo', p2: S.p2 || 'Joueur 2' }); };
$('btnPause').onclick = () => { fx.tap(); pause(); };
$('btnView').onclick = () => { fx.tap(); game?.resetView?.(); };
$('btnHelp').onclick = () => { fx.tap(); help(); };
$('btnHelpPause').onclick = () => { fx.tap(); closeModal('mdPause'); rules(() => openModal('mdPause')); };
$('btnResume').onclick = () => { fx.tap(); resume(); };
$('btnRestart').onclick = () => { fx.tap(); if (opts.mode === 'online') return hud.toast('Impossible en ligne', 1400); startGame(opts); };
$('btnQuit').onclick = () => { fx.tap(); quit(); };
$('btnRetry').onclick = () => { fx.tap(); startGame(opts); };
$('btnMenu').onclick = () => { fx.tap(); quit(); };

// ---------- En ligne ----------
let req = null;
function onlineModal(title, code, text) { $('onTitle').textContent = title; $('onCode').textContent = code; $('onText').textContent = text; $('onCancel').textContent = 'Annuler'; openModal('mdOnline'); }
const onlineFail = (m) => { req = null; $('onCode').textContent = '⚠️'; $('onText').textContent = m; $('onCancel').textContent = 'Fermer'; };
function startOnline(link, side, names) { closeModal('mdOnline'); req = null; startGame({ mode: 'online', net: link, side, names }); }
$('btnHost').onclick = async () => {
  fx.tap(); onlineModal('Créer une partie', '…', 'Connexion au serveur…');
  const me = myName();
  req = await hostGame({ game: 'stratego', name: me,
    onCode: (c) => { $('onCode').textContent = c; $('onText').textContent = 'Donne ce code à ton ami : il ouvre Guerre Éclair, touche « Rejoindre » et tape le code.'; },
    onReady: (link, other) => startOnline(link, 0, [me, other]),
    onError: onlineFail });
};
$('btnJoin').onclick = async () => {
  fx.tap();
  const code = $('joinCode').value.trim().toUpperCase();
  if (code.length !== 4) { $('joinCode').focus(); return; }
  onlineModal('Rejoindre', code, 'Connexion à la partie de ton ami…');
  const me = myName();
  req = await joinGame({ code, game: 'stratego', name: me, onReady: (link, other) => startOnline(link, 1, [other, me]), onError: onlineFail });
};
$('joinCode').oninput = (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
$('onCancel').onclick = () => { fx.tap(); req?.cancel(); req = null; closeModal('mdOnline'); };

// ---------- Animation d'arrivée ----------
function intro() { show(''); playIntro($('intro'), () => show('scr-menu'), 'france'); }
$('btnIntro').onclick = () => { fx.tap(); intro(); };
if (new URLSearchParams(location.search).has('nointro')) show('scr-menu'); else intro();

// ---------- Divers ----------
document.addEventListener('visibilitychange', () => {
  const a = audio();
  if (a?.ctx) { if (document.hidden) a.ctx.suspend(); else a.ctx.resume(); }
  if (document.hidden && game && opts?.mode !== 'online' && !$('mdResult').classList.contains('show')) pause();
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !game) return;
  if ($('mdPause').classList.contains('show')) resume(); else pause();
});
if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
