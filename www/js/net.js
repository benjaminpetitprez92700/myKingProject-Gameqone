// Jeu en ligne : connexion directe entre deux téléphones (WebRTC via PeerJS).
// Le serveur public PeerJS sert seulement à se trouver grâce au code de partie ; ensuite les coups
// passent directement d'un téléphone à l'autre.

const ALPHA = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const PREFIX = 'kinggamearena-';
let loading = null;

function loadPeer() {
  if (window.Peer) return Promise.resolve();
  if (!loading) loading = new Promise((res, rej) => {
    const s = document.createElement('script'); s.src = 'vendor/peerjs.min.js';
    s.onload = res; s.onerror = () => { loading = null; rej(new Error('lib')); };
    document.head.appendChild(s);
  });
  return loading;
}
const peerOpts = () => ({ debug: 0, ...(window.KGA_PEER || {}) });
const newCode = () => Array.from({ length: 4 }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join('');

// Connexion : send(obj), on(type, fn), onClose(fn), close()
class Link {
  constructor(peer, conn) {
    this.peer = peer; this.conn = conn; this.handlers = {}; this.closeFns = []; this.closed = false;
    conn.on('data', (msg) => { if (msg && msg.t) (this.handlers[msg.t] || []).forEach((f) => f(msg)); });
    const bye = () => { if (this.closed) return; this.closed = true; this.closeFns.forEach((f) => f()); };
    conn.on('close', bye); conn.on('error', bye);
    this.handlers.bye = [bye];
    peer.on('disconnected', () => { try { peer.reconnect(); } catch (e) { /* rien */ } });
    this._ping = setInterval(() => this.send({ t: 'ping' }), 4000);
    this._last = Date.now();
    this.on('ping', () => (this._last = Date.now()));
    this._watch = setInterval(() => { if (Date.now() - this._last > 15000) bye(); }, 3000);
  }
  send(obj) { try { if (this.conn.open) this.conn.send(obj); } catch (e) { /* rien */ } }
  on(t, fn) { (this.handlers[t] ||= []).push(fn); return () => (this.handlers[t] = this.handlers[t].filter((f) => f !== fn)); }
  off(t) { delete this.handlers[t]; }
  onClose(fn) { this.closeFns.push(fn); }
  close() {
    clearInterval(this._ping); clearInterval(this._watch);
    if (!this.closed) { this.send({ t: 'bye' }); this.closed = true; }
    setTimeout(() => { try { this.conn.close(); this.peer.destroy(); } catch (e) { /* rien */ } }, 150);
  }
}

const ERR = {
  'peer-unavailable': 'Aucune partie avec ce code. Vérifie le code.',
  network: 'Pas de connexion internet.',
  'server-error': 'Serveur de mise en relation injoignable.',
  'browser-incompatible': 'Ce téléphone ne permet pas le jeu en ligne.',
  lib: 'Impossible de charger le module en ligne.',
};
const errMsg = (e) => ERR[e?.type] || ERR[e?.message] || 'Connexion impossible. Réessaie.';

// Crée une partie : renvoie { code, cancel } ; onReady(link, guestName) quand l'ami arrive
export async function hostGame({ game, name, onCode, onReady, onError }) {
  try { await loadPeer(); } catch (e) { return onError(errMsg(e)); }
  let peer, cancelled = false, tries = 0;
  const open = () => {
    const code = newCode();
    peer = new window.Peer(PREFIX + code.toLowerCase(), peerOpts());
    peer.on('open', () => onCode(code));
    peer.on('error', (e) => {
      if (cancelled) return;
      if (e.type === 'unavailable-id' && tries++ < 5) { peer.destroy(); return open(); }
      onError(errMsg(e));
    });
    peer.on('connection', (conn) => {
      conn.on('open', () => {
        const link = new Link(peer, conn);
        const off = link.on('hello', (m) => {
          off();
          if (m.game !== game) { link.send({ t: 'refuse', why: 'game' }); return setTimeout(() => conn.close(), 300); }
          link.send({ t: 'welcome', name, game });
          onReady(link, m.name);
        });
      });
    });
  };
  open();
  return { cancel: () => { cancelled = true; try { peer?.destroy(); } catch (e) { /* rien */ } } };
}

// Rejoint une partie avec son code
export async function joinGame({ code, game, name, onReady, onError }) {
  try { await loadPeer(); } catch (e) { return onError(errMsg(e)); }
  const peer = new window.Peer(peerOpts());
  let done = false;
  const fail = (m) => { if (done) return; done = true; try { peer.destroy(); } catch (e) { /* rien */ } onError(m); };
  const timer = setTimeout(() => fail('Pas de réponse. Vérifie le code et que ton ami attend.'), 20000);
  peer.on('error', (e) => { clearTimeout(timer); fail(errMsg(e)); });
  peer.on('open', () => {
    const conn = peer.connect(PREFIX + code.trim().toLowerCase(), { reliable: true });
    conn.on('open', () => {
      const link = new Link(peer, conn);
      link.on('refuse', () => { clearTimeout(timer); fail("Ton ami a lancé un autre jeu."); });
      const off = link.on('welcome', (m) => { off(); clearTimeout(timer); done = true; onReady(link, m.name); });
      link.send({ t: 'hello', name, game });
    });
  });
  return { cancel: () => { clearTimeout(timer); done = true; try { peer.destroy(); } catch (e) { /* rien */ } } };
}
