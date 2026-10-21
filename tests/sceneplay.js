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
              const x3a = extra ? JSON.stringify(extra()) : null, t3 = String(n3.choices[j].run()), m3 = gained(lens3), x3b = extra ? JSON.stringify(extra()) : null;
              play.nextPlays.push({ j, roll: r2, text: t3, ...(m3.length ? { mem: m3 } : {}), ...(x3b !== x3a ? { x: JSON.parse(x3b) } : {}) });
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
  // The freight agent at the far end (shippers.js): late, short and lost, each choice with the case held and not held; the shipper's regard is what the extra records.
  for (const [kind, o] of [['late', { tons: 90, got: 90, late: 2 }], ['short', { tons: 90, got: 60, late: 0 }], ['lost', { tons: 90, got: 0, late: 3 }], ['skim', { tons: 90, got: 90, late: 0, cut: 3000, owed: 20000 }]]) {
    run(`scene:freight-agent:${kind}`, {}, () => agentScene({ kind, shipper: 'the Compact Freight Office', good: 'water', due: G.state.day - o.late, cut: 0, owed: 0, ...o }, freightAgent(currentPlanet())),
      { rolls: [0, 0.99], extra: () => ({ standing: hired().standing, fund: hired().fund }) });
  }
  run('scene:put-ashore:plain', {}, () => putAshoreScene(), { skip: [0] });
  run('scene:put-ashore:facts', {}, () => { hired().flags = { iceBad: true, hurt: true, raided: true }; return putAshoreScene(); }, { skip: [0] });
  run('scene:hand-death:hurt', {}, () => handDeathScene('hurt'), { skip: [0] });
  run('scene:hand-death:first', {}, () => handDeathScene('first'), { skip: [0] });
  run('scene:hand-death:bridge', {}, () => handDeathScene('bridge'), { skip: [0] });
  run('scene:captain-lost', {}, () => captainLostScene(), { skip: [0] });
  run('scene:split', {}, () => {
    const st = G.state, crew = folk().filter(f => f.crew && !f.p.cast), [a, b] = crew;
    addBond(a, b, -9); st.feuds = { [bondKey(a, b)]: 1 }; st.relAt = {};
    return splitScene();
  }, { extra: () => (G.state.home || {}).log });
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
  for (const [id, tomas] of [['scene:used-ship-offer:lapse-tomas', true], ['scene:used-ship-offer:lapse-broker', false]]) run(id, { credits: 20000 }, () => {
    G.state.crew = G.state.crew.filter(c => c !== 'c:tomas'); if (tomas) castJoin('tomas', '');
    return lapseScene();
  });
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
      if (patrol) hired().skill.gunner = SKILL_STEPS[2];  // the gunner's lock on the cutter
      const map = { Sam: { aff: GOV, status: { [GOV]: status } }, Cora: { aff: GOV, status: {} } };
      if (extra === 'officer') { mateOf('Ben'); map.Ben = { aff: GOV, status: { [GOV]: 'officer' } }; }
      stubTies(map);
      if (extra === 'papers') window.youTies = () => ({ aff: GOV, status: { [GOV]: 'member' }, regard: {} });
    }, () => customsScene(GOV, currentPlanet(), patrol));
  }
  // the lieutenant on a patrol cutter: a first stop and a later one after each way of answering, for each faction
  for (const gov of STATE_FACTIONS) for (const last of [null, 'straight', 'gap', 'asking.win', 'asking.lose']) {
    tiesCase(`scene:lieutenant:${gov}:${last || 'first'}`, () => {
      mateOf('Sam'); stubTies({ Sam: { aff: gov, status: { [gov]: 'wanted' } } });
      if (last) G.state.customs.met = { [gov]: { q: PATROL_LT[gov].asks[0], answer: last, day: 0 } };
    }, () => lieutenantScene(gov, currentPlanet()));
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
  // the other versions, taken by the day (#771, #775): two days on from the one above, so all three are played
  for (const shift of [1, 2]) run(`downtime:cast:${shift}`, {}, () => ({ title: 'Downtime', text: '', choices: HAND_DOWNTIME.filter(d => d.cast).map(d => ({ label: d.label, run: d.run })) }), { prep() { G.state.crew = []; crewOf(4); G.state.day += shift; }, extra: () => hired().skill });
  const GOVT = FACTIONS.find(f => f !== 'Pirate'), GOVT2 = FACTIONS.find(f => f !== 'Pirate' && f !== GOVT);
  for (const [gov, amount] of [[GOVT, 5], [GOVT, -5], [GOVT2, 12], [GOVT2, -12], [GOVT, 2]]) {
    run(`ties:reacts:${gov}:${amount}`, {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { crewReacts(gov, amount); return ''; } }] }), { prep() { G.state.crew = []; crewOf(10); } });
  }
  // ---------- downtime on a burn: the ship's own activities, and the menu they are offered in ----------
  { // the draw that picks one of a telling's two lines is set (to the first or the last), so that both are played; where everyone walks to is drawn from the same
    const burn = (v, o = {}) => () => { uatBurn('Ceres Station', 'pallas'); uatPassenger(); G.state.armor = Math.max(1, ship().armor - 10); if (o.engineer) { G.state.crew = []; crewOf(1); } if (o.flipped) G.transit.flipped = true; };
    for (const v of [0, 1]) for (const engineer of [false, true]) {
      run(`shiplife:acts:${v}:${engineer ? 'eng' : 'solo'}`, { mode: undefined }, () => ({ title: 'x', text: '', choices: ['meal', 'drills', 'repair', 'visit'].map(id => ({ label: ACTIVITIES[id].label, run() { const keep = Math.random; Math.random = () => (v ? 0.99 : 0); try { return ACTIVITIES[id].run(); } finally { Math.random = keep; } } })) }), { prep: burn(v, { engineer }) });
    }
    for (const [name, opts, flipped] of [['hired', {}, false], ['hired-flipped', {}, true], ['owner', { mode: undefined }, false], ['owner-flipped', { mode: undefined }, true]]) {
      run(`shiplife:menu:${name}`, opts, () => { const ev = downtimeEvent(true); return { ...ev, choices: ev.choices.filter((c, i, all) => c.label === ACTIVITIES.meal.label || i === all.length - 1).map(c => (c.label === ACTIVITIES.meal.label ? { ...c, run: () => `${c.run()} | ${G.transit.comms[G.transit.comms.length - 1]}` } : c)) }; }, { prep: burn(0, { flipped }) });  // the meal's line in Comms too (#767)
    }
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
  // ---------- the lines in the ship's log: a crew member killed, a captain retired or lost, a settlement founded ----------
  const logOf = () => (G.state.home || {}).log;
  run('log:killed', {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { killCrew(person(G.state.crew[0])); return ''; } }] }), { prep() { G.state.crew = []; crewOf(2); }, extra: logOf });
  for (const [fate, aboard] of [['retired', 0], ['died', 0], ['died', 2]]) {
    run(`log:legacy:${fate}:${aboard}`, {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { succeed(fate, 'Mara Quill'); return ''; } }] }), { prep() { G.state.crew = []; crewOf(aboard); }, extra: logOf });
  }
  run('log:founded', {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { found('Callisto', 'Test Landing'); return ''; } }] }), { prep() { Object.assign(G.state, { credits: 150000, cargo: { industrial: 30, equipment: 20, metal: 40 } }); }, extra: logOf });
  // ---------- the memories and notes of dismissing, aborting, a run settled, a swap of posts, a ship bought in, and practice at a post ----------
  const alone = () => ({ title: 'x', text: '', choices: [] });
  run('hand:dismiss', { mode: undefined }, () => ({ ...alone(), choices: [{ label: 'x', run() { UI.act('dismiss', '0'); return ''; } }] }), { prep() { G.state.crew = []; crewOf(2); } });
  run('hand:abort', { mode: undefined }, () => ({ ...alone(), choices: [{ label: 'x', run() { UI.act('abort', '0'); return ''; } }] }), { prep() { uatPassenger(); } });
  for (const [name, cost] of [['good', -500], ['bad', 800]]) {
    run(`hand:run:${name}`, {}, () => ({ ...alone(), choices: [{ label: 'x', run: () => String(settleRun(currentPlanet())) }] }), { prep() { const st = G.state; hired().run = { sid: st.systemId, planet: currentPlanet().name, day: st.day - 3, from: 'Mars', good: null, tons: 0, cost, ice: false, profit: 0 }; } });
  }
  for (const post of ['engineer', 'pilot']) {
    run(`hand:swap:${post}`, {}, () => ({ ...alone(), choices: [{ label: 'x', run() { const real = M_NOTE, notes = []; M_NOTE = t => notes.push(t); try { askSwap(post); } finally { M_NOTE = real; } return notes.join(' | '); } }] }), { rolls: [0, 0.999] });
  }
  for (const [name, friends] of [['alone', 0], ['friends', 2]]) {
    run(`hand:buyin:${name}`, { credits: 100000 }, () => ({ ...alone(), choices: [{ label: 'x', run: () => String(buyIn('courier')) }] }), { prep() { G.state.crew = []; crewOf(friends); for (const id of G.state.crew) G.state.people[id].opinion = 4; } });
  }
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    run(`hand:practise:${post}`, { post }, () => ({ ...alone(), choices: [{ label: ACTIVITIES.practise.label, run: () => String(ACTIVITIES.practise.run()) }] }), { extra: () => hired().skill });
  }
  run('hand:practise:owner', { mode: undefined }, () => ({ ...alone(), choices: [{ label: 'x', run: () => String(ACTIVITIES.practise.run()) }] }));
  // ---------- the memories left by a fine, a landing, a mission lapsed, ice brought home, a loss mourned, a repair and a post taken over ----------
  run('memory:patrol-fine', {}, () => { const ev = contactEvent({ kind: 'patrol', gov: GOVT }); return { ...ev, choices: ev.choices.filter(c => /^Heave to/.test(c.label)) }; });
  run('memory:landing', { mode: undefined }, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { land(currentPlanet()); G.dialog = null; G.nextEvent = null; return ''; } }] }), { prep() { G.state.crew = []; G.player = G.player || { armor: ship().armor, x: 0, y: 0, vx: 0, vy: 0 }; uatPassenger('earth', G.state.planet); } });
  run('memory:lapsed', { mode: undefined }, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { expireMissions(); return ''; } }] }), { prep() { uatPassenger('mars', 'Mars'); G.state.missions[0].deadline = G.state.day - 1; } });
  for (const edge of [3, -2, 0]) run(`memory:ice:${edge}`, {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run: () => iceHome(edge) }] }));
  for (const post of ['gunner', 'engineer']) run(`memory:repair:${post}`, { post }, () => { const ev = repairScene(currentPlanet()); return { ...ev, choices: ev.choices.filter(c => c.label === 'Help with the repair') }; }, { prep() { G.state.armor = Math.max(1, ship().armor - 40); } });
  run('memory:mourn', {}, () => mournScene({ first: 'Mara', last: 'Quill', role: 'engineer' }), { prep() { G.state.crew = []; crewOf(8); G.state.credits = 5000; } });
  run('memory:strain', { mode: undefined }, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { for (let i = 0; i < 3; i++) { takeControl('pilot'); handBack('pilot'); } return ''; } }] }), { prep() { G.state.crew = []; crewOf(4); G.state.crew.map(person).forEach(c => { c.role = 'pilot'; }); } });
  run('memory:clinic', {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { treatInjuries(currentPlanet()); return ''; } }] }), { prep() { G.state.crew = []; crewOf(2); G.state.injured = { [G.state.crew[0]]: true }; G.state.credits = 5000; } });
  // ---------- the talks with the main characters at a bar ----------
  for (const [key, list] of Object.entries(CAST_BAR)) list.forEach((bar, n) => {
    run(`castbar:${key}:${n}`, {}, () => {
      const p = castPerson(key), rec = castRec(key); if (!G.state.crew.includes(p.id)) G.state.crew.push(p.id);
      rec.since = 0; rec.bar = n;
      return castBarEvent({ p, known: true, cast: key });
    }, { prep() { G.state.day = 200; G.state.credits = 5000; }, extra: () => [castRec(key).flags, castPerson(key).xp] });
  });
  // ---------- the first officers' scenes of danger, in each way they can end ----------
  for (const [who, go] of Object.entries({ ilsa: () => atTheReactor(false), ansel: () => atTheLock(false), pilar: () => atTheHelm(false), cato: () => inTheIceHold(false) })) for (const outcome of ['live', 'mark', 'die']) {
    run(`officer:${who}:${outcome}`, {}, () => ({ title: 'x', text: '', choices: [{ label: 'x', run() { const real = window.castFate; window.castFate = () => outcome; try { return go(); } finally { window.castFate = real; } } }] }), { prep() { castPerson(who); } });
  }
  // and the call that benches a first officer, in the scene it is made in
  for (const [who, label] of [['ilsa', 'Vent the plant and let the ship coast'], ['ansel', 'Back the captain, and open fire'], ['pilar', null]]) {
    run(`officer:${who}:benched`, {}, () => {
      const sc = Object.values(CAST[who].scenes).find(x => (x.choices || []).some(c => (label ? c.label === label : /benched/.test(String(c.run)))));
      const ev = castScene(who, sc), i = ev.choices.findIndex(c => (label ? c.label === label : /benched/.test(String(c.run))));
      return { ...ev, choices: [ev.choices[i]] };
    }, { prep() { castPerson(who); } });
  }
  // ---------- the closing scene of the hired chapter, for each count of who comes with you and of who was lost (one scene, #449) ----------
  { const mates = n => Array.from({ length: n }, (_, i) => ({ first: ['Ana', 'Ben', 'Cy'][i], last: 'Vale' })), grave = (name, i) => ({ key: `x${i}`, name, day: 5 + i, place: 'Ceres', cause: 'Lost on the way.' });
    const cases = { alone: [0, 0], 'alone:lost': [0, 2], one: [1, 0], 'one:lost': [1, 1], two: [2, 0], 'two:lost': [2, 2], three: [3, 0] };
    for (const captainKey of ['hester', null]) for (const [name, [came, lost]] of Object.entries(cases)) {
      run(`chapterend:${captainKey ? 'entry' : 'bare'}:${name}`, {}, () => {
        const realCompanions = window.buyInCompanions, scope = BUILD.scope;
        G.state.memorial = Array.from({ length: lost }, (_, i) => grave(['Mara Quill', 'Joss Ode'][i], i)); hired().captainKey = captainKey;
        window.buyInCompanions = () => mates(came); BUILD.scope = 'earth-hired';
        try { return chapterEnd('courier'); } finally { window.buyInCompanions = realCompanions; BUILD.scope = scope; }
      });
    }
  }
  // ---------- the close of chapter two, for each ending and each count of the crew who came along ----------
  { const rec = (aboard, left, dead) => ({ came: aboard.length + left.length + dead.length, aboard, left, dead });
    const cases = { 'together:one': rec(['Ana'], [], []), 'together:two': rec(['Ana', 'Ben'], [], []), 'left:some': rec(['Ana'], ['Ben'], []), 'left:all': rec([], ['Ana', 'Ben'], []),
      'losses:one': rec([], [], ['Ana']), 'losses:two': rec([], [], ['Ana', 'Ben']), 'losses:one-and-one': rec(['Cy'], [], ['Ana']), 'losses:one-and-two': rec(['Cy', 'Di'], [], ['Ana']), alone: rec([], [], []) };
    for (const [name, r] of Object.entries(cases)) run(`chaptertwo:${name}`, { mode: undefined }, () => { G.state.career = { bought: G.state.day - 90 }; return chapterTwoEnd(r); });
  }
  // ---------- the look back at the chapter: the work, why you signed on, who you got close to, the loss, the ties and the marks ----------
  { const grave = (name, i) => ({ key: `x${i}`, name, day: 5 + i, place: 'Ceres', cause: 'Lost on the way.' });
    const recap = (label, setup) => run(`recap:${label}`, {}, () => { const st = G.state; setup(st, hired(), folk().filter(f => f.crew && !f.p.cast).map(f => f.p)); return chapterRecap(); });
    recap('fresh', () => {});
    for (const reason of ['money', 'learn', 'away']) for (const runs of [1, 3]) recap(`why:${reason}:${runs}`, (st, h) => { h.reason = reason; h.runsDone = runs; h.earnedTotal = 1234; });
    recap('near:one', (st, h, [a]) => { a.opinion = OPINION.FRIEND; });
    recap('kept', (st, h, [a]) => { a.opinion = OPINION.FRIEND; like(a, 0, 'You brought the ice in.'); });
    recap('near:three', (st, h, [a, b]) => { a.opinion = OPINION.ALLY; b.opinion = OPINION.FRIEND; st.people[h.captain].opinion = OPINION.FRIEND; });
    recap('told:one', (st, h, [a]) => { a.story = { ...(a.story || {}), beat: 3 }; });
    recap('told:two', (st, h, [a, b]) => { a.story = { ...(a.story || {}), beat: 4 }; b.story = { ...(b.story || {}), beat: 3 }; });
    recap('loyal:two', (st, h, [a, b]) => { a.loyal = true; b.loyal = true; });
    recap('kit', (st, h) => { h.kit = ['valve-keys']; });
    recap('trusted', st => { castPerson('ines'); st.cast = { ...(st.cast || {}), ines: { ...((st.cast || {}).ines || {}), flags: { trusted: true } } }; });
    recap('lost:one', st => { st.memorial = [grave('Mara Quill', 0)]; });
    recap('lost:three', st => { st.memorial = [grave('Mara Quill', 0), grave('Joss Ode', 1), grave('Teo Ruiz', 2)]; });
    recap('ties', (st, h, [a, b]) => { addBond({ id: a.id, p: a }, { id: b.id, p: b }, 9); });
    recap('marks', st => { castPerson('tomas'); st.crew.push(castPerson('tomas').id); castFate('tomas', 'mark', 'Hurt on the run.', 'Marked once.'); });
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
        }, { rolls: [0, 0.999], extra: () => (G.state.journal || []).map(j => j.text), prep: () => { if (!handContext().mate) { const m = makeCrewCandidate(G.state.systemId); registerPerson(m); G.state.crew.push(m.id); } } });
      }
    }
  }
  // and a captain who thinks little of the hand, for the choices that go the other way
  for (const id of ['cap-order', 'cap-praise']) {
    const d = HAND_EVENTS.find(x => x.id === id);
    run(`hired:${id}:low`, {}, () => { const c = handContext(); c.cap.opinion = -3; return d.make(c); }, { rolls: [0, 0.999], extra: () => (G.state.journal || []).map(j => j.text) });
  }
  Math.random = real;
  // The freight office's side on the paper (shippers.js): a crew member the Compact wants, and the Earth hand's own papers, so every way out is there. Last, because putting
  // the crew member ashore signs a replacement on, whose name takes one from the names the cases after it would draw.
  {
    const gov = 'Arcology Compact', realTies = tiesOf;
    run('scene:freight-side', {}, () => {
      const st = G.state, h = hired(), here = currentPlanet(), target = st.crew.map(person).find(p => !p.cast);
      window.tiesOf = p => (p.id === target.id ? { ...realTies(p), status: { ...realTies(p).status, [gov]: 'wanted' } } : realTies(p)); h.runsDone = 1;  // the first run is guided and has no side
      const run0 = { contract: true, shipper: 'the Compact Freight Office', good: 'water', tons: 50, from: here.name, planet: 'Mars', sid: 'mars', pay: 9000, days: 4, due: st.day + 8, cost: 0, yard: false };
      h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: run0, alts: [] }; h.freight = { key: `${here.name}@${st.day}`, list: [run0] }; st.customs = {};
      return sideScene(run0, sideDue(run0), freightAgent(here));
    }, { rolls: [0, 0.99], extra: () => ({ board: hired().freight.list.length, crew: G.state.crew.length, standing: hired().standing, fund: hired().fund }) });
    window.tiesOf = realTies;
  }
  // ---------- a day ashore: the menu with every entry, at a port of each kind and on the days that have a broadcast, a show and a match ----------
  { const ashore = (name, setup) => run(`dayashore:${name}`, {}, () => { G.mode = 'landed'; setup(G.state); return dayAshoreEvent(true); });
    const portLike = (st, pick) => { const sys = Object.entries(SYSTEMS).find(([, s]) => s.planets.some(pick)); st.systemId = sys[0]; st.planet = sys[1].planets.find(pick).name; fillBar(currentPlanet()); };
    ashore('walk:market', st => { portLike(st, p => p.services.includes('trade') && !p.services.includes('shipyard')); st.rumors = []; });
    ashore('walk:yard', st => { portLike(st, p => p.services.includes('shipyard')); st.rumors = []; });
    ashore('walk:rumor', st => { portLike(st, p => p.services.includes('trade')); st.rumors = [{ planet: st.planet, cid: 'water', until: st.day + 5, mult: 1.5 }]; });
    ashore('table', st => { portLike(st, p => p.services.includes('trade')); G.patrons = [{ p: makePerson('earth'), known: true, regular: true }]; registerPerson(G.patrons[0].p); G.barState.planet = st.planet; });
    ashore('errand', st => { portLike(st, p => p.services.includes('trade')); const p = Object.values(st.people).find(x => st.crew.includes(x.id)); p.opinion = OPINION.FRIEND; delete p.errandAt; while ((st.day + Math.abs(hash(p.id))) % ERRAND_EVERY !== 0) st.day++; });
    ashore('room', st => { portLike(st, p => p.services.includes('trade')); const p = Object.values(st.people).find(x => st.crew.includes(x.id)); p.home = st.planet; storyOf(p); st.room = { planet: st.planet, pid: p.id, since: st.day - 100, last: st.day - 20, visits: 1 }; });
    ashore('broadcast', st => { portLike(st, p => p.services.includes('trade')); while (!broadcastsOn(st.day).length) st.day++; });
    ashore('show', st => { portLike(st, p => p.services.includes('trade')); while (!airing(st.day).length || airing(st.day)[0].premiere || airing(st.day)[0].finale) st.day++; });
    ashore('show:premiere', st => { portLike(st, p => p.services.includes('trade')); while (!airing(st.day).some(s => s.premiere) || airing(st.day)[0].finale || !airing(st.day)[0].premiere) st.day++; });
    ashore('show:finale', st => { portLike(st, p => p.services.includes('trade')); while (!airing(st.day).length || !airing(st.day)[0].finale) st.day++; });
    ashore('match', st => { portLike(st, p => p.services.includes('trade')); const l = LEAGUES[0]; while (!['regular', 'playoffs', 'final'].includes(leaguePhase(l, st.day))) st.day++; const m = playMatch(l, l.teams[0], l.teams[1]); m.day = st.day; });
  }
  { const say = daySay; run('dayashore:button', {}, () => ({ title: 'x', text: [say('button'), say('hint.open'), say('hint.spent')].join(' | '), choices: [] })); }  // the Port page's button and its hint, played as words
  // ---------- the other versions of the hand's downtime and of the drills and the repair, taken by the day (#775): last, so that the people these runs
  // make do not move the ids in the runs above ----------
  for (const shift of [1, 2]) run(`downtime:hand:${shift}`, {}, () => ({ title: 'Downtime', text: '', choices: HAND_DOWNTIME.filter(d => !d.cast).map(d => ({ label: d.label, run: d.run })) }), { prep() { G.state.crew = []; crewOf(4); G.state.day += shift; }, extra: () => hired().skill });
  for (const shift of [1, 2]) for (const engineer of [false, true]) {
    run(`shiplife:acts:day+${shift}:${engineer ? 'eng' : 'solo'}`, { mode: undefined }, () => ({ title: 'x', text: '', choices: ['drills', 'repair'].map(id => ({ label: ACTIVITIES[id].label, run: () => ACTIVITIES[id].run() })) }), {
      prep() { uatBurn('Ceres Station', 'pallas'); G.state.armor = Math.max(1, ship().armor - 10); if (engineer) { G.state.crew = []; crewOf(1); } G.state.day += shift; },
    });
  }
  // the other versions of Not on the Same Ship, taken by the day (#780)
  for (const shift of [1, 2]) run(`scene:split:day+${shift}`, {}, () => {
    const st = G.state, crew = folk().filter(f => f.crew && !f.p.cast), [a, b] = crew;
    addBond(a, b, -9); st.feuds = { [bondKey(a, b)]: 1 }; st.relAt = {}; st.day += shift;
    return splitScene();
  }, { extra: () => (G.state.home || {}).log });
  // ---------- the ship fight (fightui.js): its panels, a move of each kind, every order, and each end, from states set by hand; last, so the
  // foes it makes do not move the ids above ----------
  if (!window.__only || /scene:fight/.test(window.__only)) {
    const rec = { id: 'scene:fight', plays: [] };
    try {
      const panel = ev => rec.plays.push({ title: ev.title, read: ev.read, text: ev.text, labels: ev.choices.map(c => String(c.label)) });
      const orders = (o = {}) => ({ guns: [{ foe: 0, part: 'weapons' }], torp: null, pdc: 'fire', ...o });
      const start = (shipId, o = {}, kind = 'pirate') => { fresh(); hired().raidTold = true; G.state.day += o.day || 0; G.nextEvent = null; startShipFight({ kind, gov: 'Arcology Compact', shipId }, false, o); const ev = G.nextEvent; G.nextEvent = null; return ev; };
      const turn = (s, o, foe, captain = { kind: 'hold' }) => {  // one Fire with the moves set; what it shows next, or the scene it queued and what it left
        const cap = person(hired().captain), m0 = (cap.memories || []).length;
        s.shown = { foe: s.state.foes.map(() => foe), captain }; G.nextEvent = null;
        const ev = fireTurn(s, o), next = G.nextEvent; G.nextEvent = null;
        rec.plays.push({ log: s.state.log.slice(-1)[0], next: next && { title: next.title, text: next.text, labels: next.choices.map(c => String(c.label)) }, mem: (cap.memories || []).slice(m0) });
        if (ev) panel(ev);
      };
      for (const shipId of ['raider', 'corsair', 'cutter']) for (const day of [0, 1]) panel(start(shipId, { day }));  // the openings, by style and by the day
      panel(start('raider', { edge: 1 })); panel(start('raider', { edge: -1 }));  // the head start, each way
      // her moves, two of her, and the captain's: shown on the panel before they are made
      for (const [foe, captain] of [[{ kind: 'broadside', target: 'weapons', dmg: [10, 18] }, { kind: 'close' }], [{ kind: 'pin', target: 'drive', dmg: [8, 14] }, { kind: 'open' }], [{ kind: 'board' }, { kind: 'hold' }], [{ kind: 'break' }, { kind: 'hold' }], [{ kind: 'close', target: 'hull', dmg: [10, 17] }, { kind: 'hold' }]]) {
        const s = start('raider').fight; s.state.foes.push(JSON.parse(JSON.stringify(s.state.foes[0]))); s.shown = { foe: [foe, foe], captain };
        panel(shipFightEvent(s, orders()));
      }
      // every order: a gun at each part and holding, the torpedo, the turret both ways, and Fire over the heat cap
      { fresh(); hired().raidTold = true; G.state.outfits = { launcher: 1, pdc: 1 }; G.state.torpedoes = 2; G.nextEvent = null; startShipFight({ kind: 'pirate', shipId: 'raider' }, false); const s = G.nextEvent.fight; G.nextEvent = null;
        panel(shipFightEvent(s, orders({ guns: [{ foe: 0, part: 'lock' }, null], torp: { foe: 0, part: 'hull' }, pdc: 'hold' })));
        panel(shipFightEvent(s, orders({ guns: [{ foe: 0, part: 'drive' }, { foe: 0, part: 'hull' }] })));
        s.state.heat = 4; panel(shipFightEvent(s, orders({ guns: [{ foe: 0, part: 'drive' }, { foe: 0, part: 'hull' }] }))); s.state.heat = 0;
        turn(s, orders({ guns: [null, null], torp: { foe: 0, part: 'hull' } }), { kind: 'broadside', target: 'hull', dmg: [10, 10] });  // the torpedo, and her hit
        turn(s, orders({ guns: [null, null] }), { kind: 'hold' });  // nobody fires
        s.state.foes[0].parts.lock.hp = 0; turn(s, orders({ guns: [{ foe: 0, part: 'lock' }, null] }), { kind: 'hold' });  // a shot at a part already gone
        const consort = JSON.parse(JSON.stringify(s.state.foes[0])); s.state.foes[0].parts.weapons.hp = 0; s.state.foes[0].parts.drive.hp = 0; s.state.foes.push(consort); s.pack = true;
        turn(s, orders({ guns: [{ foe: 0, part: 'hull' }, null], torp: { foe: 0, part: 'hull' } }), { kind: 'hold' });  // the lead crippled: the gun and the torpedo go to her consort
      }
      // each end, by style: she breaks off, she is crippled, she boards, she is lost astern, the standoff near and far, and the hull gone
      for (const shipId of ['raider', 'corsair', 'cutter']) {
        let s = start(shipId).fight; s.state.foes[0].armor = 5; s.state.foes[0].shields = 0; turn(s, orders({ guns: [null] }), { kind: 'break' });
        s = start(shipId).fight; s.state.band = 0; turn(s, orders(), { kind: 'board' });
        s = start(shipId).fight; s.state.me.speed = 1e6; s.state.band = RANGE_BANDS.length - 1; turn(s, orders(), { kind: 'close' }, { kind: 'open' });
        s = start(shipId).fight; s.state.foes[0].parts.weapons.hp = 0; s.state.foes[0].parts.drive.hp = 0; turn(s, orders(), { kind: 'hold' });
      }
      { const s = start('raider', {}, 'patrol').fight; s.state.foes[0].parts.weapons.hp = 0; s.state.foes[0].parts.drive.hp = 0; turn(s, orders(), { kind: 'hold' }); }  // a navy ship crippled breaks off
      for (const band of [0, RANGE_BANDS.length - 1]) { const s = start('raider').fight; s.state.band = band; s.state.turn = FIGHT.TURNS - 1; turn(s, orders({ guns: [null] }), { kind: 'hold' }); }
      { const s = start('raider').fight; s.state.me.shields = 0; s.state.me.armor = 1; turn(s, orders({ guns: [null] }), { kind: 'broadside', target: 'hull', dmg: [10, 10] }); }
      // the deck fight (deckFightEvent, #786): on our deck and hers, each with the cargo bay, the hand in each section and their move into each; a hold, a way round
      // and a veteran's feint; every choice it offers; and a turn of each kind of line, from states set by hand
      const deckPanel = ev => rec.plays.push({ title: ev.title, read: ev.read, text: ev.text, labels: ev.choices.map(c => String(c.label)), group: ev.choices.map(c => c.group).filter(Boolean) });
      const deck = (assault, o = {}) => { fresh(); hired().raidTold = true; const foe = makeEnemy({ kind: 'pirate' }), s = assault ? assaultStart(foe) : repelStart({ foe, foeHp: 0, init: 'foe' }, 'full'); s.state = deckFight({ boarders: 4, crew: 4, cover: [1, 2, 1, 1], assault, side: true, ...o }); return s; };
      const deckLog = (s, plan, shown) => { s.shown = { feint: false, ...shown }; seq([0.01, 0.99, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.99]); const e = deckFightEvent(s, plan); const next = e.choices[e.choices.length - 1].run(); rec.plays.push({ log: s.state.log.slice(-1)[0], end: !next, ...(next ? {} : { close: G.nextEvent && G.nextEvent.text }) }); G.nextEvent = null; };
      for (const assault of [false, true]) {
        for (const hand of [0, 1, 2, 3]) { const s = deck(assault); s.state.hand = hand; s.shown = { kind: 'push', from: 0, to: hand, n: 2, feint: false }; deckPanel(deckFightEvent(s)); }
        { const s = deck(assault); s.shown = { kind: 'round', from: 0, to: 3, n: 2, feint: false }; deckPanel(deckFightEvent(s)); s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false }; deckPanel(deckFightEvent(s)); }
        { const s = deck(assault, { grade: 1 }); s.shown = { kind: 'push', from: 0, to: 1, n: 2, feint: false }; deckPanel(deckFightEvent(s)); }
        { const s = deck(assault); s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false }; let ev = deckFightEvent(s);  // each choice goes round: the hand's place, the act, the order
          for (let i = 0; i < 3; i++) { ev = ev.choices[0].run(); deckPanel(ev); }
          for (let i = 0; i < 3; i++) { ev = ev.choices[1].run(); deckPanel(ev); }
          const at = ev.choices.findIndex(c => c.order); if (at >= 0) { ev = ev.choices[at].run(); deckPanel(ev); } }
        // a turn of each kind: their push and the trade where both stand; our advance on her deck; the hand left alone with them, who falls back; and a turn where nobody gives
        { const s = deck(assault); deckLog(s, {}, assault ? { kind: 'hold', from: 0, to: 0, n: 0 } : { kind: 'push', from: 0, to: 1, n: 4 }); }
        { const s = deck(assault); s.state.sections[1] = { mine: 0, theirs: 5, cover: 1 }; s.state.hand = 1; deckLog(s, { stand: 1 }, { kind: 'hold', from: 1, to: 1, n: 0 }); }
        { const s = deck(assault); s.state.sections.forEach(x => { x.mine = 0; x.theirs = 0; }); s.state.sections[0].mine = 1; s.state.sections[1].theirs = 4; s.state.began = 4; deckLog(s, {}, { kind: 'hold', from: 0, to: 0, n: 0 }); }
        // a steady act and an order where nobody of theirs stands, and the last turn of the cap, where the attackers withdraw
        { const s = deck(assault); s.state.sections.forEach(x => { x.mine = 0; x.theirs = 0; }); s.state.sections[0].mine = 1; s.state.sections[1].theirs = 4; s.state.began = 4;
          s.state.used.cover = true; const o = repelOrders(s, true)[0]; deckLog(s, { act: 'steady', order: o && o.id }, { kind: 'hold', from: 0, to: 0, n: 0 }); }
        { const s = deck(assault), S = s.state.sections; S.forEach(x => { x.mine = 0; x.theirs = 0; });
          if (assault) { S[1].mine = 2; S[2].theirs = 3; s.state.hand = 1; } else { S[1].theirs = 2; S[2].mine = 3; s.state.hand = 2; }
          s.state.began = 5; s.state.turn = DECK.TURNS - 1; deckLog(s, {}, { kind: 'hold', from: 1, to: 1, n: 0 }); }
      }
    } catch (err) { rec.error = String(err && err.stack || err); }
    out.push(rec);
  }
  return out;
};

module.exports = { playScenes };
