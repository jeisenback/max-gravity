# The hired-hand chapter

Status: draft for review. Branch `ccr-56b9a0c9-x4nelr`.

## Context

The build is scoped to one chapter (`BUILD.scope` `'earth-hired'`, #137): an Earth hired hand, ending when they buy a ship and the crew who like them come along. This design makes that chapter good. It covers the ship you sign on to, who is aboard, the captain and the first officer, the economy, the ship you buy, and the order to build it in.

It builds on the life-and-loss foundation (`docs/superpowers/specs/2026-10-02-life-and-loss-foundation-design.md`) and the issues #128 to #142. The narrative issues (#128 and its sub-issues) stay paused until this chapter is done.

## Decisions

1. **The ship is an Ice Hauler** (`SHIPS.freighter`: 120 t, 10 berths, 1 gun), not the Ore Runner.
2. **The chapter is about 20 runs.** A run averages about 5.4 game days on the Ore Runner, so 20 runs is about 110 days. The slower hauler probably makes it 110 to 140. Everything is measured in runs.
3. **The ship you buy is a used Ore Runner at about 19,000 cr** (the Ore Runner is 28,000 cr new), found by Tomas. It is worn.
4. **Four captains and four first officers (XOs),** authored, from a small pool not tied to the start background. Each XO is written as a contrast to their captain. XOs are fragile: they can die.
5. **Captains and XOs are fixed authored people.** Their stats and styles, not random traits, drive what they do.
6. **The hired hand's pay and the economy are retuned** so that about 20 runs reach the used ship's price.
7. **Prose follows the grounded voice** (#136): show the gesture, cut the narrator's reading of it.
8. **Dormant, not deleted:** the Mars and Belt starts, owner mode, Yelena's pivot, the Mars and Belt casts, the storylines and the owner systems stay in the code and stay off (`BUILD.scope`).

## The ship and the roster

An Ice Hauler has 10 berths: about nine crew plus the captain, with the hand's own post among the nine. Whether the captain uses a crew berth is checked during the foundation work.

| Role | Exists today | Notes |
|---|---|---|
| Captain | Yes (a generated person) | Replaced by the authored captains below. |
| **XO** | New | `ROLE_NAMES.xo`. Authored, one per captain. |
| Pilot, gunner, engineer, comms | Yes (the four posts) | The hand holds one, Ines and Tomas hold two, one is generated. |
| Quartermaster | Yes | Generated. Manifests, rations, ice accounts. Owns the pay-statement events. |
| Medic | Yes | Generated. Treats injuries for free. |
| **Cook / steward** | New, narrative only | Generated. The galley is where most crew-life scenes happen. |
| **Ice hands** (two) | New, unskilled | Generated. No post. They fill the berths and give events someone ordinary to happen to. |

No bosun, no relief engineer or pilot. The hand can still only sign on to the four posts.

**Foundation changes.** The start ship becomes `freighter`. `castCrew` and `setupHired` build the roster above. `HIRED_FUND` (5,000 cr, which buys the cargo) rises to about 12,000 to 15,000 cr, otherwise the fund limits the cargo before the 120 t hold does. The hauler is slower (acceleration 100, top speed 200, against the Ore Runner's 150 and 250), so run lengths are measured again.

## The economy

- **Target:** about 20 runs to reach the used Ore Runner's price. Today a hand earns about 800 to 900 cr per run, so the hand's cut is tuned to about 950 cr per run even though the hauler's 120 t hold makes each run's profit about 2.4 times larger.
- **Measured with a soak,** the scratch script from the design discussion, committed as a script (not a test) for tuning. It reports runs, days and pay per run per seed. It is run per captain, and tuned until average pay per day is within about 15% across the four captains. Captains differ in texture and risk, not in who pays most.
- **`wantYard`:** the captain heads for a port with a yard once the hand's savings reach the cheapest ship for sale, 10,000 cr today. It uses the chapter's target price instead.
- **The Rock Hopper stays buyable** at 10,000 cr, as a way to leave too soon.

## The used Ore Runner and Tomas's deal

- **The ship** is a used Ore Runner offered in the hired buy-in list (`buyInHtml` in `js/hired.js`), at about 19,000 cr, with a starting condition set through the wear system (`js/wear.js`): drive 70, life support 65, shields 60, sensors 70, and fire control 45, close to breaking down. A bought ship is normally fresh, because `buyIn` clears the condition. This one is not. Owner shipyards are untouched.
- **The story:** it is the hull Tomas rebuilt three times for three owners who each sold her out from under him (his bio in `js/cast.js`). She is for sale again, cheap because the last owner let her go. He knows exactly what is wrong with her. It is his ambition, "one ship kept running properly for ten years", in one scene.
- **The beat** plays once, at a port with a yard, when the hand's savings reach about 55% of the price and Tomas is aboard.
- **The price follows how Tomas thinks of you:** about 17,000 cr when he thinks well of you, about 19,000 cr in the middle, about 21,000 cr when he does not.
- **Soft deadline:** the deal lasts a few weeks. If it lapses the ship is gone, and the hand falls back to the ordinary yard list. No further penalty.
- **If Tomas is not aboard,** a broker offers the same ship at the full second-hand price.
- The deal's text is written in the grounded voice.

## Captains

**Storage.** A new `js/captains.js` holds `const CAPTAINS = {}` and helpers. One file per captain and per XO (`js/captains/hester.js` and so on) assigns its entry. `tests/globals.test.js` is unaffected, since the files only assign. They are linked in `index.html` after `js/captains.js`. `setupHired` picks a pair with the seeded `pick` and stores `st.hired.captainKey`. The captain's person record is built from the entry, as `castPerson` does for the cast, so the generated fields nothing read (goal, wealth, secret, crime) disappear. **A hired save with no `captainKey` keeps today's generated captain.**

**An entry** has: first and last name, culture, home, age, two traits, pronouns, a bio, what they want and fear, captain stats (`trade`, `nerve`, `thrift`, 1 to 5), pay (wage, share), two numbers for how they take being challenged (`hears`, `bonus`), a weight for how much they talk (`talk`), chatter lines, an introduction, their wording for the four shared events, two scenes of their own, and a goodbye.

**The four captains**

| | Who | Wants / fears | Stats (trade, nerve, thrift) | wage, share | hears, bonus, talk |
|---|---|---|---|---|---|
| **Hester Vance** (she) | The ledger-keeper. A hand once, now owner of a ship mortgaged to the hilt. Speaks in sums. | To own the ship outright / being a hand again, and the bank taking her | 4, 1, 5 | 35, 0.10 | 1, 3, 0.7 |
| **Dov Adair** (he) | The warm talker. Collects favours and passengers, remembers your family's names. | To be liked and not alone on the bridge at night / silence, being found out | 2, 2, 1 | 50, 0.10 | -1, 0, 1.5 |
| **Imre Sato** (they) | The by-the-book ex-navy. Logs everything, says "Noted." | A clean record / a dishonorable discharge coming out | 3, 2, 4 | 45, 0.08 | 2, 3, 1.0 |
| **Zoya Pell** (she) | The chancer. Fast, funny, one big score from clearing her debts. | One run that pays enough to stop / stopping, and the people she owes | 4, 5, 1 | 25, 0.15 | 0, 2, 1.0 |

Wage and share are starting values, retuned by the soak to the 20-run target above.

**How stats drive behaviour** (reusing the stats the cast already has, #87):
- `trade`: how close to the best run the captain plans (`planRun`). At 5 always the best-scoring run, at 3 one of the top two, at 1 a random one of the top four.
- `nerve`: risk appetite in planning (whether lanes with a high pirate level or current unrest are accepted, and profit over safety), and the weight on fighting choices in `captainPick`.
- `thrift`: the fund level below which costly choices are avoided, 1,000 cr times `thrift` (today a flat 4,000, equal to a thrift of 4).

**Pay.** Wage and share come from the entry. Choosing "For the money" at sign-on adds 0.02 to the share, replacing today's flat override to 0.12.

**How they take being challenged.** `hears`: the opinion needed to be listened to when you disagree with an order (default 1). `bonus`: the opinion needed to be given a bonus when you ask (default 2). `talk` is a weight on the captain event group, so Dov turns up more and Hester less.

**Content per captain**
1. **Introduction.** Replaces "{cap}, whom the crew describe as {adj}" at the end of the sign-on paragraph in `js/signon.js`.
2. **Two scenes of their own.** *Trouble* (a problem on the ship: Hester's payment due, Dov's overdrawn fund, Imre's inspection, Zoya's creditor at the dock) and *secret*. They fire once due, through the same happenings filter the cast uses, with progress in `st.hired.beats`. The day thresholds are named constants, set after the soak, around day 25 and day 60. The secret is one scene with two readings by trust: at opinion 2 or more the captain confides, otherwise the hand finds out by accident and the captain is angry. Both give a choice, and both change the goodbye.
3. **The goodbye** plays after any main character's buy-in scene and before the closing "Your Own Ship" scene, which loses its generic handshake line. Its text has parts: an opening by warmth (warm, neutral, cold), a line if you took crew, a line if you learned the secret, a line if the XO died, and a parting sentence. It has two or three choices for how you leave, which set the captain's final opinion and carry to later meetings on the lanes (the captain stays a known contact through the existing buy-in code).
4. **The four shared events** (order, praise, dressing-down, favour). Their mechanics stay in `js/hiredevents.js`: the follow-up timers, the opinion checks and the chained "Terminal" scene. Each captain supplies their own prose for the text and every result. A piece a captain does not supply falls back to today's generic wording, so the pool can ship one captain at a time.
5. **Chatter.** Each captain's own lines replace the generic eight. The random trait chatter is dropped for authored captains.

**Pronouns.** Pronoun placeholders do not work (verbs change: "they say", "she says"). The roughly 30 lines in `js/stories/hired-aftermath.js`, and any in `js/hiredevents.js`, that refer to the captain with a pronoun are rewritten once to say "the captain" or "Captain {last}". Only the captains' and XOs' own authored text uses real pronouns.

## XOs

The XO is the hand's daily boss. The captain keeps money and ship-to-ship matters. The XO takes crew-side decisions and the watch, and decides post swaps. The hand holds two opinions, and a captain who likes you with an XO who does not makes a different run from the other way round.

| Captain | XO | Contrast | Wants / fears | Pivot |
|---|---|---|---|---|
| Hester | **Cato Rahman** (he). Big, calm, came up through the hold, knows every crew member's family. | Generous with time where she is generous with nothing. Covers for the crew against her rules. | A share of a ship, someday / the bank taking this one and the crew scattering | In the ice hold |
| Dov | **Ilsa Brandt** (she). Precise, dry, tired. Actually keeps the ship running. | Does the work while Dov gets the love. | Command, but will not take it from him / that he will never ask for help | At the reactor |
| Imre | **Pilar Quesada** (she). Self-taught hauler lifer, no certificates, knows the ship's real tricks. | Bends every rule Imre writes, and gets results. | To be respected, not "noted" / the day Imre's rules are used against her | A docking emergency at the helm |
| Zoya | **Ansel Whitcombe** (he). Older, careful, an ex-actuary who plans for the worst. | The brake on every one of Zoya's schemes. | To retire safely / Zoya's last big run taking them all | The one fight Zoya should not have picked |

Ilsa knows about the shortfall in Dov's books and has been quietly covering it from her own pay. It is exhaustion and loyalty, not betrayal.

**Content per XO:** an introduction, chatter, two scenes (their ambition, and what they know about the captain's secret), one conflict scene with the captain written per pair ("Two Orders": opposite orders to the hand), one pivot, and a parting line in the goodbye.

**Fragile.** An XO's entry is marked `fragile`. `js/fate.js` is generalised so that `castLiving` and `castFate` handle authored XOs as they handle the cast, with one difference: a fragile character is not protected by the two-survivor floor and does not count toward it. A death outcome for them stays a death. Deaths are therefore possible in play in this chapter without waiting for a third lasting main character (#129).

**The pivot** follows Yelena's "Over the Hull": the scene names the risk without numbers, the outcome follows game state (points for real protection, such as a medic aboard, hull condition and a second person), and the result goes through `castFate`: lives, marked, or dies. An XO's death or mark changes the captain's mood, the XO's line in the goodbye, and the memorial. The mark and the memorial are shown to the player (see below).

## Showing the record

A minimal version of #131 is pulled into this chapter, because XOs can now die: marks on the crew screen next to the character, the memorial as a list (who, when, where, the cause line), the cause text escaped, and an XO's death visible in the goodbye.

## Fate follow-ups folded in

With the fragile generalisation, these items from #135 are done together: ignore a character who never joined, protect the dead from registry pruning (`js/people.js`), and escape the memorial text.

## Build order

One PR each, in this order:

1. Name the opinion thresholds (#140). A pure refactor, done before new code reads opinion.
2. Authored characters skip the generic backstory (#139), made general: any authored person, so XOs inherit it.
3. The Ice Hauler foundation: ship, roles, roster, fund, pay and pacing, and the committed soak script.
4. The used Ore Runner and Tomas's deal.
5. The fragile generalisation of fate, with the #135 follow-ups.
6. Showing marks and the memorial (minimal #131).
7. Hester and Cato end to end: registry, selection, styles, introductions, events, scenes, goodbye, the pivot, and the pronoun-light rewrite. The voice check with the owner happens here.
8 to 10. Dov and Ilsa, Imre and Pilar, Zoya and Ansel, one PR each.
11 to 13. The prose pass over existing scenes (#136), by file, most-seen first: crew-life events (`js/family.js`, `js/social.js`), then the Earth cast scenes and hired events, then the rest.
14. Help topics and the README for the narrow build.

Then the paused narrative work (#128): pivots for Ines and Tomas, endings, later arcs, emergent injuries. #129 needs rewriting, since fragile XOs make deaths possible without a third lasting character.

Each step gets its own plan when it starts.

## Testing

- Every captain and XO entry is complete and has no emojis. Selection is deterministic for a seed. A hired save without a captain key behaves as today.
- Each style maps to the right planning and road behaviour. Scenes fire once and in order. The goodbye variants appear.
- A fragile XO's death bypasses the floor, does not count toward it, and writes a memorial entry.
- The soak: pay per day is within about 15% across captains, no plan comes back empty, no page errors, no broken text, across several seeds.
- The deal: Tomas's price follows opinion, the deadline lapses, the fallback broker appears when Tomas is not aboard, and the bought ship starts worn.
- The full-scope tests keep passing, since they run `?scope=full`.

## Open questions, settled at implementation

- Settled (#144): the captain is not in `st.crew` and takes no berth, so the roster is nine crew in ten berths. The XO's perk is flavour only (`ROLE_PERKS.xo`, no mechanics).
- Settled (#149): Imre's share is 0.07, not 0.08. At 0.07 the soak (10 seeds) gives about 106 days to the price against 100 for Hester and Dov, with pay per day 173 against 182 to 191. At 0.08 it was 92 days.
- Settled (#148): Dov's share is 0.08, not 0.10: his wage is higher and his runs longer, and at 0.08 the soak (10 seeds) gives Hester and Dov about the same chapter length in days (100 each) and pay per day within 5 percent. He reaches the price in fewer runs (about 15 against 19) because each run is longer.
- Settled (#145): the deal lasts `DEAL_DAYS` 56 (eight weeks), because from the 55% offer the hand needs about five to nine more runs; the soak (8 seeds) buys her in 15 to 21 runs, the slowest seed with a day to spare. The starting condition numbers are as above. Still open: the scene day thresholds.
- Settled (#144): `HIRED_FUND` 12,000 cr, `HIRED_WAGE` 40, `HIRED_SHARE` 0.06 (0.072 for a hand who signed on for the money), `HIRED_TARGET` 19,000. The soak (`tools/soak.js`, seeds 1 to 6) reaches the target in 15 to 24 runs (about 90 to 160 days), at 800 to 1,300 cr per run to the hand.
- Which events the cook and the ice hands take part in.

## Out of scope

- Any ending, later arc, or emergent injury (#128).
- The Mars and Belt starts and casts, owner mode, and the other storylines, which stay dormant.
- Structured relationship memory (#141) and bonds and traits (#142).
- Captains or XOs who can be chosen by the player, and more than four pairs.
