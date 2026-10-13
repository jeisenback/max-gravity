# What the text is for

Status: draft for the owner to approve. Nothing in the repo points to this yet.

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
| 2 | Cover the speaker's name: could it be anyone? Does it break the card's "never says"? |
| 3 | Is there a detail only this ship or this work would have? Does it contradict `docs/world/`? |
| 4 | For a line that plays often: are there at least three versions of the moment? |
| 5 | At a beat that matters: does it state the fact, and leave room? |
| 6 | Is it as short as it can be and still say the thing? |

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

## Open decisions for the owner

1. **Restraint at the big beats.** Decided by the owner: too much restraint is wrong. A feeling may be stated plainly where the scene is about it (deaths, departures, farewells, #356 and #357). `docs/prose-style.md` rules 3, 4, 8 and 9 were written for the opposite and need to be rewritten to match, as described below.
2. **Repetition.** Aim 4 needs several versions of a moment that plays often. The engine already has pools: 39 line tables (`js/linetables.js`) hold 661 lines, drawn uniformly at random with no memory of the last pick. A scene's own text is one string. In 8 soak chapters (`node tools/soak.js --scenes`) the most-played scene came up about 3 times a chapter, out of about 110 scene plays, so the repeat that matters is in the line pools, not the scenes. Is the work in this pass (grow the small pools, add a no-repeat memory, and give the few most-played scenes more than one text) or is some of it a separate engine task?
3. **Status.** Does this replace "draft" on `docs/prose-style.md` as the stated purpose, with the style doc as the means?

## What the first decision changes in the style doc

Not yet done; for the owner to approve with this page.

- **Rule 8 (report, do not color)** keeps its target, the narrator's wry aside and the simile that carries a feeling, and stops forbidding a stated feeling or a sentence about what someone knows.
- **Rule 9 (do not tell the player how to feel)** keeps its target, a verdict on the moment ("Good.", "the most honest thing anyone has said to you"), and does not forbid naming what a character feels.
- **Rules 3 and 4** stay for customs and objects, as a way to show them, and are no longer a ban on the feeling.
- **A new limit instead:** a feeling is named where the scene is about it, and not on every beat. The count of feeling words is a smoke alarm for the second case.
