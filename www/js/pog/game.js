// Jeu de pogs : on frappe la pile avec le kini, les pogs qui retombent face visible sont gagnés.
import { fx } from '../fx.js';

const PER_PLAYER = 5;
const TILT = 0.55;            // écrasement vertical (vue en perspective)
const SWEET = [0.78, 0.92];   // zone de puissance idéale
const AI = { facile: { aim: 0.55, pow: 0.22 }, moyen: { aim: 0.32, pow: 0.12 }, difficile: { aim: 0.16, pow: 0.06 } };
const PALETTES = [
  ['#ff006e', '#ffbe0b', '#3a86ff'], ['#06d6a0', '#118ab2', '#ffd166'], ['#8338ec', '#ff006e', '#fbf8cc'],
  ['#fb5607', '#ffbe0b', '#1d3557'], ['#e63946', '#f1faee', '#457b9d'], ['#00b4d8', '#90e0ef', '#03045e'],
  ['#2b2d42', '#ef233c', '#edf2f4'], ['#70e000', '#38b000', '#ffff3f'], ['#ff70a6', '#ff9770', '#ffd670'],
];
const MOTIFS = ['spiral', 'star', 'yin', 'bolt', 'rings', 'check', 'eye', 'flame', 'num'];

function rnd(a, b) { return a + Math.random() * (b - a); }

// ---------- Illustrations des pogs ----------
function drawFace(id, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), h = size / 2;
  const pal = PALETTES[id % PALETTES.length], motif = MOTIFS[Math.floor(id / PALETTES.length) % MOTIFS.length];
  g.save(); g.beginPath(); g.arc(h, h, h, 0, Math.PI * 2); g.clip();
  const bg = g.createRadialGradient(h * 0.7, h * 0.6, 2, h, h, h);
  bg.addColorStop(0, pal[2]); bg.addColorStop(1, pal[0]);
  g.fillStyle = bg; g.fillRect(0, 0, size, size);
  g.translate(h, h);
  g.fillStyle = pal[1]; g.strokeStyle = pal[1]; g.lineWidth = size * 0.06; g.lineCap = 'round';
  if (motif === 'spiral') { g.beginPath(); for (let a = 0; a < 18; a += 0.1) { const r = a * size * 0.022; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.stroke(); }
  else if (motif === 'star') { g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? h * 0.32 : h * 0.75, a = (i * Math.PI) / 5 - Math.PI / 2; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); }
  else if (motif === 'yin') {
    g.beginPath(); g.arc(0, 0, h * 0.7, -Math.PI / 2, Math.PI / 2); g.arc(0, h * 0.35, h * 0.35, Math.PI / 2, -Math.PI / 2, true); g.arc(0, -h * 0.35, h * 0.35, Math.PI / 2, -Math.PI / 2); g.fill();
    g.fillStyle = pal[0]; g.beginPath(); g.arc(0, h * 0.35, h * 0.1, 0, Math.PI * 2); g.fill();
  }
  else if (motif === 'bolt') { g.beginPath(); g.moveTo(h * 0.15, -h * 0.8); g.lineTo(-h * 0.4, h * 0.1); g.lineTo(0, h * 0.1); g.lineTo(-h * 0.15, h * 0.8); g.lineTo(h * 0.45, -h * 0.15); g.lineTo(h * 0.05, -h * 0.15); g.closePath(); g.fill(); }
  else if (motif === 'rings') { for (let r = h * 0.85; r > 4; r -= h * 0.22) { g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); } }
  else if (motif === 'check') { const k = size / 8; for (let i = -4; i < 4; i++) for (let j = -4; j < 4; j++) if ((i + j) & 1) g.fillRect(i * k, j * k, k, k); }
  else if (motif === 'eye') { g.beginPath(); g.ellipse(0, 0, h * 0.8, h * 0.42, 0, 0, Math.PI * 2); g.fill(); g.fillStyle = pal[0]; g.beginPath(); g.arc(0, 0, h * 0.3, 0, Math.PI * 2); g.fill(); g.fillStyle = '#111'; g.beginPath(); g.arc(0, 0, h * 0.13, 0, Math.PI * 2); g.fill(); }
  else if (motif === 'flame') { for (let i = 0; i < 3; i++) { g.globalAlpha = 1 - i * 0.25; g.beginPath(); g.moveTo(0, h * 0.75 - i * 6); g.bezierCurveTo(h * 0.8 - i * 12, h * 0.2, -h * 0.1, -h * 0.1, h * 0.05, -h * 0.85 + i * 18); g.bezierCurveTo(-h * 0.6 + i * 10, -h * 0.1, -h * 0.7 + i * 10, h * 0.5, 0, h * 0.75 - i * 6); g.fill(); g.fillStyle = i ? pal[2] : pal[1]; } g.globalAlpha = 1; }
  else { g.font = `900 ${size * 0.55}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(String((id % 99) + 1), 0, size * 0.03); }
  g.restore();
  // brillance + bord
  const sh = g.createLinearGradient(0, 0, size, size);
  sh.addColorStop(0, 'rgba(255,255,255,0.35)'); sh.addColorStop(0.45, 'rgba(255,255,255,0)');
  g.fillStyle = sh; g.beginPath(); g.arc(h, h, h, 0, Math.PI * 2); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = size * 0.04; g.beginPath(); g.arc(h, h, h - size * 0.03, 0, Math.PI * 2); g.stroke();
  return c;
}

function drawBack(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), h = size / 2;
  const bg = g.createRadialGradient(h * 0.7, h * 0.6, 2, h, h, h);
  bg.addColorStop(0, '#5b2a86'); bg.addColorStop(1, '#2a0f45');
  g.fillStyle = bg; g.beginPath(); g.arc(h, h, h, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#ffd34d'; g.lineWidth = size * 0.05; g.beginPath(); g.arc(h, h, h * 0.8, 0, Math.PI * 2); g.stroke();
  g.fillStyle = '#ffd34d'; g.font = `900 ${size * 0.26}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText('POG', h, h + size * 0.01);
  g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = size * 0.035; g.beginPath(); g.arc(h, h, h - size * 0.025, 0, Math.PI * 2); g.stroke();
  return c;
}

function drawSlammer(size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), h = size / 2;
  const bg = g.createRadialGradient(h * 0.6, h * 0.5, 2, h, h, h);
  bg.addColorStop(0, '#ffffff'); bg.addColorStop(0.4, '#c5ccd6'); bg.addColorStop(1, '#5a6270');
  g.fillStyle = bg; g.beginPath(); g.arc(h, h, h, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#e63946';
  g.beginPath(); for (let i = 0; i < 10; i++) { const r = i % 2 ? h * 0.25 : h * 0.6, a = (i * Math.PI) / 5 - Math.PI / 2; g.lineTo(h + Math.cos(a) * r, h + Math.sin(a) * r); } g.fill();
  g.strokeStyle = '#333'; g.lineWidth = size * 0.05; g.beginPath(); g.arc(h, h, h - size * 0.03, 0, Math.PI * 2); g.stroke();
  return c;
}

export class Pog {
  constructor(canvas, hud) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud;
    this.running = false; this.paused = false;
    this._loop = this._loop.bind(this);
    this._onResize = () => this.resize();
    canvas.addEventListener('pointerdown', () => this._tap());
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr; this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.vw * dpr); this.canvas.height = Math.round(this.vh * dpr);
    this.R = Math.min(this.vw * 0.2, this.vh * 0.11);
    this.cx = this.vw / 2; this.cy = this.vh * 0.52;
    const tex = Math.round(this.R * 2 * dpr);
    if (!this.faces || this.texSize !== tex) {
      this.texSize = tex;
      this.backTex = drawBack(tex);
      this.slamTex = drawSlammer(Math.round(tex * 1.05));
      this.faces = {};
    }
  }
  face(id) { if (!this.faces[id]) this.faces[id] = drawFace(id, this.texSize); return this.faces[id]; }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    window.addEventListener('resize', this._onResize);
    this.resize();
    const ids = []; while (ids.length < PER_PLAYER * 2) { const id = Math.floor(Math.random() * PALETTES.length * MOTIFS.length); if (!ids.includes(id)) ids.push(id); }
    // pile : pogs des deux joueurs en alternance, face cachée
    this.stack = ids.map((id, i) => ({ id, owner: i % 2, rot: rnd(0, Math.PI * 2) }));
    this.won = [[], []];
    this.flying = [];
    this.particles = [];
    this.turn = 0; this.shake = 0; this.flash = 0;
    this.t = 0; this.paused = false;
    this._startTurn();
    if (!this.running) { this.running = true; this.last = performance.now(); requestAnimationFrame(this._loop); }
  }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); }
  setPaused(p) { this.paused = p; if (!p) this.last = performance.now(); }
  isAI() { return this.opts.mode === 'ai' && this.turn === 1; }

  _hudUpdate() {
    const p = (i) => `<div class="sp ${i === this.turn ? 'on' : ''}"><b>${this.names[i]}</b><div class="balls"><span class="pts">${this.won[i].length}</span><span class="muted">pog${this.won[i].length > 1 ? 's' : ''}</span></div></div>`;
    this.hud.setScore(p(0) + p(1));
    this.hud.setChip(`Pile : ${this.stack.length}`);
  }

  _startTurn() {
    this.phase = 'aim';
    this.aimT = rnd(0, 10);
    this.aimSpeed = 1;
    this.powT = 0;
    this._hudUpdate();
    this.hud.toast(`À ${this.names[this.turn]} de frapper !`, 1200);
    if (this.isAI()) setTimeout(() => this._aiPlay(), 1100);
  }

  _aimPos(t) { return { x: Math.sin(t * 1.9) * 0.95, y: Math.sin(t * 2.7 + 1.3) * 0.95 }; }
  _powVal(t) { const x = (t * 0.9) % 2; return x < 1 ? x : 2 - x; }

  _tap() {
    if (!this.running || this.paused || this.isAI()) return;
    if (this.phase === 'aim') { this.aimLock = this._aimPos(this.aimT); this.phase = 'power'; this.powT = 0; fx.gauge(); }
    else if (this.phase === 'power') { this._slam(this.aimLock, this._powVal(this.powT)); }
  }

  _aiPlay() {
    if (!this.running) return;
    if (this.paused) return setTimeout(() => this._aiPlay(), 300);
    const lv = AI[this.opts.level];
    const a = rnd(0, Math.PI * 2), d = Math.min(0.95, Math.abs((Math.random() + Math.random() - 1) * lv.aim * 2));
    this.aimLock = { x: Math.cos(a) * d, y: Math.sin(a) * d };
    this.phase = 'power';
    const target = (SWEET[0] + SWEET[1]) / 2 + (Math.random() * 2 - 1) * lv.pow * 2;
    setTimeout(() => this._slam(this.aimLock, Math.max(0.1, Math.min(1, target))), 700);
  }

  _slam(aim, power) {
    this.phase = 'slam';
    this.slam = { t: 0, aim, power };
    fx.whoosh(0.25);
  }

  _impact() {
    const { aim, power } = this.slam;
    const aimErr = Math.min(1, Math.hypot(aim.x, aim.y));
    const pq = power >= SWEET[0] && power <= SWEET[1] ? 1 : Math.max(0, 1 - Math.min(Math.abs(power - SWEET[0]), Math.abs(power - SWEET[1])) / 0.4);
    const q = Math.max(0, (1 - aimErr * 0.9) * (0.35 + 0.65 * pq));
    fx.slam();
    this.shake = 0.25 + power * 0.35; this.flash = 0.6;
    for (let i = 0; i < 30; i++) {
      const a = Math.random() * Math.PI * 2, v = rnd(80, 320) * (0.5 + power);
      this.particles.push({ x: this.cx, y: this.cy, vx: Math.cos(a) * v, vy: Math.sin(a) * v * TILT, life: rnd(0.3, 0.6), c: i % 3 ? '#fff' : '#ffd34d' });
    }
    // combien de pogs décollent : dépend de la puissance
    const n = this.stack.length;
    const movers = power < 0.25 ? Math.ceil(n * 0.3) : power < 0.5 ? Math.ceil(n * 0.7) : n;
    const out = this.stack.splice(n - movers, movers);
    this.flying = out.map((p, i) => {
      const layer = i / Math.max(1, out.length - 1); // 0 = bas, 1 = haut
      const prob = 0.08 + 0.72 * q * (0.6 + 0.4 * layer);
      const up = Math.random() < prob;
      const halfTurns = (up ? 1 : 2) + 2 * Math.floor(rnd(0, 2 + power * 3));
      const a = Math.random() * Math.PI * 2, dist = rnd(0.6, 2.1) * this.R * (0.6 + power * 0.8);
      return {
        ...p, up, x0: this.cx, y0: this.cy - (n - movers + i) * 4, x1: this.cx + Math.cos(a) * dist, y1: this.cy + Math.sin(a) * dist * TILT + this.R * 0.1,
        t: 0, T: rnd(0.75, 1.15), h: rnd(60, 160) * (0.5 + power), halfTurns, rot0: p.rot, spin: rnd(-6, 6),
      };
    });
    this.landed = 0;
  }

  _settle() {
    const ups = this.flying.filter((p) => p.up), downs = this.flying.filter((p) => !p.up);
    this.phase = 'collect'; this.collectT = 0;
    this.collect = { ups, downs };
    if (ups.length) { fx.win(); this.hud.toast(`${this.names[this.turn]} gagne ${ups.length} pog${ups.length > 1 ? 's' : ''} !`, 1500); }
    else { fx.lose(); this.hud.toast('Aucun pog retourné…', 1300); }
  }

  _finishCollect() {
    const { ups, downs } = this.collect;
    for (const p of ups) this.won[this.turn].push(p.id);
    // les pogs restés face cachée retournent sur la pile
    for (const p of downs) this.stack.push({ id: p.id, owner: p.owner, rot: p.rot });
    this.flying = [];
    if (!this.stack.length) return this._end();
    this.turn = 1 - this.turn;
    this._startTurn();
  }

  _end() {
    this.phase = 'over';
    this._hudUpdate();
    const [a, b] = [this.won[0].length, this.won[1].length];
    const w = a === b ? null : a > b ? 0 : 1;
    setTimeout(() => this.hud.end({
      won: this.opts.mode === 'ai' ? w === 0 : true,
      title: w == null ? 'Égalité !' : this.opts.mode === 'ai' ? (w === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
      text: `${this.names[0]} : ${a} pogs · ${this.names[1]} : ${b} pogs`, winner: w, pogs: a,
    }), 600);
  }

  // ---------- Boucle ----------
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) this._tick(dt);
    this._render();
    requestAnimationFrame(this._loop);
  }

  _tick(dt) {
    this.t += dt;
    this.shake = Math.max(0, this.shake - dt); this.flash = Math.max(0, this.flash - dt * 2);
    if (this.phase === 'aim') this.aimT += dt;
    if (this.phase === 'power') {
      const before = this._powVal(this.powT);
      this.powT += dt;
      if ((before < SWEET[0]) !== (this._powVal(this.powT) < SWEET[0])) fx.tick();
    }
    if (this.phase === 'slam') {
      this.slam.t += dt;
      if (this.slam.t >= 0.32) { this.phase = 'fly'; this._impact(); }
    }
    if (this.phase === 'fly') {
      let all = true;
      for (const p of this.flying) {
        if (p.t < p.T) { p.t = Math.min(p.T, p.t + dt); all = false; if (p.t >= p.T) { fx.flip(this.landed++ % 6); } }
      }
      if (all) this._settle();
    }
    if (this.phase === 'collect') {
      this.collectT += dt;
      if (this.collectT > 1.4) this._finishCollect();
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.92; p.vy *= 0.92; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  // ---------- Rendu ----------
  _pog(g, x, y, rot, flipA, id, scale = 1) {
    // flipA : angle de retournement (0 = face visible, π = dos)
    const R = this.R * scale, c = Math.cos(flipA);
    const sy = TILT * Math.max(0.04, Math.abs(c));
    const tex = c >= 0 ? this.face(id) : this.backTex;
    // tranche
    g.fillStyle = '#d8d2c4';
    g.beginPath(); g.ellipse(x, y + 3, R, R * sy, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(x, y); g.scale(1, sy); g.rotate(rot);
    g.drawImage(tex, -R, -R, R * 2, R * 2);
    g.restore();
  }

  _render() {
    const g = this.ctx, dpr = this.dpr;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const sx = this.shake > 0 ? (Math.random() - 0.5) * 18 * this.shake : 0, sy = this.shake > 0 ? (Math.random() - 0.5) * 18 * this.shake : 0;
    g.translate(sx, sy);
    // fond : tapis de jeu sous une lampe
    const bg = g.createRadialGradient(this.cx, this.cy, 20, this.cx, this.cy, Math.max(this.vw, this.vh) * 0.75);
    bg.addColorStop(0, '#3b1f6b'); bg.addColorStop(0.55, '#1c0f36'); bg.addColorStop(1, '#09050f');
    g.fillStyle = bg; g.fillRect(-20, -20, this.vw + 40, this.vh + 40);
    g.strokeStyle = 'rgba(255,211,77,0.12)'; g.lineWidth = 2;
    for (let i = 1; i <= 3; i++) { g.beginPath(); g.ellipse(this.cx, this.cy + this.R * 0.15, this.R * (1.3 + i * 0.7), this.R * (1.3 + i * 0.7) * TILT, 0, 0, Math.PI * 2); g.stroke(); }

    this._drawPiles(g);

    // pile
    const n = this.stack.length;
    g.fillStyle = 'rgba(0,0,0,0.45)';
    g.beginPath(); g.ellipse(this.cx + 6, this.cy + 10, this.R * 1.05, this.R * TILT * 1.05, 0, 0, Math.PI * 2); g.fill();
    for (let i = 0; i < n; i++) this._pog(g, this.cx, this.cy - i * 4, this.stack[i].rot, Math.PI, this.stack[i].id);

    // pogs en vol (et posés)
    const fl = [...this.flying].sort((a, b) => a.y1 - b.y1);
    for (const p of fl) {
      let x, y, flip, rot, sc = 1;
      if (this.phase === 'collect') {
        const k = Math.min(1, this.collectT / 1.1), e = k * k * (3 - 2 * k);
        const tx = p.up ? this.cx + (this.turn === 0 ? -1 : 1) * this.vw * 0.28 : this.cx;
        const ty = p.up ? (this.turn === 0 ? this.vh - 70 : 150) : this.cy - n * 4;
        x = p.x1 + (tx - p.x1) * e; y = p.y1 + (ty - p.y1) * e - Math.sin(e * Math.PI) * 60;
        flip = p.up ? 0 : Math.PI; rot = p.rot0 + p.spin; sc = p.up ? 1 - 0.45 * e : 1;
        if (p.up && k > 0.05 && k < 0.5) { g.fillStyle = 'rgba(255,211,77,0.35)'; g.beginPath(); g.ellipse(x, y, this.R * 1.25 * sc, this.R * TILT * 1.25 * sc, 0, 0, Math.PI * 2); g.fill(); }
      } else {
        const k = p.t / p.T, e = 1 - Math.pow(1 - k, 2);
        x = p.x0 + (p.x1 - p.x0) * e; y = p.y0 + (p.y1 - p.y0) * e;
        const hgt = 4 * p.h * k * (1 - k);
        g.fillStyle = `rgba(0,0,0,${0.35 * (1 - hgt / 250)})`;
        g.beginPath(); g.ellipse(x + 4, y + 6, this.R * 0.95, this.R * TILT * 0.9, 0, 0, Math.PI * 2); g.fill();
        y -= hgt;
        flip = Math.PI + p.halfTurns * Math.PI * (1 - Math.pow(1 - k, 3));
        rot = p.rot0 + p.spin * e;
        if (k >= 1 && p.up) { g.fillStyle = `rgba(255,211,77,${0.25 + 0.2 * Math.sin(this.t * 8)})`; g.beginPath(); g.ellipse(x, y, this.R * 1.2, this.R * TILT * 1.2, 0, 0, Math.PI * 2); g.fill(); }
      }
      this._pog(g, x, y, rot, flip, p.id, sc);
    }

    // kini
    if (this.phase === 'slam' || this.phase === 'aim' || this.phase === 'power') this._drawSlammer(g);
    for (const p of this.particles) { g.globalAlpha = Math.min(1, p.life * 3); g.fillStyle = p.c; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI * 2); g.fill(); }
    g.globalAlpha = 1;
    if (this.flash > 0) {
      g.fillStyle = `rgba(255,255,255,${this.flash * 0.5})`; g.fillRect(-20, -20, this.vw + 40, this.vh + 40);
      g.strokeStyle = `rgba(255,255,255,${this.flash})`; g.lineWidth = 4;
      const r = (0.6 - this.flash) * this.R * 6 + this.R;
      g.beginPath(); g.ellipse(this.cx, this.cy, r, r * TILT, 0, 0, Math.PI * 2); g.stroke();
    }
    if (this.phase === 'aim' || this.phase === 'power') this._drawControls(g);
  }

  _drawPiles(g) {
    for (const i of [0, 1]) {
      const x = this.cx + (i === 0 ? -1 : 1) * this.vw * 0.28, y = i === 0 ? this.vh - 70 : 150;
      const ids = this.won[i];
      for (let k = 0; k < ids.length; k++) this._pog(g, x, y - k * 3, k * 0.7, 0, ids[k], 0.55);
      g.fillStyle = 'rgba(255,255,255,0.75)'; g.font = '700 12px system-ui'; g.textAlign = 'center';
      g.fillText(this.names[i], x, i === 0 ? y + this.R * 0.55 * TILT + 22 : y + this.R * 0.55 * TILT + 22);
    }
  }

  _drawSlammer(g) {
    const R = this.R * 0.85;
    let x = this.cx, y, hgt;
    const top = this.cy - this.stack.length * 4;
    if (this.phase === 'slam') {
      const k = Math.min(1, this.slam.t / 0.32);
      x = this.cx + this.slam.aim.x * this.R; y = top + this.slam.aim.y * this.R * TILT;
      hgt = (1 - k * k) * this.vh * 0.45;
    } else {
      const a = this.phase === 'aim' ? this._aimPos(this.aimT) : this.aimLock;
      x = this.cx + a.x * this.R; y = top + a.y * this.R * TILT;
      hgt = this.R * 1.6 + Math.sin(this.t * 3) * 6;
    }
    g.fillStyle = 'rgba(0,0,0,0.35)';
    g.beginPath(); g.ellipse(x, y, R * (1 - hgt / this.vh * 0.5), R * TILT * (1 - hgt / this.vh * 0.5), 0, 0, Math.PI * 2); g.fill();
    // viseur
    if (this.phase !== 'slam') {
      g.strokeStyle = this.phase === 'power' ? '#7ee08a' : '#ffffff'; g.lineWidth = 2;
      g.beginPath(); g.ellipse(x, y, 10, 10 * TILT, 0, 0, Math.PI * 2); g.stroke();
      g.beginPath(); g.moveTo(x - 18, y); g.lineTo(x + 18, y); g.moveTo(x, y - 12); g.lineTo(x, y + 12); g.stroke();
    }
    const yy = y - hgt;
    g.fillStyle = '#3d4450'; g.beginPath(); g.ellipse(x, yy + 5, R, R * TILT, 0, 0, Math.PI * 2); g.fill();
    g.save(); g.translate(x, yy); g.scale(1, TILT); g.rotate(this.t * 0.8);
    g.drawImage(this.slamTex, -R, -R, R * 2, R * 2); g.restore();
  }

  _drawControls(g) {
    // jauge de puissance verticale
    const w = 30, h = Math.min(260, this.vh * 0.36), x = this.vw - w - 18, y = this.cy - h / 2;
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.roundRect(x - 6, y - 6, w + 12, h + 12, 14); g.fill();
    const grd = g.createLinearGradient(0, y + h, 0, y);
    grd.addColorStop(0, '#3a86ff'); grd.addColorStop(0.6, '#ffd34d'); grd.addColorStop(1, '#ff5a5a');
    g.fillStyle = grd; g.beginPath(); g.roundRect(x, y, w, h, 10); g.fill();
    g.fillStyle = 'rgba(126,224,138,0.9)'; g.fillRect(x - 4, y + h * (1 - SWEET[1]), w + 8, h * (SWEET[1] - SWEET[0]));
    if (this.phase === 'power') {
      const v = this._powVal(this.powT), cy = y + h * (1 - v);
      g.fillStyle = '#fff'; g.fillRect(x - 8, cy - 2, w + 16, 4);
      g.beginPath(); g.moveTo(x - 8, cy); g.lineTo(x - 18, cy - 7); g.lineTo(x - 18, cy + 7); g.fill();
    }
    if (!this.isAI()) {
      g.fillStyle = 'rgba(255,255,255,0.92)'; g.font = '800 15px system-ui'; g.textAlign = 'center';
      g.fillText(this.phase === 'aim' ? 'Touchez pour viser le centre de la pile' : 'Touchez dans la zone verte !', this.vw / 2, this.vh - 150);
    }
  }
}
