'use strict';

// The routines in the tower's new rooms (#973, step 3 of docs/superpowers/specs/2026-11-08-tower-ship-design.md): the head in the morning, the
// engineer's and the gunner's rounds, the airlock left idle, the lines seen in the four new rooms, and the words that stage a scene in them.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const G = {};
const { routineSpot, routineGo, routineWait, headTurn, headTaken, ROOMS, roomAt, HAUNTS, LIFE_LINES, lifeLine, sceneStage, shipDay, SHIP_DAY } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js'],
  { G, Mods: { filter: (n, v) => v, emit() {}, register() {} }, linedText: (id, t) => t, pickFresh: (lines, rnd) => lines[Math.floor(rnd() * lines.length)] },
  ['routineSpot', 'routineGo', 'routineWait', 'headTurn', 'headTaken', 'ROOMS', 'roomAt', 'HAUNTS', 'LIFE_LINES', 'lifeLine', 'sceneStage', 'shipDay', 'SHIP_DAY']);

const ROLES = ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic', 'xo', 'cook', 'icehand'];
const plain = { marks: [], severe: false, hurt: [], low: [], you: false, aid: null, repairs: {} };
const crowd = () => [{ role: 'you', id: 'you', name: 'You' }, ...ROLES.map((role, i) => ({ role, id: `c${i}`, name: `C${i}` })), { role: 'passenger', id: 'p1', name: 'Pax' }, { role: 'captain', id: 'cap', name: 'Cap' }, { role: 'cat', name: 'Rivet' }];
const toHead = (p, morning) => (s => s.room === 'head')(routineSpot(p, 'wake', { ...plain, morning }));

test('the morning\'s day is counted in the burn, one a ship\'s day', () => {
  assert.equal(shipDay(0).day, 0);
  assert.equal(shipDay(SHIP_DAY * 3 - 6 + 1).day, 3);
});

test('about half the crew use the head in the morning, a different half each day, the same half for the same day (#973)', () => {
  const people = crowd(), may = people.filter(p => !['you', 'passenger', 'captain', 'cat', 'cook'].includes(p.role));  // no watch bill in this state: nobody stood a watch last night (#1034)
  let went = 0, seen = new Set();
  for (let d = 0; d < 400; d++) {
    const set = people.filter(p => toHead(p, d)).map(p => p.id);
    assert.deepEqual(people.filter(p => toHead(p, d)).map(p => p.id), set, 'the same morning goes the same way');
    for (const id of set) assert.ok(may.some(p => p.id === id), `${id} does not use the head`);
    went += set.length; seen.add(set.join());
  }
  const share = went / (400 * may.length);
  assert.ok(share > 0.4 && share < 0.6, `about half (${share})`);
  assert.ok(seen.size > 30, `a different set on different days (${seen.size})`);
  for (const p of people) assert.equal(routineSpot(p, 'wake').room === 'head', false, 'with no morning given, nobody');
  for (const p of may) for (const block of ['breakfast', 'shift', 'night']) assert.notEqual(routineSpot(p, block, { ...plain, morning: 1 }).room, 'head', `only in the wake block (${block})`);
  const cook = people.find(p => p.role === 'cook'), pilot = people.find(p => p.role === 'pilot');
  assert.deepEqual({ ...routineSpot(cook, 'wake', { ...plain, morning: 1 }) }, { room: 'galley', at: 'stove' }, 'the cook at the stove');
  assert.deepEqual({ ...routineSpot(pilot, 'wake', { ...plain, morning: 1 }) }, { room: 'galley', at: 'table' }, 'the watch as before');
  const hurt = may[0], d = [...Array(50).keys()].find(k => toHead(hurt, k));
  assert.equal(routineSpot(hurt, 'wake', { ...plain, morning: d, hurt: [hurt.id] }).room, 'medbay', 'the hurt stay in bed');
  assert.equal(routineSpot({ ...hurt, washed: d }, 'wake', { ...plain, morning: d }).room, 'galley', 'once washed, to breakfast');
});

test('those going set off at their own moments in the wake block, to the head\'s door on the galley side (#973)', () => {
  const people = crowd(), d = [...Array(50).keys()].find(k => people.filter(p => toHead(p, k)).length >= 3), goers = people.filter(p => toHead(p, d)), r = roomAt('head');
  assert.ok(goers.length >= 3, 'a morning with three going');
  for (const p of people) Object.assign(p, { room: 'berths', x: 0.2, dk: 2, tdk: 2, tx: null, block: 'night' });
  for (const p of goers) routineGo(p, 'wake', people, true, () => 0.5, { ...plain, morning: d });
  const leaves = goers.map(p => p.leave);
  assert.ok(new Set(leaves).size === goers.length && leaves.every(l => l >= 0 && l < 8 * 0.6), `staggered within the block (${leaves})`);
  for (const p of goers) {
    assert.equal(p.room, 'head'); assert.equal(p.tdk, r.deck);
    assert.ok(p.tx > r.x0 && p.tx < r.x0 + r.w * 0.25, `by the door, in the head's own box (${p.tx})`);
  }
});

test('the order they set off in for the head changes from morning to morning (#973)', () => {
  const people = crowd(), orders = new Map(), firsts = new Set();
  for (let d = 0; d < 60; d++) {
    const goers = people.filter(p => toHead(p, d));
    for (const p of people) Object.assign(p, { room: 'berths', x: 0.2, dk: 2, tdk: 2, tx: null, block: 'night', washed: undefined });
    for (const p of goers) routineGo(p, 'wake', people, true, () => 0.5, { ...plain, morning: d });
    if (goers.length) firsts.add(goers.reduce((a, b) => (b.leave < a.leave ? b : a)).id);
    for (const a of goers) for (const b of goers) if (a.id < b.id) { const k = `${a.id}|${b.id}`; (orders.get(k) || orders.set(k, new Set()).get(k)).add(a.leave < b.leave); }
  }
  assert.ok([...orders.values()].some(o => o.size === 2), 'two who both go set off in either order on different mornings');
  assert.ok(firsts.size >= 4, `the first to set off is not always the same (${[...firsts]})`);
  const p = people.find(q => toHead(q, 5)), again = () => { Object.assign(p, { block: 'night' }); routineGo(p, 'wake', people, true, () => 0.5, { ...plain, morning: 5 }); return p.leave; };
  assert.equal(again(), again(), 'the same morning, the same moment');
});

test('the head holds one at a time, one or two wait by the door, and the rest go on to breakfast (#973)', () => {
  const r = roomAt('head'), d = 7, mk = i => ({ role: 'gunner', id: `g${i}`, name: `G${i}`, room: 'head', at: 'head', block: 'wake', x: r.x0 + 0.05, dk: r.deck, tdk: r.deck, tx: null, wait: 0 });
  const people = [0, 1, 2, 3].map(mk), [a, b, c, e] = people;
  headTurn(a, people, d);
  assert.equal(a.queue, 'inside'); assert.ok(Math.abs(a.tx - r.mid) < 1e-9, 'in, to the middle'); assert.equal(a.first, true, 'the first in this morning');
  headTurn(b, people, d); headTurn(c, people, d);
  assert.deepEqual([b.queue, c.queue], ['door', 'door'], 'the next two wait');
  assert.ok(b.tx < r.x0 + r.w * 0.25 && c.tx < r.x0 + r.w * 0.25 && Math.abs(b.tx - c.tx) > 0.01, `by the door, apart (${b.tx}, ${c.tx})`);
  headTurn(e, people, d);
  assert.equal(e.washed, d, 'a third waiting goes without'); assert.equal(e.block, undefined, 'and back to the timetable');
  assert.equal(routineSpot(e, 'wake', { ...plain, morning: d }).room, 'galley');
  assert.equal(people.filter(p => p.queue === 'inside').length, 1, 'one inside');
  // the door waits while it is taken, and the first to wait goes in when it is free
  b.tx = null; routineWait(b, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  assert.equal(b.queue, 'door'); assert.ok(b.wait > 0 && b.wait < 1, 'a short wait, then a look again');
  a.tx = null; routineWait(a, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  assert.deepEqual([a.washed, a.queue, a.block], [d, undefined, undefined], 'done: on to the galley');
  c.tx = null; routineWait(c, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  assert.equal(c.queue, 'door', 'the second to wait waits on');
  routineWait(b, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  assert.equal(b.queue, 'inside', 'the first to wait goes in'); assert.equal(b.first, false, 'not the first this morning');
  // a newcomer, with one waiting, waits behind them
  const f = mk(4); people.push(f); b.queue = 'inside';
  routineWait(c, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  assert.equal(c.queue, 'door');
  headTurn(f, people, d);
  assert.equal(f.queue, 'door', 'a newcomer joins the wait');
  b.tx = null; routineWait(b, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  routineWait(f, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  assert.equal(f.queue, 'door', 'and does not go before the one waiting longer');
  routineWait(c, 'wake', false, () => 0.5, { ...plain, morning: d }, people);
  assert.equal(c.queue, 'inside');
  assert.ok(Math.abs(f.tx - c.tx) > 0.01 || c.tx === r.mid, 'nobody stands on anyone');
});

test('the rounds: the engineer to life support and the workshop, the gunner to the workshop, the rest to the nearest rooms (#973)', () => {
  const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };
  const at = (role, room, dice) => { const r = roomAt(room), p = { role, block: 'shift', at: 'post', room, x: r.mid, dk: r.deck, tdk: r.deck, tx: null, wait: 0 }; routineWait(p, 'shift', false, seq(dice)); return p.errand ? p.room : null; };
  const rooms = (role, room, chance) => new Set([0, 0.3, 0.6, 0.9].map(pick => at(role, room, [chance, pick, 0.5])).filter(Boolean));
  assert.deepEqual([...rooms('engineer', 'engine', 0.1)].sort(), ['lifesupport', 'workshop'], 'the engineer');
  assert.deepEqual([...rooms('engineer', 'engine', 0.2)], [], 'both up the ladder: half as often');
  assert.deepEqual([...rooms('gunner', 'gunnery', 0.2)], ['workshop'], 'the gunner, on the post\'s own deck');
  assert.deepEqual([...rooms('quartermaster', 'hold', 0.2)], ['engine'], 'another role: the nearest room on the deck');
  assert.deepEqual([...rooms('quartermaster', 'hold', 0.1)].sort(), ['engine', 'lifesupport'], 'and the nearest up the ladder');
  assert.deepEqual([...rooms('pilot', 'bridge', 0.1)].sort(), ['galley', 'head']);
  const n = 400, rate = (role, room, to) => { let k = 0; for (let i = 0; i < n; i++) for (const pick of [0.25, 0.75]) if (at(role, room, [(i + 0.5) / n, pick, 0.5]) === to) k++; return k / (2 * n); };
  assert.ok(Math.abs(rate('engineer', 'engine', 'lifesupport') + rate('engineer', 'engine', 'workshop') - 0.125) < 1e-9, 'the engineer stays mostly at the engine');
  assert.ok(Math.abs(rate('gunner', 'gunnery', 'workshop') - 0.25) < 1e-9);
});

test('the airlock stays idle: no routine sends anyone there (#973, until #940)', () => {
  const seq = vals => { let i = 0; return () => vals[i++ % vals.length]; };
  for (const role of Object.keys(HAUNTS)) {
    assert.ok(!('airlock' in HAUNTS[role]), `${role} has no haunt there`);
    for (const block of ['breakfast', 'shift', 'meal', 'supper', 'handover', 'night', 'wake']) assert.notEqual(routineSpot({ role, id: role }, block, { ...plain, morning: 3 }).room, 'airlock');
  }
  for (const r of ROOMS) for (const pick of [0, 0.3, 0.6, 0.9]) {
    const p = { role: 'medic', block: 'shift', at: 'post', room: r.id, x: r.mid, dk: r.deck, tdk: r.deck, tx: null, wait: 0 };
    routineWait(p, 'shift', false, seq([0.1, pick, 0.5]));
    assert.notEqual(p.room, 'airlock', `an errand from ${r.id}`);
  }
});

test('the four new rooms have lines of their own, the engineer and the gunner theirs, and the first in the head is first to the hot water (#973)', () => {
  for (const id of ['head', 'workshop', 'airlock', 'lifesupport']) assert.ok((LIFE_LINES[id].any || []).length >= 4, `${id}'s own lines`);
  for (const [room, role] of [['lifesupport', 'engineer'], ['workshop', 'engineer'], ['workshop', 'gunner']]) assert.ok((LIFE_LINES[room][role] || []).length >= 3, `${role} in ${room}`);
  for (const r of ROOMS) assert.ok(LIFE_LINES[r.id] && LIFE_LINES[r.id].any.length, `${r.id} has lines`);
  const all = Object.values(LIFE_LINES).flatMap(pools => Object.values(pools).flat());
  assert.deepEqual(all.filter(l => !/^\{n\} /.test(l)), [], 'every line starts with the person');
  assert.ok(LIFE_LINES.head.first.length && LIFE_LINES.head.first.every(l => /hot water/.test(l)), 'the first in: the hot water');
  const first = { name: 'Ana', role: 'gunner', room: 'head', queue: 'inside', first: true }, next = { ...first, first: false };
  for (let k = 0; k < 20; k++) {
    const u = (k + 0.5) / 20;
    assert.ok(LIFE_LINES.head.first.map(l => l.replace('{n}', 'Ana')).includes(lifeLine(first, [first], () => u)), 'the first one in');
    assert.ok(!LIFE_LINES.head.first.map(l => l.replace('{n}', 'Ana')).includes(lifeLine(next, [next], () => u)), 'nobody after');
    assert.ok(!LIFE_LINES.head.first.map(l => l.replace('{n}', 'Ana')).includes(lifeLine({ ...first, queue: undefined }, [first], () => u)), 'nor someone in on an errand');
  }
});

test('a scene that names a new room is staged there, by whole words (#973)', () => {
  const aboard = [{ id: 'you', role: 'you' }, { id: 'c:tomas', role: 'engineer' }];
  const room = text => sceneStage({ title: 'With Tomas', text }, aboard, ['c:tomas']).room;
  assert.equal(room('He is waiting outside the head with a towel.'), 'head');
  assert.equal(room('{n} keeps their rating card in a sealed pouch on a cord round their neck, even in the shower.'), 'galley', 'a shower in passing is not the head');
  assert.equal(room('He has the part on the bench in the workshop.'), 'workshop');
  assert.equal(room('She is sitting by the airlock.'), 'airlock');
  assert.equal(room('They check the seals on the lock.'), 'airlock');
  assert.equal(room('He has the panel off in life support.'), 'lifesupport');
  assert.equal(room('He is complaining about the air recycler.'), 'lifesupport');
  assert.equal(room('The scrubbers are running flat out.'), 'lifesupport');
  assert.equal(room('They draw two waters at the tap and talk about the ration, and the recycler.'), 'galley', 'the galley\'s water recycler is not life support');
  assert.equal(room('He shakes the headache off, and the padlock, and the lockers, and the showers of sparks.'), 'galley', 'not inside longer words');
  assert.equal(room('The head of the table is empty.'), 'galley', 'the head of something is not the head');
  assert.equal(room('She shows him the head, then the galley.'), 'head', 'the first named');
});

test('the head is taken while someone is in at its middle, not on the way in nor waiting at the door (#933, #973)', () => {
  const r = roomAt('head'), mk = (o) => ({ role: 'gunner', room: 'head', at: 'head', block: 'wake', x: r.mid, dk: r.deck, tdk: r.deck, tx: null, ...o });
  assert.equal(headTaken([]), false, 'nobody aboard');
  assert.equal(headTaken([mk({ queue: 'door' }), mk({ queue: 'door' })]), false, 'two waiting at the door');
  assert.equal(headTaken([mk({ queue: 'inside', tx: r.mid, x: r.x0 })]), false, 'on the way in');
  assert.equal(headTaken([mk({ queue: 'door' }), mk({ queue: 'inside' })]), true, 'one in, one waiting');
  assert.equal(headTaken([mk({ queue: 'inside', room: 'galley' })]), false, 'only in the head');
  const people = [0, 1].map(i => mk({ id: `g${i}`, x: r.x0 + 0.05, queue: undefined }));
  headTurn(people[0], people, 3); assert.equal(headTaken(people), false, 'gone in, not there yet');
  people[0].tx = null; assert.equal(headTaken(people), false, 'strapped in at the door with no target (the flip): not in');
  people[0].x = r.mid; assert.equal(headTaken(people), true, 'there');
  assert.equal(headTaken([mk({ queue: 'inside', staged: 'head', at: undefined })]), false, 'staged in a scene: not the queue\'s');
});
