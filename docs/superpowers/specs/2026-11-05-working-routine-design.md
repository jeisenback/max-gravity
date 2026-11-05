# A working routine in the burn view

Status: approved in conversation by the owner on 2026-11-05, for review as written.

## What it is for

The second of the three layers agreed for a lived-in burn view (the first, scenes staged, is `2026-11-05-scenes-staged-design.md`). Today the crew pick a weighted-random room, wait 5 to 12 seconds and pick again, so the ship looks the same at any hour. With this layer the ship runs to a clock: the crew work at their posts, everyone gathers for meals, and the watch changes hands at dusk. Watching the cutaway, you can tell the time of the ship's day.

## The ship's day

The day is lengthened from 40 to 80 seconds (`SHIP_DAY`), keeping the shares of day, dusk, night and dawn. A burn of 60 to 120 seconds shows about one day, and every burn of a minute or more still has its night.

The timetable, by share of the day (`f` in `nightLevel`, where dusk is 0.55 to 0.65, night 0.65 to 0.9 and dawn 0.9 to 1):

| Block | From | To | Where |
|---|---|---|---|
| `wake` | 0.90 | 1.00 | up from the bunks and to the galley |
| `breakfast` | 0.00 | 0.08 | the galley table |
| `shift` | 0.08 | 0.30 | at their post, working |
| `meal` | 0.30 | 0.38 | the galley table |
| `shift` | 0.38 | 0.48 | at their post, working |
| `supper` | 0.48 | 0.55 | the galley table |
| `handover` | 0.55 | 0.65 | the night watch to their posts; the rest to the berths |
| `night` | 0.65 | 0.90 | as now: the watch up, the rest asleep |

(Daylight is 44 seconds: breakfast 6, the first shift 18, the midday meal 6, the second shift 8 and supper 6. The second shift is 8 seconds and not the 12 first proposed, so the blocks fit the day.)

- A person's **post** is the room they like best (the top of `HAUNTS[role]`). The hired captain's is the bridge.
- A block starts at its time for everyone; whoever has farthest to walk arrives last.
- Within a shift someone at their post sometimes goes on a short errand to another room they like and comes back. At a meal each takes a seat along the table, the seat chosen by ship life's dice.

## Who does what

- **Crew:** follow the timetable; at their post in a shift they work.
- **The cook:** works the galley in a shift; at a meal stands at the stove serving while the others sit.
- **The hired captain:** on the bridge in a shift, at the table for meals.
- **You:** meals and night like everyone; in a shift you go on rounds (weighted wandering as now), so the camera follows you through a working ship.
- **Passengers:** meals with everyone; in a shift the berths and galley (weighted, as now).
- **The cat:** as now.
- **The night watch** (`NIGHT_WATCH`, the pilot and the engineer): at `handover` they go to their posts. Whoever is at that post when they arrive and is not on the watch waits for them; the two face each other for 2 seconds, and then the one going off leaves for the berths. If nobody is there, the watch takes the post. At dawn the watch goes to breakfast with everyone.

## The working pose

Two variants of one animation, the hands moving: `work`, standing at a panel (the engineer at the drive, the quartermaster in the hold, the medic in the medbay, the cook at the stove, anyone else whose post has no seat), and `work-sit`, seated at the controls (on the bridge and at the guns). Used by someone at their post in a shift who is not walking.

## What wins

From strongest to weakest: the burn's phase (the couches, the straps, the flip: nobody moves, as now); a scene staged (layer 1); a downtime activity you chose (drills, a repair, as now); the timetable. When a stronger one ends, the person goes where the timetable says for now.

## Ship life's dice

Everything that only changes the cutaway (where someone walks, which seat, an errand, the choice and wording of a comms flavour line) draws from ship life's own seeded random, not from `Math.random`. Its seed comes from the burn's facts (the day, the system left, the destination), so starting it takes no draw from the game. Anything that changes the game (what a downtime activity does) stays on the game's dice. A whole burn of `lifeTick` makes no `Math.random` call.

This shifts the game's dice once, in this change: the pins are recorded again and the soak tests are run. After it, changes to ship life (layer 3 among them) leave the game's dice where they are.

## Code

- `shipRand(t)` (js/shiplife.js): ship life's random, `[0, 1)`, its state kept on the burn (`G.transit`). `rand`, `pick` and `weighted` in ship life take it in place of `Math.random`.
- `shipDay(elapsed)`: pure, returns `{ block, f }` from `SHIP_TIMETABLE`.
- `routineSpot(p, block)`: pure, returns where `p` should be in `block`: `{ room, seat }` for a post, a seat at the table, the stove or the berths, or `{ rounds: true }` for you in a shift and for passengers outside meals and night.
- `lifeTick`: asks the timetable where to go in place of the weighted pick, in the order under **What wins**; the handover is handled here.
- `js/figures.js`: `POSTURES.work` and `POSTURES['work-sit']`; `posture()` uses them.

## Tests

- **Node:** `shipDay` at each block's start and end; `routineSpot` for each kind of person in each block (crew, cook, the captain, you, a passenger, the watch at night).
- **In the page:** at breakfast the crew are at the table, seated; in a shift the engineer is in the engine room in the `work` pose and the pilot on the bridge in `work-sit`; at dusk the captain waits on the bridge for the pilot, they face each other, and then the captain leaves for the berths; you are on rounds in a shift; a stronger claim (a staged scene) wins over the timetable and the person returns to it after.
- **The dice guard:** a whole burn of `lifeTick` calls `Math.random` zero times.
- **Once:** the pins recorded again (`npm run pin:from`), the soak run (`npm run soak`) and any seeded test that moves fixed; tests that set `elapsed` for night updated for the 80-second day.
- **Screenshots** of breakfast, a shift and the handover, for the owner.
