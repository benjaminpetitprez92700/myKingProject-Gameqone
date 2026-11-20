// Moteur d'échecs complet : coups légaux (roque, prise en passant, promotion), échec, mat, pat,
// nulle par matériel insuffisant, et IA alpha-bêta avec tables de position.

export const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
const N = -8, S = 8, E = 1, W = -1;
const KNIGHT = [-17, -15, -10, -6, 6, 10, 15, 17];
const KING = [-9, -8, -7, -1, 1, 7, 8, 9];
const VALUE = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 0 };

export const isWhite = (p) => p && p === p.toUpperCase();
export const colorOf = (p) => (!p ? null : isWhite(p) ? 'w' : 'b');
const file = (i) => i & 7, rank = (i) => i >> 3;   // rang 0 = 8e rangée (haut)

export function parseFEN(fen) {
  const [pl, turn, cast, ep, half, full] = fen.split(' ');
  const board = [];
  for (const ch of pl) {
    if (ch === '/') continue;
    if (/\d/.test(ch)) for (let k = 0; k < +ch; k++) board.push(null);
    else board.push(ch);
  }
  const sq = (s) => (s === '-' ? -1 : (8 - +s[1]) * 8 + (s.charCodeAt(0) - 97));
  return { board, turn, castle: cast === '-' ? '' : cast, ep: sq(ep), half: +half || 0, full: +full || 1, history: [] };
}

export const sqName = (i) => String.fromCharCode(97 + file(i)) + (8 - rank(i));

function attacked(st, sq, by) {
  const b = st.board, white = by === 'w';
  // pions
  const pr = white ? 1 : -1;
  for (const df of [-1, 1]) {
    const f = file(sq) + df, r = rank(sq) + pr;
    if (f >= 0 && f < 8 && r >= 0 && r < 8) { const p = b[r * 8 + f]; if (p === (white ? 'P' : 'p')) return true; }
  }
  for (const d of KNIGHT) {
    const t = sq + d; if (t < 0 || t > 63 || Math.abs(file(t) - file(sq)) > 2) continue;
    if (b[t] === (white ? 'N' : 'n')) return true;
  }
  for (const d of KING) {
    const t = sq + d; if (t < 0 || t > 63 || Math.abs(file(t) - file(sq)) > 1) continue;
    if (b[t] === (white ? 'K' : 'k')) return true;
  }
  const slide = (dirs, pieces) => {
    for (const [df, dr] of dirs) {
      let f = file(sq) + df, r = rank(sq) + dr;
      while (f >= 0 && f < 8 && r >= 0 && r < 8) {
        const p = b[r * 8 + f];
        if (p) { if (colorOf(p) === by && pieces.includes(p.toLowerCase())) return true; break; }
        f += df; r += dr;
      }
    }
    return false;
  };
  return slide([[1, 0], [-1, 0], [0, 1], [0, -1]], 'rq') || slide([[1, 1], [1, -1], [-1, 1], [-1, -1]], 'bq');
}

export const kingSq = (st, c) => st.board.indexOf(c === 'w' ? 'K' : 'k');
export const inCheck = (st, c = st.turn) => attacked(st, kingSq(st, c), c === 'w' ? 'b' : 'w');

function pseudo(st) {
  const b = st.board, c = st.turn, moves = [];
  const add = (from, to, extra = {}) => moves.push({ from, to, piece: b[from], cap: b[to], ...extra });
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p || colorOf(p) !== c) continue;
    const t = p.toLowerCase(), f = file(i), r = rank(i);
    if (t === 'p') {
      const dir = c === 'w' ? -1 : 1, start = c === 'w' ? 6 : 1, last = c === 'w' ? 0 : 7;
      const one = i + dir * 8;
      const pushMove = (to, cap, ep) => {
        if (rank(to) === last) for (const pr of 'qrbn') add(i, to, { promo: c === 'w' ? pr.toUpperCase() : pr, ep });
        else add(i, to, { ep });
      };
      if (!b[one]) { pushMove(one); if (r === start && !b[one + dir * 8]) add(i, one + dir * 8, { double: true }); }
      for (const df of [-1, 1]) {
        if (f + df < 0 || f + df > 7) continue;
        const to = one + df;
        if (b[to] && colorOf(b[to]) !== c) pushMove(to);
        else if (to === st.ep) add(i, to, { epCap: true, cap: c === 'w' ? 'p' : 'P' });
      }
    } else if (t === 'n' || t === 'k') {
      for (const d of t === 'n' ? KNIGHT : KING) {
        const to = i + d; if (to < 0 || to > 63 || Math.abs(file(to) - f) > (t === 'n' ? 2 : 1)) continue;
        if (!b[to] || colorOf(b[to]) !== c) add(i, to);
      }
      if (t === 'k') {
        const enemy = c === 'w' ? 'b' : 'w', home = c === 'w' ? 60 : 4;
        if (i === home && !attacked(st, i, enemy)) {
          if (st.castle.includes(c === 'w' ? 'K' : 'k') && !b[i + 1] && !b[i + 2] && !attacked(st, i + 1, enemy) && !attacked(st, i + 2, enemy)) add(i, i + 2, { castle: 'k' });
          if (st.castle.includes(c === 'w' ? 'Q' : 'q') && !b[i - 1] && !b[i - 2] && !b[i - 3] && !attacked(st, i - 1, enemy) && !attacked(st, i - 2, enemy)) add(i, i - 2, { castle: 'q' });
        }
      }
    } else {
      const dirs = t === 'r' ? [[1, 0], [-1, 0], [0, 1], [0, -1]] : t === 'b' ? [[1, 1], [1, -1], [-1, 1], [-1, -1]] : [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
      for (const [df, dr] of dirs) {
        let ff = f + df, rr = r + dr;
        while (ff >= 0 && ff < 8 && rr >= 0 && rr < 8) {
          const to = rr * 8 + ff;
          if (b[to]) { if (colorOf(b[to]) !== c) add(i, to); break; }
          add(i, to); ff += df; rr += dr;
        }
      }
    }
  }
  return moves;
}

export function makeMove(st, m) {
  const b = st.board;
  const undo = { m, castle: st.castle, ep: st.ep, half: st.half, captured: b[m.to] };
  b[m.to] = m.promo || b[m.from]; b[m.from] = null;
  if (m.epCap) { const capSq = m.to + (st.turn === 'w' ? 8 : -8); undo.epSq = capSq; undo.captured = b[capSq]; b[capSq] = null; }
  if (m.castle === 'k') { b[m.from + 1] = b[m.from + 3]; b[m.from + 3] = null; }
  if (m.castle === 'q') { b[m.from - 1] = b[m.from - 4]; b[m.from - 4] = null; }
  let cs = st.castle;
  const strip = (sq) => { if (sq === 60) cs = cs.replace(/[KQ]/g, ''); if (sq === 4) cs = cs.replace(/[kq]/g, ''); if (sq === 63) cs = cs.replace('K', ''); if (sq === 56) cs = cs.replace('Q', ''); if (sq === 7) cs = cs.replace('k', ''); if (sq === 0) cs = cs.replace('q', ''); };
  strip(m.from); strip(m.to);
  st.castle = cs;
  st.ep = m.double ? (m.from + m.to) / 2 : -1;
  st.half = m.piece.toLowerCase() === 'p' || undo.captured ? 0 : st.half + 1;
  if (st.turn === 'b') st.full++;
  st.turn = st.turn === 'w' ? 'b' : 'w';
  st.history.push(undo);
  return undo;
}

export function undoMove(st) {
  const u = st.history.pop(); if (!u) return;
  const b = st.board, m = u.m;
  st.turn = st.turn === 'w' ? 'b' : 'w';
  if (st.turn === 'b') st.full--;
  b[m.from] = m.piece; b[m.to] = m.epCap ? null : u.captured;
  if (m.epCap) b[u.epSq] = u.captured;
  if (m.castle === 'k') { b[m.from + 3] = b[m.from + 1]; b[m.from + 1] = null; }
  if (m.castle === 'q') { b[m.from - 4] = b[m.from - 1]; b[m.from - 1] = null; }
  st.castle = u.castle; st.ep = u.ep; st.half = u.half;
}

export function legalMoves(st) {
  const c = st.turn, out = [];
  for (const m of pseudo(st)) { makeMove(st, m); if (!attacked(st, kingSq(st, c), st.turn)) out.push(m); undoMove(st); }
  return out;
}

function insufficient(st) {
  const ps = st.board.filter((p) => p && p.toLowerCase() !== 'k');
  if (!ps.length) return true;
  if (ps.length === 1 && 'nb'.includes(ps[0].toLowerCase())) return true;
  return false;
}

export function status(st) {
  const moves = legalMoves(st);
  if (!moves.length) return inCheck(st) ? { over: true, result: st.turn === 'w' ? 'b' : 'w', reason: 'mat' } : { over: true, result: 'draw', reason: 'pat' };
  if (insufficient(st)) return { over: true, result: 'draw', reason: 'matériel insuffisant' };
  if (st.half >= 100) return { over: true, result: 'draw', reason: 'règle des 50 coups' };
  return { over: false, moves };
}

// ---------- IA ----------
const PST = {
  p: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5, 0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
  n: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30, -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
  b: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10, -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
  r: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
  q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5, 0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
  k: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
};

function evaluate(st) {
  let s = 0;
  const b = st.board;
  for (let i = 0; i < 64; i++) {
    const p = b[i]; if (!p) continue;
    const t = p.toLowerCase();
    if (isWhite(p)) s += VALUE[t] + PST[t][i]; else s -= VALUE[t] + PST[t][(7 - rank(i)) * 8 + file(i)];
  }
  return st.turn === 'w' ? s : -s;
}

const order = (moves) => moves.sort((a, b) => ((b.cap ? VALUE[b.cap.toLowerCase()] * 10 - VALUE[b.piece.toLowerCase()] : 0) + (b.promo ? 800 : 0)) - ((a.cap ? VALUE[a.cap.toLowerCase()] * 10 - VALUE[a.piece.toLowerCase()] : 0) + (a.promo ? 800 : 0)));

function quiesce(st, alpha, beta, depth, ctx) {
  ctx.nodes++;
  const stand = evaluate(st);
  if (stand >= beta) return beta;
  if (alpha < stand) alpha = stand;
  if (depth <= 0) return alpha;
  const c = st.turn;
  for (const m of order(pseudo(st).filter((m) => m.cap || m.promo))) {
    makeMove(st, m);
    if (attacked(st, kingSq(st, c), st.turn)) { undoMove(st); continue; }
    const sc = -quiesce(st, -beta, -alpha, depth - 1, ctx);
    undoMove(st);
    if (sc >= beta) return beta;
    if (sc > alpha) alpha = sc;
  }
  return alpha;
}

function negamax(st, depth, alpha, beta, ctx, ply) {
  ctx.nodes++;
  if (depth <= 0) return quiesce(st, alpha, beta, 4, ctx);
  const c = st.turn;
  let legal = 0, best = -Infinity;
  for (const m of order(pseudo(st))) {
    makeMove(st, m);
    if (attacked(st, kingSq(st, c), st.turn)) { undoMove(st); continue; }
    legal++;
    const sc = -negamax(st, depth - 1, -beta, -alpha, ctx, ply + 1);
    undoMove(st);
    if (sc > best) best = sc;
    if (sc > alpha) alpha = sc;
    if (alpha >= beta) break;
  }
  if (!legal) return inCheck(st) ? -100000 + ply : 0;
  return best;
}

// Choisit un coup. level : facile | moyen | difficile
export function bestMove(st, level) {
  const depth = { facile: 1, moyen: 2, difficile: 3 }[level] || 2;
  const moves = legalMoves(st);
  if (!moves.length) return null;
  const ctx = { nodes: 0 };
  const scored = [];
  for (const m of order(moves)) {
    makeMove(st, m);
    const sc = -negamax(st, depth - 1, -Infinity, Infinity, ctx, 1);
    undoMove(st);
    scored.push({ m, sc: sc + Math.random() * (level === 'facile' ? 120 : level === 'moyen' ? 25 : 6) });
  }
  scored.sort((a, b) => b.sc - a.sc);
  // en facile, il arrive à l'ordi de ne pas voir le meilleur coup
  if (level === 'facile' && Math.random() < 0.3 && scored.length > 1) return scored[1 + Math.floor(Math.random() * Math.min(3, scored.length - 1))].m;
  return scored[0].m;
}

// Notation lisible pour l'historique (ex. Cf3, exd5, O-O, e8=D+)
const FR = { k: 'R', q: 'D', r: 'T', b: 'F', n: 'C', p: '' };
export function moveLabel(st, m) {
  if (m.castle) return m.castle === 'k' ? 'O-O' : 'O-O-O';
  const t = m.piece.toLowerCase();
  let s = FR[t];
  if (t === 'p' && m.cap) s += sqName(m.from)[0];
  if (m.cap) s += 'x';
  s += sqName(m.to);
  if (m.promo) s += '=' + FR[m.promo.toLowerCase()];
  return s;
}

// Analyse : score de chaque coup légal (du point de vue du joueur qui joue), du meilleur au moins bon.
// Sert au mode assistant pour noter les coups du joueur.
export function analyzeMoves(st, depth = 2) {
  const ctx = { nodes: 0 }, out = [];
  for (const m of order(legalMoves(st))) {
    makeMove(st, m);
    const sc = -negamax(st, depth - 1, -Infinity, Infinity, ctx, 1);
    undoMove(st);
    out.push({ m, sc });
  }
  return out.sort((a, b) => b.sc - a.sc);
}
