# The Hand's Papers: Minors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five polish points on the hand's papers (#1258): the inspector's line in its place and shown once per berth, the shipmate reached by id, the full build's hidden start reset for a hand, the narrow build's headings in order.

**Architecture:** `h.origin` keeps the three answers and what came of them: `mate` (the warmed crewmate's id) and `told` (the inspector's line has been said), both set or cleared by `applyPapers` at each sign-on and by the inspector. The scene text and the menu form change in place.

**Tech Stack:** Vanilla JS classic scripts; Playwright browser tests via `tests/helpers.js open()`; the text layer (`SCENE_LINES` in `js/hiredscenes.js`); the scene pin.

**Spec:** `docs/superpowers/specs/2026-11-15-papers-minors-design.md`

## Global Constraints

- No emojis anywhere. Desktop only.
- Words live in the text layer and are played by `tests/sceneplay.js`; a changed line is re-pinned with `PIN_WRITE=1 node --test tests/scenepin.test.js` and the diff read.
- New logic takes the state it reads as parameters; the owner game has no fork in the hand's code.
- A save from before (no `h.origin`, or an `origin` without `mate`/`told`) behaves as today and throws nothing.
- Read `.claude/heartbeat.json` before editing; update it at each step; never commit it.

## Review Focus

1. A save from before this change whose hand already heard the inspector's line (fines at 1 then) has no `told`: they hear it once more at the next inspection, then never. Task 1 tests `told` absent with fines at 3 shows the line once.
2. A hand put ashore meets the inspector's line once more on the new berth, where the fine lands again (`applyPapers` clears `told`). Task 1 tests `applyPapers` clears it.
3. `h.origin.mate` names someone no longer aboard, or an id nothing resolves: the sign-on says "Someone aboard" and throws nothing. Task 2 tests a bogus id.
4. Full build: owner picks Mars, switches to hired and back to owner: the start is Earth now and the owner picks Mars again. Task 3 tests the start after hired is Earth; the owner's re-pick is the price of the reset, accepted in the spec.
5. Narrow build with the heading dropped: the hint sits under the name field and the full build keeps "How you start". Task 3 tests both.

---

### Task 1: The inspector's line, in its place and once per berth

**Files:**
- Modify: `js/hiredscenes.js` (`scene:inspection` `text`), `js/inspection.js` (`inspectionScene`), `js/hired.js` (`applyPapers`)
- Test: `tests/inspection.test.js` (the test at line 269), `tests/hired.test.js` (the papers test at line 969), `tests/fixtures/scene-lines-pin.json`

**Interfaces:**
- Produces: `h.origin.told: true` once the inspector's line has been shown; `applyPapers(st, h)` deletes `h.origin.told`.

- [ ] **Step 1: Rewrite the inspection test's assertions**

Replace the body of the test at `tests/inspection.test.js:269` so that it reads, in order: a hand with `origin.known = 'patrol'`, `record = {}` and `fund: 0` (an unpaid fine) sees the line, with the line's text before the junior's count (`text.indexOf('had your name') < text.indexOf('counts')`), and `h.origin.told === true` after; a second stop shows no line; a hand with `record = { fines: 3 }` and no `told` sees the line once; a hand with `known: 'none'` and a hand with `origin` deleted see none and throw nothing. Keep `out.after = { fines, marked }` for the paid case (fund 100000, record `{ fines: 1 }`): fines 2, marked true.

```js
assert.deepEqual([r.unpaid.line, r.unpaid.before, r.unpaid.told], [true, true, true], 'the line, before the manifest, and told');
assert.equal(r.unpaidSecond, false, 'once, though no fine was paid');
assert.deepEqual([r.earlierFines.first, r.earlierFines.second], [true, false], 'a fine from elsewhere first does not hide it');
assert.deepEqual(r.after, { fines: 2, marked: true });
assert.deepEqual([r.plain, r.old, r.threw], [false, false, null]);
```

- [ ] **Step 2: Add to the papers test in `tests/hired.test.js`**: after `start({ home: 'earth', before: 'none', known: 'patrol' })`, set `h.origin.told = true`, call `applyPapers(G.state, h)` and record `'told' in h.origin` → `false`.

- [ ] **Step 3: Run both to verify they fail**

Run: `node --test tests/inspection.test.js tests/hired.test.js`
Expected: FAIL on `unpaid.before` (the line is after the causes) and `unpaidSecond` (the count, not `told`, gates it) and the `told` cleared assertion.

- [ ] **Step 4: Implement**

In `js/hiredscenes.js`, the `text` line of `scene:inspection` becomes `'{official} comes up the ramp at {planet} with a slate and a junior carrying the seal gun. {known}{causes} "{sum} credits," {official} says. "Before the clamps come off."'`. In `js/inspection.js`, `known` is `!!h && (h.origin || {}).known === 'patrol' && !h.origin.told`; when true, set `h.origin.told = true` and pass `known: say('known') + ' '` into `say('text', ...)` (empty string otherwise); drop `known` from the `text` array. In `js/hired.js` `applyPapers`, `delete h.origin.told` first (guarding `h.origin`). Update the comments.

- [ ] **Step 5: Run to verify they pass, re-pin**

Run: `node --test tests/inspection.test.js tests/hired.test.js tests/scenelines.test.js && PIN_WRITE=1 node --test tests/scenepin.test.js && git diff tests/fixtures/scene-lines-pin.json`
Expected: PASS; the diff moves the `papers:inspector` line's "had your name" sentence before "The junior counts" and changes nothing else.

- [ ] **Step 6: Commit**

```bash
git add js/hiredscenes.js js/inspection.js js/hired.js tests/inspection.test.js tests/hired.test.js tests/fixtures/scene-lines-pin.json
git commit -m "The inspector reads the name before the manifest is up, once per berth (#1258)"
```

### Task 2: The shipmate by id

**Files:**
- Modify: `js/hired.js` (`applyPapers`), `js/signon.js` (`signOnEvent`, the `mate` line)
- Test: `tests/hired.test.js` (the papers test), `tests/signon.test.js` (the test at line 158)

**Interfaces:**
- Consumes: `applyPapers(st, h)` from Task 1 (it already clears `told`).
- Produces: `h.origin.mate`: the warmed crewmate's id when the answer is shipmate and a generated crewmate is aboard; absent otherwise.

- [ ] **Step 1: Add to the papers test in `tests/hired.test.js`**: in the shipmate case, `out.mate.id = h.origin.mate === liked[0].id`; in the none case, `'mate' in h.origin` → `false`; in the no-crew case, `'mate' in h.origin` → `false`.

- [ ] **Step 2: Add to the sign-on test in `tests/signon.test.js`**: after `full`, pick another generated crewmate (`opinion !== 1`), set `hired().origin.mate` to their id and read `signOnEvent().text`'s third paragraph: it names them, not the warmed one; set `hired().origin.mate = 'nobody'` and read again: it says `Someone aboard`; `delete hired().origin.mate`: `Someone aboard`.

```js
assert.ok(r.byId.third.includes(r.byId.other), 'the sign-on names whoever the papers record');
assert.ok(/Someone aboard/.test(r.bogus) && /Someone aboard/.test(r.none), 'an id nothing resolves, or none, reads as someone');
```

- [ ] **Step 3: Run to verify they fail**

Run: `node --test tests/hired.test.js tests/signon.test.js`
Expected: FAIL: `h.origin.mate` undefined; the sign-on still names the warmed one by memory text.

- [ ] **Step 4: Implement**

`applyPapers`: `delete h.origin.mate` with `told`; in the shipmate branch, `const mate = pick(mates); like(mate, 1, ...); h.origin.mate = mate.id`. `signOnEvent`: `const mate = origin.mate ? person(origin.mate) : null`, and the `first` var is `mate ? mate.first : say('known.shipmate.someone')` as now.

- [ ] **Step 5: Run to verify they pass**

Run: `node --test tests/hired.test.js tests/signon.test.js tests/scenelines.test.js tests/scenepin.test.js`
Expected: PASS; the pin unchanged (the words are the same).

- [ ] **Step 6: Commit**

```bash
git add js/hired.js js/signon.js tests/hired.test.js tests/signon.test.js
git commit -m "The sign-on reaches the warm shipmate by id (#1258)"
```

### Task 3: The form: the hidden start reset, the narrow heading dropped

**Files:**
- Modify: `js/menu.js` (`views.new`, the `menuMode` action)
- Test: `tests/menu.test.js`

- [ ] **Step 1: Write the failing test**

```js
test('a hand starts at Earth whatever background an owner clicked first, and the narrow form\'s headings read in order (#1258)', async () => {
  const owner = await open({ title: true, scope: 'full' });
  await owner.page.click('[data-action=menuView][data-arg=new]');
  await owner.page.click('[data-action=menuBackground][data-arg=mars]');
  await owner.page.click('[data-action=menuMode][data-arg=hired]');
  assert.equal(await owner.page.$$eval('h3', h => h.map(x => x.textContent))[0] ... // 'How you start' is still the first heading in the full build
  // intercept startGame as the papers test does; fill the name; click Start
  assert.equal(await owner.ev(() => window.__start.background), 'earth');
  await owner.done();
  const hand = await open({ title: true });
  await hand.page.click('[data-action=menuView][data-arg=new]');
  assert.deepEqual((await hand.page.$$eval('h3', h => h.map(x => x.textContent))).slice(0, 2), ['Where you are from', 'The sheet']);
  await hand.done();
});
```

(Write the first `h3` assertion as `assert.equal(heads[0], 'How you start')` with `heads` read once.)

- [ ] **Step 2: Run to verify it fails**

Run: `node --test tests/menu.test.js`
Expected: FAIL: background `mars`; the narrow headings start with `Your post`.

- [ ] **Step 3: Implement**

`js/menu.js`: the `menuMode` action sets `Menu.form.background = 'earth'` when `id === 'hired'`; in `views.new`, the `<h3>` line becomes `${narrow ? '' : '<h3>How you start</h3>'}` and its comment says why. The full build's owner form is otherwise unchanged.

- [ ] **Step 4: Run to verify it passes**

Run: `node --test tests/menu.test.js tests/hired.test.js`
Expected: PASS (the papers-form golden is untouched: `papersForm` does not change).

- [ ] **Step 5: Commit**

```bash
git add js/menu.js tests/menu.test.js
git commit -m "A hand starts at Earth whatever an owner clicked; the narrow form drops the heading over its hint (#1258)"
```

### Task 4: The whole suite, and the roadmap line

- [ ] **Step 1: Run** `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell 2>/dev/null | tail -1) npm test`, `npm run test:editor`, `npm run coverage -- --check`. Expected: all pass, no file under the floor.
- [ ] **Step 2:** In `ROADMAP.md`, the papers line gains "minors #1258 done 2026-11-15". The spec's status line says "built".
- [ ] **Step 3: Commit** `git commit -m "Papers minors done: roadmap, spec status (#1258)"`.
