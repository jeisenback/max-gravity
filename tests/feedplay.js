'use strict';

// Plays the culture feeds and the crew's talk about them (js/social.js) for the pin (feedpin.test.js) and the text layer's tests (#457). Not a test file. playFeeds runs in the page:
// on days across the year (so every league phase and several shows, books and one-off broadcasts are on), the feed line from several seeds, the port headlines, what the crew say
// (three people aboard with bonds between them), the downtime activities on offer with what each returns, and the card night; and, on one day each, a war, dock gossip about
// someone you know, the bond words and the page of bonds.
const playFeeds = raw => {  // raw: every case (the pin keeps the first of each feed line)
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  const note = (key, text) => out.push({ key, text: text === null || text === undefined ? null : String(text) });
  const start = (day, noSeasons, mode = 'fans') => {  // mode: 'fans' (two of each taste among the crew), 'few' (one, and rude) or 'none'
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', credits: 5000 });
    while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.crew = []; st.bonds = {}; st.qualities = {}; st.day = day; st.missions = st.missions.filter(m => m.type !== 'passenger');
    const mate = (first, over) => { const c = makeCrewCandidate(st.systemId); Object.assign(c, { first, last: 'Vale', traits: ['kind', 'brave'], opinion: 0, ...over }); registerPerson(c); st.crew.push(c.id); return c; };
    const a = mate('Ana', { home: 'Luna', culture: 'earth' }), b = mate('Ben', { home: 'Ceres Station', culture: 'belt' }), c = mate('Cora', { home: 'Olympus Dome', culture: 'mars' });
    for (const [first, culture] of [['Dev', 'earth'], ['Eli', 'belt'], ['Fay', 'mars']]) mate(first, { home: 'Luna', culture });  // more people, so that some share a team or a taste
    const key = (x, y) => [x.id, y.id].sort().join('|');
    st.bonds[key(a, b)] = 6; st.bonds[key(a, c)] = 3.5; st.bonds[key(b, c)] = -4;
    if (!noSeasons) for (let d = day - 300; d <= day; d++) { st.day = d; cultureDay(); }  // the leagues have played their seasons up to the day: tables, results, champions
    // fans among the crew of what is on: two of each genre of the shows, books and broadcasts, and two each of two teams of a live league
    let n = 0;
    const fan = (test, over) => { for (let i = 0; i < 80; i++) { const f = makeCrewCandidate(st.systemId); Object.assign(f, { first: 'Fan', last: 'Vale', traits: ['kind', 'brave'], opinion: 0, home: 'Luna', ...over }); registerPerson(f); if (test(tastes({ id: f.id, p: f }))) { f.first = `Fan${++n}`; st.crew.push(f.id); return f; } } return null; };
    const wanted = new Set([...airing(day).slice(0, 2).map(x => x.genre), ...newBooks(day).slice(0, 2).map(x => x.genre), ...broadcastsOn(day).map(x => x.genre)]);
    const live = LEAGUES.find(l => ['regular', 'playoffs', 'final'].includes(leaguePhase(l, day))), liveTeams = new Set(live ? live.teams : []);
    if (mode !== 'fans') {  // nobody aboard shares what is on, so the few that follow are the only ones
      st.crew = st.crew.filter(id => { const t = tastes({ id, p: st.people[id] }); return !wanted.has(t.genre) && !liveTeams.has(t.team); });
      if (!st.crew.length) fan(t => !wanted.has(t.genre) && !liveTeams.has(t.team), { culture: 'mars' });
    }
    for (const g of wanted) for (const culture of ['earth', 'belt']) if (mode !== 'none' && (mode === 'fans' || culture === 'earth')) fan(t => t.genre === g, { culture, traits: mode === 'few' ? ['rude', 'brave'] : ['kind', 'brave'] });
    if (live && mode !== 'none') for (const team of live.teams.slice(0, 2)) for (let k = 0; k < (mode === 'few' ? 1 : 2); k++) fan(t => t.team === team, { culture: TEAMS[team], traits: mode === 'few' ? ['rude', 'brave'] : ['kind', 'brave'] });
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit(); G.transit.times = [];  // in a burn, where the crew spend their downtime
    st.day = day;
    return G.state;
  };
  // days across the year, and the one day of each league's final (and the day after it, when the champions are crowned)
  const finals = [];
  const quiet = [];  // and the first day of a regular season and a day of the off-season, with no season played yet: a table with no wins, and no champion
  for (const l of LEAGUES) for (let d = 600; d < 980; d++) { if (leaguePhase(l, d) === 'final') { finals.push(d, d + 1); } if (leaguePhase(l, d) === 'regular' && leaguePhase(l, d - 1) === 'preseason') quiet.push(d); if (leaguePhase(l, d) === 'off-season' && leaguePhase(l, d - 1) === 'final') quiet.push(d + 3); }
  const castDays = [];  // two days with a one-off broadcast on
  for (let d = 600; d < 980 && castDays.length < 2; d++) if (broadcastsOn(d).length) { castDays.push(d); d += 30; }
  const DAYS = [...Array.from({ length: 31 }, (_, i) => 600 + i * 12), ...castDays, ...finals, ...quiet.map(d => -d)];  // a negative day is one with no seasons played
  const activities = (prefix, snap, seeds = [1, 2, 3]) => {
    const again = seed => { G.state = JSON.parse(snap); G.nextEvent = null; G.dialog = null; __seed(seed); };
    again(1); const on = onNow();
    on.forEach((act, i) => {
      note(`${prefix}:${i}:label`, typeof act.label === 'function' ? act.label() : act.label);
      for (const seed of seeds) { again(seed); const acts = onNow(); note(`${prefix}:${i}:run:${seed}`, acts[i].run()); }
    });
  };
  for (const day0 of DAYS) {
    const day = Math.abs(day0), noSeasons = day0 < 0;
    if (window.__only && !new RegExp(window.__only).test(String(day0))) continue;
    const st = start(day, noSeasons), snap = JSON.stringify(G.state);
    const again = seed => { G.state = JSON.parse(snap); G.nextEvent = null; G.dialog = null; __seed(seed); };
    for (let seed = 1; seed <= 40; seed++) { again(seed * 1000 + day); note(`feed:${day}:${seed}`, feedLine()); }
    again(1); note(`headlines:${day}`, feedHeadlines().join(' | '));
    if (DAYS.indexOf(day0) % 2 === 0) { again(1); cultureDay(); cultureDay(); note(`crewtalk:${day}`, socialLines().join(' | ')); }
    again(1); note(`bonds:${day}`, bondsHtml());
    // the activities on offer, with fans among the crew (and on every third day with one fan, and with none)
    activities(`on:${day0}`, snap);
    if (DAYS.indexOf(day0) % 6 === 0 || castDays.includes(day0)) for (const mode of ['few', 'none']) { start(day, noSeasons, mode); activities(`on${mode}:${day0}`, JSON.stringify(G.state), mode === 'few' ? [1, 2, 3, 4, 5, 6, 7, 8] : [1, 2, 3]); }
  }
  // a war, and dock gossip about someone you know, on one day
  { const st = start(700), snap = JSON.stringify(G.state);
    G.state.factions = { prosperity: {}, tension: {}, war: { a: 'Mars', b: 'Belt' } }; const withWar = JSON.stringify(G.state);
    for (let seed = 1; seed <= 200; seed++) { G.state = JSON.parse(withWar); __seed(seed * 7919); note(`feed:war:${seed}`, feedLine()); }
    G.state = JSON.parse(snap);
    const p = makeCrewCandidate(G.state.systemId); Object.assign(p, { first: 'Pia', last: 'Rowe', location: 'Mars', opinion: OPINION.TRUSTED, memories: ['Day 3: You lent me a coat.'] }); registerPerson(p); const gossip = JSON.stringify(G.state);
    for (let seed = 1; seed <= 200; seed++) { G.state = JSON.parse(gossip); __seed(seed * 7919); note(`feed:gossip:${seed}`, feedLine()); }
  }
  // the card night, won and lost, and the words for a bond
  { start(700); const snap = JSON.stringify(G.state);
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) { G.state = JSON.parse(snap); __seed(seed); note(`cards:${seed}`, SOCIAL_ACTIVITIES.cards.run()); }
    for (const n of [-8, -4, -2, -0.5, 0, 0.5, 1.5, 4, 7]) note(`bondword:${n}`, bondWord(n)); }
  note('cards:label', SOCIAL_ACTIVITIES.cards.label());
  Math.random = real;
  if (raw) return out;
  const seen = new Set();  // a line that came up again as the same words (a feed line on another day, the same activity, the same page) adds nothing to the pin
  return out.filter(r => { const k = `${r.key.replace(/:-?\d+/g, ':#')}|${r.text}`; if (seen.has(k)) return false; seen.add(k); return true; });
};

module.exports = { playFeeds };
