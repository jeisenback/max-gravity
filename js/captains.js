'use strict';

// The authored captains of the hired chapter. Each is one entry in CAPTAINS, assigned by its own file under js/captains/ and
// linked after this one. An entry has who they are (name, pronouns, culture, home, age, two traits, bio, what they want and
// fear), how they run a ship (captain stats trade, nerve and thrift from 1 to 5, wage and share, and `hears`, `bonus` and
// `talk`: how they take being challenged, and how often they turn up in the captain events), and `xo`, the key of their
// first officer. First officers are CAST entries (cast.js) marked xo and fragile, so they are people, scenes and fate the
// way the main characters are. A hired save with no `captainKey` keeps the generated captain it was made with.

const CAPTAINS = {};

const captainEntry = () => { const h = hired(); return (h && h.captainKey && CAPTAINS[h.captainKey]) || null; };
const pickCaptainKey = () => { const key = pick(Object.keys(CAPTAINS)); return scopeOff('captains') ? 'hester' : key; };  // still draws, so the random stream is the same in both builds

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
const CAPTAIN_BEAT_DAYS = { trouble: 15, secret: 40 };
const SECRET_TRUST = 2;
// A due scene is tier 1, because the picker draws only from the lowest tier present (happenings.js) and a tier 2 scene never
// competes with the news, the holidays and the ice occasions: as tier 2 with a ramp it waited up to 5 burns and, in 3 of 20 soak
// games, never played before the chapter ended. In tier 1 it plays within 2 burns. A scene that was not drawn also gains
// BEAT_RAMP weight for each draw it missed (h.beatWait), so a run of tier 1 scenes ahead of it cannot hold it back for long.
const BEAT_WEIGHT = 2, BEAT_RAMP = 3;
// The chapter's beats run in one order: the captain's trouble, their secret, then the used ship (hired.js dealCheck). The offer
// waits until both scenes have played and a run has been sailed since the secret, so the two never land together. A captain
// with no scenes does not hold it up.
// The chapter's spine (#294): why does every owner of the Ore Runner sell her? The hand sees her once, painted over on an apron (a note, hired.js
// `hullNote`), hears of the bank in the captain's secret (ownersDebt, set by the scene), and Tomas answers it when she is offered. The offer
// waits for the first, as it waits for the second. Without Tomas aboard the offer is the broker's, and there is no spine to wait for.
const spineSeen = h => !castAboard().some(c => c.cast === 'tomas') || !!(h.flags && h.flags.sawHull);
const captainBeatsDone = h => {
  const d = captainEntry();
  return !d || !d.scenes || ((h.beats || 0) >= CAPTAIN_BEATS.length && runTotals(h).runs - (h.beatRun || 0) >= 2 && spineSeen(h));
};
// A first officer with a walk-through (cato.js) takes a new hand round the ship on the first burn. That burn gets a happening more
// for it (transit.js), so the introductions that would have played then still do.
function walkPending() {
  const hand = hired(), xo = hand && hiredXo();
  return !!(xo && CAST[xo.cast].round && !hand.walked && runTotals(hand).runs === 0);
}
// The first raid of a new game: the first officer says what Position is, which choice is your own, and what a bad one costs, once
// (cast entry `firstRaid`). h.raidTold starts false in a new game (hired.js); a save from before has none, so it never plays.
function raidExplanation() {
  const h = hired(), xo = h && hiredXo();
  if (!(h && h.raidTold === false && xo && CAST[xo.cast].firstRaid)) return null;
  h.raidTold = true;
  return castScene(xo.cast, CAST[xo.cast].firstRaid);
}

// A choice that needs someone's regard (`opinion: { who, min }`, `who` being 'captain', 'xo' or a cast key; `min` a cutoff from OPINION):
// shown shut, with what it needs said in its label, until they stand at `min` or better. With nobody in that place (a first officer
// who is gone), the choice is not offered. openEvent (transit.js) runs every choice through this.
const OPINION_NEEDS = [[OPINION.TRUSTED, n => `${n}'s trust`], [OPINION.FRIEND, n => `${n}'s friendship`], [-Infinity, n => `${n} to listen`]];
function opinionOf(who) {
  return who === 'captain' ? hiredCaptain() : who === 'xo' ? hiredXo() : castAboard().find(p => p.cast === who) || null;
}
function opinionGate(c) {
  const p = opinionOf(c.opinion.who);
  if (!p) return null;
  const min = c.opinion.min, open = () => p.opinion >= min, need = OPINION_NEEDS.find(([m]) => min >= m)[1](esc(p.first));
  return { ...c, label: open() ? c.label : `${c.label} <span class="hint">(needs ${need})</span>`, can: () => open() && (!c.can || c.can()) };
}

// A choice marked `bold` (raid, ice run, a work event's quick option) moves the captain's opinion a little more by their nerve (the
// `captain.nerve` of their entry, 1 to 5): a bold success lifts a captain of nerve 4 or 5, and a bold failure costs more with a
// cautious one of nerve 1 or 2. Nerve 3, and a captain with no entry, change nothing. Opinion moves in whole points, so this is one point.
function boldWithCaptain(won) {
  const d = captainEntry(), cap = hiredCaptain(), nerve = d ? d.captain.nerve : 3;
  const n = won ? (nerve >= 4 ? 1 : 0) : (nerve <= 2 ? -1 : 0);
  if (n && cap) like(cap, n, won ? 'You took the bold line and it came off.' : 'You took the bold line and it did not.');
}

// A crew member's first name by role, or the job where nobody holds it (the walk-through and the first arrival name the crew).
const crewNamed = role => { const c = roleHolder(role); return c ? c.first : `the ${ROLE_NAMES[role].toLowerCase()}`; };

// The first arrival: settleRun (hired.js) keeps the first run's figures in h.first instead of the one-line note, and the first officer
// settles up at the port, opened by hired.js's own 'landed' handler (which runs before the others, so before any landing scene or station call). Their words are the cast entry's `arrival`: open, memory, column
// (the captain's name is {cap}), pace. An older save with runs behind it has no h.first, so it never plays.
const arrivalWanted = () => { const xo = hiredXo(); return !!(xo && CAST[xo.cast].arrival); };
function arrivalPending(planet) {
  const h = hired(), f = h && h.first;
  return !!(f && !h.arrived && planet && planet.name === f.planet && arrivalWanted());
}
function arrivalScene() {
  const h = hired(), f = h.first, xo = hiredXo(), a = CAST[xo.cast].arrival, cap = hiredCaptain(), say = s => s.replace(/\{cap\}/g, cap.first);
  const ledger = [
    f.good ? `${f.tons} t ${f.good}. Bought ${fmt(f.cost)}. Sold ${fmt(f.revenue)}. ${f.profit < 0 ? 'Loss' : 'Clear'} ${fmt(Math.abs(f.profit))}.${isFinite(f.forecast) ? ` Forecast, ${fmt(f.forecast)}.` : ''}` : 'No cargo this run.',
    `Your wage for ${f.days} days, ${fmt(f.wage)}. Your share, ${fmt(f.share)}.`,
    ...(f.hall ? [`Hall bond, ${Math.round(DEBT_SHARE * 100)} percent of your pay: ${fmt(f.hall)}. Still owed: ${fmt(f.owed)}.`] : []),
  ].join('<br>');
  const column = `Under the crew column, below ${crewNamed('engineer')} and ${crewNamed('pilot')}, ${f.profit > 0 ? `there is a line in ${cap.first}'s hand with your name on it.` : 'your line is empty.'} ${say(a.column)}`;
  const ashore = `"You are off until ${cap.first} has a plan. The Missions tab has day jobs on the station, and that pay is yours. Anything farther off, you put to the captain. The bar has people in it who are not crew."`;
  return {
    title: 'Settling Up', personal: true,
    text: [say(a.open), ledger, say(a.memory), column, ashore].join('</p><p>'),
    choices: [
      { label: 'Ask how long a ship takes', run: () => say(a.pace) },
      { label: 'Go ashore', run: () => `${xo.first} takes the book back up the ramp.` },
    ],
  };
}

function captainBeat() {
  const h = hired(), d = captainEntry();
  if (!h || !d || !d.scenes) return null;
  const name = CAPTAIN_BEATS[h.beats || 0];
  return name && d.scenes[name] && G.state.day - h.since >= CAPTAIN_BEAT_DAYS[name] ? name : null;
}
function captainScene(name) {
  const d = captainEntry(), sc = d.scenes[name], cap = hiredCaptain();
  const s = name === 'secret' ? (cap.opinion >= SECRET_TRUST ? sc.confide : sc.found) : sc;
  if (s.flag) captainFlag(s.flag);  // a fact the scene tells (the spine of the chapter, #294)
  return { title: s.title, text: s.text, personal: true, choices: s.choices };
}

// What the hand lived through, kept as flags where it happened (icerun.js, boarders.js, engagements.js) and read by the goodbye and the
// look back. In priority order: the goodbye shows at most two, in one paragraph, so it stays a scene; the look back names every one
// that is true. A bad ice run and a clean one replace each other (the last counts). A captain's own `goodbye` is untouched.
const GOODBYE_FACTS = [
  { id: 'iceBad', line: 'The ice run is in the book with a line struck through and a figure beside it.', recap: 'The ice run went badly.' },
  { id: 'iceClean', line: 'The ice run is in the log as a clean haul, and nothing is written beside it.', recap: 'The ice run came in clean.' },
  { id: 'hurt', line: 'Your name is in the medical log, with a date.', recap: 'You were hurt on duty.' },
  { id: 'raided', line: 'The raid is in the plot record, with the day and the range.', recap: 'You fought a raid.' },
  { id: 'debtCleared', line: 'The hall\'s bond is struck off the book, with the day it was paid.', recap: 'You paid off the hiring-hall bond.' },
];
const goodbyeFacts = flags => GOODBYE_FACTS.filter(f => flags[f.id]);

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
  const facts = goodbyeFacts(flags).slice(0, 2);
  if (facts.length) parts.push(facts.map(f => f.line).join(' '));
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
      // The first officer walks a new hand round the ship on the first burn: tier 0, so nothing is drawn before it.
      if (where === 'transit' && walkPending()) {
        const hand = hired(), xo = hiredXo();
        list = list.concat([{ tier: 0, weight: 1, via: 'crew', make() { hand.walked = true; return castScene(xo.cast, CAST[xo.cast].round()); } }]);
      }
      const name = where === 'transit' ? captainBeat() : null;
      if (!name) return list;
      const h = hired(), missed = h.beatWait || 0;
      h.beatWait = missed + 1;  // a miss unless make() runs and clears it
      return list.concat([{ tier: 1, weight: BEAT_WEIGHT + BEAT_RAMP * missed, via: 'crew', make() { h.beats = (h.beats || 0) + 1; h.beatRun = runTotals(h).runs; h.beatWait = 0; return captainScene(name); } }]);
    });
  },
});
