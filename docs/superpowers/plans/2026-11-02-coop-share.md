# Co-op Share Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The hired chapter ends with the hand signing on for a member's share in the Ceres co-op's Ore Runner, not buying a ship, and the chapter then ends on an end-of-chapter screen.

**Architecture:** The deal, the offer and the spine (`dealScene`, `hullNote`, `lapseScene`) stay, with new words and figures. `buyIn` becomes `signOn`. The office is the yard page at Ceres Station only, and the planner's "wants a yard" becomes "wants Ceres". The close adds one last scene, whose choice returns to the title. A finished save reopens on that scene.

**Tech Stack:** Vanilla JS classic scripts, `node --test` with Playwright (`tests/helpers.js` `open()`), `tools/soak.js`.

**Spec:** `docs/superpowers/specs/2026-11-02-coop-share-design.md`

## Global Constraints

- Classic scripts in one global scope. No new top-level name may clash (`tests/globals.test.js`).
- No `hired()` fork inside the hand's logic (`CLAUDE.md`).
- A new field on `G` is declared in `js/game.js`. The finished mark lives on `st.career.finished`, not on `G`.
- The words in scenes live in their line tables (`sceneSay`, `PEOPLE_LINES`), not in code. They follow `docs/bible/voice.md`.
- No emojis.
- The heartbeat (`.claude/heartbeat.json`) is updated at each step and never committed.
- Commits end with the session's attribution lines.
- Figures, from the spec:
  - `SHARE_PRICE = 150000`;
  - `BUY_IN = { good: 51000, mid: 57000, bad: 63000 }`;
  - `HIRED_TARGET = BUY_IN.mid`;
  - the offer at `0.55 * BUY_IN.mid`;
  - `HIRED_DEBT = 9000`;
  - `DEAL_DAYS = 84` (unless the soak says otherwise);
  - the co-op's port is `COOP_PORT = 'Ceres Station'`.

## Review Focus

1. **A save in the middle of the deal from before this change** (`h.deal` open with an old price) still loads. Its price stands, and it can sign at Ceres.
2. **A save that bought the Ore Runner before this change** (`st.career` with `bought` but no `share`) loads into the owner play it had, not the end screen.
3. **The full build** (`scope: 'full'`) keeps the yard's ships and the old buy for an owner start. The owner game's own tests pass unchanged.
4. **A hand whose hall bond is unpaid at Ceres** sees the bond line and a disabled button, not a signing.
5. **Cato dead or put ashore before the signing** signs nobody in his name, and the close reads without him.

---

### Task 1: The co-op in the bible

**Files:**
- Create: `docs/bible/ceres-coop.md`
- Modify: `docs/bible/jurisdictions.md` (the co-ops line points to the page), `docs/bible/README.md` (the sections list; conflict 5 is marked resolved after Task 5), `docs/bible/people/cato.md` ("What he wants")

- [ ] **Step 1: Write the page.** Follow the spec's "The co-op" section, in the shape of `chittagong.md`:
  - the place and what it is;
  - who it owes;
  - where it stands;
  - the Ore Runner;
  - a member's share, with its figures;
  - Cato;
  - assumptions to confirm.

  Propose the co-op's name in the page's first line. Follow `voice.md`.
- [ ] **Step 2: Stop for the owner's approval of the page.** No code is written before it. Record the approved name in the ledger.
- [ ] **Step 3: Commit.** Message: "Bible: the Ceres co-op, its Ore Runner and a member's share (#882)".

### Task 2: The figures

**Files:**
- Modify: `js/hired.js:28-35` (`STOPGAP_FACTOR`, `HIRED_TARGET`, `HIRED_DEBT`, `ratingTerms`), `js/hired.js:420-421` (`USED_PRICE`, `USED_OFFER_AT`)
- Test: `tests/coop.test.js` (create, in `tests/crew.test.js`'s shape)

**Interfaces:**
- Produces:
  - `SHARE_PRICE`;
  - `BUY_IN` (the same keys as `USED_PRICE`: `good`, `mid`, `bad`), which replaces every reader of `USED_PRICE`;
  - `COOP_PORT`;
  - `HIRED_TARGET` and `HIRED_DEBT` with their values unchanged.

- [ ] **Step 1: Write the failing test.** `'the share's figures: a buy-in by the vote, the full share, and the rest owed'`. It asserts:
  - `SHARE_PRICE === 150000`;
  - `BUY_IN` deep-equals `{ good: 51000, mid: 57000, bad: 63000 }`;
  - `HIRED_TARGET === 57000`, `HIRED_DEBT === 9000`, `COOP_PORT === 'Ceres Station'`;
  - `typeof STOPGAP_FACTOR === 'undefined'`.
- [ ] **Step 2: Run it and see it fail.** `node --test tests/coop.test.js`.
- [ ] **Step 3: Implement.**
  - Rename `USED_PRICE` to `BUY_IN` at every reader (grep `js/`, `tests/`, `tools/`).
  - Write the figures as literals, with the spec's reasons in the comments.
  - `ratingTerms` keeps scaling an old save's bond by 0.3, now named `OLD_BOND_SCALE` beside it.
- [ ] **Step 4: Run the test, then `npm run test:changed`.** The values are unchanged, so nothing else should move.
- [ ] **Step 5: Commit.** Message: "Pay: the share's figures in place of the stopgap (#882)".

### Task 3: The offer and the lapse

**Files:**
- Modify: `js/hiredscenes.js` (`scene:used-ship-offer` lines: `tomas.*`, `broker.*`, `lapse.*`), `js/hired.js:427-465` (`dealScene` vars: add `share: fmt(SHARE_PRICE)`, `owed: fmt(SHARE_PRICE - price)`)
- Test: `tests/usedship.test.js`

- [ ] **Step 1: Write the failing tests.**
  - `'the offer is the co-op's: Tomas speaks for you, and the buy-in, the full share and the days are quoted'`: the offer text matches `/co-op/`, `/150,000/` and the buy-in, and `h.deal.price` follows Tomas's regard (`BUY_IN.good` for a friend, `BUY_IN.bad` below 0).
  - `'without Tomas the co-op's call is posted at the yard office, at the high buy-in'`.
  - `'a lapsed offer says the berths are filled'`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Write the lines** in `scene:used-ship-offer`, to `voice.md`. Rename the scene's `title` in the scene index (`hiredscenes.js:43`) to "The Co-op's Berths".
- [ ] **Step 4: Run them, then `npm run test:changed`.**
- [ ] **Step 5: Commit.** Message: "Co-op: the offer and the lapse are the Ceres co-op's (#882)".

### Task 4: The office at Ceres, and the planner

**Files:**
- Modify: `js/hired.js`:
  - `buyInHtml`: at `COOP_PORT`, one membership row; at another yard, the notice and no button; the yard's ships are not listed;
  - `canBuyIn`: needs `planet.name === COOP_PORT`;
  - `wantsYard`;
  - `planRun`: replace `c.yard` and `pl.services.includes('shipyard')` with `isCoop(planet)`;
  - the desc line at :581.
- Modify: `js/contracts.js:89-92` (`pickContract` takes `goal: c => boolean` in place of reading `c.yard`).
- Modify: `js/hired.js:631` (`buyInAsk` opens no yard-office scene for `USED_ID`) and `js/help.js` (the Dust Skiff line).
- Test: `tests/coop.test.js`, `tests/yardoffice.test.js`

**Interfaces:**
- Produces:
  - `isCoop(planet) => boolean`;
  - the page's button `data-action="buyInAsk"` / `buyInGo` stays, with id `USED_ID`, so Task 5's signing is reached by the same actions.

- [ ] **Step 1: Write the failing tests.**
  - `'the share is signed at Ceres only: another yard shows the notice and no button'`: at a non-Ceres yard with the deal open and the buy-in in hand, the page matches `/signed at Ceres/` and has no `buyInAsk` button. At Ceres it has one, and its label is "Sign on".
  - `'the yard's ships are not on the hand's page'`: no "Dust Skiff" row in the narrow build. With `scope: 'full'` and no hired hand, the yard lists them.
  - `'an unpaid bond at Ceres shows the bond and a disabled button'` (Review Focus 4).
  - `'the captain heads for Ceres with the buy-in in hand'`: with `wantsYard()` true, `planRun()`'s destination is Ceres when it is in reach, and a contract to Ceres is preferred.
  - `'asking for the share opens no haggle'`: `buyInAsk` with `USED_ID` sets `h.confirm` and opens no `scene:yard-office`.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement** as listed under Files. Words go in `scene:screens` lines (new keys `coop.row`, `coop.notice`, `coop.sign`, `coop.confirm`).
- [ ] **Step 4: Run them, then `npm run test:changed`.** `yardoffice.test.js` keeps its full-build cases. Its narrow-build cases for the used ship become "no haggle".
- [ ] **Step 5: Commit.** Message: "Co-op: the office at Ceres, and the captain heads there (#882)".

### Task 5: Signing, the close and the end screen

**Files:**
- Modify: `js/hired.js`:
  - `buyIn` becomes `signOn(id)`, with the old name removed from every caller;
  - `buyInCompanions` gets a Cato rule;
  - `chapterEnd`;
  - `chapterRecap` (the money line);
  - the `buyInGo` action: after the close, `chapterOverScene()`.
- Modify: `js/hiredscenes.js` (`scene:chapter-end`: title "A Member's Share", `cato.*` lines by regard, `owed`; new `scene:chapter-over`), `js/game.js` (`loadGame`), `js/menu.js` (`loadSlot`): a save with `st.career && st.career.finished` opens `chapterOverScene()` on landing.
- Modify: `docs/bible/README.md` (conflict 5 resolved).
- Test: `tests/coop.test.js`, `tests/chapter.test.js`

**Interfaces:**
- Consumes: `isCoop`, `BUY_IN`, `SHARE_PRICE` (Tasks 2 and 4).
- Produces:
  - `signOn(id) => string | undefined` (the note, as `buyIn` returned);
  - `st.career.share = { coop: COOP_PORT, buyIn, owed }`;
  - `st.career.finished = true`, set by the close's choice;
  - `chapterOverScene() => event`, whose one choice calls `Menu.showTitle()`.

- [ ] **Step 1: Write the failing tests.**
  - `'Cato signs on with you whatever he thinks of you, and the others who like you come too'`:
    - Cato at opinion -1 is in `buyInCompanions()`;
    - with Ines at `OPINION.CLOSE` both come;
    - with Cato dead (`st.people[id].dead`, out of `st.crew`), he is not, and the close's text does not name him (Review Focus 5).
  - `'signing takes the buy-in and keeps the share on the career'`: credits drop by `h.deal.price`, `st.career.share` deep-equals `{ coop: 'Ceres Station', buyIn: price, owed: SHARE_PRICE - price }`, `st.hired === null`, and `st.shipId` is unchanged from the captain's.
  - `'the close is A Member's Share, names Cato first and says what is owed'`.
  - `'after the close the chapter ends, and a finished save reopens on it'`: the chain ends with `scene:chapter-over`; its choice shows the title (`G.mode === 'title'`); `loadGame()` on a save with `career.finished` opens it.
  - `'a save that bought her before reopens as it was'`: `career` with `bought` and no `share` loads without the end scene (Review Focus 2).
  - `'an open deal from before signs at its price'` (Review Focus 1).
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
  - `signOn` keeps `buyIn`'s handling of the captain and the crew (who stay, who go), and drops the ship and outfit hand-over: the hand owns no ship.
  - The hand's ship view after signing is not reached, since `scene:chapter-over` follows at once.
  - In the full build (`!scopeNarrow()`), the old `buyIn` path for the yard's ships stays, behind `if (!hired()) return` gates, with no fork in the hand's code.
- [ ] **Step 4: Run them, then the full `npm test`.** Pins will fail on the words; leave them for Task 7.
- [ ] **Step 5: Commit.** Message: "Co-op: signing on, A Member's Share, and the end of chapter one (#882)".

### Task 6: The text that follows

**Files:**
- Modify:
  - `js/captains/cato.js` (the notebook scene :91-95, the farewell fact :65);
  - `js/help.js` (the "Your post, your pay and a ship of your own" topic: its title and lines);
  - the goal line (grep `ship of your own` and `HIRED_TARGET` in `js/` text);
  - `js/peopletext.js:1330` (the co-op's terms);
  - the look-back's `why.money` line.
- Test: `tests/help.test.js`, `tests/coop.test.js`

- [ ] **Step 1: Write the failing test.** `'the hand's text says a member's share, not a ship'`: in the narrow build, the help, the goal line and Cato's notebook text do not match `/ship of your own|buy a ship|Dust Skiff/`, and do match `/co-op/`.
- [ ] **Step 2: Run it and see it fail.**
- [ ] **Step 3: Write the lines,** to `voice.md`.
- [ ] **Step 4: Run it, then `npm run test:changed`.**
- [ ] **Step 5: Commit.** Message: "Co-op: the hand's text says a member's share (#882)".

### Task 7: Pins, goldens, the soak and the full run

- [ ] **Step 1: Write every failing pin and golden again** (`PIN_WRITE=1`, `UPDATE_GOLDEN=1`).
- [ ] **Step 2: Read each diff.** Every change must be explained by Tasks 2 to 6:
  - the offer's words;
  - the office;
  - Ceres in the planner's runs;
  - the signing;
  - the close;
  - the text.

  Anything else is a bug.
- [ ] **Step 3: The soak.**
  - Run `node tools/soak.js --seeds 1,2,3,4,5,6 --legs 40 --captain hester` against 17.7 runs and 144 days. A mean within 15 to 20 runs is the band.
  - If the length or the lapse rate moves out of it, tune `DEAL_DAYS` first, then the planner. Record each figure tried in the ledger.
  - Then run `npm run soak`.
- [ ] **Step 4: Run the checks.** `npm test`, `npm run test:editor` and `npm run coverage -- --check` must all pass.
- [ ] **Step 5: Commit.** Message: "Pins: the Ceres co-op's share (#882)". The body lists what each pin's diff holds, and the soak figures.
