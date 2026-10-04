'use strict';

// Old saves: the files in tests/fixtures/ are plain save data, loaded the way a player's would be (Import, then Load game, which
// runs migrate()). Add a file here whenever the save's shape changes in a way an old save must survive.
//   empty-save.json  the fewest fields Import accepts: credits and systemId. migrate() fills every other top-level field from
//                    stateDefaults() (game.js). (Before #252 this passed Import and then threw on load.)
//   v1-save.json     the first shape a save had (newState() in the first commit that has one): no v, no captain, no hired, no cast.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const FIXTURES = ['empty-save.json', 'v1-save.json'].map(name => ({ name, text: fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8') }));

for (const scope of ['earth-hired', 'full']) {
  test(`an old save loads and plays in the ${scope} build`, async () => {
    const { ev, done } = await open({ scope });
    const results = await ev(fixtures => {
      const out = {};
      for (const { name, text } of fixtures) {
        const refused = Saves.import(text, 2);
        Saves.use(2); loadGame();
        for (let i = 0; i < 3; i++) { update(0.05); render(); }
        UI.openLanded(currentPlanet(), []);
        for (const tab of ['port', 'trade', 'crew', 'bar']) { UI.tab = tab; UI.render(); }
        const st = G.state;
        const want = stateDefaults(), own = migrate(JSON.parse(text));
        out[name] = {
          refused, mode: G.mode, v: st.v, current: SAVE_VERSION,
          missing: Object.keys(want).filter(k => st[k] === undefined || own[k] === undefined),
          wrongType: Object.keys(want).filter(k => want[k] !== null && (typeof st[k] !== typeof want[k] || Array.isArray(st[k]) !== Array.isArray(want[k]))),
        };
      }
      return out;
    }, FIXTURES);
    for (const { name } of FIXTURES) {
      const r = results[name];
      assert.equal(r.refused, null, `${name}: Import accepts it`);
      assert.equal(r.mode, 'landed', `${name}: it loads docked`);
      assert.equal(r.v, r.current, `${name}: migrate() brings it to the current version`);
      assert.deepEqual(r.missing, [], `${name}: every field of stateDefaults() is there after migrate()`);
      assert.deepEqual(r.wrongType, [], `${name}: and each is the kind of thing the default is`);
    }
    await done();
  });
}
