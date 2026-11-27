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

Boarding, both ways, is played on the same panel (`js/fight.js` resolveDeckTurn, `js/boarders.js`): when she comes alongside,
when a boarding run lands in the card duel, and when you board a crippled ship, where a win carries her bridge. The deck is
drawn as its sections (`js/handtohand.js` fightStrip): the Lock, the Corridor, the Bridge, and the cargo bay on a long ship,
with both sides' heads, their wounded, and each side's cover in each, and her count under it with the line at which she breaks.
Their move is shown above it ("4 pushing into the Corridor"); at a veteran grade a push or a round is marked "may feint", and it
does at the `CUNNING` rate. The design is `docs/superpowers/specs/2026-10-24-deck-fight-rework-design.md`.

The party is set by her type (`DECK_PARTY`): a raider's, a corsair's, or the navy's (a cutter's or a destroyer's: below). The
raiders' move is the **rush**: where the section in front holds fewer of ours than half their number, and the hand is not in it, they go
through it, two sections in a turn ("Boarders: 3 rushing through the Corridor into the Bridge"). The hand standing in the section passed stops them
there, and so does a hatch worked there. A **repel comes in two waves**: half the boarders first, and the rest at the end of the second
turn (`DECK.WAVE_TURN`), shown at the lock ("3 more at the lock next turn") on the turn at whose end they land. The break line counts the
wave still to land.

The corsair's marines have the **breaching charge**. Where their move would be a push or a hold, and one of theirs stands next to
a section of ours, the charge is shown on that section ("Boarders: a charge on the Corridor, set from the Lock. Hit them in the
Lock to stop it; it blows this turn."; the one of ours with the most heads, the first in deck order on a tie), marked CHARGE on
the strip and SETTER on the section it is set from. It is never shown two turns running and never feinted. Its setter stands in
the section of theirs it is set from. The charge blows at the end of the turn, after the exchange and the shot:
it downs one of ours there outright (`DECK.CHARGE`), past cover and wounds, the wounded first, and each downed rolls for a
casualty as an exchange's do. **It is stopped at its setter:** if ours downed or wounded one of theirs in that section this turn
(the shot aimed there, a steady worked there, the hand's, an order's or the pilot's hatch, or the trade where ours stand there),
it does not blow ("the charge in the Corridor never blows: they were hit in the Lock"). A steady in the charged section itself
does not stop it, and a charge that blows where none of ours are left says so ("the charge blows in the Corridor on nobody"). The hand's act **pull back** takes the hand and all of
ours in its section one section back (toward our bridge repelling, toward her lock boarding her) before it blows, and gives up the
ground; it is offered only when the hand stays in its section that turn (a section a turn: the engine ignores one on a turn the
hand moved), and not in the back section (our bridge, her lock). Her crew aboard when we board her, and a corsair's full run in
the duel, is two heads fewer than another ship's would be (`DECK.CORSAIR_LESS`): her charge takes heads of ours the rest of her
crew would otherwise. In the ship fight she fights with torpedoes, so she boards us at a half run (`fightui.js` fightBoarded),
which it leaves alone: three heads at grade 0, two more a grade.

**The navy's party is an inspection, not a raid** (Task 6). It comes only on our deck: a patrol that boards us from the ship
fight (`fightBoarded`), at a half run since she fights with her guns, four heads at grade 0 and two more a grade (a cutter's; a destroyer, three patrols in ten, boards with six, and the navy checks measure the cutter only), named on the
panel as "The boarding party". It pushes, goes round on a long deck, and holds, and never rushes, charges or feints. **Each of them put down costs
standing** with her government, `DECK.NAVY_STANDING` (2) a head downed by the exchange, the shot, a steady or a hatch, charged
at the settle whether they are repelled, withdraw or search the ship (a wound costs nothing; a hand killed ends the chapter
with no settle), on top of the 8 that firing on her cost; the panel says it under the deck ("Each of
them put down costs standing with Arcology Compact: 4 so far."). **If they hold our bridge the ship is searched**, not taken
(`deckEnd` 'searched', `shipSearched` in js/boarders.js): the heave-to's fine, a quarter of the purse (`heaveToFine`, which
the heave-to charges too), goes out of the ship's fund, the captain thinks a point less of the hand, and the ship is kept,
with her hold, her armor and her captain. Her standing is not reset as the heave-to resets it, since you fought them. **At
five turns (`DECK.NAVY_TURNS`, the owner's ruling, 2026-10-27) an inspection party withdraws**, and the repel is won; the panel's
"Turn n of 5" shows that cap. **The citation stands** (#828, the owner's decision, 2026-10-27): a party that withdraws at its cap
still files it, so the ship pays the heave-to's fine, a quarter of the purse (`heaveToFine`, through `moveMoney` in `citation`,
js/boarders.js), and the close says so (`deck.end.cited`, a draft). A party broken or downed by force charges no fine (its 2 standing a
head still applies), there is no opinion change and no standing reset on a withdrawal, and a raider's withdrawal charges nothing. So letting a patrol board now costs
the heave-to's fine plus the ship fight's 8 standing, and the lawful answer, to hold them off and put none of them down, saves only the
2 a head. A navy hull boarded (in the owner's game) fights as her crew: no standing, no search, no citation, the deck's cap.

The navy's deck fight is rare under the ship fight's answer: `answer` is never boarded by a cutter (the table below), and the
ladder's cutter is a papers check: complying answers it, so the fine is paid once and there is no fight. The soak, which plays
the ship fight its own way (the orders as they stand), meets it 39 times in 257 deck fights (PR 2's count: the soak does not tally parties).

Repelling a corsair, the charge is a cost, not a puzzle. With two standing all of ours hold our bridge and her setter stands in
the corridor, which is where any plan that goes where the fight is shoots anyway: `order` wins 99% to the answer's 98%, and
random play with five standing loses 0.40 dead a fight to her half run of three (a raider's full run of six, 0.42). Boarding
her, it is the puzzle: with two standing, the answer wins 85%, the same answer that does not read the charge 58%, and no fixed
policy more than 16%.

Each turn the hand stands or moves one section, does one thing there (shoots, uses one of the post's two abilities: the
steady one takes one of them down, the cover one makes two points of cover, once a fight; pulls back; or **holds fire**, offered
in every deck fight: the hand stands ready and fires at nobody, with no shot and no ability rolled), and gives one order to a named
crewmate (that person's own steady or cover ability, at their own odds). The pilot's and the engineer's hatch is worked from
their post, so its order names a section; every other order works where the hand stands. Where both sides stand they trade, a
roll for each opposing head (`DECK.CREW_HIT`, 0 to 2), cut by the side's own cover but never to nothing. A hit **wounds a head
first**, and downs one only when all of that side there are wounded; a wounded head still fights and counts. The hand's shot
downs the wounded first and wounds the rest: 1 to 2 heads at levels 0 and 1, 2 to 3 at level 2, 3 to 4 at level 3
(`DECK.SIDEARM_BY_LEVEL`), and from level 2 it can be aimed at a section next to the hand's (`DECK.SIDEARM_REACH_LEVEL`). A head
of ours downed is a casualty three times in ten (`DECK.CASUALTY`): a named crewmate hurt or killed; the rest get up after it.
The hand can be hurt in a contested section: a roll a turn of 0.45 (`REPEL_HURT.lose`) times 0.2 for the suit (`DECK.SUIT`), 9 in
100, under the lock fight's 0.3 since a deck fight lasts about twice the turns.

It is won when her count is at or under the break line, or all are down, or (boarding her) her bridge is held; it is lost when
they hold our bridge (a navy party's is a search), or (boarding her) when none of ours are left. At eight turns (`DECK.TURNS`;
a navy party at five) the attackers withdraw.
Repelling, a full boarding run brings four more than a short one (`DECK.FULL`, in `boardersFor`), a raider pair two (`DECK.FULL_PAIR`:
at four, a veteran pair came over with ten and twelve and took the bridge one time in two), and the break line is 0.15 of
the party (`DECK.BREAK`): a raider's six fight to the last. A repel lost costs the fund, part of the hold, the fallen and the
captain's regard, and one time in six the captain (`CAPTAIN_LOST`, js/boarders.js; one in three before repels could be lost).

**Boarding her is a short, risky push** (the owner's ruling, 2026-10-24), with its own numbers (`DECK.ASSAULT`, read through
`deckRule`): she has five more aboard than a short run would bring (a raider seven), she breaks at 0.2 of them (at one of seven),
each head's roll is 0 to 1, so that two of ours last long enough for the hand's shot to tell, and half of ours downed are
casualties, since fewer are downed. The numbers are `DECK` in `js/fight.js`.

Who stands with you depends on the crew (`repelCrew`). One who cannot stand you keeps to their berth, and of two at each
other's throats the one who thinks less of you will not stand in the same section. A friend takes the first hit meant for you,
once a fight (so does someone who owes you one).

### Measured: `npm run fights`

`tools/fights.js` plays both deck fights over many seeded trials (`npm run fights`: a hired gunner on Hester's ship with nine
aboard) and reports how often they are won and who is hurt, by crew, the post's level, the hand's policy and her grade; with
`--radar` it plays the ship fight on the radar (`tools/radarfights.js`) and reports the spread of its ends by the hand's policy and
the type she is. It is run by hand and is not part of `npm test`; `tests/distribution/fights.test.js` checks the targets that matter in the soak (#786, R36; moved out of `npm test` in #753). From
the runs that wrote this section:

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
- **The deck fights** (`node tools/fights.js --seeds 1,2 --n 200 --groups party,level,grade,charge,setpiece,navy`, the deck
  test's own runs: tests/distribution/fights.test.js; each cell plays on its own stream, seeded from the run's seed and the cell's name, so a
  change to one cell moves no other's numbers). A hand at level 2, her grade 0; a raider boards us at a full run and a corsair
  at a half one, as in the game, and the navy's party is started from a patrol cutter's boarding as the game starts it; each cell is won with two standing / five, then the mean turns. The fixed policies go where the fight is, reading neither the rush nor the charge: `shoot` fires there, `cover` makes
  the cover first, `order` shoots and sends the first crewmate on offer every turn. `random` draws each part of the plan from
  what the panel offers, hold fire among them and the pull back when it stands still. `answer` (tools/answer.js answerDeck) meets a shown rush in its path, or
  hatches it when the hand is too far, else goes where the fight is, aims the shot at the most of theirs wounded in reach, and
  orders the first crewmate on offer; boarding her it makes the cover first. On a shown charge it hits the setter: it shoots
  into the charge's `from` from the first stand whose shot reaches it (the plan's, the hand's, a section a step away), else,
  where the hand stands in the charged section and it is not the back one, it pulls back, else it sends the pilot's steady hatch
  to `from`. `answerNoCharge` (the `charge` group, boarding her with two standing) is the answer without that rule. Against a
  navy party it stands where they push when ours stand there (else with ours nearest them), pulls ours back out of the hand's
  section where they trade there while the bridge is not at stake, makes the cover and then holds fire, sends the pilot's or the
  engineer's hatch where they push, and shoots only when they would hold our bridge or the section it stands in would be lost.

  | Raider party | random | shoot | cover | order | answer |
  |---|---|---|---|---|---|
  | repelling | 27% / 41%, 4.2 / 5.4 | 25% / 96%, 2.9 / 5.0 | 36% / 92%, 3.3 / 5.3 | 63% / 97%, 3.5 / 4.1 | 97% / 97%, 5.1 / 4.1 |
  | boarding her | 20% / 85%, 5.4 / 5.7 | 30% / 96%, 5.1 / 4.0 | 21% / 96%, 5.1 / 4.4 | 53% / 97%, 4.4 / 3.5 | 81% / 97%, 4.3 / 3.7 |

  | Corsair party | random | shoot | cover | order | answer |
  |---|---|---|---|---|---|
  | repelling | 26% / 69%, 5.0 / 6.1 | 98% / 97%, 4.9 / 3.7 | 96% / 97%, 5.9 / 4.0 | 99% / 100%, 4.2 / 3.1 | 98% / 100%, 4.2 / 3.1 |
  | boarding her | 14% / 86%, 3.4 / 5.4 | 16% / 97%, 2.8 / 4.2 | 10% / 94%, 3.1 / 4.6 | 16% / 96%, 3.7 / 3.5 | 85% / 98%, 4.0 / 3.8 |

  | Navy party, repelling | random | shoot | cover | order | answer |
  |---|---|---|---|---|---|
  | won, turns | 100% / 90%, 5.0 / 4.8 | 96% / 97%, 4.9 / 3.9 | 97% / 97%, 4.9 / 3.9 | 99% / 99%, 4.3 / 3.4 | 100% / 100%, 5.0 / 5.0 |
  | standing lost a fight | 2.65 / 4.79 | 5.78 / 7.74 | 5.79 / 7.66 | 7.83 / 7.88 | 0.00 / 0.76 |
  | searched | 0% / 9% | 0% / 0% | 0% / 0% | 0% / 0% | 0% / 0% |
  | fined a fight (of a quarter-purse, 30,000) | 29,400 / 21,225 | 28,875 / 0 | 28,950 / 1,500 | 675 / 0 | 30,000 / 30,000 |

  Against the navy every policy wins: the lesson is the standing and the fine. The answer holds them to their cap, so its citation always stands
  (30,000 a fight, the whole quarter-purse, with two crew and with five; a policy that breaks the party by force pays none of it: shoot, cover and order with five crew pay 0, 1,500 and 0), and costs none with two
  standing and 0.76 with five, against 5.8 and 7.7 for shooting; random play costs 2.65 and 4.79, and with five standing loses
  0.26 dead a fight (the test holds it within 0.15 of 0.32) and is searched 9 times in 100. With two crew no fixed policy
  wins 70% of its fights against every party (each party's fights pooled over both ways): random wins 24%, 20% and 100%
  against the raider, the corsair and the navy, shoot 28%, 57% and 96%, cover 29%, 53% and 97%, order 58%, 58% and 99%. With
  five crew (reported, not checked: the owner's ruling, 2026-10-27) shoot, cover and order win 94% to 98% against every party, and
  random 63%, 78% and 90%. Random play loses 44% of all its fights.

  A grade 2 corsair, the chapter's setpiece (`js/fightladder.js`; the `setpiece` group, reported, not checked): repelling her
  half run of seven, the answer wins 92% / 98% (5.7 / 4.2 turns), random play 23% / 46% with 0.52 dead a fight at five
  standing; boarding her, the answer wins 73% / 96% (4.8 / 4.1), random play 1% / 29% with 0.79 dead a fight at five.

  The answer by the post's level, two standing, against raiders:

  | Level | 0 | 1 | 2 | 3 |
  |---|---|---|---|---|
  | repelling | 67%, 5.3 turns | 65%, 5.3 | 96%, 5.1 | 99%, 4.4 |
  | boarding her | 41%, 4.5 | 41%, 4.5 | 78%, 4.2 | 83%, 4.1 |

  The level that counts is 2, where the shot reaches the next section: a hand at level 0 or 1 with two standing wins a repel
  two times in three and boarding her two in five. The test holds random play repelling a corsair with five standing within 0.15
  of 0.40 dead a fight, measured at 0.39 to 0.40 in two runs of 1,600 fights after the pull back (#832; it was the raider repel's grade-0 baseline,
  0.32, plus 0.2, which sat a standard error over its floor). The hand is hurt in a tenth to a third of `answer`'s
  fights (raiders: repelling 31% / 23%, boarding her 24% / 24%; a corsair: 16% / 11% and 29% / 28%).

  *How the charge was tuned* (history, Task 5; not the rules now): when a steady in the charged section stopped it, it could down
  no more than 0 to 1 (with two standing all of ours hold our bridge, the back section). Stopped at its setter instead, at 1 to 3
  heads and her party one fewer, the answer won 98% / 99% repelling her and 47% / 97% boarding her; at 1 head and her party two
  fewer (the owner's ruling, 2026-10-27) it is the table above. Those runs repelled her at a full run, on one stream for every
  cell; with the charge off (her party one fewer) random play repelling her with five standing lost 0.32 dead a fight.
- **Repelling boarders**, random play, five standing: against raiders by her grade won 42%, 18%, 12%, and dead a fight 0.39,
  0.50, 0.49 (0.32, 0.44, 0.49 before the parties); against a corsair at grade 0, at her half run, 0.40; against the navy's
  party, 0.26. With two standing the answer against
  raiders loses no one (0.00 dead a fight).
- **Boarding her**, random play, five standing: against raiders by her grade won 84%, 62%, 22%, and dead a fight 0.35, 0.52,
  0.46 (0.36, 0.49, 0.55 before the parties; the test holds it at no more than those and 0.15); against a corsair at grade 0,
  0.34. The answer with two standing against raiders: 0.12 dead a fight.
- **In the soak** (`npm run soak`, the deck fights played by `answerDeck`; seeds 1 to 120, tests/distribution/stakes-fights.test.js): the
  hand is hurt 0.55 times a chapter, 9 of the 66 in 265 repels; 3 of 120 chapters lose the captain on the bridge and 5 the hand,
  8 in all (the limit is 3 in 40). With the charge the same: 66 hurts, 4 hurt again, 8 ended early; of the 257 deck fights begun,
  all repels, 14 are against a corsair's party (204 raiders', 39 the navy's: PR 2's split, the soak does not tally parties). With the navy's party, its cap and hold fire (Task 6): 67
  hurts (0.56 a chapter), 3 hurt again, 7 ended early (3 deaths, 4 captains lost; the limit is 9 in 120).

The tool is how to check a change to `FIGHT`, `DECK`, `boardersFor`, `CASUALTY_ODDS` or `REPEL_HURT`.

### The deck fight on the deck plan (in development)

The deck fight played spot by spot on the ship's decks (`js/deckplan.js`, `js/deckplanui.js`; the spec is
`docs/superpowers/specs/2026-11-16-boarding-deck-plan-design.md`) opens behind a setting until it replaces the strip (#1355). Its
numbers are `PLAN` in `js/deckplan.js`, tuned with `node tools/fights.js --plan` (`tools/planfights.js`, plain Node), and its
targets are `tests/distribution/deckplanfights.test.js`. The owner's rulings while tuning it (2026-11-26, #1354):

- Boarding her, the captain pushes for her bridge, and pulls back only when ours are under half of hers and her nerve is cautious.
- They storm a spot of ours they outnumber three to one from the spots next to it (`PLAN.STORM`): one of ours there is downed,
  the rest step back, and they move in. The storm is drawn with their move.
- The hand takes hits like anyone. A friend takes the first, once a fight. Downed, the hand is out and takes today's hurt roll,
  and the crew fight on.
- The hand's shot stays a roll, so the hand's level counts for little, and the two-crew targets are set at what is measured.
- Two crew boarding a raider's seven is too few, and no plan wins it.
- A navy party and our crew each hold fire until the other side has fired.
- A corsair's charge is set through the deck plate, from a spot of theirs on the deck over or under the spot it is set on and
  out of its line, so the ones on that spot cannot shoot the setter from there: they step off it, or someone else hits the
  setter (2026-11-27, #1390). Reading it is worth more than 20 points boarding her with two crew.
- The rooms' cover is checked only to hold as measured: shots and heads decide this fight, not the rooms (2026-11-27, #1390).
- Boarding her, a smaller share of ours downed are casualties than on the strip (2026-11-27, on #1355).

"Hold" sends our crew to the well a deck above the highest of theirs. A boarder shoots at level 0 (`PLAN.THEIRS`), and a point
of cover is worth 0.16 off a shot's odds.

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
fight, more than on the strip, so a smaller share of them are casualties (`PLAN.ASSAULT_CASUALTY` 0.17, the owner, 2026-11-27):
a boarding costs about the strip's 0.15 to 0.21.

## Open questions

None right now.
