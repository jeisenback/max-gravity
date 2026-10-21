'use strict';

// Dov Adair and his first officer Ilsa Brandt (js/captains/ilsa.js). The warm talker: collects favors and passengers, tells
// the same three stories well, remembers your family's names. His fund does not balance, and has not for two years. Her
// text is hers (js/captains/ilsa.js); his uses "he". {post} is the hand's post and {names} who left with them.

CAPTAINS.dov = {
  first: 'Dov', last: 'Adair', pronouns: 'he', culture: 'earth', home: 'Marseille Arcology', age: 47, traits: ['talkative', 'generous'],
  bio: 'Always has a passenger and a story. He gives out wages and favors with the same open hand, and keeps the books the way some people keep a drawer.',
  wants: 'To be liked, and not to be alone on the bridge at night.', fears: 'Silence, and being found out.',
  captain: { trade: 2, nerve: 2, thrift: 1 }, wage: 500, share: 0.08, hears: -1, bonus: 0, talk: 1.5,
  xo: 'ilsa',

  intro: (wage, share) => (`Captain Dov Adair is shaking your hand before you've finished coming up the ramp. He has read your papers, and your ` +
      `next of kin, and he says your sister\'s name correctly, the first time. "${wage} a day and ${share} percent," he says, "and if the fund runs ` +
      `thin, which it does, we don't talk about it before supper. Sit. Have you eaten?"`),

  chatter: [
    'Captain Adair is telling the story about the pump and the harbourmaster, for the third time this watch.',
    'Captain Adair has a passenger in the galley and is asking after the passenger\'s mother by name.',
    'Captain Adair, to the bridge at large: "Does anyone else hear that? No? Good. I was only checking."',
    'Ilsa has put the fuel order through again, correctly, over the one the captain put through. Nobody has mentioned it.',
    'Captain Adair is writing a card to someone at the last port. He has been writing it since the last port.',
    'Captain Adair has left the bridge door open, which he does at night. It\'s a long way down the passage to the next lit door.',
    'Captain Adair: "Have you eaten? You haven\'t eaten. Sit down. Sit down."',
    'Captain Adair has forty-one contacts on the board, and knows what each of them had for the last holiday.',
  ],

  // How they take a hand's suggestion of a different run (suggest.js): `ok` by their style, and a line for each answer.
  sway: { ok: () => true, yes: 'Captain Adair is delighted to be asked. "Now that\'s a thought," he says, and tells three people before the hatch is shut. "Your way. I always say a ship should have opinions."', no: '' },

  events: {
    'cap-order': {
      text: ('Captain Adair wants the drive run hotter than you would. He promised a woman at the last port that her crates would be there by the ' +
          'fifth, and didn\'t look at the berth window until this morning. He tells it against himself, and well. "I know," he says. "I know. Do it ' +
          'anyway, and I\'ll make it up to everyone."'),
      ordered: 'You run it hot. The window is made, just. He claps you on the shoulder, and tells the galley about it twice before the next watch, and by the second time you\'re the hero of it.',
      heard: 'You say it plainly. He listens with his whole face. "You\'re right," he says. "Ninety. I\'ll ring her and tell her the truth. She\'ll forgive me. They always do."',
      notHeard: 'You say it, and for the first time you see him go quiet. "I didn\'t ask," he says. You run it hot.',
    },
    'cap-praise': {
      text: 'Captain Adair catches you at the end of the watch and tells you, at length and with names, how well the {post} has been run. He has told two passengers already.',
      take: '"The crew make it easy," you say. He laughs, and says that\'s just what he tells people, and you both know he does. You stand straighter.',
      bonusYes: 'He doesn\'t even pause. "Six hundred," he says, and is already counting it out of the cash box. "Don\'t tell Ilsa."',
      bonusNo: 'He puts a hand over the cash box. "Not this week," he says. "Ask me when I\'ve been to the bank." You leave it there.',
    },
    'cap-dressing': {
      text: 'There\'s a watch with no entry in the log, and Captain Adair has found it. He puts the log on the galley table and talks about the weather for a minute first, and then about your sister, and then he turns the log round.',
      own: '"That was mine," you say. "It\'ll be fixed tonight." "Of course it will," he says. "I only wanted to be sure you were all right."',
      blame: 'You mention the terminal. "Of course," he says. "Of course. Let\'s have a look." He hasn\'t stopped smiling, but the smile has changed.',
      terminal: '"Let\'s have a look," Captain Adair says, and pulls the terminal across, and the two of you watch it for a minute without talking.',
      showWin: 'It does it: a line blinks out and back. "There!" he says, "I\'ll have it replaced. I knew it."',
      showLose: 'It does nothing. He watches it a while longer than he needs to. "Well," he says, kindly. "Well. Everyone has an off night."',
      admit: 'You say it late. He puts a hand on your arm. "Thank you for saying so," he says. "I\'d rather be told. People think I\'d rather not." For a moment he doesn\'t talk, and you hear how quiet the galley is.',
    },
    'cap-favour': {
      text: 'Captain Adair asks whether you\'d stand an extra watch so a passenger can sleep. He asks as he asks everything, with his hands open. It\'s not in the articles. "I\'ll owe you one," he says. "I owe a lot of people one."',
      stand: 'You take it. The hours go slowly, and the passenger sleeps, and in the morning the captain has told the whole galley what you did, and who for, and what the passenger\'s mother said when she heard.',
      fee: 'He pays it out of the cash box, four hundred, and adds a hundred on top for no reason he gives. The watch passes like any other.',
      beg: '"Of course," he says at once, brightly. "Of course. No, no." He goes to ask somebody else. It takes him longer than it should to find them.',
    },
  },

  scenes: {
    trouble: {
      title: 'Short at the Dock',
      text: ('The fuel dock won\'t release the fuel. The fund is short, and Captain Adair, who has told the harbourmaster three stories already, is ' +
          'working on a fourth. He turns to you in the middle of it. "You have an honest face," he says. "Would you tell her we\'re good for it? Just ' +
          'that. Or if you had three thousand... no. No. Tell her we\'re good for it." The harbourmaster looks at you.'),
      choices: [
        {
          label: 'Vouch for him',
          effects: { captainLike: { n: 2, memory: 'You told the harbourmaster we were good for it.' } },
          result: 'You say it. She looks at the captain, and at the fund board, and at you, and puts the stamp on the form. "Once," she says. He\'s crying, and laughing at himself for it.',
        },
        {
          label: 'Cover three thousand from your savings',
          when: { credits: 3000 },
          effects: { credits: -3000, captainLike: { n: 3, memory: 'You covered the fuel when the fund was short.' }, captainFlag: 'lent' },
          result: 'You pay it at the window, in your own cash. He stands still beside you. "I\'ll pay you back," he says, and for once doesn\'t tell a story about it. He writes the figure on the back of his hand.',
        },
      ],
    },
    secret: {
      confide: {
        title: 'The Cash Box',
        text: ('Late in the watch Captain Adair doesn\'t talk. It takes you a while to notice. He puts the cash box on the table and opens it, and ' +
            'shows you the book beside it, which isn\'t a ledger so much as a list of kindnesses: a fare forgiven, a loan to a deckhand, a gift to a ' +
            'dock family in a bad year. "I\'ve been taking it out of the fund," he says. "Not for me. Well. Mostly not for me. It doesn\'t balance. ' +
            'It hasn\'t balanced in two years, and every quarter it does, and I don\'t know why." He looks at the book. "I\'m afraid to ask."'),
        choices: [
          {
            label: 'Tell him to ask Ilsa',
            effects: { captainLike: { n: 2, memory: 'You told me to ask Ilsa.' }, captainFlag: 'secretKnown' },
            result: 'He\'s quiet. "I know," he says. "That\'s the trouble. I know exactly who it is."',
          },
          {
            label: 'Say you\'ll say nothing',
            effects: { captainLike: { n: 2, memory: 'You said you\'d say nothing about the book.' }, captainFlag: 'secretKnown' },
            result: 'You say you will. He closes the box and holds it in both hands. "Thank you," he says. For once he doesn\'t follow it with a story.',
          },
        ],
      },
      found: {
        title: 'The Initials',
        text: ('You\'re looking for the wrong page of the fund book and find the right one. There\'s a column of deposits every quarter in the same ' +
            'small hand, initialled I.B., none of them from the bank. They arrive a day before every audit and a day after every shortfall. You\'re ' +
            'still looking at them when Captain Adair comes in. He sees the page, and what it is, and for the first time since you came aboard he has ' +
            'nothing to say.'),
        choices: [
          {
            label: 'Close the book and say nothing',
            effects: { captainLike: { n: 0, memory: 'You closed the fund book and said nothing.' }, captainFlag: 'secretKnown' },
            result: 'You close it, and put it where you found it. He watches you do it. "Thank you," he says, and goes out. You hear him in the galley a minute later, talking to someone.',
          },
          {
            label: 'Ask him what the initials are',
            effects: { captainLike: { n: -1, memory: 'You asked me about the initials in the fund book.' }, captainFlag: 'secretKnown' },
            result: '"Ilsa," he says. "Ask Ilsa. Please. Don\'t ask me." He puts his hands in his pockets, and takes them out again.',
          },
        ],
      },
    },
  },

  goodbye: {
    title: 'The Foot of the Ramp',
    warm: 'Captain Adair is at the foot of the ramp with a paper bag that smells of bread. "I didn\'t know what to give you," he says. "So it\'s food. It\'s always food."',
    neutral: 'Captain Adair meets you at the foot of the ramp and walks you to the end of the dock, talking, so that the goodbye takes a good deal longer than it should.',
    cold: 'Captain Adair is at the foot of the ramp. He doesn\'t tell a story. He shakes your hand and says he\'s sorry it went the way it did.',
    crew: '{names} will go with you. "I\'m glad they\'re going with you," he says. "They like you. I could see it from the first week."',
    secret: 'The book he keeps is out of sight. "Look after your own fund," he says. "Not like mine."',
    repay: 3300,
    repaid: 'He presses three thousand three hundred into your hand, the day you leave, and a card with the three stories you liked best written on the back, in case you want to tell them.',
    xoDead: 'Ilsa\'s chair on the bridge is empty, and he hasn\'t moved it. "I took her for granted," he says. "I took all of it for granted. I didn\'t know it was she who was holding it up."',
    xo: 'Ilsa is at the hatch with her arms folded. "He won\'t say it," she says, "so I will. You were good to him. Don\'t tell him I said so."',
    parting: 'He hugs you. "Come and see us," he says. "Come and see me. I\'ll be here. There\'s always somebody in the galley."',
    choices: [
      {
        label: 'Thank him for the work',
        effects: { captainLike: { n: 2, memory: 'You thanked me for the work.' } },
        result: 'You thank him. He says it was nothing, and then tells you what it was.',
      },
      {
        label: 'Tell him to ask Ilsa for help',
        when: { captainFlag: 'secretKnown' },
        effects: { captainLike: { n: 2, memory: 'You told me to ask for help.' } },
        result: 'He takes out a card and begins to write. "I will," he says. "I\'ll ask her to dinner. That\'s a start."',
      },
      {
        label: 'Take the bread and go',
        effects: { captainLike: { n: 0, memory: 'You took the bread and went.' } },
        result: 'You take the bread and go. You look back from the end of the dock, and he\'s still at the foot of the ramp, waving.',
      },
    ],
  },
};
