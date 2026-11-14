# The cast

Status: draft for the owner's review, 2026-11-14. Grown from the burn's offers (`burn.md`) and a talk about a wider cast: many people, some deep and some shallow, some for good and some who come and go, met on a burn, at a port, at the Ring, in a bar, on a mission or in a scene the story plots. Nothing here is built.

## What it is for

The game already has many kinds of people, each with rules of its own: the main characters (`js/cast.js`), the captain's scenes (`js/captains/`), passengers, the bar's regulars whose lives move between visits (`js/regulars.js`), the dock official who knows you (`js/official.js`), the Ring's people on the port's hours (`ports.md`), the family visit, the shippers as people, the arcs' contacts, and the generated crew. They do not share a shape, so a run cannot grow its own supporting cast, and the writing has no budget to plan against.

After this page, every person in the game is one kind of thing: someone from a pool, at a depth, with a thread that is live, away, returning or closed. Their scenes are offers like any other (`burn.md`), shown where they happen. A few threads are live at a time, and the record keeps what the hand did with them.

## Tiers

| Tier | Depth | How long | Example today |
|---|---|---|---|
| **Main** | authored arcs: an introduction, middles, a late beat and a fate; a handful at a time | the chapter, and on | Ines, Tomas |
| **Recurring** | a short authored arc, two or three beats; they leave and come back | a chapter or two, in and out | an arc's contact, the strike's organiser |
| **Regular** | a place's people: light threads, their lives moving between visits | while the hand comes to that place | the bar's regulars, the dock official |
| **Passing** | generated from a culture's templates and a sheet (a want, a debt, a family, a home); one scene | one scene, unless promoted | a passenger, a stranger at the bar |

A main character's introduction and fate always open; their later beats are offers (the owner, 2026-11-14). The other tiers' scenes are offers unless they are urgent (`burn.md`, What stops the burn).

## Threads: coming in and out

Each person has a thread with a state:

- **Live:** they have something going on, and their offers can come.
- **Away:** they left the ship, are at their own port, on another job, in the clinic. Their story goes on without the hand, written as a line or two when the hand next hears of them.
- **Returning:** a condition brings them back: a place, a time, an event in the world, the hand's regard, a mark on the record.
- **Closed:** seen through, dead, or gone for good. The memorial and the record keep them.

So a shipmate who walked off at Ceres can be in the Warren in chapter 2, and a passenger the hand sat with can be the one at the dock office three ports later.

## Pools

Each tier draws from a pool, as the main characters already do: two of six a run, of different posts, someone of the start's own culture three times as likely (`drawCastPair`, `js/cast.js`). The same rule, widened:

| Tier | The pool | Drawn | Weighted by |
|---|---|---|---|
| Main | authored main characters (six now) | two at the start; more as chapters widen | the start's culture; different posts |
| Recurring | authored people with short arcs, each tagged with where they can appear (burn, port, the Ring, bar, mission) and whose they are (a power, a place, nobody) | a few a chapter | where the run goes: the ports, the route, the region; the run's marks |
| Regular | a pool for each place: its bar, its dock, its hub | a share for each run, so a port's faces differ between runs | that place |
| Passing | culture templates: names, homes, jobs, wants, debts, family | as needed | where the hand is |

Every draw also weighs:

- **Variety:** no two of one post or role within a tier, and not too many from one place.
- **The run's marks:** a hand who crossed the strike meets the Guild's people differently, or meets different ones.
- **The last run, lightly:** someone who remembers the last hand (`shape.md`, A thin legacy).

**The writing budget.** Each pool holds at least half again as many as a run draws (six main characters for two drawn; a port's regulars twice its live places), or every run meets the same people.

## Promotion

A passing person the hand engages with can rise: an offer taken, a side taken with them, a debt between them. Promoted, they take a thread from a pool of **thread templates**: a want, a problem and a payoff, matched to their sheet (their culture, job, wants, debts and family) and to `work.md`'s world of remittances, licences, deductions and agencies. So a run's supporting cast is partly the hand's own, made by what they paid attention to, and generated people gain arcs without each being written.

## The director

Breadth is only readable if it is limited. A director keeps **three threads live at once** besides the main characters (the owner, 2026-11-14): the ship's offers hold four (`burn.md`), and the main characters often have one or two of them; a burn has two to five downtime slots; and a crew of seven is not many. It prefers threads with stakes now, lets others rest as away, and brings back a returning one when its condition holds. It feeds the one offer queue (`burn.md`) on the ship, and the port's scenes (`ports.md`) ashore.

## Death

**Anyone can die** (the owner, 2026-11-14): a main character, a shipmate, a regular, a passer-by. A death closes the thread and frees its place among the live ones. A death comes from stakes the player could see coming (a fight, a breakdown, a choice, a fate scene), never by chance off screen, so a run leaves a few graves and none that read as the dice. The memorial and the record keep them.

## Memory and the record

Everyone remembers (the memories and regard the game keeps now). The record keeps who the hand showed up for, who they let go, who they owed and who owed them. The chapter closes and the endings read it (`shape.md`, Endings). In the later chapters this cast becomes the ring of people who argue each decision (`later-chapters.md`, How the later chapters play), and a name can carry into the next run.

## What exists and what it becomes

| Today | Becomes |
|---|---|
| Main characters (`js/cast.js`) | Main; their pool as it is |
| The captain and her first officer (`js/captains/`) | Main, in their own pool of captains, off while the narrow build is tuned (#1156) |
| The arcs' contacts (`js/stories/arc-*`), the strike's organiser | Recurring, tagged to their arc and their power |
| The bar's regulars (`js/regulars.js`), the dock official (`js/official.js`), the Ring's people (`ports.md`) | Regular, pooled by place |
| Passengers, strangers, the generated crew | Passing, promotable |
| Family (`js/family.js`) | The hand's and the crew's own people: a thread of their own, not drawn |
| Shippers as people (`js/shippers.js`) | Recurring or regular, tagged to the shipper |

## What the pools need from the world

The pools are weighted by place, culture and allegiance, so each needs writing that is missing or thin today:

- **The places in chapter 1's run, as pools of regulars.** Lagos Ring is written as a port with its people (`ports.md`). The other ports the hand reaches in chapter 1 (Ceres and the Warren, Pallas and the Hollows, Eros, Luna, Mars, the outer Belt's rocks) have place pages but no pools of people: who drinks at the bar, who runs the dock, who is always on the hub.
- **Cultures and origins.** The generated people's origins are written for Earth and Ceres only (`docs/design.md`, Systems). Each region in play needs a culture's templates: names, homes, jobs, wants, the way they talk (`voice.md`), and the bible's own "still to write" on everyday life (fun and media, religion, crime, accents) feeds them.
- **The player's start backgrounds** (`backgrounds.md`, on the bible's "still to write" list, retired in #869). The main pool is weighted by the start, and the hand's own family and home come from it. The narrow build starts on Earth only, so this waits for the starts to open, but the pools should be written knowing it comes.
- **The powers' people.** `owners.md` names the major powers (Tycho, Kaur, Van Leeuwen, Ballast and the rest) and the minor ones (the refining companies, the town trust, the guilds and co-ops, the trades, the havens), but few of them have a face. Each power the hand meets needs a recurring pool: its agents, officers, fixers and the people who work for it. Today only the arcs' contacts exist (Wen Haraldsen at the Hollows, Odile Marchetti and Hob Strand at Eros, Mirela Sandoval for the Guild).
- **The minor powers that are only kinds.** `owners.md` gives the guilds, the co-ops, the agencies and the havens as kinds, "names given when a scene needs one". A pool needs them named, with a few people each.
- **Thread templates.** The library of wants, problems and payoffs for promotion, drawn from `work.md`.

## The order of the writing

A proposal, each step useful on its own:

1. **Chapter 1's places as pools of regulars**, for the ports the hand reaches most (Ceres first), and the pool rule put on the regulars and the dock official that exist. Drafted in `regulars.md` (#1212).
2. **Recurring pools for chapter 1's minor powers**: the Guild, the Hollows, the refinery, the town trust, Kaur's buying office, the hiring hall. Drafted in `powers-people.md` (#1213).
3. **Culture templates** for the regions in play, beyond Earth and Ceres.
4. **Thread templates**, and promotion.
5. **The major powers' people**, for chapter 2 (Tycho, Kaur, Van Leeuwen, Ballast).
6. **Start backgrounds**, when the starts open.

## What the game changes to fit

After the owner's review, in order: a person's tier and thread on their record; the pools and their draws; the director feeding the offer queue; promotion. Each its own piece of work, the regulars and the dock official first, since they exist.

## Open questions for the owner

- Can anyone be promoted, or only people met through certain sources?
- Are threads built from templates acceptable, or must every arc be written?

## Assumptions to confirm

- Four tiers: main, recurring, regular and passing; a main character's introduction and fate always open.
- Every person has a thread: live, away, returning or closed.
- Each tier draws from a pool, weighted by the run's facts, with half again as many written as a run draws.
- Promotion gives a passing person a thread from a pool of templates matched to their sheet.
- A director keeps three threads live besides the main characters, and feeds the one offer queue.
- Anyone can die, from stakes the player could see coming.
- The writing the pools need, and its order, as listed above.
