# Crew Origins Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A generated crew member from Earth or Ceres draws a place and a circumstance, and their sittings, visit home and room scenes are whole scenes written for it, with no blanks.

**Architecture:**
- `originOf(p)` draws a place and a circumstance from the person's id, without `Math.random`. It keeps the result on `p.origin`.
- `sitLines` and the visit and room lookups try the module's line table before the shared template.
- A module's table also sets the story's fields, so letters home, the favour and the look-back agree with the sittings.
- The words live in `js/peopletext.js` as `family:<city>-<circumstance>-<beat>` and `family:visit-home-<city>` and `family:room-offer-<city>` / `family:room-return-<city>`.

**Tech Stack:** Vanilla JS classic scripts, `node --test` with Playwright (`tests/helpers.js` `open()`), and the scene player (`tests/sceneplay.js`) for the lines check.

**Spec:** `docs/superpowers/specs/2026-11-03-crew-origins-design.md`

## Global Constraints

- Classic scripts in one global scope. No new top-level name may clash (`tests/globals.test.js`).
- The words are in line tables (`PEOPLE_LINES` in `js/peopletext.js`), not in code. Every line is read (`tests/scenelines.test.js`, `tests/talklines.test.js`).
- A module's lines carry no placeholder but `{n}`.
- They follow `docs/bible/voice.md`, rule 13 above all: a place's real streets, rooms and work, and nothing that could be anywhere.
- The draw uses no `Math.random`, so no other seeded draw moves. The effects pin must not change.
- No emojis.
- The heartbeat is updated at each step and never committed.
- Commits end with the session's attribution lines.
- The keys, from the spec:
  - `lisbon:wall`, `lisbon:oldcity`;
  - `lagos:mainland`, `lagos:ring`;
  - `rotterdam:southbank`, `rotterdam:polders`;
  - `chittagong:hills`, `chittagong:floors`;
  - `ceres:member`, `ceres:renter`.

## Review Focus

1. **A cast character** (Ines, Tomas, Cato, the full build's cast) never draws an origin, and keeps their own lines.
2. **A person whose story started before this change** (`p.story` set, no `p.origin`) draws on their next sitting. Their `left`, `rel` and `hope` already said in earlier scenes do not change under them: the module's fields apply only to a story made after the draw.
3. **A crew member from Luna, Mercury, Mars or another Belt body** gets the templates exactly as before, and the effects pin shows no change.
4. **A passenger or a bar patron** who is not crew is unaffected unless the sitting runs for them. The draw only happens in `storyOf`.
5. **The editor's preview** of a family scene still plays: a person with no origin, the old template.

---

### Task 1: Growing up here, in the bible

**Files:** Modify `docs/bible/lisbon.md`, `lagos.md`, `rotterdam.md`, `chittagong.md` and `ceres-coop.md`.

- [ ] **Step 1: Write a "Growing up here" section in each page** for its two circumstances. Each gives:
  - the household;
  - the rent or lease;
  - the work;
  - who is missed (a relation);
  - why people leave;
  - what they hope for.

  Add one or two assumptions to confirm on each page.
- [ ] **Step 2: Stop for the owner's approval of all five.**
- [ ] **Step 3: Commit.** Message: "Bible: growing up in the five places, for the crew's sittings (#871)".

### Task 2: The draw and the lookup

**Files:**
- Modify `js/family.js`: `storyOf`, `sitLines`, the visit lookup.
- Modify `js/room.js`: `roomSay`.
- Modify `js/game.js`: no `G` field is needed, since `origin` lives on the person.
- Test: `tests/origins.test.js` (create).

**Interfaces:**
- Produces:
  - `ORIGINS = { lisbon: { home: 'Earth', kinds: ['wall', 'oldcity'] }, lagos: {...}, rotterdam: {...}, chittagong: {...}, ceres: { home: 'Ceres Station', kinds: ['member', 'renter'] } }`;
  - `originOf(p) => 'city:kind' | null`, which sets `p.origin` once;
  - `moduleId(p) => 'city-kind' | null`;
  - `placeId(p) => 'city' | null`.
- A module's line table may have `fields.rel`, `fields.left`, `fields.hope` and `fields.detail`. `storyOf` uses them for a story it makes.

- [ ] **Step 1: Write the failing tests.**
  - `'an Earth crew member draws one of the four cities and a circumstance, a Ceres one draws Ceres, and others none'`:
    - make people with `home` set to `'Earth'`, `'Ceres Station'`, `'Luna'` and `'Mars'`;
    - assert `originOf` matches `/^(lisbon|lagos|rotterdam|chittagong):\w+$/`, then `/^ceres:(member|renter)$/`, then `null`, `null`.
  - `'the origin is drawn once, without Math.random, and kept through a save'`:
    - replace `Math.random` with a function that throws during `originOf`, and it still answers;
    - a second call gives the same answer;
    - after `save(); loadGame()` the person has the same `origin`.
  - `'a cast character draws no origin'`: `originOf(castPerson('ines')) === null`.
  - `'the lookup prefers a cast's lines, then the module's, then the template'`: with a stub table `PEOPLE_LINES['family:lisbon-wall-home']` present, assert `sitLines(p, 'home')` for a crew member with `origin: 'lisbon:wall'` is `'lisbon-wall-home'`; without it, `'story-home'`; and for Ines, `'ines-home'`.
  - `'an old story keeps what it said'`: a person with `p.story = { left: 'x', rel: 'y', hope: 'z', beat: 1 }` and no origin keeps them after `originOf`.
- [ ] **Step 2: Run them and see them fail.** `node --test tests/origins.test.js`.
- [ ] **Step 3: Implement.**
  - The draw: an integer hash of `p.id` (FNV-1a over its characters) picks the city among those whose `home` matches `p.home` (the four cities share `'Earth'`), and then the kind.
  - `storyOf` calls `originOf` before making a new story, and fills `left`, `rel`, `hope` and `homeDetail` from the module's `fields` when they are there.
  - The visit and room lookups use `familySay(PEOPLE_LINES['family:visit-home-' + city] ? 'visit-home-' + city : 'visit-home')`, and the same for the room scenes.
- [ ] **Step 4: Run the tests, then `npm run test:changed`.** Nothing else moves, since no module is written yet.
- [ ] **Step 5: Commit.** Message: "Crew: a place and a circumstance for the generated crew, and the lookup for their scenes (#871)".

### Tasks 3 to 7: one city each (Lisbon, Lagos, Rotterdam, Chittagong, Ceres)

**Files:**
- Modify `js/peopletext.js`: the city's two modules (`family:<city>-<kind>-home`, `-picture`, `-hope`, each with `title`, `text.0..2`, `c0.label`, `c0.result.*`, `c1.label`, `c1.result.*`, as `family:story-home` has, plus a `fields` entry on the `-home` table), `family:visit-home-<city>` and `family:room-offer-<city>` / `family:room-return-<city>`, with the same keys as the shared scenes.
- Modify `tests/sceneplay.js`: a case for each module's three sittings and for the city's visit and room, with a person given that origin.

- [ ] **Step 1: Write the failing test** in `tests/origins.test.js`: `'<city>'s scenes are whole: every module line has no placeholder but {n}, and each beat has its table'`. For each of the city's two kinds and each beat, assert `PEOPLE_LINES['family:<city>-<kind>-<beat>']` exists, and that no value matches `/\{(?!n\})\w+\}/`. Do the same for the visit and room tables.
- [ ] **Step 2: Run it and see it fail.**
- [ ] **Step 3: Write the lines** from Task 1's section for the city, to `voice.md`, and add the scene player's cases.
- [ ] **Step 4: Run the test, `tests/scenelines.test.js` and `tests/talklines.test.js`.**
- [ ] **Step 5: Commit.** Message: "Crew: <city>'s sittings, visit home and room (#871)".

### Task 8: Pins, the full run, and the follow-up issue

- [ ] **Step 1: Write the pins and goldens again** (`PIN_WRITE=1`, `UPDATE_GOLDEN=1`), and read each diff.
  - The words pins gain the new cases, and change only where a generated crew member from Earth or Ceres now has a module.
  - The effects pin (`hired-scene-pin`) must not change.
  - Anything else is a bug.
- [ ] **Step 2: Run the checks.** `npm test`, `npm run test:editor` and `npm run coverage -- --check`.
- [ ] **Step 3: File the follow-up issue.** Luna, Mercury, Mars's domes, the other Belt stations and the outer moons: a bible page each, then its modules, on the lookup this issue builds.
- [ ] **Step 4: Commit.** Message: "Pins: the generated crew's sittings by place (#871)".
