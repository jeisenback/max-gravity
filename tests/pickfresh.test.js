'use strict';

// pickFresh (js/game.js) is pick for the pools the player meets often: the same single draw, but not one of the last lines drawn from the same pool.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a pool of five never gives one of its last three lines again, and gives every line in time', async () => {
  const g = await open();
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const pool = ['a', 'b', 'c', 'd', 'e'], out = [];
    for (let i = 0; i < 300; i++) out.push(pickFresh(pool));
    const repeats = out.filter((l, i) => out.slice(Math.max(0, i - 3), i).includes(l)).length;
    return { repeats, seen: [...new Set(out)].sort().join('') };
  });
  await g.done();
  assert.equal(r.repeats, 0);
  assert.equal(r.seen, 'abcde');
});

test('a pool of two alternates, a pool of one gives its line, and an empty pool gives nothing', async () => {
  const g = await open();
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const two = Array.from({ length: 20 }, () => pickFresh(['x', 'y'])), one = Array.from({ length: 5 }, () => pickFresh(['only']));
    return { twoSame: two.filter((l, i) => i && l === two[i - 1]).length, one: [...new Set(one)], none: pickFresh([]) };
  });
  await g.done();
  assert.equal(r.twoSame, 0);
  assert.deepEqual(r.one, ['only']);
  assert.equal(r.none, undefined);
});

test('it makes one draw of the dice, as pick does, so the rest of a seeded game is unchanged', async () => {
  const g = await open();
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const real = Math.random; let n = 0; Math.random = () => { n++; return real(); };
    const pool = ['a', 'b', 'c', 'd'];
    for (let i = 0; i < 10; i++) pickFresh(pool);
    Math.random = real;
    return n;
  });
  await g.done();
  assert.equal(r, 10);
});

test('the last lines are kept in the save, thirty at most, and a game from before has none', async () => {
  const g = await open();
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const start = G.state.recentLines.length;
    for (let i = 0; i < 60; i++) pickFresh(Array.from({ length: 50 }, (_, k) => `line ${k}`));
    const kept = JSON.parse(JSON.stringify(G.state)).recentLines.length;
    const old = JSON.parse(JSON.stringify(G.state)); delete old.recentLines;
    return { start, kept, migrated: migrate(old).recentLines };
  });
  await g.done();
  assert.equal(r.start, 0);
  assert.equal(r.kept, 30);
  assert.deepEqual(r.migrated, []);
});
