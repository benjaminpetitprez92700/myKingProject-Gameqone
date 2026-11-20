// Mini golf en 3D (Three.js) : même physique et mêmes règles que la version 2D, rendu en volume.
// Monde 2D (x, y) -> monde 3D (x, hauteur, z = y).
import * as THREE from '../../vendor/three.module.js';
import { Game } from './game.js';
import { HOLE_R, obstacleShapes, predict, progressAlong, shoot } from './physics.js';
import { renderScene, rng, scatter, turfTile, sandTile, gravelTile, MARGIN_X, MARGIN_Y } from './scenery.js';
import { makeSky, makeClouds, grassGround, gravelPath, grassTufts, realTrees, bushes, pondRocks, photoTex } from './realism.js';
import { fx } from '../fx.js';

const TURF_H = 7, BEVEL = 0.6, TOP = TURF_H + BEVEL;   // hauteur du dessus du gazon
const BR = 7;                                          // rayon visuel de la balle
const DOME_H = 5;
const TAU = Math.PI * 2;

const SCENES = {
  parc: { sky: ['#4f95e8', '#d9ecff'], fog: '#cfe4f5', ground: '#5c9e45', sun: ['#fff1d6', 2.6], hemi: ['#cfe6ff', '#4b6b35', 0.9], sunDir: [-0.5, 1, -0.35], trim: '#6b4626', trimSide: '#4e3219', water: '#2f7f88' },
  mall: { sky: ['#f4efe6', '#fbf8f2'], fog: '#f1ece3', ground: '#e6e1d8', sun: ['#ffffff', 1.6], hemi: ['#ffffff', '#b8ad9c', 1.4], sunDir: [-0.25, 1, -0.2], trim: '#c7ced6', trimSide: '#8c949e', water: '#22b5c8' },
  ville: { sky: ['#2b2f6b', '#ff9a62'], fog: '#6f5a7a', ground: '#2c2f38', sun: ['#ffc08a', 2.4], hemi: ['#a9aef0', '#4a3f4f', 1.15], sunDir: [-1, 0.45, -0.6], trim: '#a9a49a', trimSide: '#6c6860', water: '#2c5d73' },
};

function canvasTex(cv, repeat = 1, srgb = true) {
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeat, repeat);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
function cnv(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); return c; }

// contour d'une capsule (segment épais aux bouts arrondis) en coordonnées de forme (x, -y)
function capsuleShape(a, b, r) {
  const dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
  const ang = Math.atan2(dy, dx);
  const pts = [];
  const N = 14;
  for (let i = 0; i <= N; i++) { const t = ang - Math.PI / 2 + (i / N) * Math.PI; pts.push([b[0] + Math.cos(t) * r, b[1] + Math.sin(t) * r]); }
  for (let i = 0; i <= N; i++) { const t = ang + Math.PI / 2 + (i / N) * Math.PI; pts.push([a[0] + Math.cos(t) * r, a[1] + Math.sin(t) * r]); }
  void len;
  return new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, -y)));
}
function flatShapeGeo(shape) { const g = new THREE.ShapeGeometry(shape, 12); g.rotateX(-Math.PI / 2); return g; }
function extrude(shape, depth, bevel) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 10 });
  g.rotateX(-Math.PI / 2);
  return g;
}

export class MiniGolf3D extends Game {
  static supported() {
    try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch (e) { return false; }
  }

  _initContext() {
    const r = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
    r.outputColorSpace = THREE.SRGBColorSpace;
    r.toneMapping = THREE.ACESFilmicToneMapping;
    r.toneMappingExposure = 1.0;
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer = r;
    this.camera = new THREE.PerspectiveCamera(52, 1, 1, 6000);
    this.yaw = -Math.PI / 2;
    this.camPos = new THREE.Vector3(); this.camLook = new THREE.Vector3();
  }

  resize() {
    const w = this.canvas.clientWidth || window.innerWidth, h = this.canvas.clientHeight || window.innerHeight;
    this.vw = w; this.vh = h; this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    if (!this.renderer) return;
    this.renderer.setPixelRatio(this.dpr);
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h; this.camera.updateProjectionMatrix();
    this.baseScale = Math.min(w / 380, h / 560);
  }

  // ---------- Construction du niveau ----------
  _prepareLevel() {
    this._dispose();
    this.wind = null; this.realSun = null;
    const L = this.level, S = SCENES[this.diff.scene], sceneName = this.diff.scene;
    const scene = new THREE.Scene();
    this.scene = scene;
    this.matCache = [];
    const M = (o) => { const m = new THREE.MeshStandardMaterial(o); this.matCache.push(m); return m; };
    const add = (mesh, cast = true, recv = true) => { mesh.castShadow = cast; mesh.receiveShadow = recv; scene.add(mesh); return mesh; };

    // ciel en dégradé + brouillard + reflets d'environnement
    const skyGeo = new THREE.SphereGeometry(3000, 32, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide, depthWrite: false, fog: false,
      uniforms: { top: { value: new THREE.Color(S.sky[0]) }, bottom: { value: new THREE.Color(S.sky[1]) } },
      vertexShader: 'varying vec3 vP; void main(){ vP = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: 'uniform vec3 top; uniform vec3 bottom; varying vec3 vP; void main(){ float h = clamp(vP.y*1.6+0.1,0.0,1.0); gl_FragColor = vec4(mix(bottom, top, h),1.0); }',
    });
    let sky = new THREE.Mesh(skyGeo, skyMat);
    const real = sceneName !== 'mall';           // ciel physique réaliste en extérieur
    if (real) {
      const ps = sceneName === 'parc' ? makeSky(38, 200, { turbidity: 4, rayleigh: 1.2 }) : makeSky(2.5, 230, { turbidity: 9, rayleigh: 3, mie: 0.006 });
      sky = ps.sky; this.realSun = ps.sun;
    }
    const envScene = new THREE.Scene(); envScene.add(real ? sky : sky.clone());
    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.envRT = pmrem.fromScene(envScene, 0.02, 1, 6000);
    pmrem.dispose();
    scene.environment = this.envRT.texture;
    if (real) envScene.remove(sky);
    scene.add(sky);
    scene.fog = new THREE.Fog(sceneName === 'parc' ? '#c9dceb' : S.fog, sceneName === 'parc' ? 900 : 700, sceneName === 'parc' ? 3400 : 2600);
    if (sceneName === 'parc') makeClouds(scene, 180, L.height / 2, L.height);

    // lumières
    scene.add(new THREE.HemisphereLight(S.hemi[0], S.hemi[1], S.hemi[2]));
    const sun = new THREE.DirectionalLight(S.sun[0], S.sun[1]);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera; sc.left = -260; sc.right = 260; sc.top = 260; sc.bottom = -260; sc.near = 10; sc.far = 1400;
    sun.shadow.bias = -0.0004; sun.shadow.normalBias = 0.6;
    scene.add(sun); scene.add(sun.target);
    this.sun = sun; this.sunDir = this.realSun ? this.realSun.clone().normalize() : new THREE.Vector3(...S.sunDir).normalize();
    if (sceneName === 'parc') { sun.color.set('#fff1dc'); sun.intensity = 3.2; }

    // sol : texture dessinée (gazon, marbre, routes...) + grand sol autour jusqu'à l'horizon
    const ground = sceneName === 'parc' ? null : renderScene(L, sceneName, 2, { groundOnly: true, maxSide: 4096 });
    if (sceneName === 'parc') {
      const gx0 = -MARGIN_X - 300, gz0 = -MARGIN_Y - 300, gw = 360 + (MARGIN_X + 300) * 2, gh = L.height + (MARGIN_Y + 300) * 2;
      grassGround(scene, gx0, gz0, gw, gh);
      const gc = gravelTile(9);
      for (let k = 0; k < 2; k++) {
        const pts = [], sx = k ? 400 : -60;
        for (let y = gz0; y <= gz0 + gh; y += 40) pts.push([sx + Math.sin(y * 0.006 + k * 2) * 70 + (k ? -20 : 20), y]);
        gravelPath(scene, pts, 26, gc);
      }
    } else {
    const gtex = canvasTex(ground.canvas); gtex.wrapS = gtex.wrapT = THREE.ClampToEdgeWrapping;
    gtex.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const gplane = new THREE.Mesh(new THREE.PlaneGeometry(ground.w, ground.h), M({ map: gtex, roughness: sceneName === 'mall' ? 0.35 : 0.95, metalness: 0 }));
    gplane.rotation.x = -Math.PI / 2; gplane.position.set(ground.x0 + ground.w / 2, 0, ground.y0 + ground.h / 2);
    add(gplane, false, true);
    const far = new THREE.Mesh(new THREE.PlaneGeometry(9000, 9000), M({ color: S.ground, roughness: 1 }));
    far.rotation.x = -Math.PI / 2; far.position.set(180, -0.3, L.height / 2);
    add(far, false, true);
    }

    // eau
    const nrm = canvasTex(cnv(256, 256, (g, w, h) => {
      const r = rng(77); g.fillStyle = 'rgb(128,128,255)'; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 260; i++) { const x = r() * w, y = r() * h, rr = 4 + r() * 14; const gr = g.createRadialGradient(x - 2, y - 2, 0, x, y, rr); gr.addColorStop(0, 'rgba(160,160,255,0.6)'); gr.addColorStop(1, 'rgba(100,100,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(x, y, rr, 0, TAU); g.fill(); }
    }), 0.03, false);
    this.waterNormal = sceneName === 'parc' ? photoTex('waternormals.jpg', 0.02, false) : nrm;
    for (const l of L.lakes) {
      const geo = new THREE.CircleGeometry(1, 64); geo.rotateX(-Math.PI / 2);
      const w = add(new THREE.Mesh(geo, M(sceneName === 'parc' ? { color: '#0f2f36', roughness: 0.12, metalness: 0, normalMap: this.waterNormal, normalScale: new THREE.Vector2(1.2, 1.2), envMapIntensity: 0.55 } : { color: S.water, roughness: 0.06, metalness: 0.15, normalMap: nrm, normalScale: new THREE.Vector2(0.6, 0.6), envMapIntensity: 1.4 })), false, true);
      w.scale.set(l.rx, 1, l.ry); w.position.set(l.x, 0.6, l.y);
      // berge
      const rim = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 8, 64), M({ color: sceneName === 'parc' ? '#8f8a7c' : sceneName === 'mall' ? '#f2efe8' : '#8b867b', roughness: 0.8 }));
      rim.rotation.x = Math.PI / 2; rim.scale.set(l.rx + 3, l.ry + 3, 40); rim.position.set(l.x, 0.6, l.y);
      if (sceneName !== 'parc') add(rim, false, true);
    }
    if (sceneName === 'parc') pondRocks(scene, L.lakes);

    // piste surélevée : bordure + gazon synthétique (extrusions de capsules)
    const turfT = canvasTex(turfTile(2), 1 / 16); turfT.anisotropy = this.renderer.capabilities.getMaxAnisotropy();
    const turfMat = sceneName === 'parc' ? M({ map: photoTex('grass.jpg', 1 / 70), roughness: 0.95, color: '#a6e08a' }) : M({ map: turfT, roughness: 0.92, color: '#ffffff' });
    const trimMat = sceneName === 'parc' ? M({ map: photoTex('wood.jpg', 1 / 60), bumpMap: photoTex('wood_bump.jpg', 1 / 60, false), bumpScale: 0.6, roughness: 0.75, color: '#c49a6c' }) : M({ color: S.trim, roughness: sceneName === 'mall' ? 0.3 : 0.8, metalness: sceneName === 'mall' ? 0.8 : 0 });
    const trimSide = sceneName === 'parc' ? M({ map: photoTex('wood.jpg', 1 / 60), roughness: 0.8, color: '#8a6a48' }) : M({ color: S.trimSide, roughness: 0.85 });
    for (const t of L.track) {
      if (t.bridge) continue;
      const trim = add(new THREE.Mesh(extrude(capsuleShape(t.a, t.b, t.w / 2 + 5), TURF_H - 1.4, 1.2), [trimMat, trimSide]));
      void trim;
      add(new THREE.Mesh(extrude(capsuleShape(t.a, t.b, t.w / 2), TURF_H, BEVEL), [turfMat, trimSide]));
    }
    for (const t of L.track) if (t.bridge) this._bridge(t, sceneName, M, add);

    // bunkers, pentes, bosses, creux
    const sandT = canvasTex(sandTile(6), 1 / 22);
    for (const z of L.sand) {
      const sh = new THREE.Shape(); const r = Math.min(14, z.w / 2, z.h / 2);
      const x = z.x, y = -z.y - z.h, w = z.w, h = z.h;
      sh.moveTo(x + r, y); sh.lineTo(x + w - r, y); sh.quadraticCurveTo(x + w, y, x + w, y + r); sh.lineTo(x + w, y + h - r); sh.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      sh.lineTo(x + r, y + h); sh.quadraticCurveTo(x, y + h, x, y + h - r); sh.lineTo(x, y + r); sh.quadraticCurveTo(x, y, x + r, y);
      const m = add(new THREE.Mesh(flatShapeGeo(sh), M({ map: sandT, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2 })), false, true);
      m.position.y = TOP + 0.05;
    }
    for (const z of L.slopes) {
      const tex = canvasTex(cnv(128, 128, (g, w, h) => {
        g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(255,255,255,0.75)'; g.lineWidth = 10; g.lineCap = 'round'; g.lineJoin = 'round';
        for (const yy of [32, 96]) { g.beginPath(); g.moveTo(40, yy - 20); g.lineTo(80, yy); g.lineTo(40, yy + 20); g.stroke(); }
      }), 1);
      const geo = new THREE.PlaneGeometry(z.w, z.h); geo.rotateX(-Math.PI / 2);
      const ang = Math.atan2(z.fy, z.fx);
      tex.center.set(0.5, 0.5); tex.rotation = -ang; tex.repeat.set(z.w / 40, z.h / 40);
      const m = add(new THREE.Mesh(geo, M({ map: tex, transparent: true, roughness: 1, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false })), false, true);
      m.position.set(z.x + z.w / 2, TOP + 0.06, z.y + z.h / 2);
    }
    const dome = new THREE.SphereGeometry(1, 40, 14, 0, TAU, 0, Math.PI / 2);
    for (const b of L.bumps) {
      if (b.h > 0) {
        const m = add(new THREE.Mesh(dome, turfMat), false, true);
        m.scale.set(b.r, DOME_H, b.r); m.position.set(b.x, TOP - 0.05, b.y);
      } else {
        const tex = canvasTex(cnv(128, 128, (g) => { const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64); gr.addColorStop(0, 'rgba(0,25,0,0.55)'); gr.addColorStop(1, 'rgba(0,25,0,0)'); g.fillStyle = gr; g.fillRect(0, 0, 128, 128); }));
        const geo = new THREE.CircleGeometry(b.r, 40); geo.rotateX(-Math.PI / 2);
        const m = add(new THREE.Mesh(geo, M({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 })), false, true);
        m.position.set(b.x, TOP + 0.07, b.y);
      }
    }

    // tapis de départ
    {
      const t0 = L.track[0], ang = Math.atan2(t0.b[1] - t0.a[1], t0.b[0] - t0.a[0]);
      const mat = add(new THREE.Mesh(new THREE.BoxGeometry(18, 0.5, 30), M({ color: '#2c5a35', roughness: 0.95 })), false, true);
      mat.position.set(L.start[0], TOP + 0.3, L.start[1]); mat.rotation.y = -ang + Math.PI / 2;
    }

    // trou + drapeau
    {
      const [hx, hy] = L.hole;
      const holeTex = canvasTex(cnv(128, 128, (g) => { const gr = g.createRadialGradient(56, 56, 4, 64, 64, 64); gr.addColorStop(0, '#000'); gr.addColorStop(0.8, '#0c0c0c'); gr.addColorStop(1, '#2a2a2a'); g.fillStyle = gr; g.beginPath(); g.arc(64, 64, 64, 0, TAU); g.fill(); }));
      const hg = new THREE.CircleGeometry(HOLE_R, 40); hg.rotateX(-Math.PI / 2);
      const hm = add(new THREE.Mesh(hg, M({ map: holeTex, roughness: 1, polygonOffset: true, polygonOffsetFactor: -4 })), false, true);
      hm.position.set(hx, TOP + 0.08, hy);
      const rg = new THREE.RingGeometry(HOLE_R, HOLE_R + 1.4, 40); rg.rotateX(-Math.PI / 2);
      const rm = add(new THREE.Mesh(rg, M({ color: '#f5f5f5', roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -4 })), false, true);
      rm.position.set(hx, TOP + 0.09, hy);
      const pole = add(new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 62, 10), M({ color: '#f2f2f2', roughness: 0.3, metalness: 0.4 })));
      pole.position.set(hx, TOP + 31, hy);
      this.pole = pole;
      const flagTex = canvasTex(cnv(128, 80, (g, w, h) => {
        g.fillStyle = '#e63946'; g.fillRect(0, 0, w, h);
        g.fillStyle = '#fff'; g.font = '900 54px system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
        g.fillText(String(L.index + 1), w / 2, h / 2 + 3);
      }));
      const fgeo = new THREE.PlaneGeometry(26, 16, 12, 4); fgeo.translate(13, 0, 0);
      this.flagGeo = fgeo; this.flagBase = fgeo.attributes.position.array.slice();
      const flag = add(new THREE.Mesh(fgeo, M({ map: flagTex, side: THREE.DoubleSide, roughness: 0.8 })));
      flag.position.set(hx + 0.5, TOP + 53, hy);
      this.flag = flag;
    }

    // obstacles
    this.obsMeshes = L.obstacles.map((o) => this._obstacle(o, sceneName, M, add));

    // décor en volume
    this._props(sceneName, M, add);

    // balle
    const dimple = cnv(256, 256, (g, w, h) => {
      g.fillStyle = '#fff'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < h; y += 12) for (let x = (y / 12) % 2 ? 6 : 0; x < w; x += 12) {
        const gr = g.createRadialGradient(x, y, 0, x, y, 5.5); gr.addColorStop(0, '#777'); gr.addColorStop(1, '#fff');
        g.fillStyle = gr; g.beginPath(); g.arc(x, y, 5.5, 0, TAU); g.fill();
      }
    });
    const bump = canvasTex(dimple, 1, false);
    const ballMat = new THREE.MeshPhysicalMaterial({ color: this.profile?.color || '#3a86ff', roughness: 0.5, clearcoat: 0.5, clearcoatRoughness: 0.35, envMapIntensity: 0.5, bumpMap: bump, bumpScale: 0.8 });
    this.matCache.push(ballMat);
    this.ballMesh = add(new THREE.Mesh(new THREE.SphereGeometry(BR, 40, 28), ballMat), true, false);

    // visée : points de trajectoire + jauge circulaire
    this.dots = new THREE.InstancedMesh(new THREE.SphereGeometry(1.1, 10, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.9 }), 80);
    this.dots.count = 0; this.dots.frustumCulled = false; scene.add(this.dots);
    this.ring = new THREE.Mesh(new THREE.RingGeometry(BR + 4, BR + 7, 48, 1, 0, 0.01), new THREE.MeshBasicMaterial({ color: '#7ee08a', side: THREE.DoubleSide, transparent: true, depthWrite: false }));
    this.ring.rotation.x = -Math.PI / 2; this.ring.visible = false; scene.add(this.ring);
    this.ringBg = new THREE.Mesh(new THREE.RingGeometry(BR + 4, BR + 7, 48), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.3, side: THREE.DoubleSide, depthWrite: false }));
    this.ringBg.rotation.x = -Math.PI / 2; this.ringBg.visible = false; scene.add(this.ringBg);

    // particules
    const pg = new THREE.BufferGeometry();
    pg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(400 * 3), 3));
    pg.setAttribute('color', new THREE.BufferAttribute(new Float32Array(400 * 3), 3));
    this.pts = new THREE.Points(pg, new THREE.PointsMaterial({ size: 2.6, vertexColors: true, transparent: true, depthWrite: false }));
    this.pts.frustumCulled = false; scene.add(this.pts);

    // caméra de départ : au-dessus du trou
    this.yaw = this._forwardYaw(L.start[0], L.start[1]);
    this.camPos.set(L.hole[0], TOP + 170, L.hole[1] + 90);
    this.camLook.set(L.hole[0], TOP, L.hole[1]);
    this.introFromPos = this.camPos.clone(); this.introFromLook = this.camLook.clone();
    this.lastBall = { x: L.start[0], y: L.start[1] };
  }

  _bridge(t, sceneName, M, add) {
    const dx = t.b[0] - t.a[0], dy = t.b[1] - t.a[1], len = Math.hypot(dx, dy), ang = Math.atan2(dy, dx);
    const grp = new THREE.Group();
    const wood = sceneName === 'parc';
    const deckTex = canvasTex(cnv(256, 64, (g, w, h) => {
      if (wood) {
        for (let x = 0; x < w; x += 16) { g.fillStyle = `hsl(28,45%,${38 + ((x * 7) % 9)}%)`; g.fillRect(x, 0, 14, h); g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillRect(x + 14, 0, 2, h); }
      } else {
        g.fillStyle = sceneName === 'mall' ? '#cfe9f5' : '#5b6068'; g.fillRect(0, 0, w, h);
        g.strokeStyle = sceneName === 'mall' ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.4)'; g.lineWidth = 2;
        for (let x = 0; x < w; x += sceneName === 'mall' ? 64 : 8) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
      }
    }));
    deckTex.repeat.set(len / 60, 1);
    const deck = new THREE.Mesh(new THREE.BoxGeometry(len + 10, 3, t.w), [
      M({ color: wood ? '#4a2f18' : '#8c949e' }), M({ color: wood ? '#4a2f18' : '#8c949e' }),
      M({ map: deckTex, roughness: wood ? 0.85 : 0.25, metalness: wood ? 0 : 0.5, transparent: sceneName === 'mall', opacity: sceneName === 'mall' ? 0.85 : 1 }),
      M({ color: '#3a2a1a' }), M({ color: wood ? '#4a2f18' : '#8c949e' }), M({ color: wood ? '#4a2f18' : '#8c949e' }),
    ]);
    deck.position.y = TOP - 1.5; deck.castShadow = deck.receiveShadow = true; grp.add(deck);
    const beamMat = M({ color: wood ? '#3a2412' : '#9aa3ad', metalness: wood ? 0 : 0.7, roughness: wood ? 0.9 : 0.35 });
    for (const s of [-1, 1]) {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(len + 14, 3, 3), beamMat);
      beam.position.set(0, TOP - 2.5, s * (t.w / 2 + 1.5)); beam.castShadow = true; grp.add(beam);
      for (let k = 0; k <= 2; k++) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 1.8, TOP + 2, 8), beamMat);
        post.position.set(-len / 2 + (k * len) / 2, (TOP - 2) / 2 - 1, s * (t.w / 2 + 1.5)); post.castShadow = true; grp.add(post);
      }
    }
    grp.position.set((t.a[0] + t.b[0]) / 2, 0, (t.a[1] + t.b[1]) / 2);
    grp.rotation.y = -ang;
    add(grp);
  }

  _obstacle(o, sceneName, M, add) {
    const moving = !!o.move;
    if (o.type === 'post') {
      let mat;
      if (sceneName === 'parc' && !moving) mat = [M({ color: '#6b4626', roughness: 0.95 }), M({ map: canvasTex(cnv(64, 64, (g) => { g.fillStyle = '#c9a26b'; g.fillRect(0, 0, 64, 64); g.strokeStyle = 'rgba(110,70,35,0.6)'; g.lineWidth = 2; for (let r = 5; r < 32; r += 5) { g.beginPath(); g.arc(32, 32, r, 0, TAU); g.stroke(); } })) }), M({ color: '#6b4626' })];
      else if (sceneName === 'mall' && !moving) mat = M({ color: '#dfe4ea', metalness: 1, roughness: 0.18 });
      else {
        const stripes = canvasTex(cnv(64, 64, (g) => { for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#f1f1f1' : '#d62828'; g.fillRect(0, i * 16, 64, 16); } }));
        mat = M({ map: stripes, roughness: 0.5 });
      }
      const m = add(new THREE.Mesh(new THREE.CylinderGeometry(o.r, o.r, 16, 24), mat));
      m.position.set(o.x, TOP + 8, o.y);
      return { o, m };
    }
    if (o.type === 'log') {
      const len = Math.hypot(o.b[0] - o.a[0], o.b[1] - o.a[1]);
      let mat;
      if (sceneName === 'parc' && !moving) mat = M({ map: canvasTex(cnv(128, 32, (g) => { g.fillStyle = '#6e4626'; g.fillRect(0, 0, 128, 32); g.strokeStyle = 'rgba(30,15,5,0.55)'; g.lineWidth = 2; for (let x = 0; x < 128; x += 7) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + 5, 32); g.stroke(); } })), roughness: 0.95 });
      else if (sceneName === 'mall' && !moving) mat = new THREE.MeshPhysicalMaterial({ color: '#cfefff', transmission: 0.6, roughness: 0.05, thickness: 2, transparent: true, opacity: 0.75 });
      else mat = M({ map: canvasTex(cnv(128, 32, (g) => { for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? '#f1f1f1' : '#d62828'; g.beginPath(); g.moveTo(i * 16, 0); g.lineTo(i * 16 + 16, 0); g.lineTo(i * 16 + 8, 32); g.lineTo(i * 16 - 8, 32); g.fill(); } })), roughness: 0.5 });
      if (!this.matCache.includes(mat)) this.matCache.push(mat);
      const geo = new THREE.CapsuleGeometry(o.r, len, 6, 16); geo.rotateZ(Math.PI / 2);
      const m = add(new THREE.Mesh(geo, mat));
      m.position.y = TOP + o.r;
      return { o, m };
    }
    // moulin : pales qui tournent autour d'un moyeu
    const grp = new THREE.Group();
    const bladeMat = M({ color: '#f3ead6', roughness: 0.8 }), frameMat = M({ color: '#6b4423', roughness: 0.9 });
    for (let i = 0; i < o.blades; i++) {
      const b = new THREE.Group();
      const sail = new THREE.Mesh(new THREE.BoxGeometry(o.len * 2, 2, o.r * 2.6), bladeMat); sail.castShadow = true; b.add(sail);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(o.len * 2 + 2, 2.6, 1.4), frameMat); bar.position.y = 0.4; bar.castShadow = true; b.add(bar);
      b.rotation.y = -(i * Math.PI) / o.blades; grp.add(b);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(o.r + 3, o.r + 3, 10, 20), M({ color: '#b23a3a', roughness: 0.6 })); hub.position.y = 2; hub.castShadow = true; grp.add(hub);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(o.r + 4, 8, 20), M({ color: '#8f2d2d', roughness: 0.6 })); cap.position.y = 11; cap.castShadow = true; grp.add(cap);
    grp.position.set(o.x, TOP + o.r + 1, o.y);
    add(grp);
    return { o, m: grp };
  }

  _props(sceneName, M, add) {
    const L = this.level, r = rng(L.height * 13 + L.index * 7 + 3), placed = [];
    const x0 = -MARGIN_X + 10, x1 = 360 + MARGIN_X - 10, y0 = -MARGIN_Y + 10, y1 = L.height + MARGIN_Y - 10;
    const geo = {
      trunk: new THREE.CylinderGeometry(1.8, 2.6, 20, 8), leaf: new THREE.IcosahedronGeometry(1, 2),
      box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 16), sphere: new THREE.SphereGeometry(1, 16, 12), cone: new THREE.ConeGeometry(1, 1, 16),
    };
    const trunkMat = M({ color: '#5b3a22', roughness: 1 });
    const leafMats = ['#2f6b2c', '#3d7f35', '#4f9440', '#2a5e33'].map((c) => M({ color: c, roughness: 0.9 }));
    const tree = (x, z, s) => {
      const t = add(new THREE.Mesh(geo.trunk, trunkMat)); t.position.set(x, 10, z); t.scale.setScalar(s / 22 + 0.4);
      const n = 3 + Math.floor(r() * 3);
      for (let i = 0; i < n; i++) {
        const l = add(new THREE.Mesh(geo.leaf, leafMats[Math.floor(r() * leafMats.length)]));
        const a = r() * TAU, d = s * 0.35 * r();
        l.position.set(x + Math.cos(a) * d, 20 + s * 0.4 + r() * s * 0.6, z + Math.sin(a) * d);
        l.scale.setScalar(s * (0.55 + r() * 0.3)); l.rotation.set(r() * 3, r() * 3, r() * 3);
      }
    };
    const lampMat = M({ color: '#26282c', roughness: 0.5, metalness: 0.6 });
    const bulbMat = M({ color: '#fff2c4', emissive: '#ffd27a', emissiveIntensity: sceneName === 'ville' ? 3 : 1 });
    const lamps = [];
    const lamp = (x, z) => {
      const p = add(new THREE.Mesh(geo.cyl, lampMat)); p.scale.set(1.2, 46, 1.2); p.position.set(x, 23, z);
      const h = add(new THREE.Mesh(geo.box, lampMat)); h.scale.set(10, 2, 4); h.position.set(x + 4, 46, z);
      const b = add(new THREE.Mesh(geo.sphere, bulbMat), false, false); b.scale.set(3, 1.4, 2); b.position.set(x + 7, 44.5, z);
      lamps.push({ x: x + 7, z });
    };
    const bench = (x, z, ang, col) => {
      const g = new THREE.Group();
      const seat = new THREE.Mesh(geo.box, M({ color: col, roughness: 0.8 })); seat.scale.set(30, 1.5, 10); seat.position.y = 6; seat.castShadow = true; g.add(seat);
      const back = new THREE.Mesh(geo.box, seat.material); back.scale.set(30, 8, 1.5); back.position.set(0, 11, -5); back.castShadow = true; g.add(back);
      for (const sx of [-12, 12]) { const leg = new THREE.Mesh(geo.box, lampMat); leg.scale.set(1.5, 6, 9); leg.position.set(sx, 3, 0); leg.castShadow = true; g.add(leg); }
      g.position.set(x, 0, z); g.rotation.y = ang; add(g);
    };

    if (sceneName === 'parc') {
      const trees = scatter(L, r, placed, 34, [20, 34], x0, x1, y0, y1, 14).map((o) => ({ x: o.x, z: o.y, s: o.r }));
      // rangée d'arbres lointains pour fermer l'horizon
      for (let k = 0; k < 26; k++) { const side = k % 2 ? 1 : -1; trees.push({ x: 180 + side * (330 + r() * 160), z: -300 + (k / 26) * (L.height + 600), s: 30 + r() * 16 }); }
      realTrees(this.scene, trees, { hue: 100 });
      bushes(this.scene, scatter(L, r, placed, 26, [6, 10], x0, x1, y0, y1, 8).map((o) => ({ x: o.x, z: o.y, r: o.r })), 110);
      const woodM = M({ map: photoTex('wood.jpg', 1), roughness: 0.7, color: '#b8875a' });
      for (const o of scatter(L, r, placed, 6, [12, 14], x0, x1, y0, y1)) {
        const gb = new THREE.Group();
        for (let k = 0; k < 4; k++) { const sl = new THREE.Mesh(geo.box, woodM); sl.scale.set(30, 1.2, 2.4); sl.position.set(0, 6, -3.6 + k * 2.6); sl.castShadow = sl.receiveShadow = true; gb.add(sl); }
        for (let k = 0; k < 3; k++) { const sl = new THREE.Mesh(geo.box, woodM); sl.scale.set(30, 2.2, 1); sl.position.set(0, 9 + k * 2.8, -5.4); sl.rotation.x = -0.15; sl.castShadow = true; gb.add(sl); }
        for (const sx of [-12, 12]) { const leg = new THREE.Mesh(geo.box, lampMat); leg.scale.set(1.6, 6, 10); leg.position.set(sx, 3, -0.5); leg.castShadow = true; gb.add(leg); const arm = new THREE.Mesh(geo.box, lampMat); arm.scale.set(1.6, 1.4, 9); arm.position.set(sx, 9, -0.5); gb.add(arm); }
        gb.position.set(o.x, 0, o.y); gb.rotation.y = r() * TAU; add(gb);
      }
      for (const o of scatter(L, r, placed, 6, [4, 5], x0, x1, y0, y1, 18)) lamp(o.x, o.y);
      this.wind = { value: 0 };
      grassTufts(this.scene, L, this.wind, { x0: x0 - 60, x1: x1 + 60, z0: y0 - 60, z1: y1 + 60, avoid: (x, z) => placed.some((p) => Math.hypot(p.x - x, p.y - z) < p.r * 0.6) }, 2600);
    } else if (sceneName === 'mall') {
      const shops = [['CAFÉ', '#8d5524'], ['SPORT', '#e63946'], ['MODE', '#7b2cbf'], ['LIVRES', '#2a9d8f'], ['GLACES', '#ff6fa8'], ['JOUETS', '#f4a261'], ['MUSIQUE', '#264653'], ['FLEURS', '#52b788']];
      for (const o of scatter(L, r, placed, 7, [28, 32], x0, x1, y0, y1, 14)) {
        const [label, col] = shops[Math.floor(r() * shops.length)];
        const g = new THREE.Group();
        const body = new THREE.Mesh(geo.box, M({ color: '#f7f4ee', roughness: 0.4 })); body.scale.set(o.r * 1.8, 26, o.r * 1.1); body.position.y = 13; body.castShadow = body.receiveShadow = true; g.add(body);
        const roof = new THREE.Mesh(geo.box, M({ color: col, roughness: 0.5 })); roof.scale.set(o.r * 2, 4, o.r * 1.3); roof.position.y = 28; roof.castShadow = true; g.add(roof);
        const sign = canvasTex(cnv(256, 64, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); c.fillStyle = '#fff'; c.font = '900 40px system-ui'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(label, w / 2, h / 2 + 2); }));
        for (const s of [-1, 1]) {
          const p = new THREE.Mesh(new THREE.PlaneGeometry(o.r * 1.6, o.r * 0.4), M({ map: sign, emissive: '#ffffff', emissiveMap: sign, emissiveIntensity: 0.6 }));
          p.position.set(0, 34, s * o.r * 0.66); if (s < 0) p.rotation.y = Math.PI; g.add(p);
          const pp = new THREE.Mesh(geo.box, roof.material); pp.scale.set(o.r * 1.7, o.r * 0.48, 1); pp.position.set(0, 34, s * o.r * 0.6); g.add(pp);
        }
        g.position.set(o.x, 0, o.y); g.rotation.y = r() < 0.5 ? 0 : Math.PI / 2; add(g);
      }
      for (const o of scatter(L, r, placed, 8, [14, 16], x0, x1, y0, y1)) {
        const col = ['#e63946', '#2a9d8f', '#f4a261'][Math.floor(r() * 3)];
        const pole = add(new THREE.Mesh(geo.cyl, lampMat)); pole.scale.set(0.8, 30, 0.8); pole.position.set(o.x, 15, o.y);
        const um = add(new THREE.Mesh(geo.cone, M({ color: col, roughness: 0.7, side: THREE.DoubleSide }))); um.scale.set(o.r, 8, o.r); um.position.set(o.x, 32, o.y);
        const tb = add(new THREE.Mesh(geo.cyl, M({ color: '#f2f2f2', roughness: 0.3 }))); tb.scale.set(6, 1, 6); tb.position.set(o.x, 12, o.y);
      }
      for (const o of scatter(L, r, placed, 14, [9, 12], x0, x1, y0, y1, 10)) {
        const pot = add(new THREE.Mesh(geo.box, M({ color: '#3a3e45', roughness: 0.4, metalness: 0.3 }))); pot.scale.set(o.r * 1.6, 10, o.r * 1.6); pot.position.set(o.x, 5, o.y);
        for (let k = 0; k < 3; k++) { const l = add(new THREE.Mesh(geo.leaf, leafMats[k])); l.scale.setScalar(o.r * (0.6 + r() * 0.3)); l.position.set(o.x + (r() - 0.5) * 6, 14 + k * 4, o.y + (r() - 0.5) * 6); }
      }
      for (const o of scatter(L, r, placed, 6, [12, 14], x0, x1, y0, y1)) bench(o.x, o.y, r() < 0.5 ? 0 : Math.PI / 2, '#d8d2c6');
    } else {
      const winTex = canvasTex(cnv(128, 256, (g, w, h) => {
        g.fillStyle = '#2b2f38'; g.fillRect(0, 0, w, h);
        const rr = rng(5);
        for (let y = 6; y < h; y += 18) for (let x = 6; x < w; x += 16) { g.fillStyle = rr() < 0.45 ? `hsl(${38 + rr() * 15},90%,${60 + rr() * 20}%)` : '#1a1d24'; g.fillRect(x, y, 10, 11); }
      }));
      for (const o of scatter(L, r, placed, 12, [40, 64], x0 - 30, x1 + 30, y0 - 30, y1 + 30, 16)) {
        const hgt = 50 + r() * 110;
        const tex = winTex.clone(); tex.needsUpdate = true; tex.repeat.set(Math.round(o.r / 14), Math.round(hgt / 40));
        const wallMat = M({ map: tex, emissive: '#ffffff', emissiveMap: tex, emissiveIntensity: 0.9, roughness: 0.6 });
        const roofMat = M({ color: '#5a5d64', roughness: 0.9 });
        const b = add(new THREE.Mesh(geo.box, [wallMat, wallMat, roofMat, roofMat, wallMat, wallMat]));
        b.scale.set(o.r * 1.8, hgt, o.r * 1.5); b.position.set(o.x, hgt / 2, o.y);
      }
      const carCols = ['#c1121f', '#f1faee', '#1d3557', '#2b2d42', '#ffb703', '#8d99ae', '#457b9d'];
      for (const o of scatter(L, r, placed, 12, [22, 22], x0, x1, y0, y1, 10)) {
        const g = new THREE.Group(), col = carCols[Math.floor(r() * carCols.length)];
        const body = new THREE.Mesh(geo.box, M({ color: col, metalness: 0.6, roughness: 0.3 })); body.scale.set(40, 8, 18); body.position.y = 7; body.castShadow = true; g.add(body);
        const cab = new THREE.Mesh(geo.box, M({ color: '#1a2230', metalness: 0.4, roughness: 0.1 })); cab.scale.set(22, 7, 16); cab.position.set(-2, 14, 0); cab.castShadow = true; g.add(cab);
        for (const [wx, wz] of [[-13, 9], [13, 9], [-13, -9], [13, -9]]) { const w = new THREE.Mesh(geo.cyl, M({ color: '#111', roughness: 0.9 })); w.scale.set(4, 3, 4); w.rotation.x = Math.PI / 2; w.position.set(wx, 4, wz); g.add(w); }
        const hl = new THREE.Mesh(geo.box, M({ color: '#fff', emissive: '#ffe9a8', emissiveIntensity: 2 })); hl.scale.set(1, 2, 14); hl.position.set(20, 8, 0); g.add(hl);
        g.position.set(o.x, 0, o.y); g.rotation.y = r() < 0.5 ? 0 : Math.PI; add(g);
      }
      for (const o of scatter(L, r, placed, 12, [14, 20], x0, x1, y0, y1, 10)) tree(o.x, o.y, o.r);
      for (const o of scatter(L, r, placed, 10, [4, 5], x0, x1, y0, y1, 16)) lamp(o.x, o.y);
      // éclairage chaud des lampadaires les plus proches de la piste
      for (const p of lamps.slice(0, 4)) {
        const pl = new THREE.PointLight('#ffb866', 4000, 220, 2); pl.position.set(p.x, 42, p.z); this.scene.add(pl);
      }
    }
  }

  _dispose() {
    if (!this.scene) return;
    this.scene.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
      for (const m of ms) { for (const k of ['map', 'normalMap', 'bumpMap', 'emissiveMap']) m[k]?.dispose?.(); m.dispose(); }
    });
    this.envRT?.dispose();
    this.scene = null;
  }

  stop() { super.stop(); }

  // ---------- Hauteur du terrain sous la balle ----------
  _height(x, y) {
    let h = 0;
    for (const b of this.level.bumps) {
      if (b.h <= 0) continue;
      const d = Math.hypot(x - b.x, y - b.y);
      if (d < b.r) h = Math.max(h, DOME_H * Math.sqrt(1 - (d / b.r) ** 2));
    }
    return TOP + h;
  }

  _forwardYaw(x, y) {
    const { prog } = progressAlong(this.level, x, y);
    // point situé un peu plus loin le long du tracé (ou le trou)
    let target = prog + 140, acc = 0;
    for (const s of this.level.track) {
      const len = Math.hypot(s.b[0] - s.a[0], s.b[1] - s.a[1]);
      if (acc + len >= target) {
        const k = (target - acc) / len;
        const px = s.a[0] + (s.b[0] - s.a[0]) * k, py = s.a[1] + (s.b[1] - s.a[1]) * k;
        const dh = Math.hypot(this.level.hole[0] - x, this.level.hole[1] - y);
        if (dh < 160) return Math.atan2(this.level.hole[1] - y, this.level.hole[0] - x);
        return Math.atan2(py - y, px - x);
      }
      acc += len;
    }
    return Math.atan2(this.level.hole[1] - y, this.level.hole[0] - x);
  }

  // ---------- Contrôles : glisser ↔ pour viser, tirer ↓ pour la puissance ----------
  _bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      if (!this.running || this.paused) return;
      if (this.phase === 'intro') { this.phaseT = 99; return; }
      if (this.overviewTarget) { this.overviewTarget = 0; this.hooks.onOverview?.(false); return; }
      if (this.phase !== 'play' || this.sim.state !== 'rest' || this.aim) return;
      c.setPointerCapture?.(e.pointerId);
      this.aim = { id: e.pointerId, sx: e.clientX, sy: e.clientY, lx: e.clientX, cx: e.clientX, cy: e.clientY, power: 0, angle: this.yaw, lastTick: 0, maxed: false };
      this.hooks.onAimStart?.();
    });
    c.addEventListener('pointermove', (e) => {
      const a = this.aim; if (!a || e.pointerId !== a.id) return;
      // rotation proportionnelle au déplacement horizontal (plus fine quand on tire fort)
      const dxp = e.clientX - a.lx; a.lx = e.clientX;
      this.yaw += dxp * (0.0065 - a.power * 0.0035);
      a.angle = this.yaw;
      a.cx = e.clientX; a.cy = e.clientY;
      const p = Math.max(0, Math.min(1, (a.cy - a.sy) / (this.vh * 0.32)));
      a.power = p;
      const step = Math.floor(p * 10);
      if (step !== a.lastTick) { a.lastTick = step; fx.tick(); }
      if (p >= 1 && !a.maxed) { a.maxed = true; fx.maxPower(); }
      if (p < 0.98) a.maxed = false;
    });
    const end = (e, cancel) => {
      const a = this.aim; if (!a || e.pointerId !== a.id) return;
      this.aim = null;
      if (cancel || a.power < 0.05 || this.sim.state !== 'rest' || this.phase !== 'play') return;
      this._shootNow(a.power, this.yaw);
    };
    c.addEventListener('pointerup', (e) => end(e, false));
    c.addEventListener('pointercancel', (e) => end(e, true));
  }

  _shootNow(power, angle) {
    shoot(this.sim, power, angle);
    this.shots++; this._emitHud();
    fx.shot(power);
    this._dust(this.sim.ball.x, this.sim.ball.y, 6, 0.6);
  }

  _text() { /* pas de texte flottant en 3D */ }

  // ---------- Caméra ----------
  _updateCamera(dt) {
    const b = this.sim.ball, L = this.level;
    this.overview += (this.overviewTarget - this.overview) * (1 - Math.exp(-dt * 4));
    let pos = new THREE.Vector3(), look = new THREE.Vector3();
    const bx = b.x, bz = b.y;

    if (this.sim.state === 'moving' && this.phase === 'play') {
      const sp = Math.hypot(b.vx, b.vy);
      if (sp > 60) {
        const target = Math.atan2(b.vy, b.vx);
        let d = target - this.yaw; d = Math.atan2(Math.sin(d), Math.cos(d));
        this.yaw += d * (1 - Math.exp(-dt * 1.6));
      }
    }
    if (this.phase === 'play' && this.sim.state === 'rest' && this._wasMoving) {
      this._wasMoving = false;
      this.yaw = this._forwardYaw(bx, bz);
    }
    if (this.sim.state === 'moving') this._wasMoving = true;

    const power = this.aim ? this.aim.power : 0;
    const dist = 92 + power * 26, hgt = 50 + power * 10;
    const dx = Math.cos(this.yaw), dz = Math.sin(this.yaw);
    pos.set(bx - dx * dist, TOP + hgt, bz - dz * dist);
    look.set(bx + dx * 70, TOP + 2, bz + dz * 70);

    if (this.phase === 'won') {
      const a = this.yaw + this.phaseT * 0.5;
      pos.set(L.hole[0] - Math.cos(a) * 110, TOP + 60, L.hole[1] - Math.sin(a) * 110);
      look.set(L.hole[0], TOP, L.hole[1]);
    }
    if (this.phase === 'falling') { look.set(this.fallFrom.x, 0, this.fallFrom.y); pos.copy(this.camPos); }

    // vue d'ensemble
    if (this.overview > 0.001) {
      const span = Math.max(L.height, 420);
      const op = new THREE.Vector3(180, span * 0.95, L.height / 2 + span * 0.42), ol = new THREE.Vector3(180, 0, L.height / 2);
      pos.lerp(op, this.overview); look.lerp(ol, this.overview);
    }

    if (this.phase === 'intro') {
      const k = Math.max(0, Math.min(1, (this.phaseT - 0.4) / 1.5)), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
      this.camPos.copy(this.introFromPos).lerp(pos, e);
      this.camLook.copy(this.introFromLook).lerp(look, e);
    } else {
      const s = 1 - Math.exp(-dt * (this.aim ? 14 : 4.5));
      this.camPos.lerp(pos, s); this.camLook.lerp(look, s);
    }
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);

    // ombres nettes autour de la balle
    const tgt = new THREE.Vector3(bx, 0, bz);
    this.sun.target.position.copy(tgt);
    this.sun.position.copy(tgt).addScaledVector(this.sunDir, 600);
  }

  // ---------- Rendu ----------
  _render() {
    if (!this.scene) return;
    const t = this.sim.t, b = this.sim.ball;
    // obstacles mobiles
    for (const { o, m } of this.obsMeshes) {
      if (o.type === 'post' && o.move) { const [s] = obstacleShapes(o, t); m.position.x = s.x; m.position.z = s.y; }
      else if (o.type === 'log') { const [s] = obstacleShapes(o, t); m.position.x = (s.ax + s.bx) / 2; m.position.z = (s.ay + s.by) / 2; m.rotation.y = -Math.atan2(s.by - s.ay, s.bx - s.ax); }
      else if (o.type === 'mill') m.rotation.y = -((o.angle || 0) + t * o.speed);
    }
    // drapeau qui flotte (se soulève quand la balle est dans le trou)
    const arr = this.flagGeo.attributes.position.array, base = this.flagBase;
    for (let i = 0; i < arr.length; i += 3) { const x = base[i]; arr[i + 2] = Math.sin(x * 0.3 - t * 6) * (x / 26) * 3; }
    this.flagGeo.attributes.position.needsUpdate = true; this.flagGeo.computeVertexNormals();
    const lift = this.phase === 'won' ? Math.min(1, this.phaseT * 1.2) * 18 : 0;
    this.flag.position.y = TOP + 53 + lift; this.pole.position.y = TOP + 31 + lift;
    this.waterNormal.offset.set(t * 0.01, t * 0.006);
    if (this.wind) this.wind.value = t;

    // balle
    let x = b.x, z = b.y, y = this._height(x, z) + BR, vis = true, sc = 1;
    if (this.phase === 'falling') {
      const k = Math.min(1, this.phaseT / 0.6), f = this.fallFrom;
      x = f.x + f.vx * k * 0.5; z = f.y + f.vy * k * 0.5;
      y = TOP + BR - (TOP + BR + (f.water ? 8 : -BR)) * k * k;
      vis = k < 1;
    } else if (this.phase === 'won') {
      y = TOP + BR - Math.min(1, this.sim.sinkT / 0.35) * (BR * 2 + 4);
    }
    const ddx = x - this.lastBall.x, ddz = z - this.lastBall.y, dl = Math.hypot(ddx, ddz);
    if (dl > 0.001 && dl < 50) {
      const axis = new THREE.Vector3(ddz, 0, -ddx).normalize();
      this.ballMesh.quaternion.premultiply(new THREE.Quaternion().setFromAxisAngle(axis, dl / BR));
    }
    this.lastBall = { x, y: z };
    this.ballMesh.position.set(x, y, z); this.ballMesh.visible = vis; this.ballMesh.scale.setScalar(sc);

    // visée
    const a = this.aim;
    const show = this.phase === 'play' && this.sim.state === 'rest' && !this.overviewTarget;
    let n = 0;
    if (show) {
      const pw = a ? a.power : 0;
      const m = new THREE.Matrix4();
      if (this.diff.preview > 0 && pw > 0.02) {
        const pr = predict(this.sim, pw, this.yaw, this.diff.preview);
        for (let i = 4; i < pr.pts.length && n < 80; i += 4) { const p = pr.pts[i]; m.makeTranslation(p.x, this._height(p.x, p.y) + 1.2, p.y); this.dots.setMatrixAt(n++, m); }
      } else {
        const len = 30 + pw * 110;
        for (let d = 14; d < len && n < 80; d += 7) { const px = b.x + Math.cos(this.yaw) * d, pz = b.y + Math.sin(this.yaw) * d; m.makeTranslation(px, this._height(px, pz) + 1.2, pz); this.dots.setMatrixAt(n++, m); }
      }
      this.ringBg.visible = this.ring.visible = pw > 0.02;
      if (pw > 0.02) {
        this.ring.geometry.dispose();
        this.ring.geometry = new THREE.RingGeometry(BR + 4, BR + 7, 48, 1, Math.PI / 2, -pw * TAU);
        this.ring.material.color.setHSL((1 - pw) * 0.33, 0.85, 0.55);
        const yy = this._height(b.x, b.y) + 0.3;
        this.ring.position.set(b.x, yy, b.y); this.ringBg.position.set(b.x, yy - 0.05, b.y);
      }
    } else { this.ringBg.visible = this.ring.visible = false; }
    this.dots.count = n; this.dots.instanceMatrix.needsUpdate = true;

    // particules
    const pos = this.pts.geometry.attributes.position.array, col = this.pts.geometry.attributes.color.array;
    let k = 0; const c = new THREE.Color();
    for (const p of this.particles) {
      if (k >= 400 || p.shape === 'ring') continue;
      const life = Math.max(0, p.life / p.max);
      pos[k * 3] = p.x; pos[k * 3 + 1] = TOP + 2 + (1 - life) * (p.shape === 'rect' ? 30 : 8) * (p.shape === 'rect' ? 1 - (1 - life) * 0.8 : 1); pos[k * 3 + 2] = p.y;
      c.set(p.color); col[k * 3] = c.r; col[k * 3 + 1] = c.g; col[k * 3 + 2] = c.b; k++;
    }
    this.pts.geometry.setDrawRange(0, k);
    this.pts.geometry.attributes.position.needsUpdate = true; this.pts.geometry.attributes.color.needsUpdate = true;

    this.renderer.toneMappingExposure = this.diff.scene === 'ville' ? 1.25 : this.diff.scene === 'parc' ? 0.85 : 1.0;
    this.renderer.render(this.scene, this.camera);
  }
}
