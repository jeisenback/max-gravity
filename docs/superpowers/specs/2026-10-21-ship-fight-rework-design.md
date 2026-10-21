# The ship fight as a puzzle with real risk, entered in a teaching order

Status: draft for the owner's review (2026-10-21). It builds on the turn-based fight (docs/superpowers/specs/2026-10-20-turn-combat-design.md) and keeps its board, its shown moves and its code. The deck fight is not in this work; it is the next piece.

## Why

The fight tool (`node tools/fights.js --seeds 1,2,3 --n 100 --ship-only`, after the x10) shows four problems:

| Gun policy | Typical end | Hull lost | Turns | Fights lost |
|---|---|---|---|---|
| Always her weapons | She breaks off (68%) or boards and loses (32%) | 0% | 3.7 | 0% |
| Her drive first | Standoff (81%) | 15% | 5.6 | 0% |
| Her lock first | Standoff (64%) or she breaks off (36%) | 11% | 5.3 | 0% |
| Random | Standoff (64%) | 12% | 5.3 | 0% |

1. **One right answer.** Shooting her weapons ends every fight at no cost.
2. **No danger.** No policy has lost a fight in 1,200 trials.
3. **Flat ends.** Most fights that are not won end in a six-turn standoff.
4. **No order.** A random draw can bring the raider pair before the first raider, so nothing is taught.

## The owner's choices (2026-10-21)

- The fight is a **puzzle with real risk**, after Into the Breach (the enemy's move is shown, and there are several answers, each with a cost) and FTL (each enemy type wants a different answer). About 5 to 8 turns, ending decisively.
- **The ship fight first**; the deck fight later.
- **Heavy but survivable** stakes: a lost fight costs cargo, a large repair bill, crew, and the captain's regard. The ship is never lost.
- **A scripted entry and a real fight.** Chapter 1 has a ladder of authored fights in a teaching order, each with a reason tied to the chapter. A few random contacts come in between, drawn only from the types already met. The fight itself is never scripted.
- **Claude drafts the entry scenes, and the owner edits them** in the editor.

## Section 1: enemies that need different answers

Each enemy type has a **signature**: one threat, shown in her move, that the plain "shoot her weapons" plan answers badly. Each threat has at least two good answers, and each answer costs something.

| Enemy | Signature | Good answers | What each costs |
|---|---|---|---|
| **Raider** (one gun, fast) | She pins your drive, then closes to board | Shoot her lock; or shoot her drive so she cannot close | While your guns are on her lock or drive, her volleys keep landing |
| **Corsair** (two guns, torpedoes) | A torpedo salvo, shown a turn ahead ("Torpedoes next turn: 2") | Hold the turret back that turn; or burst her launcher first | Holding the turret back costs a gun's shot; bursting the launcher needs heat you may not have |
| **Patrol cutter** (thick shields) | Her shields come back each turn (her own regeneration) | A torpedo to strip them; or every gun at her hull in one turn | Torpedoes are few and cost real money to restock; an all-out turn overheats and locks a gun |
| **Raider pair** | Two shown moves, and fire from both | Cripple one fast; or let the captain open the range | Taking her sister's full volleys while you work on one |

Changes to what a ship has:
- **Her launcher** is a part with its own bar on a ship that carries torpedoes (the corsair). At zero she cannot fire them.
- **Her shields regenerate** by a share of the maximum each turn, set per enemy type (the cutter's is high, the others' none). `FIGHT.SHIELD_REGEN` becomes a per-type value.
- **Disarming her is not free.** Her weapons bar is larger, so it takes about three turns of fire, not one. A ship with no guns left that escapes counts as a weak end ("she got away"), not a win.

## Section 2: every choice costs something

The hand's orders at the guns, beside what they are today (a target per gun, the torpedo, the turret):
- **Overcharge a gun:** more damage, two heat instead of one. Heat already locks a gun over its cap, so this is a trade between this turn and the next.
- **Aimed shots** at her drive, lock or launcher hit for less at long and medium range than a shot at her hull, so the captain's range move matters to where you aim. The board shows the figure as the order is chosen.
- **Torpedoes** are a stock, and restocking costs money (after the x10, enough to feel).
- **The turret** is either a gun or held back to cut her next volley (as today), and her torpedo salvo makes the choice matter.

Her rules stay visible and simple (`foeMove`), with each type's signature added in its order. The captain's rules (`captainMove`, by nerve) are unchanged.

## Section 3: stakes and decisive ends

- **No standoff.** When the turns run out (`FIGHT.TURNS`, raised to 8), the side that is worse off breaks off: if it is her, she flees hurt (the existing broke-off end); if it is you, the captain runs, and it counts as a lost fight.
- **A lost fight** (your armor at zero, or the captain running) costs:
  - **cargo**: she takes part of the hold, so a contract's pay is docked or lost (the existing short and lost deliveries, `contracts.js`);
  - **a repair bill** from the fund for the armor lost, at the yard's rate;
  - **crew** hurt or killed, at the existing odds on each heavy turn (`CASUALTY_ODDS`), and the hand's own hurt roll;
  - **the captain's regard**, as the existing mark.
- **The ship is never lost**, and the chapter does not end on a fight. The existing chapter endings stay as they are.

## Section 4: the fight ladder (a scripted entry, a real fight)

Chapter 1's fights come in a fixed order, each introduced by an authored entry scene:

| Step | Enemy | When (about) | Reason (drafted, for the owner to change) |
|---|---|---|---|
| 1 | Raider | First run on a lane outside Earth's space | A lone raider who reads the ship as an easy board |
| 2 | Corsair | After the first contract paid | A corsair who has heard the ship carries the bank's payment |
| 3 | Patrol cutter | After the captain's debt scene | A cutter sent to check the ship's papers, who will fight if the ship runs |
| 4 | Raider pair | Once the hand has the Ore Runner's price in sight | Two raiders waiting off the lane to the yard |
| 5 | A set piece | Near the chapter's end | Tied to the chapter's spine (the used Ore Runner, the bank), drafted with the owner |

- Each step is due once the one before it has been fought and the condition holds; the step's fight is the next contact on a burn (it replaces the random intercept roll when due).
- **Random contacts** still happen between the steps, at a lower rate than today, and draw only from the types already met.
- The lane ambush (`ambushScene`, every 60 days on a dangerous lane) and the old transit event (`Pirates Matching Course`) draw from the met types too.
- The entry scene is a scene like any other: lines in `js/hiredscenes.js` (or a storylet), read by `sceneSay`, played in the editor's preview, pinned, and put through the voice review (`npm run voices`).
- The contact choices stay (battle stations, outrun, pay them off), and the hand's own move at contact (`HAND_CONTACT`) stays.

## How we know it worked

Targets, set before tuning, read from the fight tool over many seeds:
- No single fixed gun policy gets a good end against every type. Against each type, the best fixed policy is a different one.
- A new policy in the tool that reads her shown move and answers it (`answer`) beats every fixed policy clearly.
- Random play loses about a quarter of fights or more, and loses real hull.
- A fight lasts 5 to 8 turns. Standoffs are gone.
- The play-through still reaches the chapter's end on most seeds (`npm run playthrough`), and the soak's pacing bands hold (`npm run soak`).

## Code, tests and delivery

- `js/fight.js`: the per-type signatures (data beside `FIGHT`), the launcher part, regeneration per type, overcharge and aimed-shot figures, the end at the turn cap. It stays pure and runs in plain Node.
- `js/fightui.js`: the new orders on the panel, and the lost-fight costs (cargo, repair bill) through the existing paths.
- `js/engage.js` and `js/engagements.js`: the ladder (what step is due, and the met types), and the entry scene before the contact.
- `tools/fights.js`: per-type reports and the `answer` policy.
- Tests: the engine in `tests/fight.test.js` (each signature and its answers, the turn-cap end), the panel in `tests/fightui.test.js`, the ladder's order and conditions, and the pins rewritten for the new lines.
- Delivered in PRs that each leave the game playable: (1) the engine and the panel, tuned with the tool; (2) the stakes; (3) the ladder and the entry scenes.

## Not in this work

- The deck fight (the next piece).
- Perks (they come after, and will hang off these orders).
- New outfits, and buying better kit.
- Whole-ship command (chapter 2).
