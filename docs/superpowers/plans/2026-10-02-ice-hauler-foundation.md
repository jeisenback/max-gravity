# Ice Hauler Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A hired Earth game starts on an Ice Hauler with a nine-person crew, a fund big enough for the 120 t hold, and pay tuned so about 20 runs reach 19,000 cr.

**Architecture:** Three chapter-only roles (XO, cook, ice hand) join the role tables but stay out of the random crew generators. `setupHired` builds the roster from a small table. Three constants (`HIRED_FUND`, `HIRED_WAGE`, `HIRED_SHARE`) plus a new `HIRED_TARGET` hold the economy, tuned with a soak script that is committed under `tools/`.

**Tech Stack:** Vanilla JS classic scripts; Node `node:test` with Playwright and Chromium.

**Spec:** `docs/superpowers/specs/2026-10-02-hired-chapter-design.md` (sections "The ship and the roster" and "The economy"). Issue #144.

## Global Constraints

- Classic scripts, one global scope. `tests/globals.test.js` enforces unique top-level names and that every script under `js/` is linked.
- No emojis anywhere (code, text, docs, commits).
- Branch `ccr-56b9a0c9-x4nelr-144`. Open no PR unless asked. End each commit message with the attribution lines the session gives.
- Before editing, read `.claude/heartbeat.json`; update it at each step and mark it `done` at the end. It is git-ignored; never commit it.
- Run one test file with `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/<file>`. Run everything with `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test` and commit only if it reports `# fail 0`.
- Tests run in full scope by default (`tests/helpers.js`), so they keep covering every start.
- The roster: nine crew in the ten berths (the captain is not in `st.crew` and takes no berth): the three other post holders (Ines and Tomas, one generated), a first officer, a quartermaster, a medic, a cook, and two ice hands.
- Targets: median 20 runs to reach `HIRED_TARGET` (19,000 cr), every seed between 14 and 28, average pay to the hand 800 to 1,100 cr per run.

## Review Focus

- Chapter-only roles never appear as random hire candidates or as passengers who join the crew. Pinned in Task 2.
- A hired save from before this change (Ore Runner, three crew) still loads and plays. Pinned in Task 3.
- After the buy-in, the old captain's ship on the lanes is the Ice Hauler, not the Ore Runner. Pinned in Task 3.
- Crew events that pick shipmates do not break on roles with no post (cook, ice hands). Pinned in Task 3.
- The captain's planner never returns an empty plan with the bigger fund and hold. Pinned in Task 5.

---

### Task 1: The soak script, and a baseline

**Files:**
- Create: `tools/soak.js`, `tests/soak.test.js`

**Interfaces:**
- Consumes: `open` from `tests/helpers.js`; in the page: `startGame`, `sail`, `hired`, `tryBurn`, `enterTransit`, `planOccasions`, `occasionEvent`, `startHappening`, `relationshipScene`, `land`, `makeShip`, `talkEvent`, `chooseEvent`, `finishEvent`, `HIRED_TARGET` (added in Task 4; until then the script falls back to 19000).
- Produces: `soak({ seed = 1, legs = 40, scope = 'earth-hired' }): Promise<{ seed, runs, days, credits, reached: { runs, day, credits } | null, avgPayPerRun, avgDaysPerRun, stuck, scenes: { [title]: count }, bad: string[], errors: string[] }>` (`stuck` counts the stops where `sail()` found no plan), and a CLI: `node tools/soak.js --seeds 1,2,3 --legs 40`, which prints one line per seed and the totals.

- [ ] **Step 1: Write the failing test** `tests/soak.test.js`, `the soak sails the captain's runs and reports them`: `const r = await soak({ seed: 1, legs: 6 })`. Assert `r.runs === 6`, `r.bad` and `r.errors` deep-equal `[]`, `Number.isFinite(r.avgPayPerRun) && r.avgPayPerRun > 0`, `Number.isFinite(r.avgDaysPerRun)`, and `Object.keys(r.scenes).length > 0`.
- [ ] **Step 2: Run to verify it fails.** `node --test tests/soak.test.js`. Expected: FAIL, `Cannot find module '../tools/soak'`.
- [ ] **Step 3: Implement `soak`** in `tools/soak.js`: open the game in the narrow scope, start a hired Earth gunner game, then for each leg: visit the bar and talk to a patron, `sail()`, answer every dialog with a random enabled choice (flag text containing `undefined`, `NaN`, `[object`, or an unfilled `{word}`), run the transit's occasions and four happenings, advance the days, `land`, answer dialogs, and record the savings gained. Stop at `legs` or when `st.credits >= HIRED_TARGET` has been reached and `legs` more runs are not wanted (`reached` records the first time). The loop body is the scratch script from the design discussion (`soak.js`, `pace.js` in the session scratchpad); port it, fixing the destination read before the burn. Export it with `module.exports = { soak }` and run the CLI only when `require.main === module`.
- [ ] **Step 4: Run to verify it passes.** Same command. Expected: PASS.
- [ ] **Step 5: Record the baseline.** Run `CHROMIUM_PATH=/opt/pw-browsers/chromium node tools/soak.js --seeds 1,2,3,4,5,6 --legs 40` on the unchanged game. Write the per-seed `reached` and `avgPayPerRun` into this plan's "Baseline" note at the end of Task 5 (Ore Runner, 5,000 cr fund, wage 40, share 0.10).
- [ ] **Step 6: Commit** `tools/soak.js`, `tests/soak.test.js`.

---

### Task 2: Chapter-only roles

**Files:**
- Modify: `js/people.js` (`ROLE_NAMES`, `ROLE_WAGE`, `ROLE_PERKS`, `makeCrewCandidate`), `js/family.js:310`
- Test: `tests/chapter.test.js` (create)

**Interfaces:**
- Produces: `const HIREABLE_ROLES = ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic']` in `js/people.js`; `ROLE_NAMES`, `ROLE_WAGE` and `ROLE_PERKS` gain `xo`, `cook` and `icehand`.

- [ ] **Step 1: Write the failing tests** in `tests/chapter.test.js` (header: the chapter's roster, fund and pacing):
  - `the chapter's roles have a name, a wage and a perk`: `ROLE_NAMES.xo === 'First officer'`, `ROLE_NAMES.cook === 'Cook'`, `ROLE_NAMES.icehand === 'Ice hand'`; each of the three has a numeric `ROLE_WAGE` and a `ROLE_PERKS` function returning a non-empty string.
  - `the chapter's roles are never hireable`: `HIREABLE_ROLES` deep-equals the six roles above; 300 calls of `makeCrewCandidate('earth')` yield only roles in `HIREABLE_ROLES`.
  - `a passenger who joins the crew never takes a chapter role`: the function at `js/family.js:310` (read its name there) returns a role in `HIREABLE_ROLES` over 300 calls.
- [ ] **Step 2: Run to verify they fail.** `node --test tests/chapter.test.js`. Expected: FAIL (`HIREABLE_ROLES is not defined`, and `ROLE_NAMES.xo` undefined).
- [ ] **Step 3: Implement.** Add the three roles: `xo: 'First officer'`, `cook: 'Cook'`, `icehand: 'Ice hand'`; wages `xo: 65, cook: 40, icehand: 35`; perks as one-line descriptions with no mechanics (`xo`: runs the watch bill and speaks for the captain; `cook`: keeps the galley and knows everyone's business; `icehand`: handles the ice and the cargo). Add `HIREABLE_ROLES`. `makeCrewCandidate` and `js/family.js:310` pick from `HIREABLE_ROLES` instead of `Object.keys(ROLE_NAMES)`.
- [ ] **Step 4: Run to verify they pass,** then `node --test tests/people.test.js tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `js/people.js`, `js/family.js`, `tests/chapter.test.js`.

---

### Task 3: The ship and the roster

**Files:**
- Modify: `js/hired.js` (`setupHired`, the buy-in's `cap.ship`), `js/signon.js` (the three background paragraphs), `tests/hired.test.js:32`, `tests/cast.test.js` (the first test)
- Test: `tests/chapter.test.js`

**Interfaces:**
- Consumes: `HIREABLE_ROLES` and the new roles (Task 2), `makeCrewCandidate`, `registerPerson`, `castCrew`.
- Produces: `const CHAPTER_CREW = [{ role: 'xo', skill: 2 }, { role: 'quartermaster', skill: 2 }, { role: 'medic', skill: 2 }, { role: 'cook', skill: 2 }, { role: 'icehand', skill: 1 }, { role: 'icehand', skill: 1 }]` in `js/hired.js`.

- [ ] **Step 1: Write the failing tests** in `tests/chapter.test.js` (start with `startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' })` and finish dialogs):
  - `a hired hand starts on an Ice Hauler`: `G.state.shipId === 'freighter'`, `G.state.fuel === SHIPS.freighter.fuel`, `G.state.armor === SHIPS.freighter.armor`; the opening text mentions "ice hauler" and not "light freighter".
  - `the crew is nine, in the ten berths`: the sorted roles of `crewOf()` deep-equal `['cook', 'engineer', 'icehand', 'icehand', 'medic', 'pilot', 'quartermaster', 'slicer', 'xo']`; `berthsUsed() === 9` and `berthsFree() === 1`; Ines and Tomas are aboard.
  - `every post but yours is held once`: for each of the four posts except the player's, exactly one crew member holds that role.
  - `a hired start on another background has the same roster`: the same roles for `background: 'mars'` and `'belt'`.
  - `an old hired save still plays`: set `shipId = 'lightfreighter'` and `st.crew` to the three post holders only, then run `startHappening()` twenty times with dialogs answered and `hiredEvent('crew')` ten times; nothing throws.
  - `crew events cope with roles that have no post`: with the full roster, call `hiredEvent('crew')` and `hiredEvent('money')` thirty times (seeded); nothing throws and no text contains `undefined`.
  - `after the buy-in the old captain's ship is an Ice Hauler`: `st.credits = 100000; hired().confirm = 'courier'; Mods.act('buyInGo', 'courier')`; the captain person's `ship.shipId === 'freighter'`.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL (ship is `lightfreighter`, three crew).
- [ ] **Step 3: Implement.** In `setupHired`: `st.shipId = 'freighter'` with fuel and armor from `SHIPS.freighter`; after the existing generated post holders, push one registered `makeCrewCandidate(st.systemId)` person per `CHAPTER_CREW` entry, set the same way as the existing generated crew (`role`, `skill`, `job` from `ROLE_NAMES`, `mood = null`). The opening text says "an ice hauler out of ...". In the buy-in, `cap.ship.shipId` becomes `'freighter'`. In `js/signon.js` replace "a light freighter" and "LIGHT FREIGHTER" with "an ice hauler" and "ICE HAULER" in the three paragraphs.
- [ ] **Step 4: Update the tests that break.** `tests/hired.test.js:32` expects `'freighter'`. The first test in `tests/cast.test.js` asserted three distinct roles with nobody on your post: change it to the post rule above (each non-player post held once). Run `node --test tests/hired.test.js tests/cast.test.js tests/chapter.test.js tests/signon.test.js tests/scope.test.js`; fix any other test whose expectation was the old ship or a three-person crew, with the smallest change that states what is now true.
- [ ] **Step 5: Run to verify all pass,** then commit `js/hired.js`, `js/signon.js`, `tests/`.

---

### Task 4: The fund and the target

**Files:**
- Modify: `js/hired.js` (`HIRED_FUND`, `planRun`, `runHtml`)
- Test: `tests/chapter.test.js`

**Interfaces:**
- Produces: `const HIRED_TARGET = 19000` and `const wantsYard = () => G.state.credits >= HIRED_TARGET` in `js/hired.js`. `HIRED_FUND` is raised to 12000 as a starting value (tuned in Task 5).

- [ ] **Step 1: Write the failing tests** in `tests/chapter.test.js`:
  - `the fund is big enough for the hold`: `HIRED_FUND >= 12000`; at the start, `currentPlan().tons > SHIPS.lightfreighter.cargo` (the hauler's cargo exceeds the Ore Runner's 50 t) and `currentPlan().cost <= G.state.hired.fund`. If the seeded market makes this false at the start port, choose the first seed where it holds and name it in the test.
  - `the captain heads for a yard at the chapter's price, not the cheapest ship's`: `HIRED_TARGET === 19000`; `wantsYard()` is false at `HIRED_TARGET - 1` credits and true at `HIRED_TARGET`; `runHtml()` mentions a port with a yard only when `wantsYard()` is true.
- [ ] **Step 2: Run to verify they fail.** Expected: FAIL (`HIRED_TARGET is not defined`; the fund is 5,000).
- [ ] **Step 3: Implement.** Replace the minimum-ship-price expression in `planRun` (`wantYard`) and the copy of it in `runHtml` with `wantsYard()`. Set `HIRED_FUND` to 12000. The Rock Hopper stays buyable: `canBuyIn` is unchanged.
- [ ] **Step 4: Run to verify they pass,** then `node --test tests/hired.test.js tests/chapter.test.js`.
- [ ] **Step 5: Commit** `js/hired.js`, `tests/chapter.test.js`.

---

### Task 5: Tune pay and pacing

**Files:**
- Modify: `js/hired.js` (`HIRED_WAGE`, `HIRED_SHARE`, `HIRED_FUND`; the `st.hired = { ... wage: 40, share: 0.1 ... }` literal in `setupHired` reads them)
- Test: `tests/chapter.test.js`

**Interfaces:**
- Produces: `const HIRED_WAGE = 40` and `const HIRED_SHARE = 0.10` (starting values) in `js/hired.js`, read by `setupHired`.

- [ ] **Step 1: Write the failing pacing test** in `tests/chapter.test.js`: `about twenty runs reach the target on every seed`: for seeds 1 and 2, `soak({ seed, legs: 40 })` reports `reached` not null with `reached.runs` between 14 and 28, and `avgPayPerRun` between 800 and 1100. Also `the planner never comes back empty`: over the same two soaks, `r.runs` equals the legs sailed (no stop where the captain had no plan, which `sail()` returning false would show as `stuck`; add a `stuck` count to the soak result and assert it is 0).
- [ ] **Step 2: Run to verify it fails** with the starting values. Expected: FAIL, with the measured `reached.runs` in the message (the hauler pays too much per run at wage 40 and share 0.10).
- [ ] **Step 3: Tune.** Run `node tools/soak.js --seeds 1,2,3,4,5,6 --legs 40`; adjust `HIRED_WAGE`, `HIRED_SHARE` and `HIRED_FUND` (in that order of preference: share first, since the hold makes profit about 2.4 times larger) until all six seeds are inside the targets in Global Constraints. Re-run after each change.
- [ ] **Step 4: Run to verify it passes,** then the full suite: `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. Expected: `# fail 0`.
- [ ] **Step 5: Commit** `js/hired.js`, `tests/chapter.test.js`, with the baseline and final soak numbers in the commit message. Fill the "Baseline" note below.

**Baseline note (Task 1 step 5 and this task):** Ore Runner, 5,000 cr fund, wage 40, share 0.10: runs to 10,000 cr over seeds 1 to 6 were 8, 13, 13, 12, 13, 13 (average pay 712 to 1,222 cr per run, 5.4 days per run). Final values and the new soak results go here.

---

### Task 6: Docs

**Files:**
- Modify: `README.md`, `docs/superpowers/specs/2026-10-02-hired-chapter-design.md`

- [ ] **Step 1:** In the README scope note under "Running" say the chapter is an Earth hired hand on an Ice Hauler; add `tools/soak.js` to the layout list ("sails the captain's runs for N legs and reports runs, days and pay: the tuning tool for the chapter's economy").
- [ ] **Step 2:** In the spec, settle two of its open questions: the captain is not in `st.crew` and takes no berth, so the roster is nine crew in ten berths; the final fund, wage and share values from Task 5.
- [ ] **Step 3: Run the full suite,** confirm `# fail 0`, update `.claude/heartbeat.json` to `done`, and commit `README.md` and the spec.
