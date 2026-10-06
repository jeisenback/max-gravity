# The Ship Is the Interface, Step 2: The Remaining Pages and the Layout Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put every landed page on the rail, hide the pages a hired hand cannot use, fix the layout problems in #263, #264, #265 and #268 once, and turn the shell on by default in the narrow build.

**Architecture:** The rail table from step 1 (`js/shell.js`) gains the remaining entries and a `shown` rule next to `ready`, so a page that can never be used is not drawn and a page that is waiting is drawn shut with its reason. The layout fixes are shared rules in `style.css` plus two small markup changes. Each task is covered by tests that fail first.

**Tech Stack:** Vanilla JS classic scripts in one global scope, no build step. Tests are Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-05-ship-interface-design.md`, "Build order", step 2. Step 1 is in `main` (`js/shell.js`, #317 to #319). Issue: #320.

## Global Constraints

- No framework, no bundler, no build step.
- Classic scripts share one global scope: every new top-level name must be unique (`tests/globals.test.js` enforces it).
- Rail buttons keep `data-action="tab"` and `data-arg`, so existing selectors keep matching.
- An unknown page id falls back to Port.
- A disabled entry shows its reason as visible text, not a tooltip (#264, #287).
- The full build behind `?scope=full` keeps every page it reaches today: Exchange and Company stay on the rail for an owner.
- The flag turns on by default in the narrow build at the end of this step, and stays off in the full build until cutover (spec, decision 10).
- No emojis anywhere (code, text, docs, commits).
- Heartbeat: read `.claude/heartbeat.json` before editing, update it at each step, never commit it (CLAUDE.md).
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`. One file: replace `npm test` with `node --test tests/shell.test.js`.

## Scope decisions

- **Rooms to pages.** Each rail entry is a page that exists today. Bridge opens Navigation (`nav`), Comms is its own entry (`comms`), Gunnery is the Weapons page (`weapons`), Engine is the shipyard and engineer page (`shipyard`), Crew holds the berths and galley (`crew`), Bonds (`web`) and Journal (`journal`) are their own entries, as the Interior station's tabs are today. The hold and the medbay have no page, so they are not on the rail yet.
- **Owner pages.** Exchange (`trade`) is hidden for a hired hand. Company (`company`) is hidden for a hired hand and when `scopeOff('owner')`. Both stay in the Ashore group for an owner.
- **Out of this plan.** #262 (transit overlaps) belongs to the burn view, step 5. #296 parts 2 and 3 (the Suggest buttons shut when the captain would not listen, and empty Missions headings) change page content, not the shell, and stay in #296. Canvas text sizes (the rest of #265) wait for step 5.

## Review Focus

1. **An owner can still reach Exchange and Company with the shell on; a hired hand cannot see them.** Pinned in Task 1.
2. **A page with a missing service** (no yard, no work board, no exchange) is shown shut with the reason, not missing and not a silent dead button. Pinned in Task 1.
3. **A name never splits across lines**: "Captain Hester Vance's run" and the header's "Capt. Hester Vance", at 390px and 1280px. Pinned in Task 2.
4. **No visible text under 12px** on any shell page at 390px, outside the tester tools. Pinned in Task 3.
5. **The default flips safely**: the narrow build opens the shell by default, the full build does not, and an older `UI.tab` value falls back to Port. Pinned in Task 5.

---

## File Structure

- `js/shell.js` (modify): the full rail table, `shown`, `railEntries`, the extended page registry.
- `js/hired.js` (modify): the captain's run label (`runHtml`).
- `js/ui.js` (modify): the header's captain name (`headerHtml`).
- `js/suggest.js` (modify): the Suggest row markup (`swayHtml`).
- `style.css` (modify): a `.nowrap` rule, the text-size floor, the dock and Suggest rows.
- `js/build.js` (modify): the flag's default.
- `tests/helpers.js` (modify): the `shell` option's default.
- `tests/shell.test.js` (modify).
- `README.md` (modify): the shell line.

---

### Task 1: The full rail table, with pages that can never be used hidden

**Files:**
- Modify: `js/shell.js`
- Test: `tests/shell.test.js`

**Interfaces:**
- Consumes: `tabReady(p, id)` (`js/bridge.js`), `hired()`, `scopeOff(feature)` (`js/build.js`), the step 1 names `RAIL`, `SHELL_PAGES`, `railEntryHtml`, `railHtml`, `shellTab`, `shellHtml`.
- Produces: `RAIL` entries gain `shown: (p: Planet) => boolean`. `railEntries(p: Planet): Entry[]` returns the entries whose `shown(p)` is true, in table order. `railHtml` draws only `railEntries(p)`. `SHELL_PAGES` registers `nav`, `comms`, `weapons`, `shipyard`, `web`, `journal`, `missions`, `trade` and `company` as well as the step 1 pages.

- [ ] **Step 1: Write the failing tests** in `tests/shell.test.js`, and change the step 1 test `'the rail shows the ship group and the Ashore group'` to expect the new list:
  - `'a hired gunner's rail has the ship's pages and three Ashore pages, and no owner pages'`: names are `['Bridge', 'Comms', 'Gunnery', 'Engine', 'Crew', 'Bonds', 'Journal', 'Port', 'Missions', 'Bar']`, groups are seven `'Ship'` then three `'Ashore'`, and `Exchange` and `Company` are absent.
  - `'an owner's rail keeps Exchange and Company in the Ashore group'`: with `open({ shell: true })` and `startGame({ slot: 1, background: 'earth', mode: 'owner', captain: 'Sam Rowe' })`, the names include `Exchange` and `Company`, both in `'Ashore'`.
  - `'every rail entry opens its page'`: for each enabled entry of a hired gunner's rail, click `.rail [data-action=tab][data-arg=<tab>]`; `UI.tab` equals the entry's tab, the active button's `data-arg` equals it, and `.shell .body` is not empty. `done()` fails the test on any page error.
  - `'an entry for a service this port lacks is shut and says why'`: find a planet in `SYSTEMS` with none of `shipyard`, `outfitter` or `missions` in its `services` (the test fails loudly if there is none); `RAIL.find(e => e.id === 'engine').ready(planet)` is a string, and `railEntryHtml(engine, planet, 'port')` contains `disabled` and that string as text.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/shell.test.js`. Expected: the four new tests FAIL.
- [ ] **Step 3: Implement the table** in `js/shell.js`. Ship group, in order: Bridge (`nav`), Comms (`comms`), Gunnery (`weapons`), Engine (`shipyard`, ready: `tabReady(p, 'shipyard') || 'No shipyard here'`), Crew (`crew`), Bonds (`web`), Journal (`journal`). Ashore group: Port (`port`), Missions (`missions`, ready: `tabReady(p, 'missions') || 'No work board here'`), Bar (`bar`), Exchange (`trade`, shown: `!hired()`, ready: `tabReady(p, 'trade') || 'No exchange at this port'`), Company (`company`, shown: `!hired() && !scopeOff('owner')`). Every other entry has `shown: () => true`. Register the pages in `SHELL_PAGES` and add `railEntries`.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/shell.test.js tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add js/shell.js tests/shell.test.js
git commit -m "Put every landed page on the rail, and hide the owner pages from a hired hand"
```

---

### Task 2: A name never splits, and the possessive sits on its name (#263)

**Files:**
- Modify: `js/hired.js` (the run label in `runHtml`), `js/ui.js` (`headerHtml`), `style.css`
- Test: `tests/shell.test.js`

**Interfaces:**
- Consumes: `personLink(c)` (`js/character.js`), `UI.headerHtml(p)` (step 1).
- Produces: a `.nowrap` utility class (`white-space: nowrap`).

- [ ] **Step 1: Write the failing test** `'the captain's name and run label do not split or gap, at 390 and 1280'`, run at both widths, with the shell on and a hired gunner:
  - The label `.post .eyebrow`: its text with whitespace collapsed, lower-cased, starts with `captain hester vance's run`.
  - The name button inside it has `getClientRects().length === 1`.
  - The gap between the name button's right edge and the start of the apostrophe, measured with a `Range` over the text node that follows the button, is at most 2px.
  - In the header, the captain name element `.stats .nowrap` has `getClientRects().length === 1`.
- [ ] **Step 2: Run it to see it fail.** Run: `node --test tests/shell.test.js`. Expected: FAIL (no `.nowrap` span, and a gap before the apostrophe).
- [ ] **Step 3: Implement.** In `runHtml`, wrap `Captain ${personLink(...)}'s` in `<span class="nowrap">`, so the possessive travels with the name, and remove any padding or letter-spacing that opens the gap on the link inside the uppercase label. In `headerHtml`, wrap `Capt. ${first} ${last}` (both escaped, as now) in `<span class="nowrap">`. Add `.nowrap { white-space: nowrap; }` to `style.css`.
- [ ] **Step 4: Run the test, then take two screenshots** (1280x800 and 390x844) of the Port page to the scratchpad and look at the label. Expected: PASS, and the label reads "Captain Hester Vance's run" with no gap.
- [ ] **Step 5: Commit.**

```bash
git add js/hired.js js/ui.js style.css tests/shell.test.js
git commit -m "Keep the captain's name and the possessive together in the run label and the header (#263)"
```

---

### Task 3: A text-size floor of 12px (#265)

**Files:**
- Modify: `style.css`
- Test: `tests/shell.test.js`

**Interfaces:**
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing tests:**
  - `'no visible text on a shell page is under 12px at 390px'`: with `open({ shell: true, viewport: { width: 390, height: 844 }, mobile: true })` and a hired gunner, click each enabled rail entry; for every element under `#panel` that has a direct non-empty text node and is visible (`offsetParent !== null`), `getComputedStyle(el).fontSize` is at least 12. The assertion lists the offenders as `tag.class size`, and ignores anything inside `#uat`.
  - `'the rail fits at 360px'`: the existing `layout()` checks (`noSideScroll`, `buttonsOnScreen`) hold at a 360x740 viewport.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/shell.test.js`. Expected: the size test FAILS, listing the offenders.
- [ ] **Step 3: Implement** in `style.css`: raise every `font-size` of 9px, 9.5px, 10px or 11px to 12px, except inside the `#uat` rules (the tester tools) and the `.con-` canvas-adjacent readouts that step 5 reworks. This includes the `.tabs` rules at 420px and under, `th`, `.tag`, `.scene-face`, `.trow.thead`, `.menu .hint`, `.char-chip`, `.char-tag`, and the shell's own `.rail-group h3` and `.rail-why`. Where a row no longer fits at 360px, shorten the label; do not shrink the text.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/shell.test.js tests/ui.test.js`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add style.css tests/shell.test.js
git commit -m "Set a floor of 12px for visible text (#265)"
```

---

### Task 4: Content clear of the dock, and Suggest rows that line up (#268)

**Files:**
- Modify: `js/suggest.js` (`swayHtml`), `style.css`
- Test: `tests/shell.test.js`

**Interfaces:**
- Consumes: `swayHtml()` (`js/suggest.js`).
- Produces: a `.suggest-row` class on each suggestion's row.

- [ ] **Step 1: Write the failing tests:**
  - `'the last item can be scrolled clear of the dock at 390px'`: on the Port page, set `.shell .body` `scrollTop` to its `scrollHeight`; the bottom of the last element child of `.shell .body` is at or above the top of `.dock` (within 1px).
  - `'the Suggest buttons line up at 1280px and stack at 390px'`: with the default Hester run (three alternatives are shown), the `.suggest-row button` elements all have the same left edge at 1280px (within 1px); at 390px each button is as wide as its row and sits below its text.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/shell.test.js`. Expected: the Suggest test FAILS. If the scroll test already passes, keep it as a pin and say so in the commit body.
- [ ] **Step 3: Implement.** In `swayHtml`, add `class="row suggest-row"` to each row. In `style.css`, `.suggest-row` is a two-column grid (text, then a fixed-width button column) from 700px up, and one column with a full-width button below it under 700px. Add bottom padding to `.shell .body` equal to the dock height and a short fade above the dock only if the scroll test needs it.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/shell.test.js tests/suggest.test.js`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add js/suggest.js style.css tests/shell.test.js
git commit -m "Lay the Suggest rows out in two columns, and keep content clear of the dock (#268)"
```

---

### Task 5: Turn the shell on by default in the narrow build

**Files:**
- Modify: `js/build.js`, `tests/helpers.js`, `README.md`
- Test: `tests/shell.test.js`

**Interfaces:**
- Consumes: `BUILD.scope`, `shellOn()` (step 1).
- Produces: `BUILD.shell` is `'on'` when the address says `shell=on`, `'off'` when it says `shell=off`, and otherwise `'on'` in the `earth-hired` scope and `'off'` in `full`. `open({ shell })` takes `true` (adds `shell=on`), `false` (the default, adds `shell=off`) or `'default'` (adds nothing, so the build's own default applies). The environment variable `SHELL_TESTS=on` changes the helper's default from `false` to `true`.

- [ ] **Step 1: Write the failing test** `'the shell is on by default in the narrow build and off in the full build'`: `open({ scope: 'earth-hired', shell: 'default' })` gives `shellOn() === true`; `open({ scope: 'full', shell: 'default' })` gives `false`; and with the narrow default, `UI.tab = 'nav'; UI.render()` falls back to Port (the older-value case).
- [ ] **Step 2: Run it to see it fail.** Run: `node --test tests/shell.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the default in `js/build.js` and the option in `tests/helpers.js` as above. Update the README line for `js/shell.js`: on by default in the narrow build, `?shell=off` for the old screens.
- [ ] **Step 4: Run the full suite both ways.** Run: `npm test`, then `SHELL_TESTS=on npm test`. Expected: the first PASSES, with the same count plus the new tests. The second is a report, not a gate: write the names of the tests that fail with the shell on as a comment on #324 (the cutover plan), since those tests select on the old markup.
- [ ] **Step 5: Look at it.** With Playwright, open `index.html` (the narrow build, no query) at 1280x800, 768x1024 and 390x844, start a hired game, and save a screenshot of the Port, Crew and Bar pages at each width to the scratchpad. Check by eye that nothing is clipped or overlapping, and note what you saw in the commit body.
- [ ] **Step 6: Commit.**

```bash
git add js/build.js tests/helpers.js tests/shell.test.js README.md
git commit -m "Turn the shell on by default in the narrow build"
```

---

## Self-Review

- **Spec coverage (step 2):** the remaining pages registered (Task 1), the owner pages hidden for a hired hand and kept for an owner (Task 1), a disabled reason (Task 1, #264), the name fix (Task 2, #263), the text floor (Task 3, #265), the dock and Suggest rows (Task 4, #268), and the flag on by default in the narrow build (Task 5, decision 10). Not here by design: #262 (step 5), #296 parts 2 and 3, canvas text, the bottom strip and tablet breakpoint (step 4).
- **Type consistency:** `shown`, `railEntries`, `railEntryHtml`, `SHELL_PAGES`, `shellTab`, `.nowrap`, `.suggest-row` and the `shell` option values (`true`, `false`, `'default'`) are used with the same names in every task.
- **Known risk:** raising text sizes (Task 3) can overflow rows that were tuned at 11px. The tests catch side scroll at 360 and 390, and the fix is a shorter label, not a smaller font.
- **Proportion:** the plan holds signatures, test names, assertions and values, not bodies.
