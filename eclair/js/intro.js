// Animation d'arrivée : un petit film en 3D avec les figurines du jeu.
// Les soldats avancent, les bombardiers passent au-dessus, une bombe volante frappe la ligne ennemie,
// puis un éclair dévoile le titre. Touche « Passer » pour aller directement au menu.
import * as THREE from '../vendor/three.module.js';
import { buildModel, glowTex } from './stratego/game3d.js';
import { fx, unlockAudio } from './fx.js';

const V3 = THREE.Vector3;
const DUR = 9.2;
const smooth = (a, b, t) => { const k = Math.min(1, Math.max(0, (t - a) / (b - a))); return k * k * (3 - 2 * k); };

export function playIntro(host, onDone, style = 'france') {
  host.innerHTML = `<canvas></canvas>
    <div class="in-flash"></div>
    <div class="in-title"><div class="in-bolt">⚡</div><h1>GUERRE<br><span>ÉCLAIR</span></h1><p>Prends le drapeau et le plan secret</p></div>
    <div class="in-sub"></div>
    <button class="in-skip">Passer ›</button>`;
  host.classList.add('show');
  const cv = host.querySelector('canvas');
  let renderer;
  try { renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true }); } catch (e) { return finish(); }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  const scene = new THREE.Scene();
  // ciel d'aube en dégradé
  const sky = document.createElement('canvas'); sky.width = 4; sky.height = 256;
  const sg = sky.getContext('2d'), grad = sg.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#2b3a5c'); grad.addColorStop(0.55, '#c9765a'); grad.addColorStop(0.75, '#f0b77a'); grad.addColorStop(1, '#5a5a3a');
  sg.fillStyle = grad; sg.fillRect(0, 0, 4, 256);
  const skyT = new THREE.CanvasTexture(sky); skyT.colorSpace = THREE.SRGBColorSpace; scene.background = skyT;
  scene.fog = new THREE.Fog('#b98a68', 14, 46);
  const hemi = new THREE.HemisphereLight('#ffe2c4', '#3a3020', 1.4); scene.add(hemi);
  const sun = new THREE.DirectionalLight('#ffd2a0', 2.4); sun.position.set(-8, 7, -10); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -14, right: 14, top: 14, bottom: -14, near: 1, far: 60 });
  scene.add(sun);
  const flashLight = new THREE.PointLight('#cfe4ff', 0, 60); flashLight.position.set(0, 12, -4); scene.add(flashLight);

  // terrain : champ, cratères, chevaux de frise
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(160, 160), new THREE.MeshStandardMaterial({ color: '#56603a', roughness: 1 }));
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; scene.add(ground);
  let seed = 11; const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const dirt = new THREE.MeshStandardMaterial({ color: '#3d3524', roughness: 1 });
  for (let k = 0; k < 26; k++) {
    const c = new THREE.Mesh(new THREE.CircleGeometry(0.4 + rnd() * 0.9, 18), dirt);
    c.rotation.x = -Math.PI / 2; c.position.set((rnd() - 0.5) * 30, 0.01, -rnd() * 26 + 6); c.receiveShadow = true; scene.add(c);
  }
  const wood = new THREE.MeshStandardMaterial({ color: '#6a4a2a', roughness: 0.9 });
  for (let x = -12; x <= 12; x += 2.2) {
    const g = new THREE.Group(); g.position.set(x + rnd() * 0.5, 0.3, -2.2 + rnd() * 0.4);
    for (const r of [Math.PI / 4, -Math.PI / 4]) { const b = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.08, 0.08), wood); b.rotation.z = r; b.castShadow = true; g.add(b); }
    const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.06, 1.2), wood); bar.castShadow = true; g.add(bar);
    scene.add(g);
  }

  // armées
  const RED = ['corpsfranc', 'sapeur', 'sergent', 'caporal', 'parachutiste', 'corpsfranc', 'capitaine', 'sapeur', 'lieutenant', 'adjudant', 'corpsfranc', 'colonel'];
  const BLUE = ['sergent', 'sapeur', 'corpsfranc', 'caporal', 'adjudant', 'corpsfranc', 'sapeur', 'lieutenant', 'corpsfranc', 'parachutiste'];
  const reds = [], blues = [];
  const put = (id, side, x, z) => { const m = buildModel(id, side, true, style); m.scale.setScalar(1.4); m.position.set(x, 0, z); m.rotation.y = side === 0 ? Math.PI : 0; m.traverse((o) => { if (o.isSprite) o.visible = false; }); scene.add(m); return m; };
  RED.forEach((id, k) => reds.push({ m: put(id, 0, (k % 6) * 1.3 - 3.25, 3 + Math.floor(k / 6) * 1.4), ph: rnd() * 6 }));
  BLUE.forEach((id, k) => blues.push({ m: put(id, 1, (k % 5) * 1.6 - 3.2 + rnd() * 0.3, -7 - Math.floor(k / 5) * 1.5), ph: rnd() * 6, hit: 3.95 + (k % 5) * 0.12 + Math.floor(k / 5) * 0.1, v: new V3((rnd() - 0.5) * 3, 4 + rnd() * 2, -2 - rnd() * 2), spin: (rnd() - 0.5) * 8 }));
  const gen = put('general', 0, 5.2, 7.4); gen.rotation.y = Math.PI * 0.9;
  const flag = put('drapeau', 0, -5.6, 7.2);
  const dca = put('dca', 0, 6.6, 4.2); const tank = put('citerne', 0, -6.4, 4.8); tank.rotation.y = Math.PI * 0.8;
  put('drapeau', 1, 2, -12); put('dca', 1, -4.5, -11);

  // bombardiers et bombe volante
  const planes = [0, 1, 2].map((k) => { const p = buildModel('bombardier', 0, true, style); p.children[0].visible = p.children[1].visible = false; p.children[2].children[0].visible = false; p.scale.setScalar(2.2); p.rotation.y = Math.PI; scene.add(p); return { p, off: k }; });
  const v1 = buildModel('v1', 0, true, style); v1.children[0].visible = v1.children[1].visible = false; v1.scale.setScalar(2); scene.add(v1);

  // explosions
  const glows = [], booms = [];
  const boom = (pos, size) => { booms.push({ pos: pos.clone(), t: 0, size }); };
  const smokeMat = new THREE.MeshStandardMaterial({ color: '#9a958a', transparent: true, opacity: 0.4, roughness: 1, depthWrite: false });
  const smoke = [];

  const cam = new THREE.PerspectiveCamera(50, 1, 0.1, 200);
  const keys = [ // temps, position, cible
    [0, [0.6, 1.7, 11.5], [0, 1.1, 1]],
    [2.6, [2.6, 2.4, 8.2], [-0.5, 1.2, -1]],
    [4.4, [1.2, 2.2, 3.2], [0, 0.6, -7.5]],
    [6.4, [0, 6.5, 12], [0, 0.5, -3]],
    [DUR, [0, 9, 15], [0, 0, -3]],
  ];
  const camAt = (t) => {
    let i = 0; while (i < keys.length - 2 && t > keys[i + 1][0]) i++;
    const [t0, p0, a0] = keys[i], [t1, p1, a1] = keys[i + 1], k = smooth(t0, t1, t);
    return [new V3(...p0).lerp(new V3(...p1), k), new V3(...a0).lerp(new V3(...a1), k)];
  };

  const title = host.querySelector('.in-title'), flash = host.querySelector('.in-flash'), sub = host.querySelector('.in-sub');
  const SUBS = [[0, 'Aube. Le front s\'éveille…'], [2.2, 'Les bombardiers décollent !'], [3.4, 'Bombe volante lancée !'], [6.0, '']];
  const events = [
    [1.9, () => fx.whoosh?.(1.2)], [3.3, () => fx.whoosh?.(0.8)], [3.95, () => fx.boom?.()], [4.3, () => fx.slam()], [4.6, () => fx.boom?.()],
    [6.0, () => { fx.slam(); flash.classList.add('on'); title.classList.add('on'); }],
  ];
  let ev = 0, t = 0, last = performance.now(), done = false, raf = 0, shake = 0;

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false); cam.aspect = w / h; cam.fov = w < h ? 68 : 50; cam.updateProjectionMatrix();
  };
  resize(); window.addEventListener('resize', resize);

  const loop = (now) => {
    if (done) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    while (ev < events.length && t >= events[ev][0]) events[ev++][1]();
    { let cur = SUBS[0]; for (const s of SUBS) if (t >= s[0]) cur = s; if (sub.dataset.k !== String(cur[0])) { sub.dataset.k = String(cur[0]); sub.textContent = cur[1]; sub.classList.toggle('on', !!cur[1]); } }

    // les rouges avancent au pas
    const march = smooth(0.3, 5.5, t) * 3.2;
    for (const s of reds) {
      const k = s.m; k.position.z = k.userData.z0 ??= k.position.z; k.position.z = k.userData.z0 - march;
      k.position.y = Math.abs(Math.sin(t * 6 + s.ph)) * 0.08; k.rotation.z = Math.sin(t * 6 + s.ph) * 0.05;
    }
    // les bleus attendent… puis sont soufflés
    for (const s of blues) {
      const k = s.m;
      if (t < s.hit) { k.position.y = Math.abs(Math.sin(t * 2 + s.ph)) * 0.03; continue; }
      if (!s.blown) { s.blown = true; s.p0 = k.position.clone(); boom(new V3(s.p0.x, 0.6, s.p0.z), 2.2); shake = 0.35; }
      const u = t - s.hit;
      k.position.set(s.p0.x + s.v.x * u, Math.max(0, s.v.y * u - 9.8 * u * u * 0.5), s.p0.z + s.v.z * u);
      k.rotation.x = Math.min(Math.PI / 2, u * s.spin * 0.6); k.rotation.z = u * s.spin * 0.3;
    }
    // drapeau qui flotte, hélices, D.C.A.
    for (const m of [flag]) { const c = m.userData.cloth; if (c) { const pa = c.geometry.attributes.position; for (let v = 0; v < pa.count; v++) { const x = pa.getX(v) + 0.2; pa.setZ(v, Math.sin(x * 14 - t * 6) * 0.04 * x * 3); } pa.needsUpdate = true; } }
    if (dca.userData.turret) dca.userData.turret.rotation.y = Math.sin(t * 0.8) * 0.6;
    gen.rotation.y = Math.PI * 0.9 + Math.sin(t * 0.7) * 0.15;

    // bombardiers : passent au-dessus de la caméra vers l'ennemi
    for (const { p, off } of planes) {
      const u = t - 1.6 - off * 0.25;
      p.visible = u > 0 && u < 6;
      p.position.set((off - 1) * 3.2, 4.2 + off * 0.4 + Math.sin(u * 2) * 0.15, 16 - u * 7.5);
      p.rotation.z = Math.sin(u * 1.5 + off) * 0.12;
      for (const pr of p.userData.props || []) pr.rotation.z += dt * 40;
    }
    // bombe volante : traverse le champ et frappe la ligne bleue
    { const u = (t - 3.25) / 0.7; v1.visible = u > 0 && u < 1; v1.position.set(-2 + u * 2.5, 0.9 + Math.sin(Math.min(1, u) * Math.PI) * 1.4, 5.5 - u * 13); v1.lookAt(0.5, 0.6, -8);
      if (u > 0 && u < 1 && Math.random() < 0.8) booms.push({ pos: v1.position.clone(), t: 0.45, size: 0.4 }); }

    // explosions + fumée
    let gi = 0;
    for (let i = booms.length - 1; i >= 0; i--) {
      const b = booms[i]; b.t += dt; if (b.t > 1) { booms.splice(i, 1); continue; }
      let s = glows[gi++];
      if (!s) { s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); scene.add(s); glows.push(s); }
      s.visible = true; s.position.copy(b.pos); s.position.y += b.t * 0.8; s.scale.setScalar(b.size * (0.5 + b.t * 2)); s.material.opacity = 1 - b.t;
      if (b.size > 1.5 && b.t < dt * 1.5) for (let q = 0; q < 2; q++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.5, 10, 8), smokeMat.clone()); m.position.copy(b.pos).add(new V3((rnd() - 0.5), 0, (rnd() - 0.5))); scene.add(m); smoke.push({ m, t: 0, v: 0.6 + rnd() * 0.8 }); }
    }
    for (; gi < glows.length; gi++) glows[gi].visible = false;
    for (const s of smoke) { s.t += dt; s.m.position.y += dt * s.v; s.m.scale.setScalar(1 + s.t * 1.5); s.m.material.opacity = Math.max(0, 0.38 - s.t * 0.16); }

    // éclair final
    flashLight.intensity = t > 6 && t < 6.5 ? 400 * (1 - (t - 6) / 0.5) : 0;

    const [p, a] = camAt(t);
    if (shake > 0) { shake = Math.max(0, shake - dt); p.x += (rnd() - 0.5) * shake * 0.6; p.y += (rnd() - 0.5) * shake * 0.6; }
    cam.position.copy(p); cam.lookAt(a);
    renderer.render(scene, cam);
    if (t >= DUR) return finish();
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);

  host.querySelector('.in-skip').onclick = (e) => { e.stopPropagation(); finish(); };
  host.onpointerdown = (e) => { unlockAudio(); };

  function finish() {
    if (done) return; done = true;
    cancelAnimationFrame(raf); window.removeEventListener('resize', resize);
    host.classList.add('out');
    setTimeout(() => { renderer?.dispose(); host.classList.remove('show', 'out'); host.innerHTML = ''; onDone?.(); }, 450);
  }
}
