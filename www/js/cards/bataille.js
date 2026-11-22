// La Bataille : jeu de cartes traditionnel à 2. Chacun retourne la carte du dessus de son tas,
// la plus forte remporte le pli. Égalité = « Bataille ! » : chacun pose une carte cachée puis une
// carte visible, et le gagnant ramasse tout. Celui qui n'a plus de cartes a perdu.
// Contre l'ordi, à deux sur le même téléphone, ou en ligne (le créateur de la partie distribue).
import { deck, cardHTML } from './cards.js';
import { fx } from '../fx.js';

const RANK = { 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, V: 11, D: 12, R: 13, A: 14 };
export const LENGTHS = { rapide: 60, normale: 150, complete: Infinity };

// générateur pseudo-aléatoire avec graine : les deux téléphones obtiennent exactement la même partie
function rng(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const shuffleWith = (arr, R) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(R() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

export class Bataille {
  constructor(canvas, hud) {
    this.canvas = canvas; this.hud = hud; this.dom = document.getElementById('arenaDom');
    this.running = false; this.paused = false;
  }
  resize() { this._felt(); }
  setPaused(p) { this.paused = p; if (!p) this._maybeAuto(); }
  stop() {
    this.running = false; clearTimeout(this.aiT); clearTimeout(this.resT); clearTimeout(this.autoT);
    this.dom.innerHTML = ''; this.dom.classList.remove('show', 'bt-dom'); this.hud.controls(null);
    this.opts?.net?.close();
  }

  _felt() {
    const c = this.canvas, d = Math.min(devicePixelRatio || 1, 2), w = c.clientWidth, h = c.clientHeight;
    if (w < 10) return;
    c.width = w * d; c.height = h * d;
    const g = c.getContext('2d'); g.scale(d, d);
    const gr = g.createRadialGradient(w / 2, h / 2, 40, w / 2, h / 2, Math.max(w, h) * 0.75);
    gr.addColorStop(0, '#1d5a8c'); gr.addColorStop(1, '#071a2e');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 2500; i++) { g.fillStyle = Math.random() < 0.5 ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)'; g.fillRect(Math.random() * w, Math.random() * h, 1, 1); }
  }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    this.mode = opts.mode;                       // 'ai' | 'duo' | 'online'
    this.me = this.mode === 'online' ? opts.side : 0;
    this.running = true; this.paused = false; this.auto = false;
    this.dom.classList.add('show', 'bt-dom');
    this._felt();
    if (this.mode === 'online') {
      const L = opts.net;
      L.on('flip', (m) => this._flip(1 - this.me, m.n, true));
      L.onClose(() => { if (this.running && !this.over) { this.hud.toast('Ton adversaire a quitté la partie', 2500); this._end(this.me, "L'adversaire a quitté la partie."); } });
      if (this.me === 0) {
        const seed = (Math.random() * 2 ** 31) | 0, len = opts.length || 'normale';
        L.send({ t: 'deal', seed, len });
        this._deal(seed, len);
      } else {
        this.waiting = true; this._render();
        L.on('deal', (m) => { this.waiting = false; this._deal(m.seed, m.len); });
      }
    } else this._deal((Math.random() * 2 ** 31) | 0, opts.length || 'normale');
  }

  _deal(seed, len) {
    this.R = rng(seed);
    this.maxTricks = LENGTHS[len] ?? LENGTHS.normale;
    const cards = shuffleWith(deck(1, 0), this.R);
    this.piles = [cards.filter((_, i) => i % 2 === 0), cards.filter((_, i) => i % 2 === 1)];
    this.table = [[], []];        // cartes posées par chaque joueur pendant le pli : { card, up }
    this.tricks = 0; this.wars = 0; this.over = false;
    this.step = 0; this.stepKind = 'up';   // 'up' = carte visible ; 'war' = une cachée + une visible
    this.flipped = [false, false]; this.early = new Set();
    this.result = null;
    this.hud.toast(this.mode === 'online' ? 'Les cartes sont distribuées : à toi de jouer !' : 'Touche ton tas pour retourner ta carte', 2000);
    this._render();
    this._beginStep();
  }

  _isLocal(p) { return this.mode === 'duo' || (this.mode === 'ai' ? p === 0 : p === this.me); }

  _beginStep() {
    this.flipped = [false, false];
    // l'adversaire en ligne a peut-être déjà retourné sa carte
    const foe = 1 - this.me;
    if (this.mode === 'online' && this.early.has(this.step)) { this.early.delete(this.step); this._flip(foe, this.step, true); }
    if (this.mode === 'ai') this.aiT = setTimeout(() => this._flip(1, this.step), 450 + Math.random() * 500);
    this._maybeAuto();
    this._render();
  }

  _maybeAuto() {
    clearTimeout(this.autoT);
    if (!this.auto || this.over || this.paused || this.result) return;
    this.autoT = setTimeout(() => {
      for (const p of [0, 1]) if (this._isLocal(p) && !this.flipped[p]) this._flip(p, this.step);
    }, 260);
  }

  _flip(p, n, remote = false) {
    if (!this.running || this.over || this.paused && !remote) return;
    if (n !== this.step) { if (remote && n > this.step) this.early.add(n); return; }
    if (this.flipped[p] || this.result) { if (remote && this.result) this.early.add(n); return; }
    if (!remote && !this._isLocal(p) && this.mode !== 'ai') return;
    const pile = this.piles[p];
    if (!pile.length) return this._end(1 - p, `${this.names[p]} n'a plus de cartes.`);
    if (this.stepKind === 'war') {
      // une carte cachée (si possible) puis une visible
      if (pile.length > 1) this.table[p].push({ card: pile.shift(), up: false });
      this.table[p].push({ card: pile.shift(), up: true, fresh: true });
    } else this.table[p].push({ card: pile.shift(), up: true, fresh: true });
    this.flipped[p] = true;
    fx.flip();
    if (this.mode === 'online' && p === this.me && !remote) this.opts.net.send({ t: 'flip', n });
    if (this.flipped[0] && this.flipped[1]) this._resolve();
    else this._render();
  }

  _top(p) { const t = this.table[p]; return t[t.length - 1].card; }

  _resolve() {
    const a = RANK[this._top(0).r], b = RANK[this._top(1).r];
    if (a === b) {
      this.wars++;
      this.result = { war: true };
      this._render();
      fx.metal?.(0.7);
      this.resT = setTimeout(() => {
        if (!this.running) return;
        // impossible de continuer la bataille sans cartes : celui qui n'en a plus perd
        for (const p of [0, 1]) if (!this.piles[p].length) return this._end(1 - p, `${this.names[p]} n'a plus de cartes pour la bataille.`);
        this.result = null; this.step++; this.stepKind = 'war';
        for (const t of this.table) for (const c of t) delete c.fresh;
        this._beginStep();
      }, 1300);
      return;
    }
    const w = a > b ? 0 : 1, won = [...this.table[0], ...this.table[1]].map((c) => c.card);
    this.result = { winner: w, n: won.length };
    this._render();
    won.length > 2 ? fx.star(2) : fx.ballClick?.(0.6);
    this.resT = setTimeout(() => {
      if (!this.running) return;
      // le gagnant glisse les cartes sous son tas (ordre mélangé, identique sur les deux téléphones)
      this.piles[w].push(...shuffleWith(won, this.R));
      this.table = [[], []]; this.result = null; this.tricks++;
      this.step++; this.stepKind = 'up';
      if (!this.piles[1 - w].length) return this._end(w, `${this.names[1 - w]} n'a plus de cartes.`);
      if (this.tricks >= this.maxTricks) {
        const [x, y] = this.piles.map((pl) => pl.length);
        return this._end(x === y ? null : x > y ? 0 : 1, `${this.maxTricks} plis joués : ${this.names[0]} ${x} cartes, ${this.names[1]} ${y} cartes.`);
      }
      this._beginStep();
    }, this.auto ? 650 : 1050);
  }

  _end(w, why) {
    if (this.over) return;
    this.over = true; this.auto = false;
    clearTimeout(this.aiT); clearTimeout(this.autoT);
    this._render();
    const me = this.mode === 'online' ? this.me : 0;
    if (w == null) fx.lose(); else if (w === me || this.mode === 'duo') fx.win(); else fx.lose();
    setTimeout(() => this.running && this.hud.end({
      won: this.mode === 'duo' ? true : w === me, winner: w,
      title: w == null ? 'Égalité !' : this.mode === 'duo' ? `${this.names[w]} gagne !` : w === me ? 'Victoire !' : 'Défaite…',
      text: `${why} ${this.tricks} plis, ${this.wars} bataille${this.wars > 1 ? 's' : ''}.`,
    }), 1100);
  }

  // ---------- Rendu ----------
  _render() {
    if (!this.running) return;
    if (this.waiting) {
      this.dom.innerHTML = `<div class="bt"><div class="bt-wait">🃏<b>Ton ami distribue les cartes…</b></div></div>`;
      return;
    }
    const me = this.me, foe = 1 - me, R = this.result;
    const deckEl = (p, top) => {
      const n = this.piles[p].length, can = !this.over && !R && !this.flipped[p] && this._isLocal(p) && !this.paused;
      const stack = Math.min(5, Math.ceil(n / 6));
      return `<div class="bt-deck ${can ? 'pick' : ''} ${top ? 'top' : ''}" data-p="${p}">
        <div class="bt-stack">${n ? Array.from({ length: stack }, (_, k) => `<div class="bt-back" style="transform:translate(${k * 1.5}px,${-k * 2}px)">${cardHTML({ r: 'A', s: '♠' }, { faceUp: false, size: 'lg' })}</div>`).join('') : '<div class="pcard lg empty"></div>'}</div>
        <div class="bt-info"><b>${this.names[p]}</b><span>${n} carte${n > 1 ? 's' : ''}</span>${can ? `<em>${this.mode === 'duo' || p === me ? 'Touche pour retourner' : ''}</em>` : ''}</div>
      </div>`;
    };
    const slot = (p, top) => {
      const cards = this.table[p];
      const win = R && R.winner === p, lose = R && R.winner != null && R.winner !== p;
      return `<div class="bt-slot ${top ? 'top' : 'bottom'} ${win ? 'win' : ''} ${lose ? 'lose' : ''}">${cards.map((c, i) =>
        `<div class="bt-card ${c.fresh ? (top ? 'in-top' : 'in-bottom') : ''}" style="z-index:${i}">${cardHTML(c.card, { faceUp: c.up, size: 'xl' })}</div>`).join('')}
        ${win ? `<div class="bt-plus">+${R.n}</div>` : ''}</div>`;
    };
    const total = this.piles[0].length + this.piles[1].length + this.table[0].length + this.table[1].length || 1;
    const pct = Math.round(((this.piles[me].length + (R?.winner === me ? R.n : 0)) / total) * 100);
    this.dom.innerHTML = `
      <div class="bt ${this.mode === 'duo' ? 'duo' : ''}">
        <div class="bt-side foe">${deckEl(foe, true)}</div>
        <div class="bt-field">
          ${slot(foe, true)}
          <div class="bt-mid">${R?.war ? '<div class="bt-war">⚔️ BATAILLE !</div>' : `<div class="bt-bar"><i style="width:${pct}%"></i></div>`}</div>
          ${slot(me, false)}
        </div>
        <div class="bt-side mine">${deckEl(me, false)}</div>
      </div>`;
    this.dom.onclick = (e) => {
      const d = e.target.closest('[data-p]'); if (!d) return;
      const p = +d.dataset.p;
      if (this._isLocal(p)) this._flip(p, this.step);
    };
    const ctl = this.hud.controls(this.over ? null : `<div class="ra-bar"><button class="rbtn ${this.auto ? 'green' : ''}" data-b="auto">⚡<span>${this.auto ? 'Auto : activé' : 'Jeu automatique'}</span></button></div>`);
    if (ctl) ctl.onclick = (e) => { if (e.target.closest('[data-b="auto"]')) { this.auto = !this.auto; fx.tap(); this._render(); this._maybeAuto(); } };
    this.hud.setScore([0, 1].map((k) => `<div class="sp ${this.flipped[k] || this.over ? '' : 'on'}"><b>${this.names[k]}</b><div class="balls"><span class="pts">${this.piles[k].length}</span><span class="muted">cartes</span></div></div>`).join(''));
    this.hud.setChip(this.maxTricks === Infinity ? `Pli ${this.tricks + 1}` : `Pli ${this.tricks + 1}/${this.maxTricks}`);
  }
}
