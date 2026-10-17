'use strict';

// The water dispute at Pallas (#683): a mission arc hung on the League Freight Hall (js/arcs.js). The Hall has a sealed crate it will not put on a bill of lading, for Wen
// Haraldsen at the Hollows: its own ledger of the water the refinery has drawn beyond its share, four months of it. The vote on the draw is at the Refinery in six days.
// Qualities: `league` (begun), `leagueSide` (where the hand has put their weight: from 2, the Hollows carry the vote), `league-open` (said they would speak). The crate and the
// floor lead into the count on the same landing; the end plays at the Hollows or the Refinery when the hand next comes, and gives a person, an item or a fee.
// Marit Okafor, the refinery guild's clerk, speaks in figures and the rule and never raises her voice; Wen speaks in households, tea and who is owed.

Mods.register({
  id: 'arc-league', name: 'The water dispute', builtin: true,
  init(M) {
    // The words each action keeps for a person are the scene's, passed in from the data below.
    // The hand who stays back had said they would speak: Wen minds that.
    M.addAction('league-back', memory => { if (quality('league-open')) like(arcPerson('wen'), -2, memory); return ''; });
    // The keys: a person, a regard and an item.
    M.addAction('league-keys', memory => { like(arcPerson('wen'), 2, memory); moveStanding('the League Freight Hall', 1); return addKit('valve-keys'); });
    // The fee: Marit warms, and the Hollows cool.
    M.addAction('league-fee', (forMarit, forWen) => { like(arcPerson('marit'), 2, forMarit); like(arcPerson('wen'), -1, forWen); return ''; });

    M.addStorylet({
      id: 'league-crate', where: 'port', chained: true, priority: 1,
      title: 'A Crate for the Hollows',
      text: ('Wen Haraldsen meets the ship at the Hollows lock with a flask of tea in each hand, and gives you one before she says her name. The crate is on the sled ' +
          'between you, no bigger than a toolbox, with a seal that was never meant to be broken in a corridor. She breaks it at a table in the tea room with a kitchen knife and ' +
          'turns the top sheet round. It is the Hall\'s ledger of the water drawn at Pallas, two columns, the refinery\'s and the families\'. The refinery\'s is the long one. ' +
          '"Four months of it," Wen says. "The vote is at the Refinery in six days. They\'ll say the Hall made it up, and the Hall won\'t say it didn\'t. Somebody has to say ' +
          'where the crate came from."'),
      choices: [
        { label: 'Say you will, at the vote',
          effects: { q: { league: 1, leagueSide: 1, 'league-open': 1 }, later: { 'league-vote': 6 }, do: ['arcLike', 'wen', 2, 'You said you would speak at the vote.'],
            log: 'Carried the League Freight Hall\'s sealed crate to Wen Haraldsen at the Hollows, and said I would speak at the vote.' },
          result: ('Wen writes the ship\'s name on the lid of your flask with a grease pencil, the day under it, and pushes it back across the table. "Six days," she says. ' +
              '"Bring that."') },
        { label: 'Say the Hall\'s name is the Hall\'s to give',
          effects: { q: { league: 1 }, later: { 'league-vote': 6 }, do: ['arcLike', 'wen', -1, 'You would not say where the crate came from.'],
            log: 'Carried the League Freight Hall\'s sealed crate to Wen Haraldsen at the Hollows, and kept the Hall\'s name out of it.' },
          result: ('Wen takes it like a price she expected, and finishes her tea first. "Then it fell off a sled in a corridor," she says, "and I found it. Mind yourself on ' +
              'the Refinery side."') },
      ],
    });

    M.addStorylet({
      id: 'league-floor', where: 'port', priority: 1, consumes: 'league-vote',
      when: { planet: 'Pallas Refinery', due: 'league-vote', q: { league: 1 }, hired: true },
      title: 'The Floor Before the Vote',
      text: ('The Refinery reads its votes aloud on the main deck at the shift change, and the queue to get in is the queue to hear it. Marit Okafor finds you in it. She is ' +
          'the guild clerk who reads the count, a narrow woman in a grey jacket with a slate under one arm and the ship\'s name already on it. "The relay logged a sealed crate ' +
          'off your lock at the Hollows," she says. "Six days ago, from Ceres." She says it pleasantly and does not stop watching your hands. "I would like to know what I am ' +
          'counting. I would like not to have to ask the Hall."'),
      choices: [
        { label: 'Tell her what was in it', next: 'league-count',
          effects: { q: { leagueSide: -1 }, do: ['arcLike', 'marit', 2, 'You told me what was in the crate.'] },
          result: ('Marit takes it down as you say it and does not interrupt. "Two columns," she says. "Mine is the long one." She writes a figure on the slate and covers it ' +
              'with her thumb. "Thank you. Nobody has said it to me aloud before."') },
        { label: 'Tell her it was sealed', next: 'league-count',
          effects: { do: ['arcLike', 'marit', 0, 'You said the crate was sealed.'] },
          result: 'Marit looks at you a moment longer than the answer needs. "Then it was a sealed crate," she says, and writes exactly that on the slate, which is all it will ever say.' },
        { label: 'Tell her you will speak at the vote', when: { q: { 'league-open': 1 } }, next: 'league-count',
          effects: { q: { leagueSide: 1 }, do: ['arcLike', 'marit', -1, 'You told me you would speak at the vote.'] },
          result: ('"Then I will call you after the Hollows," Marit says. She makes it sound like a courtesy, and it is one. She moves the slate to her other arm and goes to find ' +
              'her place on the platform.') },
        { label: 'Ask {official} for the lock log', when: { official: 2 }, next: 'league-count',
          effects: { q: { leagueSide: 1 } },
          result: ('{official} has the log out on the rail before you have finished the question. "Smelter cooling goes out on a month\'s cycle," {official} says. "The Hall\'s ' +
              'numbers are for a quarter. Somebody has been drawing the difference." {official} copies the page onto your slate and does not say it was done.') },
      ],
    });

    M.addStorylet({
      id: 'league-count', where: 'port', chained: true, priority: 1,
      title: 'The Count',
      text: ('The count is read from a platform of two ore sleds, and the whole shift comes up to hear it: smelter crews in their aprons with their arms folded, the Hollows ' +
          'families in quilted coats in a block by the east rail. Marit reads the households in the order they signed. She reads flat, the way she reads a bill, and nobody ' +
          'breathes loudly. Then she looks up from the slate, at the edge of the platform, where a speaker would stand.'),
      choices: [
        { label: 'Speak', when: { q: { 'league-open': 1 } },
          effects: { q: { leagueSide: 2 }, later: { 'league-end': 5 }, do: ['arcLike', 'wen', 2, 'You spoke at the vote.'], log: 'Spoke at the Pallas vote on the water draw, and said where the Hall\'s crate came from.' },
          result: ('You climb onto the sled and say it plainly, to the whole shift: the crate, the Hall\'s seal, the ledger, the day it came aboard. Your voice carries worse than ' +
              'you hoped. Marit does not look at you while you say it, and writes all of it down. The count comes out for the Hollows, three hundred and four to two hundred and ' +
              'ninety-one. Nobody cheers. A foreman in the front row says a number under his breath, and then the same number again.') },
        { label: 'Stay at the back',
          effects: { later: { 'league-end': 5 }, do: ['league-back', 'You said you would speak at the vote and you did not.'], log: 'Stood at the back of the Pallas vote on the water draw.' },
          result: [
            'You stay at the back with the strangers, where the sleds hide the platform, and hear the count as everyone does.',
            { when: { q: { leagueSide: 2 } }, text: ('Wen reads the ledger from the sled herself, and says where it came from: "a ship out of Ceres, that would rather not be named." Heads turn along the ' +
              'rail anyway. The count comes out for the Hollows, three hundred and four to two hundred and ninety-two, and the foreman in the front row says a number under his breath.') },
            { when: { qBelow: { leagueSide: 2 } }, text: ('The ledger is not read. The count comes out for the refinery, three hundred and fourteen to two hundred and ninety. The Hollows families leave by the east ' +
              'door in a block, and the smelter crews let them through without a word.') },
          ] },
      ],
    });

    M.addStorylet({
      id: 'league-hollows', where: 'port', priority: 1, consumes: 'league-end',
      when: { planet: 'The Hollows', due: 'league-end', q: { league: 1, leagueSide: 2 }, hired: true },
      title: 'The Pump Crew\'s Keys',
      text: ('The Hollows has put out cups on the lock rail before the ship is down: forty, in four rows, and an empty one for whoever is late. Wen Haraldsen is waiting at the ' +
          'end with a roll of cloth under her arm, and she waits until the rows have thinned before she opens it. Valve keys, a dozen, in graded sizes, each worn bright at the ' +
          'grip. "The pump crew\'s," she says. "They were their fathers\'. The cisterns run on a draw a fifth smaller at the refinery now, and somebody has to get at the ' +
          'valves." She holds them out on her flat hand.'),
      choices: [
        { label: 'Take the keys', effects: { do: ['league-keys', 'You took the pump crew\'s keys and said they would be used.'], log: 'The Hollows gave the ship the pump crew\'s valve keys, after the water vote.' },
          result: 'They weigh more than they look. Wen closes your fingers round the grip of the largest. "They\'ll open anything in the Hollows," she says, "and a good deal outside it."' },
        { label: 'Say the keys belong to the pump crew', effects: { do: ['arcLike', 'wen', 3, 'You gave the pump crew their keys back.'], log: 'Left the pump crew\'s valve keys with the Hollows.' },
          result: ('Wen rolls the cloth up again and does not say anything for as long as it takes to tie it. "Then you come back for tea," she says, "and I will tell the crew ' +
              'why there is a cup with your name on it."') },
      ],
    });

    M.addStorylet({
      id: 'league-refinery', where: 'port', priority: 1, consumes: 'league-end',
      when: { planet: 'Pallas Refinery', due: 'league-end', q: { league: 1 }, qBelow: { leagueSide: 2 }, hired: true },
      title: 'The Courier Rate',
      text: ('Marit Okafor has kept a seat for you in the Refinery\'s company store, at the end of the long table where the clerks eat, and she waits for you to sit before she takes ' +
          'an envelope out of the grey jacket. "The guild\'s courier rate," she says, "for the day the ship lost carrying the Hall\'s crate." It is a tidy sum, written out in her ' +
          'narrow hand. "I do not say the count went the way the Hollows wanted. I say the ledger was never entered, and you did not make me ask the Hall."'),
      choices: [
        { label: 'Take the envelope (400 cr)', effects: { credits: 400, do: ['league-fee', 'You took the courier rate and said nothing against the count.', 'You took the refinery\'s fee after the count.'], log: 'Took the Refinery guild\'s courier rate after the water vote.' },
          result: 'The envelope is thinner than the sum on it. Marit watches you count and writes the day in the margin of the slate. "That is the last I will ask you to carry," she says. "Unless it is the Hall\'s."' },
        { label: 'Leave it on the table', effects: { do: ['arcLike', 'marit', -1, 'You would not take the guild\'s courier rate.'], log: 'Left the Refinery guild\'s courier rate on the table.' },
          result: 'Marit looks at the envelope, and at you, and puts it back in the jacket without a word. The clerks at the table have stopped eating. One of them starts again.' },
      ],
    });
  },
});
