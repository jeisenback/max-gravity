# Prose style

How the text in Max Gravity should read. It applies to every scene, line of chatter and message, authored or generated. It builds on the prose pass (#136), which says to show the gesture, and adds what the best passages in the game already do. Draft for the owner to judge.

## The voice

Second person, present tense, American spelling. Two models:

- **James S. A. Corey** for the crew and what they say and do. Working people on a working ship, talking over each other, with the ship always in the way: the air handler, the recycler, the water ration, a door on a closer.
- **Ursula K. Le Guin** for the narrator. Patient, plain, interested in custom: what is done and not done aboard, and why. It explains the custom and leaves the feeling to the reader.

In the game, the Hester Vance and Tomas Achebe passages (`js/captains/hester.js`, `js/cast.js`) already do this best.

## Rules

1. **Make it about this ship.** A passage that could happen in any kitchen is not finished. Use the air handler, the closer on a door, the eleven-foot galley, the water ration, a deck you sit on. The detail comes from the place and the work.
2. **Let people talk like people.** They interrupt, repeat themselves, say "Tuesday, ask anyone". A scene has at least one line of real speech where it can. Each person talks in their own trade: Hester in sums ("Nine percent. Not ten."), Tomas to engines.
3. **State the custom, not the feeling.** "On a ship you cannot slam a door, so the quiet is made some other way." Say what is done and why; do not say what anyone feels about it.
4. **Show the object or the act, and cut the narrator's reading of it.** "She initials the page and says nothing, and the nothing has a figure in it." Not: "which is how you learn that he is moved."
5. **Put a number, a day or a credit on the cost.** "Two days of fuel." "Sixty. It is in the column already."
6. **Vary the length, and do not clip.** A short sentence lands because a longer one came before it. In narration, no more than two short sentences in a row, and no run of fragments ("A tight berth. A crosswind. A score."). Join the details with what connects them (because, where, while) and say what is where. In speech, let a person finish a thought: a reason, a detail, a turn. A run of clipped lines belongs to someone who talks that way, not to the whole crew: Hester's "Nine percent. Not ten." is clipped because Hester is. No chains of "and, X, and, Y" with commas around the conjunction.
7. **Be rough.** Real scenes are untidy. Do not give every beat a small perfect gesture or end every outcome on a neat, symmetrical image. One good odd detail beats three tidy ones.
8. **Report; do not color.** Narrate only what someone in the room could see or hear. No wry asides ("which is worse", "before anyone could say anything sensible", "Nobody wants to be asked"), no similes that carry a feeling ("like something coming loose"), no evaluative adverbs, and no sentences about what someone knows or is sure of. This is free indirect discourse, where the narrator takes on a character's judgment, and it is the main way the text reads as written by a model. If a line is the narrator's opinion, cut it or turn it into something said or done.
9. **Do not tell the player how to feel.** No "Good." and no "It is, you realize, the most honest thing anyone has said to you all week."

## Choices and results

The buttons and the last line of a result are prose too.

- **A label is an act or a line of speech, in the player's voice, in about eight words.** "Offer to help with the service." `"That's wonderful."` Not "Accept the thanks" or "Take the hour".
- **A button must be a choice.** If a scene has only one thing the player can do, put what happens in the previous result and drop the scene's button. The engine's own "Continue" after a result is fine.
- **A post's own move starts with the post in brackets,** as the raids and jobs do: "[Gunner] Walk a burst along her line". Say the odds in words ("long odds"), never as a percentage.
- **A result says what happened, then what it cost with a number, then stops.** No moral, no tidy image after the cost.

## Notes in brackets

The game reports a change in its own plain voice, after the prose, as a fragment: "(+3 experience at the gunner post.)", "Armor -13.", "Zoya thinks less of you." It is the game speaking, not the narrator. Never put one inside speech, and never add an adjective. Use the form already next to it; do not invent a new one.

## Pronouns and placeholders

The captain's pronouns vary, and a placeholder cannot change the verb ("she says", "they say"). So text shared by every captain says "the captain" or "Captain {last}", and only a captain's or a first officer's own authored text uses he, she or they (`js/captains/hester.js` uses "she"). The placeholders in use: `{captain}` (the captain), `{thread:key}` (the shipmate a follow-up is about), `{crew}` (the crew member in a role), `{post}` (the hand's post) and `{names}` (who left with them). Keep a placeholder out of speech where the verb has to agree.

## How long a scene is

A scene's text should fit above its choices on a phone (390 by 844) without scrolling: about 140 words. Measured: Signing On is 234 words and about a third of it sat below the choices; Tomas's engine room scene is 71 words and fits. Put anything longer after a choice, or cut it.

## Who is talking

Each person talks about their own work. These four are on the one path the build now offers; every line is already in the game.

| Person | What they talk about | A line already in the game |
|---|---|---|
| Hester Vance | Money, in sums; the notebook and its columns | "Sixty," she says. "It is in the column already." (`js/captains/hester.js`) |
| Cato Rahman | The crew, by name and by family; the watch bill | "I do the watch bill," he says. "I know who has a child at home and who is waiting on a letter, and I try to put the bad hours where they hurt least." (`js/captains/cato.js`) |
| Ines Ferreira | Flying, and the one landing she will not discuss | "Do not," she says, without turning round, "ask about the landing. Everybody asks about the landing." (`js/cast.js`) |
| Tomas Achebe | The plant, as if it were a patient | "Fresh air for her," he says, patting the housing. "She has not had a proper service in a year. Nobody asks me, so I do it in my own time." (`js/cast.js`) |

## Tics to cut

Counts are `grep -rIio -- "<pattern>" js | wc -l` on 2026-10-05, next to the count when the guide was written (the first count used a slightly different method, so compare the trend, not the decimals). The tics have grown since the guide was written. Keep one where it is the best word; cut it where it is a habit.

| Pattern | Now | Was | Instead |
|---|---|---|---|
| "a little", "a small", "very slightly" | 216 | 211 | Drop the hedge, or give a measure |
| "nods" | 65 | 44 | Give the person an action that is theirs |
| "and then, " | 31 | 36 | Full stop and start again |
| "as if", "as though" | 33 | 34 | State what happens; keep one comparison per scene |
| "for a while" | 41 | 29 | Say how long ("until the flip") |
| "for a long moment" | 11 | 14 | A thing they do in that moment |
| "somehow", "oddly", "strangely" | 11 | 13 | Cut; if it is odd, show why |
| "which is" | 63 | | An aside joined to a fact: make it a separate sentence of fact, or cut it |
| "you find" | 52 | | The narrator reading the player: say what the player does or sees |
| "a good deal" | 16 | | A hedge: give a measure |
| "perfectly" before an adjective | 8 | | An evaluative adverb: cut it |
| Asides ("which is worse", "very interested in", "a look you would like back") | many | | Cut, or make it something said or done |

Also watch for the machine's own habits: lists of three, a quiet gesture on every beat (a fork put down and picked up), "neither says what it was about", and closing every outcome on a soft image. They read as written by a model.

## Worked example

A Small Ship (`js/social.js`) is rewritten to these rules.

Before:
> Mara and Ines are shouting at each other in the galley about the thermostat. It started with a raised eyebrow and a pointed remark, and ten minutes later both of them are standing, and one of them is waving a spoon. It is not really about the thermostat. It never is. The rest of the crew has gone very quiet, and is looking at their food.

After:
> Mara and Ines are on their feet in the galley. The galley is eleven feet across, and everyone who is not on watch is in it. They are arguing about the thermostat. "If you'd said something," Ines says. "I said something," Mara says. "Tuesday. Ask anyone." Nobody at the table answers.

And for "Side with Mara": the old door slams "with a noise like a small explosion" and one of them looks "a little bit ashamed". Now Ines looks at the captain, then at Mara, and leaves. The bunk door is on a pneumatic closer and does not slam; it hisses shut. Mara says "Thanks, Captain" to the table. Nobody answers. Nothing in it is the narrator's opinion.

A second example, for the clipped style (`js/stories/hired-aftermath.js`, "Passed Over").

Before:
> "I asked for one thing," the captain says, after a long moment, "and you said no. That is allowed. It is also information." It is not forgiveness. It is a door, and it is not locked.

After:
> "I asked you for one thing, and you said no," the captain says. "You were allowed to. I have not asked you for anything since, and that is not an accident." The captain turns a page of the log and does not look up.

The speech finishes its thoughts, the last sentence is a thing done, and the aphorism is gone. For descriptions, the pattern to cut is a string of noun fragments ("A narrow lock. A lamp. A door.") in place of a sentence that says where they are and how they relate.

## Checking a passage

- Could this happen in any kitchen? Add the ship.
- Is there a line of speech, and does it sound like the person?
- Is a feeling named by the narrator, or an aside added? Replace it with what is said or done.
- Does the cost have a number? If the figure is tuned elsewhere (a wage, a share, a debt), is the text built from the constant, so a retune cannot make the prose wrong?
- Do two short sentences or fragments follow each other in narration? Join them, or lengthen one.
- Does a line of speech stop before the thought is finished, when the speaker is not someone who talks that way?
- Does every button do something? Fold an acknowledgment into the result.
- Is the scene about 140 words or fewer above its choices?
- Is a bracketed note the game's voice, with no adjective, outside speech?
- Does the captain take a name or "the captain" in shared text, and a pronoun only in their own?
- Does it end on a tidy image? Try ending one line earlier, or on something untidy.
- Read it after a Hester passage. Does it sound like the same book?

## Where to start

Rewrite the text players see most. The 100-game sims show these dominate: the letters from home (`js/family.js`), A Small Ship and Galley Duty (`js/social.js`), the bar scenes and the generated crew scenes (`js/people.js`). Do a tic pass first, since it needs no new story. A scene that shows up many times needs several versions of the same moment (A Small Ship has four openings), not one script with the names swapped.
