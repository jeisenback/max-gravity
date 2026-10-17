'use strict';

// The raid's range (js/range.js, #710), in plain Node: the model that the choices move, and what it decides.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const api = load(['js/range.js'], {}, ['RANGE_FIRST', 'RANGE_WANT', 'RANGE_BEAT_MIN', 'RANGE_ESCAPE', 'RANGE_BOARD', 'rangeBand', 'rangeAtContact', 'rangeAfter', 'rangeLeft', 'rangeShiftOf', 'contactLost', 'canBoard', 'rangeEdge']);
const { rangeBand, rangeAtContact, rangeAfter, rangeLeft, rangeShiftOf, contactLost, canBoard, rangeEdge, RANGE_WANT, RANGE_ESCAPE } = api;

test('the bands: knife under 3 km, close under 10, mid under 40, long beyond', () => {
  assert.deepEqual([1.5, 3, 9.9, 10, 39, 40, 200].map(rangeBand), ['knife', 'close', 'close', 'mid', 'mid', 'long', 'long']);
});

test('a fight nobody moves: she closes from where she was met to the range she wants by the first pass, and holds it', () => {
  for (const style of ['grapple', 'torpedo', 'gun']) {
    const r0 = rangeAtContact(style), r1 = rangeAfter(r0, { style, closing: 4 }), r2 = rangeAfter(r1, { style, closing: 4 });
    assert.equal(r1, RANGE_WANT[style], `${style}: at her range by the first pass`); assert.equal(r2, RANGE_WANT[style], 'and she holds it');
  }
  assert.equal(rangeAtContact('grapple'), 40); assert.equal(rangeAtContact('gun'), 30);
});

test('opening the range keeps her off for a beat, and a slow foe can be outrun while a fast one cannot', () => {
  const open = rangeAfter(40, { style: 'grapple', closing: 4, shift: rangeShiftOf('burn', true) });
  assert.equal(open, 20, 'an evasive burn that works: she is at twenty kilometers at the pass, not alongside');
  assert.equal(rangeAfter(open, { style: 'grapple', closing: 4, shift: 20 }), 1.5 + 0, 'a fast raider closes again the next beat, whatever you do');
  assert.equal(rangeLeft(1.5, 20), 21.5, 'but a choice that ends the raid leaves her where it put her');
  assert.equal(rangeLeft(1.5, -15), 0);
  const slow = rangeAfter(40, { style: 'torpedo', closing: 1, shift: 25 });
  assert.ok(slow > 40 && !contactLost(slow), 'a slow corsair closes a little, and one success is not an escape');
  assert.ok(contactLost(rangeAfter(slow, { style: 'torpedo', closing: 1, shift: 20 })), 'two good beats against a slow ship lose her');
  assert.ok(!contactLost(rangeAfter(rangeAfter(40, { style: 'grapple', closing: 4, shift: 20 }), { style: 'grapple', closing: 4, shift: 20 })), 'a fast raider is never lost');
  assert.equal(RANGE_ESCAPE, 60);
});

test('a lost burn lets her close, turning into her closes the range, and the range never goes below nothing', () => {
  assert.equal(rangeShiftOf('burn', false), -10); assert.equal(rangeShiftOf('turn', true), -15); assert.equal(rangeShiftOf('turn', false), 0);
  assert.equal(rangeShiftOf('post.closing.engineer', true), 25); assert.equal(rangeShiftOf('hold', true), 0, 'a choice with no shift has none');
  assert.equal(rangeAfter(5, { style: 'gun', closing: 4, shift: -15 }), 0);
});

test('only a ship alongside boards, and a corsair does not board at all', () => {
  assert.ok(canBoard(1.5, 'grapple') && canBoard(3, 'gun')); assert.ok(!canBoard(12, 'grapple') && !canBoard(3.1, 'gun')); assert.ok(canBoard(10, 'torpedo'));
});

test('odds move by the bands from where the beat would have had the range: nothing when it is untouched, a step a band, the right way for each choice', () => {
  assert.equal(rangeEdge('fire', 1.5, 1.5), 0); assert.equal(rangeEdge('burn', 40, 40), 0);
  assert.ok(Math.abs(rangeEdge('fire', 12, 1.5) + 0.1) < 1e-9, 'guns lose a tenth when she is two bands further off than the pass would have had her');
  assert.ok(Math.abs(rangeEdge('burn', 12, 1.5) - 0.1) < 1e-9, 'an evasive burn gains the room');
  assert.ok(Math.abs(rangeEdge('screen', 1.5, 12) - 0.1) < 1e-9, 'point defense gains when she is closer than expected, inside its arc');
  assert.equal(rangeEdge('hold', 40, 1.5), 0, 'a choice with no range kind is not moved');
});
