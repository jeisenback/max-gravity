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

// ---------- the cutting's numbers ----------
// The odds a section goes wrong, by depth (1 to 3), and what cutting carefully does to them and to the take (the soak tunes them).
const SECTION_RISK = [0.1, 0.25, 0.4], CAREFUL = 0.5, SECTION_TONS = [3, 5, 8];
const sectionRisk = (depth, careful) => SECTION_RISK[depth - 1] * (careful ? CAREFUL : 1);
// A section's goods for the hold: a few tons of one of the type's goods, halved carefully, no more than the hold has room for.
const sectionTake = (type, depth, careful, room) => {
  const goods = WRECK_TYPES[type].goods, tons = Math.floor(SECTION_TONS[depth - 1] * (careful ? CAREFUL : 1));
  return { good: goods[(depth - 1) % goods.length], tons: Math.max(0, Math.min(tons, room)) };
};
// An intact part, worth taking off whole: on section 2 of a third of wrecks and section 3 of half, fixed by the wreck's own seed.
const sectionPart = (wreck, depth) => depth > 1 && hash(`${wreck.seed}|${wreck.name}|part|${depth}`) % (depth === 2 ? 3 : 2) === 0;
// What goes wrong when a cut fails, by the roll's third: someone on the cutting team hurt, one of the ship's systems hit, or the section lost.
const riskOutcome = roll => (roll < 1 / 3 ? 'hurt' : roll < 2 / 3 ? 'system' : 'lost');
// The read of a section's risk. A reader with the skill (3 and up) reads the true band; anyone less reads coarser bands, so a middling risk
// can read clean or bad, but never two bands off.
const readWord = (risk, skill) => (skill >= 3 ? (risk < 0.15 ? 'clean' : risk < 0.33 ? 'some' : 'bad') : (risk < 0.2 ? 'clean' : risk < 0.35 ? 'some' : 'bad'));
