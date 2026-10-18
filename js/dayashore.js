'use strict';

// A day ashore (#675): the hand's own hour at a port. A stay at a dock has no clock of its own: the burn has its downtime menu (shiplife.js), the dock had nothing, so the Port page has a
// button for one hour a landing and a menu of five, mixed from three lanes as the burn's is: the port's own (the regulars' table, a walk that reads the port), the hand's (an errand with a
// crew member who asks, the room when its return was put off) and what is on (the match, the broadcast, the show at the bar). The five turn with the day; "Not now" is last and spends
// nothing. Taking one takes no game day (the days are the captain's) but shuts the button until the next landing: st.dayAshore = { used }. The words are the lines of scene:day-ashore
// (hiredscenes.js); the regulars' scene, the errand and the room's return are the ones that stand already. The turn (menuFive, shiplife.js) takes the lanes and the day, so it runs in plain Node
// (tests/dayashore.test.js). The hand's: an owner has no hour here (#575). Loaded after chaptertwo.js; only called into at runtime.

const ashoreOpen = st => !(st.dayAshore && st.dayAshore.used);
// What a walk through the port reads of it: the talk if there is a rumor about it, else its yard, else its market (every port has one or the other).
const walkKind = (planet, rumored) => (rumored ? 'rumor' : planet.services.includes('shipyard') ? 'yard' : 'market');

const daySay = (key, vars) => sceneSay('scene:day-ashore', key, vars);

// The three lanes as they stand at this port today: arrays of { label, run }, where run returns the line (or queues a scene and returns nothing).
function ashoreLanes() {
  const st = G.state, planet = currentPlanet(), day = st.day, v = { port: planet.name, bar: barOf(planet).name };
  const regular = G.barState && G.barState.planet === planet.name ? (G.patrons || []).find(x => x.regular) : null;
  const rumored = (st.rumors || []).some(x => x.planet === planet.name && x.until >= day);
  const port = [
    ...(regular ? [{ label: daySay('table.label', v), run() { G.nextEvent = talkEvent(regular); return ''; } }] : []),
    { label: daySay('walk.label', v), run: () => daySay(`walk.${walkKind(planet, rumored)}`, v) },
  ];
  const mate = errandDue(st), keeper = st.room && roomDue(st.room, planet.name, day) ? st.people[st.room.pid] : null;
  const hand = [
    ...(mate ? [{ label: daySay('errand.label', { n: mate.first }), run() { mate.errandAt = day; G.nextEvent = errandEvent(mate); return ''; } }] : []),
    ...(keeper ? [{ label: daySay('room.label', v), run() { G.nextEvent = roomReturn(keeper); return ''; } }] : []),
  ];
  const match = matchNight(), cast = broadcastsOn(day)[0], show = airing(day)[0];
  const now = [
    ...(match ? [{ label: daySay('match.label', { league: match.league.name }), run: () => match.text }] : []),
    ...(cast ? [{ label: daySay('broadcast.label', { title: cast.title }), run: () => daySay('broadcast.result', { title: cast.title, blurb: cast.blurb }) }] : []),
    ...(show ? [{ label: daySay('show.label', { title: show.title }), run: () => daySay('show.result', { title: show.title, genre: GENRES[show.genre], when: daySay(show.premiere ? 'show.when.premiere' : show.finale ? 'show.when.finale' : 'show.when', { ep: show.ep }) }) }] : []),
  ];
  return [port, hand, now];
}

// The menu. `all` lists every entry instead of five (for tests and the like).
function dayAshoreEvent(all) {
  const st = G.state, lanes = ashoreLanes();
  return {
    title: daySay('title'), personal: true,
    text: daySay('text', { port: currentPlanet().name }),
    choices: [
      ...(all ? lanes.flat() : menuFive(lanes, st.day)).map(a => ({ label: a.label, run() { st.dayAshore = { used: true }; return a.run(); } })),
      { label: daySay('none.label'), run: () => daySay('none.result') },
    ],
  };
}

// The Port page's button, open once a landing.
function dayAshoreHtml() {
  const st = G.state, open = ashoreOpen(st);
  if (!hired() || G.mode !== 'landed') return '';
  return String(h`<div class="row"><button data-action="dayAshore" ${open ? '' : 'disabled'}>${daySay('button')}</button> <span class="hint">${daySay(open ? 'hint.open' : 'hint.spent')}</span></div>`);
}

Mods.register({
  id: 'dayashore', name: 'A day ashore', builtin: true,
  init(M) {
    M.on('landed', () => { if (hired()) G.state.dayAshore = { used: false }; });
    M.action('dayAshore', () => { const st = G.state; if (hired() && !G.dialog && G.mode === 'landed' && ashoreOpen(st)) openEvent(dayAshoreEvent()); });
  },
});
