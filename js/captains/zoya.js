'use strict';

// Zoya Pell and her first officer Ansel Whitcombe (js/captains/ansel.js). The chancer: fast, funny, one big score from clearing
// her debts, cheerful about losing. A low wage and a big share when it pays, bold runs and hot burns. Her first officer is the
// brake on every scheme. Her text uses "she"; {post} is the hand's post and {names} who left with them.

CAPTAINS.zoya = {
  first: 'Zoya', last: 'Pell', pronouns: 'she', culture: 'earth', home: 'Naples Arcology', age: 38, traits: ['talkative', 'brave'],
  bio: 'Fast, funny and always one run from clearing her debts, which she has been for six years. She takes the long lanes and the hot burns, and is cheerful about losing, because the next one will come good.',
  wants: 'One run that pays enough to stop.', fears: 'Stopping at all, and the people she owes.',
  captain: { trade: 4, nerve: 5, thrift: 1 }, wage: 25, share: 0.07, hears: 0, bonus: 2, talk: 1.0,
  xo: 'ansel',

  intro: (wage, share) => (`Captain Zoya Pell signs your papers on the galley hatch, with a pen she has borrowed from you, and does not give it back. ` +
      `"${wage} a day and ${share} percent," she says. "Which is nothing, most days, and a great deal on the day it comes good. And it will come ` +
      `good." She grins. "Mind the third step. It lies."`),

  chatter: [
    'Captain Pell is doing sums on the back of her hand. She stops when she sees you looking, and grins, and does them again.',
    'Captain Pell: "One run. One good run. That is all it takes. Nobody ever believes it until it is Tuesday."',
    'Captain Pell has a bet going on the burn time with the whole galley. She is losing, cheerfully.',
    'Ansel is going through the manifest with a pencil, and looking, with some care, at the line that says "assorted".',
    'Captain Pell is whistling. It is the same four bars as yesterday, and the same four bars as the day she signed your papers.',
    'Captain Pell has her boots on the nav console, and is reading a message with a fixed smile.',
    'Captain Pell: "If you ever meet a man called Dobrescu, I have not heard of him."',
    'Captain Pell is asleep in the pilot\'s chair with her cap over her eyes and a half-finished hand of cards fanned in her fingers.',
  ],

  // How they take a hand's suggestion of a different run (suggest.js): `ok` by their style, and a line for each answer.
  sway: {
    ok: (o, cur) => o.days >= cur.days,
    yes: 'Captain Pell grins and slaps the chart. "A longer burn, a bigger bag. That is the kind of idea I hire for." She changes the course on the spot.',
    no: 'Captain Pell looks at your lane and winces, kindly. "Shorter? Safer? Love, we are never going to clear anything that way." You go her way.'
  },

  events: {
    'cap-order': {
      text: 'Captain Pell wants the drive run hotter than you would. There is a cargo at the next port that is worth more if it arrives a day early, and she has told three people it will. "We will not have another chance at this one," she says, cheerfully. "We never do."',
      ordered: 'You run it hot. The window is made, with a minute and a half in hand, and Pell is on the comm to the buyer before the drive has cooled. "Early," she says, "as promised." You have never heard anyone enjoy a figure so much.',
      heard: 'You say it plainly. She listens, half-turned, with one eye on the board, and then laughs, a short one. "You are right," she says. "I hate it when you are right. Ninety. We will be late by an hour, and I will tell them it was on purpose."',
      notHeard: 'You say it. "I did not ask," she says, still smiling, and the smile does not move at all. You run it hot, and it works, and she does not look at you for the rest of the watch.',
    },
    'cap-praise': {
      text: 'Captain Pell finds you at the end of a watch and tells you, loudly and to the whole galley, that the {post} is the best on the lanes. She says it about everything. It is still nice to hear.',
      take: '"The crew make it easy," you say. "The crew make it a gamble," she says, "and you make it a sure thing. That is the whole trick. Keep it." She winks, and goes.',
      bonusYes: 'She does not even look in the cash box. "Sixty," she says. "Out of the next one, and I will make it a hundred if it comes good." It lands in your account before the end of the watch, which is a surprise.',
      bonusNo: '"Not this week," she says, and for a second the smile is not there. "Ask me on the day it comes good." The smile comes back. "It is always next week."',
    },
    'cap-dressing': {
      text: 'There is a watch with no entry in the log, and Captain Pell has found it. She holds the log up in one hand like a card she is deciding whether to play. "Somebody was supposed to write this," she says, quite cheerfully. "I have a good idea who. Do I?"',
      own: '"That was mine," you say. "Good," she says, and means it, and tosses the log onto the table. "Honest is cheaper. Do it again, but properly."',
      blame: 'You mention the terminal. She raises both eyebrows. "Does it?" she says. "I love a terminal that fails. Let us see."',
      terminal: '"Let us see," Captain Pell says, and drags the terminal across with one boot. The two of you watch it for a long minute. She starts to whistle, quietly.',
      showWin: 'It does it: a line blinks out and back. "There," she says. "There! I knew it. I have always said that thing was a card sharp." She is genuinely delighted, and you are, with some shame, saved.',
      showLose: 'It does nothing. She watches it for a long time. "That is the first time that terminal has ever played straight with me," she says, "and it did it to catch you. I am a little offended on its behalf."',
      admit: 'You say it late. She puts the log down. "Third time this week somebody has told me the truth," she says. "I ought to be worried." She is, briefly, not smiling. "Thank you."',
    },
    'cap-favour': {
      text: 'Captain Pell asks whether you would stand an extra watch so a crew member can sleep. She asks fast, with a grin. It is not in the articles. "I will owe you," she says. "I owe everyone. You will be in good company."',
      stand: 'You take it. The long hours go slowly. At the next port she turns up with a bag of something hot, and does not say what it is for.',
      fee: 'She pays it in notes, folded small, from a roll that has seen better days. "Forty," she says. "A good price for a good watch." The watch passes like any other.',
      beg: '"Fair," she says, easily, and spins a coin off her thumb. "Fair. I will find someone." She does, and it takes longer than it should, and she is whistling the whole time.',
    },
  },

  scenes: {
    trouble: {
      title: 'The Man on the Dock',
      text: ('A man in a good coat is standing at the foot of the ramp when you dock, with a folder and no luggage. Captain Pell sees him from the ' +
          'hatch, and does not break step, and does not stop smiling. "Friend of mine," she says to nobody. "Ansel, would you take the book down? Tell ' +
          'him I am out." The man waits. After an hour he sends up a card. It says Dobrescu, and a number, and a figure with five digits.'),
      choices: [
        { label: 'Tell him the captain is out', run() {
          captainLike(1, 'You told Dobrescu I was out.');
          return 'You go down, and tell him. He nods, and leaves the folder with you. "Tell her Tuesday," he says. It is Thursday. When you come back up, Pell is whistling at the nav console and has not turned a page of the thing she is reading.';
        } },
        { label: 'Give him a hundred to wait a week', ...gated(needCr(100)), run() {
          G.state.credits -= 100; captainLike(3, 'You paid Dobrescu a hundred to wait a week.'); captainFlag('lent');
          return ('He counts it twice, in front of you, and goes, and you are not sure he is done. Pell laughs when she hears, which is the worst ' +
              'possible response, and then hugs you, unexpectedly, hard, and lets go at once. "A hundred," she says. "I will pay you a hundred and a ' +
              'quarter, and that is a bet I will not lose."');
        } },
      ],
    },
    secret: {
      confide: {
        title: 'The Hand of Cards',
        text: ('Late in the watch, with the lights low, Captain Pell lays out a hand of cards that is not a game. Five cards, face up, and a name ' +
            'written on the back of each. "These are the people I owe," she says. "Dobrescu, you have met. The yard at Ceres. Two brothers who ran a ' +
            'fuel dock. A man I would not now ask a favor of. And my sister." She taps the last card. "It adds to a great deal more than the ship is ' +
            'worth. One good run clears it, or it would, if the market held, and I have been one run from it for six years." She is smiling. "Ansel ' +
            'knows. He keeps a sheet. It is the only document on this ship I am afraid of."'),
        choices: [
          { label: 'Ask what one good run would have to be', run() {
            captainLike(1, 'You asked what the good run would have to be.'); captainFlag('secretKnown');
            return ('She tells you, to the figure, and it is not an absurd one. That is the worst part. "Eleven percent over the best I have ever ' +
                'done," she says. "I could do it on a Tuesday. I have not done it on a Tuesday." She gathers the cards. "Do not tell the galley. They ' +
                'like me better when I am lucky."');
          } },
          { label: 'Say you will stay till it is done', run() {
            captainLike(3, 'You said you would stay till the debts were done.'); captainFlag('secretKnown');
            return '"Till it is done," she says, and for once she is not whistling, and not smiling, and it is a plain, tired, hopeful face. "That is a promise with no end date. I will hold you to it, and I will let you off it, both. Do not tell me which."';
          } },
        ],
      },
      found: {
        title: 'The Sheet',
        text: ('You are looking for a spanner in the captain\'s locker, and find Ansel\'s sheet, printed, with a rubber band round it. It has columns ' +
            'of names and figures, and a bottom line in red, and at the foot, underlined twice, one sentence: She will not stop. You are still reading ' +
            'when Captain Pell comes in. She sees the sheet, and sees you, and stops whistling.'),
        choices: [
          { label: 'Put it back and say nothing', run() {
            captainLike(0, 'You put the sheet back and said nothing.'); captainFlag('secretKnown'); captainFlag('secretAngry');
            return 'You put it back, and close the locker, and say nothing, and she watches you do it. "Thank you," she says, lightly. She starts to whistle. It is the same four bars. It is a little flat.';
          } },
          { label: 'Ask her if it is true', run() {
            captainLike(-1, 'You asked me if the sheet was true.'); captainFlag('secretKnown'); captainFlag('secretAngry');
            return '"Every line," she says, and the smile is on, perfectly, like a coat. "And the last one is wrong. I have been wrong about the last one for six years. It is the only thing I am good at." She takes the sheet out of your hand, gently, and puts it in the locker, and shuts it.';
          } },
        ],
      },
    },
  },

  goodbye: {
    title: 'The Ramp',
    warm: 'Captain Pell is on the ramp, not at the foot of it, leaning on the rail with her boots crossed. "I do not do goodbyes," she says. "I do wagers. I bet you do well. I bet you come back. I will take either side."',
    neutral: 'Captain Pell meets you at the foot of the ramp and counts your last pay into your hand, fast, in notes, and then counts it again, slower, because she is not sure she did it right the first time. She did.',
    cold: 'Captain Pell is at the foot of the ramp with your papers and a smile that has been put on. "Fair winds," she says, and it sounds like something said many times, to many people who were leaving.',
    crew: '{names} will go with you. She whistles, one low note. "I bet you will do better by them than I did," she says. "I am not even joking. That is not a bet. That is a fact."',
    secret: 'She does not mention the cards. She does not need to. "One good run," she says, "and I will send you a postcard from somewhere with a beach. If I do not, it is because it was not good enough." She says it lightly. She has said it for six years.',
    repay: 125,
    repaid: 'She counts a hundred and twenty-five into your hand, in folded notes, from the roll. "A quarter," she says. "As promised. Do not tell Dobrescu where I got it."',
    xoDead: 'Ansel\'s chair at the nav table is empty, and the sheet is not on it. "He kept the books," she says. "I did not know what I was without somebody who wrote down what I was. I am finding out." She is not smiling.',
    xo: 'Ansel is at the hatch, in his coat, with the folded sheet in one hand. "I advised against most of it," he says. "I want that on the record. And I want you to know it was the best six years of my working life. Do not tell her the second part."',
    parting: 'She hugs you, fast, and lets go before it can be anything. "Go on," she says. "Before I bet against myself."',
    choices: [
      { label: 'Wish her the good run', run: () => { captainLike(2, 'You wished me the good run.'); return '"From your mouth," she says, and crosses two fingers on each hand, and holds them up, and laughs. It is the best laugh you have heard from her, and the shortest.'; } },
      { label: 'Tell her to stop', can: flags => !!flags.secretKnown, run: () => { captainLike(1, 'You told me to stop.'); return 'She laughs, and means it, and does not. "I will think about it," she says. "On a Tuesday." She does not say which one.'; } },
      { label: 'Take the papers and go', run: () => { captainLike(0, 'You took the papers and went.'); return 'You take the papers and go. When you look back from the dock, she is on the ramp with a coin on her thumb, and she tosses it, and you do not stay to see how it lands.'; } },
    ],
  },
};
