'use strict';

// Plays the "With {name}" scenes of js/family.js for the pin (talkpin.test.js) and the text layer's tests (#457): the talk topics, the idle talk, the three sittings of a story, the
// favor at the end of it, and the picker. Not a test file. playTalk runs in the page: each case builds the scene for a shipmate in some state, and returns its title, text and labels and,
// for each choice, the line it gives and what it changed (regard, memory, mood, the story's place, credits, the missions), over several dice.
const playTalk = () => {
  const out = [];
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
    const rec = { title: ev0.title, text: ev0.text, labels: ev0.choices.map(c => String(c.label)), runs: [] };
    for (let i = 0; i < ev0.choices.length; i++) for (let d = 1; d <= dice; d++) {
      __seed(d * 31 + i); const p = fresh(), ev = build(p); st.credits = 20000; st.cargo = st.cargo || {}; st.cargo.luxury = 3;
      const line = ev.choices[i].run(); rec.runs.push([i, d, String(line), seen(p, st)]);
    }
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
  // the picker: who is aboard, how they are
  play('picker', (p, s) => { const o = mk('Ana', { role: 'pilot' }); s.crew.push(o.id); s.injured = { [o.id]: true }; p.mood = { kind: 'low', until: s.day + 40, text: 'x' }; }, p => sitPicker(), 1);
  { __seed(3); const seenText = new Set(); for (let d = 0; d < 40; d++) { __seed(d); G.state = JSON.parse(snap); seenText.add(sitPicker().text); } out.push({ key: 'picker:texts', text: JSON.stringify([...seenText].sort()) }); }
  { G.state = JSON.parse(snap); st = G.state; const e = sitPicker(); const c = e.choices[0]; G.nextEvent = null; out.push({ key: 'picker:go', text: JSON.stringify([c.run(), G.nextEvent && G.nextEvent.title]) }); G.nextEvent = null; }
  return out;
};

module.exports = { playTalk };
