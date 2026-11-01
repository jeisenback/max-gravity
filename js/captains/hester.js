'use strict';

// Hester Vance and her first officer Cato Rahman (js/captains/cato.js). The ledger-keeper: a rating for twenty years, now eleven
// years into a hire-purchase charter on the ship (docs/bible/people/hester.md), who speaks in sums.
// Her own text uses "she"; {post} is the hand's post and {names} who left with them.

CAPTAINS.hester = {
  first: 'Hester', last: 'Vance', pronouns: 'she', culture: 'earth', home: 'Rotterdam Arcology', age: 52, traits: ['secretive'],
  bio: 'An agency rating on ore haulers for twenty years, and now eleven years into a fifteen-year hire-purchase charter on this ship, from a Rotterdam finance house. The house can read the ship\'s accounts, so she keeps her own in a notebook, and can tell you the cost of a watch to the credit.',
  wants: 'To make the last payment and own the ship.', fears: 'A third missed payment, and being a rating again.',
  captain: { trade: 4, nerve: 1, thrift: 5 }, wage: 350, share: 0.06, hears: 1, bonus: 3, talk: 0.7,
  xo: 'cato', xoTitle: 'Bosun', xoPerk: 'Runs the ratings and the rota, and holds the first-aid rating.',  // Cato is the bosun (docs/bible/people/cato.md); the post stays the xo slot until #879

  // The sign-on paragraph's last lines, in place of "whom the crew describe as ...".
  intro: (wage, share) => (`Captain Hester Vance reads your papers twice. The second time she has a pencil, and she writes your wage into a ruled ` +
      `notebook before she looks up. "${wage} a day and ${share} percent of what we clear," she says. "That's the whole of it. I won't surprise ` +
      `you, and I'd like you not to surprise me."`),

  chatter: [
    'Captain Vance is working the fuel bill out in her notebook. It doesn\'t come out any better the second time.',
    'Captain Vance, to nobody: "Four hundred and ten a day for the berth, and we\'re there four days."',
    'Cato has put a second blanket on the berth of whoever has the cold watch. The captain\'s notebook has a line for blankets. It hasn\'t been filled in.',
    'Captain Vance checks the manifest against the hold count, and for the third time against the hold.',
    'Captain Vance is eating standing up at the galley counter, one hand on the notebook, so as not to lose the page.',
    'Captain Vance has stopped by the {post} station and not said anything. She does that. It means the numbers are fine.',
    'Captain Vance writes the fuel price from the last depot inside the notebook\'s cover, under the one before it.',
    'A message comes in from the finance house. Captain Vance reads it in the passage, standing, and puts it in her breast pocket unanswered.',
  ],

  // Her wording for the four shared events (hiredevents.js). What the choices do stays there; a part left out falls back to the
  // generic text.
  // How they take a hand's suggestion of a different run (suggest.js): `ok` by their style, and a line for each answer.
  sway: {
    ok: (o, cur) => o.profit >= 0.9 * (cur.profit || 0),
    yes: 'Captain Vance looks at your figure, and then at hers. It\'s within a tenth, and she draws a line through hers. "Your way," she says. "Don\'t make me regret the notebook."',
    no: 'Captain Vance puts her figure beside yours without a word. It\'s better by more than a tenth. "We go as planned," she says, and turns the page.'
  },

  events: {
    'cap-order': {
      text: ('Captain Vance wants the drive run hotter than you would. The berth window at the next port closes in six days, and arriving after it ' +
          'costs two days of fuel. She has done the sum on the back of the manifest and turned it so you can read it. "It\'s not an order I like ' +
          'either," she says. "It\'s the cheaper one."'),
      ordered: 'You run it the way she wrote it. The window is made with a minute to spare. She initials the page and says nothing.',
      heard: 'You say it plainly: what the extra heat does to the housings, and what a housing costs. She looks at the sum again and crosses a line out. "Nine percent," she says. "Not ten." It\'s the first time she has changed a number in front of you.',
      notHeard: '"I didn\'t ask what you thought of the sum," she says. "I asked for the burn." You run it hot, and it works.',
    },
    'cap-praise': {
      text: 'Captain Vance finds you at the end of a watch with the notebook open. "The {post} hasn\'t cost me a repair or a worry in a week," she says. "I\'ve written it down."',
      take: '"The crew make it easy," you say. She turns a page.',
      bonusYes: 'She looks at you, and at the notebook, and laughs. "Six hundred," she says. "It\'s in the column already." It reaches your account before the end of the watch.',
      bonusNo: '"When it\'s a word, it\'s free," she says. "When it\'s a bonus, it has to be earned. I have a column for each."',
    },
    'cap-dressing': {
      text: 'There\'s a watch with no entry in the log, and Captain Vance has found it. She doesn\'t shout. She puts the log on the galley table, turns it so it faces you, and lays a pencil across the gap. Then she waits.',
      own: '"That was mine," you say. "I\'ll fix it tonight." She takes the pencil back. "Tonight," she says, and writes the word in the margin.',
      blame: 'You mention the terminal, which does lose entries, now and then. "Then we\'ll see," she says.',
      terminal: '"Then we\'ll see," Captain Vance says, and pulls the terminal across the table. The two of you watch the log for a minute while it does nothing at all.',
      showWin: 'Just as you open your mouth, it does it: one line blinks out and back. She reads the line twice. "I\'ll have it replaced," she says. "And I was wrong. I\'ll put that in the book."',
      showLose: 'It does nothing. The log sits there, clean and obedient. She looks at it, and at you, and says, "Well." She writes something small in the notebook, and doesn\'t show you what.',
      admit: 'You say it late, with your eyes on the table. "That\'s the second true thing you\'ve told me tonight," she says. "The first one cost you more." She writes it down, with the date.',
    },
    'cap-favour': {
      text: 'Captain Vance asks whether you\'d stand an extra watch so a crew member can sleep, and say nothing about it. It\'s not in the articles, and she says so. "I\'ll owe you the hours," she says.',
      stand: 'You take it, and the long hours go slowly, with a flask of the galley\'s worst coffee. Nobody mentions it. She mentions it once, at the next port, in a sentence with a number in it.',
      fee: 'She pays it out of her own pocket, without comment, and writes it down. The watch passes like any other.',
      beg: '"Of course," she says, and goes to ask somebody else. The hours go into the book anyway.',
    },
  },

  // Her two scenes (captains.js plays them once each, in order, once the days are up). The second reads by trust.
  scenes: {
    trouble: {
      title: 'The First of the Month',
      text: ('The charter payment is due on the first, and the fund is four thousand short of it. Captain Vance tells you at the galley table, ' +
          'with the notebook open between you. "I don\'t borrow and I don\'t lend," she says. "I\'m asking whether you\'ll take this port\'s pay at the ' +
          'next port instead. With interest. Written down."'),
      choices: [
        {
          label: 'Take your pay at the next port',
          when: { credits: 4000 },
          effects: { credits: -4000, captainLike: { n: 3, memory: 'You took your pay a port late when the fund was short.' }, captainFlag: 'lent' },
          result: 'You say yes. She writes it in the notebook while you watch: four thousand, the date, and a figure beside it. She turns the book so you can read it. "Four thousand one hundred," she says, "the day you leave this ship, or the next port, whichever you ask for."',
        },
        {
          label: 'Tell her it\'s not your place',
          effects: { captainLike: { n: 0, memory: 'You said it wasn\'t your place to wait for your pay.' } },
          result: '"It\'s not," she says. "That\'s why I asked." She turns the notebook round and goes on with the figures. The payment is made on the first. You never learn how.',
        },
      ],
    },
    secret: {
      confide: {
        flag: 'ownersDebt',  // the spine (#294): the Ore Runner's owners were each one payment short
        title: 'What the Notebook Is For',
        text: ('Late in the watch Captain Vance asks you to sit. She turns the notebook round so you can read the last page, and lays a pencil across ' +
            'it. "The ship isn\'t mine," she says. "She\'s the house\'s for four more years. Three missed payments and they take her back, with ' +
            'everything I\'ve paid. I\'ve missed two. There\'s an Ore Runner ' +
            'on the yard list at the next port with her name painted over. Same house. Three owners, and each of them got to three. I\'m ' +
            'one from it. I\'ve counted." She turns a page. "Cato knows. You\'re the second."'),
        choices: [
          {
            label: 'Say you\'ll keep it to yourself',
            effects: { captainLike: { n: 2, memory: 'You said you\'d keep the house to yourself.' }, captainFlag: 'secretKnown' },
            result: 'You say you will. She closes the notebook and holds it shut with both hands. "Thank you," she says. It\'s the first time you\'ve heard her say it without a number after it.',
          },
          {
            label: 'Ask how much she still owes',
            effects: { captainLike: { n: 1, memory: 'You asked how much I owed, and didn\'t flinch.' }, captainFlag: 'secretKnown' },
            result: '"Three hundred and eighty thousand, and some of it\'s interest," she says, and doesn\'t hesitate. "Forty-eight payments. I\'ve made a hundred and thirty-two."',
          },
        ],
      },
      found: {
        flag: 'ownersDebt',
        title: 'Under the Sugar',
        text: ('There\'s a letter on the galley table, unfolded, under the sugar tin. It\'s from the finance house. You read three lines before you understand ' +
            'what you\'re reading: a second payment has been missed, a third will end the charter, and Captain Vance\'s name is typed at the top ' +
            'above the word NOTICE. The second page is a schedule of ships the house has taken back since the spring, and the Ore Runner is the third line. ' +
            'You hear her in the passage. She comes in, and sees the letter, and sees you, and her face doesn\'t change at all. "Sit down," she says. ' +
            '"That wasn\'t for you."'),
        choices: [
          {
            label: 'Say you didn\'t read it',
            effects: { captainLike: { n: -2, memory: 'You said you hadn\'t read the house\'s letter, and you had.' }, captainFlag: ['secretKnown', 'secretAngry'] },
            result: '"The tin was open and the letter was face up," she says. "You read it, and you\'ve told me you didn\'t, and I\'ll remember both." She takes the letter, and puts it in her breast pocket, and goes out.',
          },
          {
            label: 'Say you read it, and will say nothing',
            effects: { captainLike: { n: 0, memory: 'You said you had read the house\'s letter, and would say nothing.' }, captainFlag: ['secretKnown', 'secretAngry'] },
            result: 'She\'s angry, and she says so. "It wasn\'t for you," she says again. Then: "But you told me. I\'ll put that in the other column." She takes the letter, and goes.',
          },
        ],
      },
    },
  },

  // What she says when you leave (captains.js reads it before the ship is yours). Parts: an opening by how she feels about you,
  // a line for crew who go with you, one for the secret, one for Cato (dead or alive), a parting line, and how you leave.
  goodbye: {
    title: 'The Foot of the Ramp',
    warm: 'Captain Vance is waiting at the foot of the ramp when you come down, with the notebook under one arm. "I have your account," she says. "It\'s correct. I\'d like you to check it anyway."',
    neutral: 'Captain Vance meets you at the foot of the ramp with the papers and the notebook. She counts your last pay twice, into your hand, and has you sign for it.',
    cold: 'Captain Vance is at the foot of the ramp, and she has the papers ready. She doesn\'t offer her hand. "Your account is correct," she says. "Sign here, and here."',
    crew: '{names} will go with you. She runs a finger down the crew list. "That\'s a column I\'ll have to fill again," she says.',
    secret: 'She doesn\'t mention the house. "The first of the month," she says, "and the first after that. I\'ll be there for them."',
    repay: 4100,
    repaid: 'She counts four thousand one hundred onto the rail, the day you leave, as she said she would. You count it after her. It\'s correct.',
    xoDead: 'She doesn\'t look at the empty place on the watch bill. "I\'ve taken Cato out of the book," she says. "I had to. It\'s the first time I didn\'t want to."',
    xo: 'Cato is at the hatch, because the captain wouldn\'t go and say it. "Take care of your people," he says. "They\'ll take care of you. I\'ve put your name on the back of the bill, so I remember to ask after you."',
    parting: 'She holds out her hand at last. It\'s dry and brief. "That\'s the account closed," she says. "Keep your own books."',
    choices: [
      {
        label: 'Thank her for the work',
        effects: { captainLike: { n: 2, memory: 'You thanked me for the work, and meant it.' } },
        result: 'You thank her. She writes nothing in the notebook.',
      },
      {
        label: 'Wish her the ship',
        when: { captainFlag: 'secretKnown' },
        effects: { captainLike: { n: 2, memory: 'You wished me the ship.' } },
        result: '"I\'ll keep her," she says, and opens the notebook.',
      },
      {
        label: 'Take the papers and go',
        effects: { captainLike: { n: 0, memory: 'You took the papers and went.' } },
        result: 'You take the papers and go. She doesn\'t call after you. When you look back from the dock she has the notebook open again, and is writing.',
      },
    ],
  },
};
