# Prose style

How the text in Max Gravity should read. It applies to every scene, line of chatter and message, authored or generated. It builds on the prose pass (#136), which says to show the gesture, and it adds what the best passages in the game already do. Draft for the owner to judge.

## The voice

Second person, present tense, American spelling. A dry, close narrator who reports what you could see or hear and leaves the feeling to the reader. The model is the Hester Vance and Tomas Achebe passages (`js/captains/hester.js`, `js/cast.js`): short, concrete, a little funny, and never telling you what a gesture means.

## Rules

1. **Show the object or the act, and cut the reading of it.** The narrator does not say what a gesture means.
   - "She initials the page and says nothing, and the nothing has a figure in it."
   - Not: "He wipes his hands on a rag for a long time, which is how you learn that he is moved."
2. **One concrete detail per beat, and prefer a thing a character handles.** A notebook, a rag, a pencil laid across a gap in the log, a coffee ring on the ledger. Before adding an adjective, ask what the person is holding.
3. **People talk in their own trade.** Hester speaks in sums ("Nine percent. Not ten."), Tomas talks to engines. A new character needs a trade or habit that shows in the first line they speak.
4. **Keep the sentences short, and let a long one earn its place.** At most one long sentence in a paragraph. No chains of "and, X, and, Y" with commas around the conjunction.
5. **Put a number, a day or a credit on the cost.** "Two days of fuel." "Sixty. It is in the column already." A stake with a figure is believable, and a stake with a mood is not.
6. **Humor comes from a precise comparison, not a list of adjectives.** "Looking at it as if it owed her money."
7. **Leave some scenes open.** End on the line or the image. Not every scene closes with a nod, a door or a soft thank-you, and some choices should leave something unsettled.
8. **Do not tell the player how to feel.** No "Good." or "It is, you realize, the most honest thing anyone has said to you all week." State the fact and stop.

## Tics to cut

Counts are across `js/` today. Keep the occasional one where it is the best word; cut it where it is a habit.

| Pattern | Count | Instead |
|---|---|---|
| "a little", "a small", "very slightly" | 211 | Drop the hedge, or give a measure ("two inches", "for the length of a breath") |
| "nods" | 44 | Give the person an action that is theirs |
| "and then, " | 36 | Full stop and start again |
| "as if", "as though" | 34 | State what happens; keep one comparison per scene |
| "for a while" | 29 | Say how long ("until the flip") |
| "for a long moment" | 14 | A thing they do in that moment |
| "somehow", "oddly", "strangely" | 13 | Cut; if it is odd, show why |

## Before and after

These are drafts to show the voice, not final text.

- `js/social.js`, Small System. Now: "They stop, and stare, and begin to compare notes, and, within minutes, they are shouting in delighted recognition." Draft: "They stop. 'Which deck?' 'Nine.' 'Nine, by the laundry?' Inside a minute they are both talking and neither is listening."
- `js/people.js`, Locked Locker. Now: "It might be nothing. Every ship has its secrets. But you are the captain, and it is your ship." Draft: cut all three sentences and end on "The second padlock is new."
- `js/family.js`, a Bad News opening. Now: "does the whole shift with great care and no talk, the way people do when they are holding something heavy." Draft: "does the whole shift without a word, and checks every gauge twice."

## Checking a passage

- Could a line be a photograph or a recording? If it is a feeling, replace it.
- Is there a hedge ("a little", "somehow") that can go?
- Does it end on a nod, a door or a thank-you? Try ending one line earlier.
- Does the cost have a number?
- Read it after a Hester passage. Does it sound like the same narrator?

## Where to start

Rewrite the text players see most. The 100-game sims show these dominate: the letters from home (`js/family.js`), A Small Ship and Galley Duty (`js/social.js`), the bar scenes, and the generated crew scenes (`js/people.js`). Do a tic pass first, since it needs no new story.
