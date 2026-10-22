# Console combat: threat and answer

Design notes for rebuilding the gunner console duel (`js/duel.js`) on the model of
Wind in the Rushes: hidden plays, a deck built from what you carry, and an AI that
counts cards from public information. Boarding becomes its own duel. The base ship
duel is built (#42); the rest isn't yet. Numbers are starting values to be tuned by
simulation (#45).

## Future state

Piloting and real-time combat are the least interesting part of the game. The captain
decides, and the crew flies.

- **One combat system.** The card duel is the only fight, in burns and in classic
  flight. With no crewed gunner, the captain plays it with their own skill. The
  real-time fight is retired: in burns (#52, done), in local space (#55), and in the
  story set pieces (#56). Since then the hired hand's fights are the turn-based ship
  fight and deck fight on the sensor board (the section at the end, #786), and the card
  duel is the owner's, parked with the owner game (`ROADMAP.md`).
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
- Engineer: shields soaking damage, and later perhaps a mid-fight power reroute.
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
| Shields power | At 40% or more, with shields in good order, a deflector soaks the first half hit of the fight. Hits that land also wear the shields. |
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
| Deflector capacitor | Passive, not a card: the first half hit each fight does nothing. |
| Drive tuning | One Evasive burn becomes a Hard burn, which also stops torpedoes. |
| Cargo pod | -1 Evasive burn, because it's mass. |
| Transponder spoofer | False ping: an answer that reveals one card in the enemy hand. |
| Tank, berth | None. |

Armor is a card because a plate is a choice you make in the fight. Shields are passive
because nobody decides when to use a capacitor, and it keeps the deck smaller.

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

In the hired-hand chapter a pirate contact or a navy stop is not the card duel. It is fought turn by turn (`js/fight.js`, the
engine, pure; `js/fightui.js`, the panel), as the turn-combat design sets out
(`docs/superpowers/specs/2026-10-20-turn-combat-design.md`, #786). An owner who kept a post (`lockPost()`) fights the same way
(`js/duel.js` startDuel); an owner who was never a hand keeps the card duel above. Bounties and hunters are still the card duel.

### The ship fight

The panel is the sensor board (`js/board.js`) with both sides' bars under it: shields, armor, and the weapons, drive and lock,
each with its own bar. Each turn her move and the captain's are shown first (a broadside at a part, closing, a pin on your
drive, coming alongside, breaking off; the captain closes, holds or opens the range by the captain card's nerve). The hand aims
each ready gun at a part or holds it, the torpedo and the turret where they are fitted, and presses Fire. Damage is rolled in a
range, cut at long range and harder close in; each shot adds heat, two bleed off a turn, and over the cap a gun locks for the
next turn. A part at zero stops what it does: no weapons, fewer shots; no drive, no change of range; no lock, no boarding. One
line a turn goes in the log.

She is met at forty kilometers, long range (a raider, a corsair), or thirty, mid range (a patrol), moved by the contact's own move
(`js/engage.js`) or the ambush (`js/engagements.js`, below). It ends crippled (her weapons and drive gone: dead in space, to
board her or let her drift; a navy ship breaks off instead), broken off, escaped (you open past long range), boarded (the deck
fight), your hull gone, or at the eighth turn (`FIGHT.TURNS`) one side breaks off: she does if she is the less whole, and else
the captain runs, a lost fight. There is no standoff. A ship whose guns are gone and whose hull is whole gets away (a weak end, not
a win). A heavy turn (the hull loses more than a fifth of your armor) can cost a casualty and hurt the hand. The numbers are
`FIGHT` and `FOE_TYPES` in `js/fight.js`.

Each type she can be has one threat, shown in her move, that "shoot her weapons" answers badly (the rework's design,
`docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md`, #808):

- **A raider** (one gun, fast) closes from long range and comes alongside to board while her lock is whole. Shooting her lock
  as she closes stops it; her drive (50) is slow to shoot away at range, where an aimed shot hits for a quarter (long) or 0.4
  (mid), so aiming only at it is boarded about one time in three.
- **A corsair** (two guns, four torpedoes) arms a salvo of two on the first turn and every second turn after, and fires it the
  turn after; the board shows it a turn ahead. Holding the turret back that turn takes 60% off the salvo.
- **A navy cutter** (thick shields) gets an eighth of her shields back each turn: torpedoes and every gun overcharged at her
  hull beat it; anything slower does not.
- **A raider pair**: two shown moves and fire from both, and two locks to stop.

Disarming her takes about three turns of fire (her weapons are 90 a mount), and she fires at your guns while they fire, so
the guns are a race too.

A hired hand can also meet a distress call on a burn through unsettled space (pirates 0.25 or more at either end, at most once
in 60 days): seven in ten are a trap, and the rest are a real freighter that pays the ship's fund 500 cr. Each post has its own
way to read the call, which works at 50% plus a tenth a level. Answering a trap blind springs it, and she fires first; a good
read lets you hit them first or turn away (the captain's regard and 2 experience), and shows a real call so you can help or
leave it. A hostile patrol costs 8 standing with her faction to fight, and a hired hand can heave to and let the ship pay a
quarter of its fund.

### The deck fight

Boarding, both ways, is played on the same panel (`js/fight.js` resolveDeckTurn, `js/boarders.js`): when she comes alongside,
when a boarding run lands in the card duel, and when you board a crippled ship, where a win carries her bridge. The deck is
drawn as its sections (`js/handtohand.js` fightStrip): the Lock, the Corridor, the Bridge, and the cargo bay on a long ship,
with both sides' heads and each side's cover in each, and her count under it with the line at which she breaks. Their move is
shown above it ("4 pushing into the Corridor"); at a veteran grade it is marked "may feint", and it does at the `CUNNING` rate.

Each turn the hand stands or moves one section, does one thing there (shoots, or uses one of the post's two abilities: the
steady one takes one of them down, the cover one makes two points of cover, once a fight), and gives one order to a named
crewmate (that person's own steady or cover ability, at their own odds). Where both sides stand they trade losses, a roll for
each opposing head, cut by the side's own cover but never to nothing. A head lost on our side is downed, and three times in ten
(`DECK.CASUALTY`) a named crewmate hurt or killed; the hand can be hurt in a contested section. It is won when about a third of her start or fewer are left (`DECK.BREAK`), or all are down, or
(boarding her) her bridge is held; it is lost when they hold our bridge, or (boarding her) when none of ours are left. At eight
turns (`DECK.TURNS`) the attackers withdraw. The numbers are `DECK` in `js/fight.js`.

Who stands with you depends on the crew (`repelCrew`). One who cannot stand you keeps to their berth, and of two at each
other's throats the one who thinks less of you will not stand in the same section. A friend takes the first hit meant for you,
once a fight (so does someone who owes you one).

### Measured: `npm run fights`

`tools/fights.js` plays the ship fight and both deck fights over many seeded trials (`npm run fights`: 5 seeds of 200, a hired
gunner on Hester's ship with nine aboard) and reports, for the ship fight, the spread of ends by where the guns aim and by
matchup, and for the deck fights how often they are won and who is hurt, by crew, the post's level, the hand's policy and her
grade. It is run by hand and is not part of `npm test`; `tests/fights.test.js` checks the targets that matter (#786, R36). From
the run that wrote this section (after Task 7's tune):

- **The ship fight** (Task 7 of the rework, #808: `node tools/fights.js --seeds 1,2,3,4,5 --n 100 --ship-only`, 5 seeds of 100
  pirates and 50 navy cutters for each gun policy). The four fixed policies (`random`; `focus`, her weapons; `drive`, her drive
  then her weapons; `lock`, her lock then her weapons) fire the turret and the torpedoes at her hull; `answer` reads her shown
  move: it holds the turret back when she fires a salvo, aims at her lock while she closes or pins with it whole, against a ship
  whose shields come back sends the torpedoes and every gun the heat allows overcharged at her hull, and else aims at her hull.
  Good ends are crippled, broken off and escaped; a lost fight is the captain running or the hull gone.

  | Against | random | focus | drive | lock | answer |
  |---|---|---|---|---|---|
  | a raider (good / lost / turns) | 84% / 0% / 5.1 | 0% / 0% / 4.0 | 68% / 0% / 5.4 | 0% / 0% / 6.0 | 100% / 0% / 6.5 |
  | a corsair | 27% / 52% / 7.8 | 0% / 0% / 7.9 | 1% / 96% / 7.8 | 0% / 96% / 7.8 | 100% / 0% / 8.0 |
  | a cutter | 1% / 73% / 6.7 | 0% / 0% / 3.0 | 0% / 5% / 3.3 | 0% / 98% / 8.0 | 91% / 9% / 8.0 |
  | a raider pair | 30% / 5% / 5.4 | 0% / 0% / 4.0 | 0% / 0% / 4.0 | 45% / 55% / 8.0 | 78% / 22% / 8.0 |
  | over every type | 31% / 39% / 6.4 | 0% / 0% / 4.7 | 15% / 27% / 5.1 | 8% / 69% / 7.5 | 93% / 7% / 7.7 |

  The rest of the ends: aiming at her weapons ends in her getting away (a raider 31%, a corsair 96%) or a boarding (a raider
  69%, a cutter and a pair every time); aiming at her drive is boarded by a raider 32% and by a cutter or a pair almost always;
  random play is boarded 28% over every type. Random play loses 5% of the armor a fight over every type (a corsair's salvos:
  19%), and the hand is killed in 1% of random fights (4% against a corsair). The best fixed policy is random against a lone
  ship and her lock against a pair; none wins more than 70% against every type; `answer` leads the best of them by 16 points or
  more against each type; a fight lasts 6.3 turns on the mean.
  The tuned values (from the rework's starting ones): her guns 10 to 26 (18 to 26), her weapons 90 a mount (40), the drive 50
  (15), an aimed shot 0.4 at mid range and a quarter at long (0.7, 0.5), her salvo every second turn (third), the corsair's
  torpedoes 4 (3), the cutter's shields back an eighth a turn (a quarter). `answer`'s every rule counts (in a copy of the tool's loop): without the lock it
  is boarded nearly every time; without the torpedoes and the overcharge the cutter beats it 94 times in 100; without the
  turret held back a corsair beats it 14 times in 100.
- **Repelling boarders**, random play, five standing: won 90%; by her grade 88%, 58%, 41%. Shooting where they are wins 99%
  with five or two standing, against random's 49% with two. Dead a fight by her grade, after the final review's tune (R42):
  0.32, 0.44, 0.49, against the lock fight's 0.28, 0.43, 0.57.
- **Boarding her**, random play, five standing: won 80%; by her grade 81%, 57%, 29%. With two standing, sending a crewmate
  every turn wins 87%, against random's 35%. Dead a fight by her grade: 0.36, 0.49, 0.55, against 0.29, 0.41, 0.56.

The tool is how to check a change to `FIGHT`, `DECK`, `boardersFor`, `CASUALTY_ODDS` or `REPEL_HURT`.

## Open questions

None right now.
