# Contracts: the captain's runs as freight

Status: agreed 2026-10-17 (the owner: yes to all three questions, with a longer chapter). Design for replacing the hired chapter's speculative planner (`planRun`, `js/hired.js`) with contracts: the captain carries other people's cargo, for a shipper with a name, by a day. Nothing here is built. The owner decides the open questions at the end before it is.

## Why

A hauler carries freight. The planner makes Hester a trader who knows every price in the system, so a thin port never exists, the ship never waits, and the hand's port days are an afterthought. Measured 2026-10-17 (ROADMAP.md, nights in port): planning on what she knows gave the waits a reason but cost the chapter 28 days, and the gap between what she plans on and what a run clears (half of it her own selling pushing the price down) is a number the hand cannot see. A contract puts the pay on the paper before she sails, gives the ship a reason to be at a port or to wait at one, and gives the hand's days ashore (jobs, the bar) their place in the rhythm: contract, burn, deliver, wait or the next contract.

## What a contract is

`{ shipper, good, tons, from, sid, planet, pay, due, hazard }`: a named shipper, a good and tons to carry, the port it goes to, the pay on delivery, the day it is due, and whether the lane is dangerous. The cargo is the shipper's: nothing is bought, the hold carries it (`st.cargo`, so a boarding can take it), and the shipper pays at the far end.

## The board

A trading port has a freight board, drawn each day (so a night in port can bring a contract) from the world:

- **What ships from here:** goods the port prices low or middling (`prices` in `js/data.js`), to a port in reach that prices them higher.
- **How many:** 0 to 2 a day, more at a big port (one with a yard or a mission board), fewer at a small one. About one landing in five finds the board empty.
- **Pay:** tons, days and a rate (`CONTRACT_RATE`, cr a ton a day), with premiums the world sets: a current rumor of a shortage at the far end (so the bar's rumors are worth hearing), raids on the lane (hazard pay, which a cautious captain marks down as `laneRisk` does now), a war (navy freight for a faction's ports).
- **Due:** the burn's days times 1.5 plus a few, as the owner's delivery missions have it (`generateMissions`, `js/game.js`).
- **Shippers:** the three powers' freight offices (the Compact, the Concord, the League), the named firms (the Tethys Shipping Consortium on Titan, Aquilon at Hermes Foundry), the co-ops and families of the small ports (Ironheart, Juno Commons, the Hollows), and the Rook's own. A shipper is a name on the paper and a line in the ledger first; standing with them is a later step.

## The captain's pick

She takes the contract that pays the ship most a day among the ones her hold can fill, with her card's stats as now: `trade` is how many of the best she may take one of (`TRADE_PICKS`), `nerve` marks a dangerous lane down (`laneRisk`). With the hand's money in hand she favors a port with a yard, as now. An ice run stays what it is, a contract of its own (`js/icerun.js`).

## Waiting and running light

An empty board, or one with nothing worth the fuel (`WORTH_THE_FUEL`, `js/stay.js`), is a wait: a night at a time, the board drawn again each morning, up to `RESUPPLY_WAIT` days. After that she runs light to the nearest port with a board and looks for work there (the `ballast` run, kept). She never waits at the port she signed the hand on at.

## Settlement

On arrival at the contract's port the shipper pays. Late is docked a tenth of the pay a day, never below half, and costs the captain's regard for the hand once if the hand's call cost the days (a bold call in a raid, an ice stage). Cargo lost to boarders is the contract lost: no pay, and the shipper remembers. The hand's share is of the pay (`HIRED_SHARE`), the wage as now, the hall's cut as now.

## The hand's port days

With waits in the rhythm, the days ashore are the hand's. The job board renews by the day, not the visit (`jobBoard`, `js/jobs.js`), and the jobs' pay and danger are re-read: a hurt on a job ashore should not carry the boarding fight's one-in-twelve death (measured 2026-10-16: jobs were the chapter's main danger at one a landing). The bar is as it is.

## Pay

The chapter's goal stays the used Ore Runner at about 19,000 cr in about 100 days of runs (ROADMAP.md item 1). `CONTRACT_RATE`, `HIRED_SHARE` and `HIRED_WAGE` are set from the soak (`tools/soak.js`, the runs and nights lines), not by hand: contracts pay the ship less a day than omniscient speculation did, and the waits add days, so the share or the rate goes up to meet the target.

## What goes

- Speculation in the hired chapter: `planRun`'s buying and selling, and the knowledge of prices it needed (`js/known.js`, landed 2026-10-17): a contract's pay does not depend on what she knows of a price. The rumors keep their use through the board's premiums.
- The run panel's sums for a cargo bought here; it says the shipper, the load, the pay and the day instead.

## What stays

The stay in port, the ice run, the errands (off), the jobs elsewhere put to the captain (they become a reason to take a contract that way), the ledger, the look back and the chapter's endings.

## Build order

Each step is a commit that leaves the suite green and the chapter playable.

1. **The board and the pick.** `js/contracts.js`: the draw (pure, from the port, the day, the world's conditions and the rumors), the shippers table, the captain's pick. `planRun` returns a contract run or a light run, never a cargo bought. Tests in plain Node for the draw and the pick, a browser test for the panel.
2. **Settlement and the deadline.** `settleRun` pays the contract, docks lateness, loses the pay with the cargo. The ledger and the look back read it. Pins: `trade-pin` (the plans), `scene-lines-pin` (the first officer's settling-up words).
3. **The wait.** The board drawn again each night (`passNight`), the light run after `RESUPPLY_WAIT`. The soak passes the nights and reports contracts: offered, taken, delivered, late, lost.
4. **The hand's days.** The job board by the day, the job hurt without the death roll, the pay re-read.
5. **Tuning.** The soak over seeds 11 to 30 for the rate, the share and the wage, until the chapter reaches the price in about 100 days with the waits in it; figures into ROADMAP.md.
6. **Shippers as people** (later): standing with a shipper, a shipper who short-pays, a contract from one side on a ship with the other side's hand aboard (`js/ties.js`).

## Open questions for the owner

1. The job board by the day and the job hurt without the death roll (step 4): agreed, or keep the jobs as they are and let the waits be bar nights?
2. Shipper names: the list above, or names from the world bible only (`docs/world/`)?
3. The chapter's length: about 100 days as before, or longer now that the days have more in them?
