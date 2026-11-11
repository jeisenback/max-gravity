'use strict';

// The rotating watch bill (#1034, docs/superpowers/specs/2026-11-11-watch-bill-design.md): who stands the bridge and the engine-room watch each
// night (js/shiplife.js watchBill), and where the cutaway puts everyone at night by it.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { watchBill, routineSpot, WATCH_ORDER } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'],
  { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['watchBill', 'routineSpot', 'WATCH_ORDER']);
const plain = x => JSON.parse(JSON.stringify(x));
const crew = (over = {}) => [
  { id: 'you', role: 'you' }, { id: 'p', role: 'pilot' }, { id: 'm', role: 'slicer' }, { id: 'c', role: 'xo' }, { id: 't', role: 'engineer' }, { id: 'h', role: 'icehand' },
].map(x => ({ hurt: false, ...x, ...(over[x.id] || {}) }));
const nights = (roster, n, post) => [...Array(n).keys()].map(k => watchBill(roster, k)[post]);

test('the bridge goes round the pilot, comms, the hand and the first officer, and the engine room round the engineer and the ice hand', () => {
  assert.deepEqual(plain(WATCH_ORDER), { bridge: ['pilot', 'slicer', 'you', 'xo'], engine: ['engineer', 'icehand'] });
  assert.deepEqual(nights(crew(), 8, 'bridge'), ['p', 'm', 'you', 'c', 'p', 'm', 'you', 'c']);
  assert.deepEqual(nights(crew(), 4, 'engine'), ['t', 'h', 't', 'h']);
});

test('someone hurt, or a role nobody holds, is passed over for the next in order; with nobody able the watch is empty', () => {
  assert.equal(watchBill(crew({ p: { hurt: true } }), 0).bridge, 'm', 'the pilot hurt on their night');
  assert.equal(watchBill(crew({ you: { hurt: true } }), 2).bridge, 'c', 'the hand hurt on their night');
  const small = [{ id: 'you', role: 'you', hurt: false }, { id: 'p', role: 'pilot', hurt: false }, { id: 't', role: 'engineer', hurt: false }];
  assert.deepEqual(nights(small, 4, 'bridge'), ['p', 'you', 'you', 'p'], 'no comms officer and no first officer: those who are aboard');
  assert.equal(watchBill(small, 1).engine, 't', 'no ice hand: the engineer');
  assert.deepEqual(plain(watchBill([], 0)), { bridge: null, engine: null });
});

const state = (bill, watch = null, hurt = []) => ({ marks: [], hurt, low: [], you: false, aid: null, watch, bill });
const you = { id: 'you', role: 'you' }, ines = { id: 'c:ines', role: 'pilot' }, tomas = { id: 'c:tomas', role: 'engineer' }, hana = { id: 'c:hana', role: 'icehand' };
const mateo = { id: 'c:mateo', role: 'slicer' };

test('at night whoever the bill names is at their watch\'s post, and everyone else is in a bunk, the pilot and the engineer too', () => {
  const s = state({ bridge: 'you', engine: 'c:hana' });
  assert.deepEqual(plain(routineSpot(you, 'night', s)), { room: 'bridge', at: 'post' });
  assert.deepEqual(plain(routineSpot(hana, 'night', s)), { room: 'engine', at: 'post' });
  assert.deepEqual(plain(routineSpot(ines, 'night', s)), { room: 'berths', at: 'bunk' });
  assert.deepEqual(plain(routineSpot(tomas, 'handover', s)), { room: 'berths', at: 'bunk' });
});

test('a scene\'s watch stands on top of the bill: at the guns the bill holds; on the bridge it takes the bill\'s place', () => {
  const bill = { bridge: 'c:ines', engine: 'c:tomas' };
  const guns = state(bill, { stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' });
  assert.deepEqual(plain(routineSpot(you, 'night', guns)), { room: 'gunnery', at: 'post' });
  assert.deepEqual(plain(routineSpot(ines, 'night', guns)), { room: 'bridge', at: 'post' });
  const bridge = state(bill, { stands: 'c:mateo', post: 'bridge', relieved: null, relievedAt: 'bunk' });
  assert.deepEqual(plain(routineSpot(mateo, 'night', bridge)), { room: 'bridge', at: 'post' });
  assert.deepEqual(plain(routineSpot(ines, 'night', bridge)), { room: 'berths', at: 'bunk' }, 'the bill\'s bridge turns in');
});

test('the hand hurt on their own night is in the medbay', () => {
  const s = { ...state({ bridge: 'you', engine: 'c:hana' }), you: true };
  assert.deepEqual(plain(routineSpot(you, 'night', s)), { room: 'medbay', at: 'bed' });
});

test('on the hand\'s bridge night the cutaway has them on the bridge and the pilot and the engineer asleep', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.3; t.times = []; t.aboard = null; shipPeople();
    let d = 0; while ((G.state.day + d) % 4 !== 2) d++;
    t.elapsed = (d + 0.75) * SHIP_DAY - 6;  // the night of the hand's bridge watch
    const state = shipState(G.state, t, ship().armor, () => 0.5, { aid: null, you: false });
    const spot = id => routineSpot(t.aboard.find(p => p.id === id), 'night', state);
    const ines = castPerson('ines').id, tomas = castPerson('tomas').id;
    const bunk = id => { const p = t.aboard.find(q => q.id === id); Object.assign(p, { room: 'berths', at: 'bunk', tx: null, dk: roomAt('berths').deck, tdk: roomAt('berths').deck, staged: false }); return isAsleep(p); };
    return { bill: state.bill, tomas, you: spot('you'), ines: spot(ines), asleep: [bunk(ines), bunk(tomas)] };
  });
  await done();
  assert.equal(r.bill.bridge, 'you');
  assert.deepEqual(r.you, { room: 'bridge', at: 'post' });
  assert.deepEqual(r.ines, { room: 'berths', at: 'bunk' });
  assert.deepEqual(r.asleep, [true, r.bill.engine !== r.tomas], 'Ines asleep; Tomas asleep unless he has the engine room tonight');
});
