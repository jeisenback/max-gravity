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
- **Life and loss** (done: marks, death, a memorial record, and a two-survivor floor for the main characters, proved by Yelena's pivot, Over the Hull). Next: a third main character per background, pivots for the rest of the cast, then about ten endings that read the record. Design: `docs/superpowers/specs/2026-10-02-life-and-loss-foundation-design.md`.

## 4. Expanse-grade combat, on the console
The captain decides and the crew flies: piloting and real-time fighting are the least interesting part of the game. Design: `COMBAT.md`.
- **4a**, in the old flight model: **torpedoes and point-defense turrets** (done), escorts (done in milestone 2), **boarding and capture, and a medic who matters** (done).
- **4b**, momentum flight and real-time burn fights (`js/engage.js`): built as a prototype, now **dropped**. Retired in favor of the card duel (#52).
- **4c**, card combat: a threat-and-answer ship duel with decks built from the ship (#42), made the only combat (#52 in burns, done; #55 in local space; #56 the story set pieces), with automated flight and the flight screen as a backdrop (#53), a boarding duel (#43), cards from every system and post (#47), hardcore mode (#44), and a balance simulation (#45).

## 5. Frontier and legacy
- **Found and grow an outpost** (done: Callisto or Nereid, supplied from your hold, with buildings and settler moments).
- **Legacy** (done): when a captain retires or dies, the next inherits part of the company, contacts, and standing.

## 6. Community platform (alongside the others)
- **An in-game mod browser that loads mods by link, and shareable scenarios** (done: the Port tab's Mods and Scenarios sections).
- **Shared news** (done, on claude.ai): other players' deeds show up as news and chatter in your game, for captains who opt in.

## 7. The crew and the ship as a place
The game leans toward role-playing: people, what they think of you, and a ship you live in. Built so far: the two-deck cutaway and the Interior deck plan drawn from it, a page for each crew member (what they have told you, their bonds, their mood), portrait cards, your own page, and faces in scenes. Next, in rough order:
- **Consequence notes after a choice**: the result screen says what the choice did to how people feel ("Ines thinks better of you", "Mara and Ines are further apart"). It reports after the fact, since most outcomes are not known in advance.
- **Click a person in the burn view**: tapping someone in the cutaway opens their page.
- **A chapter recap at the buy-in**: runs and earnings, who you got close to, marks and memories, and favours done or left undone, from what the game already keeps.
- **A ship that has a night**: lights dim in the ship's night, people sleep in their bunks, and rooms hold different people at different hours.
- **Skill-gated choices for the hired hand** (done): a choice can need your post and your level there (`post`, `skill` on a choice). One for another post is hidden, and one you have not the level for is shown shut. Used so far in the needling in the galley and the cast scenes (Ines, Tomas, Yelena, Ruben, Pax) at level 2, the captain's hot-drive order (pilot and engineer, level 2), the lane scene (one choice for each post, level 2), and the captain's praise (a bonus with the figures, level 3). More scenes can use it as they are written.
- **Combat stakes for the hired hand** (started): a pirate contact now plays as an authored raid in beats (`js/engagements.js`), not the card duel: the closing and two passes, each a choice of how to meet her or the job of your own post, then she breaks off, stands off or comes alongside. Corsairs fight with torpedoes and raiders with grapples, and the beats read differently for each. when a boarding run lands in the ship duel, a hired hand fights the boarders at the lock, the corridor and the bridge (`js/boarders.js`): hold, rush or go round them, or do the job of your own post. Casualties come with it: a hurt hand works a level lower for some days, a crew member hurt twice in one fight is dead (a main character is marked instead), and a lost bridge costs a third of the ship's fund. Next: the navy stop and the ambush as authored engagements, boarding a disabled ship as an authored fight, and the same for owners.
- **More road scenes**: five or six for transit variety, if the 100-game sims still show repeats.
