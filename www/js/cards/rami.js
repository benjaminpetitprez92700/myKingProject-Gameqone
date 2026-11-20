// Rami à contrats : 6 manches, chacune avec un contrat à poser (brelans, suites).
// Une fois son contrat posé, on peut compléter n'importe quelle combinaison sur la table.
// Le premier qui n'a plus de cartes gagne la manche ; les autres comptent les points de leur main.
import { deck, shuffle, cardHTML } from './cards.js';
import { CONTRACTS, HAND, kindOf, isJoker, matchesContract, findContract, canAdd, handValue, handPenalty, penalty, arrange, rankNum } from './rami_rules.js';
import { fx } from '../fx.js';

const SUIT_ORDER = { '♠': 0, '♥': 1, '♣': 2, '♦': 3, '★': 4 };
const NOISE = { facile: 4, moyen: 1.2, difficile: 0.2 };

export class Rami {
  constructor(canvas, hud) {
    this.canvas = canvas; this.hud = hud; this.dom = document.getElementById('arenaDom');
    this.running = false; this.paused = false;
  }
  resize() { this._felt(); }
  setPaused(p) { this.paused = p; }
  stop() { this.running = false; this.dom.innerHTML = ''; this.dom.classList.remove('show', 'rami-dom'); this.hud.controls(null); clearTimeout(this.aiT); clearTimeout(this.nextT); }

  _felt() {
    const c = this.canvas, d = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    c.width = w * d; c.height = h * d;
    const g = c.getContext('2d'); g.scale(d, d);
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.75);
    gr.addColorStop(0, '#7a2338'); gr.addColorStop(1, '#2a0812');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    this.ai = opts.mode === 'ai';
    this.totals = [0, 0]; this.round = 0; this.sortBy = 'suit';
    this.running = true; this.paused = false;
    this.dom.classList.add('show', 'rami-dom');
    this._felt();
    this._newRound();
  }

  get ct() { return CONTRACTS[this.round - 1]; }

  _newRound() {
    this.round++;
    this.pile = shuffle(deck(2, 4));
    this.hands = [0, 1].map(() => this.pile.splice(0, HAND));
    this.discard = [this.pile.pop()];
    this.laid = [false, false];
    this.table = [[], []];          // combinaisons posées par chaque joueur
    this.stage = [];                // groupes en préparation (joueur humain)
    this.sel = new Set();
    this.turn = (this.round - 1) % 2;
    this.phase = 'draw';
    this.cover = !this.ai;          // à deux : on cache la main entre les tours
    this.hud.toast(`Manche ${this.round} / ${CONTRACTS.length} : ${this.ct.label}`, 2200);
    this._startTurn();
  }

  _isHuman(p) { return !this.ai || p === 0; }
  get me() { return this.ai ? 0 : this.turn; }

  _startTurn() {
    this.phase = 'draw'; this.sel.clear();
    if (!this.pile.length) { const top = this.discard.pop(); this.pile = shuffle(this.discard); this.discard = [top]; }
    if (!this._isHuman(this.turn)) this.aiT = setTimeout(() => this._aiPlay(), 900);
    this._render();
  }

  // ---------- Actions du joueur ----------
  _draw(from) {
    if (this.paused || this.phase !== 'draw' || !this._isHuman(this.turn) || this.cover) return;
    const c = from === 'pile' ? this.pile.pop() : this.discard.pop();
    if (!c) return;
    c.fresh = true;
    this.hands[this.turn].push(c);
    fx.flip();
    this.phase = 'play';
    this._render();
  }

  _toggle(id) {
    if (this.phase !== 'play' || !this._isHuman(this.turn)) return;
    this.sel.has(id) ? this.sel.delete(id) : this.sel.add(id);
    fx.tap(); this._render();
  }

  _selected() { return this.hands[this.turn].filter((c) => this.sel.has(c.id)); }
  _take(cards) { const ids = new Set(cards.map((c) => c.id)); this.hands[this.turn] = this.hands[this.turn].filter((c) => !ids.has(c.id)); this.sel.clear(); }

  _group() {
    const cs = this._selected();
    const k = kindOf(cs);
    if (!k) return this.hud.toast(cs.length < 3 ? 'Il faut au moins 3 cartes' : 'Ce n\'est ni un brelan ni une suite de 4', 1800);
    this._take(cs); this.stage.push(cs); fx.tap();
    this._render();
  }
  _unstage(i) { const g = this.stage.splice(i, 1)[0]; this.hands[this.turn].push(...g); fx.tap(); this._render(); }
  _unstageAll() { for (const g of this.stage) this.hands[this.turn].push(...g); this.stage = []; }

  _layContract() {
    if (!matchesContract(this.stage, this.ct)) return;
    const p = this.turn;
    this.table[p].push(...this.stage.map((g) => arrange(g)));
    this.stage = []; this.laid[p] = true;
    fx.star(2); this.hud.toast('Contrat posé ! Tu peux maintenant compléter les combinaisons', 2000);
    if (!this.hands[p].length) return this._endRound(p);
    this._render();
  }

  _addTo(owner, gi) {
    const p = this.turn;
    if (this.phase !== 'play' || !this.laid[p]) return;
    const cs = this._selected();
    if (!cs.length) return this.hud.toast('Choisis d\'abord une carte de ta main', 1500);
    const g = this.table[owner][gi];
    if (!canAdd(g, cs)) return this.hud.toast('Ces cartes ne vont pas avec cette combinaison', 1600);
    this._take(cs); this.table[owner][gi] = arrange([...g, ...cs]); fx.tap();
    if (!this.hands[p].length) return this._endRound(p);
    this._render();
  }

  _discard() {
    const cs = this._selected();
    if (cs.length !== 1) return this.hud.toast('Choisis UNE carte à défausser', 1500);
    this._unstageAll();
    this._discardCard(this.turn, cs[0]);
  }

  _discardCard(p, card) {
    this.hands[p] = this.hands[p].filter((c) => c.id !== card.id);
    for (const c of this.hands[p]) delete c.fresh;
    this.discard.push(card); this.sel.clear(); fx.tap();
    if (!this.hands[p].length) return this._endRound(p);
    this.turn = 1 - p;
    if (!this.ai) this.cover = true;
    this._startTurn();
  }

  _endRound(winner) {
    this._unstageAll();
    this.phase = 'roundEnd';
    const sc = this.hands.map((h, k) => (k === winner ? 0 : handPenalty(h)));
    sc.forEach((v, k) => (this.totals[k] += v));
    this.cover = false;
    this._render();
    fx.star(1);
    this.hud.toast(`${this.names[winner]} n'a plus de cartes ! ${this.names[1 - winner]} prend ${sc[1 - winner]} points`, 3000);
    this.nextT = setTimeout(() => {
      if (!this.running) return;
      if (this.round >= CONTRACTS.length) return this._endGame();
      this._newRound();
    }, 3600);
  }

  _endGame() {
    const [a, b] = this.totals, w = a === b ? null : a < b ? 0 : 1;
    w === 0 || (!this.ai && w != null) ? fx.win() : fx.lose();
    this.hud.end({ won: this.ai ? w === 0 : true, winner: w,
      title: w == null ? 'Égalité !' : this.ai ? (w === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
      text: `Points de pénalité (le plus petit gagne) : ${this.names[0]} ${a} · ${this.names[1]} ${b}.` });
  }

  // ---------- IA ----------
  _aiPlay() {
    if (!this.running || this.phase === 'roundEnd') return;
    if (this.paused) { this.aiT = setTimeout(() => this._aiPlay(), 400); return; }
    const p = this.turn, ct = this.ct, noise = NOISE[this.opts.level];
    let hand = this.hands[p];
    const top = this.discard[this.discard.length - 1];
    const bestAfter = (h) => Math.max(...h.filter((c) => !isJoker(c) || h.every(isJoker)).map((c) => handValue(h.filter((x) => x !== c), ct)));
    let takeDiscard = false;
    if (top) {
      if (this.laid[p]) takeDiscard = this._fitsTable(top) && Math.random() > noise / 10;
      else takeDiscard = isJoker(top) || bestAfter([...hand, top]) - handValue(hand, ct) > 1.5 + (Math.random() - 0.3) * noise;
    }
    const drawn = takeDiscard ? this.discard.pop() : this.pile.pop();
    hand.push(drawn); fx.tap();
    this.phase = 'play'; this._render();

    this.aiT = setTimeout(() => {
      if (!this.running) return;
      if (!this.laid[p]) {
        const sol = findContract(this.hands[p], ct);
        if (sol && Math.random() > noise / 20) {
          const ids = new Set(sol.flat().map((c) => c.id));
          this.hands[p] = this.hands[p].filter((c) => !ids.has(c.id));
          this.table[p].push(...sol.map((g) => arrange(g)));
          this.laid[p] = true;
          this.hud.toast(`${this.names[p]} pose son contrat !`, 1600);
        }
      }
      if (this.laid[p]) {
        // complète les combinaisons tant que c'est possible
        let moved = true;
        while (moved && this.hands[p].length) {
          moved = false;
          for (const c of [...this.hands[p]]) {
            for (const o of [p, 1 - p]) for (let gi = 0; gi < this.table[o].length; gi++) {
              if (!moved && canAdd(this.table[o][gi], [c])) {
                this.table[o][gi] = arrange([...this.table[o][gi], c]);
                this.hands[p] = this.hands[p].filter((x) => x !== c); moved = true;
              }
            }
          }
        }
        if (!this.hands[p].length) return this._endRound(p);
      }
      this._render();
      this.aiT = setTimeout(() => {
        if (!this.running) return;
        const h = this.hands[p];
        let card;
        if (this.laid[p]) card = [...h].sort((a, b) => penalty(b) - penalty(a) + (isJoker(a) - isJoker(b)) * 50)[0];
        else {
          let best = -1e9;
          for (const c of h) {
            if (isJoker(c) && !h.every(isJoker)) continue;
            const v = handValue(h.filter((x) => x !== c), ct) + (Math.random() - 0.5) * noise;
            if (v > best) { best = v; card = c; }
          }
        }
        this._discardCard(p, card);
      }, 700);
    }, 900);
  }

  _fitsTable(c) { return this.table.some((t) => t.some((g) => canAdd(g, [c]))); }

  // ---------- Rendu ----------
  _sorted(h) {
    const k = this.sortBy === 'suit'
      ? (c) => SUIT_ORDER[c.s] * 100 + rankNum(c)
      : (c) => (isJoker(c) ? 999 : rankNum(c) * 10 + SUIT_ORDER[c.s]);
    return [...h].sort((a, b) => k(a) - k(b));
  }

  _render() {
    if (!this.running) return;
    const cur = this.turn, me = this.me, opp = 1 - me, human = this._isHuman(cur);
    const myTurn = human && cur === me && this.phase !== 'roundEnd';
    const reveal = this.phase === 'roundEnd';
    const combos = (p) => this.table[p].map((g, gi) => {
      const can = myTurn && this.phase === 'play' && this.laid[me] && this.sel.size > 0;
      return `<div class="ra-combo ${can ? 'pick' : ''}" data-o="${p}" data-g="${gi}">${g.map((c) => cardHTML(c, { size: 'xs' })).join('')}</div>`;
    }).join('') || `<span class="ra-empty">${this.laid[p] ? '' : 'Contrat pas encore posé'}</span>`;
    const oppHand = reveal
      ? this.hands[opp].map((c) => cardHTML(c, { size: 'xs' })).join('')
      : this.hands[opp].map(() => `<i class="ra-back"></i>`).join('');
    const top = this.discard[this.discard.length - 1];
    let tip = '';
    if (reveal) tip = 'Fin de la manche';
    else if (!human) tip = `${this.names[cur]} joue…`;
    else if (this.phase === 'draw') tip = `${this.ai ? 'À toi' : this.names[cur]} : pioche ou prends la défausse`;
    else if (!this.laid[me]) tip = this.stage.length ? 'Continue tes groupes, puis pose le contrat' : 'Sélectionne des cartes pour former un groupe, ou défausse-toi d\'une carte';
    else tip = 'Ajoute des cartes sur la table (touche une combinaison), puis défausse-toi';
    const stageHTML = this.stage.map((g, i) => `<div class="ra-combo staged" data-st="${i}"><b>${kindOf(g) === 'set' ? 'Brelan' : 'Suite'} ✓</b>${arrange(g).map((c) => cardHTML(c, { size: 'xs' })).join('')}</div>`).join('');
    const hand = this._sorted(this.hands[me]);
    this.dom.innerHTML = `
      <div class="ra">
        <div class="ra-opp"><b>${this.names[opp]}</b> · ${this.hands[opp].length} cartes ${this.laid[opp] ? '<em>✓ contrat posé</em>' : ''}<div class="ra-ohand">${oppHand}</div></div>
        <div class="ra-zone">${combos(opp)}</div>
        <div class="ra-mid">
          <div class="cg-pile ${myTurn && this.phase === 'draw' ? 'pick' : ''}" data-a="pile">${cardHTML(this.pile[0], { faceUp: false, size: 'sm' })}<span>Pioche</span></div>
          <div class="ra-ct"><small>Manche ${this.round}/${CONTRACTS.length} · contrat</small><b>${this.ct.label}</b></div>
          <div class="cg-pile ${myTurn && this.phase === 'draw' ? 'pick' : ''}" data-a="discard">${cardHTML(top, { size: 'sm' })}<span>Défausse</span></div>
        </div>
        <div class="cg-tip">${tip}</div>
        <div class="ra-zone mine">${stageHTML}${combos(me)}</div>
        <div class="ra-hand">${hand.map((c) => cardHTML(c, { size: 'sm', extra: `${this.sel.has(c.id) ? 'sel' : ''} ${c.fresh ? 'fresh' : ''}`, attrs: `data-c="${c.id}"` })).join('')}</div>
        ${this.cover ? `<div class="ra-cover" data-a="uncover"><div><span>🃏</span><b>Au tour de ${this.names[cur]}</b><p>Passe le téléphone, puis touche l'écran pour voir ta main.</p></div></div>` : ''}
      </div>`;
    this.dom.onclick = (e) => {
      if (this.paused) return;
      const t = e.target;
      if (t.closest('[data-a="uncover"]')) { this.cover = false; fx.tap(); return this._render(); }
      const c = t.closest('[data-c]'); if (c) return this._toggle(+c.dataset.c);
      const st = t.closest('[data-st]'); if (st && myTurn) return this._unstage(+st.dataset.st);
      const g = t.closest('[data-g]'); if (g && myTurn) return this._addTo(+g.dataset.o, +g.dataset.g);
      const a = t.closest('[data-a]'); if (a) this._draw(a.dataset.a);
    };
    this._controls(myTurn);
    const T = this.totals;
    this.hud.setScore([0, 1].map((k) => `<div class="sp ${cur === k ? 'on' : ''}"><b>${this.names[k]}</b><div class="balls"><span class="pts">${T[k]}</span><span class="muted">pts</span></div></div>`).join(''));
    this.hud.setChip(`Manche ${this.round}/${CONTRACTS.length}`);
  }

  _controls(myTurn) {
    if (!myTurn || this.cover) return this.hud.controls(null);
    const n = this.sel.size, me = this.me, play = this.phase === 'play';
    const ready = !this.laid[me] && matchesContract(this.stage, this.ct);
    const btns = [`<button class="rbtn" data-b="sort">↕️<span>Trier</span></button>`];
    if (play && !this.laid[me] && !ready) btns.push(`<button class="rbtn blue" data-b="group" ${n >= 3 ? '' : 'disabled'}>🧩<span>Grouper</span></button>`);
    if (ready) btns.push(`<button class="rbtn green" data-b="lay">✅<span>Poser le contrat</span></button>`);
    if (play) btns.push(`<button class="rbtn orange" data-b="discard" ${n === 1 ? '' : 'disabled'}>🗑<span>Défausser</span></button>`);
    const el = this.hud.controls(`<div class="ra-bar">${btns.join('')}</div>`);
    el.onclick = (e) => {
      const b = e.target.closest('[data-b]'); if (!b || b.disabled || this.paused) return;
      const k = b.dataset.b;
      if (k === 'sort') { this.sortBy = this.sortBy === 'suit' ? 'rank' : 'suit'; fx.tap(); this._render(); }
      else if (k === 'group') this._group();
      else if (k === 'lay') this._layContract();
      else if (k === 'discard') this._discard();
    };
  }
}
