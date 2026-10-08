# The Ship Is the Interface, Step 6: Cutover Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shell the only way through the landed screens. The full build shows it too, the old station keys and tab bars are deleted with the flag that chose between them, the tests all run on the one path, and a returning player's cached copy of the old game is dropped.

**Architecture:** Mostly subtraction, in an order that keeps `main` green at every commit. The shell goes on in the full build first (the user-visible cutover, with a test that every page is still reachable). The test suite then moves to the shell file by file while the old path still exists, the helper's default flips, and only then is the old path deleted. Texts that name tabs follow, then the service worker's cache name.

**Tech Stack:** Vanilla JS classic scripts in one global scope, no build step. Tests are Playwright through `tests/helpers.js`, plus one plain Node test for `sw.js`.

**Spec:** `docs/superpowers/specs/2026-10-05-ship-interface-design.md`, "Build order", step 6, and "Risks". Steps 1 to 5 are in `main`. Issue: #324.

## Where the code stands

- **The shell is already on in the shipping build** (`BUILD.shell` is `on` for the narrow scope, `off` for `?scope=full`, `js/build.js:11`). Only the full build draws the old screens, and the test helper opens every test with `shell=off` unless a test asks otherwise, so the old path is what most of the suite runs on.
- **One branch chooses:** `UI.render` (`js/ui.js`) calls `shellHtml` when `shellOn()` is true and otherwise draws the old header, `bridgeKeys(p, tab)`, the page and the dock. `headerHtml` and `dockHtml` are shared by both and stay.
- **Nothing is lost to the shell.** Every tab the old screens reach (`UI.views`: port, trade, missions, crew, shipyard, company, nav, weapons, comms, journal, web, bar, person) has a rail entry or is `person` under Crew. Exchange and Company are on the rail for an owner only (`shown`), as the spec says.
- **To delete (`js/bridge.js`, `js/ui.js`, `style.css`):** `stationOf`, `bridgeKeys`, `bridgeStation`, `TAB_NAMES`, the `station` case in `UI.act`, the old branch of `UI.render`, the `.tabs` rules, and the flag (`BUILD.shell`, `shellOn()`, the `?shell=` address).
- **To keep:** `STATIONS` (the burn's key bar `#bkeys` and its sheets are built from it), `ROOM_SHEETS` and `roomSheet`, `tabReady` (the rail uses it), `BRIDGE_KEYS_H`, and the `tab` action (the rail emits it).
- **`UI.tab` and `G.bridgeOpen`:** `UI.tab` is set in `openLanded`, the `tab` and `station` cases, `character.js` and `interview.js` (the person page, back through `UI.tabBack`) and `uat.js`; every value is in `SHELL_PAGES`. `G.bridgeOpen` is only the burn's sheet state and nothing landed reads it.
- **The suite:** 35 tests fail with `SHELL_TESTS=on` (the list is in the comment on #324), spread over about 25 files that click station keys, read `.tabs` or `data-bst` at port, or set `UI.tab`. Heaviest: `stations.test.js` (19 uses), `ui.test.js` (29), `frontier.test.js` (12), `shell.test.js` (12), `hired.test.js` (9).
- **`sw.js`:** `CACHE` is still `max-gravity-v1`. The step 2 plan said it would be bumped when the shell went on by default; it was not. Install pre-caches only the page, the style sheet and the manifest, scripts are cached on demand, and activate drops every cache whose name is not `CACHE`. No test covers it. No script file becomes empty at cutover, so none is deleted.

## Global Constraints

- No framework, no bundler, no build step.
- Classic scripts share one global scope: no new top-level names except those a task names (`tests/globals.test.js` enforces it).
- The burn view's key bar, its sheets and the tap on a room (step 5) are not touched.
- `main` works at every commit: the suite is green after each task.
- Text is 12px or more, no emojis anywhere (code, text, docs, commits).
- Heartbeat: read `.claude/heartbeat.json` before editing, update it at each step, never commit it (CLAUDE.md).
- Test commands: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` for the full suite before each push; `npm run test:changed` while working; one file: `node --test tests/<file>`.

## Decisions

- **Order of deletion:** shell on in the full build (Task 1); tests moved file by file with the old path still in place (Tasks 2 to 4); the helper's default flipped (Task 5); then the old path and the flag deleted (Task 6); texts and the cache name last (Tasks 7 and 8). Nothing is deleted while a test still depends on it.
- **Which tests run both ways until the last commit:** a test that has been moved passes `shell: true` explicitly and runs on the shell; a test not yet moved keeps the helper's default (the old path). After Task 5 the default is the shell and no test asks for the old path; the two tests about the flag itself are rewritten in Task 6.
- **How a moved test gets to a page:** one helper, `goTo(page, tab)` in `tests/helpers.js`, clicks the rail entry whose `data-arg` is the tab (and fails with the entry's reason if it is shut), so a test names the page, not the markup. The station-key tests (Navigation at port and the like) become rail entries (Bridge, Gunnery, Engine, Comms and so on); the burn's key-bar tests stay as they are.
- **The search for every `UI.tab` and `G.bridgeOpen`:** done above and pinned by a test (Task 6): every literal assigned to `UI.tab` anywhere in `js/` is a key of `SHELL_PAGES`, and no source file contains `data-action="station"`, `stationOf`, `bridgeKeys` or `bridgeStation`.
- **Left out on purpose:** moving the remaining pages (Missions, Journal, Port and the rest) onto the view helpers, which step 3 left to the cutover. It does not change navigation and would double this step; it becomes its own issue (filed in Task 9), and #251 and #309 close for the pages already ported.
- **`sw.js`:** one bump, to `max-gravity-v2` (the issue's "again" does not apply, because the first bump never happened). A Node test loads `sw.js` against a fake `self` and `caches` and checks that activate deletes `max-gravity-v1` and keeps `max-gravity-v2`.

---

### Task 1: The shell on in the full build

**Files:**
- Modify: `js/build.js`
- Test: `tests/shell.test.js`

- [ ] **Step 1: Write the failing test.** `'the full build reaches every page it reached before, through the rail'`: open `?scope=full` with the shell on by default (no `shell=` in the address) as an owner; for every key of `UI.views` assert a rail entry reaches it (`goTo`), or it is `person` (opened from the crew list); Exchange and Company are on the rail for an owner and not for a hired hand. Also `'the address can still turn the shell off'` keeps passing until Task 6.
- [ ] **Step 2: Run it to see it fail.** Expected: FAIL (the full build has no rail).
- [ ] **Step 3: Implement.** `BUILD.shell` defaults to `on` for both scopes; `?shell=off` still works.
- [ ] **Step 4: Run the full suite.** Expected: PASS (every test the helper opens says `shell=off` or `shell=on`; none relies on the build default except those marked `'default'`).
- [ ] **Step 5: Commit.**

```bash
git add js/build.js tests/shell.test.js
git commit -m "Turn the shell on in the full build, and check it reaches every page (#324)"
```

### Task 2: Move the station and screen tests (`stations.test.js`, `ui.test.js`)

**Files:**
- Modify: `tests/helpers.js` (add `goTo`), `tests/stations.test.js`, `tests/ui.test.js`

**Interfaces:**
- Produces: `goTo(page, tab)`: clicks `.rail [data-arg="<tab>"]`, throws with the rail's reason when the entry is disabled.

- [ ] **Step 1:** Add `goTo` and a test for it (an entry that is on the rail opens; a shut one throws its reason).
- [ ] **Step 2:** In each of the two files, move the tests that click station keys or read `.tabs` at port: open with `shell: true`, reach pages with `goTo`, assert on the shell's markup. The burn's `#bkeys` tests do not change.
- [ ] **Step 3: Run each file** with `shell: true` and, until Task 5, check the rest of the file still passes unchanged.
- [ ] **Step 4: Commit.**

```bash
git add tests/helpers.js tests/stations.test.js tests/ui.test.js
git commit -m "Move the station and screen tests to the shell (#324)"
```

### Task 3: Move the crew-screen tests (`captainview`, `web`, `journal`, `handscreens`)

- [ ] **Step 1:** Move the tests named in the #324 comment (Interior's Crew, Bonds and Journal tabs; the captain on Interior; the character screen; a suggested run) the same way: `shell: true`, `goTo`, shell markup. "Interior has Crew, Bonds and Journal tabs, in that order" becomes the rail's Ship group order.
- [ ] **Step 2: Run the four files, then commit.**

```bash
git add tests/captainview.test.js tests/web.test.js tests/journal.test.js tests/handscreens.test.js
git commit -m "Move the crew-screen tests to the shell (#324)"
```

### Task 4: Move the rest (`hired`, `frontier`, `people`, `castbar`, `economy`, and the others that click tabs or stations)

- [ ] **Step 1:** Move the remaining tests the `SHELL_TESTS=on` run lists (buying in, errands, posts, the heir, the bar in every port, outfits, the sideways-overflow test, "names the player types never become markup") and any other file that clicks `data-action="tab"` or `"station"`.
- [ ] **Step 2: Run `SHELL_TESTS=on npm test`.** Expected: only the two flag tests fail.
- [ ] **Step 3: Commit.**

```bash
git add tests
git commit -m "Move the remaining tests to the shell (#324)"
```

### Task 5: The helper's default becomes the shell

Built as: the helper opens with the build's default (the shell) and the options `shell: true` and `'default'` and the `SHELL_TESTS` variable are gone; `shell: false` stays, for the two flag tests only, so `main` stays green. Task 6 removes it with those tests.

**Files:**
- Modify: `tests/helpers.js` and every call site that passed `shell`

- [x] **Step 1:** `open()` opens with the build's default; remove `shell: true` and `shell: 'default'` at the call sites (about 150), and `SHELL_TESTS`; `shell: false` becomes the only value the option takes.
- [x] **Step 2: Run the full suite.** Expected: PASS.
- [x] **Step 3: Commit.**

```bash
git add tests
git commit -m "Open every test on the shell (#324)"
```

### Task 6: Delete the old path and the flag

**Files:**
- Modify: `js/bridge.js`, `js/ui.js`, `js/build.js`, `js/shell.js` (comments), `style.css`
- Test: `tests/shell.test.js`, new `tests/cutover.test.js`

- [ ] **Step 1: Write the failing test.** `tests/cutover.test.js` reads the sources: no file in `js/` contains `data-action="station"`, `stationOf`, `bridgeKeys`, `bridgeStation`, `shellOn` or `?shell=`; every literal assigned to `UI.tab` is a key of `SHELL_PAGES`. Delete the two flag tests in `tests/shell.test.js`.
- [ ] **Step 2: Run it to see it fail.** Expected: FAIL naming each remaining use.
- [ ] **Step 3: Implement.** Delete `stationOf`, `bridgeKeys`, `bridgeStation`, `TAB_NAMES`, the `station` case in `UI.act`, the old branch of `UI.render` (it is now the shell's), `BUILD.shell` and `shellOn()`, and the `.tabs` rules in `style.css` (checking `.tabs` is used nowhere else). Keep what Where the code stands says to keep.
- [ ] **Step 4: Run the full suite.** Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add js style.css tests
git commit -m "Delete the old stations, tabs and the shell flag (#324)"
```

### Task 7: Texts that name tabs

**Files:**
- Modify: `js/help.js`, `js/tutorial.js`, `README.md`
- Test: the tutorial and help tests that assert on those strings

- [ ] **Step 1:** In `js/help.js` (the Port, Exchange, Crew and Company tab lines) and `js/tutorial.js` (including "GUNS tab", which the rail calls Gunnery), say the room, not the tab. In `README.md` update the lines for `bridge.js` and `shell.js` (no flag), `ui.js`, the port-tabs lines and the `portBanner` line.
- [ ] **Step 2: Run `npm run test:changed`**, then the full suite. Expected: PASS.
- [ ] **Step 3: Commit.**

```bash
git add js/help.js js/tutorial.js README.md tests
git commit -m "Name rooms, not tabs, in Help, the tutorial and the README (#324)"
```

### Task 8: The service worker's cache name

**Files:**
- Modify: `sw.js`
- Test: new `tests/sw.test.js` (plain Node)

- [ ] **Step 1: Write the failing test.** Load `sw.js` in `node:vm` with a fake `self`, `caches` and events: `CACHE` is `max-gravity-v2`; the activate handler deletes `max-gravity-v1` and keeps `max-gravity-v2`.
- [ ] **Step 2: Run it to see it fail.** Expected: FAIL (the name is `v1`).
- [ ] **Step 3: Implement.** `const CACHE = 'max-gravity-v2';`.
- [ ] **Step 4: Run it, then commit.**

```bash
git add sw.js tests/sw.test.js
git commit -m "Bump the service worker's cache so a returning player's old copy is dropped (#324)"
```

### Task 9: Close out

**Files:**
- Modify: `ROADMAP.md`

- [ ] **Step 1:** Mark step 6 and the ship interface (#316) done; say what is left (the other pages onto the view helpers, #269's planet-art sliver). File the issue for moving the remaining pages onto `js/views.js`.
- [ ] **Step 2: Final check.** The full suite with `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`, and a run of Task 1's every-page test against `?scope=full` as an owner and as a hired hand.
- [ ] **Step 3:** Comment on and close #264, #265, #268, #263, #262 and #267 if they are still open (#269 stays open), and #251 and #309 for the pages already ported; close #324 and #316.
- [ ] **Step 4: Commit.**

```bash
git add ROADMAP.md
git commit -m "Record step 6 of the ship interface and close #316 (#324)"
```

---

## Self-Review

- **Spec coverage (step 6):** delete the old stations and tabs and the flag (Task 6); the shell in the full build with the owner pages on the Ashore group (Task 1, and the every-page test); tests that select on the old markup moved (Tasks 2 to 5); the README file list and the Help text that names tabs (Task 7); the `sw.js` cache bump and its check (Task 8); a final every-page check on `?scope=full` (Tasks 1 and 9). Not here by design: moving the remaining pages onto the view helpers (filed as its own issue).
- **Decisions made:** the order of deletion; how tests run both ways until Task 5; `goTo` as the one way a test reaches a page; the source scan that pins every `UI.tab` and the removed names; one cache bump.
- **Type consistency:** `goTo(page, tab)` is used the same way in Tasks 1 to 5; `SHELL_PAGES`, `STATIONS`, `ROOM_SHEETS` and `tabReady` keep their names and shapes.
- **Known risks:** the test migration is the bulk of the work and the likeliest place to mis-assert (each moved test keeps its assertion and changes only how it reaches the page); `.tabs` may be used by something other than the old navigation (Task 6 checks before deleting); a service worker's `activate` does not run in the Playwright suite, so the Node test stands in for it; the helper change in Task 5 touches about 35 call sites in one commit, so it is mechanical only, with no assertion edits.
- **Proportion:** the plan holds signatures, test names, assertions and values, not bodies.
