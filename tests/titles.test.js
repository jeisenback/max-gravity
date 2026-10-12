'use strict';

// The words that name a place or a faction keep their capitals and their articles (#558, #559).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a contract title keeps the capitals of the place it names (#559)', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', credits: 5000 });
    while (G.dialog) finishEvent();
    G.state.rep[localGov()] = 40;
    const found = [];
    for (let i = 0; i < 40 && found.length < 5; i++) for (const o of generateMissions(currentPlanet())) if (o.contract) found.push({ title: o.title, dest: o.destPlanet });
    return found;
  });
  await g.done();
  assert.ok(r.length >= 3, `${r.length} contracts`);
  for (const c of r) {
    assert.ok(c.title.includes(` to ${c.dest}`), `${c.title} names ${c.dest}`);
    assert.match(c.title, /contract: [a-z]/, 'the job starts in lower case after the colon');
  }
});

test('no line puts an article in front of a faction name, and none says "a the" (#558)', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const govs = ['Arcology Compact', 'Dome Concord', 'Charter League', 'Pirate'], lines = [];
    for (const a of govs.slice(0, 3)) for (const b of govs.slice(0, 3)) if (a !== b) for (const t of INCIDENTS) lines.push({ where: 'incident', text: t.replace(/\{a\}/g, a).replace(/\{b\}/g, b).replace('{s}', 'Ceres') });
    for (const id of ['scene:customs', 'scene:war-call']) for (const [key, t] of Object.entries(SCENE_LINES[id])) {
      if (typeof t !== 'string' || !t.includes('{faction}')) continue;
      for (const f of govs) lines.push({ where: `${id} ${key}`, text: t.replace(/\{faction\}/g, shortFaction(f)) });
    }
    return lines;
  });
  await g.done();
  assert.ok(r.length >= 80, `${r.length} lines`);
  const bad = r.filter(l => /\b[Aa]n? the\b|\b[Aa] Arcology|\b[Aa]n (Dome|Charter)/.test(l.text));
  assert.deepEqual(bad.map(l => `${l.where}: ${l.text.slice(0, 70)}`), []);
});
