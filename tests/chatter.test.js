'use strict';

// Chatter that matches the ship (#987, docs/superpowers/specs/2026-11-11-chatter-and-watch-design.md): a line of the crew's chatter is drawn from
// where the cutaway shows its speaker (js/shiplife.js chatterAt, chatterRoom; js/transit.js), and nobody asleep or strapped in speaks.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { chatterAt } = load(['js/data.js', 'js/util.js', 'js/figures.js', 'js/layouts.js', 'js/camera.js', 'js/rooms.js', 'js/shiplife.js', 'js/burnspeed.js'],
  { G: {}, Mods: { filter: (n, v) => v, emit() {}, register() {} } }, ['chatterAt']);
const plain = x => JSON.parse(JSON.stringify(x));

test('a plain list is said anywhere, a grouped one in its room or anywhere, and nothing is said asleep or strapped in', () => {
  assert.deepEqual(plain(chatterAt(['a', 'b'], 'galley')), ['a', 'b']);
  assert.deepEqual(plain(chatterAt(['a'], null)), []);
  const grouped = { any: ['a'], engine: ['e'], galley: ['g'] };
  assert.deepEqual(plain(chatterAt(grouped, 'engine')), ['a', 'e']);
  assert.deepEqual(plain(chatterAt(grouped, 'hold')), ['a']);
  assert.deepEqual(plain(chatterAt(grouped, null)), []);
  assert.deepEqual(plain(chatterAt({ engine: ['e'] }, 'galley')), [], 'no any group: nothing elsewhere');
  assert.deepEqual(plain(chatterAt(grouped, undefined)), ['a', 'e', 'g'], 'no cutaway (no burn): every line');
  assert.deepEqual(plain(chatterAt(['a'], undefined)), ['a']);
});

// A hired hand on a burn in the move phase, the cutaway's people built. The crew's pool (transit.js crewChatter) is what a line is drawn from when the crew's share is chosen.
const helpers = () => {
  window.onBurn = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.3; t.times = []; t.chatter = 1e9;
    shipPeople(); return t;
  };
  window.placeAll = (room, asleep) => { for (const p of G.transit.aboard) Object.assign(p, { room, tx: null, dk: roomAt(room).deck, tdk: roomAt(room).deck, at: asleep ? 'bunk' : 'post' }); };
};

test('a crew member is heard only saying what fits the room they are in, and a cast member says their own lines (#987)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const t = onBurn(), tomas = castPerson('tomas');
    if (!G.state.crew.includes(tomas.id)) G.state.crew.push(tomas.id);
    t.aboard = null; shipPeople(); placeAll('berths', true);
    const p = t.aboard.find(q => q.id === tomas.id); Object.assign(p, { room: 'engine', dk: roomAt('engine').deck, tdk: roomAt('engine').deck, at: 'post' });
    const night = () => { t.elapsed = SHIP_DAY * 0.75 - 6; };  // the night block, when the others are in their bunks
    night();
    const own = chatterAt(CAST.tomas.chatter, 'engine'), lines = crewChatter();
    const sleeper = t.aboard.find(q => q.id && q.id !== 'you' && q.role !== 'captain' && !NIGHT_WATCH.includes(q.role));  // the night watch is never asleep
    return { lines: lines.filter(l => /Tomas/.test(l)), own, sleeperRoom: chatterRoom(sleeper.id), dark: isDark(), stranger: chatterRoom('nobody-aboard') };
  });
  await done();
  assert.equal(r.dark, true, 'night'); assert.equal(r.sleeperRoom, null, 'a sleeper is nowhere for chatter');
  assert.equal(r.stranger, undefined, 'someone the cutaway does not hold has no place to contradict');
  assert.ok(r.lines.length > 0, 'Tomas has something to say in the engine room');
  for (const l of r.lines) assert.ok(r.own.includes(l), `said where Tomas is, from his own lines: ${l}`);
});

test('strapped in on the couches the crew have nothing to say, the chatter is the generic traffic, and nothing throws (#987)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const t = onBurn(); t.left = t.total * 0.99;  // the couches at the start of the burn
    const pool = crewChatter();
    let threw = null; t.comms = [];
    try { for (let i = 0; i < 10; i++) { t.chatter = 0; t.chattered = 0; updateTransit(0.001); } } catch (e) { threw = String(e); }
    return { pool, threw, said: t.comms.map(c => c.text || c), generic: linedText('lines:comms-chatter', CHATTER) };
  });
  await done();
  assert.deepEqual(r.pool, []);
  assert.equal(r.threw, null);
  assert.ok(r.said.length > 0, 'something was said');
});

// The writing pass (#987): a line that names a room where it happens sits in that room's group. A line in `any` or in a plain list names none,
// but for the few here that name a room without being in it.
const ROOM_WORDS = /\b(galley|engine room|bunks?|berths?|bridge|helm|cockpit|the hold|medbay|the guns|gun mount|workshop)\b/i;
const ALLOWED = [
  'on the berth of whoever has the cold watch',  // Hester: Cato's blanket, on someone else's berth, not where Cato is
  'jumps at a clank from the engine room',  // nervous: the clank is heard anywhere
  'we had a proper berth',  // rude: talk about another ship
  'The captain is in the galley',  // Ilsa: where her captain is, not where she is
  'a day for the berth',  // Hester: the berth at a port, its fee
];
test('a chatter line that names a room is in that room\'s group (#987)', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const sources = await ev(() => [
    ...Object.entries(CAST).map(([k, c]) => [`CAST.${k}`, c.chatter]),
    ...Object.entries(TRAITS).map(([k, t]) => [`TRAITS.${k}`, t.chatter]),
    ['CAPTAINS.hester', CAPTAINS.hester.chatter],
  ]);
  await done();
  const bad = [];
  for (const [name, l] of sources) {
    if (!l) continue;
    const free = Array.isArray(l) ? l : l.any || [];
    for (const line of free) if (ROOM_WORDS.test(line) && !ALLOWED.some(a => line.includes(a))) bad.push(`${name}: ${line}`);
  }
  assert.deepEqual(bad, []);
});

test('a crew member rewatching a show "in their bunk" is only said to be when the cutaway has them in the berths (#987)', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    const t = onBurn(), q = t.aboard.find(p => p.id && p.id !== 'you' && p.role !== 'captain' && !NIGHT_WATCH.includes(p.role));
    const show = { genre: 'soap', title: 'The Long Haul', finale: false, ep: 1 };
    const realAiring = window.airing, realTastes = window.tastes;
    window.airing = () => [show]; window.tastes = () => ({ genre: 'soap', team: null });
    try {
      const fav = () => socialLines().filter(l => l.includes("The Long Haul") && l.includes(person(q.id).first) && /bunk/.test(l));
      Object.assign(q, { room: 'galley', dk: roomAt('galley').deck, tdk: roomAt('galley').deck, at: 'table', tx: null }); t.elapsed = SHIP_DAY * 0.2;  // a shift: awake
      const inGalley = fav();
      Object.assign(q, { room: 'berths', dk: roomAt('berths').deck, tdk: roomAt('berths').deck, at: 'bunk' });
      return { inGalley, inBerths: fav() };
    } finally { window.airing = realAiring; window.tastes = realTastes; }
  });
  await done();
  assert.deepEqual(r.inGalley, [], 'not in the berths: no line about their bunk');
  assert.equal(r.inBerths.length, 1, 'in the berths: the line');
});
