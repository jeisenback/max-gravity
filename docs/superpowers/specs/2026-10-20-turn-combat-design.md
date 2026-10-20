# Turn-based combat: a board you read and act on

Status: agreed in conversation on 2026-10-20 (four sections, each approved). This is the design for the hired hand's fights, both the ship fight and boarding, in chapter 1. Whole-ship command for chapter 2 is deferred and noted at the end.

## Why

The fights work, but they read like a book:

- A raid is about 8 clicks: three decisions, each followed by a Continue screen.
- Each decision is one coin flip against a percentage printed on the label, and a paragraph of prose tells you what happened.
- The state that matters is hidden. The running edge is shown only as a word, and her hull is never shown.
- The ship's real stats (guns, shields, armor, outfits) only nudge the odds, by at most a fifth.
- Nothing is spent and nothing carries between beats.
- The lock fight is closer to tactics, but its tactic triangle is played against a hidden weighted pick, so it is mostly a guess. COMBAT.md's own figures show random play winning about 80% of the time.

The owner's vision (docs/superpowers/specs/2026-10-17-next-chapters-design.md) asks for "combat on a lidar view, turn-based with skill checks", and "hand to hand closer to a tabletop game". This design keeps the captain-and-crew fiction and the sensor board, and makes the fight a small tactics game played on them.

## What the player controls

In chapter 1 the player is the hired hand and controls **their post**. In the narrow build that is always the gunner.

- The captain flies the ship by visible rules.
- The crew act by visible rules.
- The player runs the guns in a ship fight, and in boarding moves and fights as one person, plus one order to a crewmate.

Whole-ship command, where the player makes every post's moves, belongs to chapter 2, when a main character is captain. It is out of scope here. The engine is built so that it is the same board with more of the moves handed to the player, with nothing to undo.

## Section 1: the turn loop (shared)

Each side has:
- **Two hull bars:** shields, which come back a little each turn, and armor, which does not.
- **A few named parts, each with its own bar.** On a ship those are the weapons, the drive and the lock. In boarding they are the deck sections.
- **In a ship fight only:** the range band, your heat, and the torpedoes left.

A turn:

1. **Her move is shown first.** It is chosen by simple rules that read the board, and the board shows what it is and how hard, for example "Broadside at your drive: 2 guns, 14 to 22 damage".
2. **The captain's move is shown.** It also comes from visible rules, so the player plans alongside it.
3. **The player gives orders at their post.** The heat each order costs shows as it is chosen.
4. **Fire.** Both sides act at once.
   - Damage is rolled within a range, with no pass/fail check.
   - A part brought to zero cancels or weakens what depends on it.
5. **One line goes into a short log under the board**, and the bars and the board update in place.

A fight lasts about 4 to 6 turns, at roughly one click per gun plus Fire each turn.

**The screen** is one combat panel in place of the stack of dialogs:
- the sensor board on top, with both sides' bars, her shown move and the captain's move;
- below it, the player's orders, the heat gauge and Fire.

The Continue screens and the odds labels go.

**Randomness** comes only from the damage within each range, drawn from the game's seeded dice, so pins and tests stay reproducible. Moves follow rules from the state. Choices always do what they say; only how hard they land varies.

**Text** is an opening line, one line per turn and a closing line, all kept as scene lines. The voice review (`docs/voices/review.md`), the editor and the pins all apply to them.

## Section 2: the ship fight

**Before the fight**, the contact screen stays a decision, as now:
- battle stations;
- burn to outrun;
- pay them off.

The gunner's warning burst becomes the player's first turn's shot instead of a separate coin flip.

**Parts on each ship:**
- **Hull:** shields and armor, from `SHIPS` and the fitted outfits (`js/data.js`). Armor plating (+40) and the deflector capacitor (+50 shields) show as longer bars.
- **Weapons:** sized by the gun mounts. Damage to them cuts that ship's shots per turn.
- **Drive:** at zero, the ship cannot change range. She cannot close to board, and you cannot run.
- **Lock:** her boarding clamp. At zero, she cannot board.

She can aim at your parts. Her shown move may be "at your drive", to pin you for a boarding.

**Your guns:**
- **Mounts.** Each gun mount fires once a turn at the part you pick, or holds.
- **Damage.** It is a base range; heavy rounds multiply it by 1.4, and gunner skill tightens and raises the range a little.
- **Range bands.** Long range hits less often and less hard, and close range hits hardest.
- **Heat.** Each shot adds 1 and 2 bleed off a turn. Over the cap (about 4, tuned), a gun is locked for the next turn.
- **Torpedo**, if a launcher is fitted: one large hit from the stock. Her close-defense turret can cut it down.
- **Close-defense turret**, if fitted: aimed like a gun, or held back to cut her next volley.

**Range** has three bands (long, medium, close; `js/range.js`). The captain's move decides which way it goes. The ships' speed and turning against each other decide whether it happens this turn or the next.

**Her moves**, chosen by rules from the board:
- broadside at a part;
- close;
- board, which needs close range and her lock intact;
- pin, which aims at your drive;
- break off, when she is badly hurt.

Her `close` fires at your hull as she comes (R24).

A veteran crew (her grade) hits harder and has longer bars, as now (`GRADE_HULL`, `GRADE_PUNCH`, `js/shipcombat.js`). A pack is two ships on the board, each with its own bars and its own shown move.

**The captain** plays by rules taken from the captain card's `nerve`:
- A bold captain closes when ahead and holds longer when hurt.
- A cautious one opens the range early.

**Ends**, all into the existing scenes:

| End | Leads to |
|---|---|
| Her weapons and drive gone | Crippled: the existing dead-in-space choice, to board her or let her drift. |
| She breaks off | The existing line. |
| She boards | The boarding fight (Section 3). |
| Your hull gone | The existing loss path: casualties, the hand hurt, the captain marking it. |
| You open past long range with her drive slower | You escape. |
| Six turns pass with none of the above | A standoff: the existing line and its hull cost. |

**Carried as now:**
- Armor damage stays on the ship.
- Casualties and the hand's hurt roll on turns where your armor takes a heavy hit, at the existing odds (`CASUALTY_ODDS`, `HAND_RISK`), instead of on each lost choice.
- A heavy turn is measured on the hull lost, shields plus armor, because the shields soak her volleys and armor alone would almost never be hit (R23).

## Section 3: boarding

**The board** is a cutaway of the deck: Lock, Corridor, Bridge.
- A longer ship has a side route (the cargo bay or the engine room) for going round, as the layout bonus does now.
- Each section shows both sides' heads and its cover pips (`fightStrip`).
- A side breaks at a third of its number, as now, and the line is shown on its count.

**Their move is shown**, for example "Four pushing into the Corridor", "Holding the Lock" or "Two going round through the cargo bay". This replaces the hidden tactic pick.

A veteran crew's cunning becomes the one place a shown move can lie. At a veteran grade the move is marked "may feint", and it does, at the existing `CUNNING` rate per grade.

**The hand is a fighter.** Each turn they:
- stand, or move one section;
- do one thing there:
  - **shoot**: sidearm damage to the boarders in that section;
  - **steady**: the existing ability, which thins them by one and gains no ground;
  - **cover**: the existing once-a-fight ability, which adds cover pips;
- give **one order to a named crewmate**, from the existing crew orders.

The rest of the crew hold their sections by visible rules.

**Kit.** The hand has a standard sidearm and suit with stats, so that shooting has numbers. Buying better kit is out of scope.

**A turn resolves** section by section. Where both sides stand, they trade losses from damage ranges: heads, plus cover, plus kit. A loss on your side is a named crewmate, by the existing casualty rules. The hand can be hurt in a contested section.

**Ends**, as now:
- They are broken, pushed out of the lock, or all down: you win.
- They reach the bridge: the ship is taken, by the existing loss path.

Boarding her ship is the mirror image: you push Lock, Corridor, Bridge on her deck, then the existing dead-in-space outcomes follow.

## Section 4: code, tests and delivery

**New:**
- **`js/fight.js`, the engine.** Pure functions that take the fight state and return the next state and the lines to show; they do not read `G`. It covers:
  - her move;
  - the captain's move (from nerve);
  - the crew's moves;
  - the turn's resolution: damage, heat, parts, range, sections;
  - the end check.

  Both kinds of fight use it, with different boards. It runs under `tests/nodecontext.js`.
- **`js/fightui.js`, the panel.** It reuses `js/board.js` for the sensor board, adding the bars, the shown moves, and the deck cutaway for boarding.
- **The fight state** lives where the voyage's state lives, so a save in the middle of a fight works as a raid's does now. Any new field on `G` is declared, with a comment, in the literal in `js/game.js` (`tests/gfields.test.js`). Both new scripts go into `index.html` in load order (`tests/globals.test.js`).
- **The words** (opening, turn lines, close) are scene lines.

**Rewired.** These lead into the new fight in place of the raid and the repel scenes:
- the contact screen's "Battle stations";
- the distress-call ambush;
- boarding her from dead in space;
- being boarded.

The fight's outcomes lead into the existing scenes.

**Retired**, once the new path is in:
- the raid beats (`raidScene`, `raidStep`, `raidClose` in `js/engagements.js`);
- the odds labels (`costNote`);
- `shipOdds` and its ratios;
- the lock fight's hidden tactic triangle (`js/boarders.js`).

The abilities (`js/handtohand.js`) and the crew orders carry into boarding. The owner's card duel (`js/duel.js`) is untouched; the owner game is parked (ROADMAP.md).

**Tests:**
- **Node tests for the engine:**
  - her moves follow her rules;
  - damage stays within its ranges;
  - heat locks a gun;
  - a part at zero cancels its move;
  - range moves by speed;
  - every end is reached;
  - a veteran's feint happens at its rate.
- **A browser test of the panel:** it draws the bars, takes the orders, fires, and reaches an end.
- **`npm run fights`** is rewritten to play the new engine and report the spread of ends. Tuning works against that spread, starting near today's: how often a fight ends crippled, broken off, in a standoff or boarded.
- **The pins** that cover raids and boarding change behavior on purpose. They are rewritten, and each diff is read.
- **The new files** go on the coverage floor (`tools/coverage-floor.json`).

**Delivery, in four pull requests, each green on its own:**
1. The engine and its node tests, not wired in.
2. The ship fight panel, wired into contacts, with the raid beats retired.
3. Boarding on the same engine, with the old lock fight retired.
4. Tuning with `npm run fights`, and the text pass through the voice review.

## Not in this work

- Whole-ship command (chapter 2, with a main character as captain).
- Buying better kit (a sidearm or suit beyond the standard one).
- New outfits.
- The economy retune (#779). Outfits will matter visibly after this, which bears on it.
- The real-time flight-combat engine, which stays retired for the hand (COMBAT.md).
- The owner's card duel.
