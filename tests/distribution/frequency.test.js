'use strict';

// Distribution check: a color scene's weight and how often pickStorylet draws it (#341, npm run soak). Not part of `npm test`: it depends on a
// spread over many random draws. The pins (weight 1 and equal weights draw as before, a scene off or at weight 0 is never drawn, a cooldown
// holds) are in tests/overrides.test.js; how the editor's simulator is made is in tests/editorfreq.test.js.
//
// Sample:    4000 draws of pickStorylet('transit') in a fresh game, for each of weight 1 (the shipped game) and weight 8 for one scene.
// Tolerance: at weight 8 the scene comes up at least twice as often as at weight 1 (the expected share goes from 1 in the number of scenes
//            drawn from, to 8 in that number plus 7), and at weight 0 not once.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('../helpers');

after(closeBrowser);

test('a higher weight makes a color scene come up more often in the draw, and weight 0 never', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.day = 30;
    const pool = STORYLETS.filter(s => s.where === 'transit' && !s.chained && !(s.once && quality(`seen:${s.id}`)) && meets(sceneView(s).when));
    const id = pool.find(s => !s.priority).id;
    const share = weight => {
      useOverrides({ [id]: { weight } });
      let n = 0;
      for (let i = 0; i < 4000; i++) { const s = pickStorylet('transit'); if (s && s.id === id) n++; }
      return n;
    };
    const out = { pool: pool.length, one: share(1), eight: share(8), zero: share(0) };
    useOverrides({});
    return out;
  });
  await done();
  assert.ok(r.pool >= 3, `${r.pool} scenes to draw from`);
  assert.ok(r.eight >= r.one * 2, `weight 8 came up ${r.eight} times in 4000 draws, weight 1 ${r.one} (from ${r.pool} scenes)`);
  assert.equal(r.zero, 0, 'weight 0');
});
