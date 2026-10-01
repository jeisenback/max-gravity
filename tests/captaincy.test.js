'use strict';

// A main character in command of a company ship: how they are posted and relieved, what trade, nerve and thrift do to the
// route, why a green captain is weaker, and what a day under way teaches.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  // An owner at Earth with both of the pair aboard and a company ship docked in port with a hired captain.
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.crew = []; st.credits = 200000;
    for (const key of ['ines', 'tomas']) { const p = castPerson(key); p.role = CAST[key].role; p.skill = p.skills[p.role]; st.crew.push(p.id); castRec(key).since = st.day; }
    buyCompanyShip('lightfreighter');
    G.mode = 'landed';
    return fleet()[0];
  };
};

test('posting: they must be with you and the ship docked where you are; the old captain stays a contact', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const ship = setup(), st = G.state, out = {}, old = st.people[ship.captain.pid], ines = person('c:ines');
    out.before = { crew: st.crew.length, cast: !!castCaptain(ship) };
    // En route: refused.
    ship.dest = 'Mars'; postCaptain(0, 'ines'); out.enRoute = !!castCaptain(ship); ship.dest = null;
    // Elsewhere: refused.
    ship.at = 'Mars City'; postCaptain(0, 'ines'); out.elsewhere = !!castCaptain(ship); ship.at = st.planet;
    // Not aboard: refused.
    st.crew = st.crew.filter(id => id !== 'c:ines'); postCaptain(0, 'ines'); out.notAboard = !!castCaptain(ship); st.crew.push('c:ines');
    // A kept promise is worth more.
    castFlag('ines', 'promised'); const op = ines.opinion; postCaptain(0, 'ines');
    out.posted = { cast: !!castCaptain(ship), crew: st.crew.slice(), pid: ship.captain.pid, wage: ship.captain.wage, gain: ines.opinion - op, oldAt: old.location === st.planet, oldKept: !!st.people[old.id] };
    // The same ship cannot take a second.
    postCaptain(0, 'tomas'); out.second = ship.captain.pid;
    // Relieved: back in the crew, and the ship has a hand again.
    relieveCaptain(0); out.relieved = { crew: st.crew.slice().sort(), cast: !!castCaptain(ship), hand: !!st.people[ship.captain.pid] && !st.people[ship.captain.pid].cast };
    return out;
  });
  assert.deepEqual(r.before, { crew: 2, cast: false });
  assert.equal(r.enRoute, false); assert.equal(r.elsewhere, false); assert.equal(r.notAboard, false);
  assert.deepEqual(r.posted, { cast: true, crew: ['c:tomas', 'c:ines'].filter(id => id === 'c:tomas'), pid: 'c:ines', wage: 70, gain: 3, oldAt: true, oldKept: true });
  assert.equal(r.second, 'c:ines'); assert.deepEqual(r.relieved, { crew: ['c:ines', 'c:tomas'], cast: false, hand: true });
  await done();
});

test('green until skill 2 and 60 days with you: every stat two lower, and then the full stats', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const ship = setup(), st = G.state, ines = person('c:ines'), out = {};
    postCaptain(0, 'ines');
    out.day0 = { grade: captainGrade(ines).ready, edge: captainEdge(ship) };
    st.day += 59; out.day59 = captainGrade(ines).ready;
    st.day += 1; out.day60 = { grade: captainGrade(ines).ready, edge: captainEdge(ship) };
    // Low skill keeps them green however long they have been with you.
    ines.skills = { pilot: 1, gunner: 1, engineer: 1, slicer: 0 }; out.lowSkill = captainGrade(ines).ready;
    return out;
  });
  assert.deepEqual(r.day0, { grade: false, edge: { trade: 1, nerve: 2, thrift: 1, ready: false } }, 'trade 3, nerve 4, thrift 2, less two, never below 1');
  assert.equal(r.day59, false);
  assert.deepEqual(r.day60, { grade: true, edge: { trade: 3, nerve: 4, thrift: 2, ready: true } });
  assert.equal(r.lowSkill, false);
  await done();
});

test('trade moves the income, nerve the raid risk, thrift the wage and the fuel', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const ship = setup(), st = G.state, out = {};
    out.generic = { wage: shipWage(ship), trade: tradeMult(ship), fuel: fuelMult(ship), risk: riskMult(ship), skill: ship.captain.skill };
    st.day += 100;  // both are ready now
    postCaptain(0, 'ines'); out.ines = { wage: shipWage(ship), trade: tradeMult(ship), fuel: fuelMult(ship), risk: +riskMult(ship).toFixed(2) };
    relieveCaptain(0); postCaptain(0, 'tomas'); out.tomas = { wage: shipWage(ship), trade: tradeMult(ship), fuel: fuelMult(ship), risk: +riskMult(ship).toFixed(2) };
    return out;
  });
  assert.equal(r.generic.trade, 1); assert.equal(r.generic.fuel, 1); assert.equal(r.generic.risk, 1 - 0.2 * (r.generic.skill - 1), 'a hired captain is as before');
  assert.deepEqual(r.ines, { wage: 74, trade: 1, fuel: 1.04, risk: 0.7 }, 'Ines: costly but bold (thrift 2, nerve 4)');
  assert.deepEqual(r.tomas, { wage: 53, trade: 0.95, fuel: 0.92, risk: 0.9 }, 'Tomas: thrifty but cautious (thrift 5, trade 2, nerve 2)');
  await done();
});

test('a day under way is experience, and a main character\'s ship is never lost to pirates', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const ship = setup(), st = G.state, out = {}, tomas = person('c:tomas');
    postCaptain(0, 'tomas');
    // A leg under way: one point a day at their best post.
    ship.route = [st.planet, 'Hermes Foundry']; ship.dest = 'Hermes Foundry'; ship.daysLeft = 9; ship.at = st.planet;
    const xp0 = tomas.xp.engineer; companyTick(); out.xp = tomas.xp.engineer - xp0;
    // In port: nothing.
    ship.dest = null; ship.daysLeft = 0; ship.route = null; const xp1 = tomas.xp.engineer; companyTick(); out.idle = tomas.xp.engineer - xp1;
    // The worst of luck on a bad lane: a hired captain's ship goes down, theirs does not.
    const lane = Object.keys(SYSTEMS).find(sid => SYSTEMS[sid].planets.some(p => p.services.includes('trade')));
    const pl = SYSTEMS[lane].planets.find(p => p.services.includes('trade')); worldOf(lane).unrest = 1;
    const hand = registerPerson(makeCrewCandidate('earth'));  // before the dice are fixed: people are made with them
    const real = Math.random; Math.random = () => 0;
    try {
      ship.at = pl.name; ship.dest = pl.name; ship.cargo = {}; ship.paid = 100; endLeg(ship); out.main = fleet().includes(ship);
      ship.captain = { pid: hand.id, wage: 50, skill: 1 };  // a hired captain, by hand
      ship.at = pl.name; ship.dest = pl.name; ship.cargo = {}; endLeg(ship); out.generic = fleet().includes(ship);
    } finally { Math.random = real; }
    return out;
  });
  assert.equal(r.xp, 1); assert.equal(r.idle, 0);
  assert.equal(r.main, true, 'a main character\'s ship survives'); assert.equal(r.generic, false, 'a hired captain\'s does not');
  await done();
});

test('selling a ship, or losing an escort, brings a main character back to your crew', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const ship = setup(), st = G.state, out = {};
    postCaptain(0, 'ines'); out.away = st.crew.includes('c:ines');
    sellCompanyShip(0); out.sold = { crew: st.crew.includes('c:ines'), fleet: fleet().length };
    buyCompanyShip('lightfreighter'); postCaptain(0, 'ines'); const s2 = fleet()[0]; s2.escort = true;
    escortLost({ fleetId: s2.id, name: 'Escort' }); out.lost = { crew: st.crew.includes('c:ines'), fleet: fleet().length };
    return out;
  });
  assert.equal(r.away, false); assert.deepEqual(r.sold, { crew: true, fleet: 0 }); assert.deepEqual(r.lost, { crew: true, fleet: 0 });
  await done();
});

test('the company tab offers them, and their screen says what ship they command', async () => {
  const { page, ev, done } = await open({ viewport: { width: 390, height: 844 }, mobile: true });
  await ev(helpers);
  await ev(() => { setup(); UI.render(); });
  await page.click('[data-action=tab][data-arg=company]');
  assert.ok(await page.$('#panel [data-action=cpost][data-arg="0|ines"]'), 'Ines can be put in command');
  await page.click('#panel [data-action=cpost][data-arg="0|ines"]');
  assert.match(await page.innerText('#panel'), /Green: every stat two lower/);
  assert.ok(await page.$('#panel [data-action=crelieve]'));
  await page.click('#panel [data-action=person][data-arg="c:ines"]');
  assert.match(await page.innerText('#panel'), /captain of the .*, docked at/i);
  assert.match(await page.innerText('#panel'), /Ready to captain\s*skill 3 of 2, 0 of 60 days/i, 'skill is enough, the days are not');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll at phone width');
  await done();
});
