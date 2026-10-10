'use strict';

// Plays the words of the passenger events (PAX_EVENTS, js/people.js) for the pin (peoplepin.test.js) and the text layer's tests (peoplelines.test.js, #457). Not a test
// file. playPax runs in the page: each case builds one event for a passenger aboard in a burn, and returns its title, text and labels and, for each choice, the line it
// returns on a good roll and on a bad one with what it changed (credits, reaction mass, armor, time, the fare's bonus, the passenger's regard and debt).
const playPax = () => {
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };  // the rolls given, then the seeded random (a constant would hang the generators)
  // the passenger each event is about, by the order of PAX_EVENTS (the last one is the ill passenger again, bound for a cure instead of hiding an illness)
  const SPECS = [{ secret: 'contraband' }, { secret: 'wanted' }, { secret: 'ill' }, { secret: 'spy' }, { secret: 'debt' }, { goal: 'job' }, { goal: 'research' }, { goal: 'pilgrim' },
    { traits: ['talkative', 'kind'] }, { traits: ['nervous', 'kind'] }, { traits: ['curious', 'kind'] }, { traits: ['drunk', 'brave'] }, { traits: ['greedy', 'brave'] }, { traits: ['generous', 'brave'] }, { traits: ['rude', 'brave'] }];
  let PID = null;
  const start = () => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' });
    while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 20000; st.shipId = 'freighter';
    const p = makePerson('mars'); p.first = 'Sam'; p.last = 'Vale'; p.home = 'Mars'; p.crime = 'fraud'; p.secret = null; p.goal = 'home'; p.traits = ['kind', 'brave']; p.opinion = 0; p.wealth = 2;
    st.systemId = 'ceres'; st.planet = 'Ceres Station'; landAt(currentPlanet(), []); while (G.dialog) finishEvent();
    const o = { type: 'passenger', id: st.nextId++, who: 'Sam Vale', pax: 2, bonus: 0, destSystem: 'mars', destPlanet: 'Olympus Dome', pid: registerPerson(p).id, title: 'Carry Sam Vale', blurb: '', pay: 3000, deadline: 99 };
    st.missions.push(o);
    PID = o.pid;
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit(); G.transit.times = [];
    return JSON.stringify(G.state);
  };
  const seen = () => { const st = G.state, o = st.missions.find(m => m.type === 'passenger'), p = st.people[PID]; return { credits: st.credits, fuel: st.fuel, armor: G.player.armor, left: G.transit.left, bonus: o ? o.bonus : null, onboard: !!o, opinion: p.opinion, owes: p.owes || 0 }; };
  PAX_EVENTS.forEach((e, n) => {
    for (const extra of n === 2 ? [{}, { secret: null, goal: 'medical' }] : [{}]) {
      const id = `${n}${extra.goal ? ':' + extra.goal : ''}`;
      if (window.__only && !new RegExp(window.__only).test(id)) continue;
      const rec = { id, plays: [] };
      try {
        const snap = start(), spec = { ...SPECS[n], ...extra };
        const make = () => { G.state = JSON.parse(snap); const st = G.state, o = st.missions.find(m => m.type === 'passenger'), p = st.people[o.pid]; Object.assign(p, spec); G.nextEvent = null; return e.make(p, o); };
        const ev0 = make();
        rec.title = ev0.title; rec.text = ev0.text; rec.labels = ev0.choices.map(c => String(c.label));
        for (let i = 0; i < ev0.choices.length; i++) for (const roll of [0, 0.999]) {
          __seed(7); const ev = make(); const before = seen(); G.player.armor = G.player.maxArmor; const armor0 = G.player.armor; G.transit.left = 100;
          seq([roll]); const text = ev.choices[i].run();
          const after = seen();
          rec.plays.push({ i, roll, text: text === null || text === undefined ? null : String(text), d: { credits: after.credits - before.credits, fuel: after.fuel - before.fuel, armor: after.armor - armor0, left: after.left - 100, bonus: after.bonus === null ? null : after.bonus - before.bonus, onboard: after.onboard, opinion: after.opinion - before.opinion, owes: after.owes - before.owes } });
        }
      } catch (err) { rec.error = String(err && err.message || err); }
      out.push(rec);
    }
  });
  Math.random = real;
  return out;
};

// The same for the crew events (CREW_EVENTS): each trait's event for a shipmate with that trait, every choice on a good roll and a bad one, with what it changed (credits, reaction
// mass, armor, the shipmate's wage and regard).
const playCrew = () => {
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  const start = () => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' });
    while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 20000; st.shipId = 'freighter'; st.fuel = 50;
    const c = makeCrewCandidate('earth'); Object.assign(c, { first: 'Sam', last: 'Vale', home: 'Mars', wage: 100, opinion: 0 });
    registerPerson(c); st.crew.push(c.id);
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit(); G.transit.times = [];
    G.state.fuel = 50;  // the burn has taken its mass: the tanks are as the events read them
    return { snap: JSON.stringify(G.state), id: c.id };
  };
  for (const trait of Object.keys(CREW_EVENTS)) {
    if (window.__only && !new RegExp(window.__only).test(trait)) continue;
    const rec = { id: trait, plays: [] };
    try {
      const { snap, id } = start();
      const make = () => { G.state = JSON.parse(snap); const c = G.state.people[id]; c.traits = [trait]; G.nextEvent = null; return { c, ev: CREW_EVENTS[trait](c) }; };
      const first = make().ev;
      rec.title = first.title; rec.text = first.text; rec.labels = first.choices.map(x => String(x.label));
      for (let i = 0; i < first.choices.length; i++) for (const roll of [0, 0.999]) {
        __seed(7); const { c, ev } = make(); const before = { credits: G.state.credits, fuel: G.state.fuel, wage: c.wage, opinion: c.opinion }; G.player.armor = G.player.maxArmor; const armor0 = G.player.armor;
        seq([roll]); const text = ev.choices[i].run();
        rec.plays.push({ i, roll, text: text === null || text === undefined ? null : String(text), d: { credits: G.state.credits - before.credits, fuel: G.state.fuel - before.fuel, armor: G.player.armor - armor0, wage: c.wage - before.wage, opinion: c.opinion - before.opinion } });
      }
    } catch (err) { rec.error = String(err && err.message || err); }
    out.push(rec);
  }
  Math.random = real;
  return out;
};

module.exports = { playPax, playCrew };
