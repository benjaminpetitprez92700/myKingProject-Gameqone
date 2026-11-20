// Boucle de jeu, rendu Canvas 2D, caméra et contrôles tactiles.
import {
  BALL_R, CALOT_R, createSim, shoot, stepSim, resetToRest, predict, obstacleShapes,
} from './physics.js';
import { DIFFICULTIES, maxShots, starsFor } from './levels.js';
import { fx } from './fx.js';

const DT = 1 / 120;
const WORLD_W = 360;

// ---------- Textures générées ----------
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function makeTile(size, base, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'); g.fillStyle = base; g.fillRect(0, 0, size, size); draw(g, size);
  return c;
}

function groundTile(theme) {
  const r = rng(7);
  return makeTile(160, theme.ground, (g, n) => {
    for (let i = 0; i < 420; i++) {
      g.fillStyle = r() < 0.5 ? theme.ground2 : 'rgba(255,255,255,0.06)';
      const x = r() * n, y = r() * n;
      g.fillRect(x, y, 1.5, 3 + r() * 3);
    }
    for (let i = 0; i < 25; i++) {
      g.fillStyle = 'rgba(0,0,0,0.05)';
      g.beginPath(); g.arc(r() * n, r() * n, 4 + r() * 10, 0, Math.PI * 2); g.fill();
    }
  });
}

function dirtTile(theme) {
  const r = rng(11);
  return makeTile(96, theme.dirt, (g, n) => {
    for (let i = 0; i < 260; i++) {
      const v = r();
      g.fillStyle = v < 0.5 ? 'rgba(120,80,30,0.13)' : 'rgba(255,255,255,0.18)';
      g.fillRect(r() * n, r() * n, 1 + r() * 1.5, 1 + r() * 1.5);
    }
    for (let i = 0; i < 6; i++) {
      g.fillStyle = 'rgba(110,80,50,0.25)';
      g.beginPath(); g.ellipse(r() * n, r() * n, 1.6 + r() * 1.5, 1.2 + r(), r() * 3, 0, Math.PI * 2); g.fill();
    }
  });
}

function sandTile() {
  const r = rng(3);
  return makeTile(64, '#f3e2b3', (g, n) => {
    for (let i = 0; i < 300; i++) { g.fillStyle = r() < 0.5 ? 'rgba(170,130,60,0.25)' : 'rgba(255,255,255,0.4)'; g.fillRect(r() * n, r() * n, 1, 1); }
  });
}

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

export class Game {
  constructor(canvas, hooks) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.hooks = hooks;
    this.running = false;
    this.paused = false;
    this.particles = [];
    this.texts = [];
    this.aim = null;
    this.cam = { x: 180, y: 0, s: 1 };
    this.overview = 0; this.overviewTarget = 0;
    this._loop = this._loop.bind(this);
    this._bindInput();
    window.addEventListener('resize', () => this.resize());
    this.resize();
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.dpr = dpr; this.vw = w; this.vh = h;
    this.canvas.width = Math.round(w * dpr); this.canvas.height = Math.round(h * dpr);
    this.baseScale = Math.min(w / 380, h / 560);
  }

  // ---------- Cycle de vie ----------
  start(level, profile) {
    this.level = level;
    this.diff = DIFFICULTIES.find(d => d.id === level.difficulty);
    this.theme = this.diff.theme;
    this.profile = profile;
    this.sim = createSim(level);
    this.shots = 0;
    this.max = maxShots(level);
    this.phase = 'intro';      // intro | play | falling | won | lost
    this.phaseT = 0;
    this.particles = []; this.texts = [];
    this.aim = null;
    this.overview = this.overviewTarget = 0;
    this.groundPat = this.ctx.createPattern(groundTile(this.theme), 'repeat');
    this.dirtPat = this.ctx.createPattern(dirtTile(this.theme), 'repeat');
    this.sandPat = this.ctx.createPattern(sandTile(), 'repeat');
    this.cam.x = 180; this.cam.y = level.calot[1];
    this.introFrom = level.calot[1];
    this.paused = false;
    this._emitHud();
    if (!this.running) { this.running = true; this.last = performance.now(); this.acc = 0; requestAnimationFrame(this._loop); }
  }

  stop() { this.running = false; }
  setPaused(p) { this.paused = p; this.aim = null; if (!p) this.last = performance.now(); }
  toggleOverview() { this.overviewTarget = this.overviewTarget ? 0 : 1; this.aim = null; return !!this.overviewTarget; }

  _emitHud() { this.hooks.onHud?.({ shots: this.shots, max: this.max, par: this.level.par }); }

  // ---------- Entrées tactiles ----------
  _bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (!this.running || this.paused) return;
      if (this.phase === 'intro') { this.phaseT = 99; return; }
      if (this.overviewTarget) { this.overviewTarget = 0; this.hooks.onOverview?.(false); return; }
      if (this.phase !== 'play' || this.sim.state !== 'rest' || this.aim) return;
      c.setPointerCapture?.(e.pointerId);
      this.aim = { id: e.pointerId, sx: e.clientX, sy: e.clientY, cx: e.clientX, cy: e.clientY, power: 0, angle: 0, lastTick: 0, maxed: false };
      this.hooks.onAimStart?.();
    });
    c.addEventListener('pointermove', (e) => {
      const a = this.aim; if (!a || e.pointerId !== a.id) return;
      a.cx = e.clientX; a.cy = e.clientY;
      this._updateAim();
    });
    const end = (e, cancel) => {
      const a = this.aim; if (!a || e.pointerId !== a.id) return;
      this.aim = null;
      if (cancel || a.power < 0.05 || this.sim.state !== 'rest' || this.phase !== 'play') return;
      shoot(this.sim, a.power, a.angle);
      this.shots++; this._emitHud();
      fx.shot(a.power);
      this._dust(this.sim.ball.x, this.sim.ball.y, 6, 0.6);
    };
    c.addEventListener('pointerup', (e) => end(e, false));
    c.addEventListener('pointercancel', (e) => end(e, true));
  }

  _maxDrag() { return Math.min(this.vw, this.vh) * 0.36; }

  _updateAim() {
    const a = this.aim;
    const dx = a.sx - a.cx, dy = a.sy - a.cy;
    const len = Math.hypot(dx, dy);
    const p = Math.min(1, len / this._maxDrag());
    if (len > 4) a.angle = Math.atan2(dy, dx);
    a.power = p;
    const step = Math.floor(p * 10);
    if (step !== a.lastTick) { a.lastTick = step; fx.tick(); }
    if (p >= 1 && !a.maxed) { a.maxed = true; fx.maxPower(); }
    if (p < 0.98) a.maxed = false;
  }

  // ---------- Boucle ----------
  _loop(now) {
    if (!this.running) return;
    const frame = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    if (!this.paused) {
      this.acc += frame;
      while (this.acc >= DT) { this.acc -= DT; this._tick(DT); }
      this._updateCamera(frame);
    }
    this._render();
    requestAnimationFrame(this._loop);
  }

  _tick(dt) {
    this.phaseT += dt;
    const sim = this.sim;
    if (this.phase === 'intro') {
      sim.t += dt;
      if (this.phaseT > 2.0) { this.phase = 'play'; this.phaseT = 0; this.hooks.onReady?.(); }
    } else if (this.phase === 'play') {
      const evs = stepSim(sim, dt);
      for (const e of evs) this._onEvent(e);
    } else if (this.phase === 'falling') {
      sim.t += dt;
      if (this.phaseT > 0.75) {
        resetToRest(sim);
        this.shots++; this._emitHud();
        this._text(sim.ball.x, sim.ball.y - 20, '+1', '#ff6b6b');
        this.phase = 'play'; this.phaseT = 0;
        if (this.shots >= this.max) this._lose();
      }
    } else if (this.phase === 'won') {
      stepSim(sim, dt);
      if (this.phaseT > 1.6 && !this.ended) {
        this.ended = true;
        const stars = starsFor(this.level, this.shots);
        this.hooks.onEnd?.({ won: true, shots: this.shots, stars });
      }
    } else if (this.phase === 'lost') {
      sim.t += dt;
    }
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= Math.exp(-p.drag * dt); p.vy *= Math.exp(-p.drag * dt);
      p.rot += p.vr * dt; p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
    for (let i = this.texts.length - 1; i >= 0; i--) { this.texts[i].life -= dt; if (this.texts[i].life <= 0) this.texts.splice(i, 1); }
  }

  _onEvent(e) {
    if (e.type === 'hit') {
      fx.hit(e.strength, e.mat);
      if (e.strength > 120) this._dust(e.x, e.y, Math.min(10, e.strength / 60), 0.5, '#fff');
    } else if (e.type === 'win') {
      this.phase = 'won'; this.phaseT = 0; this.ended = false;
      fx.clack(e.strength); setTimeout(() => fx.win(), 250);
      this._confetti(this.sim.calot.x, this.sim.calot.y);
      this._sparks(e.x, e.y);
    } else if (e.type === 'fall') {
      this.phase = 'falling'; this.phaseT = 0;
      this.fallFrom = { x: e.x, y: e.y, vx: e.vx * 0.25, vy: e.vy * 0.25, water: this._inLake(e.x, e.y) };
      fx.fall();
      if (this.fallFrom.water) this._splash(e.x, e.y); else this._dust(e.x, e.y, 10, 0.8);
    } else if (e.type === 'rest') {
      if (this.shots >= this.max) this._lose();
    }
  }

  _lose() {
    if (this.phase === 'lost') return;
    this.phase = 'lost'; this.phaseT = 0;
    fx.lose();
    setTimeout(() => this.hooks.onEnd?.({ won: false, shots: this.shots, stars: 0 }), 700);
  }

  _inLake(x, y) {
    return this.level.lakes.some(l => ((x - l.x) / l.rx) ** 2 + ((y - l.y) / l.ry) ** 2 <= 1);
  }

  // ---------- Particules ----------
  _p(o) { this.particles.push({ vr: 0, rot: 0, drag: 4, shape: 'dot', ...o, max: o.life }); }
  _dust(x, y, n, life, color) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, v = 20 + Math.random() * 60;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: life * (0.5 + Math.random() * 0.5), size: 1.5 + Math.random() * 2.5, color: color || shade(this.theme.dirt, -0.15) });
    }
  }
  _splash(x, y) {
    for (let i = 0; i < 18; i++) {
      const a = Math.random() * Math.PI * 2, v = 40 + Math.random() * 90;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 0.3, size: 1.5 + Math.random() * 2, color: '#d8f1ff' });
    }
    this._p({ x, y, vx: 0, vy: 0, life: 0.9, size: 4, shape: 'ring', color: '#ffffff', drag: 0 });
    this._p({ x, y, vx: 0, vy: 0, life: 1.2, size: 2, shape: 'ring', color: '#ffffff', drag: 0 });
  }
  _sparks(x, y) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, v = 80 + Math.random() * 120;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.4 + Math.random() * 0.2, size: 2, color: '#fff7c2', drag: 6 });
    }
  }
  _confetti(x, y) {
    const cols = ['#ffd34d', '#ff6b6b', '#4ecdc4', '#ffffff', '#a78bfa', '#7ee08a'];
    for (let i = 0; i < 70; i++) {
      const a = Math.random() * Math.PI * 2, v = 60 + Math.random() * 220;
      this._p({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1.2 + Math.random() * 0.8, size: 3 + Math.random() * 3,
        color: cols[i % cols.length], shape: 'rect', vr: (Math.random() - 0.5) * 12, rot: Math.random() * 6, drag: 2.2 });
    }
  }
  _text(x, y, str, color) { this.texts.push({ x, y, str, color, life: 1.1, max: 1.1 }); }

  // ---------- Caméra ----------
  _updateCamera(dt) {
    const L = this.level;
    this.overview += (this.overviewTarget - this.overview) * (1 - Math.exp(-dt * 8));
    const fitScale = Math.min(this.vw / 380, (this.vh - 120) / (L.height + 40));
    const s = this.baseScale + (fitScale - this.baseScale) * this.overview;
    this.cam.s = s;
    const halfH = this.vh / 2 / s;

    let ty;
    if (this.phase === 'intro') {
      const k = easeInOut(Math.max(0, Math.min(1, (this.phaseT - 0.5) / 1.4)));
      ty = this.introFrom + (this.sim.ball.y - this.introFrom) * k;
    } else {
      const b = this.sim.ball;
      ty = b.y - halfH * 0.18; // on voit plus loin devant (vers le haut)
      if (this.phase === 'won') ty = (b.y + this.sim.calot.y) / 2;
      if (this.aim) ty += Math.sin(this.aim.angle) * this.aim.power * halfH * 0.5;
      if (this.phase === 'falling') ty = this.fallFrom.y;
    }
    const minY = halfH - 40, maxY = L.height - halfH + 40;
    ty = minY > maxY ? L.height / 2 : Math.max(minY, Math.min(maxY, ty));
    const ty2 = ty + (L.height / 2 - ty) * this.overview;
    if (this.phase === 'intro') this.cam.y = ty2;
    else this.cam.y += (ty2 - this.cam.y) * (1 - Math.exp(-dt * 4.5));

    // horizontal : centré si le monde tient dans l'écran, sinon suit la bille
    const halfW = this.vw / 2 / s;
    let tx = WORLD_W / 2;
    if (halfW * 2 < WORLD_W + 20) tx = Math.max(halfW - 10, Math.min(WORLD_W - halfW + 10, this.sim.ball.x));
    this.cam.x += (tx - this.cam.x) * (1 - Math.exp(-dt * 4.5));
  }

  // ---------- Rendu ----------
  _render() {
    const g = this.ctx, { dpr, vw, vh } = this, { x: cx, y: cy, s } = this.cam;
    g.setTransform(dpr * s, 0, 0, dpr * s, dpr * (vw / 2 - cx * s), dpr * (vh / 2 - cy * s));
    const x0 = cx - vw / 2 / s, y0 = cy - vh / 2 / s, x1 = cx + vw / 2 / s, y1 = cy + vh / 2 / s;
    this.view = { x0, y0, x1, y1 };
    const t = this.sim.t;

    g.fillStyle = this.groundPat; g.fillRect(x0 - 2, y0 - 2, x1 - x0 + 4, y1 - y0 + 4);
    this._drawLakes(g, t);
    this._drawTrack(g);
    this._drawZones(g, t);
    this._drawBumps(g);
    this._drawStart(g);
    this._drawObstacles(g, t);
    this._drawCalot(g, t);
    this._drawAim(g);
    this._drawBall(g);
    this._drawParticles(g);
    this._drawTexts(g);
  }

  _drawLakes(g, t) {
    for (const l of this.level.lakes) {
      g.save();
      g.fillStyle = shade(this.theme.dirt, -0.05);
      g.beginPath(); g.ellipse(l.x, l.y, l.rx + 6, l.ry + 6, 0, 0, Math.PI * 2); g.fill();
      const grd = g.createRadialGradient(l.x, l.y, 0, l.x, l.y, Math.max(l.rx, l.ry));
      grd.addColorStop(0, shade(this.theme.water, -0.12)); grd.addColorStop(1, shade(this.theme.water, 0.1));
      g.fillStyle = grd;
      g.beginPath(); g.ellipse(l.x, l.y, l.rx, l.ry, 0, 0, Math.PI * 2); g.fill();
      g.clip();
      g.strokeStyle = 'rgba(255,255,255,0.22)'; g.lineWidth = 1.5;
      for (let i = 0; i < 6; i++) {
        const yy = l.y - l.ry + ((i * 22 + t * 9) % (l.ry * 2 + 20));
        g.beginPath();
        for (let x = l.x - l.rx; x <= l.x + l.rx; x += 6) {
          const y = yy + Math.sin(x * 0.07 + t * 1.8 + i) * 2.5;
          x === l.x - l.rx ? g.moveTo(x, y) : g.lineTo(x, y);
        }
        g.stroke();
      }
      g.restore();
    }
  }

  _drawTrack(g) {
    const tr = this.level.track;
    g.lineCap = 'round'; g.lineJoin = 'round';
    // ombre douce + rebord
    for (const sg of tr) if (!sg.bridge) {
      g.strokeStyle = 'rgba(0,0,0,0.16)'; g.lineWidth = sg.w + 16;
      g.beginPath(); g.moveTo(sg.a[0] + 2, sg.a[1] + 4); g.lineTo(sg.b[0] + 2, sg.b[1] + 4); g.stroke();
    }
    for (const sg of tr) if (!sg.bridge) {
      g.strokeStyle = this.theme.rim; g.lineWidth = sg.w + 9;
      g.beginPath(); g.moveTo(sg.a[0], sg.a[1]); g.lineTo(sg.b[0], sg.b[1]); g.stroke();
    }
    for (const sg of tr) if (sg.bridge) this._drawBridge(g, sg);
    for (const sg of tr) if (!sg.bridge) {
      g.strokeStyle = this.dirtPat; g.lineWidth = sg.w;
      g.beginPath(); g.moveTo(sg.a[0], sg.a[1]); g.lineTo(sg.b[0], sg.b[1]); g.stroke();
    }
    // léger creux au centre de la piste (aspect « piste tracée au doigt »)
    for (const sg of tr) if (!sg.bridge) {
      g.strokeStyle = 'rgba(255,255,255,0.08)'; g.lineWidth = sg.w * 0.55;
      g.beginPath(); g.moveTo(sg.a[0], sg.a[1]); g.lineTo(sg.b[0], sg.b[1]); g.stroke();
    }
  }

  _drawBridge(g, sg) {
    const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], len = Math.hypot(dx, dy);
    g.save();
    g.translate(sg.a[0], sg.a[1]); g.rotate(Math.atan2(dy, dx));
    const hw = sg.w / 2;
    g.fillStyle = 'rgba(0,0,0,0.28)'; g.fillRect(-6, -hw + 6, len + 12, sg.w + 4);
    g.fillStyle = '#5b3a1e'; g.fillRect(-8, -hw - 4, len + 16, 5); g.fillRect(-8, hw - 1, len + 16, 5);
    const r = rng(len | 0);
    for (let x = -6; x < len + 6; x += 9) {
      const v = r() * 0.12 - 0.06;
      g.fillStyle = shade('#b07a45', v); g.fillRect(x, -hw, 7.5, sg.w);
      g.fillStyle = 'rgba(0,0,0,0.18)'; g.fillRect(x + 1.5, -hw + 2, 0.8, 0.8); g.fillRect(x + 1.5, hw - 3, 0.8, 0.8);
    }
    g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(-6, -hw, len + 12, 2);
    g.restore();
  }

  _drawZones(g, t) {
    for (const z of this.level.sand) {
      g.fillStyle = this.sandPat;
      g.beginPath(); g.roundRect ? g.roundRect(z.x, z.y, z.w, z.h, 14) : g.rect(z.x, z.y, z.w, z.h); g.fill();
      g.strokeStyle = 'rgba(160,120,60,0.35)'; g.lineWidth = 1; g.stroke();
    }
    for (const z of this.level.slopes) {
      g.save();
      g.beginPath(); g.rect(z.x, z.y, z.w, z.h); g.clip();
      g.fillStyle = 'rgba(0,0,0,0.07)'; g.fillRect(z.x, z.y, z.w, z.h);
      const ang = Math.atan2(z.fy, z.fx);
      const cxz = z.x + z.w / 2, cyz = z.y + z.h / 2;
      g.translate(cxz, cyz); g.rotate(ang);
      const span = Math.hypot(z.w, z.h);
      const off = (t * 22) % 22;
      g.strokeStyle = 'rgba(255,255,255,0.45)'; g.lineWidth = 3; g.lineCap = 'round';
      for (let x = -span / 2 - 22 + off; x < span / 2; x += 22) {
        for (let y = -span / 2; y < span / 2; y += 26) {
          g.beginPath(); g.moveTo(x - 4, y - 6); g.lineTo(x + 3, y); g.lineTo(x - 4, y + 6); g.stroke();
        }
      }
      g.restore();
    }
  }

  _drawBumps(g) {
    for (const b of this.level.bumps) {
      const up = b.h > 0, r = b.r;
      const lx = b.x - r * 0.3, ly = b.y - r * 0.3, sx = b.x + r * 0.3, sy = b.y + r * 0.3;
      let grd = g.createRadialGradient(up ? sx : lx, up ? sy : ly, 0, b.x, b.y, r);
      grd.addColorStop(0, 'rgba(70,40,10,0.32)'); grd.addColorStop(1, 'rgba(70,40,10,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); g.fill();
      grd = g.createRadialGradient(up ? lx : sx, up ? ly : sy, 0, b.x, b.y, r * 0.95);
      grd.addColorStop(0, 'rgba(255,250,235,0.55)'); grd.addColorStop(0.6, 'rgba(255,250,235,0.1)'); grd.addColorStop(1, 'rgba(255,250,235,0)');
      g.fillStyle = grd; g.beginPath(); g.arc(b.x, b.y, r, 0, Math.PI * 2); g.fill();
      g.strokeStyle = up ? 'rgba(120,80,30,0.18)' : 'rgba(60,40,20,0.25)'; g.lineWidth = 1;
      g.setLineDash([3, 4]);
      g.beginPath(); g.arc(b.x, b.y, r * 0.55, 0, Math.PI * 2); g.stroke();
      g.setLineDash([]);
    }
  }

  _drawStart(g) {
    const [x, y] = this.level.start;
    g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 2;
    g.setLineDash([4, 4]); g.beginPath(); g.arc(x, y, 15, 0, Math.PI * 2); g.stroke(); g.setLineDash([]);
  }

  _drawObstacles(g, t) {
    for (const o of this.level.obstacles) {
      const shapes = obstacleShapes(o, t);
      const moving = !!o.move;
      for (const sh of shapes) this._shape(g, sh, 'shadow');
      for (const sh of shapes) {
        if (o.type === 'post') this._post(g, sh, moving);
        else if (o.type === 'log') this._log(g, sh, moving ? '#c0392b' : '#8b5a2b');
        else if (o.type === 'mill') sh.kind === 'circle' ? this._hub(g, sh) : this._log(g, sh, '#f1e3c6', true);
      }
    }
  }

  _shape(g, sh) {
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.strokeStyle = 'rgba(0,0,0,0.25)';
    if (sh.kind === 'circle') { g.beginPath(); g.arc(sh.x + 3, sh.y + 4, sh.r, 0, Math.PI * 2); g.fill(); }
    else { g.lineCap = 'round'; g.lineWidth = sh.r * 2; g.beginPath(); g.moveTo(sh.ax + 3, sh.ay + 4); g.lineTo(sh.bx + 3, sh.by + 4); g.stroke(); }
  }

  _post(g, sh, moving) {
    const base = moving ? '#e74c3c' : '#9aa3ad';
    const grd = g.createRadialGradient(sh.x - sh.r * 0.35, sh.y - sh.r * 0.35, 1, sh.x, sh.y, sh.r);
    grd.addColorStop(0, shade(base, 0.25)); grd.addColorStop(1, shade(base, -0.18));
    g.fillStyle = grd; g.beginPath(); g.arc(sh.x, sh.y, sh.r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = moving ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.15)'; g.lineWidth = moving ? 2 : 1;
    g.beginPath(); g.arc(sh.x, sh.y, sh.r * 0.55, 0, Math.PI * 2); g.stroke();
  }

  _log(g, sh, color, striped) {
    g.lineCap = 'round';
    g.strokeStyle = shade(color, -0.15); g.lineWidth = sh.r * 2;
    g.beginPath(); g.moveTo(sh.ax, sh.ay); g.lineTo(sh.bx, sh.by); g.stroke();
    g.strokeStyle = color; g.lineWidth = sh.r * 1.4;
    g.beginPath(); g.moveTo(sh.ax, sh.ay); g.lineTo(sh.bx, sh.by); g.stroke();
    if (striped) {
      g.strokeStyle = '#e74c3c'; g.lineWidth = sh.r * 1.4; g.setLineDash([6, 6]);
      g.beginPath(); g.moveTo(sh.ax, sh.ay); g.lineTo(sh.bx, sh.by); g.stroke(); g.setLineDash([]);
    }
    g.strokeStyle = 'rgba(255,255,255,0.3)'; g.lineWidth = sh.r * 0.4;
    const nx = sh.by - sh.ay, ny = -(sh.bx - sh.ax), nl = Math.hypot(nx, ny) || 1, o = sh.r * 0.35;
    g.beginPath(); g.moveTo(sh.ax - (nx / nl) * o, sh.ay - (ny / nl) * o); g.lineTo(sh.bx - (nx / nl) * o, sh.by - (ny / nl) * o); g.stroke();
  }

  _hub(g, sh) {
    g.fillStyle = '#5b3a1e'; g.beginPath(); g.arc(sh.x, sh.y, sh.r + 1, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(sh.x, sh.y, sh.r * 0.5, 0, Math.PI * 2); g.fill();
  }

  _marble(g, x, y, r, color, spin, dir, alpha = 1, glass = true) {
    g.save();
    g.globalAlpha = alpha;
    g.fillStyle = 'rgba(0,0,0,0.3)';
    g.beginPath(); g.ellipse(x + r * 0.25, y + r * 0.4, r * 0.95, r * 0.8, 0, 0, Math.PI * 2); g.fill();
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grd.addColorStop(0, shade(color, 0.35)); grd.addColorStop(0.55, color); grd.addColorStop(1, shade(color, -0.3));
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    // œil de chat qui tourne avec le roulement
    g.save(); g.beginPath(); g.arc(x, y, r * 0.96, 0, Math.PI * 2); g.clip();
    const c = Math.cos(spin), front = Math.sin(spin) > 0;
    const ox = Math.cos(dir) * c * r * 0.75, oy = Math.sin(dir) * c * r * 0.75;
    g.translate(x + ox, y + oy); g.rotate(dir + Math.PI / 2);
    g.globalAlpha = alpha * (front ? 0.85 : 0.35);
    g.fillStyle = glass ? 'rgba(255,255,255,0.75)' : shade(color, -0.35);
    g.beginPath(); g.ellipse(0, 0, r * 0.95, r * 0.22 * Math.abs(Math.sin(spin)) + r * 0.05, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = shade(color, -0.25);
    g.beginPath(); g.ellipse(0, 0, r * 0.7, r * 0.1 * Math.abs(Math.sin(spin)) + r * 0.03, 0, 0, Math.PI * 2); g.fill();
    g.restore();
    g.globalAlpha = alpha;
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath(); g.ellipse(x - r * 0.38, y - r * 0.42, r * 0.28, r * 0.17, -0.7, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.35)';
    g.beginPath(); g.arc(x + r * 0.4, y + r * 0.45, r * 0.12, 0, Math.PI * 2); g.fill();
    g.restore();
  }

  _drawCalot(g, t) {
    const c = this.sim.calot;
    if (this.phase !== 'won') {
      const pulse = (Math.sin(t * 3) + 1) / 2;
      g.strokeStyle = `rgba(255,211,77,${0.25 + pulse * 0.35})`; g.lineWidth = 3;
      g.beginPath(); g.arc(c.x, c.y, CALOT_R + 6 + pulse * 4, 0, Math.PI * 2); g.stroke();
    }
    const dir = Math.atan2(c.vy, c.vx) || 0;
    this._marble(g, c.x, c.y, CALOT_R, '#f0c46c', c.spin, dir, 1, false);
  }

  _drawAim(g) {
    const a = this.aim, b = this.sim.ball;
    if (!a || a.power < 0.02) return;
    const col = `hsl(${120 - a.power * 120}, 85%, 55%)`;
    // jauge circulaire
    g.lineWidth = 4; g.lineCap = 'round';
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.arc(b.x, b.y, BALL_R + 9, 0, Math.PI * 2); g.stroke();
    g.strokeStyle = col; g.beginPath(); g.arc(b.x, b.y, BALL_R + 9, -Math.PI / 2, -Math.PI / 2 + a.power * Math.PI * 2); g.stroke();

    if (this.diff.preview > 0) {
      const pr = predict(this.sim, a.power, a.angle, this.diff.preview);
      const pts = pr.pts;
      for (let i = 6; i < pts.length; i += 5) {
        const k = 1 - i / pts.length;
        g.fillStyle = `rgba(255,255,255,${0.25 + 0.6 * k})`;
        g.beginPath(); g.arc(pts[i].x, pts[i].y, 1.6 + k * 1.4, 0, Math.PI * 2); g.fill();
      }
      const last = pts[pts.length - 1];
      if (pr.end === 'fallen') {
        g.strokeStyle = '#ff6b6b'; g.lineWidth = 2.5;
        g.beginPath(); g.moveTo(last.x - 5, last.y - 5); g.lineTo(last.x + 5, last.y + 5); g.moveTo(last.x + 5, last.y - 5); g.lineTo(last.x - 5, last.y + 5); g.stroke();
      } else if (pr.end === 'won') {
        g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(last.x, last.y, 5, 0, Math.PI * 2); g.fill();
      }
    }
    // flèche de direction
    const L = 26 + a.power * 34, ex = b.x + Math.cos(a.angle) * L, ey = b.y + Math.sin(a.angle) * L;
    const sx = b.x + Math.cos(a.angle) * (BALL_R + 14), sy = b.y + Math.sin(a.angle) * (BALL_R + 14);
    g.strokeStyle = col; g.lineWidth = 3.5;
    g.beginPath(); g.moveTo(sx, sy); g.lineTo(ex, ey); g.stroke();
    g.fillStyle = col; g.save(); g.translate(ex, ey); g.rotate(a.angle);
    g.beginPath(); g.moveTo(7, 0); g.lineTo(-5, -6); g.lineTo(-5, 6); g.closePath(); g.fill(); g.restore();
  }

  _drawBall(g) {
    const b = this.sim.ball, color = this.profile?.color || '#3a86ff';
    const dir = Math.atan2(b.vy, b.vx) || this._lastDir || 0;
    if (b.vx || b.vy) this._lastDir = dir;
    if (this.phase === 'falling') {
      const k = Math.min(1, this.phaseT / 0.6), f = this.fallFrom;
      const x = f.x + f.vx * k * 0.5, y = f.y + f.vy * k * 0.5;
      if (k < 1) this._marble(g, x, y, BALL_R * (1 - 0.6 * k), color, b.spin + k * 4, dir, 1 - k);
      return;
    }
    if (this.phase === 'play' && this.sim.state === 'rest' && !this.aim) {
      const p = (Math.sin(this.sim.t * 4) + 1) / 2;
      g.strokeStyle = `rgba(255,255,255,${0.2 + p * 0.4})`; g.lineWidth = 2;
      g.beginPath(); g.arc(b.x, b.y, BALL_R + 5 + p * 3, 0, Math.PI * 2); g.stroke();
    }
    this._marble(g, b.x, b.y, BALL_R, color, b.spin, dir);
  }

  _drawParticles(g) {
    for (const p of this.particles) {
      const k = Math.max(0, p.life / p.max);
      g.globalAlpha = Math.min(1, k * 1.5);
      if (p.shape === 'ring') {
        g.strokeStyle = p.color; g.lineWidth = 1.5;
        g.beginPath(); g.arc(p.x, p.y, p.size + (1 - k) * 26, 0, Math.PI * 2); g.stroke();
      } else if (p.shape === 'rect') {
        g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color;
        g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); g.restore();
      } else {
        g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (0.5 + k * 0.5), 0, Math.PI * 2); g.fill();
      }
    }
    g.globalAlpha = 1;
  }

  _drawTexts(g) {
    g.textAlign = 'center'; g.font = '800 16px system-ui, sans-serif';
    for (const tx of this.texts) {
      const k = tx.life / tx.max;
      g.globalAlpha = Math.min(1, k * 2);
      g.fillStyle = 'rgba(0,0,0,0.4)'; g.fillText(tx.str, tx.x + 1, tx.y - (1 - k) * 24 + 1);
      g.fillStyle = tx.color; g.fillText(tx.str, tx.x, tx.y - (1 - k) * 24);
    }
    g.globalAlpha = 1;
  }
}
