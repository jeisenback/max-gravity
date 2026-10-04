'use strict';

// The main characters are a pool, drawn two to a game, like the captains (js/cast.js): not a pair for each start background.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a draw is two different main characters from the pool, of different posts where it can, and every one of them can come up', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    const seen = {}, bad = [];
    for (let i = 0; i < 300; i++) {
      const [a, b] = realDrawCastPair();
      seen[a] = (seen[a] || 0) + 1; seen[b] = (seen[b] || 0) + 1;
      if (!a || !b || a === b || CAST[a].xo || CAST[b].xo) bad.push([a, b]);
      else if (CAST[a].role === CAST[b].role && castPool().some(k => k !== a && CAST[k].role !== CAST[a].role)) bad.push(['same post', a, b]);
    }
    return { bad, seen, pool: castPool() };
  });
  assert.deepEqual(r.bad, []); assert.ok(r.pool.length >= 6);
  for (const k of r.pool) assert.ok(r.seen[k] > 20, `${k} comes up (${r.seen[k]})`);
  await done();
});

test('a hired game takes its pair from the draw, whatever the start background, and keeps it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    window.drawCastPair = realDrawCastPair;
    const pairs = new Set(), out = { aboard: true, kept: true };
    for (let i = 0; i < 12; i++) {
      __seed(i + 1);
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent();
      const st = G.state, pair = [...st.castPair], aboard = castAboard().map(c => c.cast).filter(k => !CAST[k].xo).sort();
      pairs.add(pair.join('+'));
      if (JSON.stringify(aboard) !== JSON.stringify([...pair].sort())) out.aboard = false;
      if (JSON.stringify(castPair()) !== JSON.stringify(pair)) out.kept = false;
    }
    out.pairs = pairs.size; out.notEarth = [...pairs].some(p => !/ines|tomas/.test(p));
    return out;
  });
  assert.ok(r.aboard, 'the pair drawn is the pair aboard'); assert.ok(r.kept); assert.ok(r.pairs >= 4, `${r.pairs} different pairs in 12 games`); assert.ok(r.notEarth, 'an earth start is not always Ines and Tomas');
  await done();
});

test('a game saved before the draw keeps the pair it had, and an owner meets the drawn pair in order', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    window.drawCastPair = realDrawCastPair;
    startGame({ slot: 1, background: 'mars', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    const st = G.state, out = {};
    st.cast = { yelena: { arc: 0, flags: {}, next: 0 } };  // a save from before: a main character on the books, and no draw
    delete st.castPair;
    out.legacy = castPair().join('+');
    delete st.cast; delete st.castPair; st.tutorial = null; st.day = 5;
    const keys = castPair(); out.n = keys.length; out.first = castDue() === keys[0];
    return out;
  });
  assert.equal(r.legacy, 'yelena+ruben'); assert.equal(r.n, 2); assert.ok(r.first, 'the first of the pair is who the owner meets first');
  await done();
});
