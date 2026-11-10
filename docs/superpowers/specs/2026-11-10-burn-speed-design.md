# The burn at its own pace: a longer burn, the flip in slow motion, fast-forward and pause

Issue #992. Agreed with the owner in chat, 2026-11-10.

## Why

A burn lasts 60 to 150 real seconds whatever the trip (`transitSeconds` in `js/transit.js`), and its stages are shares of that: the crash couches for the first and last 6%, strapped in from 44% to 47% and 53% to 56%, weightless from 47% to 53% (`phase` in `js/shiplife.js`). So the flip is over in 4 to 9 real seconds, and a 37-day trip keeps everyone on the couches for two days. The cutaway's own day is a fixed 80 seconds (`SHIP_DAY`), so an 11-day trip shows under two nights. There is no speed control: time stops only for a scene or the menus.

The owner asked for a burn that is much longer and true to the fiction, with two fast-forward speeds and a pause.

## Decisions

1. **The whole burn is longer, at its true proportions.** One ship day is one cutaway day: a burn of `days` takes `days × SHIP_DAY` real seconds at normal speed. Trips are 5 to 37 days (median 11), so a burn is about 7 to 49 minutes at 1x (median 15).
2. **Speeds: paused, 1x, 4x and 16x.** A median trip is about 3.7 minutes at 4x and 55 seconds at 16x.
3. **The flip in slow motion.** Its stages are set in ship minutes and played slowed, so the whole flip takes the same real time on any trip and at any chosen speed.
4. **The couches at the ends** are a fixed span of ship hours, not a share of the trip.

## The burn's rate

`G.transit` keeps its measure (`total`, `left`, `elapsed`) in burn seconds, where one ship day is `SHIP_DAY` burn seconds. Each frame the burn moves on by `dt × rate`, where `rate` is:

- 0 when paused, or while a scene is open (as now);
- `FLIP_RATE` inside the flip window, whatever speed is chosen;
- otherwise the chosen speed: 1, 4 or 16.

`left` goes down by `dt × rate × burnSpeed()` (the drive's power, `js/engineering.js`, as now) and `elapsed` goes up by `dt × rate`. Ship life (`lifeTick`, `js/shiplife.js`) is ticked by the same `dt × rate`, so the crew walks four or sixteen times as fast under fast-forward and stands still when paused.

One function, `burnRate(t, speed)`, takes the burn and the chosen speed and returns the rate. It reads no `G`, so it runs in `tests/nodecontext.js`.

## The stages, in ship time

`phase()` reads the stages from ship time, not from shares of the trip:

| Stage | Ship time | Real time at 1x |
|---|---|---|
| `couch` at departure | the first `COUCH_HOURS` (6 h) | 20 s |
| `secure` before the flip | `STRAP_MIN` (20 min) up to the float | slow motion, below |
| `float` | `FLOAT_MIN` (6 min) centred on the midpoint | slow motion |
| `secure` after the flip | `STRAP_MIN` (20 min) after the float | slow motion |
| `couch` at arrival | the last `COUCH_HOURS` (6 h) | 20 s |

The flip window (strap, float, strap) is 46 ship minutes, about 2.6 burn seconds. It is played at `FLIP_RATE`, set so that it lasts `FLIP_REAL` (25) real seconds: `FLIP_RATE = window / FLIP_REAL`, worked out from the window in burn seconds. The ship's clock and the calendar stay true, and only the on-screen speed changes. After the window the chosen speed comes back.

A burn whose couches and flip would overlap (none does: the shortest trip is 5 days) clamps each span to the share of the trip that it has today.

## What stays the same

- **Days, pay, fuel and the drive.** `t.days`, `transitDays`, `transitNow` and `transitEta` (`js/engineering.js`) read progress and are unchanged. The soak checks should not move.
- **How many scenes a burn has.** The count keeps today's formula on today's length: `1 + floor(oldSeconds / 40)`, where `oldSeconds` is today's `transitSeconds`. A longer burn does not bring more scenes. Their times stay spread over the burn by share, as now.
- **Chatter, rumors, intercepts, the family's end-of-trip moment.** All are placed by progress or by share of `total`, and keep their place.
- **Scenes stop time,** as now. The chosen speed carries on after a scene closes.
- **The menus' pause** (`G.paused`, `js/menu.js`) is separate and unchanged.

## Controls

- **Keys, in a burn:** Space pauses and resumes; 1, 2 and 3 choose 1x, 4x and 16x. Space is the fire key only in free flight (`KEYMAP`, `js/game.js`), and a hand never flies in a burn.
- **Buttons:** four small buttons on the burn bar: pause, 1x, 4x, 16x. The chosen one is lit.
- **The burn bar** shows the speed beside the clock (`paused`, `4x`, `16x`; nothing at 1x), and `flip` while slow motion plays. The clock shows the real time left at the chosen speed: `left / burnSpeed()` divided by the speed, with the flip window, if still ahead, counted at `FLIP_REAL`. Paused, it shows the time left at 1x.
- The speed is kept on `G` (declared in `js/game.js`), not in the save: a new burn starts at 1x.
- The menus' help page lists the keys.

Paused, the screens of the burn view (Gunnery, Comms, Engine, the crew) stay open and usable.

## Testing

- **Node (`tests/nodecontext.js`):** `transitSeconds(days)` is `days × SHIP_DAY`; `burnRate` gives 0 paused, the chosen speed outside the flip, `FLIP_RATE` inside it at every speed; the flip window lasts `FLIP_REAL` real seconds on a 5-day and a 37-day burn; `phase()` gives `couch`, `secure`, `float`, `secure`, `couch` at the ship times in the table; the scene count is today's on a 5-, 11- and 37-day burn.
- **Browser:** Space pauses (the burn and the crew stand still, a screen opens) and resumes; 1, 2 and 3 set the speed and light their button; at 16x the flip still takes about 25 s; a scene stops time and the speed carries on after it.
- **Soak:** `npm run soak` for days and pay. They should be unchanged.

## Out of scope

The flip's own scenes and downtime (#989), comms that match the crew (#987) and the watch in the burn view (#951). The longer day helps all three, but each is its own issue.
