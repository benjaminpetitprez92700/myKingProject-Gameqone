// Archipel du Roi : jeu de colons original sur une île en hexagones.
// Un dé à 6 faces : 2 à 6 font produire les îles portant ce numéro ; 1 = éruption du volcan
// (le nuage de cendres bloque une île et on vole une ressource). Huttes, forts, phares et chemins.
// Le premier à 10 couronnes gagne.
import { fx } from '../fx.js';

export const RES = ['bois', 'pierre', 'ble', 'poisson'];
export const ICON = { bois: '🌲', pierre: '🪨', ble: '🌾', poisson: '🐟' };
const NAME = { bois: 'Bois', pierre: 'Pierre', ble: 'Blé', poisson: 'Poisson' };
const TILE_COL = { bois: ['#3f8f3a', '#2a6a28'], pierre: ['#9b9488', '#6d675e'], ble: ['#e8c552', '#c49a26'], poisson: ['#3fb6c9', '#1f8396'], volcan: ['#6b3a2a', '#3a1d14'] };
export const COST = {
  chemin: { bois: 1, pierre: 1 },
  hutte: { bois: 1, ble: 1, poisson: 1 },
  fort: { pierre: 2, ble: 2 },
  phare: { poisson: 2, pierre: 1, bois: 1 },
};
const LABEL = { chemin: 'Chemin', hutte: 'Hutte', fort: 'Fort', phare: 'Phare' };
const BICON = { chemin: '🛤️', hutte: '🛖', fort: '🏰', phare: '🗼' };
export const GOAL = 10;
const S3 = Math.sqrt(3);

// ---------- Plateau ----------
export function makeBoard() {
  const coords = [];
  for (let q = -2; q <= 2; q++) for (let r = -2; r <= 2; r++) if (Math.abs(q + r) <= 2) coords.push([q, r]);
  const bag = [...Array(5).fill('bois'), ...Array(4).fill('pierre'), ...Array(5).fill('ble'), ...Array(4).fill('poisson')].sort(() => Math.random() - 0.5);
  const nums = [2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4, 4, 5, 5, 5, 6, 6, 6].sort(() => Math.random() - 0.5);
  const tiles = coords.map(([q, r]) => {
    const center = q === 0 && r === 0;
    return { q, r, x: S3 * (q + r / 2), y: 1.5 * r, res: center ? 'volcan' : bag.pop(), num: center ? 0 : nums.pop() };
  });
  const verts = [], vkey = new Map(), edges = [], ekey = new Map();
  const vid = (x, y) => {
    const k = `${Math.round(x * 100)},${Math.round(y * 100)}`;
    if (!vkey.has(k)) { vkey.set(k, verts.length); verts.push({ x, y, tiles: [], adj: [], edges: [], owner: null, kind: null, phare: false, port: null }); }
    return vkey.get(k);
  };
  tiles.forEach((t, ti) => {
    const ids = [];
    for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); ids.push(vid(t.x + Math.cos(a), t.y + Math.sin(a))); }
    t.verts = ids;
    ids.forEach((v) => verts[v].tiles.push(ti));
    for (let i = 0; i < 6; i++) {
      const a = ids[i], b = ids[(i + 1) % 6], k = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!ekey.has(k)) { ekey.set(k, edges.length); edges.push({ a, b, owner: null, tiles: [] }); verts[a].adj.push(b); verts[b].adj.push(a); verts[a].edges.push(edges.length - 1); verts[b].edges.push(edges.length - 1); }
      edges[ekey.get(k)].tiles.push(ti);
    }
  });
  // ports sur la côte : 4 ports spécialisés (2 pour 1) répartis autour de l'île
  const coast = edges.map((e, i) => ({ e, i, ang: Math.atan2((verts[e.a].y + verts[e.b].y) / 2, (verts[e.a].x + verts[e.b].x) / 2) })).filter((o) => o.e.tiles.length === 1).sort((a, b) => a.ang - b.ang);
  const portRes = [...RES].sort(() => Math.random() - 0.5);
  const ports = [];
  for (let k = 0; k < 4; k++) {
    const o = coast[Math.floor((k + 0.5) * coast.length / 4)];
    verts[o.e.a].port = verts[o.e.b].port = portRes[k];
    ports.push({ edge: o.i, res: portRes[k] });
  }
  return { tiles, verts, edges, ports, cloud: tiles.findIndex((t) => t.res === 'volcan') };
}

const canPay = (inv, cost) => Object.entries(cost).every(([k, n]) => inv[k] >= n);
const pay = (inv, cost) => { for (const [k, n] of Object.entries(cost)) inv[k] -= n; };

export class Island {
  constructor(canvas, hud) {
    this.canvas = canvas; this.hud = hud;
    this.running = false; this.paused = false;
    this._loop = this._loop.bind(this);
    this._onTap = (e) => this._tap(e);
    canvas.addEventListener('pointerdown', this._onTap);
  }
  setPaused(p) { this.paused = p; }
  stop() { this.running = false; clearTimeout(this.aiT); this.canvas.removeEventListener('pointerdown', this._onTap); this.hud.controls(null); }
  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    this.dpr = dpr; this.vw = this.canvas.clientWidth; this.vh = this.canvas.clientHeight;
    if (this.vw < 50) { requestAnimationFrame(() => this.running && this.resize()); return; }
    this.canvas.width = Math.round(this.vw * dpr); this.canvas.height = Math.round(this.vh * dpr);
    // le plateau tient entre la barre de score (haut) et les commandes (bas)
    const top = 128, bottom = 210;
    const availH = Math.max(200, this.vh - top - bottom), availW = this.vw - 16;
    this.R = Math.min(availW / (5 * S3 + 0.6), availH / 8.6);
    this.cx = this.vw / 2; this.cy = top + availH / 2;
  }

  start(opts) {
    this.opts = opts; this.names = opts.names; this.ai = opts.mode === 'ai';
    this.colors = [opts.colors?.[0] || '#3a86ff', '#ff006e'];
    if (this.colors[0].toLowerCase() === '#ff006e') this.colors[1] = '#ffbe0b';
    this.B = makeBoard();
    this.inv = [0, 1].map(() => ({ bois: 0, pierre: 0, ble: 0, poisson: 0 }));
    this.pts = [0, 0];
    this.floaters = []; this.dice = null;
    // pose de départ : J1, J2, J2, J1 (une hutte + un chemin à chaque fois)
    this.setupOrder = [0, 1, 1, 0]; this.setupStep = 0;
    this.turn = 0; this.mode = 'setupHut';
    this.running = true; this.paused = false;
    this.resize();
    requestAnimationFrame(this._loop);
    this.hud.toast('Place ta première hutte sur un coin d\'île', 2200);
    this._next();
  }

  _isHuman(p) { return !this.ai || p === 0; }

  // ---------- Règles ----------
  _freeSpot(v) { const V = this.B.verts; return V[v].owner == null && V[v].adj.every((a) => V[a].owner == null); }
  _touchesRoad(v, p) { return this.B.verts[v].edges.some((e) => this.B.edges[e].owner === p); }
  legalHuts(p, setup = false) {
    return this.B.verts.map((_, i) => i).filter((v) => this._freeSpot(v) && (setup || this._touchesRoad(v, p)));
  }
  legalRoads(p, fromVert = null) {
    const { edges, verts } = this.B;
    return edges.map((_, i) => i).filter((i) => {
      const e = edges[i]; if (e.owner != null) return false;
      if (fromVert != null) return e.a === fromVert || e.b === fromVert;
      return [e.a, e.b].some((v) => verts[v].owner === p || (verts[v].owner == null && verts[v].edges.some((k) => k !== i && edges[k].owner === p)));
    });
  }
  legalForts(p) { return this.B.verts.map((v, i) => (v.owner === p && v.kind === 'hutte' ? i : -1)).filter((i) => i >= 0); }
  legalPhares(p) { return this.B.verts.map((v, i) => (v.owner === p && !v.phare && v.tiles.length < 3 ? i : -1)).filter((i) => i >= 0); }
  _targets(kind, p) {
    return kind === 'chemin' ? this.legalRoads(p) : kind === 'hutte' ? this.legalHuts(p) : kind === 'fort' ? this.legalForts(p) : this.legalPhares(p);
  }
  rate(p, r) { return this.B.verts.some((v) => v.owner === p && v.port === r) ? 2 : 4; }

  _build(p, kind, idx) {
    const { verts, edges } = this.B;
    if (kind === 'chemin') edges[idx].owner = p;
    else if (kind === 'hutte') { verts[idx].owner = p; verts[idx].kind = 'hutte'; this.pts[p] += 1; }
    else if (kind === 'fort') { verts[idx].kind = 'fort'; this.pts[p] += 1; }
    else if (kind === 'phare') { verts[idx].phare = true; this.pts[p] += 1; }
    const at = kind === 'chemin' ? this._mid(edges[idx]) : verts[idx];
    this._float(at.x, at.y, kind === 'chemin' ? BICON.chemin : `+1 👑`, this.colors[p]);
    fx.thud?.(0.5);
    if (this.pts[p] >= GOAL) { this.winner = p; this.mode = 'end'; setTimeout(() => this._end(), 900); }
  }
  _mid(e) { const V = this.B.verts; return { x: (V[e.a].x + V[e.b].x) / 2, y: (V[e.a].y + V[e.b].y) / 2 }; }

  _produce(n) {
    const { tiles, verts } = this.B;
    tiles.forEach((t, ti) => {
      if (t.num !== n || ti === this.B.cloud) return;
      for (const v of t.verts) {
        const V = verts[v]; if (V.owner == null) continue;
        const k = V.kind === 'fort' ? 2 : 1;
        this.inv[V.owner][t.res] += k;
        this._float(t.x, t.y - 0.2, `+${k} ${ICON[t.res]}`, this.colors[V.owner]);
      }
    });
    // phares : un poisson offert au joueur dont c'est le tour
    const ph = verts.filter((v) => v.owner === this.turn && v.phare).length;
    if (ph) { this.inv[this.turn].poisson += ph; this._float(0, -3.4, `🗼 +${ph} 🐟`, this.colors[this.turn]); }
  }

  _roll() {
    if (this.mode !== 'roll') return;
    this.mode = 'rolling';
    const n = 1 + Math.floor(Math.random() * 6);
    this.dice = { n, t: performance.now(), shown: 1 };
    fx.clack?.(0.5);
    this._render();
    setTimeout(() => {
      if (!this.running) return;
      this.dice.final = true; this.dice.shown = n;
      if (n === 1) {
        this.hud.toast('🌋 Éruption ! Le nuage de cendres se déplace', 1800);
        fx.slam?.();
        this.mode = 'cloud';
        if (!this._isHuman(this.turn)) this._aiCloud();
        else this._render();
      } else {
        this._produce(n);
        this.mode = 'main';
        this._render();
        if (!this._isHuman(this.turn)) this.aiT = setTimeout(() => this._aiMain(), 800);
      }
    }, 650);
  }

  _placeCloud(ti, p) {
    this.B.cloud = ti;
    // vole une ressource au hasard à un adversaire installé sur cette île
    const foe = 1 - p, t = this.B.tiles[ti];
    if (t.verts.some((v) => this.B.verts[v].owner === foe)) {
      const pool = RES.flatMap((r) => Array(this.inv[foe][r]).fill(r));
      if (pool.length) {
        const r = pool[Math.floor(Math.random() * pool.length)];
        this.inv[foe][r]--; this.inv[p][r]++;
        this.hud.toast(`${this.names[p]} vole 1 ${ICON[r]} à ${this.names[foe]}`, 1800);
      }
    }
    this.mode = 'main';
    this._render();
    if (!this._isHuman(this.turn)) this.aiT = setTimeout(() => this._aiMain(), 800);
  }

  _endTurn() {
    if (this.mode === 'end') return;
    this.turn = 1 - this.turn; this.mode = 'roll'; this.dice = null; this.pending = null;
    this._next();
  }

  _next() {
    if (!this.running || this.mode === 'end') return;
    if (this.mode.startsWith('setup')) this.turn = this.setupOrder[this.setupStep];
    this._render();
    if (!this._isHuman(this.turn)) this.aiT = setTimeout(() => this._aiStep(), 700);
  }

  _setupPlace(kind, idx) {
    const p = this.turn;
    if (kind === 'hutte') {
      this._build(p, 'hutte', idx); this.lastHut = idx;
      // seconde hutte : ressources de départ
      if (this.setupStep >= 2) for (const ti of this.B.verts[idx].tiles) { const r = this.B.tiles[ti].res; if (r !== 'volcan') this.inv[p][r]++; }
      this.mode = 'setupRoad';
    } else {
      this._build(p, 'chemin', idx);
      this.setupStep++;
      if (this.setupStep >= 4) { this.mode = 'roll'; this.turn = 0; this.hud.toast('C\'est parti ! Lance le dé', 1600); }
      else this.mode = 'setupHut';
    }
    this._next();
  }

  _trade(p, give, get) {
    const r = this.rate(p, give);
    if (this.inv[p][give] < r || give === get) return false;
    this.inv[p][give] -= r; this.inv[p][get] += 1;
    fx.tap();
    return true;
  }

  _end() {
    const w = this.winner;
    w === 0 || !this.ai ? fx.win() : fx.lose();
    this.hud.end({ won: this.ai ? w === 0 : true, winner: w,
      title: this.ai ? (w === 0 ? 'Victoire !' : 'Défaite…') : `${this.names[w]} gagne !`,
      text: `${this.names[w]} atteint ${GOAL} couronnes. Score : ${this.names[0]} ${this.pts[0]} · ${this.names[1]} ${this.pts[1]}.` });
  }

  // ---------- IA ----------
  _vertValue(v, p) {
    const V = this.B.verts[v]; let s = 0; const kinds = new Set();
    for (const ti of V.tiles) { const t = this.B.tiles[ti]; if (t.res === 'volcan' || ti === this.B.cloud) continue; s += (t.num >= 2 ? 1 : 0) * (t.res === 'poisson' || t.res === 'ble' ? 1.05 : 1); kinds.add(t.res); }
    s += kinds.size * 0.6;
    const missing = RES.filter((r) => !this.B.verts.some((x) => x.owner === p && x.tiles.some((ti) => this.B.tiles[ti].res === r)));
    for (const ti of V.tiles) if (missing.includes(this.B.tiles[ti].res)) s += 0.5;
    if (V.port) s += 0.4;
    return s + (this.opts.level === 'facile' ? Math.random() * 2.5 : this.opts.level === 'moyen' ? Math.random() * 0.6 : 0);
  }
  _aiStep() {
    if (!this.running) return;
    if (this.paused) { this.aiT = setTimeout(() => this._aiStep(), 400); return; }
    const p = this.turn;
    if (this.mode === 'setupHut') {
      const best = this.legalHuts(p, true).sort((a, b) => this._vertValue(b, p) - this._vertValue(a, p))[0];
      return this._setupPlace('hutte', best);
    }
    if (this.mode === 'setupRoad') {
      const roads = this.legalRoads(p, this.lastHut);
      const score = (i) => { const e = this.B.edges[i], o = e.a === this.lastHut ? e.b : e.a; return Math.max(0, ...this.B.verts[o].adj.filter((a) => this._freeSpot(a)).map((a) => this._vertValue(a, p))); };
      return this._setupPlace('chemin', roads.sort((a, b) => score(b) - score(a))[0]);
    }
    if (this.mode === 'roll') return this._roll();
  }
  _aiCloud() {
    const p = this.turn, foe = 1 - p;
    let best = this.B.cloud, bs = -1e9;
    this.B.tiles.forEach((t, ti) => {
      if (ti === this.B.cloud || t.res === 'volcan') return;
      let s = 0; for (const v of t.verts) { const V = this.B.verts[v]; if (V.owner === foe) s += V.kind === 'fort' ? 2 : 1; if (V.owner === p) s -= 1.5; }
      s += Math.random() * 0.3;
      if (s > bs) { bs = s; best = ti; }
    });
    this.aiT = setTimeout(() => this._placeCloud(best, p), 700);
  }
  _aiMain() {
    if (!this.running || this.mode !== 'main') return;
    if (this.paused) { this.aiT = setTimeout(() => this._aiMain(), 400); return; }
    const p = this.turn, inv = this.inv[p];
    // priorités : fort > hutte > phare > chemin (si aucune place pour une hutte)
    const plan = [];
    if (this.legalForts(p).length) plan.push('fort');
    const huts = this.legalHuts(p);
    if (huts.length) plan.push('hutte');
    if (this.legalPhares(p).length && this.opts.level !== 'facile') plan.push('phare');
    if (!huts.length || this.B.edges.filter((e) => e.owner === p).length < 2 * this.B.verts.filter((v) => v.owner === p).length) plan.push('chemin');
    for (const kind of plan) {
      if (!canPay(inv, COST[kind])) this._aiTradeFor(p, COST[kind]);
      if (canPay(inv, COST[kind])) {
        const tg = this._aiTarget(kind, p);
        if (tg != null) { pay(inv, COST[kind]); this._build(p, kind, tg); this._render(); if (this.mode === 'end') return; this.aiT = setTimeout(() => this._aiMain(), 700); return; }
      }
    }
    this.aiT = setTimeout(() => this._endTurn(), 500);
  }
  _aiTradeFor(p, cost) {
    const inv = this.inv[p];
    for (const [need, n] of Object.entries(cost)) {
      while (inv[need] < n) {
        const give = RES.filter((r) => r !== need && inv[r] - (cost[r] || 0) >= this.rate(p, r)).sort((a, b) => inv[b] - inv[a])[0];
        if (!give || !this._trade(p, give, need)) return;
        this._float(0, 3.6, `🔁 ${ICON[give]}→${ICON[need]}`, this.colors[p]);
      }
    }
  }
  _aiTarget(kind, p) {
    const list = this._targets(kind, p);
    if (!list.length) return null;
    if (kind === 'hutte' || kind === 'fort' || kind === 'phare') return list.sort((a, b) => this._vertValue(b, p) - this._vertValue(a, p))[0];
    // chemin : vers le meilleur coin libre
    const score = (i) => { const e = this.B.edges[i]; return Math.max(...[e.a, e.b].map((v) => (this._freeSpot(v) ? this._vertValue(v, p) : 0) + Math.max(0, ...this.B.verts[v].adj.filter((a) => this._freeSpot(a)).map((a) => this._vertValue(a, p) * 0.6)))); };
    return list.sort((a, b) => score(b) - score(a))[0];
  }

  // ---------- Interaction ----------
  _toUnit(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: (e.clientX - r.left - this.cx) / this.R, y: (e.clientY - r.top - this.cy) / this.R };
  }
  _tap(e) {
    if (!this.running || this.paused || !this._isHuman(this.turn)) return;
    const u = this._toUnit(e), { verts, edges, tiles } = this.B;
    const near = (list, pos, max) => { let b = null, bd = max; for (const i of list) { const q = pos(i), d = Math.hypot(q.x - u.x, q.y - u.y); if (d < bd) { bd = d; b = i; } } return b; };
    const p = this.turn;
    if (this.mode === 'setupHut') { const v = near(this.legalHuts(p, true), (i) => verts[i], 0.45); if (v != null) { fx.tap(); this._setupPlace('hutte', v); } return; }
    if (this.mode === 'setupRoad') { const ed = near(this.legalRoads(p, this.lastHut), (i) => this._mid(edges[i]), 0.5); if (ed != null) { fx.tap(); this._setupPlace('chemin', ed); } return; }
    if (this.mode === 'cloud') { const t = near(tiles.map((_, i) => i).filter((i) => i !== this.B.cloud && tiles[i].res !== 'volcan'), (i) => tiles[i], 0.9); if (t != null) { fx.tap(); this._placeCloud(t, p); } return; }
    if (this.mode === 'place') {
      const k = this.pending, list = this._targets(k, p);
      const idx = k === 'chemin' ? near(list, (i) => this._mid(edges[i]), 0.5) : near(list, (i) => verts[i], 0.45);
      if (idx != null) { pay(this.inv[p], COST[k]); this.mode = 'main'; this.pending = null; this._build(p, k, idx); this._render(); }
    }
  }

  _controls() {
    const p = this.turn, inv = this.inv[p], human = this._isHuman(p);
    const resRow = `<div class="il-res">${RES.map((r) => `<span><i>${ICON[r]}</i><b>${inv[r]}</b></span>`).join('')}</div>`;
    if (!human || this.mode === 'end' || this.mode === 'rolling') return this.hud.controls(human ? resRow : `<div class="il-wait">${this.names[p]} réfléchit…</div>`);
    let html = '';
    if (this.mode.startsWith('setup')) html = `<div class="il-tip">${this.mode === 'setupHut' ? 'Touche un coin brillant pour poser ta hutte 🛖' : 'Touche un bord brillant pour poser ton chemin 🛤️'}</div>`;
    else if (this.mode === 'roll') html = `${resRow}<div class="ra-bar"><button class="rbtn green" data-b="roll">🎲<span>Lancer le dé</span></button></div>`;
    else if (this.mode === 'cloud') html = `<div class="il-tip">🌋 Touche une île pour y poser le nuage de cendres</div>`;
    else if (this.mode === 'place') html = `<div class="il-tip">Touche un emplacement brillant pour ton ${LABEL[this.pending].toLowerCase()} ${BICON[this.pending]}</div><div class="ra-bar"><button class="rbtn" data-b="cancel">✖<span>Annuler</span></button></div>`;
    else if (this.mode === 'trade') {
      html = `<div class="il-tip">${this.give ? `Contre 1 ${ICON[this.give]} de ${this.rate(p, this.give)}, tu veux :` : 'Échanger quelle ressource ? (4 pour 1, 2 pour 1 avec un port)'}</div>
        <div class="ra-bar">${RES.map((r) => this.give
          ? `<button class="rbtn blue" data-get="${r}" ${r === this.give ? 'disabled' : ''}>${ICON[r]}<span>${NAME[r]}</span></button>`
          : `<button class="rbtn" data-give="${r}" ${inv[r] >= this.rate(p, r) ? '' : 'disabled'}>${ICON[r]}<span>${this.rate(p, r)}→1</span></button>`).join('')}
        <button class="rbtn" data-b="cancel">✖<span>Retour</span></button></div>`;
    } else {
      const b = (k) => `<button class="rbtn ${canPay(inv, COST[k]) && this._targets(k, p).length ? 'blue' : ''}" data-k="${k}" ${canPay(inv, COST[k]) && this._targets(k, p).length ? '' : 'disabled'}>${BICON[k]}<span>${LABEL[k]}</span><small>${Object.entries(COST[k]).map(([r, n]) => ICON[r].repeat(n)).join('')}</small></button>`;
      html = `${resRow}<div class="ra-bar">${['chemin', 'hutte', 'fort', 'phare'].map(b).join('')}</div>
        <div class="ra-bar"><button class="rbtn" data-b="trade">🔁<span>Échanger</span></button><button class="rbtn orange" data-b="end">⏭<span>Fin du tour</span></button></div>`;
    }
    const el = this.hud.controls(`<div class="il-ctl">${html}</div>`);
    el.onclick = (e) => {
      if (this.paused) return;
      const t = e.target.closest('button'); if (!t || t.disabled) return;
      fx.tap();
      if (t.dataset.b === 'roll') return this._roll();
      if (t.dataset.b === 'end') return this._endTurn();
      if (t.dataset.b === 'trade') { this.mode = 'trade'; this.give = null; return this._render(); }
      if (t.dataset.b === 'cancel') { this.mode = 'main'; this.pending = null; this.give = null; return this._render(); }
      if (t.dataset.k) { this.pending = t.dataset.k; this.mode = 'place'; return this._render(); }
      if (t.dataset.give) { this.give = t.dataset.give; return this._render(); }
      if (t.dataset.get) { this._trade(p, this.give, t.dataset.get); this.give = null; this.mode = 'main'; return this._render(); }
    };
  }

  _render() {
    if (!this.running) return;
    this._controls();
    this.hud.setScore([0, 1].map((k) => `<div class="sp ${this.turn === k ? 'on' : ''}"><b><i class="army-dot" style="background:${this.colors[k]}"></i>${this.names[k]}</b><div class="balls"><span class="pts">${this.pts[k]}</span><span class="muted">/ ${GOAL} 👑</span></div></div>`).join(''));
    this.hud.setChip(this.mode.startsWith('setup') ? 'Installation' : `Tour de ${this.names[this.turn]}`);
  }

  _float(x, y, txt, col) { this.floaters.push({ x, y, txt, col, t: performance.now() }); }

  // ---------- Dessin ----------
  _loop(now) {
    if (!this.running) return;
    requestAnimationFrame(this._loop);
    const g = this.canvas.getContext('2d'), d = this.dpr, R = this.R;
    if (!R) return;
    g.setTransform(d, 0, 0, d, 0, 0);
    // mer
    const sea = g.createLinearGradient(0, 0, 0, this.vh);
    sea.addColorStop(0, '#0b3a66'); sea.addColorStop(1, '#06233f');
    g.fillStyle = sea; g.fillRect(0, 0, this.vw, this.vh);
    g.strokeStyle = 'rgba(255,255,255,0.06)'; g.lineWidth = 2;
    for (let k = 0; k < 14; k++) { const y = (k * 67 + now * 0.01) % this.vh; g.beginPath(); for (let x = 0; x <= this.vw; x += 20) g.lineTo(x, y + Math.sin(x * 0.03 + now * 0.002 + k) * 4); g.stroke(); }
    g.save(); g.translate(this.cx, this.cy);
    const { tiles, verts, edges, ports } = this.B;
    // plage autour de l'île
    g.fillStyle = '#e9d39a'; g.strokeStyle = '#d1b46c'; g.lineWidth = R * 0.08;
    g.beginPath();
    for (const t of tiles) { for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); const x = (t.x + Math.cos(a) * 1.18) * R, y = (t.y + Math.sin(a) * 1.18) * R; i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); }
    g.fill();
    // ports
    for (const pt of ports) {
      const e = edges[pt.edge], m = this._mid(e), len = Math.hypot(m.x, m.y), ox = m.x / len, oy = m.y / len;
      const px = (m.x + ox * 0.75) * R, py = (m.y + oy * 0.75) * R;
      g.strokeStyle = '#8a5a2b'; g.lineWidth = R * 0.08;
      for (const v of [e.a, e.b]) { g.beginPath(); g.moveTo(verts[v].x * R, verts[v].y * R); g.lineTo(px, py); g.stroke(); }
      g.fillStyle = '#fff8e1'; g.beginPath(); g.arc(px, py, R * 0.33, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#8a5a2b'; g.lineWidth = 2; g.stroke();
      g.font = `${R * 0.26}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(ICON[pt.res], px, py - R * 0.06);
      g.fillStyle = '#3a2600'; g.font = `900 ${R * 0.15}px system-ui`; g.fillText('2:1', px, py + R * 0.18);
    }
    // tuiles
    tiles.forEach((t, ti) => {
      const [c1, c2] = TILE_COL[t.res];
      const gr = g.createRadialGradient(t.x * R - R * 0.3, t.y * R - R * 0.4, R * 0.1, t.x * R, t.y * R, R);
      gr.addColorStop(0, c1); gr.addColorStop(1, c2);
      g.fillStyle = gr; g.strokeStyle = 'rgba(0,0,0,0.35)'; g.lineWidth = 1.5;
      g.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); g.lineTo((t.x + Math.cos(a) * 0.97) * R, (t.y + Math.sin(a) * 0.97) * R); } g.closePath(); g.fill(); g.stroke();
      g.textAlign = 'center'; g.textBaseline = 'middle';
      if (t.res === 'volcan') {
        g.fillStyle = '#2a140c'; g.beginPath(); g.moveTo(t.x * R - R * 0.5, t.y * R + R * 0.35); g.lineTo(t.x * R - R * 0.15, t.y * R - R * 0.35); g.lineTo(t.x * R + R * 0.15, t.y * R - R * 0.35); g.lineTo(t.x * R + R * 0.5, t.y * R + R * 0.35); g.fill();
        g.fillStyle = '#ff6a00'; g.beginPath(); g.ellipse(t.x * R, t.y * R - R * 0.35, R * 0.15, R * 0.06, 0, 0, Math.PI * 2); g.fill();
      } else {
        g.font = `${R * 0.5}px system-ui`; g.globalAlpha = 0.9; g.fillText(ICON[t.res], t.x * R, t.y * R - R * 0.3); g.globalAlpha = 1;
        g.fillStyle = '#fff8e1'; g.beginPath(); g.arc(t.x * R, t.y * R + R * 0.32, R * 0.27, 0, Math.PI * 2); g.fill();
        g.strokeStyle = '#3a2600'; g.lineWidth = 1.5; g.stroke();
        const hot = this.dice?.final && this.dice.shown === t.num;
        g.fillStyle = hot ? '#d62828' : '#3a2600'; g.font = `900 ${R * 0.3}px system-ui`; g.fillText(t.num, t.x * R, t.y * R + R * 0.34);
        if (hot) { g.strokeStyle = 'rgba(255,211,77,0.9)'; g.lineWidth = 3; g.beginPath(); for (let i = 0; i < 6; i++) { const a = (Math.PI / 180) * (60 * i - 30); g.lineTo((t.x + Math.cos(a) * 0.92) * R, (t.y + Math.sin(a) * 0.92) * R); } g.closePath(); g.stroke(); }
      }
      if (ti === this.B.cloud) {
        g.fillStyle = 'rgba(60,60,66,0.82)';
        for (const [dx, dy, rr] of [[-0.3, -0.05, 0.32], [0.05, -0.2, 0.38], [0.35, 0, 0.3], [0, 0.15, 0.34]]) { g.beginPath(); g.arc((t.x + dx + Math.sin(now * 0.001 + dx * 5) * 0.03) * R, (t.y + dy) * R, rr * R, 0, Math.PI * 2); g.fill(); }
      }
    });
    // chemins
    g.lineCap = 'round';
    edges.forEach((e) => {
      if (e.owner == null) return;
      const a = verts[e.a], b = verts[e.b], s = 0.18;
      const ax = a.x + (b.x - a.x) * s, ay = a.y + (b.y - a.y) * s, bx = b.x + (a.x - b.x) * s, by = b.y + (a.y - b.y) * s;
      g.strokeStyle = '#111'; g.lineWidth = R * 0.2; g.beginPath(); g.moveTo(ax * R, ay * R); g.lineTo(bx * R, by * R); g.stroke();
      g.strokeStyle = this.colors[e.owner]; g.lineWidth = R * 0.13; g.stroke();
    });
    // bâtiments
    verts.forEach((v) => {
      if (v.owner == null) return;
      const x = v.x * R, y = v.y * R, s = R * 0.24, col = this.colors[v.owner];
      g.fillStyle = col; g.strokeStyle = '#111'; g.lineWidth = 2;
      if (v.kind === 'fort') {
        g.beginPath(); g.rect(x - s * 1.1, y - s * 0.9, s * 2.2, s * 1.8); g.fill(); g.stroke();
        for (let k = 0; k < 3; k++) { g.beginPath(); g.rect(x - s * 1.1 + k * s * 0.8, y - s * 1.35, s * 0.6, s * 0.5); g.fill(); g.stroke(); }
        g.fillStyle = '#111'; g.fillRect(x - s * 0.25, y + s * 0.1, s * 0.5, s * 0.8);
      } else {
        g.beginPath(); g.moveTo(x - s, y + s * 0.8); g.lineTo(x - s, y - s * 0.1); g.lineTo(x, y - s); g.lineTo(x + s, y - s * 0.1); g.lineTo(x + s, y + s * 0.8); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#111'; g.fillRect(x - s * 0.22, y + s * 0.2, s * 0.44, s * 0.6);
      }
      if (v.phare) {
        const lx = x + s * 1.3, ly = y - s * 0.6;
        g.fillStyle = '#fff'; g.beginPath(); g.moveTo(lx - s * 0.35, ly + s); g.lineTo(lx - s * 0.2, ly - s * 0.6); g.lineTo(lx + s * 0.2, ly - s * 0.6); g.lineTo(lx + s * 0.35, ly + s); g.closePath(); g.fill(); g.stroke();
        g.fillStyle = '#d62828'; g.fillRect(lx - s * 0.28, ly, s * 0.56, s * 0.25);
        g.fillStyle = `rgba(255,230,120,${0.6 + 0.4 * Math.sin(now * 0.006)})`; g.beginPath(); g.arc(lx, ly - s * 0.75, s * 0.25, 0, Math.PI * 2); g.fill();
      }
    });
    // emplacements possibles (humain)
    if (this._isHuman(this.turn)) {
      const pulse = 0.5 + 0.5 * Math.sin(now * 0.008);
      const p = this.turn;
      let spots = [], roads = [], tl = [];
      if (this.mode === 'setupHut') spots = this.legalHuts(p, true);
      else if (this.mode === 'setupRoad') roads = this.legalRoads(p, this.lastHut);
      else if (this.mode === 'place') (this.pending === 'chemin' ? (roads = this._targets('chemin', p)) : (spots = this._targets(this.pending, p)));
      else if (this.mode === 'cloud') tl = tiles.map((_, i) => i).filter((i) => i !== this.B.cloud && tiles[i].res !== 'volcan');
      g.fillStyle = `rgba(255,255,255,${0.45 + 0.4 * pulse})`; g.strokeStyle = '#ffd34d'; g.lineWidth = 2.5;
      for (const v of spots) { g.beginPath(); g.arc(verts[v].x * R, verts[v].y * R, R * (0.14 + 0.05 * pulse), 0, Math.PI * 2); g.fill(); g.stroke(); }
      g.strokeStyle = `rgba(255,211,77,${0.5 + 0.5 * pulse})`; g.lineWidth = R * 0.12; g.setLineDash([R * 0.12, R * 0.1]);
      for (const i of roads) { const e = edges[i], a = verts[e.a], b = verts[e.b]; g.beginPath(); g.moveTo((a.x + (b.x - a.x) * 0.2) * R, (a.y + (b.y - a.y) * 0.2) * R); g.lineTo((b.x + (a.x - b.x) * 0.2) * R, (b.y + (a.y - b.y) * 0.2) * R); g.stroke(); }
      g.setLineDash([]);
      g.strokeStyle = `rgba(255,80,40,${0.4 + 0.5 * pulse})`; g.lineWidth = 3;
      for (const i of tl) { const t = tiles[i]; g.beginPath(); g.arc(t.x * R, t.y * R, R * 0.75, 0, Math.PI * 2); g.stroke(); }
    }
    // textes flottants
    this.floaters = this.floaters.filter((f) => now - f.t < 1600);
    for (const f of this.floaters) {
      const k = (now - f.t) / 1600;
      g.globalAlpha = 1 - k; g.font = `900 ${R * 0.32}px system-ui`; g.textAlign = 'center';
      g.lineWidth = 4; g.strokeStyle = '#111'; g.strokeText(f.txt, f.x * R, (f.y - k * 0.8) * R);
      g.fillStyle = '#fff'; g.fillText(f.txt, f.x * R, (f.y - k * 0.8) * R);
      g.globalAlpha = 1;
    }
    g.restore();
    // dé
    if (this.dice) {
      const n = this.dice.final ? this.dice.shown : 1 + Math.floor((now / 70) % 6);
      const s = 46, x = this.vw - s - 14, y = 134;
      g.save(); g.translate(x + s / 2, y + s / 2); if (!this.dice.final) g.rotate(Math.sin(now * 0.03) * 0.5);
      g.fillStyle = n === 1 ? '#ff6a00' : '#fff'; g.strokeStyle = '#111'; g.lineWidth = 2;
      g.beginPath(); g.roundRect(-s / 2, -s / 2, s, s, 9); g.fill(); g.stroke();
      if (n === 1) { g.font = '26px system-ui'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('🌋', 0, 2); }
      else {
        const P = { 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] }[n];
        g.fillStyle = '#111'; for (const [a, b] of P) { g.beginPath(); g.arc(a * s * 0.26, b * s * 0.26, 4.5, 0, Math.PI * 2); g.fill(); }
      }
      g.restore();
    }
  }
}
