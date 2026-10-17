'use strict';

// A room that is theirs (#670): the hand's one fixed point off the ship. After a visit home (family.js visitHome) in which the hand told the family the true thing, the relation says
// there is a bed here when the ship is in: one room at one port, the hand's by regard and not by rent (the offer; declined, it does not come again from that family). Accepting sets
// st.room = { planet, pid, since, last, visits }. A landing at that port then opens a scene that knows the gap, by three bands (a few days, a month, half a year) and not by a draw, and
// the Port page has a card for it. A stay spends nothing but the landing. The rules (roomBand, roomDue, roomOfferDue) take what they read as parameters, so they run in plain Node
// (tests/room.test.js). Loaded after family.js; only called into at runtime.

const ROOM_FEW = 14, ROOM_MONTH = 90;  // days since the last stay under which the gap is a few days, and under which a month

// One room, and one offer a family.
const roomOfferDue = (room, p) => !room && !p.roomOffered;
const roomBand = gap => (gap < ROOM_FEW ? 'few' : gap < ROOM_MONTH ? 'month' : 'long');
// The landing opens the scene at the room's port when a day has passed since the last stay.
const roomDue = (room, planetName, day) => !!room && room.planet === planetName && day > room.last;

const roomSay = id => familySay(id);  // the words are the lines of family:room-offer and family:room-return (peopletext.js)
const roomVars = (p, room, day) => ({ ...visitVars(p), gap: dayWord(day - room.last), count: room.visits });

// The relation's offer, at the end of the visit.
function roomOffer(p) {
  const say = roomSay('room-offer'), v = visitVars(p);
  return { title: say('title', v), text: say(`text.${pick([0, 1])}`, v), choices: [
    { label: say('c0.label', v), run() { const st = G.state; st.room = { planet: p.home, pid: p.id, since: st.day, last: st.day, visits: 0 }; like(p, 1, say('c0.memory', v)); return say('c0.result', v); } },
    { label: say('c1.label', v), run: () => say('c1.result', v) },
  ] };
}

// The return, by the gap and the count of stays.
function roomReturn(p) {
  const st = G.state, room = st.room, say = roomSay('room-return'), v = roomVars(p, room, st.day);
  const text = `${say(`text.${roomBand(st.day - room.last)}`, v)} ${say(room.visits ? (room.visits > 1 ? 'been.many' : 'been.one') : 'first', v)}`;
  const away = () => { room.last = st.day; };
  return { title: say('title', v), text, choices: [
    { label: say('c0.label', v), run() { away(); room.visits++; like(p, 1, say('c0.memory', v)); return say('c0.result', v); } },
    { label: say('c1.label', v), run() { away(); return say('c1.result', v); } },
  ] };
}

FAMILY_SCENES['room-offer'] = p => roomOffer(p);  // with the family scenes, for the editor and the lines tests
FAMILY_SCENES['room-return'] = p => { G.state.room = G.state.room || { planet: p.home, pid: p.id, since: G.state.day - 30, last: G.state.day - 30, visits: 1 }; return roomReturn(p); };

// The Port page's card at the room's port.
function roomCardHtml() {
  const st = G.state, room = st.room;
  if (!hired() || !room || room.planet !== currentPlanet().name || !st.people[room.pid]) return '';
  const v = roomVars(st.people[room.pid], room, st.day);
  return String(h`<h3>Your room</h3><p class="desc">${v.who}'s, at ${room.planet}. ${v.gap} since you last slept here${room.visits ? `, and ${room.visits} stay${room.visits === 1 ? '' : 's'} so far` : ''}.</p>`);
}

Mods.register({
  id: 'room', name: 'A room that is theirs', builtin: true,
  init(M) {
    M.on('landed', planet => {
      const st = G.state;
      if (!hired() || G.dialog || !roomDue(st.room, planet.name, st.day) || !st.people[st.room.pid]) return;
      openEvent(roomReturn(st.people[st.room.pid]));
    });
  },
});
