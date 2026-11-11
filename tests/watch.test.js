'use strict';

// The watch a scene hands out (#951, docs/superpowers/specs/2026-11-11-chatter-and-watch-design.md): a one-night record on the burn
// (G.transit.watch), written by the standWatch effect, that the cutaway reads in the handover and the night (js/shiplife.js routineSpot).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { routineSpot, routineGo, standWatch, shipDay, SHIP_DAY, SEATS, roomAt } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'],
  { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['routineSpot', 'routineGo', 'standWatch', 'shipDay', 'SHIP_DAY', 'SEATS', 'roomAt']);
const plain = x => JSON.parse(JSON.stringify(x));
const state = watch => ({ marks: [], hurt: [], low: [], you: false, aid: null, watch });
const yelenaWatch = { night: 3, stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' };
const you = { id: 'you', role: 'you' }, yelena = { id: 'c:yelena', role: 'gunner' }, tomas = { id: 'c:tomas', role: 'engineer' };

test('at night the one standing the watch is at its post, the one relieved where the record says, and the rest as the timetable has them', () => {
  assert.deepEqual(plain(routineSpot(you, 'night', state(yelenaWatch))), { room: 'gunnery', at: 'post' });
  assert.deepEqual(plain(routineSpot(yelena, 'night', state(yelenaWatch))), { room: 'galley', at: 'table' });
  assert.deepEqual(plain(routineSpot(tomas, 'night', state(yelenaWatch))), plain(routineSpot(tomas, 'night', state(null))), 'the engineer as on any night');
  assert.deepEqual(plain(routineSpot(you, 'handover', state(yelenaWatch))), { room: 'gunnery', at: 'post' }, 'the handover too');
  assert.deepEqual(plain(routineSpot(you, 'night', state(null))), { room: 'berths', at: 'bunk' }, 'no record: the hand turns in');
  assert.deepEqual(plain(routineSpot(you, 'shift', state(yelenaWatch))), plain(routineSpot(you, 'shift', state(null))), 'a shift is as it was');
  const engineer = { night: 3, stands: 'you', post: 'engine', relieved: 'c:tomas', relievedAt: 'bunk' };
  assert.deepEqual(plain(routineSpot(tomas, 'night', state(engineer))), { room: 'berths', at: 'bunk' }, 'the engineer relieved to their bunk');
});

test('someone hurt is in the medbay whatever the record says', () => {
  const s = { ...state(yelenaWatch), hurt: ['c:yelena'] };
  assert.deepEqual(plain(routineSpot(yelena, 'night', s)), { room: 'medbay', at: 'bed' });
});

test('the record is for tonight in any block of the ship\'s day, and for the next night once the day has reached its wake', () => {
  const at = f => { const t = { elapsed: (3 + f) * SHIP_DAY - 6 }; standWatch(t, shipDay(t.elapsed).day, 'you', 'gunnery', 'c:yelena', 'galley'); return t.watch; };
  assert.equal(shipDay((3 + 0.02) * SHIP_DAY - 6).block, 'breakfast');
  assert.equal(at(0.02).night, 3, 'breakfast');
  assert.equal(at(0.75).night, 3, 'the night');
  assert.equal(at(0.95).night, 4, 'the wake: that night is over');
  assert.deepEqual(plain(at(0.2)), { night: 3, stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' });
});

// A hired hand on a burn with Yelena aboard, the cutaway's people built; nightAt puts the burn into a given block of its first full day.
const helpers = () => {
  window.burnWithYelena = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    const y = castPerson('yelena'); if (!G.state.crew.includes(y.id)) G.state.crew.push(y.id);
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.3; t.times = []; t.aboard = null; shipPeople();
    return t;
  };
  window.atBlock = f => { G.transit.elapsed = (1 + f) * SHIP_DAY - 6; };
  window.playChoice = (label) => {
    const ev = castScene('yelena', CAST.yelena.scenes.mid2); const c = ev.choices.find(x => (typeof x.label === 'string' ? x.label : '').startsWith(label));
    G.dialog = { event: ev, choices: ev.choices }; chooseEvent(ev.choices.indexOf(c)); G.dialog = null; G.nextEvent = null;
  };
  window.spots = () => {  // where each would go now, from the game's own ship state
    const t = G.transit, block = shipDay(t.elapsed).block, state = shipState(G.state, t, ship().armor, () => 0.5, { aid: null, you: false });
    return Object.fromEntries(t.aboard.filter(p => p.id).map(p => [p.id, routineSpot(p, block, state)]));
  };
};

test('"Take her watch" puts the hand at the guns that night and Yelena in the galley; "It\'s your watch" puts her at the guns; the record goes at the next wake', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, t = burnWithYelena(), y = castPerson('yelena').id;
    atBlock(0.3); playChoice('Take her watch'); out.record = JSON.parse(JSON.stringify(t.watch));
    atBlock(0.75); const n = spots(); out.night = { you: n.you, yelena: n[y] };
    atBlock(1.95); spots(); out.after = t.watch === undefined ? 'gone' : t.watch;
    delete t.watch; atBlock(0.3); playChoice('"It\'s your watch."');
    atBlock(0.75); const m = spots(); out.hers = { you: m.you, yelena: m[y] };
    return out;
  });
  await done();
  assert.deepEqual(r.record, { night: 1, stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' });
  assert.deepEqual(r.night, { you: { room: 'gunnery', at: 'post' }, yelena: { room: 'galley', at: 'table' } });
  assert.equal(r.after, 'gone');
  assert.deepEqual(r.hers, { you: { room: 'berths', at: 'bunk' }, yelena: { room: 'gunnery', at: 'post' } });
});

test('standing the captain\'s extra watch puts the hand in the engine room at night and the engineer asleep in a bunk', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    const t = burnWithYelena(), eng = roleHolder('engineer');
    atBlock(0.3);
    const ev = HAND_EVENTS.find(x => x.id === 'cap-favour').make(handContext()); G.dialog = { event: ev, choices: ev.choices }; chooseEvent(0); G.dialog = null; G.nextEvent = null;
    atBlock(0.75); const s = spots();
    const p = t.aboard.find(q => q.id === eng.id); Object.assign(p, { room: 'berths', at: 'bunk', tx: null, dk: roomAt('berths').deck, tdk: roomAt('berths').deck });
    return { you: s.you, eng: s[eng.id], asleep: isAsleep(p) };
  });
  await done();
  assert.deepEqual(r.you, { room: 'engine', at: 'post' });
  assert.deepEqual(r.eng, { room: 'berths', at: 'bunk' });
  assert.equal(r.asleep, true, 'the engineer relieved is asleep, not lying awake on watch');
});

test('a burn with no record, or an old one, keeps the timetable and nothing throws; a choice played at a port records nothing', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    const t = burnWithYelena(); atBlock(0.75);
    let threw = null, none, old;
    try { delete t.watch; none = spots().you; t.watch = { night: 0, stands: 'you', post: 'gunnery', relieved: null, relievedAt: 'bunk' }; old = spots().you; } catch (e) { threw = String(e); }
    G.transit = null; G.mode = 'landed'; playChoice('Take her watch');
    return { threw, none, old, port: G.transit };
  });
  await done();
  assert.equal(r.threw, null);
  assert.deepEqual(r.none, { room: 'berths', at: 'bunk' }); assert.deepEqual(r.old, { room: 'berths', at: 'bunk' });
  assert.equal(r.port, null);
});

test('the one standing the watch takes a seat at the post: the relieved one\'s, or the next free one; never outside the room (#951 review)', () => {
  const r = roomAt('gunnery'), seats = SEATS.gunnery.map(f => r.x0 + r.w * f), at = (people, w) => {
    const s = state(w), p = people.find(q => q.id === 'you');
    for (const q of people) Object.assign(q, { block: 'night', room: 'berths', x: 0.5, dk: 0, tdk: 0 });
    routineGo(p, 'night', people, true, () => 0.5, s); return p.tx;
  };
  const yw = { night: 0, stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' };
  assert.ok(seats.includes(at([{ id: 'you', role: 'you' }, { id: 'c:yelena', role: 'gunner' }], yw)), 'Yelena\'s seat');
  const two = at([{ id: 'you', role: 'you' }, { id: 'c:yelena', role: 'gunner' }, { id: 'c:pax', role: 'gunner' }], yw);
  assert.ok(two >= r.x0 && two <= r.x1, `in the room with two gunners aboard: ${two} in ${r.x0}..${r.x1}`);
  assert.ok(seats.includes(two), 'a seat');
  const extra = at([{ id: 'you', role: 'you' }], { night: 0, stands: 'you', post: 'gunnery', relieved: null, relievedAt: 'bunk' });
  assert.ok(seats.includes(extra), 'an extra watch with nobody to relieve: a free seat');
});

// ---------- the effect's checks (#1036) ----------

test('a watch nobody stands sends nobody to the post: a person with no id is not the stander (#1036)', () => {
  const pax = { id: null, role: 'passenger' };
  assert.notDeepEqual(plain(routineSpot(pax, 'night', state({ night: 0, stands: null, post: 'gunnery', relieved: null, relievedAt: 'bunk' }))), { room: 'gunnery', at: 'post' });
});

test('the effect checks who stands and who is relieved, takes a post for its role, and never makes a character (#1036)', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    const t = burnWithYelena(), out = {};
    out.shapes = [
      EFFECT_SHAPES.standWatch({ stands: 'you', post: 'gunnery', relieved: 'yelena', relievedAt: 'galley' }),
      EFFECT_SHAPES.standWatch({ stands: 'you', post: 'gunnery', relieved: 'nobody', relievedAt: 'galley' }),
      EFFECT_SHAPES.standWatch({ stands: 'you', post: 'gunnery', relieved: null }),
      EFFECT_SHAPES.standWatch({ stands: 'comms', post: 'bridge', relieved: null }),
      EFFECT_SHAPES.standWatch({ stands: 'slicer', post: 'bridge', relieved: null }),
    ].map(Boolean);
    const comms = roleHolder('slicer');
    delete t.watch; atBlock(0.3); EFFECTS.standWatch({ stands: 'comms', post: 'bridge', relieved: null, relievedAt: 'bunk' });
    out.comms = { holder: comms ? comms.id : null, stands: t.watch ? t.watch.stands : 'none' };
    delete t.watch; const had = !!(G.state.cast || {}).bexa;
    EFFECTS.standWatch({ stands: 'bexa', post: 'bridge', relieved: null, relievedAt: 'bunk' });
    out.absent = { record: t.watch === undefined ? 'none' : t.watch, made: !had && !!(G.state.cast || {}).bexa };
    return out;
  });
  await done();
  assert.deepEqual(r.shapes, [false, true, false, false, true], 'yelena and null pass; a typo in relieved and a role name in place of a post fail');
  assert.equal(r.comms.stands, r.comms.holder || 'none', 'comms is the slicer\'s post: its holder stands it, or there is no record');
  assert.deepEqual(r.absent, { record: 'none', made: false }, 'a character not met: no record, and no character made');
});
