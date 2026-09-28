# Max Gravity

A small space trading and combat game set in our own solar system. It's an homage to Ambrosia Software's *Escape Velocity*, flavored by *The Expanse*.
Fly between planets, moons, and Belt stations. Trade commodities, take delivery and bounty missions, fight pirates, and trade up to a better ship.

There is no faster-than-light travel. You plot a direct burn to any destination in range. Travel time (days) and reaction mass scale with real orbital distance: Earth to Mars is 5 days, Saturn is 15, and Triton is more than a month out. Each burn takes 1-2 minutes of real time. You accelerate, flip at the midpoint, and decelerate. In transit you get random events with choices (distress calls, pirates, derelicts, and more), market rumors that shift prices for weeks, and comms chatter. Events pause the transit timer.

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
| L | Select nearest body; press again when close and slow to land |
| M | System map (click a destination to plot a burn; also works in transit) |
| J | Start the plotted burn (must be clear of local space) |
| T | Take off (while landed) |

## Layout

- `js/data.js` - commodities, ships, locations, and bodies (factions and names are original stand-ins; rename freely)
- `js/game.js` - game state, flight physics, AI, combat, burns, rendering, and input
- `js/ui.js` - landed screens: spaceport, commodity exchange, mission board, shipyard
- `js/transit.js` - transit between locations, choice events, market rumors (tune `TRANSIT_MIN`/`TRANSIT_MAX` for burn length)
