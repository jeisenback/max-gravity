'use strict';

// The text layer for the hired chapter's function-built scenes and the hired events written in code (#463): each line they are built from can be given other words through
// the override layer, the scene plays them with its {words} filled, and an override the game would not take is left out with one warning. The pin (scenepin.test.js) shows
// that the shipped words are as they were.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');
const { playScenes } = require('./sceneplay');

after(closeBrowser);

test('every line of every scene is read: an override for it shows in what the scene plays, and the scenes play as many choices as before', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(arg => {
    const play = (0, eval)(`(${arg.src})`);
    const ids = Object.keys(SCENE_LINES);
    const lines = Object.fromEntries(ids.map(id => [id, linesOf(id)]));
    const base = play();
    // each line becomes its marker followed by the {words} it had, so the lines it is filled with (a fault, a debt, a price) are read too
    const overrides = Object.fromEntries(ids.map(id => [id, { parts: Object.fromEntries(Object.keys(lines[id]).map(k => [k, `@@${id}|${k}@@ ${(lines[id][k].match(/\{\w+\}/g) || []).join(' ')}`.trim()])) }]));
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base: base.map(x => [x.id, x.plays.length, x.error || '']), changed: changed.map(x => [x.id, x.plays.length, x.error || '']), text: JSON.stringify(changed), lines, warned };
  }, { src: playScenes.toString() });
  await g.done();
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  assert.deepEqual(r.changed.filter(x => x[2]), [], 'every case still plays');
  assert.deepEqual(r.changed, r.base, 'the same scenes, with as many choices to play');
  const missing = [];
  for (const [id, lines] of Object.entries(r.lines)) for (const key of Object.keys(lines)) if (!r.text.includes(`@@${id}|${key}@@`)) missing.push(`${id} ${key}`);
  assert.deepEqual(missing, [], 'a line the scenes never read');
});

test('an override fills the {words} its line has, is escaped in a text and plain in a label, and a bad one is left out with one warning', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    const last = person(hired().captain).last;
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    const clean = cleanOverrides({
      'scene:warning': { parts: { text: 'A <b>word</b> from {last} & {nobody}.', 'c0.label': 'Do <i>better</i>', nope: 'x', 'c1.result': '' }, title: 'No' },
      'hired:cap-order': { parts: { text: 'Captain {last} says <b>no</b>.' } },
      'scene:sign-on': { parts: { 'week.pay': 'You are paid {wage} a day.' } },
    });
    console.warn = warn;
    useOverrides({ 'scene:warning': { parts: { text: 'A <b>word</b> from {last} & more.', 'c0.label': 'Do <i>better</i>' } }, 'hired:cap-order': { parts: { text: 'Captain {last} says <b>no</b>.' } } });
    const w = warningScene(), order = HAND_EVENTS.find(x => x.id === 'cap-order').make({ cap: person(hired().captain), mate: null });
    return { clean, warned, last, text: w.text, label: w.choices[0].label, title: w.title, other: w.choices[1].label, order: order.text };
  });
  await g.done();
  assert.deepEqual(r.clean, {
    'scene:warning': { parts: { 'c0.label': 'Do <i>better</i>' } },  // the text has {nobody}, which the line does not take; the rest of the bad ones are left out too
    'hired:cap-order': { parts: { text: 'Captain {last} says <b>no</b>.' } },
    'scene:sign-on': { parts: { 'week.pay': 'You are paid {wage} a day.' } },
  });
  assert.equal(r.warned.length, 1);
  for (const bit of ['{nobody}', 'nope', 'c1.result', 'no "title"']) assert.ok(r.warned[0].includes(bit), bit);
  assert.equal(r.text, `A &lt;b&gt;word&lt;/b&gt; from ${r.last} &amp; more.`);
  assert.equal(r.label, 'Do <i>better</i>');
  assert.equal(r.title, 'The Captain\'s Terms');
  assert.equal(r.other, 'Apologize for the worst of it');
  assert.equal(r.order, `Captain ${r.last} says &lt;b&gt;no&lt;/b&gt;.`);
});

test('the memories of the scenes in js/stakes.js and of the hired events with lines are lines, drawn as plain text, and none is left in code there', async () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'stakes.js'), 'utf8');
  assert.deepEqual([...src.matchAll(/\blike\([^;\n]*?, *['"`][A-Z]/g)].map(m => m[0].slice(0, 60)), [], 'a memory in code in stakes.js');
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    useOverrides({ 'scene:warning': { parts: { 'c0.memory': 'You said <b>so</b> & meant it' } } });
    const out = sceneSay('scene:warning', 'c0.memory');
    useOverrides({});
    return out;
  });
  await g.done();
  assert.equal(r, 'You said <b>so</b> & meant it');
});

test('the memories of the scenes of faction ties are lines, and none is left in code in js/ties.js', async () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'ties.js'), 'utf8');
  assert.deepEqual([...src.matchAll(/\blike\([^;\n]*?, *['"`][A-Z]/g)].map(m => m[0].slice(0, 60)), [], 'a memory in code in ties.js');
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    useOverrides({ 'scene:dock-friend': { parts: { 'c0.memory': 'You let <b>me</b> ask' } } });
    const out = sceneSay('scene:dock-friend', 'c0.memory');
    useOverrides({});
    return out;
  });
  await g.done();
  assert.equal(r, 'You let <b>me</b> ask');
});

test('the memories of the ship\'s own downtime activities are lines, and none is left in code in js/shiplife.js', async () => {
  const src = require('node:fs').readFileSync(require('node:path').join(__dirname, '..', 'js', 'shiplife.js'), 'utf8');
  assert.deepEqual([...src.matchAll(/\blike(?:Ambient)?\([^;\n]*?, *['"`][A-Z]/g)].map(m => m[0].slice(0, 60)), [], 'a memory in code in shiplife.js');
});

test('the memories and the log line of the round and of a main character coming aboard are lines, and none is left in code in js/bar.js or js/cast.js', async () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const [f, re] of [['bar.js', /\blike\([^;\n]*?, *`The captain bought/g], ['cast.js', /\blike\([^;\n]*?, *`I signed on/g], ['cast.js', /homeLog\(`[^`]*came aboard as/g]]) {
    assert.deepEqual([...fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8').matchAll(re)].map(m => m[0].slice(0, 60)), [], `a line in code in ${f}`);
  }
});

test('the lines the ship\'s log keeps of a death, a departure, a retirement, a loss and a founding are lines, and none is left in code', async () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const f of ['boarders.js', 'stakes.js', 'legacy.js', 'outpost.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
    assert.deepEqual([...src.matchAll(/homeLog\(`/g)].map(m => m[0]), [], `a ship's log line in code in ${f}`);
  }
});

test('the memories at the port screens and the hand\'s screens are lines, and none is left in code in js/ui.js or js/hired.js', async () => {
  const fs = require('node:fs'), path = require('node:path');
  for (const f of ['ui.js', 'hired.js']) {
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
    assert.deepEqual([...src.matchAll(/\blike(?:Ambient)?\([^;\n]*?, *(?:`|'|")[A-Z]/g)].map(m => m[0].slice(0, 70)), [], `a memory in code in ${f}`);
  }
});

test('no memory or thread line (of like, likeAmbient, capLike, castLike, captainLike or setLater) is left in code anywhere in js/, outside the lines of the scenes', async () => {
  const fs = require('node:fs'), path = require('node:path'), dir = path.join(__dirname, '..', 'js');
  const found = [];
  const walk = d => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { if (f.isDirectory()) walk(path.join(d, f.name)); else if (f.name.endsWith('.js')) { const src = fs.readFileSync(path.join(d, f.name), 'utf8'); for (const m of src.matchAll(/\b(?:like|likeAmbient|capLike|castLike|captainLike)\([^;\n]*?, *(?:`|'|")[A-Z]|\bsetLater\([^;\n]*?, *\d+, *(?:`|'|")/g)) found.push(`${f.name}: ${m[0].slice(0, 60)}`); } } };
  walk(dir);
  assert.deepEqual(found, [], 'a memory written in code');
});

test('a code choice that leaves a memory takes another one from the override layer, as plain text, and a choice that leaves none is refused (#508)', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    const hit = Object.entries(CAST).flatMap(([k, c]) => Object.entries(c.scenes).flatMap(([n, sc]) => sc.choices.map((ch, i) => ({ k, n, i, ch })))).find(x => x.ch.label === 'Order her to ditch');
    const id = `cast:${hit.k}:${hit.n}`, warned = [], warn = console.warn; console.warn = m => warned.push(m);
    const clean = cleanOverrides({ [id]: { choices: { [hit.i]: { memory: 'You made the <b>call</b> & I took it.' }, 0: { memory: 'x' } } } });
    console.warn = warn;
    useOverrides(clean);
    const p = castPerson(hit.k); G.state.crew.push(p.id);
    const ev = castScene(hit.k, CAST[hit.k].scenes[hit.n]);
    ev.choices[hit.i].run();
    const changed = p.memories[p.memories.length - 1];
    useOverrides({});
    const ev2 = castScene(hit.k, CAST[hit.k].scenes[hit.n]);
    ev2.choices[hit.i].run();
    return { clean, warned, changed, shipped: p.memories[p.memories.length - 1], id, i: hit.i };
  });
  await g.done();
  assert.deepEqual(r.clean[r.id].choices, { [r.i]: { memory: 'You made the <b>call</b> & I took it.' } }, 'the memory is kept; the choice that leaves none is left out');
  assert.equal(r.warned.length, 1);
  assert.ok(r.warned[0].includes('choice 0 leaves no memory'), r.warned[0]);
  assert.ok(r.changed.endsWith('You made the <b>call</b> & I took it.'), r.changed);
  assert.ok(r.shipped.endsWith('You ordered me to ditch the ship, as the tower did.'), r.shipped);
});
