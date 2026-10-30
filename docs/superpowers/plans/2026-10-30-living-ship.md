# The Living Ship Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the burn view's small whole-ship strip with a camera on a lived-in cutaway: low decks, props that answer the phase of the burn, the crew in named postures (the seam sprites will plug into), a live g reading, and an outline for the rooms out of view.

**Architecture:** Pure logic (phase weights, the g reading, postures, the camera) takes its state as parameters and is tested in Node through `tests/nodecontext.js`. Drawing is split into `js/figures.js` (people, replaced by sprites later), `js/rooms.js` (props, light, the sign) and `js/camera.js` (the view and the outline). `drawCutaway` in `js/shiplife.js` becomes the conductor: it draws the ship in world units under the camera's transform, inside a screen box `drawTransit` gives it.

**Tech Stack:** Vanilla JS classic scripts on one canvas, no build step; `node:test`, Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-30-living-ship-design.md`. Reference drawing (what the rooms, props and figures look like, with working code for the figures, `hangEnd`, the porthole, the lights and the sign): `docs/superpowers/mockups/2026-10-30-living-ship.html`. Port from it; its coordinates are its own, the world units below are the plan's.

## Global Constraints

- Classic scripts sharing one global scope: every new top-level name is unique (`tests/globals.test.js`), and every new script is linked in `index.html`.
- Every field kept on `G` is declared, with a comment, in the literal in `js/game.js` (`tests/gfields.test.js`).
- New logic takes the state it reads as parameters and returns a value; the caller reads `G`.
- No `hired()` forks; nothing in this work is owner-only.
- No emojis anywhere.
- Canvas text in the burn view is 12 px or more: the number in every `ctx.font` set while drawing it is 12 or more (`tests/burnview.test.js`, #265).
- Drawing uses no `Math.random` (the game's random is seeded in the tests; flicker and shake come from `G.time`, as the cutaway's shiver does now). This includes the plume's flicker, which today uses `Math.random`.
- `Settings.reduceMotion`: no shake, no sway; things hang straight and the stars do not streak (as now).
- World units: deck clear height 100, deck plate 12. Upper deck ceiling y = 0, floor y = 100; lower deck ceiling y = 112, floor y = 212; the hull's outer skin from y = -12 to y = 224. Hull length `HULL.length = 1600` for a size-18 ship, scaled by the existing factor `min(1, 0.6 + 0.4 * (size - 10) / 8)`. A room spans `r.x0 * len` to `r.x1 * len`. The nose is to the right and stays there through the flip.
- Phases (code names): `'couch'` (`pr < 0.06` or `pr > 0.94`), `'secure'` (`0.44 <= pr < 0.47` or `0.53 < pr <= 0.56`), `'float'` (`abs(pr - 0.5) < 0.03`), `'move'` otherwise.

## Review Focus

1. **Props that show the ship's state today must survive the rewrite:** one bunk per berth (`ship().berths`, up to twelve), crates in the hold by the cargo carried, the lower-nose tanks filled to the fuel left, and a sleeper lying in a bunk at night. A person expects the ship to look as full or empty as it is. (Test: Task 5, Step 1.)
2. **A tap on the outline where a person stands behind it** opens the room tapped on the outline, not the person. (Test: Task 6, Step 1.)
3. **The smallest ship** (a hull shorter than the view is wide): the camera centres the hull and does not jitter between its clamps. (Test: Task 4, Step 1.)
4. **Someone halfway up the ladder when the crew secure** ends on the nearer deck, strapped in, not hanging between decks. (Test: Task 1, Step 5.)
5. **Reduced motion:** hanging things hang straight in cruise and the view does not shake in the hard burn. (Test: Task 5, Step 1.)

---

### Task 1: Phase weights, the g reading, and the secure step

**Files:**
- Modify: `js/burnpanel.js:9-15` (`burnState`), add `phaseWeights` and `gReading`
- Modify: `js/shiplife.js:262-267` (`phase`), `js/shiplife.js:269-297` (`lifeTick`)
- Create: `tests/livingship.test.js`
- Modify: `tests/burnview.test.js` (one test added)

**Interfaces:**
- Produces: `phaseWeights(pr) -> { burn, cruise, flip }` (each 0..1, summing to 1); `gReading(pr, accel) -> number`; `phase()` may now return `'secure'`.

- [ ] **Step 1: Write the failing Node tests** in `tests/livingship.test.js`, loading `['js/burnpanel.js']` with `{ G: {} }` and names `['phaseWeights', 'gReading']`:

```js
test('the phase weights: all burn at the ends, all cruise between, all flip at the middle, and they always sum to one', () => {
  assert.deepEqual(phaseWeights(0.02), { burn: 1, cruise: 0, flip: 0 });
  assert.deepEqual(phaseWeights(0.25), { burn: 0, cruise: 1, flip: 0 });
  assert.deepEqual(phaseWeights(0.5), { burn: 0, cruise: 0, flip: 1 });
  assert.deepEqual(phaseWeights(0.98), { burn: 1, cruise: 0, flip: 0 });
  for (let p = 0; p <= 1; p += 0.001) { const w = phaseWeights(p); assert.ok(Math.abs(w.burn + w.cruise + w.flip - 1) < 1e-9 && Math.min(w.burn, w.cruise, w.flip) >= 0); }
});
test('the g reading: three times the thrust in the hard burn, the thrust in cruise, nothing at the flip, and no jumps', () => {
  assert.equal(gReading(0.02, 0.9), 2.7); assert.equal(gReading(0.3, 0.9), 0.9); assert.equal(gReading(0.5, 0.9), 0); assert.equal(gReading(0.97, 0.9), 2.7);
  for (let p = 0; p < 1; p += 0.001) assert.ok(Math.abs(gReading(p + 0.001, 0.9) - gReading(p, 0.9)) < 0.1, `a jump at ${p.toFixed(3)}`);
});
```

And, loading `['js/data.js', 'js/util.js', 'js/shiplife.js']` with `{ G, Mods: { filter: (n, v) => v, emit() {}, register() {} } }` and names `['phase']`:

```js
test('the phases of a run, with the crew securing either side of the flip', () => {
  const at = pr => { G.transit = { total: 100, left: 100 * (1 - pr) }; return phase(); };
  assert.deepEqual([0.03, 0.2, 0.45, 0.5, 0.55, 0.8, 0.97].map(at), ['couch', 'move', 'secure', 'float', 'secure', 'move', 'couch']);
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/livingship.test.js`
Expected: FAIL (`phaseWeights is not defined`; `'move'` where `'secure'` is expected).

- [ ] **Step 3: Implement** in `js/burnpanel.js`: `phaseWeights(pr)` from smoothstep ramps, `burn = 1 - ramp(pr, 0.06, 0.10) + ramp(pr, 0.90, 0.94)`, `flip = ramp(pr, 0.44, 0.47) - ramp(pr, 0.53, 0.56)`, `cruise = 1 - burn - flip`, where `ramp(p, a, b)` is 0 below `a`, 1 above `b`, smoothstep between (name the helper so it is unique, e.g. `burnRamp`). `gReading(pr, accel) = accel * (1 + 2 * w.burn) * (1 - w.flip)`, rounded to the hundredth. In `burnState`, return `g: gReading(p, accel)` in place of the FLIP/accel choice (the `phase` field is unchanged). In `js/shiplife.js`, `phase()` returns `'secure'` for `0.44 <= pr < 0.47` or `0.53 < pr <= 0.56`, checked after `'couch'` and `'float'`.

- [ ] **Step 4: Run them to see them pass**

Run: `node --test tests/livingship.test.js`
Expected: PASS.

- [ ] **Step 5: Write the failing browser test** in `tests/burnview.test.js` (it uses that file's `helpers` and `burn()`):

```js
test('when the crew secure for the flip they strap in where they are, and someone on the ladder ends on a deck', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit; t.left = t.total * 0.7; updateTransit(0.1);
    const ps = shipPeople(), a = ps[0], b = ps[1];
    a.x = 0.5; a.room = 'galley'; a.tx = null; b.x = LADDER; b.dk = 0.4; b.tdk = 1;
    t.left = t.total * (1 - 0.455); for (let i = 0; i < 40; i++) lifeTick(0.1);
    return { phase: phase(), ax: a.x, bdk: b.dk, btx: b.tx };
  });
  assert.equal(r.phase, 'secure'); assert.equal(r.ax, 0.5, 'stays where they were'); assert.ok(r.bdk === 0 || r.bdk === 1, `on a deck: ${r.bdk}`); assert.equal(r.btx, null);
  await done();
});
```

- [ ] **Step 6: Run it to see it fail**

Run: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) node --test --test-name-pattern="secure for the flip" tests/burnview.test.js`
Expected: FAIL (`ax` moved toward the couch).

- [ ] **Step 7: Implement in `lifeTick`:** for `'couch'` keep today's drift to `p.seat`. For `'secure'` and `'float'`: `p.tx = null`, `p.tdk = Math.round(p.dk)`, move `p.dk` toward `p.tdk` at the ladder rate (`dt * 1.5`), snapping when within 0.01, and leave `p.x` alone. `'move'` is unchanged.

- [ ] **Step 8: Run the burn view tests**

Run: `CHROMIUM_PATH=... node --test tests/burnview.test.js tests/livingship.test.js`
Expected: PASS, including the existing "instruments follow the burn" test (its points 0.25 and 0.75 are cruise).

- [ ] **Step 9: Commit** `js/burnpanel.js js/shiplife.js tests/livingship.test.js tests/burnview.test.js` with message "Living ship: phase weights, a live g reading, and the crew secure for the flip".

---

### Task 2: Postures

**Files:**
- Create: `js/figures.js` (the `POSTURES` table only, this task)
- Modify: `js/shiplife.js` (add `posture`; `lifeTick` keeps `p.face`), `index.html` (link `js/figures.js` before `js/shiplife.js`)
- Test: `tests/livingship.test.js`

**Interfaces:**
- Consumes: `phase()` values from Task 1.
- Produces: `POSTURES` = `{ couch, stand, walk, climb, sit, bunk, strap, tether, 'cat-walk', 'cat-sit', 'cat-sleep', 'cat-float' }`, each `{ frames, fps }`: couch 1/0, stand 2/1, walk 8/10, climb 4/6, sit 2/1, bunk 1/0, strap 2/1, tether 8/4, cat-walk 6/8, cat-sit 2/1, cat-sleep 1/0, cat-float 6/4. `posture(p, ph, time, asleep) -> { name, x, deck, face, frame }` with `x` the share of the hull (`p.x`), `deck` = `p.dk`, `face` 1 or -1, `frame` = `fps ? Math.floor(time * fps) % frames : 0`.

- [ ] **Step 1: Write the failing tests** (load `js/data.js`, `js/util.js`, `js/figures.js`, `js/shiplife.js` with the Task 1 stubs; names `['posture', 'POSTURES', 'LADDER']`):

```js
test('a posture for everyone in every phase, from the list the sprites are drawn to', () => {
  const p = (o) => ({ role: 'gunner', room: 'galley', x: 0.5, dk: 0, tdk: 0, tx: null, ...o });
  assert.equal(posture(p(), 'couch', 0, false).name, 'couch');
  assert.equal(posture(p(), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p(), 'float', 0, false).name, 'strap');
  assert.equal(posture(p({ role: 'engineer' }), 'float', 0, false).name, 'tether');
  assert.equal(posture(p({ role: 'engineer' }), 'secure', 0, false).name, 'strap');
  assert.equal(posture(p({ tx: 0.6 }), 'move', 0, false).name, 'walk');
  assert.equal(posture(p({ x: LADDER, dk: 0.5, tdk: 1 }), 'move', 0, false).name, 'climb');
  assert.equal(posture(p(), 'move', 0, false).name, 'sit');
  assert.equal(posture(p({ room: 'hold' }), 'move', 0, false).name, 'stand');
  assert.equal(posture(p({ room: 'berths' }), 'move', 0, true).name, 'bunk');
  assert.deepEqual(['float', 'couch', 'move'].map(ph => posture(p({ role: 'cat' }), ph, 0, false).name), ['cat-float', 'cat-sleep', 'cat-sit']);
  assert.equal(posture(p({ role: 'cat', tx: 0.3 }), 'move', 0, false).name, 'cat-walk');
  for (const ph of ['couch', 'secure', 'float', 'move']) { const q = posture(p(), ph, 7.3, false); assert.ok(POSTURES[q.name] && q.frame >= 0 && q.frame < POSTURES[q.name].frames); }
  assert.equal(posture(p({ face: -1 }), 'move', 0, false).face, -1);
});
```

- [ ] **Step 2: Run to see it fail**: `node --test tests/livingship.test.js` -> FAIL (`posture is not defined`).
- [ ] **Step 3: Implement** `POSTURES` in `js/figures.js` and `posture` in `js/shiplife.js` by the rules in the test: cat first; then `asleep` -> `bunk`; `'couch'` -> `couch`; `'secure'` -> `strap`; `'float'` -> `tether` for the engineer, else `strap`; in `'move'`: `dk !== tdk` -> `climb`, `tx !== null` -> `walk`, a room in `['galley', 'gunnery', 'bridge', 'medbay']` -> `sit`, else `stand`. `face` is `p.face || 1`. In `lifeTick`'s move branch, set `p.face = Math.sign(target - p.x) || p.face` whenever a person moves along the deck.
- [ ] **Step 4: Run to see it pass**: `node --test tests/livingship.test.js tests/globals.test.js` -> PASS.
- [ ] **Step 5: Commit** "Living ship: the postures the sprites will be drawn to".

---

### Task 3: The placeholder figures

**Files:**
- Modify: `js/figures.js` (add `drawPerson`)
- Test: `tests/livingship.test.js`

**Interfaces:**
- Consumes: `POSTURES`, the posture object from Task 2.
- Produces: `drawPerson(ctx, pose, x, y, look)`. `x, y` are world units: `x` the person's place along the deck, `y` the floor under them (the bunk's mattress for `bunk`). `look = { color, face, floating }`, `face` an `Image` or `null`; `floating` (true at the flip) draws three strands of hair rising from the head. A standing person is 72 units tall (head top at `y - 72`); the figure faces `pose.face`. It returns the world point a tap should aim at (`{ x, y }`, the middle of the body).

- [ ] **Step 1: Write the failing test.** A recording fake context goes at the top of the test file and is reused in Task 5:

```js
const fakeCtx = () => { const calls = [], fonts = []; const c = new Proxy({}, { get: (o, k) => k in o ? o[k] : k === 'calls' ? calls : k === 'fonts' ? fonts : k === 'measureText' ? s => ({ width: String(s).length * 6 }) : /Gradient|createPattern/.test(k) ? () => ({ addColorStop() {} }) : (...a) => { calls.push(k); }, set: (o, k, v) => { if (k === 'font') fonts.push(v); o[k] = v; return true; } }); return c; };
test('every posture draws, faced either way, with or without a face, and gives a point to tap', () => {
  for (const name of Object.keys(POSTURES)) for (const face of [1, -1]) for (const img of [null, { width: 12 }]) for (const frame of [0, POSTURES[name].frames - 1]) {
    const c = fakeCtx(), at = drawPerson(c, { name, x: 0.5, deck: 0, face, frame }, 400, 100, { color: '#ffb347', face: img });
    assert.ok(c.calls.length > 0, `${name} drew`); assert.ok(at.y < 100 && at.y > 100 - 80, `${name}: a tap point on the body`);
    if (img && !name.startsWith('cat')) assert.ok(c.calls.includes('drawImage'), `${name}: the face is the head`);
  }
});
```

- [ ] **Step 2: Run to see it fail**: `node --test tests/livingship.test.js` -> FAIL.
- [ ] **Step 3: Implement** `drawPerson` by porting the mockup's `joints`, `figure` and `cat` (absolute limb angles, a torso of 32, limbs of 14 and 18, the strap lines when strapped, the tether is drawn by the caller). Each posture has a fixed set of joint angles per frame taken from the mockup's poses: `couch` the reclined couch pose, `sit` the stool pose (arms forward to a console), `walk` the mockup's walk cycle sampled at `frame / frames`, `climb` arms up and legs alternating, `strap` the flip pose with straps, `tether` the floating pose of the mockup's engineer, `bunk` lying with the head to the left. The head is the face image clipped to a circle when `look.face` is set (as `drawCutaway` does now), else a filled circle.
- [ ] **Step 4: Run to see it pass**: `node --test tests/livingship.test.js` -> PASS.
- [ ] **Step 5: Commit** "Living ship: placeholder figures for every posture".

---

### Task 4: The camera and the outline

**Files:**
- Create: `js/camera.js` (link in `index.html` after `js/figures.js`, before `js/shiplife.js`)
- Modify: `js/game.js` (declare `cam` and `cutOutline`), `js/transit.js:303` (`enterTransit` sets `G.cam = null`)
- Test: `tests/livingship.test.js`

**Interfaces:**
- Produces:
  - `HULL = { deck: 100, plate: 12, length: 1600, skin: 12 }`, `hullLength(size) -> number`, `floorY(dk) -> number` (100 at `dk` 0, 212 at `dk` 1, linear between).
  - `viewOf(box) -> { zoom, span }`: `zoom = box.h / 250`, `span = box.w / zoom` (world units across the view).
  - `camStep(camX, target, dt, span, len) -> number`: `null` camX snaps to `target`; otherwise eases `camX + (target - camX) * min(1, dt * 2.5)`; then clamps to `[span / 2, len * 1.02 - span / 2]`, or returns `len * 0.51` when `span >= len * 1.02`.
  - `outlineLayout(box, len) -> { x, y, w, h, rooms: [{ id, x, y, w, h }] }` in screen units, in the view box's top left corner, inset 8: `w = min(180, box.w * 0.32)`, `h = w * 0.16`; each room of `ROOMS` mapped by its shares and deck (`tall` rooms full height).
  - `outlineRoomAt(outline, x, y) -> id | null`.
  - `drawOutline(ctx, outline, dots, camX, span, len, turn)`: the hull, the rooms, a dot per person (`dots = [{ x, deck, color }]`), the frame of the view; squeezed horizontally by `abs(turn)` while the ship turns.
  - `G.cam` (`null` or `{ x, t }`: the world x it centres and the `G.time` of its last step) and `G.cutOutline` (`null` or `{ ...outlineLayout, ids }`), declared in `js/game.js`.

- [ ] **Step 1: Write the failing tests** (load `js/data.js`, `js/util.js`, `js/figures.js`, `js/camera.js`, `js/shiplife.js` with the Task 1 stubs):

```js
test('the camera snaps first, then eases, and stays inside the hull', () => {
  assert.equal(camStep(null, 800, 0.1, 600, 1600), 800);
  const x = camStep(800, 1000, 0.1, 600, 1600); assert.ok(x > 800 && x < 1000);
  assert.equal(camStep(800, 0, 1, 600, 1600), 300); assert.equal(camStep(800, 5000, 1, 600, 1600), 1632 - 300);
});
test('a hull shorter than the view sits in the middle and does not jitter', () => {
  const a = camStep(null, 100, 0.1, 1200, 960), b = camStep(a, 900, 0.1, 1200, 960); assert.equal(a, 960 * 0.51); assert.equal(b, a);
});
test('the zoom fits both decks in the box; the outline finds every room, and nothing outside it', () => {
  const v = viewOf({ x: 0, y: 0, w: 864, h: 311 }); assert.ok(Math.abs(v.zoom - 1.244) < 0.01); assert.ok(Math.abs(v.span - 864 / v.zoom) < 1e-9);
  const o = outlineLayout({ x: 100, y: 50, w: 864, h: 311 }, 1600);
  for (const r of o.rooms) assert.equal(outlineRoomAt(o, r.x + r.w / 2, r.y + r.h / 2), r.id);
  assert.equal(o.rooms.length, ROOMS.length); assert.equal(outlineRoomAt(o, o.x - 4, o.y - 4), null);
  assert.equal(floorY(0), 100); assert.equal(floorY(1), 212); assert.equal(hullLength(18), 1600); assert.equal(hullLength(10), 960);
});
```

- [ ] **Step 2: Run to see it fail**: `node --test tests/livingship.test.js` -> FAIL.
- [ ] **Step 3: Implement** `js/camera.js` to the interfaces; the outline's look follows the mockup's minimap (dark panel, `#4a6a8a` hull line, `#2a4664` rooms, the view frame in `#d6e4f5`). Declare the two `G` fields with comments.
- [ ] **Step 4: Run to see it pass**: `node --test tests/livingship.test.js tests/globals.test.js tests/gfields.test.js` -> PASS.
- [ ] **Step 5: Commit** "Living ship: the camera and the outline".

---

### Task 5: The rooms

**Files:**
- Create: `js/rooms.js` (link in `index.html` after `js/camera.js`, before `js/shiplife.js`)
- Test: `tests/livingship.test.js`

**Interfaces:**
- Consumes: `phaseWeights` (Task 1), `HULL`, `floorY` (Task 4).
- Produces:
  - `hangEnd(ax, ay, len, seed, w, time, still) -> [x, y]` (the mockup's, plus `still`: straight down, no sway, when true).
  - `worldText(ctx, zoom, text, x, y, worldPx, color)`: draws only if `worldPx * zoom >= 12`, at `font` size `worldPx * zoom` under `ctx.scale(1 / zoom, 1 / zoom)` (so the font number is the screen size); returns whether it drew.
  - `drawRoom(ctx, id, r, s)` with `r = { x0, x1, top, floor }` in world units and `s = { w, time, zoom, spin, still, berths, cargo, fuel, burning, night, asleep }` (`w` from `phaseWeights`; `cargo` and `fuel` shares 0..1; `berths` the ship's count; `asleep` how many lie in bunks). `id` is a `ROOMS` id or `'tanks'` (the lower nose, 0.66 to 0.9). Each draws walls, seams, the cable run (sag `9 * w.burn + 4 * w.cruise`, floating at the flip), its lamp, and its props from the mockup: engine (reactor glowing by `burning`, catwalk at the deck line, tool board), berths (`min(12, berths)` bunks in two tiers, a curtain, the guitar, the sock), galley (lockers overhead, table and stools, counter and kettle, the plant, the pans, the calendar), gunnery (console with radar, the ammo rack, the feed chute to the turret, the poster), bridge (the forward window with stars turned by `spin`, console, bobblehead, the licence), hold (`round(12 * cargo)` crates, netted, the net bulging at the flip), medbay (bed with straps, the IV bag on `hangEnd`, the heart monitor), tanks (two tanks filled to `fuel`).
  - `drawPhaseLight(ctx, r, w, time, night, keepsLights)`: the lamp pool mixing red (burn), warm (cruise) and pulsing amber (flip), dimmed by `night` unless `keepsLights` (bridge and engine, as now).
  - `drawThrustSign(ctx, x, y, g, w, time, zoom)`: the sign's text by the phase weights (`THRUST`, `CRUISE`, `FLIP SECURE` alternating every two seconds with `FLIP`), `g.toFixed(2) + ' G'`, through `worldText`.

- [ ] **Step 1: Write the failing tests** (load `js/data.js`, `js/util.js`, `js/burnpanel.js`, `js/figures.js`, `js/camera.js`, `js/rooms.js`, `js/shiplife.js` with the stubs):

```js
const S = (o) => ({ w: phaseWeights(0.3), time: 3, zoom: 1.24, spin: 0, still: false, berths: 6, cargo: 0.5, fuel: 0.5, burning: true, night: 0, asleep: 0, ...o });
test('every room draws in every phase, and its text is 12px on screen or not drawn', () => {
  for (const id of [...ROOMS.map(r => r.id), 'tanks']) for (const pr of [0.02, 0.3, 0.45, 0.5]) for (const zoom of [0.8, 1.24]) {
    const c = fakeCtx(); drawRoom(c, id, { x0: 300, x1: 700, top: 0, floor: 100 }, S({ w: phaseWeights(pr), zoom }));
    assert.ok(c.calls.length > 10, `${id} drew`); for (const f of c.fonts) assert.ok(Number(/(\d+(?:\.\d+)?)px/.exec(f)[1]) >= 12, `${id}: ${f}`);
  }
  assert.equal(worldText(fakeCtx(), 1, 'MUGS', 0, 0, 9, '#fff'), false); assert.equal(worldText(fakeCtx(), 1.5, 'MUGS', 0, 0, 9, '#fff'), true);
});
test('the rooms show the ship as it is: bunks by berths, crates by cargo, tanks by fuel', () => {
  const rects = (id, o) => { const c = fakeCtx(); drawRoom(c, id, { x0: 300, x1: 700, top: 0, floor: 100 }, S(o)); return c.calls.filter(k => k === 'fillRect').length; };
  assert.ok(rects('berths', { berths: 12 }) > rects('berths', { berths: 2 }));
  assert.ok(rects('hold', { cargo: 1 }) > rects('hold', { cargo: 0 }));
});
test('with reduced motion things hang straight down', () => {
  assert.deepEqual(hangEnd(10, 0, 20, 1, phaseWeights(0.3), 4.2, true), [10, 20]);
  const [x] = hangEnd(10, 0, 20, 1, phaseWeights(0.3), 4.2, false); assert.notEqual(x, 10);
});
```

(The tank fill is checked by eye in Task 6's screenshot; a rect count does not see a height.)

- [ ] **Step 2: Run to see it fail**: `node --test tests/livingship.test.js` -> FAIL.
- [ ] **Step 3: Implement** `js/rooms.js` by porting the mockup's room functions into room-relative placement: a prop's x is `x0 + (x1 - x0) * share`, its y is measured up from `floor` (ceiling at `floor - 100`). Where a room is too narrow for a prop (a short hull's gunnery), drop that prop rather than overlap; the order of what to drop first is the order listed above, last first.
- [ ] **Step 4: Run to see it pass**: `node --test tests/livingship.test.js tests/globals.test.js` -> PASS.
- [ ] **Step 5: Commit** "Living ship: lived-in rooms, phase light and the thrust sign".

---

### Task 6: The cutaway under the camera

**Files:**
- Modify: `js/shiplife.js:299-549` (`CUTAWAY_H`, `PLUME`, `drawCutaway`), `js/shiplife.js:25` (`roomAtPoint`)
- Modify: `js/transit.js:500-566` (stars, the box, the hits), `js/game.js:1294-1302` (the tap)
- Modify: `js/hulldetail.js` only if its functions need `turn = 1` handling (they take `X`, so they should not)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: everything above.
- Produces: `drawCutaway(box)` with `box = { x, y, w, h }` in screen pixels (replaces `drawCutaway(cx, cy, maxL)`); after it, `G.cutRooms` holds the rooms in view (screen boxes clipped to `box`), `G.cutHits` the people in view (`{ x, y, id }`, screen), `G.cutOutline` the outline with `ids` of everyone it shows. `CUTAWAY_ASPECT = { wide: 0.36, narrow: 0.6 }` replaces `CUTAWAY_H` (the box's height over its width).

- [ ] **Step 1: Update the tests in `tests/burnview.test.js` to the camera** (they fail until Step 3):
  - "draws for every ship and every turn": keep the 25 draws without error; drop `midTurn` (empty mid-turn) and assert instead that at `angle = 0` (mid-turn) `G.cutHits.length > 0` (the crew are drawn through the turn).
  - "crew who die": read the drawn ids as `new Set([...G.cutHits.map(h => h.id), ...G.cutOutline.ids])`.
  - "every room has a box": rename to "the rooms in view have boxes inside the window that do not overlap, and the outline reaches every room"; assert `G.cutRooms.length >= 1`, every box inside the window, no overlaps among `G.cutRooms`, and `new Set(G.cutOutline.rooms.map(r => r.id))` equals all `ROOMS` ids; drop the mid-turn emptiness.
  - "a tap at the centre of each room": for each box in `G.cutRooms` (in view) and each room in `G.cutOutline.rooms`, `roomAtPoint` at its centre finds that room; the point above the hull stays `null`.
  - "a tap on a room opens its console": for each room id, tap its outline box's centre (`G.cutOutline.rooms`) instead of a point in the view; the rest of the test is unchanged.
  - "a face for each person": count faces against people in view: `G.cutHits.filter(h => !shipPeople().find(p => p.id === h.id && (p.role === 'cat' || isAsleep(p)))).length`.
  - Add: "a tap on the outline opens the outline's room even with a person behind it": put the hand's hit under the outline (`G.cutHits[0]` moved inside `G.cutOutline.rooms[0]`'s box by setting the camera so the hand is under the corner, or by checking the handler's order directly), tap there, expect `G.bridgeOpen === roomSheet(G.cutOutline.rooms[0].id)`.

- [ ] **Step 2: Run them to see them fail**: `CHROMIUM_PATH=... node --test tests/burnview.test.js` -> FAIL (`G.cutOutline` is null).

- [ ] **Step 3: Implement.**
  - `js/transit.js`: the box is `w = L * k` (as now) and `h = w * CUTAWAY_ASPECT[narrow ? 'narrow' : 'wide']`, centred where the cutaway is drawn now; replace `CUTAWAY_H` in `k`, `G.burnBoxes.ship` and `G.lifeY` with the aspect; call `drawCutaway(box)` without the translate and scale (the shiver moves into `drawCutaway` as a translate inside the box, from `G.time`); drop the two loops that map `G.cutRooms` and `G.cutHits` back to the screen. The background stars rotate about the box's centre by `t.angle + Math.PI / 2` (0 before the flip, pi after; the streaks then run the other way, which is right for a ship braking nose first).
  - `drawCutaway(box)`: `len = hullLength(SHIPS[G.state.shipId].size)`, `view = viewOf(box)`, `G.cam = { x: camStep(G.cam && G.cam.x, you.x * len, dt, view.span, len) }` (`you` is `shipPeople()[0]`; `dt` from `G.time` since the last frame, kept on `G.cam`), then clip to the box, translate to its centre, `scale(view.zoom)`, translate `(-G.cam.x, -106)`, and draw: the plume at the stern when `burning`, from two bells (flicker from `G.time`), thruster puffs at nose and stern while turning (`!burning`), the hull (today's path with `X = f => f * len`, `top = -12`, `H = 236`, `turn = 1`, keeping `hullSeams` and `hullFittings`), `drawRoom` for each room and `'tanks'` (with `s.spin = t.angle + Math.PI / 2`, the same turn the background stars take, for the portholes and the bridge window), the bulkheads and ladder, each person through `posture` and `drawPerson` (`look.floating` when `phase()` is `'float'`) at `(p.x * len, floorY(p.dk))` (sleepers on the bunk the berths drew for them), the tether line for a `tether` posture to the nearest bulkhead, names on the deck plate under each person through `worldText` at 12 / zoom world px, `drawPhaseLight` per room, and `drawThrustSign` over the galley's forward hatch with `burnState().g`. The interior is never mirrored and nothing returns early mid-turn. Record `G.cutRooms`, `G.cutHits` in screen units from the transform, then `G.cutOutline = { ...outlineLayout(box, len), ids }` and `drawOutline`.
  - `roomAtPoint(x, y)`: `outlineRoomAt(G.cutOutline, x, y)` first, then the boxes in view.
  - `js/game.js` tap: if `G.cutOutline && outlineRoomAt(G.cutOutline, e.clientX, e.clientY)`, open that room's sheet before looking for a person.
  - `PLUME` stays; `CUTAWAY_H` goes.

- [ ] **Step 4: Run the burn view tests**: `CHROMIUM_PATH=... node --test tests/burnview.test.js tests/livingship.test.js` -> PASS. If "the burn view's blocks do not overlap" fails at a size, shrink `L` for that size (not the aspect) until it passes.

- [ ] **Step 5: Look at it.** With the `run` skill or a Playwright script, screenshot the burn view at 1280x800 and 390x844 at progress 0.03, 0.3, 0.45, 0.5 and 0.97, and check against the mockup: the hand in view, the decks low, the outline in the corner, red light and couches at 0.03, the crew strapped and the engineer tethered at 0.5, the tanks' fill. Fix what is wrong before committing.

- [ ] **Step 6: Commit** "Living ship: the cutaway under a camera, with the outline for the rooms out of view".

---

### Task 7: The whole suite, pins, and push

**Files:** whatever the suite turns up; pins under `tests/*pin.test.js`.

- [ ] **Step 1: Run everything**: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` and `npm run test:editor`. Expected: all pass, except possibly pins.
- [ ] **Step 2: If a pin moved,** check the diff is only the timing of ship life (the secure step stops movement and chatter for 6% of the run): rewrite it with `PIN_WRITE=1` and list it for the pull request. Any other failure is a bug in this work: fix it.
- [ ] **Step 3: Coverage floor**: `npm run coverage -- --check`. If a file the floor names fell, test what it names.
- [ ] **Step 4: Push** to `ccr-fee54979-c9mnjt`. Open a pull request only when the owner asks.
