# Prose and world: voice cards, a world bible and a tic report

Date: 2026-10-08. Status: draft for the owner to review.

## Intent

The owner wants to write better prose and better narrative systems in a repeatable way: to dial the writing voice, flesh out backgrounds and expand the worldbuilding. Agreed in discussion:

- The voice dial is at authoring time. The player sees one fixed text per scene. No runtime voice variants.
- Voice profiles are narrator registers plus one card per speaking character, kept as markdown.
- The world is a bible in markdown with stable ids. No data-file fields, no consistency test yet.
- No engine changes now. The first rewrite passes will show which engine gaps are real (variant pools for repeated scenes, callbacks to the record, scene-editor work); each would be scoped as its own sub-project then.

Success: a person or Claude writing a scene can pick a register, read the speakers' cards and the relevant bible entries, write, and check the result against measured counts. Existing scenes are not rewritten by this work.

## Parts

### 1. Voice system, `docs/voices/`

- `narrator.md`: the base voice from `docs/prose-style.md`, plus three or four named registers, each a tuning of that base:
  - plain (the default),
  - dry (the working ship's humor),
  - tense (raids, losses),
  - quiet (partings, letters home).

  Each register states sentence length, how much custom is explained, and how much humor is allowed, and carries a sample passage. One moment is written in every register so the dial can be seen.
- One card per speaking character, starting with the narrow build's cast: Hester Vance, Cato Rahman, Ines, Tomas Achebe, and the hired gunner's own lines. Each card holds diction, verbal habits, what they never say, topics they steer toward, and four to six sample lines. Facts already in code (`bio`, `wants`, `fears`, `traits` in `js/captains/*.js` and `js/cast.js`) are linked by file, not copied.
- `docs/prose-style.md` stays as the rules. The cards cite it and do not repeat it.

### 2. World bible, `docs/world/`

- Files: `places.md`, `factions.md`, `trades.md`, `customs.md`, `timeline.md`, `backgrounds.md`.
- Each entry has a stable id (for example `place.rotterdam-arcology`), a few fixed fields, and a "use in scenes" line naming one or two concrete details. Entries are short enough to read in minutes.
- `backgrounds.md` has a longer entry per start background in `BACKGROUNDS` (`js/menu.js`): home, family, schooling, why they left.
- Where `js/data.js` or `js/menu.js` already states a fact, the bible quotes it and names the file. Code is the authority for mechanics; the bible is the authority for texture.
- Entries are written after the cards, since writing the cards shows which facts are needed.

### 3. Writing workflow, `docs/writing-a-scene.md`

One page: choose the register, choose the speakers' cards, choose the bible entries, write, then run the checks from `docs/prose-style.md` and `npm run prose`.

### 4. Tic report, `tools/prose-lint.js` and `npm run prose`

- Reads the string literals in the narrative files: `js/stories/*`, `js/captains/*`, `js/cast.js`, `js/castbar.js`, `js/people.js`, `js/peopletext.js`, `js/familytext.js`, `js/bartopics.js`, `js/hiredeventstext.js`, `js/social.js`, `js/family.js`. A simple scan, not a JavaScript parser.
- Counts each pattern in the tic table of `docs/prose-style.md`, per file and in total, and can write or compare a baseline file under `docs/`.
- It reports and never fails. It sits beside `soak` and `coverage`, outside `npm test`, so suite time is unchanged. Promoting it to a ratchet in `npm test` is a later decision, if drift shows up.
- A small Node test in `tests/` covers the counter on a fixture string. The tool is not a game script, so `tests/globals.test.js` is unaffected.
- Known limit: text edited through the scene editor's override layer (#336) is not scanned until that layer exists.

## Order of work

1. Narrator registers and the cards for Hester, Cato, Ines, Tomas.
2. The writing workflow doc.
3. The world bible, starting with `backgrounds.md` and `customs.md`.
4. The tic report and its baseline.

## Out of scope

- Rewriting existing scenes (#136, #255 use these tools afterward).
- Runtime voice variants, engine changes, a bible consistency test, voice cards as data.
- The scene editor (#334 to #342).

## Intersection with open issues

- #136 (ground the main cast scenes) and #255 (hired chapter events to the captain voice) are the first users. They run after the cards for the cast exist. The report gives #255's tic pass a measured before and after.
- #138 (one coherent character system): `backgrounds.md` becomes the single statement of a backstory, which helps with the contradiction between authored and generated backstories. The code fix stays in #138.
- #129, #130, #132 (third main character, pivots, endings) and #283, #346 (first officers' readings) need a voice card for each new speaker before they are written.
- #334 to #342 (scene editor): changes how text is edited, not how it is written. No conflict; see the report's known limit above.
- `docs/prose-style.md` is still marked "Draft for the owner to judge". The cards build on it, so any rule changes are cheaper before they are written.

## Testing

The only code is the counter. Its test feeds a fixture string with known counts and checks the totals and the per-pattern output. The docs have no tests; `npm test` is run before pushing, as for any change.
