'use strict';

// Downtime as a scene (docs/superpowers/specs/2026-11-12-downtime-scene-design.md): once a slot, at a change of the ship's day, one scene
// says what's on in the ship; each choice is tagged where it happens; comms lines fade over the ship.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { closeBrowser } = require('./helpers');

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
