// Tutoriels illustrés et animés : un par jeu, affichés à la première ouverture puis via le bouton « ? ».

const finger = (cls) => `<g class="finger ${cls}"><circle class="pulse" r="13"/><circle r="8" fill="#fff"/><circle r="8" fill="none" stroke="#3a86ff" stroke-width="2"/></g>`;
const ball = (x, y, r, c, extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}" ${extra}/><circle cx="${x - r * 0.35}" cy="${y - r * 0.35}" r="${r * 0.3}" fill="#fff" opacity=".7"/>`;
const svg = (body) => `<svg viewBox="0 0 240 160" xmlns="http://www.w3.org/2000/svg">${body}</svg>`;
const green = (extra = '') => `<rect x="0" y="0" width="240" height="160" fill="#5c9e45"/><path d="M60 170 L60 40 Q60 20 80 20 L160 20 Q180 20 180 40 L180 170" fill="#3d9a47" stroke="#8a6038" stroke-width="7"/>${extra}`;

export const TUTORIALS = {
  island: {
    name: 'Archipel du Roi',
    slides: [
      { title: 'Le but', text: "Sois le premier à gagner 10 couronnes 👑 en construisant sur l'île. Hutte = 1 couronne, Fort = 2, Phare = +1.",
        art: svg(`<rect width="240" height="160" fill="#0b3a66"/>${[[90,60,'#3f8f3a','🌲'],[150,60,'#9b9488','🪨'],[120,108,'#e8c552','🌾']].map(([x,y,c,e])=>`<polygon points="${[0,1,2,3,4,5].map(i=>{const a=Math.PI/180*(60*i-30);return `${x+Math.cos(a)*32},${y+Math.sin(a)*32}`}).join(' ')}" fill="${c}" stroke="#e9d39a" stroke-width="3"/><text x="${x}" y="${y+8}" text-anchor="middle" font-size="22">${e}</text>`).join('')}<path d="M112 92 L112 80 L120 72 L128 80 L128 92 Z" fill="#3a86ff" stroke="#111" stroke-width="2"/>`) },
      { title: 'Le dé', text: "À ton tour, lance le dé. Chaque île qui porte ce numéro donne sa ressource aux huttes posées sur ses coins (2 pour un fort).",
        art: svg(`<rect width="240" height="160" fill="#0b3a66"/><rect x="40" y="50" width="56" height="56" rx="10" fill="#fff"/>${[[-1,-1],[1,-1],[0,0],[-1,1],[1,1]].map(([a,b])=>`<circle cx="${68+a*15}" cy="${78+b*15}" r="5" fill="#111"/>`).join('')}<circle cx="168" cy="78" r="26" fill="#fff8e1" stroke="#3a2600" stroke-width="2"/><text x="168" y="88" text-anchor="middle" font-size="26" font-weight="900" fill="#d62828">5</text><text x="120" y="140" class="t-lbl">+1 🌲</text>`) },
      { title: 'Construire', text: "Chemin : 🌲🪨. Hutte : 🌲🌾🐟 (au bout de tes chemins, jamais collée à une autre hutte). Fort : 🪨🪨🌾🌾 (améliore une hutte). Phare : 🐟🐟🪨🌲 sur une hutte au bord de la mer, il t'offre 1 🐟 à chaque tour.",
        art: svg(`<rect width="240" height="160" fill="#241a45"/>${[['🛤️','Chemin'],['🛖','Hutte'],['🏰','Fort'],['🗼','Phare']].map(([e,n],i)=>`<text x="${36+i*56}" y="82" text-anchor="middle" font-size="30">${e}</text><text x="${36+i*56}" y="118" class="t-lbl">${n}</text>`).join('')}`) },
      { title: 'Volcan et échanges', text: "Si le dé montre le 🌋 : éruption ! Pose le nuage de cendres sur une île : elle ne produit plus, et tu voles 1 ressource à un adversaire installé dessus. Échange 4 ressources contre 1, ou 2 contre 1 avec un port.",
        art: svg(`<rect width="240" height="160" fill="#3a1d14"/><text x="120" y="80" text-anchor="middle" font-size="50">🌋</text><text x="120" y="130" class="t-lbl">éruption !</text>`) },
    ],
  },

  rami: {
    name: 'Rami à Contrats',
    slides: [
      { title: 'Le but', text: "6 manches, chacune avec un CONTRAT à poser : par exemple « 2 brelans » ou « 1 brelan + 1 suite de 4 ». Le premier qui vide sa main gagne la manche.",
        art: svg(`<rect width="240" height="160" fill="#7a2338"/><rect x="50" y="50" width="140" height="56" rx="12" fill="rgba(0,0,0,.4)" stroke="#ffd34d" stroke-width="3"/><text x="120" y="74" text-anchor="middle" font-size="11" fill="#f5dbe3">Contrat de la manche</text><text x="120" y="94" text-anchor="middle" font-size="15" font-weight="900" fill="#ffd34d">2 brelans</text>`) },
      { title: 'Brelans et suites', text: "Brelan : 3 cartes (ou plus) de même valeur. Suite : 4 cartes (ou plus) qui se suivent dans la même couleur. Le Joker remplace n'importe quelle carte.",
        art: svg(`<rect width="240" height="160" fill="#241a45"/>${[['7','♥'],['7','♠'],['7','♦']].map(([r,c],i)=>`<rect x="${14+i*30}" y="40" width="26" height="38" rx="3" fill="#fff"/><text x="${27+i*30}" y="64" text-anchor="middle" font-size="13" font-weight="900" fill="${c==='♠'?'#111':'#c1121f'}">${r}${c}</text>`).join('')}${[['4'],['5'],['🃏'],['7']].map(([r],i)=>`<rect x="${120+i*28}" y="40" width="26" height="38" rx="3" fill="#fff"/><text x="${133+i*28}" y="64" text-anchor="middle" font-size="12" font-weight="900" fill="#111">${r}${r==='🃏'?'':'♣'}</text>`).join('')}<text x="56" y="108" class="t-lbl">brelan</text><text x="176" y="108" class="t-lbl">suite</text>`) },
      { title: 'À ton tour', text: "1) Pioche ou prends la défausse. 2) Sélectionne des cartes et touche « Grouper » pour préparer le contrat, puis « Poser le contrat ». 3) Défausse-toi d'une carte.",
        art: svg(`<rect width="240" height="160" fill="#7a2338"/>${[0,1,2,3,4].map(i=>`<rect x="${40+i*34}" y="${i===1||i===2?50:62}" width="30" height="44" rx="4" fill="#fff" stroke="${i===1||i===2?'#ffd34d':'#222'}" stroke-width="${i===1||i===2?3:1}"/>`).join('')}${finger('t-tap')}`) },
      { title: 'Compléter et finir', text: "Après avoir posé ton contrat, tu peux ajouter tes cartes sur N'IMPORTE QUELLE combinaison de la table. Vide ta main ! Les cartes restantes coûtent des points : 2 à 9 = 5, 10 à Roi = 10, As = 15, Joker = 25.",
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="120" y="70" text-anchor="middle" font-size="34" fill="#ffd34d" font-weight="900">0 carte</text><text x="120" y="110" class="t-lbl">= manche gagnée !</text>`) },
    ],
  },

  golfcards: {
    name: 'Cartes Cachées',
    slides: [
      { title: 'Le but', text: "Avoir le MOINS de points possible après 6 manches. Chacun a une grille de cartes face cachée (tu choisis le nombre de colonnes et de lignes, et de 2 à 4 joueurs). Au début, retourne-en 2.",
        art: svg(`<rect width="240" height="160" fill="#1f7a4c"/>${[0,1,2,3].map(c=>[0,1].map(r=>`<rect x="${44+c*40}" y="${30+r*52}" width="32" height="46" rx="4" fill="${c+r===1||c===3&&r===0?'#fff':'#5b2a86'}" stroke="#111"/>`).join('')).join('')}${finger('t-tap')}`) },
      { title: 'À ton tour', text: "Pioche une carte cachée, ou prends celle de la défausse. Échange-la avec une de tes cartes. Si tu as pioché et qu'elle ne te plaît pas, jette-la et retourne une de tes cartes cachées.",
        art: svg(`<rect width="240" height="160" fill="#1f7a4c"/><rect x="50" y="40" width="44" height="62" rx="5" fill="#5b2a86" stroke="#111"/><rect x="146" y="40" width="44" height="62" rx="5" fill="#fff" stroke="#111"/><text x="168" y="80" text-anchor="middle" font-size="22" font-weight="900" fill="#c1121f">3</text><text x="72" y="125" class="t-lbl">pioche</text><text x="168" y="125" class="t-lbl">défausse</text>`) },
      { title: 'Les valeurs', text: "Joker −5, 2 = −2, Roi = 0, As = 1, 3 à 10 = leur valeur, Valet et Dame = 10. Une colonne entière de cartes identiques vaut 0 !",
        art: svg(`<rect width="240" height="160" fill="#241a45"/>${[['🃏','−5'],['2','−2'],['R','0'],['A','1'],['D','10']].map(([c,v],i)=>`<rect x="${14+i*44}" y="40" width="36" height="52" rx="5" fill="#fff"/><text x="${32+i*44}" y="74" text-anchor="middle" font-size="18" font-weight="900" fill="#c1121f">${c}</text><text x="${32+i*44}" y="115" class="t-lbl">${v}</text>`).join('')}`) },
      { title: 'Fin de manche', text: "Quand un joueur a retourné toutes ses cartes, l'autre joue une dernière fois, puis on compte. Attention : celui qui ferme sans avoir le plus petit score voit ses points doublés !",
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="120" y="80" text-anchor="middle" font-size="40" fill="#ffd34d" font-weight="900">×2 ?</text>`) },
    ],
  },

  tower: {
    name: 'Défense du Royaume',
    slides: [
      { title: 'Le but', text: "Des ennemis avancent sur la route vers ton château. S'ils l'atteignent, tu perds des vies. Tiens toutes les vagues pour gagner !",
        art: svg(`<rect width="240" height="160" fill="#5f9a3c"/><path d="M0 50 L150 50 L150 120 L240 120" stroke="#c9a46a" stroke-width="26" fill="none"/><g class="t-slither"><circle cx="60" cy="50" r="9" fill="#c0392b"/><circle cx="35" cy="50" r="8" fill="#f39c12"/></g><rect x="196" y="98" width="34" height="30" fill="#9aa0a8"/><path d="M196 98 L213 84 L230 98" fill="#c0392b"/>`) },
      { title: 'Construire', text: "Touche une case d'herbe, puis choisis une tour. Chaque ennemi vaincu rapporte de l'or.",
        art: svg(`<rect width="240" height="160" fill="#5f9a3c"/><rect x="96" y="50" width="48" height="48" fill="none" stroke="#ffd34d" stroke-width="3"/><circle cx="120" cy="74" r="18" fill="#a8a296"/><circle cx="120" cy="74" r="10" fill="#555c66"/>${finger('t-tap')}`) },
      { title: 'Les 4 tours', text: "Archers : rapides. Canon : dégâts de zone mais ne touche pas les chauves-souris. Givre : ralentit. Éclair : frappe plusieurs ennemis à la fois.",
        art: svg(`<rect width="240" height="160" fill="#241a45"/>${[['#8b5a2b','Arc'],['#555c66','Canon'],['#4fb3e8','Givre'],['#a35cff','Éclair']].map(([c,n],i)=>`<circle cx="${40+i*54}" cy="70" r="20" fill="#a8a296"/><circle cx="${40+i*54}" cy="70" r="11" fill="${c}"/><text x="${40+i*54}" y="112" class="t-lbl">${n}</text>`).join('')}`) },
      { title: 'Améliorer', text: "Touche une tour pour l'améliorer (3 niveaux) ou la vendre. Puis lance la vague suivante quand tu es prêt. ⏩ accélère le jeu.",
        art: svg(`<rect width="240" height="160" fill="#241a45"/><circle cx="120" cy="70" r="26" fill="#a8a296"/><circle cx="120" cy="70" r="14" fill="#8b5a2b"/>${[0,1,2].map(i=>`<circle cx="${104+i*16}" cy="110" r="6" fill="#ffd34d"/>`).join('')}<text x="120" y="148" class="t-lbl">niveau 3</text>`) },
    ],
  },

  stratego: {
    name: 'Guerre Éclair',
    slides: [
      { title: 'Le but', text: "Capture le drapeau ennemi, caché parmi ses 40 pièces. Tu vois tes pièces, mais pas celles de l'adversaire (sauf celles déjà révélées).",
        art: svg(`<rect width="240" height="160" fill="#5f7a3a"/>${[0,1,2,3,4,5].map(i=>`<rect x="${20+i*34}" y="20" width="28" height="28" rx="5" fill="#1f4e9e"/>`).join('')}<rect x="30" y="110" width="30" height="30" rx="5" fill="#b3261e"/><rect x="33" y="113" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="45" y="131" text-anchor="middle" font-size="12" font-weight="900" fill="#333">10</text><rect x="70" y="110" width="30" height="30" rx="5" fill="#b3261e"/><rect x="73" y="113" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="85" y="131" text-anchor="middle" font-size="12" font-weight="900" fill="#333">9</text><rect x="110" y="110" width="30" height="30" rx="5" fill="#b3261e"/><rect x="113" y="113" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="125" y="131" text-anchor="middle" font-size="12" font-weight="900" fill="#333">B</text><rect x="150" y="110" width="30" height="30" rx="5" fill="#b3261e"/><rect x="153" y="113" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="165" y="131" text-anchor="middle" font-size="12" font-weight="900" fill="#333">D</text><rect x="190" y="110" width="30" height="30" rx="5" fill="#b3261e"/><rect x="193" y="113" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="205" y="131" text-anchor="middle" font-size="12" font-weight="900" fill="#333">2</text><rect x="80" y="62" width="28" height="28" rx="6" fill="#3fa2d6"/><rect x="132" y="62" width="28" height="28" rx="6" fill="#3fa2d6"/>`) },
      { title: 'Placer ses pièces', text: 'Au début, touche deux de tes pièces pour les échanger, ou « Mélanger ». Astuce : cache le drapeau au fond, entouré de bombes. Puis « Prêt ».',
        art: svg(`<rect width="240" height="160" fill="#5f7a3a"/><rect x="60" y="60" width="30" height="30" rx="5" fill="#b3261e"/><rect x="63" y="63" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="75" y="81" text-anchor="middle" font-size="12" font-weight="900" fill="#333">D</text><rect x="100" y="60" width="30" height="30" rx="5" fill="#b3261e"/><rect x="103" y="63" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="115" y="81" text-anchor="middle" font-size="12" font-weight="900" fill="#333">B</text><rect x="140" y="60" width="30" height="30" rx="5" fill="#b3261e"/><rect x="143" y="63" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="155" y="81" text-anchor="middle" font-size="12" font-weight="900" fill="#333">B</text><rect x="100" y="100" width="30" height="30" rx="5" fill="#b3261e"/><rect x="103" y="103" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="115" y="121" text-anchor="middle" font-size="12" font-weight="900" fill="#333">B</text>${finger('t-tap')}`) },
      { title: 'Se déplacer', text: "Une case à la fois, jamais en diagonale ni dans l'eau. L'éclaireur (2) peut filer en ligne droite. Les bombes et le drapeau ne bougent jamais.",
        art: svg(`<rect width="240" height="160" fill="#5f7a3a"/><rect x="105" y="65" width="30" height="30" rx="5" fill="#b3261e"/><rect x="108" y="68" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="120" y="86" text-anchor="middle" font-size="12" font-weight="900" fill="#333">6</text><circle cx="120" cy="50" r="5" fill="#fff"/><circle cx="120" cy="110" r="5" fill="#fff"/><circle cx="90" cy="80" r="5" fill="#fff"/><circle cx="150" cy="80" r="5" fill="#fff"/>`) },
      { title: 'Le combat', text: "Va sur une pièce ennemie pour l'attaquer : les deux sont révélées et la plus forte gagne (égalité : les deux tombent). L'espion bat le maréchal s'il attaque, le démineur désamorce les bombes, toute autre pièce saute sur une bombe.",
        art: svg(`<rect width="240" height="160" fill="#111"/><rect x="50" y="60" width="30" height="30" rx="5" fill="#b3261e"/><rect x="53" y="63" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="65" y="81" text-anchor="middle" font-size="12" font-weight="900" fill="#333">8</text><rect x="160" y="60" width="30" height="30" rx="5" fill="#1f4e9e"/><rect x="163" y="63" width="24" height="24" rx="3" fill="#f4ecd8"/><text x="175" y="81" text-anchor="middle" font-size="12" font-weight="900" fill="#333">6</text><text x="120" y="88" text-anchor="middle" fill="#fff" font-weight="900" font-size="20">VS</text><text x="120" y="140" class="t-lbl">la plus forte gagne</text>`) },
      { title: 'À deux', text: "En mode 2 joueurs, passe le téléphone à chaque tour : l'écran se cache pour que l'autre ne voie pas tes pièces.",
        art: svg(`<rect width="240" height="160" fill="#0b0f08"/><text x="120" y="80" text-anchor="middle" font-size="44">📱</text><text x="120" y="125" class="t-lbl">Passe le téléphone</text>`) },
    ],
  },
  math: {
    name: 'Calcul mental',
    slides: [
      { title: 'Choisis ton calcul', text: 'Addition, soustraction, multiplication ou mélange, puis le niveau de 1 à 5. Réussis un niveau pour débloquer le suivant.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/>${['+','−','×','±'].map((o,i)=>`<rect x="${20+i*52}" y="40" width="44" height="44" rx="10" fill="${['#06d6a0','#3a86ff','#ff006e','#ffbe0b'][i]}"/><text x="${42+i*52}" y="72" text-anchor="middle" font-size="26" font-weight="900" fill="#fff">${o}</text>`).join('')}`) },
      { title: 'Réponds au clavier', text: 'Tape le résultat avec les grosses touches, ⌫ pour effacer, puis ✓ pour valider.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="120" y="40" text-anchor="middle" font-size="24" font-weight="900" fill="#fff">7 × 8 = 56</text>${[0,1,2].map(r=>[0,1,2].map(c=>`<rect x="${78+c*30}" y="${55+r*30}" width="26" height="26" rx="6" fill="${r===2&&c===2?'#ffd34d':'rgba(255,255,255,.18)'}"/>`).join('')).join('')}${finger('t-tap')}`) },
      { title: 'Les étoiles', text: '10 questions par niveau. 10 bonnes réponses : 3 étoiles, 8 : 2 étoiles, 6 : 1 étoile. En cas d\'erreur, la bonne réponse s\'affiche.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="120" y="80" text-anchor="middle" font-size="44" class="t-stars">★★★</text><text x="120" y="120" class="t-lbl">10 / 10</text>`) },
    ],
  },
  dictee: {
    name: 'Dictée',
    slides: [
      { title: 'Écoute', text: 'Une voix lit un mot. Appuie sur 🔊 pour le réentendre, ou sur 🐢 pour l\'entendre lentement.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><circle class="t-glow" cx="120" cy="70" r="34" fill="#8338ec"/><path d="M104 60 L112 60 L124 50 L124 90 L112 80 L104 80 Z" fill="#fff"/><path d="M132 58 Q142 70 132 82" stroke="#fff" stroke-width="4" fill="none"/>`) },
      { title: 'Écris le mot', text: 'Tape le mot avec le clavier, accents compris (é, è, ê, à, ç, œ…), puis ✓ pour valider.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><rect x="40" y="26" width="160" height="36" rx="10" fill="rgba(255,255,255,.1)"/><text x="120" y="51" text-anchor="middle" font-size="20" fill="#fff" font-weight="800">château</text>${['é','è','ê','à','ç','ô'].map((k,i)=>`<rect x="${30+i*31}" y="90" width="27" height="30" rx="6" fill="rgba(255,255,255,.18)"/><text x="${43+i*31}" y="111" text-anchor="middle" fill="#fff" font-size="15">${k}</text>`).join('')}`) },
      { title: 'La correction', text: 'Si c\'est faux, le mot s\'affiche avec les lettres à corriger soulignées. 5 niveaux, du CP au CM2.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="120" y="70" text-anchor="middle" font-size="26" fill="#fff" font-weight="900">ch<tspan text-decoration="underline" fill="#ff6b6b">â</tspan>teau</text><text x="120" y="115" class="t-lbl">la lettre soulignée était fausse</text>`) },
    ],
  },

  chess: {
    name: 'Échecs',
    slides: [
      { title: 'Le but', text: "Mets le roi adverse en échec et mat : il est attaqué et ne peut plus s'échapper. Contre l'ordi, tu joues les blancs et tu commences.",
        art: svg(`<rect width="240" height="160" fill="#3a2a1e"/>${[0,1,2,3,4,5].map(c=>[0,1,2,3].map(r=>`<rect x="${30+c*30}" y="${20+r*30}" width="30" height="30" fill="${(r+c)%2?'#a8703f':'#ecd3a5'}"/>`).join('')).join('')}<text x="135" y="72" text-anchor="middle" font-size="30" fill="#111">♚&#xFE0E;</text><text x="105" y="102" text-anchor="middle" font-size="28" fill="#fff" stroke="#2b1a0c" stroke-width="1.5">♛&#xFE0E;</text><circle class="t-glow" cx="135" cy="62" r="17" fill="none" stroke="#ff3b3b" stroke-width="3"/>`) },
      { title: 'Jouer un coup', text: 'Touche une de tes pièces : les points verts montrent où elle peut aller. Touche ensuite la case d\'arrivée.',
        art: svg(`<rect width="240" height="160" fill="#3a2a1e"/>${[0,1,2,3,4,5].map(c=>[0,1,2,3].map(r=>`<rect x="${30+c*30}" y="${20+r*30}" width="30" height="30" fill="${(r+c)%2?'#a8703f':'#ecd3a5'}"/>`).join('')).join('')}<rect x="90" y="110" width="30" height="30" fill="rgba(80,200,120,.55)"/><text x="105" y="133" text-anchor="middle" font-size="24" fill="#fff" stroke="#2b1a0c">♞&#xFE0E;</text><circle cx="75" cy="65" r="5" fill="rgba(20,120,60,.7)"/><circle cx="135" cy="65" r="5" fill="rgba(20,120,60,.7)"/><circle cx="165" cy="95" r="5" fill="rgba(20,120,60,.7)"/>${finger('t-tap')}`) },
      { title: 'Les coups spéciaux', text: 'Tout est géré : le roque (le roi bouge de 2 cases), la prise en passant, et la promotion d\'un pion arrivé au bout (tu choisis la pièce).',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="60" y="80" text-anchor="middle" font-size="40" fill="#fff">♔&#xFE0E;</text><text x="120" y="80" text-anchor="middle" font-size="40" fill="#fff">♖&#xFE0E;</text><text x="185" y="80" text-anchor="middle" font-size="40" fill="#ffd34d">♙&#xFE0E;→♕&#xFE0E;</text><text x="90" y="120" class="t-lbl">roque</text><text x="185" y="120" class="t-lbl">promotion</text>`) },
      { title: 'Les boutons', text: '« Annuler le coup » revient en arrière (contre l\'ordi, ça annule aussi sa réponse). « Abandonner » termine la partie.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><rect x="20" y="60" width="96" height="40" rx="12" fill="none" stroke="#fff" stroke-opacity=".4"/><text x="68" y="85" text-anchor="middle" fill="#fff" font-weight="800" font-size="13">↶ Annuler</text><rect x="124" y="60" width="96" height="40" rx="12" fill="none" stroke="#fff" stroke-opacity=".4"/><text x="172" y="85" text-anchor="middle" fill="#fff" font-weight="800" font-size="13">🏳 Abandonner</text>`) },
    ],
  },
  tarot: {
    name: 'Tarot à 5',
    slides: [
      { title: 'Les joueurs', text: 'Saisis les prénoms des 5 joueurs. La partie est sauvegardée : tu peux fermer l\'appli et la reprendre plus tard.',
        art: svg(`<rect width="240" height="160" fill="#0f3d2c"/>${[0,1,2,3,4].map(i=>{const a=-Math.PI/2+i*2*Math.PI/5;return `<circle cx="${120+Math.cos(a)*55}" cy="${82+Math.sin(a)*50}" r="16" fill="#ffd34d"/><text x="${120+Math.cos(a)*55}" y="${87+Math.sin(a)*50}" text-anchor="middle" font-weight="900" fill="#3a2600">${i+1}</text>`}).join('')}<ellipse cx="120" cy="82" rx="30" ry="22" fill="#1d6b4c"/>`) },
      { title: 'Chaque manche', text: 'Après chaque donne, appuie sur « Nouvelle manche » : qui a pris, avec qui (le roi appelé, ou « Seul »), le contrat, le nombre de bouts et les points faits par l\'attaque.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><rect x="30" y="20" width="180" height="120" rx="12" fill="#1a1233"/>${['Preneur','Appelé','Garde ×2','2 bouts · 41'].map((t,i)=>`<rect x="44" y="${32+i*26}" width="152" height="20" rx="6" fill="${i===2?'#ffd34d':'rgba(255,255,255,.1)'}"/><text x="120" y="${46+i*26}" text-anchor="middle" font-size="11" font-weight="800" fill="${i===2?'#2a2100':'#fff'}">${t}</text>`).join('')}`) },
      { title: 'Le calcul', text: 'L\'appli calcule tout : (25 + écart) × contrat, petit au bout, poignée et chelem. Le preneur gagne ou perd le double, l\'appelé la mise, chaque défenseur l\'inverse. Seul, le preneur prend ×4.',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><text x="120" y="60" text-anchor="middle" fill="#7ee08a" font-size="26" font-weight="900">+132</text><text x="60" y="110" text-anchor="middle" fill="#7ee08a" font-size="18" font-weight="900">+66</text><text x="180" y="110" text-anchor="middle" fill="#ff6b6b" font-size="18" font-weight="900">−66 ×3</text><text x="120" y="80" class="t-lbl">preneur</text><text x="60" y="128" class="t-lbl">appelé</text><text x="180" y="128" class="t-lbl">défense</text>`) },
      { title: 'Le podium', text: 'Touche une manche pour la corriger. Quand vous avez fini, appuie sur « Terminé » pour afficher le podium !',
        art: svg(`<rect width="240" height="160" fill="#241a45"/><rect x="95" y="70" width="50" height="70" fill="#ffd34d"/><rect x="40" y="95" width="50" height="45" fill="#c9d0d8"/><rect x="150" y="110" width="50" height="30" fill="#cd7f32"/><text x="120" y="60" text-anchor="middle" font-size="24" class="t-stars">🏆</text><text x="120" y="110" text-anchor="middle" font-weight="900" font-size="22" fill="#3a2600">1</text>`) },
    ],
  },

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
