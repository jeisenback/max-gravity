'use strict';

// Plays the "With {name}" scenes of js/family.js for the pin (talkpin.test.js) and the text layer's tests (#457): the talk topics, the idle talk, the three sittings of a story, the
// favor at the end of it, and the picker. Not a test file. playTalk runs in the page: each case builds the scene for a shipmate in some state, and returns its title, text and labels and,
// for each choice, the line it gives and what it changed (regard, memory, mood, the story's place, credits, the missions), over several dice.
const playTalk = () => {
  const out = [];
  const seq = list => { const l = [...list], real = Math.random; Math.random = () => (l.length ? l.shift() : real()); };  // force the next draws, then the seeded dice
  __seed(1);
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' });
  while (G.dialog) finishEvent();
  let st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 20000;
  st.systemId = 'ceres'; st.planet = 'Ceres Station'; landAt(currentPlanet(), []); while (G.dialog) finishEvent();
  const mk = (first, over = {}) => { const p = makePerson('mars'); Object.assign(p, { first, last: 'Vale', home: 'Mars', traits: ['kind', 'brave'], secret: null, opinion: 0, memories: [], role: 'engineer', skill: 1 }, over); delete p.story; registerPerson(p); return p; };
  const base = mk('Sam'); st.crew = [base.id];
  const snap = JSON.stringify(G.state), PID = base.id;
  const seen = (p, s) => ({ op: p.opinion, mem: p.memories.slice(-1)[0] || null, until: p.mood ? p.mood.until - s.day : null, beat: p.story ? p.story.beat : null, promised: p.story ? !!p.story.promised : null, loyal: !!p.loyal, credits: s.credits, missions: s.missions.map(m => m.title), pressed: p.pressed || null, log: s.home ? s.home.log.map(l => l.text) : null });
  // one case: `setup` shapes the shipmate and the game, `build` makes the scene
  const play = (key, setup, build, dice = 4) => {
    const fresh = () => { G.state = JSON.parse(snap); st = G.state; const p = st.people[PID]; setup(p, st); return p; };
    __seed(7); const p0 = fresh(), ev0 = build(p0);
    const rec = { title: ev0.title, text: ev0.text, labels: ev0.choices.map(c => String(c.label)), opens: new Set(), runs: [] };  // opens: the other openings the dice play
    for (let i = 0; i < ev0.choices.length; i++) for (let d = 1; d <= dice; d++) {
      __seed(d * 31 + i); const p = fresh(); seq(Array(8).fill((d - 0.5) / dice)); const ev = build(p); st.credits = 20000; st.cargo = st.cargo || {}; st.cargo.luxury = 3;  // the d-th die picks the d-th of n openings and results, so every variant is played
      const line = ev.choices[i].run(); G.nextEvent = null; rec.runs.push([i, d, String(line), seen(p, st)]); if (ev.text !== ev0.text) rec.opens.add(ev.text);  // the second beat a sitting queues is played below, by subject
    }
    rec.opens = [...rec.opens].sort();
    out.push({ key, text: JSON.stringify(rec) });
  };
  const thisWar = (aff, foe) => { window.tiesOf = () => ({ aff }); window.factionState = () => ({ war: { a: aff, b: foe } }); };
  const realTies = window.tiesOf, realWar = window.factionState;
  const calm = () => { window.tiesOf = realTies; window.factionState = realWar; };
  const topic = pick => p => ({ title: 'x', ...(talkTopics(p).find(pick) || talkTopics(p)[0]) });
  const asEvent = t => ({ title: t.title || 'With Sam', text: t.open, choices: t.choices });  // the topics have a title of their own once their words are lines
  const first = p => asEvent(talkTopics(p)[0]);
  // the topics, each on its own: a hard time (with a message and without), an injury, the war, a rift, a friend, a memory
  play('talk:low:news', (p, s) => { p.mood = { kind: 'low', until: s.day + 40, text: 'their mother is ill' }; }, first);
  play('talk:low:plain', (p, s) => { p.mood = { kind: 'low', until: s.day + 40, text: '' }; }, first);
  play('talk:hurt', (p, s) => { s.injured = { [p.id]: true }; }, first);
  thisWar('Mars Republic', 'Arcology Compact');
  play('talk:war', () => {}, first);
  play('talk:war:other', () => { thisWar('Arcology Compact', 'Mars Republic'); }, first);
  calm();
  play('talk:rift', (p, s) => { const o = mk('Ana'); s.crew.push(o.id); addBond({ id: p.id, p }, { id: o.id, p: o }, -4); }, first);
  play('talk:friend', (p, s) => { const o = mk('Ben'); s.crew.push(o.id); for (let i = 0; i < 12; i++) addBond({ id: p.id, p }, { id: o.id, p: o }, 4); }, first);
  play('talk:memory', p => { p.memories = ['Day 3: You sat with me when it was hard.']; }, first);
  play('talk:memory:dated', p => { p.memories = ['12 Mar 2214: You asked how I was.']; }, first);
  // nothing on their mind: the idle talk, for a few traits, and for none
  play('idle:none', p => { p.traits = []; }, p => ordinaryTalk(p), 6);
  play('idle:two', p => { p.traits = ['pious', 'curious']; }, p => ordinaryTalk(p), 6);
  // the talk going on, by subject: the next port, the ship, their last ship, their post (crew) and the captain (a hand's ship, played as one here)
  for (const k of ['port', 'ship', 'last', 'work']) play(`goeson:${k}`, () => {}, p => goesOn(p, k));
  play('goeson:captain', (p, s) => { const c = mk('Vance'); s.hired = { captain: c.id, post: 'gunner', since: s.day }; }, p => goesOn(p, 'captain'));  // a hand's subject: the captain is a person aboard, whose regard the offer costs
  play('goeson:drawn', p => { p.turn = 'ship'; }, p => goesOn(p), 6);  // drawn: never the subject of the last sitting
  // the offer before the flip: its label, and the downtime after the flip spent; after the flip (no burn here) the watch is owed and stood when the next burn begins
  { G.state = JSON.parse(snap); st = G.state; const p = st.people[PID]; const rec = {};
    for (const k of ['port', 'ship', 'last', 'work']) { G.transit = { to: 'pallas', flipped: false, lifeUsed: {} }; __seed(9); const e = goesOn(p, k); e.choices[0].run(); rec[k] = [String(e.choices[0].label), G.transit.lifeUsed]; }
    G.transit = null; st.watchOwed = { n: 'Sam' }; const t = { lifeUsed: {} }; rec.stood = [standOwedWatch(st, t), t.lifeUsed, st.watchOwed, standOwedWatch(st, t)];
    out.push({ key: 'goeson:offer', text: JSON.stringify(rec) }); }
  { G.state = JSON.parse(snap); st = G.state; const p = st.people[PID]; p.traits = []; __seed(5); const e = sitBeat(p, true); G.nextEvent = null; e.choices[0].run(); out.push({ key: 'leadon', text: JSON.stringify([G.nextEvent && G.nextEvent.title, G.nextEvent && G.nextEvent.choices.length, p.turn]) }); G.nextEvent = null; }
  // the story: the pressing topic first (once), the polite sitting, the three sittings, and the favor
  play('sit:pressed', (p, s) => { p.mood = { kind: 'low', until: s.day + 40, text: 'the rent is due' }; }, p => sitBeat(p, true));
  play('sit:pressed:again', (p, s) => { p.mood = { kind: 'low', until: s.day + 40, text: 'the rent is due' }; p.pressed = 'mood:the rent is due'; storyOf(p); }, p => sitBeat(p, true));
  play('sit:polite', p => { storyOf(p).beat = 2; p.opinion = 0; }, p => sitBeat(p, true));
  for (const c of ['belt', 'mars', 'earth']) play(`sit:0:${c}`, p => { p.culture = c; storyOf(p); }, p => sitBeat(p, true));
  play('sit:1', p => { storyOf(p).beat = 1; }, p => sitBeat(p, true));
  play('sit:2', p => { storyOf(p).beat = 2; p.opinion = 2; }, p => sitBeat(p, true));
  play('sit:3:crew:visit', p => { const s = storyOf(p); s.beat = 3; s.favor = 'visit'; p.opinion = 3; }, p => sitBeat(p, true));
  play('sit:3:crew:debt', p => { const s = storyOf(p); s.beat = 3; s.favor = 'debt'; s.debt = 1500; p.opinion = 3; }, p => sitBeat(p, true));
  play('sit:3:passenger', p => { const s = storyOf(p); s.beat = 3; s.favor = 'debt'; s.debt = 1500; p.opinion = 3; }, p => sitBeat(p, false), 6);
  // the visit home: the lock, then the table, by culture (the first choice of the lock leads straight on: no line)
  play('visit', p => { storyOf(p); }, p => visitEvent(p));
  for (const c of ['belt', 'mars', 'earth']) play(`visit-home:${c}`, p => { p.culture = c; storyOf(p); }, p => visitHome(p));
  // the room that is theirs: the offer at the end of the visit, and the return by the gap and the count of stays
  play('room-offer', p => { storyOf(p); }, p => roomOffer(p), 2);
  for (const [name, gap, visits] of [['few', 5, 0], ['month', 40, 1], ['long', 200, 3]]) play(`room-return:${name}`, (p, s) => { storyOf(p); s.room = { planet: p.home, pid: p.id, since: s.day - gap - 10, last: s.day - gap, visits }; }, p => roomReturn(p), 2);
  // an errand ashore, by culture and the clinic when hurt
  for (const c of ['belt', 'mars', 'earth']) play(`errand:${c}`, p => { p.culture = c; }, p => errandEvent(p));
  play('errand:clinic', (p, s) => { s.injured = { [p.id]: true }; }, p => errandEvent(p));
  // who the visit is due for: the home, the regard, the gap, and a promise kept
  { G.state = JSON.parse(snap); st = G.state; const p = st.people[PID]; const rec = {};
    rec.away = visitDue(st, 'Ceres Station', null) && 'yes'; p.opinion = OPINION.TRUSTED; rec.cold = visitDue(st, 'Ceres Station', null) && 'yes'; rec.home = visitDue(st, 'Mars', null) === p;
    p.visitedAt = st.day - 10; rec.soon = visitDue(st, 'Mars', null) && 'yes'; p.visitedAt = st.day - 60; rec.again = visitDue(st, 'Mars', null) === p;
    p.opinion = 0; p.visitedAt = undefined; rec.favor = visitDue(st, 'Mars', p.id) === p;
    out.push({ key: 'visit:due', text: JSON.stringify(rec) }); }
  // the picker: who is aboard, how they are
  play('picker', (p, s) => { const o = mk('Ana', { role: 'pilot' }); s.crew.push(o.id); s.injured = { [o.id]: true }; p.mood = { kind: 'low', until: s.day + 40, text: 'x' }; }, p => sitPicker(), 1);
  play('picker:pax', (p, s) => { const o = mk('Pia'); s.missions.push({ type: 'passenger', id: s.nextId++, pid: o.id, who: 'Pia Vale', pax: 1, bonus: 0, destSystem: 'mars', destPlanet: 'Olympus Dome', title: 'Carry', pay: 100, deadline: s.day + 99 }); }, p => sitPicker(), 1);
  { __seed(3); const seenText = new Set(); for (let d = 0; d < 40; d++) { __seed(d); G.state = JSON.parse(snap); seenText.add(sitPicker().text); } out.push({ key: 'picker:texts', text: JSON.stringify([...seenText].sort()) }); }
  { G.state = JSON.parse(snap); st = G.state; const e = sitPicker(); const c = e.choices[0]; G.nextEvent = null; out.push({ key: 'picker:go', text: JSON.stringify([c.run(), G.nextEvent && G.nextEvent.title]) }); G.nextEvent = null; }  // nothing to show: the sitting opens at once
  return out;
};

module.exports = { playTalk };
