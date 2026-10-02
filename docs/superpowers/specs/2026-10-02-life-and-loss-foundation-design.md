# Life and loss foundation (narrative step 1)

Status: draft for review. Branch `ccr-56b9a0c9-x4nelr`.

## Context

The narrative vision for Max Gravity, as agreed in design discussion:

- About ten endings. The first arc is always hired hand. After it come building a crew and buying ships, then later arcs: a private lord, faction-driven arcs, and arcs that grow out of relationships with the crew.
- Characters read like people in a novel. Some are brief or fragile, some are deep and lasting.
- Progress should always risk something important, such as a character's death or injury, and a death is remembered.
- Getting rich and ignoring every thread stays a valid way to play.

This spec covers only the first piece: the mechanism for a core character to be marked or die, a record of the dead, and one authored proof scene. Everything else in the narrative is out of scope here (see "Sequence" and "Out of scope").

## Decisions already made

1. Hybrid deaths: authored pivots for the core cast first, emergent injuries for temporary crew later.
2. Pivots show a named risk with no numbers. The outcome follows from game state, with no dice.
3. Any core character can die, but never all at once. A floor of two living core characters is enforced.
4. When the floor stops a death, it becomes a lasting mark: a line of text and one lost skill point, at the skill the scene names (their current post if it names none; the pivot names gunner, since the mark is her gun hand).
5. Core characters stay authored and fixed. Loosening them (role-based pivots for generated crew) belongs to the emergent step.
6. The proof pivot is Yelena Quint's ("Over the Hull").
7. A third core character per background arrives in arc 2. Without one, the floor makes every death impossible, since `CAST_PAIRS` gives each background exactly two.
8. Pivot deaths happen in all game modes. Hardcore mode (#44) governs mechanical deaths only.

Defaults to confirm at review (not yet discussed):

- **Ship loss.** `js/legacy.js` currently deletes every crew person record when the captain dies. Under this spec the floor applies there too: a lost ship takes at most all but two living core characters, and the survivors are marked ("pulled from the wreck"). Each death writes a memorial entry.
- **Playing a core character.** A pivot never targets the character currently played. Swapping (#90) is not built yet and settles that case later.

## Design

### State

All new fields are optional, so existing saves load unchanged.

- `st.cast[key].status`: `'alive'` or `'dead'`. Missing means alive.
- `st.cast[key].marks`: list of `{ text, day }`. A character with marks is alive and "marked". Marked is not a status.
- `st.memorial`: list of `{ key, day, place, cause }`, appended once per death. `cause` is a short authored line.

`'departed'` is not added here. No scene in this step uses it. It arrives with the ending framework.

### `js/fate.js`

A new classic script, linked in `index.html` after `cast.js`. It exports one function:

`castFate(key, outcome, cause, markText, role)` where `outcome` is `'live'`, `'mark'` or `'die'`, `cause` is the memorial line, `markText` is the mark line (used for a mark, and when the floor turns a death into one), and `role` is the optional skill a mark lowers. It returns what actually happened (`'live'`, `'mark'` or `'die'`) so the calling scene can write matching text. Calling it on someone already dead does nothing and returns `'die'`.

- `'live'`: no change.
- `'mark'`: append `{ text: markText, day }` to `marks`, reduce the named skill (default: their current post) by one (never below 0), and keep them alive. The experience at that post is also set to the threshold of the lowered level (`SKILL_STEPS`), otherwise the next day's experience would restore the lost point.
- `'die'`: first run the floor. The floor counts core characters who have joined (a record with `since` set) and whose status is not `'dead'`, wherever they are posted, including as a company ship captain. If the death would leave fewer than two, the outcome becomes `'mark'`. Otherwise:
  - set status to `'dead'`,
  - remove them from `st.crew` and clear any `st.injured` entry,
  - revert any company ship they captain to a generic captain,
  - append to `st.memorial`.

`castFate` is the single door for a core character's death. #44 (hardcore crew death) and the ship-loss path in `js/legacy.js` call it. Non-core crew are not touched by it.

### Guards for the dead

- `castDue` must not offer a dead character a meeting.
- `castReturn` must not return a dead character to the crew.
- The company command buttons must not list them. Reverting a captained ship is covered above.
- Before implementation, grep every use of `castAboard`, `castRec`, `castPerson` and `st.cast` and confirm each handles a dead character.
- Anything that reads the generic people registry by opinion (the crew screen's contacts, the blockade's allies, the epilogue's friend count) uses `alivePeople()` from `js/fate.js`, so a dead core character is not a contact, an ally or a friend.

### Yelena's pivot: "Over the Hull"

A sixth scene on Yelena, after `late`, added through the existing cast scene path (`castNext` and the transit happenings filter). It plays once, after at least 60 days aboard. It is narrated, so `js/boarding.js` is not touched.

Setup: a disabled, armed ship drifts across your path and Yelena asks to lead the boarding party. The scene text states the named risk (she goes first, the hull has taken damage, a medic aboard would matter). Which lines appear follows the real state.

Choices:

1. **Let her lead.** Resolved by state.
2. **Send her with a second person.** Counts as one point of protection and costs a crew member's time.
3. **Call it off.** No risk. She is benched, which she hates most: `benched` flag, a large like penalty, and her thread ends. This is the exit for the player who ignores the thread.

Outcome points, one each:

- a medic aboard (`roleHolder('medic')`),
- hull above 60%,
- her gunner skill at 3 or more,
- backup (choice 2).

3 or more points: she lives. 2: she is marked. 0 or 1: she dies, subject to the floor. The scene text follows what `castFate` returns. Her `promised` flag changes dialogue, not survival. The exact hull accessor is confirmed during implementation.

Results:

- **Lives:** a like boost.
- **Marked:** a mark such as "Left hand never closes properly", one lost gunner point, and a like boost.
- **Dies:** a memorial entry such as "Went over the hull first, near [place], day [n]", removal from the crew, and one short aftermath beat.

In play, no death is possible until a third core character exists (see Sequence), so Yelena can only be marked for now. The death branch is exercised in tests with a fixture.

### Tests

Added to `tests/cast.test.js`, plus the existing `tests/globals.test.js` checks:

- Floor: with two core characters, a death outcome becomes a mark. With three, it kills.
- Each outcome band (3 or more, 2, 0 or 1) gives the expected result, using fixtures for medic and hull state.
- Death cleanup: out of `st.crew` and `st.injured`, not re-offered by `castDue`, not returned by `castReturn`, and a captained company ship reverts.
- Memorial: one entry per death, none for a mark.
- Old saves: a save with no `status` or `marks` loads as alive with no marks.
- `js/fate.js` is linked in the right order with no duplicate top-level names.

Run `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test` in full before pushing.

## Impact on existing work

- **`js/legacy.js`** (captain death): routes through `castFate`, so cast deaths gain a memorial and the floor applies. Needs care, since it currently deletes crew records outright.
- **#44 Hardcore crew death:** cast deaths route through `castFate`. Its "normal mode never kills crew" line and the matching note in `COMBAT.md` change to "normal mode never kills crew in combat; story pivots can kill core characters in any mode".
- **#43 Boarding duel:** no change. Its injuries (`st.injured`) stay separate from permanent marks.
- **#87 / #90 Protagonists and swapping:** the floor counts cast wherever posted. The rule that a character's events fire only when you play them or are on their ship matches this spec's pivot rule.
- **#70-73 Tuning editor:** low impact. The pivot is a cast scene, not a storylet, so it is not tunable unless given an id.
- **#118-121 Bar:** no conflict. `castbar.js` reads `castAboard()`, so the dead drop out.

## Sequence

1. This spec: life and loss foundation and Yelena's pivot. Marks only in practice.
2. A third core character per background, arriving in arc 2. Deaths become possible in play.
3. Pivots for the remaining core characters.
4. Ending framework: about ten endings reading status, marks and the memorial, balanced across quiet, crew-driven, power-arc, loss-driven and personal groups.
5. Later arcs: private lord, faction-driven, crew-relationship. Each arc's advancing step is a pivot.
6. Emergent injuries for temporary crew, and any loosening of the fixed cast.

Candidate endings (to be settled at step 4): The Quiet Fortune, The Long Contract, Ten Years One Ship, The Hand That Stayed, The Admiral's Table, The Rook's Crown, The Partner's Chair, The Memorial Wall, The Empty Berths, The Drift.

## Out of scope

- Pivots for anyone but Yelena.
- The third core characters.
- The `departed` status.
- Any ending, and any memorial screen or other player-facing view of the record.
- Changes to `js/boarding.js`.
- Role-based pivots for generated crew.

Docs touched at implementation: a note in `ROADMAP.md`. The `COMBAT.md` wording change under #44 is made on the branch that holds that file (`ccr-2536b8a2-422u7b`), not here.
