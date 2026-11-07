'use strict';

// Tavi Mensah, one of the lender's four masters (chapter two, #891, docs/bible/people/mensah.md). A Belt master who flew Kaur Enrichment's tankers
// out of Vesta to the small rocks for ten years, and left when Kaur cut the small runs. Quick, warm, reckless; he leans the co-op toward Kaur and the
// rocks behind it. Uses "he".

CAPTAINS.mensah = {
  first: 'Tavi', last: 'Mensah', pronouns: 'he', culture: 'belt', home: 'Ceres Station', age: 39, traits: ['brave', 'talkative'],
  bio: 'Ten years on Kaur Enrichment\'s tankers out of Vesta, out to the small rocks off the lanes. He left when Kaur cut the small runs to save money. He knows the rocks by name, and most of them know him.',
  wants: 'To fly the Belt\'s small runs, and keep the rocks alive.', fears: 'A rock going dry that he could have reached.',
  captain: { trade: 2, nerve: 5, thrift: 2 }, wage: 750, hears: 2, bonus: 1, talk: 1.4,
  master: true, leans: 'kaur',

  intro: () => ('Tavi Mensah shakes everyone\'s hand, twice in Cato\'s case, and knows Bexa\'s tug by name. "Ten years on Kaur\'s tankers," he says. "Good ' +
      'people. Bad firm. You\'d like the people. I know a rock two days off the lane that\'ll pay double for whatever you\'ve got. Vote however you like. ' +
      'Just vote quick."'),

  chatter: [
    'Mensah is on the band to a rock you have never heard of, laughing at something the rock said.',
    'Mensah: "We can make that approach. I\'ve made worse with a fuller tank."',
    'Mensah has drawn the small rocks on the chart in pencil, with a name beside each one.',
    'Mensah: "Kaur? Good people. Bad firm."',
    'Mensah is teaching Pax a Belt card game, and losing on purpose, badly.',
    'Mensah: "If the rocks go dry, somebody has to run it. Might as well be someone who knows the way."',
  ],

  sway: { ok: (o, cur) => o.pay >= cur.pay, yes: 'Mensah grins. "Now you\'re flying. Your way, and quick."', no: 'Mensah winces. "That\'s a long way round for less. Ask me again when it pays."' },
};
