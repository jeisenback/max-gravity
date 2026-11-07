'use strict';

// Aron Saran, one of the lender's four masters (chapter two, #891, docs/bible/people/saran.md). Careful and by the book; he lost his last bridge
// when an owner sold it to pay a debt. His wife Liv is a yard clerk at Tycho, so he leans the co-op toward Tycho without asking for it. No first
// officer: the co-op's bosun is Cato. Uses "he".

MASTER_CAPTAINS.saran = {
  first: 'Aron', last: 'Saran', pronouns: 'he', culture: 'earth', home: 'the Luna yards', age: 54, traits: ['secretive'],
  bio: 'Fifteen years commanding freighters for Luna owners, until his last bridge was sold out from under him and the crew at a day\'s notice to pay an owner\'s debt. He spent a year ashore, and took the co-op\'s job because a members\' vote is at least something he can read.',
  wants: 'A bridge that cannot be sold out from under him, and his daughter clear of his debts.', fears: 'Losing a ship to a man he never met, again.',
  captain: { trade: 3, nerve: 3, thrift: 4 }, wage: 800, hears: 1, bonus: 2, talk: 0.8,
  master: true, leans: 'tycho',

  intro: () => ('Aron Saran stands a little apart from the other two, in a jacket pressed for the occasion. "I commanded freighters out of Luna for fifteen ' +
      'years," he says. "My last one was sold to pay a man\'s debt, with the crew still aboard. On my bridge, I decide. In your meeting, you do. I\'ll keep ' +
      'the two apart if you will. And you should know my wife works for Tycho. I\'d rather you heard it from me."'),

  chatter: [
    'Saran is reading the log back from the start of the watch, line by line, with a pencil.',
    'Saran: "Rahman, the rota. Achebe, the drive. We burn on the second."',
    'Saran has a letter from his daughter open on the chart table, face down, under the weight of a coffee cup.',
    'Saran checks the hull\'s papers again. They were in order an hour ago. They are in order now.',
    'Saran, to nobody in particular: "A clean log is the only thing an owner can\'t sell."',
    'Saran is on the band with Liv, saying very little and listening for a long time.',
  ],

  sway: { ok: (o, cur) => o.days <= cur.days, yes: 'Saran reads the run twice and nods. "That\'s sound. We\'ll take it."', no: 'Saran shakes his head, once. "Not on my bridge. It\'s the meeting\'s call, and I\'ve said my piece."' },
};
