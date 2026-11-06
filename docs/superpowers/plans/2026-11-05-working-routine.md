# A Working Routine Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The burn view's crew follow a ship's timetable (meals, shifts at their posts in a working pose, the watch handed over at dusk), on ship life's own dice.

**Architecture:** Ship life gets its own seeded random on `G.transit`, so nothing in the cutaway draws from `Math.random`. Two pure functions, `shipDay(elapsed)` and `routineSpot(p, block)`, say what block it is and where a person belongs. `lifeTick` sends people there in place of the weighted pick, below the phase, a staged scene and a downtime activity. `js/figures.js` gains two working poses.

**Tech Stack:** Vanilla JS classic scripts, canvas; `node --test` with Playwright (`tests/helpers.js` `open()`), Node context tests (`tests/nodecontext.js`).

**Spec:** `docs/superpowers/specs/2026-11-05-working-routine-design.md`

## Global Constraints

- `SHIP_DAY = 80`; the shares of day, dusk, night and dawn in `nightLevel` are unchanged.
- The timetable by share of the day: `wake` 0.90 to 1.00; `breakfast` 0.00 to 0.08; `shift` 0.08 to 0.30; `meal` 0.30 to 0.38; `shift` 0.38 to 0.48; `supper` 0.48 to 0.55; `handover` 0.55 to 0.65; `night` 0.65 to 0.90.
- `NIGHT_WATCH` stays `['pilot', 'engineer']`; the face-to-face at a handover lasts 2 seconds.
- A whole burn of `lifeTick` calls `Math.random` zero times. What a downtime activity does to the game (its result text, its effects) stays on the game's dice.
- New logic takes its state as parameters (CLAUDE.md); unique top-level names (`tests/globals.test.js`); no `hired()` fork in the hand's logic; no emojis.
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`.

## Review Focus

1. A crew with no pilot or engineer, or a watch-keeper held by a staged scene at dusk: nobody waits for a relief forever; the one going off waits at most until `handover` ends.
2. A burn whose move phase begins in the middle of a block, or someone on the ladder when a block changes: they go to the current block's place, with no one stuck at the ladder.
3. A big crew at a meal (eight or more with passengers): everyone gets a place inside the galley; nobody stands outside its walls.
4. A downtime activity or a staged scene ending in the middle of a shift: the person goes back to their post, not to a random room.
5. A burn restored from a save made before this change (`G.transit` without ship life's dice state): ship life seeds itself and runs; no crash.

---

### Task 1: Ship life's own dice and the 80-second day

**Files:**
- Modify: `js/shiplife.js` (`weighted`, `goTo`, `shipPeople`, `lifeLine`, `lifeTick`, the activities' `goTo` picks, `SHIP_DAY`)
- Modify: `js/game.js:67` (`pickFresh` takes a random)
- Modify: tests that set `elapsed` for night or day: `tests/burnview.test.js:434,477`, `tests/downtime.test.js:82,87`, `tests/nightscenes.test.js:32,33,48,52`
- Modify: pins (`tests/fixtures/*pin*.json`), re-recorded with `npm run pin:from`
- Test: `tests/burnview.test.js`, `tests/livingship.test.js`

**Interfaces:**
- Produces: `shipRand(t, st) -> number in [0, 1)`: state kept on `t.lifeRng` (a 32-bit integer); when absent, seeded from a string hash of `${st.day}|${t.to}|${t.days}` (no `Math.random` call). `weighted(table, rnd = Math.random)`. `pickFresh(lines, rnd = Math.random)`. Inside ship life, `const lifeRnd = () => shipRand(G.transit, G.state)` is the one random everything in the cutaway uses.

- [ ] **Step 1: Write the failing tests**

In `tests/burnview.test.js`:

```js
test('a whole burn of ship life draws none of the game\'s dice', async () => {
  // a hired burn (earth-hired), run frame by frame from start to arrival at 1/30 s with Math.random counted:
  assert.equal(r.draws, 0, 'ship life used only its own dice');
  assert.ok(r.moved > 0, 'and people did move');
});
test('ship life\'s dice are the same for the same burn and start themselves on an old burn', async () => {
  // two fresh G.transit objects with the same st.day, to and days give the same first five shipRand values;
  // a G.transit with lifeRng deleted mid-burn runs lifeTick for 5 s without throwing
});
```

In `tests/livingship.test.js` (Node): `shipRand` with a given `t` and `st` gives values in `[0, 1)`, and a different `st.day` gives a different first value.

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test --test-name-pattern="dice" tests/burnview.test.js tests/livingship.test.js` (with `CHROMIUM_PATH` set)
Expected: FAIL: `shipRand is not defined`, and draws above 0.

- [ ] **Step 3: Implement**

- `shipRand` as above (mulberry32 or any small 32-bit generator; the state is a number so it survives the save).
- Every draw in ship life that changes only the cutaway uses `lifeRnd`: the couch waits in `shipPeople`, `goTo`'s spot, `weighted` in the wander, the dusk waits, the arrival wait, the 0.18 comms chance, `lifeLine`'s `pickFresh` and `pick`, and the room picks in the drills and repair activities (`js/shiplife.js:540,549`). The activities' result text (`:533`, `:559`) stays on the game's dice.
- `SHIP_DAY = 80`. Tests that set `elapsed`: night becomes `elapsed = 50`, day `elapsed = 5` stays (check each by `nightLevel()`).

- [ ] **Step 4: Run them to verify they pass**

Run: the Step 2 command. Expected: PASS.

- [ ] **Step 5: Re-record the pins, run the soak, run the suite**

Run: `npm run pin:from -- tests/<each>pin.test.js` for every pin that now fails (read each diff: only versions, order and which lines play may move, no crash or missing scene); then `npm run soak`; then the full test command.
Expected: all pass. A soak or seeded test that moves because the dice moved: fix the test's seed or expectation, and ledger it as a ruling naming the test.

- [ ] **Step 6: Commit**

`git commit -m "Burn view: ship life rolls its own dice; an 80-second ship's day"` with the session trailer.

### Task 2: The timetable, pure

**Files:**
- Modify: `js/shiplife.js` (after `nightLevel`)
- Test: `tests/livingship.test.js` (loads the new names through `tests/nodecontext.js`)

**Interfaces:**
- Consumes: `SHIP_DAY`, `HAUNTS`, `NIGHT_WATCH`, `roomAt`.
- Produces:
  - `SHIP_TIMETABLE`: an array of `{ block, from, to }` with the Global Constraints' values.
  - `shipDay(elapsed) -> { block, f }`, `f = ((elapsed + 6) / SHIP_DAY) % 1`, the same `f` as `nightLevel`.
  - `postOf(role) -> room id`: the top of `HAUNTS[role]`; `'bridge'` for `captain`.
  - `routineSpot(p, block) -> { room, at } | { rounds: true }`. `p` is `{ role }`. `at` is `'post'`, `'table'`, `'stove'`, `'bunk'`:
    - `wake`, `breakfast`, `meal`, `supper`: the cook `{ room: 'galley', at: 'stove' }`, everyone else `{ room: 'galley', at: 'table' }`;
    - `shift`: `you` and `passenger` `{ rounds: true }`; the cook `{ room: 'galley', at: 'stove' }`; everyone else `{ room: postOf(role), at: 'post' }`;
    - `handover` and `night`: `NIGHT_WATCH` roles `{ room: postOf(role), at: 'post' }`; everyone else `{ room: 'berths', at: 'bunk' }`;
    - `cat`: always `{ rounds: true }`.

- [ ] **Step 1: Write the failing test**

```js
test('the ship\'s day runs to a timetable, and each person has a place in it', () => {
  // shipDay: elapsed whose f is 0.00, 0.079, 0.08, 0.30, 0.38, 0.48, 0.55, 0.65, 0.90 give
  //   breakfast, breakfast, shift, meal, shift, supper, handover, night, wake
  // routineSpot: engineer in shift -> { room: 'engine', at: 'post' }; pilot in night -> { room: 'bridge', at: 'post' };
  //   cook in meal -> { room: 'galley', at: 'stove' }; captain in shift -> bridge post; captain in handover -> berths bunk;
  //   you in shift -> { rounds: true }; you in breakfast -> galley table; passenger in shift -> rounds; passenger in supper -> galley table;
  //   quartermaster in night -> berths bunk; cat in breakfast -> rounds
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tests/livingship.test.js`. Expected: FAIL: `shipDay is not defined`.

- [ ] **Step 3: Implement `SHIP_TIMETABLE`, `shipDay`, `postOf`, `routineSpot` in `js/shiplife.js`**

- [ ] **Step 4: Run it to verify it passes**

Run: `node --test tests/livingship.test.js tests/globals.test.js`. Expected: PASS.

- [ ] **Step 5: Commit**

`git commit -m "Burn view: the ship's timetable (shipDay, routineSpot)"`

### Task 3: People keep the timetable

**Files:**
- Modify: `js/shiplife.js` (`lifeTick`, a new `routineTarget`)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: `shipDay`, `routineSpot`, `lifeRnd`, `stageScene` and `p.staged` (layer 1).
- Produces: `routineTarget(p, spot, galley, i, n, rnd) -> x`: the spot's x in its room. `'post'`: the room's x at 0.6 for the bridge and gunnery, else a `rnd` place between 0.3 and 0.7. `'stove'`: the galley at 0.15. `'table'`: seat `i` of `n` at the table, spread evenly between 0.3 and 0.9 of the galley (clamped inside the walls). `'bunk'`: as the night's berths now. `p.block`: the block a person's current target was set for. `p.errand`: true while on a shift errand.
- In `lifeTick`'s move branch, for someone not staged and not on an activity: when `shipDay(t.elapsed).block` differs from `p.block`, set `p.block` and send them to `routineSpot`'s place (rounds: the weighted wander as now). When the wait at a post runs out in a shift, with chance 0.25 (`lifeRnd`) go on an errand to another room of their `HAUNTS` (not the post), and from it back to the post. Table seats: `i` is the person's place among those whose spot is `'table'` in `t.aboard` order.
- A downtime activity in progress is marked by the activity's `goTo` setting `p.block = 'activity'`; when they arrive and their wait runs out, the next frame sends them to the current block.

- [ ] **Step 1: Write the failing tests**

```js
test('at breakfast the crew are at the galley table, seated, the cook at the stove', async () => {
  // stageBurn, then t.elapsed so shipDay is breakfast, tickFor(20): every crew member but the cook in the galley, posture 'sit';
  // the cook in the galley at its 0.15, standing; all x inside the galley's walls (with eight aboard: add passengers until eight)
});
test('in a shift the crew are at their posts, you on rounds, and a scene or a drill ends back at the post', async () => {
  // elapsed so the block is the first shift, tickFor(20): the engineer in the engine room, the pilot on the bridge;
  // over 40 s of the shift you visit at least two rooms;
  // open a scene naming the engineer (sayScene, the galley), tickFor(10), close it, tickFor(25): the engineer back in the engine room
});
test('a block that changes while someone is on the ladder takes them to the new place', async () => {
  // someone mid-ladder (dk 0.5) when breakfast turns to the shift: after tickFor(20) they are at their post, dk equal to its deck
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test --test-name-pattern="breakfast|shift|ladder" tests/burnview.test.js`. Expected: FAIL (the crew are where the weighted pick sent them).

- [ ] **Step 3: Implement as in the Interfaces block**

- [ ] **Step 4: Run them, then the burn and life tests**

Run: the Step 2 command, then `npm run test:changed`. Expected: PASS. The dice guard from Task 1 still passes (no `Math.random`).

- [ ] **Step 5: Commit**

`git commit -m "Burn view: meals, shifts at their posts, rounds"`

### Task 4: Working poses and the watch handed over

**Files:**
- Modify: `js/figures.js` (`POSTURES`, the pose switch at `:62-69`)
- Modify: `js/shiplife.js` (`posture`, the handover in `lifeTick`)
- Test: `tests/burnview.test.js`, `tests/figures*.test.js` if a test lists `POSTURES`

**Interfaces:**
- Consumes: `p.block`, `routineSpot`, `NIGHT_WATCH`.
- Produces: `POSTURES.work = { frames: 4, fps: 3 }` (standing, the arms forward at panel height and moving); `POSTURES['work-sit'] = { frames: 4, fps: 3 }` (as `sit`, the arms forward to the console and moving). `posture()`: someone in a `shift` block at their post (not walking, not on an errand, not staged) is `work-sit` on the bridge and at the guns, else `work`; the cook at the stove at a meal is `work`.
- The handover: at `handover`, for each `NIGHT_WATCH` person aboard, anyone not on the watch whose room is that person's post and who is not staged gets `p.relief = watcher.id` and stays. When the watcher has arrived (same room, `tx === null`), both face each other (`face` toward the other) and the one going off leaves for the berths 2 seconds later. Anyone still waiting when `handover` ends leaves.

- [ ] **Step 1: Write the failing tests**

```js
test('in a shift the engineer works at the drive and the pilot at the controls', async () => {
  // shift, tickFor(20): posture(engineer) 'work', posture(pilot) 'work-sit'; you on rounds never 'work'
});
test('at dusk the captain waits on the bridge for the pilot, they face each other, and then the captain turns in', async () => {
  // captain at the bridge post, pilot in the galley, elapsed just before handover; tick to handover:
  // the captain stays on the bridge until the pilot is there; then faces have opposite signs toward each other;
  // within 2.5 s after the pilot arrives the captain is heading for the berths; after tickFor(30) the captain is in the berths
});
test('with no night watch aboard nobody waits at dusk', async () => {
  // a crew with no pilot and no engineer: at handover the captain leaves the bridge for the berths within 1 s
});
test('a watch-keeper held in a scene at dusk leaves the one waiting to turn in when the handover ends', async () => {
  // the pilot staged in a scene in the galley through handover: the captain is in the berths by night
});
```

- [ ] **Step 2: Run them to verify they fail**

Run: `node --test --test-name-pattern="works at|dusk|night watch|held in a scene" tests/burnview.test.js`. Expected: FAIL.

- [ ] **Step 3: Implement as in the Interfaces block**

- [ ] **Step 4: Run them, then the full suite**

Run: the Step 2 command, then the full test command. Expected: all pass.

- [ ] **Step 5: Screenshots for the owner**

Breakfast, a shift (engineer and pilot working) and the handover on the bridge, at `deviceScaleFactor: 2`, into the scratchpad; send them.

- [ ] **Step 6: Commit**

`git commit -m "Burn view: working poses; the watch handed over at dusk"`
