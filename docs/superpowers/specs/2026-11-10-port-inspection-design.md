# Port inspections: the check moves from open space to the port

Issue #993. Agreed with the owner in chat, 2026-11-10 (option A, recorded on #993).

## Why

A player asked why the ship is fined, and whether they have any say in it. Today a navy cutter stops a burn in two ways:

- **The hostile navy:** at a standing of -15 or worse, there is a 60% chance of a stop on every burn (`planIntercept`, `js/engage.js`).
- **The chapter's fights:** the fight sequence has a cutter step once a chapter (`js/fightladder.js`).

Neither names a cause. The hired hand then decides whether the captain's ship heaves to and pays a quarter of the captain's fund (`heaveToFine`, `js/boarders.js`), and the captain blames the hand for it. This also contradicts the bible (`docs/bible/jurisdictions.md`): open space is policed by nobody in particular, and each port inspects ships on arrival under its own rules.

## Decisions

1. **The two cause-less stops go:** the hostile-navy cutter and the cutter step. The lieutenant's stop for a wanted crew member (`js/ties.js`) stays, because it already names its cause. The navy boarding fight (`js/boarders.js`) stays in the code, but no chapter-one path reaches it once patrol fights are gone. The parked owner game keeps it.
2. **Ports inspect on arrival.** Ports owned by the Arcology Compact, the Dome Concord and the Charter League inspect a ship on arrival. Independent and pirate ports do not.
3. **Two causes:**
   - **Bad standing:** the ship's standing with the port's owner is -15 or worse.
   - **A licensed good:** the hold carries a good that owner licenses for import, and the ship holds no licence. A licence cannot be bought in this version, so a ship never holds one.

   The existing customs scene for a wanted or exiled crew member (`customsScene`, `js/ties.js`) is unchanged.
4. **The hand's part is one move.** The captain pays from the fund. The hand may try one thing first, by their post.

## Licensed goods

One good for each owner, kept as data in `js/inspection.js` (`LICENSED`):

| Owner | Good | Why |
|---|---|---|
| Arcology Compact (Earth) | Medical Supplies (`medical`) | licensed pharmaceuticals |
| Dome Concord (Mars) | Water (`water`) | the dome companies sell the domes' water |
| Charter League (the Belt) | Machine Parts (`industrial`) | guild-made, and guild-protected |

## What it costs

- **Duty on a licensed good:** 15% of that cargo's value. The value is the tons in the hold times the good's base price (`COMMODITIES`), rounded to the nearest 100 cr.
- **Bad standing:** a fine of 6,000 cr, plus 2,000 cr for each full 5 points below -15, capped at 14,000 cr. At -15 to -19 it is 6,000; at -20 to -24, 8,000; at -35 or worse, 14,000.
- **Both causes:** one scene, one sum: the duty plus the fine.
- **Marked** (`js/traits.js`) raises the sum by a fifth, as it raised the old fine.
- **Who pays:** the ship's own purse (`moveMoney`): the captain's fund in chapter one, the co-op's in chapter two. The hand's savings are never touched.
- **The record:** each inspection that charges counts as a fine on the hand's record (`recordHand('fines')`), so Marked can still be earned by two of them.

## The scene

Its lines are `scene:inspection` in `js/hiredscenes.js`, so the scene editor lists and plays it. In order:

1. The inspector names the cause, or both causes: the standing on the owner's register, and the good with its tons and the licence the ship lacks. Then the sum.
2. The captain says they will pay it.
3. The hand's move, one of these, labelled with its odds as other bold choices are:
   - **Comms post: take the papers to the inspector.** Rolled on `soloOdds('comms')`.
   - **Any other post: speak up for the ship.** Rolled on the hand's post skill, one step harder (the `handCheck` pattern the trait doors use).
   - **Keep out of it.** No roll.
4. The result:
   - A success halves the sum, rounded to the nearest 100 cr. The captain notices: no change to their regard.
   - A failure leaves the full sum and costs a point of the captain's regard (`like(cap, -1, ...)`), with a memory line.
   - Keeping out pays the full sum, with no change.

A clean ship gets no scene: the arrival note gains one line, "Customs logs the ship through." It appears only at an inspecting port.

**When it plays.** The inspection is the first scene of the landing. It plays before the port's happenings and before the customs scene for a wanted crew member, if that is due too. It is queued from a `landed` hook, and then the landing goes on as now. It is chapter one's and chapter two's alike: a check about who pays goes to `role()`, not to `hired()`.

## The code

- **`js/inspection.js`** (new, after `js/ties.js` in `index.html` and in the editor's script list in `editor.js`). It holds `LICENSED`, the rules and the scene.
  - Pure functions that take the state they read and return a value. They run in `tests/nodecontext.js`.
    - `inspectionCause(st, port, gov, marked) -> null | { standing, good, tons, duty, fine, sum }`: what the inspector finds. Null for a port that does not inspect, or for a clean ship.
    - `standingFine(rep) -> number` (0 above -15).
    - `licenceDuty(good, tons) -> number`.
  - `inspectionScene(cause, planet)`, which reads `G`, builds the scene from the cause, and makes the hand's move.
- **`js/engage.js`:** remove the hostile-navy branch of `planIntercept` and the hired hand's `heave` choice. The owner's "pay the fine (40,000 cr)" choice stays for the parked owner game.
- **`js/fightladder.js`:** remove the `cutter` step from `FIGHT_LADDER`. Saves that have it in their ladder progress carry an id no step now has. Check that progress tolerates that; if it does not, add a line to `migrate()` in `js/menu.js` to drop it.
- **`js/hiredscenes.js`:** add `scene:inspection` and its index entry. Remove `heave.label`, `heave.result` and the `cutter` entry line (`scene:fight-entry`) once nothing reads them.
- **`heaveToFine`** (`js/boarders.js`) stays for the navy search, which the owner game can still reach.

## Testing

- **Node (`tests/inspection.test.js`):**
  - `standingFine` at -14 (0), -15 (6,000), -19 (6,000), -20 (8,000), -34 (12,000), -35 and -60 (14,000).
  - `licenceDuty` for each good.
  - `inspectionCause`: an independent port gives null; a clean ship at a League port gives null; water landed at a Concord port gives the duty; bad standing alone gives the fine; both give one sum; Marked gives a fifth more.
- **Browser:**
  - Landing at a Concord port with water opens the scene first, before any other scene of the landing. Its choices are the Comms move for a Comms hand, or the speak-up move for another post, and the keep-out choice.
  - A success charges half, a failure the full sum and a point of the captain's regard, and keeping out the full sum. The money leaves the ship's purse, not the hand's savings.
  - A clean landing at a League port shows the one note line and no scene. An independent port shows neither.
  - No burn plans a patrol any more, at any standing.
  - The chapter's fight sequence has no cutter step.
- **Existing tests to update:** those that expect the cutter or the hostile-navy stop: `tests/fightladder.test.js`, `tests/engagements.test.js`, `tests/fight.test.js`, `tests/fightui.test.js`, `tests/boarders.test.js`, `tests/hired.test.js`, `tests/playthrough.test.js`, `tests/editorfight.test.js`, `tests/editorlines.test.js`, and `tests/beatplay.js`. A test of the navy boarding fight that reached it through a patrol fight sets that fight up directly. Scene pins that change because the cutter is gone are rewritten with `npm run pin:from`, and the commit says why.
- **Soak:** `npm run soak`. The money and fights of a chapter change: one fewer fight, no navy stops, and inspections instead. The fights' distribution targets (`tests/distribution/fights.test.js`) and the pacing band may move. Any band that needs widening goes to the owner, not changed in passing.

## Not in this work

- Buying a licence, a licensed carrier, or a captain who plans around duty.
- Insurance and registries as causes.
- A contraband passenger at an inspection.
- What replaces the navies (the bible leaves it open), and patrol ship fights in a later chapter.
