# Writing a scene

How to write or rewrite a scene so it sounds like the same book as the rest. The prose report in step 6 only measures: it never fails a build.

1. **Pick the register.** Choose one in `docs/voices/narrator.md` (plain, dry, tense or quiet) for the scene, or for each beat if the scene changes mood. Read its sample.
2. **Read the card of each speaker** in `docs/voices/` (Hester, Cato, Ines, Tomas, and the gunner for the hand's own choices). Note the syntax in speech and the lines each never says.
3. **Read the bible entries** in `docs/world/` for the place, the faction, the trade and the custom, and use the `Use in scenes` line of each. Do not reach for Expanse names, terms or plot shapes, and read the `Divergence:` line where an entry has one.
4. **Write.** Follow `docs/prose-style.md` and `docs/voices/dialogue.md`. Use the reference passages in `docs/voices/reference.md` as the bar for length and build.
5. **Check it** against "Checking a passage" in `docs/prose-style.md` and the eight rules in `docs/voices/dialogue.md`.
6. **Run the report.** `npm run prose` prints the tic counts, the sentence-shape figures and the reported-speech count for each narrative file, and `npm run prose -- --compare` shows what changed in the totals since the baseline. Read the lines for the files you touched. A low spread or a run of short sentences means the passage is clipped.
7. **Record what you invented.** If you made up a place, a custom, a name or a date, add it to `docs/world/` with `Status: proposed`, so the next scene can use it and the owner can confirm it.

## Prose and the scene editor

The scene editor (#334, `editor.html`) reads scene text by id and writes edits to an override layer (`js/overrides.js`), and the conversion of the hired chapter's scenes to data (#342, the plan in `docs/superpowers/plans/2026-10-09-hired-scenes-to-data.md`) is in progress (the spike and plan are on the editor branch until it merges). Prose written now has to survive both. Rules for any prose pass:

1. **Words are whole strings.** Write a title, a text, a label and a result as one string with the placeholders the game already fills in (`{n}`, `{crew}`, `{cr}`, `{home}`). Do not splice clauses together with a ternary inside a template literal, and do not call a function inside the text (`${hurt(0.1)}` applies damage when the line is built, and the editor shows and replaces text without running it). If a sentence has two forms, write two whole sentences and let the code choose.
2. **No markup in prose.** An HTML tag in a label or a result (the old cost note's `<span class="hint">`) shows as text wherever the line is escaped, and every editor field is untrusted text (#251). Costs and hints are added by code at display time.
3. **Keep the shape.** Do not rename a scene, reorder its choices or change what a choice does in a prose pass. The override layer keys a choice by its place in the list, so a reordered choice silently re-points a saved edit, and a converted scene is pinned by a fixture of the text it returns and the state it changes.
4. **Check whether the file is being converted before you edit it.** The plan lists the order: `js/captains/ansel.js`, `pilar.js` and `cato.js` first, then the other captains' files and `js/cast.js`, then `js/hiredevents.js`, `js/hiredeventstext.js`, `js/icerun.js`, `js/engagements.js`, `js/boarders.js` and the function-built scenes. Open branches that touch a file are listed on #342. A prose edit to a file in flight conflicts with the conversion and changes its pinned text; wait for that file's conversion to land, or make the edit on top of it and refresh the fixture in the same pull request.
5. **Data scenes and tables are the easy case.** Where a scene is data (`js/storylets.js`, `js/stories/`) or a table of lines (`BAR_TRAIT`, `WORK_EVENTS`, `BAR_REACT`), edit the words in place and leave the table's keys, order and placeholders alone.

