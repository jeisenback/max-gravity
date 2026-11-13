'use strict';

// Wrecks and salvage (#965): the co-op's jobs at a site. A salvage job sends the ship to a wreck (sites.js) to cut up to three sections
// deeper, one a shift, with the risk read before each cut; a survey job sends it to a rock for one scene. The tables and the cutting's
// numbers are here, as pure functions of what they read; the scenes and the board's rows follow. Loaded after icerun.js; the tables run
// under tests/nodecontext.js.

// The wrecks, by type: the ship names a site takes, the goods its sections yield (data.js good ids), the find a client wants off it, and
// who the client is for that find.
const WRECK_TYPES = {
  orehauler: {
    word: 'an ore hauler', goods: ['metal', 'industrial'],
    names: ['Dorran Sky', 'Hollin Reach', 'Patience Marr', 'Second Shift', 'Tamsin Ore', 'Brekker Line', 'Low Wager', 'Ostrava Kell', 'Old Hundred'],
    find: 'recorder', findWord: 'the flight recorder', clients: ['Hask Mutual', 'Belt Hull Assurance', 'the Ostrava claims office'],
  },
  courier: {
    word: 'a courier', goods: ['equipment', 'industrial'],
    names: ['Quick Annie', 'Lantern Post', 'Mercy Vell', 'Seven Hours', 'Kestrel Run', 'Tidy Margin', 'Ilse Brand', 'Small Hours'],
    find: 'cargo', findWord: 'the mail cases', clients: ['Ceres Post', 'Varga and Daughters', 'the Pallas courier office'],
  },
  raider: {
    word: 'a raider', goods: ['metal', 'equipment'],
    names: ['No Account', 'Black Tuesday', 'Mother Kin', 'Bad Debt', 'Gallows Rate', 'Hard Cash', 'Tollkeeper', 'Short Notice'],
    find: 'proof', findWord: 'the transponder', clients: ['the Pact bounty desk', 'a lawyer for the Kell family', 'Hask Mutual'],
  },
  yacht: {
    word: 'a yacht', goods: ['equipment', 'industrial'],
    names: ['Silver Leasehold', 'Amaranth', 'Lady Orsolya', 'Fair Return', 'Gilt Edge', 'Windfall', 'Corinna Hale', 'The Long Weekend'],
    find: 'proof', findWord: 'the owner\'s log', clients: ['a widow on Vesta', 'the Hale estate', 'Belt Hull Assurance'],
  },
};
const WRECK_TYPE_IDS = Object.keys(WRECK_TYPES);
