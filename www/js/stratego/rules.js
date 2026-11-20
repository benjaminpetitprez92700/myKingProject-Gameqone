// Guerre Éclair : règles du Stratego classique (plateau 10×10, 40 pièces par camp, 2 lacs).

export const SIZE = 10;
export const PIECES = [
  { r: 10, id: 'marechal', name: 'Maréchal', short: 'Mar', n: 1 },
  { r: 9, id: 'general', name: 'Général', short: 'Gén', n: 1 },
  { r: 8, id: 'colonel', name: 'Colonel', short: 'Col', n: 2 },
  { r: 7, id: 'commandant', name: 'Commandant', short: 'Cdt', n: 3 },
  { r: 6, id: 'capitaine', name: 'Capitaine', short: 'Cne', n: 4 },
  { r: 5, id: 'lieutenant', name: 'Lieutenant', short: 'Lt', n: 4 },
  { r: 4, id: 'sergent', name: 'Sergent', short: 'Sgt', n: 4 },
  { r: 3, id: 'demineur', name: 'Démineur', short: 'Dém', n: 5 },
  { r: 2, id: 'eclaireur', name: 'Éclaireur', short: 'Écl', n: 8 },
  { r: 1, id: 'espion', name: 'Espion', short: 'Esp', n: 1 },
  { r: 11, id: 'bombe', name: 'Bombe', short: 'B', n: 6 },
  { r: 0, id: 'drapeau', name: 'Drapeau', short: 'D', n: 1 },
];
export const BY_ID = Object.fromEntries(PIECES.map((p) => [p.id, p]));
export const isLake = (x, y) => (y === 4 || y === 5) && (x === 2 || x === 3 || x === 6 || x === 7);
export const movable = (id) => id !== 'bombe' && id !== 'drapeau';

export function army() {
  const out = [];
  for (const p of PIECES) for (let k = 0; k < p.n; k++) out.push(p.id);
  return out;
}

// Résultat d'une attaque : 'win' (l'attaquant gagne), 'lose', 'both'
export function fight(att, def) {
  if (def === 'drapeau') return 'win';
  if (def === 'bombe') return att === 'demineur' ? 'win' : 'lose';
  if (att === 'espion' && def === 'marechal') return 'win';
  const a = BY_ID[att].r, d = BY_ID[def].r;
  return a > d ? 'win' : a < d ? 'lose' : 'both';
}

// Placement automatique raisonné : drapeau au fond entouré de bombes, éclaireurs devant…
export function autoSetup(side, rnd = Math.random) {
  // side 0 : en bas (rangées 6 à 9), side 1 : en haut (rangées 0 à 3)
  const grid = Array.from({ length: 4 }, () => new Array(10).fill(null)); // ligne 0 = la plus en arrière
  const fx = 1 + Math.floor(rnd() * 8);
  grid[0][fx] = 'drapeau';
  const around = [[0, fx - 1], [0, fx + 1], [1, fx]].filter(([r, c]) => c >= 0 && c < 10);
  let bombs = 6;
  for (const [r, c] of around) if (bombs && rnd() < 0.9) { grid[r][c] = 'bombe'; bombs--; }
  const free = () => { const f = []; for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) if (!grid[r][c]) f.push([r, c]); return f; };
  const place = (id, n, rowsPref) => {
    for (let k = 0; k < n; k++) {
      let cells = free().filter(([r]) => rowsPref.includes(r));
      if (!cells.length) cells = free();
      const [r, c] = cells[Math.floor(rnd() * cells.length)];
      grid[r][c] = id;
    }
  };
  place('bombe', bombs, [0, 1, 2]);
  place('eclaireur', 8, [2, 3]);
  place('marechal', 1, [1, 2]); place('general', 1, [1, 2]); place('espion', 1, [1, 2]);
  place('demineur', 5, [0, 1, 2]);
  const rest = [];
  for (const p of PIECES) {
    const placed = grid.flat().filter((x) => x === p.id).length;
    for (let k = placed; k < p.n; k++) rest.push(p.id);
  }
  for (const id of rest) place(id, 1, [0, 1, 2, 3]);
  const cells = [];
  for (let r = 0; r < 4; r++) for (let c = 0; c < 10; c++) {
    const y = side === 0 ? 9 - r : r;
    cells.push({ x: side === 0 ? c : 9 - c, y, id: grid[r][c] });
  }
  return cells;
}

export function newBoard() { return Array.from({ length: SIZE * SIZE }, () => null); }

// Coups possibles d'une pièce. board[i] = { side, id, revealed, moved }
export function movesFrom(board, i) {
  const p = board[i]; if (!p || !movable(p.id)) return [];
  const x = i % SIZE, y = (i / SIZE) | 0, out = [];
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
    let nx = x + dx, ny = y + dy;
    while (nx >= 0 && nx < SIZE && ny >= 0 && ny < SIZE && !isLake(nx, ny)) {
      const t = board[ny * SIZE + nx];
      if (t) { if (t.side !== p.side) out.push(ny * SIZE + nx); break; }
      out.push(ny * SIZE + nx);
      if (p.id !== 'eclaireur') break;
      nx += dx; ny += dy;
    }
  }
  return out;
}

export function allMoves(board, side, hist) {
  const out = [];
  for (let i = 0; i < board.length; i++) if (board[i]?.side === side) for (const to of movesFrom(board, i)) {
    if (!allowedByTwoSquare(hist, side, i, to)) continue;
    out.push({ from: i, to });
  }
  return out;
}

// règle des deux cases : pas plus de 3 allers-retours de suite entre les deux mêmes cases
export function allowedByTwoSquare(hist, side, from, to) {
  const h = (hist || []).filter((m) => m.side === side).slice(-3);
  if (h.length < 3) return true;
  const [a, b, c] = h;
  const sameLine = (m) => (m.from === from && m.to === to) || (m.from === to && m.to === from);
  return !(sameLine(a) && sameLine(b) && sameLine(c) && c.to === from);
}
