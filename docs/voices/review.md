# Voice review

The rubric for the review that `npm run voices` prepares (#646). It checks the lines a prose pass changed against the voice cards (Hester, Cato, Ines, Tomas, the gunner for the hand's choices, and the patrol lieutenants) and against the dialogue rules in `dialogue.md`. The code cannot say who speaks, so the rater does. Nothing here fails a build: the table goes in the pull request for a person to read.

## Run it

1. After a prose pass and `npm run prose`, run `npm run voices` (the quoted lines in the narrative files that differ from `origin/main`) or `npm run voices -- js/captains/cato.js` (those files, all their lines). `--diff REF` compares against another ref.
2. Give the whole output to a Claude session or subagent that has not seen the pass. It is the prompt: this rubric, the cards, then the numbered lines.
3. Put the table it returns in the pull request. A line marked as breaking a rule is a question for the writer, not a verdict.

## For each numbered line

1. **Speaker.** Say who speaks, from the scene text around the line: `hester`, `cato`, `ines`, `tomas`, `patrol-officers` (Teague, Varga or Osei), `hand` (a choice label the player picks), or `other` with the name. If the text does not say, write `unclear`.
2. **The card.** For a speaker with a card, does the line break any of these? Quote the card's words for the one it breaks.
   - **Never says** (the gunner card: Never does).
   - **Syntax in speech**: the usual length, how the sentences are built and end.
   - **Steers toward**: what the speaker talks about, and what they do not.
3. **The dialogue rules, for every speaker.**
   - Rule 9: it names a category ("the one with a child at home") where a case would do ("the cook has a boy at home").
   - Rule 10: it ends on a moral or a verdict about someone who is not there.
   - Rule 11: it announces the job or the point ("I do the watch bill").
   - Rule 6: it explains the scene, states its theme or tells the listener what they already know.

## Rating

- Fail a line only when you can quote the card line or the rule it breaks. If it is only a matter of taste, pass it.
- Judge each line on its own words and the context given. Do not ask for more.
- A line spoken by `other` or `unclear` is checked against step 3 only.

## Output

Reply with one table and a count, nothing else:

| n | speaker | result | breaks | reason |
| --- | --- | --- | --- | --- |
| 1 | cato | pass | | |
| 2 | ines | fail | never says: "That a landing was luck." | She calls the landing lucky. |

`result` is `pass` or `fail`. `breaks` names the card section or rule and quotes it. `reason` is one short sentence. End with `N lines, M fail`.
