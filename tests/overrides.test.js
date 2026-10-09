'use strict';

// The override layer (#336): js/overrides.js holds the scene editor's changes to a storylet's words, and storyletEvent puts them in front of the
// shipped text when it builds the scene. Nothing else about the scene changes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// port-mars-front has four choices; the two for a post are hidden from someone who is not hired, so the third (index 2) is the first the page
// shows, and the fourth (index 3) the second.
const SCENE = 'port-mars-front';

test('the shipped overrides file is empty, so the game is the shipped game', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'overrides.js'), 'utf8');
  assert.match(src, /^const SCENE_OVERRIDES = \{\};$/m);
});

test('an override replaces the title, text, label and result of the scene it names, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const s = STORYLETS.find(x => x.id === 'port-mars-sky');
    const play = i => {
      G.state.credits = 1000;
      const rep = repOf('Dome Concord'), ev = storyletEvent(s), text = ev.choices[i].run();  // standing and credits as the choice moved them
      return { title: ev.title, text: ev.text, labels: ev.choices.map(c => c.label), result: text, rep: repOf('Dome Concord') - rep, credits: G.state.credits, qualities: JSON.stringify(G.state.qualities) };
    };
    const shipped = play(0);
    useOverrides({ 'port-mars-sky': { title: 'New Title', text: 'New text.', choices: { 0: { label: 'New label', result: 'New result.' } } } });
    return { shipped, changed: play(0) };
  });
  await g.done();
  assert.equal(r.changed.title, 'New Title');
  assert.equal(r.changed.text, 'New text.');
  assert.deepEqual(r.changed.labels, ['New label', r.shipped.labels[1], r.shipped.labels[2]], 'only the named choice');
  assert.equal(r.shipped.rep, 1, 'the choice has an effect to keep');
  assert.equal(r.changed.result, 'New result.');
  assert.notEqual(r.shipped.result, 'New result.');
  // The effects, the standing and the scene's own bookkeeping are the shipped ones.
  for (const k of ['rep', 'credits']) assert.equal(r.changed[k], r.shipped[k], k);
  assert.equal(r.changed.qualities.replace(/"seen:[^,}]*,?/g, ''), r.shipped.qualities.replace(/"seen:[^,}]*,?/g, ''));
});

test('a choice is named by its place in the scene, whichever choices are shown', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(scene => {
    useOverrides({ [scene]: { choices: { 3: { label: 'The fourth choice' } } } });
    const ev = storyletEvent(STORYLETS.find(x => x.id === scene));
    return ev.choices.map(c => c.label);
  }, SCENE);
  await g.done();
  assert.equal(r.length, 2, 'the two post choices are hidden');
  assert.equal(r[1], 'The fourth choice');
  assert.equal(r[0], 'Help the pad crew with the tarps');
});

test('placeholders in an override are filled as in the shipped text', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    useOverrides({ 'port-mars-sky': { text: 'At {planet} the {captain} waits for {crew:pilot}.', choices: { 0: { result: '{system} is quiet.' } } } });
    const ev = storyletEvent(STORYLETS.find(x => x.id === 'port-mars-sky'));
    return { text: ev.text, result: ev.choices[0].run() };
  });
  await g.done();
  assert.match(r.text, /^At \S.* the the captain waits for /);
  assert.ok(!r.text.includes('{'), r.text);
  assert.match(r.result, / is quiet\.$/);
  assert.ok(!r.result.includes('{'));
});

test('an unknown id or a value of the wrong type is left out, with one warning that names all of them', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warnings = [], real = console.warn;
    console.warn = (...a) => warnings.push(a.join(' '));
    const clean = cleanOverrides({
      'no-such-scene': { title: 'x' },
      'port-mars-sky': { title: 42, text: 'Kept.', choices: { 0: { label: ['no'], result: 'Also kept.' }, 9: { label: 'x' }, one: { label: 'x' } }, weight: 3 },
      'port-mars-front': 'not an object',
    });
    console.warn = real;
    return { warnings, clean };
  });
  await g.done();
  assert.deepEqual(r.clean, { 'port-mars-sky': { text: 'Kept.', choices: { 0: { result: 'Also kept.' } } } });
  assert.equal(r.warnings.length, 1);
  for (const part of ['unknown scene "no-such-scene"', '"port-mars-sky".title is not text', 'has no choice 9', 'has no choice one', 'choice 0 label is not text', 'has no "weight"', '"port-mars-front" is not an object']) {
    assert.ok(r.warnings[0].includes(part), `${part} in: ${r.warnings[0]}`);
  }
});

test('a file that is not an object, or has no problems, does not crash and warns once or not at all', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warnings = [], real = console.warn;
    console.warn = (...a) => warnings.push(a.join(' '));
    const out = [cleanOverrides([1]), cleanOverrides('x'), cleanOverrides(null), cleanOverrides({}), cleanOverrides(undefined), cleanOverrides({ 'port-mars-sky': { title: 'Fine' } })];
    console.warn = real;
    return { out, warnings: warnings.length };
  });
  await g.done();
  assert.deepEqual(r.out, [{}, {}, {}, {}, {}, { 'port-mars-sky': { title: 'Fine' } }]);
  assert.equal(r.warnings, 3, 'an array, a string and null are each one warning; nothing and an empty file say nothing');
});

test('the file is checked once, when the first game starts, and a bad one does not stop the game', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warnings = [], real = console.warn;
    console.warn = (...a) => warnings.push(a.join(' '));
    sceneOverrides = null;
    Object.assign(SCENE_OVERRIDES, { 'no-such-scene': { title: 'x' } });
    Mods.emit('stateReady');
    Mods.emit('stateReady');
    const played = !!storyletEvent(STORYLETS[0]);
    console.warn = real;
    delete SCENE_OVERRIDES['no-such-scene']; sceneOverrides = null;
    return { warnings, played };
  });
  await g.done();
  assert.equal(r.warnings.length, 1);
  assert.ok(r.played);
});

test('an override is escaped where the scene is shown, because it comes from a file anyone can edit', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    useOverrides({ 'port-mars-sky': { title: '<i>T</i>', text: '<img src=x onerror=1> & "q"', choices: { 0: { label: '<b>L</b>', result: '<svg onload=1>R' } } } });
    openEvent(storyletEvent(STORYLETS.find(x => x.id === 'port-mars-sky')));
    const shown = UI.el.innerHTML, bad = UI.el.querySelectorAll('img[src=x], svg, i, b').length;
    UI.el.querySelector('[data-action="choose"]').click();
    return { shown, bad, result: document.getElementById('event-result').innerHTML, badResult: UI.el.querySelectorAll('svg').length, label: shown.includes('&lt;b&gt;L&lt;/b&gt;') };
  });
  await g.done();
  assert.equal(r.bad, 0, r.shown);
  assert.match(r.shown, /&lt;img src=x onerror=1&gt; &amp; "q"/);
  assert.ok(r.label, 'the label is escaped');
  assert.equal(r.badResult, 0);
  assert.match(r.result, /&lt;svg onload=1&gt;R/);
});

test('the placeholders the check knows are the ones the game replaces', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const known = ['{planet}', '{system}', '{captain}', '{crew}', '{crew:pilot}', '{crew:medic}', '{thread:loan}'];
    const unknown = ['{planet }', '{Planet}', '{thread:}', '{who}', '{}'];
    const replaced = t => fill(t) !== t;
    return {
      knownFlagged: known.filter(t => unknownPlaceholders(t).length), unknownMissed: unknown.filter(t => !unknownPlaceholders(t).length),
      // fill() leaves {crew} for the dialog, so it is the one known token fill does not replace here.
      knownNotReplaced: known.filter(t => t !== '{crew}' && !replaced(t)), unknownReplaced: unknown.filter(replaced),
      typo: unknownPlaceholders('{crew:pilott}'),  // fill() would replace it with a made-up name; the check flags it
      mixed: unknownPlaceholders('Go to {planet} and ask {pilot} or {crew:cook}, and {nope}.'),
    };
  });
  await g.done();
  assert.deepEqual(r.knownFlagged, []);
  assert.deepEqual(r.unknownMissed, []);
  assert.deepEqual(r.knownNotReplaced, []);
  assert.deepEqual(r.unknownReplaced, []);
  assert.deepEqual(r.typo, ['{crew:pilott}']);
  assert.deepEqual(r.mixed, ['{pilot}', '{nope}']);
});

test('no shipped storylet has a placeholder the check would flag', async () => {
  const g = await open({ scope: 'full' });
  const bad = await g.ev(() => {
    const parts = t => [].concat(t || []).map(p => (typeof p === 'string' ? p : [p.text, p.else].filter(Boolean).join(' ')));
    return STORYLETS.flatMap(s => [s.title, ...parts(s.text), ...s.choices.flatMap(c => [...parts(c.label), ...parts(c.result)])]
      .flatMap(t => unknownPlaceholders(t).map(p => `${s.id}: ${p}`)));
  });
  await g.done();
  assert.deepEqual(bad, []);
});
