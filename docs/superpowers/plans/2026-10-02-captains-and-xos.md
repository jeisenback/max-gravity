# Captains and XOs: Hester and Cato Implementation Plan

> **For agentic workers:** execute task by task in this session (superpowers:executing-plans). Steps use checkbox (`- [ ]`) syntax.

**Goal:** A hired game is run by one of the authored captains with an authored, fragile first officer, and Hester Vance with Cato Rahman works end to end. The registry takes the other three pairs as data later (#148 to #150).

**Spec:** `docs/superpowers/specs/2026-10-02-hired-chapter-design.md`, sections "Captains" and "XOs". Issue #147.

## Shape

- **Captains** live in `CAPTAINS` (`js/captains.js`), one file each under `js/captains/`. Their person record is built from the entry and carries `captainKey`.
- **XOs** are `CAST` entries marked `xo: true, fragile: true` (`js/captains/cato.js` assigns `CAST.cato`), so `castPerson`, `castFate`, the scene sequence (`castNext`: intro, mid1, mid2, late, pivot) and the authored story (#139) all work unchanged. An XO joins the roster through `setupHired`, not through `CAST_PAIRS`.
- A hired save with no `captainKey` keeps today's generated captain and crew.

## Parts

Part 1 is mechanics, with only bios and stats as text. Part 2 is the voice check: Hester's introduction and chatter, one shared event and Cato's first scene, shown to the owner before the rest is written. Part 3 is the rest of the prose.

### Part 1: mechanics

- [ ] **Task 1: registry, selection, person record.** `js/captains.js` (`CAPTAINS`, `captainEntry()`, `captainPerson(key)`, `pickCaptainKey()` through the seeded `pick`), `js/captains/hester.js` and `js/captains/cato.js` (identity, traits, stats, pay, thresholds, bio, wants and fears, and for Cato `scenes: {}`), linked in `index.html` after `js/cast.js`. `setupHired` builds the captain from the entry, puts the XO aboard in the generated `xo` slot with `castRec(key).since = day`, and stores `st.hired.captainKey`. `authoredStory` also reads captains. Tests: selection is deterministic for a seed, the record is built from the entry, an old save (no `captainKey`) is untouched, Cato is fragile and aboard, entries are complete and emoji-free.
- [ ] **Task 2: styles drive the run.** `trade` sets how close to the best run `planRun` takes (5: best, 3: one of the top two, 1: one of the top four, through the seeded `pick`); `nerve` sets whether high-pirate or unrest lanes are accepted and the weight on fighting choices in `captainPick`; `thrift` sets the fund floor (1,000 cr times thrift) in place of the flat 4,000. Wage and share come from the entry; "For the money" at sign-on adds 0.02 to the share. `hears` and `bonus` replace `OPINION.HEARD` and `OPINION.BONUS` in the captain events (defaults 1 and 2); `talk` multiplies `HIRED_WEIGHTS.captain`. Tests per style and per threshold.
- [ ] **Task 3: the XO is the daily boss.** `bossFor(kind)` returns the XO for crew-side calls and post swaps and the captain for money and ship matters; `hiredCall` and `askSwap` use it (the odds from the boss's opinion, the notes in the boss's name). Tests: a swap is the XO's decision when an XO is aboard and the captain's when not.
- [ ] **Task 4: soak and docs.** Soak seeds 1 to 8: no empty plans, no page errors, pay per day in line with the target. README layout lists `js/captains.js` and `js/captains/`.

### Part 2: the voice check (stop here for the owner)

- [ ] Write Hester's introduction (replacing "whom the crew describe as {adj}"), her chatter, her wording for "An Order You Do Not Like", and Cato's introduction scene. Show them to the owner. Adjust before Part 3.

### Part 3: the rest of the prose

- [ ] Hester's four shared events (wording with fallback), her two scenes (trouble, secret), Cato's two scenes, "Two Orders", Cato's ice-hold pivot through `castFate`, the goodbye (warm, neutral, cold; crew taken; secret learned; XO dead) before "Your Own Ship", and the pronoun-light rewrite of `js/stories/hired-aftermath.js` and `js/hiredevents.js`. Tests: scenes fire once and in order, goodbye variants appear, the pivot follows state through `castFate`, soak.
