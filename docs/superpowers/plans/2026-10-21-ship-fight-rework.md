# Ship Fight Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the hired hand's ship fight a puzzle with real risk (each enemy type wants a different answer, every answer costs something, fights end decisively), and bring chapter 1's fights in a teaching order with authored entries.

**Architecture:** The pure engine in `js/fight.js` gains per-type enemy signatures (a launcher part and salvo, shield regeneration, a larger weapons bar), overcharged and aimed shots, and a turn-cap end in place of the standoff. The panel in `js/fightui.js` offers the new orders and ends. The captain's Ice Hauler is fitted with a turret and a launcher so the hand has three things to work. A new pure module `js/fightladder.js` decides which authored fight is due and which types random contacts may draw.

**Tech Stack:** Vanilla JS classic scripts sharing one global scope; Node's test runner; Playwright with the headless shell for page tests.

**Spec:** `docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md` (approved 2026-10-21). Owner's ruling after the spec (2026-10-21): the Ice Hauler is fitted with a close-defense turret and a torpedo launcher with 2 torpedoes, restocked from the ship's fund at ports with an outfitter.

## Global Constraints

- Read `CLAUDE.md` first: the heartbeat file, classic scripts and load order (`index.html` and editor.js `SCRIPTS` must list a new file; `tests/globals.test.js` enforces unique top-level names), fields on `G` declared in `js/game.js`, new logic takes the state it reads as parameters and returns a value.
- No emojis anywhere.
- The owner game is parked: new code is written for the hired hand, with any owner-only behavior as a gate at its edge (`if (!hired()) return ...`).
- Randomness only through the `rand` passed in (engine) or the game's seeded `Math.random` (panel), so pins stay reproducible.
- Every new line of text is a scene line (`js/hiredscenes.js` `SCENE_LINES`), read by `sceneSay`, played in `tests/sceneplay.js` so `tests/scenelines.test.js` sees it, and pinned. Lines follow `docs/prose-style.md` and `docs/voices/`; run `npm run voices` on new scene text.
- Tests: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` before each PR; `npm run test:editor` when the editor's scene list or previews change; `npm run soak` when pacing or pay changes. Pins are rewritten with `PIN_WRITE=1` and each diff read.
- The ship is never lost, and no fight ends the chapter (spec, Section 3).

## Review Focus

1. A hand's save from before this work has no turret or launcher on the Ice Hauler: the panel must still offer one gun and Fire, and the ladder must still run (no crash, no fitting forced on load).
2. A gun aimed at `launcher` when the ship it lands on has no launcher (a pack with one corsair, or a raider): the shot goes to that ship's hull, never to a missing part.
3. Torpedoes at 0 and a fund too low to restock: no negative fund, the torpedo order is not offered, the turret still works.
4. A ladder step comes due on a burn that already has an intercept planned (a wanted patrol): the step waits for the next burn and is not lost or doubled.
5. The chapter ends (a buy-in, put ashore) with ladder steps left: nothing breaks, and the owner game (`?scope=full`, no `hired()`) never consults the ladder.

---

## PR 1: the engine and the panel

### Task 1: The Ice Hauler carries a turret and a launcher

**Files:**
- Modify: `js/hired.js` (`setupHired`, near line 71; a landing hook in the `Mods.register` near line 573)
- Test: `tests/hired.test.js`

**Interfaces:**
- Produces: `HAND_TORPS = 2` (a constant in `js/hired.js`); `restockTorps(st, h, planet)` returning the line said, or `''`.

- [ ] **Step 1: Write the failing tests** in `tests/hired.test.js`:
  - `'the Ice Hauler is fitted with a close-defense turret and a launcher with two torpedoes (#fight-rework)'`: after `startGame({ ..., mode: 'hired', post: 'gunner', captainKey: 'hester' })`, assert `G.state.outfits.pdc === 1`, `G.state.outfits.launcher === 1`, `G.state.torpedoes === 2`, `ship().pdc === true`, `ship().launcher === true`, `ship().guns === 2`.
  - `'at a port with an outfitter the captain restocks the torpedoes from the fund'`: set `G.state.torpedoes = 0`, `hired().fund = 100000`, call `restockTorps(G.state, hired(), currentPlanet())` at Earth (an outfitter port); assert `torpedoes === 2`, `fund === 100000 - 2 * TORP_PRICE`, and the returned line includes `fmt(2 * TORP_PRICE)`. With `fund = TORP_PRICE - 1`, assert nothing is bought, the fund is unchanged and the line is `''`. At a port without `'outfitter'` in its services, nothing is bought.
- [ ] **Step 2: Run** `node --test tests/hired.test.js`; expected FAIL (no outfits, `restockTorps` not defined).
- [ ] **Step 3: Implement.** In `setupHired`, set `st.outfits = { pdc: 1, launcher: 1 }` and `st.torpedoes = HAND_TORPS` after `st.shipId`. `restockTorps(st, h, planet)` is pure over its arguments: buys `min(HAND_TORPS - torpedoes, floor(h.fund / TORP_PRICE))` at an outfitter port, charges `h.fund` and adds the same to `h.bill` (as repairs do, `js/repairs.js:35`), and returns a scene line `scene:screens` `torps.restock` ("The captain has the magazine filled at the yard: {n} torpedoes, {cost} cr from the ship's fund."). Call it from a `landed` hook and push a non-empty line to `UI.notes`. Add the line to `SCENE_LINES['scene:screens']` and a case to `tests/sceneplay.js`.
- [ ] **Step 4: Run** `node --test tests/hired.test.js tests/scenelines.test.js`; expected PASS.
- [ ] **Step 5: Commit** `Hand: the Ice Hauler carries a turret and a launcher, restocked from the fund`.

### Task 2: Enemy types, shield regeneration and a longer weapons bar

**Files:**
- Modify: `js/fight.js` (`FIGHT`, `shipSide`, `resolveShipTurn`), `js/fightui.js` (`startShipFight`: the foe side)
- Test: `tests/fight.test.js`

**Interfaces:**
- Produces: `FOE_TYPES` in `js/fight.js`, keyed by ship id: `{ raider: { regen: 0, launcher: false }, corsair: { regen: 0, launcher: true, torps: 3 }, cutter: { regen: 0.25, launcher: false }, destroyer: { regen: 0.15, launcher: true, torps: 4 } }`. `shipSide(stats, { grade, skill, torps, regen = 0, launcher })` sets `side.regen` and, when `launcher` is true, `side.parts.launcher = { hp: FIGHT.PART_HP.launcher, max: ... }` and `side.launcher = true`. `FIGHT.PART_HP` becomes `{ weapons: 40, drive: 15, lock: 10, launcher: 15 }` (starting values; Task 7 tunes them). `FIGHT.SHIELD_REGEN` is removed.

- [ ] **Step 1: Write the failing tests:**
  - `'a cutter's shields come back by her regen share each turn, a raider's not at all'`: two sides from `shipSide` with `regen: 0.25` and `regen: 0`, shields knocked to 0 by a turn of fire; after the next `resolveShipTurn` with `quiet` moves, the first has `Math.round(0.25 * maxShields)`, the second 0.
  - `'a side with a launcher has a launcher part; one without has none'`: `shipSide(stats, { launcher: true }).parts.launcher.hp === FIGHT.PART_HP.launcher`; `shipSide(stats, {}).parts.launcher === undefined`.
  - `'her weapons bar is 40 a mount: one gun at the bar takes about three turns'`: one mount, `PART_HP.weapons === 40`.
  - Update `'shields do not come back in the fight as tuned (SHIELD_REGEN 0)...'` to read `side.regen` and `'the constants are the ones the design names'` to the new `PART_HP`.
- [ ] **Step 2: Run** `node --test tests/fight.test.js`; expected FAIL.
- [ ] **Step 3: Implement.** Regeneration at the end of `resolveShipTurn` uses each side's `regen`. In `startShipFight`, the foe side gets `{ grade: s.grade, ...FOE_TYPES[foe.shipId], torps: (FOE_TYPES[foe.shipId] || {}).torps || 0 }`. The hand's own side passes `launcher: me.launcher` (the player's ship's turret and launcher come from `ship()` as today).
- [ ] **Step 4: Run** `node --test tests/fight.test.js`; expected PASS.
- [ ] **Step 5: Commit** `Fight: enemy types, shield regeneration by type, and a launcher part`.

### Task 3: Her torpedo salvo, shown a turn ahead

**Files:**
- Modify: `js/fight.js` (`foeMove`, `resolveShipTurn`; state gains `armed: []`, one flag per foe)
- Test: `tests/fight.test.js`

**Interfaces:**
- Consumes: `side.launcher`, `side.parts.launcher`, `side.torps` (Task 2).
- Produces: her moves `{ kind: 'arm', n }` (the salvo is loaded, fired next turn) and `{ kind: 'salvo', target: 'hull', n, dmg: [lo, hi] }` with `dmg = FIGHT.TORP_DMG` times `n`. `FIGHT.SALVO = 2` (torpedoes a salvo), `FIGHT.SALVO_EVERY = 3` (she arms on turn 0, then every third turn), `FIGHT.PDC_SALVO = 0.6` (what a turret held back takes off a salvo).

- [ ] **Step 1: Write the failing tests:**
  - `'a corsair with a launcher and torpedoes arms on turn 0 and fires the salvo the turn after'`: `foeMove` at turn 0 returns `{ kind: 'arm', n: 2 }`; after a resolved turn with that move, `state.armed[0] === true` and the next `foeMove` is `{ kind: 'salvo', ... n: 2 }`; after that turn her `torps` is one less by `n` and `armed[0]` is false.
  - `'a turret held back cuts a salvo by PDC_SALVO; a gun-fired turret does not'`: the same salvo with `pdc: 'hold'` and with `pdc: 'fire'`, `LOW`/`HIGH` rand; held damage is `Math.round(raw * (1 - 0.6))` within rounding.
  - `'her launcher at 0 takes the salvo away, armed or not'`: launcher hp 0 after an armed turn: the next move is not `salvo`, and the torpedoes are not spent.
  - `'with no torpedoes left she does not arm'`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement.** In `foeMove`, after the break and no-guns rules and before `board`: an armed foe with its launcher up fires `salvo`; an unarmed foe with launcher up, `torps >= 1` and `st.turn % FIGHT.SALVO_EVERY === 0` arms with `n = Math.min(FIGHT.SALVO, torps)`. In `resolveShipTurn`, `arm` sets `armed[i]`; `salvo` deals its damage to your hull (cut by `PDC_SALVO` when the turret is held), spends `n` torpedoes and clears `armed[i]`. A salvo is not cut by `PDC_HOLD` (that is for guns).
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `Fight: her torpedo salvo, armed a turn ahead and cut by the turret held back`.

### Task 4: Overcharge and aimed shots

**Files:**
- Modify: `js/fight.js` (`resolveShipTurn`, heat)
- Test: `tests/fight.test.js`

**Interfaces:**
- Produces: a gun order `{ foe, part, over }` with `over: true` for an overcharged shot. `FIGHT.OVER_MULT = 1.5`, `FIGHT.OVER_HEAT = 2` (heat an overcharged shot adds; a plain shot adds 1). `FIGHT.AIM_MULT = { knife: 1, close: 1, mid: 0.7, long: 0.5 }`, applied on top of the band to a shot at `drive`, `lock` or `launcher`; a shot at `hull` or `weapons` has no aim penalty. `shotRange(st, order)` returns the `[lo, hi]` a gun order would roll, so the panel can show it.

- [ ] **Step 1: Write the failing tests:**
  - `'an overcharged shot rolls OVER_MULT more and adds two heat'`: one gun at hull, `LOW` rand, `over: true` against `over: false`; damage ratio 1.5 within rounding; heat 2 against 1 before the vent.
  - `'two overcharged shots go over the heat cap and lock a gun next turn'`: two guns, both `over`, heat 4 + vent: assert `locked` per the existing cap rule (heat over `HEAT_CAP`).
  - `'a shot at her drive at long range is cut by AIM_MULT.long on top of the band; at her hull it is not'`.
  - `'shotRange gives the roll an order would make'`: matches the damage of a `LOW` and a `HIGH` roll.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** in `resolveShipTurn`: each shot's multiplier is `dmgMult * bandMult * (over ? OVER_MULT : 1) * (aimed part ? AIM_MULT[band] : 1)`; heat adds `over ? OVER_HEAT : 1` a shot. `shotRange` uses the same multiplier.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `Fight: overcharged shots and aimed shots that suffer at range`.

### Task 5: Decisive ends: no standoff, the captain runs, she gets away

**Files:**
- Modify: `js/fight.js` (`FIGHT.TURNS`, `foeMove`, `shipEnd`)
- Test: `tests/fight.test.js`

**Interfaces:**
- Produces: `FIGHT.TURNS = 8`. `shipEnd(st)` returns one of `'lost' | 'boarded' | 'crippled' | 'broke' | 'away' | 'ran' | 'escaped' | null`; `'standoff'` is gone.
  - `'away'`: every foe still in the fight breaks off with her weapons at 0 and her hull share at or above `FIGHT.BREAK` (she got away with nothing for you).
  - At the turn cap with no other end: `hullShare(st.me) < poolShare(st.foes)` gives `'ran'` (the captain runs, a lost fight); otherwise `'broke'`.

- [ ] **Step 1: Write the failing tests:** update `'each end is reached: ... standoff after six turns'` to `'each end is reached: crippled, broke, boarded, lost, escaped, away, and at eight turns broke or ran'`, asserting:
  - a foe with weapons 0, hull share 0.8, drive up, whose move is `break`, ends `'away'`;
  - at turn 8 with you at 0.5 and her at 0.7, `'ran'`; with you at 0.7 and her at 0.5, `'broke'`;
  - `shipEnd` never returns `'standoff'`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** in `shipEnd`, in this order: lost, boarded, crippled, away, broke, escaped, then the turn cap.
- [ ] **Step 4: Run**; expected PASS.
- [ ] **Step 5: Commit** `Fight: the six-turn standoff gives way to decisive ends`.

### Task 6: The panel: the new orders, her new moves and the new ends

**Files:**
- Modify: `js/fightui.js` (`FIGHT_AIM`, `shipFightEvent`, `fireTurn`'s `at`, `shipFightEnd`), `js/hiredscenes.js` (`SCENE_LINES['scene:fight']`), `tests/sceneplay.js`, `editor.js` only if its fight preview lists lines
- Test: `tests/fightui.test.js`

**Interfaces:**
- Consumes: Tasks 2 to 5 (`over`, `shotRange`, `arm`, `salvo`, `launcher`, `'ran'`, `'away'`).
- Produces: scene lines `foe.arm` ("{ship} is loading torpedoes: {n} next turn."), `foe.salvo` ("{ship} fires a salvo of {n} at your hull, {lo} to {hi}."), `part.launcher`, `gun.over` (a toggle label per gun, showing "overcharged" or not), `aim.range` (the roll a gun's order would make, from `shotRange`), `end.ran`, `end.away`. The lines `end.standoff` and `end.standoffNear` are removed (and their readers).

- [ ] **Step 1: Write the failing tests** in `tests/fightui.test.js`:
  - `'against a corsair the panel offers her launcher as a target, and her arming is shown above the board'`.
  - `'a gun can be overcharged and the Fire label counts the heat it adds'`: toggle on gun 1, Fire label shows heat `2` for that gun.
  - `'a gun aimed at the launcher lands on the hull of a ship that has none' (Review Focus 2)`: a pack with a raider first; `fireTurn` with a launcher order deals damage to the raider's hull and throws nothing.
  - `'with no torpedoes and no fund to restock, the torpedo order is not offered and the turret still is' (Review Focus 3)`.
  - `'a save from before the fitting fights with one gun and Fire' (Review Focus 1)`: `delete G.state.outfits.pdc; delete G.state.outfits.launcher`, start a fight; choices are one gun and Fire.
  - `'the captain running ends the fight as a loss and she getting away gives no experience'`: drive `shipFightEnd` with `'ran'` and with `'away'`; assert no `gainSkill` points for either, a captain's `like` of -1 with a memory for `'ran'`, and the right line in the text.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement.** `FIGHT_AIM` gets `'launcher'` after `'lock'`, offered only when some foe in the fight has a launcher. `fireTurn`'s `at` falls a missing part through to `'hull'` on the ship it chose. Add each new line to `tests/sceneplay.js` (a corsair fight played to `arm` and `salvo`, a `'ran'` and an `'away'` end).
- [ ] **Step 4: Run** `node --test tests/fightui.test.js tests/scenelines.test.js`; then rewrite the pins (`PIN_WRITE=1 node --test tests/beatpin.test.js tests/scenepin.test.js`) and read the diff; then `npm test` and `npm run test:editor`. Expected PASS.
- [ ] **Step 5: Commit** `Fight panel: overcharge, the launcher, her salvo, and the new ends`.

### Task 7: The fight tool reads her move, and the numbers are tuned to the targets

**Files:**
- Modify: `tools/fights.js`, `js/fight.js` (`FIGHT`, `FOE_TYPES` values only), `COMBAT.md` (a short section with the tuned numbers and the tool's table)
- Test: `tests/fight.test.js` (constants test, updated to the tuned values)

**Interfaces:**
- Produces: a per-enemy-type table for every gun policy, and a new policy `answer`: hold the turret when her shown move is `salvo`; aim at her lock when she is `pin` or `close` and her lock is up; against a ship with `regen > 0`, torpedo at her hull and overcharge while heat allows; else her weapons.

- [ ] **Step 1: Add** the `answer` policy and the per-type breakdown (`raider`, `corsair`, `cutter`, `raider pair`) with good ends, lost fights (`'ran'` or `'lost'`), hull lost and turns.
- [ ] **Step 2: Run** `node tools/fights.js --seeds 1,2,3,4,5 --n 100 --ship-only` and tune `FIGHT` and `FOE_TYPES` until all hold:
  - no single fixed policy (`random`, `focus`, `drive`, `lock`) has good ends above 70% against every type, and the best fixed policy differs by type;
  - `answer` has the best good-end rate against every type;
  - `random` loses (`'ran'` or `'lost'`) 25% or more over all types;
  - mean turns 5 to 8, and no `'standoff'`.
- [ ] **Step 3: Run** `npm test`, `npm run soak` and `npm run playthrough -- --seed 1 --captain hester --no-video` (the play-through's player is the `answer` policy's simpler cousin; the chapter must still reach its end). Expected PASS, and the play-through ends `Bought in`.
- [ ] **Step 4: Commit** `Fight: tuned against the per-type targets; the tool reads her move`. Open PR 1.

## PR 2: the stakes

### Task 8: A lost fight costs cargo, the fund and the captain's regard

**Files:**
- Modify: `js/fightui.js` (`shipFightEnd` for `'ran'`), `js/boarders.js` (`shipTaken`, for the cargo), `js/hiredscenes.js` (lines)
- Test: `tests/fightui.test.js`

**Interfaces:**
- Consumes: `loseCargo(frac)` in `js/transit.js` (takes a share of the fullest good and returns a line); `like(person, n, memory)`.
- Produces: `FIGHT.LOST_CARGO = 0.3` (the share of the hold she takes on `'lost'`, and the captain jettisons on `'ran'`).

- [ ] **Step 1: Write the failing tests:**
  - `'when the captain runs, a third of the hold goes and the contract comes in short'`: a hold of 30t of a contract's good; after `'ran'`, the hold has 21t, and the next `settleRun` records a short delivery (`h.ledger[0].short === true`).
  - `'when she takes the ship, she takes cargo as well as the fund'`: `'lost'` with cargo aboard takes `LOST_CARGO` of it.
  - `'a lost fight's armor is billed at the next yard'`: after `'ran'` with armor down, `repairPlan(planet).total > 0` at a yard port (the existing path, asserted, not built).
  - `'with an empty hold nothing is jettisoned and nothing throws'`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement** in `shipFightEnd` (`'ran'`) and `shipTaken` (`'lost'`): call `loseCargo(FIGHT.LOST_CARGO)` when the hold has any cargo, and say its line. Lines: `end.ran` already carries the captain's decision (Task 6); add `end.ran.cargo` for the jettison.
- [ ] **Step 4: Run** `node --test tests/fightui.test.js`, the pins (rewrite and read), `npm test`, `npm run soak`. Expected PASS.
- [ ] **Step 5: Commit** `Fight: a lost fight costs cargo as well as the hull and the captain's regard`. Open PR 2.

## PR 3: the fight ladder and its entry scenes

### Task 9: The ladder decides which fight is due and what random contacts may be

**Files:**
- Create: `js/fightladder.js` (pure; loaded after `js/engage.js` and before `js/engagements.js` in `index.html` and editor.js `SCRIPTS`)
- Modify: `js/engage.js` (`planIntercept`, `makeEnemy`), `js/engagements.js` (`ambushScene`'s spec), `js/shipcombat.js` (`rateFoe` honors `spec.grade` and `spec.pack`), the `Pirates Matching Course` hook in `js/engage.js`
- Test: `tests/fightladder.test.js` (plain Node, via `tests/nodecontext.js`), `tests/hired.test.js` for the wiring

**Interfaces:**
- Produces:
  - `FIGHT_LADDER`: an array of steps `{ id, spec, due(h, st) }`, in this order:
    1. `raider`: `{ kind: 'pirate', shipId: 'raider' }`, due when `runTotals(h).runs >= 1` and the burn is not Earth to Earth's own space (`st.systemId !== 'earth' || st.dest !== 'earth'`).
    2. `corsair`: `{ kind: 'pirate', shipId: 'corsair' }`, due when `runTotals(h).runs >= 3`.
    3. `cutter`: `{ kind: 'patrol', shipId: 'cutter', gov: <the gov of the system the burn leaves> }`, due when `captainBeatsDone(h)`.
    4. `pair`: `{ kind: 'pirate', shipId: 'raider', pack: true }`, due when `h.deal` exists.
    5. `setpiece`: `{ kind: 'pirate', shipId: 'corsair', grade: 2 }`, due when `wantsYard()` is true and the deal is open.
  - `ladderNext(h, st)` returns the first step whose id is not in `h.fights.done` and whose `due` holds, else `null`. It returns `null` when `!h`.
  - `ladderMet(h)` returns the ship ids of the steps done (`raider`, `corsair`, `cutter`), never empty after step 1; before it, `[]`.
  - `h.fights = { done: [] }`, created on first use; a step is marked done when its fight starts (`startShipFight` with `spec.ladder`).
  - `LADDER_RANDOM = 0.5`: random hand contacts happen at half today's rate, and only once `ladderMet(h)` is not empty; their `shipId` is drawn from `ladderMet(h)`.
- [ ] **Step 1: Write the failing tests** in `tests/fightladder.test.js`:
  - `'the steps come in order, each when its condition holds'`: a fake `h` walks through the five steps.
  - `'a step that is due waits for a burn with no other intercept' (Review Focus 4)`: in `tests/hired.test.js`, a wanted patrol planned first; the ladder step is still `ladderNext` on the next burn.
  - `'random contacts draw only from the types met'`: with `done: ['raider']`, 200 draws of the random spec give only `raider`.
  - `'with no hand the ladder is never asked' (Review Focus 5)`: `ladderNext(null, st) === null`, and `planIntercept` in an owner game is unchanged (a test in `tests/hired.test.js` under `scope: 'full'`).
  - `'after the chapter ends with steps left, nothing throws'`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Implement.** `planIntercept`: for a hand, a due step becomes the intercept (`spec` with `ladder: step.id`); otherwise the random roll uses `LADDER_RANDOM` and `ladderMet`. `makeEnemy` honors `spec.shipId` (it does) and `rateFoe` honors `spec.grade` and `spec.pack` when set.
- [ ] **Step 4: Run** `node --test tests/fightladder.test.js tests/hired.test.js tests/globals.test.js`; then `npm test`, `npm run test:editor` (the script list changed) and `npm run soak`. Expected PASS.
- [ ] **Step 5: Commit** `Fights: a ladder brings chapter 1's fights in a teaching order`.

### Task 10: The entry scenes, drafted for the owner to edit

**Files:**
- Modify: `js/hiredscenes.js` (a new `scene:fight-entry` entry in the scene index and its lines), `js/engage.js` (`contactEvent` reads the step's lines when `spec.ladder` is set), `editor.js` (the preview for `scene:fight-entry`), `tests/sceneplay.js`
- Test: `tests/fightladder.test.js` (the contact text), `tests/scenelines.test.js`, the pins

**Interfaces:**
- Consumes: `spec.ladder` (Task 9).
- Produces: lines `scene:fight-entry` `{step}.text` for the five step ids, each the contact's opening in place of the generic sensor line, carrying the step's reason from the spec's table (the raider who reads an easy board; the corsair who has heard of the bank's payment; the cutter checking papers; the pair off the lane to the yard; the set piece tied to the Ore Runner and the bank). The contact's choices are unchanged.
- [ ] **Step 1: Write the failing test:** `'a ladder fight opens with its own entry line, and a random one with the sensor line'`.
- [ ] **Step 2: Run**; expected FAIL.
- [ ] **Step 3: Draft** the five lines in the house style, two to four sentences each, run `npm run voices` on them and fix what it flags; add the scene to the editor's previews and to `tests/sceneplay.js`.
- [ ] **Step 4: Run** `node --test tests/scenelines.test.js`, the pins (rewrite and read), `npm test`, `npm run test:editor`, and `npm run playthrough -- --seed 1 --captain hester --no-video` (the five fights appear in order in the transcript). Expected PASS.
- [ ] **Step 5: Commit** `Fights: the ladder's entry scenes, drafted`. Open PR 3.
