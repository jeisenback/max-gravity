# The shape of the game

Status: approved by the owner on 2026-11-07 (#891).

## What it is

A run is one life. A hand signs on to someone else's ship, and the world opens around them chapter by chapter until it is a sandbox: places, people, work, owners and their rivalries, most of it generated from written parts and left to combine. The chapters tell the player where they stand. The world decides what happens next, and the player decides what to do about it.

There are many endings. A run ends when the life does, or when it gets somewhere: an arc seen through, or a goal reached. Then another run starts, with a different hand in a different world, and something of the last one left behind.

## A run

- **One life.** A run follows one hand from the day they sign on to an ending. The ending can come early (dead in a boarding, ruined by a debt, walked away) or late.
- **A different world each run.** The background, the ship's crew, the people met, the jobs on the boards and where the owners' rivalries break out are drawn fresh. Two runs from the same start do not play alike.
- **A thin legacy.** An ending leaves a trace in the next run, earned and small: a new start that opens up, a person who remembers the last hand, a name on a memorial wall, a ship the next hand might see on an apron. It never makes the next run easier to win, only different. The game keeps the seed of this already (`js/legacy.js`).

## The chapters widen

Each chapter hands the player more of the world. The first is mostly spine: who you are, who you work for, what you are saving for. Each later one is less spine and more world, until by the third or fourth the spine is thin and the world is the game. A chapter is a funnel that opens: a short written start that says where the player now stands, a long stretch the world carries, and a decision that sets where the next chapter starts.

| Chapter | Where the player stands | What is theirs |
|---|---|---|
| 1, the hand | a rating on Hester's ship | their post, their people, their savings |
| 2, the member | a member of the Ceres co-op, on the Ore Runner | their vote: the runs, who joins, how to answer the lender |
| 3 | set by chapter 2's last vote | more again, in the direction the player chose |

Chapter 2's last vote (on chapter 2's own page, to come; the co-op itself is `ceres-coop.md`) points chapter 3 one of three ways:

- **Hold:** the co-op survives, at a price. Chapter 3 is the **organiser's**: more members, more hulls, a say across ships, standing up to lenders and owners together.
- **Charter:** the Ore Runner works for a side in the owners' war. Chapter 3 is the **master's**: a licence and a bridge, on someone else's terms.
- **Sell:** the members scatter. Chapter 3 is **outside**: a hull or a share of one where the owners' rules thin out, in the havens and squats (`the-hollows.md`, `boneyard.md`, `ring-nine.md`, `triton-outpost.md`).

An owner of one's own hull is not the default rung. Only owners own (`README.md`, the owner's decisions), and a rating who becomes one is the rarest story in this world. It may come later, as a goal some runs reach, not as where the game leads.

## Freedom

As the world opens, the player can take part in its big events, steer between them, or go their own way:

- **Take part:** sign on with a side in the owners' war, carry its freight, fight its fights, and be paid and remembered for it.
- **Steer between:** keep a hull working while the war closes lanes and raises the rates, and trade on what each side needs.
- **Go outside:** turn smuggler, or pirate, out where the patrols are thin, and live with what that costs.

None of these is the right way. Each has its own people, risks and endings.

## Events in the world

The world has events that run whether or not the player joins them. The first is an **owners' war**: two large owners fighting over something both need (a port, a fuel depot, the lift off Earth), with convoys, blockades, hired guns, seized cargo and insurance rates going up across the system. It rumbles through chapter 2, and is the reason for the lender's squeeze in its second half; it breaks out in chapter 3. It is the fuel war (`the-fuel-war.md`).

There is no interstellar war and no great power. The torch drive is the one leap (`technology.md`), so the game stays in this one system. The old game's three factions and their wars give way to major and minor owners (`README.md`, conflict 9).

## Endings

There are many, of two kinds, and a run can reach more than one kind on the way to its last:

- **Plot endings:** an arc seen through. The co-op's last vote, the owners' war, a crew member's story, a pirate's career.
- **Goal endings:** somewhere the player chose to get. Your share paid off; a master's licence; a fleet organised; retired rich and ignoring every thread; a life made on the edge; or dead young.

An ending reads the run's record: who lived and who died, what was promised and kept, whose side the hand took, what they owned and owed. The ending framework in #132 is a start on this list, not all of it. Getting rich and ignoring every thread stays a way to play, and it has its own ending.

## A random game, tested

Every run is seeded fresh, so the game's randomness is the player's. The tests have to live with it:

- **Pins guard words, not outcomes.** A pin records what text a scene plays, and catches a line broken or lost. Which scenes and events a seed leads to is not pinned.
- **Outcomes are guarded by distributions.** The soak checks run many seeds and hold each result inside a band ("a chapter ends early about one time in ten"), wide enough for honest noise.
- **Each system rolls its own dice.** As ship life does (its own seeded random, since #897), so that a change to one system does not reshuffle every other system's outcomes.

## Assumptions to confirm

- A run is one life, from signing on to an ending, and runs are meant to be replayed.
- The legacy carried between runs is small and earned, and never makes winning easier.
- Each chapter widens the player's freedom; the spine thins and the world takes over.
- Chapter 2's last vote sets chapter 3 as the organiser's, the master's or outside; owning a hull is a goal some runs may reach, not the default.
- The first world event is an owners' war, rumbling in chapter 2 and breaking out in chapter 3.
- Endings are many, plot-based and goal-based, and read the run's record.
- Pins guard words; distributions guard outcomes; each system rolls its own dice.
