# The Ship Fight on the Radar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hired hand's turn-based ship fight with a fight played on the radar, in real time with pause, built beside the old one and switched over when it meets its targets.

**Architecture:** A pure rules module (`js/radar.js`) holds the fight: state in, next state and events out, with `rand` passed in, run in Node through `tests/nodecontext.js`. A screen module (`js/radarui.js`) draws it as a scene on the view helpers, with a canvas radar, and advances it in real time from the game's `frame` hook. `startShipFight` (`js/fightui.js`) builds the sides as today and hands them to the old fight or the new one by a setting; the ends are today's, so `shipFightEnd` is unchanged.

**Tech Stack:** Vanilla JS classic scripts in one global scope, canvas, `node --test`, Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md`. Read it first; this plan argues from it and does not repeat its rules.

**Delivery:** five PRs, one per Part below, each leaving the game playable and each with its own issue.

## Global Constraints

- Hired hand only; no `hired()` fork inside the fight's logic. What the player may decide is asked of `role()` (CLAUDE.md).
- `js/radar.js` reads no `G`, changes nothing it is given, and takes randomness as a `rand` function (`() => number in [0, 1)`).
- Every field kept on `G` is declared with a comment in the `G` literal in `js/game.js` (`tests/gfields.test.js`).
- Every new script is linked in `index.html` after the scripts it uses (`tests/globals.test.js`); top-level names are unique.
- Every new button or key is pressed by a test, or listed in `EXEMPT` in `tests/actions.test.js` with a checkable reason (#1327).
- Page markup on the view helpers (`h`, `listHtml`, `panelHtml`, `js/views.js`).
- Words in the game's voice (`docs/bible/voice.md`), as `scene:fight` lines with a `radar.` key prefix in `js/hiredscenes.js`.
- Desktop only, at least 1000 px wide; do not test or screenshot narrower (#937).
- No emojis anywhere.
- Starting numbers (all from the spec, to be tuned in Part 4): order cycle 20 s; 24 steps a cycle; speeds 1, 2 and 16 (opens at 16); met at 250 km, closing about 12 km a cycle, jinking only inside 60 km; escape past 400 km; zoom 50, 150, 400 km; hull turn 90 degrees a cycle; drive gate 30 degrees; gun bears 30 degrees off the nose; gun falloff 0.75 past 20 km, 0.5 past 30 km; PDC reach 9 km; torpedoes launch from about 165 km and arrive in about four cycles; power 6 units; heat cap 5; stock error 0.5 km at full sensors, 1.25 km at 40%; accuracy 0.25 km; resilience holds 40% sensors to about 0.7 km; gun range pause at 35 km; comms blind past 12 km on a failed lock or spoof; crew pilot coasts within 10 km of the held range (6 km closing to engage); suggestion odds about 35% at level 0 and 70% at level 5; cycle cap 50 from the long opening.

## Review Focus

1. **Frame size does not change the fight.** Advancing a cycle in one call, or in 0.05 s frames at 16x, or with pauses in the middle, gives the same state and events for the same `rand`. (Test in Task 2.)
2. **A raider pair with one of them down.** The other keeps fighting, her own lock alone decides boarding, and the fight ends only when both are out or away. (Test in Task 6.)
3. **The hand is hurt or killed mid-cycle.** The fight stops at that step, the ending is queued as today's (`s.handDied`), and real time does not keep running behind it. (Test in Task 9.)
4. **A reload mid-fight** behaves as today's ship fight does on a reload (find out with the old fight first, then match it). (Test in Task 9.)
5. **Space to pause while focus is on a console tile** pauses, and does not also press the tile. (Test in Task 9.)

---

## Part 1: The rules (PR 1)

### Task 1: The fight's state

**Files:**
- Create: `js/radar.js` (link in `index.html` right after `js/fight.js`)
- Test: `tests/radar.test.js`

**Interfaces:**
- Consumes: `shipSide(stats, opts)` and `FIGHT` from `js/fight.js` (armour pooled by `FIGHT.POOL`, parts from `FIGHT.PART_HP`); `FOE_TYPES`.
- Produces:
  - `RADAR`: the constants object, one key per number in Global Constraints, each with a comment.
  - `radarFight({ me, foes, nerve, opening = 'long', fit = { accuracy: false, resilience: false }, sensors = 1 }) -> state`, where `me` and each foe are `shipSide` results. State: `{ kind: 'radar', me, foes, nerve, fit, sensors, t: 0, cycle: 0, ships: [{ p: {x, y}, v: {x, y}, facing }], torps: [], heat: 0, order: null, fc: 'gun', pdcArc: { dir, width }, power: { drive: 2, guns: 2, pdc: 2 }, log: [], events: [], spent: [] }`. `ships[0]` is ours, at the origin; foes are `ships[1..]`, at `RADAR.MEET` km on a bearing taken from `rand` only in Task 6 (here a fixed bearing of 0).
  - `radarRange(state, i = 1) -> km`.

- [ ] **Step 1: Write the failing tests**

```js
test('a fight opens at the meeting range with our ship at the centre, her sides as the old fight builds them', () => {
  const s = api.radarFight({ me: side(230, 2), foes: [side(150, 1)], nerve: 3 });
  assert.equal(api.radarRange(s), 250);
  assert.deepEqual(plain(s.ships[0].p), { x: 0, y: 0 });
  assert.equal(s.me.armor, Math.round(230 * api.FIGHT.POOL));
  assert.equal(s.fc, 'gun');
});
test('the short opening meets her at 40 km', () => {
  assert.equal(api.radarRange(api.radarFight({ me: side(230, 2), foes: [side(150, 1)], nerve: 3, opening: 'short' })), 40);
});
```

`side(armor, guns)` is a test helper over `shipSide`, as `tests/fight.test.js` builds its sides.

- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/radar.test.js`. Expected: FAIL, `radarFight` not defined.
- [ ] **Step 3: Implement `RADAR`, `radarFight` and `radarRange` in `js/radar.js`.** Header comment states it is pure and names the spec.
- [ ] **Step 4: Run them to see them pass.** Same command, PASS; then `node --test tests/globals.test.js`, PASS.
- [ ] **Step 5: Commit.** `git add js/radar.js tests/radar.test.js index.html && git commit -m "Radar fight: the state (#<issue>)"`

### Task 2: Motion, facing and the cycle

**Files:** Modify `js/radar.js`; test `tests/radar.test.js`.

**Interfaces:**
- Consumes: Task 1's state.
- Produces:
  - `radarStep(state, orders, rand) -> { state, events }`: one step of `RADAR.TURN_S / RADAR.SUB` seconds, resolved in this order: move, sensors, fire control, fire, point defence, damage. `orders = { burn: { dir, throttle } | null, turnTo: dir | null, fc: 'gun' | 'pdc', aim: { foe, part, at: {x, y} } | null, fire: bool, pdcArc: { dir, width }, torp: foe | null, power, comms: 'watch' | 'lock' | 'spoof' }`.
  - `radarAdvance(state, orders, seconds, rand) -> { state, events }`: runs whole steps, carrying a remainder in `state.t`, so that any split of the same seconds gives the same result.
  - `radarCycle(state, orders, rand) -> { state, events }`: `radarAdvance` for one cycle, then the cycle's bookkeeping (heat bleed, `cycle + 1`).
  - Facing: the hull turns at most `RADAR.TURN` a cycle (pro rata a step); the drive lights only with the nose within `RADAR.GATE` of the burn.

- [ ] **Step 1: Write the failing tests**

```js
test('a flip and burn takes about two cycles: the drive does not light until the nose comes round', () => { /* burn dir = facing + 180; after one cycle |v| change is near 0, after two it is not */ });
test('the hull turns at most 90 degrees in a cycle', () => { /* turnTo facing + 170: after one cycle the facing moved 90 */ });
test('a cycle advanced in one call, in 0.05 s frames at 16x, or with a pause in the middle, gives the same state and events', () => { /* Review Focus 1: compare plain(state) and events for the same seeded rand */ });
```

- [ ] **Step 2: Run, see them fail.**
- [ ] **Step 3: Implement `radarStep`, `radarAdvance`, `radarCycle`.** Momentum is exact per step (`p += v*dt + a*dt*dt/2`); events carry `{ at: t, kind, ... }`.
- [ ] **Step 4: Run, see them pass.**
- [ ] **Step 5: Commit.**

### Task 3: The gun, her parts and heat

**Files:** Modify `js/radar.js`; test `tests/radar.test.js`.

**Interfaces:**
- Consumes: `dealDamage(side, part, dmg)` and `FIGHT.GUN_DMG`, `FIGHT.SKILL_DMG`, `FIGHT.AIM_MULT` from `js/fight.js`.
- Produces:
  - `radarBears(state) -> bool`: her bearing within `RADAR.BEAR` of our nose.
  - `radarSpread(state, level) -> km`: grows with range, our burn and the board's error (Task 5's `radarError`); shrinks with `level`.
  - `radarFalloff(km) -> 1 | 0.75 | 0.5`.
  - `radarAimMult(km) -> number`: today's `FIGHT.AIM_MULT` mapped onto km (knife under 5, close under 12, mid under 30, long beyond; the builder may tune the edges); the hull is always 1.
  - Parts are `'hull' | 'weapons' | 'drive' | 'lock' | 'launcher'`, as today.

- [ ] **Step 1: Write the failing tests**

```js
test('a shot at her lock at 40 km loses damage to the aim penalty; the same shot at her hull lands in full', () => { /* HIGH rand: hull dmg > lock dmg, ratio = radarAimMult(40) */ });
test('a gun that does not bear does not fire, and says so in the events', () => {});
test('her lock at zero means she cannot come alongside', () => { /* lock.hp 0: no boarded end from Task 6 */ });
test('heat over the cap locks the gun until it bleeds off', () => {});
```

- [ ] **Steps 2 to 5:** run and fail, implement in `radarStep`'s fire phase, run and pass, commit.

### Task 4: The PDC and torpedoes

**Files:** Modify `js/radar.js`; test `tests/radar.test.js`.

**Interfaces:**
- Produces:
  - `radarPdcKill(arc, from, to) -> chance`: the chance to kill a torpedo moving from `from` to `to` in a step, by the length of that segment inside the arc and within `RADAR.PDC_R`; narrow arcs kill more per km.
  - A torpedo is `{ id, side: 'us' | 'her', p, v, target }`; it steers toward its target's projected track; it is resolved at the exact step it crosses the PDC's reach or reaches its target.
  - `orders.fc` is fixed for the cycle at its start; `pdcArc` may change any step; a stowed PDC never fires.

- [ ] **Step 1: Write the failing tests**

```js
test('a torpedo that crosses the whole PDC reach in one step is still checked against the arc', () => {});
test('a narrow arc kills more of the torpedoes inside it, and none outside it', () => {});
test('with the fire control on the gun the PDC does not fire, whatever its arc', () => {});
test('changing fc mid-cycle takes effect at the next cycle only', () => {});
```

- [ ] **Steps 2 to 5:** as above.

### Task 5: Fire control: projection and error

**Files:** Modify `js/radar.js`; test `tests/radar.test.js`.

**Interfaces:**
- Produces:
  - `radarError(state) -> km`: from `RADAR` stock error, `state.fit.accuracy`, `state.fit.resilience`, `state.sensors` (0 to 1), a comms lock (narrows) and her spoof (widens).
  - `radarSeen(state, rand) -> [{ p, v }]`: each foe's contact as the board sees it, off her true position by up to `radarError`.
  - `radarProject(state, orders, cycles = 4) -> { tracks: [[{ p, band }]], cpa: { min, max, at }, impacts: [{ torp, at: [lo, hi], hits: 'yes' | 'may' | 'no' }], solution: [lo, hi] }`: a forward simulation with the same rules as `radarStep`, bands widening with time.

- [ ] **Step 1: Write the failing tests**

```js
test('her true position is inside her band at every projected cycle, over many seeds', () => {});
test('worn sensors widen the error; resilience holds 40% sensors near 0.7 km; accuracy halves it', () => {
  // values from Global Constraints: 0.5 at 1.0, 1.25 at 0.4, about 0.7 hardened at 0.4, 0.25 accurate at 1.0
});
test('a comms lock narrows the error on her and bends her projected track toward her habit', () => {});
test('closest approach and the solution are ranges, low under high', () => {});
```

- [ ] **Steps 2 to 5:** as above.

### Task 6: Her, the captain, the crew and the ends

**Files:** Modify `js/radar.js`; test `tests/radar.test.js`.

**Interfaces:**
- Consumes: `GRADE_HULL`, `GRADE_PUNCH` (`js/shipcombat.js`), `FOE_TYPES`.
- Produces:
  - `radarFoe(state, i, rand) -> foeOrders`: by type, from the spec: a raider closes to come alongside while her lock is whole; a corsair arms (shown a cycle ahead) and fires salvos while her torpedoes last; a cutter trades at range; each of a pair acts alone; grade as today.
  - `radarCaptain(state, nerve, read) -> 'engage' | 'hold' | 'open' | 'break' | 'evade'`, where `read` is what comms has reported (known torpedoes and their impact times). Called once a cycle, after comms.
  - `RADAR_ORDERS`: per order, its power split, comms stance and the pilot's wedge (90 degrees for a burn; trims up to 30% for a coast).
  - `radarCrew(state, post, level, order, rand) -> orders` for a post the crew work, including the coast-nose-on rule.
  - `radarCost(state, order) -> { endFacing, bears, why }`: what the order does to the gun, shown before it is carried out.
  - `radarEnd(state) -> null | 'crippled' | 'broke' | 'away' | 'escaped' | 'boarded' | 'lost' | 'ran'`, with today's meanings (`shipEnd` in `js/fight.js`), escape past `RADAR.ESCAPE`, the cap at `RADAR.TURNS` cycles.

- [ ] **Step 1: Write the failing tests**

```js
test('a raider with her lock whole comes alongside and the fight ends boarded; with it shot away she cannot', () => {});
test('a corsair arms a cycle before she fires, and the arming is an event', () => {});
test('a raider pair: with one crippled, the other fights on and her lock alone decides boarding', () => {}); // Review Focus 2
test('called-out torpedoes about to hit lead the captain to evade; a cautious captain badly hurt breaks off', () => {});
test('every fight ends one of the named ways by the cycle cap', () => { /* 200 seeded crew-only fights: radarEnd never null at the cap */ });
```

- [ ] **Steps 2 to 5:** as above.

### Task 7: When real time pauses itself

**Files:** Modify `js/radar.js`; test `tests/radar.test.js`.

**Interfaces:**
- Produces: `radarPauses(prev, next, events) -> [reason]`, each reason a key (`armed`, `launched`, `pdcSoon`, `hit`, `call`, `gunRange`, `plan`). Only new events: `gunRange` once a fight, `plan` only into or out of `evade` or `break`.

- [ ] **Step 1: Write the failing tests**

```js
test('it pauses on a launch, a hit and coming into gun range once, and never on a locked gun or a coast', () => {});
test('an order change pauses only into or out of evade or break-off', () => {});
```

- [ ] **Steps 2 to 4:** as above.
- [ ] **Step 5: Run the whole suite** (CLAUDE.md's command), PASS; commit; push; open PR 1 for its issue.

## Part 2: The page, behind a setting (PR 2)

### Task 8: The setting and the start

**Files:**
- Modify: `js/menu.js` (`Settings.radarFight`, default `false`, stored with the others; a checkbox on the settings page, "Radar ship fight (in development)", `data-action="radarFight"`)
- Modify: `js/fightui.js:21-62` (`startShipFight`)
- Test: `tests/radarui.test.js`

**Interfaces:**
- Consumes: `radarFight` (Task 1).
- Produces: in `startShipFight`, after the sides are built as today, `s.state = Settings.radarFight ? radarFight({ me: mine, foes, nerve, opening, fit: radarFit(st), sensors: perf('sensors') }) : shipFight(...)` and `G.nextEvent = (Settings.radarFight ? radarFightEvent : shipFightEvent)(s, ...)`. This fork is temporary and goes in Task 13. `radarFit(st) -> { accuracy, resilience }` reads two flags (`st.outfits` keys `fcAccuracy`, `fcResilience`), both false on every ship for now. `opening` is `'short'` where today's fight starts inside mid range (a patrol, an ambush, `js/range.js`), else `'long'`.

- [ ] **Step 1: Write the failing test:** pressing the settings checkbox and then meeting a raider opens the radar fight's scene (its title), and with it unticked today's.
- [ ] **Steps 2 to 4:** run and fail, implement, run and pass.
- [ ] **Step 5: Commit.**

### Task 9: The radar scene

**Files:**
- Create: `js/radarui.js` (link after `js/fightui.js`)
- Modify: `js/game.js` (`G.radar`: the running fight's view state, declared with a comment)
- Modify: `js/hiredscenes.js` (`scene:fight` lines `radar.*`)
- Test: `tests/radarui.test.js`

**Interfaces:**
- Consumes: Tasks 1 to 7.
- Produces:
  - `radarFightEvent(s) -> event`: the scene, with the page from the spec's "The page": top bar (pause and play, `data-action="radarSpeed"` with `data-arg` 1, 2 or 16, zoom `data-action="radarZoom"`), the situation bar, the canvas radar (zooming itself to keep her and any torpedoes in view unless set by hand; the main labels always and the rest on hover; our ship's end-of-cycle ghost only when clear of the ship; the captain's order's `radarCost` under it), event marks fading over three cycles, the timeline (last six events, the log folded), and the side panel (Task 11 fills it).
  - Real time: `M.on('frame', dt => radarTick(dt))`, where `radarTick` advances `G.radar` by `dt * speed` through `radarAdvance`, stops at the first `radarPauses` reason and shows it. Space toggles pause.
  - At an end, `shipFightEnd(s, end)` as today; a hand killed mid-cycle (`s.handDied`) stops the fight at that step.

- [ ] **Step 1: Write the failing tests**

```js
test('pressing play at 16x runs the fight until she launches, and it pauses saying so', async () => {});
test('pressing a speed changes how far a frame advances it', async () => {});
test('the timeline lists the last six events, and hovering one rings its spot on the radar', async () => {});
test('the hand killed mid-cycle stops the fight and queues the ending', async () => {}); // Review Focus 3
test('a reload mid-fight does what today\'s ship fight does on a reload', async () => {}); // Review Focus 4
test('Space on a focused console tile pauses and does not press the tile', async () => {}); // Review Focus 5
test('the fight ends in today\'s ends: a crippled raider goes on to the dead-in-space scene', async () => {});
```

- [ ] **Steps 2 to 4:** run and fail, implement, run and pass.
- [ ] **Step 5:** full suite, PASS; `tests/actions.test.js` passes with the new buttons pressed; commit; push; PR 2.

## Part 3: The posts (PR 3)

### Task 10: Gunner and pilot on the radar

**Files:** Modify `js/radarui.js`; test `tests/radarui.test.js`.

**Interfaces:**
- Produces, for the hand's post only:
  - Gunner: click her part marks to aim (`radarAim`, by canvas hit test, with `data-action="radarAimPart"` buttons for each part as the keyboard path), drag the PDC arc's two edges, tiles `data-action="radarFc"` (`gun` / `pdc`), `radarFire` (fire / hold), `radarTorp`.
  - Pilot: drag the burn inside the order's wedge (`radarBurn`), the two scatter rings drawn from the hand's level (20 degrees at level 0, none at 5), coast tiles `radarCoast` (`turn` / `hold`).
  - The other posts' orders come from `radarCrew`.

- [ ] **Step 1: Write the failing tests:** aiming at her lock and firing puts the hit on her lock bar; a burn dragged outside the wedge is held to its edge; at level 0 the burn lands off the plot by up to 20 degrees, at level 5 on it; the gun-or-PDC tile changes what fires next cycle.
- [ ] **Steps 2 to 5:** as above.

### Task 11: Engineer, comms, calls, suggestions, and the side panel

**Files:** Modify `js/radarui.js`, `js/radar.js`; test `tests/radarui.test.js`, `tests/radar.test.js`.

**Interfaces:**
- Consumes: `handCheck(stat, level, kind)` for every check, with the odds on the button; the captain's `opinion` of the hand and the crew's (`person(id).opinion`), read only (spec: regard moves only at the end).
- Produces:
  - Engineer tiles `radarPower` (`book` / `push`) and `radarVent`; comms tiles `radarComms` (`watch` / `lock` / `spoof`).
  - `radarSuggestOdds(state, post, level, opinion, intent) -> 0..1` in `js/radar.js`: trust (opinion), level, whether the board supports it, nerve; about 0.35 at level 0 and 0.7 at level 5 for a supported call. `data-action="radarSuggest"`, once a cycle, each tagged whether the gun would bear.
  - Calls between posts (`radarCall`) and answers to calls to the hand (`radarAnswer`: do it, no, heard).
  - `radarNeeds(state, post) -> [{ key, fixes: [action] }]` in `js/radar.js`: the spec's list per post. The panel draws it as "Needs you" over the console tiles and readouts; "Nothing. The crew have it." when empty; "How this post works" folded.

- **The hand's learned moves** (`FIGHT_MOVES`, `knownMoves(career())`, the post ladders) carry over, each once a fight, as a tile
  `data-action="radarMove"` with the move's id. Proposed meanings on the radar (owner to confirm, see the plan's hand-off):

  | Move | On the radar |
  |---|---|
  | vent | heat to 0 and the gun unlocked, at once |
  | lead | this cycle's aimed shot takes no range penalty (`radarAimMult` = 1) |
  | split | this cycle the fire control runs the gun and the PDC both |
  | called-shot | this cycle's aimed shot takes no range penalty and rolls the top of its range |
  | break-intercept | the captain's order is "open the range" for this cycle |
  | redline | the drive runs at double thrust this cycle, after the gun fires |
  | patch | `FIGHT.PATCH` of the pooled maximum armour back |
  | hot-start | every shot this cycle overcharged at a plain shot's heat |
  | bypass | our drive's part back to full |
  | spoof | she fires no gun and launches nothing this cycle, and keeps her torpedoes |
  | parley | at 30 km or more, today's wit check: landed, every foe still up breaks off (`broke`) |

- [ ] **Step 1: Write the failing tests:** each move's row above, set up and pressed, its effect asserted (Node tests for the rules,
  one browser test that a known move's tile is offered and spent once); each post's "Needs you" items for a set-up state (torpedoes reaching a stowed PDC; coasting against an evade order; heat about to lock; torpedoes the crew have not been told about), each fix pressed and its effect asserted; a suggestion's odds rise with level; a call never goes against the captain's order.
- [ ] **Steps 2 to 5:** as above; full suite; PR 3.

## Part 4: Tuning and the targets (PR 4)

### Task 12: The fight tool and the soak targets

**Files:**
- Modify: `tools/fights.js` (`--radar`: play the radar fight by cycles, no real time)
- Modify: `tools/answer.js` (`answerRadar(s, post)`: the policy that reads her shown threat, for each post)
- Create: `tests/distribution/radarfights.test.js`
- Modify: `js/radar.js` (`RADAR` numbers, tuned)
- Modify: `.github/workflows/soak.yml` only if it lists soak files by name

**Interfaces:**
- Produces: the spec's targets as assertions, over stated seeds and samples, with fixed policies (random, hull, lock, hold-range, always-PDC) and `answerRadar`: answer's good ends at or above every fixed policy's against each type; no fixed policy over 70% good ends against every type; random loses a quarter or more; at each post the hand's choices move good ends by at least 15 points between `answerRadar` and random; under a third of fights reach the cap; the median gap between automatic pauses in a 16x run is at least three cycles; worn stock sensors lose clearly, and each upgrade flag wins back part.

- [ ] **Step 1: Write the soak test with the targets;** run `npm run soak -- tests/distribution/radarfights.test.js` (or the soak's per-file form); expect some to FAIL.
- [ ] **Step 2: Tune `RADAR` with `node tools/fights.js --radar --seeds 1,2,3 --n 100 --post <post>`** until every target passes. If a target cannot be met by tuning, stop and raise it with the owner (spec, "Calls made").
- [ ] **Step 3: Run the soak file and the full suite,** PASS. Record the measured table in `COMBAT.md`'s fight section, as the old fight's is.
- [ ] **Step 4: Commit; push; PR 4.**

## Part 5: The switch-over and the old fight retired (PR 5)

### Task 13: Switch over and retire

**Files:**
- Modify: `js/fightui.js` (remove the old ship fight's event and turn code and the Task 8 fork; `startShipFight` always starts the radar fight)
- Modify: `js/fight.js` (remove `resolveShipTurn`, `shipFight`, `shipEnd`, `FIGHT_MOVES` uses only the old fight had, keep `shipSide`, `dealDamage`, `FIGHT` keys the radar fight uses, and the deck fight untouched)
- Delete: `js/board.js` and its script tag
- Modify: `js/menu.js` (remove `Settings.radarFight` and its checkbox)
- Modify: `js/duel.js:118` (the owner who kept a post: the radar fight with the captain's order picked by `radarCaptain` at a steady nerve, passed as a parameter, and suggestions at a fixed trust)
- Modify: `tests/fight.test.js`, `tests/fightui.test.js`, `tests/distribution/fights.test.js`, the pins that play the old fight (rewrite with `npm run pin:from`), `tools/fights.js`, `tools/answer.js`
- Modify: `COMBAT.md` (the hired hand's ship fight section rewritten for the radar fight; the "Piloting and real-time combat are the least interesting part of the game" line changed to the owner's decision)
- Modify: `tests/actions.test.js` (remove names that are gone)

- [ ] **Step 1:** with the old fight still in place, run the full suite, the editor suite and the soak; record what passes.
- [ ] **Step 2:** remove the old fight as listed; run `node --test tests/globals.test.js tests/actions.test.js`, PASS.
- [ ] **Step 3:** the owner's kept-post path: a full-scope test that an owner who kept the gunner post meets a raider and gets the radar fight, PASS.
- [ ] **Step 4:** full suite, editor suite (`npm run test:editor`), coverage floor (`npm run coverage -- --check`, lowering nothing; raise a number a file now beats) and the soak, all PASS.
- [ ] **Step 5:** commit; push; PR 5. Then delete `prototypes/radar-spike.html` and `prototypes/answer-spike.html` and update `prototypes/README.md` in the same PR (the boarding prototype stays until its spec is written).

## Follow-up, not in these five PRs

- The accuracy and resilience upgrades as outfits the captain buys from the ship's fund (the co-op in chapter two): their data, when the captain buys, and how the hand argues for one. Filed as its own issue.
