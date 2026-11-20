// Cartes Cachées : le Golf, jeu de cartes traditionnel. Chaque joueur a une grille de cartes
// face cachée (colonnes × lignes au choix) ; on pioche et on échange pour avoir le moins de points.
// Une colonne entièrement formée de cartes identiques vaut 0. 2 à 4 joueurs installés en croix, dont 1 ou 2 humains.
import { deck, shuffle, cardHTML } from './cards.js';
import { fx } from '../fx.js';

const ROUNDS = 6;
export const VALUE = (c) => (c.r === 'J' ? -5 : c.r === 'A' ? 1 : c.r === '2' ? -2 : c.r === 'R' ? 0 : c.r === 'V' || c.r === 'D' ? 10 : +c.r);
const AI_NOISE = { facile: 0.45, moyen: 0.2, difficile: 0.05 };

export function gridScore(grid, cols, revealAll = false) {
  let s = 0;
  const rows = grid.length / cols;
  for (let c = 0; c < cols; c++) {
    const col = Array.from({ length: rows }, (_, r) => grid[r * cols + c]);
    const vis = col.filter((x) => revealAll || x.up);
    if (vis.length === rows && rows > 1 && col.every((x) => x.card.r === col[0].card.r)) continue;   // colonne identique = 0
    for (const x of vis) s += VALUE(x.card);
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
  stop() { this.running = false; this.dom.innerHTML = ''; this.dom.classList.remove('show'); this.hud.controls(null); clearTimeout(this.aiT); clearTimeout(this.nextT); }

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
    this.opts = opts;
    const cfg = { players: 2, cols: 4, rows: 2, ...(opts.golf || {}) };
    this.N = Math.max(2, Math.min(4, cfg.players)); this.cols = cfg.cols; this.rows = cfg.rows;
    this.size = this.cols * this.rows;
    this.humans = Math.min(this.N, opts.mode === 'ai' ? 1 : 2);
    const bots = this.N - this.humans;
    this.names = Array.from({ length: this.N }, (_, i) => (i < this.humans ? opts.names[i] : bots > 1 ? `Ordi ${i - this.humans + 1}` : 'Ordi'));
    this.totals = Array(this.N).fill(0); this.round = 0; this.view = 0;
    this.running = true; this.paused = false;
    this.dom.classList.add('show');
    this._felt();
    this._newRound();
  }

  _isHuman(p) { return p < this.humans; }

  _newRound() {
    this.round++;
    const copies = Math.ceil((this.N * this.size + 30) / 54);
    this.pile = shuffle(deck(copies, 2 * copies));
    this.players = Array.from({ length: this.N }, () => Array.from({ length: this.size }, () => ({ card: this.pile.pop(), up: false })));
    this.discard = [this.pile.pop()];
    this.drawn = null; this.drawnFrom = null; this.closer = null; this.lastTurns = null;
    this.phase = 'peek'; this.peek = Array(this.N).fill(0);
    this.turn = (this.round - 1) % this.N;
    // les ordis retournent leurs 2 cartes tout de suite
    for (let p = this.humans; p < this.N; p++) { for (const i of this._rand2()) this.players[p][i].up = true; this.peek[p] = 2; }
    this.view = 0;
    this.hud.toast(`Manche ${this.round} / ${ROUNDS} : retourne 2 cartes`, 1600);
    this._render();
  }
  _rand2() { return [...Array(this.size).keys()].sort(() => Math.random() - 0.5).slice(0, 2); }

  // ---------- Actions ----------
  _tapGrid(p, i) {
    if (this.paused) return;
    const cell = this.players[p][i];
    if (this.phase === 'peek') {
      if (p !== this.view || !this._isHuman(p) || cell.up || this.peek[p] >= 2) return;
      cell.up = true; this.peek[p]++; fx.flip();
      if (this.peek[p] >= 2) {
        const nextH = this.peek.findIndex((n, k) => k < this.humans && n < 2);
        if (nextH >= 0) { this.view = nextH; this.hud.toast(`À ${this.names[nextH]} de retourner 2 cartes`, 1400); }
        else { this.phase = 'draw'; this._nextTurnStart(); }
      }
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
      this.closer = p; this.lastTurns = this.N - 1;
      this.hud.toast(`${this.names[p]} a tout retourné : dernier tour !`, 1600);
    }
    this.turn = (p + 1) % this.N; this.phase = 'draw';
    this._nextTurnStart();
    this._render();
  }

  _nextTurnStart() {
    if (this._isHuman(this.turn)) this.view = this.turn;
    else this.aiT = setTimeout(() => this._aiPlay(), 900);
  }

  _endRound() {
    for (const pl of this.players) for (const c of pl) c.up = true;
    const sc = this.players.map((g) => gridScore(g, this.cols, true));
    // celui qui ferme sans avoir strictement le plus petit score voit ses points doublés (s'ils sont positifs)
    if (this.closer != null) {
      const others = sc.filter((_, k) => k !== this.closer);
      if (sc[this.closer] > 0 && sc[this.closer] >= Math.min(...others)) sc[this.closer] *= 2;
    }
    sc.forEach((v, k) => (this.totals[k] += v));
    this.phase = 'roundEnd';
    this._render();
    this.hud.toast(`Manche ${this.round} : ${sc.map((v, k) => `${this.names[k]} ${v > 0 ? '+' : ''}${v}`).join(', ')}`, 3000);
    fx.star(1);
    this.nextT = setTimeout(() => {
      if (!this.running) return;
      if (this.round >= ROUNDS) return this._endGame();
      this._newRound();
    }, 3400);
  }

  _endGame() {
    const best = Math.min(...this.totals), winners = this.totals.map((t, k) => (t === best ? k : -1)).filter((k) => k >= 0);
    const w = winners.length === 1 ? winners[0] : null;
    const humanWon = winners.some((k) => this._isHuman(k));
    humanWon ? fx.win() : fx.lose();
    const ranking = this.totals.map((t, k) => ({ t, k })).sort((a, b) => a.t - b.t).map((o, i) => `${i + 1}. ${this.names[o.k]} ${o.t}`).join(' · ');
    this.hud.end({ won: this.humans === 1 ? w === 0 : humanWon, winner: w,
      title: w == null ? 'Égalité !' : this.humans === 1 ? (w === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
      text: `Classement (le plus petit gagne) : ${ranking}.` });
  }

  // ---------- IA ----------
  _aiPlay() {
    if (!this.running) return;
    if (this.paused) { this.aiT = setTimeout(() => this._aiPlay(), 400); return; }
    const p = this.turn, me = this.players[p], noise = AI_NOISE[this.opts.level], C = this.cols, R = this.rows;
    const colOf = (i) => Array.from({ length: R }, (_, r) => r * C + (i % C)).filter((j) => j !== i).map((j) => me[j]);
    // gain espéré si on place la carte « card » à l'emplacement i
    const gain = (card, i) => {
      const cell = me[i], others = colOf(i);
      if (cell.up && others.every((o) => o.up && o.card.r === cell.card.r)) return -99;   // ne casse pas une colonne complète
      const before = cell.up ? VALUE(cell.card) : 5;
      let after = VALUE(card);
      const same = others.filter((o) => o.up && o.card.r === card.r).length;
      if (same === others.length) after = -others.reduce((s, o) => s + VALUE(o.card), 0);
      else after -= same * 2.5;
      return before - after + (Math.random() - 0.5) * noise * 10;
    };
    const bestSpot = (c) => { let b = null; for (let i = 0; i < this.size; i++) { const g2 = gain(c, i); if (!b || g2 > b.g) b = { i, g: g2 }; } return b; };
    const top = this.discard[this.discard.length - 1];
    const fromDiscard = bestSpot(top);
    if (fromDiscard.g > 2.5) {
      this.drawn = this.discard.pop(); this.drawnFrom = 'discard'; this._render();
      this.aiT = setTimeout(() => this.running && this._swap(p, fromDiscard.i), 700);
      return;
    }
    this.drawn = this.pile.pop(); this.drawnFrom = 'pile'; this._render();
    this.aiT = setTimeout(() => {
      if (!this.running) return;
      const s = bestSpot(this.drawn);
      if (s.g > 0.5) return this._swap(p, s.i);
      this.discard.push(this.drawn); this.drawn = null;
      const hidden = me.map((c, i) => (!c.up ? i : -1)).filter((i) => i >= 0);
      if (hidden.length) me[hidden[Math.floor(Math.random() * hidden.length)]].up = true;
      fx.flip(); this._endTurn();
    }, 750);
  }

  // ---------- Rendu (DOM) ----------
  _render() {
    if (!this.running) return;
    const P = this.players, cur = this.turn, me = this.view, end = this.phase === 'roundEnd';
    const grid = (p, size, side = false) => `<div class="cg-grid ${p === cur && this.phase !== 'peek' && !end ? 'active' : ''}" style="${side ? `grid-template-rows:repeat(${this.cols},auto);grid-auto-flow:column` : `grid-template-columns:repeat(${this.cols},auto)`}">${P[p].map((c, i) =>
      cardHTML(c.card, { faceUp: c.up, size, extra: this._clickable(p, i) ? 'pick' : '', attrs: `data-p="${p}" data-i="${i}"` })).join('')}</div>`;
    // places autour de la table : gauche, haut, droite (dans l'ordre du jeu)
    const at = (o) => (me + o) % this.N;
    const seats = this.N === 2 ? { top: at(1) } : this.N === 3 ? { left: at(1), right: at(2) } : { left: at(1), top: at(2), right: at(3) };
    const sideSize = this.cols >= 5 || this.rows >= 3 ? 'xxs' : 'xs';
    const topSize = this.N === 2 && this.cols <= 4 ? 'sm' : 'xs';
    const seat = (k, side) => k == null ? '' : `<div class="cg-opp ${side ? 'side' : ''} ${k === cur && !end ? 'on' : ''}"><div class="cg-who">${this.names[k]} · <b>${gridScore(P[k], this.cols, end)}</b></div>${grid(k, side ? sideSize : topSize, side)}</div>`;
    const mySize = this.rows >= 3 || this.cols >= 5 ? 'sm' : 'md';
    const top = this.discard[this.discard.length - 1];
    const human = this._isHuman(cur);
    let tip = '';
    if (this.phase === 'peek') tip = this.humans > 1 ? `${this.names[me]} : retourne 2 de tes cartes` : 'Retourne 2 de tes cartes pour commencer';
    else if (end) tip = 'Fin de la manche : toutes les cartes sont révélées';
    else if (!human) tip = `${this.names[cur]} joue…`;
    else if (this.phase === 'draw') tip = `${this.humans > 1 ? this.names[cur] : 'À toi'} : pioche une carte ou prends celle de la défausse`;
    else if (this.phase === 'place') tip = this.drawnFrom === 'pile' ? 'Échange-la avec une de tes cartes, ou jette-la' : 'Échange-la avec une de tes cartes';
    else if (this.phase === 'flip') tip = 'Retourne une de tes cartes cachées';
    this.dom.innerHTML = `
      <div class="cg cross">
        <div class="cg-top">${seat(seats.top, false)}</div>
        <div class="cg-left">${seat(seats.left, true)}</div>
        <div class="cg-mid">
          <div class="cg-center">
            <div class="cg-pile ${human && this.phase === 'draw' ? 'pick' : ''}" data-a="pile">${cardHTML(this.pile[0], { faceUp: false, size: 'md' })}<span>Pioche (${this.pile.length})</span></div>
            <div class="cg-drawn">${this.drawn ? cardHTML(this.drawn, { size: 'lg', extra: 'pop' }) : ''}</div>
            <div class="cg-pile ${human && this.phase === 'draw' ? 'pick' : ''}" data-a="discard">${cardHTML(top, { size: 'md' })}<span>Défausse</span></div>
          </div>
          <div class="cg-tip">${tip}</div>
        </div>
        <div class="cg-right">${seat(seats.right, true)}</div>
        <div class="cg-me">${grid(me, mySize)}<div class="cg-who me">${this.names[me]} · <b>${gridScore(P[me], this.cols, end)}</b> pts visibles</div></div>
      </div>`;
    this.dom.onclick = (e) => {
      const c = e.target.closest('[data-p]');
      if (c) return this._tapGrid(+c.dataset.p, +c.dataset.i);
      const a = e.target.closest('[data-a]');
      if (a) this._draw(a.dataset.a === 'pile' ? 'pile' : 'discard');
    };
    if (human && this.phase === 'place' && this.drawnFrom === 'pile') {
      const el = this.hud.controls(`<div class="setup-btns"><button class="sbtn sell big" data-a="throw"><span>🗑</span>Jeter la carte</button></div>`);
      el.onclick = (e) => { if (e.target.closest('[data-a="throw"]')) this._throwDrawn(); };
    } else this.hud.controls(null);
    this.hud.setScore(this.totals.map((t, k) => `<div class="sp ${cur === k ? 'on' : ''}"><b>${this.names[k]}</b><div class="balls"><span class="pts">${t}</span>${this.N <= 3 ? '<span class="muted">pts</span>' : ''}</div></div>`).join(''));
    this.hud.setChip(`Manche ${this.round}/${ROUNDS}`);
  }

  _clickable(p, i) {
    const c = this.players[p][i];
    if (this.phase === 'peek') return p === this.view && this._isHuman(p) && !c.up && this.peek[p] < 2;
    if (p !== this.turn || !this._isHuman(p)) return false;
    return this.phase === 'place' || (this.phase === 'flip' && !c.up);
  }
}
