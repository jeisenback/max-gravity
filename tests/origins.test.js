'use strict';

// The generated crew's place and circumstance (#871, docs/superpowers/specs/2026-11-03-crew-origins-design.md): the draw, the lookup, and each city's scenes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const hand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); };
const crewFrom = home => { const p = makePerson('earth'); p.home = home; registerPerson(p); return p; };

test('an Earth crew member draws one of the four cities and a circumstance, Ceres, Luna, Mars, Hermes Foundry and Phobos Yards draw their own, and others none', async () => {
  const { ev, done } = await open();
  const r = await ev(([h, c]) => { (0, eval)(`(${h})`)(); const crewFrom = (0, eval)(`(${c})`);
    const earth = Array.from({ length: 12 }, () => originOf(crewFrom('Earth')));
    return { earth, ceres: originOf(crewFrom('Ceres Station')), luna: originOf(crewFrom('Luna')), mars: originOf(crewFrom('Mars')), hermes: originOf(crewFrom('Hermes Foundry')), phobos: originOf(crewFrom('Phobos Yards')), europa: originOf(crewFrom('Europa')), titan: originOf(crewFrom('Titan')) };
  }, [hand.toString(), crewFrom.toString()]);
  await done();
  for (const o of r.earth) assert.match(o, /^(lisbon:(wall|oldcity)|lagos:(mainland|ring)|rotterdam:(southbank|polders)|chittagong:(hills|floors))$/, o);
  assert.ok(new Set(r.earth.map(o => o.split(':')[0])).size >= 2, 'more than one city is drawn');
  assert.match(r.ceres, /^ceres:(member|renter)$/);
  assert.match(r.luna, /^luna:(licensed|dust)$/); assert.match(r.mars, /^mars:(hub|edge)$/); assert.match(r.hermes, /^hermes:(quarters|fins)$/); assert.match(r.phobos, /^phobos:(shipwright|docks)$/);  // #885
  assert.equal(r.europa, null); assert.equal(r.titan, null);  // a place not yet written
});

test('the origin is drawn once, without Math.random, and kept through a save', async () => {
  const { ev, done } = await open();
  const r = await ev(([h, c]) => { (0, eval)(`(${h})`)(); const crewFrom = (0, eval)(`(${c})`);
    const p = crewFrom('Earth'); G.state.crew.push(p.id); const real = Math.random; let first;
    Math.random = () => { throw new Error('the draw rolled'); };
    try { first = originOf(p); } finally { Math.random = real; }
    const again = originOf(p); save(); loadGame();
    return { first, again, kept: G.state.people[p.id].origin };
  }, [hand.toString(), crewFrom.toString()]);
  await done();
  assert.ok(r.first); assert.equal(r.again, r.first); assert.equal(r.kept, r.first);
});

test('a cast character draws no origin', async () => {
  const { ev, done } = await open();
  const r = await ev(h => { (0, eval)(`(${h})`)(); return originOf(castPerson('ines')); }, hand.toString());
  await done();
  assert.equal(r, null);
});

test('the lookup prefers a cast\'s lines, then the module\'s, then the template', async () => {
  const { ev, done } = await open();
  const r = await ev(([h, c]) => { (0, eval)(`(${h})`)(); const crewFrom = (0, eval)(`(${c})`);
    const p = crewFrom('Earth'); p.origin = 'lisbon:wall';
    const had = PEOPLE_LINES['family:lisbon-wall-home']; PEOPLE_LINES['family:lisbon-wall-home'] = { title: 'x' };
    const withModule = sitLines(p, 'home'); delete PEOPLE_LINES['family:lisbon-wall-home'];
    const without = sitLines(p, 'home'); if (had) PEOPLE_LINES['family:lisbon-wall-home'] = had;
    return { withModule, without, ines: sitLines(castPerson('ines'), 'home') };
  }, [hand.toString(), crewFrom.toString()]);
  await done();
  assert.equal(r.withModule, 'lisbon-wall-home'); assert.equal(r.without, 'story-home'); assert.equal(r.ines, 'ines-home');
});

test('an old story keeps what it said', async () => {
  const { ev, done } = await open();
  const r = await ev(([h, c]) => { (0, eval)(`(${h})`)(); const crewFrom = (0, eval)(`(${c})`);
    const p = crewFrom('Earth'); p.story = { left: 'x', rel: 'y', name: 'Z', hope: 'z', beat: 1 };
    originOf(p); const s = storyOf(p); return { left: s.left, rel: s.rel, hope: s.hope, origin: p.origin };
  }, [hand.toString(), crewFrom.toString()]);
  await done();
  assert.deepEqual([r.left, r.rel, r.hope], ['x', 'y', 'z']); assert.ok(r.origin);
});

// Each city's scenes (Tasks 3 to 7): every module beat has its table, a module's sittings name nothing but {n}, and the city's visit and room tables
// exist (they may use the shared scenes' {n}, {who}, {rel}, {hope}, and fall back key by key to the shared scenes for the rest).
const cityScenes = city => async () => {
  const { ev, done } = await open();
  const r = await ev(c => {
    const kinds = ORIGINS[c].kinds, out = { missing: [], blanks: [], place: [] };
    for (const k of kinds) for (const beat of ['home', 'picture', 'hope', 'story']) {
      const t = PEOPLE_LINES[`family:${c}-${k}-${beat}`];
      if (!t) { out.missing.push(`${c}-${k}-${beat}`); continue; }
      for (const [key, v] of Object.entries(t)) if (/\{(?!n\})\w+\}/.test(v)) out.blanks.push(`${c}-${k}-${beat} ${key}`);
    }
    for (const id of ['visit-home', 'room-offer', 'room-return']) for (const t of [c, ...kinds.map(k => `${c}-${k}`)]) { const lines = PEOPLE_LINES[`family:${id}-${t}`]; if (!lines) out.place.push(`${id}-${t}`); else for (const [key, v] of Object.entries(lines)) if (/\{(?!(n|who|rel|hope)\})\w+\}/.test(v)) out.blanks.push(`${id}-${t} ${key}`); }  // the city's titles and each circumstance's own place
    return out;
  }, city);
  await done();
  assert.deepEqual(r.missing, [], 'every beat has its table'); assert.deepEqual(r.place, [], 'the city has its visit and room'); assert.deepEqual(r.blanks, [], 'no blanks');
};
test('Lisbon\'s scenes are whole', cityScenes('lisbon'));
test('Lagos\'s scenes are whole', cityScenes('lagos'));
test('Rotterdam\'s scenes are whole', cityScenes('rotterdam'));
test('Chittagong\'s scenes are whole', cityScenes('chittagong'));
test('Ceres\'s scenes are whole', cityScenes('ceres'));

test('a story made before its place was written keeps the shared scenes: no place lines contradict it', async () => {
  const { ev, done } = await open();
  const r = await ev(([h, c]) => { (0, eval)(`(${h})`)(); const crewFrom = (0, eval)(`(${c})`);
    const old = crewFrom('Earth'); old.story = { left: 'x', rel: 'brother', name: 'Ana', hope: 'z', beat: 0, favor: 'visit', debt: 9000 };
    const fresh = crewFrom('Earth');
    return { old: sitLines(old, 'home'), oldVisit: placeTables(old, 'visit-home'), fresh: sitLines(fresh, 'home'), freshModule: storyOf(fresh).module };
  }, [hand.toString(), crewFrom.toString()]);
  await done();
  assert.equal(r.old, 'story-home'); assert.deepEqual(r.oldVisit, ['visit-home']);
  assert.match(r.fresh, /^(lisbon|lagos|rotterdam|chittagong)-\w+-home$/); assert.ok(r.freshModule);
});
test('Hermes Foundry\'s scenes are whole', cityScenes('hermes'));
test('Luna\'s scenes are whole', cityScenes('luna'));
test('Mars\'s scenes are whole', cityScenes('mars'));
test('Phobos Yards\'s scenes are whole', cityScenes('phobos'));
