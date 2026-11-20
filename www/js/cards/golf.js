// Cartes Cachées : le Golf, jeu de cartes traditionnel. Chaque joueur a 8 cartes (2 rangées de 4)
// face cachée ; on pioche et on échange pour avoir le moins de points. Deux cartes identiques
// l'une au-dessus de l'autre s'annulent (0 point). La manche s'arrête quand quelqu'un a tout retourné.
import { deck, shuffle, cardHTML } from './cards.js';
import { fx } from '../fx.js';

const ROUNDS = 6;
export const VALUE = (c) => (c.r === 'J' ? -5 : c.r === 'A' ? 1 : c.r === '2' ? -2 : c.r === 'R' ? 0 : c.r === 'V' || c.r === 'D' ? 10 : +c.r);
const AI_NOISE = { facile: 0.45, moyen: 0.2, difficile: 0.05 };

export function gridScore(grid, revealAll = false) {
  let s = 0;
  for (let c = 0; c < 4; c++) {
    const a = grid[c], b = grid[c + 4];
    const aV = revealAll || a.up, bV = revealAll || b.up;
    if (aV && bV && a.card.r === b.card.r) continue;   // colonne de deux cartes identiques = 0
    if (aV) s += VALUE(a.card); if (bV) s += VALUE(b.card);
  }
  return s;
}

export class CardGolf {
  constructor(canvas, hud) {
    this.canvas = canvas; this.hud = hud; this.dom = document.getElementById('arenaDom');
    this.running = false; this.paused = false;
  }
  resize() { this._felt(); }
  setPaused(p) { this.paused = p; }
  stop() { this.running = false; this.dom.innerHTML = ''; this.dom.classList.remove('show'); this.hud.controls(null); clearTimeout(this.aiT); }

  _felt() {
    const c = this.canvas, d = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    c.width = w * d; c.height = h * d;
    const g = c.getContext('2d'); g.scale(d, d);
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.75);
    gr.addColorStop(0, '#1f7a4c'); gr.addColorStop(1, '#0a2a19');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.03)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    this.ai = opts.mode === 'ai';
    this.totals = [0, 0]; this.round = 0;
    this.running = true; this.paused = false;
    this.dom.classList.add('show');
    this._felt();
    this._newRound();
  }

  _newRound() {
    this.round++;
    this.pile = shuffle(deck(2, 4));
    this.players = [0, 1].map(() => Array.from({ length: 8 }, () => ({ card: this.pile.pop(), up: false })));
    this.discard = [this.pile.pop()];
    this.drawn = null; this.drawnFrom = null; this.closer = null; this.lastTurns = null;
    this.phase = 'peek'; this.peek = [0, 0];
    this.turn = (this.round - 1) % 2;
    // l'ordi retourne ses 2 cartes tout de suite
    if (this.ai) { for (const i of this._rand2()) this.players[1][i].up = true; this.peek[1] = 2; }
    this.hud.toast(`Manche ${this.round} / ${ROUNDS} : retourne 2 cartes`, 1600);
    this._render();
  }
  _rand2() { const a = [0, 1, 2, 3, 4, 5, 6, 7].sort(() => Math.random() - 0.5); return a.slice(0, 2); }

  _isHuman(p) { return !this.ai || p === 0; }

  // ---------- Actions ----------
  _tapGrid(p, i) {
    if (this.paused) return;
    const cell = this.players[p][i];
    if (this.phase === 'peek') {
      if (!this._isHuman(p) || cell.up || this.peek[p] >= 2) return;
      // à deux : chacun retourne ses 2 cartes au début
      cell.up = true; this.peek[p]++; fx.flip();
      if (this.peek[0] >= 2 && this.peek[1] >= 2) { this.phase = 'draw'; this._nextTurnStart(); }
      return this._render();
    }
    if (p !== this.turn || !this._isHuman(p)) return;
    if (this.phase === 'place') this._swap(p, i);
    else if (this.phase === 'flip' && !cell.up) { cell.up = true; fx.flip(); this._endTurn(); }
  }

  _draw(from) {
    if (this.paused || this.phase !== 'draw' || !this._isHuman(this.turn)) return;
    if (from === 'pile') { this.drawn = this.pile.pop(); this.drawnFrom = 'pile'; }
    else { this.drawn = this.discard.pop(); this.drawnFrom = 'discard'; }
    fx.tap();
    this.phase = 'place';
    this._render();
  }

  _swap(p, i) {
    const cell = this.players[p][i];
    this.discard.push(cell.card);
    cell.card = this.drawn; cell.up = true;
    this.drawn = null; fx.flip(2);
    this._endTurn();
  }

  _throwDrawn() {
    if (this.phase !== 'place' || this.drawnFrom !== 'pile') return;
    this.discard.push(this.drawn); this.drawn = null;
    fx.tap();
    if (this.players[this.turn].every((c) => c.up)) return this._endTurn();
    this.phase = 'flip';
    this._render();
  }

  _endTurn() {
    const p = this.turn;
    if (!this.pile.length) { this.pile = shuffle(this.discard.splice(0, this.discard.length - 1)); }
    if (this.lastTurns != null) { this.lastTurns--; if (this.lastTurns <= 0) return this._endRound(); }
    else if (this.players[p].every((c) => c.up)) {
      this.closer = p; this.lastTurns = 1;
      this.hud.toast(`${this.names[p]} a tout retourné : dernier tour !`, 1600);
    }
    this.turn = 1 - p; this.phase = 'draw';
    this._nextTurnStart();
    this._render();
  }

  _nextTurnStart() {
    if (!this._isHuman(this.turn)) this.aiT = setTimeout(() => this._aiPlay(), 900);
  }

  _endRound() {
    for (const pl of this.players) for (const c of pl) c.up = true;
    const sc = this.players.map((g) => gridScore(g, true));
    // celui qui ferme mais n'a pas le plus petit score voit ses points doublés (s'ils sont positifs)
    if (this.closer != null && sc[this.closer] > 0 && sc[this.closer] >= sc[1 - this.closer]) sc[this.closer] *= 2;
    sc.forEach((v, k) => (this.totals[k] += v));
    this.phase = 'roundEnd';
    this._render();
    this.hud.toast(`Manche ${this.round} : ${this.names[0]} ${sc[0] > 0 ? '+' : ''}${sc[0]}, ${this.names[1]} ${sc[1] > 0 ? '+' : ''}${sc[1]}`, 2600);
    fx.star(1);
    setTimeout(() => {
      if (!this.running) return;
      if (this.round >= ROUNDS) return this._endGame();
      this._newRound();
    }, 3200);
  }

  _endGame() {
    const [a, b] = this.totals, w = a === b ? null : a < b ? 0 : 1;
    w === 0 || (!this.ai && w != null) ? fx.win() : fx.lose();
    this.hud.end({ won: this.ai ? w === 0 : true, winner: w,
      title: w == null ? 'Égalité !' : this.ai ? (w === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
      text: `Score final (le plus petit gagne) : ${this.names[0]} ${a} · ${this.names[1]} ${b}.` });
  }

  // ---------- IA ----------
  _aiPlay() {
    if (!this.running) return;
    if (this.paused) { this.aiT = setTimeout(() => this._aiPlay(), 400); return; }
    const me = this.players[1], noise = AI_NOISE[this.opts.level];
    // gain espéré si on place une carte c à l'emplacement i
    const gain = (c, i) => {
      const cell = me[i], col = i % 4, other = me[i < 4 ? i + 4 : i - 4];
      const before = cell.up ? VALUE(cell.card) : 5;
      let after = VALUE(c.card ?? c);
      const card = c.card ?? c;
      if (other.up && other.card.r === card.r) after = -VALUE(other.card);   // on forme une paire : la colonne vaut 0
      if (cell.up && other.up && other.card.r === cell.card.r) return -99;    // ne casse pas une paire
      return before - after + (Math.random() - 0.5) * noise * 10;
    };
    const bestSpot = (c) => { let b = null; for (let i = 0; i < 8; i++) { const g2 = gain(c, i); if (!b || g2 > b.g) b = { i, g: g2 }; } return b; };
    const top = this.discard[this.discard.length - 1];
    const fromDiscard = bestSpot(top);
    if (fromDiscard.g > 2.5) {
      this.drawn = this.discard.pop(); this.drawnFrom = 'discard'; this._render();
      setTimeout(() => this.running && this._swap(1, fromDiscard.i), 700);
      return;
    }
    this.drawn = this.pile.pop(); this.drawnFrom = 'pile'; this._render();
    setTimeout(() => {
      if (!this.running) return;
      const s = bestSpot(this.drawn);
      if (s.g > 0.5) return this._swap(1, s.i);
      this.discard.push(this.drawn); this.drawn = null;
      const hidden = me.map((c, i) => (!c.up ? i : -1)).filter((i) => i >= 0);
      if (hidden.length) me[hidden[Math.floor(Math.random() * hidden.length)]].up = true;
      fx.flip(); this._endTurn();
    }, 750);
  }

  // ---------- Rendu (DOM) ----------
  _render() {
    if (!this.running) return;
    const P = this.players, cur = this.turn;
    const grid = (p, size) => `<div class="cg-grid ${p === cur && this.phase !== 'peek' && this.phase !== 'roundEnd' ? 'active' : ''}">${P[p].map((c, i) =>
      cardHTML(c.card, { faceUp: c.up, size, extra: this._clickable(p, i) ? 'pick' : '', attrs: `data-p="${p}" data-i="${i}"` })).join('')}</div>`;
    const top = this.discard[this.discard.length - 1];
    const human = this._isHuman(cur);
    let tip = '';
    if (this.phase === 'peek') tip = this.ai ? 'Retourne 2 de tes cartes pour commencer' : `Chaque joueur retourne 2 de ses cartes`;
    else if (this.phase === 'roundEnd') tip = 'Fin de la manche : toutes les cartes sont révélées';
    else if (!human) tip = `${this.names[cur]} joue…`;
    else if (this.phase === 'draw') tip = `${this.ai ? 'À toi' : this.names[cur]} : pioche une carte ou prends celle de la défausse`;
    else if (this.phase === 'place') tip = this.drawnFrom === 'pile' ? 'Échange-la avec une de tes cartes, ou jette-la' : 'Échange-la avec une de tes cartes';
    else if (this.phase === 'flip') tip = 'Retourne une de tes cartes cachées';
    this.dom.innerHTML = `
      <div class="cg">
        <div class="cg-who">${this.names[1]} · <b>${gridScore(P[1], this.phase === 'roundEnd')}</b> pts visibles</div>
        ${grid(1, 'sm')}
        <div class="cg-center">
          <div class="cg-pile ${human && this.phase === 'draw' ? 'pick' : ''}" data-a="pile">${cardHTML(this.pile[0], { faceUp: false, size: 'md' })}<span>Pioche (${this.pile.length})</span></div>
          <div class="cg-drawn">${this.drawn ? cardHTML(this.drawn, { size: 'lg', extra: 'pop' }) : ''}</div>
          <div class="cg-pile ${human && this.phase === 'draw' ? 'pick' : ''}" data-a="discard">${cardHTML(top, { size: 'md' })}<span>Défausse</span></div>
        </div>
        <div class="cg-tip">${tip}</div>
        ${grid(0, 'md')}
        <div class="cg-who me">${this.names[0]} · <b>${gridScore(P[0], this.phase === 'roundEnd')}</b> pts visibles</div>
      </div>`;
    this.dom.onclick = (e) => {
      const c = e.target.closest('[data-p]');
      if (c) return this._tapGrid(+c.dataset.p, +c.dataset.i);
      const a = e.target.closest('[data-a]');
      if (a) this._draw(a.dataset.a === 'pile' ? 'pile' : 'discard');
    };
    // bouton « jeter la carte » quand on a pioché
    if (human && this.phase === 'place' && this.drawnFrom === 'pile') {
      const el = this.hud.controls(`<div class="setup-btns"><button class="sbtn sell big" data-a="throw"><span>🗑</span>Jeter la carte</button></div>`);
      el.onclick = (e) => { if (e.target.closest('[data-a="throw"]')) this._throwDrawn(); };
    } else this.hud.controls(null);
    const t = this.totals;
    this.hud.setScore(`<div class="sp ${cur === 0 ? 'on' : ''}"><b>${this.names[0]}</b><div class="balls"><span class="pts">${t[0]}</span><span class="muted">pts</span></div></div>
      <div class="sp ${cur === 1 ? 'on' : ''}"><b>${this.names[1]}</b><div class="balls"><span class="pts">${t[1]}</span><span class="muted">pts</span></div></div>`);
    this.hud.setChip(`Manche ${this.round}/${ROUNDS}`);
  }

  _clickable(p, i) {
    const c = this.players[p][i];
    if (this.phase === 'peek') return this._isHuman(p) && !c.up && this.peek[p] < 2;
    if (p !== this.turn || !this._isHuman(p)) return false;
    return this.phase === 'place' || (this.phase === 'flip' && !c.up);
  }
}
