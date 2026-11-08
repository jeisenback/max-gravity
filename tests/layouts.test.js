'use strict';

// Each hull's interior as data (js/layouts.js, #971): the Ice Hauler as a tower of decks across the thrust, and the functions that place
// rooms, floors, seats and a walk from a layout. In plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { LAYOUTS, layoutOf, layoutRooms, layoutRoom, deckFloor, layoutBox, towerHeight } = load(['js/camera.js', 'js/layouts.js'], {}, ['LAYOUTS', 'layoutOf', 'layoutRooms', 'layoutRoom', 'deckFloor', 'layoutBox', 'towerHeight']);

test('every hull has a layout, its own or the Ice Hauler\'s', () => {
  assert.equal(layoutOf('freighter'), LAYOUTS.freighter);
  assert.equal(layoutOf('corsair'), LAYOUTS.freighter, 'no layout of its own');
  assert.equal(layoutOf(undefined), LAYOUTS.freighter);
});
test('the Ice Hauler has every room once, the old ids kept and the four new ones', () => {
  const ids = layoutRooms(LAYOUTS.freighter).map(r => r.id);
  assert.deepEqual([...ids].sort(), ['airlock', 'berths', 'bridge', 'engine', 'galley', 'gunnery', 'head', 'hold', 'lifesupport', 'medbay', 'workshop']);
  assert.equal(new Set(ids).size, ids.length);
  assert.equal(layoutRoom(LAYOUTS.freighter, 'kitchen'), undefined, 'an unknown room');
  assert.deepEqual(['bridge', 'galley', 'berths', 'gunnery', 'airlock', 'lifesupport', 'engine'].map(id => layoutRoom(LAYOUTS.freighter, id).deck), [0, 1, 2, 3, 4, 5, 6]);
});
test('rooms on a deck stay inside it, do not overlap, and leave the well clear when the deck is split', () => {
  const lay = LAYOUTS.freighter, w0 = lay.well.x - lay.well.w / 2, w1 = lay.well.x + lay.well.w / 2;
  for (const d of lay.decks) {
    const rs = [...d.rooms].sort((a, b) => a.x0 - b.x0);
    rs.forEach((r, i) => { assert.ok(r.x0 >= 0 && r.x1 <= 1 && r.x0 < r.x1, `${r.id} inside`); if (i) assert.ok(rs[i - 1].x1 <= r.x0, `${r.id} clear of ${rs[i - 1].id}`); });
    if (rs.length > 1) assert.ok(rs.every(r => r.x1 <= w0 || r.x0 >= w1), `${d.id}: the well clear`);
  }
});
test('the decks run nose to drive, a deck 100 high on a 12 plate, the tank between the plant and the drive deck', () => {
  const lay = LAYOUTS.freighter;
  assert.equal(deckFloor(lay, 0), 100); assert.equal(deckFloor(lay, 1), 212); assert.equal(deckFloor(lay, 5), 660);
  assert.equal(deckFloor(lay, 6), 660 + 112 + 260, 'the tank under the plant deck');
  const b = layoutBox(lay, 'galley');
  assert.equal(b.x0, 0); assert.ok(Math.abs(b.x1 - 0.48 * 880) < 1e-9); assert.equal(b.top, 112); assert.equal(b.floor, 212);
  assert.equal(layoutBox(lay, 'kitchen'), undefined);
  assert.equal(towerHeight(lay), deckFloor(lay, 6));
});
