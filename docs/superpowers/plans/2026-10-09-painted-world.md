# The Painted World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carry the flight view's look (painted bodies, light, depth, a sense of place) to the landed shell, the title, the system map, the burn view and the scene dialog, drawn in code with a slot for images later.

**Architecture:** One refactor lets the body painter in `js/art.js` draw onto any canvas with any sun and cache sprites by size. Every screen then calls it: the viewscreen strip paints the docked body's limb, the title paints Earth, the map paints a small body per system, the burn view paints the destination ahead. Panels become one translucent "glass" material in CSS and on the canvas, lit from the sun's side through a CSS custom property.

**Tech Stack:** Vanilla JS classic scripts in one global scope, no build step, canvas 2D, CSS custom properties and `color-mix`. Tests are Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-09-painted-world-design.md`.

## Where the code stands

- `bodySprite(pl)` (`js/art.js:253`) caches by `pl.name` only and draws at `k = min(2, devicePixelRatio)` except giants. `drawBody(pl, x, y)` (`js/art.js:471`) and `shadeBody`, `drawAtmosphere`, `drawRings`, `drawBodyLights` all draw on the global `ctx` (the main canvas, `js/game.js:16`) and light from `sunLight()`, which reads `G.state`.
- The viewscreen strip is `<canvas id="vs" class="vs">` in `shellHtml` (`js/shell.js:60`), 92px (96px from 700px) in `style.css:483`, drawn every frame while landed by `drawViewscreen(time)` (`js/bridge.js:228`): stars, a flat disc, a rim stroke in the faction colour, a turning ring. It works in device pixels, scaling by hand.
- The panel is opaque: `#panel` background is a scanline gradient over `var(--panel)` (`style.css:38`); `.hdr` is an opaque gradient; `.dock` is `var(--panel-2)`.
- The title backdrop is `drawTitle(W, H)` (`js/menu.js:272`): a glow and drifting stars. `G.state` is null there. `Menu.render()` writes into `UI.el`.
- The map is `drawMap(W, H)` (`js/game.js:1029`): orbit rings, a 16px sun, a 6px dot per system in `GOV_COLORS`, rings for you (white, r 13), raids (r 11), the captain's destination (green, r 15) and missions (r 18). `tests/handscreens.test.js:93` wraps `ctx.arc` and counts arcs of r 15 in `#5fd35f`.
- The burn view is `drawTransit(W, H)` (`js/transit.js:487`): two glows, star streaks, the cutaway, a route plate at `rgba(3,6,15,0.82)`, and `transitPanel(x, y, w, h, title)` (`js/transit.js:427`) at `rgba(8,16,28,0.86)` with a `#1f3349` line. Each block records its box in `G.burnBoxes`, and `tests/burnview.test.js:86` checks every box is inside the view and none overlap at 1280x800, 768x1024 and 390x844. On a phone (`narrow`, no HUD sidebar) the Comms card spans the width.
- Scenes: `UI.showEvent` (`js/ui.js:59`) sets the accent and writes `.event-body`; the markup is pinned by golden fixtures in `tests/fixtures` through `tests/views.test.js`.
- `Settings.reduceMotion` (`js/menu.js:13`) already stops the ring and slows the stars.

## Global Constraints

- No framework, no bundler, no build step. Classic scripts share one global scope: `tests/globals.test.js` fails on a duplicate top-level name. New top-level names in this plan: `TITLE_SUN`, `VISTA_IMAGES`, `VISTA_IMAGE_CACHE`, `vistaImage`, `glassPanel`.
- No emojis anywhere (code, text, docs, commits). Canvas text 12px or more (`tests/burnview.test.js`, "#265").
- Markup of the pages, the scene dialog and the shell does not change (golden fixtures).
- No backdrop blur. Reduce motion adds no movement.
- Heartbeat: read `.claude/heartbeat.json` before editing, update it at each step, never commit it (CLAUDE.md).
- Commits end with the attribution lines the session gives.
- Tests: `node --test tests/paint.test.js` for the new file; `npm run test:changed` while working; `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` before every push; `npm run coverage -- --check` at the end (`js/ui.js` floor 90, `js/shell.js` 98).
- Before each push, screenshot the step at 1280x800, 768x1024 and 390x844 (the script pattern in `tests/helpers.js`: `open`, `page.screenshot`) and send them to the owner.

## Review Focus

1. A port with no `BODY_ART` entry (the generic moon fallback) must paint in the vista. Pinned in Task 2's every-port test.
2. A phone at device pixel ratio 3 must paint the vista within the sprite memory bound. Pinned in Task 2 (`deviceScaleFactor: 3`).
3. The title must paint with `G.state` null: nothing on that path may call `sunLight()`. Pinned in Task 3.
4. A `VISTA_IMAGES` entry that fails to load must fall back to the procedural scene with no page error. Pinned in Task 2.
5. The destination ahead must never cache a sprite per frame as it grows. Pinned in Task 5 (one `@40` cache key after many frames).

## Decisions

- **Cache key:** `${pl.name}@${pl.r}`. **Resolution:** `k = art.type === 'giant' || r > 200 ? 1 : Math.min(2, devicePixelRatio || 1)`.
- **Painter options:** `drawBody(pl, x, y, opts = {})` with `opts.g` (context, default `ctx`) and `opts.sun` (default `sunLight()`, read only when `opts.sun` is absent). The helpers take the context as a trailing parameter with the same default.
- **Glass:** `--glass: rgba(11, 17, 27, 0.86)` in `:root`; the canvas twin is the same literal in `glassPanel`. Line `#22384f` (`--line`). Top glow: the accent at 10 percent fading to nothing over 28px.
- **Light:** `UI.setLight(angle)` sets `--light-x` on `#panel` to `${Math.round(50 + 50 * Math.cos(angle))}%`. `TITLE_SUN = { angle: -0.9, strength: 1 }` in `js/menu.js`.
- **Vista geometry (CSS px):** body radius `R = Math.min(w * 0.7, 360)`, centre `(w * 0.32, h + R * 0.72)`. A station port (`BODY_ART[name].type === 'station'`) is drawn whole instead: radius `h * 0.3` at `(w * 0.32, h * 0.5)`. Background body at `(w * 0.78, h * 0.3)`, radius `h * 0.22`, hazed with `rgba(3,7,10,0.35)`. **Vista sun:** `sunLight()` with the angle mirrored when the sun is below the horizon: `if (Math.sin(a) > 0) a = -a;`. Ring as today. Strip height 92px, 150px from 700px.
- **Title geometry:** `R = Math.min(W * 0.8, 720)`, centre `(W * 0.35, H + R * 0.72)`; the glow (the stops of `drawBackdrop`, radius `H * 0.5`) centred on the limb at `TITLE_SUN.angle`.
- **Map:** body radius 7 lit from the map's sun (`angle = Math.atan2(cy - y, cx - x)`), faction ring r 9.5, 1.5px. Sun core r 6, glow r 40. Depth gradient `rgba(111,176,255,0.07)` at the centre to transparent at `R`. Vignette transparent at `R * 0.9` to `rgba(0,0,0,0.55)` at the far corner.
- **Destination ahead:** wide screens only (`!narrow`). One sprite at r 40 drawn scaled to `8 + 32 * progress`, at `(viewW * 0.92, 284)` (under the Burn panel, which ends at y 228), sun angle `Math.PI`. Box `G.burnBoxes.dest = { x: dx - 40, y: dy - 40, w: 80, h: 80 }`.
- **Test file:** all new tests go in `tests/paint.test.js`, one `open` per test, narrow build unless the test says otherwise.

---

### Task 1: The painter draws on any canvas, and the glass tokens

**Files:**
- Modify: `js/art.js:253-271, 381, 421-481`
- Modify: `style.css:5-20, 38-45, 133-140, 158-166, 123`
- Modify: `js/ui.js:53-55, 59-62, 147-152`
- Create: `tests/paint.test.js`

**Interfaces:**
- Produces: `drawBody(pl, x, y, opts = {})` where `opts = { g?: CanvasRenderingContext2D, sun?: { angle, strength } }`; `shadeBody(x, y, r, shape, sun, g = ctx)`, `drawAtmosphere(color, x, y, r, sun, g = ctx)`, `drawRings(x, y, r, back, g = ctx)`, `drawBodyLights(sp, x, y, g = ctx)`; `BODY_CACHE` keyed `${name}@${r}`; CSS `--glass`, `--light-x`; `UI.setLight(angle)`.

- [ ] **Step 1: Write the failing tests** in `tests/paint.test.js`:

```js
test('the body painter draws on a second canvas, with its own sun, and caches by size', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    const c = document.createElement('canvas'); c.width = c.height = 200; const g = c.getContext('2d');
    drawBody({ name: 'Earth', r: 60 }, 100, 100, { g, sun: { angle: 0, strength: 1 } });
    const [cr, cg, cb, ca] = g.getImageData(100, 100, 1, 1).data;
    takeOff(); render();  // the flight view paints Earth at its own radius
    return { ca, lit: cr + cg + cb > 60, keys: Object.keys(BODY_CACHE).filter(k => k.startsWith('Earth@')).sort() };
  });
  assert.equal(r.ca, 255); assert.ok(r.lit);
  assert.deepEqual(r.keys, ['Earth@60', 'Earth@95']);
  await done();
});
test('the panel is glass, lit from the sun\'s side', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => { UI.render(); const cs = getComputedStyle(document.getElementById('panel')); return { bg: cs.backgroundColor, light: cs.getPropertyValue('--light-x').trim() }; });
  assert.match(r.bg, /rgba\(11, 17, 27, 0\.86\)/);
  assert.match(r.light, /^\d{1,3}%$/);
  await done();
});
```

- [ ] **Step 2: Run them to see them fail.** `node --test tests/paint.test.js`. Expected: FAIL (`drawBody` ignores the options and the cache key is `Earth`; `--light-x` is empty).
- [ ] **Step 3: Implement the painter change** in `js/art.js`: the cache key and `k` rule from Decisions; `drawBody(pl, x, y, opts = {})` resolving `g` and `sun` once and passing `g` to the four helpers, which replace their `ctx` with the parameter. `drawBackdrop`'s call `drawBody({ name: b.name, r: b.r }, x, y)` is unchanged.
- [ ] **Step 4: Implement the glass** in `style.css`: add `--glass` and `--light-x: 50%` to `:root`; `#panel` background becomes the scanline gradient over `var(--glass)`; `.hdr` background becomes `radial-gradient(farthest-corner at var(--light-x) 0, color-mix(in srgb, var(--accent) 16%, transparent), transparent 60%), linear-gradient(color-mix(in srgb, var(--accent) 10%, var(--panel-2)), transparent)`; `.dock` background `color-mix(in srgb, var(--panel-2) 80%, transparent)`; `#panel.event .choices` gradient ends in `var(--glass)`. Add `UI.setLight(angle)` beside `setAccent` in `js/ui.js`, and call `this.setLight(sunLight().angle)` in `render()` and in `showEvent()` (guarded: `G.state ? sunLight().angle : TITLE_SUN.angle`; `TITLE_SUN` arrives in Task 3, so for now the guard falls back to `-0.9`).
- [ ] **Step 5: Run the new file and the changed tests.** `node --test tests/paint.test.js && npm run test:changed`. Expected: PASS, including `tests/views.test.js` (no markup changed) and `tests/a11y.test.js`.
- [ ] **Step 6: Screenshot the Port page at the three sizes and send them.** The panel should read as glass over the stars with the header lit from one side; nothing else moves.
- [ ] **Step 7: Full suite, then commit.**

```bash
git add js/art.js style.css js/ui.js tests/paint.test.js
git commit -m "Let the body painter draw on any canvas, and make the panel glass lit from the sun's side"
```

### Task 2: The landed vista and the image slot

**Files:**
- Modify: `js/bridge.js:226-247`
- Modify: `js/data.js` (after `GOV_COLORS`)
- Modify: `style.css:483-484`
- Test: `tests/paint.test.js`

**Interfaces:**
- Consumes: `drawBody` with `opts.g` and `opts.sun` (Task 1); `BACKDROPS` (`js/art.js`), `currentPlanet()`, `system()`, `sunLight()`.
- Produces: `VISTA_IMAGES = {}` (port name to image path) and `VISTA_IMAGE_CACHE = {}` in `js/data.js`; `vistaImage(name)` in `js/bridge.js` returning a loaded `HTMLImageElement` or `null`.

- [ ] **Step 1: Write the failing tests.** A 1x1 red PNG for the slot: `const RED = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==';`

```js
test('the vista paints every port in the full build: sky above, the body below', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const bad = await ev(() => {
    const out = [], c = document.getElementById('vs'), g = c.getContext('2d');
    for (const [sid, sys] of Object.entries(SYSTEMS)) for (const pl of sys.planets) {
      G.state.systemId = sid; G.state.planet = pl.name; drawViewscreen(0);
      const px = (x, y) => g.getImageData(Math.round(x * c.width), Math.round(y * c.height), 1, 1).data;
      const station = (BODY_ART[pl.name] || {}).type === 'station';
      const [tr, tg, tb] = px(0.02, 0.05), [br, bg, bb] = station ? px(0.32, 0.5) : px(0.3, 0.97);  // a station hangs in the middle; a world rises as a limb
      if (tr + tg + tb > 90 || br + bg + bb < 30) out.push(`${pl.name}: top ${tr + tg + tb}, bottom ${br + bg + bb}`);
    }
    return out;
  });
  assert.deepEqual(bad, []);
  await done();
});
test('the vista paints at device pixel ratio 3, and holds still with reduce motion', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true, init: () => Object.defineProperty(window, 'devicePixelRatio', { get: () => 3 }) });
  const r = await ev(() => {
    Settings.reduceMotion = true; drawViewscreen(0); const c = document.getElementById('vs');
    const a = c.toDataURL(); drawViewscreen(5000); return { same: a === c.toDataURL(), w: c.width, h: c.height };
  });
  assert.ok(r.same); assert.equal(r.h, 92 * 2, 'the canvas is capped at ratio 2');
  await done();
});
test('a port with an image shows it; an image that fails to load falls back to the painted scene', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(([red]) => { VISTA_IMAGES.Earth = red; drawViewscreen(0); }, [RED]);
  await page.waitForFunction(() => VISTA_IMAGE_CACHE.Earth && VISTA_IMAGE_CACHE.Earth.complete);
  const mid = await ev(() => { drawViewscreen(0); const c = document.getElementById('vs'); return [...c.getContext('2d').getImageData(c.width >> 1, c.height >> 1, 1, 1).data]; });
  assert.deepEqual(mid.slice(0, 3), [255, 0, 0]);
  await ev(() => { VISTA_IMAGES.Earth = 'data:image/png;base64,AAAA'; delete VISTA_IMAGE_CACHE.Earth; drawViewscreen(0); });  // fails to decode: no network, no console error
  await page.waitForTimeout(300);
  const fallback = await ev(() => { drawViewscreen(0); const c = document.getElementById('vs'); const [r, g, b] = c.getContext('2d').getImageData(Math.round(c.width * 0.3), c.height - 2, 1, 1).data; delete VISTA_IMAGES.Earth; return r + g + b; });
  assert.ok(fallback >= 30, 'the painted body is back');
  await done();  // asserts no page errors from the failed load
});
```

- [ ] **Step 2: Run them to see them fail.** Expected: FAIL (`VISTA_IMAGES` is not defined; the bottom pixel is the flat disc colour but the top test may pass by accident; the ratio test fails on `h`).
- [ ] **Step 3: Implement.** `js/data.js`: `const VISTA_IMAGES = {};` and `const VISTA_IMAGE_CACHE = {};` with a comment that a path per port name replaces the painted vista (relative to `index.html`, under the Content Security Policy's `img-src 'self' data:`). `js/bridge.js`: `vistaImage(name)` creates and caches an `Image` on first ask and returns it once `complete && naturalWidth`, else `null`; `drawViewscreen` sizes the canvas as now with `d = Math.min(devicePixelRatio || 1, 2)`, then `g.setTransform(d, 0, 0, d, 0, 0)` and works in CSS pixels `w / d`, `h / d`: fill `#03070a`, stars, then if `vistaImage(p.name)` draw it cover-fit and return; else the background body (Decisions) when `BACKDROPS[st.systemId]` or `sys.planets[0].name !== p.name`, then the docked body, as a limb or whole for a station (Decisions), `drawBody({ name: p.name, r: R }, cx, cy, { g, sun })` with the vista sun from Decisions, then the ring as today. Delete the flat disc and rim stroke. `style.css`: `.vs` 92px, 150px from 700px.
- [ ] **Step 4: Run the new file and the changed tests.** Expected: PASS, including `tests/layout.test.js` (the strip is taller; the rail, page, dock and primary action still fit) and `tests/ui.test.js` (`#vs` visible).
- [ ] **Step 5: Screenshot Port at the three sizes, at Earth and at Luna (full build, `land` on Luna), and send them.** Adjust the geometry constants in Decisions if the limb hides the sky or the ring; keep the test's pixel rule (sky at 5 percent height, body at 97 percent).
- [ ] **Step 6: Full suite, then commit.**

```bash
git add js/bridge.js js/data.js style.css tests/paint.test.js
git commit -m "Paint the port from the dock in the viewscreen, with a slot for an image per port"
```

### Task 3: The title

**Files:**
- Modify: `js/menu.js:147-152, 271-285`
- Modify: `js/ui.js` (the `showEvent` guard from Task 1 now names `TITLE_SUN`)
- Test: `tests/paint.test.js`

**Interfaces:**
- Consumes: `drawBody` with `opts.sun` (Task 1); `UI.setLight` (Task 1).
- Produces: `const TITLE_SUN = { angle: -0.9, strength: 1 };` in `js/menu.js`.

- [ ] **Step 1: Write the failing test.**

```js
test('the title paints Earth\'s limb with no save state, and lights the menu from the sun\'s side', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired', title: true });
  await page.waitForTimeout(200);
  const r = await ev(() => {
    const d = devicePixelRatio || 1, W = innerWidth, H = innerHeight;
    const sum = (x, y) => [...ctx.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data].slice(0, 3).reduce((a, v) => a + v);
    const limb = [0.25, 0.3, 0.35, 0.4, 0.45].map(f => sum(W * f, H - 10)), sky = sum(12, 12);
    return { state: G.state, limb: limb.some(v => v > 45), sky: sky < 60, light: getComputedStyle(document.getElementById('panel')).getPropertyValue('--light-x').trim(), key: !!BODY_CACHE['Earth@720'] };
  });
  assert.equal(r.state, null); assert.ok(r.limb, 'the limb is painted along the bottom'); assert.ok(r.sky, 'dark sky at the top'); assert.match(r.light, /^\d{1,3}%$/); assert.ok(r.key, 'one 720px Earth sprite');
  await done();
});
```

- [ ] **Step 2: Run it to see it fail.** Expected: FAIL (the bottom pixel is near black; `--light-x` is empty on the title).
- [ ] **Step 3: Implement.** `js/menu.js`: `TITLE_SUN`; `drawTitle` fills `#02040a`, draws the stars as now, then the glow at the limb (Decisions), then `drawBody({ name: 'Earth', r: R }, cx, cy, { sun: TITLE_SUN })`. `Menu.render()` calls `UI.setLight(TITLE_SUN.angle)` when `G.mode === 'title'`. `js/ui.js`: the `showEvent` guard uses `TITLE_SUN.angle`.
- [ ] **Step 4: Run the new file and `tests/menu.test.js`.** Expected: PASS.
- [ ] **Step 5: Screenshot the title at the three sizes and send them.**
- [ ] **Step 6: Full suite, then commit.**

```bash
git add js/menu.js js/ui.js tests/paint.test.js
git commit -m "Paint Earth's limb under the title, with the sun rising at its edge"
```

### Task 4: The system map

**Files:**
- Modify: `js/game.js:1029-1100`
- Test: `tests/paint.test.js`

**Interfaces:**
- Consumes: `drawBody` with `opts.sun` (Task 1); `G.mapPos` (set by `drawMap`).

- [ ] **Step 1: Write the failing test.**

```js
test('the map paints a small body at every system in range, inside its faction ring', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    openMap(); G.mapZoom = MAP_ZOOMS.length - 1; render();
    const d = devicePixelRatio || 1, dark = [];
    for (const id of Object.keys(SYSTEMS)) {
      const [x, y] = G.mapPos(id), [pr, pg, pb] = ctx.getImageData(Math.round(x * d), Math.round(y * d), 1, 1).data;
      if (pr + pg + pb < 40) dark.push(id);
    }
    closeMap();
    return { dark, keys: Object.keys(BODY_CACHE).filter(k => k.endsWith('@7')).length };
  });
  assert.deepEqual(r.dark, []); assert.ok(r.keys >= Object.keys(SYSTEMS).length - 2, 'a 7px sprite per system that is on the map');
  await done();
});
```

- [ ] **Step 2: Run it to see it fail.** Expected: FAIL (no `@7` sprites; the hand's out-of-range dots are dim but the first assertion may pass, the second fails).
- [ ] **Step 3: Implement** in `drawMap`: the depth gradient before the orbit rings; the sun as glow r 40 plus core r 6 with `drawBackdrop`'s stops; the dot replaced by `drawBody({ name: sys.planets[0].name, r: 7 }, x, y, { sun: { angle: Math.atan2(cy - y, cx - x), strength: 1 } })` followed by the faction ring (Decisions), keeping `globalAlpha` for out-of-range systems; the vignette after the rings and labels and before the title text. Rim pointers, the you/raid/destination/mission rings and all text unchanged.
- [ ] **Step 4: Run the new file and `tests/handscreens.test.js`.** Expected: PASS (the destination ring count is still one, the help text unchanged).
- [ ] **Step 5: Screenshot the map at the three sizes, at two zoom levels, and send them.**
- [ ] **Step 6: Full suite, then commit.**

```bash
git add js/game.js tests/paint.test.js
git commit -m "Paint the system map's bodies and sun, with depth under the orbits"
```

### Task 5: The burn view's cards and the destination ahead

**Files:**
- Modify: `js/transit.js:427-441, 487-520, 540-545`
- Test: `tests/paint.test.js`

**Interfaces:**
- Consumes: `drawBody` (Task 1); `G.burnBoxes` (checked by `tests/burnview.test.js`).
- Produces: `glassPanel(x, y, w, h)` in `js/transit.js`: the glass fill, line and top glow on the clipped-corner path, used by `transitPanel` and the route plate.

- [ ] **Step 1: Write the failing test.**

```js
test('the burn view paints the destination ahead on a wide screen, growing, from one cached sprite; a phone leaves it out', async () => {
  const wide = await open({ scope: 'earth-hired' });
  await wide.ev(() => { window.burn = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null; }; });
  const r = await wide.ev(() => {
    burn(); const t = G.transit, d = devicePixelRatio || 1, lit = [], dest = SYSTEMS[t.to].planets[0];
    for (const f of [0.1, 0.5, 0.9]) { t.left = t.total * (1 - f); drawTransit(innerWidth, innerHeight); const b = G.burnBoxes.dest; lit.push(ctx.getImageData(Math.round((b.x + 40) * d), Math.round((b.y + 40) * d), 1, 1).data.slice(0, 3).reduce((a, v) => a + v)); }
    return { lit, keys: Object.keys(BODY_CACHE).filter(k => k.startsWith(dest.name + '@')).sort(), allowed: [`${dest.name}@40`, `${dest.name}@${dest.r}`], box: G.burnBoxes.dest };
  });
  assert.ok(r.lit.every(v => v > 40), `lit at every progress: ${r.lit}`);
  assert.ok(r.keys.includes(r.allowed[0]) && r.keys.every(k => r.allowed.includes(k)), `one 40px sprite, not one per frame: ${r.keys}`);
  assert.deepEqual([r.box.w, r.box.h], [80, 80]);
  await wide.done();
  const phone = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true });
  await phone.ev(() => { window.burn = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.tutorial = null; sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null; }; });
  assert.equal(await phone.ev(() => { burn(); drawTransit(innerWidth, innerHeight); return G.burnBoxes.dest; }), undefined);
  await phone.done();
});
```

- [ ] **Step 2: Run it to see it fail.** Expected: FAIL (`G.burnBoxes.dest` is undefined on the wide screen).
- [ ] **Step 3: Implement.** `glassPanel(x, y, w, h)`: the clipped-corner path of `transitPanel`, filled `rgba(11,17,27,0.86)`, stroked `#22384f`, then a clipped linear gradient `rgba(127,180,255,0.10)` at `y` to transparent at `y + 28`. `transitPanel` calls it and keeps its accent bar and title. The route plate calls it in place of its `fillRect`. The destination (Decisions): after the glows and before the cutaway, when `!narrow`, one `drawBody({ name: SYSTEMS[t.to].planets[0].name, r: 40 }, 0, 0, { sun: { angle: Math.PI, strength: 1 } })` inside a `translate`/`scale` to `(8 + 32 * progress) / 40`, then `G.burnBoxes.dest`.
- [ ] **Step 4: Run the new file and `tests/burnview.test.js`.** Expected: PASS, the overlap test now including `dest` at 1280x800 (and no `dest` at the two narrow sizes). If `dest` overlaps the cutaway at 1280x800, lower it by raising its `y` only as far as `H / 2 - 110` and record the change in Decisions.
- [ ] **Step 5: Screenshot the burn view at the three sizes at mid-burn and send them.**
- [ ] **Step 6: Full suite, then commit.**

```bash
git add js/transit.js tests/paint.test.js
git commit -m "Give the burn view's cards the glass, and paint the destination growing ahead"
```

### Task 6: The scene dialog, the roadmap note and the final checks

**Files:**
- Modify: `style.css:91-100` (`.event-body`)
- Modify: `ROADMAP.md` (the "Current focus" list)
- Test: `tests/paint.test.js`

**Interfaces:**
- Consumes: `--light-x` and `UI.setLight` in `showEvent` (Task 1), `TITLE_SUN` (Task 3).

- [ ] **Step 1: Write the failing test.**

```js
test('a scene is glass lit from the sun\'s side, and its markup is unchanged', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    openEvent({ title: 'A Word at the Lock', text: 'The dock boss leans on the rail.', choices: [{ label: 'Say nothing', run() {} }] });
    const p = document.getElementById('panel'), body = p.querySelector('.event-body'), cs = getComputedStyle(body);
    return { light: getComputedStyle(p).getPropertyValue('--light-x').trim(), glow: /radial-gradient/.test(cs.backgroundImage), tags: [...body.children].map(e => e.tagName) };
  });
  assert.match(r.light, /^\d{1,3}%$/); assert.ok(r.glow);
  assert.deepEqual(r.tags, ['DIV', 'H1', 'P', 'DIV'], 'eyebrow, title, text, choices: the markup is as before');
  await done();
});
```

- [ ] **Step 2: Run it to see it fail.** Expected: FAIL (`.event-body` has no background image). If the `tags` assertion fails (a scene with faces adds a `.scene-faces` div), read the dialog's actual children once and pin those instead; the point is that this task does not change them.
- [ ] **Step 3: Implement.** `.event-body { background: radial-gradient(farthest-corner at var(--light-x) 0, color-mix(in srgb, var(--accent) 14%, transparent), transparent 55%); }`. In `ROADMAP.md`, under "Current focus", add one item after the ship interface (item 4) naming this pass, its spec and that it is done apart from images: "The painted world (`docs/superpowers/specs/2026-10-09-painted-world-design.md`): the flight view's painted bodies, light and depth carried to the landed vista, the title, the map, the burn cards and the scenes, drawn in code; `VISTA_IMAGES` is the slot for hand-made backdrops later."
- [ ] **Step 4: Run the new file and `tests/views.test.js`.** Expected: PASS (golden fixtures unchanged).
- [ ] **Step 5: Screenshot a scene at the three sizes, landed and in transit, and send them.**
- [ ] **Step 6: Full suite and the coverage floor.** `CHROMIUM_PATH=... npm test` and `npm run coverage -- --check`. Expected: all pass; `js/ui.js` at or above 90 and `js/shell.js` at or above 98. If `js/ui.js` fell, add a `paint.test.js` assertion that exercises `setLight` through `showEvent` in transit (`G.mode === 'transit'`) rather than lowering the floor.
- [ ] **Step 7: Commit, then mark the heartbeat `done`.**

```bash
git add style.css ROADMAP.md tests/paint.test.js
git commit -m "Light the scene dialog from the sun's side, and note the painted world in the roadmap"
```
