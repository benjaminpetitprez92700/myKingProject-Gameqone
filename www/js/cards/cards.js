// Outils de cartes à jouer : paquets, valeurs et rendu HTML des cartes (face et dos).

export const SUITS = ['♠', '♥', '♦', '♣'];
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'V', 'D', 'R'];
const RED = new Set(['♥', '♦']);

let uid = 0;
export function deck(copies = 1, jokers = 0) {
  const out = [];
  for (let c = 0; c < copies; c++) for (const s of SUITS) for (const r of RANKS) out.push({ id: uid++, r, s });
  for (let j = 0; j < jokers; j++) out.push({ id: uid++, r: 'J', s: '★' });
  return out;
}
export function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }

// rendu d'une carte ; size : 'lg' | 'md' | 'sm'
export function cardHTML(card, { faceUp = true, size = 'md', extra = '', attrs = '' } = {}) {
  if (!card) return `<div class="pcard empty ${size} ${extra}" ${attrs}></div>`;
  const red = RED.has(card.s) || card.r === 'J';
  const face = card.r === 'J'
    ? `<div class="pc-joker"><span>🃏</span><b>JOKER</b></div>`
    : `<div class="pc-corner tl">${card.r}<i>${card.s}</i></div><div class="pc-mid">${['V', 'D', 'R'].includes(card.r) ? `<b class="pc-fig">${{ V: '♝', D: '♛', R: '♚' }[card.r]}</b>` : card.s}</div><div class="pc-corner br">${card.r}<i>${card.s}</i></div>`;
  return `<div class="pcard ${size} ${faceUp ? 'up' : 'down'} ${red ? 'red' : 'black'} ${extra}" ${attrs}>
    <div class="pc-inner"><div class="pc-front">${face}</div><div class="pc-back"><span>♛</span></div></div></div>`;
}
