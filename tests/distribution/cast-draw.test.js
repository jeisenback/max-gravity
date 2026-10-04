'use strict';

// Distribution checks: how the two main characters are drawn (npm run soak). Not part of `npm test`: both depend on a spread
// over many random draws, so a new random draw anywhere can move them. The pins (a draw is two different people, the pair drawn
// is the pair aboard and is kept) are in tests/castpool.test.js.
//
// Sample:    300 draws for the first check; 12 seeded games (seeds 1 to 12) for the second.
// Tolerance: every character in the pool comes up more than 20 times in 300 draws (the expected count is about 100 or more, so
//            this only catches a character who can no longer be drawn); 12 games give at least 4 different pairs, and not
//            every pair is Ines and Tomas.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('../helpers');

after(closeBrowser);

test('every main character in the pool comes up in the draw', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    const seen = {};
    for (let i = 0; i < 300; i++) { const [a, b] = realDrawCastPair(); seen[a] = (seen[a] || 0) + 1; seen[b] = (seen[b] || 0) + 1; }
    return { seen, pool: castPool() };
  });
  for (const k of r.pool) assert.ok(r.seen[k] > 20, `${k} comes up (${r.seen[k]})`);
  await done();
});

test('twelve hired games give at least four different pairs, and an Earth start is not always Ines and Tomas', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    window.drawCastPair = realDrawCastPair;
    const pairs = new Set();
    for (let i = 0; i < 12; i++) {
      __seed(i + 1);
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent();
      pairs.add([...G.state.castPair].join('+'));
    }
    return { pairs: pairs.size, notEarth: [...pairs].some(p => !/ines|tomas/.test(p)) };
  });
  assert.ok(r.pairs >= 4, `${r.pairs} different pairs in 12 games`);
  assert.ok(r.notEarth, 'an earth start is not always Ines and Tomas');
  await done();
});
