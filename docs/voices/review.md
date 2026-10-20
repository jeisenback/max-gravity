# Voice review

The rubric for the review that `npm run voices` prepares (#646). It checks the lines a prose pass changed against the voice cards (Hester, Cato, Ines, Tomas, the gunner for the hand's choices, and the patrol lieutenants) and against the dialogue rules in `dialogue.md`. The code cannot say who speaks, so the rater does. Nothing here fails a build: the table goes in the pull request for a person to read.

## Run it

1. Before writing a moment that has more than one version (`x.result`, `x.result.1`, ...), write one line for each: where it happens, what happens, and the act it ends on. No two versions of one character share a beat, or a prop that is not on the character's card (Ines's logbook is), and no habit is shared across characters unless it is on that character's card (#773).
2. After a prose pass and `npm run prose`, run `npm run voices` (the quoted lines and the passages in the narrative files that differ from `origin/main`) or `npm run voices -- js/captains/cato.js` (those files, all their quoted lines). `--diff REF` compares against another ref.
3. Give the whole output to a Claude session or subagent that has not seen the pass. It is the prompt: this rubric, the cards, the numbered lines, then the changed passages whole with the other versions of the same moment and the choice label it is played from.
4. Fix what it finds, then run the review again with a rater that has seen neither the pass nor the last review. A fix is new text and can break a rule of its own. Repeat until a round finds no line that fails and no passage that fails for a reason the writer agrees with, and only then open the pull request (#773). Each rater finds finer overlaps than the last, so a round rarely comes back with none; a finding not taken goes in the pull request with the reason.
5. Put the last round's tables in the pull request. A line marked as breaking a rule is a question for the writer, not a verdict.

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

## For each passage

The passages are printed whole after the lines, each under its file, line and key. Read them for what the lines alone do not show.

1. **The narration.** Does it speak for the hand outside a choice the player picked, or say what the hand feels, thinks or knows (gunner card, Never does)? Does it end on a narrator's aside or a tidy closer that states the point (`prose-style.md`)? Is there a list of three?
2. **The versions.** For a moment with more than one version, is each a different scene, or one scene reworded? Name any beat, prop or line two versions share. The versions are all what the choice label printed with them says (a sim with Ines is always a sim), so that activity and its setting are not a shared beat; what happens inside it is.
3. **Continuity and traits.** Does a version assume someone who may not be aboard, or a fact that the character's card or `people.md` contradicts? Does a speaker with no card say what their trait in `people.md` lists under Never says?

## Rating

- Fail a line only when you can quote the card line or the rule it breaks. If it is only a matter of taste, pass it.
- Judge each line on its own words and the context given. Do not ask for more.
- A line spoken by `other` or `unclear` is checked against step 3 only.

## Output

Reply with one table and a count for the lines:

| n | speaker | result | breaks | reason |
| --- | --- | --- | --- | --- |
| 1 | cato | pass | | |
| 2 | ines | fail | never says: "That a landing was luck." | She calls the landing lucky. |

`result` is `pass` or `fail`. `breaks` names the card section or rule and quotes it. `reason` is one short sentence. End with `N lines, M fail`.

Then, when there are passages, a second table:

| key | result | reason |
| --- | --- | --- |
| tomas.result.1 | fail | The same walk down the loop as tomas.result, with the same Igbo to the pipe. |

`result` is `pass` or `fail`, with the same bar as the lines: fail only for a rule you can quote or a beat you can name in two versions. End with `N passages, M fail`.
