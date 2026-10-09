# Plan: the hired chapter's scenes to data (#342)

The spike (`docs/superpowers/specs/2026-10-09-hired-scenes-to-data.md`) sorted 124 hired scenes: 1 text only, 52 that need five small effects, 44 that need a roll, a gate or a join, and 27 that stay code. This plan converts the cheapest group first and says what comes after. Each step is one commit with the suite green.

## The shape of a converted scene

A scene in `CAST[key].scenes` or `CAPTAINS[key].scenes` keeps its place and its fields (`days`, `title`, `text`, `choices`). A choice that is data has `label`, `result` and `effects` instead of `run()`:

```js
{ label: 'Ask how long she has had the night watch', effects: { castLike: { who: 'ilsa', n: 2, memory: 'You asked how long I had had the night watch.' } }, result: '"Four years," she says.' }
```

A small function (`dataChoice`) turns it into the closure the game already plays: apply the effects with `applyEffects`, return the result. A choice with a `run()` is left as it is, so a scene can have both and a file can be converted a scene at a time.

The five new effects, in `EFFECTS` (`js/storylets.js`), each one line over a helper that exists:

| Effect | Value | Does |
|---|---|---|
| `castLike` | `{ who, n, memory }` | `castLike(who, n, memory)` |
| `castFlag` | `{ who, flag }` | `castFlag(who, flag)` |
| `castXp` | `{ who, role, n }` | `castXp(who, role, n)` |
| `captainLike` | `{ n, memory }` | `captainLike(n, memory)` |
| `captainFlag` | a name, or a list of names | `captainFlag(name)` for each |

## Ids

Every hired scene gets an id in one registry, `js/hiredscenes.js`, which the editor's index reads in place of ids it made up itself. The ids stay what the index already shows (`cast:ilsa:mid1`, `cast:cato:late:closed`, `captain:hester:secret:confide`, `hired:cap-order`, `ice:1`) and the nine function-built scenes get `scene:sign-on`, `scene:warning`, `scene:put-ashore`, `scene:hand-death`, `scene:captain-lost`, `scene:split`, `scene:walk-off`, `scene:used-ship-offer`, `scene:yard-office`; the raid and boarding beats get `beats:raid`, `beats:dead-in-space`, `beats:ambush`, `beats:repel`, `beats:assault`. A test fails if an id is repeated or a scene in a registry has none.

## Editing

The override layer (`js/overrides.js`, story 2) already changes a storylet's words by id. It gains the registry scenes, through one function the cast and captain scenes call when they are built (`sceneWords`):

- Title, text and labels replace the shipped ones, as for a storylet.
- A **data** choice's `result` and `effects` can be replaced, held to the same check as a storylet's effects.
- A **code** choice's `result` replaces the line it returns; its effects stay in code.

The editor shows each registry scene as a data scene (its effects through the same forms) or as a code scene with a text layer, and "Play this scene" opens it in the preview with the captain, first officer and main characters it needs.

## Steps

1. **Ids.** `js/hiredscenes.js`; the editor's index reads it; a test pins the id list.
2. **Pin the behaviour.** A test runs every choice of every cast and captain scene in a seeded hired game and records the result text and what changed: opinions and the memories they leave, flags, experience, credits, the journal, follow-ups. The record is a fixture in `tests/fixtures`, written once from the code as it stands. A conversion passes when the fixture does not change.
3. **The engine.** `dataChoice`, the five effects, `sceneWords`; the override layer takes registry ids. Tests: a data choice plays as its closure did; an override changes the words and not the effects; a bad override is left out with one warning.
4. **Convert the first group.** `js/captains/ansel.js`, `js/captains/pilar.js` and `js/captains/cato.js` (13 scenes). Each choice's `run()` is replaced by data that the pin fixture proves equal. The returned text is kept as it was written, so a prose pass is not disturbed.
5. **The editor.** Registry scenes in the index as data or code, the effects forms for the five new effects, the preview, and the text layer for code choices.

Later, one commit each, in this order:

6. The captains' secret scenes (8, B2) and `js/cast.js` (20, B2): the main characters and the hired events with a person in them. Done for the scenes (#459: 48 scenes are data in all); the seven hired events about one person are data too (#473): a data form for an event (`dataEvent` in `js/hiredevents.js`), `learn` adding its line to the result, `{mate}` for the shipmate, and two effects that act on the shipmate (`mateLike`, `remember`).
7. The gates (16, B3): three new conditions on a choice (`opinion`, a hired flag, a crew count), then the captains' trouble and goodbye scenes and the main characters' middle scenes.
8. The joins (6, B3): `castJoin` and `castLater` as effects, then the six `meet` scenes.
9. The table-driven scenes (28): ids and a text layer for `WORK_EVENTS`, `ICE_STAGES`, the raid tables and the boarding tables, so their words are editable with no change to the templates that roll. A roll effect is built only if a scene wants one with no template. Done for the 20 work events and the 3 ice run scenes (#462): `tableScene` (js/storylets.js) reads their tables as scenes with a `label` and a `result` or a `win` and a `lose` for each choice, the templates read them through the override layer, and the editor has fields for them; the raid, dead in space, ambush and boarding beats have differently shaped tables and are a step of their own.
10. The class C scenes (27) get nothing but the id and the text layer, which step 3 already gave them.

## Done when (the first group)

- The pin fixture is unchanged by the conversion, and the existing suite passes unchanged.
- The 13 converted scenes are in the index as data, with their effects in forms, and play in the preview.
- A change to a converted scene's text, label, result or effects in the editor plays in the game.
- Every hired scene has an id in the registry.

## Out of scope

The pivot scenes' logic, the fate rules, and changing any prose. The soak's beat order and pacing are not touched: the days a scene waits and the filter that offers it stay where they are.
