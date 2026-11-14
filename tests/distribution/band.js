'use strict';

// One way to state a soak's band (#1199): the name, the value, the band it must sit in, and where the band came from, the sample and what was
// last measured, said the same way in every distribution test, so a failure reads alike and points at its source. Not a test file.
const assert = require('node:assert/strict');

function band(name, value, [lo, hi], { sample = '', measured = '' } = {}) {
  assert.ok(value >= lo && value <= hi, `${name}: ${value}, outside ${lo} to ${hi}${sample ? `. Sample: ${sample}` : ''}${measured ? `. Last measured: ${measured}` : ''}`);
}

module.exports = { band };
