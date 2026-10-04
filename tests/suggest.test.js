'use strict';

// Suggesting a run (js/suggest.js): each captain takes or turns down a hand's suggestion by their own style.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

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
  await page.click('[data-action=station][data-arg=eng]').catch(() => {});
  assert.ok(await ev(() => /Suggest another run/.test(document.querySelector('#panel').innerText) || /Suggest another run/.test(runHtml())));
  await ev(() => Mods.act('suggestRun', '0'));
  assert.equal(await ev(() => hired().plan.run.profit), 400);
  await done();
});
