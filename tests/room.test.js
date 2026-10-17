'use strict';

// A room that is theirs (js/room.js, #670): the offer at the end of a visit home where the hand told the family the true thing, the room it sets, the return by the gap and the count of
// stays, and the card on the Port page. The pure rules in plain Node; the scenes in the page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { roomBand, roomDue, roomOfferDue, ROOM_FEW, ROOM_MONTH } = load(['js/room.js'], { FAMILY_SCENES: {}, Mods: { register() {} } }, ['roomBand', 'roomDue', 'roomOfferDue', 'ROOM_FEW', 'ROOM_MONTH']);

test('the gap is a few days, a month or half a year, by band; the offer is once a family and one room only; the return is due at the room\'s port a day after the last stay', () => {
  assert.deepEqual([roomBand(0), roomBand(ROOM_FEW - 1), roomBand(ROOM_FEW), roomBand(ROOM_MONTH - 1), roomBand(ROOM_MONTH), roomBand(400)], ['few', 'few', 'month', 'month', 'long', 'long']);
  assert.equal(roomOfferDue(undefined, {}), true); assert.equal(roomOfferDue(undefined, { roomOffered: true }), false, 'once a family');
  assert.equal(roomOfferDue({ planet: 'Mars' }, {}), false, 'one room');
  const room = { planet: 'Mars', last: 10 };
  assert.equal(roomDue(room, 'Mars', 11), true); assert.equal(roomDue(room, 'Mars', 10), false, 'not the day of a stay'); assert.equal(roomDue(room, 'Ceres Station', 99), false, 'only at its port'); assert.equal(roomDue(undefined, 'Mars', 99), false);
});

const helpers = () => {
  // A hired game with a shipmate whose family is on Mars, who thinks well of the hand, and the visit's table.
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; const p = makePerson('mars'); Object.assign(p, { first: 'Sam', last: 'Vale', home: 'Mars', opinion: 4, role: 'engineer', skill: 1 }); delete p.story; registerPerson(p); st.crew.push(p.id); storyOf(p);
    return { st, p };
  };
  window.goTo = (sid, planet) => { const st = G.state; G.transit = null; G.mode = 'landed'; st.dest = null; st.systemId = sid; st.planet = planet; UI.notes.length = 0; G.dialog = null; G.nextEvent = null; };
  window.landOn = (sid, planet) => { goTo(sid, planet); G.state.customs = { ...(G.state.customs || {}), last: G.state.day }; Mods.emit('landed', currentPlanet()); return G.dialog && G.dialog.event; };
};
const run = async fn => { const t = await open(); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('telling the family the true thing earns the offer of a room, once; the kind thing does not', async () => {
  const r = await run(() => {
    const out = {}, { st, p } = setup();
    visitHome(p).choices[0].run(); out.kind = G.nextEvent && G.nextEvent.title; G.nextEvent = null; out.kindFlag = !!p.roomOffered;
    visitHome(p).choices[1].run(); const offer = G.nextEvent; out.title = offer.title; out.text = offer.text; out.labels = offer.choices.map(c => c.label); out.flag = p.roomOffered; G.nextEvent = null;
    visitHome(p).choices[1].run(); out.again = G.nextEvent && G.nextEvent.title; G.nextEvent = null;
    out.noRoomYet = st.room; offer.choices[1].run(); out.declined = st.room;
    return out;
  });
  assert.equal(r.kind, null); assert.equal(r.kindFlag, false); assert.equal(r.title, 'A Bed in Mars'); assert.match(r.text, /bed|room/i); assert.deepEqual(r.labels, ['Say yes', 'Thank them, and say no']); assert.equal(r.flag, true);
  assert.equal(r.again, null, 'it does not come again from that family'); assert.equal(r.noRoomYet, undefined); assert.equal(r.declined, undefined, 'declining sets nothing');
});

test('accepting sets the room at the family\'s port with the day, and thinks the better of the hand', async () => {
  const r = await run(() => {
    const { st, p } = setup(), op = p.opinion; visitHome(p).choices[1].run(); const offer = G.nextEvent; G.nextEvent = null; const text = offer.choices[0].run();
    return { room: { ...st.room }, day: st.day, text, op: p.opinion - op, mem: JSON.stringify(p.memories), pid: p.id };
  });
  assert.equal(r.room.planet, 'Mars'); assert.equal(r.room.pid, r.pid); assert.equal(r.room.since, r.day); assert.equal(r.room.last, r.day); assert.equal(r.room.visits, 0);
  assert.match(r.text, /The door with the bad latch/); assert.ok(r.op >= 1); assert.match(r.mem, /took the bed my .* offered/);
});

test('landing at the room\'s port opens the return by the gap and the count, once a stay; nothing elsewhere or the day of a stay; the Port page has the card only there', async () => {
  const r = await run(() => {
    const { st, p } = setup(), out = {}; p.visitedAt = st.day; st.room = { planet: 'Mars', pid: p.id, since: st.day - 300, last: st.day - 5, visits: 0 };  // (the visit home is not what this is about)
    out.elsewhere = (landOn('ceres', 'Ceres Station') || {}).title;
    const few = landOn('mars', 'Mars'); out.few = { title: few.title, text: few.text, labels: few.choices.map(c => c.label) };
    UI.tab = 'port'; UI.render(); out.card = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    out.stay = few.choices[0].run(); out.room = { ...st.room }; out.day = st.day; out.same = (landOn('mars', 'Mars') || {}).title;
    p.visitedAt = st.day + 1000; st.day += 40; const month = landOn('mars', 'Mars'); out.month = month.text; month.choices[1].run(); out.afterLook = { ...st.room, day: st.day };
    st.day += 200; const long = landOn('mars', 'Mars'); out.long = long.text;
    goTo('ceres', 'Ceres Station'); UI.render(); out.cardAway = document.querySelector('.shell .body').textContent;
    return out;
  });
  assert.notEqual(r.elsewhere, 'The Room in Mars'); assert.equal(r.few.title, 'The Room in Mars'); assert.match(r.few.text, /^The door sticks the way it did, and \S+ has not moved a thing in 5 days\./); assert.match(r.few.text, /It is the first time you have slept in it\.$/);
  assert.deepEqual(r.few.labels, ['Stay the night', 'Look in, and go back to the ship']); assert.match(r.card, /Your room\s*\S+'s, at Mars\. 5 days since you last slept here\./);
  assert.match(r.stay, /sleep through the watch change/); assert.equal(r.room.visits, 1); assert.equal(r.room.last, r.day); assert.notEqual(r.same, 'The Room in Mars', 'not the day of a stay');
  assert.match(r.month, /^It has been 40 days\./); assert.match(r.month, /You have slept in it once before\.$/);
  assert.equal(r.afterLook.visits, 1, 'looking in is not a stay'); assert.equal(r.afterLook.last, r.afterLook.day, 'but it is the last time you were there');
  assert.match(r.long, /^It has been 200 days, and/); assert.ok(!/Your room/.test(r.cardAway));
});

test('the person a room is kept by is not forgotten when the registry is full', async () => {
  const r = await run(() => {
    const { st, p } = setup(); st.room = { planet: 'Mars', pid: p.id, since: 1, last: 1, visits: 0 }; st.crew = st.crew.filter(id => id !== p.id);
    for (let i = 0; i < 140; i++) { const q = makePerson(cultureOf(st.systemId)); registerPerson(q); }
    return !!st.people[p.id];
  });
  assert.equal(r, true);
});
