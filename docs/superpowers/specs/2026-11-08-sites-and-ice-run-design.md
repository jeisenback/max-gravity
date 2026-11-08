# Sites, and the Ice Run as Two Legs

Status: approved by the owner on 2026-11-08 (#948); built the same day (`docs/superpowers/plans/2026-11-08-sites-and-ice-run.md`). The first step of exploration and salvage; the later steps are listed at the end and in `ROADMAP.md`.

## Why

An ice run is one ordinary burn from port to port, stretched to one and a half times the days plus three, with its three scenes dropped in at 30, 50 and 78 percent of the way (`ICE_AT`, `js/icerun.js`). The HUD names the port the whole time, the ship is under burn when the text says she is stationed against the rock, and nothing at departure says the run is any different. The rock is not a place, so the flight cannot go to it (#948).

Chapter 2 wants rocks and wrecks off the lanes that the ship flies to, stops at and works (`docs/bible/the-belt.md`: tow and salvage, haul back, survey; Bexa's wreck in `chapter-2.md`). The machinery is the same: a place that is not a port, a burn to it, a stop, and a burn home. This spec builds that machinery once and moves the ice run onto it, so chapter 1 proves it on scenes that already exist before any new writing starts.

## What it does

- A **site** is a place that orbits like everything else and has no port. The ice rock is the first kind.
- The ice run is **two legs with a stop**: a burn to the rock, three shifts on it, a burn home. The HUD, the map and the departure line name the rock.
- The three scenes play where they belong: the approach on arrival, the cutting on the first shift, the haul home on the burn back. Their words do not change.
- **On station** the landed shell shows the ship's rooms and one page for the rock, and nothing a port has.

## Decisions

### Sites (`js/sites.js`, loaded after `orbits.js` and before `game.js`)

- A site is `{ id, kind, name, au, angle, found }`: `id` is `site:<kind>-<n>` (`site:ice-1`), `kind` is `ice` for now (`wreck` and `rock` come with chapter 2), `name` is a designation the crews use (`KX-41`: two letters and two digits drawn from the id), `au` and `angle` are its orbit as a system has them, `found` is the day it was found or `null`.
- Sites live on the save as `st.sites`, an object by id, created lazily by `sites(st)` on first use (`st.sites = st.sites || seedSites(st)`), so no old save changes shape and a save from before gets its sites the first time anything asks. They are seeded by `hash` of facts already on the save (the hired captain's id and the sign-on day, `h.captain` and `h.since`), with no draw of the game's, so no other outcome moves (`shape.md`: each system rolls its own dice).
- Chapter 1 seeds three ice rocks at 3.0 to 3.8 AU, the outer Belt, angles spread round the circle (the first build put them at 3.4 to 4.2, "past the Belt" as the ice run said; the pacing soak had a captain's pay a day fall to 70 percent of his rate on the longer runs from the inner system, so the owner moved them nearer, 2026-11-08). Only ice rocks exist until chapter 2's step adds kinds.
- `placeOf(id, st)` (in `js/orbits.js`, since the orbit math is the first reader) returns `SYSTEMS[id]` or the site, and `orbitPeriod`, `orbitPos` and so `distAU`, `travelDays`, `burnFuel`, `bestWindow` and `inRange` read it. A site has what they read (`au`, `angle`), a `name`, and `gov: 'Independent'` and `services: []` for the readers that ask a place its government or its services (the world's unrest, the storylets' conditions, the rail); it has no `planets` and no `pirates`, and the readers that need those (the flight view, the dock) never see a site. Nothing is added to `SYSTEMS`, so every loop over it is untouched.
- `isSite(id)` is the one test (`/^site:/`). `atSite(st)` says whether the ship is at one (`isSite(st.systemId)`).
- `findSite(st, id, day)` sets `found`. The captain knows her rock, so the planner finds it when it plans the run.

### The two-leg run (`js/icerun.js`, `js/hired.js`)

- **The pick.** `iceOption` looks for the rock first: the found ice rock, else the nearest one, in range from here. Then the water port: the trading port in reach **from the rock** whose water price is `ICE_WATER_PRICE` or more and pays most, with the tank covering both legs (`burnFuel(here, rock) + burnFuel(rock, port) <= st.fuel`; there is no refuel at a rock). No such pair, no ice run. The gap, the hold and the first days aboard gate it as now.
- **The run record** is the plan as now plus `site` (the rock's id) and `days` as out plus `ICE_SHIFTS` (3) plus home, which comes to about the fifteen days the stretched burn gives today, so the chapter's pacing should hold (checked by the soak). `ice: { edge: 0 }`, `iceAt` and `iceRuns` are set as now. `ICE_AT` and `iceDays` go.
- **Sailing** sets `st.dest` to the rock and no `route`; a crewed pilot or the hand takes her out as now. The burn's departure line (`enterTransit`) names the rock and frames the run once: "Burn plotted for KX-41: 6 days. An ice run: three shifts on the rock, then home to Mars with the hold full." The HUD's burn line and the Bridge's read `placeOf(st.dest).name`.
- **Arrival at a site** (`arrive`, `js/game.js`): the days pass and the crew are paid as now; then, instead of flight and the autopilot, `landAtSite(site)` (`js/sites.js`): `st.systemId` is the site's id, `st.planet` its name, `G.mode` is `landed`, the ship's armor is written back, the save is written, `UI.openLanded(site, notes)` opens the shell, and `Mods.emit('onStation', site)` fires instead of `landed`. The port's hooks (the bar, the dock's visitors, the room, the day ashore, the family visit, the job board, the hired module's settlement and offers) all hang on `landed`, so none fires at a site and none needs a gate of its own. The approach scene (`iceStageScene(0)`) opens as the arrival's scene.
- **On station** the stay is `beginStay(h, ICE_SHIFTS, 'ice')`; the dock button reads "Work the ice (2 more shifts)" (`STAY_WHY.ice`). `passNight` at a site is `passShift`: the day turns with its new-day events, the stay shortens, and the cutting scene (`iceStageScene(1)`) opens on the first shift; no bar is filled and no port happening is picked. The cutting loads the hold as now (`iceLoad` in `iceStep`).
- **Home.** With the shifts done, `currentPlan` at a site returns the run home (`{ sid: run.sid, planet: run.planet, ... }` from the run record; `planRun` is not asked at a site), and the dock button reads "Burn for Mars". `sail` from a site sets `st.dest` and enters the burn directly (`enterTransit` after setting `G.burnAngle` from the two positions); there is no takeoff, flight or departure. The haul-home scene is an occasion of that burn at the midpoint (`planOccasions`: `{ kind: 'ice', stage: 2, at: 0.5 }` when the run is an ice run leaving a site).
- **Settlement** at the port is unchanged: double wage for the run's days, the water at the contract price, the captain's log line, and `iceFinish` for a run that skipped a scene (the hold fills thin).
- **An old save.** Saves are written only while landed, so no save holds a half-done ice run. A landed save with a plan of the old shape (`plan.ice` and no `site`) has its plan remade (`planStale` treats it as stale).
- **A site is never a port.** `currentPlanet()` returns the site record at a site (it has a `name` and an empty `services`), so the shell and the readouts that ask it draw; code that needs a port asks `services`, as it does.

### On station (`js/shell.js`, `js/sites.js`)

- The rail at a site: the Ship group as it is; the Ashore group holds one entry, **The Rock** (`tab: 'site'`), and Port, Missions, Bar, Exchange and Company are not shown (`shown: p => !atSite(G.state)`; The Rock is `shown` only at a site). `SHELL_PAGES` gains `site`.
- **The Rock page** (`UI.views.site`, built on the `h` helpers in `js/views.js`): the rock's designation and its orbit in AU, the shifts worked and left, the ice aboard in tons, and how the haul is going in the words the scenes already use (`iceHaulWord`). Nothing to buy, nobody to talk to.
- **The vista** is the rock: `drawBody` with a grey body and no lights, lit from the sun's side, drawn where the port's vista is drawn (`js/bridge.js`). Its `color` is on the site record.
- The dock's button is the stay's or the burn home's, above. Save, the readouts strip, ship life and the rooms work as in port, since the ship is landed.

### The map (`js/game.js`)

- A found site is in the map's list of places (`ids` is `Object.keys(SYSTEMS)` plus the found sites' ids), placed by `orbitPos`, drawn as a small grey dot with its designation and no faction ring; its orbit ring is drawn as the systems' are. A plotted burn to it draws as any burn does. Unfound sites are not drawn. The zoom that fits the destination reads `placeOf`.
- The captain's rock is found when she plans the run, so the dot is on the map from the departure.

### Not in this step

- Any kind of site but the ice rock; leads, rumors, the scan on a burn; wrecks, parts, towing; the survey and salvage jobs. These are chapter 2's steps (`ROADMAP.md`, section 7, "Exploration and salvage").
- The owner's game at a site (`role()` is not asked anything new; chapter 2's `coop` role is the first to fly to a site by choice, in its own step).
- Moving a site, a site that runs out, or a site that is dangerous.

## Testing

- `tests/orbits.test.js`: a site orbits at its period and `placeOf` returns it; the systems are unchanged.
- `tests/sites.test.js` (node, through `tests/nodecontext.js`): seeding is deterministic for a save and differs between saves; three ice rocks between 3.4 and 4.2 AU; the planner's pick takes the found rock, else the nearest, and a water port the tank reaches from it, and none when no pair fits.
- `tests/icerun.test.js`, rewritten for the legs: the plan names the rock and the port and counts out plus shifts plus home; sailing sets the burn for the rock and the departure line frames the run; arrival lands on station, fires `onStation` and not `landed`, and plays the approach; the rail shows The Rock and not the port's pages; the first shift plays the cutting and loads the hold; the last shift's button reads home; the home burn carries the third scene at its midpoint; settlement doubles the wage; a run that skipped the cutting comes home thin. The existing words-and-openings test holds as it is.
- `tests/stay.test.js`: the ice stay's label.
- `tests/shell.test.js` and the golden fixtures in `tests/fixtures`: a site's rail and its page, and a port's unchanged.
- `tests/gfields.test.js` and `tests/globals.test.js` as they stand: the new file is linked in `index.html`; nothing new is kept on `G`.
- `npm run soak` for the chapter's length and the ice run's share of it, since the run's days changed shape (ROADMAP: about 160 days to the share).
- `npm run coverage -- --check`: `js/icerun.js` is on the floor at 98; the rewrite keeps it there, and `js/sites.js` is added to the floor once it is tested.

## Assumptions

- Three ice rocks in the outer Belt are enough for chapter 1; which one the captain picks is the nearest in range, and she finds it by knowing it.
- Three shifts is the stop; the cutting scene is the first shift's and the other two pass with only the day's events.
- A site's arrival fires `onStation` and not `landed`, which is the single gate that keeps every port hook out.
- The ice run's words, odds and loads are unchanged; only where and when the scenes play moves.
