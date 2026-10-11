'use strict';

// Plays the culture feeds and the crew's talk about them (js/social.js) for the pin (feedpin.test.js) and the text layer's tests (#457). Not a test file. playFeeds runs in the page:
// on days across the year (so every league phase and several shows, books and one-off broadcasts are on), the feed line from several seeds, the port headlines, what the crew say
// (three people aboard with bonds between them), the downtime activities on offer with what each returns, and the card night; and, on one day each, a war, dock gossip about
// someone you know, the bond words and the page of bonds.
const playFeeds = () => {
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  const note = (key, text) => out.push({ key, text: text === null || text === undefined ? null : String(text) });
  const start = day => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', credits: 5000 });
    while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.crew = []; st.bonds = {}; st.qualities = {}; st.day = day; st.missions = st.missions.filter(m => m.type !== 'passenger');
    const mate = (first, over) => { const c = makeCrewCandidate(st.systemId); Object.assign(c, { first, last: 'Vale', traits: ['kind', 'brave'], opinion: 0, ...over }); registerPerson(c); st.crew.push(c.id); return c; };
    const a = mate('Ana', { home: 'Luna', culture: 'earth' }), b = mate('Ben', { home: 'Ceres Station', culture: 'belt' }), c = mate('Cora', { home: 'Olympus Dome', culture: 'mars' });
    const key = (x, y) => [x.id, y.id].sort().join('|');
    st.bonds[key(a, b)] = 6; st.bonds[key(a, c)] = 3.5; st.bonds[key(b, c)] = -4;
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit(); G.transit.times = [];  // in a burn, where the crew spend their downtime
    st.day = day;
    return G.state;
  };
  const DAYS = Array.from({ length: 31 }, (_, i) => 600 + i * 12);
  for (const day of DAYS) {
    if (window.__only && !new RegExp(window.__only).test(String(day))) continue;
    const st = start(day), snap = JSON.stringify(G.state);
    const again = seed => { G.state = JSON.parse(snap); G.nextEvent = null; G.dialog = null; __seed(seed); };
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) { again(seed); note(`feed:${day}:${seed}`, feedLine()); }
    again(1); note(`headlines:${day}`, feedHeadlines().join(' | '));
    again(1); cultureDay(); cultureDay(); note(`crewtalk:${day}`, socialLines().join(' | '));
    again(1); note(`bonds:${day}`, bondsHtml());
    // the activities on offer: the label, whether it can be done, and what each returns (the dice from two seeds)
    again(1); const on = onNow();
    on.forEach((act, i) => {
      note(`on:${day}:${i}:label`, typeof act.label === 'function' ? act.label() : act.label);
      for (const seed of [1, 2]) { again(seed); const acts = onNow(); note(`on:${day}:${i}:run:${seed}`, acts[i].run()); }
    });
  }
  // a war, and dock gossip about someone you know, on one day
  { const st = start(700), snap = JSON.stringify(G.state);
    G.state.factions = { prosperity: {}, tension: {}, war: { a: 'Mars', b: 'Belt' } }; const withWar = JSON.stringify(G.state);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) { G.state = JSON.parse(withWar); __seed(seed); note(`feed:war:${seed}`, feedLine()); }
    G.state = JSON.parse(snap);
    const p = makeCrewCandidate(G.state.systemId); Object.assign(p, { first: 'Pia', last: 'Rowe', location: 'Mars', opinion: OPINION.TRUSTED, memories: ['Day 3: You lent me a coat.'] }); registerPerson(p); const gossip = JSON.stringify(G.state);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20]) { G.state = JSON.parse(gossip); __seed(seed); note(`feed:gossip:${seed}`, feedLine()); }
  }
  // the card night, won and lost, and the words for a bond
  { start(700); const snap = JSON.stringify(G.state);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { G.state = JSON.parse(snap); __seed(seed); note(`cards:${seed}`, SOCIAL_ACTIVITIES.cards.run()); }
    for (const n of [-8, -4, -2, -0.5, 0, 0.5, 1.5, 4, 7]) note(`bondword:${n}`, bondWord(n)); }
  Math.random = real;
  return out;
};

module.exports = { playFeeds };
