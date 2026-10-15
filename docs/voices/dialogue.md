# Dialogue rules

Status: Confirmed by the owner, 2026-10-08.

The rules for narration in `docs/prose-style.md` do not protect speech. A narrator can follow every one of them and still have two people talk in the same clipped, tidy way, or fold what they said into a summary. These rules are for what people say and how it is set down. The passages that show them are in `reference.md`.

1. **Speech stays quoted.** A line that matters to the scene is spoken in the speaker's words. Reported speech ("she answers that she did, on Tuesday") is for lines that do not matter.
   See passage 3.
2. **Each speaker has their own syntax,** set on their card. With the tags hidden, two characters should not be interchangeable.
   See passages 1 and 2.
3. **People answer sideways:** the question under the question, or the previous line only in part. They interrupt, repeat and trail off, and the exchange does not resolve neatly.
   See passage 3.
4. **Tags are plain:** "says", in the present tense, placed before, inside or after a line, or left out where the speaker is clear. No adverbs on a tag and no "growls", "murmurs" or "snaps".
   See passages 1 and 5.
5. **One beat per exchange, and it is an object or an act** (a spoon put down, a log handed over). A feeling is named only where the scene is about it, once, and not as the reaction that closes each exchange.
   See passage 3.
6. **Length follows the person.** A line can run long when the speaker would; the card gives a usual range. No speech that explains the scene, states its theme or tells another character what they already know.
   See passages 1 and 2.
7. **Silence ("Nobody answers") is used once per scene.**
   See passage 3.
8. **Exposition comes out of disagreement,** not recitation. A fact gets into the scene because two people dispute it.
   See passage 3.
9. **Give a case, not a category.** A speaker names the person, the object or the hour ("the cook has a boy at home") and not "the one with a child at home". A rule recited in parallel clauses is a handbook, not speech.
10. **Do not end on a moral or a verdict about someone who is not there.** "She's right to; somebody has to count" explains a person to a listener who did not ask, and a stranger would not say it. End on what was said or done.
11. **Do not announce the job or the point.** "I do the watch bill" says what the scene is about. The speaker does the job in front of the listener, or says what the job led to.
12. **Keep the detail possible here.** Mail comes in at a dock, not at an hour of the watch. A custom or an object must be one this ship has.
13. **Speech uses contractions.** "I don't", "it's", "we'll". The remembered lines kept for people ("You said you'd keep it to yourself.") are their speech too. Narration does not contract. A character keeps the full form for stress ("I do not want that") or because they are formal on purpose. `npm run prose` counts the quoted spans that still say it in full.

Test: say the line aloud as the speaker would, to someone they met an hour ago. If it needs a semicolon, rewrite it.
