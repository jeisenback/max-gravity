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
  const standing = () => ({ credits: G.state.credits, opinion: Object.fromEntries(Object.values(G.state.people).map(p => [p.id, p.opinion])) });
  const moved = (b, a) => ({ ...(a.credits !== b.credits ? { credits: a.credits - b.credits } : {}), ...Object.fromEntries(Object.entries(a.opinion).filter(([id, v]) => v !== b.opinion[id]).map(([id, v]) => [id, v - (b.opinion[id] || 0)])) });  // what a choice did to the money and to each person's regard
  const memLens = () => Object.fromEntries(Object.values(G.state.people).map(p => [p.id, (p.memories || []).length]));
  const gained = lens => Object.values(G.state.people).flatMap(p => (p.memories || []).slice(lens[p.id] === undefined ? 0 : lens[p.id]));  // the memories a choice leaves
  const look = ev => (ev ? { title: ev.title, text: ev.text, labels: ev.choices.map(c => String(c.label)) } : null);
  // One case: `make` builds the scene (in a game `opts` started); each choice not in `skip` is played on a copy of that game's state, once for each of the rolls.
  const run = (id, opts, make, { rolls = [0.5], skip = [], prep = null, extra = null } = {}) => {
    if (window.__only && !new RegExp(window.__only).test(id)) return;
    const rec = { id, plays: [] };
    try {
      fresh(opts); if (prep) prep(); const snap = JSON.stringify(G.state);
      const again = () => { __seed(7); G.state = JSON.parse(snap); G.dialog = null; G.nextEvent = null; };  // the seeded random back, since a list of rolls ends in a constant
      const ev = make(); Object.assign(rec, look(ev));
      for (let i = 0; i < ev.choices.length; i++) {
        if (skip.includes(i)) continue;
        for (const roll of rolls) {
          again(); const e2 = make(); G.nextEvent = null; const lens = memLens(), before = standing(), x0 = extra ? JSON.stringify(extra()) : null;
          seq([roll]);
          const text = e2.choices[i].run(); const mem = gained(lens), fx = moved(before, standing()), x1 = extra ? JSON.stringify(extra()) : null;
          const next = G.nextEvent; G.nextEvent = null;
          const play = { i, roll, text: text === null || text === undefined ? null : String(text), ...(mem.length ? { mem } : {}), ...(Object.keys(fx).length ? { fx } : {}), ...(x1 !== x0 ? { x: JSON.parse(x1) } : {}), next: look(next) };
          if (next) {  // a scene queued by the choice: its own choices, once for each roll
            play.nextPlays = [];
            for (let j = 0; j < next.choices.length; j++) for (const r2 of rolls) {
              again(); const e3 = make(); G.nextEvent = null; seq([roll]); e3.choices[i].run(); const n3 = G.nextEvent; G.nextEvent = null; const lens3 = memLens(); seq([r2]);
              const t3 = String(n3.choices[j].run()), m3 = gained(lens3);
              play.nextPlays.push({ j, roll: r2, text: t3, ...(m3.length ? { mem: m3 } : {}) });
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
  // ---------- putting work further away to the captain ----------
  // a captain who loves, hates or shrugs at each way of putting it (by trait), for each of the four pitches, on a good roll and a bad one
  for (const trait of ['greedy', 'pious', 'brave', 'generous', 'rude', 'nervous', 'kind']) run(`scene:pitch:${trait}`, {}, () => {
    hiredCaptain().traits = [trait];
    const dest = SYSTEMS.mars.planets[0].name;
    return pitchScene({ tpl: 'package', ctx: { dest, from: 'Titan', who: 'Mrs. Adeyemi', system: SYSTEMS.mars.name, scale: 1.2 }, sid: 'mars', planet: dest, days: 5, until: G.state.day + 20, pitched: null, booked: false });
  }, { rolls: [0, 0.999] });
  // ---------- the faction ties: customs, a patrol, a friend at the dock, a recall in a war ----------
  // who is wanted, an exile, an officer or a member of what is stubbed for the crew (tiesOf), as is the faction at war and the papers the captain holds; the stubs are put back for each case
  const realTies = window.tiesOf, realYou = window.youTies, realWar = window.factionState;
  const GOV = FACTIONS.find(f => f !== 'Pirate'), GOV2 = FACTIONS.find(f => f !== 'Pirate' && f !== GOV);
  const mateOf = (first, over = {}) => { const c = makeCrewCandidate(G.state.systemId); Object.assign(c, { first, last: 'Vale', role: 'engineer', opinion: 0, ...over }); registerPerson(c); G.state.crew.push(c.id); return c; };
  const stubTies = map => { window.tiesOf = q => { const r = realTies(q), m = map[q.first]; return m ? { ...r, ...m, status: { ...r.status, ...(m.status || {}) }, regard: { ...r.regard, ...(m.regard || {}) } } : r; }; };
  const tiesCase = (id, prep, make, o = {}) => run(id, { credits: 5000, ...(o.opts || {}) }, make, { rolls: [0, 0.999], prep() {
    window.tiesOf = realTies; window.youTies = realYou; window.factionState = realWar; G.state.crew = []; G.state.customs = {}; G.state.warCalled = {};
    prep();
  } });
  const wanted = { aff: GOV, status: { [GOV]: 'wanted' } };
  for (const [name, patrol, status, extra] of [['customs:wanted', false, 'wanted'], ['customs:exile', false, 'exile'], ['patrol:wanted', true, 'wanted'], ['patrol:officer', true, 'wanted', 'officer'], ['customs:papers', false, 'wanted', 'papers'], ['customs:cast', false, 'wanted', 'cast'], ['patrol:cast', true, 'exile', 'cast']]) {
    tiesCase(`scene:${name}`, () => {
      mateOf('Sam', extra === 'cast' ? { cast: 'ines' } : {}); mateOf('Cora');
      const map = { Sam: { aff: GOV, status: { [GOV]: status } }, Cora: { aff: GOV, status: {} } };
      if (extra === 'officer') { mateOf('Ben'); map.Ben = { aff: GOV, status: { [GOV]: 'officer' } }; }
      stubTies(map);
      if (extra === 'papers') window.youTies = () => ({ aff: GOV, status: { [GOV]: 'member' }, regard: {} });
    }, () => customsScene(GOV, currentPlanet(), patrol));
  }
  tiesCase('scene:dock-friend', () => { mateOf('Sam'); stubTies({ Sam: { aff: GOV, status: { [GOV]: 'officer' } } }); }, () => dockFriendScene(GOV, currentPlanet()));
  for (const [name, status, opinion] of [['officer', 'officer', 0], ['member:close', 'member', OPINION.CLOSE], ['member:far', 'member', 0]]) {
    tiesCase(`scene:war-call:${name}`, () => {
      mateOf('Sam', { opinion }); mateOf('Cora'); stubTies({ Sam: { aff: GOV, status: { [GOV]: status } }, Cora: { aff: GOV2, status: {} } });
      window.factionState = () => ({ ...realWar(), war: { a: GOV, b: GOV2, start: 5 } });
    }, () => warCallScene(currentPlanet()));
  }
  window.tiesOf = realTies; window.youTies = realYou; window.factionState = realWar;

  // ---------- the downtime a hired hand can add, and what the crew make of what you do with a faction ----------
  const crewOf = n => { for (let i = 0; i < n; i++) { const c = makeCrewCandidate(G.state.systemId); Object.assign(c, { first: `Mate${i}`, last: 'Vale', role: ['engineer', 'pilot', 'comms', 'slicer'][i % 4], opinion: 0 }); registerPerson(c); G.state.crew.push(c.id); } };
  run('downtime:hand', {}, () => ({ title: 'Downtime', text: '', choices: HAND_DOWNTIME.map(d => ({ label: d.label, run: d.run })) }), { rolls: [0.1, 0.9], prep() { G.state.crew = []; crewOf(4); }, extra: () => hired().skill });
  const GOVT = FACTIONS.find(f => f !== 'Pirate'), GOVT2 = FACTIONS.find(f => f !== 'Pirate' && f !== GOVT);
  for (const [gov, amount] of [[GOVT, 5], [GOVT, -5], [GOVT2, 12], [GOVT2, -12], [GOVT, 2]]) {
    run(`ties:reacts:${gov}:${amount}`, {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { crewReacts(gov, amount); return ''; } }] }), { prep() { G.state.crew = []; crewOf(10); } });
  }
  // ---------- downtime on a burn: the ship's own activities, and the menu they are offered in ----------
  { // the pick of one of two lines is set (not drawn), so that both are played; the dice are used by where everyone walks to
    const realPick = window.pick, burn = (v, o = {}) => () => { uatBurn('Ceres Station', 'pallas'); uatPassenger(); window.pick = a => a[v % a.length]; G.state.armor = Math.max(1, ship().armor - 10); if (o.engineer) { G.state.crew = []; crewOf(1); } if (o.flipped) G.transit.flipped = true; };
    for (const v of [0, 1]) for (const engineer of [false, true]) {
      run(`shiplife:acts:${v}:${engineer ? 'eng' : 'solo'}`, { mode: undefined }, () => ({ title: 'x', text: '', choices: ['meal', 'drills', 'repair', 'visit'].map(id => ({ label: ACTIVITIES[id].label, run: ACTIVITIES[id].run })) }), { prep: burn(v, { engineer }) });
    }
    for (const [name, opts, flipped] of [['hired', {}, false], ['hired-flipped', {}, true], ['owner', { mode: undefined }, false], ['owner-flipped', { mode: undefined }, true]]) {
      run(`shiplife:menu:${name}`, opts, () => { const ev = downtimeEvent(true); return { ...ev, choices: ev.choices.filter((c, i, all) => c.label === ACTIVITIES.meal.label || i === all.length - 1) }; }, { prep: burn(0, { flipped }) });
    }
    window.pick = realPick;
  }
  // ---------- the round for the house at the bar, and a main character coming aboard ----------
  { // the button's words before and after, and what the room says and remembers
    const button = () => (barHtml().match(/<button data-action="barRound"[^>]*>([^<]*)<\/button>/) || [])[1];
    run('bar:round', {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { const before = button(); Mods.actions.barRound.fn(); return `${before} | ${G.barState.note} | ${button()}`; } }] }), { prep() { G.state.credits = 5000; const st = G.state; st.systemId = 'ceres'; st.planet = 'Ceres Station'; G.transit = null; fillBar(currentPlanet()); } });
    run('bar:round-poor', {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { return button(); } }] }), { prep() { G.state.credits = 10; const st = G.state; st.systemId = 'ceres'; st.planet = 'Ceres Station'; G.transit = null; fillBar(currentPlanet()); } });
  }
  for (const key of ['ines', 'tomas', 'yelena', 'ruben']) {
    run(`cast:join:${key}`, {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run: () => castJoin(key, 'They come aboard.') }] }), { extra: () => (G.state.home || {}).log });
  }
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
