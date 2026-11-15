# What the game is, and how the later chapters play

Status: draft for the owner's review, 2026-11-13. A docs change only; no code.

## Intent

The project's documents still introduce Max Gravity as an *Escape Velocity* homage about trading up to a better ship. That is the parked owner game. The game being built plays as a narrative saga: a hired hand on someone else's ship, storylet scenes with odds shown, turn-based fights against a ship's parts, a run that is one long life with many endings. The documents should say so, and the later chapters should say how they play as they widen, and that a run can end in many places, a fleet, a place to run and the war tipped among them.

## Where it sits

A narrative saga about work in space, with tactical ship fights: one long run, replayed now and then, not many short ones. Neighbours: *Citizen Sleeper* (precarious work, debt, odds on every check), *Sunless Sea* (storylets in port, a life that ends and leaves a legacy), *FTL* (the fights), *King of Dragon Pass* (the late game, below). *Escape Velocity* is where it came from: the map of ports, contracts, pirates, a better ship as the long goal.

## The late game (chapters 4 to 7)

The chapters stay as they are drawn: each one its own slice of the game, a little wider than the one before (`shape.md`, The chapters widen; `later-chapters.md`: 4 more hulls, 5 a place, 6 alliances, 7 the threat). What *King of Dragon Pass* lends is how a wider slice plays, not a new structure:

- **The ring.** Decisions are argued by the people around the player, and the ring grows with the chapters: the crew, the co-op's members, a fleet's masters, a bloc's delegates. Their sheets and opinions are the ones the game already keeps.
- **The calendar and the pool.** Time passes in the same days and burns; events come from one pool, drawn by what the player holds and the state of the world.
- **Holdings.** What *King of Dragon Pass* does not have: hulls to crew and refit, outposts to supply. Each chapter adds one kind, and what a path keeps stays in the later chapters, so on the organiser's path a run may hold two hulls and a rock by chapter 6. A path that sells or scatters keeps less (chapter 2's sell vote leaves no co-op hull).
- **A coarser step.** A day at a time does not carry two hulls and an outpost. The later chapters pass time in larger steps (a burn, a month, a season), and the player can still drop into a day aboard or ashore when a scene wants it. This is an assumption to test, not settled.
- **Succession.** From chapter 4, when the hand dies or retires, the run goes on with someone from the ring, at a cost: holdings kept, standing and regard cut, as `js/legacy.js` already does for the parked owner game. Before chapter 4 there is nothing to inherit, and a death ends the run. This replaces the earlier idea of several main characters.
- **The levers.** A fleet or a place puts the player where the owners and agencies stood in chapter 1: hiring ratings, setting deductions, signing charters. The later chapters hand over those levers, and the endings read what the player did with them. Nobody in the voice is a villain, so the system does the extracting, and the player decides how much of it they run.

## Endings

Many, and open, as `shape.md` has them: plot endings and goal endings, reachable in any chapter, read from the run's record. The late game widens the list; it does not narrow it to a few. Among the big ones the later chapters make possible:

- **A fleet** that moves the system's freight. Ownership stays rare (`docs/bible/README.md`, only owners own): most often a co-op's or a charter's fleet the hand built and runs; owning it outright is the hardest end of it.
- **A place** run: an outpost, a freehold, in the end a jurisdiction.
- **The war tipped**: a bloc's standing spent on how the fuel war ends.

Beside them stay the smaller and stranger ones: dead young, ruined by a debt, walked away, a crew member's story seen through, a master's licence, a life on the edge, rich and ignoring every thread. Any of them can be where a run stops.

## Mods and the shared world

The older ideas stay, each with a narrow job: **mods add content, scenarios add starts, shared deeds add rumours and traces, and none of them changes the state of another player's game.**

- **Mods** add storylets to the pool the later chapters draw from (`M.addStorylet`). They are opt-in: the shipped game never leans on them, the voice's bar is not theirs, and the pins and the soak guard the shipped game only.
- **Scenarios** are starts written as data, and one way the starts open up.
- **Shared deeds** (`README.md`, Shared news) are words only: news at a port, chatter on a burn, a name on a memorial wall, a ship seen on an apron. They are the between-runs trace of `shape.md`, drawn from other players' runs as well as the player's own. A deed never moves a price, a war or a roll, so a deed from a modded game, or a forged one, can only be a rumour.
- Whether the mod API, built for the owner game's places, ships and goods, follows the hand's game into people and holdings is left for later.

## Open questions

- **Replaying chapter 1.** Its spine is fixed (Hester, the two main characters, the gunner's post), so a second run repeats it. The starts and posts will open up (`js/build.js`, `SCOPE_OFF`); until they do, the game does not claim easy replay.
- **The later step.** Whether the coarser step and the drop into a day play well together, tested before chapter 4 is built.
- **The hand's place in a fight.** In chapter 1 the hand works a post and the captain decides; by chapter 4 the player decides. How a fight with several hulls is shown on the sensor board is left to chapter 4's design.
- **The between-runs trace.** `shape.md`'s thin legacy (a start that opens, a name on a wall) waits for the starts to open; it has little to unlock before then.

## What changes

- `README.md`, `CLAUDE.md`, `docs/design.md` section 1: the opening says what the game is and where it sits, with *Escape Velocity* as its origin. In `docs/design.md` also the first pillar (one life, and the line after it), section 3 (how the later chapters play), and the systems row for heirs (succession from chapter 4).
- `docs/bible/README.md`: the index line for `shape.md`.
- `docs/endings-parked.md`: its four endings wait for the game's endings, which can come in any chapter, not only at the close of the last.
- `docs/bible/shape.md`: "a run is one life" becomes one life, and from chapter 4 the line after it (succession); Endings adds the fleet, the place and the war to the list, as some among many; the legacy note separates succession within a run from the trace between runs.
- `docs/bible/later-chapters.md`: a section on how the chapters play (the ring, the pool, holdings a path keeps, the coarser step, succession, the levers); the chapters themselves kept; chapter 7 still unsettled.
- `ROADMAP.md`: the parked milestones (shipping company, frontier, faction states) pointed at the chapters that bring them back.

## Not changed

- The dated specs in `docs/superpowers/specs`: they record features as built.
- The chapters and their order; chapters 1 to 3, the narrow build's focus; `owners.md`; any code.
- "Only owners own."

## Left to the writer

Wording, and how much of each page moves. Status lines on bible pages stay "draft for the owner's review" where they were drafts; `shape.md` was approved, so its edit is marked as a change for review.
