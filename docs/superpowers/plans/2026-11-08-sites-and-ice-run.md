# Sites and the Ice Run as Two Legs: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the ice rock a place that orbits, so the ice run is a burn to it, three shifts on station, and a burn home, with the three scenes where they belong (#948).

**Architecture:** Sites live on the save (`st.sites`), seeded once per run; `placeOf(id)` in `js/orbits.js` returns a system or a site, and every reader of a destination's record goes through it. Arrival at a site lands the ship on station (landed mode, its own `onStation` event, no `landed`), the stay machinery passes shifts, and the planner builds a two-leg run. New logic lives in `js/sites.js` and takes `st` as a parameter.

**Tech Stack:** Vanilla JS classic scripts, canvas; node tests through `tests/nodecontext.js`, browser tests through `tests/helpers.js` (`open({ scope: 'earth-hired' })`).

**Spec:** `docs/superpowers/specs/2026-11-08-sites-and-ice-run-design.md`

## Global Constraints

- No emojis anywhere. Desktop only. Keep it small: nothing the spec does not name.
- Classic scripts, one global scope: a new file is linked in `index.html` (`tests/globals.test.js`) and its top-level names are unique.
- Nothing new on `G`. `st.sites` is a feature field created lazily (`st.sites = st.sites || ...`), not in `stateDefaults`.
- New logic takes the state it reads (`st`, and what else) as parameters and returns a value; the caller reads `G`.
- The ice scenes' words, odds, loads and `iceStageScene`'s shape are unchanged (the hired scene pin plays `ice:1` to `ice:3`).
- Each system rolls its own dice: seeding sites draws nothing from `Math.random`.
- Page markup is built on the `h` helpers in `js/views.js`.
- Commit after each task. Run `npm run test:changed` before each commit and the full suite before the push.
- Heartbeat: update `.claude/heartbeat.json` at each step (before edits, after tests pass, after commit); never commit it.

## Review Focus

1. A save written on station, loaded again: `dropMissingModContent` must not reset the ship to Earth, and the shell must open on The Rock, not Port (Task 4 tests it).
2. A burn to a site meets a pirate or a patrol: `engage.js`, `fightladder.js` and `ties.js` read the destination's government; a site has `gov: 'Independent'` so they fall through as for an independent port (Task 2 tests `placeOf(site).gov`).
3. The tank: the planner must count both legs, since there is no refuel at a rock; a pick that strands the ship at the rock is the worst outcome (Task 3 tests the fuel gate).
4. A plan from an old save (`plan.ice` and no `site`) must be remade, not sailed (Task 3 tests `planStale`).
5. The occasion guard: the approach plays once on arrival and the cutting once on the first shift, whatever re-renders or reloads (Task 5 tests a second `passShift` and a reload do not replay).

---

### Task 1: Sites on the save, and `placeOf`

**Files:**
- Create: `js/sites.js`
- Modify: `js/orbits.js:11-16` (`orbitPeriod`, `orbitPos` read `placeOf`), `index.html:29` (link `js/sites.js` after `js/orbits.js`)
- Test: `tests/sites.test.js` (new), `tests/orbits.test.js`

**Interfaces:**
- Produces, `js/sites.js`: `SITE_KINDS = { ice: { word: 'an ice rock', color: '#8a8478' } }`; `ICE_SITES = 3`, `ICE_AU = [3.4, 4.2]`; `isSite(id)` (`/^site:/`); `siteKey(st)` (`hash` of `'sites|' + hired captain id + '|' + sign-on day`, from `st.hired`, else `'sites|'`); `seedSites(key)` returns `{ [id]: site }` with `ICE_SITES` ice sites `site:ice-1..3`, each `{ id, kind: 'ice', name, au, angle, found: null, gov: 'Independent', services: [], color, site: true }`, `au` within `ICE_AU`, `angle` in `[0, 360)`, `name` two capital letters, a hyphen and two digits (`KX-41`), all from the key; `sites(st)` (`st.sites = st.sites || seedSites(siteKey(st))`); `siteOf(st, id)` (the site or `null`); `atSite(st)` (`isSite(st.systemId)`); `findSite(st, id, day)` sets `found = day` and returns the site; `foundSites(st)` (the found ones' ids).
- Produces, `js/orbits.js`: `placeOf(id, st = G.state)` returns `SYSTEMS[id] || siteOf(st, id) || undefined`.

- [ ] **Step 1: Write the failing node tests**

`tests/sites.test.js`, loading `['js/data.js', 'js/util.js', 'js/orbits.js', 'js/sites.js']` with `G`, `roleSkill`, `ship` stubs as `tests/orbits.test.js` does:

```js
test('a run seeds three ice rocks past the Belt, the same for the same save and different for another', () => {
  const a = seedSites(12345), b = seedSites(12345), c = seedSites(54321);
  assert.deepEqual(a, b); assert.notDeepEqual(a, c);
  const list = Object.values(a);
  assert.equal(list.length, 3);
  for (const s of list) { assert.ok(s.au >= 3.4 && s.au <= 4.2); assert.ok(s.angle >= 0 && s.angle < 360); assert.match(s.name, /^[A-Z]{2}-\d{2}$/); assert.equal(s.kind, 'ice'); assert.equal(s.found, null); assert.equal(s.gov, 'Independent'); assert.deepEqual(s.services, []); assert.ok(isSite(s.id)); }
});
test('sites are made once on the save, placeOf finds a site or a system, and a found site is listed', () => {
  const { G, sites, placeOf, siteOf, findSite, foundSites, atSite } = setup();
  const first = sites(G.state); assert.equal(sites(G.state), first); assert.equal(G.state.sites, first);
  const id = Object.keys(first)[0];
  assert.equal(placeOf(id), first[id]); assert.equal(placeOf('mars').name, 'Mars'); assert.equal(placeOf('nowhere'), undefined); assert.equal(siteOf(G.state, 'mars'), null);
  assert.deepEqual(foundSites(G.state), []); findSite(G.state, id, 40); assert.equal(first[id].found, 40); assert.deepEqual(foundSites(G.state), [id]);
  assert.equal(atSite(G.state), false); G.state.systemId = id; assert.equal(atSite(G.state), true);
});
```

`tests/orbits.test.js`, a new test (load `js/sites.js` too in `setup`):

```js
test('a site orbits at its period like a place, and the burn math reads it', () => {
  const { G, sites, orbitPeriod, orbitPos, travelDays, burnFuel } = setup();
  const id = Object.keys(sites(G.state))[0], au = G.state.sites[id].au, p = orbitPeriod(id);
  assert.ok(near(p, 365.25 * Math.pow(au, 1.5), 1e-9));
  const a = orbitPos(id, 0), b = orbitPos(id, p); assert.ok(near(a.x, b.x, 1e-6) && near(a.y, b.y, 1e-6));
  assert.ok(travelDays('ceres', id) >= 1 && burnFuel('ceres', id) > 0);
});
```

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/sites.test.js tests/orbits.test.js`
Expected: FAIL, `seedSites is not defined` / `placeOf is not defined`.

- [ ] **Step 3: Write `js/sites.js` and `placeOf`**

`js/sites.js` header comment says what a site is and that it loads after `orbits.js`, before `game.js`, and runs under `tests/nodecontext.js`. `orbitPeriod` and `orbitPos` in `js/orbits.js` read `placeOf(id)` where they read `SYSTEMS[id]`. Link the script in `index.html` right after `js/orbits.js`.

- [ ] **Step 4: Run the tests and the globals check**

Run: `node --test tests/sites.test.js tests/orbits.test.js tests/globals.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/sites.js js/orbits.js index.html tests/sites.test.js tests/orbits.test.js
git commit -m "Sites: a place that orbits and has no port, and placeOf (#948)"
```

---

### Task 2: Every reader of a destination's record goes through `placeOf`

**Files:**
- Modify: `js/game.js:76` (`system`), `:79` (`currentPlanet`), `:166` (`dropMissingModContent`, both lines that test `SYSTEMS[...]` for the ship's place and `st.dest`), `:591`, `:642`, `:964`, `:979`, `:1017`, `:1047`, `:1236`; `js/transit.js:306` (`iceRun` days), `:309` (`count`), `:319` (the departure line), `:527`, `:657`; `js/bridge.js:32-45` (`routeSvg`), `:66-67`; `js/burnpanel.js:22`; `js/character.js:69`; `js/engage.js:21`; `js/family.js:172`; `js/fightladder.js:8`; `js/ties.js:250`; `js/report.js:26`
- Test: `tests/icerun.test.js` (a new test; the old burn test is replaced in Task 5)

**Interfaces:**
- Consumes: `placeOf`, `isSite`, `siteOf`, `atSite`, `SITE_KINDS` (Task 1).
- Produces: `system(id = G.state.systemId)` returns `placeOf(id)`; `currentPlanet()` returns the site record at a site, else the planet as now; `enterTransit` names `placeOf(to).name` and, for a run with `run.ice` leaving a port, says the framing line; the burn view's destination sprite is the rock for a site (`drawBody({ name: site.name, color: site.color, r: 40, art: { type: 'asteroid', base: [site.color, '#1a1d22'], craters: 6 } }, ...)`); `routeSvg(from, to, ...)` plots a site as a dot with its name.

- [ ] **Step 1: Write the failing browser test** (in `tests/icerun.test.js`, after `helpers`)

```js
test('a burn can be plotted to a site: the departure line names the rock, the HUD and the bridge draw it, and nothing reads a system that is not there', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), id = Object.keys(sites(st))[0], site = st.sites[id], out = {};
    h.run = { ice: { edge: 0 }, site: id, good: 'water', tons: 40, cost: 0, planet: 'Mars', sid: 'mars', day: st.day, from: 'Earth' };
    st.dest = id; enterTransit();
    out.to = G.transit.to; out.days = G.transit.days; out.comm = G.transit.comms.map(c => c.text || c).join(' | ');
    out.nav = navigationPanel(); out.plain = travelDays('earth', id);
    G.transit.left = G.transit.total * 0.4; drawTransit(1280, 800);  // the burn view with the destination sprite
    out.name = placeOf(id).name; out.gov = placeOf(id).gov;
    return out;
  });
  assert.match(r.to, /^site:ice-/); assert.equal(r.days, r.plain, 'the leg is a plain burn, not stretched');
  assert.match(r.comm, new RegExp(`Burn plotted for ${r.name}: \\d+ days\\. An ice run: three shifts on the rock, then home to Mars with the hold full\\.`));
  assert.ok(r.nav.includes(r.name), 'the Navigation console names the rock'); assert.equal(r.gov, 'Independent');
  await done();
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test tests/icerun.test.js`
Expected: FAIL in `enterTransit` (`Cannot read properties of undefined (reading 'name')`).

- [ ] **Step 3: Switch the readers**

Every `SYSTEMS[x]` in the files above where `x` can be a site id (the ship's place, `st.dest`, `G.transit.to`, `to`, `from`, `t.to`) becomes `placeOf(x)`. In `enterTransit`: `days = travelDays(st.systemId, to)` always (the `iceRun` stretch goes), `count` loses the `iceRun ? 5 : 0` floor, and the "Burn plotted" line becomes one `comm` call whose second sentence is `Crash couches ready.` as now, or, when `hired() && hired().run && hired().run.ice && !atSite(st)`, `An ice run: three shifts on the rock, then home to ${placeOf(hired().run.sid).name} with the hold full.` (one call, so the test's regex matches it whole). `routeSvg`'s `ids` are `Object.keys(SYSTEMS)` plus `to` and `from` when they are sites. The destination sprite at `transit.js:657` draws the rock for a site (Interfaces).

- [ ] **Step 4: Run the test**

Run: `node --test tests/icerun.test.js`
Expected: PASS for the new test (the old "burn is long" test fails on `days`; that is Task 5's; leave it red until then or mark it `{ skip: 'rewritten in Task 5' }` and remove the skip in Task 5).

- [ ] **Step 5: Commit**

```bash
git add js/game.js js/transit.js js/bridge.js js/burnpanel.js js/character.js js/engage.js js/family.js js/fightladder.js js/ties.js js/report.js tests/icerun.test.js
git commit -m "A burn can be plotted to a site: the readers of a destination go through placeOf (#948)"
```

---

### Task 3: The planner picks a rock and a water port, both legs covered

**Files:**
- Modify: `js/icerun.js:11-33` (`ICE_AT`, `iceDays` removed; `ICE_SHIFTS = 3` added; `iceOption` rewritten), `js/hired.js:233-252` (`planStale`, `sameRun`, `runWord`)
- Test: `tests/sites.test.js` (node, the pure pick), `tests/icerun.test.js` (the first test, rewritten)

**Interfaces:**
- Produces, `js/icerun.js`: `icePick(st, from, fuel, free, { price, travelDays, burnFuel })` is pure and returns `{ site, sid, planet, yard, sell, days }` or `null`: the found ice site in `sites(st)` else the nearest by `travelDays(from, id)`, in range (`burnFuel(from, site) <= fuel`); then over every trading planet of every system the water port with `price(pl, 'water') >= ICE_WATER_PRICE` that pays most, with `burnFuel(from, site) + burnFuel(site, sid) <= fuel`; `days = travelDays(from, site) + ICE_SHIFTS + travelDays(site, sid)`. `iceOption(here, from, reach, free)` keeps its signature and gates (gap, first days aboard, hold), calls `icePick` with the game's functions and `G.state.fuel`, calls `findSite` for the rock, and returns the run as now plus `site`.
- `planStale(h)` is also true when `h.plan.run && h.plan.run.ice && !h.plan.run.site`. `sameRun` compares `site` too. `runWord` for an ice run reads `the ice run to ${placeOf(r.site).name} and home to ${r.planet}`.

- [ ] **Step 1: Write the failing node test** (`tests/sites.test.js`, loading `js/icerun.js` too; stub `hired: () => null`, `G.state.fuel`, and the functions `icePick` takes)

```js
test('the pick takes the found rock, else the nearest, and a water port the tank reaches from it, both legs counted', () => {
  const { G, sites, icePick, findSite, travelDays, burnFuel } = setup({ fuel: 400 });
  const st = G.state, ids = Object.keys(sites(st)), price = (pl, g) => (g === 'water' && pl.name === 'Mars' ? 1200 : 500);
  const fns = { price, travelDays, burnFuel };
  const nearest = ids.slice().sort((a, b) => travelDays('ceres', a) - travelDays('ceres', b))[0];
  const p = icePick(st, 'ceres', 400, 40, fns);
  assert.equal(p.site, nearest); assert.equal(p.sid, 'mars'); assert.equal(p.planet, 'Mars');
  assert.equal(p.days, travelDays('ceres', p.site) + 3 + travelDays(p.site, 'mars'));
  findSite(st, ids[2], 1); assert.equal(icePick(st, 'ceres', 400, 40, fns).site, ids[2], 'a found rock is the pick');
  assert.equal(icePick(st, 'ceres', burnFuel('ceres', ids[2]) + 1, 40, fns), null, 'the tank must cover the leg home too');
  assert.equal(icePick(st, 'ceres', 400, 40, { ...fns, price: () => 500 }), null, 'no port dear enough, no run');
});
```

- [ ] **Step 2: Run it and see it fail**

Run: `node --test tests/sites.test.js`
Expected: FAIL, `icePick is not defined`.

- [ ] **Step 3: Write `icePick`, rewrite `iceOption`, adjust `planStale`, `sameRun`, `runWord`**

- [ ] **Step 4: Rewrite the planner test in `tests/icerun.test.js`** (the first test): with `window.price = () => 1200`, `iceOption(here, st.systemId, reach, 40)` returns `{ ice: true, good: 'water', cost: 0, tons: 40, site: /^site:ice-/, sid: 'mars' }` and `st.sites[site].found === st.day`; `days` equals `travelDays(from, site) + 3 + travelDays(site, 'mars')`; the gates (`cheap`, `full`, `soon`, `later`, `green`) hold as they do; and a plan `{ day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { ice: true } }` with no `site` is stale (`planStale(h) === true`).

- [ ] **Step 5: Run both**

Run: `node --test tests/sites.test.js tests/icerun.test.js`
Expected: PASS (the old "burn is long" test still skipped).

- [ ] **Step 6: Commit**

```bash
git add js/icerun.js js/hired.js tests/sites.test.js tests/icerun.test.js
git commit -m "The ice run plans two legs: a rock in reach, a water port the tank reaches from it (#948)"
```

---

### Task 4: Arrival on station: the shell, the rock's page, the header, the vista

**Files:**
- Modify: `js/game.js:611-634` (`arrive`), `:154-160` (`loadGame` opens on the site's page), `js/ui.js:38-44` (`openLanded(planet, notes, tab = 'port')`), `:134-149` (`headerHtml` at a site), `js/shell.js:10-24` (`RAIL`), `:30-33` (`SHELL_PAGES`), `js/bridge.js:265-300` (`drawViewscreen` at a site)
- Create: the page and the landing in `js/sites.js`
- Test: `tests/icerun.test.js` (new test), `tests/shell.test.js` (new test), `tests/fixtures/site.html` (golden)

**Interfaces:**
- Produces, `js/sites.js`: `landAtSite(site, notes = [])`: `st.systemId = site.id`, `st.planet = site.name`, `st.armor` written back from `G.player` when there is one, `G.transit = null`, `G.mode = 'landed'`, `G.shots = []`, `G.flash = 0`, `save()`, `UI.openLanded(site, notes, 'site')`, `Mods.emit('onStation', site)`; then `siteArrival(st)` (Task 5) opens the approach scene. `sitePageHtml(st, site, run)` returns the page (pure, `h` helpers): the designation and `${SITE_KINDS[site.kind].word}, ${site.au.toFixed(1)} AU`; a shifts line (`stayOf(st.hired)` left, of `ICE_SHIFTS`); the ice aboard (`st.cargo.water || 0` tons); the haul in `iceHaulWord(run.ice.edge)`; a hint that there is nothing to buy and nobody to talk to. `UI.views.site = () => sitePageHtml(G.state, currentPlanet(), hired().run)`. `siteHeader(site)` returns the eyebrow `On station` and the sub line `${SITE_KINDS[site.kind].word} at ${site.au.toFixed(1)} AU` for `headerHtml`. `drawSiteVista(g, w, h, site, sun)` paints the stars and the rock (`drawBody` with `{ name: site.name, color: site.color, r: VISTA_R, art: { type: 'asteroid', base: [site.color, '#1a1d22'], craters: 6 } }` scaled as the asteroid branch of `drawViewscreen` does, no lights).
- `arrive()`: after the days pass and `payCrew(days)`, `if (isSite(G.transit.to)) return landAtSite(siteOf(st, G.transit.to), [arriveLine-free notes])` with no `Mods.emit('arrive')`, no flight, no `populateSystem`.
- `RAIL`: the five Ashore entries gain `shown: p => !atSite(G.state)` (joined with their existing `shown` where they have one); a new entry `{ id: 'site', label: 'The Rock', group: 'ashore', tab: 'site', shown: () => atSite(G.state), ready: () => true }`. `SHELL_PAGES.site = {}`.
- `loadGame` opens `landAt(...)` as now for a port; at a site (`atSite(st)`) it calls `landAtSite(currentPlanet(), ['Save loaded. Welcome back.'])` instead, and `dropMissingModContent` uses `placeOf` so a site save survives.

- [ ] **Step 1: Write the failing browser tests**

`tests/icerun.test.js`:

```js
test('arrival at the rock lands on station: no landing hooks, the rail shows The Rock, the header and vista are the rock\'s, and a reload comes back there', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), id = Object.keys(sites(st))[0], out = {}, fired = [];
    const realEmit = Mods.emit; Mods.emit = function (name, ...a) { if (['landed', 'onStation', 'arrive'].includes(name)) fired.push(name); return realEmit.call(this, name, ...a); };
    h.run = { ice: { edge: 0 }, site: id, good: 'water', tons: 40, cost: 0, planet: 'Mars', sid: 'mars', day: st.day, from: 'Earth' };
    st.dest = id; enterTransit(); const day0 = st.day; G.transit.left = 0; updateTransit(0.01);
    out.fired = fired; out.mode = G.mode; out.at = st.systemId; out.planet = st.planet; out.days = st.day - day0;
    out.html = UI.el.innerHTML; out.tab = UI.tab; out.rail = [...UI.el.querySelectorAll('.rail button')].map(b => b.textContent);
    out.dialog = G.dialog && G.dialog.event.title;
    drawViewscreen(0);  // paints without a throw
    G.dialog = null; loadGame(); out.reload = { at: G.state.systemId, tab: UI.tab, mode: G.mode };
    Mods.emit = realEmit;
    return out;
  });
  assert.deepEqual(r.fired, ['onStation']); assert.equal(r.mode, 'landed'); assert.match(r.at, /^site:ice-/); assert.ok(r.days >= 1);
  assert.equal(r.tab, 'site'); assert.deepEqual(r.rail.slice(-1), ['The Rock']); assert.ok(!r.rail.includes('Port') && !r.rail.includes('Bar') && !r.rail.includes('Missions'));
  assert.match(r.html, /On station/); assert.match(r.html, /an ice rock at \d\.\d AU/); assert.doesNotMatch(r.html, /undefined/);
  assert.equal(r.dialog, 'The Rock', 'the approach plays on arrival');
  assert.equal(r.reload.at, r.at); assert.equal(r.reload.tab, 'site'); assert.equal(r.reload.mode, 'landed');
  await done();
});
```

`tests/shell.test.js`: a test that, at a site (set `st.systemId` to a site id, `st.planet` its name, `UI.openLanded(currentPlanet(), [], 'site')`), the rail's names are `['Bridge', 'Comms', 'Gunnery', 'Engine', 'Crew', 'Bonds', 'Journal', 'The Rock']` and groups end in one `'Ashore'`, and that the page's markup equals `tests/fixtures/site.html` (write the golden from the first passing render, as the other fixtures were; `h.run` set as above so the page has a haul line).

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/icerun.test.js tests/shell.test.js`
Expected: FAIL (`arrive` lands nothing at a site; `The Rock` is not on the rail).

- [ ] **Step 3: Implement the Interfaces above**

`headerHtml` at a site: eyebrow `On station &middot; ${site.name}`, `<h1>` the designation, the sub line from `siteHeader` in the neutral color. `drawViewscreen`: after the sky fill, `if (atSite(st)) return drawSiteVista(g, w, h, p, sun)` (compute `sun` first as the port branch does). `UI.render` keeps `setAccent(GOV_COLORS[system().gov])`; `Independent` has a color in `GOV_COLORS`.

- [ ] **Step 4: Run the tests, then the golden**

Run: `node --test tests/icerun.test.js tests/shell.test.js tests/globals.test.js tests/gfields.test.js`
Expected: PASS. (`siteArrival` opening the approach is Task 5; until then, stub the assertion on `r.dialog` by opening `iceStageScene(0)` in `landAtSite` directly, which Task 5 replaces with the once-only guard.)

- [ ] **Step 5: Commit**

```bash
git add js/sites.js js/game.js js/ui.js js/shell.js js/bridge.js tests/icerun.test.js tests/shell.test.js tests/fixtures/site.html
git commit -m "Arrival at a site lands on station: The Rock on the rail, the header and the vista (#948)"
```

---

### Task 5: The shifts, the scenes where they belong, and the burn home

**Files:**
- Modify: `js/stay.js:13-14` (`STAY_WHY.ice`, `nightLabel` for a site), `:25-37` (`passNight` hands a site to `passShift`), `js/hired.js:253-266` (`currentPlan` at a site), `:269-282` (`sail` at a site), `js/family.js:373` (the ice occasion on the home leg only), `js/ui.js:152-158` (`dockHtml` label at a site), `js/icerun.js` (`siteArrival`, `passShift`, `homeRun`, `sailHome`)
- Test: `tests/icerun.test.js` (the "burn is long" test replaced; the wage test kept), `tests/stay.test.js`

**Interfaces:**
- Produces, `js/icerun.js`: `siteArrival(st)`: when `hired().run.ice` and `!occasionPlayed({ kind: 'ice', stage: 0 })`, `beginStay(hired(), ICE_SHIFTS, 'ice')`, `markOccasion(...)`, `openEvent(iceStageScene(0))`; else nothing. `passShift(st)`: `st.day++`, `Mods.emit('newDay', st.day)`, the stay shortens as `passNight` does, no bar and no port happening; on the first shift (`!occasionPlayed({ kind: 'ice', stage: 1 })`) marks it and `openEvent(iceStageScene(1))`; returns `true`. `homeRun(h)` returns `{ sid: h.run.sid, planet: h.run.planet, good: 'water', tons: h.run.tons, cost: 0, profit: h.run.profit, days: travelDays(G.state.systemId, h.run.sid), ice: true, site: h.run.site, home: true }`. `sailHome()`: `st.dest = h.run.sid`, `st.route = { dock: h.run.planet, go: true }`, `G.burnAngle` from `orbitPos(st.systemId)` to `orbitPos(st.dest)`, `enterTransit()`; returns `true`. `h.run` is kept as it is (its `ice.edge`, `loaded`).
- `STAY_WHY.ice = 'working the ice'`; `nightLabel(s)` at a site reads `Work the ice (${s.left} more shift${s === 1 ? '' : 's'})`. `passNight()` returns `passShift(G.state)` when `atSite(G.state)`.
- `currentPlan()` returns `homeRun(h)` when `atSite(G.state)` (no `planRun`, no `h.plan`). `sail()` returns `sailHome()` when `atSite(st)` and no stay is on.
- `dockHtml`: the button at a site with no stay reads `Burn for ${h.run.planet} (T)` (same `data-action="sail"`).
- `planOccasions`: `if (hired() && hired().run && hired().run.ice && isSite(G.state.systemId)) t.occasions.push({ kind: 'ice', stage: 2, at: 0.5 })` replaces the `ICE_AT.forEach` line.

- [ ] **Step 1: Write the failing browser tests**

Replace the "burn is long" test in `tests/icerun.test.js` with:

```js
test('three shifts on the rock: the cutting plays once on the first, the button then says home, the home burn carries the third scene, and the run settles double', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), id = Object.keys(sites(st))[0], out = {}; st.cargo = {}; st.paid = {};
    h.run = { ice: { edge: 0 }, site: id, good: 'water', tons: 40, cost: 0, profit: 1, planet: 'Mars', sid: 'mars', day: st.day, from: 'Earth' };
    st.dest = id; enterTransit(); G.transit.left = 0; updateTransit(0.01);
    out.approach = G.dialog.event.title; take(G.dialog.event, /Match the roll/); finishEvent();
    out.stay = { left: h.stay.left, why: h.stay.why, button: UI.dockHtml(), noSail: sail() === false };
    const day0 = st.day; passNight(); out.cut = G.dialog && G.dialog.event.title; take(G.dialog.event, /Cut small/); finishEvent();
    out.loaded = st.cargo.water; passNight(); out.again = G.dialog && G.dialog.event.title; passNight();
    out.end = { stay: !!stayOf(h), days: st.day - day0, button: UI.dockHtml(), plan: currentPlan().home };
    out.sailed = sail(); out.to = G.transit && G.transit.to; out.mode = G.mode;
    updateTransit(0.01); planOccasions(); out.ice = G.transit.occasions.filter(o => o.kind === 'ice').map(o => [o.stage, o.at]);
    out.third = occasionEvent(G.transit.occasions.find(o => o.kind === 'ice')).title;
    return out;
  });
  assert.equal(r.approach, 'The Rock'); assert.equal(r.stay.left, 3); assert.equal(r.stay.why, 'ice'); assert.ok(r.stay.noSail);
  assert.match(r.stay.button, /data-action="night"[^>]*>Work the ice \(3 more shifts\)/);
  assert.equal(r.cut, 'Cutting Ice'); assert.ok(r.loaded >= 8 && r.loaded <= 40); assert.equal(r.again, null, 'the cutting plays once');
  assert.equal(r.end.stay, false); assert.equal(r.end.days, 3); assert.equal(r.end.plan, true); assert.match(r.end.button, /data-action="sail"[^>]*>Burn for Mars/);
  assert.ok(r.sailed); assert.equal(r.to, 'mars'); assert.equal(r.mode, 'transit');
  assert.deepEqual(r.ice, [[2, 0.5]]); assert.equal(r.third, 'Home With the Ice');
  await done();
});
```

In `tests/stay.test.js`, a short test: at a site with `beginStay(h, 3, 'ice')`, `nightLabel(stayOf(h))` is `Work the ice (3 more shifts)`, and after one `passNight()` the day moved by one and `G.patrons` did not change.

Keep the wage test and the thin-hold test as they are (they set `h.run` by hand and call `settleRun`; add `site: id` to their run records so they read as the new shape). Keep the openings test.

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/icerun.test.js tests/stay.test.js`
Expected: FAIL (`passNight` fills the bar and picks a port happening; `sail` rebuilds the run; `planOccasions` pushes three).

- [ ] **Step 3: Implement the Interfaces above**, and replace the Task 4 stub in `landAtSite` with `siteArrival(st)`.

- [ ] **Step 4: Run the tests**

Run: `node --test tests/icerun.test.js tests/stay.test.js tests/hiredpin.test.js tests/scenechoices.test.js`
Expected: PASS; the hired scene pin is unchanged.

- [ ] **Step 5: Commit**

```bash
git add js/icerun.js js/stay.js js/hired.js js/family.js js/ui.js tests/icerun.test.js tests/stay.test.js
git commit -m "The ice run stops at the rock: three shifts, the scenes where they belong, and the burn home (#948)"
```

---

### Task 6: The map shows a found site

**Files:**
- Modify: `js/game.js:1095` (`ids`), `:1102-1105` (`P` reads `placeOf`), `:1116-1120` (orbit rings over `placeOf(id).au`), `:1156-1200` (draw a site as a grey dot and its name, no faction ring), `:640-645` (`openMap` zoom reads `placeOf`)
- Test: `tests/map.test.js` if one exists, else a new test in `tests/icerun.test.js`

**Interfaces:**
- Consumes: `foundSites(st)`, `placeOf`, `isSite`.
- Produces: `ids = [...Object.keys(SYSTEMS), ...foundSites(st)]`; for a site, `drawBody` is skipped in favor of a 4px dot in `#8a8478` with the designation as its label and no `GOV_COLORS` ring; `G.mapPos` works for a site id.

- [ ] **Step 1: Write the failing browser test**

```js
test('the map draws a found rock as a grey dot with its name, and not an unfound one', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), ids = Object.keys(sites(st)), out = {};
    const texts = []; const real = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { texts.push(String(t)); return real.call(this, t, ...a); };
    try { openMap(); G.mapZoom = 2; drawMap(1280, 800); out.before = texts.slice(); texts.length = 0; findSite(st, ids[0], st.day); drawMap(1280, 800); out.after = texts.slice(); out.pos = G.mapPos(ids[0]); }
    finally { CanvasRenderingContext2D.prototype.fillText = real; closeMap(); }
    out.name = st.sites[ids[0]].name;
    return out;
  });
  assert.ok(!r.before.includes(r.name)); assert.ok(r.after.includes(r.name)); assert.ok(Array.isArray(r.pos) && r.pos.length === 2);
  await done();
});
```


- [ ] **Step 2: Run it and see it fail**

Run: `node --test tests/icerun.test.js`
Expected: FAIL (`after` has no site name).

- [ ] **Step 3: Implement**

- [ ] **Step 4: Run it, and the layout tests**

Run: `node --test tests/icerun.test.js tests/layout.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/game.js tests/icerun.test.js
git commit -m "The system map draws a found site (#948)"
```

---

### Task 7: The whole suite, the soak, the floor and the docs

**Files:**
- Modify: `tools/coverage-floor.json` (add `js/sites.js` to `globs`), `ROADMAP.md` (the Starsector entry's step 1 marked done, one line), `docs/superpowers/specs/2026-11-08-sites-and-ice-run-design.md` (the Sites section: a site record carries `gov: 'Independent'` and `services: []` for the readers that ask, and the seed key is the captain's id and the sign-on day), `docs/pins.md` only if a pin changed (none should)

- [ ] **Step 1: Run the changed tests and then the full suite**

Run: `npm run test:changed`, then `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`
Expected: all PASS. A pin that moved means a word moved: find it and put it back, do not re-pin.

- [ ] **Step 2: Coverage**

Run: `npm run coverage -- --check`
Expected: PASS with `js/sites.js` on the floor at its measured line coverage, `js/icerun.js` at 98 or above.

- [ ] **Step 3: The soak**

Run: `npm run soak`
Expected: PASS. Note the chapter's days to the share in the commit (ROADMAP says about 160; a swing of more than 15 days is a finding to report, not to tune).

- [ ] **Step 4: Docs**

Update the roadmap line and the spec's two sentences as above. Mark `.claude/heartbeat.json` `done` (not committed).

- [ ] **Step 5: Commit and push**

```bash
git add tools/coverage-floor.json ROADMAP.md docs/superpowers/specs/2026-11-08-sites-and-ice-run-design.md
git commit -m "Sites step 1 done: floor, roadmap and spec notes (#948)"
git push -u origin claude/wonderful-heisenberg-idb2zh
```
