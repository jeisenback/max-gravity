# Max Gravity

A small space trading and combat game, an homage to Ambrosia Software's *Escape Velocity*.
Fly between planets, trade commodities, take delivery and bounty missions, fight pirates, and trade up to a better ship.

Hyperspace jumps take 1-2 minutes of real time. In transit you get random events with choices (distress calls, pirate interdictions, cargo pods, and more), market rumors that shift prices for several days, and comms chatter. The galaxy map works in hyperspace, and events pause the transit timer.

## Running

No build step and no dependencies. Open `index.html` in a browser.

Progress is saved automatically in your browser's localStorage whenever you land.

## Controls

| Key | Action |
| --- | --- |
| Up / W | Thrust |
| Left, Right / A, D | Rotate |
| Down / S | Turn to face opposite your direction of travel (for braking) |
| Space | Fire |
| Tab | Cycle target |
| L | Select nearest planet; press again when close and slow to land |
| M | Galaxy map (click a system to plot a course; also works in hyperspace) |
| J | Hyperjump along your plotted course (costs 100 fuel, must be away from the system center) |
| T | Take off (while landed) |

## Layout

- `js/data.js` - commodities, ships, star systems, and planets
- `js/game.js` - game state, flight physics, AI, combat, jumping, rendering, and input
- `js/ui.js` - landed screens: spaceport, commodity exchange, mission BBS, shipyard
- `js/hyperspace.js` - hyperspace transit, choice events, market rumors (tune `HYPER_MIN`/`HYPER_MAX` for jump length)
