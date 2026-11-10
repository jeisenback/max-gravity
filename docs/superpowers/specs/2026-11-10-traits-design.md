# Traits: What the Record Makes of the Hand

Status: draft for the owner's review, 2026-11-10 (#964). The second piece of `docs/bible/progression.md` (layer 4), after the post ladders (`2026-11-08-post-ladders-design.md`). Builds on the hand's record (`js/hired.js`, the flags in `js/captains.js`), the one check rule (`js/sheet.js`), the scene choices with their marks and odds (`js/engage.js`, `js/icerun.js`, `js/bartopics.js`, `js/engagements.js` costNote), and the people's opinions (`js/people.js`).

## Why

A hand grows by levels and picks now, and both are things the player reaches for. Nothing yet says what the run has made of them. The game keeps a few flags (raided, late, hurt, a clean or bad haul, the debt cleared) and the fight ladder's steps, and reads them only at the captain's goodbye. A trait is what a run of facts makes you: earned, never picked, named on your page with the reason, said once by the person who would notice, and a door opened or a reading changed somewhere a body meets the ship. Some cost something. That is the layer the bible promises for chapter 3, where traits open and close doors with the people of the war, and it is the record the endings will read.

Agreed in conversation on 2026-11-10: a small record of counts (not a full event log, not only the flags that exist); each trait is seen, opens a door or changes a reading, and may carry a cost; passives on the roll stay the picks' layer.

## The record (`js/traits.js`)

One object on the hand, `h.record`, of plain counts. A key absent reads as zero, so an old save reads clean and starts counting from the day it loads. Nothing is migrated.

| Key | Counted at | Where |
|---|---|---|
| `haulsClean`, `haulsBad` | an ice run home, edge 3 or more, or -2 or less | `iceHome` (`js/icerun.js`) |
| `repelsHeld`, `repelsLost` | a boarding repelled or not | `repelSettle` (`js/boarders.js`) |
| `boardingsWon`, `boardingsLost` | her ship boarded and carried, or not | `assaultSettle` (`js/boarders.js`) |
| `fightsWon` | a ship fight ending crippled, broke or away | `shipFightEnd` (`js/fightui.js`) |
| `fightsRan` | a ship fight ending ran or escaped | `shipFightEnd` |
| `fled` | a run from a contact, whether it got away or not | the flee branch of `startShipFight` (`js/fightui.js`) |
| `hurts` | the hand hurt | `hurtHand` (`js/boarders.js`) |
| `matesHurt`, `matesLost` | a shipmate hurt or dead, in a fight or on the ice | the casualty settle (`repelCasualty`, `js/boarders.js`; `hurtCrew`, `js/icerun.js`) |
| `onTime`, `late` | a delivery settled on or after its day | the contract settle (`js/contracts.js`, where `latePay` is applied) |
| `fines` | a patrol's fine paid or a citation filed | the heave-to choice (`js/engage.js`), `citation` (`js/boarders.js`) |
| `ranFromNavy` | a run from a patrol | the flee branch, when the spec is a patrol |
| `barWon`, `barLost` | a bar fight | the fight topic (`js/bartopics.js`) |
| `rocksFound` | a rock of ice found on arrival | `siteArrival` (`js/sites.js`) |

`recordAdd(h, key, n = 1)` adds to the count and returns the traits newly earned by it (below). It is the one writer; each site above is one line. The flags and the ledger stay as they are.

## What a trait is

A row in `HAND_TRAITS` (the name is taken: `TRAITS` is the crew's personalities): `id`, `name`, `earned(record)` (a pure rule on the counts), `by` (who says the moment: `captain`, a post, or nobody), and the door or reading it carries, which lives at its site and not in the table. `handTraits(h)` returns the ids whose rule holds, derived from the record each time; a trait is earned once and kept for the run, since the counts never fall. `h.traitsTold` keeps the ids whose moment has played, so a moment plays once.

A door is a choice marked with the trait's name, `[Cool Head] ...`, on the pattern of the post marks (`[Gunner] ...` in the contact and on the rock), with its odds and cost shown by `costNote` as every choice is. A reading is one line at a knob that already exists. A trait is a question put at the edge, `hasTrait(h, id)`, never a fork inside a scene's logic.

## The table

The words are first drafts for the owner to edit, as every line is.

| Trait | Earned by | The moment, by whom | Door or reading | Cost |
|---|---|---|---|---|
| Cool Head | `repelsHeld >= 2` | the captain: "You don't rattle." | at a pirate contact, `[Cool Head] Hail her and hold the guns`: a word on nerve at the post's odds (`handCheck('nerve', skillLevel(post), 'word')`); landed, she breaks off and the contact ends as a run that got away does; failed, the fight starts with her first volley (`edge: -1`) | none |
| Salvager | `haulsClean >= 2 || rocksFound >= 3` | the engineer: "The ice likes you." | on the rock's first stage, `[Salvager] Read the seam first`: a sure choice, +2 to the haul's edge, no hull | none |
| Marked | `fines >= 2 || ranFromNavy >= 1` | a patrol's officer, at the next heave-to, by the hand's name | a pirate's pay-off asks half (`js/engage.js`, the pay choice's `c`) | the heave-to fine is a fifth more (`heaveToFine`, 0.3 of the purse for 0.25) |
| Reliable | `onTime >= 5 && late === 0` since the last late delivery (`late` resets `onTime` to 0 when it is counted) | a shipper's note in the inbox (`noteInbox`) | a shipper that does not know the ship starts at standing 1 (`standingOf`, `js/contracts.js`) | none |
| Scarred | `hurts >= 2` | the engineer: "You're still here." | in the bar, `[Scarred] Let them look at you`: the rude patron backs down, no roll, no bill, the memory as a won fight's | none |
| Hard Case | `boardingsWon >= 2` | the captain, counting the holds | a raider breaks off a tenth of her hull sooner against this ship (`breakAt` on the foe's side, `FIGHT.BREAK + 0.1`, read by `foeMove` and `shipEnd`) | a patrol's heave-to costs two more points of standing with its government (`st.rep[gov]`) |
| Runner | `fightsRan + fled >= 3` | the captain, dry: "You know where the throttle is." | at a contact, `[Runner] Break early`: the run's odds up by fifteen points (`fleeOdds() + 0.15`), the same cost on a failure | pirates close faster: the fight starts ten km nearer (beside lane-sense in `startShipFight`) |
| Jonah | `matesLost >= 2` | nobody; it is in the crew's memories | the captain's goodbye names it (`js/captains.js`, a line in the goodbye) | a crew member who comes aboard starts at opinion -1 (`registerPerson` for a new crew member, `js/people.js`) |

Eight traits. A ninth needs a count the record keeps, or a new count written where its event settles.

## Doors and readings in code

- **The contact** (`js/engage.js` `contactEvent`): Cool Head's and Runner's choices are added beside the post's own move, for a hired hand with the trait, with `costNote` for the odds. Cool Head's word landed returns the run-away words with no fight; failed, `startShipFight(spec, false, { edge: -1, text: ... })`.
- **The rock** (`js/icerun.js` `iceScene`, stage 0): Salvager's choice beside the post's, a sure `iceStep` with `[2, 0, text]`.
- **The bar** (`js/bartopics.js`, the fight topic): Scarred's choice beside the fight's, `pat.fought = true`, the won memory, no bill.
- **Marked**: the pay choice's `c` halved; `heaveToFine` reads the trait.
- **Hard Case**: `shipSide` takes `breakAt`; `startShipFight` sets it on each foe's side for a hand with the trait; `foeMove` and `shipEnd` read `foe.breakAt || FIGHT.BREAK`. The heave-to's `changeRep` takes two more off.
- **Runner**: the contact range as lane-sense, -10 km.
- **Reliable**: `standingOf` answers 1 for a shipper with no entry when the hand has the trait; the board and the pay read it as they do.
- **Jonah**: the goodbye's `parts` gains a line; a new crew member's `opinion` starts at -1 where they are made for the ship.

Every reading is one line at its knob. The owner game is parked: `hasTrait` answers false with no hand, and no site gains an owner branch.

## The moments and the words

The lines are in the text layer under `scene:traits` (`js/hiredscenes.js`): `<id>.moment` with `{first}` for the speaker, `<id>.reason` for the page, the door labels and their results, and the counts' words. The scene harness plays each (`tests/sceneplay.js`), so the text layer's check and the editor see them. A moment is queued by `recordAdd`'s caller through `traitNote(id)`: in a burn as a message (`msg`), at a port as a note on the hand's page (`UI.notes`), as the level note is; the speaker is the trait's `by` if aboard and unhurt, else the captain; Jonah has no moment.

## The page

A **Record** card on the hand's own page under the Ladder (`js/character.js`): each trait earned as its name and its reason, then one line of the counts in words ("Two hauls clean. One boarding held. Hurt once."), only the counts above zero. Built on the view helpers, with a golden in `tests/fixtures/record.html`. Drawn only for a hired hand.

## Testing

- `tests/traits.test.js`, plain Node through `tests/nodecontext.js`: `recordAdd` counts and returns the newly earned; each trait's rule at its threshold and one below; `handTraits` on a hand with no record; `late` resets `onTime`.
- One browser test per door and per reading, the figure or the choice with and without the trait, in the test file of the site (`tests/engage.test.js` or `tests/engagements.test.js`, `tests/icerun.test.js`, `tests/bartopics.test.js`, `tests/contracts.test.js`, `tests/fightui.test.js`, `tests/fight.test.js` for `breakAt`, `tests/captains.test.js` for the goodbye, `tests/people.test.js` or `tests/crew.test.js` for the new member's opinion).
- The Record card's golden, and the moment's note in `tests/handscreens.test.js` beside the level note.
- The scene lines played by the harness; the pins that move read with the diff (a seeded play-through that earns a trait moves the talk and trade pins).
- `npm run soak`: the play-through tool counts the traits earned a chapter, so the owner can see how often each lands.

## Not in this piece

- The endings reading the record (#141, chapter 2's last vote); the salvage jobs reading Salvager (#965); a trait as a gate on a pick.
- Traits from facts the game does not keep (a lie to an auditor, a word kept).
- Losing a trait. A trait is for the run.
- The owner's game.

## Assumptions to confirm

- A record of counts on the hand, written in one line where each event settles; old saves start at zero.
- Eight traits, each earned once and kept, seen on the page with its reason, said once when it lands, and carrying one door or one reading; four carry a cost.
- No trait adds to the roll; the picks own that layer.
