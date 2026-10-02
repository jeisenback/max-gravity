'use strict';

// The interview screen (interview.js): a bar candidate's real data, answers from their traits, hiring from it, owners only.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (mode = 'owner') => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode, post: 'gunner' }); while (G.dialog) finishEvent(); const st = G.state; st.tutorial = null; st.story.next = 1e9; st.flags.classicCombat = true; };
  window.act = (a, arg) => { Mods.act(a, arg) || UI.act(a, arg); };
};

test('the screen shows the candidate, the answers match their traits, and hiring from it works', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {};
    G.bar = [makeCrewCandidate(st.systemId)]; const c = G.bar[0]; c.traits = ['kind', 'brave']; c.goal = 'home'; c.secret = 'debt'; c.fee = 100; st.credits = 5000;
    out.btn = UI.views.bar && /Interview/.test(barHtml());
    act('interview', 0); out.tab = UI.tab;
    out.before = UI.views.person();
    for (const i of [0, 1, 2]) act('interviewAsk', i);
    out.after = UI.views.person(); out.name = fullName(c); out.fee = c.fee;
    const crew = st.crew.length, cr = st.credits;
    act('interviewHire');
    out.crew = st.crew.length - crew; out.paid = cr - st.credits; out.left = G.bar.length; out.hired = person(st.crew[st.crew.length - 1]).first === c.first;
    return out;
  });
  assert.ok(r.btn); assert.equal(r.tab, 'person');
  assert.ok(r.before.includes(r.name) && r.before.includes('ask them') && !/going home|get home/.test(r.before));
  assert.match(r.after, /get home/); assert.match(r.after, /bad day/); assert.match(r.after, /nearest it/); assert.match(r.after, /people I owe|owe/); assert.match(r.after, /kind/);
  assert.equal(r.crew, 1); assert.equal(r.paid, 100); assert.equal(r.left, 0); assert.ok(r.hired);
  await done();
});

test('a hired hand has no interview and cannot hire', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start('hired'); const st = G.state, out = {};
    G.bar = [makeCrewCandidate(st.systemId)]; st.credits = 99999;
    out.html = barHtml(); const n = st.crew.length;
    G.viewPerson = 'bar:0'; act('interviewHire'); out.crew = st.crew.length - n;
    return out;
  });
  assert.ok(!/Interview/.test(r.html)); assert.equal(r.crew, 0);
  await done();
});
