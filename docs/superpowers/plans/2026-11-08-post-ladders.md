# Post Ladders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Five levels at every post with a pick at each, the ship's crew perks read from the hand's level, and the gunner's moves folded into the picks (#963).

**Architecture:** A pure pick table and its rules in `js/picks.js` (node-testable), read by the one check rule (`handCheck` adds a pick's edge beside the kit's) and by named hooks (`hasPerk`). Moves stay in the ship fight engine (`FIGHT_MOVES`, `resolveShipTurn`) and are taught by `js/moves.js`, which replaces `js/gunnermoves.js`. The Ladder card on the sheet console is the one place a pick is taken.

**Tech Stack:** Vanilla JS classic scripts; node tests through `tests/nodecontext.js`; browser tests through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-11-08-post-ladders-design.md`

## Global Constraints

- No emojis anywhere. Desktop only. Build what the spec names, nothing more.
- Classic scripts, one global scope: new files linked in `index.html`; top-level names unique (`tests/globals.test.js`); nothing new on `G` (`tests/gfields.test.js`).
- `career().picks` and `career().moves` are lazy fields on the hand's record, carried through the buy by `careerOf`; no save is rewritten.
- One rule for every roll: a pick adds an edge, a move or a stat to `check`, never a second rule.
- Owner game parked: the Ladder card, the pick action and the teaching are gated at the edge with `if (!hired())`.
- The words of every label and line are the owner's to edit; the plan's strings are first drafts.
- Commit after each task; `npm run test:changed` before each commit; the full suite before the push.
- Heartbeat: update `.claude/heartbeat.json` at each step; never commit it.

## Review Focus

1. A save from before: no `picks`, no `moves`, points at level 2 or 3 at a post. The Ladder card must show those rungs as picks waiting, not crash or auto-pick (Task 3 tests a career with `skill` and no `picks`).
2. A hand hurt (`handHurt()`) works a level lower: a pick must not be offered for a rung the hurt level has not reached, and a pick already taken stays (Task 1 tests `pickDue` with the lowered level).
3. A move pick taken whose teacher then dies or leaves: the pick stays taken and "being learned" for the run; the Ladder says so and nothing else is offered on that rung (Task 4 tests a missing teacher).
4. `roleSkill` reading the hand: the hand swaps post mid-chapter, or an NPC takes the hand's post; the ship's perk must follow the chair, not the hand (Task 2 tests both).
5. Two moves in one turn are not possible: `orders.move` is one id; the panel must not let a second toggle on (Task 5 tests `moveChoices` with two known moves).

---

### Task 1: The pick table, its rules and the longer ladder

**Files:**
- Create: `js/picks.js`
- Modify: `js/hired.js:52` (`SKILL_STEPS`), `:62-77` (`gainSkill`, `levelNote`), `js/sheet.js:43` (`careerOf` carries `picks` and `moves`), `index.html` (link `js/picks.js` after `js/sheet.js`)
- Test: `tests/picks.test.js` (new), `tests/hired.test.js`

**Interfaces:**
- Produces, `js/picks.js`: `PICKS` (object by id, 40 entries, each `{ id, post, level, kind, name, text, adds?, perk?, stat?, move?, teacher? }` exactly as the spec's table, `kind` one of `move`, `edge`, `perk`, `stat`); `PICK_LEVELS = 5`; `picksFor(post, level)` (the two at that rung, table order); `takenPicks(c)` (`(c && c.picks) || []`); `pickDue(c, level)` (the lowest rung from 1 to `level` at `c.post` with no taken pick, else 0); `pickOpen(pick, c, { teacher, opinionOf })` (true, or a string: a move whose `teacher` is set needs `teacher(pick)` truthy with `opinionOf(person) >= OPINION.TRUSTED`, else `"${name} is not aboard to show you"` or `"${name} does not trust you with it yet"`; a stat at `STAT_MAX` is `"${Stat} is as sharp as it gets"`); `takePick(c, id)` (pushes to `c.picks`, moves `c.sheet[stat]` by one for a stat pick, and for a move with no `teacher` pushes `pick.move` to `c.moves`; returns the pick; a second pick on a rung already taken returns null and changes nothing); `pickEdge(picks, kind)` (sum of `adds[kind]`); `hasPerk(picks, id)` (a taken pick with `perk === id`).
- Produces, `js/hired.js`: `SKILL_STEPS = [0, 12, 45, 110, 220, 400]`; `levelNote` ends with `" A pick waits on your page."` when `pickDue(career(), skillStep(points))` is not 0.
- `careerOf(h)` copies `picks: [...(h.picks || [])]` and `moves: [...(h.moves || [])]`.

- [ ] **Step 1: Write the failing node tests** (`tests/picks.test.js`, loading `['js/data.js', 'js/util.js', 'js/sheet.js', 'js/picks.js']` with `OPINION: { TRUSTED: 3 }`)

```js
test('the table has two picks at each of five levels at each post, with unique ids and sound kinds', () => {
  for (const post of ['gunner', 'pilot', 'engineer', 'comms']) for (let l = 1; l <= 5; l++) {
    const two = picksFor(post, l); assert.equal(two.length, 2, `${post} ${l}`);
    for (const p of two) { assert.ok(['move', 'edge', 'perk', 'stat'].includes(p.kind)); if (p.kind === 'edge') assert.ok(Object.keys(p.adds).every(k => k in DIFFICULTY)); if (p.kind === 'stat') assert.ok(STATS.includes(p.stat)); if (p.kind === 'move') assert.equal(typeof p.move, 'string'); }
  }
  const ids = Object.keys(PICKS); assert.equal(ids.length, 40); assert.equal(new Set(ids).size, 40);
});
test('a rung is due once its level is reached and until one of its picks is taken; a hurt level offers less', () => {
  const c = { post: 'gunner', sheet: { hands: 3, eye: 4, nerve: 3, wit: 4 }, picks: [] };
  assert.equal(pickDue(c, 0), 0); assert.equal(pickDue(c, 2), 1);
  takePick(c, 'steady-eye'); assert.equal(pickDue(c, 2), 2); assert.equal(pickDue(c, 1), 0, 'a hurt hand at level 1 has no rung waiting');
  assert.equal(takePick(c, 'vent'), null, 'one pick a rung'); assert.deepEqual([...c.picks], ['steady-eye']);
});
test('a move with a teacher needs the teacher aboard and trusting; one without is known when taken; a stat at the max is shut', () => {
  const c = { post: 'gunner', sheet: { hands: 3, eye: 5, nerve: 3, wit: 4 }, picks: [], moves: [] };
  const vent = PICKS.vent, none = { teacher: () => null }, cold = { teacher: () => ({ id: 'tomas' }), opinionOf: () => 1 }, warm = { teacher: () => ({ id: 'tomas' }), opinionOf: () => 3 };
  assert.match(pickOpen(vent, c, none), /not aboard/); assert.match(pickOpen(vent, c, cold), /does not trust/); assert.equal(pickOpen(vent, c, warm), true);
  takePick(c, 'called-shot'); assert.ok(c.moves.includes('called-shot'), 'no teacher: known when taken');
  takePick(c, 'vent'); assert.ok(!c.moves.includes('vent'), 'taught: not known until the scene');
  assert.match(pickOpen(PICKS.eye, c, warm), /as sharp as it gets/); takePick({ ...c, picks: [] , sheet: { ...c.sheet, eye: 4 } }, 'eye');
});
test('a stat pick moves the sheet, an edge adds to its kind, a perk is read by id', () => {
  const c = { post: 'pilot', sheet: { hands: 3, eye: 3, nerve: 4, wit: 3 }, picks: [] };
  takePick(c, 'nerve'); assert.equal(c.sheet.nerve, 5);
  takePick(c, 'cool-hand'); assert.equal(pickEdge(c.picks, 'solo'), 0.05); assert.equal(pickEdge(c.picks, 'job'), 0);
  takePick(c, 'trim'); assert.equal(hasPerk(c.picks, 'trim'), true); assert.equal(hasPerk(c.picks, 'long-legs'), false);
});
```

`tests/hired.test.js`: `SKILL_STEPS` has six steps ending in 400, and `levelNote` for a hand whose post reaches level 1 with no pick ends with "A pick waits on your page." (stub `UI.notes`).

- [ ] **Step 2: Run them and see them fail**

Run: `node --test tests/picks.test.js`
Expected: FAIL, `PICKS is not defined`.

- [ ] **Step 3: Write `js/picks.js`, extend the ladder, carry the fields**

The table is the spec's, id for id. `takePick` takes `career()`-shaped objects only (it reads `post`, `sheet`, `picks`, `moves`).

- [ ] **Step 4: Run the tests**

Run: `node --test tests/picks.test.js tests/sheet.test.js tests/globals.test.js` then `CHROMIUM_PATH=... node --test tests/hired.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/picks.js js/hired.js js/sheet.js index.html tests/picks.test.js tests/hired.test.js
git commit -m "Post ladders: five levels, the pick table and its rules (#963)"
```

---

### Task 2: The ship's perk is the hand's, and a pick's edge is in every roll

**Files:**
- Modify: `js/crew.js:17` (`roleSkill`), `js/hired.js:81` (`handCheck` adds `pickEdge`)
- Test: `tests/hired.test.js`, `tests/sheet.test.js`

**Interfaces:**
- `roleSkill(role)`: when `hired()` and `POSTS[hired().post].role === role` and `postMode(hired().post) === 'manual'`, returns `skillLevel(hired().post)` (the mood rule does not apply to the hand); else as now. The spoofer's floor stays.
- `handCheck(stat, skill, kind, edge = 0)` adds `pickEdge(takenPicks(career()), kind)` beside `kitEdge`.

- [ ] **Step 1: Write the failing browser tests** (`tests/hired.test.js`)

```js
test('the ship\'s perk at the hand\'s post is the hand\'s level when nobody else holds it, and the holder\'s when someone does', async () => {
  // a gunner hand at level 2 (career().skill.gunner = 45): roleSkill('gunner') === 2 and playerGuns() === ship().guns + 1;
  // with an NPC gunner of skill 3 in the chair (postMode crewed): roleSkill('gunner') === 3;
  // after askSwap to pilot with Ines at the helm: roleSkill('gunner') === 0 and roleSkill('pilot') === Ines's skill.
});
test('a taken edge pick moves the hand\'s rolls of its kind and no other', async () => {
  // takePick(career(), 'steady-eye'): postOdds('gunner') is 0.05 higher than before, soloOdds('gunner') unchanged.
});
```

- [ ] **Step 2: Run and see them fail**

Run: `CHROMIUM_PATH=... node --test --test-name-pattern="ship's perk|edge pick" tests/hired.test.js`
Expected: FAIL (`roleSkill('gunner')` is 0 for the hand; the odds do not move).

- [ ] **Step 3: Implement, then run `tests/hired.test.js`, `tests/sheet.test.js`, `tests/crew.test.js`**

Expected: PASS. The pins that play a hand at a post may move where `roleSkill` now reads the hand (the extra gun, the boarding odds, the burn's days): run `npm run test:changed`, and for each pin that fails, `PIN_WRITE=1` it and read the diff; only figures the perk touches may move.

- [ ] **Step 4: Commit**

```bash
git add js/crew.js js/hired.js tests/hired.test.js tests/fixtures
git commit -m "The ship's perk at the hand's post is the hand's, and a pick's edge is in every roll (#963)"
```

---

### Task 3: The Ladder card and taking a pick

**Files:**
- Modify: `js/character.js:47-62` (a `ladderCard()` beside `statsCard()`, in the hand's own page), `js/hired.js` (`Mods.action('pick', id)` in the hired module's `init`)
- Create: `tests/ladder.test.js`, `tests/fixtures/ladder.html`

**Interfaces:**
- `ladderHtml(c, level, open)` (pure, `js/picks.js`, on the `h` helpers): the post's five rungs as `.con-part` rows: a done rung names its pick (`Level n: Steady eye`), the due rung shows its two picks each as `<button data-action="pick" data-arg="id">Take</button>` with the pick's `name` and `text`, disabled with the reason as `.rail-why` text when `open(pick)` is a string, and the rungs beyond greyed with both names; a rung reached and not picked carries the eyebrow `A pick waits`. A move pick taken and not yet in `c.moves` reads `being learned`.
- `ladderCard()` (`js/character.js`): `conCard('Ladder', ladderHtml(career(), skillLevel(career().post), p => pickOpen(p, career(), { teacher: moveTeacher, opinionOf: x => x.opinion || 0 })))`, drawn for a hired hand only.
- `Mods.action('pick', id)`: `if (!hired() || G.mode !== 'landed' || G.dialog) return;` then `takePick(career(), id)` and `UI.render()`.

- [ ] **Step 1: Write the failing browser test** (`tests/ladder.test.js`): open the hand's page (`G.viewPerson = 'you'; UI.tab = 'person'; UI.render()`) at level 0 (no rung due, five greyed rungs); set `career().skill.gunner = 45` (level 2) and render: rung 1 carries "A pick waits" and two Take buttons, rung 2 waits behind it; `Mods.act('pick', 'steady-eye')`: rung 1 names Steady eye and rung 2's buttons appear; `Mods.act('pick', 'vent')` with Tomas's opinion below 3: the button was disabled and nothing was taken; the action in a burn (`G.mode = 'transit'`) takes nothing. The golden: the markup at level 2 with one pick taken equals `tests/fixtures/ladder.html` (write it on the first green run, `UPDATE_GOLDEN=1` thereafter).

- [ ] **Step 2: Run and see it fail**; **Step 3: implement**; **Step 4: run `tests/ladder.test.js tests/views.test.js tests/shell.test.js`**, Expected PASS.

- [ ] **Step 5: Commit**

```bash
git add js/picks.js js/character.js js/hired.js tests/ladder.test.js tests/fixtures/ladder.html
git commit -m "The Ladder card: a pick is taken at the port on your own page (#963)"
```

---

### Task 4: Teaching reads the picks (`js/moves.js`)

**Files:**
- Rename: `js/gunnermoves.js` to `js/moves.js`; `tests/gunnermoves.test.js` to `tests/moves.test.js`; `index.html`; `tools/coverage-floor.json` if it names the file
- Modify: `js/moves.js` (`MOVE_TEACH` derived from `PICKS`; `moveDue`), `js/hiredscenes.js` (three new teaching lines under `scene:gunner-moves`, renamed `scene:moves`, with the scene registry entry and `tests/fixtures/hired-scene-ids.json` updated by `PIN_WRITE=1`)

**Interfaces:**
- `MOVE_TEACH`: built from the picks with `kind === 'move'` and a `teacher`: `{ [pick.move]: { ...pick.teacher, level: pick.level } }` (vent: engineer 1, lead: pilot 1, split: role xo 2, redline: engineer 5, hot-start: pilot 3, parley: role xo 5).
- `moveDue(c, teacher, opinionOf)`: the first taken move pick (table order) whose move is in `MOVE_TEACH`, not in `c.moves`, and whose teacher trusts the hand. The level is already proven by the pick, so it takes no level.
- `ACTIVITIES.teach` as now, for any post (the gate `c.post !== 'gunner'` goes; the pick carries the post); teaching gives `gainSkill(c.post, 2)`.
- Lines: `redline.label`, `redline.text`, `hot-start.label`, `hot-start.text`, `parley.label`, `parley.text` beside the three, first drafts in the voice of `docs/bible/voice.md`.

- [ ] **Step 1: Move the test file and rewrite its first test as the failing one**: `moveDue` returns null with no picks; with `picks: ['vent']` and a trusting engineer returns `vent`; with `picks: ['vent', 'redline']` and vent known returns `redline` only when the engineer trusts; a pilot hand with `picks: ['hot-start']` is taught by the pilot's holder.
- [ ] **Step 2: Run and see it fail**: `node --test tests/moves.test.js`, FAIL (`moveDue` signature).
- [ ] **Step 3: Implement**; **Step 4: run `tests/moves.test.js tests/hiredscenes.test.js tests/scenechoices.test.js tests/globals.test.js`**, Expected PASS; `PIN_WRITE=1 node --test tests/hiredscenes.test.js` for the new ids, diff read.
- [ ] **Step 5: Commit**

```bash
git add js/moves.js index.html tests/moves.test.js js/hiredscenes.js tests/fixtures/hired-scene-ids.json tools/coverage-floor.json
git rm js/gunnermoves.js tests/gunnermoves.test.js
git commit -m "Teaching reads the picks: six taught moves, for any post (#963)"
```

---

### Task 5: Eight new ship-fight moves

**Files:**
- Modify: `js/fight.js:45-70` (`FIGHT_MOVES`, `canUse`), `:109-160` (`resolveShipTurn`), `:198-209` (`nextBand`), `js/fightui.js:178-205` (`moveChoices`), the `fightSay` lines (`move.name.*`, `move.*`) in `js/fightui.js`, `COMBAT.md` (one line each under the ship fight)
- Test: `tests/fight.test.js`

**Interfaces:**
- `FIGHT_MOVES` gains `'called-shot'`, `'break-intercept'`, `redline`, `patch`, `'hot-start'`, `bypass`, `spoof`, `parley`.
- `canUse(st, orders, id, known)`: `called-shot` needs a ready gun with an order (`orders.gun` names it); `break-intercept` needs `st.me.parts.drive.hp > 0` and `st.band < RANGE_BANDS.length`; `redline` needs the band `long` and a drive; `patch` needs `st.me.armor < st.me.maxArmor`; `hot-start` needs a shot this turn; `bypass` needs `st.me.parts.drive.hp < FIGHT.PART_HP.drive`; `spoof` needs a foe up; `parley` needs the band `mid` or `long` and a foe up.
- `resolveShipTurn(state, orders, moves, rand, known, roll = () => true)`: `called-shot` makes the named gun's shot `lead`-like (no aim penalty) and rolls `FIGHT.GUN_DMG[1]`; `break-intercept` sets `moves.captain = { kind: 'open' }` and `nextBand` takes `meVote` over her speed this turn (a flag on `st`, `forceOpen`, read once); `redline` sets `st.band = RANGE_BANDS.length`; `patch` adds `Math.round(st.me.maxArmor * 0.1)` to `st.me.armor`, capped; `hot-start` sets `over` on every shot this turn and counts each shot's heat as 1; `bypass` sets `st.me.parts.drive.hp = FIGHT.PART_HP.drive`; `spoof` skips every foe's `salvo` and volley damage this turn (arming still happens); `parley` calls `roll()` and, landed, sets every up foe's move to `{ kind: 'break' }` so `shipEnd` reads `broke`. Each pushes `{ who: 'me', move }` to `events`.
- `moveChoices`: a label per move (`move.called-shot` names the gun as lead does; the rest are toggles as `vent`); `orders.move` stays one id.
- `fightui.js` passes `roll` for parley: `() => Math.random() < handCheck('wit', skillLevel('comms'), 'post')`.

- [ ] **Step 1: Write the failing node tests** (`tests/fight.test.js`): one per move, each building a state with `shipFight(...)` and asserting `canUse` false then true, and the effect in `resolveShipTurn`'s returned state (band, armor, drive hp, foe damage absent under spoof, `broke` under parley with `roll: () => true` and not with `() => false`, the called shot's damage equal to `GUN_DMG[1]` times the band multiplier).
- [ ] **Step 2: Run and see them fail**: `node --test tests/fight.test.js`, FAIL.
- [ ] **Step 3: Implement**; **Step 4: run `node --test tests/fight.test.js` then `CHROMIUM_PATH=... node --test tests/fightui.test.js tests/combat.test.js tests/shipcombat.test.js`**, Expected PASS; then `node tools/fights.js --seeds 1,2,3 --n 100 --moves` and `--moves called-shot,patch,spoof,parley`: the answer's good ends stay at or above the targets in `COMBAT.md`; write the figures into `COMBAT.md`'s measured section.
- [ ] **Step 5: Commit**

```bash
git add js/fight.js js/fightui.js js/fightui.js COMBAT.md tests/fight.test.js
git commit -m "Eight new ship-fight moves, once a fight each (#963)"
```


---

### Task 6: The perks in the fights and at the contact

**Files:**
- Modify: `js/fight.js` (`PDC_HOLD` read from `st.me.pdcHold` when set), `js/fightui.js:36` (marksman: `+ (hasPerk(...,'marksman') ? 1 : 0)` beside the boresight; `pdcHold: hasPerk(..., 'pd-watch') ? 0.5 : FIGHT.PDC_HOLD` on `me`), `:19` (`fleeOdds` + 0.1 under brace), `js/engage.js` (lane-sense: the range at contact + 10 km for the hand's ship), `js/handtohand.js:10,83` (cover-eye: the hand's cover ability makes 3; `COVER_MADE` becomes a parameter the hand's call passes)
- Test: `tests/fight.test.js`, `tests/fightui.test.js`, `tests/handtohand.test.js`, `tests/engage.test.js` or `tests/range.test.js`

- [ ] **Step 1: Write the failing tests**, one per perk, each asserting the figure with the pick taken and without: a held turret's cut is 0.5 with pd-watch; `shipSide(me).skill` is one higher with marksman; `fleeOdds()` is 0.1 higher with brace; the range at contact is 10 km farther with lane-sense; the hand's cover ability makes 3 with cover-eye and 2 without.
- [ ] **Step 2: Run and see them fail**; **Step 3: implement**; **Step 4: run the four test files**, Expected PASS.
- [ ] **Step 5: Commit**

```bash
git add js/fight.js js/fightui.js js/engage.js js/handtohand.js js/boarders.js tests
git commit -m "The fight and contact perks: pd-watch, marksman, brace, lane-sense, cover-eye (#963)"
```

---

### Task 7: The perks on the ship and in port

**Files:**
- Modify: `js/orbits.js:24-26` (trim: `burnFuel` times 0.95; long-legs: `travelDays` times 0.95, both when the hand holds the pilot post, read through a `handPerk(id)` in `js/hired.js` that is `hasPerk(takenPicks(career()), id)` and false with no hand), `js/engineering.js:56` (cool-loop: +5), `js/icerun.js` (soft-hands in `iceStep`: a lost roll at stage 0 by the pilot's choice costs no hull; melt-return in `iceHome`: `st.fuel = Math.min(ship().fuel, st.fuel + 20)` with a line), `js/wear.js` (hear-it-coming: when a part's condition crosses `BREAKDOWN_BELOW` a log line names it), `js/repairs.js:11` (yard-eye: the estimate times 0.9), `js/transit.js:120` (long-ear: `days + 7`), `js/contracts.js:115` (fair-copy: `LATE_DOCK / 2`), `:33` (clear-copy: `skimOf` returns 0), `:99` (open-board: `boardStanding` as for the kit's board, for every shipper at standing 1)
- Test: `tests/orbits.test.js`, `tests/icerun.test.js`, `tests/contracts.test.js`, `tests/stay.test.js` or `tests/repairs.test.js`, `tests/wear.test.js`, a browser test for long-ear and cool-loop in `tests/hired.test.js`

**Interfaces:**
- `handPerk(id)` (`js/hired.js`): the one reader every hook calls; node tests stub it.
- `orbits.js` reads `handPerk` only when it exists (`typeof handPerk === 'function'`), since the orbit tests load it without `hired.js`.

- [ ] **Step 1: Write the failing tests**, one per perk, each with `handPerk` stubbed true and false and the figure asserted: `burnFuel` and `travelDays` five percent less; `heatLimit()` 5 more; a lost pilot approach costs no hull; `iceHome` adds 20 mass; the wear log names the part; `repairPlan(planet).cost` a tenth less; a rumor's `until` 7 days later; `latePay` docks half; `skimOf` is 0; `boardStanding(1, shipper, [])` is `STANDING_GOOD`.
- [ ] **Step 2: Run and see them fail**; **Step 3: implement**; **Step 4: run the named test files**, Expected PASS.
- [ ] **Step 5: Commit**

```bash
git add js/hired.js js/orbits.js js/engineering.js js/icerun.js js/wear.js js/repairs.js js/transit.js js/contracts.js tests
git commit -m "The ship and port perks: trim, long-legs, cool-loop, soft-hands, melt-return, hear-it-coming, yard-eye, long-ear, fair-copy, clear-copy, open-board (#963)"
```

---

### Task 8: The whole suite, the fights, the floor and the docs

- [ ] **Step 1:** `npm run test:changed`, then the full suite with the headless shell. Every pin that moved: `PIN_WRITE=1`, diff read, only the figures a perk or the ship's perk touches.
- [ ] **Step 2:** `npm run coverage -- --check` with `js/picks.js` and `js/moves.js` in `tools/coverage-floor.json`'s globs (and `js/gunnermoves.js` removed).
- [ ] **Step 3:** `node --test tests/distribution/fights.test.js` and `tests/distribution/pacing.test.js`: the targets hold, or the figures go to the owner.
- [ ] **Step 4:** Docs: the spec's status line (built, the date); `ROADMAP.md`'s Progression entry says the first piece is done; `COMBAT.md`'s measured section carries the moves' figures; `docs/bible/progression.md` unchanged unless a decision moved.
- [ ] **Step 5:** Commit and push.

```bash
git add tools/coverage-floor.json ROADMAP.md COMBAT.md docs/superpowers/specs/2026-11-08-post-ladders-design.md
git commit -m "Post ladders done: floor, roadmap, combat figures (#963)"
git push -u origin <the task's branch>
```
