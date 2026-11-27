# Console combat: threat and answer

Design notes for rebuilding the gunner console duel (`js/duel.js`) on the model of
Wind in the Rushes: hidden plays, a deck built from what you carry, and an AI that
counts cards from public information. Boarding becomes its own duel. The base ship
duel is built (#42) and belongs to the parked owner game (`ROADMAP.md`); Hardcore mode below is not
planned (`ROADMAP.md`, 4). A hired hand's fights are the turn-based ones further down. Numbers are starting values to be tuned by
simulation (#45).

## Future state

The hired hand's ship fight is real time with pause, as a strategic layer (the owner's decision, #1348): the
captain still decides, and the crew still fly by order. Steering by hand is not the game.

- **One combat system.** The card duel is the only fight, in burns and in classic
  flight. With no crewed gunner, the captain plays it with their own skill. The
  real-time fight is retired: in burns (#52, done), in local space (#55), and in the
  story set pieces (#56). Since then the hired hand's fights are the ship fight on the
  radar (real time with pause, #1348) and the turn-based deck fight (the section at the end), and the
  card duel is the owner's, parked with the owner game (`ROADMAP.md`).
- **Automated flight.** Departing, docking, landing and closing on a disabled ship are
  choices, and the autopilot flies them. The flight screen stays as a backdrop but is
  never steered (#53).
- **The deck is the ship.** Every system feeds combat through one place: the function
  that builds the decks. A new system never edits the duel's rules. It adds or changes
  cards, or reads the aftermath.

| Stage | What's in it |
|---|---|
| Ship state (lasts between trips) | Hull, outfits, magazine, crew, condition, refits, escorts |
| Before contact (this burn) | Power routing, orders, how hot the drive runs |
| The fight | Ship duel, then the boarding duel if boarders get across |
| Aftermath | Wear, injuries, deaths (hardcore only), spent torpedoes, prizes, standing |

**Posts are who plays which cards.**
- Gunner: threats. Refits and fire-control condition count here.
- Pilot: Evasive burns and escape cards. Drive power and drive condition count here.
- Engineer: point defence stopping a hit, and later perhaps a mid-fight power reroute.
- Comms: the read on the enemy. Sensor condition decides how exactly you see her
  remaining cards.
- A manual post means the captain does that job, at the captain's skill.

**Burn time is management time:** projects, the comms inbox, crew moments, power and
wear.

## Ship duel

### Initiative

One ship has the initiative and plays a **threat**. The other plays an **answer**.
Both are played face down, then revealed.

- If the threat lands (full or half), the attacker keeps the initiative.
- If the answer stops it, the defender takes the initiative.
- The first initiative goes to whoever made contact. If it's a straight meeting, it
  goes to the ship with the better pilot.

### Threats and answers

| Threat \ Answer | PDC screen | Evasive burn | Crew to the locks |
|---|---|---|---|
| Torpedo | Stopped | Half | Full |
| Gun run | Half | Stopped | Full |
| Boarding run | Half: the boarding duel starts, attackers one short | Full: the boarding duel starts | Stopped |

- The PDC screen is the safe answer, never worse than half.
- Evasive burn beats guns but lets boarders across.
- Crew to the locks is the gamble. It only stops boarders.
- Torpedoes hit hardest: 4 hull points, or 2 for half. Gun runs do 2, or 1 for half.
  A boarding run opens the boarding duel. Until that exists, boarders who get across
  do the same damage as a gun run.

### The deck is your fit

Each ship has two small decks, one for threats and one for answers, and holds a hand
of 3 from each.

| Card | Count |
|---|---|
| Torpedo | Torpedoes in the magazine (`st.torpedoes`, max 6). Spent whether it hits or not; never reshuffled. |
| Gun run | 2 + guns |
| Boarding run | 1 with at least 2 crew, +1 with a gunner |
| PDC screen | 1 + 2 per point-defense cannon fitted |
| Evasive burn | 2 + pilot skill |
| Crew to the locks | 1 + half the crew, rounded down |

Enemy decks come from their ship: torpedoes from `ENEMY_TORPS`, guns and point
defense from the hull, and crew by ship size. Both fits are public, so each side knows
the other's card mix. Hands are hidden and discards are public. Apart from torpedoes,
a used card's deck reshuffles when it runs out.

Buying torpedoes and fitting PDCs now matter at the console as well as in the real-time
fight.

### What the ship's systems do to the deck

Power, wear and refits from the engineer's station (#32, #33, #34) feed the decks. These
are built.

| Source | Effect |
|---|---|
| Weapons power (30% is even) | Gun runs: +1 per 20 points above 30, -1 per 20 below. |
| Drive power (40% is even) | Evasive burns: +1 per 20 points above 40, -1 per 20 below. |
| Point defence power | At 40% or more, with the point defence in good order, it stops the first half hit of the fight. Hits that land also wear it. |
| Fire control wear | Up to 2 fewer gun runs as the fire control wears; shots fired wear it. |
| Sensors wear | Below 80%, each count you read of her hand can be off by one card. |
| Fire control refit (project) | +1 gun run per refit, for good. |

### Hull, outfit and escort cards

These come after the base duel. Each deck is built in three layers: the hull, what's
fitted, and who's flying with you.

**Hull.** Each hull adds the standard cards above plus one signature card. Every hull
gets exactly one, big or small.

| Hull | Signature card | Type | Effect |
|---|---|---|---|
| Rock Hopper | Sealant patch | Answer | Halves any threat. Never stops one. |
| Ore Runner | Jettison cargo | Answer | Stops any threat and costs cargo. |
| Torch Courier | Outrun | Answer | Stops a gun run or a torpedo, then leaves the fight. |
| Ice Hauler | Water-tank armor | Answer | Takes 1 less from any threat. |
| Corvette | Broadside | Threat | A gun run for 2. |
| Raider | Grapple dash | Threat | A boarding run that a PDC screen can't blunt. |
| Corsair | Paired launch | Threat | Two torpedoes: a PDC screen stops one and the other lands for half. |
| Patrol Cutter | Inspection party | Threat | A boarding run whose duel starts at the Corridor. |
| Destroyer | Full salvo | Threat | A torpedo that a PDC screen only halves. |

**Outfits.** These change whole families, the way weapons do in Wind in the Rushes.

| Outfit | Deck impact |
|---|---|
| Point-defense cannon | +2 PDC screens (above). |
| Torpedo launcher | Needed to carry any Torpedo cards. |
| Heavy rounds | Gun runs do +1 on a full hit. |
| Armor plating | +1 Brace per plate. Brace is an answer that halves any threat. |
| Drive tuning | One Evasive burn becomes a Hard burn, which also stops torpedoes. |
| Cargo pod | -1 Evasive burn, because it's mass. |
| Transponder spoofer | False ping: an answer that reveals one card in the enemy hand. |
| Tank, berth | None. |

Armor is a card because a plate is a choice you make in the fight. Point defence is passive
because nobody decides when it shoots, and it keeps the deck smaller. There are no shields: the owner retired them
on 2026-11-14 (#1208, `docs/bible/technology.md`). Each hull's shield points went into its armor, so a fight lasts about as
long as before, and the deflector capacitor is gone (a save that had one has armor plating in its place).

**Escorts.** Each escort adds +1 PDC screen, one Gun run and its hull's signature card.
Those cards are marked as the escort's. If a threat lands fully against an escort's
answer card, the damage goes on that escort's company record (`js/company.js`), so
leaning on escorts can cost them.

### Ending

This stays close to the old duel. The enemy hull track is 4 to 10 points, from its
armor. Each point of damage to you costs 7% of your armor. The fight is capped at 8
exchanges. You yield at 25% armor and pay to be let go.
Finishing the enemy settles the kill and bounty as now.

### AI

The AI works like Wind in the Rushes. It predicts the player's play from public
information only: the player's fit, their discards, their hand size and any torpedoes
left. It scores its own hand by expected value and picks with a softmax, so it's hard
to read. Captain kinds keep a lean: pirates board more and patrols shoot more.

## Boarding duel

This starts when a boarding run isn't stopped, whichever side boards. It also replaces
the `boardOdds()` dice roll when you board a disabled ship that resists. Traders still
give up without a fight.

### Track

The track is **Airlock, then Corridor, then Bridge**.

- Attackers start at the Airlock. They start one step in if the defender answered with
  Evasive burn.
- Winning an exchange moves the fight one compartment in your direction. Taking the
  Bridge wins it for the attacker. Pushing them out of the Airlock wins it for the
  defender.
- The defender has the home advantage: once per duel a sealed bulkhead absorbs one lost
  exchange.

### Exchanges

Each side commits one crew member face down with a tactic: **Rush, Hold or Flank**.
Rush beats Hold, Hold beats Flank and Flank beats Rush. The winner of the tactic
triangle wins the exchange. On a tie, the stronger fighter wins it; if they're equal,
nothing moves.

A fighter's strength is 1 + skill, plus 1 for a gunner. Crew are the cards: whoever you
commit is whoever you put at risk. A crew member can't go twice in a row, so a small
crew runs thin.

### Losses, injury and death

- **An ordinary loss** loses ground. Nobody is hurt.
- **A bad loss** is losing the exchange to a fighter at least 2 stronger than yours.
  Your fighter is injured (the existing `st.injured`). In hardcore mode only, if they
  were already injured, there's a rare chance they die: 15% to start with, halved with
  a healthy medic aboard. In normal mode a bad loss never kills.
- As now, a medic treats injuries for free after the fight. Otherwise the next port's
  clinic treats them.
- A crew death is permanent. It only happens in hardcore mode, and it's rare by design.

### Losing the ship

If boarders take your Bridge:

- **Normal mode:** they strip cargo and a share of credits, then cut loose. You keep
  the ship.
- **Hardcore mode:** the ship is taken and the captain is lost with it. The existing
  legacy handoff (`js/legacy.js`, "lost with ...") passes the company to the heir. There's
  no reload.

## Hardcore mode

This is a new-game option, stored on the save and shown in the status bar. For now it
changes two things: a crew member can die in a boarding duel, and losing your bridge
costs the ship and the captain. Anything more waits until this has been
played.

## Build order

1. The ship duel (#42, PR #51): threat and answer with fit decks. Power, wear and refits
   feed the deck.
2. The duel becomes the only combat, and real-time fighting is retired: in burns (#52),
   in local space (#55), and in the story set pieces (#56).
3. Automated flight, with the flight screen as a backdrop (#53).
4. The boarding duel (#43).
5. Hull, outfit, escort and post cards (#47).
6. Hardcore mode (#44).
7. A headless simulation, like Wind's `tools/simulate.js`, to tune card counts, damage
   and death odds before release (#45).

## A hired hand's engagements

In the hired-hand chapter a pirate contact or a navy stop is not the card duel. It is fought on the radar, in real time with
pause (`js/radar.js`, the rules, pure; `js/radarui.js`, the page; `js/fightui.js`, its start and its ends), as the radar fight's
design sets out (`docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md`, #1345 to #1348). An owner who kept a post
(`lockPost()`) fights the same way, with the captain's order picked at a steady nerve (`js/duel.js` startDuel); an owner who was
never a hand keeps the card duel above. Bounties and hunters are still the card duel.

### The ship fight

The fight runs in order cycles of 20 seconds (`RADAR.TURN_S`), each in 24 fixed steps (`RADAR.SUB`), watched at 1x, 2x or 16x
and paused at any time (Space, or the play button). At the start of each cycle the captain picks an order by the captain card's
nerve (engage, hold at 20 km, open the range, break off, evade: `RADAR_ORDERS`), and the crew work every post but the hand's to
it (`radarAuto`). The hand works the gunner's post (the gun or the point defence, the aim at her hull or a part, hold fire, a
torpedo, the point defence's arc) or the pilot's (the burn inside the order's wedge, landing within the hand's scatter, and when
coasting whether to turn to her); at the engineer's or comms post the crew have it for now (#1371). The page is a top bar, a
situation bar, the radar with the order's cost under it, the hand's console, and the timeline of what has happened.

The fight stops itself, and says why, when she launches, when a torpedo will reach the point defence this cycle, when her guns
first hit us (only the first: the owner, 2026-11-19) and at every torpedo that hits us, as she comes into gun range, and when the
captain goes into evade or break off (`radarPauses`); never twice within two cycles (`RADAR.PAUSE_GAP`, the end included), the
ones held back still on the timeline. Her arming does not stop it.

She is met far out (250 km, a raider or a corsair) or close (40 km: a patrol, an ambush, a contact move that went wrong:
`js/range.js`, `js/engage.js`), and a head start from the contact is a free first volley, ours at her weapons or hers at our hull.
It ends crippled (her weapons and drive gone: dead in space, to board her or let her drift; a navy ship breaks off instead),
broken off, escaped (we open past 400 km), away (her guns gone and her hull whole: she gets away, a weak end), boarded (her lock
whole and alongside: the deck fight), the hull gone, or at the cap (50 cycles from far out, fewer from close: `radarCap`) the
less whole side breaks off: she does if she is the less whole, and else the captain runs, a lost fight. Where each end goes is
`shipFightEnd`. In the fight both sides' armor is 0.45 of the ship's (`FIGHT.POOL`, #814; the point defence's condition and parts
scale the hand's, #1208); the armor the hauler loses there comes back to the ship divided by it, past the skin (`HULL_SKIN`), and
a fight never repairs it or takes it under 1. A heavy hit (a step's damage to our hull over a fifth of the real maximum armor past
the skin, `FIGHT.HEAVY_HIT`) can cost a casualty and hurt the hand (`fightTook`). The numbers are `RADAR` in `js/radar.js` and
`FIGHT` and `FOE_TYPES` in `js/fight.js`.

A hired hand's Ice Hauler carries a close-defense turret (her second gun) and a launcher with two torpedoes (`js/hired.js`
setupHired), and the captain restocks the torpedoes from the ship's fund at a port with an outfitter (a save from before the
fitting, with no launcher, buys none). The two outfits take 6 t of her hold, so she carries 114 t, not 120.

Each type she can be has her own way of fighting: a raider closes and comes alongside to board while her lock is whole; a
corsair holds at 30 km and arms a salvo every fourth cycle, which the point defence answers; a navy cutter holds at 25 km with a
thick hull; a destroyer is a ship to heave to for, not to fight (the owner's choice, #833); a raider pair is two of them, with two
locks. Our gun spreads with range, with the gunner's level and with our speed across her line, and her guns' spread the same way.
The gunner's point defence watch (a pick on the gunner's ladder, `js/picks.js`) takes the point defence's reach from 9 km (`RADAR.PDC_R`) to 12
(`RADAR.PDC_WATCH`, the owner, #1377).
Two fire-control upgrades narrow the board's error: the accuracy suite (40,000 cr: half the error, and a tighter gun) and hardened sensors (30,000 cr:
worn sensors do not widen it) (`OUTFITS` in `js/data.js`, read by `radarFit`). A hand puts one to the captain from the Weapons console at a port with
an outfitter, once a stop; a captain who listens to the hand (`captainHears`) and whose fund has the price buys it there (`js/suggest.js` fitAsk, the owner, #1349).

The hand's learned moves (`FIGHT_MOVES`, the post ladders in `js/picks.js`, the teaching in `js/moves.js`) are still learned, and
carry over to the radar as once-a-fight actions with the meanings the radar fight's design gives them; they are built with the
engineer's and comms posts (#1371), and until then the fight does not offer them.

A hired hand can also meet a distress call on a burn through unsettled space (pirates 0.25 or more at either end, at most once
in 60 days): seven in ten are a trap, and the rest are a real freighter that pays the ship's fund 500 cr. Each post has its own
way to read the call, which works at 50% plus a tenth a level. Answering a trap blind springs it, and she fires first; a good
read lets you hit them first or turn away (the captain's regard and 2 experience), and shows a real call so you can help or
leave it. A hostile patrol costs 8 standing with her faction to fight, and a hired hand can heave to and let the ship pay a
quarter of its fund.

### The deck fight

Boarding, both ways, is fought spot by spot on the ship's decks (`js/deckplan.js`, the rules, pure; `js/deckplanui.js`, the page;
`js/boarders.js`, who stands and how it settles; the spec is `docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md`, #1351
to #1355): when she comes alongside, when a boarding run lands in the card duel, and when you board a crippled ship, where a win
carries her bridge. It replaced the old deck fight on three sections (#1355). The page is the ship cut down the middle: every deck,
the well and its hatches, every spot with its cover, and everyone on their spot, with their move in red, our crew's in blue and the
hand's choices in yellow, and beside it "This turn", the hand's act, one order, the captain's standing order and a suggestion to her.
Its numbers are `PLAN` in `js/deckplan.js` (and the `DECK` numbers it reads, `js/fight.js`), tuned with `npm run fights`
(`tools/planfights.js`, plain Node) against `tests/distribution/deckplanfights.test.js`.

Each figure is one person, wounded by a first hit and downed by a second, and two sides never share a spot (`PLAN.CAP` a spot).
Their move and our crew's are drawn before the hand commits. Each turn the hand stands or takes a step, does one thing from there
(shoots at a spot of theirs in line, at odds by the shooter's level, the target's cover and whether the shooter moved, `PLAN.HIT`;
uses one of the post's two abilities, the steady one downing one of them in line, the cover one making `PLAN.MADE` at the spot, three
with the gunner's cover-eye pick, once a fight; pulls back with everyone at the spot; or holds fire), and gives one order to a named
crewmate (their steady or cover ability at their own odds, the pilot's or the engineer's seal or open on a hatch, a step, or hold).
What came of an ability is said in its own words (the `beats:deck` lines). The captain gives the crew a standing order, hold, push or
fall back, by her nerve, and takes a suggestion at odds by the hand's level and her opinion of the hand. "Hold" sends our crew to the
well a deck above the highest of theirs. A boarder shoots at level 0 (`PLAN.THEIRS`) and a grade more each.

The party is set by her type (`DECK_PARTY`): a raider's, a corsair's, or the navy's. **Raiders rush** two spots in a turn where the
spot on their path is thinly held; a hatch sealed stops a move drawn through it. **A repel comes in two waves**, the rest at the outer
door at the end of `DECK.WAVE_TURN`. **A corsair sets a breaching charge** on the spot of ours with the most heads, never two turns
running and `PLAN.CHARGES` a fight; it is set through the deck plate from a spot of theirs on the deck over or under it and out of its
line, so those on it cannot shoot the setter from there (#1390). It blows at the end of the turn on the spot it was shown on, downing
one there (`DECK.CHARGE`), unless the setter's spot was hit that turn: ours step off it, or someone else hits the setter. **They storm**
a spot of ours they outnumber `PLAN.STORM` to one from the spots next to it: one of ours there is downed, the rest step back, and
they move in. A veteran's move may feint (`CUNNING` a grade), never a rush, a charge or the navy's. Boarding her, her crew hold
their spots, shoot, and seal the hatch over ours once; ours cut through a sealed one.

**The navy's party is an inspection, not a raid.** It comes only on our deck, from a patrol's ship fight at a half run. It pushes and
holds, never rushes, charges or feints, and holds its fire until one of ours has fired on it, as our crew hold theirs until it has
fired (the owner, 2026-11-26). Each of them put down costs `DECK.NAVY_STANDING` with her government, charged at the settle. If they
hold our bridge the ship is searched, not taken: the heave-to's fine, a quarter of the purse, and a point of the captain's regard.
At `PLAN.NAVY_TURNS` an inspection party withdraws, the repel is won, and the citation stands (#828): the ship still pays the fine.
A party broken by force charges no fine.

It is won when her count, the wave still to land counted, is at or under the break line (`DECK.BREAK`, boarding her
`DECK.ASSAULT.BREAK`), or (boarding her) ours hold her bridge with none of hers on it; it is lost when they hold our bridge with none
of ours there (the navy's is a search), or (boarding her) when only the hand is left. At `PLAN.TURNS` the attackers withdraw: a
repel won, an assault lost. A full boarding run brings `DECK.FULL` more (a raider pair `DECK.FULL_PAIR`, boarding her
`DECK.ASSAULT.FULL`, a corsair `DECK.CORSAIR_LESS` fewer). A head of ours downed is a casualty `DECK.CASUALTY` of the time repelling
and `PLAN.ASSAULT_CASUALTY` boarding her: a named crewmate hurt or killed; the rest get up after it. The hand takes hits like anyone;
the one beside the hand takes the first hit meant for them, once a fight (#1388); downed, the hand takes today's hurt roll, and the
crew fight on. A repel lost costs the fund, part of the hold, the fallen and the captain's regard, and one time in six the captain
(`CAPTAIN_LOST`, js/boarders.js).

An owner who kept a post (`lockPost()`) fights the same fight: there is no captain aboard, so the crew's standing order is picked at a
steady nerve and there is nobody to suggest to (the owner, #1355).

Who stands with you depends on the crew (`repelCrew`), and the page says who keeps out. One who cannot stand you keeps to their
berth, and of two at each other's throats the one who thinks less of you keeps out of the fight.

The owner's rulings while tuning it (2026-11-26 and 2026-11-27, #1354, #1390, #1355):

- Boarding her, the captain pushes for her bridge, and pulls back only when ours are under half of hers and her nerve is cautious.
- The hand's shot stays a roll, so the hand's level counts for little, and the two-crew targets are set at what is measured.
- Two crew boarding a raider's seven is too few, and no plan wins it.
- Reading a corsair's charge is worth more than 20 points boarding her with two crew (#1390).
- The rooms' cover is checked only to hold as measured: shots and heads decide this fight, not the rooms (#1390).
- Boarding her, a smaller share of ours downed are casualties than on the old deck fight, which downed fewer (`PLAN.ASSAULT_CASUALTY`).

Measured over seeds 1 to 4 of 400 (1,600 fights a cell), at level 2 and grade 0 (the corsair's rows on 2026-11-27). Each cell gives the share won by the answer
(it reads their drawn move: `tools/answer.js answerPlan`) and the best of the fixed plans (random, shoot, push, fall), with the
answer's turns, its hand downed a fight and its casualties a fight:

| Fight | Crew | Answer | Best fixed plan | Turns | Hand downed | Casualties |
| --- | --- | --- | --- | --- | --- | --- |
| Raiders, repelled | 2 | 0.72 | 0.59 (random) | 9.8 | 0.00 | 0.45 |
| Raiders, repelled | 5 | 1.00 | 1.00 (push) | 7.8 | 0.00 | 0.15 |
| Raider, boarded | 2 | 0.00 | 0.01 (random) | 12.0 | 0.00 | 0.00 |
| Raider, boarded | 5 | 0.91 | 0.88 (random) | 8.6 | 0.17 | 0.23 |
| Corsair, repelled | 2 | 1.00 | 0.64 (push) | 5.6 | 0.10 | 0.11 |
| Corsair, repelled | 5 | 1.00 | 1.00 | 5.6 | 0.00 | 0.36 |
| Corsair, boarded | 2 | 0.62 | 0.12 (random) | 9.5 | 0.24 | 0.15 |
| Corsair, boarded | 5 | 0.97 | 0.81 (random) | 9.3 | 0.03 | 0.13 |
| Navy, repelled | 2 | 1.00, no standing | 1.00, shoot 3.58 standing | 8.0 | 0.00 | 0.00 |
| Navy, repelled | 5 | 1.00, no standing | 1.00, random 3.61 standing | 8.0 | 0.00 | 0.00 |

Without its charge rule the answer wins a corsair boarded with two crew 0.07, and repelled with two 0.07: a hand who stays on
the spot a charge is set on is downed by it. With two crew against raiders, the answer wins 0.72 at level 1 and 0.73 at level 3. Boarding her, about one of ours is downed a
fight, more than on the old deck fight, so a smaller share of them are casualties (`PLAN.ASSAULT_CASUALTY` 0.17, the owner, 2026-11-27):
a boarding costs about the old deck fight's 0.15 to 0.21.


### Measured: `npm run fights`

`tools/fights.js` plays the deck fight on the deck plan over many seeded trials in plain Node (`npm run fights`, `tools/planfights.js`)
and reports how often it is won, its turns, the hand downed and the casualties, by party, crew, the hand's policy and level; with
`--radar` it plays the ship fight on the radar (`tools/radarfights.js`) and reports the spread of its ends by the hand's policy and
the type she is. It is run by hand and is not part of `npm test`; `tests/distribution/deckplanfights.test.js` and
`radarfights.test.js` check the targets that matter in the soak (#786, R36; moved out of `npm test` in #753). From the runs that
wrote this section:

- **The ship fight on the radar** (#1347, #1348: `node tools/fights.js --radar --seeds 1,2,3 --n 100`, 3 seeds of 100 of each type for each
  policy, every policy on the same dice for a type; the rules played by cycles in plain Node, `tools/radarfights.js`). The crew work every post
  but the hand's at level 2, and the hand's post is played by a policy at level 2. At the gunner's post: `random` draws each choice; `hull`
  fires the gun at her hull and a torpedo inside 60 km; `lock` aims at her lock while it is whole; `pdc` runs the point defence at her;
  `answer` (`tools/answer.js answerRadar`) reads her shown threat: the point defence when one of her torpedoes will reach it this cycle,
  else the gun, at a raider's lock as she comes alongside with it whole, at a corsair's launcher while she has torpedoes, at the hull
  otherwise, and a torpedo at the most hurt of hers inside 60 km. Good ends are crippled, broken off and escaped; a lost fight is the
  captain running or the hull gone.

  | Against (good / lost / cycles) | random | hull | lock | pdc | answer |
  |---|---|---|---|---|---|
  | a raider | 42% / 28% / 32.6 | 96% / 0% / 20.5 | 64% / 19% / 29.5 | 1% / 62% / 39.3 | 96% / 0% / 20.5 |
  | a corsair | 10% / 90% / 49.5 | 45% / 55% / 43.4 | 18% / 82% / 47.3 | 6% / 94% / 49.7 | 68% / 32% / 38.9 |
  | a cutter | 11% / 89% / 31.9 | 65% / 35% / 17.3 | 27% / 73% / 27.7 | 2% / 98% / 32.0 | 65% / 35% / 17.3 |
  | a raider pair | 1% / 46% / 30.0 | 46% / 18% / 27.3 | 3% / 56% / 32.4 | 0% / 45% / 30.7 | 47% / 15% / 26.5 |
  | a destroyer | 2% / 98% / 28.5 | 5% / 95% / 28.1 | 2% / 98% / 29.1 | 1% / 99% / 28.4 | 5% / 95% / 28.1 |
  | over every type (good / lost / at cap) | 13% / 70% / 59% | 51% / 41% / 31% | 23% / 66% / 50% | 2% / 80% / 66% | 56% / 36% / 26% |

  The soak checks the gunner's targets (`tests/distribution/radarfights.test.js`): `answer` at or above every fixed policy against each
  type, no fixed policy over 70% good ends against every type, random play losing a quarter or more, and `answer` 15 points or more over
  random. A navy destroyer is left out of the targets, as in the old fight's: she is a ship to heave to for, not to fight (#833). At the
  pilot's post the targets are not met, and are an open design question (#1347): over every type `random` 66% good and 34% lost, `hold` 53% good and 39% lost, `close` 68% good and 16% lost, `answer` 65% good and 31% lost.
- **The deck fight on the deck plan** (`npm run fights`, 4 seeds of 400): the table in the deck fight's section above. The old deck
  fight's measurements went with it (#1355); they are in this file's history.
- **In the soak** (`npm run soak`): the chapter's deck fights are played by `answerPlan` (`tools/soak.js`, #1355).

The tool is how to check a change to `PLAN`, `DECK`, `boardersFor` or `CASUALTY_ODDS`.

## Open questions

None right now.
