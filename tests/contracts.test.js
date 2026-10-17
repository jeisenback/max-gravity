'use strict';

// Contracts (js/contracts.js): the freight board a port draws each day, what a contract pays and when it is due, who ships it, the
// captain's pick among them, and what a late delivery pays. Plain Node, no browser: the real scripts in a bare context with the world stubbed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const NAMES = ['SYSTEMS', 'PRICE_MULT', 'CONTRACT_RATE', 'CONTRACT_FEE', 'haulRate', 'LONG_HAUL', 'LONG_HAUL_FLOOR', 'RUMOR_PREMIUM', 'HAZARD_PREMIUM', 'HAZARD_AT', 'LATE_DOCK', 'LATE_FLOOR', 'SHIPPERS', 'shipperOf', 'freightLanes', 'drawContracts', 'contractBoard', 'pickContract', 'latePay', 'travelDays', 'inRange'];

// A game state at Earth on day 10. `danger` is the world's unrest by system; `dice` gives the rolls in order, then 0.5.
const dice = (rolls = []) => { const seq = [...rolls]; return () => (seq.length ? seq.shift() : 0.5); };
function setup({ day = 10, rumors = [], danger = {}, rolls = [], hold = 120 } = {}) {
  const G = { state: { day, flags: {}, systemId: 'earth', planet: 'Earth', market: {}, rumors, missions: [], cargo: {}, hired: { since: 1, captain: 'cap1' } } };
  const api = load(['js/data.js', 'js/util.js', 'js/orbits.js', 'js/market.js', 'js/contracts.js'],
    { G, Mods: { filter: (n, v) => v, emit() {} }, roleSkill: () => 0, ship: () => ({ fuel: 450, cargo: hold }), danger: sid => danger[sid] || 0, pick: l => l[Math.floor(Math.random() * l.length)] }, NAMES);
  const earth = api.SYSTEMS.earth.planets.find(p => p.name === 'Earth');
  const reach = Object.entries(api.SYSTEMS).filter(([sid]) => sid !== 'earth' && api.inRange('earth', sid));
  return { G, st: G.state, earth, reach, rnd: dice(rolls), ...api };
}

test('freight goes from a port that prices a good low or middling to one in reach that prices it higher, never the other way', () => {
  const { earth, reach, freightLanes, PRICE_MULT } = setup();
  const lanes = freightLanes(earth, 'earth', reach);
  assert.ok(lanes.length > 0);
  for (const l of lanes) {
    assert.ok(earth.prices[l.cid] !== 'H', `${l.cid}: nothing ships from where it is dear`);
    assert.ok(PRICE_MULT[l.pl.prices[l.cid]] > PRICE_MULT[earth.prices[l.cid]], `${l.cid} to ${l.pl.name}: priced higher there`);
    assert.ok(reach.some(([sid]) => sid === l.sid) && l.w > 0 && l.days >= 1);
  }
  const same = (a, b) => a.cid === b.cid && a.pl.prices[a.cid] === b.pl.prices[b.cid] && earth.prices[a.cid] === earth.prices[b.cid];
  for (const a of lanes) for (const b of lanes) if (same(a, b) && a.days < b.days) assert.ok(a.w > b.w, `${a.cid}: the nearer port (${a.pl.name}, ${a.days} days) comes up more than the farther (${b.pl.name}, ${b.days})`);
});

test('a long haul pays less a day than a short one: the rate falls two percent a day of the burn, to half at most', () => {
  const { haulRate, LONG_HAUL, LONG_HAUL_FLOOR } = setup();
  assert.equal(haulRate(1), 1 - LONG_HAUL); assert.equal(haulRate(10), 1 - 10 * LONG_HAUL); assert.equal(haulRate(40), LONG_HAUL_FLOOR); assert.equal(haulRate(25), LONG_HAUL_FLOOR);
});

test('a big port draws none, one or two a day by its odds, a small one none or one, each on a lane of its own', () => {
  const { st, earth, reach, drawContracts } = setup();
  assert.equal(drawContracts(st, earth, 'earth', reach, 120, 10, dice([0.1])).length, 0, 'under the first odds: none');
  assert.equal(drawContracts(st, earth, 'earth', reach, 120, 10, dice([0.3])).length, 1);
  const two = setup(); const list = two.drawContracts(two.st, two.earth, 'earth', two.reach, 120, 10, dice([0.9]));
  assert.equal(list.length, 2); assert.notEqual(`${list[0].good}@${list[0].planet}`, `${list[1].good}@${list[1].planet}`, 'two different lanes');
  const small = setup(), europa = small.SYSTEMS.jupiter.planets.find(p => p.name === 'Europa');
  small.st.systemId = 'jupiter';
  const smallReach = Object.entries(small.SYSTEMS).filter(([sid]) => sid !== 'jupiter' && small.inRange('jupiter', sid));
  assert.ok(small.freightLanes(europa, 'jupiter', smallReach).length > 0, 'Europa ships something');
  assert.equal(small.drawContracts(small.st, europa, 'jupiter', smallReach, 120, 10, dice([0.9])).length, 1, 'a small port: at most one, on the top roll');
  const ring = small.SYSTEMS.ceres.planets.find(p => p.name === 'Ring Nine');
  assert.equal(small.drawContracts(small.st, ring, 'ceres', smallReach, 120, 10, dice([0.9])).length, small.freightLanes(ring, 'ceres', smallReach).length ? 1 : 0, 'a port with nothing to ship draws nothing');
});

test('a contract names its shipper, pays a fee and tons by days by the rate, more on word of a shortage and on a dangerous lane, and is due after the burn', () => {
  const { st, earth, reach, drawContracts, CONTRACT_RATE, CONTRACT_FEE, RUMOR_PREMIUM, HAZARD_PREMIUM, haulRate, travelDays, SHIPPERS } = setup();
  const [c] = drawContracts(st, earth, 'earth', reach, 120, 10, dice([0.9]));
  assert.equal(c.shipper, SHIPPERS.gov['Arcology Compact']); assert.equal(c.from, 'Earth');
  assert.equal(c.days, Math.max(1, travelDays('earth', c.sid))); assert.ok(c.tons >= 40 && c.tons <= 120 && c.tons % 10 === 0);
  assert.equal(c.pay, Math.round(CONTRACT_FEE + c.tons * c.days * CONTRACT_RATE * haulRate(c.days))); assert.ok(!c.rumor && !c.hazard);
  assert.ok(c.due >= 10 + Math.ceil(c.days * 1.5) + 2 && c.due <= 10 + Math.ceil(c.days * 1.5) + 6);
  // the same draw with word of a shortage at the far end and raids on the lane
  const dear = setup({ rumors: [{ planet: c.planet, cid: c.good, mult: 1.5, until: 30 }], danger: { [c.sid]: 0.3 } });
  const [d] = dear.drawContracts(dear.st, dear.earth, 'earth', dear.reach, 120, 10, dice([0.9]));
  assert.deepEqual([d.good, d.planet, d.tons, d.due], [c.good, c.planet, c.tons, c.due], 'the same lane, the dice being the same');
  assert.ok(d.rumor && d.hazard); assert.equal(d.pay, Math.round((CONTRACT_FEE + d.tons * d.days * CONTRACT_RATE * haulRate(d.days)) * (1 + RUMOR_PREMIUM + HAZARD_PREMIUM)));
  const stale = setup({ rumors: [{ planet: c.planet, cid: c.good, mult: 1.5, until: 9 }] });
  assert.ok(!stale.drawContracts(stale.st, stale.earth, 'earth', stale.reach, 120, 10, dice([0.9]))[0].rumor, 'an expired rumor is no premium');
});

test('a port\'s own people ship from it, else the government\'s office, else a broker', () => {
  const { SYSTEMS, shipperOf, SHIPPERS } = setup();
  const titan = SYSTEMS.saturn.planets.find(p => p.name === 'Titan'), mars = SYSTEMS.mars.planets.find(p => p.name === 'Mars'), phobos = SYSTEMS.mars.planets.find(p => p.name === 'Phobos Yards');
  assert.equal(shipperOf(titan, 'Charter League'), 'the Tethys Shipping Consortium'); assert.equal(shipperOf(mars, 'Dome Concord'), SHIPPERS.gov['Dome Concord']);
  assert.equal(shipperOf(phobos, 'Dome Concord'), SHIPPERS.gov['Dome Concord']); assert.equal(shipperOf({ name: 'Nowhere' }, 'Independent'), SHIPPERS.other);
});

test('the board is drawn once a day at a port with dice of its own, the same for the port, the day and the game, and drawn again another day', () => {
  const { st, earth, contractBoard } = setup();
  const a = contractBoard(st, earth), b = contractBoard(st, earth);
  assert.equal(a, b, 'the same list, the same day'); assert.equal(st.hired.freight.key, 'Earth@10');
  st.hired.freight = null; const again = contractBoard(st, earth);
  assert.deepEqual(again, a, 'drawn again from nothing: the same board, since its dice are its own');
  st.day = 11; const c = contractBoard(st, earth);
  assert.notEqual(c, a); assert.equal(st.hired.freight.key, 'Earth@11');
  const other = setup(); other.st.hired.captain = 'cap2';
  assert.notDeepEqual(JSON.stringify(other.contractBoard(other.st, other.earth)), JSON.stringify(a), 'another game, another board');
});

test('the captain picks what pays the ship most a day among what her hold can fill, favors a yard when she wants one, and marks a dangerous lane down', () => {
  const { pickContract } = setup();
  const list = [
    { sid: 'mars', planet: 'Mars', good: 'water', tons: 80, days: 4, pay: 4000, yard: false },     // 1000 a day
    { sid: 'ceres', planet: 'Ceres Station', good: 'food', tons: 120, days: 6, pay: 7200, yard: true },  // 1200 a day, but 120 tons
    { sid: 'eros', planet: 'Eros Old Town', good: 'metal', tons: 40, days: 5, pay: 4500, yard: false },  // 900 a day
  ];
  const deps = { free: 120, wantYard: false, risk: () => 1, picks: 1 };
  assert.equal(pickContract(list, deps).best.planet, 'Ceres Station');
  assert.equal(pickContract(list, { ...deps, free: 100 }).best.planet, 'Mars', 'the hold cannot take the Ceres load');
  assert.equal(pickContract(list, { ...deps, free: 100, wantYard: true }).best.planet, 'Mars', 'no yard among what fits');
  assert.equal(pickContract(list, { ...deps, risk: sid => (sid === 'ceres' ? 0.5 : 1) }).best.planet, 'Mars', 'a cautious captain marks the League lane down');
  assert.deepEqual(pickContract(list, deps).ranked.map(c => c.planet), ['Ceres Station', 'Mars', 'Eros Old Town']);
  assert.equal(pickContract([], deps).best, null); assert.equal(pickContract(list, { ...deps, free: 30 }).best, null, 'nothing fits');
});

test('a late delivery is docked a tenth a day and never below half', () => {
  const { latePay } = setup();
  assert.equal(latePay(1000, 20, 18), 1000); assert.equal(latePay(1000, 20, 20), 1000);
  assert.equal(latePay(1000, 20, 21), 900); assert.equal(latePay(1000, 20, 24), 600); assert.equal(latePay(1000, 20, 30), 500); assert.equal(latePay(1000, 20, 99), 500);
});
