# Deck Fight Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the deck fight a puzzle in which each kind of boarding party shows a threat a turn ahead and wants a different answer.
PR 1 is the base (`party`, two waves, the level in the sidearm, the raider's rush, the hatch order by section, the tools); PR 2 is the corsair;
PR 3 is the navy.

**Architecture:** The deck engine in `js/fight.js` (`deckFight`, `boardMove`, `resolveDeckTurn`, `deckEnd`) stays pure and gains the party's
signature as a shown move. `js/boarders.js` sets the party from her ship, `js/fightui.js` shows the new moves and offers the hatch's section, and
`tools/answer.js` and `tools/fights.js` measure it by party.

**Tech Stack:** Vanilla JS classic scripts sharing one global scope; `node --test`; Playwright (headless shell) for the page tests and the tools.

**Spec:** `docs/superpowers/specs/2026-10-24-deck-fight-rework-design.md`

## Global Constraints

- Classic scripts in one global scope; no new top-level name may clash (`tests/globals.test.js`). No new script file in PR 1.
- New engine logic takes its state as parameters and returns a value; `js/fight.js` runs in plain Node (`tests/nodecontext.js`).
- The owner game is parked: no `hired()` fork inside the hand's logic.
- Every new line of text is a scene line in `scene:fight` (`js/hiredscenes.js`, read with `fightSay`); no emojis anywhere.
- Pins that change are rewritten with `PIN_WRITE=1` and each diff is read before committing.
- Tests: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` before each push;
  `npm run test:changed` while working.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` and
  `Claude-Session: https://claude.ai/code/session_01LvxdDHoAy8u4od8UXCWpM7`.
- `.claude/heartbeat.json` is updated at each step and never committed.
- Numbers are tuned only after measuring (spec Section 3): the waves, the sidearm by level, and later the charge's roll and the standing a head.

## Review Focus

1. The first wave all down while the second has not landed: the fight is not won (`deckEnd` counts the wave still to land). Test in Task 1.
2. A hatch order that names a section the deck does not have (the cargo bay on a short ship) is ignored, not thrown. Test in Task 2.
3. A veteran party's rush is never feinted (a feint applies only to a push), so the shown rush is what happens. Test in Task 2.
4. A hurt hand works a level lower, so the sidearm uses the level worked (`skillLevel`), not the stored points. Test in Task 3.
5. A rush whose second section is the bridge with nobody of ours on it ends the fight `taken` that turn, as a push onto it would. Test in Task 2.

---

## PR 1: the base

### Task 1: the party, the two waves and the sidearm by level (engine)

**Files:**
- Modify: `js/fight.js` (`DECK`, `deckFight`, `resolveDeckTurn`, `deckEnd`, near lines 230-372)
- Test: `tests/fight.test.js`

**Interfaces:**
- Produces:
  - `DECK.SIDEARM_BY_LEVEL = [[1, 2], [1, 2], [2, 3], [3, 4]]`, replacing `DECK.SIDEARM`. Level 2 keeps today's 2 to 3.
  - `DECK.WAVE_TURN = 1`: the second wave lands in the lock at the end of the first turn.
  - `DECK_PARTY = { raider: 'raider', corsair: 'corsair', cutter: 'navy', destroyer: 'navy' }`, keyed by `shipId`. Any other ship is `'raider'`.
  - `deckFight({ ..., party = 'raider', level = 2 })` gives state fields `party`, `level`, and `wave: { n, turn }` or `null`.
  - `sidearmOf(st) -> [lo, hi]`.
  - `pendingWave(st) -> number`: the heads still to land, 0 once landed.
- Ruling: waves are for the boarders only. In a repel they are theirs. In an assault our party crosses at once and her crew are already aboard, so `wave` is `null`.

- [ ] **Step 1: Write the failing tests** in `tests/fight.test.js`, beside the deck tests:

```js
test('a repel comes aboard in two waves: half first, the rest at the lock at the end of the first turn, shown until then', () => {
  const st = deckFight({ boarders: 7, crew: 5, cover: [0, 0, 0], party: 'raider' });
  assert.equal(st.sections[LOCK].theirs, 4);
  assert.deepEqual(st.wave, { n: 3, turn: DECK.WAVE_TURN });
  assert.equal(pendingWave(st), 3);
  const r = resolveDeckTurn(st, { stand: st.hand, act: 'shoot' }, { kind: 'hold', from: LOCK, to: LOCK, n: 0 }, () => 0.99);
  assert.equal(pendingWave(r.state), 0);
  assert.ok(r.events.some(e => e.kind === 'wave' && e.n === 3));
  assert.equal(deckFight({ boarders: 7, crew: 5, cover: [0, 0, 0], assault: true }).wave, null);
});

test('the break line counts the wave still to land: the first wave all down is not a win', () => {
  const st = deckFight({ boarders: 8, crew: 5, cover: [0, 0, 0] });
  st.sections.forEach(s => { s.theirs = 0; });
  assert.equal(deckEnd(st), null);
  st.wave = null;
  assert.equal(deckEnd(st), 'won');
});

test('the sidearm takes more heads at a higher level', () => {
  assert.deepEqual(sidearmOf(deckFight({ boarders: 6, crew: 5, cover: [0, 0, 0], level: 1 })), [1, 2]);
  assert.deepEqual(sidearmOf(deckFight({ boarders: 6, crew: 5, cover: [0, 0, 0], level: 3 })), [3, 4]);
});
```

- [ ] **Step 2: Run them to see them fail.**
  Run `node --test --test-name-pattern "two waves|wave still to land|sidearm" tests/fight.test.js`.
  Expected: FAIL (`pendingWave is not defined`).

- [ ] **Step 3: Implement.**
  - In `deckFight`, a repel puts `Math.ceil(boarders / 2)` in the lock and keeps the rest as `wave`.
  - In `resolveDeckTurn`, after the exchanges: when `st.turn` (after the increment) equals `wave.turn`, add `wave.n` to `S[LOCK].theirs`, push `{ kind: 'wave', n }`, and set `wave` to `null`.
  - In `deckEnd`, the `won` test uses `sum(st, 'theirs') + pendingWave(st)`.
  - The shot uses `sidearmOf(st)` where it read `DECK.SIDEARM`. Update the other readers of `DECK.SIDEARM` (`grep -rn "DECK.SIDEARM" js tools tests`).

- [ ] **Step 4: Run the deck tests.**
  Run `node --test tests/fight.test.js`.
  Expected: PASS. Any older deck test that assumed every boarder starts in the lock is updated to pass `boarders` against the new split, and the reason goes in the commit message.

- [ ] **Step 5: Commit** `js/fight.js` and `tests/fight.test.js`, with the message "Deck fight: the party, two waves, the sidearm by level".

### Task 2: the raider's rush and the hatch order by section (engine)

**Files:**
- Modify: `js/fight.js` (`boardMove`, `resolveDeckTurn`)
- Test: `tests/fight.test.js`

**Interfaces:**
- Consumes: from Task 1, `st.party`.
- Produces:
  - A shown move `{ kind: 'rush', from, via, to, n, feint: false }`.
  - An order `{ kind, odds, at }`. `at` is a section index, and its presence makes the order a hatch.
  - Events `{ kind: 'rush', from, to, n, stopped: bool }` and `{ kind: 'hatch', at, worked }`.
- The rush rule:
  - The party is `'raider'`, and `advance` gives a push `from -> via`.
  - The next section past `via` (`FORWARD` repelling, `BACK` in an assault) is not `via` itself.
  - The hand is not in `via`.
  - Ours in `via` are fewer than half of `n` (`2 * S[via].mine < n`).
  - Otherwise the move is the push as now.
  - In an assault, a rush comes from the defenders' push-back in `boardMove`, by the same rule.
- At resolution, the rush stops in `via` (an event with `stopped: true`) when the hand now stands in `via`, when `2 * S[via].mine >= n`, or when a hatch order worked at `via` this turn. Otherwise all `n` go to `to`.
- The hatch order is rolled before the shown move is applied, and its ability (steady or cover) works in section `at` rather than the hand's section. An `at` that is not a section of this deck drops the order (no event).
- A feint applies only to a push.

- [ ] **Step 1: Write the failing tests** in `tests/fight.test.js`:

```js
const rushDeck = () => { const st = deckFight({ boarders: 8, crew: 3, cover: [0, 0, 0], party: 'raider' }); st.sections[CORRIDOR].mine = 1; st.hand = BRIDGE; return st; };

test('raiders rush through a thin section: two sections in a turn, shown as a rush', () => {
  const st = rushDeck(), m = boardMove(st, () => 0.99);
  assert.equal(m.kind, 'rush'); assert.equal(m.via, CORRIDOR); assert.equal(m.to, BRIDGE);
  const r = resolveDeckTurn(st, { stand: BRIDGE, act: 'shoot' }, m, () => 0.99);
  assert.ok(r.events.some(e => e.kind === 'rush' && !e.stopped));
});

test('a rush stops where the hand stands, or at a hatch that worked', () => {
  const st = rushDeck(), m = boardMove(st, () => 0.99);
  const met = resolveDeckTurn(st, { stand: CORRIDOR, act: 'shoot' }, m, () => 0.99);
  assert.ok(met.events.some(e => e.kind === 'rush' && e.stopped));
  const hatched = resolveDeckTurn(st, { stand: BRIDGE, act: 'shoot', order: { kind: 'steady', odds: 1, at: CORRIDOR } }, m, () => 0.5);
  assert.ok(hatched.events.some(e => e.kind === 'hatch' && e.worked && e.at === CORRIDOR));
  assert.ok(hatched.events.some(e => e.kind === 'rush' && e.stopped));
});

test('only raiders rush, a rush is never feinted, and a hatch at a section the deck lacks is dropped', () => {
  const st = rushDeck(); st.party = 'corsair';
  assert.equal(boardMove(st, () => 0.99).kind, 'push');
  const vet = rushDeck(); vet.grade = 2;
  assert.equal(boardMove(vet, () => 0).feint, false);
  const r = resolveDeckTurn(rushDeck(), { stand: BRIDGE, act: 'shoot', order: { kind: 'steady', odds: 1, at: CARGO } }, { kind: 'hold', from: LOCK, to: LOCK, n: 0 }, () => 0.5);
  assert.ok(!r.events.some(e => e.kind === 'hatch'));
});

test('a rush onto a bridge with none of ours on it takes the ship that turn', () => {
  const st = rushDeck(); st.sections[BRIDGE].mine = 0; st.hand = LOCK; st.sections[LOCK].mine = 1;
  const r = resolveDeckTurn(st, { stand: LOCK, act: 'shoot' }, boardMove(st, () => 0.99), () => 0.99);
  assert.equal(deckEnd(r.state), 'taken');
});
```

  If a test's setup does not meet the rule as written (for example, the lock holds ours, so `advance` holds), adjust the setup so that it does. The assertions stay as they are.

- [ ] **Step 2: Run them to see them fail.**
  Run `node --test --test-name-pattern "rush|hatch" tests/fight.test.js`.
  Expected: FAIL.

- [ ] **Step 3: Implement the rule above in `boardMove` and `resolveDeckTurn`.**

- [ ] **Step 4: Run the deck tests.**
  Run `node --test tests/fight.test.js`.
  Expected: PASS.

- [ ] **Step 5: Commit** `js/fight.js` and `tests/fight.test.js`, with the message "Deck fight: the raider's rush and the hatch order by section".

### Task 3: the party from her ship, and the panel

**Files:**
- Modify: `js/boarders.js` (`repelStart`, `assaultStart`, `deckStart`, `repelOrders`)
- Modify: `js/fightui.js` (`deckFightEvent`, `deckTurn`, near lines 249-310)
- Modify: `js/handtohand.js` (`fightStrip`: a rush draws its arrow from `from` to `to` through `via`; the wave as a line under the deck)
- Modify: `js/hiredscenes.js` (`scene:fight` lines below)
- Test: `tests/fightui.test.js`, `tests/boarders.test.js`; pins in `tests/*pin.test.js` that cover boarding

**Interfaces:**
- Consumes:
  - from Task 1, `deckFight({ party, level })`, `sidearmOf`, `pendingWave` and the `wave` event;
  - from Task 2, the `rush` move, the order's `at`, and the `rush` and `hatch` events.
- Produces:
  - `HATCH_ORDER = { pilot: 'steady', engineer: 'cover' }` in `js/handtohand.js`: an order is a hatch when `HATCH_ORDER[o.sheet.post] === o.kind`.
  - The panel plan `p.at` (a section index, default `p.stand`).
- `deckStart` passes `party: DECK_PARTY[foe.shipId] || 'raider'` and `level: skillLevel(lockPost())`. That is the level worked, so a hurt hand is a level lower.
- The new scene lines are drafted below, for the owner to edit:
  - `'deck.rush': '{who}: {n} rushing through {via} into {to}.'`
  - `'deck.wave': '{n} more at the lock next turn.'`
  - `'deck.order.at': 'At {at}'`
  - `'deck.log.rush': '{n} of them rush into {to}'`
  - `'deck.log.rushStopped': '{n} of them rush and are stopped in {at}'`
  - `'deck.log.hatch': 'the hatch at {at} {how}'`, with `how` taken from `'deck.hatch.worked': 'holds'` and `'deck.hatch.failed': 'does not close'`
  - `'deck.log.wave': '{n} more come through the lock'`
- `deck.shoot` reads `sidearmOf(f)` for its `{lo}` and `{hi}`.
- A hatch order adds one more kept choice, labelled `deck.order.at`, that cycles `p.at` over the deck's sections. `deckTurn` passes `at` only for a hatch order.

- [ ] **Step 1: Write the failing tests.**
  - In `tests/boarders.test.js`, against a corsair `foe.shipId` and a raider's: `repelStart(...).state.party` is `'corsair'` and `'raider'`.
  - In `tests/fightui.test.js` (page tests, as the file's other deck tests do):
    - a raider repel set up to rush shows `read` containing "rushing through";
    - a fight with a wave shows "more at the lock next turn" before the first Fight and not after it;
    - with the pilot ordered, the panel has a choice whose label starts "At ";
    - a hurt hand at level 3 shows the level-2 sidearm range ("2 to 3").

- [ ] **Step 2: Run them to see them fail.**
  Run `npm run test:changed`.
  Expected: the new tests FAIL.

- [ ] **Step 3: Implement the interfaces above.** The rush, the wave and the hatch go into the log through the new lines, beside the existing move and exchange lines in `deckTurn`.

- [ ] **Step 4: Run the changed tests, then rewrite the pins.**
  Run `npm run test:changed`.
  Expected: PASS, apart from pins that cover boarding.
  Rewrite those with `PIN_WRITE=1` on the failing pin files, read each diff (only deck turns, waves and rush lines should change), and run them again.
  Expected: PASS.

- [ ] **Step 5: Commit** the modified files and the pins, with the message "Deck fight: the party from her ship, the rush, the wave and the hatch on the panel".

### Task 4: the deck answer, the report by party, the checks and the tune

**Files:**
- Modify: `tools/answer.js` (add `answerDeck`, exported beside `answerOrders`)
- Modify: `tools/fights.js` (deck policy `answer`; the deck trials by party; the report by party)
- Modify: `tests/fights.test.js` (replace the deck test at lines 105-133)
- Modify: `js/fight.js` (`DECK` numbers only, if the tune needs them)
- Modify: `COMBAT.md` ("The deck fight" and its measured bullets)

**Interfaces:**
- Consumes: from Tasks 1 to 3, everything in the engine and on the panel.
- Produces: `answerDeck(s) -> { stand, act, order, at }`. It is self-contained on the page's globals, as `answerOrders` is, and is passed into the page by `toString()`. Its rules, in order:
  1. On a shown rush, stand in `via` if it is in reach (the hand's section or one next to it). Otherwise, order a hatch at `via` when one is on offer.
  2. Otherwise go where the fight is, as the tool's `goal` does, and shoot.
  3. Order the first crewmate on offer, except where rule 1 used the order.
- In `tools/fights.js`:
  - `foeOf(party)` makes the foe with `shipId` `'raider'`, `'corsair'` or `'cutter'`.
  - The deck cells gain a `party` group: each of raider and corsair, for each policy in `random`, `shoot`, `cover`, `order`, `answer`, with two crew and five, at level 2, grade 0.
  - The `level` group runs with the `answer` policy and two crew.
  - Rows are keyed with the party.

- [ ] **Step 1: Rewrite the deck test in `tests/fights.test.js`** to the spec's checks for PR 1, on the raider party (both kinds, two seeds of 200):
  - `answer` wins at least 0.9;
  - no fixed policy (`random`, `shoot`, `cover`, `order`) wins more than `answer`;
  - `answer`'s mean turns are at least 3.5 and at most 6.5 (the spec's 4 to 6 with a sampling margin);
  - with two crew, `answer` at level 3 wins at least 0.1 more than at level 1;
  - random play's dead a fight by grade stays within 0.15 of today's (repel 0.32, 0.44, 0.49; assault 0.36, 0.49, 0.55).

  The corsair and navy targets come in Tasks 5 and 6.

- [ ] **Step 2: Implement `answerDeck` and the tool changes.** Run `node tools/fights.js --seeds 1,2,3 --n 100 --groups party,level,grade` and save the output in the plan workspace.

- [ ] **Step 3: Tune if a check fails.**
  - The levers, in order: `DECK.WAVE_TURN`, the wave's share, `DECK.SIDEARM_BY_LEVEL`, `DECK.BREAK`. Change one at a time and measure each change.
  - If no lever meets a check, stop and report the numbers. Do not weaken the check.

- [ ] **Step 4: Run the fight test, then the whole suite.**
  Run `node --test tests/fights.test.js`, then the whole suite (Global Constraints), and `npm run soak` for the stakes limits.
  Expected: PASS, with the soak's stakes limits held.

- [ ] **Step 5: Rewrite COMBAT.md's deck fight section** with the parties, the rush, the waves, the hatch and the measured table, then commit, with the message "Deck fight: the answer, the report by party, the checks and the tune".

PR 1 opens after Task 4, when the owner asks.

## PR 2: the corsair

### Task 5: the breaching charge and pull back

**Files:** `js/fight.js`, `js/fightui.js`, `js/hiredscenes.js`, `tools/answer.js`, `tests/fight.test.js`, `tests/fightui.test.js`, `tests/fights.test.js`, `COMBAT.md`, and the pins.

**Interfaces:**
- A shown `{ kind: 'charge', at, n: 0 }` from a corsair party. The rule:
  - It is shown when one of theirs stands next to a section where ours stand.
  - It is never shown two turns running.
- At the next turn's resolution, the charge takes `rollsOf(1, DECK.CHARGE, rand)` of ours in `at`, not cut by cover, unless a steady worked in `at` this turn. That is a pick-off of its setter, and the event is `{ kind: 'charge', at, mine, stopped }`.
- `DECK.CHARGE = [1, 3]`, to tune.
- A new act `'pullback'` (`DECK_ACTS`) moves ours in the hand's section, and the hand, one section back.
- `answerDeck` pulls back from a shown charge on its section, or picks off the setter when the hand's steady odds are 0.5 or better.
- The tests:
  - a charge lands and ignores cover;
  - a pick-off stops it;
  - a pull back moves ours out;
  - `answer` wins at least 0.9 against corsairs;
  - "go to them and shoot" does worse against a corsair than `answer`.

## PR 3: the navy

### Task 6: the lawful party, the standing a head, and the search

**Files:** `js/fight.js`, `js/boarders.js`, `js/fightui.js`, `js/hiredscenes.js`, `tools/answer.js`, `tools/fights.js`, the tests, `COMBAT.md`, and the pins.

**Interfaces:**
- A navy party counts its heads put down (`st.navyDown`).
- `repelSettle` charges `DECK.NAVY_STANDING = 2` a head with her faction, through the function the ship fight's 8 for a hostile patrol uses.
- The navy holding our bridge ends `'searched'`. `deckEnd` returns `'searched'` for a navy party where it would return `'taken'`, and the settle charges the heave-to's cost (the ship pays a quarter of its fund) through the heave-to's own function. The ship is not taken.
- `answerDeck` holds a navy party with cover and hatches, and fires only when they would take the bridge next turn.
- The tests:
  - the standing is charged a head;
  - a held bridge is a search, not the ship taken;
  - over all three parties, no fixed policy wins 70% or more against every party, and random play loses 25% or more.
