'use strict';

// Hester Vance and her first officer Cato Rahman (js/captains/cato.js). The ledger-keeper: a hand once, now the owner of a
// ship mortgaged to the hilt, who speaks in sums. Her first officer is generous with time where she is generous with nothing.
// Her own text uses "she"; {post} is the hand's post and {names} who left with them.

CAPTAINS.hester = {
  first: 'Hester', last: 'Vance', pronouns: 'she', culture: 'earth', home: 'Rotterdam Arcology', age: 52, traits: ['greedy', 'secretive'],
  bio: 'A hand on ore haulers for twenty years, and now the owner, on paper, of the ship she crews, which the bank owns most of. She keeps the books herself, in a notebook, and can tell you the cost of a watch to the credit.',
  wants: 'To own the ship outright.', fears: 'Being a hand again, and the bank taking her.',
  captain: { trade: 4, nerve: 1, thrift: 5 }, wage: 35, share: 0.06, hears: 1, bonus: 3, talk: 0.7,
  xo: 'cato',

  // The sign-on paragraph's last lines, in place of "whom the crew describe as ...".
  intro: (wage, share) => (`Captain Hester Vance reads your papers twice. The second time she has a pencil, and she writes your wage into a ruled ` +
      `notebook before she looks up. "${wage} a day and ${share} percent of what we clear," she says. "That is the whole of it. I will not surprise ` +
      `you, and I would like you not to surprise me."`),

  chatter: [
    'Captain Vance is working the fuel bill out in her notebook. It does not come out any better the second time.',
    'Captain Vance, to nobody: "Forty-one a day for the berth, and we are there four days."',
    'Cato has put a second blanket on the berth of whoever has the cold watch. The captain\'s notebook has a line for blankets. It has not been filled in.',
    'Captain Vance checks the manifest against the hold count, and then, for the third time, against the hold.',
    'Captain Vance is eating standing up at the galley counter, one hand on the notebook, so as not to lose the page.',
    'Someone has left a coffee ring on the ledger. Captain Vance is looking at it as if it owed her money.',
    'Captain Vance has stopped by the {post} station and not said anything. She does that. It means the numbers are fine.',
    'A message comes in from the bank. Captain Vance reads it in the passage, standing, and puts it in her breast pocket unanswered.',
  ],

  // Her wording for the four shared events (hiredevents.js). What the choices do stays there; a part left out falls back to the
  // generic text.
  // How they take a hand's suggestion of a different run (suggest.js): `ok` by their style, and a line for each answer.
  sway: {
    ok: (o, cur) => o.profit >= 0.9 * (cur.profit || 0),
    yes: 'Captain Vance looks at your figure, and then at hers. It is within a tenth, and she draws a line through hers. "Your way," she says. "Do not make me regret the notebook."',
    no: 'Captain Vance puts her figure beside yours without a word. It is better by more than a tenth, and she does not need to say so. "We go as planned," she says, and turns the page.'
  },

  events: {
    'cap-order': {
      text: ('Captain Vance wants the drive run hotter than you would. The berth window at the next port closes in six days, and arriving after it ' +
          'costs two days of fuel. She has done the sum on the back of the manifest and turned it so you can read it. "It is not an order I like ' +
          'either," she says. "It is the cheaper one."'),
      ordered: 'You run it the way she wrote it. The window is made with a minute to spare. She initials the page and says nothing, and the nothing has a figure in it.',
      heard: 'You say it plainly: what the extra heat does to the housings, and what a housing costs. She looks at the sum again and crosses a line out. "Nine percent," she says. "Not ten." It is the first time she has changed a number in front of you.',
      notHeard: '"I did not ask what you thought of the sum," she says, not unkindly. "I asked for the burn." You run it hot, and it works, which does not help.',
    },
    'cap-praise': {
      text: 'Captain Vance finds you at the end of a watch with the notebook open. She says the {post} has not cost her a repair or a worry in a week, and that she has written it down. It is, from her, a speech.',
      take: '"The crew make it easy," you say. She nods once and turns a page. You stand straighter for the rest of the watch.',
      bonusYes: 'She looks at you, and then at the notebook, and then, to your surprise, laughs. "Sixty," she says. "It is in the column already." It reaches your account before the end of the watch.',
      bonusNo: '"When it is a word, it is free," she says. "When it is a bonus, it has to be earned. I have a column for each." You have the feeling of having spent something you did not have.',
    },
    'cap-dressing': {
      text: 'There is a watch with no entry in the log, and Captain Vance has found it. She does not shout. She puts the log on the galley table, turns it so it faces you, and lays a pencil across the gap. Then she waits.',
      own: '"That was mine," you say. "I will fix it tonight." She looks at you a moment longer, and takes the pencil back. "Tonight," she says, and writes the word in the margin.',
      blame: 'You mention the terminal, which does lose entries, now and then. "Then we will see," she says.',
      terminal: '"Then we will see," Captain Vance says, and pulls the terminal across the table. The two of you watch the log for a long minute while it does nothing at all.',
      showWin: 'Just as you open your mouth, it does it: one line blinks out and back. She watches it for a while. "I will have it replaced," she says. "And I was wrong, which I will put in the book in the ink I keep for that."',
      showLose: 'It does nothing. The log sits there, clean and obedient. She looks at it, and at you, and says, "Well." She writes something small in the notebook, and does not show you what.',
      admit: 'You say it late, with your eyes on the table. She nods. "That is the second true thing you have told me tonight," she says. "The first one cost you more." She does not forgive it. She records it.',
    },
    'cap-favour': {
      text: 'Captain Vance asks, in the careful way of someone who does not ask, whether you would stand an extra watch so a crew member can sleep, and say nothing about it. It is not in the articles. She says so herself. "I will owe you the hours," she says.',
      stand: 'You take it, and the long hours go slowly, with a flask of the galley\'s worst coffee. Nobody mentions it. She mentions it once, at the next port, in a sentence with a number in it.',
      fee: 'She pays it out of her own pocket, without comment, and writes it down. The watch passes like any other.',
      beg: '"Of course," she says, and goes to ask somebody else. You were entitled to say no. You feel the number go into the book anyway.',
    },
  },

  // Her two scenes (captains.js plays them once each, in order, once the days are up). The second reads by trust.
  scenes: {
    trouble: {
      title: 'The First of the Month',
      text: ('The bank\'s payment is due on the first, and the fund is four hundred short of it. Captain Vance tells you at the galley table, ' +
          'plainly, with the notebook open between you. She is not asking. She has said she does not ask. "I am telling you," she says, "so that when ' +
          'the cargo is late, you know what it is for."'),
      choices: [
        { label: 'Lend her four hundred', can: () => G.state.credits >= 400, run() {
          G.state.credits -= 400; captainLike(3, 'You lent me four hundred when the fund was short.'); captainFlag('lent');
          return 'You push four hundred across the table. She looks at it for a long time, and then writes it in the notebook, with the date and a figure beside it. "Four hundred and ten," she says, "the day you leave this ship."';
        } },
        { label: 'Tell her it is not your place', run() {
          captainLike(0, 'You said it was not your place to lend.');
          return '"It is not," she says, and for a moment she looks almost relieved. "Thank you for knowing it." She turns the notebook round and goes on with the figures, and you go back to your watch. The payment is made on the first. You never learn how.';
        } },
      ],
    },
    secret: {
      confide: {
        flag: 'ownersDebt',  // the spine (#294): the Ore Runner's owners were each one payment short
        title: 'What the Notebook Is For',
        text: ('Late in the watch Captain Vance asks you to sit. She turns the notebook round so you can read the last page, and lays a pencil across ' +
            'it. "The ship is not mine," she says. "She is the bank\'s until the end of the year, and mine after that, if I miss nothing. One more ' +
            'missed payment and the bank takes her, and I am a hand again, on somebody else\'s articles." She says it evenly. "There is an Ore Runner ' +
            'on the yard list at the next port with her name painted over. Same bank. Three owners, and each of them missed one payment. One. I have ' +
            'counted what I am from it." She turns a page. "Cato knows. You are the second. I am telling you because you have kept the books straight, ' +
            'and because I would rather you heard it from me."'),
        choices: [
          { label: 'Say you will keep it to yourself', run() {
            captainLike(2, 'You said you would keep the bank to yourself.'); captainFlag('secretKnown');
            return 'You say you will. She nods, and closes the notebook, and holds it a moment with both hands. "Thank you," she says. It is the first time you have heard her say it without a number after it.';
          } },
          { label: 'Ask how much she still owes', run() {
            captainLike(1, 'You asked how much I owed, and did not flinch.'); captainFlag('secretKnown');
            return '"Thirty-eight thousand, and some of it is interest," she says, and does not hesitate. "Eleven good runs, if the market holds. I have counted it a good many times."';
          } },
        ],
      },
      found: {
        flag: 'ownersDebt',
        title: 'Under the Sugar',
        text: ('There is a letter on the galley table, unfolded, under the sugar tin. It is from the bank. You read three lines before you understand ' +
            'what you are reading: the ship is theirs, the next payment is the last they will wait for, and Captain Vance\'s name is typed at the top ' +
            'above the word FINAL. The second page is a schedule of ships the bank has taken since the spring, and the Ore Runner is the third line. ' +
            'You hear her in the passage. She comes in, and sees the letter, and sees you, and her face does not change at all. "Sit down," she says. ' +
            '"That was not for you."'),
        choices: [
          { label: 'Say you did not read it', run() {
            captainLike(-2, 'You said you had not read the bank\'s letter, and you had.'); captainFlag('secretKnown'); captainFlag('secretAngry');
            return '"The tin was open and the letter was face up," she says. "You read it, and you have told me you did not, and I will remember both." She takes the letter, and puts it in her breast pocket, and goes out.';
          } },
          { label: 'Say you read it, and will say nothing', run() {
            captainLike(0, 'You said you had read the bank\'s letter, and would say nothing.'); captainFlag('secretKnown'); captainFlag('secretAngry');
            return 'She is angry, and she says so. "It was not for you," she says again. Then, more quietly: "But you told me. I will put that in the other column." She takes the letter, and goes.';
          } },
        ],
      },
    },
  },

  // What she says when you leave (captains.js reads it before the ship is yours). Parts: an opening by how she feels about you,
  // a line for crew who go with you, one for the secret, one for Cato (dead or alive), a parting line, and how you leave.
  goodbye: {
    title: 'The Foot of the Ramp',
    warm: 'Captain Vance is waiting at the foot of the ramp when you come down, which is not like her. She has the notebook under one arm. "I have your account," she says. "It is correct. I would like you to check it anyway."',
    neutral: 'Captain Vance meets you at the foot of the ramp with the papers and the notebook. She counts your last pay twice, into your hand, and has you sign for it.',
    cold: 'Captain Vance is at the foot of the ramp, and she has the papers ready. She does not offer her hand. "Your account is correct," she says. "Sign here, and here."',
    crew: '{names} will go with you. She looks at the crew list for a while. "That is a column I will have to fill again," she says, without heat.',
    secret: 'She does not mention the bank. She does not need to. "The first of the month," she says, "and the first after that. I will be there for them."',
    repay: 410,
    repaid: 'She counts four hundred and ten onto the rail, the day you leave, as she said she would. You count it after her. It is correct.',
    xoDead: 'She does not look at the empty place on the watch bill. "I have taken Cato out of the book," she says. "I had to. It is the first time I did not want to."',
    xo: 'Cato is at the hatch, because the captain would not go and say it. "Take care of your people," he says. "They will take care of you. That is the whole job. I have been trying to tell her for years."',
    parting: 'She holds out her hand at last. It is dry and brief. "Fair winds," she says. "And keep your own books."',
    choices: [
      { label: 'Thank her for the work', run: () => { captainLike(2, 'You thanked me for the work, and meant it.'); return 'You thank her. She nods once, and writes nothing down.'; } },
      { label: 'Wish her the ship', can: flags => !!flags.secretKnown, run: () => { captainLike(2, 'You wished me the ship.'); return '"I will keep her," she says. She almost smiles.'; } },
      { label: 'Take the papers and go', run: () => { captainLike(0, 'You took the papers and went.'); return 'You take the papers and go. She does not call after you. When you look back from the dock she has the notebook open again, and is writing.'; } },
    ],
  },
};
