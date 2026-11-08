'use strict';

// Sites (js/sites.js): places that orbit and have no port, seeded once per run and found one by one; and the ice run's pick
// of a rock and a water port (js/icerun.js, icePick). Plain Node, through tests/nodecontext.js, with the state and the ship stubbed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const NAMES = ['SYSTEMS', 'seedSites', 'sites', 'siteOf', 'isSite', 'atSite', 'findSite', 'foundSites', 'placeOf', 'orbitPeriod', 'orbitPos', 'travelDays', 'burnFuel'];

// A fresh state for each test: a hand signed on with Hester on day 1, the ship at Ceres with a tank of `fuel`.
function setup({ day = 40, fuel = 300 } = {}) {
  const G = { state: { day, flags: {}, systemId: 'ceres', planet: 'Ceres Station', fuel, market: {}, rumors: [], missions: [], cargo: {}, hired: { captain: 'hester', since: 1 } } };
  const api = load(['js/data.js', 'js/util.js', 'js/orbits.js', 'js/sites.js', 'js/icerun.js'],
    { G, roleSkill: () => 0, ship: () => ({ fuel, cargo: 100 }), hired: () => G.state.hired }, NAMES);
  return { G, ...api };
}

test('a run seeds three ice rocks past the Belt, the same for the same save and different for another', () => {
  const { seedSites, isSite } = setup();
  const a = seedSites(12345), b = seedSites(12345), c = seedSites(54321);
  assert.deepEqual(a, b); assert.notDeepEqual(a, c);
  const list = Object.values(a);
  assert.equal(list.length, 3);
  for (const s of list) {
    assert.ok(s.au >= 3.4 && s.au <= 4.2, `past the Belt: ${s.au}`); assert.ok(s.angle >= 0 && s.angle < 360);
    assert.match(s.name, /^[A-Z]{2}-\d{2}$/); assert.equal(s.kind, 'ice'); assert.equal(s.found, null);
    assert.equal(s.gov, 'Independent'); assert.equal(s.services.length, 0); assert.ok(isSite(s.id)); assert.equal(a[s.id], s);
  }
});

test('sites are made once on the save, placeOf finds a site or a system, and a found site is listed', () => {
  const { G, sites, placeOf, siteOf, findSite, foundSites, atSite } = setup();
  const first = sites(G.state); assert.equal(sites(G.state), first); assert.equal(G.state.sites, first);
  const id = Object.keys(first)[0];
  assert.equal(placeOf(id), first[id]); assert.equal(placeOf('mars').name, 'Mars'); assert.equal(placeOf('nowhere'), undefined); assert.equal(siteOf(G.state, 'mars'), null);
  assert.equal(foundSites(G.state).length, 0); findSite(G.state, id, 40); assert.equal(first[id].found, 40); assert.equal(foundSites(G.state).join(), id);
  assert.equal(atSite(G.state), false); G.state.systemId = id; assert.equal(atSite(G.state), true);
});
