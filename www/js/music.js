// Musique d'intro générée en direct (Web Audio) : montée de tension, impact, puis thème épique en boucle.
import { audio, isSoundOn } from './fx.js';

const BPM = 124, STEP = 60 / BPM / 4;            // double-croches
// progression épique en la mineur : Am – F – C – G
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const BASS = [45, 41, 36, 43];
// mélodie (une note par croche, null = silence), 4 mesures
const LEAD = [
  76, null, 72, 76, 79, null, 76, 74,   72, null, 69, 72, 77, null, 76, 72,
  72, null, 67, 72, 76, null, 74, 72,   74, null, 71, 74, 79, null, 81, 79,
];
const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);

let state = null;

function makeReverb(ctx) {
  const len = ctx.sampleRate * 2.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buf.getChannelData(c);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
  }
  const conv = ctx.createConvolver(); conv.buffer = buf; return conv;
}

function noiseBuf(ctx) {
  const b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

// ---------- Instruments ----------
function kick(s, t, v = 1) {
  const { ctx, bus } = s, o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(160, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.9 * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.4);
  o.connect(g).connect(bus); o.start(t); o.stop(t + 0.45);
}
function noiseHit(s, t, { dur = 0.1, freq = 2000, type = 'bandpass', q = 1, vol = 0.3, rev = 0 } = {}) {
  const { ctx, bus, wet } = s, src = ctx.createBufferSource(); src.buffer = s.noise;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g); g.connect(bus); if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(wet); }
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}
function synth(s, t, freq, dur, { type = 'sawtooth', vol = 0.1, cutoff = 2400, attack = 0.01, release = 0.15, detune = 0, rev = 0.25, q = 1 } = {}) {
  const { ctx, bus, wet } = s;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const d of detune ? [-detune, detune] : [0]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = d;
    o.connect(f); o.start(t); o.stop(t + dur + 0.05);
  }
  f.connect(g); g.connect(bus);
  if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(wet); }
}

// montée de tension (bruit filtré qui monte + nappe qui grimpe), se termine pile sur l'impact
function riser(s, t0, t1) {
  const { ctx, bus } = s, dur = t1 - t0;
  const src = ctx.createBufferSource(); src.buffer = s.noise; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(7000, t1);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.35, t1);
  src.connect(f).connect(g).connect(bus); src.start(t0); src.stop(t1);
  const o = ctx.createOscillator(), og = ctx.createGain(); o.type = 'sawtooth';
  o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
  og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.08, t1);
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1800;
  o.connect(lp).connect(og).connect(bus); o.start(t0); o.stop(t1);
  // roulement de caisse claire qui accélère
  for (let k = 0, t = t0 + dur * 0.35; t < t1; k++) { noiseHit(s, t, { dur: 0.06, freq: 1800, vol: 0.05 + 0.25 * ((t - t0) / dur) }); t += Math.max(0.04, 0.2 * (1 - (t - t0) / dur)); }
}

function impact(s, t) {
  kick(s, t, 1.3);
  noiseHit(s, t, { dur: 1.6, freq: 5000, type: 'highpass', vol: 0.35, rev: 0.8 });   // cymbale
  for (const n of CHORDS[0]) synth(s, t, midi(n - 12), 2.2, { vol: 0.07, cutoff: 3000, detune: 12, release: 1.5, rev: 0.6 });
  synth(s, t, midi(33), 1.8, { type: 'sine', vol: 0.4, cutoff: 400, release: 1.2, rev: 0 });
}

// une double-croche de la boucle principale
function playStep(s, i, t) {
  const bar = Math.floor(i / 16) % 4, st = i % 16;
  if (st % 4 === 0) kick(s, t);
  if (st === 4 || st === 12) noiseHit(s, t, { dur: 0.18, freq: 1600, vol: 0.28, rev: 0.3 });    // clap
  noiseHit(s, t, { dur: st % 2 ? 0.03 : 0.05, freq: 9000, type: 'highpass', vol: st % 4 === 2 ? 0.09 : 0.04 }); // charleston
  // basse pulsée en croches
  if (st % 2 === 0) synth(s, t, midi(BASS[bar] + (st % 8 === 6 ? 12 : 0)), STEP * 1.8, { vol: 0.16, cutoff: 700, q: 6, release: 0.08, rev: 0 });
  // nappe d'accords en début de mesure
  if (st === 0) for (const n of CHORDS[bar]) synth(s, t, midi(n), STEP * 16, { vol: 0.035, cutoff: 1600, attack: 0.25, release: 0.6, detune: 10, rev: 0.5 });
  // arpège scintillant
  if (st % 2 === 1) synth(s, t, midi(CHORDS[bar][(st >> 1) % 3] + 24), STEP * 1.5, { type: 'triangle', vol: 0.03, cutoff: 6000, release: 0.1, rev: 0.4 });
  // mélodie
  if (st % 2 === 0) {
    const n = LEAD[bar * 8 + st / 2];
    if (n) synth(s, t, midi(n), STEP * 2.2, { type: 'square', vol: 0.05, cutoff: 3200, release: 0.12, detune: 6, rev: 0.35 });
  }
}

// Démarre la musique. hitIn = secondes avant l'impact (le rythme démarre dessus) ; 0 = démarrer direct.
export function startIntroMusic(hitIn = 0) {
  if (state || !isSoundOn()) return;
  const a = audio(); if (!a || !a.ctx) return;
  const { ctx, master } = a;
  const out = ctx.createGain(); out.gain.value = 0.0001;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -16; comp.ratio.value = 4;
  const bus = ctx.createGain(); const wet = ctx.createGain(); wet.gain.value = 0.9;
  const rev = makeReverb(ctx);
  bus.connect(comp); wet.connect(rev).connect(comp); comp.connect(out).connect(master);
  const now = ctx.currentTime + 0.05;
  out.gain.exponentialRampToValueAtTime(0.9, now + 0.3);
  state = { ctx, out, bus, wet, noise: noiseBuf(ctx), step: 0 };
  const s = state;
  const hitT = now + Math.max(0, hitIn);
  if (hitIn > 0.3) riser(s, now, hitT);
  impact(s, hitT);
  s.next = hitT + STEP * 16 * 0.5;   // le rythme repart une demi-mesure après l'impact
  s.timer = setInterval(() => {
    while (s.next < ctx.currentTime + 0.15) { playStep(s, s.step++, s.next); s.next += STEP; }
  }, 25);
}

export function stopIntroMusic(fade = 1.2) {
  if (!state) return;
  const s = state; state = null;
  const t = s.ctx.currentTime;
  s.out.gain.cancelScheduledValues(t); s.out.gain.setValueAtTime(s.out.gain.value, t);
  s.out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  setTimeout(() => { clearInterval(s.timer); s.out.disconnect(); }, fade * 1000 + 100);
}

export const musicPlaying = () => !!state;
