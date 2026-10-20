'use strict';

// The range a ship fight starts at (#710, fight.js): a distance in km where she was met, by her style, moved by the contact's own move (engage.js), and the
// band it falls in. The fight keeps the band from there. Pure: it runs in plain Node (tests/range.test.js). Loaded before board.js.

const RANGE_FIRST = { grapple: 40, torpedo: 40, gun: 30 };  // km where she is met: a raider and a corsair far out, a patrol at gun range
const RANGE_BANDS = ['knife', 'close', 'mid', 'long'];
const rangeBand = km => (km < 3 ? 'knife' : km < 10 ? 'close' : km < 40 ? 'mid' : 'long');
const bandIndex = km => RANGE_BANDS.indexOf(rangeBand(km));

// The range she is met at, by her style.
const rangeAtContact = style => RANGE_FIRST[style] || RANGE_FIRST.grapple;
