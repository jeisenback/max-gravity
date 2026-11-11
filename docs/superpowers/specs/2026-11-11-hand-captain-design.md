# Chapter Two: the Hand as the Co-op's Captain

Status: the owner's choices of 2026-11-11, and the code change that follows the amended `chapter-2.md`. It amends chapter two's piece 1 (`2026-11-07-chapter-two-start-design.md`, built).

## Why

In chapter two as built, the lender sends three of its four masters, the player picks one, and the master holds the bridge (`pickMaster`, `js/hired.js`). The player already makes every call (`ROLES.coop.decides` is true), so the master is a captain in name. The ship fight's captain's move comes from the master's card (`captainMove`, `js/fight.js`). The owner would rather the hand be the captain of the co-op's hull (2026-11-11).

## The owner's choices (2026-11-11)

1. **The licence: a registry endorsement.** The co-op registers the Ore Runner with a cheap registry that sells a master's endorsement, as Ines flies on one (`docs/bible/README.md`, decision 12). The members vote the hand to the bridge, and the hand takes the endorsement. It is legal on that registry's ships and worthless at the better ports. The same registration is the one Ines's endorsement needs (`chapter-2.md`), so one decision answers both.
2. **The masters are people in the war.** The pick at the start goes. Saran, Kessler, Mensah and Belanger are met through the fuel war, as Yelena and Ruben are, each pulling toward their side (`leans`). None of them is aboard.
3. **The fight: the captain's move plus the hand's own post.** Each turn the player chooses the range move (close, hold, open) as well as their post's orders. The rest of the crew act by visible rules, as now.

## What changes

### The fiction (bible)

Done in the documents (2026-11-11): `chapter-2.md` and the people sheets have the hand on the bridge on the endorsement of the registry Hester's ship sails under, six aboard, and the masters in the war. Saran commands a freighter on a Tycho charter, Kessler is on another of the co-op's hulls, Mensah is ashore at Ceres between bridges, and Belanger commands Ballast's convoys. The code follows those pages.

### The start (`js/hired.js`, `scene:chapter-two-start`)

- `goOn` no longer draws masters (`h.masters`, `masterDraw`). `chapterTwoStartScene` becomes the members at the ramp, the lender's letter (a licensed master, or a registry the house's insurer accepts), and the members' vote that puts the hand on the bridge under the endorsement. It has one choice, and its result names the registry.
- `pickMaster` becomes `takeBridge(st)`: the ship, the crew and the landing as now, with no captain person. `h.captainKey` and `h.captain` are cleared. `h.papers = ['endorsement']` is the first item of the papers layer (`progression.md`, layer 5). Nothing reads it yet but the hand's page, which names it.
- `finishedSave` and `masterPicked` read "has the hand taken the bridge" (`h.bridge`) in place of a master's key. A save from piece 1 with a master already picked keeps the master as a person ashore and goes on with the hand on the bridge, migrated once in `migrate()` (`js/menu.js`).
- `MASTER_CAPTAINS` stays in `js/captains.js` as the four people's entries, each with where chapter two puts them (`at: 'tycho-charter' | 'coop-hull' | 'ceres' | 'ballast-convoy'`), for the war's pieces to meet. `masterDraw` goes. `tests/masters.test.js` keeps their shape and drops the draw.

### No captain person in chapter two (`js/role.js`)

`hiredCaptain()` returns null in chapter two. It has 51 callers in 19 files, and each assumes chapter one's captain. The rule is the repo's: one question at the edge, no fork inside.

- `ROLES` gains `captain: 'npc' | 'you'`: `hand` is `'npc'`, `coop` and `owner` are `'you'`.
- A caller that needs a captain person asks `role().captain === 'npc'` at its edge and returns, or falls back as the owner game does today. It is not a second branch in its logic.
- The callers are found by the leak test (Testing), not by reading every one. The ones expected to matter are the captain's regard and memories (`like(cap, ...)` in `js/inspection.js`, `js/stakes.js`), the contact's entry line (`js/engage.js`), the raid's captain (`js/engagements.js`), the captain's chatter and scenes (`js/captains.js`), and the arrival notes (`js/hired.js`).
- Where a chapter one scene would ask the captain's leave, chapter two goes to the members' meeting in piece 3. Until then the player decides alone, as now.

### The fight (`js/fightui.js`, `js/fight.js`)

- `fightMoves(st)` takes the captain's move from the player's order when `role().captain === 'you'`, and from `captainMove(st)` otherwise. The engine is unchanged: it reads `moves.captain` as now.
- The panel gains three range orders beside the post's: Close, Hold, Open. Each says what it will do before Fire, from `nextBand`: "Close to medium, if she does not outrun you". Hold is chosen by default. With the drive at zero the three are shut, with the reason, as the engine already gives the drive no vote.
- The moves that bend the range (break-intercept, redline) are unchanged and still apply.
- The words are scene lines (`scene:fight`), pinned, and the owner edits them.
- `tools/answer.js` gains the range rule for a captain: close when ahead, open when behind and faster, else hold. `tools/fights.js --captain you` measures with it.

## Not in this work

- Any effect of the endorsement: berths refused at the better ports, inspections more likely under a cheap registry. That belongs to piece 2 (the work and the law).
- The masters' scenes in the war (piece 5, the squeeze).
- Orders to the other posts (whole-ship command).
- Chapter one, which is unchanged: Hester is captain and the hand runs their post.

## Testing

- **Node:** `roleOf` gives `captain: 'you'` for a chapter two record and `'npc'` for a hand; `takeBridge` sets `h.bridge` and `h.papers` and leaves no captain; `fightMoves` takes the player's range order in chapter two and `captainMove` in chapter one.
- **The leak test**, extended from piece 1's: a seeded chapter two loop (land, take a contract, burn with a fight, land at an inspecting port, trade) fails on any read of a null captain (a thrown error or an `undefined` in a scene's text) and on any chapter one captain scene.
- **Page:** "Go on" plays the new start, and its one choice lands the co-op at Ceres with the hand on the bridge; a piece 1 save with a master picked loads and goes on; the fight panel shows the three range orders in chapter two and not in chapter one, shut with the drive down.
- **Pins:** `scene:chapter-two-start` changes on purpose and is rewritten with the diff read; chapter one's pins do not move.
- **Soak:** `tests/distribution/fights.test.js`'s chapter two run, with the answer policy as captain. The first run measures, and the owner sets the bands.
- The full suite, `npm run test:editor` (the start scene's lines change) and the coverage floor where touched.

## Assumptions to confirm

- Six aboard in chapter two: the five members and Ines.
- Hold is the default range order.
- A piece 1 save keeps its master as a person ashore, not aboard.
