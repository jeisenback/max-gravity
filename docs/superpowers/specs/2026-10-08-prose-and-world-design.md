# Prose and world: voice cards, a world bible and a tic report

Date: 2026-10-08. Status: draft for the owner to review.

## Intent

The owner wants to write better prose and better narrative systems in a repeatable way: to dial the writing voice, flesh out backgrounds and expand the worldbuilding. Agreed in discussion:

- The voice dial is at authoring time. The player sees one fixed text per scene. No runtime voice variants.
- Voice profiles are narrator registers plus one card per speaking character, kept as markdown.
- Voice includes syntax and sentence structure, not only word choice and content. A register or card says how long and how built its sentences are, and how they vary. Short is one setting among several, not the house style.
- The world is a bible in markdown with stable ids. No data-file fields, no consistency test yet.
- Corey (crew) and Le Guin (narrator) stay the primary models. A small set of supplemental north stars covers dimensions they do not: fuller narration, dialogue mechanics, restraint and custom. Each is cited for what to take and what to leave.
- Dialogue has rules of its own, because sentence-level rules for narration do not protect speech.
- The existing text in the repo is too clipped to be the model, including the Hester and Tomas passages that `docs/prose-style.md` points to. The reference passages are the owner-approved samples below, which are fuller in syntax. Of the five samples the owner judged, Tomas's run-on speech to the pump was the one called good, and most of the others were called much better than the originals.
- No engine changes now. The first rewrite passes will show which engine gaps are real (variant pools for repeated scenes, callbacks to the record, scene-editor work); each would be scoped as its own sub-project then.

Success: a person or Claude writing a scene can pick a register, read the speakers' cards and the relevant bible entries, write, and check the result against measured counts. Existing scenes are not rewritten by this work.

## Parts

### 1. Voice system, `docs/voices/`

- `narrator.md`: the base voice from `docs/prose-style.md`, plus three or four named registers, each a tuning of that base:
  - plain (the default),
  - dry (the working ship's humor),
  - tense (raids, losses),
  - quiet (partings, letters home).

  Each register states its syntax and how much custom is explained and how much humor is allowed, and carries a sample passage. Syntax means:
  - the range of sentence length, and the usual mix (for example, mostly medium, a short one for a hard fact, a long one that earns its place by carrying a custom or a sequence of actions);
  - how sentences are built: coordination or subordination, openings other than subject-verb, fragments allowed or not, lists and parallel structure used sparingly;
  - paragraph rhythm: how a passage opens, where it lengthens, how it ends.

  One moment is written in every register so the dial can be seen. Every sample must show varied lengths and constructions; a sample of uniformly short sentences fails the card.
- One card per speaking character, starting with the narrow build's cast: Hester Vance, Cato Rahman, Ines, Tomas Achebe, and the hired gunner's own lines. Each card holds diction, syntax habits (Hester's flat declaratives built around a figure, Tomas running on when he is talking to an engine), verbal habits, what they never say, topics they steer toward, and four to six sample lines. Facts already in code (`bio`, `wants`, `fears`, `traits` in `js/captains/*.js` and `js/cast.js`) are linked by file, not copied.
- North stars, in `narrator.md` and on the cards. A register or card names its primary model and at most one supplemental author, with a "take" and a "leave" line. The set:
  - Patrick O'Brian, for narration: a working ship as a society, long balanced sentences, talk that wanders and is about the work. Take the sentence build and the shop talk; leave the period diction.
  - Elmore Leonard, for dialogue: sideways talk, interruption, plain "said" tags. Take the tags and the sideways answers; leave the crime-fiction slang.
  - Kazuo Ishiguro, for the quiet register (partings, letters home): restraint, the important thing left unsaid, formal and fully built sentences. Take the restraint and the syntax; leave the first-person unreliable narrator, since ours reports.
  - Ann Leckie, for custom: how people address each other and what is done and not done, stated flatly and in full. Take the custom-first approach.
  - Lois McMaster Bujold, optional, for the dry register: humor in what characters say and in situation. Take the lines characters say; leave the narrator's wry commentary and heavy interior thought, which break rule 8.

  Hemingway and Hammett model "report, do not color" but are the source of the clipped feel, so they are not north stars. Becky Chambers fits the domestic ship life but often names feelings directly. These authors set a direction only: no passage is copied from or closely imitates a specific text, and the reference passages stay original. The author notes are from memory and are for the owner to check against their own reading.
- `dialogue.md`: the dialogue rules. Draft, for the owner to confirm:
  1. Speech stays quoted. A line that matters to the scene is spoken in the speaker's words; reported speech is for lines that do not matter.
  2. Each speaker has their own syntax, set on their card. With the tags hidden, two characters should not be interchangeable.
  3. People answer sideways: the question under the question, or the previous line only in part. They interrupt, repeat and trail off, and the exchange does not resolve neatly.
  4. Tags are plain: "says", in the present tense, placed before, inside or after a line, or left out where the speaker is clear. No adverbs on a tag and no "growls", "murmurs" or "snaps".
  5. One beat per exchange, and it is an object or an act (a spoon put down, a log handed over), never a reaction that names a feeling.
  6. Length follows the person. A line can run long when the speaker would; the card gives a usual range. No speech that explains the scene, states its theme or tells another character what they already know.
  7. Silence ("Nobody answers") is used once per scene.
  8. Exposition comes out of disagreement, not recitation.
- `reference.md`: the five passages the owner reviewed on 2026-10-08, stored as the reference for the whole system: Hester's speech built on a figure, Tomas running on to the pump, the galley quarrel with fuller lines, the narrator carrying the custom of the ship's night, and the captain on the bridge in the tense register. Names, prices and ship details in them are invented for the samples and are not canon until they appear in the world bible. `docs/prose-style.md` points here instead of at `js/captains/hester.js` and `js/cast.js`.
- `docs/prose-style.md` stays as the rules, with two changes made first, for the owner to judge. Rule 6 ("keep the sentences short") is replaced by a rule about variation: mix lengths and constructions, no run of several short declaratives, and a long sentence only when it carries something. The worked example (A Small Ship) is rewritten so that it is not clipped. The cards cite the rules and do not repeat them.

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
- Also reports sentence shape per file: mean length in words, spread (standard deviation), the share of sentences under six words, and the number of runs of four or more such sentences in a row. It also counts reported speech against quoted speech (a rough check on dialogue rule 1). A low spread or a high count of runs marks clipped text. These are measures for a human to read against a register's stated range, not thresholds.
- It reports and never fails. It sits beside `soak` and `coverage`, outside `npm test`, so suite time is unchanged. Promoting it to a ratchet in `npm test` is a later decision, if drift shows up.
- A small Node test in `tests/` covers the counter on a fixture string. The tool is not a game script, so `tests/globals.test.js` is unaffected.
- Known limit: text edited through the scene editor's override layer (#336) is not scanned until that layer exists.

## Order of work

0. Revise rule 6 and the worked example in `docs/prose-style.md`, store the reviewed passages as `docs/voices/reference.md`, and write `docs/voices/dialogue.md`; the owner judges these before anything is built on them.
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
- #136's "grounded" examples are themselves clipped ("He wipes his hands on the rag. Then he wipes them again. 'Properly,' he says."). The issue should point at the reference passages before its pass begins.
- #138 (one coherent character system): `backgrounds.md` becomes the single statement of a backstory, which helps with the contradiction between authored and generated backstories. The code fix stays in #138.
- #129, #130, #132 (third main character, pivots, endings) and #283, #346 (first officers' readings) need a voice card for each new speaker before they are written.
- #334 to #342 (scene editor): changes how text is edited, not how it is written. No conflict; see the report's known limit above.
- `docs/prose-style.md` is still marked "Draft for the owner to judge". The cards build on it, so any rule changes are cheaper before they are written.

## Testing

The only code is the counter. Its test feeds a fixture string with known counts and checks the totals and the per-pattern output. The docs have no tests; `npm test` is run before pushing, as for any change.
