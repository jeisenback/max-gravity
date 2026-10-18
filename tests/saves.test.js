'use strict';

// Old saves: the files in tests/fixtures/ are plain save data, loaded the way a player's would be (Import, then Load game, which
// runs migrate()). Add a file here whenever the save's shape changes in a way an old save must survive.
//   empty-save.json  the fewest fields Import accepts: credits and systemId. migrate() fills every other top-level field from
//                    stateDefaults() (game.js). (Before #252 this passed Import and then threw on load.)
//   v1-save.json     the first shape a save had (newState() in the first commit that has one): no v, no captain, no hired, no cast.
//   v3-hired-save.json  a hired-hand game at the current version (see FIXTURES below for what it holds).
//   bad-shape-save.json  fields of the wrong kind (a string for the missions, a number for the people, a list for the flags; a string for the captain and the home, a number for the memorial): migrate() puts the default back or drops the field, so the slot still opens (#576, #749).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// v3-hired-save.json is a hired-hand game of version 3 (the Hester Vance captain, four runs, a captain's scene seen, a hurt crew member), played in the narrow build and saved as it was. Add a fixture
// when stateDefaults() or setupHired() gains a field, so a save from before it still loads (#569).
const FIXTURES = ['empty-save.json', 'v1-save.json', 'v3-hired-save.json', 'bad-shape-save.json'].map(name => ({ name, text: fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8') }));

for (const scope of ['earth-hired', 'full']) {
  test(`an old save loads and plays in the ${scope} build`, async () => {
    const { ev, done } = await open({ scope });
    const results = await ev(fixtures => {
      const out = {};
      for (const { name, text } of fixtures) {
        const refused = Saves.import(text, 2);
        Saves.use(2); loadGame();
        const hs = G.state.hired, people = G.state.people;
        const chapter = hs ? { post: hs.post, captainKey: hs.captainKey, runs: hs.runsDone, ledger: hs.ledger.length, beats: hs.beats, captain: `${people[hs.captain].first} ${people[hs.captain].last}`,
          aboard: G.state.crew.map(id => people[id].cast || people[id].role), cast: Object.keys(G.state.cast), injured: Object.keys(G.state.injured) } : null;
        for (let i = 0; i < 3; i++) { update(0.05); render(); }
        UI.openLanded(currentPlanet(), []);
        for (const tab of ['port', 'trade', 'crew', 'bar']) { UI.tab = tab; UI.render(); }
        const st = G.state;
        const want = stateDefaults(), own = migrate(JSON.parse(text));
        out[name] = {
          refused, mode: G.mode,
          chapter,
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
      assert.deepEqual(r.missing, [], `${name}: every field of stateDefaults() is there after migrate()`);
      assert.deepEqual(r.wrongType, [], `${name}: and each is the kind of thing the default is`);
    }
    // The chapter survives the load: who the hand is, whose ship it is, how far they got and who is aboard.
    assert.deepEqual(results['v3-hired-save.json'].chapter, { post: 'gunner', captainKey: 'hester', runs: 4, ledger: 4, beats: 1, captain: 'Hester Vance',
      aboard: ['ines', 'tomas', 'slicer', 'cato', 'quartermaster', 'medic', 'cook', 'icehand', 'icehand'], cast: ['ines', 'tomas', 'cato'], injured: [] });  // Tomas is hurt in the file (checked below); the port's clinic treats him when the save lands
    assert.deepEqual(Object.keys(JSON.parse(FIXTURES.find(f => f.name === 'v3-hired-save.json').text).injured), ['c:tomas'], 'the fixture holds a hurt crew member');
    assert.equal(results['empty-save.json'].chapter, null, 'an owner save has no chapter');
    await done();
  });
}
