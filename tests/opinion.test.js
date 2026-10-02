'use strict';

// The opinion cutoffs (OPINION in js/people.js): one named table, with every place that compares someone's opinion of you
// using it. The behaviour tests pin the boundaries so the cutoffs stay where they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const ROOT = path.resolve(__dirname, '..');
const scripts = fs.readdirSync(path.join(ROOT, 'js'), { recursive: true }).filter(f => f.endsWith('.js')).map(f => 'js/' + f.split(path.sep).join('/'));

test('no place compares an opinion with a bare number: they use the OPINION table', () => {
  const bare = [
    /opinion\s*(>=|<=|>|<|===|!==|==)\s*\(?-?[1-9]/,
    /Math\.abs\([^)]*opinion[^)]*\)\s*(>=|<=|>|<)\s*-?[1-9]/,
  ];
  const found = [];
  for (const f of scripts) {
    fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n').forEach((line, i) => { if (bare.some(re => re.test(line))) found.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(found, []);
});

test('the OPINION table holds the cutoffs the game has always used', async () => {
  const { ev, done } = await open();
  const r = await ev(() => OPINION);
  assert.deepEqual(r, {
    CLOSE: 1, HEARD: 1, FRIEND: 2, NOTABLE: 2, BONUS: 2, TRUSTED: 3, STRONG: 3, WELCOME: 4, ALLY: 5,
    ENEMY: -2, GRUDGE: -3, BITTER: -4, HIRED_GUN: -5,
  });
  await done();
});

test('the opinion words change at the same cutoffs', async () => {
  const { ev, done } = await open();
  const r = await ev(() => Object.fromEntries([6, 5, 4, 2, 1, 0, -1, -2, -4, -5, -6].map(n => [n, opinionWord(n)])));
  assert.deepEqual(r, { 6: 'devoted', 5: 'devoted', 4: 'friendly', 2: 'friendly', 1: 'neutral', 0: 'neutral', '-1': 'neutral', '-2': 'resentful', '-4': 'resentful', '-5': 'hostile', '-6': 'hostile' });
  await done();
});

test('who leaves with you at the buy-in changes at the same cutoffs', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    const ids = () => buyInCompanions().map(c => c.id).sort(), set = (a, b) => { person('c:ines').opinion = a; person('c:tomas').opinion = b; };
    const out = {};
    set(0, 0); out.nobody = ids();
    set(1, 0); out.oneAtOne = ids();
    set(2, 1); out.secondTooCool = ids();
    set(2, 2); out.both = ids();
    return out;
  });
  assert.deepEqual(r, { nobody: [], oneAtOne: ['c:ines'], secondTooCool: ['c:ines'], both: ['c:ines', 'c:tomas'] });
  await done();
});

test('the blockade call and the epilogue count people at the same cutoffs', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent();
    story().ending = Object.keys(ENDINGS)[0];
    const p = registerPerson(makePerson('earth')), counts = () => ({ allies: blockadeForces().allies, text: epilogueEvent().text.match(/Across the solar system, (\d+) .*? and (\d+) would not/).slice(1).map(Number) });
    const at = n => { p.opinion = n; return counts(); }, base = at(0), out = {};
    for (const n of [5, 4, 2, 1, -1, -2]) { const c = at(n); out[n] = { allies: c.allies - base.allies, friends: c.text[0] - base.text[0], enemies: c.text[1] - base.text[1] }; }
    return out;
  });
  assert.deepEqual(r, {
    5: { allies: 1, friends: 1, enemies: 0 }, 4: { allies: 0, friends: 1, enemies: 0 }, 2: { allies: 0, friends: 1, enemies: 0 },
    1: { allies: 0, friends: 0, enemies: 0 }, '-1': { allies: 0, friends: 0, enemies: 0 }, '-2': { allies: 0, friends: 0, enemies: 1 },
  });
  await done();
});
