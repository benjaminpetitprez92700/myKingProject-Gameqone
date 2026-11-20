// Guerre Éclair (Stratego) : placement, déplacements, combats révélés, IA, et mode 2 joueurs
// où l'on se passe le téléphone (les pièces adverses restent cachées).
import { SIZE, PIECES, BY_ID, isLake, movable, fight, autoSetup, newBoard, movesFrom, allMoves } from './rules.js';
import { fx } from '../fx.js';
import { portrait } from './art.js';

const ARMY = [{ main: '#b3261e', dark: '#6e130d', light: '#e8574d' }, { main: '#1f4e9e', dark: '#0f2a5a', light: '#4f86d9' }];
const VALUE = { marechal: 10, general: 9, colonel: 8, commandant: 7, capitaine: 6, lieutenant: 5, sergent: 4, demineur: 4.5, eclaireur: 2.5, espion: 6, bombe: 3, drapeau: 1000 };
const AI_NOISE = { facile: 4, moyen: 1.2, difficile: 0.3 };

export class Stratego {
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
    const top = 130, bottom = 96;
    this.size = Math.floor(Math.min(this.vw - 16, this.vh - top - bottom) / SIZE) * SIZE;
    this.cell = this.size / SIZE;
    this.ox = Math.round((this.vw - this.size) / 2);
    this.oy = Math.round(top + (this.vh - top - bottom - this.size) / 2);
    this.boardCv = null; this.backs = null;
  }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    this.board = newBoard();
    this.hist = []; this.lost = [[], []];
    this.sel = null; this.targets = []; this.last = null; this.combat = null; this.anim = null;
    this.over = false; this.t = 0; this.paused = false;
    this.online = opts.mode === 'online'; this.me = this.online ? opts.side : 0;
    this.duo = opts.mode === 'duo';
    window.addEventListener('resize', this._onResize);
    this.resize();
    if (!this.running) { this.running = true; this.lastT = performance.now(); requestAnimationFrame(this._loop); }
    // placement
    if (this.online) { this.myReady = false; this.remoteReady = false; this.queue = []; this._net(opts.net); return this._setup(this.me); }
    for (const c of autoSetup(1)) this.board[c.y * SIZE + c.x] = { side: 1, id: c.id, revealed: false, moved: false };
    this._setup(0);
  }
  stop() { this.running = false; window.removeEventListener('resize', this._onResize); this.hud.controls(null); this.opts?.net?.close(); }

  // ---------- En ligne ----------
  _net(link) {
    const foe = 1 - this.me;
    link.on('setup', (msg) => {
      for (let i = 0; i < 100; i++) if (this.board[i]?.side === foe) this.board[i] = null;
      for (const c of msg.pieces) this.board[c.i] = { side: foe, id: c.id, revealed: false, moved: false };
      this.remoteReady = true;
      if (this.myReady) this._startOnline();
      else this.hud.toast(`${this.names[foe]} est prêt !`, 1400);
    });
    link.on('move', (msg) => { this.queue.push(msg); this._flush(); });
    link.onClose(() => { if (this.running && !this.over) { this.hud.toast('Ton adversaire a quitté la partie', 2500); this._end(this.me, "L'adversaire a quitté la partie."); } });
  }
  _flush() {
    if (!this.queue?.length || this.anim || this.combat || this.over || this.phase !== 'play' || this.turn === this.me) return;
    const m = this.queue.shift();
    this._move(m.from, m.to, true);
  }
  _startOnline() {
    this.phase = 'play'; this.turn = 0; this.viewer = this.me;
    this.hud.toast(this.me === 0 ? 'C\'est parti : tu commences !' : `C'est parti : ${this.names[0]} commence`, 1800);
    this._beginTurn();
  }
  setPaused(p) { this.paused = p; }

  // ---------- Placement ----------
  _setup(side) {
    for (let i = 0; i < 100; i++) if (this.board[i]?.side === side) this.board[i] = null;
    for (const c of autoSetup(side)) this.board[c.y * SIZE + c.x] = { side, id: c.id, revealed: false, moved: false };
    this.phase = 'setup'; this.setupSide = side; this.viewer = side; this.sel = null;
    this.hud.setChip('Placement');
    this.hud.toast(`${this.names[side]} : touche deux de tes pièces pour les échanger`, 2400);
    this._hudScore();
    const el = this.hud.controls(`<div class="setup-ctl">
      <div class="setup-tip">Touche 2 de tes pièces pour les échanger</div>
      <div class="setup-btns"><button class="sbtn shuffle" data-a="shuffle"><span>🎲</span>Mélanger</button><button class="sbtn ready" data-a="ready"><span>✅</span>Je suis prêt</button></div>
    </div>`);
    el.onclick = (e) => {
      const b = e.target.closest('[data-a]'); if (!b) return; fx.tap();
      if (b.dataset.a === 'shuffle') this._setup(side);
      else this._ready();
    };
  }

  _ready() {
    this.hud.controls(null); this.sel = null;
    if (this.online) {
      const pieces = []; for (let i = 0; i < 100; i++) if (this.board[i]?.side === this.me) pieces.push({ i, id: this.board[i].id });
      this.opts.net.send({ t: 'setup', pieces }); this.myReady = true;
      if (this.remoteReady) return this._startOnline();
      this.phase = 'waiting'; this.hud.setChip('En attente…');
      return this.hud.toast(`En attente de ${this.names[1 - this.me]}…`, 2400);
    }
    if (this.duo && this.setupSide === 0) return this._pass(1, () => this._setup(1));
    this.phase = 'play'; this.turn = 0;
    if (this.duo) this._pass(0, () => this._beginTurn()); else this._beginTurn();
  }

  // écran « passe le téléphone » (mode 2 joueurs)
  _pass(side, then) {
    this.phase = 'pass'; this.passTo = side; this.passThen = then; this.viewer = side;
    this.hud.controls(null);
  }

  _hudScore() {
    const p = (s) => `<div class="sp ${this.turn === s && this.phase === 'play' ? 'on' : ''}"><b><i class="army-dot" style="background:${ARMY[s].main}"></i>${this.names[s]}</b><div class="balls"><span class="muted">${40 - this.lost[s].length} pièces</span></div></div>`;
    this.hud.setScore(p(0) + p(1));
  }

  _beginTurn() {
    this.phase = 'play'; this.viewer = this.online ? this.me : this.duo ? this.turn : 0;
    this.moves = allMoves(this.board, this.turn, this.hist);
    this._hudScore();
    this.hud.setChip(this.online ? (this.turn === this.me ? 'À toi de jouer' : `À ${this.names[this.turn]}`) : this.turn === 0 || this.duo ? `À ${this.names[this.turn]}` : "L'ordi réfléchit…");
    if (!this.moves.length) return this._end(1 - this.turn, `${this.names[this.turn]} ne peut plus bouger.`);
    if (this.online) setTimeout(() => this._flush(), 50);
    else if (!this.duo && this.turn === 1) setTimeout(() => this.running && this._aiPlay(), 650);
  }

  // ---------- Entrées ----------
  _cellAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - this.ox) / this.cell), y = Math.floor((e.clientY - r.top - this.oy) / this.cell);
    if (x < 0 || y < 0 || x >= SIZE || y >= SIZE) return -1;
    return this.viewer === 1 ? (9 - y) * SIZE + (9 - x) : y * SIZE + x;
  }

  _tap(e) {
    if (!this.running || this.paused || this.over) return;
    if (this.phase === 'pass') { fx.tap(); const f = this.passThen; this.passThen = null; f?.(); return; }
    if (this.combat || this.anim) return;
    const i = this._cellAt(e); if (i < 0) return;
    if (this.phase === 'setup') {
      const p = this.board[i]; if (!p || p.side !== this.setupSide) return;
      if (this.sel == null) { this.sel = i; fx.tick(); }
      else { const a = this.board[this.sel]; this.board[this.sel] = p; this.board[i] = a; this.sel = null; fx.cushion(0.5); }
      return;
    }
    if (this.phase !== 'play' || (this.online ? this.turn !== this.me : !this.duo && this.turn === 1)) return;
    if (this.sel != null && this.targets.includes(i)) return this._move(this.sel, i);
    const p = this.board[i];
    if (p && p.side === this.turn && movable(p.id)) {
      this.sel = i; this.targets = this.moves.filter((m) => m.from === i).map((m) => m.to);
      fx.tick();
      if (!this.targets.length) this.hud.toast('Cette pièce est bloquée', 900);
    } else if (p && p.side === this.turn) { this.hud.toast(`${BY_ID[p.id].name} : ne bouge jamais`, 1000); }
    else { this.sel = null; this.targets = []; }
  }

  // ---------- Jeu ----------
  _move(from, to, remote = false) {
    const a = this.board[from], d = this.board[to];
    if (this.online && !remote) this.opts.net.send({ t: 'move', from, to });
    this.sel = null; this.targets = [];
    this.hist.push({ side: a.side, from, to });
    a.moved = true;
    if (Math.abs((from % 10) - (to % 10)) + Math.abs(((from / 10) | 0) - ((to / 10) | 0)) > 1) a.revealed = true; // un éclaireur qui court se trahit
    if (!d) {
      this.anim = { from, to, piece: a, t: 0, then: () => { this.board[to] = a; this.board[from] = null; this._after(from, to); } };
      this.board[from] = null;
      fx.cushion(0.4);
      return;
    }
    // combat : on révèle les deux pièces
    const res = fight(a.id, d.id);
    this.combat = { a, d, res, t: 0, from, to };
    fx.metal(0.8);
  }

  _resolveCombat() {
    const { a, d, res, from, to } = this.combat;
    a.revealed = true; d.revealed = true;
    this.board[from] = null;
    if (res === 'win') { this.board[to] = a; this.lost[d.side].push(d.id); }
    else if (res === 'lose') { this.lost[a.side].push(a.id); }
    else { this.board[to] = null; this.lost[a.side].push(a.id); this.lost[d.side].push(d.id); }
    if (d.id === 'bombe' && res === 'lose') fx.slam(); else fx.thud(0.8);
    this.combat = null;
    if (d.id === 'drapeau') return this._end(a.side, `${this.names[a.side]} a capturé le drapeau !`);
    this._after(from, to);
  }

  _after(from, to) {
    this.last = { from, to };
    this.turn = 1 - this.turn;
    this._hudScore();
    if (this.duo) {
      this.phase = 'between';
      setTimeout(() => this.running && !this.over && this._pass(this.turn, () => this._beginTurn()), 900);
    } else this._beginTurn();
  }

  _end(winner, why) {
    if (this.over) return;
    const me = this.online ? this.me : 0;
    this.over = true; this.phase = 'over'; this.viewer = this.duo ? this.viewer : me;
    for (const p of this.board) if (p) p.revealed = true;
    if (winner === me || this.duo) fx.win(); else fx.lose();
    setTimeout(() => this.running && this.hud.end({
      won: this.duo ? true : winner === me,
      title: this.duo ? `${this.names[winner]} gagne !` : winner === me ? 'Victoire !' : 'Défaite…',
      text: why, winner,
    }), 1600);
  }

  // ---------- IA ----------
  _aiPlay() {
    if (this.paused) return setTimeout(() => this.running && this._aiPlay(), 300);
    const me = 1, foe = 0, b = this.board, lvl = this.opts.level;
    // pièces adverses encore inconnues
    const pool = {};
    for (const p of PIECES) pool[p.id] = p.n;
    for (const id of this.lost[foe]) pool[id]--;
    for (const p of b) if (p && p.side === foe && p.revealed) pool[p.id]--;
    const guess = (t) => {
      const ids = Object.keys(pool).filter((id) => pool[id] > 0 && (!t.moved || movable(id)));
      const tot = ids.reduce((s, id) => s + pool[id], 0) || 1;
      return ids.map((id) => [id, pool[id] / tot]);
    };
    const outcome = (att, def) => { const r = fight(att, def); return r === 'win' ? VALUE[def] + 0.5 : r === 'lose' ? -VALUE[att] : VALUE[def] - VALUE[att]; };
    let best = null;
    for (const m of this.moves) {
      const a = b[m.from], t = b[m.to], ty = (m.to / 10) | 0, fy = (m.from / 10) | 0;
      let s = 0;
      if (t) {
        if (t.revealed) s = outcome(a.id, t.id) * 2;
        else s = guess(t).reduce((acc, [id, pr]) => acc + pr * outcome(a.id, id), 0) * (a.id === 'eclaireur' ? 1.4 : 1) + (a.id === 'eclaireur' ? 1.2 : 0);
      } else {
        s = (ty - fy) * 0.25 * (VALUE[a.id] < 7 ? 1 : 0.3);
        // danger : pièce adverse connue plus forte à côté
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = (m.to % 10) + dx, ny = ty + dy; if (nx < 0 || nx > 9 || ny < 0 || ny > 9) continue;
          const n = b[ny * 10 + nx];
          if (n && n.side === foe) s += n.revealed ? (fight(n.id, a.id) === 'win' ? -VALUE[a.id] * 0.9 : 0.4) : -VALUE[a.id] * 0.12;
        }
        if (a.id === 'marechal' || a.id === 'general') s -= 0.4;
      }
      s += (Math.random() - 0.5) * AI_NOISE[lvl];
      if (!best || s > best.s) best = { m, s };
    }
    if (best) this._move(best.m.from, best.m.to);
  }

  // ---------- Boucle ----------
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastT) / 1000); this.lastT = now;
    if (!this.paused) {
      this.t += dt;
      if (this.anim) { this.anim.t += dt / 0.22; if (this.anim.t >= 1) { const f = this.anim.then; this.anim = null; f(); } }
      if (this.combat) { this.combat.t += dt; if (this.combat.t > 1.6) this._resolveCombat(); }
    }
    this._render();
    requestAnimationFrame(this._loop);
  }

  // ---------- Rendu ----------
  _boardCanvas() {
    const c = document.createElement('canvas'), d = this.dpr, S = this.size + 24;
    c.width = Math.round(S * d); c.height = Math.round(S * d);
    const g = c.getContext('2d'); g.scale(d, d);
    const fr = g.createLinearGradient(0, 0, S, S); fr.addColorStop(0, '#4a3a22'); fr.addColorStop(1, '#2a2014');
    g.fillStyle = fr; g.beginPath(); g.roundRect(0, 0, S, S, 12); g.fill();
    g.save(); g.translate(12, 12);
    // terrain de campagne (camouflage)
    g.fillStyle = '#5f7a3a'; g.fillRect(0, 0, this.size, this.size);
    let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 90; i++) { g.fillStyle = ['rgba(70,95,40,0.6)', 'rgba(120,140,70,0.5)', 'rgba(90,80,45,0.35)'][i % 3]; g.beginPath(); g.ellipse(r() * this.size, r() * this.size, 10 + r() * 30, 6 + r() * 18, r() * 3, 0, Math.PI * 2); g.fill(); }
    const cs = this.cell;
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if ((x + y) % 2) { g.fillStyle = 'rgba(0,0,0,0.06)'; g.fillRect(x * cs, y * cs, cs, cs); }
    }
    // lacs
    for (const [lx, ly] of [[2, 4], [6, 4]]) {
      const gr = g.createRadialGradient((lx + 1) * cs, (ly + 1) * cs, 4, (lx + 1) * cs, (ly + 1) * cs, cs * 1.3);
      gr.addColorStop(0, '#1d6fa8'); gr.addColorStop(1, '#3fa2d6');
      g.fillStyle = '#c9b98a'; g.beginPath(); g.roundRect(lx * cs - 2, ly * cs - 2, cs * 2 + 4, cs * 2 + 4, cs * 0.4); g.fill();
      g.fillStyle = gr; g.beginPath(); g.roundRect(lx * cs + 2, ly * cs + 2, cs * 2 - 4, cs * 2 - 4, cs * 0.35); g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.35)'; g.lineWidth = 1.2;
      for (let k = 0; k < 3; k++) { g.beginPath(); g.arc((lx + 0.6 + k * 0.4) * cs, (ly + 0.7 + k * 0.3) * cs, cs * 0.18, 3.6, 5.6); g.stroke(); }
    }
    g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 1;
    for (let k = 0; k <= SIZE; k++) { g.beginPath(); g.moveTo(k * cs, 0); g.lineTo(k * cs, this.size); g.stroke(); g.beginPath(); g.moveTo(0, k * cs); g.lineTo(this.size, k * cs); g.stroke(); }
    g.restore();
    return c;
  }

  _icon(g, id, s, col) {
    // insignes dessinés, centrés en (0,0), taille s
    g.fillStyle = col; g.strokeStyle = col; g.lineWidth = s * 0.07; g.lineCap = 'round'; g.lineJoin = 'round';
    const star = (x, y, r) => { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + (i * Math.PI) / 5, rr = i % 2 ? r * 0.45 : r; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } g.closePath(); g.fill(); };
    const bars = (n) => { for (let k = 0; k < n; k++) g.fillRect(-s * 0.3, -s * 0.25 + k * s * 0.13, s * 0.6, s * 0.08); };
    switch (id) {
      case 'marechal': star(0, -s * 0.12, s * 0.16); star(-s * 0.22, s * 0.12, s * 0.12); star(s * 0.22, s * 0.12, s * 0.12); g.fillRect(-s * 0.3, s * 0.28, s * 0.6, s * 0.05); break;
      case 'general': star(-s * 0.2, 0, s * 0.12); star(0, 0, s * 0.12); star(s * 0.2, 0, s * 0.12); break;
      case 'colonel': bars(5); break;
      case 'commandant': bars(4); break;
      case 'capitaine': bars(3); break;
      case 'lieutenant': bars(2); break;
      case 'sergent': for (let k = 0; k < 2; k++) { g.beginPath(); g.moveTo(-s * 0.25, -s * 0.05 + k * s * 0.17); g.lineTo(0, -s * 0.22 + k * s * 0.17); g.lineTo(s * 0.25, -s * 0.05 + k * s * 0.17); g.stroke(); } break;
      case 'demineur': g.beginPath(); g.moveTo(-s * 0.22, s * 0.25); g.lineTo(s * 0.18, -s * 0.15); g.stroke(); g.beginPath(); g.moveTo(s * 0.02, -s * 0.28); g.quadraticCurveTo(s * 0.28, -s * 0.3, s * 0.32, -s * 0.05); g.stroke(); break;
      case 'eclaireur': g.beginPath(); g.arc(-s * 0.12, s * 0.05, s * 0.11, 0, Math.PI * 2); g.arc(s * 0.12, s * 0.05, s * 0.11, 0, Math.PI * 2); g.stroke(); g.fillRect(-s * 0.04, -s * 0.02, s * 0.08, s * 0.05); g.fillRect(-s * 0.2, -s * 0.18, s * 0.12, s * 0.12); g.fillRect(s * 0.08, -s * 0.18, s * 0.12, s * 0.12); break;
      case 'espion': g.beginPath(); g.ellipse(0, -s * 0.1, s * 0.3, s * 0.07, 0, 0, Math.PI * 2); g.fill(); g.fillRect(-s * 0.16, -s * 0.3, s * 0.32, s * 0.2); g.beginPath(); g.ellipse(-s * 0.1, s * 0.08, s * 0.08, s * 0.05, 0, 0, Math.PI * 2); g.ellipse(s * 0.1, s * 0.08, s * 0.08, s * 0.05, 0, 0, Math.PI * 2); g.fill(); break;
      case 'bombe': g.beginPath(); g.arc(0, s * 0.06, s * 0.22, 0, Math.PI * 2); g.fill(); g.fillRect(-s * 0.06, -s * 0.22, s * 0.12, s * 0.08); g.beginPath(); g.moveTo(0, -s * 0.2); g.quadraticCurveTo(s * 0.12, -s * 0.34, s * 0.22, -s * 0.28); g.stroke(); g.fillStyle = '#ffb703'; star(s * 0.25, -s * 0.3, s * 0.08); break;
      case 'drapeau': g.fillRect(-s * 0.22, -s * 0.3, s * 0.05, s * 0.6); g.beginPath(); g.moveTo(-s * 0.17, -s * 0.3); g.lineTo(s * 0.26, -s * 0.18); g.lineTo(-s * 0.17, -s * 0.04); g.closePath(); g.fill(); break;
    }
  }

  // tuile de pièce (face visible ou cachée)
  _tile(g, p, x, y, s, faceUp, glow = false) {
    const A = ARMY[p.side];
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.roundRect(-s / 2 + 2, -s / 2 + 3, s, s, s * 0.16); g.fill();
    const gr = g.createLinearGradient(0, -s / 2, 0, s / 2); gr.addColorStop(0, A.light); gr.addColorStop(0.5, A.main); gr.addColorStop(1, A.dark);
    g.fillStyle = gr; g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * 0.16); g.fill();
    if (glow) { g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.stroke(); }
    if (faceUp) {
      // portrait illustré du personnage
      const px = Math.max(32, Math.round(s * 0.86 * this.dpr));
      g.save(); g.beginPath(); g.roundRect(-s * 0.43, -s * 0.43, s * 0.86, s * 0.86, s * 0.1); g.clip();
      g.drawImage(portrait(p.id, { ...A, side: p.side, style: this.opts.pieceStyle }, px), -s * 0.43, -s * 0.43, s * 0.86, s * 0.86);
      // bandeau du nom
      g.fillStyle = 'rgba(0,0,0,0.62)'; g.fillRect(-s * 0.43, s * 0.2, s * 0.86, s * 0.23);
      g.restore();
      const P = BY_ID[p.id];
      g.fillStyle = '#fff'; g.font = `800 ${Math.max(7, s * 0.16)}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(s > 70 ? P.name : P.short, 0, s * 0.315);
      if (P.r >= 1 && P.r <= 10) {
        g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(-s * 0.32, -s * 0.32, s * 0.15, 0, Math.PI * 2); g.fill();
        g.strokeStyle = A.dark; g.lineWidth = Math.max(1, s * 0.03); g.stroke();
        g.fillStyle = A.dark; g.font = `900 ${s * 0.17}px system-ui`; g.fillText(String(P.r), -s * 0.32, -s * 0.315);
      }
      if (p.revealed && p.side === this.viewer && !this.over) { g.fillStyle = '#ffd34d'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(s * 0.34, -s * 0.34, s * 0.09, 0, Math.PI * 2); g.fill(); g.stroke(); }
    } else {
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = s * 0.04; g.beginPath(); g.roundRect(-s * 0.34, -s * 0.34, s * 0.68, s * 0.68, s * 0.08); g.stroke();
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.beginPath(); g.moveTo(-s * 0.2, s * 0.12); g.lineTo(-s * 0.2, -s * 0.06); g.lineTo(-s * 0.1, s * 0.03); g.lineTo(0, -s * 0.14); g.lineTo(s * 0.1, s * 0.03); g.lineTo(s * 0.2, -s * 0.06); g.lineTo(s * 0.2, s * 0.12); g.fill();
    }
    g.restore();
  }

  _render() {
    const g = this.ctx, d = this.dpr, cs = this.cell;
    g.setTransform(d, 0, 0, d, 0, 0);
    const bg = g.createRadialGradient(this.vw / 2, this.vh / 2, 40, this.vw / 2, this.vh / 2, this.vh * 0.8);
    bg.addColorStop(0, '#2d3a22'); bg.addColorStop(1, '#0b0f08');
    g.fillStyle = bg; g.fillRect(0, 0, this.vw, this.vh);
    if (!this.size) return;
    if (!this.boardCv) this.boardCv = this._boardCanvas();
    g.drawImage(this.boardCv, this.ox - 12, this.oy - 12, this.size + 24, this.size + 24);
    const V = (i) => { const x = i % 10, y = (i / 10) | 0; return this.viewer === 1 ? [9 - x, 9 - y] : [x, y]; };
    const C = (i) => { const [x, y] = V(i); return [this.ox + (x + 0.5) * cs, this.oy + (y + 0.5) * cs]; };
    if (this.phase === 'pass') return this._renderPass(g);
    if (this.phase === 'setup') {
      g.fillStyle = 'rgba(255,211,77,0.12)';
      const rows = this.setupSide === this.viewer ? [6, 7, 8, 9] : [];
      for (const y of rows) g.fillRect(this.ox, this.oy + y * cs, this.size, cs);
    }
    if (this.last) for (const i of [this.last.from, this.last.to]) { const [x, y] = C(i); g.fillStyle = 'rgba(255,214,60,0.3)'; g.fillRect(x - cs / 2, y - cs / 2, cs, cs); }
    for (let i = 0; i < 100; i++) {
      const p = this.board[i]; if (!p) continue;
      if (this.phase === 'setup' && p.side !== this.setupSide) { const [x, y] = C(i); this._tile(g, p, x, y, cs * 0.86, false); continue; }
      const [x, y] = C(i);
      const faceUp = this.over || p.side === this.viewer || p.revealed;
      this._tile(g, p, x, y, cs * 0.86, faceUp, i === this.sel);
    }
    if (this.anim) {
      const a = this.anim, k = 1 - Math.pow(1 - Math.min(1, a.t), 3), [x0, y0] = C(a.from), [x1, y1] = C(a.to);
      this._tile(g, a.piece, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * cs * 0.2, cs * 0.86, a.piece.side === this.viewer || a.piece.revealed);
    }
    for (const t of this.targets) {
      const [x, y] = C(t);
      if (this.board[t]) { g.strokeStyle = 'rgba(255,60,60,0.9)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - cs * 0.47, y - cs * 0.47, cs * 0.94, cs * 0.94, cs * 0.18); g.stroke(); }
      else { g.fillStyle = 'rgba(255,255,255,0.65)'; g.beginPath(); g.arc(x, y, cs * 0.13, 0, Math.PI * 2); g.fill(); }
    }
    if (this.combat) this._renderCombat(g);
  }

  _renderCombat(g) {
    const c = this.combat, k = Math.min(1, c.t / 0.35);
    g.fillStyle = `rgba(0,0,0,${0.6 * k})`; g.fillRect(0, 0, this.vw, this.vh);
    const s = Math.min(this.vw * 0.3, 130), cy = this.vh * 0.48;
    const off = (1 - k) * this.vw * 0.5;
    this._tile(g, c.a, this.vw / 2 - s * 0.8 - off, cy, s, true);
    this._tile(g, c.d, this.vw / 2 + s * 0.8 + off, cy, s, true);
    g.fillStyle = '#fff'; g.font = `900 ${s * 0.3}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('VS', this.vw / 2, cy);
    if (c.t > 0.7) {
      const A = BY_ID[c.a.id].name, D = BY_ID[c.d.id].name;
      const txt = c.d.id === 'drapeau' ? 'Drapeau capturé !' : c.res === 'win' ? `${A} gagne` : c.res === 'lose' ? (c.d.id === 'bombe' ? 'Boum ! La bombe explose' : `${D} gagne`) : 'Égalité : les deux tombent';
      g.font = `900 ${Math.min(26, this.vw * 0.06)}px system-ui`; g.fillStyle = '#ffd34d';
      g.fillText(txt, this.vw / 2, cy + s * 0.85);
      // la pièce perdante s'estompe
      const loser = c.res === 'win' ? 1 : c.res === 'lose' ? 0 : 2, x = loser === 0 ? this.vw / 2 - s * 0.8 : this.vw / 2 + s * 0.8;
      g.fillStyle = `rgba(0,0,0,${Math.min(0.7, (c.t - 0.7) * 1.5)})`;
      if (loser === 2) { g.fillRect(this.vw / 2 - s * 1.3, cy - s / 2, s, s); g.fillRect(this.vw / 2 + s * 0.3, cy - s / 2, s, s); }
      else g.fillRect(x - s / 2, cy - s / 2, s, s);
    }
  }

  _renderPass(g) {
    g.fillStyle = 'rgba(8,10,6,0.96)'; g.fillRect(0, 0, this.vw, this.vh);
    const A = ARMY[this.passTo];
    g.fillStyle = A.main; g.beginPath(); g.arc(this.vw / 2, this.vh * 0.4, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '900 40px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('📱', this.vw / 2, this.vh * 0.4);
    g.font = '800 20px system-ui'; g.fillText(`Passe le téléphone à ${this.names[this.passTo]}`, this.vw / 2, this.vh * 0.52);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '600 15px system-ui';
    g.fillText(this.last && this.phase === 'pass' ? "L'autre joueur ne doit pas regarder l'écran" : 'Chacun place ses pièces en secret', this.vw / 2, this.vh * 0.57);
    const pulse = 0.6 + 0.4 * Math.sin(this.t * 4);
    g.globalAlpha = pulse; g.fillStyle = '#ffd34d'; g.font = '900 17px system-ui'; g.fillText('TOUCHE POUR CONTINUER', this.vw / 2, this.vh * 0.68); g.globalAlpha = 1;
  }
}
