'use strict';

// Sites (js/sites.js): places that orbit and have no port, seeded once per run and found one by one; and the ice run's pick
// of a rock and a water port (js/icerun.js, icePick). Plain Node, through tests/nodecontext.js, with the state and the ship stubbed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const NAMES = ['SYSTEMS', 'seedSites', 'sites', 'siteOf', 'isSite', 'atSite', 'findSite', 'foundSites', 'placeOf', 'orbitPeriod', 'orbitPos', 'travelDays', 'burnFuel', 'icePick', 'replaceSite', 'WRECK_TYPE_IDS', 'WRECKS', 'ROCKS'];

// A fresh state for each test: a hand signed on with Hester on day 1, the ship at Ceres with a tank of `fuel`.
function setup({ day = 40, fuel = 300 } = {}) {
  const G = { state: { day, flags: {}, systemId: 'ceres', planet: 'Ceres Station', fuel, market: {}, rumors: [], missions: [], cargo: {}, hired: { captain: 'hester', since: 1 } } };
  const api = load(['js/data.js', 'js/util.js', 'js/orbits.js', 'js/sites.js', 'js/icerun.js', 'js/salvage.js'],
    { G, Mods: { register() {}, on() {} }, roleSkill: () => 0, ship: () => ({ fuel, cargo: 100 }), hired: () => G.state.hired }, NAMES);
  return { G, ...api };
}

const plain = o => JSON.parse(JSON.stringify(o));  // a value out of the script's context, so deepEqual compares across contexts
const iceIds = (st, sites) => Object.keys(sites(st)).filter(id => st.sites[id].kind === 'ice');

test('a run seeds three ice rocks in the outer Belt, the same for the same save and different for another', () => {
  const { seedSites, isSite } = setup();
  const a = seedSites(12345), b = seedSites(12345), c = seedSites(54321);
  assert.deepEqual(a, b); assert.notDeepEqual(a, c);
  const list = Object.values(a);
  assert.equal(list.length, 3);
  for (const s of list) {
    assert.ok(s.au >= 3.0 && s.au <= 3.8, `the outer Belt: ${s.au}`); assert.ok(s.angle >= 0 && s.angle < 360);
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

test('the pick takes the found rock, else the nearest, and a water port the tank reaches from it, both legs counted', () => {
  const { G, sites, icePick, findSite, travelDays, burnFuel } = setup({ fuel: 400 });
  const st = G.state, ids = iceIds(st, sites), price = (pl, g) => (g === 'water' && pl.name === 'Mars' ? 1200 : 500);
  const fns = { price, travelDays, burnFuel };
  const nearest = ids.slice().sort((a, b) => travelDays('ceres', a) - travelDays('ceres', b))[0];
  const p = icePick(st, 'ceres', 400, fns);
  assert.equal(p.site, nearest); assert.equal(p.sid, 'mars'); assert.equal(p.planet, 'Mars');
  assert.equal(p.days, travelDays('ceres', p.site) + 3 + travelDays(p.site, 'mars', st.day + travelDays('ceres', p.site) + 3), 'out, the shifts, and home on the day it burns');
  findSite(st, ids[2], 1); assert.equal(icePick(st, 'ceres', 400, fns).site, ids[2], 'a found rock is the pick');
  const short = icePick(st, 'ceres', burnFuel('ceres', ids[2]) + 1, fns); assert.ok(!short || short.site !== ids[2], 'the tank must cover the leg home too, or the pick is another rock');
  assert.equal(icePick(st, 'ceres', 400, { ...fns, price: () => 500 }), null, 'no port dear enough, no run');
});

// #979: a found rock out of range falls back to the nearest in range, and the leg home is judged on the day it burns. The fuel and the days are
// stubbed, since the real geometry from the Belt leaves no tank that reaches one rock both ways and not another.
test('a found rock out of range gives way to the nearest in range, and the home leg\'s fuel is counted on the day it burns', () => {
  const { G, sites, icePick, findSite } = setup({ fuel: 400 });
  const st = G.state, ids = iceIds(st, sites), [far, near, other] = ids, price = (pl, g) => (g === 'water' && pl.name === 'Mars' ? 1200 : 500);
  const travelDays = (a, b) => (b === near || a === near ? 4 : 6), burnFuel = (a, b, day) => (b === far || a === far ? 500 : 50 + (day === undefined ? 0 : day));
  findSite(st, far, 1);
  const p = icePick(st, 'ceres', 400, { price, travelDays, burnFuel });
  assert.ok(p, 'a pick'); assert.notEqual(p.site, far, 'the found rock out of range is not the pick'); assert.equal(p.site, near, 'the nearest in range is');
  assert.equal(p.homeFuel, 50 + st.day + 4 + 3, 'the leg home is priced on its own day: out plus the shifts');
  assert.equal(p.days, 4 + 3 + 4);
  void other;
});

// #965: wrecks and rocks, the co-op's salvage and survey sites, are seeded beside the ice rocks without moving them, and replaced when used up.
test('a run has six wrecks and three rocks between 2.2 and 3.6 AU, the same for a save and different for another', () => {
  const a = setup(), b = setup(), c = setup();
  c.G.state.hired.captain = 'cato';
  const sa = a.sites(a.G.state), sb = b.sites(b.G.state), sc = c.sites(c.G.state);
  assert.deepEqual(plain(sa), plain(sb)); assert.notDeepEqual(plain(sa), plain(sc));
  const of = kind => Object.values(sa).filter(s => s.kind === kind);
  assert.equal(of('wreck').length, a.WRECKS); assert.equal(a.WRECKS, 6);
  assert.equal(of('rock').length, a.ROCKS); assert.equal(a.ROCKS, 3);
  for (const s of [...of('wreck'), ...of('rock')]) {
    assert.ok(s.au >= 2.2 && s.au <= 3.6, `${s.id} at ${s.au}`); assert.equal(s.found, null); assert.equal(s.gen, 0);
    assert.ok(a.isSite(s.id)); assert.ok(s.angle >= 0 && s.angle < 360); assert.ok(s.name);
  }
  const wrecks = of('wreck').map(s => s.id);
  for (const s of of('wreck')) {
    const w = s.wreck;
    assert.ok(a.WRECK_TYPE_IDS.includes(w.type), w.type); assert.equal(w.name, s.name);
    assert.ok(w.find >= 1 && w.find <= 3); assert.equal(w.cut, 0);
    assert.ok(w.lead === null || (wrecks.includes(w.lead) && w.lead !== s.id), `lead ${w.lead}`);
    if (w.lead) assert.ok(w.leadAt >= 1 && w.leadAt <= 3);
  }
});

test('a save made before wrecks gains them, and its ice rocks do not move', () => {
  const { G, sites, seedSites } = setup();
  const ice = seedSites(12345); G.state.sites = JSON.parse(JSON.stringify(ice));
  const all = sites(G.state);
  for (const id of Object.keys(ice)) assert.deepEqual(plain(all[id]), plain(ice[id]));
  assert.equal(Object.values(all).filter(s => s.kind === 'wreck').length, 6);
  assert.equal(Object.values(all).filter(s => s.kind === 'rock').length, 3);
});

test('a used-up site is replaced by a new one, unfound, and the others stay', () => {
  const { G, sites, replaceSite, findSite } = setup();
  const st = G.state, all = sites(st), id = 'site:wreck-2', before = JSON.parse(JSON.stringify(all));
  findSite(st, id, 40); all[id].wreck.cut = 3;
  const s = replaceSite(st, id);
  assert.equal(s, st.sites[id]); assert.equal(s.gen, 1); assert.equal(s.found, null); assert.equal(s.wreck.cut, 0);
  assert.ok(s.name !== before[id].name || s.au !== before[id].au);
  for (const k of Object.keys(before)) if (k !== id) assert.deepEqual(plain(st.sites[k]), before[k]);
  assert.equal(replaceSite(st, 'site:rock-1').gen, 1);
});
