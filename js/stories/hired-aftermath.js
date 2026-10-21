'use strict';

// What comes of a hired hand's own events (hiredevents.js): follow-ups that arrive some days after a choice, each
// naming the captain or the shipmate it was about. They are the hand's own affairs (`personal`: their savings, not
// the ship's), only come while they are still a hand, and play once for each time they were set going. As with
// aftermath.js, a choice's `later` starts one, and the Journal keeps the thread.

Mods.register({
  id: 'hired-aftermath', name: 'What comes of a hand\'s choices', builtin: true,
  init(M) {
    // A card game for stakes: even odds, the winner takes the stake.
    M.addAction('gamble', stake => {
      const won = Math.random() < 0.5;
      G.state.credits += won ? stake : -Math.min(stake, G.state.credits);
      return won ? `You win ${fmt(stake)} cr.` : `You lose ${fmt(stake)} cr.`;
    });
    const after = def => M.addStorylet({ where: 'transit', via: 'crew', once: false, priority: 1, personal: true, consumes: def.id, ...def, when: { due: def.id, hired: true } });

    // ---- An Order You Do Not Like ----
    after({
      id: 'h-hot-good', title: 'The Window Made',
      text: '{captain} finds you at the end of the watch. The hot burn made the berth window with eleven minutes to spare, and the next ship in the queue is idling, hull to hull, at the dock where you\'d have been. "I\'ll say this once," the captain says, "and not twice."',
      choices: [{
        label: 'Accept the thanks',
        effects: {
        like: { captain: 1 },
        credits: 600,
        log: 'The hot burn made the window. {captain} said thank you, once.'
      },
        result: 'It\'s a short speech, delivered to the deck, and the envelope that goes with it has six hundred credits in it and no name. You don\'t say anything clever. You put it in the inside pocket, and the next ship in the queue goes on idling.'
      }],
    });
    after({
      id: 'h-hot-bad', title: 'The Pump Trips',
      text: 'The coolant pump trips at the worst moment of the burn, a flat chirp and a line of amber, and the drive drops back to a crawl. The hot burn didn\'t make the window, and {captain} hasn\'t said a word about it. The galley has gone quiet enough that you can hear the pump ticking as it cools.',
      choices: [
        {
          label: 'Help sort it quietly',
          effects: {
          learn: 3,
          like: { captain: 1 },
          log: 'The hot burn tripped the pump. I helped sort it and said nothing.'
        },
          result: 'You help sort it, which takes an hour and a good deal of language, and you say nothing about whose idea the burn was. The captain finds it out from the log, and for the rest of the run knocks before coming into the engine room.'
        },
        { label: 'Remind the captain you said so', effects: { like: { captain: -1 }, learn: 1, log: 'Told {captain} I had said so. It was true and it didn\'t help.' }, result: '"I said so," you say. The pump is fixed, and nobody thanks you.' },
      ],
    });
    after({
      id: 'h-ninety', title: 'Ninety Percent',
      text: 'The captain ran the drive at ninety, as you said, and made the window anyway, by a hair. At the next port, over a drink you didn\'t ask for, {captain} tells the harbourmaster, in your hearing, that you\'re the only one aboard who\'ll say a thing to a captain\'s face.',
      choices: [{
        label: 'Take the compliment',
        effects: {
        like: { captain: 2 },
        credits: 400,
        log: '{captain} told the harbourmaster I was the only one who\'d say a thing to a captain\'s face.'
      },
        result: 'You take it with a nod, and a drink. Later there\'s an envelope with four hundred credits in it, left where it might look accidental.'
      }],
    });

    // ---- A Word of Praise ----
    after({
      id: 'h-praise-trust', title: 'The Keys',
      text: '{captain} has been watching you for a while. "I want you to look after something," the captain says, and puts a small, heavy key on the galley table. It\'s the key to the ship\'s store, where the parts and the good tea and the petty cash live. "Not forever. For the run."',
      choices: [
        { label: 'Take responsibility', effects: { like: { captain: 1 }, learn: 2, log: '{captain} gave me the key to the ship\'s store for the run.' }, result: 'You take it. You keep it in your pocket all run, and at the end of it you hand it back with every part accounted for, and a tally.' },
        { label: 'Decline', effects: { like: { captain: 0 } }, result: '"Not yet," you say. The captain nods slowly and puts the key back in a pocket.' },
      ],
    });
    after({
      id: 'h-owed', title: 'What You Asked For',
      text: ('The captain has remembered the bonus you asked for before you had earned one. "You wanted something for a speech," {captain} says. ' +
          '"Here\'s a job instead." It\'s the inventory: every part in the hold, counted, listed, and checked against the book, a day of dull work.'),
      choices: [
        {
          label: 'Do the inventory',
          effects: {
          like: { captain: 1 },
          credits: 500,
          learn: 1,
          log: 'Earned the bonus I asked for, by counting every part in the hold.'
        },
          result: 'It takes the day, and your back. At the end there are five hundred credits and a nod. You find three parts nobody knew were missing.'
        },
        { label: 'Say you\'re busy', effects: { like: { captain: -1 } }, result: '"Busy," says the captain, agreeably, and files you somewhere out of sight, under a heading you\'d rather not know.' },
      ],
    });

    // ---- A Dressing-Down ----
    after({
      id: 'h-log-trust', title: 'The Log Is Yours',
      text: ('{captain} has been reading your log entries, which you didn\'t know. "They\'re clean," the captain says. "Short, true, and dated. I\'d ' +
          'like you to keep the ship\'s log for the run, not just your watch." There\'s a pause. "The last person who did the job did it for six ' +
          'years and I still haven\'t found a gap."'),
      choices: [{ label: 'Take the log', effects: { like: { captain: 1 }, learn: 2, log: '{captain} asked me to keep the ship\'s log for the run, after I owned the gap.' }, result: 'You take it and keep it. It\'s dull, and exact. At the end of the run the captain signs every page.' }],
    });

    // ---- A Favor ----
    after({
      id: 'h-favour-back', title: 'The Favor Returned',
      text: 'A week ago you stood a watch for {captain} and said nothing. Today the captain comes to find you. "I\'ve signed you off the next port\'s duties," the captain says. "And, because it\'s customary, the docking fee for your berth."',
      choices: [{ label: 'Take the free day', effects: { like: { captain: 1 }, credits: 800, log: '{captain} paid back the extra watch: no duties at the next port, and my berth fee.' }, result: 'It\'s a quiet day ashore, and a free one. You walk the dock with your hands in your pockets.' }],
    });
    after({
      id: 'h-favour-cold', title: 'Passed Over',
      text: ('The captain has stopped asking you for things. It took you a few days to notice, because it happened gradually, like weather. A task ' +
          'that\'d have been yours goes to someone else. A word at the end of the watch goes unsaid. {captain} is polite, says good morning, and takes the far end of the galley table.'),
      choices: [
        {
          label: 'Ask why',
          effects: {
          like: { captain: 1 },
          log: 'Asked {captain} why I was being passed over. It cleared some of the air.'
        },
          result: '"I asked for one thing," the captain says, after a long moment, "and you said no. That\'s allowed. It\'s also information." The captain pours two mugs and leaves one on your side of the table.'
        },
        { label: 'Let it be', result: 'You let it be, and for the rest of the run the captain says good morning to you and nothing after it.' },
      ],
    });

    // ---- Cover for a Shipmate ----
    after({
      id: 'h-cover-back', title: 'Owed an Hour',
      text: '{thread:cover} catches you before the watch change, and puts a mug of tea in your hand without asking. "You covered an hour for me," they say. "I\'ve been thinking about how to say thank you. I\'m no good at it. So: I\'ve taken your first hour tonight. Go and sleep."',
      choices: [{ label: 'Take the hour', effects: { like: { 'thread:cover': 1 }, learn: 1, log: '{thread:cover} took an hour of my watch to pay back the one I covered.' }, result: 'You go and sleep. In the morning there\'s tea on the shelf, still warm, and nobody mentions it.' }],
    });
    after({
      id: 'h-cover-cold', title: 'Asked Again',
      text: '{thread:cover} comes to find you again, and stands there a moment before saying it. It\'s the same favor as before, an hour of cover, a call that can\'t wait. They have a mug in one hand and the rota in the other.',
      choices: [
        { label: 'Cover for them', effects: { like: { 'thread:cover': 2 }, log: 'Covered for {thread:cover} after all.' }, result: 'You cover it, and it\'s a long hour. Afterward {thread:cover} says nothing at all.' },
        { label: 'Still no', effects: { like: { 'thread:cover': -2 } }, result: '"I understand," {thread:cover} says, and goes. The next day your tea has been moved to the lower shelf, behind the tins.' },
      ],
    });

    // ---- Words in the Galley ----
    after({
      id: 'h-needle-ally', title: 'Show Me',
      text: '{thread:needle} finds you in the corridor, and doesn\'t meet your eye, and says, quickly: "Could you show me how the post works? Properly. I was wrong, and I\'d rather be wrong in private than in front of everybody again."',
      choices: [{
        label: 'Show them',
        effects: {
        like: { 'thread:needle': 1 },
        learn: 2,
        log: '{thread:needle} asked me to teach them my post, after being wrong at the mess table.'
      },
        result: 'You show them, slowly, from the bottom, and they\'re a better student than a needler. By the end of the watch they\'re reading the board aloud and you\'re correcting them, and neither of you mentions why.'
      }],
    });
    after({
      id: 'h-needle-worse', title: 'The Tale Grows',
      text: '{thread:needle} has been telling the story of the night you tried to show them your post, and it has grown in the telling, as these things do. By now it involves a dropped tool, a raised voice, and a sentence you never said. The galley has started to wait for the next part.',
      choices: [
        {
          label: 'Challenge them to swap watches',
          effects: {
          like: { 'thread:needle': 1 },
          learn: 2,
          log: 'Challenged {thread:needle} to swap watches. They lasted an hour.'
        },
          result: 'You swap, and they last an hour, and come out of it a shade grayer and a good deal quieter. The story, from that night on, ends differently.'
        },
        { label: 'Ignore it', effects: { like: { 'thread:needle': -1, crew: -1 } }, result: 'You ignore it, and the story goes on without you, growing. By the next port half the crew is looking at you with pity.' },
      ],
    });

    // ---- Card Night ----
    after({
      id: 'h-cards-rematch', title: 'The Rematch',
      text: '{thread:cards} has been keeping the deck warm. "Same table, same stakes, but I want to see you again," they say. "A thousand a hand. I\'m not a man who loses twice in a row." The deck is soft at the corners.',
      choices: [
        { label: 'Play the rematch (1,000 cr)', when: { credits: 1000 }, effects: { do: ['gamble', 1000], like: { 'thread:cards': 1 } }, result: 'The cards come out, and the room goes quiet. The hand takes less than a minute. When it\'s over, everybody has something to say about it.' },
        { label: 'Decline', effects: { like: { 'thread:cards': -1 } }, result: '"Of course," they say, and square the deck against the table twice before putting it away.' },
      ],
    });

    // ---- Work on the Side ----
    after({
      id: 'h-side-trouble', title: 'Questions at the Dock',
      text: ('A customs officer you don\'t know is waiting at the end of the dock with a clipboard, and a polite smile. The trading house whose crates you loaded is "of interest," and anyone who loaded for them is, for the purposes of the inquiry, a person of ' +
          'interest too.'),
      choices: [
        {
          label: 'Tell the captain',
          effects: {
          like: { captain: 1 },
          log: 'Told {captain} about the side work and the customs questions.'
        },
          result: 'You tell the captain, standing in the galley. {captain} listens, sighs, makes a call, and by dinner the questions have gone elsewhere. "Next time," the captain says, "ask first."'
        },
        {
          label: 'Keep quiet, and take the 1,000 cr offer',
          effects: {
          credits: 1000,
          later: { 'h-side-found': 6 },
          log: 'Took 1,000 cr to stay quiet about the side work.'
        },
          result: 'The man from the trading house finds you before the officer does, and the thousand credits in your hand is warm from his pocket. "Nothing happened," he says. You say nothing happened. The thousand stays warm from his pocket for most of the afternoon.'
        },
      ],
    });
    after({
      id: 'h-side-found', title: 'The Captain Knows',
      text: '{captain} has the whole story, and not from you. It came from the customs office, in a letter, in the dry paragraphs of an official who doesn\'t enjoy writing them. The captain says nothing. Then: "I\'m not angry that you took the work. I\'m angry that you didn\'t tell me."',
      choices: [{
        label: 'Take it',
        effects: {
        like: { captain: -2 },
        log: '{captain} found out about the side work from customs, and not from me.'
      },
        result: 'There\'s nothing to say, and you say it, and the captain accepts it with a nod. For a month your name goes on the watch list in pencil.'
      }],
    });

    // ---- A Loan ----
    after({
      id: 'h-loan-repaid', title: 'Paid Back',
      text: '{thread:loan} is waiting for you at the end of the watch with an envelope. "Eleven hundred," they say. "The hundred is for the worry. I\'d have paid it sooner, but I wanted to pay it right."',
      choices: [{ label: 'Take it, and shake their hand', effects: { credits: 1100, like: { 'thread:loan': 1 }, log: '{thread:loan} paid back the thousand I lent them, with a hundred over.' }, result: 'You take it and shake their hand, which is warm and slightly damp.' }],
    });
    after({
      id: 'h-loan-small', title: 'Five Hundred, With Thanks',
      text: '{thread:loan} presses a small bundle into your hand and doesn\'t stay to talk. It\'s five hundred and fifty credits, in smaller notes than they\'d like, and a card in careful handwriting: "The fifty is for being honest about what you could spare."',
      choices: [{ label: 'Keep it', effects: { credits: 550, like: { 'thread:loan': 1 }, log: '{thread:loan} repaid the five hundred, with fifty over.' }, result: 'You keep it, and the card. The card stays in your pocket.' }],
    });
    after({
      id: 'h-loan-default', title: 'The Loan Isn\'t Mentioned',
      text: '{thread:loan} has stopped meeting your eye. It has been three weeks. They\'re polite, and quick, and in a hurry, and there has been no mention of the thousand credits. The galley table is eleven feet long and they take the far end of it.',
      choices: [
        {
          label: 'Let it go',
          effects: {
          like: { 'thread:loan': 1 },
          log: 'Let {thread:loan} keep the thousand I lent them. It wasn\'t worth the silence.'
        },
          result: 'You say, lightly, over tea, that you have forgotten about the loan, and they look at you with such startled relief that they spill their tea, and after that they sit beside you.'
        },
        {
          label: 'Ask for it back',
          effects: {
          credits: 500,
          like: { 'thread:loan': -2 },
          log: 'Asked {thread:loan} for the loan. They gave me half and haven\'t forgiven the asking.'
        },
          result: 'You ask, plainly, and they pay half, in an envelope, without looking up. After that they use the other galley hatch.'
        },
      ],
    });

    // ---- Short on the Pay ----
    after({
      id: 'h-short-audit', title: 'The Corrected Statements',
      text: ('{captain} has been through the whole crew\'s statements, line by line, since you raised yours. The same error, it turns out, was in all ' +
          'of them: a day short on every wage for the same run. The captain made it good to everyone, and, at the galley table, with the envelopes ' +
          'out, said whose catch it was.'),
      choices: [{
        label: 'Accept the crew\'s thanks',
        effects: {
        like: {
        captain: 1,
        crew: 1
      },
        log: 'My short statement turned out to be everyone\'s. {captain} made it good to all of them.'
      },
        result: 'Over the next few days a lot of people put a cup of something in your hand and say nothing about it.'
      }],
    });
    after({
      id: 'h-scene-fallout', title: 'The Worst Watch',
      text: '{captain} didn\'t mention the scene you made over your statement. They simply rewrote the watch list, and you\'re on the worst watch of the week, the dead hours after the flip, for the whole run. It\'s a reasonable rota. Your name is on it four times.',
      choices: [
        {
          label: 'Work it without complaint',
          effects: {
          learn: 1,
          like: { captain: 1 },
          log: 'Worked the worst watch without complaint after making a scene about my pay.'
        },
          result: 'You work it, and say nothing, and the long dead hours teach you more about the ship than the good ones ever did. At the end of the run, the captain moves your name, without a word, back up the list.'
        },
        { label: 'Complain', effects: { like: { captain: -1 } }, result: 'You complain, and the captain writes it down, and the watch list doesn\'t change.' },
      ],
    });

    // ---- Something Off the Lane ----
    after({
      id: 'h-lane-again', title: 'The Same Ship',
      text: 'The transponder you reported turns up again, ahead of you this time, and the cutter that {captain} brought into the conversation is a spark behind it, closing. "That\'s your ship," the captain says, to nobody in particular.',
      choices: [
        {
          label: 'Call it in at once',
          effects: {
          like: { captain: 1 },
          learn: 2,
          log: 'The ship I reported turned up again, and this time I called it in at once.'
        },
          result: 'You call it in, and the cutter lights its drive, and the strange ship, deciding that it has places to be, abandons the lane. {captain} says "Good eyes" for the second time.'
        },
        { label: 'Wait and see', effects: { learn: 1 }, result: 'You wait, and watch, and the cutter does the work, and nothing\'s lost, and nothing\'s learned beyond the fact that you didn\'t need to be the one.' },
      ],
    });
    after({
      id: 'h-lane-trouble', title: 'It Wasn\'t Nothing',
      text: 'The ship you didn\'t mention turns out to have been a raider. It rakes your hull on the way past, one clean pass, and is gone again before anyone can shoot. When the alarms stop, {captain} is in the cockpit door, and asks, in a level voice, whether any of the crew saw it coming.',
      choices: [
        { label: 'Admit you saw it', effects: { do: ['hull', 0.1], like: { captain: -2 }, log: 'A raider I saw and didn\'t report hit the ship. I told {captain}.' }, result: 'You say it. The captain\'s face doesn\'t change. "Thank you for telling me," the captain says, and writes it in the log.' },
        { label: 'Say nothing', effects: { do: ['hull', 0.1], like: { captain: 0 } }, result: 'You say nothing, and the captain looks at each of the crew in turn, and the silence goes on. Then the captain shrugs and goes. You never learn whether the captain knew.' },
      ],
    });
  },
});
