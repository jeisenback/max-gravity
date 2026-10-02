# Life and Loss Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Core cast members can be marked or killed through one function, the dead are recorded and respected everywhere, a lost ship obeys the same two-survivor floor, and Yelena's "Over the Hull" pivot proves it.

**Architecture:** A new classic script `js/fate.js` holds `castFate` and the helpers around it. State lives on existing `st.cast[key]` plus a new `st.memorial` list, all optional so old saves load unchanged. Yelena's pivot is a sixth authored scene in `js/cast.js`, reached through the existing `castNext` path.

**Tech Stack:** Vanilla JS classic scripts sharing one global scope; Node `node:test` with Playwright and Chromium.

**Spec:** `docs/superpowers/specs/2026-10-02-life-and-loss-foundation-design.md`

## Global Constraints

- Classic scripts, one global scope. Load order is in `index.html`. `tests/globals.test.js` enforces unique top-level names and that every file under `js/` is linked.
- Build only what the spec asks for. No emojis anywhere (code, text, docs, commits).
- `js/boarding.js` is not touched.
- Work on branch `ccr-56b9a0c9-x4nelr`. Open no PR.
- Floor: `CAST_FLOOR = 2` living core characters. A core character counts as living when `st.cast[key].since` is a number and `status !== 'dead'`, wherever they are posted.
- Before editing, read `.claude/heartbeat.json`. Update it at each step and mark it `done` at the end. It is git-ignored; never commit it.
- End each commit message with the attribution lines the session gives.
- Run one test file with `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/cast.test.js`. Run everything with `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test` (about a minute) before the final push.
- New tests go in `tests/cast.test.js`, using its `helpers` block (`start`, `crewOf`) and the `open`/`ev`/`done` pattern.

## Review Focus

- A mark on a character already at skill 0 must not push the skill negative. Pinned in Task 1.
- Calling `castFate` on someone already dead must not write a second memorial entry. Pinned in Task 1.
- A save from before this change (no `status`, `marks` or `st.memorial`) must load and behave as alive with no marks. Pinned in Task 1.
- A ship loss with only the pair aboard must leave both alive, marked, and still in the crew. Pinned in Task 3.
- A hull at exactly 60%, or an injured medic, must not count as protection in the pivot. Pinned in Task 4.

---

## File Structure

- Create `js/fate.js`: `castFate` and its helpers. One responsibility: who is alive, marked or dead, and the record of the dead.
- Modify `index.html`: link `js/fate.js` immediately after `js/cast.js`.
- Modify `js/cast.js`: guards for the dead, the `pivot` scene, and `castNext`.
- Modify `js/legacy.js`: ship loss goes through `castShipLoss`.
- Modify `tests/cast.test.js`, `ROADMAP.md`.

---

### Task 1: `castFate`, the floor and the memorial

**Files:**
- Create: `js/fate.js`
- Modify: `index.html` (add `<script src="js/fate.js"></script>` right after the `js/cast.js` line)
- Test: `tests/cast.test.js`

**Interfaces:**
- Consumes: `castPerson(key)`, `castRec(key)` (`js/cast.js`); `SKILL_STEPS` (`js/hired.js`); `fleet()`, `castCaptain(ship)` (`js/company.js`); `makeCrewCandidate(systemId)`, `registerPerson(p)` (`js/people.js`); `system()`.
- Produces:
  - `const CAST_FLOOR = 2`
  - `castDead(key: string): boolean`, reading `G.state.cast[key]` without creating it
  - `castLiving(): string[]`, the keys of core characters that have joined and are not dead
  - `castFate(key: string, outcome: 'live' | 'mark' | 'die', cause: string, markText: string): 'live' | 'mark' | 'die'`

- [ ] **Step 1: Write the failing tests** in `tests/cast.test.js`. Add `window.addThird = () => { castRec('ines').since = G.state.day; };` to its `helpers` block (a third living core character, which lifts the floor). Then add these tests, each starting `start({ background: 'mars', mode: 'hired', post: 'pilot' })` unless noted:
  - `a death with only the pair becomes a mark`: `castFate('yelena', 'die', 'Cause.', 'Hand ruined.')` returns `'mark'`. Then `castDead('yelena')` is false; `castRec('yelena').marks` deep-equals `[{ text: 'Hand ruined.', day: G.state.day }]`; `person('c:yelena').skills.gunner` is 2 and `.skill` is 2; `G.state.memorial` is missing or empty. After `castXp('yelena', 'gunner', 1)` the gunner skill is still 2.
  - `a death with a third core character kills`: `addThird()`, set `G.state.injured['c:yelena'] = true`, then `castFate('yelena', 'die', 'Cause.', 'x')` returns `'die'`. Assert `castRec('yelena').status === 'dead'`, `G.state.crew` excludes `'c:yelena'`, `G.state.injured['c:yelena']` is undefined, and `G.state.memorial` deep-equals `[{ key: 'yelena', day: G.state.day, place: system().name, cause: 'Cause.' }]`. In the same test, a second `castFate('yelena', 'die', 'Again.', 'x')` returns `'die'` and `G.state.memorial.length` is still 1.
  - `a mark never takes a skill below zero`: four `'mark'` calls on Yelena leave `skills.gunner` at 0 and `marks.length` at 4.
  - `only core characters who have joined count as living`: `castLiving().sort()` deep-equals `['ruben', 'yelena']`.
  - `a captained company ship reverts when its captain dies`: add the `setup()` helper from `tests/captaincy.test.js` to this file's `helpers` block (an Earth owner with Ines and Tomas joined and a company ship docked). Set `castRec('yelena').since = G.state.day` so two others stay living, post Ines with `postCaptain(0, 'ines')`, then `castFate('ines', 'die', 'x', 'x')`. Assert it returns `'die'`, `castCaptain(fleet()[0])` is null, and `fleet()[0].captain.pid !== 'c:ines'`.
  - `an old save without the new fields behaves as alive`: delete `status`, `marks` and `G.state.memorial`, then assert `castDead('yelena')` is false, `castLiving().length` is 2, and `castFate('yelena', 'live', 'x', 'x')` returns `'live'` without throwing.

- [ ] **Step 2: Run to verify they fail.** Run `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/cast.test.js`. Expected: the new tests fail with `castFate is not defined`; existing tests pass.

- [ ] **Step 3: Implement `js/fate.js` and link it.** Behavior of `castFate`:
  - Already dead: return `'die'`, change nothing.
  - `'die'` with `castLiving().filter(k => k !== key).length < CAST_FLOOR`: treat as `'mark'`.
  - `'mark'`: push `{ text: markText, day: G.state.day }` onto `rec.marks` (create the array if missing); lower `p.skills[p.role]` by one to a minimum of 0; set `p.xp[p.role] = SKILL_STEPS[p.skills[p.role]]`; set `p.skill = p.skills[p.role]`.
  - `'die'` (floor passed): set `rec.status = 'dead'`; filter the person's id out of `G.state.crew`; delete `G.state.injured[id]`; for each ship in `fleet()` whose `captain.pid` is that id, replace the captain with a fresh registered `makeCrewCandidate(G.state.systemId)` person with `opinion = 1`, using the same `{ pid, wage, skill }` shape as `relieveCaptain` in `js/company.js`; push `{ key, day: G.state.day, place: system().name, cause }` onto `G.state.memorial` (create the list if missing).
  - Return the outcome actually applied. Keep the person record in `G.state.people`.

- [ ] **Step 4: Run to verify they pass.** Same command. Expected: all `tests/cast.test.js` tests pass. Also run `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/globals.test.js`. Expected: pass.

- [ ] **Step 5: Commit.** `git add js/fate.js index.html tests/cast.test.js && git commit -m "Add castFate: marks, death, memorial and the two-survivor floor"` with the attribution lines.

---

### Task 2: Guards for the dead

**Files:**
- Modify: `js/cast.js` (`castDue`, `castReturn`)
- Test: `tests/cast.test.js`

**Interfaces:**
- Consumes: `castDead(key)` from Task 1.
- Produces: no new names.

- [ ] **Step 1: Write the failing tests.**
  - `a dead character is never offered a meeting, and the next one is not stuck behind them`: `start()` (Earth owner), `G.state.crew = []`, `castRec('ines').status = 'dead'`. At `G.state.day = 6`, `castDue()` is null; at `G.state.day = 14`, `castDue()` is `'tomas'`.
  - `a dead character is not returned to the crew`: Mars hired start with `addThird()`, `castFate('yelena', 'die', 'x', 'x')`, then `castReturn(person('c:yelena'))`. Assert `G.state.crew` excludes `'c:yelena'`.

- [ ] **Step 2: Run to verify they fail.** Expected: the first returns `'ines'` or `null` for `'tomas'`; the second finds her back in the crew.

- [ ] **Step 3: Implement.** In `castDue`, skip any key where `castDead(key)` is true before calling `castRec`, and when the preceding key is dead treat that prior meeting as settled in the "set order" check. In `castReturn`, return immediately when `p.cast && castDead(p.cast)`.

- [ ] **Step 4: Run to verify they pass.** `node --test tests/cast.test.js`, then `node --test tests/captaincy.test.js tests/castbar.test.js`. Expected: pass.

- [ ] **Step 5: Commit** `Core characters who have died are not offered or returned`.

---

### Task 3: Ship loss through the floor

**Files:**
- Modify: `js/fate.js` (add `castShipLoss`), `js/legacy.js:29-36`
- Test: `tests/cast.test.js`

**Interfaces:**
- Consumes: `castFate`, `castAboard()` (`js/cast.js`), `castReturn`.
- Produces: `castShipLoss(cause: string): { dead: string[], saved: string[] }`. For every core character in `G.state.crew` it calls `castFate(key, 'die', cause, 'Pulled from the wreck.')`, in crew order, and reports who died and who the floor spared.

- [ ] **Step 1: Write the failing tests** (call `succeed('died')` directly through `ev`; `tests/frontier.test.js:49` shows the legacy setup):
  - `a lost ship with only the pair aboard spares both`: Mars hired start, `succeed('died')`. Assert both `castDead('yelena')` and `castDead('ruben')` are false, each has one mark with text `'Pulled from the wreck.'`, both ids are in `G.state.crew`, both person records still exist in `G.state.people`, and `G.state.memorial` is missing or empty.
  - `a lost ship with three core characters aboard kills at most one`: Mars hired start, `castJoin('ines', '')` to put a third aboard, `succeed('died')`. Assert exactly one of the three is dead, the other two are alive and marked, `G.state.memorial.length` is 1, and `G.state.memorial[0].cause` starts with `'Lost with'`.
  - `a lost ship with no core characters aboard is unchanged`: start `{ mode: 'hired' }` on Earth, `G.state.crew = []`, `succeed('died')`. Assert `G.state.crew` is `[]` and `G.state.memorial` is missing or empty.

- [ ] **Step 2: Run to verify they fail.** Expected: the pair test finds both removed from the crew with no marks.

- [ ] **Step 3: Implement.** Add `castShipLoss` to `js/fate.js`. In the `died` branch of `succeed` in `js/legacy.js`: record the crew count, call `castShipLoss(\`Lost with ${oldShip}.\`)`, keep the ids of surviving core characters, delete only the other crew people records (as it does now), and after the `Object.assign(st, { crew: [], ... })` set `st.crew` to the kept ids. The "lost" count in the notes is the original crew count minus the kept survivors. Add one note line naming the survivors as pulled from the wreck.

- [ ] **Step 4: Run to verify they pass.** `node --test tests/cast.test.js tests/frontier.test.js`. Expected: pass.

- [ ] **Step 5: Commit** `A lost ship takes core characters through the floor and the memorial`.

---

### Task 4: Yelena's pivot, "Over the Hull"

**Files:**
- Modify: `js/cast.js` (`CAST.yelena.scenes`, `castNext`, a helper), `tests/cast.test.js`

**Interfaces:**
- Consumes: `castFate`, `roleHolder('medic')` (`js/crew.js`), `ship()`, `castLike`, `castFlag`.
- Produces: `castHullPoints(backup: boolean): number` (0 to 4 points: a medic who is not injured; `G.state.armor > ship().armor * 0.6`; `person('c:yelena').skills.gunner >= 3`; `backup`) and `overTheHull(backup: boolean): string` (maps points to the outcome, calls `castFate('yelena', outcome, \`Went over the hull first near ${system().name}.\`, 'Left hand never closes properly.')`, and returns text matching what `castFate` returned).

- [ ] **Step 1: Write the failing tests and update the existing ones.**
  - In `every authored scene is complete`: a scene named `pivot` needs 3 choices (others 2), and `pivot` joins the list that needs `days > 0`. Change the expected scene count from 30 to 31.
  - In `every choice of every scene runs`: change the expected count from 60 to 63.
  - `the pivot comes after late, after sixty days, and only for Yelena`: Mars hired start, `castRec('yelena').arc = 4`; with `G.state.day = castRec('yelena').since + 59`, `castNext('yelena')` is null; at `+ 60` its `name` is `'pivot'`. With `castRec('ines').arc = 4` on an Earth hired start, `castNext('ines')` is null and does not throw.
  - `the pivot outcome follows the state` (Mars hired start, `addThird()`, then run `CAST.yelena.scenes.pivot.choices[0].run()` after setting state; add a medic with `const m = makeCrewCandidate('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); G.state.crew.push(m.id);`; hull good is `G.state.armor = ship().armor`, low is `Math.floor(ship().armor * 0.5)`):
    - medic, good hull, gunner 3: alive, no marks, no memorial.
    - no medic, good hull, gunner 3: one mark.
    - no medic, low hull, gunner 3: `castDead('yelena')` true and `memorial[0].cause` matches `/^Went over the hull first near /`.
    - no medic, low hull, gunner 3, using `choices[1]` (backup): one mark.
    - no medic, hull exactly `ship().armor * 0.6`, gunner 3: dead (the 60% boundary gives no point).
    - medic present but `G.state.injured[m.id] = true`, low hull, gunner 3: dead.
    - gunner lowered to 2, medic, good hull: one mark.
    - low hull, no medic, gunner 3, pair only (no `addThird`): marked and alive, never dead.
  - `calling it off costs her the bench`: `choices[2].run()` sets `castRec('yelena').flags.benched`, lowers `person('c:yelena').opinion` by 3, leaves her alive with no marks and no memorial.

- [ ] **Step 2: Run to verify they fail.** Expected: counts and the missing scene fail; `castNext('ines')` may throw.

- [ ] **Step 3: Implement.** In `castNext`, extend `order` with `'pivot'` and return null when the named scene does not exist for that character. Add `CAST.yelena.scenes.pivot`: `days: 60`, title `'Over the Hull'`, authored text in her voice (a disabled, armed ship drifts across your path and she asks to lead the boarding; it names the risk without numbers, and the lines about the hull and the medic reflect the real state), and three choices: `'Let her lead'`, `'Send her with a second person'` (with `can: () => G.state.crew.length >= 2`) and `'Call it off'`. Outcomes: 3 or more points live, exactly 2 marked, 0 or 1 die. Live and marked each give `castLike('yelena', 2, ...)`. A death gets one short aftermath beat in the returned text and no like. Calling it off sets the `benched` flag and `castLike('yelena', -3, ...)`. Her `promised` flag changes wording only.

- [ ] **Step 4: Run to verify they pass.** `node --test tests/cast.test.js`. Expected: pass.

- [ ] **Step 5: Commit** `Add Yelena's pivot, Over the Hull`.

---

### Task 5: Roadmap note and the full suite

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1:** Add one line to `ROADMAP.md` under milestone 3 or a new "Narrative" heading: the life and loss foundation (marks, death, memorial, two-survivor floor) is done, with Yelena's pivot as proof; the third core characters, remaining pivots and the endings follow.
- [ ] **Step 2: Run the full suite.** `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. Expected: all tests pass.
- [ ] **Step 3: Commit and push.** Commit `Note the life and loss foundation in the roadmap`, then `git push -u origin ccr-56b9a0c9-x4nelr`. Update `.claude/heartbeat.json` to `done`.
