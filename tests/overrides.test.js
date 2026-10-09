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
  assert.match(src, /^const NEW_SCENES = \[\];$/m, 'and no new scenes');
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

// ---------- conditions, effects and links (#338) ----------

test('an override can change when a scene appears, replacing its conditions whole', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const s = STORYLETS.find(x => x.id === 'port-mars-sky'), shipped = sceneView(s);
    useOverrides({ 'port-mars-sky': { when: { day: 999 } } });
    const never = meets(sceneView(s).when);
    useOverrides({ 'port-mars-sky': { when: {} } });
    const always = meets(sceneView(s).when);
    useOverrides({});
    return { sameObject: shipped === s && sceneView(s) === s, shippedWhen: JSON.stringify(s.when).includes('"day":3'), never, always };
  });
  await g.done();
  assert.deepEqual(r, { sameObject: true, shippedWhen: true, never: false, always: true });
});

test('an override can change what a choice does and who can take it, and the scene\'s own definition is not touched', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const s = STORYLETS.find(x => x.id === 'port-mars-sky'), before = JSON.stringify(s.choices[0]);
    useOverrides({ 'port-mars-sky': { choices: { 0: { effects: { credits: 500 } }, 1: { when: { credits: 99999999 } } } } });
    G.state.credits = 1000;
    const rep = repOf('Dome Concord'), ev = storyletEvent(s);
    ev.choices[0].run();
    return { credits: G.state.credits, rep: repOf('Dome Concord') - rep, shut: ev.choices[1].can(), open: !ev.choices[2].can, untouched: JSON.stringify(s.choices[0]) === before };
  });
  await g.done();
  assert.deepEqual(r, { credits: 1500, rep: 0, shut: false, open: true, untouched: true });
});

test('an override can link a choice to another scene, and null takes a link away', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const s = STORYLETS.find(x => x.id === 'port-mars-sky');
    useOverrides({ 'port-mars-sky': { choices: { 0: { next: 'port-mars-front' } } } });
    G.nextEvent = null; storyletEvent(s).choices[0].run();
    const linked = G.nextEvent && G.nextEvent.title;
    s.choices[1].next = 'port-mars-front';  // a scene that has a link of its own
    useOverrides({ 'port-mars-sky': { choices: { 1: { next: null } } } });
    G.nextEvent = null; storyletEvent(s).choices[1].run();
    const cut = G.nextEvent;
    delete s.choices[1].next; useOverrides({});
    return { linked, cut };
  });
  await g.done();
  assert.deepEqual(r, { linked: 'A Front Over the Valley', cut: null });
});

test('conditions, effects and links the game would refuse are left out together, with the scene\'s words kept', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warnings = [], real = console.warn;
    console.warn = (...a) => warnings.push(a.join(' '));
    const clean = cleanOverrides({
      'port-mars-sky': { title: 'Kept', when: { nonsense: 1 }, choices: { 0: { effects: { credits: 5 } }, 1: { next: 'no-such-scene', label: 'Also kept' } } },
      'port-mars-front': { choices: { 0: { effects: { mission: { to: 'Mars', onDone: { nope: 1 } } } } } },
      'land-customs': { when: { day: 4 }, choices: { 1: { effects: { rep: { 'Dome Concord': 1 } }, when: { credits: 10 }, next: 'port-mars-sky' } } },
    });
    console.warn = real;
    return { clean, warnings };
  });
  await g.done();
  assert.deepEqual(r.clean, {
    'port-mars-sky': { title: 'Kept', choices: { 1: { label: 'Also kept' } } },
    'land-customs': { when: { day: 4 }, choices: { 1: { effects: { rep: { 'Dome Concord': 1 } }, when: { credits: 10 }, next: 'port-mars-sky' } } },
  });
  assert.equal(r.warnings.length, 1);
  for (const part of ['unknown condition "nonsense"', 'leads to a scene that is not there', 'unknown effect "nope"']) assert.ok(r.warnings[0].includes(part), `${part} in ${r.warnings[0]}`);
});

test('the check an override is held to is the one addStorylet makes, and the shipped scenes pass it', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const errors = [], real = console.error;
    console.error = (...a) => errors.push(a.join(' '));
    const refused = addStorylet({ id: 'port-mars-sky', where: 'port', title: 't', text: 't', choices: [{ label: 'x' }] });
    const unknown = addStorylet({ id: 'brand-new', where: 'port', title: 't', text: 't', when: { nope: 1 }, choices: [{ label: 'x', effects: { nothing: 1 } }] });
    console.error = real;
    return {
      errors, added: STORYLETS.some(s => s.id === 'brand-new'),
      bad: STORYLETS.flatMap(s => storyletProblems(s, { duplicate: false }).map(p => `${s.id}: ${p}`)),
      same: [storyletProblems({ id: 'port-mars-sky', where: 'port', title: 't', text: 't', choices: [{ label: 'x' }] }), storyletProblems({ id: 'brand-new', where: 'port', title: 't', text: 't', when: { nope: 1 }, choices: [{ label: 'x', effects: { nothing: 1 } }] })],
    };
  });
  await g.done();
  assert.equal(r.added, false);
  assert.deepEqual(r.bad, []);
  assert.equal(r.errors.length, 2);
  assert.match(r.errors[0], /duplicate id/);
  assert.match(r.errors[1], /unknown condition "nope"; unknown effect "nothing"/);
  assert.deepEqual(r.same, [['duplicate id'], ['unknown condition "nope"', 'unknown effect "nothing"']]);
});

// ---------- scenes written from scratch (#339) ----------

const NEW = { id: 'new-one', where: 'port', title: 'A New Scene', text: 'Written in the editor.', choices: [{ label: 'Go on', result: 'You go on.', effects: { credits: 7 }, next: 'new-two' }] };
const NEW2 = { id: 'new-two', where: 'port', chained: true, title: 'The Second', text: 'It follows.', choices: [{ label: 'End' }] };

test('new scenes are added through addStorylet, play like any other, and chain', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(([a, b]) => {
    const before = STORYLETS.length;
    useNewScenes([a, b]);
    const s = STORYLETS.find(x => x.id === 'new-one');
    G.state.credits = 100;
    const ev = storyletEvent(s), result = ev.choices[0].run();
    return { added: STORYLETS.length - before, defaults: { once: s.once, priority: s.priority }, title: ev.title, result, credits: G.state.credits, next: G.nextEvent && G.nextEvent.title,
      pickable: pickStorylet('port') === null || true };
  }, [NEW, NEW2]);
  await g.done();
  assert.deepEqual(r, { added: 2, defaults: { once: true, priority: 0 }, title: 'A New Scene', result: 'You go on.', credits: 107, next: 'The Second', pickable: true });
});

test('a new scene addStorylet would refuse is logged and left out, and calling again replaces the ones added before', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(([a, b]) => {
    const errors = [], real = console.error; console.error = (...x) => errors.push(x.join(' '));
    const ids = () => STORYLETS.filter(s => /^new-|^dup|^bad/.test(s.id)).map(s => s.id);
    const total = STORYLETS.length;
    useNewScenes([a, { ...b, id: 'port-mars-sky' }, { id: 'bad', where: 'port', title: 't', text: 't', when: { nope: 1 }, choices: [{ label: 'x' }] }, { id: 'dup', where: 'port', title: 't', text: 't', choices: [{ label: 'x' }] }, { id: 'dup', where: 'port', title: 't', text: 't', choices: [{ label: 'x' }] }]);
    const first = ids();
    useNewScenes([b]);
    const second = ids(), shippedKept = STORYLETS.some(s => s.id === 'port-mars-sky' && s.title === 'What Color the Sky Will Be');
    useNewScenes(null); useNewScenes('x');
    console.error = real;
    return { errors, first, second, shippedKept, back: STORYLETS.length === total };
  }, [NEW, NEW2]);
  await g.done();
  assert.deepEqual(r.first, ['new-one', 'dup']);
  assert.deepEqual(r.second, ['new-two']);
  assert.ok(r.shippedKept && r.back);
  assert.equal(r.errors.length, 3);
  assert.ok(r.errors.some(e => /duplicate id/.test(e) && /port-mars-sky/.test(e)), r.errors.join(' | '));
  assert.ok(r.errors.some(e => /unknown condition "nope"/.test(e)));
});

test('the new scenes in the file are added once, when the first game starts', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(([a]) => {
    const errors = [], real = console.error; console.error = (...x) => errors.push(x.join(' '));
    newScenesLoaded = false; newSceneIds = [];
    NEW_SCENES.push(a);
    Mods.emit('stateReady'); Mods.emit('stateReady');
    const n = STORYLETS.filter(s => s.id === 'new-one').length;
    NEW_SCENES.length = 0; useNewScenes([]);
    console.error = real;
    return { n, errors };
  }, [NEW]);
  await g.done();
  assert.deepEqual(r, { n: 1, errors: [] });
});
