# Fights: running costs time, and fights end decisively (#814)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** A ladder fight must be fought to be met, running from any fight costs days, and a ship fight usually ends before its turn cap.

**Architecture:** One number scales the fight's shields and armor (`FIGHT.POOL`), tuned with `tools/fights.js`. Running adds days to the burn (`RUN_DAYS`). The ladder marks a step when its fight starts. The shared move rule (`tools/answer.js`) holds torpedoes until shields are down.

**Tech Stack:** vanilla JS classic scripts, node:test, Playwright (tests/helpers.js).

**Spec:** docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md, plus the design the owner approved for #814 (2026-10-22):
- (1) A successful outrun, a successful spoof and a pay-off each add RUN_DAYS = 2 to the burn. A ladder step is met only when its fight is fought.
- (2) FIGHT.POOL (start 0.5) scales both sides' shields and armor. Real armor lost is scaled back up.
- (3) answer.js holds torpedoes until her shields are down, and uses them against a pair.
- (4) Nothing else, beyond one scene line for the time lost.

## Global Constraints
- Read CLAUDE.md first: the heartbeat file (never edit or commit it; the controller owns it), classic scripts in one global scope, new logic takes its state as parameters, no hired() forks inside hand logic, no emojis anywhere.
- Every new line of text is a scene line (js/hiredscenes.js SCENE_LINES), read by sceneSay, played in tests/sceneplay.js and pinned.
- Randomness only through the rand passed in (engine) or the game's seeded Math.random, so pins stay reproducible.
- Pins are rewritten with PIN_WRITE=1 and each diff read. Golden pages are rewritten with UPDATE_GOLDEN=1 only if they change.
- Before a commit: npm test and npm run test:editor; npm run soak when pacing or the fight changes. Startup: export CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1).
- The ship is never lost, and no fight ends the chapter.
- The owner game is unchanged in behaviour except where the shared fight code changes it (POOL applies to an owner who kept a post too).

## Review Focus
1. A burn whose intercept is run from near its end: the added days still land (arrival day, contract lateness via transitEta).
2. A ladder step run from on every burn: it keeps coming and keeps costing days. Nothing loops inside one burn.
3. Armor after a fight with POOL < 1: the real armor never goes up from a fight, and never below 1.
4. Repairs billed at the yard for armor lost in a fight still match the real loss.
5. Saves made mid-burn with an intercept planned still load and play.

---

### Task 1: Running costs time, and a ladder step is met when fought

**Files:** js/fightui.js (startShipFight flee path), js/engage.js (contactEvent: spoof and pay-off; move ladderDone out), js/fightladder.js if needed, js/hiredscenes.js (one line), tests/fightladder.test.js or tests/hired.test.js, tests/sceneplay.js, pins.

**Interfaces:**
- Produces: `RUN_DAYS = 2` (js/engage.js). `loseBurnDays(t, n)` takes the transit and the days, adds them to the burn's length so that the arrival day moves by n (check transitDays/transitNow/transitEta in js/engineering.js and transit.js for what to change), and returns n.
- A successful outrun, a successful spoof and a pay-off each call it once. The text they return gets the scene line `run.days` ("The run costs {days} days on the burn." or close, in house style), in the same scene as the contact's lines.
- `ladderDone(hired(), spec.ladder)` moves from contactEvent to startShipFight, where a fight actually starts (not on the outrun success return).

- [ ] Step 1: failing tests:
  - 'outrunning a contact adds RUN_DAYS to the burn and says so';
  - 'a spoof and a pay-off cost the same days';
  - 'a ladder step run from stays due and comes again on the next burn';
  - 'a ladder step is met when its fight starts, also after a failed run';
  - 'a contract due on the arrival day is late after a run' (Review Focus 1).
- [ ] Step 2: run; expected FAIL.
- [ ] Step 3: implement.
- [ ] Step 4: focused tests; then npm test, npm run test:editor, npm run soak (report the stakes and pacing numbers before and after).
- [ ] Step 5: commit `Fights: running costs time, and a ladder fight must be fought`.

### Task 2: Torpedoes held until her shields are down

**Files:** tools/answer.js, tests that cover it (tests/fights.test.js and the play-through tests).

**Interfaces:**
- `answerOrders` fires a torpedo at a foe only when her shields are at or under a quarter of their maximum (`TORP_SHIELDS = 0.25`, in tools/answer.js), at the foe with the least shields and armor left, for any foe type, not only one that regenerates. Otherwise the torpedo is held.

- [ ] Step 1: failing tests: 'answer holds torpedoes at full shields'; 'answer fires a torpedo once her shields are down'; 'answer fires at a pair'.
- [ ] Step 2: run; FAIL.
- [ ] Step 3: implement.
- [ ] Step 4: node --test on the changed tests; npm test.
- [ ] Step 5: commit `Fights: the answer player holds torpedoes until her shields are down`.

### Task 3: FIGHT.POOL, tuned for decisive ends

**Files:** js/fight.js (FIGHT.POOL, shipSide), js/fightui.js (the hand's armor in and out of the fight), tests/fight.test.js, tests/fights.test.js (balance), COMBAT.md (the tuned table), pins.

**Interfaces:**
- `FIGHT.POOL`: shipSide multiplies shields and armor (and their maxima) by it.
- startShipFight: the hand's fight armor is `round(st.armor * POOL)`, capped at the fight maximum.
- After the fight, the real armor goes down by `round(fight armor lost / POOL)`, floored at 1. It never rises.

- [ ] Step 1: failing tests:
  - 'shipSide scales shields and armor by FIGHT.POOL';
  - 'armor lost in a fight comes back to the ship at full scale, and a fight never repairs it' (Review Focus 3);
  - 'the yard bills the real armor lost' (Review Focus 4).
- [ ] Step 2: run; FAIL.
- [ ] Step 3: implement with POOL = 0.5.
- [ ] Step 4: tune POOL (and only POOL, unless a target cannot be met with it alone; then stop and report). Use `node tools/fights.js --seeds 1,2,3 --n 100 --ship-only`. Targets, from the spec:
  - answer beats every fixed policy against each type;
  - no fixed policy gets good ends above 70% against every type;
  - random loses 25% or more and loses real hull (report the figure);
  - fights last 5 to 8 turns on average;
  - under a third of answer's fights reach the cap.
  Rewrite tests/fights.test.js's balance test to these targets, and update COMBAT.md's table.
- [ ] Step 5: npm test, npm run test:editor, npm run soak (the hurt and early-ending limits must hold; if they do not, report, do not loosen), npm run coverage -- --check, and npm run playthrough -- --seed N --captain hester --no-video for N = 1..5. Report the ladder fights fought and the ending for each.
- [ ] Step 6: commit `Fights: a smaller pool of shields and armor, so fights end before the cap`.
