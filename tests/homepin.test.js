'use strict';

// The words of the birthday, the news, the traditions, the cat and the offer to stay (js/family.js, #457) as they play. The pin (fixtures/home-pin.json) is what they play with no edits;
// the text layer must leave it as it is. After a change to the words on purpose, write it again with
// `PIN_WRITE=1 node --test tests/homepin.test.js` and read the diff.

const { pinTests } = require('./pin');
const { playHome } = require('./homeplay');

pinTests({ name: 'the birthday, news, tradition, cat and offer-to-stay scenes', fixture: 'home-pin.json', play: playHome, min: 40 });
