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
      { id: 'market', label: 'Market', level: 0, x0: 120, x1: 520, kind: 'market', page: 'port', stage: 270, bays: ['ngozi', 'seller', 'repairer'] },  // `bays`: whose shutters it draws, down outside their hours
      { id: 'bar', label: 'The Gravity Well', level: 0, x0: 520, x1: 860, kind: 'bar', page: 'bar', stage: 700 },
      { id: 'yard', label: 'Yard offices', level: 1, x0: 120, x1: 470, kind: 'yard', page: 'missions', stage: 230 },
      { id: 'clinic', label: 'Clinic', level: 1, x0: 470, x1: 860, kind: 'clinic', stage: 600 },
      { id: 'bunks', label: 'Bunkrooms', level: 2, x0: 120, x1: 860, kind: 'bunks', stage: 470 },
    ],
    // The port's own people (ports.md, Who is there): where each works and the hours they keep (an hour past 24 is after midnight). Ngozi is Tomas's
    // sister (lagos.md), with her food bay; the rest are made the first time and named from Lagos (LAGOS_NAMES, #1154), the same face on every visit.
    folk: [
      { key: 'ngozi', first: 'Ngozi', last: 'Achebe', job: 'food bay', room: 'market', x: 215, name: 'work', view: 'back', hours: [6, 21], offer: 'plate' },  // `offer`: what they sell the hand (PORT_OFFERS)
      // The woman from Surulere's market (daydown.js, #1164): the bay between tenants is hers SELLER_DAYS after the hand mentions her to the yard clerk.
      { key: 'seller', names: 'women', job: 'phone-repair bay', room: 'market', x: 408, name: 'work', view: 'back', hours: [9, 19], due: st => st.sellerAt !== undefined && st.day - st.sellerAt >= SELLER_DAYS },  // `due`: whether they are on the Ring yet
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
  // Ceres Station (docs/bible/ports.md, Ceres: the station; the reference frame docs/bible/ceres-target.png, #1256): a cut through the crater wall. The crater
  // floor on top, at a thirtieth of a g, flat, with the co-op's office and the lock in their rooms and the pad outside; the shaft down the left; an upper
  // ring and the lower ring below it, each a turning drum, their floors curved. Its people are named from the Belt (CERES_NAMES).
  'Ceres Station': {
    place: 'Ceres Station', section: 'Crater wall, shaft 3', berth: 'Pad 11, crater floor', clock: 'CERES TIME', backdrop: 'crater', names: 'belt',
    width: 860, radius: 6000, curve: 1, curves: [1.4, 1.4, 0], pace: [1, 1, 0.55],
    levels: [430, 270, 92],
    well: { car: 36, stair: [118, 72] },
    rooms: [
      { id: 'well', label: 'Shaft', level: 0, to: 2, x0: 0, x1: 120, kind: 'well', stage: 60 },
      { id: 'bunks', label: 'Renters\' rooms', level: 0, x0: 120, x1: 330, kind: 'bunks', stage: 220 },
      { id: 'bar', label: 'The Warren', level: 0, x0: 330, x1: 860, kind: 'warren', page: 'bar', stage: 560 },
      { id: 'market', label: 'Market', level: 1, x0: 120, x1: 360, kind: 'stalls', page: 'port', stage: 240, bays: ['parts', 'water', 'grain'] },
      { id: 'kaur', label: 'Kaur Enrichment', level: 1, x0: 360, x1: 520, kind: 'kaur', stage: 440 },
      { id: 'guild', label: 'Ice Haulers\' Guild', level: 1, x0: 520, x1: 700, kind: 'guild', stage: 600 },
      { id: 'clinic', label: 'Clinic', level: 1, x0: 700, x1: 860, kind: 'infirmary', stage: 780 },
      { id: 'yard', label: 'The co-op\'s office', level: 2, x0: 120, x1: 340, kind: 'coop', page: 'missions', stage: 260 },
      { id: 'lock', label: 'Lock', level: 2, x0: 340, x1: 540, kind: 'lockroom', stage: 440 },
      { id: 'pad', label: 'Pad 11', level: 2, x0: 540, x1: 860, kind: 'pad', outside: true },
    ],
    // The port's own people (ports.md, Ceres, Its people): the Warren's keeper, Mei Tan at the noodle stall under the co-op's stair (regulars.md), the co-op's
    // clerk, the lock's warden, Kaur's chief buyer (powers-people.md), the Guild's desk, the clinic's nurse and a stallholder in the market.
    folk: [
      { key: 'c-keeper', job: 'keeper of the Warren', room: 'bar', x: 600, name: 'stand', view: 'front', hours: [10, 27] },
      { key: 'c-noodles', first: 'Mei', last: 'Tan', job: 'noodle stall', room: 'yard', x: 150, name: 'work', view: 'back', hours: [6, 21], offer: 'bowl' },
      { key: 'c-clerk', first: 'Yusuf', last: 'Okonkwo-Reyes', job: 'the co-op\'s clerk', room: 'yard', x: 280, name: 'stand', view: 'front', hours: [7, 19], offer: 'work' },
      { key: 'c-warden', job: 'warden at the lock', room: 'lock', x: 400, name: 'stand', view: 'front', hours: [0, 24] },
      { key: 'c-buyer', first: 'Saoirse', last: 'Brennan', job: 'Kaur\'s chief buyer', room: 'kaur', x: 430, name: 'stand', view: 'front', hours: [7, 20] },
      { key: 'c-guild', job: 'the Guild\'s desk', room: 'guild', x: 650, name: 'work-sit', view: 'side', face: -1, hours: [7, 22] },
      { key: 'c-nurse', names: 'women', job: 'clinic nurse', room: 'clinic', x: 750, name: 'stand', view: 'front', hours: [8, 20], offer: 'care' },
      { key: 'parts', job: 'parts stall', room: 'market', x: 170, name: 'work', view: 'back', hours: [8, 18] },
    ],
    shifts: [6, 14, 22],
    spots: {
      lobby: [{ room: 'well', level: 2, x: 30 }, { room: 'well', level: 0, x: 60 }, { room: 'well', level: 1, x: 80 }],
      boards: [{ room: 'guild', x: 560, view: 'back' }, { room: 'guild', x: 600, view: 'back' }],
      stools: [{ room: 'bar', x: 510, name: 'sit', view: 'side', face: 1 }, { room: 'bar', x: 560, name: 'sit', view: 'side', face: -1 }, { room: 'bar', x: 610, name: 'sit', view: 'side', face: 1 }, { room: 'bar', x: 660, name: 'sit', view: 'side', face: -1 }, { room: 'bar', x: 420 }, { room: 'bar', x: 720 }],
      market: [{ room: 'market', x: 220 }, { room: 'market', x: 300 }, { room: 'yard', x: 230, name: 'sit', view: 'side', face: 1 }],
      clinic: [{ room: 'clinic', x: 820, name: 'sit' }],
    },
  },
};
const PORT_MORNING = 7;  // a night passed in port by its button or key wakes at seven (ports.md, The port's clock); the view's own clock runs on through the night
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
  const well = layout.well, spoke = layout.levels.length, n = { ...w, walked: w.walked || 0 }, reach = PORT_PACE * dt * ((layout.pace || [])[Math.round(w.lv || 0)] || 1);  // `pace`: a level's walk against the Ring's, slower where there is little weight (Ceres's crater floor, #1256)
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

// The ports' own people's word for the day (#1103, ports.md Scenes from people; docs/bible/voice.md): three each, by the layout's folk key, taken in
// turn by the day and not by a draw. {first} is their own first name. Read through the editor's words (lines:port-folk). The Ring's from lagos.md and
// people/tomas.md for Ngozi; Ceres's (the `c-` keys and the parts stall, #1265) from ceres.md, regulars.md and powers-people.md.
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
  seller: [
    '"Nobody up here fixes their own phone," {first} says, working a pick in under a battery. "On the mainland everybody does. Then they bring it to me."',
    'A yard worker waits at the counter while {first} tests a charging port. "The dust up here is different," {first} says. "Fine, like flour. It gets in everywhere. Down there it\'s sand, you can blow it out."',
    '"My sister thinks I\'m mad," {first} says. "She says, who goes up to fix phones? I tell her, who pays the rent on the market street? The rent\'s more up here. But they pay."',
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
  'c-keeper': [
    '{first} pours from the tap and marks it on the slate under the water ration. "Renters pay at the end of the week, members pay now," {first} says. "Which are you?"',
    '"Second shift\'s off in twenty minutes," {first} says, setting glasses out along the bar. "They\'ll come down the long stair. The lift\'s always slow at the change."',
    '{first} wipes the bar where the ring\'s curve sends the glasses sliding. "Put it down on the high side," {first} says. "Everyone learns."',
  ],
  'c-noodles': [
    '"Pork or the mushroom. The mushroom\'s grown here. The pork came in frozen, and it costs like it." Mei Tan ladles broth into a bowl before you answer.',
    'Mei Tan is writing the prices up on the board again. "Water went up," she says. "Broth\'s mostly water."',
    'Mei Tan has the council\'s letter about the lease under the cash tin. "Renewal\'s in June," she says. "Yusuf says he\'ll read it before I sign. He reads everything twice."',
  ],
  'c-clerk': [
    '"If you\'re after a berth on one of ours, the board\'s behind you," Yusuf says. "The hulls in chalk are full. The ones in pencil, ask me."',
    'Yusuf has two quarters\' books open side by side and a third on the screen. "The lender\'s officer comes Thursday," he says, and goes back to the column.',
    '"Kettle wants the meeting moved to first shift," Yusuf says, writing it down. "Half the members are on first shift. He says that\'s the point."',
  ],
  'c-warden': [
    '{first} checks your papers against the screen and hands them back. "Weapons stay on the ship. That\'s the knife on your belt too, if it\'s longer than your hand."',
    '{first} runs a finger down the manifest. "Any machine parts in that? You\'ll want the licence, or it\'s duty at the counter." {first} stamps it before you answer.',
    '{first} is eating a bowl of Mei Tan\'s noodles at the lock desk, one eye on the feed from the pads. "Two co-op boats in tonight," {first} says. "They always come in together."',
  ],
  'c-buyer': [
    '"Posted price, delivered to the Vesta depot\'s tanks, less the assay," Saoirse Brennan says. "If you\'re carrying ice, that\'s the number. If you\'re not, I\'m busy."',
    'Saoirse Brennan is reading the haulers\' assays off a screen, one load at a time. "Too much dust in that one," she says, and marks it down a tenth.',
    '"Arjun\'s gone back to Vesta for the month," Saoirse Brennan says. "His father wants him at the depot." She signs a purchase order and puts it on the pile.',
  ],
  'c-guild': [
    '{first} slides a form across the desk. "Membership\'s by the year, off your wage once you\'re on a hauler. Until then it\'s cash." {first} taps the line for the signature.',
    '"Mirela\'s in with the council," {first} says. "Berth rates. It\'s always the berth rates."',
    '{first} is pinning the week\'s hauls on the board: which hull, which rock, what the ice assayed at. "Kaur took the lot at the posted price," {first} says. "Again."',
  ],
  'c-nurse': [
    '"Members are on the Guild\'s cover," {first} says. "Renters pay at the desk first." She hands you a form on a board.',
    '{first} is changing the sheets on the cots. "Frostbite this week," she says. "A suit heater went on the ice house\'s second shift. He\'ll keep the fingers."',
    '"Ilka\'s on nights again," {first} says, signing a chart. "Fourth week. Nights pay a third more."',
  ],
  parts: [
    '{first} turns a pump housing over in both hands. "Off a hauler they broke up last month," {first} says. "Nobody\'ll rate it, but it\'s got years in it."',
    '"Rated parts are at the outfitter," {first} says. "Same part, three times the price, and a sticker." {first} goes back to the bench.',
    '{first} is sorting valve seals into jars by size. "The council wants the stall fee in advance from next quarter," {first} says. "So the seals are up."',
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
  bowl: {  // Mei Tan's, at Ceres (#1265)
    label: 'Buy a bowl ({cost} cr)', eaten: 'You\'ve eaten here today.',
    result: [
      'Mei Tan puts the bowl on the ledge of the stall with the chopsticks across it. "Bowl comes back to me," she says. "I\'m not paying the deposit on another fifty."',
      'Mei Tan gives you the mushroom, and a spoon of chilli oil you didn\'t ask for. A rigger off the yard\'s first shift eats standing next to you, out of the same pot.',
      'Mei Tan fills the bowl to the rim. "Last of the pot," she says. "Second shift will want a new one." She puts the water on.',
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
  return line.replace(/\{first\}/g, p.first).replace(/\{cost\}/g, fmt(kind === 'care' ? PORT_CARE : PORT_PLATE));  // a bowl is a plate's price
}
// The scene a click on one of them opens: their word for the day, where they work, with them in it (portStage gathers them there), what they sell if
// they sell anything now, and leaving them to it. `st` is the save: the day, the hand's savings, and when they last ate here and arrived.
function portWordEvent(f, p, st) {
  const words = linedText('lines:port-folk', PORT_WORDS)[f.key], day = st.day, choices = [];
  const food = f.offer === 'plate' || f.offer === 'bowl' ? f.offer : null;  // Ngozi's plate, or Mei Tan's bowl at Ceres (#1265), each a meal a day
  if (food) choices.push({ label: portOfferSay(food, 'label', p, day), ...gated(needCr(PORT_PLATE), notYet(() => st.portAte === day, portOfferSay(food, 'eaten', p, day))), run() {
    st.credits -= PORT_PLATE; st.portAte = day;
    const t = food === 'plate' && tomasAboard();
    if (t && st.portTomas !== st.portArrived) { st.portTomas = st.portArrived; like(t, 1, portOfferSay('plate', 'memory', p, day)); }  // once a visit
    return portOfferSay(food, 'result', p, day);
  } });
  if (f.offer === 'care' && handHurt()) choices.push({ label: portOfferSay('care', 'label', p, day), ...gated(needCr(PORT_CARE)), run() {
    st.credits -= PORT_CARE; career().hurtUntil -= PORT_CARE_DAYS;
    return portOfferSay('care', 'result', p, day);
  } });
  const board = RAIL.find(e => e.tab === 'missions');  // the clerk's word on work: the Missions page, when its entry on the rail is open here
  if (f.offer === 'work' && board.ready(currentPlanet()) === true) choices.push({ label: portOfferSay('work', 'label', p, day), keep: true, run() { UI.tab = 'missions'; UI.pageOpen = true; return null; } });  // the scene closes onto it
  if (f.key === 'clerk' && st.metSeller && st.sellerAt === undefined) choices.push({ label: lagosSay('seller.mention'), run() { st.sellerAt = day; return lagosSay('seller.clerk', { first: p.first }); } });  // the woman from Surulere (daydown.js, #1164), once
  choices.push({ label: 'Leave them to it', keep: true, run: () => null });
  // A word that is for something the day down led to (daydown.js, #1164), once, which they have whatever you do next: the crayfish brought up from
  // Surulere for Ngozi, the seller's first word in her bay, and what the hand saw of the repairer's or the keeper's life below. Otherwise the day's word.
  const once = f.key === 'ngozi' && st.forNgozi ? ['ngozi', () => delete st.forNgozi] : f.key === 'seller' && !st.sellerMet ? ['seller', () => { st.sellerMet = true; }]
    : st.belowFor === f.key ? [`below.${f.key}`, () => delete st.belowFor] : null;
  const taken = c => ({ ...c, run() { once[1](); like(p, 1, lagosSay(`${once[0]}.memory`)); return c.run(); } });
  return { title: `${p.first} ${p.last}`, text: once ? lagosSay(`${once[0]}.given`, { first: p.first }) : words[day % words.length].replace(/\{first\}/g, p.first), people: [p.id], place: f.room, personal: true, choices: once ? choices.map(taken) : choices };
}

// The Ring's people are named from Lagos (lagos.md: Yoruba, Igbo and Hausa, and English for work; #1154), by the port's dice: a first name from `first`,
// or from `women` for one whose lines say she (a folk entry's `names`), and a surname. Not Achebe, which is Ngozi's family's.
const LAGOS_NAMES = {
  first: ['Adebayo', 'Tunde', 'Femi', 'Kemi', 'Bisi', 'Segun', 'Chidi', 'Emeka', 'Obinna', 'Uche', 'Nkechi', 'Ifeoma', 'Musa', 'Aminu', 'Hauwa', 'Zainab', 'Grace', 'Daniel', 'Joy', 'Samuel'],
  men: ['Tunde', 'Femi', 'Segun', 'Chidi', 'Obinna', 'Uche', 'Musa', 'Aminu', 'Daniel', 'Samuel', 'Adebayo'],  // the boy from Yaba (daydown.js, #1164); not Emeka, Tomas's father
  women: ['Funmilayo', 'Yetunde', 'Folake', 'Adaeze', 'Chiamaka', 'Halima', 'Aisha', 'Blessing'],
  last: ['Adeyemi', 'Okonkwo', 'Balogun', 'Okafor', 'Bello', 'Eze', 'Adebayo', 'Nwosu', 'Ibrahim', 'Oyelaran', 'Danjuma', 'Okoro', 'Afolabi', 'Uzor', 'Abubakar'],
};
// Ceres's own people's names (#1256): the Belt's mix, none of them a name the bible gives someone at Ceres already (regulars.md, powers-people.md).
const CERES_NAMES = {
  first: ['Anneke', 'Ravi', 'Tomasz', 'Hedda', 'Agathe', 'Idris', 'Kenji', 'Oluwa', 'Marta', 'Soren', 'Priya', 'Hamid', 'Bettina', 'Caius'],
  women: ['Anneke', 'Hedda', 'Agathe', 'Marta', 'Priya', 'Bettina'],
  last: ['Vasquez', 'Solberg', 'Nakamura', 'Haddad', 'Kowal', 'Castellan', 'Ruiz-Abe', 'Tavares', 'Petrov', 'Amsel', 'Moreau', 'Ostrem'],
};
const PORT_NAMES = { belt: CERES_NAMES };
// No two at a port share a first name or a surname: each takes the next not yet taken by those before it in the layout. Named from Lagos, or from the
// layout's `names` (Ceres from the Belt, #1256).
function lagosName(planet, f) {
  const roll = seededRandom(Math.abs(hash(`${planet.name} names`))), used = { first: [], last: [] };
  const from = (key, list) => { let x; do x = list[Math.floor(roll() * list.length)]; while (used[key].includes(x)); used[key].push(x); return x; };
  const list = PORT_NAMES[PORT_LAYOUTS[planet.name].names] || LAGOS_NAMES;
  for (const g of PORT_LAYOUTS[planet.name].folk) {
    const n = g.first ? { first: g.first, last: g.last } : { first: from('first', list[g.names || 'first']), last: from('last', list.last) };
    if (g.first) { used.first.push(g.first); used.last.push(g.last); }
    if (g.key === f.key) return n;
  }
  return null;
}
// The port's own people as records, made the first time from the port's culture by a dice stream of the port's own (official.js seededRandom), kept by
// port and key in st.portFolk, so they remember and are the same on every visit; marked `portFolk` so the bar keeps them off its stools (bar.js). Named
// from Lagos (`lagosNamed`); one a save made before that was is renamed the next time they are seen, and keeps the rest of their record (#1154).
function portFolkPerson(planet, f) {
  const st = G.state, ids = (st.portFolk = st.portFolk || {})[planet.name] = (st.portFolk[planet.name] || {});
  let p = ids[f.key] && st.people[ids[f.key]];
  const named = () => (f.first ? { first: f.first, last: f.last } : { ...lagosName(planet, f), lagosNamed: true });
  if (p) { if (!f.first && !p.lagosNamed) Object.assign(p, named()); return p; }
  const real = Math.random;
  Math.random = seededRandom(Math.abs(hash(`${planet.name} ${f.key}`)));
  try { p = makePerson(cultureOf(st.systemId)); } finally { Math.random = real; }
  Object.assign(p, { job: f.job, location: planet.name, portFolk: planet.name }, named());
  registerPerson(p);
  ids[f.key] = p.id;
  return p;
}
// A port's layout, and, given the save, with only the folk who are on the Ring by now (`due`).
const portLayout = (planet, st) => {
  const l = (planet && PORT_LAYOUTS[planet.name]) || null;
  return !l || !st || l.folk.every(f => !f.due || f.due(st)) ? l : { ...l, folk: l.folk.filter(f => !f.due || f.due(st)) };
};

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
// A lettered sign or board at Ceres (#1256): a plate with its words, and words on a board. At the view's size they are 12 px or more (#265).
const portBoardText = (ctx, x, y, text, col) => { ctx.save(); ctx.fillStyle = col; ctx.font = '700 9px monospace'; ctx.textBaseline = 'middle'; ctx.fillText(text, x, y); ctx.restore(); };
function portSign(ctx, x, y, w, text, col) { roomPart(ctx, roomRound(x, y, w, 12, 0.6), col, { top: 0.5 }); portBoardText(ctx, x + 4, y + 6.5, text, '#1a1612'); }
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
// Ceres's crater (#1256, ceres-target.png): rock below the crater floor; above it, outside, the floodlight masts and their light, the pad, and a ship's lower
// hull standing on it, her legs and bell, cut off by the frame's top, with the pressurised walkway to the lock. `X` maps world x to the canvas, `oy` and
// `zoom` the world's y. Pure drawing.
function portCrater(g, w, h, layout, X, oy, zoom) {
  const Y = y => oy + y * zoom, top = Math.min(...layout.levels), floor = Y(top + HULL.plate), pad = layout.rooms.find(r => r.outside);
  const rock = g.createLinearGradient(0, floor, 0, h); rock.addColorStop(0, '#2a2622'); rock.addColorStop(1, '#151311');
  g.fillStyle = rock; g.fillRect(0, floor, w, h - floor);
  for (let k = 0; k < 300; k++) { const x = (Math.sin(k * 3.17) * 0.5 + 0.5) * w, y = floor + (Math.sin(k * 7.71) * 0.5 + 0.5) * (h - floor); g.fillStyle = `rgba(90,80,70,${0.25 + (k % 4) * 0.1})`; g.fillRect(x, y, 2 + (k % 3), 1.5); }
  g.fillStyle = '#4a4238'; g.fillRect(0, floor - 3, w, 4);
  if (!pad) return;
  for (const mx of [X(pad.x0 + 60), X(pad.x1 - 20)]) {  // the floodlights
    g.fillStyle = '#3a4048'; g.fillRect(mx - 2, Y(top - 112), 4, floor - Y(top - 112)); g.fillStyle = '#e8e0c0'; g.fillRect(mx - 9, Y(top - 116), 18, 5);
    const lg = g.createLinearGradient(0, Y(top - 112), 0, floor); lg.addColorStop(0, 'rgba(255,236,190,0.18)'); lg.addColorStop(1, 'rgba(255,236,190,0.04)');
    g.fillStyle = lg; g.beginPath(); g.moveTo(mx - 8, Y(top - 111)); g.lineTo(mx - 110 * zoom, floor); g.lineTo(mx + 110 * zoom, floor); g.fill();
  }
  const px = X((pad.x0 + pad.x1) / 2 + 20), pw = 240 * zoom, base = floor - 3, hw = 150 * zoom, legY = base - 70 * zoom, hullBot = base - 80 * zoom, hullTop = Y(top - 132);
  g.fillStyle = '#5a5248'; g.fillRect(px - pw / 2, base - 4, pw, 6);
  for (let k = -3; k <= 3; k++) { g.fillStyle = k % 2 ? '#c8a040' : '#2a2a2a'; g.fillRect(px + k * pw / 7 - pw / 16, base - 4, pw / 8, 2); }
  g.strokeStyle = '#6a727c'; g.lineWidth = 4;
  for (const sd of [-1, 1]) { g.beginPath(); g.moveTo(px + sd * hw * 0.42, hullBot); g.lineTo(px + sd * hw * 0.62, base - 4); g.stroke(); g.fillStyle = '#4a525c'; g.fillRect(px + sd * hw * 0.62 - 10, base - 8, 20, 5); }
  g.fillStyle = '#2a2e34'; g.beginPath(); g.moveTo(px - 26 * zoom, hullBot); g.lineTo(px + 26 * zoom, hullBot); g.lineTo(px + 40 * zoom, legY + 30 * zoom); g.lineTo(px - 40 * zoom, legY + 30 * zoom); g.fill();  // the bell
  g.fillStyle = 'rgba(255,140,60,0.15)'; g.fillRect(px - 30 * zoom, legY + 26 * zoom, 60 * zoom, 4);
  const hg = g.createLinearGradient(px - hw / 2, 0, px + hw / 2, 0); hg.addColorStop(0, '#3a424c'); hg.addColorStop(0.5, '#6a727c'); hg.addColorStop(1, '#30363e');
  g.fillStyle = hg; g.fillRect(px - hw / 2, hullTop, hw, hullBot - hullTop);
  g.strokeStyle = 'rgba(20,24,30,0.6)'; g.lineWidth = 1; for (let y = hullTop + 10 * zoom; y < hullBot; y += 18 * zoom) { g.beginPath(); g.moveTo(px - hw / 2, y); g.lineTo(px + hw / 2, y); g.stroke(); }
  g.fillStyle = '#c8a040'; g.fillRect(px - hw / 2, hullBot - 12 * zoom, hw, 3);
  const wy = Y(top - 56); g.fillStyle = '#3a4250'; g.fillRect(X(pad.x0), wy, px - hw / 2 - X(pad.x0), 22 * zoom);  // the walkway to the lock
  g.fillStyle = 'rgba(200,220,240,0.18)'; for (let k = 0; k < 6; k++) g.fillRect(X(pad.x0 + 10) + k * 18 * zoom, wy + 6 * zoom, 10 * zoom, 8 * zoom);
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
  market(ctx, r, F, time, open = {}) {  // bays rented in the wall: Ngozi's food bay, the bay between tenants that becomes Funmilayo's, a repair bay; the port in the floor. A bay is shut outside its keeper's hours
    portLamp(ctx, 200, F - 98, 70); portLamp(ctx, 330, F - 98, 60, 0.3); portLamp(ctx, 450, F - 98, 70);
    portScuff(ctx, 200, F, 50); portScuff(ctx, 330, F, 40); portScuff(ctx, 430, F, 30); portStain(ctx, 150, F - 84, 40, 30);
    portBay(ctx, 140, 110, open.ngozi === false);
    if (open.ngozi !== false) {
      roomPart(ctx, roomRound(196, F - 54, 40, 4, 1), '#4a4e52', { top: 0.8 });
      roomPart(ctx, roomRound(200, F - 62, 16, 8, 2), '#5a5a5e', { top: 1 }); roomPart(ctx, roomRound(220, F - 63, 14, 9, 2), '#6a5040', { top: 1 });
      portLamp(ctx, 195, F - 84, 40, 0.3);
    }
    for (const sx of [160, 240]) roomStool(ctx, sx, F, 0);
    portBay(ctx, 380, 56, open.seller !== true);  // between tenants until Funmilayo has it: a tray of screens by size, and a lamp on an arm
    if (open.seller === true) { roomPart(ctx, roomRound(386, F - 54, 40, 4, 1), '#4a4e52', { top: 0.8 }); for (let k = 0; k < 4; k++) roomPart(ctx, roomRound(388 + k * 9, F - 63 + k, 7, 9 - k, 1), '#1a2a36', { top: 0.4 }); portLamp(ctx, 420, F - 42, 22, 0.35); }
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
  // ---------- Ceres Station's rooms (ports.md, Ceres: the station; ceres-target.png, #1256), drawn from their own box, so they sit anywhere on a level ----------
  coop(ctx, r, F) {  // the co-op's office: the noodle stall under the stair up from the yard floor, the counter, the board of hulls and where each is, the back room's door
    const x = r.x0;
    portLamp(ctx, x + 40, F - 98, 40, 0.3); portLamp(ctx, x + 170, F - 98, 60, 0.2);
    roomPart(ctx, roomRound(x + 12, F - 34, 56, 34, 1), '#5a3a2a', { top: 1, solid: 0.4 }); roomPart(ctx, roomRound(x + 20, F - 46, 16, 12, 3), '#8a8a8a', { top: 1 }); roomDot(ctx, x + 28, F - 52, 5, 'rgba(230,230,230,0.25)');
    portSign(ctx, x + 14, F - 70, 52, 'NOODLES', '#b0503a');
    ctx.strokeStyle = '#4a5a6a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + 70, F); ctx.lineTo(x + 110, F - 100); ctx.stroke();
    roomPart(ctx, roomRound(x + 120, F - 38, 70, 38, 1), '#3a4a5a', { top: 1, solid: 0.35 });
    roomOnWall(ctx, x + 160, F - 60, () => { roomPart(ctx, roomRound(x + 120, F - 90, 70, 44, 0.5), '#2a2e26', { top: 0 }); for (let l = 0; l < 5; l++) { roomFlat(ctx, x + 124, F - 84 + l * 8, 40, 4, '#c8c0a0'); roomFlat(ctx, x + 168, F - 84 + l * 8, 16, 4, ['#6a9a5a', '#c89a3a', '#6a9a5a', '#9a5a4a', '#6a9a5a'][l]); } });
    roomPart(ctx, roomRound(r.x1 - 34, F - 80, 26, 80, 1), '#2a3442', { top: 0, side: 2 }); roomDot(ctx, r.x1 - 14, F - 40, 1.6, '#c8a050');
    roomBench(ctx, x + 70, x + 110, F, true);
  },
  lockroom(ctx, r, F) {  // the council's lock: the warden's window, the hatch with the Guild Federation's mark, the queue rail
    const x = r.x0;
    portLamp(ctx, x + 80, F - 98, 60, 0.2);
    roomPart(ctx, roomRound(x + 20, F - 42, 90, 42, 1), '#2a3a48', { top: 1, solid: 0.3 }); roomPart(ctx, roomRound(x + 20, F - 86, 90, 36, 1), 'rgba(140,190,220,0.15)', {});
    roomPart(ctx, roomRound(r.x1 - 60, F - 88, 48, 88, 3), '#3a4652', { top: 1, side: 2 }); roomDot(ctx, r.x1 - 36, F - 60, 9, '#2a5a8a'); roomDot(ctx, r.x1 - 36, F - 60, 5, '#c8b070');
    roomFlat(ctx, x + 120, F - 34, r.x1 - x - 190, 2, '#6a7a8a');
  },
  stalls(ctx, r, F, time, open = {}) {  // the trade floor's stalls, shut outside their keepers' hours, and the ration notice
    const x = r.x0, w = (r.x1 - x - 40) / 3;
    portLamp(ctx, x + 60, F - 98, 50, 0.25); portLamp(ctx, x + 180, F - 98, 50, 0.25);
    (r.bays || []).forEach((k, i) => portBay(ctx, x + 14 + i * (w + 6), w - 6, F, !open[k]));
    roomOnWall(ctx, x + 60, F - 60, () => { roomPart(ctx, roomRound(r.x1 - 60, F - 96, 50, 20, 0.4), '#d8d0b8', { top: 0 }); for (let l = 0; l < 2; l++) roomFlat(ctx, r.x1 - 56, F - 92 + l * 7, 42, 2, '#3a3a3a'); });
  },
  kaur(ctx, r, F) {  // Kaur Enrichment's buying office: a counter, and the price board for ice
    const x = r.x0;
    portLamp(ctx, x + 70, F - 98, 50, 0.2);
    roomPart(ctx, roomRound(x + 30, F - 40, 100, 40, 1), '#3a3026', { top: 1, solid: 0.4 });
    roomOnWall(ctx, x + 80, F - 70, () => { roomPart(ctx, roomRound(x + 40, F - 84, 100, 32, 0.4), '#101820', { top: 0 }); portBoardText(ctx, x + 46, F - 71, 'ICE /T  412', '#e0a040'); portBoardText(ctx, x + 46, F - 59, 'D2O /L  ---', '#e0a040'); });
    portSign(ctx, x + 40, F - 48, 80, 'KAUR ENRICHMENT', '#7a8a6a');
  },
  guild(ctx, r, F) {  // the Ice Haulers' Guild: the board of names, the banner, the desk
    const x = r.x0;
    portLamp(ctx, x + 90, F - 98, 60, 0.2);
    roomPinboard(ctx, x + 14, F, 80);
    roomPart(ctx, roomRound(x + 104, F - 92, 64, 26, 0.4), '#7a2a24', { top: 0 }); portBoardText(ctx, x + 108, F - 81, 'ICE HAULERS', '#e8d8b8'); portBoardText(ctx, x + 122, F - 71, 'GUILD', '#e8d8b8');
    roomPart(ctx, roomRound(x + 110, F - 30, 60, 30, 1), '#2e3e50', { top: 1, solid: 0.4 }); portMug(ctx, x + 160, F - 30);
  },
  infirmary(ctx, r, F) {  // the council's clinic: the counter and its window, the bench to wait on
    const x = r.x0;
    portLamp(ctx, x + 70, F - 98, 60, 0.15);
    roomPart(ctx, roomRound(x + 10, F - 40, 80, 40, 1), '#2a3a48', { top: 1, solid: 0.3 }); roomPart(ctx, roomRound(x + 10, F - 84, 80, 34, 1), 'rgba(140,190,220,0.15)', {});
    roomBench(ctx, x + 100, r.x1 - 8, F, true);
  },
  warren(ctx, r, F) {  // the Warren: the long counter, the water ration over the taps, the stools, the posters, the shrine for the people the ice took at the far end
    const x = r.x0, cx = x + 160;
    for (const lx of [x + 100, x + 240, x + 380]) portLamp(ctx, lx, F - 98, 60, 0.28);
    roomOnWall(ctx, x + 200, F - 60, () => {
      for (const [px, c] of [[x + 20, '#a0503a'], [x + 60, '#3a6a8a']]) roomPart(ctx, roomRound(px, F - 86, 30, 40, 0.5), c, { top: 0, side: 1.5 });
      roomPart(ctx, roomRound(cx + 20, F - 96, 90, 24, 0.4), '#e8e0c8', { top: 0 }); portBoardText(ctx, cx + 26, F - 86, 'WATER RATION', '#2a2a2a'); portBoardText(ctx, cx + 26, F - 77, '2.4 L  18:00', '#2a2a2a');
      for (let k = 0; k < 8; k++) roomPart(ctx, roomRound(cx + 20 + k * 11, F - 68, 6, 16, 2), ['#6a8a9a', '#8a6a4a', '#c8c0a0'][k % 3], { top: 0.5 });
    });
    roomPart(ctx, roomRound(cx, F - 40, 200, 40, 1.5), '#3a4048', { top: 0, solid: 0.45 }); roomPart(ctx, roomRound(cx - 4, F - 44, 208, 6, 1), '#8a9098', { top: 1.5, under: 1, solid: 0.5, shadow: false });
    for (const mx of [cx + 20, cx + 70, cx + 150]) portMug(ctx, mx, F - 44);
    for (const sx of [cx + 20, cx + 70, cx + 120, cx + 170]) roomStool(ctx, sx, F, 0);
    const sh = r.x1 - 80;
    roomPart(ctx, roomRound(sh, F - 92, 62, 70, 4), '#1a1410', { top: 0 }); for (let l = 0; l < 6; l++) roomFlat(ctx, sh + 8, F - 84 + l * 7, 46, 3, '#b8a888');
    for (let k = 0; k < 5; k++) { roomDot(ctx, sh + 10 + k * 10, F - 26, 2, '#e8b050'); portLamp(ctx, sh + 10 + k * 10, F - 28, 10, 0.4); }
    portScuff(ctx, cx + 60, F, 80);
  },
  pad() {},  // outside: the crater floor and the ship are the backdrop's (portCrater)
};

// What moves in a room, drawn over its still picture each frame (portRoomImage): the market's menu screen and the port in its floor with Earth going
// by, and the yard clerk's screen. `time` is in seconds.
const PORT_LIVE = {
  market(ctx, r, F, time, open = {}) {
    if (open.ngozi !== false) roomScreen(ctx, 150, F - 76, 34, 18, 'nav', time);
    ctx.save(); ctx.beginPath(); ctx.ellipse(320, F - 4, 34, 4.5, 0, 0, Math.PI * 2); ctx.clip();  // the port in the floor, with the stars and Earth going by
    ctx.fillStyle = '#02040a'; ctx.fillRect(280, F - 10, 80, 12);
    const turn = Settings.reduceMotion ? 0.5 : (time / 40) % 1, ex = 290 + turn * 80;
    const g = ctx.createRadialGradient(ex, F + 30, 6, ex, F + 30, 36); g.addColorStop(0.7, '#3a7bd5'); g.addColorStop(0.95, '#9fd0ff'); g.addColorStop(1, 'rgba(159,208,255,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, F + 30, 36, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    ctx.strokeStyle = '#5a6a7a'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.ellipse(320, F - 4, 34, 4.5, 0, 0, Math.PI * 2); ctx.stroke();
  },
  yard(ctx, r, F, time) { roomScreen(ctx, 404, F - 58, 30, 22, 'nav', time); },
};
// A room's still picture, as the burn view keeps its rooms (shiplife.js cachedShell, rooms.js worldSprite): its shell and what is in it, drawn
// once at the screen's scale `sc` into an image and copied in each frame after, under the room's turn on the curve. Made again when the scale
// changes or a bay in it opens or shuts (`shut`: whether each of the room's `bays` is open). Null where there is no canvas to
// draw into (the Node tests), where the room is drawn as it is.
const PORT_ROOM_IMAGES = new Map();
function portRoomImage(rm, r, F, open, sc, shut) {
  if (typeof document === 'undefined') return null;
  const key = `${rm.id}|${sc.toFixed(3)}|${shut}`;
  let c = PORT_ROOM_IMAGES.get(key);
  if (!c) {
    if (PORT_ROOM_IMAGES.size > 48) PORT_ROOM_IMAGES.clear();
    c = document.createElement('canvas'); c.width = Math.ceil((r.x1 - r.x0) * sc); c.height = Math.ceil((F - r.top + HULL.plate) * sc);
    const g = c.getContext('2d'); g.setTransform(sc, 0, 0, sc, -r.x0 * sc, -r.top * sc);
    roomIn([r], () => { roomShell(g, r); PORT_ROOMS[rm.kind](g, r, F, 0, open); });
    PORT_ROOM_IMAGES.set(key, c);
  }
  return c;
}

// The view at `planet` into a canvas context g of w by h px: the frame's bar along the top (the section, the berth), the spoke rising to the hub, the
// rooms on the rim's curve, its outer hull, and Earth going by under it. `time` is ms (performance.now). Text is 12 px or more (#265). Returns where each
// room was drawn, { id, page, x, y, w, h } in the canvas's px, and each of the port's own people, { who, x, y, w, h }, for a click (#1132, #1103).
const PORT_BAR = 30;
function drawPortView(g, w, h, layout, time, hour = 12, cast = [], look = () => ({})) {
  const top = Math.min(...layout.levels) - 100, bottom = Math.max(...layout.levels) + HULL.plate, R = layout.radius, cx0 = layout.width / 2;
  const zoom = Math.min(w / layout.width, (h - PORT_BAR - 40) / (bottom - top + 40)), ox = (w - layout.width * zoom) / 2, oy = PORT_BAR + 30 * zoom - top * zoom;
  const curveAt = lv => (layout.curves ? layout.curves[Math.max(0, Math.min(layout.curves.length - 1, Math.round(lv)))] : layout.curve);  // `curves`: each level's own, a ring's against a flat floor (#1256)
  const sag = (x, lv = 0) => curveAt(lv) * (x - cx0) * (x - cx0) / (2 * R), X = x => ox + x * zoom, turn = Settings.reduceMotion ? 0.5 : (time / 40000) % 1;
  g.fillStyle = '#02050b'; g.fillRect(0, 0, w, h);
  for (let k = 0; k < 90; k++) { const x = (Math.sin(k * 12.9898) * 0.5 + 0.5) * w, y = PORT_BAR + (Math.sin(k * 78.233) * 0.5 + 0.5) * (h - PORT_BAR); g.fillStyle = `rgba(220,230,240,${0.25 + (k % 3) * 0.2})`; g.fillRect(x, y, 1.4, 1.4); }
  if (layout.backdrop === 'crater') portCrater(g, w, h, layout, X, oy, zoom);  // the crater's rock, and the floor outside with the ship on her pad (#1256)
  else {
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
  }
  // the rooms, each on the curve: dropped by the sag at its middle and turned by the slope there
  g.save(); g.translate(ox, oy); g.scale(zoom, zoom);
  for (const rm of layout.rooms) {
    // set on the curve by its chord, so the rooms of a level meet at their ends; the well, a shaft through the levels, stands upright at its edge's height
    if (rm.outside) continue;  // a place outside (Ceres's pad, #1256) is the backdrop's, not a box
    const F = layout.levels[rm.level], mid = (rm.x0 + rm.x1) / 2, up = rm.kind === 'well', a = up ? 0 : (sag(rm.x1, rm.level) - sag(rm.x0, rm.level)) / (rm.x1 - rm.x0), lift = up ? sag(rm.x1, rm.level) : (sag(rm.x0, rm.level) + sag(rm.x1, rm.level)) / 2;
    const r = { x0: rm.x0, x1: rm.x1, top: layout.levels[rm.to !== undefined ? rm.to : rm.level] - 100, floor: F, levels: layout.levels, well: layout.well, bays: rm.bays };  // the well is one box through the levels
    g.save(); g.translate(mid, F - lift); g.rotate(-a); g.translate(-mid, -F);
    g.beginPath(); g.rect(r.x0, r.top, r.x1 - r.x0, F - r.top + HULL.plate); g.clip();  // a room's things stay in its box
    const open = Object.fromEntries(layout.folk.map(f => [f.key, portOpen(f.hours, hour)]));
    const m = g.getTransform ? g.getTransform() : null, sc = m ? Math.hypot(m.a, m.b) : 0, still = m && portRoomImage(rm, r, F, open, sc, (rm.bays || []).map(k => (open[k] ? 1 : 0)).join(''));
    roomIn([r], () => {
      if (still) g.drawImage(still, r.x0, r.top, r.x1 - r.x0, F - r.top + HULL.plate);  // its still picture (portRoomImage), under its turn
      else { roomShell(g, r); PORT_ROOMS[rm.kind](g, r, F, time / 1000, open); }
      if (PORT_LIVE[rm.kind]) PORT_LIVE[rm.kind](g, r, F, time / 1000, open);  // and what moves in it; the rooms' own clock is seconds, as the burn view's
      const here = cast.filter(c => portRoomAt(layout, c) === rm.id);
      for (const y of new Set(here.filter(c => c.via === 'car').map(c => portFloor(layout, c.lv)))) portCar(g, layout.well.car, y);  // the car, where it is in the well
      for (const c of here) {  // the people in this room, in their postures (figures.js), each as look gives them; a walk's stride by the ground covered
        const frames = POSTURES[c.name].frames, fps = POSTURES[c.name].fps, frame = c.name === 'walk' ? Math.floor((c.walked || 0) / 10) % frames : fps ? Math.floor(time / 1000 * fps + c.x) % frames : 0;
        const pose = { name: c.name, view: c.view, face: c.face, frame }, y = portFloor(layout, c.lv) - (c.name === 'work' || c.name === 'work-sit' ? 2 : 0);
        if (!m) { drawPerson(g, pose, c.x, y, look(c)); continue; }
        // upright where they stand, so the burn view's figure images serve (figures.js figKept, which takes no turn): the room's turn is a degree or two
        const at = g.getTransform().transformPoint(new DOMPoint(c.x, y));
        g.save(); g.setTransform(sc, 0, 0, sc, at.x, at.y);
        figSprites = FIG_SPRITE_CACHE;
        try { drawPerson(g, pose, 0, 0, look(c)); } finally { figSprites = null; g.restore(); }
      }
      if (portDark(hour) && rm.id !== 'bar') { g.fillStyle = 'rgba(2,5,10,0.5)'; g.fillRect(r.x0, r.top, r.x1 - r.x0, F - r.top); }  // the rim's lights down; the bar's stay up
    });
    g.restore();
  }
  g.restore();
  // where each room was drawn, its box on the curve near enough for a click
  const boxes = layout.rooms.map(rm => {
    const lift = sag((rm.x0 + rm.x1) / 2, rm.level), top = oy + (layout.levels[rm.to !== undefined ? rm.to : rm.level] - 100 - lift) * zoom, floor = oy + (layout.levels[rm.level] - lift) * zoom;
    return { id: rm.id, page: rm.page || null, x: X(rm.x0), y: top, w: (rm.x1 - rm.x0) * zoom, h: floor - top };
  });
  for (const c of cast) if (c.kind === 'folk') boxes.push({ who: c.who, x: X(c.x) - 14 * zoom, y: oy + (portFloor(layout, c.lv) - 88 - sag(c.x, c.lv)) * zoom, w: 28 * zoom, h: 88 * zoom });  // and the port's own people, for a click on one
  for (const c of cast) boxes.push({ head: { id: c.who, x: X(c.x), y: oy + (portFloor(layout, c.lv) - 92 - sag(c.x, c.lv)) * zoom } });  // and where everyone's head is, for an offer's tag over them (#1192)
  // the room names on their plates, and the frame's bar, at screen size
  g.font = `600 12px ${roomFont}`; g.textBaseline = 'alphabetic';
  for (const rm of layout.rooms) {
    const F = layout.levels[rm.to !== undefined ? rm.to : rm.level], x = X(rm.x0) + 6, y = oy + (F - 100 - sag((rm.x0 + rm.x1) / 2, rm.level)) * zoom + 18, name = rm.label.toUpperCase(), tw = g.measureText(name).width;
    g.fillStyle = 'rgba(6,13,22,0.85)'; g.fillRect(x - 4, y - 13, tw + 8, 17); g.fillStyle = '#7f97b0'; g.fillText(name, x, y);
  }
  g.fillStyle = 'rgba(8,14,22,0.92)'; g.fillRect(0, 0, w, PORT_BAR);
  g.font = `600 13px ${roomFont}`; g.fillStyle = '#7f95ab';
  // the place, the clock and the berth; in a narrow view (a page docked beside it, #1132) the section goes, then the berth, then the place, so none run together
  const hh = Math.floor(hour) % 24, mm = Math.floor((hour % 1) * 6) * 10, clock = `${layout.clock || 'LAGOS TIME'} ${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
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

// ---------- a landing's scenes as offers on the view (#1192, ports.md, A landing's scenes at a port with a view) ----------
// At a port with a view, a landing's scenes after the customs, the settling up and the mourning (transit.js landingScenesPlay) wait here as offers: a tag
// on the view over the one they are about, or on their room, taken with a click. At most four show; one about someone shows only while the view has them
// in it, in their hours. They lapse when the port's day turns at a night, or when the ship sails: a people scene comes round at a later landing at the same
// port, business and the port's happenings do not. Each is { kind (offerScene's rank), ev (the scene, made at the landing), planet, label }. Not saved,
// as the burn's offers are not (game.js save).
const PORT_OFFERS_SHOWN = 4;
const PORT_OFFER_ROOM = { business: 'yard' };  // business is at the yard office; anything else with nobody the view has, where its scene happens or the market
function portOfferPut(kind, ev, planet) {
  if (!ev) return;
  G.portOffers = G.portOffers || [];
  G.portOffers.push({ kind, ev, planet: planet && planet.name, label: ev.title });
}
// The people scenes that lapsed at this port, taken out to come round again at this landing.
function portOffersBack(planet) {
  const here = (G.portLater || []).filter(o => planet && o.planet === planet.name);
  G.portLater = (G.portLater || []).filter(o => !here.includes(o));
  return here;
}
// The port's day turns, or the ship sails: every offer goes, the people's kept to come round again.
function portOffersLapse() {
  G.portLater = [...(G.portLater || []), ...(G.portOffers || []).filter(o => o.kind === 'people')];
  G.portOffers = [];
}
// Where an offer shows (pure): over one of its people the view has in it now (`castIds`, the cast's ids, portSceneWho's terms); not at all while its
// people are ones the view can have (`castable`) but has not now, outside their hours; else on its room (`rooms`, the layout's room ids): where its
// scene happens, business at the yard office, the rest in the market.
function portOfferWhere(o, ids, castIds, castable, rooms) {
  const on = ids.find(id => castIds.includes(id));
  if (on) return { id: on };
  if (ids.some(id => castable.includes(id))) return null;
  const room = [o.room, o.ev && o.ev.place, PORT_OFFER_ROOM[o.kind], 'market'].find(r => r && rooms.includes(r));
  return room ? { room } : null;
}
// The offers that show (pure): the first PORT_OFFERS_SHOWN, in the order made, of those that can show; `whoOf` gives an offer's people's ids. The day
// down's lanes on the spoke lift (`lift`) count as one between them, as one place to go down from (#1193).
function portOffersShown(offers, whoOf, castIds, castable, rooms) {
  const out = [];
  let n = 0, lift = false;
  for (const o of offers || []) {
    const at = portOfferWhere(o, whoOf(o), castIds, castable, rooms);
    if (!at) continue;
    const counts = !o.lift || !lift;
    if (counts && n >= PORT_OFFERS_SHOWN) continue;
    if (counts) n++;
    if (o.lift) lift = true;
    out.push({ offer: o, label: o.label, ...at });
  }
  return out;
}
// The view's offers now, from the game: who each is about, who the view has and can have.
function portOffersNow(planet, layout, cast) {
  const st = G.state, castIds = cast.map(c => c.who);
  const castable = [...layout.folk.map(f => f.key), ...st.crew, ...(G.patrons || []).filter(x => !x.cast).map(x => `patron:${x.p.id || x.p.first}`)];
  const standing = [...ashoreOffers(st, planet), ...downOffers(st, planet)];  // the day ashore's and the day down's, after the landing's (#1193)
  return portOffersShown([...(G.portOffers || []), ...standing], o => (o.ev ? portSceneWho(planet, scenePeople(o.ev)) : o.who ? [o.who] : []), castIds, castable, layout.rooms.map(r => r.id));
}
// Midnight on a port's view (#1275): the day turns as a night passed does. With a stay on, it is a night of the stay (stay.js passNight); without one the
// date moves on, the bar fills again and the night can bring something to the dock, and the ship's contract counts the day. The view's clock runs on after.
function portMidnight() {
  if (passNight()) return;
  const st = G.state, planet = currentPlanet();
  st.day++; Mods.emit('newDay', st.day);
  fillBar(planet);
  const ev = pickHappening('port', planet);
  if (ev) openEvent(ev);
}
// A click on an offer's tag takes it: it leaves the queue and its scene opens, its people walked to it (#1103).
function portOfferTake(o) {
  if (o.take) return o.take();  // the day ashore's and the day down's, which say what taking them does (#1193)
  G.portOffers = (G.portOffers || []).filter(x => x !== o);
  if (o.ev) openEvent(o.ev);
}

Mods.register({
  id: 'portview', name: 'The port view', builtin: true,
  init(M) {
    M.on('landed', planet => { G.portHour = portLayout(planet) ? arrivalHour(planet, G.state.day) : null; G.portWalkers = null; G.state.portArrived = G.state.day; if (G.portHour !== null) G.speed = G.speedBefore = 1; });  // each landing's clock starts at normal speed, as a burn does  // everyone in place as the view opens; the day of the visit, for what is once a visit
    M.on('newDay', () => { if (G.portHour !== null) G.portHour = PORT_MORNING; G.portWalkers = null; portOffersLapse(); });  // a night passed in port; the day's offers lapse (#1192)
    // A click on a room with a page opens it, as its entry on the rail does, and only when the rail would (a shut entry stays shut); the pointer shows where.
    // A click on one of the port's own people opens their word for the day (#1103), before the room they stand in.
    const point = (e, find) => { const c = e.target; if (!c || c.id !== 'vs' || !c.classList.contains('view') || G.mode !== 'landed' || G.dialog) return null; const r = c.getBoundingClientRect(); return find(G.portRooms, e.clientX - r.left, e.clientY - r.top); };
    const open = room => { const e = room && RAIL.find(x => x.tab === room.page); return e && (!e.shown || e.shown(UI.planet)) && e.ready(UI.planet) === true ? e : null; };
    const word = b => { if (!b) return null; const planet = currentPlanet(), layout = portLayout(planet, G.state), f = layout && layout.folk.find(x => x.key === b.who); return f && PORT_WORDS[f.key] ? portWordEvent(f, portFolkPerson(planet, f), G.state) : null; };  // one with no words opens nothing  // nothing hit, nothing read (the title screen has no game)
    const tag = (boxes, x, y) => (boxes || []).find(b => b.offer && x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h) || null;  // an offer's tag (#1192)
    document.addEventListener('click', e => { const t = point(e, (b, x, y) => tag(G.portOfferBoxes, x, y)); if (t) return portOfferTake(t.offer); const ev = word(point(e, portFolkAtPoint)); if (ev) return openEvent(ev); const entry = open(point(e, portRoomAtPoint)); if (entry) UI.act('tab', entry.tab); });
    document.addEventListener('mousemove', e => { if (e.target && e.target.id === 'vs') e.target.style.cursor = point(e, (b, x, y) => tag(G.portOfferBoxes, x, y)) || point(e, portFolkAtPoint) || open(point(e, portRoomAtPoint)) ? 'pointer' : ''; });
    M.on('frame', dt => {  // the clock, and anyone it moves walking there; under a scene the clock holds, and the scene's people walk to it (#1103)
      if (G.mode !== 'landed' || G.portHour === null) return;
      const st = G.state, planet = currentPlanet(), layout = portLayout(planet, st), { patrons, crew } = portAshore(st, G.patrons), ev = G.dialog && G.dialog.event;
      const pace = (dt || 0) * (G.speed === undefined ? 1 : G.speed);  // at the speed chosen, as a burn's (burnspeed.js): paused, nothing moves but a scene's people
      if (!G.dialog) {
        G.portHour += pace * 24 / SHIP_DAY;
        if (G.portHour >= 24) {  // the night runs on, and the day turns at midnight (the owner, 2026-11-15, #1275)
          if (G.portMidnight !== st.day) { G.portHour = 24; G.portMidnight = st.day; setBurnSpeed(0); }  // it pauses there first, since a day costs the contract: play turns it
          else if (pace > 0) { const h = G.portHour - 24; portMidnight(); G.portHour = h; }
        }
      }
      if (!layout) return;
      const cast = portCast(layout, G.portHour, patrons, crew, st.day);
      G.portWalkers = portWalk(G.portWalkers, ev ? portStage(cast, portSceneWho(planet, scenePeople(ev)), layout, ev.place) : cast, layout, ev ? dt || 0 : pace, Settings.reduceMotion);
    });
  },
});
