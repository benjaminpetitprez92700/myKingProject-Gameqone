// Set « France 1914 » : portraits façon image d'Épinal (aplats, contours noirs, fond parchemin).
// Camp bleu : tenue bleu horizon (1915). Camp rouge : capote bleu de roi et képi garance (1914).

const INK = '#1d1a16', GOLD = '#e0b13a', GOLD_D = '#8f6a12';
const GARANCE = '#b8222a', GARANCE_D = '#7c1218';

function star(g, x, y, r, col) {
  g.fillStyle = col; g.beginPath();
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fill();
}

export function paintFrance(g, id, S, army) {
  const u = S / 100, L = (x) => x * u;
  const blue = (army.side ?? 1) === 1;
  const coat = blue ? '#7f9cc0' : '#2f3f6e', coatD = blue ? '#5c7aa0' : '#1d2a4e';
  const ink = (w = 1.6) => { g.strokeStyle = INK; g.lineWidth = L(w); g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); };
  const fillInk = (col, w) => { g.fillStyle = col; g.fill(); ink(w); };

  // fond parchemin + liseré
  const bg = g.createRadialGradient(L(50), L(40), L(10), L(50), L(50), L(75));
  bg.addColorStop(0, '#f7ecd0'); bg.addColorStop(1, '#dcc38f');
  g.fillStyle = bg; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(120,80,30,0.35)'; g.lineWidth = L(1); g.strokeRect(L(4), L(4), L(92), L(92));
  // rayons « soleil » derrière le personnage
  g.save(); g.globalAlpha = 0.12; g.fillStyle = army.main;
  for (let k = 0; k < 12; k++) { const a = (k / 12) * Math.PI * 2; g.beginPath(); g.moveTo(L(50), L(42)); g.arc(L(50), L(42), L(70), a, a + 0.18); g.closePath(); g.fill(); }
  g.restore();

  if (id === 'bombe') {
    // obus de 75
    g.fillStyle = 'rgba(0,0,0,0.18)'; g.beginPath(); g.ellipse(L(50), L(90), L(22), L(5), 0, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.roundRect(L(36), L(56), L(28), L(34), L(2)); fillInk('#c9a043');
    g.fillStyle = 'rgba(255,255,255,0.3)'; g.fillRect(L(39), L(58), L(4), L(30));
    g.beginPath(); g.moveTo(L(36), L(56)); g.lineTo(L(36), L(40)); g.quadraticCurveTo(L(38), L(14), L(50), L(8)); g.quadraticCurveTo(L(62), L(14), L(64), L(40)); g.lineTo(L(64), L(56)); g.closePath(); fillInk('#6f7a74');
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.ellipse(L(43), L(34), L(3), L(14), 0.1, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.rect(L(35), L(52), L(30), L(5)); fillInk('#b0642e', 1.2);
    g.beginPath(); g.rect(L(46), L(4), L(8), L(6)); fillInk('#c9a043', 1.2);
    g.fillStyle = INK; g.font = `900 ${L(13)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('75', L(50), L(73));
    return;
  }
  if (id === 'drapeau') {
    g.beginPath(); g.rect(L(22), L(12), L(4), L(82)); fillInk('#6b4a2a', 1.2);
    g.beginPath(); g.moveTo(L(24), L(2)); g.lineTo(L(28), L(11)); g.lineTo(L(20), L(11)); g.closePath(); fillInk(GOLD, 1.2);
    const wave = (x0, x1, col) => {
      g.beginPath(); g.moveTo(L(x0), L(14 + (x0 - 26) * 0.08));
      g.bezierCurveTo(L(x0 + (x1 - x0) * 0.3), L(10), L(x0 + (x1 - x0) * 0.6), L(20), L(x1), L(14 + (x1 - 26) * 0.08));
      g.lineTo(L(x1), L(58 + (x1 - 26) * 0.08));
      g.bezierCurveTo(L(x0 + (x1 - x0) * 0.6), L(64), L(x0 + (x1 - x0) * 0.3), L(54), L(x0), L(58 + (x0 - 26) * 0.08));
      g.closePath(); g.fillStyle = col; g.fill();
    };
    wave(26, 46, '#1f3f99'); wave(46, 66, '#f6f2e6'); wave(66, 88, '#c8202a');
    g.beginPath(); g.moveTo(L(26), L(14)); g.bezierCurveTo(L(45), L(8), L(65), L(22), L(88), L(19)); g.lineTo(L(88), L(63)); g.bezierCurveTo(L(65), L(66), L(45), L(52), L(26), L(58)); g.closePath(); ink();
    g.fillStyle = GOLD_D; g.font = `900 ${L(12)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RF', L(56), L(37));
    // cravate aux couleurs de l'armée
    g.beginPath(); g.moveTo(L(26), L(12)); g.quadraticCurveTo(L(36), L(26), L(32), L(40)); g.lineTo(L(36), L(42)); g.quadraticCurveTo(L(40), L(24), L(27), L(10)); fillInk(army.main, 1);
    g.fillStyle = '#6f8f3e'; g.fillRect(0, L(90), S, L(10));
    return;
  }

  const skin = ['#f3c9a4', '#eab892', '#f6d2b4'][(id.length + (army.side || 0)) % 3];
  const officer = ['marechal', 'general', 'colonel', 'commandant', 'capitaine', 'lieutenant'].includes(id);
  const spy = id === 'espion';

  // capote / buste
  g.beginPath(); g.moveTo(L(8), L(101)); g.quadraticCurveTo(L(10), L(72), L(32), L(66)); g.lineTo(L(68), L(66)); g.quadraticCurveTo(L(90), L(72), L(92), L(101)); g.closePath();
  fillInk(spy ? '#c8b083' : coat);
  // revers / col
  g.beginPath(); g.moveTo(L(36), L(66)); g.lineTo(L(50), L(88)); g.lineTo(L(64), L(66)); g.closePath(); fillInk(spy ? '#f2efe6' : coatD, 1.2);
  if (spy) {
    g.beginPath(); g.moveTo(L(47), L(70)); g.lineTo(L(53), L(70)); g.lineTo(L(51), L(90)); g.lineTo(L(49), L(90)); g.closePath(); fillInk('#7a1420', 1);
    g.beginPath(); g.moveTo(L(32), L(66)); g.lineTo(L(46), L(98)); g.lineTo(L(38), L(100)); g.lineTo(L(24), L(70)); g.closePath(); fillInk('#b39a6c', 1.2);
    g.beginPath(); g.moveTo(L(68), L(66)); g.lineTo(L(54), L(98)); g.lineTo(L(62), L(100)); g.lineTo(L(76), L(70)); g.closePath(); fillInk('#b39a6c', 1.2);
  } else {
    // écussons de col (numéro du régiment)
    g.beginPath(); g.rect(L(30), L(68), L(8), L(6)); fillInk(blue ? '#f0c93a' : GARANCE, 1);
    g.beginPath(); g.rect(L(62), L(68), L(8), L(6)); fillInk(blue ? '#f0c93a' : GARANCE, 1);
    // double rangée de boutons
    for (let k = 0; k < 3; k++) for (const x of [40, 60]) { g.beginPath(); g.arc(L(x), L(80 + k * 7), L(2), 0, Math.PI * 2); fillInk(GOLD, 0.8); }
  }
  // épaulettes / galons de manche
  if (officer) {
    for (const x of [20, 80]) { g.beginPath(); g.ellipse(L(x), L(73), L(10), L(4), x < 50 ? -0.3 : 0.3, 0, Math.PI * 2); fillInk(GOLD, 1); }
  }
  if (id === 'marechal' || id === 'general') {
    for (let k = 0; k < (id === 'marechal' ? 7 : 3); k++) star(g, L(12 + (k % 4) * 5), L(86 + Math.floor(k / 4) * 6), L(2.4), '#e9e9ee');
    // Légion d'honneur
    g.beginPath(); g.rect(L(64), L(80), L(6), L(6)); fillInk('#c8202a', 0.8);
    star(g, L(67), L(91), L(4), '#fff'); g.beginPath(); g.arc(L(67), L(91), L(1.4), 0, Math.PI * 2); g.fillStyle = GOLD; g.fill();
  }
  if (id === 'sergent') {
    for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(L(12), L(90 + k * 4)); g.lineTo(L(24), L(84 + k * 4)); g.strokeStyle = k ? '#d9d9de' : GOLD; g.lineWidth = L(2.6); g.stroke(); }
  }

  // cou + tête
  g.beginPath(); g.rect(L(43), L(54), L(14), L(14)); fillInk(skin, 1.2);
  g.beginPath(); g.ellipse(L(50), L(44), L(16), L(19), 0, 0, Math.PI * 2); fillInk(skin);
  for (const x of [34, 66]) { g.beginPath(); g.ellipse(L(x), L(46), L(3.2), L(4.6), 0, 0, Math.PI * 2); fillInk(skin, 1.2); }
  // joues roses
  g.fillStyle = 'rgba(214,90,80,0.28)'; g.beginPath(); g.arc(L(40), L(50), L(4), 0, Math.PI * 2); g.arc(L(60), L(50), L(4), 0, Math.PI * 2); g.fill();
  // yeux
  g.fillStyle = INK; g.beginPath(); g.arc(L(43.5), L(43), L(1.8), 0, Math.PI * 2); g.arc(L(56.5), L(43), L(1.8), 0, Math.PI * 2); g.fill();
  g.strokeStyle = INK; g.lineWidth = L(1.5);
  g.beginPath(); g.moveTo(L(39), L(38.5)); g.lineTo(L(47), L(37.5)); g.moveTo(L(53), L(37.5)); g.lineTo(L(61), L(38.5)); g.stroke();
  if (spy) { g.beginPath(); g.arc(L(56.5), L(43), L(4.5), 0, Math.PI * 2); g.strokeStyle = GOLD_D; g.lineWidth = L(1.3); g.stroke(); g.beginPath(); g.moveTo(L(61), L(44)); g.quadraticCurveTo(L(66), L(56), L(62), L(66)); g.lineWidth = L(0.7); g.stroke(); }
  // nez
  g.beginPath(); g.moveTo(L(50), L(42)); g.quadraticCurveTo(L(47), L(49), L(51), L(50)); g.strokeStyle = INK; g.lineWidth = L(1.2); g.stroke();
  // moustache « bacchantes »
  const mcol = { marechal: '#eeeeea', general: '#bdbdb8', colonel: '#8a8a84', espion: '#2a1e14' }[id] || '#4a2e1a';
  const big = ['marechal', 'general', 'colonel', 'sergent', 'commandant'].includes(id);
  if (id !== 'eclaireur' && id !== 'lieutenant') {
    g.beginPath(); g.moveTo(L(50), L(52));
    g.bezierCurveTo(L(44), L(49), L(38), L(52), L(big ? 31 : 37), L(big ? 50 : 53));
    g.bezierCurveTo(L(39), L(57), L(45), L(55), L(50), L(54.5));
    g.bezierCurveTo(L(55), L(55), L(61), L(57), L(big ? 69 : 63), L(big ? 50 : 53));
    g.bezierCurveTo(L(62), L(52), L(56), L(49), L(50), L(52)); g.closePath(); fillInk(mcol, 1);
  }
  g.beginPath(); g.moveTo(L(46), L(58)); g.quadraticCurveTo(L(50), L(59.5), L(54), L(58)); g.strokeStyle = '#8a3a30'; g.lineWidth = L(1.3); g.stroke();
  if (id === 'marechal') { g.beginPath(); g.moveTo(L(46), L(60)); g.quadraticCurveTo(L(50), L(68), L(54), L(60)); fillInk('#eeeeea', 1); }

  // couvre-chefs
  if (officer) {
    const gen = id === 'marechal' || id === 'general';
    // calot (dessus) garance, bandeau bleu foncé (ou noir à feuilles de chêne pour les généraux)
    g.beginPath(); g.moveTo(L(33), L(28)); g.lineTo(L(35), L(8)); g.quadraticCurveTo(L(50), L(3), L(65), L(8)); g.lineTo(L(67), L(28)); g.closePath(); fillInk(blue && !gen ? '#7f9cc0' : GARANCE);
    g.fillStyle = 'rgba(0,0,0,0.12)'; g.fillRect(L(56), L(7), L(9), L(21));
    g.beginPath(); g.rect(L(32.5), L(22), L(35), L(10)); fillInk(gen ? '#1a1a1e' : '#1f2a55', 1.4);
    if (gen) {
      for (let k = 0; k < 5; k++) { g.save(); g.translate(L(36 + k * 7), L(27)); g.rotate(k % 2 ? 0.5 : -0.5); g.beginPath(); g.ellipse(0, 0, L(3.2), L(1.6), 0, 0, Math.PI * 2); g.fillStyle = GOLD; g.fill(); g.restore(); }
      for (let k = 0; k < (id === 'marechal' ? 5 : 3); k++) star(g, L(50 - ((id === 'marechal' ? 4 : 2) * 3.2) + k * 6.4), L(15), L(2.4), '#f1f1f4');
    } else {
      const n = { colonel: 5, commandant: 4, capitaine: 3, lieutenant: 2 }[id];
      for (let k = 0; k < n; k++) { g.fillStyle = id === 'commandant' && k % 2 ? '#e6e6ea' : GOLD; g.fillRect(L(33.5), L(30 - k * 3.4 - (k ? 6 : 0)), L(33), L(1.6)); }
      // soutache verticale
      g.fillStyle = GOLD; g.fillRect(L(49.3), L(5), L(1.4), L(17));
    }
    // visière cuir + jugulaire
    g.beginPath(); g.moveTo(L(32), L(32)); g.quadraticCurveTo(L(50), L(40), L(68), L(32)); g.lineTo(L(66), L(31)); g.quadraticCurveTo(L(50), L(36), L(34), L(31)); g.closePath(); fillInk('#121212', 1);
    g.fillStyle = GOLD; g.fillRect(L(33), L(30.5), L(34), L(1.3));
    g.beginPath(); g.arc(L(34), L(31), L(1.6), 0, Math.PI * 2); g.arc(L(66), L(31), L(1.6), 0, Math.PI * 2); g.fill();
  } else if (spy) {
    // chapeau melon
    g.beginPath(); g.ellipse(L(50), L(30), L(26), L(5.5), 0, 0, Math.PI * 2); fillInk('#26221f');
    g.beginPath(); g.moveTo(L(35), L(30)); g.quadraticCurveTo(L(34), L(8), L(50), L(8)); g.quadraticCurveTo(L(66), L(8), L(65), L(30)); g.closePath(); fillInk('#2f2a26');
    g.fillStyle = '#5a4a3a'; g.fillRect(L(35.5), L(24), L(29), L(4));
    g.fillStyle = 'rgba(255,255,255,0.15)'; g.beginPath(); g.ellipse(L(43), L(16), L(4), L(6), -0.3, 0, Math.PI * 2); g.fill();
  } else if (id === 'eclaireur') {
    // béret « tarte » des chasseurs alpins + cor de chasse
    g.beginPath(); g.ellipse(L(46), L(22), L(30), L(12), -0.12, 0, Math.PI * 2); fillInk('#1f2a55');
    g.beginPath(); g.ellipse(L(50), L(30), L(18), L(3.5), 0, 0, Math.PI * 2); fillInk('#18213f', 1.2);
    g.strokeStyle = '#f0c93a'; g.lineWidth = L(1.8); g.beginPath(); g.arc(L(30), L(22), L(4), 0.3, Math.PI * 1.7); g.stroke();
    g.beginPath(); g.moveTo(L(33.5), L(19.5)); g.lineTo(L(38), L(17)); g.stroke();
    // jumelles autour du cou
    g.strokeStyle = '#5a3a1e'; g.lineWidth = L(1.4); g.beginPath(); g.moveTo(L(40), L(66)); g.lineTo(L(46), L(82)); g.moveTo(L(60), L(66)); g.lineTo(L(54), L(82)); g.stroke();
    for (const x of [45, 55]) { g.beginPath(); g.roundRect(L(x - 4), L(80), L(8), L(12), L(2)); fillInk('#2b2b2b', 1); }
  } else {
    // casque Adrian (bleu horizon) : bombe, cimier, bord
    const hc = blue ? '#6d88ad' : '#596470', hcD = blue ? '#4d6788' : '#3e4650';
    g.beginPath(); g.ellipse(L(50), L(32), L(28), L(5.5), 0, 0, Math.PI * 2); fillInk(hcD);
    g.beginPath(); g.moveTo(L(31), L(31)); g.quadraticCurveTo(L(30), L(8), L(50), L(8)); g.quadraticCurveTo(L(70), L(8), L(69), L(31)); g.closePath(); fillInk(hc);
    g.beginPath(); g.moveTo(L(42), L(9)); g.quadraticCurveTo(L(50), L(1), L(58), L(9)); g.lineTo(L(56), L(11)); g.quadraticCurveTo(L(50), L(5), L(44), L(11)); g.closePath(); fillInk(hc, 1.2);
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.beginPath(); g.ellipse(L(41), L(17), L(5), L(3), -0.5, 0, Math.PI * 2); g.fill();
    // insigne grenade « RF »
    g.beginPath(); g.arc(L(50), L(24), L(4), 0, Math.PI * 2); fillInk(GOLD, 1);
    g.beginPath(); g.moveTo(L(47), L(21)); g.quadraticCurveTo(L(50), L(12), L(53), L(21)); g.closePath(); fillInk(GOLD, 1);
    g.fillStyle = INK; g.font = `900 ${L(4)}px Georgia, serif`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('RF', L(50), L(24.5));
    if (id === 'demineur') {
      // sapeur : pioche sur l'épaule
      g.save(); g.translate(L(78), L(74)); g.rotate(-0.5);
      g.beginPath(); g.rect(-L(2), -L(30), L(4), L(44)); fillInk('#8a5a2e', 1.2);
      g.beginPath(); g.moveTo(-L(16), -L(28)); g.quadraticCurveTo(0, -L(36), L(16), -L(28)); g.lineTo(L(16), -L(25)); g.quadraticCurveTo(0, -L(31), -L(16), -L(25)); g.closePath(); fillInk('#8d949a', 1.2);
      g.restore();
    }
  }
  if (id === 'marechal') {
    // bâton de maréchal bleu étoilé
    g.save(); g.translate(L(22), L(90)); g.rotate(-0.6);
    g.beginPath(); g.roundRect(-L(3), -L(16), L(6), L(30), L(2)); fillInk('#1f3f99', 1.2);
    for (let k = 0; k < 3; k++) star(g, 0, -L(10) + k * L(8), L(2), GOLD);
    g.restore();
  }
}
