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

### Task 3b: wounds, not heads, and the sidearm's reach (the spec's amendment)

**Files:**
- Modify: `js/fight.js` (sections, the exchange, the shot, the moves), `js/fightui.js` (the shot's section, the log), `js/handtohand.js`
  (`fightStrip`), `js/hiredscenes.js` (lines below)
- Test: `tests/fight.test.js`, `tests/fightui.test.js`, `tests/handtohand.test.js`; the pins

**Interfaces:**
- Consumes: Tasks 1 to 3 (the waves, the rush, the hatch, `sidearmOf`, the panel plan `{ stand, act, order, at }`).
- Produces:
  - each section gains `mineHurt` and `theirsHurt` (wounded among its heads, 0 to the heads there; a wave lands unwounded);
  - `hitSide(s, side, hits) -> { downed, wounded }`: each hit wounds an unwounded head of `side` there, or, when all are wounded,
    downs one; heads and hurt are updated in place;
  - `moveHeads(S, side, from, to, n)`: the unwounded go first, the wounded last (`max(0, n - unwounded)` of them move), used by every
    move (theirs, ours in an assault, the rush);
  - the exchange applies its rolls through `hitSide`, and its event becomes `{ kind: 'exchange', section, mine, theirs, mineHurt,
    theirsHurt }` (`mine` and `theirs` stay the downed, so `deckLoss`'s casualty rolls are unchanged and fall on the downed only);
  - the shot is `{ kind: 'shoot', at }` (a bare `'shoot'` is at the hand's section). `at` is the hand's section, or from
    `DECK.SIDEARM_REACH_LEVEL = 2` one next to it; any other `at` is the hand's section. Each head of the shot (`sidearmOf`) downs a
    wounded head there first, else wounds one; its events say both.
- New scene lines, for the owner to edit:
  - `'deck.log.wounds': '{theirs} of them and {mine} of ours wounded in {at}'`
  - `'deck.wounded': '{n} of them wounded'` (the strip's label, beside a section's heads)
  - the shot's section reuses `'deck.order.at'` ("At {at}"), offered only when the level reaches `DECK.SIDEARM_REACH_LEVEL`.
- The strip draws a section's wounded: theirs as a second, hollow count beside the heads, and the label carries `deck.wounded`.

- [ ] **Step 1: Write the failing tests** in `tests/fight.test.js`:
  - `hitSide` on 3 unwounded takes 3 hits to wound all and a fourth to down one;
  - an exchange's first hits wound and do not down (the event's `theirsHurt` > 0, `theirs` 0, on a section with no wounded);
  - the shot downs a wounded head before it wounds another;
  - at level 2, a shot `at` a section next to the hand reaches it; at level 1 the same `at` falls back to the hand's section;
  - a push moves the unwounded first (3 heads, 1 wounded, a push of 2 leaves the wounded one behind);
  - a wave lands unwounded.
  - In `tests/fightui.test.js`: at level 2 the shoot choice offers "At "; at level 1 it does not. In `tests/handtohand.test.js`: a
    section with wounded draws the hollow count and says "of them wounded" in its label.
- [ ] **Step 2: Run them to see them fail.** `node --test tests/fight.test.js`; `npm run test:changed`. Expected: the new tests FAIL.
- [ ] **Step 3: Implement the interfaces above.** The log gains the wounds line beside the existing fight line.
- [ ] **Step 4: Run, then rewrite the pins.** `npm run test:changed`, then the pins with `PIN_WRITE=1`, each diff read (only deck turns
  should change), and the full suite. Expected: PASS but tests/fights.test.js's deck test (Task 4).
- [ ] **Step 5: Commit**, "Deck fight: wounds, not heads, and the sidearm's reach".

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

> **As shipped** (PR #826). The text below this block was written before the owner's and the ledger's rulings of 2026-10-27
> (`.superpowers/sdd/2026-10-24-deck-fight-rework/progress.md`) and is kept as it was; where it differs, this block is what shipped.
> - `DECK.CHARGE = [1, 1]`: a charge downs one of ours.
> - The charge blows at the end of the turn it is shown, after the exchange and the shot, and is stopped when one of theirs in its
>   `from` (the setter's section) is downed or wounded that turn: the shot aimed there, a steady or hatch worked there, or the trade
>   where ours stand there. The shown charge, the strip (CHARGE and SETTER) and the log name `from`.
> - Pull back goes toward our bridge repelling and toward her lock boarding her, and only when the hand stays in its section that
>   turn (the panel offers it only then, and the engine ignores it on a turn the hand moved).
> - `DECK.CORSAIR_LESS = 2` applies boarding her and in the duel's full run; her ship fight boards at a half run, where it does not.
>   The fight tool repels a corsair at a half run, as the game does (`fightui.js` fightBoarded).
> - `answerDeck` has a charge branch (shoot into `from` from a stand that reaches it, else pull back, else the pilot's steady hatch
>   at `from`); the tool's `charge` cell plays `answerNoCharge`, the answer without it, boarding her with two standing.
> - The corsair checks as ruled: repelling her, a fixed policy may come within 0.02 of the answer with two standing (as with five),
>   her fights last 2.5 turns or more, and random play's dead a fight is within 0.15 of 0.52 (the raider repel's grade-0 baseline,
>   0.32, plus 0.2); `shoot` below the answer with two standing is checked boarding her only; and boarding her with two standing the
>   answer wins 0.2 or more over `answerNoCharge`.

Written in full after PR 1 (#825) merged, for the engine as it now stands: wounds, `deckRule`, `DECK.ASSAULT`, the panel plan
`{ stand, act, shootAt, order, at }`, and `answerDeck(s, read)`. The owner's choice (2026-10-27): a charge downs.

**Files:**
- Modify: `js/fight.js` (`DECK`, `boardMove`, `resolveDeckTurn`), `js/fightui.js` (`DECK_ACTS`, the shown move, the log),
  `js/handtohand.js` (`fightStrip`: a charge is marked on its section, not drawn as an arrow), `js/hiredscenes.js` (lines below),
  `tools/answer.js` (`answerDeck`), `tools/fights.js` (the corsair cells already exist), `COMBAT.md`
- Test: `tests/fight.test.js`, `tests/fightui.test.js`, `tests/handtohand.test.js`, `tests/fights.test.js`; the pins

**Interfaces:**
- `DECK.CHARGE = [1, 3]`: the heads of ours a charge downs, to tune.
- The shown move `{ kind: 'charge', at, from, n: 0, feint: false }`, from a corsair party in both directions:
  - it is chosen in `boardMove` where their move would otherwise be a push or a hold, when one of theirs stands in a section
    (`from`) next to one where ours stand (`at`), with the most of ours chosen if more than one;
  - it is never shown two turns running (the state keeps `st.charged`, the turn of the last one);
  - it is never feinted.
- It blows when the turn it is shown in is resolved, as every shown move does: after the hand's stand, the act, the order and the
  hatch, before the exchange. It downs `rollsOf(1, DECK.CHARGE, rand)` of ours in `at` outright, past wounds and cover. The wounded
  are downed first. Our heads downed roll for a casualty as an exchange's do.
- A worked steady in `at` this turn, by the hand or by an order, picks off its setter: the charge does not blow.
- The event is `{ kind: 'charge', at, mine, stopped }`, where `mine` is the downed.
- A new act `'pullback'`, added to `DECK_ACTS`, moves the hand and all of ours in its section one section back (`BACK` repelling,
  `FORWARD` in an assault) before the charge. It does nothing where the hand stands in the back section (the lock repelling, her
  bridge in an assault), and the panel does not offer it there.
- The panel:
  - `'deck.charge': '{who}: a charge on {at}. It blows this turn.'` (the shown move);
  - `'deck.pullback': 'Pull back: ours here fall back to {to}'` (the act's label);
  - `'deck.log.charge': 'the charge blows in {at}, {mine} of ours down'`;
  - `'deck.log.chargeStopped': 'the charge in {at} never blows'`;
  - `'deck.log.pullback': 'ours fall back to {to}'`.

  The strip marks the charged section ("CHARGE"), and its label says "a charge on {at}".
- `answerDeck`, on a shown charge at the hand's section:
  - it pulls back, unless the hand's steady odds are 0.5 or better and theirs stand there, in which case it picks off the setter
    (act `'steady'`);
  - on a charge at another section where a steady order is on offer, it sends that order there when the order's odds are 0.5 or
    better;
  - otherwise it keeps its rules.
- Also, the parked final-review item from PR 1: the feint mark and line show on a `'round'` move as well as a push (a round can
  feint; `js/fightui.js` `deckBoard` and `read`).

- [ ] **Step 1: Write the failing tests** in `tests/fight.test.js`:
  - a corsair party next to ours shows a charge, not two turns running;
  - a charge downs 1 to 3 of ours, past cover and wounds (the wounded first);
  - a worked steady in `at` stops it (an event with `stopped: true`, and none of ours downed by it);
  - a pull back moves the hand and ours one section back, before the charge, so a charge on the section left downs nobody;
  - a raider party never shows a charge, and a charge is never feinted.

  In `tests/fightui.test.js`:
  - a shown charge reads "It blows this turn";
  - the pull back is offered except in the back section;
  - a veteran's round shows the feint.
- [ ] **Step 2: Run them to see them fail.** Run `node --test tests/fight.test.js`, then `npm run test:changed`.
- [ ] **Step 3: Implement the interfaces above.**
- [ ] **Step 4: Measure.**
  - Run `node tools/fights.js --seeds 1,2 --n 200 --groups party,level,grade` and add the corsair checks to the deck test in
    `tests/fights.test.js`, beside the raider's and on the same rules as the raider's:
    - repel: answer >= 0.9; no fixed policy above it (the 0.02 tolerance at five crew); 3.5 to 6.5 turns; dead within 0.15;
    - assault: two crew >= 0.6 and above every fixed policy; five crew >= 0.9; >= 2.5 turns; dead an upper bound;
    - shooting where they are (`shoot`) wins less than `answer` against a corsair with two crew.
  - Tune `DECK.CHARGE` first, then a corsair-only number if needed, each measured. The raider's checks must still pass.
  - If no setting passes, stop and report the numbers.
- [ ] **Step 5: Run the gates, then commit.**
  - Rewrite the pins with `PIN_WRITE=1`, reading each diff.
  - Update COMBAT.md's deck section with the charge, pull back and the corsair's numbers.
  - Run the full `npm test`, `npm run test:editor`, `npm run soak` and `npm run coverage -- --check`.
  - Commit: "Deck fight: the corsair's charge and pull back".

## PR 3: the navy

### Task 6: the lawful party, the standing a head, and the search

Written in full after PR 2 (#826) merged, for the engine as it now stands: wounds, `deckRule`, `DECK.ASSAULT`, the charge, per-cell
streams in the fight tool, the panel plan `{ stand, act, shootAt, order, at }`, and `answerDeck(s, read, charge)`. The owner's
choices (2026-10-27):
- the search costs the heave-to's fine;
- the navy check is that the answer costs at most half the standing shooting does.

**Files:**
- Modify: `js/fight.js` (`DECK`, `deckFight`, `resolveDeckTurn`'s loss tally, `deckEnd`).
- Modify: `js/boarders.js` (`repelSettle`, and a small shared fine).
- Modify: `js/engage.js` (the heave-to uses the shared fine).
- Modify: `js/fightui.js` (the navy's move words, the close, the standing shown on the panel).
- Modify: `js/hiredscenes.js` (lines below).
- Modify: `tools/answer.js` (`answerDeck`).
- Modify: `tools/fights.js` (a navy party: a cutter, a gov, started as the game starts her boarding; standing per fight in the tally).
- Modify: `tools/soak.js` (a stall limit).
- Modify: `COMBAT.md`.
- Test: `tests/fight.test.js`, `tests/boarders.test.js`, `tests/fightui.test.js`, `tests/fights.test.js`; the pins.

**Interfaces:**
- **The navy party** comes only on our deck. It is the party of a patrol hull (`DECK_PARTY` already maps cutter and destroyer to
  `'navy'`), started from the ship fight's `'boarded'` end exactly as `fightBoarded` does.
- **The heads put down.** `deckFight` gives a navy fight `st.navyDown = 0`. `resolveDeckTurn` adds every head of theirs downed
  that turn: in the exchange, by the shot, by a steady, by a hatch. Wounds are not counted; a head is put down when it is downed.
- **The search.** `deckEnd` returns `'searched'` for a navy party where it would return `'taken'`.
- **The fine is shared.** `heaveToFine()` in `js/boarders.js` returns `Math.round(purse() * 0.25)`. The heave-to in
  `js/engage.js` and the search both charge it through `moveMoney(-fine)`, so the hired hand's fund rule is one rule. The
  heave-to keeps its own lines and its own standing reset.
- **The settle.** `repelSettle` charges `changeRep(d.foe.gov, -DECK.NAVY_STANDING * s.state.navyDown)`, with
  `DECK.NAVY_STANDING = 2`, for a navy fight however it ends. On `'searched'` it also:
  - charges the fine;
  - takes one off the captain's opinion of the hand, with a memory line;
  - ends with the ship kept, not taken.

  No standing reset, since you fought them.
- **The navy's own move.** It is a plain push and hold (no signature move). It is never feinted, so a navy party has no
  `CUNNING` feint.
- **The panel lines:**
  - `'deck.who.navy': 'The boarding party'`;
  - `'deck.navy.down': 'Each of them put down costs standing with {gov}: {n} so far.'`, read under the deck on a navy fight;
  - `'deck.end.searched'`: the close line for a search, which names the fine;
  - `'memory.searched'`: the captain's memory line.

  Claude drafts these lines and the owner edits them.
- **`answerDeck` against a navy party:**
  - it stands where they push, and makes cover there while it can;
  - it sends hatches to the section they push into;
  - it shoots only when they would hold our bridge after their shown move (their heads on the bridge, ours none) or when the
    hand's section would be lost.
- **The fight tool:**
  - a navy cell group (`party: 'navy'`, a cutter with a gov, two crew and five, every policy);
  - each cell tallies `standing` (the standing lost, summed) beside won and dead;
  - each cell plays on its own stream, as now.
- **The soak.** `tools/soak.js` opens its pages with a stall limit of 900000 (as the distribution tests do), not 0, so a hung
  page fails with its cause rather than waiting forever.

- [ ] **Step 1: Write the failing tests.** In `tests/fight.test.js`:
  - a navy fight counts the heads it puts down from an exchange, a shot and a steady, and does not count wounds;
  - a navy party that holds our bridge ends `'searched'`;
  - a navy move is never feinted.

  In `tests/boarders.test.js`:
  - a search charges a quarter of the purse and takes one off the captain's opinion, and the ship is kept;
  - the standing charged is 2 a head put down, however the fight ends;
  - the heave-to and the search charge the same fine from the same purse.

  In `tests/fightui.test.js`:
  - a navy fight's panel names the party and shows the standing line;
  - a search's close names the fine.
- [ ] **Step 2: Run them to see them fail.** Run `node --test tests/fight.test.js tests/boarders.test.js`, then
  `npm run test:changed`.
- [ ] **Step 3: Implement the interfaces above.**
- [ ] **Step 4: Measure** with `node tools/fights.js --seeds 1,2 --n 200 --groups party,level,grade,charge`, and add the navy checks
  to the deck test:
  - the answer wins at least 0.9 with two crew and five, where a win is repelled or withdrawn at the cap, not a search;
  - the answer's standing lost a fight is at most half of shoot's, with two crew and five;
  - random play's standing lost is more than the answer's;
  - answer's turns are 3.5 to 6.5;
  - random play's dead a fight is within 0.15 of the raider repel's grade-0 baseline (0.32).

  Over all three parties, as the spec's Section 3 asks:
  - no fixed policy (random, shoot, cover, order) wins 70% or more against every party;
  - random play loses 25% or more of its fights.

  The raider's and the corsair's checks must still pass. Tune only navy numbers (her break line, her party's size), each
  measured. If no setting passes, stop and report the numbers.
- [ ] **Step 5: Run the gates, then commit.**
  - Rewrite the pins with `PIN_WRITE=1`, reading each diff.
  - Update COMBAT.md's deck section with the navy party, the standing, the search and the numbers. Note there that the navy
    deck fight is rare in play: `answer` play in the ship fight is boarded 0%, and the ladder's cutter is a papers check.
  - Run the full `npm test`, `npm run test:editor`, `npm run soak` and `npm run coverage -- --check`.
  - Commit: "Deck fight: the navy's lawful party, the standing a head, and the search".
