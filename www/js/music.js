// Musiques générées en direct (Web Audio), une par écran : intro, menu et chaque jeu.
// Aucun fichier audio : tout est synthétisé, donc léger, hors ligne et sans droits d'auteur.
import { audio } from './fx.js';

const midi = (n) => 440 * Math.pow(2, (n - 69) / 12);
const _ = null;

// ---------- Morceaux ----------
// Chaque mesure : accord (pad / stabs), fondamentale de basse ; motifs de batterie sur une mesure ;
// mélodie : une note par croche (null = silence).
export const SONGS = {
  intro: {
    bpm: 124, steps: 16, gain: 1.15, kit: 'big',
    chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], bass: [45, 41, 36, 43],
    bassPat: 'x.x.x.x.x.x.x.o.', drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.', open: '..x...x...x...x.' },
    pad: { vol: 0.045, cutoff: 1800 }, arp: { pat: '.x.x.x.x.x.x.x.x', vol: 0.035, oct: 24, type: 'triangle' },
    lead: { vol: 0.065, type: 'square', cutoff: 3400, detune: 6, notes: [76, _, 72, 76, 79, _, 76, 74, 72, _, 69, 72, 77, _, 76, 72, 72, _, 67, 72, 76, _, 74, 72, 74, _, 71, 74, 79, _, 81, 79] },
  },
  menu: {
    bpm: 112, steps: 16, gain: 0.8, swing: 0.08, kit: 'soft',
    chords: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 60, 64, 67]], bass: [38, 43, 36, 45],
    bassPat: 'x..x..x.x..x.o..', drums: { kick: 'x.....x.x.......', clap: '....x.......x...', hat: '..x...x...x...x.' },
    pad: { vol: 0.03, cutoff: 1500 }, stab: { pat: '..x...x...x..x..', vol: 0.03, cutoff: 2600 },
    lead: { vol: 0.045, type: 'triangle', cutoff: 5000, notes: [74, _, 77, _, 76, 74, 72, _, 71, _, 74, _, 79, _, 77, _, 76, _, 79, _, 76, 72, 74, _, 72, _, 69, _, 72, 74, 76, _] },
  },
  golf: {
    // lo-fi tranquille
    bpm: 84, steps: 16, gain: 0.75, swing: 0.16, kit: 'lofi',
    chords: [[65, 69, 72, 76], [64, 67, 71, 74], [62, 65, 69, 72], [60, 64, 67, 71]], bass: [41, 40, 38, 36],
    bassPat: 'x......x..x.....', drums: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' },
    pad: { vol: 0.04, cutoff: 1100, type: 'triangle' }, arp: { pat: 'x...x.x...x.x...', vol: 0.03, oct: 12, type: 'sine' },
    lead: { vol: 0.04, type: 'sine', cutoff: 3000, notes: [_, _, 76, _, 79, _, 77, 76, _, _, 74, _, 72, _, _, _, _, _, 74, _, 77, _, 76, 74, _, _, 72, _, 71, _, 72, _] },
  },
  pog: {
    // boom bap années 90
    bpm: 92, steps: 16, gain: 0.85, swing: 0.12, kit: 'boombap',
    chords: [[57, 60, 64], [57, 60, 64], [53, 57, 60], [55, 59, 62]], bass: [33, 33, 29, 31],
    bassPat: 'x..x...x..x.....', drums: { kick: 'x..x....x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.xx' },
    stab: { pat: 'x.....x...x.....', vol: 0.04, cutoff: 1800, type: 'square' },
    lead: { vol: 0.045, type: 'square', cutoff: 2200, notes: [69, _, _, 72, _, 76, _, 74, 72, _, _, _, 69, _, 67, _, 65, _, _, 69, _, 72, _, 71, 67, _, _, _, 71, _, 74, _] },
  },
  billard: {
    // jazz lounge, basse qui marche
    bpm: 104, steps: 16, gain: 0.75, swing: 0.22, kit: 'brush',
    chords: [[62, 65, 69, 72], [55, 59, 62, 65], [60, 64, 67, 71], [57, 61, 64, 67]], bass: [38, 43, 36, 45],
    bassPat: 'w...w...w...w...', drums: { kick: 'x.........x.....', snare: '....x.......x...', hat: 'x..xx..xx..xx..x' },
    stab: { pat: '...x.....x......', vol: 0.035, cutoff: 2400, type: 'triangle' },
    lead: { vol: 0.04, type: 'triangle', cutoff: 4000, notes: [_, 74, 77, 81, 79, _, 77, _, 74, _, 71, _, 74, 72, _, _, _, 76, 79, 83, 81, _, 79, _, 76, _, 73, _, 76, 74, _, _] },
  },
  petanque: {
    // valse provençale à l'accordéon (3 temps)
    bpm: 150, steps: 12, gain: 0.8, kit: 'none',
    chords: [[60, 64, 67], [60, 64, 67], [55, 59, 62], [55, 59, 62], [53, 57, 60], [53, 57, 60], [55, 59, 62], [60, 64, 67]],
    bass: [36, 36, 43, 43, 41, 41, 43, 36],
    bassPat: 'x...........', stab: { pat: '....x...x...', vol: 0.045, cutoff: 2200, type: 'square', detune: 14 },
    lead: { vol: 0.055, type: 'square', cutoff: 2600, detune: 16, trem: true, notes: [72, _, 76, _, 79, _, 77, _, 76, _, 74, _, 71, _, 74, _, 77, _, 76, _, 74, _, 72, _, 69, _, 72, _, 77, _, 76, _, 74, _, 72, _, 74, _, 71, _, 67, _, 72, _, _, _, _, _] },
  },
  chess: {
    // piano feutré, arpèges classiques
    bpm: 76, steps: 16, gain: 0.7, kit: 'none',
    chords: [[57, 60, 64], [53, 57, 60], [50, 53, 57], [52, 56, 59]], bass: [45, 41, 38, 40],
    bassPat: 'x.......x.......', arp: { pat: 'x.x.x.x.x.x.x.x.', vol: 0.05, oct: 12, type: 'triangle' },
    pad: { vol: 0.025, cutoff: 900, type: 'triangle' },
    lead: { vol: 0.045, type: 'sine', cutoff: 3000, notes: [76, _, _, 74, 72, _, 71, _, 72, _, _, 69, 65, _, _, _, 74, _, _, 72, 69, _, 65, _, 68, _, 71, _, 76, _, _, _] },
  },
  snake: {
    // chiptune nerveuse
    bpm: 138, steps: 16, gain: 0.7, kit: 'chip',
    chords: [[64, 67, 71], [60, 64, 67], [62, 66, 69], [59, 62, 66]], bass: [40, 36, 38, 35],
    bassPat: 'x.x.x.x.x.x.x.x.', drums: { kick: 'x...x...x...x...', snare: '....x.......x...', hat: '..x...x...x...x.' },
    arp: { pat: 'xxxxxxxxxxxxxxxx', vol: 0.025, oct: 12, type: 'square' },
    lead: { vol: 0.045, type: 'square', cutoff: 5000, notes: [76, _, 79, _, 83, _, 79, _, 72, _, 76, _, 79, 76, 72, _, 74, _, 78, _, 81, _, 78, _, 71, _, 74, _, 78, _, 79, 78] },
  },
};

// ---------- Moteur ----------
let musicOn = true;
let cur = null;          // morceau en cours
let musicBus = null, reverb = null, noise = null;

function setup(ctx) {
  if (musicBus) return;
  musicBus = ctx.createGain(); musicBus.gain.value = 1;
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3.5; comp.knee.value = 8;
  musicBus.connect(comp).connect(ctx.destination);
  const len = ctx.sampleRate * 2.2, buf = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let c = 0; c < 2; c++) { const d = buf.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3); }
  reverb = ctx.createConvolver(); reverb.buffer = buf; reverb.connect(comp);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
}

function voice(s, t, freq, dur, { type = 'sawtooth', vol = 0.1, cutoff = 2400, attack = 0.01, release = 0.15, detune = 0, rev = 0.25, q = 1, trem = false } = {}) {
  const { ctx } = s;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = cutoff; f.Q.value = q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + attack);
  g.gain.setValueAtTime(vol, t + Math.max(attack, dur - release)); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const dt of detune ? [-detune, detune] : [0]) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq; o.detune.value = dt;
    o.connect(f); o.start(t); o.stop(t + dur + 0.05);
  }
  let out = g;
  if (trem) { // tremolo d'accordéon
    const tg = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    lfo.frequency.value = 6; lg.gain.value = 0.35; tg.gain.value = 0.75;
    lfo.connect(lg).connect(tg.gain); lfo.start(t); lfo.stop(t + dur + 0.05);
    g.connect(tg); out = tg;
  }
  f.connect(g); out.connect(s.out);
  if (rev) { const r = ctx.createGain(); r.gain.value = rev; out.connect(r).connect(s.wet); }
}

function hit(s, t, { dur = 0.1, freq = 2000, type = 'bandpass', q = 1, vol = 0.3, rev = 0 } = {}) {
  const { ctx } = s, src = ctx.createBufferSource(); src.buffer = noise;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g); g.connect(s.out);
  if (rev) { const r = ctx.createGain(); r.gain.value = rev; g.connect(r).connect(s.wet); }
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

function kick(s, t, v = 1, chip = false) {
  const { ctx } = s, o = ctx.createOscillator(), g = ctx.createGain();
  if (chip) o.type = 'square';
  o.frequency.setValueAtTime(chip ? 220 : 160, t); o.frequency.exponentialRampToValueAtTime(chip ? 50 : 42, t + (chip ? 0.08 : 0.14));
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime((chip ? 0.35 : 0.9) * v, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
  o.connect(g).connect(s.out); o.start(t); o.stop(t + 0.4);
}

function drums(s, st, t) {
  const S = s.song, D = S.drums || {}, kit = S.kit;
  const on = (k) => D[k] && D[k][st] === 'x';
  if (kit === 'none') return;
  if (on('kick')) kick(s, t, kit === 'lofi' || kit === 'brush' ? 0.7 : kit === 'boombap' ? 1.1 : 1, kit === 'chip');
  if (on('clap')) hit(s, t, { dur: 0.18, freq: 1600, vol: 0.3, rev: 0.3 });
  if (on('snare')) {
    if (kit === 'brush') hit(s, t, { dur: 0.22, freq: 3000, q: 0.5, vol: 0.12, rev: 0.2 });
    else if (kit === 'chip') hit(s, t, { dur: 0.08, freq: 2500, type: 'highpass', vol: 0.18 });
    else hit(s, t, { dur: kit === 'lofi' ? 0.12 : 0.16, freq: kit === 'lofi' ? 1400 : 1900, vol: kit === 'lofi' ? 0.16 : 0.3, rev: 0.25 });
  }
  if (on('hat')) hit(s, t, { dur: kit === 'brush' ? 0.09 : 0.035, freq: kit === 'lofi' ? 7000 : 9000, type: 'highpass', vol: kit === 'lofi' ? 0.035 : kit === 'chip' ? 0.05 : 0.06 });
  if (on('open')) hit(s, t, { dur: 0.16, freq: 8000, type: 'highpass', vol: 0.06 });
}

function step(s, i, t) {
  const S = s.song, n = S.steps, bars = S.chords.length;
  const bar = Math.floor(i / n) % bars, st = i % n, beat = 60 / S.bpm;
  const STEP = (beat / 4) * (n === 12 ? 1 : 1);
  drums(s, st, t);
  // basse
  const bp = S.bassPat[st];
  if (bp && bp !== '.') {
    let note = S.bass[bar];
    if (bp === 'o') note += 12; else if (bp === 'f') note += 7;
    else if (bp === 'w') note = [S.bass[bar], S.bass[bar] + 4, S.bass[bar] + 7, S.bass[bar] + 9][(st / 4) | 0];
    voice(s, t, midi(note), STEP * (bp === 'w' ? 3.6 : 1.8), { type: S.kit === 'chip' ? 'square' : bp === 'w' ? 'triangle' : 'sawtooth', vol: bp === 'w' ? 0.22 : 0.15, cutoff: 750, q: 5, release: 0.08, rev: 0 });
  }
  if (S.pad && st === 0) for (const c of S.chords[bar]) voice(s, t, midi(c), STEP * n, { type: S.pad.type || 'sawtooth', vol: S.pad.vol, cutoff: S.pad.cutoff, attack: 0.25, release: 0.6, detune: 10, rev: 0.5 });
  if (S.stab && S.stab.pat[st] === 'x') for (const c of S.chords[bar]) voice(s, t, midi(c), STEP * 1.6, { type: S.stab.type || 'sawtooth', vol: S.stab.vol, cutoff: S.stab.cutoff, release: 0.08, detune: S.stab.detune || 6, rev: 0.3 });
  if (S.arp && S.arp.pat[st] === 'x') { const ch = S.chords[bar]; voice(s, t, midi(ch[st % ch.length] + S.arp.oct), STEP * 1.4, { type: S.arp.type, vol: S.arp.vol, cutoff: 6000, release: 0.08, rev: 0.4 }); }
  if (S.lead && st % 2 === 0) {
    const per = n / 2, note = S.lead.notes[(bar * per + st / 2) % S.lead.notes.length];
    if (note) voice(s, t, midi(note), STEP * 2.3, { type: S.lead.type, vol: S.lead.vol, cutoff: S.lead.cutoff, release: 0.12, detune: S.lead.detune || 0, rev: 0.35, trem: S.lead.trem });
  }
}

function riser(s, t0, t1) {
  const { ctx } = s, dur = t1 - t0;
  const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = 2;
  f.frequency.setValueAtTime(300, t0); f.frequency.exponentialRampToValueAtTime(7000, t1);
  const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(0.45, t1);
  src.connect(f).connect(g).connect(s.out); src.start(t0); src.stop(t1);
  const o = ctx.createOscillator(), og = ctx.createGain(), lp = ctx.createBiquadFilter(); o.type = 'sawtooth'; lp.frequency.value = 1800;
  o.frequency.setValueAtTime(110, t0); o.frequency.exponentialRampToValueAtTime(880, t1);
  og.gain.setValueAtTime(0.0001, t0); og.gain.exponentialRampToValueAtTime(0.1, t1);
  o.connect(lp).connect(og).connect(s.out); o.start(t0); o.stop(t1);
  for (let t = t0 + dur * 0.35; t < t1;) { hit(s, t, { dur: 0.06, freq: 1800, vol: 0.05 + 0.3 * ((t - t0) / dur) }); t += Math.max(0.04, 0.2 * (1 - (t - t0) / dur)); }
}
function impact(s, t) {
  kick(s, t, 1.4);
  hit(s, t, { dur: 1.6, freq: 5000, type: 'highpass', vol: 0.4, rev: 0.8 });
  for (const n of SONGS.intro.chords[0]) voice(s, t, midi(n - 12), 2.2, { vol: 0.08, cutoff: 3000, detune: 12, release: 1.5, rev: 0.6 });
  voice(s, t, midi(33), 1.8, { type: 'sine', vol: 0.45, cutoff: 400, release: 1.2, rev: 0 });
}

function stopCurrent(fade) {
  if (!cur) return;
  const s = cur; cur = null;
  const t = s.ctx.currentTime;
  s.out.gain.cancelScheduledValues(t); s.out.gain.setValueAtTime(Math.max(0.0001, s.out.gain.value), t);
  s.out.gain.exponentialRampToValueAtTime(0.0001, t + fade);
  clearInterval(s.timer);
  setTimeout(() => { s.out.disconnect(); s.wet.disconnect(); }, fade * 1000 + 600);
}

// Joue un morceau (fondu enchaîné). opts.hitIn : pour l'intro, secondes avant l'impact.
export function playSong(name, opts = {}) {
  if (cur && cur.name === name) return;
  stopCurrent(0.9);
  if (!musicOn || !name || !SONGS[name]) return;
  const a = audio(); if (!a || !a.ctx) return;
  const ctx = a.ctx; setup(ctx);
  const song = SONGS[name];
  const out = ctx.createGain(); out.gain.value = 0.0001; out.connect(musicBus);
  const wet = ctx.createGain(); wet.gain.value = 0.8; wet.connect(reverb);
  const now = ctx.currentTime + 0.05;
  out.gain.exponentialRampToValueAtTime(song.gain, now + 0.8);
  const s = { name, ctx, out, wet, song, i: 0 };
  cur = s;
  let start = now;
  if (name === 'intro') {
    const hitT = now + Math.max(0, opts.hitIn || 0);
    if ((opts.hitIn || 0) > 0.3) riser(s, now, hitT);
    impact(s, hitT);
    start = hitT + (60 / song.bpm) * 2;
  }
  const stepDur = 60 / song.bpm / 4;
  s.next = start;
  s.timer = setInterval(() => {
    while (s.next < ctx.currentTime + 0.15) {
      const sw = (s.i % 2 ? song.swing || 0 : 0) * stepDur;
      step(s, s.i, s.next + sw);
      s.i++; s.next += stepDur;
    }
  }, 25);
}

export function stopMusic(fade = 1.2) { stopCurrent(fade); }
export const currentSong = () => cur?.name || null;
export function setMusicOn(on, songIfOn) { musicOn = on; if (!on) stopCurrent(0.4); else if (songIfOn) playSong(songIfOn); }
export const isMusicOn = () => musicOn;

// compatibilité avec l'intro
export function startIntroMusic(hitIn = 0) { playSong('intro', { hitIn }); }
export function stopIntroMusic(fade = 1.2) { if (cur?.name === 'intro') stopCurrent(fade); }
export const musicPlaying = () => !!cur;
