# Roadmap

Long-term milestones, in order. Each builds on the ones before it.

## 1. A living solar system
- **Orbits and launch windows** (started): every location orbits at its real period, so travel time and reaction mass change over the months. The system map shows the best upcoming window for a plotted burn.
- **Pirate unrest and NPC shipping** (done): raids flare up, NPC haulers avoid dangerous lanes, and shortages and gluts follow; killing pirates clears the lanes.
- **Faction states** (done): economies boom and slump; incidents build tension until two factions go to war, with navies fighting in each other's space and wartime demand in their markets.
- **Markets with real stockpiles** (done): a station runs short because nobody hauled the goods, and NPC traders actually carry cargo.
- The Cold Water story becomes one case of this general system.

## 2. Your own shipping company
- **Escorts that fly with you in combat** (done).
- **Extra ships crewed by hired captains that run trade routes on their own** (done).
- **Stakes in stations that pay out based on the region's economy** (done).

## 3. A storylet narrative engine
- **Story and events as data** (done): storylets unlocked by location, day, standing, cargo, crew, qualities, and the living world, with the Ice Haulers' Strike as the first storyline.
- **Move Cold Water's scenes onto storylets** (done), keeping its special machinery (agent ships, the blockade) as code they call into.
- Competing campaign arcs, as in Escape Velocity Nova: **a Mars Navy career** (done: Reserve Commission) and **a pirate lord's rise** (done: The Rook's Crown), and **a corporate climb** (done: The Partner's Chair, with the Tethys Shipping Consortium rather than Aquilon, whose path already runs through Cold Water); the three exclude each other.
- **Mods can write whole storylines without code** (done: `M.addStorylet`).

## 4. Expanse-grade combat, on the console
The captain decides and the crew flies: piloting and real-time fighting are the least interesting part of the game. Design: `COMBAT.md`.
- **4a**, in the old flight model: **torpedoes and point-defense turrets** (done), escorts (done in milestone 2), **boarding and capture, and a medic who matters** (done).
- **4b**, momentum flight and real-time burn fights (`js/engage.js`): built as a prototype, now **dropped**. It gets retired in favor of the card duel (#52).
- **4c**, card combat: a threat-and-answer ship duel with decks built from the ship (#42), made the only combat (#52), with automated flight and the flight screen as a backdrop (#53), a boarding duel (#43), cards from every system and post (#47), hardcore mode (#44), and a balance simulation (#45).

## 5. Frontier and legacy
- **Found and grow an outpost** (done: Callisto or Nereid, supplied from your hold, with buildings and settler moments).
- **Legacy** (done): when a captain retires or dies, the next inherits part of the company, contacts, and standing.

## 6. Community platform (alongside the others)
- **An in-game mod browser that loads mods by link, and shareable scenarios** (done: the Port tab's Mods and Scenarios sections).
- **Shared news** (done, on claude.ai): other players' deeds show up as news and chatter in your game, for captains who opt in.
