# Voices for generated people

Status: Draft for the owner to judge (#455).

The cards in this folder are for the authored characters. This file is for everyone else the game makes: passengers, hired hands, bar patrons (`makePerson` in `js/people.js`). They are made by the hundred, so the unit that repeats is the trait, and a card here is for a trait, a culture or a secret, never for one person. The rules in `dialogue.md` and the registers in `narrator.md` apply to them as to anyone.

## How to build a voice

A generated person has two traits (`TRAITS` in `js/peopletext.js`), a culture (`earth`, `mars` or `belt`), a job and sometimes a secret.

1. **Diction and syntax come from the first trait.** It is the one the person is known by.
2. **Habits come from the second trait.** It colors what they do while they talk, and does not change how they talk.
3. **The culture sets the vocabulary.** What they count, what they compare things to, what they ask a stranger first.
4. **A secret sets what they leave out.** It shows as a question they turn, not as a hint from the narrator (rule 8 of `docs/prose-style.md`).
5. **A scene that is gated on a trait or a secret uses that card.** Complaints and Friction are `rude`, Card Game is `greedy`, Customs Inspection is `contraband`, Bounty Hunter is `wanted`.

Where two traits pull against each other (`nervous` and `brave`, `generous` and `greedy`), keep both: the first speaks, and the second shows in what the hands do.

## Traits

Each card gives the diction, the build of the speech, one habit, what they never say, and three lines that sound like them.

### talkative

Diction: Names, places and the people in them, before the point. "And that reminds me."
Syntax: Long and additive, with a story inside the story. A question is answered with the story the question reminded them of, and the answer arrives last or not at all.
Habit: They stop when someone puts a cup in front of them, and start again when it is empty.
Never says: A short answer where a long one will do. "To cut a long story short."
Samples:
- "My uncle ran that lane for nine years, and he used to say the pilotage was the only honest fee on it, because at least the tug turned up, which is more than you can say for the inspector, and he was not wrong about that."
- "Third bolt, you said? That was the one on the sink in the flat, the one the landlord swore he'd fixed, and I'll tell you, I have never trusted a landlord since."
- "No, go on, I'm listening. Where was I."

### nervous

Diction: The sound before the cause: a tick, a clank, a change in the hum. Counts things (hatches, exits, minutes).
Syntax: Short, with the question repeated. Starts a sentence, stops, and starts it again in different words.
Habit: Checks a seal or a gauge between sentences and does not look at the answer.
Never says: "It's fine." "Don't worry." Anything with a joke at its own expense, unless it is a bad one.
Samples:
- "Was that the pump? That was the pump. It does that, though, does it not. It does that on every flip."
- "How long to the next port. No, not the plan, how long. In days."
- "Sorry. I'll sit. I'm sitting."

### generous

Diction: Offers before they ask. "Have the rest." "Take mine."
Syntax: Plain and warm, with the offer in the first clause and the reason, if any, after. Waves off thanks by changing the subject to the food.
Habit: Counts out of their own pocket and says the number last, as a small thing.
Never says: What it cost them. "You owe me."
Samples:
- "Have the rest. I have eaten, and it will not keep."
- "There is a second cup, there, take it before it goes cold."
- "Forty, it was, I think. Put it toward the tug."

### greedy

Diction: Prices, margins and rates, in whole figures. Calls everything by what it would fetch.
Syntax: Brisk and complete. A proposal, then the terms, then "just to make it interesting." Never hurries to the point, and never leaves it.
Habit: Does sums on a hand terminal under the table and tells you the answer before you ask.
Never says: "It does not matter what it costs." "Keep the change." Anything that gives a figure away.
Samples:
- "A friendly game, with a little money on it. Five hundred is friendly. A thousand is a conversation."
- "I make it eleven percent on the run, not nine, and I would like to know who told you nine."
- "That is a fair price. I am sure it is fair, and I would like to see it written down."

### pious

Diction: The vocabulary of their faith, stated plainly, with the hour of the day attached ("at the turn of the watch"). Thanks rather than luck.
Syntax: Level and unhurried, with the same short phrase returning. Asks, and does not press.
Habit: Touches a charm, a bulkhead or the corner of a book before they answer a hard question.
Never says: A threat. "Luck." An argument for what they believe.
Samples:
- "I say it at the turn of the watch. It takes a few minutes. You may stay silent."
- "Thanks be that the weld held. I will not say it twice."
- "No, you did right to ask. I would have asked."

### rude

Diction: Specific, and always about the thing, not the person at first: the bunk, the coffee, the gravity. Then the person.
Syntax: Complete sentences with the verdict at the end, delivered in order, from a list. Never raises the volume. Repeats the line when it is challenged, in the same words.
Habit: Keeps a list, and reads from it. Turns a page before the worst one.
Never says: "Please." "I am sorry." A joke, unless it is one aimed at someone else.
Samples:
- "The bunk is too hard. The food is a crime. The coffee tastes of pipe."
- "I said it was flat. I did not say it was your fault. I said it was flat."
- "Who designed this galley, and were they drunk? I would like a name."

### curious

Diction: The part's name and then "how does it". Asks for the manual, not the explanation.
Syntax: Questions in a row, each one built on the last answer. Stops mid-sentence when something moves.
Habit: Has something in pieces on a flat surface, laid out in a row, with the manual open beside it.
Never says: "I do not need to know." "Whatever you think."
Samples:
- "If the loop is closed, where does the heat go? And then where does it go from there?"
- "Just a quick look. I will not touch anything. I have a rule about that, and I keep it until I do not."
- "Ah."

### drunk

Diction: Cheerful and too close: first names, "my friend", a song from home. Loses a word and goes around it.
Syntax: Starts well, trails, and picks up on a different subject. Agrees too quickly.
Habit: Holds an object upright and carefully: a spoon, a cup, a bottle with the label turned out.
Never says: "I have had enough." Their own number.
Samples:
- "No, no, I am fine, I am wonderful. Has anybody seen my other sock. It was here."
- "It is a very good bottle. You would like it. It was somebody's."
- "It was a small fix. I would call it a small fix."

### secretive

Diction: Careful and general. The place, never the street. "A family matter."
Syntax: Answers a question with a question, gracefully, and turns the talk back to you. Complete sentences, and never a name.
Habit: Closes a message window when someone passes. Takes meals in the bunk and locks the door to sleep.
Never says: A name, a date or a figure that could be checked.
Samples:
- "Family business. I would rather not, if you do not mind."
- "And you? How long have you had this ship?"
- "I would like to keep that one to myself, captain. It is no worse than most."

### kind

Diction: Small and specific: the light, the cup, the coat. Notices what is needed and says the name of it.
Syntax: Short and gentle, with a question that is really an offer. Makes a joke at their own cost to take the weight off yours.
Habit: Does the thing and mentions it afterward, if at all.
Never says: That they did it for you. "You should have asked."
Samples:
- "The light over your bunk was flickering. I changed the tube. It is nothing."
- "Sit a minute. I will take the rest of your watch. I was awake anyway."
- "Oh, that? I burn everything. The pot is fine."

### brave

Diction: The job, in its own words, with the time it takes. "A ten-minute job."
Syntax: Level and brief. Speaks after they have started, not before.
Habit: Whistles while checking hatches. Buckles the strap before they finish the sentence.
Never says: "I am not afraid." "Somebody has to." A claim about themselves.
Samples:
- "I will go, captain. It is a ten-minute job. I have done worse."
- "Hatch four is good. Hatch five is good. Hatch six is stiff, and I have oiled it."
- "You stay inside. It is a short walk."

### homesick

Diction: The place, with a sense in it: the smell of the bakery, the sound of the pipes, the light at six. Names a street where others name a port.
Syntax: Quiet, with the sentence trailing off at the name of someone. Short answers to questions about the present.
Habit: Looks at one fixed point of light. Holds a photograph, and puts it away before it is seen.
Never says: "I want to go home." What is wrong. Whether they will go back.
Samples:
- "There is a bakery on the corner. It opens at five. That is all."
- "I am fine. I am only looking."
- "At home it would be evening now. The pipes start to knock."

## Cultures

A culture colors what the person counts, compares things to, and asks a stranger. It does not change the trait's syntax.

### earth

Counts shifts owed and watches stood. Compares to the wall, the tide and the rota. Asks "which tier", not "which city". Dry about authority, and exact about time: "I owe the wall four." The sea wall is a rota that every household serves, so a favor is a shift and is remembered as one. (`bg.earth` in `backgrounds.md`.)

Sample: "I owe the wall four, and I am not going to be the one who tells them I did not turn up."

### mars

Counts shares (air, water) and votes. Compares to a rule of the dome and the council's accounts. Asks how many shares your household held. Argues the other side because it was taught to, and quotes the rule at an authority. (`bg.mars` in `backgrounds.md`.)

Sample: "The dome rule is plain, and I would like it read into the record before anyone decides."

### belt

Counts water and taps and hatch numbers. Compares to a sound: a tap by its note, a valve by how it sticks. Names a stranger by their hatch. Taps a pipe before speaking. (`bg.belt` in `backgrounds.md`.)

Sample: "Hatch eleven, deck four. We had the bad valve. You could hear it from the corridor."

## Secrets

How someone talks when the secret is in the room. It shows as what they avoid saying, never as a narrator's hint.

- **contraband:** speaks of the hold in general terms ("the cargo", never a bay) and asks how long a scan takes before it is mentioned.
- **wanted:** gives no home place, only a direction ("down the lane"). Sits with their back to a wall.
- **ill:** shortens sentences at the end, finishes the thought on the next breath. Offers no complaint and answers "fine" at once.
- **spy:** asks what everything costs, and keeps count of the answers. Answers a question about themselves with a question about the ship.
- **debt:** quotes the figure they owe to the credit, and nothing else about the creditor. Flinches at a hail.

## Dialogue risks

- Rule 2: with the tags hidden, two traits should not be interchangeable. A `rude` and a `nervous` person do not both ask the question twice.
- Rule 6: a generated person does not explain their trait. A `greedy` person never says "I like money".
- Rule 5: one object an exchange. The card lists the usual ones.
- Do not stack: use the first trait's syntax, not both. A person who is `talkative` and `nervous` runs on and checks the gauge; they do not run on in short bursts.
