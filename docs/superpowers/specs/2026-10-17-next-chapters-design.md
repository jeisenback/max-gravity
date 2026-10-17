# The next chapters: a sheet, a board, people with stakes, and a game you look at

Status: agreed 2026-10-17 (the open questions at the end are settled), from the owner's statement of the vision and a review of the code as it stands after contracts (PR #676). The issues are #679 to #687; each names its own done-when. This is the design they share, the order, and what is deliberately not built.

## The vision, in the owner's terms

A game over several chapters, each going into one of a number of interlocking mission arcs. More role-playing than flying and shooting: a character with stats, skills and items; ship upgrades and customization earned from missions as well as bought. Combat on a lidar view, turn-based with skill checks, over the long distances a space fight really has. Hand to hand closer to a tabletop game, with skills, abilities and stats. A UI that makes the game lived in rather than read.

## What stands, and what each part needs

| The vision | In the code today | What is missing |
|---|---|---|
| Chapters | One: the hand to the used Ore Runner. The spine, the parting scene that reads the record, one line carried on. | A second chapter (the owner's, parked) and a way in that is not more forks: the role object (#575). |
| Interlocking arcs | The storylet engine (data scenes, qualities, chains, follow-ups, the editor). Three campaign arcs in the full build, off. | People with stakes to hang arcs on. Shippers (contracts) are the nearest: a shipper who knows the ship is a quest-giver. |
| A character | One post with a level 0 to 3; opinions, bonds and ties, which are relationships, not capability. Five formulas for five kinds of check. | A sheet (stats, skills, a kit) and one check rule. |
| Combat in space | The raid: turn-based beats with checks by post, authored lines, a position word. The card duel beside it for the owner. The real-time prototype, retired. | Space: range, bearing, closing, drawn. One board for both the raid and the duel. |
| Ship customization | The outfitter and the deck's cards, for the owner, parked. | Items and outfits that come from arcs; a hand with a kit. |
| Hand to hand | The lock fight: sections, a triangle, the head count, the post's move, real casualties. | Abilities, cover, items, on the sheet; no hit points. |
| Lived in | The cutaway, the night, the faces, the rooms. | The rest is paragraphs: results that are numbers shown as numbers; the bar as a room; the sheet as a console. |

## Principles

1. **One rule for every check.** A stat, a skill, a difficulty, an item's edge, one function, the odds on the label. The five formulas become one (#679). Everything after rests on it.
2. **One board for a fight in space.** The raid gains a lidar plot and ranges and keeps its beats (#680); the owner's duel folds into it later and the card deck retires then. Three combat systems become two, then one. The action version is not built: COMBAT.md records why it was dropped, and the plot gives the distance without a second input model.
3. **Arcs hang on people.** Shippers get standing, a face at the far end, and a side (#682); arcs are contracts that are not freight, taken through the captain, written as data (#683). They interlock by sharing qualities and people with the dock official (#674), the regulars and the main characters.
4. **Casualties stay real.** Hand to hand gains abilities, cover and the kit (#684) on top of the sections and the rules that make a hurt matter. No pool of points that makes a hit free.
5. **Scenes keep their prose; numbers become readouts.** A status strip, the contract as a paper, the ledger as the log (#686); the bar as a room and the sheet as a console (#687). The painted world's style, the cutaway's tap.
6. **Chapter two through the role object**, with the ship made by what the arcs gave as well as what the outfitter sells (#685).
7. **Measured before kept.** The soak and the fights tool are the yardsticks at every step: the chapter's days, the raids' close rates, the lock fights' casualties. Pins are written again with the reason in the commit.

## The sheet (#679)

Stats, each 1 to 5, set at the sign-on from the background and the post, moved by scenes and the look back, never bought:

- **hands**: the work, the fight, the plate carried.
- **eye**: the shot, the read of a call, the watch.
- **nerve**: the bold call, the standoff, the step between two families.
- **wit**: the word, the relay, the sum, the false order.

The posts stay the skills, each on a stat (gunner on eye, pilot on nerve, engineer on hands, comms on wit), with their points and levels as now. The kit is a short list of things with a stated edge on stated checks: a sidearm, a suit, a tool kit, what a quest left. The rule, in a module of its own and pure: `check(stat, skill, difficulty, edge)` gives the odds; the first calibration makes it land near the old odds at level 0 and level 3 for jobs, the raid's post move and the lock fight, so nothing retunes by accident.

## The sensor board (#680)

A position model per raid (range in km, closing rate, her aspect, the sun's side), drawn as a plot above the beat: rings, the contact's bearing, torpedo tracks, the point-defense arc. Each beat is a choice by post at a range; the authored lines are the results; sensor wear degrades the picture. The duel's bounties and hunters move onto it after the raid plays well, with the owner's crew at the posts.

## Shippers and arcs (#682, #683)

Standing per shipper, moved by deliveries, read by the board. An agent at the far end, a person who persists and remembers. One short payer. A side on the paper where the ties say so. Then three arcs, one per power's office, four or five storylets each, as data: a League water dispute, a Concord audit, a Compact license. An arc ends in standing, a person, an item for the kit, or a line in the record; the chapter's end is still the ship.

## Hand to hand (#684)

Three or four abilities a post in place of the one post move, each a check with a cost on its label; cover by section on the cutaway; the kit counted. The triangle stays for the crew's general tactics, the head count for a tie, the casualty rules unchanged.

## Chapter two (#685)

The role object: what the player may trade, decide and pay for. Chapter two sets it to the owner's role and keeps the crew, the sheet and the standings. Contracts stay the economy with the player picking from the board; the ship is customized by the arcs' items and the outfitter both; the spine is one question, the ship's debt or the crew who came along.

## Lived in (#686, #687)

The status strip on every screen; the contract as a paper in the hold; the ledger as the captain's log; the raid's position as a gauge until the board replaces it; the arrival and the settlement as log lines unless something is off. The bar drawn as a room with every patron where they sit and tappable; the sheet as a console in the engineering panel's style, for the hand and for each crew member.

## Order

1. #679 the sheet and the rule (everything rests on it).
2. #686 readouts (cheap, and the strip carries the contract and the days from the first day).
3. #680 the sensor board.
4. #682 shippers as people, then #683 the arcs.
5. #684 hand to hand.
6. #687 the bar as a room and the sheet as a console (after #679 for the sheet; the room can come earlier if wanted).
7. #685 chapter two.

Each is its own branch and PR, each leaves the suite green and the chapter playable, each records its measurements in ROADMAP.md.

## Not built

- The action version of space combat (COMBAT.md, 4b).
- Hit points, character levels, classes, a shop for items.
- A grid for hand to hand; the sections are the grid.
- The full build's five storylines (#469) and the parked owner systems beyond the role's core.

## Open questions, settled by the owner (2026-10-17)

1. **Four stats**, as named: each post then sits on a stat of its own, where three would make the pilot and the comms hand share nerve. The word nerve is also a captain's stat (trade, nerve, thrift, 1 to 5, `js/captains.js`), read when a bold call lands on her opinion; #679 decides at implementation whether the hand's stat keeps the name on the same scale or takes another.
2. **The three arc subjects** as written: a League water dispute, a Concord audit, a Compact license.
3. **Chapter two's spine is the crew who came along**, since the first chapter's endings already read who came.

Also settled from the review: the kit lands with the first arc that gives an item (#683), not with the sheet (#679), so the sheet is stats and skills until something fills it.
