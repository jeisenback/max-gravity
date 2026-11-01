# The world bible

Status: the world and `voice.md` approved by the owner on 2026-10-31. `people/` holds the characters, each a draft until approved. It replaced `docs/world/`, and `voice.md` replaced the old writing guides (#869).

This is the world the game's writing comes from. It is built from the base up: who owns what and who works first, then the jurisdictions and private arrangements that keep that order, then work, technology and everyday life, and only then the people. Characters and dialogue come after it and answer to it.

## The owner's decisions

1. **Ordinary life is recognisably ours, a century on.** People talk the way people talk now.
2. **No great powers.** A patchwork of owned jurisdictions: corporate spaces across planets, Earth's arcologies, Mars's domes, Belt co-ops and guild stations, squats and havens. The game's factions will likely become major and minor ones.
3. **Rivalry among owners** for ports, fuel depots, lift off Earth, mines and refineries. Fragmented across the system, concentrated in each place.
4. **Earth's nations are gone.** Arcologies replaced them as city-states run by holding companies.
5. **Only owners own. Everyone else rents everything.**
6. **Crews are hired like today's merchant navy:** cheap registries, manning agencies, recruitment debt, deductions.
7. **Technology:** torch drives are the one leap; an aging fleet, licensed software, light-speed lag, technology spread by class.
8. **Money:** local currencies for wages and rent; one hard trade currency, issued by the largest finance houses, for freight and charters.
9. **The crew:** officers and ratings. Hester (charter), Ines (pilot) and Tomas (engineer) are officers; Cato is the bosun; the hand and one or two deckhands are agency ratings. A finance-house supercargo rides along on high-value runs.
10. **Hester's charter** is hire-purchase: she owns the ship after the last payment, and loses everything if she misses enough.
11. **Freight:** bulk goes slow and cheap; Hester's ship carries what can't wait, for a premium.
12. **Ines** flies on a cheap registry's endorsement, legal aboard and worthless in Lisbon.

## The voice

The voice that uses this world is in `docs/bible/voice.md`. In short: plain, ordinary speech; Brechtian distance in the narration, where who owns, charges and pays is stated flatly and never commented on; extraction shown by setting facts side by side; no villains, only the system working as it was built to, for extracting wealth; every detail technically and socially plausible.

## Sections

1. `economy.md`: ownership, concentration, money, where things go, the rivalry.
2. `jurisdictions.md`: the kinds of place, how rules travel between them, the old three powers.
3. `work.md`: labour, crews, officers and ratings, remittances, licences, organising, Hester's charter.
4. `technology.md`: drives and freight, the old fleet, software, light, who has what, bodies.
5. `lisbon.md`: Lisbon Arcology, the old city, the wall, the lift, and Ines.
6. `ship.md`: Hester's ship, its crew, and life aboard.
7. `lagos.md`: Lagos Arcology, the mainland, Lagos Ring, and Tomas.
8. `rotterdam.md`: Rotterdam Arcology, the port, the finance houses, and Hester.
9. `chittagong.md`: Chittagong Arcology, the hill settlements, the manning agencies, and Cato.
10. `voice.md`: how the game's writing sounds.
11. `people/`: one sheet per character (`ines.md` first).

## Where the game must change to fit

The owner decided (2026-10-31) that where the bible and the game disagree, the game changes, in stages, each as its own project after the writing pilot. Known conflicts:

1. **Crew size and posts.** The code crews Hester's ship with about ten (`CHAPTER_CREW` in `js/hired.js`: the hand's post, a first officer, a quartermaster, a medic, a cook, two ice hands). The bible has five to seven: three officers, a bosun and two or three ratings.
2. **The hand's post and share.** The hand can sign on as pilot or engineer, licensed posts, and gets a 6 percent share (`HIRED_SHARE`) that the bible gives only to officers.
3. **Cato** is the first officer (`xo`) in the code, deciding the watch and able to overrule the captain. In the bible he is the bosun.
4. **Ice runs, the ice hold and ice hands.** The bible's ship is a fast cargo hull, and bulk ice goes slow.
5. **The chapter's goal.** The hand saves to buy a used ship (`HIRED_TARGET`). The bible gives a rating no way to own one outright; the goal becomes something a hand can reach (a hire-purchase deposit, a co-op share, an officer's licence).
6. **Hester's code entry.** Her bio ("the owner, on paper... the bank owns most of") becomes the hire-purchase charter, and her `greedy` trait goes: her thrift is the charter's cause, not a vice.
7. **Tomas's hope** to buy his sister's flat is out of reach. It becomes paying off her lease arrears, or a lease on a better tier.
8. **Lagos Ring** is an orbital spin habitat owned by the Lagos Arcology (the code's ring gravity and call delay stand).
9. **The three powers** (`FACTIONS`) and the faction economies and wars, to be replaced by major and minor owners.

## Still to write

- Everyday life: fun and media (the code has vids, books and ring-ball), religion, crime, what the news covers, age and health, marriage and children, accents.
- Luna, Mars's domes, Ceres and the Belt stations, the outer moons.
- What replaces the faction economies and wars in the game (a code project).
- History before day 1 (the old `docs/world/timeline.md`), the player's start backgrounds (`backgrounds.md`), customs aboard (`customs.md`) and the posts aboard (`trades.md`). Those files were retired in #869; they are in git history, written to the old world, and are a source to check, not to copy.
