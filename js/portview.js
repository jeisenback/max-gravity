'use strict';

// The port view (#1101, docs/bible/ports.md, the reference frame docs/bible/ports-target.png): a cutaway of the part of a port a crew uses, drawn the way
// the burn view draws the ship (js/rooms.js: rooms as boxes in depth, warm light in a cold structure, wear where people go). A port that has one gets a
// tall view strip in place of the painted backdrop (bridge.js drawViewscreen); the rest keep theirs. Its people keep the port's hours (#1102, ports.md, How a
// port runs): who is where at an hour is portCast, from the layout's `folk` (the port's own people, the same on every visit) and its `hours`. When the hour
// moves someone, they walk there (#1124, portWalk): along a level, and up or down the well, by its stair or the spoke lift's car.
// A port is data, as the ship's layout is (LAYOUTS, layouts.js): its levels (the floor of each, in world units, outermost first) and its rooms, each a
// kind drawn by PORT_ROOMS with its own extent and words; the next port is new data and, where it has new kinds of room, new drawers. Pure drawing:
// no state read but the clock, no randomness.

// Lagos Ring (docs/bible/ports.md): a slice of the rim, three levels deep, the outermost at half a g. The rim is 200 m in radius, 10,000 world units
// (a person stands 85): over the slice the floor rises a few units at each end, too little to read, so `curve` draws it twice over; more, and the rooms
// (each a straight box set on the curve) step apart.
const PORT_LAYOUTS = {
  Earth: {
    place: 'Lagos Ring', section: 'Rim, section 14', berth: 'Berth 6, hub',
    width: 860, radius: 10000, curve: 2,
    levels: [300, 186, 72],
    // The well (#1124): the spoke lift comes down it through all three levels, its car on a rail at `car` with its doors on each landing, and the stair
    // winds up beside it, a flight a storey from `stair[0]` on the outermost level to `stair[1]` on the next, and back the other way to the one above.
    well: { car: 36, stair: [118, 72] },
    rooms: [
      // `page`: the page a click on the room opens (#1132); `stage`: where a scene that happens there gathers, by Ngozi's bay, at the hiring boards, in front of the counter (#1103)
      { id: 'well', label: 'Lift', level: 0, to: 2, x0: 0, x1: 120, kind: 'well', stage: 60 },
      { id: 'market', label: 'Market', level: 0, x0: 120, x1: 520, kind: 'market', page: 'port', stage: 270 },
      { id: 'bar', label: 'The Gravity Well', level: 0, x0: 520, x1: 860, kind: 'bar', page: 'bar', stage: 700 },
      { id: 'yard', label: 'Yard offices', level: 1, x0: 120, x1: 470, kind: 'yard', page: 'missions', stage: 230 },
      { id: 'clinic', label: 'Clinic', level: 1, x0: 470, x1: 860, kind: 'clinic', stage: 600 },
      { id: 'bunks', label: 'Bunkrooms', level: 2, x0: 120, x1: 860, kind: 'bunks', stage: 470 },
    ],
    // The port's own people (ports.md, Who is there): where each works and the hours they keep (an hour past 24 is after midnight). Ngozi is Tomas's
    // sister (lagos.md), with her food bay; the rest are made from the port's culture the first time, the same face on every visit.
    folk: [
      { key: 'ngozi', first: 'Ngozi', last: 'Achebe', job: 'food bay', room: 'market', x: 215, name: 'work', view: 'back', hours: [6, 21], offer: 'plate' },  // `offer`: what they sell the hand (PORT_OFFERS)
      { key: 'repairer', job: 'repair bay', room: 'market', x: 490, name: 'work', view: 'back', hours: [8, 18] },
      { key: 'keeper', job: 'keeper of the Gravity Well', room: 'bar', x: 700, name: 'stand', view: 'front', hours: [11, 26] },
      { key: 'clerk', job: 'yard clerk', room: 'yard', x: 420, name: 'work-sit', view: 'side', face: -1, hours: [7, 19], offer: 'work' },
      { key: 'nurse', job: 'clinic nurse', room: 'clinic', x: 540, name: 'stand', view: 'front', hours: [8, 20], offer: 'care' },
    ],
    // The place's hours: the yard's shift changes fill the lift lobby, the hiring boards draw contract workers by day, the Gravity Well's stools and the
    // spaces along its wall seat the bar's patrons while it is open, and the ship's crew ashore are in the market by day and at the bar after it.
    shifts: [6, 14, 22],
    spots: {
      lobby: [{ room: 'well', level: 0, x: 20 }, { room: 'well', level: 0, x: 50 }, { room: 'well', level: 0, x: 76 }],
      boards: [{ room: 'yard', x: 200, view: 'back' }, { room: 'yard', x: 315, view: 'back' }, { room: 'yard', x: 365 }],
      stools: [{ room: 'bar', x: 660, name: 'sit', view: 'side', face: 1 }, { room: 'bar', x: 740, name: 'sit', view: 'side', face: -1 }, { room: 'bar', x: 620, name: 'sit', view: 'side', face: 1 }, { room: 'bar', x: 790, name: 'sit', view: 'side', face: -1 }, { room: 'bar', x: 560 }, { room: 'bar', x: 835 }],
      market: [{ room: 'market', x: 300 }, { room: 'market', x: 352 }, { room: 'market', x: 240, name: 'sit', view: 'side', face: -1 }],
      clinic: [{ room: 'clinic', x: 690, name: 'sit' }, { room: 'clinic', x: 760, name: 'sit' }],
    },
  },
};
const PORT_NIGHT = 22, PORT_MORNING = 7;  // the view's clock stops at night (ports.md, The port's clock), and a night passed in port wakes at seven
const portOpen = (hours, hour) => { const [a, b] = hours, h = b > 24 && hour < a ? hour + 24 : hour; return h >= a && h < b; };
const portDark = hour => hour >= 21 || hour < 6;  // the rim's lights down: Lagos's night
// The hour at a landing (ports.md): the port's own dice, from the port and the day, so it moves no other system's rolls; a morning, a day or an evening.
const arrivalHour = (planet, day) => 8 + (Math.abs(hash(`${planet.name}|${day}|arrive`)) % 120) / 10;

// Who is on the view at `hour` (pure: the layout, the hour, the bar's patrons and the ship's crew ashore, each { id, first, role }, and the day for the port's dice):
// a list of { who, room, lv, x, name, view, face, kind } where lv is the level and kind is 'folk' (the port's own), 'patron', 'worker' or 'crew'. Nobody is drawn twice.
function portCast(layout, hour, patrons, crew, day) {
  const out = portCastAt(layout, hour, patrons, crew, day), rooms = Object.fromEntries(layout.rooms.map(r => [r.id, r]));
  return out.map(c => ({ ...c, lv: c.lv !== undefined ? c.lv : rooms[c.room].level }));
}
function portCastAt(layout, hour, patrons, crew, day) {
  const out = [], seed = k => Math.abs(hash(`${layout.place}|${day}|${Math.floor(hour)}|${k}`)), take = (list, n) => list.slice(0, Math.max(0, Math.min(n, list.length)));
  for (const f of layout.folk) if (portOpen(f.hours, hour)) out.push({ who: f.key, room: f.room, x: f.x, name: f.name, view: f.view, face: f.face || 1, kind: 'folk' });
  const keeper = layout.folk.find(f => f.room === 'bar'), barOpen = !keeper || portOpen(keeper.hours, hour);
  const s = layout.spots;
  if (barOpen) take(patrons, hour >= 17 || hour < 2 ? s.stools.length : 2).forEach((p, i) => out.push({ who: p.id, room: s.stools[i].room, x: s.stools[i].x, name: s.stools[i].name || 'stand', view: s.stools[i].view || 'front', face: s.stools[i].face || 1, kind: 'patron' }));
  const nearShift = layout.shifts.some(h => Math.abs(hour - h) < 1 || Math.abs(hour - h + 24) < 1);
  if (nearShift) take(s.lobby, 1 + (seed('lobby') % s.lobby.length)).forEach((sp, i) => out.push({ who: `worker:lobby:${i}`, room: sp.room, lv: sp.level, x: sp.x, name: 'stand', view: 'front', face: 1, kind: 'worker' }));
  if (hour >= 8 && hour < 18) take(s.boards, 1 + (seed('boards') % s.boards.length)).forEach((sp, i) => out.push({ who: `worker:boards:${i}`, room: sp.room, x: sp.x, name: 'stand', view: sp.view || 'front', face: 1, kind: 'worker' }));
  if (hour >= 9 && hour < 19 && seed('clinic') % 2) take(s.clinic, 1).forEach((sp, i) => out.push({ who: `worker:clinic:${i}`, room: sp.room, x: sp.x, name: sp.name, view: 'front', face: 1, kind: 'worker' }));
  const ashore = hour >= 18 && barOpen ? s.stools.slice(Math.min(patrons.length, s.stools.length)) : hour >= 9 && hour < 18 ? s.market : [];
  take(crew, Math.min(ashore.length, 1 + (seed('crew') % 2))).forEach((c, i) => out.push({ who: c.id, room: ashore[i].room, x: ashore[i].x, name: ashore[i].name || 'stand', view: ashore[i].view || 'front', face: ashore[i].face || 1, kind: 'crew', role: c.role }));
  return out;
}

// Walking (#1124, ports.md, Its people): from where someone was to where the hour puts them, along a level at the crew's pace aboard (shiplife.js), and up
// or down the well: one storey by the stair, more, or to and from the spoke, by the car. Anyone the hour brings comes down the spoke in the car, and anyone
// it takes goes up it. A walker is a cast entry ({ who, kind, role, lv, x, and a posture }) with `via` ('stair' or 'car' while between levels) and
// `walked` (the ground covered, for the stride). Pure: the walkers before, the cast now, the layout, the seconds since; `snap` puts everyone in place
// (reduced motion, or no walkers yet: a landing, a morning). The spoke is the level past the last.
const PORT_PACE = 90, PORT_STAIR = 0.6, PORT_CAR = 0.8;  // world units a second along a level (a person stands 85); storeys a second on the stair, and in the car
const portFloor = (layout, lv) => { const L = layout.levels, i = Math.max(0, Math.min(L.length - 2, Math.floor(lv))); return L[i] + (L[i + 1] - L[i]) * (lv - i); };
// Where the stair is at lv, a storey's flight running from one end to the other and the next back again; at a level, the foot of the flight up and the head of the one down.
const portStairX = (well, lv) => { const s = Math.floor(lv), [a, b] = s % 2 ? [well.stair[1], well.stair[0]] : well.stair; return a + (b - a) * (lv - s); };
function portStep(w, to, layout, dt) {
  const well = layout.well, spoke = layout.levels.length, n = { ...w, walked: w.walked || 0 }, reach = PORT_PACE * dt;
  const along = tx => { const d = tx - n.x; if (d) n.face = Math.sign(d); if (Math.abs(d) <= reach) { n.walked += Math.abs(d); n.x = tx; return true; } n.x += Math.sign(d) * reach; n.walked += reach; return false; };
  const walking = () => Object.assign(n, { name: 'walk', view: 'side' });
  if (n.lv !== to.lv) {
    const via = n.via || (to.lv >= spoke || n.lv >= spoke || Math.abs(to.lv - n.lv) > 1 ? 'car' : 'stair');
    if (!n.via) { if (along(via === 'car' ? well.car : portStairX(well, n.lv))) n.via = via; return walking(); }  // to the car's doors or the stair's foot
    const d = Math.sign(to.lv - n.lv), end = via === 'stair' ? (d > 0 ? Math.floor(n.lv) + 1 : Math.ceil(n.lv) - 1) : to.lv;  // the stair a storey at a time
    const step = (via === 'car' ? PORT_CAR : PORT_STAIR) * dt;
    n.lv = Math.abs(end - n.lv) <= step ? end : n.lv + d * step;
    if (Number.isInteger(n.lv)) n.via = null;  // off at a landing
    if (via === 'car') return Object.assign(n, { name: 'stand', view: 'front' });
    const x = portStairX(well, n.lv); n.walked += Math.abs(x - n.x); if (x !== n.x) n.face = Math.sign(x - n.x); n.x = x;
    return walking();
  }
  if (n.x !== to.x) { along(to.x); return walking(); }
  return Object.assign(n, { name: to.name, view: to.view, face: to.face });
}
function portWalk(walkers, cast, layout, dt, snap) {
  if (!walkers || snap) return cast.map(c => ({ ...c, walked: 0, via: null }));
  const spoke = layout.levels.length, by = new Map(walkers.map(w => [w.who, w])), out = [];
  for (const c of cast) {
    const w = by.get(c.who); by.delete(c.who);
    out.push({ ...portStep(w || { ...c, lv: spoke, x: layout.well.car, via: 'car' }, c, layout, dt), room: c.room, kind: c.kind, role: c.role });
  }
  for (const w of by.values()) { const n = portStep(w, { lv: spoke, x: layout.well.car }, layout, dt); if (n.lv < spoke) out.push(n); }
  return out;
}
// A scene's people where it happens (#1103, ports.md Scenes from people), as a burn scene stages its people in the cutaway (stageScene, shiplife.js).
// Pure: the cast, the scene's people as cast `who`s in the order the scene names them, the layout, and the room the scene happens in (its `place`),
// if it has one. Those of them on the view gather where the first is when the first is there already (or the scene has no place), and else at the
// room's `stage`: the first stays as they are, the rest stand beside them, facing them; anyone else standing there steps aside. A scene with nobody on
// the view changes nothing. Marked `staged`.
const PORT_STAGE_GAP = 60;  // between two in a scene: a little over a body's width
function portStage(cast, who, layout, place) {
  const named = [...new Set(who)].map(w => cast.find(c => c.who === w)).filter(Boolean);
  if (!named.length) return cast;
  const at0 = layout.rooms.find(r => r.id === portRoomAt(layout, named[0])), there = layout.rooms.find(r => r.id === place && r.stage !== undefined);
  const room = there && there !== at0 ? there : at0, keep = room === at0, well = layout.rooms.find(r => r.kind === 'well');
  const a = keep ? named[0] : { x: room.stage, lv: room.level };  // the first where they are, or the place's spot
  const inRoom = x => Math.max(room.x0 + 20, Math.min(room.x1 - 20, x)), onLevel = x => Math.max(well.x1 + 20, Math.min(layout.width - 20, x));
  const spots = named.map((c, i) => (i || !keep ? inRoom(a.x + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * PORT_STAGE_GAP) : a.x));
  const lo = Math.min(...spots) - PORT_STAGE_GAP / 2, hi = Math.max(...spots) + PORT_STAGE_GAP / 2, at = new Map(named.map((c, i) => [c.who, i]));
  return cast.map(c => {
    if (at.has(c.who)) { const i = at.get(c.who); return i || !keep ? { ...c, room: room.id, lv: a.lv, x: spots[i], name: 'stand', view: 'side', face: Math.sign(a.x - spots[i]) || (i % 2 ? -1 : 1), staged: true } : { ...c, staged: true }; }
    if (c.lv !== a.lv || c.x <= lo || c.x >= hi) return c;
    return { ...c, x: onLevel(c.x - lo < hi - c.x ? lo - PORT_STAGE_GAP / 2 : hi + PORT_STAGE_GAP / 2), name: 'stand', view: 'front', face: 1 };  // out of the way
  });
}

// The room a walker is drawn in: the well, while between levels or at its landings; else the room on their level they are in.
function portRoomAt(layout, c) {
  const well = layout.rooms.find(r => r.kind === 'well');
  if (!Number.isInteger(c.lv) || c.lv >= layout.levels.length || c.x < well.x1) return well.id;
  const on = layout.rooms.filter(r => r.level === c.lv && r !== well);
  return (on.find(r => c.x >= r.x0 && c.x < r.x1) || on[on.length - 1]).id;
}

// The Ring's own people's word for the day (#1103, ports.md Scenes from people; docs/bible/voice.md, lagos.md, people/tomas.md for Ngozi): three each, by
// the layout's folk key, taken in turn by the day and not by a draw. {first} is their own first name. Read through the editor's words (lines:port-folk).
const PORT_WORDS = {
  ngozi: [
    '"You\'re off Tomas\'s ship." Ngozi puts a plate of rice and stew on the counter before you\'ve asked for one. "He sends money and he doesn\'t send messages. Tell him Chidi made the football team at school. He\'ll pretend he isn\'t pleased."',
    'Ngozi is frying puff-puff for the two o\'clock shift, a tray at a time. "There used to be three trays by now," she says. "Sit down. You can have the ones that came out flat."',
    '"Is he eating, on that ship?" Ngozi wipes the counter. "He says the food is fine. Tomas always says the food is fine."',
  ],
  repairer: [
    '{first} has a suit glove open under the lamp and is fitting new seals to the fingers. "The agencies issue these for the contract and don\'t take them back," {first} says. "People sell them to me when they go down, and I sell them to the next lot coming up."',
    '{first} is soldering something small under a magnifier. "The Orbitals lost again," {first} says, without looking up. "Three nil. To a Luna side."',
    '{first} counts a handful of seals into a bag. "The permit\'s up in March, and they want it in scrip this year, not trade notes." {first} ties the bag. "Thirty for the lot."',
  ],
  keeper: [
    '{first} puts a glass in front of you. "Scrip or trade notes? Scrip\'s cheaper this week." {first} wipes the copper where the glass was.',
    '"Shift\'s off at two and they all come in at once," {first} says, filling a jug. "Have a stool now, or stand later."',
    'The ring channel is on over the bar, with the Orbitals two down at half time. "Every week," {first} says. "Scrip or trade notes?"',
  ],
  clerk: [
    '{first} looks up from a contract. "If you\'re after work, the boards are behind you. Welding\'s a three-week wait. Rigging\'s four, unless you\'ve got your own harness."',
    '"Tycho took another refit off us," {first} says. "That\'s a shift\'s worth of berths free from Thursday, if you know anyone who wants to come up."',
    '{first} is on a call to an agency, reading a roster out a name at a time. "No, Okafor\'s gone down. No, him too." {first} puts a hand over the mic. "Sorry. With you in a minute."',
  ],
  nurse: [
    '"Cuts, burns and eyes," {first} says. "Mostly eyes this week. Somebody\'s not wearing the visor. Sit if you\'re waiting, the bench is free."',
    '{first} is counting dressing packs into a drawer. "We\'ve got the clinic contract till the end of the year," {first} says. "After that it goes out to tender again. Last time it went to a firm on the mainland, and nobody came up for a month."',
    '"Ear infections this week, mostly from the top bunkrooms," {first} says. "It\'s the filters up there. Maintenance has the ticket." {first} goes back to the screen.',
  ],
};
// What they offer the hand (the owner, 2026-11-13), the first two from the hand's own savings: a plate at Ngozi's, once a day, which Tomas likes once a visit;
// while the hand is hurt, the nurse's care, which takes days off it as a medic aboard does (MEDIC_DAYS), more of them; and the clerk's word on work, which
// is the Missions page, where the station's jobs are (jobs.js). The results are taken in turn by the day.
const PORT_PLATE = 120, PORT_CARE = 800, PORT_CARE_DAYS = 4;
const PORT_OFFERS = {
  plate: {
    label: 'Buy a plate ({cost} cr)', eaten: 'You\'ve eaten here today.', memory: 'You ate at Ngozi\'s stall on the ring.',
    result: [
      'Ngozi gives you more rice than the last person got, and takes your money without counting it. "Eat it here," she says. "The plates don\'t come back otherwise."',
      'Ngozi spoons stew over the rice and puts two puff-puff on the side of the plate. "Those are from this morning," she says. "Don\'t tell anyone they were free."',
      'Ngozi hands you the plate and goes back to the hob. The screen at the end of the counter has the Orbitals on with the sound off. You eat standing up while the shift comes in.',
    ],
  },
  work: { label: 'Ask about work' },
  care: {
    label: 'Have it seen to ({cost} cr)',
    result: [
      '{first} takes off the dressing from the ship, cleans the wound and puts a better one on. "Keep it dry. Come back if it goes hot."',
      '{first} looks at it under the lamp for a while. "It\'s healing. Slowly." {first} glues the worst of it and writes something down. "Leave it alone and it\'ll be quicker than it was going to be."',
      '{first} gives you a strip of tablets and a printed sheet that says what the label says. "One with food. You\'ll have been told that before."',
    ],
  },
};
// One of the offers' lines, through the editor's words (lines:port-offers): `key` is a line of it, or 'result' for the day's one; {first} is the seller's name, {cost} the price.
function portOfferSay(kind, key, p, day) {
  const o = linedText('lines:port-offers', PORT_OFFERS)[kind], line = key === 'result' ? o.result[day % o.result.length] : o[key];
  return line.replace(/\{first\}/g, p.first).replace(/\{cost\}/g, fmt(kind === 'plate' ? PORT_PLATE : PORT_CARE));
}
// The scene a click on one of them opens: their word for the day, where they work, with them in it (portStage gathers them there), what they sell if
// they sell anything now, and leaving them to it. `st` is the save: the day, the hand's savings, and when they last ate here and arrived.
function portWordEvent(f, p, st) {
  const words = linedText('lines:port-folk', PORT_WORDS)[f.key], day = st.day, choices = [];
  if (f.offer === 'plate') choices.push({ label: portOfferSay('plate', 'label', p, day), ...gated(needCr(PORT_PLATE), notYet(() => st.portAte === day, portOfferSay('plate', 'eaten', p, day))), run() {
    st.credits -= PORT_PLATE; st.portAte = day;
    const t = tomasAboard();
    if (t && st.portTomas !== st.portArrived) { st.portTomas = st.portArrived; like(t, 1, portOfferSay('plate', 'memory', p, day)); }  // once a visit
    return portOfferSay('plate', 'result', p, day);
  } });
  if (f.offer === 'care' && handHurt()) choices.push({ label: portOfferSay('care', 'label', p, day), ...gated(needCr(PORT_CARE)), run() {
    st.credits -= PORT_CARE; career().hurtUntil -= PORT_CARE_DAYS;
    return portOfferSay('care', 'result', p, day);
  } });
  const board = RAIL.find(e => e.tab === 'missions');  // the clerk's word on work: the Missions page, when its entry on the rail is open here
  if (f.offer === 'work' && board.ready(currentPlanet()) === true) choices.push({ label: portOfferSay('work', 'label', p, day), keep: true, run() { UI.tab = 'missions'; UI.pageOpen = true; return null; } });  // the scene closes onto it
  choices.push({ label: 'Leave them to it', keep: true, run: () => null });
  return { title: `${p.first} ${p.last}`, text: words[day % words.length].replace(/\{first\}/g, p.first), people: [p.id], place: f.room, personal: true, choices };
}

// The port's own people as records, made the first time from the port's culture by a dice stream of the port's own (official.js seededRandom), kept by
// port and key in st.portFolk, so they remember and are the same on every visit; marked `portFolk` so the bar keeps them off its stools (bar.js).
function portFolkPerson(planet, f) {
  const st = G.state, ids = (st.portFolk = st.portFolk || {})[planet.name] = (st.portFolk[planet.name] || {});
  let p = ids[f.key] && st.people[ids[f.key]];
  if (p) return p;
  const real = Math.random;
  Math.random = seededRandom(Math.abs(hash(`${planet.name} ${f.key}`)));
  try { p = makePerson(cultureOf(st.systemId)); } finally { Math.random = real; }
  Object.assign(p, { job: f.job, location: planet.name, portFolk: planet.name }, f.first ? { first: f.first, last: f.last } : {});
  registerPerson(p);
  ids[f.key] = p.id;
  return p;
}
const portLayout = planet => (planet && PORT_LAYOUTS[planet.name]) || null;

// ---------- the parts the rooms are made of ----------
const portPlate = (ctx, x, y, w, col = '#7a8a96') => { roomPart(ctx, roomRound(x, y, w, 5, 0.6), col, { top: 0.5 }); roomFlat(ctx, x + 1.5, y + 2, w - 3, 0.7, '#3a4650'); };  // a lease or name plate
// A warm lamp under the ceiling and the pool of light it makes (look.md rule 10).
function portLamp(ctx, x, y, rad, a = 0.42) {
  const g = ctx.createRadialGradient(x, y, 2, x, y + rad * 0.4, rad);
  g.addColorStop(0, `rgba(255,196,120,${a})`); g.addColorStop(1, 'rgba(255,196,120,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y + rad * 0.4, rad, 0, Math.PI * 2); ctx.fill();
  roomFlat(ctx, x - 6, y - 2, 12, 3, '#d8b070');
}
// Wear where people go: a scuff on the floor strip, a stain down a wall, a panel patched with a plate that does not match (look.md rule 9).
function portScuff(ctx, x, F, w) {
  ctx.fillStyle = 'rgba(4,8,12,0.35)'; ctx.beginPath(); ctx.ellipse(x, F - 4, w, 3, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(120,140,160,0.08)'; ctx.beginPath(); ctx.ellipse(x + w * 0.3, F - 5, w * 0.5, 1.5, 0, 0, Math.PI * 2); ctx.fill();
}
function portStain(ctx, x, y, w, h) { const g = ctx.createLinearGradient(0, y, 0, y + h); g.addColorStop(0, 'rgba(60,40,20,0.35)'); g.addColorStop(1, 'rgba(60,40,20,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, w, h); }
function portPatch(ctx, x, y, w, h) {
  roomOnWall(ctx, x, y + h, () => {
    roomPart(ctx, roomRound(x, y, w, h, 0.5), '#2a3644', { top: 0.6, side: 1 });
    for (const [px, py] of [[x + 2, y + 2], [x + w - 2, y + 2], [x + 2, y + h - 2], [x + w - 2, y + h - 2]]) roomDot(ctx, px, py, 0.6, '#5a6a7a');
  });
}
function portMug(ctx, x, y) { roomPart(ctx, roomRound(x, y - 6, 5, 6, 1), '#c8c0b0', { top: 0.5 }); ctx.strokeStyle = '#c8c0b0'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x + 5.5, y - 3, 1.8, -1.2, 1.2); ctx.stroke(); }
// A bay rented in the wall (ports.md, the market): a steel frame with the shutter's housing over it, the lease plate on the frame, the permit card for the year
// in the corner, and a counter in front; shut, its shutter is down. What is inside is the tenant's, drawn by the caller.
function portBay(ctx, x0, w, F, shut) {
  roomPart(ctx, roomRound(x0 - 3, F - 90, w + 6, 90, 1), '#2c3a48', { top: 1, side: 2, solid: 0.15 });
  roomPart(ctx, roomRound(x0, F - 84, w, 74, 0.5), '#0e1824', { top: 0 });
  roomPart(ctx, roomRound(x0 - 3, F - 92, w + 6, 9, 1), '#3a4858', { top: 1, under: 1 });
  portPlate(ctx, x0 + 4, F - 90, 22);
  roomPart(ctx, roomRound(x0 + w - 13, F - 80, 10, 13, 0.4), '#d8d0b8', { top: 0 });
  if (shut) { for (let y = F - 82; y < F - 2; y += 4) roomFlat(ctx, x0, y, w, 3, '#46505a'); roomFlat(ctx, x0 + w / 2 - 3, F - 6, 6, 3, '#2a3036'); return; }
  roomPart(ctx, roomRound(x0 - 2, F - 32, w + 4, 32, 1), '#3a4652', { top: 1.2, under: 1, solid: 0.35 });
}
// The spoke lift's car at a landing or on its way through the well (#1124): its box, lit inside, its doors open to the landing.
function portCar(ctx, x, y) {
  roomPart(ctx, roomRound(x - 25, y - 92, 50, 92, 1), '#2e3a46', { top: 1, side: 2 });
  roomFlat(ctx, x - 21, y - 88, 42, 86, '#4a4436');
  portLamp(ctx, x, y - 86, 24, 0.5);
}
// Earth as it goes by under the Ring, once every forty seconds (one turn at 1.5 a minute): `turn` is 0 to 1 through a turn.
function portEarth(ctx, cx, cy, r, turn) {
  const g = ctx.createRadialGradient(cx, cy, r * 0.92, cx, cy, r * 1.04);
  g.addColorStop(0, '#244a7a'); g.addColorStop(0.85, '#3a7bd5'); g.addColorStop(0.93, '#8fc4f0'); g.addColorStop(1, 'rgba(143,196,240,0)');
  ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.04, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = 'rgba(240,244,248,0.18)';
  for (const [dx, dy, rx] of [[-0.25, -0.86, 0.14], [0.12, -0.9, 0.09], [0.4, -0.82, 0.18]]) { ctx.beginPath(); ctx.ellipse(cx + (dx + turn * 0.6 - 0.3) * r, cy + dy * r, rx * r, r * 0.016, -0.15, 0, Math.PI * 2); ctx.fill(); }
}

// ---------- the rooms, by kind: each draws inside its box (r, its floor F), its words its own ----------
const PORT_ROOMS = {
  well(ctx, r, F) {  // the spoke lift's well through the three levels (#1124): on each landing the car's doors and the call panel, the stair winding up beside them; the arcology's mark over the lobby's doors
    const { levels: L, well } = r, c = well.car;
    roomFlat(ctx, c - 1, r.top, 2, F - r.top, '#4a6a8c');  // the car's rail, down from the spoke
    L.forEach((Fi, i) => {
      if (i) roomPart(ctx, roomRound(c + 28, Fi, r.x1 - c - 28, HULL.plate, 0), '#1a2836', { top: 1 });  // the landing, its floor the ceiling of the one below; the shaft open through it
      roomPart(ctx, roomRound(c - 27, Fi - 92, 54, 92, 1), '#2a3a4a', { top: 1, side: 2 });
      for (const x of [c - 24, c + 1]) roomPart(ctx, roomRound(x, Fi - 88, 23, 88, 0.5), '#46586a', { top: 0 });
      roomFlat(ctx, c - 1, Fi - 88, 2, 88, '#11181f');
      roomPart(ctx, roomRound(c + 30, Fi - 62, 8, 14, 1), '#3a4a58', { top: 0.6 }); roomDot(ctx, c + 34, Fi - 58, 1.4, '#e0a040'); roomDot(ctx, c + 34, Fi - 52, 1.4, '#5a6a74');
      if (i < L.length - 1) {  // the flight up to the next landing, its treads and its rail
        const a = portStairX(well, i), b = portStairX(well, i + 1), up = L[i + 1] - Fi;
        ctx.strokeStyle = '#3a4a5a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(a, Fi); ctx.lineTo(b, L[i + 1]); ctx.stroke();
        for (let k = 1; k < 12; k++) { const x = a + (b - a) * k / 12, y = Fi + up * k / 12; roomFlat(ctx, Math.min(x, x + (b - a) / 12), y - 1, Math.abs(b - a) / 12 + 1, 2.4, '#5a6a7a'); }
        ctx.strokeStyle = '#6a7a8a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a, Fi - 36); ctx.lineTo(b, L[i + 1] - 36); ctx.stroke();
      }
    });
    portPlate(ctx, c - 24, F - 98, 48, '#8a7a5a');
    portScuff(ctx, c + 10, F, 30);
  },
  market(ctx, r, F, time, open = {}) {  // bays rented in the wall: Ngozi's food bay, a bay between tenants, a repair bay; the port in the floor. A bay is shut outside its keeper's hours
    portLamp(ctx, 200, F - 98, 70); portLamp(ctx, 330, F - 98, 60, 0.3); portLamp(ctx, 450, F - 98, 70);
    portScuff(ctx, 200, F, 50); portScuff(ctx, 330, F, 40); portScuff(ctx, 430, F, 30); portStain(ctx, 150, F - 84, 40, 30);
    portBay(ctx, 140, 110, open.ngozi === false);
    if (open.ngozi !== false) roomScreen(ctx, 150, F - 76, 34, 18, 'nav', time);
    if (open.ngozi !== false) {
      roomPart(ctx, roomRound(196, F - 54, 40, 4, 1), '#4a4e52', { top: 0.8 });
      roomPart(ctx, roomRound(200, F - 62, 16, 8, 2), '#5a5a5e', { top: 1 }); roomPart(ctx, roomRound(220, F - 63, 14, 9, 2), '#6a5040', { top: 1 });
      portLamp(ctx, 195, F - 84, 40, 0.3);
    }
    for (const sx of [160, 240]) roomStool(ctx, sx, F, 0);
    // the port in the floor, with the stars and Earth going by
    ctx.save(); ctx.beginPath(); ctx.ellipse(320, F - 4, 34, 4.5, 0, 0, Math.PI * 2); ctx.clip();
    ctx.fillStyle = '#02040a'; ctx.fillRect(280, F - 10, 80, 12);
    const turn = Settings.reduceMotion ? 0.5 : (time / 40) % 1, ex = 290 + turn * 80;
    const g = ctx.createRadialGradient(ex, F + 30, 6, ex, F + 30, 36); g.addColorStop(0.7, '#3a7bd5'); g.addColorStop(0.95, '#9fd0ff'); g.addColorStop(1, 'rgba(159,208,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, F + 30, 36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5a6a7a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(320, F - 4, 34, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
    portBay(ctx, 380, 56, true);
    portBay(ctx, 450, 60, open.repairer === false);
    if (open.repairer !== false) for (let k = 0; k < 8; k++) roomPart(ctx, roomRound(454 + (k % 4) * 13, F - 80 + Math.floor(k / 4) * 12, 11, 9, 0.5), ['#3a5a6a', '#5a4a3a'][k % 2], { top: 0.5 });
    if (open.repairer !== false) { roomFlat(ctx, 470, F - 54, 1.5, 16, '#6a747c'); roomPart(ctx, roomRound(466, F - 40, 10, 5, 1), '#c8b070', { top: 0.6 }); portLamp(ctx, 471, F - 42, 22, 0.35); }
  },
  bar(ctx, r, F) {  // the Gravity Well: the copper counter, its stools, the posters and the shelf of bottles
    portLamp(ctx, 600, F - 98, 60, 0.3); portLamp(ctx, 700, F - 98, 60, 0.3); portLamp(ctx, 800, F - 98, 50, 0.2);
    roomOnWall(ctx, 560, F - 50, () => {
      for (const [px, c] of [[548, '#a0503a'], [600, '#3a6a8a'], [770, '#8a7a3a'], [820, '#5a3a6a']]) { roomPart(ctx, roomRound(px, F - 86, 30, 40, 0.5), c, { top: 0, side: 1.5 }); roomFlat(ctx, px + 4, F - 80, 22, 18, '#d8c8a0'); }
      for (let k = 0; k < 10; k++) roomPart(ctx, roomRound(660 + k * 9, F - 72 - (k % 3) * 2, 6, 18 + (k % 3) * 2, 2), ['#4a7a4a', '#8a5a2a', '#c8c0a0'][k % 3], { top: 0.5 });
      roomFlat(ctx, 654, F - 52, 100, 2, '#5a4a3a');
    });
    portScuff(ctx, 660, F, 60); portScuff(ctx, 770, F, 40); portStain(ctx, 540, F - 96, 30, 40); portPatch(ctx, 840, F - 64, 14, 30);
    roomPart(ctx, roomRound(600, F - 40, 210, 40, 1.5), '#5a3a26', { top: 0, solid: 0.45 });
    roomPart(ctx, roomRound(596, F - 44, 218, 6, 1), '#b87333', { top: 1.5, under: 1, solid: 0.5, shadow: false });
    for (const mx of [612, 650, 735, 760, 800]) portMug(ctx, mx, F - 44);
    for (const sx of [620, 660, 740, 790]) roomStool(ctx, sx, F, 0);
  },
  yard(ctx, r, F, time) {  // the agencies' hiring boards, and the yard's own desk where a refit is signed
    portLamp(ctx, 250, F - 98, 60, 0.18); portLamp(ctx, 400, F - 98, 60, 0.18);
    roomPinboard(ctx, 150, F, 120); roomPinboard(ctx, 280, F, 90);
    portPlate(ctx, 170, F - 92, 70, '#8a7a5a'); portPlate(ctx, 290, F - 92, 60, '#7a8a5a');
    portScuff(ctx, 210, F, 50); portScuff(ctx, 330, F, 40); portPatch(ctx, 136, F - 90, 12, 16);
    roomPart(ctx, roomRound(378, F - 30, 82, 30, 1), '#2e3e50', { top: 1, solid: 0.4 });
    roomScreen(ctx, 404, F - 58, 30, 22, 'nav', time);
    for (const [px, py, a] of [[384, F - 31, 0.1], [390, F - 32, -0.08]]) { ctx.save(); ctx.translate(px, py); ctx.rotate(a); roomFlat(ctx, 0, 0, 14, 1.4, '#d8d0c0'); ctx.restore(); }
    portMug(ctx, 446, F - 30);
  },
  clinic(ctx, r, F) {  // under contract: the counter and its window, the notice, the bench to wait on
    portLamp(ctx, 640, F - 98, 70, 0.15);
    roomPart(ctx, roomRound(490, F - 40, 140, 40, 1), '#2a3a48', { top: 1, solid: 0.3 });
    roomPart(ctx, roomRound(490, F - 84, 140, 34, 1), 'rgba(140,190,220,0.15)', {});
    portPlate(ctx, 525, F - 92, 70, '#5a8a9a');
    roomOnWall(ctx, 700, F - 60, () => { roomPart(ctx, roomRound(690, F - 88, 26, 32, 0.4), '#c8d8d8', { top: 0 }); for (let l = 0; l < 4; l++) roomFlat(ctx, 694, F - 82 + l * 6, 18, 1.2, '#5a7a8a'); });
    roomBench(ctx, 660, 820, F, true);
    portScuff(ctx, 740, F, 50); portScuff(ctx, 560, F, 30);
  },
  bunks(ctx, r, F) {  // the agency berths, three high, held as long as the contract: some curtained, a few with photos under a reading lamp, a bag on the floor
    portLamp(ctx, 200, F - 98, 40, 0.12); portLamp(ctx, 640, F - 98, 40, 0.12);
    for (let k = 0; k < 18; k++) roomBunk(ctx, berthBunk(r, 18, k), F, false, k % 5 === 3, 0);
    for (const k of [0, 4, 10]) { const b = berthBunk(r, 18, k); for (let q = 0; q < 3; q++) roomFlat(ctx, b.x + 10 + q * 7, b.y - 20, 5, 6, ['#a09a8c', '#8a9a7a', '#9a8a7a'][q]); portLamp(ctx, b.x + 8, b.y - 24, 18, 0.35); }
    roomPart(ctx, roomRound(470, F - 14, 22, 14, 3), '#4a5a3a', { top: 1 }); portScuff(ctx, 430, F, 60);
  },
};

// The view at `planet` into a canvas context g of w by h px: the frame's bar along the top (the section, the berth), the spoke rising to the hub, the
// rooms on the rim's curve, its outer hull, and Earth going by under it. `time` is ms (performance.now). Text is 12 px or more (#265). Returns where each
// room was drawn, { id, page, x, y, w, h } in the canvas's px, and each of the port's own people, { who, x, y, w, h }, for a click (#1132, #1103).
const PORT_BAR = 30;
function drawPortView(g, w, h, layout, time, hour = 12, cast = [], look = () => ({})) {
  const top = Math.min(...layout.levels) - 100, bottom = Math.max(...layout.levels) + HULL.plate, R = layout.radius, cx0 = layout.width / 2;
  const zoom = Math.min(w / layout.width, (h - PORT_BAR - 40) / (bottom - top + 40)), ox = (w - layout.width * zoom) / 2, oy = PORT_BAR + 30 * zoom - top * zoom;
  const sag = x => layout.curve * (x - cx0) * (x - cx0) / (2 * R), X = x => ox + x * zoom, turn = Settings.reduceMotion ? 0.5 : (time / 40000) % 1;
  g.fillStyle = '#02050b'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 90; k++) { const x = (Math.sin(k * 12.9898) * 0.5 + 0.5) * w, y = PORT_BAR + (Math.sin(k * 78.233) * 0.5 + 0.5) * (h - PORT_BAR); g.fillStyle = `rgba(220,230,240,${0.25 + (k % 3) * 0.2})`; g.fillRect(x, y, 1.4, 1.4); }
  const hull = oy + bottom * zoom;  // the outer hull's line at the slice's middle
  portEarth(g, w * (0.45 + turn * 0.3), hull + w * 0.62, w * 0.6, turn);
  // the outer hull under the floor, following the rim's curve
  g.fillStyle = '#0b1420'; g.beginPath();
  for (let x = 0; x <= w; x += 16) { const wx = (x - ox) / zoom; g[x ? 'lineTo' : 'moveTo'](x, hull + (4 - sag(wx)) * zoom); }
  for (let x = w; x >= 0; x -= 16) { const wx = (x - ox) / zoom; g.lineTo(x, hull - (14 + sag(wx)) * zoom); }
  g.closePath(); g.fill();
  g.strokeStyle = '#34506e'; g.lineWidth = 2; g.beginPath();
  for (let x = 0; x <= w; x += 16) { const wx = (x - ox) / zoom; g[x ? 'lineTo' : 'moveTo'](x, hull + (4 - sag(wx)) * zoom); }
  g.stroke();
  // the spoke's tube rising from the lift toward the hub, its rail inside
  const sx = X(layout.well.car), sTop = oy + (top - sag(layout.well.car)) * zoom;
  g.fillStyle = '#0b1420'; g.fillRect(sx - 28 * zoom, PORT_BAR, 56 * zoom, sTop - PORT_BAR); g.strokeStyle = '#34506e'; g.lineWidth = 2; g.strokeRect(sx - 28 * zoom, PORT_BAR, 56 * zoom, sTop - PORT_BAR);
  g.fillStyle = '#4a6a8c'; g.fillRect(sx - 2, PORT_BAR, 4, sTop - PORT_BAR);
  // the rooms, each on the curve: dropped by the sag at its middle and turned by the slope there
  g.save(); g.translate(ox, oy); g.scale(zoom, zoom);
  for (const rm of layout.rooms) {
    // set on the curve by its chord, so the rooms of a level meet at their ends; the well, a shaft through the levels, stands upright at its edge's height
    const F = layout.levels[rm.level], mid = (rm.x0 + rm.x1) / 2, up = rm.kind === 'well', a = up ? 0 : (sag(rm.x1) - sag(rm.x0)) / (rm.x1 - rm.x0), lift = up ? sag(rm.x1) : (sag(rm.x0) + sag(rm.x1)) / 2;
    const r = { x0: rm.x0, x1: rm.x1, top: layout.levels[rm.to !== undefined ? rm.to : rm.level] - 100, floor: F, levels: layout.levels, well: layout.well };  // the well is one box through the levels
    g.save(); g.translate(mid, F - lift); g.rotate(-a); g.translate(-mid, -F);
    g.beginPath(); g.rect(r.x0, r.top, r.x1 - r.x0, F - r.top + HULL.plate); g.clip();  // a room's things stay in its box
    const open = Object.fromEntries(layout.folk.map(f => [f.key, portOpen(f.hours, hour)]));
    roomIn([r], () => {
      roomShell(g, r); PORT_ROOMS[rm.kind](g, r, F, time / 1000, open);  // the rooms' own clock is seconds, as the burn view's
      const here = cast.filter(c => portRoomAt(layout, c) === rm.id);
      for (const y of new Set(here.filter(c => c.via === 'car').map(c => portFloor(layout, c.lv)))) portCar(g, layout.well.car, y);  // the car, where it is in the well
      for (const c of here) {  // the people in this room, in their postures (figures.js), each as look gives them; a walk's stride by the ground covered
        const frames = POSTURES[c.name].frames, fps = POSTURES[c.name].fps, frame = c.name === 'walk' ? Math.floor((c.walked || 0) / 10) % frames : fps ? Math.floor(time / 1000 * fps + c.x) % frames : 0;
        drawPerson(g, { name: c.name, view: c.view, face: c.face, frame }, c.x, portFloor(layout, c.lv) - (c.name === 'work' || c.name === 'work-sit' ? 2 : 0), look(c));
      }
      if (portDark(hour) && rm.id !== 'bar') { g.fillStyle = 'rgba(2,5,10,0.5)'; g.fillRect(r.x0, r.top, r.x1 - r.x0, F - r.top); }  // the rim's lights down; the bar's stay up
    });
    g.restore();
  }
  g.restore();
  // where each room was drawn, its box on the curve near enough for a click
  const boxes = layout.rooms.map(rm => {
    const lift = sag((rm.x0 + rm.x1) / 2), top = oy + (layout.levels[rm.to !== undefined ? rm.to : rm.level] - 100 - lift) * zoom, floor = oy + (layout.levels[rm.level] - lift) * zoom;
    return { id: rm.id, page: rm.page || null, x: X(rm.x0), y: top, w: (rm.x1 - rm.x0) * zoom, h: floor - top };
  });
  for (const c of cast) if (c.kind === 'folk') boxes.push({ who: c.who, x: X(c.x) - 14 * zoom, y: oy + (portFloor(layout, c.lv) - 88 - sag(c.x)) * zoom, w: 28 * zoom, h: 88 * zoom });  // and the port's own people, for a click on one
  // the room names on their plates, and the frame's bar, at screen size
  g.font = `600 12px ${roomFont}`; g.textBaseline = 'alphabetic';
  for (const rm of layout.rooms) {
    const F = layout.levels[rm.to !== undefined ? rm.to : rm.level], x = X(rm.x0) + 6, y = oy + (F - 100 - sag((rm.x0 + rm.x1) / 2)) * zoom + 18, name = rm.label.toUpperCase(), tw = g.measureText(name).width;
    g.fillStyle = 'rgba(6,13,22,0.85)'; g.fillRect(x - 4, y - 13, tw + 8, 17); g.fillStyle = '#7f97b0'; g.fillText(name, x, y);
  }
  g.fillStyle = 'rgba(8,14,22,0.92)'; g.fillRect(0, 0, w, PORT_BAR);
  g.font = `600 13px ${roomFont}`; g.fillStyle = '#7f95ab';
  // the place, the clock and the berth; in a narrow view (a page docked beside it, #1132) the section goes, then the berth, then the place, so none run together
  const hh = Math.floor(hour) % 24, mm = Math.floor((hour % 1) * 6) * 10, clock = `LAGOS TIME ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  const fits = (l, r) => g.measureText(l).width + g.measureText(clock).width / 2 + 24 < w / 2 && g.measureText(r).width + g.measureText(clock).width / 2 + 24 < w / 2;
  const full = `${layout.place.toUpperCase()}  -  ${layout.section.toUpperCase()}`, berth = layout.berth.toUpperCase(), place = layout.place.toUpperCase();
  const [left, right] = fits(full, berth) ? [full, berth] : fits(place, berth) ? [place, berth] : fits(place, '') ? [place, ''] : ['', ''];
  g.fillText(left, 16, 20); if (right) g.fillText(right, w - 16 - g.measureText(right).width, 20);
  g.fillText(clock, (w - g.measureText(clock).width) / 2, 20);
  return boxes;
}
// The room with a page at a point in the view's px (the boxes drawPortView returned), or null: a click there opens the page (#1132, ports.md The screen in port).
const portRoomAtPoint = (boxes, x, y) => (boxes || []).find(b => b.page && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;
// One of the port's own people at a point, before any room: a click on them opens their word for the day (#1103).
const portFolkAtPoint = (boxes, x, y) => (boxes || []).find(b => b.who && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;

// The view's people and clock, from the game (the one place that reads G): the port's own records, the bar's patrons and the ship's crew ashore, and the hour.
// The hour runs while the port is on screen with nothing open, at the burn view's pace (a day in SHIP_DAY seconds), and stops at night (ports.md).
const CIVIL = ['#8a6a4a', '#5a6a5a', '#7a5a6a', '#6a7a8a', '#9a8a6a', '#5a5a6a', '#8a4a3a', '#4a6a7a'];  // the port's own wear their own colours, not a ship's
// Who is ashore to be cast: the bar's patrons and the ship's crew, each { id, role, p }.
function portAshore(st, patrons) {
  return { patrons: (patrons || []).filter(x => !x.cast).map(x => ({ id: `patron:${x.p.id || x.p.first}`, p: x.p })), crew: st.crew.map(person).filter(c => c && c.id && !c.dead).map(c => ({ id: c.id, role: c.role, p: c })) };
}
// The scene's people as the view knows them: one of the port's own by their key, a patron of the bar, or one of the crew by id.
function portSceneWho(planet, people) {
  const folk = Object.fromEntries(Object.entries(((G.state.portFolk || {})[planet.name]) || {}).map(([k, id]) => [id, k]));
  return people.flatMap(p => [folk[p.id], p.id, `patron:${p.id || p.first}`]).filter(Boolean);
}
function portViewNow(planet, layout) {
  const st = G.state, hour = G.portHour === null ? arrivalHour(planet, st.day) : G.portHour;
  const folk = Object.fromEntries(layout.folk.map(f => [f.key, portFolkPerson(planet, f)]));
  const { patrons, crew } = portAshore(st, G.patrons);
  const byId = Object.fromEntries([...patrons, ...crew].map(x => [x.id, x.p]));
  const cast = G.portWalkers || portWalk(null, portCast(layout, hour, patrons, crew, st.day), layout, 0, true);
  const look = c => {
    const p = c.kind === 'folk' ? folk[c.who] : byId[c.who], id = p ? p.id || `${p.first}${p.last}` : c.who;
    return { color: c.kind === 'crew' ? ROLE_COLORS[c.role] || '#9aa7b5' : CIVIL[Math.abs(hash(String(id))) % CIVIL.length], ...portraitLook({ id }) };
  };
  return { hour, cast, look };
}

Mods.register({
  id: 'portview', name: 'The port view', builtin: true,
  init(M) {
    M.on('landed', planet => { G.portHour = portLayout(planet) ? arrivalHour(planet, G.state.day) : null; G.portWalkers = null; G.state.portArrived = G.state.day; });  // everyone in place as the view opens; the day of the visit, for what is once a visit
    M.on('newDay', () => { if (G.portHour !== null) G.portHour = PORT_MORNING; G.portWalkers = null; });  // a night passed in port
    // A click on a room with a page opens it, as its entry on the rail does, and only when the rail would (a shut entry stays shut); the pointer shows where.
    // A click on one of the port's own people opens their word for the day (#1103), before the room they stand in.
    const point = (e, find) => { const c = e.target; if (!c || c.id !== 'vs' || !c.classList.contains('view') || G.mode !== 'landed' || G.dialog) return null; const r = c.getBoundingClientRect(); return find(G.portRooms, e.clientX - r.left, e.clientY - r.top); };
    const open = room => { const e = room && RAIL.find(x => x.tab === room.page); return e && (!e.shown || e.shown(UI.planet)) && e.ready(UI.planet) === true ? e : null; };
    const word = b => { if (!b) return null; const planet = currentPlanet(), layout = portLayout(planet), f = layout && layout.folk.find(x => x.key === b.who); return f ? portWordEvent(f, portFolkPerson(planet, f), G.state) : null; };  // nothing hit, nothing read (the title screen has no game)
    document.addEventListener('click', e => { const ev = word(point(e, portFolkAtPoint)); if (ev) return openEvent(ev); const entry = open(point(e, portRoomAtPoint)); if (entry) UI.act('tab', entry.tab); });
    document.addEventListener('mousemove', e => { if (e.target && e.target.id === 'vs') e.target.style.cursor = point(e, portFolkAtPoint) || open(point(e, portRoomAtPoint)) ? 'pointer' : ''; });
    M.on('frame', dt => {  // the clock, and anyone it moves walking there; under a scene the clock holds, and the scene's people walk to it (#1103)
      if (G.mode !== 'landed' || G.portHour === null) return;
      const st = G.state, planet = currentPlanet(), layout = portLayout(planet), { patrons, crew } = portAshore(st, G.patrons), ev = G.dialog && G.dialog.event;
      if (!G.dialog) G.portHour = Math.min(PORT_NIGHT, G.portHour + (dt || 0) * 24 / SHIP_DAY);
      if (!layout) return;
      const cast = portCast(layout, G.portHour, patrons, crew, st.day);
      G.portWalkers = portWalk(G.portWalkers, ev ? portStage(cast, portSceneWho(planet, scenePeople(ev)), layout, ev.place) : cast, layout, dt || 0, Settings.reduceMotion);
    });
  },
});
