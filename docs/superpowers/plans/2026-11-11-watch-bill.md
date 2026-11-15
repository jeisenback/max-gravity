# Watch Bill Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Each night of a burn, the people a rotating bill names stand the bridge and engine-room watches, the hand among them in turn; the bill is said at the handover and shown on the hand's page; on the hand's nights, scenes and contacts are staged with the hand up at their post.

**Architecture:** A pure `watchBill(roster, night)` in `js/shiplife.js` replaces the fixed `NIGHT_WATCH`. The ship's state carries tonight's bill next to the scene record (`watch`), and everything that read `NIGHT_WATCH` reads the bill through one helper. The words go through the hired scenes' lines, and the night scenes read the bill through a new text word and a new condition.

**Tech Stack:** Vanilla JS classic scripts, `node:test`, Playwright (`tests/helpers.js`), `tests/nodecontext.js`.

**Spec:** `docs/superpowers/specs/2026-11-11-watch-bill-design.md`

## Global Constraints

- Bridge order `['pilot', 'slicer', 'you', 'xo']`, starting at `night % 4`; engine order `['engineer', 'icehand']`, starting at `night % 2`. The captain is not on the rota.
- A role nobody holds is skipped, and so is anyone hurt. The next in order stands the watch; when nobody can, it is `null`.
- `night = G.state.day + shipDay(t.elapsed).day` (the same number as `state.morning`).
- A scene's one-night record (`G.transit.watch`) replaces the rota's stander for its post on its night. The medbay comes first for the hurt.
- Nothing new is saved: the bill is computed. No emojis. Desktop only (#937).

## Review Focus

1. A hand who is hurt on their bridge night: they are in the medbay, and the next in order stands the watch. Pinned in Task 1.
2. A scene's record that moves a watch to another post (Yelena's, at the guns): the rota's bridge and engine stand as the bill says, and the record's stander is at the guns. A record for the bridge replaces the rota's bridge stander, who turns in. Pinned in Task 1.
3. A small crew (no slicer, no xo, no ice hand): the bridge rotates through those who exist, and nothing throws. Pinned in Task 1.
4. The bill on a save loaded mid-burn: the same night gives the same bill. It is pure, and Task 1's tests show it.
5. The handover line is said once per handover, not every frame, and not at all at port. Pinned in Task 2.

---

### Task 1: The bill, and the cutaway at night

**Files:**
- Modify: `js/shiplife.js`:
  - drop `NIGHT_WATCH`;
  - add `WATCH_ORDER`, `watchBill`, `rosterOf`, and `onWatchTonight`;
  - add `bill` to `shipState`;
  - `routineSpot`, `isAsleep`, `nightHaunts` and `HEAD_SKIPS` read the bill;
  - so do the handover wait in `routineGo` and the dusk wait reset (line ~636).
- Tests: a new `tests/watchbill.test.js` (Node and browser). Update the tests that read `NIGHT_WATCH`: `tests/burnview.test.js`, `tests/chatter.test.js`, `tests/downtime.test.js` and `tests/towerlife.test.js`. They should use `onWatchTonight`, or the bill, where they mean "the night watch".

**Interfaces:**
- Produces:
  - `WATCH_ORDER = { bridge: ['pilot', 'slicer', 'you', 'xo'], engine: ['engineer', 'icehand'] }`
  - `watchBill(roster, night) -> { bridge: id|null, engine: id|null }`. `roster` is `[{ id, role, hurt }]`, where the hand has `role: 'you'`, `id: 'you'`. For each watch, go round its order from `night % order.length`. The first role with an able holder (not hurt) stands it, and within a role the first in roster order.
  - `rosterOf(people, state) -> roster`: from the burn's people (`G.transit.aboard`), `hurt` from `state.hurt` (and `state.you` for the hand).
  - `shipState(...)` gains `bill`: `watchBill(rosterOf(t.aboard || [], state), G.state.day + shipDay(t.elapsed).day)`. It's computed after `hurt`, so it reads the same state.
  - `onWatchTonight(p, state) -> 'bridge'|'engine'|null`: whether `p` is on tonight's bill. A scene's record (`state.watch`) puts its stander on its post and takes its post off the rota's stander for that night. A record on another room (the guns) leaves the bill as it is.
- Consumes: `watchTonight`, `standWatch` (#951) as they are.

- [ ] **Step 1: Write the failing Node tests** (`tests/watchbill.test.js`; load as `tests/watch.test.js` does):
  - The full crew roster `[you, pilot p, slicer m, xo c, engineer t, icehand h]`, nights 0 to 7: the bridge is `p, m, you, c, p, m, you, c` and the engine room `t, h, t, h, ...`.
  - The pilot hurt on night 0: the bridge is `m`. The hand hurt on night 2: the bridge is `c`.
  - Review Focus 3: a roster of `[you, pilot, engineer]` gives the bridge over nights 0 to 3 as `p, you, you, p`. The order skips the missing slicer and xo: night 1 starts at `slicer`, so the first able holder is `you`; night 3 starts at `xo` and goes round to `pilot`. The engine room on night 1 starts at `icehand` and goes round to `engineer`. An empty roster gives `{ bridge: null, engine: null }`.
  - `routineSpot` at night with `state.bill = { bridge: 'you', engine: 'c:hana' }`:
    - the hand is at `{ room: 'bridge', at: 'post' }`;
    - Hana is at the engine room's post;
    - the pilot is at `{ room: 'berths', at: 'bunk' }`;
    - the engineer is in a bunk.
  - Review Focus 2:
    - With `state.watch = { stands: 'you', post: 'gunnery', relieved: 'c:yelena', relievedAt: 'galley' }` and `state.bill = { bridge: 'c:ines', engine: 'c:tomas' }`, the hand is at the guns and Ines on the bridge.
    - With `state.watch = { stands: 'c:mateo', post: 'bridge', relieved: null }` and the same bill, Mateo is on the bridge and Ines in a bunk.
  - Review Focus 1: the hand hurt with `state.bill` naming them: in the medbay.
- [ ] **Step 2: Run** `node --test tests/watchbill.test.js`. Expected: FAIL (`watchBill` not defined).
- [ ] **Step 3: Implement** the interfaces. In the handover and night blocks, `routineSpot`:
  - places `onWatchTonight(p, state) === 'bridge'` at `{ room: 'bridge', at: 'post' }` and `'engine'` at `{ room: 'engine', at: 'post' }`;
  - places anyone else on the bill's old roles in a bunk;
  - keeps the scene record branch from #951 first.

  `isAsleep(p)` gains the state's bill through a `state` argument where it is called, or reads `G.transit` as `relievedTonight` does, whichever fits. Then anyone in a bunk in the dark who is not on watch tonight is asleep. Replace `relievedTonight` with that. `HEAD_SKIPS` and `nightHaunts` drop the fixed roles: the one on watch skips the morning head, and their night haunts are their post's. The handover wait in `routineGo` waits for whoever is on tonight's bill for that room. The bridge stander sits in the pilot's seat (`POST_SEAT.bridge.pilot`) when the pilot is not on watch, as `routineGo` numbers a post's holders.
- [ ] **Step 4: Browser test** (`tests/watchbill.test.js`): a burn with Hester's crew at night on the hand's bridge night. Find the night where `G.state.day + shipDay(t.elapsed).day` gives index 2. The ship's state puts the hand on the bridge and Ines and Tomas's bunk spots asleep (`isAsleep`).
- [ ] **Step 5: Update the tests that read `NIGHT_WATCH`** to use `onWatchTonight` or the bill. Run `npm run test:changed`. Expected: PASS. A burn view pin that changes only because the night watch now rotates is rewritten with `PIN_WRITE=1`, and its commit says so.
- [ ] **Step 6: Commit** `The night watch rotates: a bill by the day, the hand on it in turn (#1034)`.

### Task 2: The handover line and the Watch bill card

**Files:**
- Modify:
  - `js/hiredscenes.js`: a new `scene:watch-bill` with its lines, and its index entry in the scene registry;
  - `js/shiplife.js`: the handover line, said once at the start of the handover block, next to the dusk line (line ~635);
  - `js/character.js`: a `watchBillCard()` beside the Ladder and the Record.
- Test: `tests/watchbill.test.js`, `tests/hiredscenes.test.js` (the registry count), `tests/fixtures/hired-scene-ids.json` (`PIN_WRITE=1`), `tests/sceneplay.js` (a case that plays the lines), `tests/scenepin.test.js`.

**Interfaces:**
- Consumes: `watchBill`, `rosterOf`, `onWatchTonight` (Task 1).
- Produces:
  - `billLine(bill, names) -> string`: pure. `names` maps an id to a first name, and the hand to `'you'`. It returns the `scene:watch-bill` line `tonight` with `{bridge}` and `{engine}`. When a watch is `null`, it uses `tonight.bridge` or `tonight.engine` alone.
  - `watchBillCard() -> html`: tonight and the next three nights, a row each, with the hand's rows marked. Only on a burn (`G.transit`); `''` otherwise.

- [ ] **Step 1: Write the failing tests:**
  - `billLine({ bridge: 'c:mateo', engine: 'c:hana' }, names)` is `"The watch tonight: Mateo on the bridge, Hana in the engine room."`.
  - With the hand on the bridge it reads `"... you on the bridge ..."`.
  - Browser, Review Focus 5: crossing into the handover block once puts the line in the comms once. Ten more frames in the handover add nothing. At port, nothing.
  - Browser: on a burn, the hand's page shows a card whose title reads `Watch bill`, with four rows, the hand's marked. At port, there is no card.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - The lines, written to `docs/bible/voice.md`:
    - `tonight`: "The watch tonight: {bridge} on the bridge, {engine} in the engine room."
    - `tonight.bridge`: "The watch tonight: {bridge} on the bridge."
    - `tonight.engine`: "The watch tonight: {engine} in the engine room."
    - `card.title`: "Watch bill"
    - `card.mine`: "(yours)"
    - `card.none`: "nobody"
  - Add the registry index entry, `where: 'transit'`.
  - The line uses the bill as moved by a scene's record: the record's stander takes its post's slot.
- [ ] **Step 4: Run** `npm run test:changed` and `PIN_WRITE=1 node --test tests/hiredscenes.test.js tests/scenepin.test.js`. Read the pin diff: only the new lines may appear. Expected: PASS.
- [ ] **Step 5: Commit** `The watch bill is said at the handover and shown on the hand's page (#1034)`.

### Task 3: The hand's nights: scenes, contacts and staging

**Files:**
- Modify:
  - `js/storylets.js`: the `{watch:bridge}` and `{watch:engine}` text words, next to `{crew:role}` (line ~204); the `onWatch` condition next to `night`; and the shape check;
  - `editor.js`: `onWatch: 'flag'` in `CONDITION_SPEC`, and the text words where the editor lists them;
  - `js/stories/on-the-road.js`: `road-night-watch` and `road-night-pump`;
  - `js/engage.js`: `contactEvent`'s text on the hand's watch;
  - `js/hiredscenes.js`: the `scene:contact` line `onwatch`;
  - `js/shiplife.js`: `sceneStage`, so the hand starts from their post on their watch.
- Test: `tests/nightscenes.test.js` (updated), `tests/watchbill.test.js`, and the editor tests that list conditions (`npm run test:editor`).

**Interfaces:**
- Consumes: `onWatchTonight` and the ship's state `bill` (Task 1).
- Produces:
  - `onWatch` condition: `v => !!G.transit && isDark() && (handOnWatch() === !!v)`. `handOnWatch()` (in `js/shiplife.js`) is `!!onWatchTonight({ id: 'you', role: 'you' }, currentShipState())`, built as the frame builds it.
  - `watchStood` condition: `post => !!G.transit && !!billTonight()[post]`. `billTonight()` (in `js/shiplife.js`) is tonight's bill with any scene record applied, the same one the handover line reads.
  - `{watch:bridge}` and `{watch:engine}` fill with the first name of tonight's stander, `'you'` for the hand, or an empty string with no burn.

- [ ] **Step 1: Write the failing tests:**
  - "The Middle Watch" is due on a night when Mateo has the bridge, and its text names Mateo. It is not due on the hand's bridge night.
  - "The Number Two Pump" names Hana on her engine night.
  - `onWatch: true` holds at night on the hand's night, and not in the day or on another's night.
  - On the hand's watch, `contactEvent({ kind: 'pirate' }).text` begins with "You have the watch when the board lights up." On another's night it does not.
  - `sceneStage` at night on the hand's watch does not take the hand from a bunk.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement:**
  - `road-night-watch` becomes `when: { night: true, onWatch: false, watchStood: 'bridge' }`, with `{crew:pilot}` in its text replaced by `{watch:bridge}`.
  - `road-night-pump` becomes `when: { night: true, watchStood: 'engine' }`, with `{crew:engineer}` replaced by `{watch:engine}`.
  - A second new condition, `watchStood: 'bridge'|'engine'`, holds when that watch has someone tonight. It goes in `CONDITIONS` and in the editor's `CONDITION_SPEC` as `'one'`, with the list `['bridge', 'engine']`.
- [ ] **Step 4: Run** `npm run test:changed` and `npm run test:editor`. The road scenes' pin and the scene pin change only where the night scenes now name the watch. Read the diffs. Expected: PASS.
- [ ] **Step 5: Commit** `On the hand's nights the night scenes and contacts find them on watch (#1034)`.

### Task 4: Whole-suite verification

- [ ] **Step 1:** `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test`. Expected: all pass.
- [ ] **Step 2:** `npm run test:editor`. Expected: all pass.
- [ ] **Step 3:** A screenshot at 1280x800 of the hand's bridge night (the hand at the helm, Ines asleep), and of the Watch bill card, for the PR.
