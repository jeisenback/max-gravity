# Boarding on the deck plan

The deck fight played spot by spot through a ship's real decks: boarders on the Ice Hauler's tower, and our party on hers when we board
a crippled ship. It replaces today's deck fight (`js/fight.js` `resolveDeckTurn`, the section strip in `js/handtohand.js`
`fightStrip`, the panel in `js/fightui.js` `deckFightEvent`) for a hired hand. It stays turn by turn.

The design comes from the combat brainstorm of November 2026 and the boarding prototype it produced (`prototypes/boarding-spike.html`).
The prototype is a reference for how the fight plays and reads; none of its code is to be reused. Its companion spec is the ship fight on
the radar (`docs/superpowers/specs/2026-11-16-radar-ship-fight-design.md`); a ship fight that ends `boarded` opens this fight.

## Why

- The owner asked for a boarding redesign "that's a better UI experience", like the ship fight's.
- Today the deck is a strip of three or four abstract sections. The rules underneath are rich (two waves, the rush, the corsair's
  breaching charge and its setter, feints, the navy inspection), but the charge and the rush are explained only in text, so the fight
  reads as hard work.
- Fighting through the rooms the crew live in (the galley, the berths, the well between the decks) is something only this game has,
  and the burn view's layout of the tower already exists to draw on (`js/layouts.js`).

## The owner's choices (2026-11-16)

1. **The play surface is the ship's own deck plan** (over "the same sections, made readable").
2. **Spots in rooms, drawn on the cutaway** (over a fine grid in each room). Each room has a few named spots, and a spot's cover comes
   from what is really there.
3. **Prototyped and kept:** two waves, breaching charges with their setters, hatches in the well, the captain's standing order, one
   order a turn to a named crewmate, and every side's next move drawn on the ship before the turn is committed.
4. **Turns, not real time with pause** (2026-11-16): seeing every side's move before committing is the point, and a deck fight is short.
5. **Her own decks when we board her:** small layouts for the raider and the corsair, three or four decks each (2026-11-16).
6. **Option 1 for the build:** a new deck fight beside the old one, then the old one retired (2026-11-16).
7. **The captain is a figure on our bridge** (2026-11-16): she fights and can be wounded, but is not killed in the fight. Her loss
   stays today's roll when the ship is taken (`CAPTAIN_LOST`), and she counts among ours for holding the bridge.
8. **The turn caps rise for the longer decks** (2026-11-16): a repel to about 12 turns and a navy inspection to about 8, both tuned
   against the targets, replacing 8 and 5 (the 2026-10-27 ruling on the navy's cap). An inspection still withdraws before a search
   unless it pushes hard.

## Goals

- Every side's next move is visible on the ship before the hand commits, and after the turn it is clear why it went as it did.
- The charge, the waves, the rush and the well read on the ship without the log.
- Today's rules and lessons carry over: each party needs its own answer, and reading their move beats any fixed habit.
- The game stays playable at every step of the build.

## Non-goals

- Real time. The fight is turns.
- New rules beyond today's, other than what the decks themselves bring (spots, lines of fire, the well's hatches).
- Ship damage from the ship fight landing on rooms and degrading a post (FTL's model). It was raised in the brainstorm; it is not part
  of this work.
- Layouts for the navy's hulls: the hand never boards a navy ship, and their inspection only comes aboard ours.
- The owner game (parked). An owner who kept a post fights this way once the old fight is retired, as in the ship fight's spec.

## Anti-goals

- **A tactics game.** If a turn needs more than a move, an act and one order, or the hand has to manage every crewmate, it has failed.
- **Hidden rules.** If a charge blows or a rush goes through and the hand could not have seen it coming on the ship, it has failed.
- **Decoration.** If the rooms do not change what happens (where cover is, who can shoot whom, where the rush can go), it has failed.

## Constraints

- Hired hand only, written with no `hired()` fork inside its logic (CLAUDE.md); what the player may decide is asked of `role()`.
- The rules are a pure module that takes the fight's state and returns the next, reads no `G`, takes `rand`, and runs in Node through
  `tests/nodecontext.js`, as `resolveDeckTurn` does today.
- The decks are data in `js/layouts.js`, beside the hauler's; the fight reads them through its existing helpers (`layoutOf`,
  `layoutRooms`, `walkPath`).
- Classic scripts in one global scope, linked in `index.html`; new `G` fields declared in `js/game.js`.
- Desktop only, at least 1000 px wide (#937).
- Every new button is pressed by a test (#1327).
- The page is built on the view helpers (`js/views.js`); the words are in the game's voice (`docs/bible/voice.md`) as scene lines.
- The fight ends in today's ends (`deckEnd`: `won`, `taken`, `searched`) so that `repelSettle`, `assaultSettle` and `shipTaken`
  (`js/boarders.js`) work unchanged.

## Approaches

1. **A new deck fight beside the old one, then retire the old (chosen).** A new pure module plays the fight on spots, rooms and decks.
   Each of today's rules is restated on the decks. A new screen draws the cutaway, behind a setting, and the fight switches over when
   it meets its targets; then the old deck fight and its strip are removed.
2. **Keep today's rules with each deck as a section.** Cheaper, and most of the tuning survives, but movement and the rush stay deck
   by deck, so the spots the owner chose become mostly decoration.
3. **Replace `resolveDeckTurn` in one go.** Ruled out, as in the ship fight: one very large change, and every tuned target breaks at
   once with nothing to compare against.

## The decks

- **A spot** is a place a person can stand: a deck, a share of the deck's width, a name ("the galley table"), and cover from what is
  there, 0 to 2 (the prototype's values: an open doorway 0, a console or door frame 1, a table, bunk tier, bench, racks, the
  scrubbers or the reactor shield 2). Each room has two to four spots. Each deck has a **well spot** with no cover.
- **Moving:** a spot is joined to the next spot along its side of the deck and the innermost spot on each side to the well spot; well
  spots join one deck to the next. A move is one step: one spot along a deck, or one deck up or down the well.
- **A line of fire** runs between any two spots on the same deck, and between well spots one deck apart while the hatch between them
  is open.
- **Hatches:** one in the well between each pair of decks. A sealed hatch stops movement and fire through it. Our pilot and engineer
  can seal one from their posts (today's hatch order). A sealed hatch can be cut by the boarders: it takes them a turn and is shown
  ("CUTTING") on the turn they cut.
- **The Ice Hauler's spots** are the prototype's, on her seven decks as `js/layouts.js` has them: bridge (the helm, the nav station),
  galley and head, berths and lockers, gunnery and workshop, airlock and medbay, life support, engine and hold. They go into her layout
  as data (`spots`).
- **Her decks (new):** a raider's and a corsair's layouts in `js/layouts.js`, with spots, each with three or four decks: her lock,
  at least one deck of her crew's space between the lock and her bridge, and her bridge. The corsair carries marines, so she has an
  armoury or ready room where they muster. Room names and furniture are the builder's, in the voice of the bible.
- **Kit cover** (`kitCover`, `js/sheet.js`) adds to the spot of the one who carries it. A made cover (the cover ability) adds two
  points to the spot it is made on, as today it adds to a section, capped at 3.

## The turn

The order of a turn is today's, played on spots:

1. **Their move is drawn** before the hand commits: arrows for who moves where, lines for who shoots at whom with the odds, the charge
   boxed on its target with its setter ringed, a hatch being cut, and the next wave waiting at the lock with its count.
2. **Our crew's moves are drawn** from the captain's standing order, in blue.
3. **The hand chooses:** move one step (click a ringed spot) or stand; one act; one order to a named crewmate. Each is drawn on the
   ship in yellow, with its odds, and a "This turn" box says all three sides in plain words. When a charge is coming, it says how to
   stop it: hit the setter, or pull back.
4. **The turn resolves:** moves, then fire along the lines of fire, then the charge (if not stopped), then the wave (on its turn),
   then the end check.

**The hand's acts** (today's, on spots): shoot (at a spot in line of fire; from level 2 also one step further, as
`SIDEARM_REACH_LEVEL` today); the post's **steady** ability and **cover** ability (`FIGHT_ABILITY`, `js/handtohand.js`, at the post's
odds, the cover once a fight); **pull back** (one step toward our bridge, or toward her lock when boarding her, taking everyone of ours
at the hand's spot along, offered only when the hand did not move); **hold fire**. The prototype's "aimed shot" is today's steady
ability under its own name for each post.

**Orders:** one a turn to a named crewmate, as today (`crewOrders`, `crewOrderOdds`): their steady or cover ability, or, for the pilot
and the engineer, seal or open a hatch from their post. The prototype's "move" and "hold and aim" orders are added: move a named
crewmate one step, or keep them where they are when the captain's order would move them.

**The captain's standing order** (the captain on the bridge; an NPC): hold the well at a deck, push them back toward the lock, or fall
back to the bridge, chosen by nerve and the state of the fight. Our crew follow it. The hand can suggest a change once a turn, with
the odds shown, by the same rule as the ship fight's suggestions (trust, level, what the decks show, nerve).

## Today's rules, on the decks

- **Hits and wounds:** where two sides have a line of fire, each head rolls today's `CREW_HIT` against heads in line, cut by the
  target spot's cover but never to nothing; a hit wounds first and downs only when all there are wounded. The hand's shot downs the
  wounded first, by `SIDEARM_BY_LEVEL`.
- **Two waves:** half the boarders land at the lock first, the rest at the end of `WAVE_TURN`, shown waiting at the airlock's outer
  door; the break line counts the wave still to land.
- **The rush** (raiders): where the next room toward our bridge holds fewer of ours than half of them and the hand is not in it, they go
  through it, two steps in a turn. The hand standing in a spot they pass stops them there, and so does a sealed hatch.
- **The breaching charge** (corsairs, `CHARGES` a fight): set from a spot of theirs next to a spot of ours, on the spot of ours with the
  most heads, shown a turn ahead, never two turns running, never feinted. It blows at the end of the turn and downs one of ours there
  outright (`DECK.CHARGE`). It is stopped if ours downed or wounded one of theirs at the setter's spot that turn.
- **Feints:** at a veteran grade a push or a round may feint, at the `CUNNING` rate, marked "may feint".
- **The navy's inspection** comes only aboard ours: it pushes and holds, never rushes, charges or feints; each head put down costs
  `NAVY_STANDING`; holding our bridge is a search (`searched`); it withdraws at `NAVY_TURNS` and files its citation, as today.
- **Casualties and the hand:** a head of ours downed is a named casualty at `CASUALTY` (0.5 boarding her); the hand at a contested spot
  rolls today's hurt (`REPEL_HURT.lose` times `SUIT`); a friend takes the first hit meant for the hand once a fight; who stands with the
  hand is `repelCrew`'s choice, as today.
- **Ends:** repelling, won at or under the break line or all down, taken (searched, for the navy) when they hold our bridge's spots
  with none of ours there; boarding her, won when ours hold her bridge's spots with none of hers there or she is at her break line,
  taken when none of ours are left. At `DECK.TURNS` (about 12; the navy's at `NAVY_TURNS`, about 8) the attackers withdraw: a repel is won, an assault
  lost.
- **Numbers** stay `DECK` and `DECK.ASSAULT` where they still mean the same; spot cover replaces the section cover of `fightCover`.

## The page

- **The cutaway** fills the scene: the ship's decks in section, nose up, the well and its hatches, every spot with its cover bars,
  every figure on its spot (ours in blue with their names, theirs in red, the hand in yellow), wounded figures marked.
- **Before the turn:** their arrows and lines (red, dashed for moves), the CHARGE box and SETTER ring, CUTTING on a hatch, "+n LAND
  THIS TURN" at the lock, our crew's moves (blue), and the hand's choices (yellow): the reachable spots ringed, the shot's line with its
  odds, a dashed "TO SEAL" on an ordered hatch.
- **Side panel:** the "This turn" box at the top; the hand's act as radio-style choices with odds; the order as a crewmate and what to
  do; the captain's order and a suggestion button with its odds; then the count of each side and the break line, and the last turn's
  events in a few lines, with the full log folded. The Fight button commits the turn.
- **After the turn:** what happened stays marked on the ship for the next turn (who was hit, where the charge blew or was stopped).

## What carries over and what does not

- **Kept as they are:** the entries (`fightBoarded` from the ship fight, `deadInSpaceScene` and the assault, `js/boarding.js`),
  `repelCrew`, the settles and their costs (`repelSettle`, `assaultSettle`, `shipTaken`, the citation), the scene lines of the
  abilities and the orders.
- **Retired with the old fight:** the section strip (`fightStrip`), the section cover by ship size (`baseCover`), and the fixed chain
  of sections (`DECK.SECTIONS`, `ADJ`, `FORWARD`, `BACK`, `REACH`).

## Code and delivery

- **The decks as data:** spots for the hauler, and the raider's and corsair's layouts with spots, in `js/layouts.js`, with Node tests
  that every spot is reachable and every room has its spots.
- **A new pure rules module** for the deck fight on spots (name left to the builder), with Node tests for each rule above.
- **A new screen** for the page above, on the view helpers, behind a setting that chooses which deck fight a boarding opens (default
  the old one until the targets pass).
- **The fight tool** (`tools/fights.js`) and the soak (`tests/distribution/fights.test.js`) get the new deck fight beside the old.
- **Retirement:** when the targets pass, the old deck fight, its strip, its setting and its tests are removed, and `COMBAT.md`'s deck
  fight section is rewritten. `prototypes/boarding-spike.html` is deleted and `prototypes/README.md` updated (removed with the folder
  if the radar fight's retirement already removed the others). The soak's check that the navy's cap sits in 4 to 6 turns
  (`tests/distribution/fights.test.js`) moves to the new cap's range, about 8.
- **Delivered in steps that each leave the game playable:** (1) the decks as data; (2) the rules module; (3) the screen, behind the
  setting; (4) tuning against the targets and the soak; (5) the switch-over and the old fight's retirement.

## How we know it worked

Today's deck-fight targets (`tests/distribution/fights.test.js`), restated for the new fight and measured with the fight tool:

- **Against raiders:** the answer (reading their drawn move) wins a repel nine in ten, the level counts, and no fixed plan beats it;
  boarding her is a short risky push it wins.
- **Against a corsair's charge:** the answer wins a repel nine in ten and boarding her; no fixed plan beats it; boarding her, the charge
  is the puzzle (the answer clearly beats the same answer that ignores the charge).
- **Against the navy:** the answer holds them at half the standing shooting costs and wins nine in ten; random play costs more.
- **No fixed plan** wins seven in ten against every party with two crew, and random play loses a quarter of its fights.
- **The rooms matter:** a policy that uses cover and the well beats the same policy played as if every spot had the same cover.
- **The hand is hurt** about as often as today (about 9 in 100 a fight), and casualties a fight stay near today's.

## Calls made in writing this (for the owner to check)

- **The post abilities stay the hand's acts** (pick off a runner, covering burst, cycle a hatch, cut the lights, and the others),
  because they are tied to the post sheets and the ladders. The prototype's "aimed shot" and "make cover" are those abilities.
- **Two orders are added** from the prototype: move a crewmate one step, and hold a crewmate where they are.
- **Suggestions** to the captain use the ship fight's rule, and, as there, read regard without changing it.
- **If a target cannot be met by tuning,** the switch-over waits and the gap goes to the owner as a design question.
- **Each person fires alone,** as in the prototype. Every figure is one person (ours named, theirs counted), wounded by a first hit and
  downed by a second. Each picks one target spot in line of fire: theirs and our crew the nearest of the other side, unless the
  captain's order or the hand's order names one; the hand chooses. A shot hits at odds set by the shooter's level and the target spot's
  cover, and the red and yellow lines show those odds. Today's `CREW_HIT` tuning does not carry over; the targets do.
- **Two sides never share a spot,** and a spot holds three people at most. Stepping onto a spot the other side holds is not a move.
  "Contested" for the hand's hurt roll means a shot of theirs is aimed at the hand's spot that turn.
- **When we board her** the captain gives the order over the intercom from our ship: push for her bridge, hold where we are, or pull
  back to her lock. The hand suggests to that order the same way.
- **Hatches:** sealing or opening a hatch is an order to our pilot or engineer, worked through the ship from wherever they stand, at
  `crewOrderOdds`. It hurts no one and does not stop a charge. The pilot's steady ability (cycle a hatch on them) stays as today's: it
  downs or wounds one at a spot next to a well hatch, and counts at the setter. Boarding her, her own crew may seal her hatches against
  us, and ours cut them as hers cut ours.
- **The rush moves two spots in a turn** along their path toward our bridge, where the next spot on that path is held by fewer of ours
  than half of them and the hand is not on it; the hand's spot or a sealed hatch on the path stops it. Boarders head for the bridge and
  only go below the lock deck to get round a sealed hatch if no other path is open.
- **Any other hull boarded** uses the raider's layout; the navy's hulls are never boarded by a hand.

## Left to the builder

- Module and file names, and the shape of the rules module's state.
- The raider's and corsair's room names, furniture and spot positions, within the rules above.
- The exact numbers, tuned against the targets.
- How the cutaway is drawn (the burn view's room drawing, `js/rooms.js`, is the place to start) and hover behaviour.
