# Turn-based Combat Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hired hand's raid beats and lock-fight tactic triangle with one turn engine played on a visible board. The enemy's move is shown, the captain and crew move by visible rules, the hand gives real orders at their post, and damage is rolled in ranges instead of pass/fail odds.

**Architecture:**
- A pure engine, `js/fight.js`, takes a fight state and orders and returns the next state, the turn's line and the end. It does not read `G`, and runs under `tests/nodecontext.js`.
- `js/fightui.js` turns a fight state into an ordinary event for the existing dialog. The SVG goes in `ev.board`, the shown moves in `ev.read`, the log in `ev.text`, and the orders and Fire in `ev.choices`.
- A new choice flag, `keep: true`, makes the dialog redraw in place instead of showing a result page, so orders can be set before Fire.
- The fight state lives in closures, as the raid's state does today. There is no new field on `G`, and a save in the middle of a fight behaves as one in the middle of a raid does now.

**Tech Stack:** Vanilla JS, classic scripts in one global scope (load order in `index.html`), node:test, Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-10-20-turn-combat-design.md`

## Global Constraints

- Classic scripts in one global scope. A new script goes in `index.html` in load order (`tests/globals.test.js`), and its top-level names are unique.
- No new field on `G`. If one turns out to be needed, it is declared, with a comment, in the literal in `js/game.js` (`tests/gfields.test.js`).
- New logic takes its state as parameters and returns a value. Randomness comes in as a `rand` parameter (a function that returns a number in [0, 1)); callers pass `Math.random`, which tests seed with `__seed`.
- Code is written for the hired hand, with no `hired()` fork in the middle of the logic.
- No emojis anywhere.
- Every word a player reads is a scene line (`SCENE_LINES['scene:fight']` in `js/hiredscenes.js`, read with `sceneSay`), so the voice review, the editor and the pins cover it.
- The owner's card duel (`js/duel.js` `duelEvent`/`duelExchange`) is untouched.
- Before every push: `npm test` and `npm run test:editor`, with `CHROMIUM_PATH` exported (see CLAUDE.md).

## Review Focus

These failure modes are implied by the spec, but no task's main test covers them. Each one gets its own test in the task named.

1. **A ship with no launcher or no close-defense turret.** The torpedo and turret orders must not appear, and the engine must ignore them if sent. Pinned in Task 1.
2. **A pack (two foes) where one is crippled and the other is not.** The fight goes on against the second, and only ends crippled when both are. Pinned in Task 2.
3. **Every gun overheated at once.** The turn still resolves: no shots, the heat bleeds off, and the enemy acts. Pinned in Task 1.
4. **A boarding where the hand stands in a section the boarders have taken.** The hand is pushed back one section with a hurt roll, and is never left standing alone among boarders. Pinned in Task 3.
5. **A fight opened from a save made mid-raid in an old version.** Today the raid is not saved, and the load path must still open no fight and not throw. Pinned in Task 5.

---

## Part A: the engine (pull request 1)

### Task 1: the ship-fight state and the turn's resolution

**Files:**
- Create: `js/fight.js`
- Modify: `index.html` (add `js/fight.js` after `js/range.js`)
- Test: `tests/fight.test.js`

**Interfaces:**
- Consumes:
  - `SHIPS`, `OUTFITS` and `shipStats(id)` (`js/data.js`, `js/game.js:178`);
  - `RANGE_BANDS` (`js/range.js`: knife, close, mid, long).
- Produces:
  - `FIGHT` constants: `{ GUN_DMG: [8, 14], HEAVY: 1.4, SKILL_DMG: 1, BAND_MULT: { knife: 1.1, close: 1, mid: 0.85, long: 0.6 }, HEAT_CAP: 4, HEAT_VENT: 2, SHIELD_REGEN: 0.1, PART_HP: { weapons: 20, drive: 30, lock: 20 }, TORP_DMG: [30, 45], PDC_HOLD: 0.4, TURNS: 6 }`
    - `PART_HP.weapons` is per gun mount.
  - `shipSide(stats, { grade = 0, skill = 0, torps = 0 })` returns a side: `{ shields, maxShields, armor, maxArmor, parts: { weapons: {hp, max}, drive, lock }, guns, dmgMult, skill, launcher, pdc, torps }`.
    - `grade` multiplies the hull by `1 + GRADE_HULL * grade` and the damage by `1 + GRADE_PUNCH * grade` (reuse those constants from `js/shipcombat.js`; `fight.js` loads after it, or the constants move into `fight.js`, with no duplicate names).
  - `shipFight({ me, foes, nerve, band })` returns the state: `{ kind: 'ship', me, foes: [side], band, heat: 0, locked: [], turn: 0, nerve, log: [] }`.
    - `band` is an index into `RANGE_BANDS`.
  - `gunsReady(state)` returns the number of mounts that can fire this turn: `me.guns`, less the mounts lost to weapon damage, less the locked mounts.
  - `resolveShipTurn(state, orders, moves, rand)` returns `{ state, events }`. It does not mutate its input.
    - `orders`: `{ guns: [{ foe, part } | null], torp: { foe, part } | null, pdc: 'fire' | 'hold' }`.
    - `moves`: `{ foe: [move], captain: move }`, from Task 2.
    - `events` is a list of facts for the turn's line, e.g. `{ who: 'me', part: 'drive', dmg: 12 }`.
  - Damage to a part goes to its `hp`. Damage to `hull` goes to shields first, then armor. A part at 0 hp is out.

- [ ] **Step 1: Write the failing tests** in `tests/fight.test.js`, loading `['js/data.js', 'js/range.js', 'js/shipcombat.js', 'js/fight.js']` with `load(...)` and a stub `rand` (`() => 0` for the low end of a range, `() => 0.999` for the high end):

```js
test('a side takes its hull from the ship and its outfits', () => {
  const s = shipSide({ shields: 90, armor: 140, guns: 1, dmgMult: 1 }, {});
  assert.deepEqual([s.shields, s.armor, s.parts.weapons.max, s.parts.drive.max, s.parts.lock.max], [90, 140, 20, 30, 20]);
});
test('a shot does damage within its range, times heavy rounds and the band', () => {
  // one gun, close band, heavy rounds: low end 8 * 1.4 = 11 (rounded), high end 14 * 1.4 = 20 (rounded)
});
test('damage takes shields before armor, and a part at 0 is out', () => {});
test('each shot adds 1 heat and 2 bleed off a turn; over 4, a gun is locked next turn', () => {});
test('with every gun locked the turn still resolves: no shots, heat bleeds, the foe acts', () => {}); // Review Focus 3
test('a ship with no launcher or no turret ignores torp and pdc orders', () => {}); // Review Focus 1
test('a turret held back cuts the next volley by 40 percent', () => {});
test('resolveShipTurn does not change the state it was given', () => {});
```

- [ ] **Step 2: Run the tests to see them fail.**
  Run: `node --test tests/fight.test.js`. Expected: FAIL, because `shipSide` is not defined.

- [ ] **Step 3: Implement** `FIGHT`, `shipSide`, `shipFight`, `gunsReady` and `resolveShipTurn` in `js/fight.js`.
  - Damage is `Math.round(lo + rand() * (hi - lo))`, after the multipliers.
  - Gunner skill adds `SKILL_DMG` per level to the low end.
  - Shields regenerate by `SHIELD_REGEN * maxShields` at the end of the turn.
  - Add `js/fight.js` to `index.html`.

- [ ] **Step 4: Run the tests to see them pass**, plus `node --test tests/globals.test.js`. Expected: PASS.

- [ ] **Step 5: Commit:** `git commit -m "The fight engine: sides, damage in ranges, heat and parts (#NNN)"`. The issue number comes from the issue opened for this plan.

### Task 2: the enemy's move, the captain's move, and the end

**Files:**
- Modify: `js/fight.js`
- Test: `tests/fight.test.js`

**Interfaces:**
- Consumes: the state from Task 1.
- Produces:
  - `foeMove(state, i)` returns one move: `{ kind: 'broadside' | 'close' | 'board' | 'pin' | 'break', target?: part, dmg?: [lo, hi] }`. The rules, in this order:
    1. `break` when its hull is below 30%.
    2. `board` when the band is knife and its lock is up.
    3. `pin` (a broadside at your drive) when your drive is up and you are faster (`stats.accel * turn`).
    4. `close` when the band is above close and its drive is up.
    5. Otherwise `broadside` at your weapons.
    - `dmg` is the range its guns would do.
  - `captainMove(state)` returns `{ kind: 'close' | 'hold' | 'open' }`:
    - nerve 4 or 5: `close` when ahead (her hull share is below yours), else `hold`;
    - nerve 1 or 2: `open` when your hull is below 60%, else `hold`;
    - nerve 3: `open` below 40%, `close` when ahead by 30 points, else `hold`.
  - The range step inside `resolveShipTurn`:
    - When the moves agree, the band moves one step.
    - When they disagree, the faster ship's move wins.
    - A ship whose drive is out cannot move the band.
  - `shipEnd(state)` returns `null | 'crippled' | 'broke' | 'boarded' | 'lost' | 'escaped' | 'standoff'`:
    - `crippled`: every foe has its weapons and drive out.
    - `broke`: the foe's move this turn was `break` and it is not pinned.
    - `boarded`: `board` resolved with its lock up.
    - `lost`: your armor is at 0.
    - `escaped`: the band went past long.
    - `standoff`: `turn >= FIGHT.TURNS`.

- [ ] **Step 1: Write the failing tests:**

```js
test('her move follows her rules: break below 30 percent, board at knife with a lock, pin when you are faster, close from range, else a broadside', () => {});
test('a part at 0 cancels its move: no lock, no board; no drive, no close', () => {});
test('the captain moves by nerve: a bold one closes when ahead, a cautious one opens below 60 percent', () => {});
test('the range moves one band when the moves agree, and the faster ship wins when they do not', () => {});
test('each end is reached: crippled, broke, boarded, lost, escaped, standoff after six turns', () => {});
test('in a pack, one crippled foe does not end the fight; both do', () => {}); // Review Focus 2
```

- [ ] **Step 2: Run them to see them fail.** Run: `node --test tests/fight.test.js`.

- [ ] **Step 3: Implement** `foeMove`, `captainMove`, the range step and `shipEnd`.

- [ ] **Step 4: Run them to see them pass.**

- [ ] **Step 5: Commit:** "Her move, the captain's by nerve, and the ends (#NNN)".

### Task 3: the deck fight on the same engine

**Files:**
- Modify: `js/fight.js`
- Test: `tests/fight.test.js`

**Interfaces:**
- Consumes:
  - `fightCover({ size, kit, extra })` and `abilityStep` (`js/handtohand.js`);
  - `CUNNING` (`js/shipcombat.js`);
  - `boardersFor` (`js/shipcombat.js`), for the starting head count.
- Produces:
  - `DECK` constants: `{ SECTIONS: ['lock', 'corridor', 'bridge'], SIDEARM: [1, 2], CREW_HIT: [0, 1], BREAK: 1/3, SUIT: 0.7 }`.
    - The ranges count heads taken in a section exchange; cover pips take from the high end.
    - `SUIT` multiplies the hand's hurt odds in a contested section (`REPEL_HURT.lose`, `js/boarders.js`): the standard suit's stat.
  - `deckFight({ boarders, crew, hand, cover, grade, assault, side })` returns the state: `{ kind: 'deck', sections: [{ mine, theirs, cover }], hand: index, began, grade, assault, used: {}, turn: 0, log: [] }`.
    - `side` adds a fourth section, "cargo", reachable from the lock and the bridge, for a long ship.
  - `boardMove(state, rand)` returns `{ kind: 'push' | 'hold' | 'round', from, to, n, feint: bool }`.
    - At grade > 0, `feint` is true with odds `CUNNING * grade`, and a feinted move goes to a different section from the one shown.
  - `resolveDeckTurn(state, { stand, act: 'shoot' | 'steady' | 'cover', order }, shown, rand)` returns `{ state, events }`.
    - Where both sides stand, they trade heads within the ranges.
    - The hand's `shoot` adds `SIDEARM` in their own section.
    - `steady` and `cover` go through `abilityStep`.
    - `order` is one crew order from `crewOrders`.
  - `deckEnd(state)` returns `null | 'won' | 'taken'`:
    - `won`: the boarders are at or below `began * BREAK`, all down, or pushed out of the lock.
    - `taken`: they hold the bridge.
    - In an assault, the same ends with the sides swapped.

- [ ] **Step 1: Write the failing tests:**

```js
test('their move is shown, and at a veteran grade it may feint, at CUNNING * grade', () => {}); // 2000 draws, within 0.03 of the rate
test('a section exchange takes heads within the ranges, less with cover', () => {});
test('the hand shoots, steadies or covers in the section they stand in', () => {});
test('a hand standing in a taken section is pushed back one with a hurt roll, never left alone with them', () => {}); // Review Focus 4
test('the ends: broken at a third, all down, pushed out of the lock, or the bridge taken; mirrored for an assault', () => {});
```

- [ ] **Step 2: Run them to see them fail.**

- [ ] **Step 3: Implement** `DECK`, `deckFight`, `boardMove`, `resolveDeckTurn` and `deckEnd`.

- [ ] **Step 4: Run them to see them pass.**
  Then run `npm test`. Expected: all pass. Nothing is wired yet, so the pins are unchanged.

- [ ] **Step 5: Commit**, add `js/fight.js` to `tools/coverage-floor.json` under `files` at 95, then push and open pull request 1.

## Part B: the ship fight in play (pull request 2)

### Task 4: choices that keep the dialog open

**Files:**
- Modify: `js/ui.js`, at the `choose` handler (around :353), and `js/transit.js` (`chooseEvent`, :410)
- Test: `tests/fightui.test.js` (new, in the browser)

**Interfaces:**
- Produces:
  - A choice may carry `keep: true`. Choosing it runs `c.run()`, which returns the event to show next (or `null`), and redraws the dialog with that event, with no result page and no `finishEvent`.
  - A choice without `keep` behaves exactly as now.

- [ ] **Step 1: Write the failing test.** Open an event whose first choice is `{ label: 'A', keep: true, run: () => ({ ...ev, text: 'second' }) }`, click it, and assert that the dialog shows `second` with no result page.
- [ ] **Step 2: Run it to see it fail.** Run: `node --test tests/fightui.test.js`.
- [ ] **Step 3: Implement the `keep` path** in `chooseEvent` and in the `UI.act` `choose` branch.
- [ ] **Step 4: Run it to see it pass**, then run `npm test`. Expected: no other test changes.
- [ ] **Step 5: Commit.**

### Task 5: the ship-fight panel, wired in place of the raid

Before starting, record the baseline for Task 7: on `main`, run `npm run fights > docs/superpowers/plans/fights-before-turn-combat.txt` and commit the file. Keep the share of fights ending crippled, broken off, in a standoff or boarded, and the repel win rate.

**Files:**
- Create: `js/fightui.js` (add it to `index.html` after `js/engagements.js`)
- Modify:
  - `js/engagements.js`: `startRaid` hands off to `startShipFight`; the raid beats are removed (`raidScene`, `raidStep`, `raidClose`, `costNote`, `HAND_RISK` if it is unused);
  - `js/shipcombat.js`: `shipOdds`, `raidRead` and `edgeOf` are removed once nothing calls them;
  - `js/hiredscenes.js`: a `scene:fight` block of lines.
- Test: `tests/fightui.test.js`, `tests/engagements.test.js`

**Interfaces:**
- Consumes:
  - Tasks 1 and 2;
  - `boardSvg(b, opts)` and `raidBoard(...)` (`js/board.js`);
  - `ship()`, `roleSkill('gunner')`, `G.state.torpedoes`, and `captainEntry().captain.nerve`;
  - the outcomes `deadInSpaceScene(s)`, `repelScene(repelStart(d, outcome))`, `repelCasualty(s)`, `hurtHand(s)` and `captainFlag('raided')`.
- Produces:
  - `startShipFight(spec, flee, o)` takes the same arguments as `startRaid` and keeps its contact logic: the patrol rep cost, the flee roll, and the raid explanation on the first fight. It then sets `G.nextEvent = shipFightEvent(state, orders)`.
  - The head start from the contact screen and the ambush, `o.edge`, becomes a free first volley:
    - positive: a volley from your guns at her weapons before turn 1;
    - negative: a volley from hers at your hull.
    - `o.shift` moves the starting band as `rangeShiftOf` does now.
  - `shipFightEvent(state, orders)` returns an event:
    - `read`: her shown move and the captain's, from `sceneSay('scene:fight', ...)`;
    - `board`: `boardSvg` plus `fightBars(state)`;
    - `text`: the last 3 log lines;
    - `choices`: one `keep` choice per ready gun, which cycles that gun's target (her weapons, drive, lock, hull, hold); a torpedo choice if a launcher is fitted and torpedoes are left; a turret choice if one is fitted; and **Fire**, also `keep` while the fight goes on.
    - On an end, Fire returns `null` and sets `G.nextEvent` to the existing outcome scene.
  - `fightBars(state)` returns an SVG string with the shields and armor bars and the part bars for each side.
  - The end mapping:

    | End | Goes to |
    | --- | --- |
    | `crippled` | `deadInSpaceScene` |
    | `broke` | the break-off: captain +1, Pirate rep -3 unless a patrol, `gainSkill(post, 3)` |
    | `standoff` | armor -5% |
    | `boarded` | `repelScene(repelStart(...))` (Part C replaces it) |
    | `lost` | the "taken" consequences from `repelSettle`, moved into a function `shipTaken(s)` that both call |
    | `escaped` | a closing line |

  - Casualties and the hand's hurt roll on a turn where your armor took more than 15% of its maximum, at `CASUALTY_ODDS` and the old `HAND_RISK.fire` (0.35).

- [ ] **Step 1: Write the failing tests:**

```js
test('battle stations opens the fight panel with both sides\' bars, her move and the captain\'s, and one order per gun', async () => {});
test('setting a gun\'s target redraws in place; Fire resolves a turn and the log gains a line', async () => {});
test('a fight played to each end lands in its scene: crippled to dead in space, boarded to the lock, lost to the taken consequences', async () => {});
test('a head start from the contact screen is a free first volley: ours at her weapons when ahead, hers at our hull when behind', async () => {});
test('a save made mid-raid in an old version loads with no fight open and no error', async () => {}); // Review Focus 5
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `js/fightui.js`, the `scene:fight` lines, and the rewiring, and remove the raid beats.
- [ ] **Step 4: Run** `node --test tests/fightui.test.js tests/engagements.test.js tests/shipcombat.test.js`. Expected: PASS once the raid-specific tests are rewritten against the fight.
- [ ] **Step 5: Rewrite `tools/fights.js`.** Its raid policies (random, post, and the rest) now pick gun targets:
  - `random`: random targets each turn;
  - `focus`: always her weapons;
  - `drive`: her drive first.

  The report is the spread of ends, rounds, hull lost, the hurt and the dead. Keep `tests/fights.test.js` passing with the new output.
- [ ] **Step 6: Update the pins.**
  - `tests/beatplay.js` drives the fight with the `focus` policy instead of the beats, then `PIN_WRITE=1 node --test tests/beatpin.test.js`. Read the diff: only the raid records change.
  - Also rewrite `scene-lines-pin` and `hired-scene-ids.json` if they move, and read their diffs.
- [ ] **Step 7: Run** `npm test` and `npm run test:editor`. Expected: PASS. Add `js/fightui.js` to the coverage floor at 90.
- [ ] **Step 8: Commit, push, and open pull request 2.**

## Part C: boarding in play (pull request 3)

### Task 6: the deck panel, in place of the lock fight

**Files:**
- Modify:
  - `js/fightui.js`: `deckFightEvent`;
  - `js/boarders.js`: `repelStart` and `assaultStart` hand off to the deck fight; `repelScene`, `repelStep` and the tactic triangle are removed;
  - `js/hiredscenes.js`: deck lines in `scene:fight`.
- Test: `tests/fightui.test.js`, `tests/boarders.test.js`

**Interfaces:**
- Consumes: Task 3, `fightStrip` (extended to draw the hand's position and the shown move), `crewOrders` and `repelCrew()`.
- Produces:
  - `deckFightEvent(state, choice)` returns an event:
    - `board`: `fightStrip` with the heads, the cover, the hand, and the shown move (marked "may feint" at a veteran grade);
    - `choices` (all `keep` until the end): stand or move to an adjacent section; shoot, steady, or cover (once a fight); one crew order; and **Fight**, which resolves the turn.
  - The ends go through the existing `repelSettle` and `assaultSettle`.
  - `repelStart(d, outcome)` and `assaultStart(foe, rate)` keep their signatures and now return the deck state, so `deadInSpaceScene` and the ship fight's `boarded` end call them unchanged.

- [ ] **Step 1: Write the failing tests:**

```js
test('being boarded opens the deck panel: heads and cover by section, the hand\'s place, their shown move', async () => {});
test('a veteran\'s shown move is marked may feint', async () => {});
test('repelled, taken, and an assault won or lost each settle through the existing outcomes', async () => {});
```

- [ ] **Step 2: Run them to see them fail.**
- [ ] **Step 3: Implement** `deckFightEvent` and the rewiring, and remove the triangle.
- [ ] **Step 4: Rewrite the repel and assault policies in `tools/fights.js`** (`random`, `shoot`, `cover`, `order`). Rewrite the boarding pins, and read the diffs.
- [ ] **Step 5: Run** `npm test` and `npm run test:editor`. Expected: PASS.
- [ ] **Step 6: Commit, push, and open pull request 3.**

## Part D: tuning and the words (pull request 4)

### Task 7: tune against the spread of ends

**Files:**
- Modify: the `FIGHT` and `DECK` constants in `js/fight.js`
- Test: `tests/fights.test.js`, plus a new assertion on the spread

- [ ] **Step 1: Read the baseline** in `docs/superpowers/plans/fights-before-turn-combat.txt`, recorded at the start of Task 5.
- [ ] **Step 2: Add a test.** `fights({ seed: 1, n: 200 })` with the `random` policy lands each raid end within 0.10 of its share in the baseline, and the repel win rate within 0.10. Expected: it fails on the starting constants, or passes.
- [ ] **Step 3: Adjust the constants** until it passes. Then check that a deliberate policy (`focus` or `drive`) beats `random` by at least 0.15 on the good ends. That gap is what makes the decisions matter.
- [ ] **Step 4: Run** `npm run soak`, since tuning touches pacing. Expected: the distribution tests pass.
- [ ] **Step 5: Commit.**

### Task 8: the words, through the voice review

**Files:**
- Modify: `js/hiredscenes.js` (`scene:fight`)

- [ ] **Step 1: Plan one line per kind of turn line** (the hit, the miss, the part out, her move shown, the captain's move), before writing, as `docs/voices/review.md` step 1 asks.
- [ ] **Step 2: Write the lines.** Run `node tools/prose-lint.js js/hiredscenes.js`.
- [ ] **Step 3: Run the review loop** in `docs/voices/review.md` (`node tools/voices.js`, a fresh rater each round) until the count settles.
- [ ] **Step 4: Rewrite the words pin**, run `npm test` and `npm run test:editor`, commit, push, and open pull request 4.
