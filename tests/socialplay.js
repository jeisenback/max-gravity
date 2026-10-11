'use strict';

// Plays the relationship scenes of js/social.js for the pin (socialpin.test.js) and the text layer's tests (#457). Not a test file. playSocial runs in the page: each setup puts
// two or three people aboard (their bond, homes, traits, who is crew and who is a passenger, an owner's game or a hired one) so that some scenes can come up, and
// relationshipScene is called from each of several seeds; for each scene that comes, the title, text and labels are recorded, and the line each choice returns on a good roll and on a
// bad one, with what it changed (credits, hull, the bond, each person's regard). welcomeBack is played the same way.
const playSocial = raw => {  // raw: every case, with the scenes that repeat (the pin keeps the first of each)
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  const newGame = hiredMode => {
    __seed(1);
    startGame(hiredMode ? { slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 } : { slot: 1, background: 'earth', captain: 'Sam Rowe', credits: 5000 });
    while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.day += 60; st.crew = []; st.bonds = {}; st.qualities = {}; st.relAt = {}; st.feuds = {}; st.missions = st.missions.filter(m => m.type !== 'passenger');
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit(); G.transit.times = [];  // in a burn, with a hull
    return G.state;
  };
  const mate = (st, first, over = {}) => { const c = makeCrewCandidate(st.systemId); Object.assign(c, { first, last: 'Vale', traits: ['kind', 'brave'], home: 'Mars', culture: 'mars', role: 'engineer', opinion: 0 }, over); registerPerson(c); st.crew.push(c.id); return c; };
  const guest = (st, first, over = {}, mission = {}) => { const c = makeCrewCandidate(st.systemId); Object.assign(c, { first, last: 'Rowe', traits: ['kind', 'brave'], home: 'Mars', culture: 'mars', opinion: 0 }, over); registerPerson(c); st.missions.push({ type: 'passenger', id: st.nextId++, pid: c.id, who: `${c.first} ${c.last}`, pax: 1, bonus: 0, destSystem: 'mars', destPlanet: 'Olympus Dome', title: 'Carry', pay: 1000, deadline: 99, ...mission }); return c; };
  const setBond = (st, a, b, n) => { st.bonds[[a.id, b.id].sort().join('|')] = n; };
  // two people of different teams in one league, found by looking: the match scenes need them
  const rivals = (st, traits = ['kind', 'brave']) => { for (let i = 0; i < 40; i++) { const a = mate(st, 'Ana', { home: 'Ceres Station', culture: 'belt', traits }), b = mate(st, 'Ben', { home: 'Ceres Station', culture: 'belt', traits }); const ta = tastes({ id: a.id, p: a }).team, tb = tastes({ id: b.id, p: b }).team; if (ta !== tb && leagueOf(ta) === leagueOf(tb)) return [a, b]; st.crew.length -= 2; } return null; };
  const SETUPS = {
    close7: st => { const a = mate(st, 'Ana'), b = mate(st, 'Ben', { culture: 'belt', home: 'Ceres Station' }); setBond(st, a, b, 7); },
    close3: st => { const a = mate(st, 'Ana'), b = mate(st, 'Ben', { culture: 'belt', home: 'Ceres Station' }); setBond(st, a, b, 3.5); },
    feud: st => { const a = mate(st, 'Ana', { traits: ['rude', 'brave'], home: 'Luna', culture: 'earth' }), b = mate(st, 'Ben', { traits: ['nervous', 'kind'], home: 'Ceres Station', culture: 'belt' }); setBond(st, a, b, -3); },
    cook: st => { const a = mate(st, 'Ana', { traits: ['rude', 'brave'], home: 'Luna', culture: 'earth' }), b = mate(st, 'Ben', { traits: ['nervous', 'kind'], home: 'Ceres Station', culture: 'belt' }); mate(st, 'Cora', { role: 'cook', home: 'Hellas', culture: 'mars' }); setBond(st, a, b, -3); },
    rootsHome: st => { mate(st, 'Ana', { home: 'Ceres Station', culture: 'belt' }); mate(st, 'Ben', { home: 'Ceres Station', culture: 'belt' }); },
    rootsCulture: st => { mate(st, 'Ana', { home: 'Ceres Station', culture: 'belt' }); mate(st, 'Ben', { home: 'Pallas', culture: 'belt' }); },
    tour: st => { mate(st, 'Ana', { home: 'Luna', culture: 'earth' }); guest(st, 'Ben', { home: 'Ceres Station', culture: 'belt' }); },
    tourNervous: st => { mate(st, 'Ana', { home: 'Luna', culture: 'earth' }); guest(st, 'Ben', { traits: ['nervous', 'kind'], home: 'Ceres Station', culture: 'belt' }); },
    match: st => { rivals(st); },
    matchRude: st => { rivals(st, ['rude', 'brave']); },
    word: st => { const a = mate(st, 'Ana', { home: 'Luna', culture: 'earth' }), b = mate(st, 'Ben', { home: 'Ceres Station', culture: 'belt' }); setBond(st, a, b, 1.5); },
    wordCold: st => { const a = mate(st, 'Ana', { home: 'Luna', culture: 'earth', traits: [] }), b = mate(st, 'Ben', { home: 'Ceres Station', culture: 'belt' }); setBond(st, a, b, -1.5); },
    hiredWord: st => { const a = mate(st, 'Ana', { home: 'Luna', culture: 'earth' }), b = mate(st, 'Ben', { home: 'Ceres Station', culture: 'belt' }); setBond(st, a, b, 1.5); },
    hiredWordCold: st => { const a = mate(st, 'Ana', { home: 'Luna', culture: 'earth', traits: [] }), b = mate(st, 'Ben', { home: 'Ceres Station', culture: 'belt' }); setBond(st, a, b, -1.5); },
    hiredCover: st => { mate(st, 'Ana', { home: 'Luna', culture: 'earth', role: 'pilot', opinion: 4 }); mate(st, 'Ben', { home: 'Ceres Station', culture: 'belt' }); },
  };
  const delta = (before, after) => { const d = {}; for (const k of new Set([...Object.keys(before), ...Object.keys(after)])) { const v = Math.round(((after[k] || 0) - (before[k] || 0)) * 1000) / 1000; if (v) d[k] = v; } return d; };
  const snapshotOf = st => ({ credits: st.credits, armor: G.player.armor, bonds: { ...st.bonds }, opinion: Object.fromEntries(Object.values(st.people).map(p => [p.first, p.opinion || 0])) });
  const effect = (b, a) => ({ credits: a.credits - b.credits, armor: a.armor - b.armor, bonds: delta(b.bonds, a.bonds), opinion: delta(b.opinion, a.opinion) });
  const play = (id, hiredMode, build, call, seeds) => {
    if (window.__only && !new RegExp(window.__only).test(id)) return;
    for (const seed of seeds) {
      const rec = { id, seed };
      try {
        const st0 = newGame(hiredMode); build(st0); const snap = JSON.stringify(G.state);
        const fresh = () => { G.state = JSON.parse(snap); G.nextEvent = null; G.dialog = null; G.player.armor = G.player.maxArmor; __seed(seed); };
        fresh(); const ev = call();
        if (!ev) { rec.none = true; out.push(rec); continue; }
        rec.title = ev.title; rec.text = ev.text; rec.labels = ev.choices.map(c => String(c.label)); rec.plays = [];
        for (let i = 0; i < ev.choices.length; i++) for (const roll of [0, 0.999]) {
          fresh(); const e2 = call(); const before = snapshotOf(G.state); seq([roll]);
          const text = e2.choices[i].run(); rec.plays.push({ i, roll, text: text === null || text === undefined ? null : String(text), d: effect(before, snapshotOf(G.state)) });
        }
      } catch (err) { rec.error = String(err && err.message || err); }
      out.push(rec);
    }
  };
  const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const MORE = { feud: 30, cook: 30, rootsHome: 40, rootsCulture: 40 };  // the scenes with several openers or causes come up often enough to show them all
  for (const [id, build] of Object.entries(SETUPS)) play(id, id.startsWith('hired'), build, () => relationshipScene(), MORE[id] ? Array.from({ length: MORE[id] }, (_, i) => i + 1) : SEEDS);
  // a regular back aboard: with nothing remembered, with a memory, and with friends among the crew
  const regular = (st, memory, friends) => { const g = guest(st, 'Pia', { memories: memory ? ['Day 3: You lent me a coat.'] : [] }, { regular: true }); if (friends) { const a = mate(st, 'Ana'), b = mate(st, 'Ben'); setBond(st, a, g, 3); setBond(st, b, g, 2); } else if (friends === false) mate(st, 'Ana'); };
  play('back:plain', false, st => regular(st, false, false), () => welcomeBack(), [1]);
  play('back:memory', false, st => regular(st, true, false), () => welcomeBack(), [1]);
  play('back:friend', false, st => { const g = guest(st, 'Pia', { memories: ['Day 3: You lent me a coat.'] }, { regular: true }); const a = mate(st, 'Ana'); setBond(st, a, g, 3); }, () => welcomeBack(), [1]);
  play('back:friends', false, st => regular(st, true, true), () => welcomeBack(), [1]);
  Math.random = real;
  // a scene that came up again as the same words with the same results adds nothing to the pin: keep the first of each (the seed and the setup say where it came from)
  if (raw) return out;
  const seen = new Set();
  return out.filter(r => { if (r.title === undefined) return true; const k = JSON.stringify([r.title, r.text, r.labels, r.plays]); if (seen.has(k)) return false; seen.add(k); return true; });
};

module.exports = { playSocial };
