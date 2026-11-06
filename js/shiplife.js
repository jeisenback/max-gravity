'use strict';

// Life aboard during a burn: a cutaway of your ship in place of the outside view,
// with you, your crew, and your passengers moving between the engine room, hold,
// berths, galley, and bridge. Everyone is strapped in for the hard burns at each end
// and floats at the flip. Crew doing something visible sometimes says so on comms.
// A few times in a burn (every couple of days of the leg, the first before the flip and the last after), you can pick a downtime activity. Loaded
// before game.js; only calls into it at runtime.

// Two decks, stern to bow, as shares of the ship's length. Deck 0 is the upper deck, 1 the lower.
// The engine room is the full height of the stern; a ladder joins the decks.
const ROOMS = [
  { id: 'engine', name: 'Engine', x0: 0, x1: 0.17, deck: 1, tall: true },
  { id: 'hold', name: 'Hold', x0: 0.17, x1: 0.4, deck: 1 },
  { id: 'medbay', name: 'Medbay', x0: 0.4, x1: 0.6, deck: 1 },
  { id: 'berths', name: 'Berths', x0: 0.17, x1: 0.44, deck: 0 },
  { id: 'galley', name: 'Galley', x0: 0.44, x1: 0.66, deck: 0 },
  { id: 'gunnery', name: 'Gunnery', x0: 0.66, x1: 0.78, deck: 0 },
  { id: 'bridge', name: 'Bridge', x0: 0.78, x1: 0.92, deck: 0 },
];
const LADDER = 0.62;
for (const r of ROOMS) { r.w = r.x1 - r.x0; r.mid = (r.x0 + r.x1) / 2; }
const roomAt = id => ROOMS.find(r => r.id === id);

// ---------- scenes staged ----------
// Where a scene open in a burn is acted out, and who goes there (docs/superpowers/specs/2026-11-05-scenes-staged-design.md): the room the scene
// sets, else the first room its words name, else the bridge for the captain, the berths for a passenger, the galley otherwise. `aboard` is the
// cutaway's people ({ id, role }), `staged` the ids the scene names (scenePeople, character.js). null when nobody it names is aboard, or for a fight.
const SCENE_ROOM_WORDS = {
  galley: /\b(galley|the mess|the table)\b/i, bridge: /\b(bridge|cockpit)\b/i, engine: /\b(engine room|the drive)\b/i, hold: /\b(the hold|cargo bay)\b/i,
  medbay: /\b(medbay|clinic bunk)\b/i, berths: /\b(berths?|bunks?)\b/i, gunnery: /\b(gunnery|the guns)\b/i,
};
function sceneStage(ev, aboard, staged) {
  if (!ev || ev.board) return null;
  const by = new Map(aboard.map(p => [p.id, p])), named = staged.filter(id => id !== 'you' && by.has(id));
  if (!named.length) return null;
  const words = `${ev.title || ''} ${ev.text || ''}`, said = Object.entries(SCENE_ROOM_WORDS).map(([room, re]) => [room, words.search(re)]).filter(([, at]) => at >= 0).sort((a, b) => a[1] - b[1]);
  const has = role => named.some(id => by.get(id).role === role);
  const room = (ev.room && roomAt(ev.room) && ev.room) || (said[0] && said[0][0]) || (has('captain') ? 'bridge' : has('passenger') ? 'berths' : 'galley');
  return { room, ids: ['you', ...named] };
}
// The room under a point on the screen: the outline's first, then the rooms in view, from what the last cutaway drawing recorded.
function roomAtPoint(x, y) {
  const r = (G.cutRooms || []).find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h);
  return (G.cutOutline && outlineRoomAt(G.cutOutline, x, y)) || (r ? r.id : null);
}

// Where each kind of person likes to spend a burn.
const HAUNTS = {
  you: { bridge: 4, galley: 2, hold: 1, engine: 1, berths: 1, gunnery: 1, medbay: 1 },
  engineer: { engine: 5, galley: 2, berths: 1 },
  pilot: { bridge: 5, galley: 2, berths: 1 },
  gunner: { gunnery: 5, hold: 1, galley: 2, berths: 1 },
  quartermaster: { hold: 5, galley: 2, berths: 1 },
  slicer: { bridge: 3, berths: 2, galley: 2 },
  medic: { medbay: 5, berths: 2, galley: 2 },
  xo: { bridge: 4, hold: 2, galley: 2, engine: 1 },
  cook: { galley: 6, hold: 1, berths: 1 },
  icehand: { hold: 5, galley: 2, berths: 2 },
  passenger: { berths: 4, galley: 3, medbay: 1 },
  captain: { bridge: 6, galley: 2, berths: 1 },  // the hired captain (hired.js)
  cat: { engine: 4, galley: 3, berths: 2, bridge: 1, hold: 1 },
};
const ROLE_COLORS = { you: '#d9d4cc', captain: '#b9c4d0', engineer: '#ffa24a', pilot: '#6fb0ff', gunner: '#ff6b5a', quartermaster: '#f0d060', slicer: '#c08cff', medic: '#6fd08c', xo: '#e8e8f0', cook: '#e8a0a0', icehand: '#8fd8e8', passenger: '#9aa7b5', cat: '#b8aca0' };

// The ship's day: every SHIP_DAY seconds of a burn the lights go down for a night, and everyone who is not on watch turns in.
// 0 in the day, 1 at night, and a ramp at dusk and dawn. A burn starts in the morning.
const SHIP_DAY = 80, NIGHT_WATCH = ['pilot', 'engineer'];
function nightLevel() {
  const t = G.transit;
  if (!t) return 0;
  const f = (((t.elapsed || 0) + 6) / SHIP_DAY) % 1;
  return f < 0.55 ? 0 : f < 0.65 ? (f - 0.55) / 0.1 : f < 0.9 ? 1 : 1 - (f - 0.9) / 0.1;
}
const isDark = () => nightLevel() > 0.3;

// Ship life's own dice (docs/superpowers/specs/2026-11-05-working-routine-design.md): everything that only changes the cutaway (where someone
// walks, a seat, a comms flavour line) rolls these and not Math.random, so ship life never moves the game's dice. The state is a 32-bit number
// on the burn, seeded from the burn's facts (no draw of the game's); a burn from an older save seeds itself on first use.
function shipRand(t, st) {
  if (typeof t.lifeRng !== 'number') { let h = 2166136261; for (const ch of `${st.day}|${t.to}|${t.days}`) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); t.lifeRng = h >>> 0; }
  let x = (t.lifeRng = (t.lifeRng + 0x6D2B79F5) >>> 0);  // mulberry32
  x = Math.imul(x ^ (x >>> 15), x | 1); x ^= x + Math.imul(x ^ (x >>> 7), x | 61);
  return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
}
const lifeRnd = () => shipRand(G.transit, G.state), lifeRand = (a, b) => a + lifeRnd() * (b - a), lifePick = arr => arr[Math.floor(lifeRnd() * arr.length)];

// The ship's timetable (docs/superpowers/specs/2026-11-05-working-routine-design.md): the blocks of the day by the same share of it as nightLevel,
// and where each kind of person belongs in a block. A post is the room they like best; the watch keeps theirs through the dusk and the night.
const SHIP_TIMETABLE = [
  { block: 'breakfast', from: 0, to: 0.08 }, { block: 'shift', from: 0.08, to: 0.3 }, { block: 'meal', from: 0.3, to: 0.38 }, { block: 'shift', from: 0.38, to: 0.48 },
  { block: 'supper', from: 0.48, to: 0.55 }, { block: 'handover', from: 0.55, to: 0.65 }, { block: 'night', from: 0.65, to: 0.9 }, { block: 'wake', from: 0.9, to: 1 },
];
function shipDay(elapsed) {
  const f = (((elapsed || 0) + 6) / SHIP_DAY) % 1;
  return { block: SHIP_TIMETABLE.find(b => f >= b.from && f < b.to).block, f };
}
const postOf = role => (role === 'captain' ? 'bridge' : Object.entries(HAUNTS[role] || HAUNTS.passenger).sort((a, b) => b[1] - a[1])[0][0]);
// The ship's state (docs/superpowers/specs/2026-11-06-ship-state-design.md): the hull's damage marked on one to three rooms (the share of armor lost: up
// to a third one, up to two thirds two, more three), picked with ship life's dice and kept on the burn in the order added, so they stay put and the
// last added clears first; never the medbay. The hurt, those having a hard time, you hurt, and whoever gives first aid, read from the game.
function marksFor(t, d, rnd) {
  const n = d <= 0 ? 0 : d <= 1 / 3 ? 1 : d <= 2 / 3 ? 2 : 3, marks = (t.marks = t.marks || []);
  while (marks.length > n) marks.pop();
  while (marks.length < n) { const free = ROOMS.map(r => r.id).filter(id => id !== 'medbay' && !marks.includes(id)); marks.push(free[Math.floor(rnd() * free.length)]); }
  return marks;
}
// Who works at which mark: the repair hands (the engineer and deckhands) not hurt, in the order aboard, each to the free mark nearest their post.
const REPAIR_HANDS = ['engineer', 'icehand'];
function repairsFor(people, state) {
  const free = [...state.marks], out = {};
  for (const h of people.filter(p => REPAIR_HANDS.includes(p.role) && p.id && !state.hurt.includes(p.id))) {
    if (!free.length) break;
    const post = roomAt(postOf(h.role)), far = id => { const r = roomAt(id); return Math.abs(r.mid - post.mid) + (r.deck !== post.deck ? 1 : 0); };
    out[h.id] = free.sort((a, b) => far(a) - far(b)).shift();
  }
  return out;
}
function shipState(st, t, maxArmor, rnd) {
  const crew = st.crew.map(person).filter(Boolean), hurt = crew.filter(c => (st.injured || {})[c.id]).map(c => c.id), aid = roleHolder('medic');
  const d = maxArmor > 0 ? 1 - st.armor / maxArmor : 0;
  return { marks: marksFor(t, d, rnd), severe: d > 2 / 3, hurt, low: crew.filter(c => !hurt.includes(c.id) && moodLow(c)).map(c => c.id), you: handHurt(), aid: aid ? aid.id : null };
}

// With the ship's state (shipState, and `repairs`: who works at which mark), ahead of the timetable: the hurt in a medbay bed, you hurt there at night,
// first aid by the bunks in a shift while anyone is hurt, the repair hands at the marks in a shift, and someone low alone in the berths when the
// timetable would sit them at the table, and in the evening.
function routineSpot(p, block, state) {
  const role = p.role, id = p.id;
  if (role === 'cat') return { rounds: true };
  if (state) {
    if (id && state.hurt.includes(id)) return { room: 'medbay', at: 'bed' };
    if (role === 'you' && state.you && (block === 'night' || block === 'handover')) return { room: 'medbay', at: 'bed' };
    if (block === 'shift' && id && id === state.aid && state.hurt.length) return { room: 'medbay', at: 'aid' };
    if (block === 'shift' && id && state.repairs && state.repairs[id]) return { room: state.repairs[id], at: 'repair' };
    const plain = routineSpot(p, block);
    if (id && state.low.includes(id) && (plain.at === 'table' || (block === 'handover' && plain.at === 'bunk'))) return { room: 'berths', at: 'alone' };
    return plain;
  }
  if (block === 'supper' && role === 'captain') return { room: 'bridge', at: 'post' };  // the bridge is not left empty: the captain eats there, for the watch to take it
  if (['wake', 'breakfast', 'meal', 'supper'].includes(block)) return role === 'cook' ? { room: 'galley', at: 'stove' } : { room: 'galley', at: 'table' };
  if (block === 'shift') return role === 'you' || role === 'passenger' ? { rounds: true } : role === 'cook' ? { room: 'galley', at: 'stove' } : { room: postOf(role), at: 'post' };
  return NIGHT_WATCH.includes(role) ? { room: postOf(role), at: 'post' } : { room: 'berths', at: 'bunk' };  // the handover and the night
}
const nightHaunts = role => NIGHT_WATCH.includes(role) ? HAUNTS[role] : role === 'cat' ? { engine: 3, berths: 3 } : { berths: 9, galley: 1 };
const isAsleep = p => !p.staged && isDark() && p.room === 'berths' && p.tx === null && p.dk === 0 && p.role !== 'cat' && !NIGHT_WATCH.includes(p.role) && phase() === 'move';

// What someone is seen doing, by room and (optionally) role. {n} is their name, {m} someone else here.
const LIFE_LINES = {
  engine: { cat: ['{n} is asleep on the reactor housing, where it\'s warm.', '{n} is stretched full length along a warm pipe, purring in a key that matches the drive.', '{n} is watching a dripping valve without blinking.', '{n} is wedged behind the coolant manifold, where the pipes are warmest.', '{n} bats a loose cable tie across the deck and loses it under the housing.', '{n} is sitting in the middle of the walkway. Anyone who comes through steps over.'],
    engineer: [
      '{n} is elbow-deep in the reactor housing again.',
      '{n} is rerunning the injector timing. It was fine. It\'s finer now.',
      '{n} is lying on their back under the coolant manifold, telling a gasket a joke.',
      '{n} is tapping a pipe with a wrench, listening to the note it makes, and frowning.',
      '{n} is reading the coolant pressure off a gauge and writing it on the back of their hand.',
      '{n} is tightening a clamp a quarter turn and listening to the pump.',
      '{n} is checking the reactor log against the board, line by line.',
      '{n} has the injector cover off and is counting bolts back in.',
      '{n} is wiping a drip from the coolant line and following it to the fitting.',
      '{n} is holding a torch in their teeth and a wrench in each hand.'
    ],
    any: ['{n} is watching the reactor telltales like they owe money.', '{n} is leaning on the engine room hatch, feeling the drive hum through the deck.', '{n} is warming their hands on the coolant housing.', '{n} is reading the reactor log on the wall slate, line by line.', '{n} has a hand flat on the bulkhead, counting the pulses of the drive.', '{n} is wiping coolant off a fitting with the hem of their shirt.',
      '{n} is checking the engine room temperature gauge and tapping it.',
      '{n} is reading the coolant pressure off the wall slate.',
      '{n} is standing in the passage outside the engine room, listening to the pumps cycle.',
      '{n} is holding a rag and a wrench for the engineer.'] },
  hold: { cat: ['{n} is stalking something between the crates.', '{n} has found a box and is asleep in it.', '{n} sits on the highest crate in the hold, upright, watching the hatch.', '{n} is squeezed into the gap between two crates, tail out.', '{n} is pushing a loose bolt across the deck with one paw.', '{n} is asleep on a coil of mooring line.'],
    quartermaster: ['{n} re-straps the cargo and counts it twice.', '{n} is arguing with the manifest.', '{n} is walking the rows with a clipboard, tapping each crate in turn.', '{n} is sniffing a crate of food and writing something down.',
      '{n} is checking the seal numbers on a pallet against the manifest.',
      '{n} is weighing a crate on the hold scale and writing the figure in the margin.',
      '{n} is re-tagging a drum of reaction mass with a new date.',
      '{n} is shifting a pallet a hand\'s width to balance the load for the flip.',
      '{n} is signing the hold log at the foot of the ladder.',
      '{n} is prying the lid off a crate to check the count, then pressing it back down.'],
    gunner: ['{n} is dry-firing at shadows in the hold.', '{n} is cleaning a gun by feel in the half-dark.', '{n} has set up a target on a crate and is losing to it.', '{n} is oiling the bolt of a rifle laid across two crates.', '{n} is pacing the hold and counting the steps to each hatch.', '{n} is checking the lock on the small-arms locker, and then checking it again.',
      '{n} is checking the straps on the ammunition crates.',
      '{n} is counting spare barrels in the rack against the list.',
      '{n} is sitting on a crate, stripping a pistol onto a cloth.',
      '{n} is marking the exits on a card with a pencil.'],
    any: ['{n} is checking the cargo straps.', '{n} is standing among the crates with a hand on a lashing.', '{n} is reading the labels on the cargo, one by one.', '{n} is sitting on a crate with a mug, looking at the lashings.', '{n} is reading the stencil on a drum of reaction mass: tonnage, date, the yard.', '{n} is shifting a crate a hand\'s width to clear the walkway.',
      '{n} is tightening a lashing a notch and testing it with a hand.',
      '{n} is sitting on a drum of reaction mass, eating from a ration pack.',
      '{n} is walking the aisle between the pallets with a hand trailing along the netting.',
      '{n} is reading a seal tag aloud: the number, the yard, the date.',
      '{n} is wiping frost from the inside of the hold hatch.',
      '{n} is leaning on a crate with an ear against the hull.'] },
  berths: { cat: ['{n} has claimed somebody\'s pillow. Nobody moves it.', '{n} is curled in the center of a freshly made bunk and watches whoever comes near.', '{n} is asleep on a pair of boots in a shaft of dim light, twitching.', '{n} is asleep in the laundry bag, where the bag is still warm.', '{n} is sitting at the end of a bunk, watching the one who\'s awake.', '{n} is kneading a blanket with both paws.'],
    medic: ['{n} is checking the sleeping faces in the berths.', '{n} stops at each bunk and listens for breathing.', '{n} is writing up the day\'s notes in their bunk, the pad on their knees.', '{n} is asleep in their boots with the kit bag under their head.', '{n} sets a cup of water on the shelf by a sleeper, and goes out.',
      '{n} is replacing a sleeper\'s blanket and drawing the curtain across.',
      '{n} is checking a sleeper\'s pulse at the wrist without waking them.',
      '{n} is hanging the kit bag on the bunk hook with the strap looped twice.',
      '{n} is stretching in the aisle between the berths with a hand on the bulkhead.'],
    passenger: ['{n} is writing letters in their bunk.', '{n} is asleep, or pretending to be.', '{n} is looking through a pile of photographs, and putting them back, one at a time.', '{n} is sitting on the edge of their bunk, looking at the wall.',
      '{n} is sitting on the bunk with a boarding pass held in both hands.',
      '{n} is counting the days to the port on their fingers.',
      '{n} is reading the berth rules card bolted to the wall.',
      '{n} is repacking a bag that was packed an hour ago.',
      '{n} is lying with their face to the wall and their shoes on.',
      '{n} is writing the arrival date at the top of a page, and nothing below it.',
      '{n} is asking the nearest crew member which way the galley is.'],
    any: ['{n} is catching a few hours in their bunk.', '{n} is asleep with an arm thrown over their eyes and a book open on their chest.', '{n} is reading, by the light of a small lamp, with their lips moving.', '{n} is lying awake, counting the rivets in the ceiling plate.', '{n} is mending a sock by the light of a handlamp.', '{n} is asleep with their boots still on.',
      '{n} is writing a letter on a hand terminal with the brightness turned down.',
      '{n} is sorting a kit bag on the bunk: socks, a razor, a folded photograph, a tin of tea.',
      '{n} is pulling the berth door shut by the handle and letting the closer hiss it home.',
      '{n} is asleep sitting up, one arm through the bunk strap.',
      '{n} is taping a list of things to do at the next port inside the locker door.',
      '{n} is lying on top of the blanket with boots on the rail, watching the ceiling plate.',
      '{n} is passing a shift swap to a neighbor through the gap in the curtains, in whispers.',
      '{n} is folding a shirt to fit the locker, and then folding it smaller.',
      '{n} is asleep with a mug wedged between the mattress and the wall.',
      '{n} is listening to the pumps through the pillow.',
      '{n} is reading the safety card on the berth door for the second time this burn.',
      '{n} is holding a water cup a quarter full and taking small mouthfuls.'] },
  galley: { cat: ['{n} is sitting by the food locker, staring at it.', '{n} is licking a drop of milk from the galley floor.', '{n} has taken a seat at the table. Nobody moves it.', '{n} is sitting under the table, watching feet.', '{n} walks at the heel of whoever carries the tray, hot plate to table, and sits under it.', '{n} has found the one warm patch on the galley deck, next to the oven vent.'],
    any: [
      '{n} is making coffee that could strip paint.',
      '{n} and {m} are playing cards in the galley, badly.',
      '{n} is telling {m} a story that\'s only partly true.',
      '{n} and {m} are washing up at the galley tap, drawing the water ration cup by cup, and not talking.',
      '{n} is trying to teach {m} a card trick, and the deck is on the floor.',
      '{n} is cooking something unlabeled in a pan.',
      '{n} is leaning on the counter with a mug, watching {m} argue with the recycler.',
      '{n} is wiping the hot plate down before the change, and {m} is waiting to use it.',
      '{n} is reading the water ration off the sheet on the cabinet door, aloud.',
      '{n} is eating at the table with the watch bill propped against the salt.',
      '{n} and {m} are sharing the one hot plate, taking turns with the pan.',
      '{n} is warming a ration pack in the steam, turning it by the corner.',
      '{n} is drawing the day\'s water ration into a flask, one mark at a time.',
      '{n} is stirring a pot that smells of onions while {m} holds the lid.',
      '{n} is counting mugs on the shelf and finding one too many.',
      '{n} is eating standing at the counter, boots braced against the thrust.',
      '{n} is rinsing a mug under the tap and watching the gauge on the recycler.',
      '{n} and {m} are splitting a dried fruit bar into two unequal halves.'
    ] },
  gunnery: { cat: ['{n} is asleep on the warm side of the fire-control cabinet.', '{n} is sitting in the gunner\'s seat with the harness hanging off it.', '{n} is lying across the targeting console with its tail over the display.', '{n} has curled up in an empty bay of the magazine rack.', '{n} is washing a paw on the gunner\'s seat.'],
    gunner: [
      '{n} is running the fire-control checks. Each one goes in the log.',
      '{n} is wiping down the feed tray of the close-defense turret.',
      '{n} is counting rounds in the magazine rack and writing the number on the rack.',
      '{n} has a drill up on the targeting display and is tracking a dot across it.',
      '{n} is running the turret through its full arc, slowly, and listening to the motor.',
      '{n} is seating a belt of rounds in the feed and closing the cover.',
      '{n} is reading the firing log from the last contact, line by line.',
      '{n} is sighting along the barrel at the mark on the far bulkhead.',
      '{n} is writing the ammunition count in the log and initialing it.',
      '{n} is cleaning the turret optics with a lens cloth.',
      '{n} is running a dry drill on the fire-control board, calling each step aloud.',
      '{n} is checking the safety pin on the torpedo rack.'
    ],
    any: ['{n} is reading the range tables taped above the console.', '{n} is checking the latch on the weapons locker.', '{n} is watching the tracking screen. It shows the sun and nothing else.', '{n} is looking at the range tables and moving their lips.', '{n} is sitting in the gunner\'s seat with the harness off and their hands in their lap.', '{n} is wiping dust off the targeting screen with a sleeve.',
      '{n} is reading the weapons log on the console, from the bottom up.',
      '{n} is tapping the glass of the range finder.',
      '{n} is checking that the turret lock pin is in.',
      '{n} is running a thumb along the seam of the ammunition locker.'] },
  medbay: { cat: ['{n} is asleep on the exam bed, on a folded blanket.', '{n} is sitting in front of the cabinet, looking at the lock.', '{n} is sitting on the supply scale, which reads four kilos.', '{n} is asleep in the sink, which is dry.', '{n} is washing in the middle of the floor, in the light of the exam lamp.'],
    medic: ['{n} is counting the ampoules in the cabinet and writing the count on the door.', '{n} is labeling vials in small, even handwriting.', '{n} is wiping down the exam bed in long strokes.', '{n} is reading the date stamped on each sterile pack.',
      '{n} is checking the date on a bottle of antiseptic and putting it back on the shelf.',
      '{n} is rolling a bandage and setting it in the tray with the others.',
      '{n} is reading the dosage chart taped inside the cabinet door.',
      '{n} is counting the sealed field dressings against the list on the wall.',
      '{n} is strapping the kit bag shut and clipping it to the rail for the flip.'],
    any: ['{n} is sitting on the edge of the exam bed with a cup of tea.', '{n} is reading the dosage chart on the wall.', '{n} is standing at the sink, running the water over their hands.', '{n} is reading the label on a bottle and putting it back.', '{n} is on the stool with a bandage rolled around one hand.', '{n} is waiting on the exam bed for someone to find the tape.',
      '{n} is reading the first aid card on the wall.',
      '{n} is looking for the tape in the third drawer.',
      '{n} is rinsing a cup at the sink and setting it upside down on the rack.',
      '{n} is waiting by the cabinet for the medic to come back.'] },
  bridge: { cat: ['{n} is sitting on the nav console again.', '{n} has settled directly on the flight controls, and looks at you.', '{n} is watching the stars through the forward window, ears up.', '{n} is asleep on the top of the comms rack, where the fans blow warm.', '{n} is watching the pilot\'s hands move on the controls.', '{n} is sitting in the copilot\'s seat with the harness slack around it.'],
    pilot: ['{n} is double-checking the flip solution.', '{n} is tracing a line on the nav chart with one finger, and nodding.', '{n} is flying with their hands off the controls and their eyes on every readout.', '{n} is flying with one hand and eating with the other.', '{n} is checking the burn clock against the nav chart, and again against the wall.', '{n} has the flip solution up on the display and is working it by hand to see if it agrees.',
      '{n} is reading the fuel margin aloud and writing it on the board.',
      '{n} is holding the burn on the attitude readout with a finger above the trim switch.',
      '{n} is checking the transponder code against the traffic list.',
      '{n} is logging the watch: the hour, the heading, the fuel.'],
    slicer: ['{n} is combing through the comms traffic.', '{n} is reading a long stream of code, and smiling.', '{n} is listening to a dozen channels at once with their eyes closed, fingers moving.', '{n} has the comms log scrolling past on two screens and is reading both.', '{n} is writing a filter for the dock chatter and arguing with it aloud.', '{n} is listening to the carrier hiss between two stations.',
      '{n} is sorting the comms log by sender and reading the top of each pile.',
      '{n} is checking a packet header against the station list.',
      '{n} is tracing a dropped signal back to the antenna mount on the display.',
      '{n} is transcribing a weather report off the port beacon.'],
    any: ['{n} is staring out the forward window.', '{n} is standing at the viewport, watching the plume.', '{n} is leaning on the nav console, chin on their hands, watching the little green line crawl.', '{n} is reading the burn clock and working out the sum for arrival.', '{n} is in the jump seat with their feet up on a locker.', '{n} is watching the pilot\'s hands and not saying anything.',
      '{n} is copying the burn clock figure onto a slip of paper.',
      '{n} is reading the nav chart upside down from the jump seat.',
      '{n} is checking the date on the watch bill against the board.',
      '{n} is holding a mug against the console rail with a hand over the top.'] },
};

// The lights going down and coming up, a line each, in the ship's log of the burn.
const LIFE_NOTES = { dusk: 'The lights go down for the night.', dawn: 'The lights come up.' };

// Idle talk waits while the ship is hurt: someone aboard is injured, the hand is laid up, someone was lost in the last ten days, or the ice went badly this run.
const LIFE_HUSH_DAYS = 10;
const lifeHushed = ({ injured, handHurt, lostDay, day, iceEdge }) => injured > 0 || handHurt || (lostDay !== null && day - lostDay <= LIFE_HUSH_DAYS) || iceEdge <= -2;
function lifeState() {
  const st = G.state, h = hired(), lost = (st.memorial || []).map(m => m.day);
  return { injured: st.crew.filter(id => (st.injured || {})[id]).length, handHurt: handHurt(), lostDay: lost.length ? Math.max(...lost) : null, day: st.day, iceEdge: h && h.run && h.run.ice ? h.run.ice.edge : 0 };
}

// The pools are read through the editor's words (lines:ship-life, lines:ship-lights; js/linetables.js).
function lifeLine(p, crowd, rnd = Math.random) {  // rnd: ship life's dice in a burn (lifeTick)
  const room = linedText('lines:ship-life', LIFE_LINES)[p.room], pool = room[p.role] || room.any;
  if (!pool) return null;
  const others = crowd.filter(o => o !== p && o.room === p.room && o.role !== 'you' && o.role !== 'cat');
  const line = pickFresh(pool.filter(l => !l.includes('{m}') || others.length), rnd);
  return line && line.replace('{n}', p.name).replace('{m}', others.length ? others[Math.floor(rnd() * others.length)].name : '');
}

// ---------- the people aboard ----------
function shipPeople() {
  const t = G.transit;
  if (t.aboard) return (t.aboard = t.aboard.filter(p => p.role === 'you' || p.role === 'cat' || p.role === 'passenger' || p.role === 'captain' || G.state.crew.includes(p.id)));  // the burn keeps its people's places, but someone lost on the way is no longer aboard
  const people = [{ name: 'You', role: 'you', id: 'you' }];
  for (const c of crewMembers()) people.push({ name: c.first, role: c.role, id: c.id });
  for (const m of paxAboard().slice(0, 4)) {
    const p = m.pid && G.state.people[m.pid];
    people.push({ name: p ? p.first : m.who.split(' ').slice(-1)[0], role: 'passenger', pid: m.pid, id: p ? m.pid : null });
  }
  if (G.state.home && G.state.home.cat) people.push({ name: G.state.home.cat, role: 'cat' });  // family.js
  // Everyone starts strapped in for the burn out.
  people.forEach((p, i) => Object.assign(p, { room: 'berths', x: couchX(i, people.length), dk: 0, tdk: 0, tx: null, wait: lifeRand(1, 4), seat: couchX(i, people.length) }));
  // A hand's captain is aboard too, strapped in on the bridge beside the hand's couch: placed without a draw of the game's dice (their walks about the ship draw, as everyone's do).
  const cap = hiredCaptain(), bx = roomAt('bridge').mid + 0.025;
  if (cap) people.push({ name: cap.first, role: 'captain', id: cap.id, room: 'bridge', x: bx, dk: 0, tdk: 0, tx: null, wait: 3, seat: bx });
  return (t.aboard = people);
}

// Crash couches: along the berths and bridge.
const couchX = (i, n) => (i === 0 ? roomAt('bridge').mid : roomAt('berths').x0 + 0.02 + (roomAt('berths').w - 0.04) * (i / Math.max(1, n - 1)));

// Sent somewhere by a downtime activity you chose: the timetable takes them back when they have been there a while (lifeTick).
const toActivity = (p, roomId) => { goTo(p, roomId); Object.assign(p, { block: 'activity', errand: false, at: undefined, relief: undefined }); };
// Where in its room a place of the timetable is (routineSpot): place i of the n who share a post there, the stove at the galley's end, seat i of n
// along the table, a bunk in the berths.
function routineTarget(p, spot, r, i, n, rnd) {
  if (spot.at === 'post') return r.x0 + r.w * (0.15 + 0.7 * (n > 1 ? i / (n - 1) : 0.5));  // place i of the n whose post is this room
  if (spot.at === 'stove') return r.x0 + r.w * 0.15;
  if (spot.at === 'bed') return r.x0 + r.w * (0.34 + 0.16 * (n > 1 ? i / (n - 1) : 0));  // on the medbay's cot (0.2 to 0.54 of the room), the head toward its pillow end
  if (spot.at === 'aid') return r.x0 + r.w * 0.6;
  if (spot.at === 'repair') return r.x0 + r.w * 0.5;
  if (spot.at === 'alone') return r.x0 + r.w * 0.12;  // on the edge of the first bunk
  if (spot.at === 'table') return Math.max(r.x0 + 0.01, Math.min(r.x1 - 0.01, r.x0 + r.w * (0.3 + 0.6 * (n > 1 ? i / (n - 1) : 0.5))));
  return r.x0 + r.w * (0.25 + 0.5 * rnd());  // a bunk
}
// To where the timetable has `p` in `block`: their place in it, or the rounds (a room they like, as before the timetable).
function routineGo(p, block, people, dark, rnd, state) {
  p.relief = undefined;
  if (block === 'handover' && !NIGHT_WATCH.includes(p.role) && p.at === 'post' && p.tx === null && !p.errand) {  // at a post the watch keeps: wait to hand it over
    const w = people.find(q => NIGHT_WATCH.includes(q.role) && postOf(q.role) === p.room && !q.staged);
    if (w) { Object.assign(p, { block, relief: w.id, reliefT: 0 }); return; }
  }
  const spot = routineSpot(p, block, state);
  Object.assign(p, { block, errand: false, at: spot.at });
  if (spot.rounds) { goTo(p, weighted(dark ? nightHaunts(p.role) : HAUNTS[p.role], rnd), rnd); return; }
  const holds = q => (s => s.at === 'post' && s.room === spot.room)(routineSpot(q, 'shift'));  // a post's places are numbered by who holds it in a shift, the same in every block
  const r = roomAt(spot.room), mates = spot.at === 'table' || spot.at === 'bed' ? people.filter(q => routineSpot(q, block, state).at === spot.at) : spot.at === 'post' ? people.filter(holds) : [];  // who shares the table or the post
  Object.assign(p, { room: spot.room, tdk: r.deck, tx: routineTarget(p, spot, r, mates.indexOf(p), mates.length, rnd) });
}
// When a wait at a place runs out: in a shift someone at their post now and then goes on a short errand to a room near it on its deck, and from it back to the
// post; someone let go by a scene or done with an activity goes back to the timetable; the rounds go on; at the table, the stove or a bunk they stay.
function routineWait(p, block, dark, rnd, state) {
  if (p.block === 'activity' || p.block === 'linger' || p.errand) { p.block = undefined; p.errand = false; return; }  // the next frame takes them back
  if (p.aside) { p.wait = 5 + 7 * rnd(); return; }  // out of a scene's way until it closes (stageScene)
  const spot = routineSpot(p, block, state);
  if (spot.rounds) goTo(p, weighted(dark ? nightHaunts(p.role) : HAUNTS[p.role], rnd), rnd);
  else if (block === 'shift' && spot.at === 'post' && rnd() < 0.25) {
    const post = roomAt(spot.room), near = ROOMS.filter(r => r.id !== spot.room && r.deck === post.deck).sort((a, b) => Math.abs(a.mid - post.mid) - Math.abs(b.mid - post.mid)).slice(0, 2).map(r => r.id);  // a short errand: one of the two rooms nearest the post on its deck
    if (near.length) { goTo(p, near[Math.floor(rnd() * near.length)], rnd); p.errand = true; p.at = undefined; }
  }
  p.wait = 5 + 7 * rnd();
}

// The watch handed over at dusk: the one going off waits at the post until the watch-keeper is there, they face each other for 2 seconds, and then the
// one going off turns in. A watch-keeper who does not come (held in a scene, or no longer aboard) leaves them to turn in when the block ends.
function handOver(p, people, dt, block, rnd) {
  const w = people.find(q => q.id === p.relief);
  if (!w || block !== 'handover') { p.relief = undefined; return; }
  if (w.room !== p.room || w.tx !== null || w.dk !== w.tdk) return;
  p.face = Math.sign(w.x - p.x) || p.face; w.face = Math.sign(p.x - w.x) || w.face;
  if ((p.reliefT += dt) >= 2) { p.relief = undefined; p.at = undefined; Object.assign(p, { block, room: 'berths', tdk: roomAt('berths').deck, tx: routineTarget(p, { at: 'bunk' }, roomAt('berths'), 0, 1, rnd) }); }
}

function goTo(p, roomId, rnd = lifeRnd) {
  const r = roomAt(roomId);
  p.room = roomId;
  p.tdk = r.deck;
  p.tx = r.x0 + r.w * (p.role === 'captain' ? 0.6 : 0.25 + 0.5 * rnd());
}

function weighted(table, rnd = Math.random) {
  const entries = Object.entries(table), total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rnd() * total;
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries[0][0];
}

// Hard burn at each end (on the couches), strapped in at a station either side of the flip (secure), weightless at the flip, free to move
// otherwise.
function phase() {
  const t = G.transit, pr = 1 - t.left / t.total;
  if (pr < 0.06 || pr > 0.94) return 'couch';
  if (Math.abs(pr - 0.5) < 0.03) return 'float';
  if ((pr >= 0.44 && pr < 0.47) || (pr > 0.53 && pr <= 0.56)) return 'secure';
  return 'move';
}

// What a person is doing, by name from POSTURES (js/figures.js), for the sprite to be drawn: where, which way, and which frame.
function posture(p, ph, time, asleep) {
  let name;
  if (p.role === 'cat') name = ph === 'float' ? 'cat-float' : ph !== 'move' ? 'cat-sleep' : p.tx !== null ? 'cat-walk' : 'cat-sit';
  else if (asleep || (p.at === 'bed' && p.tx === null && p.dk === p.tdk && !p.staged)) name = 'bunk';  // asleep, or a patient in the medbay
  else if (ph === 'couch') name = 'couch';
  else if (ph === 'secure') name = 'strap';
  else if (ph === 'float') name = p.role === 'engineer' ? 'tether' : 'strap';
  else if (p.dk !== p.tdk) name = 'climb';
  else if (p.tx !== null) name = 'walk';
  else if (p.staged) name = p.staged === 'galley' || p.staged === 'berths' || (p.role === 'captain' && SEATED_STATIONS.includes(p.staged)) ? 'sit' : 'stand';  // at the table or a bunk's edge; the captain at the station
  else if (!p.staged && !p.errand && ((p.block === 'shift' && ['post', 'aid', 'repair'].includes(p.at)) || p.at === 'stove')) name = p.at === 'post' && (p.room === 'bridge' || p.room === 'gunnery') ? 'work-sit' : 'work';  // at work: seated at the bridge and the guns
  else name = p.at === 'alone' || (p.at !== 'stove' && ['galley', 'gunnery', 'bridge', 'medbay'].includes(p.room)) ? 'sit' : 'stand';  // the cook at the stove stands; someone alone sits on a bunk
  const { frames, fps } = POSTURES[name];
  return { name, x: p.x, deck: p.dk, face: p.face || 1, frame: fps ? Math.floor(time * fps) % frames : 0 };
}

// The scene open in a burn, acted out: when it opens (or the next one in a chain opens) those it stages walk to spots in its room, a little
// apart, each facing the group's middle (the one in the middle faces you); those not in it are let go, and when it closes everyone is, to go
// back to their routine after a few seconds. Only in the move phase: at the couches, the straps and the flip nobody gets up.
const SEATED_STATIONS = ['bridge', 'gunnery', 'medbay'];
function stageScene(people, ph, t, open) {
  if (open === t.stageOf) return;
  t.stageOf = open; t.stageSpan = null;
  for (const p of people) if (p.aside) Object.assign(p, { aside: false, block: 'linger', wait: 3 });  // out of the last scene's way: back to the timetable
  const stage = open && ph === 'move' ? sceneStage(open, people, scenePeople(open).map(c => c.id)) : null, ids = new Set(stage ? stage.ids : []);
  for (const p of people) if (p.staged && !ids.has(p.id)) { p.staged = undefined; p.faceTo = undefined; p.wait = 3; p.block = 'linger'; }  // a fixed linger: staging draws none of the game's dice
  if (!stage) return;
  const r = roomAt(stage.room), cast = stage.ids.map(id => people.find(q => q.id === id)).filter(Boolean), n = cast.length;
  const spots = cast.map((_, i) => Math.max(r.x0 + 0.01, Math.min(r.x1 - 0.01, r.mid + (i - (n - 1) / 2) * 0.03))), mid = spots.reduce((a, b) => a + b, 0) / n;
  cast.forEach((p, i) => { Object.assign(p, { staged: stage.room, room: stage.room, tdk: r.deck, tx: spots[i], at: undefined, relief: undefined, errand: false }); p.faceTo = Math.sign(mid - spots[i]) || Math.sign(spots[0] - spots[i]) || 1; });
  t.stageSpan = { room: stage.room, deck: r.deck, lo: spots[0] - 0.03, hi: spots[n - 1] + 0.03, sent: {} };  // where they gather: kept clear (stepAside)
}

// Anyone standing or heading where a scene's people gather, who is not in it, leaves for their next-favourite room, to a spot a little apart from
// the others sent there (no draw of the game's dice): a word with the captain or a hard letter is given the room. Someone asleep there sleeps on.
function stepAside(p, span) {
  if (!span || p.staged || isAsleep(p) || p.room !== span.room || p.tdk !== span.deck) return;
  const at = p.tx !== null ? p.tx : p.x;  // where they are, or where they are going in that room
  if (at <= span.lo || at >= span.hi) return;
  const alt = Object.entries(HAUNTS[p.role] || HAUNTS.passenger).filter(([id]) => id !== span.room).sort((a, b) => b[1] - a[1])[0][0], r = roomAt(alt), k = (span.sent[alt] = (span.sent[alt] || 0) + 1) - 1;
  Object.assign(p, { room: alt, tdk: r.deck, tx: Math.min(r.x1 - 0.01, r.x0 + r.w * 0.3 + 0.02 * k), aside: true, at: undefined, errand: false });
}

function lifeTick(dt) {
  syncLifeButtons();
  if (G.mode !== 'transit' || !G.transit) return;
  const people = shipPeople(), ph = phase(), dark = isDark();
  if (dark !== !!G.transit.dark) {  // dusk or dawn
    G.transit.dark = dark;
    comm(`[Ship] ${lineWords('lines:ship-lights', dark ? 'dusk' : 'dawn', LIFE_NOTES[dark ? 'dusk' : 'dawn'])}`);
    for (const p of people) if (!NIGHT_WATCH.includes(p.role)) p.wait = Math.min(p.wait, lifeRand(0.2, 3));
  }
  stageScene(people, ph, G.transit, (G.dialog && G.dialog.event) || null);
  const block = shipDay(G.transit.elapsed).block, state = shipState(G.state, G.transit, ship().armor, lifeRnd);
  state.repairs = repairsFor(people, state);
  const key = JSON.stringify([state.marks, state.hurt, state.low, state.you, state.aid, state.repairs]);
  if (key !== G.transit.stateKey) {  // the ship's state changed: whoever's place moved with it goes there
    G.transit.stateKey = key;
    for (const p of people) {
      if (p.staged || p.errand || p.block !== block) continue;
      const spot = routineSpot(p, block, state);
      if (spot.rounds ? p.at !== undefined : spot.at !== p.at || spot.room !== p.room) p.block = undefined;
    }
  }
  for (const p of people) {
    if (ph === 'secure' || ph === 'float') {  // strap in where they are; someone on the ladder finishes onto a deck
      p.tx = null; p.tdk = Math.round(p.dk); p.block = undefined; p.relief = undefined;  // strapped in: under way again, the timetable sends them on
      p.dk = Math.abs(p.tdk - p.dk) < 0.01 ? p.tdk : p.dk + Math.max(-dt * 1.5, Math.min(dt * 1.5, p.tdk - p.dk));
      continue;
    }
    if (ph !== 'move') { p.block = undefined; p.relief = undefined; const k = Math.min(1, dt * 2); p.x += (p.seat - p.x) * k; p.dk += (0 - p.dk) * k; p.tx = null; p.tdk = 0; continue; }
    stepAside(p, G.transit.stageSpan);
    if (!p.staged && p.block !== block && p.block !== 'activity' && p.block !== 'linger' && !p.errand) routineGo(p, block, people, dark, lifeRnd, state);  // the timetable: a new block, or back to it
    if (p.relief && !p.staged) { handOver(p, people, dt, block, lifeRnd); continue; }
    const step = (p.staged ? 0.09 : 0.06) * (p.role === 'you' && state.you ? 2 / 3 : 1) * dt;  // to a scene a little faster; you, hurt, slower
    if (p.dk !== p.tdk) {  // to the ladder, then up or down it
      if (Math.abs(LADDER - p.x) > 0.003) { p.face = Math.sign(LADDER - p.x) || p.face; p.x += Math.max(-step, Math.min(step, LADDER - p.x)); }
      else p.dk += Math.max(-dt * 1.5, Math.min(dt * 1.5, p.tdk - p.dk));
    } else if (p.tx !== null) {
      p.face = Math.sign(p.tx - p.x) || p.face;
      p.x += Math.max(-step, Math.min(step, p.tx - p.x));
      if (Math.abs(p.tx - p.x) < 0.002) {
        p.tx = null;
        if (p.staged) { p.face = p.faceTo || p.face; continue; }  // in place for the scene, facing the others: no draw of the game's dice
        p.wait = p.errand ? lifeRand(1.5, 3) : lifeRand(5, 12);  // an errand is in and out
        if (p.role !== 'you' && lifeRnd() < 0.18 && !lifeHushed(lifeState())) {
          const line = lifeLine(p, people, lifeRnd);
          if (line) comm(`[Ship] ${line}`);
        }
      }
    } else if (!p.staged && (p.wait -= dt) <= 0) {
      routineWait(p, block, dark, lifeRnd, state);
    }
  }
}

// ---------- the cutaway ----------
// The drive plume off the stern: its length as a share of the hull (growing with the burn's peak), the flicker in world units, and the
// halo and each bell's cone half-width as shares of the hull's height.
const PLUME = { base: 0.28, gain: 0.32, flicker: 14, halo: 0.7, cone: 0.16 };
// The two drive bells on the stern (the top and bottom of each, world units), and the room the camera may show aft of the hull for them.
const CUT_BELLS = [[28, 72], [140, 184]], CUT_STERN = 120;
// The tanks in the lower nose (drawn as a room of their own by rooms.js).
const CUT_TANKS = { x0: 0.66, x1: 0.9, deck: 1 };
// The bulkheads of each deck as shares of the length: those with a hatch at the floor, and the nose's end wall.
const CUT_WALLS = [{ dk: 0, hatch: [0.17, 0.44, 0.66, 0.78], end: 0.92 }, { dk: 1, hatch: [0.17, 0.4, 0.66], end: 0.9 }];

// A room's box in world units: the engine room is the full height of the stern; the lower deck's ceiling is under the upper deck's plate.
const cutRect = (r, len) => ({ x0: r.x0 * len, x1: r.x1 * len, top: r.tall || r.deck === 0 ? 0 : floorY(0) + HULL.plate, floor: floorY(r.tall ? 1 : r.deck) });
function cutBulkhead(ctx, x, top, F, hatch) {
  ctx.fillStyle = '#1a3048'; ctx.fillRect(x - 6, top, 12, F - top);
  if (hatch) { ctx.fillStyle = '#060d16'; ctx.fillRect(x - 4, F - 92, 8, 92); ctx.fillStyle = '#2a4664'; ctx.fillRect(x - 6, F - 96, 12, 4); ctx.fillStyle = '#c9a227'; ctx.fillRect(x - 4, F - 4, 4, 4); }
}

// The cutaway in the screen box { x, y, w, h }: a camera close in on the hand, both decks high, and the outline of the whole hull in the
// corner. The nose is to the right through the flip; the turn shows in the stars, the windows, the thrusters and the outline.
// Leaves G.cutRooms (the rooms in view, screen boxes clipped to the box), G.cutHits (the people in view) and G.cutOutline for a tap (game.js).
function drawCutaway(box, clear = box) {
  const t = G.transit, st = G.state, people = shipPeople(), ph = phase(), still = Settings.reduceMotion, time = still ? 0 : G.time;
  const len = hullLength(SHIPS[st.shipId].size), view = viewOf(box), zoom = view.zoom, half = view.span / 2;
  const pr = Math.min(1, Math.max(0, 1 - t.left / t.total)), w = phaseWeights(pr);
  // The camera eases after the hand, keeping them in the middle of the part of the box a docked dialog leaves clear (all of it with
  // none): it steps in that part's own terms, its centre and its span, offset from the box's centre by off. It may look a little aft of
  // the stern, at the bells.
  const off = (box.x + box.w / 2 - (clear.x + clear.w / 2)) / zoom, held = G.cam && G.cam.x - off + CUT_STERN;
  const camX = camStep(held, people[0].x * len + CUT_STERN, G.cam ? Math.max(0, G.time - G.cam.t) : 0, clear.w / zoom, len + CUT_STERN) - CUT_STERN + off;
  G.cam = { x: camX, t: G.time };
  const burning = !t.event && Math.abs(t.angle - (t.flipped ? Math.PI / 2 : -Math.PI / 2)) < 0.05;
  const turn = -Math.sin(t.angle), spin = t.angle + Math.PI / 2;  // turn: 1 before the flip, -1 after, 0 mid-turn; spin: the ship's turn, 0 to pi
  const X = f => f * len, top = -12, H = 236, cy = top + H / 2;
  const bcx = box.x + box.w / 2, bcy = box.y + box.h / 2, toScreen = (x, y) => ({ x: bcx + (x - camX) * zoom, y: bcy + (y - view.y) * zoom });
  const speed = 0.05 + Math.sin(Math.PI * pr) * 0.6, shake = !still && !t.event && speed > 0.2 ? speed * 0.9 : 0;
  const seen = (a, b) => b >= camX - half && a <= camX + half;

  ctx.save();
  ctx.beginPath(); ctx.rect(box.x, box.y, box.w, box.h); ctx.clip();
  ctx.translate(bcx + Math.sin(G.time * 53) * 0.5 * shake, bcy + Math.sin(G.time * 71 + 1) * 0.8 * shake);  // a shiver, not a random draw: the game's random is seeded in the tests
  ctx.scale(zoom, zoom); ctx.translate(-camX, -view.y);

  // The drive plume from the two bells, and the thrusters puffing at nose and stern while the ship turns.
  if (burning && w.flip < 1) {  // it fades with the flip
    const pl = (len * (PLUME.base + PLUME.gain * Math.sin(Math.PI * pr)) + Math.sin(time * 23) * PLUME.flicker) * (1 - w.flip), mouth = -46, hr = H * PLUME.halo;
    ctx.save(); ctx.globalAlpha = 1 - w.flip;
    const halo = ctx.createRadialGradient(mouth, cy, 0, mouth, cy, hr);
    halo.addColorStop(0, 'rgba(140,190,255,0.3)'); halo.addColorStop(1, 'rgba(60,90,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(mouth - hr, cy - hr, hr * 2, hr * 2);
    for (const [a, b] of CUT_BELLS) {
      const m = (a + b) / 2, c = H * PLUME.cone, g = ctx.createLinearGradient(mouth, 0, mouth - pl, 0);  // white-hot for the first 40 units, then blue fading out
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(Math.min(0.5, 40 / pl), 'rgba(140,190,255,0.75)'); g.addColorStop(1, 'rgba(60,90,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mouth, m - c); ctx.quadraticCurveTo(mouth - pl * 0.25, m - c * 0.4, mouth - pl, m); ctx.quadraticCurveTo(mouth - pl * 0.25, m + c * 0.4, mouth, m + c); ctx.fill();
    }
    ctx.restore();
  } else if (!burning && !t.event) {
    const on = Math.sin(time * 3) > 0, a = 0.5 + 0.5 * Math.abs(Math.sin(time * 9));
    ctx.fillStyle = `rgba(230,240,255,${a})`;
    for (const [x, y] of on ? [[X(0.955) + 14, 80], [-14, 206]] : [[X(0.955) + 14, 132], [-14, 6]]) { ctx.beginPath(); ctx.ellipse(x, y, 14, 6, 0, 0, Math.PI * 2); ctx.fill(); }
  }
  ctx.fillStyle = '#16283a';
  for (const [a, b] of CUT_BELLS) { ctx.beginPath(); ctx.moveTo(0, a + 4); ctx.lineTo(-46, a - 16); ctx.lineTo(-46, b + 16); ctx.lineTo(0, b - 4); ctx.fill(); }

  // The hull, with a rounded nose, lit from above; everything inside is clipped to it.
  const shade = ctx.createLinearGradient(0, top, 0, top + H);
  shade.addColorStop(0, '#132338'); shade.addColorStop(1, '#08111c');
  ctx.fillStyle = shade; ctx.strokeStyle = '#3d5f82'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(0), top + 6); ctx.lineTo(X(0.9), top);
  ctx.quadraticCurveTo(X(1.02), cy, X(0.9), top + H);
  ctx.lineTo(X(0), top + H - 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.clip();

  // The rooms, the ladder well, the ladder through the upper deck's plate, and the bulkheads.
  const cap = ship().cargo, nb = Math.min(12, ship().berths), slots = new Map();
  for (const p of people) if (slots.size < nb && isAsleep(p)) slots.set(p, slots.size);  // whoever is turned in lies on a bunk
  const s = { w, time: G.time, zoom, spin, still, berths: ship().berths, cargo: cap ? Math.min(cap, cargoUsed()) / cap : 0, fuel: G.state.fuel / ship().fuel || 0, burning, night: nightLevel(), asleep: slots.size,
    damage: { marks: new Set(G.transit.marks || []), severe: 1 - G.state.armor / ship().armor > 2 / 3 }, patient: G.state.crew.some(id => (G.state.injured || {})[id]) || handHurt() };  // the marks lifeTick keeps (shipState)
  for (const [id, r] of [...ROOMS.map(r => [r.id, r]), ['tanks', CUT_TANKS]]) {
    const q = cutRect(r, len);
    if (seen(q.x0, q.x1)) drawRoom(ctx, id, q, s);
  }
  roomWalls(ctx, cutRect({ x0: roomAt('medbay').x1, x1: CUT_TANKS.x0, deck: 1 }, len), w, time, still);  // the ladder well, between the medbay and the tanks
  const lx = X(LADDER);
  ctx.fillStyle = '#060d16'; ctx.fillRect(lx - 14, floorY(0), 28, HULL.plate);
  ctx.strokeStyle = '#4a6a8a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(lx - 8, floorY(0)); ctx.lineTo(lx - 8, floorY(1)); ctx.moveTo(lx + 8, floorY(0)); ctx.lineTo(lx + 8, floorY(1)); ctx.stroke();
  ctx.lineWidth = 1.5; ctx.beginPath();
  for (let y = floorY(0) + 8; y < floorY(1); y += 14) { ctx.moveTo(lx - 8, y); ctx.lineTo(lx + 8, y); }
  ctx.stroke();
  for (const d of CUT_WALLS) {
    const q = cutRect({ x0: 0, x1: 0, deck: d.dk }, len);
    for (const f of d.hatch) cutBulkhead(ctx, X(f), q.top, q.floor, true);
    cutBulkhead(ctx, X(d.end), q.top, q.floor, false);
  }
  ctx.font = `600 13px ${roomFont}`;
  for (const r of ROOMS) {  // each name at 13px on a dark plate, so it reads over the props behind it
    const name = r.name.toUpperCase(), nx = X(r.x0) + 12, ny = cutRect(r, len).top + 34, fs = 13 / zoom, pad = 4 / zoom;
    ctx.fillStyle = 'rgba(6,13,22,0.8)'; ctx.fillRect(nx - pad, ny - fs, ctx.measureText(name).width / zoom + pad * 2, fs * 1.3);
    worldText(ctx, zoom, name, nx, ny, fs, '#7f97b0');
  }
  // The thrust sign over the galley's forward hatch, on the galley's side (clear of the gunnery's name), scaled up where the camera is far
  // enough out that its text would be under 12px; kept whole inside the view's edges when the galley is partly or wholly out of it.
  const sk = Math.max(1, 1.05 / zoom), signHalf = 56 * sk + 4, signX = Math.min(camX + half - signHalf, Math.max(camX - half + signHalf, X(roomAt('galley').x1) - 6 - 56 * sk));
  ctx.save(); ctx.translate(signX, 8); ctx.scale(sk, sk); drawThrustSign(ctx, 0, 0, burnState().g, w, time, zoom * sk); ctx.restore();

  // The people: each in their posture, sleepers on the bunks the berths drew; names on the deck plate under them where they fit.
  ctx.font = `600 12px ${roomFont}`;
  const berths = cutRect(roomAt('berths'), len), labels = [], dots = [], hits = [];
  for (const p of people) {
    const asleep = slots.has(p), pose = posture(p, ph, time, asleep), bunk = asleep && berthBunk(berths, nb, slots.get(p));
    const cot = pose.name === 'bunk' && !bunk && p.room === 'medbay';  // a patient on the medbay's cot (rooms.js roomMedbay), not the floor
    const x = bunk ? bunk.x + Math.min(44, bunk.w * 0.62) : X(p.x), y = bunk ? bunk.y - 5 : floorY(p.dk) - (cot ? 36 : 0), dk = Math.round(p.dk);
    dots.push({ x: X(p.x), deck: p.dk, color: ROLE_COLORS[p.role] });
    if (Math.abs(x - camX) > half + 60) continue;  // out of view (a little margin, so no one pops in at the edge)
    const inView = Math.abs(x - camX) <= half;
    if (pose.name === 'couch' && Math.abs(p.dk - dk) < 0.05) roomCouch(ctx, x, y, true);  // a crash couch, deployed under each person in the hard burn (once they are on a deck)
    const tap = drawPerson(ctx, pose, x, y, { color: ROLE_COLORS[p.role], floating: ph === 'float', ...(p.role === 'cat' ? {} : portraitLook({ id: p.id, name: p.name })) });
    if (pose.name === 'tether') {  // a line to a ring on the nearest bulkhead
      const d = CUT_WALLS[dk], bx = X([...d.hatch, d.end].reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a))), rx = bx + Math.sign(x - bx) * 6, ry = floorY(dk) - 60;
      ctx.strokeStyle = 'rgba(201,162,39,0.9)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(tap.x, tap.y); ctx.quadraticCurveTo((tap.x + rx) / 2, Math.max(tap.y, ry) + 12 + Math.sin(time) * 6, rx, ry); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (!inView) continue;
    if (p.id) hits.push({ ...toScreen(tap.x, tap.y), id: p.id, head: toScreen(tap.head.x, tap.head.y), foot: toScreen(tap.foot.x, tap.foot.y) });  // the body, head to foot, for a tap (game.js)
    if (p.role !== 'passenger' || p.pid) {
      const nw = ctx.measureText(p.name).width / zoom;
      if (!labels.some(b => b.dk === dk && Math.abs(b.x - x) < (b.w + nw) / 2 + 4 / zoom)) {
        labels.push({ x, w: nw, dk });
        worldText(ctx, zoom, p.name, x, (bunk ? floorY(0) : y) + 10, 12 / zoom, '#9fb4c9', 'center');
      }
    }
  }
  hullSeams(X, top, H, 1);  // plating, rivets and scars (hulldetail.js)
  ctx.restore();
  hullFittings(X, top, H, len, 1, cy);  // mast, fins and turrets
  if (time % 1.6 < 0.2) {  // running lights, blinking
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(X(0.45) - 2, top - 4, 4, 4);
    ctx.fillStyle = '#5aff8a'; ctx.fillRect(X(0.45) - 2, top + H, 4, 4);
  }
  ctx.restore();

  // What a tap can find: the rooms in view, the people in view, and the outline with everyone it shows; in the clear part, as the part
  // under a dialog belongs to the dialog.
  const cx0 = Math.max(box.x, clear.x), cy0 = Math.max(box.y, clear.y), cx1 = Math.min(box.x + box.w, clear.x + clear.w), cy1 = Math.min(box.y + box.h, clear.y + clear.h);
  G.cutRooms = ROOMS.map(r => {
    const q = cutRect(r, len), a = toScreen(q.x0, q.top), b = toScreen(q.x1, q.floor);
    const x0 = Math.max(cx0, a.x), y0 = Math.max(cy0, a.y), x1 = Math.min(cx1, b.x), y1 = Math.min(cy1, b.y);
    return { id: r.id, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }).filter(b => b.w > 0 && b.h > 0);
  G.cutHits = hits.filter(h => h.x >= cx0 && h.x <= cx1 && h.y >= cy0 && h.y <= cy1);
  const seenPart = { x: camX - off, span: clear.w / zoom };  // the outline's frame is what is in view: the clear part, not what a dialog covers
  G.cutOutline = { ...outlineLayout(box, len), ids: people.filter(p => p.id).map(p => p.id), squeeze: Math.abs(turn), view: seenPart };
  drawOutline(ctx, G.cutOutline, dots, seenPart.x, seenPart.span, len, turn);
}

// ---------- downtime activities ----------
const lifeSay = (key, vars) => sceneSay('scene:shiplife', key, vars);  // the words of these are the lines of scene:shiplife (hiredscenes.js)
const ACTIVITIES = {
  meal: {
    get label() { return lifeSay('meal.label'); }, can: () => true,
    run() {
      for (const p of shipPeople()) if (p.role !== 'you') toActivity(p, 'galley');
      toActivity(shipPeople()[0], 'galley');
      for (const id of G.state.crew) if (G.state.people[id]) likeAmbient(G.state.people[id], 1, lifeSay('meal.crew.memory'));
      for (const m of paxAboard()) if (m.pid) likeAmbient(G.state.people[m.pid], 1, lifeSay('meal.pax.memory'));
      return pick([lifeSay('meal.result.0'), lifeSay('meal.result.1')]);
    },
  },
  drills: {
    get label() { return lifeSay('drills.label'); }, can: () => !G.transit.drilled,
    run() {
      G.transit.drilled = true;
      for (const p of shipPeople()) toActivity(p, p.role === 'you' ? 'bridge' : p.role === 'captain' ? 'bridge' : lifePick(['hold', 'bridge', 'engine']));
      return lifeSay(tellingOn('drills.result', G.state.day));
    },
  },
  repair: {
    get label() { return lifeSay('repair.label'); }, can: () => G.state.armor < ship().armor,
    run() {
      const max = ship().armor, amount = Math.round(max * (roleSkill('engineer') ? 0.4 : 0.2)), before = G.state.armor;
      G.state.armor = Math.min(max, before + amount);
      for (const p of shipPeople()) toActivity(p, p.role === 'passenger' ? 'galley' : p.role === 'captain' ? 'bridge' : lifePick(['engine', 'hold']));
      const day = G.state.day;  // the result and its tail are one version, taken by the day
      return `${lifeSay(tellingOn('repair.result', day), { before, after: G.state.armor, max })} ${roleSkill('engineer') ? lifeSay(tellingOn('repair.skilled', day), { name: roleName('engineer') }) : lifeSay(tellingOn('repair.alone', day))}`;
    },
  },
  visit: {
    get label() { return lifeSay('visit.label'); }, can: () => paxAboard().length > 0,
    run() {
      toActivity(shipPeople()[0], 'berths');
      for (const m of paxAboard()) if (m.pid) like(G.state.people[m.pid], 1, lifeSay('visit.memory'));
      return pick([lifeSay('visit.result.0'), lifeSay('visit.result.1')]);
    },
  },
};

// A downtime pick every couple of days of the leg: lifeSlotCount(days) of them, two on a short leg and five on a long one, spaced over the burn. The first is `before`, the last `after`
// (what the sitting chats and the owed watch spend, family.js), the ones between m1, m2 ... A slot opens when the burn reaches its share; with two the second opens at the flip.
const lifeSlotCount = days => Math.max(2, Math.min(5, Math.round(days / 2)));
const lifeSlotKeys = n => ['before', ...Array.from({ length: n - 2 }, (_, i) => `m${i + 1}`), 'after'];
// The slot the burn is in: the latest one open, so a slot not taken is gone when the next opens. Takes the transit, so it runs in plain Node.
function lifeSlotOf(t) {
  const n = t.slots || 2, p = Math.max(t.total ? 1 - t.left / t.total : 0, t.flipped ? 0.5 : 0);
  return lifeSlotKeys(n)[Math.min(n - 1, Math.floor(p * n))];
}
const lifeSlot = () => lifeSlotOf(G.transit);
// Whether the slot the burn is in is still to take, and taking it (`key` for one the sitting chats and the owed watch spend ahead: before, after).
const lifeFree = t => !(t.lifeUsed || {})[lifeSlotOf(t)];
const spendLife = (t, key = lifeSlotOf(t)) => { (t.lifeUsed = t.lifeUsed || {})[key] = true; };

const activityLabel = a => (typeof a.label === 'function' ? a.label() : a.label);

// Downtime is a menu: one activity a slot of the burn. There are many to choose from, so it shows five at a
// time, mixed from the three kinds (the ship's own, a hand's, and what is on now) and turned on each time, so everything
// comes round. The same five stay while that slot of the burn is open.
const MENU_SHOWN = 5;
// Five of the lanes' entries, one from each lane in turn, each lane started at the turn's place in it, so everything comes round (the downtime menu's turn is its count, the day ashore's is the day: dayashore.js).
// Fewer than five are all shown. Takes the lanes and the turn, so it runs in plain Node.
function menuFive(lanes, turn) {
  const spun = lanes.map(l => (l.length ? l.slice(turn % l.length).concat(l.slice(0, turn % l.length)) : l)), out = [];
  for (let i = 0; out.length < MENU_SHOWN && spun.some(l => l.length > i); i++) for (const l of spun) if (l[i] && out.length < MENU_SHOWN) out.push(l[i]);
  return out;
}
const baseActivities = () => Object.entries(ACTIVITIES).filter(([id, a]) => hiredMay(id, a)).map(([, a]) => a);
function downtimeFive() {
  const t = G.transit, st = G.state, half = lifeSlot(), ok = a => !a.can || a.can();
  const lanes = [baseActivities().filter(ok), handDowntime().filter(ok), onNow().filter(ok)], every = lanes.flat();
  if (every.length <= MENU_SHOWN) return every;
  t.lifeShown = t.lifeShown || {};
  const kept = (t.lifeShown[half] || []).map(l => every.find(a => activityLabel(a) === l)).filter(Boolean);
  if (kept.length) return kept;
  const turn = st.lifeTurn = (st.lifeTurn || 0) + 1;
  const due = lanes[0].find(a => a === ACTIVITIES.teach);  // a move the crew would show you (gunnermoves.js) is never left out of the five: the rotation could hide it for a chapter (#850)
  const out = due ? [due, ...menuFive(lanes.map(l => l.filter(a => a !== due)), turn)].slice(0, MENU_SHOWN) : menuFive(lanes, turn);
  t.lifeShown[half] = out.map(activityLabel);
  return out;
}

// `all` lists every option instead of five (for tests and the like).
function downtimeEvent(all) {
  const t = G.transit;
  return {
    title: lifeSay('title'), personal: true,  // a hand's savings are their own, not the ship's purse
    text: lifeSay(hired() ? 'text.hired' : 'text', { when: lifeSay(t.flipped ? 'when.after' : 'when.before') }),
    choices: [
      ...(all ? [...baseActivities(), ...handDowntime(), ...onNow()] : downtimeFive()).map(a => (what => ({  // what: the label as drawn, handed to can and run, so a teaching does the move it named (gunnermoves.js)
        label: what, can: a.can && (() => a.can(what)),
        run() {
          spendLife(t);
          if (hired()) hired().did = { ...hired().did, downtime: true };  // the first run's steps (tutorial.js)
          const text = a.run(what);
          // Comms gets one line, what was done and what it taught: it shows eight lines, and the result runs to twelve on a phone (#767). One that leads
          // straight into a scene (Sit with someone) has nothing to say yet.
          const taught = text && (text.match(/\([^()]*\)$/) || [''])[0];
          if (text) comm(`[Ship] ${lifeSay('log', { what })}${taught ? ` ${taught}` : ''}`);
          return text;
        },
      }))(activityLabel(a))),
      { label: lifeSay('none.label'), run: () => lifeSay('none.result') },
    ],
  };
}

function syncLifeButtons() {
  const el = document.getElementById('tlife');
  if (!el) return;
  const t = G.transit, show = G.mode === 'transit' && t && !t.event && phase() === 'move';
  el.hidden = !show;
  if (!show) return;
  el.style.top = `${G.lifeY}px`;
  el.style.left = `${(G.W - G.hudW) / 2}px`;
  const used = !lifeFree(t), more = lifeSlotKeys(t.slots || 2).slice(-1)[0] !== lifeSlot();
  el.querySelector('button').disabled = !!used;
  el.dataset.note = used ? (more ? 'Next in a day or two' : 'Done for this burn') : 'Downtime';
}

function buildLifeButtons() {
  const el = Object.assign(document.createElement('div'), { id: 'tlife', hidden: true });
  el.innerHTML = '<button data-life="menu">Spend some downtime</button>';
  document.body.appendChild(el);
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-life]'), t = G.transit;
    if (!b || b.disabled || !t || t.event) return;
    Sfx.click();
    openEvent(downtimeEvent());
  });
}

Mods.register({
  id: 'shiplife', name: 'Life aboard', builtin: true,
  init(M) {
    buildLifeButtons();
    M.on('frame', lifeTick);
    M.on('landed', () => { const el = document.getElementById('tlife'); if (el) el.hidden = true; });
  },
});
