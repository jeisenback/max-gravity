'use strict';

// tools/fights.js: the fights over seeded trials. One tiny run, to check the tool still drives each fight to its end and
// reports a table of the right shape (the numbers themselves are in COMBAT.md, and are for tuning, not for a test).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { closeBrowser } = require('./helpers');
const { fights } = require('../tools/fights');

after(closeBrowser);

test('the fights tool plays the ship fight, the repel fight and the assault fight to their ends', async () => {
  const r = await fights({ seed: 1, n: 3 });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(Object.keys(r.raid), ['random', 'focus', 'drive'], 'the guns\' policies');
  const closed = t => t.crippled + t.broke + t.standoff + t.boarded + t.lost + t.escaped + t.died;
  for (const t of Object.values(r.raid)) { assert.equal(t.n, 3); assert.equal(closed(t), 3, 'every fight ends one way, or with the hand killed'); assert.ok(t.rounds >= 3 - t.died && t.rounds <= 3 * 6, 'one to six turns a fight'); }
  for (const kind of [r.repel, r.assault]) {
    assert.ok(Object.keys(kind).length >= 10);
    for (const t of Object.values(kind)) { assert.equal(t.n, 3); assert.ok(t.rounds >= 3, 'a fight lasts more than a round'); assert.ok(t.won <= 3); }
  }
});

// The spread of the ship fight's ends (Task 7, tuned against docs/superpowers/plans/fights-before-turn-combat.txt): played with random targets, each end lands within a
// tenth of the raid's share before the turn-based fight (random play: off 49%, standoff 19%, crippled 7%, to the lock 26%, none lost), and so does the share of fights
// that hurt someone (52%) and the hand (32%). A deliberate aim beats random by fifteen points or more on the good ends: crippled, broken off and escaped.
test('the ship fight\'s ends spread as the raid\'s did, and aiming on purpose beats aiming at random', async () => {
  const r = await fights({ seed: 1, n: 200, lock: false });
  assert.deepEqual(r.errors, []);
  const share = (t, k) => t[k] / t.n, near = (got, want, what) => assert.ok(Math.abs(got - want) <= 0.1, `${what}: ${got.toFixed(2)} against ${want}`);
  const rnd = r.raid.random;
  near(share(rnd, 'broke'), 0.49, 'broken off'); near(share(rnd, 'standoff'), 0.19, 'standoff'); near(share(rnd, 'crippled'), 0.07, 'crippled'); near(share(rnd, 'boarded'), 0.26, 'boarded');
  near(share(rnd, 'lost') + share(rnd, 'escaped'), 0, 'lost or escaped');
  near(share(rnd, 'anyHurt'), 0.52, 'someone hurt'); near(share(rnd, 'hand'), 0.32, 'the hand hurt');
  const good = t => share(t, 'crippled') + share(t, 'broke') + share(t, 'escaped');
  assert.ok(Math.max(good(r.raid.focus), good(r.raid.drive)) >= good(rnd) + 0.15, `focus ${good(r.raid.focus).toFixed(2)}, drive ${good(r.raid.drive).toFixed(2)} against random ${good(rnd).toFixed(2)}`);
});
