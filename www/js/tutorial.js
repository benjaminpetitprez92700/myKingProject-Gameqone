// Tutoriels illustrés et animés : un par jeu, affichés à la première ouverture puis via le bouton « ? ».

const finger = (cls) => `<g class="finger ${cls}"><circle class="pulse" r="13"/><circle r="8" fill="#fff"/><circle r="8" fill="none" stroke="#3a86ff" stroke-width="2"/></g>`;
const ball = (x, y, r, c, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${extra}/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity=".7"/>`;
const svg = (body) => `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const green = (extra = '') => `<rect x="0" y="0" width="240" height="160" fill="#5c9e45"/><path d="M60 170 L60 40 Q60 20 80 20 L160 20 Q180 20 180 40 L180 170" fill="#3d9a47" stroke="#8a6038" stroke-width="7"/>${extra}`;

export const TUTORIALS = {
  minigolf: {
    name: 'Mini Golf',
    slides: [
      { title: 'Le but', text: 'Mets la balle dans le trou en faisant le moins de coups possible.',
        art: svg(`${green()}<ellipse cx="120" cy="45" rx="9" ry="6" fill="#111"/><line x1="120" y1="45" x2="120" y2="8" stroke="#fff" stroke-width="2"/><path d="M120 8 L140 14 L120 20Z" fill="#e63946"/><g class="t-roll-up">${ball(120, 130, 7, '#3a86ff')}</g>`) },
      { title: 'Viser', text: 'Glisse le doigt vers la gauche ou la droite : la caméra tourne autour de la balle et la ligne pointillée montre la direction.',
        art: svg(`${green()}${ball(120, 120, 8, '#3a86ff')}<g class="t-aim-rot" style="transform-origin:120px 120px"><line x1="120" y1="108" x2="120" y2="40" stroke="#fff" stroke-width="3" stroke-dasharray="3 6"/></g>${finger('t-swipe-x')}`) },
      { title: 'Frapper', text: "Tire le doigt vers le bas pour choisir la puissance (l'anneau se remplit), puis relâche pour frapper.",
        art: svg(`${green()}<circle cx="120" cy="80" r="16" fill="none" stroke="rgba(0,0,0,.3)" stroke-width="5"/><circle class="t-ring" cx="120" cy="80" r="16" fill="none" stroke="#ffd34d" stroke-width="5" stroke-dasharray="101" stroke-dashoffset="101" transform="rotate(-90 120 80)"/>${ball(120, 80, 8, '#3a86ff')}${finger('t-swipe-down')}`) },
      { title: 'Les pièges', text: 'Le sable ralentit, les bosses dévient la balle, les obstacles la font rebondir. Si la balle tombe de la piste ou dans l\'eau : +1 coup.',
        art: svg(`<rect width="240" height="160" fill="#5c9e45"/><ellipse cx="60" cy="110" rx="50" ry="30" fill="#2f7f88"/><rect x="40" y="96" width="44" height="28" fill="#a87445"/><rect x="130" y="30" width="80" height="40" rx="14" fill="#ead7a4"/><circle cx="170" cy="115" r="26" fill="#3d9a47"/><circle cx="162" cy="107" r="12" fill="#6fcf6f" opacity=".6"/><circle cx="110" cy="45" r="8" fill="#d62828"/><circle cx="110" cy="45" r="5" fill="#fff"/><text x="60" y="150" class="t-lbl">pont</text><text x="170" y="25" class="t-lbl">sable</text><text x="170" y="155" class="t-lbl">bosse</text>`) },
      { title: 'Les étoiles', text: "Le « par » est le nombre de coups conseillé : fais-le pour 3 étoiles. Le bouton 👁 montre tout le parcours d'en haut.",
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="120" y="70" text-anchor="middle" font-size="44" class="t-stars">★★★</text><text x="120" y="115" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">Par 3 = 3 coups</text>`) },
    ],
  },
  pog: {
    name: 'Pogs',
    slides: [
      { title: 'Le but', text: 'Chaque joueur met 5 pogs dans la pile, face cachée. Tu vas la frapper avec le kini (le gros pog en métal).',
        art: svg(`<rect width="240" height="160" fill="#2a1450"/>${[0, 1, 2, 3, 4].map((i) => `<ellipse cx="120" cy="${110 - i * 6}" rx="44" ry="20" fill="${i % 2 ? '#5b2a86' : '#ff006e'}" stroke="#ffd34d" stroke-width="2"/>`).join('')}<g class="t-hover"><ellipse cx="120" cy="40" rx="38" ry="16" fill="#c5ccd6" stroke="#5a6270" stroke-width="3"/><path d="M120 30 l3 6 7 1 -5 4 1 7 -6 -3 -6 3 1 -7 -5 -4 7 -1z" fill="#e63946"/></g>`) },
      { title: '1. Viser', text: 'Le viseur se promène sur la pile : touche l\'écran quand il est bien au centre.',
        art: svg(`<rect width="240" height="160" fill="#2a1450"/><ellipse cx="120" cy="90" rx="60" ry="28" fill="#ff006e" stroke="#ffd34d" stroke-width="3"/><g class="t-wander"><circle cx="120" cy="90" r="9" fill="none" stroke="#fff" stroke-width="2"/><line x1="104" y1="90" x2="136" y2="90" stroke="#fff" stroke-width="2"/><line x1="120" y1="80" x2="120" y2="100" stroke="#fff" stroke-width="2"/></g>${finger('t-tap')}`) },
      { title: '2. La force', text: 'La jauge monte et descend : touche quand le curseur est dans la zone verte pour une frappe parfaite.',
        art: svg(`<rect width="240" height="160" fill="#2a1450"/><rect x="100" y="20" width="40" height="120" rx="10" fill="#3a86ff"/><rect x="100" y="20" width="40" height="50" rx="10" fill="#ff5a5a"/><rect x="96" y="36" width="48" height="22" fill="#7ee08a"/><rect class="t-gauge" x="92" y="130" width="56" height="5" fill="#fff"/>${finger('t-tap')}`) },
      { title: 'Gagner', text: 'Les pogs qui retombent face visible sont à toi ! Les autres retournent dans la pile. Celui qui en gagne le plus remporte la partie.',
        art: svg(`<rect width="240" height="160" fill="#2a1450"/><g class="t-flip"><ellipse cx="80" cy="80" rx="34" ry="16" fill="#ffbe0b" stroke="#fff" stroke-width="3"/><circle cx="80" cy="80" r="8" fill="#ff006e"/></g><ellipse cx="160" cy="95" rx="34" ry="16" fill="#5b2a86" stroke="#ffd34d" stroke-width="3"/><text x="80" y="130" class="t-lbl">gagné !</text><text x="160" y="140" class="t-lbl">retourne dans la pile</text>`) },
    ],
  },
  billard: {
    name: 'Billard américain',
    slides: [
      { title: 'Le but', text: 'Le premier qui rentre une bille joue cette famille : les pleines (1 à 7) ou les rayées (9 à 15). Rentre toutes les tiennes, puis la noire (8).',
        art: svg(`<rect width="240" height="160" rx="16" fill="#6b3a1c"/><rect x="14" y="14" width="212" height="132" rx="6" fill="#16794b"/>${ball(80, 70, 11, '#f5c400')}${ball(110, 60, 11, '#e0261b')}<circle cx="150" cy="70" r="11" fill="#fff"/><rect x="139" y="65" width="22" height="10" fill="#1d4fd8"/>${ball(130, 100, 11, '#111')}<circle cx="130" cy="100" r="5" fill="#fff"/><text x="95" y="130" class="t-lbl">pleines · rayées · 8</text>`) },
      { title: 'Viser', text: 'Glisse le doigt sur la table. La ligne montre où part la blanche, et le trait blanc où ira la bille touchée (rouge si ce n\'est pas ta bille).',
        art: svg(`<rect width="240" height="160" fill="#16794b"/><circle cx="60" cy="120" r="10" fill="#fff"/><line x1="60" y1="120" x2="152" y2="58" stroke="#fff" stroke-width="2" stroke-dasharray="5 5"/><circle cx="152" cy="58" r="10" fill="none" stroke="#fff" stroke-width="2"/>${ball(168, 48, 10, '#e0261b')}<line x1="168" y1="48" x2="205" y2="24" stroke="#fff" stroke-width="3"/><circle cx="220" cy="14" r="12" fill="#111"/>${finger('t-drag-table')}`) },
      { title: 'Frapper', text: 'Tire la jauge « TIRE » (à droite) vers le bas : plus tu descends, plus c\'est fort. Relâche pour frapper.',
        art: svg(`<rect width="240" height="160" fill="#16794b"/><circle cx="80" cy="100" r="10" fill="#fff"/><g class="t-cue"><rect x="0" y="97" width="66" height="6" rx="3" fill="#d7aa66"/></g><rect x="190" y="20" width="30" height="120" rx="10" fill="rgba(0,0,0,.45)"/><rect class="t-fill" x="194" y="24" width="22" height="0" rx="6" fill="#ffd34d"/>${finger('t-swipe-down-right')}`) },
      { title: 'Tour par tour', text: 'Tu rentres une de tes billes ? Tu rejoues. Sinon, c\'est à l\'adversaire.',
        art: svg(`<rect width="240" height="160" fill="#16794b"/><circle cx="200" cy="30" r="16" fill="#111"/><g class="t-pot">${ball(120, 90, 11, '#f5c400')}</g><text x="120" y="145" class="t-lbl">rentrée → tu rejoues</text>`) },
      { title: 'Les fautes', text: 'Blanche dans un trou, aucune bille touchée ou mauvaise bille touchée : l\'adversaire a la « bille en main » et place la blanche où il veut en la faisant glisser. Rentrer la 8 trop tôt = perdu !',
        art: svg(`<rect width="240" height="160" fill="#16794b"/><g class="t-place"><circle cx="0" cy="0" r="11" fill="#fff"/><circle cx="0" cy="0" r="18" fill="none" stroke="#fff" stroke-dasharray="4 4"/></g><text x="120" y="150" class="t-lbl">bille en main</text>`) },
    ],
  },
  petanque: {
    name: 'Pétanque',
    slides: [
      { title: 'Le but', text: 'Lance tes 3 boules le plus près possible du cochonnet, la petite boule orange.',
        art: svg(`<rect width="240" height="160" fill="#cdbb98"/><circle cx="130" cy="60" r="5" fill="#ff9f1c"/><circle cx="118" cy="72" r="11" fill="#c9d0d8" stroke="#4a525c" stroke-width="2"/><circle cx="150" cy="48" r="11" fill="#b08a5a" stroke="#3a2a18" stroke-width="2"/><line x1="130" y1="60" x2="118" y2="72" stroke="#fff" stroke-dasharray="3 3"/><g class="t-throw"><circle cx="120" cy="150" r="11" fill="#c9d0d8" stroke="#4a525c" stroke-width="2"/></g>`) },
      { title: 'Viser', text: 'Touche le terrain pour placer la cible blanche à l\'endroit où ta boule doit s\'arrêter.',
        art: svg(`<rect width="240" height="160" fill="#cdbb98"/><circle cx="120" cy="60" r="5" fill="#ff9f1c"/><g class="t-target"><circle r="14" fill="none" stroke="#fff" stroke-width="3"/><line x1="-22" y1="0" x2="-8" y2="0" stroke="#fff" stroke-width="3"/><line x1="8" y1="0" x2="22" y2="0" stroke="#fff" stroke-width="3"/></g>${finger('t-target-f')}`) },
      { title: 'Choisir son lancer', text: 'Roulette : la boule roule longtemps. Demi-portée : à mi-chemin. Plombée : elle tombe et s\'arrête net. Tir : pour dégommer une boule adverse !',
        art: svg(`<rect width="240" height="160" fill="#cdbb98"/><path d="M20 140 Q60 128 220 128" stroke="#5a4a30" stroke-width="2" fill="none" stroke-dasharray="4 4"/><path d="M20 140 Q90 70 130 128 L220 128" stroke="#3a86ff" stroke-width="2" fill="none"/><path d="M20 140 Q160 -20 200 128" stroke="#e63946" stroke-width="2" fill="none"/><text x="60" y="150" class="t-lbl">roulette</text><text x="110" y="88" class="t-lbl" fill="#3a86ff">demi-portée</text><text x="175" y="35" class="t-lbl" fill="#e63946">plombée</text>`) },
      { title: 'La précision', text: 'Après « Lancer », un curseur va et vient sur la jauge : touche quand il est au milieu, sur le vert. Plus tu es loin du centre, plus le lancer dévie.',
        art: svg(`<rect width="240" height="160" fill="#cdbb98"/><defs><linearGradient id="tg" x1="0" x2="1"><stop offset="0" stop-color="#ff5a5a"/><stop offset=".3" stop-color="#ffd34d"/><stop offset=".5" stop-color="#7ee08a"/><stop offset=".7" stop-color="#ffd34d"/><stop offset="1" stop-color="#ff5a5a"/></linearGradient></defs><rect x="30" y="60" width="180" height="24" rx="10" fill="url(#tg)"/><rect class="t-slide" x="118" y="54" width="4" height="36" fill="#fff"/>${finger('t-tap')}`) },
      { title: 'Les points', text: 'Celui qui n\'a pas le point rejoue. À la fin de la mène, tu marques un point par boule plus près que la meilleure boule adverse. Le premier à 13 (ou 7) gagne.',
        art: svg(`<rect width="240" height="160" fill="#cdbb98"/><circle cx="120" cy="80" r="5" fill="#ff9f1c"/><circle cx="105" cy="88" r="10" fill="#c9d0d8"/><circle cx="135" cy="66" r="10" fill="#c9d0d8"/><circle cx="160" cy="105" r="10" fill="#b08a5a"/><text x="120" y="140" class="t-lbl">2 points pour toi</text>`) },
    ],
  },
  snake: {
    name: 'Serpent',
    slides: [
      { title: 'Le but', text: 'Mange les billes : chacune s\'ajoute à ta queue avec sa couleur. Mange toutes celles du niveau pour gagner.',
        art: svg(`<rect width="240" height="160" fill="#2e6b3c"/><g class="t-slither">${['#ffbe0b', '#3a86ff', '#ff006e', '#06d6a0'].map((c, i) => ball(110 - i * 18, 80, 8 - i * 0.6, c)).join('')}<circle cx="128" cy="80" r="10" fill="#2ec27e"/><circle cx="132" cy="75" r="3" fill="#fff"/><circle cx="132" cy="85" r="3" fill="#fff"/></g>${ball(190, 80, 7, '#8338ec')}`) },
      { title: 'Tourner', text: 'Glisse le doigt vers le haut, le bas, la gauche ou la droite. Tu préfères une manette ? Choisis « Croix » dans les contrôles.',
        art: svg(`<rect width="240" height="160" fill="#2e6b3c"/><g transform="translate(170 80)"><rect x="-14" y="-44" width="28" height="28" rx="6" fill="#3b3f4a"/><rect x="-14" y="16" width="28" height="28" rx="6" fill="#3b3f4a"/><rect x="-44" y="-14" width="28" height="28" rx="6" fill="#3b3f4a"/><rect x="16" y="-14" width="28" height="28" rx="6" fill="#1f9d5a"/></g><path d="M40 100 L90 100 L90 60" stroke="#2ec27e" stroke-width="12" fill="none" stroke-linecap="round"/>${finger('t-swipe-x')}`) },
      { title: 'Attention', text: 'Interdit de toucher le cadre, les murs gris ou ton propre corps : c\'est perdu !',
        art: svg(`<rect width="240" height="160" fill="#b07a45"/><rect x="10" y="10" width="220" height="140" fill="#2e6b3c"/><rect x="110" y="40" width="20" height="80" fill="#8a929c"/><path d="M40 120 L40 60 L95 60" stroke="#2ec27e" stroke-width="12" fill="none" stroke-linecap="round"/><text x="120" y="30" text-anchor="middle" font-size="22" class="t-boom">💥</text>`) },
      { title: 'Astuces', text: 'La bille dorée vaut 3 mais disparaît vite. Trop rapide ? Choisis la vitesse « Lente » ou « Très lente ».',
        art: svg(`<rect width="240" height="160" fill="#2e6b3c"/><circle class="t-glow" cx="120" cy="70" r="26" fill="#ffd34d" opacity=".35"/>${ball(120, 70, 16, '#ffcc33')}<text x="120" y="130" text-anchor="middle" fill="#fff" font-weight="900" font-size="18">+3 🐢</text>`) },
    ],
  },
};

// ---------- Affichage ----------
let state = null;
export function showTutorial(id, onDone) {
  const t = TUTORIALS[id]; if (!t) { onDone?.(); return; }
  const md = document.getElementById('mdTuto');
  state = { t, i: 0, onDone };
  const render = () => {
    const s = t.slides[state.i], last = state.i === t.slides.length - 1;
    md.querySelector('.tuto-game').textContent = `Comment jouer · ${t.name}`;
    const art = md.querySelector('.tuto-art'); art.innerHTML = s.art; art.classList.remove('in'); void art.offsetWidth; art.classList.add('in');
    md.querySelector('.tuto-title').textContent = s.title;
    md.querySelector('.tuto-text').textContent = s.text;
    md.querySelector('.tuto-dots').innerHTML = t.slides.map((_, k) => `<i class="${k === state.i ? 'on' : ''}"></i>`).join('');
    md.querySelector('[data-t="prev"]').style.visibility = state.i ? 'visible' : 'hidden';
    md.querySelector('[data-t="next"]').textContent = last ? "C'est parti !" : 'Suivant';
  };
  const close = () => { md.classList.remove('show'); const cb = state?.onDone; state = null; cb?.(); };
  md.onclick = (e) => {
    const b = e.target.closest('[data-t]'); if (!b || !state) return;
    if (b.dataset.t === 'skip') return close();
    if (b.dataset.t === 'prev') state.i = Math.max(0, state.i - 1);
    if (b.dataset.t === 'next') { if (state.i === t.slides.length - 1) return close(); state.i++; }
    render();
  };
  // glisser pour changer d'écran
  let sx = null;
  md.onpointerdown = (e) => { sx = e.clientX; };
  md.onpointerup = (e) => {
    if (sx == null || !state) return; const dx = e.clientX - sx; sx = null;
    if (Math.abs(dx) < 50) return;
    if (dx < 0 && state.i < t.slides.length - 1) state.i++; else if (dx > 0 && state.i > 0) state.i--; else return;
    render();
  };
  render();
  md.classList.add('show');
}
export const tutorialOpen = () => !!state;
