# Crew Structure Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Hester's ship carries the bible's crew (three officers, a bosun with first aid, the hand and two deckhands), and the hand is paid as a rating, with the chapter's length kept by a labelled stopgap price.

**Architecture:** The data does the work: the crew list, two per-captain fields (`xoTitle`, `xoPerk`), a `firstAid` flag that `roleHolder('medic')` falls back to, and the pay constants. The internal keys `xo` and `icehand` stay.

**Tech Stack:** Vanilla JS classic scripts, `node --test` with Playwright (`tests/helpers.js` `open()`), `tools/soak.js`.

**Spec:** `docs/superpowers/specs/2026-11-01-crew-structure-design.md`

## Global Constraints

- Classic scripts in one global scope; no new top-level name may clash (`tests/globals.test.js`).
- No `hired()` fork inside the hand's logic (`CLAUDE.md`).
- No emojis anywhere.
- Words in scenes live in their line tables (`sceneSay`, `PEOPLE_LINES`), not in code (`tests/talklines.test.js`, `tests/scenelines.test.js`).
- Writing follows `docs/bible/voice.md`.
- The heartbeat (`.claude/heartbeat.json`) is updated at each step and never committed.
- Commits end with the session's attribution lines.

## Review Focus

1. **An old save with a medic, quartermaster or cook aboard** still plays: they stay aboard, and the medic is found before Cato.
2. **An old save whose `hired.share` is 0.06** gets no share after the change: the pay reads `HIRED_SHARE`, not the save's field.
3. **Cato hurt or dead** means no first aid: the pivots lose the medic point, and a hurt hand is not treated.
4. **Cato's own pivot** never counts his own first aid.
5. **The owner game** (no hired captain) keeps "First officer" and the old perk text, because `xoTitle` and `xoPerk` fall back.

---

### Task 1: First aid falls back to the bosun

**Files:**
- Modify: `js/crew.js:12-13` (`roleHolder`)
- Modify: `js/captains/cato.js` (`CAST.cato`: `firstAid: true`; `catoHoldPoints`)
- Test: `tests/crew.test.js` (create if absent; follow `tests/captains.test.js`'s `open({ scope: 'earth-hired' })` pattern)

**Interfaces:**
- Produces: `roleHolder('medic')` returns the unhurt medic if there is one, else the unhurt crew member whose `CAST[p.cast].firstAid` is true, else `undefined`.

- [ ] **Step 1: Write the failing tests**
  - `'with no medic aboard, Cato holds the first aid'`: in a hired game with Hester, remove any medic from `st.crew`, then assert `roleHolder('medic').cast === 'cato'`.
  - `'a hurt Cato gives no first aid'`: set `st.injured[cato.id] = true`, then assert `roleHolder('medic') === undefined`.
  - `'a medic aboard is found before Cato'`: add a medic, then assert `roleHolder('medic').role === 'medic'`.
  - `'Cato's own pivot does not count his first aid'`: with no other medic, assert that `catoHoldPoints(false)` equals the hull point plus the hands point, with no medic point.
- [ ] **Step 2: Run them and see them fail.** Run `node --test tests/crew.test.js`.
- [ ] **Step 3: Implement.**
  - Make the fallback in `roleHolder` apply only when `role === 'medic'`.
  - Add `firstAid: true` to `CAST.cato`.
  - In `catoHoldPoints`, count the medic only if it is not Cato: `(m => m && m.cast !== 'cato')(roleHolder('medic'))`.
- [ ] **Step 4: Run the tests, then `npm run test:changed`.** Pins that record pivots and losses may change; leave them for Task 5.
- [ ] **Step 5: Commit.** Message: "Crew: the bosun holds the first aid when there is no medic (#879)".

### Task 2: The crew list, deckhands, the bosun's perk, the walk and the help

**Files:**
- Modify: `js/hired.js:14-15` (`CHAPTER_CREW` and its comment)
- Modify: `js/people.js` (`ROLE_NAMES.icehand` becomes "Deckhand"; `ROLE_PERKS.icehand`; `ROLE_PERKS.xo` reads `captainEntry().xoPerk` when it has one)
- Modify: `js/captains/hester.js` (`xoPerk: () => 'Runs the ratings and the rota, and holds the first-aid rating.'`)
- Modify: `js/captains/cato.js` (`CAST.cato.round`: the walk's keys) and `js/hiredscenes.js` (`scene:cato-round` lines)
- Modify: `js/help.js:17,39` (the first officer sentences)
- Test: `tests/crew.test.js`

**Interfaces:**
- Consumes: Task 1's `roleHolder('medic')`.
- Produces: `CHAPTER_CREW = [{ role: 'xo', skill: 2 }, { role: 'icehand', skill: 1 }, { role: 'icehand', skill: 1 }]`.

- [ ] **Step 1: Write the failing tests**
  - `'Hester's ship carries seven'`: `st.crew.length + 1` (the captain) is 7, and no crew member's role is `quartermaster`, `medic` or `cook`.
  - `'deckhands and the bosun's perk'`: `ROLE_NAMES.icehand === 'Deckhand'`, and `ROLE_PERKS.xo()` contains "first-aid rating".
  - `'with no hired captain, the first officer keeps its name and perk'`: in the owner game, `ROLE_NAMES.xo === 'First officer'`, and `ROLE_PERKS.xo()` is the old text.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
  - **The walk.** Drop the `medic` and `cook` stops. The `galley` stop becomes the rota, and the `hold` stop names the deckhands. Add Cato's first-aid kit to the `bill` stop. Write the new lines into `scene:cato-round` to `docs/bible/voice.md`.
  - **The help text.** "The bosun runs the ratings and the rota, and decides post swaps."
- [ ] **Step 4: Run the tests, then `npm run test:changed`.** Fix any test that names the removed roles on Hester's ship. Keep each such test's intent, and note it in the commit.
- [ ] **Step 5: Commit.** Message: "Crew: Hester's ship carries the bible's seven (#879)".

### Task 3: A rating's pay

**Files:**
- Modify: `js/hired.js`:
  - `HIRED_SHARE = 0`, `HIRED_WAGE = 500` (scaled), and a new `KIT_DEDUCTION = 30`;
  - the pay at :294-298, with the kit coming out before the hall's cut;
  - the pay note at :317-319;
  - `runTerms` at :557.
- Modify: `js/captains/hester.js`:
  - `wage: 500`;
  - delete `share`;
  - `intro` loses its share argument. Her line becomes "${wage} a day, less your kit. That's the whole of it."
- Modify: `js/captains/dov.js`, `js/captains/imre.js`, `js/captains/zoya.js`: `wage` scaled by 500/350 and rounded to 50; delete `share`.
- Modify: `js/character.js:58,150` (no share line; show the day rate and the kit), and `js/captains.js:118` (settling up's ledger line).
- Modify: `tests/captains.test.js:32` (the required fields drop `share`).
- Test: `tests/hired.test.js` (or the file that tests `arrive` pay; find it with `grep -ln "HIRED_SHARE\|toHall" tests/`).

**Interfaces:**
- Produces:
  - the pay is `wage = round(h.wage * days * hazard * lightDuty)`, then `kit = KIT_DEDUCTION * days`, then `toHall = min(debt, round((wage - kit) * DEBT_SHARE))`;
  - `st.credits += wage - kit - toHall`;
  - the ledger row gets `kit`, and `share: 0`.

- [ ] **Step 1: Write the failing tests**
  - `'a run pays the day rate less the kit, and no share'`: after one arrival, the credits rise by `wage - 30 * days - toHall`, and the note contains `less ${fmt(30 * days)} cr for your kit`.
  - `'an old save with a share signs for none'`: set `hired().share = 0.06` and arrive; the share paid is 0.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.** The pay reads `HIRED_SHARE`, not `h.share`.
- [ ] **Step 4: Run the tests, then the full `npm test`.** Pins will fail on pay; leave them for Task 5.
- [ ] **Step 5: Commit.** Message: "Pay: the hand is a rating, with a day rate less kit and no share (#879)".

### Task 4: The stopgap price

**Files:**
- Modify: `js/hired.js:22,407` (`HIRED_TARGET`, `USED_PRICE`)
- Modify: `docs/bible/README.md` (conflict 5: "Stopgap until #882: the Ore Runner's price is scaled so a rating's pay keeps the chapter's length.")

- [ ] **Step 1: Find the factor.** Scale `USED_PRICE` (good, mid, bad) by one factor `f`, rounded to 1000. Set `HIRED_TARGET = USED_PRICE.mid`. Run `node tools/soak.js --seeds 1,2,3,4,5,6 --legs 40 --captain hester` until the mean runs is 15 to 19 and no seed fails to reach the goal. Baseline: 16.7 runs, 133 days.
- [ ] **Step 2: Record it.** Put `f`, the mean runs and the mean days in the constant's comment: "stopgap until #882".
- [ ] **Step 3: Run `npm run soak`**, and note any distribution check that moves.
- [ ] **Step 4: Commit.** Message: "Pay: the Ore Runner's price as a stopgap for a rating's pay, until #882". The body gives the soak figures.

### Task 5: Pins, goldens and the full run

- [ ] **Step 1: Write every failing pin again** (`PIN_WRITE=1`), and the goldens (`UPDATE_GOLDEN=1` for `tests/views.test.js`).
- [ ] **Step 2: Read each diff.** Every change must be explained by Tasks 1 to 4:
  - who is aboard;
  - first aid by Cato;
  - the pay, the kit and the note;
  - the prices.

  Anything else is a bug; fix it.
- [ ] **Step 3: Run the checks.** `npm test`, `npm run test:editor` and `npm run coverage -- --check` must all pass.
- [ ] **Step 4: Commit.** Message: "Pins: the bible's crew and a rating's pay (#879)". The body lists what each pin's diff holds.
