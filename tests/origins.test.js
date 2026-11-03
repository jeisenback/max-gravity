'use strict';

// The generated crew's place and circumstance (#871, docs/superpowers/specs/2026-11-03-crew-origins-design.md): the draw, the lookup, and each city's scenes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const hand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); };
const crewFrom = home => { const p = makePerson('earth'); p.home = home; registerPerson(p); return p; };

test('an Earth crew member draws one of the four cities and a circumstance, a Ceres one draws Ceres, and others none', async () => {
  const { ev, done } = await open();
  const r = await ev(([h, c]) => { (0, eval)(`(${h})`)(); const crewFrom = (0, eval)(`(${c})`);
    const earth = Array.from({ length: 12 }, () => originOf(crewFrom('Earth')));
    return { earth, ceres: originOf(crewFrom('Ceres Station')), luna: originOf(crewFrom('Luna')), mars: originOf(crewFrom('Mars')) };
  }, [hand.toString(), crewFrom.toString()]);
  await done();
  for (const o of r.earth) assert.match(o, /^(lisbon:(wall|oldcity)|lagos:(mainland|ring)|rotterdam:(southbank|polders)|chittagong:(hills|floors))$/, o);
  assert.ok(new Set(r.earth.map(o => o.split(':')[0])).size >= 2, 'more than one city is drawn');
  assert.match(r.ceres, /^ceres:(member|renter)$/); assert.equal(r.luna, null); assert.equal(r.mars, null);
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
