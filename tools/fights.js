'use strict';

// The fight tool: the fights over many seeded trials, in plain Node. The deck fight on the deck plan (tools/planfights.js, #1354; the only deck fight since
// #1355) by default, the ship fight on the radar (tools/radarfights.js, #1347) with --radar. The tuning tool for COMBAT.md's numbers (PLAN in js/deckplan.js,
// RADAR in js/radar.js). Not part of `npm test`; the targets are tests/distribution/deckplanfights.test.js and radarfights.test.js.
//   node tools/fights.js [--plan] [--seeds 1,2,3,4] [--n 400] [--set KEY=value,...]  --set tries a number of PLAN's for the run
//   node tools/fights.js --radar --seeds 1,2,3 --n 100 [--post gunner|pilot] [--level 2] [--sensors 1] [--fit accuracy,resilience] [--set KEY=value,...]
//   npm run fights

if (require.main === module && !process.argv.includes('--radar')) {  // the deck fight on the deck plan, in plain Node (tools/planfights.js, #1354)
  const P = require('./planfights');
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  for (const kv of (arg('set') || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); P.R.PLAN[k] = JSON.parse(v); }  // --set KEY=value,...: try a number of PLAN's for this run
  const seeds = (arg('seeds') || '1,2,3,4').split(',').map(Number), n = Number(arg('n') || 100);
  P.planReport(P.sumRuns(seeds.map(seed => P.planFights({ seed, n, cells: P.planCells() }))));
} else if (require.main === module && process.argv.includes('--radar')) {  // the fight on the radar, in plain Node (tools/radarfights.js)
  const { radarFights, radarReport } = require('./radarfights');
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1,2,3').split(',').map(Number), post = arg('post') || 'gunner';
  const fit = Object.fromEntries((arg('fit') || '').split(',').filter(Boolean).map(k => [k, true]));
  const o = { n: Number(arg('n') || 100), post, level: Number(arg('level') || 2), sensors: Number(arg('sensors') || 1), fit };
  for (const kv of (arg('set') || '').split(',').filter(Boolean)) { const [k, v] = kv.split('='); require('./radarfights').R.RADAR[k] = JSON.parse(v); }  // --set KEY=value,...: try a number of RADAR's for this run
  radarReport(seeds.map(seed => radarFights({ ...o, seed })), o);
}
