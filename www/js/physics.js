// Moteur physique du jeu de billes : pur (sans DOM), réutilisé par le jeu et par le vérificateur de niveaux.

export const BALL_R = 9;
export const CALOT_R = 16;
export const MAX_SPEED = 820;      // unités/s pour un tir à 100 %
const ROLL_DECEL = 170;            // freinage de roulement (unités/s²)
const SAND_DECEL = 760;
const DAMPING = 0.45;              // amortissement proportionnel (1/s)
const STOP_SPEED = 7;
const WALL_E = 0.62;               // restitution bois/pierre
const CALOT_MASS = 3;

// ---------- Géométrie ----------
export function closestOnSeg(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy;
  let u = l2 ? ((px - ax) * dx + (py - ay) * dy) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return { x: ax + dx * u, y: ay + dy * u, u };
}

export function onTrack(level, x, y) {
  for (const s of level.track) {
    const c = closestOnSeg(x, y, s.a[0], s.a[1], s.b[0], s.b[1]);
    const half = s.w / 2;
    const dx = x - c.x, dy = y - c.y;
    if (dx * dx + dy * dy <= half * half) return true;
  }
  return false;
}

const inRect = (x, y, r) => x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;

// Distance parcourue le long du tracé (sert au vérificateur et à la caméra)
export function progressAlong(level, x, y) {
  let best = Infinity, acc = 0, prog = 0;
  for (const s of level.track) {
    const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
    const c = closestOnSeg(x, y, s.a[0], s.a[1], s.b[0], s.b[1]);
    const d = Math.hypot(x - c.x, y - c.y);
    if (d < best) { best = d; prog = acc + c.u * len; }
    acc += len;
  }
  return { prog, total: acc };
}

// ---------- Obstacles (éventuellement mobiles) ----------
// Une forme est soit un cercle {kind:'circle', x, y, r}, soit une capsule {kind:'capsule', ax, ay, bx, by, r}.
export function obstacleShapes(o, t) {
  if (o.type === 'post') {
    let x = o.x, y = o.y;
    if (o.move) {
      const s = Math.sin((t / o.move.period) * Math.PI * 2 + (o.move.phase || 0));
      x += o.move.dx * s; y += o.move.dy * s;
    }
    return [{ kind: 'circle', x, y, r: o.r }];
  }
  if (o.type === 'log') {
    let ax = o.a[0], ay = o.a[1], bx = o.b[0], by = o.b[1];
    if (o.move) {
      const s = Math.sin((t / o.move.period) * Math.PI * 2 + (o.move.phase || 0));
      ax += o.move.dx * s; bx += o.move.dx * s; ay += o.move.dy * s; by += o.move.dy * s;
    }
    return [{ kind: 'capsule', ax, ay, bx, by, r: o.r }];
  }
  if (o.type === 'mill') {
    const out = [];
    const ang = (o.angle || 0) + t * o.speed;
    for (let i = 0; i < o.blades; i++) {
      const a = ang + (i * Math.PI) / o.blades;
      const cx = Math.cos(a) * o.len, cy = Math.sin(a) * o.len;
      out.push({ kind: 'capsule', ax: o.x - cx, ay: o.y - cy, bx: o.x + cx, by: o.y + cy, r: o.r });
    }
    out.push({ kind: 'circle', x: o.x, y: o.y, r: o.r + 3 });
    return out;
  }
  return [];
}

function shapeContact(sh, x, y) {
  if (sh.kind === 'circle') return { cx: sh.x, cy: sh.y, u: 0 };
  const c = closestOnSeg(x, y, sh.ax, sh.ay, sh.bx, sh.by);
  return { cx: c.x, cy: c.y, u: c.u };
}

function pointOnShape(sh, u) {
  return sh.kind === 'circle' ? { x: sh.x, y: sh.y } : { x: sh.ax + (sh.bx - sh.ax) * u, y: sh.ay + (sh.by - sh.ay) * u };
}

// ---------- Simulation ----------
export function createSim(level, t0 = 0) {
  return {
    level,
    t: t0,
    ball: { x: level.start[0], y: level.start[1], vx: 0, vy: 0, spin: 0 },
    calot: { x: level.calot[0], y: level.calot[1], vx: 0, vy: 0, spin: 0 },
    state: 'rest',  // rest | moving | fallen | won
    restPos: { x: level.start[0], y: level.start[1] },
  };
}

export function cloneSim(sim) {
  return {
    level: sim.level, t: sim.t, state: sim.state,
    ball: { ...sim.ball }, calot: { ...sim.calot }, restPos: { ...sim.restPos },
  };
}

export function shoot(sim, power, angle) {
  const v = Math.max(0, Math.min(1, power)) * MAX_SPEED;
  sim.restPos = { x: sim.ball.x, y: sim.ball.y };
  sim.ball.vx = Math.cos(angle) * v;
  sim.ball.vy = Math.sin(angle) * v;
  sim.state = 'moving';
}

export function resetToRest(sim) {
  sim.ball.x = sim.restPos.x; sim.ball.y = sim.restPos.y;
  sim.ball.vx = sim.ball.vy = 0;
  sim.state = 'rest';
}

// Accélération due au terrain (bosses, creux, pentes) au point (x, y)
function terrainAccel(level, x, y) {
  let ax = 0, ay = 0;
  for (const b of level.bumps || []) {
    const dx = x - b.x, dy = y - b.y, d = Math.hypot(dx, dy);
    if (d < b.r && d > 0.001) {
      const k = b.h * Math.sin((Math.PI * d) / b.r);
      ax += (dx / d) * k; ay += (dy / d) * k;
    }
  }
  for (const s of level.slopes || []) {
    if (inRect(x, y, s)) { ax += s.fx; ay += s.fy; }
  }
  return { ax, ay };
}

function collideShapes(sim, body, br, dt, events) {
  const level = sim.level;
  for (const o of level.obstacles || []) {
    const shapes = obstacleShapes(o, sim.t);
    const moving = !!(o.move || o.type === 'mill');
    const prev = moving ? obstacleShapes(o, sim.t - dt) : null;
    for (let i = 0; i < shapes.length; i++) {
      const sh = shapes[i];
      const c = shapeContact(sh, body.x, body.y);
      let dx = body.x - c.cx, dy = body.y - c.cy;
      const d = Math.hypot(dx, dy), minD = sh.r + br;
      if (d >= minD) continue;
      let nx, ny;
      if (d < 1e-6) { nx = 0; ny = -1; } else { nx = dx / d; ny = dy / d; }
      let ovx = 0, ovy = 0;
      if (prev) {
        const p1 = pointOnShape(sh, c.u), p0 = pointOnShape(prev[i], c.u);
        ovx = (p1.x - p0.x) / dt; ovy = (p1.y - p0.y) / dt;
      }
      body.x += nx * (minD - d); body.y += ny * (minD - d);
      const rvx = body.vx - ovx, rvy = body.vy - ovy;
      const dot = rvx * nx + rvy * ny;
      if (dot < 0) {
        const e = o.bouncy ? 1.05 : WALL_E;
        body.vx = rvx - (1 + e) * dot * nx + ovx;
        body.vy = rvy - (1 + e) * dot * ny + ovy;
        if (events && body === sim.ball) events.push({ type: 'hit', strength: -dot, x: c.cx + nx * sh.r, y: c.cy + ny * sh.r, mat: o.type });
      }
    }
  }
}

function integrateBody(sim, body, br, dt, events) {
  const level = sim.level;
  const sp = Math.hypot(body.vx, body.vy);
  const n = Math.max(1, Math.ceil((sp * dt) / (br * 0.4)));
  const h = dt / n;
  for (let k = 0; k < n; k++) {
    const ta = terrainAccel(level, body.x, body.y);
    body.vx += ta.ax * h; body.vy += ta.ay * h;
    const s = Math.hypot(body.vx, body.vy);
    if (s > 0) {
      const onSand = (level.sand || []).some(r => inRect(body.x, body.y, r));
      const dec = (onSand ? SAND_DECEL : ROLL_DECEL) * h + s * DAMPING * h;
      const ns = Math.max(0, s - dec);
      body.vx *= ns / s; body.vy *= ns / s;
    }
    body.x += body.vx * h; body.y += body.vy * h;
    body.spin += (Math.hypot(body.vx, body.vy) * h) / br;
    collideShapes(sim, body, br, h, events);
  }
}

// Avance la simulation de dt secondes. Renvoie la liste des évènements.
export function stepSim(sim, dt) {
  const events = [];
  sim.t += dt;
  if (sim.state === 'moving' || sim.state === 'won') {
    integrateBody(sim, sim.ball, BALL_R, dt, events);
  }
  if (sim.state === 'won') {
    integrateBody(sim, sim.calot, CALOT_R, dt, null);
    return events;
  }
  if (sim.state !== 'moving') return events;

  const b = sim.ball;
  // Contact avec le calot = victoire
  const c = sim.calot;
  const dx = b.x - c.x, dy = b.y - c.y, d = Math.hypot(dx, dy);
  if (d < BALL_R + CALOT_R) {
    const nx = dx / (d || 1), ny = dy / (d || 1);
    b.x = c.x + nx * (BALL_R + CALOT_R); b.y = c.y + ny * (BALL_R + CALOT_R);
    const rel = (b.vx - c.vx) * nx + (b.vy - c.vy) * ny;
    if (rel < 0) {
      const j = (-(1 + 0.85) * rel) / (1 + 1 / CALOT_MASS);
      b.vx += j * nx; b.vy += j * ny;
      c.vx -= (j / CALOT_MASS) * nx; c.vy -= (j / CALOT_MASS) * ny;
    }
    sim.state = 'won';
    events.push({ type: 'win', strength: -rel, x: c.x + nx * CALOT_R, y: c.y + ny * CALOT_R });
    return events;
  }

  if (!onTrack(sim.level, b.x, b.y)) {
    sim.state = 'fallen';
    events.push({ type: 'fall', x: b.x, y: b.y, vx: b.vx, vy: b.vy });
    return events;
  }

  const sp = Math.hypot(b.vx, b.vy);
  if (sp < STOP_SPEED) {
    const ta = terrainAccel(sim.level, b.x, b.y);
    if (Math.hypot(ta.ax, ta.ay) <= ROLL_DECEL) {
      b.vx = b.vy = 0;
      sim.state = 'rest';
      events.push({ type: 'rest' });
    }
  }
  return events;
}

// Prévisualisation de trajectoire : liste de points
export function predict(sim, power, angle, seconds, dt = 1 / 60) {
  const s = cloneSim(sim);
  shoot(s, power, angle);
  const pts = [{ x: s.ball.x, y: s.ball.y }];
  let end = 'none';
  for (let t = 0; t < seconds; t += dt) {
    stepSim(s, dt);
    pts.push({ x: s.ball.x, y: s.ball.y });
    if (s.state !== 'moving') { end = s.state; break; }
  }
  return { pts, end };
}
