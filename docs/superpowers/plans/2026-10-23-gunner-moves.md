# Gunner Moves Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three once-a-fight gunner moves (vent the guns, lead the shot, split the turret), taught to the hired hand by the crew.

**Architecture:** The moves are data and rules in the pure engine (js/fight.js), offered on the fight panel (js/fightui.js) from what the
hand knows (`career().moves`), and taught by a downtime activity on a burn (a new js/gunnermoves.js). The shared move rule
(tools/answer.js) learns to use them, so the fight tool, the play-through and the soak measure them.

**Tech Stack:** vanilla JS classic scripts, node:test, Playwright (tests/helpers.js), tests/nodecontext.js for the pure engine.

**Spec:** docs/superpowers/specs/2026-10-23-gunner-moves-design.md

## Global Constraints
- Read CLAUDE.md first:
  - the heartbeat file (the controller owns it; never edit or commit it);
  - classic scripts in one global scope (a new file goes in index.html and editor.js `SCRIPTS`; tests/globals.test.js);
  - new logic takes its state as parameters;
  - no `hired()` fork inside the hand's logic (a gate at the edge);
  - no emojis anywhere.
- The engine stays pure: randomness only through the `rand` passed in. The panel and scenes use the game's seeded Math.random.
- Every new line of text is a scene line (js/hiredscenes.js SCENE_LINES), read by sceneSay, played in tests/sceneplay.js and pinned. Lines follow docs/prose-style.md and docs/voices/.
- Pins are rewritten with PIN_WRITE=1 and each diff read.
- Before a commit: `npm test`, plus `npm run test:editor` when scenes or previews change, and `npm run soak` when the fight's balance or the chapter's pacing changes.
- Startup: `export CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1)`.
- Moves are a hired hand's only. The owner game is parked: no move is offered to an owner (a gate at the edge).
- Move ids, exactly: `vent`, `lead`, `split`. Teachers: `vent` the engineer post, `lead` the pilot post, `split` the first officer (role `xo`). Gunner level to be taught: `vent` 1, `lead` 1, `split` 2. Trust: `OPINION.TRUSTED`.

## Review Focus
1. A move ordered on a turn its condition cannot apply (vent with no heat, lead with no aimed shot, split with no turret held): it is spent or not? Expected: it is not spent and changes nothing (Task 1 tests it).
2. A hand who buys the ship: the moves are kept (`careerOf` copies them; Task 2 tests it).
3. A save from before (no `career().moves`): no move is offered and nothing throws (Tasks 2 and 4 test it).
4. The teacher is hurt, or off the ship, or the post is held by someone else: no teaching from them; teaching resumes when they are back (Task 4 tests it).
5. Two foes (a pair) and `lead`: it applies to the one gun named, at whichever foe that gun aims (Task 1 tests it).

---

### Task 1: The moves in the engine

**Files:**
- Modify: `js/fight.js` (`FIGHT_MOVES`, `shipFight`, `resolveShipTurn`, `shotMult`)
- Test: `tests/fight.test.js`

**Interfaces:**
- Produces:
  - `FIGHT_MOVES = { vent: {...}, lead: {...}, split: {...} }`, data with one comment each.
  - Orders gain `move: 'vent' | 'lead' | 'split'`, with `lead` also `gun: <index>`.
  - `shipFight(...)` adds `spent: []`.
  - `resolveShipTurn(state, orders, moves, rand, known = [])`: `known` is the move ids the hand knows. A move is applied only when known, not in `state.spent` and its condition holds; then its id goes into the returned `state.spent` and an event `{ who: 'me', move: id }` is pushed.
  - `canUse(st, orders, id, known) -> boolean`, exported for the panel and the move rule.
- Rules:
  - `vent`: applies when `st.heat > 0 || st.locked.length`. Before the shots are chosen, heat is 0 and nothing is locked, so `gunsReady` counts every gun.
  - `lead`: applies when the named gun's order is ready and its part is aimed (`AIMED.includes(part)`). That shot's `shotMult` uses an aim factor of 1.
  - `split`: applies when the turret is held (`orders.pdc === 'hold'`). The held turret takes nothing off the shots this turn, and her volley and salvo cut stay as they are.

- [ ] **Step 1: Write the failing tests** in `tests/fight.test.js` (plain Node, as the file's others):
  - `'vent clears the heat and unlocks the guns, once a fight'`: a state at heat 5, gun 0 locked, `known: ['vent']`. All guns fire. `state.heat` after equals `0` plus that turn's shots less `HEAT_VENT`. `spent` is `['vent']`. A second vent order the next turn changes nothing.
  - `'lead takes no range penalty on one aimed shot'`: at band 'long', an aimed gun with `lead` hits at `shotMult` with an aim factor of 1, and the other gun keeps `AIM_MULT.long`.
  - `'split holds the turret back and still fires it'`: with `pdc: 'hold'` and `split`, the shots count is `gunsReady` (not one less), and her volley is cut by `PDC_HOLD` as before.
  - `'a move not known, already spent, or with nothing to act on is ignored and not spent'` (Review Focus 1).
  - `'lead on a pair applies to the named gun only'` (Review Focus 5).
- [ ] **Step 2: Run** `node --test tests/fight.test.js`. Expected FAIL (`FIGHT_MOVES` undefined).
- [ ] **Step 3: Implement** in `js/fight.js` as the Interfaces say. `known` defaults to `[]`, so every existing caller is unchanged.
- [ ] **Step 4: Run** `node --test tests/fight.test.js tests/globals.test.js`, then `npm test`. Expected PASS (no balance change: no caller passes `known`).
- [ ] **Step 5: Commit** `Fights: three gunner moves in the engine, once a fight`.

### Task 2: The moves on the fight panel

**Files:**
- Modify: `js/fightui.js` (`startShipFight` passes the known moves; `shipFightEvent` shows the move orders; the turn passes `known` to `resolveShipTurn`), `js/sheet.js` (`careerOf` copies `moves`), `js/hiredscenes.js` (`scene:fight` lines), `tests/sceneplay.js`, pins
- Test: `tests/fightui.test.js`

**Interfaces:**
- Consumes: Task 1's `FIGHT_MOVES`, `canUse`, `resolveShipTurn(..., known)`, `state.spent`.
- Produces:
  - `s.known`, set in `startShipFight` from `knownMoves(career())` and passed to every `resolveShipTurn` of that fight.
  - `knownMoves(c) -> string[]`, pure, in js/fightui.js: `(c && c.moves) || []`. Empty for an owner (`!hired()`, checked by the caller), a post other than gunner, or a save without `moves`.
  - The panel's order for each known move:
    - labels `move.vent`, `move.lead` (with `{n}` for the gun) and `move.split`, each showing its effect before Fire as the spec says;
    - `move.spent` for a spent one;
    - `move.used.<id>` for the log line.

- [ ] **Step 1: Write the failing tests** in `tests/fightui.test.js`:
  - `'a known move shows on the panel, applies on Fire, and shows spent after'`: a hand at gunner with `moves: ['vent']`, a locked gun.
  - `'no move is offered to a hand who knows none, to a non-gunner, or on a save without moves'` (Review Focus 3).
  - `'a hand who buys the ship keeps the moves'` (Review Focus 2): `careerOf` copies `moves`.
- [ ] **Step 2: Run** them. Expected FAIL.
- [ ] **Step 3: Implement.** Add the lines to `scene:fight` in js/hiredscenes.js, and a play of each in tests/sceneplay.js. Draft them plain, in the house style.
- [ ] **Step 4: Run** `node --test tests/fightui.test.js tests/scenelines.test.js`, rewrite the pins with PIN_WRITE=1 and read the diffs, then `npm test` and `npm run test:editor`. Expected PASS.
- [ ] **Step 5: Commit** `Fights: the gunner moves on the panel`.

### Task 3: The move rule and the fight tool use the moves

**Files:**
- Modify: `tools/answer.js` (`answerOrders`), `tools/fights.js` (`--moves`)
- Test: `tests/fights.test.js`

**Interfaces:**
- Consumes: Task 1's `canUse`, the `move` order, and `s.known` (the moves the panel's fight was started with, set by Task 2 in `startShipFight`).
- Produces:
  - `answerOrders` sets `move` at most once a turn, in this order:
    - `split` when she fires a salvo this turn;
    - `vent` when a gun is locked and the move would fire it;
    - `lead` when it aims a gun at a part (lock, drive, launcher) at band 'long' or 'mid'.
  - `tools/fights.js --moves` gives the hand all three moves; without it, none (today's numbers).

- [ ] **Step 1: Write the failing tests** in `tests/fights.test.js`:
  - `'answer splits the turret on a salvo turn, vents a locked gun, and leads an aimed shot at range'`;
  - `'answer never orders a move the hand does not know'`.
- [ ] **Step 2: Run** them. Expected FAIL.
- [ ] **Step 3: Implement.** Keep `answerOrders` self-contained: it is passed to the page as source text.
- [ ] **Step 4: Run** `node --test tests/fights.test.js` and `npm test`. Then `node tools/fights.js --seeds 1,2,3 --n 100 --ship-only` with and without `--moves`, and write both tables (per type, answer and random) into the report. No tuning in this task.
- [ ] **Step 5: Commit** `Fights: the move rule uses the gunner moves`. PR 1 ends here.

### Task 4: The crew teach the moves

**Files:**
- Create: `js/gunnermoves.js` (loaded after js/shiplife.js and js/hired.js, before js/game.js, in index.html and editor.js `SCRIPTS`)
- Modify: `js/hiredscenes.js` (a `scene:gunner-moves` entry in the scene index and its lines), `editor.js` (its preview), `tests/sceneplay.js`, pins, `tools/soak.js` if it does not already pick downtime activities as the game does
- Test: `tests/gunnermoves.test.js` (the due rule in plain Node via tests/nodecontext.js, the activity in a page)

**Interfaces:**
- Produces:
  - `MOVE_TEACH = { vent: { post: 'engineer', level: 1 }, lead: { post: 'pilot', level: 1 }, split: { role: 'xo', level: 2 } }`.
  - `moveDue(c, gunnerLevel, teacher, opinionOf) -> id | null`, pure: the first id in `vent`, `lead`, `split` order that is due.
    - Due means: `c.post === 'gunner'`, `gunnerLevel >= level`, the id is not in `c.moves`, `teacher(id)` gives a person, and `opinionOf(that person) >= OPINION.TRUSTED`.
    - The caller passes `teacher` as `id => post ? postHolder(post) : roleHolder('xo')`. These are the helpers in js/stations.js and js/crew.js, and they leave the injured out.
  - `ACTIVITIES.teach`: a hired-only downtime activity.
    - `can()` is `!!moveDue(...)`.
    - Its label names the teacher and the move (`scene:gunner-moves` `<id>.label`).
    - `run()` adds the id to `career().moves`, calls `gainSkill('gunner', 2)`, and returns the teacher's scene line (`<id>.text`).
    - Not taking it on a burn is declining: it is offered again on a later burn.
- The two lines for each of the three moves (label and text) are drafted for the owner to edit, two to four sentences of text, in the teacher's voice (docs/voices/).

- [ ] **Step 1: Write the failing tests** in `tests/gunnermoves.test.js`:
  - `'moves are due in order, each at its level and the teacher's trust'`;
  - `'a hurt, missing or untrusting teacher teaches nothing, and a move already known is not offered again'` (Review Focus 4);
  - `'a save without moves is offered the first move and nothing throws'` (Review Focus 3);
  - `'the activity teaches the move and a few gunner points, and a burn without it leaves it due'`;
  - `'no move is taught to an owner or a non-gunner'`.
- [ ] **Step 2: Run** them. Expected FAIL.
- [ ] **Step 3: Implement.** Draft the lines, run `npm run voices` on them and fix what it flags, add the preview and the sceneplay plays.
- [ ] **Step 4: Run** `node --test tests/gunnermoves.test.js tests/globals.test.js tests/scenelines.test.js`. Rewrite the pins and read the diffs. Then `npm test`, `npm run test:editor` and `npm run soak` (report the stakes numbers).
- [ ] **Step 5: Commit** `Moves: the crew teach the gunner's moves, drafted`.

### Task 5: Balance

**Files:**
- Modify: `js/gunnermoves.js` (`MOVE_TEACH` levels only, if needed), `tests/fights.test.js` (balance asserts with moves), `COMBAT.md` (the moves and their measured effect)
- Test: `tests/fights.test.js`, `tests/distribution/stakes.test.js`

**Interfaces:**
- Consumes: Tasks 1-4.

- [ ] **Step 1: Write the failing test**: `'with the moves, each helps against its type, no fixed plan beats reading her move, and random play still loses a quarter'`. Run the fight tool with `--moves` against the spec's targets:
  - split against the corsair, lead against the raider pair and vent against the cutter: `answer` good ends with moves above without;
  - no fixed policy with moves above `answer` against any type;
  - random with moves losing 25% or more.
- [ ] **Step 2: Run** it, and the soak. If a target fails, change only `MOVE_TEACH` (the spec's first lever). If that is not enough, stop and report the numbers.
- [ ] **Step 3: Run** `npm test`, `npm run test:editor` and `npm run soak` (the stakes limits must hold), and `npm run playthrough -- --seed N --captain hester --no-video` for N = 1..5. Report for each seed which moves were learned, on which day, and how often each was used.
- [ ] **Step 4: Update** COMBAT.md with the moves and the measured numbers.
- [ ] **Step 5: Commit** `Moves: measured, and the teaching gates set`. PR 2 ends here.
