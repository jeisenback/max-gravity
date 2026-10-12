'use strict';

// The scene report of tools/soak.js --scenes (#512): a storylet is found by its id, any other scene by its title, a scene the narrow build leaves out is not counted,
// and the report is the same for the same plays. The soak itself is not part of npm test (it plays whole chapters); this checks the report on made-up plays.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { scenesReport } = require('../tools/soak');

const rows = [
  { id: 'port-a', title: 'Alpha', off: false, storylet: true },
  { id: 'port-b', title: 'Beta', off: false, storylet: true },
  { id: 'port-c', title: 'Gamma', off: true, storylet: true },
  { id: 'cast:x:intro', title: 'Intro', off: false, storylet: false },
  { id: 'cast:y:intro', title: 'Intro', off: false, storylet: false },
  { id: 'cast:z:late', title: 'Late', off: false, storylet: false },
];
const runs = [
  { seed: 1, byId: { 'port-a': 3 }, byTitle: { Intro: 1, 'Drawn Title': 2 } },
  { seed: 2, byId: { 'port-a': 1 }, byTitle: { Intro: 1 } },
];

test('the report lists each scene the narrow build keeps with its plays, the ones that never played, the largest shares, and what the index does not list', () => {
  const out = scenesReport(runs, rows, 40, 2);
  assert.match(out[0], /^scenes: 8 plays over 2 seeds \(1, 2\), up to 40 legs each/);
  assert.ok(out.includes('5 scenes in the narrow build (1 left out of it are not counted):'));
  assert.ok(out.includes('  port-a  Alpha: 4 plays, 2 of 2 seeds'));
  assert.ok(out.includes('  port-b  Beta: 0 plays, 0 of 2 seeds'));
  assert.ok(out.includes('  cast:x:intro  Intro (title shared): 2 plays, 2 of 2 seeds'), 'a scene that is not a storylet is matched by its title, and says so when others share it');
  assert.ok(!out.some(l => l.includes('port-c')), 'a scene the narrow build leaves out is not listed');
  assert.ok(out.includes('never played in this sample: 2 of 5'));
  assert.ok(out.includes('  port-b  Beta') && out.includes('  cast:z:late  Late'));
  const share = out.slice(out.indexOf('largest share of all plays:') + 1, out.indexOf('largest share of all plays:') + 3);
  assert.deepEqual(share, ['  Alpha (port-a): 4 plays, 50 percent, 2 of 2 seeds', '  Drawn Title: 2 plays, 25 percent, 1 of 2 seeds'], 'a tie is broken by the key, so the order is the same each time');
  assert.equal(out.at(-1), 'played but not listed in the index: 1 (Drawn Title)');
  assert.deepEqual(scenesReport(runs, rows, 40, 2), out, 'the same plays give the same report');
});
