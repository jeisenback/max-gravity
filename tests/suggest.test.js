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

test('a promise to take a shipmate home is a run the hand can put to the captain, light if nothing pays there', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup('dov'), out = {}, from = st.systemId;
    hired().plan = null; const run0 = currentPlan(); out.none = !hired().plan.alts.some(a => a.favor);
    const sid = Object.keys(SYSTEMS).find(s => s !== from && s !== run0.sid && inRange(from, s) && SYSTEMS[s].planets.some(p => p.services.includes('trade')));
    const planet = SYSTEMS[sid].planets.find(p => p.services.includes('trade')).name;
    const p = makePerson('earth'); p.home = planet; registerPerson(p); st.crew.push(p.id);
    st.missions.push({ id: st.nextId++, type: 'favor', favorPid: p.id, good: 'a promise', tons: 0, destSystem: sid, destPlanet: planet, title: `Take ${p.first} home to ${planet}`, pay: 0, deadline: st.day + 150 });
    hired().plan = null; currentPlan();
    const alt = hired().plan.alts[0];
    out.first = !!alt && alt.favor === `Take ${p.first} home to ${planet}`; out.port = !!alt && alt.sid === sid && alt.planet === planet;
    out.shape = !!alt && (alt.ballast ? alt.good === null && alt.tons === 0 && alt.profit === 0 : alt.tons > 0 && alt.profit > 0) && alt.days >= 1;
    out.count = hired().plan.alts.length; out.once = hired().plan.alts.filter(a => a.favor).length;
    const dock = document.createElement('div'); dock.innerHTML = swayHtml(); out.row = dock.querySelector('.suggest-row .hint').textContent;
    out.yes = suggestRun(0); const run = hired().plan.run;
    out.went = run.sid === sid && run.planet === planet && run.ballast === alt.ballast && run.good === alt.good;
    return out;
  });
  assert.ok(r.none, 'no promise, no row'); assert.ok(r.first, 'the promise is the first alternative'); assert.ok(r.port); assert.ok(r.shape, 'a trade run there, or a light one');
  assert.ok(r.count <= 3); assert.equal(r.once, 1);
  assert.match(r.row, /^Take \w+ home to .*\((no cargo|\d+t \w)/); assert.match(r.row, /cr wage/);
  assert.ok(r.yes && r.went, 'Dov takes it, and the run keeps its cargo state');
  await done();
});

test('Hester weighs a promise like any run: a light run loses to a paying one and matches an empty plan; a promise that runs out is remembered', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup('hester'), out = {}, promise = { favor: 'Take Ana home to Mars', good: null, tons: 0, cost: 0, profit: 0, days: 9, ballast: true };
    stage({ profit: 1000, days: 5 }, promise); out.no = suggestRun(0); out.kept = hired().plan.run.profit === 1000 && hired().plan.run.ballast === false;
    stage({ profit: 0, days: 5, good: null, tons: 0, ballast: true }, promise); out.yes = suggestRun(0); out.light = hired().plan.run.ballast === true && hired().plan.run.good === null && hired().plan.run.favor === promise.favor;
    const p = makePerson('earth'); p.memories = []; p.opinion = 3; registerPerson(p); st.crew.push(p.id);
    st.missions.push({ id: st.nextId++, type: 'favor', favorPid: p.id, good: 'a promise', tons: 0, destSystem: 'mars', destPlanet: 'Mars', title: 'Take Ana home to Mars', pay: 0, deadline: st.day - 1 });
    expireMissions();
    out.gone = !st.missions.some(m => m.type === 'favor'); out.opinion = p.opinion; out.memory = p.memories.slice(-1)[0];
    return out;
  });
  assert.ok(r.no && r.kept, 'turned down against a paying run'); assert.ok(r.yes && r.light, 'taken against an empty plan, and sails light');
  assert.ok(r.gone); assert.equal(r.opinion, 1); assert.match(r.memory, /the time ran out\.$/);
  await done();
});
