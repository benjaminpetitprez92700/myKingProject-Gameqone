// Marche militaire synthétisée (aucun fichier audio) pour l'animation d'arrivée.
// Roulement de tambour, cuivres en ré mineur, timbales, et un grand accord avec cymbale au moment de l'éclair.
import { audio, isSoundOn } from './fx.js';

const NOTE = { C4: 261.63, D2: 73.42, A1: 55, F2: 87.31, G2: 98, C3: 130.81, D3: 146.83, A2: 110, Bb2: 116.54, F3: 174.61, A3: 220, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46 };

export function playMarch() {
  const a = audio(); if (!a || !isSoundOn()) return { stop() {} };
  const { ctx, master } = a;
  const out = ctx.createGain(); out.gain.value = 0.55; out.connect(master);
  const T0 = ctx.currentTime + 0.06, B = 0.5; // 120 pulsations par minute
  let nbuf = null;
  const noise = () => {
    if (nbuf) return nbuf;
    nbuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = nbuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return nbuf;
  };
  const env = (g, t, v, att, dec) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec); };

  const snare = (t, v = 0.3) => {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1400;
    const g = ctx.createGain(); env(g, t, v, 0.002, 0.13);
    s.connect(f).connect(g).connect(out); s.start(t, Math.random()); s.stop(t + 0.2);
    const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'triangle'; o.frequency.setValueAtTime(190, t);
    env(og, t, v * 0.5, 0.002, 0.07); o.connect(og).connect(out); o.start(t); o.stop(t + 0.1);
  };
  const kick = (t, v = 0.7) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(110, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.25);
    env(g, t, v, 0.003, 0.3); o.connect(g).connect(out); o.start(t); o.stop(t + 0.35);
  };
  const timpani = (t, f, v = 0.6) => {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(f * 1.04, t); o.frequency.exponentialRampToValueAtTime(f, t + 0.12);
    env(g, t, v, 0.005, 1.2); o.connect(g).connect(out); o.start(t); o.stop(t + 1.3);
  };
  const crash = (t, v = 0.35) => {
    const s = ctx.createBufferSource(); s.buffer = noise();
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 5000;
    const g = ctx.createGain(); env(g, t, v, 0.004, 1.8);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + 1.9);
  };
  // cuivre : deux dents de scie légèrement désaccordées, filtre qui s'ouvre
  const brass = (t, f, dur, v = 0.12) => {
    const g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 2;
    lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2600, t + 0.06); lp.frequency.linearRampToValueAtTime(1400, t + Math.min(dur, 0.4));
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.04);
    g.gain.setValueAtTime(v, t + dur * 0.8); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.12);
    lp.connect(g).connect(out);
    for (const det of [-6, 6]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det; o.connect(lp); o.start(t); o.stop(t + dur + 0.15); }
  };

  const at = (beat) => T0 + beat * B;
  // 0 à 4 (0-2 s) : roulement qui enfle
  for (let k = 0; k < 32; k++) snare(at(k / 8), 0.05 + (k / 32) * 0.3);
  kick(at(0), 0.5); timpani(at(2), NOTE.A1, 0.5); timpani(at(3), NOTE.D2, 0.6);
  // 4 à 28 (2-14 s) : la marche
  for (let b = 4; b < 28; b++) {
    kick(at(b), b >= 20 ? 0.7 : 0.6);
    snare(at(b), 0.3); snare(at(b + 0.5), 0.17); if (b % 2) snare(at(b + 0.75), 0.13);
    const bass = b < 20 ? (b % 2 ? NOTE.A2 : NOTE.D3) : [NOTE.D3, NOTE.C3, NOTE.Bb2, NOTE.A2][Math.floor((b - 20) / 2) % 4];
    brass(at(b), bass, 0.4, 0.07);
  }
  const theme = [[0, 'D4', 0.7], [0.75, 'F4', 0.25], [1, 'A4', 0.5], [1.5, 'A4', 0.5], [2, 'D5', 0.9], [3, 'C5', 0.4], [3.5, 'A4', 0.5],
    [4, 'Bb4', 0.5], [4.5, 'G4', 0.5], [5, 'A4', 0.9], [6, 'F4', 0.4], [6.5, 'G4', 0.4], [7, 'A4', 0.25], [7.25, 'Bb4', 0.25], [7.5, 'C5', 0.4]];
  for (const [b, n, d] of theme) brass(at(4 + b), NOTE[n], d * B * 2, 0.11);
  // deuxième passage, doublé à la tierce
  for (const [b, n, d] of theme) { brass(at(12 + b), NOTE[n], d * B * 2, 0.1); brass(at(12 + b), NOTE[n] * 1.26, d * B * 2, 0.05); }
  // 20 à 28 : les combats, plus sombre, timbales
  const dark = [[0, 'A4', 1], [1, 'G4', 0.5], [1.5, 'F4', 0.5], [2, 'E4', 1], [3, 'A3', 1], [4, 'D4', 0.5], [4.5, 'E4', 0.5], [5, 'F4', 0.5], [5.5, 'G4', 0.5], [6, 'A4', 1.6]];
  for (const [b, n, d] of dark) brass(at(20 + b), NOTE[n], d * B * 2, 0.11);
  for (const b of [20, 22, 24, 26]) timpani(at(b), NOTE.D2, 0.55);
  // 28 à 32 : roulement de tension
  for (let k = 0; k < 32; k++) snare(at(28 + k / 8), 0.08 + (k / 32) * 0.32);
  for (let k = 0; k < 8; k++) timpani(at(28 + k / 2), NOTE.A1, 0.2 + k * 0.05);
  // 32 (16 s) : l'éclair → grand accord, cymbale, timbales
  crash(at(32), 0.45); kick(at(32), 0.9); timpani(at(32), NOTE.D2, 0.9); timpani(at(32.5), NOTE.D2, 0.5);
  for (const n of ['D3', 'A3', 'D4', 'F4', 'A4', 'D5']) brass(at(32), NOTE[n], 2.2, 0.075);
  kick(at(36), 0.8); timpani(at(36), NOTE.D2, 0.7); crash(at(36), 0.2);
  for (const n of ['D3', 'F3', 'A3', 'D4', 'D5']) brass(at(36), NOTE[n], 1.4, 0.06);
  return {
    stop() { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + 0.4); setTimeout(() => out.disconnect(), 600); },
  };
}
