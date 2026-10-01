'use strict';

// The main characters: authored people who come with you. Each start background has a pair (Earth and Mars so far).
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
    chatter: ['Ines is flying with one hand and writing in a logbook that is not the ship\'s with the other.', 'Ines: "A good landing is boring. People forget that. I am very proud of my boring landings."', 'Ines has taped a card to the nav display with a single word on it: ASK.', 'Ines is running a dead-stick approach on the sim, humming, with her eyes shut.', 'Ines: "Everybody wants to tell the pilot where to put the ship down. Nobody wants to be aboard when it does not."'],
    scenes: {
      meet: {
        title: 'A Pilot Without a Ship',
        text: 'In the dock bar, a woman is cleaning a flight jacket with great care, the way you clean something you have no other use for. "Ines Ferreira," she says, when you sit. "Ferry pilot on the Lisbon to Luna run until six months ago, when I put a failing shuttle down on an unlit pad instead of ditching her as the tower ordered. Forty-one people walked off. I lost my license for the way I did it." She turns the jacket over. "I can fly anything you can put a hull around. I would just like to be asked, not told."',
        choices: [
          { label: 'Offer her the helm', can: () => berthsFree() > 0, run: () => castJoin('ines', 'Ines folds the jacket over one arm and looks at you for a moment as if checking the weather. "Asked," she says. "Good." She follows you down the dock with a bag that holds, as far as you can tell, one logbook and nothing else.') },
          { label: '"Not this time."', run: () => castLater('ines', 'She nods, and goes back to the jacket. "I will be around," she says. It is not a threat, quite.') },
        ],
      },
      intro: {
        title: 'The Woman at the Helm',
        text: 'Ines Ferreira has the helm, and has been flying with one hand for an hour, the other holding a logbook that is not the ship\'s. "Do not," she says, without turning round, "ask about the landing. Everybody asks about the landing." Nobody has, on this ship, but she says it as if it were a habit of long standing, like a hand moving to a pocket.',
        choices: [
          { label: 'Ask about the landing anyway', run: () => { castLike('ines', 1, 'I told you about the landing, and you did not look at me differently.'); return 'She is silent for most of a minute. Then she tells it flat and fast: the dark pad, the tower saying ditch, the forty-one faces she could see on the cabin feed, and the thing she decided. When she finishes she lets out a breath. "There," she says. "That is the whole thing. It is much shorter than I thought."'; } },
          { label: 'Ask about the book instead', run: () => { castLike('ines', 2, 'You asked about the book, not the landing.'); castXp('ines', 'pilot', 2); return '"Oh," she says, and for the first time looks round. "It is my log. Every landing I have made, nine years of them, with the pad, the wind and what I would do differently." She turns it so you can see a column of small neat entries. "Most of what I know is in here." She lets you read one page, and you do.'; } },
        ],
      },
      mid1: {
        days: 10, title: 'Dead Stick',
        text: 'Ines catches you in the corridor with the expression of someone about to ask for a favour she has already decided to ask for. "I want to run a dead-stick flip. Drive off, ten seconds, the whole turn on cold thrusters. It is the one thing I have never been allowed to practise, because it frightens the people who sign things." She waits. "I will not do it without somebody to say stop."',
        choices: [
          { label: 'Stand by the cutoff while she does it', run() { castLike('ines', 2, 'You stood by the cutoff while I flew it dead.'); castXp('ines', 'pilot', 4); return 'You put your hand on the cutoff and she cuts the drive. The ship drifts in a silence you feel in your teeth. Ines turns her on cold thrusters, a long clean arc, and when she brings the drive back up she is grinning so widely that she has to look away. "Ten seconds," she says. "I did not touch the stop." You did not say it.'; } },
          { label: 'Not on a loaded burn', run() { castLike('ines', 1, 'You said not on a loaded burn, and you were right.'); return 'She takes it with a short nod and no argument at all. "That is the correct answer," she says, and means it, which is somehow worse than if she did not. "Ask me again when there is nothing aboard but air." She goes back to the helm, and flies the rest of the shift very, very carefully.'; } },
        ],
      },
      mid2: {
        days: 25, title: 'The Board',
        text: 'A message from the Lisbon licensing board comes in on a slow channel. Ines reads it twice, standing very still, and then, without a word, hands you the terminal. A reinstatement hearing, in forty days, for anyone with a license who can find a reference: "a person of standing who has flown with the applicant, and will say so." She does not ask. She is watching the wall.',
        choices: [
          { label: 'Write the reference', run() { castLike('ines', 3, 'You wrote my reference for the Lisbon board.'); castFlag('ines', 'reference'); return 'You write it that night, plainly, and it takes four tries because the first three sound like a eulogy. You say what you have seen: the care, the nerve, the logbook. When you send it, Ines is standing in the hatch and does not say anything at all. In the morning there is a mug of coffee on your console, and the bunk across from yours has been made with corners.'; } },
          { label: '"It is not my place."', run() { castLike('ines', -1, 'You said a reference was not your place.'); return 'Her face does not change. "No," she says, "of course not." She folds the message and puts it away carefully, as you would put away something that might one day be needed. She is polite for the rest of the day, in a way that is worse than rude.'; } },
        ],
      },
      late: {
        days: 45, title: 'Permission to Land',
        text: 'It is late in the watch, and Ines is at the helm with the lights low. "May I say something that is not about flying?" she says. "I want a command. Not now. Someday, a ship with my name on her papers, where I do not have to ask anyone for leave to put her down. I have not said it to anybody since Lisbon." She does not look round. "If you ever have ships and need somebody to put in the chair, I would like to be asked."',
        choices: [
          { label: 'Promise her a ship, someday', run() { castLike('ines', 2, 'I told you I wanted a command, and you promised.'); castFlag('ines', 'promised'); return '"Someday," you say, "and you will be asked." She does not answer for a long moment. Then she nods once at the windscreen, as though agreeing a heading. "That is all I wanted," she says. "A date would have been a lie. This is better."'; } },
          { label: 'Make no promises', run() { castLike('ines', 1, 'You would not promise a command, but you listened.'); return '"I cannot promise that," you say, "but I heard you." She smiles at the glass, small and a little crooked. "That is the honest answer," she says. "I will take the honest one."'; } },
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
    chatter: ['Tomas is talking to the coolant loop, quietly, in Igbo, and it seems to be listening.', 'Tomas: "She is not noisy. She is telling you something. Stop and listen, and then be embarrassed that you did not before."', 'Tomas has left the engine room door open. He says she likes the air.', 'Tomas is sending a message home, and counting something on his fingers, and sending it again.', 'Tomas: "Ten years, one ship. That is the whole plan. People think I am being modest."'],
    scenes: {
      meet: {
        title: 'The Man with the Torque Wrench',
        text: 'It is three in the morning, and in the yard a heavyset man is rebuilding a coolant loop on somebody else\'s ship for no pay. "Tomas Achebe," he says, not looking up. "Welder. Engineer. Whatever you call a man who has rebuilt the same hull three times for three owners who sold her out from under him." He holds out the spanner handle-first. "Does your ship have a plant I could look after? Properly. For ten years."',
        choices: [
          { label: 'Take him on as engineer', can: () => berthsFree() > 0, run: () => castJoin('tomas', 'He wipes his hands on a rag for a long time, which is how you learn that he is moved. "Properly," he says, finally, and picks up his bag, which clinks. "I will tell you now that I am going to talk to her. The engines. It is not a joke. They like it."') },
          { label: '"Not this time."', run: () => castLater('tomas', '"That is all right," he says, and turns back to the loop. "I will be here. The ship I am working on will be sold in a month, and then I will be somewhere else, but I will be here."') },
        ],
      },
      intro: {
        title: 'The Engine Room Door',
        text: 'Tomas Achebe has left the engine room door open, which no engineer ever does. "Fresh air for her," he says, patting the housing. "She has not had a proper service in a year. Nobody asks me, so I do it in my own time." He has the plates off the coolant loop and the parts laid out on a rag in a careful row, each in the place it came from.',
        choices: [
          { label: 'Offer to help with the service', run() { castLike('tomas', 1, 'You helped me with the service on my own time.'); castXp('tomas', 'engineer', 2); return 'He gives you a rag, a torque wrench and a short, kind lecture on what not to touch, and then you spend two hours on your back under a coolant loop. When you come out, black to the elbows, he looks at you for a while. "Next time," he says, "you are holding the light. You are better at that."'; } },
          { label: 'Leave him to it', run() { castLike('tomas', 0, 'You left me to my service.'); return 'He nods, as if that were the answer he expected and had made peace with. "It is all right," he says. "Most people do. She will thank you anyway." He goes back to the loop, and you hear him, softly, as you leave, telling the pipes that nobody is angry at them.'; } },
        ],
      },
      mid1: {
        days: 10, title: 'Money Home',
        text: 'Tomas catches you in the galley with a small, tight face. "I have a favour. Not a favour, a loan. My sister\'s transfer from the ring bounced, and I have not got the wage yet, and the rent on her flat is due." He says the number carefully, and does not meet your eye: two hundred credits. "I will pay it back from the first two pay days. I always pay it back."',
        personal: true,
        choices: [
          { label: 'Lend him 200 cr', can: () => G.state.credits >= 200, run() { G.state.credits -= 200; castLike('tomas', 3, 'You lent me two hundred credits for my sister\'s rent.'); castFlag('tomas', 'loan'); return 'He takes it with both hands, like something that might spill. "Thank you," he says, and then, because it is not enough, he says it again in Igbo. By the second pay day the two hundred is in your account, with a small, absurd extra: a ring of braided wire, on a note that says "for luck, from a man who understands machines".'; } },
          { label: '"I cannot spare it."', run() { castLike('tomas', -1, 'You could not spare two hundred credits.'); return 'He straightens his shoulders. "Of course," he says. "I should not have asked." He does not ask anyone else, and in the evening you hear him in the engine room, low and steady, working out a month of arithmetic on his fingers. The next day he has taken two extra shifts.'; } },
        ],
      },
      mid2: {
        days: 25, title: 'The Third Hull',
        text: 'Tomas is sitting on a crate in the engine room with a flask of something hot, looking at the reactor housing with an expression you recognise from people looking at old houses. "I rebuilt a hull like this three times," he says. "The same hull. For three owners. Every time I made her better, and every time they sold her to somebody who did not know." He turns the flask in his hands. "Do you want to know how I would rebuild her now? It would take a long time to tell."',
        choices: [
          { label: 'Ask him to teach you', run() { castLike('tomas', 2, 'You asked me how I would rebuild her, and listened.'); castXp('tomas', 'engineer', 2); if (hired()) gainSkill('engineer', 3); return 'It takes the whole of the quiet watch and half the next one. He draws it on the deck in chalk, a plant you would not know from a diagram, and then he makes you say it back. At the end you can hold the whole thing in your head, which has never been true of any machine before. "There," he says. "Now you know her. Do not tell the owners."'; } },
          { label: '"Stick to your shifts."', run() { castLike('tomas', -1, 'You told me to stick to my shifts.'); return 'He closes his mouth, and the flask, and nods. "As you say." He is a kind man, and it shows in how carefully he does not make the shift cold. The plant runs perfectly for the rest of the burn, which is its own kind of reproach.'; } },
        ],
      },
      late: {
        days: 45, title: 'Ten Years',
        text: 'Tomas is waiting at the hatch when you come off watch, with his hands behind his back like a schoolboy. "I want to ask you something, and you must not say yes to be kind. If you ever have a ship of your own, would you try to keep the crew together? Ten years. I am not asking for a promise. I am asking whether you would try."',
        choices: [
          { label: 'Say you would try', run() { castLike('tomas', 2, 'You said you would try to keep the crew together.'); castFlag('tomas', 'promised'); return '"I would try," you say, and he lets out a breath that seems to have been in him for years. "That is enough," he says. "Nobody has ever said that. They say yes, or no. Nobody says try." He claps your shoulder, once, hard, and goes below. You can hear him telling the engines the news.'; } },
          { label: 'Say you cannot promise that', run() { castLike('tomas', 1, 'You were honest about what you could promise.'); return '"No," he says, "no, of course. Nobody can." He smiles, and it is a real smile, only a little tired. "Thank you for not being kind," he says. "It is a rare thing." He goes back to the engines, and, on the way, pats the bulkhead twice, as though telling her it was a good answer.'; } },
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
    chatter: ['Yelena is arguing with the ring-ball feed. The feed is losing.', 'Yelena: "A gun is just a very serious ball. Same principle. You do not look at the thing, you look at where it is going to be."', 'Yelena is doing knee exercises in the corridor with the grim cheer of a woman who has been told to.', 'Yelena: "Every ship I have been on has had a bench. Somebody sitting out, waiting to be asked. I hate it."', 'Yelena has painted a small black raven on the fire control housing, and dares anyone to say it is not regulation.'],
    scenes: {
      meet: {
        title: 'The Striker at the Rail',
        text: 'At the dock bar rail, a woman is icing a knee brace and arguing with the screen over the counter, which is showing a ring-ball replay. "That was a foul," she tells it, without turning. "That was a foul, and the ref is a coward." She turns to you at last. "Yelena Quint. Olympus Dome Ravens, captain, striker. Retired, they say, like it is a sentence." She taps the knee. "Now I aim things for a living, dome defense mostly, and the pay is an insult. I can put a round through a washer at four kilometers. Does your ship have guns that want somebody who cares where they land?"',
        choices: [
          { label: 'Offer her the guns', can: () => berthsFree() > 0, run: () => castJoin('yelena', 'She puts the ice down and gets up so fast the stool falls over, and does not pick it up. "Do you know," she says, "you are the first person to ask me that as if it were a question." She is already walking. Over her shoulder, to the screen: "Do not think I have forgotten the foul."') },
          { label: '"Not this time."', run: () => castLater('yelena', '"Sure," she says, and the stool, which she has set upright, rocks once. "I will be at the rail. I am usually at the rail."') },
        ],
      },
      intro: {
        title: 'The Gunner Who Argued with the Feed',
        text: 'On the first burn you find the gunner in the galley with her bad leg up on a chair, shouting at a ring-ball replay. "Foul," Yelena Quint says, to the screen, to the room, to nobody. "Look at the elbow. Look at it." Nobody has looked at the elbow. She says it with the loyalty of someone who has said it, to many rooms, for years. The feed, which has the decency not to answer, shows the elbow again, slowly.',
        choices: [
          { label: 'Take the ref\'s side', run: () => { castLike('yelena', 2, 'You took the ref\'s side, and I enjoyed it very much.'); castXp('yelena', 'gunner', 2); return 'You say the elbow was clean, and for ten minutes she is the happiest you have seen her, taking you through the replay frame by frame with a fork for a pointer. By the end she has you pointing too. "You are wrong," she says, delighted, "and you know exactly where, and that is the whole game." She goes back to her post with a slight spring in the step, favouring the good knee.'; } },
          { label: 'Ask about the knee', run: () => { castLike('yelena', 1, 'You asked about the knee, and I told you.'); return 'She looks at you for a moment, deciding. "Twenty-six," she says. "Final. A girl from Hellas came in low, and I heard it before I felt it." She taps the brace. "They say it was nobody\'s fault. That is the worst part. Nobody to be angry with." She turns the replay off, which is how you know it cost her something.'; } },
        ],
      },
      mid1: {
        days: 10, title: 'Pickup Game',
        text: 'Yelena finds you with a ball under one arm. It is a proper ring-ball, scuffed grey, and it has clearly travelled a long way in the bottom of a bag. "The hold is empty," she says. "Twenty tonnes of empty. I am going to put a ring at each end and play, and every person aboard is going to play, and you are going to be on my side." She does not make it sound like a question, quite.',
        choices: [
          { label: 'Clear the hold and play', run() { castLike('yelena', 2, 'You played, and you were on my side.'); castXp('yelena', 'gunner', 3); return 'It is the worst ring-ball ever played. Low gravity, no lines, a ring made of tied cable. You are on her side, and she captains you the way she must once have captained the Ravens: loudly, unfairly and with her whole attention, and, in the end, with joy. You lose by two. She does not mention the score once, but at the evening meal she asks everybody, by name, how they feel about next week.'; } },
          { label: 'Not in the hold', run() { castLike('yelena', -1, 'You said no to the game in the hold.'); return '"Sure," she says, and puts the ball back in her bag, carefully, as if it might notice. She is professional for the rest of the burn. It is the quietest the galley has been, and nobody can quite say why.'; } },
        ],
      },
      mid2: {
        days: 25, title: 'The Final',
        text: 'It is the night of the ring-ball final, and the Ravens\' old rivals from Hellas are playing in it. Yelena has spent two days pretending she does not care. She has the watch. "It is nothing," she says, at the hatch, with the bright, flat voice of a person standing very still. "It is only a final. I will listen to the radio. Radio is fine."',
        choices: [
          { label: 'Take her watch', run() { castLike('yelena', 3, 'You took my watch on the night of the final.'); return 'You tell her to go. She does not argue, which is how you know. You hear the roar from the galley, through the deck, from the second quarter on: shouted refereeing, a long agonised groan, and, near the end, a silence so complete you think the feed has gone. In the morning there is a small black raven drawn on the back of your hand, in marker, and she does not mention it.'; } },
          { label: '"It is your watch."', run() { castLike('yelena', -1, 'You said it was my watch on the night of the final.'); return '"Of course," she says. She stands the watch perfectly, to the minute, with the radio turned very low, and says nothing at all, then or after. When you come to relieve her she is at the guns with her chin up, and a very small, very tidy expression of someone who has decided not to be angry.'; } },
        ],
      },
      late: {
        days: 45, title: 'Nobody on the Bench',
        text: 'Yelena is cleaning the fire control housing when you find her, with the careful patience of someone saying a thing slowly in order to say it at all. "I want to run a ship," she says. "Not now. Someday. A whole crew, and nobody on the bench, nobody who is only a name on a list. Every ship I have been on has a bench. I would put everyone on the pitch." She does not look up. "If you ever have ships, I would like to be asked."',
        choices: [
          { label: 'Promise her a ship, someday', run() { castLike('yelena', 2, 'I told you I wanted a ship with no bench, and you promised.'); castFlag('yelena', 'promised'); return '"Someday," you say, "and you will be asked." She puts the cloth down. She is not good at standing still, so she stands very still, and says "Good," to the fire control, in a small voice, and then, louder, to the whole housing, "Did you hear that?"'; } },
          { label: 'Make no promises', run() { castLike('yelena', 1, 'You would not promise a ship, but you listened.'); return '"I cannot promise that," you say, "but I heard you." She nods, once, sharply, like a referee, and the cloth goes back to the housing. "Fair," she says. "I will take fair. Fair is more than most of the bench ever got."'; } },
        ],
      },
    },
  },
  ruben: {
    first: 'Ruben', last: 'Castellanos', culture: 'mars', home: 'Valles Dome', job: 'dome network administrator', age: 52, role: 'slicer',
    traits: ['talkative', 'generous'], wage: 80,
    skills: { slicer: 3, engineer: 1, gunner: 1, pilot: 0 }, captain: { trade: 5, nerve: 1, thrift: 3 },
    ambition: 'Wants every dome on Mars on one open band before he retires.',
    bio: 'He ran the Valles dome network for twenty-five years, and knows what every dome is short of this week, who is lying about it, and what they would pay. When the Republic closed the open band to break a strike, he kept a relay running in his own kitchen for eleven days, and was let go for it.',
    chatter: ['Ruben: "Mars is not quiet. It is listening. There is a difference, and the difference is the whole business."', 'Ruben is sorting a stack of intercepts into piles marked TRUE, FALSE, and LOVELY.', 'Ruben has a thermos of something hot, and, as always, he offers it to everyone who passes.', 'Ruben: "The dome at Hellas is short of pumps, and it is telling everyone it is short of morale. Remember that."', 'Ruben is humming along with a dome council meeting, and has gone gently pink with indignation on behalf of the chair.'],
    scenes: {
      meet: {
        title: 'The Man with the Relay',
        text: 'At the edge of the yard, among the stalls, a man in a cardigan far too warm for the hall is sitting behind a tangle of antennae with a thermos. "Ruben Castellanos," he says, and pours you a cup before you have said yes. "I know what every dome on Mars is short of this week, who is lying about it, and what they will pay. Twenty-five years on the Valles network. They let me go for keeping a relay running in my kitchen." He beams. "Does your ship have an ear?"',
        choices: [
          { label: 'Take him on as comms', can: () => berthsFree() > 0, run: () => castJoin('ruben', 'He packs the whole stall into one battered case in what seems like a single motion, and presses the thermos into your hands. "Hold this," he says, "it is still hot, that is important." He talks the whole way to the ship: about the band, about your ship, about three domes you have never heard of, and about how glad he is. Nobody has the heart to interrupt.') },
          { label: '"Not this time."', run: () => castLater('ruben', '"Of course," he says, and, because it is his nature, he pours you another cup. "Take it for the road. If you hear anything good on the bands, you know where my stall is. I will hear it first, mind."') },
        ],
      },
      intro: {
        title: 'The Quiet Band',
        text: 'The comms post is crowded. Ruben Castellanos has turned the whole station to a single narrow band, and has the volume up so that the galley can hear: a dome council arguing about a pump, in the flat courteous voices of people who have each been awake for two days. "Listen," he says, softly, like a man at a concert. "Listen to what they are not saying. That is the real message."',
        choices: [
          { label: 'Listen with him', run: () => { castLike('ruben', 2, 'You sat and listened to the bands with me.'); castXp('ruben', 'slicer', 2); return 'You listen for most of an hour. It sounds, at first, like nothing: figures, polite interruptions. Then he nudges you, and you hear it: the same dome asking three times, in three different ways, whether the shipment is on time. "Frightened," Ruben says, beaming. "Of the answer. You see? You are very good at this. You have the ear."'; } },
          { label: 'Ask what he is listening for', run: () => { castLike('ruben', 1, 'You asked what I was listening for.'); return '"Ah," he says, and holds up the thermos, as one raises a glass. "What they need. People never say it outright, but they tell you in ways they do not notice. A little too fast, a little too polite. That is when you know you are about to be useful." He turns the band down, gently, so as not to frighten them.'; } },
        ],
      },
      mid1: {
        days: 10, title: 'A Tip',
        text: 'Ruben comes to you with the look of a man holding something that might burst. "Captain. I have been listening to a freight dispatcher who thinks his channel is private. He is quite wrong. I have something, and I will tell you, but I should say that it was heard, not, strictly, asked for." He lowers his voice. "It is worth money. But it is a little bit in the way that a favour is worth money."',
        choices: [
          { label: 'Act on the tip', run() { castLike('ruben', 2, 'You acted on what I heard.'); castXp('ruben', 'slicer', 2); const tip = addRumor(); return `He tells you, and he is right to be careful: ${tip} He watches your face while you take it in, fiddling with the lid of the thermos. "Not a word," he says, delighted, "about where you heard it. A good listener has no name."`; } },
          { label: 'Leave it', run() { castLike('ruben', 1, 'You left the dispatcher\'s secret alone.'); return 'He deflates a little, and then rallies, which is what he does. "You are quite right," he says. "It is not mine to sell." He goes back to the post, and, for a day or so, is a little more careful about where he points the dish.'; } },
        ],
      },
      mid2: {
        days: 25, title: 'What the Bands Say',
        text: 'Ruben has been hearing your ship\'s name on the bands. A trader at Phobos said something kind about the way you pay. A pirate on a short-range channel said something rather less kind. He plays them both for you, with the air of a man bringing news to a king, and then, because he cannot help it, plays them a second time, the kind one slightly louder.',
        choices: [
          { label: 'Ask him to keep an ear on it', run() { castLike('ruben', 2, 'You asked me to keep an ear on what is said about the ship.'); castXp('ruben', 'slicer', 2); return '"Of course. Of course." He is quite glowing. For the rest of the burn there is a small notebook next to the comms console, titled, in his careful hand, WHAT IS SAID, and each page is a name, a time, and a verdict. By the end, you could very nearly write the ship\'s biography from it.'; } },
          { label: 'Tell him not to bother with gossip', run() { castLike('ruben', 0, 'You told me not to bother with gossip.'); return '"Gossip," he says, softly, with the slightly wounded dignity of a man hearing his religion described. "Yes. Of course." He turns the second recording off, very carefully, as one closes a door on someone sleeping.'; } },
        ],
      },
      late: {
        days: 45, title: 'One Band',
        text: 'It is late, and Ruben is sitting alone at the comms post with the lights down and the thermos untouched, which is how you know it is serious. "Captain, I want to say something I have said to no one since the kitchen." He turns his chair. "I want every dome on Mars on one open band. Not for money. I want anyone, anywhere under the glass, to be able to ask for help and be heard. If you ever have a ship with room for a relay, I would like to be the one who carries it."',
        choices: [
          { label: 'Promise him a ship, someday', run() { castLike('ruben', 2, 'I told you about the open band, and you promised.'); castFlag('ruben', 'promised'); return '"Someday," you say, "and there will be room for a relay." He does not say anything for some time. Then he picks up the thermos, and, ceremonially, pours a cup, and sets it in front of you, and for once he does not tell you what is in it.'; } },
          { label: 'Make no promises', run() { castLike('ruben', 1, 'You would not promise, but you listened.'); return '"I cannot promise that," you say, "but I heard you." He smiles, a little crookedly, and nods. "That is what the open band is for," he says. "Not promises. Being heard." He turns the volume up on the quiet band, and, together, for a while, you sit and listen.'; } },
        ],
      },
    },
  },
};

// Who you meet, by start background. The Belt has none until its pair is written.
const CAST_PAIRS = { earth: ['ines', 'tomas'], mars: ['yelena', 'ruben'] };
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
  const st = G.state, keys = CAST_PAIRS[background] || [], left = [...free], took = [];
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
  const st = G.state, keys = CAST_PAIRS[st.background] || [];
  if (hired() || st.tutorial != null || !keys.length) return null;
  for (const [i, key] of keys.entries()) {
    const rec = castRec(key);
    if (st.crew.includes(rec.pid)) continue;
    const prior = keys[i - 1] && castRec(keys[i - 1]);
    if (prior && !st.crew.includes(prior.pid) && !prior.offered) return null;  // in a set order
    return st.day >= 5 + 9 * i && st.day >= (rec.next || 0) ? key : null;
  }
  return null;
}

// What fires next for someone aboard: their next scene, when it is due. Hired hands skip `meet`, owners skip `intro`.
function castNext(key) {
  const rec = castRec(key), order = ['intro', 'mid1', 'mid2', 'late'], seen = rec.arc || 0;
  const name = order[seen];
  if (!name) return null;
  const sc = CAST[key].scenes[name];
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

const castScene = (key, sc) => ({ title: sc.title, text: sc.text, personal: true, choices: sc.choices });

Mods.register({
  id: 'cast', name: 'The main characters', builtin: true,
  init(M) {
    M.filter('happenings', (list, where) => {
      const out = [];
      if (where === 'transit') {
        for (const p of castAboard()) {
          const n = castNext(p.cast);
          if (n) out.push({ tier: n.name === 'intro' ? 1 : 2, weight: 2, via: 'crew', make() { castRec(p.cast).arc++; return castScene(p.cast, n.sc); } });
        }
      } else if (castDue()) {
        const key = castDue();
        out.push({ tier: 1, weight: 1, via: 'crew', make() { castRec(key).offered = true; return castScene(key, CAST[key].scenes.meet); } });
      }
      return list.concat(out);
    });
    // A day's work at your post is experience: one point, while they hold it.
    M.on('newDay', () => {
      for (const p of castAboard()) if (postHolder(Object.keys(POSTS).find(k => POSTS[k].role === p.role)) === p) castXp(p.cast, p.role, 1);
    });
  },
});
