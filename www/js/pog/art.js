// Graphismes des pogs (faces illustrées, dos, kini) et salles d'ambiance en arrière-plan.

const TAU = Math.PI * 2;
export function rng(seed) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const cnv = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };

// ---------- Palettes tendance ----------
const PALS = [
  ['#ff2e88', '#ffd23f', '#3bceac', '#1b1b3a'], // néon rétro
  ['#7b2ff7', '#f107a3', '#ffe66d', '#14002b'], // synthwave
  ['#00f5d4', '#9b5de5', '#fee440', '#0d1b2a'], // cyber
  ['#ff7b00', '#ffd000', '#ff3c38', '#2b1600'], // feu
  ['#06d6a0', '#118ab2', '#ffd166', '#073b4c'], // lagon
  ['#f72585', '#4cc9f0', '#b5179e', '#120024'], // acide
  ['#ff006e', '#8338ec', '#3a86ff', '#0a0a23'], // électrique
  ['#e9c46a', '#e76f51', '#2a9d8f', '#264653'], // vintage
  ['#c1fba4', '#7bf1a8', '#ff99c8', '#1f2041'], // pastel pop
];
export const MOTIFS = ['smiley', 'alien', 'sunset', 'yinyang', 'eight', 'crown', 'eye', 'cherry', 'planet', 'dice', 'heart', 'wave', 'bolt', 'flame', 'text', 'flower'];
const WORDS = ['RAD', 'GG', 'WOW', 'POG', 'EPIC', 'BOOM', 'YEAH', 'KING'];
export const rarityOf = (id) => (id % 9 === 4 ? 'holo' : id % 5 === 2 ? 'gold' : 'common');

// ---------- Fonds ----------
function bgSunburst(g, R, a, b) {
  for (let i = 0; i < 24; i++) { g.fillStyle = i % 2 ? a : b; g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, R * 1.5, (i / 24) * TAU, ((i + 1) / 24) * TAU); g.fill(); }
}
function bgHalftone(g, R, base, dot) {
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R * 1.2); gr.addColorStop(0, base[0]); gr.addColorStop(1, base[1]);
  g.fillStyle = gr; g.fillRect(-R, -R, R * 2, R * 2);
  g.fillStyle = dot;
  const st = R / 9;
  for (let y = -R; y < R; y += st) for (let x = -R; x < R; x += st) {
    const d = Math.hypot(x, y) / R; g.globalAlpha = 0.25; g.beginPath(); g.arc(x + ((y / st) % 2 ? st / 2 : 0), y, st * 0.42 * d, 0, TAU); g.fill();
  }
  g.globalAlpha = 1;
}
function bgChecker(g, R, a, b) { const k = R / 4; for (let i = -5; i < 5; i++) for (let j = -5; j < 5; j++) { g.fillStyle = (i + j) & 1 ? a : b; g.fillRect(i * k, j * k, k, k); } }
function bgStripes(g, R, a, b) { g.save(); g.rotate(-0.6); for (let i = -10; i < 10; i++) { g.fillStyle = i % 2 ? a : b; g.fillRect(i * R * 0.18, -R * 2, R * 0.18, R * 4); } g.restore(); }
function bgHolo(g, R) {
  const gr = g.createConicGradient ? g.createConicGradient(0, 0, 0) : null;
  if (gr) { ['#ff9ad5', '#a0e7ff', '#c5ffb0', '#fff59a', '#ffb3ff', '#9ad5ff', '#ff9ad5'].forEach((c, i, arr) => gr.addColorStop(i / (arr.length - 1), c)); g.fillStyle = gr; }
  else g.fillStyle = '#c9b8ff';
  g.fillRect(-R, -R, R * 2, R * 2);
  g.globalAlpha = 0.25; bgStripes(g, R, '#ffffff', 'rgba(255,255,255,0)'); g.globalAlpha = 1;
}

// ---------- Motifs ----------
function outline(g, w) { g.lineJoin = 'round'; g.lineCap = 'round'; g.lineWidth = w; g.strokeStyle = '#111'; }
const M = {
  smiley(g, R, p) {
    outline(g, R * 0.06); g.fillStyle = '#ffe14d'; g.beginPath(); g.arc(0, 0, R * 0.55, 0, TAU); g.fill(); g.stroke();
    // coulures acides
    g.beginPath(); for (const [x, l] of [[-0.3, 0.35], [0.05, 0.5], [0.32, 0.28]]) { g.moveTo(x * R, R * 0.4); g.lineTo(x * R, R * (0.4 + l)); } g.strokeStyle = '#ffe14d'; g.lineWidth = R * 0.12; g.stroke();
    g.fillStyle = '#111'; g.beginPath(); g.ellipse(-R * 0.2, -R * 0.12, R * 0.07, R * 0.13, 0, 0, TAU); g.ellipse(R * 0.2, -R * 0.12, R * 0.07, R * 0.13, 0, 0, TAU); g.fill();
    outline(g, R * 0.06); g.beginPath(); g.arc(0, R * 0.05, R * 0.32, 0.25, Math.PI - 0.25); g.stroke();
  },
  alien(g, R, p) {
    outline(g, R * 0.06); g.fillStyle = '#7bf1a8';
    g.beginPath(); g.moveTo(0, -R * 0.62); g.bezierCurveTo(R * 0.62, -R * 0.62, R * 0.55, R * 0.2, 0, R * 0.62); g.bezierCurveTo(-R * 0.55, R * 0.2, -R * 0.62, -R * 0.62, 0, -R * 0.62); g.fill(); g.stroke();
    g.fillStyle = '#111';
    for (const s of [-1, 1]) { g.save(); g.translate(s * R * 0.22, -R * 0.08); g.rotate(s * 0.5); g.beginPath(); g.ellipse(0, 0, R * 0.12, R * 0.22, 0, 0, TAU); g.fill(); g.fillStyle = '#fff'; g.beginPath(); g.arc(-R * 0.03, -R * 0.08, R * 0.035, 0, TAU); g.fill(); g.fillStyle = '#111'; g.restore(); }
  },
  sunset(g, R, p) {
    const gr = g.createLinearGradient(0, -R * 0.5, 0, R * 0.2); gr.addColorStop(0, '#ffe66d'); gr.addColorStop(1, '#ff2e88');
    g.save(); g.beginPath(); g.arc(0, -R * 0.05, R * 0.5, 0, TAU); g.clip(); g.fillStyle = gr; g.fillRect(-R, -R, R * 2, R * 2);
    g.fillStyle = p[3]; for (let i = 0; i < 5; i++) g.fillRect(-R, R * (0.02 + i * 0.09), R * 2, R * (0.015 + i * 0.012)); g.restore();
    g.strokeStyle = '#00f5d4'; g.lineWidth = R * 0.02;
    for (let i = 0; i < 6; i++) { const y = R * 0.45 + i * i * R * 0.02; g.beginPath(); g.moveTo(-R, y); g.lineTo(R, y); g.stroke(); }
    for (let i = -6; i <= 6; i++) { g.beginPath(); g.moveTo(i * R * 0.05, R * 0.45); g.lineTo(i * R * 0.3, R); g.stroke(); }
    // palmier
    g.fillStyle = '#111'; g.save(); g.translate(R * 0.42, R * 0.45);
    g.beginPath(); g.moveTo(-R * 0.03, 0); g.quadraticCurveTo(-R * 0.1, -R * 0.35, R * 0.02, -R * 0.62); g.lineTo(R * 0.05, -R * 0.6); g.quadraticCurveTo(-R * 0.05, -R * 0.35, R * 0.03, 0); g.fill();
    for (let k = 0; k < 6; k++) { const a = -Math.PI / 2 + (k - 2.5) * 0.55; g.beginPath(); g.moveTo(R * 0.02, -R * 0.62); g.quadraticCurveTo(R * 0.02 + Math.cos(a) * R * 0.2, -R * 0.62 + Math.sin(a) * R * 0.2 - R * 0.06, R * 0.02 + Math.cos(a) * R * 0.32, -R * 0.62 + Math.sin(a) * R * 0.32 + R * 0.04); g.lineWidth = R * 0.05; g.strokeStyle = '#111'; g.stroke(); }
    g.restore();
  },
  yinyang(g, R, p) {
    const r = R * 0.55; outline(g, R * 0.05);
    g.fillStyle = p[0]; g.beginPath(); g.arc(0, 0, r, 0, TAU); g.fill();
    g.fillStyle = p[2]; g.beginPath(); g.arc(0, 0, r, -Math.PI / 2, Math.PI / 2); g.arc(0, r / 2, r / 2, Math.PI / 2, -Math.PI / 2, true); g.arc(0, -r / 2, r / 2, Math.PI / 2, -Math.PI / 2); g.fill();
    g.fillStyle = p[0]; g.beginPath(); g.arc(0, -r / 2, r * 0.14, 0, TAU); g.fill(); g.fillStyle = p[2]; g.beginPath(); g.arc(0, r / 2, r * 0.14, 0, TAU); g.fill();
    g.beginPath(); g.arc(0, 0, r, 0, TAU); g.stroke();
  },
  eight(g, R) {
    const gr = g.createRadialGradient(-R * 0.2, -R * 0.2, 0, 0, 0, R * 0.6); gr.addColorStop(0, '#555'); gr.addColorStop(1, '#050505');
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * 0.58, 0, TAU); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-R * 0.05, -R * 0.05, R * 0.25, 0, TAU); g.fill();
    g.fillStyle = '#111'; g.font = `900 ${R * 0.36}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', -R * 0.05, -R * 0.03);
    g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-R * 0.25, -R * 0.32, R * 0.12, R * 0.06, -0.6, 0, TAU); g.fill();
  },
  crown(g, R, p) {
    outline(g, R * 0.05);
    const gr = g.createLinearGradient(0, -R * 0.4, 0, R * 0.3); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffc928'); gr.addColorStop(1, '#c77700');
    g.fillStyle = gr; g.beginPath(); g.moveTo(-R * 0.48, R * 0.3); g.lineTo(-R * 0.48, -R * 0.2); g.lineTo(-R * 0.24, R * 0.02); g.lineTo(0, -R * 0.42); g.lineTo(R * 0.24, R * 0.02); g.lineTo(R * 0.48, -R * 0.2); g.lineTo(R * 0.48, R * 0.3); g.closePath(); g.fill(); g.stroke();
    for (const [x, y, c] of [[-R * 0.48, -R * 0.22, p[0]], [0, -R * 0.45, p[2]], [R * 0.48, -R * 0.22, p[1]]]) { g.fillStyle = c; g.beginPath(); g.arc(x, y, R * 0.07, 0, TAU); g.fill(); g.stroke(); }
  },
  eye(g, R, p) {
    outline(g, R * 0.05); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(-R * 0.62, 0); g.quadraticCurveTo(0, -R * 0.55, R * 0.62, 0); g.quadraticCurveTo(0, R * 0.55, -R * 0.62, 0); g.fill(); g.stroke();
    for (let i = 4; i > 0; i--) { g.fillStyle = [p[3], p[0], p[2], p[1]][i - 1]; g.beginPath(); g.arc(0, 0, R * 0.07 * i, 0, TAU); g.fill(); }
    g.fillStyle = '#fff'; g.beginPath(); g.arc(-R * 0.08, -R * 0.08, R * 0.05, 0, TAU); g.fill();
    g.strokeStyle = '#111'; g.lineWidth = R * 0.03; for (let i = -3; i <= 3; i++) { g.beginPath(); g.moveTo(i * R * 0.12, -R * 0.33); g.lineTo(i * R * 0.16, -R * 0.46); g.stroke(); }
  },
  cherry(g, R) {
    outline(g, R * 0.045); g.strokeStyle = '#2d6a4f'; g.lineWidth = R * 0.05;
    g.beginPath(); g.moveTo(-R * 0.22, R * 0.12); g.quadraticCurveTo(-R * 0.05, -R * 0.35, R * 0.18, -R * 0.48); g.moveTo(R * 0.24, R * 0.18); g.quadraticCurveTo(R * 0.25, -R * 0.2, R * 0.18, -R * 0.48); g.stroke();
    g.fillStyle = '#52b788'; g.beginPath(); g.ellipse(R * 0.3, -R * 0.48, R * 0.15, R * 0.07, -0.4, 0, TAU); g.fill();
    for (const [x, y] of [[-R * 0.24, R * 0.25], [R * 0.24, R * 0.3]]) {
      const gr = g.createRadialGradient(x - R * 0.06, y - R * 0.06, 0, x, y, R * 0.2); gr.addColorStop(0, '#ff6b81'); gr.addColorStop(1, '#a4031f');
      g.fillStyle = gr; g.beginPath(); g.arc(x, y, R * 0.2, 0, TAU); g.fill(); outline(g, R * 0.04); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.7)'; g.beginPath(); g.ellipse(x - R * 0.07, y - R * 0.08, R * 0.05, R * 0.03, -0.6, 0, TAU); g.fill();
    }
  },
  planet(g, R, p) {
    g.save(); g.rotate(-0.35);
    outline(g, R * 0.04); g.strokeStyle = p[1]; g.lineWidth = R * 0.06; g.beginPath(); g.ellipse(0, 0, R * 0.7, R * 0.18, 0, Math.PI, TAU); g.stroke();
    const gr = g.createLinearGradient(0, -R * 0.4, 0, R * 0.4); gr.addColorStop(0, p[0]); gr.addColorStop(1, p[2]);
    g.fillStyle = gr; g.beginPath(); g.arc(0, 0, R * 0.38, 0, TAU); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.15)'; for (let i = -2; i <= 2; i++) g.fillRect(-R * 0.4, i * R * 0.13, R * 0.8, R * 0.05);
    g.strokeStyle = p[1]; g.beginPath(); g.ellipse(0, 0, R * 0.7, R * 0.18, 0, 0, Math.PI); g.stroke();
    g.restore();
    g.fillStyle = '#fff'; for (const [x, y] of [[-0.5, -0.45], [0.45, -0.5], [0.55, 0.4], [-0.4, 0.5]]) { g.beginPath(); g.arc(x * R, y * R, R * 0.025, 0, TAU); g.fill(); }
  },
  dice(g, R, p) {
    g.save(); g.rotate(0.25); outline(g, R * 0.05);
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(-R * 0.36, -R * 0.36, R * 0.72, R * 0.72, R * 0.12); g.fill(); g.stroke();
    g.fillStyle = p[0]; for (const [x, y] of [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]]) { g.beginPath(); g.arc(x * R * 0.18, y * R * 0.18, R * 0.07, 0, TAU); g.fill(); }
    g.restore();
  },
  heart(g, R, p) {
    outline(g, R * 0.05);
    const gr = g.createLinearGradient(0, -R * 0.4, 0, R * 0.5); gr.addColorStop(0, '#ff6fb5'); gr.addColorStop(1, '#d6005c');
    g.fillStyle = gr; g.beginPath(); g.moveTo(0, R * 0.48);
    g.bezierCurveTo(-R * 0.7, 0, -R * 0.4, -R * 0.55, 0, -R * 0.22); g.bezierCurveTo(R * 0.4, -R * 0.55, R * 0.7, 0, 0, R * 0.48); g.fill(); g.stroke();
    g.fillStyle = '#fff'; for (const [x, y, s] of [[-0.5, -0.45, 1], [0.55, -0.3, 0.7], [0.45, 0.45, 0.8]]) { g.save(); g.translate(x * R, y * R); g.scale(s, s); g.beginPath(); for (let i = 0; i < 8; i++) { const r = i % 2 ? R * 0.03 : R * 0.1, a = (i * Math.PI) / 4; g.lineTo(Math.cos(a) * r, Math.sin(a) * r); } g.fill(); g.restore(); }
  },
  wave(g, R, p) {
    g.save(); g.beginPath(); g.arc(0, 0, R * 0.7, 0, TAU); g.clip();
    g.fillStyle = '#fef6e4'; g.fillRect(-R, -R, R * 2, R * 2);
    g.fillStyle = '#ff8906'; g.beginPath(); g.arc(R * 0.3, -R * 0.3, R * 0.18, 0, TAU); g.fill();
    for (let k = 0; k < 3; k++) {
      g.fillStyle = ['#3da9fc', '#094067', '#5f6c7b'][k];
      g.beginPath(); g.moveTo(-R, R * (0.15 + k * 0.17));
      for (let x = -R; x <= R; x += R * 0.1) g.lineTo(x, R * (0.15 + k * 0.17) + Math.sin(x / R * 6 + k) * R * 0.06);
      g.lineTo(R, R); g.lineTo(-R, R); g.fill();
    }
    g.strokeStyle = '#fff'; g.lineWidth = R * 0.03; g.beginPath(); g.arc(-R * 0.25, R * 0.08, R * 0.2, Math.PI, Math.PI * 1.9); g.stroke();
    g.restore(); outline(g, R * 0.05); g.beginPath(); g.arc(0, 0, R * 0.7, 0, TAU); g.stroke();
  },
  bolt(g, R, p) {
    outline(g, R * 0.05); g.fillStyle = p[1];
    g.beginPath(); g.moveTo(R * 0.12, -R * 0.62); g.lineTo(-R * 0.34, R * 0.08); g.lineTo(-R * 0.02, R * 0.08); g.lineTo(-R * 0.14, R * 0.62); g.lineTo(R * 0.36, -R * 0.12); g.lineTo(R * 0.04, -R * 0.12); g.closePath(); g.fill(); g.stroke();
    g.fillStyle = 'rgba(255,255,255,0.6)'; g.beginPath(); g.moveTo(R * 0.06, -R * 0.5); g.lineTo(-R * 0.18, R * 0.0); g.lineTo(-R * 0.1, R * 0.0); g.closePath(); g.fill();
  },
  flame(g, R) {
    const layers = [['#ff3c38', 1], ['#ff8c00', 0.72], ['#ffe14d', 0.45]];
    outline(g, R * 0.05);
    layers.forEach(([c, s], i) => {
      g.fillStyle = c; g.save(); g.scale(s, s); g.translate(0, R * 0.2 * (1 - s));
      g.beginPath(); g.moveTo(0, R * 0.55); g.bezierCurveTo(-R * 0.55, R * 0.45, -R * 0.5, -R * 0.1, -R * 0.15, -R * 0.35); g.quadraticCurveTo(-R * 0.1, -R * 0.1, R * 0.02, -R * 0.05);
      g.quadraticCurveTo(-R * 0.05, -R * 0.4, R * 0.15, -R * 0.65); g.bezierCurveTo(R * 0.2, -R * 0.3, R * 0.6, -R * 0.1, R * 0.45, R * 0.25); g.quadraticCurveTo(R * 0.35, R * 0.52, 0, R * 0.55); g.fill(); if (!i) g.stroke(); g.restore();
    });
  },
  text(g, R, p, id) {
    const w = WORDS[id % WORDS.length];
    g.save(); g.rotate(-0.18);
    const fs = R * (w.length > 3 ? 0.42 : 0.55);
    g.font = `900 ${fs}px system-ui, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = fs * 0.28; g.strokeStyle = '#111'; g.strokeText(w, R * 0.04, R * 0.06);
    g.fillStyle = '#111'; g.fillText(w, R * 0.04, R * 0.06);
    g.lineWidth = fs * 0.16; g.strokeStyle = '#fff'; g.strokeText(w, 0, 0);
    const gr = g.createLinearGradient(0, -fs / 2, 0, fs / 2); gr.addColorStop(0, p[1]); gr.addColorStop(1, p[0]);
    g.fillStyle = gr; g.fillText(w, 0, 0);
    g.restore();
  },
  flower(g, R, p) {
    outline(g, R * 0.04);
    for (let i = 0; i < 6; i++) { g.save(); g.rotate((i * TAU) / 6); g.fillStyle = i % 2 ? p[0] : p[2]; g.beginPath(); g.ellipse(0, -R * 0.3, R * 0.15, R * 0.27, 0, 0, TAU); g.fill(); g.stroke(); g.restore(); }
    g.fillStyle = p[1]; g.beginPath(); g.arc(0, 0, R * 0.16, 0, TAU); g.fill(); g.stroke();
    g.fillStyle = '#111'; for (const s of [-1, 1]) { g.beginPath(); g.arc(s * R * 0.05, -R * 0.03, R * 0.025, 0, TAU); g.fill(); }
    g.beginPath(); g.arc(0, R * 0.02, R * 0.07, 0.3, Math.PI - 0.3); g.lineWidth = R * 0.02; g.stroke();
  },
};

// texte courbe imprimé sur l'anneau extérieur
function ringText(g, R, text, color) {
  g.save(); g.fillStyle = color; g.font = `800 ${R * 0.085}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  const chars = [...text], step = TAU / chars.length;
  chars.forEach((ch, i) => { g.save(); g.rotate(i * step - Math.PI / 2); g.translate(0, -R * 0.88); g.fillText(ch, 0, 0); g.restore(); });
  g.restore();
}

export function drawFace(id, size) {
  const c = cnv(size, size), g = c.getContext('2d'), R = size / 2;
  const pal = PALS[id % PALS.length], motif = MOTIFS[Math.floor(id / 3) % MOTIFS.length], rar = rarityOf(id);
  g.translate(R, R);
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  const bgType = (id * 7) % 5;
  if (rar === 'holo') bgHolo(g, R);
  else if (bgType === 0) bgSunburst(g, R, pal[0], pal[3]);
  else if (bgType === 1) bgHalftone(g, R, [pal[2], pal[3]], '#000');
  else if (bgType === 2) bgChecker(g, R, pal[3], pal[0]);
  else if (bgType === 3) bgStripes(g, R, pal[1], pal[0]);
  else { const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R * 1.1); gr.addColorStop(0, pal[2]); gr.addColorStop(1, pal[3]); g.fillStyle = gr; g.fillRect(-R, -R, R * 2, R * 2); }
  // anneau extérieur imprimé
  g.lineWidth = R * 0.2; g.strokeStyle = rar === 'gold' ? '#c99a2e' : pal[3]; g.beginPath(); g.arc(0, 0, R * 0.88, 0, TAU); g.stroke();
  ringText(g, R, '★ THE KING GAME ARENA ★ POG #' + String(id).padStart(3, '0') + ' ', rar === 'gold' ? '#3a2600' : '#fff');
  // motif
  g.save(); g.scale(0.92, 0.92); (M[motif] || M.text)(g, R, pal, id); g.restore();
  // bordure dorée (rare)
  if (rar === 'gold') {
    const gr = g.createLinearGradient(-R, -R, R, R); gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.4, '#ffc928'); gr.addColorStop(0.6, '#a86b00'); gr.addColorStop(1, '#ffe17a');
    g.strokeStyle = gr; g.lineWidth = R * 0.08; g.beginPath(); g.arc(0, 0, R * 0.96, 0, TAU); g.stroke();
  }
  g.restore();
  // vernis brillant
  const sh = g.createLinearGradient(-R, -R, R, R);
  sh.addColorStop(0, 'rgba(255,255,255,0.45)'); sh.addColorStop(0.35, 'rgba(255,255,255,0.05)'); sh.addColorStop(0.5, 'rgba(255,255,255,0)'); sh.addColorStop(1, 'rgba(0,0,0,0.15)');
  g.fillStyle = sh; g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.strokeStyle = 'rgba(255,255,255,0.9)'; g.lineWidth = R * 0.035; g.beginPath(); g.arc(0, 0, R - R * 0.02, 0, TAU); g.stroke();
  return c;
}

export function drawBack(size) {
  const c = cnv(size, size), g = c.getContext('2d'), R = size / 2;
  g.translate(R, R);
  g.save(); g.beginPath(); g.arc(0, 0, R, 0, TAU); g.clip();
  const gr = g.createRadialGradient(-R * 0.3, -R * 0.3, 0, 0, 0, R * 1.1); gr.addColorStop(0, '#3d1a78'); gr.addColorStop(1, '#0d0221');
  g.fillStyle = gr; g.fillRect(-R, -R, R * 2, R * 2);
  // motif de couronnes en quinconce
  g.fillStyle = 'rgba(255,211,77,0.12)';
  for (let y = -R; y < R; y += R * 0.28) for (let x = -R; x < R; x += R * 0.28) {
    const ox = x + ((Math.round(y / (R * 0.28)) & 1) ? R * 0.14 : 0), s = R * 0.07;
    g.beginPath(); g.moveTo(ox - s, y + s * 0.6); g.lineTo(ox - s, y - s * 0.3); g.lineTo(ox - s / 2, y + s * 0.1); g.lineTo(ox, y - s * 0.7); g.lineTo(ox + s / 2, y + s * 0.1); g.lineTo(ox + s, y - s * 0.3); g.lineTo(ox + s, y + s * 0.6); g.fill();
  }
  g.restore();
  g.lineWidth = R * 0.06; const gg = g.createLinearGradient(-R, -R, R, R); gg.addColorStop(0, '#fff3b0'); gg.addColorStop(0.5, '#ffc928'); gg.addColorStop(1, '#a86b00');
  g.strokeStyle = gg; g.beginPath(); g.arc(0, 0, R * 0.62, 0, TAU); g.stroke();
  g.fillStyle = gg; g.font = `900 ${R * 0.42}px system-ui, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = R * 0.08; g.strokeStyle = '#1a0636'; g.strokeText('POG', 0, R * 0.03); g.fillText('POG', 0, R * 0.03);
  ringText(g, R, '• KING GAME ARENA • SLAM IT • KING GAME ARENA • SLAM IT ', 'rgba(255,211,77,0.85)');
  g.strokeStyle = 'rgba(255,255,255,0.8)'; g.lineWidth = R * 0.035; g.beginPath(); g.arc(0, 0, R - R * 0.02, 0, TAU); g.stroke();
  return c;
}

export function drawSlammer(size) {
  const c = cnv(size, size), g = c.getContext('2d'), R = size / 2;
  g.translate(R, R);
  const conic = g.createConicGradient ? g.createConicGradient(0.6, 0, 0) : null;
  if (conic) { ['#eef2f7', '#8d97a5', '#ffffff', '#6b7482', '#e3e8ef', '#7d8794', '#eef2f7'].forEach((col, i, a) => conic.addColorStop(i / (a.length - 1), col)); g.fillStyle = conic; }
  else g.fillStyle = '#c5ccd6';
  g.beginPath(); g.arc(0, 0, R, 0, TAU); g.fill();
  g.strokeStyle = '#2b2f36'; g.lineWidth = R * 0.06; g.beginPath(); g.arc(0, 0, R * 0.97, 0, TAU); g.stroke();
  g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = R * 0.02; g.beginPath(); g.arc(0, 0, R * 0.78, 0, TAU); g.stroke();
  // couronne gravée émaillée
  const gr = g.createLinearGradient(0, -R * 0.4, 0, R * 0.3); gr.addColorStop(0, '#ff5fa2'); gr.addColorStop(1, '#b0005a');
  g.fillStyle = gr; g.lineJoin = 'round'; g.lineWidth = R * 0.05; g.strokeStyle = '#2b2f36';
  g.beginPath(); g.moveTo(-R * 0.45, R * 0.28); g.lineTo(-R * 0.45, -R * 0.18); g.lineTo(-R * 0.22, R * 0.02); g.lineTo(0, -R * 0.4); g.lineTo(R * 0.22, R * 0.02); g.lineTo(R * 0.45, -R * 0.18); g.lineTo(R * 0.45, R * 0.28); g.closePath(); g.fill(); g.stroke();
  g.fillStyle = 'rgba(255,255,255,0.5)'; g.beginPath(); g.ellipse(-R * 0.35, -R * 0.45, R * 0.3, R * 0.1, -0.6, 0, TAU); g.fill();
  return c;
}

// ---------- Salles d'ambiance ----------
export const ROOMS = {
  arcade: 'Salle d\'arcade', chambre: 'Chambre 90\'s', skatepark: 'Skatepark', rooftop: 'Rooftop',
};

function neonText(g, text, x, y, size, color, rot = 0) {
  g.save(); g.translate(x, y); g.rotate(rot);
  g.font = `900 ${size}px system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = size * 0.6; g.strokeStyle = color; g.lineWidth = size * 0.09; g.strokeText(text, 0, 0);
  g.shadowBlur = size * 0.3; g.strokeText(text, 0, 0);
  g.shadowBlur = 0; g.lineWidth = size * 0.035; g.strokeStyle = '#fff'; g.strokeText(text, 0, 0);
  g.restore();
}

// floor : dessiné en coordonnées « vues de dessus » écrasées verticalement (même inclinaison que les pogs)
export function drawRoom(room, w, h, cx, cy, R, tilt, dpr = 1) {
  const c = cnv(Math.round(w * dpr), Math.round(h * dpr)), g = c.getContext('2d'), r = rng(room.length * 97 + 11);
  g.scale(dpr, dpr);
  const horizon = h * 0.3;
  const floor = (draw) => { g.save(); g.beginPath(); g.rect(0, horizon, w, h - horizon); g.clip(); g.translate(cx, cy); g.scale(1, tilt); draw(); g.restore(); };
  const matR = R * 3.1;

  if (room === 'arcade') {
    // mur de briques sombres + néons + bornes d'arcade
    g.fillStyle = '#120a22'; g.fillRect(0, 0, w, horizon);
    for (let y = 0; y < horizon; y += 14) for (let x = (y / 14) % 2 ? -14 : 0; x < w; x += 28) { g.fillStyle = `rgba(${60 + r() * 30},${30 + r() * 20},${80 + r() * 40},0.35)`; g.fillRect(x + 1, y + 1, 26, 12); }
    const cols = ['#ff2e88', '#00f5d4', '#ffd23f', '#9b5de5'];
    const nb = Math.max(3, Math.floor(w / 110));
    for (let i = 0; i < nb; i++) {
      const bx = (i + 0.5) * (w / nb), bw = 70, bh = horizon * 0.85, by = horizon - bh;
      g.fillStyle = '#1d1033'; g.beginPath(); g.roundRect(bx - bw / 2, by, bw, bh, 6); g.fill();
      g.fillStyle = cols[i % 4]; g.fillRect(bx - bw / 2, by, bw, 10);
      const sc = g.createLinearGradient(0, by + 18, 0, by + 70); sc.addColorStop(0, cols[(i + 1) % 4]); sc.addColorStop(1, '#0b0518');
      g.fillStyle = sc; g.fillRect(bx - bw / 2 + 9, by + 18, bw - 18, 46);
      g.shadowColor = cols[(i + 1) % 4]; g.shadowBlur = 20; g.fillRect(bx - bw / 2 + 9, by + 18, bw - 18, 2); g.shadowBlur = 0;
      g.fillStyle = '#333'; g.fillRect(bx - bw / 2 + 6, by + 72, bw - 12, 14);
      g.fillStyle = '#ff2e88'; g.beginPath(); g.arc(bx - 14, by + 79, 4, 0, TAU); g.fill(); g.fillStyle = '#00f5d4'; g.beginPath(); g.arc(bx + 2, by + 79, 4, 0, TAU); g.fill();
    }
    neonText(g, 'GAME ON', w * 0.5, horizon * 0.62, Math.min(54, w * 0.12), '#ff2e88');
    neonText(g, 'POG', w * 0.86, horizon * 0.86, Math.min(30, w * 0.07), '#00f5d4', -0.1);
    // moquette d'arcade (motifs néon)
    g.fillStyle = '#0c0718'; g.fillRect(0, horizon, w, h - horizon);
    floor(() => {
      for (let i = 0; i < 260; i++) {
        const x = (r() - 0.5) * w * 2.4, y = (r() - 0.5) * (h / tilt) * 2.2, s = 6 + r() * 12, col = cols[Math.floor(r() * 4)];
        g.strokeStyle = col; g.lineWidth = 2.4; g.globalAlpha = 0.55; g.beginPath();
        const t = Math.floor(r() * 3);
        if (t === 0) { g.moveTo(x - s, y); g.quadraticCurveTo(x - s / 2, y - s, x, y); g.quadraticCurveTo(x + s / 2, y + s, x + s, y); }
        else if (t === 1) { g.moveTo(x, y - s); g.lineTo(x + s, y + s); g.lineTo(x - s, y + s); g.closePath(); }
        else { g.arc(x, y, s * 0.6, 0, TAU); }
        g.stroke();
      }
      g.globalAlpha = 1;
      // tapis de jeu rond avec anneau néon
      g.fillStyle = '#05030b'; g.beginPath(); g.arc(0, 0, matR, 0, TAU); g.fill();
      g.shadowColor = '#00f5d4'; g.shadowBlur = 30; g.strokeStyle = '#00f5d4'; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, matR, 0, TAU); g.stroke();
      g.shadowColor = '#ff2e88'; g.strokeStyle = '#ff2e88'; g.lineWidth = 3; g.beginPath(); g.arc(0, 0, matR * 0.82, 0, TAU); g.stroke(); g.shadowBlur = 0;
    });
  } else if (room === 'chambre') {
    // papier peint, posters, fenêtre, étagère
    g.fillStyle = '#2b9eb3'; g.fillRect(0, 0, w, horizon);
    for (let y = 8; y < horizon; y += 26) for (let x = ((y / 26) % 2) * 20; x < w; x += 40) { g.fillStyle = 'rgba(255,255,255,0.12)'; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 8, y + 10); g.lineTo(x - 8, y + 10); g.fill(); }
    const win = { x: w * 0.08, y: horizon * 0.3, w: Math.min(140, w * 0.3), h: horizon * 0.6 };
    const sky = g.createLinearGradient(0, win.y, 0, win.y + win.h); sky.addColorStop(0, '#ff9a8b'); sky.addColorStop(1, '#ffd3a5');
    g.fillStyle = '#f5efe0'; g.fillRect(win.x - 6, win.y - 6, win.w + 12, win.h + 12); g.fillStyle = sky; g.fillRect(win.x, win.y, win.w, win.h);
    g.fillStyle = '#fff6'; g.beginPath(); g.arc(win.x + win.w * 0.7, win.y + win.h * 0.45, win.h * 0.18, 0, TAU); g.fill();
    g.fillStyle = '#f5efe0'; g.fillRect(win.x + win.w / 2 - 3, win.y, 6, win.h); g.fillRect(win.x, win.y + win.h / 2 - 3, win.w, 6);
    const posters = [['#ff006e', '#ffbe0b', 'RAD'], ['#8338ec', '#3a86ff', '★'], ['#06d6a0', '#ffd166', '90']];
    posters.forEach(([a, b, t], i) => {
      const px = w * (0.47 + i * 0.17), py = horizon * (0.42 + (i % 2) * 0.08), pw = Math.min(70, w * 0.14), ph = pw * 1.35;
      g.save(); g.translate(px, py); g.rotate((r() - 0.5) * 0.1);
      const pg = g.createLinearGradient(0, 0, pw, ph); pg.addColorStop(0, a); pg.addColorStop(1, b);
      g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(4, 5, pw, ph); g.fillStyle = pg; g.fillRect(0, 0, pw, ph);
      g.fillStyle = '#fff'; g.font = `900 ${pw * 0.4}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(t, pw / 2, ph / 2);
      g.fillStyle = '#ddd'; g.beginPath(); g.arc(pw / 2, 4, 3, 0, TAU); g.fill();
      g.restore();
    });
    g.fillStyle = 'rgba(0,0,0,0.25)'; g.fillRect(0, horizon - 8, w, 8);
    // parquet
    g.fillStyle = '#b07a45'; g.fillRect(0, horizon, w, h - horizon);
    floor(() => {
      const pw = 34;
      for (let x = -w * 1.5; x < w * 1.5; x += pw) {
        for (let y = -h * 2; y < h * 2; y += 140 + r() * 60) {
          g.fillStyle = `hsl(28,${40 + r() * 15}%,${36 + r() * 12}%)`; g.fillRect(x, y, pw - 2, 200);
          g.fillStyle = 'rgba(0,0,0,0.3)'; g.fillRect(x, y, pw - 2, 2);
        }
      }
      // tapis rond multicolore
      const cols = ['#ff006e', '#ffbe0b', '#3a86ff', '#06d6a0', '#8338ec', '#fb5607'];
      for (let i = 6; i > 0; i--) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(0, 0, matR * (i / 6), 0, TAU); g.fill(); }
      g.fillStyle = 'rgba(0,0,0,0.15)'; g.beginPath(); g.arc(0, 0, matR, 0, TAU); g.fill();
      g.strokeStyle = '#fff'; g.setLineDash([6, 8]); g.lineWidth = 3; g.beginPath(); g.arc(0, 0, matR - 6, 0, TAU); g.stroke(); g.setLineDash([]);
    });
  } else if (room === 'skatepark') {
    // mur de béton tagué + grillage
    const wall = g.createLinearGradient(0, 0, 0, horizon); wall.addColorStop(0, '#8d8f94'); wall.addColorStop(1, '#6b6d72');
    g.fillStyle = wall; g.fillRect(0, 0, w, horizon);
    for (let i = 0; i < 400; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)'; g.fillRect(r() * w, r() * horizon, 2, 2); }
    // graffiti « POG » en lettres bulles
    const gx = w * 0.5, gy = horizon * 0.66, fs = Math.min(110, w * 0.26);
    g.save(); g.translate(gx, gy); g.rotate(-0.06);
    g.font = `900 ${fs}px system-ui, Arial Black, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
    g.lineWidth = fs * 0.3; g.strokeStyle = '#111'; g.strokeText('POG', 6, 8);
    g.lineWidth = fs * 0.2; g.strokeStyle = '#fff'; g.strokeText('POG', 0, 0);
    const gg = g.createLinearGradient(0, -fs / 2, 0, fs / 2); gg.addColorStop(0, '#ffd23f'); gg.addColorStop(0.5, '#ff2e88'); gg.addColorStop(1, '#7b2ff7');
    g.fillStyle = gg; g.fillText('POG', 0, 0);
    g.fillStyle = '#ff2e88'; for (let i = 0; i < 6; i++) { const x = -fs + r() * fs * 2; g.fillRect(x, fs * 0.3, 3, 12 + r() * 26); }
    g.restore();
    neonText(g, 'KING', w * 0.14, horizon * 0.62, Math.min(34, w * 0.08), '#00f5d4', -0.2);
    g.strokeStyle = 'rgba(30,30,30,0.5)'; g.lineWidth = 1.5;
    for (let x = -horizon; x < w; x += 16) { g.beginPath(); g.moveTo(x, horizon * 0.72); g.lineTo(x + horizon * 0.28, horizon); g.moveTo(x + horizon * 0.28, horizon * 0.72); g.lineTo(x, horizon); g.stroke(); }
    // dalle de béton
    g.fillStyle = '#a3a5aa'; g.fillRect(0, horizon, w, h - horizon);
    floor(() => {
      for (let i = 0; i < 900; i++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.07)' : 'rgba(255,255,255,0.07)'; g.fillRect((r() - 0.5) * w * 3, (r() - 0.5) * h * 4, 3, 3); }
      g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3;
      for (let k = -6; k <= 6; k++) { g.beginPath(); g.moveTo(k * 160, -h * 2); g.lineTo(k * 160, h * 2); g.stroke(); g.beginPath(); g.moveTo(-w * 2, k * 160); g.lineTo(w * 2, k * 160); g.stroke(); }
      g.strokeStyle = 'rgba(0,0,0,0.3)'; g.lineWidth = 1.5; g.beginPath(); let x = -matR * 1.4, y = matR * 0.9; g.moveTo(x, y); for (let i = 0; i < 8; i++) { x += 30 + r() * 20; y += (r() - 0.5) * 30; g.lineTo(x, y); } g.stroke();
      // cercle peint à la bombe
      g.fillStyle = 'rgba(255,46,136,0.85)'; g.beginPath(); g.arc(0, 0, matR, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,210,63,0.9)'; g.beginPath(); g.arc(0, 0, matR * 0.78, 0, TAU); g.fill();
      g.fillStyle = '#2b2d42'; g.beginPath(); g.arc(0, 0, matR * 0.7, 0, TAU); g.fill();
      for (let i = 0; i < 60; i++) { const a = r() * TAU, d = matR * (1 + r() * 0.12); g.fillStyle = 'rgba(255,46,136,0.6)'; g.beginPath(); g.arc(Math.cos(a) * d, Math.sin(a) * d, 1 + r() * 3, 0, TAU); g.fill(); }
    });
  } else {
    // rooftop synthwave au coucher du soleil
    const sky = g.createLinearGradient(0, 0, 0, horizon); sky.addColorStop(0, '#1a0b3d'); sky.addColorStop(0.55, '#7b2ff7'); sky.addColorStop(1, '#ff7eb3');
    g.fillStyle = sky; g.fillRect(0, 0, w, horizon);
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${r() * 0.8})`; g.fillRect(r() * w, r() * horizon * 0.5, 1.5, 1.5); }
    const sunR = Math.min(w, horizon) * 0.32, sx = w * 0.5, sy = horizon * 0.86;
    const sun = g.createLinearGradient(0, sy - sunR, 0, sy + sunR); sun.addColorStop(0, '#ffe66d'); sun.addColorStop(1, '#ff2e88');
    g.save(); g.beginPath(); g.arc(sx, sy, sunR, 0, TAU); g.clip(); g.fillStyle = sun; g.fillRect(sx - sunR, sy - sunR, sunR * 2, sunR * 2);
    g.fillStyle = '#7b2ff7'; for (let i = 0; i < 6; i++) g.fillRect(sx - sunR, sy - sunR * 0.1 + i * sunR * 0.17, sunR * 2, 2 + i * 1.6); g.restore();
    // silhouettes d'immeubles
    g.fillStyle = '#12052b';
    for (let x = -10; x < w; ) { const bw = 24 + r() * 40, bh = horizon * (0.25 + r() * 0.45); g.fillRect(x, horizon - bh, bw, bh); for (let k = 0; k < 6; k++) { if (r() < 0.5) { g.fillStyle = '#ffd23f'; g.fillRect(x + 4 + r() * (bw - 10), horizon - bh + 6 + r() * (bh - 12), 3, 4); g.fillStyle = '#12052b'; } } x += bw + 2; }
    // toit : grille néon
    g.fillStyle = '#0d0221'; g.fillRect(0, horizon, w, h - horizon);
    floor(() => {
      g.strokeStyle = 'rgba(0,245,212,0.55)'; g.lineWidth = 2; g.shadowColor = '#00f5d4'; g.shadowBlur = 10;
      for (let k = -14; k <= 14; k++) { g.beginPath(); g.moveTo(k * 60, -h * 2); g.lineTo(k * 60, h * 2); g.stroke(); g.beginPath(); g.moveTo(-w * 2, k * 60); g.lineTo(w * 2, k * 60); g.stroke(); }
      g.shadowBlur = 0;
      g.fillStyle = 'rgba(13,2,33,0.85)'; g.beginPath(); g.arc(0, 0, matR, 0, TAU); g.fill();
      g.shadowColor = '#ff2e88'; g.shadowBlur = 30; g.strokeStyle = '#ff2e88'; g.lineWidth = 5; g.beginPath(); g.arc(0, 0, matR, 0, TAU); g.stroke(); g.shadowBlur = 0;
    });
    g.fillStyle = 'rgba(255,126,179,0.25)'; g.fillRect(0, horizon, w, 3);
  }
  // ombre au bord du sol + vignette
  const sh = g.createLinearGradient(0, horizon, 0, horizon + 30); sh.addColorStop(0, 'rgba(0,0,0,0.45)'); sh.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = sh; g.fillRect(0, horizon, w, 30);
  const vg = g.createRadialGradient(cx, cy, R, cx, cy, Math.max(w, h) * 0.8); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.55)');
  g.fillStyle = vg; g.fillRect(0, 0, w, h);
  return c;
}
