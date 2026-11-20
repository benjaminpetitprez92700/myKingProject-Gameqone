// Rendu réaliste du mini golf 3D : ciel physique, textures photo, herbe animée par le vent,
// arbres à feuillage dense, rochers, eau réfléchissante.
import * as THREE from '../../vendor/three.module.js';
import { Sky } from '../../vendor/Sky.js';
import { rng, trackDist, lakeDist } from './scenery.js';

const TAU = Math.PI * 2;
const loader = new THREE.TextureLoader();

export function photoTex(name, repeat = 1, srgb = true, aniso = 8) {
  const t = loader.load('textures/' + name);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  if (Array.isArray(repeat)) t.repeat.set(repeat[0], repeat[1]); else t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = aniso;
  return t;
}
function canvasTex(draw, w, h = w, srgb = true) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); if (srgb) t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- Ciel physique (modèle de Preetham) ----------
export function makeSky(elevationDeg, azimuthDeg, opts = {}) {
  const sky = new Sky(); sky.scale.setScalar(4500);
  const u = sky.material.uniforms;
  u.turbidity.value = opts.turbidity ?? 5; u.rayleigh.value = opts.rayleigh ?? 1.4;
  u.mieCoefficient.value = opts.mie ?? 0.004; u.mieDirectionalG.value = 0.82;
  const phi = THREE.MathUtils.degToRad(90 - elevationDeg), theta = THREE.MathUtils.degToRad(azimuthDeg);
  const sun = new THREE.Vector3().setFromSphericalCoords(1, phi, theta);
  u.sunPosition.value.copy(sun);
  return { sky, sun };
}

// nuages doux en arrière-plan
export function makeClouds(scene, cx, cz, seed = 3, tint = '#ffffff') {
  const r = rng(seed);
  const tex = canvasTex((g, w, h) => {
    for (let i = 0; i < 26; i++) {
      const x = w * (0.2 + r() * 0.6), y = h * (0.45 + (r() - 0.5) * 0.3), rad = w * (0.08 + r() * 0.14);
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
    }
  }, 256, 128);
  const mat = new THREE.SpriteMaterial({ map: tex, color: tint, transparent: true, depthWrite: false, fog: false, opacity: 0.85 });
  for (let i = 0; i < 9; i++) {
    const s = new THREE.Sprite(mat), a = r() * TAU, d = 1700 + r() * 900;
    s.position.set(cx + Math.cos(a) * d, 280 + r() * 380, cz + Math.sin(a) * d);
    s.scale.set(900 + r() * 700, 260 + r() * 200, 1);
    scene.add(s);
  }
}

// ---------- Sol : herbe photo + allées de gravier ----------
export function grassGround(scene, x0, z0, w, h) {
  const tex = photoTex('grass.jpg', [w / 110, h / 110]);
  const mat = new THREE.MeshStandardMaterial({ map: tex, roughness: 1, color: '#d8e8c8' });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
  m.rotation.x = -Math.PI / 2; m.position.set(x0 + w / 2, 0, z0 + h / 2); m.receiveShadow = true; scene.add(m);
  // grandes taches de couleur pour casser la répétition
  const r = rng(9);
  const blot = canvasTex((g, cw, ch) => {
    g.clearRect(0, 0, cw, ch);
    for (let i = 0; i < 70; i++) {
      const x = r() * cw, y = r() * ch, rad = 20 + r() * 70, c = r() < 0.5 ? '70,90,25' : '140,160,60';
      const gr = g.createRadialGradient(x, y, 0, x, y, rad); gr.addColorStop(0, `rgba(${c},0.28)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
    }
  }, 512, Math.round(512 * h / w));
  const bm = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshStandardMaterial({ map: blot, transparent: true, depthWrite: false, roughness: 1, polygonOffset: true, polygonOffsetFactor: -1 }));
  bm.rotation.x = -Math.PI / 2; bm.position.set(x0 + w / 2, 0.05, z0 + h / 2); bm.receiveShadow = true; scene.add(bm);
  const far = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), new THREE.MeshStandardMaterial({ map: photoTex('grass.jpg', 80), roughness: 1, color: '#c9dcb8' }));
  far.rotation.x = -Math.PI / 2; far.position.set(x0 + w / 2, -0.4, z0 + h / 2); far.receiveShadow = true; scene.add(far);
}

export function gravelPath(scene, pts, width, gravelCanvas) {
  const tex = new THREE.CanvasTexture(gravelCanvas); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
  const pos = [], uv = [], idx = [];
  let acc = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i], q = pts[Math.min(pts.length - 1, i + 1)], o = pts[Math.max(0, i - 1)];
    const dx = q[0] - o[0], dz = q[1] - o[1], l = Math.hypot(dx, dz) || 1, nx = -dz / l, nz = dx / l;
    if (i) acc += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    pos.push(p[0] + nx * width / 2, 0.15, p[1] + nz * width / 2, p[0] - nx * width / 2, 0.15, p[1] - nz * width / 2);
    uv.push(0, acc / 40, width / 40, acc / 40);
    if (i) { const a = (i - 1) * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.setIndex(idx); geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 }));
  m.receiveShadow = true; scene.add(m);
}

// ---------- Herbe en touffes, animée par le vent ----------
export function grassTufts(scene, level, wind, bounds, count = 2600) {
  const r = rng(level.height + 17);
  const tex = canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 46; i++) {
      const x = w * (0.08 + r() * 0.84), lean = (r() - 0.5) * w * 0.35, top = h * (0.05 + r() * 0.45), bw = 2 + r() * 3;
      const gr = g.createLinearGradient(0, h, 0, top);
      const l = 22 + r() * 18;
      gr.addColorStop(0, `hsl(${90 + r() * 20},55%,${l - 12}%)`); gr.addColorStop(1, `hsl(${75 + r() * 25},55%,${l + 18}%)`);
      g.fillStyle = gr; g.beginPath(); g.moveTo(x - bw, h); g.quadraticCurveTo(x + lean * 0.3, (h + top) / 2, x + lean, top); g.quadraticCurveTo(x + lean * 0.3 + bw * 0.4, (h + top) / 2, x + bw, h); g.fill();
    }
  }, 128, 128);
  const blade = new THREE.PlaneGeometry(14, 9); blade.translate(0, 4.5, 0);
  const b2 = blade.clone(); b2.rotateY(Math.PI / 2);
  const geo = mergeGeos([blade, b2]);
  const mat = new THREE.MeshStandardMaterial({ map: tex, alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.95 });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = wind;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      float hh = clamp(position.y / 9.0, 0.0, 1.0);
      vec4 ip = instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0);
      transformed.x += sin(uTime * 1.6 + ip.x * 0.045 + ip.z * 0.03) * hh * hh * 1.6;
      transformed.z += cos(uTime * 1.3 + ip.z * 0.05) * hh * hh * 0.8;`);
  };
  const inst = new THREE.InstancedMesh(geo, mat, count);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (let tries = 0; tries < count * 6 && n < count; tries++) {
    const x = bounds.x0 + r() * (bounds.x1 - bounds.x0), z = bounds.z0 + r() * (bounds.z1 - bounds.z0);
    if (trackDist(level, x, z) < 14 || lakeDist(level, x, z) < 4) continue;
    if (bounds.avoid && bounds.avoid(x, z)) continue;
    const sc = 0.6 + r() * 0.8;
    p.set(x, 0, z); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), r() * TAU); s.set(sc, sc * (0.8 + r() * 0.5), sc);
    inst.setMatrixAt(n, m.compose(p, q, s));
    inst.setColorAt(n, col.setHSL(0.25 + r() * 0.05, 0.4, 0.75 + r() * 0.25));
    n++;
  }
  inst.count = n; inst.receiveShadow = true; inst.castShadow = false;
  scene.add(inst);
  return inst;
}

// ---------- Arbres réalistes (feuillage en cartes de feuilles) ----------
function leafTexture(seed, hue = 100) {
  const r = rng(seed);
  return canvasTex((g, w, h) => {
    g.clearRect(0, 0, w, h);
    for (let i = 0; i < 150; i++) {
      const cx = w / 2 + (r() - 0.5) * w * 0.8, cy = h / 2 + (r() - 0.5) * h * 0.8;
      if (Math.hypot(cx - w / 2, cy - h / 2) > w * 0.44) continue;
      const len = 10 + r() * 12, wid = len * 0.45, a = r() * TAU, l = 20 + r() * 26;
      g.save(); g.translate(cx, cy); g.rotate(a);
      g.fillStyle = `hsl(${hue - 15 + r() * 30},${45 + r() * 20}%,${l}%)`;
      g.beginPath(); g.moveTo(-len / 2, 0); g.quadraticCurveTo(0, -wid, len / 2, 0); g.quadraticCurveTo(0, wid, -len / 2, 0); g.fill();
      g.strokeStyle = `hsla(${hue},40%,${l + 15}%,0.6)`; g.lineWidth = 0.8; g.beginPath(); g.moveTo(-len / 2, 0); g.lineTo(len / 2, 0); g.stroke();
      g.restore();
    }
  }, 256, 256);
}
function barkTexture() {
  const r = rng(4);
  return canvasTex((g, w, h) => {
    g.fillStyle = '#4a3626'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) {
      const x = r() * w; g.strokeStyle = r() < 0.5 ? 'rgba(20,12,6,0.6)' : 'rgba(120,95,70,0.4)'; g.lineWidth = 1 + r() * 3;
      g.beginPath(); g.moveTo(x, 0); for (let y = 0; y <= h; y += 16) g.lineTo(x + (r() - 0.5) * 6, y); g.stroke();
    }
  }, 128, 256);
}

export function realTrees(scene, trees, opts = {}) {
  if (!trees.length) return;
  const r = rng(trees.length * 31 + 7);
  const bark = new THREE.MeshStandardMaterial({ map: barkTexture(), roughness: 0.95 });
  bark.map.wrapS = bark.map.wrapT = THREE.RepeatWrapping; bark.map.repeat.set(2, 3);
  const trunkGeo = new THREE.CylinderGeometry(0.55, 1, 1, 10, 1); trunkGeo.translate(0, 0.5, 0);
  const branchGeo = new THREE.CylinderGeometry(0.3, 0.55, 1, 6, 1); branchGeo.translate(0, 0.5, 0);
  const leafMat = new THREE.MeshStandardMaterial({ map: leafTexture(5, opts.hue ?? 100), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85 });
  const cards = new THREE.PlaneGeometry(1, 1);
  const perTree = opts.cards ?? 130;
  const leaves = new THREE.InstancedMesh(cards, leafMat, trees.length * perTree);
  leaves.castShadow = true; leaves.receiveShadow = true;
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (const t of trees) {
    const s = t.s, trunkH = s * (0.7 + r() * 0.3), crownR = s * (0.85 + r() * 0.25), cy = trunkH + crownR * 0.55;
    const trunk = new THREE.Mesh(trunkGeo, bark); trunk.scale.set(s * 0.12, trunkH + crownR * 0.4, s * 0.12);
    trunk.position.set(t.x, 0, t.z); trunk.castShadow = trunk.receiveShadow = true; scene.add(trunk);
    for (let b = 0; b < 4; b++) {
      const br = new THREE.Mesh(branchGeo, bark), a = r() * TAU;
      br.scale.set(s * 0.06, crownR * 0.8, s * 0.06);
      br.position.set(t.x, trunkH * (0.65 + r() * 0.3), t.z);
      br.rotation.set(Math.cos(a) * 0.9, 0, Math.sin(a) * 0.9); br.castShadow = true; scene.add(br);
    }
    for (let i = 0; i < perTree; i++) {
      // répartition dans un ellipsoïde, plus dense en surface
      const u = r(), v = r(), th = u * TAU, ph = Math.acos(2 * v - 1), rr = crownR * Math.cbrt(0.35 + r() * 0.65);
      p.set(t.x + Math.sin(ph) * Math.cos(th) * rr, cy + Math.cos(ph) * rr * 0.8, t.z + Math.sin(ph) * Math.sin(th) * rr);
      e.set(r() * TAU, r() * TAU, r() * TAU); q.setFromEuler(e);
      const cs = s * (0.7 + r() * 0.4); sc.set(cs, cs, cs);
      leaves.setMatrixAt(n, m.compose(p, q, sc));
      const shade = 0.55 + 0.45 * ((p.y - cy) / crownR + 1) / 2;   // dessous plus sombre
      leaves.setColorAt(n, col.setRGB(shade * (0.9 + r() * 0.2), shade * (0.95 + r() * 0.1), shade * (0.85 + r() * 0.2)));
      n++;
    }
  }
  leaves.count = n;
  scene.add(leaves);
}

// buissons bas
export function bushes(scene, spots, hue = 105) {
  if (!spots.length) return;
  const r = rng(spots.length + 3);
  const mat = new THREE.MeshStandardMaterial({ map: leafTexture(8, hue), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.9 });
  const inst = new THREE.InstancedMesh(new THREE.PlaneGeometry(1, 1), mat, spots.length * 22);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (const b of spots) for (let i = 0; i < 22; i++) {
    const a = r() * TAU, d = r() * b.r;
    p.set(b.x + Math.cos(a) * d, b.r * 0.4 + r() * b.r * 0.6, b.z + Math.sin(a) * d);
    e.set(r() * TAU, r() * TAU, r() * TAU); q.setFromEuler(e);
    const cs = b.r * (0.7 + r() * 0.5); sc.set(cs, cs, cs);
    inst.setMatrixAt(n, m.compose(p, q, sc)); inst.setColorAt(n, col.setRGB(0.75 + r() * 0.25, 0.8 + r() * 0.2, 0.7 + r() * 0.2)); n++;
  }
  inst.count = n; inst.castShadow = inst.receiveShadow = true; scene.add(inst);
}

// rochers autour des plans d'eau
export function pondRocks(scene, lakes) {
  if (!lakes.length) return;
  const r = rng(lakes.length * 13 + 1);
  const rockTex = canvasTex((g, w, h) => {
    g.fillStyle = '#8a8579'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 1500; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(40,38,32,0.25)' : 'rgba(230,225,210,0.25)'; g.fillRect(r() * w, r() * h, 1 + r() * 2, 1 + r() * 2); }
  }, 128, 128);
  const geo = new THREE.DodecahedronGeometry(1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) { const k = 0.8 + r() * 0.35; pos.setXYZ(i, pos.getX(i) * k, pos.getY(i) * k * 0.7, pos.getZ(i) * k); }
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({ map: rockTex, roughness: 0.92 });
  const total = lakes.reduce((a, l) => a + Math.round((l.rx + l.ry) * 0.45), 0);
  const inst = new THREE.InstancedMesh(geo, mat, total);
  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), sc = new THREE.Vector3(), p = new THREE.Vector3(), col = new THREE.Color();
  let n = 0;
  for (const l of lakes) {
    const cnt = Math.round((l.rx + l.ry) * 0.45);
    for (let i = 0; i < cnt; i++) {
      const a = (i / cnt) * TAU + r() * 0.1, k = 1.02 + r() * 0.08;
      p.set(l.x + Math.cos(a) * l.rx * k, 0.5, l.y + Math.sin(a) * l.ry * k);
      e.set(r(), r() * TAU, r()); q.setFromEuler(e);
      const s = 3 + r() * 4; sc.set(s * (0.8 + r() * 0.5), s, s * (0.8 + r() * 0.5));
      inst.setMatrixAt(n, m.compose(p, q, sc)); inst.setColorAt(n, col.setRGB(0.8 + r() * 0.25, 0.8 + r() * 0.2, 0.78 + r() * 0.2)); n++;
    }
  }
  inst.count = n; inst.castShadow = inst.receiveShadow = true; scene.add(inst);
}

function mergeGeos(geos) {
  const pos = [], nor = [], uv = [], idx = [];
  let off = 0;
  for (const g of geos) {
    const gi = g.index ? g : g.toNonIndexed();
    pos.push(...gi.attributes.position.array); nor.push(...gi.attributes.normal.array); uv.push(...gi.attributes.uv.array);
    if (gi.index) for (const i of gi.index.array) idx.push(i + off);
    off += gi.attributes.position.count;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); out.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  if (idx.length) out.setIndex(idx);
  return out;
}
