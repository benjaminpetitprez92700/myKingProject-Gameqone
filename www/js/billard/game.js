// Billard américain (8-ball) : rendu, contrôles, règles, adversaire ordinateur.
import { W, H, R, POCKETS, HEAD_Y, FOOT, groupOf, rackBalls, step, shoot, simulate, freeSpot, aimRay, cloneBalls } from './table.js';
import { fx } from '../fx.js';

const DT = 1 / 120;
const RAIL = 44;
const COLORS = { 1: '#f5c400', 2: '#1d4fd8', 3: '#e0261b', 4: '#6a2c91', 5: '#f07800', 6: '#118a3c', 7: '#7a1f1f', 8: '#111111' };
const colorOf = (id) => COLORS[id > 8 ? id - 8 : id] || '#fff';
const GROUP_NAME = { solids: 'les pleines', stripes: 'les rayées' };
const AI_NOISE = { facile: 2.6, moyen: 0.9, difficile: 0.3 };   // degrés

// ---------- Règles (pures, partagées avec l'IA) ----------
export function judge(st, info) {
  const me = st.turn, myG = st.groups[me];
  const left = (g) => st.ballsBefore.filter((b) => !b.in && groupOf(b.id) === g).length;
  const clearedBefore = !!myG && left(myG) === 0;
  let foul = null;
  if (info.firstHit == null) foul = 'aucune bille touchée';
  else if (!myG) { if (info.firstHit === 8 && !st.isBreak) foul = 'il fallait toucher une bille de couleur'; }
  else if (clearedBefore ? info.firstHit !== 8 : groupOf(info.firstHit) !== myG) foul = clearedBefore ? 'il fallait toucher la 8' : `il fallait toucher ${GROUP_NAME[myG]}`;
  if (info.cueIn) foul = 'la blanche est tombée';
  const eightIn = info.pocketed.includes(8);
  const out = { foul, win: false, lose: false, respot8: false, groups: [...st.groups], assigned: null, cont: false };
  if (eightIn) {
    if (st.isBreak) out.respot8 = true;
    else if (!foul && clearedBefore) { out.win = true; return out; }
    else { out.lose = true; return out; }
  }
  const potted = info.pocketed.filter((id) => id !== 8);
  if (!myG && !st.isBreak && !foul && potted.length) {
    const g = groupOf(potted[0]);
    out.groups[me] = g; out.groups[1 - me] = g === 'solids' ? 'stripes' : 'solids';
    out.assigned = g;
  }
  const g2 = out.groups[me];
  const mine = g2 ? potted.filter((id) => groupOf(id) === g2).length : potted.length;
  out.cont = !foul && mine > 0;
  return out;
}

// ---------- Sprites de billes (rendu 3D par pixel, mis en cache) ----------
const L = (() => { const v = [-0.45, -0.55, 0.7]; const l = Math.hypot(...v); return v.map((x) => x / l); })();
function hex(c) { const n = parseInt(c.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function randUnit() { const z = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, s = Math.sqrt(1 - z * z); return [Math.cos(a) * s, Math.sin(a) * s, z]; }
function rot(v, k, c, s) { // Rodrigues
  const d = k[0] * v[0] + k[1] * v[1] + k[2] * v[2];
  const cx = k[1] * v[2] - k[2] * v[1], cy = k[2] * v[0] - k[0] * v[2], cz = k[0] * v[1] - k[1] * v[0];
  return [v[0] * c + cx * s + k[0] * d * (1 - c), v[1] * c + cy * s + k[1] * d * (1 - c), v[2] * c + cz * s + k[2] * d * (1 - c)];
}

function attachOrientation(b) {
  b.n = randUnit();
  let a = randUnit();
  const d = a[0] * b.n[0] + a[1] * b.n[1] + a[2] * b.n[2];
  a = [a[0] - d * b.n[0], a[1] - d * b.n[1], a[2] - d * b.n[2]];
  const l = Math.hypot(...a); b.a = a.map((x) => x / l);
  b.dirty = true;
  b.roll = (dx, dy) => {
    const len = Math.hypot(dx, dy); if (!len) return;
    const k = [-dy / len, dx / len, 0], th = len / R, c = Math.cos(th), s = Math.sin(th);
    b.n = rot(b.n, k, c, s); b.a = rot(b.a, k, c, s); b.dirty = true;
  };
}

function renderSprite(b, size) {
  if (!b.cv || b.cv.width !== size) { b.cv = document.createElement('canvas'); b.cv.width = b.cv.height = size; b.cx = b.cv.getContext('2d'); }
  const g = b.cx, img = g.createImageData(size, size), d = img.data;
  const base = hex(colorOf(b.id)), white = [250, 247, 238];
  const stripe = b.id > 8, cue = b.id === 0;
  const [nx, ny, nz] = b.n, [ax, ay, az] = b.a;
  for (let j = 0; j < size; j++) {
    const v = ((j + 0.5) / size) * 2 - 1;
    for (let i = 0; i < size; i++) {
      const u = ((i + 0.5) / size) * 2 - 1, r2 = u * u + v * v, o = (j * size + i) * 4;
      if (r2 > 1) { d[o + 3] = 0; continue; }
      const w = Math.sqrt(1 - r2);
      const dn = u * nx + v * ny + w * nz;
      let c;
      if (cue) c = dn > 0.975 ? [200, 30, 30] : white;
      else if (stripe) c = dn > 0.86 ? white : Math.abs(u * ax + v * ay + w * az) < 0.5 ? base : white;
      else c = dn > 0.86 ? white : base;
      const lam = 0.38 + 0.62 * Math.max(0, u * L[0] + v * L[1] + w * L[2]);
      const rim = 0.82 + 0.18 * w;
      d[o] = c[0] * lam * rim; d[o + 1] = c[1] * lam * rim; d[o + 2] = c[2] * lam * rim;
      d[o + 3] = Math.min(1, (1 - Math.sqrt(r2)) * size * 0.5) * 255;
    }
  }
  g.putImageData(img, 0, 0);
  if (!cue && nz > 0.12) {
    const h = size / 2;
    g.save();
    g.translate(h + nx * h, h + ny * h);
    const ang = Math.atan2(ny, nx);
    g.rotate(ang); g.scale(Math.max(0.15, nz), 1); g.rotate(-ang);
    g.fillStyle = '#111'; g.font = `800 ${size * 0.27}px system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(String(b.id), 0, size * 0.015);
    g.restore();
  }
  // reflet
  const hl = g.createRadialGradient(size * 0.33, size * 0.28, 0, size * 0.33, size * 0.28, size * 0.3);
  hl.addColorStop(0, 'rgba(255,255,255,0.85)'); hl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = hl; g.beginPath(); g.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2); g.fill();
  b.dirty = false;
}

export class Billard {
  constructor(canvas, hud) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud;
    this.running = false; this.paused = false;
    this._loop = this._loop.bind(this);
    this._onResize = () => this.resize();
    this._bind();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    const top = 118, bottom = 18;
    this.s = Math.min((w - 8) / (W + RAIL * 2), (h - top - bottom) / (H + RAIL * 2));
    this.ox = w / 2 - (W / 2) * this.s;
    this.oy = top + (h - top - bottom) / 2 - (H / 2) * this.s;
    if (this.balls) for (const b of this.balls) b.dirty = true;
    this.cloth = null;
  }

  start(opts) {
    this.opts = opts;
    this.names = opts.names;
    this.balls = rackBalls();
    this.balls.forEach(attachOrientation);
    this.turn = 0; this.groups = [null, null];
    this.isBreak = true; this.inHand = true; this.kitchen = true;
    this.angle = -Math.PI / 2; this.power = 0;
    this.phase = 'aim'; this.particles = [];
    this.t = 0; this.paused = false;
    window.addEventListener('resize', this._onResize);
    this.resize();
    this._updateHud();
    this.hud.toast(`${this.names[0]} casse !`, 1600);
    this._maybeAI();
    if (!this.running) { this.running = true; this.last = performance.now(); this.acc = 0; requestAnimationFrame(this._loop); }
  }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); }
  setPaused(p) { this.paused = p; if (!p) this.last = performance.now(); }

  isAI(p = this.turn) { return this.opts.mode === 'ai' && p === 1; }

  // ---------- HUD ----------
  _updateHud() {
    const panel = (p) => {
      const g = this.groups[p];
      const left = g ? this.balls.filter((b) => !b.in && groupOf(b.id) === g).map((b) => b.id) : [];
      const icons = g ? (left.length ? left : [8]).map((id) => `<i class="mini-ball ${id > 8 ? 'st' : ''}" style="--c:${colorOf(id)}"></i>`).join('') : '<span class="muted">table ouverte</span>';
      return `<div class="sp ${p === this.turn ? 'on' : ''}"><b>${this.names[p]}</b><div class="balls">${icons}</div></div>`;
    };
    this.hud.setScore(panel(0) + panel(1));
    this.hud.setChip(this.inHand && !this.isAI() ? 'Bille en main' : (this.isAI() ? 'Ordi' : this.names[this.turn]));
  }

  // ---------- Entrées ----------
  _toWorld(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.ox) / this.s, y: (e.clientY - r.top - this.oy) / this.s, sx: e.clientX - r.left, sy: e.clientY - r.top };
  }
  _powerRect() { return { x: this.vw - 54, y: this.vh * 0.36, w: 40, h: this.vh * 0.38 }; }

  _bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (!this.running || this.paused || this.phase !== 'aim' || this.isAI()) return;
      const p = this._toWorld(e), pr = this._powerRect(), cue = this.balls[0];
      c.setPointerCapture?.(e.pointerId);
      if (p.sx >= pr.x - 14 && p.sy >= pr.y - 20 && p.sy <= pr.y + pr.h + 20) {
        this.drag = { mode: 'power', y0: p.sy, id: e.pointerId };
      } else if (this.inHand && Math.hypot(p.x - cue.x, p.y - cue.y) < R * 3.2) {
        this.drag = { mode: 'place', id: e.pointerId, dx: cue.x - p.x, dy: cue.y - p.y };
      } else {
        this.drag = { mode: 'aim', id: e.pointerId };
        this._aimAt(p);
      }
    });
    c.addEventListener('pointermove', (e) => {
      const d = this.drag; if (!d || d.id !== e.pointerId) return;
      const p = this._toWorld(e);
      if (d.mode === 'aim') this._aimAt(p);
      else if (d.mode === 'place') this._place(p.x + d.dx, p.y + d.dy);
      else if (d.mode === 'power') {
        const pw = Math.max(0, Math.min(1, (p.sy - d.y0) / (this._powerRect().h * 0.9)));
        if (Math.floor(pw * 10) !== Math.floor(this.power * 10)) fx.tick();
        this.power = pw;
      }
    });
    const up = (e) => {
      const d = this.drag; if (!d || d.id !== e.pointerId) return;
      this.drag = null;
      if (d.mode === 'power') {
        if (this.power > 0.03) this._shoot(this.power, this.angle);
        else this.power = 0;
      }
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', (e) => { this.drag = null; this.power = 0; });
  }

  _aimAt(p) {
    const cue = this.balls[0];
    if (Math.hypot(p.x - cue.x, p.y - cue.y) < 4) return;
    this.angle = Math.atan2(p.y - cue.y, p.x - cue.x);
  }

  _place(x, y) {
    const cue = this.balls[0];
    x = Math.max(R, Math.min(W - R, x));
    y = Math.max(this.kitchen ? HEAD_Y + R : R, Math.min(H - R, y));
    const ok = this.balls.every((b) => b.in || b.id === 0 || Math.hypot(b.x - x, b.y - y) >= 2 * R);
    if (ok) { cue.x = x; cue.y = y; }
  }

  _shoot(power, angle) {
    this.phase = 'roll';
    this.info = { firstHit: null, pocketed: [], cueIn: false };
    this.ballsBefore = cloneBalls(this.balls);
    this.shotPower = power;
    this.strikeT = 0.12;
    shoot(this.balls, power, angle);
    fx.ballClick(0.4 + power * 0.6); fx.cushion(0.3);
    this.power = 0;
  }

  // ---------- Boucle ----------
  _loop(now) {
    if (!this.running) return;
    const frame = Math.min(0.05, (now - this.last) / 1000); this.last = now;
    if (!this.paused) {
      this.acc += frame;
      while (this.acc >= DT) { this.acc -= DT; this._tick(DT); }
    }
    this._render();
    requestAnimationFrame(this._loop);
  }

  _tick(dt) {
    this.t += dt;
    if (this.strikeT > 0) this.strikeT -= dt;
    if (this.phase === 'roll') {
      const ev = [];
      const movingNow = step(this.balls, dt, this.info, ev);
      for (const e of ev) {
        if (e.type === 'ball') fx.ballClick(Math.min(1, e.v / 900));
        else if (e.type === 'cushion') fx.cushion(Math.min(1, e.v / 1200));
        else if (e.type === 'pocket') { fx.pocket(); this._burst(e.x, e.y); }
      }
      if (!movingNow) this._resolve();
    } else if (this.phase === 'ai-aim') {
      const a = this.ai;
      a.t += dt;
      const k = Math.min(1, a.t / 0.7);
      let da = a.angle - a.from; da = Math.atan2(Math.sin(da), Math.cos(da));
      this.angle = a.from + da * (1 - Math.pow(1 - k, 3));
      if (a.t > 0.8) this.power = Math.min(a.power, (a.t - 0.8) * 1.6);
      if (a.t > 0.8 + a.power / 1.6 + 0.25) { this.phase = 'aim'; this._shoot(a.power, a.angle); }
    }
    for (const b of this.balls) if (b.in && b.inT < 1) b.inT += dt * 3;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  _burst(x, y) {
    for (let i = 0; i < 10; i++) {
      const a = Math.random() * Math.PI * 2, v = 30 + Math.random() * 60;
      this.particles.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 });
    }
  }

  _resolve() {
    const st = { turn: this.turn, groups: this.groups, isBreak: this.isBreak, ballsBefore: this.ballsBefore };
    const res = judge(st, this.info);
    const me = this.turn, name = this.names[me], other = this.names[1 - me];
    if (res.win || res.lose) {
      this.phase = 'over';
      const winner = res.win ? me : 1 - me;
      const why = res.win ? `${name} empoche la 8 !` : `${name} a empoché la 8 trop tôt ou en faisant une faute.`;
      setTimeout(() => this.hud.end({
        won: this.opts.mode === 'ai' ? winner === 0 : true,
        title: this.opts.mode === 'ai' ? (winner === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[winner]} gagne !`,
        text: why, winner,
      }), 900);
      if (winner === 0 || this.opts.mode !== 'ai') fx.win(); else fx.lose();
      return;
    }
    if (res.respot8) { const b = this.balls[8]; const p = freeSpot(this.balls, FOOT.x, FOOT.y, 8); b.in = false; b.x = p.x; b.y = p.y; b.inT = 0; }
    this.groups = res.groups;
    if (res.assigned) this.hud.toast(`${name} joue ${GROUP_NAME[res.assigned]}`, 1800);
    this.isBreak = false; this.kitchen = false;
    this.inHand = false;
    if (res.foul) {
      fx.lose();
      this.hud.toast(`Faute : ${res.foul}. ${other} a la bille en main.`, 2200);
      this.inHand = true;
      const cue = this.balls[0];
      if (cue.in) { const p = freeSpot(this.balls, W / 2, H * 0.75, 0); cue.in = false; cue.inT = 0; cue.x = p.x; cue.y = p.y; }
    }
    if (!res.cont) this.turn = 1 - me;
    else if (!res.assigned) this.hud.toast(`${name} rejoue`, 1000);
    if (!res.cont && !res.foul) this.hud.toast(`À ${this.names[this.turn]} de jouer`, 1200);
    this.phase = 'aim';
    this._updateHud();
    this._maybeAI();
  }

  // ---------- IA ----------
  _maybeAI() {
    if (!this.isAI() || this.phase !== 'aim') return;
    this.phase = 'ai-think';
    this.hud.setChip("L'ordi réfléchit…");
    setTimeout(() => this._aiPlan(), 450);
  }

  _aiPlan() {
    if (!this.running) return;
    const balls = this.balls, me = 1, myG = this.groups[me];
    if (this.inHand) this._aiPlace();
    if (this.isBreak) {
      const apex = balls.filter((b) => !b.in && b.id).sort((a, b) => b.y - a.y)[0];
      const ang = Math.atan2(apex.y - balls[0].y, apex.x - balls[0].x) + (Math.random() - 0.5) * 0.02;
      return this._aiExecute(ang, 0.92 + Math.random() * 0.08);
    }
    const left = myG ? balls.filter((b) => !b.in && groupOf(b.id) === myG) : balls.filter((b) => !b.in && b.id && b.id !== 8);
    const targets = left.length ? left : [balls[8]];
    const cands = [];
    const cue = balls[0];
    for (const t of targets) for (const p of POCKETS) {
      const px = p.x + (W / 2 - p.x) * 0.03, py = p.y + (H / 2 - p.y) * 0.015;
      const dx = px - t.x, dy = py - t.y, dl = Math.hypot(dx, dy);
      const gx = t.x - (dx / dl) * 2 * R, gy = t.y - (dy / dl) * 2 * R;
      const cx = gx - cue.x, cy = gy - cue.y, cl = Math.hypot(cx, cy);
      const cut = (cx * dx + cy * dy) / (cl * dl);
      if (cut < 0.25) continue;
      const base = Math.min(0.95, 0.22 + (cl + dl) / 2600 + (1 - cut) * 0.25);
      const ang = Math.atan2(cy, cx);
      cands.push({ ang, power: base }, { ang, power: Math.min(1, base + 0.15) });
    }
    for (let i = 0; i < 14; i++) {
      const t = targets[Math.floor(Math.random() * targets.length)];
      const ang = Math.atan2(t.y - cue.y, t.x - cue.x) + (Math.random() - 0.5) * 0.25;
      cands.push({ ang, power: 0.3 + Math.random() * 0.5 });
    }
    const st = { turn: me, groups: this.groups, isBreak: false, ballsBefore: balls };
    let i = 0;
    const work = () => {
      if (!this.running) return;
      const t0 = performance.now();
      while (i < cands.length && performance.now() - t0 < 14) {
        const c = cands[i++];
        const sim = simulate(balls, c.power, c.ang);
        const r = judge(st, sim.info);
        let s = Math.random() * 5;
        if (r.win) s += 1e5; if (r.lose) s -= 1e5;
        if (r.foul) s -= 400;
        const g = r.groups[me];
        for (const id of sim.info.pocketed) s += id === 8 ? 0 : !g || groupOf(id) === g ? 140 : -70;
        if (r.cont) s += 60;
        c.score = s;
      }
      if (i < cands.length) return setTimeout(work, 0);
      cands.sort((a, b) => b.score - a.score);
      const lvl = this.opts.level;
      const pick = lvl === 'facile' ? cands[Math.floor(Math.random() * Math.min(4, cands.length))] : cands[0];
      const noise = ((Math.random() + Math.random() - 1) * AI_NOISE[lvl] * Math.PI) / 180;
      this._aiExecute(pick.ang + noise, Math.min(1, pick.power * (1 + (Math.random() - 0.5) * 0.08)));
    };
    work();
  }

  _aiPlace() {
    const balls = this.balls, cue = balls[0];
    const myG = this.groups[1];
    const targets = balls.filter((b) => !b.in && b.id && b.id !== 8 && (!myG || groupOf(b.id) === myG));
    let best = null;
    for (const t of targets.length ? targets : [balls[8]]) for (const p of POCKETS) {
      const dx = p.x - t.x, dy = p.y - t.y, dl = Math.hypot(dx, dy);
      const x = t.x - (dx / dl) * 130, y = t.y - (dy / dl) * 130;
      if (x < R || x > W - R || y < (this.kitchen ? HEAD_Y + R : R) || y > H - R) continue;
      if (!balls.every((b) => b.in || b.id === 0 || Math.hypot(b.x - x, b.y - y) > 2.2 * R)) continue;
      const s = -dl + Math.random() * 40;
      if (!best || s > best.s) best = { x, y, s };
    }
    const p = best || freeSpot(balls, W / 2, this.kitchen ? H * 0.82 : H / 2, 0);
    cue.x = p.x; cue.y = p.y;
  }

  _aiExecute(angle, power) {
    this.ai = { angle, power, from: this.angle, t: 0 };
    this.phase = 'ai-aim';
    this.inHand = false;
    this._updateHud();
  }

  // ---------- Rendu ----------
  _clothPattern() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#167a4c'; g.fillRect(0, 0, 64, 64);
    for (let i = 0; i < 500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.04)'; g.fillRect(Math.random() * 64, Math.random() * 64, 1, 1); }
    return this.ctx.createPattern(c, 'repeat');
  }

  _render() {
    const g = this.ctx, dpr = this.dpr, s = this.s;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = g.createRadialGradient(this.vw / 2, this.vh * 0.45, 50, this.vw / 2, this.vh / 2, this.vh * 0.8);
    bg.addColorStop(0, '#3a2a20'); bg.addColorStop(1, '#120c09');
    g.fillStyle = bg; g.fillRect(0, 0, this.vw, this.vh);
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * this.ox, dpr * this.oy);
    this._drawTable(g);
    this._drawGuide(g);
    this._drawBalls(g);
    this._drawCue(g);
    for (const p of this.particles) {
      g.globalAlpha = p.life * 2; g.fillStyle = '#fff';
      g.beginPath(); g.arc(p.x, p.y, 1.6, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    this._drawPowerBar(g);
  }

  _drawTable(g) {
    // ombre et cadre en bois
    g.fillStyle = 'rgba(0,0,0,0.5)';
    g.beginPath(); g.roundRect(-RAIL + 6, -RAIL + 12, W + RAIL * 2, H + RAIL * 2, 26); g.fill();
    const wood = g.createLinearGradient(-RAIL, 0, W + RAIL, 0);
    wood.addColorStop(0, '#5a2f17'); wood.addColorStop(0.5, '#8a4a24'); wood.addColorStop(1, '#5a2f17');
    g.fillStyle = wood; g.beginPath(); g.roundRect(-RAIL, -RAIL, W + RAIL * 2, H + RAIL * 2, 26); g.fill();
    g.strokeStyle = 'rgba(255,220,180,0.25)'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(-RAIL + 4, -RAIL + 4, W + RAIL * 2 - 8, H + RAIL * 2 - 8, 22); g.stroke();
    // mouches (repères en nacre)
    g.fillStyle = '#f3ead2';
    for (let i = 1; i < 4; i++) for (const x of [-RAIL / 2, W + RAIL / 2]) {
      for (const y of [(H / 8) * i, H / 2 + (H / 8) * i]) { g.beginPath(); g.arc(x, y, 2.6, 0, Math.PI * 2); g.fill(); }
    }
    for (let i = 1; i < 4; i++) for (const y of [-RAIL / 2, H + RAIL / 2]) { g.beginPath(); g.arc((W / 4) * i, y, 2.6, 0, Math.PI * 2); g.fill(); }
    // bandes
    g.fillStyle = '#0f5c37';
    g.fillRect(-14, -14, W + 28, H + 28);
    // tapis
    if (!this.cloth) this.cloth = this._clothPattern();
    g.fillStyle = this.cloth; g.fillRect(0, 0, W, H);
    const light = g.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, H * 0.65);
    light.addColorStop(0, 'rgba(255,255,255,0.10)'); light.addColorStop(1, 'rgba(0,0,0,0.28)');
    g.fillStyle = light; g.fillRect(0, 0, W, H);
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.strokeRect(0, 0, W, H);
    // ligne de tête et mouche de pied
    g.strokeStyle = 'rgba(255,255,255,0.12)'; g.lineWidth = 1.5;
    g.beginPath(); g.moveTo(0, HEAD_Y); g.lineTo(W, HEAD_Y); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.beginPath(); g.arc(FOOT.x, FOOT.y, 2.5, 0, Math.PI * 2); g.fill();
    if (this.inHand && this.kitchen && this.phase === 'aim') { g.fillStyle = 'rgba(255,255,255,0.05)'; g.fillRect(0, HEAD_Y, W, H - HEAD_Y); }
    // poches
    for (const p of POCKETS) {
      g.fillStyle = '#2b2b2b'; g.beginPath(); g.arc(p.x, p.y, p.r + 6, 0, Math.PI * 2); g.fill();
      const pg = g.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.r);
      pg.addColorStop(0, '#000'); pg.addColorStop(1, '#151515');
      g.fillStyle = pg; g.beginPath(); g.arc(p.x, p.y, p.r, 0, Math.PI * 2); g.fill();
    }
  }

  _drawBalls(g) {
    const size = Math.max(8, Math.round(2 * R * this.s * this.dpr));
    for (const b of this.balls) {
      if (b.in && b.inT >= 1) continue;
      let x = b.x, y = b.y, sc = 1, a = 1;
      if (b.in) { const k = b.inT; x += (b.pocket.x - x) * k; y += (b.pocket.y - y) * k; sc = 1 - 0.4 * k; a = 1 - k; }
      g.globalAlpha = a;
      g.fillStyle = 'rgba(0,0,0,0.35)';
      g.beginPath(); g.ellipse(x + 3, y + 5, R * sc, R * 0.85 * sc, 0, 0, Math.PI * 2); g.fill();
      if (b.dirty || !b.cv || b.cv.width !== size) renderSprite(b, size);
      g.drawImage(b.cv, x - R * sc, y - R * sc, 2 * R * sc, 2 * R * sc);
      g.globalAlpha = 1;
    }
    if (this.inHand && this.phase === 'aim' && !this.isAI()) {
      const c = this.balls[0], p = (Math.sin(this.t * 5) + 1) / 2;
      g.strokeStyle = `rgba(255,255,255,${0.4 + p * 0.4})`; g.lineWidth = 2; g.setLineDash([5, 5]);
      g.beginPath(); g.arc(c.x, c.y, R + 8 + p * 3, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
    }
  }

  _drawGuide(g) {
    if (this.phase !== 'aim' || this.isAI()) return;
    const c = this.balls[0], r = aimRay(this.balls, this.angle);
    g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 1.6; g.setLineDash([6, 6]);
    g.beginPath(); g.moveTo(c.x, c.y); g.lineTo(r.x, r.y); g.stroke(); g.setLineDash([]);
    g.strokeStyle = 'rgba(255,255,255,0.85)'; g.lineWidth = 1.5;
    g.beginPath(); g.arc(r.x, r.y, R, 0, Math.PI * 2); g.stroke();
    if (r.target) {
      const len = 40 + 140 * Math.max(0, r.cut);
      const myG = this.groups[this.turn];
      const bad = r.target.id === 8 ? !!myG && this.balls.some((b) => !b.in && groupOf(b.id) === myG) : myG && groupOf(r.target.id) !== myG;
      g.strokeStyle = bad ? 'rgba(255,90,90,0.95)' : 'rgba(255,255,255,0.9)'; g.lineWidth = 2;
      g.beginPath(); g.moveTo(r.target.x, r.target.y); g.lineTo(r.target.x + r.nx * len, r.target.y + r.ny * len); g.stroke();
      // déviation de la blanche
      const tx = -r.ny, ty = r.nx, dx = Math.cos(this.angle), dy = Math.sin(this.angle);
      const sgn = Math.sign(tx * dx + ty * dy) || 1, l2 = 60 * Math.sqrt(Math.max(0, 1 - r.cut * r.cut));
      g.strokeStyle = 'rgba(255,255,255,0.4)';
      g.beginPath(); g.moveTo(r.x, r.y); g.lineTo(r.x + tx * sgn * l2, r.y + ty * sgn * l2); g.stroke();
    }
  }

  _drawCue(g) {
    const show = (this.phase === 'aim' && !this.isAI()) || this.phase === 'ai-aim' || (this.phase === 'roll' && this.strikeT > 0);
    if (!show) return;
    const c = this.balls[0], a = this.angle;
    const pull = this.phase === 'roll' ? 0 : this.power * 90;
    const gap = R + 5 + pull;
    g.save(); g.translate(c.x, c.y); g.rotate(a + Math.PI);
    const len = 640;
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.moveTo(gap + 4, 7); g.lineTo(gap + len + 4, 14); g.lineTo(gap + len + 4, 24); g.lineTo(gap + 4, 11); g.fill();
    const grd = g.createLinearGradient(gap, 0, gap + len, 0);
    grd.addColorStop(0, '#3b6fb6'); grd.addColorStop(0.012, '#3b6fb6'); grd.addColorStop(0.013, '#f4f1e8'); grd.addColorStop(0.035, '#f4f1e8');
    grd.addColorStop(0.036, '#e8c98f'); grd.addColorStop(0.6, '#d7aa66'); grd.addColorStop(0.61, '#1b1b1b'); grd.addColorStop(0.64, '#1b1b1b');
    grd.addColorStop(0.65, '#5a2a12'); grd.addColorStop(1, '#2f150a');
    g.fillStyle = grd;
    g.beginPath(); g.moveTo(gap, -3); g.lineTo(gap + len, -7); g.lineTo(gap + len, 7); g.lineTo(gap, 3); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(gap, -2.5, len, 1.5);
    g.restore();
  }

  _drawPowerBar(g) {
    if (this.phase !== 'aim' || this.isAI()) return;
    const r = this._powerRect();
    g.fillStyle = 'rgba(0,0,0,0.45)'; g.beginPath(); g.roundRect(r.x, r.y, r.w, r.h, 14); g.fill();
    const h = (r.h - 8) * this.power;
    const grd = g.createLinearGradient(0, r.y, 0, r.y + r.h);
    grd.addColorStop(0, '#7ee08a'); grd.addColorStop(0.6, '#ffd34d'); grd.addColorStop(1, '#ff5a5a');
    g.fillStyle = grd; g.beginPath(); g.roundRect(r.x + 4, r.y + 4, r.w - 8, Math.max(0, h), 10); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.9)'; g.font = '700 11px system-ui'; g.textAlign = 'center';
    g.fillText('TIRE', r.x + r.w / 2, r.y - 16); g.fillText('▼', r.x + r.w / 2, r.y - 4);
    if (this.power > 0) g.fillText(`${Math.round(this.power * 100)}%`, r.x + r.w / 2, r.y + r.h + 16);
  }
}
