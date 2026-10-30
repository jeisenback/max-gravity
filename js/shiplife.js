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
  cat: { engine: 4, galley: 3, berths: 2, bridge: 1, hold: 1 },
};
const ROLE_COLORS = { you: '#ffffff', engineer: '#ffa24a', pilot: '#6fb0ff', gunner: '#ff6b5a', quartermaster: '#f0d060', slicer: '#c08cff', medic: '#6fd08c', xo: '#e8e8f0', cook: '#e8a0a0', icehand: '#8fd8e8', passenger: '#9aa7b5', cat: '#b8aca0' };

// The ship's day: every SHIP_DAY seconds of a burn the lights go down for a night, and everyone who is not on watch turns in.
// 0 in the day, 1 at night, and a ramp at dusk and dawn. A burn starts in the morning.
const SHIP_DAY = 40, NIGHT_WATCH = ['pilot', 'engineer'];
function nightLevel() {
  const t = G.transit;
  if (!t) return 0;
  const f = (((t.elapsed || 0) + 6) / SHIP_DAY) % 1;
  return f < 0.55 ? 0 : f < 0.65 ? (f - 0.55) / 0.1 : f < 0.9 ? 1 : 1 - (f - 0.9) / 0.1;
}
const isDark = () => nightLevel() > 0.3;
const nightHaunts = role => NIGHT_WATCH.includes(role) ? HAUNTS[role] : role === 'cat' ? { engine: 3, berths: 3 } : { berths: 9, galley: 1 };
const isAsleep = p => isDark() && p.room === 'berths' && p.tx === null && p.dk === 0 && p.role !== 'cat' && !NIGHT_WATCH.includes(p.role) && phase() === 'move';

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
function lifeLine(p, crowd) {
  const room = linedText('lines:ship-life', LIFE_LINES)[p.room], pool = room[p.role] || room.any;
  if (!pool) return null;
  const others = crowd.filter(o => o !== p && o.room === p.room && o.role !== 'you' && o.role !== 'cat');
  const line = pickFresh(pool.filter(l => !l.includes('{m}') || others.length));
  return line && line.replace('{n}', p.name).replace('{m}', others.length ? pick(others).name : '');
}

// ---------- faces ----------
// A person's portrait as a picture the canvas can draw (#297): the same drawing as their page, made once. null until it has loaded,
// so a frame before then draws the figure alone.
const faceCache = new Map();
const faceSource = p => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(portraitSvg({ id: p.id, name: p.name, role: p.role }).replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" '))}`;
function faceImage(p) {
  const key = `${p.id || p.name}:${p.role}`;
  let img = faceCache.get(key);
  if (!img) { img = new Image(); img.src = faceSource(p); faceCache.set(key, img); }
  return img.complete && img.naturalWidth ? img : null;
}

// ---------- the people aboard ----------
function shipPeople() {
  const t = G.transit;
  if (t.aboard) return (t.aboard = t.aboard.filter(p => p.role === 'you' || p.role === 'cat' || p.role === 'passenger' || G.state.crew.includes(p.id)));  // the burn keeps its people's places, but someone lost on the way is no longer aboard
  const people = [{ name: 'You', role: 'you', id: 'you' }];
  for (const c of crewMembers()) people.push({ name: c.first, role: c.role, id: c.id });
  for (const m of paxAboard().slice(0, 4)) {
    const p = m.pid && G.state.people[m.pid];
    people.push({ name: p ? p.first : m.who.split(' ').slice(-1)[0], role: 'passenger', pid: m.pid, id: p ? m.pid : null });
  }
  if (G.state.home && G.state.home.cat) people.push({ name: G.state.home.cat, role: 'cat' });  // family.js
  // Everyone starts strapped in for the burn out.
  people.forEach((p, i) => Object.assign(p, { room: 'berths', x: couchX(i, people.length), dk: 0, tdk: 0, tx: null, wait: rand(1, 4), seat: couchX(i, people.length) }));
  return (t.aboard = people);
}

// Crash couches: along the berths and bridge.
const couchX = (i, n) => (i === 0 ? roomAt('bridge').mid : roomAt('berths').x0 + 0.02 + (roomAt('berths').w - 0.04) * (i / Math.max(1, n - 1)));

function goTo(p, roomId) {
  const r = roomAt(roomId);
  p.room = roomId;
  p.tdk = r.deck;
  p.tx = r.x0 + r.w * rand(0.25, 0.75);
}

function weighted(table) {
  const entries = Object.entries(table), total = entries.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [k, w] of entries) if ((r -= w) <= 0) return k;
  return entries[0][0];
}

// Hard burn at each end, weightless at the flip, free to move otherwise.
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
  else if (asleep) name = 'bunk';
  else if (ph === 'couch') name = 'couch';
  else if (ph === 'secure') name = 'strap';
  else if (ph === 'float') name = p.role === 'engineer' ? 'tether' : 'strap';
  else if (p.dk !== p.tdk) name = 'climb';
  else if (p.tx !== null) name = 'walk';
  else name = ['galley', 'gunnery', 'bridge', 'medbay'].includes(p.room) ? 'sit' : 'stand';
  const { frames, fps } = POSTURES[name];
  return { name, x: p.x, deck: p.dk, face: p.face || 1, frame: fps ? Math.floor(time * fps) % frames : 0 };
}

function lifeTick(dt) {
  syncLifeButtons();
  if (G.mode !== 'transit' || !G.transit) return;
  const people = shipPeople(), ph = phase(), dark = isDark();
  if (dark !== !!G.transit.dark) {  // dusk or dawn
    G.transit.dark = dark;
    comm(`[Ship] ${lineWords('lines:ship-lights', dark ? 'dusk' : 'dawn', LIFE_NOTES[dark ? 'dusk' : 'dawn'])}`);
    for (const p of people) if (!NIGHT_WATCH.includes(p.role)) p.wait = Math.min(p.wait, rand(0.2, 3));
  }
  for (const p of people) {
    if (ph === 'secure' || ph === 'float') {  // strap in where they are; someone on the ladder finishes onto a deck
      p.tx = null; p.tdk = Math.round(p.dk);
      p.dk = Math.abs(p.tdk - p.dk) < 0.01 ? p.tdk : p.dk + Math.max(-dt * 1.5, Math.min(dt * 1.5, p.tdk - p.dk));
      continue;
    }
    if (ph !== 'move') { const k = Math.min(1, dt * 2); p.x += (p.seat - p.x) * k; p.dk += (0 - p.dk) * k; p.tx = null; p.tdk = 0; continue; }
    const step = 0.06 * dt;
    if (p.dk !== p.tdk) {  // to the ladder, then up or down it
      if (Math.abs(LADDER - p.x) > 0.003) { p.face = Math.sign(LADDER - p.x) || p.face; p.x += Math.max(-step, Math.min(step, LADDER - p.x)); }
      else p.dk += Math.max(-dt * 1.5, Math.min(dt * 1.5, p.tdk - p.dk));
    } else if (p.tx !== null) {
      p.face = Math.sign(p.tx - p.x) || p.face;
      p.x += Math.max(-step, Math.min(step, p.tx - p.x));
      if (Math.abs(p.tx - p.x) < 0.002) {
        p.tx = null; p.wait = rand(5, 12);
        if (p.role !== 'you' && Math.random() < 0.18 && !lifeHushed(lifeState())) {
          const line = lifeLine(p, people);
          if (line) comm(`[Ship] ${line}`);
        }
      }
    } else if ((p.wait -= dt) <= 0) {
      goTo(p, weighted(dark ? nightHaunts(p.role) : HAUNTS[p.role]));
    }
  }
}

// ---------- the cutaway ----------
// The box the cutaway is drawn in, its height over its width: on a wide screen and on a phone (js/transit.js).
const CUTAWAY_ASPECT = { wide: 0.36, narrow: 0.6 };
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
function drawCutaway(box) {
  const t = G.transit, st = G.state, people = shipPeople(), ph = phase(), still = Settings.reduceMotion, time = still ? 0 : G.time;
  const len = hullLength(SHIPS[st.shipId].size), view = viewOf(box), zoom = view.zoom, half = view.span / 2;
  const pr = Math.min(1, Math.max(0, 1 - t.left / t.total)), w = phaseWeights(pr);
  // The camera eases after the hand; it may look a little aft of the stern, at the bells.
  const camX = camStep(G.cam && G.cam.x + CUT_STERN, people[0].x * len + CUT_STERN, G.cam ? Math.max(0, G.time - G.cam.t) : 0, view.span, len + CUT_STERN) - CUT_STERN;
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
  if (burning) {
    const pl = len * (PLUME.base + PLUME.gain * Math.sin(Math.PI * pr)) + Math.sin(time * 23) * PLUME.flicker, mouth = -46, hr = H * PLUME.halo;
    const halo = ctx.createRadialGradient(mouth, cy, 0, mouth, cy, hr);
    halo.addColorStop(0, 'rgba(140,190,255,0.3)'); halo.addColorStop(1, 'rgba(60,90,255,0)');
    ctx.fillStyle = halo; ctx.fillRect(mouth - hr, cy - hr, hr * 2, hr * 2);
    for (const [a, b] of CUT_BELLS) {
      const m = (a + b) / 2, c = H * PLUME.cone, g = ctx.createLinearGradient(mouth, 0, mouth - pl, 0);  // white-hot for the first 40 units, then blue fading out
      g.addColorStop(0, 'rgba(255,255,255,0.95)'); g.addColorStop(Math.min(0.5, 40 / pl), 'rgba(140,190,255,0.75)'); g.addColorStop(1, 'rgba(60,90,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(mouth, m - c); ctx.quadraticCurveTo(mouth - pl * 0.25, m - c * 0.4, mouth - pl, m); ctx.quadraticCurveTo(mouth - pl * 0.25, m + c * 0.4, mouth, m + c); ctx.fill();
    }
  } else if (!t.event) {
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
  const s = { w, time: G.time, zoom, spin, still, berths: ship().berths, cargo: cap ? Math.min(cap, cargoUsed()) / cap : 0, fuel: G.state.fuel / ship().fuel || 0, burning, night: nightLevel(), asleep: slots.size };
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
  // enough out that its text would be under 12px.
  const sk = Math.max(1, 1.05 / zoom);
  ctx.save(); ctx.translate(X(roomAt('galley').x1) - 6 - 56 * sk, 8); ctx.scale(sk, sk); drawThrustSign(ctx, 0, 0, burnState().g, w, G.time, zoom * sk); ctx.restore();

  // The people: each in their posture, sleepers on the bunks the berths drew; names on the deck plate under them where they fit.
  ctx.font = `600 12px ${roomFont}`;
  const berths = cutRect(roomAt('berths'), len), labels = [], dots = [], hits = [];
  for (const p of people) {
    const asleep = slots.has(p), pose = posture(p, ph, time, asleep), bunk = asleep && berthBunk(berths, nb, slots.get(p));
    const x = bunk ? bunk.x + Math.min(44, bunk.w * 0.62) : X(p.x), y = bunk ? bunk.y - 5 : floorY(p.dk), dk = Math.round(p.dk);
    dots.push({ x: X(p.x), deck: p.dk, color: ROLE_COLORS[p.role] });
    if (Math.abs(x - camX) > half + 60) continue;  // out of view (a little margin, so no one pops in at the edge)
    const inView = Math.abs(x - camX) <= half;
    if (pose.name === 'couch') roomCouch(ctx, x, y, true);  // a crash couch, deployed under each person in the hard burn
    const tap = drawPerson(ctx, pose, x, y, { color: ROLE_COLORS[p.role], face: inView && !asleep && p.role !== 'cat' ? faceImage(p) : null, floating: ph === 'float' });
    if (pose.name === 'tether') {  // a line to a ring on the nearest bulkhead
      const d = CUT_WALLS[dk], bx = X([...d.hatch, d.end].reduce((a, b) => (Math.abs(b - p.x) < Math.abs(a - p.x) ? b : a))), rx = bx + Math.sign(x - bx) * 6, ry = floorY(dk) - 60;
      ctx.strokeStyle = 'rgba(201,162,39,0.9)'; ctx.lineWidth = 1.4;
      ctx.beginPath(); ctx.moveTo(tap.x, tap.y); ctx.quadraticCurveTo((tap.x + rx) / 2, Math.max(tap.y, ry) + 12 + Math.sin(time) * 6, rx, ry); ctx.stroke();
      ctx.beginPath(); ctx.arc(rx, ry, 3, 0, Math.PI * 2); ctx.stroke();
    }
    if (!inView) continue;
    if (p.id) { const at = toScreen(tap.x, tap.y); hits.push({ x: at.x, y: at.y, id: p.id }); }
    if (p.role !== 'passenger' || p.pid) {
      const nw = ctx.measureText(p.name).width / zoom;
      if (!labels.some(b => b.dk === dk && Math.abs(b.x - x) < (b.w + nw) / 2 + 4 / zoom)) {
        labels.push({ x, w: nw, dk });
        worldText(ctx, zoom, p.name, x, floorY(dk) + 10, 12 / zoom, '#9fb4c9', 'center');
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

  // What a tap can find: the rooms in view, the people in view, and the outline with everyone it shows.
  G.cutRooms = ROOMS.map(r => {
    const q = cutRect(r, len), a = toScreen(q.x0, q.top), b = toScreen(q.x1, q.floor);
    const x0 = Math.max(box.x, a.x), y0 = Math.max(box.y, a.y), x1 = Math.min(box.x + box.w, b.x), y1 = Math.min(box.y + box.h, b.y);
    return { id: r.id, x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }).filter(b => b.w > 0 && b.h > 0);
  G.cutHits = hits;
  G.cutOutline = { ...outlineLayout(box, len), ids: people.filter(p => p.id).map(p => p.id) };
  drawOutline(ctx, G.cutOutline, dots, camX, view.span, len, turn);
}

// ---------- downtime activities ----------
const lifeSay = (key, vars) => sceneSay('scene:shiplife', key, vars);  // the words of these are the lines of scene:shiplife (hiredscenes.js)
const ACTIVITIES = {
  meal: {
    get label() { return lifeSay('meal.label'); }, can: () => true,
    run() {
      for (const p of shipPeople()) if (p.role !== 'you') goTo(p, 'galley');
      goTo(shipPeople()[0], 'galley');
      for (const id of G.state.crew) if (G.state.people[id]) likeAmbient(G.state.people[id], 1, lifeSay('meal.crew.memory'));
      for (const m of paxAboard()) if (m.pid) likeAmbient(G.state.people[m.pid], 1, lifeSay('meal.pax.memory'));
      return pick([lifeSay('meal.result.0'), lifeSay('meal.result.1')]);
    },
  },
  drills: {
    get label() { return lifeSay('drills.label'); }, can: () => !G.transit.drilled,
    run() {
      G.transit.drilled = true;
      for (const p of shipPeople()) goTo(p, p.role === 'you' ? 'bridge' : pick(['hold', 'bridge', 'engine']));
      return lifeSay(tellingOn('drills.result', G.state.day));
    },
  },
  repair: {
    get label() { return lifeSay('repair.label'); }, can: () => G.state.armor < ship().armor,
    run() {
      const max = ship().armor, amount = Math.round(max * (roleSkill('engineer') ? 0.4 : 0.2)), before = G.state.armor;
      G.state.armor = Math.min(max, before + amount);
      for (const p of shipPeople()) goTo(p, p.role === 'passenger' ? 'galley' : pick(['engine', 'hold']));
      const day = G.state.day;  // the result and its tail are one version, taken by the day
      return `${lifeSay(tellingOn('repair.result', day), { before, after: G.state.armor, max })} ${roleSkill('engineer') ? lifeSay(tellingOn('repair.skilled', day), { name: roleName('engineer') }) : lifeSay(tellingOn('repair.alone', day))}`;
    },
  },
  visit: {
    get label() { return lifeSay('visit.label'); }, can: () => paxAboard().length > 0,
    run() {
      goTo(shipPeople()[0], 'berths');
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
