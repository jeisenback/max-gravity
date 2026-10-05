# The Ship Is the Interface, Step 1: The Walking Skeleton Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new landed-screen shell behind a flag: a side rail of the ship's rooms and an "Ashore" group, around the existing Port, Bar and Crew pages.

**Architecture:** One flag in `js/build.js` chooses between the old render path and a new `js/shell.js` that composes the same header, body and dock around a rail. The rail is a data table; the page registry wraps the existing `UI.views[tab]` functions lazily, so no page is rewritten. Rail buttons reuse `data-action="tab"`, so no new action handler is needed.

**Tech Stack:** Vanilla JS classic scripts in one global scope, no build step. Tests are Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-05-ship-interface-design.md`. This plan covers build step 1 only. Steps 2 to 6 each get their own plan.

## Global Constraints

- No framework, no bundler, no build step (spec, "Out of scope").
- Classic scripts share one global scope: every new top-level name must be unique, and every new script must be linked in `index.html` (`tests/globals.test.js` enforces both).
- The flag is **off by default** until step 2 is done (spec, decision 10). With it off, the landed screen must be unchanged.
- Rail buttons keep the `data-action="tab"` and `data-arg` names the old tabs use, so existing tests do not move twice (spec, "Risks").
- An unknown page id falls back to Port (spec, "The pieces").
- The full build behind `?scope=full` keeps working; owner-era pages are added to the rail in step 2, not here.
- No emojis anywhere (code, text, docs, commits).
- Heartbeat: read `.claude/heartbeat.json` before editing, update it at each step, never commit it (CLAUDE.md).
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`. A single file: replace `npm test` with `node --test tests/shell.test.js`.

## Review Focus

1. **A tab id the shell does not know** (for example `nav`, `trade`, left over from an older code path or a mod): falls back to Port and leaves `UI.tab` valid. Pinned in Task 2.
2. **An unavailable entry** shows why, as visible text, not only a disabled button (#264). Pinned in Task 2.
3. **The flag off** renders exactly as before: no `.shell`, station keys present. Pinned in Task 1.
4. **An event or scene opening over the shell and closing again** leaves the shell, not the old screen, on display. Pinned in Task 3.
5. **A phone width (390px)** has no horizontal page scroll and every rail entry is reachable. Pinned in Task 3.

---

## File Structure

- `js/build.js` (modify): the flag, `shellOn()`.
- `js/ui.js` (modify): extract `headerHtml(p)` and `dockHtml()` from `render()`; one early branch to the shell.
- `js/shell.js` (create): the rail table, the page registry and the shell's HTML.
- `index.html` (modify): link `js/shell.js` after `js/bridge.js`.
- `style.css` (modify): a `.shell` block at the end.
- `tests/helpers.js` (modify): a `shell` option on `open()`.
- `tests/shell.test.js` (create).
- `README.md` (modify): one line for `js/shell.js` in the file list.

---

### Task 1: The flag, and the header and dock pulled out of `render()`

**Files:**
- Modify: `js/build.js`, `js/ui.js` (the `render()` method), `tests/helpers.js` (the `open()` function)
- Create: `tests/shell.test.js`

**Interfaces:**
- Produces: `shellOn(): boolean` (global, in `js/build.js`), true only when the address has `shell=on`. `UI.headerHtml(p: Planet): string` and `UI.dockHtml(): string`, which return exactly the header and dock markup `render()` builds today. `open({ shell: true })` in `tests/helpers.js` appends `shell=on` to the address.

- [ ] **Step 1: Write the failing tests** in `tests/shell.test.js`, with the file header, `open` and `closeBrowser` imports and `after(closeBrowser)` as in `tests/scope.test.js`, and a `helpers` function that defines `window.start(o)` as `tests/scope.test.js` does (a hired Earth gunner, dialogs finished, `st.story.next = 1e9`). Tests:
  - `'the shell is off unless the address asks for it'`: with `open({})`, `shellOn()` is false; with `open({ shell: true })`, it is true.
  - `'with the shell off the landed screen is unchanged'`: after `start()`, `document.querySelector('.shell')` is null, `[data-action=station]` is present, and `UI.el.innerHTML` contains both `UI.headerHtml(UI.planet)` and `UI.dockHtml()`.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/shell.test.js`. Expected: FAIL (`shellOn` and `UI.headerHtml` are not defined).
- [ ] **Step 3: Implement the flag** in `js/build.js`: add `shell: /[?&]shell=on(&|$)/.test(location.search) ? 'on' : 'off'` to `BUILD`, and `const shellOn = () => BUILD.shell === 'on';` next to `scopeNarrow`.
- [ ] **Step 4: Extract the markup.** In `js/ui.js`, move the `<div class="hdr">...</div>` block of `render()` into `headerHtml(p)` and the `<div class="dock">...</div>` block into `dockHtml()`, both methods of `UI`, and have `render()` call them where the blocks were. The output must be character for character the same.
- [ ] **Step 5: Add the helper option.** In `tests/helpers.js`, give `open()` a `shell = false` option, and build the address from a list of query parts (`scope=full` when the scope is full, `shell=on` when `shell` is true) joined with `&` after a `?`, then the hash. The existing callers must produce the same address.
- [ ] **Step 6: Run the new tests and the UI-heavy existing ones.** Run: `node --test tests/shell.test.js tests/ui.test.js tests/hired.test.js tests/scope.test.js`. Expected: all PASS.
- [ ] **Step 7: Commit.**

```bash
git add js/build.js js/ui.js tests/helpers.js tests/shell.test.js
git commit -m "Add the shell flag and pull the landed header and dock out of render"
```

---

### Task 2: The rail table, the page registry and the shell render

**Files:**
- Create: `js/shell.js`
- Modify: `index.html` (link after `js/bridge.js`), `js/ui.js` (`render()`), `README.md` (file list)
- Test: `tests/shell.test.js`

**Interfaces:**
- Consumes: `shellOn()`, `UI.headerHtml(p)`, `UI.dockHtml()` (Task 1); `UI.views[tab]` and `UI.tab`; `tabReady(p, id)`, `hired()`, `esc(s)` (existing globals).
- Produces, in `js/shell.js`:
  - `RAIL: Array<{ id: string, label: string, group: 'ship' | 'ashore', tab: string, ready: (p: Planet) => true | string }>`. `ready` returns `true`, or the reason the entry is unavailable.
  - `SHELL_PAGES: Record<string, { under?: string }>`, the registered page ids. `under` names the rail entry a page without its own entry belongs to.
  - `railEntryHtml(entry, p, activeId): string` returns one `<button data-action="tab" data-arg="${entry.tab}">`, with `class="active"` and `aria-current="page"` when `entry.id === activeId`; an unavailable entry has `disabled` and its reason as visible text in a `<span class="rail-why">`.
  - `railHtml(p, tab): string` returns `<nav class="rail" aria-label="Ship">` with a `.rail-group` per group (ship first, then "Ashore"), each with a heading.
  - `shellTab(tab: string): string` returns `tab` if it is in `SHELL_PAGES`, else `'port'`.
  - `shellHtml(ui: typeof UI, p: Planet): string` composes `headerHtml`, the `#vs` canvas, `Mods.filter('portBanner', '')`, a `<div class="shell">` holding the rail and `<div class="body">` with the page, and `dockHtml`.
- Step 1 content: `RAIL` has Crew (ship group, tab `crew`), Port and Bar (ashore group, tabs `port` and `bar`). `SHELL_PAGES` has `port`, `bar`, `crew`, and `person: { under: 'crew' }`, so a click on a name in the crew list still works.

- [ ] **Step 1: Write the failing tests** in `tests/shell.test.js`:
  - `'the rail shows the ship group and the Ashore group'`: with `open({ shell: true })` and `start()`, the `.rail` entries' text is, in order, `['Crew', 'Port', 'Bar']`; the first is inside the ship group and the last two inside the ashore group; `.rail button.active` has `data-arg` `port`.
  - `'a rail button opens its page and takes the highlight'`: click `[data-action=tab][data-arg=bar]`; `UI.tab === 'bar'`, the active button is `bar`, and `.shell .body` is not empty.
  - `'the character screen keeps the Crew entry lit'`: set `G.viewPerson = 'you'; UI.tab = 'person'; UI.render()` (as `tests/hired.test.js` does); the active button is `crew`.
  - `'a tab the shell does not know falls back to Port'`: set `UI.tab = 'nav'`, call `UI.render()`; `UI.tab === 'port'` and the active button is `port`.
  - `'an unavailable entry says why'`: `railEntryHtml({ id: 'x', label: 'X', group: 'ashore', tab: 'x', ready: () => 'No work board here' }, UI.planet, 'port')` contains `disabled` and the visible text `No work board here`.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/shell.test.js`. Expected: the five new tests FAIL (`.rail` missing).
- [ ] **Step 3: Implement `js/shell.js`** with the signatures above. `RAIL` entries use `ready: p => tabReady(p, '<tab>') || 'Not available here'`. The page body is `UI.views[shellTab(tab)].call(UI)`, looked up when the screen is drawn, so the wrappers other scripts put around `UI.views.port`, `UI.views.crew` and `UI.views.bar` still apply. `shellHtml` sets `UI.tab = shellTab(UI.tab)` before drawing.
- [ ] **Step 4: Link and branch.** Add `<script src="js/shell.js"></script>` after the `js/bridge.js` line in `index.html`. In `UI.render()` in `js/ui.js`, after `setAccent`, add: `if (shellOn()) { this.el.innerHTML = shellHtml(this, p); return; }`.
- [ ] **Step 5: Document.** Add a line for `js/shell.js` to the file list in `README.md`: the new landed-screen shell, behind `?shell=on`.
- [ ] **Step 6: Run the new tests and `tests/globals.test.js`.** Run: `node --test tests/shell.test.js tests/globals.test.js`. Expected: all PASS (no duplicate top-level names, `js/shell.js` linked).
- [ ] **Step 7: Commit.**

```bash
git add js/shell.js index.html js/ui.js README.md tests/shell.test.js
git commit -m "Add the rail table, page registry and shell render behind the flag"
```

---

### Task 3: Layout, a scene over the shell, and the phone width

**Files:**
- Modify: `style.css` (a block at the end)
- Test: `tests/shell.test.js`

**Interfaces:**
- Consumes: `shellHtml` and the class names from Task 2 (`.shell`, `.rail`, `.rail-group`, `.rail-why`, `.body`).
- Produces: nothing later tasks depend on.

- [ ] **Step 1: Write the failing tests** in `tests/shell.test.js`:
  - `'a scene opened over the shell returns to the shell'`: with the shell on and `start()`, `openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] })` (the event `tests/ui.test.js` uses), then `chooseEvent(0)` and `finishEvent()`; `document.querySelector('.shell')` is not null and `UI.tab` is unchanged.
  - `'a phone has no horizontal scroll and every rail entry is on screen'`: `open({ shell: true, viewport: { width: 390, height: 844 }, mobile: true })`, `start()`; `document.documentElement.scrollWidth <= window.innerWidth`, and each `.rail button` has a bounding box inside the viewport width.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/shell.test.js`. Expected: the phone test FAILS (no layout rules yet). The scene test may already pass; if it does, keep it as a pin.
- [ ] **Step 3: Add the CSS** at the end of `style.css`, in the existing token style (`var(--panel-2)`, `var(--line)`, `var(--accent)`, `var(--muted)`, `var(--font-label)`):
  - `.shell`: a flex row, `flex: 1`, `min-height: 0`; the `.body` inside keeps its own scroll and padding.
  - `.rail`: a column of about 118px on screens of 700px and up, with a right border and the `--panel-2` ground; below 700px the rail is a wrapping row above the page (the bottom strip is step 4).
  - `.rail-group` heading in the label font, small and uppercase like the `h3` headings; `.rail button` full width, left aligned, `.active` in the accent colour; `.rail-why` in the muted colour under a disabled button.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/shell.test.js`. Expected: all PASS.
- [ ] **Step 5: Look at it.** With Playwright, open `index.html?scope=full&shell=on` at 1280x800 and at 390x844, start a hired game, and save two screenshots to the scratchpad directory. Check by eye that no text is clipped or overlapping and the rail is readable. Write what you saw in the commit body.
- [ ] **Step 6: Run the full suite.** Run: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`. Expected: all PASS, with the same count as before plus the new tests. If an existing test fails with the flag off, the render split in Task 1 is wrong; fix that, not the test.
- [ ] **Step 7: Commit.**

```bash
git add style.css tests/shell.test.js
git commit -m "Lay out the shell rail, with a phone row, and pin the scene return"
```

---

## Self-Review

- **Spec coverage (step 1):** the flag (Task 1), the shell, rail table and page registry with Port, Bar and Crew (Task 2), the Ashore group (Task 2), the fallback to Port (Task 2), a disabled reason (Task 2), the layout and phone row (Task 3), and the test option on `open()` (Task 1). Not in this plan, by design: the other pages and the layout rules for #262 to #268 (step 2), view helpers (step 3), the bottom strip, tablet and focus handling (step 4), the burn view (step 5) and cutover (step 6).
- **Type consistency:** `shellOn`, `headerHtml`, `dockHtml`, `RAIL`, `SHELL_PAGES`, `railEntryHtml`, `railHtml`, `shellTab` and `shellHtml` are used with the same names in every task.
- **Known limit:** until step 2 registers the remaining pages, the flag is for development only. A player with the flag on cannot reach Exchange, Missions, Journal and the other pages. It is off by default, and nothing in this plan turns it on.
- **Proportion:** the plan holds signatures, test names and assertions, not bodies.
