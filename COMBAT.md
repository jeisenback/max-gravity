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
  story set pieces (#56).
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

In the hired-hand chapter a pirate contact is not the card duel. It plays as an authored raid in beats
(`js/engagements.js`): the closing, two passes, and the close. At each beat you choose how to meet her or do the
job of your own post, and each choice is a chance of going your way (+1 or +2) or hers (-1 or -2) on a running
position. At the close she breaks off, stands off and throws a last round, or comes alongside, and then the fight goes
to the lock (`js/boarders.js`): hold, rush, go round, or your post's job, with casualties. Measured over random-choice
play (`npm run fights`, below), about a quarter of raids end with her breaking off, 4 in 10 stand off, and 3 in 10 go to the lock, for 11% of the hull.
A decisive win (ahead by four or more) cripples her instead: she drifts, and you can board her. That is the same
lock fight run the other way (her lock, her corridor, her bridge, with the same tactics and your post's job), and a win
takes her strongbox for the ship's fund. Or let her drift, which is the same as breaking her off. Over random-choice
raids, about 1 in 20 cripple her, and a boarding is carried about two times in three.
A hired hand can also meet a distress call on a burn through unsettled space (pirates 0.25 or more at either end, at most once
in 60 days): seven in ten are a trap, and the rest are a real freighter that pays the ship's fund 500 cr. Each post has its own
way to read the call (scan her hull, read her drive, match her tumble, check her registry), which works at 50% plus a tenth
a level. Answering a trap blind springs it and starts the raid two behind. A good read lets you hit them first (the raid
starts one ahead) or turn away (the captain's regard and 2 experience), and shows a real call so you can help or leave it.
A hostile patrol is the same beats with guns (a navy stop): firing on her costs 8 standing with her faction, a clear win only
makes her break off with a warning (a navy ship is not boarded), and if she comes alongside her party is repelled the same
way, with a levy on the ship's fund if the bridge is lost. A hired hand can also heave to and let the ship pay a quarter of
its fund.
Who stands with you depends on the crew. One who cannot stand you (their opinion of you at the enemy mark) keeps to their
berth, and of two at each other's throats (the bond at which a split is on the cards) the one who thinks less of you will not
stand in the same section, so the line is a person shorter each time. A friend takes the first hit meant for you, once a
fight (so does someone who owes you one, from a watch you covered for them). The same goes for the repel fight and for boarding a crippled raider.
Bounties, hunters and an owner's fights are still the card duel above.

### Measured: `npm run fights`

`tools/fights.js` plays the raid, the repel fight and the assault fight over many seeded trials (5 seeds of 200, a hired gunner
on Hester's ship with nine aboard, against a raider) and reports how they close and who is hurt. The game is put back between
trials. It is run by hand and is not part of `npm test`. Figures from the run that wrote this section (`CASUALTY_ODDS` 0.4,
`REPEL_HURT` 0.45 on a loss and 0.15 on a win, `CUNNING` 0.25, and the boarders' lean in `BOARDER_LEAN` and `REPEL_LEAN`):

- **The raid**, random choices: she breaks off 23%, stands off 40%, is crippled 5% (boarded and carried 70% of the time), and goes
  to the lock 31% (held 63%). Hull lost 11%. Someone is hurt in 52% of raids, someone dies in about 1 in 11, and the hand is hurt in 35%.
  Always the post's own move: crippled 19%, hull 3%. Always the first general choice: no crippling, half stand off, 10% reach the lock.
- **The lock fight** (repel and assault give the same figures within a few points), random tactics, level 2, five standing with
  you: won 80%. By crew: one 43%, three 77%, five 81%. By the post's level (the post's move every round): 68%, 84%, 95%.
  By the foe's grade: 0 is 80%, 1 is 58%, 2 is 37%. Casualties per fight with five: 0.4 hurt, 0.2 dead, 0.15 marked (a main character),
  the hand hurt 14%, and someone or other hurt in 55% of fights. A grade 2 foe hurts someone in 78%. These are the intended cost
  of a fight and were left as they are.
- **Tactics are a lean, not a rule.** A raider's boarders rush a little more than they hold (38%, 30%, with going round 32%), and a
  corsair's hold a little more than they rush. Fixed over a fight against a raider, always holding wins 72%, always rushing 70%
  and always going round 89%, against 80% for a random mix. Going round stays ahead partly because the freighter is long and has room
  to go round (`layoutEdge`, +0.15 for going round and -0.1 for a rush). Before the lean was flattened (50%, 20%, 30%) always going round won 97% and always holding 49%, which left one dominant tactic.

The tool is how to check a change to the casualty odds, the lean or the layout bonus.

## Open questions

None right now.
