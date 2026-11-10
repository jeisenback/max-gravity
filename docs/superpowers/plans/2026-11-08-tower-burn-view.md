# Tower Burn View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The burn view draws and runs the Ice Hauler as the tower in `js/layouts.js`: people placed and walking on seven decks, the camera panning up and down, the corner outline, the Interior page and taps on the tower, flat crash couches, the hull's skin and nose; the old lengthwise side view removed (#972, closing #961).

**Architecture:** People keep their state in the same fields, with the same meanings re-based on the tower: `p.x` is a share of the tower's width (it was a share of the hull's length) and `p.dk` a deck index from the nose (0 to 6, fractional on the ladder). So `ROOMS`, `LADDER` and `SEATS` keep their names and shapes but are built from `LAYOUTS.freighter`, and most `r.x0 + r.w * f` arithmetic stands; only the tolerances and speeds written in shares of a 1600-unit length are rescaled to the 880-unit width. Drawing moves from `cutRect` and the fixed hull band to `layoutBox` and `deckFloor`; the camera follows y.

**Tech Stack:** Vanilla JS classic scripts, canvas 2D, `node:test`, Playwright (the repo's `tests/helpers.js`).

**Spec:** `docs/superpowers/specs/2026-11-08-tower-ship-design.md` (its "On screen and in a burn" as amended on 2026-11-08: the camera stays close in every phase, the stars swing at the flip).

## Global Constraints

- One PR, built in the ordered commits below (owner's call, 2026-11-08). The Node tests (`tests/livingship.test.js`, `tests/layouts.test.js`, `tests/people.test.js`, `tests/globals.test.js`, `tests/gfields.test.js`) are green at every commit; the browser suite is expected red during Tasks 1 to 3, which are one switch-over, and green from Task 4 on.
- Classic scripts, one global scope: new top-level names unique (`tests/globals.test.js`); every new `G` field declared with a comment in `js/game.js` (`tests/gfields.test.js`).
- New logic takes what it reads as parameters and returns a value; the caller reads `G` (CLAUDE.md).
- Only `LAYOUTS.freighter` is used for now; every hull shares it, as every hull shares one interior today. A per-hull layout is step 5 (#974).
- Desktop only (#937): a window at least 1000 px wide. Reduced motion (`Settings.reduceMotion`) keeps the camera and the flip still. Nothing new drawn under 12 px.
- The four new rooms (`head`, `workshop`, `airlock`, `lifesupport`) get no prose here: a room with no Ship life lines of its own uses a short generic set (owner's call); their lines and routines are step 3 (#973).
- No emojis. Commits end with the session's attribution lines.

**Unit conversion** (a share of the old 1600-unit length to a share of the 880-unit width, the same distance in world units): multiply by `1600 / 880` (about 1.82). So: `0.002` to `0.0036`, `0.003` to `0.0055`, `0.004` to `0.0073`, `0.005` to `0.009`, `0.01` to `0.018`, `0.014` to `0.025`, `0.015` to `0.027`, `0.02` to `0.036`, `0.028` to `0.051`, `0.03` to `0.055`, `0.05` to `0.09`; walking speed `0.06` / `0.09` per second to `0.109` / `0.164`; the walk frame `p.walked * 160` to `p.walked * 88`. Write each as `share * K` with one named constant `CUT_K = 1600 / 880` in `js/shiplife.js`, not as new literals.

## Review Focus

1. **The climb through the tank.** From the plant deck (5) to the drive deck (6) the floors are 372 apart, not 112; the climb must take proportionally longer (the spec's "real errand") and a person mid-climb must be drawn inside the tube, never over the tank.
2. **Someone caught on the ladder** when the straps come (secure/float) or a scene opens: they finish onto a whole deck that exists, and on the drive side of the tank only if they were past its middle.
3. **Two-room decks.** The errand rule ("the two nearest rooms on the post's deck") finds only one room on most decks; it must still find two, from the decks either side.
4. **A window at the 1000 px minimum.** The burn box is about 760 px wide there; the tower (880 units) must fit across it, so the zoom is the smaller of the height fit and the width fit.
5. **The couch phase** with people on two decks (you and the captain on the bridge, the rest in the berths): nobody slides across decks to a couch, and the couches unfold under each person on their own deck.

---

### Task 1: People on the tower

**Files:**
- Modify: `js/shiplife.js` (`ROOMS`, `LADDER`, `SEATS` at 10-27; `couchX` 355; `shipPeople` 332-335; `isAsleep` 160; `routineWait` 391-401; `inBed` 439; `posture` 441-457; `lifeTick` 487-554; `lifeLine` 312-318; every tolerance in shares)
- Modify: `js/rooms.js` (`ROOM_DRAW` 432: a plain room for the four new ids)
- Modify: `js/bridge.js` (`ROOM_SHEETS` 19)
- Modify: `tests/lifeslots.test.js:13`, `tests/dayashore.test.js:13` (load `js/camera.js` and `js/layouts.js` before `js/shiplife.js`)
- Test: `tests/livingship.test.js`, `tests/people.test.js`

**Interfaces:**
- Consumes: `LAYOUTS`, `layoutRooms`, `deckFloor` (`js/layouts.js`).
- Produces (later tasks rely on these):
  - `ROOMS`: `layoutRooms(LAYOUTS.freighter)` each with `w` and `mid` (shares of the width) and `deck` (0 to 6); no `tall`. `LADDER = LAYOUTS.freighter.well.x` (0.5). `SEATS = LAYOUTS.freighter.seats`.
  - `CUT_K = 1600 / 880`.
  - `p.seatDk`: the deck of a person's crash couch (bridge 0 for you and the captain, berths 2 for the rest).
  - `climbRate(lay, dk, dir) -> number`: decks per second at fractional deck `dk` going `dir` (+1 toward the drive): `1.5 * (HULL.deck + HULL.plate) / gap`, `gap` the floor-to-floor distance of the deck pair being climbed (372 between decks 5 and 6, else 112).
  - `LIFE_ANY`: the generic Ship life lines, `{ any: [ ... ] }`, used by `lifeLine` for a room with no entry in `LIFE_LINES`.

Decisions:
- `couchX(i, n)` returns the share as now (you at the bridge's middle, the rest spread across the berths) and `shipPeople` sets `seatDk` and `dk`/`tdk` to the couch's deck. The couch phase (517) eases `p.dk` to `p.seatDk`, not 0; `atCouch` (509) compares `p.dk` with `p.seatDk`.
- `isAsleep` (160): `p.dk === roomAt('berths').deck`, not 0.
- `routineWait` (397): the two other rooms nearest the post by `|deck difference| + |mid difference|`, any deck.
- The ladder (532-534) and the secure/float easing (511-515) step `p.dk` by `climbRate`; secure/float still finishes onto `Math.round(p.dk)`.
- The four new rooms: `ROOM_DRAW` draws them with `roomWalls` only and their name; `ROOM_SHEETS`: `head` and `airlock` to `interior`, `workshop` and `lifesupport` to `eng`; no `HAUNTS` or `SCENE_ROOM_WORDS` entries (step 3).
- `LIFE_ANY.any`, three lines in the house voice (`docs/bible/voice.md`): `'{n} is passing through.'`, `'{n} stops to check something on the wall, and moves on.'`, `'{n} is here for a minute, then gone again.'`

- [ ] **Step 1: Write the failing tests** in `tests/livingship.test.js`
  - `'the rooms are the tower's: seven decks, the well in the middle, the seats from the layout (#972)'`: `ROOMS.map(r => r.id)` equals `layoutRooms(LAYOUTS.freighter).map(r => r.id)`; `roomAt('berths').deck === 2`, `roomAt('engine').deck === 6`; `LADDER === 0.5`; `SEATS.bridge` deepEquals `[0.12, 0.3, 0.7, 0.88]`; no room has `tall`.
  - `'the climb through the tank takes as long as its height (#972)'`: `climbRate(LAYOUTS.freighter, 5.2, 1) * 372 / 112` equals `climbRate(LAYOUTS.freighter, 1.5, 1)` within 1e-9.
  - `'an errand finds two rooms on a deck with one (#972)'`: `routineWait` for a lifesupport post with dice `() => 0` sets an errand whose room is one of the two nearest by the rule above, never `lifesupport`.
  - In `tests/people.test.js:268`, the loop over `ROOMS` ids: every room and role gives a line (the new rooms from `LIFE_ANY`).
  - Update the tests the map lists under Task 1 to the new decks and shares: the posture tests (galley `dk 1`; medbay patient `dk 4`, `x` inside the medbay's share; the ladder case `{ x: LADDER, dk: 1.5, tdk: 2 }`), `'the working poses stand on the deck'` (engineer `dk 6`).
- [ ] **Step 2: Run** `node --test tests/livingship.test.js tests/people.test.js`. Expected: FAIL on the new tests.
- [ ] **Step 3: Implement** the decisions above, rescaling every share literal in `js/shiplife.js` with `CUT_K` per the conversion table.
- [ ] **Step 4: Run** `node --test tests/livingship.test.js tests/people.test.js tests/layouts.test.js tests/globals.test.js tests/gfields.test.js tests/lifeslots.test.js tests/dayashore.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `"Tower, 1: the crew live on the tower's seven decks (#972)"`.

### Task 2: Drawing the tower

**Files:**
- Modify: `js/shiplife.js` (`drawCutaway` 578-721; remove `CUT_TANKS`, `CUT_WALLS`, `CUT_STERN`, `CUT_BELLS`, `cutRect`, `PLUME`'s length share)
- Modify: `js/rooms.js` (`roomEngine` 153-173 to one deck; `roomTanks` and `ROOM_DRAW.tanks` removed; a flat crash couch replaces `roomCouchFold` 77-85)
- Modify: `js/hulldetail.js` (`hullSeams`, `hullFittings`, `HULL_MAST`, `HULL_FINS`, `HULL_TURRET`, `HULL_HATCH` for the tower's sides)
- Modify: `js/figures.js` (`figPose` `couch` lying flat on the back, the head toward the couch's head end)
- Test: `tests/livingship.test.js`

**Interfaces:**
- Consumes: `ROOMS`, `CUT_K`, `p.seatDk` (Task 1); `layoutBox`, `deckFloor`, `towerHeight` (`js/layouts.js`).
- Produces:
  - `towerDeckY(lay, dk) -> number`: world y of a fractional deck `dk`, linear between `deckFloor(lay, floor(dk))` and `deckFloor(lay, ceil(dk))` (so a climber in the tube is drawn inside it).
  - `towerOutline(lay) -> { x0, x1, top, bottom, noseTop, tank: { top, bottom } }`: the skin's box in world units, the nose's cap above the flight deck (60 high), the tank's band.
  - `roomCouchFlat(ctx, x, F, d)`: a couch pad unfolding flat out of the deck by `d` (0 to 1), 60 long.

Decisions:
- The tower is drawn in world units with x from 0 to 880 (shares times `LAYOUTS.freighter.width`), the nose up: the skin (12 thick, `HULL.skin`) round the habitat and the drive deck, the nose's cap with the sensor mast, the tank in cutaway between the plant and drive decks with the water level at `s.fuel` (her reaction mass: the HUD's "Reaction mass"), the well and its ladder full height, the tube through the tank.
- Each room via `drawRoom(ctx, id, layoutBox(lay, id), s)`; names at the box's top left as now; the thrust sign over the galley's right end on the mess deck.
- The drive bell under the drive deck, the plume down from it while burning (its length a share of the tower's height in place of the hull's length).
- The engine room is one deck now: `roomEngine` keeps its core, gauges and pipes inside `top..F` and drops the catwalk and the upper-deck gauges.
- Hull fittings on the tower: the mast on the nose; fins at the drive deck's sides; the turrets on the gun deck's sides (the barrels out); the airlock's outer door on the lock deck's left side, in place of the belly hatches; seams and rivets down both sides.
- People: `y = towerDeckY(lay, p.dk)`; sleepers via `berthBunk` in the berths' box; the cot as now (`inBed`); couches via `roomCouchFlat` at each person's seat on `p.seatDk`; the tether to the nearest room wall on their deck.

- [ ] **Step 1: Write the failing tests**
  - `'a climber is drawn inside the tube through the tank (#972)'`: `towerDeckY(LAYOUTS.freighter, 5.5)` is between `deckFloor(lay, 5)` and `deckFloor(lay, 6)`, and `towerDeckY(lay, 2) === deckFloor(lay, 2)`.
  - `'every room of the tower draws in every phase, with every save restored'`: the existing room loop over `ROOMS` ids (no `'tanks'`), boxes from `layoutBox`.
  - `'on a crash couch a person lies flat on their back (#972)'`: `drawPerson(fakeCtx(), { name: 'couch', face, frame: 0 }, 400, 100, look)` for face 1 and -1 gives `head.y` within 12 of `foot.y` and `head.x < 400`.
- [ ] **Step 2: Run** `node --test tests/livingship.test.js`. Expected: FAIL on those.
- [ ] **Step 3: Implement** the decisions above.
- [ ] **Step 4: Run** the Node tests as in Task 1. Expected: PASS.
- [ ] **Step 5: Commit** `"Tower, 2: the burn view draws the tower, her skin, tank and drive (#972, #961)"`.

### Task 3: The camera on the tower

**Files:**
- Modify: `js/camera.js` (`viewOf`, `camStep`, `floorY` removed, `hullLength` kept for the hull art elsewhere if still read, else removed)
- Modify: `js/shiplife.js` (`drawCutaway` 580-598: the camera, `toScreen`, `seen`)
- Modify: `js/game.js:53-55` (the `G.cam` comment: `{ y, t }`)
- Test: `tests/livingship.test.js`

**Interfaces:**
- Produces:
  - `viewOf(box, lay) -> { zoom, span }`: `zoom = min(box.h / 360, box.w / (lay.width + 80))` (about three decks high, the tower always fitting across); `span = box.h / zoom` (world units of height in view).
  - `camStep(cam, target, dt, span, len)`: unchanged logic, now over y (`len = towerHeight(lay) + 90`, the nose's cap and the bell).
  - `G.cam = { y, t }`.

Decisions: the tower centred across the clear part of the box (a docked dialog's offset `off` moves to x only, as a centring shift); the camera follows `towerDeckY(lay, people[0].dk)`, the hand's deck; the plume shows only when the drive deck is in view. Stars keep swinging with `t.angle` as now.

- [ ] **Step 1: Write the failing tests** (replacing the three camera tests the map lists): `'the zoom fits about three decks and the tower across (#972)'`: for a 1360 by 480 box `viewOf(...).zoom === 480 / 360`; for 760 by 480, `760 / 960`. `'the camera snaps first, then eases, and stays inside the tower'`: `camStep(null, 0, 0, 360, towerHeight(lay) + 90) === 180`; a target past the bottom is held at `towerHeight + 90 - 180`.
- [ ] **Step 2: Run** `node --test tests/livingship.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the Node tests. Expected: PASS.
- [ ] **Step 5: Commit** `"Tower, 3: the camera pans up and down the tower (#972)"`.

### Task 4: The outline, taps and the Interior page

**Files:**
- Modify: `js/camera.js` (`outlineLayout`, `outlineRoomAt`, `drawOutline`)
- Modify: `js/shiplife.js` (710-720: `G.cutRooms`, `G.cutRack`, `G.cutOutline`, the outline's dots)
- Modify: `js/bridge.js` (`deckSvg` 151-183)
- Modify: `js/game.js:53-55` (the `G.cutOutline` comment)
- Test: `tests/livingship.test.js`, `tests/burnview.test.js`

**Interfaces:**
- Produces:
  - `outlineLayout(box, lay) -> { x, y, w, h, rooms: [{ id, x, y, w, h }] }`: a tall strip in the box's top left, `h = min(170, box.h - 16)`, `w = h * (lay.width + 120) / (towerHeight(lay) + 150)`, each room at its `layoutBox` scaled.
  - `outlineRoomAt(outline, x, y)`: the plain box test (no squeeze: the ship no longer turns on screen).
  - `drawOutline(ctx, outline, dots, camY, span, lay)`: dots `{ x, dk }` placed by `towerDeckY`; the view's frame across the full width from `camY - span / 2` to `camY + span / 2`.
  - `deckSvg`: the tower, nose up, each deck a row of its rooms, the tank as a band, the ladder down the middle, tokens in their rooms as now; the svg 640 wide and as tall as the tower needs.

- [ ] **Step 1: Write the failing tests**: `'the outline is the tower: every room, and a tap finds it (#972)'`: `outlineLayout({ x: 0, y: 0, w: 1360, h: 480 }, lay).rooms.length === ROOMS.length`, and `outlineRoomAt` at each room's centre returns its id. Rewrite the browser tests the map lists under Tasks 1 to 4 (section 4 of the map) to the tower: `inRoom` by `p.dk === r.deck` with the share bounds as now; literal positions converted by deck (old deck 0 rooms: berths 2, galley 1, gunnery 3, bridge 0; old deck 1: engine 6, hold 6, medbay 4) and by `CUT_K` for distances; `'the camera goes with the hand'` asserting `G.cam.y` near the galley's floor; `SEATS_EXPECTED.bridge` to `[0.12, 0.3]`; the tap tests' "free point" taken outside the tower's skin at the box's left edge.
- [ ] **Step 2: Run** `CHROMIUM_PATH=/opt/pw-browsers/chromium_headless_shell-1243/chrome-headless-shell-linux64/chrome-headless-shell npm test`. Expected: FAIL only on what this task fixes.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npm test` and `npm run test:editor`. Expected: all PASS (the switch-over is complete).
- [ ] **Step 5: Commit** `"Tower, 4: the outline, taps and the Interior page on the tower (#972)"`.

### Task 5: Check it in the game, and the PR

**Files:** none unless the check finds something.

- [ ] **Step 1:** Screenshots at 1600 by 900 and at 1000 by 700: cruise at breakfast and in a shift, the hard burn on the couches, the flip, night in the berths, someone climbing to the engine room through the tank, a scene in the galley. Compare with the spec; fix anything that reads wrong with a test first.
- [ ] **Step 2:** `npm test`, `npm run test:editor`, `npm run coverage -- --check` (the floor names files this touches). Expected: all pass.
- [ ] **Step 3:** Push, open the PR (closes #972 and #961; screenshots on a page linked from it, as for #981).
