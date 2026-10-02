'use strict';

// What comes of the hand-written burn events: second beats, and follow-ups that arrive some days later.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const burn = () => { G.state.tutorial = null; G.state.story.next = 1e9; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; };

test('a follow-up waits for its days, plays once, and a second beat is only reached from its event', async () => {
  const { ev, done } = await open();
  const r = await ev(burn => {
    (0, eval)(`(${burn})`)();
    const st = G.state, out = {};
    const beats = STORYLETS.filter(s => s.chained).map(s => s.id), afters = STORYLETS.filter(s => s.consumes).map(s => s.id);
    out.counts = [beats.length, afters.length];
    // A second beat is never picked as a scene of its own.
    let picked = false; for (let i = 0; i < 300; i++) { const s = pickStorylet('transit'); if (s && s.chained) picked = true; }
    out.beatPicked = picked;
    // A follow-up: not before its days, then first in line, then once.
    applyEffects({ later: { 'dc-voss': 14 } });
    out.early = meets({ due: 'dc-voss' }) || !!pickStorylet('transit', s => s.id === 'dc-voss');
    st.day += 13; out.dayBefore = meets({ due: 'dc-voss' });
    st.day += 1; out.dayOn = meets({ due: 'dc-voss' });
    const s = pickStorylet('transit', x => x.consumes); out.picked = s && s.id;  // (an ice strike scene of the same priority may share the turn)
    storyletEvent(STORYLETS.find(x => x.id === 'dc-voss'));
    out.after = meets({ due: 'dc-voss' });
    // Set going twice, it plays twice.
    applyEffects({ later: { 'dc-voss': 1 } }); st.day += 1; out.again = meets({ due: 'dc-voss' });
    return out;
  }, burn.toString());
  assert.deepEqual(r.counts, [7, 18]);
  assert.equal(r.beatPicked, false);
  assert.equal(r.early, false); assert.equal(r.dayBefore, false); assert.equal(r.dayOn, true);
  assert.equal(r.picked, 'dc-voss', 'a follow-up that is due is a scene to play');
  assert.equal(r.after, false); assert.equal(r.again, true);
  await done();
});

test('every second beat and every follow-up plays every choice, with clean text', async () => {
  const { ev, done } = await open();
  const r = await ev(burn => {
    (0, eval)(`(${burn})`)();
    const bad = [], seen = [];
    for (const s of STORYLETS.filter(x => x.chained || x.consumes)) {
      const n = storyletEvent(s).choices.length;
      for (let i = 0; i < n; i++) {
        G.state.credits = 5000; G.state.fuel = 200; G.state.armor = 100; G.state.cargo = {}; G.state.qualities = {};
        const e = storyletEvent(s), c = e.choices[i];
        if (c.can && !c.can()) continue;
        const text = String(c.run());
        if (/undefined|NaN|\[object|\{[a-z]+\}/.test(e.title + e.text + c.label + text)) bad.push(`${s.id}#${i}: ${text.slice(0, 80)}`);
        seen.push(`${s.id}#${i}`);
        G.nextEvent = null;
      }
    }
    return { bad, n: seen.length };
  }, burn.toString());
  assert.deepEqual(r.bad, []);
  assert.ok(r.n >= 50, `played ${r.n} branches`);
  await done();
});

test('distress call: help, ask for a letter, and the letter pays fourteen days later, with a Journal line', async () => {
  const { ev, done } = await open();
  const r = await ev(burn => {
    (0, eval)(`(${burn})`)();
    const st = G.state, out = {}, call = TRANSIT_EVENTS.find(e => e.title === 'Distress Call');
    Math.random = () => 0.1;  // the yacht is real
    G.dialog = null; openEvent(call); chooseEvent(0);
    out.next = G.nextEvent && G.nextEvent.title;
    const offer = G.nextEvent; G.nextEvent = null; G.dialog = { event: offer, choices: offer.choices };
    const j0 = (st.journal || []).length, c0 = st.credits;
    chooseEvent(1);
    out.cash = st.credits - c0; out.journal = (st.journal || []).length - j0; out.due = quality('due:dc-voss') - st.day;
    st.day += 13; out.early = (pickStorylet('transit', x => x.consumes) || {}).id;
    st.day += 1; const s = pickStorylet('transit', x => x.consumes); out.second = s && s.id;
    const e = storyletEvent(s); G.dialog = { event: e, choices: e.choices }; const c1 = st.credits; chooseEvent(0); out.paid = st.credits - c1;
    return out;
  }, burn.toString());
  assert.equal(r.next, 'The Owner');
  assert.equal(r.cash, 0, 'the letter is instead of cash'); assert.equal(r.journal, 1); assert.equal(r.due, 14);
  assert.notEqual(r.early, 'dc-voss'); assert.equal(r.second, 'dc-voss'); assert.equal(r.paid, 4000);
  await done();
});

test('distress call: a bait leads on to the raiders, and a fight there starts a follow-up', async () => {
  const { ev, done } = await open();
  const r = await ev(burn => {
    (0, eval)(`(${burn})`)();
    const st = G.state, out = {}, call = TRANSIT_EVENTS.find(e => e.title === 'Distress Call');
    Math.random = () => 0.9;  // it was bait
    G.dialog = null; openEvent(call); chooseEvent(0);
    out.next = G.nextEvent && G.nextEvent.title;
    const e = G.nextEvent; G.nextEvent = null; G.dialog = { event: e, choices: e.choices }; G.player.armor = G.player.maxArmor; chooseEvent(1);
    out.due = quality('due:dc-lure') - st.day; out.hurt = G.player.armor < G.player.maxArmor;
    return out;
  }, burn.toString());
  assert.equal(r.next, 'They Follow You'); assert.equal(r.due, 12); assert.ok(r.hurt);
  await done();
});

test('paying for protection keeps the pirates away for forty days', async () => {
  const { ev, done } = await open();
  const r = await ev(burn => {
    (0, eval)(`(${burn})`)();
    const st = G.state, t = G.transit, out = {};
    const hasPirates = () => { let found = false; for (let i = 0; i < 400 && !found; i++) { t.seen = []; st.eventSeen = {}; G.dialog = null; t.event = null; const e = pickHappening('transit'); if (e && e.title === 'Pirates Matching Course') found = true; } return found; };
    out.before = hasPirates();
    const s = STORYLETS.find(x => x.id === 'pi-subscription');
    applyEffects({ later: { 'pi-subscription': 1 } }); st.day += 1; st.credits = 5000;
    const e = storyletEvent(s); G.dialog = { event: e, choices: e.choices }; chooseEvent(0);
    out.safe = !hasPirates(); out.paid = st.credits;
    st.day += 41; out.after = hasPirates();
    return out;
  }, burn.toString());
  assert.equal(r.before, true); assert.equal(r.safe, true, 'no pirates while protected'); assert.equal(r.paid, 4500); assert.equal(r.after, true, 'and they are back after');
  await done();
});

test('a hired hand never meets the owner\'s chains, and an old save with no follow-ups plays on', async () => {
  const { ev, done } = await open();
  const r = await ev(burn => {
    startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    (0, eval)(`(${burn})`)();
    const st = G.state, t = G.transit, titles = new Set();
    st.qualities = undefined;  // a save from before follow-ups
    for (let i = 0; i < 400; i++) { t.seen = []; st.eventSeen = {}; G.dialog = null; t.event = null; const e = pickHappening('transit'); if (e) titles.add(e.title); }
    const ownerChains = ['Where To?', 'The Sealed Case', 'The Owner', 'What the Broom Heard', 'A Laundry Parcel'];
    return { titles: [...titles].filter(x => ownerChains.includes(x)), n: titles.size };
  }, burn.toString());
  assert.deepEqual(r.titles, []); assert.ok(r.n >= 5);
  await done();
});
