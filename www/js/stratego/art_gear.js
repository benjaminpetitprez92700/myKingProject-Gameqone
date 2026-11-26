// Dessins du matériel de Guerre Éclair : mines, bombes, bombes volantes, D.C.A., auto-citerne,
// barrage magnétique, bombardier et plan secret. Style « France 1914 » (parchemin, contours noirs)
// ou « moderne » (ciel, aplats).

const INK = '#1d1a16';
export const GEAR = ['mine', 'bomberet', 'v1', 'dca', 'citerne', 'barrage', 'bombardier', 'plan'];

export function paintGear(g, id, S, army, france) {
  const u = S / 100, L = (x) => x * u;
  const ink = (w = 1.6) => { if (!france) return; g.strokeStyle = INK; g.lineWidth = L(w); g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  const fill = (col, w) => { g.fillStyle = col; g.fill(); ink(w); };
  // fond
  if (france) {
    const bg = g.createRadialGradient(L(50), L(40), L(10), L(50), L(50), L(75));
    bg.addColorStop(0, '#f7ecd0'); bg.addColorStop(1, '#dcc38f'); g.fillStyle = bg; g.fillRect(0, 0, S, S);
    g.strokeStyle = 'rgba(120,80,30,0.35)'; g.lineWidth = L(1); g.strokeRect(L(4), L(4), L(92), L(92));
  } else {
    const bg = g.createLinearGradient(0, 0, 0, S); bg.addColorStop(0, '#cfe3f0'); bg.addColorStop(1, '#e9dfc2');
    g.fillStyle = bg; g.fillRect(0, 0, S, S);
  }
  const ground = () => { g.fillStyle = france ? '#a9b46a' : '#6f8f3e'; g.fillRect(0, L(80), S, L(20)); };

  switch (id) {
    case 'mine': {
      ground();
      g.beginPath(); g.ellipse(L(50), L(78), L(36), L(11), 0, 0, Math.PI * 2); fill('#4b5a2e');
      g.beginPath(); g.rect(L(14), L(62), L(72), L(16)); fill('#5d6e38');
      g.beginPath(); g.ellipse(L(50), L(62), L(36), L(11), 0, 0, Math.PI * 2); fill('#6f8442');
      g.beginPath(); g.ellipse(L(50), L(60), L(13), L(5), 0, 0, Math.PI * 2); fill('#3a4422', 1.2);
      g.beginPath(); g.ellipse(L(50), L(57), L(6), L(2.5), 0, 0, Math.PI * 2); fill('#9aa36a', 1);
      g.fillStyle = '#c8202a'; g.font = `900 ${L(16)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText('⚠', L(50), L(30));
      break;
    }
    case 'bomberet': {
      g.beginPath(); g.arc(L(46), L(58), L(28), 0, Math.PI * 2); fill('#2a2d33');
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(L(36), L(46), L(7), L(4), -0.6, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.rect(L(40), L(24), L(12), L(8)); fill('#555a62', 1.2);
      // réveil
      g.beginPath(); g.arc(L(70), L(32), L(17), 0, Math.PI * 2); fill('#f2efe6');
      g.strokeStyle = INK; g.lineWidth = L(2.2); g.beginPath(); g.moveTo(L(70), L(32)); g.lineTo(L(70), L(21)); g.moveTo(L(70), L(32)); g.lineTo(L(78), L(36)); g.stroke();
      for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.fillStyle = INK; g.fillRect(L(70 + Math.cos(a) * 14) - L(0.8), L(32 + Math.sin(a) * 14) - L(0.8), L(1.6), L(1.6)); }
      g.beginPath(); g.arc(L(58), L(16), L(5), 0, Math.PI * 2); g.arc(L(82), L(16), L(5), 0, Math.PI * 2); fill('#c9a043', 1);
      g.strokeStyle = '#c8202a'; g.lineWidth = L(2); g.beginPath(); g.moveTo(L(52), L(36)); g.quadraticCurveTo(L(56), L(44), L(50), L(46)); g.stroke();
      break;
    }
    case 'v1': {
      // traînée
      g.fillStyle = 'rgba(255,170,40,0.8)'; g.beginPath(); g.moveTo(L(10), L(56)); g.lineTo(L(26), L(50)); g.lineTo(L(26), L(62)); g.closePath(); g.fill();
      g.fillStyle = 'rgba(160,160,160,0.5)'; g.beginPath(); g.ellipse(L(10), L(56), L(9), L(5), 0, 0, Math.PI * 2); g.fill();
      // fuselage
      g.beginPath(); g.moveTo(L(24), L(50)); g.lineTo(L(74), L(48)); g.quadraticCurveTo(L(94), L(56), L(74), L(64)); g.lineTo(L(24), L(62)); g.closePath(); fill('#8a9178');
      // ailes
      g.beginPath(); g.moveTo(L(48), L(56)); g.lineTo(L(40), L(84)); g.lineTo(L(50), L(84)); g.lineTo(L(60), L(56)); g.closePath(); fill('#6d7360', 1.2);
      // tuyère au-dessus
      g.beginPath(); g.moveTo(L(20), L(38)); g.lineTo(L(50), L(40)); g.lineTo(L(50), L(48)); g.lineTo(L(20), L(46)); g.closePath(); fill('#4b4f44', 1.2);
      g.beginPath(); g.moveTo(L(22), L(50)); g.lineTo(L(16), L(40)); g.lineTo(L(26), L(40)); g.closePath(); fill('#6d7360', 1);
      g.fillStyle = army.main; g.fillRect(L(56), L(51), L(10), L(10));
      break;
    }
    case 'dca': {
      ground();
      // affût
      g.beginPath(); g.moveTo(L(22), L(84)); g.lineTo(L(78), L(84)); g.lineTo(L(66), L(64)); g.lineTo(L(34), L(64)); g.closePath(); fill('#5d6e38');
      g.beginPath(); g.arc(L(50), L(62), L(12), Math.PI, 0); fill('#4b5a2e');
      // double canon pointé vers le ciel
      g.save(); g.translate(L(50), L(58)); g.rotate(-0.75);
      g.beginPath(); g.rect(0, -L(6), L(52), L(4.5)); fill('#2f3326', 1.2);
      g.beginPath(); g.rect(0, L(1.5), L(52), L(4.5)); fill('#2f3326', 1.2);
      g.restore();
      // bouclier
      g.beginPath(); g.rect(L(38), L(50), L(24), L(14)); fill(army.main, 1.2);
      // éclats dans le ciel
      for (const [x, y] of [[80, 16], [64, 10], [88, 32]]) { g.fillStyle = '#5a5a5a'; g.beginPath(); g.arc(L(x), L(y), L(4), 0, Math.PI * 2); g.fill(); g.fillStyle = '#ffb703'; g.beginPath(); g.arc(L(x), L(y), L(1.8), 0, Math.PI * 2); g.fill(); }
      break;
    }
    case 'citerne': {
      ground();
      g.beginPath(); g.roundRect(L(10), L(42), L(56), L(28), L(12)); fill(army.main);
      g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(L(16), L(46), L(44), L(5));
      g.beginPath(); g.moveTo(L(66), L(70)); g.lineTo(L(66), L(46)); g.lineTo(L(80), L(46)); g.lineTo(L(92), L(58)); g.lineTo(L(92), L(70)); g.closePath(); fill('#5d6e38');
      g.beginPath(); g.moveTo(L(72), L(50)); g.lineTo(L(80), L(50)); g.lineTo(L(87), L(58)); g.lineTo(L(72), L(58)); g.closePath(); fill('#bfe0f2', 1);
      for (const x of [24, 52, 80]) { g.beginPath(); g.arc(L(x), L(74), L(8), 0, Math.PI * 2); fill('#1b1b1b'); g.beginPath(); g.arc(L(x), L(74), L(3), 0, Math.PI * 2); fill('#9a9a9a', 1); }
      g.fillStyle = '#fff'; g.font = `900 ${L(12)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⛽', L(38), L(58));
      break;
    }
    case 'barrage': {
      // aimant en fer à cheval et lignes de champ
      g.strokeStyle = 'rgba(60,110,200,0.55)'; g.lineWidth = L(1.6);
      for (let k = 1; k <= 3; k++) { g.beginPath(); g.arc(L(50), L(70), L(26 + k * 7), Math.PI * 1.05, Math.PI * 1.95); g.stroke(); }
      g.beginPath(); g.moveTo(L(24), L(80)); g.lineTo(L(24), L(48)); g.arc(L(50), L(48), L(26), Math.PI, 0); g.lineTo(L(76), L(80)); g.lineTo(L(62), L(80)); g.lineTo(L(62), L(48)); g.arc(L(50), L(48), L(12), 0, Math.PI, true); g.lineTo(L(38), L(80)); g.closePath(); fill('#c8202a');
      g.beginPath(); g.rect(L(24), L(80), L(14), L(10)); fill('#d9d9de', 1.2);
      g.beginPath(); g.rect(L(62), L(80), L(14), L(10)); fill('#d9d9de', 1.2);
      g.fillStyle = '#ffd34d'; g.font = `900 ${L(16)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('⚡', L(50), L(24));
      break;
    }
    case 'bombardier': {
      // avion bimoteur vu de dessus
      g.save(); g.translate(L(50), L(52)); g.rotate(-0.5);
      g.beginPath(); g.ellipse(0, 0, L(8), L(38), 0, 0, Math.PI * 2); fill('#6d7360');
      g.beginPath(); g.moveTo(-L(44), -L(2)); g.lineTo(L(44), -L(2)); g.lineTo(L(40), L(8)); g.lineTo(-L(40), L(8)); g.closePath(); fill('#7d846f');
      g.beginPath(); g.moveTo(-L(16), L(30)); g.lineTo(L(16), L(30)); g.lineTo(L(14), L(36)); g.lineTo(-L(14), L(36)); g.closePath(); fill('#7d846f', 1.2);
      for (const x of [-20, 20]) { g.beginPath(); g.ellipse(L(x), -L(4), L(4), L(10), 0, 0, Math.PI * 2); fill('#3a3d33', 1.2); }
      g.beginPath(); g.ellipse(0, -L(28), L(5), L(6), 0, 0, Math.PI * 2); fill('#bfe0f2', 1);
      for (const x of [-32, 32]) { g.beginPath(); g.arc(L(x), L(3), L(4.5), 0, Math.PI * 2); g.fillStyle = '#1f3f99'; g.fill(); g.beginPath(); g.arc(L(x), L(3), L(3), 0, Math.PI * 2); g.fillStyle = '#fff'; g.fill(); g.beginPath(); g.arc(L(x), L(3), L(1.5), 0, Math.PI * 2); g.fillStyle = army.main; g.fill(); }
      g.restore();
      break;
    }
    case 'plan': {
      g.save(); g.translate(L(50), L(52)); g.rotate(-0.08);
      g.beginPath(); g.rect(-L(36), -L(30), L(72), L(58)); fill('#2c5a9a');
      g.strokeStyle = 'rgba(255,255,255,0.6)'; g.lineWidth = L(1);
      for (let k = -24; k <= 22; k += 8) { g.beginPath(); g.moveTo(-L(32), L(k)); g.lineTo(L(32), L(k)); g.stroke(); }
      g.strokeStyle = '#fff'; g.lineWidth = L(1.8);
      g.beginPath(); g.moveTo(-L(26), L(14)); g.lineTo(-L(8), -L(8)); g.lineTo(L(8), L(4)); g.lineTo(L(24), -L(18)); g.stroke();
      g.beginPath(); g.moveTo(L(18), -L(20)); g.lineTo(L(24), -L(18)); g.lineTo(L(22), -L(12)); g.stroke();
      g.restore();
      g.save(); g.translate(L(52), L(70)); g.rotate(-0.25);
      g.strokeStyle = '#c8202a'; g.lineWidth = L(2.4); g.strokeRect(-L(26), -L(8), L(52), L(16));
      g.fillStyle = '#c8202a'; g.font = `900 ${L(12)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SECRET', 0, L(1));
      g.restore();
      break;
    }
  }
}

// petit parachute sur l'épaule du parachutiste
export function paintParachute(g, S) {
  const u = S / 100, L = (x) => x * u;
  g.save(); g.globalAlpha = 0.95;
  g.beginPath(); g.moveTo(L(64), L(24)); g.quadraticCurveTo(L(80), L(2), L(96), L(24)); g.closePath();
  g.fillStyle = '#f2efe6'; g.fill(); g.strokeStyle = INK; g.lineWidth = L(1.2); g.stroke();
  g.beginPath(); g.moveTo(L(72), L(24)); g.quadraticCurveTo(L(80), L(10), L(88), L(24)); g.fillStyle = '#c8202a'; g.fill();
  g.beginPath(); g.moveTo(L(64), L(24)); g.lineTo(L(80), L(40)); g.lineTo(L(96), L(24)); g.moveTo(L(80), L(24)); g.lineTo(L(80), L(40)); g.stroke();
  g.restore();
}
