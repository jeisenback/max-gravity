# What the game is, and the late game as chosen aims

Status: draft for the owner's review, 2026-11-13. A docs change only; no code.

## Intent

The project's documents still introduce Max Gravity as an *Escape Velocity* homage about trading up to a better ship. That is the parked owner game. The game being built plays as a narrative life-sim: a hired hand on someone else's ship, storylet scenes with odds shown, turn-based fights against a ship's parts, a run that is one life with many endings. The documents should say so, and the late game should be drawn so that a run can end in more than one big place: a fleet, a place to run, the war tipped.

## Where it sits

Narrative roguelite life-sim about work in space, with tactical ship fights. Neighbours: *Citizen Sleeper* (precarious work, debt, odds on every check), *Sunless Sea* (storylets in port, a life that ends and leaves a legacy), *FTL* (the fights), *King of Dragon Pass* (the late game, below). *Escape Velocity* is where it came from: the map of ports, contracts, pirates, a better ship as the long goal.

## The late game (chapters 4 to 7)

Modelled on *King of Dragon Pass*: one management layer, many aims.

- **The ring.** Decisions are argued by the people around the player, and the ring grows with the chapters: the crew, the co-op's members, a fleet's masters, a bloc's delegates. Their sheets and opinions are the ones the game already keeps.
- **The calendar and the pool.** Time passes in the same days and burns; events come from one pool, drawn by what the player holds and the state of the world.
- **Holdings.** What *King of Dragon Pass* does not have: hulls to crew and refit, outposts to supply, both kept as records of the same kind and mixed freely. A run can hold two hulls and a rock.
- **Aims.** From chapter 4 the player pushes toward one, and may change course:
  - **A fleet** that moves the system's freight. Ownership stays rare (`docs/bible/README.md`, only owners own): this is most often a co-op's or a charter's fleet the hand built and runs, and owning it outright is the hardest end of it.
  - **A place**: running an outpost, a freehold, or in the end a jurisdiction.
  - **The war**: a voice in a bloc, standing spent to tip the fuel war's end.
- **Endings.** Each aim has its goal endings; plot endings stay as `shape.md` has them. Chapter 7's threat tests whatever was built, whichever aim it served.

## Approaches considered

- **A, three branches after chapter 3**, each its own late game: clearest choice, three times the build, no mixing. Not taken.
- **B, keep the 4 to 7 ladder, reworded**: smallest edit, but every run climbs the same order. Not taken.
- **C, one management layer with chosen aims**: picked by the owner (2026-11-13). Closest to *King of Dragon Pass* and reuses what `later-chapters.md` already draws.

## What changes

- `README.md`, `CLAUDE.md`, `docs/design.md` section 1: the opening says what the game is and where it sits, with *Escape Velocity* as its origin.
- `docs/bible/shape.md`: the chapters table and Endings name the three aims.
- `docs/bible/later-chapters.md`: chapters 4 to 6 rewritten from a fixed sequence (hulls, then place, then bloc) to the shared layer and the aims; chapter 7 kept, still unsettled.
- `docs/bible/owners.md`, How far the player reaches: rows 4 to 6 read by aim, not by chapter order.
- `ROADMAP.md`: the parked milestones (shipping company, frontier, faction states) pointed at the aims they serve.

## Not changed

- The dated specs in `docs/superpowers/specs`: they record features as built.
- Chapters 1 to 3, the narrow build's focus, and any code.
- "Only owners own."

## Left to the writer

Wording, and how much of each page moves. Status lines on bible pages stay "draft for the owner's review" where they were drafts; `shape.md` was approved, so its edit is marked as a change for review.
