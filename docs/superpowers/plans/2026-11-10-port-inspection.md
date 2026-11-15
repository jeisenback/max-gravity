# Port Inspections Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ports owned by the Compact, the Concord and the League inspect a ship on arrival. A scene names the cause (bad standing, or a licensed good without a licence) and a fitting sum, and the hand gets one move. The two cause-less mid-burn patrol stops go.

**Architecture:** A new classic script, `js/inspection.js`. It holds the licensed goods, pure rules (`standingFine`, `licenceDuty`, `inspectionCause`), the scene (`inspectionScene`) and a `landed` hook that opens the scene first or adds a note line. The hostile-navy branch of `planIntercept` (`js/engage.js`), the hand's heave-to choice, and the `cutter` ladder step (`js/fightladder.js`) are removed.

**Tech Stack:** Vanilla JS classic scripts, `node:test`, Playwright (`tests/helpers.js`), `tests/nodecontext.js`.

**Spec:** `docs/superpowers/specs/2026-11-10-port-inspection-design.md`

## Global Constraints

- Inspecting owners: `'Arcology Compact'`, `'Dome Concord'`, `'Charter League'`. Independent and pirate ports do not inspect.
- `LICENSED = { 'Arcology Compact': 'medical', 'Dome Concord': 'water', 'Charter League': 'industrial' }`.
- Duty: 15% of tons x `COMMODITIES` base, rounded to the nearest 100 cr.
- Standing fine: 0 above -15; 6,000 plus 2,000 for each full 5 points below -15; capped at 14,000.
- Both causes make one sum. Marked raises the sum by a fifth (rounded to 100). A success halves it (rounded to 100).
- The sum leaves the ship's purse (`moveMoney`), never the hand's savings. Each charge adds `recordHand('fines')`.
- A clean ship at an inspecting port gets the note line `Customs logs the ship through.` and no scene.
- The scene's words are `scene:inspection` in `js/hiredscenes.js`. They are written to `docs/bible/voice.md`, with no emojis.
- New logic takes the state it reads and returns a value. The scene and the hook read `G`. Desktop only (#937).

## Review Focus

1. A landing where another scene opened first (the co-op offer, a happening): the inspection still comes first, and the other scene follows it.
2. A hand with no captain (chapter two, the co-op): the scene still plays, the co-op's fund pays, and no captain's regard moves.
3. A sum larger than the purse: it takes what is there, never below 0 (`Math.min(purse(), sum)`).
4. A save whose ladder has `cutter` done or pending: the ladder skips it with no error, and the next step comes due as before.
5. Landing at an inspecting port in the parked owner game: the scene plays with the owner as payer (no `hired()` fork in the rules).

---

### Task 1: The rules

**Files:**
- Create: `js/inspection.js`
- Modify: `index.html` (after `js/ties.js`), `editor.js` (its script list, after `'js/ties.js'`)
- Test: `tests/inspection.test.js` (Node)

**Interfaces:**
- Produces:
  - `LICENSED`, `INSPECTING = Object.keys(LICENSED)`.
  - `standingFine(rep) -> number`.
  - `licenceDuty(good, tons) -> number`.
  - `inspectionCause(cargo, gov, rep, marked) -> null | { gov, standing: number|null, good: string|null, tons, duty, fine, sum }`. `cargo` is `st.cargo` (`{ id: tons }`). It returns null for a gov not in `INSPECTING`, or when duty and fine are both 0.

- [ ] **Step 1: Write the failing tests.** Load `['js/data.js', 'js/inspection.js']` with `{ Mods: { register() {}, filter: (n, v) => v } }`. Assert:
  - `standingFine`: -14 gives 0, -15 6000, -19 6000, -20 8000, -34 12000, -35 14000, -60 14000.
  - `licenceDuty('water', 100)` is 12000 (0.15 x 100 x 800). `licenceDuty('medical', 10)` is 4500.
  - `inspectionCause({ water: 50 }, 'Independent', -40, false)` is null. `inspectionCause({ food: 10 }, 'Charter League', 0, false)` is null.
  - `inspectionCause({ water: 50 }, 'Dome Concord', 0, false)` gives `{ good: 'water', tons: 50, duty: 6000, fine: 0, sum: 6000, standing: null }`.
  - `inspectionCause({}, 'Charter League', -22, false)` gives `fine: 8000, sum: 8000, good: null, standing: -22`.
  - Both causes: `inspectionCause({ industrial: 20 }, 'Charter League', -15, false).sum` is 6000 + 6000 = 12000.
  - Marked: the same with `marked` true gives `sum: 14400`.
- [ ] **Step 2: Run** `node --test tests/inspection.test.js`. Expected: FAIL (no file).
- [ ] **Step 3: Implement** the interfaces above in `js/inspection.js`, with a header comment pointing at the spec. Link the script in `index.html` and `editor.js`.
- [ ] **Step 4: Run** `node --test tests/inspection.test.js tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Port inspections: the licensed goods and what a cause costs (#993)`.

### Task 2: The scene and the landing

**Files:**
- Modify: `js/inspection.js` (`inspectionScene`, `Mods.register` with a `landed` hook), `js/hiredscenes.js` (the `scene:inspection` index entry and lines)
- Test: `tests/inspection.test.js` (browser tests appended), `tests/hiredscenes.test.js` or the scene-index tests that list every scene (add the new id where they count)

**Interfaces:**
- Consumes: Task 1's `inspectionCause`.
- Produces:
  - `inspectionScene(cause, planet) -> event`, with title, `via: 'ship'` and choices.
  - `inspectAtLanding(planet)`, the `landed` hook body. It is exported for tests.

- [ ] **Step 1: Write the failing browser tests** (`open({ scope: 'earth-hired' })`, a hired game landed with `uatLand`):
  - At Mars (a Concord port) with `st.cargo.water = 50`, standing 0 and a Comms hand, `inspectAtLanding(currentPlanet())` opens a dialog whose text names Water, 50t and `6,000`. Its choices are, in order, the Comms move (label containing `papers`) and the keep-out choice.
  - With a gunner hand, the move is the speak-up choice instead.
  - Rolls forced with `Math.random = () => 0.01`: the move charges 3,000 from `purse()`, and the captain's opinion is unchanged. With `() => 0.99`: it charges 6,000, the captain's opinion is down 1, and the hand's record count of `fines` (`js/traits.js`) is up 1. Keep-out charges 6,000 with no opinion change.
  - The hand's savings never change: with the fund held (`fundHeld()`), `G.state.credits` is unchanged.
  - Review Focus 3: a purse of 1,000 against a sum of 6,000 leaves the purse at 0.
  - A clean ship at a League port (`uatLand('Ceres Station')`, empty hold, standing 0) opens no dialog, and `UI.notes` contains `Customs logs the ship through.` An independent port shows neither.
  - Review Focus 1: open another event first (`openEvent({ title: 'Other', ... })`). Then the inspection's landing makes the inspection the open dialog, and finishing it opens `Other`.
  - Review Focus 2: the same scene with no captain (chapter two's start, `chapterTwo` helpers as in `tests/chaptertwostart.test.js`) charges the co-op's purse and has no regard line.
  - Review Focus 5: in the parked owner game (`open({ scope: 'full' })`, an owner start), the same landing opens the scene with the owner's credits as the purse and no captain's line.
  - The scene editor's index lists `scene:inspection` (the index tests that count scenes pass with the new id).
- [ ] **Step 2: Run** `npm run test:changed`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement.**
  - `inspectionScene`. The text names the cause or causes and the sum, and the captain's line comes from `hiredCaptain()` (in chapter two, the co-op's line).
  - The hand's move: Comms takes the papers (`soloOdds('comms')`); another post speaks up (`handCheck(POST_STAT[post], skillLevel(post), 'word')`); or keep out of it. Labels carry `oddsWord` like the customs scene. Payment is `moveMoney(-Math.min(purse(), sum))` plus `recordHand('fines')`. A failure is `like(cap, -1, say('fail.memory'))` when there is a captain.
  - The `landed` hook. Skip at a site (`atSite`) and in the owner game's flight modes. Read `cause = inspectionCause(G.state.cargo, system().gov, repOf(system().gov), hasTrait(career(), 'marked'))`. Null at an inspecting port gives the note through `M.note`. Otherwise, `if (G.dialog) openEvent(chainEvents([scene, G.dialog.event])); else openEvent(scene)`.
  - The lines, written to the voice guide: the title, the text for each cause, the captain's line, the move labels, and win, lose and keep-out results with their memories.
- [ ] **Step 4: Run** `npm run test:changed`. Expected: PASS.
- [ ] **Step 5: Commit** `Ports inspect on arrival: the cause named, a fitting sum, the hand's one move (#993)`.

### Task 3: The cause-less stops go

**Files:**
- Modify: `js/engage.js` (the `hostileGov` branch in `planIntercept`; the hired `heave` choice in `contactEvent`), `js/fightladder.js` (remove the `cutter` step), `js/hiredscenes.js` (remove `heave.label`, `heave.result`, and the `cutter` lines of `scene:fight-entry` once nothing reads them)
- Test: `tests/engage*.test.js`/`tests/engagements.test.js`, `tests/fightladder.test.js`

**Interfaces:**
- Consumes: none.

- [ ] **Step 1: Write the failing tests:**
  - `planIntercept` with standing -40 at both ends, over 50 burns with `Math.random` at 0.01, never plans `kind: 'patrol'`.
  - `FIGHT_LADDER.map(s => s.id)` has no `'cutter'`.
  - Review Focus 4: `ladderNext` on a hand whose `fights.done` is `['raider', 'corsair', 'cutter']`, or `['raider', 'corsair']` with the captain's beats done, returns the next step (`setpiece` when due) or null, with no error.
- [ ] **Step 2: Run** `npm run test:changed`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement** the removals. The owner's "pay the fine (40,000 cr)" choice and `heaveToFine` stay.
- [ ] **Step 4: Update the tests that expected the removed stops.** Those in the spec's list: `tests/fightladder.test.js`, `tests/engagements.test.js`, `tests/fight.test.js`, `tests/fightui.test.js`, `tests/boarders.test.js`, `tests/hired.test.js`, `tests/playthrough.test.js`, `tests/editorfight.test.js`, `tests/editorlines.test.js`, `tests/beatplay.js`. A navy-boarding test that reached it through the cutter step sets up `{ kind: 'patrol', gov }` directly with `startDuel`. Run `npm run test:changed` and `npm run test:editor`. Expected: PASS. A pin that changes only because the cutter is gone is rewritten with `npm run pin:from`, and its commit says so.
- [ ] **Step 5: Commit** `The cause-less patrol stops go: no hostile-navy cutter, no cutter on the ladder (#993)`.

### Task 4: Whole-suite verification

- [ ] **Step 1:** `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. Expected: all pass.
- [ ] **Step 2:** `npm run test:editor`. Expected: all pass.
- [ ] **Step 3:** `npm run coverage -- --check`. Expected: pass. If a floored file's coverage rises, raise its number.
- [ ] **Step 4:** `npm run soak`. Compare with main for the same files. A band that moves goes to the owner with the figures; do not widen it.
- [ ] **Step 5:** Add a `ROADMAP.md` entry (done, #993, the files) and a screenshot of the scene at 1280x800 for the PR. Commit and push.
