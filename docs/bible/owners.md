# The powers

Status: draft for the owner's review, 2026-11-11. The owner chose two layers: blocs where the code's powers are now, and the big owners as powers inside them. Built on `economy.md`, `jurisdictions.md`, `trade-and-law.md`, `the-belt.md` and `the-fuel-war.md`. It replaces the code's three powers (conflict 9 in `README.md`).

## What it is

There are no governments (`README.md`, decision 2). There are two kinds of power, and every port answers to one of each.

- **A bloc** is the law of a place: a pact among the owners of a region, which sets what may be landed, who inspects, who patrols, and whose licences count. A bloc has no navy of its own, only the patrols its members pay for. It does not go to war. It sits where the code's three powers sit, one to a region.
- **An owner** is a company that owns things: docks, depots, yards, refineries, debt. Owners compete, buy each other's chokepoints, and in the end fight. The war is an owners' war (`the-fuel-war.md`), and the blocs are where it happens.

A port's law is its bloc's. Its dock belongs to an owner. A ship deals with both: the bloc's inspector at the hatch, and the owner's prices, contracts and berths.

## The blocs

| Bloc | Replaces | Where | What it is |
|---|---|---|---|
| **The Arcology Pact** | Arcology Compact | Earth, Luna, Lagos Ring | The arcology holding companies' licensing and bond pact. It licenses the Luna yards, the launch platforms and the riggers. Its patrols keep Earth's traffic zone. |
| **The Dome Pact** | Dome Concord | Mars, Phobos Yards | The dome companies' patrol agreement, paid for from the air levy. It keeps the patrol and the Phobos yards. |
| **The Guild Federation** | Charter League | Ceres, Pallas, Juno, and the Saturn ports | The Belt guild stations and co-ops, federated for berth rights, water and recognition. The Saturn companies joined for its recognition of their docks. Its members' pickets ask what you carry and for whom. |
| **The pirates** | Pirate | the lanes nobody patrols | Not a bloc. The standing a hull has with the crews who take the small runs, as now. |
| **Independent** | Independent | Mercury, Psyche, Eros, the Jupiter moons, Triton | Places under no pact: a corporate space, a co-op, a town trust, a settlers' association. Their law is their own (`jurisdictions.md`). |

Hygiea's havens (the Rook, the Boneyard) are Independent in the sense that no pact reaches them, and the pirates' standing is what counts there.

What each bloc bans and taxes is the table in `trade-and-law.md`, by kind of port. The licensed good each inspects for is the code's (`LICENSED`, `js/inspection.js`), moved to the bloc: medical supplies at the Arcology Pact's ports, water at the Dome Pact's, machine parts at the Guild Federation's.

## The owners

The major owners act in the world. Each has a standing of its own with the ship, kept by name, apart from the blocs' (`trade-and-law.md`, Standing; `later-chapters.md`: standing is kept by the body that holds it).

| Owner | Bloc | Owns | Wants |
|---|---|---|---|
| **Tycho Yard Holdings** | Arcology Pact | Luna's largest yard group, the inner fuel depots | Vesta's depot, to stop paying Kaur's price |
| **Kaur Enrichment** | Guild Federation | The Vesta depot and the Belt's depot towns | To keep Vesta, and the Belt's leash with it |
| **Van Leeuwen & Co.** | Arcology Pact (Rotterdam) | No port: paper. The co-op's loan, Hester's charter, Tycho's war chest | A return on both sides, and the war settled its way |
| **Ballast Security** | none | Ships and guns, under contract to Tycho | The next contract |

The minor owners own one place each, and their standing is local: the Water Authority (Europa), the land company (Ganymede), the pharmaceutical company (Titan), the water company (Enceladus), the refining companies (Hermes Foundry, Pallas Refinery), the launch companies (Lisbon, Lagos), and the guilds that set Ceres's berth rates. They do not take sides in the war unless it reaches their dock. Their names are given when a scene needs one.

## How the two layers meet

- **At the hatch:** the bloc. Its inspector, its banned and licensed goods, its fines. A ship's standing with the bloc decides how hard it is looked at.
- **On the board:** the owner. Contracts carry an owner's name (the shippers, `js/shippers.js`). A corporate port bans a rival owner's goods (`trade-and-law.md`: a corporate port bans a rival's fuel).
- **On the lanes:** a bloc's patrols near its places, an owner's hired guns on "escort" contracts, and the pirates where neither goes (`trade-and-law.md`, the zones of law).
- **In the war:** the owners. Kaur and Tycho fight over Vesta inside the Guild Federation's space, with Ballast's guns and Van Leeuwen's money. The blocs do not fight one another. They are pushed to take a side, and their members disagree.
- **In the world's state:** each bloc has an economy (boom, slump, shortages), which the code's faction economies become. The code's wars between powers go. The owners' incidents, lawsuits, price wars and, in chapter three, blockade take their place.
- **For people:** a person is from a bloc's place, or an Independent one, and may work for an owner. The code's ties (`js/ties.js`) read the person's bloc for home and the owner for work.

## What the game changes to fit

In order, each its own piece of work:

1. **The names.** `FACTIONS`, `STATE_FACTIONS`, every system's `gov` and `LICENSED` take the blocs' names. The mission arcs move with them: the League's water dispute becomes the Federation's, the Concord's audit the Dome Pact's, the Compact's licence the Arcology Pact's. Saves migrate their standing by name. Nothing plays differently.
2. **The wars.** The world's wars between powers (`js/world.js`) stop. The economies stay, per bloc. The faction war that recalls crew home (`js/ties.js`) waits for the owners' war.
3. **The owners' standing.** Standing with Tycho, Kaur and the lender is kept by name beside the shippers' (`js/shippers.js`). Chapter two's squeeze reads it.
4. **The war.** The fuel war's rumblings in chapter two and its blockade in chapter three, read from the world's state (`the-fuel-war.md`).

## Assumptions to confirm

- Two layers: a bloc for each region's law, and owners who own, compete and fight.
- The names: the Arcology Pact, the Dome Pact, the Guild Federation.
- The Saturn ports sit in the Guild Federation, as the code has them in the League.
- The blocs do not go to war; the war is the owners'.
- Four major owners (Tycho, Kaur, Van Leeuwen, Ballast); the minor owners named when a scene needs them.
- Each bloc keeps an economy; standing is kept per bloc and per major owner.
