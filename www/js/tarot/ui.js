// Écrans du compteur de tarot : saisie des joueurs, feuille de marque, saisie d'une manche, podium.
import { CONTRACTS, REQUIRED, POIGNEES, scoreRound, totals } from './tarot.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmt = (n) => (n > 0 ? '+' : '') + n;
const CONTRACT_ICON = { petite: 'P', garde: 'G', sans: 'GS', contre: 'GC' };

export function mountTarot({ root, modal, getGame, saveGame, defaultNames, fx, confetti }) {
  let view = getGame() ? (getGame().finished ? 'podium' : 'sheet') : 'setup';

  function render() {
    const game = getGame();
    if (view === 'setup' || !game) return renderSetup();
    if (view === 'podium') return renderPodium(game);
    renderSheet(game);
  }

  // ---------- Saisie des noms ----------
  function renderSetup() {
    const names = defaultNames();
    root.innerHTML = `
      <div class="tarot-card">
        <h3>Les 5 joueurs</h3>
        <p class="muted small">Saisis les prénoms dans l'ordre autour de la table.</p>
        ${[0, 1, 2, 3, 4].map((i) => `<label class="field tarot-name"><span>${i + 1}</span><input maxlength="14" data-i="${i}" value="${esc(names[i] || '')}" placeholder="Joueur ${i + 1}"></label>`).join('')}
        <button class="btn primary" data-a="start">Commencer la partie</button>
      </div>`;
    root.querySelector('[data-a="start"]').onclick = () => {
      const players = [...root.querySelectorAll('input[data-i]')].map((el, i) => el.value.trim() || `Joueur ${i + 1}`);
      fx.tap();
      saveGame({ players, rounds: [], finished: false, created: Date.now() });
      view = 'sheet'; render();
    };
  }

  // ---------- Feuille de marque ----------
  function renderSheet(game) {
    const t = totals(game);
    const order = t.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v);
    const rank = new Array(5); order.forEach((o, k) => (rank[o.i] = k));
    root.innerHTML = `
      <div class="tarot-totals">${game.players.map((p, i) => `<div class="tt ${rank[i] === 0 && game.rounds.length ? 'lead' : ''}"><span class="nm">${esc(p)}</span><b class="${t[i] < 0 ? 'neg' : ''}">${fmt(t[i])}</b></div>`).join('')}</div>
      <div class="tarot-table-wrap">
        <table class="tarot-table">
          <thead><tr><th>#</th><th>Contrat</th>${game.players.map((p) => `<th>${esc(p.slice(0, 6))}</th>`).join('')}</tr></thead>
          <tbody>${game.rounds.map((r, k) => {
            const s = scoreRound(r);
            return `<tr data-k="${k}"><td>${k + 1}</td><td><span class="ct ${s.made ? 'ok' : 'ko'}">${CONTRACT_ICON[r.contract]}</span> ${esc(game.players[r.taker].slice(0, 6))}</td>${s.scores.map((v, i) => `<td class="${v < 0 ? 'neg' : 'pos'} ${i === r.taker ? 'tk' : i === r.partner ? 'pt' : ''}">${fmt(v)}</td>`).join('')}</tr>`;
          }).join('') || `<tr><td colspan="7" class="muted empty">Aucune manche pour l'instant. Appuie sur « Nouvelle manche ».</td></tr>`}</tbody>
        </table>
      </div>
      <p class="muted small center">Touche une manche pour la modifier ou la supprimer.</p>
      <div class="tarot-actions">
        <button class="btn primary" data-a="new">+ Nouvelle manche</button>
        <button class="btn gold" data-a="end" ${game.rounds.length ? '' : 'disabled'}>🏆 Terminé</button>
        <button class="btn ghost" data-a="reset">Nouvelle partie</button>
      </div>`;
    root.querySelector('[data-a="new"]').onclick = () => { fx.tap(); openRound(game); };
    root.querySelector('[data-a="end"]').onclick = () => { if (!game.rounds.length) return; fx.tap(); game.finished = true; saveGame(game); view = 'podium'; render(); };
    root.querySelector('[data-a="reset"]').onclick = () => { fx.tap(); if (confirm('Effacer la partie en cours et recommencer ?')) { saveGame(null); view = 'setup'; render(); } };
    root.querySelectorAll('tr[data-k]').forEach((tr) => (tr.onclick = () => { fx.tap(); openRound(game, +tr.dataset.k); }));
  }

  // ---------- Saisie d'une manche ----------
  function openRound(game, editIdx = null) {
    const P = game.players;
    const r = editIdx != null ? { ...game.rounds[editIdx] } : { taker: null, partner: undefined, contract: 'garde', bouts: 1, points: 51, petit: 'none', poignee: 'none', chelem: 'none' };
    const card = modal.querySelector('.card');
    const seg = (key, items, cls = '') => `<div class="seg wrap ${cls}" data-k="${key}">${items.map(([v, l]) => `<button data-v="${v}" class="${String(r[key]) === String(v) ? 'sel' : ''}">${l}</button>`).join('')}</div>`;
    const draw = () => {
      const ready = r.taker != null && r.partner !== undefined;
      const res = ready ? scoreRound(r) : null;
      card.innerHTML = `
        <h2>${editIdx != null ? `Manche ${editIdx + 1}` : 'Nouvelle manche'}</h2>
        <div class="tr-form">
          <h4>Qui a pris ?</h4>${seg('taker', P.map((p, i) => [i, esc(p)]), 'players')}
          <h4>Avec qui ? <small>(roi appelé)</small></h4>${seg('partner', [...P.map((p, i) => [i, esc(p)]), ['null', 'Seul']], 'players')}
          <h4>Contrat</h4>${seg('contract', CONTRACTS.map((c) => [c.id, `${c.name} <small>×${c.mult}</small>`]))}
          <h4>Bouts de l'attaque <small>(petit, 21, excuse)</small></h4>${seg('bouts', [0, 1, 2, 3].map((b) => [b, `${b} <small>· ${REQUIRED[b]} pts</small>`]))}
          <h4>Points faits par l'attaque</h4>
          <div class="pts-row"><button class="pm" data-d="-5">−5</button><button class="pm" data-d="-1">−1</button>
            <input type="number" min="0" max="91" step="1" value="${r.points}" id="trPts"><button class="pm" data-d="1">+1</button><button class="pm" data-d="5">+5</button></div>
          <input type="range" min="0" max="91" step="1" value="${r.points}" id="trRange">
          <h4>Petit au bout</h4>${seg('petit', [['none', 'Non'], ['att', 'Attaque'], ['def', 'Défense']])}
          <h4>Poignée</h4>${seg('poignee', Object.keys(POIGNEES).map((k) => [k, k === 'none' ? 'Aucune' : `${k[0].toUpperCase() + k.slice(1)} <small>${POIGNEES[k]}</small>`]))}
          <h4>Chelem</h4>${seg('chelem', [['none', 'Non'], ['annonceReussi', 'Annoncé réussi'], ['nonAnnonceReussi', 'Non annoncé réussi'], ['annonceChute', 'Annoncé chuté']])}
        </div>
        <div class="tr-preview ${res ? (res.made ? 'ok' : 'ko') : ''}">
          ${res ? `<b>${res.made ? `Contrat réussi de ${res.diff}` : `Chuté de ${-res.diff}`}</b> <span class="muted">(${res.need} points requis)</span>
            <div class="pv">${P.map((p, i) => `<span><i>${esc(p)}</i><b class="${res.scores[i] < 0 ? 'neg' : 'pos'}">${fmt(res.scores[i])}</b></span>`).join('')}</div>` : '<span class="muted">Choisis le preneur et son partenaire.</span>'}
        </div>
        <div class="tr-actions">
          ${editIdx != null ? '<button class="btn danger" data-a="del">Supprimer</button>' : ''}
          <button class="btn ghost" data-a="cancel">Annuler</button>
          <button class="btn primary" data-a="ok" ${res ? '' : 'disabled'}>${editIdx != null ? 'Enregistrer' : 'Valider la manche'}</button>
        </div>`;
      card.querySelectorAll('.seg[data-k] button').forEach((b) => (b.onclick = () => {
        const k = b.parentElement.dataset.k; let v = b.dataset.v;
        v = v === 'null' ? null : /^\d+$/.test(v) ? +v : v;
        r[k] = v; fx.tick(); keepScroll(draw);
      }));
      const setPts = (v) => { r.points = Math.max(0, Math.min(91, Math.round(+v || 0))); keepScroll(draw); };
      card.querySelectorAll('.pm').forEach((b) => (b.onclick = () => { fx.tick(); setPts(r.points + +b.dataset.d); }));
      card.querySelector('#trPts').onchange = (e) => setPts(e.target.value);
      card.querySelector('#trRange').oninput = (e) => { r.points = +e.target.value; card.querySelector('#trPts').value = r.points; };
      card.querySelector('#trRange').onchange = (e) => setPts(e.target.value);
      card.querySelector('[data-a="cancel"]').onclick = () => { fx.tap(); modal.classList.remove('show'); };
      const del = card.querySelector('[data-a="del"]');
      if (del) del.onclick = () => { fx.tap(); game.rounds.splice(editIdx, 1); saveGame(game); modal.classList.remove('show'); render(); };
      card.querySelector('[data-a="ok"]').onclick = () => {
        if (!res) return;
        fx.tap();
        if (editIdx != null) game.rounds[editIdx] = r; else game.rounds.push(r);
        saveGame(game); modal.classList.remove('show'); render();
        if (res.made) fx.star(2); else fx.lose();
      };
    };
    const keepScroll = (fn) => { const y = card.scrollTop; fn(); card.scrollTop = y; };
    draw();
    modal.classList.add('show');
    card.scrollTop = 0;
  }

  // ---------- Podium ----------
  function renderPodium(game) {
    const t = totals(game);
    const ranked = t.map((v, i) => ({ v, name: game.players[i] })).sort((a, b) => b.v - a.v);
    const step = (k, cls) => ranked[k] ? `<div class="pd ${cls}" style="animation-delay:${[0.9, 0.5, 0.1][k] ?? 0}s">
        <div class="pd-name">${['🥇', '🥈', '🥉'][k]} ${esc(ranked[k].name)}</div><div class="pd-score">${fmt(ranked[k].v)}</div>
        <div class="pd-block"><span>${k + 1}</span></div></div>` : '';
    root.innerHTML = `
      <div class="podium-wrap">
        <h2 class="pd-title">🏆 Podium</h2>
        <p class="muted center">${game.rounds.length} manche${game.rounds.length > 1 ? 's' : ''} jouée${game.rounds.length > 1 ? 's' : ''}</p>
        <div class="podium">${step(1, 'second')}${step(0, 'first')}${step(2, 'third')}</div>
        <div class="pd-rest">${ranked.slice(3).map((r, k) => `<div><span>${k + 4}e</span><b>${esc(r.name)}</b><i class="${r.v < 0 ? 'neg' : ''}">${fmt(r.v)}</i></div>`).join('')}</div>
        <div class="tarot-actions">
          <button class="btn ghost" data-a="back">Revoir la feuille de marque</button>
          <button class="btn primary" data-a="new">Nouvelle partie</button>
        </div>
      </div>`;
    root.querySelector('[data-a="back"]').onclick = () => { fx.tap(); game.finished = false; saveGame(game); view = 'sheet'; render(); };
    root.querySelector('[data-a="new"]').onclick = () => { fx.tap(); saveGame(null); view = 'setup'; render(); };
    setTimeout(() => { fx.win(); confetti?.(); }, 1100);
  }

  render();
  return { render, setView: (v) => { view = v; render(); } };
}
