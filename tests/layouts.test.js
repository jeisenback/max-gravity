'use strict';

// Each hull's interior as data (js/layouts.js, #971): the Ice Hauler as a tower of decks across the thrust, and the functions that place
// rooms, floors, seats and a walk from a layout. In plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { LAYOUTS, layoutOf, layoutRooms, layoutRoom, deckFloor, layoutBox, towerHeight, seatX, layoutRoomAt, walkPath, deckSpots, deckSpot, spotLinks, spotHatch, spotPath, inLine, boardLayout } = load(['js/camera.js', 'js/layouts.js'], {}, ['LAYOUTS', 'layoutOf', 'layoutRooms', 'layoutRoom', 'deckFloor', 'layoutBox', 'towerHeight', 'seatX', 'layoutRoomAt', 'walkPath', 'deckSpots', 'deckSpot', 'spotLinks', 'spotHatch', 'spotPath', 'inLine', 'boardLayout']);
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
  assert.equal(b.x0, 0); assert.ok(Math.abs(b.x1 - 0.48 * 720) < 1e-9); assert.equal(b.top, 112); assert.equal(b.floor, 212);
  assert.equal(layoutBox(lay, 'kitchen'), undefined);
  assert.equal(towerHeight(lay), deckFloor(lay, 6));
});
test('seats sit in their room and never in the well', () => {
  const lay = LAYOUTS.freighter, w = lay.width, w0 = (lay.well.x - lay.well.w / 2) * w, w1 = (lay.well.x + lay.well.w / 2) * w;
  for (const [id, shares] of Object.entries(lay.seats)) shares.forEach((_, k) => {
    const x = seatX(lay, id, k), b = layoutBox(lay, id);
    assert.ok(x > b.x0 && x < b.x1, `${id} seat ${k} in the room`); assert.ok(x < w0 || x > w1, `${id} seat ${k} clear of the well`);
  });
  assert.ok(Math.abs(seatX(lay, 'galley', 0) - 0.28 * 0.48 * 720) < 1e-9);
  assert.equal(seatX(lay, 'galley', 9), undefined); assert.equal(seatX(lay, 'kitchen', 0), undefined);
});
test('the room at a point: the room on that deck, none in the well of a split deck', () => {
  const lay = LAYOUTS.freighter;
  assert.equal(layoutRoomAt(lay, 1, 100), 'galley'); assert.equal(layoutRoomAt(lay, 1, 650), 'head'); assert.equal(layoutRoomAt(lay, 1, 730), null, 'past the hull');
  assert.equal(layoutRoomAt(lay, 1, 360), null, 'the well'); assert.equal(layoutRoomAt(lay, 2, 360), 'berths', 'a full-width deck');
  assert.equal(layoutRoomAt(lay, 9, 100), null); assert.equal(layoutRoomAt(lay, 1, -5), null);
});
test('a walk stays on its deck, or goes by the well and climbs once, the tank included', () => {
  const lay = LAYOUTS.freighter;
  assert.deepEqual(plain(walkPath(lay, { deck: 1, x: 100 }, { deck: 1, x: 650 })), [{ deck: 1, x: 650 }], 'no detour on one deck');
  assert.deepEqual(plain(walkPath(lay, { deck: 1, x: 100 }, { deck: 6, x: 650 })), [{ deck: 1, x: 360 }, { deck: 6, x: 360 }, { deck: 6, x: 650 }], 'down the well and the tube to the drive deck');
  assert.deepEqual(plain(walkPath(lay, { deck: 3, x: 360 }, { deck: 3, x: 360 })), [{ deck: 3, x: 360 }]);
});

// ---------- the decks in a boarding (#1351, docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md, "The decks") ----------

const BOARDED = ['freighter', 'raider', 'corsair'];
// The room a spot stands in (a well spot stands in none on a split deck).
const roomOf = (lay, p) => layoutRoomAt(lay, p.deck, p.x * lay.width);

test('every spot of each boarding layout is a place on a deck, with cover 0 to 2, a name and an id of its own, and a well spot on every deck', () => {
  for (const id of BOARDED) {
    const lay = LAYOUTS[id], spots = deckSpots(lay);
    assert.equal(new Set(spots.map(p => p.id)).size, spots.length, `${id}: unique ids`);
    for (const p of spots) {
      assert.ok(Number.isInteger(p.deck) && p.deck >= 0 && p.deck < lay.decks.length, `${id} ${p.id}: on a deck`);
      assert.ok(p.x > 0 && p.x < 1 && [0, 1, 2].includes(p.cover) && p.name, `${id} ${p.id}: a place, its cover and its name`);
    }
    lay.decks.forEach((_, d) => assert.deepEqual(plain(spots.filter(p => p.deck === d && p.well).map(p => [p.id, p.cover])), [[`w${d}`, 0]], `${id}: one well spot on deck ${d}, with no cover`));
    assert.equal(deckSpot(lay, 'w0').well, true); assert.equal(deckSpot(lay, 'nowhere'), undefined);
  }
});

test('every spot is reachable from the outer door, and every room has two to four spots', () => {
  for (const id of BOARDED) {
    const lay = LAYOUTS[id], spots = deckSpots(lay);
    for (const p of spots) assert.ok(spotPath(lay, 'outer', [p.id]), `${id}: ${p.id} reachable from the outer door`);
    for (const r of layoutRooms(lay)) {
      const n = spots.filter(p => !p.well && roomOf(lay, p) === r.id).length;
      assert.ok(n >= 2 && n <= 4, `${id} ${r.id}: ${n} spots`);
    }
    assert.ok(spots.filter(p => !p.well).every(p => roomOf(lay, p)), `${id}: every spot stands in a room`);
  }
  const lay = LAYOUTS.freighter;
  assert.deepEqual(plain(spotPath(lay, 'outer', ['outer'])), { next: null, dist: 0 }, 'already there');
  assert.deepEqual(plain(spotPath(lay, 'outer', ['helm'])), { next: 'inner', dist: 7 }, 'the airlock to the helm: in from the outer door, the well up four decks, out to the helm');
  assert.equal(spotPath(lay, 'outer', ['helm'], {}, { inner: true }), null, 'the inner door held: no way through');
});

test('the moves: along a side of a deck to the well, and up and down the well one deck at a time', () => {
  const lay = LAYOUTS.freighter, links = plain(spotLinks(lay));
  assert.deepEqual(links.inner.sort(), ['outer', 'w4'], 'the inner door: back to the outer door and on to the well');
  assert.deepEqual(links.w4.sort(), ['inner', 'medbed', 'w3', 'w5'], 'the well at the lock deck: the innermost on each side, and the decks above and below');
  assert.deepEqual(links.w0.sort(), ['helm', 'nav', 'w1'], 'the top of the well');
  for (const [a, bs] of Object.entries(links)) for (const b of bs) assert.ok(links[b].includes(a), `${a} and ${b} both ways`);
  assert.equal(spotHatch(lay, 'w3', 'w4'), 'h3'); assert.equal(spotHatch(lay, 'w4', 'w3'), 'h3');
  assert.equal(spotHatch(lay, 'w2', 'w4'), null, 'two decks apart'); assert.equal(spotHatch(lay, 'inner', 'w4'), null, 'not in the well');
});

test('a sealed hatch cuts the path through the well and the line of fire through it', () => {
  const lay = LAYOUTS.freighter;
  assert.ok(inLine(lay, 'w3', 'w4')); assert.equal(inLine(lay, 'w3', 'w4', { h3: true }), false, 'a line of fire through a sealed hatch');
  assert.equal(spotPath(lay, 'outer', ['helm'], { h3: true }), null, 'the hatch above the lock deck sealed: no way up');
  assert.ok(spotPath(lay, 'outer', ['crates'], { h3: true }), 'and the decks below still open');
  assert.equal(spotPath(lay, 'outer', ['crates'], { h3: true, h4: true }), null, 'both sealed: the airlock is cut off');
});

test('a line of fire runs along a deck and one deck up or down the well, never two decks', () => {
  const lay = LAYOUTS.freighter;
  assert.ok(inLine(lay, 'table', 'shower'), 'across the mess deck, room to room');
  assert.ok(inLine(lay, 'w1', 'w2') && inLine(lay, 'w2', 'w1'), 'one deck down the well, either way');
  assert.equal(inLine(lay, 'w1', 'w3'), false, 'two decks down the well');
  assert.equal(inLine(lay, 'table', 'w2'), false, 'from a room to the well of the deck below');
  assert.equal(inLine(lay, 'table', 'table'), false, 'a spot and itself');
  for (const id of BOARDED) {
    const L = LAYOUTS[id], spots = deckSpots(L);
    for (const p of spots) for (const q of spots) if (inLine(L, p.id, q.id)) assert.ok(Math.abs(p.deck - q.deck) <= 1, `${id}: ${p.id} to ${q.id}`);
  }
});

test('her decks: a raider and a corsair, three or four decks each, her bridge on top and her lock at the bottom with her crew between; the corsair musters her marines in a ready room; any other hull is boarded on a raider\'s', () => {
  for (const id of ['raider', 'corsair']) {
    const lay = LAYOUTS[id], decksWith = room => lay.decks.map((d, i) => (d.rooms.some(r => r.id === room) ? i : -1)).filter(i => i >= 0);
    assert.ok(lay.decks.length >= 3 && lay.decks.length <= 4, `${id}: ${lay.decks.length} decks`);
    assert.deepEqual(plain(decksWith('bridge')), [0], `${id}: one bridge deck, on top`);
    assert.deepEqual(plain(decksWith('airlock')), [lay.decks.length - 1], `${id}: one lock deck, at the bottom`);
    assert.ok(lay.decks.length - 2 >= 1, `${id}: a deck of her crew's space between them`);
    assert.equal(lay.board, true, `${id}: her decks are a boarding's`);
    assert.equal(layoutOf(id), LAYOUTS.freighter, `${id}: not a hull the burn view flies`);
    assert.equal(boardLayout(id), lay);
  }
  assert.ok(layoutRoom(LAYOUTS.corsair, 'ready'), 'the corsair\'s ready room'); assert.equal(layoutRoom(LAYOUTS.raider, 'ready'), undefined);
  assert.equal(boardLayout('cutter'), LAYOUTS.raider, 'a hull with no decks of its own'); assert.equal(boardLayout('freighter'), LAYOUTS.freighter);
});
