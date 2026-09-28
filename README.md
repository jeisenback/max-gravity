# Max Gravity

A small space trading and combat game set in our own solar system. It's an homage to Ambrosia Software's *Escape Velocity*, flavored by *The Expanse*.
Fly between planets, moons, and Belt stations. Trade commodities, take delivery and bounty missions, fight pirates, and trade up to a better ship.

Markets react to you: buying a good raises its local price and selling lowers it (about 0.2% per ton, up to 40%), recovering over a couple of weeks. A small hold barely moves a market; a big one has to spread its trade across routes. Pirates fly heavier ships in rougher space, so the Belt and Hygiea call for a gun upgrade.

There is no faster-than-light travel. You plot a direct burn to any destination in range. Travel time (days) and reaction mass scale with real orbital distance, and everything orbits at its real period, so routes open and close over the months: Earth to Mars runs 4 to 8 days, Saturn about 15 to 18, and Triton more than a month out. The system map shows the best upcoming window for a plotted burn. Each burn takes 1-2 minutes of real time. You accelerate, flip at the midpoint, and decelerate. In transit you get random events with choices (distress calls, pirates, derelicts, and more), market rumors that shift prices for weeks, and comms chatter. Events pause the transit timer.

## People

Passengers, hireable crew, and ship captains are procedurally generated. Each has a culture-appropriate name (Earth, Mars, or the Belt), a home, a job, two personality traits, a reason for traveling, and sometimes a secret (contraband, wanted, ill, a spy, or in debt). Transit events come from who they are: a smuggler triggers a customs inspection, a wanted fugitive attracts a bounty hunter, a nervous traveler panics at the flip.

People remember you. Everyone you carry or hire keeps an opinion of you and a memory log (Crew tab, "People you know"). Friends turn up later at spaceports with gifts, tips, paid favors, or repaid debts; people you betrayed may send a hired gun after you. Crew have trait-driven events and chatter, and walk off the ship if they come to dislike you.

Crew fill six roles (engineer, pilot, gunner, quartermaster, slicer, medic) with skill 1-3; perks scale with skill, and role-tagged options appear in transit events when someone aboard fills that role. Five handcrafted crew (Rosa at Ceres Station, Dima at Mars, Kit on Luna, Josef on Ganymede, Wren at The Rook) have personal storylines, and five handcrafted passenger groups still turn up occasionally. Crew and passengers share the ship's berths.

Every ship in flight has a named captain with a personality. Hail them to talk: traders share news, sell reaction mass, and buy cargo mid-flight; pirates announce their demands as they close in, and can be paid off, threatened, fooled by a slicer, or made to give up their own cargo when beaten; hired guns can be outbid; a badly damaged bounty target may surrender.

Captains you deal with (hail, trade, pay off, rob, or shoot at) are remembered, with their ship and home system, and turn up again there. Friendly traders give better terms; captains with a grudge refuse to deal or come looking for you; pirates you have paid raise their price each time. Killed captains are gone for good.

## Story: Cold Water

A grounded political plot about who controls the Belt's water. Act 1 starts in transit once you have a little experience (day 10 or later): a derelict ice hauler, a data core someone badly wants back, a company recovery agent, and a fired Ceres water engineer, Mira Castellane, who needs passage to Europa to read it. Once the story starts, some market rumors are really news of the sabotage. In Act 2 you decide who gets the proof: the Belt Collective (Ceres Station), Mars Republic Navy intelligence (Mars, needs Trusted standing), Coalition intelligence (Luna), or Aquilon itself (Hermes Foundry). Each path is a short chain of missions with its own ending, and some choices switch you to another side. In Act 3, fleets blockade Ceres and you must run 20 tons of water to Ceres Station, with your side's ships, friends you have made, and hired guns paid by people you wronged all joining the fight. A last choice at the station decides one of five endings (Belt, Mars, Earth, Aquilon, or the truth), followed by an epilogue about Ceres, Mira, your crew, and your record. The endings change water prices in the Belt for good, and the game carries on afterward. Your current objective, a story log, and the epilogue are on the Spaceport tab.

## Factions and outfitting

You have a standing (-100 to 100) with the Earth Coalition, Mars Republic, Belt Collective, and the pirates: Hostile, Distrusted, Neutral, Trusted, or Honored (Spaceport tab). Missions and bounties for a faction raise it; killing pirates helps the local government and angers pirates; shooting traders or patrols costs you. Faction patrols fight pirates and hunt you once you are Distrusted (hail them to pay your fine); Hostile ports refuse to let you land. Trusted captains get better-paid contracts, military gear, and the Corvette. Pirates who trust you often leave you alone.

Outfitters (in the Shipyard tab at shipyards and The Rook) sell guns, heavy rounds, armor, deflectors, reaction mass tanks, cargo pods, drive tuning, passenger berths, and a pirate-only transponder spoofer. Outfits use cargo space and move with you when you change ships.

## Running

No build step and no dependencies. Open `index.html` in a browser.

Progress is saved automatically in your browser's localStorage whenever you land.

## Controls

On phones and tablets: drag the joystick (bottom left) toward where you want to fly; push it far out to thrust. Hold FIRE and BRAKE on the right. The button row gives Target, Hail, Land, Map, and Burn. Tap a ship to target it, or a planet to set it as your nav target. Landed screens keep Sound, System map, and Take off at the bottom.

On a keyboard:

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
| + / - or scroll | Zoom the system map (true scale; places beyond the edge show as pointers on the rim) |
| J | Start the plotted burn (must be clear of local space) |
| T | Take off (while landed) |
| N | Sound on/off |

## Layout

- `js/data.js` - commodities, ships, outfits, locations, and bodies (factions and names are original stand-ins; rename freely)
- `js/game.js` - game state, flight physics, AI, combat, burns, rendering, and input
- `js/ui.js` - landed screens: spaceport, commodity exchange, mission board, shipyard
- `js/crew.js` - handcrafted crew and passenger groups, role perks, and wages
- `js/people.js` - procedural people: generation, passenger and crew events, memory, and reunions
- `js/factions.js` - faction standing, patrols, and fines
- `js/hail.js` - hailing ships in flight
- `js/story.js` - the Cold Water plot
- `js/touch.js` - touch controls (joystick, hold and tap buttons)
- `js/art.js` - art drawn in code: ship hulls, planets, moons, stations, gas giants, and the Sun (all lit from the Sun's real direction), plus tracers, shield flashes, explosions, smoke, and the HUD gauges and labels
- `js/mods.js` - the mod API (see Modding below)
- `mods/` - mods; `example-vesta.js` is a working example to copy
- `js/tutorial.js` - the first-run tutorial: a guided Earth-to-Mars electronics run that advances as you play (Skip in port ends it)
- `js/audio.js` - sound effects synthesized with Web Audio (no audio files): guns, hits, explosions, engine rumble, docking, burns, comms
- `js/transit.js` - transit between locations, choice events, market rumors (tune `TRANSIT_MIN`/`TRANSIT_MAX` for burn length)

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the long-term milestones.

## Modding

Mods are plain script files. A mod can add locations, ships, outfits, trade goods, and transit events, react to what happens in the game, and adjust a few values the game uses. The built-in sound, tutorial, and Cold Water story use the same API (`js/audio.js`, `js/tutorial.js`, and the end of `js/story.js`), so they are worked examples too.

### Installing a mod

Put the file in `mods/` and add a script tag for it in `index.html`, in the marked spot after the built-in systems and before `js/game.js`:

```html
<script src="mods/example-vesta.js"></script>
```

Loaded mods are listed at the bottom of the Spaceport screen. To try the example, uncomment its tag: it adds Vesta, a mining rock in the Belt with its own trade good, an outfit, a transit event, and a pirate bounty.

### Writing a mod

```js
Mods.register({
  id: 'my-mod',            // unique; also the key for the mod's saved data
  name: 'My Mod',          // shown in the Spaceport
  version: '1.0',
  init(M) {
    M.addOutfit('scoop', { name: 'Ice scoop', price: 4000, space: 2, max: 1,
      desc: '+60 reaction mass capacity.', mod: s => { s.fuel += 60; } });
    M.on('landed', planet => M.note(`Welcome to ${planet.name}.`));
  },
});
```

`init` runs once, when the script loads. Everything it registers applies from then on.

**Content.** Each adder checks for the fields the game needs and logs a console error naming anything missing. Look at the built-in entries in `js/data.js` and `js/transit.js` for full examples.

| Call | Required fields | Notes |
| --- | --- | --- |
| `M.addSystem(id, def)` | `name, au, angle, gov, planets` | Each planet needs `name, x, y, r, color, services`. Services: `trade`, `missions`, `shipyard`, `outfitter`, `refuel`. `prices` maps commodity ids to `'L'`, `'M'`, or `'H'`; goods without a level are not traded there. `au` and `angle` place it on the map. A new `gov` name gets a gray color unless you pass `govColor`. |
| `M.addShip(id, def)` | `name, price, cargo, fuel, shields, armor, accel, maxSpeed, turn, guns, size` | For sale in shipyards unless `forSale: false`. `req` sets the standing needed. Unknown hulls are drawn with the Rock Hopper's art. |
| `M.addOutfit(id, def)` | `name, price, space, max, desc, mod` | `mod(s)` changes the ship's stats (`guns, shields, armor, fuel, cargo, berths, accel, maxSpeed, dmgMult`). |
| `M.addCommodity(def)` | `id, name, base` | `base` is the medium price. Add it to planets' `prices` (including built-in ones, as the example does) so it can be traded. |
| `M.addEvent(def)` | `title, text, choices` | A transit event. Each choice has a `label` and a `run()` that returns the result text; an optional `can()` disables it when false. |

**Events.** `M.on(name, fn)`:

| Event | Arguments |
| --- | --- |
| `frame` | `dt` (seconds), every frame |
| `drawOverlay` | `viewW`, after the world, HUD, or map is drawn; draw on the global `ctx` |
| `key` | `code` (e.g. `'KeyN'`) |
| `uiClick` | `action, arg` of a port-screen button |
| `fire` | `ship` (`ship === G.player` for the player) |
| `damage` | `ship, shieldHit` |
| `destroyed` | `ship, byPlayer` |
| `enterSystem` | `systemId`, after local space is populated |
| `landed` | `planet` |
| `takeoff` | `planet` |
| `burnStart` | `destSystemId` |
| `arrive` | `systemId` |
| `eventOpened` | `event`, any choice dialog |

**Filters.** `M.filter(name, fn)`: `fn` gets the current value and returns the new one.

| Filter | Arguments |
| --- | --- |
| `price` | `credits, planet, commodityId`: price per ton |
| `canDock` | `allowed, planet`: `false` when your standing there is Hostile |
| `portBanner` | `html` shown under the port tabs |
| `dockButtons` | `html` for buttons left of System map and Take off |

**Other helpers.**
- `M.state()` returns an object saved with the game, private to your mod.
- `M.note(text)` shows a note on the port screen when docked, or a line in the flight log otherwise.
- `M.action(name, fn)` handles a button with `data-action="name"` that your mod put on the port screen. The screen re-renders afterward.

Game state is in the global `G` (`G.state` is the saved part: credits, cargo, day, location). Helpers like `msg`, `openEvent`, `changeRep`, and `rand` are globals you can call.

### When something goes wrong

A mod that throws is switched off, with a console error and a note in the flight log; the game keeps running. If a player removes a mod, saves fall back to built-in content: a ship docked at a removed location moves to Earth, and cargo, outfits, and missions from the mod are dropped.

The API does not cover the story's internals, hails, or new port-screen tabs yet. If you need a hook that isn't here, open an issue describing what you want to build.
