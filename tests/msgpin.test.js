'use strict';

// The one-line messages of flight and the dock (js/game.js) as they play, pinned before they move into the text layer (#508, docs/pins.md). A change to a message is a change to
// the fixture on purpose; write it again with `PIN_WRITE=1 node --test tests/msgpin.test.js` and read the diff.

const { pinTests } = require('./pin');
const { playMessages } = require('./msgplay');

pinTests({ name: 'the messages of flight and the dock', fixture: 'msg-pin.json', play: playMessages, min: 20, words: ['text', 'news'] });
