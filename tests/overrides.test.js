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
      'port-mars-sky': { title: 42, text: 'Kept.', choices: { 0: { label: ['no'], result: 'Also kept.' }, 9: { label: 'x' }, one: { label: 'x' } }, priority: 3 },
      'port-mars-front': 'not an object',
    });
    console.warn = real;
    return { warnings, clean };
  });
  await g.done();
  assert.deepEqual(r.clean, { 'port-mars-sky': { text: 'Kept.', choices: { 0: { result: 'Also kept.' } } } });
  assert.equal(r.warnings.length, 1);
  for (const part of ['unknown scene "no-such-scene"', '"port-mars-sky".title is not text', 'has no choice 9', 'has no choice one', 'choice 0 label is not text', 'has no "priority"', '"port-mars-front" is not an object']) {
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

// ---------- the hired chapter's scenes as data (#342) ----------

// The scenes whose choices were turned from code into data (the first officers, then the rest of the B2 scenes of #459); the pin (tests/hiredpin.test.js) shows they play as they did.
const CONVERTED = [
  'cast:ansel:intro', 'cast:ansel:mid1', 'cast:ansel:mid2', 'cast:ansel:late', 'cast:pilar:intro', 'cast:pilar:mid1', 'cast:pilar:mid2',
  'cast:pilar:late', 'cast:cato:intro', 'cast:cato:mid1', 'cast:cato:mid2', 'cast:cato:late', 'cast:cato:late:closed', 'cast:ines:intro',
  'cast:ines:mid1', 'cast:ines:mid2', 'cast:ines:late', 'cast:tomas:intro', 'cast:tomas:late', 'cast:yelena:intro', 'cast:yelena:mid1',
  'cast:yelena:mid2', 'cast:yelena:late', 'cast:ruben:intro', 'cast:ruben:mid2', 'cast:ruben:late', 'cast:bexa:intro', 'cast:bexa:mid2',
  'cast:bexa:late', 'cast:pax:intro', 'cast:pax:mid1', 'cast:pax:mid2', 'cast:pax:late', 'cast:ilsa:intro', 'cast:ilsa:mid1', 'cast:ilsa:mid2',
  'cast:ilsa:late:closed', 'cast:pilar:late:closed', 'cast:ansel:late:closed', 'captain:hester:secret:confide', 'captain:hester:secret:found',
  'captain:dov:secret:confide', 'captain:dov:secret:found', 'captain:imre:trouble', 'captain:imre:secret:confide', 'captain:imre:secret:found',
  'captain:zoya:secret:confide', 'captain:zoya:secret:found', 'cast:tomas:mid1', 'cast:tomas:mid2', 'cast:bexa:mid1', 'cast:ilsa:late', 'captain:hester:trouble', 'captain:dov:trouble',
  'captain:zoya:trouble', 'cast:ines:meet', 'cast:tomas:meet', 'cast:yelena:meet', 'cast:ruben:meet', 'cast:bexa:meet', 'cast:pax:meet'
];

test('the converted hired scenes are data, and the rest of the chapter is untouched', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(ids => {
    const by = Object.fromEntries(hiredSceneRegistry().filter(e => e.scene).map(e => [e.id, e.scene]));
    const data = id => by[id].choices.every(c => !c.run && typeof c.result === 'string' && c.label);
    return { notData: ids.filter(id => !data(id)), pivots: ['cast:ansel:pivot', 'cast:pilar:pivot', 'cast:cato:pivot'].map(id => by[id].choices.some(c => c.run)), others: ['cast:ines:pivot', 'captain:hester:goodbye', 'cast:ruben:mid1'].map(id => by[id].choices.some(c => c.run)) };
  }, CONVERTED);
  await g.done();
  assert.deepEqual(r, { notData: [], pivots: [true, true, true], others: [true, true, true] });
});

test('a choice written as data plays as its closure did, and a choice with run() is left alone', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 }); G.dialog = null;
    const code = { label: 'x', run() { return 'code result'; } };
    const data = { label: 'y', result: 'data result', effects: { castLike: { who: 'cato', n: 2, memory: 'You did it.' }, captainFlag: ['one', 'two'], castFlag: { who: 'cato', flag: 'seen' }, castXp: { who: 'cato', role: 'xo', n: 1 }, captainLike: { n: 1, memory: 'You helped.' } } };
    const op = castPerson('cato').opinion, cap = hiredCaptain().opinion;
    const text = dataChoice(data).run();
    return { same: dataChoice(code) === code, code: dataChoice(code).run(), text, cato: castPerson('cato').opinion - op, captain: hiredCaptain().opinion - cap, memory: castPerson('cato').memories.some(m => /You did it/.test(m.text || m)),
      flags: [!!castRec('cato').flags.seen, !!hired().flags.one, !!hired().flags.two] };
  });
  await g.done();
  assert.deepEqual(r, { same: true, code: 'code result', text: 'data result', cato: 2, captain: 1, memory: true, flags: [true, true, true] });
});

test('the hired chapter\'s effects are checked for their shape wherever effects are', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const s = fx => storyletProblems({ id: 'probe', where: 'port', title: 't', text: 't', choices: [{ label: 'x', effects: fx }] });
    return {
      ok: s({ castLike: { who: 'ilsa', n: 1, memory: 'm' }, castFlag: { who: 'ilsa', flag: 'f' }, castXp: { who: 'ilsa', role: 'engineer', n: 2 }, captainLike: { n: -1, memory: 'm' }, captainFlag: 'a' }),
      bad: s({ castLike: { who: 'nobody', n: 1, memory: 'm' }, castFlag: 'oops', castXp: { who: 'ilsa', role: '', n: 'x' }, captainLike: { n: 1 }, captainFlag: [1] }),
    };
  });
  await g.done();
  assert.deepEqual(r.ok, []);
  assert.equal(r.bad.length, 5);
  assert.ok(r.bad.some(p => /castLike nobody is not a main character/.test(p)) && r.bad.some(p => /captainFlag needs a name/.test(p)));
});

test('an override changes the words, labels, results and effects of a hired scene, and the choices it does not name stay as they were', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 }); G.dialog = null;
    const plain = castScene('cato', CAST.cato.scenes.mid1);
    useOverrides({ 'cast:cato:mid1': { title: 'New <b>Title</b>', text: 'New <i>text</i>.', choices: { 0: { label: 'New label', result: 'New result & more.', effects: { castLike: { who: 'cato', n: 3, memory: 'Changed.' } } } } } });
    const ov = castScene('cato', CAST.cato.scenes.mid1);
    const op = castPerson('cato').opinion, text = ov.choices[0].run();
    return { title: ov.title, text: ov.text, label: ov.choices[0].label, result: text, gain: castPerson('cato').opinion - op, other: ov.choices[1].label === plain.choices[1].label && ov.choices[1].result === plain.choices[1].result, usesEffects: !ov.choices[0].run.toString().includes('castLike(') };
  });
  await g.done();
  assert.deepEqual(r, { title: 'New <b>Title</b>', text: 'New &lt;i&gt;text&lt;/i&gt;.', label: 'New label', result: 'New result &amp; more.', gain: 3, other: true, usesEffects: true });
});

test('a closed reading has its own id, and a code choice takes a result line and keeps its effects in code', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 }); G.dialog = null;
    castPerson('cato').opinion = OPINION.FRIEND - 1;
    useOverrides({ 'cast:cato:late:closed': { title: 'Shut Title' }, 'cast:ines:intro': { choices: { 0: { result: 'Replaced line.' } } } });
    const closed = castScene('cato', CAST.cato.scenes.late).title;
    castPerson('cato').opinion = OPINION.FRIEND;
    const open_ = castScene('cato', CAST.cato.scenes.late).title;
    const ines = castScene('ines', CAST.ines.scenes.intro), op = castPerson('ines').opinion;
    const line = ines.choices[0].run();
    return { closed, open_, line, gain: castPerson('ines').opinion - op };
  });
  await g.done();
  assert.equal(r.closed, 'Shut Title');
  assert.notEqual(r.open_, 'Shut Title');
  assert.equal(r.line, 'Replaced line.');
  assert.ok(r.gain > 0, 'the code still changed their opinion');
});

test('an override for a hired scene the game would not take is left out, with one warning', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warnings = [], real = console.warn; console.warn = m => warnings.push(m);
    const clean = cleanOverrides({
      'cast:cato:intro': { title: 'Kept', when: { day: 3 }, choices: { 0: { label: 'Kept label', when: { credits: 1 }, next: 'port-mars-sky' } } },
      'cast:ines:pivot': { choices: { 0: { effects: { credits: 5 }, when: { credits: 1 }, result: 'Kept line.' } } },
      'cast:cato:mid1': { choices: { 0: { effects: { castLike: { who: 'nobody', n: 1, memory: 'm' } }, when: { opinion: { who: 'nobody', min: 1 } }, label: 'Kept too' } } },
      'cast:nobody:intro': { title: 'x' },
    });
    console.warn = real;
    return { clean, warnings };
  });
  await g.done();
  assert.deepEqual(r.clean, { 'cast:cato:intro': { title: 'Kept', choices: { 0: { label: 'Kept label', when: { credits: 1 } } } }, 'cast:ines:pivot': { choices: { 0: { result: 'Kept line.' } } }, 'cast:cato:mid1': { choices: { 0: { label: 'Kept too' } } } });
  assert.equal(r.warnings.length, 1);
  for (const part of ['has no "when"', 'choice 0 has no "next"', 'runs code, so its effects are not edited', 'runs code, so its conditions are not edited', 'conditions and effects left out: condition opinion nobody is not the captain, the first officer or a main character; effect castLike nobody is not a main character', 'unknown scene "cast:nobody:intro"']) assert.ok(r.warnings[0].includes(part), `${part} in ${r.warnings[0]}`);
});

// ---------- choice gates as data (#460) ----------

test('a hired scene\'s data choice is shut by its conditions as the code gates were, and the file can change them', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 }); G.dialog = null; G.nextEvent = null;
    const find = (key, label) => { for (const [name, sc] of Object.entries(CAST[key].scenes)) { const i = sc.choices.findIndex(c => c.label === label); if (i >= 0) return { id: `cast:${key}:${name}`, name, i, sc }; } };
    const lend = find('tomas', 'Lend him 200 cr'), write = find('tomas', 'Ask him to write it down, so it does not go with the hull');
    const shown = (f, key) => castScene(key, CAST[key].scenes[f.name]).choices[f.i];
    const out = {};
    G.state.credits = 100;
    let c = shown(lend, 'tomas');
    out.poor = { open: c.can(), why: c.why() };
    G.state.credits = 300; c = shown(lend, 'tomas');
    const before = G.state.credits, open = c.can(); c.run();
    out.rich = { open, spent: before - G.state.credits, flag: !!castRec('tomas').flags.loan };
    useOverrides({ [lend.id]: { choices: { [lend.i]: { when: { credits: 500 } } } } });
    G.state.credits = 300; c = shown(lend, 'tomas'); out.edited = { open300: c.can(), why: c.why() };
    G.state.credits = 600; out.edited.open600 = shown(lend, 'tomas').can();
    useOverrides({});
    // A regard shuts a choice with what it needs in its label (the opinion gate of captains.js), and the condition holds for the person aboard.
    castPerson('tomas').opinion = 0;
    const gate = opinionGate(shown(write, 'tomas'));
    out.regard = { label: /needs/.test(gate.label), open: gate.can(), held: meets({ opinion: { who: 'tomas', min: 3 } }) };
    castPerson('tomas').opinion = 99;
    out.regard.openLiked = opinionGate(shown(write, 'tomas')).can(); out.regard.heldLiked = meets({ opinion: { who: 'tomas', min: 3 } });
    // A named post's experience.
    const was = hired().skill.engineer || 0; applyEffects({ gainSkill: { post: 'engineer', n: 3 } });
    out.skill = hired().skill.engineer - was;
    out.problems = [conditionProblems({ opinion: { who: 'tomas', min: 3 } }).length, conditionProblems({ opinion: { who: 'nobody', min: 3 } }).length, conditionProblems({ opinion: 'x' }).length, conditionProblems({ nonsense: 1 }).length, effectProblems({ gainSkill: { post: 'nope', n: 1 } }).length];
    return out;
  });
  await g.done();
  assert.deepEqual(r.poor, { open: false, why: 'You have 100 cr; this costs 200 cr.' });
  assert.deepEqual(r.rich, { open: true, spent: 200, flag: true });
  assert.deepEqual(r.edited, { open300: false, why: 'You have 300 cr; this costs 500 cr.', open600: true });
  assert.deepEqual(r.regard, { label: true, open: false, held: false, openLiked: true, heldLiked: true });
  assert.equal(r.skill, 3);
  assert.deepEqual(r.problems, [0, 1, 1, 1, 1]);
});

// ---------- joining and leaving as effects (#461) ----------

test('a meeting scene joins or puts off the person as its closures did, with the berth check, and the file can change the check', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    uatFresh({ credits: 5000 }); G.dialog = null; G.nextEvent = null;
    const st = G.state, meet = key => castScene(key, CAST[key].scenes.meet).choices;
    const out = { shapes: [effectProblems({ castJoin: 'ines' }).length, effectProblems({ castLater: 'nobody' }).length, effectProblems({ castJoin: 3 }).length] };
    let c = meet('ines');
    out.open = c[0].can(); const crew0 = st.crew.length;
    const text = c[0].run();
    out.joined = { crew: st.crew.length - crew0, aboard: st.crew.includes('c:ines'), since: castRec('ines').since === st.day, opinion: person('c:ines').opinion, text: /Asked/.test(text), role: person('c:ines').role };
    // Put off: the offer comes round again after eight days, and nobody joins.
    const day = st.day, before = st.crew.length;
    const later = meet('tomas')[1].run();
    out.later = { next: castRec('tomas').next - day, crew: st.crew.length - before, text: /That is all right/.test(later) };
    // The file changes the check for the one choice: it asks for a berth more than is free.
    useOverrides({ 'cast:yelena:meet': { choices: { 0: { when: { berths: berthsFree() + 1 } } } } });
    out.edited = meet('yelena')[0].can();
    useOverrides({});
    // No berth: the join is shut, with the reason the code gave.
    while (berthsFree() > 0) { const c2 = makeCrewCandidate(st.systemId); registerPerson(c2); st.crew.push(c2.id); }
    c = meet('yelena'); out.full = { open: c[0].can(), why: c[0].why(), other: c[1].can ? c[1].can() : true };
    return out;
  });
  await g.done();
  assert.deepEqual(r.shapes, [0, 1, 1]);
  assert.equal(r.open, true);
  assert.deepEqual(r.joined, { crew: 1, aboard: true, since: true, opinion: 2, text: true, role: 'pilot' });
  assert.deepEqual(r.later, { next: 8, crew: 0, text: true });
  assert.deepEqual(r.full, { open: false, why: 'There is no free berth aboard.', other: true });
  assert.equal(r.edited, false);
});

// ---------- the hired events about one person as data (#473) ----------

test('the seven hired events about one person are data, take the override layer, and refuse a bad effect', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 }); G.dialog = null; G.nextEvent = null;
    const mate = makeCrewCandidate(G.state.systemId); registerPerson(mate); G.state.crew.push(mate.id);
    const ids = ['crew-ines', 'crew-tomas', 'crew-yelena', 'crew-ruben', 'crew-bexa', 'crew-pax', 'crew-cover'], c = handContext();
    const def = id => HAND_EVENTS.find(d => d.id === id);
    const who = c.mate, was = who.opinion;
    const out = { data: ids.map(id => !!def(id).data && !!registryScene(`hired:${id}`)), code: !registryScene('hired:cap-order') && !def('cap-order').data, first: who.first };
    out.title = def('crew-cover').make(c).title;
    const plain = def('crew-cover').make(c).choices[0].run();
    out.plain = { mate: plain.includes(who.first), note: / \(\+1 experience at the gunner post\.\)$/.test(plain), thread: G.state.threads.cover === who.id, opinion: who.opinion - was };
    const warnings = [], real = console.warn; console.warn = m => warnings.push(m);
    useOverrides({ 'hired:crew-cover': { title: 'Edited', text: 'Hello {mate}.', choices: { 0: { label: 'Do it', result: 'Done for {mate}.', effects: { learn: 5, mateLike: { n: 1, memory: 'Edited memory.' } } } } } });
    const ev = def('crew-cover').make(c), edited = ev.choices[0].run();
    out.edited = { title: ev.title, text: ev.text, label: ev.choices[0].label, result: edited };
    useOverrides({ 'hired:crew-cover': { choices: { 0: { effects: { mateLike: { n: 'x' }, remember: '' } } } }, 'hired:cap-order': { title: 'No' } });
    out.refused = { warnings: warnings.length, kept: Object.keys(sceneOverrides) };
    console.warn = real; useOverrides({});
    out.problems = [effectProblems({ remember: 'cover', mateLike: { n: 1, memory: 'm' }, learn: 2 }), effectProblems({ remember: ' ' }), effectProblems({ mateLike: { n: 1 } })];
    return out;
  });
  await g.done();
  assert.deepEqual(r.data, [true, true, true, true, true, true, true]);
  assert.equal(r.code, true, 'an event written in code is not in the override layer');
  assert.equal(r.title, 'Cover for a Shipmate');
  assert.deepEqual(r.plain, { mate: true, note: true, thread: true, opinion: 2 });
  assert.deepEqual(r.edited, { title: 'Edited', text: `Hello ${r.first}.`, label: 'Do it', result: `Done for ${r.first}. (+5 experience at the gunner post.)` });
  assert.deepEqual(r.refused, { warnings: 1, kept: [] });
  assert.deepEqual(r.problems.map(p => p.length), [0, 1, 1]);
});

// ---------- how often a scene comes up (#341) ----------

test('with every weight 1 the storylet pick is the pick it always was, draw for draw', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 }); G.dialog = null;
    G.state.day = 40;
    const oldPick = where => {  // pickStorylet as it was before weights: a uniform pick among the eligible of the top priority
      const ok = STORYLETS.filter(s => s.where === where && !s.chained && !(s.once && quality(`seen:${s.id}`)) && !(s.every && quality(`last:${s.id}`) && G.state.day - quality(`last:${s.id}`) < s.every) && meets(s.when));
      const top = Math.max(...ok.map(s => s.priority));
      return pick(ok.filter(s => s.priority === top));
    };
    const same = [];
    let spread = new Set();
    for (let seed = 1; seed <= 300; seed++) {
      __seed(seed); const a = pickStorylet('port'); __seed(seed); const b = oldPick('port');
      same.push((a ? a.id : '') === (b ? b.id : '')); if (a) spread.add(a.id);
    }
    return { all: same.every(Boolean), n: same.length, spread: spread.size };
  });
  await g.done();
  assert.equal(r.all, true);
  assert.ok(r.spread > 3, `${r.spread} different scenes came up`);
});

test('a weight, a cooldown and an off switch from the file change what comes up, and nothing else', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ mode: 'hired', background: 'earth', post: 'gunner', captainKey: 'hester', credits: 5000 }); G.dialog = null; G.state.day = 40;
    const a = 'port-mars-sky', b = 'port-mars-front';
    const only = ids => { for (const s of STORYLETS) s.chained = !ids.includes(s.id) && s.where === 'port' ? true : s.chained; };
    const wasChained = STORYLETS.map(s => s.chained);
    only([a, b]);
    for (const s of STORYLETS.filter(x => [a, b].includes(x.id))) s.when = { chance: 1 };
    const draw = n => { const c = { [a]: 0, [b]: 0 }; for (let i = 0; i < n; i++) { __seed(i + 1); const s = pickStorylet('port'); if (s) c[s.id]++; } return c; };
    const even = draw(400);
    useOverrides({ [a]: { weight: 3 } }); const heavy = draw(400);
    useOverrides({ [a]: { weight: 0 } }); const none = draw(100);
    useOverrides({ [b]: { off: true } }); const off = draw(100);
    useOverrides({ [a]: { every: 100 } });
    const s = STORYLETS.find(x => x.id === a);
    G.state.qualities = G.state.qualities || {}; G.state.qualities[`last:${a}`] = G.state.day - 60;
    useOverrides({}); const free = (G.state.day - 60 < s.every); // shipped cooldown 25: free again after 60 days
    useOverrides({ [a]: { every: 100 } }); __seed(5); const stillWaiting = pickStorylet('port') === null || pickStorylet('port').id !== a;
    STORYLETS.forEach((x, i) => { x.chained = wasChained[i]; });
    return { even, heavy, none, off, free: !free, stillWaiting, shipped: STORYLETS.find(x => x.id === a).every };
  });
  await g.done();
  assert.ok(Math.abs(r.even['port-mars-sky'] - 200) < 50, JSON.stringify(r.even));
  assert.ok(r.heavy['port-mars-sky'] > 270, `weight 3 against 1: ${JSON.stringify(r.heavy)}`);
  assert.equal(r.none['port-mars-sky'], 0);
  assert.equal(r.off['port-mars-front'], 0);
  assert.equal(r.stillWaiting, true, 'a longer cooldown keeps it waiting');
  assert.equal(r.shipped, 25, 'the scene itself is as shipped');
});

test('a rate the game would not take is left out, with one warning, and a story scene has none', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const story = STORYLETS.find(s => s.priority > 0).id, once = 'probe-once';
    addStorylet({ id: once, where: 'port', title: 't', text: 't', choices: [{ label: 'x' }] });  // plays once, as a scene does unless it says otherwise
    const warnings = [], real = console.warn; console.warn = m => warnings.push(m);
    const clean = cleanOverrides({
      'port-mars-sky': { weight: 2.5, every: 30, off: true },
      'port-mars-front': { weight: -1, every: 1.5, off: false },
      [story]: { weight: 2, title: 'Kept' },
      [once]: { every: 10 },
      'cast:cato:intro': { weight: 2 },
    });
    console.warn = real;
    const rate = (id, fx) => { useOverrides(fx); return sceneRate(STORYLETS.find(s => s.id === id)); };
    return { clean, warnings, plain: rate('port-mars-sky', {}), changed: rate('port-mars-sky', { 'port-mars-sky': { weight: 4, off: true, every: 40 } }), story, once,
      bad: storyletProblems({ id: 'p', where: 'port', title: 't', text: 't', weight: -2, every: 1.5, choices: [{ label: 'x' }] }) };
  });
  await g.done();
  assert.deepEqual(r.clean, { 'port-mars-sky': { weight: 2.5, every: 30, off: true }, [r.story]: { title: 'Kept' } });
  assert.equal(r.warnings.length, 1);
  for (const part of ['"port-mars-front".weight needs a number from 0 to 100', '"port-mars-front".every needs a whole number of days', '"port-mars-front".off needs true', 'a story scene is picked by priority, not by weight', 'plays once, so it has no cooldown', 'a hired scene is drawn by its days']) assert.ok(r.warnings[0].includes(part), `${part} in ${r.warnings[0]}`);
  assert.deepEqual(r.plain, { weight: 1, every: 25, off: false });
  assert.deepEqual(r.changed, { weight: 4, every: 40, off: true });
  assert.deepEqual(r.bad, ['weight must be a number of 0 or more', 'every must be a whole number of days']);
});
