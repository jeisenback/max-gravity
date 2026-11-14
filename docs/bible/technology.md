# Technology

The one large leap is the torch drive: a fusion engine that burns deuterium and can thrust for days at a meaningful fraction of a g. Everything else is our technology improved by a century, unevenly.

## Drives and freight

Torch drives are old. Newer, more efficient drives exist and cost more; the corporate spaces' new ships have them, and the second-hand fleet runs on older ones.

Burning a torch for days costs fuel, and most freight does not pay for that. Bulk ore, ice and metal go on slow transfer orbits in big, cheap freighters that take months. Torch ships carry what can't wait: parts for a stopped refinery, medicine, perishables, documents, valuable small goods, people. A fast ship is paid a premium for speed and pays for it in fuel.

## The drive

Status of this section: draft for the owner's review, 2026-11-14. It gives the drive the design the burn's shape needs (`burn.md`, The burn's shape, #1195), in the game's own numbers.

**What burns.** A torch is a fusion reactor that heats reaction mass and throws it out of the bell. Two things are spent, and they are bought differently:

- **Fuel:** deuterium, for the reactor. A load lasts months. It is bought at a refit or with a charter, and is the owner's cost, not the crew's; the game does not count it trip by trip.
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

- *Chapter 1.* One drive, Hester's: patched. The hand sees the grades from below: a patrol's cutter overtaking them, a Tycho tanker passing at a speed the Ice Hauler cannot make, a pirate's drive worse than theirs. The engineer's work (the drive's condition, `js/wear.js`; the reactor's heat and the power split between drive, guns and shields, `js/engineering.js`) is the patched grade's daily cost.
- *Chapter 2.* The Ore Runner is the player's to refit: keep her patched drive, or pay for a licensed one and its licence. Burning harder (a longer hard burn to a higher cruise speed, for a shorter trip, more reaction mass, more wear and more strain on the crew) becomes the captain's choice (#1195).
- *Later.* A fleet's hulls of different grades; yard and military drives met as the war's ships; the restricted grade, if the owner wants it.

**What the game changes, when the work comes.** The trip's days and its reaction mass come from the drive's grade and hard rating, not one curve for every hull (`baseDays`, `burnFuel`, `js/orbits.js`). With one drive in chapter 1 the numbers stay what they are now. Each hull's `accel` and `maxSpeed` (`js/data.js`) are left from the owner game and are not read on a burn; they give way to the hull's grade.

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

- There is no artificial gravity; ships get weight from thrust, stations from spin.
- Fuel is deuterium for the reactor, bought with a refit and not counted trip by trip; reaction mass is water, spent each burn and bought at every port.
- Drives come in five grades (patched, licensed, yard, military, restricted); the major powers are a grade or two ahead; chapter 1 has one drive, Hester's, patched.
- Whether anything lies beyond the grades is the owner's choice, and nothing before chapter 4 depends on it.
- Personal devices are phones and terminals much like ours, rented on plans.
