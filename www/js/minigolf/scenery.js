// Décors réalistes du mini golf, dessinés une seule fois par parcours dans une grande image.
// Trois ambiances : le parc, le centre commercial, la ville au crépuscule.

import { closestOnSeg } from './physics.js';

export const MARGIN_X = 140, MARGIN_Y = 260;

function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const TAU = Math.PI * 2;

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}

function tile(size, draw) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  draw(c.getContext('2d'), size); return c;
}

// ---------- Textures ----------
function turfTile(seed) {
  const r = rng(seed);
  return tile(96, (g, n) => {
    g.fillStyle = '#3d9a47'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) {
      const v = r();
      g.fillStyle = v < 0.35 ? 'rgba(20,70,25,0.35)' : v < 0.7 ? 'rgba(120,200,110,0.28)' : 'rgba(60,140,60,0.4)';
      const x = r() * n, y = r() * n, a = r() * TAU;
      g.fillRect(x, y, 0.6 + Math.cos(a) * 0.6, 0.6 + Math.sin(a) * 0.9);
    }
  });
}
function grassTile(seed) {
  const r = rng(seed);
  return tile(160, (g, n) => {
    g.fillStyle = '#5c9e45'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2400; i++) {
      const v = r();
      g.strokeStyle = v < 0.4 ? 'rgba(40,90,30,0.35)' : v < 0.8 ? 'rgba(150,200,100,0.25)' : 'rgba(90,150,60,0.4)';
      g.lineWidth = 0.8;
      const x = r() * n, y = r() * n;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 2, y - 2 - r() * 3); g.stroke();
    }
    for (let i = 0; i < 12; i++) { g.fillStyle = 'rgba(30,60,20,0.07)'; g.beginPath(); g.arc(r() * n, r() * n, 8 + r() * 20, 0, TAU); g.fill(); }
  });
}
function gravelTile(seed) {
  const r = rng(seed);
  return tile(96, (g, n) => {
    g.fillStyle = '#cbb894'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 900; i++) {
      const v = r(); g.fillStyle = v < 0.4 ? 'rgba(120,100,70,0.35)' : v < 0.8 ? 'rgba(255,250,235,0.4)' : 'rgba(150,130,100,0.5)';
      g.beginPath(); g.ellipse(r() * n, r() * n, 0.6 + r() * 1.3, 0.5 + r(), r() * 3, 0, TAU); g.fill();
    }
  });
}
function sandTile(seed) {
  const r = rng(seed);
  return tile(64, (g, n) => {
    g.fillStyle = '#ead7a4'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 700; i++) { g.fillStyle = r() < 0.5 ? 'rgba(160,125,60,0.25)' : 'rgba(255,255,240,0.45)'; g.fillRect(r() * n, r() * n, 0.8, 0.8); }
  });
}
function marbleTile(seed) {
  const r = rng(seed);
  return tile(160, (g, n) => {
    const s = n / 2;
    for (let i = 0; i < 4; i++) {
      const x = (i % 2) * s, y = Math.floor(i / 2) * s;
      g.fillStyle = (i === 0 || i === 3) ? '#eeebe5' : '#e2ddd4'; g.fillRect(x, y, s, s);
      g.strokeStyle = 'rgba(150,140,130,0.25)'; g.lineWidth = 0.8;
      for (let v = 0; v < 3; v++) {
        g.beginPath(); let px = x + r() * s, py = y; g.moveTo(px, py);
        for (let k = 0; k < 8; k++) { px += (r() - 0.5) * 18; py += s / 8; g.lineTo(px, py); }
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(120,110,100,0.55)'; g.lineWidth = 1.2;
    g.strokeRect(0.5, 0.5, s, s); g.strokeRect(s + 0.5, 0.5, s, s); g.strokeRect(0.5, s + 0.5, s, s); g.strokeRect(s + 0.5, s + 0.5, s, s);
  });
}
function asphaltTile(seed) {
  const r = rng(seed);
  return tile(128, (g, n) => {
    g.fillStyle = '#3d4046'; g.fillRect(0, 0, n, n);
    for (let i = 0; i < 2600; i++) { const v = r(); g.fillStyle = v < 0.5 ? 'rgba(0,0,0,0.25)' : 'rgba(255,255,255,0.08)'; g.fillRect(r() * n, r() * n, 0.9, 0.9); }
    for (let i = 0; i < 6; i++) { g.fillStyle = 'rgba(0,0,0,0.08)'; g.beginPath(); g.arc(r() * n, r() * n, 6 + r() * 16, 0, TAU); g.fill(); }
  });
}
function pavingTile() {
  return tile(48, (g, n) => {
    g.fillStyle = '#a8a39a'; g.fillRect(0, 0, n, n);
    g.strokeStyle = 'rgba(70,65,60,0.45)'; g.lineWidth = 1;
    for (let i = 0; i <= n; i += 16) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i, n); g.stroke(); g.beginPath(); g.moveTo(0, i); g.lineTo(n, i); g.stroke(); }
  });
}

// ---------- Outils géométriques ----------
function trackDist(level, x, y) {
  let best = Infinity;
  for (const s of level.track) {
    const c = closestOnSeg(x, y, s.a[0], s.a[1], s.b[0], s.b[1]);
    best = Math.min(best, Math.hypot(x - c.x, y - c.y) - s.w / 2);
  }
  return best;
}
function lakeDist(level, x, y) {
  let best = Infinity;
  for (const l of level.lakes) best = Math.min(best, (Math.hypot((x - l.x) / l.rx, (y - l.y) / l.ry) - 1) * Math.min(l.rx, l.ry));
  return best;
}

// Place des objets là où il reste de la place (hors piste, hors eau, sans chevauchement)
function scatter(level, r, placed, n, rad, x0, x1, y0, y1, clearance = 14) {
  const out = [];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const x = x0 + r() * (x1 - x0), y = y0 + r() * (y1 - y0), rr = rad[0] + r() * (rad[1] - rad[0]);
    if (trackDist(level, x, y) < rr + clearance) continue;
    if (lakeDist(level, x, y) < rr + 6) continue;
    if (placed.some((p) => Math.hypot(p.x - x, p.y - y) < p.r + rr + 4)) continue;
    const o = { x, y, r: rr }; placed.push(o); out.push(o);
  }
  return out;
}

// ---------- Objets du décor ----------
function shadow(g, x, y, rx, ry, a = 0.3, ox = 0.35, oy = 0.5) {
  g.fillStyle = `rgba(0,0,0,${a})`; g.beginPath(); g.ellipse(x + rx * ox, y + ry * oy, rx, ry, 0, 0, TAU); g.fill();
}
function tree(g, r, x, y, rad, palette = ['#1f5a2a', '#2f7a36', '#4e9c45', '#7cc35a']) {
  shadow(g, x, y, rad * 1.05, rad * 0.95, 0.35, 0.45, 0.55);
  const blobs = 7;
  for (let layer = 0; layer < 3; layer++) {
    for (let i = 0; i < blobs; i++) {
      const a = (i / blobs) * TAU + r() * 0.5, d = rad * (0.45 - layer * 0.15) * (0.7 + r() * 0.4);
      const bx = x + Math.cos(a) * d - layer * rad * 0.08, by = y + Math.sin(a) * d - layer * rad * 0.1, br = rad * (0.5 - layer * 0.1) * (0.8 + r() * 0.35);
      const gr = g.createRadialGradient(bx - br * 0.4, by - br * 0.4, br * 0.1, bx, by, br);
      gr.addColorStop(0, palette[Math.min(3, layer + 1)]); gr.addColorStop(1, palette[layer]);
      g.fillStyle = gr; g.beginPath(); g.arc(bx, by, br, 0, TAU); g.fill();
    }
  }
  for (let i = 0; i < rad * 3; i++) {
    const a = r() * TAU, d = r() * rad * 0.9;
    g.fillStyle = r() < 0.5 ? 'rgba(255,255,200,0.12)' : 'rgba(0,40,0,0.15)';
    g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 1 + r() * 1.5, 0, TAU); g.fill();
  }
}
function bench(g, x, y, ang, wood = '#9b6a3c') {
  g.save(); g.translate(x, y); g.rotate(ang);
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(-15 + 3, -6 + 4, 30, 12);
  g.fillStyle = '#2b2b2b'; g.fillRect(-13, -6, 3, 12); g.fillRect(10, -6, 3, 12);
  for (let i = 0; i < 4; i++) { g.fillStyle = shade(wood, (i % 2) * 0.06 - 0.03); g.fillRect(-15, -5.5 + i * 3, 30, 2.4); }
  g.restore();
}
function lamp(g, x, y) {
  shadow(g, x, y, 3, 3, 0.35);
  g.fillStyle = '#26282c'; g.beginPath(); g.arc(x, y, 3.2, 0, TAU); g.fill();
  g.fillStyle = '#fff2c4'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
}
function flowerBed(g, r, x, y, rad) {
  shadow(g, x, y, rad, rad * 0.9, 0.2);
  g.fillStyle = '#6b4a2e'; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.strokeStyle = '#b8b2a6'; g.lineWidth = 3; g.stroke();
  const cols = ['#ff4d6d', '#ffd166', '#f8f9fa', '#c77dff', '#ff8fab'];
  for (let i = 0; i < rad * 2.2; i++) {
    const a = r() * TAU, d = Math.sqrt(r()) * (rad - 3);
    g.fillStyle = '#2f7a36'; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, 2.2, 0, TAU); g.fill();
    g.fillStyle = cols[Math.floor(r() * cols.length)]; g.beginPath(); g.arc(x + Math.cos(a) * d + 0.6, y + Math.sin(a) * d - 0.6, 1.3, 0, TAU); g.fill();
  }
}
function planter(g, r, x, y, rad) {
  shadow(g, x, y, rad, rad, 0.28, 0.3, 0.4);
  const gr = g.createLinearGradient(x - rad, y - rad, x + rad, y + rad);
  gr.addColorStop(0, '#5a5f66'); gr.addColorStop(1, '#2d3035');
  g.fillStyle = gr; g.beginPath(); g.roundRect(x - rad, y - rad, rad * 2, rad * 2, 3); g.fill();
  g.fillStyle = '#4a3423'; g.fillRect(x - rad + 2.5, y - rad + 2.5, rad * 2 - 5, rad * 2 - 5);
  tree(g, r, x, y, rad * 0.95, ['#1d5e35', '#2a7d45', '#45a35a', '#8fd18a']);
}
function column(g, x, y, rad) {
  shadow(g, x, y, rad, rad, 0.3, 0.6, 0.7);
  const gr = g.createRadialGradient(x - rad * 0.4, y - rad * 0.4, 1, x, y, rad);
  gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#bdb6aa');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(0,0,0,0.15)'; g.lineWidth = 1; g.stroke();
}
function cafeTable(g, r, x, y, rad, col) {
  shadow(g, x, y, rad, rad, 0.28, 0.35, 0.45);
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? col : '#f7f3ea';
    g.beginPath(); g.moveTo(x, y); g.arc(x, y, rad, (i / 8) * TAU, ((i + 1) / 8) * TAU); g.closePath(); g.fill();
  }
  const gr = g.createRadialGradient(x - rad * 0.3, y - rad * 0.3, 0, x, y, rad);
  gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(0,0,0,0.12)');
  g.fillStyle = gr; g.beginPath(); g.arc(x, y, rad, 0, TAU); g.fill();
  g.fillStyle = '#ccc'; g.beginPath(); g.arc(x, y, 1.6, 0, TAU); g.fill();
  for (let i = 0; i < 3; i++) { const a = r() * TAU; g.fillStyle = '#333'; g.beginPath(); g.arc(x + Math.cos(a) * (rad + 4), y + Math.sin(a) * (rad + 4), 3, 0, TAU); g.fill(); }
}
function kiosk(g, x, y, w, h, col, label) {
  g.fillStyle = 'rgba(0,0,0,0.3)'; g.beginPath(); g.roundRect(x - w / 2 + 4, y - h / 2 + 6, w, h, 6); g.fill();
  const gr = g.createLinearGradient(x - w / 2, y - h / 2, x + w / 2, y + h / 2);
  gr.addColorStop(0, shade(col, 0.15)); gr.addColorStop(1, shade(col, -0.15));
  g.fillStyle = gr; g.beginPath(); g.roundRect(x - w / 2, y - h / 2, w, h, 6); g.fill();
  g.fillStyle = 'rgba(255,255,255,0.9)'; g.beginPath(); g.roundRect(x - w / 2 + 4, y - h / 2 + 4, w - 8, h - 8, 4); g.fill();
  g.fillStyle = col; g.font = `900 ${Math.min(h * 0.32, (w / label.length) * 1.5)}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(label, x, y + 1);
}
function car(g, x, y, ang, col) {
  g.save(); g.translate(x, y); g.rotate(ang);
  const L = 40, W = 19;
  g.fillStyle = 'rgba(0,0,0,0.38)'; g.beginPath(); g.roundRect(-L / 2 + 3, -W / 2 + 4, L, W, 6); g.fill();
  const gr = g.createLinearGradient(0, -W / 2, 0, W / 2);
  gr.addColorStop(0, shade(col, 0.25)); gr.addColorStop(0.5, col); gr.addColorStop(1, shade(col, -0.25));
  g.fillStyle = gr; g.beginPath(); g.roundRect(-L / 2, -W / 2, L, W, 6); g.fill();
  g.fillStyle = '#1a2230'; g.beginPath(); g.roundRect(-L * 0.18, -W / 2 + 2, L * 0.16, W - 4, 2); g.fill();
  g.beginPath(); g.roundRect(L * 0.16, -W / 2 + 2.5, L * 0.12, W - 5, 2); g.fill();
  g.fillStyle = shade(col, 0.1); g.fillRect(-L * 0.02, -W / 2 + 2, L * 0.18, W - 4);
  g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-L * 0.17, -W / 2 + 3, L * 0.05, W - 6);
  g.fillStyle = '#ffe9a8'; g.fillRect(L / 2 - 2, -W / 2 + 2, 2, 4); g.fillRect(L / 2 - 2, W / 2 - 6, 2, 4);
  g.fillStyle = '#c0262d'; g.fillRect(-L / 2, -W / 2 + 2, 1.6, 4); g.fillRect(-L / 2, W / 2 - 6, 1.6, 4);
  g.restore();
}
function rooftop(g, r, x, y, w, h) {
  g.fillStyle = 'rgba(0,0,0,0.45)'; g.fillRect(x + 8, y + 10, w, h);
  g.fillStyle = '#6d7077'; g.fillRect(x, y, w, h);
  g.fillStyle = '#585b62'; g.fillRect(x + 4, y + 4, w - 8, h - 8);
  g.strokeStyle = 'rgba(0,0,0,0.2)'; g.lineWidth = 0.6;
  for (let i = x + 4; i < x + w - 4; i += 9) { g.beginPath(); g.moveTo(i, y + 4); g.lineTo(i, y + h - 4); g.stroke(); }
  for (let i = 0; i < Math.max(1, (w * h) / 2600); i++) {
    const ax = x + 10 + r() * (w - 34), ay = y + 10 + r() * (h - 30);
    g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(ax + 2, ay + 3, 18, 14);
    g.fillStyle = '#b9bcc2'; g.fillRect(ax, ay, 18, 14);
    g.fillStyle = '#7b7f86'; g.beginPath(); g.arc(ax + 9, ay + 7, 5, 0, TAU); g.fill();
    g.strokeStyle = '#555'; g.beginPath(); g.moveTo(ax + 4, ay + 7); g.lineTo(ax + 14, ay + 7); g.moveTo(ax + 9, ay + 2); g.lineTo(ax + 9, ay + 12); g.stroke();
  }
  if (w > 50 && h > 50) {
    g.fillStyle = 'rgba(140,190,230,0.65)'; g.fillRect(x + w - 26, y + h - 26, 16, 16);
    g.strokeStyle = '#444'; g.strokeRect(x + w - 26, y + h - 26, 16, 16);
  }
  g.fillStyle = 'rgba(255,255,255,0.12)'; g.fillRect(x, y, w, 2);
}

// ---------- Plans d'eau ----------
function pond(g, r, l, scene) {
  const pts = [];
  const n = 28;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU, k = scene === 'parc' ? 1 + (r() - 0.5) * 0.12 : 1;
    pts.push([l.x + Math.cos(a) * l.rx * k, l.y + Math.sin(a) * l.ry * k]);
  }
  const path = () => { g.beginPath(); pts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath(); };
  if (scene === 'parc') {
    g.save(); g.lineJoin = 'round';
    g.strokeStyle = '#8f8a7c'; g.lineWidth = 14; path(); g.stroke();
    for (const [x, y] of pts) for (let k = 0; k < 2; k++) {
      const rx = x + (r() - 0.5) * 8, ry = y + (r() - 0.5) * 8, rr = 3 + r() * 4;
      const gr = g.createRadialGradient(rx - 1, ry - 1, 0, rx, ry, rr); gr.addColorStop(0, '#d9d4c7'); gr.addColorStop(1, '#7d786b');
      g.fillStyle = gr; g.beginPath(); g.arc(rx, ry, rr, 0, TAU); g.fill();
    }
    g.restore();
  } else {
    // bassin : margelle carrelée (centre commercial) ou pierre (ville)
    g.save(); g.lineJoin = 'round';
    g.strokeStyle = scene === 'mall' ? '#f2efe8' : '#9b958a'; g.lineWidth = 16; path(); g.stroke();
    g.strokeStyle = scene === 'mall' ? '#c9c2b4' : '#6e695f'; g.lineWidth = 2; g.setLineDash([6, 4]); path(); g.stroke(); g.setLineDash([]);
    g.restore();
  }
  g.save(); path(); g.clip();
  const deep = scene === 'mall' ? ['#1fb6c9', '#0b6f8a'] : scene === 'ville' ? ['#2c5d73', '#0f2a38'] : ['#3a8c8f', '#0f3f4d'];
  const gr = g.createRadialGradient(l.x, l.y, 2, l.x, l.y, Math.max(l.rx, l.ry));
  gr.addColorStop(0, deep[1]); gr.addColorStop(1, deep[0]);
  g.fillStyle = gr; g.fillRect(l.x - l.rx - 10, l.y - l.ry - 10, l.rx * 2 + 20, l.ry * 2 + 20);
  // ombre du bord + caustiques
  g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 10; path(); g.stroke();
  g.strokeStyle = scene === 'mall' ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.08)'; g.lineWidth = 1;
  for (let i = 0; i < 40; i++) {
    const x = l.x + (r() - 0.5) * l.rx * 1.8, y = l.y + (r() - 0.5) * l.ry * 1.8;
    g.beginPath(); g.moveTo(x, y); g.bezierCurveTo(x + 6, y - 4, x + 10, y + 4, x + 16, y); g.stroke();
  }
  if (scene === 'parc') {
    for (let i = 0; i < 4; i++) {
      const a = r() * TAU, d = 0.55 + r() * 0.3, x = l.x + Math.cos(a) * l.rx * d, y = l.y + Math.sin(a) * l.ry * d, s = 5 + r() * 4;
      g.fillStyle = '#3f8f3a'; g.beginPath(); g.moveTo(x, y); g.arc(x, y, s, a + 0.4, a + TAU - 0.2); g.closePath(); g.fill();
      if (r() < 0.5) { g.fillStyle = '#ffd6e8'; g.beginPath(); g.arc(x - 1, y - 1, 1.8, 0, TAU); g.fill(); }
    }
  }
  g.restore();
}

// ---------- Ponts ----------
function bridge(g, sg, scene) {
  const dx = sg.b[0] - sg.a[0], dy = sg.b[1] - sg.a[1], len = Math.hypot(dx, dy);
  g.save(); g.translate(sg.a[0], sg.a[1]); g.rotate(Math.atan2(dy, dx));
  const hw = sg.w / 2;
  g.fillStyle = 'rgba(0,0,0,0.38)'; g.fillRect(-4, -hw + 8, len + 8, sg.w + 6);
  if (scene === 'parc') {
    g.fillStyle = '#4a2f18'; g.fillRect(-8, -hw - 5, len + 16, 5); g.fillRect(-8, hw, len + 16, 5);
    const r = rng(len | 0);
    for (let x = -6; x < len + 6; x += 8) {
      g.fillStyle = shade('#a87445', r() * 0.12 - 0.06); g.fillRect(x, -hw, 7, sg.w);
      g.strokeStyle = 'rgba(70,40,15,0.35)'; g.lineWidth = 0.5;
      g.beginPath(); g.moveTo(x + 1, -hw + 2); g.lineTo(x + 1, hw - 2); g.moveTo(x + 4.5, -hw + 3); g.lineTo(x + 4.5, hw - 4); g.stroke();
      g.fillStyle = '#3a3a3a'; g.fillRect(x + 3, -hw + 1.5, 1, 1); g.fillRect(x + 3, hw - 2.5, 1, 1);
    }
    for (let x = 0; x <= len; x += len / Math.max(2, Math.round(len / 40))) {
      for (const s of [-1, 1]) { g.fillStyle = '#3a2412'; g.fillRect(x - 2.5, s * (hw + 2.5) - 2.5, 5, 5); }
    }
  } else {
    // passerelle métal + verre (centre commercial) ou caillebotis acier (ville)
    const glass = scene === 'mall';
    g.fillStyle = '#9aa3ad'; g.fillRect(-8, -hw - 5, len + 16, 5); g.fillRect(-8, hw, len + 16, 5);
    g.fillStyle = glass ? 'rgba(200,235,255,0.55)' : '#5b6068'; g.fillRect(-6, -hw, len + 12, sg.w);
    g.strokeStyle = glass ? 'rgba(255,255,255,0.55)' : 'rgba(0,0,0,0.35)'; g.lineWidth = glass ? 1.2 : 0.8;
    const step = glass ? 22 : 4;
    for (let x = -6; x < len + 6; x += step) { g.beginPath(); g.moveTo(x, -hw); g.lineTo(x, hw); g.stroke(); }
    if (!glass) for (let y = -hw; y < hw; y += 4) { g.beginPath(); g.moveTo(-6, y); g.lineTo(len + 6, y); g.stroke(); }
    if (glass) { g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(-6, -hw + 2, len + 12, 2); }
    g.fillStyle = 'rgba(255,255,255,0.4)'; g.fillRect(-8, -hw - 5, len + 16, 1.2);
  }
  g.restore();
}

// ---------- Rendu principal ----------
export function renderScene(level, scene, scale) {
  const x0 = -MARGIN_X, y0 = -MARGIN_Y, W = 360 + MARGIN_X * 2, H = level.height + MARGIN_Y * 2;
  const maxPx = 11e6;
  const s = Math.min(scale, Math.sqrt(maxPx / (W * H)));
  const cv = document.createElement('canvas');
  cv.width = Math.ceil(W * s); cv.height = Math.ceil(H * s);
  const g = cv.getContext('2d');
  g.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
  const r = rng(level.height * 7 + level.name.length * 131 + (level.index || 0));
  const placed = [];
  const lamps = [];

  // ---- sol ----
  if (scene === 'parc') {
    g.fillStyle = g.createPattern(grassTile(5), 'repeat'); g.fillRect(x0, y0, W, H);
    // bandes de tonte
    for (let i = -20; i < 40; i++) {
      g.save(); g.translate(180, level.height / 2); g.rotate(-0.5);
      g.fillStyle = i % 2 ? 'rgba(255,255,230,0.05)' : 'rgba(0,40,0,0.05)'; g.fillRect(i * 40 - 800, -1500, 40, 3000);
      g.restore();
    }
    // allées de gravier qui serpentent dans le parc
    g.save(); g.lineCap = 'round'; g.lineJoin = 'round';
    g.strokeStyle = g.createPattern(gravelTile(9), 'repeat');
    for (let k = 0; k < 2; k++) {
      g.lineWidth = 26; g.beginPath();
      const sx = k ? 400 : -60;
      g.moveTo(sx, y0);
      for (let y = y0; y <= y0 + H; y += 120) g.lineTo(sx + Math.sin(y * 0.006 + k * 2) * 70 + (k ? -20 : 20), y);
      g.stroke();
    }
    g.restore();
  } else if (scene === 'mall') {
    g.fillStyle = g.createPattern(marbleTile(4), 'repeat'); g.fillRect(x0, y0, W, H);
    // reflets des verrières
    for (let y = y0 + 80; y < y0 + H; y += 260) {
      const gr = g.createRadialGradient(180, y, 10, 180, y, 220);
      gr.addColorStop(0, 'rgba(255,255,255,0.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
      g.fillStyle = gr; g.fillRect(x0, y - 220, W, 440);
    }
    // bandes de sol foncées (allées)
    g.fillStyle = 'rgba(60,50,40,0.08)'; g.fillRect(x0, y0, 90, H); g.fillRect(x0 + W - 90, y0, 90, H);
  } else {
    g.fillStyle = g.createPattern(asphaltTile(3), 'repeat'); g.fillRect(x0, y0, W, H);
    // trottoirs et rues transversales
    const paving = g.createPattern(pavingTile(), 'repeat');
    for (let y = y0 + 120; y < y0 + H; y += 340) {
      g.fillStyle = paving; g.fillRect(x0, y, W, 60); g.fillRect(x0, y + 180, W, 60);
      g.fillStyle = '#d6d2c8'; g.fillRect(x0, y + 58, W, 3); g.fillRect(x0, y + 180, W, 3);
      // passage piéton
      g.fillStyle = 'rgba(240,240,235,0.9)';
      for (let x = 40; x < 320; x += 14) g.fillRect(x, y + 70, 8, 34);
      // ligne médiane
      g.fillStyle = '#e8c547';
      for (let x = x0; x < x0 + W; x += 30) g.fillRect(x, y + 138, 16, 2.5);
      // plaques d'égout
      for (let i = 0; i < 2; i++) {
        const mx = x0 + 60 + r() * (W - 120), my = y + 112 + r() * 50;
        g.fillStyle = '#2b2d31'; g.beginPath(); g.arc(mx, my, 7, 0, TAU); g.fill();
        g.strokeStyle = '#4a4d53'; g.lineWidth = 0.8;
        for (let k = -5; k <= 5; k += 2.5) { g.beginPath(); g.moveTo(mx - 6, my + k); g.lineTo(mx + 6, my + k); g.stroke(); }
      }
    }
  }

  // ---- objets du décor ----
  if (scene === 'parc') {
    for (const o of scatter(level, r, placed, 4, [14, 20], x0 + 20, x0 + W - 20, y0 + 20, y0 + H - 20)) flowerBed(g, r, o.x, o.y, o.r);
    for (const o of scatter(level, r, placed, 6, [10, 12], x0, x0 + W, y0, y0 + H)) bench(g, o.x, o.y, (r() - 0.5) * 0.6 + (r() < 0.5 ? 0 : Math.PI / 2));
    for (const o of scatter(level, r, placed, 8, [3, 4], x0, x0 + W, y0, y0 + H, 18)) { lamp(g, o.x, o.y); lamps.push(o); }
    for (const o of scatter(level, r, placed, 40, [18, 34], x0 - 20, x0 + W + 20, y0 - 20, y0 + H + 20, 10)) tree(g, r, o.x, o.y, o.r);
    for (const o of scatter(level, r, placed, 25, [6, 11], x0, x0 + W, y0, y0 + H, 8)) tree(g, r, o.x, o.y, o.r, ['#2d5a1f', '#3f7a2c', '#5c9a3d', '#8cc06a']);
  } else if (scene === 'mall') {
    const shops = [['CAFÉ', '#8d5524'], ['SPORT', '#e63946'], ['MODE', '#7b2cbf'], ['LIVRES', '#2a9d8f'], ['GLACES', '#ff6fa8'], ['JOUETS', '#f4a261'], ['MUSIQUE', '#264653'], ['FLEURS', '#52b788']];
    for (const o of scatter(level, r, placed, 6, [26, 30], x0 + 30, x0 + W - 30, y0 + 30, y0 + H - 30, 12)) {
      const [label, col] = shops[Math.floor(r() * shops.length)];
      kiosk(g, o.x, o.y, o.r * 1.9, o.r * 1.2, col, label);
    }
    for (const o of scatter(level, r, placed, 8, [9, 11], x0, x0 + W, y0, y0 + H)) cafeTable(g, r, o.x, o.y, o.r, ['#e63946', '#2a9d8f', '#f4a261'][Math.floor(r() * 3)]);
    for (const o of scatter(level, r, placed, 10, [7, 8], x0, x0 + W, y0, y0 + H, 16)) column(g, o.x, o.y, o.r);
    for (const o of scatter(level, r, placed, 18, [9, 14], x0, x0 + W, y0, y0 + H, 10)) planter(g, r, o.x, o.y, o.r);
    for (const o of scatter(level, r, placed, 6, [10, 12], x0, x0 + W, y0, y0 + H)) bench(g, o.x, o.y, r() < 0.5 ? 0 : Math.PI / 2, '#c9c2b4');
  } else {
    for (const o of scatter(level, r, placed, 10, [48, 70], x0 - 40, x0 + W + 40, y0 - 40, y0 + H + 40, 16)) rooftop(g, r, o.x - o.r, o.y - o.r * 0.8, o.r * 2, o.r * 1.6);
    for (const o of scatter(level, r, placed, 14, [22, 22], x0, x0 + W, y0, y0 + H, 10)) car(g, o.x, o.y, (r() < 0.5 ? 0 : Math.PI) + (r() < 0.25 ? Math.PI / 2 : 0), ['#c1121f', '#f1faee', '#1d3557', '#2b2d42', '#ffb703', '#8d99ae', '#457b9d'][Math.floor(r() * 7)]);
    for (const o of scatter(level, r, placed, 14, [11, 16], x0, x0 + W, y0, y0 + H, 10)) {
      g.fillStyle = '#4a3a2c'; g.fillRect(o.x - o.r * 0.6, o.y - o.r * 0.6, o.r * 1.2, o.r * 1.2);
      tree(g, r, o.x, o.y, o.r, ['#1b4a2a', '#265e35', '#3c7d45', '#69a867']);
    }
    for (const o of scatter(level, r, placed, 12, [3, 4], x0, x0 + W, y0, y0 + H, 14)) { lamp(g, o.x, o.y); lamps.push(o); }
  }

  // ---- eau ----
  for (const l of level.lakes) pond(g, r, l, scene);

  // ---- éclairage d'ambiance (avant la piste, qui reste bien lisible) ----
  if (scene === 'ville') {
    g.fillStyle = 'rgba(25,30,70,0.42)'; g.fillRect(x0, y0, W, H);
    g.save(); g.globalCompositeOperation = 'lighter';
    for (const p of lamps) {
      const gr = g.createRadialGradient(p.x, p.y, 0, p.x, p.y, 70);
      gr.addColorStop(0, 'rgba(255,200,120,0.4)'); gr.addColorStop(1, 'rgba(255,200,120,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(p.x, p.y, 70, 0, TAU); g.fill();
    }
    g.restore();
  } else if (scene === 'parc') {
    const gr = g.createLinearGradient(x0, y0, x0 + W, y0 + H);
    gr.addColorStop(0, 'rgba(255,240,190,0.10)'); gr.addColorStop(1, 'rgba(20,40,10,0.12)');
    g.fillStyle = gr; g.fillRect(x0, y0, W, H);
  }

  // ---- piste surélevée ----
  const trim = { parc: ['#5b3d22', '#8a6038'], mall: ['#6c737c', '#c7ced6'], ville: ['#55585e', '#a9a49a'] }[scene];
  g.lineCap = 'round'; g.lineJoin = 'round';
  const segs = level.track.filter((t) => !t.bridge);
  const stroke = (w, col, ox = 0, oy = 0) => { g.strokeStyle = col; for (const t of segs) { g.lineWidth = t.w + w; g.beginPath(); g.moveTo(t.a[0] + ox, t.a[1] + oy); g.lineTo(t.b[0] + ox, t.b[1] + oy); g.stroke(); } };
  stroke(26, 'rgba(0,0,0,0.12)', 7, 11); stroke(20, 'rgba(0,0,0,0.2)', 5, 8); stroke(16, 'rgba(0,0,0,0.25)', 3, 5);
  stroke(15, trim[0]); stroke(11, trim[1]); stroke(9, shade(trim[1], -0.08));
  for (const t of level.track) if (t.bridge) bridge(g, t, scene);

  // calque gazon synthétique
  const lc = document.createElement('canvas'); lc.width = cv.width; lc.height = cv.height;
  const lg = lc.getContext('2d'); lg.setTransform(s, 0, 0, s, -x0 * s, -y0 * s);
  lg.lineCap = 'round'; lg.lineJoin = 'round';
  const lstroke = (w, col) => { lg.strokeStyle = col; for (const t of segs) { lg.lineWidth = Math.max(1, t.w + w); lg.beginPath(); lg.moveTo(t.a[0], t.a[1]); lg.lineTo(t.b[0], t.b[1]); lg.stroke(); } };
  const turf = lg.createPattern(turfTile(2), 'repeat');
  lstroke(0, '#000');
  lg.globalCompositeOperation = 'source-in'; lg.fillStyle = turf; lg.fillRect(x0, y0, W, H);
  lg.globalCompositeOperation = 'source-atop';
  // légères bandes (sens du poil) + ombre portée de la bordure
  for (let y = y0; y < y0 + H; y += 36) { lg.fillStyle = (Math.floor(y / 36) % 2) ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.035)'; lg.fillRect(x0, y, W, 36); }
  lstroke(0, 'rgba(0,0,0,0.30)'); lstroke(-4, turf); lstroke(-4, 'rgba(0,0,0,0.10)'); lstroke(-9, turf);
  lstroke(-9, 'rgba(255,255,255,0.025)');
  // bunkers de sable ratissé
  const sandPat = lg.createPattern(sandTile(6), 'repeat');
  for (const z of level.sand) {
    lg.save(); lg.beginPath(); lg.roundRect(z.x, z.y, z.w, z.h, 16); lg.clip();
    lg.fillStyle = sandPat; lg.fillRect(z.x, z.y, z.w, z.h);
    lg.strokeStyle = 'rgba(170,135,70,0.35)'; lg.lineWidth = 0.9;
    for (let y = z.y + 4; y < z.y + z.h; y += 4.5) { lg.beginPath(); for (let x = z.x; x <= z.x + z.w; x += 4) lg.lineTo(x, y + Math.sin(x * 0.15) * 1.2); lg.stroke(); }
    lg.strokeStyle = 'rgba(90,70,30,0.35)'; lg.lineWidth = 5; lg.beginPath(); lg.roundRect(z.x, z.y, z.w, z.h, 16); lg.stroke();
    lg.restore();
  }
  // pentes : flèches peintes
  for (const z of level.slopes) {
    lg.save(); lg.beginPath(); lg.rect(z.x, z.y, z.w, z.h); lg.clip();
    const ang = Math.atan2(z.fy, z.fx);
    lg.translate(z.x + z.w / 2, z.y + z.h / 2); lg.rotate(ang);
    const gr = lg.createLinearGradient(-z.w, 0, z.w, 0); gr.addColorStop(0, 'rgba(255,255,255,0.08)'); gr.addColorStop(1, 'rgba(0,0,0,0.14)');
    lg.fillStyle = gr; lg.fillRect(-200, -200, 400, 400);
    lg.strokeStyle = 'rgba(255,255,255,0.55)'; lg.lineWidth = 3; lg.lineCap = 'round';
    for (let x = -60; x <= 60; x += 24) for (let y = -80; y <= 80; y += 30) { lg.beginPath(); lg.moveTo(x - 5, y - 7); lg.lineTo(x + 4, y); lg.lineTo(x - 5, y + 7); lg.stroke(); }
    lg.restore();
  }
  // bosses et creux du gazon
  for (const b of level.bumps) {
    const up = b.h > 0, rr = b.r;
    let gr = lg.createRadialGradient(b.x + (up ? 0.35 : -0.35) * rr, b.y + (up ? 0.35 : -0.35) * rr, 0, b.x, b.y, rr);
    gr.addColorStop(0, 'rgba(0,30,0,0.32)'); gr.addColorStop(1, 'rgba(0,30,0,0)');
    lg.fillStyle = gr; lg.beginPath(); lg.arc(b.x, b.y, rr, 0, TAU); lg.fill();
    gr = lg.createRadialGradient(b.x + (up ? -0.35 : 0.35) * rr, b.y + (up ? -0.35 : 0.35) * rr, 0, b.x, b.y, rr);
    gr.addColorStop(0, 'rgba(230,255,200,0.30)'); gr.addColorStop(0.6, 'rgba(230,255,200,0.06)'); gr.addColorStop(1, 'rgba(230,255,200,0)');
    lg.fillStyle = gr; lg.beginPath(); lg.arc(b.x, b.y, rr, 0, TAU); lg.fill();
  }
  // tapis de départ
  {
    const t0 = level.track[0], ang = Math.atan2(t0.b[1] - t0.a[1], t0.b[0] - t0.a[0]);
    lg.save(); lg.translate(level.start[0], level.start[1]); lg.rotate(ang + Math.PI / 2);
    lg.fillStyle = '#1f3d26'; lg.beginPath(); lg.roundRect(-22, -12, 44, 24, 4); lg.fill();
    lg.strokeStyle = 'rgba(255,255,255,0.18)'; lg.lineWidth = 1; lg.stroke();
    lg.fillStyle = '#e8e8e8'; lg.beginPath(); lg.arc(0, 0, 2.2, 0, TAU); lg.fill();
    lg.restore();
  }
  g.setTransform(1, 0, 0, 1, 0, 0);
  g.drawImage(lc, 0, 0);

  return { canvas: cv, x0, y0, w: W, h: H };
}
