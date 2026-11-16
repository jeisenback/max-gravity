# Testing What the Player Does and Sees: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make a dead button, a wrong number on screen or a broken core loop fail a test that is about it.

**Architecture:** Four additions to the existing `node --test` suite and its tools, no new framework: a static check that every
player action is pressed by a test (`tools/actions.js`, `tests/actions.test.js`), a planted-bug runner (`tools/mutants.js`,
`tools/mutants.json`, a nightly workflow), five interface-only player-path tests (`tests/journey-*.test.js` on a small
`tests/journey.js`), and value checks beside the golden-copy tests. Two rules go into CLAUDE.md.

**Tech Stack:** Node 22 `node:test`, Playwright through `tests/helpers.js` (`open`, `ev`, `done`), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-11-16-testing-behavior-design.md`

## Global Constraints

- Build on main as it stands; nothing existing is rewritten for this. Old tests move to the new rules only when opened for another reason.
- No emojis anywhere (code, text, docs, commits). Desktop only: viewports at least 1000 px wide.
- Before code changes, read and write `.claude/heartbeat.json` as CLAUDE.md says; it is never committed.
- Run the full suite before each push: `CHROMIUM_PATH=<headless shell> npm test` (on the current containers the shell is
  `/opt/pw-browsers/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell`).
- Each journey test runs in under 60 s.
- Commits end with the session's attribution lines.
- One pull request per task group: Task 1-2, Task 3, Task 4-8, Task 9, Task 10.

## Owner's open questions, and the defaults this plan takes

The spec left three questions open. The plan takes these defaults; each is one line to change if the owner rules otherwise.

- Nightly cost: every planted bug runs nightly, one runner each (Task 3).
- Exemptions: the parked owner game's actions are exempt as a group, with the reason `owner game, parked (ROADMAP.md)` (Task 1).
- Save and reload stay in the port journey (Task 8).

## Review Focus

- A `data-action` written as a template value (`data-action="${a}"`) is invisible to a text scan: the check must list such
  sites instead of passing silently (Task 1, test `a computed data-action is reported, not skipped`).
- The T key does three things by context (take off, sail, the night ashore): a test that sends T must count as pressing all
  three, or the check reports false gaps (Task 1, test `a T key press counts for takeoff, sail and night`).
- A planted bug whose text has moved away from the game: the runner must fail naming it, not report it caught (Task 3, test
  `a bug whose text is gone fails the run by name`).
- The runner started on a working tree with uncommitted changes in `js/` would restore them away with `git checkout`: it must
  refuse to start (Task 3, test `refuses to run on uncommitted changes in js/`).
- A journey that waits with fixed sleeps is slow and flaky: journeys wait on visible text or a button's state, and the burn
  is run ahead with its key (Task 4, the helper's `waitText`; no `waitForTimeout` in any journey file, checked in Task 4).

---

### Task 1: The button check

**Files:**
- Create: `tools/actions.js` (the scanner, pure functions, usable from Node)
- Create: `tests/actions.test.js`
- Modify: `CLAUDE.md` (Tests section, one sentence)

**Interfaces:**
- Produces: `declaredActions(jsSources: Array<{file, text}>) -> { names: Set<string>, computed: Array<{file, line}> }`;
  `pressedActions(testSources: Array<{file, text}>) -> Set<string>`; `KEY_ACTIONS = { KeyT: ['takeoff', 'sail', 'night'] }`.

- [ ] **Step 1: Write the scanner's own tests (on small strings) in `tests/actions.test.js`**

```js
test('an M.action and a data-action are both declared', () => {
  const d = declaredActions([{ file: 'js/a.js', text: "M.action('sail', f); `<button data-action=\"night\">`" }]);
  assert.deepEqual([...d.names].sort(), ['night', 'sail']);
});
test('a computed data-action is reported, not skipped', () => {
  const d = declaredActions([{ file: 'js/a.js', text: 'x\n`<button data-action="${a}">`' }]);
  assert.deepEqual(d.computed, [{ file: 'js/a.js', line: 2 }]);
});
test('a click or a key press on a data-action selector counts; naming it alone does not', () => {
  const p = pressedActions([{ file: 't.js', text: "await page.click('[data-action=sail]'); assert.equal(await page.$('[data-action=refuel]'), null);" }]);
  assert.ok(p.has('sail')); assert.ok(!p.has('refuel'));
});
test('a T key press counts for takeoff, sail and night', () => {
  const p = pressedActions([{ file: 't.js', text: "window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));" }]);
  assert.deepEqual(['night', 'sail', 'takeoff'].filter(a => p.has(a)), ['night', 'sail', 'takeoff']);
});
```

A press is a selector naming `data-action=X` (quoted or not, with or without `[data-arg=...]`) inside `page.click(`,
`page.dblclick(`, `locator(...).click(`, `.click()` on a `querySelector` in page code, or a key: `page.keyboard.press('t'|'T')`
or a `KeyboardEvent` with `code: 'KeyT'`.

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/actions.test.js`. Expected: FAIL, `Cannot find module '../tools/actions'`.

- [ ] **Step 3: Implement `tools/actions.js`** with the three exports above. `declaredActions` reads `M.action('name'` and
  `data-action="name"` (and single-quoted and backtick forms); a `data-action` whose value starts with `${` goes to `computed`.

- [ ] **Step 4: Run them and see them pass.** Run: `node --test tests/actions.test.js`. Expected: 4 pass.

- [ ] **Step 5: Add the real check to `tests/actions.test.js`**

It reads every `js/**/*.js` and every `tests/*.test.js` except `tests/editor*` and itself, and holds two maps, each name to a
reason: `EXEMPT` (the parked owner game's actions, the tester tools in `js/uat.js`, actions only `scope: 'full'` shows) and
`PENDING` (actions a test should press and none does yet). Three assertions:

```js
test('every player action is pressed by a test, or exempt with a reason', () => {
  const missing = [...declared.names].filter(a => !pressed.has(a) && !(a in EXEMPT) && !(a in PENDING));
  assert.deepEqual(missing, [], 'press it in a test, or add it to EXEMPT with its reason');
});
test('PENDING only shrinks: an action pressed now is taken off it', () => {
  assert.deepEqual(Object.keys(PENDING).filter(a => pressed.has(a)), []);
});
test('every EXEMPT and PENDING name is still an action the game declares', () => {
  assert.deepEqual([...Object.keys(EXEMPT), ...Object.keys(PENDING)].filter(a => !declared.names.has(a)), []);
});
test('every computed data-action site is listed with the names it can take', () => {
  assert.deepEqual(declared.computed.filter(c => !COMPUTED[`${c.file}:${c.line}`]), []);
});
```

`COMPUTED` maps each `file:line` site to the action names it can produce, which join `declared.names`.

- [ ] **Step 6: Fill EXEMPT, COMPUTED and PENDING from the first run**

Run: `node --test tests/actions.test.js`, then read each missing name's code. A name goes in `EXEMPT` only with a reason a
reader can check (the narrow build's `SCOPE_OFF` in `js/build.js`, the owner game behind `role()`, `js/uat.js`). Everything
else goes in `PENDING` with the screen it is on. Expected afterwards: all pass. The review counted 112 actions, 58 pressed.

- [ ] **Step 7: Add to CLAUDE.md, Tests:** "Every player action (`M.action`, `data-action`) is pressed by some test or listed in
  `EXEMPT` in `tests/actions.test.js` with its reason; `PENDING` only shrinks."

- [ ] **Step 8: Run the full suite, commit, push.**

```bash
git add tools/actions.js tests/actions.test.js CLAUDE.md
git commit -m "Every player action is pressed by a test, or exempt with a reason"
```

### Task 2: Empty PENDING

**Files:**
- Modify: the existing test file nearest each pending action (the one that already opens that screen), and `tests/actions.test.js`

**Interfaces:**
- Consumes: `PENDING` from Task 1.

- [ ] **Step 1: For each name in PENDING,** add a press to the test that already reaches its screen: click the button (or
  send its key) and assert what the press visibly does (a page opens, a line appears, a count on screen changes). A press with
  no assertion on its effect does not count as done.
- [ ] **Step 2: Remove the name from PENDING.** Run: `node --test tests/actions.test.js <the edited file>`. Expected: pass.
- [ ] **Step 3: Repeat until PENDING is empty, committing every few names** (`git commit -m "Press <names> in their tests"`).
- [ ] **Step 4: Delete the `PENDING` map and its test.** Run the full suite. Commit, push.

### Task 3: The planted-bug runner

**Files:**
- Create: `tools/mutants.js`, `tools/mutants.json`, `tests/mutants.test.js`, `.github/workflows/mutants.yml`
- Modify: `CLAUDE.md` (Tests section, one sentence)

**Interfaces:**
- Produces: `loadMutants(file) -> Array<{ name, file, find, replace, min = 1, by = [] }>`;
  `applyMutant(root, m) -> void` (throws `"<name>: text not found"` or `"<name>: text found <n> times"` unless found once);
  `restore(root, file) -> void` (`git checkout -- <file>`); `failedTests(tap: string) -> string[]` (the names on `not ok` lines);
  CLI `node tools/mutants.js [--only <name>] [--list]`, exit 0 only when the clean run passes and every bug is caught by at
  least `min` tests and by every test whose name contains a `by` entry.

- [ ] **Step 1: Write `tests/mutants.test.js`**

```js
test('a bug applies once and restores', () => { /* temp git repo, one js file; applyMutant then restore; file back byte for byte */ });
test('a bug whose text is gone fails the run by name', () => {
  assert.throws(() => applyMutant(tmp, { name: 'gone', file: 'js/a.js', find: 'nope', replace: 'x' }), /gone: text not found/);
});
test('refuses to run on uncommitted changes in js/', () => { /* temp repo with a dirty js/ file; the CLI exits 2 with "js/ has uncommitted changes" */ });
test('failedTests reads the names of the failing tests from TAP', () => {
  assert.deepEqual(failedTests('ok 1 - a\nnot ok 2 - b c\n# fail 1'), ['b c']);
});
```

- [ ] **Step 2: Run, see it fail.** Run: `node --test tests/mutants.test.js`. Expected: FAIL, module not found.

- [ ] **Step 3: Implement `tools/mutants.js`.** The suite run is `npm test` with `CHROMIUM_PATH` passed through, TAP read from
  stdout. The clean run comes first; a failing clean run exits 1 before any bug is applied. Each bug is restored in a
  `finally`.

- [ ] **Step 4: Write `tools/mutants.json` with the review's six, verbatim:**

| name | file | find | replace |
|---|---|---|---|
| sail-does-nothing | js/hired.js | `if (hired() && chapterOf(G.state) === 1 && !sideBeforeSail()) sail();` | `return;` |
| heat-never-bleeds | js/fight.js | `st.heat = Math.max(0, heat - FIGHT.HEAT_VENT);` | `st.heat = Math.max(0, heat);` |
| fight-damage-not-kept | js/fightui.js | `st.armor = Math.max(1, s.armor0.real - Math.max(0, Math.round((s.armor0.fight - me.armor - HULL_SKIN * me.maxArmor) / (s.armor0.scale \|\| FIGHT.POOL))));` | `st.armor = s.armor0.real;` |
| opinion-backwards | js/people.js | `  p.opinion += n;` | `  p.opinion -= n;` |
| never-saves | js/game.js | `if (G.state && G.mode === 'landed') Saves.write(G.state);` | `if (false) Saves.write(G.state);` |
| savings-shown-zero | js/character.js | ``conRead('Savings', `${fmt(G.state.credits)} cr`)`` | ``conRead('Savings', `${fmt(0)} cr`)`` |

All with `min: 1` and `by: []` for now; Tasks 5 and 9 add `by` to two of them.

- [ ] **Step 5: Run the unit tests, then the tool.** Run: `node --test tests/mutants.test.js` (pass), then
  `node tools/mutants.js` (about 40 minutes). Expected: the clean run passes and all six are caught; the review saw 114, 22,
  10, 6, 1 and 1 failures.

- [ ] **Step 6: Add `.github/workflows/mutants.yml`,** shaped like `.github/workflows/soak.yml`: nightly at a minute other than
  the soak's (`'41 4 * * *'`) and by hand, one matrix job per name from `node tools/mutants.js --list`, each running
  `node tools/mutants.js --only <name>` with a 20-minute timeout.

- [ ] **Step 7: Add to CLAUDE.md, Tests:** "`node tools/mutants.js` plants each bug in `tools/mutants.json` and checks the suite
  catches it (nightly, `.github/workflows/mutants.yml`). A new feature adds one planted bug for what it is most about."

- [ ] **Step 8: Commit, push.**

```bash
git add tools/mutants.js tools/mutants.json tests/mutants.test.js .github/workflows/mutants.yml CLAUDE.md
git commit -m "A planted-bug runner, nightly: the suite must catch each bug in tools/mutants.json"
```

### Task 4: The journey helper and the rules

**Files:**
- Create: `tests/journey.js`, `tests/journey-rules.test.js`
- Modify: `CLAUDE.md` (Tests section, one sentence)

**Interfaces:**
- Consumes: `open`, `closeBrowser` from `tests/helpers.js`.
- Produces: `screen(page) -> Promise<string>` (the visible text of the shell and any open dialog);
  `waitText(page, re: RegExp, ms = 30000) -> Promise<void>`; `button(page, label: string|RegExp) -> Promise<void>` (clicks the
  enabled button whose visible text matches, fails naming the label when none does); `choose(page, label)` (the same, among an
  open scene's choices).

- [ ] **Step 1: Write `tests/journey-rules.test.js`.** For each `tests/journey-*.test.js`: no `waitForTimeout`, no `ev(` after the
  first `button(`, `choose(`, `page.click(` or `page.keyboard.press(` in a test body, and no `G.` inside an assertion.
- [ ] **Step 2: Run it.** Expected: passes with no journey files yet (and fails on a temp file that breaks a rule, written in the test).
- [ ] **Step 3: Implement `tests/journey.js`** with Playwright's `getByRole('button', { name })` for `button` and `choose`.
- [ ] **Step 4: Add to CLAUDE.md, Tests:** "A journey test (`tests/journey-*.test.js`) plays through the interface only:
  `ev()` for setup before the first action, assertions on what the screen shows (`tests/journey-rules.test.js`)."
- [ ] **Step 5: Commit.**

### Task 5: Journey: sign on and sail

**Files:**
- Create: `tests/journey-sail.test.js`
- Modify: `tools/mutants.json` (`sail-does-nothing` gets `by: ["journey: sign on, sail with the captain, arrive"]`)

**Interfaces:**
- Consumes: Task 4's helpers.

- [ ] **Step 1: Write the test `journey: sign on, sail with the captain, arrive`** with `open({ title: true, seed: 1 })`:
  click New game, Hired hand, Gunner, Start (`menuView` new, `menuMode` hired, `menuPost` gunner, `menuStart`, as
  `tests/hired.test.js` does); `waitText(/Signing On/)`; Continue through the opening scenes; assert the port screen shows
  `Sail with the captain`; press it; assert the burn view is up; press `4` (run ahead, `BURN_KEYS.Digit4` in
  `js/burnspeed.js`); `waitText` for the destination's port screen; assert the screen names the arrival port.
- [ ] **Step 2: Run it and see it pass.** Run: `node --test tests/journey-sail.test.js`. Expected: pass in under 60 s.
- [ ] **Step 3: Check it catches the dead button.** Run: `node tools/mutants.js --only sail-does-nothing`. Expected: caught,
  and this test is among the failures.
- [ ] **Step 4: Commit.**

### Task 6: Journey: a ship fight

**Files:**
- Create: `tests/journey-fight.test.js`

- [ ] **Step 1: Write `journey: a ship fight played through the panel to an end`.** Setup with `ev`: an ordinary hired game
  (the `ordinaryGame` of `tests/views.test.js`) and a raider contact opened the way `tests/chaptertwostart.test.js:198` opens
  one (`startShipFight({ kind: 'pirate', shipId: 'raider' }, false)`, then its event shown). Then only the interface: each
  turn, `choose` each gun's order at her hull and end the turn (the choices `tests/fightui.test.js:97` finds with
  `pickAt('gun1', ...)`, found here by their visible labels instead), until the screen shows the fight's close (crippled,
  broken off or the turn cap). Assert the close's line is on screen and that her bars on screen fell from the first turn's.
- [ ] **Step 2: Run, pass** (under 60 s). **Step 3: Commit.**

### Task 7: Journey: a boarding repelled

**Files:**
- Create: `tests/journey-boarding.test.js`

- [ ] **Step 1: Write `journey: boarders repelled through the deck panel`.** Setup with `ev`: an ordinary hired game and a
  repel opened as `tests/boarders.test.js:664` does (`repelEvent({ foe, foeHp: 0, init: 'foe' }, 'full')`, shown). Then only the
  interface: each turn, the hand's act and an order through the deck panel's choices, until the end screen. Assert the end
  line is on screen and the boarders' count on the panel fell.
- [ ] **Step 2: Run, pass. Step 3: Commit.**

### Task 8: Journey: back in port, save and reload

**Files:**
- Create: `tests/journey-port.test.js`

- [ ] **Step 1: Write `journey: back in port, the fight's cost and the pay on screen, and a reload keeps them`.** From the
  fight's end of Task 6 (same setup, played the same way to a close), continue to port. Read from screen: the hull on the
  ship page and the savings on the character page (the page `tests/fixtures/person-you.html` copies). Reload the page
  (`page.reload()`), choose Continue on the title menu (`menuContinue`), and assert both numbers read the same.
- [ ] **Step 2: Run, pass. Step 3: Check the save bug is caught:** `node tools/mutants.js --only never-saves`, this test among
  the failures. **Step 4: Commit, run the full suite, push** (Tasks 4-8 are one pull request).

### Task 9: Golden copies' key numbers

**Files:**
- Modify: `tests/views.test.js` (the golden loops at its `golden markup` section), and the golden tests in
  `tests/ladder.test.js`, `tests/shell.test.js`, `tests/stationparts.test.js`, `tests/menu.test.js`
- Modify: `tools/mutants.json` (`savings-shown-zero` gets `by: ["savings"]`), `CLAUDE.md`

**Interfaces:**
- Produces: in `tests/views.test.js`, `KEY_NUMBERS: { [page]: Array<[label, (state) => string]> }`, each entry the text the page
  must show for a number from the state.

- [ ] **Step 1: Write the failing test `the character page (you) shows the hand's savings from the game`:** after the golden
  compare, `assert.match(text, new RegExp(fmt(credits) + ' cr'))` with `credits` read from `G.state.credits` and `text` the
  page's `innerText`. Each other golden page gets one test per key number the same way; read the fixture to find them (at
  least the port's credits, the shipyard's hull, the missions' pay).
- [ ] **Step 2: Run with the savings bug planted:** `node tools/mutants.js --only savings-shown-zero`. Expected: the savings test
  fails by name.
- [ ] **Step 3: Run clean, pass.** Add to CLAUDE.md, Tests: "A golden-copy test also checks the page's key numbers against the
  game's state, so rewriting the copy cannot carry a wrong number."
- [ ] **Step 4: Commit, run the full suite, push.**

### Task 10: Tuning is asserted through its rule

**Files:**
- Modify: `CLAUDE.md` (Tests section)

- [ ] **Step 1: Add:** "A test asserts a tuned number through its constant or formula (`pool(230)`, `FIGHT.HEAT_VENT`) and keeps a
  literal only for a value the owner has ruled on, naming the ruling's issue in the message. Move a test to this when it is
  opened for another reason."
- [ ] **Step 2: Commit, push.**

## After the plan

File the spec's follow-up as an issue: `npm run test:changed` selected about 180 test files for each one-line game change
during the review (`tools/changed-tests.js`), close to the whole suite.
