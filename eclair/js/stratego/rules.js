// Guerre Éclair : règles du grand jeu de stratégie militaire (vignettes cachées).
// Deux règlements : « complet » (48 vignettes sur 4 rangées, 12 colonnes, aviation et défense
// anti-aérienne) et « facile » pour les jeunes (36 vignettes sur 3 rangées).
// Plateau en damier : les cases noires sont exposées aux bombardiers, les blanches sont à l'abri.
// Au centre, des croix interdites laissent 6 couloirs de passage.

export const W = 12;
export const CROSS_COLS = [1, 2, 5, 6, 9, 10];
export const CORRIDORS = [0, 3, 4, 7, 8, 11];

// kind : 'fight' (combattant gradé), 'spy', 'obj' (drapeau, plan), 'mine', 'tbomb', 'gear' (matériel)
export const PIECES = [
  { id: 'corpsfranc', r: 1, name: 'Corps franc', short: 'C.F.', kind: 'fight', n: 5, e: 5 },
  { id: 'sapeur', r: 2, name: 'Sapeur', short: 'Sap', kind: 'fight', n: 5, e: 5 },
  { id: 'parachutiste', r: 3, name: 'Parachutiste', short: 'Para', kind: 'fight', n: 4, e: 4 },
  { id: 'caporal', r: 4, name: 'Caporal', short: 'Cal', kind: 'fight', n: 1, e: 1 },
  { id: 'sergent', r: 5, name: 'Sergent', short: 'Sgt', kind: 'fight', n: 1, e: 1 },
  { id: 'adjudant', r: 6, name: 'Adjudant', short: 'Adj', kind: 'fight', n: 1, e: 1 },
  { id: 'adjudantchef', r: 7, name: 'Adjudant-chef', short: 'Adc', kind: 'fight', n: 1, e: 1 },
  { id: 'souslieutenant', r: 8, name: 'Sous-lieutenant', short: 'S/Lt', kind: 'fight', n: 1, e: 1 },
  { id: 'lieutenant', r: 9, name: 'Lieutenant', short: 'Lt', kind: 'fight', n: 1, e: 1 },
  { id: 'capitaine', r: 10, name: 'Capitaine', short: 'Cne', kind: 'fight', n: 1, e: 1 },
  { id: 'commandant', r: 11, name: 'Commandant', short: 'Cdt', kind: 'fight', n: 1, e: 1 },
  { id: 'ltcolonel', r: 12, name: 'Lieutenant-colonel', short: 'L/Col', kind: 'fight', n: 1, e: 1 },
  { id: 'colonel', r: 13, name: 'Colonel', short: 'Col', kind: 'fight', n: 1, e: 1 },
  { id: 'general', r: 14, name: 'Général', short: 'Gén', kind: 'fight', n: 1, e: 1 },
  { id: 'drapeau', r: 15, name: 'Drapeau', short: 'Drap', kind: 'obj', n: 1, e: 1 },
  { id: 'plan', r: 16, name: 'Plan secret', short: 'Plan', kind: 'obj', n: 1, e: 1 },
  { id: 'espion', r: 17, name: 'Espion', short: 'Esp', kind: 'spy', n: 2, e: 2 },
  { id: 'mine', r: 18, name: 'Mine', short: 'Mine', kind: 'mine', n: 3, e: 3 },
  { id: 'bomberet', r: 19, name: 'Bombe à retardement', short: 'B.R.', kind: 'tbomb', n: 3, e: 3 },
  { id: 'v1', r: 20, name: 'Bombe volante', short: 'B.V.', kind: 'gear', n: 2, e: 0 },
  { id: 'dca', r: 21, name: 'D.C.A.', short: 'DCA', kind: 'gear', n: 4, e: 0 },
  { id: 'citerne', r: 22, name: 'Auto-citerne', short: 'Cit', kind: 'gear', n: 1, e: 1 },
  { id: 'barrage', r: 23, name: 'Barrage magnétique', short: 'Bar', kind: 'gear', n: 3, e: 0 },
  { id: 'bombardier', r: 24, name: 'Bombardier', short: 'Bomb', kind: 'gear', n: 3, e: 0 },
];
export const BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p]));
export const isFighter = (id) => BY_ID[id].kind === 'fight' || id === 'espion';

// Ce qu'il faut prendre à l'adversaire pour gagner
export const objectives = (mode) => (mode === 'facile' ? ['drapeau', 'plan', 'citerne'] : ['drapeau', 'plan']);

// Géométrie du plateau selon le règlement
export function geom(mode) {
  const R = mode === 'facile' ? 3 : 4; // rangées par camp
  const H = 2 * R + 2;
  return { R, H, W, N: W * H, mode };
}
export const xy = (G, i) => [i % W, (i / W) | 0];
export const isCross = (G, x, y) => (y === G.R || y === G.R + 1) && CROSS_COLS.includes(x);
export const isDark = (x, y) => (x + y) % 2 === 1;
// camp (moitié du plateau) : 0 en bas, 1 en haut
export const halfOf = (G, y) => (y > G.R ? 0 : 1);
export const fwd = (side) => (side === 0 ? -1 : 1);

export function army(mode) {
  const out = [];
  for (const p of PIECES) for (let k = 0; k < (mode === 'facile' ? p.e : p.n); k++) out.push(p.id);
  return out;
}

// Combat au sol : un combattant (ou l'espion) attaque une vignette.
// 'win' l'attaquant l'emporte, 'lose' il est éliminé, 'both' les deux sautent.
export function fight(att, def) {
  const D = BY_ID[def];
  if (D.kind === 'obj') return 'win';
  if (D.kind === 'mine' || D.kind === 'tbomb') return att === 'sapeur' ? 'win' : 'both';
  if (def === 'general') return att === 'espion' ? 'win' : 'lose';
  if (D.kind === 'gear' || def === 'espion') return 'win';
  if (att === 'espion') return 'lose';
  return BY_ID[att].r >= D.r ? 'win' : 'lose';
}
// Bombardement : 'win' cible détruite, 'lose' bombardier abattu, 'none' sans effet
export function raid(def) {
  if (def === 'dca' || def === 'barrage') return 'lose';
  if (def === 'general' || def === 'drapeau' || def === 'plan') return 'none';
  return 'win';
}

const DIR4 = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DIR8 = [...DIR4, [1, 1], [1, -1], [-1, 1], [-1, -1]];

// Toutes les actions d'une vignette. board[i] = { side, id, revealed, moved, dropped }
// { k:'move', from, to } (déplacement ou attaque) · { k:'drop', from, to } (parachutage / pose)
// { k:'raid', from, to } (bombardier) · { k:'v1', from } (lancement de bombe volante)
export function actionsFrom(G, st, i) {
  const b = st.board, p = b[i]; if (!p) return [];
  const id = p.id, side = p.side, easy = G.mode === 'facile', out = [];
  const [x, y] = xy(G, i);
  const inB = (nx, ny) => nx >= 0 && ny >= 0 && nx < W && ny < G.H && !isCross(G, nx, ny);
  const at = (nx, ny) => b[ny * W + nx];
  const kind = BY_ID[id].kind;
  const fighter = isFighter(id);
  // déplacement d'une case (combattants, espions, drapeau, plan ; citerne en règle facile)
  const stepper = fighter || kind === 'obj' || (easy && id === 'citerne');
  if (stepper) {
    for (const [dx, dy] of easy ? DIR4 : DIR8) {
      const nx = x + dx, ny = y + dy; if (!inB(nx, ny)) continue;
      const t = at(nx, ny);
      if (!t) out.push({ k: 'move', from: i, to: ny * W + nx });
      else if (fighter && t.side !== side && (dx === 0 || dy === 0)) out.push({ k: 'move', from: i, to: ny * W + nx });
    }
    // bond des corps francs : jusqu'à 3 cases en avant pour leur première avance
    if (id === 'corpsfranc' && !p.moved) {
      const dy = fwd(side);
      for (let k = 2; k <= 3; k++) {
        let ok = true;
        for (let j = 1; j < k; j++) if (!inB(x, y + dy * j) || at(x, y + dy * j)) ok = false;
        const ny = y + dy * k; if (!ok || !inB(x, ny)) break;
        const t = at(x, ny);
        if (!t || t.side !== side) out.push({ k: 'move', from: i, to: ny * W + x });
        if (t) break;
      }
    }
  }
  // matériel qui glisse de plusieurs cases (bombe volante, D.C.A., barrage, citerne)
  if (!easy && ['v1', 'dca', 'barrage', 'citerne'].includes(id)) {
    for (const [dx, dy] of DIR8) {
      let nx = x + dx, ny = y + dy;
      while (inB(nx, ny) && !at(nx, ny)) {
        if (id === 'dca' && halfOf(G, ny) !== side) break; // la D.C.A. reste dans son camp
        out.push({ k: 'move', from: i, to: ny * W + nx });
        nx += dx; ny += dy;
      }
    }
  }
  // parachutage (une fois) ; pose des bombes à retardement (et des mines en règle facile)
  const dropper = (id === 'parachutiste' && !p.dropped) || (kind === 'tbomb' && !p.dropped) || (easy && kind === 'mine' && !p.dropped);
  if (dropper) {
    for (let j = 0; j < G.N; j++) {
      const [jx, jy] = xy(G, j);
      if (b[j] || isCross(G, jx, jy) || halfOf(G, jy) === side) continue;
      if (id === 'parachutiste' && Math.max(Math.abs(jx - x), Math.abs(jy - y)) <= 1) continue; // simple pas
      out.push({ k: 'drop', from: i, to: j });
    }
  }
  // bombardier : frappe une vignette ennemie posée sur une case noire
  if (id === 'bombardier' && st.raids[side] > 0) {
    for (let j = 0; j < G.N; j++) {
      const t = b[j]; if (!t || t.side === side) continue;
      const [jx, jy] = xy(G, j); if (isDark(jx, jy)) out.push({ k: 'raid', from: i, to: j });
    }
  }
  // bombe volante : file droit devant dans un couloir
  if (id === 'v1' && v1Path(G, b, i)) out.push({ k: 'v1', from: i });
  return out;
}

// Cases traversées par une bombe volante (null si elle devrait survoler une croix)
export function v1Path(G, b, i) {
  const p = b[i], [x, y] = xy(G, i), dy = fwd(p.side), out = [];
  for (let ny = y + dy; ny >= 0 && ny < G.H; ny += dy) {
    if (isCross(G, x, ny)) return null;
    out.push(ny * W + x);
  }
  return out.length ? out : null;
}

// règle des deux cases : pas plus de 3 allers-retours de suite entre les deux mêmes cases
export function allowedByTwoSquare(hist, side, a) {
  if (a.k !== 'move') return true;
  const h = (hist || []).filter((m) => m.side === side).slice(-3);
  if (h.length < 3) return true;
  const same = (m) => m.k === 'move' && ((m.from === a.from && m.to === a.to) || (m.from === a.to && m.to === a.from));
  return !(h.every(same) && h[2].to === a.from);
}

export function allActions(G, st, side) {
  const out = [];
  for (let i = 0; i < G.N; i++) if (st.board[i]?.side === side) for (const a of actionsFrom(G, st, i)) if (allowedByTwoSquare(st.hist, side, a)) out.push(a);
  return out;
}

// Placement automatique raisonné
export function autoSetup(G, side, rnd = Math.random) {
  const R = G.R, easy = G.mode === 'facile';
  const grid = Array.from({ length: R }, () => new Array(W).fill(null)); // ligne 0 = la plus en arrière
  const toBoard = (r, c) => (side === 0 ? { x: c, y: G.H - 1 - r } : { x: W - 1 - c, y: r });
  const dark = (r, c) => { const { x, y } = toBoard(r, c); return isDark(x, y); };
  const free = () => { const f = []; for (let r = 0; r < R; r++) for (let c = 0; c < W; c++) if (!grid[r][c]) f.push([r, c]); return f; };
  const pick = (cells) => cells[Math.floor(rnd() * cells.length)];
  const place = (id, n, test) => {
    for (let k = 0; k < n; k++) {
      let cells = free().filter(([r, c]) => test(r, c));
      if (!cells.length) cells = free();
      const [r, c] = pick(cells); grid[r][c] = id;
    }
  };
  // drapeau et plan au fond, sur des cases blanches (à l'abri des bombardiers), loin l'un de l'autre
  const fc = pick([...Array(W).keys()].filter((c) => !dark(0, c)));
  grid[0][fc] = 'drapeau';
  const pc = pick([...Array(W).keys()].filter((c) => !dark(0, c) && Math.abs(c - fc) >= 4));
  grid[0][pc] = 'plan';
  // mines devant / à côté
  const guard = [];
  for (const c of [fc, pc]) for (const [r, cc] of [[1, c], [0, c - 1], [0, c + 1]]) if (cc >= 0 && cc < W && !grid[r][cc]) guard.push([r, cc]);
  let mines = 3;
  while (mines && guard.length) { const k = Math.floor(rnd() * guard.length); const [r, c] = guard.splice(k, 1)[0]; if (!grid[r][c]) { grid[r][c] = 'mine'; mines--; } }
  place('mine', mines, (r) => r <= 1);
  if (!easy) {
    place('dca', 4, (r, c) => r <= 2 && dark(r, c));
    place('bombardier', 3, (r, c) => r <= 1 && !dark(r, c));
    place('citerne', 1, (r, c) => r <= 1 && !dark(r, c));
    place('barrage', 3, (r, c) => r >= 1 && r <= 2);
    place('v1', 2, (r, c) => r >= 1 && CORRIDORS.includes(side === 0 ? c : W - 1 - c));
  } else place('citerne', 1, (r, c) => r <= 1);
  place('general', 1, (r, c) => r >= 1 && r <= R - 2 && !dark(r, c));
  place('corpsfranc', 5, (r) => r === R - 1);
  place('parachutiste', 4, (r) => r >= R - 2);
  place('espion', 2, (r) => r >= R - 2);
  place('bomberet', 3, (r) => r >= R - 2);
  place('sapeur', 5, (r) => r >= 1);
  const counts = {}; for (const id of grid.flat()) if (id) counts[id] = (counts[id] || 0) + 1;
  for (const id of army(G.mode)) { if (counts[id]) { counts[id]--; continue; } place(id, 1, () => true); }
  const cells = [];
  for (let r = 0; r < R; r++) for (let c = 0; c < W; c++) { const { x, y } = toBoard(r, c); cells.push({ i: y * W + x, id: grid[r][c] }); }
  return cells;
}
