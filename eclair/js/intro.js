// Animation d'arrivée (≈ 18 s) jouée sur le vrai plateau, avec les figurines du jeu :
// les armées en place, l'avance dans les couloirs, un raid aérien (la D.C.A. abat un avion),
// une bombe volante, un corps à corps, un parachutage, puis l'éclair et le titre.
import * as THREE from '../vendor/three.module.js';
import { buildModel, boardMesh, glowTex } from './stratego/game3d.js';
import { W, geom, autoSetup } from './stratego/rules.js';
import { fx, unlockAudio, audioRunning } from './fx.js';
import { playMarch } from './march.js';

const V3 = THREE.Vector3;
const DUR = 18.6, FLASH = 16.0;
const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

export function playIntro(host, onDone, style = 'france') {
  // le navigateur n'autorise le son qu'après un premier toucher : écran d'accueil si besoin
  if (!audioRunning()) {
    host.innerHTML = `<div class="in-gate"><div class="in-bolt">⚡</div><h1>GUERRE<br><span>ÉCLAIR</span></h1><button class="btn primary">▶ Touche pour commencer</button><small>🔊 Monte le son !</small></div>`;
    host.classList.add('show');
    host.querySelector('.in-gate').onclick = () => { unlockAudio(); setTimeout(() => run(host, onDone, style), 60); };
    return;
  }
  run(host, onDone, style);
}

function softTex(inner, outer) {
  const c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'), r = g.createRadialGradient(32, 32, 2, 32, 32, 32);
  r.addColorStop(0, inner); r.addColorStop(1, outer); g.fillStyle = r; g.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(c);
}

function run(host, onDone, style) {
  let music = null;
  host.innerHTML = `<canvas></canvas>
    <div class="in-flash"></div>
    <div class="in-title"><div class="in-bolt">⚡</div><h1>GUERRE<br><span>ÉCLAIR</span></h1><p>Prends le drapeau et le plan secret</p></div>
    <div class="in-sub"></div>
    <button class="in-skip">Passer ›</button>`;
  host.classList.add('show');
  const cv = host.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return finish(); }
  const mobile = matchMedia('(pointer: coarse)').matches;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, mobile ? 1.6 : 2));

  // ---------- décor ----------
  const scene = new THREE.Scene();
  const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256;
  const sg = sky.getContext('2d'), grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1e2a44'); grad.addColorStop(0.5, '#a8645a'); grad.addColorStop(0.72, '#e9a86e'); grad.addColorStop(1, '#3e3a28');
  sg.fillStyle = grad; sg.fillRect(0, 0, 4, 256);
  const skyT = new THREE.CanvasTexture(sky); skyT.colorSpace = THREE.SRGBColorSpace; scene.background = skyT;
  scene.fog = new THREE.Fog('#9a7258', 16, 42);
  scene.add(new THREE.HemisphereLight('#ffe0c0', '#2e2818', 1.15));
  const sun = new THREE.DirectionalLight('#ffc890', 2.6); sun.position.set(-9, 6, -6); sun.castShadow = true;
  const sm = mobile ? 1024 : 2048; sun.shadow.mapSize.set(sm, sm); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.02;
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 1, far: 40 });
  scene.add(sun);
  const boomLight = new THREE.PointLight('#ff9a40', 0, 9, 1.6); scene.add(boomLight);
  const flashLight = new THREE.PointLight('#cfe4ff', 0, 60); flashLight.position.set(0, 12, -2); scene.add(flashLight);

  // champ de bataille autour du plateau
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: '#4a5232', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.36; ground.receiveShadow = true; scene.add(ground);
  let seed = 7; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dirt = new THREE.MeshStandardMaterial({ color: '#3a3020', roughness: 1 });
  for (let k = 0; k < 40; k++) {
    const a = rnd() * Math.PI * 2, d = 9 + rnd() * 14;
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.5 + rnd() * 1.4, 16), dirt); c.rotation.x = -Math.PI / 2;
    c.position.set(Math.cos(a) * d, -0.35, Math.sin(a) * d * 0.8); c.receiveShadow = true; scene.add(c);
  }
  // sacs de sable autour du plateau
  const sandM = new THREE.MeshStandardMaterial({ color: '#a89668', roughness: 1 });
  const sandG = new THREE.CapsuleGeometry(0.16, 0.36, 4, 8);
  for (let k = 0; k < 92; k++) {
    const side = k % 4, u = (Math.floor(k / 4) / 22) * 2 - 1;
    const s = new THREE.Mesh(sandG, sandM); s.rotation.z = Math.PI / 2;
    if (side < 2) s.position.set(u * 6.9, -0.2, (side ? 1 : -1) * 6.0);
    else { s.position.set((side === 2 ? 1 : -1) * 7.0, -0.2, u * 5.6); s.rotation.y = Math.PI / 2; }
    s.castShadow = true; s.receiveShadow = true; scene.add(s);
  }
  const G = geom('complet');
  scene.add(boardMesh(G));

  // ---------- les deux armées (placement fixe : le film est toujours le même) ----------
  const cells = new Array(G.N).fill(null);
  const pos = (x, y, out = new V3()) => out.set(x - W / 2 + 0.5, 0, y - G.H / 2 + 0.5);
  [autoSetup(G, 0, rnd), autoSetup(G, 1, rnd)].forEach((list, side) => list.forEach((c) => { cells[c.i] = { id: c.id, side }; }));
  const at = (x, y) => cells[y * W + x];
  const swap = (side, x, y, id) => { // force une figurine sur une case (échange avec une autre du même camp)
    const k = cells.findIndex((c, i) => c && c.side === side && c.id === id && i !== y * W + x && !c.fixed);
    const cur = cells[y * W + x];
    if (cur && cur.id === id) { cur.fixed = true; return; }
    if (k < 0) return; cells[y * W + x] = cells[k]; cells[k] = cur; cells[y * W + x].fixed = true;
  };
  const xA = 4, xB = 7, xV = 8, xP = 3; // corps à corps, bond, bombe volante, parachutage
  swap(0, xA, 6, 'sergent'); swap(1, xA, 3, 'corpsfranc');
  swap(0, xB, 6, 'corpsfranc'); swap(0, 0, 6, 'corpsfranc'); swap(1, 11, 3, 'sapeur');
  swap(0, xV, 7, 'v1'); swap(0, 10, 9, 'bombardier'); swap(0, 1, 9, 'bombardier'); swap(0, 2, 8, 'parachutiste');
  swap(1, 2, 1, 'dca'); swap(1, 9, 2, 'capitaine'); swap(1, xV, 0, 'drapeau');
  const figs = [];
  cells.forEach((c, i) => {
    if (!c) return;
    const m = buildModel(c.id, c.side, true, style);
    m.traverse((o) => { if (o.isSprite) o.visible = false; });
    pos(i % W, Math.floor(i / W), m.position); m.rotation.y = c.side === 0 ? Math.PI : 0;
    scene.add(m); c.m = m; figs.push(m);
  });

  // ---------- effets ----------
  const smokeT = softTex('rgba(120,115,105,0.9)', 'rgba(120,115,105,0)'), darkSmokeT = softTex('rgba(40,36,32,0.95)', 'rgba(40,36,32,0)');
  const parts = [];
  const sprite = (tex, add) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, blending: add ? THREE.AdditiveBlending : THREE.NormalBlending })); scene.add(s); return s; };
  const puff = (p, o = {}) => {
    const s = sprite(o.tex || smokeT, o.add); s.position.copy(p);
    parts.push({ s, v: o.v || new V3((rnd() - 0.5) * 0.4, 0.5 + rnd() * 0.5, (rnd() - 0.5) * 0.4), life: o.life || 2.2, t: 0, s0: o.s0 || 0.4, s1: o.s1 || 1.8, a0: o.a0 ?? 0.75 });
  };
  const debrisG = new THREE.BoxGeometry(0.07, 0.05, 0.09), debrisM = new THREE.MeshStandardMaterial({ color: '#2b241a', roughness: 1 });
  const debris = [];
  let shake = 0, boomT = 9;
  const explode = (p, power = 1) => {
    const q = p.clone(); q.y = Math.max(0.25, q.y);
    puff(q, { tex: glowTex(), add: true, life: 0.55, s0: 0.6 * power, s1: 3.2 * power, a0: 1, v: new V3(0, 0.4, 0) });
    for (let k = 0; k < 8; k++) puff(q, { tex: glowTex(), add: true, life: 0.5 + rnd() * 0.3, s0: 0.3, s1: 0.9 * power, v: new V3((rnd() - 0.5) * 3, rnd() * 2.5, (rnd() - 0.5) * 3) });
    for (let k = 0; k < 9; k++) puff(q, { tex: k % 3 ? smokeT : darkSmokeT, life: 2.6 + rnd(), s0: 0.5 * power, s1: (2.2 + rnd()) * power, a0: 0.7, v: new V3((rnd() - 0.5) * 0.8, 0.5 + rnd() * 0.9, (rnd() - 0.5) * 0.8) });
    for (let k = 0; k < 10; k++) { const d = new THREE.Mesh(debrisG, debrisM); d.position.copy(q); d.castShadow = true; scene.add(d); debris.push({ d, v: new V3((rnd() - 0.5) * 5, 2 + rnd() * 4, (rnd() - 0.5) * 5), r: new V3(rnd() * 9, rnd() * 9, rnd() * 9) }); }
    boomLight.position.copy(q).add(new V3(0, 0.6, 0)); boomT = 0; shake = Math.max(shake, 0.25 * power);
    if (power > 1.1) fx.boom?.(); else fx.slam();
  };
  const flying = []; // figurines soufflées
  const blow = (c, dir = new V3(0, 0, -1), power = 1) => {
    if (!c || c.gone) return; c.gone = true;
    flying.push({ m: c.m, v: new V3(dir.x * 2 + (rnd() - 0.5) * 2, (3 + rnd() * 2) * power, dir.z * 2 + (rnd() - 0.5) * 2), spin: new V3((rnd() - 0.5) * 10, (rnd() - 0.5) * 6, (rnd() - 0.5) * 10), t: 0 });
  };

  // ---------- acteurs ----------
  const tw = []; // déplacements : {m, a, b, t0, t1, hop}
  const move = (c, x0, y0, x1, y1, t0, d = 0.55, hop = 0.25) => { tw.push({ m: c.m, a: pos(x0, y0), b: pos(x1, y1), t0, t1: t0 + d, hop }); };
  const A = at(xA, 6), Bc = at(xB, 6), C0 = at(0, 6), foeA = at(xA, 3), foeS = at(11, 3);
  move(A, xA, 6, xA, 5, 3.9); move(A, xA, 5, xA, 4, 4.7);
  move(Bc, xB, 6, xB, 4, 4.2, 0.8, 0.5); // bond du corps franc
  move(C0, 0, 6, 0, 5, 4.5); move(C0, 0, 5, 0, 4, 5.3);
  move(foeS, 11, 3, 11, 4, 5.6);

  // avions : un raid qui touche, un avion abattu par la D.C.A.
  const plane1 = buildModel('bombardier', 0, true, style, true), plane2 = buildModel('bombardier', 0, true, style, true);
  for (const p of [plane1, plane2]) { p.scale.setScalar(1.25); p.visible = false; scene.add(p); }
  const bomb = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), new THREE.MeshStandardMaterial({ color: '#222' })); bomb.visible = false; scene.add(bomb);
  const target1 = at(9, 2), dcaC = at(2, 1);
  const curve1 = new THREE.CatmullRomCurve3([pos(10, 9).setY(0.5), pos(10, 6).setY(2.6), pos(9, 2).setY(2.8), pos(8, -3).setY(4)]);
  const curve2 = new THREE.CatmullRomCurve3([pos(1, 9).setY(0.5), pos(1, 6).setY(2.4), pos(2, 2.5).setY(2.6)]);
  const tracerG = new THREE.BoxGeometry(0.025, 0.025, 0.5), tracerM = new THREE.MeshBasicMaterial({ color: '#ffe066' });
  const tracers = [];
  // bombe volante
  const v1c = at(xV, 7), v1fly = buildModel('v1', 0, true, style, true); v1fly.visible = false; scene.add(v1fly);
  const v1hits = []; for (let y = 3; y >= 0; y--) { const c = at(xV, y); if (c && c.side === 1) v1hits.push({ c, y }); }
  // parachutiste
  const para = at(2, 8);
  const chute = new THREE.Group();
  {
    const cm = new THREE.MeshStandardMaterial({ color: '#efeadb', roughness: 0.9, side: THREE.DoubleSide });
    const can = new THREE.Mesh(new THREE.SphereGeometry(0.55, 18, 8, 0, Math.PI * 2, 0, Math.PI / 2.4), cm); can.castShadow = true; chute.add(can);
    for (const [x, z] of [[-0.35, 0.35], [0.35, 0.35], [-0.35, -0.35], [0.35, -0.35]]) { const l = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.95, 3), new THREE.MeshBasicMaterial({ color: '#ccc' })); l.position.set(x * 0.6, -0.42, z * 0.6); l.rotation.set(z * 0.7, 0, -x * 0.7); chute.add(l); }
  }
  chute.visible = false; scene.add(chute);

  // poussière qui flotte dans la lumière
  const dustN = mobile ? 160 : 320, dustP = new Float32Array(dustN * 3);
  for (let k = 0; k < dustN; k++) { dustP[k * 3] = (rnd() - 0.5) * 16; dustP[k * 3 + 1] = rnd() * 4; dustP[k * 3 + 2] = (rnd() - 0.5) * 12; }
  const dustGeo = new THREE.BufferGeometry(); dustGeo.setAttribute('position', new THREE.BufferAttribute(dustP, 3));
  scene.add(new THREE.Points(dustGeo, new THREE.PointsMaterial({ color: '#ffe2b8', size: 0.035, transparent: true, opacity: 0.55, depthWrite: false })));

  // ---------- caméra ----------
  const w = (x, y) => pos(x, y);
  const keys = [
    [0, [-9.5, 2.6, 9.5], [0, 0.2, 1.5]],
    [3.4, [8.0, 3.0, 8.8], [0, 0.2, 1]],
    [5.6, [5.0, 3.4, 6.8], [0, 0.3, 0]],
    [7.3, [-8.0, 3.2, 4.8], [0, 2.0, 0]],
    [9.6, [-6.0, 3.6, -0.8], [w(2, 1).x, 1.2, w(2, 1).z]],
    [10.6, [w(xV, 7).x + 1.4, 2.1, w(xV, 7).z + 3.8], [w(xV, 2).x, 0.3, w(xV, 2).z]],
    [12.4, [w(xV, 2).x + 4.0, 3.6, w(xV, 2).z + 3.2], [w(xV, 1).x, 0.3, w(xV, 1).z]],
    [13.3, [w(xA, 4).x + 2.6, 2.1, w(xA, 4).z + 2.2], [w(xA, 3.6).x, 0.4, w(xA, 3.6).z]],
    [15.0, [w(xP, 1).x + 3.4, 3.4, w(xP, 1).z + 3.8], [w(xP, 1).x, 0.8, w(xP, 1).z]],
    [16.3, [0, 10.5, 9.5], [0, 0, 0]],
    [DUR, [0, 12.5, 11.5], [0, 0, 0]],
  ];
  const cam = new THREE.PerspectiveCamera(48, 1, 0.1, 200);
  const camAt = (t) => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const [t0, p0, a0] = keys[i], [t1, p1, a1] = keys[i + 1], k = smooth(t0, t1, t);
    return [new V3(...p0).lerp(new V3(...p1), k), new V3(...a0).lerp(new V3(...a1), k)];
  };

  const title = host.querySelector('.in-title'), flash = host.querySelector('.in-flash'), sub = host.querySelector('.in-sub');
  const SUBS = [[0.3, '1914 — Le front s\'éveille…'], [3.6, 'Les troupes avancent dans les couloirs'], [7.0, 'Raid aérien ! La D.C.A. riposte'], [10.5, 'Bombe volante lancée !'], [12.9, 'Corps à corps… et parachutistes !'], [FLASH - 0.4, '']];
  let ev = 0, t = 0, last = performance.now(), done = false, raf = 0;
  const events = [
    [1.2, () => fx.metal?.(0.25)],
    [6.9, () => fx.whoosh?.(1.4)],
    [8.55, () => { bomb.visible = true; bomb.position.copy(curve1.getPoint(0.62)); }],
    [9.0, () => { bomb.visible = false; explode(w(9, 2), 1.1); blow(target1, new V3(0.3, 0, -1)); }],
    [9.3, () => { plane2.userData.burning = true; fx.metal?.(0.6); }],
    [10.35, () => { explode(new V3(-6.6, -0.2, 2.2), 1.3); plane2.visible = false; }],
    [10.9, () => { fx.whoosh?.(1); v1c.m.visible = false; v1fly.visible = true; }],
    [13.45, () => { fx.metal(0.9); puff(w(xA, 3.5).setY(0.55), { tex: glowTex(), add: true, life: 0.35, s0: 0.2, s1: 1.1, a0: 1, v: new V3() }); }],
    [13.85, () => fx.thud?.(0.9)],
    [FLASH, () => { fx.slam(); flash.classList.add('on'); title.classList.add('on'); }],
  ];
  const hit = new Set();

  const resize = () => {
    const ww = host.clientWidth, hh = host.clientHeight;
    renderer.setSize(ww, hh, false); cam.aspect = ww / hh; cam.fov = ww < hh ? 66 : 46; cam.updateProjectionMatrix();
  };
  resize(); window.addEventListener('resize', resize);
  music = playMarch();

  const loop = (now) => {
    if (done) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    while (ev < events.length && t >= events[ev][0]) events[ev++][1]();
    { let cur = SUBS[0]; for (const s of SUBS) if (t >= s[0]) cur = s; if (sub.dataset.k !== String(cur[0])) { sub.dataset.k = String(cur[0]); sub.textContent = cur[1]; sub.classList.toggle('on', !!cur[1]); } }

    // déplacements
    for (const k of tw) {
      if (t < k.t0 || t > k.t1 + 0.05) continue;
      const u = Math.min(1, (t - k.t0) / (k.t1 - k.t0)), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
      k.m.position.lerpVectors(k.a, k.b, e); k.m.position.y = Math.sin(u * Math.PI) * k.hop;
      if (u < 1 && Math.random() < 0.15) puff(k.m.position.clone().setY(0.05), { life: 0.9, s0: 0.15, s1: 0.5, a0: 0.4, v: new V3(0, 0.2, 0) });
    }
    // avions
    for (const [p, curve, t0, d] of [[plane1, curve1, 6.9, 3.4], [plane2, curve2, 7.2, 2.1]]) {
      const u = (t - t0) / d;
      if (p === plane2 && p.userData.burning) {
        // abattu : fumée noire, chute en vrille hors du plateau
        const v = t - 9.3, base = curve2.getPoint(1);
        p.position.set(base.x - v * 3.4, Math.max(-0.2, base.y - v * v * 2.6), base.z + v * 1.6);
        p.rotation.z += dt * 6; p.rotation.x = 0.5;
        if (p.visible) { puff(p.position.clone(), { tex: darkSmokeT, life: 2, s0: 0.3, s1: 1.4, a0: 0.8, v: new V3(0, 0.3, 0) }); puff(p.position.clone(), { tex: glowTex(), add: true, life: 0.3, s0: 0.25, s1: 0.5, a0: 0.9, v: new V3() }); }
      } else if (u > 0 && u < 1) {
        p.visible = true;
        const q = curve.getPoint(u), q2 = curve.getPoint(Math.min(1, u + 0.02));
        p.position.copy(q); p.lookAt(q2); p.rotation.z += Math.sin(u * 6) * 0.15;
      } else if (u >= 1 && p === plane1) p.visible = false;
      for (const pr of p.userData.props || []) pr.rotation.z += dt * 45;
    }
    if (bomb.visible) bomb.position.y -= dt * 7;
    // la D.C.A. suit l'avion et tire des balles traçantes
    if (dcaC.m.userData.turret && t > 7.6 && t < 9.4) {
      const tp = plane2.position, dp = dcaC.m.position;
      dcaC.m.userData.turret.rotation.y = Math.atan2(tp.x - dp.x, tp.z - dp.z);
      if (plane2.visible && Math.random() < 0.55) {
        const tr = new THREE.Mesh(tracerG, tracerM); tr.position.copy(dp).add(new V3(0, 0.75, 0));
        const dir = tp.clone().sub(tr.position).normalize(); tr.lookAt(tp); scene.add(tr); tracers.push({ tr, dir, t: 0 });
        puff(tr.position.clone(), { tex: glowTex(), add: true, life: 0.12, s0: 0.25, s1: 0.4, a0: 1, v: new V3() });
        if (Math.random() < 0.3) fx.gauge?.();
      }
    }
    for (let k = tracers.length - 1; k >= 0; k--) { const r = tracers[k]; r.t += dt; r.tr.position.addScaledVector(r.dir, dt * 16); if (r.t > 0.35) { scene.remove(r.tr); tracers.splice(k, 1); } }
    // bombe volante
    if (v1fly.visible) {
      const u = (t - 10.9) / 1.25, z0 = w(xV, 7).z, z1 = w(xV, -1).z;
      v1fly.position.set(w(xV, 0).x, 0.62 + Math.sin(Math.min(1, u) * Math.PI) * 0.15, z0 + (z1 - z0) * Math.min(1, u));
      v1fly.lookAt(v1fly.position.x, 0.62, z1);
      puff(v1fly.position.clone().add(new V3(0, 0.05, 0.25)), { tex: glowTex(), add: true, life: 0.25, s0: 0.25, s1: 0.5, a0: 1, v: new V3() });
      if (Math.random() < 0.7) puff(v1fly.position.clone().add(new V3(0, 0.05, 0.35)), { life: 1.5, s0: 0.2, s1: 0.9, a0: 0.5, v: new V3(0, 0.2, 0.2) });
      for (const h of v1hits) if (!hit.has(h) && v1fly.position.z <= w(xV, h.y).z + 0.2) {
        hit.add(h);
        if (h.c.id === 'drapeau' || h.c.id === 'plan') continue;
        explode(w(xV, h.y), 1); blow(h.c, new V3(0, 0, -1), 0.9);
      }
      if (u >= 1) { v1fly.visible = false; explode(w(xV, -0.6), 1.2); }
    }
    // corps à corps : le sergent bat le corps franc
    if (t > 13.1 && t < 14.2) {
      const u = Math.min(1, (t - 13.1) / 0.35), back = smooth(13.6, 14.0, t);
      A.m.position.copy(w(xA, 4)).lerp(w(xA, 3.45), u * (1 - back));
      A.m.position.y = Math.sin(u * Math.PI) * 0.12 * (1 - back);
      if (t > 13.5) { foeA.fall = Math.min(1, (foeA.fall || 0) + dt * 2.5); foeA.m.rotation.x = foeA.fall * Math.PI / 2 * 0.95; foeA.m.position.y = -foeA.fall * 0.05; }
    }
    if (t > 14.3 && foeA.m.visible) { foeA.m.scale.multiplyScalar(0.9); if (foeA.m.scale.x < 0.05) foeA.m.visible = false; }
    if (t > 14.4) A.m.position.lerp(w(xA, 3), Math.min(1, dt * 5));
    // parachutage sur une case libérée par la bombe volante
    if (t > 13.0 && t < 15.6) {
      const u = Math.min(1, (t - 13.0) / 2.2), tgt = w(xP, 1);
      para.m.position.x = tgt.x - 2 * (1 - u); para.m.position.z = tgt.z + 2 * (1 - u);
      para.m.position.y = 6 * (1 - u) * (1 - u * 0.15);
      para.m.rotation.z = Math.sin(t * 3) * 0.12 * (1 - u);
      chute.visible = u < 0.98; chute.position.copy(para.m.position).add(new V3(0, 1.35, 0)); chute.rotation.z = para.m.rotation.z;
      if (u >= 1 && !para.landed) { para.landed = true; puff(tgt.clone().setY(0.1), { life: 1.2, s0: 0.3, s1: 1.1, a0: 0.5 }); fx.cushion?.(0.6); }
    }
    if (t > 15.6) chute.visible = false;

    // figurines soufflées, débris, fumées
    for (const f of flying) {
      f.t += dt; f.v.y -= 9.8 * dt; f.m.position.addScaledVector(f.v, dt);
      f.m.rotation.x += f.spin.x * dt; f.m.rotation.y += f.spin.y * dt; f.m.rotation.z += f.spin.z * dt;
      if (f.m.position.y < 0) { f.m.position.y = 0; f.v.multiplyScalar(0.3); f.v.y = Math.abs(f.v.y) * 0.3; f.spin.multiplyScalar(0.5); }
      if (f.t > 1.6) { f.m.scale.multiplyScalar(0.92); if (f.m.scale.x < 0.03) f.m.visible = false; }
    }
    for (const d of debris) {
      d.v.y -= 9.8 * dt; d.d.position.addScaledVector(d.v, dt);
      d.d.rotation.x += d.r.x * dt; d.d.rotation.y += d.r.y * dt;
      if (d.d.position.y < 0.02) { d.d.position.y = 0.02; d.v.multiplyScalar(0.4); d.v.y *= -0.4; d.r.multiplyScalar(0.6); }
    }
    for (let k = parts.length - 1; k >= 0; k--) {
      const p = parts[k]; p.t += dt; const u = p.t / p.life;
      if (u >= 1) { scene.remove(p.s); p.s.material.dispose(); parts.splice(k, 1); continue; }
      p.s.position.addScaledVector(p.v, dt); p.v.multiplyScalar(1 - dt * 1.2);
      p.s.scale.setScalar(p.s0 + (p.s1 - p.s0) * Math.sqrt(u)); p.s.material.opacity = p.a0 * (1 - u);
    }
    boomT += dt; boomLight.intensity = boomT < 0.6 ? 60 * (1 - boomT / 0.6) : 0;
    flashLight.intensity = t > FLASH && t < FLASH + 0.5 ? 400 * (1 - (t - FLASH) / 0.5) : 0;
    const dp = dustGeo.attributes.position;
    for (let k = 0; k < dustN; k++) { let y = dp.getY(k) + dt * 0.06; if (y > 4) y = 0; dp.setY(k, y); dp.setX(k, dp.getX(k) + Math.sin(t + k) * dt * 0.05); }
    dp.needsUpdate = true;

    const [p, a] = camAt(t);
    if (shake > 0) { shake = Math.max(0, shake - dt * 0.6); p.x += (rnd() - 0.5) * shake; p.y += (rnd() - 0.5) * shake; }
    cam.position.copy(p); cam.lookAt(a);
    renderer.render(scene, cam);
    if (t >= DUR) return finish();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  host.querySelector('.in-skip').onclick = (e) => { e.stopPropagation(); finish(); };

  function finish() {
    if (done) return; done = true;
    cancelAnimationFrame(raf); window.removeEventListener('resize', resize); music?.stop();
    host.classList.add('out');
    setTimeout(() => { renderer?.dispose(); host.classList.remove('show', 'out'); host.innerHTML = ''; onDone?.(); }, 450);
  }
}
