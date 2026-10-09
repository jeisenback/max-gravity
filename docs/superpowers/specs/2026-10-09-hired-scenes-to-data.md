# The hired chapter's scenes, sorted by how far they are from data

The spike for #342 (scene editor story 8). It asks which of the hired chapter's code-written scenes can become data the editor edits, and which cheapest files to convert first. No code from the spike is kept: it was a one-off read of every scene's choice code.

## Method

Every hired scene was listed from the registries (`CAST`, `CAPTAINS`, `HAND_EVENTS`, `WORK_EVENTS`, `ICE_STAGES`) and from the functions that build the rest. For each choice the source of its `run()` was read for what it calls and whether it touches the game's state, and each scene took the class of its hardest choice. A scene whose text is a getter that reads the hull, the drive or the crew is class C however simple its choices.

| Class | What a scene is | What it needs to become data |
|---|---|---|
| A | text, and a fixed result | nothing: it is a storylet already |
| B1 | choices that only do what `EFFECTS` has today (`credits`, `later`, `learn`, `delay`) | nothing new |
| B2 | choices that change someone's opinion, set a flag, give experience | a few small new effects (below) |
| B3 | a roll, a gate on a choice, or someone joining or leaving | a roll effect, or new conditions, or a bigger effect each |
| C | state-dependent text, a fate, a recovery, a call into other code | stays code: an id and a text layer only |

## The table

Counts are scenes. `Scenes` is the total for the file, a closed reading (Cato's "What Cato Knows") counted as its own scene.

| File | A | B1 | B2 | B3 | C | Scenes |
|---|---:|---:|---:|---:|---:|---:|
| `js/cast.js` | 0 | 0 | 20 | 8 | 5 | 33 |
| `js/captains/hester.js` | 0 | 0 | 2 | 2 | 0 | 4 |
| `js/captains/cato.js` | 1 | 0 | 4 | 0 | 1 | 6 |
| `js/captains/dov.js` | 0 | 0 | 2 | 2 | 0 | 4 |
| `js/captains/ilsa.js` | 0 | 0 | 3 | 1 | 1 | 5 |
| `js/captains/imre.js` | 0 | 0 | 3 | 1 | 0 | 4 |
| `js/captains/pilar.js` | 0 | 0 | 4 | 0 | 1 | 5 |
| `js/captains/zoya.js` | 0 | 0 | 2 | 2 | 0 | 4 |
| `js/captains/ansel.js` | 0 | 0 | 4 | 0 | 1 | 5 |
| `js/hiredevents.js` | 0 | 0 | 8 | 0 | 9 | 17 |
| `js/hiredeventstext.js` | 0 | 0 | 0 | 20 | 0 | 20 |
| `js/icerun.js` | 0 | 0 | 0 | 3 | 0 | 3 |
| `js/engagements.js` | 0 | 0 | 0 | 3 | 0 | 3 |
| `js/boarders.js` | 0 | 0 | 0 | 2 | 0 | 2 |
| `js/signon.js` | 0 | 0 | 0 | 0 | 1 | 1 |
| `js/stakes.js` | 0 | 0 | 0 | 0 | 5 | 5 |
| `js/fate.js` | 0 | 0 | 0 | 0 | 1 | 1 |
| `js/hired.js` | 0 | 0 | 0 | 0 | 1 | 1 |
| `js/yardoffice.js` | 0 | 0 | 0 | 0 | 1 | 1 |
| **All** | **1** | **0** | **52** | **44** | **27** | **124** |

Of 124 scenes, **52 (B2) are one small step away**, 44 (B3) are further, and 27 (C) should stay code. Within B3, 28 are table-driven (the work events, the ice run, the raid and boarding beats): their text already lives in data tables, so they need an id and a text layer and not a conversion.

## What B2 needs

Five new effects cover all 52: `castLike` (someone's opinion of you, with the memory it leaves), `castFlag` (a fact about them), `castXp` (experience at a post), `captainLike` and `captainFlag` (the same for the captain). They are one line each over helpers that exist (`castLike`, `castFlag`, `castXp`, `captainLike`, `captainFlag`). The effects the scenes already use alongside them, `G.state.credits -= n` and `if (G.transit) delay(n)`, are `credits` and `delay` in `EFFECTS` today.

## What B3 needs

- **A roll.** `EFFECTS` has none. The work events and the ice run roll in a shared template (`workEvent`, `iceStageScene`) from odds that depend on the post and level (`soloOdds`), with the texts in data tables. They do not need a roll effect to be editable: the template stays, the tables get ids and a text layer. A roll effect is only worth building for a scene that has no template.
- **Choice gates.** 18 choices are shut by `gated(needCr(...))` (credits or crew), 2 by a regard (`opinion: { who, min }`), 4 by a hired flag. Credits are the `credits` condition today. The rest are three new conditions: `opinion`, a hired flag, and a crew count.
- **Someone joining or leaving.** The six `meet` scenes call `castJoin` and `castLater`, which put a person on the crew or send them away. Each is a larger effect with its own text (the hand's goodbye).

## What stays C

The seven pivot scenes (`coldThrusters`, `thePlant`, `overTheHull`, `inTheIceHold`, `atTheReactor`, `atTheHelm`, `atTheLock`) decide who lives, is marked or dies from the hull, the drive and who is aboard (`js/fate.js`). Two more read the game's state or draw a random rumor (Tomas's second middle scene, Ruben's first). Nine hired events read the captain's regard, the ship's money or the crew. The nine function-built scenes (signing on, the five stakes scenes, the parting scene, the used-ship offer, the yard office) read and change the game's own state. These stay code, with an id and an editable text layer: the title, the text, each label, and each result line (a result override replaces the line the choice returns).

## The three cheapest files

| File | Scenes | Convertible | Left | Why cheap |
|---|---:|---:|---|---|
| `js/captains/ansel.js` | 5 | 4 | the pivot | all four need only the five effects, and have no gate |
| `js/captains/pilar.js` | 5 | 4 | the pivot | the same |
| `js/captains/cato.js` | 6 | 5 | the pivot | the same, and one reading (the closed one) is plain text |

That is 13 of the 16 scenes in the three files. Cato is the first officer in the narrow build, so his five scenes are among the ones played now. The next files by cost are the captains' secret scenes (8 B2 scenes across four files) and `js/cast.js` (20 B2 scenes, the main characters).

## Answers to the open questions

- **Is a roll expressible in `EFFECTS` today?** No. The work event's `soloOdds` roll lives in a template that reads the post and level. A roll effect is not needed to edit those scenes (see B3). It is needed only for a new scene that wants one.
- **Is text-only editing of code scenes enough for now?** Yes for class C. The 27 scenes there are consequences, not choices, and their words are what a writer changes. A text layer that also replaces a result line covers them. It does not let a designer change what a code scene does, which is the intent.

## Recommendation

1. Give every hired scene a stable id in one registry, converted or not, so the index reads the registry and not the editor's own guesses (the acceptance for #342).
2. Pin the behaviour of every cast and captain choice before touching a file: run each choice in a seeded game and record its result and the state it changes, as a fixture. A conversion passes when the fixture does not change.
3. Add the five effects and a data form for a choice (`label`, `result`, `effects`), with the same text layer for code and data scenes, and convert the three cheapest files.
4. Then the plan in `docs/superpowers/plans/2026-10-09-hired-scenes-to-data.md`: the captains' secret scenes and `js/cast.js` (B2), then the gates and joins (B3), then ids and a text layer for the table-driven scenes, and nothing for class C but its id and text layer.

## Risks

- Prose lives in these files and is under a style pass (#255, #136). A conversion changes the shape of the code, not the words, and a fixture of the returned text catches a changed word.
- `castScene` and `captainScene` read a scene by name. The id of a closed reading is the scene's id with `:closed` added.
- The soak's beat order depends on the days and the happenings filter (`js/cast.js`, `js/captains.js`), neither of which a conversion touches.
