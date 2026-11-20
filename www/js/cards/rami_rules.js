// Règles du Rami à contrats (jeu de cartes traditionnel, famille du « Shanghai »).
// Brelan : au moins 3 cartes de même valeur. Suite : au moins 4 cartes qui se suivent dans la même couleur.
// Joker : remplace n'importe quelle carte ; chaque combinaison doit garder au moins 2 vraies cartes.

export const CONTRACTS = [
  { sets: 2, runs: 0, label: '2 brelans' },
  { sets: 1, runs: 1, label: '1 brelan + 1 suite de 4' },
  { sets: 0, runs: 2, label: '2 suites de 4' },
  { sets: 3, runs: 0, label: '3 brelans' },
  { sets: 2, runs: 1, label: '2 brelans + 1 suite de 4' },
  { sets: 1, runs: 2, label: '1 brelan + 2 suites de 4' },
];
export const HAND = 11;

const NUM = { A: 1, V: 11, D: 12, R: 13 };
export const rankNum = (c) => NUM[c.r] ?? +c.r;
export const isJoker = (c) => c.r === 'J';
export const penalty = (c) => (isJoker(c) ? 25 : c.r === 'A' ? 15 : rankNum(c) >= 10 ? 10 : 5);
export const handPenalty = (h) => h.reduce((s, c) => s + penalty(c), 0);

export function isSet(cards) {
  if (cards.length < 3) return false;
  const nat = cards.filter((c) => !isJoker(c));
  return nat.length >= 2 && nat.every((c) => c.r === nat[0].r);
}

// renvoie la position (valeur) de chaque carte dans la suite, ou null si ce n'est pas une suite
function runLayout(cards) {
  if (cards.length < 4 || cards.length > 13) return null;
  const nat = cards.filter((c) => !isJoker(c));
  if (nat.length < 2 || !nat.every((c) => c.s === nat[0].s)) return null;
  for (const aceHigh of [false, true]) {
    const v = nat.map((c) => (c.r === 'A' && aceHigh ? 14 : rankNum(c)));
    if (new Set(v).size !== v.length) continue;
    const lo = Math.min(...v), hi = Math.max(...v), n = cards.length;
    if (hi - lo + 1 > n) continue;
    const minV = aceHigh ? 2 : 1, maxV = aceHigh ? 14 : 13;
    // les jokers en trop prolongent la suite vers le haut, puis vers le bas
    let start = lo, extra = n - (hi - lo + 1);
    const up = Math.min(extra, maxV - hi); extra -= up;
    start = lo - extra;
    if (start < minV) continue;
    return { start, aceHigh, v };
  }
  return null;
}
export const isRun = (cards) => !!runLayout(cards);
export const kindOf = (cards) => (isSet(cards) ? 'set' : isRun(cards) ? 'run' : null);

// ordre d'affichage : suite triée avec les jokers à leur place, brelan avec les jokers à la fin
export function arrange(cards) {
  const L = runLayout(cards);
  if (!L || isSet(cards)) return [...cards].sort((a, b) => isJoker(a) - isJoker(b));
  const nat = cards.filter((c) => !isJoker(c)), jok = cards.filter(isJoker);
  const out = [];
  for (let k = 0; k < cards.length; k++) {
    const val = L.start + k, i = L.v.indexOf(val);
    out.push(i >= 0 ? nat[i] : jok.pop());
  }
  return out;
}

// Les groupes posés correspondent-ils au contrat ?
export function matchesContract(groups, ct) {
  let s = 0, r = 0;
  for (const g of groups) { const k = kindOf(g); if (k === 'set') s++; else if (k === 'run') r++; else return false; }
  return s === ct.sets && r === ct.runs;
}

// Recherche d'une façon de réaliser le contrat avec la main (groupes minimaux : 3 et 4 cartes)
export function findContract(hand, ct) {
  const reqs = [...Array(ct.runs).fill('run'), ...Array(ct.sets).fill('set')];
  const solve = (cards, k) => {
    if (k === reqs.length) return [];
    for (const g of candidates(cards, reqs[k])) {
      const ids = new Set(g.map((c) => c.id));
      const rest = solve(cards.filter((c) => !ids.has(c.id)), k + 1);
      if (rest) return [g, ...rest];
    }
    return null;
  };
  return solve(hand, 0);
}

function* candidates(cards, type) {
  const jok = cards.filter(isJoker), nat = cards.filter((c) => !isJoker(c));
  if (type === 'set') {
    const byRank = {};
    for (const c of nat) (byRank[c.r] ||= []).push(c);
    for (const r in byRank) {
      const cs = byRank[r];
      if (cs.length >= 3) for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) for (let c = b + 1; c < cs.length; c++) yield [cs[a], cs[b], cs[c]];
      if (cs.length >= 2 && jok.length) for (let a = 0; a < cs.length; a++) for (let b = a + 1; b < cs.length; b++) yield [cs[a], cs[b], jok[0]];
    }
    return;
  }
  for (const s of ['♠', '♥', '♦', '♣']) {
    const mine = nat.filter((c) => c.s === s);
    if (mine.length < 2) continue;
    for (let st = 1; st <= 11; st++) {
      const g = [], used = new Set(); let j = 0, n = 0;
      for (let v = st; v < st + 4; v++) {
        const c = mine.find((c) => !used.has(c.id) && (v === 14 ? c.r === 'A' : rankNum(c) === v));
        if (c) { g.push(c); used.add(c.id); n++; } else if (j < jok.length) g.push(jok[j++]); else break;
      }
      if (g.length === 4 && n >= 2) yield g;
    }
  }
}

// Peut-on ajouter ces cartes à une combinaison posée ?
export function canAdd(group, cards) {
  const all = [...group, ...cards], k = kindOf(group);
  return k === 'set' ? isSet(all) : k === 'run' ? isRun(all) : false;
}

// Estimation (pour l'ordi) : à quel point la main est proche du contrat
export function handValue(hand, ct) {
  if (findContract(hand, ct)) return 100 - handPenalty(hand) * 0.05;
  const jok = hand.filter(isJoker).length, nat = hand.filter((c) => !isJoker(c));
  const cnt = {};
  for (const c of nat) cnt[c.r] = (cnt[c.r] || 0) + 1;
  const setSc = Object.values(cnt).map((n) => (n >= 3 ? 7 : n === 2 ? 3.5 : 0)).sort((a, b) => b - a);
  const runSc = [];
  for (const s of ['♠', '♥', '♦', '♣']) {
    const vals = new Set(nat.filter((c) => c.s === s).flatMap((c) => (c.r === 'A' ? [1, 14] : [rankNum(c)])));
    let best = 0;
    for (let st = 1; st <= 11; st++) { let n = 0; for (let v = st; v < st + 4; v++) n += vals.has(v); best = Math.max(best, n); }
    runSc.push(best >= 4 ? 9 : best === 3 ? 5.5 : best === 2 ? 2 : 0);
  }
  runSc.sort((a, b) => b - a);
  let v = jok * 4;
  for (let i = 0; i < ct.sets; i++) v += setSc[i] || 0;
  for (let i = 0; i < ct.runs; i++) v += runSc[i] || 0;
  return v - handPenalty(hand) * 0.03;
}
