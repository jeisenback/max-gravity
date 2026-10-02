'use strict';

// Cato Rahman, Hester Vance's first officer (js/captains/hester.js). Big and calm, came up through the hold, and knows every
// crew member's family. He covers for the crew against her rules. A first officer is a CAST entry marked xo and fragile:
// fate.js does not protect them with the floor. His scenes and pivot come later; `scenes` is empty until then.

CAST.cato = {
  first: 'Cato', last: 'Rahman', culture: 'earth', home: 'Chittagong Arcology', job: 'first officer', age: 44, role: 'xo',
  traits: ['kind', 'generous'], wage: 65, xo: true, fragile: true,
  skills: { xo: 2, engineer: 1, pilot: 0, gunner: 1, slicer: 0 }, captain: { trade: 3, nerve: 3, thrift: 2 },
  ambition: 'Wants a share of a ship, someday, so the crew he came up with could work one deck again.',
  bio: 'He came up through the hold, and he knows every crew member by name and by family. He keeps the watch bill, and covers for the crew where the captain\'s rules would not.',
  story: {
    left: 'a ship sold out from under her crew, and a hold gang scattered across three ports', rel: 'mother', name: 'Samira',
    hope: 'a share of a ship, so the hold gang he came up with could work one deck again',
    homeDetail: 'a flat above a cargo exchange where the lift ran all night and nobody in the building kept the same shift',
    favor: null,
    news: {
      good: ['{who} sent a photo of the whole stairwell at a wedding', '{who} has a new lift technician, who actually comes when called', '{who} says the rent is frozen for another year'],
      bad: ['{who} says the lift has been broken for a month', '{who} is ill, and the clinic on {home} has a waiting list', '{who} says the exchange is closing the flats for repairs'],
    },
  },
  chatter: [],
  scenes: {},
};
