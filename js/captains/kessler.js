'use strict';

// Ama Kessler, one of the lender's four masters (chapter two, #891, docs/bible/people/kessler.md). A placement master: Van Leeuwen & Co. puts her on
// the hulls it is nervous about. She tells the members she reports to the house, and does. She leans the co-op toward the lender. Uses "she".

CAPTAINS.kessler = {
  first: 'Ama', last: 'Kessler', pronouns: 'she', culture: 'earth', home: 'Rotterdam Arcology', age: 61, traits: ['secretive', 'kind'],
  bio: 'Eighteen years a placement master for Van Leeuwen & Co., on eleven hulls the house was nervous about. Nine still fly. She writes to the house every Sunday, and tells every crew so on the first day.',
  wants: 'A clean last placement, and a pension she can live on in Rotterdam.', fears: 'A surprise.',
  captain: { trade: 4, nerve: 2, thrift: 5 }, wage: 850, hears: 0, bonus: 3, talk: 0.7,
  master: true, leans: 'lender',

  intro: () => ('Ama Kessler has a folder under her arm and the rain of somewhere else still on her coat. "I write to the house every Sunday," she says. ' +
      '"The log, the cargo, the minutes. Nothing you\'d not show them yourselves. You may read it first, if you like. Most crews stop asking by the ' +
      'third. I\'ve been on eleven hulls, and nine still fly. I\'d like this to be the tenth."'),

  chatter: [
    'Kessler is writing to the house. It is not Sunday. She says it is a draft.',
    'Kessler: "That run pays. It also puts us on a lane the house doesn\'t like. Both of those go in the letter."',
    'Kessler has balanced the books again, to the credit, and closed the folder without a word.',
    'Kessler calls everyone by their surname, including the coffee machine, which she calls "Machine".',
    'Kessler: "The house is not your enemy. It is a lender. That\'s worse in some ways and better in others."',
    'Kessler is reading the minutes of the last meeting, and has underlined one sentence twice.',
  ],

  sway: { ok: (o, cur) => o.days >= cur.days && o.risk <= cur.risk, yes: 'Kessler makes a note. "Sensible. The house will like it, which is not the same as it being right, but here it is."', no: 'Kessler makes a different note. "I\'ll write that you asked. I won\'t write that I agreed."' },
};
