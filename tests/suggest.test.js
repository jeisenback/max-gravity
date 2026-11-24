'use strict';

// Suggesting a run (js/suggest.js): each captain takes or turns down a hand's suggestion by their own style.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, goTo } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = key => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: key }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed'; hired().fund = 20000;
    person(hired().captain).opinion = 3;
    return st;
  };
  // Two runs: the plan, and the alternative to put to the captain.
  window.stage = (cur, alt) => {
    const h = hired(), base = { good: 'water', tons: 5, cost: 100, planet: 'Mars', ballast: false };
    h.plan = { day: G.state.day, at: G.state.planet, cargo: JSON.stringify(G.state.cargo), run: { ...base, sid: 'mars', ...cur }, alts: [{ ...base, sid: 'mars', ...alt }] };
    h.sway = null;
  };
  window.runLeft = () => { const h = hired(); return { sid: h.plan.run.sid, profit: h.plan.run.profit }; };
};

const cases = [
  ['hester', { profit: 1000, days: 5 }, { profit: 950, days: 9 }, { profit: 700, days: 4 }],
  ['dov', { profit: 1000, days: 5 }, { profit: 100, days: 9 }, null],
  ['zoya', { profit: 1000, days: 8 }, { profit: 900, days: 11 }, { profit: 1500, days: 4 }],
];

for (const [key, cur, good, bad] of cases) {
  test(`${key} takes a suggestion that suits them and turns down one that does not`, async () => {
    const { ev, done } = await open({ scope: 'earth-hired' });
    await ev(helpers);
    const r = await ev(([key, cur, good, bad]) => {
      setup(key); const out = {};
      stage(cur, good); out.yes = suggestRun(0); out.yesProfit = hired().plan.run.profit;
      if (bad) { stage(cur, bad); out.no = suggestRun(0); out.noProfit = hired().plan.run.profit; }
      stage(cur, good); out.again = [suggestRun(0), suggestRun(0)];
      return out;
    }, [key, cur, good, bad]);
    assert.equal(r.yesProfit, good.profit, 'the run was changed');
    assert.ok(r.yes && !/undefined|NaN/.test(r.yes));
    if (bad) { assert.equal(r.noProfit, cur.profit, 'the run was kept'); assert.ok(r.no); }
    assert.equal(r.again[1], null, 'only one suggestion a stop');
    await done();
  });
}

test('imre will not go to a worse lane, and a hand the captain does not know yet is not heard', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    setup('imre'); const out = {};
    const safe = Object.keys(SYSTEMS).sort((a, b) => danger(a) - danger(b));
    stage({ sid: safe[safe.length - 1] }, { sid: safe[0], profit: 500 }); out.safer = suggestRun(0); out.safeSid = hired().plan.run.sid === safe[0];
    stage({ sid: safe[0] }, { sid: safe[safe.length - 1], profit: 500 }); suggestRun(0); out.worseKept = hired().plan.run.sid === safe[0];
    person(hired().captain).opinion = -3; stage({ profit: 1 }, { profit: 2 }); out.stranger = suggestRun(0); out.strangerKept = hired().plan.run.profit === 1; out.notSpent = hired().sway === null;
    return out;
  });
  assert.ok(r.safeSid, 'a safer lane is taken'); assert.ok(r.worseKept, 'a worse lane is not');
  assert.match(r.stranger, /do not know/); assert.ok(r.strangerKept); assert.ok(r.notSpent, 'a refusal for trust does not use up the stop');
  await done();
});

test('the run panel lists the next runs for a captain with a style, and the button suggests one', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { setup('dov'); stage({ profit: 1000 }, { profit: 400, planet: 'Ganymede' }); UI.render(); });
  await goTo(page, 'shipyard').catch(() => {});
  assert.ok(await ev(() => /Suggest another run/.test(document.querySelector('#panel').innerText) || /Suggest another run/.test(runHtml())));
  await ev(() => Mods.act('suggestRun', '0'));
  assert.equal(await ev(() => hired().plan.run.profit), 400);
  await done();
});

test('on the Port page, pressing Suggest puts the run to the captain, and the run on the page is the new one (#1327)', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { setup('dov'); stage({ profit: 1000, days: 5, planet: 'Mars' }, { profit: 100, days: 9, planet: 'Phobos Yards' }); UI.tab = 'port'; UI.render(); });
  const run = () => page.innerText('.shell .body .post .desc');
  assert.match(await run(), /to Mars,/);
  await page.click('[data-action=suggestRun][data-arg="0"]');
  assert.match(await run(), /to Phobos Yards,/, 'the captain took it: the page shows the new run');
  assert.equal(await page.$('[data-action=suggestRun]:not([disabled])'), null, 'and no second suggestion this stop');
  await done();
});

// ---------- putting a fitting to the captain (#1349, the owner's choice, 2026-11-24): the fire-control upgrades at a port with an outfitter, once a stop ----------

const { load } = require('./nodecontext');
const F = load(['js/data.js', 'js/suggest.js'], { Mods: { register() {} }, sceneSay: (id, key, vars) => `${key} ${JSON.stringify(vars || {})}`, fmt: n => String(n) }, ['OUTFITS', 'FIT_UPGRADES', 'fitAsk']);
const plainOf = x => JSON.parse(JSON.stringify(x));

test('fitAsk: a captain who does not listen says so and the stop is not spent; one who does buys it for its price, or says the fund will not stretch; once a stop', () => {
  const { OUTFITS, FIT_UPGRADES, fitAsk } = F, price = OUTFITS.fcAccuracy.price;
  assert.deepEqual(plainOf(FIT_UPGRADES), ['fcAccuracy', 'fcResilience']);
  assert.deepEqual([OUTFITS.fcAccuracy.price, OUTFITS.fcResilience.price], [40000, 30000], 'the owner\'s prices (#1349)');
  const game = opinion => ({ st: { day: 10, planet: 'Earth', outfits: {} }, hand: {}, cap: { last: 'Vance', opinion } });
  let g = game(-1);
  let r = fitAsk(g.st, g.hand, g.cap, 1, price, 'fcAccuracy');
  assert.equal(r.cost, 0); assert.match(r.text, /^fit\.deaf /); assert.equal(g.hand.fitAsk, undefined, 'a refusal for trust does not spend the stop');
  g = game(1);
  r = fitAsk(g.st, g.hand, g.cap, 1, price - 1, 'fcAccuracy');
  assert.equal(r.cost, 0); assert.match(r.text, /^fit\.poor /); assert.equal(g.st.outfits.fcAccuracy, undefined, 'nothing fitted');
  assert.equal(fitAsk(g.st, g.hand, g.cap, 1, price, 'fcResilience').text, '', 'once a stop');
  g = game(1);
  r = fitAsk(g.st, g.hand, g.cap, 1, price, 'fcAccuracy');
  assert.equal(r.cost, price, 'its price, for the caller to take from the fund'); assert.match(r.text, /^fit\.yes /); assert.equal(g.st.outfits.fcAccuracy, 1, 'fitted');
  g.st.day += 1; assert.equal(fitAsk(g.st, g.hand, g.cap, 1, price, 'fcAccuracy').text, '', 'one fitted is not asked for again');
  assert.equal(fitAsk(g.st, g.hand, g.cap, 1, price, 'heavy').text, '', 'only the fire-control upgrades');
});

test('on the Weapons console at a port with an outfitter, pressing an upgrade puts it to the captain, who buys it; the fight on the radar then reads it (#1349, #1327)', async () => {
  const { page, ev, errors, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { setup('hester'); hired().fund = 100000; person(hired().captain).opinion = captainHears(); UI.render(); });
  await goTo(page, 'weapons');
  const before = await ev(() => ({ fund: hired().fund, bill: hired().bill || 0, fitOff: radarFit(G.state) }));
  await page.click('[data-action=fitAsk][data-arg=fcAccuracy]');
  const after = await ev(() => {
    const st = G.state; hired().raidTold = true; G.nextEvent = null; startShipFight({ kind: 'pirate', gov: 'Arcology Pact', shipId: 'raider' }, false);
    const fit = G.nextEvent.fight.state.fit; G.nextEvent = null; G.radar = null;
    return { fund: hired().fund, bill: hired().bill || 0, fitted: st.outfits.fcAccuracy, fit, note: UI.notes.join(' '), panel: document.querySelector('#panel').innerText, open: !!document.querySelector('[data-action=fitAsk]:not([disabled])') };
  });
  await done();
  assert.deepEqual(before.fitOff, { accuracy: false, resilience: false });
  assert.equal(before.fund - after.fund, 40000, 'from the ship\'s fund'); assert.equal(after.bill - before.bill, 40000, 'on the captain\'s bill'); assert.equal(after.fitted, 1);
  assert.deepEqual(after.fit, { accuracy: true, resilience: false }, 'the flag reaches the fight');
  assert.match(after.note, /signs the order/, 'the captain\'s answer, as a port note'); assert.match(after.panel, /You have put a fitting to the captain already at this port/);
  assert.equal(after.open, false, 'and no second this stop');
  assert.deepEqual(errors, []);
});

test('the console shuts the ask, with the reason, while the captain does not listen, and offers nothing at a port with no outfitter (#1349)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    setup('hester'); person(hired().captain).opinion = captainHears() - 1;
    const deaf = fitHtml();
    person(hired().captain).opinion = captainHears(); const planet = currentPlanet(), had = planet.services; planet.services = had.filter(s => s !== 'outfitter');
    const none = fitHtml(); planet.services = had;
    return { deaf, none };
  });
  await done();
  assert.match(r.deaf, /does not take suggestions/); assert.match(r.deaf, /disabled/);
  assert.equal(r.none, '');
});
