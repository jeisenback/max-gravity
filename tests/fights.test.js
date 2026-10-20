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
  assert.deepEqual(Object.keys(r.raid), ['random', 'focus', 'drive', 'lock'], 'the guns\' policies');
  const closed = t => t.crippled + t.broke + t.standoff + t.boarded + t.lost + t.escaped + t.died;
  for (const t of Object.values(r.raid)) { assert.equal(t.n, 3); assert.equal(closed(t), 3, 'every fight ends one way, or with the hand killed'); assert.ok(t.rounds >= 3 - t.died && t.rounds <= 3 * 6, 'one to six turns a fight'); }
  for (const kind of [r.repel, r.assault]) {
    assert.ok(Object.keys(kind).length >= 10);
    for (const t of Object.values(kind)) { assert.equal(t.n, 3); assert.ok(t.rounds >= 3, 'a fight lasts more than a round'); assert.ok(t.won <= 3); }
  }
});

// The spread of the ship fight's ends (Task 7, R25). The raid before it (docs/superpowers/plans/fights-before-turn-combat.txt) was won by random play; in a
// tactics fight, random targets should do worse. A deliberate aim beats random by fifteen points or more on the good ends (crippled, broken off and escaped);
// no aim wins more than 95 times in a hundred; every end the fight has is reached by some aim; and the best aim is boarded about as often as the raid was
// (26%). The hurt rates are reported by the tool and not checked here. The lock fights started directly are left out (lock: false): the ship fights come
// first, so their figures are the same, at a fraction of the time.
test('the ship fight rewards aiming on purpose, has no sure win, reaches its ends, and the best aim is boarded as often as the raid was', async () => {
  const r = await fights({ seed: 1, n: 200, lock: false });
  assert.deepEqual(r.errors, []);
  const share = (t, k) => t[k] / t.n, good = t => share(t, 'crippled') + share(t, 'broke') + share(t, 'escaped');
  const deliberate = ['focus', 'drive', 'lock'].map(p => [p, r.raid[p]]).sort((a, b) => good(b[1]) - good(a[1]));
  const [bestName, best] = deliberate[0], rnd = r.raid.random;
  assert.ok(good(best) >= good(rnd) + 0.15, `${bestName} ${good(best).toFixed(2)} against random ${good(rnd).toFixed(2)}`);
  for (const [policy, t] of Object.entries(r.raid)) assert.ok(good(t) <= 0.95, `${policy}: ${good(t).toFixed(2)} good ends, a sure win`);
  const all = Object.values(r.raid), reached = end => all.some(t => t[end] > 0);
  for (const end of ['crippled', 'broke', 'boarded', 'standoff']) assert.ok(reached(end), `${end} is reached by some aim`);  // lost and escaped are not reached by a hauler at n 200 (the node tests in fight.test.js reach them from other ships)
  assert.ok(Math.abs(share(best, 'boarded') - 0.26) <= 0.1, `${bestName} is boarded ${share(best, 'boarded').toFixed(2)} of the time, against 0.26`);
});
