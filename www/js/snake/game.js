// Jeu du serpent : il mange des billes qui s'ajoutent à sa queue. Interdit de toucher le cadre, les murs ou soi-même.
import { fx } from '../fx.js';

export const COLS = 15, ROWS = 21;
const COLORS = ['#ff006e', '#ffbe0b', '#3a86ff', '#06d6a0', '#8338ec', '#fb5607', '#00b4d8', '#e63946', '#70e000'];

const rect = (x, y, w, h) => ({ x, y, w, h });
export const SNAKE_LEVELS = [
  { name: 'Le jardin', speed: 6, goal: 8, walls: [] },
  { name: 'Les plots', speed: 6.5, goal: 10, walls: [rect(3, 4, 1, 1), rect(11, 4, 1, 1), rect(3, 12, 1, 1), rect(11, 12, 1, 1), rect(7, 8, 1, 1)] },
  { name: 'Le couloir', speed: 7, goal: 12, walls: [rect(7, 2, 1, 6), rect(7, 10, 1, 4)] },
  { name: 'La croix', speed: 7.5, goal: 12, walls: [rect(7, 4, 1, 4), rect(7, 10, 1, 4), rect(2, 9, 4, 1), rect(9, 9, 4, 1)] },
  { name: 'Les quatre cases', speed: 8, goal: 14, walls: [rect(2, 3, 3, 3), rect(10, 3, 3, 3), rect(2, 11, 3, 3), rect(10, 11, 3, 3)] },
  { name: 'Le labyrinthe', speed: 8.5, goal: 15, walls: [rect(0, 4, 6, 1), rect(9, 4, 6, 1), rect(4, 8, 7, 1), rect(0, 12, 5, 1), rect(10, 12, 5, 1), rect(1, 16, 3, 1), rect(11, 16, 3, 1)] },
  { name: 'Les murets', speed: 9, goal: 16, walls: [rect(0, 3, 10, 1), rect(5, 7, 10, 1), rect(0, 11, 10, 1), rect(10, 15, 5, 1), rect(0, 15, 4, 1)] },
  { name: 'Le colimaçon', speed: 9.5, goal: 16, walls: [rect(2, 2, 11, 1), rect(12, 3, 1, 9), rect(5, 11, 7, 1), rect(2, 3, 1, 12), rect(5, 5, 5, 1), rect(5, 6, 1, 3)] },
  { name: 'La forteresse', speed: 10, goal: 18, walls: [rect(3, 3, 9, 1), rect(3, 4, 1, 3), rect(11, 4, 1, 3), rect(3, 10, 1, 3), rect(11, 10, 1, 3), rect(3, 13, 4, 1), rect(8, 13, 4, 1), rect(6, 7, 3, 1), rect(0, 17, 3, 1), rect(12, 17, 3, 1)] },
  { name: 'Le défi du roi', speed: 11, goal: 20, walls: [2, 5, 9, 12].flatMap((x) => [3, 7, 11, 15].map((y) => rect(x, y, 1, 1))).concat([rect(6, 9, 3, 1)]) },
];
export const parTime = (lv) => Math.round(lv.goal * 2.8 + 6);
export function snakeStars(lv, time) { const p = parTime(lv); return time <= p ? 3 : time <= p * 1.5 ? 2 : 1; }

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

export class Snake {
  constructor(canvas, hud) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud;
    this.running = false; this.paused = false;
    this._loop = this._loop.bind(this);
    this._onResize = () => this.resize();
    this._onKey = (e) => {
      const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', z: 'up', w: 'up', s: 'down', q: 'left', a: 'left', d: 'right' }[e.key];
      if (k && this.running) { e.preventDefault(); this._push(k); }
    };
    this._bindTouch();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr; this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    // l'écran n'est pas encore affiché : on réessaie à l'image suivante (sinon le plateau fait 0 pixel)
    if (this.vw < 50 || this.vh < 50) { requestAnimationFrame(() => this.running && this.resize()); return; }
    this.canvas.width = Math.round(this.vw * dpr); this.canvas.height = Math.round(this.vh * dpr);
    const top = 128, bottom = this.opts?.dpad ? 214 : 26, frame = 12;
    this.cell = Math.floor(Math.min((this.vw - 24 - frame * 2) / COLS, (this.vh - top - bottom - frame * 2) / ROWS));
    // zone encore trop petite (transition d'écran, clavier…) : on réessaie plutôt que de rester sur un écran vide
    if (!(this.cell >= 6)) { this.cell = 0; requestAnimationFrame(() => this.running && this.resize()); return; }
    this.bw = this.cell * COLS; this.bh = this.cell * ROWS;
    this.ox = Math.round((this.vw - this.bw) / 2);
    this.oy = Math.round(top + (this.vh - top - bottom - this.bh) / 2);
    this.board = null;
  }

  start(opts) {
    this.opts = opts;
    this.endless = opts.level === 'endless';
    this.lv = this.endless ? { name: 'Infini', speed: 6, goal: Infinity, walls: [] } : SNAKE_LEVELS[opts.level];
    this.mul = opts.speedMul || 1;            // réglage de vitesse choisi par le joueur
    this.speed = this.lv.speed * this.mul;
    this.blocked = new Set();
    for (const w of this.lv.walls) for (let x = w.x; x < w.x + w.w; x++) for (let y = w.y; y < w.y + w.h; y++) this.blocked.add(x + ',' + y);
    const c = Math.floor(COLS / 2);
    this.body = [[c, ROWS - 4], [c, ROWS - 3], [c, ROWS - 2]].map(([x, y]) => ({ x, y }));
    // couleurs des billes du serpent, de la tête vers la queue (les billes mangées s'insèrent derrière la tête)
    this.colors = [opts.color || '#06d6a0', '#2ec27e', '#2ec27e'];
    this.prev = this.body.map((s) => ({ ...s }));
    this.dir = 'up'; this.queue = [];
    this.eaten = 0; this.score = 0; this.time = 0; this.k = 0;
    this.food = null; this.gold = null; this.sinceGold = 0;
    this.particles = []; this.texts = []; this.shake = 0; this.flash = 0;
    this.phase = 'count'; this.countT = 0; this.t = 0;
    this.paused = false;
    window.addEventListener('resize', this._onResize);
    window.addEventListener('keydown', this._onKey);
    this.resize();
    this._spawn();
    this._hud(true);
    this._setupDpad();
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this._loop); }
  }
  stop() { this.running = false; this.hud.controls(null); window.removeEventListener('resize', this._onResize); window.removeEventListener('keydown', this._onKey); }
  setPaused(p) { this.paused = p; if (!p) this.last = performance.now(); }

  _hud(force) {
    const goal = this.endless ? '' : ` / ${this.lv.goal}`;
    const pct = this.endless ? 0 : Math.min(100, (this.eaten / this.lv.goal) * 100);
    const t = Math.floor(this.time);
    if (!force && t === this._lastT && this.eaten === this._lastE) return;
    this._lastT = t; this._lastE = this.eaten;
    this.hud.setScore(`<div class="sp on"><b>${this.endless ? 'Mode infini' : `Niveau ${this.opts.level + 1} · ${this.lv.name}`}</b>
      <div class="balls"><span class="pts">${this.eaten}${goal}</span><span class="muted">billes</span>
      ${this.endless ? '' : `<span class="prog"><i style="width:${pct}%"></i></span>`}</div></div>
      <div class="sp narrow"><b>Temps</b><div class="balls"><span class="pts">${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}</span></div></div>`);
    this.hud.setChip(`Vitesse ${this.speed.toFixed(this.speed % 1 ? 1 : 0)}`);
  }

  // ---------- Contrôles : glisser dans une direction (sans lever le doigt pour enchaîner) ----------
  _bindTouch() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => { this.sw = { x: e.clientX, y: e.clientY, id: e.pointerId }; c.setPointerCapture?.(e.pointerId); });
    c.addEventListener('pointermove', (e) => {
      const s = this.sw; if (!s || s.id !== e.pointerId) return;
      const dx = e.clientX - s.x, dy = e.clientY - s.y;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 22) return;
      this._push(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
      s.x = e.clientX; s.y = e.clientY;
    });
    const end = () => { this.sw = null; };
    c.addEventListener('pointerup', end); c.addEventListener('pointercancel', end);
  }

  _push(d) {
    if (!this.running || this.paused || this.phase === 'dead' || this.phase === 'won') return;
    const last = this.queue.length ? this.queue[this.queue.length - 1] : this.dir;
    if (d === last) return;
    const [ax, ay] = DIRS[d], [bx, by] = DIRS[last];
    if (ax === -bx && ay === -by) return;          // demi-tour interdit
    if (this.queue.length < 3) { this.queue.push(d); fx.tick(); }
  }

  // croix directionnelle façon manette
  _setupDpad() {
    if (!this.opts.dpad) { this.hud.controls(null); return; }
    const el = this.hud.controls(`<div class="dpad">
      <button data-d="up" aria-label="Haut">▲</button><button data-d="left" aria-label="Gauche">◀</button>
      <span class="dpad-center"></span><button data-d="right" aria-label="Droite">▶</button><button data-d="down" aria-label="Bas">▼</button></div>`);
    el.onclick = null;
    el.querySelectorAll('[data-d]').forEach((b) => {
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); b.classList.add('on'); this._push(b.dataset.d); });
      const off = () => b.classList.remove('on');
      b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off);
    });
  }

  // ---------- Logique ----------
  _free(x, y) {
    if (this.blocked.has(x + ',' + y)) return false;
    if (this.body.some((s) => s.x === x && s.y === y)) return false;
    if (this.food && this.food.x === x && this.food.y === y) return false;
    if (this.gold && this.gold.x === x && this.gold.y === y) return false;
    return true;
  }

  _spawn(gold) {
    const h = this.body[0];
    const cells = [];
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) if (this._free(x, y) && Math.abs(x - h.x) + Math.abs(y - h.y) > 2) cells.push({ x, y });
    if (!cells.length) return null;
    const p = cells[Math.floor(Math.random() * cells.length)];
    if (gold) return (this.gold = { ...p, t: 7, born: this.t });
    return (this.food = { ...p, c: COLORS[Math.floor(Math.random() * COLORS.length)], born: this.t });
  }

  _step() {
    if (this.queue.length) this.dir = this.queue.shift();
    const [dx, dy] = DIRS[this.dir];
    const h = this.body[0], nx = h.x + dx, ny = h.y + dy;
    const eatF = this.food && this.food.x === nx && this.food.y === ny;
    const eatG = this.gold && this.gold.x === nx && this.gold.y === ny;
    const grow = eatF || eatG ? (eatG ? 3 : 1) : 0;
    this.pendingGrow = (this.pendingGrow || 0) + grow;
    // le bout de la queue libère sa case ce tour-ci sauf si on grandit
    const tail = this.body[this.body.length - 1];
    const hitsSelf = this.body.some((s, i) => s.x === nx && s.y === ny && !(i === this.body.length - 1 && !this.pendingGrow));
    if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || this.blocked.has(nx + ',' + ny) || hitsSelf) return this._die(nx, ny);

    this.prev = this.body.map((s) => ({ ...s }));
    this.body.unshift({ x: nx, y: ny });
    if (this.pendingGrow > 0) { this.pendingGrow--; this.grew = true; }
    else { this.body.pop(); this.grew = false; }
    if (eatF || eatG) {
      const color = eatG ? '#ffd34d' : this.food.c;
      this.colors.splice(1, 0, ...Array(grow).fill(color));
      this._eat(nx, ny, color, eatG);
      if (eatF) { this.food = null; this._spawn(); }
      if (eatG) this.gold = null;
    }
    void tail;
  }

  _eat(x, y, color, gold) {
    this.eaten += gold ? 3 : 1; this.score += gold ? 3 : 1;
    this.sinceGold++;
    gold ? fx.metal(0.6) : fx.ballClick(0.9);
    fx.tap();
    const cx = this.ox + (x + 0.5) * this.cell, cy = this.oy + (y + 0.5) * this.cell;
    for (let i = 0; i < (gold ? 26 : 14); i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 160;
      this.particles.push({ x: cx, y: cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5, c: color, s: 2 + Math.random() * 2 });
    }
    this.particles.push({ x: cx, y: cy, vx: 0, vy: 0, life: 0.45, c: color, ring: true });
    this.texts.push({ x: cx, y: cy - 10, s: gold ? '+3' : '+1', life: 0.9, c: gold ? '#ffd34d' : '#fff' });
    if (this.endless) this.speed = Math.min(15, 6 + this.score * 0.22) * this.mul;
    if (!gold && !this.gold && this.sinceGold >= 6 && Math.random() < 0.5) { this.sinceGold = 0; this._spawn(true); }
    this._hud(true);
    if (!this.endless && this.eaten >= this.lv.goal) this._win();
  }

  _die(nx, ny) {
    this.phase = 'dead'; this.deadT = 0;
    fx.slam(); fx.lose();
    this.shake = 0.5; this.flash = 0.5;
    // les billes du serpent s'éparpillent
    this.scatter = this.body.map((s, i) => {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 260;
      return { x: this.ox + (s.x + 0.5) * this.cell, y: this.oy + (s.y + 0.5) * this.cell, vx: Math.cos(a) * v, vy: Math.sin(a) * v, c: this._col(i), r: this.cell * (i ? 0.38 : 0.46) };
    });
    void nx; void ny;
    setTimeout(() => {
      if (!this.running) return;
      if (this.endless) this.hud.end({ won: false, endless: true, score: this.score, title: 'Le serpent est tombé !', text: `Tu as mangé ${this.score} bille${this.score > 1 ? 's' : ''}.` });
      else this.hud.end({ won: false, title: 'Aïe !', text: `Le serpent s'est cogné. ${this.eaten} / ${this.lv.goal} billes mangées.` });
    }, 1300);
  }

  _win() {
    this.phase = 'won';
    fx.win();
    // plus lent = plus de temps accordé pour les étoiles
    const par = Math.round(parTime(this.lv) / this.mul);
    const stars = this.time <= par ? 3 : this.time <= par * 1.5 ? 2 : 1;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 260;
      this.particles.push({ x: this.vw / 2, y: this.vh / 2, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2, c: COLORS[i % COLORS.length], s: 3 });
    }
    setTimeout(() => this.running && this.hud.end({ won: true, stars, time: this.time, title: stars === 3 ? 'Parfait !' : 'Niveau réussi !', text: `${this.lv.goal} billes en ${this.time.toFixed(1)} s (objectif 3 étoiles : ${par} s).` }), 1200);
  }

  // ---------- Boucle ----------
  _loop(now) {
    if (!this.running) return;
    // on reprogramme d'abord l'image suivante : une erreur ponctuelle ne doit jamais figer le jeu (écran noir)
    requestAnimationFrame(this._loop);
    const dt = Math.min(0.05, Math.max(0, (now - this.last) / 1000)); this.last = now;
    try {
      if (!this.paused) this._tick(dt);
      this._render();
    } catch (e) {
      console.error('serpent', e);
      this.board = null;
      if ((this._errs = (this._errs || 0) + 1) % 30 === 1) this.resize();
    }
  }

  _tick(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt * 1.5);
    if (this.phase === 'count') {
      const before = Math.ceil(2.4 - this.countT);
      this.countT += dt;
      if (Math.ceil(2.4 - this.countT) !== before && before > 0) fx.gauge();
      if (this.countT >= 2.4) { this.phase = 'play'; fx.whoosh(0.2); }
    } else if (this.phase === 'play') {
      this.time += dt;
      this.k += dt * this.speed;
      while (this.k >= 1 && this.phase === 'play') { this.k -= 1; this._step(); }
      if (this.gold) { this.gold.t -= dt; if (this.gold.t <= 0) this.gold = null; }
      this._hud();
    } else if (this.phase === 'dead') {
      for (const s of this.scatter) { s.x += s.vx * dt; s.y += s.vy * dt; s.vx *= 0.95; s.vy *= 0.95; }
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.93; p.vy *= 0.93; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { this.texts[i].life -= dt; this.texts[i].y -= 30 * dt; if (this.texts[i].life <= 0) this.texts.splice(i, 1); }
  }

  // ---------- Rendu ----------
  _boardCanvas() {
    const c = document.createElement('canvas'), d = this.dpr;
    const F = 12;
    c.width = Math.round((this.bw + F * 2) * d); c.height = Math.round((this.bh + F * 2) * d);
    const g = c.getContext('2d'); g.scale(d, d);
    // cadre
    const wood = g.createLinearGradient(0, 0, this.bw + F * 2, this.bh + F * 2);
    wood.addColorStop(0, '#8a5a2b'); wood.addColorStop(0.5, '#b07a45'); wood.addColorStop(1, '#6b4420');
    g.fillStyle = wood; g.beginPath(); g.roundRect(0, 0, this.bw + F * 2, this.bh + F * 2, 16); g.fill();
    g.strokeStyle = 'rgba(255,230,180,0.35)'; g.lineWidth = 2; g.beginPath(); g.roundRect(2, 2, this.bw + F * 2 - 4, this.bh + F * 2 - 4, 14); g.stroke();
    // damier
    g.save(); g.translate(F, F);
    g.beginPath(); g.roundRect(0, 0, this.bw, this.bh, 6); g.clip();
    for (let x = 0; x < COLS; x++) for (let y = 0; y < ROWS; y++) {
      g.fillStyle = (x + y) % 2 ? '#2e6b3c' : '#337543';
      g.fillRect(x * this.cell, y * this.cell, this.cell, this.cell);
    }
    const sh = g.createLinearGradient(0, 0, 0, 14);
    sh.addColorStop(0, 'rgba(0,0,0,0.35)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = sh; g.fillRect(0, 0, this.bw, 14);
    // murs
    const cs = this.cell;
    for (const w of this.lv.walls) {
      const x = w.x * cs, y = w.y * cs, ww = w.w * cs, hh = w.h * cs;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 3, y + 4, ww, hh);
      const st = g.createLinearGradient(x, y, x + ww, y + hh);
      st.addColorStop(0, '#a7adb5'); st.addColorStop(1, '#6b737d');
      g.fillStyle = st; g.beginPath(); g.roundRect(x + 1, y + 1, ww - 2, hh - 2, 4); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(x + 2, y + 2, ww - 4, 3);
      g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1;
      for (let i = 1; i < w.w; i++) { g.beginPath(); g.moveTo(x + i * cs, y + 2); g.lineTo(x + i * cs, y + hh - 2); g.stroke(); }
      for (let j = 1; j < w.h; j++) { g.beginPath(); g.moveTo(x + 2, y + j * cs); g.lineTo(x + ww - 2, y + j * cs); g.stroke(); }
    }
    g.restore();
    return c;
  }

  _marble(g, x, y, r, color, swirl = 0) {
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.ellipse(x + r * 0.2, y + r * 0.35, r, r * 0.85, 0, 0, Math.PI * 2); g.fill();
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.25, color); grd.addColorStop(1, shade(color, -0.35));
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = r * 0.18;
    g.beginPath(); g.arc(x, y, r * 0.5, swirl, swirl + 2.2); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.85)'; g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.42, r * 0.26, r * 0.16, -0.7, 0, Math.PI * 2); g.fill();
  }

  _render() {
    const g = this.ctx, dpr = this.dpr, cs = this.cell;
    if (!(cs > 0)) {
      // pas encore de taille : fond sombre plutôt que noir, et on retente la mise en page
      g.setTransform(1, 0, 0, 1, 0, 0); g.fillStyle = '#0d2016'; g.fillRect(0, 0, this.canvas.width, this.canvas.height);
      if (!this._retry) { this._retry = true; requestAnimationFrame(() => { this._retry = false; this.running && this.resize(); }); }
      return;
    }
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = g.createRadialGradient(this.vw / 2, this.vh / 2, 40, this.vw / 2, this.vh / 2, this.vh * 0.8);
    bg.addColorStop(0, '#1a3a26'); bg.addColorStop(1, '#06120b');
    g.fillStyle = bg; g.fillRect(0, 0, this.vw, this.vh);
    if (this.shake > 0) g.translate((Math.random() - 0.5) * 16 * this.shake, (Math.random() - 0.5) * 16 * this.shake);
    if (!this.board) this.board = this._boardCanvas();
    g.drawImage(this.board, this.ox - 12, this.oy - 12, this.bw + 24, this.bh + 24);

    const P = (x, y) => [this.ox + (x + 0.5) * cs, this.oy + (y + 0.5) * cs];
    // billes à manger
    if (this.food) {
      const [x, y] = P(this.food.x, this.food.y), pop = Math.min(1, (this.t - this.food.born) * 5);
      const b = Math.sin(this.t * 5) * cs * 0.04;
      this._marble(g, x, y + b, cs * 0.34 * pop * (1 + 0.15 * (1 - pop)), this.food.c, this.t * 2);
    }
    if (this.gold) {
      const [x, y] = P(this.gold.x, this.gold.y), pulse = (Math.sin(this.t * 8) + 1) / 2;
      g.fillStyle = `rgba(255,211,77,${0.2 + pulse * 0.25})`; g.beginPath(); g.arc(x, y, cs * 0.62, 0, Math.PI * 2); g.fill();
      this._marble(g, x, y, cs * 0.42, '#ffcc33', -this.t * 3);
      g.strokeStyle = '#ffd34d'; g.lineWidth = 2.5;
      g.beginPath(); g.arc(x, y, cs * 0.55, -Math.PI / 2, -Math.PI / 2 + (this.gold.t / 7) * Math.PI * 2); g.stroke();
    }

    // serpent (interpolé entre deux cases pour un mouvement fluide)
    if (this.phase !== 'dead') {
      const k = this.phase === 'play' ? Math.min(1, this.k) : 1;
      const n = this.body.length, L = this.prev.length;
      const pos = this.body.map((s, i) => {
        const from = this.phase === 'play' ? this.prev[Math.min(i, L - 1)] : s;
        const fx_ = i === 0 && this.phase === 'play' ? this.prev[0] : from;
        return P(fx_.x + (s.x - fx_.x) * k, fx_.y + (s.y - fx_.y) * k);
      });
      for (let i = n - 1; i >= 1; i--) {
        const r = cs * (0.4 - 0.12 * (i / Math.max(1, n - 1)));
        this._marble(g, pos[i][0], pos[i][1], r, this._col(i), i * 0.7);
      }
      this._head(g, pos[0][0], pos[0][1]);
    } else {
      for (const s of this.scatter) this._marble(g, s.x, s.y, s.r, s.c);
    }

    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life * 2.5);
      if (p.ring) { g.strokeStyle = p.c; g.lineWidth = 3; g.beginPath(); g.arc(p.x, p.y, (0.45 - p.life) * cs * 3 + cs * 0.3, 0, Math.PI * 2); g.stroke(); }
      else { g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, p.s, 0, Math.PI * 2); g.fill(); }
    }
    g.globalAlpha = 1;
    g.font = '900 18px system-ui'; g.textAlign = 'center';
    for (const t of this.texts) { g.globalAlpha = Math.min(1, t.life * 2); g.fillStyle = t.c; g.fillText(t.s, t.x, t.y); }
    g.globalAlpha = 1;
    if (this.flash > 0) { g.fillStyle = `rgba(255,40,40,${this.flash * 0.5})`; g.fillRect(-20, -20, this.vw + 40, this.vh + 40); }
    if (this.phase === 'count') {
      const n = Math.ceil(2.4 - this.countT), f = (2.4 - this.countT) % 0.8 / 0.8;
      g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(this.ox, this.oy, this.bw, this.bh);
      g.save(); g.translate(this.vw / 2, this.oy + this.bh * 0.45); g.scale(1 + f * 0.6, 1 + f * 0.6);
      g.globalAlpha = 1 - f * 0.3; g.fillStyle = '#ffd34d'; g.font = '900 72px system-ui'; g.textBaseline = 'middle';
      g.fillText(n > 0 ? String(n) : 'GO', 0, 0); g.restore(); g.globalAlpha = 1;
      g.fillStyle = '#fff'; g.font = '700 15px system-ui';
      g.fillText(this.opts.dpad ? 'Utilise la croix pour tourner' : 'Glisse le doigt pour tourner', this.vw / 2, this.oy + this.bh * 0.62);
    }
  }

  _col(i) { return this.colors[Math.min(i, this.colors.length - 1)]; }

  _head(g, x, y) {
    const cs = this.cell, r = cs * 0.48, [dx, dy] = DIRS[this.dir];
    const color = this.colors[0];
    // langue
    if (this.phase === 'play' && Math.sin(this.t * 3) > 0.7) {
      g.strokeStyle = '#ff3355'; g.lineWidth = 2; g.lineCap = 'round';
      const tx = x + dx * r * 1.6, ty = y + dy * r * 1.6;
      g.beginPath(); g.moveTo(x + dx * r, y + dy * r); g.lineTo(tx, ty);
      g.moveTo(tx, ty); g.lineTo(tx + dx * 4 - dy * 4, ty + dy * 4 + dx * 4);
      g.moveTo(tx, ty); g.lineTo(tx + dx * 4 + dy * 4, ty + dy * 4 - dx * 4); g.stroke();
    }
    this._marble(g, x, y, r, color);
    // yeux
    const blink = (this.t % 3.2) < 0.12;
    for (const s of [-1, 1]) {
      const ex = x + dx * r * 0.25 - dy * r * 0.42 * s, ey = y + dy * r * 0.25 + dx * r * 0.42 * s;
      g.fillStyle = '#fff'; g.beginPath(); g.ellipse(ex, ey, r * 0.27, blink ? r * 0.05 : r * 0.27, 0, 0, Math.PI * 2); g.fill();
      if (!blink) { g.fillStyle = '#111'; g.beginPath(); g.arc(ex + dx * r * 0.1, ey + dy * r * 0.1, r * 0.13, 0, Math.PI * 2); g.fill(); }
    }
  }
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
