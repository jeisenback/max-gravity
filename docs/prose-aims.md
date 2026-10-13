# What the text is for

Status: the stated purpose of the game's text, approved by the owner. `docs/prose-style.md` (how it should read), `docs/writing-a-scene.md` (how to write a scene) and the voice cards in `docs/voices/` are the means. When they disagree with this, this wins.

`docs/prose-style.md` says how the text should read. This says what it is for, so a pass over all of it can be judged by what the player gets and not by what a count finds. When the two disagree, this wins.

## The aims

1. **The player can decide.** A choice says what it costs and risks, in a number or a day, before it is picked. A result says what changed. Nobody has to guess whether a button is cheap.
2. **People are told apart.** With the tags hidden, two speakers are not interchangeable. Each talks in the idiom of their trade and their card.
3. **The place is believed.** The detail comes from this ship, this work and this custom. A passage that could happen in any kitchen is not finished. The world is its own, with no names, terms or plot shapes from the Expanse.
4. **It survives repetition.** A scene or line that plays often has enough versions that the player meets the same moment more than once without meeting the same words.
5. **The big moments land.** Loss, partings and turning points get their facts and their room, and a feeling may be named plainly, once, by the person who has it or by the narration, when the scene is about it. This is not a book of things left unsaid. What stays out is the narrator's wry reading, a feeling that the player is told to share, and a feeling named on every beat.
6. **It reads where it is read.** Labels and messages are short and plain. A scene fits a screen or two on a phone.

## How each is judged

By a reader, on a sample, not by a count. Draw 40 strings from each layer below and score each 0 or 1 on the questions that apply.

| Aim | Question |
|---|---|
| 1 | Does the choice name its cost or risk, and the result what changed? |
| 2, scenes | Cover the speaker's name: could it be anyone? Does it break the card's "never says"? |
| 2, pool lines | Does the line fit the trait, post, room or goal it is drawn for, so that a line written for another one would be out of place here? Break a card's "never says" and it fails. Not scored (null) when the table does not pick by one of those (a general pool such as news or a rumor), or the string is a bare label or fragment. The rater is given the table and key the line comes from. |
| 3 | Is there a detail only this ship or this work would have? Does it contradict `docs/world/`? |
| 4 | For a line that plays often: are there at least three versions of the moment? |
| 5 | At a beat that matters: where a feeling is named, is it named once and plainly, with no narrator's reading of it and no verdict that tells the player how to feel? Not scored (null) when no feeling is named. |
| 6 | Is it as short as it can be and still say the thing? |

Q2 on pool lines was reworded after the first sample (#600): the old wording gave kappa 0.21 between two raters on the 40 pool lines, and the new gave 0.65 (96 percent agreement on the 25 lines both rated). It now passes nearly every line it applies to, so it finds only a line that fits any trait equally; "any kitchen" lines are Q3's.

Q5 was reworded after the second sample (#602), 20 big beats (deaths, departures, farewells, pivots, chapter endings) with two raters. The old wording, "state the fact, and leave room", got 20 of 20 from one rater and 12 of 20 from the blind one (60 percent agreement, kappa 0 because one rater never failed a scene). The blind rater's 8 failures were of two kinds. Two (the Dov and Zoya goodbyes) were the narrator's knowing reading that the feeling rule forbids ("She does not need to.", "before it can be anything"); the other six were images standing in for a fact that the text does state elsewhere (a hand's width of tape, a folded mattress), where raters differ on whether an image counts. So "state the fact" is dropped as a per-string question, and what Q5 asks now is the feeling rule. On the feeling rule the raters agreed on the 3 scenes both scored as naming a feeling, and the blind rater found the 2 violations the other rater, who wrote the rule, missed. Only 6 of the 20 beats name a feeling at all, so the rule is thinly tested. The full table is in the pull request for #602.

The tic report and the other counts stay as a smoke alarm. They find known habits; they do not show quality, and a pass is not done because a count fell.

## Layers

| Layer | Examples | Aims that apply |
|---|---|---|
| Scenes | captains' and cast scenes, hired events, the letters home | all six |
| Pool lines | chatter, bar reactions, work events, crew lines | 2, 3, 4, 6 |
| System text | messages, labels, help, menus | 1, 6 |

## Not aims

- **Not sounding unlike a model.** That is a symptom. The aims above are what it hides.
- **Not imitating named authors.** Corey, Le Guin and the other north stars are guides to take from, not a target. The reference passages are the bar.
- **Not changing behavior.** A text pass changes words only; the effects pins must pass unchanged (`docs/pins.md`).

## Decisions

1. **Restraint at the big beats.** Decided: too much restraint is wrong. A feeling may be stated plainly where the scene is about it (deaths, departures, farewells, #356 and #357). The style doc follows (below).
2. **Repetition.** Decided: the work is in this pass, in three parts. A no-repeat memory for the busy line pools (`pickFresh`, #596), more lines for the pools the player meets most (#597), and more than one text for the few most-played scenes (done: Galley Duty, Sit With Someone and Bad News already had four or five openings, and Cover My Watch and A Word now have four; an opening is chosen by who and which day, not by a draw, so the dice of the pinned plays are unchanged). A full variant model in the scene engine and editor is not built, since the most-played scene comes up about three times a chapter.
3. **Status.** Decided: this is the stated purpose of the game's text, with the style doc as the means.

## What the first decision changed in the style doc

Done in `docs/prose-style.md` (rules 3, 4, 8 and 9, the checking list and a note under the worked example) and `docs/voices/dialogue.md` (rule 5).

- **Rule 8 (report, do not color)** keeps its target, the narrator's wry aside and the simile that carries a feeling, and stops forbidding a stated feeling or a sentence about what someone knows.
- **Rule 9 (do not tell the player how to feel)** keeps its target, a verdict on the moment ("Good.", "the most honest thing anyone has said to you"), and does not forbid naming what a character feels.
- **Rules 3 and 4** stay for customs and objects, as a way to show them, and are no longer a ban on the feeling.
- **A new limit instead:** a feeling is named where the scene is about it, and not on every beat. The count of feeling words is a smoke alarm for the second case.
