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
6. **Keep the sentences short, and let a long one earn its place.** No chains of "and, X, and, Y" with commas around the conjunction.
7. **Be rough.** Real scenes are untidy. Do not give every beat a small perfect gesture or end every outcome on a neat, symmetrical image. One good odd detail beats three tidy ones.
8. **Report; do not color.** Narrate only what someone in the room could see or hear. No wry asides ("which is worse", "before anyone could say anything sensible", "Nobody wants to be asked"), no similes that carry a feeling ("like something coming loose"), no evaluative adverbs, and no sentences about what someone knows or is sure of. This is free indirect discourse, where the narrator takes on a character's judgment, and it is the main way the text reads as written by a model. If a line is the narrator's opinion, cut it or turn it into something said or done.
9. **Do not tell the player how to feel.** No "Good." and no "It is, you realize, the most honest thing anyone has said to you all week."

## Tics to cut

Counts are across `js/` when this was written. Keep one where it is the best word; cut it where it is a habit.

| Pattern | Count | Instead |
|---|---|---|
| "a little", "a small", "very slightly" | 211 | Drop the hedge, or give a measure |
| "nods" | 44 | Give the person an action that is theirs |
| "and then, " | 36 | Full stop and start again |
| "as if", "as though" | 34 | State what happens; keep one comparison per scene |
| "for a while" | 29 | Say how long ("until the flip") |
| "for a long moment" | 14 | A thing they do in that moment |
| "somehow", "oddly", "strangely" | 13 | Cut; if it is odd, show why |
| Asides ("which is worse", "very interested in", "a look you would like back") | many | Cut, or make it something said or done |

Also watch for the machine's own habits: lists of three, a quiet gesture on every beat (a fork put down and picked up), "neither says what it was about", and closing every outcome on a soft image. They read as written by a model.

## Worked example

A Small Ship (`js/social.js`) is rewritten to these rules.

Before:
> Mara and Ines are shouting at each other in the galley about the thermostat. It started with a raised eyebrow and a pointed remark, and ten minutes later both of them are standing, and one of them is waving a spoon. It is not really about the thermostat. It never is. The rest of the crew has gone very quiet, and is looking at their food.

After:
> Mara and Ines are on their feet in the galley. The galley is eleven feet across, and everyone who is not on watch is in it. They are arguing about the thermostat. "If you'd said something," Ines says. "I said something," Mara says. "Tuesday. Ask anyone." Nobody at the table answers.

And for "Side with Mara": the old door slams "with a noise like a small explosion" and one of them looks "a little bit ashamed". Now Ines looks at the captain, then at Mara, and leaves. The bunk door is on a pneumatic closer and does not slam; it hisses shut. Mara says "Thanks, Captain" to the table. Nobody answers. Nothing in it is the narrator's opinion.

## Checking a passage

- Could this happen in any kitchen? Add the ship.
- Is there a line of speech, and does it sound like the person?
- Is a feeling named by the narrator, or an aside added? Replace it with what is said or done.
- Does the cost have a number?
- Does it end on a tidy image? Try ending one line earlier, or on something untidy.
- Read it after a Hester passage. Does it sound like the same book?

## Where to start

Rewrite the text players see most. The 100-game sims show these dominate: the letters from home (`js/family.js`), A Small Ship and Galley Duty (`js/social.js`), the bar scenes and the generated crew scenes (`js/people.js`). Do a tic pass first, since it needs no new story. A scene that shows up many times needs several versions of the same moment (A Small Ship has four openings), not one script with the names swapped.


## Example Usage

Resolved parameter handling for issue #300.
