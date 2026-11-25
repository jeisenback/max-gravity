# Technology

The one large leap is the torch drive: a fusion engine that burns deuterium and can thrust for days at a meaningful fraction of a g. Everything else is our technology improved by a century, unevenly.

## Drives and freight

Torch drives are old. Newer, more efficient drives exist and cost more; the corporate spaces' new ships have them, and the second-hand fleet runs on older ones.

Burning a torch for days costs fuel, and most freight does not pay for that. Bulk ore, ice and metal go on slow transfer orbits in big, cheap freighters that take months. Torch ships carry what can't wait: parts for a stopped refinery, medicine, perishables, documents, valuable small goods, people. A fast ship is paid a premium for speed and pays for it in fuel.

## The drive

Status of this section: draft for the owner's review, 2026-11-14. It gives the drive the design the burn's shape needs (`burn.md`, The burn's shape, #1195), in the game's own numbers.

**What burns.** A torch is a fusion reactor that heats reaction mass and throws it out of the bell. Two things are spent, and they are bought differently:

- **Fuel:** deuterium, for the reactor. Enriched from ice at the depot owners' plants, it is the largest cost of running a ship (`economy.md`, Fuel). A load lasts months. It is bought at a refit or with a charter, and is the owner's cost, not the crew's; the game does not count it trip by trip.
- **Reaction mass:** water, heated to plasma and thrown away. A burn spends it, every port sells it, and its price is the price of ice. This is the ship's tank in the game (`fuel` on the hull, 450 on Hester's Ice Hauler; a burn spends 30 plus 60 times the square root of the distance in AU, `burnFuel`, `js/orbits.js`). It is why ice is worth hauling, and why a water shortage at Ceres reaches every ship's costs.

**How a burn flies.** Five parts (`burn.md`): a hard burn on the couches at the drive's hard rating until the ship reaches her set cruise speed, an easy cruise at about a quarter of a g, the flip, the easy brake, and the hard brake onto the port. The couches are for the hard burn: more than a g for hours is too much to work or to climb a tower's ladder under, so everyone lies down for it. Docking and departure are done at very low thrust, strapped in. The navigation software holds the course; the pilot flies the flip, docking, departure and anything unexpected.

**Grades.** A drive's grade is what the yard that built it could make, and what the owner can pay to keep running:

| Grade | Hard rating | Reaction mass | Kept running by | Who has it |
|---|---|---|---|---|
| **Patched** | about 1.5 g, in short spells | the most a trip | the crew, with parts printed, salvaged or bought second-hand; it wears, and it trips | the second-hand fleet, the Belt, the squats and havens: Hester's Ice Hauler, the Ore Runner, most pirates |
| **Licensed** | about 2 g | about a fifth less | a yard's service and a licence by the year; a lapsed licence switches its tuning off | the agencies' and corporate charters, the co-ops that can afford a refit, the patrols' cutters |
| **Yard** | about 3 g, for hours | about two fifths less | only its maker's yards; sealed, so a crew cannot open it | the major powers' own ships: Tycho's at Luna, Kaur's tankers, Van Leeuwen's best charters, the arms makers' and drive yards' buyers |
| **Military** | sprints well past 3 g | wasteful, for speed | a contractor's yard, and crews trained for the g | Ballast Security's ships, and the blocs' few warships |
| **Restricted** | unknown | unknown | nobody outside the drive yards' labs | rumour in chapters 1 and 2 |

A higher grade buys a shorter trip (the hard burn reaches a higher cruise speed sooner), less reaction mass and less wear. It costs money to buy and to keep, and a licence someone else can switch off. Technology is spread by money and by who owns the yards, so the major powers are a grade or two ahead of everyone else, and the gap is part of how they hold their chokepoints (`owners.md`).

**Beyond the grades.** Whether there is anything past the drive yards' labs (a technology nobody in the system made, which the chapter 7 threat might be) is the owner's to choose (`later-chapters.md`). Nothing in chapters 1 to 3 depends on it, and nothing here rules it in or out.

**In play.**

- *Chapter 1.* One drive, Hester's: patched. The hand sees the grades from below: a patrol's cutter overtaking them, a Tycho tanker passing at a speed the Ice Hauler cannot make, a pirate's drive worse than theirs. The engineer's work (the drive's condition, `js/wear.js`; the reactor's heat and the power split between drive, guns and point defence, `js/engineering.js`; shields retired, #1208) is the patched grade's daily cost.
- *Chapter 2.* The Ore Runner is the player's to refit: keep her patched drive, or pay for a licensed one and its licence. Burning harder (a longer hard burn to a higher cruise speed, for a shorter trip, more reaction mass, more wear and more strain on the crew) becomes the captain's choice (#1195).
- *Later.* A fleet's hulls of different grades; yard and military drives met as the war's ships; the restricted grade, if the owner wants it.

**What the game changes, when the work comes.** The trip's days and its reaction mass come from the drive's grade and hard rating, not one curve for every hull (`baseDays`, `burnFuel`, `js/orbits.js`). With one drive in chapter 1 the numbers stay what they are now. Each hull's `accel` and `maxSpeed` (`js/data.js`) are left from the owner game and are not read on a burn; they give way to the hull's grade.

## The ship's systems

Status of this section: draft for the owner's review, 2026-11-14 (#1209). It writes the rest of what the hand meets aboard, at the drive's grades, from the game as built (the code wins, `README.md`). The code has no grades on equipment today: a system's grade is read from where its part came from (`js/parts.js`) and, for an enemy, from the hull and the lane's danger (`js/shipcombat.js`). So the grades below are words for numbers that already exist, not new numbers.

A grade means the same for every system as for the drive: **patched** is kept going by its crew with second-hand and printed parts; **licensed** is serviced by a yard and runs on software licensed by the year; **yard** is sealed and kept by its maker; **military** is a contractor's, for a fight; **restricted** is in nobody's hands outside the labs.

**A grade is a trade, not a ladder** (the owner, 2026-11-14). Each grade buys something and gives something up, so choosing one is a choice about whom the ship depends on:

| Grade | Buys | Gives up |
|---|---|---|
| Patched | the crew can mend it anywhere, from anything; nobody can switch it off | it wears, it trips, and it fails at the wrong time |
| Licensed | it works, and a yard keeps it working | the licence can be switched off by whoever holds it (the lender, the owner, the maker), and its software records what the ship does and who can read it |
| Yard | the best a civil ship can have, for years | it is sealed: only its maker's yards can open it, so a fault far from them is a ship laid up |
| Military | it wins fights | it is noticed: inspected at every port that inspects, watched by the patrols, and banned outright at some ports |
| Restricted | unknown | carrying it makes the ship a target for every power that knows |

So a co-op's refit is not only a price: a licensed drive the lender can switch off, against a patched one the crew can keep running (#1210).

### Guns

A gun is a mount that fires rounds: a slug driven by a coil or a charge, aimed by fire control (`fire` in the ship's wear). It heats as it fires and locks when it is too hot, until the heat bleeds off (`HEAT_CAP`, `js/fight.js`); overcharging hits harder and heats twice as fast. Range is the gunner's enemy: a shot at knife range lands harder than one at long range, and an aimed shot at the drive, the lock or the launcher only pays off up close. Rounds are counted by hand against the board's count (the magazine count scene).

| Grade | What it is | In the game |
|---|---|---|
| Patched | one mount, a hand-cleared feed, a sight that drifts | one gun; the gunner's station parts (sight, feed, liner, grips) are the hand's own fixes |
| Licensed | a serviced mount on licensed fire control, which a lapsed licence dulls | a used part off a patrol cutter (`parts.js`, quirks) |
| Yard | twin mounts, cooled barrels, current fire control | the corsair's and the cutter's two guns |
| Military | three mounts and heavier rounds | the corvette and the destroyer; heavier rounds are an outfit any ship can buy (`heavy`, `js/data.js`) |

### Torpedoes

A torpedo is a small drive with a warhead, launched from a rack and steered to the target. It hits far harder than a round, and it can be shot down. A launcher is an outfit; the torpedoes are bought one at a time and kept few (4,000 each). Ships that fire torpedoes fire them in a salvo after they arm, and shooting the launcher away stops the salvo.

| Grade | In the game |
|---|---|
| Patched | a launcher and two torpedoes, restocked from the ship's fund (Hester's, `HAND_TORPS`, `js/hired.js`) |
| Licensed and yard | one to four, armed and fired in a salvo (the cutter's one, the corsair's four) |
| Military | salvos of two and three (the corvette, the destroyer) |
| Restricted | nuclear warheads. Every owner bans them, and nobody admits to carrying one |

### Point defence

A close-defence turret is an automatic gun that fires at what comes close: torpedoes first, and the edge of an enemy's volley. Left to itself it stops about two torpedoes in three (`js/torpedoes.js`); held by the gunner it costs a shot and cuts what comes in. It is the main reason a torpedo is not the end of a fight.

| Grade | In the game |
|---|---|
| Patched | one turret, bought second-hand (Hester's) |
| Licensed and yard | one or two, on any ship of two guns or more |
| Military | turrets enough that a small ship's salvo does not get through |

### Sensors

Radar and lidar for range, the passive sky for heat. Everybody sees a torch's plume: the harder a ship burns, the farther off she shows (`scanVisibility`, `js/engineering.js`). The board plots what the sensors see (`js/board.js`): range, bearing, closing rate and the torpedoes' tracks. A worn set lies: a ghost return, then last turn's position marked stale.

| Grade | In the game |
|---|---|
| Patched | a set that ghosts and goes stale as it wears (`sensors` in the wear) |
| Licensed | a set that sees clean, on software licensed by the year |
| Yard and military | sets that see farther than they are seen |

### Armour

There are no shields. A hull is kept whole by its armour: layered plate, metal outside, with the water tanks and the stores laid where they stop what gets through. Armour is mended in a yard with refined metal (a ton mends 25 points, `js/repairs.js`) and in a fight by the engineer's patch. A plate can be bolted on as an outfit, at the cost of tonnage.

| Grade | In the game |
|---|---|
| Patched | welded plate, patched with what the last yard had; most of a freighter's protection is her bulk (the Ice Hauler's 260) |
| Licensed and yard | laminate fitted at a yard; a veteran pirate's hull is a grade better kept (`GRADE_HULL`) |
| Military | thick laminate on a warship's hull (the destroyer's 480) |

### The fabricator

A ship's printer makes small parts from files: a seal, a bracket, a valve, a drive part when there is nothing else. A file is licensed to the plant it fits. A part printed from a licensed file and not rated for its job is logged as temporary (`js/parts.js`: it restores less and wears faster); one printed from a file without the licence is a print, contraband at the corporate ports (`trade-goods.md`). The game has the printer in its words (a drive part on the fabricator), and its parts in the repair scene, not as a system of its own.

| Grade | What it makes |
|---|---|
| Patched | small parts, from the files the ship holds; printed parts are temporary |
| Licensed | the files of its owner's plant, kept current |
| Yard | whole assemblies, rated, at the yards only |

### Life support

Scrubbers for the air, a recycler, a water reclaimer, a little growing. It is one of the systems that wear (`life`), its breakdowns are the burn's quiet emergencies (the recycler that sulks, the coolant running warm), and a used part for it comes with a history (a hospital's scrubber stack, a grower's air plant). The game does not count the air; it counts the plant's condition.

| Grade | In the game |
|---|---|
| Patched | a plant that is mended more than replaced; the source of the burn's small troubles |
| Licensed and yard | a plant on a service contract, rarely trouble |

### Radiators and heat

A torch ship's real limit is heat. The reactor, the guns and the crew all make it, and space takes it away only by radiating, so a ship carries radiators: long fins or panels along her flanks, the most fragile thing on her. The coolant loop carries heat to them. The game has the heat (the reactor's, `js/engineering.js`; the guns', `js/fight.js`), the coolant scenes and the radiator crews of Hermes Foundry, but no radiators as a part.

| Grade | What it is |
|---|---|
| Patched | fins patched and re-welded, some dead; the ship runs warm and cannot fire and burn hard together for long |
| Licensed and yard | full fins, a sealed loop |
| Military | radiators that fold in for a fight, and heat sinks to run hot for a while without them |

Proposed for chapter 2: a hit on the radiators is a hit on everything, since the reactor and the guns must then run cooler.

### Running dark

What a ship shows is her plume and her heat. A ship that throttles down, cools and keeps her transponder quiet is hard to see; one that burns hard shows across the Belt (`scanVisibility`, `js/engineering.js`). A transponder can be made to lie: a spoofer gives a false name (the pirates' outfit, `js/data.js`), and slicing a pirate's transponder is a choice at a contact. Running dark costs time (no hard burn) and heat (it builds when it is not radiated), and a ship found dark is taken for a smuggler.

### The ice rig

The Ice Hauler's work: cutters and a loader to take ice off a rock, worked in suits over three shifts (`ICE_SHIFTS`, `js/icerun.js`). A patched rig is the crew's own, mended between runs; a licensed one is a depot's, with a cut of the ice. A good haul and a bad one are the rig, the rock and the crew (`js/sites.js`).

### Suits, the lock and sidearms

Suits for work outside and for hot work inside (the engine room's hot-work suit is rated for so much and no more); the lock, which a boarder cuts or a crew holds; sidearms in a locker the bosun keeps (Cato's). A boarding is fought in the passages with what is in the locker (`js/boarders.js`, the deck fight). Patched suits are mended at the seams; military ones are armoured. Arms are a banned good at the arcology docks (`trade-goods.md`).

### The medbay

A bunk, a scanner and a cabinet of drugs: enough to set a bone, close a wound and keep someone alive to a port's clinic. The game keeps who is hurt (`st.injured`) and sends them to the clinic ashore (`js/ashore.js`); the medbay is where a wounded shipmate lies on the burn. Registered drugs cost what Earth charges, and grey medicine is what a poor ship stocks (`trade-goods.md`).

### Drones and probes

Small craft without crews: a target drone for the range, a probe for a rock's survey (the scan, `js/sites.js`), a camera on a stick for a hull inspection. Cheap and lost often. A target drone is three hundred at a yard.

### The comms set

The antenna and the slot: a poor ship buys a cheap relay slot and gets her messages in a batch (Light and messages, above); a rich one rents a continuous link. The comms post listens on the bands for what nobody sent to the ship (`js/comms.js`). The licensed set records the traffic for whoever holds the licence.

### What the hand meets, by grade

| Who | Grade | Carries |
|---|---|---|
| Hester's Ice Hauler | patched | one gun and a turret, a launcher and two torpedoes, the freighter's armour, every system on its original yard part, worn (`js/hired.js`) |
| A pirate | patched, a veteran a grade better kept | a raider (one gun) or a corsair (two guns and torpedoes) |
| A patrol | licensed to yard | a cutter (two guns, a torpedo, a turret), or a destroyer (military) a third of the time |
| A trader | patched to licensed | a skiff, a courier or a freighter like the Ice Hauler |
| Ballast's ships, the blocs' warships | military | met in chapter 2 (#1217) |

### In play, and what the game changes

- *Chapter 1.* Words only. Every system already exists in the game at the numbers above; scenes that name a gun, a torpedo or a plate use this page. Shields are gone (#1208).
- *Chapter 2.* A system's grade becomes something the co-op buys (a refit, #1210) and wears (parts and salvage, #1211); the war's ships are written in #1217.
- *Later.* Military systems within reach, a fleet's hulls of different grades, and the restricted grade if the owner wants it.

## No shields

There is no deflector field (the owner, 2026-11-14). A ship is kept whole by her armour, her point defence and not being where the shot is. The game's shields are retired (#1208): each hull's shield points went into its armour, and the engineer's third share of the reactor runs the point defence.

## The fleet is old

Hulls last fifty or eighty years, and most ships in service are older than their crews. They have been refitted, patched and re-registered under several owners. Parts are made new at the big yards, printed from licensed files on the ship's fabricator, or taken off ships being broken up. A printed part that isn't rated for its job is logged as temporary.

Ships still carry crews because crews cost less than the refit that would replace them.

## Software

There is no human-level AI. There is a great deal of narrow software: navigation, docking, diagnostics, scheduling, translation, accounts. It is licensed by the year from companies that update it when they choose, and a lapsed licence switches a feature off. Crews supervise the software, override it and complain about it. A lender's or owner's licence usually lets them read what the software records.

## Light and messages

Nothing goes faster than light. Earth to Mars is three to twenty-two minutes each way; the Belt is more. There is no conversation across the system, only recorded messages. The relays belong to a few companies, and bandwidth is rented: a station or a rich ship buys a continuous link, and a poor ship buys a cheap slot and gets its messages and news in a batch once or twice a day, or at the next port.

## Who has what

Technology is spread by money. The corporate spaces and the upper tiers have new ships, current software, continuous links and good medicine. The lower tiers and the Belt squats run on what is cheap and old.

## Bodies

Long spells in low gravity cost bone and muscle, and radiation adds up. Both are managed with drugs, exercise and treatment, paid for by the person, or in part by an employer while a contract lasts.

## Assumptions to confirm

- The ship's systems take the drive's grades; the grades are words for the numbers the game already has, and add none in chapter 1.
- Guns fire rounds (no beams); torpedoes are small drives with warheads; nuclear warheads are restricted.
- Each grade is a trade: patched is mended anywhere and fails, licensed can be switched off and records, yard is sealed, military is noticed.
- Radiators carry the ship's heat away and are her weak point; running dark is throttling down, cooling and keeping the transponder quiet.
- There are no shields; armour and point defence protect a ship (the owner, 2026-11-14).
- There is no artificial gravity; ships get weight from thrust, stations from spin.
- Fuel is deuterium for the reactor, bought with a refit and not counted trip by trip; reaction mass is water, spent each burn and bought at every port.
- Drives come in five grades (patched, licensed, yard, military, restricted); the major powers are a grade or two ahead; chapter 1 has one drive, Hester's, patched.
- Whether anything lies beyond the grades is the owner's choice, and nothing before chapter 4 depends on it.
- Personal devices are phones and terminals much like ours, rented on plans.
