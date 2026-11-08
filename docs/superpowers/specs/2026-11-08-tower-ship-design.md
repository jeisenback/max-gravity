# The ship as a tower: the Ice Hauler's interior, decks across the thrust

Part of #931. Agreed with the owner in chat, 2026-11-08.

## Why

The burn view draws every hull with one interior: two decks along the ship's length, as if she stood on the ground. Under thrust "down" is toward the drive, so in that layout the crew in a hard burn would be pressed against the aft walls; the game already models thrust (crash couches, the flip, the float), and the picture contradicts it. The rooms are also too few and sized by the strip they fit in, not by what happens in them, and the Ice Hauler's own cargo, her great water tank (`HULLS.freighter` in `js/art.js`), is not in the cutaway at all.

The owner asked for all four: right-sized and missing rooms, a ship that reads as an engineered vessel, each hull its own interior, and room for the stories that are coming (the patrol boarding, #940; smuggling; the co-op ship in chapter two).

## Scope

1. **Layout as data:** each hull describes its own interior.
2. **The Ice Hauler's interior** (the Iron Anvil, chapter one): the tower below.
3. **The Ore Runner's interior** (chapter two's co-op ship): its own, later. Until then it shares the Ice Hauler's, as every hull shares one interior today.
4. **The room-by-room detail pass (#933)** on the tower.

The other hulls appear only as enemies or in the parked owner game (`ROADMAP.md`); they get no interior until the owner game returns.

## The Ice Hauler

**Orientation: a tower.** The decks are stacked across the thrust axis, the nose up and the drive down, drawn as a tall cutaway. Thrust pushes everyone toward the floor below them.

**Habitat plus the tank.** She is drawn as she is built: a crew module of six decks bolted to the water tank, with the drive deck under the tank. The tank is her cargo and the crew's shield from the drive; a ladder tube runs through it.

From the nose down:

| Deck | Rooms | Why there |
|---|---|---|
| (nose) | Sensors and antenna | not a room |
| Flight | Bridge, full width (helm, nav, comms rack) | nearest the sensors |
| Mess | Galley; Head and shower | the rooms everyone passes through all day |
| Crew | Berths, full width (ten bunks either side of the well, curtains, lockers) | out of the traffic |
| Gun | Gunnery (turret seats, torpedo rack); Workshop (bench, tool wall, spares, gun mods) | the guns away from the bridge, the armourer's bench beside them |
| Lock | Airlock (outer door in the hull, suits); Medbay (cot, IV, cabinet) | casualties come in through the lock to the medbay |
| Plant | Life support, full width (scrubbers, the water recycler) | over the tank it draws on |
| (tank) | Water tank, the ladder tube through it | the shield |
| Drive | Engine room (reactor, H2 fuel, drive controls); Hold (crates, cargo door, the smuggling panel) | the hold beside the engine, outside the shielded habitat |

New rooms: head and shower, workshop, airlock, life support. The gunnery moves off the flight deck. A central ladder well joins every deck; below the plant deck it becomes the tube through the tank.

## On screen and in a burn

- **Camera:** a wide window shows about three decks, the tower filling the box's width. The camera pans up and down to follow the hand as it pans across today, in every phase: it stays close in the hard burn and the flip too, since the whole tower in the burn box (480px high on a 1600px window) leaves people about 8px tall. The outline in the corner shows the whole tower and where the view is. (Owner's call, 2026-11-08, from the framing mockup.)
- **Moving:** people walk along a deck and climb the well between decks; the climb pose becomes the common way between rooms. The engine room is down the tube through the tank: a longer climb, a real errand.
- **The hard burn:** the crash couches lie flat on the floor and people lie on their backs, face up toward the nose.
- **The flip:** the tower stays upright and the stars swing half a turn around her, with the float at the midpoint, as the burn view does today. The decks stay floors throughout: after the flip the drive points the other way and "down" is still the drive. (Owner's call, 2026-11-08, over turning the tower on screen.)
- **Cruise:** low thrust, ordinary life on the decks.
- The hull's skin, its thickness and the nose (#961) are drawn as part of the tower's outline.

## Layout as data

A new script, `js/layouts.js`, holds `LAYOUTS`: for each hull its decks from the nose down, each deck's rooms (id, name, share of the deck's width), the seats in each room, the ladder well's place across the deck, the tank, and the drive deck. `freighter` has the tower above. A hull with no entry uses `freighter`'s.

The functions that place things read the layout as a parameter and return a value, and are tested in Node (`tests/nodecontext.js`): where a room and a floor are, a person's spot, routines, scene staging (`sceneStage`), the damage marks (`marksFor`), the camera. Their callers read `G` and the ship's layout.

What reads the layout: the burn view's drawing (`js/shiplife.js`, `js/rooms.js`), the camera (`js/camera.js`), the Interior deck plan (`js/bridge.js`), and taps on people and rooms (`js/game.js`).

Room ids stay as they are (`bridge`, `galley`, `berths`, `gunnery`, `medbay`, `hold`, `engine`), so scenes that name a room still find it; the new rooms are `head`, `workshop`, `airlock` and `lifesupport`. The pins record what scenes play, not where people stand, so they are expected to stay the same; that is checked when it is built.

## Build order

One PR each.

1. **The layout and the placing functions,** in Node, with tests; nothing drawn from them yet.
2. **The burn view as the tower:** the drawing, the camera, walking along decks and climbing the well, the flat couches, the tower turning at the flip, the Interior page and taps; the old lengthwise drawing removed. The seven rooms on their new decks, the new rooms drawn plain. #961 folded in.
3. **The routines use the new rooms:** the head in the morning's queue, the engineer at life support and in the workshop, the airlock mostly idle until #940.
4. **#933's detail pass** room by room on the tower, with #959 and #960 folded in as agreed.
5. **The Ore Runner's own interior.**

## Issues this touches

To update when this is approved: #933 (its rooms gain head, workshop, airlock, life support), #961 (folded into step 2), #936 (the bridge window is at the top), #940 (the airlock exists), #934 and #932 (the bunks and the lamps on their new decks).

## Not in scope

Interiors for the enemy hulls and the owner game's ships; new stories in the new rooms beyond the routines in step 3; the portraits.

## Constraints

Desktop only (#937): nothing designed or tested for phones. Reduced motion keeps the camera and the flip still (`Settings.reduceMotion`). Nothing drawn under 12px. Classic scripts in one global scope: `js/layouts.js` is linked in `index.html` before the scripts that read it, and `tests/globals.test.js` checks it.
