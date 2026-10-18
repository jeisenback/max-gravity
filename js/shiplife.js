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
// The room under a point on the screen, from the boxes the last cutaway drawing recorded (js/transit.js maps them to pixels).
const roomAtPoint = (x, y) => { const r = (G.cutRooms || []).find(b => x >= b.x && x <= b.x + b.w && y >= b.y && y <= b.y + b.h); return r ? r.id : null; };

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
  return 'move';
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
    if (ph !== 'move') { const k = Math.min(1, dt * 2); p.x += (p.seat - p.x) * k; p.dk += (0 - p.dk) * k; p.tx = null; p.tdk = 0; continue; }
    const step = 0.06 * dt;
    if (p.dk !== p.tdk) {  // to the ladder, then up or down it
      if (Math.abs(LADDER - p.x) > 0.003) p.x += Math.max(-step, Math.min(step, LADDER - p.x));
      else p.dk += Math.max(-dt * 1.5, Math.min(dt * 1.5, p.tdk - p.dk));
    } else if (p.tx !== null) {
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
const CUTAWAY_H = 0.24;  // hull height as a share of its length: two decks
// The drive plume off the stern: its length as a share of the hull (growing with the burn's peak), the flicker in pixels, and the
// halo and the cone's half-width as shares of the hull's height.
const PLUME = { base: 0.28, gain: 0.32, flicker: 14, halo: 0.7, cone: 0.16 };

function drawCutaway(cx, cy, maxL) {
  // Longer hulls for bigger ships: a Dust Skiff is 60% of the space, an Ice Hauler all of it.
  const L = maxL * Math.min(1, 0.6 + 0.4 * (SHIPS[G.state.shipId].size - 10) / 8);
  const t = G.transit, people = shipPeople(), ph = phase(), H = Math.round(maxL * CUTAWAY_H);
  const burning = !t.event && Math.abs(t.angle - (t.flipped ? Math.PI / 2 : -Math.PI / 2)) < 0.05;
  // Nose to the right on the way out; at the flip the ship turns end over end.
  const turn = -Math.sin(t.angle);  // 1 before the flip, -1 after, 0 mid-turn
  const X = f => cx + (f - 0.5) * L * turn;
  const top = cy - H / 2, mid = top + H / 2, upper = mid - 3, lower = top + H - 6;  // the deck line and each deck's floor
  const dh = H / 2, ph_ = Math.max(9, Math.min(15, dh * 0.24));  // a deck's height, a person's
  const night = nightLevel();
  const floorOf = dk => upper + (lower - upper) * dk;
  const span = (a, b) => Math.max(2, (b - a) * L * Math.abs(turn));  // a share of the length, in pixels

  // Drive plume off the stern.
  if (burning) {
    const pk = Math.sin(Math.PI * Math.min(1, 1 - t.left / t.total)), len = L * (PLUME.base + PLUME.gain * pk) + Math.random() * PLUME.flicker, sx = X(0), dir = -Math.sign(turn || 1);
    const g = ctx.createLinearGradient(sx, 0, sx + dir * len, 0);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.15, 'rgba(140,190,255,0.8)');
    g.addColorStop(1, 'rgba(60,90,255,0)');
    const halo = ctx.createRadialGradient(sx, cy, 0, sx, cy, H * PLUME.halo);
    halo.addColorStop(0, 'rgba(140,190,255,0.3)'); halo.addColorStop(1, 'rgba(60,90,255,0)');
    ctx.fillStyle = halo;
    ctx.fillRect(sx - H * PLUME.halo, cy - H * PLUME.halo, H * PLUME.halo * 2, H * PLUME.halo * 2);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.moveTo(sx, cy - H * PLUME.cone); ctx.lineTo(sx + dir * len, cy); ctx.lineTo(sx, cy + H * PLUME.cone); ctx.fill();
  }
  if (Math.abs(turn) < 0.05) return;  // edge-on mid-turn

  // Each room's box, for a tap (#323): x0 and x1 swap after the flip, and the engine is the full height of the stern.
  G.cutRooms = ROOMS.map(r => { const a = X(r.x0), b = X(r.x1), tall = r.tall || r.deck === 0 ? top : mid; return { id: r.id, x: Math.min(a, b), y: r.tall ? top : tall, w: Math.abs(b - a), h: r.tall ? H : H / 2 }; });

  // Hull, with a rounded nose, lit from above.
  const shade = ctx.createLinearGradient(0, top, 0, top + H);
  shade.addColorStop(0, '#132338'); shade.addColorStop(1, '#08111c');
  ctx.fillStyle = shade;
  ctx.strokeStyle = '#3d5f82';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(X(0), top + 6); ctx.lineTo(X(0.9), top);
  ctx.quadraticCurveTo(X(1.02), cy, X(0.9), top + H);
  ctx.lineTo(X(0), top + H - 6); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.save();
  ctx.clip();

  // A pool of light under each room's ceiling lamp: warm in the galley and berths.
  for (const r of ROOMS) {
    const lx = X(r.mid), ly = r.deck === 0 || r.tall ? top + 4 : mid + 3, warm = r.id === 'galley' || r.id === 'berths';
    const dim = 1 - (r.id === 'bridge' || r.id === 'engine' ? 0.4 : 0.8) * night;  // the watch keeps its lights
    const lamp = ctx.createRadialGradient(lx, ly, 0, lx, ly, dh * 1.1);
    lamp.addColorStop(0, warm ? `rgba(255,200,130,${0.22 * dim})` : `rgba(150,200,255,${0.15 * dim})`);
    lamp.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = lamp;
    ctx.fillRect(lx - dh * 1.1, ly - 2, dh * 2.2, dh * 1.2);
    ctx.fillStyle = warm ? '#ffcf8f' : '#bfe0ff';
    ctx.fillRect(lx - 4, ly - 1, 8, 1.5);
  }
  // Bridge window in the nose.
  ctx.strokeStyle = 'rgba(160,215,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(X(0.915), top + dh * 0.3); ctx.quadraticCurveTo(X(0.955), top + dh * 0.5, X(0.96), mid - dh * 0.15);
  ctx.stroke();
  hullSeams(X, top, H, turn);  // plating, rivets and scars (hulldetail.js)
  ctx.restore();
  hullFittings(X, top, H, L, turn, cy);  // mast, fins and turrets
  // Running lights, blinking.
  if (G.time % 1.6 < 0.2) {
    ctx.fillStyle = '#ff5a5a'; ctx.fillRect(X(0.45) - 1.5, top - 3, 3, 3);
    ctx.fillStyle = '#5aff8a'; ctx.fillRect(X(0.45) - 1.5, top + H, 3, 3);
  }

  // Decks, bulkheads with a door at each floor, and the ladder.
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#27405c';
  ctx.beginPath();
  ctx.moveTo(X(0.17), mid); ctx.lineTo(X(LADDER - 0.012), mid);
  ctx.moveTo(X(LADDER + 0.012), mid); ctx.lineTo(X(0.9), mid);
  for (const x of [0.17, 0.44, 0.66, 0.78]) { ctx.moveTo(X(x), top + 4); ctx.lineTo(X(x), mid); }  // upper rooms
  ctx.moveTo(X(0.17), mid); ctx.lineTo(X(0.17), top + H - 4);  // the engine room's wall
  ctx.moveTo(X(0.4), mid); ctx.lineTo(X(0.4), top + H - 4);  // the medbay begins
  ctx.moveTo(X(0.66), mid); ctx.lineTo(X(0.66), top + H - 4);  // the tanks begin
  ctx.stroke();
  ctx.fillStyle = '#0c1826';
  for (const [x, f] of [[0.17, upper], [0.44, upper], [0.66, upper], [0.78, upper], [0.17, lower], [0.4, lower], [0.66, lower]]) {
    ctx.fillRect(X(x) - 2, f - ph_ - 3, 4, ph_ + 3);
    ctx.strokeRect(X(x) - 2, f - ph_ - 3, 4, ph_ + 3);
  }
  ctx.strokeStyle = '#1f3349';
  ctx.beginPath(); ctx.moveTo(X(0.01), lower + 1); ctx.lineTo(X(0.9), lower + 1); ctx.stroke();
  ctx.strokeStyle = '#4a6a8c';
  ctx.beginPath();
  ctx.moveTo(X(LADDER) - 4, mid); ctx.lineTo(X(LADDER) - 4, lower);
  ctx.moveTo(X(LADDER) + 4, mid); ctx.lineTo(X(LADDER) + 4, lower);
  for (let y = mid + 4; y < lower; y += 5) { ctx.moveTo(X(LADDER) - 4, y); ctx.lineTo(X(LADDER) + 4, y); }
  ctx.stroke();
  ctx.fillStyle = '#5b7896';
  ctx.font = `600 12px ${LABEL_FONT}`;
  ctx.textAlign = 'center';
  for (const r of ROOMS) {  // a name too long for a narrow room is cut to three letters
    const name = r.name.toUpperCase();
    ctx.fillText(ctx.measureText(name).width < span(r.x0, r.x1) - 4 ? name : name.slice(0, 3), X(r.mid), r.deck === 0 || r.tall ? top + 14 : mid + 13);
  }

  // Engine: the reactor, brighter under thrust, with its coolant lines and a console.
  const eng = roomAt('engine'), glow = (burning ? 0.9 : 0.35) * (0.9 + 0.1 * Math.sin(G.time * 6));
  const ex = X(eng.mid), ey = cy + 2, er = Math.min(H * 0.14, span(0, 0.17) * 0.3);
  const core = ctx.createRadialGradient(ex, ey, 0, ex, ey, er * 1.7);
  core.addColorStop(0, `rgba(230,245,255,${glow})`);
  core.addColorStop(0.4, `rgba(120,180,255,${glow * 0.8})`);
  core.addColorStop(1, 'rgba(60,110,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(ex, ey, er * 1.7, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5d7fa3';
  ctx.beginPath(); ctx.arc(ex, ey, er, 0, Math.PI * 2); ctx.stroke();
  ctx.strokeStyle = '#2a4561';
  ctx.beginPath();
  ctx.moveTo(ex, ey - er); ctx.lineTo(ex, top + 20);
  ctx.moveTo(ex, ey + er); ctx.lineTo(ex, lower);
  ctx.moveTo(ex - er, ey); ctx.lineTo(X(0.01), ey);
  ctx.stroke();
  ctx.fillStyle = '#35587d';
  ctx.fillRect(X(0.145) - 3, lower - 12, 6, 12);
  ctx.fillStyle = `rgba(255,170,80,${0.5 + 0.4 * Math.sin(G.time * 3)})`;
  ctx.fillRect(X(0.145) - 2, lower - 10, 4, 2);

  // Hold: crates for the cargo you carry, two rows on the deck.
  const hold = roomAt('hold'), cap = ship().cargo, used = Math.min(cap, cargoUsed());
  const fillN = cap ? Math.round(12 * used / cap) : 0, cw = span(hold.x0, hold.x1) / 6 - 3, chh = Math.min(10, (lower - mid - 22) / 2);
  const colors = ['#8a6d3b', '#6d7f3b', '#3b6d7f', '#7f3b5a'];
  for (let i = 0; i < fillN; i++) {
    const col = i % 6, row = Math.floor(i / 6);
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(X(hold.x0 + hold.w * (col + 0.5) / 6) - cw / 2, lower - (row + 1) * (chh + 1), cw, chh);
  }

  // Reaction mass tanks in the lower nose, filled to what is left.
  const fuelShare = Math.max(0, Math.min(1, G.state.fuel / ship().fuel)) || 0, th = lower - mid - 22;
  for (const [a, b] of [[0.685, 0.775], [0.79, 0.88]]) {
    const tx = X(Math.min(a, b)), tw = span(a, b), x0 = Math.min(X(a), X(b));
    ctx.strokeStyle = '#4a6a8c';
    ctx.strokeRect(x0, lower - th, tw, th);
    ctx.fillStyle = '#2f7f4a';
    ctx.fillRect(x0 + 1, lower - th * fuelShare, tw - 2, th * fuelShare - 1);
  }

  // Berths: bunks in two tiers for each berth on this ship (up to twelve drawn).
  const berths = roomAt('berths'), n = Math.min(12, ship().berths), cols = Math.ceil(n / 2), bw = Math.min(26, span(berths.x0, berths.x1) / cols - 5);
  for (let i = 0; i < n; i++) {
    const bx = X(berths.x0 + berths.w * (Math.floor(i / 2) + 0.5) / cols), by = i % 2 ? upper - 22 : upper - 9;
    ctx.fillStyle = '#1d2f45'; ctx.fillRect(bx - bw / 2, by, bw, 5);
    ctx.fillStyle = '#2c4766'; ctx.fillRect(bx - bw / 2 + 1, by, bw - 2, 3);
    ctx.fillStyle = '#6f8aa8'; ctx.fillRect(bx - bw / 2 + 1, by, 4, 3);
  }
  // Galley: a counter along the wall, and a table with stools.
  const gal = roomAt('galley'), gx = X(gal.mid);
  ctx.fillStyle = '#2a3f58';
  ctx.fillRect(Math.min(X(0.455), X(0.5)), upper - 9, span(0.455, 0.5), 9);
  ctx.fillRect(gx - 10, upper - 9, 20, 2);
  ctx.fillRect(gx - 1, upper - 7, 2, 7);
  ctx.fillRect(gx - 12, upper - 4, 4, 4); ctx.fillRect(gx + 8, upper - 4, 4, 4);
  ctx.fillStyle = '#e8c890'; ctx.fillRect(gx - 4, upper - 12, 3, 3);
  // Gunnery: a fire-control console with a red screen, and the weapons locker.
  const gun = roomAt('gunnery'), gcx = X(gun.x0 + 0.035);
  ctx.fillStyle = '#35587d'; ctx.fillRect(gcx - 5, upper - 12, 10, 12);
  ctx.fillStyle = `rgba(255,110,90,${0.5 + 0.25 * Math.sin(G.time * 2.5)})`; ctx.fillRect(gcx - 4, upper - 11, 8, 4);
  const lock = X(gun.x0 + 0.095);
  ctx.fillStyle = '#2a3f58'; ctx.fillRect(lock - 3, upper - 16, 6, 16);
  ctx.fillStyle = '#0c1826'; for (let y = upper - 14; y < upper - 2; y += 4) ctx.fillRect(lock - 2, y, 4, 1);
  // Bridge: two consoles with live screens, and the helm chair.
  const br = roomAt('bridge');
  for (const f of [0.03, 0.075]) {
    const bx = X(br.x0 + f);
    ctx.fillStyle = '#35587d'; ctx.fillRect(bx - 4, upper - 12, 8, 12);
    ctx.fillStyle = `rgba(120,200,255,${0.55 + 0.25 * Math.sin(G.time * 2 + f * 40)})`; ctx.fillRect(bx - 3, upper - 11, 6, 4);
  }
  ctx.fillStyle = '#2a3f58'; ctx.fillRect(X(br.x0 + 0.115) - 3, upper - 8, 6, 8);
  // Medbay: an exam bed, a drug cabinet with a green cross, and a drip stand.
  const med = roomAt('medbay'), mb = X(med.x0 + med.w * 0.35);
  ctx.fillStyle = '#2a3f58'; ctx.fillRect(mb - 12, lower - 7, 24, 3); ctx.fillRect(mb - 10, lower - 4, 2, 4); ctx.fillRect(mb + 8, lower - 4, 2, 4);
  ctx.fillStyle = '#9fb4c9'; ctx.fillRect(mb - 12, lower - 9, 7, 2);
  const cab = X(med.x0 + med.w * 0.8);
  ctx.fillStyle = '#35587d'; ctx.fillRect(cab - 5, lower - 18, 10, 18);
  ctx.fillStyle = '#6fd08c'; ctx.fillRect(cab - 1, lower - 15, 2, 8); ctx.fillRect(cab - 3, lower - 12, 6, 2);
  ctx.strokeStyle = '#5b7896'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(mb + 14, lower); ctx.lineTo(mb + 14, lower - 18); ctx.lineTo(mb + 11, lower - 18); ctx.stroke();

  // People, with names below the hull where they fit.
  ctx.textAlign = 'center';
  ctx.font = '12px "IBM Plex Mono", monospace';
  const labels = [];
  // At night, whoever is turned in lies on a bunk.
  const bunk = i => ({ x: X(berths.x0 + berths.w * (Math.floor(i / 2) + 0.5) / cols), y: i % 2 ? upper - 22 : upper - 9 });
  const slots = new Map();
  for (const p of people) if (slots.size < n && isAsleep(p)) slots.set(p, slots.size);
  G.cutHits = [];  // where each person is on screen, for a click (game.js)
  people.forEach((p, i) => {
    const asleep = slots.has(p), x = asleep ? bunk(slots.get(p)).x : X(p.x), floating = ph === 'float', bob = floating ? Math.sin(G.time * 2 + i) * dh * 0.18 - dh * 0.12 : 0;
    const y = floorOf(p.dk) + bob, seated = ph === 'couch', walking = (p.tx !== null || p.dk !== p.tdk) && !floating && !seated;
    if (p.id) G.cutHits.push({ x, y: asleep ? bunk(slots.get(p)).y - 2 : y - ph_ / 2, id: p.id });
    ctx.fillStyle = ROLE_COLORS[p.role];
    ctx.strokeStyle = ROLE_COLORS[p.role];
    if (asleep) {
      const b = bunk(slots.get(p));
      ctx.fillRect(b.x - 7, b.y - 3, 14, 3);
      ctx.beginPath(); ctx.arc(b.x - 10, b.y - 2, 2.6, 0, Math.PI * 2); ctx.fill();
    } else if (p.role === 'cat') {  // low to the deck: a body, a head with ears and eyes, and a tail that sways
      const walkingCat = p.tx !== null && !floating && !seated, sway = Math.sin(G.time * (walkingCat ? 6 : 2.2) + i) * 2;
      ctx.fillRect(x - 4, y - 4, 8, 4);
      ctx.fillRect(x + 3, y - 7, 4, 4);
      ctx.fillRect(x + 3, y - 9, 1, 2); ctx.fillRect(x + 6, y - 9, 1, 2);
      ctx.fillRect(x - 4, y - 1, 1.5, 1); ctx.fillRect(x + 2, y - 1, 1.5, 1);
      ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x - 4, y - 3); ctx.quadraticCurveTo(x - 8, y - 6 + sway, x - 7, y - 9 + sway); ctx.stroke(); ctx.lineWidth = 1;
      ctx.fillStyle = '#10213a'; ctx.fillRect(x + 4, y - 6, 1, 1); ctx.fillRect(x + 6, y - 6, 1, 1);
      ctx.fillStyle = ROLE_COLORS[p.role];
    } else {
      const bodyH = seated ? ph_ * 0.5 : ph_ * 0.62, legH = seated ? 0 : ph_ - bodyH - 4;
      const swing = walking ? Math.sin(G.time * 9 + i) * 2 : 0;
      ctx.lineWidth = 1.5;
      if (legH > 0) { ctx.beginPath(); ctx.moveTo(x - 1, y - legH); ctx.lineTo(x - 1 + swing, y); ctx.moveTo(x + 1, y - legH); ctx.lineTo(x + 1 - swing, y); ctx.stroke(); }
      ctx.lineWidth = 1;
      ctx.fillRect(x - 2.5, y - legH - bodyH, 5, bodyH);
      const face = faceImage(p), hy = y - legH - bodyH - 2.5;  // the head: a face once its picture has loaded (#297), else a dot
      if (face) {
        ctx.save(); ctx.beginPath(); ctx.arc(x, hy - 1.5, 6, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(face, x - 6, hy - 7.5, 12, 12); ctx.restore();
        ctx.beginPath(); ctx.arc(x, hy - 1.5, 6, 0, Math.PI * 2); ctx.stroke();
      } else { ctx.beginPath(); ctx.arc(x, hy, 2.6, 0, Math.PI * 2); ctx.fill(); }
    }
    if (p.role !== 'passenger' || p.pid) {
      const w = ctx.measureText(p.name).width + 4;
      const row = [0, 1, 2].find(r => !labels.some(b => b.row === r && Math.abs(b.x - x) < (b.w + w) / 2));
      if (row !== undefined) {
        labels.push({ x, w, row });
        ctx.fillStyle = '#9fb4c9';
        ctx.fillText(p.name, x, top + H + 12 + row * 14);
      }
    }
  });
  ctx.textAlign = 'left';
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
      return lifeSay('drills.result');
    },
  },
  repair: {
    get label() { return lifeSay('repair.label'); }, can: () => G.state.armor < ship().armor,
    run() {
      const max = ship().armor, amount = Math.round(max * (roleSkill('engineer') ? 0.4 : 0.2)), before = G.state.armor;
      G.state.armor = Math.min(max, before + amount);
      for (const p of shipPeople()) goTo(p, p.role === 'passenger' ? 'galley' : pick(['engine', 'hold']));
      return `${lifeSay('repair.result', { before, after: G.state.armor, max })} ${roleSkill('engineer') ? lifeSay('repair.skilled', { name: roleName('engineer') }) : lifeSay('repair.alone')}`;
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
  const out = menuFive(lanes, turn);
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
      ...(all ? [...baseActivities(), ...handDowntime(), ...onNow()] : downtimeFive()).map(a => ({
        label: activityLabel(a), can: a.can,
        run() {
          spendLife(t);
          if (hired()) hired().did = { ...hired().did, downtime: true };  // the first run's steps (tutorial.js)
          const text = a.run();
          // Comms gets one line, what was done and what it taught: it shows eight lines, and the result runs to twelve on a phone (#767). One that leads
          // straight into a scene (Sit with someone) has nothing to say yet.
          const taught = text && (text.match(/\([^()]*\)$/) || [''])[0];
          if (text) comm(`[Ship] ${lifeSay('log', { what: activityLabel(a) })}${taught ? ` ${taught}` : ''}`);
          return text;
        },
      })),
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
