// Portraits illustrés des pièces de Guerre Éclair : un personnage par grade, aux couleurs de son armée.

import { paintFrance } from './art_fr.js';

const SKIN = ['#f2c9a0', '#e0ac7e', '#c68c5b', '#8d5a3b', '#f5d3b5'];
const cache = new Map();

function shade(hex, a) {
  const n = parseInt(hex.slice(1), 16), f = (v) => Math.max(0, Math.min(255, Math.round(v + a * 255)));
  return `rgb(${f(n >> 16)},${f((n >> 8) & 255)},${f(n & 255)})`;
}
function star(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

// Dessine le portrait dans un carré de côté S (coordonnées 0..S)
function paint(g, id, S, army) {
  const u = S / 100, gold = '#f2c14e', goldD = '#a87a12';
  const L = (x) => x * u;
  // fond : ciel / terrain
  const bg = g.createLinearGradient(0, 0, 0, S);
  bg.addColorStop(0, id === 'espion' ? '#3a3f55' : '#cfe3f0'); bg.addColorStop(1, id === 'espion' ? '#1c1f2e' : '#e9dfc2');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);

  if (id === 'bombe') {
    g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(L(50), L(86), L(30), L(7), 0, 0, Math.PI * 2); g.fill();
    const gr = g.createRadialGradient(L(40), L(48), L(4), L(50), L(58), L(32));
    gr.addColorStop(0, '#6b6f78'); gr.addColorStop(1, '#14161b');
    g.fillStyle = gr; g.beginPath(); g.arc(L(50), L(58), L(28), 0, Math.PI * 2); g.fill();
    g.fillStyle = '#3b3f47'; g.fillRect(L(42), L(24), L(16), L(10));
    g.strokeStyle = '#8b6a3e'; g.lineWidth = L(3); g.beginPath(); g.moveTo(L(50), L(24)); g.bezierCurveTo(L(52), L(12), L(64), L(16), L(68), L(8)); g.stroke();
    star(g, L(70), L(8), L(8), '#ffb703'); star(g, L(70), L(8), L(4), '#fff3b0');
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.beginPath(); g.ellipse(L(40), L(46), L(8), L(5), -0.6, 0, Math.PI * 2); g.fill();
    g.fillStyle = army.main; g.font = `900 ${L(16)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('TNT', L(50), L(62));
    return;
  }
  if (id === 'drapeau') {
    g.fillStyle = '#5b4a33'; g.fillRect(L(26), L(10), L(5), L(80));
    g.fillStyle = gold; g.beginPath(); g.arc(L(28.5), L(10), L(4), 0, Math.PI * 2); g.fill();
    g.fillStyle = army.main;
    g.beginPath(); g.moveTo(L(31), L(14));
    g.bezierCurveTo(L(50), L(8), L(62), L(22), L(84), L(16)); g.lineTo(L(84), L(52));
    g.bezierCurveTo(L(62), L(58), L(50), L(44), L(31), L(50)); g.closePath(); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.18)'; g.beginPath(); g.moveTo(L(31), L(14)); g.bezierCurveTo(L(50), L(8), L(62), L(22), L(84), L(16)); g.lineTo(L(84), L(26)); g.bezierCurveTo(L(62), L(32), L(50), L(18), L(31), L(24)); g.fill();
    star(g, L(57), L(33), L(10), gold);
    g.fillStyle = '#6f8f3e'; g.fillRect(0, L(88), S, L(12));
    return;
  }

  const skin = SKIN[(id.length * 7 + (army.side || 0) * 3) % SKIN.length];
  const officer = ['marechal', 'general', 'colonel', 'commandant', 'capitaine', 'lieutenant'].includes(id);
  const uni = id === 'espion' ? '#b9a27a' : army.main, uniD = id === 'espion' ? '#8a7650' : army.dark;

  // buste / uniforme
  g.fillStyle = uniD;
  g.beginPath(); g.moveTo(L(8), S); g.quadraticCurveTo(L(12), L(70), L(32), L(66)); g.lineTo(L(68), L(66)); g.quadraticCurveTo(L(88), L(70), L(92), S); g.closePath(); g.fill();
  g.fillStyle = uni;
  g.beginPath(); g.moveTo(L(14), S); g.quadraticCurveTo(L(16), L(74), L(34), L(70)); g.lineTo(L(66), L(70)); g.quadraticCurveTo(L(84), L(74), L(86), S); g.closePath(); g.fill();
  // col
  g.fillStyle = id === 'espion' ? '#d9c79c' : shade(uni, 0.12);
  g.beginPath(); g.moveTo(L(36), L(68)); g.lineTo(L(50), L(84)); g.lineTo(L(64), L(68)); g.lineTo(L(58), L(66)); g.lineTo(L(50), L(76)); g.lineTo(L(42), L(66)); g.closePath(); g.fill();
  if (id === 'espion') { g.fillStyle = '#222'; g.beginPath(); g.moveTo(L(46), L(74)); g.lineTo(L(54), L(74)); g.lineTo(L(52), L(100)); g.lineTo(L(48), L(100)); g.fill(); }
  // épaulettes et décorations
  if (officer) {
    g.fillStyle = gold;
    g.beginPath(); g.ellipse(L(22), L(74), L(10), L(4), -0.25, 0, Math.PI * 2); g.ellipse(L(78), L(74), L(10), L(4), 0.25, 0, Math.PI * 2); g.fill();
    for (let k = 0; k < 5; k++) { g.fillStyle = goldD; g.fillRect(L(14 + k * 3.5), L(76), L(1.5), L(5)); g.fillRect(L(72 + k * 3.5), L(76), L(1.5), L(5)); }
  }
  if (id === 'marechal' || id === 'general') {
    for (let k = 0; k < (id === 'marechal' ? 4 : 3); k++) { g.fillStyle = ['#e63946', '#3a86ff', '#ffd166', '#06d6a0'][k]; g.fillRect(L(64 + k * 5), L(84), L(4), L(5)); star(g, L(66 + k * 5), L(93), L(2.6), gold); }
  }
  if (id === 'sergent' || id === 'demineur' || id === 'eclaireur') {
    g.strokeStyle = gold; g.lineWidth = L(2.2);
    for (let k = 0; k < (id === 'sergent' ? 3 : 1); k++) { g.beginPath(); g.moveTo(L(16), L(84 + k * 4)); g.lineTo(L(22), L(80 + k * 4)); g.lineTo(L(28), L(84 + k * 4)); g.stroke(); }
  }
  // cou + tête
  g.fillStyle = shade(skin, -0.08); g.fillRect(L(43), L(56), L(14), L(14));
  g.fillStyle = skin; g.beginPath(); g.ellipse(L(50), L(44), L(17), L(20), 0, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(L(33), L(46), L(3.5), L(5), 0, 0, Math.PI * 2); g.ellipse(L(67), L(46), L(3.5), L(5), 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = shade(skin, -0.12); g.beginPath(); g.ellipse(L(50), L(58), L(10), L(4), 0, 0, Math.PI); g.fill();
  // yeux / visage
  if (id === 'espion') {
    g.fillStyle = '#111'; g.beginPath(); g.roundRect(L(36), L(40), L(12), L(7), L(2)); g.roundRect(L(52), L(40), L(12), L(7), L(2)); g.fill(); g.fillRect(L(47), L(42), L(6), L(2));
    g.fillStyle = 'rgba(255,255,255,0.45)'; g.fillRect(L(38), L(41), L(4), L(2)); g.fillRect(L(54), L(41), L(4), L(2));
  } else if (id === 'eclaireur') {
    g.fillStyle = '#2b2f36';
    g.beginPath(); g.roundRect(L(34), L(37), L(14), L(12), L(3)); g.roundRect(L(52), L(37), L(14), L(12), L(3)); g.fill(); g.fillRect(L(47), L(40), L(6), L(5));
    g.fillStyle = '#7fb3ff'; g.beginPath(); g.arc(L(41), L(43), L(4), 0, Math.PI * 2); g.arc(L(59), L(43), L(4), 0, Math.PI * 2); g.fill();
    g.fillStyle = skin; g.fillRect(L(28), L(52), L(8), L(16)); g.fillRect(L(64), L(52), L(8), L(16));
  } else {
    g.fillStyle = '#fff'; g.beginPath(); g.ellipse(L(43), L(43), L(3.6), L(2.6), 0, 0, Math.PI * 2); g.ellipse(L(57), L(43), L(3.6), L(2.6), 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#2a1d12'; g.beginPath(); g.arc(L(43.5), L(43.3), L(1.7), 0, Math.PI * 2); g.arc(L(57.5), L(43.3), L(1.7), 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#3a2a1a'; g.lineWidth = L(1.6);
    const frown = officer ? 1.5 : 0;
    g.beginPath(); g.moveTo(L(38), L(38 + frown)); g.lineTo(L(47), L(38)); g.moveTo(L(53), L(38)); g.lineTo(L(62), L(38 + frown)); g.stroke();
  }
  g.strokeStyle = shade(skin, -0.3); g.lineWidth = L(1.4); g.beginPath(); g.moveTo(L(50), L(44)); g.lineTo(L(48), L(51)); g.lineTo(L(51), L(51)); g.stroke();
  if (['marechal', 'general', 'commandant'].includes(id)) {
    g.fillStyle = id === 'marechal' ? '#d9d9d9' : '#4a3020';
    g.beginPath(); g.moveTo(L(40), L(55)); g.quadraticCurveTo(L(50), L(50), L(60), L(55)); g.quadraticCurveTo(L(50), L(54), L(40), L(55)); g.fill();
  } else { g.strokeStyle = '#8a4a3a'; g.lineWidth = L(1.6); g.beginPath(); g.moveTo(L(45), L(56)); g.quadraticCurveTo(L(50), L(id === 'espion' ? 57 : 58), L(55), L(56)); g.stroke(); }

  // couvre-chef
  if (officer) {
    // képi
    g.fillStyle = uniD; g.beginPath(); g.moveTo(L(31), L(34)); g.lineTo(L(34), L(10)); g.quadraticCurveTo(L(50), L(4), L(66), L(10)); g.lineTo(L(69), L(34)); g.closePath(); g.fill();
    g.fillStyle = '#16181d'; g.beginPath(); g.ellipse(L(50), L(34), L(22), L(4.5), 0, 0, Math.PI); g.fill();
    const stripes = { marechal: 7, general: 0, colonel: 5, commandant: 4, capitaine: 3, lieutenant: 2 }[id];
    g.fillStyle = gold;
    if (id === 'marechal' || id === 'general') {
      g.fillRect(L(32), L(26), L(36), L(6));
      for (let k = 0; k < 3; k++) g.beginPath(), g.ellipse(L(38 + k * 12), L(20), L(4), L(2), 0.6, 0, Math.PI * 2), g.fill();
      const n = id === 'marechal' ? 7 : 3; for (let k = 0; k < Math.min(n, 3); k++) star(g, L(40 + k * 10), L(14), L(3.4), gold);
    } else for (let k = 0; k < stripes; k++) g.fillRect(L(33), L(30 - k * 3.6), L(34), L(1.8));
    g.fillStyle = gold; g.beginPath(); g.arc(L(50), L(31), L(2.2), 0, Math.PI * 2); g.fill();
  } else if (id === 'espion') {
    g.fillStyle = '#2b2b30'; g.beginPath(); g.ellipse(L(50), L(30), L(30), L(6), 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.moveTo(L(34), L(30)); g.lineTo(L(37), L(12)); g.quadraticCurveTo(L(50), L(6), L(63), L(12)); g.lineTo(L(66), L(30)); g.fill();
    g.fillStyle = '#8b1d2c'; g.fillRect(L(35), L(24), L(30), L(4));
  } else {
    // casque de combat
    const hg = g.createLinearGradient(0, L(10), 0, L(36)); hg.addColorStop(0, shade('#5c6b3c', 0.12)); hg.addColorStop(1, '#3d4826');
    g.fillStyle = hg; g.beginPath(); g.ellipse(L(50), L(32), L(25), L(6), 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.arc(L(50), L(31), L(20), Math.PI, 0); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.ellipse(L(42), L(20), L(7), L(4), -0.5, 0, Math.PI * 2); g.fill();
    g.fillStyle = army.main; g.fillRect(L(30), L(27), L(40), L(3));
    if (id === 'demineur') {
      // détecteur de mines sur l'épaule
      g.strokeStyle = '#2b2f36'; g.lineWidth = L(3); g.beginPath(); g.moveTo(L(70), L(98)); g.lineTo(L(90), L(58)); g.stroke();
      g.fillStyle = '#f2c14e'; g.beginPath(); g.ellipse(L(90), L(56), L(8), L(4), -1.1, 0, Math.PI * 2); g.fill();
      g.strokeStyle = '#111'; g.lineWidth = L(1.5); g.stroke();
    }
  }
  // grade-specific prop: bâton du maréchal
  if (id === 'marechal') { g.fillStyle = '#1f3a8a'; g.save(); g.translate(L(24), L(92)); g.rotate(-0.7); g.fillRect(-L(2.5), -L(14), L(5), L(26)); for (let k = 0; k < 3; k++) star(g, 0, -L(9) + k * L(7), L(1.8), gold); g.restore(); }
}

// Portrait en cache (par grade, armée et taille en pixels)
export function portrait(id, army, px) {
  const key = `${id}|${army.main}|${army.style || ''}|${px}`;
  if (cache.has(key)) return cache.get(key);
  const c = document.createElement('canvas'); c.width = c.height = px;
  (army.style === 'france' ? paintFrance : paint)(c.getContext('2d'), id, px, army);
  cache.set(key, c);
  return c;
}
