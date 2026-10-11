'use strict';

// Plays the rest of the found-family scenes of js/family.js for the pin (homepin.test.js) and the text layer's tests (#457): the birthday, good and bad news, the traditions, the touches, the cat,
// the offer to stay, the chatter, the line of the epilogue and the favor's return. Not a test file. playHome runs in the page: each case builds the scene for a shipmate in some state, and
// returns its title, text and labels and, for each choice, the line it gives and what it changed, over several dice.
const playHome = () => {
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  __seed(1);
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' });
  while (G.dialog) finishEvent();
  let st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 20000;
  st.systemId = 'ceres'; st.planet = 'Ceres Station'; landAt(currentPlanet(), []); while (G.dialog) finishEvent();
  const mk = (first, over = {}) => { const p = makePerson('mars'); Object.assign(p, { first, last: 'Vale', home: 'Mars', traits: ['kind', 'brave'], secret: null, opinion: 0, memories: [], role: 'engineer', skill: 1 }, over); delete p.story; registerPerson(p); return p; };
  const base = mk('Sam'), ana = mk('Ana', { role: 'pilot' }), ben = mk('Ben', { role: 'gunner' });
  st.crew = [base.id, ana.id, ben.id];
  const snap = JSON.stringify(G.state), PID = base.id, AID = ana.id;
  const seen = (p, s) => ({ op: p.opinion, mem: p.memories.slice(-1)[0] || null, until: p.mood ? p.mood.until - s.day : null, credits: s.credits, luxury: (s.cargo || {}).luxury || 0, crew: s.crew.length, bonds: s.bonds || null, log: s.home ? s.home.log.map(l => l.text) : null, traditions: s.home ? s.home.traditions : null, cat: s.home ? s.home.cat : null, role: p.role, wage: p.wage || 0, ana: s.people[AID].opinion });
  const play = (key, setup, build, dice = 4) => {
    const fresh = () => { G.state = JSON.parse(snap); st = G.state; const p = st.people[PID]; setup(p, st); return p; };
    __seed(7); const p0 = fresh(), ev0 = build(p0);
    const rec = { title: ev0.title, text: ev0.text, labels: ev0.choices.map(c => String(c.label)), runs: [] };
    for (let i = 0; i < ev0.choices.length; i++) for (let d = 1; d <= dice; d++) {
      __seed(d * 31 + i); const p = fresh(), ev = build(p); st.credits = 20000; st.cargo = st.cargo || {}; st.cargo.luxury = 3; G.shifts = null;
      const line = ev.choices[i].run(); rec.runs.push([i, d, String(line), seen(p, st)]);
    }
    out.push({ key, text: JSON.stringify(rec) });
  };
  const note = (key, v) => out.push({ key, text: JSON.stringify(v) });
  const reset = () => { G.state = JSON.parse(snap); st = G.state; return st.people[PID]; };
  // the birthday, over the dice that pick how they act about it
  play('birthday', () => {}, p => occasionEvent({ kind: 'birthday', id: p.id, day: st.day + 3 }), 8);
  // news from home: good (eight ways in) and bad (eight ways in; with a shipmate who will look in, and without one)
  const withNews = good => (p, s) => { p.news = { good, text: good ? 'their sister got into the academy' : 'their father is sick' }; p.mood = { kind: good ? 'high' : 'low', until: s.day + 20, text: p.news.text }; };
  play('news:good', withNews(true), p => newsEvent(p), 12);
  play('news:bad', (p, s) => { withNews(false)(p, s); for (let i = 0; i < 4; i++) addBond({ id: p.id, p }, { id: AID, p: s.people[AID] }, 2); }, p => newsEvent(p), 12);
  play('news:bad:alone', withNews(false), p => newsEvent(p), 12);
  // the traditions: each is proposed in turn; the line it gives later in a burn
  Object.keys(TRADITIONS).forEach((id, i) => {
    play(`tradition:${id}`, (p, s) => { home().proposed = Object.keys(TRADITIONS).slice(0, i); }, () => traditionEvent(), 3);
    for (let d = 1; d <= 6; d++) { __seed(60 + d); note(`tradition:${id}:line:${d}`, [TRADITIONS[id].name, TRADITIONS[id].moment, TRADITIONS[id].line()]); }
  });
  // the touches: each one for a shipmate
  { const p = reset(); TOUCHES.forEach((t, i) => { __seed(80 + i); note(`touch:${i}`, t({ id: p.id, p })); }); }
  // the cat: the three names it can have, and the dock
  play('cat', () => {}, () => catEvent(), 6);
  // the offer to stay, for a role given and for a job
  for (const role of ['engineer', 'medic']) play(`join:${role}`, p => { p.role = role; }, p => joinEvent(p), 3);
  for (const job of ['nurse', 'welder', 'sales', 'miner', 'journalist']) play(`join:job:${job}`, p => { p.role = null; p.job = job; }, p => joinEvent(p), 2);
  { const p = reset(); p.role = null; p.job = 'busker'; __seed(90); note('join:other', [joinEvent(p).text.slice(-160)]); }
  // the chatter, with a shipmate down, a shipmate up, a cat and the touches, once the dice allow it
  { const p = reset(), s = G.state; p.mood = { kind: 'low', until: s.day + 20, text: 'x' }; s.people[AID].mood = { kind: 'high', until: s.day + 20, text: 'y' }; home().cat = 'Rivet'; home().touches = ['Sam hung a pennant in the galley'];
    for (const id of s.crew) storyOf(s.people[id]);  // their stories are rolled first, so that the dice below are the filter's
    const fam = Mods.hooks.chatter.find(h => h.mod.id === 'family').fn;  // this mod's own filter, not the others' on the same pool
    seq([0.1]); note('chatter:all', fam(['pool'])); Math.random = real; seq([0.9]); note('chatter:pool', fam(['pool'])); Math.random = real; }
  // the line for the epilogue, with nothing and with a cat and two traditions
  { reset(); note('homeLine:bare', homeLine()); home().cat = 'Rivet'; home().traditions = ['flip-toast', 'first-meal']; note('homeLine:full', homeLine()); }
  // the favor's return: a shipmate goes ashore to see their family
  { const p = reset(); storyOf(p); G.messages = []; Mods.emit('missionDone', { favorPid: p.id }); note('favor:done', [G.messages.map(m => m.text), p.loyal, home().log.map(l => l.text)]); }
  // a letter, what it says to the player in the note and in the log of the port
  { const p = reset(); const s = G.state; storyOf(p); s.crew = [p.id]; s.letterAt = undefined; p.letterDay = undefined; seq([0.1, 0.1, 0.5]); note('letter:note', letters(currentPlanet())); Math.random = real; }
  // a birthday with nothing in the hold to give: the reason the gift is shut
  { const p = reset(); G.state.cargo.luxury = 0; const ev = occasionEvent({ kind: 'birthday', id: p.id, day: G.state.day + 3 }); note('birthday:gate', [ev.choices[1].can(), ev.choices[1].why()]); }
  // the touches a crew member adds to the ship in a burn, with the line it makes on the comms
  { const p = reset(), s = G.state; for (const id of s.crew) storyOf(s.people[id]); G.transit = G.transit || { comms: [], days: 3 }; const lines = [], was = window.comm; window.comm = t => lines.push(t);
    seq([0.1, 0.1, 0.5, 0.1, 0.9, 0.1, 0.3]); addTouches(); Math.random = real; window.comm = was; note('touches:add', [lines, home().touches]); }
  // every way a pick can go, by forcing the dice: the way they act on a birthday, the openings of the news, and what the choices give back
  const forceBuild = (key, setup, n, build) => { for (let k = 0; k < n; k++) { const p = reset(); setup(p, G.state); seq([(k + 0.5) / n]); const ev = build(p); Math.random = real; note(`${key}:${k}`, ev.text); } };
  const forceRun = (key, setup, n, build, i) => { for (let k = 0; k < n; k++) { const p = reset(); setup(p, G.state); const ev = build(p); G.state.credits = 20000; seq([(k + 0.5) / n]); const line = ev.choices[i].run(); Math.random = real; note(`${key}:${i}:${k}`, line); } };
  forceBuild('force:birthday', () => {}, 4, p => occasionEvent({ kind: 'birthday', id: p.id, day: st.day + 3 }));
  forceBuild('force:good:open', withNews(true), 8, p => newsEvent(p));
  forceBuild('force:bad:open', withNews(false), 8, p => newsEvent(p));
  for (const i of [0, 1]) forceRun('force:good', withNews(true), 3, p => newsEvent(p), i);
  for (const i of [0, 1, 2]) forceRun('force:bad', withNews(false), 3, p => newsEvent(p), i === 2 ? 2 : i);
  { const bonded = (p, s) => { withNews(false)(p, s); for (let i = 0; i < 4; i++) addBond({ id: p.id, p }, { id: AID, p: s.people[AID] }, 2); }; forceRun('force:bad:friend', bonded, 3, p => newsEvent(p), 2); }
  return out;
};

module.exports = { playHome };
