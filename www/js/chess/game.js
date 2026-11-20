// Échecs : plateau en bois, pièces dessinées, déplacements animés, contre l'ordi ou à deux.
import { parseFEN, START, legalMoves, makeMove, undoMove, status, inCheck, kingSq, bestMove, moveLabel, colorOf, analyzeMoves } from './engine.js';
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
    const top = 130, bottom = 176;
    this.size = Math.floor(Math.min(this.vw - (this.opts?.assistant ? 64 : 20), this.vh - top - bottom) / 8) * 8;
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
    this.grade = null; this.acc = { w: [], b: [] }; this.evalW = 0;
    // contre l'ordi : on joue les blancs
    this.online = opts.mode === 'online';
    this.human = opts.mode === 'ai' ? 'w' : this.online ? (opts.side === 0 ? 'w' : 'b') : null;
    this.flip = this.online && this.human === 'b';
    if (this.online) this._net(opts.net);
    window.addEventListener('resize', this._onResize);
    this.resize();
    this._refresh();
    this.hud.toast(this.online ? `Tu joues les ${this.human === 'w' ? 'blancs' : 'noirs'}` : `${this.names[0]} joue les blancs`, 1600);
    if (!this.running) { this.running = true; this.last_t = performance.now(); requestAnimationFrame(this._loop); }
  }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); this.hud.controls(null); this.opts?.net?.close(); }

  // ---------- En ligne ----------
  _net(link) {
    link.on('move', (msg) => {
      const m = this.moves?.find((x) => x.from === msg.from && x.to === msg.to && (x.promo || null) === (msg.promo || null));
      if (m && !this.over) this._play(m, true);
    });
    link.on('resign', () => this._end({ over: true, result: this.human, reason: 'abandon' }));
    link.onClose(() => { if (this.running && !this.over) { this.hud.toast('Ton adversaire a quitté la partie', 2500); this._end({ over: true, result: this.human, reason: 'départ' }); } });
  }
  _remoteTurn() { return this.online && this.st.turn !== this.human; }
  setPaused(p) { this.paused = p; }

  _sideName(c) { return c === 'w' ? this.names[0] : this.names[1]; }
  _aiTurn() { return this.opts.mode === 'ai' && this.st.turn !== this.human; }

  _refresh() {
    const s = status(this.st);
    this.moves = s.over ? [] : s.moves;
    // un échec et mat en un coup est-il possible pour le joueur humain ? (pour le signaler s'il le rate)
    this.mateMoves = !s.over && !this._aiTurn() && !this._remoteTurn() ? this.moves.filter((m) => this._isMate(m)) : [];
    // mode assistant : on analyse la position avant que le joueur ne joue
    this.analysis = this.opts.assistant && !s.over && !this._aiTurn() && !this._remoteTurn() ? analyzeMoves(this.st, 2) : null;
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
        if (m) this._play(m, true);
      }, 450);
    }
  }

  _controls() {
    if (this.promo) return;
    const canUndo = !this.online && this.st.history.length && !this.over && !this.thinking;
    const el = this.hud.controls(`<div class="chess-ctl"><button class="btn ghost" data-a="undo" ${canUndo ? '' : 'disabled'}>↶ Annuler le coup</button><button class="btn ghost" data-a="resign" ${this.over ? 'disabled' : ''}>🏳 Abandonner</button></div>`);
    el.onclick = (e) => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return;
      fx.tap();
      if (b.dataset.a === 'undo') this._undo();
      else if (this.online) { this.opts.net.send({ t: 'resign' }); this._end({ over: true, result: this.human === 'w' ? 'b' : 'w', reason: 'abandon' }); }
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
    const sq = Math.floor(y / this.cell) * 8 + Math.floor(x / this.cell);
    return this.flip ? 63 - sq : sq;
  }

  _tap(e) {
    if (!this.running || this.paused || this.over || this.anim || this.promo || this._aiTurn() || this._remoteTurn() || this.thinking) return;
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

  // note le coup du joueur en le comparant au meilleur coup trouvé par l'analyse
  _grade(m) {
    const A = this.analysis, best = A[0], mine = A.find((x) => x.m.from === m.from && x.m.to === m.to && x.m.promo === m.promo) || A[A.length - 1];
    const cap = (v) => Math.max(-3000, Math.min(3000, v));
    const loss = Math.max(0, cap(best.sc) - cap(mine.sc));
    const isBest = mine === best || loss <= 8;
    const cls = isBest ? ['Meilleur coup !', '#2ecc71', '★'] : loss <= 40 ? ['Excellent', '#7ee08a', '✓'] : loss <= 90 ? ['Bon coup', '#a8e6a3', '👍'] : loss <= 200 ? ['Imprécision', '#ffd34d', '?!'] : loss <= 450 ? ['Erreur', '#ff9f43', '?'] : ['Gaffe !', '#ff5a5a', '??'];
    const score = Math.round(Math.max(0, 100 - loss / 4));
    const side = this.st.turn;
    this.acc[side].push(score);
    // avantage après le coup, vu des blancs (en pions)
    this.evalW = (side === 'w' ? cap(mine.sc) : -cap(mine.sc)) / 100;
    this.grade = { label: cls[0], color: cls[1], icon: cls[2], score, best: isBest ? null : moveLabel(this.st, best.m), bestMove: isBest ? null : best.m, who: side, t: 0 };
    if (isBest) setTimeout(() => fx.star(2), 250); else if (loss > 200) setTimeout(() => fx.gauge(), 250);
  }
  _accuracy(side) { const a = this.acc[side]; return a.length ? Math.round(a.reduce((x, y) => x + y, 0) / a.length) : null; }

  _isMate(m) {
    makeMove(this.st, m);
    const s = status(this.st);
    undoMove(this.st);
    return s.over && s.reason === 'mat';
  }

  _play(m, byAI = false) {
    // le joueur avait un mat en 1 et ne l'a pas joué : on le lui montre, la partie continue
    if (!byAI && this.mateMoves?.length && !this.mateMoves.some((x) => x.from === m.from && x.to === m.to && x.promo === m.promo)) {
      const best = this.mateMoves[0];
      this.missed = { from: best.from, to: best.to, label: moveLabel(this.st, best) + '#', t: 0, who: this.st.turn };
      setTimeout(() => fx.gauge(), 400);
    } else if (!byAI) this.missed = null;
    if (!byAI && this.analysis) this._grade(m);
    if (!byAI && this.online) this.opts.net.send({ t: 'move', from: m.from, to: m.to, promo: m.promo || null });
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
    const why = { mat: 'Échec et mat !', pat: 'Pat : match nul.', abandon: 'Abandon.', 'départ': "L'adversaire a quitté la partie." }[s.reason] || `Match nul (${s.reason}).`;
    const meIdx = this.human === 'b' ? 1 : 0;
    if (w === meIdx || (w != null && !this.human)) fx.win(); else if (w != null) fx.lose();
    setTimeout(() => this.running && this.hud.end({
      won: this.human ? w === meIdx : true,
      title: w == null ? 'Match nul' : this.human ? (w === meIdx ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
      text: `${why} ${this.labels.length} demi-coups joués.${this.opts.assistant ? ' Précision : ' + ['w', 'b'].filter((c) => this._accuracy(c) != null).map((c) => `${this.names[c === 'w' ? 0 : 1]} ${this._accuracy(c)} %`).join(', ') + '.' : ''}`, winner: w,
    }), 1100);
  }

  // ---------- Boucle / rendu ----------
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last_t) / 1000); this.last_t = now;
    if (!this.paused) {
      this.t += dt;
      if (this.missed) { this.missed.t += dt; if (this.missed.t > 7) this.missed = null; }
      if (this.grade) this.grade.t += dt;
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

  // mode assistant : note du coup + meilleur coup en pointillés
  _renderGrade(g, X, Y, cs) {
    const G = this.grade, k = Math.min(1, G.t / 0.25);
    g.save(); g.globalAlpha = k;
    if (G.bestMove && G.t < 6) {
      const x0 = X(G.bestMove.from) + cs / 2, y0 = Y(G.bestMove.from) + cs / 2, x1 = X(G.bestMove.to) + cs / 2, y1 = Y(G.bestMove.to) + cs / 2;
      g.setLineDash([8, 6]); g.strokeStyle = 'rgba(46,204,113,0.85)'; g.lineWidth = cs * 0.1; g.lineCap = 'round';
      g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); g.setLineDash([]);
      g.fillStyle = 'rgba(46,204,113,0.9)'; g.beginPath(); g.arc(x1, y1, cs * 0.14, 0, Math.PI * 2); g.fill();
    }
    const bw = Math.min(this.vw - 20, 340), bx = (this.vw - bw) / 2, by = this.oy + this.size + 22;
    g.fillStyle = 'rgba(12,10,24,0.92)'; g.strokeStyle = G.color; g.lineWidth = 2;
    g.beginPath(); g.roundRect(bx, by, bw, 54, 14); g.fill(); g.stroke();
    g.fillStyle = G.color; g.beginPath(); g.arc(bx + 27, by + 27, 17, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.font = '900 14px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(G.icon, bx + 27, by + 28);
    g.textAlign = 'left'; g.fillStyle = G.color; g.font = '900 15px system-ui';
    g.fillText(`${G.label}  ·  ${G.score}/100`, bx + 54, by + 18);
    g.fillStyle = '#ddd'; g.font = '600 12.5px system-ui';
    const acc = this._accuracy(G.who);
    g.fillText(G.best ? `Meilleur coup : ${G.best} (en vert)  ·  précision ${acc} %` : `Bravo !  ·  précision ${acc} %`, bx + 54, by + 38, bw - 64);
    g.restore();
  }

  // barre d'avantage à gauche du plateau (blanc en bas, noir en haut)
  _renderEvalBar(g) {
    const x = this.ox - 24, w = 8, y = this.oy, h = this.size;
    if (x < 2) return;
    const p = 0.5 + 0.5 * Math.tanh(this.evalW / 4);
    g.fillStyle = '#1a1a1f'; g.beginPath(); g.roundRect(x, y, w, h, 4); g.fill();
    g.fillStyle = '#f1ece0'; g.beginPath(); g.roundRect(x, y + h * (1 - p), w, h * p, 4); g.fill();
    g.fillStyle = '#ffd34d'; g.font = '800 10px system-ui'; g.textAlign = 'center';
    g.fillText((this.evalW > 0 ? '+' : '') + this.evalW.toFixed(1), x + w / 2, y + h + 12);
  }

  // flèche dorée sur le plateau + bandeau d'explication sur le côté
  _renderMissed(g, X, Y, cs) {
    const M = this.missed, k = Math.min(1, M.t / 0.3), fade = M.t > 6 ? 1 - (M.t - 6) : 1;
    g.save(); g.globalAlpha = k * fade;
    const x0 = X(M.from) + cs / 2, y0 = Y(M.from) + cs / 2, x1 = X(M.to) + cs / 2, y1 = Y(M.to) + cs / 2;
    for (const sq of [M.from, M.to]) { g.strokeStyle = '#ffb703'; g.lineWidth = 3; g.strokeRect(X(sq) + 2, Y(sq) + 2, cs - 4, cs - 4); }
    const a = Math.atan2(y1 - y0, x1 - x0), pulse = 1 + 0.08 * Math.sin(M.t * 6);
    g.strokeStyle = 'rgba(255,183,3,0.9)'; g.lineWidth = cs * 0.16 * pulse; g.lineCap = 'round';
    g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1 - Math.cos(a) * cs * 0.35, y1 - Math.sin(a) * cs * 0.35); g.stroke();
    g.fillStyle = 'rgba(255,183,3,0.95)'; g.beginPath();
    g.moveTo(x1, y1); g.lineTo(x1 - Math.cos(a - 0.5) * cs * 0.5, y1 - Math.sin(a - 0.5) * cs * 0.5); g.lineTo(x1 - Math.cos(a + 0.5) * cs * 0.5, y1 - Math.sin(a + 0.5) * cs * 0.5); g.fill();
    // bandeau sur le côté du plateau
    const bw = Math.min(this.vw - 20, 340), bx = (this.vw - bw) / 2, by = this.oy + this.size + 22;
    g.globalAlpha = k * fade;
    g.fillStyle = 'rgba(40,24,0,0.92)'; g.strokeStyle = '#ffb703'; g.lineWidth = 2;
    g.beginPath(); g.roundRect(bx, by, bw, 54, 14); g.fill(); g.stroke();
    g.fillStyle = '#ffd34d'; g.font = '900 15px system-ui'; g.textAlign = 'left'; g.textBaseline = 'middle';
    g.fillText('💡 Échec et mat raté !', bx + 14, by + 17);
    g.fillStyle = '#fff'; g.font = '600 13px system-ui';
    g.fillText(`${this.names[M.who === 'w' ? 0 : 1]} pouvait jouer ${M.label}. La partie continue.`, bx + 14, by + 38, bw - 24);
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
    const F = (i) => (this.flip ? 63 - i : i);
    const X = (i) => this.ox + (F(i) & 7) * cs, Y = (i) => this.oy + (F(i) >> 3) * cs;
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
    if (this.missed) this._renderMissed(g, X, Y, cs);
    else if (this.grade && this.opts.assistant) this._renderGrade(g, X, Y, cs);
    if (this.opts.assistant) this._renderEvalBar(g);
    // coups possibles
    for (const m of this.targets) {
      const x = X(m.to) + cs / 2, y = Y(m.to) + cs / 2;
      if (this.st.board[m.to] || m.epCap) { g.strokeStyle = 'rgba(20,120,60,0.75)'; g.lineWidth = cs * 0.08; g.beginPath(); g.arc(x, y, cs * 0.44, 0, Math.PI * 2); g.stroke(); }
      else { g.fillStyle = 'rgba(20,120,60,0.55)'; g.beginPath(); g.arc(x, y, cs * 0.15, 0, Math.PI * 2); g.fill(); }
    }
  }
}
