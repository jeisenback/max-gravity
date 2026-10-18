'use strict';

// A room that is theirs (#670): the hand's one fixed point off the ship. After a visit home (family.js visitHome) in which the hand told the family the true thing, the relation says
// there is a bed here when the ship is in: one room at one port, the hand's by regard and not by rent (the offer; declined, it does not come again from that family). Accepting sets
// st.room = { planet, pid, since, last, visits }. A landing at that port then opens a scene that knows the gap, by three bands (a few days, a month, half a year) and not by a draw, and
// the Port page has a card for it. A stay spends nothing but the landing. The rules (roomBand, roomDue, roomOfferDue) take what they read as parameters, so they run in plain Node
// (tests/room.test.js). Loaded after family.js; only called into at runtime.

const ROOM_FEW = 14, ROOM_MONTH = 90;  // days since the last stay under which the gap is a few days, and under which a month
const ROOM_THINGS = ['bag', 'jar', 'book'];  // what the hand leaves in the room: one a stay, in this order, so the count of stays is the whole record

// One room, and one offer a family.
const roomOfferDue = (room, p) => !room && !p.roomOffered;
const roomBand = gap => (gap < ROOM_FEW ? 'few' : gap < ROOM_MONTH ? 'month' : 'long');
const roomThings = visits => ROOM_THINGS.slice(0, visits);
// A letter waits at the room, and not at the dock, once the ship has been away a fortnight.
const roomLetter = (room, day) => day - room.last >= ROOM_FEW;
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
  const band = roomBand(st.day - room.last), left = roomThings(room.visits).pop();
  const text = [say(`text.${band}`, v), roomLetter(room, st.day) ? say(`letter.${band}`, v) : '', left ? say(`thing.${left}.there`, v) : '', say(room.visits ? (room.visits > 1 ? 'been.many' : 'been.one') : 'first', v)].filter(Boolean).join(' ');
  const away = () => { room.last = st.day; };
  return { title: say('title', v), text, choices: [
    { label: say('c0.label', v), run() { const next = ROOM_THINGS[room.visits]; away(); room.visits++; like(p, 1, say('c0.memory', v)); return `${say('c0.result', v)}${next ? ` ${say(`thing.${next}.left`, v)}` : ''}`; } },
    { label: say('c1.label', v), run() { away(); return say('c1.result', v); } },
  ] };
}

FAMILY_SCENES['room-offer'] = p => roomOffer(p);  // with the family scenes, for the editor and the lines tests
FAMILY_SCENES['room-return'] = p => { G.state.room = G.state.room || { planet: p.home, pid: p.id, since: G.state.day - 30, last: G.state.day - 30, visits: 1 }; return roomReturn(p); };

// The room's port as a run the hand can put to the captain: a contract there if the board has one, else a light run. None when the ship is in that system, or the plan is already bound for it.
function roomRun(room, { sid, from, ranked, run, days, yard }) {
  if (!room || sid === from || (run && run.sid === sid && run.planet === room.planet)) return null;
  const k = ranked.find(c => c.sid === sid && c.planet === room.planet);
  return { ...(k ? asRun(k) : { sid, planet: room.planet, yard, good: null, tons: 0, cost: 0, profit: 0, days, ballast: true }), room: true };
}
// The same for the game in hand: the run to the room if its port is in reach (the list the planner offers, hired.js currentPlan).
function roomAlts(run) {
  const st = G.state, room = st.room, from = st.systemId, sid = room && Object.keys(SYSTEMS).find(s => SYSTEMS[s].planets.some(p => p.name === room.planet));
  if (!sid || !inRange(from, sid)) return [];
  const r = roomRun(room, { sid, from, ranked: planRanked, run, days: Math.max(1, travelDays(from, sid)), yard: SYSTEMS[sid].planets.find(p => p.name === room.planet).services.includes('shipyard') });
  return r ? [r] : [];
}

// The Port page's card at the room's port.
function roomCardHtml() {
  const st = G.state, room = st.room;
  if (!hired() || !room || room.planet !== currentPlanet().name || !st.people[room.pid]) return '';
  const v = roomVars(st.people[room.pid], room, st.day), say = roomSay('room-return'), things = roomThings(room.visits).map(k => say(`thing.${k}.name`, v));
  return String(h`<h3>Your room</h3><p class="desc">${v.who}'s, at ${room.planet}. ${v.gap} since you last slept here${room.visits ? `, and ${room.visits} stay${room.visits === 1 ? '' : 's'} so far` : ''}.${things.length ? ` Left here: ${listNames(things)}.` : ''}${roomLetter(room, st.day) ? ` ${say('letter.card', v)}` : ''}</p>`);
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
