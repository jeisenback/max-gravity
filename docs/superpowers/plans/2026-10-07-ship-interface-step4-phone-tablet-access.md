# The Ship Is the Interface, Step 4: Phone Strip, Tablet Layout and Accessibility Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the shell fit the three screens it is played on (a 1280x800 desktop, a 768x1024 tablet, a 390x844 phone), and make it usable with a keyboard and a screen reader: the rail is a bottom grid on a phone, the HUD sidebar leaves the tablet, the dock shrinks to one row, and focus and announcements follow what the player does.

**Architecture:** Layout changes are CSS rules around the shell's markup (`js/shell.js` and `style.css`), one breakpoint change (`G.hudW` in `js/game.js`) and one removal (the dock's Sound button). Accessibility is a small new script, `js/a11y.js`, with one live region (`#live`), `announce(text)`, and the focus rules the shell and the scene dialog call. A shared width-check helper in the tests runs every rail page at the three sizes. Each task is covered by tests that fail first.

**Tech Stack:** Vanilla JS classic scripts in one global scope, no build step. Tests are Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-05-ship-interface-design.md`, "Build order", step 4. Steps 1 to 3 are in `main`. Issue: #322. Related: #265 (done in step 2), #267 (accessibility), #269 (UI polish).

## Where the code stands

- **Phone (under 700px):** the rail is two or three wrapping rows above the page, and the dock is two rows (Menu, Sound, System map, then Sail). About 230px of an 844px screen is chrome.
- **Tablet (700 to 999px):** `G.hudW = G.W >= 700 ? HUD_W : 0` (`js/game.js`, `resize`), so a 220px HUD sidebar appears from 700px. At 768px the port panel (up to 820px wide) sits over it.
- **Accessibility:** no `aria-live` region and no `aria-modal` anywhere, and nothing moves focus. The Comms feed alone has `role="log"`.
- **Already done:** "Continue" on the title screen (`menuContinue`, #269), the 12px text floor (#265), and the Settings screen's "Sound on" checkbox (`setSound`, `js/menu.js`).

## Global Constraints

- No framework, no bundler, no build step.
- Classic scripts share one global scope: every new top-level name must be unique (`tests/globals.test.js` enforces it). New names: `announce`, `focusPage`, `trapDialog`, `releaseDialog`, `atWidths` (test helper, inside the test file).
- A rail entry keeps `data-action="tab"` and `data-arg`; the old screens (the flag off, the full build) are untouched except where a task says so.
- The full build with `?shell=off` keeps today's layout at every width; the HUD breakpoint change applies to every build, since the HUD is shared.
- Text is 12px or more; a touch target is 44px or more on a phone.
- No emojis anywhere (code, text, docs, commits).
- Heartbeat: read `.claude/heartbeat.json` before editing, update it at each step, never commit it (CLAUDE.md).
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`. One file: replace `npm test` with `node --test tests/layout.test.js`. `SHELL_TESTS=on npm test` is a report, as in steps 2 and 3.

## Decisions

- **The phone strip is a grid, not a scrolling row.** The rail sits between the page and the dock, in rows of five (six or more for an owner), each entry at least 44px high with 12px text. Nothing is hidden and nothing scrolls sideways. The group headings are visually hidden on a phone and kept for screen readers. A shut entry's reason spans the whole grid row beneath its row, so it stays visible text.
- **The dock is one row on a phone:** Menu, System map and the primary action. Sound is not on the dock at any width; it stays in Settings (`setSound`). This is `dockButtons` in `js/audio.js` going away, not moving.
- **The tablet drops the HUD sidebar.** From 1000px the HUD sidebar shows; below it the compact top strip (`drawHudCompact`) is used and the panel has the full width, clear of the strip. From 700px the rail is the 132px column.
- **Where focus goes.** On a room change (a different rail entry), focus moves to the page: `.shell .body` becomes a labelled region (`tabindex="-1"`, `role="region"`, `aria-label` the room's name). A re-render of the same page does not move focus. The active rail entry keeps `aria-current="page"`.
- **Dialogs.** The scene dialog gets `aria-modal="true"`; when it opens, focus goes to its first enabled choice and the opener is remembered; when it closes, focus returns to the opener if it is still on the page, otherwise to the page. A shut choice is not focusable (it is `disabled`).
- **How a screen reader hears a result.** After a choice, the result screen's Continue button takes focus and carries `aria-describedby` pointing at the result text, so it is read when focus lands. Messages (`msg()`) and new Comms lines (`comm()`) go to one polite live region, `#live`, outside `#panel` so a re-render does not drop them. A line is announced once, and a muted line (`isQuiet`) is not announced.
- **How the width checks run.** One helper, `atWidths(fn)`, opens the game at 1280x800, 768x1024 and 390x844 and runs `fn` at each. The shared check per rail page asserts: no sideways scroll; the rail, page and dock boxes do not overlap; the primary action is on screen; the HUD sidebar and the panel do not overlap.
- **Out of scope.** The planet-art sliver at the panel edge (#269, cosmetic), the burn view (step 5), and the old screens' layout.

## Review Focus

Each of these is pinned by a test named in the task:

1. Every rail page fits at 1280x800, 768x1024 and 390x844: no sideways scroll, no overlap, the primary action on screen (Task 1).
2. At 768px no HUD sidebar overlaps the panel, and the panel clears the compact HUD strip (Task 2).
3. On a phone the rail is a grid above the dock, every entry is at least 44px high, and a shut entry's reason is visible (Task 3).
4. The dock is one row on a phone and has no Sound button; Settings still has "Sound on" (Task 4).
5. `msg()` and `comm()` lines reach `#live`, once each, and a muted line does not (Task 5).
6. A room change focuses the page, a same-page re-render does not, and the active entry is announced by `aria-current` (Task 6).
7. A dialog opening focuses its first enabled choice, closing it returns focus, the result's Continue is described by the result text, and a link in text shows a focus ring (Task 6).

## File Structure

- `js/a11y.js` (create): `announce`, `focusPage`, `trapDialog`, `releaseDialog`.
- `index.html` (modify): the `#live` region and the script, loaded before `js/game.js`.
- `js/game.js` (modify): `resize` (the HUD breakpoint), `msg` (announces).
- `js/transit.js` (modify): `comm` (announces).
- `js/ui.js` (modify): `render`, `showEvent`, `showEventResult`, `hide` (focus and dialog attributes).
- `js/shell.js` (modify): the page region and the rail group labels.
- `js/audio.js` (modify): the dock's Sound button goes.
- `style.css` (modify): the phone strip, the one-row dock, the tablet panel offset, a visually-hidden class.
- `tests/layout.test.js` (create): `atWidths` and the width checks.
- `tests/a11y.test.js` (create): the live region and the focus rules.
- `README.md` and `ROADMAP.md` (modify).

---

### Task 1: The width checks, before any layout change

**Files:**
- Create: `tests/layout.test.js`

**Interfaces:**
- Produces: `atWidths(fn)` in the test file: for each of `[1280, 800]`, `[768, 1024]` and `[390, 844]` (the last two with `mobile: true`) it opens `open({ scope: 'earth-hired', shell: 'default', viewport, mobile })`, starts a hired gunner, and runs `fn` there.

- [ ] **Step 1: Write the tests:**
  - `'every rail page fits at the three screen sizes'`: for each size, click each enabled rail entry; assert `document.documentElement.scrollWidth <= innerWidth`; assert the rail, page (`.shell .body`) and dock (`.dock`) boxes do not overlap (the rail and page by position; the dock never covers either); assert `.dock .primary` is inside the viewport.
  - `'the HUD sidebar and the panel do not overlap, and the panel clears the compact strip'`: at 768px, the panel's left edge is at or past the HUD's left edge only if the HUD is drawn (`G.hudW` is 0 below 1000px); with `G.hudW === 0` the panel's top is at least 84px (the compact strip's height) so it does not cover it.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/layout.test.js`. Expected: the second FAILS at 768px, and the first passes at 1280 and 390 and shows what, if anything, fails at 768. Record the failures in the commit body.
- [ ] **Step 3: Commit the tests.** They are red on purpose; Tasks 2 and 3 turn them green. Mark the two failing tests with `test.todo`-style skipping only if the repo's runner needs a green suite per commit, and unskip them in Task 2.

```bash
git add tests/layout.test.js
git commit -m "Check every rail page at 1280, 768 and 390 (#322)"
```

---

### Task 2: The tablet: the HUD sidebar from 1000px

**Files:**
- Modify: `js/game.js` (`resize`), `style.css`
- Test: `tests/layout.test.js`

**Interfaces:**
- Consumes: `HUD_W`, `drawHudCompact` (`js/game.js`).

- [ ] **Step 1:** The Task 1 test is the failing test. Add `'between 700 and 999px the compact HUD is used'`: `G.hudW === 0` at 768, and `HUD_W` at 1000 and 1280 (resize through `page.setViewportSize`).
- [ ] **Step 2: Run it to see it fail.** Expected: FAIL (`G.hudW` is `HUD_W` at 768).
- [ ] **Step 3: Implement.** In `resize`, `G.hudW = G.W >= 1000 ? HUD_W : 0`. In `style.css`, from 700px to 999px the panel's top offset clears the compact strip (`#panel { top: 84px; }` in that range, `bottom: 0`). Check the other users of `G.hudW` (`js/bridge.js` sheet and keys, `js/shiplife.js`, `js/touch.js`) at 768px by eye in the screenshots, and list in the commit body what each does with `hudW` 0.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/layout.test.js tests/ui.test.js tests/burnview.test.js`, then the full suite. Expected: PASS.
- [ ] **Step 5: Screenshots** at 1280x800, 768x1024 and 390x844 (Port, Crew, a burn) to the scratchpad; look by eye and note in the commit body.
- [ ] **Step 6: Commit.**

```bash
git add js/game.js style.css tests/layout.test.js
git commit -m "Show the HUD sidebar only from 1000px, and clear the compact strip on a tablet (#322, #269)"
```

---

### Task 3: The phone strip

**Files:**
- Modify: `style.css`, `js/shell.js`
- Test: `tests/layout.test.js`

**Interfaces:**
- Consumes: `railHtml`, `railEntryHtml` (`js/shell.js`).
- Produces: the rail group markup gains `role="group"` and `aria-label` (the group name); the visible `<h3>` stays, and a `.sr-only` rule hides it on a phone.

- [ ] **Step 1: Write the failing tests:**
  - `'on a phone the rail is a grid between the page and the dock, with every entry at least 44px high'`: at 390px, the rail's top is below the page's bottom and above the dock's top; each `.rail button` has `getBoundingClientRect().height >= 44`; the buttons are in rows (at most six distinct `top` values); no `.rail` horizontal scroll.
  - `'a shut entry's reason is visible text on a phone'`: at a port with no shipyard, the reason `.rail-why` is visible and spans the grid row (its width is the rail's width).
  - `'the rail groups are labelled'`: each `.rail-group` has `role="group"` and an `aria-label` equal to its heading, at every width.
- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement.** Under 700px: `.shell` is a flex column; `.body` has `order: 1`, `.rail` has `order: 2` and is `display: grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr))`; `.rail-group` is `display: contents`; `.rail-group h3` is visually hidden; `.rail button { min-height: 44px }`; `.rail-why { grid-column: 1 / -1 }`. In `railHtml`, add `role="group"` and `aria-label` to each group.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/layout.test.js tests/shell.test.js`, then the full suite both ways. Expected: PASS; the `SHELL_TESTS=on` failures are no higher than before.
- [ ] **Step 5: Screenshots** of the phone at Port, Crew and a port with a shut entry; look by eye.
- [ ] **Step 6: Commit.**

```bash
git add style.css js/shell.js tests/layout.test.js
git commit -m "Make the rail a grid above the dock on a phone (#322)"
```

---

### Task 4: The dock in one row, and Sound out of it

**Files:**
- Modify: `js/audio.js`, `style.css`
- Test: `tests/layout.test.js`

- [ ] **Step 1: Write the failing tests:**
  - `'the dock is one row on a phone and has no Sound button'`: at 390px, every `.dock button` has the same `top` (within 1px); `[data-action=sound]` is not in the dock at 1280 either; the primary button is the widest.
  - `'Sound is still a setting'`: the Settings view has `#setSound`, and toggling it changes `Sfx.on`.
- [ ] **Step 2: Run them to see them fail.** Expected: the first FAILS.
- [ ] **Step 3: Implement.** Remove the `dockButtons` filter and the `sound` action registration's dock use from `js/audio.js` (keep `Sfx.toggle`). In `style.css`, `.dock` is `flex-wrap: nowrap` under 700px with `.dock button { flex: 1 1 0 }` and the primary `flex: 2 1 0`.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/layout.test.js tests/ui.test.js`, then the full suite. Fix any test that clicked the dock's Sound button to click the setting.
- [ ] **Step 5: Commit.**

```bash
git add js/audio.js style.css tests/
git commit -m "Put the dock on one row, and keep Sound in Settings (#322, #269)"
```

---

### Task 5: The live region

**Files:**
- Create: `js/a11y.js`, `tests/a11y.test.js`
- Modify: `index.html`, `js/game.js` (`msg`), `js/transit.js` (`comm`)

**Interfaces:**
- Produces: `announce(text: string): void` sets the text of `#live` (`aria-live="polite"`, `aria-atomic="true"`, visually hidden), clearing it first so a repeated line is read again, and ignoring an empty string.

- [ ] **Step 1: Write the failing tests** in `tests/a11y.test.js`:
  - `'a ship's-log message and a Comms line are announced once'`: `msg('Hull sound.')` makes `#live` read it; `comm('A plume sweeps past.')` during a burn makes it read that; the number of changes to `#live` per call is one.
  - `'a muted Comms line is not announced'`: with `Settings.quiet.market` on, a market rumor is not announced.
  - `'the live region survives a re-render'`: `UI.render()` does not remove or empty `#live`.
- [ ] **Step 2: Run them to see them fail.** Expected: FAIL (no `#live`).
- [ ] **Step 3: Implement.** Add `<div id="live" class="sr-only" aria-live="polite" aria-atomic="true"></div>` after `#panel` in `index.html`, link `js/a11y.js` before `js/game.js`, and call `announce(text)` from `msg` and from `comm` after the muted check. Add `.sr-only` to `style.css` (the standard clip rule).
- [ ] **Step 4: Run the tests.** Run: `node --test tests/a11y.test.js tests/globals.test.js`, then the full suite. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add js/a11y.js index.html js/game.js js/transit.js style.css tests/a11y.test.js
git commit -m "Announce ship's-log and Comms lines through one polite live region (#322, #267)"
```

---

### Task 6: Focus on a room change, and in the scene dialog

**Files:**
- Modify: `js/a11y.js`, `js/ui.js`, `js/shell.js`, `style.css`
- Test: `tests/a11y.test.js`

**Interfaces:**
- Produces: `focusPage(): void` focuses `.shell .body`; `trapDialog(opener)` records the opener and focuses the first enabled choice; `releaseDialog()` returns focus to the recorded opener when it is still in the document, otherwise to the page.

- [ ] **Step 1: Write the failing tests:**
  - `'a room change focuses the page, and a re-render of the same page does not'`: click a different rail entry: `document.activeElement` is `.shell .body`, which has `role="region"` and an `aria-label` of the room; call `UI.render()` again on the same page after focusing something else: that element keeps focus.
  - `'the active rail entry has aria-current'` (a pin; it exists today).
  - `'a scene dialog is modal, takes focus on its first enabled choice, and gives it back'`: `openEvent` with a shut first choice and an open second: `aria-modal="true"`, focus is on the second; after the choice and Continue, focus is on the opener (a rail entry clicked before), or on the page if the opener is gone.
  - `'the result's Continue button is described by the result text'`: after a choice, `document.activeElement` is Continue and its `aria-describedby` element's text is the result.
  - `'a link in text and a link button show a focus ring'`: focus a `button.link` with the keyboard; its computed `outline-style` is not `none`.
- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement.** In `UI.render` (the shell branch), remember `UI.lastTab`; when it differs from `UI.tab`, call `focusPage()` after the render. In `shellHtml`, give `.body` `tabindex="-1"`, `role="region"` and `aria-label`. In `showEvent`, set `aria-modal="true"` on the dialog and call `trapDialog(document.activeElement)`; in `showEventResult`, focus Continue and set `aria-describedby`; in `UI.hide`, call `releaseDialog()`. Add `:focus-visible` rules to `style.css` for `button.link` if the check fails.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/a11y.test.js tests/ui.test.js tests/shell.test.js tests/views.test.js`, then the full suite both ways. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add js/a11y.js js/ui.js js/shell.js style.css tests/a11y.test.js
git commit -m "Move focus on a room change and into the scene dialog, and describe its result (#322, #267)"
```

---

### Task 7: Close out

**Files:**
- Modify: `README.md`, `ROADMAP.md`

- [ ] **Step 1:** Add the `js/a11y.js` line to the README's file list. In `ROADMAP.md`, mark step 4 done and update the ship-interface item; say what accessibility work remains (the old screens, the burn view's sheets in step 5).
- [ ] **Step 2: Run the full suite both ways.** Expected: `npm test` PASSES; the `SHELL_TESTS=on` failures are no higher than before.
- [ ] **Step 3:** Comment on #267 and #269 with what was done, and close #267 if every item in it is met; leave #269 open for the planet-art sliver.
- [ ] **Step 4: Commit.**

```bash
git add README.md ROADMAP.md
git commit -m "Record step 4 of the ship interface (#322)"
```

---

## Self-Review

- **Spec coverage (step 4):** the rail as a bottom strip on a phone (Task 3); a tablet breakpoint (Task 2); focus and screen-reader handling (Tasks 5 and 6, #267); dock grouping (Task 4, #269); the width checks at 1280x800, 768x1024 and 390x844 (Task 1). Continue on the title and the 12px floor were done earlier. Not here by design: the planet-art sliver, the burn view (step 5), and the old screens' layout.
- **Decisions made:** how the phone strip fits the dock (a grid above a one-row dock, Sound in Settings), where focus goes after a room change and how a result is heard (the page region; Continue with `aria-describedby`; one polite live region), and how the width checks run (`atWidths`, one shared check per rail page).
- **Type consistency:** `announce`, `focusPage`, `trapDialog`, `releaseDialog`, `atWidths` and `#live` are used with the same names and shapes in every task.
- **Known risks:** moving `G.hudW` to 1000px changes the HUD in flight and in the bridge sheets at 700 to 999px (Task 2 lists every user of `hudW` and checks them by eye); removing the dock's Sound button breaks any test that clicked it (Task 4 fixes them); moving focus can steal it from a text field while typing, so `focusPage` runs only on a room change, never on a re-render; and an owner's rail has 12 entries, so the grid has two rows of six, which Task 3's screenshot at 390px should confirm.
- **Proportion:** the plan holds signatures, test names, assertions and values, not bodies.
