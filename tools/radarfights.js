'use strict';

// The ship fight on the radar over many seeded trials (#1347): the rules (js/radar.js) played by cycles in plain Node, the crew at every post but the hand's,
// and the hand's post by a stated policy. The tuning tool for RADAR's numbers and the source of the targets in tests/distribution/radarfights.test.js
// (docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md, "How we know it worked"). Run it through tools/fights.js --radar.
//   node tools/fights.js --radar --seeds 1,2,3 --n 100 [--post gunner|pilot] [--level 2] [--sensors 1] [--fit accuracy,resilience]
// Report: by the hand's policy and the type she is, the good ends (crippled, broke, escaped), the lost (ran, lost), the spread of the ends, the cycles,
// the share at the cycle cap, and the median gap between the cycles that pause the fight by themselves.

const { load } = require('../tests/nodecontext');
const { answerRadar } = require('./answer');

const R = load(['js/data.js', 'js/range.js', 'js/sheet.js', 'js/handtohand.js', 'js/boarders.js', 'js/shipcombat.js', 'js/fight.js', 'js/radar.js'], { Mods: { register() {} } },
  ['FIGHT', 'RADAR', 'SHIPS', 'FOE_TYPES', 'shipSide', 'radarFight', 'radarCycle', 'radarAuto', 'radarEnd', 'radarPauses', 'radarNearest', 'radarRange', 'radarDist', 'radarDir',
    'radarNorm', 'radarUnit', 'radarOut', 'radarHull', 'radarScatter', 'radarCap']);

const GOOD = ['crippled', 'broke', 'escaped'], LOST = ['ran', 'lost'], ENDS = ['crippled', 'broke', 'escaped', 'away', 'boarded', 'ran', 'lost', 'standoff'];  // standoff: none of the named ends by the trial's own limit (the rules should never give one)
// The types she comes as, as the game meets them: a raider and a corsair far out, a navy cutter and destroyer at gun range (a patrol's stop, the short opening), a raider pair.
const TYPES = { raider: { foes: ['raider'], opening: 'long' }, corsair: { foes: ['corsair'], opening: 'long' }, cutter: { foes: ['cutter'], opening: 'short' },
  destroyer: { foes: ['destroyer'], opening: 'short' }, 'raider pair': { foes: ['raider', 'raider'], opening: 'long' } };
const seeded = seed => () => { seed = (seed + 0x6d2b79f5) >>> 0; let t = seed; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const pick = (list, rand) => list[Math.floor(rand() * list.length)];

// The hand's policies at a post: the crew's orders for the cycle in, the post's out. `random` draws each choice the post has; the fixed ones keep one habit;
// `answer` reads her shown threat (tools/answer.js answerRadar).
const POLICIES = {
  gunner: {
    random: (s, o, rand) => { const up = s.foes.map((f, i) => i).filter(i => !R.radarOut(s.foes[i])), foe = pick(up, rand) || 0; return { fire: rand() < 0.5, fc: pick(['gun', 'pdc'], rand), aim: { foe, part: pick(Object.keys(s.foes[foe].parts).concat('hull'), rand) }, pdcArc: { dir: rand() * 360, width: 30 + rand() * 150 }, torp: rand() < 0.3 ? foe : null }; },
    hull: s => { const i = Math.max(0, R.radarNearest(s)); return { fire: true, fc: 'gun', aim: { foe: i, part: 'hull' }, torp: R.radarRange(s, i + 1) <= R.RADAR.JINK ? i : null }; },
    lock: s => { const i = Math.max(0, R.radarNearest(s)); return { fire: true, fc: 'gun', aim: { foe: i, part: s.foes[i].parts.lock.hp > 0 ? 'lock' : 'hull' }, torp: null }; },
    pdc: s => { const i = Math.max(0, R.radarNearest(s)); return { fire: true, fc: 'pdc', aim: { foe: i, part: 'hull' }, pdcArc: { dir: R.radarDir(s.ships[0].p, s.ships[i + 1].p), width: 90 }, torp: null }; },
    answer: (s, o) => answerRadar(s, 'gunner', o, R),
  },
  pilot: {
    random: (s, o, rand) => ({ burn: rand() < 0.2 ? null : { dir: rand() * 360, throttle: rand() }, turnTo: rand() < 0.5 ? rand() * 360 : null }),
    hold: (s, o) => ({ burn: o.burn, turnTo: o.turnTo }),  // the order's own plot, never off it
    close: s => { const i = Math.max(0, R.radarNearest(s)), to = R.radarDir(s.ships[0].p, s.ships[i + 1].p); return R.radarRange(s, i + 1) > 6 ? { burn: { dir: to, throttle: 1 }, turnTo: null } : { burn: null, turnTo: to }; },
    answer: (s, o) => answerRadar(s, 'pilot', o, R),
  },
};

// One fight to its end: the crew's orders each cycle at `crew` level, the hand's post by the policy at `level` (a pilot's burn lands by the hand's scatter).
// Returns its end, cycles and the cycles that paused it by themselves.
function radarTrial({ type, post, policy, level = 2, crew = 2, sensors = 1, fit = {}, rand }) {
  const t = TYPES[type], me = R.shipSide({ ...R.SHIPS.freighter, dmgMult: 1, pdc: true, launcher: true }, { skill: crew, launcher: true, torps: 2 });
  const foes = t.foes.map(id => R.shipSide({ dmgMult: 1, ...R.SHIPS[id] }, { ...R.FOE_TYPES[id], torps: (R.FOE_TYPES[id] || {}).torps || 0 }));
  let s = R.radarFight({ me, foes, nerve: 3, types: t.foes, opening: t.opening, fit, sensors, rand });
  const levels = { pilot: crew, gunner: crew, engineer: crew, comms: crew, [post]: level }, play = POLICIES[post][policy], paused = [];
  for (let k = 0; k < 4 * R.RADAR.TURNS; k++) {
    const end = R.radarEnd(s);
    if (end) return { end, cycles: s.cycle, paused, capped: s.cycle >= R.radarCap(s) };
    const crewOrders = R.radarAuto(s, levels, rand), mine = play(s, crewOrders, rand);
    if (post === 'pilot' && mine.burn) mine.burn = R.radarScatter(mine.burn, level, rand);
    const was = s, r = R.radarCycle(s, { ...crewOrders, ...mine, level: post === 'gunner' ? level : crewOrders.level }, rand);
    s = r.state;
    if (R.radarPauses(was, s, r.events).length) paused.push(s.cycle);
  }
  return { end: 'standoff', cycles: s.cycle, paused, capped: true };
}

// A seed's trials: `n` fights of each type for each policy at the post. Returns tallies by `policy|type`, to be summed over seeds.
function radarFights({ seed = 1, n = 100, post = 'gunner', level = 2, crew = 2, sensors = 1, fit = {}, policies = Object.keys(POLICIES[post]), types = Object.keys(TYPES) } = {}) {
  const out = {};
  for (const policy of policies) for (const type of types) {
    const rand = seeded(seed * 1000 + policies.indexOf(policy) * 50 + types.indexOf(type)), t = out[`${policy}|${type}`] = { n: 0, cycles: 0, capped: 0, gaps: [] };
    for (let k = 0; k < n; k++) {
      const f = radarTrial({ type, post, policy, level, crew, sensors, fit, rand });
      t.n++; t[f.end] = (t[f.end] || 0) + 1; t.cycles += f.cycles;
      if (f.capped) t.capped++;
      for (let j = 1; j < f.paused.length; j++) t.gaps.push(f.paused[j] - f.paused[j - 1]);
    }
  }
  return out;
}

// Sums the seeds' tallies, and adds each row's good and lost ends and its median pause gap.
function radarSum(runs) {
  const acc = {};
  for (const r of runs) for (const [k, t] of Object.entries(r)) {
    const a = acc[k] = acc[k] || { n: 0, cycles: 0, capped: 0, gaps: [] };
    for (const [f, v] of Object.entries(t)) if (f === 'gaps') a.gaps.push(...v); else a[f] = (a[f] || 0) + v;
  }
  for (const t of Object.values(acc)) {
    t.goodRate = GOOD.reduce((x, e) => x + (t[e] || 0), 0) / t.n; t.lostRate = LOST.reduce((x, e) => x + (t[e] || 0), 0) / t.n;
    const g = [...t.gaps].sort((a, b) => a - b); t.medianGap = g.length ? g[Math.floor(g.length / 2)] : Infinity;
  }
  return acc;
}
// Over every type, each policy's row.
const radarOverall = (sum, policy) => {
  const rows = Object.entries(sum).filter(([k]) => k.split('|')[0] === policy).map(([, t]) => t), n = rows.reduce((x, t) => x + t.n, 0);
  return { n, goodRate: rows.reduce((x, t) => x + t.goodRate * t.n, 0) / n, lostRate: rows.reduce((x, t) => x + t.lostRate * t.n, 0) / n, capped: rows.reduce((x, t) => x + t.capped, 0) / n };
};

const pc = x => `${String(Math.round(100 * x)).padStart(3)}%`;
function radarReport(runs, { post }) {
  const sum = radarSum(runs), policies = [...new Set(Object.keys(sum).map(k => k.split('|')[0]))];
  console.log(`Radar fights (${runs.length} seeds), the hand at the ${post} post, by policy and the type she is`);
  for (const type of Object.keys(TYPES)) {
    console.log(`  against ${type === 'raider pair' ? 'a raider pair' : `a ${type}`}`);
    for (const p of policies) {
      const t = sum[`${p}|${type}`]; if (!t) continue;
      console.log(`    ${p.padEnd(7)} n ${String(t.n).padStart(4)}  good ${pc(t.goodRate)}  lost ${pc(t.lostRate)}  cycles ${(t.cycles / t.n).toFixed(1).padStart(5)}  at cap ${pc(t.capped / t.n)}  pause gap ${t.medianGap}  ${ENDS.map(e => `${e} ${pc((t[e] || 0) / t.n)}`).join(' ')}`);
    }
  }
  console.log('  over every type');
  for (const p of policies) { const o = radarOverall(sum, p); console.log(`    ${p.padEnd(7)} n ${String(o.n).padStart(4)}  good ${pc(o.goodRate)}  lost ${pc(o.lostRate)}  at cap ${pc(o.capped)}`); }
}

module.exports = { radarTrial, radarFights, radarSum, radarOverall, radarReport, POLICIES, TYPES, GOOD, LOST, R };
