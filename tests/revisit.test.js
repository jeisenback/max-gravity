'use strict';

// Returning to a port (revisit.js, #671): a dock note on what changed since the last landing, none on a first landing or inside the gap.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; G.dialog = null; G.nextEvent = null; st.visited = {};  // the game begins docked, which stamped the start port: this port is new to the test
    for (const rec of Object.values(st.bars || {})) for (const id of rec.ids) st.people[id].arc = null;  // the regulars' lives (regulars.js) stand still here, so no one leaves the bar mid-test
    return { st, planet: currentPlanet() };
  };
  window.landNow = planet => { UI.notes = []; Mods.emit('landed', planet); return [...UI.notes]; };
};

test('no line on a first landing or inside the gap; after it, the line says the days and what changed, and nothing-changed is said plainly', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, planet } = setup(), out = {}, w = factionState();
    w.war = null;
    out.first = landNow(planet).filter(n => /Last here/.test(n)); out.stamped = !!(st.visited && st.visited[planet.name] && st.visited[planet.name].day === st.day);
    st.day += 2; out.soon = landNow(planet).filter(n => /Last here/.test(n));
    st.day += 10; out.quiet = landNow(planet).filter(n => /Last here/.test(n));
    st.day += 10; w.war = { a: 'Dome Concord', b: 'Mars Republic', start: st.day, until: st.day + 40, score: {} };
    out.war = landNow(planet).filter(n => /Last here/.test(n));
    st.day += 10; w.war = null; out.over = landNow(planet).filter(n => /Last here/.test(n));
    return out;
  });
  assert.deepEqual(r.first, []); assert.ok(r.stamped, 'the first landing writes the stamp');
  assert.deepEqual(r.soon, [], 'inside the gap, nothing');
  assert.equal(r.quiet.length, 1); assert.match(r.quiet[0], /^Last here 10 days ago\. Nothing here has moved/);  // every landing stamps, the one inside the gap too
  assert.equal(r.war.length, 1); assert.match(r.war[0], /^Last here 10 days ago\. Since then, Dome Concord and Mars Republic have gone to war\.$/);
  assert.equal(r.over.length, 1); assert.match(r.over[0], /the war between Dome Concord and Mars Republic is over/);
  await done();
});

test('a regular who left the bar is named, facts come in a fixed order, and at most three are said', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, planet } = setup(), out = {};
    fillBar(planet); const [p] = G.patrons.filter(x => x.regular).map(x => x.p);
    landNow(planet);
    st.day += 10; st.bars[planet.name].ids = st.bars[planet.name].ids.filter(id => id !== p.id); p.regular = null; p.location = null;
    out.gone = landNow(planet).filter(n => /Last here/.test(n))[0]; out.name = p.first;
    const calm = { eco: null, war: null, lanes: false, regs: ['a'] };
    out.order = revisitFacts(calm, { eco: 'bust', war: ['X', 'Y'], lanes: true, regs: [] }, () => 'Ana');
    return out;
  });
  assert.match(r.gone, new RegExp(`Since then, ${r.name} is gone from the bar\\.$`));
  assert.equal(r.order.length, 3); assert.match(r.order[0], /gone to war/); assert.match(r.order[1], /money has gone out/); assert.match(r.order[2], /lanes have gone bad/);
  await done();
});
