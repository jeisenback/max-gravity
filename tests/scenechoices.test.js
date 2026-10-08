'use strict';

// Every choice of the scenes that are drawn or built from the state, not authored one by one (#395): the transit events, the
// warning and the split, customs and the friend at the dock, a boarding, the sit-downs and occasions, the traditions and the cat,
// and the relationship scenes. Each choice runs on a low roll and a high one and must say what happened in plain text, with nothing
// thrown. The wording is not checked here (docs/prose-style.md). A choice a state cannot reach is counted in `shut`, not skipped quietly.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (post = 'gunner') => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; st.tutorial = null; return st; };
  // A made person with the ties wanted, found by drawing until one fits (ties.test.js).
  window.find = (pred, role = 'cook') => { for (let i = 0; i < 600; i++) { const p = makePerson('earth'); p.role = role; p.skill = 1; registerPerson(p); if (pred(tiesOf(p), p)) { G.state.crew.push(p.id); return p; } } throw new Error('no such person'); };
  // The rolls: every die in the bottom tenth, then the top one, but varying, so a draw that retries for a new value ends. (A draw that picks
  // two different things from a short list needs the whole range: span 1.)
  window.rolled = (base, fn, span = 0.099, seed = 12345) => { const real = Math.random; Math.random = () => base + span * ((seed = (seed * 16807) % 2147483647) / 2147483647); try { return fn(); } finally { Math.random = real; } };
  window.report = { bad: [], played: 0, shut: [] };
  const clean = (at, e, ch, text) => {
    if (typeof text !== 'string' || text.length < 20 || /undefined|NaN|\[object|\{[a-z]+\}/.test(e.title + e.text + ch.label.replace(/\{crew\}/g, '') + text)) report.bad.push(`${at} (${e.title}): ${String(text).slice(0, 80)}`);
  };
  // Play every choice of an event on the state as it stands, and the scenes they lead into.
  window.playEvent = (e, at, depth = 0) => {
    e.choices.forEach((ch, j) => {
      if (ch.can && !ch.can()) { report.shut.push(`${at}.${j}`); return; }
      G.state.credits = Math.max(G.state.credits, 5000); G.dialog = { event: e, choices: e.choices }; G.nextEvent = null; const before = G.state;
      let text;
      try { text = chooseEvent(j); } catch (err) { report.bad.push(`${at}.${j}: threw ${err}`); return; }
      report.played++; if (text === null && G.state !== before) return;  // a choice that begins a new game says nothing
      clean(`${at}.${j}`, e, ch, text);
      const next = G.nextEvent; G.nextEvent = null;
      if (next && depth < 4) playEvent(next, `${at}.${j}`, depth + 1);
    });
  };
  // A scene built fresh for each choice: build() sets the state up and returns the event, or null.
  window.playBuilt = (build, at) => {
    for (const base of [0, 0.9]) {
      const n = rolled(base, () => { const e = build(); return e ? e.choices.length : 0; });
      if (!n) report.bad.push(`${at}: not built`);
      for (let j = 0; j < n; j++) rolled(base, () => {
        const e = build(); if (!e || !e.choices[j]) return;
        const ch = e.choices[j];
        if (ch.can && !ch.can()) { report.shut.push(`${at}.${j}`); return; }
        G.state.credits = Math.max(G.state.credits, 5000); G.dialog = { event: e, choices: e.choices }; G.nextEvent = null;
        const before = G.state; let text;
        try { text = chooseEvent(j); } catch (err) { report.bad.push(`${at}.${j}: threw ${err}`); return; }
        report.played++; if (text === null && G.state !== before) return;
        clean(`${at}.${j}`, e, ch, text);
        const next = G.nextEvent; G.nextEvent = null;
        if (next) playEvent(next, `${at}.${j}`, 1);
      });
    }
  };
  // A scene that is drawn: draw it many times, and play every choice of each draw. Which scene is drawn takes the whole range of rolls, so
  // the draws run over four seeds; the extremes would pick the same one each time.
  window.playDrawn = (draw, at, times) => {
    for (const seed of [11, 22, 33, 44]) rolled(0, () => { for (let i = 0; i < times; i++) { const e = draw(i); if (e) playEvent(e, `${at}:${e.title}`); } }, 1, seed);
  };
};

const run = async (fn, scope = 'earth-hired') => {
  const t = await open({ scope });
  await t.ev(helpers);
  const r = await t.ev(fn);
  await t.done();
  return r;
};

test('every transit event, whichever way it goes', async () => {
  const r = await run(() => {
    for (const d of TRANSIT_EVENTS) {
      playBuilt(() => {
        const st = start('pilot'); uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
        st.credits = 5000; st.fuel = ship().fuel; st.cargo = { food: 5, luxury: 3 }; st.day += 1;
        return { ...d, choices: d.choices.map(c => ({ ...c })) };
      }, d.title);
    }
    return { ...report, count: TRANSIT_EVENTS.length };
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.shut, []);
  assert.equal(r.count, 7, 'the transit events (a new one is noticed here)');
});

test('the captain\'s terms, the split, customs and the friend at the dock', async () => {
  const r = await run(() => {
    playBuilt(() => { const st = start(); const h = hired(); h.warned = false; person(h.captain).opinion = -2; return warningScene(); }, 'warning');
    playBuilt(() => {
      const st = start(), crew = folk().filter(f => f.crew && !f.p.cast), [a, b] = crew;
      addBond(a, b, -9); st.feuds = { [bondKey(a, b)]: 1 }; st.relAt = {};
      return splitScene();
    }, 'split');
    // Customs: someone the port's faction wants (Ines is an exile from the Coalition), and the ship's papers, an officer aboard, a patrol.
    playBuilt(() => { const st = start(), ines = castPerson('ines'); if (!st.crew.includes(ines.id)) st.crew.push(ines.id); st.customs = {}; return customsScene('Earth Coalition', currentPlanet()); }, 'customs');
    playBuilt(() => { const st = start(); find(t => t.status['Earth Coalition'] === 'wanted'); st.customs = {}; return customsScene('Earth Coalition', currentPlanet(), true); }, 'customs.patrol');
    playBuilt(() => {
      const st = start(); find(t => t.status['Earth Coalition'] === 'officer'); find(t => t.status['Earth Coalition'] === 'wanted'); st.customs = {};
      return customsScene('Earth Coalition', currentPlanet(), true);
    }, 'customs.officer');
    playBuilt(() => { const st = start(); find(t => t.status['Earth Coalition'] === 'officer'); return dockFriendScene('Earth Coalition', currentPlanet()); }, 'dock friend');
    // Word from home: a war, and one of the crew a member or an officer of a side in it, as the port offers it.
    for (const status of ['member', 'officer']) {
      playBuilt(() => {
        const st = start(); st.day += 5; find(t => t.status['Earth Coalition'] === status);
        factionState().war = { a: 'Earth Coalition', b: 'Mars Republic', start: st.day, until: st.day + 40, score: { 'Earth Coalition': 0, 'Mars Republic': 0 } };
        for (const c of Mods.filter('happenings', [], 'port', currentPlanet())) { const e = typeof c.make === 'function' && c.make(); if (e && e.title === 'Word From Home') return e; }
        return null;
      }, `war call.${status}`);
    }
    return report;
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.shut, [], 'every choice is reachable in the state built for it');
});

test('a boarding, from out of range, as a hand and as the pirate or the trader', async () => {
  const r = await run(() => {
    const foeOf = kind => ({ name: 'Test', kind, shipId: 'freighter', armor: 10, maxArmor: 40, x: 0, y: 0, vx: 0, vy: 0, disabled: true, captain: 'Voss' });
    const near = { x: 0, y: 0, vx: 0, vy: 0 }, far = { x: 9000, y: 0, vx: 0, vy: 0 };
    const was = G.player;
    for (const [at, kind, player] of [['far', 'pirate', far], ['pirate', 'pirate', near], ['trader', 'trader', near]]) {
      playBuilt(() => { const st = start(); st.cargo = {}; G.player = { ...G.player, ...player }; return boardingEvent(foeOf(kind)); }, `boarding.${at}`);
    }
    G.player = was;
    return report;
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.shut, [], 'every choice is reachable in the state built for it');
});

test('the sit-downs, the occasions, the traditions and the cat, over the whole crew', async () => {
  const r = await run(() => {
    const st = start();
    const folks = () => procedural().map(f => f.p);
    playDrawn(i => { const ps = folks(); const p = ps[i % ps.length]; storyOf(p).beat = i % 7; p.mood = i % 5 === 0 ? { kind: 'low', text: 'a letter that hurt', until: st.day + 5 } : null; return sitBeat(p, true); }, 'sitBeat', 60);
    playDrawn(i => { const ps = folks(); return ordinaryTalk(ps[i % ps.length]); }, 'talk', 40);
    playDrawn(i => { const ps = folks(); st.cargo = { luxury: 10 }; return occasionEvent({ kind: i % 2 ? 'birthday' : 'holiday', h: HOLIDAYS ? HOLIDAYS[0] : undefined, id: ps[i % ps.length].id, day: st.day + 1, year: 2100 }); }, 'occasion', 12);
    playDrawn(() => { home().proposed = []; return traditionEvent(); }, 'tradition', Object.keys(TRADITIONS).length);
    playDrawn(() => catEvent(), 'cat', 3);
    return { ...report, traditions: Object.keys(TRADITIONS).length };
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.shut, [], 'every choice is reachable in the state built for it');
});

test('the relationship scenes, the cover for a watch, and the books, matches and broadcasts of the downtime', async () => {
  const r = await run(() => {
    const st = start(); uatBurn('Ceres Station', 'pallas');  // downtime is on the burn
    playDrawn(() => { st.qualities = {}; st.relAt = {}; st.day += 3; return relationshipScene(); }, 'relationship', 150);
    const posted = procedural().map(f => f.p).filter(p => postOfRole(p.role));
    playDrawn(i => coverWatchScene(posted[i % posted.length]), 'cover', 6);
    const item = (title, it) => ({ title, text: title, personal: true, choices: [it] });
    for (const seed of [11, 22, 33]) rolled(0, () => {
      for (const offset of [0, 90, 180, 270]) {
        st.day += offset;
        BOOKS.forEach(b => playEvent(item(b.title, readBook(b)), `book:${b.title}`));
        LEAGUES.forEach(l => playEvent(item(l.name, streamMatch(l)), `league:${l.name}`));
        BROADCASTS.forEach(b => playEvent(item(b.title, watchBroadcast(b)), `broadcast:${b.title}`));
      }
    }, 1, seed);
    return report;
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.shut, [], 'every choice is reachable in the state built for it');
});

test('feuds and a word in private, as a hand and as a captain, and the favors a crew member asks', async () => {
  const r = await run(() => {
    const crewUp = () => { for (let i = 0; i < 3; i++) { const p = makePerson('earth'); p.role = 'cook'; p.skill = 1; registerPerson(p); G.state.crew.push(p.id); } };
    const st = start(); crewUp(); uatBurn('Ceres Station', 'pallas');  // these come up on the burn
    // A pair that dislikes each other, then one that likes each other (the word is asked the other way).
    for (const [at, to] of [['feud', -6], ['word', 5]]) {
      playDrawn(() => {
        for (const [a, b] of pairs(folk().filter(f => f.crew))) addBond(a, b, to - bond(a, b));
        st.qualities = {}; st.relAt = {}; st.day += 60;
        return relationshipScene();
      }, at, 80);
    }
    // The favors: a debt, and a visit home, at the third beat of someone's story.
    st.cargo = { luxury: 10 };  // the rolled ones: the main characters have stories of their own
    for (const favor of ['debt', 'visit']) {
      playDrawn(i => { const ps = procedural().map(f => f.p).filter(q => !q.cast); const p = ps[i % ps.length], s = storyOf(p); p.home = currentPlanet().name; s.beat = 3; s.favor = favor; s.debt = 900; return sitBeat(p, true); }, `favor.${favor}`, 6);
    }
    return report;
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.shut, [], 'every choice is reachable in the state built for it');
});

test('the same feuds and words in an owner\'s game, where the captain is asked and the scene reads for the one in charge', async () => {
  const r = await run(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'owner' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.day += 30;
    for (let i = 0; i < 3; i++) { const p = makePerson('earth'); p.role = 'cook'; p.skill = 1; registerPerson(p); st.crew.push(p.id); }
    uatBurn('Ceres Station', 'pallas');
    const titles = new Set();
    for (const [at, to] of [['feud', -6], ['word', 5]]) {
      playDrawn(() => {
        for (const [a, b] of pairs(folk().filter(f => f.crew))) addBond(a, b, to - bond(a, b));
        st.qualities = {}; st.relAt = {}; st.day += 60;
        const e = relationshipScene(); if (e) titles.add(e.title);
        return e;
      }, `owner.${at}`, 80);
    }
    return { ...report, owner: !hired(), word: titles.has('A Word, Captain') };
  }, 'full');
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.shut, [], 'every choice is reachable in the state built for it');
  assert.ok(r.owner, 'this is an owner\'s game');
  assert.ok(r.word, 'the word in private is asked of the captain');
});

test('every tradition has its lines, the dock says whose ship you were put off, and the port and burn offer their scenes', async () => {
  const r = await run(() => {
    const st = start(), lines = [], bad = [];
    for (const base of [0, 0.9]) rolled(base, () => { for (const [id, T] of Object.entries(TRADITIONS)) for (let i = 0; i < 6; i++) lines.push([id, T.line()]); });
    for (const [id, text] of lines) if (typeof text !== 'string' || text.length < 20 || /undefined|NaN|\[object|\{[a-z]+\}/.test(text)) bad.push(`${id}: ${text}`);
    const carried = CARRIED.map(([id]) => carriedLine({ [id]: true }, 'Pell')).concat(carriedLine({}, 'Pell'));
    for (const t of carried) if (typeof t !== 'string' || !t.length || /undefined|NaN|\{[a-z]+\}/.test(t)) bad.push(`carried: ${t}`);
    // The scenes the faction ties offer, as the port and the burn draw them (a faction's wanted aboard, an officer on the dock).
    const ines = castPerson('ines'); if (!st.crew.includes(ines.id)) st.crew.push(ines.id);
    find(t => t.status['Earth Coalition'] === 'officer');
    st.day += 5; st.customs = {};
    const offered = [];
    for (const where of ['port', 'transit']) {
      if (where === 'transit') uatBurn('Ceres Station', 'pallas');
      for (const c of Mods.filter('happenings', [], where, currentPlanet())) { if (typeof c.make !== 'function') continue; st.customs = {}; const e = c.make(); offered.push(`${where}:${e ? e.title : null}`); if (e) playEvent(e, `${where}`); }
    }
    return { bad, traditions: Object.keys(TRADITIONS).length, carried: carried.length, offered, report };
  });
  assert.deepEqual(r.bad, []);
  assert.deepEqual(r.report.bad, []);
  assert.equal(r.carried, 5, 'four lines for what happened, and the plain one (a new line is noticed here)');
});
