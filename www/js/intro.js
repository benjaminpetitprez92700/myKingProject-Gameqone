// Intro animée « The King Game Arena » : les 5 objets des jeux arrivent en spirale, se percutent, et le logo explose à l'écran.
import { fx, unlockAudio, audioRunning } from './fx.js';
import { startIntroMusic, stopIntroMusic, musicPlaying } from './music.js';

const LINES = ['THE KING', 'GAME ARENA'];
const COLORS = ['#ffd34d', '#ff006e', '#3a86ff', '#06d6a0', '#ff9f1c', '#8338ec'];

export function playIntro(canvas, onDone, gameCount = 12) {
  const g = canvas.getContext('2d');
  let vw, vh, dpr, t = 0, last = performance.now(), running = true, exitT = -1, boomed = false;
  const parts = [], bokeh = [], streaks = [];
  const resize = () => {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    vw = canvas.clientWidth || innerWidth; vh = canvas.clientHeight || innerHeight;
    canvas.width = vw * dpr; canvas.height = vh * dpr;
  };
  resize(); addEventListener('resize', resize);
  for (let i = 0; i < 40; i++) bokeh.push({ x: Math.random(), y: Math.random(), r: 2 + Math.random() * 6, s: 0.02 + Math.random() * 0.05, c: COLORS[i % COLORS.length], p: Math.random() * 6 });
  for (let i = 0; i < 90; i++) streaks.push({ a: Math.random() * Math.PI * 2, d: Math.random(), v: 0.6 + Math.random() * 1.4, w: 1 + Math.random() * 2 });

  const T_HIT = 1.45, T_LOGO = 1.55, T_IDLE = 3.3;

  // la musique démarre tout de suite si le navigateur l'autorise, sinon au premier toucher
  unlockAudio();
  if (audioRunning()) startIntroMusic(T_HIT);
  function tap() {
    unlockAudio();
    if (!musicPlaying()) startIntroMusic(0);
    if (exitT >= 0) return;
    if (t < T_IDLE - 0.2) { if (!boomed) { boomed = true; burst(); } t = Math.max(t, T_IDLE - 0.2); return; }
    exitT = 0; fx.whoosh(0.45); stopIntroMusic(1.6);
  }
  canvas.addEventListener('pointerdown', tap);

  function burst() {
    fx.boom();
    for (let i = 0; i < 140; i++) {
      const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 700;
      parts.push({ x: 0, y: 0, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.6 + Math.random() * 1.1, max: 1.7, c: COLORS[i % COLORS.length], s: 1.5 + Math.random() * 3.5 });
    }
  }

  // ---- objets dessinés ----
  function golf(x, y, r, rot) {
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grd.addColorStop(0, '#ffffff'); grd.addColorStop(1, '#bfc6cf');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(0,0,0,0.12)';
    for (let i = 0; i < 14; i++) { const a = i * 2.4 + rot, d = (i % 4) * r * 0.22 + r * 0.15; g.beginPath(); g.arc(x + Math.cos(a) * d, y + Math.sin(a) * d, r * 0.08, 0, Math.PI * 2); g.fill(); }
  }
  function eight(x, y, r, rot) {
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
    grd.addColorStop(0, '#555'); grd.addColorStop(1, '#050505');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    const ox = Math.cos(rot) * r * 0.3, oy = Math.sin(rot) * r * 0.2;
    g.fillStyle = '#fff'; g.beginPath(); g.arc(x + ox, y + oy, r * 0.42, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#111'; g.font = `900 ${r * 0.62}px system-ui`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('8', x + ox, y + oy + r * 0.03);
  }
  function pog(x, y, r, rot) {
    const sy = Math.abs(Math.cos(rot * 1.7)) * 0.9 + 0.1;
    g.save(); g.translate(x, y); g.scale(1, sy);
    g.fillStyle = '#ff006e'; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#ffbe0b'; g.lineWidth = r * 0.16;
    g.beginPath(); for (let a = 0; a < 12; a += 0.15) { const rr = a * r * 0.065; g.lineTo(Math.cos(a + rot) * rr, Math.sin(a + rot) * rr); } g.stroke();
    g.strokeStyle = '#fff'; g.lineWidth = r * 0.08; g.beginPath(); g.arc(0, 0, r * 0.95, 0, Math.PI * 2); g.stroke();
    g.restore();
  }
  function boule(x, y, r, rot) {
    const grd = g.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.05, x, y, r);
    grd.addColorStop(0, '#fff'); grd.addColorStop(0.35, '#c9d0d8'); grd.addColorStop(1, '#3e454e');
    g.fillStyle = grd; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(30,40,50,0.45)'; g.lineWidth = r * 0.07;
    g.beginPath(); g.ellipse(x, y, r, Math.abs(Math.cos(rot)) * r * 0.5 + 1, 0, 0, Math.PI * 2); g.stroke();
  }
  function snake(x, y, r, rot) {
    const cols = ['#ffbe0b', '#3a86ff', '#ff006e'];
    for (let i = 3; i >= 1; i--) {
      const a = rot * 0.5 + Math.PI + Math.sin(rot + i) * 0.4;
      const px = x + Math.cos(a) * r * 1.3 * i, py = y + Math.sin(a) * r * 1.3 * i;
      const gr = g.createRadialGradient(px - r * 0.2, py - r * 0.2, 1, px, py, r * 0.7);
      gr.addColorStop(0, '#fff'); gr.addColorStop(0.3, cols[i - 1]); gr.addColorStop(1, cols[i - 1]);
      g.fillStyle = gr; g.beginPath(); g.arc(px, py, r * (0.75 - i * 0.06), 0, Math.PI * 2); g.fill();
    }
    const gr = g.createRadialGradient(x - r * 0.3, y - r * 0.3, 1, x, y, r);
    gr.addColorStop(0, '#b8ffd2'); gr.addColorStop(0.4, '#2ec27e'); gr.addColorStop(1, '#14653f');
    g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill();
    const d = rot * 0.5;
    for (const sgn of [-1, 1]) {
      const ex = x + Math.cos(d) * r * 0.3 - Math.sin(d) * r * 0.42 * sgn, ey = y + Math.sin(d) * r * 0.3 + Math.cos(d) * r * 0.42 * sgn;
      g.fillStyle = '#fff'; g.beginPath(); g.arc(ex, ey, r * 0.25, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#111'; g.beginPath(); g.arc(ex + Math.cos(d) * r * 0.08, ey + Math.sin(d) * r * 0.08, r * 0.12, 0, Math.PI * 2); g.fill();
    }
  }
  function crown(x, y, w, alpha) {
    if (alpha <= 0) return;
    g.save(); g.globalAlpha = alpha; g.translate(x, y);
    const h = w * 0.62;
    g.shadowColor = 'rgba(255,190,40,0.9)'; g.shadowBlur = 22;
    const gr = g.createLinearGradient(0, -h / 2, 0, h / 2);
    gr.addColorStop(0, '#fff3b0'); gr.addColorStop(0.5, '#ffc928'); gr.addColorStop(1, '#d98a00');
    g.fillStyle = gr; g.strokeStyle = '#5a2d00'; g.lineWidth = w * 0.05; g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-w / 2, h / 2); g.lineTo(-w / 2, -h * 0.2); g.lineTo(-w * 0.25, h * 0.08); g.lineTo(0, -h / 2);
    g.lineTo(w * 0.25, h * 0.08); g.lineTo(w / 2, -h * 0.2); g.lineTo(w / 2, h / 2); g.closePath();
    g.stroke(); g.fill(); g.shadowBlur = 0;
    for (const [px, py, c] of [[-w / 2, -h * 0.2, '#ff006e'], [0, -h / 2, '#3a86ff'], [w / 2, -h * 0.2, '#06d6a0']]) {
      g.fillStyle = c; g.beginPath(); g.arc(px, py, w * 0.07, 0, Math.PI * 2); g.fill();
    }
    g.fillStyle = 'rgba(90,45,0,0.35)'; g.fillRect(-w / 2, h * 0.28, w, h * 0.12);
    g.restore();
  }
  const OBJS = [golf, pog, eight, boule, snake];

  function frame(now) {
    if (!running) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    if (exitT >= 0) exitT += dt;
    if (!boomed && t >= T_HIT) { boomed = true; burst(); }
    const cx = vw / 2, cy = vh * 0.42, S = Math.min(vw, vh);
    let shake = 0;
    if (t > T_HIT && t < T_HIT + 0.45) shake = (1 - (t - T_HIT) / 0.45) * 16;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);

    // fond
    const pulse = 0.5 + 0.5 * Math.sin(t * 2);
    const bg = g.createRadialGradient(cx, cy, 10, cx, cy, Math.max(vw, vh) * 0.9);
    bg.addColorStop(0, `rgb(${60 + pulse * 20},${20},${110 + pulse * 30})`); bg.addColorStop(0.5, '#140a2e'); bg.addColorStop(1, '#030208');
    g.fillStyle = bg; g.fillRect(-30, -30, vw + 60, vh + 60);

    // traits de vitesse
    const sp = t < T_HIT ? 1 : Math.max(0.15, 1 - (t - T_HIT) * 0.8);
    for (const s of streaks) {
      s.d += dt * s.v * sp * 0.9; if (s.d > 1) s.d -= 1;
      const r0 = s.d * s.d * S * 0.9, r1 = r0 + 30 + s.d * 120 * sp;
      g.strokeStyle = `rgba(255,255,255,${0.05 + s.d * 0.35 * sp})`; g.lineWidth = s.w;
      g.beginPath(); g.moveTo(cx + Math.cos(s.a) * r0, cy + Math.sin(s.a) * r0); g.lineTo(cx + Math.cos(s.a) * r1, cy + Math.sin(s.a) * r1); g.stroke();
    }
    // bokeh
    for (const b of bokeh) {
      const y = ((b.y - t * b.s) % 1 + 1) % 1;
      g.globalAlpha = Math.min(1, t * 0.5) * (0.25 + 0.2 * Math.sin(t * 2 + b.p));
      g.fillStyle = b.c; g.beginPath(); g.arc(b.x * vw, y * vh, b.r, 0, Math.PI * 2); g.fill();
    }
    g.globalAlpha = 1;

    // les 5 objets en spirale avec traînées
    if (t < T_HIT + 0.05) {
      for (let i = 0; i < OBJS.length; i++) {
        const start = 0.15 + i * 0.06;
        for (let tr = 6; tr >= 0; tr--) {
          const tt = t - tr * 0.025;
          const k = Math.max(0, Math.min(1, (tt - start) / (T_HIT - start)));
          if (k <= 0) continue;
          const e = k * k * k;
          const ang = -Math.PI / 2 + (i * Math.PI * 2) / OBJS.length + (1 - e) * 2.2;
          const dist = (1 - e) * S * 0.85;
          const x = cx + Math.cos(ang) * dist, y = cy + Math.sin(ang) * dist;
          const r = S * 0.07 * (0.6 + 0.4 * e);
          if (tr) { g.globalAlpha = 0.1 * (7 - tr) / 7; g.fillStyle = COLORS[i]; g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); g.globalAlpha = 1; }
          else {
            g.shadowColor = COLORS[i]; g.shadowBlur = 25;
            OBJS[i](x, y, r, tt * 7);
            g.shadowBlur = 0;
          }
        }
      }
    }

    // éclair + ondes de choc
    if (t > T_HIT) {
      const k = t - T_HIT;
      for (let i = 0; i < 3; i++) {
        const kk = k - i * 0.12; if (kk < 0 || kk > 1) continue;
        g.strokeStyle = `rgba(255,${200 - i * 60},${120 + i * 60},${1 - kk})`; g.lineWidth = 8 * (1 - kk) + 1;
        g.beginPath(); g.arc(cx, cy, kk * S * (0.9 + i * 0.3), 0, Math.PI * 2); g.stroke();
      }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]; p.x += p.vx * dt; p.y += p.vy * dt; p.vx *= 0.96; p.vy *= 0.96; p.life -= dt;
        if (p.life <= 0) { parts.splice(i, 1); continue; }
        g.globalAlpha = Math.min(1, p.life); g.fillStyle = p.c;
        g.beginPath(); g.arc(cx + p.x, cy + p.y, p.s, 0, Math.PI * 2); g.fill();
      }
      g.globalAlpha = 1;
    }

    // logo : couronne + « THE KING » + « GAME ARENA »
    if (t > T_LOGO) {
      g.font = '900 100px system-ui, -apple-system, sans-serif';
      const big = Math.min(96, (vw * 0.88 * 100) / g.measureText(LINES[1]).width);
      const sizes = [big * 0.6, big];
      const ys = [cy - big * 0.5, cy + big * 0.38];
      const ex = exitT >= 0 ? Math.min(1, exitT / 0.55) : 0;
      let idx = 0, totalW = 0;
      for (let l = 0; l < 2; l++) {
        const fs = sizes[l], text = LINES[l];
        g.font = `900 ${fs}px system-ui, -apple-system, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center';
        const sp = fs * (l ? 0.03 : 0.16);
        const widths = [...text].map((c) => g.measureText(c).width);
        const total = widths.reduce((a, b) => a + b, 0) + (text.length - 1) * sp;
        totalW = Math.max(totalW, total);
        const glow = g.createLinearGradient(0, ys[l] - fs / 2, 0, ys[l] + fs / 2);
        if (l) { glow.addColorStop(0, '#fff6c8'); glow.addColorStop(0.45, '#ffd34d'); glow.addColorStop(1, '#ff7b00'); }
        else { glow.addColorStop(0, '#ffffff'); glow.addColorStop(1, '#d9c8ff'); }
        let x = cx - total / 2;
        for (let i = 0; i < text.length; i++, idx++) {
          const k = Math.max(0, Math.min(1, (t - T_LOGO - idx * 0.05) / 0.45));
          if (k <= 0 || text[i] === ' ') { x += widths[i] + sp; continue; }
          const el = 1 - Math.pow(2, -9 * k) * Math.cos(k * 10); // rebond élastique
          const sc = (3 - 2 * el) * (1 + ex * 0.6);
          const lx = x + widths[i] / 2, ly = ys[l] - (1 - el) * 140 + Math.sin(t * 2.5 + idx * 0.5) * 3 * (t > T_IDLE ? 1 : 0);
          g.save(); g.translate(cx + (lx - cx) * (1 + ex * 0.6), ly); g.scale(sc, sc);
          g.globalAlpha = Math.min(1, k * 2) * (1 - ex);
          g.shadowColor = l ? 'rgba(255,140,0,0.9)' : 'rgba(170,120,255,0.9)'; g.shadowBlur = 26;
          g.lineWidth = fs * 0.1; g.strokeStyle = '#3b0d5c'; g.strokeText(text[i], 0, 0);
          g.shadowBlur = 0;
          g.fillStyle = glow; g.fillText(text[i], 0, 0);
          g.restore();
          x += widths[i] + sp;
        }
      }
      // couronne qui tombe sur le titre
      const kc = Math.max(0, Math.min(1, (t - T_LOGO - idx * 0.05 - 0.1) / 0.5));
      if (kc > 0) {
        const el = 1 - Math.pow(2, -9 * kc) * Math.cos(kc * 10);
        crown(cx, ys[0] - sizes[0] * 1.35 - (1 - el) * 120 + Math.sin(t * 2) * 3, big * 0.95 * (1 + ex * 0.6), Math.min(1, kc * 2) * (1 - ex));
      }
      // reflet qui balaye le titre
      const sweep = ((t - T_LOGO - 1.2) % 3.2) / 0.9;
      if (sweep > 0 && sweep < 1 && ex === 0) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        const sx = cx - totalW / 2 + sweep * (totalW + 120) - 60;
        const sg = g.createLinearGradient(sx - 40, 0, sx + 40, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sg; g.fillRect(sx - 40, ys[0] - sizes[0], 80, ys[1] - ys[0] + sizes[0] + big * 0.6);
        g.restore();
      }
      // sous-titre
      const ks = Math.max(0, Math.min(1, (t - 2.5) / 0.5));
      if (ks > 0) {
        g.globalAlpha = ks * (1 - ex);
        g.font = `800 ${Math.max(13, big * 0.2)}px system-ui`; g.fillStyle = '#e9dcff'; g.textAlign = 'center';
        g.fillText(`${gameCount} JEUX  ·  1 CHAMPION`, cx, ys[1] + big * 0.9 + (1 - ks) * 20);
        g.globalAlpha = 1;
      }
      // les 5 objets en orbite autour du logo
      if (t > T_IDLE - 0.4) {
        const ko = Math.min(1, (t - T_IDLE + 0.4) / 0.6);
        for (let i = 0; i < OBJS.length; i++) {
          const a = t * 0.6 + (i * Math.PI * 2) / OBJS.length;
          const ox = cx + Math.cos(a) * totalW * 0.62, oy = cy + Math.sin(a) * big * 1.75;
          g.globalAlpha = ko * (1 - ex) * (0.55 + 0.45 * Math.sin(a));
          OBJS[i](ox, oy, S * 0.035 * (0.8 + 0.25 * Math.sin(a)), t * 2);
        }
        g.globalAlpha = 1;
      }
      // appel à l'action
      if (t > T_IDLE && exitT < 0) {
        const p = 0.55 + 0.45 * Math.sin(t * 4);
        g.globalAlpha = p; g.font = '800 16px system-ui'; g.fillStyle = '#fff';
        g.fillText('TOUCHE POUR JOUER', cx, vh * 0.82);
        g.globalAlpha = 1;
      }
    }
    // flash
    if (t > T_HIT && t < T_HIT + 0.5) { g.fillStyle = `rgba(255,255,255,${(1 - (t - T_HIT) / 0.5) * 0.95})`; g.fillRect(-30, -30, vw + 60, vh + 60); }
    if (exitT >= 0) {
      g.fillStyle = `rgba(10,5,20,${Math.min(1, exitT / 0.55)})`; g.fillRect(-30, -30, vw + 60, vh + 60);
      if (exitT > 0.55) { running = false; removeEventListener('resize', resize); onDone(); return; }
    }
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
