'use strict';

// Each hull's interior as data (docs/superpowers/specs/2026-11-08-tower-ship-design.md, #971): the decks from the nose down, each deck's
// rooms as shares of its width, the seats in a room as shares of the room, the ladder well's place across the decks, and the water tank
// between the plant deck and the drive deck. A hull with no layout of its own uses the Ice Hauler's. The functions below take a layout and
// return a value, in world units (js/camera.js HULL: a deck 100 from floor to ceiling, a floor plate 12), y measured down from the top of
// the flight deck's ceiling. Pure data and placing: nothing here reads G or draws. Loaded before camera.js; HULL is read at call time.
// The burn view reads it from the tower's step 2 (#972).

// A layout's spots from rows of [id, deck, x, cover, name, what, post] (a post only where that post is worked).
function spotList(rows) { return rows.map(([id, deck, x, cover, name, what, post]) => ({ id, deck, x, cover, name, what, ...(post ? { post } : {}) })); }

const LAYOUTS = {
  freighter: {  // the Ice Hauler: a habitat of six decks over her water tank, the drive deck under it
    width: 720, well: { x: 0.5, w: 0.04 }, tankAfter: 5, tankH: 260,
    decks: [
      { id: 'flight', name: 'Flight deck', rooms: [{ id: 'bridge', name: 'Bridge', x0: 0, x1: 1 }] },
      { id: 'mess', name: 'Mess deck', rooms: [{ id: 'galley', name: 'Galley', x0: 0, x1: 0.48 }, { id: 'head', name: 'Head', x0: 0.52, x1: 1 }] },
      { id: 'crew', name: 'Crew deck', rooms: [{ id: 'berths', name: 'Berths', x0: 0, x1: 1 }] },
      { id: 'gun', name: 'Gun deck', rooms: [{ id: 'gunnery', name: 'Gunnery', x0: 0, x1: 0.48 }, { id: 'workshop', name: 'Workshop', x0: 0.52, x1: 1 }] },
      { id: 'lock', name: 'Lock deck', rooms: [{ id: 'airlock', name: 'Airlock', x0: 0, x1: 0.48 }, { id: 'medbay', name: 'Medbay', x0: 0.52, x1: 1 }] },
      { id: 'plant', name: 'Plant deck', rooms: [{ id: 'lifesupport', name: 'Life support', x0: 0, x1: 1 }] },
      { id: 'drive', name: 'Drive deck', rooms: [{ id: 'engine', name: 'Engine', x0: 0, x1: 0.48 }, { id: 'hold', name: 'Hold', x0: 0.52, x1: 1 }] },
    ],
    seats: { galley: [0.28, 0.35, 0.42, 0.49, 0.56, 0.63, 0.7], bridge: [0.12, 0.3, 0.7, 0.88], gunnery: [0.25, 0.55], medbay: [0.66] },
    // Where a person can stand in a boarding (docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md, "The decks", #1351): the prototype's,
    // with a second spot in the engine room and the hold. [id, deck, x (a share of the deck's width), cover 0 to 2, name, what is there, post worked there]
    spots: spotList([
      ['helm', 0, 0.14, 1, 'the helm', 'console', 'pilot'], ['nav', 0, 0.86, 1, 'the nav station', 'console', 'comms'],
      ['table', 1, 0.16, 2, 'the galley table', 'table'], ['stove', 1, 0.36, 1, 'the stove', 'worktop'], ['headdoor', 1, 0.64, 1, 'the head door', 'door'], ['shower', 1, 0.86, 1, 'the shower', 'stall'],
      ['bunksP', 2, 0.13, 2, 'the port bunks', 'bunks'], ['bunksM', 2, 0.33, 1, 'the middle bunks', 'bunks'], ['lockers', 2, 0.67, 1, 'the lockers', 'lockers'], ['bunksS', 2, 0.87, 2, 'the starboard bunks', 'bunks'],
      ['gunseat', 3, 0.16, 1, 'the gun seat', 'seat', 'gunner'], ['magazine', 3, 0.37, 2, 'the magazine', 'racks'], ['bench', 3, 0.64, 2, 'the workbench', 'bench'], ['toolwall', 3, 0.86, 1, 'the tool wall', 'rack'],
      ['outer', 4, 0.1, 0, 'the outer door', ''], ['inner', 4, 0.34, 1, 'the inner door', 'door frame'], ['medbed', 4, 0.66, 1, 'the medbay bed', 'bed'], ['cabinet', 4, 0.88, 1, 'the drug cabinet', 'cabinet'],
      ['scrub', 5, 0.2, 2, 'the scrubbers', 'scrubbers'], ['tanks', 5, 0.8, 2, 'the water tanks', 'tanks'],
      ['reactor', 6, 0.18, 2, 'the reactor shield', 'shield', 'engineer'], ['pumps', 6, 0.4, 1, 'the coolant pumps', 'pumps'], ['loader', 6, 0.62, 2, 'the ice loader', 'loader'], ['crates', 6, 0.84, 2, 'the crates', 'crates'],
    ]),
  },
  // Her decks, for a boarding only (board: the burn view keeps the Ice Hauler's for a hull without a layout of its own, layoutOf). Nose up: her
  // bridge, her crew's space, her lock. A raider runs a small crew and grapples alongside; a corsair carries marines, who muster in her ready room.
  raider: {
    width: 560, well: { x: 0.5, w: 0.05 }, board: true, seats: {},
    decks: [
      { id: 'flight', name: 'Flight deck', rooms: [{ id: 'bridge', name: 'Bridge', x0: 0, x1: 1 }] },
      { id: 'crew', name: 'Crew deck', rooms: [{ id: 'bunks', name: 'Bunk room', x0: 0, x1: 0.47 }, { id: 'galley', name: 'Galley', x0: 0.53, x1: 1 }] },
      { id: 'lock', name: 'Lock deck', rooms: [{ id: 'airlock', name: 'Airlock', x0: 0, x1: 0.47 }, { id: 'hold', name: 'Hold', x0: 0.53, x1: 1 }] },
    ],
    spots: spotList([
      ['helm', 0, 0.16, 1, 'her helm', 'console'], ['gun', 0, 0.84, 1, 'her gun console', 'console'],
      ['bunks', 1, 0.14, 2, 'her bunks', 'bunks'], ['lockers', 1, 0.36, 1, 'her lockers', 'lockers'], ['table', 1, 0.64, 2, 'her mess table', 'table'], ['water', 1, 0.86, 1, 'her water tank', 'tank'],
      ['outer', 2, 0.1, 0, 'her outer door', ''], ['inner', 2, 0.34, 1, 'her inner door', 'door frame'], ['winches', 2, 0.66, 1, 'the grapple winches', 'winches'], ['nets', 2, 0.88, 2, 'the cargo nets', 'nets'],
    ]),
  },
  corsair: {
    width: 600, well: { x: 0.5, w: 0.05 }, board: true, seats: {},
    decks: [
      { id: 'flight', name: 'Flight deck', rooms: [{ id: 'bridge', name: 'Bridge', x0: 0, x1: 1 }] },
      { id: 'crew', name: 'Crew deck', rooms: [{ id: 'bunks', name: 'Bunk room', x0: 0, x1: 0.47 }, { id: 'galley', name: 'Galley', x0: 0.53, x1: 1 }] },
      { id: 'ready', name: 'Ready deck', rooms: [{ id: 'ready', name: 'Ready room', x0: 0, x1: 0.47 }, { id: 'torpedoes', name: 'Torpedo bay', x0: 0.53, x1: 1 }] },
      { id: 'lock', name: 'Lock deck', rooms: [{ id: 'airlock', name: 'Airlock', x0: 0, x1: 0.47 }, { id: 'stores', name: 'Stores', x0: 0.53, x1: 1 }] },
    ],
    spots: spotList([
      ['helm', 0, 0.16, 1, 'her helm', 'console'], ['fire', 0, 0.84, 1, 'her fire-control station', 'console'],
      ['bunks', 1, 0.14, 2, 'her bunks', 'bunks'], ['lockers', 1, 0.36, 1, 'her lockers', 'lockers'], ['table', 1, 0.66, 2, 'her mess table', 'table'], ['counter', 1, 0.88, 1, 'her galley counter', 'counter'],
      ['suits', 2, 0.14, 2, 'the suit racks', 'racks'], ['benches', 2, 0.36, 1, 'the ready benches', 'benches'], ['cradle', 2, 0.64, 1, 'the loading cradle', 'cradle'], ['rack', 2, 0.86, 2, 'the torpedo rack', 'rack'],
      ['outer', 3, 0.1, 0, 'her outer door', ''], ['inner', 3, 0.34, 1, 'her inner door', 'door frame'], ['cage', 3, 0.66, 2, 'the stores cage', 'cage'], ['shelves', 3, 0.88, 1, 'the spares shelves', 'shelves'],
    ]),
  },
};

const layoutOf = shipId => (LAYOUTS[shipId] && !LAYOUTS[shipId].board ? LAYOUTS[shipId] : LAYOUTS.freighter);  // a boarding's decks are not a hull to fly
// Every room with its deck's index, nose first.
const layoutRooms = lay => lay.decks.flatMap((d, deck) => d.rooms.map(r => ({ ...r, deck })));
const layoutRoom = (lay, id) => layoutRooms(lay).find(r => r.id === id);
// A deck's floor: a deck and its plate each, and the tank's height for every deck under it.
const deckFloor = (lay, deck) => HULL.deck + deck * (HULL.deck + HULL.plate) + (deck > lay.tankAfter ? lay.tankH : 0);
// A room's box, the shape js/rooms.js draws into: { x0, x1, top, floor }, its ceiling a deck's height over its floor.
function layoutBox(lay, id) {
  const r = layoutRoom(lay, id);
  if (!r) return undefined;
  const floor = deckFloor(lay, r.deck);
  return { x0: r.x0 * lay.width, x1: r.x1 * lay.width, top: floor - HULL.deck, floor };
}
// From the flight deck's ceiling to the drive deck's floor.
const towerHeight = lay => deckFloor(lay, lay.decks.length - 1);
// A room's k-th seat, as a world x: undefined if the room or the seat is not there.
function seatX(lay, id, k) {
  const b = layoutBox(lay, id), f = (lay.seats[id] || [])[k];
  return b && f !== undefined ? b.x0 + (b.x1 - b.x0) * f : undefined;
}
// The room on a deck holding world x, or null: in the well on a split deck, off the deck's ends, or off the decks.
function layoutRoomAt(lay, deck, x) {
  const d = lay.decks[deck], s = x / lay.width, r = d && d.rooms.find(q => s >= q.x0 && s <= q.x1);
  return r ? r.id : null;
}
// The places a person passes on the way from one place to another, after where they start: straight along the deck on the same deck, else
// to the well, up or down it (through the tube in the tank to the drive deck), and along the deck they reach.
function walkPath(lay, from, to) {
  if (from.deck === to.deck) return [{ deck: to.deck, x: to.x }];
  const wx = lay.well.x * lay.width;
  return [{ deck: from.deck, x: wx }, { deck: to.deck, x: wx }, { deck: to.deck, x: to.x }];
}

// ---------- the decks in a boarding (#1351): spots, the moves between them, the hatches in the well, and the lines of fire ----------
// Every spot of a layout, and a well spot on every deck (no cover, on the well's line).
const deckSpots = lay => [...(lay.spots || []), ...lay.decks.map((d, deck) => ({ id: `w${deck}`, deck, x: lay.well.x, cover: 0, name: `the well at the ${d.name.toLowerCase()}`, what: '', well: true }))];
const deckSpot = (lay, id) => deckSpots(lay).find(p => p.id === id);
// The moves: along each side of a deck to the next spot, the innermost on each side to the well spot, and well spot to well spot one deck apart.
function spotLinks(lay) {
  const spots = deckSpots(lay), out = Object.fromEntries(spots.map(p => [p.id, []])), link = (a, b) => { out[a].push(b); out[b].push(a); };
  lay.decks.forEach((_, d) => {
    const row = spots.filter(p => p.deck === d && !p.well), wx = lay.well.x;
    const left = row.filter(p => p.x < wx).sort((a, b) => b.x - a.x), right = row.filter(p => p.x > wx).sort((a, b) => a.x - b.x);
    for (const side of [left, right]) side.forEach((p, i) => link(p.id, i ? side[i - 1].id : `w${d}`));
    if (d < lay.decks.length - 1) link(`w${d}`, `w${d + 1}`);
  });
  return out;
}
// The hatch in the well between two well spots one deck apart ('h' and the upper deck's index), else null.
function spotHatch(lay, a, b) {
  const p = deckSpot(lay, a), q = deckSpot(lay, b);
  return p && q && p.well && q.well && Math.abs(p.deck - q.deck) === 1 ? `h${Math.min(p.deck, q.deck)}` : null;
}
// The next step from `from` toward the nearest of `goals`, and how many steps: through no hatch in `sealed` and onto no spot in `blocked`.
// { next: null, dist: 0 } when `from` is a goal; null when no goal can be reached.
function spotPath(lay, from, goals, sealed = {}, blocked = {}) {
  const links = spotLinks(lay), goal = new Set(goals), prev = { [from]: null }, q = [from];
  while (q.length) {
    const c = q.shift();
    if (goal.has(c)) {
      if (c === from) return { next: null, dist: 0 };
      let n = c, dist = 1;
      while (prev[n] !== from) { n = prev[n]; dist++; }
      return { next: n, dist };
    }
    for (const n of links[c]) if (!(n in prev) && !blocked[n] && !sealed[spotHatch(lay, c, n)]) { prev[n] = c; q.push(n); }
  }
  return null;
}
// A line of fire: between two spots on one deck, or between well spots one deck apart through an open hatch.
function inLine(lay, a, b, sealed = {}) {
  const p = deckSpot(lay, a), q = deckSpot(lay, b);
  if (!p || !q || a === b) return false;
  if (p.deck === q.deck) return true;
  const h = spotHatch(lay, a, b);
  return !!h && !sealed[h];
}
// The decks a boarding is fought on: the hull's own, else a raider's.
const boardLayout = shipId => LAYOUTS[shipId] || LAYOUTS.raider;
