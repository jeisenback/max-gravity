# The deck fight as a puzzle: parties that want different answers

Status: approved in conversation by the owner (2026-10-24), for the owner's review as written. It builds on the turn-based fight
(docs/superpowers/specs/2026-10-20-turn-combat-design.md, Section 3) and follows the ship fight rework
(docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md), which left the deck fight as the next piece. It keeps the deck's board
(Lock, Corridor, Bridge, and the cargo bay on a long ship), the hand's turn (stand, act, one order) and its code.

## Why

The fight tool (`node tools/fights.js --seeds 1,2,3 --n 100`, 2026-10-24, Hester's ship, a gunner at level 2) shows the problems the
ship fight had before #807:

| Policy | Repel won, 5 crew | Repel won, 2 crew | Assault won, 5 crew | Assault won, 2 crew |
|---|---|---|---|---|
| random | 89%, 2.8 turns | 46% | 81%, 3.1 turns | 31% |
| go to them and shoot | 99%, 1.2 turns | 99% | 74% | 50% |
| shoot and order a crewmate | 99%, 1.2 turns | 98% | 89% | 86% |

1. **One right answer.** Going to them and shooting wins a repel 99%, with five standing or two; in an assault, ordering a crewmate
   every turn is the answer.
2. **Too short to read.** A repel played well ends in about 1.2 turns: nothing is shown and then answered.
3. **The level does nothing.** Shooting wins a repel 99% at levels 1, 2 and 3.
4. **Every party is the same.** Only the grade changes them, and only in the odds.

## The owner's choices (2026-10-24)

- The deck fight has **the same shape as the ship fight**: a puzzle with real risk, the other side's move shown, several answers each
  with a cost, and each kind of party wanting a different answer.
- The player commands **the hand, plus one order** to a named crewmate a turn, as now. The whole party as pieces is not this work.
- **Signatures by party** (approach A): the kind of party comes from the ship fought, and each has one shown threat.

## Section 1: the parties

The party is set by her type, both ways: her boarders on our deck, her crew on hers when we board a crippled ship. A navy ship is never
boarded, so the navy party comes one way only.

| Party | From | Signature, shown a turn ahead | Good answers | What each costs |
|---|---|---|---|---|
| **Raider boarders** | a raider; a raider pair (more heads) | **Rush**: "Rushing the Corridor and the Bridge". Where the section in front holds fewer than half their number they go through it, two sections in one turn | Stand in their path; or order a hatch (the pilot's cycle, the engineer's pressure door) on the section they rush through, which stops them there | Standing in the path is a contested section and a hurt roll for the hand; the hatch spends the turn's order, and can fail |
| **Corsair marines** | a corsair | **Breaching charge**: "Charge on the Corridor hatch next turn". It takes heads from ours who stand there, and cover does not cut it | Pull back out of the section; or pick off the one setting it (the steady ability) | Pulling back gives them the ground; the pick-off is the harder roll |
| **Navy inspection party** | a patrol cutter | **Lawful**: each of them put down costs standing with her faction. They push for the bridge; held, it is a search and a fine, not the ship taken | Hold them without fire (cover, hatches) until they withdraw at the cap; or fight and pay the standing | Holding without fire is slow while they press; fighting costs standing a head |

Every fight also gains:

- **Two waves.** About half the party comes across first. The rest is shown at the lock ("3 more at the lock next turn") and lands on
  turn 2 or 3. The break line (`DECK.BREAK`) counts the whole party, so shooting down the first wave does not end the fight.
- **The level counts.** The post's level adds to the sidearm's heads (`DECK.SIDEARM`); the abilities' odds already rise with it.

The aim is a fight of about 4 to 6 turns that no fixed policy wins against every party.

## Section 2: the engine, the panel and the stakes

**The engine** (js/fight.js, pure, in plain Node):

- `deckFight` gains `party` (`'raider' | 'corsair' | 'navy'`, from her type; a pair is raiders) and the second wave
  (`wave: { n, turn }`).
- `boardMove` returns the signature as the shown move: `rush` (the two sections it crosses), `charge` (the section it blows next turn),
  a plain push for the navy; and the wave about to land, shown beside it.
- `resolveDeckTurn` applies them:
  - a **rush** goes through a section where ours are fewer than half of the rushing heads, and stops in the first section where the
    hand stands, where ours are half of them or more, or where a hatch was worked this turn;
  - a **charge** shown last turn blows now, a roll of heads from ours there that cover does not cut, unless its setter was picked off (a
    worked steady in that section while it was shown);
  - a **navy head put down** is counted in the state; the scene charges the standing.
- **Orders gain a place.** The hatch abilities (the pilot's "cycle a hatch", the engineer's "drop the pressure door") are worked from
  the crewmate's post, so their order names any section. Every other ability works where the hand stands, as now.
- **The hand's act gains "pull back"**: ours in the hand's section fall back one section with the hand. It answers a charge and gives
  up the ground.

**The panel** (js/fightui.js; js/handtohand.js fightStrip):

- Their move is shown above the deck in its own words: "Rushing the Corridor and the Bridge", "Charge on the Corridor hatch next
  turn", "3 more at the lock next turn".
- The hatch order offers a section.
- Every new line is a scene line, pinned; Claude drafts them and the owner edits them in the editor.

**The stakes** are as now (casualties, the hand hurt, the ship taken), with two for the navy:

- the navy holding our bridge ends in the heave-to's cost (the ship pays a quarter of its fund), not the ship taken;
- each navy head put down costs 2 standing with her faction (a quarter of the 8 that fighting a hostile patrol costs; tuned after
  measuring).

**The tools:**

- tools/answer.js gains the deck answer: meet a rush, or hatch it when the hand is too far; pull back from a charge, or pick off its
  setter when the odds are good; hold a navy party with cover and hatches, and fire only to save the bridge.
- tools/fights.js reports the deck fights by party, and gains the `answer` policy beside random, shoot, cover and order.

## Section 3: how we know it worked

Measured with the fight tool (by party, both ways) and the soak:

- **Each party wants its answer.** `answer` wins at least 90% against each party. No fixed policy (random, shoot, cover, order) wins
  70% or more against every party. Going to them and shooting gives up ground to a rush or a charge, and costs standing against the
  navy.
- **Real risk.** Random play loses 25% or more of its fights.
- **Long enough to read.** `answer`'s fights last 4 to 6 turns on the mean, and no party's are won in under 2.
- **The level counts.** With two standing, `answer` at level 3 wins at least 10 points more than at level 1.
- **No deadlier.** Dead a fight by her grade stays near today's (repel 0.32, 0.44, 0.49; assault 0.36, 0.49, 0.55), and the soak's
  stakes limits hold (tests/distribution/stakes.test.js: hurt per chapter 0.1 to 0.7, hurt again at most 4 in 40, ended early at
  most 3).
- **Numbers are tuned only after measuring**: the waves, the charge's roll, the sidearm by level, the standing a head.

## Amendment (2026-10-24): wounds, not heads

The first build of PR 1 (the waves, the rush, the hatch) was measured against Section 3 and missed it on the raider party: a fight
was decided in about 3 turns, the level made no difference, and in an assault a fixed policy (shooting) beat the answer. Two rounds of
tuning (the waves, the sidearm, the break line, the exchange's lethality, the party's size, the advance rule) moved none of those far
enough. The cause is the base model: each hit takes a head, so both sides melt in two or three exchanges, and the hand's shot is
capped by the heads in its own section. The owner chose to change that (2026-10-24):

- **A head is wounded first.** Each section keeps, for each side, how many of its heads are wounded. A hit on a side there (an
  exchange's roll, a press) wounds one of its unwounded heads; when all of them are wounded, it downs one. A wounded head still
  stands: it fights, counts toward a push and a rush, and counts against the break line.
- **The hand finishes the wounded.** Each head of the sidearm's shot downs a wounded head first, and wounds an unwounded one only when
  none is left. The crew's trades wear them down and the hand's shot ends them, so where and when the hand shoots counts.
- **The level counts through reach.** The shot is aimed at a section in reach: the hand's own at any level, and from level 2
  (`DECK.SIDEARM_REACH_LEVEL`) one next to it as well, as a gunner covers a corridor from its end. The heads a shot takes still
  rise with the level (`DECK.SIDEARM_BY_LEVEL`).
- **Losses on our side.** A head of ours downed rolls for a casualty as now (`DECK.CASUALTY`); a wounded one does not. The dead a
  fight check in Section 3 holds the death rate where it is.
- **The panel** shows each side's wounded in each section (on the strip, a wounded head is drawn hollow, and the label says
  "4, 2 of them wounded"), and the shot offers its section as the hatch does.
- The waves, the rush and the hatch stay as built. Section 3's checks stay as they are.

## Code, tests and delivery

- js/fight.js: `party`, the waves, the rush, the charge, the hatch by section, pull back, the navy count; tests in tests/fight.test.js,
  in plain Node, for each signature and each answer.
- js/boarders.js: the party from her type in `repelStart` and `assaultStart`; the navy's search and standing in the settle.
- js/fightui.js and js/handtohand.js: the shown moves, the hatch's section, pull back; tests in tests/fightui.test.js.
- tools/answer.js and tools/fights.js: the deck answer and the report by party; the checks above.
- The pins that cover boarding change on purpose; they are rewritten (`PIN_WRITE=1`) and each diff is read.
- COMBAT.md's deck fight section is rewritten with the measured numbers.

Delivered in three PRs, each leaving the game playable:

1. **The base**: `party`, the two waves, the level in the sidearm, the raider's rush and the hatch order by section, wounds and the
   sidearm's reach (the amendment above), with the tools and the pins.
2. **The corsair**: her charge and pull back.
3. **The navy**: the lawful party, the standing a head, and the search at the bridge.

## Not in this work

- The whole party as pieces the player moves.
- A nerve bar for either side (approach C); it can sit on top of this later.
- Deck features spent once a fight (approach B), beyond the hatch abilities that exist.
- Deck-fight moves taught by the crew, after the gunner moves.
