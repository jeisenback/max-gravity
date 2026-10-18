# Chapter two: the owner's role, and the crew who came along

Status: proposed 2026-10-17, for #685. The scope, the first ship item and the opening are settled by the owner (thin slice; the valve keys and the carrier license both change something; chapter two opens straight from the buy). What is open is at the end. Part of the next-chapters design (`2026-10-17-next-chapters-design.md`).

## What chapter one leaves

`buyIn` (`js/hired.js`) sets `st.hired = null`: the captain stays a contact, the friends who came stay aboard, the ship is a fresh one, and the game is the owner's. In the shipped build (scope `earth-hired`, `js/build.js`) the owner's screens are off (`scopeOff('owner')`), so nothing plays after the closing scene. In scope `full` the parked owner game plays: trade screens, outfitter, company, card duel.

Everything the next chapters built lives on `st.hired`, which the buy throws away: the sheet (`h.sheet`), the kit (`h.kit`), the shippers' standing (`h.standing`), the ledger, the post and its skill. So a second chapter that keeps "the crew, the sheet and the standings" needs those to outlive the buy before it needs anything else.

## The slice

The same save carries on. The player is the captain, the crew who came along sit at the posts, the contracts board is the player's to pick from, and two arc items change the ship or the board. Trade screens, the company, the outfitter and the card duel stay parked.

### 1. The role object (`js/role.js`)

A small object answering the questions the forks ask today (#575): `canTrade()`, `decides(ev)`, `paysFor(kind)`, `visibleTabs()`. One implementation for the hand, one for the owner. `role()` reads one field of the save. Pure where it can be: it takes the save's record and returns answers, so it runs in plain Node (`tests/nodecontext.js`).

No fork is added to the hand's code. The forks that exist and belong to the question move onto it as they are opened: `OWNER_TABS` and `OWNER_ACTIONS` (`js/hired.js`, read in `js/bridge.js` and `js/ui.js`) first, `hiredCall` (the captain taking an event's call) second. The other 300-odd `hired()` calls stay; the count stops growing and the ones this slice touches go down.

### 2. The career outlives the buy

The sheet, the kit and the shippers' regard are copied at the buy into `st.career` (`careerOf`, `js/sheet.js`), with the hand's own field names. `career()` (`js/hired.js`) returns the hand's record while there is one and the career after it, so what reads a sheet, a kit or a shipper's regard asks `career()` and not `hired()`: `handStat`, `handCheck`, `addKit`, `moveStanding`, the lock fight's cover. Nothing moves off `st.hired` in chapter one, so no save is rewritten and no old-save shim is needed; a save with no career has none, which reads as a sheet at the base, no kit and no regard. The post and its skill are not in the career: whether the player keeps a post is open question 2 below, and they join it when that is answered.

### 3. The board is the player's

Step 3 is two pieces, each its own PR. **3a, the board** (`js/ownerboard.js`): in chapter one the captain's planner picks a run from the board (`planRun`, `currentPlan`); in chapter two the board is a section of the Port page, the same day's draw (`contractBoard` reads `career()`, so it is the one the hand's captain would see), with a Take button on each contract. Taking one loads the shipper's cargo at no cost, sets the course, and has the pilot take the ship out if one is crewed (the existing autopilot order). The run is kept on the career. On the landing at its port the shipper pays the player's credits, docked for lateness and short or lost loads and less a dock broker's skim, and its regard for the ship moves (`moveStanding`, the career's). The late-delivery agent scene and the ledger are the hand's for now; the owner gets a note. **3b, the post:** the player keeps a post (settled by the owner), so the post and its skill join the career and `skillXp`, `skillLevel` and `gainSkill` read it: a post the owner takes by hand rolls on the level, working it teaches it, and a delivered contract teaches the player's own post. Using the post's moves in the lock fight is built (see COMBAT.md); the owner's raid in beats is #721; the hand-only jobs ashore stay the hand's.

### 4. Two arc items change the ship and the board

- **The valve keys** open the Pump-crew coolant bypass in the outfitter: +60 reaction mass for no cargo space, 1,500 cr, listed only for a ship that holds the keys (`OUTFITS.pump` names the kit item in `kit`). A small, visible change to the ship that is on no plain list.
- **The carrier license** is read by the Compact Freight Office (`board` on the item): for a ship it already knows (regard 1), its board is drawn as for one it trusts, which is more contracts a day and a tenth more pay (`boardStanding`, `contracts.js`).

Both are data on the item or the outfit, read where the ship's stats and the board are built. (Done, #685 step 4.)

### 5. The spine and the opening

No new scene. The closing scene already reads who came (`CHAPTER_ENDINGS`). Chapter two's first screen is the board, with the crew who came along on the ship and, as the one question, the record of them: who is paid, who is owed, who wants out. The crew are the stakes; the board is the means.

## Order, one PR each

1. The role object, and `OWNER_TABS`, `OWNER_ACTIONS` and `hiredCall` moved onto it. No change in what plays. (Done, #706.)
2. The career record: the sheet, kit and standing carried across the buy. (Done, #708.)
3a. The board the player picks from, pay to credits. (Done, #709.) 3b. The player's post carried across the buy. (Done, #712.)
4. The two arc items: the retrofit and the Compact tier. (Done.)

Each is measured: the soak (`npm run soak`) for chapter two's pay against chapter one's, the fights tool for the retrofit if it touches combat, pins written again with the reason in the commit.

## Open

1. ~~What ends chapter two?~~ Settled by the owner (2026-10-17): the crew who came along. It ends 90 days after the buy, on the first landing, with a scene that reads whether they are still aboard (`js/chaptertwo.js`). The wages the owner pays keep them; no new economy. Done.
2. ~~Does the player keep a post?~~ Settled by the owner (2026-10-17): yes. The player's post is the one they may work in a fight or on a job ashore (the hand's moves stay), and the crew fill the rest. Built in 3b.
