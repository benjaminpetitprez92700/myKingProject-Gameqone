// Règles complètes + fiche de chaque figurine (avec son portrait 3D), pour l'accueil et le « ? » en partie.
import * as THREE from '../vendor/three.module.js';
import { PIECES } from './stratego/rules.js';
import { buildModel } from './stratego/game3d.js';

// déplacement et rôle de chaque figurine (règlement complet, 48 par camp)
const INFO = {
  corpsfranc: { grp: 'Combattants', move: '1 case dans les 8 directions. À sa toute première avance, il peut bondir tout droit de 2 ou 3 cases si le chemin est libre.', role: "Éclaireur rapide : va débusquer l'ennemi et découvrir ses vignettes. Le plus faible au combat." },
  sapeur: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Le seul qui désamorce les MINES et les BOMBES À RETARDEMENT sans sauter : il les prend comme une vignette ordinaire.' },
  parachutiste: { grp: 'Combattants', move: "1 case. Une fois par partie, il saute sur n'importe quelle case libre du camp ennemi (pas juste à côté de lui).", role: 'Après son saut, il peut attaquer tout de suite une vignette ennemie voisine. Idéal pour surprendre le drapeau !' },
  caporal: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat les grades 1 à 4.' },
  sergent: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat les grades 1 à 5.' },
  adjudant: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat les grades 1 à 6.' },
  adjudantchef: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat les grades 1 à 7.' },
  souslieutenant: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Premier officier : bat les grades 1 à 8.' },
  lieutenant: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat les grades 1 à 9.' },
  capitaine: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat les grades 1 à 10.' },
  commandant: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Officier supérieur : bat les grades 1 à 11.' },
  ltcolonel: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat les grades 1 à 12.' },
  colonel: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: 'Bat tout le monde sauf le Général.' },
  general: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: "Le plus fort de l'armée. Personne ne le bat… sauf un ESPION qui l'attaque. Attention : s'il est découvert, l'espion ennemi va le chercher !" },
  espion: { grp: 'Combattants', move: '1 case dans les 8 directions.', role: "Il perd contre tout le monde, mais c'est le seul qui prend le GÉNÉRAL ennemi en l'attaquant. Il bat aussi le matériel." },
  drapeau: { grp: 'À protéger', move: '1 case (ne peut pas attaquer).', role: "Objectif n°1 : si l'ennemi prend ton DRAPEAU et ton PLAN SECRET, tu as perdu. Cache-le au fond, sur une case blanche, entouré de mines." },
  plan: { grp: 'À protéger', move: '1 case (ne peut pas attaquer).', role: "Objectif n°2 : l'ennemi doit prendre le drapeau ET le plan pour gagner. Ni bombardiers ni bombes volantes ne peuvent le détruire." },
  mine: { grp: 'Pièges', move: 'Ne bouge jamais.', role: "Celui qui l'attaque saute avec elle (les deux disparaissent). Seul un SAPEUR la désamorce." },
  bomberet: { grp: 'Pièges', move: "Une fois par partie, elle se pose sur une case libre du camp ennemi. Sinon, elle ne bouge pas.", role: "Comme une mine : l'attaquant saute avec elle, sauf un SAPEUR. Posée chez l'ennemi, elle bloque un passage ou piège ses vignettes." },
  bombardier: { grp: 'Aviation et matériel', move: 'Ne bouge pas : il frappe à distance depuis chez toi.', role: "Bombarde n'importe quelle vignette ennemie posée sur une case NOIRE. Abattu s'il vise une D.C.A. ou un barrage. Sans effet sur le Général, le drapeau et le plan. Sans auto-citerne : un seul bombardement." },
  v1: { grp: 'Aviation et matériel', move: 'Glisse en ligne droite (8 directions), aussi loin que la voie est libre.', role: "Placée dans un couloir sans croix, on peut la LANCER : elle file tout droit et détruit toutes les vignettes ennemies de la colonne (sauf drapeau et plan). Un barrage l'arrête. Elle disparaît après le tir." },
  dca: { grp: 'Aviation et matériel', move: 'Glisse en ligne droite, mais reste dans ton camp.', role: "Défense anti-aérienne : abat le bombardier qui l'attaque. Place-les sur des cases noires pour protéger ce qui est derrière." },
  citerne: { grp: 'Aviation et matériel', move: 'Glisse en ligne droite (8 directions).', role: "Le carburant des bombardiers : tant qu'elle est là, ils frappent autant qu'ils veulent. Si elle est détruite, il ne reste plus qu'un seul bombardement." },
  barrage: { grp: 'Aviation et matériel', move: 'Glisse en ligne droite (8 directions).', role: "Barrage magnétique : abat les bombardiers et arrête les bombes volantes (il est détruit en stoppant la bombe)." },
};

const RULES = [
  ['🎯 Le but', "Prendre le <b>DRAPEAU</b> et le <b>PLAN SECRET</b> de l'adversaire. Tu gagnes aussi si l'ennemi n'a plus aucun combattant, ou s'il ne peut plus jouer."],
  ['🗺️ Le plateau', "12 colonnes et 10 rangées. Chaque armée occupe ses 4 rangées. Au centre, des <b>croix rouges</b> sont infranchissables : il reste 6 couloirs de passage. Les <b>cases noires</b> sont exposées aux bombardiers, les <b>blanches</b> sont à l'abri."],
  ['🧩 Le placement', "Chaque camp place ses 48 figurines en secret (automatiquement ou à la main). L'adversaire ne voit que des soldats sous une cape tant qu'ils ne sont pas découverts."],
  ['▶️ À ton tour', "Une seule action : <b>déplacer</b> une figurine, <b>attaquer</b>, <b>parachuter</b> / poser une bombe, <b>bombarder</b> ou <b>lancer</b> une bombe volante. Touche une figurine pour voir ses cases possibles."],
  ['⚔️ Le combat', "On attaque en avançant sur une case ennemie <b>voisine en ligne droite</b> (pas en diagonale). Les deux figurines sont révélées : le grade le plus fort gagne, <b>l'attaquant gagne en cas d'égalité</b>. Le gagnant prend la place du perdant. Le matériel (D.C.A., citerne, barrage, bombe volante, bombardier) est détruit par n'importe quel combattant."],
  ['💣 Mines et bombes', "Qui attaque une mine ou une bombe à retardement saute avec elle. Seul le <b>sapeur</b> les désamorce."],
  ['✈️ L\'aviation', "Le <b>bombardier</b> frappe à distance une vignette sur case noire. La <b>D.C.A.</b> et le <b>barrage</b> l'abattent. La <b>bombe volante</b> détruit toute une colonne."],
  ['🔁 Règle des deux cases', "Interdit de faire plus de 3 allers-retours de suite entre les deux mêmes cases."],
];

let thumbs = null;
// portraits 3D des figurines, calculés une fois
function makeThumbs() {
  if (thumbs) return thumbs;
  thumbs = {};
  try {
    const S = 220, r = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r.setSize(S, S); r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.3;
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight('#ffffff', '#55504a', 1.6));
    const d = new THREE.DirectionalLight('#fff2dc', 2.4); d.position.set(2, 4, 3); sc.add(d);
    const cam = new THREE.PerspectiveCamera(30, 1, 0.1, 50);
    for (const P of PIECES) {
      if (!P.n) continue;
      const m = buildModel(P.id, 0, true, 'france');
      m.traverse((o) => { if (o.isSprite) o.visible = false; });
      sc.add(m);
      const tall = ['drapeau', 'bombardier'].includes(P.id) ? 1.1 : 1;
      cam.position.set(1.45 * tall, 1.35 * tall, 2.45 * tall); cam.lookAt(0, 0.5, 0);
      r.render(sc, cam); thumbs[P.id] = r.domElement.toDataURL();
      sc.remove(m);
    }
    r.dispose();
  } catch (e) { /* sans 3D : pas d'images */ }
  return thumbs;
}

export function guideHTML() {
  const th = makeThumbs();
  const groups = {};
  for (const P of PIECES) if (P.n) (groups[INFO[P.id].grp] ||= []).push(P);
  const cards = Object.entries(groups).map(([g, list]) => `<h3 class="gd-grp">${g} <small>${list.reduce((a, p) => a + p.n, 0)} figurines</small></h3>
    <div class="gd-cards">${list.map((P) => `<div class="gd-card">
      <div class="gd-img">${th[P.id] ? `<img src="${th[P.id]}" alt="">` : ''}${P.kind === 'fight' ? `<i class="gd-rank">${P.r}</i>` : ''}<i class="gd-n">×${P.n}</i></div>
      <div class="gd-txt"><b>${P.name}</b><p><span>🚶</span>${INFO[P.id].move}</p><p><span>⭐</span>${INFO[P.id].role}</p></div></div>`).join('')}</div>`).join('');
  return `<div class="gd-rules">${RULES.map(([t, x]) => `<div class="gd-rule"><b>${t}</b><p>${x}</p></div>`).join('')}</div>
    <h2 class="gd-title">Les 48 figurines</h2>${cards}`;
}
