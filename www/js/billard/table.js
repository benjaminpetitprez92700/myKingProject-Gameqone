// Billard américain (8-ball) : physique pure de la table, réutilisée par le jeu et par l'IA.

export const W = 500, H = 1000;      // surface de jeu (rapport 1:2)
export const R = 11.5;               // rayon des billes
export const VMAX = 2300;            // vitesse de la blanche pour une queue à 100 %
const DECEL = 230, DAMP = 0.22, STOP = 5;
const E_BALL = 0.95, E_CUSHION = 0.76;
const MOUTH_C = 32, MOUTH_S = 25;    // ouverture des poches (coin, milieu)

export const POCKETS = [
  { x: -5, y: -5, r: 25 }, { x: W + 5, y: -5, r: 25 },
  { x: -11, y: H / 2, r: 23 }, { x: W + 11, y: H / 2, r: 23 },
  { x: -5, y: H + 5, r: 25 }, { x: W + 5, y: H + 5, r: 25 },
];
// pointes de bande (« mâchoires ») aux entrées des poches
const JAWS = [
  [MOUTH_C, 0], [0, MOUTH_C], [W - MOUTH_C, 0], [W, MOUTH_C],
  [0, H - MOUTH_C], [MOUTH_C, H], [W, H - MOUTH_C], [W - MOUTH_C, H],
  [0, H / 2 - MOUTH_S], [0, H / 2 + MOUTH_S], [W, H / 2 - MOUTH_S], [W, H / 2 + MOUTH_S],
].map(([x, y]) => ({ x, y, r: 3 }));

export const HEAD_Y = H * 0.75;      // ligne de tête (zone de casse en bas)
export const FOOT = { x: W / 2, y: H * 0.25 };

export const groupOf = (id) => (id === 0 ? 'cue' : id === 8 ? 'eight' : id < 8 ? 'solids' : 'stripes');

export function rackBalls(rand = Math.random) {
  const balls = [];
  for (let id = 0; id < 16; id++) balls.push({ id, x: 0, y: 0, vx: 0, vy: 0, in: false });
  balls[0].x = W / 2; balls[0].y = H * 0.82;
  // triangle : pointe vers la blanche, 8 au centre, un coin plein et un coin rayé
  const others = [1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15];
  for (let i = others.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [others[i], others[j]] = [others[j], others[i]]; }
  const order = new Array(15);
  order[4] = 8;
  const cornerA = others.findIndex((id) => id < 8), solid = others.splice(cornerA, 1)[0];
  const cornerB = others.findIndex((id) => id > 8), stripe = others.splice(cornerB, 1)[0];
  if (rand() < 0.5) { order[10] = solid; order[14] = stripe; } else { order[10] = stripe; order[14] = solid; }
  let k = 0;
  for (let i = 0; i < 15; i++) if (order[i] === undefined) order[i] = others[k++];
  const dx = R * 2 + 0.3, dy = Math.sqrt(3) * (R + 0.15);
  let idx = 0;
  for (let row = 0; row < 5; row++) {
    for (let c = 0; c <= row; c++) {
      const b = balls[order[idx++]];
      b.x = FOOT.x + (c - row / 2) * dx;
      b.y = FOOT.y - row * dy;
    }
  }
  return balls;
}

export function cloneBalls(balls) { return balls.map((b) => ({ ...b })); }
export const moving = (balls) => balls.some((b) => !b.in && (b.vx || b.vy));

function cushion(b, ev) {
  let hit = 0;
  const nearCornerX = b.x < MOUTH_C || b.x > W - MOUTH_C;
  const nearCornerY = b.y < MOUTH_C || b.y > H - MOUTH_C;
  const nearSide = Math.abs(b.y - H / 2) < MOUTH_S;
  if (!nearCornerY && !nearSide) {
    if (b.x < R && b.vx < 0) { b.x = R; b.vx = -b.vx * E_CUSHION; b.vy *= 0.97; hit = -b.vx; }
    else if (b.x > W - R && b.vx > 0) { b.x = W - R; b.vx = -b.vx * E_CUSHION; b.vy *= 0.97; hit = b.vx; }
  }
  if (!nearCornerX) {
    if (b.y < R && b.vy < 0) { b.y = R; b.vy = -b.vy * E_CUSHION; b.vx *= 0.97; hit = -b.vy; }
    else if (b.y > H - R && b.vy > 0) { b.y = H - R; b.vy = -b.vy * E_CUSHION; b.vx *= 0.97; hit = b.vy; }
  }
  for (const j of JAWS) {
    const dx = b.x - j.x, dy = b.y - j.y, d = Math.hypot(dx, dy), m = R + j.r;
    if (d < m && d > 0) {
      const nx = dx / d, ny = dy / d; b.x = j.x + nx * m; b.y = j.y + ny * m;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) { b.vx -= (1 + E_CUSHION) * dot * nx; b.vy -= (1 + E_CUSHION) * dot * ny; hit = -dot; }
    }
  }
  if (hit > 30 && ev) ev.push({ type: 'cushion', v: hit, id: b.id });
}

// Avance de dt secondes. info = { firstHit, pocketed: [], cueIn } est complété au fil du coup.
export function step(balls, dt, info, ev) {
  let vmax = 0;
  for (const b of balls) if (!b.in) vmax = Math.max(vmax, Math.abs(b.vx) + Math.abs(b.vy));
  if (!vmax) return false;
  const n = Math.max(1, Math.ceil((vmax * dt) / (R * 0.5)));
  const h = dt / n;
  for (let s = 0; s < n; s++) {
    for (const b of balls) {
      if (b.in || (!b.vx && !b.vy)) continue;
      b.x += b.vx * h; b.y += b.vy * h;
      if (b.roll) b.roll(b.vx * h, b.vy * h);
    }
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i]; if (a.in) continue;
      for (let j = i + 1; j < balls.length; j++) {
        const b = balls[j]; if (b.in) continue;
        if (!a.vx && !a.vy && !b.vx && !b.vy) continue;
        const dx = b.x - a.x, dy = b.y - a.y;
        if (Math.abs(dx) > 2 * R || Math.abs(dy) > 2 * R) continue;
        const d = Math.hypot(dx, dy);
        if (d >= 2 * R || d === 0) continue;
        const nx = dx / d, ny = dy / d, ov = (2 * R - d) / 2;
        a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
        const rel = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
        if (rel > 0) {
          const jimp = ((1 + E_BALL) / 2) * rel;
          a.vx -= jimp * nx; a.vy -= jimp * ny; b.vx += jimp * nx; b.vy += jimp * ny;
          if (info && info.firstHit == null && (a.id === 0 || b.id === 0)) info.firstHit = a.id === 0 ? b.id : a.id;
          if (ev && rel > 25) ev.push({ type: 'ball', v: rel, x: a.x + nx * R, y: a.y + ny * R });
        }
      }
    }
    for (const b of balls) {
      if (b.in) continue;
      cushion(b, ev);
      for (const p of POCKETS) {
        if (Math.hypot(b.x - p.x, b.y - p.y) < p.r || b.x < -R * 2 || b.x > W + R * 2 || b.y < -R * 2 || b.y > H + R * 2) {
          b.in = true; b.inT = 0; b.pocket = p; b.vx = b.vy = 0;
          if (info) { if (b.id === 0) info.cueIn = true; else info.pocketed.push(b.id); }
          if (ev) ev.push({ type: 'pocket', id: b.id, x: p.x, y: p.y });
          break;
        }
      }
    }
  }
  // frottement du tapis
  for (const b of balls) {
    if (b.in || (!b.vx && !b.vy)) continue;
    const sp = Math.hypot(b.vx, b.vy);
    const ns = Math.max(0, sp - (DECEL + sp * DAMP) * dt);
    if (ns < STOP) { b.vx = b.vy = 0; } else { b.vx *= ns / sp; b.vy *= ns / sp; }
  }
  return true;
}

export function shoot(balls, power, angle) {
  const c = balls[0];
  c.vx = Math.cos(angle) * power * VMAX; c.vy = Math.sin(angle) * power * VMAX;
}

// Simule un coup complet (pour l'IA)
export function simulate(balls, power, angle, maxT = 9) {
  const bs = cloneBalls(balls);
  for (const b of bs) delete b.roll;
  const info = { firstHit: null, pocketed: [], cueIn: false };
  shoot(bs, power, angle);
  const dt = 1 / 120;
  for (let t = 0; t < maxT; t += dt) if (!step(bs, dt, info, null)) break;
  return { balls: bs, info };
}

// Position libre la plus proche pour replacer une bille
export function freeSpot(balls, x, y, ignoreId) {
  const ok = (px, py) => px >= R && px <= W - R && py >= R && py <= H - R &&
    balls.every((b) => b.in || b.id === ignoreId || Math.hypot(b.x - px, b.y - py) >= 2 * R + 0.5);
  if (ok(x, y)) return { x, y };
  for (let rad = 4; rad < 400; rad += 4) for (let a = 0; a < Math.PI * 2; a += 0.3) {
    const px = x + Math.cos(a) * rad, py = y + Math.sin(a) * rad;
    if (ok(px, py)) return { x: px, y: py };
  }
  return { x, y };
}

// Lancer de rayon pour le guide de visée : premier contact de la blanche
export function aimRay(balls, angle) {
  const c = balls[0], dx = Math.cos(angle), dy = Math.sin(angle);
  let best = Infinity, target = null;
  for (const b of balls) {
    if (b.in || b.id === 0) continue;
    const fx = b.x - c.x, fy = b.y - c.y;
    const t = fx * dx + fy * dy;
    if (t <= 0) continue;
    const perp2 = fx * fx + fy * fy - t * t, rr = 4 * R * R;
    if (perp2 > rr) continue;
    const tt = t - Math.sqrt(rr - perp2);
    if (tt < best) { best = tt; target = b; }
  }
  // bandes
  let tw = Infinity;
  if (dx > 0) tw = Math.min(tw, (W - R - c.x) / dx); if (dx < 0) tw = Math.min(tw, (R - c.x) / dx);
  if (dy > 0) tw = Math.min(tw, (H - R - c.y) / dy); if (dy < 0) tw = Math.min(tw, (R - c.y) / dy);
  if (!target || tw < best) return { t: tw, x: c.x + dx * tw, y: c.y + dy * tw, target: null };
  const gx = c.x + dx * best, gy = c.y + dy * best;
  const nx = (target.x - gx) / (2 * R), ny = (target.y - gy) / (2 * R);
  return { t: best, x: gx, y: gy, target, nx, ny, cut: nx * dx + ny * dy };
}
