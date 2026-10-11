'use strict';

// The words of the found-family scenes (js/family.js, js/familytext.js, #457) as they play. The pin (fixtures/family-pin.json) is what the stories, the idle talk, the letters from
// home and the holidays play with no edits; the text layer must leave it as it is. After a change to the words on purpose, write it again with
// `PIN_WRITE=1 node --test tests/familypin.test.js` and read the diff.

const { pinTests } = require('./pin');
const { playFamily } = require('./familyplay');

pinTests({ name: 'the family scenes', fixture: 'family-pin.json', play: playFamily, min: 151 });
