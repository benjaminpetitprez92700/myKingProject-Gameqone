// Vérifie que chaque parcours peut être gagné dans la limite de coups (recherche gloutonne en faisceau).
// Usage : node tools/verify-levels.mjs [id-du-niveau]
import { LEVELS, maxShots } from '../www/js/levels.js';
import { createSim, cloneSim, shoot, stepSim, progressAlong, onTrack, resetToRest } from '../www/js/physics.js';

const DT = 1 / 120;
function play(sim, power, angle) {
  const s = cloneSim(sim);
  shoot(s, power, angle);
  for (let i = 0; i < 120 * 8 && s.state === 'moving'; i++) stepSim(s, DT);
  if (s.state === 'fallen') resetToRest(s);
  return s;
}

function solve(level) {
  const limit = maxShots(level);
  let beam = [createSim(level)];
  for (let shot = 1; shot <= limit; shot++) {
    const cands = [];
    for (const base of beam) {
      for (const wait of level.obstacles.some(o => o.move || o.type === 'mill') ? [0, 0.35, 0.7, 1.1] : [0]) {
        const s0 = cloneSim(base); s0.t += wait;
        for (let a = 0; a < 360; a += 2) for (let p = 0.12; p <= 1.001; p += 0.04) {
          const s = play(s0, p, (a * Math.PI) / 180);
          if (s.state === 'won') return shot;
          cands.push({ s, score: progressAlong(level, s.ball.x, s.ball.y).prog });
        }
      }
    }
    cands.sort((x, y) => y.score - x.score);
    beam = []; 
    for (const c of cands) {
      if (beam.every(b => Math.hypot(b.ball.x - c.s.ball.x, b.ball.y - c.s.ball.y) > 25)) beam.push(c.s);
      if (beam.length >= 4) break;
    }
  }
  return null;
}

const only = process.argv[2];
let ok = true;
for (const list of Object.values(LEVELS)) for (const lv of list) {
  if (only && lv.id !== only) continue;
  const errs = [];
  if (!onTrack(lv, ...lv.start)) errs.push('départ hors piste');
  if (!onTrack(lv, ...lv.calot)) errs.push('calot hors piste');
  const t0 = Date.now();
  const n = errs.length ? null : solve(lv);
  if (!n) ok = false;
  console.log(`${lv.id.padEnd(12)} ${lv.name.padEnd(16)} par ${lv.par} max ${maxShots(lv)} -> ${n ? 'gagné en ' + n : 'NON RÉSOLU'} ${errs.join(', ')} (${Date.now() - t0} ms)`);
}
process.exit(ok ? 0 : 1);
