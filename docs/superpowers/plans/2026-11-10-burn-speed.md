# The Burn at Its Own Pace Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A burn takes `days × SHIP_DAY` real seconds at 1x, the flip plays in slow motion for 25 real seconds, and the player can pause or run the burn at 4x or 16x.

**Architecture:** A new classic script, `js/burnspeed.js`, holds the pure timing: the stages in ship time, the burn's rate, the clock's real time left and the old pacing figures. `js/transit.js` and `js/shiplife.js` read their time through it; the ship-side ticks that run on frame time (wear, heat, projects, programs, the drive's fuel) are scaled back to today's per-trip amounts with the burn's `pace`. The controls are keys in `js/game.js` and a small DOM button group, `#bspeed`.

**Tech Stack:** Vanilla JS classic scripts, canvas, `node:test`, Playwright (`tests/helpers.js`), `tests/nodecontext.js` for the pure module.

**Spec:** `docs/superpowers/specs/2026-11-10-burn-speed-design.md`

## Global Constraints

- One ship day is `SHIP_DAY` (80) burn seconds; `transitSeconds(days) = days * SHIP_DAY`.
- Speeds: `0` (paused), `1`, `4`, `16`. A new burn starts at `1`.
- `COUCH_HOURS = 6`, `STRAP_MIN = 20`, `FLOAT_MIN = 6`, `FLIP_REAL = 25` (real seconds for the whole flip window at any speed).
- A span that would pass today's share is clamped to it: couch 0.06, the flip window's half-width 0.06, the float's half-width 0.03.
- Days, pay, fuel, the drive's effect (`burnSpeed()`), the scene count per burn and every per-trip amount of wear, heat, project and program progress are unchanged.
- Keys in a burn only (`G.mode === 'transit'`): Space toggles pause, Digit1/2/3 pick 1x/4x/16x.
- The chosen speed lives on `G` (declared with a comment in the literal in `js/game.js`), not in the save.
- No emojis. Desktop only (#937): no phone or touch layout work. Classic scripts; every new top-level name unique (`tests/globals.test.js`); the new script linked in `index.html` after `js/shiplife.js`.

## Review Focus

1. A scene opening while at 16x: time stops for it, and the burn resumes at 16x after (not 1x, not paused).
2. Pausing during the flip: the slow motion stops too; resuming continues the flip at its slow rate.
3. Picking 4x or 16x while the flip plays: the flip still takes 25 s; the chosen speed applies after it.
4. A hot or cool drive (`burnSpeed()` not 1): the flip still lasts 25 real seconds, and the clock's time left still matches.
5. Pause with a screen open (Gunnery, Engine): the screen stays usable and nothing in it advances (heat, projects).

---

### Task 1: The pure timing module

**Files:**
- Create: `js/burnspeed.js`
- Modify: `index.html` (link `js/burnspeed.js` after `js/shiplife.js`)
- Test: `tests/burnspeed.test.js` (Node, through `tests/nodecontext.js`)

**Interfaces:**
- Produces (all pure, no `G`):
  - `BURN_SPEEDS = [0, 1, 4, 16]`, `COUCH_HOURS`, `STRAP_MIN`, `FLOAT_MIN`, `FLIP_REAL`.
  - `burnStages(days) -> { couch, secure, float }`: progress spans. `couch` is the share at each end; `secure` and `float` are half-widths around 0.5 (`secure` is the whole flip window's half-width, strap and float together).
  - `stageAt(days, pr) -> 'couch' | 'secure' | 'float' | 'move'`.
  - `burnRate(t, speed, drive) -> number`: burn seconds per real second. `t` needs `total`, `left`, `days`. 0 when `speed` is 0; inside the flip window (`|pr - 0.5| < secure`) `2 * secure * t.total / (FLIP_REAL * drive)`; otherwise `speed`.
  - `realLeft(t, speed, drive) -> number`: real seconds to arrival at `speed` (1 when `speed` is 0), the part of the flip window still ahead counted at its slow rate.
  - `oldBurnSeconds(days) -> number`: today's length, `Math.max(60, lifeSlotCount(days) * 30)`.
  - `burnSceneCount(days) -> number`: `1 + Math.floor(oldBurnSeconds(days) / 40)`.

- [ ] **Step 1: Write the failing tests** in `tests/burnspeed.test.js`, loading `js/burnspeed.js` with globals `{ SHIP_DAY: 80, lifeSlotCount: d => Math.max(2, Math.min(5, Math.round(d / 2))) }`:
  - `burnStages(11)`: `couch` is `6 / (24 * 11)`, `float` is `3 / (1440 * 11)`, `secure` is `23 / (1440 * 11)`.
  - `burnStages(1)`: each clamped (0.06, 0.06, 0.03).
  - `stageAt(11, p)`: `couch` at 0.01 and 0.99, `move` at 0.3 and 0.7, `secure` at `0.5 - 15 / (1440 * 11)`, `float` at 0.5.
  - `burnRate`: speed 0 gives 0; at pr 0.3 gives the speed for 1, 4 and 16; at pr 0.5 gives the same value for 1, 4 and 16.
  - The flip lasts `FLIP_REAL`: for days 5 and 37 and drive 0.8, 1 and 1.25, `2 * secure * total / (burnRate * drive)` is 25 within 1e-9, with `total = days * 80`.
  - `realLeft`: at pr 0 with speed 1 and drive 1 it is `total - 2 * secure * total + 25`; at speed 4 the outside part is a quarter; at pr 0.7 the flip is not counted.
  - `burnSceneCount(5)`, `(11)`, `(37)` are 3, 4, 4 (today's `1 + floor(total / 40)`: totals 90, 150, 150).
- [ ] **Step 2: Run** `node --test tests/burnspeed.test.js`. Expected: FAIL (file not found).
- [ ] **Step 3: Implement** `js/burnspeed.js` with the interfaces above and a header comment pointing at the spec. Link it in `index.html` after `js/shiplife.js`.
- [ ] **Step 4: Run** `node --test tests/burnspeed.test.js tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Burn speed: the stages in ship time and the burn's rate (#992)`.

### Task 2: The burn runs on the new length and rate

**Files:**
- Modify: `js/transit.js` (`transitSeconds`, `enterTransit`, `updateTransit`, `drawBurnBar`)
- Modify: `js/shiplife.js` (`phase`, the `'frame'` handler for `lifeTick`)
- Modify: `js/game.js` (declare `speed` in the `G` literal)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: Task 1's `burnRate`, `stageAt`, `realLeft`, `oldBurnSeconds`, `burnSceneCount`.
- Produces:
  - `G.speed`: one of `BURN_SPEEDS`; set to 1 by `enterTransit`.
  - `t.pace`: `oldBurnSeconds(t.days) / t.total`, set by `enterTransit`.
  - `burnDt(dt) -> number` in `js/burnspeed.js`: `dt * burnRate(G.transit, G.speed, burnSpeed())`, or 0 with no transit, with `t.event` or with `G.dialog`.
  - `paceDt(dt) -> number` in `js/burnspeed.js`: `burnDt(dt) * G.transit.pace` (0 with no transit).

- [ ] **Step 1: Write the failing tests** in `tests/burnview.test.js` (with its `burn()` helper):
  - `transitSeconds(11)` is 880; after `burn()`, `G.speed` is 1, `G.transit.pace` is `oldBurnSeconds(t.days) / t.total` and `G.transit.times.length` is `burnSceneCount(t.days)`.
  - Ticking `updateTransit(1)` at pr 0.3: `left` falls by `burnSpeed()` and `elapsed` rises by 1 at speed 1; by 4 times that at speed 4; not at all at speed 0.
  - At speed 16, ticking from `pr = 0.5 - secure` until `pr > 0.5 + secure` in steps of 1/30 takes 25 s within 0.1.
  - `phase()` reads `stageAt`: `secure` at `0.5 - 15 / (1440 * days)`, `couch` at 0.01.
  - Paused, ship life stands still: a walker's `x` is unchanged after 60 frames of the frame handler.
  - A scene stops time at 16x and the speed is still 16 after it closes.
- [ ] **Step 2: Run** `npm run test:changed`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - `transitSeconds(days)` returns `days * SHIP_DAY`.
  - `enterTransit` sets `G.speed = 1` and `t.pace`, and makes the happenings count `burnSceneCount(days)` (plus the walk-through one, as now).
  - `updateTransit(dt)` computes `const r = burnRate(t, G.speed, burnSpeed())` once. With `t.event` it returns as now. Otherwise `left -= dt * r * burnSpeed()`, `elapsed += dt * r`, and `t.chatter -= dt * r`. The stars move by `dt * Math.min(r, 16)` (still when paused). The ship's turn (`t.angle`) uses real `dt` unless the speed is 0.
  - `phase()` returns `stageAt(t.days, pr)`.
  - The `lifeTick` frame handler passes `burnDt(dt)` in transit; tests that call `lifeTick` directly are unchanged.
  - `drawBurnBar`'s clock uses `realLeft(t, G.speed, burnSpeed())` and puts `paused`, `4x`, `16x` or `flip` after it (nothing at 1x); `t.event` still reads `(paused)`.
- [ ] **Step 4: Fix the existing tests that set a stage by the old shares** (for example `t.left = t.total * 0.55` for `secure`): set them by `burnStages(t.days)`. Run `npm run test:changed`. Expected: PASS.
- [ ] **Step 5: Commit** `The burn at one cutaway day per ship day, the flip in slow motion (#992)`.

### Task 3: The ship's per-trip amounts stay as they were

**Files:**
- Modify: `js/engineering.js` (`engineeringTick`, the `fuelOwed` line), `js/wear.js` (`wearTick`), `js/projects.js` (`projectsTick`), `js/programs.js` (`programsTick`)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: Task 2's `paceDt(dt)` and `burnDt(dt)`.

- [ ] **Step 1: Write the failing test** `a burn wears the drive, heats it and runs a project as much as before, at any speed (#992)`. For an 11-day burn at speeds 1 and 16, run the frame handlers to arrival in steps of 1/30. Assert, against `oldBurnSeconds(11) / burnSpeed()` seconds of today's rates:
  - the drive's wear and `fuelOwed` match within 2%;
  - a project started at departure with `left = 100` has `oldBurnSeconds(11) / burnSpeed()` taken off it, within 2%;
  - with `G.speed = 0` for 60 frames, nothing changes.
- [ ] **Step 2: Run** `npm run test:changed`. Expected: FAIL (wear about 5.9 times today's).
- [ ] **Step 3: Implement.** In each tick, replace its use of `dt` with `paceDt(dt)`. In the `fuelOwed` line, replace `dt * burnSpeed() / t.total` with `burnDt(dt) * burnSpeed() / t.total`. The early returns (`!dt || G.mode !== 'transit' || t.event || G.dialog`) stay.
- [ ] **Step 4: Run** `npm run test:changed`. Expected: PASS.
- [ ] **Step 5: Commit** `Wear, heat, projects and programs keep their per-trip amounts on the longer burn (#992)`.

### Task 4: The controls

**Files:**
- Modify: `js/game.js` (the `keydown` handler), `index.html` (`<div id="bspeed">` beside `#bkeys`), `style.css` (`#bspeed`), `js/burnspeed.js` (`setBurnSpeed`, `syncBurnSpeed`, the module's `Mods.register`), `js/menu.js` (`controls()`)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Produces: `setBurnSpeed(s)`, which sets `G.speed` to one of `BURN_SPEEDS`; `toggleBurnPause()` (0 to the last speed, or to 0), with the last speed kept as `G.speedBefore` (declared in `js/game.js`); `syncBurnSpeed()`, which shows `#bspeed` only when the burn's key bar shows (the same condition as `syncBridge`'s `show`), lights the button for `G.speed`, and places the group at the burn bar's right end, under it.

- [ ] **Step 1: Write the failing tests:**
  - In a burn, pressing Space makes `G.speed` 0 and pressing it again makes it 1. Digit2 gives 4, Digit3 gives 16 and Digit1 gives 1.
  - Clicking `#bspeed [data-speed="16"]` sets 16 and lights it (`.active`); exactly one button is lit.
  - Paused, `G.bridgeOpen = 'weapons'; syncBridge(true)` shows the sheet, and heat does not change over 60 frames.
  - Out of a burn (landed), Space and the digits do not change `G.speed`, and `#bspeed` is hidden.
  - The controls page lists `Space`, `1 / 2 / 3`.
- [ ] **Step 2: Run** `npm run test:changed`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The keys go in the `G.mode === 'transit'` branch of the `keydown` handler, with `preventDefault` on Space.
  - Four buttons in `#bspeed`, labelled `Pause`, `1x`, `4x` and `16x`, with `data-speed` 0, 1, 4 and 16. A click calls `setBurnSpeed`.
  - `syncBurnSpeed` runs from the module's `'frame'` handler. The styling follows `#bkeys button`.
  - In `controls()`, a `Burns` section with `Space: pause or resume the burn` and `1 / 2 / 3: normal, 4x, 16x`.
- [ ] **Step 4: Run** `npm run test:changed`. Expected: PASS.
- [ ] **Step 5: Commit** `Pause and fast-forward a burn: Space, 1, 2, 3 and the buttons by the burn bar (#992)`.

### Task 5: Whole-suite verification

- [ ] **Step 1:** Run `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. Expected: all pass. A pin (`tests/*pin.test.js`) that changed only because chatter or rumor draws moved against the scenes is rewritten with `npm run pin:from`, and the commit says why. A scene played or missed is a bug to fix, not to re-pin.
- [ ] **Step 2:** Run `npm run test:editor`. Expected: all pass.
- [ ] **Step 3:** Run `npm run soak`. Expected: days, pay and the fight targets within their stated tolerances.
- [ ] **Step 4:** Take a screenshot of the burn bar with the speed buttons at 1280x800, at 16x and during the flip, for the PR.
- [ ] **Step 5:** Add a `ROADMAP.md` entry (done, #992, the files), then commit and push.
