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
    traits: ['curious', 'brave'], wage: 700,
    skills: { pilot: 3, gunner: 1, engineer: 1, slicer: 0 }, captain: { trade: 3, nerve: 4, thrift: 2 },
    ambition: 'Wants her licence back, and the ferry operator\'s lawsuit dropped.',
    bio: 'She flew the ferry operator\'s spaceplane between the Lisbon platform and orbit for nine years, until both engines failed on a descent and the tower ordered her to ditch in the sea. She glided it onto the closed second runway instead, and forty-one people walked off. The pilots\' board revoked her licence, and the ferry operator is suing her for the runway.',
    // The story you learn sitting with her (family.js uses it in place of an invented one): the same slots, her own life. Her sittings have lines of their own (family:ines-*).
    story: {
      left: 'the landing on the closed runway, and the licence after it', rel: 'mother', name: 'Graça',
      hope: 'her licence back, and the ferry operator\'s lawsuit dropped',
      favor: null,  // her own asks are her scenes below
      news: {
        good: ['{who} has got the day shift at the pharmacy back', 'her niece Leonor said "Tia Ines" on a video her brother sent', 'her niece Leonor has started at the crèche on the family\'s tier'],
        bad: ['{who} says the service charge on the flat has gone up again', 'her niece Leonor has been in the clinic with a chest infection', 'the ferry operator\'s lawyers have asked the court to add interest to the runway claim'],
      },
    },
    chatter: [
      'Ines: "A good landing is boring. People forget that. I\'m very proud of my boring landings."',
      'Ines is listening to a message from her mum at double speed.',
      'Ines: "The passenger wants to route us round a beacon that\'s been dead for thirty years. I\'m letting it think about that."',
      'Ines is watching an action vid with the sound off and the subtitles on.',
      'Ines: "I\'ll fly the flip. It\'s the only interesting bit."'
    ],
    // What they leave behind when they walk off or die (fate.js farewellFacts): a flag and its line, in priority order, two at most.
    farewell: {
      walk: 'Ines doesn\'t ask for leave. At the lock on {planet} she writes the date in her logbook, and then she\'s gone.',
      facts: [
        ['reference', 'The countersigned pages of her logbook went to Lisbon with the appeal. The hearing still has no date.'],
        ['practiced', 'Her logbook has the hand-flown approach on a page of its own, with your name in the second seat.'],
        ['promised', 'Her lawyer\'s invoice still comes in every month, wherever she is, and she still pays it.'],
      ],
    },
    scenes: {
      meet: {
        title: 'A Pilot Without a Ship',
        text: ('In the dock bar, a woman is cleaning a flight jacket, one seam at a time. "Ines Ferreira," she says, when you sit. "Ferry pilot on ' +
            'the Lisbon to Luna run until six months ago, when I put a failing shuttle down on an unlit pad instead of ditching her as the tower ' +
            'ordered. Forty-one people walked off. I lost my license for the way I did it." She turns the jacket over. "I can fly anything you can put ' +
            'a hull around. I\'d just like to be asked, not told."'),
        choices: [
          {
            label: 'Offer her the helm',
            when: { berths: 1 },
            effects: { castJoin: 'ines' },
            result: 'Ines folds the jacket over one arm and looks at ' +
              'you for a moment. "Asked," she says. "Good." She follows you down the dock with a bag that holds, as far as you can tell, one logbook ' +
              'and nothing else.',
          },
          {
            label: '"Not this time."',
            effects: { castLater: 'ines' },
            result: 'She goes back to the jacket. "I\'ll be around," she says.',
          },
        ],
      },
      intro: {
        title: 'The Flip',
        text: 'You have the bridge watch when Ines comes up for the flip, with a coffee and a paper logbook under her arm. She straps in, takes the helm from the software, and reads the flip checklist out for you to confirm. Halfway down it she says, "Don\'t ask about the landing. Everyone asks about the landing." You hadn\'t.',
        choices: [
          {
            label: 'Ask about the landing anyway',
            effects: { castLike: { who: 'ines', n: 1, memory: 'I told you about the landing, and you didn\'t make a thing of it.' } },
            result: 'She finishes the checklist first. Then, while the drive spools down: "Both engines went on the descent. The tower said ditch, clear of the platform. ' +
              'The second runway was closed for resurfacing. It was the only concrete I could reach, so I put it there." The drive is off and the ship goes light. ' +
              '"Everyone walked off. I lost my licence. That\'s it." She starts the turn.',
          },
          {
            label: 'Ask about the logbook',
            effects: { castLike: { who: 'ines', n: 2, memory: 'You asked about the book, not the landing.' }, castXp: { who: 'ines', role: 'pilot', n: 2 } },
            result: '"Every landing I\'ve flown. Nine years of the ferry, most days twice." She opens it at a page of short entries: the date, the runway, the wind, ' +
              'the fuel at touchdown. "The board has the official one. This one\'s mine." She flies the flip by hand, and when it\'s done she writes it in.',
          },
        ],
      },
      mid1: {
        days: 10, title: 'The Approach',
        text: ('Ines finds you in the galley. "Next port, I want to fly the approach by hand. Docking software off, all the way to the collar." She drinks her ' +
            'coffee. "I\'ve flown one approach in nine years without the software helping, and that was the landing. I\'d like to have done it once on purpose. ' +
            'It needs somebody on the abort, who\'ll hit it if I say so, or if I stop saying anything."'),
        choices: [
          {
            label: 'Take the abort for her',
            effects: { castLike: { who: 'ines', n: 2, memory: 'You sat on the abort while I flew the approach by hand.' }, castFlag: { who: 'ines', flag: 'practiced' }, castXp: { who: 'ines', role: 'pilot', n: 4 } },
            result: 'You sit in the second seat with your hand by the abort. She turns the docking software off, and it asks her twice if she\'s sure. She flies ' +
              'the approach on the thrusters, slowly, saying the numbers to herself, and the collar latches at a little under a tenth of a metre a second. ' +
              '"Didn\'t need you," she says. "Good to have you, though." She writes it in the logbook.',
          },
          {
            label: 'Not on a loaded run',
            effects: { castLike: { who: 'ines', n: 1, memory: 'You said not on a loaded run, and you were right.' } },
            result: '"Fair," she says. "The cargo\'s not mine to scratch." At the next port she lets the software fly it in, and reads every number it gives.',
          },
        ],
      },
      mid2: {
        days: 25, title: 'The Appeal',
        text: ('A message from Ines\'s lawyer comes in with the morning batch, and she reads it out across the galley table. The appeal needs recent flight hours, ' +
            'on any registry, with each entry countersigned by the watchkeeper who was on the bridge. "You\'ve been on for six of my flips," she says. "The ' +
            'rest of the rota has the others." She has the logbook open at the right pages.'),
        choices: [
          {
            label: 'Countersign them',
            effects: { castLike: { who: 'ines', n: 3, memory: 'You countersigned my hours for the appeal.' }, castFlag: { who: 'ines', flag: 'reference' } },
            result: 'You go through the pages with her, one entry at a time: the date, the burn, the flip, her name, then yours. She checks each one against the ' +
              'watch rota before she turns the page. Then she photographs the pages and sends them to Lisbon on the cheap slot, twice, in case one copy drops.',
          },
          {
            label: 'Countersign them, and write down how she flies',
            when: { opinion: { who: 'ines', min: OPINION.TRUSTED } },
            effects: { castLike: { who: 'ines', n: 3, memory: 'You wrote down how I fly, for the appeal.' }, castFlag: { who: 'ines', flag: 'reference' } },
            result: 'You sign the entries, and then write a page of your own: the flips you watched, the checklist she reads out every time, what she does when the ' +
              'software disagrees with her. It takes you an hour. Ines reads it when you\'ve finished and doesn\'t say anything about it. She puts it in front of ' +
              'the logbook pages and sends both.',
          },
          {
            label: '"It\'s not my place."',
            effects: { castLike: { who: 'ines', n: -1, memory: 'You wouldn\'t countersign my hours.' } },
            result: '"It\'s a signature," she says. She closes the logbook and goes to find the others on the rota. For a few days after that she says good morning and good night to you, and not much else.',
          },
        ],
      },
      late: {
        days: 45, title: 'The Invoice',
        text: ('The lawyer\'s monthly invoice comes in with the batch. Ines reads it at the galley table and turns the terminal so you can see: the month\'s fee, two ' +
            'letters to the ferry operator\'s lawyers, and a line that says "monitoring of hearing schedule". "That\'s him checking a calendar," she says. "Every ' +
            'month I think about stopping. If I stop, the appeal lapses, and then it\'s just the lawsuit." She closes it. "Would you keep paying?"'),
        choices: [
          {
            label: 'Tell her to keep paying',
            effects: { castLike: { who: 'ines', n: 2, memory: 'You told me to keep paying the lawyer, and I did.' }, castFlag: { who: 'ines', flag: 'promised' } },
            result: '"Yeah," she says. "That\'s what I tell myself." She pays it from her terminal while you\'re sitting there, in Lisbon scrip, and watches the exchange take its cut.',
          },
          {
            label: 'Say it\'s her money',
            effects: { castLike: { who: 'ines', n: 1, memory: 'You said it was my money. It was the honest answer.' } },
            result: '"It is," she says. "That\'s the problem." She pays it anyway, and puts the terminal face down.',
          },
        ],
      },
      pivot: {
        days: 60, title: 'Cold Thrusters',
        get text() {
          return 'The drive trips on final approach and won\'t relight, with the dock a few kilometres off and closing. There\'s nothing to slow the ship but the thrusters. Ines has both hands on the controls and the docking software off. "I can bring her in on these," she says. "Same as the practice, with less room. Somebody on the abort."'
            + castRiskLines();
        },
        choices: [
          { label: 'Let her fly it', run: () => coldThrusters(false) },
          { label: 'Put a second hand on the abort (the second is hurt for it)', ...gated(needCrew(2)), run: () => coldThrusters(true) },
          { label: 'Order the abort and wait for the dock\'s tug', memory: 'You ordered the abort, the way the tower did.', run() {
            castLike('ines', -3, this.memory);
            return 'You order the abort. She fires the thrusters to take the ship wide of the dock, and calls the tug. It\'s three hours coming, and the dock bills for it. Afterward she writes it in the logbook: the time, the order and who gave it.';
          } },
        ],
      },
    },
  },
  tomas: {
    first: 'Tomas', last: 'Achebe', culture: 'earth', home: 'Lagos Ring', job: 'dockyard welder', age: 41, role: 'engineer',
    traits: ['kind', 'homesick'], wage: 600,
    skills: { engineer: 3, slicer: 1, pilot: 1, gunner: 0 }, captain: { trade: 2, nerve: 2, thrift: 5 },
    ambition: 'Wants his sister\'s arrears on Lagos Ring cleared, and then a repair-shop lease of his own there.',
    bio: 'Twenty years a welder in the yard on Lagos Ring, on one contract after another, and an engineer\'s ticket sat at night and paid for himself. He shipped out when the yard lost its refits and his berth went with his contract. He sends money up to his sister on the ring and down to his parents on the mainland.',
    // The story you learn sitting with him (family.js uses it in place of an invented one): the same slots, his own life. His sittings have lines of their own (family:tomas-*).
    story: {
      left: 'the yard losing its refits, and his berth with them', rel: 'sister', name: 'Ngozi',
      hope: 'to clear his sister\'s arrears on the ring, and then a repair shop of his own there',
      favor: null,  // his own asks are his scenes below
      news: {
        good: ['{who} has paid off another month of the arrears', '{who} sent a photo of Chidi\'s school report', '{who} got the stall\'s permit renewed for another year'],
        bad: ['{who} says the rent on {home} has gone up again', '{who} says the yard has laid off another shift, and the stall is quiet', '{who} says Chidi is in the ring clinic with a fever, and the clinic wants paying first'],
      },
    },
    chatter: ['Tomas is swearing at a seized valve in Igbo, quietly and steadily.',
        'Tomas: "The pump\'s noisy because the bearing\'s going. Running fine and noisy aren\'t the same thing."',
        'Tomas is copying numbers from his terminal into a paper notebook.',
        'Tomas is watching the Lagos Orbitals on a two-day-old recording, with the score hidden.',
        'Tomas: "I did it right the first time. Now I\'m doing it right the second time."'],
    // What they leave behind when they walk off or die (fate.js farewellFacts): a flag and its line, in priority order, two at most.
    farewell: {
      walk: 'Tomas shuts the engine room door, which he has never done, and says nothing to the plant. He takes the bag that clinks down the ramp at {planet}.',
      facts: [
        ['loan', 'The ring of braided wire he sent back with your two thousand credits is on the hook by the engine room door.'],
        ['plan', 'You can still say the plant back from memory, every valve of it, in his order.'],
        ['promised', 'He asked whether you\'d try to keep the crew together, and you said you\'d try.'],
      ],
    },
    scenes: {
      meet: {
        title: 'The Man with the Torque Wrench',
        text: ('It\'s three in the morning, and in the yard a heavyset man is rebuilding a coolant loop on somebody else\'s ship for no pay. "Tomas ' +
            'Achebe," he says, not looking up. "Welder. Engineer. Whatever you call a man who has rebuilt the same hull three times for three owners ' +
            'who sold her out from under him." He holds out the spanner handle-first. "Does your ship have a plant I could look after? Properly. For ' +
            'ten years."'),
        choices: [
          {
            label: 'Take him on as engineer',
            when: { berths: 1 },
            effects: { castJoin: 'tomas' },
            result: 'He wipes his hands on the rag. Then he ' +
              'wipes them again. "Properly," he says, and picks up his bag, which clinks. "I\'ll tell you now that I\'m going to talk to her. The ' +
              'engines. It\'s not a joke. They like it."',
          },
          {
            label: '"Not this time."',
            effects: { castLater: 'tomas' },
            result: '"That\'s all right," he says, and turns back to the loop. "I\'ll be here. The ship I\'m working on will be sold in a month, and then I\'ll be somewhere else, but I\'ll be here."',
          },
        ],
      },
      intro: {
        title: 'The Engine Room Door',
        text: ('Tomas Achebe has left the engine room door open, which no engineer ever does. "Fresh air for her," he says, patting the housing. "She ' +
            'hasn\'t had a proper service in a year. Nobody asks me, so I do it in my own time." He has the plates off the coolant loop and the parts ' +
            'laid out on a rag in a careful row, each in the place it came from.'),
        choices: [
          {
            label: 'Offer to help with the service',
            effects: { castLike: { who: 'tomas', n: 1, memory: 'You helped me with the service on my own time.' }, castXp: { who: 'tomas', role: 'engineer', n: 2 } },
            result: 'He gives you a rag and a torque wrench, and names the three things not to touch, and you spend two hours on your back under a ' +
              'coolant loop. When you come out, black to the elbows, he looks at you. "Next time," he says, "you\'re holding the light. ' +
              'You\'re better at that."',
          },
          {
            label: 'Leave him to it',
            effects: { castLike: { who: 'tomas', n: 0, memory: 'You left me to my service.' } },
            result: '"It\'s all right," he says. "Most ' +
              'people do. She\'ll thank you anyway." He goes back to the loop, and you hear him, softly, as you leave: "Nobody\'s angry at you. ' +
              'Nobody\'s angry."',
          },
        ],
      },
      mid1: {
        days: 10, title: 'Money Home',
        text: ('Tomas catches you in the galley with his jaw set. "I have a favor. Not a favor, a loan. My sister\'s transfer from the ring bounced, ' +
            'and I haven\'t got the wage yet, and the rent on her flat is due." He says the number carefully, and doesn\'t meet your eye: two thousand ' +
            'credits. "I\'ll pay it back from the first two pay days. I always pay it back."'),
        personal: true,
        choices: [
          {
            label: 'Lend him 2,000 cr',
            when: { credits: 2000 },
            effects: { credits: -2000, castLike: { who: 'tomas', n: 3, memory: 'You lent me two thousand credits for my sister\'s rent.' }, castFlag: { who: 'tomas', flag: 'loan' } },
            result: 'He takes it with both hands. "Thank you," he says, and says it again in Igbo. By the second pay day ' +
              'the two thousand is in your account, with an extra: a ring of braided wire, on a note that says "for luck".',
          },
          {
            label: '"I can\'t spare it."',
            effects: { castLike: { who: 'tomas', n: -1, memory: 'You couldn\'t spare two thousand credits.' } },
            result: 'He straightens his shoulders. "Of course," he says. "I shouldn\'t have asked." He doesn\'t ask anyone else. In the evening he\'s ' +
              'in the engine room with the door open, counting a month on his fingers, and the next day his name is on the bill for two extra ' +
              'shifts.',
          },
        ],
      },
      mid2: {
        days: 25, title: 'The Third Hull',
        text: ('Tomas is sitting on a crate in the engine room with a flask of something hot, looking at the reactor housing. "I rebuilt a hull like ' +
            'this three times," he says. "The same hull. For three owners. Every time I made her better, and every time they sold her to somebody who ' +
            'didn\'t know." He turns the flask in his hands. "Do you want to know how I\'d rebuild her now? It\'d take a long time to tell."'),
        choices: [
          {
            label: 'Ask him to teach you',
            effects: { castFlag: { who: 'tomas', flag: 'plan' }, castLike: { who: 'tomas', n: 2, memory: 'You asked me how I\'d rebuild her, and listened.' }, castXp: { who: 'tomas', role: 'engineer', n: 2 }, gainSkill: { post: 'engineer', n: 3 } },
            result: 'It takes the whole of the quiet watch and half the next one. He draws it on the deck in chalk, every valve of her in his order. ' +
              'Then he rubs out the first pipe and makes you put it back from memory, and the second, and the third, until the deck is bare and the whole of her is laid out in your head. "There," he says. "Now you know her. Don\'t tell the owners."',
          },
          {
            label: 'Ask him to write it down, so it doesn\'t go with the hull',
            when: { opinion: { who: 'tomas', min: OPINION.TRUSTED } },
            effects: { castFlag: { who: 'tomas', flag: 'plan' }, castLike: { who: 'tomas', n: 2, memory: 'You asked me to write the plan down, so it\'d last.' } },
            result: 'He looks at the flask. "Nobody has asked me that," he says. He goes below and comes back with a notebook with a stained ' +
              'cover, and spends the quiet watch filling eleven pages in small square capitals, a diagram on each. He tears them out along the fold, ' +
              'carefully, and puts them in your hand. "If she\'s sold again," he says, "somebody will need to know where the cracks are. Not the ' +
              'owners. Somebody." You fold the pages into your jacket. He puts the notebook back in his pocket with the stubs still in it.',
          },
          {
            label: '"Stick to your shifts."',
            effects: { castLike: { who: 'tomas', n: -1, memory: 'You told me to stick to my shifts.' } },
            result: 'He closes his mouth, and the flask. "As you say." The plant runs perfectly for the rest of the burn.',
          },
        ],
      },
      late: {
        days: 45, title: 'Ten Years',
        text: ('Tomas is waiting at the hatch when you come off watch, with his hands behind his back. "I want to ask you something, and you must not ' +
            'say yes to be kind. If you ever have a ship of your own, would you try to keep the crew together? Ten years. I\'m not asking for a ' +
            'promise. I\'m asking whether you\'d try."'),
        choices: [
          {
            label: 'Say you\'d try',
            effects: { castLike: { who: 'tomas', n: 2, memory: 'You said you\'d try to keep the crew together.' }, castFlag: { who: 'tomas', flag: 'promised' } },
            result: '"I\'d try," you say, and he lets out a breath. "That\'s enough," he says. "Nobody has ever said that." He claps your shoulder, once, hard, and goes below.',
          },
          {
            label: 'Say you can\'t promise that',
            effects: { castLike: { who: 'tomas', n: 1, memory: 'You were honest about what you could promise.' } },
            result: '"No," he says, "no, of course. Nobody can." He smiles. "Thank you for not being kind," he says. "It\'s a rare thing." He goes back to ' +
              'the engines, and, on the way, pats the bulkhead twice.',
          },
        ],
      },
      pivot: {
        days: 60, title: 'The Plant',
        get text() {
          return 'A coolant line lets go in the engine room and the plant climbs to a whine you feel in your fillings. The only way to hold her is to go in and close the valves by hand, with the compartment too hot to stand in. Tomas is already at the door with a wet rag over his face. "I know where she\'s cracked," he says. "I know where all of them are. Nobody else should be in there."'
            + castRiskLines();
        },
        choices: [
          { label: 'Let him go in', run: () => thePlant(false) },
          { label: 'Send a second person in with him (the second is hurt for it)', ...gated(needCrew(2)), run: () => thePlant(true) },
          { label: 'Tell him to vent the plant', memory: 'You told me to vent the plant.', run() {
            castLike('tomas', -3, this.memory);
            return 'You tell him to vent her. He stands at the door with the rag in his hand. Then he opens the valve, and the whine runs down and stops. He doesn\'t look at you. He goes below.';
          } },
        ],
      },
    },
  },
  yelena: {
    first: 'Yelena', last: 'Quint', culture: 'mars', home: 'Olympus Dome', job: 'ring-ball striker', age: 29, role: 'gunner',
    traits: ['brave', 'rude'], wage: 600,
    skills: { gunner: 3, pilot: 1, engineer: 0, slicer: 1 }, captain: { trade: 2, nerve: 5, thrift: 2 },
    ambition: 'Wants to captain a ship the way she captained her ring-ball side: loud, and nobody left on the bench.',
    bio: 'Striker and captain of the Olympus Dome Ravens until a dislocated knee ended her ring-ball career at twenty-six. She took the only other job where you put something exactly where you meant to, and she\'s still in a bad mood about it.',
    chatter: ['Yelena is arguing with the ring-ball feed. The feed is losing.', ('Yelena: "A gun is just a very serious ball. Same principle. You don\'t' +
        ' look at the thing, you look at where it\'s going to be."'), ('Yelena is doing knee exercises in the corridor with the grim cheer of a ' +
            'woman who has been told to.'), 'Yelena: "Every ship I\'ve been on has had a bench. Somebody sitting out, waiting to be asked. I hate it."', 'Yelena has painted a black raven the size of a hand on the fire control housing, and dares anyone to say it\'s not regulation.'],
    scenes: {
      meet: {
        title: 'The Striker at the Rail',
        text: ('At the dock bar rail, a woman is icing a knee brace and arguing with the screen over the counter, which is showing a ring-ball ' +
            'replay. "That was a foul," she tells it, without turning. "That was a foul, and the ref is a coward." She turns to you at last. "Yelena ' +
            'Quint. Olympus Dome Ravens, captain, striker. Retired, they say, like it\'s a sentence." She taps the knee. "Now I aim things for a ' +
            'living, dome defense mostly, and the pay is an insult. I can put a round through a washer at four kilometers. Does your ship have guns ' +
            'that want somebody who cares where they land?"'),
        choices: [
          {
            label: 'Offer her the guns',
            when: { berths: 1 },
            effects: { castJoin: 'yelena' },
            result: 'She puts the ice down and gets up so fast the ' +
              'stool falls over, and doesn\'t pick it up. "Do you know," she says, "you\'re the first person to ask me that and wait for the answer." ' +
              'She\'s already walking. Over her shoulder, to the screen: "Don\'t think I\'ve forgotten the foul."',
          },
          {
            label: '"Not this time."',
            effects: { castLater: 'yelena' },
            result: '"Sure," she says, and the stool, which she has set upright, rocks once. "I\'ll be at the rail. I\'m usually at the rail."',
          },
        ],
      },
      intro: {
        title: 'The Gunner Who Argued with the Feed',
        text: ('On the first burn you find the gunner in the galley with her bad leg up on a chair, shouting at a ring-ball replay. "Foul," Yelena ' +
            'Quint says, to the screen, to the room, to nobody. "Look at the elbow. Look at it." Nobody has looked at the elbow. She runs it back herself, thumb on the remote, and the feed, which has the decency not to answer, shows the elbow again, slowly.'),
        choices: [
          {
            label: 'Take the ref\'s side',
            effects: { castLike: { who: 'yelena', n: 2, memory: 'You took the ref\'s side, and I enjoyed it very much.' }, castXp: { who: 'yelena', role: 'gunner', n: 2 } },
            result: 'You say the elbow was clean, and for ten minutes she\'s the happiest you\'ve seen her, taking you through the replay frame by frame ' +
              'with a fork for a pointer. By the end she has you pointing too. "You\'re wrong," she says, delighted, "and you know exactly where, and ' +
              'that\'s the whole game." She goes back to her post with a spring in her step, favoring the good knee.',
          },
          {
            label: 'Ask about the knee',
            effects: { castLike: { who: 'yelena', n: 1, memory: 'You asked about the knee, and I told you.' } },
            result: 'She looks at you for a moment, deciding. "Twenty-six," she says. "Final. A girl from Hellas came in low, and I heard it before I felt ' +
              'it." She taps the brace. "They say it was nobody\'s fault. That\'s the worst part. Nobody to be angry with." She turns the replay off.',
          },
        ],
      },
      mid1: {
        days: 10, title: 'Pickup Game',
        text: ('Yelena finds you with a ball under one arm. It\'s a proper ring-ball, scuffed gray, and it has clearly traveled a long way in the ' +
            'bottom of a bag. "The hold is empty," she says. "Twenty tonnes of empty. I\'m going to put a ring at each end and play, and every person ' +
            'aboard is going to play, and you\'re going to be on my side." She doesn\'t make it a question.'),
        choices: [
          {
            label: 'Clear the hold and play',
            effects: { castLike: { who: 'yelena', n: 2, memory: 'You played, and you were on my side.' }, castXp: { who: 'yelena', role: 'gunner', n: 3 } },
            result: 'It\'s the worst ring-ball ever played. Low gravity, no lines, a ring made of tied cable. You\'re on her side, and she captains you loudly and unfairly, calling every foul against her own side and none for it, and when the cable ring finally drops through on the last throw she\'s the one who shouts. You lose by two. ' +
              'She doesn\'t mention the score once, but at the evening meal she asks everybody, by name, how they feel about next week.',
          },
          {
            label: 'Not in the hold',
            effects: { castLike: { who: 'yelena', n: -1, memory: 'You said no to the game in the hold.' } },
            result: '"Sure," she says, and puts the ball back in her bag, carefully. She\'s professional for the rest of the burn. It\'s the quietest the galley has been.',
          },
        ],
      },
      mid2: {
        days: 25, title: 'The Final',
        text: ('It\'s the night of the ring-ball final, and the Ravens\' old rivals from Hellas are playing in it. Yelena has spent two days ' +
            'pretending she doesn\'t care. She has the watch. "It\'s nothing," she says, at the hatch, with a bright, flat voice. "It\'s only a final. ' +
            'I\'ll listen to the radio. Radio is fine."'),
        choices: [
          {
            label: 'Take her watch',
            effects: { castLike: { who: 'yelena', n: 3, memory: 'You took my watch on the night of the final.' } },
            result: 'You tell her to go. She doesn\'t argue. You hear the roar from the galley, through the deck, from the second quarter on: shouted ' +
              'refereeing, a long agonized groan, and, near the end, a silence so complete you think the feed has gone. In the morning there\'s a ' +
              'small black raven drawn on the back of your hand, in marker, and she doesn\'t mention it.',
          },
          {
            label: '"It\'s your watch."',
            effects: { castLike: { who: 'yelena', n: -1, memory: 'You said it was my watch on the night of the final.' } },
            result: '"Of course," she says. She stands the watch perfectly, to the minute, with the radio turned low, and says nothing at all, then or ' +
              'after. When you come to relieve her she\'s at the guns with her chin up.',
          },
        ],
      },
      late: {
        days: 45, title: 'Nobody on the Bench',
        text: ('Yelena is cleaning the fire control housing when you find her, one slow pass of the cloth for each sentence. "I want to run a ship," she says. "Not now. Someday. A whole crew, and nobody on the bench, nobody who\'s only a name on a ' +
            'list. Every ship I\'ve been on has a bench. I\'d put everyone on the pitch." She doesn\'t look up. "If you ever have ships, I\'d ' +
            'like to be asked."'),
        choices: [
          {
            label: 'Promise her a ship, someday',
            effects: { castLike: { who: 'yelena', n: 2, memory: 'I told you I wanted a ship with no bench, and you promised.' }, castFlag: { who: 'yelena', flag: 'promised' } },
            result: '"Someday," you say, "and you\'ll be asked." She puts the cloth down on the housing and, for once, doesn\'t pick anything up in its place. She says ' +
              '"Good" to the fire control, in a low voice. Then, louder, to the whole housing: "Did you hear that?"',
          },
          {
            label: 'Make no promises',
            effects: { castLike: { who: 'yelena', n: 1, memory: 'You wouldn\'t promise a ship, but you listened.' } },
            result: '"I can\'t promise that," you say, "but I heard you." She raises one flat hand, like a referee, and the cloth goes back to the housing. ' +
              '"Fair," she says. "I\'ll take fair. Fair is more than most of the bench ever got."',
          },
        ],
      },
      pivot: {
        days: 60, title: 'Over the Hull',
        get text() {
          const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6;
          return 'A ship is drifting across your path with her drive dark: disabled, and armed, going by the way she\'s not answering. Yelena is already at the hatch with her helmet under one arm. "I go first," she says. "I\'ve always gone first. That\'s what a striker is for."'
            + (low ? ' Your own hull has taken a beating, and a bad hull is a bad place to fall back to.' : ' Your hull is sound.')
            + (medic ? ` ${medic.first} has the med kit open at the airlock.` : ' There\'s nobody aboard who can do more than a field dressing, and she knows it.')
            + ' Yelena waits with one boot over the hatch lip.';
        },
        choices: [
          { label: 'Let her lead', run: () => overTheHull(false) },
          { label: 'Send her with a second person (the second is hurt for it)', ...gated(needCrew(2)), run: () => overTheHull(true) },
          { label: 'Call it off', memory: 'You called off the boarding and put me on the bench.', run() {
            castFlag('yelena', 'benched'); castLike('yelena', -3, this.memory);
            return ('You tell her no, and cut the channel, and the drifting ship goes on drifting. Yelena stands at the hatch with her ' +
                'helmet in her hand until the drifting ship is a point of light. "Fine," she says. She sits down on the bench by the airlock, straight, and doesn\'t say another word to you for ' +
                'the rest of the burn.');
          } },
        ],
      },
    },
  },
  ruben: {
    first: 'Ruben', last: 'Castellanos', culture: 'mars', home: 'Valles Dome', job: 'dome network administrator', age: 52, role: 'slicer',
    traits: ['talkative', 'generous'], wage: 800,
    skills: { slicer: 3, engineer: 1, gunner: 1, pilot: 0 }, captain: { trade: 5, nerve: 1, thrift: 3 },
    ambition: 'Wants every dome on Mars on one open band before he retires.',
    bio: ('He ran the Valles dome network for twenty-five years, and knows what every dome is short of this week, who\'s lying about it, and what ' +
        'they\'d pay. When the Concord closed the open band to break a strike, he kept a relay running in his own kitchen for eleven days, and was ' +
        'let go for it.'),
    chatter: [
      'Ruben: "Mars isn\'t quiet. It\'s listening. You can hear the difference if you hold still."',
      'Ruben is sorting a stack of intercepts into piles marked TRUE, FALSE, and LOVELY.',
      'Ruben has a thermos of something hot, and, as always, he offers it to everyone who passes.',
      'Ruben: "The dome at Hellas is short of pumps, and it\'s telling everyone it\'s short of morale. Remember that."',
      'Ruben is humming along with a dome council meeting, and has gone gently pink with indignation on behalf of the chair.'
    ],
    scenes: {
      meet: {
        title: 'The Man with the Relay',
        text: ('At the edge of the yard, among the stalls, a man in a cardigan far too warm for the hall is sitting behind a tangle of antennae with ' +
            'a thermos. "Ruben Castellanos," he says, and pours you a cup before you\'ve said yes. "I know what every dome on Mars is short of this ' +
            'week, who\'s lying about it, and what they\'ll pay. Twenty-five years on the Valles network. They let me go for keeping a relay running ' +
            'in my kitchen." He beams. "Does your ship have an ear?"'),
        choices: [
          {
            label: 'Take him on as comms',
            when: { berths: 1 },
            effects: { castJoin: 'ruben' },
            result: 'He packs the whole stall into one battered ' +
              'case in what seems like a single motion, and presses the thermos into your hands. "Hold this," he says, "it\'s still hot, that\'s ' +
              'important." He talks the whole way to the ship: about the band, about your ship, about three domes you\'ve never heard of, and about ' +
              'how glad he is. Nobody has the heart to interrupt.',
          },
          {
            label: '"Not this time."',
            effects: { castLater: 'ruben' },
            result: '"Of course," he says, and, because it\'s his nature, he pours you another cup. "Take it for the road. If you hear anything good on the bands, you know where my stall is. I\'ll hear it first, mind."',
          },
        ],
      },
      intro: {
        title: 'The Quiet Band',
        text: ('The comms post is crowded. Ruben Castellanos has turned the whole station to a single narrow band, and has the volume up so that the ' +
            'galley can hear: a dome council arguing about a pump, in the flat courteous voices of people who have each been awake for two days. ' +
            '"Listen," he says, softly. "Nobody has mentioned the pump in four minutes. They\'re all being very careful not to."'),
        choices: [
          {
            label: 'Listen with him',
            effects: { castLike: { who: 'ruben', n: 2, memory: 'You sat and listened to the bands with me.' }, castXp: { who: 'ruben', role: 'slicer', n: 2 } },
            result: 'You listen for most of an hour. It sounds, at first, like nothing: figures, polite interruptions. Then he nudges you, and you hear it: ' +
              'the same dome asking three times, in three different ways, whether the shipment is on time. "Frightened," Ruben says, beaming. "Of the ' +
              'answer. You see? You\'re very good at this. You have the ear."',
          },
          {
            label: 'Ask what he\'s listening for',
            effects: { castLike: { who: 'ruben', n: 1, memory: 'You asked what I was listening for.' } },
            result: '"Ah," he says, and holds up the thermos, as one raises a glass. "What they need. People never say it outright, but they tell you in ' +
              'ways they don\'t notice. Too fast, too polite. That\'s when you know you\'re about to be useful." He turns the band ' +
              'down, gently, so as not to frighten them.',
          },
        ],
      },
      mid1: {
        days: 10, title: 'A Tip',
        text: ('Ruben comes to you with the look of a man holding something that might burst. "Captain. I\'ve been listening to a freight dispatcher ' +
            'who thinks his channel is private. He\'s quite wrong. I have something, and I\'ll tell you, but I should say that it was heard, not, ' +
            'strictly, asked for." He lowers his voice. "It\'s worth money. The way a favor is worth money."'),
        choices: [
          { label: 'Act on the tip', memory: 'You acted on what I heard.', run() { castLike('ruben', 2, this.memory); castXp('ruben', 'slicer', 2); const tip = addRumor(); return (
              `He tells you, and he's right to be careful: ${tip} He watches your face while you take it in, fiddling with the lid of the thermos. ` +
              `"Not a word," he says, delighted, "about where you heard it."`); } },
          {
            label: 'Leave it',
            effects: { castLike: { who: 'ruben', n: 1, memory: 'You left the dispatcher\'s secret alone.' } },
            result: 'He deflates, and then rallies. "You\'re quite right," he says. "It\'s not mine to sell." He goes back to the post, and, for a day or ' +
              'so, is more careful about where he points the dish.',
          },
        ],
      },
      mid2: {
        days: 25, title: 'What the Bands Say',
        text: 'Ruben has been hearing your ship\'s name on the bands. A trader at Phobos said something kind about the way you pay. A pirate on a short-range channel said something rather less kind. He plays them both for you, and then plays them a second time, the kind one louder.',
        choices: [
          {
            label: 'Ask him to keep an ear on it',
            effects: { castLike: { who: 'ruben', n: 2, memory: 'You asked me to keep an ear on what\'s said about the ship.' }, castXp: { who: 'ruben', role: 'slicer', n: 2 } },
            result: '"Of course. Of course." He\'s glowing. For the rest of the burn there\'s a notebook next to the comms console, titled, in his ' +
              'careful hand, WHAT\'s SAID, and each page is a name, a time, and a verdict. By the end, you could write the ship\'s biography from it.',
          },
          {
            label: 'Tell him not to bother with gossip',
            effects: { castLike: { who: 'ruben', n: 0, memory: 'You told me not to bother with gossip.' } },
            result: '"Gossip," he says, softly. "Yes. Of course." He turns the second recording off, carefully.',
          },
        ],
      },
      late: {
        days: 45, title: 'One Band',
        text: ('It\'s late, and Ruben is sitting alone at the comms post with the lights down and the thermos untouched. "Captain, I want to say ' +
            'something I\'ve said to no one since the kitchen." He turns his chair. "I want every dome on Mars on one open band. Not for money. I ' +
            'want anyone, anywhere under the glass, to be able to ask for help and be heard. If you ever have a ship with room for a relay, I\'d ' +
            'like to be the one who carries it."'),
        choices: [
          {
            label: 'Promise him a ship, someday',
            effects: { castLike: { who: 'ruben', n: 2, memory: 'I told you about the open band, and you promised.' }, castFlag: { who: 'ruben', flag: 'promised' } },
            result: '"Someday," you say, "and there\'ll be room for a relay." He doesn\'t say anything for some time. Then he picks up the thermos, pours a cup with both hands, and sets it in front of you. For once he doesn\'t tell you what\'s in it.',
          },
          {
            label: 'Make no promises',
            effects: { castLike: { who: 'ruben', n: 1, memory: 'You wouldn\'t promise, but you listened.' } },
            result: '"I can\'t promise that," you say, "but I heard you." He smiles. "That\'s what the open band is for," he says. ' +
              '"Not promises. Being heard." He turns the volume up on the quiet band, and the two of you sit and listen.',
          },
        ],
      },
      pivot: {
        days: 60, title: 'The Last Relay',
        get text() {
          const named = !!castRec('ruben').flags.councillor;
          return 'A flare has been building on the sun-side sensors for an hour, and Ruben has been watching it with his thermos going cold. Now the Hellas relay drops off the open band mid-sentence, and a voice that\'s not the dome\'s comes up on the channel asking whether anyone can hear. "That\'s the north mast," Ruben says. "It won\'t take a realign from the console, the motor is fouled. It needs a hand on the third bolt, from outside, and the flare will be on us in forty minutes." He has one arm in the suit already. "I know which bolt. I\'ve known which bolt since the kitchen. Nobody else here does."'
            + castRiskLines()
            + (named ? ' Councillor Reyes\'s name is on the relay\'s access list, and the dome will take the signal on her word.' : ' No councillor on Hellas has your name, and the dome will take a stranger\'s signal slowly.');
        },
        choices: [
          { label: 'Let him go out to the mast', run: () => theMast(false) },
          { label: 'Send a second person out with him (the second is hurt for it)', ...gated(needCrew(2)), run: () => theMast(true) },
          { label: 'Tell him to hold the band from the console', memory: 'You kept me off the mast.', run() {
            castFlag('ruben', 'benched'); castLike('ruben', -3, this.memory);
            return 'You tell him no, and put your hand on the console. The north mast stays dark, and the voice on the open band asks its question twice more and then stops asking. Ruben sits down at the comms post with the thermos untouched. "It\'s your ship," he says quietly. "I\'ll keep the band open anyway. Somebody should be listening."';
          } },
        ],
      },
    },
  },
  bexa: {
    first: 'Bexa', last: 'Oyelaran', culture: 'belt', home: 'Ceres Station', job: 'salvage tug pilot', age: 41, role: 'pilot',
    traits: ['secretive', 'kind'], wage: 700,
    skills: { pilot: 3, engineer: 1, slicer: 1, gunner: 0 }, captain: { trade: 3, nerve: 3, thrift: 4 },
    ambition: 'Wants to bring one ship home that everybody else had given up on, and see her fly again.',
    bio: 'She pulled dead ships into Ceres on a tug for twenty years. She keeps a list of every crew she found aboard them, the living and the others, and she doesn\'t talk about the list unless you ask the right way.',
    chatter: [
      'Bexa: "I\'ve never been aboard a dead one. Cold, yes. The lights on a timer, and the log waiting for somebody to read it."',
      'Bexa is flying with both hands on the stick and her thumbs tucked under, the way you hold something that might slip.',
      'Bexa has a brass tag on a string above the console. She won\'t say whose it was.',
      'Bexa: "In the Belt we don\'t leave a ship. Not for money. Not for orders. You tow her home."',
      'Bexa is humming a tug-pilot lullaby, low, to the transponder.'
    ],
    scenes: {
      meet: {
        title: 'The Tug Pilot',
        text: ('Down on the Ceres docks, a woman in a patched tug jacket is signing a salvage chit with a pen on a chain, the chit pinned flat to the rail under two fingers against the draft off the vents. "Bexa Oyelaran," she says, when you ask. "Twenty years towing dead ' +
            'ships home. I could tell a hull\'s whole history from the airlock." She caps the pen. "The blockade killed the work. Nobody sells a wreck any ' +
            'more, they keep them. I\'d like a ship I can fly instead of tow."'),
        choices: [
          {
            label: 'Offer her the helm',
            when: { berths: 1 },
            effects: { castJoin: 'bexa' },
            result: 'She looks at you for the length of a breath, hangs the pen on its chain from her belt, and picks up her bag. "I\'ll take your helm," she says. "I\'ll tell you now that I talk to ' +
              'the transponder. It\'s not a problem. It listens better than most people."',
          },
          {
            label: '"Not this time."',
            effects: { castLater: 'bexa' },
            result: '"That\'s all right," she says. "I know where the docks are. There\'s always another wreck." She says it kindly, and the chit in her hand is the last one on the clipboard.',
          },
        ],
      },
      intro: {
        title: 'The List',
        text: ('Bexa Oyelaran has the helm, and, taped inside the console cover where only the pilot can see it, a list. It\'s written in small, even ' +
            'handwriting, in a dozen colors of ink: names, and beside each name a date and a hull number. She sees you looking. "The crews," she says, ' +
            'evenly. "The ones I found. All of them. Living, and otherwise." She doesn\'t close the cover. "Most people ask me not to say."'),
        choices: [
          {
            label: 'Ask about the living ones',
            effects: { castLike: { who: 'bexa', n: 2, memory: 'You asked about the ones who lived.' }, castXp: { who: 'bexa', role: 'pilot', n: 2 } },
            result: '"Oh," she says, and smiles, for the first time since you came aboard. "Eleven. Eleven of them lived. There\'s a boy on Pallas ' +
              'who sends me a card every year with the same drawing of a tug, and a woman at Hygiea who runs a water shop and gives me a free flask ' +
              'every time I dock." She runs a finger down the list, stopping at the names, one at a time. "That\'s the part I put the list here for."',
          },
          {
            label: 'Ask about the others',
            effects: { castLike: { who: 'bexa', n: 1, memory: 'You asked about the others, and listened.' } },
            result: 'She\'s silent for a long time. "Thirty-one," she says. "I make sure I say their names once a year, out loud, on the day I found them. ' +
              'Somebody should." She closes the cover, finally, gently, as you\'d a door on someone sleeping. "Thank you for asking. It\'s not what ' +
              'most people ask."',
          },
        ],
      },
      mid1: {
        days: 10, title: 'A Wreck on the Scope',
        text: ('A transponder is repeating a ship\'s name every four seconds, faint and old, a few hours off the lane. Bexa has her hand flat on the ' +
            'console. "It\'s a derelict," she says. "She has been calling a long time. A few hours, no more. It\'s not my ship to ask for. But I\'d ' +
            'like to look." She keeps her eyes on the scope. "I won\'t do it if you say no."'),
        choices: [
          {
            label: 'Take the detour',
            effects: { castLike: { who: 'bexa', n: 2, memory: 'You took the detour to look at the wreck.' }, castXp: { who: 'bexa', role: 'pilot', n: 3 }, delay: 6 },
            result: 'She brings the ship in slow and gentle, the way you approach a frightened animal. The wreck is a hauler, dark and cold, her ' +
              'hatches sealed, her beacon the only living thing on her. Nobody aboard. Bexa stays on the scope until the beacon is a speck. ' +
              'Quietly, she writes a name on a list you can\'t see. "She was called the Patient Wren," she says. "I\'ll tell the registry. She\'ll be ' +
              'towed home." She flies the rest of the shift with two fingers on the stick.',
          },
          {
            label: 'Stay on course',
            effects: { castLike: { who: 'bexa', n: -1, memory: 'You wouldn\'t let me look at the wreck.' } },
            result: '"No," she says. "Of course. It\'s not my ship." She takes her hand off the console slowly, and the transponder\'s faint call fades ' +
              'behind you, four seconds at a time, until you can\'t hear it. She flies on, correct and silent, and later you see her write something ' +
              'small on the inside of the console cover.',
          },
        ],
      },
      mid2: {
        days: 25, title: 'The Ghost on the Scope',
        text: ('The scope paints a ship at forty thousand kilometers, closing. Bexa looks at it for exactly four seconds. "Ghost," she says. Then, ' +
            'because you haven\'t moved: "In the Belt, a ghost is mostly a real ship. But this one has a ghost\'s manners: it\'s too tidy, the heading ' +
            'is a slightly wrong shade of straight. Sensor echo off the ice. I\'ve seen it forty times." She waits. "I\'d like to ignore it."'),
        choices: [
          {
            label: 'Trust her',
            effects: { castLike: { who: 'bexa', n: 2, memory: 'You trusted me about the ghost on the scope.' }, castXp: { who: 'bexa', role: 'pilot', n: 2 } },
            result: 'You tell her to carry on. She carries on, and for the next twenty minutes the whole ship waits with her, listening to the ' +
              'thing she\'s certain isn\'t there. At the end, the contact goes pale, and thins, and is gone, like breath on a pane. Bexa lets out a ' +
              'long, slow exhale. "Echo," she says. "Forty-one." She doesn\'t say thank you. She puts a tick on the inside of the console ' +
              'cover.',
          },
          {
            label: 'Raise the alarm anyway',
            effects: { castLike: { who: 'bexa', n: -1, memory: 'You raised the alarm about a ghost I had called.' } },
            result: 'The alarm goes, and the crew goes to stations, and in twenty minutes the contact fades to nothing, as she said it would. Bexa takes ' +
              'the ship off alert herself, calmly, without a word, and flies on. "Better safe," she says at last. For a day she answers in single words, and after that she reports a contact only once she\'s sure of it.',
          },
        ],
      },
      late: {
        days: 45, title: 'The Ship Nobody Wanted',
        text: ('Bexa is at the helm with the lights low and the console cover open, and she\'s not looking at the list. She ' +
            'turns. "I want a ship. Not to tow. A wreck that everyone else has given up on, that I bring home, and put ' +
            'right, and fly. A ship nobody wanted, and that wants to go." She looks at her hands. "If you ever have ships, I\'d like to be asked."'),
        choices: [
          {
            label: 'Promise her a ship, someday',
            effects: { castLike: { who: 'bexa', n: 2, memory: 'I told you about the ship nobody wanted, and you promised.' }, castFlag: { who: 'bexa', flag: 'promised' } },
            result: '"Someday," you say, "and you\'ll be asked." She doesn\'t answer for a moment. Then she takes the brass tag from above the ' +
              'console, on its string, and holds it in her palm. "He\'d have liked you," she says, to nobody in particular, and puts it carefully ' +
              'back.',
          },
          {
            label: 'Make no promises',
            effects: { castLike: { who: 'bexa', n: 1, memory: 'You wouldn\'t promise, but you listened.' } },
            result: '"I can\'t promise that," you say, "but I heard you." Her mouth goes crooked. "That\'s the ' +
              'right answer," she says. "Don\'t promise a tow to a ship you haven\'t looked at. I did, once, and she had a hole in her."',
          },
        ],
      },
      pivot: {
        days: 60, title: 'The Tow',
        get text() {
          const lowMass = G.state.fuel <= ship().fuel * 0.5;
          return 'The hulk on your line has begun to turn. It\'s a slow roll at first, and the line takes it up, and then the roll gets into the line and you feel it in the stick. The hulk\'s beacon is still calling, every four seconds. Bexa has both hands on the controls and her eyes on the scope. "She\'ll tear the cleat out of her bow in an hour," she says, "or she\'ll tear it out of us. I could cut her loose. I\'m not going to cut her loose. Somebody has to go out on the line and take the spin out of her, and I\'m the one who has done it." She reaches for the tether. "Put somebody on the stick."'
            + castRiskLines()
            + (lowMass ? ' The tanks are low, and a hard burn to take up slack is more than the ship can spare.' : ' The tanks are over half, enough for a hard burn if the line comes back on her.');
        },
        choices: [
          { label: 'Let her go out on the line', run: () => theTow(false) },
          { label: 'Send a second hand out with her (the second is hurt for it)', ...gated(needCrew(2)), run: () => theTow(true) },
          { label: 'Cut the line and let the hulk go', memory: 'You cut the tow on me.', run() {
            castFlag('bexa', 'benched'); castLike('bexa', -3, this.memory);
            return 'You tell her to cut the line, and she does, with her own hand on the release. The hulk goes on turning, slowly, its beacon calling every four seconds until it\'s too faint to hear. Bexa sits at the stick for a long while with the tag in her fist. "It\'s your call," she says at last. "I\'ll put her on the list as lost."';
          } },
        ],
      },
    },
  },
  pax: {
    first: 'Pax', last: 'Iwu', culture: 'belt', home: 'Ceres Warren', job: 'ice-drill operator', age: 23, role: 'gunner',
    traits: ['nervous', 'curious'], wage: 600,
    skills: { gunner: 3, engineer: 2, pilot: 0, slicer: 0 }, captain: { trade: 4, nerve: 2, thrift: 2 },
    ambition: 'Wants to stop flinching, and run a ship where nobody gets hurt on their watch.',
    bio: 'Pax ran a drill laser on a Ceres ice crew from sixteen, cutting blocks to the gram, until a coupling failed and the crew\'s foreman was hurt with Pax at the controls. It was nobody\'s fault, and nobody has been able to convince Pax of that.',
    chatter: [
      'Pax is on the range, again, with a perfect score and a tight jaw.',
      'Pax: "I know the numbers. The numbers are fine. It\'s the part after the numbers I\'m bad at."',
      'Pax checks the coupling on the gun mount for the fifth time this watch, and says nothing, and checks again.',
      'Pax is reading the manual for a fire control system that Pax has already memorized, for comfort.',
      'Pax: "It\'s funny. I\'m not nervous when it\'s only me and the target. It\'s when there\'s somebody beside me."'
    ],
    scenes: {
      meet: {
        title: 'The Kid at the Range',
        text: ('In the dock bar there\'s a dart-laser board, and a young person at it with a perfect, unnerving score, who flinches at every cheer. ' +
            'Nobody\'s cheering for long. "Pax Iwu," says the kid, when you sit. "Ice-drill operator. Was." The hand with the dart goes still. "I\'m ' +
            'good with a laser. I\'m the best in the Warren. I want a job where nobody\'s standing next to the thing when it fires." They look up. "That\'s ' +
            'a bad thing to say, I know."'),
        choices: [
          {
            label: 'Offer them the guns',
            when: { berths: 1 },
            effects: { castJoin: 'pax' },
            result: 'The dart goes down, carefully. "Really?" Pax ' +
              'says. That sounded like asking for too much. "I mean, thanks. Yes. I mean, I\'ll try not to flinch." You tell them ' +
              'the flinching can come, too. Pax picks up a bag.',
          },
          {
            label: '"Not this time."',
            effects: { castLater: 'pax' },
            result: '"Right," Pax says, to the board, and puts a dart in the center, and then another beside it. "Sure. I\'m around. I\'m always around. I\'m here every evening." They say it lightly, and the second dart lands a hair off the first.',
          },
        ],
      },
      intro: {
        title: 'The Range Record',
        text: ('Pax Iwu is in the weapons bay with a handheld and a record of range scores, a long column of perfect hits, and a frown. "I\'ve never ' +
            'missed on the range," Pax says, to the screen. "Not one in three years. But the range isn\'t real, is it?" They glance up, quickly, away. ' +
            '"Is it different? When it\'s real?"'),
        choices: [
          {
            label: 'Tell them honestly that it\'s different',
            effects: { castLike: { who: 'pax', n: 2, memory: 'You told me the truth about what it\'s like when it\'s real.' }, castXp: { who: 'pax', role: 'gunner', n: 2 } },
            result: '"Yes," you say. "It\'s different. It\'s louder, and everything you do matters, and your hands shake. Everybody\'s do. You do it ' +
              'anyway, and it gets quieter." Pax lets out a breath, slowly. "Thank you," they say. "Everybody else says it\'s the same. It\'s a relief ' +
              'to be told it\'s not." They go back to the scores.',
          },
          {
            label: 'Say it\'s the same: aim, breathe',
            effects: { castLike: { who: 'pax', n: 1, memory: 'You told me to aim and breathe.' } },
            result: '"Aim, breathe," Pax repeats, and writes it, in small letters, on the inside of the handheld case. "Aim. Breathe." They say it twice more under their breath, and the second time only their lips move.',
          },
        ],
      },
      mid1: {
        days: 10, title: 'The Coupling',
        text: ('The gun mount needs its coupling checked, a ten-minute job that Pax has done many times, and which they\'re standing in front of ' +
            'without moving. The wrench is in their hand, and has been for some time. "I can do it," Pax says, quietly, to the coupling. "I know I can do ' +
            'it. It\'s only a coupling." They stand there, and their knuckles are pale around the tool.'),
        choices: [
          {
            label: 'Check it together',
            effects: { castLike: { who: 'pax', n: 2, memory: 'You checked the coupling with me.' }, castXp: { who: 'pax', role: 'gunner', n: 3 } },
            result: 'You stand beside them, not helping, just present, and, after a minute, Pax puts the wrench to the coupling. It takes twelve minutes, ' +
              'not ten. When it\'s done, Pax breathes out for what must be the first time in a quarter hour, and tests it, twice. "Good," ' +
              'they say. "It\'s good." They put the wrench back in its clip and square it with the rack, and the two of you stand a while longer with the hum of the mount coming up through your boots.',
          },
          {
            label: 'Do it for them',
            effects: { castLike: { who: 'pax', n: 0, memory: 'You did the coupling for me.' } },
            result: 'You take the wrench, and do it in nine ' +
              'minutes. Pax says "Thank you" and watches your hands the whole time. Pax tests the coupling after you, quietly, when ' +
              'they think no one is looking, and finds it perfect, and doesn\'t look any happier about it.',
          },
        ],
      },
      mid2: {
        days: 25, title: 'The Foreman\'s Message',
        text: ('A message from Ceres has been sitting unopened in Pax\'s queue for three days, with a sender name Pax won\'t say aloud. You know ' +
            'what it\'s when you see their face. "It\'s from Foreman Dagny," Pax says, finally. "I don\'t know what it says. I know what I think it ' +
            'says. I\'ve thought it so many times that I don\'t need to read it." They\'re holding the handheld at arm\'s length, like something ' +
            'hot.'),
        choices: [
          {
            label: 'Offer to sit with them while they read it',
            effects: { castLike: { who: 'pax', n: 3, memory: 'You sat with me while I read the foreman\'s message.' }, castXp: { who: 'pax', role: 'gunner', n: 2 }, castFlag: { who: 'pax', flag: 'foreman' } },
            result: 'You sit on the deck beside them, with your back to the bulkhead, saying nothing, and Pax opens it. It\'s short. The foreman is walking ' +
              'again, with a stick, and doesn\'t blame anybody, and would like to see the kid some day. Pax reads it twice, and puts the handheld ' +
              'face-down on their knee, and cries, quietly, for about a minute. Then Pax wipes their face on a sleeve and says, "He says to practice. ' +
              'He says I have the best hands in the Warren." They laugh, a damp, astonished sound.',
          },
          {
            label: 'Tell them to read it when they\'re ready',
            effects: { castLike: { who: 'pax', n: 0, memory: 'You told me to read it when I was ready.' } },
            result: '"Yes," Pax says. "When I\'m ready." It sounds like the right thing, and they put the handheld away. It stays unopened for the rest of ' +
              'the burn. When you pass the weapons bay, Pax has taken it out, and is holding it, and looking at the sender\'s name, and putting it ' +
              'back.',
          },
        ],
      },
      late: {
        days: 45, title: 'Without Flinching',
        text: ('Pax finds you outside the weapons bay, with hands that have stopped shaking, and an alarmed look. "I haven\'t flinched in nine days," ' +
            'they say. "I counted." They take a breath. "I want to run a ship one day. One where nobody gets hurt on my watch. I know you can\'t promise that. I\'d still like to try." They look at the deck. "If you ever get a ship, ask me before you ask anyone else."'),
        choices: [
          {
            label: 'Promise them a ship, someday',
            effects: { castLike: { who: 'pax', n: 2, memory: 'I told you about the ship where nobody got hurt, and you promised.' }, castFlag: { who: 'pax', flag: 'promised' } },
            result: '"Someday," you say, "and you\'ll be asked." Pax opens their mouth and shuts it again, and then the grin gets away from them entirely, wide and helpless. ' +
              '"Nine days," they say. "Nine days, and a ship. If I tell the foreman he won\'t believe me." They go away down the corridor, walking ' +
              'straight, with their hands in plain view.',
          },
          {
            label: 'Make no promises',
            effects: { castLike: { who: 'pax', n: 1, memory: 'You wouldn\'t promise a ship, but you listened.' } },
            result: '"I can\'t promise that," you say, "but I heard you." "That\'s fair," Pax says. "It\'d be strange to be promised. I\'m not ' +
              'used to it." They smile, a crooked one. To your surprise, they say, "Nine days is already a good thing, though. I\'ll ' +
              'take that."',
          },
        ],
      },
      pivot: {
        days: 60, title: 'The Coupling Again',
        get text() {
          const read = !!castRec('pax').flags.foreman;
          return 'A coupling on the gun mount works loose in the middle of a drill, with a hand at the rack beside it, and the mount begins to swing. Pax has the controls, a wrench and about ten seconds. "It\'s the same kind," Pax says, to the screen, in a voice that\'s trying to be level. "If I cut the power it drops on the rack. If I hold it, I have to hold it with someone standing right there." They haven\'t moved their hand from the wrench.'
            + castRiskLines()
            + (read ? ' The foreman\'s message from Ceres is still open on the handheld by the controls, the last line showing: practice.' : ' The foreman\'s message from Ceres is still unopened in the queue.');
        },
        choices: [
          { label: 'Let Pax clear it alone', run: () => theCoupling(false) },
          { label: 'Put a second hand at the rack beside Pax (the second is hurt for it)', ...gated(needCrew(2)), run: () => theCoupling(true) },
          { label: 'Tell Pax to cut the power and let the mount drop', memory: 'You told me to cut the power on the mount.', run() {
            castFlag('pax', 'benched'); castLike('pax', -3, this.memory);
            return 'You tell Pax to cut the power, and Pax does, at once, with a hand on the switch. The mount drops onto the rack with a sound you feel in the deck, and the hand beside it\'s unhurt. Pax stands at the controls with the wrench held out in front of them like something hot. "I could have held it," Pax says. "I think I could have." The coupling is the only thing in the bay that doesn\'t move.';
          } },
        ],
      },
    },
  },
};

// Who you meet. Each game draws two from the pool (drawCastPair), of different posts where it can, and keeps them in st.castPair. CAST_PAIRS
// is how the pairs used to be given, by start background: a game saved before the draw keeps the pair it had, and the tests use it
// to start from a pair they know (tests/helpers.js).
// An authored person's own sittings and talk (family:<key>-<beat> in peopletext.js), with the family scenes, for the editor and the lines tests.
const CAST_TALK = { ...SIT_BEATS, goeson: (p, s, id) => goesOn(p, undefined, id), idle: (p, s, id) => idleTalk(p, id) };
for (const k of Object.keys(CAST)) for (const [beat, make] of Object.entries(CAST_TALK)) if (PEOPLE_LINES[`family:${k}-${beat}`]) FAMILY_SCENES[`${k}-${beat}`] = p => make(p, storyOf(p), `${k}-${beat}`);
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
  const role = ROLE_NAMES[p.role].toLowerCase(), say = key => sceneSay('scene:cast-join', key, { ship: shipTitle(), first: p.first, last: p.last, article: role === 'engineer' ? 'an' : 'a', role });  // the words are the lines of scene:cast-join (hiredscenes.js)
  like(p, 2, say('memory'));
  homeLog(say('log'));
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

// The cost of the second person a pivot lets you send (#135): they go, and come back hurt, and are off their post until the next port (the injury of boarding.js, treated by a medic or the
// clinic on docking). One of the crew on their feet other than the one the pivot is about; the line says who. With nobody to send there is no cost (the gate, needCrew, makes that rare).
function castBackupCost(key) {
  const st = G.state, self = castPerson(key).id, id = st.crew.find(i => i !== self && !(st.injured || {})[i]), c = id && person(id);
  if (!c) return '';
  (st.injured = st.injured || {})[id] = true;
  return `${c.first} comes back hurt, and is off duty until the next port. `;
}
// Yelena's pivot (fate.js decides who lives): a point each for a medic who is not hurt, a hull above 60 percent, her gunner
// skill at 3 or more, and a second person with her. Three or more she lives, two she is marked, fewer she dies.
const castHullPoints = backup => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0)
  + (person('c:yelena').skills.gunner >= 3 ? 1 : 0) + (backup ? 1 : 0);
function overTheHull(backup) {
  const points = castHullPoints(backup), promised = castRec('yelena').flags.promised;
  const outcome = castFate('yelena', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Went over the hull first near ${system().name}.`, 'Left hand never closes properly.', 'gunner');
  const lead = backup ? 'You send a second hand over with her. ' + castBackupCost('yelena') : '';
  if (outcome === 'die') {
    return lead + ('She goes over first, as she said she would. The channel carries the first shot, and then something that\'s not a voice, and then ' +
        'the party, shouting her name. You bring the ship alongside, and you\'re too late, and everyone knows it. When the others come back across the ' +
        'gap they carry the ring-ball from her bag, and nobody says anything about the foul.')
      + (promised ? ' You remember the ship you promised her, and that nobody will ask for it now.' : '');
  }
  castLike('yelena', 2, outcome === 'mark' ? 'You let me go first, and I came back with a hand that doesn\'t close.' : 'You let me go first, and I came back.');
  if (outcome === 'mark') {
    return lead + ('She goes over first, and it goes wrong at the inner lock, and for a long minute the channel is nothing but breath and shouting. ' +
        'She comes back across the gap carried, and the hand she led with doesn\'t close the way it did. "Don\'t," she says, to your face, "say it was ' +
        'worth it. Just say I was there."');
  }
  return lead + 'She goes over the hull first, as she said she would, and the party follows. It\'s loud and fast and over before you\'ve finished counting. She comes back across the gap with a split lip and a stranger\'s cap in her fist. "Nobody on the bench," she says.'
    + (promised ? ' "You said someday," she adds.' : '');
}

// The hull and the medic, as the pivot scenes state them (Yelena's, Ines's, Tomas's), so the player sees what will count.
function castRiskLines() {
  const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6;
  return (low ? ' Your own hull has taken a beating, and a bad hull is a bad place to fall back to.' : ' Your hull is sound.')
    + (medic ? ` ${medic.first} has the med kit open at the hatch.` : ' There\'s nobody aboard who can do more than a field dressing.');
}
const castRiskPoints = () => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0);
const castPoints = n => (n >= 3 ? 'live' : n === 2 ? 'mark' : 'die');

// Ines's pivot: a point each for a medic, a hull above 60 percent, the hand-flown approach practiced with you, and a second hand on the abort.
function coldThrusters(backup) {
  const rec = castRec('ines'), practiced = !!rec.flags.practiced, promised = !!rec.flags.promised;
  const outcome = castFate('ines', castPoints(castRiskPoints() + (practiced ? 1 : 0) + (backup ? 1 : 0)), `Docked the ship on thrusters near ${system().name}.`, 'Her left hand shakes on the controls.', 'pilot');
  const lead = backup ? 'You put a second hand on the abort. ' + castBackupCost('ines') : '';
  if (outcome === 'die') {
    return lead + 'She\'s half a second late on the last burn. The ship meets the collar too fast, and the docking ring takes the bow. When the crew reach the bridge the logbook is open on the console, and the last entry is half written.'
      + (promised ? ' The lawyer\'s next invoice comes in with the batch two days later.' : '');
  }
  castLike('ines', 2, outcome === 'mark' ? 'You let me bring her in on thrusters, and I came in with a hand that shakes.' : 'You let me bring her in on thrusters, and I came in.');
  if (outcome === 'mark') {
    return lead + 'She gets the speed off, nearly all of it, and the ship hits the collar hard enough to throw everyone against their straps. She walks off on her own. Later you see her in the pilot\'s seat, holding her left hand in her right until it stops shaking. It doesn\'t quite stop.';
  }
  return lead + 'She flies it the way she flew the practice: slowly, the numbers out loud, the last few metres at walking pace and then slower. The collar latches without a bump. Ines sits with her hands in her lap. "Boring," she says. "Very boring."'
    + (practiced ? ' "We\'ve done that one before," she adds.' : '');
}

// Tomas's pivot: a point each for a medic, a hull above 60 percent, the plan he taught or wrote down for you, and a second person with him.
function thePlant(backup) {
  const rec = castRec('tomas'), plan = !!rec.flags.plan, promised = !!rec.flags.promised;
  const outcome = castFate('tomas', castPoints(castRiskPoints() + (plan ? 1 : 0) + (backup ? 1 : 0)), `Went into the plant to close the valves near ${system().name}.`, 'His hands ache in the cold.', 'engineer');
  const lead = backup ? 'You send a second person in after him. ' + castBackupCost('tomas') : '';
  if (outcome === 'die') {
    return lead + 'The whine drops. The plant holds. Nobody comes out. When the compartment has cooled you open the hatch, and he\'s at the last valve with the wrench in his hand and the rag still over his face. He had closed them all. The plant runs perfectly for the rest of the burn.'
      + (promised ? ' He asked you once whether you\'d try to keep the crew together, and you said you\'d try.' : '');
  }
  castLike('tomas', 2, outcome === 'mark' ? 'You let me go into the plant, and I came out scalded.' : 'You let me go into the plant, and I came out.');
  if (outcome === 'mark') {
    return lead + 'He comes out carried, both forearms scalded, and the plant holds behind him. He\'ll weld again. He doesn\'t take the flask in his left hand after that, and he doesn\'t complain.';
  }
  return lead + 'He goes in, and comes out in four minutes with no eyebrows, which he doesn\'t mention. The plant settles. He sits on a crate with the flask and tells her, quietly, that she did well.';
}

// Pax's pivot: a point each for a medic, a hull above 60 percent, the foreman's message read, and a second hand at the rack beside them.
function theCoupling(backup) {
  const rec = castRec('pax'), promised = !!rec.flags.promised, read = !!rec.flags.foreman;
  const outcome = castFate('pax', castPoints(castRiskPoints() + (read ? 1 : 0) + (backup ? 1 : 0)), `Held the gun mount at the coupling near ${system().name}.`, 'Their right hand is stiff, and they flinch again at a clank.', 'gunner');
  const lead = backup ? 'You put a second hand at the rack beside Pax. ' + castBackupCost('pax') : '';
  if (outcome === 'die') {
    return lead + 'Pax gets the wrench onto the coupling and the mount drops anyway, and Pax is between it and the rack, which is where Pax put themself. The hand at the rack is untouched. The mount comes to rest on the deck with the wrench still turning in the coupling, a quarter turn, and another.'
      + (promised ? ' You remember the ship you promised them, and that nobody will ask for it now.' : '');
  }
  castLike('pax', 2, outcome === 'mark' ? 'You let me hold the mount, and I came out with a hand that doesn\'t close.' : 'You let me hold the mount, and I came out.');
  if (outcome === 'mark') {
    return lead + 'Pax gets the wrench on and the coupling seats, and the mount takes two fingers of Pax\'s right hand on the way down. Pax walks to the med bay on their own, and says on the way that the hand at the rack is fine. After that, at the range, Pax stands with the hand in a pocket between runs, and flinches again at the clank of the mount.';
  }
  return lead + 'Pax puts the wrench on the coupling with the mount still swinging, and the hand at the rack puts a shoulder to the arm, and the two of them hold it for eleven seconds, side by side, until the coupling seats. Pax doesn\'t flinch. They check it twice, as they always do, and then sit down on the deck beside the hand who stood there, and neither says anything.'
    + (read ? ' "The foreman said practice," Pax says, to the coupling. "I practiced."' : '');
}

// Ruben's pivot: a point each for a medic, a hull above 60 percent, the councillor who vouches for the relay, and a second person at the mast.
function theMast(backup) {
  const rec = castRec('ruben'), promised = !!rec.flags.promised, named = !!rec.flags.councillor;
  const outcome = castFate('ruben', castPoints(castRiskPoints() + (named ? 1 : 0) + (backup ? 1 : 0)), `Went out to the north mast to hold the band open near ${system().name}.`, 'He hears the quiet band in one ear only.', 'slicer');
  const lead = backup ? 'You send a second person out to the mast with him. ' + castBackupCost('ruben') : '';
  if (outcome === 'die') {
    return lead + 'He goes out the lock with the tool roll on his belt and the dish tilting above him, and for eleven minutes the open band is his voice, calling the bolts as he turns them, one, two, three, and a dome somewhere answering each. The flare arrives on the fourth. The band fills with noise, and then with a number, which is the last thing he says, and then with the dome, saying it back.'
      + (promised ? ' You remember the room for a relay you told him there\'d be.' : '');
  }
  castLike('ruben', 2, outcome === 'mark' ? 'You let me go out to the north mast, and I came back with one good ear.' : 'You let me go out to the north mast, and I came back.');
  if (outcome === 'mark') {
    return lead + 'He gets the third bolt turned and the mast swings true, and the flare comes in before he\'s through the lock. When you reach him he\'s on the airlock deck with both hands over his left ear. The dome is already answering. "I can hear it," he says, loudly, about the dome. "Mostly." After that he turns the volume up on the quiet band, and sits closer to the speaker.';
  }
  return lead + 'He goes out with the thermos clipped to his belt, which nobody argues with, and calls the bolts as he turns them so the dome can follow along. The mast swings true in nine minutes. The flare comes in as the lock cycles, and the open band fills with a dome council all talking at once, which is the best noise he knows. "There," Ruben says, pink with cold. "Heard."'
    + (promised ? ' "You said there\'d be room," he adds, and pours you a cup.' : '');
}

// Bexa's pivot: a point each for a medic, a hull above 60 percent, more than half the reaction mass, and a second hand on the line.
function theTow(backup) {
  const rec = castRec('bexa'), promised = !!rec.flags.promised, mass = G.state.fuel > ship().fuel * 0.5;
  const outcome = castFate('bexa', castPoints(castRiskPoints() + (mass ? 1 : 0) + (backup ? 1 : 0)), `Went out on the tow line near ${system().name}.`, 'Her left hand is numb from the cold, and she flies with the right.', 'pilot');
  const lead = backup ? 'You send a second hand out on the line with her. ' + castBackupCost('bexa') : '';
  if (outcome === 'die') {
    return lead + 'She goes out hand over hand along the line, and the hulk\'s roll slows, and slows, and then the line lets go. It doesn\'t part with a bang. It goes all at once, like a breath, and the tug jumps forward a hundred meters before anyone has a hand on the stick. Her suit beacon comes up on the board beside the hulk\'s, and the two of them call in turn, four seconds apart, until the second one stops.'
      + (promised ? ' You remember the ship you promised her, and that nobody will ask for it now.' : '');
  }
  castLike('bexa', 2, outcome === 'mark' ? 'You let me go out on the line, and I came back with a hand that\'s numb.' : 'You let me go out on the line, and I came back.');
  if (outcome === 'mark') {
    return lead + 'She takes the spin out of the hulk, and the line comes slack, and the cold gets into her left hand on the way back to the lock. She flies the rest of the run with the right, the left held in her lap with the glove still on. "It\'ll come back," she says, about the hand, and doesn\'t take the glove off to show you.';
  }
  return lead + 'She takes the spin out of the hulk in eleven minutes by the clock, hand over hand along the line, and the hulk comes round to follow the tug like a dog that has been told. She comes back through the lock with frost in her eyebrows. At the next port she adds a line to the list, in the column with the others: a name, a date, a hull number.'
    + (promised ? ' "You said someday," she adds, and hangs the brass tag back above the console.' : '');
}

// A scene with a `closed` reading plays it, in place of the scene itself, when the person's regard for the hand is below friendly
// (the first officers' "what they know", cato.js): the same slot, so nothing is skipped. The open reading of one that tells the captain's secret has a `flag`.
// A choice written as data ({ label, result, effects }) is played as the closure the game always played: its effects, then its result (#342). A choice with
// a run() is left as it is, so a scene can have both.
// A hired event passes its context (the shipmate it is about) for the effects that need one, and a `learn` effect adds its line about experience to the result (#473).
// A data choice's `when` shuts it as the code did (#460): credits as gated(needCr(n)) does, with its reason, a free berth as gated(needBerth) does (#461), a regard as the opinion gate does (captains.js), and any other
// condition as a storylet's choice does, shut with no reason given.
function choiceGate(when) {
  const { credits, berths, opinion, ...rest } = when, checks = [];
  if (credits !== undefined) checks.push(needCr(credits));
  if (berths !== undefined) checks.push([() => berthsFree() >= berths, () => 'There\'s no free berth aboard.']);
  if (Object.keys(rest).length) checks.push([() => meets(rest), () => '']);
  return { ...(checks.length ? gated(...checks) : {}), ...(opinion ? { opinion } : {}) };
}
const dataChoice = (c, ctx) => (c.run ? c : { ...c, ...(c.when ? choiceGate(c.when) : {}), run() { applyEffects(c.effects, ctx); const n = c.effects && c.effects.learn; return n && hired() ? c.result + learnNote(n) : c.result; } });
// The id a scene has in js/hiredscenes.js, found by the object it is (a scene made on the spot, like a first officer's round, has none). A first officer's word before the
// first fight (`firstRaid`) is listed with their scenes.
const castSceneId = (key, sc, shown) => { const e = Object.entries({ ...CAST[key].scenes, ...(CAST[key].firstRaid ? { firstRaid: CAST[key].firstRaid } : {}), ...(CAST[key].firstDeck ? { firstDeck: CAST[key].firstDeck } : {}) }).find(([, x]) => x === sc); return e ? `cast:${key}:${e[0]}${shown !== sc ? ':closed' : ''}` : null; };
const castScene = (key, sc) => {
  const s = sc.closed && castPerson(key).opinion < OPINION.FRIEND ? sc.closed : sc;
  if (s.flag) captainFlag(s.flag);  // a fact the open reading tells (the captain's secret, #283): the goodbye reads it, as it does when the captain tells it
  const scene = sceneWords(castSceneId(key, sc, s), { title: s.title, text: s.text, personal: true, choices: s.choices });  // the editor's words, if any (storylets.js)
  return { ...scene, choices: scene.choices.map(c => dataChoice(c)) };
};

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
