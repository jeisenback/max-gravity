# Wrecks and Salvage: the Co-op's Jobs at a Site

Status: proposed to the owner on 2026-11-13 (#965); amended the same day after a builder's read (who cuts, a steady supply of wrecks, the crew's regard, the co-op only, the soak's co-op mode, the survey's skill). The second step of exploration and salvage (`ROADMAP.md`, section 7), after the site machinery (#948) and parts (#1135); before the scan (#966) and the prospecting line (#1003), which rises with this work.

## Why

Chapter 2's co-op flies, trades and takes contracts, and the Belt it works is full of rocks and wrecks off the lanes (`docs/bible/the-belt.md`: tow and salvage, haul back, survey). Nothing in the game takes the co-op there. The site machinery can already fly a ship to a place with no port and keep it on station for shifts; parts now give a wreck something worth cutting off. This step gives the co-op its own kind of work: a salvage job is a gamble with a story, and a survey is a quieter job for a client.

## What it is

- **A salvage job** is a row on the co-op's board: a client wants something off a wreck by a deadline (its flight recorder for an insurer, its cargo for the owner, proof it went down for a widow's claim). The wreck goes on the map; what is aboard is unknown until the ship gets there.
- **At the wreck** the ship is on station for up to three shifts. Each shift the crew cuts one section deeper: the take rises (goods for the hold, and now and then an intact part with the wreck's history), the risk rises, and the wreck's story comes out a piece at a time. After each shift the player chooses: deeper, or haul home with what is aboard.
- **Bexa reads the risk** of the next section before the choice (twenty years pulling wrecks); **Pax argues for caution**. The prospecting line (#1003) will sharpen the read later.
- **The client's find** is somewhere in the wreck. The client pays on delivery at their port; everything else cut is the co-op's.
- **Onward leads.** Sometimes a find (the log, the nav core) marks another wreck on the map, with nobody paying: all of that one is the co-op's.
- **A survey job** is one scene at a rock: the crew's read sets the report's quality, and the client pays by quality on delivery.

## Goals

- A salvage trip is a gamble: the player decides every shift, with the risk read to them, and a trip can pay big, come up thin, or cost an injury or a system.
- Each wreck has a short history that comes out over the shifts, and sometimes points onward.
- Wreck parts are real parts: a used part with the wreck's history, fitted or sold.
- The co-op's chapter keeps its pacing: salvage pays about as well as freight over time, with more spread.

## Non-goals

- Chapter 1: Hester's runs are unchanged; the hand does not salvage (the owner chose chapter 2 only, 2026-11-13).
- Bexa's wreck, towing a hull, a second ship.
- A map of the wreck's sections to move through (the lock fight's kind of board): later, when there are enough wrecks to want it.
- Bar rumors and Boneyard tips as leads (bar work is switched off in the shipped build); the scan (#966).
- Full storylines tied to the cast or the fuel war (later, by the owner's word).

## Anti-goals

- A safe bet: going deeper is never free, and the read is a read, not a promise.
- Salvage that out-earns freight every time, so the board is all wrecks.
- A wreck with no story: every wreck says what it was before the first cut.

## Approaches

Three were weighed (2026-11-13):

- **A. A new `js/salvage.js` on the site machinery (chosen).** Wrecks and rocks are new kinds of site; a salvage or survey job is a new row on the co-op's board; on station each shift plays the cutting scene; the ice run is untouched.
- **B. The wreck's sections as data-driven storylets.** Less new code for the words, but the shift loop, the take, the parts and the onward leads need their own state, which would end up spread across scene conditions and effects.
- **C. The ice run made into a general "job at a site" engine.** Tidier in time, but it reworks chapter 1's tuned and soaked ice run for a chapter 2 feature. Worth doing when a third kind of site job appears.

The owner picked A.

## Decisions

### Sites (`js/sites.js`)

- Two new kinds in `SITE_KINDS`: `wreck` ("a wreck") and `rock` ("a rock"), each with a colour.
- A wreck site carries `wreck`: its type (`orehauler`, `courier`, `raider`, `yacht`), its name (the ship's, from a list by type), the client's find's section (1 to 3), and whether a section holds an onward lead (the id of another wreck).
- **Seeding.** A run's sites gain six wrecks and three rocks, seeded from the same key and the file's own dice as the ice rocks (no draw of the game's), at 2.2 to 3.6 AU. A save whose `st.sites` was made before has them added the first time a wreck is asked for (`sites(st)` adds missing kinds), so no ice rock moves.
- The wrecks and rocks are unfound (`found: null`) until a job or a lead finds them, as now.
- **A steady supply** (the owner, 2026-11-13: salvage is steady work, not a limited extra). A wreck cut out (its job done, or all three sections cut) is replaced: the site takes a new wreck, seeded by the key and the site's generation (`site.gen`), elsewhere in the band, unfound. A rock surveyed is replaced the same way. So there are always six wrecks and three rocks to find.

### Jobs on the board (`js/salvage.js`, `js/ownerboard.js`)

- On a port's board in chapter 2, beside the contracts, for the co-op only (`role().id === 'coop'`: the owner game, which also has a board, is parked and gets none), up to one salvage job and one survey job a day, by the port and the day (`hash`, no dice of the game's), when there is an unfound wreck or rock in reach.
- **A salvage job:** a client (an insurer, an owner, a family; a list by wreck type), the wreck, the find wanted (by type: the recorder, the cargo, the proof), the port it is delivered to, a deadline, and the pay on delivery. Taking it finds the wreck (on the map) and sets the course there; it is kept as `career().job` (one at a time, alongside no contract run: a job and a contract are each a run, as `career().run` is now).
- **A survey job:** a client (a claim office, a buyer), the rock, the port, a deadline, the pay by quality.
- The row reads like a contract's: "Hask Mutual: the flight recorder off the Dorran Sky, a courier, 3.1 AU. Deliver to Ceres by day 212. Pays 9,000 cr on delivery."

### On station at a wreck (`js/salvage.js`)

- Landing at a wreck with a job or a lead for it (`landAtSite` hands over by the site's kind: the ice rock to `siteArrival` as now, a wreck to `salvageArrival`, a rock to `surveyArrival`).
- **The approach** (a scene): what can be seen of the wreck, its name and type, and the first line of its history. The dock's button reads "Cut into the wreck (section 1)".
- **A shift** (the button, or a night passed on station): the cutting scene for the next section.
  - Before the choice, Bexa's read of this section's risk: a word (clean, some risk, bad), from the section's real odds and her skill; with Bexa not aboard, the best engineer's, in fewer words. Pax's line for caution when the read is not clean and Pax is aboard.
  - Choices: **cut it** (the take of this section, and the risk rolled), or **haul home with what is aboard** (leave now). A third, **cut carefully** (half the take, half the risk), from the second section on.
  - The story: the section's piece of the wreck's history (by type, a pool of lines), played in the result.
  - **The take** of a section: goods into the hold (Refined Metals, Machine Parts or Electronics, by type, a few tons, as far as the hold has room), and on some sections an intact part: a used part with a quirk from `PART_QUIRKS` and its `from` the wreck's ("off the wreck of the Dorran Sky"), kept as a spare.
  - **Who cuts** (the owner, 2026-11-13): the crew, led by Bexa (with Bexa not aboard, the engineer, else the bosun), never the hand.
  - **The risk** of a section rises with depth (about one in ten, then one in four, then two in five, to tune): one of an injury to a crew member on the cutting team (`st.injured`, as a fight's, with no death roll: nobody dies cutting), a hit to one of the ship's systems (condition down, so a part is needed), or the section giving way (that shift's take lost).
  - **Regard** (the owner, 2026-11-13: a little): heeding Bexa's "bad" read (hauling home or cutting carefully) pleases her (`like` +1, a memory); cutting on over Pax's caution when someone is then hurt costs the player with Pax (`like` -1, a memory). Nothing else in the cutting moves regard.
  - **The client's find** comes off its section if that section is cut and not lost; it goes in the hold as a find (no tonnage) until delivered.
  - **An onward lead** in a section, when cut: the other wreck is found (on the map) and the log line says where.
- After the third section, or when the player hauls home, the dock's button reads "Burn for ..." and the player plots the course (from a site, straight into the burn, as `sailHome` does for the ice run, to the port the player picks on the map).

### On station at a rock

- **The survey** (one scene): the rock, and the crew's read: the pilot works the scopes, so the read is the crew's best pilot skill (`roleSkill('pilot')`, the hand's if the hand flies); the quality is the margin of a check on it (poor, fair, good). One shift. Then home.

### Delivery and pay

- At the client's port, landing with the find (or the survey) by the deadline: the client pays to the co-op's fund (`st.credits` in chapter 2), the log says so, and the job ends. Late, the client pays half. A job whose find was lost or never reached: the job ends unpaid on the deadline.
- The goods cut are sold at the Exchange as any cargo; a spare part is fitted at the Engineering station (free, as the yard's labour is the crew's: the system takes it as a used part with its quirk, `fitPart`) or sold at a port with an outfitter for the used price.

### Spares (`js/parts.js`)

- `st.spares`: a list of `{ system, quirk, from }`, the parts cut off wrecks, kept on the ship. The Engineering station lists them with **Fit** and, docked at an outfitter, **Sell**. Fitting takes the system to the used part's restore mark if that is higher, as a bought used part does.

### The record, for prospecting (#1003)

- `recordHand` counts each wreck cut (`wrecksCut`), each salvage job delivered (`salvageDone`) and each rock surveyed (`rocksSurveyed`), so the prospecting line can read the work when it comes.

### Words

- The scenes' lines in `js/hiredscenes.js` (`scene:salvage` and `scene:survey`), registered, read by the scene-lines test and the scene editor. Each wreck type has its history in three pieces, in two or three versions; the risks, the reads and the take have their lines. In the voice (`docs/bible/voice.md`).

## Testing

- `tests/sites.test.js`: wrecks and rocks seeded deterministically, added to an old save's sites without moving an ice rock.
- `tests/salvage.test.js` (node where pure, browser for the scenes):
  - the board offers at most one salvage and one survey job a day by port and day, only in chapter 2;
  - taking a job finds the wreck and sets the course;
  - arrival at the wreck plays the approach; each shift plays the cutting with Bexa's read; cut, cut carefully and haul home do what they say;
  - the take fills the hold within its room; a part goes to the spares with the wreck's history;
  - the risk by depth: injury, a system hit, a section lost (seeded rolls);
  - the client's find delivered pays, late pays half, lost pays nothing;
  - an onward lead finds the other wreck;
  - a survey's quality sets the pay.
- Spares: fit and sell at the Engineering station.
- `tests/scenelines.test.js` and the scene pins: the new scenes' words read and pinned (additions only).
- `tools/chaptertwo-soak.js` gains a co-op mode (it plays the parked owner's buy today, `buyIn`): the co-op's start (`signOn`, the chapter two start, Bexa and Pax aboard). In it, a co-op that takes a salvage job when one is on the board and cuts by a fixed rule earns about what a freight-only co-op earns over 240 days, with a wider spread. The owner mode and its baseline stay as they are.
- `npm test`, `npm run test:editor`; `js/salvage.js` on the coverage floor once tested.

## What is left to the builder

- The histories, the reads, the clients' and wrecks' names, in the voice.
- The numbers: the pay, the take by section, the risks by depth, within the goals above, set by the chapter 2 soak.
- Where the job rows sit on the board, on the view helpers.

## The builder's read, settled (2026-11-13)

- The owner: the crew cuts and nobody dies cutting; wrecks and rocks are a steady supply; the shift choices move Bexa's and Pax's regard a little.
- Settled by the author: salvage is the co-op's only (the parked owner game gets none); the chapter 2 soak gains a co-op mode; the survey reads the pilot's skill (there is no sensors skill).

## Assumptions to confirm

- Six wrecks and three rocks a run, at 2.2 to 3.6 AU.
- One salvage and one survey job at most on a board a day; one job at a time, not alongside a contract.
- Three sections a wreck; cutting carefully from the second.
- Late delivery pays half; the deadline ends an unfinished job unpaid.
