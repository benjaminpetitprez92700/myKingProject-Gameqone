// Défense du Royaume : tower defense. Les ennemis suivent la route jusqu'au château ;
// on construit et améliore des tours sur les cases libres.
import { fx } from '../fx.js';

export const COLS = 9, ROWS = 13;

// ---------- Niveaux (routes en coordonnées de cases, le château est au bout) ----------
export const TD_LEVELS = [
  { name: 'La plaine', waves: 8, gold: 140, paths: [[[1, -1], [1, 3], [7, 3], [7, 7], [1, 7], [1, 10], [4, 10], [4, 12]]] },
  { name: 'Le gué', waves: 10, gold: 150, paths: [[[7, -1], [7, 2], [2, 2], [2, 5], [6, 5], [6, 8], [2, 8], [2, 10], [6, 10], [6, 12]]] },
  { name: 'Les deux routes', waves: 12, gold: 180, paths: [[[1, -1], [1, 6], [4, 6], [4, 12]], [[7, -1], [7, 3], [5, 3], [5, 6], [4, 6], [4, 12]]] },
  { name: 'Le col', waves: 12, gold: 170, paths: [[[4, -1], [4, 1], [1, 1], [1, 11], [7, 11], [7, 4], [4, 4], [4, 8], [5, 8], [5, 12]]] },
  { name: 'La forteresse', waves: 15, gold: 220, paths: [[[0, 2], [6, 2], [6, 5], [2, 5], [2, 8], [7, 8], [7, 10], [4, 10], [4, 12]], [[8, 0], [8, 10], [7, 10]]] },
];

const TOWERS = {
  archer: { name: 'Archers', cost: 50, up: [40, 70], dmg: [8, 13, 20], rate: [1.4, 1.7, 2.1], range: [2.6, 2.9, 3.2], color: '#8b5a2b', desc: 'Rapide, touche aussi les volants' },
  canon: { name: 'Canon', cost: 80, up: [60, 100], dmg: [22, 36, 55], rate: [0.6, 0.7, 0.8], range: [2.3, 2.5, 2.7], splash: [0.9, 1.0, 1.2], ground: true, color: '#555c66', desc: 'Dégâts de zone (pas les volants)' },
  givre: { name: 'Givre', cost: 70, up: [50, 80], dmg: [4, 6, 9], rate: [1, 1.1, 1.2], range: [2.4, 2.6, 2.9], slow: [0.35, 0.45, 0.55], color: '#4fb3e8', desc: 'Ralentit les ennemis' },
  eclair: { name: 'Éclair', cost: 120, up: [90, 140], dmg: [30, 48, 75], rate: [0.5, 0.6, 0.7], range: [3, 3.3, 3.6], chain: [2, 3, 4], color: '#a35cff', desc: 'Foudroie plusieurs ennemis' },
};
const ENEMIES = {
  soldat: { hp: 30, speed: 1.0, reward: 5, armor: 0, size: 0.3, color: '#c0392b' },
  coureur: { hp: 18, speed: 1.9, reward: 4, armor: 0, size: 0.25, color: '#f39c12' },
  chevalier: { hp: 95, speed: 0.7, reward: 11, armor: 3, size: 0.36, color: '#7f8c8d' },
  chauvesouris: { hp: 24, speed: 1.4, reward: 6, armor: 0, size: 0.27, color: '#5b2c6f', fly: true },
  boss: { hp: 650, speed: 0.5, reward: 90, armor: 5, size: 0.5, color: '#2c3e50' },
};

function waveList(n, lvl) {
  const out = [], count = 6 + n * 2;
  for (let i = 0; i < count; i++) {
    let t = 'soldat';
    const r = (i * 7 + n * 3) % 10;
    if (n >= 2 && r < 3) t = 'coureur';
    if (n >= 4 && r >= 8) t = 'chevalier';
    if (n >= 5 && (r === 5 || r === 6)) t = 'chauvesouris';
    out.push(t);
  }
  if (n === lvl.waves) out.push('boss');
  else if (n % 5 === 0) out.push('chevalier', 'chevalier');
  return out;
}

// textures photo (Poly Haven, CC0) chargées une seule fois
const TEX = {};
let texLoading = null;
function loadTex() {
  if (!texLoading) texLoading = Promise.all(Object.entries({ grass: 'textures/td_grass.webp', path: 'textures/td_path.webp', stone: 'textures/td_stone.webp', cobble: 'textures/td_cobble.webp', wood: 'textures/wood.jpg' })
    .map(([k, src]) => new Promise((res) => { const im = new Image(); im.onload = () => { TEX[k] = im; res(); }; im.onerror = res; im.src = src; })));
  return texLoading;
}

export class TowerDefense {
  constructor(canvas, hud) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud;
    this.running = false; this.paused = false;
    this._loop = this._loop.bind(this);
    this._onResize = () => this.resize();
    canvas.addEventListener('pointerdown', (e) => this._tap(e));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr; this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    if (this.vw < 50) { requestAnimationFrame(() => this.running && this.resize()); return; }
    this.canvas.width = Math.round(this.vw * dpr); this.canvas.height = Math.round(this.vh * dpr);
    const top = 128, bottom = 150;
    this.cell = Math.floor(Math.min((this.vw - 12) / COLS, (this.vh - top - bottom) / ROWS));
    this.ox = Math.round((this.vw - this.cell * COLS) / 2);
    this.oy = Math.round(top + (this.vh - top - bottom - this.cell * ROWS) / 2);
    this.bg = null;
  }

  start(opts) {
    this.opts = opts;
    this.lv = TD_LEVELS[opts.level];
    this.gold = this.lv.gold; this.lives = 20; this.wave = 0; this.speed = 1;
    this.towers = []; this.enemies = []; this.shots = []; this.fxs = []; this.spawnQ = [];
    this.sel = null; this.waveRunning = false; this.over = false; this.t = 0; this.paused = false;
    // cases de route
    this.road = new Set();
    this.routes = this.lv.paths.map((p) => {
      const pts = p.map(([x, y]) => ({ x: x + 0.5, y: y + 0.5 }));
      for (let k = 1; k < p.length; k++) {
        const [ax, ay] = p[k - 1], [bx, by] = p[k];
        const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
        for (let s = 0; s <= n; s++) this.road.add(`${ax + Math.sign(bx - ax) * s},${ay + Math.sign(by - ay) * s}`);
      }
      return pts;
    });
    const end = this.lv.paths[0][this.lv.paths[0].length - 1];
    this.castle = { x: end[0] + 0.5, y: end[1] + 0.5 };
    // décor (arbres, rochers) sur quelques cases libres
    let seed = opts.level * 31 + 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    this.decor = new Map();
    for (let k = 0; k < 9; k++) {
      const x = Math.floor(r() * COLS), y = Math.floor(r() * (ROWS - 1));
      if (!this.road.has(`${x},${y}`) && !this._nearCastle(x, y)) this.decor.set(`${x},${y}`, r() < 0.65 ? 'tree' : 'rock');
    }
    window.addEventListener('resize', this._onResize);
    loadTex().then(() => { this.bg = null; this._baseCache = null; });
    this.resize();
    this._hud(); this._ui();
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this._loop); }
  }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); this.hud.controls(null); }
  setPaused(p) { this.paused = p; if (!p) this.last = performance.now(); }

  _nearCastle(x, y) { return Math.abs(x + 0.5 - this.castle.x) < 1 && Math.abs(y + 0.5 - this.castle.y) < 1; }
  _free(x, y) { return x >= 0 && y >= 0 && x < COLS && y < ROWS && !this.road.has(`${x},${y}`) && !this.decor.has(`${x},${y}`) && !this._nearCastle(x, y) && !this.towers.some((t) => t.x === x && t.y === y); }

  _hud() {
    this.hud.setScore(`<div class="sp on"><b>💰 Or</b><div class="balls"><span class="pts">${this.gold}</span></div></div>
      <div class="sp"><b>❤️ Château</b><div class="balls"><span class="pts ${this.lives <= 5 ? 'neg' : ''}">${this.lives}</span></div></div>
      <div class="sp"><b>🌊 Vague</b><div class="balls"><span class="pts">${this.wave} / ${this.lv.waves}</span></div></div>`);
    this.hud.setChip(this.lv.name);
  }

  // ---------- Panneau du bas : construire / améliorer / lancer la vague ----------
  _ui() {
    if (this.over) { this.hud.controls(null); return; }
    let html;
    if (this.sel?.kind === 'build') {
      html = `<div class="td-panel"><div class="td-title">Construire une tour</div><div class="td-build">${Object.entries(TOWERS).map(([k, T]) =>
        `<button class="td-t" data-b="${k}" ${this.gold < T.cost ? 'disabled' : ''}><canvas data-icon="${k}" width="88" height="88"></canvas><b>${T.name}</b><span>💰 ${T.cost}</span></button>`).join('')}</div>
        <div class="td-desc">${Object.values(TOWERS).map((T) => `<span><b>${T.name}</b> : ${T.desc}</span>`).join('')}</div>
        <button class="td-close" data-a="close">Annuler</button></div>`;
    } else if (this.sel?.kind === 'tower') {
      const tw = this.sel.t, T = TOWERS[tw.type], max = tw.lvl >= 3, upCost = max ? 0 : T.up[tw.lvl - 1];
      html = `<div class="td-panel"><div class="td-title">${T.name} · niveau ${tw.lvl}</div>
        <div class="td-stats">⚔️ ${T.dmg[tw.lvl - 1]} dégâts · 🎯 portée ${T.range[tw.lvl - 1]} ${max ? '' : `→ <b>${T.dmg[tw.lvl]} · ${T.range[tw.lvl]}</b>`}</div>
        <div class="setup-btns"><button class="sbtn ready" data-a="up" ${max || this.gold < upCost ? 'disabled' : ''}><span>⬆️</span>${max ? 'Niveau max' : `Améliorer 💰${upCost}`}</button>
        <button class="sbtn sell" data-a="sell"><span>💲</span>Vendre +${Math.round(tw.spent * 0.7)}</button></div>
        <button class="td-close" data-a="close">Fermer</button></div>`;
    } else {
      html = `<div class="setup-ctl"><div class="setup-tip">${this.waveRunning ? 'Vague en cours… touche une case pour construire' : 'Touche une case d\'herbe pour construire une tour'}</div>
        <div class="setup-btns"><button class="sbtn shuffle" data-a="speed"><span>⏩</span>Vitesse ×${this.speed}</button>
        <button class="sbtn ready" data-a="wave" ${this.waveRunning ? 'disabled' : ''}><span>⚔️</span>${this.wave === 0 ? 'Lancer la 1re vague' : 'Vague suivante'}</button></div></div>`;
    }
    const el = this.hud.controls(html);
    el.querySelectorAll('canvas[data-icon]').forEach((c) => { const g = c.getContext('2d'); g.translate(44, 50); this._drawTower(g, { type: c.dataset.icon, lvl: 1, angle: -Math.PI / 4 }, 64); });
    el.onclick = (e) => {
      const b = e.target.closest('[data-b],[data-a]'); if (!b || b.disabled) return;
      fx.tap();
      if (b.dataset.b) return this._build(b.dataset.b);
      const a = b.dataset.a;
      if (a === 'close') { this.sel = null; this._ui(); }
      else if (a === 'wave') this._startWave();
      else if (a === 'speed') { this.speed = this.speed === 1 ? 2 : this.speed === 2 ? 3 : 1; this._ui(); }
      else if (a === 'up') this._upgrade();
      else if (a === 'sell') this._sell();
    };
  }

  _build(type) {
    const T = TOWERS[type], { x, y } = this.sel;
    if (this.gold < T.cost || !this._free(x, y)) return;
    this.gold -= T.cost;
    this.towers.push({ type, x, y, lvl: 1, cd: 0, angle: -Math.PI / 2, spent: T.cost, born: this.t });
    fx.thud(0.6); this._puff(x + 0.5, y + 0.5, '#d9c9a0', 12);
    this.sel = null; this._hud(); this._ui();
  }
  _upgrade() {
    const tw = this.sel.t, T = TOWERS[tw.type]; if (tw.lvl >= 3) return;
    const c = T.up[tw.lvl - 1]; if (this.gold < c) return;
    this.gold -= c; tw.spent += c; tw.lvl++;
    fx.star(tw.lvl); this._puff(tw.x + 0.5, tw.y + 0.5, '#ffd34d', 16);
    this._hud(); this._ui();
  }
  _sell() {
    const tw = this.sel.t;
    this.gold += Math.round(tw.spent * 0.7);
    this.towers = this.towers.filter((t) => t !== tw);
    fx.ballClick(0.8); this.sel = null; this._hud(); this._ui();
  }

  _startWave() {
    if (this.waveRunning || this.wave >= this.lv.waves) return;
    this.wave++; this.waveRunning = true;
    const list = waveList(this.wave, this.lv);
    this.spawnQ = list.map((type, i) => ({ type, at: this.t + i * (type === 'coureur' ? 0.55 : 0.85), route: i % this.routes.length }));
    this.hud.toast(this.wave === this.lv.waves ? '⚠️ Dernière vague : le boss arrive !' : `Vague ${this.wave}`, 1200);
    fx.whoosh(0.4);
    this._hud(); this._ui();
  }

  // ---------- Entrées ----------
  _tap(e) {
    if (!this.running || this.paused || this.over) return;
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - this.ox) / this.cell), y = Math.floor((e.clientY - r.top - this.oy) / this.cell);
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) { this.sel = null; this._ui(); return; }
    const tw = this.towers.find((t) => t.x === x && t.y === y);
    if (tw) { this.sel = { kind: 'tower', t: tw, x, y }; fx.tick(); }
    else if (this._free(x, y)) { this.sel = { kind: 'build', x, y }; fx.tick(); }
    else { this.sel = null; }
    this._ui();
  }

  // ---------- Simulation ----------
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused && !this.over) for (let k = 0; k < this.speed; k++) this._tick(dt);
    this._render();
    requestAnimationFrame(this._loop);
  }

  _spawn(s) {
    const E = ENEMIES[s.type], mult = 1 + 0.17 * (this.wave - 1) + 0.25 * this.opts.level;
    const route = this.routes[s.route];
    this.enemies.push({ type: s.type, route, seg: 0, x: route[0].x, y: route[0].y, hp: E.hp * mult, max: E.hp * mult, slowT: 0, slow: 0, wob: Math.random() * 6, dist: 0 });
  }

  _tick(dt) {
    this.t += dt;
    while (this.spawnQ.length && this.spawnQ[0].at <= this.t) this._spawn(this.spawnQ.shift());
    // déplacement des ennemis
    for (const e of this.enemies) {
      const E = ENEMIES[e.type];
      if (e.slowT > 0) e.slowT -= dt; else e.slow = 0;
      let move = E.speed * (1 - e.slow) * dt;
      while (move > 0 && e.seg < e.route.length - 1) {
        const b = e.route[e.seg + 1], dx = b.x - e.x, dy = b.y - e.y, d = Math.hypot(dx, dy);
        if (d <= move) { e.x = b.x; e.y = b.y; e.seg++; move -= d; e.dist += d; }
        else { e.x += (dx / d) * move; e.y += (dy / d) * move; e.dist += move; move = 0; }
        e.dir = Math.atan2(dy, dx);
      }
      if (e.seg >= e.route.length - 1) {
        // le chemin secondaire rejoint le principal : on continue sur la route principale
        const main = this.routes[0];
        if (e.route !== main) { const j = main.findIndex((p) => Math.abs(p.x - e.x) < 0.01 && Math.abs(p.y - e.y) < 0.01); if (j >= 0) { e.route = main; e.seg = j; continue; } }
        e.done = true; this.lives -= e.type === 'boss' ? 5 : 1;
        fx.thud(0.9); this._puff(e.x, e.y, '#ff6b6b', 10); this.shake = 0.3;
        this._hud();
      }
    }
    this.enemies = this.enemies.filter((e) => !e.done && e.hp > 0);
    if (this.lives <= 0) return this._end(false);
    // tirs des tours
    for (const tw of this.towers) {
      const T = TOWERS[tw.type], L = tw.lvl - 1;
      tw.cd -= dt;
      const cx = tw.x + 0.5, cy = tw.y + 0.5, range = T.range[L];
      // cible : l'ennemi le plus avancé à portée
      let tgt = null;
      for (const e of this.enemies) {
        if (T.ground && ENEMIES[e.type].fly) continue;
        if (Math.hypot(e.x - cx, e.y - cy) <= range && (!tgt || e.dist > tgt.dist)) tgt = e;
      }
      if (!tgt) continue;
      const want = Math.atan2(tgt.y - cy, tgt.x - cx);
      let da = want - tw.angle; da = Math.atan2(Math.sin(da), Math.cos(da)); tw.angle += da * Math.min(1, dt * 12);
      if (tw.cd > 0) continue;
      tw.cd = 1 / T.rate[L];
      tw.recoil = 1;
      if (tw.type === 'eclair') this._lightning(tw, tgt, T, L);
      else this.shots.push({ type: tw.type, x: cx, y: cy, tgt, sp: tw.type === 'canon' ? 6 : 11, dmg: T.dmg[L], L, sx: cx, sy: cy });
      if (tw.type === 'archer') fx.tick(); else if (tw.type === 'canon') fx.thud(0.35);
    }
    // projectiles
    for (const s of this.shots) {
      const tx = s.tgt.x, ty = s.tgt.y, d = Math.hypot(tx - s.x, ty - s.y), step = s.sp * dt;
      if (d <= step || s.tgt.hp <= 0) { s.hit = true; this._impact(s, tx, ty); }
      else { s.x += ((tx - s.x) / d) * step; s.y += ((ty - s.y) / d) * step; s.a = Math.atan2(ty - s.y, tx - s.x); }
    }
    this.shots = this.shots.filter((s) => !s.hit);
    for (const f of this.fxs) f.t += dt;
    this.fxs = this.fxs.filter((f) => f.t < f.life);
    if (this.shake > 0) this.shake -= dt;
    // fin de vague
    if (this.waveRunning && !this.spawnQ.length && !this.enemies.length) {
      this.waveRunning = false;
      const bonus = 15 + this.wave * 3; this.gold += bonus;
      if (this.wave >= this.lv.waves) return this._end(true);
      this.hud.toast(`Vague ${this.wave} repoussée ! +${bonus} or`, 1400); fx.star(1);
      this._hud(); this._ui();
    }
  }

  _damage(e, dmg) {
    const E = ENEMIES[e.type];
    const real = Math.max(1, dmg - E.armor);
    e.hp -= real; e.hitT = 0.12;
    if (e.hp <= 0 && !e.dead) {
      e.dead = true; this.gold += E.reward;
      this._puff(e.x, e.y, E.color, e.type === 'boss' ? 40 : 10);
      this.fxs.push({ kind: 'coin', x: e.x, y: e.y, t: 0, life: 0.8, v: E.reward });
      if (e.type === 'boss') fx.slam(); else fx.ballClick(0.5);
      this._hud();
      if (this.sel) this._ui();
    }
  }

  _impact(s, x, y) {
    const T = TOWERS[s.type];
    if (s.type === 'canon') {
      const R = T.splash[s.L];
      for (const e of this.enemies) if (!ENEMIES[e.type].fly && Math.hypot(e.x - x, e.y - y) <= R) this._damage(e, s.dmg);
      this.fxs.push({ kind: 'boom', x, y, t: 0, life: 0.45, r: R });
    } else {
      this._damage(s.tgt, s.dmg);
      if (s.type === 'givre') { s.tgt.slow = Math.max(s.tgt.slow, T.slow[s.L]); s.tgt.slowT = 1.6; this.fxs.push({ kind: 'frost', x, y, t: 0, life: 0.35 }); }
    }
  }

  _lightning(tw, first, T, L) {
    const hits = [first]; let cur = first;
    for (let k = 1; k < T.chain[L]; k++) {
      let nxt = null, best = 1.8;
      for (const e of this.enemies) { if (hits.includes(e)) continue; const d = Math.hypot(e.x - cur.x, e.y - cur.y); if (d < best) { best = d; nxt = e; } }
      if (!nxt) break; hits.push(nxt); cur = nxt;
    }
    const pts = [{ x: tw.x + 0.5, y: tw.y + 0.3 }, ...hits.map((e) => ({ x: e.x, y: e.y }))];
    hits.forEach((e, k) => this._damage(e, T.dmg[L] * (k ? 0.7 : 1)));
    this.fxs.push({ kind: 'bolt', pts, t: 0, life: 0.25 });
    fx.metal(0.4);
  }

  _puff(x, y, color, n) {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, v = 0.6 + Math.random() * 1.6;
      this.fxs.push({ kind: 'p', x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, color, t: 0, life: 0.4 + Math.random() * 0.3 });
    }
  }

  _end(won) {
    this.over = true; this.hud.controls(null);
    const stars = won ? (this.lives >= 18 ? 3 : this.lives >= 10 ? 2 : 1) : 0;
    won ? fx.win() : fx.lose();
    setTimeout(() => this.running && this.hud.end({ won, stars, title: won ? (stars === 3 ? 'Royaume intact !' : 'Victoire !') : 'Le château est tombé…',
      text: won ? `Les ${this.lv.waves} vagues sont repoussées, il reste ${this.lives} vie${this.lives > 1 ? 's' : ''} au château.` : `Tu as tenu ${this.wave - 1} vague${this.wave > 2 ? 's' : ''} sur ${this.lv.waves}. Construis plus de tours et améliore-les !` }), 1200);
  }

  // ---------- Rendu ----------
  _bgCanvas() {
    const cs = this.cell, d = this.dpr, W = cs * COLS, H = cs * ROWS;
    const c = document.createElement('canvas'); c.width = Math.round((W + 20) * d); c.height = Math.round((H + 20) * d);
    const g = c.getContext('2d'); g.scale(d, d); g.translate(10, 10);
    let seed = 99; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    const pat = (ctx, k, size) => { const im = TEX[k]; if (!im) return null; const p = ctx.createPattern(im, 'repeat'); p.setTransform(new DOMMatrix().scale(size / im.width)); return p; };
    const strokeRoutes = (ctx) => { for (const route of this.routes) { ctx.beginPath(); route.forEach((p, k) => (k ? ctx.lineTo(p.x * cs, p.y * cs) : ctx.moveTo(p.x * cs, p.y * cs))); ctx.stroke(); } };
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.roundRect(-6, -4, W + 12, H + 12, 14); g.fill();
    g.save(); g.beginPath(); g.roundRect(-4, -4, W + 8, H + 8, 12); g.clip();
    // herbe (photo) + variations de teinte
    g.fillStyle = pat(g, 'grass', cs * 3.2) || '#5f9a3c'; g.fillRect(-4, -4, W + 8, H + 8);
    g.fillStyle = 'rgba(70,120,30,0.18)'; g.fillRect(-4, -4, W + 8, H + 8);
    for (let k = 0; k < 16; k++) {
      const x = r() * W, y = r() * H, rr = cs * (1.2 + r() * 2.2), dark = r() < 0.55;
      const gr = g.createRadialGradient(x, y, 0, x, y, rr); gr.addColorStop(0, dark ? 'rgba(20,45,10,0.28)' : 'rgba(190,210,110,0.18)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x - rr, y - rr, rr * 2, rr * 2);
    }
    for (let k = 0; k < 22; k++) { const x = r() * W, y = r() * H; g.fillStyle = ['#ffe08a', '#ffb3c6', '#f5f5f5', '#c7a6ff'][k % 4]; for (let j = 0; j < 4; j++) { g.beginPath(); g.arc(x + (r() - 0.5) * 8, y + (r() - 0.5) * 8, 1.3, 0, Math.PI * 2); g.fill(); } }
    // chemin : ombre des bords, puis terre caillouteuse (photo) découpée sur le tracé
    g.lineCap = 'round'; g.lineJoin = 'round';
    g.save(); g.shadowColor = 'rgba(20,12,4,0.7)'; g.shadowBlur = cs * 0.35; g.strokeStyle = 'rgba(60,42,22,0.85)'; g.lineWidth = cs * 0.9; strokeRoutes(g); g.restore();
    const m = document.createElement('canvas'); m.width = c.width; m.height = c.height;
    const mg = m.getContext('2d'); mg.scale(d, d); mg.translate(10, 10); mg.lineCap = 'round'; mg.lineJoin = 'round';
    mg.strokeStyle = '#000'; mg.lineWidth = cs * 0.8; strokeRoutes(mg);
    mg.globalCompositeOperation = 'source-in';
    mg.fillStyle = pat(mg, 'path', cs * 2.6) || '#c9a46a'; mg.fillRect(-10, -10, W + 20, H + 20);
    mg.fillStyle = 'rgba(225,190,140,0.38)'; mg.fillRect(-10, -10, W + 20, H + 20);
    mg.globalCompositeOperation = 'source-over';
    mg.strokeStyle = 'rgba(255,240,210,0.10)'; mg.lineWidth = cs * 0.4; strokeRoutes(mg);
    mg.strokeStyle = 'rgba(70,50,25,0.22)'; mg.lineWidth = cs * 0.05;
    mg.setLineDash([cs * 0.4, cs * 0.25]);
    for (const off of [-0.18, 0.18]) { mg.save(); mg.translate(off * cs, off * cs * 0.3); strokeRoutes(mg); mg.restore(); }
    mg.setLineDash([]);
    g.save(); g.setTransform(1, 0, 0, 1, 0, 0); g.drawImage(m, 0, 0); g.restore();
    // touffes d'herbe au bord du chemin
    for (let k = 0; k < 340; k++) {
      const route = this.routes[k % this.routes.length], i = Math.floor(r() * (route.length - 1)), a = route[i], b = route[i + 1], t = r();
      const side = r() < 0.5 ? -1 : 1, nx = -(b.y - a.y), ny = b.x - a.x, nl = Math.hypot(nx, ny) || 1;
      const x = (a.x + (b.x - a.x) * t) * cs + (nx / nl) * side * cs * (0.38 + r() * 0.1), y = (a.y + (b.y - a.y) * t) * cs + (ny / nl) * side * cs * (0.38 + r() * 0.1);
      g.strokeStyle = r() < 0.5 ? 'rgba(40,80,20,0.8)' : 'rgba(120,170,60,0.8)'; g.lineWidth = 1.2;
      for (let j = 0; j < 3; j++) { g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 5, y - 3 - r() * 4); g.stroke(); }
    }
    // décor : arbres vus du dessus et rochers
    for (const [k, kind] of this.decor) {
      const [x, y] = k.split(',').map(Number), cx = (x + 0.5) * cs, cy = (y + 0.5) * cs;
      if (kind === 'tree') {
        g.save(); g.filter = `blur(${Math.max(2, cs * 0.08)}px)`; g.fillStyle = 'rgba(0,0,0,0.42)';
        g.beginPath(); g.ellipse(cx + cs * 0.2, cy + cs * 0.24, cs * 0.44, cs * 0.36, 0.3, 0, Math.PI * 2); g.fill(); g.restore();
        const blobs = [[0, 0, 0.42], [-0.2, -0.12, 0.26], [0.18, -0.16, 0.24], [0.2, 0.14, 0.26], [-0.18, 0.18, 0.24], [0, -0.26, 0.2], [0.02, 0.04, 0.28]];
        for (const [ox, oy, rr] of blobs) {
          const bx = cx + ox * cs, by = cy + oy * cs, R = rr * cs;
          const gr = g.createRadialGradient(bx - R * 0.4, by - R * 0.45, R * 0.1, bx, by, R);
          gr.addColorStop(0, '#9ccc5a'); gr.addColorStop(0.55, '#4f8f35'); gr.addColorStop(1, '#1f4a1a');
          g.fillStyle = gr; g.beginPath(); g.arc(bx, by, R, 0, Math.PI * 2); g.fill();
        }
        for (let j = 0; j < 40; j++) { const a = r() * Math.PI * 2, rr = r() * cs * 0.4; g.fillStyle = r() < 0.6 ? 'rgba(20,50,15,0.35)' : 'rgba(190,230,120,0.3)'; g.beginPath(); g.arc(cx + Math.cos(a) * rr, cy + Math.sin(a) * rr, 1 + r() * 1.5, 0, Math.PI * 2); g.fill(); }
      } else {
        const pts = []; for (let j = 0; j < 9; j++) { const a = (j / 9) * Math.PI * 2, rr = cs * (0.24 + r() * 0.1); pts.push([cx + Math.cos(a) * rr * 1.2, cy + Math.sin(a) * rr * 0.9]); }
        const poly = () => { g.beginPath(); pts.forEach(([px, py], j) => (j ? g.lineTo(px, py) : g.moveTo(px, py))); g.closePath(); };
        g.save(); g.filter = `blur(${Math.max(2, cs * 0.06)}px)`; g.translate(cs * 0.12, cs * 0.14); g.fillStyle = 'rgba(0,0,0,0.45)'; poly(); g.fill(); g.restore();
        poly(); g.fillStyle = pat(g, 'stone', cs * 1.5) || '#8a857a'; g.fill();
        const gr = g.createRadialGradient(cx - cs * 0.15, cy - cs * 0.15, 1, cx, cy, cs * 0.4); gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.45)');
        g.fillStyle = gr; poly(); g.fill();
      }
    }
    // château en pierre
    const kx = this.castle.x * cs, ky = this.castle.y * cs, s = cs * 1.15;
    const stone = pat(g, 'stone', cs * 1.3) || '#9aa0a8';
    g.save(); g.filter = `blur(${Math.max(2, cs * 0.1)}px)`; g.fillStyle = 'rgba(0,0,0,0.5)'; g.fillRect(kx - s * 0.62 + cs * 0.15, ky - s * 0.3 + cs * 0.18, s * 1.3, s * 0.85); g.restore();
    const lit = (x, y, w, h) => { const gr = g.createLinearGradient(x, y, x + w, y + h); gr.addColorStop(0, 'rgba(255,240,210,0.25)'); gr.addColorStop(1, 'rgba(0,0,0,0.35)'); g.fillStyle = gr; g.fillRect(x, y, w, h); };
    g.fillStyle = stone; g.fillRect(kx - s * 0.6, ky - s * 0.35, s * 1.2, s * 0.8); lit(kx - s * 0.6, ky - s * 0.35, s * 1.2, s * 0.8);
    for (let k = 0; k < 5; k++) { g.fillStyle = stone; g.fillRect(kx - s * 0.6 + k * s * 0.26, ky - s * 0.45, s * 0.14, s * 0.12); lit(kx - s * 0.6 + k * s * 0.26, ky - s * 0.45, s * 0.14, s * 0.12); }
    for (const ox of [-0.68, 0.43]) {
      const tx = kx + ox * s, tw = s * 0.25;
      g.fillStyle = stone; g.fillRect(tx, ky - s * 0.72, tw, s * 1.17); lit(tx, ky - s * 0.72, tw, s * 1.17);
      const rg = g.createLinearGradient(tx, 0, tx + tw, 0); rg.addColorStop(0, '#5a6b94'); rg.addColorStop(0.5, '#34405f'); rg.addColorStop(1, '#1c2438');
      g.fillStyle = rg; g.beginPath(); g.moveTo(tx - s * 0.04, ky - s * 0.72); g.lineTo(tx + tw / 2, ky - s * 1.08); g.lineTo(tx + tw + s * 0.04, ky - s * 0.72); g.closePath(); g.fill();
      g.fillStyle = '#1a1208'; g.fillRect(tx + tw * 0.38, ky - s * 0.5, tw * 0.24, s * 0.12);
    }
    g.fillStyle = pat(g, 'wood', cs * 0.8) || '#4a3020'; g.beginPath(); g.roundRect(kx - s * 0.15, ky + s * 0.05, s * 0.3, s * 0.4, [s * 0.15, s * 0.15, 0, 0]); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.roundRect(kx - s * 0.15, ky + s * 0.05, s * 0.3, s * 0.4, [s * 0.15, s * 0.15, 0, 0]); g.fill();
    g.fillStyle = '#5a4030'; g.fillRect(kx - 1, ky - s * 0.75, 2, s * 0.32);
    g.fillStyle = '#c0392b'; g.beginPath(); g.moveTo(kx + 1, ky - s * 0.75); g.lineTo(kx + s * 0.28, ky - s * 0.69); g.lineTo(kx + 1, ky - s * 0.62); g.fill();
    // lumière chaude d'en haut à gauche et vignettage
    const sun = g.createLinearGradient(0, 0, W, H); sun.addColorStop(0, 'rgba(255,230,170,0.12)'); sun.addColorStop(1, 'rgba(0,0,30,0.12)');
    g.fillStyle = sun; g.fillRect(-4, -4, W + 8, H + 8);
    const vg = g.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.35)');
    g.fillStyle = vg; g.fillRect(-4, -4, W + 8, H + 8);
    g.restore();
    return c;
  }

  // socle en pavés (mis en cache par taille)
  _base(s) {
    const k = Math.round(s);
    this._baseCache ||= new Map();
    if (this._baseCache.has(k)) return this._baseCache.get(k);
    const d = this.dpr || 1, c = document.createElement('canvas'); c.width = c.height = Math.ceil(k * d);
    const g = c.getContext('2d'); g.scale(d, d); g.translate(k / 2, k / 2);
    const poly = () => { g.beginPath(); for (let j = 0; j < 8; j++) { const a = (j / 8) * Math.PI * 2 + Math.PI / 8; g.lineTo(Math.cos(a) * k * 0.4, Math.sin(a) * k * 0.4); } g.closePath(); };
    poly();
    if (TEX.cobble) { const p = g.createPattern(TEX.cobble, 'repeat'); p.setTransform(new DOMMatrix().scale(k * 0.7 / TEX.cobble.width)); g.fillStyle = p; } else g.fillStyle = '#a8a296';
    g.fill();
    const gr = g.createRadialGradient(-k * 0.14, -k * 0.16, 1, 0, 0, k * 0.44); gr.addColorStop(0, 'rgba(255,245,225,0.35)'); gr.addColorStop(0.6, 'rgba(0,0,0,0.05)'); gr.addColorStop(1, 'rgba(0,0,0,0.5)');
    g.fillStyle = gr; poly(); g.fill();
    g.strokeStyle = 'rgba(30,25,20,0.6)'; g.lineWidth = 1.2; poly(); g.stroke();
    this._baseCache.set(k, c);
    return c;
  }

  _drawTower(g, tw, s) {
    const T = TOWERS[tw.type], lvl = tw.lvl;
    // socle en pierre
    const sg = g.createRadialGradient(s * 0.12, s * 0.14, s * 0.1, s * 0.12, s * 0.14, s * 0.5); sg.addColorStop(0, 'rgba(0,0,0,0.45)'); sg.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sg; g.beginPath(); g.arc(s * 0.12, s * 0.14, s * 0.5, 0, Math.PI * 2); g.fill();
    g.drawImage(this._base(s), -s / 2, -s / 2, s, s);
    // anneau de couleur et étoiles de niveau
    g.strokeStyle = T.color; g.lineWidth = s * 0.07; g.beginPath(); g.arc(0, 0, s * 0.3, 0, Math.PI * 2); g.stroke();
    for (let k = 0; k < lvl; k++) { g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(-s * 0.18 + k * s * 0.18, s * 0.36, s * 0.06, 0, Math.PI * 2); g.fill(); }
    g.save(); g.rotate(tw.angle || 0);
    const rc = (tw.recoil || 0) * s * 0.06;
    if (tw.type === 'archer') {
      g.fillStyle = '#6b4423'; g.beginPath(); g.arc(0, 0, s * 0.2, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#3b2412'; g.lineWidth = s * 0.06; g.beginPath(); g.arc(s * 0.05 - rc, 0, s * 0.22, -1.2, 1.2); g.stroke();
      g.strokeStyle = '#eee'; g.lineWidth = 1; g.beginPath(); g.moveTo(s * 0.13 - rc, -s * 0.2); g.lineTo(-s * 0.05 - rc, 0); g.lineTo(s * 0.13 - rc, s * 0.2); g.stroke();
      g.strokeStyle = '#c9a46a'; g.lineWidth = s * 0.03; g.beginPath(); g.moveTo(-s * 0.05 - rc, 0); g.lineTo(s * 0.3 - rc, 0); g.stroke();
    } else if (tw.type === 'canon') {
      g.fillStyle = '#2b2f36'; g.beginPath(); g.roundRect(-s * 0.1 - rc, -s * 0.09 - lvl, s * 0.42, s * 0.18 + lvl * 2, s * 0.05); g.fill();
      g.fillStyle = '#444b55'; g.beginPath(); g.arc(-rc * 0.5, 0, s * 0.18, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(s * 0.32 - rc, 0, s * 0.06, 0, Math.PI * 2); g.fill();
    } else if (tw.type === 'givre') {
      g.fillStyle = '#d6f1ff';
      for (let k = 0; k < 6; k++) { g.save(); g.rotate((k * Math.PI) / 3 + this.t * 0.8); g.beginPath(); g.moveTo(0, -s * 0.05); g.lineTo(s * 0.06, -s * 0.24); g.lineTo(0, -s * 0.32); g.lineTo(-s * 0.06, -s * 0.24); g.fill(); g.restore(); }
      g.fillStyle = '#4fb3e8'; g.beginPath(); g.arc(0, 0, s * 0.11, 0, Math.PI * 2); g.fill();
    } else {
      const p = 0.6 + 0.4 * Math.sin(this.t * 6 + (tw.x || 0));
      g.fillStyle = '#3b1d66'; g.beginPath(); g.arc(0, 0, s * 0.2, 0, Math.PI * 2); g.fill();
      const og = g.createRadialGradient(0, 0, 1, 0, 0, s * 0.2 * (0.8 + p * 0.4)); og.addColorStop(0, '#fff'); og.addColorStop(0.4, '#c99bff'); og.addColorStop(1, 'rgba(163,92,255,0)');
      g.fillStyle = og; g.beginPath(); g.arc(0, 0, s * 0.24, 0, Math.PI * 2); g.fill();
    }
    g.restore();
  }

  _drawEnemy(g, e, cs) {
    const E = ENEMIES[e.type], x = this.ox + e.x * cs, bob = Math.sin(this.t * 10 + e.wob) * cs * 0.03;
    const y = this.oy + e.y * cs + bob, r = E.size * cs;
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x, this.oy + e.y * cs + r * 0.8 + (E.fly ? cs * 0.25 : 0), r * 0.9, r * 0.35, 0, 0, Math.PI * 2); g.fill();
    const yy = E.fly ? y - cs * 0.25 : y;
    if (e.type === 'chauvesouris') {
      const flap = Math.sin(this.t * 18 + e.wob) * 0.6;
      g.fillStyle = E.color;
      for (const s of [-1, 1]) { g.beginPath(); g.moveTo(x, yy); g.quadraticCurveTo(x + s * r * 1.4, yy - r * (0.8 + flap), x + s * r * 1.9, yy + r * 0.2); g.quadraticCurveTo(x + s * r, yy + r * 0.1, x, yy + r * 0.3); g.fill(); }
      g.beginPath(); g.arc(x, yy, r * 0.5, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#ff4d4d'; g.fillRect(x - r * 0.22, yy - r * 0.15, r * 0.12, r * 0.12); g.fillRect(x + r * 0.1, yy - r * 0.15, r * 0.12, r * 0.12);
    } else {
      // petit soldat vu de dessus, orienté dans le sens de la marche
      const dir = e.dir ?? Math.PI / 2, walk = Math.sin(this.t * 12 + e.wob), hit = e.hitT > 0;
      const tunic = hit ? '#ffffff' : E.color, metal = e.type === 'chevalier' || e.type === 'boss';
      g.save(); g.translate(x, yy); g.rotate(dir);
      if (e.type === 'boss') { g.fillStyle = '#7a1018'; g.beginPath(); g.moveTo(-r * 0.2, -r * 0.9); g.quadraticCurveTo(-r * 1.5, 0, -r * 0.2, r * 0.9); g.closePath(); g.fill(); }
      // jambes
      g.fillStyle = '#3a2a1a';
      for (const sd of [-1, 1]) { g.beginPath(); g.ellipse(walk * sd * r * 0.35, sd * r * 0.32, r * 0.28, r * 0.17, 0, 0, Math.PI * 2); g.fill(); }
      // bras
      g.fillStyle = metal ? '#aeb6bf' : '#e0b48a';
      for (const sd of [-1, 1]) { g.beginPath(); g.arc(-walk * sd * r * 0.25 + r * 0.05, sd * r * 0.88, r * 0.2, 0, Math.PI * 2); g.fill(); }
      // épaules / torse
      const tg = g.createLinearGradient(-r, -r, r, r); tg.addColorStop(0, shade(E.color, 0.2)); tg.addColorStop(1, shade(E.color, -0.3));
      g.fillStyle = hit ? '#fff' : tg; g.beginPath(); g.ellipse(0, 0, r * 0.5, r * 0.82, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.45)'; g.lineWidth = 1.2; g.stroke();
      if (metal) { g.strokeStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(0, 0, r * 0.35, r * 0.65, 0, -2.4, -0.8); g.stroke(); }
      // armes
      if (e.type === 'soldat') { g.strokeStyle = '#7a5230'; g.lineWidth = r * 0.12; g.beginPath(); g.moveTo(-r * 0.6, r * 0.88); g.lineTo(r * 1.5, r * 0.88); g.stroke(); g.fillStyle = '#cfd6dd'; g.beginPath(); g.moveTo(r * 1.5, r * 0.75); g.lineTo(r * 1.85, r * 0.88); g.lineTo(r * 1.5, r * 1.01); g.fill(); }
      else if (e.type === 'coureur') { g.fillStyle = '#cfd6dd'; g.fillRect(r * 0.2, r * 0.82, r * 0.7, r * 0.12); }
      else {
        g.fillStyle = '#cfd6dd'; g.fillRect(r * 0.2, r * 0.82, r * (e.type === 'boss' ? 1.3 : 1), r * 0.14);
        const sg = g.createLinearGradient(0, -r * 1.3, 0, -r * 0.6); sg.addColorStop(0, '#e8edf2'); sg.addColorStop(1, '#7d8792');
        g.fillStyle = sg; g.beginPath(); g.ellipse(r * 0.25, -r * 0.95, r * 0.22, r * 0.5, 0, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#3d454f'; g.lineWidth = 1; g.stroke();
        g.fillStyle = e.type === 'boss' ? '#ffd34d' : '#c0392b'; g.beginPath(); g.arc(r * 0.25, -r * 0.95, r * 0.1, 0, Math.PI * 2); g.fill();
      }
      // tête : casque, capuche ou bonnet
      const hg = g.createRadialGradient(r * 0.05, -r * 0.15, 1, r * 0.1, 0, r * 0.45);
      if (metal) { hg.addColorStop(0, '#f2f5f8'); hg.addColorStop(1, '#5f6973'); }
      else if (e.type === 'coureur') { hg.addColorStop(0, '#3f8f3a'); hg.addColorStop(1, '#1f4a1a'); }
      else { hg.addColorStop(0, '#9a6a3a'); hg.addColorStop(1, '#4a2f16'); }
      g.fillStyle = hit ? '#fff' : hg; g.beginPath(); g.arc(r * 0.1, 0, r * 0.42, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,0.5)'; g.lineWidth = 1; g.stroke();
      if (metal) { g.fillStyle = '#20252b'; g.fillRect(r * 0.38, -r * 0.2, r * 0.1, r * 0.4); }
      if (e.type === 'boss') { g.fillStyle = '#ffd34d'; for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.beginPath(); g.arc(r * 0.1 + Math.cos(a) * r * 0.36, Math.sin(a) * r * 0.36, r * 0.09, 0, Math.PI * 2); g.fill(); } }
      g.restore();
    }
    if (e.slow > 0) { g.strokeStyle = 'rgba(160,220,255,0.9)'; g.lineWidth = 2; g.beginPath(); g.arc(x, yy, r + 2, 0, Math.PI * 2); g.stroke(); }
    // barre de vie
    const w = Math.max(r * 2, cs * 0.5), pct = Math.max(0, e.hp / e.max);
    g.fillStyle = 'rgba(0,0,0,0.6)'; g.fillRect(x - w / 2, yy - r - 8, w, 4);
    g.fillStyle = pct > 0.5 ? '#2ecc71' : pct > 0.25 ? '#f1c40f' : '#e74c3c'; g.fillRect(x - w / 2, yy - r - 8, w * pct, 4);
    if (e.hitT > 0) e.hitT -= 0.016;
  }

  _render() {
    const g = this.ctx, d = this.dpr, cs = this.cell;
    g.setTransform(d, 0, 0, d, 0, 0);
    const bg = g.createRadialGradient(this.vw / 2, this.vh / 2, 40, this.vw / 2, this.vh / 2, this.vh * 0.8);
    bg.addColorStop(0, '#2a4a24'); bg.addColorStop(1, '#0b140a');
    g.fillStyle = bg; g.fillRect(0, 0, this.vw, this.vh);
    if (!cs) return;
    if (this.shake > 0) g.translate((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8);
    if (!this.bg) this.bg = this._bgCanvas();
    g.drawImage(this.bg, this.ox - 10, this.oy - 10, cs * COLS + 20, cs * ROWS + 20);
    // case sélectionnée et portée
    if (this.sel) {
      const { x, y } = this.sel;
      g.strokeStyle = '#ffd34d'; g.lineWidth = 2; g.strokeRect(this.ox + x * cs + 1, this.oy + y * cs + 1, cs - 2, cs - 2);
      const type = this.sel.kind === 'tower' ? this.sel.t.type : null;
      if (type) {
        const R = TOWERS[type].range[this.sel.t.lvl - 1] * cs;
        g.fillStyle = 'rgba(255,255,255,0.12)'; g.strokeStyle = 'rgba(255,255,255,0.6)'; g.setLineDash([5, 5]);
        g.beginPath(); g.arc(this.ox + (x + 0.5) * cs, this.oy + (y + 0.5) * cs, R, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
      }
    }
    for (const tw of this.towers) {
      g.save(); g.translate(this.ox + (tw.x + 0.5) * cs, this.oy + (tw.y + 0.5) * cs);
      const pop = Math.min(1, (this.t - tw.born) * 5); g.scale(pop, pop);
      this._drawTower(g, tw, cs);
      g.restore();
      if (tw.recoil) tw.recoil = Math.max(0, tw.recoil - 0.1);
    }
    for (const e of [...this.enemies].sort((a, b) => a.y - b.y)) this._drawEnemy(g, e, cs);
    // projectiles
    for (const s of this.shots) {
      const x = this.ox + s.x * cs, y = this.oy + s.y * cs;
      if (s.type === 'archer') { g.strokeStyle = '#5a3a1a'; g.lineWidth = 2; g.beginPath(); g.moveTo(x - Math.cos(s.a || 0) * cs * 0.25, y - Math.sin(s.a || 0) * cs * 0.25); g.lineTo(x, y); g.stroke(); }
      else if (s.type === 'canon') { g.fillStyle = '#111'; g.beginPath(); g.arc(x, y, cs * 0.09, 0, Math.PI * 2); g.fill(); }
      else { g.fillStyle = '#bfefff'; g.beginPath(); g.arc(x, y, cs * 0.08, 0, Math.PI * 2); g.fill(); }
    }
    // effets
    for (const f of this.fxs) {
      const k = f.t / f.life;
      if (f.kind === 'p') { g.globalAlpha = 1 - k; g.fillStyle = f.color; g.beginPath(); g.arc(this.ox + (f.x + f.vx * f.t) * cs, this.oy + (f.y + f.vy * f.t) * cs, 2.5, 0, Math.PI * 2); g.fill(); }
      else if (f.kind === 'boom') { g.globalAlpha = 1 - k; const gr = g.createRadialGradient(this.ox + f.x * cs, this.oy + f.y * cs, 0, this.ox + f.x * cs, this.oy + f.y * cs, f.r * cs * (0.5 + k)); gr.addColorStop(0, '#fff6c8'); gr.addColorStop(0.4, '#ff9f1c'); gr.addColorStop(1, 'rgba(120,40,0,0)'); g.fillStyle = gr; g.beginPath(); g.arc(this.ox + f.x * cs, this.oy + f.y * cs, f.r * cs * (0.5 + k), 0, Math.PI * 2); g.fill(); }
      else if (f.kind === 'frost') { g.globalAlpha = 1 - k; g.strokeStyle = '#d6f1ff'; g.lineWidth = 2; g.beginPath(); g.arc(this.ox + f.x * cs, this.oy + f.y * cs, cs * 0.3 * (1 + k), 0, Math.PI * 2); g.stroke(); }
      else if (f.kind === 'bolt') {
        g.globalAlpha = 1 - k; g.strokeStyle = '#e9d5ff'; g.lineWidth = 3; g.shadowColor = '#a35cff'; g.shadowBlur = 12;
        g.beginPath();
        f.pts.forEach((p, i) => { if (!i) return g.moveTo(this.ox + p.x * cs, this.oy + p.y * cs); const q = f.pts[i - 1]; for (let s = 1; s <= 4; s++) { const t = s / 4; g.lineTo(this.ox + (q.x + (p.x - q.x) * t) * cs + (s < 4 ? (Math.random() - 0.5) * cs * 0.3 : 0), this.oy + (q.y + (p.y - q.y) * t) * cs + (s < 4 ? (Math.random() - 0.5) * cs * 0.3 : 0)); } });
        g.stroke(); g.shadowBlur = 0;
      } else if (f.kind === 'coin') { g.globalAlpha = 1 - k; g.fillStyle = '#ffd34d'; g.font = `900 ${cs * 0.32}px system-ui`; g.textAlign = 'center'; g.fillText(`+${f.v}`, this.ox + f.x * cs, this.oy + (f.y - k * 0.8) * cs); }
      g.globalAlpha = 1;
    }
  }
}

function shade(hex, a) {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + a * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
