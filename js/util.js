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
