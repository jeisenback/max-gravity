'use strict';

// The hand's own station (#1135, parts.js): gun parts the hand buys from their own savings at a port with an outfitter and fits with the
// captain's leave, two slots, kept on the hand's record (h.station) and so into chapter two. Each adds what it says: a check's edge, a fight
// number, a system's wear. The counter is a section of the Port page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const start = () => {
  window.handAt = (o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null; G.state.credits = o.credits === undefined ? 20000 : o.credits;
    if (o.leave !== undefined) hired().stationLeave = o.leave;
    return hired();
  };
};

test('a gunsight costs 4,000 of the hand\'s savings and adds 0.05 to their own move; a feed hits harder and wears fire control faster', async () => {
  const { ev, done } = await open();
  await ev(start);
  const r = await ev(() => {
    const h = handAt({ leave: true }), before = handCheck('eye', 1, 'post'), out = {};
    out.line = buyStation(G.state, h, 'gunsight', 'yard', null); out.left = G.state.credits; out.lift = handCheck('eye', 1, 'post') - before;
    buyStation(G.state, h, 'feed', 'yard', null); out.fight = stationFight(h).dmgMult; out.wear = partWear(G.state, 'fire');
    return out;
  });
  await done();
  assert.equal(r.left, 16000); assert.ok(r.line && /4,000/.test(r.line), r.line);
  assert.ok(Math.abs(r.lift - 0.05) < 1e-9, `${r.lift}`);
  assert.ok(Math.abs(r.fight - 1.08) < 1e-9); assert.ok(Math.abs(r.wear - 1.2) < 1e-9);
});

test('two slots: a third part takes the first one\'s place and a third of its price comes back; no money, no part', async () => {
  const { ev, done } = await open();
  await ev(start);
  const r = await ev(() => {
    const h = handAt({ leave: true, credits: 20000 });
    buyStation(G.state, h, 'harness', 'yard', null); buyStation(G.state, h, 'gunsight', 'yard', null); const before = G.state.credits;
    buyStation(G.state, h, 'liner', 'yard', null);
    const out = { ids: h.station.map(p => p.id), spent: before - G.state.credits };
    G.state.credits = 100; out.broke = buyStation(G.state, h, 'feed', 'yard', null); out.idsAfter = h.station.map(p => p.id);
    return out;
  });
  await done();
  assert.deepEqual(r.ids, ['gunsight', 'liner']); assert.equal(r.spent, 6000 - Math.round(2000 / 3));
  assert.equal(r.broke, null); assert.deepEqual(r.idsAfter, ['gunsight', 'liner']);
});

test('without the captain\'s leave the part waits in the hand\'s bag, fitted when she gives it; a used one is half the price and has its history', async () => {
  const { ev, done } = await open();
  await ev(start);
  const r = await ev(() => {
    const h = handAt({ credits: 20000 }), cap = hiredCaptain(), out = {};
    cap.opinion = 0; out.line = buyStation(G.state, h, 'gunsight', 'yard', null); out.fitted = (h.station || []).length; out.bag = (h.stationBag || []).length;
    cap.opinion = 2; out.fit = fitStation(h, 0, cap); out.fittedAfter = h.station.length; out.leave = !!h.stationLeave;
    const q = PART_QUIRKS.find(x => x.system === 'fire'), before = G.state.credits; buyStation(G.state, h, 'feed', 'used', q);
    out.usedPaid = before - G.state.credits; out.usedQuirk = h.station[h.station.length - 1].quirk && h.station[h.station.length - 1].quirk.id;
    return out;
  });
  await done();
  assert.equal(r.fitted, 0, 'Hester, careful and not yet trusting, says no at first'); assert.equal(r.bag, 1);
  assert.ok(r.fit); assert.equal(r.fittedAfter, 1); assert.equal(r.leave, true, 'once she says yes, she does not need asking again');
  assert.equal(r.usedPaid, 2500); assert.ok(r.usedQuirk);
});

test('the station parts go with the hand into chapter two, and an old save with none shows an empty counter', async () => {
  const { ev, done } = await open();
  await ev(start);
  const r = await ev(() => {
    const h = handAt({ leave: true }); delete h.station; const empty = stationHtml(G.state, h, currentPlanet());
    buyStation(G.state, h, 'gunsight', 'yard', null); const career = careerOf(h);
    h.chapter = 2; const edge = handCheck('eye', 1, 'post');
    return { empty: String(empty), carried: career.station.map(p => p.id), edge, base: check(STAT_BASE + 1, 1, DIFFICULTY.post) };
  });
  await done();
  assert.match(r.empty, /Your station/); assert.deepEqual(r.carried, ['gunsight']);
});

test('the counter: shown at a port with an outfitter, not at one with none; its markup is its golden copy', async () => {
  const { ev, done } = await open();
  await ev(start);
  const r = await ev(() => {
    const h = handAt({ leave: true }), earth = currentPlanet(), mars = SYSTEMS.mars.planets.find(p => p.name === 'Mars');
    buyStation(G.state, h, 'gunsight', 'yard', null);
    G.state.day = 40;  // a day the markup is pinned at (the used part on offer is the day's)
    return { at: String(stationHtml(G.state, h, earth)), none: String(stationHtml(G.state, h, mars)) };
  });
  await done();
  assert.equal(r.none, '', 'no counter with no outfitter');
  const file = path.join(__dirname, 'fixtures', 'station-counter.html');
  if (process.env.PIN_WRITE) fs.writeFileSync(file, r.at + '\n');
  assert.equal(r.at + '\n', fs.readFileSync(file, 'utf8'), 'the counter as pinned (PIN_WRITE=1 to write it again, and read the diff)');
});

test('a used station part has its catch: its quirk\'s minus counts (a faster-wearing fire control, a weaker one), and its offer says so', async () => {
  const { ev, done } = await open();
  await ev(start);
  const r = await ev(() => {
    const h = handAt({ leave: true, credits: 20000 }), out = {};
    const feedQ = PART_QUIRKS.find(q => q.id === 'cutter-feed'), boardQ = PART_QUIRKS.find(q => q.id === 'raider-board');
    buyStation(G.state, h, 'gunsight', 'used', feedQ); out.wear = partWear(G.state, 'fire');
    h.station = []; buyStation(G.state, h, 'gunsight', 'used', boardQ); out.perf = perf('fire');
    out.harnessUsed = !!stationPart('gunner', 'harness').used;
    const boneyard = SYSTEMS.hygiea.planets.find(p => p.name === 'Boneyard'); out.html = stationHtml(G.state, h, boneyard);
    return out;
  });
  await done();
  assert.ok(Math.abs(r.wear - 1.25) < 1e-9, `the feed's minus: fire control wears 1.25 (${r.wear})`);
  assert.ok(Math.abs(r.perf - 0.95) < 1e-9, `the board's minus: fire control at 0.95 (${r.perf})`);
  assert.equal(r.harnessUsed, false, 'a harness is no fire-control part: sold new only');
  assert.match(r.html, /but /, 'a used offer says its catch');
});
