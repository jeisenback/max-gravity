'use strict';

// Orbits and burns (js/orbits.js): where each place is on a day, how far apart two places are, and the days and reaction mass a
// burn costs. These run in plain Node, with no browser: the real scripts are loaded by tests/nodecontext.js, with the game state,
// the crew and the ship stubbed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const NAMES = ['SYSTEMS', 'orbitPeriod', 'orbitPos', 'distAU', 'baseDays', 'travelDays', 'burnFuel', 'bestWindow', 'inRange'];

// A fresh game state and crew for each test. `skill` is what roleSkill(role) answers; `fuel` is the player's full tank.
function setup({ day = 1, skill = {}, flags = {}, fuel = 300 } = {}) {
  const G = { state: { day, flags, systemId: 'earth', market: {}, rumors: [], missions: [], cargo: {} } };
  const api = load(['js/data.js', 'js/util.js', 'js/orbits.js'], { G, roleSkill: role => skill[role] || 0, ship: () => ({ fuel, cargo: 100 }) }, NAMES);
  return { G, ...api, ids: Object.keys(api.SYSTEMS) };
}

const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

test('every place stays on its own orbit and is back where it began after one period', () => {
  const { SYSTEMS, orbitPeriod, orbitPos, ids } = setup();
  for (const id of ids) {
    const au = SYSTEMS[id].au, period = orbitPeriod(id);
    assert.ok(near(period, 365.25 * Math.pow(au, 1.5), 1e-6), `${id}: a period of years = au^1.5`);
    for (const day of [0, 100, 365, 1000]) {
      const p = orbitPos(id, day);
      assert.ok(near(Math.hypot(p.x, p.y), au, 1e-9), `${id} on day ${day} is ${au} au from the Sun`);
    }
    const start = orbitPos(id, 0), again = orbitPos(id, period);
    assert.ok(near(start.x, again.x, 1e-6) && near(start.y, again.y, 1e-6), `${id} is back after ${period.toFixed(1)} days`);
  }
});

test('the distance between two places swings with the date, which is what makes a launch window', () => {
  const { SYSTEMS, distAU } = setup();
  let min = Infinity, max = 0;
  for (let day = 0; day <= 800; day += 5) {
    const d = distAU('earth', 'mars', day);
    min = Math.min(min, d); max = Math.max(max, d);
    assert.ok(near(d, distAU('mars', 'earth', day)), 'the distance is the same both ways');
  }
  const a = SYSTEMS.earth.au, b = SYSTEMS.mars.au;
  assert.ok(min >= Math.abs(a - b) - 1e-9 && max <= a + b + 1e-9, 'never closer than the gap between the orbits, nor farther than their sum');
  assert.ok(min < 0.8 * max, `a window and a conjunction: ${min.toFixed(2)} to ${max.toFixed(2)} au`);
  assert.equal(distAU('earth', 'earth', 100), 0);
});

test('a burn takes longer and costs more the farther the places are apart, and takes at least a day', () => {
  const { ids, distAU, baseDays, travelDays, burnFuel } = setup();
  for (const day of [1, 200, 600]) {
    const pairs = [];
    for (const a of ids) for (const b of ids) if (a < b) pairs.push({ a, b, d: distAU(a, b, day) });
    pairs.sort((x, y) => x.d - y.d);
    for (let i = 1; i < pairs.length; i++) {
      const lo = pairs[i - 1], hi = pairs[i];
      assert.ok(baseDays(lo.a, lo.b, day) <= baseDays(hi.a, hi.b, day), `day ${day}: ${lo.a}-${lo.b} is no slower than ${hi.a}-${hi.b}`);
      assert.ok(burnFuel(lo.a, lo.b, day) <= burnFuel(hi.a, hi.b, day), `day ${day}: ${lo.a}-${lo.b} costs no more mass than ${hi.a}-${hi.b}`);
    }
  }
  const fast = setup({ skill: { pilot: 14 } });  // a pilot so good the factor would go below zero
  assert.equal(fast.travelDays('earth', 'mars', 1), 1, 'never less than one day');
  assert.ok(travelDays('earth', 'neptune', 1) > travelDays('earth', 'mars', 1));
});

test('a pilot shortens a burn, an engineer saves mass, and Rosa\'s tuning saves a tenth', () => {
  const plain = setup(), pilot = setup({ skill: { pilot: 3 } }), engineer = setup({ skill: { engineer: 4 } }), tuned = setup({ flags: { rosaTuned: true } });
  assert.ok(pilot.travelDays('earth', 'neptune', 1) < plain.travelDays('earth', 'neptune', 1), 'a pilot shortens a long burn');
  assert.ok(pilot.travelDays('earth', 'mars', 1) <= plain.travelDays('earth', 'mars', 1));
  const base = plain.burnFuel('earth', 'neptune', 1);
  assert.ok(Math.abs(engineer.burnFuel('earth', 'neptune', 1) - base * 0.8) <= 1, 'four levels of engineer take a fifth off');
  assert.ok(Math.abs(tuned.burnFuel('earth', 'neptune', 1) - base * 0.9) <= 1, 'Rosa\'s tuning takes a tenth off');
});

test('the best window is the shortest burn in the next two years, and says how long to wait', () => {
  const { G, bestWindow, travelDays } = setup({ day: 40 });
  for (const [a, b] of [['earth', 'mars'], ['earth', 'jupiter'], ['mars', 'ceres'], ['mercury', 'neptune']]) {
    const best = bestWindow(a, b);
    let shortest = travelDays(a, b);
    for (let wait = 5; wait <= 730; wait += 5) shortest = Math.min(shortest, travelDays(a, b, G.state.day + wait));
    assert.equal(best.days, shortest, `${a} to ${b}: the shortest burn in two years`);
    assert.equal(travelDays(a, b, G.state.day + best.wait), best.days, `${a} to ${b}: waiting ${best.wait} days gets it`);
    assert.ok(best.wait === 0 || (best.wait % 5 === 0 && best.wait <= 730));
    if (best.wait > 0) assert.ok(best.days < travelDays(a, b), 'it only says to wait when waiting is shorter');
  }
});

test('a place is in range when a full tank covers the burn', () => {
  const probe = setup();
  const need = probe.burnFuel('earth', 'mars');
  assert.ok(setup({ fuel: need }).inRange('earth', 'mars'), 'exactly enough');
  assert.ok(!setup({ fuel: need - 1 }).inRange('earth', 'mars'), 'a unit short');
  assert.ok(setup({ fuel: 0 }).inRange('earth', 'earth'), 'staying put needs no mass');
});
