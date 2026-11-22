'use strict';

// tools/fights.js: the deck fights over seeded trials. One tiny run, to check the tool still drives each fight to its end and
// reports a table of the right shape. The targets the fights are tuned to (many seeds of them) are checked in the soak, tests/distribution/fights.test.js (#753).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { fights } = require('../tools/fights');

after(closeBrowser);

test('the fights tool plays the repel fight and the assault fight to their ends', async () => {
  const r = await fights({ seed: 1, n: 3 });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(Object.keys(r).filter(k => ['raid', 'match'].includes(k)), [], 'the ship fight is the radar\'s tool\'s (tools/radarfights.js)');
  for (const kind of [r.repel, r.assault]) {
    assert.ok(Object.keys(kind).length >= 10);
    for (const t of Object.values(kind)) { assert.equal(t.n, 3); assert.ok(t.rounds >= 3, 'a fight lasts more than a round'); assert.ok(t.won <= 3); }
  }
});
