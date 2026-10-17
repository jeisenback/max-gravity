'use strict';

// The bar as a room (js/barroom.js, #687): where each patron of a night sits, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { barLayout, ROOM_RAIL, ROOM_TABLE, ROOM_DOOR } = load(['js/barroom.js'], {}, ['barLayout', 'ROOM_RAIL', 'ROOM_TABLE', 'ROOM_DOOR']);
const run = kinds => JSON.parse(JSON.stringify(barLayout(kinds)));
const at = list => JSON.parse(JSON.stringify(list.map(([x, y]) => ({ x, y }))));

test('the main characters and those you know sit at the rail, the regulars at the table, strangers by the door', () => {
  const r = run(['cast', 'regular', 'known', 'stranger', 'regular', 'stranger']);
  assert.deepEqual(r[0], at(ROOM_RAIL)[0]); assert.deepEqual(r[2], at(ROOM_RAIL)[1], 'a known face takes the next stool');
  assert.deepEqual([r[1], r[4]], at(ROOM_TABLE).slice(0, 2)); assert.deepEqual([r[3], r[5]], at(ROOM_DOOR).slice(0, 2));
});

test('nobody shares a place, a full group spills into a free one, and a room with no place left says so', () => {
  const crowd = run(Array(8).fill('regular')), places = new Set(crowd.map(p => `${p.x},${p.y}`));
  assert.equal(places.size, 8, 'eight regulars, eight places: the table has six, two stand elsewhere');
  const full = run(Array(18).fill('stranger'));
  assert.equal(full.filter(Boolean).length, 17, 'the room has 17 places'); assert.equal(full[17], null);
  assert.equal(new Set(full.filter(Boolean).map(p => `${p.x},${p.y}`)).size, 17);
  assert.deepEqual(run([]), []); assert.deepEqual(run(['cast', 'cast']), run(['cast', 'cast']), 'the same night lays out the same');
});
