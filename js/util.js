'use strict';

// Small pure helpers every system uses: the distance between two points, a number with its thousands separators, an angle wrapped
// to half a turn, and a hash of a string. Loaded first, after data.js, so the pure scripts after it (orbits.js, market.js) and the
// tests that load them without a browser can use them. The random helpers (rand, randInt, pick) stay in game.js: the new scripts
// do not use them, and moved here they made CodeQL report the old "insecure randomness" finding on people.js's `secret` as a new one.

const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = n => Math.round(n).toLocaleString('en-US');
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}

// A perk of the hired hand's post ladder (picks.js) where the reader may not be loaded: handPerk is hired.js's, and a module run in plain Node has none.
const perkOn = id => typeof handPerk === 'function' && handPerk(id);

// A person's pronouns, for the words (#1240): 'she', 'he' or 'they', each with its forms and the verbs that agree with it ("she has", "they have"). Anyone
// whose pronouns are not given is 'they', never guessed from a name. The words a template takes ({they}, {They}, {their}, {have} ...): pronounWords.
const PRONOUNS = {
  she: { they: 'she', them: 'her', their: 'her', theirs: 'hers', themself: 'herself', are: 'is', have: 'has', were: 'was' },
  he: { they: 'he', them: 'him', their: 'his', theirs: 'his', themself: 'himself', are: 'is', have: 'has', were: 'was' },
  they: { they: 'they', them: 'them', their: 'their', theirs: 'theirs', themself: 'themself', are: 'are', have: 'have', were: 'were' },
};
const pronouns = key => PRONOUNS[key] || PRONOUNS.they;
// A person's own (`pronouns` on the person, or a captain's from their entry, captains.js), else 'they'.
const pronounsOf = p => pronouns(p && (p.pronouns || (p.captainKey && typeof CAPTAINS !== 'undefined' && CAPTAINS[p.captainKey] && CAPTAINS[p.captainKey].pronouns)));
// The template words for one person: each form, and the ones a sentence starts with capitalised ({They}, {Their} ...).
const pronounWords = p => { const w = pronounsOf(p); return { ...w, ...Object.fromEntries(['they', 'them', 'their', 'theirs', 'themself'].map(k => [k[0].toUpperCase() + k.slice(1), w[k][0].toUpperCase() + w[k].slice(1)])) }; };
