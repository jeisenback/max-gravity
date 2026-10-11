'use strict';

// The words of the "With {name}" scenes (js/family.js, #457) as they play. The pin (fixtures/talk-pin.json) is what the talk topics, the idle talk, the sittings of a story, the favor and
// the picker play with no edits; the text layer must leave it as it is. After a change to the words on purpose, write it again with
// `PIN_WRITE=1 node --test tests/talkpin.test.js` and read the diff.

const { pinTests } = require('./pin');
const { playTalk } = require('./talkplay');

pinTests({ name: 'the With-name scenes', fixture: 'talk-pin.json', play: playTalk, min: 20 });
