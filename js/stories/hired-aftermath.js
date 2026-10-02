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
      text: '{captain} finds you at the end of the watch. The hot burn made the berth window with eleven minutes to spare, and the next ship in the queue is idling, hull to hull, at the dock where you would have been. "I will say this once," the captain says, "and not twice."',
      choices: [{ label: 'Accept their thanks', effects: { like: { captain: 1 }, credits: 60, log: 'The hot burn made the window. {captain} said thank you, once.' }, result: 'It is a short speech, delivered to the deck, and there is sixty credits in it, in an envelope with no name. You do not say anything clever. It is, you find, enough.' }],
    });
    after({
      id: 'h-hot-bad', title: 'The Pump Trips',
      text: 'The coolant pump trips at the worst moment of the burn, a flat chirp and a line of amber, and the drive drops back to a crawl. The hot burn did not make the window, and {captain} has not said a word about it. You can feel what the silence is waiting for.',
      choices: [
        { label: 'Help sort it quietly', effects: { learn: 3, like: { captain: 1 }, log: 'The hot burn tripped the pump. I helped sort it and said nothing.' }, result: 'You help sort it, which takes an hour and a good deal of language, and you say nothing about whose idea the burn was. The captain finds it out on their own, from the log, and is, for the rest of the run, noticeably gentle.' },
        { label: 'Remind them you said so', effects: { like: { captain: -1 }, learn: 1, log: 'Told {captain} I had said so. It was true and it did not help.' }, result: '"I said so," you say. It is true, and, in the way of true things said at the wrong moment, it does not help at all. The pump is fixed, and nobody thanks you.' },
      ],
    });
    after({
      id: 'h-ninety', title: 'Ninety Percent',
      text: 'The captain ran the drive at ninety, as you said, and made the window anyway, by a hair. At the next port, over a drink you did not ask for, {captain} tells the harbourmaster, in your hearing, that you are the only one aboard who will say a thing to their face.',
      choices: [{ label: 'Take the compliment', effects: { like: { captain: 2 }, credits: 40, log: '{captain} told the harbourmaster I was the only one who would say a thing to their face.' }, result: 'You take it, with a nod, and a drink, and, later, an envelope with forty credits in it that someone has tried to make look accidental.' }],
    });

    // ---- A Word of Praise ----
    after({
      id: 'h-praise-trust', title: 'The Keys',
      text: '{captain} has been watching you for a while. "I want you to look after something," they say, and put a small, heavy key on the galley table. It is the key to the ship\'s store, where the parts and the good tea and the petty cash live. "Not forever. For the run."',
      choices: [
        { label: 'Take responsibility', effects: { like: { captain: 1 }, learn: 2, log: '{captain} gave me the key to the ship\'s store for the run.' }, result: 'You take it. It is an ounce of metal and a good deal of weight, and you keep it in your pocket all run, and, at the end of it, hand it back with every part accounted for, and a small, careful tally.' },
        { label: 'Decline', effects: { like: { captain: 0 } }, result: '"Not yet," you say. The captain nods slowly, and puts the key back in their own pocket, and there is something, in the way they do it, that is not disappointment, quite, but is close.' },
      ],
    });
    after({
      id: 'h-owed', title: 'What You Asked For',
      text: 'The captain has remembered the bonus you asked for before you had earned one. "You wanted something for a speech," {captain} says. "Here is a job instead." It is the inventory: every part in the hold, counted, listed, and checked against the book, a day of dull work, which, in fairness, is what a bonus usually is.',
      choices: [
        { label: 'Do the inventory', effects: { like: { captain: 1 }, credits: 50, learn: 1, log: 'Earned the bonus I asked for, by counting every part in the hold.' }, result: 'It takes the day, and your back, and, at the end, fifty credits and a slightly sardonic nod. You find three parts nobody knew were missing. It is, perhaps, a better bonus than a speech.' },
        { label: 'Say you are busy', effects: { like: { captain: -1 } }, result: '"Busy," says the captain, agreeably, and files you somewhere in their head under a heading you would rather not know.' },
      ],
    });

    // ---- A Dressing-Down ----
    after({
      id: 'h-log-trust', title: 'The Log Is Yours',
      text: '{captain} has been reading your log entries, which you did not know. "They are clean," they say. "Short, true, and dated. I would like you to keep the ship\'s log for the run, not just your watch." There is a pause. "The last person who did the job did it for six years and I still have not found a gap."',
      choices: [{ label: 'Take the log', effects: { like: { captain: 1 }, learn: 2, log: '{captain} asked me to keep the ship\'s log for the run, after I owned the gap.' }, result: 'You take it, and keep it, and it is dull, and exact, and, in some way you did not expect, a pleasure. At the end of the run, the captain signs every page.' }],
    });

    // ---- A Favour ----
    after({
      id: 'h-favour-back', title: 'The Favour Returned',
      text: 'A week ago you stood a watch for {captain} and said nothing. Today the captain comes to find you, in the careful way of someone who does not give. "I have signed you off the next port\'s duties," they say. "And, because it is customary, the docking fee for your berth."',
      choices: [{ label: 'Take the free day', effects: { like: { captain: 1 }, credits: 80, log: '{captain} paid back the extra watch: no duties at the next port, and my berth fee.' }, result: 'It is a quiet day ashore, and a free one, and you walk the dock with your hands in your pockets, in a way you have not in months, and, for the first time in this job, you feel like somebody the ship is glad to have.' }],
    });
    after({
      id: 'h-favour-cold', title: 'Passed Over',
      text: 'The captain has stopped asking you for things. It took you a few days to notice, because it happened gradually, like weather. A task that would have been yours goes to someone else. A word at the end of the watch goes unsaid. {captain} is perfectly polite, and perfectly distant, and the distance is the point.',
      choices: [
        { label: 'Ask why', effects: { like: { captain: 1 }, log: 'Asked {captain} why I was being passed over. It cleared some of the air.' }, result: '"I asked for one thing," the captain says, after a long moment, "and you said no. That is allowed. It is also information." It is not forgiveness. It is, however, a door, and you notice, with some surprise, that it is not locked.' },
        { label: 'Let it be', result: 'You let it be, and it stays that way, a small grey fact in the corner of every watch, getting neither better nor worse.' },
      ],
    });

    // ---- Cover for a Shipmate ----
    after({
      id: 'h-cover-back', title: 'Owed an Hour',
      text: '{thread:cover} catches you before the watch change, and puts a mug of tea in your hand without asking. "You covered an hour for me," they say. "I have been thinking about how to say thank you. I am no good at it. So: I have taken your first hour tonight. Go and sleep."',
      choices: [{ label: 'Take the hour', effects: { like: { 'thread:cover': 1 }, learn: 1, log: '{thread:cover} took an hour of my watch to pay back the one I covered.' }, result: 'You go and sleep, deeply, in the particular way of a person who has been owed something for a while, and, in the morning, the tea is still warm on the shelf, and nobody mentions it.' }],
    });
    after({
      id: 'h-cover-cold', title: 'Asked Again',
      text: '{thread:cover} comes to find you again, with the look of someone who has been working up to it. It is the same favour as before, an hour of cover, a call that cannot wait. This time, it is clear that it is not going to be the last time they ask.',
      choices: [
        { label: 'Cover for them', effects: { like: { 'thread:cover': 2 }, log: 'Covered for {thread:cover} after all.' }, result: 'You cover it, and it is a long hour, and, afterward, {thread:cover} says nothing at all, which you correctly take to mean a very great deal.' },
        { label: 'Still no', effects: { like: { 'thread:cover': -2 } }, result: '"I understand," {thread:cover} says, in a voice that has stopped being warm, and goes. You find, the next day, that your tea has been moved to a lower shelf.' },
      ],
    });

    // ---- Words in the Galley ----
    after({
      id: 'h-needle-ally', title: 'Show Me',
      text: '{thread:needle} finds you in the corridor, and does not meet your eye, and says, quickly, as if getting it over with: "Could you show me how the post works? Properly. I was wrong, and I would rather be wrong in private than in front of everybody again."',
      choices: [{ label: 'Show them', effects: { like: { 'thread:needle': 1 }, learn: 2, log: '{thread:needle} asked me to teach them my post, after being wrong at the mess table.' }, result: 'You show them, slowly, from the bottom, and they are a better student than a needler. By the end of the watch, the thing between you has changed its shape, and neither of you has to say what it was.' }],
    });
    after({
      id: 'h-needle-worse', title: 'The Tale Grows',
      text: '{thread:needle} has been telling the story of the night you tried to show them your post, and it has grown in the telling, as these things do. By now it involves a dropped tool, a raised voice, and a sentence you are quite sure you never said. The galley has started to wait for the next part.',
      choices: [
        { label: 'Challenge them to swap watches', effects: { like: { 'thread:needle': 1 }, learn: 2, log: 'Challenged {thread:needle} to swap watches. They lasted an hour.' }, result: 'You swap, and they last an hour, and come out of it a shade greyer and a good deal quieter. The story, from that night on, ends differently.' },
        { label: 'Ignore it', effects: { like: { 'thread:needle': -1, crew: -1 } }, result: 'You ignore it, and the story goes on without you, growing, and, by the next port, half the crew has begun to look at you with the particular pity people keep for the victims of a good joke.' },
      ],
    });

    // ---- Card Night ----
    after({
      id: 'h-cards-rematch', title: 'The Rematch',
      text: '{thread:cards} has been keeping the deck warm. "Same table, same stakes, but I want to see you again," they say. "A hundred a hand. I am not a man who loses twice in a row." They are, for the record, exactly that kind of man.',
      choices: [
        { label: 'Play the rematch (100 cr)', when: { credits: 100 }, effects: { do: ['gamble', 100], like: { 'thread:cards': 1 } }, result: 'The cards come out, and the room goes quiet, and the hand takes less than a minute, and, when it is over, everybody finds something to say about it.' },
        { label: 'Decline', effects: { like: { 'thread:cards': -1 } }, result: '"Of course," they say, and put the deck away, with the exaggerated care of a man trying not to look hurt.' },
      ],
    });

    // ---- Work on the Side ----
    after({
      id: 'h-side-trouble', title: 'Questions at the Dock',
      text: 'A customs officer you do not know is waiting at the end of the dock with a clipboard, and a polite smile that does not reach the eyes. The trading house whose crates you loaded is "of interest," and anyone who loaded for them is, for the purposes of the inquiry, a person of interest too.',
      choices: [
        { label: 'Tell the captain', effects: { like: { captain: 1 }, log: 'Told {captain} about the side work and the customs questions.' }, result: 'You tell them, standing in the galley, in the voice of someone reporting a small fire. {captain} listens, and sighs, and makes a call, and, by dinner, the questions have gone elsewhere. "Next time," the captain says, "ask first."' },
        { label: 'Keep quiet, and take the 100 cr offer', effects: { credits: 100, later: { 'h-side-found': 6 }, log: 'Took 100 cr to stay quiet about the side work.' }, result: 'The man from the trading house finds you before the officer does, and the hundred credits in your hand is warm from his pocket. "Nothing happened," he says. You say nothing happened. It will, you are fairly sure, not stay that way.' },
      ],
    });
    after({
      id: 'h-side-found', title: 'The Captain Knows',
      text: '{captain} has the whole story, and not from you. It came from the customs office, in a letter, in the dry paragraphs of an official who does not enjoy writing them. The captain says nothing for a long moment. Then: "I am not angry that you took the work. I am angry that you did not tell me."',
      choices: [{ label: 'Take it', effects: { like: { captain: -2 }, log: '{captain} found out about the side work from customs, and not from me.' }, result: 'There is nothing to say, and you say it, and the captain accepts it with a nod that costs them more than it costs you. You will be working a long time to put this right.' }],
    });

    // ---- A Loan ----
    after({
      id: 'h-loan-repaid', title: 'Paid Back',
      text: '{thread:loan} is waiting for you at the end of the watch with an envelope, and the look of a person who has been rehearsing the sentence for a week. "A hundred and ten," they say. "The ten is for the worry. I would have paid it sooner, but I wanted to pay it right."',
      choices: [{ label: 'Take it, and shake their hand', effects: { credits: 110, like: { 'thread:loan': 1 }, log: '{thread:loan} paid back the hundred I lent them, with ten over.' }, result: 'You take it, and shake their hand, and it is warm and slightly damp, and, in the corridor afterward, you are aware of a particular lightness that has nothing to do with the money.' }],
    });
    after({
      id: 'h-loan-small', title: 'Fifty, With Thanks',
      text: '{thread:loan} presses a small bundle into your hand and does not stay to talk. It is fifty-five credits, in smaller notes than they would like, and a card in a very careful hand: "The five is for being honest about what you could spare."',
      choices: [{ label: 'Keep it', effects: { credits: 55, like: { 'thread:loan': 1 }, log: '{thread:loan} repaid the fifty, with five over.' }, result: 'You keep it, and the card, and, for a long time, the card is in your pocket, in a place you do not look at very often.' }],
    });
    after({
      id: 'h-loan-default', title: 'The Loan Is Not Mentioned',
      text: '{thread:loan} has stopped meeting your eye. It has been three weeks. They are polite, and quick, and in a hurry, and there has been no mention of the hundred credits, and, as the days pass, the fact that there has been no mention has become a thing that sits between you at the galley table.',
      choices: [
        { label: 'Let it go', effects: { like: { 'thread:loan': 1 }, log: 'Let {thread:loan} keep the hundred I lent them. It was not worth the silence.' }, result: 'You say, lightly, over tea, that you have forgotten about the loan, and they look at you with a startled, naked relief, and are, from that day, a different sort of friend.' },
        { label: 'Ask for it back', effects: { credits: 50, like: { 'thread:loan': -2 }, log: 'Asked {thread:loan} for the loan. They gave me half and have not forgiven the asking.' }, result: 'You ask, plainly, and they pay half, in an envelope, with a face like a door closing, and you will be, from here on, a person who asked.' },
      ],
    });

    // ---- Short on the Pay ----
    after({
      id: 'h-short-audit', title: 'The Corrected Statements',
      text: '{captain} has been through the whole crew\'s statements, line by line, since you raised yours. The same error, it turns out, was in all of them: a day short on every wage for the same run. The captain made it good to everyone, and, at the galley table, with the envelopes out, said whose catch it was.',
      choices: [{ label: 'Accept the crew\'s thanks', effects: { like: { captain: 1, crew: 1 }, log: 'My short statement turned out to be everyone\'s. {captain} made it good to all of them.' }, result: 'It is awkward, and warm, and a little embarrassing, and, over the next few days, a lot of people find a way to put a cup of something in your hand, which is the way crews say thank you.' }],
    });
    after({
      id: 'h-scene-fallout', title: 'The Worst Watch',
      text: '{captain} did not mention the scene you made over your statement. They simply rewrote the watch list, and you are on the worst watch of the week, the dead hours after the flip, for the whole run. It is a perfectly reasonable rota. It is also, you note, mathematically pointed.',
      choices: [
        { label: 'Work it without complaint', effects: { learn: 1, like: { captain: 1 }, log: 'Worked the worst watch without complaint after making a scene about my pay.' }, result: 'You work it, and say nothing, and the long dead hours teach you more about the ship than the good ones ever did. At the end of the run, the captain moves your name, without a word, back up the list.' },
        { label: 'Complain', effects: { like: { captain: -1 } }, result: 'You complain, and it is received with the exquisite courtesy of a person who has heard it before, and the watch list does not change.' },
      ],
    });

    // ---- Something Off the Lane ----
    after({
      id: 'h-lane-again', title: 'The Same Ship',
      text: 'The transponder you reported turns up again, ahead of you this time, and the cutter that {captain} brought into the conversation is a faint spark behind it, closing. "That is your ship," the captain says, to nobody in particular, with a quiet satisfaction that does not quite stay quiet.',
      choices: [
        { label: 'Call it in at once', effects: { like: { captain: 1 }, learn: 2, log: 'The ship I reported turned up again, and this time I called it in at once.' }, result: 'You call it in, and the cutter lights its drive, and the strange ship, deciding that it has places to be, abandons the lane. {captain} says "Good eyes" for the second time, which, from this captain, is unheard of.' },
        { label: 'Wait and see', effects: { learn: 1 }, result: 'You wait, and watch, and the cutter does the work, and nothing is lost, and nothing is learned beyond the fact that you did not need to be the one.' },
      ],
    });
    after({
      id: 'h-lane-trouble', title: 'It Was Not Nothing',
      text: 'The ship you did not mention turns out to have been a raider. It rakes your hull on the way past, one clean pass, and is gone again before anyone can shoot. When the alarms stop, {captain} is in the cockpit door, and asks, in a level voice, whether any of the crew saw it coming.',
      choices: [
        { label: 'Admit you saw it', effects: { do: ['hull', 0.1], like: { captain: -2 }, log: 'A raider I saw and did not report hit the ship. I told {captain}.' }, result: 'You say it, and the captain\'s face does not change, which is, you find, the worst of it. "Thank you for telling me," they say. It is not a thank-you.' },
        { label: 'Say nothing', effects: { do: ['hull', 0.1], like: { captain: 0 } }, result: 'You say nothing, and the captain looks at each of the crew in turn, and the silence lengthens, and, at the end, they shrug and go. You will never know whether they knew.' },
      ],
    });
  },
});
