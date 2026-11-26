// Guerre Éclair : placement secret, déplacements, combats révélés, aviation, bombes volantes,
// parachutistes, IA, mode 2 joueurs (on se passe le téléphone) et jeu en ligne.
import { W, BY_ID, geom, xy, isCross, isDark, isFighter, objectives, army, fight, raid, allActions, autoSetup, v1Path } from './rules.js';
import { fx } from '../fx.js';
import { portrait } from './art.js';

export const ARMY = [{ main: '#b3261e', dark: '#6e130d', light: '#e8574d' }, { main: '#1f4e9e', dark: '#0f2a5a', light: '#4f86d9' }];
const VALUE = {
  corpsfranc: 2, sapeur: 4, parachutiste: 3.5, caporal: 4, sergent: 5, adjudant: 6, adjudantchef: 7, souslieutenant: 8, lieutenant: 9,
  capitaine: 10, commandant: 11, ltcolonel: 12, colonel: 13, general: 16, espion: 6, drapeau: 400, plan: 400,
  mine: 3, bomberet: 2.5, v1: 7, dca: 4, citerne: 6, barrage: 3, bombardier: 8,
};
const AI_NOISE = { facile: 4, moyen: 1.2, difficile: 0.3 };
export const HELP = {
  corpsfranc: '1re avance : bond jusqu\'à 3 cases', sapeur: 'désamorce mines et bombes', parachutiste: 'saute 1 fois chez l\'ennemi puis attaque',
  general: 'seul un espion peut le prendre', espion: 'seul capable de prendre le Général', drapeau: 'à protéger !', plan: 'à protéger !',
  mine: 'fait sauter qui l\'attaque', bomberet: 'se pose 1 fois chez l\'ennemi', v1: 'glisse puis file droit devant', dca: 'abat les bombardiers',
  citerne: 'carburant des bombardiers', barrage: 'bloque bombardiers et bombes volantes', bombardier: 'frappe une case noire',
};

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
    if (!this.G) return;
    const top = 128, bottom = 118, G = this.G;
    this.cell = Math.floor(Math.min((this.vw - 12) / W, (this.vh - top - bottom) / G.H));
    this.bw = this.cell * W; this.bh = this.cell * G.H;
    this.ox = Math.round((this.vw - this.bw) / 2);
    this.oy = Math.round(top + (this.vh - top - bottom - this.bh) / 2);
    this.boardCv = null;
  }

  start(opts) {
    this.opts = opts; this.names = opts.names;
    this.online = opts.mode === 'online'; this.me = this.online ? opts.side : 0;
    this.duo = opts.mode === 'duo';
    this.sel = null; this.acts = []; this.last = null; this.combat = null; this.anim = null; this.blast = null; this.paraFollow = null;
    this.over = false; this.t = 0; this.paused = false;
    window.addEventListener('resize', this._onResize);
    this.G = null; this.resize();
    if (!this.running) { this.running = true; this.lastT = performance.now(); requestAnimationFrame(this._loop); }
    if (this.online) {
      this.myReady = false; this.remoteReady = false; this.queue = [];
      this._net(opts.net);
      if (this.me === 0) { this._init(opts.rules || 'complet'); opts.net.send({ t: 'cfg', rules: this.G.mode }); this._setup(0); }
      else { this.phase = 'waiting'; this.hud.setChip('Connexion…'); }
      return;
    }
    this._init(opts.rules || 'complet');
    for (const c of autoSetup(this.G, 1)) this.board[c.i] = this._piece(1, c.id);
    this._setup(0);
  }
  _init(mode) {
    this.G = geom(mode);
    this.board = new Array(this.G.N).fill(null);
    this.hist = []; this.lost = [[], []]; this.raids = [Infinity, Infinity];
    this.total = army(mode).length;
    this.resize();
  }
  _piece(side, id) { return { side, id, revealed: false, moved: false, dropped: false }; }
  get st() { return { board: this.board, hist: this.hist, raids: this.raids }; }
  stop() { this.drawerEl?.remove(); this.drawerEl = null; this.running = false; window.removeEventListener('resize', this._onResize); this.hud.controls(null); this.opts?.net?.close(); }
  setPaused(p) { this.paused = p; }

  // ---------- En ligne ----------
  _net(link) {
    const foe = 1 - this.me;
    link.on('cfg', (msg) => { if (this.me === 1 && !this.G) { this._init(msg.rules); this._setup(1); } });
    link.on('setup', (msg) => {
      const go = () => {
        for (let i = 0; i < this.G.N; i++) if (this.board[i]?.side === foe) this.board[i] = null;
        for (const c of msg.pieces) this.board[c.i] = this._piece(foe, c.id);
        this.remoteReady = true;
        if (this.myReady) this._startOnline();
        else this.hud.toast(`${this.names[foe]} est prêt !`, 1400);
      };
      if (this.G) go(); else setTimeout(go, 300);
    });
    link.on('act', (msg) => { this.queue.push(msg.a); this._flush(); });
    link.onClose(() => { if (this.running && !this.over) { this.hud.toast('Ton adversaire a quitté la partie', 2500); this._end(this.me, "L'adversaire a quitté la partie."); } });
  }
  _flush() {
    if (!this.queue?.length || this._busy() || this.over || this.phase !== 'play' || this.turn === this.me) return;
    this._do(this.queue.shift(), true);
  }
  _busy() { return !!(this.anim || this.combat || this.blast); }
  _startOnline() {
    this.phase = 'play'; this.turn = 0; this.viewer = this.me;
    this.hud.toast(this.me === 0 ? 'C\'est parti : tu commences !' : `C'est parti : ${this.names[0]} commence`, 1800);
    this._beginTurn();
  }

  // ---------- Placement ----------
  _setup(side) {
    for (let i = 0; i < this.G.N; i++) if (this.board[i]?.side === side) this.board[i] = null;
    this.phase = 'setup'; this.setupSide = side; this.viewer = side; this.sel = null; this.pick = null;
    this.hud.setChip('Placement');
    this._hudScore();
    this.manual = this.opts.place === 'manuel';
    if (this.manual) {
      this.stock = {}; for (const id of army(this.G.mode)) this.stock[id] = (this.stock[id] || 0) + 1;
      this.hud.toast(`${this.names[side]} : ouvre la réserve à droite et pose tes vignettes`, 2600);
      this._drawer(true);
    } else {
      for (const c of autoSetup(this.G, side)) this.board[c.i] = this._piece(side, c.id);
      this.hud.toast(`${this.names[side]} : touche deux de tes vignettes pour les échanger`, 2400);
    }
    this._setupCtl();
  }
  _setupCtl() {
    const side = this.setupSide, left = this.manual ? Object.values(this.stock).reduce((a, b) => a + b, 0) : 0;
    const tip = this.manual ? (left ? `Encore ${left} vignette${left > 1 ? 's' : ''} à poser` : 'Tout est posé ! Touche 2 vignettes pour les échanger')
      : this.G.mode === 'facile' ? 'Astuce : entoure ton drapeau et ton plan de mines' : "Astuce : les cases blanches sont à l'abri des bombardiers";
    const btns = this.manual
      ? `<button class="sbtn shuffle" data-a="fill"><span>🎲</span>${left ? 'Compléter' : 'Mélanger'}</button><button class="sbtn shuffle" data-a="clear"><span>🧹</span>Vider</button><button class="sbtn ready" data-a="ready" ${left ? 'disabled' : ''}><span>✅</span>Prêt</button>`
      : `<button class="sbtn shuffle" data-a="shuffle"><span>🎲</span>Mélanger</button><button class="sbtn ready" data-a="ready"><span>✅</span>Je suis prêt</button>`;
    const el = this.hud.controls(`<div class="setup-ctl"><div class="setup-tip">${tip}</div><div class="setup-btns">${btns}</div></div>`);
    el.onclick = (e) => {
      const b = e.target.closest('[data-a]'); if (!b || b.disabled) return; fx.tap();
      const a = b.dataset.a;
      if (a === 'shuffle') return this._setup(side);
      if (a === 'ready') return this._ready();
      if (a === 'clear') {
        for (let i = 0; i < this.G.N; i++) { const p = this.board[i]; if (p?.side === side) { this.stock[p.id]++; this.board[i] = null; } }
      } else if (a === 'fill') {
        if (!Object.values(this.stock).some((n) => n)) { // tout est posé : on mélange
          const ids = []; for (let i = 0; i < this.G.N; i++) if (this.board[i]?.side === side) ids.push(i);
          const vals = ids.map((i) => this.board[i]).sort(() => Math.random() - 0.5);
          ids.forEach((i, k) => (this.board[i] = vals[k]));
        } else {
          const free = this._ownCells().filter((i) => !this.board[i]).sort(() => Math.random() - 0.5);
          for (const id of Object.keys(this.stock)) while (this.stock[id] > 0) { this.board[free.pop()] = this._piece(side, id); this.stock[id]--; }
        }
      }
      this.sel = null; this.pick = null; this._drawer(); this._setupCtl();
    };
  }
  // cases du camp du joueur qui place
  _ownCells() {
    const out = [], G = this.G;
    for (let i = 0; i < G.N; i++) { const y = (i / W) | 0; if (this.setupSide === 0 ? y >= G.H - G.R : y < G.R) out.push(i); }
    return out;
  }

  // Réserve (accordéon à droite) pour le placement à la main
  _drawer(open) {
    const host = document.getElementById('scr-arena');
    let d = this.drawerEl;
    if (!this.manual || this.phase !== 'setup') { d?.remove(); this.drawerEl = null; return; }
    if (!d) {
      d = this.drawerEl = document.createElement('div'); d.className = 'sg-drawer'; host.appendChild(d);
      this.groupsOpen = { off: true };
      d.onclick = (e) => {
        if (e.target.closest('.sg-tab')) { fx.tap(); d.classList.toggle('open'); return; }
        const h = e.target.closest('[data-grp]'); if (h) { fx.tick(); this.groupsOpen[h.dataset.grp] = !this.groupsOpen[h.dataset.grp]; return this._drawer(); }
        const r = e.target.closest('[data-pid]'); if (!r || !this.stock[r.dataset.pid]) return;
        fx.tick(); this.pick = r.dataset.pid; this.sel = null;
        d.classList.remove('open'); this._drawer();
        this.hud.toast(`${BY_ID[this.pick].name} : touche une case libre de ton camp`, 1300);
      };
    }
    if (open != null) d.classList.toggle('open', open);
    const A = ARMY[this.setupSide], style = this.opts.pieceStyle;
    this.thumbs ||= {};
    const img = (id) => (this.thumbs[id + this.setupSide] ||= portrait(id, { ...A, side: this.setupSide, style }, 72).toDataURL());
    const GROUPS = [
      ['off', '🎖️ Officiers et sous-officiers', ['general', 'colonel', 'ltcolonel', 'commandant', 'capitaine', 'lieutenant', 'souslieutenant', 'adjudantchef', 'adjudant', 'sergent', 'caporal']],
      ['tr', '🪖 Troupes', ['corpsfranc', 'sapeur', 'parachutiste', 'espion']],
      ['obj', '🚩 Drapeau et plan secret', ['drapeau', 'plan']],
      ['exp', '💣 Mines et bombes', ['mine', 'bomberet', 'v1']],
      ['mat', '✈️ Aviation et matériel', ['bombardier', 'dca', 'barrage', 'citerne']],
    ];
    const left = Object.values(this.stock).reduce((a, b) => a + b, 0);
    let h = `<button class="sg-tab"><span>${d.classList.contains('open') ? '▶' : '◀'}</span><b>Réserve</b><i>${left}</i></button><div class="sg-panel"><div class="sg-head">Touche une vignette, puis une case de ton camp</div>`;
    for (const [k, title, ids] of GROUPS) {
      const list = ids.filter((id) => this.stock[id] != null);
      if (!list.length) continue;
      const n = list.reduce((a, id) => a + this.stock[id], 0);
      h += `<div class="sg-grp ${this.groupsOpen[k] ? 'on' : ''}"><button class="sg-gh" data-grp="${k}"><span>${title}</span><i>${n}</i><em>${this.groupsOpen[k] ? '▾' : '▸'}</em></button>`;
      if (this.groupsOpen[k]) h += '<div class="sg-items">' + list.map((id) => {
        const P = BY_ID[id], c = this.stock[id];
        return `<button class="sg-it ${c ? '' : 'done'} ${this.pick === id ? 'sel' : ''}" data-pid="${id}"><img src="${img(id)}" alt="">${P.kind === 'fight' ? `<u>${P.r}</u>` : ''}<span>${P.name}<small>${HELP[id] || ''}</small></span><i>×${c}</i></button>`;
      }).join('') + '</div>';
      h += '</div>';
    }
    d.innerHTML = h + '</div>';
  }

  _ready() {
    this.hud.controls(null); this.sel = null; this.pick = null; this.drawerEl?.remove(); this.drawerEl = null;
    if (this.online) {
      const pieces = []; for (let i = 0; i < this.G.N; i++) if (this.board[i]?.side === this.me) pieces.push({ i, id: this.board[i].id });
      this.opts.net.send({ t: 'setup', pieces }); this.myReady = true;
      if (this.remoteReady) return this._startOnline();
      this.phase = 'waiting'; this.hud.setChip('En attente…');
      return this.hud.toast(`En attente de ${this.names[1 - this.me]}…`, 2400);
    }
    if (this.duo && this.setupSide === 0) return this._pass(1, () => this._setup(1));
    this.phase = 'play'; this.turn = 0;
    if (this.duo) this._pass(0, () => this._beginTurn()); else this._beginTurn();
  }

  _pass(side, then) {
    this.phase = 'pass'; this.passTo = side; this.passThen = then; this.viewer = side;
    this.hud.controls(null);
  }

  _hudScore() {
    const obj = objectives(this.G.mode);
    const p = (s) => {
      const taken = obj.filter((o) => this.lost[s].includes(o)).length;
      const left = this.board.filter((x) => x && x.side === s).length;
      return `<div class="sp ${this.turn === s && this.phase === 'play' ? 'on' : ''}"><b><i class="army-dot" style="background:${ARMY[s].main}"></i>${this.names[s]}</b><div class="balls"><span class="muted">${left} vignettes · ${'🎯'.repeat(obj.length - taken)}${'✖️'.repeat(taken)}</span></div></div>`;
    };
    this.hud.setScore(p(0) + p(1));
  }

  _beginTurn() {
    this.phase = 'play'; this.viewer = this.online ? this.me : this.duo ? this.turn : 0;
    this.acts = allActions(this.G, this.st, this.turn);
    this.sel = null; this.paraFollow = null;
    this._hudScore(); this._ctl();
    this.hud.setChip(this.online ? (this.turn === this.me ? 'À toi de jouer' : `À ${this.names[this.turn]}`) : this.turn === 0 || this.duo ? `À ${this.names[this.turn]}` : "L'ordi réfléchit…");
    if (!this.acts.length) return this._end(1 - this.turn, `${this.names[this.turn]} ne peut plus bouger.`);
    if (this.online) setTimeout(() => this._flush(), 50);
    else if (this._isAI(this.turn)) setTimeout(() => this.running && this._aiPlay(), this.opts.aiAll ? 120 : 650);
  }
  _isAI(side) { return !this.online && !this.duo && (side === 1 || !!this.opts.aiAll); }
  _myTurn() { return !this._isAI(this.turn) && this.phase === 'play' && (this.online ? this.turn === this.me : this.duo || this.turn === 0); }

  // barre d'actions spéciales (lancer une bombe volante, renoncer à l'attaque du parachutiste)
  _ctl() {
    if (this.phase !== 'play' || this.over || !this._myTurn()) return this.hud.controls(null);
    if (this.paraFollow) {
      const el = this.hud.controls(`<div class="setup-ctl"><div class="setup-tip">🪂 Parachutiste au sol : attaque une vignette voisine (case rouge)</div><div class="setup-btns"><button class="sbtn shuffle" data-a="skip"><span>✋</span>Ne pas attaquer</button></div></div>`);
      el.onclick = (e) => { if (!e.target.closest('[data-a]')) return; fx.tap(); this._paraDone(-1); };
      return;
    }
    const v = this.sel != null && this.acts.find((a) => a.k === 'v1' && a.from === this.sel);
    if (v) {
      const el = this.hud.controls(`<div class="setup-ctl"><div class="setup-tip">Elle file tout droit et détruit toute la colonne (sauf drapeau, plan… et derrière un barrage)</div><div class="setup-btns"><button class="sbtn ready" data-a="v1"><span>🚀</span>Lancer la bombe volante</button></div></div>`);
      el.onclick = (e) => { if (!e.target.closest('[data-a]')) return; fx.tap(); this._do({ k: 'v1', from: v.from }); };
      return;
    }
    this.hud.controls(null);
  }

  // ---------- Entrées ----------
  _cellAt(e) {
    const r = this.canvas.getBoundingClientRect();
    const x = Math.floor((e.clientX - r.left - this.ox) / this.cell), y = Math.floor((e.clientY - r.top - this.oy) / this.cell);
    if (x < 0 || y < 0 || x >= W || y >= this.G.H) return -1;
    return this.viewer === 1 ? (this.G.H - 1 - y) * W + (W - 1 - x) : y * W + x;
  }

  _tap(e) {
    if (!this.running || this.paused || this.over || !this.G) return;
    if (this.phase === 'pass') { fx.tap(); const f = this.passThen; this.passThen = null; f?.(); return; }
    if (this._busy()) return;
    const i = this._cellAt(e); if (i < 0) return;
    if (this.phase === 'setup' && this.manual) return this._manualTap(i);
    if (this.phase === 'setup') {
      const p = this.board[i]; if (!p || p.side !== this.setupSide) return;
      if (this.sel == null) { this.sel = i; fx.tick(); this.hud.toast(`${BY_ID[p.id].name}${HELP[p.id] ? ' : ' + HELP[p.id] : ''}`, 1100); }
      else { const a = this.board[this.sel]; this.board[this.sel] = p; this.board[i] = a; this.sel = null; fx.cushion(0.5); }
      return;
    }
    if (!this._myTurn()) return;
    if (this.paraFollow) {
      if (this.paraFollow.targets.includes(i)) this._paraDone(i);
      return;
    }
    const a = this.sel != null && this.acts.find((x) => x.from === this.sel && x.to === i && x.k !== 'v1');
    if (a) return this._do(this._pick(this.sel, i));
    const p = this.board[i];
    if (p && p.side === this.turn) {
      this.sel = i; fx.tick();
      const mine = this.acts.filter((x) => x.from === i);
      this.hud.toast(`${BY_ID[p.id].name}${HELP[p.id] ? ' : ' + HELP[p.id] : ''}${mine.length ? '' : ' (ne peut pas bouger)'}`, 1100);
    } else this.sel = null;
    this._ctl();
  }
  _manualTap(i) {
    if (this.drawerEl?.classList.contains('open')) { this.drawerEl.classList.remove('open'); return this._drawer(); }
    if (!this._ownCells().includes(i)) return;
    const p = this.board[i];
    if (this.pick) {
      if (p) { // on remplace : l'ancienne retourne dans la réserve
        this.stock[p.id]++;
      }
      this.board[i] = this._piece(this.setupSide, this.pick); this.stock[this.pick]--; fx.cushion(0.5);
      if (!this.stock[this.pick]) { this.pick = null; if (Object.values(this.stock).some((n) => n)) this.drawerEl?.classList.add('open'); }
    } else if (this.sel != null) {
      if (this.sel === i) { this.stock[p.id]++; this.board[i] = null; fx.tick(); this.hud.toast('Vignette remise dans la réserve', 900); }
      else { const a = this.board[this.sel]; this.board[this.sel] = p; this.board[i] = a; fx.cushion(0.5); }
      this.sel = null;
    } else if (p) { this.sel = i; fx.tick(); this.hud.toast(`${BY_ID[p.id].name} : touche une case pour la déplacer, ou encore elle pour la retirer`, 1500); }
    else { this.drawerEl?.classList.add('open'); }
    this._drawer(); this._setupCtl();
  }
  // un pas normal est préféré à un parachutage sur la même case
  _pick(from, to) {
    const all = this.acts.filter((x) => x.from === from && x.to === to);
    return all.find((x) => x.k === 'move') || all[0];
  }
  _targets() {
    if (this.paraFollow) return this.paraFollow.targets.map((t) => ({ to: t, k: 'move' }));
    if (this.sel == null) return [];
    return this.acts.filter((x) => x.from === this.sel && x.k !== 'v1');
  }

  // ---------- Jeu ----------
  _send(a) { if (this.online) this.opts.net.send({ t: 'act', a }); }

  _do(a, remote = false) {
    if (!remote && a.k !== 'drop') this._send(a);
    this.sel = null; this.hud.controls(null);
    const b = this.board, p = b[a.from];
    this.hist.push({ side: p.side, k: a.k, from: a.from, to: a.to });
    if (a.k === 'v1') return this._v1(a.from);
    if (a.k === 'raid') {
      p.revealed = true;
      const res = raid(b[a.to].id);
      this.combat = { a: p, d: b[a.to], res, t: 0, from: a.from, to: a.to, raid: true };
      fx.metal(0.9);
      return;
    }
    if (a.k === 'drop') {
      p.dropped = true; p.moved = true;
      b[a.from] = null;
      this.anim = { from: a.from, to: a.to, piece: p, t: 0, drop: true, then: () => {
        b[a.to] = p;
        if (p.id === 'parachutiste') {
          const targets = this._neighbourFoes(a.to);
          if (remote) { const att = a.att ?? -1; return att >= 0 && b[att] ? this._attack(a.to, att, a) : this._after(a); }
          if (targets.length) {
            if (this._myTurn()) { this.paraFollow = { a, targets }; return this._ctl(); }
            // IA
            const att = a.att ?? -1;
            this._send({ ...a, att });
            return att >= 0 ? this._attack(a.to, att, a) : this._after(a);
          }
        }
        if (!remote) this._send({ ...a, att: -1 });
        this._after(a);
      } };
      fx.whoosh?.(); fx.cushion(0.3);
      return;
    }
    // déplacement ou attaque
    if (!b[a.to]) {
      const [x0, y0] = xy(this.G, a.from), [x1, y1] = xy(this.G, a.to);
      p.moved = true;
      if (Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) > 1) p.revealed = true; // un long déplacement trahit la vignette
      b[a.from] = null;
      this.anim = { from: a.from, to: a.to, piece: p, t: 0, then: () => { b[a.to] = p; this._after(a); } };
      fx.cushion(0.4);
      return;
    }
    // un corps franc qui bondit sur un ennemi : il avance d'abord jusqu'à la case voisine
    this._attack(a.from, a.to, a);
  }
  _neighbourFoes(i) {
    const [x, y] = xy(this.G, i), out = [], side = this.board[i].side;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= this.G.H) continue;
      const t = this.board[ny * W + nx]; if (t && t.side !== side) out.push(ny * W + nx);
    }
    return out;
  }
  _paraDone(att) {
    const a = { ...this.paraFollow.a, att }; this.paraFollow = null; this.hud.controls(null);
    this._send(a);
    if (att >= 0) this._attack(a.to, att, a); else this._after(a);
  }
  _attack(from, to, a) {
    const p = this.board[from], d = this.board[to];
    p.moved = true;
    this.combat = { a: p, d, res: fight(p.id, d.id), t: 0, from, to };
    fx.metal(0.8);
  }

  _kill(i) { const p = this.board[i]; if (!p) return; this.board[i] = null; this.lost[p.side].push(p.id); if (p.id === 'citerne') this._noFuel(p.side); }
  _noFuel(side) { if (this.G.mode !== 'facile' && this.raids[side] > 1) { this.raids[side] = 1; this.hud.toast('⛽ Auto-citerne perdue : plus qu\'un bombardement possible !', 2200); } }

  _resolveCombat() {
    const { a, d, res, from, to, raid: air } = this.combat;
    a.revealed = true; d.revealed = true;
    this.combat = null;
    if (air) {
      if (res === 'win') { this._kill(to); fx.slam(); }
      else if (res === 'lose') { this._kill(from); fx.thud(0.8); }
      if (this.raids[a.side] !== Infinity) this.raids[a.side]--;
    } else {
      if (res === 'win') { this._kill(to); this.board[to] = a; this.board[from] = null; }
      else if (res === 'lose') this._kill(from);
      else { this._kill(from); this._kill(to); }
      if (res === 'both') fx.slam(); else fx.thud(0.8);
    }
    this._after({ from, to });
  }

  // bombe volante
  _v1(from) {
    const b = this.board, p = b[from], path = v1Path(this.G, b, from), hit = [];
    p.revealed = true;
    let stop = path.length;
    for (let k = 0; k < path.length; k++) {
      const t = b[path[k]]; if (!t || t.side === p.side) continue;
      if (t.id === 'barrage') { hit.push(path[k]); stop = k + 1; break; }
      if (t.id === 'drapeau' || t.id === 'plan') { t.revealed = true; continue; }
      hit.push(path[k]);
    }
    this.blast = { from, path: path.slice(0, stop), hit, t: 0, side: p.side };
    fx.whoosh?.(); fx.metal(0.6);
  }
  _resolveBlast() {
    const { from, hit } = this.blast; this.blast = null;
    this._kill(from); // la bombe est consommée
    for (const i of hit) this._kill(i);
    fx.slam();
    this.hud.toast(hit.length ? `💥 Bombe volante : ${hit.length} vignette${hit.length > 1 ? 's' : ''} détruite${hit.length > 1 ? 's' : ''}` : '💨 La bombe volante n\'a rien touché', 1800);
    this._after({ from, to: from });
  }

  _after(a) {
    this.last = { from: a.from, to: a.to ?? a.from };
    // victoire : objectifs pris, ou plus aucun combattant
    for (const s of [1 - this.turn, this.turn]) {
      const obj = objectives(this.G.mode);
      if (obj.every((o) => this.lost[s].includes(o))) return this._end(1 - s, `${this.names[1 - s]} a pris ${this.G.mode === 'facile' ? 'le drapeau, le plan secret et l\'auto-citerne' : 'le drapeau et le plan secret'} !`);
      if (!this.board.some((x) => x && x.side === s && isFighter(x.id))) return this._end(1 - s, `${this.names[s]} n'a plus aucun combattant.`);
    }
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
    this.hud.controls(null);
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
    const me = this.turn, foe = 1 - me, b = this.board, lvl = this.opts.level, G = this.G, dir = me === 0 ? -1 : 1;
    const pool = {};
    for (const id of army(G.mode)) pool[id] = (pool[id] || 0) + 1;
    for (const id of this.lost[foe]) pool[id]--;
    for (const p of b) if (p && p.side === foe && p.revealed) pool[p.id]--;
    const guess = (t) => {
      if (t.revealed) return [[t.id, 1]];
      let ids = Object.keys(pool).filter((id) => pool[id] > 0);
      if (t.dropped) ids = ids.filter((id) => ['parachutiste', 'bomberet', 'mine'].includes(id));
      else if (t.moved) ids = ids.filter((id) => !['mine', 'bomberet', 'bombardier'].includes(id));
      const tot = ids.reduce((s, id) => s + pool[id], 0) || 1;
      return ids.map((id) => [id, pool[id] / tot]);
    };
    const groundVal = (att, def) => { const r = fight(att, def); return r === 'win' ? VALUE[def] + 0.5 : r === 'lose' ? -VALUE[att] : VALUE[def] - VALUE[att]; };
    const raidVal = (att, def) => { const r = raid(def); return r === 'win' ? VALUE[def] : r === 'lose' ? -VALUE[att] : 0.3; };
    const exp = (t, f) => guess(t).reduce((acc, [id, pr]) => acc + pr * f(id), 0);
    const danger = (to, id) => {
      let s = 0; const [x, y] = xy(G, to);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= G.H) continue;
        const n = b[ny * W + nx];
        if (n && n.side === foe) s += n.revealed ? (isFighter(n.id) && fight(n.id, id) === 'win' ? -VALUE[id] * 0.9 : 0.4) : -VALUE[id] * 0.12;
      }
      return s;
    };
    let best = null;
    for (const m of this.acts) {
      const a = b[m.from]; let s = 0;
      if (m.k === 'raid') s = exp(b[m.to], (id) => raidVal(a.id, id)) * 1.1 - (this.raids[me] !== Infinity ? 2 : 0);
      else if (m.k === 'v1') {
        const path = v1Path(G, b, m.from); let v = -VALUE.v1;
        for (const i of path) { const t = b[i]; if (!t || t.side === me) continue; if (t.revealed && t.id === 'barrage') { v += 3; break; } v += t.revealed ? (['drapeau', 'plan'].includes(t.id) ? 0 : VALUE[t.id]) : 4; }
        s = v;
      } else if (m.k === 'drop') {
        if (a.id === 'parachutiste') {
          // se poser à côté d'une cible intéressante et l'attaquer aussitôt
          b[m.to] = a; b[m.from] = null;
          let bestAtt = -1, bestV = -1;
          for (const t of this._neighbourFoes(m.to)) { const v = exp(b[t], (id) => groundVal(a.id, id)); if (v > bestV) { bestV = v; bestAtt = t; } }
          b[m.from] = a; b[m.to] = null;
          m.att = bestAtt; s = bestAtt >= 0 ? bestV - 0.5 : -1.5;
        } else s = this._neighbourFoesOf(m.to, me).length * 0.6 - 0.8;
      } else {
        const t = b[m.to], [fx0, fy0] = xy(G, m.from), [tx, ty] = xy(G, m.to);
        if (t) s = exp(t, (id) => groundVal(a.id, id)) * (a.id === 'corpsfranc' ? 1.4 : 1) + (a.id === 'corpsfranc' ? 1 : 0);
        else {
          s = (ty - fy0) * dir * 0.25 * (VALUE[a.id] < 8 && isFighter(a.id) ? 1 : 0.2) + danger(m.to, a.id);
          if (['drapeau', 'plan'].includes(a.id)) s -= 1.5;
          if (a.id === 'general') s -= 0.3;
          if (isDark(tx, ty) && !isDark(fx0, fy0) && VALUE[a.id] >= 8) s -= 0.6; // garder les gros sur les blancs
        }
      }
      s += (Math.random() - 0.5) * AI_NOISE[lvl];
      if (!best || s > best.s) best = { m, s };
    }
    if (best) this._do(best.m);
  }
  _neighbourFoesOf(i, side) {
    const [x, y] = xy(this.G, i), out = [];
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= W || ny >= this.G.H) continue;
      const t = this.board[ny * W + nx]; if (t && t.side !== side) out.push(ny * W + nx);
    }
    return out;
  }

  // ---------- Boucle ----------
  _loop(now) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastT) / 1000); this.lastT = now;
    if (!this.paused) {
      this.t += dt;
      if (this.anim) { this.anim.t += dt / (this.anim.drop ? 0.6 : 0.22); if (this.anim.t >= 1) { const f = this.anim.then; this.anim = null; f(); } }
      if (this.combat) { this.combat.t += dt; if (this.combat.t > 1.7) this._resolveCombat(); }
      if (this.blast) { this.blast.t += dt; if (this.blast.t > 1.3) this._resolveBlast(); }
    }
    try { this._render(); } catch (e) { /* on redessine à la prochaine image */ }
    requestAnimationFrame(this._loop);
  }

  // ---------- Rendu ----------
  _boardCanvas() {
    const G = this.G, cs = this.cell, d = this.dpr, Wd = this.bw + 24, Hd = this.bh + 24;
    const c = document.createElement('canvas');
    c.width = Math.round(Wd * d); c.height = Math.round(Hd * d);
    const g = c.getContext('2d'); g.scale(d, d);
    const fr = g.createLinearGradient(0, 0, Wd, Hd); fr.addColorStop(0, '#4a3a22'); fr.addColorStop(1, '#2a2014');
    g.fillStyle = fr; g.beginPath(); g.roundRect(0, 0, Wd, Hd, 12); g.fill();
    g.save(); g.translate(12, 12);
    for (let y = 0; y < G.H; y++) for (let x = 0; x < W; x++) {
      // la vue est retournée pour le camp du haut : le damier est symétrique, la couleur ne change pas
      g.fillStyle = isDark(x, y) ? '#3f4a2b' : '#d8cfa8';
      g.fillRect(x * cs, y * cs, cs, cs);
    }
    // grain de papier
    let seed = 7; const r = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let k = 0; k < 160; k++) { g.fillStyle = r() < 0.5 ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.05)'; g.fillRect(r() * this.bw, r() * this.bh, 2 + r() * 6, 1 + r() * 3); }
    // ligne de front
    g.strokeStyle = 'rgba(160,30,20,0.55)'; g.lineWidth = 2; g.setLineDash([6, 4]);
    g.beginPath(); g.moveTo(0, (G.R + 1) * cs); g.lineTo(this.bw, (G.R + 1) * cs); g.stroke(); g.setLineDash([]);
    // croix interdites
    for (const y of [G.R, G.R + 1]) for (let x = 0; x < W; x++) {
      if (!isCross(G, x, y)) continue;
      g.fillStyle = '#7d1b14'; g.fillRect(x * cs + 1, y * cs + 1, cs - 2, cs - 2);
      g.strokeStyle = '#f3e6c8'; g.lineWidth = Math.max(2, cs * 0.12); g.lineCap = 'round';
      g.beginPath(); g.moveTo((x + 0.22) * cs, (y + 0.22) * cs); g.lineTo((x + 0.78) * cs, (y + 0.78) * cs);
      g.moveTo((x + 0.78) * cs, (y + 0.22) * cs); g.lineTo((x + 0.22) * cs, (y + 0.78) * cs); g.stroke();
    }
    g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1;
    for (let k = 0; k <= W; k++) { g.beginPath(); g.moveTo(k * cs, 0); g.lineTo(k * cs, this.bh); g.stroke(); }
    for (let k = 0; k <= G.H; k++) { g.beginPath(); g.moveTo(0, k * cs); g.lineTo(this.bw, k * cs); g.stroke(); }
    g.restore();
    return c;
  }

  // tuile de vignette (face visible ou cachée)
  _tile(g, p, x, y, s, faceUp, glow = false) {
    const A = ARMY[p.side];
    g.save(); g.translate(x, y);
    g.fillStyle = 'rgba(0,0,0,0.35)'; g.beginPath(); g.roundRect(-s / 2 + 1.5, -s / 2 + 2, s, s, s * 0.16); g.fill();
    const gr = g.createLinearGradient(0, -s / 2, 0, s / 2); gr.addColorStop(0, A.light); gr.addColorStop(0.5, A.main); gr.addColorStop(1, A.dark);
    g.fillStyle = gr; g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, s * 0.16); g.fill();
    if (glow) { g.strokeStyle = '#ffd34d'; g.lineWidth = 3; g.stroke(); }
    if (faceUp) {
      const px = Math.max(32, Math.round(s * 0.88 * this.dpr));
      g.save(); g.beginPath(); g.roundRect(-s * 0.44, -s * 0.44, s * 0.88, s * 0.88, s * 0.1); g.clip();
      g.drawImage(portrait(p.id, { ...A, side: p.side, style: this.opts.pieceStyle }, px), -s * 0.44, -s * 0.44, s * 0.88, s * 0.88);
      if (s > 44) { g.fillStyle = 'rgba(0,0,0,0.62)'; g.fillRect(-s * 0.44, s * 0.22, s * 0.88, s * 0.22); }
      g.restore();
      const P = BY_ID[p.id];
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (s > 44) { const t = s > 80 ? P.name : P.short; g.fillStyle = '#fff'; g.font = `800 ${Math.max(7, Math.min(s * 0.15, (s * 1.45) / t.length))}px system-ui`; g.fillText(t, 0, s * 0.33); }
      if (P.kind === 'fight') {
        const rr = Math.max(6, s * 0.2);
        g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(-s * 0.3, -s * 0.3, rr, 0, Math.PI * 2); g.fill();
        g.strokeStyle = A.dark; g.lineWidth = Math.max(1, s * 0.035); g.stroke();
        g.fillStyle = A.dark; g.font = `900 ${rr * 1.15}px system-ui`; g.fillText(String(P.r), -s * 0.3, -s * 0.29);
      }
      if (p.revealed && p.side === this.viewer && !this.over) { g.fillStyle = '#ffd34d'; g.strokeStyle = '#000'; g.lineWidth = 1; g.beginPath(); g.arc(s * 0.34, -s * 0.34, s * 0.1, 0, Math.PI * 2); g.fill(); g.stroke(); }
    } else {
      g.strokeStyle = 'rgba(255,255,255,0.25)'; g.lineWidth = s * 0.04; g.beginPath(); g.roundRect(-s * 0.34, -s * 0.34, s * 0.68, s * 0.68, s * 0.08); g.stroke();
      // éclair
      g.fillStyle = 'rgba(255,230,140,0.55)';
      g.beginPath(); g.moveTo(s * 0.06, -s * 0.26); g.lineTo(-s * 0.14, s * 0.04); g.lineTo(0, s * 0.04); g.lineTo(-s * 0.06, s * 0.26); g.lineTo(s * 0.14, -s * 0.04); g.lineTo(0, -s * 0.04); g.closePath(); g.fill();
      if (p.dropped) { g.font = `${s * 0.34}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🪂', s * 0.28, -s * 0.28); }
    }
    g.restore();
  }

  _V(i) { const [x, y] = xy(this.G, i); return this.viewer === 1 ? [W - 1 - x, this.G.H - 1 - y] : [x, y]; }
  _C(i) { const [x, y] = this._V(i); return [this.ox + (x + 0.5) * this.cell, this.oy + (y + 0.5) * this.cell]; }

  _render() {
    const g = this.ctx, d = this.dpr, cs = this.cell;
    g.setTransform(d, 0, 0, d, 0, 0);
    const bg = g.createRadialGradient(this.vw / 2, this.vh / 2, 40, this.vw / 2, this.vh / 2, this.vh * 0.8);
    bg.addColorStop(0, '#2d3a22'); bg.addColorStop(1, '#0b0f08');
    g.fillStyle = bg; g.fillRect(0, 0, this.vw, this.vh);
    if (!this.G || !cs) {
      g.fillStyle = '#fff'; g.font = '700 16px system-ui'; g.textAlign = 'center'; g.fillText('Connexion à la partie…', this.vw / 2, this.vh / 2);
      return;
    }
    if (!this.boardCv) this.boardCv = this._boardCanvas();
    g.drawImage(this.boardCv, this.ox - 12, this.oy - 12, this.bw + 24, this.bh + 24);
    if (this.phase === 'pass') return this._renderPass(g);
    const C = (i) => this._C(i), N = this.G.N, sz = cs * 0.8;
    if (this.phase === 'setup') {
      g.fillStyle = 'rgba(255,211,77,0.14)';
      g.fillRect(this.ox, this.oy + (this.G.H - this.G.R) * cs, this.bw, this.G.R * cs);
      if (this.manual && this.pick) for (const i of this._ownCells()) if (!this.board[i]) { const [x, y] = C(i); g.fillStyle = 'rgba(255,255,255,0.8)'; g.beginPath(); g.arc(x, y, cs * 0.12, 0, Math.PI * 2); g.fill(); }
    }
    if (this.last) for (const i of [this.last.from, this.last.to]) { const [x, y] = C(i); g.fillStyle = 'rgba(255,214,60,0.35)'; g.fillRect(x - cs / 2, y - cs / 2, cs, cs); }
    const focus = this.paraFollow ? this.paraFollow.a.to : this.sel;
    for (let i = 0; i < N; i++) {
      const p = this.board[i]; if (!p) continue;
      const [x, y] = C(i);
      const faceUp = this.over || p.side === this.viewer || p.revealed;
      this._tile(g, p, x, y, sz, this.phase === 'setup' && p.side !== this.setupSide ? false : faceUp, i === focus);
    }
    if (this.anim) {
      const a = this.anim, k = 1 - Math.pow(1 - Math.min(1, a.t), 3), [x0, y0] = C(a.from), [x1, y1] = C(a.to);
      const lift = a.drop ? Math.sin(k * Math.PI) * cs * 2.2 : Math.sin(k * Math.PI) * cs * 0.2;
      const px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k - lift;
      this._tile(g, a.piece, px, py, sz, a.piece.side === this.viewer || a.piece.revealed);
      if (a.drop) { g.font = `${cs * 0.9}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(a.piece.id === 'parachutiste' && a.piece.side === this.viewer ? '🪂' : '💨', px, py - cs * 0.8); }
    }
    for (const t of this._targets()) {
      const [x, y] = C(t.to);
      if (t.k === 'raid') {
        g.strokeStyle = 'rgba(255,90,40,0.95)'; g.lineWidth = 2;
        g.beginPath(); g.arc(x, y, cs * 0.36, 0, Math.PI * 2); g.moveTo(x - cs * 0.48, y); g.lineTo(x + cs * 0.48, y); g.moveTo(x, y - cs * 0.48); g.lineTo(x, y + cs * 0.48); g.stroke();
      } else if (this.board[t.to]) { g.strokeStyle = 'rgba(255,60,60,0.95)'; g.lineWidth = 3; g.beginPath(); g.roundRect(x - cs * 0.47, y - cs * 0.47, cs * 0.94, cs * 0.94, cs * 0.18); g.stroke(); }
      else { g.fillStyle = t.k === 'drop' ? 'rgba(120,200,255,0.7)' : 'rgba(255,255,255,0.75)'; g.beginPath(); g.arc(x, y, cs * (t.k === 'drop' ? 0.1 : 0.14), 0, Math.PI * 2); g.fill(); }
    }
    // couloir de la bombe volante sélectionnée
    if (this.sel != null && this.acts.some((a) => a.k === 'v1' && a.from === this.sel)) {
      g.fillStyle = 'rgba(255,120,40,0.22)';
      for (const i of v1Path(this.G, this.board, this.sel)) { const [x, y] = C(i); g.fillRect(x - cs / 2, y - cs / 2, cs, cs); }
    }
    if (this.blast) this._renderBlast(g);
    if (this.combat) this._renderCombat(g);
  }

  _renderBlast(g) {
    const bl = this.blast, cs = this.cell, k = Math.min(1, bl.t / 0.8);
    const pts = [bl.from, ...bl.path].map((i) => this._C(i));
    const n = (pts.length - 1) * k, j = Math.floor(n), f = n - j;
    const a = pts[j], b = pts[Math.min(j + 1, pts.length - 1)];
    const x = a[0] + (b[0] - a[0]) * f, y = a[1] + (b[1] - a[1]) * f;
    g.fillStyle = 'rgba(255,160,40,0.35)'; g.fillRect(Math.min(pts[0][0], x) - cs * 0.3, Math.min(pts[0][1], y), cs * 0.6, Math.abs(y - pts[0][1]));
    g.font = `${cs * 1.1}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.save(); g.translate(x, y); if (this._V(bl.from)[1] < this._V(bl.path[0])[1]) g.rotate(Math.PI); g.fillText('🚀', 0, 0); g.restore();
    for (const i of bl.hit) {
      const [hx, hy] = this._C(i);
      const reached = Math.abs(hy - pts[0][1]) <= Math.abs(y - pts[0][1]) + 1;
      if (reached) { g.font = `${cs * (0.9 + 0.3 * Math.sin(this.t * 20))}px system-ui`; g.fillText('💥', hx, hy); }
    }
  }

  _renderCombat(g) {
    const c = this.combat, k = Math.min(1, c.t / 0.35);
    g.fillStyle = `rgba(0,0,0,${0.62 * k})`; g.fillRect(0, 0, this.vw, this.vh);
    const s = Math.min(this.vw * 0.3, 130), cy = this.vh * 0.48;
    const off = (1 - k) * this.vw * 0.5;
    this._tile(g, c.a, this.vw / 2 - s * 0.8 - off, cy, s, true);
    this._tile(g, c.d, this.vw / 2 + s * 0.8 + off, cy, s, true);
    g.fillStyle = '#fff'; g.font = `900 ${s * 0.3}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText(c.raid ? '✈️' : 'VS', this.vw / 2, cy);
    g.font = `800 ${Math.min(15, this.vw * 0.04)}px system-ui`; g.fillStyle = 'rgba(255,255,255,0.8)';
    g.fillText(c.raid ? 'Bombardement !' : c.a.id === 'parachutiste' && c.a.dropped ? 'Attaque du parachutiste' : '« J\'attaque ! »', this.vw / 2, cy - s * 0.8);
    if (c.t > 0.7) {
      const A = BY_ID[c.a.id].name, D = BY_ID[c.d.id].name;
      let txt;
      if (c.raid) txt = c.res === 'win' ? `${D} détruit !` : c.res === 'lose' ? (c.d.id === 'dca' ? 'Abattu par la D.C.A. !' : 'Moteur bloqué par le barrage !') : `${D} : bombe sans effet`;
      else if (c.d.id === 'drapeau' || c.d.id === 'plan' || (c.d.id === 'citerne' && this.G.mode === 'facile')) txt = `${D} capturé !`;
      else if (c.res === 'both') txt = c.d.id === 'mine' ? 'Boum ! La mine saute' : 'Boum ! La bombe explose';
      else if (c.res === 'win') txt = (c.d.id === 'mine' || c.d.id === 'bomberet') ? `Le sapeur désamorce !` : c.d.id === 'general' ? 'L\'espion prend le Général !' : `${A} l'emporte`;
      else txt = c.d.id === 'general' ? 'Seul un espion prend le Général' : `${D} l'emporte`;
      g.font = `900 ${Math.min(24, this.vw * 0.058)}px system-ui`; g.fillStyle = '#ffd34d';
      g.fillText(txt, this.vw / 2, cy + s * 0.85);
      const fade = `rgba(0,0,0,${Math.min(0.7, (c.t - 0.7) * 1.5)})`; g.fillStyle = fade;
      const L = () => g.fillRect(this.vw / 2 - s * 1.3, cy - s / 2, s, s), Rr = () => g.fillRect(this.vw / 2 + s * 0.3, cy - s / 2, s, s);
      if (c.res === 'win') Rr(); else if (c.res === 'lose') L(); else if (c.res === 'both') { L(); Rr(); }
    }
  }

  _renderPass(g) {
    g.fillStyle = 'rgba(8,10,6,0.96)'; g.fillRect(0, 0, this.vw, this.vh);
    const A = ARMY[this.passTo];
    g.fillStyle = A.main; g.beginPath(); g.arc(this.vw / 2, this.vh * 0.4, 46, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff'; g.font = '900 40px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('📱', this.vw / 2, this.vh * 0.4);
    g.font = '800 20px system-ui'; g.fillText(`Passe le téléphone à ${this.names[this.passTo]}`, this.vw / 2, this.vh * 0.52);
    g.fillStyle = 'rgba(255,255,255,0.7)'; g.font = '600 15px system-ui';
    g.fillText(this.last ? "L'autre joueur ne doit pas regarder l'écran" : 'Chacun place ses vignettes en secret', this.vw / 2, this.vh * 0.57);
    const pulse = 0.6 + 0.4 * Math.sin(this.t * 4);
    g.globalAlpha = pulse; g.fillStyle = '#ffd34d'; g.font = '900 17px system-ui'; g.fillText('TOUCHE POUR CONTINUER', this.vw / 2, this.vh * 0.68); g.globalAlpha = 1;
  }
}
