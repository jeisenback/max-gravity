'use strict';

// The main characters: authored people who come with you, a pool the way the captains are: each game draws two.
// A hired hand finds them already aboard the captain's ship; an owner meets them at a port over the first
// weeks and offers them a berth. They are ordinary people in the registry (st.people) with more on them:
// a skill at each of the four posts, captain stats (trade, nerve, thrift, used when they command a ship),
// an age and an ambition. They grow by working their post, and each has a few scenes of their own.
// State: st.cast[key] = { pid, arc, since, flags, next, offered }. Loaded after character.js; only calls into the
// game at runtime.

const CAST_GOOD = 2;  // how well they must think of you for both to leave with you at a buy-in

// A scene fires when this many days have passed since they came aboard. `meet` is the owner's first meeting
// (offered at a port), `intro` the hired hand's first scene aboard; `late` is also played at a buy-in.
const CAST = {
  ines: {
    first: 'Ines', last: 'Ferreira', culture: 'earth', home: 'Lisbon Arcology', job: 'ferry pilot', age: 34, role: 'pilot',
    traits: ['curious', 'brave'], wage: 70,
    skills: { pilot: 3, gunner: 1, engineer: 1, slicer: 0 }, captain: { trade: 3, nerve: 4, thrift: 2 },
    ambition: 'Wants a ship she does not have to ask permission to land.',
    bio: 'She flew the Lisbon to Luna ferry for nine years, until the night she put a failing shuttle down on an unlit pad instead of ditching it as the tower ordered. Forty-one people walked off. She lost her license for the way she did it, and she kept the logbook.',
    // The story you learn sitting with her (family.js uses it in place of an invented one): the same slots, her own life.
    story: {
      left: 'a license lost over one landing', rel: 'old ferry chief', name: 'Duarte',
      hope: 'her license back, with the Lisbon board\'s stamp on it',
      homeDetail: 'the ferry pads at dawn, the harbor bell, and an ocean you could hear from the arcology at night',
      favor: null,  // her own asks are her scenes below
      news: {
        good: ['{who} stood up for her at the license board', '{who} sent the new ferry schedule with her old slot circled', '{who} has retired to a house with a garden and a view of the water'],
        bad: ['{who} is ill, and the old ferry crew are passing a hat', '{who} wrote that the board has put her appeal back another season', '{who} says the old ferry is being scrapped'],
      },
    },
    chatter: [
      'Ines is flying with one hand and writing in a logbook that is not the ship\'s with the other.',
      'Ines: "A good landing is boring. People forget that. I am very proud of my boring landings."',
      'Ines has taped a card to the nav display with a single word on it: ASK.',
      'Ines is running a dead-stick approach on the sim, humming, with her eyes shut.',
      'Ines: "Everybody wants to tell the pilot where to put the ship down. Nobody wants to be aboard when it does not."'
    ],
    // What they leave behind when they walk off or die (fate.js farewellFacts): a flag and its line, in priority order, two at most.
    farewell: {
      walk: 'Ines does not ask for leave. At the foot of the ramp on {planet} she writes the landing in the logbook, the pad and the time, and then she is gone.',
      facts: [
        ['reference', 'Your reference for the Lisbon board is folded into the back of her logbook, with the date of the hearing written on the fold.'],
        ['practiced', 'Her logbook has the dead-stick flip on a page of its own: ten seconds, cold thrusters, your hand on the cutoff.'],
        ['promised', 'On the last page of the logbook she has written the word someday, and no date.'],
      ],
    },
    scenes: {
      meet: {
        title: 'A Pilot Without a Ship',
        text: ('In the dock bar, a woman is cleaning a flight jacket, one seam at a time. "Ines Ferreira," she says, when you sit. "Ferry pilot on ' +
            'the Lisbon to Luna run until six months ago, when I put a failing shuttle down on an unlit pad instead of ditching her as the tower ' +
            'ordered. Forty-one people walked off. I lost my license for the way I did it." She turns the jacket over. "I can fly anything you can put ' +
            'a hull around. I would just like to be asked, not told."'),
        choices: [
          { label: 'Offer her the helm', ...gated(needBerth), run: () => castJoin('ines', ('Ines folds the jacket over one arm and looks at ' +
              'you for a moment. "Asked," she says. "Good." She follows you down the dock with a bag that holds, as far as you can tell, one logbook ' +
              'and nothing else.')) },
          { label: '"Not this time."', run: () => castLater('ines', 'She nods, and goes back to the jacket. "I will be around," she says.') },
        ],
      },
      intro: {
        title: 'The Woman at the Helm',
        text: 'Ines Ferreira has the helm, and has been flying with one hand for an hour, the other holding a logbook that is not the ship\'s. "Do not," she says, without turning round, "ask about the landing. Everybody asks about the landing." Nobody has, on this ship.',
        choices: [
          { label: 'Ask about the landing anyway', run: () => { castLike('ines', 1, 'I told you about the landing, and you did not look at me differently.'); return (
              'She is silent for most of a minute. Then she tells it flat and fast: the dark pad, the tower saying ditch, the forty-one faces she ' +
              'could see on the cabin feed, and the thing she decided. When she finishes she lets out a breath. "There," she says. "That is the whole ' +
              'thing. It is much shorter than I thought."'); } },
          { label: 'Ask about the book instead', run: () => { castLike('ines', 2, 'You asked about the book, not the landing.'); castXp('ines', 'pilot', 2); return (
              '"Oh," she says, and for the first time looks round. "It is my log. Every landing I have made, nine years of them, with the pad, the ' +
              'wind and what I would do differently." She turns it so you can see a column of small neat entries. "Most of what I know is in here." ' +
              'She lets you read one page, and you do.'); } },
        ],
      },
      mid1: {
        days: 10, title: 'Dead Stick',
        text: ('Ines catches you in the corridor, one hand on the bulkhead. "I want to run a dead-stick flip. Drive off, ten seconds, the whole turn ' +
            'on cold thrusters. It is the one thing I have never been allowed to practice, because it frightens the people who sign things." She ' +
            'waits. "I will not do it without somebody to say stop."'),
        choices: [
          { label: 'Stand by the cutoff while she does it', run() { castLike('ines', 2, 'You stood by the cutoff while I flew it dead.'); castFlag('ines', 'practiced'); castXp('ines', 'pilot', 4); return (
              'You put your hand on the cutoff and she cuts the drive. The ship drifts in a silence you feel in your teeth. Ines turns her on cold ' +
              'thrusters, a long clean arc, and when she brings the drive back up she is grinning so widely that she has to look away. "Ten seconds," ' +
              'she says. "I did not touch the stop." You did not say it.'); } },
          { label: 'Not on a loaded burn', run() { castLike('ines', 1, 'You said not on a loaded burn, and you were right.'); return (
              'She nods once. "That is the correct answer," she says. "Ask me again when there is nothing aboard but air." She goes back to the helm, ' +
              'and flies the rest of the shift by the book.'); } },
        ],
      },
      mid2: {
        days: 25, title: 'The Board',
        text: ('A message from the Lisbon licensing board comes in on a slow channel. Ines reads it twice, standing still, and then hands you the ' +
            'terminal without a word. A reinstatement hearing, in forty days, for anyone with a license who can find a reference: "a person of ' +
            'standing who has flown with the applicant, and will say so." She does not ask. She is watching the wall.'),
        choices: [
          { label: 'Write the reference', run() { castLike('ines', 3, 'You wrote my reference for the Lisbon board.'); castFlag('ines', 'reference'); return (
              'You write it that night, plainly, and it takes four tries because the first three sound like a eulogy. You say what you have seen: the ' +
              'care, the nerve, the logbook. When you send it, Ines is standing in the hatch and does not say anything at all. In the morning there is ' +
              'a mug of coffee on your console, and the bunk across from yours has been made with corners.'); } },
          { label: 'Offer to say it to the board in person', opinion: { who: 'ines', min: OPINION.TRUSTED }, run() { castLike('ines', 3, 'You offered to stand before the Lisbon board for me.'); castFlag('ines', 'reference'); return (
              'You say it before she can fold the message away. "I will come to Lisbon. I will stand up and say it myself." Ines turns from the ' +
              'wall. "It is forty days," she says. "You would be away from the ship for a week." "Then I will ask the captain for the week." She ' +
              'looks at you for some time. Then she takes the pencil from behind her ear and writes the date of the hearing on the inside of her ' +
              'wrist, the way she writes a landing slot, and holds it up for you to read. "In ten years," she says, "nobody has offered me a week."'); } },
          { label: '"It is not my place."', run() { castLike('ines', -1, 'You said a reference was not your place.'); return 'Her face does not change. "No," she says, "of course not." She folds the message and puts it away. She is polite for the rest of the day.'; } },
        ],
      },
      late: {
        days: 45, title: 'Permission to Land',
        text: ('It is late in the watch, and Ines is at the helm with the lights low. "May I say something that is not about flying?" she says. "I ' +
            'want a command. Not now. Someday, a ship with my name on her papers, where I do not have to ask anyone for leave to put her down. I have ' +
            'not said it to anybody since Lisbon." She does not look round. "If you ever have ships and need somebody to put in the chair, I would ' +
            'like to be asked."'),
        choices: [
          { label: 'Promise her a ship, someday', run() { castLike('ines', 2, 'I told you I wanted a command, and you promised.'); castFlag('ines', 'promised'); return (
              '"Someday," you say, "and you will be asked." She does not answer. Then she nods once at the windscreen. "That is all I wanted," she ' +
              'says. "A date would have been a lie. This is better."'); } },
          { label: 'Make no promises', run() { castLike('ines', 1, 'You would not promise a command, but you listened.'); return '"I cannot promise that," you say, "but I heard you." She smiles at the glass, crooked. "That is the honest answer," she says. "I will take the honest one."'; } },
        ],
      },
      pivot: {
        days: 60, title: 'Cold Thrusters',
        get text() {
          return 'The drive trips out on the approach and will not relight. The dock is closing, and there is no thrust to slow the ship, only the cold thrusters. Ines has both hands on the helm and the logbook shut beside her. "I can bring her in on these," she says. "It is the dead-stick flip again, with a dock at the end of it. I would like somebody at the cutoff."'
            + castRiskLines();
        },
        choices: [
          { label: 'Let her fly it', run: () => coldThrusters(false) },
          { label: 'Put a second hand at the cutoff', ...gated(needCrew(2)), run: () => coldThrusters(true) },
          { label: 'Order her to ditch', run() {
            castLike('ines', -3, 'You ordered me to ditch the ship, as the tower did.');
            return 'You order the ditch. She does it by the book, and the book is correct, and neither of you says that she would have made the pad.';
          } },
        ],
      },
    },
  },
  tomas: {
    first: 'Tomas', last: 'Achebe', culture: 'earth', home: 'Lagos Ring', job: 'dockyard welder', age: 41, role: 'engineer',
    traits: ['kind', 'homesick'], wage: 60,
    skills: { engineer: 3, slicer: 1, pilot: 1, gunner: 0 }, captain: { trade: 2, nerve: 2, thrift: 5 },
    ambition: 'Wants one ship kept running properly for ten years, with the same crew on her at the end of it.',
    bio: 'A dockyard welder who has rebuilt the same hull three times for three owners who each sold her out from under him. He sends most of his wages to a sister on Lagos Ring, and talks to every machine he works on.',
    // The story you learn sitting with him (family.js uses it in place of an invented one): the same slots, his own life.
    story: {
      left: 'three owners who each sold the same hull out from under him', rel: 'sister', name: 'Ngozi',
      hope: 'to buy out his sister\'s flat on Lagos Ring, so the rent never has to cross the gap again',
      homeDetail: 'ring gravity you could hang a bucket on, the weld shops going at shift change, and a market you could smell from the dock',
      favor: null,  // his own asks are his scenes below
      news: {
        good: ['{who} got the lease on the flat renewed for five years', '{who} sent a photo of the new stall, with a hand-painted sign', '{who} is back on her feet after being ill'],
        bad: ['{who} says the rent on {home} has gone up again', '{who} is ill, and the ring clinic wants money up front', '{who} lost the stall\'s permit and is looking for work'],
      },
    },
    chatter: ['Tomas is talking to the coolant loop, quietly, in Igbo.', ('Tomas: "She is not noisy. She is telling you something. Stop and listen, ' +
        'and then be embarrassed that you did not before."'), 'Tomas has left the engine room door open. He says she likes the air.',
        'Tomas is sending a message home, and counting something on his fingers, and sending it again.',
        'Tomas: "Ten years, one ship. That is the whole plan. People think I am being modest."'],
    // What they leave behind when they walk off or die (fate.js farewellFacts): a flag and its line, in priority order, two at most.
    farewell: {
      walk: 'Tomas shuts the engine room door, which he has never done, and says nothing to the plant. He takes the bag that clinks down the ramp at {planet}.',
      facts: [
        ['loan', 'The ring of braided wire he sent back with your two hundred credits is on the hook by the engine room door.'],
        ['plan', 'You can still say the plant back from memory, every valve of it, in his order.'],
        ['promised', 'He asked whether you would try to keep the crew together, and you said you would try.'],
      ],
    },
    scenes: {
      meet: {
        title: 'The Man with the Torque Wrench',
        text: ('It is three in the morning, and in the yard a heavyset man is rebuilding a coolant loop on somebody else\'s ship for no pay. "Tomas ' +
            'Achebe," he says, not looking up. "Welder. Engineer. Whatever you call a man who has rebuilt the same hull three times for three owners ' +
            'who sold her out from under him." He holds out the spanner handle-first. "Does your ship have a plant I could look after? Properly. For ' +
            'ten years."'),
        choices: [
          { label: 'Take him on as engineer', ...gated(needBerth), run: () => castJoin('tomas', ('He wipes his hands on the rag. Then he ' +
              'wipes them again. "Properly," he says, and picks up his bag, which clinks. "I will tell you now that I am going to talk to her. The ' +
              'engines. It is not a joke. They like it."')) },
          { label: '"Not this time."', run: () => castLater('tomas', '"That is all right," he says, and turns back to the loop. "I will be here. The ship I am working on will be sold in a month, and then I will be somewhere else, but I will be here."') },
        ],
      },
      intro: {
        title: 'The Engine Room Door',
        text: ('Tomas Achebe has left the engine room door open, which no engineer ever does. "Fresh air for her," he says, patting the housing. "She ' +
            'has not had a proper service in a year. Nobody asks me, so I do it in my own time." He has the plates off the coolant loop and the parts ' +
            'laid out on a rag in a careful row, each in the place it came from.'),
        choices: [
          { label: 'Offer to help with the service', run() { castLike('tomas', 1, 'You helped me with the service on my own time.'); castXp('tomas', 'engineer', 2); return (
              'He gives you a rag, a torque wrench and a short, kind lecture on what not to touch, and then you spend two hours on your back under a ' +
              'coolant loop. When you come out, black to the elbows, he looks at you for a while. "Next time," he says, "you are holding the light. ' +
              'You are better at that."'); } },
          { label: 'Leave him to it', run() { castLike('tomas', 0, 'You left me to my service.'); return ('He nods. "It is all right," he says. "Most ' +
              'people do. She will thank you anyway." He goes back to the loop, and you hear him, softly, as you leave, telling the pipes that nobody ' +
              'is angry at them.'); } },
        ],
      },
      mid1: {
        days: 10, title: 'Money Home',
        text: ('Tomas catches you in the galley with his jaw set. "I have a favor. Not a favor, a loan. My sister\'s transfer from the ring bounced, ' +
            'and I have not got the wage yet, and the rent on her flat is due." He says the number carefully, and does not meet your eye: two hundred ' +
            'credits. "I will pay it back from the first two pay days. I always pay it back."'),
        personal: true,
        choices: [
          { label: 'Lend him 200 cr', ...gated(needCr(200)), run() { G.state.credits -= 200; castLike('tomas', 3, 'You lent me two hundred credits for my sister\'s rent.'); castFlag('tomas', 'loan'); return (
              'He takes it with both hands. "Thank you," he says, and then, because it is not enough, he says it again in Igbo. By the second pay day ' +
              'the two hundred is in your account, with an extra: a ring of braided wire, on a note that says "for luck, from a man who understands ' +
              'machines".'); } },
          { label: '"I cannot spare it."', run() { castLike('tomas', -1, 'You could not spare two hundred credits.'); return (
              'He straightens his shoulders. "Of course," he says. "I should not have asked." He does not ask anyone else, and in the evening you ' +
              'hear him in the engine room, low and steady, working out a month of arithmetic on his fingers. The next day he has taken two extra ' +
              'shifts.'); } },
        ],
      },
      mid2: {
        days: 25, title: 'The Third Hull',
        text: ('Tomas is sitting on a crate in the engine room with a flask of something hot, looking at the reactor housing. "I rebuilt a hull like ' +
            'this three times," he says. "The same hull. For three owners. Every time I made her better, and every time they sold her to somebody who ' +
            'did not know." He turns the flask in his hands. "Do you want to know how I would rebuild her now? It would take a long time to tell."'),
        choices: [
          { label: 'Ask him to teach you', run() { castFlag('tomas', 'plan'); castLike('tomas', 2, 'You asked me how I would rebuild her, and listened.'); castXp('tomas', 'engineer', 2); if (hired()) gainSkill('engineer', 3); return (
              'It takes the whole of the quiet watch and half the next one. He draws it on the deck in chalk, a plant you would not know from a ' +
              'diagram, and then he makes you say it back. At the end you can hold the whole thing in your head, which has never been true of any ' +
              'machine before. "There," he says. "Now you know her. Do not tell the owners."'); } },
          { label: 'Ask him to write it down, so it does not go with the hull', opinion: { who: 'tomas', min: OPINION.TRUSTED }, run() { castFlag('tomas', 'plan'); castLike('tomas', 2, 'You asked me to write the plan down, so it would last.'); return (
              'He looks at the flask for a while. "Nobody has asked me that," he says. He goes below and comes back with a notebook with a stained ' +
              'cover, and spends the quiet watch filling eleven pages in small square capitals, a diagram on each. He tears them out along the fold, ' +
              'carefully, and puts them in your hand. "If she is sold again," he says, "somebody will need to know where the cracks are. Not the ' +
              'owners. Somebody." You fold the pages into your jacket, and he goes back to the plant and tells it, quietly, that it will be all right.'); } },
          { label: '"Stick to your shifts."', run() { castLike('tomas', -1, 'You told me to stick to my shifts.'); return 'He closes his mouth, and the flask, and nods. "As you say." The plant runs perfectly for the rest of the burn.'; } },
        ],
      },
      late: {
        days: 45, title: 'Ten Years',
        text: ('Tomas is waiting at the hatch when you come off watch, with his hands behind his back. "I want to ask you something, and you must not ' +
            'say yes to be kind. If you ever have a ship of your own, would you try to keep the crew together? Ten years. I am not asking for a ' +
            'promise. I am asking whether you would try."'),
        choices: [
          { label: 'Say you would try', run() { castLike('tomas', 2, 'You said you would try to keep the crew together.'); castFlag('tomas', 'promised'); return (
              '"I would try," you say, and he lets out a breath. "That is enough," he says. "Nobody has ever said that. They say yes, or no. Nobody ' +
              'says try." He claps your shoulder, once, hard, and goes below. You can hear him telling the engines the news.'); } },
          { label: 'Say you cannot promise that', run() { castLike('tomas', 1, 'You were honest about what you could promise.'); return (
              '"No," he says, "no, of course. Nobody can." He smiles. "Thank you for not being kind," he says. "It is a rare thing." He goes back to ' +
              'the engines, and, on the way, pats the bulkhead twice.'); } },
        ],
      },
      pivot: {
        days: 60, title: 'The Plant',
        get text() {
          return 'A coolant line lets go in the engine room and the plant climbs to a whine you feel in your fillings. The only way to hold her is to go in and close the valves by hand, with the compartment too hot to stand in. Tomas is already at the door with a wet rag over his face. "I know where she is cracked," he says. "I know where all of them are. Nobody else should be in there."'
            + castRiskLines();
        },
        choices: [
          { label: 'Let him go in', run: () => thePlant(false) },
          { label: 'Send a second person in with him', ...gated(needCrew(2)), run: () => thePlant(true) },
          { label: 'Tell him to vent the plant', run() {
            castLike('tomas', -3, 'You told me to vent the plant.');
            return 'You tell him to vent her. He stands at the door for a moment, and then he does it, and the plant dies with a sound like a long breath. He does not look at you. He goes below to tell her he is sorry.';
          } },
        ],
      },
    },
  },
  yelena: {
    first: 'Yelena', last: 'Quint', culture: 'mars', home: 'Olympus Dome', job: 'ring-ball striker', age: 29, role: 'gunner',
    traits: ['brave', 'rude'], wage: 60,
    skills: { gunner: 3, pilot: 1, engineer: 0, slicer: 1 }, captain: { trade: 2, nerve: 5, thrift: 2 },
    ambition: 'Wants to captain a ship the way she captained her ring-ball side: loud, and nobody left on the bench.',
    bio: 'Striker and captain of the Olympus Dome Ravens until a dislocated knee ended her ring-ball career at twenty-six. She took the only other job where you put something exactly where you meant to, and she is still in a bad mood about it.',
    chatter: ['Yelena is arguing with the ring-ball feed. The feed is losing.', ('Yelena: "A gun is just a very serious ball. Same principle. You do ' +
        'not look at the thing, you look at where it is going to be."'), ('Yelena is doing knee exercises in the corridor with the grim cheer of a ' +
            'woman who has been told to.'), 'Yelena: "Every ship I have been on has had a bench. Somebody sitting out, waiting to be asked. I hate it."', 'Yelena has painted a small black raven on the fire control housing, and dares anyone to say it is not regulation.'],
    scenes: {
      meet: {
        title: 'The Striker at the Rail',
        text: ('At the dock bar rail, a woman is icing a knee brace and arguing with the screen over the counter, which is showing a ring-ball ' +
            'replay. "That was a foul," she tells it, without turning. "That was a foul, and the ref is a coward." She turns to you at last. "Yelena ' +
            'Quint. Olympus Dome Ravens, captain, striker. Retired, they say, like it is a sentence." She taps the knee. "Now I aim things for a ' +
            'living, dome defense mostly, and the pay is an insult. I can put a round through a washer at four kilometers. Does your ship have guns ' +
            'that want somebody who cares where they land?"'),
        choices: [
          { label: 'Offer her the guns', ...gated(needBerth), run: () => castJoin('yelena', ('She puts the ice down and gets up so fast the ' +
              'stool falls over, and does not pick it up. "Do you know," she says, "you are the first person to ask me that as if it were a question." ' +
              'She is already walking. Over her shoulder, to the screen: "Do not think I have forgotten the foul."')) },
          { label: '"Not this time."', run: () => castLater('yelena', '"Sure," she says, and the stool, which she has set upright, rocks once. "I will be at the rail. I am usually at the rail."') },
        ],
      },
      intro: {
        title: 'The Gunner Who Argued with the Feed',
        text: ('On the first burn you find the gunner in the galley with her bad leg up on a chair, shouting at a ring-ball replay. "Foul," Yelena ' +
            'Quint says, to the screen, to the room, to nobody. "Look at the elbow. Look at it." Nobody has looked at the elbow. She says it with the ' +
            'loyalty of someone who has said it, to many rooms, for years. The feed, which has the decency not to answer, shows the elbow again, ' +
            'slowly.'),
        choices: [
          { label: 'Take the ref\'s side', run: () => { castLike('yelena', 2, 'You took the ref\'s side, and I enjoyed it very much.'); castXp('yelena', 'gunner', 2); return (
              'You say the elbow was clean, and for ten minutes she is the happiest you have seen her, taking you through the replay frame by frame ' +
              'with a fork for a pointer. By the end she has you pointing too. "You are wrong," she says, delighted, "and you know exactly where, and ' +
              'that is the whole game." She goes back to her post with a slight spring in the step, favoring the good knee.'); } },
          { label: 'Ask about the knee', run: () => { castLike('yelena', 1, 'You asked about the knee, and I told you.'); return (
              'She looks at you for a moment, deciding. "Twenty-six," she says. "Final. A girl from Hellas came in low, and I heard it before I felt ' +
              'it." She taps the brace. "They say it was nobody\'s fault. That is the worst part. Nobody to be angry with." She turns the replay off.'); } },
        ],
      },
      mid1: {
        days: 10, title: 'Pickup Game',
        text: ('Yelena finds you with a ball under one arm. It is a proper ring-ball, scuffed gray, and it has clearly traveled a long way in the ' +
            'bottom of a bag. "The hold is empty," she says. "Twenty tonnes of empty. I am going to put a ring at each end and play, and every person ' +
            'aboard is going to play, and you are going to be on my side." She does not make it a question.'),
        choices: [
          { label: 'Clear the hold and play', run() { castLike('yelena', 2, 'You played, and you were on my side.'); castXp('yelena', 'gunner', 3); return (
              'It is the worst ring-ball ever played. Low gravity, no lines, a ring made of tied cable. You are on her side, and she captains you the ' +
              'way she must once have captained the Ravens: loudly, unfairly and with her whole attention, and, in the end, with joy. You lose by two. ' +
              'She does not mention the score once, but at the evening meal she asks everybody, by name, how they feel about next week.'); } },
          { label: 'Not in the hold', run() { castLike('yelena', -1, 'You said no to the game in the hold.'); return '"Sure," she says, and puts the ball back in her bag, carefully. She is professional for the rest of the burn. It is the quietest the galley has been.'; } },
        ],
      },
      mid2: {
        days: 25, title: 'The Final',
        text: ('It is the night of the ring-ball final, and the Ravens\' old rivals from Hellas are playing in it. Yelena has spent two days ' +
            'pretending she does not care. She has the watch. "It is nothing," she says, at the hatch, with a bright, flat voice. "It is only a final. ' +
            'I will listen to the radio. Radio is fine."'),
        choices: [
          { label: 'Take her watch', run() { castLike('yelena', 3, 'You took my watch on the night of the final.'); return (
              'You tell her to go. She does not argue. You hear the roar from the galley, through the deck, from the second quarter on: shouted ' +
              'refereeing, a long agonized groan, and, near the end, a silence so complete you think the feed has gone. In the morning there is a ' +
              'small black raven drawn on the back of your hand, in marker, and she does not mention it.'); } },
          { label: '"It is your watch."', run() { castLike('yelena', -1, 'You said it was my watch on the night of the final.'); return (
              '"Of course," she says. She stands the watch perfectly, to the minute, with the radio turned low, and says nothing at all, then or ' +
              'after. When you come to relieve her she is at the guns with her chin up.'); } },
        ],
      },
      late: {
        days: 45, title: 'Nobody on the Bench',
        text: ('Yelena is cleaning the fire control housing when you find her, with the careful patience of someone saying a thing slowly in order to ' +
            'say it at all. "I want to run a ship," she says. "Not now. Someday. A whole crew, and nobody on the bench, nobody who is only a name on a ' +
            'list. Every ship I have been on has a bench. I would put everyone on the pitch." She does not look up. "If you ever have ships, I would ' +
            'like to be asked."'),
        choices: [
          { label: 'Promise her a ship, someday', run() { castLike('yelena', 2, 'I told you I wanted a ship with no bench, and you promised.'); castFlag('yelena', 'promised'); return (
              '"Someday," you say, "and you will be asked." She puts the cloth down. She is not good at standing still, and stands still, and says ' +
              '"Good," to the fire control, in a small voice, and then, louder, to the whole housing, "Did you hear that?"'); } },
          { label: 'Make no promises', run() { castLike('yelena', 1, 'You would not promise a ship, but you listened.'); return (
              '"I cannot promise that," you say, "but I heard you." She nods, once, sharply, like a referee, and the cloth goes back to the housing. ' +
              '"Fair," she says. "I will take fair. Fair is more than most of the bench ever got."'); } },
        ],
      },
      pivot: {
        days: 60, title: 'Over the Hull',
        get text() {
          const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6;
          return 'A ship is drifting across your path with her drive dark: disabled, and armed, going by the way she is not answering. Yelena is already at the hatch with her helmet under one arm. "I go first," she says. "I have always gone first. That is what a striker is for."'
            + (low ? ' Your own hull has taken a beating, and a bad hull is a bad place to fall back to.' : ' Your hull is sound, which is something.')
            + (medic ? ` ${medic.first} has the med kit open at the airlock.` : ' There is nobody aboard who can do more than a field dressing, and she knows it.')
            + ' She waits with her helmet under her arm and one boot over the hatch lip.';
        },
        choices: [
          { label: 'Let her lead', run: () => overTheHull(false) },
          { label: 'Send her with a second person', ...gated(needCrew(2)), run: () => overTheHull(true) },
          { label: 'Call it off', run() {
            castFlag('yelena', 'benched'); castLike('yelena', -3, 'You called off the boarding and put me on the bench.');
            return ('You tell her no, and cut the channel, and the drifting ship goes on drifting. Yelena stands at the hatch for a while with her ' +
                'helmet in her hand. "Fine," she says. She sits down on the bench by the airlock, straight, and does not say another word to you for ' +
                'the rest of the burn.');
          } },
        ],
      },
    },
  },
  ruben: {
    first: 'Ruben', last: 'Castellanos', culture: 'mars', home: 'Valles Dome', job: 'dome network administrator', age: 52, role: 'slicer',
    traits: ['talkative', 'generous'], wage: 80,
    skills: { slicer: 3, engineer: 1, gunner: 1, pilot: 0 }, captain: { trade: 5, nerve: 1, thrift: 3 },
    ambition: 'Wants every dome on Mars on one open band before he retires.',
    bio: ('He ran the Valles dome network for twenty-five years, and knows what every dome is short of this week, who is lying about it, and what ' +
        'they would pay. When the Concord closed the open band to break a strike, he kept a relay running in his own kitchen for eleven days, and was ' +
        'let go for it.'),
    chatter: [
      'Ruben: "Mars is not quiet. It is listening. There is a difference, and the difference is the whole business."',
      'Ruben is sorting a stack of intercepts into piles marked TRUE, FALSE, and LOVELY.',
      'Ruben has a thermos of something hot, and, as always, he offers it to everyone who passes.',
      'Ruben: "The dome at Hellas is short of pumps, and it is telling everyone it is short of morale. Remember that."',
      'Ruben is humming along with a dome council meeting, and has gone gently pink with indignation on behalf of the chair.'
    ],
    scenes: {
      meet: {
        title: 'The Man with the Relay',
        text: ('At the edge of the yard, among the stalls, a man in a cardigan far too warm for the hall is sitting behind a tangle of antennae with ' +
            'a thermos. "Ruben Castellanos," he says, and pours you a cup before you have said yes. "I know what every dome on Mars is short of this ' +
            'week, who is lying about it, and what they will pay. Twenty-five years on the Valles network. They let me go for keeping a relay running ' +
            'in my kitchen." He beams. "Does your ship have an ear?"'),
        choices: [
          { label: 'Take him on as comms', ...gated(needBerth), run: () => castJoin('ruben', ('He packs the whole stall into one battered ' +
              'case in what seems like a single motion, and presses the thermos into your hands. "Hold this," he says, "it is still hot, that is ' +
              'important." He talks the whole way to the ship: about the band, about your ship, about three domes you have never heard of, and about ' +
              'how glad he is. Nobody has the heart to interrupt.')) },
          { label: '"Not this time."', run: () => castLater('ruben', '"Of course," he says, and, because it is his nature, he pours you another cup. "Take it for the road. If you hear anything good on the bands, you know where my stall is. I will hear it first, mind."') },
        ],
      },
      intro: {
        title: 'The Quiet Band',
        text: ('The comms post is crowded. Ruben Castellanos has turned the whole station to a single narrow band, and has the volume up so that the ' +
            'galley can hear: a dome council arguing about a pump, in the flat courteous voices of people who have each been awake for two days. ' +
            '"Listen," he says, softly. "Listen to what they are not saying. That is the real message."'),
        choices: [
          { label: 'Listen with him', run: () => { castLike('ruben', 2, 'You sat and listened to the bands with me.'); castXp('ruben', 'slicer', 2); return (
              'You listen for most of an hour. It sounds, at first, like nothing: figures, polite interruptions. Then he nudges you, and you hear it: ' +
              'the same dome asking three times, in three different ways, whether the shipment is on time. "Frightened," Ruben says, beaming. "Of the ' +
              'answer. You see? You are very good at this. You have the ear."'); } },
          { label: 'Ask what he is listening for', run: () => { castLike('ruben', 1, 'You asked what I was listening for.'); return (
              '"Ah," he says, and holds up the thermos, as one raises a glass. "What they need. People never say it outright, but they tell you in ' +
              'ways they do not notice. A little too fast, a little too polite. That is when you know you are about to be useful." He turns the band ' +
              'down, gently, so as not to frighten them.'); } },
        ],
      },
      mid1: {
        days: 10, title: 'A Tip',
        text: ('Ruben comes to you with the look of a man holding something that might burst. "Captain. I have been listening to a freight dispatcher ' +
            'who thinks his channel is private. He is quite wrong. I have something, and I will tell you, but I should say that it was heard, not, ' +
            'strictly, asked for." He lowers his voice. "It is worth money. But it is a little bit in the way that a favor is worth money."'),
        choices: [
          { label: 'Act on the tip', run() { castLike('ruben', 2, 'You acted on what I heard.'); castXp('ruben', 'slicer', 2); const tip = addRumor(); return (
              `He tells you, and he is right to be careful: ${tip} He watches your face while you take it in, fiddling with the lid of the thermos. ` +
              `"Not a word," he says, delighted, "about where you heard it. A good listener has no name."`); } },
          { label: 'Leave it', run() { castLike('ruben', 1, 'You left the dispatcher\'s secret alone.'); return (
              'He deflates, and then rallies. "You are quite right," he says. "It is not mine to sell." He goes back to the post, and, for a day or ' +
              'so, is more careful about where he points the dish.'); } },
        ],
      },
      mid2: {
        days: 25, title: 'What the Bands Say',
        text: 'Ruben has been hearing your ship\'s name on the bands. A trader at Phobos said something kind about the way you pay. A pirate on a short-range channel said something rather less kind. He plays them both for you, and then plays them a second time, the kind one louder.',
        choices: [
          { label: 'Ask him to keep an ear on it', run() { castLike('ruben', 2, 'You asked me to keep an ear on what is said about the ship.'); castXp('ruben', 'slicer', 2); return (
              '"Of course. Of course." He is glowing. For the rest of the burn there is a small notebook next to the comms console, titled, in his ' +
              'careful hand, WHAT IS SAID, and each page is a name, a time, and a verdict. By the end, you could write the ship\'s biography from it.'); } },
          { label: 'Tell him not to bother with gossip', run() { castLike('ruben', 0, 'You told me not to bother with gossip.'); return '"Gossip," he says, softly. "Yes. Of course." He turns the second recording off, carefully.'; } },
        ],
      },
      late: {
        days: 45, title: 'One Band',
        text: ('It is late, and Ruben is sitting alone at the comms post with the lights down and the thermos untouched. "Captain, I want to say ' +
            'something I have said to no one since the kitchen." He turns his chair. "I want every dome on Mars on one open band. Not for money. I ' +
            'want anyone, anywhere under the glass, to be able to ask for help and be heard. If you ever have a ship with room for a relay, I would ' +
            'like to be the one who carries it."'),
        choices: [
          { label: 'Promise him a ship, someday', run() { castLike('ruben', 2, 'I told you about the open band, and you promised.'); castFlag('ruben', 'promised'); return (
              '"Someday," you say, "and there will be room for a relay." He does not say anything for some time. Then he picks up the thermos, and, ' +
              'ceremonially, pours a cup, and sets it in front of you, and for once he does not tell you what is in it.'); } },
          { label: 'Make no promises', run() { castLike('ruben', 1, 'You would not promise, but you listened.'); return (
              '"I cannot promise that," you say, "but I heard you." He smiles, crookedly, and nods. "That is what the open band is for," he says. ' +
              '"Not promises. Being heard." He turns the volume up on the quiet band, and, together, for a while, you sit and listen.'); } },
        ],
      },
    },
  },
  bexa: {
    first: 'Bexa', last: 'Oyelaran', culture: 'belt', home: 'Ceres Station', job: 'salvage tug pilot', age: 41, role: 'pilot',
    traits: ['secretive', 'kind'], wage: 70,
    skills: { pilot: 3, engineer: 1, slicer: 1, gunner: 0 }, captain: { trade: 3, nerve: 3, thrift: 4 },
    ambition: 'Wants to bring one ship home that everybody else had given up on, and see her fly again.',
    bio: 'She pulled dead ships into Ceres on a tug for twenty years. She keeps a list of every crew she found aboard them, the living and the others, and she does not talk about the list unless you ask the right way.',
    chatter: [
      'Bexa: "A derelict is not dead. It is waiting. You just have to be patient enough to find out what for."',
      'Bexa is flying with the grip of someone who has pulled many things out of the dark and is not about to lose this one.',
      'Bexa has a small brass tag on a string above the console. She will not say whose it was.',
      'Bexa: "In the Belt we do not leave a ship. Not for money. Not for orders. You tow her home."',
      'Bexa is humming a tug-pilot lullaby, low, to the transponder.'
    ],
    scenes: {
      meet: {
        title: 'The Tug Pilot',
        text: ('Down on the Ceres docks, a woman in a patched tug jacket is signing a salvage chit with a pen on a chain, with the unhurried air of ' +
            'someone who has done this many more times than anyone has thanked her. "Bexa Oyelaran," she says, when you ask. "Twenty years towing dead ' +
            'ships home. You learn what a ship wants. Mostly, to be found." She caps the pen. "The blockade killed the work. Nobody sells a wreck any ' +
            'more, they keep them. I would like a ship I can fly instead of tow."'),
        choices: [
          { label: 'Offer her the helm', ...gated(needBerth), run: () => castJoin('bexa', ('She looks at you with a level gaze. Then she ' +
              'hangs the pen on its chain from her belt and picks up her bag. "I will take your helm," she says. "I will tell you now that I talk to ' +
              'the transponder. It is not a problem. It listens better than most people."')) },
          { label: '"Not this time."', run: () => castLater('bexa', '"That is all right," she says. "I know where the docks are. There is always another wreck." She says it kindly, and means it, and you suspect there are not as many wrecks as she is saying.') },
        ],
      },
      intro: {
        title: 'The List',
        text: ('Bexa Oyelaran has the helm, and, taped inside the console cover where only the pilot can see it, a list. It is written in small, even ' +
            'handwriting, in a dozen colors of ink: names, and beside each name a date and a hull number. She sees you looking. "The crews," she says, ' +
            'evenly. "The ones I found. All of them. Living, and otherwise." She does not close the cover. "Most people ask me not to say."'),
        choices: [
          { label: 'Ask about the living ones', run: () => { castLike('bexa', 2, 'You asked about the ones who lived.'); castXp('bexa', 'pilot', 2); return (
              'Her face changes completely. "Oh," she says, and for the first time, smiles. "Eleven. Eleven of them lived. There is a boy on Pallas ' +
              'who sends me a card every year with the same drawing of a tug, and a woman at Hygiea who runs a water shop and gives me a free flask ' +
              'every time I dock." She runs a finger down the list, stopping at the names, one at a time. "That is the part I put the list here for."'); } },
          { label: 'Ask about the others', run: () => { castLike('bexa', 1, 'You asked about the others, and listened.'); return (
              'She is silent for a long time. "Thirty-one," she says. "I make sure I say their names once a year, out loud, on the day I found them. ' +
              'Somebody should." She closes the cover, finally, gently, as you would a door on someone sleeping. "Thank you for asking. It is not what ' +
              'most people ask."'); } },
        ],
      },
      mid1: {
        days: 10, title: 'A Wreck on the Scope',
        text: ('A transponder is repeating a ship\'s name every four seconds, faint and old, a few hours off the lane. Bexa has her hand flat on the ' +
            'console. "It is a derelict," she says. "She has been calling a long time. A few hours, no more. It is not my ship to ask for. But I would ' +
            'like to look." She keeps her eyes on the scope. "I will not do it if you say no."'),
        choices: [
          { label: 'Take the detour', run() { castLike('bexa', 2, 'You took the detour to look at the wreck.'); castXp('bexa', 'pilot', 3); if (G.transit) delay(6); return (
              'She brings the ship in slow and gentle, the way you approach a frightened animal. The wreck is a small hauler, dark and cold, her ' +
              'hatches sealed, her beacon the only living thing on her. Nobody aboard. Bexa stays on the scope until the beacon is a speck, and then, ' +
              'quietly, writes a name on a list you cannot see. "She was called the Patient Wren," she says. "I will tell the registry. She will be ' +
              'towed home." She flies the rest of the shift with a lighter touch.'); } },
          { label: 'Stay on course', run() { castLike('bexa', -1, 'You would not let me look at the wreck.'); return (
              '"No," she says. "Of course. It is not my ship." She takes her hand off the console slowly, and the transponder\'s faint call fades ' +
              'behind you, four seconds at a time, until you cannot hear it. She flies on, correct and silent, and later you see her write something ' +
              'small on the inside of the console cover.'); } },
        ],
      },
      mid2: {
        days: 25, title: 'The Ghost on the Scope',
        text: ('The scope paints a ship at forty thousand kilometers, closing. Bexa looks at it for exactly four seconds. "Ghost," she says. Then, ' +
            'because you have not moved: "In the Belt, a ghost is mostly a real ship. But this one has a ghost\'s manners: it is too tidy, the heading ' +
            'is a slightly wrong shade of straight. Sensor echo off the ice. I have seen it forty times." She waits. "I would like to ignore it."'),
        choices: [
          { label: 'Trust her', run() { castLike('bexa', 2, 'You trusted me about the ghost on the scope.'); castXp('bexa', 'pilot', 2); return (
              'You tell her to carry on. She nods once, and she does, and for the next twenty minutes the whole ship waits with her, listening to the ' +
              'thing she is certain is not there. At the end, the contact goes pale, and thins, and is gone, like breath on a pane. Bexa lets out a ' +
              'long, slow exhale. "Echo," she says. "Forty-one." She does not say thank you. She puts a small tick on the inside of the console ' +
              'cover.'); } },
          { label: 'Raise the alarm anyway', run() { castLike('bexa', -1, 'You raised the alarm about a ghost I had called.'); return (
              'The alarm goes, and the crew goes to stations, and in twenty minutes the contact fades to nothing, as she said it would. Bexa takes ' +
              'the ship off alert herself, calmly, without a word, and flies on. "Better safe," she says at last, and means it, almost. She is quiet ' +
              'for a day, and more careful afterward about telling you what she sees.'); } },
        ],
      },
      late: {
        days: 45, title: 'The Ship Nobody Wanted',
        text: ('Bexa is at the helm with the lights low and the console cover open, and she is not looking at the list. "I have a thing to say, and I ' +
            'would like to say it once." She turns. "I want a ship. Not to tow. A wreck that everyone else has given up on, that I bring home, and put ' +
            'right, and fly. A ship nobody wanted, and that wants to go." She looks at her hands. "If you ever have ships, I would like to be asked."'),
        choices: [
          { label: 'Promise her a ship, someday', run() { castLike('bexa', 2, 'I told you about the ship nobody wanted, and you promised.'); castFlag('bexa', 'promised'); return (
              '"Someday," you say, "and you will be asked." She does not answer for a moment. Then she takes a small brass tag from above the ' +
              'console, on its string, and holds it in her palm. "He would have liked you," she says, to nobody in particular, and puts it carefully ' +
              'back.'); } },
          { label: 'Make no promises', run() { castLike('bexa', 1, 'You would not promise, but you listened.'); return (
              '"I cannot promise that," you say, "but I heard you." She nods slowly, and her mouth does something small and crooked. "That is the ' +
              'right answer," she says. "A promise is a tow rope. Do not put one on a ship you have not looked at."'); } },
        ],
      },
    },
  },
  pax: {
    first: 'Pax', last: 'Iwu', culture: 'belt', home: 'Ceres Warren', job: 'ice-drill operator', age: 23, role: 'gunner',
    traits: ['nervous', 'curious'], wage: 60,
    skills: { gunner: 3, engineer: 2, pilot: 0, slicer: 0 }, captain: { trade: 4, nerve: 2, thrift: 2 },
    ambition: 'Wants to stop flinching, and run a ship where nobody gets hurt on their watch.',
    bio: 'Pax ran a drill laser on a Ceres ice crew from sixteen, cutting blocks to the gram, until a coupling failed and the crew\'s foreman was hurt with Pax at the controls. It was nobody\'s fault, and nobody has been able to convince Pax of that.',
    chatter: [
      'Pax is on the range, again, with a perfect score and a tight jaw.',
      'Pax: "I know the numbers. The numbers are fine. It is the part after the numbers I am bad at."',
      'Pax checks the coupling on the gun mount for the fifth time this watch, and says nothing, and checks again.',
      'Pax is reading the manual for a fire control system that Pax has already memorized, for comfort.',
      'Pax: "It is funny. I am not nervous when it is only me and the target. It is when there is somebody beside me."'
    ],
    scenes: {
      meet: {
        title: 'The Kid at the Range',
        text: ('In the dock bar there is a dart-laser board, and a young person at it with a perfect, unnerving score, who flinches at every cheer. ' +
            'Nobody is cheering for long. "Pax Iwu," says the kid, when you sit. "Ice-drill operator. Was." The hand with the dart goes still. "I am ' +
            'good with a laser. I am the best in the Warren. I want a job where nobody is standing next to the thing when it fires." They look up. "That ' +
            'is a bad thing to say, I know."'),
        choices: [
          { label: 'Offer them the guns', ...gated(needBerth), run: () => castJoin('pax', ('The dart goes down, carefully. "Really?" Pax ' +
              'says, and then, because that sounded like asking for too much: "I mean, thanks. Yes. I mean, I will try not to flinch." You tell them ' +
              'the flinching can come, too. Pax picks up a small bag.')) },
          { label: '"Not this time."', run: () => castLater('pax', '"Right," Pax says, to the board, and puts a dart in the center, and then another beside it. "Sure. I am around. I am always around. I am here every evening." They say it lightly. It is an effort, and it shows.') },
        ],
      },
      intro: {
        title: 'The Range Record',
        text: ('Pax Iwu is in the weapons bay with a handheld and a record of range scores, a long column of perfect hits, and a frown. "I have never ' +
            'missed on the range," Pax says, to the screen. "Not one in three years. But the range is not real, is it?" They glance up, quickly, away. ' +
            '"Is it different? When it is real?"'),
        choices: [
          { label: 'Tell them honestly that it is different', run: () => { castLike('pax', 2, 'You told me the truth about what it is like when it is real.'); castXp('pax', 'gunner', 2); return (
              '"Yes," you say. "It is different. It is louder, and everything you do matters, and your hands shake. Everybody\'s do. You do it ' +
              'anyway, and it gets quieter." Pax lets out a breath, slowly. "Thank you," they say. "Everybody else says it is the same. It is a relief ' +
              'to be told it is not." They go back to the scores.'); } },
          { label: 'Say it is the same: aim, breathe', run: () => { castLike('pax', 1, 'You told me to aim and breathe.'); return (
              '"Aim, breathe," Pax repeats, and writes it, in small letters, on the inside of the handheld case. "Aim. Breathe." They say it over, as ' +
              'you would a short prayer. It is not a lie, exactly, and it will not be enough, but it is something to hold onto when the hands start.'); } },
        ],
      },
      mid1: {
        days: 10, title: 'The Coupling',
        text: ('The gun mount needs its coupling checked, a ten-minute job that Pax has done many times, and which they are standing in front of ' +
            'without moving. The wrench is in their hand. They have not moved it. "I can do it," Pax says, quietly, to the coupling. "I know I can do ' +
            'it. It is only a coupling." They stand there, and their knuckles are pale around the tool.'),
        choices: [
          { label: 'Check it together', run() { castLike('pax', 2, 'You checked the coupling with me.'); castXp('pax', 'gunner', 3); return (
              'You stand beside them, not helping, just present, and, after a minute, Pax puts the wrench to the coupling. It takes twelve minutes, ' +
              'not ten. When it is done, Pax breathes out for what must be the first time in a quarter hour, and tests it, twice, and nods. "Good," ' +
              'they say. "It is good." They do not say anything else for a while, and it is a peaceful kind of silence.'); } },
          { label: 'Do it for them', run() { castLike('pax', 0, 'You did the coupling for me.'); return ('You take the wrench, and do it in nine ' +
              'minutes. Pax says "Thank you," in a small voice and watches your hands the whole time. Pax tests the coupling after you, quietly, when ' +
              'they think no one is looking, and finds it perfect, and does not look any happier about it.'); } },
        ],
      },
      mid2: {
        days: 25, title: 'The Foreman\'s Message',
        text: ('A message from Ceres has been sitting unopened in Pax\'s queue for three days, with a sender name Pax will not say aloud. You know ' +
            'what it is when you see their face. "It is from Foreman Dagny," Pax says, finally. "I do not know what it says. I know what I think it ' +
            'says. I have thought it so many times that I do not need to read it." They are holding the handheld at arm\'s length, like something ' +
            'hot.'),
        choices: [
          { label: 'Offer to sit with them while they read it', run() { castLike('pax', 3, 'You sat with me while I read the foreman\'s message.'); castXp('pax', 'gunner', 2); castFlag('pax', 'foreman'); return (
              'You sit on the deck beside them, with your back to the bulkhead, saying nothing, and Pax opens it. It is short. The foreman is walking ' +
              'again, with a stick, and does not blame anybody, and would like to see the kid some day. Pax reads it twice, and puts the handheld ' +
              'face-down on their knee, and cries, quietly, for about a minute. Then Pax wipes their face on a sleeve and says, "He says to practice. ' +
              'He says I have the best hands in the Warren." They laugh, a damp, astonished sound.'); } },
          { label: 'Tell them to read it when they are ready', run() { castLike('pax', 0, 'You told me to read it when I was ready.'); return (
              '"Yes," Pax says. "When I am ready." It sounds like the right thing, and they put the handheld away. It stays unopened for the rest of ' +
              'the burn. When you pass the weapons bay, Pax has taken it out, and is holding it, and looking at the sender\'s name, and putting it ' +
              'back.'); } },
        ],
      },
      late: {
        days: 45, title: 'Without Flinching',
        text: ('Pax finds you outside the weapons bay, with hands that have stopped shaking, and an alarmed look. "I have not flinched in nine days," ' +
            'they say. "I counted." They take a breath. "I want to run a ship one day. A ship where nobody gets hurt on my watch. I know that is not a ' +
            'thing you can promise, that is exactly why I want it." They look at the deck. "If you ever have ships, I would like to be asked."'),
        choices: [
          { label: 'Promise them a ship, someday', run() { castLike('pax', 2, 'I told you about the ship where nobody got hurt, and you promised.'); castFlag('pax', 'promised'); return (
              '"Someday," you say, "and you will be asked." Pax\'s face does something complicated, and then settles into a wide, helpless grin. ' +
              '"Nine days," they say. "Nine days, and a ship. If I tell the foreman he will not believe me." They go away down the corridor, walking ' +
              'straight, with their hands in plain view.'); } },
          { label: 'Make no promises', run() { castLike('pax', 1, 'You would not promise a ship, but you listened.'); return (
              '"I cannot promise that," you say, "but I heard you." Pax nods. "That is fair," they say. "It would be strange to be promised. I am not ' +
              'used to it." They smile, a small crooked one, and then, to your surprise, they say, "Nine days is already a good thing, though. I will ' +
              'take that."'); } },
        ],
      },
    },
  },
};

// Who you meet. Each game draws two from the pool (drawCastPair), of different posts where it can, and keeps them in st.castPair. CAST_PAIRS
// is how the pairs used to be given, by start background: a game saved before the draw keeps the pair it had, and the tests use it
// to start from a pair they know (tests/helpers.js).
const CAST_PAIRS = { earth: ['ines', 'tomas'], mars: ['yelena', 'ruben'], belt: ['bexa', 'pax'] };
const castPool = () => Object.keys(CAST).filter(k => !CAST[k].xo);
// A main character of the start background's own culture is this many times as likely as one from elsewhere, so an earth start is mostly
// Earth people, and now and then not.
const CAST_HOME_WEIGHT = 3;
function drawCastPair(background) {
  const take = keys => pickWeighted(Object.fromEntries(keys.map(k => [k, CAST[k].culture === background ? CAST_HOME_WEIGHT : 1])));
  const pool = castPool(), first = take(pool), rest = pool.filter(k => k !== first), other = rest.filter(k => CAST[k].role !== CAST[first].role);
  return [first, take(other.length ? other : rest)];
}
function castPair() {
  const st = G.state;
  if (!st.castPair) st.castPair = Object.keys(st.cast || {}).some(k => CAST[k] && !CAST[k].xo) ? [...(CAST_PAIRS[st.background] || [])] : drawCastPair(st.background);
  return st.castPair;
}
const POST_ROLES = ['pilot', 'gunner', 'engineer', 'slicer'];

// ---------- people ----------

function castPerson(key) {
  const st = G.state, d = CAST[key];
  st.cast = st.cast || {};
  const rec = st.cast[key] = st.cast[key] || { arc: 0, flags: {}, next: 0 };
  if (rec.pid && st.people[rec.pid]) return st.people[rec.pid];
  const skills = { ...d.skills }, xp = Object.fromEntries(Object.entries(skills).map(([r, n]) => [r, SKILL_STEPS[n]]));
  const p = {
    id: `c:${key}`, cast: key, first: d.first, last: d.last, culture: d.culture, home: d.home, job: d.job, age: d.age, ambition: d.ambition, bio: d.bio,
    traits: [...d.traits], goal: 'job', wealth: 2, secret: null, opinion: 0, memories: [], location: null, mood: null,
    skills, xp, captain: { ...d.captain }, role: d.role, skill: skills[d.role], wage: d.wage, fee: d.wage * 30,
  };
  registerPerson(p);
  rec.pid = p.id;
  return p;
}
const castRec = key => { castPerson(key); return G.state.cast[key]; };
const castAboard = () => G.state.crew.map(person).filter(c => c && c.cast);

// They take a post: their own if it is free, otherwise the free one they are best at.
function castPost(key, role) {
  const p = castPerson(key);
  p.role = role; p.skill = p.skills[role];
  return p;
}

// A hired hand's crew: the pair come aboard first, on their own posts if you are not on them, and the roles they
// do not fill are left to the generated crew. Returns the roles they took.
function castCrew(background, free) {
  const st = G.state, keys = (st.castPair = st.castPair || drawCastPair(background)), left = [...free], took = [];
  for (const key of keys) {
    const d = CAST[key], role = left.includes(d.role) ? d.role : [...left].sort((a, b) => (d.skills[b] || 0) - (d.skills[a] || 0))[0];
    if (!role) continue;
    left.splice(left.indexOf(role), 1); took.push(role);
    const p = castPost(key, role);
    st.crew.push(p.id);
    castRec(key).since = st.day;
  }
  return took;
}

const castLike = (key, n, memory) => like(castPerson(key), n, memory);
const castFlag = (key, name) => { castRec(key).flags[name] = true; };

// Experience at a post: a level comes at each step (hired.js), and the skill the post uses follows.
function castXp(key, role, n) {
  const p = castPerson(key), before = p.skills[role] || 0;
  p.xp[role] = (p.xp[role] || 0) + n;
  p.skills[role] = Math.max(before, SKILL_STEPS.filter(s => p.xp[role] >= s).length - 1);
  if (role === p.role) p.skill = p.skills[role];
  if (p.skills[role] > before) comm(`[Crew] ${p.first} has grown at the ${POSTS[Object.keys(POSTS).find(k => POSTS[k].role === role)].name.toLowerCase()} post.`);
}

// ---------- command ----------
// A main character can command a company ship (company.js). Until they have skill 2 at some post and have been with you
// CAPTAIN_DAYS days they are green, and run it with every captain stat two lower.
const CAPTAIN_SKILL = 2, CAPTAIN_DAYS = 60;
const bestRole = p => Object.keys(p.skills).sort((a, b) => p.skills[b] - p.skills[a])[0];
function captainGrade(p) {
  const skill = p.skills[bestRole(p)], days = G.state.day - ((G.state.cast[p.cast] || {}).since || 0);
  return { skill, days, ready: skill >= CAPTAIN_SKILL && days >= CAPTAIN_DAYS };
}
// Back with you, berth or no: a main character is not left stranded when their ship is sold or lost.
function castReturn(p) {
  if (p.cast && castDead(p.cast)) return;
  const st = G.state;
  if (!st.crew.includes(p.id)) st.crew.push(p.id);
  p.location = null;
}

// ---------- coming aboard ----------

function castJoin(key, text) {
  const st = G.state, p = castPerson(key), rec = castRec(key);
  p.role = CAST[key].role; p.skill = p.skills[p.role];
  st.crew.push(p.id);
  rec.since = st.day;
  like(p, 2, `I signed on with ${shipTitle()}.`);
  homeLog(`${p.first} ${p.last} came aboard as ${ROLE_NAMES[p.role].toLowerCase() === 'engineer' ? 'an' : 'a'} ${ROLE_NAMES[p.role].toLowerCase()}.`);
  return text;
}
function castLater(key, text) {
  castRec(key).next = G.state.day + 8;
  return text;
}

// The owner's meetings: the first after the tutorial and a few days out, the second a while after the first is
// settled (joined, or put off once). A put-off meeting comes round again after a week.
function castDue() {
  const st = G.state;
  if (hired() || st.tutorial != null) return null;
  const keys = castPair();
  if (!keys.length) return null;
  for (const [i, key] of keys.entries()) {
    if (castDead(key)) continue;
    const rec = castRec(key);
    if (st.crew.includes(rec.pid)) continue;
    const prior = keys[i - 1] && !castDead(keys[i - 1]) && castRec(keys[i - 1]);
    if (prior && !st.crew.includes(prior.pid) && !prior.offered) return null;  // in a set order
    return st.day >= 5 + 9 * i && st.day >= (rec.next || 0) ? key : null;
  }
  return null;
}

// What fires next for someone aboard: their next scene, when it is due. Hired hands skip `meet`, owners skip `intro`.
function castNext(key) {
  const rec = castRec(key), order = ['intro', 'mid1', 'mid2', 'late', 'pivot'], seen = rec.arc || 0;
  const name = order[seen];
  if (!name) return null;
  const sc = CAST[key].scenes[name];
  if (!sc) return null;  // not everyone has a pivot yet
  if (name === 'intro' && !hired()) { rec.arc = 1; return castNext(key); }  // an owner met them at a port instead
  const days = sc.days || 0;
  return G.state.day - (rec.since || 0) >= days ? { name, sc } : null;
}

// At a buy-in, the main character whose last scene is still to come gets it now, as they leave with you.
function castLateAtBuyIn() {
  for (const p of castAboard()) {
    const rec = castRec(p.cast);
    if (rec.arc === 3) { rec.arc = 4; return castScene(p.cast, CAST[p.cast].scenes.late); }
  }
  return null;
}

// Yelena's pivot (fate.js decides who lives): a point each for a medic who is not hurt, a hull above 60 percent, her gunner
// skill at 3 or more, and a second person with her. Three or more she lives, two she is marked, fewer she dies.
const castHullPoints = backup => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0)
  + (person('c:yelena').skills.gunner >= 3 ? 1 : 0) + (backup ? 1 : 0);
function overTheHull(backup) {
  const points = castHullPoints(backup), promised = castRec('yelena').flags.promised;
  const outcome = castFate('yelena', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Went over the hull first near ${system().name}.`, 'Left hand never closes properly.', 'gunner');
  const lead = backup ? 'You send a second hand over with her. ' : '';
  if (outcome === 'die') {
    return lead + ('She goes over first, as she said she would. The channel carries the first shot, and then something that is not a voice, and then ' +
        'the party, shouting her name. You bring the ship alongside, and you are too late, and everyone knows it. When the others come back across the ' +
        'gap they carry the ring-ball from her bag, and nobody says anything about the foul.')
      + (promised ? ' You remember the ship you promised her, and that nobody will ask for it now.' : '');
  }
  castLike('yelena', 2, outcome === 'mark' ? 'You let me go first, and I came back with a hand that does not close.' : 'You let me go first, and I came back.');
  if (outcome === 'mark') {
    return lead + ('She goes over first, and it goes wrong at the inner lock, and for a long minute the channel is nothing but breath and shouting. ' +
        'She comes back across the gap carried, and the hand she led with does not close the way it did. "Do not," she says, to your face, "say it was ' +
        'worth it. Just say I was there."');
  }
  return lead + 'She goes over the hull first, as she said she would, and the party follows. It is loud and fast and over before you have finished counting. She comes back across the gap with a split lip and a stranger\'s cap in her fist. "Nobody on the bench," she says.'
    + (promised ? ' "You said someday," she adds.' : '');
}

// The hull and the medic, as the pivot scenes state them (Yelena's, Ines's, Tomas's), so the player sees what will count.
function castRiskLines() {
  const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6;
  return (low ? ' Your own hull has taken a beating, and a bad hull is a bad place to fall back to.' : ' Your hull is sound, which is something.')
    + (medic ? ` ${medic.first} has the med kit open at the hatch.` : ' There is nobody aboard who can do more than a field dressing.');
}
const castRiskPoints = () => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0);
const castPoints = n => (n >= 3 ? 'live' : n === 2 ? 'mark' : 'die');

// Ines's pivot: a point each for a medic, a hull above 60 percent, the dead-stick flip practiced with you, and a second hand at the cutoff.
function coldThrusters(backup) {
  const rec = castRec('ines'), practiced = !!rec.flags.practiced, promised = !!rec.flags.promised;
  const outcome = castFate('ines', castPoints(castRiskPoints() + (practiced ? 1 : 0) + (backup ? 1 : 0)), `Flew the ship in dead stick near ${system().name}.`, 'Her left hand shakes on the stick.', 'pilot');
  const lead = backup ? 'You put a second hand at the cutoff. ' : '';
  if (outcome === 'die') {
    return lead + 'The flip is a half second late. You hear the tower, and then the cutoff, and then the pad. When the crew reach the helm the logbook is open on the chair, and the last entry is half written.'
      + (promised ? ' You remember the ship you promised her, and that nobody will ask for it now.' : '');
  }
  castLike('ines', 2, outcome === 'mark' ? 'You let me fly it in dead, and I came down with a hand that shakes.' : 'You let me fly it in dead, and I came down.');
  if (outcome === 'mark') {
    return lead + 'She holds the ship, and the ship comes down hard, and the helm throws her against the harness. She walks off on her own. Later you see her in the pilot\'s chair, holding her left hand in her right until it stops shaking. It does not quite stop.';
  }
  return lead + 'She flies it the way she wrote it in the log: the long clean arc on the cold thrusters, the flip, the last slow roll toward the pad. The ship touches down so softly that the cup on the console does not move. Ines sits with her hands in her lap. "Boring," she says. "Very boring."'
    + (practiced ? ' "You stood by the cutoff once," she adds. "It was enough to know it was there."' : '');
}

// Tomas's pivot: a point each for a medic, a hull above 60 percent, the plan he taught or wrote down for you, and a second person with him.
function thePlant(backup) {
  const rec = castRec('tomas'), plan = !!rec.flags.plan, promised = !!rec.flags.promised;
  const outcome = castFate('tomas', castPoints(castRiskPoints() + (plan ? 1 : 0) + (backup ? 1 : 0)), `Went into the plant to close the valves near ${system().name}.`, 'His hands ache in the cold.', 'engineer');
  const lead = backup ? 'You send a second person in after him. ' : '';
  if (outcome === 'die') {
    return lead + 'The whine drops. The plant holds. Nobody comes out. When the compartment has cooled you open the hatch, and he is at the last valve with the wrench in his hand and the rag still over his face. He had closed them all. The plant runs perfectly for the rest of the burn.'
      + (promised ? ' You remember what you said about trying to keep the crew together.' : '');
  }
  castLike('tomas', 2, outcome === 'mark' ? 'You let me go into the plant, and I came out scalded.' : 'You let me go into the plant, and I came out.');
  if (outcome === 'mark') {
    return lead + 'He comes out carried, both forearms scalded, and the plant holds behind him. He will weld again. He does not take the flask in his left hand after that, and he does not complain.';
  }
  return lead + 'He goes in, and comes out in four minutes with no eyebrows, which he does not mention. The plant settles. He sits on a crate with the flask and tells her, quietly, that she did well.';
}

// A scene with a `closed` reading plays it, in place of the scene itself, when the person's regard for the hand is below friendly
// (the first officers' "what they know", cato.js): the same slot, so nothing is skipped.
const castScene = (key, sc) => { const s = sc.closed && castPerson(key).opinion < OPINION.FRIEND ? sc.closed : sc; return { title: s.title, text: s.text, personal: true, choices: s.choices }; };

Mods.register({
  id: 'cast', name: 'The main characters', builtin: true,
  init(M) {
    M.filter('happenings', (list, where) => {
      const out = [];
      if (where === 'transit') {
        for (const p of castAboard()) {
          const n = castNext(p.cast);
          if (!n) continue;
          // A scene that is waiting gains BEAT_RAMP weight (captains.js) for each draw it missed, as the captain's scenes do, so each
          // one plays within the chapter; the introduction is tier 1, the later ones tier 2.
          const rec = castRec(p.cast), intro = n.name === 'intro', missed = rec.wait || 0;
          rec.wait = missed + 1;  // a miss unless make() runs and clears it
          out.push({ tier: intro ? 1 : 2, weight: (intro ? BEAT_WEIGHT : 2) + BEAT_RAMP * missed, via: 'crew', make() { rec.arc++; rec.wait = 0; return castScene(p.cast, n.sc); } });
        }
      } else if (castDue()) {
        const key = castDue();
        out.push({ tier: 1, weight: 1, via: 'crew', make() { castRec(key).offered = true; return castScene(key, CAST[key].scenes.meet); } });
      }
      return list.concat(out);
    });
    // A day's work at your post is experience: one point, while they hold it.
    M.on('newDay', () => {
      for (const p of castAboard()) { const post = Object.keys(POSTS).find(k => POSTS[k].role === p.role); if (post && postHolder(post) === p) castXp(p.cast, p.role, 1); }  // a first officer holds no post
    });
  },
});
