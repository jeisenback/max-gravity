'use strict';

// The text tables of people.js, moved out so the logic reads on its own (#254). Data only; loaded before people.js.

const NAMES = {
  earth: {
    first: [
      'Amara',
      'Daniel',
      'Priya',
      'Mateo',
      'Chen',
      'Fatima',
      'Oliver',
      'Aiko',
      'Samuel',
      'Leila',
      'Tomas',
      'Grace',
      'Ravi',
      'Ines',
      'Kwame',
      'Hana',
      'Diego',
      'Nadia',
      'Arjun',
      'Sofia'
    ],
    last: [
      'Nakamura',
      'Silva',
      'Hassan',
      'Kowalski',
      'Mbeki',
      'Singh',
      'Ferreira',
      'Lindqvist',
      'Moreau',
      'Castillo',
      'Haddad',
      'Petrov',
      'Osei',
      'Tanaka',
      'Mendoza',
      'Kaur',
      'Novak',
      'Achebe',
      'Okonjo',
      'Brennan'
    ],
    jobs: [
      'accountant',
      'schoolteacher',
      'insurance adjuster',
      'journalist',
      'nurse',
      'software auditor',
      'lawyer',
      'aid worker',
      'sales rep'
    ]
  },
  mars: {
    first: [
      'Marcus',
      'Yelena',
      'Tariq',
      'Ingrid',
      'Hector',
      'Mei',
      'Anton',
      'Zara',
      'Felix',
      'Olga',
      'Kenji',
      'Dalia',
      'Viktor',
      'Sana',
      'Ruben',
      'Noor'
    ],
    last: [
      'Holloway',
      'Achterberg',
      'Castellanos',
      'Ibarra',
      'Kerr',
      'Laszlo',
      'Quint',
      'Reyes',
      'Sato',
      'Ueda',
      'Valenti',
      'Weller',
      'Zamora',
      'Okoye',
      'Brandvold'
    ],
    jobs: [
      'terraforming engineer',
      'soil chemist',
      'dome architect',
      'navy veteran',
      'hydrologist',
      'teacher',
      'atmospheric modeler'
    ]
  },
  belt: {
    first: [
      'Tiko',
      'Ama',
      'Bexa',
      'Dru',
      'Esa',
      'Fen',
      'Gaz',
      'Imi',
      'Jo',
      'Kez',
      'Lolo',
      'Mika',
      'Nim',
      'Pax',
      'Ruo',
      'Sabe',
      'Tuk',
      'Vesna',
      'Wim',
      'Yuri'
    ],
    last: [
      'Ashford-Kamau',
      'Bello',
      'Chu-Okoro',
      'Dagny',
      'Esteban-Li',
      'Faro',
      'Ghosh',
      'Hollis',
      'Iwu',
      'Jansen-Ruiz',
      'Kalu',
      'Lindo',
      'Marsh',
      'Nyambura',
      'Oyelaran',
      'Pike',
      'Quesada',
      'Rourke',
      'Soto-Nakamura',
      'Tembo'
    ],
    jobs: [
      'ice miner',
      'hydroponics tech',
      'dockworker',
      'refinery welder',
      'water recycler tech',
      'salvager',
      'ore assayer',
      'EVA rigger'
    ]
  }
};

const TRAITS = {
  talkative: {
    adj: 'talkative',
    chatter: [
      '{first}: "Did I ever tell you about the time on {home}..."',
      '{first} is telling a long story in the galley, and, from the sound of it, has reached the good part for the third time.',
      '{first}: "And that, I always say, is the whole trouble with {home}. Oh, but that reminds me..."',
      '{first} has been talking for an hour, and the coffee maker, in a corner, has given up in sympathy.',
      '{first} is explaining, to nobody in particular, what they would do with a ship of their own.'
    ]
  },
  nervous: {
    adj: 'nervous',
    chatter: [
      '{first} keeps checking the hull pressure readouts.',
      '{first} jumps at a clank from the engine room, and pretends they did not.',
      '{first} has, for the fifth time this watch, tested the seal on the nearest hatch.',
      '{first} is counting the emergency suits, quietly, under their breath, in a low, steady mutter.',
      '{first} sleeps with a hand on the bulkhead.'
    ]
  },
  generous: {
    adj: 'generous',
    chatter: [
      '{first} made coffee for everyone.',
      '{first} has left a plate of something sweet outside the engine room, without a note.',
      '{first} is giving away, one piece at a time, the contents of their sock drawer.',
      '{first} covered someone\'s shift, and will not hear a word about it.',
      '{first} has a knack for turning up, unasked, with exactly what you need.'
    ]
  },
  greedy: {
    adj: 'money-minded',
    chatter: [
      '{first} is doing sums on a hand terminal and muttering.',
      '{first} has worked out what every ton of cargo on the ship is worth, and tells you, twice.',
      '{first} is running the numbers on a trade route, and, from the muttering, it is not going to be enough.',
      '{first} watches the fuel gauge, and does not blink.',
      '{first} has started a betting pool on the arrival date, and holds all the odds.'
    ]
  },
  pious: {
    adj: 'devout',
    chatter: [
      '{first} is praying quietly in the cargo bay.',
      '{first} has tied a ribbon to a bulkhead, for luck, and blessed it.',
      '{first} murmurs a short blessing over the drive before each flip.',
      '{first} is reading, aloud and softly, from a worn book.',
      '{first} is lighting a very small, very safe candle in a jar, and shielding it from the draught with a hand.'
    ]
  },
  rude: {
    adj: 'abrasive',
    chatter: [
      '{first}: "Who designed this galley, and were they drunk?"',
      '{first} is complaining about the coffee. The coffee, to be fair, deserves it.',
      '{first}: "In my last ship, we had a proper bunk. With a door."',
      '{first} has an opinion about the way you are flying, and shares it, generously, at every turn.',
      '{first} is glaring at the thermostat.'
    ]
  },
  curious: {
    adj: 'curious',
    chatter: [
      '{first} is asking the nav computer far too many questions.',
      '{first} has taken the panel off the galley clock to see what makes it tick.',
      '{first} is following the plume readout with a notebook, and a look of pure joy.',
      '{first}: "But why does it hum at that particular note? Has anybody ever asked?"',
      '{first} is pressing an ear to the bulkhead, listening to something nobody else can hear.'
    ]
  },
  drunk: {
    adj: 'hard-drinking',
    chatter: [
      '{first} is suspiciously cheerful for this hour.',
      '{first} is humming, loudly, an old song from {home}, and has forgotten the second verse.',
      '{first} is sitting very carefully upright, with a mug that smells like anything but coffee.',
      '{first} has made a toast to the ship, and is now, tenderly, toasting the coffee maker.',
      '{first} is cheerfully explaining something to a coaster.'
    ]
  },
  secretive: {
    adj: 'guarded',
    chatter: [
      '{first} closes a message window whenever you walk past.',
      '{first} answers every question with a question, and does it very gracefully.',
      '{first} has a locked case, and a way of standing between it and everyone else.',
      '{first} is very quiet, and very watchful, and always knows where everyone is.',
      '{first} deletes a message, and looks up, and smiles at you.'
    ]
  },
  kind: {
    adj: 'kind',
    chatter: [
      '{first} fixed the squeaky hatch without being asked.',
      '{first} noticed someone was tired, and quietly took the rest of their watch.',
      '{first} is sewing a torn sleeve, by a lamp, for someone who is not going to ask.',
      '{first} has left a note on the galley wall: "Ask me if you need anything. Anything at all."',
      '{first} is humming, softly, at the sink, while washing everyone else\'s cups.'
    ]
  },
  brave: {
    adj: 'steady',
    chatter: [
      '{first} volunteered for the next EVA before anyone asked.',
      '{first} is calmly checking the emergency hatches, one by one, whistling.',
      '{first} has a plain scar, and a plain refusal to talk about it.',
      '{first}: "If anything goes wrong, I will be the one to go and look. That is what I am for."',
      '{first} is smiling, in the face of a very small, very real problem with the coolant.'
    ]
  },
  homesick: {
    adj: 'homesick',
    chatter: [
      '{first} is looking through old pictures of {home}.',
      '{first} has gone very quiet, and is watching the viewport.',
      '{first} is making a dish from {home}, out of not-quite-right ingredients, and eating it with great seriousness.',
      '{first} is humming something from {home}, low and soft, and does not seem to know.',
      '{first} keeps a stone from {home}, worn smooth, and turns it over, and over, and over.'
    ]
  }
};

const SHIP_WORDS = {
  a: [
    'Patient',
    'Lucky',
    'Stubborn',
    'Quiet',
    'Wandering',
    'Iron',
    'Honest',
    'Restless',
    'Silver',
    'Distant',
    'Second',
    'Brave'
  ],
  n: [
    'Promise',
    'Horizon',
    'Tortoise',
    'Heron',
    'Bargain',
    'Anvil',
    'Lantern',
    'Wager',
    'Pilgrim',
    'Ember',
    'Mule',
    'Comet'
  ],
  pa: ['Crimson', 'Hungry', 'Silent', 'Black', 'Bitter', 'Rusted'],
  pn: ['Knife', 'Grin', 'Debt', 'Tooth', 'Widow', 'Vulture', 'Hook']
};
