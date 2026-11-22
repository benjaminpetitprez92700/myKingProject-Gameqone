// Illustrations des cartes de jeux (accueil et écran de mode) : plus représentatives de chaque jeu.
import { portrait } from './stratego/art.js';

const RED = '#c1121f', BLK = '#15151c';
// carte à jouer : x, y = coin haut gauche
function card(x, y, w, h, r, s, { rot = 0, back = false, shadow = true } = {}) {
  const col = s === '♥' || s === '♦' || r === '🃏' ? RED : BLK, cx = x + w / 2, cy = y + h / 2;
  const t = rot ? ` transform="rotate(${rot} ${cx} ${cy})"` : '';
  if (back) return `<g${t}>${shadow ? `<rect x="${x + 1.5}" y="${y + 2}" width="${w}" height="${h}" rx="${w * 0.14}" fill="rgba(0,0,0,.35)"/>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.14}" fill="url(#bk)" stroke="#ffd34d" stroke-width="1.3"/><text x="${cx}" y="${cy + w * 0.14}" text-anchor="middle" font-size="${w * 0.42}" fill="#ffd34d">♛</text></g>`;
  const big = r === '🃏' ? `<text x="${cx}" y="${cy + w * 0.2}" text-anchor="middle" font-size="${w * 0.6}">🃏</text>`
    : ['R', 'D', 'V'].includes(r) ? `<text x="${cx}" y="${cy + w * 0.2}" text-anchor="middle" font-size="${w * 0.58}" fill="${col}">${{ R: '♚', D: '♛', V: '♝' }[r]}</text>`
      : `<text x="${cx}" y="${cy + w * 0.2}" text-anchor="middle" font-size="${w * 0.55}" fill="${col}">${s}</text>`;
  return `<g${t}>${shadow ? `<rect x="${x + 1.5}" y="${y + 2}" width="${w}" height="${h}" rx="${w * 0.14}" fill="rgba(0,0,0,.35)"/>` : ''}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${w * 0.14}" fill="#fffdf6" stroke="#bdb6a3" stroke-width="1"/>
    <text x="${x + w * 0.1}" y="${y + w * 0.36}" font-size="${w * 0.3}" font-weight="900" fill="${col}" font-family="system-ui">${r === '🃏' ? '' : r}</text>${big}</g>`;
}
const DEFS = `<defs><linearGradient id="bk" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6a2fa0"/><stop offset="1" stop-color="#3c145f"/></linearGradient></defs>`;

let strategoImg = '';
function stratego() {
  if (!strategoImg) {
    try {
      const A = { main: '#1f4e9e', dark: '#0f2a5a', light: '#4f86d9', side: 1, style: 'france' };
      strategoImg = portrait('marechal', A, 180).toDataURL();
    } catch (e) { strategoImg = ''; }
  }
  return `<svg viewBox="0 0 120 120">
    <rect x="70" y="10" width="44" height="44" rx="8" fill="#b3261e" transform="rotate(10 92 32)"/><rect x="74" y="14" width="36" height="36" rx="6" fill="#8a1a14" transform="rotate(10 92 32)"/>
    <text x="92" y="40" text-anchor="middle" font-size="24" font-weight="900" fill="#ffd0c8" transform="rotate(10 92 32)">?</text>
    <g class="bob"><rect x="10" y="30" width="66" height="74" rx="10" fill="#1f4e9e" stroke="#0f2a5a" stroke-width="2"/>
    ${strategoImg ? `<clipPath id="sgc"><rect x="15" y="35" width="56" height="56" rx="6"/></clipPath><image href="${strategoImg}" x="15" y="35" width="56" height="56" clip-path="url(#sgc)"/>` : ''}
    <rect x="15" y="86" width="56" height="14" rx="3" fill="rgba(0,0,0,.6)"/><text x="43" y="97" text-anchor="middle" font-size="9.5" font-weight="900" fill="#fff">MARÉCHAL</text>
    <circle cx="70" cy="34" r="9" fill="#ffd34d" stroke="#7a5200" stroke-width="1.5"/><text x="70" y="38" text-anchor="middle" font-size="11" font-weight="900" fill="#3a2600">10</text></g>
    <path d="M80 72 l6 -8 l2 8 l8 -4 l-4 8 l9 2 l-9 4 l4 8 l-8 -4 l-2 8 l-5 -8 Z" fill="#ffb703" stroke="#e85d04" stroke-width="1.5"/>
    <rect x="96" y="76" width="3" height="34" fill="#5b4a33"/><path d="M99 77 q8 -3 16 2 v11 q-8 -4 -16 -1 Z" fill="#c8202a"/></svg>`;
}

export const HUB_ART = {
  bataille: () => `<svg viewBox="0 0 120 120">${DEFS}
    ${card(4, 14, 30, 42, '', '', { back: true, rot: -6 })}${card(86, 64, 30, 42, '', '', { back: true, rot: 6 })}
    <g class="bob">${card(26, 26, 36, 52, 'R', '♥', { rot: -12 })}</g>${card(58, 40, 36, 52, 'D', '♠', { rot: 10 })}
    <g><path d="M60 8 l6 10 l11 -3 l-5 10 l10 6 l-11 3 l2 11 l-9 -6 l-7 9 l-1 -11 l-11 -2 l9 -7 l-5 -10 l11 3 Z" fill="#ffb703" stroke="#e85d04" stroke-width="1.5" transform="translate(0 64) scale(.7)"/></g>
    <rect x="22" y="98" width="76" height="18" rx="9" fill="#ffd34d"/><text x="60" y="111" text-anchor="middle" font-size="9.5" font-weight="900" fill="#3a2600">⚔️ BATAILLE !</text></svg>`,

  rami: () => `<svg viewBox="0 0 120 120">${DEFS}
    <rect x="4" y="8" width="112" height="104" rx="14" fill="rgba(0,0,0,.22)"/>
    ${[['4', 0], ['5', 1], ['6', 2], ['7', 3]].map(([r, i]) => card(10 + i * 19, 14, 30, 42, r, '♥')).join('')}
    ${card(18, 62, 30, 42, 'R', '♠', { rot: -8 })}${card(42, 60, 30, 42, 'R', '♦')}${card(66, 62, 30, 42, '🃏', '', { rot: 8 })}
    <g class="bob"><rect x="70" y="2" width="46" height="16" rx="8" fill="#ffd34d"/><text x="93" y="13.5" text-anchor="middle" font-size="8.5" font-weight="900" fill="#3a2600">CONTRAT ✓</text></g></svg>`,

  golfcards: () => `<svg viewBox="0 0 120 120">${DEFS}
    ${[0, 1, 2, 3].map((c) => [0, 1].map((r) => {
      const x = 6 + c * 28, y = 16 + r * 46;
      if (c === 1) return card(x, y, 24, 36, '7', r ? '♣' : '♠');
      if ((c === 0 && r === 0) || (c === 3 && r === 1)) return card(x, y, 24, 36, c ? 'R' : '2', c ? '♥' : '♦');
      return card(x, y, 24, 36, '', '', { back: true });
    }).join('')).join('')}
    <rect x="31" y="12" width="30" height="86" rx="7" fill="none" stroke="#5ef08f" stroke-width="2.5" stroke-dasharray="4 3"/>
    <g class="bob"><circle cx="46" cy="106" r="11" fill="#19a653" stroke="#fff" stroke-width="2"/><text x="46" y="110.5" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">0</text></g>
    <g><rect x="78" y="100" width="36" height="17" rx="8" fill="#ffd34d"/><text x="96" y="112" text-anchor="middle" font-size="10" font-weight="900" fill="#3a2600">−2 pts</text></g></svg>`,

  tower: () => `<svg viewBox="0 0 120 120">
    <rect x="4" y="8" width="112" height="104" rx="14" fill="#5f9a3c"/>
    ${[[16, 22], [30, 96], [96, 20], [58, 70], [100, 98]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="7" fill="#3e7a2a"/><circle cx="${x - 2}" cy="${y - 2}" r="4" fill="#4f8f35"/>`).join('')}
    <path d="M2 40 H54 Q66 40 66 52 V74 Q66 86 78 86 H104" fill="none" stroke="#a9834f" stroke-width="17" stroke-linecap="round"/>
    <path d="M2 40 H54 Q66 40 66 52 V74 Q66 86 78 86 H104" fill="none" stroke="#d4b07a" stroke-width="12" stroke-linecap="round"/>
    <g><rect x="88" y="62" width="26" height="34" fill="#9aa0a8" stroke="#5a5f66" stroke-width="1.5"/>${[0, 1, 2].map((k) => `<rect x="${88 + k * 10}" y="56" width="6" height="7" fill="#9aa0a8" stroke="#5a5f66" stroke-width="1.2"/>`).join('')}
    <path d="M97 96 v-10 a4 4 0 0 1 8 0 v10 Z" fill="#4a2f1a"/><rect x="100" y="38" width="2" height="18" fill="#5a3a1e"/><path class="flag" d="M102 39 h11 l-3 4 l3 4 h-11 Z" fill="#c0392b"/></g>
    <g><rect x="22" y="56" width="22" height="26" rx="2" fill="#a8a296" stroke="#6d675e" stroke-width="1.5"/><path d="M19 58 L33 44 L47 58 Z" fill="#7a3b2a"/><rect x="29" y="64" width="8" height="10" rx="4" fill="#3a2a1a"/></g>
    <line x1="36" y1="52" x2="60" y2="42" stroke="#3a2a1a" stroke-width="1.8"/><path d="M60 42 l-5 0 l2 -3 Z" fill="#3a2a1a"/>
    <g class="t-slither">${[[14, 40, '#c0392b'], [28, 40, '#f39c12'], [44, 40, '#8e44ad']].map(([x, y, c]) => `<circle cx="${x}" cy="${y}" r="6.5" fill="${c}" stroke="#111" stroke-width="1.2"/><circle cx="${x + 2}" cy="${y - 1.5}" r="1.6" fill="#fff"/>`).join('')}</g>
    <g class="bob"><circle cx="64" cy="22" r="8" fill="#ffd34d" stroke="#a87a12" stroke-width="1.5"/><text x="64" y="26" text-anchor="middle" font-size="9" font-weight="900" fill="#6b4a00">$</text></g></svg>`,

  stratego,

  tarot: () => {
    const tc = (x, rot, top, body, bottom) => `<g transform="rotate(${rot} ${x + 18} 110)"><rect x="${x + 1.5}" y="22" width="36" height="62" rx="5" fill="rgba(0,0,0,.35)"/><rect x="${x}" y="20" width="36" height="62" rx="5" fill="#fbf3dc" stroke="#1f3f99" stroke-width="2"/>
      <text x="${x + 18}" y="31" text-anchor="middle" font-size="8" font-weight="900" fill="#1f3f99">${top}</text>${body}<text x="${x + 18}" y="78" text-anchor="middle" font-size="5.5" font-weight="800" fill="#7a5200">${bottom}</text></g>`;
    return `<svg viewBox="0 0 120 120">
      ${tc(18, -20, 'EXCUSE', `<path d="M${36 - 12} 52 q6 -14 12 -2 q6 -12 12 2 Z" fill="#c8202a"/><circle cx="24" cy="51" r="2" fill="#ffd34d"/><circle cx="48" cy="51" r="2" fill="#ffd34d"/><circle cx="36" cy="60" r="6" fill="#f3c9a4"/><circle cx="36" cy="44" r="2" fill="#ffd34d"/>`, '★')}
      ${tc(42, 0, 'XXI', `<circle cx="60" cy="52" r="13" fill="#3a86ff"/><path d="M53 46 q5 4 3 9 q5 -1 6 4 q4 -6 8 -3" fill="none" stroke="#2ecc71" stroke-width="3"/><circle cx="60" cy="52" r="13" fill="none" stroke="#1f3f99" stroke-width="1.5"/>`, 'LE MONDE')}
      ${tc(66, 20, 'I', `<rect x="76" y="56" width="16" height="5" fill="#8a5a2b"/><circle cx="84" cy="46" r="5" fill="#f3c9a4"/><path d="M76 44 q8 -10 16 0" fill="#c8202a"/><rect x="80" y="50" width="8" height="7" fill="#1f3f99"/>`, 'LE PETIT')}
      <g class="bob"><rect x="30" y="90" width="60" height="22" rx="11" fill="#ffd34d" stroke="#7a5200" stroke-width="1.5"/><text x="60" y="105" text-anchor="middle" font-size="10" font-weight="900" fill="#3a2600">🏆 +132</text></g></svg>`;
  },
};
