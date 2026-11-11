# The powers

Status: draft for the owner's review, 2026-11-11. The owner chose two layers (blocs where the code's powers are now, and the owners as powers inside them), room for more major and minor powers, and a player whose reach widens with their power. Built on `economy.md`, `jurisdictions.md`, `trade-and-law.md`, `the-belt.md` and `the-fuel-war.md`. It replaces the code's three powers (conflict 9 in `README.md`).

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

## Major and minor powers

The owners come in two tiers, and the list is meant to grow: the bible names more owners than the game yet needs, and each chapter brings some of them into play.

- **A major power** acts across regions. It holds a chokepoint (fuel, lift, water, money, relays, guns), takes a side in the war or profits from both, and can push a bloc. Its standing with the ship is kept system-wide, by name.
- **A minor power** holds one place or one trade. Its standing is local: what it sells you, what it tells you, whether it lets you in. It takes a side only when the war reaches its dock, and the major powers court it.

A minor power can become a major one, by buying a chokepoint or by being the one place the war needs. A rock that makes fuel in a fuel war is the case `later-chapters.md` names.

### The major powers

| Power | Holds | Bloc | Wants | In the war | Comes in |
|---|---|---|---|---|---|
| **Tycho Yard Holdings** | Luna's largest yard group, the inner fuel depots | Arcology Pact | Vesta, to stop paying Kaur's price | the attacker | chapter 2 |
| **Kaur Enrichment** | the Vesta depot, the Belt's depot towns | Guild Federation | to keep Vesta | the defender | chapter 2 |
| **Van Leeuwen & Co.** | paper: the co-op's loan, Hester's charter, Tycho's war chest | Arcology Pact | a return on both sides | Tycho's money | chapter 1 (as the house), chapter 2 (by name) |
| **Ballast Security** | ships and guns under contract | none | the next contract | Tycho's guns | chapter 2 |
| **The Water Authority** | Europa's extraction rights and the price of water at the dock | Independent | the shortage at Ceres kept, and the price with it | sells to both, and to whoever wins | chapter 2 (the shortages of piece 2) |
| **The Lagos holding company** | Lagos Arcology, its launch platform and Lagos Ring: the cheapest lift off Earth | Arcology Pact | the lift's price, and the refits that go to Luna instead | stays home, and sells lift to both | chapter 3 |
| **The relay companies** (a few) | the relays and the bandwidth everyone rents | none, in every bloc | the open bands shut, and every message paid for | listen to both; the blockade's news is theirs to sell | chapter 2 (Ruben's band is against them) |
| **The arms makers** (with the drive yards) | the guns and drives every side buys | Arcology Pact, Dome Pact | the war long | sell to all sides | chapter 3 |
| **The other finance houses** | their own notes in the unit of account | Arcology Pact (Rotterdam) | Van Leeuwen's paper discounted | bet against each other's borrowers | chapter 3 (the paper of `trade-and-law.md`) |

### The minor powers

| Kind | The powers | Where they are written |
|---|---|---|
| **Place owners** | the refining companies (Hermes Foundry, Pallas Refinery), the land company (Ganymede), the pharmaceutical company (Titan), the water company (Enceladus), the town trust (Eros), the launch company (Lisbon), the Triton carrier | the place pages |
| **Co-ops and guilds** | the Ceres guilds that set the berth rates, the Ceres Crew Co-operative and the other Ceres co-ops, the prospectors' co-op (Ironheart), the growers' co-op (Juno Commons), the settlers' association (Triton) | `ceres-coop.md` and the place pages |
| **The trades** | the manning agencies (Chittagong's port road), the cheap registries and their mutuals (the co-op's among them), the Phobos shipwright families | `work.md`, `jurisdictions.md`, `chittagong.md`, `phobos-yards.md` |
| **Havens and freeholds** | the Rook's dock and market families, the Boneyard's salvage families, Ring Nine's rota, the freeholds of `the-belt.md` | the place pages, `the-belt.md` |

Names are given when a scene needs one, as the rest of the bible does.

### Blocs to come

The four blocs of chapter 6 (`later-chapters.md`) are powers that do not exist at the start, and the player can help make them: a league of co-ops, the freeholds' assembly, an owner's charter (Tycho's or Kaur's), and the havens' market families. They are blocs of the same kind as the three above, a pact with a law of its own, and they take members from the minor powers.

### Adding a power

Every power has the same entry, so a new one is a row and not a system: its name, its tier, its kind (a bloc, a place owner, a co-op, a trade, a haven), its bloc, what it holds, what it wants, which way it leans in the war, who keeps its standing, the chapter it comes in, and the people of it the bible has written. A power that has no scene yet needs no more than its row.

## How the two layers meet

- **At the hatch:** the bloc. Its inspector, its banned and licensed goods, its fines. A ship's standing with the bloc decides how hard it is looked at.
- **On the board:** the owner. Contracts carry an owner's name (the shippers, `js/shippers.js`). A corporate port bans a rival owner's goods (`trade-and-law.md`: a corporate port bans a rival's fuel).
- **On the lanes:** a bloc's patrols near its places, an owner's hired guns on "escort" contracts, and the pirates where neither goes (`trade-and-law.md`, the zones of law).
- **In the war:** the owners. Kaur and Tycho fight over Vesta inside the Guild Federation's space, with Ballast's guns and Van Leeuwen's money. The blocs do not fight one another. They are pushed to take a side, and their members disagree.
- **In the world's state:** each bloc has an economy (boom, slump, shortages), which the code's faction economies become. The code's wars between powers go. The owners' incidents, lawsuits, price wars and, in chapter three, blockade take their place.
- **For people:** a person is from a bloc's place, or an Independent one, and may work for an owner. The code's ties (`js/ties.js`) read the person's bloc for home and the owner for work.

## How far the player reaches

The world decides what happens; the player tips it (`shape.md`). How far the player can tip it widens with what they hold, chapter by chapter, and the powers are the measure: each chapter adds a ring of powers the player can move.

| Chapter | The player holds | The powers they can move | What a choice can change |
|---|---|---|---|
| 1, the hand | a post, savings, people's regard | their captain, their shipmates, the shippers who know the ship; and in three places one minor power (`chapter-1.md`) | who lives, who comes with them, a shipper's regard, the captain's opinion; the water at Pallas, the air at Eros, the ice haulers' strike |
| 2, the co-op | a vote of five and the bridge | the co-op itself, the minor powers they trade with, the lender's patience | the co-op's runs and members; a freehold supplied or not; whether the co-op holds, charters or sells |
| 3 | a path: the organiser's, the master's or outside | one side of the war, through what they carry and fight | how the blockade goes on the lanes they work; a minor power drawn to a side |
| 4, more hulls | several hulls | a convoy's weight in the war | which owner's convoys get through |
| 5, a place | an outpost | a minor power of their own | whether a rock that makes fuel goes to a side, or stays out |
| 6, alliances | a voice in a bloc, and standing spent | a bloc, and through it the major powers | the war's end: Tycho takes Vesta, Kaur holds it, or it is settled (`the-fuel-war.md`) |
| 7, the threat | what the blocs built | the blocs together, or not | what holds |

Two rules hold at every step:

- **The player tips, and never decides alone.** A vote can go against them (chapter 2), a side can lose with them on it, and the war's end is the world's, with the player's bloc as one hand on the scale.
- **Each ring costs the one before.** Standing is spent to move a power (`progression.md`, layer 6), and moving a bigger power puts the smaller ones at risk: the co-op voted onto a side, a freehold made a target, a shipmate on the wrong lane.

## What the game changes to fit

In order, each its own piece of work:

1. **The names.** `FACTIONS`, `STATE_FACTIONS`, every system's `gov` and `LICENSED` take the blocs' names. The mission arcs move with them: the League's water dispute becomes the Federation's, the Concord's audit the Dome Pact's, the Compact's licence the Arcology Pact's. Saves migrate their standing by name. Nothing plays differently. Done (#1043): the old names are kept in one table (`OLD_NAMES`, `js/data.js`), for old saves and for the dice that draw a person's ties from a power's name.
2. **The wars.** The world's wars between powers (`js/world.js`) stop. The economies stay, per bloc. The faction war that recalls crew home (`js/ties.js`) waits for the owners' war.
3. **The powers' standing.** The powers are one table (the entry above), and standing is kept by a power's name beside the shippers' (`js/shippers.js`): system-wide for a major power, by place for a minor one. Chapter two's squeeze reads Tycho's, Kaur's and the lender's; the others come in with their chapters.
4. **The war.** The fuel war's rumblings in chapter two and its blockade in chapter three, read from the world's state (`the-fuel-war.md`).

## Assumptions to confirm

- Two layers: a bloc for each region's law, and owners who own, compete and fight.
- The names: the Arcology Pact, the Dome Pact, the Guild Federation.
- The Saturn ports sit in the Guild Federation, as the code has them in the League.
- The blocs do not go to war; the war is the owners'.
- Two tiers: major powers act across regions and keep standing system-wide; minor powers hold one place or trade and keep it locally; a minor can become major.
- Nine major powers, four of them in play from chapter 2 and the rest coming in with chapters 2 and 3; the minor powers are the places, co-ops, trades and havens the bible already has, named when a scene needs one.
- The blocs of chapter 6 are new powers the player can help make.
- The player's reach widens by a ring of powers a chapter, tips and never decides alone, and each ring costs standing and puts the smaller ones at risk.
- Each bloc keeps an economy; standing is kept per bloc and per major owner.
