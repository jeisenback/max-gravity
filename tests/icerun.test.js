'use strict';

// Ice runs (js/icerun.js): the long run out to a rock of ice, planned when water is dear, with three scenes on the way.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null;
    return st;
  };
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  window.take = (sc, re) => { G.dialog = { event: sc, choices: sc.choices }; return chooseEvent(sc.choices.findIndex(c => re.test(c.label))); };
};

test('the planner takes an ice run when water is dear, the hold is free, and one is due; and then not for thirty days', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), here = currentPlanet(), reach = [['mars', SYSTEMS.mars]], real = window.price, out = {};
    window.price = () => 120;
    const o = iceOption(here, st.systemId, reach, 40); out.opt = o && { ice: o.ice, good: o.good, cost: o.cost, tons: o.tons, longRun: o.days >= 8, sid: o.sid };
    window.price = () => 50; out.cheap = iceOption(here, st.systemId, reach, 40);
    window.price = () => 120; out.full = iceOption(here, st.systemId, reach, 5);
    h.iceAt = st.day - 10; out.soon = iceOption(here, st.systemId, reach, 40);
    h.iceAt = st.day - 31; out.later = !!iceOption(here, st.systemId, reach, 40);
    h.iceAt = undefined; h.since = st.day - 3; out.green = iceOption(here, st.systemId, reach, 40);  // not in the first days aboard
    window.price = real;
    return out;
  });
  assert.deepEqual(r.opt, { ice: true, good: 'water', cost: 0, tons: 40, longRun: true, sid: 'mars' });
  assert.equal(r.cheap, null); assert.equal(r.full, null); assert.equal(r.soon, null); assert.ok(r.later); assert.equal(r.green, null);
  await done();
});

test('the burn is long, and the three scenes fall on it in order', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    const plain = travelDays(st.systemId, 'mars');
    h.run = { ice: { edge: 0 }, good: 'water', tons: 40, cost: 0, planet: SYSTEMS.mars.planets[0].name, sid: 'mars', day: st.day, from: 'X' };
    st.dest = 'mars'; enterTransit();
    out.days = G.transit.days; out.plain = plain; out.happenings = G.transit.times.length;
    planOccasions();
    out.ice = G.transit.occasions.filter(o => o.kind === 'ice').map(o => [o.stage, o.at]);
    out.title = occasionEvent(G.transit.occasions.find(o => o.kind === 'ice')).title;
    return out;
  });
  assert.equal(r.days, Math.max(8, Math.ceil(1.5 * r.plain) + 3)); assert.ok(r.happenings >= 5); assert.deepEqual(r.ice, [[0, 0.3], [1, 0.5], [2, 0.78]]); assert.equal(r.title, 'The Rock');
  await done();
});

test('each scene offers three ways and your post\'s own, a good run fills the hold and a bad one does not, and the wage is doubled', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, real = Math.random;
    const run = (rollsList) => {
      Math.random = real;  // a fixed random number hangs the generators (setup makes people)
      const st = setup('engineer'), h = hired(); st.cargo = {}; st.paid = {};
      const planet = currentPlanet(), wage = h.wage;
      h.run = { ice: { edge: 0 }, good: 'water', tons: 40, cost: 0, planet: planet.name, sid: st.systemId, day: st.day - 12, from: 'X' };
      const sc = iceStageScene(0), labels = sc.choices.map(c => c.label);
      rolls(rollsList);
      take(sc, /Set the anchors/); const t1 = take(iceStageScene(1), /Cut small/); take(iceStageScene(2), /gentle/);
      const tons = st.cargo.water, xp = skillXp('engineer');
      const credits = st.credits, realPrice = window.price; window.price = () => 100;
      try { settleRun(planet); } finally { window.price = realPrice; }
      return { labels, tons, wage: st.credits - credits, perDay: wage, t1, hold: /tons of ice/.test(t1), titles: [sc.title, iceStageScene(1).title, iceStageScene(2).title] };
    };
    out.good = run([0.01, 0.01, 0.01]);   // every choice works
    out.bad = run([0.99, 0.99, 0.99]);    // none does
    return out;
  });
  assert.equal(r.good.labels.length, 4); assert.ok(/^\[Engineer\]/.test(r.good.labels[3])); assert.deepEqual(r.good.titles, ['The Rock', 'Cutting Ice', 'Home With the Ice']);
  assert.ok(r.good.hold && r.bad.hold); assert.ok(r.good.tons > r.bad.tons, `a good run brings more ice (${r.good.tons} against ${r.bad.tons})`); assert.ok(r.good.tons <= 40 && r.bad.tons >= 8);
  assert.ok(r.good.wage >= r.good.perDay * 12 * 2 - 1, `the long run pays double the wage (${r.good.wage})`);
  await done();
});

test('a burn that skips the scenes comes home with a thin hold, and still pays', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(); st.cargo = {}; st.paid = {};
    const planet = currentPlanet();
    h.run = { ice: { edge: 0 }, good: 'water', tons: 50, cost: 0, planet: planet.name, sid: st.systemId, day: st.day - 12, from: 'X' };
    const credits = st.credits, realPrice = window.price; window.price = () => 100;
    let text; try { text = settleRun(planet); } finally { window.price = realPrice; }
    return { paid: st.credits - credits, text, ledger: h.ledger[0] };
  });
  assert.ok(r.paid > 0); assert.equal(r.ledger.tons, 20, 'two-fifths of a hold'); assert.match(r.text, /sold 20t of Water/);
  await done();
});
