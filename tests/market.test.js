'use strict';

// Prices and trading (js/market.js): the pressure a trade leaves on a market, the price per ton, what a lot costs or fetches, the
// trade itself, and the best place to sell. These run in plain Node, with no browser: the real scripts are loaded by
// tests/nodecontext.js, with the game state, the ship and Mods stubbed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const NAMES = ['SYSTEMS', 'COMMODITIES', 'PRICE_MULT', 'MARKET_CAP', 'MARKET_PER_TON', 'pressure', 'pushed', 'price', 'tradeTotal', 'recordTrade', 'bestSale', 'inRange', 'travelDays'];

// A fresh game state for each test. `rumors` and `market` are the state's own; `filter` is what a mod's 'price' filter does.
function setup({ day = 3, rumors = [], market = {}, fuel = 300, filter = (name, value) => value } = {}) {
  const G = { state: { day, flags: {}, systemId: 'earth', market, rumors, missions: [], cargo: {} } }, events = [];
  const Mods = { filter, emit: (...args) => events.push(args) };
  const api = load(['js/data.js', 'js/util.js', 'js/orbits.js', 'js/market.js'], { G, Mods, roleSkill: () => 0, ship: () => ({ fuel, cargo: 100 }) }, NAMES);
  const planets = Object.values(api.SYSTEMS).flatMap(s => s.planets);
  return { G, events, planets, ...api };
}

const find = (planets, cid, trades) => planets.find(p => !!p.prices[cid] === trades);

test('a market remembers the pressure of past trades by planet and commodity, and starts with none', () => {
  const { planets, pressure } = setup({ market: { 'Earth|water': { p: 0.12, day: 1 } } });
  const earth = planets.find(p => p.name === 'Earth'), mars = planets.find(p => p.name !== 'Earth');
  assert.equal(pressure(earth, 'water'), 0.12);
  assert.equal(pressure(earth, 'food'), 0, 'another commodity at the same planet');
  assert.equal(pressure(mars, 'water'), 0, 'the same commodity at another planet');
});

test('each ton bought raises the pressure and each ton sold lowers it, and it stops at the cap either way', () => {
  const { pushed, MARKET_CAP, MARKET_PER_TON } = setup();
  assert.ok(Math.abs(pushed(0, 50) - 50 * MARKET_PER_TON) < 1e-12, 'a ton moves it by MARKET_PER_TON');
  assert.ok(Math.abs(pushed(0.1, -30) - (0.1 - 30 * MARKET_PER_TON)) < 1e-12);
  assert.equal(pushed(0, 1e6), MARKET_CAP, 'buying a mountain stops at the cap');
  assert.equal(pushed(0, -1e6), -MARKET_CAP, 'selling a mountain stops at minus the cap');
  assert.equal(pushed(MARKET_CAP, 10), MARKET_CAP, 'already at the cap');
});

test('a planet that does not trade a commodity has no price for it', () => {
  const { planets, price, COMMODITIES } = setup();
  const planet = planets.find(p => COMMODITIES.some(c => !p.prices[c.id])), cid = COMMODITIES.find(c => !planet.prices[c.id]).id;
  assert.equal(price(planet, cid), null);
});

test('the price is the commodity\'s base, its level here, a wobble of 8 percent at most, and the pressure', () => {
  const { G, planets, price, COMMODITIES, PRICE_MULT } = setup();
  for (const day of [1, 17, 90, 400]) {
    G.state.day = day;
    for (const planet of planets) for (const c of COMMODITIES) {
      if (!planet.prices[c.id]) continue;
      const level = c.base * PRICE_MULT[planet.prices[c.id]], p0 = price(planet, c.id, 0);
      assert.ok(p0 >= Math.round(level * 0.92) && p0 <= Math.round(level * 1.08), `${planet.name} ${c.id} on day ${day}: ${p0} against ${Math.round(level)}`);
      assert.ok(Math.abs(price(planet, c.id, 0.4) - p0 * 1.4) <= 1.5, 'pressure scales the price by (1 + p)');
      assert.ok(Math.abs(price(planet, c.id, -0.4) - p0 * 0.6) <= 1.5);
    }
  }
});

test('the price uses the market\'s own pressure unless one is given', () => {
  const planet0 = setup().planets.find(p => p.prices.water);
  const { price, planets } = setup({ market: { [`${planet0.name}|water`]: { p: 0.3, day: 1 } } });
  const planet = planets.find(p => p.name === planet0.name);
  assert.equal(price(planet, 'water'), price(planet, 'water', 0.3));
  assert.ok(price(planet, 'water') > price(planet, 'water', 0));
});

test('a rumor moves a price at its planet for its commodity until its day, and nowhere else', () => {
  const base = setup(), planet = find(base.planets, 'water', true), other = base.planets.find(p => p !== planet && p.prices.water);
  const plain = base.price(planet, 'water');
  const rumor = (extra = {}) => ({ planet: planet.name, cid: 'water', until: 10, mult: 2, ...extra });
  assert.ok(Math.abs(setup({ day: 3, rumors: [rumor()] }).price(planet, 'water') - plain * 2) <= 1, 'doubled while it lasts');
  assert.equal(setup({ day: 10, rumors: [rumor()] }).price(planet, 'water') > plain, true, 'still on the last day');
  assert.equal(setup({ day: 11, rumors: [rumor()] }).price(planet, 'water') === setup({ day: 11 }).price(planet, 'water'), true, 'gone after it');
  assert.equal(setup({ rumors: [rumor({ planet: other.name })] }).price(planet, 'water'), plain, 'a rumor about another planet');
  assert.equal(setup({ rumors: [rumor({ cid: 'food' })] }).price(planet, 'water'), plain, 'a rumor about another commodity');
});

test('a mod\'s price filter has the last word', () => {
  const planet = setup().planets.find(p => p.prices.water);
  const seen = [];
  const { price, planets } = setup({ filter: (name, value, p, cid) => { seen.push([name, p.name, cid]); return value * 3; } });
  const plain = setup().price(planet, 'water');
  assert.ok(Math.abs(price(planets.find(p => p.name === planet.name), 'water') - plain * 3) <= 1);
  assert.deepEqual(seen[0], ['price', planet.name, 'water']);
});

test('a lot is bought and sold at the average of the price before and after it moves the market', () => {
  const { planets, price, pushed, pressure, tradeTotal, MARKET_CAP } = setup({ market: { 'Earth|water': { p: 0.1, day: 1 } } });
  const earth = planets.find(p => p.name === 'Earth');
  for (const [qty, dir] of [[40, 1], [40, -1], [300, 1], [300, -1], [2000, 1]]) {
    const p0 = pressure(earth, 'water'), after = pushed(p0, qty * dir);
    assert.equal(tradeTotal(earth, 'water', qty, dir), qty * price(earth, 'water', (p0 + after) / 2), `${qty} tons, direction ${dir}`);
  }
  assert.ok(tradeTotal(earth, 'water', 100, 1) > 100 * price(earth, 'water'), 'a big purchase costs more than the spot price');
  assert.ok(tradeTotal(earth, 'water', 100, -1) < 100 * price(earth, 'water'), 'a big sale fetches less');
  assert.equal(tradeTotal(earth, 'water', 0, 1), 0);
  assert.ok(MARKET_CAP > 0);
});

test('a trade moves the market and tells the mods, and selling back at once what you bought fetches what it cost', () => {
  const { G, events, planets, pressure, recordTrade, tradeTotal, MARKET_CAP } = setup();
  const planet = find(planets, 'water', true), start = pressure(planet, 'water');
  const paid = tradeTotal(planet, 'water', 80, 1);
  recordTrade(planet, 'water', 80, 1);
  assert.ok(pressure(planet, 'water') > start, 'buying raises it');
  assert.equal(G.state.market[`${planet.name}|water`].day, G.state.day, 'and stamps the day');
  assert.deepEqual(events.at(-1), ['trade', planet, 'water', 80, 1]);
  assert.equal(tradeTotal(planet, 'water', 80, -1), paid, 'the same lot back is priced over the same stretch of pressure');
  assert.ok(tradeTotal(planet, 'water', 160, 1) / 160 > paid / 80, 'what costs more is going on the same way: a bigger lot is dearer a ton');
  recordTrade(planet, 'water', 80, -1);
  assert.ok(Math.abs(pressure(planet, 'water') - start) < 1e-12, 'selling the same lot back puts the pressure where it was');
  for (let i = 0; i < 20; i++) recordTrade(planet, 'water', 500, 1);
  assert.equal(pressure(planet, 'water'), MARKET_CAP, 'a hundred tons after another stops at the cap');
});

test('the best place to sell is the one that pays most a day within a full tank, and never a loss', () => {
  const { planets, price, bestSale, inRange, travelDays, SYSTEMS, G } = setup();
  const here = planets.find(p => p.name === 'Earth');
  const best = bestSale(here, 'water'), buy = price(here, 'water');
  assert.ok(best, 'water from Earth has somewhere to go');
  assert.equal(best.profit, price(best.planet, 'water') - buy);
  assert.ok(best.profit > 0 && best.planet !== here);
  let beaten = null;
  for (const [sid, sys] of Object.entries(SYSTEMS)) {
    if (!inRange(G.state.systemId, sid)) continue;
    const days = sid === G.state.systemId ? 0 : travelDays(G.state.systemId, sid);
    for (const pl of sys.planets) {
      const sell = price(pl, 'water');
      if (pl === here || sell === null || sell <= buy) continue;
      if ((sell - buy) / Math.max(1, days) > best.score + 1e-9) beaten = pl.name;
    }
  }
  assert.equal(beaten, null, 'no other place in range pays more a day');
  const tight = setup({ fuel: 0 }), stay = tight.bestSale(tight.planets.find(p => p.name === 'Earth'), 'water');
  assert.ok(stay === null || stay.days === 0, 'with an empty tank only the same system is in reach');
  const nowhere = setup().planets.find(p => !p.prices.metal);
  assert.equal(setup().bestSale(nowhere, 'metal'), null, 'no price here, nothing to sell');
});
