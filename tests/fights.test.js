'use strict';

// tools/fights.js: the fight tool, the deck fight on the deck plan over seeded trials (tools/planfights.js, in plain Node). One tiny run, to check the tool still
// plays each cell to its end and reports a table of the right shape. The targets the fights are tuned to (many seeds of them) are checked in the soak,
// tests/distribution/deckplanfights.test.js (#753, #1355).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const P = require('../tools/planfights');

test('the fights tool plays the repel and the boarding on the deck plan to their ends', () => {
  const r = P.planFights({ seed: 1, n: 3, cells: P.planCells() });
  const cells = Object.entries(r);
  assert.ok(cells.some(([k]) => k.startsWith('repel ')) && cells.some(([k]) => k.startsWith('assault ')), 'both ways');
  for (const [k, t] of cells) {
    assert.equal(t.n, 3, k);
    assert.ok(t.rounds >= 3, `${k}: a fight lasts more than a turn`);
    assert.ok(t.won + (t.taken || 0) + (t.searched || 0) === 3, `${k}: every fight ends`);
  }
});
