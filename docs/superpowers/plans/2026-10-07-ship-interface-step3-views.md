# The Ship Is the Interface, Step 3: View Helpers With Escaping Inside Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give pages a small set of view helpers that escape what they print, and move the pages that print names onto them: Crew, Bar and the scene dialog. A page on the helpers is safe by construction, with no separate escaping pass, and a hostile name cannot break any of the moved screens.

**Architecture:** A new `js/views.js` holds a tagged template `h` that escapes every interpolation unless it is marked with `raw()`, and four helpers built on it: `panelHtml`, `listHtml`, `personCardHtml` and `choiceBlockHtml`. Each moved page produces the same markup it does today (same classes, same `data-action` and `data-arg`), so existing tests keep selecting what they select now. A hostile-name test, written first, visits every rail page and the scene dialog before and after each page moves.

**Tech Stack:** Vanilla JS classic scripts in one global scope, no build step. Tests are Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-05-ship-interface-design.md`, "Build order", step 3. Steps 1 and 2 are in `main` (`js/shell.js`; the shell is on by default in the narrow build). Issue: #321.

## What is already done

The issue was written before two of its items were closed, so this plan does not repeat them:

- **The inline handlers (the first half of #309).** None are left in `js/`. `this.select()` became a delegated `data-select` click handler in `js/ui.js`, because the Content Security Policy in `index.html` forbids inline handlers. Task 1 pins that with a test so it cannot come back.
- **#251 and #310.** Both are closed (PRs #343 and #313): names the player types are cleaned on the way in (`cleanName`, `stripTags`) and escaped at the template for the screens #251 listed. What remains is structural: every page still writes `${...}` by hand, and generated names (`${p.first} ${p.last}` in the Bar page) rely on the generator, not on the template.

## Global Constraints

- No framework, no bundler, no build step.
- Classic scripts share one global scope: every new top-level name must be unique (`tests/globals.test.js` enforces it). The helpers are `h`, `raw`, `panelHtml`, `listHtml`, `personCardHtml`, `choiceButtonHtml` and `choiceBlockHtml`; check each against the existing globals before adding.
- A moved page keeps its markup: the same element nesting, classes, and `data-action`/`data-arg` values. No existing test is edited to make a move pass, except where a test asserts on exact escaped text.
- Text that is HTML by design (scene text, port notes, `&middot;` joins in templates) stays `raw`. Only values that are data (names, titles, labels typed or generated, attribute values) are escaped.
- The helpers are used by both the old screens and the shell, so they work with the flag on and off.
- No emojis anywhere (code, text, docs, commits).
- Heartbeat: read `.claude/heartbeat.json` before editing, update it at each step, never commit it (CLAUDE.md).
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`. One file: replace `npm test` with `node --test tests/views.test.js`. Run the full suite both ways at the end of each task that moves a page (`SHELL_TESTS=on npm test` is a report, as in step 2).

## Decisions

- **Tagged template, not per-field functions.** `h\`<b>${name}</b>\`` escapes `name`; `raw(markup)` marks a string that is already trusted HTML; an array is joined (each element escaped unless raw); `null`, `undefined` and `false` print nothing; a number prints as text. Nested `h` results are raw, so helpers compose. This is the smallest change to existing templates: a page swaps the backtick for `h` and wraps the few trusted fragments in `raw()`.
- **Where the line is drawn for scenes.** `ev.text` is HTML by design (authored with tags and entities) and stays `raw`. `ev.title` becomes escaped text, because it is built from a person's name (the reason `aria-label` already goes through `esc`). Task 3 checks that no authored title uses a tag or an entity before it moves.
- **First pages: Crew, Bar, the scene dialog.** They print the most names, are on the rail, and have tests that already pin their markup. Missions, Journal, Port and the rest move in later steps or at cutover.
- **How a half-moved page is tested.** The hostile-name test (Task 2) renders every rail page and the scene dialog with hostile data, and asserts on the DOM, not on source text, so it holds for a page on helpers and a page still on templates alike. A page moves only when that test passes both before and after.
- **No behaviour change.** A moved page reads the same to a player; the only visible difference is that a name containing `<`, `&` or `"` now shows literally.

## Review Focus

Each of these is pinned by a test named in the task:

1. `h` escapes `<`, `>`, `&` and `"`, and does not escape `raw()` or a nested `h` (Task 1).
2. An array interpolation joins and escapes each element; an empty array and `false` print nothing (Task 1).
3. No inline handler (`on...=`) appears in any template, and `data-select` still selects (Task 1).
4. A person named `x" onmouseover="alert(1)` or `<img src=x onerror=...>`, a captain, ship and heir named the same, and a memory log with markup, create no element, attribute or script on any rail page, the scene dialog or the menu (Task 2).
5. The scene dialog escapes the title in the heading and the `aria-label`, leaves the text raw, and shows a shut choice with its reason (Task 3).
6. The Crew page markup, for an ordinary game, is unchanged by the move (Task 4).
7. The Bar page markup, for an ordinary game, is unchanged by the move (Task 5).

## File Structure

- `js/views.js` (create): `h`, `raw`, `panelHtml`, `listHtml`, `personCardHtml`, `choiceBlockHtml`.
- `index.html` (modify): load `js/views.js` after `js/ui.js`.
- `js/ui.js` (modify): `choiceHtml`, `showEvent`, the `crew` view.
- `js/bar.js` (modify): `barHtml`.
- `tests/views.test.js` (create): the helper tests and the hostile-name test.
- `tests/fixtures/` (create): `crew.html` and `bar.html`, the golden markup of an ordinary seeded game, taken before the pages move.
- `README.md` (modify): one line for `js/views.js`.

---

### Task 1: The helpers, and a pin on the inline handlers

**Files:**
- Create: `js/views.js`, `tests/views.test.js`
- Modify: `index.html`

**Interfaces:**
- Produces: `raw(s: string): Raw`; `h(strings, ...values): Raw`; `panelHtml({ eyebrow?: string, title?: string, body: Raw|string }): Raw`; `listHtml(items: any[], row: (item, i) => Raw): Raw`; `personCardHtml(person, { sub?: Raw|string, actions?: Raw|string, ring?: string }): Raw`; `choiceButtonHtml(choice, i): Raw` (one button, and its reason when shut); `choiceBlockHtml(choices: Choice[]): Raw`. `Raw` is an object with a `html` string and a `toString()` that returns it, so a helper result can sit inside a template literal unchanged.

- [ ] **Step 1: Write the failing tests** in `tests/views.test.js`:
  - `'h escapes data and passes raw and nested h through'`: `h\`<b>${'<i>&"'}</b>\`` is `<b>&lt;i&gt;&amp;&quot;</b>`; `h\`${raw('<i>x</i>')}\`` is `<i>x</i>`; `h\`${h\`<u>${'<'}</u>\`}\`` is `<u>&lt;</u>`.
  - `'h joins arrays and prints nothing for null, undefined and false'`: `h\`${['<a>', raw('<b>')]}\`` is `&lt;a&gt;<b>`; `h\`[${null}${undefined}${false}${[]}]\`` is `[]`; a number prints as text, and `0` prints `0`.
  - `'panelHtml, listHtml, personCardHtml and choiceBlockHtml escape what they are given'`: a title of `<script>`, a list item, a person named `Kay "Q" <b>` and a choice labelled `<i>` are all literal text in the DOM when set with `innerHTML`, and `personCardHtml` carries `data-action="person"` and the person's id in `data-arg`.
  - `'no template in js/ has an inline handler, and data-select selects'`: fetch each script listed in `index.html` and assert none contains `on[a-z]+=\\\\?"`, outside comments; then click a `[data-select]` input and assert its selection is the whole value.
- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/views.test.js`. Expected: the first three FAIL (no `js/views.js`); the fourth passes today and stays as a pin, so note that in the commit body.
- [ ] **Step 3: Implement** `js/views.js` and link it after `js/ui.js` in `index.html`. `h` builds its string from the template parts and the values, escaping each value with `esc` unless it is a `Raw`; arrays map the same rule. `personCardHtml` emits the markup the Crew page's `.mission` row uses today (face, name link, sub line, actions), so Task 4 is a swap.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/views.test.js tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add js/views.js index.html tests/views.test.js
git commit -m "Add the view helpers: a tagged template that escapes, and four helpers on it (#321)"
```

---

### Task 2: The hostile-name test, before any page moves

**Files:**
- Modify: `tests/views.test.js`
- Create: `tests/fixtures/` (the directory)

**Interfaces:**
- Consumes: `open({ shell: 'default', scope: 'earth-hired' })`, `startGame`, `railEntries`, `UI.render`.
- Produces: a test helper `hostileGame()` inside the test file that starts a hired game, then sets: a crew member's `first`, `last` and `home`; a `st.people` entry's name and memory; the captain's name; the ship's title; and the journal, each to one of two hostile strings (`x" onmouseover="alert(1)` and `<img src=x onerror="window.pwned=1">`).

- [ ] **Step 1: Write the test** `'a hostile name breaks no rail page, the scene dialog or the menu'`: with the shell on and `hostileGame()`, visit every enabled rail entry; after each, assert `document.querySelectorAll('#panel img, #panel script, #panel [onmouseover], #panel [onerror], #panel [onclick]').length === 0`, `window.pwned` is unset, and the hostile text is present as text (`#panel` `textContent` includes `x" onmouseover="alert(1)`) on the Crew page. Open a scene whose title and text carry the hostile name through `openEvent` and run the same assertions on the dialog, including `aria-label`. Open the menu's Load view and run them again.
- [ ] **Step 2: Run it.** Run: `node --test tests/views.test.js`. Expected: it shows where the pages stand today. Any page that fails is a real hole: fix it in this task with `esc` at the point of use (the smallest change), name the page in the commit body, and move on. A page that passes stays pinned.
- [ ] **Step 3: Capture the golden markup.** With a seeded ordinary game (no hostile data), save the Crew and Bar pages' `.shell .body` `innerHTML` to `tests/fixtures/crew.html` and `tests/fixtures/bar.html`, through a one-off script in the scratchpad (not committed). These are what Tasks 4 and 5 must reproduce.
- [ ] **Step 4: Run the full suite.** Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add tests/views.test.js tests/fixtures js
git commit -m "Pin that a hostile name breaks no rail page, the scene dialog or the menu (#321)"
```

---

### Task 3: The scene dialog on the choice block

**Files:**
- Modify: `js/ui.js` (`choiceHtml`, `showEvent`), `js/views.js`
- Test: `tests/views.test.js`

**Interfaces:**
- Consumes: `choiceBlockHtml`, `h`, `raw`.
- Produces: `UI.choiceHtml(c, i)` unchanged in output for a normal choice; `showEvent` builds the dialog with `h`.

- [ ] **Step 1: Write the failing tests:**
  - `'no authored event title carries markup'`: for every title in `TRANSIT_EVENTS`, every scene of `CAST` and `CAPTAINS`, and the other event tables the game exports, assert `/[<&]/.test(title) === false`. If any fails, list them in the output: they are the titles to fix before the title is escaped.
  - `'the scene dialog escapes the title and the aria-label, leaves the text raw, and shows a shut choice with its reason'`: open an event titled `A <b>` with text `<i>x</i>` and one shut choice (`gated(needCr(1e9))`); the heading's text is `A <b>`, the label attribute equals it, the paragraph has an `<i>` element, and the shut button is disabled with the reason as visible text.
- [ ] **Step 2: Run them to see them fail.** Expected: the second FAILS (the heading is raw today).
- [ ] **Step 3: Implement.** `UI.choiceHtml(c, i)` returns `String(choiceButtonHtml(c, i))`: a choice label and a shut reason are text (a scan of every `label:` in `js/` found none with markup or an entity), so both are escaped, and a test (Step 1) scans the labels of the event tables for `<` and `&`. `showEvent` becomes an `h` template: `${ev.title}` escaped, `${raw(ev.text)}`, `${choiceBlockHtml(choices)}`, with `esc` gone from the `aria-label` because `h` does it.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/views.test.js tests/ui.test.js`, then the full suite. Expected: PASS.
- [ ] **Step 5: Commit.**

```bash
git add js/ui.js js/views.js tests/views.test.js
git commit -m "Build the scene dialog on the helpers, with the title escaped (#321)"
```

---

### Task 4: The Crew page on the helpers

**Files:**
- Modify: `js/ui.js` (the `crew` view)
- Test: `tests/views.test.js`

**Interfaces:**
- Consumes: `personCardHtml`, `listHtml`, `panelHtml`, `h`, `raw`.
- Produces: the same Crew page, with each of its three lists (the crew, for hire, and people you know) and its headings built from the helpers.

- [ ] **Step 1: Write the failing test** `'the Crew page renders the same markup as before for an ordinary game'`: a seeded hired game, then `.shell .body` `innerHTML` equals `tests/fixtures/crew.html`. (It passes before the move and must still pass after; run it first to confirm the fixture is current.) Add `'the Crew page escapes a hostile name in the rows and the people you know'` with a crew member and a `st.people` entry named hostilely: the row text contains the literal string and no element or attribute is created.
- [ ] **Step 2: Run them.** Expected: the golden test PASSES (a pin), the hostile one passes only if Task 2 left no hole; both are the contract for Step 3.
- [ ] **Step 3: Move the page.** Rewrite the `crew` view with `h`: each crew row is `personCardHtml(c, { sub, actions, ring })` where `sub` is `raw` for the perk line (it carries wages and entities), the for-hire rows use `listHtml`, the known-people list uses `listHtml` with the memory text escaped. Headings use `panelHtml` only where the markup is identical; otherwise keep `<h3>` through `h`.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/views.test.js tests/ui.test.js tests/handscreens.test.js tests/shell.test.js`, then the full suite both ways. Expected: PASS with the flag off; the flag-on run fails no test that passed before the move.
- [ ] **Step 5: Commit.**

```bash
git add js/ui.js tests/views.test.js
git commit -m "Build the Crew page on the helpers (#321)"
```

---

### Task 5: The Bar page on the helpers

**Files:**
- Modify: `js/bar.js` (`barHtml`)
- Test: `tests/views.test.js`

**Interfaces:**
- Consumes: `personCardHtml`, `listHtml`, `h`, `raw`.
- Produces: the same Bar page, with the patrons, the people looking for a ship and the room lines on the helpers.

- [ ] **Step 1: Write the failing tests:** the golden pin `'the Bar page renders the same markup as before for an ordinary game'` against `tests/fixtures/bar.html`, and `'the Bar page escapes a hostile patron name and memory'`.
- [ ] **Step 2: Run them.** Expected as in Task 4.
- [ ] **Step 3: Move the page.** Each patron row is a `personCardHtml`-shaped row with the "Talk" button as its action; the `hire` rows and the room lines use `listHtml`; the bar's own name, vibe and notes are `raw` (authored) except the patron names and memory lines, which are escaped.
- [ ] **Step 4: Run the tests.** Run: `node --test tests/views.test.js tests/bartable.test.js tests/barwork.test.js tests/castbar.test.js`, then the full suite both ways. Expected as in Task 4.
- [ ] **Step 5: Commit.**

```bash
git add js/bar.js tests/views.test.js
git commit -m "Build the Bar page on the helpers (#321)"
```

---

### Task 6: Close out

**Files:**
- Modify: `README.md`, `ROADMAP.md`

- [ ] **Step 1:** Add the `js/views.js` line to the README's file list. In `ROADMAP.md`, mark step 3 done and list what is left on templates (Missions, Journal, Port and the pages still to move).
- [ ] **Step 2: Run the full suite both ways.** Expected: `npm test` PASSES; the `SHELL_TESTS=on` count of failures is no higher than before step 3.
- [ ] **Step 3: Comment on #309 and #251** that the inline handlers are gone and are now pinned, and that the moved pages are on helpers with a hostile-name test. Do not close them if pages are still on templates.
- [ ] **Step 4: Commit.**

```bash
git add README.md ROADMAP.md
git commit -m "Record step 3 of the ship interface (#321)"
```

---

## Self-Review

- **Spec coverage (step 3):** the view helpers and escaping inside them (Tasks 1 and 3 to 5); Crew, Bar and scenes first (Tasks 3 to 5); the inline handlers (already gone, pinned in Task 1); #251 for the moved pages, including attribute values, `st.people` names and the `aria-label` (Tasks 2 to 5); and the hostile test strings and which screens they must not break (Task 2). Not here by design: Missions, Journal, Port and the other pages, which move at cutover; the shell's phone strip and focus handling (step 4).
- **Decisions made:** the helper signatures (Task 1), the tagged template over per-field functions (Decisions), where scenes are escaped (Decisions), how a half-moved page is tested (Task 2), and the hostile strings (Task 2).
- **Type consistency:** `h`, `raw`, `Raw`, `panelHtml`, `listHtml`, `personCardHtml` and `choiceBlockHtml` are used with the same names and shapes in every task.
- **Known risks:** `ev.title` may carry an entity in an authored scene (Task 3's first test finds them before the title is escaped); the golden fixtures are brittle if a seeded game's content changes, so a fixture is regenerated in the same commit as any intended content change; and the Crew page's markup is long, so Task 4 is the largest task and may be split by list.
- **Proportion:** the plan holds signatures, test names, assertions and values, not bodies.
