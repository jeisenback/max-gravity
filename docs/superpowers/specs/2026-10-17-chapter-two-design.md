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

The sheet, the kit, the standings, the post and its skill move from `st.hired` to `st.career`, a record both roles read. An old save without it is built from its `st.hired` on load (the same shim as the sheet's own, `handStat`). The hand's code reads `career`; the fields only the hand has (the captain, the fund, the plan, the ledger, the pitch) stay on `st.hired` and go with it.

### 3. The board is the player's

In chapter one the captain's planner picks a run from the board (`planRun`, `currentPlan`). In chapter two the player picks: the board is the contracts page as it is (`js/contracts.js`, the sheet and standing already read), each contract with a Take button, the planner gone. The run itself (`settleRun`, the late and short paper, the shipper's agent, the side scene) is unchanged; the pay goes to the player's credits, not to the ship's fund, and the skim is the dock broker's as before. This is the "contracts stay the economy" line of the issue, and it is the part that proves the role object.

### 4. Two arc items change the ship and the board

- **The valve keys** open a pump retrofit: the ship can take the Hollows' pump-crew coolant bypass, an outfit that is not on any plain list and is offered only to a ship that holds the keys. What it does: a lower heat or fuel burn (to be set against the soak when built). This is the "an item from an arc changes the ship" line.
- **The carrier license** opens a Compact tier on the board: a contract or two from the Compact Freight Office that the board does not draw for a ship without the license, paying better and asking a standing of one.

Both are data on `KIT_ITEMS` (`js/sheet.js`, as `cover` is for the lock fight) read by the code that builds the ship's stats and the board.

### 5. The spine and the opening

No new scene. The closing scene already reads who came (`CHAPTER_ENDINGS`). Chapter two's first screen is the board, with the crew who came along on the ship and, as the one question, the record of them: who is paid, who is owed, who wants out. The crew are the stakes; the board is the means.

## Order, one PR each

1. The role object, and `OWNER_TABS`, `OWNER_ACTIONS` and `hiredCall` moved onto it. No change in what plays.
2. The career record: the move off `st.hired`, the old-save shim, the pins kept.
3. Chapter two opens: the owner role in the shipped build, the board the player's, pay to credits. Tests at scope `earth-hired` where the chapter now continues.
4. The two arc items: the retrofit and the Compact tier.

Each is measured: the soak (`npm run soak`) for chapter two's pay against chapter one's, the fights tool for the retrofit if it touches combat, pins written again with the reason in the commit.

## Open

1. **What ends chapter two.** Chapter one ends when the ship is bought (a number: 19000). The spine is the crew who came along, so the end is about them. A proposal: it ends at the day the last of them has been paid a full share and stayed (a fixed number of days, with a share set from the crew's regard), and it reads the record the way chapter one's ending does. Or by a credit target as before. Needs a decision, and can wait: PRs 1 to 3 do not depend on it.
2. **Does the player keep a post?** As a captain they no longer work one. The proposal: the player's post becomes the one the player may work in a fight or on a job ashore (the hand's moves stay), and the crew fill the rest. Needs a look at `roleSkill` and the boarding fights before it is set.
