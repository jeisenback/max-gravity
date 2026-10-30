# The Burn Screen Layout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lay out the burn screen around the ship, in Layout A. One bar on top, the cutaway taking most of the view, a two-line Comms ticker under it, and scene dialogs docked beside the ship with the camera keeping the hand in view.

**Architecture:** A pure `burnLayout` in a new `js/burnlayout.js` returns every block's screen box. `drawTransit` in `js/transit.js` draws each block into its box. CSS takes the dialog's dock from the same boxes, through custom properties. `drawCutaway` gains a `clear` box, so the camera centres the hand in what a dialog leaves visible.

**Tech Stack:** Vanilla JS classic scripts on one canvas, with DOM panels; `node:test`, and Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-30-burn-screen-layout-design.md`. Mockup: https://claude.ai/artifact/Rg73wT8WRddQhXJLPkxkG9 (private). Its source `layout-a.html` is not in the repo; the spec's numbers are the reference.

## Global Constraints

- Classic scripts sharing one global scope. Every new top-level name is unique (`tests/globals.test.js`). Every new script is linked in `index.html` and in `editor.js`'s copy of the script list.
- Every field kept on `G` is declared, with a comment, in the literal in `js/game.js`.
- New logic takes the state it reads as parameters and returns a value; the caller reads `G`.
- No `hired()` forks. No emojis.
- Canvas text in the burn view is 12 px or more: every `ctx.font` number set while drawing it.
- No `Math.random` in drawing.
- Wide is `G.hudW > 0`, the HUD as a sidebar. Narrow is the HUD strip on top, which covers phone and tablet.
- Wide blocks, in the view beside the HUD with a 12 px gutter: `bar` 64 px tall; `ship` about 58% of the height; `ticker` 78 px; `life` one row; the bridge keys, which are unchanged.
- Narrow blocks, below the HUD strip: `bar` 72 px; `ship` between 1.0 and 1.2 times the view's width in height, as the height allows; `ticker` about 120 px with lines wrapping; the button rows; the keys.
- Short windows give up height in this order:
  1. the ticker drops to one line;
  2. the bar's dates line goes;
  3. the ship shrinks.

  The ship is never smaller than today's box at that size.
- The dialog dock, wide: along the right of the ship-and-ticker area, `min(560, 45% of the view)` wide, from the ship's top.
- The dialog dock, narrow: it rises from the bottom over the ticker and buttons, and its top never goes above the middle of the ship box.

## Review Focus

1. **A window shorter than 600 px** (a landscape phone, 844x390, which is narrow). The layout keeps every block inside the view and the ship at today's box or larger. If it cannot, it drops the ticker to one line and the bar's dates first. Test: Task 1, Step 1.
2. **A scene dialog taller than the dock.** It scrolls inside the dock and never covers the outline (top left of the ship box). Test: Task 4, Step 1.
3. **A tap on the ticker while a scene is open.** It does nothing, since taps are already ignored under a scene. A tap on the ticker otherwise opens Comms. Test: Task 2, Step 1.
4. **The tutorial prompt and a dialog together on a phone.** The prompt stays out of the dock. Today's test `with an event open, the Comms box stays clear of the dialog` becomes "the tutorial and ticker stay clear of the dock". Test: Task 4, Step 1.
5. **Resizing from wide to narrow with a dialog open.** The dock follows on the next frame, because the CSS properties are set every frame from the layout. Test: Task 4, Step 1, by setting the viewport.

---

### Task 1: `burnLayout`

**Files:**
- Create: `js/burnlayout.js`, linked in `index.html` and `editor.js` after `js/transit.js`
- Test: `tests/burnlayout.test.js` (Node, through `tests/nodecontext.js`)

**Interfaces:**
- Produces:
  - `legacyShipBox(W, H, hudW, narrow) -> {x, y, w, h}`: today's ship box, moved out of `drawTransit` (`js/transit.js:536-539`) so the floor can be tested.
  - `burnLayout(W, H, hudW, narrow, dialog) -> { bar, ship, ticker, tickerLines, life, tutorial, dock, clear, datesLine }`.
    - Boxes are `{x, y, w, h}` in screen px.
    - `tickerLines` is 2 or 1.
    - `datesLine` is a boolean.
    - `dock` is null when `dialog` is null, else the dialog's box.
    - `clear` is the part of `ship` left visible (the whole ship when there is no dialog).
    - `dialog` is `null` or `{ h }`, the height of the dialog's content in px.
    - `tutorial` is the ticker's box (the prompt replaces the ticker while it shows).
  - `CUTAWAY_ASPECT` moves here from `js/transit.js`.

- [ ] **Step 1: Write the failing tests:**

```js
const SIZES = [[1280, 800, 220, false], [768, 1024, 0, true], [390, 844, 0, true], [1280, 600, 220, false], [844, 390, 0, true]];
test('every block is inside the view, and none overlaps another but the dock', () => {
  for (const [W, H, hud, narrow] of SIZES) for (const dialog of [null, { h: 400 }]) {
    const L = burnLayout(W, H, hud, narrow, dialog), viewW = W - hud;
    for (const k of ['bar', 'ship', 'ticker', 'life']) { const b = L[k]; assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= viewW && b.y + b.h <= H, `${W}x${H} ${k}`); }
    const ks = ['bar', 'ship', 'ticker', 'life'];
    for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) assert.ok(apart(L[ks[i]], L[ks[j]]), `${W}x${H} ${ks[i]}/${ks[j]}`);
    if (dialog) assert.ok(L.dock.x + L.dock.w <= viewW && L.dock.y + L.dock.h <= H, `${W}x${H} dock inside`);
  }
});
test('the ship is never smaller than today, and on a wide screen is at least 1.8 times as tall', () => {
  for (const [W, H, hud, narrow] of SIZES) { const s = burnLayout(W, H, hud, narrow, null).ship, old = legacyShipBox(W, H, hud, narrow); assert.ok(s.w >= old.w - 0.5 && s.h >= old.h - 0.5, `${W}x${H}`); }
  const w = burnLayout(1280, 800, 220, false, null).ship; assert.ok(w.h >= 1.8 * legacyShipBox(1280, 800, 220, false).h);
});
test('a short window gives up the ticker line and the dates before the ship', () => {
  const tall = burnLayout(1280, 800, 220, false, null), short = burnLayout(1280, 600, 220, false, null);
  assert.equal(tall.tickerLines, 2); assert.equal(short.tickerLines, 1);
  assert.ok(short.ship.h >= legacyShipBox(1280, 600, 220, false).h);
});
test('a dialog docks at the right of the ship on a wide screen and leaves the left clear; on a narrow one it rises no higher than the ship\'s middle', () => {
  const w = burnLayout(1280, 800, 220, false, { h: 500 });
  assert.equal(w.dock.w, Math.min(560, (1280 - 220) * 0.45)); assert.equal(w.dock.y, w.ship.y); assert.equal(w.clear.x, w.ship.x); assert.ok(Math.abs(w.clear.x + w.clear.w - w.dock.x) <= 12);
  const n = burnLayout(390, 844, 0, true, { h: 900 });
  assert.ok(n.dock.y >= n.ship.y + n.ship.h / 2); assert.equal(n.clear.h, n.dock.y - n.ship.y);
});
```

`apart(a, b)` is a four-line helper in the test file.

- [ ] **Step 2: Run them to see them fail:** `node --test tests/burnlayout.test.js`. Expected: FAIL (`burnLayout is not defined`).
- [ ] **Step 3: Implement** `js/burnlayout.js` by the Global Constraints. The narrow ship height is `clamp(W * 1.0, W * 1.2, H - the other blocks)`, floored at `legacyShipBox`. When a box would leave the view, shed in this order: the ticker to one line (40 px), then the dates line (bar 48 px), then shrink the ship to its floor.
- [ ] **Step 4: Run them to see them pass:** `node --test tests/burnlayout.test.js tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** "Burn layout: one function gives every block its box".

---

### Task 2: The screen drawn from the layout

**Files:**
- Modify: `js/transit.js` (`drawTransit` from about line 507 to the end; `transitCommsLines`)
- Modify: `js/burnpanel.js` (remove `drawBurnPanel`; `burnState` stays)
- Modify: `js/game.js` (the tap handler, about line 1294: the ticker opens Comms)
- Test: `tests/burnview.test.js`, `tests/ui.test.js`, `tests/paint.test.js`

**Interfaces:**
- Consumes: `burnLayout`, `CUTAWAY_ASPECT` (Task 1); `drawCutaway(box)` (#864); `burnState()`; `tutorialPrompt(w)`.
- Produces: `G.burnBoxes` with the keys `bar`, `ship`, `ticker`, `tutorial` (only while it shows), `dest` (wide only, as today), and `dock` (Task 4). Plus `G.lifeY = ship.y + ship.h + ticker.h + 20`.

- [ ] **Step 1: Update the tests:**
  - `tests/burnview.test.js` "the burn view's blocks do not overlap": the keys are now `bar`, `ship`, `ticker`, `tutorial`. Add the Menu and System map buttons' rects (`#menuBtn` and the map button, through `getBoundingClientRect` relative to the canvas) to the boxes checked for overlap.
  - New test, "a tap on the ticker opens the Comms sheet, and does nothing while a scene is open": click the ticker's centre and expect `G.bridgeOpen === 'comms'`; then reset, `openEvent(...)`, click it again, and expect `null`.
  - `tests/ui.test.js:413-417`: replace the `transitCommsLines` cases with `burnLayout(...).tickerLines` at the same five shapes, expecting 2, 2, 2, 2 and 1 (the tiny one).
  - `tests/paint.test.js:133`: `G.burnBoxes.dest` keeps its 80-px box.
- [ ] **Step 2: Run them to see them fail:** `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) node --test tests/burnview.test.js tests/ui.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `drawTransit` calls `burnLayout(W, H, G.hudW, narrow, dialogSize)` once per frame, where `dialogSize` is `{ h: #panel.event's scrollHeight }` or null.
  - It draws:
    - the stars and background, as now;
    - in `bar`: the ship's title, the route, `drawRoute` filling the space between them, the dates line when `datesLine` is set, and at the right the speed (`fmtKms`) over the g line, in the exact words `drawBurnPanel` used: `FLIP: drive off, weightless`, or `${phase}: ${g.toFixed(2)} g thrust`;
    - in `ship`: `drawCutaway(ship)`;
    - the destination body, wide only, inside the ship box at its right edge, before the cutaway so the hull covers it;
    - in `ticker`: a `transitPanel` titled COMMS with the last `tickerLines` Comms messages, one line each, ellipsised to fit; the newest brighter. While `tutorialPrompt` shows, the prompt is drawn in `ticker` instead.
  - Remove the plate, the left Comms column, the BURN panel and the ship's log from the canvas (the log moves in Task 3).
  - `transitCommsLines` goes.
  - In js/game.js's tap handler, before people and rooms: a tap inside `G.burnBoxes.ticker` sets `G.bridgeOpen = G.bridgeOpen === 'comms' ? null : 'comms'` and calls `syncBridge(true)`. The handler already returns early under a scene.
- [ ] **Step 4: Run the burn view, ui and paint tests:** the same command plus `tests/paint.test.js tests/livingship.test.js`. Expected: PASS.
- [ ] **Step 5: Look at it.** Screenshot 1280x800, 768x1024 and 390x844 at progress 0.3 and 0.5. Check them against the spec's layout.
- [ ] **Step 6: Commit** "Burn layout: the bar, the ship and the ticker".

---

### Task 3: The burn panel's detail and the ship's log

**Files:**
- Modify: `js/bridge.js` (`navigationPanel`, line 54), `js/game.js` (`drawHud`, after the readouts, about line 1036), `js/comms.js` (`commsPanel`, line 82)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: `burnState()` (`peak`, `covered`, `dist`); the log lines `drawTransit` built (the missions, or the carried contract's line). Move that builder into a pure `shipLogLines(st, t, carried)` in `js/transit.js` that returns an array of strings.
- Produces: `shipLogLines(st, t, carried) -> string[]`.

- [ ] **Step 1: Write the failing browser tests:**
  - "the Bridge sheet reads the peak speed and the distance in a burn": `G.bridgeOpen = 'nav'`, then `syncBridge(true)`. The sheet's text includes `Peak` with `fmtKms(burnState().peak)`, and `Distance` with the covered and total millions of km, as the BURN panel printed them.
  - "the ship's log is in the HUD on a wide screen and at the top of Comms on a phone": on wide, a font/fillText spy sees each of `shipLogLines(...)` drawn in the HUD's x-range. On a 390x844 page, `commsPanel()` HTML contains each line before the inbox.
- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - In `navigationPanel`, while `t` is set: two `conRead`s after `Burn`. `conRead('Peak', fmtKms(b.peak))`, and `conRead('Distance', ...)` formatted as the panel's footer was: `x.x of y.y million km`.
  - In `drawHud`: a `hudLabel("Ship's log", ...)` section with the wrapped lines, during a burn only.
  - In `commsPanel`: a `conCard("Ship's log", ...)` above the feed, during a burn and on narrow (`!G.hudW`) only.
- [ ] **Step 4: Run the tests to see them pass:** burnview, comms and hired. Expected: PASS.
- [ ] **Step 5: Commit** "Burn layout: the instruments in the Bridge sheet, the log in the HUD and in Comms".

---

### Task 4: The docked dialog and the camera

**Files:**
- Modify: `js/transit.js` (set the dock), `style.css` (`#panel.event` while docked), `js/shiplife.js` (`drawCutaway(box, clear)` and the camera target)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: `burnLayout(...).dock` and `.clear` (Task 1); `camStep` (js/camera.js).
- Produces:
  - `drawCutaway(box, clear)`. `clear` defaults to `box`.
  - The `.docked` class on `#panel.event` during a burn, with `--dock-x`, `--dock-y`, `--dock-w` and `--dock-h` set in px relative to the viewport.

- [ ] **Step 1: Update the tests:**
  - Rename "with an event open, the Comms box stays clear of the dialog on a wide screen and a phone (#262)" (`tests/burnview.test.js:39`) to "with a scene open, the dialog sits in the dock, clear of the outline, and the hand is drawn in the clear part". At 1280x800 and 390x844, with an event open:
    - `#panel.event`'s rect equals `G.burnBoxes.dock` within 1 px;
    - it does not overlap `G.cutOutline`'s box;
    - the hand's hit (`G.cutHits[0]`, the hand) lies inside `G.burnBoxes.clear`;
    - `G.burnBoxes.tutorial`, if any, does not overlap the dock.
  - New test: a dialog whose content is taller than the dock scrolls (`scrollHeight > clientHeight`), and its rect stays the dock's.
  - New test: resize from 1280x800 to 390x844 with the dialog open; after two frames its rect equals the new dock.
- [ ] **Step 2: Run them to see them fail.** Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `drawTransit` passes `dialogSize` (Task 2), and when `dock` is set it writes the four properties on `#panel.event` in viewport px and adds `.docked`. It removes them otherwise.
  - CSS: `#panel.event.docked { inset: auto; left: var(--dock-x); top: var(--dock-y); width: var(--dock-w); max-height: var(--dock-h); transform: none; overflow-y: auto; }`.
  - `G.burnBoxes.dock` and `G.burnBoxes.clear` are recorded.
  - In `drawCutaway(box, clear)`, the camera target becomes `you.x * len + ((box.x + box.w / 2) - (clear.x + clear.w / 2)) / view.zoom`. Ease as now, so it slides when a dialog opens or closes. Hits and rooms are clipped to `clear` as well as `box`.
- [ ] **Step 4: Run the burn view tests:** burnview, livingship and burnlayout. Expected: PASS.
- [ ] **Step 5: Look at it.** Screenshot a scene open at 1280x800, 768x1024 and 390x844, and a fight board. Check the dialog, the clear part and the outline.
- [ ] **Step 6: Commit** "Burn layout: scenes dock beside the ship, and the camera keeps you in view".

---

### Task 5: The whole suite, pins, and push

- [ ] **Step 1:** Run `CHROMIUM_PATH=... npm test` and `npm run test:editor`. Expected: all pass. No pin should move (this is layout, not life). A pin that moves is a bug here: find it.
- [ ] **Step 2:** Run `npm run coverage -- --check`. Expected: no file under its floor.
- [ ] **Step 3:** Push to `ccr-fee54979-c9mnjt`. Open a pull request when the owner asks.
