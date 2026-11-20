import * as store from './storage.js';
import { DIFFICULTIES, LEVELS, maxShots } from './levels.js';
import { Game } from './game.js';
import { fx, setPrefs, unlockAudio } from './fx.js';

const $ = (id) => document.getElementById(id);
const esc = (s) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const starsHtml = (n, total = 3) => Array.from({ length: total }, (_, i) => `<i class="${i < n ? 'on' : ''}">★</i>`).join('');

// ---------- Navigation ----------
let stack = [];
function show(id, push = true) {
  document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));
  if (push) stack.push(id);
  render[id]?.();
}
function back() {
  if (document.querySelector('.modal.show')) {
    const m = document.querySelector('.modal.show');
    if (m.id === 'mdPause') resume();
    else if (m.id === 'mdConfirm') closeModal('mdConfirm');
    return true;
  }
  const cur = stack[stack.length - 1];
  if (cur === 'scr-game') { pause(); return true; }
  if (stack.length <= 1) return false;
  stack.pop();
  show(stack[stack.length - 1], false);
  return true;
}
function resetTo(id) { stack = []; show(id); }
const openModal = (id) => $(id).classList.add('show');
const closeModal = (id) => $(id).classList.remove('show');

document.addEventListener('click', (e) => {
  if (e.target.closest('[data-back]')) { fx.tap(); back(); }
});
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

const render = {
  'scr-profiles'() {
    const list = store.profiles();
    const last = store.current()?.id;
    $('profileList').innerHTML = list.length ? list.map((p) => `
      <div class="profile ${p.id === last ? 'last' : ''}" data-id="${p.id}">
        <div class="marble" style="--c:${p.color}"></div>
        <div class="info"><div class="name">${esc(p.name)}</div>
          <div class="sub">★ ${store.totalStars(p)} · ${Object.keys(p.progress).length} niveau(x) réussi(s)</div></div>
        <button class="del" data-del="${p.id}" aria-label="Supprimer">🗑</button>
      </div>`).join('') : '<div class="empty">Crée ton premier profil pour commencer.</div>';
    $('btnNewProfile').style.display = list.length >= store.MAX_PROFILES ? 'none' : '';
  },
  'scr-new'() {
    $('newName').value = '';
    newColor = store.MARBLE_COLORS[store.profiles().length % store.MARBLE_COLORS.length];
    $('newPreview').style.setProperty('--c', newColor);
    swatches($('swatches'), newColor, (c) => { newColor = c; $('newPreview').style.setProperty('--c', c); });
  },
  'scr-home'() {
    const p = prof();
    $('homeMarble').style.setProperty('--c', p.color);
    $('homeName').textContent = `Salut ${p.name} !`;
    const total = DIFFICULTIES.reduce((a, d) => a + LEVELS[d.id].length * 3, 0);
    $('homeStars').textContent = `★ ${store.totalStars(p)} / ${total} étoiles`;
  },
  'scr-diff'() {
    $('diffList').innerHTML = DIFFICULTIES.map((d, i) => {
      const locked = !diffUnlocked(i);
      const lvls = LEVELS[d.id];
      const dots = lvls.map((lv) => `<i class="${done(lv) ? 'on' : ''}"></i>`).join('');
      return `<button class="diff ${d.id} ${locked ? 'locked' : ''}" data-d="${i}">
        ${locked ? '<span class="lock">🔒</span>' : ''}
        <div><h3>${d.name}</h3><div class="sub">${d.subtitle} · ${lvls.length} niveaux${locked ? ` · termine « ${DIFFICULTIES[i - 1].name} » pour débloquer` : ''}</div></div>
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
  resetTo('scr-home');
};
$('btnNewProfile').onclick = () => { fx.tap(); show('scr-new'); };
$('btnCreate').onclick = () => {
  const name = $('newName').value.trim();
  if (!name) { $('newName').focus(); return; }
  fx.tap();
  store.createProfile(name, newColor);
  applyPrefs();
  resetTo('scr-home');
};
$('newName').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnCreate').click(); });

// Accueil
$('btnPlay').onclick = () => { fx.tap(); show('scr-diff'); };
$('btnSwitch').onclick = () => { fx.tap(); resetTo('scr-profiles'); };
$('btnSettings').onclick = () => { fx.tap(); show('scr-settings'); };

// Réglages
function applyPrefs() { const p = prof(); if (p) setPrefs(p.settings); }
$('setSound').onchange = (e) => { const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, sound: e.target.checked } }); applyPrefs(); fx.tap(); };
$('setHaptics').onchange = (e) => { const p = prof(); store.updateProfile(p.id, { settings: { ...p.settings, haptics: e.target.checked } }); applyPrefs(); fx.tap(); };
$('btnResetProgress').onclick = () => confirmBox('Tout recommencer ?', 'Les étoiles et records de ce profil seront effacés.', 'Remettre à zéro', () => store.resetProgress(prof().id));
$('btnDeleteProfile').onclick = () => {
  const p = prof();
  confirmBox('Supprimer le profil ?', `« ${p.name} » et toute sa progression seront effacés.`, 'Supprimer', () => { store.deleteProfile(p.id); resetTo('scr-profiles'); });
};

// Difficultés et niveaux
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

// ---------- Partie ----------
let game = null;
let hintShown = false;

function startLevel(lv) {
  curLevel = lv;
  if (stack[stack.length - 1] !== 'scr-game') show('scr-game');
  closeModal('mdResult'); closeModal('mdPause');
  $('hudLevel').textContent = `${lv.index + 1}. ${lv.name}`;
  $('hudPar').textContent = `${DIFFICULTIES.find((d) => d.id === lv.difficulty).name} · Par ${lv.par}`;
  $('hint').classList.toggle('hide', hintShown && store.totalStars(prof()) > 0);
  if (!game) {
    game = new Game($('canvas'), {
      onHud: ({ shots, max }) => {
        $('hudShots').textContent = `Coups ${shots} / ${max}`;
        $('hudShots').classList.toggle('warn', max - shots <= 1);
      },
      onAimStart: () => { hintShown = true; $('hint').classList.add('hide'); },
      onOverview: (on) => $('btnOverview').classList.toggle('on', on),
      onEnd: showResult,
    });
  }
  game.resize();
  game.start(lv, prof());
}

function pause() { if (!game) return; game.setPaused(true); openModal('mdPause'); }
function resume() { closeModal('mdPause'); game?.setPaused(false); }
function quitGame() {
  closeModal('mdPause'); closeModal('mdResult');
  game?.stop();
  stack.pop();
  show('scr-levels', false);
}

$('btnPause').onclick = () => { fx.tap(); pause(); };
$('btnResume').onclick = () => { fx.tap(); resume(); };
$('btnRestart').onclick = () => { fx.tap(); startLevel(curLevel); };
$('btnQuit').onclick = () => { fx.tap(); quitGame(); };
$('btnOverview').onclick = () => { fx.tap(); game?.toggleOverview(); };

function nextLevel() {
  const list = LEVELS[curLevel.difficulty];
  if (curLevel.index + 1 < list.length) return list[curLevel.index + 1];
  const di = DIFFICULTIES.findIndex((d) => d.id === curLevel.difficulty);
  if (di + 1 < DIFFICULTIES.length) return LEVELS[DIFFICULTIES[di + 1].id][0];
  return null;
}

function showResult({ won, shots, stars }) {
  const lv = curLevel;
  let record = false;
  if (won) record = store.recordResult(lv.id, shots, stars);
  $('resTitle').textContent = won
    ? (shots === 1 ? 'Du premier coup !' : stars === 3 ? 'Parfait !' : stars === 2 ? 'Bien joué !' : 'Calot touché !')
    : 'Plus de coups…';
  $('resText').textContent = won
    ? `Touché en ${shots} coup${shots > 1 ? 's' : ''} (par ${lv.par}).${record ? ' Nouveau record !' : ''}`
    : `Tu avais ${maxShots(lv)} coups pour toucher le calot. Réessaie !`;
  $('resStars').innerHTML = starsHtml(won ? stars : 0);
  $('resStars').querySelectorAll('i').forEach((el, i) => setTimeout(() => {
    el.classList.add('pop');
    if (el.classList.contains('on')) fx.star(i);
  }, 250 + i * 220));
  const nxt = won ? nextLevel() : null;
  $('btnNext').style.display = nxt ? '' : 'none';
  $('btnNext').textContent = nxt && nxt.difficulty !== lv.difficulty ? `Passer en ${DIFFICULTIES.find((d) => d.id === nxt.difficulty).name}` : 'Niveau suivant';
  $('btnNext').onclick = () => { fx.tap(); curDiff = DIFFICULTIES.find((d) => d.id === nxt.difficulty); startLevel(nxt); };
  $('btnRetry').textContent = won ? 'Rejouer' : 'Réessayer';
  openModal('mdResult');
}
$('btnRetry').onclick = () => { fx.tap(); startLevel(curLevel); };
$('btnLevels').onclick = () => { fx.tap(); quitGame(); };

// Pause automatique quand l'appli passe en arrière-plan
document.addEventListener('visibilitychange', () => {
  if (document.hidden && stack[stack.length - 1] === 'scr-game' && !$('mdResult').classList.contains('show')) pause();
});

// Bouton retour Android
const App = window.Capacitor?.Plugins?.App;
App?.addListener('backButton', () => { if (!back()) App.exitApp(); });

// ---------- Démarrage ----------
(async () => {
  await store.load();
  applyPrefs();
  if (store.current()) { stack = ['scr-profiles']; show('scr-home'); }
  else show('scr-profiles');
  window.Capacitor?.Plugins?.SplashScreen?.hide?.();
})();

if ('serviceWorker' in navigator && !window.Capacitor?.isNativePlatform?.()) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
