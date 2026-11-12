'use strict';

// Downtime as a scene (docs/superpowers/specs/2026-11-12-downtime-scene-design.md): once a slot, at a change of the ship's day, one scene
// says what's on in the ship; each choice is tagged where it happens; comms lines fade over the ship.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { downtimeDue, sitPerson, onDeck, shipDay, SHIP_DAY, DOWNTIME_BLOCKS } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'],
  { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['downtimeDue', 'sitPerson', 'onDeck', 'shipDay', 'SHIP_DAY', 'DOWNTIME_BLOCKS']);
const plain = x => JSON.parse(JSON.stringify(x));

// ---------- the pure rules (task 1) ----------

test('the downtime scene is due at a change to breakfast, a shift, the meal or supper, once a slot', () => {
  const t = { total: 100, left: 90, slots: 2 };  // the 'before' slot
  assert.equal(downtimeDue(t, 'shift', 'breakfast'), true);
  assert.equal(downtimeDue(t, 'shift', 'shift'), false, 'no change');
  for (const b of ['handover', 'night', 'wake']) assert.equal(downtimeDue(t, b, 'supper'), false, b);
  assert.equal(downtimeDue({ ...t, lifeOffered: { before: true } }, 'meal', 'shift'), false, 'offered');
  assert.equal(downtimeDue({ ...t, lifeUsed: { before: true } }, 'meal', 'shift'), false, 'spent');
  assert.equal(downtimeDue({ ...t, lifeOffered: { before: true }, left: 40, flipped: true }, 'meal', 'shift'), true, 'the next slot');
});

test('the shortest slot still has a change that is due', () => {
  // a 2-slot burn of 1.2 ship days: each slot, 0.6 ship days long, holds at least one start of breakfast, a shift, the meal or supper
  for (let start = 0; start < SHIP_DAY; start += 4) {
    const blocks = []; for (let e = start; e < start + 0.6 * SHIP_DAY; e += 0.5) blocks.push(shipDay(e).block);
    assert.ok(blocks.some((b, i) => i && b !== blocks[i - 1] && DOWNTIME_BLOCKS.includes(b)), `from ${start}`);
  }
});

test('sit with someone: one having a hard time or hurt first, else by the day', () => {
  const c = [{ id: 'a' }, { id: 'b' }, { id: 'c', low: true }];
  assert.equal(sitPerson(c, 0).id, 'c');
  assert.equal(sitPerson([{ id: 'a' }, { id: 'b', hurt: true }], 4).id, 'b');
  assert.equal(sitPerson([{ id: 'a' }, { id: 'b' }], 3).id, 'b');
  assert.equal(sitPerson([], 1), null);
});

test('onDeck: a room for a place, an id for a person, nothing without a where', () => {
  const people = [{ id: 'c:ines', role: 'pilot' }];
  assert.deepEqual(plain(onDeck([{ label: 'Cards', where: 'galley' }, { label: 'Ask', where: ps => ps[0].id }, { label: 'X' }, { label: 'Y', where: () => null }], people)),
    [{ label: 'Cards', room: 'galley' }, { label: 'Ask', id: 'c:ines' }]);
});

// ---------- what's on, and where (task 2) ----------

// A hired hand on a burn, in the move phase, with the cutaway's people built; a passenger aboard when `pax`.
const burnHelpers = () => {
  window.onBurn = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.7; t.times = []; t.chatter = 1e9; t.aboard = null; shipPeople();
    return t;
  };
};

test('every activity a burn can offer says what is on, and where it is', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(burnHelpers);
  const r = await ev(() => {
    onBurn(); G.state.armor = Math.max(1, ship().armor - 50);  // the repair is on
    const people = shipPeople(), ids = new Set([...people.map(p => p.id).filter(Boolean), ...G.state.crew, hired().captain]), rooms = new Set(ROOMS.map(x => x.id)), bad = [];
    const all = [...Object.values(ACTIVITIES), ...handDowntime(), ...HAND_DOWNTIME.filter(d => d.cast), ...onNow()];
    for (const a of all) {
      const label = activityLabel(a);
      if (typeof a.on !== 'function') { bad.push(`${label}: no on()`); continue; }
      if (a.can && !a.can()) continue;
      const on = a.on();
      if (!on || /[{}]/.test(on)) bad.push(`${label}: on() ${on}`);
      const w = typeof a.where === 'function' ? a.where(people) : a.where;
      if (a.where !== undefined && !(rooms.has(w) || ids.has(w) || (w && G.state.people[w]))) bad.push(`${label}: where ${w}`);
    }
    return bad;
  });
  await done();
  assert.deepEqual(r, []);
});

test('the paid odd jobs are gone', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ labels: HAND_DOWNTIME.map(d => activityLabel(d)), keys: Object.keys(SCENE_LINES['scene:downtime']) }));
  await done();
  assert.ok(!r.labels.some(l => /Mend|spare watch/i.test(l)), r.labels.join(' / '));
  assert.ok(!r.keys.some(k => /^(mend|spare)\./.test(k)), r.keys.filter(k => /^(mend|spare)/.test(k)).join(' '));
});

test('a shadowed or taught mate is the same in the line, the tag and the run', async () => {
  const { ev, done } = await open();
  await ev(burnHelpers);
  const r = await ev(() => {
    onBurn(); const people = shipPeople(), out = {};
    for (const key of ['shadow', 'teach']) {
      const a = HAND_DOWNTIME.find(d => activityLabel(d) === sceneSay('scene:downtime', `${key}.label`));
      if (!a.can()) { out[key] = 'cannot'; continue; }
      const id = a.where(people), p = person(id), before = JSON.stringify([p.opinion, p.memories, p.arc]), on = a.on();
      const text = a.run();
      out[key] = { named: on.includes(p.first), told: text.includes(p.first), liked: JSON.stringify([p.opinion, p.memories, p.arc]) !== before };
    }
    return out;
  });
  await done();
  for (const k of ['shadow', 'teach']) assert.deepEqual(r[k], { named: true, told: true, liked: true }, k);
});
