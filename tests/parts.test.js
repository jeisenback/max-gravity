'use strict';

// Parts (#1135, js/parts.js): each of the ship's systems has one fitted part, from a yard, used or printed; its price is a share of the yard's
// (today's overhaul), it puts the system back to its source's mark, and it sets how fast the system wears after. A system with no fitted part
// has its original yard part, so an old save wears as it did.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const parts = () => load(['js/util.js', 'js/parts.js'], { Mods: { register() {} } }, ['PART_SOURCES', 'partPrice', 'fittedPart', 'fitPart', 'partWear']);

test('a part costs its source\'s share of the yard\'s price, which is today\'s overhaul', () => {
  const { partPrice } = parts();
  assert.equal(partPrice(40, 'yard'), 4800);
  assert.equal(partPrice(40, 'used'), 2160);
  assert.equal(partPrice(40, 'printed'), 960);
});

test('a system with no fitted part has its original yard part; a printed part restores to 85 and wears at 1.75', () => {
  const { fittedPart, fitPart, partWear } = parts();
  assert.deepEqual(JSON.parse(JSON.stringify(fittedPart({}, 'drive'))), { source: 'yard', quirk: null, day: 0 });
  assert.equal(partWear({}, 'drive'), 1);
  const st = { condition: { drive: 40 } };
  fitPart(st, 'drive', 'printed', null, 5);
  assert.equal(st.condition.drive, 85);
  assert.equal(partWear(st, 'drive'), 1.75);
  fitPart(st, 'drive', 'used', null, 6); assert.equal(st.condition.drive, 90, 'a used part restores to 90');
  st.condition.drive = 95; fitPart(st, 'drive', 'printed', null, 7); assert.equal(st.condition.drive, 95, 'never takes a system down');
});

test('in the game a printed drive wears 1.75 times a yard one, nothing wears with wear off, and a new chapter\'s ship has no parts fitted', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, c = condition(), out = {};
    Settings.wear = 'slow';
    c.drive = 80; wear('drive', 1); out.yard = 80 - c.drive;
    fitPart(st, 'drive', 'printed', null, st.day); c.drive = 80; wear('drive', 1); out.printed = 80 - c.drive;
    Settings.wear = 'off'; c.drive = 80; wear('drive', 1); out.off = 80 - c.drive; Settings.wear = 'slow';
    st.parts = { drive: { source: 'printed', quirk: null, day: 1 } };
    chapterTwoShip(st);  // the co-op's hull (hired.js), as the chapter two start makes her
    out.after = st.parts || null;
    return out;
  });
  await done();
  assert.equal(r.yard, 1); assert.equal(r.printed, 1.75); assert.equal(r.off, 0);
  assert.ok(!r.after || Object.keys(r.after).length === 0, 'the co-op\'s ship has no parts fitted');
});

// ---------- used parts and their quirks (Task 2) ----------

const quirks = () => load(['js/util.js', 'js/parts.js'], { Mods: { register() {} } }, ['PART_QUIRKS', 'PART_SOURCES', 'usedPartAt', 'fitPart', 'partWear', 'partEffect', 'partFight', 'partEdge']);
const SYSTEMS5 = ['drive', 'fire', 'shields', 'life', 'sensors'];
const port = (name, services = ['trade', 'outfitter', 'refuel']) => ({ name, services });

test('three used parts a system, each with where it came from, a plus and a minus', () => {
  const { PART_QUIRKS } = quirks();
  for (const sys of SYSTEMS5) assert.equal(PART_QUIRKS.filter(q => q.system === sys).length, 3, sys);
  for (const q of PART_QUIRKS) { assert.ok(q.id && q.from && q.from.length > 10, q.id); assert.ok(q.plus && q.minus, q.id); }
  assert.equal(new Set(PART_QUIRKS.map(q => q.id)).size, PART_QUIRKS.length, 'unique ids');
});

test('a port with an outfitter has a used part on about half the days, the same for a port and a day; the Boneyard and Phobos Yards always; none with no outfitter', () => {
  const { usedPartAt } = quirks();
  const mars = port('Mars'), days = Array.from({ length: 60 }, (_, d) => d), on = days.filter(d => usedPartAt(mars, d, 'drive'));
  assert.ok(on.length > 15 && on.length < 45, `about half the days (${on.length} of 60)`);
  assert.deepEqual(usedPartAt(mars, 7, 'drive'), usedPartAt(mars, 7, 'drive'), 'the same for a port and a day');
  assert.ok(days.some(d => JSON.stringify(usedPartAt(mars, d, 'drive')) !== JSON.stringify(usedPartAt(port('Titan'), d, 'drive'))), 'ports differ');
  for (const d of days) { assert.ok(usedPartAt(port('Boneyard'), d, 'fire'), 'the Boneyard always'); assert.ok(usedPartAt(port('Phobos Yards', ['shipyard', 'outfitter']), d, 'fire'), 'Phobos Yards always'); }
  assert.equal(usedPartAt(port('Luna', ['missions', 'refuel']), 3, 'drive'), null, 'no outfitter, no part');
  const q = usedPartAt(port('Boneyard'), 3, 'sensors'); assert.equal(q.system, 'sensors', 'a quirk for the system asked');
});

test('a fitted quirk\'s wear and perf factors are its system\'s; its fight numbers and edge count for the ship', () => {
  const { fitPart, partWear, partEffect, partFight, partEdge } = quirks();
  const st = { condition: {} };
  fitPart(st, 'drive', 'used', { id: 't1', system: 'drive', from: 'test', plus: { wear: 0.8 }, minus: { perf: 0.95 } }, 1);
  assert.equal(partWear(st, 'drive'), 0.8); assert.equal(partEffect(st, 'drive', 'perf'), 0.95); assert.equal(partEffect(st, 'life', 'wear'), 1);
  fitPart(st, 'fire', 'printed', { id: 't2', system: 'fire', from: 'test', plus: { fight: { dmgMult: 1.1 } }, minus: { edge: { post: -0.05 } } }, 1);
  assert.ok(Math.abs(partWear(st, 'fire') - 1.75) < 1e-9, 'a printed part with no wear quirk');
  assert.deepEqual(JSON.parse(JSON.stringify(partFight(st))), { dmgMult: 1.1, shields: 1 });
  assert.equal(partEdge(st, 'post'), -0.05); assert.equal(partEdge(st, 'word'), 0);
});

test('a fitted quirk\'s edge reaches the hand\'s check, and its perf the system\'s, capped at 1.05', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, before = handCheck('eye', 1, 'post');
    fitPart(st, 'fire', 'used', { id: 't', system: 'fire', from: 'test', plus: { edge: { post: 0.05 } }, minus: { perf: 1.2 } }, st.day);
    return { lift: handCheck('eye', 1, 'post') - before, perf: perf('fire') };
  });
  await done();
  assert.ok(Math.abs(r.lift - 0.05) < 1e-9, `the check +0.05 (${r.lift})`);
  assert.equal(r.perf, 1.05, 'perf capped at 1.05');
});

// ---------- the owner's and the co-op's overhaul (Task 5) ----------

test('the co-op\'s overhaul offers a yard part at today\'s price, a used one with its history when the port has one, and a printed one; a hand in chapter one is offered none', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const out = {}, c = condition();
    c.drive = 50; out.hand = (wearHtml().match(/data-action="overhaul"/g) || []).length;
    hired().chapter = 2; G.mode = 'landed'; G.state.credits = 100000;
    const planet = currentPlanet(); let day = G.state.day; while (!usedPartAt(planet, day, 'drive')) day++; G.state.day = day;
    const html = wearHtml(); out.args = [...html.matchAll(/data-action="overhaul" data-arg="([^"]+)"/g)].map(m => m[1]).filter(a => a.startsWith('drive'));
    out.yardPrice = overhaulCost('drive'); out.hasYardPrice = html.includes(fmt(overhaulCost('drive')));
    out.from = usedPartAt(planet, day, 'drive').from; out.hasFrom = html.includes(out.from.split(',')[0]);
    const before = G.state.credits; Mods.act('overhaul', 'drive:used');
    out.paid = before - G.state.credits; out.price = partPrice(50, 'used'); out.after = condition().drive; out.fitted = fittedPart(G.state, 'drive').source;
    return out;
  });
  await done();
  assert.equal(r.hand, 0, 'a hand in chapter one does not overhaul');
  assert.deepEqual(r.args, ['drive', 'drive:used', 'drive:printed'], 'the yard part keeps the bare system, as before');
  assert.ok(r.hasYardPrice, 'the yard part at today\'s price'); assert.ok(r.hasFrom, 'the used part says where it came from');
  assert.equal(r.paid, r.price); assert.equal(r.after, 90); assert.equal(r.fitted, 'used');
});

test('an overhaul offers no source that would leave the system worse than it is: none above a printed part\'s 85 or a used part\'s 90', () => {
  const { partsOffers } = load(['js/util.js', 'js/parts.js'], { Mods: { register() {} } }, ['partsOffers']);
  const boneyard = { name: 'Boneyard', services: ['trade', 'outfitter'] }, sources = cond => [...partsOffers({ condition: { drive: cond } }, boneyard, 'drive', 1).map(o => o.source)];
  assert.deepEqual(sources(50), ['yard', 'used', 'printed']);
  assert.deepEqual(sources(87), ['yard', 'used'], 'at 87 a printed part (85) would take it down');
  assert.deepEqual(sources(95), ['yard'], 'at 95 only a new part puts it right');
});
