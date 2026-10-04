'use strict';

// Old saves: the files in tests/fixtures/ are plain save data, loaded the way a player's would be (Import, then Load game, which
// runs migrate()). Add a file here whenever the save's shape changes in a way an old save must survive.
//   empty-save.json  the fewest fields the game loads today: credits, day, systemId, cargo, rumors, missions. Everything else is
//                    filled in by migrate() or the game. (Credits and systemId alone pass Import and then throw on load, which is
//                    what #252, the save shape written once, is for.)
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
        out[name] = { refused, mode: G.mode, v: st.v, current: SAVE_VERSION, filled: ['crew', 'flags', 'people', 'rep', 'outfits', 'market', 'story'].every(k => st[k] !== undefined) };
      }
      return out;
    }, FIXTURES);
    for (const { name } of FIXTURES) {
      const r = results[name];
      assert.equal(r.refused, null, `${name}: Import accepts it`);
      assert.equal(r.mode, 'landed', `${name}: it loads docked`);
      assert.equal(r.v, r.current, `${name}: migrate() brings it to the current version`);
      assert.ok(r.filled, `${name}: migrate() fills the fields a newer game expects`);
    }
    await done();
  });
}
