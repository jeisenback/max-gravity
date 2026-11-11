# The world bible

Status: the world and `voice.md` approved by the owner on 2026-10-31. `people/` holds the characters, each marked approved on its own page. It replaced `docs/world/`, and `voice.md` replaced the old writing guides (#869).

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
11. **Freight:** bulk goes slow and cheap; Hester's ship carries what can't wait, for a premium, and between contracts cuts ice at the outer Belt's rocks for ports short of water (2026-11-11).
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
10. `ceres-coop.md`: the Ceres Crew Co-operative, its Ore Runner, and a member's share.
11. `hermes-foundry.md`, `luna.md`, `mars.md`, `phobos-yards.md`: the foundry on Mercury, Luna's yards and dust towns, Mars's domes and air, and the domes' shipyard.
12. `ironheart.md`, `juno-commons.md`, `eros-old-town.md`, `triton-outpost.md`: the prospectors' co-op at Psyche, the growers' commons at Juno, the boomtown's two halves, and the edge at Neptune (#885).
13. `ring-nine.md`, `pallas-refinery.md`, `the-hollows.md`, `the-rook.md`, `boneyard.md`: the squat in Ceres's shadow, the company refinery and its families' tunnels, the haven at Hygiea and the town of dead ships (#885).
14. `ganymede.md`, `europa.md`, `titan.md`, `enceladus.md`: the lease terraces, the Water Authority's ice, the biolab domes, and the queue at the plumes (#885).
15. `voice.md`: how the game's writing sounds.
16. `people/`: one sheet per character (`ines.md` first).
17. `shape.md`: the shape of the game: a run is one life, the chapters widen into a sandbox, many endings, a thin legacy between runs, and how a random game is tested (#891).
18. `chapter-2.md`: chapter two, the co-op's view: the player flies, trades and fights the Ore Runner under the members' vote, paying the share down, the lender's squeeze from an owners' war, and the last vote (#891).
19. `the-belt.md`: the Belt between the named places: the kinds of settlement, the three zones of law, what holds it together, the work on its boards, and the war landing there (#891).
20. `the-fuel-war.md`: the owners' war over the Vesta depot (Kaur Enrichment against Tycho Yard Holdings, with Ballast Security's guns and Van Leeuwen & Co.'s money): rumbling in chapter two, breaking out in chapter three, ending differently each run (#891).
21. `later-chapters.md`: a draft of chapters 4 to 7 (more hulls, a place, alliances, a threat), where fleets, outposts and the blocs arrive, and what chapter 2 should keep in mind for them.
22. `progression.md`: how a hand grows over a run: the sheet, the skill lines, the picks, traits, papers and standing, each earned differently and all read by the one check rule; what each chapter adds.
23. `look.md`: how the burn view looks: a clean frame around a worn, cramped ship, rooms as boxes in perspective, bunks that each belong to someone, warm light in a cold hull (approved 2026-11-11), with its reference frame `look-target.png`.
24. `owners.md`: the powers, in two layers: the blocs that are the law of each region (the Arcology Pact, the Dome Pact, the Guild Federation) where the code's three powers sat, and the powers inside them in two tiers, major (Tycho, Kaur, Van Leeuwen, Ballast and five more to come) and minor (the places, co-ops, trades and havens), with how far the player can move them, chapter by chapter (draft, 2026-11-11).

## Where the game must change to fit

The owner decided (2026-11-11) that where the bible and the code disagree, the code wins, and the bible is amended to fit. Before that (2026-10-31) the game changed to fit the bible, and the conflicts marked resolved below were settled that way. Known conflicts:

1. **Crew size and posts.** The code crews Hester's ship with about ten (`CHAPTER_CREW` in `js/hired.js`: the hand's post, a first officer, a quartermaster, a medic, a cook, two ice hands). The bible has five to seven: three officers, a bosun and two or three ratings. Resolved (#879): seven aboard, the bosun, one deckhand and the comms rating with the hand; no quartermaster, medic or cook, and the bosun holds the first aid.
2. **The hand's post and share.** The hand can sign on as pilot or engineer, licensed posts, and gets a 6 percent share (`HIRED_SHARE`) that the bible gives only to officers. Resolved for the pay (#879): the hand is a rating, on a day rate less a kit deduction, with no share. The posts a hand may sign on to stay as they are (the narrow build offers only the guns).
3. **Cato** is the first officer (`xo`) in the code, deciding the watch and able to overrule the captain. In the bible he is the bosun. Resolved (#879): he is shown as the bosun on Hester's ship and holds the first aid; the code's slot stays `xo`.
4. **Ice runs, the ice hold and ice hands.** The bible's ship was a fast cargo hull, and bulk ice goes slow. Resolved (2026-11-11, the code wins): Hester's ship is the Ice Hauler, a tower of decks over her water tank (`LAYOUTS.freighter`, `js/layouts.js`), and the ice runs stand; `ship.md` is amended.
5. **The chapter's goal.** The hand saved to buy a used ship (`HIRED_TARGET`). The bible gives a rating no way to own one outright. Resolved (#882): the goal is a member's share in the Ceres Crew Co-operative's Ore Runner (`ceres-coop.md`), a buy-in set by the members' vote with the rest owed, signed at Ceres; chapter one ends there, and chapter two on a co-op ship is still to come.
6. **Hester's code entry.** Her bio ("the owner, on paper... the bank owns most of") becomes the hire-purchase charter, and her `greedy` trait goes: her thrift is the charter's cause, not a vice. Resolved: the code has the charter in her bio and only `secretive` (`js/captains/hester.js`).
7. **Tomas's hope** to buy his sister's flat is out of reach. It becomes paying off her lease arrears, or a lease on a better tier. Resolved: the code has the arrears and then a repair-shop lease (`js/cast.js`), as his sheet does.
8. **Lagos Ring** is an orbital spin habitat owned by the Lagos Arcology (the code's ring gravity and call delay stand). Resolved: the code's Lagos Ring is the ring of `lagos.md`, with its own crew origin (`js/peopletext.js`).
9. **The three powers** (`FACTIONS`) and the faction economies and wars, to be replaced by major and minor owners. Kept the bible's way, since the owner decided (2026-11-11) that the game needs new powers: `owners.md` has them, and what the game changes to fit.

## Still to write

- Everyday life: fun and media (the code has vids, books and ring-ball), religion, crime, what the news covers, age and health, marriage and children, accents.
- What replaces the faction economies and wars in the game: drafted in `owners.md`, for review.
- History before day 1 (the old `docs/world/timeline.md`), the player's start backgrounds (`backgrounds.md`), customs aboard (`customs.md`) and the posts aboard (`trades.md`). Those files were retired in #869; they are in git history, written to the old world, and are a source to check, not to copy.
