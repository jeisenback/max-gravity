'use strict';

// Each hull's interior as data (js/layouts.js, #971): the Ice Hauler as a tower of decks across the thrust, and the functions that place
// rooms, floors, seats and a walk from a layout. In plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { LAYOUTS, layoutOf, layoutRooms, layoutRoom, deckFloor, layoutBox, towerHeight, seatX, layoutRoomAt, walkPath } = load(['js/camera.js', 'js/layouts.js'], {}, ['LAYOUTS', 'layoutOf', 'layoutRooms', 'layoutRoom', 'deckFloor', 'layoutBox', 'towerHeight', 'seatX', 'layoutRoomAt', 'walkPath']);
const plain = v => JSON.parse(JSON.stringify(v));  // out of the vm context, so deepEqual compares plain objects

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
test('seats sit in their room and never in the well', () => {
  const lay = LAYOUTS.freighter, w = lay.width, w0 = (lay.well.x - lay.well.w / 2) * w, w1 = (lay.well.x + lay.well.w / 2) * w;
  for (const [id, shares] of Object.entries(lay.seats)) shares.forEach((_, k) => {
    const x = seatX(lay, id, k), b = layoutBox(lay, id);
    assert.ok(x > b.x0 && x < b.x1, `${id} seat ${k} in the room`); assert.ok(x < w0 || x > w1, `${id} seat ${k} clear of the well`);
  });
  assert.ok(Math.abs(seatX(lay, 'galley', 0) - 0.28 * 0.48 * 880) < 1e-9);
  assert.equal(seatX(lay, 'galley', 9), undefined); assert.equal(seatX(lay, 'kitchen', 0), undefined);
});
test('the room at a point: the room on that deck, none in the well of a split deck', () => {
  const lay = LAYOUTS.freighter;
  assert.equal(layoutRoomAt(lay, 1, 100), 'galley'); assert.equal(layoutRoomAt(lay, 1, 800), 'head');
  assert.equal(layoutRoomAt(lay, 1, 440), null, 'the well'); assert.equal(layoutRoomAt(lay, 2, 440), 'berths', 'a full-width deck');
  assert.equal(layoutRoomAt(lay, 9, 100), null); assert.equal(layoutRoomAt(lay, 1, -5), null);
});
test('a walk stays on its deck, or goes by the well and climbs once, the tank included', () => {
  const lay = LAYOUTS.freighter;
  assert.deepEqual(plain(walkPath(lay, { deck: 1, x: 100 }, { deck: 1, x: 800 })), [{ deck: 1, x: 800 }], 'no detour on one deck');
  assert.deepEqual(plain(walkPath(lay, { deck: 1, x: 100 }, { deck: 6, x: 700 })), [{ deck: 1, x: 440 }, { deck: 6, x: 440 }, { deck: 6, x: 700 }], 'down the well and the tube to the drive deck');
  assert.deepEqual(plain(walkPath(lay, { deck: 3, x: 440 }, { deck: 3, x: 440 })), [{ deck: 3, x: 440 }]);
});
