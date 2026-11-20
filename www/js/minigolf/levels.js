// Données des parcours de mini golf. Monde : 360 unités de large, la balle part du bas et le trou est en haut.
// track : liste de points [x, y, largeur, 'bridge'?] ; chaque point (sauf le premier) ferme un segment.

function build(def) {
  const track = [];
  for (let i = 1; i < def.path.length; i++) {
    const [x, y, w, flag] = def.path[i];
    const [px, py] = def.path[i - 1];
    track.push({ a: [px, py], b: [x, y], w, bridge: flag === 'bridge' });
  }
  return {
    bumps: [], slopes: [], sand: [], obstacles: [], lakes: [],
    ...def,
    track,
  };
}

const post = (x, y, r = 13, move) => ({ type: 'post', x, y, r, move });
const log = (a, b, r = 7, move) => ({ type: 'log', a, b, r, move });
const mill = (x, y, len, speed, blades = 2, r = 5) => ({ type: 'mill', x, y, len, speed, blades, r });
const bump = (x, y, r, h = 1000) => ({ x, y, r, h });
const dip = (x, y, r, h = 1000) => ({ x, y, r, h: -h });

export const DIFFICULTIES = [
  {
    id: 'facile', name: 'Facile', subtitle: 'Le parc', scene: 'parc', extraShots: 4, preview: 1.6,
    theme: { ground: '#5c9e45', ground2: '#6db86c', dirt: '#3d9a47', rim: '#c9a465', water: '#3b9bd9', accent: '#ffd34d' },
  },
  {
    id: 'moyen', name: 'Moyen', subtitle: 'Le centre commercial', scene: 'mall', extraShots: 3, preview: 0.45,
    theme: { ground: '#e6e1d8', ground2: '#468d4e', dirt: '#3d9a47', rim: '#a87f45', water: '#2f86c4', accent: '#ff9f43' },
  },
  {
    id: 'difficile', name: 'Difficile', subtitle: 'La ville', scene: 'ville', extraShots: 2, preview: 0,
    theme: { ground: '#2c2f38', ground2: '#7d513d', dirt: '#3d9a47', rim: '#9c6b44', water: '#2a6f9e', accent: '#ff6b6b' },
  },
];

const L = {};

// ---------------- FACILE ----------------
L.facile = [
  build({
    name: 'Premier tir', par: 1, height: 720,
    path: [[180, 650], [180, 120, 96]],
    start: [180, 610], hole: [180, 160],
  }),
  build({
    name: 'La bosse', par: 2, height: 820,
    path: [[180, 760], [180, 120, 100]],
    start: [180, 720], hole: [180, 160],
    bumps: [bump(180, 440, 55, 900)],
  }),
  build({
    name: 'Le virage', par: 2, height: 780,
    path: [[90, 720], [90, 330, 92], [270, 330, 92], [270, 110, 92]],
    start: [90, 680], hole: [270, 145],
  }),
  build({
    name: 'Le petit pont', par: 2, height: 900,
    path: [[180, 850], [180, 560, 96], [180, 400, 48, 'bridge'], [180, 120, 96]],
    start: [180, 810], hole: [180, 160],
    lakes: [{ x: 180, y: 480, rx: 200, ry: 50 }],
    obstacles: [post(140, 290, 13)],
  }),
  build({
    name: 'Les plots', par: 3, height: 1000,
    path: [[100, 950], [100, 620, 100], [260, 460, 100], [260, 120, 100]],
    start: [100, 905], hole: [260, 160],
    obstacles: [post(100, 760, 15), post(230, 330, 14), post(290, 250, 14)],
    bumps: [bump(180, 540, 40, 700)],
  }),
];

// ---------------- MOYEN ----------------
L.moyen = [
  build({
    name: 'Double bosse', par: 3, height: 1000,
    path: [[90, 950], [90, 600, 74], [270, 420, 74], [270, 110, 74]],
    start: [90, 912], hole: [270, 145],
    bumps: [bump(90, 760, 45, 1000), bump(270, 280, 45, 1000)],
  }),
  build({
    name: 'Le creux', par: 3, height: 1000,
    path: [[180, 950], [180, 110, 76]],
    start: [180, 912], hole: [180, 145],
    bumps: [dip(180, 650, 52, 1100), bump(180, 250, 40, 900)],
    sand: [{ x: 130, y: 400, w: 100, h: 70 }],
    obstacles: [post(160, 520, 11), post(200, 340, 11)],
  }),
  build({
    name: 'Le moulin', par: 3, height: 900,
    path: [[180, 860], [180, 400, 74], [180, 120, 120]],
    start: [180, 822], hole: [180, 165],
    obstacles: [mill(180, 290, 46, 1.6, 2, 6), post(150, 560, 12), post(210, 500, 12)],
  }),
  build({
    name: 'Pont en biais', par: 4, height: 1100,
    path: [[80, 1050], [80, 780, 74], [280, 600, 40, 'bridge'], [280, 380, 74], [120, 230, 74], [120, 110, 84]],
    start: [80, 1012], hole: [120, 145],
    lakes: [{ x: 180, y: 690, rx: 70, ry: 70 }],
    obstacles: [log([240, 300], [270, 330], 6)],
  }),
  build({
    name: 'La pente', par: 3, height: 1100,
    path: [[180, 1050], [180, 700, 84], [180, 560, 42, 'bridge'], [180, 120, 84]],
    start: [180, 1012], hole: [180, 155],
    lakes: [{ x: 180, y: 630, rx: 200, ry: 46 }],
    slopes: [{ x: 138, y: 820, w: 84, h: 120, fx: 240, fy: 0 }, { x: 138, y: 300, w: 84, h: 150, fx: -260, fy: 0 }],
    sand: [{ x: 138, y: 200, w: 84, h: 50 }],
  }),
];

// ---------------- DIFFICILE ----------------
L.difficile = [
  build({
    name: 'Le slalom', par: 4, height: 1200,
    path: [[100, 1150], [100, 850, 60], [260, 650, 60], [260, 400, 60], [120, 230, 60], [120, 110, 72]],
    start: [100, 1115], hole: [120, 145],
    obstacles: [
      post(100, 980, 11, { dx: 16, dy: 0, period: 2.0 }),
      post(260, 540, 11, { dx: 16, dy: 0, period: 1.6, phase: 1 }),
      post(190, 315, 10),
    ],
  }),
  build({
    name: 'Les deux ponts', par: 5, height: 1200,
    path: [[180, 1150], [180, 900, 64], [80, 760, 32, 'bridge'], [80, 560, 64], [280, 420, 32, 'bridge'], [280, 120, 64]],
    start: [180, 1112], hole: [280, 155],
    lakes: [{ x: 130, y: 830, rx: 55, ry: 55 }, { x: 180, y: 490, rx: 60, ry: 55 }],
    obstacles: [post(280, 260, 10, { dx: 14, dy: 0, period: 1.8 })],
  }),
  build({
    name: 'Champ de bosses', par: 4, height: 1100,
    path: [[180, 1050], [180, 110, 86]],
    start: [180, 1012], hole: [180, 145],
    bumps: [
      bump(150, 900, 40, 1100), bump(215, 800, 40, 1100), dip(165, 680, 45, 1000),
      bump(205, 560, 40, 1100), bump(150, 450, 40, 1100), bump(205, 330, 38, 1200),
    ],
    sand: [{ x: 137, y: 220, w: 86, h: 40 }],
  }),
  build({
    name: 'Les pistons', par: 4, height: 1100,
    path: [[180, 1050], [180, 110, 92]],
    start: [180, 1012], hole: [180, 145],
    obstacles: [
      log([155, 850], [205, 850], 7, { dx: 50, dy: 0, period: 2.4 }),
      log([155, 650], [205, 650], 7, { dx: 50, dy: 0, period: 1.9, phase: 2 }),
      log([155, 450], [205, 450], 7, { dx: 50, dy: 0, period: 1.5, phase: 4 }),
      mill(180, 270, 30, -2.2, 2, 5),
    ],
  }),
  build({
    name: 'Le grand final', par: 6, height: 1500,
    path: [[90, 1450], [90, 1200, 62], [270, 1050, 34, 'bridge'], [270, 850, 62], [180, 700, 62], [180, 520, 62],
      [90, 380, 34, 'bridge'], [90, 260, 62], [205, 150, 84]],
    start: [90, 1412], hole: [210, 150],
    lakes: [{ x: 180, y: 1125, rx: 60, ry: 55 }, { x: 135, y: 450, rx: 50, ry: 50 }],
    bumps: [bump(270, 950, 30, 1100)],
    sand: [{ x: 60, y: 280, w: 60, h: 40 }],
    obstacles: [mill(180, 610, 24, 2, 2, 5), post(140, 210, 10, { dx: 0, dy: 18, period: 1.7 })],
  }),
];

export const LEVELS = {};
for (const d of DIFFICULTIES) {
  LEVELS[d.id] = L[d.id].map((lv, i) => ({ ...lv, id: `${d.id}-${i + 1}`, index: i, difficulty: d.id }));
}

export const maxShots = (level) => level.par + DIFFICULTIES.find(d => d.id === level.difficulty).extraShots;

export function starsFor(level, shots) {
  if (shots <= level.par) return 3;
  if (shots <= level.par + 1) return 2;
  return 1;
}
