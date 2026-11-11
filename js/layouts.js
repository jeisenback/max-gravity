'use strict';

// Each hull's interior as data (docs/superpowers/specs/2026-11-08-tower-ship-design.md, #971): the decks from the nose down, each deck's
// rooms as shares of its width, the seats in a room as shares of the room, the ladder well's place across the decks, and the water tank
// between the plant deck and the drive deck. A hull with no layout of its own uses the Ice Hauler's. The functions below take a layout and
// return a value, in world units (js/camera.js HULL: a deck 100 from floor to ceiling, a floor plate 12), y measured down from the top of
// the flight deck's ceiling. Pure data and placing: nothing here reads G or draws. Loaded before camera.js; HULL is read at call time.
// The burn view reads it from the tower's step 2 (#972).

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
  },
};

const layoutOf = shipId => LAYOUTS[shipId] || LAYOUTS.freighter;
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
