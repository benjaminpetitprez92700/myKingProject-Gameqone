// Guerre Éclair en 3D : même règles, même ordi, mais un plateau en relief avec de vraies figurines
// (soldats, avions, bombes…). On tourne la vue en glissant le doigt, on zoome en pinçant (ou à la molette).
import * as THREE from '../../vendor/three.module.js';
import { mergeGeometries } from '../../vendor/BufferGeometryUtils.js';
import { Stratego, ARMY } from './game.js';
import { W, BY_ID, xy, isCross, isDark, v1Path } from './rules.js';

const V3 = THREE.Vector3;
const SKIN = '#f1c9a5', GOLD = '#e8b923', STEEL = '#8d969e', DARKSTEEL = '#3b4046', WOOD = '#7a5634';

// ---------- Matériaux et formes partagés ----------
const matCache = new Map();
function mat(color, o = {}) {
  const k = color + JSON.stringify(o);
  if (!matCache.has(k)) matCache.set(k, new THREE.MeshStandardMaterial({ color, roughness: o.r ?? 0.62, metalness: o.m ?? 0.05, ...(o.e ? { emissive: o.e, emissiveIntensity: o.ei ?? 0.6 } : {}) }));
  return matCache.get(k);
}
const geoCache = new Map();
function geo(k, make) { if (!geoCache.has(k)) geoCache.set(k, make()); return geoCache.get(k); }
const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
const cyl = (rt, rb, h, s = 14) => geo(`c${rt},${rb},${h},${s}`, () => new THREE.CylinderGeometry(rt, rb, h, s));
const sph = (r, s = 14, half = false) => geo(`s${r},${s},${half}`, () => new THREE.SphereGeometry(r, s, Math.ceil(s * 0.7), 0, Math.PI * 2, 0, half ? Math.PI / 2 : Math.PI));
const cone = (r, h, s = 14) => geo(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));

function add(parent, g, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) {
  const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz);
  o.castShadow = true; o.receiveShadow = true; parent.add(o); return o;
}

// ---------- Figurines (tournées vers +z, posées sur y = 0) ----------
function socle(g, A) {
  add(g, cyl(0.33, 0.36, 0.06, 24), mat(A.dark), 0, 0.03, 0);
  add(g, cyl(0.31, 0.31, 0.012, 24), mat(A.main), 0, 0.064, 0);
}

const HAT = { helmet: 0, kepi: 1, beret: 2, fedora: 3 };
function soldier(g, A, o) {
  const uni = mat(o.coat || A.main), dark = mat(A.dark), skin = mat(SKIN);
  const y0 = 0.08;
  // jambes et bottes
  add(g, box(0.085, 0.2, 0.1), dark, -0.06, y0 + 0.1, 0);
  add(g, box(0.085, 0.2, 0.1), dark, 0.06, y0 + 0.1, 0);
  add(g, box(0.09, 0.05, 0.13), mat('#2a1d12'), -0.06, y0 + 0.025, 0.015);
  add(g, box(0.09, 0.05, 0.13), mat('#2a1d12'), 0.06, y0 + 0.025, 0.015);
  if (o.trench) add(g, cyl(0.12, 0.2, 0.36, 16), uni, 0, y0 + 0.3, 0); // manteau long de l'espion
  // buste
  add(g, cyl(0.13, 0.15, 0.27, 16), uni, 0, y0 + 0.33, 0);
  add(g, box(0.27, 0.035, 0.18), mat('#3a2a18'), 0, y0 + 0.215, 0); // ceinturon
  // bras
  add(g, cyl(0.045, 0.04, 0.24, 8), uni, -0.17, y0 + 0.33, 0, 0, 0, 0.12);
  add(g, cyl(0.045, 0.04, 0.24, 8), uni, 0.17, y0 + 0.33, 0, 0, 0, -0.12);
  add(g, sph(0.042, 8), skin, -0.185, y0 + 0.2, 0);
  add(g, sph(0.042, 8), skin, 0.185, y0 + 0.2, 0);
  // tête
  add(g, cyl(0.045, 0.05, 0.05, 8), skin, 0, y0 + 0.49, 0);
  add(g, sph(0.1, 16), skin, 0, y0 + 0.58, 0);
  add(g, box(0.02, 0.025, 0.01), mat('#222'), -0.035, y0 + 0.6, 0.095);
  add(g, box(0.02, 0.025, 0.01), mat('#222'), 0.035, y0 + 0.6, 0.095);
  if (o.mustache) add(g, box(0.08, 0.018, 0.02), mat('#d9d4c8'), 0, y0 + 0.55, 0.095);
  // couvre-chef
  const hy = y0 + 0.63;
  if (o.hat === HAT.helmet) {
    add(g, sph(0.125, 16, true), mat(o.helmet || '#4f5b3a', { r: 0.45, m: 0.3 }), 0, hy - 0.01, 0);
    add(g, cyl(0.15, 0.15, 0.015, 18), mat(o.helmet || '#4f5b3a', { r: 0.45, m: 0.3 }), 0, hy - 0.01, 0);
    add(g, box(0.02, 0.03, 0.2), mat(o.helmet || '#4f5b3a', { r: 0.45, m: 0.3 }), 0, hy + 0.11, 0); // crête
  } else if (o.hat === HAT.kepi) {
    add(g, cyl(0.095, 0.105, 0.13, 16), mat(o.kepi || '#b3261e'), 0, hy + 0.05, -0.01, -0.12, 0, 0);
    add(g, cyl(0.107, 0.107, 0.035, 16), mat(o.band || A.dark), 0, hy + 0.0, -0.005);
    add(g, box(0.16, 0.012, 0.08), mat('#1a1a1a'), 0, hy - 0.02, 0.09, 0.2, 0, 0); // visière
    if (o.gold) for (let k = 0; k < o.gold; k++) add(g, cyl(0.108, 0.108, 0.01, 16), mat(GOLD, { m: 0.7, r: 0.3 }), 0, hy + 0.025 + k * 0.022, -0.01);
  } else if (o.hat === HAT.beret) {
    add(g, sph(0.11, 12, true), mat(o.beret || '#2d2d2d'), 0.02, hy, -0.01, 0, 0, -0.25);
  } else if (o.hat === HAT.fedora) {
    add(g, cyl(0.17, 0.17, 0.015, 18), mat('#2b2622'), 0, hy, 0);
    add(g, cyl(0.09, 0.105, 0.11, 16), mat('#2b2622'), 0, hy + 0.06, 0);
    add(g, cyl(0.106, 0.106, 0.025, 16), mat('#8a1a14'), 0, hy + 0.02, 0);
  }
  // galons / épaulettes
  if (o.epaulettes) {
    add(g, box(0.09, 0.03, 0.1), mat(GOLD, { m: 0.7, r: 0.3 }), -0.14, y0 + 0.465, 0);
    add(g, box(0.09, 0.03, 0.1), mat(GOLD, { m: 0.7, r: 0.3 }), 0.14, y0 + 0.465, 0);
  }
  if (o.stripes) for (let k = 0; k < o.stripes; k++) add(g, box(0.06, 0.014, 0.015), mat(GOLD, { m: 0.6 }), -0.17, y0 + 0.4 - k * 0.025, 0.045, 0, 0, 0.15);
  if (o.sash) add(g, box(0.3, 0.05, 0.02), mat('#c8202a'), 0, y0 + 0.36, 0.13, 0, 0, 0.6);
  if (o.medals) { add(g, sph(0.022, 8), mat(GOLD, { m: 0.8 }), -0.05, y0 + 0.4, 0.13); add(g, sph(0.022, 8), mat('#c0c0c0', { m: 0.8 }), -0.0, y0 + 0.4, 0.135); }
  return y0 + 0.75; // hauteur de la tête
}
function rifle(g) {
  const w = mat(WOOD), s = mat(DARKSTEEL, { m: 0.6, r: 0.4 });
  const r = new THREE.Group(); r.position.set(0.21, 0.38, 0.04); r.rotation.set(0.15, 0, -0.35); g.add(r);
  add(r, box(0.035, 0.36, 0.045), w, 0, 0, 0); add(r, cyl(0.012, 0.012, 0.22, 6), s, 0, 0.27, 0);
}
function shovel(g) {
  const r = new THREE.Group(); r.position.set(-0.22, 0.4, -0.02); r.rotation.set(0, 0, 0.35); g.add(r);
  add(r, cyl(0.014, 0.014, 0.46, 6), mat(WOOD), 0, 0, 0); add(r, box(0.1, 0.12, 0.015), mat(STEEL, { m: 0.7, r: 0.35 }), 0, -0.27, 0);
}
function sword(g) {
  const r = new THREE.Group(); r.position.set(0.2, 0.2, 0.06); r.rotation.set(0.2, 0, 0.25); g.add(r);
  add(r, box(0.018, 0.34, 0.012), mat('#d9dde2', { m: 0.9, r: 0.2 }), 0, -0.05, 0); add(r, box(0.07, 0.02, 0.03), mat(GOLD, { m: 0.8 }), 0, 0.12, 0);
}
function backpack(g, A) { add(g, box(0.2, 0.2, 0.08), mat(A.dark), 0, 0.42, -0.15); add(g, cyl(0.04, 0.04, 0.2, 8), mat('#d8cfa8'), 0, 0.55, -0.15, 0, 0, Math.PI / 2); }

function plane(g, A, bare) {
  const body = mat(A.main, { r: 0.45, m: 0.25 }), light = mat(A.light, { r: 0.45, m: 0.2 });
  if (!bare) add(g, cyl(0.025, 0.025, 0.3, 6), mat(DARKSTEEL), 0, 0.2, 0); // mât de présentation
  const p = new THREE.Group(); p.position.y = 0.4; p.name = 'hover'; g.add(p);
  add(p, cyl(0.07, 0.05, 0.62, 14), body, 0, 0, 0, Math.PI / 2, 0, 0);
  add(p, cone(0.07, 0.1, 14), mat(DARKSTEEL, { m: 0.6 }), 0, 0, 0.36, Math.PI / 2, 0, 0);
  add(p, box(0.86, 0.025, 0.17), light, 0, 0.0, 0.04);
  add(p, box(0.32, 0.02, 0.1), light, 0, 0.02, -0.27);
  add(p, box(0.02, 0.13, 0.11), body, 0, 0.07, -0.27);
  add(p, sph(0.06, 10, true), mat('#9fd3ff', { r: 0.1, m: 0.4 }), 0, 0.05, 0.12); // cockpit
  for (const x of [-0.24, 0.24]) {
    add(p, cyl(0.045, 0.045, 0.16, 10), mat(DARKSTEEL), x, -0.03, 0.1, Math.PI / 2, 0, 0); // moteurs
    add(p, cyl(0.07, 0.07, 0.012, 16), mat('#fff'), x, 0.014, -0.02); add(p, cyl(0.03, 0.03, 0.014, 12), mat(A.dark), x, 0.016, -0.02); // cocardes
  }
  // bombes sous les ailes
  add(p, cyl(0.03, 0.03, 0.12, 8), mat('#2b2b2b'), -0.1, -0.06, 0.05, Math.PI / 2, 0, 0);
  add(p, cyl(0.03, 0.03, 0.12, 8), mat('#2b2b2b'), 0.1, -0.06, 0.05, Math.PI / 2, 0, 0);
  const props = [];
  for (const x of [-0.24, 0.24]) {
    const pr = new THREE.Group(); pr.name = 'prop'; pr.position.set(x, -0.03, 0.19); p.add(pr);
    add(pr, box(0.22, 0.025, 0.01), mat('#222'), 0, 0, 0); add(pr, box(0.025, 0.22, 0.01), mat('#222'), 0, 0, 0);
    props.push(pr);
  }
}
function rocket(g, A, onRamp = true) {
  if (onRamp) {
    add(g, box(0.16, 0.025, 0.66), mat(DARKSTEEL, { m: 0.5 }), 0, 0.17, 0, -0.32, 0, 0);
    add(g, box(0.04, 0.24, 0.04), mat(DARKSTEEL), 0, 0.12, -0.24); add(g, box(0.04, 0.08, 0.04), mat(DARKSTEEL), 0, 0.06, 0.18);
  }
  const r = new THREE.Group(); if (onRamp) { r.position.set(0, 0.29, 0); r.rotation.x = -0.32; } g.add(r);
  add(r, cyl(0.06, 0.06, 0.4, 14), mat('#6d7552', { r: 0.5, m: 0.3 }), 0, 0, 0, Math.PI / 2, 0, 0);
  add(r, cone(0.06, 0.14, 14), mat('#6d7552', { r: 0.5, m: 0.3 }), 0, 0, 0.27, Math.PI / 2, 0, 0);
  add(r, box(0.4, 0.015, 0.1), mat(A.main), 0, 0, 0.02);
  add(r, cyl(0.035, 0.03, 0.3, 10), mat(DARKSTEEL, { m: 0.6 }), 0, 0.085, -0.12, Math.PI / 2, 0, 0); // pulsoréacteur
  add(r, box(0.015, 0.1, 0.07), mat(A.main), 0, 0.05, -0.17);
  return r;
}
function mine(g, A) {
  add(g, cyl(0.22, 0.24, 0.08, 22), mat('#4c5434', { r: 0.7, m: 0.3 }), 0, 0.12, 0);
  add(g, cyl(0.1, 0.12, 0.05, 16), mat('#3a4128', { m: 0.3 }), 0, 0.18, 0);
  for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI * 2; add(g, cyl(0.01, 0.01, 0.07, 6), mat(STEEL, { m: 0.7 }), Math.cos(a) * 0.05, 0.23, Math.sin(a) * 0.05); }
  add(g, sph(0.022, 8), mat('#ff3b2f', { e: '#ff3b2f', ei: 0.8 }), 0, 0.22, 0);
}
function bomb(g, A) {
  add(g, sph(0.19, 18), mat('#1f1f22', { r: 0.35, m: 0.4 }), 0, 0.27, 0);
  add(g, cyl(0.05, 0.05, 0.06, 10), mat(STEEL, { m: 0.7 }), 0, 0.47, 0);
  const f = add(g, cyl(0.012, 0.012, 0.14, 6), mat('#c9a66b'), 0.04, 0.54, 0, 0, 0, -0.5);
  add(g, sph(0.03, 8), mat('#ffb703', { e: '#ff7b00', ei: 1.2 }), 0.08, 0.6, 0);
  add(g, cyl(0.09, 0.09, 0.02, 18), mat('#fff'), 0, 0.29, 0.18, Math.PI / 2, 0, 0); // cadran
  add(g, box(0.012, 0.07, 0.01), mat('#111'), 0, 0.31, 0.195); add(g, box(0.05, 0.012, 0.01), mat('#111'), 0.02, 0.29, 0.195);
}
function dca(g, A) {
  add(g, cyl(0.26, 0.3, 0.1, 18), mat('#5a6340', { r: 0.6 }), 0, 0.13, 0);
  const t = new THREE.Group(); t.position.y = 0.2; t.name = 'turret'; g.add(t);
  add(t, box(0.24, 0.14, 0.24), mat(A.main, { m: 0.2 }), 0, 0.06, 0);
  add(t, box(0.3, 0.05, 0.05), mat(DARKSTEEL), 0, 0.12, 0);
  for (const x of [-0.05, 0.05]) add(t, cyl(0.022, 0.026, 0.5, 8), mat(DARKSTEEL, { m: 0.6, r: 0.35 }), x, 0.3, 0.14, 0.75, 0, 0);
  add(t, box(0.2, 0.12, 0.02), mat('#4c5434'), 0, 0.16, 0.13, 0.2, 0, 0); // bouclier
}
function truck(g, A) {
  const wheel = mat('#1c1c1c', { r: 0.8 });
  for (const [x, z] of [[-0.15, 0.2], [0.15, 0.2], [-0.15, -0.18], [0.15, -0.18]]) add(g, cyl(0.07, 0.07, 0.05, 12), wheel, x, 0.15, z, 0, 0, Math.PI / 2);
  add(g, box(0.28, 0.05, 0.66), mat('#2e2e2e'), 0, 0.17, 0);
  add(g, box(0.27, 0.2, 0.18), mat(A.main, { m: 0.2 }), 0, 0.29, 0.22);
  add(g, box(0.25, 0.08, 0.01), mat('#9fd3ff', { r: 0.1, m: 0.4 }), 0, 0.33, 0.315);
  add(g, cyl(0.13, 0.13, 0.42, 16), mat('#b8bcc0', { m: 0.6, r: 0.35 }), 0, 0.33, -0.08, Math.PI / 2, 0, 0);
  add(g, box(0.05, 0.04, 0.06), mat('#c8202a'), 0, 0.47, -0.08);
}
function magnet(g, A) {
  add(g, box(0.08, 0.3, 0.08), mat(DARKSTEEL, { m: 0.5 }), 0, 0.22, 0);
  const m = new THREE.Group(); m.position.y = 0.48; m.name = 'spin'; g.add(m);
  const tor = add(m, geo('magnet', () => new THREE.TorusGeometry(0.14, 0.055, 10, 20, Math.PI)), mat('#d62828', { r: 0.4, m: 0.2 }), 0, 0, 0, 0, 0, Math.PI);
  add(m, box(0.11, 0.08, 0.11), mat('#d9dde2', { m: 0.8, r: 0.25 }), -0.14, 0.04, 0);
  add(m, box(0.11, 0.08, 0.11), mat('#d9dde2', { m: 0.8, r: 0.25 }), 0.14, 0.04, 0);
  tor.position.y = 0.0;
}
function flag(g, A) {
  add(g, cyl(0.12, 0.16, 0.08, 14), mat('#6b5a3a'), 0, 0.12, 0);
  add(g, cyl(0.014, 0.014, 0.85, 8), mat('#d9c38a', { m: 0.4 }), -0.1, 0.55, 0);
  add(g, sph(0.03, 8), mat(GOLD, { m: 0.8 }), -0.1, 0.98, 0);
  const f = new THREE.Group(); f.position.set(-0.1, 0.83, 0); g.add(f);
  const cloth = geo('flagcloth', () => new THREE.PlaneGeometry(0.4, 0.26, 10, 4));
  const fm = new THREE.MeshStandardMaterial({ color: A.main, side: THREE.DoubleSide, roughness: 0.8 });
  const c = new THREE.Mesh(cloth.clone(), fm); c.position.x = 0.2; c.castShadow = true; c.name = 'cloth'; f.add(c);
  const s = new THREE.Mesh(geo('flagstripe', () => new THREE.PlaneGeometry(0.4, 0.06, 10, 1)), mat('#fff', { r: 0.8 })); s.material = new THREE.MeshStandardMaterial({ color: '#fff', side: THREE.DoubleSide }); s.position.set(0.2, 0, 0.002); f.add(s);
}
function secretPlan(g, A) {
  add(g, box(0.5, 0.04, 0.38), mat(WOOD), 0, 0.3, 0);
  for (const [x, z] of [[-0.21, 0.15], [0.21, 0.15], [-0.21, -0.15], [0.21, -0.15]]) add(g, box(0.035, 0.22, 0.035), mat(WOOD), x, 0.18, z);
  add(g, box(0.36, 0.01, 0.26), mat('#efe6c8'), 0, 0.325, 0, 0, 0.12, 0);
  add(g, box(0.14, 0.012, 0.05), mat('#c8202a'), 0.04, 0.332, 0.02, 0, 0.12, 0);
  add(g, box(0.2, 0.004, 0.006), mat('#3a86ff'), -0.05, 0.332, -0.06, 0, 0.6, 0);
  add(g, cyl(0.025, 0.025, 0.3, 10), mat('#e9dcb5'), 0.12, 0.35, -0.12, 0, 0.4, Math.PI / 2); // rouleau
}
function hidden(g, A) {
  // soldat sous sa cape : tous pareils tant qu'on ne sait pas ce que c'est
  const cape = mat(A.main, { r: 0.75 }), dark = mat(A.dark);
  add(g, cyl(0.1, 0.26, 0.5, 18), cape, 0, 0.33, 0);
  add(g, sph(0.12, 16), dark, 0, 0.63, 0);
  add(g, cyl(0.15, 0.15, 0.014, 18), dark, 0, 0.66, 0);
  add(g, sph(0.13, 14, true), dark, 0, 0.66, 0);
  // éclair
  const e = new THREE.Shape(); e.moveTo(0.02, 0.1); e.lineTo(-0.05, 0.0); e.lineTo(0, 0); e.lineTo(-0.02, -0.1); e.lineTo(0.05, 0.01); e.lineTo(0, 0.01); e.closePath();
  add(g, geo('bolt', () => new THREE.ShapeGeometry(e)), mat('#ffd34d', { e: '#7a5a00', ei: 0.5 }), 0, 0.37, 0.2, -0.32, 0, 0);
}

const RANK_LOOK = {
  corpsfranc: { hat: HAT.beret, extra: rifle },
  sapeur: { hat: HAT.helmet, extra: shovel },
  parachutiste: { hat: HAT.helmet, helmet: '#3b4428', extra: backpack },
  caporal: { hat: HAT.helmet, stripes: 1 },
  sergent: { hat: HAT.helmet, stripes: 2, extra: rifle },
  adjudant: { hat: HAT.kepi, kepi: '#3b4428', stripes: 2 },
  adjudantchef: { hat: HAT.kepi, kepi: '#3b4428', stripes: 3 },
  souslieutenant: { hat: HAT.kepi, gold: 1 },
  lieutenant: { hat: HAT.kepi, gold: 2 },
  capitaine: { hat: HAT.kepi, gold: 3, extra: sword },
  commandant: { hat: HAT.kepi, gold: 4, epaulettes: true, extra: sword },
  ltcolonel: { hat: HAT.kepi, gold: 5, epaulettes: true, extra: sword, mustache: true },
  colonel: { hat: HAT.kepi, gold: 5, epaulettes: true, medals: true, extra: sword, mustache: true },
  general: { hat: HAT.kepi, gold: 3, band: '#1a1a1a', kepi: '#c8202a', epaulettes: true, medals: true, sash: true, mustache: true, extra: sword },
  espion: { hat: HAT.fedora, coat: '#4a4038', trench: true },
};

const VCMAT = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.58, metalness: 0.12 });
const ANIM = new Set(['prop', 'hover', 'turret', 'spin', 'cloth']);
// fusionne les morceaux immobiles par matériau : quelques objets par figurine au lieu de vingt
function optimize(root) {
  root.updateMatrixWorld(true);
  const byMat = new Map(), drop = [];
  root.traverse((o) => {
    if (!o.isMesh) return;
    for (let a = o; a && a !== root; a = a.parent) if (ANIM.has(a.name)) return;
    const gg = o.geometry.index ? o.geometry.clone() : o.geometry.clone();
    gg.applyMatrix4(o.matrixWorld);
    for (const k of Object.keys(gg.attributes)) if (!['position', 'normal', 'uv'].includes(k)) gg.deleteAttribute(k);
    if (!gg.attributes.uv) gg.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(gg.attributes.position.count * 2), 2));
    const g2 = gg.index ? gg.toNonIndexed() : gg;
    // une seule matière à couleurs par sommet pour tout ce qui ne brille pas : un seul objet à dessiner
    const glow = o.material.emissive && o.material.emissive.getHex() !== 0;
    const key = glow ? o.material : VCMAT;
    const n = g2.attributes.position.count, col = new Float32Array(n * 3), c = o.material.color;
    for (let v = 0; v < n; v++) { col[v * 3] = c.r; col[v * 3 + 1] = c.g; col[v * 3 + 2] = c.b; }
    g2.setAttribute('color', new THREE.BufferAttribute(col, 3));
    if (!byMat.has(key)) byMat.set(key, []);
    byMat.get(key).push(g2); drop.push(o);
  });
  for (const o of drop) o.parent.remove(o);
  for (const [m, list] of byMat) {
    const merged = mergeGeometries(list, false); if (!merged) continue;
    if (m !== VCMAT) merged.deleteAttribute('color');
    const mesh = new THREE.Mesh(merged, m); mesh.castShadow = true; mesh.receiveShadow = true; root.add(mesh);
  }
  return root;
}
const tplCache = new Map();
export function buildModel(id, side, faceUp, style, bare = false) {
  const key = `${id}|${side}|${faceUp ? 1 : 0}|${style}|${bare ? 1 : 0}`;
  let tpl = tplCache.get(key);
  if (!tpl) { tpl = optimize(rawModel(id, side, faceUp, style, bare)); tplCache.set(key, tpl); }
  const g = tpl.clone();
  const u = g.userData = { head: tpl.userData.head, props: [] };
  g.traverse((o) => {
    if (o.name === 'prop') u.props.push(o);
    else if (o.name === 'cloth') { o.geometry = o.geometry.clone(); u.cloth = o; }
    else if (ANIM.has(o.name)) u[o.name] = o;
  });
  return g;
}
function rawModel(id, side, faceUp, style, bare) {
  const root = new THREE.Group(), A = ARMY[side];
  if (!bare) socle(root, A);
  const g = new THREE.Group(); g.position.y = 0.06; g.scale.setScalar(1.28); root.add(g);
  let head = 0.8;
  if (!faceUp) hidden(g, A);
  else if (RANK_LOOK[id]) {
    const L = RANK_LOOK[id];
    const o = { ...L };
    if (style === 'moderne' && o.hat === HAT.kepi && id !== 'general') { o.hat = HAT.beret; o.beret = id === 'adjudant' || id === 'adjudantchef' ? '#3b4428' : '#7a1020'; }
    if (style === 'moderne' && o.hat === HAT.helmet) o.helmet = '#4b5320';
    if (style !== 'moderne' && o.hat === HAT.helmet && !L.helmet) o.helmet = '#7d8ea3'; // bleu horizon
    head = soldier(g, A, o);
    L.extra?.(g, A);
  } else ({ bombardier: plane, v1: rocket, mine, bomberet: bomb, dca, citerne: truck, barrage: magnet, drapeau: flag, plan: secretPlan })[id]?.(g, A, bare);
  root.userData.head = 0.06 + head * 1.28;
  return root;
}

// ---------- Étiquettes (grade) ----------
const texCache = new Map();
function badgeTex(txt, side, warn) {
  const k = `${txt}|${side}|${warn}`;
  if (texCache.has(k)) return texCache.get(k);
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(64, 64, 54, 0, Math.PI * 2); g.fill();
  g.lineWidth = 10; g.strokeStyle = warn ? '#ff3b2f' : ARMY[side].dark; g.stroke();
  g.fillStyle = ARMY[side].dark; g.font = `900 ${txt.length > 2 ? 46 : 64}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(txt, 64, 68);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; texCache.set(k, t); return t;
}
export function glowTex() {
  if (texCache.has('glow')) return texCache.get('glow');
  const c = document.createElement('canvas'); c.width = c.height = 128;
  const g = c.getContext('2d'), r = g.createRadialGradient(64, 64, 4, 64, 64, 64);
  r.addColorStop(0, 'rgba(255,255,220,1)'); r.addColorStop(0.25, 'rgba(255,200,80,0.95)'); r.addColorStop(0.6, 'rgba(255,90,20,0.5)'); r.addColorStop(1, 'rgba(120,20,0,0)');
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); texCache.set('glow', t); return t;
}

const ease = (k) => 1 - Math.pow(1 - Math.min(1, Math.max(0, k)), 3);

export class Stratego3D extends Stratego {
  constructor(canvas, hud) {
    super(canvas, hud);
    this.is3d = true;
    const gl = this.gl = document.createElement('canvas');
    gl.className = 'arena3d';
    canvas.parentNode.insertBefore(gl, canvas);
    const r = this.renderer = new THREE.WebGLRenderer({ canvas: gl, antialias: true });
    r.shadowMap.enabled = true; r.shadowMap.type = THREE.PCFSoftShadowMap;
    r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3;
    const s = this.scene = new THREE.Scene();
    s.background = new THREE.Color('#26301c'); s.fog = new THREE.Fog('#26301c', 30, 60);
    s.add(new THREE.HemisphereLight('#e8eeff', '#4a4030', 1.6));
    const sun = this.sun = new THREE.DirectionalLight('#fff3dc', 2.2);
    sun.position.set(-5, 12, 7); sun.castShadow = true;
    this.mobile = matchMedia('(pointer: coarse)').matches;
    sun.shadow.mapSize.set(this.mobile ? 1024 : 2048, this.mobile ? 1024 : 2048); sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
    Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
    s.add(sun);
    this.cam = new THREE.PerspectiveCamera(38, 1, 0.1, 600);
    this.ray = new THREE.Raycaster();
    this.models = new Map(); // pièce -> { g, key }
    this.fxs = [];
    this.resetView();
    // gestes : glisser = tourner, pincer / molette = zoom, deux doigts ou clic droit = déplacer
    this.ptrs = new Map();
    canvas.addEventListener('pointermove', (e) => this._gMove(e));
    canvas.addEventListener('pointerup', (e) => this._gUp(e));
    canvas.addEventListener('pointercancel', (e) => { this.ptrs.delete(e.pointerId); this.g0 = null; });
    canvas.addEventListener('wheel', (e) => { e.preventDefault(); this._zoomAt(this.T.zoom * Math.exp(-e.deltaY * 0.0016), e.clientX, e.clientY); }, { passive: false });
    canvas.addEventListener('dblclick', () => this.resetView(true));
    canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  // T = vue voulue (doigts, molette) ; yaw/pitch/zoom/pan = vue affichée, qui la rejoint en douceur
  resetView(soft = false) {
    this.T = { yaw: 0, pitch: null, zoom: 1, pan: new V3() };
    if (!soft) { this.yaw = 0; this.pitch = null; this.zoom = 1; this.pan = new V3(); this.curFit = null; this.fitKey = ''; }
  }
  _ground(cx, cy) {
    const r = this.gl.getBoundingClientRect(), p = new V3();
    this.ray.setFromCamera(new THREE.Vector2(((cx - r.left) / r.width) * 2 - 1, -((cy - r.top) / r.height) * 2 + 1), this.cam);
    return this.ray.ray.intersectPlane(new THREE.Plane(new V3(0, 1, 0), 0), p) ? p : null;
  }
  // zoom vers le point visé (souris ou milieu des deux doigts)
  _zoomAt(z, cx, cy, base = this.T.pan, z0 = this.T.zoom) {
    z = Math.min(4.5, Math.max(0.75, z));
    const g = cx != null && this._ground(cx, cy);
    if (g) { const k = 1 - z0 / z; this.T.pan = this._clampPan(base.clone().add(new V3(g.x - base.x, 0, g.z - base.z).multiplyScalar(k))); }
    this.T.zoom = z;
  }
  _clampPan(p) {
    const G = this.G; if (!G) return p;
    const lim = Math.max(0, 1 - 1 / this.T.zoom) + 0.15;
    p.x = Math.max(-W / 2 * lim, Math.min(W / 2 * lim, p.x)); p.z = Math.max(-G.H / 2 * lim, Math.min(G.H / 2 * lim, p.z)); p.y = 0;
    return p;
  }

  // marges réservées aux panneaux posés sur les côtés
  _margins() {
    const land = this.vw > this.vh * 1.05;
    const ctl = document.getElementById('arenaControls');
    const ctlH = ctl?.classList.contains('show') ? ctl.offsetHeight + 12 : 0;
    if (land) {
      const side = Math.min(210, Math.max(140, this.vw * 0.14));
      return { l: side, r: side, t: 10, b: 10 };
    }
    return { l: 6, r: 6, t: 64, b: Math.max(10, ctlH) };
  }

  resize() {
    super.resize();
    if (!this.renderer || this.vw < 50) return;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.mobile ? 1.6 : 2));
    this.renderer.setSize(this.vw, this.vh, false);
    this.cam.aspect = this.vw / this.vh;
    this.cam.updateProjectionMatrix();
  }

  start(opts) { this.resetView(); this._clearModels(); super.start(opts); }

  stop() {
    super.stop();
    this._clearModels();
    this.renderer?.dispose(); this.gl?.remove();
  }

  _clearModels() { for (const { g } of this.models.values()) g.parent?.remove(g); this.models.clear(); }

  // ---------- Gestes ----------
  _tap(e) {
    this.canvas.setPointerCapture?.(e.pointerId);
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size === 1) this.g0 = { x: e.clientX, y: e.clientY, moved: false, yaw: this.T.yaw, pitch: this.T.pitch ?? this.pitch, pan: this.T.pan.clone(), btn: e.button, shift: e.shiftKey, lx: e.clientX, ly: e.clientY };
    else if (this.ptrs.size === 2) {
      const [a, b] = [...this.ptrs.values()];
      this.pinch = { d: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), yaw: this.T.yaw, zoom: this.T.zoom, mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2, pan: this.T.pan.clone() };
      if (this.g0) this.g0.moved = true;
    }
  }
  _panBy(base, dx, dy) {
    const d = this.camDist || 12, k = (2 * d * Math.tan((this.cam.fov * Math.PI) / 360)) / this.vh;
    const yaw = this._yawTotal();
    const right = new V3(Math.cos(yaw), 0, -Math.sin(yaw)), fwd = new V3(-Math.sin(yaw), 0, -Math.cos(yaw));
    const p = base.clone().addScaledVector(right, -dx * k).addScaledVector(fwd, dy * k / Math.max(0.4, Math.sin(this.pitch)));
    return this._clampPan(p);
  }
  _gMove(e) {
    if (!this.ptrs.has(e.pointerId)) return;
    this.ptrs.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (this.ptrs.size >= 2 && this.pinch) {
      const [a, b] = [...this.ptrs.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const P = this.pinch, mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.T.pan = this._panBy(P.pan, mx - P.mx, my - P.my);
      this._zoomAt(P.zoom * (d / Math.max(20, P.d)), mx, my, this.T.pan, P.zoom);
      // tourner avec deux doigts
      let da = Math.atan2(b.y - a.y, b.x - a.x) - P.ang; da = Math.atan2(Math.sin(da), Math.cos(da));
      this.T.yaw = P.yaw + da;
      return;
    }
    const g = this.g0; if (!g) return;
    const dx = e.clientX - g.x, dy = e.clientY - g.y;
    if (!g.moved && Math.hypot(dx, dy) > 8) g.moved = true;
    if (!g.moved) return;
    if (g.btn === 2 || g.shift) this.T.pan = this._panBy(g.pan, dx, dy);
    else { this.T.yaw = g.yaw - dx * 0.007; this.T.pitch = Math.min(1.5, Math.max(0.38, g.pitch + dy * 0.0045)); }
  }
  _gUp(e) {
    const had = this.ptrs.has(e.pointerId);
    this.ptrs.delete(e.pointerId);
    if (this.ptrs.size < 2) this.pinch = null;
    if (!had) return;
    if (this.ptrs.size === 0) {
      const g = this.g0; this.g0 = null;
      if (g && !g.moved) super._tap(e);
    }
  }

  _cellAt(e) {
    if (!this.G) return -1;
    const r = this.gl.getBoundingClientRect();
    const ndc = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    this.ray.setFromCamera(ndc, this.cam);
    // d'abord les figurines (on peut toucher la tête d'un soldat), sinon la case du plateau
    const groups = [...this.models.values()].map((m) => m.g).filter((g) => g.visible && g.userData.cell != null);
    const hit = this.ray.intersectObjects(groups, true)[0];
    if (hit) { let o = hit.object; while (o && o.userData.cell == null) o = o.parent; if (o) return o.userData.cell; }
    const p = new V3();
    if (!this.ray.ray.intersectPlane(new THREE.Plane(new V3(0, 1, 0), 0), p)) return -1;
    const x = Math.floor(p.x + W / 2), y = Math.floor(p.z + this.G.H / 2);
    if (x < 0 || y < 0 || x >= W || y >= this.G.H) return -1;
    return y * W + x;
  }

  // ---------- Scène ----------
  _pos(i, out = new V3()) { const [x, y] = xy(this.G, i); return out.set(x - W / 2 + 0.5, 0, y - this.G.H / 2 + 0.5); }

  _buildBoard() {
    if (this.boardRoot) { this.scene.remove(this.boardRoot); }
    const G = this.G, root = this.boardRoot = new THREE.Group(); this.scene.add(root);
    this.boardMode = G.mode;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(120, 120), new THREE.MeshStandardMaterial({ color: '#25301a', roughness: 1 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.36; ground.receiveShadow = true; root.add(ground);
    const tb = new THREE.Group();
    const frame = add(tb, new THREE.BoxGeometry(W + 0.7, 0.32, G.H + 0.7), mat('#4a3520', { r: 0.7 }), 0, -0.2, 0);
    frame.castShadow = false;
    add(tb, new THREE.BoxGeometry(W + 0.2, 0.06, G.H + 0.2), mat('#2a1d10'), 0, -0.04, 0).castShadow = false;
    const light = mat('#d8cfa8', { r: 0.85 }), darkM = mat('#4a5733', { r: 0.9 }), red = mat('#7d1b14', { r: 0.8 }), cream = mat('#f3e6c8', { r: 0.6 });
    const tileG = box(0.97, 0.06, 0.97);
    for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
      const cx = x - W / 2 + 0.5, cz = y - G.H / 2 + 0.5;
      if (isCross(G, x, y)) {
        add(tb, tileG, red, cx, -0.03, cz).castShadow = false;
        // chevaux de frise : deux poutres croisées
        add(tb, box(0.95, 0.09, 0.1), cream, cx, 0.06, cz, 0, Math.PI / 4, 0);
        add(tb, box(0.95, 0.09, 0.1), cream, cx, 0.06, cz, 0, -Math.PI / 4, 0);
        continue;
      }
      add(tb, tileG, isDark(x, y) ? darkM : light, cx, -0.03, cz).castShadow = false;
    }
    // ligne de front (pointillés)
    for (let x = 0; x < W * 2; x++) add(tb, box(0.3, 0.012, 0.035), mat('#a01e14'), -W / 2 + 0.25 + x * 0.5, 0.002, 0).castShadow = false;
    optimize(tb); tb.traverse((o) => { o.castShadow = false; }); root.add(tb);
    // zone de placement
    const zm = new THREE.MeshBasicMaterial({ color: '#ffd34d', transparent: true, opacity: 0.16, depthWrite: false });
    this.zone = new THREE.Mesh(new THREE.PlaneGeometry(W, G.R), zm); this.zone.rotation.x = -Math.PI / 2; root.add(this.zone);
    // repères (cases possibles, dernière action…)
    this.marks = new THREE.Group(); root.add(this.marks);
    this.markPool = {};
    const shadow = this.sun.shadow.camera; shadow.left = -W / 2 - 1; shadow.right = W / 2 + 1; shadow.top = G.H / 2 + 1; shadow.bottom = -G.H / 2 - 1; shadow.updateProjectionMatrix();
  }

  _markMat(type) {
    const C = { last: ['#ffd63c', 0.38], move: ['#ffffff', 0.85], drop: ['#78c8ff', 0.85], attack: ['#ff3c3c', 0.95], raid: ['#ff6a28', 0.95], v1: ['#ff7828', 0.3], place: ['#ffffff', 0.85], sel: ['#ffd34d', 0.95] }[type];
    return new THREE.MeshBasicMaterial({ color: C[0], transparent: true, opacity: C[1], depthWrite: false, side: THREE.DoubleSide });
  }
  _markGeo(type) {
    return {
      last: () => new THREE.PlaneGeometry(0.97, 0.97), v1: () => new THREE.PlaneGeometry(0.97, 0.97),
      move: () => new THREE.CircleGeometry(0.13, 20), place: () => new THREE.CircleGeometry(0.1, 16), drop: () => new THREE.CircleGeometry(0.11, 16),
      attack: () => new THREE.RingGeometry(0.4, 0.48, 4, 1, Math.PI / 4), sel: () => new THREE.RingGeometry(0.36, 0.44, 32),
      raid: () => { const g = new THREE.RingGeometry(0.3, 0.36, 28); return g; },
    }[type]();
  }
  _mark(type, i, y = 0.004) {
    const pool = this.markPool[type] ||= { list: [], n: 0 };
    let m = pool.list[pool.n];
    if (!m) {
      m = new THREE.Mesh(this._markGeo(type), this._markMat(type)); m.rotation.x = -Math.PI / 2; m.renderOrder = 2;
      if (type === 'raid') { const bar = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.05), m.material); m.add(bar); const b2 = bar.clone(); b2.rotation.z = Math.PI / 2; m.add(b2); }
      this.marks.add(m); pool.list.push(m);
    }
    pool.n++;
    this._pos(i, m.position); m.position.y = y; m.visible = true;
    return m;
  }

  _model(p, faceUp) {
    const key = `${p.id}|${p.side}|${faceUp ? 1 : 0}|${this.opts.pieceStyle}`;
    let rec = this.models.get(p);
    if (!rec || rec.key !== key) {
      if (rec) rec.g.parent?.remove(rec.g);
      const g = buildModel(p.id, p.side, faceUp, this.opts.pieceStyle);
      if (faceUp && BY_ID[p.id].kind === 'fight') {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex(String(BY_ID[p.id].r), p.side, false), depthTest: false }));
        s.scale.set(0.3, 0.3, 1); s.position.y = g.userData.head + 0.14; s.renderOrder = 5; g.add(s); g.userData.badge = s;
      }
      if (!faceUp && p.dropped) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: badgeTex('🪂', p.side, false), depthTest: false }));
        s.scale.set(0.26, 0.26, 1); s.position.y = 1; s.renderOrder = 5; g.add(s);
      }
      // regard vers l'ennemi
      g.rotation.y = p.side === 0 ? Math.PI : 0;
      this.scene.add(g);
      rec = { g, key }; this.models.set(p, rec);
    }
    return rec.g;
  }
  _faceUp(p) {
    if (this.phase === 'setup' && p.side !== this.setupSide) return false;
    return this.over || p.side === this.viewer || p.revealed || (this.combat && (this.combat.a === p || this.combat.d === p));
  }

  _boom(i, size = 1) { const pos = this._pos(i); pos.y = 0.4; this.fxs.push({ pos, t: 0, size }); }

  // ---------- Rendu ----------
  _render() {
    try { this._render3d(); } catch (e) { if (!this._errShown) { this._errShown = true; console.error(e); } }
  }
  _yawTotal() { return (this.viewer === 1 ? Math.PI : 0) + this.yaw; }

  _placeCamera(d, target) {
    const yaw = this._yawTotal(), pit = this.pitch, c = this.cam;
    c.position.set(target.x + Math.sin(yaw) * Math.cos(pit) * d, target.y + Math.sin(pit) * d, target.z + Math.cos(yaw) * Math.cos(pit) * d);
    c.lookAt(target); c.updateMatrixWorld();
  }
  _fit() {
    const G = this.G, m = this._margins(), c = this.cam, vw = this.vw, vh = this.vh;
    c.clearViewOffset();
    const hw = W / 2 + 0.35, hh = G.H / 2 + 0.35, pts = [];
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) for (const y of [-0.1, 0.75]) pts.push(new V3(sx * hw, y, sz * hh));
    const Aw = 2 - (2 * (m.l + m.r)) / vw, Ah = 2 - (2 * (m.t + m.b)) / vh, tgt = new V3();
    const box = (d) => {
      this._placeCamera(d, tgt);
      let x0 = 9, x1 = -9, y0 = 9, y1 = -9; const v = new V3();
      for (const p of pts) { v.copy(p).project(c); x0 = Math.min(x0, v.x); x1 = Math.max(x1, v.x); y0 = Math.min(y0, v.y); y1 = Math.max(y1, v.y); }
      return { x0, x1, y0, y1 };
    };
    let lo = 3, hi = 300;
    for (let k = 0; k < 22; k++) { const mid = (lo + hi) / 2, b = box(mid); if (b.x1 - b.x0 <= Aw && b.y1 - b.y0 <= Ah) hi = mid; else lo = mid; }
    const b = box(hi);
    const cx = ((b.x0 + b.x1) / 2 + 1) / 2 * vw, cy = (1 - (b.y0 + b.y1) / 2) / 2 * vh;
    const dx = m.l + (vw - m.l - m.r) / 2, dy = m.t + (vh - m.t - m.b) / 2;
    return { d: hi, ox: cx - dx, oy: cy - dy };
  }

  _render3d() {
    const g2 = this.ctx, dpr = this.dpr;
    g2.setTransform(dpr, 0, 0, dpr, 0, 0); g2.clearRect(0, 0, this.vw, this.vh);
    if (!this.G || !this.vw) {
      this.renderer.render(this.scene, this.cam);
      g2.fillStyle = '#fff'; g2.font = '700 16px system-ui'; g2.textAlign = 'center'; g2.fillText('Connexion à la partie…', this.vw / 2, this.vh / 2);
      return;
    }
    if (this.boardMode !== this.G.mode || !this.boardRoot) this._buildBoard();
    const now = performance.now(), dt = Math.min(0.05, (now - (this._t3 || now)) / 1000); this._t3 = now;

    // caméra (ajustée en douceur quand les panneaux changent) ; en hauteur, vue plus plongeante
    const pitch0 = this.vh > this.vw ? 1.2 : 0.98;
    if (this.T.pitch == null) this.T.pitch = pitch0;
    if (this.pitch == null) this.pitch = this.T.pitch;
    const sm = 1 - Math.exp(-dt * 11);
    let dy = this.T.yaw - this.yaw;
    this.yaw += dy * sm; this.pitch += (this.T.pitch - this.pitch) * sm;
    this.zoom *= Math.pow(this.T.zoom / this.zoom, sm); this.pan.lerp(this.T.pan, sm);
    const m0 = this._margins(), fk = [this.vw, this.vh, m0.l, m0.r, m0.t, m0.b, this.G.mode, pitch0].join();
    if (fk !== this.fitKey) {
      const save = [this.yaw, this.pitch]; this.yaw = 0; this.pitch = pitch0;
      this.fitT = this._fit(); this.fitKey = fk; [this.yaw, this.pitch] = save;
    }
    const f = this.fitT;
    if (!this.curFit) this.curFit = { ...f };
    const k = 1 - Math.exp(-dt * 8);
    for (const key of ['d', 'ox', 'oy']) this.curFit[key] += (f[key] - this.curFit[key]) * k;
    this.camDist = this.curFit.d / this.zoom;
    this._placeCamera(this.camDist, this.pan);
    this.scene.fog.near = this.camDist + 6; this.scene.fog.far = this.camDist + 40;
    this.cam.setViewOffset(this.vw, this.vh, this.curFit.ox, this.curFit.oy, this.vw, this.vh);

    // repères
    for (const p of Object.values(this.markPool)) { p.n = 0; for (const m of p.list) m.visible = false; }
    const G = this.G;
    this.zone.visible = this.phase === 'setup';
    if (this.zone.visible) { const side = this.setupSide; this.zone.position.set(0, 0.003, side === 0 ? G.H / 2 - G.R / 2 : -G.H / 2 + G.R / 2); }
    if (this.phase === 'setup' && this.manual && this.pick) for (const i of this._ownCells()) if (!this.board[i]) this._mark('place', i);
    if (this.last && this.phase !== 'pass') for (const i of new Set([this.last.from, this.last.to])) this._mark('last', i, 0.002);
    const focus = this.paraFollow ? this.paraFollow.a.to : this.sel;
    if (focus != null && this.phase !== 'pass') this._mark('sel', focus, 0.006);
    if (this.phase !== 'pass') for (const t of this._targets()) this._mark(t.k === 'raid' ? 'raid' : this.board[t.to] ? 'attack' : t.k === 'drop' ? 'drop' : 'move', t.to, t.k === 'raid' ? 0.9 : 0.006);
    if (this.sel != null && this.acts.some((a) => a.k === 'v1' && a.from === this.sel)) for (const i of v1Path(this.G, this.board, this.sel)) this._mark('v1', i, 0.003);

    // figurines
    const seen = new Set(), T = this.t;
    const place = (p, i, faceUp) => {
      const g = this._model(p, faceUp); seen.add(p);
      g.visible = true; g.userData.cell = i;
      this._pos(i, g.position); g.rotation.x = 0; g.rotation.z = 0; g.scale.setScalar(1);
      g.rotation.y = p.side === 0 ? Math.PI : 0;
      if (i === focus) g.position.y = 0.12 + Math.sin(T * 5) * 0.03;
      const u = g.userData;
      if (u.props) for (const pr of u.props) pr.rotation.z += dt * 30;
      if (u.hover) u.hover.position.y = 0.4 + Math.sin(T * 2 + i) * 0.03;
      if (u.cloth) { const pa = u.cloth.geometry.attributes.position; for (let v = 0; v < pa.count; v++) { const x = pa.getX(v) + 0.2; pa.setZ(v, Math.sin(x * 14 - T * 5) * 0.03 * x * 3); } pa.needsUpdate = true; }
      if (u.spin) u.spin.rotation.y = Math.sin(T * 1.5 + i) * 0.4;
      if (u.turret) u.turret.rotation.y = Math.sin(T * 0.7 + i) * 0.5;
      if (u.badge) u.badge.material.map = badgeTex(String(BY_ID[p.id].r), p.side, p.revealed && p.side === this.viewer && !this.over);
      return g;
    };
    if (this.phase !== 'pass') for (let i = 0; i < G.N; i++) { const p = this.board[i]; if (p) place(p, i, this._faceUp(p)); }

    // déplacement en cours
    if (this.anim && this.phase !== 'pass') {
      const a = this.anim, kk = ease(a.t), gm = place(a.piece, a.to, this._faceUp(a.piece));
      gm.userData.cell = null;
      const p0 = this._pos(a.from), p1 = this._pos(a.to);
      gm.position.lerpVectors(p0, p1, kk);
      gm.position.y = a.drop ? Math.sin(kk * Math.PI) * 3.2 + (1 - kk) * 0.0 : Math.sin(kk * Math.PI) * 0.25;
      if (a.drop) {
        if (!this.chute) { this.chute = new THREE.Group(); add(this.chute, sph(0.45, 18, true), mat('#f2efe6', { r: 0.9 }), 0, 0, 0); for (const [x, z] of [[-0.3, 0.3], [0.3, 0.3], [-0.3, -0.3], [0.3, -0.3]]) add(this.chute, cyl(0.006, 0.006, 0.75, 4), mat('#ddd'), x * 0.5, -0.35, z * 0.5, z * 0.6, 0, -x * 0.6); this.scene.add(this.chute); }
        this.chute.visible = kk > 0.3; this.chute.position.copy(gm.position); this.chute.position.y += 1.25;
      }
    }
    if (this.chute && (!this.anim || !this.anim.drop)) this.chute.visible = false;

    // combat : l'attaquant avance, le perdant tombe
    let banner = null;
    if (this.combat) {
      const c = this.combat, ga = this.models.get(c.a)?.g, gd = this.models.get(c.d)?.g;
      const p0 = this._pos(c.from), p1 = this._pos(c.to);
      if (c.raid) {
        // l'avion décolle et survole la cible
        if (!this.flyer || this.flyer.userData.side !== c.a.side) { if (this.flyer) this.scene.remove(this.flyer); this.flyer = buildModel('bombardier', c.a.side, true, this.opts.pieceStyle, true); this.flyer.userData.side = c.a.side; this.scene.add(this.flyer); }
        const kk = ease(c.t / 0.9);
        this.flyer.visible = true; this.flyer.position.lerpVectors(p0, p1, kk); this.flyer.position.y = 0.4 + Math.sin(Math.min(1, c.t / 0.9) * Math.PI) * 1.6 + 0.6;
        this.flyer.lookAt(p1.x, this.flyer.position.y, p1.z); if (p0.distanceTo(p1) < 0.01) this.flyer.rotation.set(0, 0, 0);
        for (const pr of this.flyer.userData.props) pr.rotation.z += dt * 40;
        if (c.t > 0.9 && !c.boomed) { c.boomed = true; if (c.res === 'win') this._boom(c.to, 1.2); else if (c.res === 'lose') this._boom(c.to, 0.5); }
      } else if (ga) {
        const kk = ease(c.t / 0.45) * 0.42;
        ga.position.lerpVectors(p0, p1, kk); ga.position.y = Math.sin(Math.min(1, c.t / 0.45) * Math.PI) * 0.15;
        ga.lookAt(p1.x, ga.position.y, p1.z);
        if (gd) gd.lookAt(p0.x, gd.position.y, p0.z);
        if (c.t > 0.6 && !c.boomed) { c.boomed = true; if (c.res === 'both') this._boom(c.to, 1.3); }
      }
      if (c.t > 0.75) {
        const kk = ease((c.t - 0.75) / 0.6);
        const fall = (g) => { if (!g) return; g.rotateX(-kk * Math.PI / 2 * 0.95); g.position.y -= kk * 0.1; };
        if (c.res === 'win' && !c.raid) fall(gd); else if (c.res === 'win' && c.raid) fall(gd);
        if (c.res === 'lose' && !c.raid) fall(ga); else if (c.res === 'lose' && c.raid) fall(ga);
        if (c.res === 'both') { fall(ga); fall(gd); }
      }
      banner = this._combatText(c);
    } else if (this.flyer) this.flyer.visible = false;

    // bombe volante
    if (this.blast) {
      const bl = this.blast, kk = Math.min(1, bl.t / 0.8);
      if (!this.missile) { this.missile = new THREE.Group(); rocket(this.missile, ARMY[bl.side], false); this.scene.add(this.missile); }
      const pts = [bl.from, ...bl.path].map((i) => this._pos(i));
      const n = (pts.length - 1) * kk, j = Math.floor(n), fr = n - j, A = pts[j], B = pts[Math.min(j + 1, pts.length - 1)];
      this.missile.visible = true; this.missile.position.lerpVectors(A, B, fr); this.missile.position.y = 0.45;
      const last = pts[pts.length - 1]; this.missile.lookAt(last.x, 0.45, last.z);
      bl.boomed ||= new Set();
      for (const i of bl.hit) { const hp = this._pos(i); if (!bl.boomed.has(i) && hp.distanceTo(pts[0]) <= this.missile.position.distanceTo(new V3(pts[0].x, 0.45, pts[0].z)) + 0.1) { bl.boomed.add(i); this._boom(i, 1.1); } }
      if (Math.random() < 0.6) this.fxs.push({ pos: this.missile.position.clone(), t: 0.25, size: 0.35 });
    } else if (this.missile) this.missile.visible = false;

    // ce qui n'est plus sur le plateau disparaît
    for (const [p, rec] of this.models) if (!seen.has(p)) { rec.g.parent?.remove(rec.g); this.models.delete(p); }

    // explosions
    this.fxPool ||= [];
    let fi = 0;
    this.fxs = this.fxs.filter((e) => (e.t += dt) < 0.9);
    for (const e of this.fxs) {
      let s = this.fxPool[fi++];
      if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.renderOrder = 6; this.scene.add(s); this.fxPool.push(s); }
      const k2 = e.t / 0.9; s.visible = true; s.position.copy(e.pos); s.position.y += k2 * 0.6;
      s.scale.setScalar(e.size * (0.6 + k2 * 2.2)); s.material.opacity = 1 - k2;
    }
    for (; fi < this.fxPool.length; fi++) this.fxPool[fi].visible = false;

    this.renderer.render(this.scene, this.cam);

    // calques 2D : écran « passe le téléphone » et bandeau de combat
    if (this.phase === 'pass') return this._renderPass(g2);
    if (banner) this._drawBanner(g2, banner);
  }

  _combatText(c) {
    const A = BY_ID[c.a.id].name, D = BY_ID[c.d.id].name;
    const head = c.raid ? `✈️ Bombardement : ${D}` : `${A} attaque ${D}`;
    let txt = '';
    if (c.t > 0.7) {
      if (c.raid) txt = c.res === 'win' ? `${D} détruit !` : c.res === 'lose' ? (c.d.id === 'dca' ? 'Abattu par la D.C.A. !' : 'Moteur bloqué par le barrage !') : `${D} : bombe sans effet`;
      else if (c.d.id === 'drapeau' || c.d.id === 'plan' || (c.d.id === 'citerne' && this.G.mode === 'facile')) txt = `${D} capturé !`;
      else if (c.res === 'both') txt = c.d.id === 'mine' ? 'Boum ! La mine saute' : 'Boum ! La bombe explose';
      else if (c.res === 'win') txt = (c.d.id === 'mine' || c.d.id === 'bomberet') ? 'Le sapeur désamorce !' : c.d.id === 'general' ? "L'espion prend le Général !" : `${A} l'emporte`;
      else txt = c.d.id === 'general' ? 'Seul un espion prend le Général' : `${D} l'emporte`;
    }
    return { head, txt, k: Math.min(1, c.t / 0.25) };
  }
  _drawBanner(g, b) {
    const m = this._margins(), w = Math.min(420, this.vw - m.l - m.r - 16), x = m.l + (this.vw - m.l - m.r) / 2, y = m.t + 14;
    g.globalAlpha = b.k;
    g.fillStyle = 'rgba(10,12,6,0.78)'; g.beginPath(); g.roundRect(x - w / 2, y, w, b.txt ? 64 : 38, 14); g.fill();
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#fff'; g.font = `800 ${Math.min(16, w / 22)}px system-ui`; g.fillText(b.head, x, y + 19);
    if (b.txt) { g.fillStyle = '#ffd34d'; g.font = `900 ${Math.min(20, w / 17)}px system-ui`; g.fillText(b.txt, x, y + 46); }
    g.globalAlpha = 1;
  }
}
