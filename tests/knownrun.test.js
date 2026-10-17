'use strict';

// The captain plans a run on what she knows (js/known.js in js/hired.js): the far end's price is a rumor, her own last sighting or the
// usual price, the run panel says which, the sale at the far end is at the real price, and a run too thin to be worth the fuel is a wait
// in port (js/stay.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed'; hired().fund = 50000; hired().iceAt = st.day; hired().plan = null; hired().runsDone = 1;  // past the port she signed on at: the market wait is on
    G.dialog = null; G.nextEvent = null;
    return st;
  };
  window.farPlanet = plan => SYSTEMS[plan.sid].planets.find(p => p.name === plan.planet);
};

test('the plan rests on what she knows of the far end: the usual price first, a rumor when there is word, her own sighting once she has sailed from there', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    const plan = planRun(), far = farPlanet(plan), here = currentPlanet();
    out.usual = { profit: plan.profit, byKnown: (knownPrice(st, far, plan.good, false) - price(here, plan.good)) * plan.tons, basis: priceBasis(st, far, plan.good, false).kind, panel: runHtml() };
    // word of a glut at that port: she plans on it
    st.rumors.push({ planet: far.name, cid: plan.good, mult: 0.5, until: st.day + 20, text: 'x' }); h.plan = null;
    const after = planRun(); out.rumor = { moved: after.planet !== plan.planet || after.good !== plan.good || after.profit < plan.profit, panel: after.good && !after.ballast ? runHtml() : '' };
    st.rumors.length = 0; h.plan = null;
    // sailing records the prices here, her own buying in them, and she plans on them from the next port
    const before = price(here, plan.good); sail(); G.dialog = null; G.nextEvent = null;
    out.seen = { recorded: !!(h.seen && h.seen[here.name]), day: h.seen && h.seen[here.name].day === st.day, afterBuy: h.seen && h.seen[here.name].prices[plan.good] > before };
    return out;
  });
  assert.equal(r.usual.profit, r.usual.byKnown, 'the profit is figured on the known price, not the real one'); assert.equal(r.usual.basis, 'usual');
  assert.match(r.usual.panel, /She plans on what .* usually pays\./);
  assert.ok(r.rumor.moved, 'a rumor of a glut turns her from that run'); if (r.rumor.panel) assert.match(r.rumor.panel, /She plans on (what .* usually pays|word of the market at)/);
  assert.ok(r.seen.recorded && r.seen.day && r.seen.afterBuy, JSON.stringify(r.seen));
  await done();
});

test('the sale at the far end is at the real price, so a run clears less than planned when the market there has dropped, and a thin plan is a wait in port', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    const plan = planRun(), far = farPlanet(plan);
    sail(); G.dialog = null; G.nextEvent = null;
    st.market[`${far.name}|${plan.good}`] = { p: -0.4, day: st.day };  // the market there fell while she was on the way
    st.systemId = plan.sid; st.day += plan.days; h.ledger = []; const planned = h.run.profit;
    settleRun(far);
    out.cleared = { planned, got: h.ledger[0].profit };
    // a plan too thin to be worth the fuel: she waits
    G.mode = 'landed'; st.planet = far.name; h.fund = 400; h.plan = null; delete h.stay; delete h.run;
    const thin = currentPlan(); out.thin = { perDay: thin ? thin.profit / thin.days : null, waits: marketWait(h, far, thin) };
    h.fund = 50000; h.plan = null; const fat = currentPlan(); out.fat = { perDay: fat.profit / fat.days, waits: marketWait(h, far, fat) }; out.worth = WORTH_THE_FUEL;
    return out;
  });
  assert.ok(r.cleared.got < r.cleared.planned, `cleared ${r.cleared.got} against ${r.cleared.planned} planned`);
  assert.ok(r.thin.perDay !== null && r.thin.perDay < r.worth && r.thin.waits, JSON.stringify(r.thin));
  assert.ok(r.fat.perDay >= r.worth && !r.fat.waits, JSON.stringify(r.fat));
  await done();
});
