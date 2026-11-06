# The Ship's State Shown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The burn view shows damage (marked rooms with the hands at work there), the hurt in the medbay with first aid beside them, and someone having a hard time eating alone.

**Architecture:** A pure `shipState(st, t, maxArmor, rnd)` reads the game's state once a frame and keeps the marked rooms on the burn. `routineSpot` takes it and gives the new places; `lifeTick` keeps the order of what wins; `posture` and `drawRoom` (js/rooms.js) show it.

**Tech Stack:** Vanilla JS classic scripts, canvas; `node --test` with Playwright (`tests/helpers.js` `open()`), Node context tests (`tests/nodecontext.js`).

**Spec:** `docs/superpowers/specs/2026-11-06-ship-state-design.md`

## Global Constraints

- Damage share `d = 1 - armor / maxArmor`: 0 marks at `d <= 0`; 1 for `0 < d <= 1/3`; 2 for `1/3 < d <= 2/3`; 3 for `d > 2/3`, which is **severe**.
- Marked rooms: any of `ROOMS` but `medbay`, picked with ship life's dice (`lifeRnd`), kept on `t.marks` in the order added; a falling count clears the last added first.
- Repair hands: roles `engineer` and `icehand`. First aid: `roleHolder('medic')`. You hurt: `handHurt()`; walk at 2/3 of the pace.
- What wins, strongest first: the burn's phase; a staged scene; a downtime activity; hurt (medbay); the ship's state (repairs, eating alone); the timetable.
- A whole burn of `lifeTick` calls `Math.random` zero times; the sparks and flicker follow the drawing clock (`s.time`), not dice.
- New logic takes its state as parameters; unique top-level names (`tests/globals.test.js`); no `hired()` fork; no emojis.
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`; `npm run coverage -- --check` (shiplife.js and rooms.js are on the floor).

## Review Focus

1. Someone hurt mid-burn (a boarding fight during the burn) or treated while aboard: they go to the medbay at once, and back to the timetable when no longer in `st.injured`.
2. The first-aid giver is the one hurt (no medic, the bosun hurt): `roleHolder` gives someone else or nobody; nobody waits by an empty bunk.
3. More marks than repair hands (one engineer, three marks), or no repair hand aboard: hands go to the nearest marks, the rest unattended, nobody stuck.
4. Armor repaired mid-shift by the repair downtime: the cleared room's hand goes back to their post (or the next mark).
5. Someone low who is also a watch-keeper or the cook: the watch still keeps the post at night; the cook still at the stove at meals (low applies to who would sit at the table).

---

### Task 1: The state, pure

**Files:**
- Modify: `js/shiplife.js` (beside `routineSpot`)
- Test: `tests/livingship.test.js`

**Interfaces:**
- Produces: `shipState(st, t, maxArmor, rnd) -> { marks: string[], severe: boolean, hurt: string[], low: string[], you: boolean, aid: string|null }`. Reads `st.armor`, `st.injured`, `st.crew` with `person`, `moodLow`, `handHurt`, `roleHolder`; writes only `t.marks`. `aid` is `(roleHolder('medic') || {}).id || null`.
- Produces: `marksFor(t, d, rnd) -> string[]` (pure, the count rule and the kept list), which `shipState` calls.

- [ ] **Step 1: Write the failing test**

```js
test('the ship\'s damage marks one to three rooms, kept through the burn, cleared last-first, never the medbay', () => {
  const rnd = (s => () => (s = (s * 16807) % 2147483647) / 2147483647)(7), t = {};
  assert.equal(marksFor(t, 0, rnd).length, 0);
  const one = marksFor(t, 0.2, rnd); assert.equal(one.length, 1);
  assert.deepEqual(marksFor(t, 0.2, rnd), one, 'kept');
  const two = marksFor(t, 0.5, rnd); assert.equal(two.length, 2); assert.equal(two[0], one[0], 'added to');
  const three = marksFor(t, 0.9, rnd); assert.equal(three.length, 3);
  assert.deepEqual(marksFor(t, 0.5, rnd), three.slice(0, 2), 'the last added cleared first');
  assert.ok(!three.includes('medbay'));
  assert.deepEqual(marksFor(t, 0, rnd), []);
});
```

`shipState` is exercised in the page (Task 2), where `person`, `moodLow` and `roleHolder` exist.

- [ ] **Step 2: Run it to verify it fails** — `node --test tests/livingship.test.js`; Expected: FAIL `marksFor is not defined`.
- [ ] **Step 3: Implement `marksFor` and `shipState` in `js/shiplife.js`**
- [ ] **Step 4: Run it to verify it passes** — `node --test tests/livingship.test.js tests/globals.test.js`; Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Burn view: the ship's state (shipState, marksFor)"`

### Task 2: Who goes where, and how they look

**Files:**
- Modify: `js/shiplife.js` (`routineSpot`, `routineGo`, `lifeTick`, `posture`)
- Test: `tests/livingship.test.js`, `tests/burnview.test.js`

**Interfaces:**
- Consumes: `shipState`.
- Produces: `routineSpot(p, block, state)`; `state` may be undefined (as layer 2). New places, in this order after the cat: `p` in `state.hurt` → `{ room: 'medbay', at: 'bed' }` (any block); `p.role === 'you' && state.you && (block === 'night' || block === 'handover')` → `{ room: 'medbay', at: 'bed' }`; in `shift`, `p.id === state.aid && state.hurt.length` → `{ room: 'medbay', at: 'aid' }`; in `shift`, a repair hand with a mark free → `{ room: <mark>, at: 'repair' }` (marks given out nearest-first to the hands in `t.aboard` order: `routineGo` assigns, `routineSpot` takes the assignment as `state.repairs[p.id]`); in a meal block or `handover`, `p.id` in `state.low` and `routineSpot` would give `'table'` → `{ room: 'berths', at: 'alone' }`. `routineTarget` places `'bed'` at the medbay bunk (0.2 to 0.54 of the room, one per patient), `'aid'` at 0.6, `'repair'` at 0.5, `'alone'` at 0.85 of the berths.
- `lifeTick` re-routes someone whose spot changed although the block did not (hurt, healed, a mark added or cleared): it compares the spot `routineSpot` gives now with `p.at`/`p.room` once a second (on the wait's expiry or a change in `state`'s key), not every frame.
- `posture`: `p.at === 'bed'` and not walking → `'bunk'`; `'aid'` and `'repair'` in a shift → `'work'`; `'alone'` → `'sit'`. Your step is `* 2 / 3` when `state.you`.

- [ ] **Step 1: Write the failing tests**

Node: `routineSpot` cases — hurt engineer in `shift` → medbay bed; medic in `shift` with a patient → aid, without → their post; engineer in `shift` with `repairs: { [id]: 'hold' }` → `{ room: 'hold', at: 'repair' }`; engineer at `night` with damage → engine post (the watch); a low gunner at `meal` → berths alone; a low cook at `meal` → stove; you hurt at `night` → medbay bed, in `shift` → rounds.

Page (`tests/burnview.test.js`, earth-hired, `stageBurn`, `dayAt` from layer 2):
```js
test('a hurt crew member lies in the medbay all day, and whoever gives first aid works by them in a shift', ...)
//   st.injured[pilot] = true; through breakfast, a shift and supper (t.elapsed stepped, tickFor each): the pilot inRoom medbay, posture 'bunk';
//   in the shift roleHolder('medic') (Cato) inRoom medbay, posture 'work'; with st.injured cleared, after tickFor(25) the pilot is back on the bridge
test('with damage the engineer works at a marked room in a shift, and keeps the drive at night', ...)
//   G.state.armor = ship().armor * 0.6 (one mark... 0.4 damage: two marks); shift tickFor(25): engineer inRoom one of t.marks, posture 'work';
//   night tickFor(25): engineer in the engine room; armor back to full in a shift: tickFor(25) engineer back at the drive (Review Focus 4)
test('someone having a hard time eats alone in the berths', ...)
//   a crew member with mood { kind: 'low', until: day + 10 }: at the midday meal tickFor(25) they are inRoom berths, posture 'sit', the rest at the table
test('you, hurt, sleep in the medbay and walk slower', ...)
//   career().hurtUntil = day + 5: at night tickFor(30) you inRoom medbay, posture 'bunk'; in a shift your step over 1 s is 2/3 of a crew member's
test('with no first-aid giver up, nobody waits by the bunks', ...)  // Review Focus 2: the bosun and the medic both hurt
test('with more marks than hands, the hands take the nearest and nobody is stuck', ...)  // Review Focus 3: three marks, the engineer and one deckhand
```
and the layer-2 dice guard stays green with damage, a patient and someone low aboard (add them to its setup).

- [ ] **Step 2: Run them to verify they fail** — `node --test --test-name-pattern="medbay|marked room|hard time|hurt, sleep|first-aid" tests/burnview.test.js tests/livingship.test.js`; Expected: FAIL.
- [ ] **Step 3: Implement as in the Interfaces block**
- [ ] **Step 4: Run them, then the burn tests** — the Step 2 command, then `node --test tests/burnview.test.js tests/livingship.test.js tests/downtime.test.js`; Expected: PASS.
- [ ] **Step 5: Commit** — `git commit -m "Burn view: the hurt in the medbay, the hands at the damage, eating alone"`

### Task 3: The rooms show it

**Files:**
- Modify: `js/rooms.js` (`drawRoom`, `roomMedbay`, a new `drawDamage`), `js/shiplife.js` (the `s` for `drawRoom` at `:528`)
- Test: `tests/livingship.test.js` (fake context, as the room tests there), `tests/burnview.test.js`

**Interfaces:**
- Consumes: `shipState` (`marks`, `severe`, `hurt`, `you`).
- Produces: `s.damage = { marks: Set<string>, severe: boolean }` and `s.patient = boolean` on the drawing state. `drawDamage(ctx, r, s)`: the open panel (a dark rectangle at 0.7 of the room's width, its door hanging at an angle), bare cable (two lines), a scorch (a dark ellipse, 0.3 alpha) and sparks (2 to 4 short bright lines when `Math.floor(s.time * 7) % 5 === 0`, brighter when `s.night > 0.5`); when `s.damage.severe`, the room's lamp is skipped on frames where `Math.floor(s.time * 11) % 4 === 0`. `roomMedbay` draws the trace amber (`#ffb030`) and at twice the rate when `s.patient`.

- [ ] **Step 1: Write the failing tests**

Node, with the fake context: `drawRoom(ctx, 'hold', r, { ...base, damage: { marks: new Set(['hold']), severe: false } })` makes more fill calls than without, and the same calls at the same `time` twice (no dice); `roomMedbay` with `patient: true` sets a fill or stroke `'#ffb030'`, without it does not. Page: a burn with `G.state.armor` at half: `drawTransit` runs without an error and `t.marks.length === 2`.

- [ ] **Step 2: Run them to verify they fail** — `node --test tests/livingship.test.js`; Expected: FAIL.
- [ ] **Step 3: Implement as in the Interfaces block**
- [ ] **Step 4: Run them, then the full suite and the coverage floor** — the full test command; `npm run coverage -- --check`; Expected: all pass, none under.
- [ ] **Step 5: Screenshots for the owner** — a damaged ship at work (two marks, the engineer at one), the medbay with a patient and first aid, someone eating alone; the camera aimed with the layer-2 `camStep` override in the scratchpad script.
- [ ] **Step 6: Commit** — `git commit -m "Burn view: the damage and the patient drawn in the rooms"`
