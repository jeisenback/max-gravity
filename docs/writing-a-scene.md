# Writing a scene

How to write or rewrite a scene so it sounds like the same book as the rest. The prose report in step 6 only measures: it never fails a build.

1. **Pick the register.** Choose one in `docs/voices/narrator.md` (plain, dry, tense or quiet) for the scene, or for each beat if the scene changes mood. Read its sample.
2. **Read the card of each speaker** in `docs/voices/` (Hester, Cato, Ines, Tomas, and the gunner for the hand's own choices). Note the syntax in speech and the lines each never says.
3. **Read the bible entries** in `docs/world/` for the place, the faction, the trade and the custom, and use the `Use in scenes` line of each. Do not reach for Expanse names, terms or plot shapes, and read the `Divergence:` line where an entry has one.
4. **Write.** Follow `docs/prose-style.md` and `docs/voices/dialogue.md`. Use the reference passages in `docs/voices/reference.md` as the bar for length and build.
5. **Check it** against "Checking a passage" in `docs/prose-style.md` and the eight rules in `docs/voices/dialogue.md`.
6. **Run the report.** `npm run prose -- --compare` shows the tic counts, the sentence-shape figures and the reported-speech count against the baseline. Read the lines for the files you touched. A low spread or a run of short sentences means the passage is clipped.
7. **Record what you invented.** If you made up a place, a custom, a name or a date, add it to `docs/world/` with `Status: proposed`, so the next scene can use it and the owner can confirm it.
