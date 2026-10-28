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
a win). In the fight both sides' shields and armor are 0.45 of the ship's (`FIGHT.POOL`, #814), so that a fight usually ends
before the eighth turn; the armor the hauler loses there comes back to the ship divided by it (seven lost in the fight is sixteen
at the yard), and a fight never repairs it or takes it under 1. A heavy turn (the damage her guns do to
your hull, which is not pooled, is over a fifth of your real maximum armor, about 44% of the hull you have in the fight) can cost a
casualty and hurt the hand; after the tune below only her salvo, unanswered, reaches it (about two times in five), and with the turret held back it never does. The numbers are
`FIGHT` and `FOE_TYPES` in `js/fight.js`.

A hired hand's Ice Hauler carries a close-defense turret (her second gun) and a launcher with two torpedoes (`js/hired.js`
setupHired), and the captain restocks the torpedoes from the ship's fund at a port with an outfitter (a save from before the
fitting, with no launcher, buys none). The two outfits take 6 t of her hold, so she carries 114 t, not 120.

Each type she can be has one threat, shown in her move, that "shoot her weapons" answers badly (the rework's design,
`docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md`, #808):

- **A raider** (one gun, fast) closes from long range and comes alongside to board while her lock is whole, on the fourth turn.
  Her 70 shields and 60 armor are 32 and 27 in the fight, and every gun at her hull cripples her in two or three turns, before
  she is alongside: a lone raider is beaten by hull fire, by the owner's choice (#814; at #808 she boarded it). Shooting her
  lock as she closes stops the board too; her drive (34) is slow to shoot away at range, where an aimed shot hits for a
  quarter (long) or 0.4 (mid), so aiming only at it is boarded about one time in four. The lock lesson is the pair's.
- **A corsair** (two guns, four torpedoes) arms a salvo of two on the first turn and every second turn after, and fires it the
  turn after; the board shows it a turn ahead. Holding the turret back that turn takes 60% off the salvo.
- **A navy cutter** (thick shields) gets 7% of her shields back each turn: torpedoes and every gun overcharged at her hull beat
  it; anything slower does not.
- **A destroyer** (a patrol's, three in ten) has no regeneration and no launcher until the fight ladder (PR 3) decides how she is
  met: the tool does not play one.
- **A raider pair**: two shown moves and fire from both, and two locks to stop. Every gun at the hulls is boarded every time;
  shooting the locks as they close wins.

Disarming her takes about three turns of fire (her weapons are 63 a mount), and she fires at your guns while they fire, so
the guns are a race too.

A hired gunner learns three moves from the crew (`FIGHT_MOVES` in `js/fight.js`, `docs/superpowers/specs/2026-10-23-gunner-moves-design.md`),
each ordered beside the guns and used once a fight: **vent** (the engineer teaches it) takes the heat to 0 and the locks off before
the shots; **lead** (the pilot) takes the range penalty off one gun's aimed shot; **split** (the first officer) lets the turret
held back for her salvo fire anyway. A move with nothing to act on is not spent. Each is taught on a burn as a downtime choice
(`MOVE_TEACH` in `js/gunnermoves.js`): vent and lead at gunner level 1, split at level 2, once the teacher trusts the hand
(`OPINION.TRUSTED`) and is aboard and unhurt. An owner is taught none.

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

`tools/fights.js` plays the ship fight and both deck fights over many seeded trials (`npm run fights`: 5 seeds of 200, a hired
gunner on Hester's ship with nine aboard) and reports, for the ship fight, the spread of ends by where the guns aim and by
matchup, and for the deck fights how often they are won and who is hurt, by crew, the post's level, the hand's policy and her
grade. It is run by hand and is not part of `npm test`; `tests/fights.test.js` checks the targets that matter (#786, R36). From
the run that wrote this section (after the final review's tune, #808):

- **The ship fight** (#814: `node tools/fights.js --seeds 1,2,3,4,5 --n 100 --ship-only`, 5 seeds of 100 pirates and 50 navy
  cutters for each gun policy, at `FIGHT.POOL` 0.45). The six fixed policies (`random`; `focus`, her weapons; `drive`, her drive
  then her weapons; `lock`, her lock then her weapons; `hull`, every gun at her hull; `hullhold`, the same with the turret held
  back on her salvo) fire the turret and the torpedoes at her hull; `answer` reads her shown move: it holds the turret back when
  she fires a salvo, aims at her lock while she closes or pins with it whole, against a ship whose shields come back sends the
  torpedoes and every gun the heat allows overcharged at her hull, against any other holds its torpedoes until her shields are
  down (a quarter or less), and else aims at her hull. Good ends are crippled, broken off and escaped; a lost fight is the captain running
  or the hull gone.

  | Against (good / lost / turns) | random | focus | drive | lock | hull | hullhold | answer |
  |---|---|---|---|---|---|---|---|
  | a raider | 88% / 0% / 4.8 | 0% / 0% / 4.0 | 76% / 0% / 5.5 | 0% / 0% / 6.0 | 100% / 0% / 2.3 | 100% / 0% / 2.4 | 100% / 0% / 4.8 |
  | a corsair | 10% / 80% / 7.8 | 0% / 0% / 7.9 | 5% / 94% / 7.8 | 0% / 97% / 7.9 | 99% / 0% / 4.7 | 100% / 0% / 5.7 | 100% / 0% / 7.5 |
  | a cutter | 21% / 44% / 6.3 | 0% / 0% / 3.0 | 0% / 10% / 3.5 | 0% / 99% / 8.0 | 0% / 0% / 3.0 | 0% / 0% / 3.0 | 100% / 0% / 5.3 |
  | a raider pair | 16% / 9% / 5.0 | 0% / 0% / 4.0 | 0% / 0% / 4.0 | 0% / 100% / 8.0 | 0% / 0% / 4.0 | 0% / 0% / 4.0 | 95% / 5% / 7.9 |
  | over every type | 32% / 38% / 6.1 | 0% / 0% / 4.7 | 18% / 30% / 5.2 | 0% / 77% / 7.5 | 49% / 0% / 3.5 | 49% / 0% / 3.7 | 99% / 1% / 6.2 |

  The rest of the ends: every gun at her hull, the turret held or not, cripples a lone raider every time and breaks a corsair
  off (92%), and is boarded by a cutter or a pair every time; aiming at her weapons ends in her getting away (a raider 32%, a
  corsair 97%) or a boarding; aiming at her drive is boarded by a raider 24%, by a cutter 90% and by a pair every time; random
  play is boarded 29% over every type. Random play loses 20% of the real armor a fight over every type (62% against a corsair,
  0.2% against a raider), and the hand is killed in 1% of random fights (2% against a corsair). The best fixed policy is hull
  fire against a lone raider and a corsair, and random against a cutter and a pair; none wins more than 70% against every type
  (hull fire wins none against a cutter); `answer` is at or above the best of them against each type, ties hull fire at 100%
  against a lone raider (the owner's choice, #814) and a corsair, and is well above all of them over every type (99% against
  hull fire's 49%). Against a corsair her lesson is the hull, not the fight (the owner's choice, #815): hull fire that ignores
  her salvo still wins 99%, but loses 12.4% of the real armor a fight against 2.1% with the turret held back, and each salvo
  it takes unanswered is a heavy turn for the crew. Her salvo is left as it is, since it is already the main source of the
  hand's hurts in the soak. A fight lasts 5.3 turns on the mean over every policy and type, and 14% of `answer`'s fights reach the turn
  cap (none against a raider or a cutter, 8% against a corsair, 64% against a pair; 97% over every type before the pool, at
  #808, when most of its wins were on points at the cap).
  A navy destroyer (three patrol stops in ten, and met only by a ship hostile with that navy) is not in the table: she is a ship
  to heave to for, not to fight (the owner's choice, #833), and the tool plays her as its own trials to show it. At three seeds
  of 100 no policy has more than 5% good ends against her (random play 5%, `answer` none). `answer` fights her to the cap
  until the captain runs (99%), and loses 55% of the hull a fight. Every gun at her hull or her weapons is boarded by her every
  time (a search and its fine). Heaving to at the contact (engage.js) is the way out, and it lifts the standing back to -10,
  above the -15 line that sends the patrols.
  The values, against Task 7's: every damage and part bar is about 0.7 of them, so that kills are slower and a raider's run to
  the knife is a race: your guns 8 to 14 (12 to 20), hers 7 to 18 (10 to 26), your torpedo 12 to 18 and hers 20 to 30
  (`SALVO_DMG`, split from `TORP_DMG`; both 30 to 45), her weapons 63 a mount (90), the drive 34 (50), the lock 7 (10), the
  launcher 10 (15), the cutter's shields back 7% a turn (an eighth); and since #814 both sides' shields and armor are 0.45 of
  the ship's. The rest are Task 7's. At #808, before the pool, `answer`'s every rule counted:
  without the lock it was boarded by every type every time; without the torpedoes and the overcharge the cutter beat it 75
  times in 100; without the turret held back a corsair beat it 4 times in 100, and the hand was hurt in 13% of the fights
  rather than 1%.
- **The gunner moves** (`node tools/fights.js --seeds 1,2,3,4,5 --n 200 --ship-only`, then with `--moves`, which gives the hand all
  three, or `--moves lead` and the like for one). With the moves come two more policies that use them without reading her move
  for it: `randmove` (random, with a random usable move each turn) and `eager` (her lock and then her weapons, the turret held
  on her salvo, and the first usable move at its first chance). The fixed policies order no move, so their rows do not change.
  `answer` (tools/answer.js) splits the turret on her salvo, vents when that frees a locked gun, leads an aimed shot where
  there is a range penalty, and against a ship whose shields come back runs every gun hot past the cap while vent is unspent.

  | `answer` against (good / hull lost / turns / at cap) | no moves | all three | the one move alone |
  |---|---|---|---|
  | a raider | 100% / 2.0% / 4.81 / 0% | 100% / 2.0% / 4.02 / 0% | lead: 100% / 2.1% / 4.01 / 0% |
  | a corsair | 100% / 5.6% / 7.42 / 5% | 100% / 3.8% / 6.18 / 0% | split: 100% / 4.2% / 6.57 / 0% |
  | a cutter | 100% / 0.0% / 5.32 / 0% | 100% / 0.0% / 4.88 / 0% | vent: 100% / 0.0% / 4.91 / 0% |
  | a raider pair | 94% / 7.0% / 7.92 / 62% | 98% / 2.3% / 7.73 / 60% | lead: 98% / 2.4% / 7.74 / 66% |
  | over every type | 99% / 3.2% / 6.21 / 11% | 100% / 1.9% / 5.53 / 10% | |

  Split against a corsair ends the fight sooner (7.4 to 6.6 turns, none at the cap); lead against a pair wins more (94% to 98%)
  and loses a third as much hull (7.0% to 2.4%); lead also cripples a corsair more often (19% to 42% of her ends), at a cost: alone it raises answer's hull lost against a corsair (5.6% to 6.3%). Vent against a cutter turns
  a break-off into a cripple: running hot while it can vent, `answer` cripples her 75% of the time (1% without), in 4.9 turns
  (5.3); without vent known, or once it is spent, the heat budget keeps every gun at or under the cap as before. With all
  three, `randmove` is good 36% and loses 44% over every type (random without them: 31% and 39%), and `eager` is good 1% and
  loses 77%: no policy with the moves beats `answer` against any type. In the soak (`npm run soak`, seeds 1 to 40, the soak's
  downtime picked at random) a chapter learns two moves or more 24 times in 40 and both level-1 moves 20 times; in the
  play-throughs (seeds 1 to 5, Hester) four of five learn vent and lead, and lead is used in four, split in one and vent in two.
- **The deck fights** (`node tools/fights.js --seeds 1,2 --n 200 --deck-only --groups party,level,grade,charge,setpiece,navy`, the deck
  test's own runs: tests/fights.test.js; each cell plays on its own stream, seeded from the run's seed and the cell's name, so a
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

## Open questions

None right now.
