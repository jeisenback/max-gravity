'use strict';

// Noor Belanger, one of the lender's four masters (chapter two, #891, docs/bible/people/belanger.md). Eight years a Ballast Security convoy master; a
// convoy she commanded fired on a freehold's ship, three died, and the inquiry put a mark on her licence. The cheapest of the four and the best in a
// fight; she leans the co-op toward Ballast, through people she still knows. Uses "she".

MASTER_CAPTAINS.belanger = {
  first: 'Noor', last: 'Belanger', pronouns: 'she', culture: 'mars', home: 'a hub dome on Mars', age: 46, traits: ['brave', 'secretive'],
  bio: 'Eight years commanding convoys for Ballast Security. A convoy she commanded fired on a freehold\'s ship that would not stand off, and three of its crew died. The inquiry put a mark on her licence, and she pays toward their families each month.',
  wants: 'The mark lifted, and a bridge she does not have to apologise for.', fears: 'Having to fire again.',
  captain: { trade: 3, nerve: 4, thrift: 2 }, wage: 600, hears: 0, bonus: 1, talk: 0.6,
  master: true, leans: 'ballast',

  intro: () => ('Noor Belanger answers the question before anyone asks it. "Yes, I was the master. Yes, three died. Ask what you want to ask." Nobody does. ' +
      '"I\'m cheap because of the mark," she says. "You\'re getting a bargain. Don\'t make me prove it."'),

  chatter: [
    'Belanger: "Guns warm. Nobody fires before I say. Nobody."',
    'Belanger is running the fight drills again, in silence, with the clock.',
    'Belanger: "Ballast pays well. That\'s the whole of what I\'ll say for it."',
    'Belanger has turned the freeholds\' band down, not off.',
    'Belanger answers Pax\'s question about the convoy, all of it, and then goes back to the chart.',
    'Belanger: "Stand off, and nobody has to find out what I\'m like."',
  ],

  sway: { ok: (o, cur) => o.risk >= cur.risk, yes: 'Belanger looks at the lane and nods. "If there\'s trouble on it, better us than someone who\'d run."', no: 'Belanger shakes her head. "That\'s the long way round a fight. We\'ll go through it."' },
};
