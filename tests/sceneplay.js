'use strict';

// Plays the words of the hired chapter's function-built scenes and the hired events written in code (#463), for the pin (scenepin.test.js) and the text layer's tests
// (scenelines.test.js). Not a test file. playScenes runs in the page: each case builds a scene in a fresh hired game and returns its title, text and labels and, for each choice
// that does not restart the game, the line it returns (with the dice set to win and then to lose where it rolls), with the title, text and labels of the scene it queues.
const playScenes = () => {
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };  // the rolls given, then the seeded random (a constant would hang the generators)
  const fresh = (o = {}) => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000, ...o });
    while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.day += 30; G.dialog = null; G.nextEvent = null;
    return G.state;
  };
  const look = ev => (ev ? { title: ev.title, text: ev.text, labels: ev.choices.map(c => String(c.label)) } : null);
  // One case: `make` builds the scene (in a game `opts` started); each choice not in `skip` is played on a copy of that game's state, once for each of the rolls.
  const run = (id, opts, make, { rolls = [0.5], skip = [], prep = null } = {}) => {
    if (window.__only && !new RegExp(window.__only).test(id)) return;
    const rec = { id, plays: [] };
    try {
      fresh(opts); if (prep) prep(); const snap = JSON.stringify(G.state);
      const again = () => { __seed(7); G.state = JSON.parse(snap); G.dialog = null; G.nextEvent = null; };  // the seeded random back, since a list of rolls ends in a constant
      const ev = make(); Object.assign(rec, look(ev));
      for (let i = 0; i < ev.choices.length; i++) {
        if (skip.includes(i)) continue;
        for (const roll of rolls) {
          again(); const e2 = make(); G.nextEvent = null;
          seq([roll]);
          const text = e2.choices[i].run();
          const next = G.nextEvent; G.nextEvent = null;
          const play = { i, roll, text: text === null || text === undefined ? null : String(text), next: look(next) };
          if (next) {  // a scene queued by the choice: its own choices, once for each roll
            play.nextPlays = [];
            for (let j = 0; j < next.choices.length; j++) for (const r2 of rolls) {
              again(); const e3 = make(); G.nextEvent = null; seq([roll]); e3.choices[i].run(); const n3 = G.nextEvent; G.nextEvent = null; seq([r2]);
              play.nextPlays.push({ j, roll: r2, text: String(n3.choices[j].run()) });
              G.nextEvent = null;
            }
          }
          rec.plays.push(play);
        }
      }
    } catch (err) { rec.error = String(err && err.message || err); }
    out.push(rec);
  };

  // ---------- the stakes ----------
  run('scene:warning', {}, () => warningScene());
  run('scene:put-ashore:plain', {}, () => putAshoreScene(), { skip: [0] });
  run('scene:put-ashore:facts', {}, () => { hired().flags = { iceBad: true, hurt: true, raided: true }; return putAshoreScene(); }, { skip: [0] });
  run('scene:hand-death:hurt', {}, () => handDeathScene('hurt'), { skip: [0] });
  run('scene:hand-death:bridge', {}, () => handDeathScene('bridge'), { skip: [0] });
  run('scene:captain-lost', {}, () => captainLostScene(), { skip: [0] });
  run('scene:split', {}, () => {
    const st = G.state, crew = folk().filter(f => f.crew && !f.p.cast), [a, b] = crew;
    addBond(a, b, -9); st.feuds = { [bondKey(a, b)]: 1 }; st.relAt = {};
    return splitScene();
  });
  // ---------- a main character walks off ----------
  for (const who of ['ines', 'tomas', 'cato']) run(`scene:walk-off:${who}`, who === 'cato' ? { captainKey: 'hester' } : {}, () => { if (!G.state.crew.includes(castPerson(who).id)) G.state.crew.push(castPerson(who).id); return walkOffScene(castPerson(who), currentPlanet()); });
  // the lines each fact leaves: the first two that are true are shown, so once with all of them true and once with the first one not
  for (const who of ['ines', 'tomas', 'cato']) for (const skipFirst of [false, true]) {
    run(`scene:walk-off:${who}:facts${skipFirst ? '2' : ''}`, {}, () => {
      if (!G.state.crew.includes(castPerson(who).id)) G.state.crew.push(castPerson(who).id);
      const flags = {}; CAST[who].farewell.facts.forEach(([id], i) => { if (!(skipFirst && i === 0)) flags[id] = true; });
      G.state.cast = G.state.cast || {}; G.state.cast[who] = { ...(G.state.cast[who] || {}), flags };
      return walkOffScene(castPerson(who), currentPlanet());
    });
  }
  // ---------- the used ship ----------
  const deal = (id, tomas, debt, opinion) => run(id, { credits: 20000 }, () => {
    const st = G.state; st.crew = st.crew.filter(c => c !== 'c:tomas');
    if (tomas) { castJoin('tomas', ''); castPerson('tomas').opinion = opinion; }
    hired().debt = debt; return dealScene(currentPlanet());
  });
  deal('scene:used-ship-offer:friend', true, 0, OPINION.FRIEND); deal('scene:used-ship-offer:plain-debt', true, 1500, 1); deal('scene:used-ship-offer:cold', true, 0, -1); deal('scene:used-ship-offer:broker', false, 0, 0);
  // ---------- the yard office ----------
  for (const [ship, post, trusted, skilled] of [['used', 'gunner', false, false], ['used', 'engineer', true, true], ['lightfreighter', 'gunner', true, false], ['lightfreighter', 'pilot', false, true]]) {
    run(`scene:yard-office:${ship}:${post}:${trusted ? 't' : 'u'}${skilled ? 's' : 'n'}`, { post, credits: 60000 }, () => {
      if (trusted) changeRep(localGov(), 40);
      if (skilled) gainSkill(hired().post, 60);
      return yardScene(ship);
    });
  }
  // ---------- signing on ----------
  for (const background of ['earth', 'mars', 'belt']) for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    run(`scene:sign-on:${background}:${post}`, { background, post }, () => { G.state.carried = null; return signOnEvent(); });
  }
  run('scene:sign-on:carried', {}, () => { G.state.carried = 'On the dock they say the hand on the last ship did not come back.'; return signOnEvent(); });
  run('scene:sign-on:generated', {}, () => { G.state.carried = null; hired().captainKey = null; return signOnEvent(); });  // a captain with no words of their own (an older save's)
  for (const captainKey of ['dov', 'imre', 'zoya']) run(`scene:sign-on:${captainKey}`, { captainKey, background: 'mars' }, () => { G.state.carried = null; return signOnEvent(); });

  // ---------- the hired events written in code ----------
  const events = ['cap-order', 'cap-praise', 'cap-dressing', 'cap-favour', 'crew-needle', 'crew-cards', 'money-side', 'money-loan', 'money-short', 'road-scope'];
  for (const captainKey of ['hester', 'dov', 'imre', 'zoya']) {
    for (const post of captainKey === 'hester' ? ['gunner', 'pilot', 'engineer', 'comms'] : ['gunner']) {
      for (const id of events) {
        const d = HAND_EVENTS.find(x => x.id === id);
        run(`hired:${id}:${captainKey}:${post}`, { captainKey, post, credits: 5000 }, () => {
          const c = handContext(); c.cap.opinion = 5;
          return d.make(c);
        }, { rolls: [0, 0.999], prep: () => { if (!handContext().mate) { const m = makeCrewCandidate(G.state.systemId); registerPerson(m); G.state.crew.push(m.id); } } });
      }
    }
  }
  // and a captain who thinks little of the hand, for the choices that go the other way
  for (const id of ['cap-order', 'cap-praise']) {
    const d = HAND_EVENTS.find(x => x.id === id);
    run(`hired:${id}:low`, {}, () => { const c = handContext(); c.cap.opinion = -3; return d.make(c); }, { rolls: [0, 0.999] });
  }
  Math.random = real;
  return out;
};

module.exports = { playScenes };
