# Chapter Two, Piece 1: The Start and the Co-op's Role Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A finished chapter one goes on into chapter two: the player picks the master from three the lender sends, and flies, trades, takes contracts and fights the Ore Runner as the co-op, with last-seen prices.

**Architecture:** The hand's record (`st.hired`) carries on with `chapter: 2`; `roleOf` gives a third role, `ROLES.coop`, and chapter one's own machinery returns early at its edges on `chapterOf(st) > 1`. The masters are `js/captains/` entries the existing captain code reads; the owner board and the exchange open to the co-op through `role()`. The hand's fights run unchanged with the master as the captain.

**Tech Stack:** Vanilla JS classic scripts, canvas; `node --test` with Playwright (`tests/helpers.js` `open()`), Node context tests (`tests/nodecontext.js`).

**Spec:** `docs/superpowers/specs/2026-11-07-chapter-two-start-design.md`

## Global Constraints

- `chapterOf(st)` = `(st.hired && st.hired.chapter) || 1`.
- `ROLES.coop`: `canTrade: true`; `mayTab` all but `'company'`; `mayAct` all but `COOP_BARRED = ['buyship', 'cbuy', 'buyout', 'sellout', 'hire', 'interviewHire', 'dismiss']`; `decides: () => true`; `paysFrom: () => 'credits'`; `mayDowntime` the hand's; `canDie: true`.
- Masters' cards: saran `{ trade: 3, nerve: 3, thrift: 4 }`, kessler `{ trade: 4, nerve: 2, thrift: 5 }`, mensah `{ trade: 2, nerve: 5, thrift: 2 }`, belanger `{ trade: 3, nerve: 4, thrift: 2 }`; `leans` `'tycho'`, `'lender'`, `'kaur'`, `'ballast'`. Their text from `docs/bible/people/{saran,kessler,mensah,belanger}.md`.
- `MASTERS = ['saran', 'kessler', 'mensah', 'belanger']`; three are sent, drawn with the co-op's own dice (`coopRand(st)`), never `Math.random`.
- The ship: `st.shipId = 'lightfreighter'`, fuel and armor full, `st.condition = { ...USED_CONDITION }`, no outfits or torpedoes, empty hold, named "Ore Runner".
- Crew: who came keeps their role; Bexa (`castPerson('bexa')`, role `'icehand'`) and Pax (`castPerson('pax')`, role `'gunner'`) join; the hand keeps the guns (`postHolder('gunner')` is the hand); empty berths stay empty; the master is not in `st.crew`.
- The co-op's fund is `st.credits` (piece 3 changes this). The hand's `h.share.owed` is unchanged in piece 1.
- `st.seen[planet] = { day, prices }`, save data on the state.
- Code rules (CLAUDE.md): new logic takes its state as parameters; unique top-level names (`tests/globals.test.js`); a chapter-one-only system gets one `chapterOf(...) > 1` return at its edge, not a fork inside; no `hired()` fork added; no emojis.
- Test command: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test`; also `npm run test:editor` (the scene list gains a scene) and `npm run coverage -- --check` if `node -e "const f=require('./tools/floor.js');const fl=require('./tools/coverage-floor.json');console.log(f.touchesFloor([<files>],fl))"` says true.

## Review Focus

1. A chapter-two save reloaded mid-burn or landed: it reopens as chapter two (the co-op's role, the master aboard), not on the chapter-over scene and not as a hand on wages.
2. A hand who signed with nobody coming along (Tomas, Cato and Ines all stayed): chapter two starts with Bexa, Pax and the master only; the bosun's (`xo`) and the pilot's posts empty; flying, landing and a fight work with no pilot (the autopilot falls back to the player's hands).
3. A fight in chapter two that ends the hand's life (`role().canDie`): the run ends as in chapter one, with no chapter-one close (the share offer, the chapter end) played.
4. Landing at a port with no exchange or no board in chapter two: no free refuel, no wage, no errands board; the Port page shows the owner board only where `services` has `'trade'`.
5. The masters left out of chapter one: a new game's captain pick (`pickCaptainKey`) never returns a master, in the narrow build and in `scope: 'full'`.

---

### Task 1: The co-op's role

**Files:**
- Modify: `js/role.js`
- Test: `tests/role.test.js`

**Interfaces:**
- Produces: `ROLES.coop` (keys as `ROLES.hand`), `COOP_BARRED: string[]`, `roleOf(hand)` (coop when `hand && hand.chapter === 2`), `chapterOf(st) -> number`.

- [ ] **Step 1: Write the failing tests** in `tests/role.test.js` (load `COOP_BARRED`, `chapterOf` too):

```js
test('a chapter-two record gives the co-op\'s role: it flies and trades, and buys no ship, runs no company and hires nobody', () => {
  const coop = roleOf({ post: 'gunner', chapter: 2 });
  assert.equal(coop, ROLES.coop); assert.equal(coop.id, 'coop');
  assert.deepEqual(Object.keys(coop).sort(), Object.keys(ROLES.hand).sort(), 'the same questions');
  assert.equal(coop.canTrade, true); assert.equal(coop.canDie, true);
  assert.equal(coop.mayTab('trade'), true); assert.equal(coop.mayTab('company'), false);
  for (const a of ['takeoff', 'plot', 'burn', 'buy', 'sell', 'refuel', 'repair', 'torpbuy']) assert.equal(coop.mayAct(a), true, a);
  for (const a of COOP_BARRED) assert.equal(coop.mayAct(a), false, a);
  assert.equal(coop.decides({ via: 'ship' }, 'gunner'), true); assert.equal(coop.paysFrom(), 'credits');
  assert.equal(coop.mayDowntime('drills', {}, 'gunner'), ROLES.hand.mayDowntime('drills', {}, 'gunner'));
});
test('the chapter is read from the hand\'s record', () => {
  assert.equal(chapterOf({ hired: null }), 1); assert.equal(chapterOf({ hired: { post: 'gunner' } }), 1); assert.equal(chapterOf({ hired: { chapter: 2 } }), 2);
});
```

- [ ] **Step 2: Run** `node --test tests/role.test.js`. Expected: FAIL (`COOP_BARRED` / `ROLES.coop` undefined).
- [ ] **Step 3: Implement** in `js/role.js` per Global Constraints.
- [ ] **Step 4: Run** `node --test tests/role.test.js tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Chapter two: the co-op's role (#891)"`

### Task 2: The masters

**Files:**
- Create: `js/captains/saran.js`, `js/captains/kessler.js`, `js/captains/mensah.js`, `js/captains/belanger.js`
- Modify: `index.html` (load them after the other captains), `js/captains.js` (`MASTERS`, `masterDraw`, `coopRand`, `pickCaptainKey`)
- Test: `tests/captains.test.js`, a new `tests/masters.test.js` (Node)

**Interfaces:**
- Produces: `CAPTAINS.saran` etc. (fields of a captain entry, `master: true`, `leans`, no `xo`); `MASTERS`; `coopRand(st) -> () => number` (mulberry32 seeded by an FNV hash of `st.hired.signed` and the hand's name, kept in `st.hired.coopRng`, as `shipRand` keeps `t.lifeRng`); `masterDraw(rnd) -> string[3]`.
- `pickCaptainKey` draws from the keys without `master` (it still draws once, so the random stream stays the same).

- [ ] **Step 1: Write the failing tests.** Node, `tests/masters.test.js`: `masterDraw` with a seeded rnd returns three distinct keys, each in `MASTERS`, and the same three for the same seed; over seeds 1..40 every master is sent at least once. Page, `tests/captains.test.js`: the existing completeness test passes for the four (it must skip the `xo` check where `master` is set); `pickCaptainKey()` over 50 draws in `scope: 'full'` returns no key whose entry has `master` (Review Focus 5).
- [ ] **Step 2: Run** `node --test tests/masters.test.js tests/captains.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement.** Each entry's `intro`, `chatter` (at least six lines) and `sway` in the voice of its bible sheet; `wage`: saran 800, kessler 850, mensah 750, belanger 600; `hears`, `bonus`, `talk` as the four chapter-one captains range them.
- [ ] **Step 4: Run** the Step 2 command and `node --test tests/globals.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Chapter two: the lender's four masters (#891)"`

### Task 3: Going on: the record, the crew and the start

**Files:**
- Modify: `js/hired.js` (`signOn`, `chapterOverScene`, new `goOn`, `chapterTwoCrew`, `chapterTwoShip`), `js/game.js:157` (a finished save), `js/hiredscenes.js` (`scene:chapter-two-start` in the registry and its lines; `scene:chapter-over`'s label "Go on")
- Test: `tests/coop.test.js`, new `tests/chaptertwostart.test.js`, pins (`tests/scenepin.test.js` or the pin file that holds `scene:chapter-over`)

**Interfaces:**
- Consumes: `masterDraw`, `coopRand`, `captainPerson`, `castPerson`, `chapterOf`.
- Produces: `signOn` leaves `st.hired` with `chapter: 2`, `share`, `came`, `signed`, and no `career.finished`; `chapterTwoShip(st)` (the ship per Global Constraints); `chapterTwoCrew(st, h) -> string[]` (crew ids); `goOn(st)` (rebuilds `st.hired` from `st.career` for an old finished save, then sets `h.masters = masterDraw(coopRand(st))` and opens `chapterTwoStartScene()`); `chapterTwoStartScene()` (choices one per `h.masters` entry; a choice sets `h.captainKey`, `h.captain = captainPerson(key).id`, then lands the player at Ceres Station with `G.offers` drawn); `finishedSave()` true only for an old save (`career.finished` and no `st.hired`) or a chapter-two record with no `h.captain` yet.

- [ ] **Step 1: Write the failing tests** (`tests/chaptertwostart.test.js`, earth-hired, reusing `coop.test.js`'s `handWithDeal` setup moved to a shared helper in the test file):
  - `signing the share and going on: three masters, one picked, the Ore Runner with Bexa and Pax aboard`: sign at Ceres (`buyInAsk`/`buyInGo` on `USED_ID`), play the chain to the chapter-over scene, choose "Go on": the start scene's choices are three masters' names; choose the first: `chapterOf(G.state) === 2`, `hiredCaptain().captainKey === h.masters[0]`, `G.state.shipId === 'lightfreighter'`, crew includes `c:bexa` (role `icehand`) and `c:pax` (role `gunner`), `postHolder('gunner')` is the hand, `G.state.planet === 'Ceres Station'`, `role().id === 'coop'`.
  - `an old finished save goes on the same way`: `G.state.career = { ...careerOf(hired()), came: [], finished: true, share: {...} }; G.state.hired = null; save()`, reload, "Go on": as above.
  - `a hand who came alone starts with Bexa, Pax and the master` (Review Focus 2): `came: []`; crew is exactly Bexa and Pax; `roleHolder('pilot')` null; take off and land at Ceres without an error.
  - `a chapter-two save reloads as chapter two` (Review Focus 1): after the pick, `save()`, reload: no dialog open, `role().id === 'coop'`, the master aboard.
- [ ] **Step 2: Run** `node --test tests/chaptertwostart.test.js tests/coop.test.js`. Expected: FAIL (coop.test's `hired: null` and `finished: true` assertions change: update them to the new record in this step).
- [ ] **Step 3: Implement.** The start scene's text: the members at the Ore Runner's ramp at the Ceres yard; the lender's letter with three names; each master's intro line (from their entry) as a paragraph; a choice per master labelled with their full name; the result has Ines at the pilot's seat when she came (a line without her otherwise) and the master's first words. Lines live in `hiredscenes.js` under `scene:chapter-two-start` and are written in the voice of `docs/bible/voice.md`.
- [ ] **Step 4: Run** the Step 2 command, then `npm run pin:from -- <the pin file for chapter-over>` for the changed label and add a pin for `scene:chapter-two-start` (seeded), then `npm run test:editor`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Chapter two: going on, the master's pick and the Ore Runner's crew (#891)"`

### Task 4: Chapter one stops at its edges; the co-op gets the board and the exchange

**Files:**
- Modify: `js/hired.js` (the `landed` handlers at `:646`-`:658`: free refuel, `settleRun`, `arrivalPending`, `dealCheck`, `restockTorps`, `errandsFor`; `buyInHtml`/`canBuyIn`; `chapterEnd`), `js/tutorial.js` (`tutorialSteps`/`tutorialOn`), `js/ownerboard.js` (`ownerHasBoard`, `takeContract`, `settleContract`: `role().canTrade` in place of `!hired()`), `js/bridge.js` (`tabReady`, the shipyard view at `:246`: `shipyardView` for the co-op, ships for sale not listed when `!role().mayAct('buyship')`), `js/shell.js` (the exchange tab), and whatever the leak test names
- Test: `tests/chaptertwostart.test.js`

**Interfaces:**
- Consumes: `chapterOf`, `role()`, Task 3's start.
- Each chapter-one system gains one `if (chapterOf(G.state) > 1) return <its empty value>;` at its start.

- [ ] **Step 1: Write the failing tests** (same file, after a Task 3 start):
  - `the co-op takes a contract from the board and is paid into the fund`: the Port page has the owner board (`data-action="takeContract"`); take one; fly it (set `G.transit` and step to arrival, as `tests/chaptertwo.test.js` does for the owner board); on landing `st.credits` rose by the paid amount; no wage note; `h.fund` unchanged.
  - `the co-op trades on the exchange`: the Exchange tab is ready at Ceres; `UI.act('buy', <a good>)` buys into the hold from `st.credits`.
  - `the leak test: a chapter-two loop plays nothing of chapter one's own` (Review Focus 3, 4): a seeded loop of three runs (land, take a contract, burn with a forced raid via the ladder, land, sell) records every opened scene id and every note; none is `scene:used-ship-offer`, `scene:chapter-end`, `scene:chapter-over`, a tutorial step, or a pay-day line; no landing tops up fuel for free; and with `role().canDie`, a hand killed in the raid ends the run with no chapter-one close.
- [ ] **Step 2: Run** `node --test tests/chaptertwostart.test.js`. Expected: FAIL, naming the leaks.
- [ ] **Step 3: Implement** the edge returns and the `role()` gates until the leak test is green; record each system closed in the commit message.
- [ ] **Step 4: Run** the full test command. Expected: PASS (chapter one's tests unchanged).
- [ ] **Step 5: Commit** `git commit -m "Chapter two: chapter one's machinery stops at its edges; the board and the exchange are the co-op's (#891)"`

### Task 5: Last-seen prices

**Files:**
- Modify: `js/market.js` (`seenPrices`, `bestSeen`), the Exchange view (`js/ui.js`), the map hover/selection (`js/game.js`, beside the map's labels), the `landed` hook that records (`js/market.js` Mods block or `js/hired.js`, whichever already listens)
- Test: `tests/market.test.js` (Node), `tests/chaptertwostart.test.js`

**Interfaces:**
- Produces: `seenPrices(st, planet, day, priceOf) -> void` (writes `st.seen[planet.name] = { day, prices: { [cid]: priceOf(planet, cid) } }` for every good the planet prices); `bestSeen(st, cid, here) -> { planet, price, age } | null` (the highest last-seen price for `cid` at a port other than `here`, with `age` in days from `st.day`).

- [ ] **Step 1: Write the failing tests.** Node: `seenPrices` twice for the same planet keeps the later day; `bestSeen` picks the highest of two other ports and never `here`, and returns null with nothing seen. Page: landing at Ceres then Pallas in chapter two, the Exchange at Pallas shows, under a good priced at Ceres, "Ceres Station <price>, <n> days ago".
- [ ] **Step 2: Run** `node --test tests/market.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement**; the record is made on every landing at a port with an exchange, in chapter two only (the hand does not trade); the map shows "prices <n> days old" for a hovered or selected system with a seen port.
- [ ] **Step 4: Run** `node --test tests/market.test.js tests/chaptertwostart.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Chapter two: last-seen prices on the exchange and the map (#891)"`

### Task 6: The soaks measure chapter two

**Files:**
- Modify: `tests/distribution/fights.test.js`, `tests/distribution/pacing.test.js`

**Interfaces:**
- Consumes: Task 3's start (a seeded chapter-two state), Task 4's board.

- [ ] **Step 1: Add a chapter-two case to each**: fights: the share of raids in a 60-day chapter-two run that end in loss of hull below a quarter, a crew death, or the hand's death; pacing: credits a day over 60 days on the board. Mark each band `// to be set by the owner from the measured figures (#891)` with a wide provisional band (0 to 1 for shares, 0 to 10,000 a day) so the files pass.
- [ ] **Step 2: Run** `npm run soak -- tests/distribution/fights.test.js tests/distribution/pacing.test.js` (in the background; each takes minutes). Expected: PASS, printing the measured figures.
- [ ] **Step 3: Report** the figures to the owner for the bands; set them when given.
- [ ] **Step 4: Commit** `git commit -m "Chapter two: the fights and pacing soaks measure the co-op's runs (#891)"`
