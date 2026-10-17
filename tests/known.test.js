'use strict';

// What the captain knows of prices away from here (js/known.js): the market she is docked at as it is, a port she has word of as
// the rumor says, a port she has sailed from at the prices she saw, and any other at what it usually pays. Plain Node, no browser.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const same = (a, b, msg) => assert.equal(JSON.stringify(a), JSON.stringify(b), msg);  // objects from the bare context are another realm's, so no deepEqual

const NAMES = ['usualPrice', 'currentRumor', 'priceBasis', 'knownPrice', 'recordPrices', 'basisText', 'price', 'SYSTEMS', 'PRICE_MULT', 'COMMODITIES'];

function setup({ day = 10, rumors = [], market = {}, seen = {} } = {}) {
  const G = { state: { day, flags: {}, systemId: 'earth', market, rumors, missions: [], cargo: {}, hired: { seen } } };
  const api = load(['js/data.js', 'js/util.js', 'js/orbits.js', 'js/market.js', 'js/known.js'], { G, Mods: { filter: (n, v) => v, emit() {} }, roleSkill: () => 0, ship: () => ({ fuel: 300, cargo: 100 }) }, NAMES);
  const planets = Object.values(api.SYSTEMS).flatMap(s => s.planets), trades = planets.filter(p => p.prices && p.prices.water);
  return { st: G.state, planets, far: trades[1], ...api };
}

test('the market here is known as it is, and a port she has no word of at what it usually pays', () => {
  const { st, far, knownPrice, price, usualPrice, priceBasis, PRICE_MULT, COMMODITIES } = setup({ market: { [`${'X'}|water`]: { p: 0, day: 1 } } });
  st.market[`${far.name}|water`] = { p: 0.3, day: 1 };  // pressure here moves the real price, not the usual one
  assert.equal(knownPrice(st, far, 'water', true), price(far, 'water'));
  assert.equal(knownPrice(st, far, 'water', false), usualPrice(far, 'water'));
  assert.equal(usualPrice(far, 'water'), Math.round(COMMODITIES.find(c => c.id === 'water').base * PRICE_MULT[far.prices.water]));
  assert.notEqual(knownPrice(st, far, 'water', false), price(far, 'water'), 'the pressure she has not seen is not in her figure');
  same(priceBasis(st, far, 'water', false), { kind: 'usual' }); same(priceBasis(st, far, 'water', true), { kind: 'here' });
});

test('a current rumor moves the usual price as it says, an expired one does not, and a rumor beats a sighting', () => {
  const { st, far, knownPrice, usualPrice, priceBasis, recordPrices } = setup({ rumors: [] });
  recordPrices(st.hired, far, 2);
  st.rumors.push({ planet: far.name, cid: 'water', mult: 1.5, until: 20 });
  assert.equal(knownPrice(st, far, 'water', false), Math.round(usualPrice(far, 'water') * 1.5));
  same(priceBasis(st, far, 'water', false), { kind: 'rumor' });
  st.rumors[0].until = 9;
  same(priceBasis(st, far, 'water', false), { kind: 'seen', days: 8 }, 'expired: back to what she saw');
});

test('sailing from a port records its prices, with the day, and she plans on them until a rumor or a new visit', () => {
  const { st, far, knownPrice, price, priceBasis, recordPrices, basisText } = setup();
  st.market[`${far.name}|water`] = { p: -0.2, day: 1 };
  recordPrices(st.hired, far, 4);
  assert.equal(st.hired.seen[far.name].day, 4); assert.equal(st.hired.seen[far.name].prices.water, price(far, 'water'));
  assert.ok(Object.keys(st.hired.seen[far.name].prices).every(cid => far.prices[cid]), 'every good the port trades, and no other');
  st.market[`${far.name}|water`] = { p: 0.4, day: 5 };  // the market moved since: she does not know
  assert.equal(knownPrice(st, far, 'water', false), st.hired.seen[far.name].prices.water);
  same(priceBasis(st, far, 'water', false), { kind: 'seen', days: 6 });
  assert.equal(basisText({ kind: 'seen', days: 6 }, far.name), `the prices she saw at ${far.name} 6 days ago`);
  assert.equal(basisText({ kind: 'seen', days: 1 }, far.name), `the prices she saw at ${far.name} a day ago`);
  assert.equal(basisText({ kind: 'rumor' }, 'Ceres Station'), 'word of the market at Ceres Station'); assert.equal(basisText({ kind: 'usual' }, 'Mars'), 'what Mars usually pays'); assert.equal(basisText({ kind: 'here' }, 'Mars'), '');
});

test('a good a port does not trade, or a port with no market, is no price at all', () => {
  const { st, planets, knownPrice, usualPrice, recordPrices } = setup();
  const noMarket = planets.find(p => !p.prices), trades = planets.find(p => p.prices), notSold = Object.keys(trades.prices).length ? 'nosuchgood' : 'water';
  assert.equal(knownPrice(st, trades, notSold, false), null); assert.equal(usualPrice(trades, notSold), null);
  if (noMarket) { assert.equal(knownPrice(st, noMarket, 'water', false), null); recordPrices(st.hired, noMarket, 1); same(st.hired.seen[noMarket.name].prices, {}); }
});
