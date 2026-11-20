// Sons synthétisés (aucun fichier audio) + vibrations (Capacitor Haptics, sinon navigator.vibrate).

let ctx = null, master = null;
let soundOn = true, hapticsOn = true;

export function setPrefs({ sound, haptics }) { soundOn = sound; hapticsOn = haptics; }

export function unlockAudio() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') ctx.resume();
  } catch (e) {}
}

function tone(freq, dur, { type = 'sine', vol = 0.2, slide = 0, delay = 0 } = {}) {
  if (!soundOn || !ctx) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.005);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur, { vol = 0.2, freq = 1200, q = 1, delay = 0 } = {}) {
  if (!soundOn || !ctx) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f).connect(g).connect(master);
  src.start(t);
}

const Haptics = () => window.Capacitor?.Plugins?.Haptics;

function vibrate(style, ms) {
  if (!hapticsOn) return;
  try {
    const H = Haptics();
    if (H) { H.impact({ style }); return; }
    navigator.vibrate?.(ms);
  } catch (e) {}
}

export const fx = {
  tap() { tone(880, 0.05, { type: 'triangle', vol: 0.08 }); vibrate('LIGHT', 5); },
  tick() { if (hapticsOn) { try { Haptics() ? Haptics().selectionChanged() : null; } catch (e) {} } },
  maxPower() { tone(1200, 0.04, { type: 'square', vol: 0.04 }); vibrate('LIGHT', 8); },
  shot(power) {
    // « pichenette » : clic sec + petit roulement
    tone(1400 - power * 500, 0.03, { type: 'square', vol: 0.12 });
    noise(0.08, { vol: 0.25, freq: 2500, q: 2 });
    vibrate(power > 0.7 ? 'MEDIUM' : 'LIGHT', 12);
  },
  hit(strength, mat) {
    const v = Math.min(1, strength / 500);
    if (v < 0.05) return;
    if (mat === 'post') { tone(1800, 0.06, { type: 'sine', vol: 0.25 * v }); tone(2700, 0.04, { vol: 0.1 * v }); }
    else { tone(320, 0.07, { type: 'triangle', vol: 0.35 * v }); noise(0.05, { vol: 0.2 * v, freq: 800 }); }
    vibrate(v > 0.5 ? 'MEDIUM' : 'LIGHT', 10);
  },
  clack(strength) {
    // bille contre calot : verre contre verre
    const v = Math.min(1, 0.4 + strength / 600);
    tone(2400, 0.12, { vol: 0.35 * v }); tone(3600, 0.08, { vol: 0.18 * v }); tone(1500, 0.18, { vol: 0.12 * v });
    vibrate('HEAVY', 30);
  },
  cup() {
    // la balle tombe et tinte au fond du trou
    tone(1900, 0.09, { vol: 0.25 }); tone(1500, 0.09, { vol: 0.2, delay: 0.08 }); tone(1700, 0.07, { vol: 0.14, delay: 0.15 });
    noise(0.12, { vol: 0.2, freq: 900, delay: 0.02 });
    vibrate('HEAVY', 30);
  },
  // sons génériques réutilisés par les autres jeux
  ballClick(v = 0.6) { tone(2600 + Math.random() * 400, 0.05, { vol: 0.3 * v }); tone(1700, 0.04, { vol: 0.12 * v }); },
  cushion(v = 0.6) { tone(140, 0.08, { type: 'triangle', vol: 0.3 * v }); noise(0.05, { vol: 0.1 * v, freq: 500 }); },
  pocket() { tone(220, 0.12, { type: 'triangle', vol: 0.3 }); noise(0.15, { vol: 0.15, freq: 300 }); tone(160, 0.2, { type: 'sine', vol: 0.2, delay: 0.08 }); vibrate('MEDIUM', 25); },
  thud(v = 0.7) { noise(0.18, { vol: 0.45 * v, freq: 350, q: 0.8 }); tone(90, 0.15, { vol: 0.35 * v }); vibrate('MEDIUM', 20); },
  metal(v = 0.7) { tone(3100, 0.18, { vol: 0.28 * v }); tone(4700, 0.12, { vol: 0.12 * v }); tone(1250, 0.25, { vol: 0.12 * v }); vibrate('HEAVY', 35); },
  slam() { noise(0.25, { vol: 0.6, freq: 250, q: 0.6 }); tone(70, 0.25, { vol: 0.5 }); tone(1400, 0.05, { type: 'square', vol: 0.1 }); vibrate('HEAVY', 50); },
  flip(i = 0) { tone(900 + i * 90, 0.05, { type: 'triangle', vol: 0.1, delay: i * 0.03 }); },
  whoosh(d = 0.5) { if (!soundOn || !ctx) return; noise(d, { vol: 0.35, freq: 1200, q: 0.5 }); },
  boom() { noise(0.6, { vol: 0.7, freq: 180, q: 0.5 }); tone(55, 0.6, { vol: 0.6, slide: -20 }); tone(110, 0.3, { type: 'triangle', vol: 0.25 }); },
  gauge() { tone(1300, 0.03, { type: 'square', vol: 0.05 }); vibrate('LIGHT', 6); },
  fall() { noise(0.35, { vol: 0.3, freq: 600, q: 0.7 }); tone(400, 0.3, { slide: -300, vol: 0.12 }); vibrate('MEDIUM', 40); },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.22, { type: 'triangle', vol: 0.16, delay: 0.12 + i * 0.1 }));
    try { if (hapticsOn) Haptics() ? Haptics().notification({ type: 'SUCCESS' }) : navigator.vibrate?.([30, 60, 30]); } catch (e) {}
  },
  star(i) { tone(880 + i * 220, 0.15, { type: 'triangle', vol: 0.15 }); vibrate('LIGHT', 10); },
  lose() { [392, 330, 262].forEach((f, i) => tone(f, 0.25, { type: 'triangle', vol: 0.14, delay: i * 0.15 })); vibrate('HEAVY', 60); },
};
