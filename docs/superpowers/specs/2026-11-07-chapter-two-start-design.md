# Chapter Two, Piece 1: The Start and the Co-op's Role

Status: approved by the owner on 2026-11-07 (#891). The first of six pieces of chapter two's code; the bible is `docs/bible/chapter-2.md`.

## The six pieces

1. **The start and the co-op's role** (this spec): a finished chapter one goes on into chapter two, on the Ore Runner, with the player flying, trading and fighting her. Playable, with no votes yet.
2. **The work:** trading and non-combat play as a long-term way to play: the law by port (banned and taxed goods), inspections and bluffing, patrols and the zones of law, shortages in place of the price wobble, the kinds of work (corporate contracts, the Belt's small runs, smuggling, aid for the freeholds, trade), and standing as currency.
3. **The meeting:** the members vote on the runs, who joins, and the master; the board's Take goes through it.
4. **The books and the share:** what a run clears pays the loan and running costs, then the members; the hand's part pays down the share.
5. **The squeeze:** the war's prices and closed lanes, the lender's terms, Yelena and Ruben, remote prices over Ruben's band.
6. **The last vote:** hold, charter or sell, replacing `js/chaptertwo.js`'s close.

## What piece 1 does

At the end of chapter one the hand signs for the share (`signOn`, `js/hired.js`) and the game stops on the chapter-over scene. After piece 1:

- The chapter-over scene's one choice reads "Go on" and plays the chapter two start at the Ceres yard.
- The player picks the master from three the lender sends.
- The player is landed at Ceres on the Ore Runner, with the crew aboard and the contract board open, and can fly, trade on the exchange, take contracts and fight, as the co-op.

## Decisions

- **The hand's record carries on.** `signOn` no longer clears `st.hired`. The record becomes the member's: `h.chapter = 2`, with the post, skills, sheet, kit, standing and moves as they were, `h.share = { coop, buyIn, owed }`, `h.came` (who came), `h.signed` (the day). `career.finished` is no longer set by `signOn`. `chapterOf(st)` returns `st.hired && st.hired.chapter || 1`.
- **The ship** becomes the Ore Runner (`st.shipId = 'lightfreighter'`), fuel and armor full, `st.condition = { ...USED_CONDITION }`, no outfits or torpedoes, an empty hold, named "Ore Runner" (piece 2's first meeting names her).
- **Old finished saves** (a `career.finished` save with no `st.hired`) move to the same record when the player presses "Go on": the record is rebuilt from `st.career` (`careerOf` fields, `share`, `came`, `signed`).

### The co-op's role (`js/role.js`)

`roleOf(hand)` returns `ROLES.coop` when `hand && hand.chapter === 2`, `ROLES.hand` for another hand, `ROLES.owner` with none.

`ROLES.coop`:
- `canTrade: true`.
- `mayTab`: every tab but `company`.
- `mayAct`: every action but `buyship`, `cbuy`, `buyout`, `sellout`, `hire`, `interviewHire`, `dismiss` (`COOP_BARRED`).
- `decides: () => true` (the player makes every road event's call, as the owner).
- `paysFrom: () => 'credits'` (the co-op's fund is `st.credits` until piece 3).
- `mayDowntime`: the hand's rule.
- `canDie: true`.

### Chapter one stops at its edges

Each of these returns early when `chapterOf(G.state) > 1`, with one check where it starts and none inside:
- the savings target and the share offer (`HIRED_TARGET`, the used-ship offer, `buyInHtml`, `canBuyIn`);
- the captain's wage and pay day (the hand is not on a wage in the co-op);
- `chapterEnd` and the hand's close;
- the tutorial (`js/tutorial.js`);
- Hester's own scenes and the captain's arcs that name her ship.

The full list is found by the leak test (Testing), not by reading every `hired()`.

### The narrow build

`scopeOff('owner')` stays on for the owner game. Where the co-op needs a system it gates, the gate asks `role()`: the exchange tab (`shell.js`, `bridge.js tabReady`), the contract board (`ownerHasBoard` in `ownerboard.js` reads `role().canTrade && chapterOf(st) > 1` in place of `!hired()`), the shipyard's refuel, repair and outfits, and flying (`takeoff`, `plot`, `burn`, already on `role().mayAct`). The company, the stakes and outposts stay off.

### The masters (`js/captains/`)

- Four entries: `saran`, `kessler`, `mensah`, `belanger`, from `docs/bible/people/`. Each has what a `CAPTAINS` entry has (`first`, `last`, `pronouns`, `culture`, `home`, `age`, `traits`, `bio`, `wants`, `fears`, `captain` card, `wage`, `hears`, `bonus`, `talk`, `intro`, `chatter`, `sway`), plus `master: true` and `leans` (`'tycho'`, `'lender'`, `'kaur'`, `'ballast'`). No `xo`: the co-op's bosun is Cato.
- Cards: Saran `{ trade: 3, nerve: 3, thrift: 4 }`; Kessler `{ trade: 4, nerve: 2, thrift: 5 }`; Mensah `{ trade: 2, nerve: 5, thrift: 2 }`; Belanger `{ trade: 3, nerve: 4, thrift: 2 }`.
- `MASTERS` lists the four keys; the captain pool for chapter one (`captainPool`) excludes `master` entries.
- The draw: `masterDraw(rnd) -> string[3]`, three of the four keys, using the co-op's own seeded dice (`coopRand(st)`, seeded from the day signed and the hand's name, as ship life seeds its own), so the draw does not shift any other system's rolls.
- The pick sets `h.captainKey` and `h.captain` (a person record made from the entry, as Hester's is), and stores `h.masters` (the three sent) for piece 2.

### The crew (`chapterTwoCrew(st, h, rnd)` in `js/hired.js`)

- Who came stays aboard with their roles (Tomas engineer, Cato bosun in the `xo` slot, Ines pilot).
- Bexa joins in the `icehand` (deckhand) slot, and Pax as `gunner`, from `js/cast.js`, with their bible homes. The hand keeps the guns in a fight (`postHolder('gunner')` is the hand); Pax stands the gun watch in ship life.
- A berth left empty by someone who did not come stays empty (piece 2's "who joins").
- The master is not in `st.crew`, as the captain is not now.

### The start (`scene:chapter-two-start`)

A written scene at the Ceres yard, its lines in `hiredscenes.js` under its own key: the members at the ramp, the lender's letter with three names, each master's intro line, three choices (one per master), and a result with Ines at the pilot's seat. After it the player is landed at Ceres Station, the board drawn (`G.offers`), the Port page open.

### Fights

The hand's fights carry over as they are: the ladder (`fightladder.js`), the raid and its gunner's orders and the ambush (`engagements.js`), and the deck and lock fights (`boarders.js`). They read the master as the captain through `hiredCaptain()` and `captainEntry()`. The owner's duel stays parked.

### Last-seen prices

- On every landing with an exchange, `seenPrices(st, planet, day)` stores the exchange's prices as `st.seen[planet] = { day, prices }`, save data on the state (not a field on `G`).
- The Exchange shows, under each good, the best last-seen price elsewhere and where ("Pallas 412, 12 days ago").
- The map shows, for a hovered or selected system with a seen port, the age of what is known ("prices 12 days old").
- Only ports the ship has docked at are known. Remote prices wait for piece 4.

### Soaks

`tests/distribution/fights.test.js` and `tests/distribution/pacing.test.js` gain a chapter-two run (a chapter-two start, a fixed number of days on the board). The first run measures; the owner sets the bands from the numbers.

## Not in piece 1

The meeting and votes; the share's pay-down and the books; the war, the lender's terms, Yelena and Ruben; the last vote; multi-stop and saved routes; the owner's duel; hiring.

## Testing

- **Node:** `roleOf` for a chapter-two record (`mayAct` refuses each of `COOP_BARRED`, allows `plot`, `burn`, `buy`, `sell`, `refuel`; `decides` true; `paysFrom` `'credits'`); `masterDraw` gives three distinct keys from `MASTERS` and the same three for the same seed; `chapterTwoCrew` with everyone who came, and with Ines missing; `seenPrices` keeps the latest day.
- **Page** (earth-hired): a save at the share's signing goes on: "Go on" plays `scene:chapter-two-start`, a master is picked and is `hiredCaptain()`, the ship is the Ore Runner with Bexa and Pax aboard; a board contract is taken, flown with a forced fight from the guns, and paid into `st.credits` on landing. An old finished save (no `st.hired`) goes on the same way.
- **The leak test:** a seeded chapter-two loop (land, take a contract, burn with a fight, land, trade) fails on any scene key from chapter one's own scenes (the share offer, the chapter end, the tutorial, the captain's pay day) and on any wage paid to the hand.
- **Pins:** a new pin for `scene:chapter-two-start`; the chapter-over pin changes for its "Go on".
- **Soaks:** as above.
- The full suite, `npm run test:editor` (the scene list gains a scene), and the coverage floor where touched.

## Assumptions

- `st.credits` is the co-op's fund until piece 3; the hand's share stays at its owed figure.
- The player picks the master alone until piece 2 makes it the members' vote.
- Pax shares the guns with the hand; the Ore Runner keeps one gun mount (`SHIPS.lightfreighter.guns: 1`).
