'use strict';

// The hired chapter's roster, fund and pacing (js/hired.js, js/people.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const CHAPTER_ROLES = ['xo', 'cook', 'icehand'];

test('the chapter\'s roles have a name, a wage and a perk', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ names: [ROLE_NAMES.xo, ROLE_NAMES.cook, ROLE_NAMES.icehand],
    wages: ['xo', 'cook', 'icehand'].map(k => typeof ROLE_WAGE[k]), perks: ['xo', 'cook', 'icehand'].map(k => ROLE_PERKS[k](2)) }));
  assert.deepEqual(r.names, ['First officer', 'Cook', 'Ice hand']);
  assert.deepEqual(r.wages, ['number', 'number', 'number']);
  assert.ok(r.perks.every(p => typeof p === 'string' && p.length > 0));
  await done();
});

test('the chapter\'s roles are never hireable', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ hireable: HIREABLE_ROLES, roles: Array.from({ length: 300 }, () => makeCrewCandidate('Earth').role) }));
  assert.deepEqual(r.hireable, ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic']);
  assert.ok(r.roles.every(x => r.hireable.includes(x)));
  await done();
});

test('a passenger who joins the crew never takes a chapter role', async () => {
  const { ev, done } = await open();
  const roles = await ev(() => Array.from({ length: 300 }, () => jobRole('')));
  assert.ok(roles.every(x => !CHAPTER_ROLES.includes(x)), roles.filter(x => CHAPTER_ROLES.includes(x)).join());
  await done();
});

const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
  window.underway = () => { if (!sail()) throw new Error('no plan'); answerAll(); tryBurn(); enterTransit(); G.transit.times = []; };
  window.answerAll = () => { for (let k = 0; k < 8 && G.dialog; k++) { const d = G.dialog, ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can()); if (ok.length) chooseEvent(ok[0]); finishEvent(); } while (G.dialog) finishEvent(); };
};
const ROSTER = ['cook', 'engineer', 'icehand', 'icehand', 'medic', 'pilot', 'quartermaster', 'slicer', 'xo'];
const hauler = async o => { const t = await open(o); await t.ev(helpers); return t; };

test('a hired hand starts on an Ice Hauler', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => { const st = start(); return { ship: st.shipId, fuel: st.fuel === SHIPS.freighter.fuel, armor: st.armor === SHIPS.freighter.armor }; });
  assert.equal(r.ship, 'freighter'); assert.ok(r.fuel); assert.ok(r.armor);
  const intro = await ev(() => { startGame({ slot: 2, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); return (G.dialog ? G.dialog.event.text : '') + UI.notes.join(' '); });
  assert.match(intro, /ice hauler/i); assert.doesNotMatch(intro, /light freighter/i);
  await done();
});

test('the crew is nine, in the ten berths, whatever the background', async () => {
  for (const background of ['earth', 'mars', 'belt']) {
    const { ev, done } = await hauler();
    const r = await ev(bg => { const st = start({ background: bg }); return { roles: crewMembers().map(c => c.role).sort(), used: berthsUsed(), free: berthsFree(), cast: crewMembers().filter(c => c.cast && !CAST[c.cast].xo).length }; }, background);
    assert.deepEqual(r.roles, ROSTER, background);
    assert.equal(r.used, 9); assert.equal(r.free, 1); assert.equal(r.cast, 2, 'Ines and Tomas are aboard');
    await done();
  }
});

test('every post but yours is held once', async () => {
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    const { ev, done } = await hauler();
    const r = await ev(p => { start({ post: p }); const mine = POSTS[p].role; return Object.values(POSTS).map(x => x.role).map(role => [role, crewMembers().filter(c => c.role === role).length, role === mine]); }, post);
    for (const [role, n, mine] of r) assert.equal(n, mine ? 0 : 1, `${post}: ${role}`);
    await done();
  }
});

test('an old hired save still plays', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => {
    const st = start(); st.shipId = 'lightfreighter'; st.crew = st.crew.filter(id => ['pilot', 'engineer', 'slicer'].includes(person(id).role));
    underway();
    for (let i = 0; i < 20; i++) { startHappening(); answerAll(); }
    for (let i = 0; i < 10; i++) { const e = hiredEvent('crew'); if (e) { openEvent(e); answerAll(); } }
    return st.crew.length;
  });
  assert.equal(r, 3);
  await done();
});

test('crew events cope with roles that have no post', async () => {
  const { ev, done } = await hauler();
  const bad = await ev(() => {
    const st = start(), bad = [];
    underway();
    for (let i = 0; i < 30; i++) for (const g of ['crew', 'money']) { const e = hiredEvent(g); if (!e) continue; if (/undefined|NaN|\[object/.test(e.text)) bad.push(e.text.slice(0, 80)); openEvent(e); answerAll(); }
    for (let i = 0; i < 20; i++) { startHappening(); answerAll(); }
    return bad;
  });
  assert.deepEqual(bad, []);
  await done();
});

test('after the buy-in the old captain\'s ship is an Ice Hauler', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => { const st = start(); st.credits = 100000; const cap = hiredCaptain(); buyIn('courier'); return cap.ship.shipId; });
  assert.equal(r, 'freighter');
  await done();
});

test('the fund is big enough for the hold', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => { const st = start(); const plan = currentPlan(); return { fund: HIRED_FUND, have: st.hired.fund, cost: plan && plan.cost, free: cargoFree(), hold: SHIPS.freighter.cargo }; });
  assert.ok(r.fund >= 12000); assert.equal(r.have, r.fund);
  assert.equal(r.free, r.hold, 'the hold starts empty');
  assert.ok(r.cost > 5000 && r.cost <= r.have, `the first run spends ${r.cost}, more than the old 5,000 fund allowed`);
  await done();
});

test('the captain heads for a yard at the chapter\'s price, not the cheapest ship\'s', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => {
    const st = start(), out = { target: HIRED_TARGET };
    st.hired.deal = { price: HIRED_TARGET, day: st.day, until: st.day - 1 };  // a lapsed deal: back to the chapter's price
    st.credits = HIRED_TARGET - 1; out.below = wantsYard();
    st.credits = HIRED_TARGET; out.at = wantsYard();
    st.credits = Math.min(...Object.values(SHIPS).filter(x => x.forSale).map(x => x.price)); out.cheapShip = wantsYard();
    return out;
  });
  assert.equal(r.target, 19000); assert.equal(r.below, false); assert.equal(r.at, true);
  assert.equal(r.cheapShip, false, 'the Rock Hopper price is not the signal');
  await done();
});

// Seeds differ in luck (the answers are random), so each captain's runs are checked seed by seed, and the pay as a mean per day.
// The tuning aim is about 15 percent between captains; the test only guards against a captain who pays far more or less.
// The day bound is wide because an unlucky seed can run to the 170s (the random stream shifts with whatever draws before it).
test('about twenty runs reach the target with every captain, and the planner is never stuck', async () => {
  const { soak } = require('../tools/soak');
  const perDay = {};
  for (const captainKey of ['hester', 'dov', 'imre', 'zoya']) {
    const rs = [];
    for (const seed of [1, 2, 3, 4, 5]) rs.push(await soak({ seed, legs: 40, captainKey }));
    for (const r of rs) {
      assert.ok(r.reached, `${captainKey} seed ${r.seed} never reached the target in ${r.runs} runs`);
      assert.ok(r.reached.runs >= 10 && r.reached.runs <= 30 && r.reached.day >= 60 && r.reached.day <= 190, `${captainKey} seed ${r.seed}: ${r.reached.runs} runs, day ${r.reached.day}`);
      assert.equal(r.stuck, 0, `${captainKey} seed ${r.seed}: the captain had no plan`);
      assert.deepEqual(r.bad, []); assert.deepEqual(r.errors, []);
    }
    const pay = rs.reduce((t, r) => t + r.avgPayPerRun, 0) / rs.length, days = rs.reduce((t, r) => t + r.avgDaysPerRun, 0) / rs.length;
    assert.ok(pay >= 800 && pay <= 1400, `${captainKey}: mean pay per run ${Math.round(pay)}`);
    perDay[captainKey] = pay / days;
  }
  const rates = Object.values(perDay), spread = Math.max(...rates) / Math.min(...rates);
  // Measured: over 20 seeds a captain's pay per day differs by about 1.1 at most between captains, but the mean of five seeds swings
  // between 1.1 and 1.55 with nothing changed but which random numbers are drawn. So this guards against gross imbalance only.
  assert.ok(spread <= 1.7, `pay per day across captains: ${JSON.stringify(perDay)}`);
});
