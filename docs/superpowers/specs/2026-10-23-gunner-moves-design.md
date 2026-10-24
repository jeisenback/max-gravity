# Gunner moves: perks as new fight orders, taught by the crew

Status: approved in conversation by the owner (2026-10-23), for the owner's review as written. It builds on the ship fight rework
(docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md) and #814 (running costs time, fights end before the cap), and comes before
the corsair tune (#815), which is measured with these moves in place.

## Why

The hand's growth today is numbers going up: post points raise a level (0 to 3, at 12, 45 and 110 points, `SKILL_STEPS` in js/hired.js), a
level makes the post's rolls likelier and a gunner's shots harder, and level 2 opens some marked choices. The sheet's stats move only by
scenes, and kit adds an edge to a kind of roll. Nothing lets the player choose how the hand grows, and nothing gives them a new thing to do
in a fight.

## The owner's choices (2026-10-23)

- A perk is **a new move**: an order the hand did not have, which changes how a fight is solved (after Into the Breach and FTL).
- Moves are **taught by the crew**, in a scene, not picked from a menu.
- **A few, gunner first.** Chapter 1 gets three moves for the gunner, the post the ship fight is built around. Other posts follow once the
  pattern is proven.
- Every move happens **at the guns**. Two earlier ideas, calling the range and bracing the crew, are kept for the pilot's and the first
  officer's moves later; they are not a gunner's.

## Section 1: what a move is

Three moves, each usable **once a fight**:

| Move | Taught by | What it does | Answers |
|---|---|---|---|
| `vent`: Vent the guns | the engineer (Tomas) | At the start of the turn the heat goes to 0, and locked guns are unlocked, so every gun can fire | The overheat cost of an all-out turn (the cutter) |
| `lead`: Lead the shot | the pilot (Ines) | One gun's aimed shot this turn takes no range penalty (`FIGHT.AIM_MULT` counts as 1): the pilot tells you where she will be | An aimed shot at a raider's lock or a corsair's launcher from long range (the pair, the corsair) |
| `split`: Split the turret | the first officer (Cato) | The turret holds back her volley and still fires this turn | The turret-or-gun choice on a salvo turn (the corsair) |

- The moves are data beside `FIGHT` in js/fight.js (`FIGHT_MOVES`), applied by `resolveShipTurn`. The engine stays pure and runs in plain
  Node.
- The turn's orders gain one optional field, `move: 'vent' | 'lead' | 'split'`, with `lead` naming its gun (`{ move: 'lead', gun: i }`).
- The fight state remembers the moves spent (`spent: []`). A move the hand does not know, or has spent, is ignored, as an empty launcher is.
- What the hand knows is kept on the career (`career().moves`, an array of ids), beside the post points, so a hand who buys a ship keeps it.
  It is not a field of `G`. A save from before has none.
- The owner game is parked: a move is offered only to a hired hand at the gunner post who knows it (a gate at the edge, `if (!hired())`).

## Section 2: how a move is taught

- Each move has a teaching scene, played on a burn (a downtime slot), by **whoever holds the teaching post** aboard: the engineer for vent,
  the pilot for lead, the first officer for split. In the narrow build those are Tomas, Ines and Cato.
- The scene is due when:
  - the hand works the gunner post;
  - the hand's gunner level is at least the move's (vent and lead at level 1, split at level 2);
  - the teacher's opinion of the hand is at least `OPINION.TRUSTED` (3);
  - and the hand does not know the move yet.
- In the scene the teacher offers to show it. Taking it teaches the move and gives a few gunner points. Declining leaves it to be offered
  again on a later burn.
- A teacher hurt or missing does not teach until they are back.
- The scenes are scene lines (js/hiredscenes.js), played in the editor's preview, pinned, and put through the voice review
  (`npm run voices`). Claude drafts them and the owner edits them, as with the ladder's entry lines.

## Section 3: the fight panel and the play tools

- **The panel** (js/fightui.js). A known move shows as one more order beside the guns, the torpedo and the turret: "Vent the guns",
  "Lead the shot (gun 1)", "Split the turret".
  - It is a toggle for the turn, as overcharge is.
  - Spent, it shows greyed with "spent" for the rest of the fight.
  - Each one shows what it will do before Fire, as aimed shots show their damage: vent the heat it clears, lead the shot's damage with no
    range penalty, split both the cut to her volley and the turret's shot.
  - The labels and the log line when a move is used are scene lines (`scene:fight`), pinned.
- **The shared move rule** (tools/answer.js, used by the fight tool and the play-through) learns one rule per move:
  - vent when a gun is locked on a turn worth firing;
  - lead when an aimed shot is wanted at long range;
  - split on a salvo turn.
- **The fight tool** (tools/fights.js) gains `--moves` to give the hand all three, so a fight with moves is measured beside one without.
- **The soak** (tools/soak.js) learns moves as the game does, through the teaching scenes.

## Section 4: balance, and how we know it worked

The checks, measured with the fight tool and the soak:

- **A move is worth having.** With the three moves, the move-reading `answer` does better against the type each one answers: split against
  the corsair, lead against the raider pair, vent against the cutter.
- **A move is a choice, not a free win.**
  - No fixed policy with moves beats `answer`.
  - Random play with moves still loses 25% or more of its fights.
- **The chapter holds.** The soak's stakes limits hold (tests/distribution/stakes.test.js: hurt per chapter 0.1 to 0.7, hurt again at most
  4 in 40, ended early at most 3), with the moves learned as the game teaches them.
- **Moves arrive in play.** In play-throughs on seeds 1-5 (Hester), the hand learns at least the two level-1 moves in most chapters, and
  uses them in fights.
- **If a move makes fights too easy,** the first lever is when it is taught (a higher level or more trust), not weakening the move.
  Numbers are tuned only after measuring.

## Code, tests and delivery

- js/fight.js: `FIGHT_MOVES`, the `move` order, `spent`, applied in `resolveShipTurn`. Tests in tests/fight.test.js, in plain Node: each move's
  effect, once a fight, an unknown or spent move ignored.
- js/fightui.js: the orders on the panel, and the known moves from `career().moves`. Tests in tests/fightui.test.js.
- The teaching scenes and their due rule: tests for the gates (level, trust, teacher present, not known), taking and declining, and a save
  with no `moves`.
- tools/answer.js, tools/fights.js `--moves`, tools/soak.js: the balance checks above.
- Delivered in PRs that each leave the game playable: (1) the moves in the engine and on the panel, given in tests and the tools only;
  (2) the teaching scenes, drafted for the owner to edit, and the balance checked.

## Not in this work

- Moves for the pilot, engineer and comms posts (calling the range and bracing the crew are noted for them).
- Deck-fight moves.
- The corsair tune (#815), which follows, measured with these moves.
