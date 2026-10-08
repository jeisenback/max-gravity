# Derived from The Expanse

The owner wants the game's world to move away from The Expanse. This is a sourced list of the places where the code and README lean on it, each with a proposed replacement and an empty `Decision:` line for the owner. It changes no code: renames and reworks are a separate issue, after the decisions.

Real places (Ceres, Eros, Ganymede) and generic hard-SF terms (reaction mass, the flip) are not listed. Checked: `README.md`, `js/data.js`, `js/menu.js`, `js/ties.js`, `js/calendar.js`, the descriptions of Earth, Mars, Ceres and Jupiter in `SYSTEMS`, and the stories `cold-water.js`, `mars-navy.js`, `ice-strike.js`, `on-the-road.js` and the transit text by searching for the terms, not by reading them through. `js/cast.js` was read for Ines and Tomas only. Other story files have not been audited. Flagged on review and not verified against the books: "Rock Hopper" (`SHIPS.shuttle`, the starting ship) may be Belter slang in the Expanse, and Pax Iwu's home "Ceres Spin" in `js/cast.js` uses the same word as the Belt background; both are left to the owner's judgment.

### derived.readme-flavor

- Where: `README.md`, line 3.
- What: The game is described as "an homage to Ambrosia Software's *Escape Velocity*, flavored by *The Expanse*."
- Why it reads as the Expanse: It says so.
- Proposed instead: Describe the game in its own terms ("set in our own solar system"), and keep the Escape Velocity credit.
- Decision: Adopt the proposal (owner, 2026-10-08).
### derived.power-triangle

- Where: `FACTIONS` and `PATROL_NAMES` in `js/data.js`; `CULTURE_FACTION` and `FACTION_COOL` in `js/ties.js`.
- What: Three powers (Earth Coalition, Mars Republic, Belt Collective) plus pirates, with the Belt as the outer population that the two inner powers cool toward, and navies that go to war over incidents.
- Why it reads as the Expanse: The Earth, Mars and Belt triangle, with the Belt as the side the other two look down on, is the Expanse's political frame.
- Proposed instead: Keep three powers for the mechanics but change what each is. Earth is a compact of arcology cities that trade and license, with no world government. Mars is a set of dome municipalities that share a fleet and nothing else. The Belt is a league of stations held by chartered guilds that vote on water and berth rights.
- Decision: Keep three powers, reshaped as proposed (owner, 2026-10-08). The outer planets are expected to split into factions of their own later; see `derived.ganymede-breadbasket`.

### derived.belter-people

- Where: `BACKGROUNDS.belt` in `js/menu.js` (line 83, "long limbs and short patience"); the description of Ceres Station in `SYSTEMS.ceres` (`js/data.js`: "Belters with long limbs and short tempers", "six million people spun up inside a dwarf planet"); "Belter" in `js/stories/ice-strike.js`, `js/stories/mars-navy.js` and the transit text in `js/transit.js`; the greeting "Safe water." in `js/stories/on-the-road.js`.
- What: One Belt-wide people, called Belters, with a shared long memory ("Belters remember everything"), a mutual-aid greeting, and a body shaped by low gravity.
- Why it reads as the Expanse: The Belters are the Expanse's people of the Belt, with the same physique, the same loyalty and the same keeping of debts.
- Proposed instead: Make identity local: the spin or the station a person comes from (Ceres spin, the Hollows, Ring Nine, Ironheart). Each place has its own greeting and its own long memory, and there is no single Belt people. Drop the physique; show a place by its work.
- Decision: Adopt the proposal (owner, 2026-10-08).
### derived.earth-basic

- Where: the description of Earth in `SYSTEMS.earth` (`js/data.js`): "Thirty billion people, most of them on basic assistance".
- What: An Earth of tens of billions supported by a basic allowance, with the orbital elevator ports and the customs queues on top of it.
- Why it reads as the Expanse: The Expanse's Earth is a crowded world of billions on basic support. The figure and the word are close to it.
- Proposed instead: A world of arcology cities held together by licenses and rota duties (see `bg.earth`), with no headline population and no allowance. Who has a license, and who has lost one, replaces who is on assistance.
- Decision: Adopt the proposal (owner, 2026-10-08).
### derived.ganymede-breadbasket

- Where: the description of Ganymede in `SYSTEMS.jupiter` (`js/data.js`): "The breadbasket of the outer planets".
- What: Ganymede's agri-domes feed the outer planets and half the Belt.
- Why it reads as the Expanse: Ganymede as the outer system's breadbasket is the same role it has in the Expanse. This is a moderate match: a farming moon is an obvious SF idea.
- Proposed instead: Keep Ganymede as a food source for the mechanics, but give it its own shape: a moon of leasehold terraces, where food is grown under a lease that is inherited, and the farmers' wariness is of the lease agent and not of investors.
- Note: The owner expects the outer planets (Jupiter, Saturn, Neptune, now independent or under the Belt) to become factions of their own later, and Ganymede to anchor one. The lease idea is meant to carry over: food becomes leverage over the inner powers, and the wariness is toward inner-power lease buyers. Give the future faction local names (a Ganymede lease council, Europa's water board, Titan's consortium) and not "Outer Planets Alliance", which is the Expanse's own name for its outer-system group.
- Decision: Adopt the proposal (owner, 2026-10-08).
### derived.mars-navy

- Where: `PATROL_NAMES` in `js/data.js` ("MRN frigate"); `js/stories/mars-navy.js` (the strings "MCRN Reserve", "MCRN munitions" and "MCRN call-up", and the quest flag `mcrn`); the "Mars Republic Navy intelligence" path in Cold Water Act 2.
- What: Mars is a republic with a navy and an intelligence service that recruits reservists and runs deniable work.
- Why it reads as the Expanse: "MCRN" is the Expanse's own abbreviation for the Martian Congressional Republic Navy, used as is. A Martian navy with its own intelligence arm that sits across from a Belt authority is the Expanse's arrangement.
- Proposed instead: The Mars service is a fleet owned by the dome councils and paid for by an air levy, with an auditor and no intelligence arm. The Reserve Commission keeps its beats, and the fixer becomes a council auditor.
- Decision: Adopt the proposal (owner, 2026-10-08).
### derived.juice

- Where: `js/transit.js`, line 14 ("Crash couch: juice reservoir at 80 percent.") and line 188 ("The juice floods your veins").
- What: The drug that keeps a crew conscious at high acceleration is called juice.
- Why it reads as the Expanse: "Juice" is the Expanse's name for exactly that drug.
- Proposed instead: Call it by what it does: "the anti-g drip", and "the drip floods your veins".
- Decision: Adopt the proposal (owner, 2026-10-08).
### derived.pdc-torch

- Where: `OUTFITS.pdc` ("Point-defense cannon") and `SHIPS.courier` ("Torch Courier") in `js/data.js`.
- What: The gun that shoots down torpedoes is a PDC, and the fast courier is a torch ship.
- Why it reads as the Expanse: Both terms are tied to the Expanse's ships and fights. This is the weakest entry: "point defense" and "torchship" are also general SF terms.
- Proposed instead: "Close-defense turret", and "Needle courier" (the courier art already calls it "a needle with an oversized drive" in `js/art.js`).
- Decision: Adopt the proposal (owner, 2026-10-08).
### derived.ice-hauler-opening

- Where: the Cold Water story in `README.md` (line 36) and `js/stories/cold-water.js`; `SHIPS.freighter` ("Ice Hauler") in `js/data.js`; the hired chapter's Ice Hauler setting (`docs/superpowers/specs/2026-10-02-hired-chapter-design.md`).
- What: The first story opens on a derelict ice hauler with a data core someone wants back, in a fight over who controls the Belt's water, and the hired hand's career runs on an ice hauler.
- Why it reads as the Expanse: An ice hauler found derelict, with a secret aboard and the water of the Belt at stake, is close to the Expanse's opening.
- Proposed instead: Keep the water economy, which is physics and mechanics. Move the story's origin: it opens at a port after a failed water audit, with a sealed tally book that the audit board wants back, and the derelict is a surveyed hull nobody will claim.
- Decision: Adopt the proposal (owner, 2026-10-08).