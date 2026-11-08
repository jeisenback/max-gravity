# Post Ladders: Levels, Picks and the Ship's Perks

Status: draft for the owner's review, 2026-11-08. The first piece of `docs/bible/progression.md` (layers 2 and 3 for the four posts). Builds on the sheet and the one check rule (`js/sheet.js`, #679), the post points (`js/hired.js`), the kit (#683) and the gunner's moves (`docs/superpowers/specs/2026-10-23-gunner-moves-design.md`).

## Why

A level at a post adds a tenth to the post's rolls and opens a few marked choices, and for the gunner alone it lets a shipmate teach a move for the ship fight. The other three posts get odds and nothing else, the ladder stops at 3 inside one chapter, and the sheet's four stats never move. The level is a modifier, not a capability, and the hand's sheet is a background, not a character (the owner, 2026-11-08).

## What it does

- **Five levels** at every post, the later ones spaced for the later chapters.
- **A pick at every level**, one of two, taken at the port on your own page: a move, a passive, or a stat point.
- **The ship's perk is the hand's.** Holding a post gives the ship that post's crew perk at the hand's level, with no pick.
- **The gunner's three moves become picks** on the gunner ladder, taught as they are now.
- **The sheet page shows the ladder**: the rungs done with their picks, the next rung's two options, and a pick waiting when a level has landed.

## Decisions

### The ladder (`js/hired.js`)

- `SKILL_STEPS = [0, 12, 45, 110, 220, 400]`: five levels. The first three are as they were (about 0.7 points a day, so chapter 1 ends at 2); 220 is a hand who works at it through chapter 2; 400 is the later chapters. `skillLevel`, `skillStep`, `gainSkill` and the level note are unchanged in shape.
- The level note gains a sentence when a pick waits: "A pick waits on your page." The note is the only prompt; nothing opens on its own.

### Picks (`js/picks.js`, new, pure, loaded after `sheet.js` and before `hired.js`)

- `PICKS` is a table by id. A pick is `{ id, post, level, kind, name, text, ...effect }`:
  - `kind: 'move'`: a move for a fight, known once taken and taught (below): `move` (the id in `FIGHT_MOVES` or the raid's moves), `teacher` (`{ post }` or `{ role }`, as `MOVE_TEACH`).
  - `kind: 'edge'`: an edge on a kind of check, as a kit item adds one: `adds: { post | solo | job | word | brawl: 0.05 }`. Read by `handCheck` beside `kitEdge`.
  - `kind: 'perk'`: a named passive read by one place in the code: `perk: 'id'`. Read by `hasPerk(id)`.
  - `kind: 'stat'`: `stat: 'hands' | 'eye' | 'nerve' | 'wit'`, one point, to `STAT_MAX`.
- `picksFor(post, level)` returns the two picks of a rung in table order. `pickOpen(pick, career, { teacher, opinionOf })` returns true, or the reason it is shut: a move needs its teacher aboard with an opinion of at least `OPINION.TRUSTED`; a stat at `STAT_MAX` is shut ("Eye is as sharp as it gets"). No other gates in this piece.
- `takePick(career, id)`: appends to `career().picks` (an array of ids, lazy, kept by `careerOf` through the buy as `moves` is); a stat pick moves `career().sheet[stat]` by one; a move pick is "being learned" until its teaching scene plays (below). One pick a rung: `pickDue(career, post, level)` is the first rung at or below the level with no pick of its taken.
- `pickEdge(picks, kind)` sums `adds[kind]` over the taken picks, as `kitEdge` does; `handCheck` adds both. `hasPerk(picks, id)` says whether a perk pick is taken.

### The table

Two a rung, ten a post. The first word of each is its id. Moves marked (taught) play their teaching scene on a burn as the gunner's do and are known after it; the others are known when taken. Every move is a move of the turn-based ship fight (`js/fight.js`, `FIGHT_MOVES`), once a fight, offered beside the guns as the gunner's three are (`fightui.js` `moveChoices`); the fights' hooks named below are that engine's (the owner approved the table on 2026-11-08 with the old raid's words in some hooks; they are corrected here to the fights that exist).

**Gunner** (eye)

| Level | Pick | Kind | What it does |
|---|---|---|---|
| 1 | vent | move (taught by the engineer) | Vent the guns, as now |
| 1 | steady-eye | edge post 0.05 | Your own move in a raid or a contact lands a twentieth more often |
| 2 | lead | move (taught by the pilot) | Lead the shot, as now |
| 2 | cover-eye | perk | The cover you make in a lock fight is three points, not two (`COVER_MADE` for the hand) |
| 3 | split | move (taught by the first officer) | Split the turret, as now |
| 3 | marksman | perk | Your ship-fight gunnery counts a level higher (`fightui.js`, where the boresight adds one) |
| 4 | eye | stat | Eye up one |
| 4 | pd-watch | perk | A held turret takes half off her volley, not two fifths (`FIGHT.PDC_HOLD` for your side) |
| 5 | called-shot | move | Once a fight, the named gun's shot takes no aim penalty and rolls the top of its range (names a gun, as lead does) |
| 5 | nerve | stat | Nerve up one |

**Pilot** (nerve)

| Level | Pick | Kind | What it does |
|---|---|---|---|
| 1 | cool-hand | edge solo 0.05 | A bold call of your own lands a twentieth more often |
| 1 | trim | perk | A burn you fly costs a twentieth less reaction mass (`burnFuel`) |
| 2 | break-intercept | move | Once a fight, your vote to open the range stands this turn whatever her speed (`nextBand`) |
| 2 | soft-hands | perk | The ice run's approach costs no hull on a lost roll when you fly it (`iceStep`, the first scene, the pilot's choice) |
| 3 | lane-sense | perk | A contact's plume is read sooner: the fight starts 10 km farther out (`engage.js`, the range at contact) |
| 3 | long-legs | perk | Burns you fly are shorter by another twentieth (`travelDays`, on top of the post's perk) |
| 4 | nerve | stat | Nerve up one |
| 4 | brace | perk | A run from a contact gets away a tenth more often (`fleeOdds`, `fightui.js`) |
| 5 | redline | move (taught by the engineer) | Once a fight, at the long band, the drive past the redline: the ship is away this turn (the `escaped` end) |
| 5 | eye | stat | Eye up one |

**Engineer** (hands)

| Level | Pick | Kind | What it does |
|---|---|---|---|
| 1 | sure-hands | edge job 0.05 | A job of your post ashore or aboard lands a twentieth more often |
| 1 | cool-loop | perk | The reactor's heat limit is 5 higher (`heatLimit`) |
| 2 | hear-it-coming | perk | A part worn under the breakdown line is named in the ship's log the day it crosses it (`wear.js`, `BREAKDOWN_BELOW`) |
| 2 | patch | move | Once a fight, your armor back by a tenth of the fight's pooled maximum |
| 3 | melt-return | perk | Every haul home puts the melt in the tanks: 20 reaction mass at the home port (`iceHome`) |
| 3 | hot-start | move (taught by the pilot) | Once a fight, every shot this turn is overcharged at a plain shot's heat |
| 4 | hands | stat | Hands up one |
| 4 | yard-eye | perk | The yard's estimate is a tenth less when you stand over the work (`repairPlan`, `repairs.js`) |
| 5 | bypass | move | Once a fight, your drive's part is back to full, so a pinned drive votes on the range again |
| 5 | wit | stat | Wit up one |

**Comms** (wit)

| Level | Pick | Kind | What it does |
|---|---|---|---|
| 1 | quick-word | edge word 0.05 | A word with the captain or an agent lands a twentieth more often |
| 1 | long-ear | perk | A market rumor you hear lasts a week longer (`addRumor`) |
| 2 | fair-copy | perk | A contract's dock for lateness is half when you kept the paper (`latePay`, `LATE_DOCK`) |
| 2 | spoof | move | Once a fight, a false transponder: she fires no volley and no salvo this turn |
| 3 | clear-copy | perk | The dock broker's skim never lands on a run whose paper you kept (`skimOf`) |
| 3 | fair-hearing | edge brawl 0.05 | A bar fight with nobody at your back goes your way a twentieth more often |
| 4 | wit | stat | Wit up one |
| 4 | open-board | perk | A shipper that knows the ship draws its board as for one it trusts (`boardStanding`) |
| 5 | parley | move (taught by the first officer) | Once a fight, at the mid or long band, a word on wit: landed, every foe breaks off (the `broke` end) |
| 5 | hands | stat | Hands up one |

The words are a first draft for the owner to edit, as every line is. The eight moves the fight does not have yet (called-shot, break-intercept, redline, patch, hot-start, bypass, spoof, parley) are new entries in `FIGHT_MOVES`, each with its `canUse` condition and its effect in `resolveShipTurn`, offered as the gunner's three are; parley is the one with a roll (`handCheck('wit', skillLevel('comms'), 'post')`), the rest are sure once usable. `COMBAT.md` gets a line each, and `npm run fights` can give the random player any of them.

### The ship's perk is the hand's (`js/crew.js`)

- `roleSkill(role)` returns the hand's `skillLevel(post)` when the post that maps to the role is the hand's (`hired().post`, `POSTS[post].role === role`) and nobody else holds it (`postMode(post) === 'manual'`), else the holder's as now. So a gunner hand gives the ship the extra gun and the boarding odds, a pilot hand the shorter burns and the flee odds, an engineer hand the mass saved and the heat limit, a comms hand the slicer's odds. The mood rule and the spoofer's floor are unchanged.
- The pin tests that play with a hand at a post see the ship's figures move; that is the intended change, re-pinned once with the diff read.

### Taking a pick (`js/character.js`, the sheet console)

- The hand's own page gains a **Ladder** card: the post's five rungs in a row, each done rung naming its pick, the next rung's two picks as two short entries with a **Take** button (shut, with the reason, when `pickOpen` says so), and the rungs beyond greyed with their picks named. A rung with a level reached and no pick is marked "a pick waits".
- `Mods.action('pick', id)` takes it at the port only (`G.mode === 'landed'`, no dialog); the page re-renders; a move pick writes "Being learned" until its scene plays.
- Markup on the `h` helpers; a golden fixture `tests/fixtures/ladder.html`.
- Owner game parked: the card is drawn only for a hired hand (`if (!hired()) return ''`).

### Moves (`js/gunnermoves.js` becomes `js/moves.js`)

- `MOVE_TEACH` is read from the `PICKS` table (`teacher`), not its own table. `moveDue(career, levels, teacher, opinionOf)` returns the first taken move pick not yet known whose teacher trusts the hand; the teaching scenes are the gunner's three as they are, and one new scene each for redline, hot-start and parley (the pilot's, the engineer's, the first officer's), as scene lines in `js/hiredscenes.js`. A move with no teacher is known when taken.
- The ship fight reads `career().moves` as now for all eleven; `moveChoices` gains a label and a condition for each new one, and the engine spends it as it spends the three.

### Not in this piece

- Lines beyond the four posts, traits, papers, standing's spending (`progression.md`, layers 4 to 6 and the later lines).
- Gates by kit, record or another line (the table above needs none); the shape of `pickOpen` allows them later.
- Respecs. A pick is for the run.
- The owner's game.

## Testing

- `tests/picks.test.js` (node, `tests/nodecontext.js`): the table has two picks at each of five levels at each post, ids unique, every move names a teacher or none, every edge names a kind of `DIFFICULTY`, every stat a stat; `picksFor`, `pickDue`, `pickOpen` (a move with no trusted teacher is shut with its reason; a stat at the max is shut), `takePick` (one a rung; a stat pick moves the sheet), `pickEdge`, `hasPerk`.
- `tests/sheet.test.js`: `check` with a pick's edge beside the kit's.
- `tests/hired.test.js`: `SKILL_STEPS` to 400; the level note says a pick waits; `roleSkill` is the hand's level at the hand's post when nobody holds it and the holder's otherwise.
- `tests/ladder.test.js` (browser): the card at level 0, at a level reached with a pick waiting, after a take; a shut pick's reason; the golden markup; the action does nothing in a burn.
- `tests/moves.test.js`: `moveDue` over the picks; a move with no teacher is known when taken; a new move is offered once on its beat and spent.
- One test per perk on the function it reads (trim and long-legs on `burnFuel` and `travelDays`, cool-loop on `heatLimit`, cover-eye on the lock fight's cover, marksman on the fight's skill, pd-watch on the turret's cut, lane-sense on the range at contact, brace on `fleeOdds`, soft-hands and melt-return on the ice run, hear-it-coming on the wear log, yard-eye on `repairPlan`, long-ear on the rumor's days, fair-copy on `latePay`, clear-copy on `skimOf`, open-board on `boardStanding`), each asserting the figure moved by the pick's amount and only with the pick.
- `tests/fight.test.js`: each new move's `canUse` and effect in `resolveShipTurn`, pure. `npm run fights --moves` with the new moves in the random player's hand: the targets in `COMBAT.md` hold, or the owner is told by how much they moved.
- The pins that play a hand at a post move where `roleSkill` now reads the hand: re-pinned once, the diff read.
- `npm run coverage -- --check`: `js/picks.js` and `js/moves.js` on the floor.

## Assumptions to confirm

- Five levels at 0, 12, 45, 110, 220 and 400 points.
- Two picks a rung, one taken, no respec; stat picks cap at 5.
- The ship's perks read the hand's level when the hand holds the post and nobody else does.
- The gunner's three moves are picks with the teaching scenes as they are; eight new moves are ship-fight moves in the same engine, three of them taught.
- The table's names and words are the owner's to edit; the effects and their hooks are the design.
