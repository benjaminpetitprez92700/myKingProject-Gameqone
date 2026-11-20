import * as store from './storage.js';
import { DIFFICULTIES, LEVELS, maxShots } from './minigolf/levels.js';
import { Game as MiniGolf } from './minigolf/game.js';
import { MiniGolf3D } from './minigolf/game3d.js';
import { Billard } from './billard/game.js';
import { Petanque } from './petanque/game.js';
import { Pog } from './pog/game.js';
import { Snake, SNAKE_LEVELS } from './snake/game.js';
import { Chess } from './chess/game.js';
import { mountTarot } from './tarot/ui.js';
import { Stratego } from './stratego/game.js';
import { CardGolf } from './cards/golf.js';
import { Rami } from './cards/rami.js';
import { Island } from './island/game.js';
import { HUB_ART } from './hubart.js';
import { hostGame, joinGame } from './net.js';
import { TowerDefense, TD_LEVELS } from './tower/game.js';
import { OPS, MATH_LEVELS, DICTEE_LEVELS, runQuiz, speak } from './learn/quiz.js';
import { playIntro } from './intro.js';
import { showTutorial } from './tutorial.js';
import { playSong, setMusicOn, isMusicOn } from './music.js';
import { fx, setPrefs, unlockAudio, audio } from './fx.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const starsHtml = (n, total = 3) => Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');

// ---------- Illustrations des cartes ----------
const ART = {
  island: `<svg viewBox="0 0 120 120"><rect width="120" height="120" fill="#0b3a66"/>${[[60,38,'#3f8f3a','🌲'],[40,72,'#e8c552','🌾'],[80,72,'#9b9488','🪨'],[60,96,'#3fb6c9','🐟']].map(([x,y,c,e])=>`<polygon points="${[0,1,2,3,4,5].map(i=>{const a=Math.PI/180*(60*i-30);return `${x+Math.cos(a)*21},${y+Math.sin(a)*21}`}).join(' ')}" fill="${c}" stroke="#e9d39a" stroke-width="3"/><text x="${x}" y="${y+6}" text-anchor="middle" font-size="16">${e}</text>`).join('')}<g class="bob"><path d="M54 52 L54 44 L60 38 L66 44 L66 52 Z" fill="#ffd34d" stroke="#111" stroke-width="1.5"/></g></svg>`,
  rami: `<svg viewBox="0 0 120 120">${[['7','♥',-24],['7','♠',-8],['7','♦',8],['🃏','',24]].map(([r,s,a],i)=>`<g transform="rotate(${a} 60 100)"><rect x="44" y="26" width="32" height="46" rx="4" fill="#fff" stroke="#222" stroke-width="1.5"/><text x="60" y="${s?52:56}" text-anchor="middle" font-size="${s?15:18}" font-weight="900" fill="${s==='♠'?'#111':'#c1121f'}">${r}</text><text x="60" y="66" text-anchor="middle" font-size="11" fill="${s==='♠'?'#111':'#c1121f'}">${s}</text></g>`).join('')}<g class="bob"><rect x="30" y="84" width="60" height="22" rx="11" fill="#ffd34d"/><text x="60" y="99" text-anchor="middle" font-size="11" font-weight="900" fill="#3a2600">CONTRAT</text></g></svg>`,
  golfcards: `<svg viewBox="0 0 120 120">${[0,1,2,3].map(c=>[0,1].map(r=>`<rect x="${14+c*24}" y="${30+r*34}" width="20" height="30" rx="3" fill="${(c+r)%3? '#5b2a86':'#fff'}" stroke="#222" stroke-width="1.5"/>${(c+r)%3? `<text x="${24+c*24}" y="${49+r*34}" text-anchor="middle" font-size="12" fill="#ffd34d">♛</text>` : `<text x="${24+c*24}" y="${50+r*34}" text-anchor="middle" font-size="13" font-weight="900" fill="#c1121f">${['7','R','2','A'][c]}</text>`}`).join('')).join('')}<g class="bob"><rect x="44" y="4" width="26" height="22" rx="4" fill="#ffd34d"/><text x="57" y="20" text-anchor="middle" font-size="12" font-weight="900" fill="#3a2600">-2</text></g></svg>`,
  tower: `<svg viewBox="0 0 120 120"><rect x="6" y="10" width="108" height="100" rx="12" fill="#5f9a3c"/><path d="M14 30 L70 30 L70 70 L104 70" stroke="#7a5a35" stroke-width="16" fill="none" stroke-linejoin="round"/><path d="M14 30 L70 30 L70 70 L104 70" stroke="#c9a46a" stroke-width="12" fill="none" stroke-linejoin="round"/>
    <g class="bob"><circle cx="40" cy="58" r="13" fill="#a8a296"/><circle cx="40" cy="58" r="9" fill="#555c66"/><rect x="40" y="54" width="14" height="8" rx="2" fill="#2b2f36"/></g>
    <circle cx="90" cy="44" r="12" fill="#a8a296"/><circle cx="90" cy="44" r="7" fill="#a35cff"/><circle cx="58" cy="30" r="6" fill="#c0392b"/><circle cx="30" cy="30" r="5" fill="#f39c12"/>
    <rect x="86" y="80" width="22" height="22" fill="#9aa0a8"/><path d="M86 80 L97 70 L108 80" fill="#c0392b"/></svg>`,
  stratego: `<svg viewBox="0 0 120 120"><rect x="8" y="14" width="104" height="92" rx="8" fill="#5f7a3a"/><rect x="40" y="52" width="16" height="16" rx="3" fill="#3fa2d6"/><rect x="66" y="52" width="16" height="16" rx="3" fill="#3fa2d6"/>
    ${[0,1,2,3].map(i=>`<rect x="${16+i*24}" y="22" width="18" height="20" rx="4" fill="#1f4e9e"/>`).join('')}
    <g class="bob"><rect x="20" y="76" width="22" height="24" rx="4" fill="#b3261e"/><rect x="23" y="79" width="16" height="18" rx="2" fill="#f4ecd8"/><text x="31" y="93" text-anchor="middle" font-size="11" font-weight="900" fill="#6e130d">10</text></g>
    <rect x="50" y="76" width="22" height="24" rx="4" fill="#b3261e"/><rect x="53" y="79" width="16" height="18" rx="2" fill="#f4ecd8"/><circle cx="61" cy="89" r="5" fill="#6e130d"/><rect x="80" y="76" width="22" height="24" rx="4" fill="#b3261e"/><rect x="83" y="79" width="16" height="18" rx="2" fill="#f4ecd8"/><path d="M87 82 L87 95 M87 82 L96 85 L87 89" stroke="#6e130d" stroke-width="2" fill="#6e130d"/></svg>`,
  math: `<svg viewBox="0 0 120 120"><rect x="18" y="14" width="84" height="94" rx="12" fill="#1a1233" stroke="#fff" stroke-opacity=".3"/><rect x="26" y="22" width="68" height="24" rx="6" fill="#06d6a0"/><text x="60" y="40" text-anchor="middle" font-size="16" font-weight="900" fill="#073b2c">7×8=56</text>
    ${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${28+c*22}" y="${54+r*16}" width="18" height="12" rx="3" fill="${r===2&&c===2?'#ffd34d':'rgba(255,255,255,.25)'}"/>`).join('')).join('')}<text class="bob" x="100" y="20" font-size="22" fill="#ffd34d" font-weight="900">+</text></svg>`,
  dictee: `<svg viewBox="0 0 120 120"><rect x="16" y="40" width="88" height="62" rx="8" fill="#fff"/>${[0,1,2,3].map(i=>`<line x1="24" y1="${56+i*12}" x2="96" y2="${56+i*12}" stroke="#9ec5ff"/>`).join('')}<text x="28" y="66" font-size="15" font-family="cursive" fill="#1d3557">château</text>
    <g class="bob"><circle cx="40" cy="24" r="14" fill="#8338ec"/><path d="M34 19 L38 19 L44 14 L44 34 L38 29 L34 29 Z" fill="#fff"/><path d="M48 18 Q53 24 48 30" stroke="#fff" stroke-width="2.5" fill="none"/></g><path d="M86 96 L104 60 L110 64 L92 100 Z" fill="#ffbe0b" stroke="#5a3a00" stroke-width="2"/></svg>`,
  chess: `<svg viewBox="0 0 120 120"><defs><linearGradient id="cw" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#d8cdb8"/></linearGradient></defs>
    ${[0,1,2,3].map(r=>[0,1,2,3].map(c=>`<rect x="${12+c*24}" y="${50+r*15}" width="24" height="15" fill="${(r+c)%2?'#a8703f':'#ecd3a5'}"/>`).join('')).join('')}
    <g class="bob"><path d="M46 92 L74 92 L70 84 L68 60 Q76 54 70 44 L66 44 L66 36 L72 36 L72 30 L66 30 L66 24 L54 24 L54 30 L48 30 L48 36 L54 36 L54 44 L50 44 Q44 54 52 60 L50 84 Z" fill="url(#cw)" stroke="#2b1a0c" stroke-width="2.5" stroke-linejoin="round"/></g>
    <path d="M80 96 L100 96 L98 90 Q104 70 92 62 Q96 58 92 54 Q86 52 84 60 Q78 66 84 72 L80 90 Z" fill="#1a1a1f" stroke="#e9dcc4" stroke-width="2"/></svg>`,
  tarot: `<svg viewBox="0 0 120 120"><g transform="rotate(-14 60 70)"><rect x="22" y="26" width="44" height="66" rx="6" fill="#fff" stroke="#222" stroke-width="2"/><text x="44" y="66" text-anchor="middle" font-size="30" font-weight="900" fill="#c1121f">21</text></g>
    <g transform="rotate(10 60 70)"><rect x="54" y="22" width="44" height="66" rx="6" fill="#fff" stroke="#222" stroke-width="2"/><text x="76" y="62" text-anchor="middle" font-size="28" fill="#111">♠</text><text x="62" y="36" font-size="10" font-weight="800">R</text></g>
    <g class="bob"><rect x="30" y="88" width="64" height="20" rx="6" fill="#ffd34d" stroke="#5a3a00" stroke-width="2"/><text x="62" y="103" text-anchor="middle" font-size="12" font-weight="900" fill="#3a2600">+132</text></g></svg>`,
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

for (const [k, f] of Object.entries(HUB_ART)) ART[k] = f();

const GAMES = [
  { id: 'minigolf', name: 'Mini Golf', tag: '15 parcours · ponts, bosses, moulins', cls: 'g-golf' },
  { id: 'pog', name: 'Pogs', tag: 'Frappe la pile, retourne les pogs', cls: 'g-pog' },
  { id: 'billard', name: 'Billard américain', tag: 'Le 8-ball, seul ou à deux', cls: 'g-pool' },
  { id: 'petanque', name: 'Pétanque', tag: 'Pointe ou tire, vise le cochonnet', cls: 'g-boule' },
  { id: 'island', name: 'Archipel du Roi', tag: 'Colonise l\'île : huttes, forts et phares', cls: 'g-island', badge: 'NOUVEAU' },
  { id: 'rami', name: 'Rami à Contrats', tag: 'Brelans, suites et 6 contrats', cls: 'g-rami', badge: 'NOUVEAU' },
  { id: 'golfcards', name: 'Cartes Cachées', tag: 'Le moins de points gagne (Golf)', cls: 'g-golfcards', badge: 'NOUVEAU' },
  { id: 'tower', name: 'Défense du Royaume', tag: 'Tower defense : protège ton château', cls: 'g-tower', badge: 'NOUVEAU' },
  { id: 'stratego', name: 'Guerre Éclair', tag: 'Stratégie : trouve le drapeau ennemi', cls: 'g-stratego', badge: 'NOUVEAU' },
  { id: 'math', name: 'Calcul mental', tag: 'Additions, soustractions, tables', cls: 'g-math', badge: 'NOUVEAU' },
  { id: 'dictee', name: 'Dictée', tag: 'Écoute le mot et écris-le', cls: 'g-dictee', badge: 'NOUVEAU' },
  { id: 'chess', name: 'Échecs', tag: "Contre l'ordi ou à deux", cls: 'g-chess', badge: 'NOUVEAU' },
  { id: 'tarot', name: 'Tarot à 5', tag: 'Compteur de points et podium', cls: 'g-tarot', badge: 'NOUVEAU' },
  { id: 'snake', name: 'Serpent', tag: 'Mange les billes, allonge ta queue, ne te mords pas !', cls: 'g-snake wide', badge: 'NOUVEAU' },
];
const ARENA = {
  island: { cls: Island, name: 'Archipel du Roi', desc: "Jeu de colons original : lance le dé, récolte bois, pierre, blé et poisson sur les îles, construis chemins, huttes, forts et phares. Attention au volcan ! Le premier à 10 couronnes gagne." },
  rami: { cls: Rami, name: 'Rami à Contrats', desc: "Rami traditionnel en 6 manches : à chaque manche, un contrat à poser (brelans, suites de 4). Ensuite, complète les combinaisons sur la table et vide ta main en premier ! Le moins de points gagne." },
  golfcards: { cls: CardGolf, name: 'Cartes Cachées', desc: "Le Golf, jeu de cartes traditionnel : chacun a une grille de cartes cachées (taille au choix, 2 à 4 joueurs). Pioche, échange et retourne tes cartes pour avoir le moins de points. Une colonne de cartes identiques vaut 0 ! 6 manches." },
  tower: { cls: TowerDefense, name: 'Défense du Royaume', desc: '' },
  stratego: { cls: Stratego, name: 'Guerre Éclair', desc: "Règles du Stratego : 40 pièces cachées par camp. Déplace-toi d'une case, attaque pour révéler les pièces : la plus forte gagne. Capture le drapeau ennemi pour gagner. Attention aux bombes !" },
  chess: { cls: Chess, name: 'Échecs', desc: "Toutes les règles officielles : roque, prise en passant, promotion, échec et mat, pat. Touche une pièce pour voir ses coups possibles, puis touche la case d'arrivée." },
  snake: { cls: Snake, name: 'Serpent', desc: '' },
  pog: { cls: Pog, name: 'Pogs', desc: "Chacun met 5 pogs face cachée dans la pile. Vise, dose ta frappe dans la zone verte : tous les pogs qui retombent face visible sont à toi. Celui qui en gagne le plus remporte la partie." },
  billard: { cls: Billard, name: 'Billard américain', desc: "Règles du 8-ball : empoche toutes tes billes (pleines ou rayées) puis la noire. Glisse le doigt sur la table pour viser, tire la jauge vers le bas pour frapper." },
  petanque: { cls: Petanque, name: 'Pétanque', desc: 'Tête-à-tête, 3 boules chacun. Place la cible, choisis roulette, demi-portée, plombée ou tir, et arrête la jauge au centre. Le joueur le plus près du cochonnet marque.' },
};

// ---------- Navigation ----------
let stack = [];
// musique selon l'écran affiché
function songFor(id) {
  if (id === 'scr-intro') return null;
  if (id === 'scr-game') return 'golf';
  if (id === 'scr-arena') return curArena === 'chess' ? 'chess' : (curArena === 'golfcards' || curArena === 'rami') ? 'billard' : curArena === 'island' ? 'golf' : curArena;
  if (id === 'scr-tarot') return 'billard';
  if (id === 'scr-quiz') return quizKind === 'dictee' ? null : 'golf';
  return 'menu';
}
function show(id, push = true) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (push) stack.push(id);
  render[id]?.();
  if (id !== 'scr-intro') playSong(songFor(id));
  // tutoriel automatique à la première ouverture de chaque jeu
  const g = { 'scr-tower': 'tower', 'scr-diff': 'minigolf', 'scr-snake': 'snake', 'scr-mode': curArena, 'scr-tarot': 'tarot', 'scr-math': 'math', 'scr-dictee': 'dictee' }[id];
  if (g && push && prof() && !prof().tuto?.[g]) setTimeout(() => openTutorial(g), 350);
}
function openTutorial(g, onDone) {
  showTutorial(g, () => {
    const p = prof();
    if (p) store.updateProfile(p.id, { tuto: { ...(p.tuto || {}), [g]: true } });
    onDone?.();
  });
}
document.addEventListener('click', (e) => {
  const h = e.target.closest('[data-help]'); if (!h) return;
  fx.tap(); openTutorial(h.dataset.help === 'mode' ? curArena : h.dataset.help);
});
function musicButtons() {
  const on = isMusicOn();
  $('btnMusic').textContent = on ? '🎵' : '🔇';
  $('btnMusicPause').textContent = on ? '🎵 Couper la musique' : '🔇 Remettre la musique';
}
function toggleMusic(on = !isMusicOn()) {
  const p = prof();
  if (p) store.updateProfile(p.id, { settings: { ...p.settings, music: on } });
  setMusicOn(on, songFor(stack[stack.length - 1]));
  musicButtons();
}
function back() {
  const m = document.querySelector('.modal.tuto.show') || document.querySelector('.modal.show');
  if (m) {
    if (m.id === 'mdTuto') { m.querySelector('[data-t="skip"]').click(); return true; }
    if (m.id === 'mdTarotRound') { m.classList.remove('show'); return true; }
    if (m.id === 'mdPause') resume();
    else if (m.id === 'mdConfirm') closeModal('mdConfirm');
    return true;
  }
  const cur = stack[stack.length - 1];
  if (cur === 'scr-game' || cur === 'scr-arena') { pause(); return true; }
  if (cur === 'scr-quiz') { quiz?.stop(); quiz = null; active = null; }
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
const expert = () => !!prof()?.settings.expert;
const levelUnlocked = (lv) => expert() || lv.index === 0 || done(LEVELS[lv.difficulty][lv.index - 1]);
function diffUnlocked(i) {
  if (i === 0 || expert()) return true;
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
  if (id === 'tower') { const st = Object.values(p.stats?.tower || {}).reduce((a, b) => a + b, 0); return `★ ${st} / ${TD_LEVELS.length * 3}`; }
  if (id === 'math' || id === 'dictee') { const st = Object.values(p.stats?.[id] || {}).reduce((a, b) => a + b, 0); return `★ ${st} / ${id === 'math' ? 60 : 15}`; }
  if (id === 'tarot') { const t = store.getTarot(); return t && !t.finished ? `Partie en cours · ${t.rounds.length} manche(s)` : 'Compteur de points'; }
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
    const gfx = prof().settings.golfGfx === 'simple' ? 'simple' : 'avance';
    $('golfGfx').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.g === gfx));
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
    const ctl = prof().settings.snakeCtl === 'dpad' ? 'dpad' : 'swipe';
    $('snakeCtl').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.c === ctl));
    const sp = String(prof().settings.snakeSpeed || 1);
    $('snakeSpeed').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.s === sp));
    const firstOpen = SNAKE_LEVELS.findIndex((_, i) => !s.levels[i]);
    $('snakeGrid').innerHTML = SNAKE_LEVELS.map((lv, i) => {
      const r = s.levels[i], locked = !expert() && i > 0 && !s.levels[i - 1];
      return `<button class="lvl ${locked ? 'locked' : ''} ${i === firstOpen ? 'next' : ''}" data-i="${i}">
        <div class="num">${locked ? '🔒' : i + 1}</div><div class="nm">${lv.name}</div>
        <div class="stars">${starsHtml(r?.stars || 0)}</div>
        <div class="best">${r ? `Record : ${r.best.toFixed(1)} s` : `${lv.goal} billes · vitesse ${+(lv.speed * (prof().settings.snakeSpeed || 1)).toFixed(1)}`}</div></button>`;
    }).join('') + `<button class="lvl endless" data-i="endless"><div class="num">∞</div><div class="nm">Mode infini</div>
        <div class="best">La vitesse augmente à chaque bille · record : ${s.record || 0}</div></button>`;
  },
  'scr-tower'() {
    const st = prof().stats?.tower || {};
    $('towerGrid').innerHTML = TD_LEVELS.map((L, k) => {
      const locked = !expert() && k > 0 && !st[k - 1];
      return `<button class="lvl ${locked ? 'locked' : ''}" data-i="${k}"><div class="num">${locked ? '🔒' : k + 1}</div><div class="nm">${L.name}</div><div class="stars">${starsHtml(st[k] || 0)}</div><div class="best">${L.waves} vagues${L.paths.length > 1 ? ' · 2 routes' : ''}</div></button>`;
    }).join('');
  },
  'scr-math'() {
    $('mathOps').innerHTML = Object.entries(OPS).map(([k, o]) => `<button data-op="${k}" class="${k === mathOp ? 'sel' : ''}"><b>${o.sign}</b> ${o.name}</button>`).join('');
    const st = prof().stats?.math || {};
    $('mathGrid').innerHTML = MATH_LEVELS.map((L, k) => {
      const key = `${mathOp}-${L.n}`, locked = !expert() && k > 0 && !st[`${mathOp}-${L.n - 1}`];
      const desc = mathOp === 'mix' ? 'les trois opérations' : L[mathOp];
      return `<button class="lvl ${locked ? 'locked' : ''}" data-l="${L.n}"><div class="num">${locked ? '🔒' : L.n}</div><div class="nm">${desc}</div><div class="stars">${starsHtml(st[key] || 0)}</div></button>`;
    }).join('');
  },
  'scr-dictee'() {
    const st = prof().stats?.dictee || {};
    $('dicteeGrid').innerHTML = DICTEE_LEVELS.map((L, k) => {
      const locked = !expert() && k > 0 && !st[L.n - 1];
      return `<button class="lvl ${locked ? 'locked' : ''}" data-l="${L.n}"><div class="num">${locked ? '🔒' : L.n}</div><div class="nm">${L.sub}</div><div class="stars">${starsHtml(st[L.n] || 0)}</div></button>`;
    }).join('');
  },
  'scr-mode'() {
    const a = ARENA[curArena];
    $('modeTitle').textContent = a.name;
    $('modeArt').innerHTML = ART[curArena];
    $('modeArt').className = `mode-art ${GAMES.find((g) => g.id === curArena).cls}`;
    $('modeDesc').textContent = a.desc;
    $('optPoints').style.display = curArena === 'petanque' ? '' : 'none';
    $('optRoom').style.display = curArena === 'pog' ? '' : 'none';
    $('optAssist').style.display = curArena === 'chess' ? '' : 'none';
    $('optStyle').style.display = curArena === 'stratego' ? '' : 'none';
    $('optGolf').style.display = curArena === 'golfcards' ? '' : 'none';
    $('optOnline').style.display = ONLINE_GAMES.includes(curArena) ? '' : 'none';
    if (curArena === 'golfcards') renderGolfCfg();
    const pst = prof().settings.strategoStyle || 'france';
    $('styleSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.s === pst));
    $('chessAssist').checked = !!prof().settings.chessAssist;
    const room = prof().settings.pogRoom || 'random';
    $('roomSeg').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.r === room));
    $('modeStats').textContent = gameStat(curArena);
    $('aiLevel').querySelectorAll('button').forEach((b) => b.classList.toggle('sel', b.dataset.l === aiLevel));
  },
  'scr-settings'() {
    const p = prof();
    $('setSound').checked = p.settings.sound;
    $('setExpert').checked = !!p.settings.expert;
    $('setMusic').checked = p.settings.music !== false;
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
  else if (id === 'tarot') { show('scr-tarot'); openTarot(); }
  else if (id === 'math') show('scr-math');
  else if (id === 'tower') show('scr-tower');
  else if (id === 'dictee') show('scr-dictee');
  else { curArena = id; show('scr-mode'); }
};

// Réglages
function applyPrefs() {
  const p = prof(); if (!p) return;
  setPrefs(p.settings);
  setMusicOn(p.settings.music !== false, stack.length ? songFor(stack[stack.length - 1]) : null);
  musicButtons();
}
$('setExpert').onchange = (e) => { const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, expert: e.target.checked } }); fx.tap(); };
$('setMusic').onchange = (e) => { fx.tap(); toggleMusic(e.target.checked); };
$('btnMusic').onclick = () => { fx.tap(); toggleMusic(); };
$('btnMusicPause').onclick = () => { fx.tap(); toggleMusic(); };
$('setSound').onchange = (e) => { const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, sound: e.target.checked } }); applyPrefs(); fx.tap(); };
$('setHaptics').onchange = (e) => { const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, haptics: e.target.checked } }); applyPrefs(); fx.tap(); };
$('btnResetProgress').onclick = () => confirmBox('Tout recommencer ?', 'Les étoiles, records et victoires de ce profil seront effacés.', 'Remettre à zéro', () => store.resetProgress(prof().id));
$('btnDeleteProfile').onclick = () => {
  const p = prof();
  confirmBox('Supprimer le profil ?', `« ${p.name} » et toute sa progression seront effacés.`, 'Supprimer', () => { store.deleteProfile(p.id); resetTo('scr-profiles'); });
};
$('btnReplayIntro').onclick = () => startIntro();

// Mini golf : difficultés et niveaux
$('golfGfx').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; fx.tap();
  const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, golfGfx: b.dataset.g } });
  render['scr-diff']();
};
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
$('snakeSpeed').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; fx.tap();
  const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, snakeSpeed: +b.dataset.s } });
  render['scr-snake']();
};
$('snakeCtl').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; fx.tap();
  const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, snakeCtl: b.dataset.c } });
  render['scr-snake']();
};
$('snakeGrid').onclick = (e) => {
  const b = e.target.closest('.lvl'); if (!b) return;
  if (b.classList.contains('locked')) { fx.lose(); return; }
  fx.tap(); curArena = 'snake';
  startArena({ mode: 'solo', dpad: prof().settings.snakeCtl === 'dpad', speedMul: prof().settings.snakeSpeed || 1, level: b.dataset.i === 'endless' ? 'endless' : +b.dataset.i });
};

// Mode (billard / pétanque / pogs)
$('aiLevel').onclick = (e) => { const b = e.target.closest('button'); if (!b) return; fx.tap(); aiLevel = b.dataset.l; render['scr-mode'](); };
$('ptsSeg').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; fx.tap(); ptsTarget = +b.dataset.p;
  $('ptsSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
};
$('styleSeg').querySelectorAll('button').forEach((b) => (b.onclick = () => {
  fx.tap(); $('styleSeg').querySelectorAll('button').forEach((x) => x.classList.toggle('sel', x === b));
  const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, strategoStyle: b.dataset.s } });
}));
// ---------- Jeu en ligne ----------
const ONLINE_GAMES = ['chess', 'stratego'];
let onlineReq = null;
function onlineModal(title, code, text) { $('onTitle').textContent = title; $('onCode').textContent = code; $('onText').textContent = text; openModal('mdOnline'); }
const onlineFail = (m) => { onlineReq = null; $('onCode').textContent = '⚠️'; $('onText').textContent = m; $('onCancel').textContent = 'Fermer'; };
function startOnline(link, side, names) {
  closeModal('mdOnline'); onlineReq = null;
  startArena({ mode: 'online', net: link, side, level: aiLevel, names });
}
$('btnHost').onclick = async () => {
  fx.tap(); $('onCancel').textContent = 'Annuler';
  onlineModal('Créer une partie', '…', 'Connexion au serveur…');
  const me = prof().name;
  onlineReq = await hostGame({ game: curArena, name: me,
    onCode: (c) => { $('onCode').textContent = c; $('onText').textContent = `Donne ce code à ton ami : sur son téléphone, il ouvre « ${ARENA[curArena].name} », touche « Rejoindre » et tape le code.`; },
    onReady: (link, other) => startOnline(link, 0, [me, other]),
    onError: onlineFail });
};
$('btnJoin').onclick = async () => {
  fx.tap();
  const code = $('joinCode').value.trim().toUpperCase();
  if (code.length !== 4) return hud.toast('Le code fait 4 caractères', 1500);
  $('onCancel').textContent = 'Annuler';
  onlineModal('Rejoindre', code, 'Connexion à la partie de ton ami…');
  const me = prof().name;
  onlineReq = await joinGame({ code, game: curArena, name: me, onReady: (link, other) => startOnline(link, 1, [other, me]), onError: onlineFail });
};
$('joinCode').oninput = (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
$('onCancel').onclick = () => { fx.tap(); onlineReq?.cancel(); onlineReq = null; closeModal('mdOnline'); };

function golfCfg() { const c = { players: 2, cols: 4, rows: 2, ...(prof().settings.golfCfg || {}) }; c.players = Math.min(4, c.players); return c; }
function renderGolfCfg() {
  const c = golfCfg();
  for (const [id, k] of [['gcPlayers', 'players'], ['gcCols', 'cols'], ['gcRows', 'rows']]) $(id).querySelectorAll('button').forEach((b) => b.classList.toggle('sel', +b.dataset.v === c[k]));
  $('gcInfo').textContent = `${c.cols * c.rows} cartes chacun · Jouer = toi + ${c.players - 1} ordi${c.players > 2 ? 's' : ''} · À deux = 2 joueurs ici${c.players > 2 ? ` + ${c.players - 2} ordi${c.players > 3 ? 's' : ''}` : ''}`;
}
for (const [id, k] of [['gcPlayers', 'players'], ['gcCols', 'cols'], ['gcRows', 'rows']]) $(id).onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; fx.tap();
  const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, golfCfg: { ...golfCfg(), [k]: +b.dataset.v } } }); renderGolfCfg();
};
$('chessAssist').onchange = (e) => { fx.tap(); const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, chessAssist: e.target.checked } }); };
$('roomSeg').onclick = (e) => {
  const b = e.target.closest('button'); if (!b) return; fx.tap();
  const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, pogRoom: b.dataset.r } });
  render['scr-mode']();
};
$('btnVsAI').onclick = () => { fx.tap(); startArena({ mode: 'ai', level: aiLevel }); };
$('btnDuo').onclick = () => { fx.tap(); startArena({ mode: 'duo', level: aiLevel, p2: $('p2Name').value.trim() || 'Joueur 2' }); };

// ---------- Tower defense ----------
$('towerGrid').onclick = (e) => {
  const b = e.target.closest('.lvl'); if (!b) return; if (b.classList.contains('locked')) return fx.lose();
  fx.tap(); curArena = 'tower'; startArena({ mode: 'solo', level: +b.dataset.i });
};
function showTowerResult(r) {
  const lv = arenaOpts.level;
  if (r.won) store.recordLearn('tower', lv, r.stars);
  $('resTitle').textContent = r.title; $('resText').textContent = r.text;
  popStars(r.won ? r.stars : 0);
  const next = r.won && lv + 1 < TD_LEVELS.length ? lv + 1 : null;
  $('btnNext').style.display = next != null ? '' : 'none'; $('btnNext').textContent = 'Niveau suivant';
  $('btnNext').onclick = () => { fx.tap(); startArena({ mode: 'solo', level: next }); };
  $('btnRetry').textContent = r.won ? 'Rejouer' : 'Réessayer'; $('btnLevels').textContent = 'Liste des niveaux';
  openModal('mdResult');
}

// ---------- Calcul mental & dictée ----------
let mathOp = 'add', quizKind = null, quizLevel = 1, quiz = null;
$('mathOps').onclick = (e) => { const b = e.target.closest('[data-op]'); if (!b) return; fx.tap(); mathOp = b.dataset.op; render['scr-math'](); };
$('mathGrid').onclick = (e) => { const b = e.target.closest('.lvl'); if (!b) return; if (b.classList.contains('locked')) return fx.lose(); fx.tap(); startQuiz('math', +b.dataset.l); };
$('dicteeGrid').onclick = (e) => {
  const b = e.target.closest('.lvl'); if (!b) return; if (b.classList.contains('locked')) return fx.lose();
  fx.tap(); speak(' ', 1); // débloque la voix sur iPhone (doit partir d'un toucher)
  startQuiz('dictee', +b.dataset.l);
};
function startQuiz(kind, level) {
  $('btnRetry').style.display = '';
  quizKind = kind; quizLevel = level; active = 'quiz';
  $('quizTitle').textContent = kind === 'math' ? `${OPS[mathOp].name} · niveau ${level}` : `Dictée · niveau ${level}`;
  closeModal('mdResult');
  if (stack[stack.length - 1] !== 'scr-quiz') show('scr-quiz'); else playSong(songFor('scr-quiz'));
  quiz?.stop();
  quiz = runQuiz($('quizBody'), { kind, op: mathOp, level, fx, onEnd: (r) => showQuizResult(r) });
}
function showQuizResult({ ok, total, stars, secs }) {
  const key = quizKind === 'math' ? `${mathOp}-${quizLevel}` : quizLevel;
  if (stars) store.recordLearn(quizKind, key, stars);
  $('resTitle').textContent = stars === 3 ? 'Parfait !' : stars ? 'Bien joué !' : 'Encore un effort…';
  $('resText').textContent = `${ok} bonne${ok > 1 ? 's' : ''} réponse${ok > 1 ? 's' : ''} sur ${total} en ${secs} s.${stars ? '' : ' Il en faut au moins 6 pour réussir le niveau.'}`;
  popStars(stars);
  const max = quizKind === 'math' ? 5 : 5, nxt = stars && quizLevel < max ? quizLevel + 1 : null;
  $('btnNext').style.display = nxt ? '' : 'none';
  $('btnNext').textContent = 'Niveau suivant';
  $('btnNext').onclick = () => { fx.tap(); startQuiz(quizKind, nxt); };
  $('btnRetry').textContent = 'Rejouer';
  $('btnLevels').textContent = 'Liste des niveaux';
  openModal('mdResult');
}

// ---------- Tarot ----------
function openTarot() {
  mountTarot({
    root: $('tarotBody'), modal: $('mdTarotRound'),
    getGame: store.getTarot, saveGame: store.saveTarot,
    defaultNames: () => { const ps = store.profiles(); const me = prof(); return [me.name, ...ps.filter((p) => p.id !== me.id).map((p) => p.name)].slice(0, 5); },
    fx, confetti: tarotConfetti,
  });
}
function tarotConfetti() {
  const box = document.createElement('div'); box.className = 'confetti';
  const cols = ['#ffd34d', '#ff006e', '#3a86ff', '#06d6a0', '#ffffff', '#8338ec'];
  box.innerHTML = Array.from({ length: 80 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${cols[i % cols.length]};animation-delay:${Math.random() * 0.8}s;animation-duration:${2 + Math.random() * 1.5}s;transform:rotate(${Math.random() * 360}deg)"></i>`).join('');
  document.body.appendChild(box); setTimeout(() => box.remove(), 4500);
}

// ---------- Parties ----------
let golf = null, arena = null, arenaOpts = null, active = null;
let hintShown = false;

function startLevel(lv) {
  $('btnRetry').style.display = '';
  curLevel = lv; active = 'golf';
  if (stack[stack.length - 1] !== 'scr-game') show('scr-game');
  closeModal('mdResult'); closeModal('mdPause');
  $('hudLevel').textContent = `${lv.index + 1}. ${lv.name}`;
  $('hudPar').textContent = `${DIFFICULTIES.find((d) => d.id === lv.difficulty).name} · Par ${lv.par}`;
  $('hint').classList.toggle('hide', hintShown && store.totalStars(prof()) > 0);
  if (!golf) {
    const use3d = MiniGolf3D.supported() && prof().settings.golf3d !== false;
    $('canvas').style.display = use3d ? 'none' : '';
    $('canvas3d').style.display = use3d ? '' : 'none';
    $('hint').textContent = use3d ? 'Glisse ← → pour viser, tire ↓ pour la puissance, relâche' : "Pose ton doigt, tire vers l'arrière, relâche";
    golf = new (use3d ? MiniGolf3D : MiniGolf)($(use3d ? 'canvas3d' : 'canvas'), {
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
  watchSize(golf.canvas, golf);
}

// recalcule la taille du jeu dès que l'écran a sa vraie taille (évite un plateau vide au premier lancement)
let sizeObs = null;
function watchSize(el, game) {
  sizeObs?.disconnect();
  if (!window.ResizeObserver) return;
  let w = 0, h = 0;
  sizeObs = new ResizeObserver(() => {
    if (el.clientWidth === w && el.clientHeight === h) return;
    w = el.clientWidth; h = el.clientHeight;
    if (w > 50 && h > 50 && game.running) game.resize();
  });
  sizeObs.observe(el);
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
  $('btnRetry').style.display = '';
  const p = prof();
  arenaOpts = {
    ...opts, game: curArena, target: ptsTarget, room: prof().settings.pogRoom || 'random', assistant: curArena === 'chess' && !!prof().settings.chessAssist, pieceStyle: prof().settings.strategoStyle || 'france', golf: golfCfg(),
    names: opts.names || [p.name, opts.mode === 'ai' ? 'Ordi' : opts.p2],
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
  watchSize($('arena'), arena);
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
// bouton « ? » pendant la partie : met le jeu en pause, montre les règles, puis reprend
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-ingame-help]')) return;
  fx.tap();
  const g = active === 'golf' ? 'minigolf' : active === 'quiz' ? quizKind : curArena;
  const game = active === 'quiz' ? null : current();
  const wasPaused = !!game?.paused;
  game?.setPaused(true);
  openTutorial(g, () => { if (!wasPaused) game?.setPaused(false); });
});
$('btnHelpPause').onclick = () => { fx.tap(); openTutorial(active === 'golf' ? 'minigolf' : curArena); };
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
  $('btnNext').onclick = () => { fx.tap(); startArena({ mode: 'solo', dpad: prof().settings.snakeCtl === 'dpad', speedMul: prof().settings.snakeSpeed || 1, level: next }); };
  $('btnRetry').textContent = r.won ? 'Rejouer' : 'Réessayer';
  $('btnLevels').textContent = 'Liste des niveaux';
  openModal('mdResult');
}

function showArenaResult(r) {
  if (arenaOpts.game === 'snake') return showSnakeResult(r);
  if (arenaOpts.game === 'tower') return showTowerResult(r);
  store.recordGame(arenaOpts.game, { mode: arenaOpts.mode, won: r.won, pogs: r.pogs });
  $('resTitle').textContent = r.title;
  $('resText').textContent = r.text;
  if (arenaOpts.mode === 'ai') popStars(r.won ? { facile: 1, moyen: 2, difficile: 3 }[arenaOpts.level] : 0);
  else $('resStars').style.display = 'none';
  $('btnNext').style.display = 'none';
  $('btnRetry').style.display = arenaOpts.mode === 'online' ? 'none' : '';
  $('btnRetry').textContent = 'Rejouer';
  $('btnLevels').textContent = 'Retour';
  openModal('mdResult');
}
$('btnRetry').onclick = () => { fx.tap(); if (active === 'golf') startLevel(curLevel); else if (active === 'quiz') startQuiz(quizKind, quizLevel); else startArena(arenaOpts); };
$('btnLevels').onclick = () => { fx.tap(); if (active === 'quiz') { closeModal('mdResult'); quiz?.stop(); quiz = null; active = null; stack.pop(); show(stack[stack.length - 1], false); } else quitGame(); };

// Pause automatique quand l'appli passe en arrière-plan (et plus aucun son)
document.addEventListener('visibilitychange', () => {
  const a = audio();
  if (a?.ctx) { if (document.hidden) a.ctx.suspend(); else a.ctx.resume(); }
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
  $('tagCount').textContent = `${GAMES.length} jeux · 1 champion`;
  stack = [];
  show('scr-intro', false);
  playIntro($('introCanvas'), afterIntro, GAMES.length);
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
