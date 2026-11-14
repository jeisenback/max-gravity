# Trade goods

Status: draft for the owner's review, 2026-11-14. It names what moves in the holds, who makes it, who wants it and what the law says about it, so that the freight the hand carries in chapter 1 and the trade the co-op takes up in chapter 2 come from one world. The goods, prices and inspections in the first sections are as built (the code wins, `README.md`); the rest is proposed. The law by port kind is `trade-and-law.md`; where things go is `economy.md`.

## What it is for

The game prices seven goods at nineteen markets, and the captain's contracts and the ice runs move them. But a good is only a name and a number: nobody says who made the parts, what is in the medical crates, why Mars licenses water, or what the Rook sells cheap. The hand does not trade in chapter 1 (`docs/design.md`, Market and exchange), so they meet goods as freight: what is in the hold, who shipped it, what the inspector asks about. In chapter 2 the co-op buys and sells, and the goods need owners, origins and law enough to make a choice of them.

## The goods as built

| Good | Base price | What it is | Made at (priced low) | Wanted at (priced high) |
|---|---|---|---|---|
| **Water** | 800 | ice cut and melted: drinking, air, reaction mass | Europa, Enceladus, Triton; the outer Belt's rocks on an ice run | Mercury, Mars, Ceres and Ring Nine, Pallas and the Hollows, Ironheart, Eros |
| **Food** | 1,000 | grown in the domes and the farm rings; concentrates and protein | Juno, Ganymede | nearly every Belt port; Mars, Mercury, Enceladus |
| **Refined Metals** | 1,500 | the refineries' plate, bar and powder | Mars, Ceres, Pallas, Ironheart, Triton | Earth, Enceladus |
| **Machine Parts** | 2,000 | pumps, seals, valves, bearings: what keeps a station's plant running | Hermes Foundry, Earth, Ironheart | Pallas, Eros, Europa, Titan |
| **Medical Supplies** | 3,000 | drugs, clinic stock, the scans' consumables | Earth, Titan | Ceres and Ring Nine, the Rook and the Boneyard, Juno, Triton |
| **Electronics** | 3,500 | boards, sensors, the navigation and comms sets | Hermes Foundry, Earth | Mars, Pallas, the Rook, Juno, Ganymede, Titan, Triton |
| **Luxury Goods** | 4,500 | Earth's finished goods: cloth, spirits, real coffee, tobacco | the Rook, Eros (what the havens take off a hull) | Earth, Ironheart, Juno, Ganymede, Triton |

A market's price is its level (low, middling, high: three quarters, the base, and three tenths over, `PRICE_MULT`, `js/data.js`) with the day's movement on it. Luna and Phobos Yards are yards and keep no market. A contract ships what a port prices low, and some of what it prices middling, to a port in reach that prices it higher (`js/contracts.js`).

One reads wrong against the world (`economy.md`): Earth makes metal of its own and lifts little off the well, but Earth prices metal high. That is a slip (the owner, 2026-11-14), to be put right in the code; the rest fits.

## Who makes it and who owns it

Proposed, from `owners.md` and `economy.md`: each good has an owner at its source, and that owner is who the contract's shipper works for.

- **Water and ice.** The depot owners (Kaur at Vesta and the Belt's depot towns, Tycho at the inner depots) own the melt and the enrichment; the outer moons' ice works sell to whoever berths. An ice run's water is the one good the hand's own ship makes.
- **Food.** Juno's farm co-op and Ganymede's domes. The Belt cannot feed itself, so food is the commonest freight and the thinnest margin.
- **Refined metals.** The refining companies: Pallas Refinery's owners, Ceres's smelters, Ironheart's. This is what the Belt is for.
- **Machine parts.** Hermes Foundry, Earth orbit's yards, Ironheart's shops. A part is licensed to the plant it fits (`technology.md`), and a print of one without the licence is the commonest contraband.
- **Medical supplies.** Earth's houses, and Titan's labs. Registered at Earth; a crate without the registry is a drug.
- **Electronics.** Hermes Foundry and Earth. Navigation and comms sets carry the maker's keys; a reflashed set is worth more at the havens than a new one.
- **Luxury goods.** Earth's finished goods going out, and what the havens resell. The Rook prices them low because they came off someone else's hull.

## The law, as built and as written

As built, three owners inspect at their ports, and each licenses one good for import; landing it without the licence costs a duty of fifteen percent of its value at base, and a licence cannot be had yet (`js/inspection.js`):

| Owner | Inspects at | Licenses |
|---|---|---|
| Arcology Pact | Earth, Luna | Medical Supplies |
| Dome Pact | Mars, Phobos Yards | Water |
| Guild Federation | Ceres, Ring Nine, Pallas, the Hollows, Juno, Titan, Enceladus | Machine Parts |

The independent ports and the Rook do not inspect.

`trade-and-law.md` writes the law by kind of port, with goods the game does not have (weapons, unlicensed prints, unregistered drugs, air and water kits, a rival's fuel) and bans the game does not make. The two meet so:

- **The Arcology licenses medicine** because unregistered drugs are its ban: registered stock lands under licence, anything else is the same crates without the paper.
- **The Dome Pact licenses water** because water kits undercut the air bill: the domes sell their own water, and outside water lands only on a dome's contract (the ice run's premium, `ICE_PREMIUM`).
- **The Guild licenses machine parts at its yards only** (the owner, 2026-11-14): Ceres Station and Titan, which have yards, protect the yards' parts; the other Guild stations tax berth and handling, not goods, as `trade-and-law.md` says. The code licenses parts at the Guild's ports with a shipyard (`LICENSED_AT_YARDS`, `js/inspection.js`, #1205); its other ports still inspect for bad standing, which is left open.
- **The bans are new goods** (the owner, 2026-11-14), not variants of the seven: see Chapter 2's goods, below. They stay out of chapter 1.

## Chapter 2's goods

Seven goods are enough for chapter 1, where the hand only carries freight. For the co-op's trade the owner has added six (2026-11-14), for thirteen. They come with chapter 2, and the narrow build keeps the seven.

**Two lawful goods the world already runs on:**

| Good | What it is | Made at | Wanted at |
|---|---|---|---|
| **Air** | oxygen and the kits that make it; what a station's air bill pays for | the depots and the outer moons' ice works, from ice | every small rock and freehold; any station whose air plant has failed |
| **Ore** | unrefined rock from the Belt's mines | the mines and claims of the Belt | the refineries (Pallas, Ceres, Ironheart), which own the step between the miner and the market |

The Mars domes ban unmetered air kits, which undercut the air bill (`trade-and-law.md`), so air lands there only on a dome's contract, as outside water does. Ore is priced low wherever it is dug, since the refineries set what they pay.

**Four banned goods, one for each ban `trade-and-law.md` names:**

| Good | What it is | Banned at | Sold openly at |
|---|---|---|---|
| **Arms** | sidearms, ammunition, a gun mount's parts | the arcology docks; the co-ops' and guild stations' bars | the havens |
| **Prints** | parts printed without the maker's licence; cheap, and they undercut the yards | the corporate ports and the yards | the havens, the freeholds |
| **Grey medicine** | drugs without Earth's registry | the Arcology | the havens; the freeholds, which cannot pay for registered stock |
| **Depot fuel** | deuterium from a rival's depot, in canisters | Kaur's depot towns (Tycho's fuel); Tycho's depots (Kaur's) | the havens; any ship short of a load in the war |

A banned good is worth most just where it is banned (`trade-and-law.md`). Inspections find it (`js/inspection.js`), and a find costs more than a duty: the cargo, a fine, and a mark on the record.

## Fuel and reaction mass

Neither is a good in the market. Reaction mass is water, bought at every port's refuelling and spent each burn (the game's `fuel`); fuel is deuterium, enriched from ice at the depot owners' plants, and the largest cost of running a ship (`economy.md`, Fuel), carried by the owner and not counted trip by trip (`technology.md`, The drive). So ice feeds both, and the depots are the chokepoint the fuel war is about (`the-fuel-war.md`). Proposed: neither is a market good; the war moves their prices at the pump, and moves water's price in the markets. The one exception is depot fuel, a rival's deuterium carried as contraband (Chapter 2's goods).

## How prices move

As built, a market's price drifts, and the comms post's tips move it (`js/comms.js`, `js/market.js`). `trade-and-law.md`, Shortages and gluts, writes the movements as events (an air plant failing, a depot rationing, a yard striking, a big freighter docking, Juno's harvest), each lasting days, spreading to the ports that trade with the place, and fading. Proposed for chapter 2: those events are the movement, each tied to a good and a place, and the tips are news of them.

## In play, by chapter

**Chapter 1 (the hand).** The hand does not buy or sell. They meet goods as:

- the hold's manifest and the cargo bay (`js/bridge.js`), and what the captain chose to carry;
- the shipper on the contract, named for the port's own people or a freight office (`SHIPPERS`, `js/contracts.js`);
- the ice run, the one good the ship makes;
- the inspector at a licensing port, and what the hold costs there;
- the bar's and the bands' talk of prices.

What chapter 1 needs from this page: each good's name, what it is, who ships it and what is licensed where, so that the scenes' words (a crate, a shipper, an inspector's question) agree with the hold. No new goods and no new mechanics.

**Setting up chapter 2.** The co-op's goods seen first: the boards' shippers as people (`cast.md`, recurring and regular), a price heard in a bar, the inspector's licences, and the strike and the war moving water and parts.

**Chapter 2 (the co-op).** The co-op trades (`trade-and-law.md`, The kinds of work):

- buying and selling at the markets, with what the co-op knows of the prices (last seen, heard);
- what the co-op may trade, decide and pay for, put to `role()` (`js/role.js`), not a fork on `hired()`;
- the licences, as papers a co-op can buy (`progression.md`, layers 5 and 6);
- the six new goods: air and ore, and the four banned goods, with smuggling;
- aid to the freeholds, paid in ice and barter (`places.md`);
- shortages and gluts as events, and the war's effect on water, parts and fuel.

**Later.** Goods by bloc in full, a bloc's tariffs, and the large hauls of a fleet (`later-chapters.md`).

## What the game changes to fit

Chapter 1: words, and two fixes. Where a scene names a good, a shipper or a licence, it uses this page; the Guild's licence is at its yards (`LICENSED_AT_YARDS`, `js/inspection.js`, #1205, done), and Earth no longer prices metal high (`js/data.js`, #1206). Chapter 2, in order, after the owner's review: licences as papers; shortages and gluts as events; the six new goods, and finds of a banned good at inspection; the co-op's trade through `role()`.

## Open questions for the owner

- Does a co-op need papers or contacts to buy a banned good, or can it buy one at any haven?

## Assumptions to confirm

- The seven goods and their prices stay as built for chapter 1; this page gives them makers, owners and words.
- Fuel and reaction mass are not traded goods; the war moves them at the pump.
- Chapter 1 needs words only; trade mechanics wait for chapter 2.
- Chapter 2 adds six goods (air, ore, arms, prints, grey medicine, depot fuel), for thirteen; ice stays water, and luxury goods stay one good.
