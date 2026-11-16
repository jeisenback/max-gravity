# Boarding on the Deck Plan Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace today's deck fight on a strip of sections with a turn-by-turn fight played spot by spot through the ship's real decks, built beside the old one and switched over when it meets its targets.

**Architecture:** The decks and their spots are data in `js/layouts.js` with pure helpers for paths and lines of fire. A pure rules module (`js/deckplan.js`) plays a turn: state in, next state and events out, `rand` passed in, run in Node. A screen module (`js/deckplanui.js`) draws the cutaway as a scene on the view helpers. `deckStart` (`js/boarders.js`) builds the crew and the party as today and hands them to the old fight or the new one by a setting; the ends are today's (`won`, `taken`, `searched`), so the settles are unchanged.

**Tech Stack:** Vanilla JS classic scripts in one global scope, canvas, `node --test`, Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md`. Read it first, including its "Calls made" section; this plan does not repeat its rules.

**Delivery:** five PRs, one per Part, each leaving the game playable and each with its own issue.

## Global Constraints

- Hired hand only; no `hired()` fork inside the fight's logic; what the player may decide is asked of `role()` (CLAUDE.md).
- `js/deckplan.js` and the layout helpers read no `G`, change nothing they are given, and take `rand` (`() => number in [0, 1)`).
- Every field kept on `G` is declared with a comment in `js/game.js` (`tests/gfields.test.js`).
- Every new script is linked in `index.html` after what it uses (`tests/globals.test.js`); top-level names are unique.
- Every new button is pressed by a test, or in `EXEMPT` with a checkable reason (#1327).
- Page markup on the view helpers (`js/views.js`); words in the game's voice (`docs/bible/voice.md`) as `scene:fight` lines with a `plan.` key prefix in `js/hiredscenes.js`.
- Desktop only, at least 1000 px wide (#937). No emojis.
- Starting numbers (the spec's and today's, to be tuned in Part 4): spot cover 0 to 2 (doorway 0; console or door frame 1; table, bunks, bench, racks, scrubbers, reactor shield 2), made cover +2 capped at 3; three people a spot; two waves (`DECK.WAVE_TURN`); the rush two spots a turn; `DECK.CHARGE`; `DECK.CASUALTY` 0.3 and `DECK.ASSAULT.CASUALTY` 0.5; hand hurt `REPEL_HURT.lose` times `DECK.SUIT`; `DECK.BREAK` 0.15 and `DECK.ASSAULT.BREAK` 0.2; turn caps about 12 (repel and assault) and about 8 (navy), replacing 8 and 5; `DECK.NAVY_STANDING` 2 a head.

## Review Focus

1. **Every path to the bridge sealed.** Boarders cut the nearest sealed hatch on their path (CUTTING, a turn) or go round below the lock deck only if a path is open; they never stand still forever. (Test in Task 5.)
2. **A spot full on the only path.** Three of ours on the well spot: the rush stops there and does not pass through or overfill it. (Test in Task 5.)
3. **The hand downed or killed mid-turn.** The turn finishes resolving, the fight stops after it, and the ending is queued as today (`s.handDied`). (Test in Task 9.)
4. **Few or none stand with the hand** (`repelCrew` keeps people to their berths): the fight still opens with the hand and the captain, and the ends still work. (Test in Task 8.)
5. **Hester wounded twice** is downed but never killed in the fight; the bridge counts her only while she is up. (Test in Task 6.)

---

## Part 1: The decks as data (PR 1)

### Task 1: The hauler's spots and the path helpers

**Files:**
- Modify: `js/layouts.js` (`LAYOUTS.freighter.spots`, and helpers)
- Test: `tests/layouts.test.js` (extend, or create if it does not exist)

**Interfaces:**
- Produces:
  - A spot: `{ id, deck, x, cover, name, what, well?: true, post?: 'pilot' | 'engineer' | 'gunner' | 'comms' }` (the prototype's list for the hauler, `x` a share of the deck's width; one well spot per deck, cover 0).
  - `deckSpots(lay) -> [spot]`, `deckSpot(lay, id) -> spot`.
  - `spotLinks(lay) -> { [id]: [id] }`: along each side of a deck to the well spot, and well to well between decks.
  - `spotHatch(lay, a, b) -> 'h<n>' | null`: the hatch between two well spots one deck apart.
  - `spotPath(lay, from, goals, sealed = {}, blocked = {}) -> { next, dist }`: breadth-first, through no sealed hatch and onto no spot in `blocked`.
  - `inLine(lay, a, b, sealed = {}) -> bool`: same deck, or well spots one deck apart through an open hatch.
  - `boardLayout(shipId) -> layout`: `LAYOUTS[shipId] || LAYOUTS.raider` (Task 2 adds the raider). `layoutOf` is left as it is for the burn view.

- [ ] **Step 1: Write the failing tests**

```js
test('every spot on the hauler is reachable from the airlock, and every room has two to four spots', () => {});
test('a sealed hatch cuts the path through the well and the line of fire through it', () => {});
test('a line of fire runs along a deck and one deck up the well, never two', () => {});
```

- [ ] **Step 2: Run them to see them fail.** `node --test tests/layouts.test.js`: FAIL.
- [ ] **Step 3: Implement the data and helpers in `js/layouts.js`.**
- [ ] **Step 4: Run them to see them pass,** then `node --test tests/globals.test.js`, PASS.
- [ ] **Step 5: Commit.**

### Task 2: The raider's and the corsair's decks

**Files:** Modify `js/layouts.js` (`LAYOUTS.raider`, `LAYOUTS.corsair`); test `tests/layouts.test.js`.

**Interfaces:**
- Produces: two layouts in the hauler's shape (`width`, `well`, `decks`, `seats`, `spots`), three or four decks each: her lock deck, at least one deck of her crew's space, her bridge; the corsair with a room where her marines muster. Names and furniture in the bible's voice.

- [ ] **Step 1: Write the failing tests:** both layouts pass Task 1's reachability and spot-count tests; each has exactly one bridge deck and one lock deck, with at least one deck between them; `boardLayout('cutter')` is the raider's.
- [ ] **Steps 2 to 4:** run and fail, add the data, run and pass; full suite PASS.
- [ ] **Step 5: Commit; push; PR 1.**

## Part 2: The rules (PR 2)

### Task 3: The fight's state

**Files:**
- Create: `js/deckplan.js` (link after `js/fight.js` and `js/layouts.js`)
- Test: `tests/deckplan.test.js`

**Interfaces:**
- Consumes: Task 1's helpers; `DECK` from `js/fight.js`.
- Produces:
  - `PLAN`: constants (spot cap 3, made cover 2, cover cap 3, rush steps 2, turn caps 12 and 8, shot odds by level and cover), each with a comment.
  - A figure: `{ id, side: 'us' | 'them', name, spot, hp: 2, level, post?, captain?: true, hand?: true }` (`hp` 2 up, 1 wounded, 0 down).
  - `planFight({ lay, crew: [{ id, name, level, post }], hand: { level, post }, captain: { name } | null, party: 'raider' | 'corsair' | 'navy', boarders, grade, assault = false, kitCover = 0 }) -> state`: ours placed by post (the pilot and the captain on the bridge, the gunner at the gun seat, and so on, crowding to the next free spot), the first wave at her lock or ours (half of `boarders`), the rest pending; `{ lay, figures, sealed: {}, cutting: null, cover: {}, turn: 0, wave: n, began: boarders, charges, party, grade, assault, log: [], events: [] }`.

- [ ] **Step 1: Write the failing tests:** a repel opens with half the party at the airlock and ours at their posts; an assault opens with ours at her lock and hers through her decks; with no crew standing, the hand and the captain still open it (Review Focus 4).
- [ ] **Steps 2 to 5:** run and fail, implement, run and pass, commit.

### Task 4: Their move

**Files:** Modify `js/deckplan.js`; test `tests/deckplan.test.js`.

**Interfaces:**
- Consumes: `CUNNING` (today's feint rate).
- Produces: `planTheirMove(state, rand) -> { moves: [{ id, to }], shots: [{ id, at, odds }], charge: { on, from, setter } | null, cut: hatch | null, feint: bool }`, drawn before the hand commits. By party: raiders push and rush (two spots along `spotPath` where the next spot is held by fewer of ours than half of them and the hand is not on it); corsairs push and set a charge (from a spot next to the spot of ours with the most heads; never two turns running; never feinted; while `charges` last); the navy pushes and holds only. Sealed hatch on every path: cut the nearest on the path.

- [ ] **Step 1: Write the failing tests:** a rush moves two spots and stops at the hand's spot; a charge is shown a turn ahead from a spot next to its target; the navy never rushes or charges; with every path sealed they cut a hatch (Review Focus 1); a full spot on the only path stops the rush (Review Focus 2).
- [ ] **Steps 2 to 5:** as above.

### Task 5: Our side: the captain, the crew, the hand's choices

**Files:** Modify `js/deckplan.js`; test `tests/deckplan.test.js`.

**Interfaces:**
- Produces:
  - `planCaptain(state, nerve) -> 'hold' | 'push' | 'fall'` (repelling: hold the well, push them back, fall back to the bridge; boarding her: hold, push for her bridge, pull back to her lock).
  - `planCrewMoves(state, order, rand) -> { moves, shots }` for our crew under the order.
  - `planChoices(state) -> { moves: [spot], acts: [{ kind: 'shoot' | 'steady' | 'cover' | 'pullback' | 'holdfire', targets?, odds }], orders: [{ id, kind: 'steady' | 'cover' | 'seal' | 'open' | 'move' | 'hold', odds }] }`: what the hand may do this turn. Pull back only when the hand has not moved; seal and open only for our pilot and engineer, from anywhere.
  - `planSuggestOdds(state, level, opinion, intent) -> 0..1`: the ship fight's rule (trust, level, what the decks show, nerve).

- [ ] **Step 1: Write the failing tests:** pull back is not offered after a move; seal is offered only for the pilot and the engineer; the captain falls back to the bridge when ours are fewer and a cautious nerve; a suggestion's odds rise with level.
- [ ] **Steps 2 to 5:** as above.

### Task 6: The turn

**Files:** Modify `js/deckplan.js`; test `tests/deckplan.test.js`.

**Interfaces:**
- Consumes: `REPEL_HURT`, `DECK.SUIT`, `DECK.CASUALTY`, `DECK.ASSAULT`.
- Produces: `planTurn(state, { move, act, order }, shown, rand) -> { state, events }`, where `shown` is Task 4's move and our crew's, resolved in this order: moves; fire along `inLine` (each shooter one target, odds by level and the target spot's cover); the charge, unless one of theirs at the setter's spot was hit this turn; the wave on its turn; then the end check. Events carry who, where and what for the casualty rolls the screen makes (`deckLoss` stays in `js/fightui.js`), the hand's hurt roll (a shot of theirs aimed at the hand's spot), and the navy's heads put down.

- [ ] **Step 1: Write the failing tests:** a first hit wounds and a second downs; cover cuts the odds; the charge blows on the spot it was shown on, and does not when the setter's spot was hit; pull back takes everyone of ours at the hand's spot one step toward our bridge before the charge; the second wave lands at the end of `WAVE_TURN`; Hester wounded twice is downed, not killed (Review Focus 5); a friend takes the first hit meant for the hand, once a fight; boarding her, a hatch her crew sealed is cut by ours in a turn, as theirs cut ours.
- [ ] **Steps 2 to 5:** as above.

### Task 7: The end

**Files:** Modify `js/deckplan.js`; test `tests/deckplan.test.js`.

**Interfaces:**
- Produces: `planEnd(state) -> null | 'won' | 'taken' | 'searched'`, with the spec's meanings: the break line counts the wave still to land; our bridge is held when theirs stand on its spots with none of ours up there (Hester counts while up); boarding her, won when ours hold her bridge; caps at `PLAN.TURNS` (12) and `PLAN.NAVY_TURNS` (8).

- [ ] **Step 1: Write the failing tests:** each end, and that 400 seeded crew-only fights all end by the cap.
- [ ] **Steps 2 to 4:** as above; full suite PASS.
- [ ] **Step 5: Commit; push; PR 2.**

## Part 3: The screen, behind a setting (PR 3)

### Task 8: The setting and the start

**Files:**
- Modify: `js/menu.js` (`Settings.planFight`, default `false`; a settings checkbox, "Deck-plan boarding (in development)", `data-action="planFight"`)
- Modify: `js/boarders.js:97-101` (`deckStart`) and `js/fightui.js:318` (`deckOpen`)
- Test: `tests/deckplanui.test.js`

**Interfaces:**
- Consumes: `planFight` (Task 3), `boardLayout` (Task 1).
- Produces: `deckStart` builds `w = repelCrew()` and the party as today, then `state: Settings.planFight ? planFight({ lay: assault ? boardLayout(d.foe.shipId) : LAYOUTS.freighter, crew: ..., hand: ..., captain: ..., party, boarders, grade, assault, kitCover }) : deckFight(...)`; `deckOpen(s)` opens `planFightEvent(s)` or `deckFightEvent(s)` the same way. This fork is temporary and goes in Task 11.

- [ ] **Step 1: Write the failing test:** with the checkbox pressed, a raider's boarding opens the deck-plan scene (its title), and with it unticked today's; with every crewmate kept to their berth the deck-plan fight still opens (Review Focus 4).
- [ ] **Steps 2 to 5:** as above.

### Task 9: The cutaway scene

**Files:**
- Create: `js/deckplanui.js` (link after `js/fightui.js`)
- Modify: `js/hiredscenes.js` (`scene:fight` lines `plan.*`)
- Test: `tests/deckplanui.test.js`

**Interfaces:**
- Consumes: Tasks 3 to 7; `deckLoss`, `repelSettle`, `assaultSettle`, `shipTaken`, `abilityOdds`, `repelOrders`.
- Produces: `planFightEvent(s) -> event`: the spec's page. The cutaway on a canvas (decks in section, the well and hatches, spots with cover bars, figures with names); their move (red), our crew's (blue), the hand's choices (yellow: reachable spots ringed, `data-action="planMove"` with the spot id, as clickable buttons over the canvas for the keyboard and the tests); the side panel with "This turn", the acts (`data-action="planAct"`), the order (`planOrder`), the captain's order and the suggestion (`planSuggest`), the counts and break line, the last turn's events, the log folded, and Fight (`planFightGo`). After a turn, what happened stays marked. At an end, today's settles.

- [ ] **Step 1: Write the failing tests:** pressing a ringed spot, an act and an order shows them in "This turn" and on the ship; Fight resolves the turn; a charge shown on the ship is stopped by shooting its setter; the hand killed mid-turn stops the fight and queues the ending (Review Focus 3); a lost repel goes to `shipTaken` as today.
- [ ] **Steps 2 to 5:** as above; every new button pressed; full suite; PR 3.

## Part 4: Tuning and the targets (PR 4)

### Task 10: The fight tool and the soak targets

**Files:**
- Modify: `tools/fights.js` (`--plan`: play the deck-plan fight), `tools/answer.js` (`answerPlan(s)`: the policy that reads their drawn move)
- Create: `tests/distribution/deckplanfights.test.js`
- Modify: `js/deckplan.js` (`PLAN` numbers, tuned)

**Interfaces:**
- Produces: the spec's targets as assertions over stated seeds and samples, with fixed policies (stand and shoot, always fall back, always push, random) and `answerPlan`, plus the "rooms matter" check (the same policy with every spot's cover made equal).

- [ ] **Step 1: Write the soak test with the targets;** run it; expect some to FAIL.
- [ ] **Step 2: Tune `PLAN` with `node tools/fights.js --plan --deck-only --seeds 1,2,3,4 --n 400`** until they pass. If one cannot be met by tuning, stop and raise it with the owner.
- [ ] **Step 3: Run the soak file and the full suite,** PASS; record the measured table in `COMBAT.md`.
- [ ] **Step 4: Commit; push; PR 4.**

## Part 5: The switch-over and the old deck fight retired (PR 5)

### Task 11: Switch over and retire

**Files:**
- Modify: `js/boarders.js`, `js/fightui.js` (always the deck-plan fight; remove `deckFightEvent`, `deckTurn`, the strip and the Task 8 fork)
- Modify: `js/fight.js` (remove `deckFight`, `resolveDeckTurn`, `deckEnd`, `boardMove`, `advance`, `chargeAt` and the section chain `DECK.SECTIONS`, `ADJ`, `FORWARD`, `BACK`, `REACH`; keep the `DECK` numbers the new fight reads)
- Modify: `js/handtohand.js` (remove `fightStrip`, `baseCover`, `fightCover`; keep the abilities, `crewOrders`, `crewOrderOdds`, `HATCH_ORDER`)
- Modify: `js/menu.js` (remove `Settings.planFight` and its checkbox)
- Modify: `js/duel.js` (`repelEvent`, the owner who kept a post: the deck-plan fight, the captain's order at a steady nerve as a parameter)
- Modify: the old deck fight's tests, `tests/distribution/fights.test.js` (the navy cap check moves to the new cap's range, about 8), the pins that play it (`npm run pin:from`), `tools/fights.js`, `tools/answer.js`, `tests/actions.test.js`
- Modify: `COMBAT.md` (the deck fight section rewritten)
- Delete: `prototypes/boarding-spike.html`; update `prototypes/README.md`, or remove the folder if the radar fight's retirement already removed the rest

- [ ] **Step 1:** with the old fight in place, run the full suite, the editor suite and the soak; record what passes.
- [ ] **Step 2:** remove the old fight as listed; `node --test tests/globals.test.js tests/actions.test.js`, PASS.
- [ ] **Step 3:** a full-scope test that an owner who kept a post repels a raider on the deck plan, PASS.
- [ ] **Step 4:** full suite, editor suite, coverage floor (`npm run coverage -- --check`) and the soak, all PASS.
- [ ] **Step 5:** commit; push; PR 5.
