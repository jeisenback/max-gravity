'use strict';

// The authored captains of the hired chapter. Each is one entry in CAPTAINS, assigned by its own file under js/captains/ and
// linked after this one. An entry has who they are (name, pronouns, culture, home, age, two traits, bio, what they want and
// fear), how they run a ship (captain stats trade, nerve and thrift from 1 to 5, wage and share, and `hears`, `bonus` and
// `talk`: how they take being challenged, and how often they turn up in the captain events), and `xo`, the key of their
// first officer. First officers are CAST entries (cast.js) marked xo and fragile, so they are people, scenes and fate the
// way the main characters are. A hired save with no `captainKey` keeps the generated captain it was made with.

const CAPTAINS = {};

const captainEntry = () => { const h = hired(); return (h && h.captainKey && CAPTAINS[h.captainKey]) || null; };
const pickCaptainKey = () => pick(Object.keys(CAPTAINS));

// The captain's person record, built from the entry the way castPerson builds a main character's.
function captainPerson(key) {
  const d = CAPTAINS[key];
  return registerPerson({
    captainKey: key, first: d.first, last: d.last, culture: d.culture, home: d.home, job: 'captain', role: 'captain', age: d.age, bio: d.bio,
    traits: [...d.traits], goal: 'job', wealth: 2, secret: null, opinion: 0, memories: [], location: null, mood: null, captain: { ...d.captain },
  });
}

// ---------- what a captain does and says ----------
let leavingCaptain = null;  // the captain a goodbye is with: the hired game is over by the time its choice is made
const captainLike = (n, memory) => like(leavingCaptain || hiredCaptain(), n, memory);
const captainFlag = name => { const h = hired(); (h.flags = h.flags || {})[name] = true; };
const hiredPostName = () => POSTS[hired().post].name.toLowerCase();

// A captain's own wording for a shared event (hiredevents.js): events[id][part], or the generic text when they have none.
function captainSays(id, part, fallback) {
  const d = captainEntry(), t = d && d.events && d.events[id] && d.events[id][part];
  return typeof t === 'string' ? t.replace(/\{post\}/g, hiredPostName()) : fallback;
}

// Their two scenes, once each and in order, once the days since you signed on are up. They come through the happenings filter
// the main characters use. The second reads by trust: at SECRET_TRUST the captain confides, otherwise the hand finds out.
const CAPTAIN_BEATS = ['trouble', 'secret'];
const CAPTAIN_BEAT_DAYS = { trouble: 25, secret: 60 };
const SECRET_TRUST = 2;
function captainBeat() {
  const h = hired(), d = captainEntry();
  if (!h || !d || !d.scenes) return null;
  const name = CAPTAIN_BEATS[h.beats || 0];
  return name && d.scenes[name] && G.state.day - h.since >= CAPTAIN_BEAT_DAYS[name] ? name : null;
}
function captainScene(name) {
  const d = captainEntry(), sc = d.scenes[name], cap = hiredCaptain();
  const s = name === 'secret' ? (cap.opinion >= SECRET_TRUST ? sc.confide : sc.found) : sc;
  return { title: s.title, text: s.text, personal: true, choices: s.choices };
}

// How you leave: read before the ship is yours, because the crew and the captain's record go with the hired game. The parts are the
// entry's `goodbye`: an opening by how the captain feels about you, then a line for each of crew taken, the secret learned, the
// first officer (dead or alive), a repaid loan (`repaid` and `repay`, the credits), and a parting line. The choices set the captain's last opinion.
function captainGoodbye() {
  const d = captainEntry(), g = d && d.goodbye;
  if (!g) return null;
  const h = hired(), cap = hiredCaptain(), friends = buyInCompanions(), flags = { ...(h.flags || {}) };
  const warmth = cap.opinion >= OPINION.TRUSTED ? 'warm' : cap.opinion < 0 ? 'cold' : 'neutral';
  const parts = [g[warmth]];
  if (friends.length) parts.push(g.crew.replace('{names}', namesOf(friends)));
  if (flags.secretKnown) parts.push(g.secret);
  if (flags.lent && g.repaid) parts.push(g.repaid);
  if (castDead(d.xo)) parts.push(g.xoDead); else if (hiredXo() && g.xo) parts.push(g.xo);
  parts.push(g.parting);
  return {
    title: g.title, personal: true, text: parts.join('</p><p>'),
    choices: g.choices.filter(c => !c.can || c.can(flags)).map(c => ({ label: c.label, run() { leavingCaptain = cap; try { if (flags.lent) G.state.credits += g.repay || 0; return c.run(); } finally { leavingCaptain = null; } } })),
  };
}
// Each event hands on to the next: the last choice of one opens the one after.
function chainEvents(list) {
  list.forEach((ev, i) => { if (list[i + 1]) ev.choices = ev.choices.map(c => ({ ...c, run() { const r = c.run(); G.nextEvent = list[i + 1]; return r; } })); });
  return list[0];
}

Mods.register({
  id: 'captains', name: 'The captain\'s own scenes', builtin: true,
  init(M) {
    M.filter('happenings', (list, where) => {
      const name = where === 'transit' ? captainBeat() : null;
      if (!name) return list;
      return list.concat([{ tier: 2, weight: 2, via: 'crew', make() { hired().beats = (hired().beats || 0) + 1; return captainScene(name); } }]);
    });
  },
});
