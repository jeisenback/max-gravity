'use strict';

// The hired hand's first run (js/tutorial.js, HAND_TUTORIAL): a few steps that advance on their own as the hand sails, hears the
// first officer's walk-through, spends downtime, sits with someone and docks. State is st.tutorial, as for the owner's tutorial.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.begin = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', tutorial: true, ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
  window.sailOut = () => { if (!sail()) throw new Error('no plan'); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.dialog = null; G.mode = 'transit'; };
  window.tick = () => { tutorialTick(0); return G.state.tutorial; };
};

test('a new hired game starts the first run, and a game started without it has none', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    begin(); out.step = G.state.tutorial; out.banner = tutorialHtml();
    begin({ tutorial: false }); out.none = G.state.tutorial;
    return out;
  });
  assert.equal(r.step, 0); assert.match(r.banner, /press Sail/); assert.match(r.banner, /step 1 of 5/);
  assert.equal(r.none, null);
  await done();
});

test('the steps advance in order: sail, the walk-through, downtime, a chat, and docking', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = begin(), h = hired(), seq = [tick()];
    sailOut(); seq.push(tick());
    const walk = pickHappening('transit'); G.dialog = null; seq.push(tick(), walk.title);
    const down = downtimeEvent(true); openEvent(down); chooseEvent(down.choices.findIndex(c => /Practice/.test(c.label))); G.dialog = null; G.transit.event = null; seq.push(tick());
    G.transit.lifeUsed = {}; G.transit.flipped = true; G.transit.left = G.transit.total * 0.3;
    const who = G.state.crew.find(id => chatAble(id)); Mods.act('chatWith', who); G.dialog = null; G.transit.event = null; seq.push(tick());
    G.transit = null; h.runsDone = 1; G.mode = 'landed'; seq.push(tick());
    return { seq, did: h.did, last: tutorialHtml() };
  });
  assert.deepEqual([r.seq[0], r.seq[1], r.seq[2]], [0, 1, 2]);
  assert.equal(r.seq[3], 'The Round'); assert.deepEqual(r.seq.slice(4), [3, 4, 5]);
  assert.deepEqual(r.did, { downtime: true, chat: true });
  assert.match(r.last, /Tutorial complete/);
  await done();
});

test('a chat before the downtime counts, and a first run with neither still ends at the dock', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    let st = begin(), h = hired(); sailOut(); h.walked = true; tick();
    h.did = { chat: true }; out.chatOnly = tick();
    h.did = { chat: true, downtime: true }; out.both = tick();
    st = begin(); h = hired(); sailOut(); h.walked = true; tick();
    G.transit = null; h.runsDone = 1; G.mode = 'landed'; out.skipped = tick();
    return out;
  });
  assert.equal(r.chatOnly, 2, 'the downtime step is still waiting'); assert.equal(r.both, 4, 'both done, so the docking step is next');
  assert.equal(r.skipped, 5, 'steps never done are passed once the run is over');
  await done();
});

test('the steps can be skipped, and a save that never had them is left alone', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    begin(); Mods.act('tutorial'); const skipped = G.state.tutorial;
    begin({ tutorial: false }); const before = tutorialHtml(); sailOut(); tick();
    return { skipped, before, after: G.state.tutorial };
  });
  assert.equal(r.skipped, null); assert.equal(r.before, ''); assert.equal(r.after, null);
  await done();
});

test('a captain with no walk-through does not hold up the steps', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    begin({ captainKey: 'imre' }); sailOut();
    return tick();
  });
  assert.equal(r, 2);
  await done();
});
