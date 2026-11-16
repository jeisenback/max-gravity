# Testing what the player does and sees

Status: draft for the owner's review, 2026-11-16. From a review of the suite on main at `9cf6556` (197 test files, about 2,650
tests and 10,000 assertions) and a planted-bug run against it.

## The problem

The suite tests the game's rules well and the player's experience thinly. Six bugs a player would feel were planted in the game
one at a time, and the full suite was run for each, after one clean run (1,930 passed, none flaky):

| Planted bug | Tests that failed | How it was caught |
|---|---|---|
| Crew opinions move backwards (`like`, js/people.js) | 114 | broadly, through scenes and pins |
| The game never saves (`save`, js/game.js) | 22 | the save and load tests |
| Gun heat never bleeds in a fight (js/fight.js) | 10 | the engine's rule tests and the fight pin |
| Fight damage never reaches the hull (`fightTook`, js/fightui.js) | 6 | rule tests, such as "the yard bills the real armor lost" |
| "Sail with the captain" does nothing (`M.action('sail')`, js/hired.js) | 1 | by accident, in a freight-office test |
| Savings on the character page shown as 0 (js/character.js) | 1 | only the golden markup copy |

Behind the last two rows:

- **The buttons are mostly bypassed.** A browser test drives the page with `ev()` (tests/helpers.js), which runs game code
  directly, or with clicks. Across the 152 browser test files there are about 2,400 `ev()` calls and 710 clicks, and 107 files
  never click anything. Of the 112 player actions the game declares (`M.action` and `data-action`), 58 are clicked by some
  test. A button that stops working can pass the suite.
- **What the screen shows rests on golden copies.** A wrong number on a page is caught when it changes the saved HTML in
  `tests/fixtures`. Those copies are rewritten when markup changes on purpose (`tests/fixtures` changed in 111 of the last
  300 commits, 96 of them alongside game code), and a rewrite while editing that page can carry a wrong value with it.
- **Many assertions freeze today's tuning.** About 2,800 assertions compare against a literal number, and the fight engine's
  test changed in the same commit as the engine in 6 of its 7 recent commits. A test that is rewritten with every balance
  pass is updated to match, not read as a warning. Some tests already compute the expected value from the rule
  (`pool(230)` in tests/fight.test.js), and survive a retune.

## Goals

- A player-visible failure (a dead button, a wrong number on screen, a broken loop) fails a test that is about it, not by
  accident.
- Each new piece is small, mechanical where it can be, and runs in the existing tools (`node --test`, tests/helpers.js,
  the nightly workflow).
- Nothing existing is rewritten for this. Old tests move to the new rules when they are opened for another reason, as
  CLAUDE.md already asks of modules and page markup.

## Not in scope

- Replacing the pins, the golden copies or the engine tests. They catch what they were built for.
- Raising the coverage floor. Line coverage does not see the gap: `sail()`, the function the Sail button calls, is run by
  many tests that call it directly, so it counts as covered while the button itself goes untested.
- Fixing `npm run test:changed`, which selected about 180 files for each one-line game change. That is filed as its own issue
  once this spec is agreed.
- The scene editor's suite (`tests/editor*.test.js`), which is already click-driven.

## The pieces

### 1. Every button is pressed by a test (tests/actions.test.js)

A check in the normal suite, beside tests/globals.test.js. It reads every player action the shipped build declares (`M.action`
names and `data-action` values in `js/`), and every test file's clicks and key presses on a `data-action` selector, and fails
naming each action no test presses.

- An action may be exempt, listed in the test file with its reason: the parked owner game (`buy`, `sell`, `interview`, the
  yard's purchases), the tester tools in js/uat.js, an action only the full scope (`scope: 'full'`) shows.
- Only a press counts. Naming the selector to check that a button is absent does not.
- A key binding that triggers an action (Sail on T) counts as a press of that action when the test presses the key.

Done when: the check is in `npm test`, every non-exempt action in the narrow build is pressed by some test, and a new
`M.action` with no test fails the suite with its name.

### 2. Player paths (tests/journey-*.test.js)

Four or five tests of the narrow build's core loop, played only through the interface:

1. Sign on as a hired hand and reach the port screen.
2. Sail with the captain, reach the burn view, arrive.
3. A ship fight played through the panel's buttons to an end.
4. A boarding repelled through the deck panel's buttons.
5. Back in port: the damage on the ship page, the pay in the hand's savings; save, reload, and the same screen.

Rules for a journey test, stated at the top of each file:

- After setup, the test acts only by clicking, pressing keys and typing.
- It asserts on what the screen shows (`innerText` of the panels, a button's presence or state), never on `G`.
- `ev()` is allowed for setup before the first action (seed, scene skipped to reach a fight) and nowhere else.
- Each runs in under a minute, so the five together add about as much as one of today's large files.

Done when: the five pass on main, and planting the "Sail does nothing" bug fails journey 2 by name.

### 3. A golden copy's key numbers are also checked against the game

For each page with a golden copy in `tests/fixtures`, the test that compares it also asserts the page's key numbers against the
game's state, read from the screen: the savings shown equal the hand's credits, the hull shown equals the ship's armor, the pay
shown equals the contract. Then a rewritten copy cannot carry a wrong number past the suite.

Done when: each golden-copy test names its page's key numbers and checks them against the state, and planting the
"savings shown as 0" bug fails a test about savings, not only the copy.

### 4. The planted-bug run as a tool (tools/mutants.js)

What the review did by hand, kept:

- `tools/mutants.json` lists planted bugs: a name, a file, the text to find (once), its replacement, and the least number of
  tests that must fail (`min`, default 1). It starts with the six above.
- `node tools/mutants.js` runs the suite once clean, then once per bug with the file changed and restored by `git checkout`, and
  prints for each bug how many tests failed and which. It exits non-zero when a clean run fails or a bug is caught by fewer than
  its `min`.
- It runs nightly beside the soak (`.github/workflows/soak.yml`), one runner per bug, and by hand from the Actions page. The
  review's run took about five to eight minutes a bug on four cores.
- A new feature adds one planted bug for the behavior it is most about. When its tests mostly bypass it, the nightly run says so.

Done when: the tool runs the six from the review and reports them caught; a bug removed from the game's code (its text no
longer found) fails the run naming it, so the list cannot rot silently.

### 5. Tuning is asserted through its rule (CLAUDE.md, Tests)

One rule added to CLAUDE.md: a test asserts a tuned number through its constant or formula (`pool(230)`, `FIGHT.HEAT_VENT`),
and keeps a literal only for a value the owner has ruled on, with the ruling's issue in the message. Applied when a test is
opened for another reason; no sweep.

Done when: the rule is in CLAUDE.md.

## Order

1 and 4 first: both are mechanical, and 4 shows whether 2 and 3 work. Then 2, then 3, then 5. Each is its own pull request.

## Open questions for the owner

- Nightly cost: six bugs at five to eight minutes each is about 45 runner-minutes a night, growing with the list. Run every
  bug nightly, or a rotating handful?
- Exemptions in piece 1: is the parked owner game's whole set of actions exempt, or only those the narrow build hides?
- Journey 5 reloads a save: is a reload in the middle of a test acceptable, or should save and reload stay in tests/saves.test.js?
