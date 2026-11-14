# Places

Status: draft for the owner's review, 2026-11-14. A review of every kind of place across the system and what each has inside, so the ports, the cast's pools (`cast.md`) and the Belt's generated settlements are written to one shape. It builds on `jurisdictions.md` (the kinds of law), `the-belt.md` (the kinds of Belt settlement), `ports.md` (what a port view is, and Lagos Ring) and each place's own page. Nothing here is built.

## What it is for

The bible has the places one by one, each written on its own terms, and the kinds in three different lists. The game has twenty-one ports in twelve systems (`SYSTEMS`, `js/data.js`) and the sites with nobody on them (`js/sites.js`). Two things need one shape: a port view and a day ashore need to know what is inside a place, and a pool of regulars (`cast.md`) needs to know which inner places a place has and whose they are.

So: a list of the kinds of place, a list of the inner places, a table of which kind has which and whose, and what chapter needs which.

## The kinds of place

| Kind | What it is | Law (`jurisdictions.md`) | In the game now |
|---|---|---|---|
| **Arcology ring** | An Earth arcology's port in orbit, at the top of its lift; the arcology below is reached by going down | the holding company's | Earth (Lagos Ring, `ports.md`); Lisbon, Rotterdam and Chittagong are reached through it |
| **Yard** | Shipyards and the town that works them, on a moon | corporate space | Luna, Phobos Yards |
| **Dome town** | Domes on a world, each run by a dome company with the air bill as its charge | the dome company's | Mars, Ganymede (the lease terraces), Titan (the biolab domes) |
| **Company works** | A foundry or a refinery and its company town: the depot town of `the-belt.md` | corporate space | Hermes Foundry, Pallas Refinery |
| **Guild or co-op station** | A station owned by those who work it, or by their guilds | the members' | Ceres Station, Ironheart, Juno Commons |
| **Extraction post** | A water or ice authority's rig and the queue to it | corporate space | Europa, Enceladus |
| **Old town** | A boomtown gone half-dead, its halves owned differently | a town trust's | Eros Old Town |
| **Hollowed rock** | An old mine whose shafts became a town; a freehold when its people hold it in assembly | the council's, or the assembly's | The Hollows |
| **Haven** | A place nobody can collect from at a profit | nobody's, and its own | Ring Nine (an abandoned ore carrier), The Rook |
| **Raft** | Hulls lashed together; a market, drifting or stopped | whoever is strongest | Boneyard (a raft that stopped) |
| **Edge outpost** | A small station at the system's edge | its owner's, thinly | Triton Outpost |
| **Claim rock** | One family or crew working one rock under a claim | the registry they pay | not yet: a generated settlement (`the-belt.md`) |
| **Homeship** | A family or crew living on a ship they never sell | their own aboard | not yet: met on the lanes |
| **Pirate nest** | Hidden among the rocks; buys stolen cargo and sells protection | theirs, by force | not yet |
| **Site** | A place with nobody on it: an ice rock, a wreck, a field of debris | none | the ice runs' rocks and the wrecks (`js/sites.js`, `js/salvage.js`) |
| **Ship** | A ship as a place: Hester's, the one a fight boards, a homeship | the captain's | the burn view; the deck fight |

**Missing from the map.** Vesta, the depot the fuel war is fought over (`the-fuel-war.md`), is not a port in the game. It is needed by chapter 2, when the war rumbles; and the depot towns of Kaur's that `owners.md` names with it.

## The inner places

What a kind of place can have inside, and what each is for in the game:

| Inner place | What it is | Meets the game |
|---|---|---|
| **Berth** | where a ship docks: a collar, a pad, a lashing point | the landing; the dock official (`js/official.js`) |
| **Customs** | the lock where a jurisdiction checks cargo and papers | the port inspection (`js/inspection.js`, `trade-and-law.md`) |
| **Market** | rented bays, a trade floor, an exchange | the market and the exchange (`js/market.js`); what the co-op trades in chapter 2 |
| **Bar** | where crews and locals drink and talk | the bar and its regulars (`js/bar.js`, `js/regulars.js`) |
| **Clinic** | medicine on contract or for cash | the hand's hurts, the crew's recovery |
| **Lodging** | bunkrooms, a room of one's own | the room (`js/room.js`), a night ashore |
| **Hiring hall** | the agencies' boards and the manning offices | signing on, the bond (`work.md`) |
| **Yard** | where ships are repaired and refitted | repairs, parts, refits (`technology.md`) |
| **Shipper's office** | a company's freight desk | contracts and the shippers as people (`js/contracts.js`, `js/shippers.js`) |
| **Guild hall** | a trade's or a union's room | the Guild, the strike, the co-op's meeting |
| **Assembly** | where a freehold or a co-op decides | the vote (`chapter-2.md`) |
| **Chapel** | a shrine, a meeting room for a faith | everyday life (`README.md`, Still to write) |
| **Fence** | a black market, a buyer who asks nothing | salvage, smuggling, the havens' trade |
| **Scrap yard** | where hulls are broken and parts sold | parts and salvage (`js/parts.js`) |
| **Security** | the owner's police, a patrol's office, a lock-up | fines, arrests, the powers' faces (`owners.md`) |
| **Homes** | where people live: family quarters, a lease, a squat | the family visit (`js/family.js`), a crew's home port |
| **The way down** | a lift, a shuttle, a ramp to the surface | going down to Lagos (`ports.md`), a day down |

## Which kind has which, and whose

Each cell says whose it is: **Co** the owning company's, **Ag** an agency's, **Me** the members' (a co-op's or a guild's), **As** an assembly's, **Pr** private (a family's, a trader's), **No** nobody's, or blank for none.

| Kind | Berth | Customs | Market | Bar | Clinic | Lodging | Hiring | Yard | Shipper | Guild | Assembly | Chapel | Fence | Scrap | Security | Homes | Way down |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Arcology ring | Co | Co | Co | Pr | Co | Ag | Ag | Co | Co | Me | | Pr | Pr | | Co | Co | Co |
| Yard | Co | Co | Co | Pr | Co | Co | Ag | Co | Co | Me | | Pr | Pr | Co | Co | Co | Co |
| Dome town | Co | Co | Co | Pr | Co | Co | Ag | Co | Co | Me | | Pr | Pr | | Co | Co | Co |
| Company works | Co | Co | Co | Co | Co | Co | Ag | Co | Co | Me | | | Pr | Co | Co | Co | |
| Guild or co-op station | Me | Me | Me | Pr | Me | Me | Me | Me | Co | Me | Me | Pr | Pr | Pr | Me | Me | |
| Extraction post | Co | Co | | Co | Co | Co | Ag | | Co | | | | Pr | | Co | | |
| Old town | Pr | Co | Pr | Pr | Pr | Pr | Ag | Pr | Co | Me | | Pr | Pr | Pr | Co | Pr | Co |
| Hollowed rock | As | | As | Pr | As | Pr | | Pr | | Me | As | Pr | Pr | Pr | As | Pr | |
| Haven | No | | Pr | Pr | Pr | Pr | | Pr | | | | Pr | Pr | Pr | | Pr | |
| Raft | No | | Pr | Pr | | Pr | | Pr | | | | | Pr | Pr | | Pr | |
| Edge outpost | Co | Co | Co | Pr | Co | Co | | Co | Co | | | | Pr | | Co | Co | |
| Claim rock | Pr | | | | | Pr | | | | | | | | | | Pr | |
| Homeship | Pr | | Pr | | | Pr | | | | | | | | | | Pr | |
| Pirate nest | No | | Pr | Pr | | Pr | | Pr | | | | | Pr | Pr | Pr | Pr | |
| Site | | | | | | | | | | | | | | | | | |

A place's own page can differ from its kind, and wins: a place is a kind with a history. The table is the default for a place not yet written, and for the Belt's generated settlements.

## How it meets the game

- **The port view** (`ports.md`): a port with a view cuts through some of its inner places, in the order a hand walks them; Lagos Ring is the first. Each later view chooses its slice from its kind's row.
- **The cast's pools** (`cast.md`): each inner place is where its regulars come from: a bar's drinkers, a berth's dock official, a guild hall's organiser, a clinic's nurse. A place's pool of regulars is drawn from its inner places, so a kind with no guild hall has no organiser.
- **Whose it is** sets who is met and how: a company's bar is the company's ground, a co-op's is the members'; a fence exists only where nobody's law reaches.
- **The Belt's generated settlements** (`the-belt.md`): a claim rock, a homeship or a pirate nest is made from its row, a name and a few regulars.

## By chapter

**Chapter 1 (now).** The places the hand reaches on Hester's ship: Earth's Lagos Ring (written, with its view), Ceres Station (where the share is signed: its inner places and regulars first), Pallas Refinery and The Hollows (the water arc), Eros Old Town (the air arc), Luna (the riggers), and the ice rocks (sites). Each needs its inner places written and a pool of regulars for its bar, berth and hall.

**Chapter 1, setting up chapter 2.** Ceres as the co-op's home: its guild hall, the co-op's office and the assembly where the members vote; the market where the co-op will trade. Ring Nine, the Rook and Boneyard, seen from the lanes before the co-op needs them as havens.

**Chapter 2.** Vesta and Kaur's depot towns, added to the map; the havens as places the co-op trades and hides; the yards (Luna, Phobos) as places to refit (`technology.md`); a few generated Belt settlements of the simplest kinds (claim rocks, homeships).

**Later.** Pirate nests, rafts that move, outposts the player holds (`later-chapters.md`).

## Open questions for the owner

- Are the kinds right, and is anything missing (a monastery, a prison hulk, a hospital ship, a relay station with a keeper)?
- Should the Belt's settlements be generated each run (`the-belt.md` says so), and from which chapter?
- Which chapter 1 port gets a view after Lagos Ring: Ceres, as the share's place?

## Assumptions to confirm

- The kinds of place above, each with its law, mapped to the twenty-one ports.
- The inner places above, each meeting a system of the game.
- The table of which kind has which and whose, as the default a place's own page can change.
- Vesta and Kaur's depot towns join the map for chapter 2.
- Chapter 1's places are written first: Ceres, Pallas and the Hollows, Eros, Luna and the ice rocks.
