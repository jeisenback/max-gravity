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

Two a rung, twenty a post. The first word of each is its id. Moves marked (taught) play their teaching scene on a burn as the gunner's do; the others take effect when taken.

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
| 4 | pd-watch | perk | The point defense answer in a raid never falls below even odds (`engagements.js`) |
| 5 | called-shot | move (taught by nobody: taken, it is known) | Once a raid, your own move is made at the rule's best odds |
| 5 | nerve | stat | Nerve up one |

**Pilot** (nerve)

| Level | Pick | Kind | What it does |
|---|---|---|---|
| 1 | cool-hand | edge solo 0.05 | A bold call of your own lands a twentieth more often |
| 1 | trim | perk | A burn you fly costs a twentieth less reaction mass (`burnFuel`) |
| 2 | break-intercept | move | Once a raid, the turn away opens the range by 20 km with no roll (`range.js`) |
| 2 | soft-hands | perk | An approach you fly costs no hull on a lost roll (the ice run's first scene, `iceStep`) |
| 3 | lane-sense | perk | A contact's plume is read one beat sooner: the raid opens 10 km farther out (`engage.js`) |
| 3 | long-legs | perk | Burns you fly are shorter by another twentieth (`travelDays`, on top of the post's perk) |
| 4 | nerve | stat | Nerve up one |
| 4 | brace | perk | A flee from a contact gets away a tenth more often (`fleeOdds`) |
| 5 | redline | move (taught by the engineer) | Once a fight, the drive past the redline: the range opens and she loses a pass |
| 5 | eye | stat | Eye up one |

**Engineer** (hands)

| Level | Pick | Kind | What it does |
|---|---|---|---|
| 1 | sure-hands | edge job 0.05 | A job of your post ashore or aboard lands a twentieth more often |
| 1 | cool-loop | perk | The reactor's heat limit is 5 higher (`heatLimit`) |
| 2 | hear-it-coming | perk | A part about to fail is named in the ship's log a day before its breakdown (`wear.js`) |
| 2 | patch | move | Once a fight, five points of armor back between passes |
| 3 | melt-return | perk | The ice run's melt goes to the tanks on every haul (the engineer's win in the third scene, always) |
| 3 | hot-start | move (taught by the pilot) | Once a raid, the hot drive opens the range by 20 km, not 10 |
| 4 | hands | stat | Hands up one |
| 4 | yard-eye | perk | The yard's estimate is a tenth less when you stand over the work (`repairs.js`) |
| 5 | bypass | move | Once a fight, a system the fight has knocked out comes back |
| 5 | wit | stat | Wit up one |

**Comms** (wit)

| Level | Pick | Kind | What it does |
|---|---|---|---|
| 1 | quick-word | edge word 0.05 | A word with the captain or an agent lands a twentieth more often |
| 1 | long-ear | perk | A burn's market rumor comes a day earlier and lasts a week longer (`addRumor`) |
| 2 | read-her | perk | The sensor board names her style on the contact, not the first pass (`board.js`) |
| 2 | spoof | move | Once a raid, a false transponder: she stands off a pass |
| 3 | far-price | perk | The port the captain plans for shows its real price at the planning, not a rumor's (`contracts.js`, the run panel) |
| 3 | fair-hearing | edge brawl 0.05 | A bar fight with nobody at your back goes your way a twentieth more often |
| 4 | wit | stat | Wit up one |
| 4 | open-board | perk | A shipper that knows the ship draws its board as for one it trusts (`boardStanding`) |
| 5 | parley | move (taught by the first officer) | Once a raid, a hail that ends it: she breaks off if the roll lands |
| 5 | hands | stat | Hands up one |

The words are a first draft for the owner to edit, as every line is. A move named here that the raid does not have yet (break-intercept, redline, patch, hot-start, bypass, spoof, parley, called-shot) is a new beat choice on the raid or the lock fight at its post, built in this piece as the gunner's three were built for the ship fight, each as one choice with a check and a win and a lose line; `COMBAT.md` gets a line each.

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
- The ship fight reads `career().moves` as now. The raid and the lock fight read it for the new moves: a known move is one more choice on the beat it belongs to, labelled `[Gunner move] Called shot`, usable once a fight (`spent` on the fight's state, as the ship fight keeps).

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
- One browser test per perk kind on the function it reads (trim on `burnFuel`, cool-loop on `heatLimit`, cover-eye on the lock fight, pd-watch on the raid, long-ear on the rumor, open-board on the board), each asserting the figure moved by the pick's amount and only with the pick.
- `npm run fights` and `tests/distribution/fights.test.js` with the new moves in the random player's hand: the targets in `COMBAT.md` hold, or the owner is told by how much they moved.
- The pins that play a hand at a post move where `roleSkill` now reads the hand: re-pinned once, the diff read.
- `npm run coverage -- --check`: `js/picks.js` and `js/moves.js` on the floor.

## Assumptions to confirm

- Five levels at 0, 12, 45, 110, 220 and 400 points.
- Two picks a rung, one taken, no respec; stat picks cap at 5.
- The ship's perks read the hand's level when the hand holds the post and nobody else does.
- The gunner's three moves are picks with the teaching scenes as they are; eight new moves are new beat choices on the raid or the lock fight, three of them taught.
- The table's names and words are the owner's to edit; the effects and their hooks are the design.
