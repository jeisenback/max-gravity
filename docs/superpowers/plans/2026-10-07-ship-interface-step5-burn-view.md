# The Ship Is the Interface, Step 5: The Burn View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the cutaway the screen in a burn. Tapping a room opens that room's console as a sheet over it, the canvas blocks around it stop overlapping and are readable at 1280x800, 768x1024 and 390x844, and the people in it show faces. The station key bar stays until cutover (step 6), so the burn view is never without a keyboard path.

**Architecture:** Three small additions around code that already works. `drawCutaway` records each room's screen box next to the person hits it records today (`G.cutRooms` beside `G.cutHits`). A tap on a room does what pressing its station key does (`G.bridgeOpen = id`), through one table, `ROOM_SHEETS`. The burn view's canvas blocks are recorded as drawn (`G.burnBoxes`), so a test can check them for overlap at the three sizes. Faces are cached portrait images drawn in place of the stick figures. No sheet is drawn on the canvas; sheets stay DOM (`#bsheet`).

**Tech Stack:** Vanilla JS classic scripts in one global scope, no build step. Tests are Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-05-ship-interface-design.md`, "Build order", step 5, and "Risks". Steps 1 to 4 are in `main`. Issue: #323. Related: #262 (the rest of the transit overlaps), #297 (faces on the deck plan), #265 (the canvas text size, deferred here by step 2).

## Where the code stands

- **The burn view** is one full-window canvas (`drawTransit`, `js/transit.js`) with DOM on top: the event dialog (`#panel.event`), the station key bar and sheet (`#bkeys`, `#bsheet`, `js/bridge.js`), the downtime button (`#tlife`) and the System map button (`#tmap`). Everything is placed each frame from `G.W`, `G.H` and `G.hudW`; there is no separate resize code.
- **The cutaway** is `drawCutaway(cx, cy, maxL)` (`js/shiplife.js`). `ROOMS` has seven rooms (engine, hold, medbay below; berths, galley, gunnery, bridge above), each with `x0` and `x1` as fractions of the hull's length. It already records `G.cutHits` (a point per person), and `transit.js` maps those to screen pixels. The canvas click handler (`js/game.js`) takes the nearest person within 14px (24px on touch) and opens their page. Nothing records a room's box, so no room can be tapped.
- **The hull turns end over end** at the midpoint of a burn. Hull fractions map to x through `turn`, so `x0` and `x1` swap, and mid-turn (`|turn| < 0.05`) the cutaway draws no people.
- **The sheets** are built by burn-safe panel functions (`navigationPanel`, `weaponsPanel`, `engineerPanel`, `interiorPanel`, `commsPanel`, `operationsPanel`, `characterPanel`). The shell's page registry (`UI.views`, `SHELL_PAGES`) is not burn-safe: its views read `UI.planet`, which is stale or null in a burn.
- **#262** is fixed for the event dialog (the Comms box clears `#panel.event`). Still open: the route plate, Comms, the burn instruments, the ship's log and the cutaway are placed by constants, and the canvas text is 9 to 12px.
- **#297** is done for the SVG deck plan (`deckSvg`, #369). The canvas cutaway still draws stick figures.

## Global Constraints

- No framework, no bundler, no build step.
- Classic scripts share one global scope: every new top-level name must be unique (`tests/globals.test.js` enforces it). New names: `ROOM_SHEETS`, `roomSheet`, `faceImage`.
- The station key bar, `#bsheet` and every `data-bst` key keep working unchanged; `tests/stations.test.js` and `tests/downtime.test.js` must pass without edits.
- The old screens and the full build are untouched except where a task says so.
- Canvas text is 12px or more after Task 1.
- No emojis anywhere (code, text, docs, commits).
- Heartbeat: read `.claude/heartbeat.json` before editing, update it at each step, never commit it (CLAUDE.md).
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`. One file: replace `npm test` with `node --test tests/burnview.test.js`. `SHELL_TESTS=on npm test` is a report, as before.

## Decisions

- **A tap finds a room by a box the drawing records.** `drawCutaway` pushes `{ id, x0, x1, y0, y1 }` per room into `G.cutRooms` (local coordinates, with `x0 < x1` after the flip, as the fuel-tank code already does), and `transit.js` maps them to screen pixels exactly as it maps `G.cutHits`. The click handler tries a person first (as today), then a room. There is no per-pixel test and no per-frame cost beyond seven rectangles.
- **Sheets are DOM over the canvas, not drawn in it.** The panels already exist as DOM with text, buttons and focus; drawing them on the canvas would lose all three. A room opens the sheet its station key opens, through `ROOM_SHEETS`: bridge to `nav`, gunnery to `weapons`, engine to `eng`, berths and medbay to `interior`, galley to `interior`, hold to `ops`. The shell's page registry is not used in a burn: its views depend on the landed port, and the burn panels are already the burn's registry. The spec's "same registry" is met by one table that both the key bar and the rooms read.
- **A scene or contact leaves the view as it is.** While `G.dialog` or `t.event` is set, the sheet and key bar are hidden (`syncBridge` does this today), the timer is paused, and a tap on a room does nothing. The dialog sits over the cutaway as now. No change.
- **The key bar stays until cutover.** It is the keyboard and screen-reader way into the sheets (the cutaway is a canvas), and the fallback if the rooms do not work out. Step 6 decides whether it goes.
- **The canvas blocks' layout is pinned by a test, not a function.** `drawTransit` records where each block was drawn (`G.burnBoxes`), and a test checks they do not overlap at the three sizes; they already did not, so nothing was restructured. The canvas text floor is 12px.
- **Faces are cached images.** `faceImage(person)` builds an `Image` from the person's `portraitSvg` as a data URL, once per person and mood, and the cutaway draws it in a circle where the head is; until the image has loaded, the stick figure is drawn. Task 4 can be dropped without affecting the others.
- **The cost cut-off.** If Task 2's tap sweep (a tap at the centre of every room, on all five ships, at 1280x800 and 390x844, and a sweep through the turn) cannot be made to land on the right room, or a room's box on the phone is under 36px in either direction for more than two rooms, the rooms are not tappable, Tasks 3 and 4 are dropped, the key bar is kept, and Task 1 and the plan's close-out still ship. That is the evidence named in the spec's Risks.
- **Out of scope.** Restyling the cutaway art, new rooms, moving the HUD, the pilot's flight screen, and the old screens' layout.

---

### Task 1: Pin the canvas blocks' layout, and a 12px text floor (#262, #265)

Built as: the blocks (route plate, burn instruments, Comms, ship's log, cutaway) already did not overlap at the three sizes, so no `burnLayout` function was written; `drawTransit` records each block's box in `G.burnBoxes` and a test checks them. The 9 to 11px canvas text (plate, FLIP label, burn panel, room labels, people's names) went to 12px.

**Files:**
- Modify: `js/transit.js`, `js/shiplife.js`, `js/burnpanel.js`
- Test: `tests/burnview.test.js`

- [x] **Step 1: Write the tests.** `'the burn view's blocks do not overlap, at the three screen sizes (#262)'` (every pair of boxes in `G.burnBoxes` is disjoint and inside the view, at 1280x800, 768x1024 and 390x844) and `'canvas text in the burn view is 12px or more (#265)'` (a spy on the context's `font` setter sees no size under 12).
- [x] **Step 2: Run them.** The overlap test passed already; the text test failed on 8 to 11px.
- [x] **Step 3: Fix.** The text to 12px; the names' rows 14px apart; the downtime button 8px lower to clear them.
- [x] **Step 4: Run and commit.**

```bash
git add js/transit.js js/shiplife.js js/burnpanel.js tests/burnview.test.js
git commit -m "Record the burn view's blocks, and keep canvas text at 12px (#323, #262, #265)"
```

### Task 2: The cutaway records its rooms

**Files:**
- Modify: `js/shiplife.js`, `js/transit.js`
- Test: `tests/burnview.test.js`

**Interfaces:**
- Produces: `G.cutRooms` as `[{ id, x, y, w, h }]` in screen pixels, refilled by every `drawCutaway` and mapped in `drawTransit` the way `G.cutHits` is. Empty mid-turn.

- [ ] **Step 1: Write the failing tests.**
  - `'every room has a box that is inside the window, and the boxes do not overlap'`: five ships, five hull turns, as the `G.cutHits` test does.
  - `'a tap at the centre of each room finds that room'` (the sweep in the cost cut-off): for each ship, at 1280x800 and 390x844, each room's centre maps to its own id through a pure `roomAtPoint(x, y)`; a point in the gap between rooms finds none.
  - `'the boxes are empty mid-turn'`.
  - `'on a phone, a room's box is at least 36px each way'` (the cut-off check; failing it is the evidence to stop).
- [ ] **Step 2: Run them to see them fail.** Expected: FAIL (`G.cutRooms` is undefined).
- [ ] **Step 3: Implement.** In `drawCutaway`, push each room's local box with the flip applied (`min` and `max` of `X(r.x0)` and `X(r.x1)`, the deck's y-band for the rows); in `drawTransit`, map them as `cutHits` is mapped. Add `roomAtPoint(x, y)` beside `roomAt` in `js/shiplife.js`.
- [ ] **Step 4: Decide.** If the phone-size test fails for more than two rooms, stop here: record the numbers in the issue and take the cost cut-off above.
- [ ] **Step 5: Run and commit.**

```bash
git add js/shiplife.js js/transit.js tests/burnview.test.js
git commit -m "Record each room's box in the cutaway, so a tap can find a room (#323)"
```

### Task 3: A tap on a room opens its sheet

**Files:**
- Modify: `js/bridge.js`, `js/game.js`
- Test: `tests/burnview.test.js`, `tests/downtime.test.js` (read only, must still pass)

**Interfaces:**
- Produces: `ROOM_SHEETS` (room id to sheet id) in `js/bridge.js`; `roomSheet(id)` returns the sheet id or `undefined`.

- [ ] **Step 1: Write the failing tests.**
  - `'a tap on a room opens its console as a sheet'`: tap the centre of each room on screen; `G.bridgeOpen` is the room's sheet and `#bsheet` is visible; the same key in `#bkeys` closes it.
  - `'a tap on a person still opens the person, before the room under them'`.
  - `'a tap does nothing while a scene is open'`.
  - `'every room has a sheet, and every sheet is a station'`: pins `ROOM_SHEETS` against `ROOMS` and the stations list.
- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement.** In the canvas click handler (`js/game.js`), after the person test and under the same guard (a burn, no event open), take the room under the point and set `G.bridgeOpen` to its sheet (a second tap on the same room closes it, as the key does); `syncBridge` does the rest.
- [ ] **Step 4: Run and commit.**

```bash
git add js/bridge.js js/game.js tests/burnview.test.js
git commit -m "Tap a room in the cutaway to open its console (#323)"
```

### Task 4: Faces in the cutaway (#297, can be dropped)

**Files:**
- Modify: `js/shiplife.js`
- Test: `tests/burnview.test.js`

**Interfaces:**
- Produces: `faceImage(person): HTMLImageElement | null`; `null` until the image has loaded.

- [ ] **Step 1: Write the failing test.** `'a person in the cutaway is drawn with a face once it has loaded, and as a figure before'`: with a spy on `drawImage`, the first draw uses none and a later draw (after the image's `load`) uses one per person; a name in a hostile string draws no markup (the data URL is built from `portraitSvg`, which already escapes).
- [ ] **Step 2: Implement.** A cache keyed by person id and mood; draw the image clipped to a circle at the head position; keep the figure's body and the name label.
- [ ] **Step 3: Run the full suite and commit.**

```bash
git add js/shiplife.js tests/burnview.test.js
git commit -m "Show faces on the cutaway's people (#323, #297)"
```

### Task 5: Close out

**Files:**
- Modify: `README.md`, `ROADMAP.md`

- [ ] **Step 1:** README: note that a room in the burn view opens its console. ROADMAP: mark step 5 done (or, if the cut-off was taken, say so and why) and say what step 6 has left to decide about the key bar.
- [ ] **Step 2: Run the full suite both ways.** Expected: `npm test` PASSES; the `SHELL_TESTS=on` failures are no higher than the 36 now.
- [ ] **Step 3:** Comment on #262 and #297 with what was done; close #262 if the three-size check passes; close #297 if Task 4 shipped.
- [ ] **Step 4: Commit.**

```bash
git add README.md ROADMAP.md
git commit -m "Record step 5 of the ship interface (#323)"
```

---

## Self-Review

- **Spec coverage (step 5):** the cutaway as the burn screen with people in it (it already is; Tasks 2 and 3 make it the way in); a tap on a room opens a sheet from the same table the key bar reads (Task 3); #262's remaining overlaps and the canvas text size (Task 1); faces (Task 4); the cost cut-off with named evidence (Decisions, Task 2). Not here by design: the key bar's removal (step 6), restyling the art, and the pilot's flight screen.
- **Decisions made:** hit-testing against recorded boxes; DOM sheets; the burn panels (not the shell's landed views) as the burn's registry; the dialog case unchanged; the key bar kept; one layout function; cached face images; the cut-off test.
- **Type consistency:** `G.burnBoxes`, `G.cutRooms`, `roomAtPoint`, `ROOM_SHEETS`, `roomSheet` and `faceImage` are used with the same names and shapes in every task.
- **Known risks:** the flip swaps `x0` and `x1` and the cutaway draws no people mid-turn (Task 2's turn sweep pins both); room boxes on a phone may be too small (the 36px check is the evidence); a face image loads late or fails, and the figure must remain the fallback (Task 4); the click handler sits in `js/game.js` with the person test, so the order of the two is pinned by a test.
- **Proportion:** the plan holds signatures, test names, assertions and values, not bodies.
