// Compteur de points pour le tarot à 5 joueurs (règles officielles FFT).

export const CONTRACTS = [
  { id: 'petite', name: 'Petite', mult: 1 },
  { id: 'garde', name: 'Garde', mult: 2 },
  { id: 'sans', name: 'Garde sans', mult: 4 },
  { id: 'contre', name: 'Garde contre', mult: 6 },
];
export const REQUIRED = [56, 51, 41, 36];               // points à faire selon le nombre de bouts
export const POIGNEES = { none: 0, simple: 20, double: 30, triple: 40 };
export const CHELEMS = { none: 0, annonceReussi: 400, nonAnnonceReussi: 200, annonceChute: -200 };

// Calcule les points de chaque joueur pour une manche.
// r = { taker, partner (index ou null = seul), contract, bouts, points, petit ('none'|'att'|'def'), poignee, chelem }
export function scoreRound(r, n = 5) {
  const c = CONTRACTS.find((x) => x.id === r.contract);
  const need = REQUIRED[r.bouts];
  const diff = r.points - need;
  const made = diff >= 0;
  const sign = made ? 1 : -1;
  const base = (25 + Math.round(Math.abs(diff))) * c.mult;
  const petit = r.petit === 'att' ? 10 * c.mult : r.petit === 'def' ? -10 * c.mult : 0;
  const poignee = POIGNEES[r.poignee || 'none'] * sign;      // la prime va au camp gagnant
  const chelem = CHELEMS[r.chelem || 'none'];
  const att = sign * base + petit + poignee + chelem;     // ce que gagne (ou perd) chaque « part » de l'attaque
  const scores = new Array(n).fill(-att);
  const alone = r.partner == null || r.partner === r.taker;
  if (alone) scores[r.taker] = att * (n - 1);
  else { scores[r.taker] = att * 2; scores[r.partner] = att; }
  return { scores, made, diff, need, att, mult: c.mult };
}

export function totals(game) {
  const t = new Array(game.players.length).fill(0);
  for (const r of game.rounds) scoreRound(r, game.players.length).scores.forEach((s, i) => (t[i] += s));
  return t;
}
