# Factions

One entry for each name in `FACTIONS` in `js/data.js`. What the code does with them (standing, patrols, ties, customs) is in `js/factions.js` and `js/ties.js` and is not copied here. The three powers are on the audit list in `derived.md`, so each carries a `Divergence:` line, and the texture below is deliberately its own. The owner has decided to keep three powers, reshaped as proposed, and expects the outer planets (Jupiter, Saturn, Neptune) to split into factions of their own later, with Ganymede as an anchor. Do not write the three as final.

### faction.earth-coalition

- Source: `FACTIONS`, `PATROL_NAMES` in `js/data.js`; `CULTURE_FACTION` in `js/ties.js`; standing from -100 to 100 (README, "Factions and outfitting").
- Wants: Licenses honored, tariffs paid, and the wall rotas kept.
- Treats a hand: By the license book. A lapsed license makes a person an exile in the code's terms; a stamp in good order is the way into a Trusted contract.
- Shows up as: A Coalition cutter in flight, a license desk on the dock.
- Divergence: `derived.power-triangle`. A compact of arcology cities, with no world government.
- Use in scenes: An officer asks for the license and the owed shifts, in that order.
- Status: from code (js/data.js, js/ties.js) for the patrol and the statuses; the license book is confirmed (owner, 2026-10-08)

### faction.mars-republic

- Source: `FACTIONS`, `PATROL_NAMES` ("MRN frigate") in `js/data.js`; `CULTURE_FACTION` in `js/ties.js`.
- Wants: Air accounts kept clean and dome rules explained to anyone who will listen.
- Treats a hand: Politely and in detail. A Martian will tell you why their way is the right one (from the code's description), and will check the work.
- Shows up as: A patrol frigate; an auditor on the dock.
- Divergence: `derived.power-triangle`, `derived.mars-navy`. A set of dome municipalities sharing a fleet, paid for by an air levy.
- Use in scenes: An auditor asks for the air bill before the manifest.
- Status: from code (js/data.js) for the patrol and the manner; the air levy is confirmed (owner, 2026-10-08)

### faction.belt-collective

- Source: `FACTIONS`, `PATROL_NAMES` ("Collective militia") in `js/data.js`; `CULTURE_FACTION` and `FACTION_COOL` in `js/ties.js`.
- Wants: Water and berth rights honored on every station.
- Treats a hand: By where they are from. A stranger is fed first and asked later (Ring Nine, from the code). A person is named by the hatch and the spin.
- Shows up as: A militia boat on a lane; a ration notice on a corridor wall.
- Divergence: `derived.power-triangle`, `derived.belter-people`. A league of stations held by chartered guilds that vote on water and berth rights, with no single people.
- Use in scenes: A guild clerk reads out the vote on the berth rate before a docking is allowed.
- Status: from code (js/data.js, js/ties.js) for the patrol and the welcome; the guild vote is confirmed (owner, 2026-10-08)

### faction.pirate

- Source: `FACTIONS` in `js/data.js`; the Hygiea system, with government Pirate; the Rook and the Boneyard.
- Wants: Tribute and passage fees, and no one asking where the cargo came from.
- Treats a hand: Pirates who trust you often leave you alone (README). Everyone else is a payer or a prize.
- Shows up as: Raiders and corsairs in flight; the Rook on Hygiea as a port.
- Use in scenes: A raider names the fee before it names the threat.
- Status: from code (js/data.js, README) for Hygiea and the trust; the fee order is confirmed (owner, 2026-10-08)
