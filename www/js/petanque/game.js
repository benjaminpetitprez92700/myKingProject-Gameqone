// Pétanque en tête-à-tête (3 boules chacun), vue de dessus. Unités : centimètres.
import { fx } from '../fx.js';

const LANE_X = 200, LANE_END = 1500;
const BR = 3.8, CR = 1.6;                 // rayons boule / cochonnet
const MB = 0.7, MC = 0.02;                // masses
const DECEL = 170;                         // freinage sur le gravier (cm/s²)
const DT = 1 / 120;
const PER_TEAM = 3;
const VIEW_W = 165;                        // largeur visible (cm)

export const THROWS = {
  roulette: { name: 'Roulette', land: 0.3, T: 0.7, h: 35 },
  demi: { name: 'Demi-portée', land: 0.62, T: 1.0, h: 170 },
  plombee: { name: 'Plombée', land: 0.9, T: 1.35, h: 360 },
  tir: { name: 'Tir', land: 1.0, T: 0.75, h: 120, speed: 520 },
};
const AI = { facile: { err: 0.5, shoot: 0.15 }, moyen: { err: 0.27, shoot: 0.5 }, difficile: { err: 0.13, shoot: 0.8 } };

const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 0.75;

export class Petanque {
  constructor(canvas, hud) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud;
    this.running = false; this.paused = false;
    this._loop = this._loop.bind(this);
    this._onResize = () => this.resize();
    this._bind();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr; this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.vw * dpr); this.canvas.height = Math.round(this.vh * dpr);
    this.s = this.vw / VIEW_W;
    this.gravel = null;
  }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    this.target = opts.target || 13;
    this.score = [0, 0];
    this.starter = 0;
    this.particles = []; this.marks = [];
    window.addEventListener('resize', this._onResize);
    this.resize();
    this.cam = { x: 0, z: 800 };
    this._newMene();
    if (!this.running) { this.running = true; this.last = performance.now(); this.acc = 0; this.t = 0; requestAnimationFrame(this._loop); }
  }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); this.hud.controls(null); }
  setPaused(p) { this.paused = p; if (!p) this.last = performance.now(); }

  isAI(team) { return this.opts.mode === 'ai' && team === 1; }

  _newMene() {
    this.boules = []; this.marks = [];
    this.coch = null;
    this.left = [PER_TEAM, PER_TEAM];
    this.turn = this.starter;
    this.type = 'demi';
    this.aim = { x: 0, z: 800 };
    this.phase = 'aim-coch';
    this._hudUpdate();
    this.hud.toast(`${this.names[this.turn]} lance le cochonnet`, 1600);
    this._prompt();
  }

  // ---------- HUD ----------
  _hudUpdate() {
    const dots = (t) => Array.from({ length: PER_TEAM }, (_, i) => `<i class="mini-boule t${t} ${i < this.left[t] ? '' : 'used'}"></i>`).join('');
    const p = (t) => `<div class="sp ${t === this.turn ? 'on' : ''}"><b>${this.names[t]}</b><div class="balls"><span class="pts">${this.score[t]}</span>${dots(t)}</div></div>`;
    this.hud.setScore(p(0) + p(1));
    const pt = this._pointTeam();
    this.hud.setChip(pt == null ? `En ${this.target} points` : `Point : ${this.names[pt.team]}`);
  }

  _prompt() {
    if (this.isAI(this.turn)) { this.hud.controls(null); setTimeout(() => this._aiPlay(), 900); return; }
    const coch = this.phase === 'aim-coch';
    const types = coch ? [] : Object.entries(THROWS).filter(([k]) => k !== 'tir' || this.boules.some((b) => b.alive));
    const html = `<div class="throw-types">${types.map(([k, v]) => `<button data-t="${k}" class="${k === this.type ? 'sel' : ''}">${v.name}</button>`).join('')}</div>
      <button class="btn primary" data-go>${coch ? 'Lancer le cochonnet' : 'Lancer la boule'}</button>`;
    const el = this.hud.controls(html);
    el.onclick = (e) => {
      const t = e.target.closest('[data-t]');
      if (t) { this.type = t.dataset.t; el.querySelectorAll('[data-t]').forEach((b) => b.classList.toggle('sel', b === t)); fx.tap(); return; }
      if (e.target.closest('[data-go]')) { fx.tap(); this._startGauge(); }
    };
    if (!coch && this.type === 'tir' && !types.some(([k]) => k === 'tir')) this.type = 'demi';
  }

  // ---------- Entrées ----------
  _toWorld(sx, sy) { return { x: this.cam.x + (sx - this.vw / 2) / this.s, z: this.cam.z - (sy - this.vh * 0.5) / this.s }; }

  _bind() {
    const c = this.canvas;
    const move = (e) => {
      const r = c.getBoundingClientRect();
      const p = this._toWorld(e.clientX - r.left, e.clientY - r.top - 70);
      const coch = this.phase === 'aim-coch';
      this.aim.x = Math.max(-LANE_X + (coch ? 100 : 10), Math.min(LANE_X - (coch ? 100 : 10), p.x));
      this.aim.z = coch ? Math.max(600, Math.min(1000, p.z)) : Math.max(50, Math.min(LANE_END - 10, p.z));
    };
    c.addEventListener('pointerdown', (e) => {
      if (!this.running || this.paused) return;
      if (this.phase === 'gauge') { this._release(); return; }
      if ((this.phase === 'aim' || this.phase === 'aim-coch') && !this.isAI(this.turn)) {
        this.dragging = e.pointerId; c.setPointerCapture?.(e.pointerId); move(e);
      }
    });
    c.addEventListener('pointermove', (e) => { if (this.dragging === e.pointerId) move(e); });
    c.addEventListener('pointerup', (e) => { if (this.dragging === e.pointerId) this.dragging = null; });
  }

  _startGauge() {
    this.gauge = { t: Math.random() * 3, speed: 3.4 };
    this.prevPhase = this.phase;
    this.phase = 'gauge';
    this.hud.controls(null);
  }

  _release() {
    const e = Math.sin(this.gauge.t);
    fx.gauge();
    const q = Math.abs(e);
    this.hud.toast(q < 0.12 ? 'Parfait !' : q < 0.35 ? 'Bien' : q < 0.65 ? 'Moyen' : 'Raté…', 900);
    this._throw(this.prevPhase === 'aim-coch', this.aim.x, this.aim.z, this.prevPhase === 'aim-coch' ? 'demi' : this.type, e);
  }

  // ---------- Lancer ----------
  _throw(isCoch, tx, tz, type, err) {
    const T = THROWS[type];
    const dist = Math.hypot(tx, tz);
    // erreur de dosage dans l'axe + dispersion latérale
    const along = 1 + err * 0.11;
    const lat = gauss() * (0.012 + Math.abs(err) * 0.035) * dist;
    const ux = tx / dist, uz = tz / dist;
    const ex = tx * along + -uz * lat, ez = tz * along + ux * lat;
    const fd = Math.hypot(ex, ez), fx_ = ex / fd, fz_ = ez / fd;
    const landD = fd * T.land;
    const land = { x: fx_ * landD, z: fz_ * landD };
    const rollD = fd - landD;
    const v = T.speed || Math.sqrt(2 * DECEL * Math.max(0, rollD));
    const body = isCoch
      ? { kind: 'coch', x: 0, z: 0, vx: 0, vz: 0, r: CR, m: MC, alive: true }
      : { kind: 'boule', team: this.turn, x: 0, z: 0, vx: 0, vz: 0, r: BR, m: MB, alive: true, spin: Math.random() * 6 };
    body.flight = { from: { x: (Math.random() - 0.5) * 20, z: 0 }, to: land, T: T.T, h: T.h * (isCoch ? 0.7 : 1), t: 0, v, dir: { x: fx_, z: fz_ }, type };
    this.flying = body;
    if (isCoch) this.coch = body; else { this.boules.push(body); this.left[this.turn]--; }
    this.phase = 'flight';
    fx.whoosh(0.3);
    this._hudUpdate();
  }

  // ---------- Boucle ----------
  _loop(now) {
    if (!this.running) return;
    const frame = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) {
      this.acc += frame;
      while (this.acc >= DT) { this.acc -= DT; this._tick(DT); }
      this._camera(frame);
    }
    this._render();
    requestAnimationFrame(this._loop);
  }

  _bodies() { return (this.coch ? [this.coch] : []).concat(this.boules); }

  _tick(dt) {
    this.t += dt;
    if (this.phase === 'gauge') this.gauge.t += dt * this.gauge.speed;
    if (this.phase === 'flight') {
      const b = this.flying, f = b.flight;
      f.t += dt;
      const k = Math.min(1, f.t / f.T);
      b.x = f.from.x + (f.to.x - f.from.x) * k; b.z = f.from.z + (f.to.z - f.from.z) * k;
      b.h = 4 * f.h * k * (1 - k);
      if (k >= 1) this._land(b);
    }
    if (this.phase === 'roll') {
      let any = false;
      const bodies = this._bodies().filter((b) => b.alive && !b.flight);
      const n = 4, h = dt / n;
      for (let s = 0; s < n; s++) {
        for (const b of bodies) {
          if (!b.vx && !b.vz) continue;
          b.x += b.vx * h; b.z += b.vz * h;
          if (b.spin != null) b.spin += (Math.hypot(b.vx, b.vz) * h) / b.r;
        }
        for (let i = 0; i < bodies.length; i++) for (let j = i + 1; j < bodies.length; j++) this._collide(bodies[i], bodies[j]);
      }
      for (const b of bodies) {
        const sp = Math.hypot(b.vx, b.vz);
        if (!sp) continue;
        // irrégularités du gravier
        b.vx += gauss() * 6 * dt * Math.min(1, sp / 80);
        const ns = Math.max(0, sp - DECEL * (b.kind === 'coch' ? 1.6 : 1) * dt);
        if (ns < 2) { b.vx = b.vz = 0; } else { b.vx *= ns / sp; b.vz *= ns / sp; any = true; }
        if (Math.abs(b.x) > LANE_X || b.z > LANE_END || b.z < 0) {
          b.alive = false; b.vx = b.vz = 0;
          this.hud.toast(b.kind === 'coch' ? 'Le cochonnet est sorti !' : 'Boule morte (hors du terrain)', 1300);
        }
      }
      if (!any) this._settled();
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx * dt; p.z += p.vz * dt; p.h = Math.max(0, p.h + p.vh * dt); p.vh -= 600 * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _collide(a, b) {
    const dx = b.x - a.x, dz = b.z - a.z, d = Math.hypot(dx, dz), m = a.r + b.r;
    if (d >= m || d === 0) return;
    const nx = dx / d, nz = dz / d, ov = m - d;
    const ta = b.m / (a.m + b.m), tb = a.m / (a.m + b.m);
    a.x -= nx * ov * ta; a.z -= nz * ov * ta; b.x += nx * ov * tb; b.z += nz * ov * tb;
    const rel = (a.vx - b.vx) * nx + (a.vz - b.vz) * nz;
    if (rel <= 0) return;
    const e = a.kind === 'coch' || b.kind === 'coch' ? 0.7 : 0.82;
    const j = ((1 + e) * rel) / (1 / a.m + 1 / b.m);
    a.vx -= (j / a.m) * nx; a.vz -= (j / a.m) * nz; b.vx += (j / b.m) * nx; b.vz += (j / b.m) * nz;
    if (rel > 20) {
      if (a.kind === 'coch' || b.kind === 'coch') fx.ballClick(Math.min(1, rel / 300)); else fx.metal(Math.min(1, rel / 400));
      this._sparks((a.x + b.x) / 2, (a.z + b.z) / 2, rel);
    }
  }

  _land(b) {
    const f = b.flight;
    b.h = 0;
    fx.thud(Math.min(1, f.h / 300 + 0.3));
    this.marks.push({ x: b.x, z: b.z, r: b.r * (f.type === 'plombee' ? 1.3 : 1) });
    this._dust(b.x, b.z, f.type === 'plombee' ? 14 : 8);
    // tir au fer : on tombe directement sur une boule
    const hit = this.boules.find((o) => o !== b && o.alive && !o.flight && Math.hypot(o.x - b.x, o.z - b.z) < BR * 2 + 1.5);
    b.vx = f.dir.x * f.v; b.vz = f.dir.z * f.v;
    delete b.flight;
    if (hit) { fx.metal(1); this.hud.toast('Au fer !', 900); }
    this.phase = 'roll';
  }

  _dust(x, z, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 60;
      this.particles.push({ x, z, h: 0, vx: Math.cos(a) * v, vz: Math.sin(a) * v, vh: 60 + Math.random() * 120, life: 0.5 + Math.random() * 0.3, c: 'rgba(205,190,160,0.9)', s: 0.9 });
    }
  }
  _sparks(x, z, v) {
    for (let i = 0; i < Math.min(10, v / 40); i++) {
      const a = Math.random() * Math.PI * 2, s = 40 + Math.random() * 100;
      this.particles.push({ x, z, h: 2, vx: Math.cos(a) * s, vz: Math.sin(a) * s, vh: 50, life: 0.25, c: '#fff6c8', s: 0.5 });
    }
  }

  // ---------- Règles ----------
  _pointTeam() {
    if (!this.coch || !this.coch.alive || this.coch.flight) return null;
    let best = null;
    for (const b of this.boules) {
      if (!b.alive || b.flight) continue;
      const d = Math.hypot(b.x - this.coch.x, b.z - this.coch.z) - BR - CR;
      if (!best || d < best.d) best = { team: b.team, d, b };
    }
    return best;
  }

  _settled() {
    if (this.coch && !this.coch.alive) return this._endMene(true);
    if (this.boules.length === 0) {
      // cochonnet posé : le même joueur lance la première boule
      this.phase = 'aim';
      this.aim = { x: this.coch.x, z: this.coch.z - 10 };
      this.hud.toast(`${this.names[this.turn]} joue la première boule`, 1300);
      this._hudUpdate(); this._prompt();
      return;
    }
    const pt = this._pointTeam();
    let next;
    if (!pt) next = this.left[this.turn] ? this.turn : 1 - this.turn;
    else {
      const other = 1 - pt.team;
      next = this.left[other] ? other : this.left[pt.team] ? pt.team : null;
    }
    if (next == null) return this._endMene(false);
    if (pt) this.hud.toast(`${this.names[pt.team]} a le point (${Math.max(0, pt.d).toFixed(0)} cm)`, 1400);
    this.turn = next;
    this.phase = 'aim';
    this.aim = { x: this.coch.x, z: this.coch.z - 6 };
    this.type = this.type === 'tir' ? 'demi' : this.type;
    this._hudUpdate(); this._prompt();
  }

  _endMene(cochDead) {
    this.phase = 'mene-end';
    this.hud.controls(null);
    let team = null, pts = 0;
    if (cochDead) {
      // cochonnet mort : si une seule équipe a encore des boules, elle les marque
      if (this.left[0] && !this.left[1]) { team = 0; pts = this.left[0]; }
      else if (this.left[1] && !this.left[0]) { team = 1; pts = this.left[1]; }
    } else {
      const alive = this.boules.filter((b) => b.alive);
      const d = (b) => Math.hypot(b.x - this.coch.x, b.z - this.coch.z);
      alive.sort((a, b) => d(a) - d(b));
      if (alive.length) {
        team = alive[0].team;
        const oppBest = alive.find((b) => b.team !== team);
        pts = alive.filter((b) => b.team === team && (!oppBest || d(b) < d(oppBest))).length;
      }
    }
    let msg;
    if (team == null) msg = 'Mène nulle, on rejoue';
    else { this.score[team] += pts; msg = `${this.names[team]} marque ${pts} point${pts > 1 ? 's' : ''}`; this.starter = team; }
    this.hud.toast(msg, 2200);
    if (team === 0 || (team === 1 && this.opts.mode !== 'ai')) fx.win(); else if (team === 1) fx.lose();
    this._hudUpdate();
    if (this.score[0] >= this.target || this.score[1] >= this.target) {
      const w = this.score[0] >= this.target ? 0 : 1;
      this.phase = 'over';
      setTimeout(() => this.hud.end({
        won: this.opts.mode === 'ai' ? w === 0 : true,
        title: this.opts.mode === 'ai' ? (w === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
        text: `Score final : ${this.score[0]} – ${this.score[1]}`, winner: w,
      }), 2000);
      return;
    }
    setTimeout(() => { if (this.running) this._newMene(); }, 2600);
  }

  // ---------- IA ----------
  _aiPlay() {
    if (!this.running || this.paused) { if (this.running) setTimeout(() => this._aiPlay(), 300); return; }
    const lv = AI[this.opts.level];
    const err = Math.max(-1, Math.min(1, gauss() * lv.err));
    if (this.phase === 'aim-coch') {
      const z = 650 + Math.random() * 300, x = (Math.random() - 0.5) * 120;
      this.aim = { x, z };
      return this._throw(true, x, z, 'demi', err);
    }
    const pt = this._pointTeam();
    let type = 'demi', tx = this.coch.x, tz = this.coch.z - 2;
    if (pt && pt.team === 0 && pt.d < 25 && Math.random() < lv.shoot) {
      type = 'tir'; tx = pt.b.x; tz = pt.b.z;
    } else {
      // une boule juste devant le cochonnet ? on passe par-dessus en plombée
      const blocking = this.boules.some((b) => b.alive && Math.abs(b.x - tx) < 15 && b.z < tz && b.z > tz - 120);
      type = blocking ? 'plombee' : Math.random() < 0.6 ? 'demi' : 'plombee';
    }
    this.type = type; this.aim = { x: tx, z: tz };
    this._throw(false, tx, tz, type, err);
  }

  // ---------- Caméra / rendu ----------
  _camera(dt) {
    let tz = this.coch && this.coch.alive && !this.coch.flight ? this.coch.z : 800, tx = this.coch && this.coch.alive && !this.coch.flight ? this.coch.x : 0;
    if (this.phase === 'aim' || this.phase === 'aim-coch') { tz = (tz + this.aim.z) / 2; tx = (tx + this.aim.x) / 2; }
    tz -= 40;
    tx = Math.max(-LANE_X + VIEW_W / 2 - 15, Math.min(LANE_X - VIEW_W / 2 + 15, tx));
    const k = 1 - Math.exp(-dt * 3);
    this.cam.x += (tx - this.cam.x) * k; this.cam.z += (tz - this.cam.z) * k;
  }

  _sx(x) { return this.vw / 2 + (x - this.cam.x) * this.s; }
  _sy(z) { return this.vh * 0.5 - (z - this.cam.z) * this.s; }

  _gravelPattern() {
    const c = document.createElement('canvas'); const n = 256; c.width = c.height = n;
    const g = c.getContext('2d');
    g.fillStyle = '#cdbb98'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) {
      const v = Math.random();
      g.fillStyle = v < 0.33 ? 'rgba(120,100,70,0.35)' : v < 0.66 ? 'rgba(255,250,235,0.45)' : 'rgba(160,140,110,0.4)';
      const r = 0.6 + Math.random() * 2.2;
      g.beginPath(); g.ellipse(Math.random() * n, Math.random() * n, r, r * (0.6 + Math.random() * 0.4), Math.random() * 3, 0, Math.PI * 2); g.fill();
    }
    return this.ctx.createPattern(c, 'repeat');
  }

  _render() {
    const g = this.ctx, dpr = this.dpr, s = this.s;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!this.gravel) this.gravel = this._gravelPattern();
    // sol (le motif suit la caméra)
    g.save();
    const ox = -this.cam.x * s, oz = this.cam.z * s;
    g.translate(ox % 256, oz % 256);
    g.fillStyle = this.gravel; g.fillRect(-256, -256, this.vw + 512, this.vh + 512);
    g.restore();
    const vig = g.createRadialGradient(this.vw / 2, this.vh / 2, this.vh * 0.2, this.vw / 2, this.vh / 2, this.vh * 0.75);
    vig.addColorStop(0, 'rgba(255,240,200,0.08)'); vig.addColorStop(1, 'rgba(60,40,10,0.35)');
    g.fillStyle = vig; g.fillRect(0, 0, this.vw, this.vh);

    // limites du terrain
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 2;
    for (const x of [-LANE_X, LANE_X]) { g.beginPath(); g.moveTo(this._sx(x), 0); g.lineTo(this._sx(x), this.vh); g.stroke(); }
    g.beginPath(); g.moveTo(0, this._sy(LANE_END)); g.lineTo(this.vw, this._sy(LANE_END)); g.stroke();
    g.fillStyle = 'rgba(80,60,30,0.55)'; g.font = '700 12px system-ui'; g.textAlign = 'left';
    for (let m = 1; m <= 14; m++) {
      const y = this._sy(m * 100);
      if (y < -20 || y > this.vh + 20) continue;
      g.fillRect(this._sx(-LANE_X) + 2, y - 1, m % 5 ? 6 : 12, 2);
      if (m % 1 === 0) g.fillText(`${m} m`, this._sx(-LANE_X) + 16, y + 4);
    }
    // traces d'impact
    for (const m of this.marks) {
      g.fillStyle = 'rgba(90,70,40,0.35)';
      g.beginPath(); g.ellipse(this._sx(m.x), this._sy(m.z), m.r * s * 1.2, m.r * s, 0, 0, Math.PI * 2); g.fill();
    }
    // zone visée
    if ((this.phase === 'aim' || this.phase === 'aim-coch' || this.phase === 'gauge') && !this.isAI(this.turn)) this._drawAim(g);
    // ligne de mesure
    const pt = this._pointTeam();
    if (pt && (this.phase === 'aim' || this.phase === 'mene-end' || this.phase === 'gauge')) {
      g.setLineDash([4, 4]); g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = 1.5;
      g.beginPath(); g.moveTo(this._sx(this.coch.x), this._sy(this.coch.z)); g.lineTo(this._sx(pt.b.x), this._sy(pt.b.z)); g.stroke(); g.setLineDash([]);
    }
    // objets (les plus éloignés d'abord)
    const list = this._bodies().filter((b) => b.alive || b.flight).sort((a, b) => (a.h || 0) - (b.h || 0));
    for (const b of list) this._shadow(g, b);
    for (const b of list) b.kind === 'coch' ? this._drawCoch(g, b) : this._drawBoule(g, b);
    for (const p of this.particles) {
      g.globalAlpha = Math.min(1, p.life * 3); g.fillStyle = p.c;
      g.beginPath(); g.arc(this._sx(p.x), this._sy(p.z) - p.h * s * 0.5, p.s * s, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    if (this.phase === 'gauge') this._drawGauge(g);
  }

  _drawAim(g) {
    const s = this.s, x = this._sx(this.aim.x), y = this._sy(this.aim.z);
    const coch = this.phase === 'aim-coch' || this.prevPhase === 'aim-coch' && this.phase === 'gauge';
    if (!coch) {
      const T = THROWS[this.type], d = Math.hypot(this.aim.x, this.aim.z), lz = this.aim.z * T.land, lx = this.aim.x * T.land;
      if (T.land < 1) {
        g.setLineDash([2, 6]); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 2;
        g.beginPath(); g.moveTo(this._sx(lx), this._sy(lz)); g.lineTo(x, y); g.stroke(); g.setLineDash([]);
        g.strokeStyle = 'rgba(255,255,255,0.8)';
        g.beginPath(); g.arc(this._sx(lx), this._sy(lz), 6, 0, Math.PI * 2); g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '700 11px system-ui'; g.textAlign = 'center';
        g.fillText('impact', this._sx(lx), this._sy(lz) + 20);
      }
      void d;
    }
    const pulse = (Math.sin(this.t * 5) + 1) / 2;
    g.strokeStyle = coch ? '#ffb347' : '#ffffff'; g.lineWidth = 2.5;
    g.beginPath(); g.arc(x, y, (coch ? CR : BR) * s + 6 + pulse * 3, 0, Math.PI * 2); g.stroke();
    g.beginPath(); g.moveTo(x - 14, y); g.lineTo(x - 6, y); g.moveTo(x + 6, y); g.lineTo(x + 14, y);
    g.moveTo(x, y - 14); g.lineTo(x, y - 6); g.moveTo(x, y + 6); g.lineTo(x, y + 14); g.stroke();
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.font = '700 12px system-ui'; g.textAlign = 'center';
    g.fillText(`${(Math.hypot(this.aim.x, this.aim.z) / 100).toFixed(1)} m`, x, y - 24);
  }

  _shadow(g, b) {
    const s = this.s, h = b.h || 0;
    g.fillStyle = `rgba(40,30,10,${0.35 - Math.min(0.2, h / 2000)})`;
    g.beginPath(); g.ellipse(this._sx(b.x) + b.r * s * 0.35, this._sy(b.z) + b.r * s * 0.45, b.r * s * (1 + h / 600), b.r * s * 0.8 * (1 + h / 600), 0, 0, Math.PI * 2); g.fill();
  }

  _drawBoule(g, b) {
    const s = this.s, h = b.h || 0, sc = 1 + h / 300;
    const x = this._sx(b.x), y = this._sy(b.z) - h * s * 0.5, r = b.r * s * sc;
    const steel = b.team === 0;
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    if (steel) { grd.addColorStop(0, '#ffffff'); grd.addColorStop(0.35, '#c9d0d8'); grd.addColorStop(1, '#4a525c'); }
    else { grd.addColorStop(0, '#fff3dc'); grd.addColorStop(0.35, '#b08a5a'); grd.addColorStop(1, '#3a2a18'); }
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    // stries qui tournent
    g.save(); g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.clip();
    g.strokeStyle = steel ? 'rgba(40,50,60,0.45)' : 'rgba(40,25,10,0.5)'; g.lineWidth = Math.max(1, r * 0.08);
    const sp = b.spin || 0;
    for (let i = 0; i < (steel ? 1 : 3); i++) {
      const off = Math.sin(sp + i * 0.9) * r * 0.75;
      g.beginPath(); g.ellipse(x, y + off * 0.3, r, Math.abs(Math.cos(sp + i * 0.9)) * r * 0.5 + 0.5, 0, 0, Math.PI * 2); g.stroke();
    }
    g.restore();
    if (b.team === 1 && this.opts.mode !== 'ai' || b.team === 0) {
      g.strokeStyle = b.team === 0 ? (this.opts.colors?.[0] || '#3a86ff') : (this.opts.colors?.[1] || '#ff006e');
      g.globalAlpha = 0.8; g.lineWidth = 2; g.beginPath(); g.arc(x, y, r + 2, 0, Math.PI * 2); g.stroke(); g.globalAlpha = 1;
    }
  }

  _drawCoch(g, b) {
    const s = this.s, h = b.h || 0, sc = 1 + h / 300;
    const x = this._sx(b.x), y = this._sy(b.z) - h * s * 0.5, r = b.r * s * sc;
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    grd.addColorStop(0, '#fff2a8'); grd.addColorStop(0.5, '#ff9f1c'); grd.addColorStop(1, '#a8530a');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    if (!h && this.phase !== 'flight') {
      const p = (Math.sin(this.t * 3) + 1) / 2;
      g.strokeStyle = `rgba(255,159,28,${0.3 + p * 0.4})`; g.lineWidth = 2;
      g.beginPath(); g.arc(x, y, r + 5 + p * 4, 0, Math.PI * 2); g.stroke();
    }
  }

  _drawGauge(g) {
    const w = Math.min(320, this.vw - 48), x = (this.vw - w) / 2, y = this.vh - 150, hgt = 26;
    g.fillStyle = 'rgba(0,0,0,0.55)'; g.beginPath(); g.roundRect(x - 10, y - 34, w + 20, hgt + 52, 16); g.fill();
    const grd = g.createLinearGradient(x, 0, x + w, 0);
    grd.addColorStop(0, '#ff5a5a'); grd.addColorStop(0.3, '#ffd34d'); grd.addColorStop(0.5, '#7ee08a'); grd.addColorStop(0.7, '#ffd34d'); grd.addColorStop(1, '#ff5a5a');
    g.fillStyle = grd; g.beginPath(); g.roundRect(x, y, w, hgt, 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.8)'; g.fillRect(x + w / 2 - 1, y - 4, 2, hgt + 8);
    const cx = x + w / 2 + Math.sin(this.gauge.t) * (w / 2 - 4);
    g.fillStyle = '#fff'; g.beginPath(); g.moveTo(cx, y + hgt + 2); g.lineTo(cx - 8, y + hgt + 14); g.lineTo(cx + 8, y + hgt + 14); g.fill();
    g.fillRect(cx - 2, y - 6, 4, hgt + 12);
    g.font = '800 14px system-ui'; g.textAlign = 'center'; g.fillText('Touchez au centre pour lancer !', this.vw / 2, y - 14);
  }
}
