# Death and departure as a real risk (#357): spike

Status: a draft for the owner's decisions. No code is kept from the spike. The last section lists what has to be settled before any is written.

## 1. What exists now

- **Main characters.** `castFate` (`js/fate.js`) turns a death into a mark whenever fewer than `CAST_FLOOR` (2) main characters would be left. The narrow build has exactly two (Ines and Tomas), so neither can die. A mark is a line of text and one lost skill point.
- **First officers** (Cato here) are `fragile`: the floor does not protect them. Their one lethal path is their pivot scene (Cato: "Lost in the ice hold"), where points decide live, mark or die (`js/captains/cato.js`).
- **Crew who are neither** die in a lock fight (hurt twice, or a hard hit, `js/boarders.js`) and in accidents (`js/boarding.js`), through `lossOdds` and `loseCrew` (`js/losses.js`). They, and the main characters and the first officer, walk off when their opinion falls to `OPINION.BITTER` unless loyal (`js/game.js`), and a war can recall one (`js/ties.js`).
- **The captain** cannot die or leave. The captain can put the hand ashore (`js/stakes.js`).
- **The hand** cannot die. A hurt hand works a level lower for 12 days, 18 if hurt again (`hurtHand`, `js/boarders.js`), and nothing follows from being hurt a third time. The owner path has an heir (`js/legacy.js`); the hired path has nothing.

## 2. What it costs today, measured

Twelve simulated chapters (seeds 1 to 12, `tools/soak.js`, the narrow build, a gunner on Hester's ship), each about 20 runs and 127 days:

| Per chapter, on average | Now |
|---|---|
| Raids | 0.75 |
| Lock fights (repel or assault) | 0.17 |
| Ice-run scenes | 6.5 (about two runs) |
| Work events | 3.75 |
| Crew hurt | 0.5 |
| The hand hurt | 0.5 |
| Crew dead | 0.08 (one chapter in twelve) |
| Main characters marked or dead | 0 |
| The hand dead | 0 |

Per fight, from `npm run fights`: a lock fight with five standing costs someone about half the time and kills one in five, and the hand is hurt in 14 percent.

So the machinery is sound and the exposure is not. The danger events happen under once a chapter, and of everyone who could be lost only a generated crew member ever is, about one chapter in twelve. Raising the lethality of the existing events cannot reach a "real" rate on its own: 0.17 lock fights a chapter at 0.2 deaths each is 0.03 deaths a chapter. Either there are more dangerous events, or there are authored moments that carry the risk.

## 3. Proposed rules

**3.1 The floor.** The narrow build sets `CAST_FLOOR` to 0 (through a scope flag, so the full build keeps 2). What keeps the story going now is not a guaranteed pair. The chapter's spine is the captain, the first officer and the hand, and the main characters' scenes simply stop when they are gone (`castAboard` already filters the dead, and an opinion gate whose person is gone drops the choice, so nothing is left shut for ever). A loss is never silent: section 3.2.

**3.2 A warning ladder, the same for everyone.**
1. *Hurt.* Already there. Add one line when it happens to a named person: "{name} is hurt. Another hit like that could kill {them}." No pronoun is guessed; the line uses the name.
2. *Marked.* Already there for main characters (a lost skill point). A character who is already marked, or already hurt and unhealed, and is hit again dies. This is the existing "hurt twice" rule, extended to main characters.
3. *Foreshadowed.* Each fate scene below is preceded by an earlier scene that says what will matter (a medic aboard, a hull above 60 percent, a kept favor), so the player can see it coming and do something. Yelena's pivot already counts points of this kind (`js/cast.js`).

**3.3 Fate scenes: where the real rate comes from.** The pivot pattern is the right mechanism: an authored scene whose outcome (live, mark, die) is decided by points the player could influence. It already exists for the first officers and for Yelena. I recommend one fate scene per named person in the narrow build:
- Ines and Tomas each get a pivot (they have none now), timed after their late scene.
- Cato keeps his.
- The captain gets one (3.4).
- The hand gets one (3.5).
The rates are then set by the point thresholds and tuned with the soak, not by how often a raid happens to land. This is authored prose, so each scene is drafted for review before it goes in, as for the first-raid and first-arrival scenes.

**3.4 The captain.** Two ways to be lost, both from events that already exist: a lost bridge in a boarding (`repelSettle`) can kill or capture the captain instead of costing the fund, and the captain's fate scene (a raid or a bad run where the captain is the one in danger). When the captain is lost the hand is put ashore at the next port and starts again with another captain, keeping savings, skill and debt, the way `putAshore` already works, and the carried line (#295) says it. I recommend this over the first officer taking command: the first officers have no captain's entry (wage, share, run style, scenes), and giving them one doubles the authored content. If the first officer is also gone the same applies.

**3.5 The hand.** The hand can die in three named ways:
- hurt a second time while still hurt, then a death roll;
- a lock fight lost at the lock with the hand already hurt;
- the hand's own fate scene (a fate scene like the others, with the points shown beforehand).
The chapter then ends with the hand's look back (`chapterRecap`) reading the record (#275), then a new game with a carried line (the field added for #295). Carrying on as another hand on the same ship would break the chapter's one protagonist.

**3.6 Departures.** The opinion walk-off (`js/game.js`) already covers everyone in the crew, main characters and the first officer included, unless they are loyal (a kept favor, `js/family.js`), and a war can recall one (`js/ties.js`). Both stay. What is missing is the warning: opinion notes (#281) warn only for the captain and the first officer, so a main character can walk off with none. The proposal is to warn for them too, at the cutoff above BITTER, and to record the departure in the memorial as a departure rather than a death.

## 4. Rates

This is the number the owner sets; the proposal is a starting point. Per chapter (about 127 days):
- A named person (a main character, the first officer, the captain or the hand) is lost or gone: **about 1 chapter in 3**.
- The hand dies: **about 1 in 12**.
- The captain is lost: **about 1 in 10**.
- Each main character and the first officer: **about 1 in 8** each.
Today all of these are near zero except a generated crew member at 1 in 12.

`tools/soak.js` reports, per captain and seed, who was lost or left, when and why, including the hand, so these can be checked over many seeds.

## 5. What follows once these are decided

In order, each its own PR with tests: the floor flag and the second-strike rule with its warning line; the pivots for Ines and Tomas (drafted first); the captain's fate and the put-ashore path; the hand's death and the ending; the soak report. The farewell (#356) reads these events and follows them.

## 6. Decisions needed

1. **The floor.** 0 in the narrow build, or 1 (at least one main character always survives)? I recommend 0 with the warning ladder.
2. **When the captain is lost.** The hand is put ashore and starts again with another captain (recommended), or the first officer takes command?
3. **When the hand dies.** The chapter ends with a look back and a new game (recommended), or something else?
4. **The rates in section 4.** Are they the right starting point, and which are too high or too low?
5. **How the rates are reached.** Authored fate scenes for each named person (recommended, with prose drafted for your review), or more dangerous events as well? More events changes the pacing tuned in #256 and #278.
