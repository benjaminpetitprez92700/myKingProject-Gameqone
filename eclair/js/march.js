// Marche militaire synthétisée (aucun fichier audio) pour l'animation d'arrivée.
// Roulement de tambour, cuivres en ré mineur, timbales, et un grand accord avec cymbale au moment de l'éclair.
import { audio, isSoundOn } from './fx.js';

const NOTE = { D2: 73.42, A1: 55, F2: 87.31, G2: 98, C3: 130.81, D3: 146.83, A2: 110, Bb2: 116.54, F3: 174.61, A3: 220, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, Bb4: 466.16, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46 };

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
  // 0 à 4 : roulement qui enfle
  for (let k = 0; k < 32; k++) snare(at(k / 8), 0.05 + (k / 32) * 0.3);
  kick(at(0), 0.5); timpani(at(2), NOTE.A1, 0.5); timpani(at(3), NOTE.D2, 0.6);
  // 4 à 12 : la marche
  for (let b = 4; b < 12; b++) {
    kick(at(b), 0.6);
    snare(at(b), 0.32); snare(at(b + 0.5), 0.18); if (b % 2) { snare(at(b + 0.75), 0.14); }
    brass(at(b), b % 2 ? NOTE.A2 : NOTE.D3, 0.4, 0.07); // basse
  }
  const mel = [[4, 'D4', 0.7], [4.75, 'F4', 0.25], [5, 'A4', 0.5], [5.5, 'A4', 0.5], [6, 'D5', 0.9], [7, 'C5', 0.4], [7.5, 'A4', 0.5],
    [8, 'Bb4', 0.5], [8.5, 'G4', 0.5], [9, 'A4', 0.9], [10, 'F4', 0.4], [10.5, 'G4', 0.4], [11, 'A4', 0.25], [11.25, 'Bb4', 0.25], [11.5, 'C5', 0.4]];
  for (const [b, n, d] of mel) brass(at(b), NOTE[n], d * B * 2, 0.11);
  // 12 : l'éclair → grand accord, cymbale, timbales
  crash(at(12), 0.4); kick(at(12), 0.9); timpani(at(12), NOTE.D2, 0.8); timpani(at(12.5), NOTE.D2, 0.5);
  for (const n of ['D3', 'A3', 'D4', 'F4', 'A4', 'D5']) brass(at(12), NOTE[n], 2.6, 0.075);
  for (let k = 0; k < 16; k++) snare(at(14 + k / 8), 0.06 + (k / 16) * 0.18);
  kick(at(16), 0.8); timpani(at(16), NOTE.D2, 0.7); crash(at(16), 0.25);
  for (const n of ['D3', 'F3', 'A3', 'D4', 'D5']) brass(at(16), NOTE[n], 1.6, 0.07);
  return {
    stop() { const t = ctx.currentTime; out.gain.cancelScheduledValues(t); out.gain.setValueAtTime(out.gain.value, t); out.gain.linearRampToValueAtTime(0.0001, t + 0.4); setTimeout(() => out.disconnect(), 600); },
  };
}
