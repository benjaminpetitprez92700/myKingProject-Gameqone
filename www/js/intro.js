// Intro animée : les 4 objets des jeux arrivent en spirale, se percutent, et le logo explose à l'écran.
import { fx, unlockAudio } from './fx.js';

const TITLE = 'GAMEQONE';
const COLORS = ['#ffd34d', '#ff006e', '#3a86ff', '#06d6a0', '#ff9f1c', '#8338ec'];

export function playIntro(canvas, onDone) {
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

  const T_HIT = 1.45, T_LOGO = 1.55, T_IDLE = 2.9;

  function tap() {
    unlockAudio();
    if (exitT >= 0) return;
    if (t < T_IDLE - 0.2) { if (!boomed) { boomed = true; burst(); } t = Math.max(t, T_IDLE - 0.2); return; }
    exitT = 0; fx.whoosh(0.45);
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
  const OBJS = [golf, pog, eight, boule];

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

    // les 4 objets en spirale avec traînées
    if (t < T_HIT + 0.05) {
      const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      for (let i = 0; i < 4; i++) {
        const start = 0.15 + i * 0.07;
        for (let tr = 6; tr >= 0; tr--) {
          const tt = t - tr * 0.025;
          const k = Math.max(0, Math.min(1, (tt - start) / (T_HIT - start)));
          if (k <= 0) continue;
          const e = k * k * k;
          const ang = Math.atan2(corners[i][1], corners[i][0]) + (1 - e) * 2.2;
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

    // logo
    if (t > T_LOGO) {
      g.font = '900 100px system-ui, -apple-system, sans-serif';
      const ref = g.measureText(TITLE).width;
      const fs = Math.min(92, (vw * 0.84 * 100) / ref);
      g.font = `900 ${fs}px system-ui, -apple-system, sans-serif`; g.textBaseline = 'middle'; g.textAlign = 'center';
      const widths = [...TITLE].map((c) => g.measureText(c).width);
      const total = widths.reduce((a, b) => a + b, 0) + (TITLE.length - 1) * fs * 0.02;
      let x = cx - total / 2;
      const ex = exitT >= 0 ? Math.min(1, exitT / 0.55) : 0;
      const glow = g.createLinearGradient(0, cy - fs / 2, 0, cy + fs / 2);
      glow.addColorStop(0, '#fff6c8'); glow.addColorStop(0.45, '#ffd34d'); glow.addColorStop(1, '#ff7b00');
      for (let i = 0; i < TITLE.length; i++) {
        const k = Math.max(0, Math.min(1, (t - T_LOGO - i * 0.07) / 0.45));
        if (k <= 0) { x += widths[i] + fs * 0.02; continue; }
        const el = 1 - Math.pow(2, -9 * k) * Math.cos(k * 10); // rebond élastique
        const sc = (3 - 2 * el) * (1 + ex * 0.6);
        const lx = x + widths[i] / 2, ly = cy - (1 - el) * 140 + Math.sin(t * 2.5 + i * 0.5) * 3 * (t > T_IDLE ? 1 : 0);
        g.save(); g.translate(cx + (lx - cx) * (1 + ex * 0.6), ly); g.scale(sc, sc);
        g.globalAlpha = Math.min(1, k * 2) * (1 - ex);
        g.shadowColor = 'rgba(255,140,0,0.9)'; g.shadowBlur = 28;
        g.lineWidth = fs * 0.09; g.strokeStyle = '#3b0d5c'; g.strokeText(TITLE[i], 0, 0);
        g.shadowBlur = 0;
        g.fillStyle = glow; g.fillText(TITLE[i], 0, 0);
        g.restore();
        x += widths[i] + fs * 0.02;
      }
      // reflet qui balaye le titre
      const sweep = ((t - T_LOGO - 0.9) % 3.2) / 0.9;
      if (sweep > 0 && sweep < 1 && ex === 0) {
        g.save();
        g.globalCompositeOperation = 'lighter';
        const sx = cx - total / 2 + sweep * (total + 120) - 60;
        const sg = g.createLinearGradient(sx - 40, 0, sx + 40, 0);
        sg.addColorStop(0, 'rgba(255,255,255,0)'); sg.addColorStop(0.5, 'rgba(255,255,255,0.35)'); sg.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = sg; g.fillRect(sx - 40, cy - fs * 0.6, 80, fs * 1.2);
        g.restore();
      }
      // sous-titre
      const ks = Math.max(0, Math.min(1, (t - 2.3) / 0.5));
      if (ks > 0) {
        g.globalAlpha = ks * (1 - ex);
        g.font = `800 ${Math.max(13, fs * 0.22)}px system-ui`; g.fillStyle = '#e9dcff';
        g.fillText('4 JEUX  ·  1 CHAMPION', cx, cy + fs * 0.85 + (1 - ks) * 20);
        g.globalAlpha = 1;
      }
      // les 4 objets en orbite autour du logo
      if (t > T_IDLE - 0.4) {
        const ko = Math.min(1, (t - T_IDLE + 0.4) / 0.6);
        for (let i = 0; i < 4; i++) {
          const a = t * 0.6 + (i * Math.PI) / 2;
          const ox = cx + Math.cos(a) * total * 0.62, oy = cy + Math.sin(a) * fs * 1.35;
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
