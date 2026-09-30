# Console combat: threat and answer

Design notes for rebuilding the gunner console duel (`js/duel.js`) on the model of
Wind in the Rushes: hidden plays, a deck built from what you carry, and an AI that
counts cards from public information. Boarding becomes its own duel. Nothing here is
built yet; numbers are starting values to be tuned by simulation.

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
- Torpedoes hit hardest (2 damage, half is 1). Gun runs do 1. A boarding run does no
  hull damage; it opens the boarding duel.

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

### Ending

This stays close to the current duel. The enemy hull track is 3 to 7 from its armor.
The fight is capped at 6 exchanges. You yield at 25% armor and pay to be let go.
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
  Your fighter is injured (the existing `st.injured`). If they were already injured,
  there's a rare chance they die: 15% to start with, halved with a healthy medic
  aboard.
- As now, a medic treats injuries for free after the fight. Otherwise the next port's
  clinic treats them.
- A crew death is permanent in every mode. It's rare by design.

### Losing the ship

If boarders take your Bridge:

- **Normal mode:** they strip cargo and a share of credits, then cut loose. You keep
  the ship.
- **Hardcore mode:** the ship is taken and the captain is lost with it. The existing
  legacy handoff (`js/legacy.js`, "lost with ...") passes the company to the heir. There's
  no reload.

## Hardcore mode

This is a new-game option, stored on the save and shown in the status bar. For now it
only changes what losing your bridge costs. Anything more waits until this has been
played.

## Build order

1. The ship duel: threat and answer with fit decks, replacing `STANCES` in `js/duel.js`.
   Update `tests/stations.test.js`.
2. The boarding duel: a new module, called from boarding runs and from `boardingFight()`
   in `js/boarding.js`.
3. The hardcore flag and the ship-loss outcome.
4. A headless simulation, like Wind's `tools/simulate.js`, to tune card counts, damage
   and death odds before release.

## Open questions

- Should a crew death stay possible in normal mode, or only in hardcore?
- Should escorts add cards to your decks (for example extra PDC screens)?
