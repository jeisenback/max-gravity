# Wrecks and Salvage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The co-op's salvage and survey jobs. Wrecks and rocks are sites. A salvage job is a press-your-luck cutting of up to three sections, with Bexa's read, a take of goods and parts, risks, a story and onward leads. A survey is one scene. Pay comes on delivery, wreck parts become spares, and the supply is steady. The chapter 2 soak gets a co-op mode to tune it.

**Architecture:** A new `js/salvage.js`, loaded after `js/icerun.js`:
- It holds the wreck tables and the pure functions (state in, value out), plus the scenes and the board rows.
- `js/sites.js` gains the kinds, the seeding and replacement.
- `landAtSite` hands over by the site's kind.
- `js/ownerboard.js` shows the jobs beside the contracts, for the co-op only.
- `js/parts.js` gains the spares.
- `tools/chaptertwo-soak.js` gains a co-op mode.

**Tech Stack:** vanilla JS classic scripts. Tests are node:test: browser tests through `tests/helpers.js` `open()`, node tests through `tests/nodecontext.js`.

**Spec:** `docs/superpowers/specs/2026-11-13-wrecks-and-salvage-design.md` (#965).

## Global Constraints

- Chapter 2's co-op only (`role().id === 'coop'`). Chapter 1 and the parked owner game are untouched: no pin of chapter 1 may move.
- No draw of the game's dice in seeding, in the board's jobs, or in the wrecks' contents. Use the file's own seeded dice or `hash`. The cutting's risk roll is the game's `Math.random`, as a scene's roll is.
- The crew cuts, never the hand. A cutting injury goes in `st.injured` with no death roll; nobody dies cutting.
- New logic takes the state it reads; nothing new on `G`. New save fields: `st.sites[*].wreck`, `st.sites[*].gen`, `career().job`, `st.spares`.
- Every new top-level name is unique. `js/salvage.js` is linked in `index.html` and in `editor.js`'s script list, after `js/icerun.js`.
- Words go in `js/hiredscenes.js` (`scene:salvage`, `scene:survey`), registered, read by the scene-lines test, and pinned (additions only). No emojis.
- Run `npm test`, `npm run test:editor` and the chapter 2 soak before the PR.

## Review Focus

- **A save made before** (its `st.sites` with only ice rocks): wrecks and rocks are added the first time they are asked for, and no ice rock moves. The test goes in Task 1.
- **A full hold:** the take fills only the room there is, and an intact part goes to the spares, not the hold. The test goes in Task 4.
- **A reload on station mid-cutting:** the sections already cut stay cut and the approach does not play again. The test goes in Task 4.
- **A job whose deadline passes, or whose find was lost:** it ends unpaid, and the board offers jobs again. The test goes in Task 6.
- **Bexa or Pax not aboard:** the read comes from the engineer (else the bosun) in fewer words, and Pax's line and regard are skipped. The test goes in Task 4.

---

### Task 1: Wrecks and rocks as sites, seeded and replaced

**Files:**
- Modify: `js/sites.js`.
- Test: `tests/sites.test.js` (extend).

**Interfaces:**
- Produces:
  - `SITE_KINDS.wreck = { word: 'a wreck', color }` and `SITE_KINDS.rock = { word: 'a rock', color }`.
  - `WRECKS = 6`, `ROCKS = 3`, `WRECK_AU = [2.2, 3.6]`.
  - `sites(st)` adds the missing kinds to an existing `st.sites`. Ids are `site:wreck-<n>` and `site:rock-<n>`. A wreck site carries `wreck: { type, name, find, lead, cut: 0, lost: [] }`:
    - `type` is one of `WRECK_TYPE_IDS` (Task 2);
    - `find` is 1 to 3, the section that holds the client's find;
    - `lead` is the id of another wreck or null, set on about a third of wrecks;
    - every site carries `gen: 0`.
  - `replaceSite(st, id) -> site`. It re-seeds the site by the key and `gen + 1`: a new name, AU, angle and wreck, with `found: null`.

- [ ] **Step 1: Write the failing tests:**
  - six wrecks and three rocks between 2.2 and 3.6 AU, the same for a save and different between saves;
  - an `st.sites` holding only the three ice rocks gains the wrecks and rocks, and the ice rocks are deep-equal to before;
  - every wreck has a `type` in `WRECK_TYPE_IDS`, a `find` in 1 to 3, and its `lead` is null or another wreck's id;
  - `replaceSite` gives a new name or AU, `found: null` and `gen: 1`, and leaves the other sites as they were.
- [ ] **Step 2: Run** `node --test tests/sites.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** on `seedSites`' own dice (its LCG), seeded per kind and generation by `hash` of the key, the kind, the index and the generation.
- [ ] **Step 4: Run** `node --test tests/sites.test.js tests/icerun.test.js`. Expected: PASS, with the ice run untouched.
- [ ] **Step 5: Commit** `Sites: wrecks and rocks, seeded and replaced (#965)`.

### Task 2: The wreck tables and the cutting's numbers

**Files:**
- Create: `js/salvage.js`. Link it in `index.html` and in `editor.js` after `js/icerun.js`.
- Test: `tests/salvage.test.js` (node).

**Interfaces:**
- Produces:
  - `WRECK_TYPES`, keyed by type. Each entry has:
    - `names`: ship names, eight or more;
    - `goods`: which of `metal`, `industrial`, `equipment` the sections yield;
    - `finds`: the client's find, by kind: `recorder`, `cargo` or `proof`;
    - `clients`: the client names, by find kind.
  - The types are `orehauler`, `courier`, `raider` and `yacht`. `WRECK_TYPE_IDS = Object.keys(WRECK_TYPES)`.
  - `SECTION_RISK = [0.1, 0.25, 0.4]`, `CAREFUL = 0.5`.
  - `sectionRisk(depth, careful) -> number`: `SECTION_RISK[depth - 1] * (careful ? CAREFUL : 1)`.
  - `sectionTake(type, depth, careful, room) -> { good, tons }`: tons of 3, 5 or 8 by depth, halved when careful, at most `room`.
  - `sectionPart(wreck, depth) -> bool`: an intact part on section 2 of a third of wrecks and on section 3 of half of them, by `hash` of the name and the depth.
  - `riskOutcome(roll) -> 'hurt' | 'system' | 'lost'`: the kind of trouble on a failed roll, by thirds of the roll.
  - `readWord(risk, skill) -> 'clean' | 'some' | 'bad'`: Bexa's read of the true risk, shifted a band toward the truth by skill 3 or more. It never lies by more than a band.

- [ ] **Step 1: Write the failing tests:**
  - risk by depth and when careful;
  - the take's tons by depth, halved, and capped at the room;
  - `sectionPart` is deterministic, with no part on section 1;
  - `riskOutcome` gives each of the three kinds over the range;
  - `readWord`: for risk 0.1, 'clean'; for 0.4 with skill 3, 'bad'; and within a band of the truth for skill 0.
- [ ] **Step 2: Run** `node --test tests/salvage.test.js`. Expected: FAIL.
- [ ] **Step 3: Implement** the tables. The ship names and clients are in the voice; there are four types.
- [ ] **Step 4: Run** `node --test tests/salvage.test.js tests/globals.test.js tests/gfields.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Salvage: the wrecks' tables and the cutting's numbers (#965)`.

### Task 3: Salvage and survey jobs on the co-op's board

**Files:**
- Modify: `js/salvage.js` and `js/ownerboard.js` (`ownerBoardHtml`, plus a `takeJob` action).
- Test: `tests/salvage.test.js` (browser part). Use the co-op start helpers from `tests/chaptertwostart.test.js` (`toShare`, `goOnToBridge`, `coopAt`).

**Interfaces:**
- Consumes: Task 1's `sites` and `findSite`, and Task 2's `WRECK_TYPES`.
- Produces:
  - `jobsAt(st, planet, day) -> [job]`: at most one salvage and one survey, by `hash` of the port and the day, for unfound sites in reach (`burnFuel` against `st.fuel`). A job is `{ kind: 'salvage' | 'survey', site, client, find, sid, planet, deadline, pay }`:
    - `sid` and `planet` are the delivery port, the port of the board;
    - `deadline` is the day plus the travel out and back plus 10;
    - `pay` is 6,000 to 14,000 for salvage and 3,000 to 6,000 for a survey, by `hash`; Task 8 tunes them.
  - `takeJob(i) -> string`: refused if a contract run or a job is under way. Otherwise it sets `career().job = { ...job, taken: st.day, got: false, quality: null }`, calls `findSite`, sets `st.dest` to the site, and returns the line.
  - The board rows in `ownerBoardHtml` come after the contracts, on the view helpers, each with a "Take it" button.

- [ ] **Step 1: Write the failing tests:**
  - in the co-op at Ceres, the board shows at most one salvage row and one survey row, the same for a port and a day;
  - an owner's board shows none;
  - taking a salvage job finds the wreck (`found` set), sets `st.dest` to its id and `career().job.kind` to 'salvage';
  - with a contract under way the job is refused;
  - the row names the client, the wreck, its type and AU, the port, the deadline and the pay.
- [ ] **Step 2: Run** the test. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test tests/salvage.test.js tests/ownerboard*.test.js tests/chaptertwostart.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Salvage: jobs on the co-op's board (#965)`.

### Task 4: On station at a wreck: the approach and the cutting

**Files:**
- Modify:
  - `js/sites.js` (`landAtSite` hands over by kind);
  - `js/salvage.js` (the scenes);
  - `js/stay.js` (`nightLabel` at a wreck);
  - `js/hiredscenes.js` (the index entry `scene:salvage` and its lines);
  - `tests/sceneplay.js` (cases);
  - the pins.
- Test: `tests/salvage.test.js` (browser).

**Interfaces:**
- Consumes: Tasks 1 to 3, plus `fitPart`, `PART_QUIRKS`, `like`, `roleHolder`, `castPerson` (or the cast lookup for `bexa` and `pax`), `roleSkill`, `recordHand` and `beginStay`.
- Produces:
  - `salvageArrival(st, site)`: on landing at a wreck with `career().job` for it, or a lead found for it, it plays the approach once (`wreck.seen = true`) and begins a stay of `3 - wreck.cut` shifts (`'wreck'`).
  - `cutScene(site)`: the next section's scene.
    - Its text gives the section's piece of the history and Bexa's read (`readWord`); with no Bexa, the engineer's, else the bosun's, in fewer words.
    - Pax's line is shown when the read is not 'clean' and Pax is aboard.
    - The choices: `cut`; `careful`, from section 2 on; and `home`.
    - A cut adds the take to the hold (`st.cargo`) and, on `sectionPart`, a spare to `st.spares` (Task 7 reads it): `{ system: quirk.system, quirk: { ...quirk, from: 'off the wreck of the ' + name } }`.
    - The risk is rolled with `Math.random() < sectionRisk(...)`:
      - `hurt` puts a cutter in `st.injured` (Bexa or another crew member, never the hand, no death roll);
      - `system` takes 15 off one of the ship's systems' condition;
      - `lost` loses the take of this section.
    - On the find's section, if it is not lost, `job.got = true`. On the lead's section, `findSite(lead)` and a log line.
    - Regard: `home` or `careful` after a 'bad' read gives `like(bexa, +1, memory)`; a cut after Pax's line followed by `hurt` gives `like(pax, -1, memory)`.
    - `recordHand('wrecksCut')` once per wreck.
    - `wreck.cut` goes up by one after each section.
  - At a wreck, `nightLabel` reads `Cut into the wreck (section N)` and passing the night plays `cutScene`. When the cutting is done or the player hauls home, the dock button's departure is Task 6's.

- [ ] **Step 1: Write the failing tests:**
  - the approach plays once, and a reload on station does not play it again;
  - each shift plays `cutScene` for the next section;
  - `cut` adds the take within the hold's room, and with the hold full adds nothing to the hold but still adds a spare on a part section;
  - with a seeded roll: `hurt` injures a crew member and never the hand (no `hurtHand`); `system` lowers a system by 15; `lost` adds no take;
  - the find's section sets `job.got`; the lead's section finds the other wreck;
  - Bexa's read is shown; with Bexa not aboard, the engineer's;
  - Pax's line shows only for a non-clean read with Pax aboard;
  - the regard cases above;
  - `careful` is offered from section 2 on;
  - the scene-lines test reads every new line, and the scene pin is rewritten with additions only.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** The histories go in the voice: three pieces a type, two versions each, chosen by `hash` of the wreck's name.
- [ ] **Step 4: Run** `node --test tests/salvage.test.js tests/scenelines.test.js tests/hiredscenes.test.js tests/*pin.test.js tests/icerun.test.js`. Expected: PASS. Rewrite `tests/fixtures/scene-lines-pin.json` and `hired-scene-ids.json` with `PIN_WRITE=1`, and check the diff has additions only.
- [ ] **Step 5: Commit** `Salvage: the approach and the cutting (#965)`.

### Task 5: The survey at a rock

**Files:**
- Modify: `js/salvage.js`, `js/sites.js` (hand over a rock), `js/hiredscenes.js` (`scene:survey`), `tests/sceneplay.js`, and the pins.
- Test: `tests/salvage.test.js`.

**Interfaces:**
- Produces:
  - `surveyArrival(st, site)`: with a survey job for the rock, it plays `surveyScene` once.
  - `surveyQuality(skill, roll) -> 'poor' | 'fair' | 'good'`: by the margin of `roll` under `check(STAT_BASE, skill, 0)`.
  - The read is `roleSkill('pilot')`, or the hand's own if the hand flies. It sets `job.quality` and `job.got = true`.
  - `recordHand('rocksSurveyed')`.

- [ ] **Step 1: Write the failing tests:**
  - landing at the job's rock plays the survey once;
  - `surveyQuality` gives 'good' for a roll well under, 'poor' over, and 'fair' between;
  - `job.quality` is set;
  - the words are read and pinned.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** as in Task 4, and rewrite the pins. Expected: PASS.
- [ ] **Step 5: Commit** `Salvage: the survey at a rock (#965)`.

### Task 6: Leaving a site, delivery, the deadline, and the steady supply

**Files:**
- Modify:
  - `js/salvage.js`;
  - `js/hired.js` (`sail` from a site in chapter 2);
  - the co-op's departure from a site to the map's pick (a route plotted on the map at a site goes straight into the burn, as `sailHome` does);
  - `js/ownerboard.js` (the landing hook).
- Test: `tests/salvage.test.js`.

**Interfaces:**
- Produces:
  - `sailFromSite(st, sid, planetName) -> bool`: no takeoff; it sets `st.dest` and `st.route` and calls `enterTransit`. It is used when the co-op at a site plots a course.
  - `settleJob(st, planet) -> string`: on landing at `job.planet` with `job.got`:
    - pay goes to `st.credits`: in full by the deadline, half after it. A survey pays by `quality` (0.5, 1 or 1.4 of `pay`).
    - `recordHand('salvageDone')` for salvage.
    - The site is replaced (`replaceSite`), the job ends, and the log line says so.
  - On a new day past `job.deadline`, a job without `got`, or not yet delivered, ends unpaid with a log line.
  - A wreck with all three sections cut and no job for it is replaced when the ship leaves it.

- [ ] **Step 1: Write the failing tests:**
  - at a wreck with the cutting done, plotting a course to Ceres starts the burn with no takeoff;
  - landing at the client's port with the find pays in full, and after the deadline pays half;
  - a survey pays by quality;
  - the job ends and the wreck is replaced (a new `gen`, `found: null`);
  - past the deadline with no find, the job ends unpaid and the board offers jobs again;
  - a lead's wreck, cut out, is replaced on leaving.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test tests/salvage.test.js tests/chaptertwostart.test.js tests/icerun.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Salvage: leaving a site, delivery and the steady supply (#965)`.

### Task 7: Spares from wrecks

**Files:**
- Modify: `js/parts.js` (`spareFit`, `spareSell`), `js/wear.js` (`wearHtml` lists the spares).
- Test: `tests/parts.test.js` (extend).

**Interfaces:**
- Consumes: `st.spares` from Task 4, and `fitPart` and `partPrice`.
- Produces:
  - `spareFit(st, i) -> string`: fits spare `i` to its system as a used part with its quirk, at no cost; the system rises to 90 if lower. It removes the spare.
  - `spareSell(st, planet, i) -> string`: at a port with an outfitter, for `partPrice(0, 'used') / 2`. It removes the spare.
  - On the Engineering station, the spares list shows Fit, and Sell when docked at an outfitter, each with the quirk's words (`usedWords`).
  - Actions: `spareFit` and `spareSell`, gated by `role().mayAct('overhaul')`.

- [ ] **Step 1: Write the failing tests:**
  - fitting a spare fits the used part with its quirk, raises the system to 90 if lower, costs nothing, and removes the spare;
  - selling it at an outfitter pays and removes it; with no outfitter, no Sell button;
  - the list shows the quirk's words.
- [ ] **Step 2: Run.** Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `node --test tests/parts.test.js tests/stations.test.js`. Expected: PASS.
- [ ] **Step 5: Commit** `Parts: spares cut off wrecks, fitted or sold (#965)`.

### Task 8: The soak's co-op mode, tuning, and the floor

**Files:**
- Modify:
  - `tools/chaptertwo-soak.js`: `--coop` starts the co-op by the chapter two start, as the tests' `coopAt` does; `--salvage` takes a job when one is on the board and cuts with a fixed rule: cut sections 1 and 2, cut carefully on 3 unless the read is 'bad', home on a 'bad' read.
  - `js/salvage.js`: the numbers, if the soak says so.
  - `tools/coverage-floor.json`: `js/salvage.js`.
  - `ROADMAP.md`: a line under section 7.

- [ ] **Step 1: Run the co-op freight baseline.** Run `node tools/chaptertwo-soak.js --coop --seeds 1,2,3,4,5,6 --days 240`. Record the credits at 240 days.
- [ ] **Step 2: Run with salvage.** Run `node tools/chaptertwo-soak.js --coop --salvage --seeds 1,2,3,4,5,6 --days 240`. Expected: the mean credits at 240 within 15% of the baseline, with a wider spread across seeds. If not, scale the jobs' pay and the take's tons (never the risks' shape), and run again.
- [ ] **Step 3: Check the floor.** Run `npm run coverage` and add `js/salvage.js` at a little under its measured coverage. Then run `node tools/coverage.js --check`. Expected: no file under.
- [ ] **Step 4: Run the full suites.** Run `npm test` and `npm run test:editor`. Expected: PASS.
- [ ] **Step 5: Commit** `Salvage tuned by the co-op soak; on the coverage floor (#965)`.
