'use strict';

// The crew ashore (#673). At a port the crew go their own ways, and two things say so. When a burn begins, one comms line says where one of
// them went at the port just left, by their first trait (ASHORE_LINES, lines:ashore), the crew member and the line chosen by the day and
// not the dice. And now and then, at a landing or a night in port, a crew member who thinks well of you (OPINION.FRIEND) asks you along on
// an errand of their own: by their culture (the wall office, the dome office, the water office), or the clinic when they are hurt
// (family:errand in peopletext.js, built here and listed with the family scenes). One choice; going along is remembered. The errand is a
// happenings candidate, so it takes its turn with the dock's own scenes: not the same person inside ERRAND_GAP days, and only on the days
// the person's hash picks (one in ERRAND_EVERY), so a landing's dice stay as they were. Loaded after revisit.js; only calls into the game at runtime.

const ERRAND_GAP = 30, ERRAND_EVERY = 4;
const ASHORE_LINES = {  // lines:ashore, by the crew member's first trait: {n} and {port}
  talkative: ['{n} came back from {port} with three new stories and told all of them before the ramp was up.', '{n} found the one bar on {port} where nobody knew them, and fixed that.'],
  nervous: ['{n} went no further than the end of the dock at {port}, and counted the hatches back.', '{n} came back from {port} early and checked the seals on the lock twice.'],
  generous: ['{n} came back from {port} with a bag of fruit for the galley and no change.', '{n} spent the stop at {port} buying rounds for a table of strangers, and came back broke and pleased.'],
  greedy: ['{n} came back from {port} with a price list and a plan.', '{n} walked the whole market at {port} and bought nothing, and can tell you what everything cost.'],
  pious: ['{n} found the chapel hour at {port} and kept it.', '{n} came back from {port} quiet, and said the station has a good bell.'],
  rude: ['{n} has a list of what is wrong with {port}, and it is long, and you will hear it.', '{n} came back from {port} with a complaint about the dock master, lodged in person.'],
  curious: ['{n} got as far down into {port} as the pump rooms before someone asked for a pass.', '{n} spent the stop at {port} reading the station\'s notices, all of them.'],
  drunk: ['{n} came back from {port} late, singing, and sober enough to be sorry about the singing.', '{n} knows the bar at {port} by its first name now.'],
  secretive: ['{n} went into {port} alone and came back alone and said it was fine.', '{n} was seen at {port} talking to someone, and will not say who.'],
  kind: ['{n} came back from {port} with a cheap tube for the galley light that hums.', '{n} spent the stop at {port} walking a stranger to the clinic, and said nothing about it.'],
  brave: ['{n} came back from {port} with a bruise and a story that is a ten-minute job to tell.', '{n} went out on the hull at {port} to look at the plate, because nobody else would.'],
  homesick: ['{n} sent a message home from {port} and waited an hour by the booth for the answer.', '{n} bought bread at {port} that is almost the bread from home, and said so, twice.'],
};
const ashoreLines = () => linedText('lines:ashore', ASHORE_LINES);

// The line at a burn's start: which crew member, and which of their lines, by the day.
function ashoreLine(st, port) {
  const crew = procedural().map(f => f.p).filter(p => p.traits && ASHORE_LINES[p.traits[0]]);
  if (!crew.length) return null;
  const p = crew[st.day % crew.length], pool = ashoreLines()[p.traits[0]];
  return fillLine(pool[st.day % pool.length], { n: p.first, port });
}

// Who has an errand here: a crew member with the regard, not asked inside the gap, on a day their hash picks.
function errandDue(st) {
  const f = procedural().find(x => x.p.opinion >= OPINION.FRIEND && st.day - (x.p.errandAt || -ERRAND_GAP) >= ERRAND_GAP && (st.day + Math.abs(hash(x.id))) % ERRAND_EVERY === 0);
  return f ? f.p : null;
}
const errandKind = p => ((G.state.injured || {})[p.id] ? 'clinic' : cultureOfPerson(p));
// A culture has three errands, taken by the day (#777); the clinic, which plays only when someone is hurt, has one.
function errandEvent(p, kind = errandKind(p)) {
  const say = familySay('errand'), v = { n: p.first, port: G.state.planet, home: p.home }, e = kind === 'clinic' ? kind : tellingOn(kind, G.state.day);
  return { title: say('title', v), text: say(`${e}.text`, v), choices: [
    { label: say(`${e}.go.label`, v), run() { like(p, 1, say(`${e}.go.memory`, v)); return say(`${e}.go.result.${pick([0, 1])}`, v); } },
    { label: say('stay.label', v), run: () => say(`${e}.stay.result`, v) },
  ] };
}
FAMILY_SCENES.errand = p => errandEvent(p);  // with the family scenes, for the editor and the lines tests

Mods.register({
  id: 'ashore', name: 'The crew ashore', builtin: true,
  init(M) {
    M.on('frame', () => {
      const t = G.transit;
      if (G.mode !== 'transit' || !t || t.ashoreTold) return;
      t.ashoreTold = true;
      const line = ashoreLine(G.state, G.state.planet);  // the port just left: the planet changes at the next landing
      if (line) comm(`[Ship] ${line}`);
    });
    M.filter('happenings', (list, where) => {
      if (where !== 'port' || G.dialog || G.nextEvent) return list;  // an errand takes a landing's turn only when nothing else is up, so it does not stack (#788)
      const p = errandDue(G.state);
      return p ? list.concat([{ tier: 2, weight: 1, via: 'crew', errand: true, make() { p.errandAt = G.state.day; return errandEvent(p); } }]) : list;
    });
  },
});
