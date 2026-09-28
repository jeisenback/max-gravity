# Max Gravity

A small space trading and combat game set in our own solar system. It's an homage to Ambrosia Software's *Escape Velocity*, flavored by *The Expanse*.
Fly between planets, moons, and Belt stations. Trade commodities, take delivery and bounty missions, fight pirates, and trade up to a better ship.

There is no faster-than-light travel. You plot a direct burn to any destination in range. Travel time (days) and reaction mass scale with real orbital distance: Earth to Mars is 5 days, Saturn is 15, and Triton is more than a month out. Each burn takes 1-2 minutes of real time. You accelerate, flip at the midpoint, and decelerate. In transit you get random events with choices (distress calls, pirates, derelicts, and more), market rumors that shift prices for weeks, and comms chatter. Events pause the transit timer.

## People

Passengers, hireable crew, and ship captains are procedurally generated. Each has a culture-appropriate name (Earth, Mars, or the Belt), a home, a job, two personality traits, a reason for traveling, and sometimes a secret (contraband, wanted, ill, a spy, or in debt). Transit events come from who they are: a smuggler triggers a customs inspection, a wanted fugitive attracts a bounty hunter, a nervous traveler panics at the flip.

People remember you. Everyone you carry or hire keeps an opinion of you and a memory log (Crew tab, "People you know"). Friends turn up later at spaceports with gifts, tips, paid favors, or repaid debts; people you betrayed may send a hired gun after you. Crew have trait-driven events and chatter, and walk off the ship if they come to dislike you.

Crew fill six roles (engineer, pilot, gunner, quartermaster, slicer, medic) with skill 1-3; perks scale with skill, and role-tagged options appear in transit events when someone aboard fills that role. Five handcrafted crew (Rosa at Ceres Station, Dima at Mars, Kit on Luna, Josef on Ganymede, Wren at The Rook) have personal storylines, and five handcrafted passenger groups still turn up occasionally. Crew and passengers share the ship's berths.

Every ship in flight has a named captain with a personality. Hail them to talk: traders share news, sell reaction mass, and buy cargo mid-flight; pirates announce their demands as they close in, and can be paid off, threatened, fooled by a slicer, or made to give up their own cargo when beaten; hired guns can be outbid; a badly damaged bounty target may surrender.

Captains you deal with (hail, trade, pay off, rob, or shoot at) are remembered, with their ship and home system, and turn up again there. Friendly traders give better terms; captains with a grudge refuse to deal or come looking for you; pirates you have paid raise their price each time. Killed captains are gone for good.

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
| H | Hail your target (or the nearest ship): trade, ask for news or reaction mass, pay off or threaten pirates |
| L | Select nearest body; press again when close and slow to land |
| M | System map (click a destination to plot a burn; also works in transit) |
| J | Start the plotted burn (must be clear of local space) |
| T | Take off (while landed) |

## Layout

- `js/data.js` - commodities, ships, locations, and bodies (factions and names are original stand-ins; rename freely)
- `js/game.js` - game state, flight physics, AI, combat, burns, rendering, and input
- `js/ui.js` - landed screens: spaceport, commodity exchange, mission board, shipyard
- `js/crew.js` - handcrafted crew and passenger groups, role perks, and wages
- `js/people.js` - procedural people: generation, passenger and crew events, memory, and reunions
- `js/hail.js` - hailing ships in flight
- `js/transit.js` - transit between locations, choice events, market rumors (tune `TRANSIT_MIN`/`TRANSIT_MAX` for burn length)
