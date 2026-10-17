'use strict';

// One official at each dock who knows you (#674). The customs officer, dockmaster or tax collector of a port is a person in the registry, the
// same face every landing, with memory and regard like anyone you know (regulars.js is the model for a fixed person at a place). The dock
// scenes name them with {official} (storylets.js fill), move their regard with the `official` action (the `do` effect: n, and a memory in their
// words), and gate a choice on it with the `official` condition (a cutoff from OPINION). They are made when first named, from the port's
// culture, by a dice stream seeded from the port's name, so the game's own dice are not touched and the same port has the same official.
// Their title follows the port's government (OFFICIAL_TITLE). They keep off the bar's stools (bar.js). Loaded before storylets.js; only
// calls into the game at runtime.

const OFFICIAL_TITLE = { 'Arcology Compact': 'Officer', 'Dome Concord': 'Officer', 'Charter League': 'Dockmaster', Pirate: 'Collector', Independent: 'Dockmaster' };
const OFFICIAL_JOB = { Officer: 'customs officer', Dockmaster: 'dockmaster', Collector: 'tax collector' };

// A small dice stream of its own (mulberry32), so making the official draws nothing from the game's.
function seededRandom(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// A person of this port who holds a post there (an official, a freight agent), made at the first asking and the same every time after. `map` is the
// state field that keeps them by port, `tag` seeds their dice, `flag` marks them on the person (the bar keeps such people off its stools, bar.js).
function portPerson(planet, map, tag, flag, job, title) {
  const st = G.state, sid = st.systemId, ids = st[map] = st[map] || {};
  let p = ids[planet.name] && st.people[ids[planet.name]];
  if (p) return p;
  const real = Math.random;
  Math.random = seededRandom(Math.abs(hash(`${planet.name} ${tag}`)));
  try { p = makePerson(cultureOf(sid)); } finally { Math.random = real; }
  Object.assign(p, { job, [flag]: planet.name, location: planet.name, title });
  registerPerson(p);
  ids[planet.name] = p.id;
  return p;
}

// The official of this port, made at the first asking.
const dockOfficial = planet => { const title = OFFICIAL_TITLE[SYSTEMS[G.state.systemId].gov] || 'Dockmaster'; return portPerson(planet, 'officials', 'official', 'official', OFFICIAL_JOB[title], title); };
const officialName = planet => { const p = dockOfficial(planet); return `${p.title} ${p.last}`; };

Mods.register({
  id: 'official', name: 'The dock official', builtin: true,
  init(M) {
    // do: ['official', n, 'what they remember']: the port's official thinks more or less of you, and keeps the words.
    M.addAction('official', (n, memory) => { like(dockOfficial(currentPlanet()), n, memory || null); return ''; });
  },
});
