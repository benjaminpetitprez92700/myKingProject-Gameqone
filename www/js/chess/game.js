// Échecs : plateau en bois, pièces dessinées, déplacements animés, contre l'ordi ou à deux.
import { parseFEN, START, legalMoves, makeMove, undoMove, status, inCheck, kingSq, bestMove, moveLabel, colorOf } from './engine.js';
import { fx } from '../fx.js';

const GLYPH = { k: '♚', q: '♛', r: '♜', b: '♝', n: '♞', p: '♟' };
const NAME = { q: 'Dame', r: 'Tour', b: 'Fou', n: 'Cavalier' };

export class Chess {
  constructor(canvas, hud) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.hud = hud;
    this.running = false; this.paused = false;
    this._loop = this._loop.bind(this);
    this._onResize = () => this.resize();
    canvas.addEventListener('pointerdown', (e) => this._tap(e));
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr; this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    if (this.vw < 50) { requestAnimationFrame(() => this.running && this.resize()); return; }
    this.canvas.width = Math.round(this.vw * dpr); this.canvas.height = Math.round(this.vh * dpr);
    const top = 130, bottom = 110;
    this.size = Math.floor(Math.min(this.vw - 20, this.vh - top - bottom) / 8) * 8;
    this.cell = this.size / 8;
    this.ox = Math.round((this.vw - this.size) / 2);
    this.oy = Math.round(top + (this.vh - top - bottom - this.size) / 2);
    this.wood = null;
  }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    this.st = parseFEN(START);
    this.sel = null; this.targets = []; this.last = null; this.anim = null;
    this.captured = { w: [], b: [] }; this.labels = [];
    this.over = false; this.t = 0; this.paused = false;
    // contre l'ordi : on joue les blancs
    this.human = opts.mode === 'ai' ? 'w' : null;
    window.addEventListener('resize', this._onResize);
    this.resize();
    this._refresh();
    this.hud.toast(`${this.names[0]} joue les blancs`, 1400);
    if (!this.running) { this.running = true; this.last_t = performance.now(); requestAnimationFrame(this._loop); }
  }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); this.hud.controls(null); }
  setPaused(p) { this.paused = p; }

  _sideName(c) { return c === 'w' ? this.names[0] : this.names[1]; }
  _aiTurn() { return this.human && this.st.turn !== this.human; }

  _refresh() {
    const s = status(this.st);
    this.moves = s.over ? [] : s.moves;
    const piece = (c) => this.captured[c].map((p) => GLYPH[p.toLowerCase()]).join('');
    const panel = (c, i) => `<div class="sp ${this.st.turn === c && !s.over ? 'on' : ''}"><b>${c === 'w' ? '⚪' : '⚫'} ${this.names[i]}</b><div class="balls cap">${piece(c === 'w' ? 'b' : 'w') || '<span class="muted">—</span>'}</div></div>`;
    this.hud.setScore(panel('w', 0) + panel('b', 1));
    this.hud.setChip(this.labels.length ? `Coup ${Math.ceil(this.labels.length / 2)} · ${this.labels[this.labels.length - 1]}` : 'Échecs');
    this._controls();
    if (s.over) return this._end(s);
    if (inCheck(this.st)) { this.hud.toast('Échec !', 900); fx.metal(0.5); }
    if (this._aiTurn()) {
      this.thinking = true;
      this.hud.setChip("L'ordi réfléchit…");
      setTimeout(() => {
        if (!this.running) return;
        const m = bestMove(this.st, this.opts.level);
        this.thinking = false;
        if (m) this._play(m);
      }, 450);
    }
  }

  _controls() {
    if (this.promo) return;
    const canUndo = this.st.history.length && !this.over && !this.thinking;
    const el = this.hud.controls(`<div class="chess-ctl"><button class="btn ghost" data-a="undo" ${canUndo ? '' : 'disabled'}>↶ Annuler le coup</button><button class="btn ghost" data-a="resign" ${this.over ? 'disabled' : ''}>🏳 Abandonner</button></div>`);
    el.onclick = (e) => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      fx.tap();
      if (b.dataset.a === 'undo') this._undo();
      else this._end({ over: true, result: this.human ? (this.human === 'w' ? 'b' : 'w') : (this.st.turn === 'w' ? 'b' : 'w'), reason: 'abandon' });
    };
  }

  _undo() {
    // contre l'ordi on annule aussi sa réponse
    const n = this.human ? (this.st.turn === this.human ? 2 : 1) : 1;
    for (let k = 0; k < n && this.st.history.length; k++) {
      const u = this.st.history[this.st.history.length - 1];
      if (u.captured) this.captured[colorOf(u.m.piece)].pop();
      undoMove(this.st); this.labels.pop();
    }
    this.sel = null; this.targets = []; this.last = null;
    this._refresh();
  }

  _xy(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = e.clientX - r.left - this.ox, y = e.clientY - r.top - this.oy;
    if (x < 0 || y < 0 || x >= this.size || y >= this.size) return -1;
    return Math.floor(y / this.cell) * 8 + Math.floor(x / this.cell);
  }

  _tap(e) {
    if (!this.running || this.paused || this.over || this.anim || this.promo || this._aiTurn() || this.thinking) return;
    const sq = this._xy(e); if (sq < 0) return;
    const p = this.st.board[sq];
    const tgt = this.targets.filter((m) => m.to === sq);
    if (this.sel != null && tgt.length) {
      if (tgt.length > 1) return this._choosePromo(tgt);
      return this._play(tgt[0]);
    }
    if (p && colorOf(p) === this.st.turn) {
      this.sel = sq; this.targets = this.moves.filter((m) => m.from === sq);
      fx.tick();
    } else { this.sel = null; this.targets = []; }
  }

  _choosePromo(opts) {
    this.promo = true;
    const el = this.hud.controls(`<div class="chess-ctl promo"><span>Promotion :</span>${opts.map((m) => `<button class="btn primary" data-p="${m.promo}">${GLYPH[m.promo.toLowerCase()]} ${NAME[m.promo.toLowerCase()]}</button>`).join('')}</div>`);
    el.onclick = (e) => {
      const b = e.target.closest('[data-p]'); if (!b) return;
      this.promo = false; this._play(opts.find((m) => m.promo === b.dataset.p));
    };
  }

  _play(m) {
    this.labels.push(moveLabel(this.st, m));
    if (m.cap) this.captured[colorOf(m.piece)].push(m.cap);
    this.anim = { m, t: 0, piece: m.promo || m.piece };
    makeMove(this.st, m);
    this.sel = null; this.targets = [];
    this.last = { from: m.from, to: m.to };
    m.cap ? fx.ballClick(1) : fx.cushion(0.5);
    if (m.castle) setTimeout(() => fx.cushion(0.4), 120);
  }

  _end(s) {
    if (this.over) return;
    this.over = true;
    this._controls();
    const w = s.result === 'draw' ? null : s.result === 'w' ? 0 : 1;
    const why = { mat: 'Échec et mat !', pat: 'Pat : match nul.', abandon: 'Abandon.' }[s.reason] || `Match nul (${s.reason}).`;
    if (w === 0 || (w === 1 && !this.human)) fx.win(); else if (w === 1) fx.lose();
    setTimeout(() => this.running && this.hud.end({
      won: this.human ? w === 0 : true,
      title: w == null ? 'Match nul' : this.human ? (w === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
      text: `${why} ${this.labels.length} demi-coups joués.`, winner: w,
    }), 1100);
  }

  // ---------- Boucle / rendu ----------
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last_t) / 1000); this.last_t = now;
    if (!this.paused) {
      this.t += dt;
      if (this.anim) { this.anim.t += dt / 0.22; if (this.anim.t >= 1) { this.anim = null; this._refresh(); } }
    }
    this._render();
    requestAnimationFrame(this._loop);
  }

  _woodCanvas() {
    const c = document.createElement('canvas'), d = this.dpr, S = this.size + 28;
    c.width = Math.round(S * d); c.height = Math.round(S * d);
    const g = c.getContext('2d'); g.scale(d, d);
    // cadre en noyer
    const fr = g.createLinearGradient(0, 0, S, S); fr.addColorStop(0, '#5a3418'); fr.addColorStop(0.5, '#7b4a24'); fr.addColorStop(1, '#4a2a12');
    g.fillStyle = fr; g.beginPath(); g.roundRect(0, 0, S, S, 12); g.fill();
    g.strokeStyle = 'rgba(255,220,170,0.25)'; g.lineWidth = 2; g.beginPath(); g.roundRect(3, 3, S - 6, S - 6, 10); g.stroke();
    const cs = this.cell;
    for (let r = 0; r < 8; r++) for (let f = 0; f < 8; f++) {
      const light = (r + f) % 2 === 0, x = 14 + f * cs, y = 14 + r * cs;
      g.fillStyle = light ? '#ecd3a5' : '#a8703f'; g.fillRect(x, y, cs, cs);
      // veinage du bois
      g.strokeStyle = light ? 'rgba(160,110,60,0.18)' : 'rgba(60,30,10,0.22)'; g.lineWidth = 1;
      for (let k = 0; k < 4; k++) { const yy = y + (k + 0.5 + Math.sin(f * 3 + r + k) * 0.3) * cs / 4; g.beginPath(); g.moveTo(x, yy); g.bezierCurveTo(x + cs / 3, yy + 2, x + cs * 2 / 3, yy - 2, x + cs, yy + 1); g.stroke(); }
    }
    g.fillStyle = 'rgba(255,230,190,0.85)'; g.font = `700 ${Math.max(9, cs * 0.16)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    for (let i = 0; i < 8; i++) { g.fillText('abcdefgh'[i], 14 + (i + 0.5) * cs, S - 7); g.fillText(String(8 - i), 7, 14 + (i + 0.5) * cs); }
    return c;
  }

  _piece(g, p, x, y, lift = 0) {
    const cs = this.cell, w = colorOf(p) === 'w';
    const fs = cs * 0.82;
    g.save();
    g.font = `${fs}px "Segoe UI Symbol","Noto Sans Symbols 2","Noto Sans Symbols","DejaVu Sans",serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    const ch = GLYPH[p.toLowerCase()] + '︎';
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.fillText(ch, x + cs * 0.04, y + cs * 0.06 + lift * 0.4);
    g.lineJoin = 'round'; g.lineWidth = cs * 0.07; g.strokeStyle = w ? '#2b1a0c' : '#e9dcc4';
    g.strokeText(ch, x, y - lift);
    const gr = g.createLinearGradient(0, y - fs / 2, 0, y + fs / 2);
    if (w) { gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#d8cdb8'); } else { gr.addColorStop(0, '#4a4a52'); gr.addColorStop(1, '#0d0d10'); }
    g.fillStyle = gr; g.fillText(ch, x, y - lift);
    g.restore();
  }

  _render() {
    const g = this.ctx, d = this.dpr, cs = this.cell;
    g.setTransform(d, 0, 0, d, 0, 0);
    const bg = g.createRadialGradient(this.vw / 2, this.vh / 2, 40, this.vw / 2, this.vh / 2, this.vh * 0.8);
    bg.addColorStop(0, '#3a2a1e'); bg.addColorStop(1, '#0e0906');
    g.fillStyle = bg; g.fillRect(0, 0, this.vw, this.vh);
    if (!this.size) return;
    if (!this.wood) this.wood = this._woodCanvas();
    g.fillStyle = 'rgba(0,0,0,0.5)'; g.beginPath(); g.roundRect(this.ox - 14 + 6, this.oy - 14 + 10, this.size + 28, this.size + 28, 12); g.fill();
    g.drawImage(this.wood, this.ox - 14, this.oy - 14, this.size + 28, this.size + 28);
    const X = (i) => this.ox + (i & 7) * cs, Y = (i) => this.oy + (i >> 3) * cs;
    // dernier coup, sélection, échec
    if (this.last) for (const sq of [this.last.from, this.last.to]) { g.fillStyle = 'rgba(255,214,60,0.38)'; g.fillRect(X(sq), Y(sq), cs, cs); }
    if (this.sel != null) { g.fillStyle = 'rgba(80,200,120,0.5)'; g.fillRect(X(this.sel), Y(this.sel), cs, cs); }
    if (inCheck(this.st)) {
      const k = kingSq(this.st, this.st.turn);
      const gr = g.createRadialGradient(X(k) + cs / 2, Y(k) + cs / 2, 2, X(k) + cs / 2, Y(k) + cs / 2, cs * 0.7);
      gr.addColorStop(0, 'rgba(255,40,40,0.9)'); gr.addColorStop(1, 'rgba(255,40,40,0)');
      g.fillStyle = gr; g.fillRect(X(k), Y(k), cs, cs);
    }
    // pièces
    const a = this.anim;
    for (let i = 0; i < 64; i++) {
      const p = this.st.board[i]; if (!p) continue;
      if (a && i === a.m.to) continue;
      // tour qui roque : on la fait glisser aussi
      this._piece(g, p, X(i) + cs / 2, Y(i) + cs / 2 + cs * 0.02);
    }
    if (a) {
      const k = 1 - Math.pow(1 - Math.min(1, a.t), 3);
      const x = X(a.m.from) + (X(a.m.to) - X(a.m.from)) * k, y = Y(a.m.from) + (Y(a.m.to) - Y(a.m.from)) * k;
      this._piece(g, a.piece, x + cs / 2, y + cs / 2, Math.sin(k * Math.PI) * cs * 0.25);
    }
    // coups possibles
    for (const m of this.targets) {
      const x = X(m.to) + cs / 2, y = Y(m.to) + cs / 2;
      if (this.st.board[m.to] || m.epCap) { g.strokeStyle = 'rgba(20,120,60,0.75)'; g.lineWidth = cs * 0.08; g.beginPath(); g.arc(x, y, cs * 0.44, 0, Math.PI * 2); g.stroke(); }
      else { g.fillStyle = 'rgba(20,120,60,0.55)'; g.beginPath(); g.arc(x, y, cs * 0.15, 0, Math.PI * 2); g.fill(); }
    }
  }
}
