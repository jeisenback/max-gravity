'use strict';

// Small pure helpers every system uses: a random number, a random pick, the distance between two points, a number with its
// thousands separators, an angle wrapped to half a turn, and a hash of a string. Loaded first, after data.js, so the pure scripts
// after it (orbits.js, market.js) and the tests that load them without a browser can use them.

const rand = (a, b) => a + Math.random() * (b - a);
const randInt = (a, b) => Math.floor(rand(a, b + 1));
const pick = arr => arr[Math.floor(Math.random() * arr.length)];
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const fmt = n => Math.round(n).toLocaleString('en-US');
const wrapAngle = a => Math.atan2(Math.sin(a), Math.cos(a));

function hash(str) {
  let h = 0;
  for (const c of str) h = (h * 31 + c.charCodeAt(0)) | 0;
  return h;
}
