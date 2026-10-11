'use strict';

// What the trade, the missions and the jobs work out (js/market.js, js/world.js, js/game.js generateMissions, js/jobs.js, js/awayjobs.js) as they play, pinned before any of it is
// refactored (#457, docs/pins.md). A change to how a price, an offer or a job is worked out is a change to the fixture on purpose; write it again with
// `PIN_WRITE=1 node --test tests/tradepin.test.js` and read the diff.

const { pinTests } = require('./pin');
const { playTrade } = require('./tradeplay');

pinTests({ name: 'the prices, the markets, the missions and the jobs', fixture: 'trade-pin.json', play: playTrade, min: 150 });
