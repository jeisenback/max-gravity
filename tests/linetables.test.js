'use strict';

// The text layer for the generated people's line tables (#457): the bar's talk and the crew's chatter. The pin (fixtures/line-tables-pin.json) is what the bar topics and the
// chatter play with no edits; the layer must leave it as it is. Each table's lines can be given other words through the override layer, the readers play them and nothing
// else changes, and an override the game would not take is left out with one warning. After a change to the words on purpose, write the pin again with
// `PIN_WRITE=1 node --test tests/linetables.test.js` and read the diff.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser } = require('./helpers');
const { playLines } = require('./lineplay');

after(closeBrowser);

const FIXTURE = path.join(__dirname, 'fixtures', 'line-tables-pin.json');

test('the bar topics and the chatter play the words they always did', async () => {
  const g = await open({ scope: 'full' });
  const got = await g.ev(playLines);
  await g.done();
  assert.ok(got.length > 300, `${got.length} cases`);
  assert.deepEqual(got.filter(r => /undefined|\[object/.test(r.text)).map(r => r.key), [], 'no broken line');
  if (process.env.PIN_WRITE) fs.writeFileSync(FIXTURE, JSON.stringify(got, null, 1) + '\n');
  const want = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  assert.equal(got.length, want.length);
  for (let n = 0; n < want.length; n++) assert.deepEqual(got[n], want[n], want[n].key);
});

test('the pin is repeatable: playing the lines twice gives the same record', async () => {
  const g = await open({ scope: 'full' });
  const a = await g.ev(playLines), b = await g.ev(playLines);
  await g.done();
  assert.deepEqual(a, b);
});

const IDS = ['bar-silence', 'bar-place', 'bar-card-win', 'bar-card-lose', 'bar-home-talk', 'bar-bless', 'bar-leave', 'bar-drink-talk', 'bar-work', 'bar-trait', 'bar-goal', 'bar-openers', 'bar-secret-talk', 'bar-crew', 'bar-goal-help', 'bar-secret-help', 'bar-react', 'trait-chatter'].map(x => `lines:${x}`);

test('every table is read: an override for each of its lines shows in what the topics and the chatter play, and nothing else changes', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(arg => {
    const play = (0, eval)(`(${arg.src})`);
    const lines = Object.fromEntries(arg.ids.map(id => [id, lineTableRegistry().find(e => e.id === id).scene.parts]));
    const base = play();
    const overrides = Object.fromEntries(arg.ids.map(id => [id, { parts: Object.fromEntries(Object.keys(lines[id]).map(k => [k, `@@${id}|${k}@@${(lines[id][k].match(/\{\w+\}/g) || []).join('')}`])) }]));  // a line keeps the {words} it has, so a name in it is still filled
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base, changed, lines, warned, registered: lineTableRegistry().map(e => e.id).filter(id => !id.startsWith('lines:social-') && !id.startsWith('lines:family-')) };  // the tables of js/social.js and js/familytext.js are read in sociallines.test.js and familylines.test.js
  }, { src: playLines.toString(), ids: IDS });
  await g.done();
  assert.deepEqual(r.registered, IDS, 'the registry holds the tables, in this order');
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const all = JSON.stringify(r.changed);
  for (const id of IDS) assert.ok(Object.keys(r.lines[id]).length >= 3, `${id} has lines`);
  // each table is read by some case; every line of it that a case could draw is checked in the next test
  const unread = IDS.filter(id => !all.includes(`@@${id}|`));
  assert.deepEqual(unread, [], 'a table the game never reads through its id');
  assert.equal(r.changed.length, r.base.length);
});

test('a table is shaped as it was: the same pool, in the same order, with each line the one the table holds', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const out = {};
    for (const t of LINE_TABLES) {
      const shipped = t.table(), lined = linedText(t.id, shipped), flat = flatLines(shipped);
      out[t.id] = { same: JSON.stringify(shipped) === JSON.stringify(lined), n: Object.keys(flat).length, empty: Object.entries(flat).filter(([, v]) => !v.trim()).map(([k]) => k) };
      useOverrides({ [t.id]: { parts: Object.fromEntries(Object.keys(flat).map(k => [k, `@@${k}@@`])) } });
      const marked = flatLines(linedText(t.id, shipped));
      out[t.id].keys = Object.keys(flat).filter(k => marked[k] !== `@@${k}@@`);
    }
    useOverrides({});
    return out;
  });
  await g.done();
  for (const [id, x] of Object.entries(r)) {
    assert.ok(x.same, `${id} reads as it is shipped`);
    assert.deepEqual(x.empty, [], `${id} has no empty line`);
    assert.deepEqual(x.keys, [], `${id}: a line the layer does not reach`);
  }
});

test('an override is escaped in a bar line and left plain in the chatter, and a bad one is left out with one warning', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    const warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    const clean = cleanOverrides({
      'lines:bar-leave': { parts: { 1: 'A <b>wave</b> & {n} goes.', 0: 'Uses {nothing}.', 9: 'No such line.', 2: '' }, title: 'No', choices: { 0: { label: 'x' } } },
      'lines:trait-chatter': { parts: { 'talkative.0': '<b>{first}</b> & talks.' } },
      'lines:nope': { parts: { 0: 'x' } },
    });
    console.warn = warn;
    useOverrides({ 'lines:bar-leave': { parts: { 1: 'A <b>wave</b> & {n} goes.' } }, 'lines:trait-chatter': { parts: { 'talkative.0': '<b>{first}</b> & talks.' } } });
    return { clean, warned, bar: barLines('leave')[1], bar2: barLines('leave')[0], chatter: traitChatter('talkative')[0] };
  });
  await g.done();
  assert.deepEqual(r.clean, { 'lines:bar-leave': { parts: { 1: 'A <b>wave</b> & {n} goes.' } }, 'lines:trait-chatter': { parts: { 'talkative.0': '<b>{first}</b> & talks.' } } });
  assert.equal(r.warned.length, 1, 'one warning for the file');
  for (const w of ['parts.0 has {nothing}', 'parts has no "9"', 'parts.2 is not text', 'has no "title"', 'has no choice 0', 'unknown scene "lines:nope"']) assert.ok(r.warned[0].includes(w), `${w} in: ${r.warned[0]}`);
  assert.equal(r.bar, 'A &lt;b&gt;wave&lt;/b&gt; &amp; {n} goes.', 'a bar line is text');
  assert.equal(r.bar2, 'You get up and leave them to their drink. You go back to the bar and the noise of the room.', 'the other lines are as shipped');
  assert.equal(r.chatter, '<b>{first}</b> & talks.', 'the chatter is drawn as plain text');
});

test('a line table in the bar files with no id fails here: every BAR_ table is in LINE_TABLES', () => {
  const src = f => fs.readFileSync(path.join(__dirname, '..', 'js', f), 'utf8');
  const NOT_TABLES = ['BAR_MENU', 'BAR_REPEAT', 'BAR_TOPICS'];  // the menu's size, the days before a topic comes round again, and the topics (code)
  const OTHER = ['OPENERS', 'SECRET_TALK', 'CREW_AT_BAR', 'GOAL_HELP', 'SECRET_HELP'];  // tables of the bar files with names of their own (HELP_TASTE holds traits and a price, no words)
  const tables = [...['bar.js', 'bartopics.js'].flatMap(f => [...src(f).matchAll(/^const (BAR_[A-Z_]+) = /gm)].map(m => m[1])).filter(n => !NOT_TABLES.includes(n)), ...OTHER];
  const registered = src('linetables.js');
  assert.ok(tables.length >= 17, `${tables.length} tables found`);
  for (const n of OTHER) assert.ok(['bar.js', 'bartopics.js'].some(f => new RegExp(`^const ${n} = `, 'm').test(src(f))), `${n} is still a table of the bar files`);
  assert.deepEqual(tables.filter(n => !registered.includes(`table: () => ${n} }`) && !registered.includes(`table: () => ${n},`)), [], 'a BAR_ table with no id in js/linetables.js');
  assert.ok(registered.includes('d.chatter'), 'the trait chatter has an id');
});

test('the labels of the goal help are left plain for the dialog to escape, and the lines under them are text', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    useOverrides({ 'lines:bar-goal-help': { parts: { 'home.gift': 'Pay <b>part</b> & go (60 cr)', 'home.ask': 'Ask <i>about</i> home', 'home.text': '{n} sighs <b>twice</b>.' } } });
    const h = barLines('goal-help').home, plain = barLines('goal-help').family;
    useOverrides({});
    return { gift: h.gift, ask: h.ask, text: h.text, other: plain.gift };
  });
  await g.done();
  assert.equal(r.gift, 'Pay <b>part</b> & go (60 cr)');
  assert.equal(r.ask, 'Ask <i>about</i> home');
  assert.equal(r.text, '{n} sighs &lt;b&gt;twice&lt;/b&gt;.');
  assert.equal(r.other, 'Press a few credits into their hand for a present (60 cr)');
});

test('every bar topic has an id and lines, and every line is read: the button, the reason it is shut and what it ends on', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(src => {
    const play = (0, eval)(`(${src})`);
    const ids = [...BAR_TOPICS.map(t => `bar:${t.id}`), 'bar:goal-help', 'bar:secret-help'], have = Object.keys(PEOPLE_LINES).filter(id => id.startsWith('bar:'));
    const mark = (id, key) => `@@${id}|${key}@@${(PEOPLE_LINES[id][key].match(/\{\w+\}/g) || []).join('')}`;
    const overrides = Object.fromEntries(ids.map(id => [id, { parts: Object.fromEntries(Object.keys(PEOPLE_LINES[id]).map(k => [k, mark(id, k)])) }]));
    const base = play(), warned = []; const warn = console.warn; console.warn = m => warned.push(m);
    useOverrides(overrides);
    console.warn = warn;
    const changed = play();
    return { base, changed, ids, have, warned, keys: Object.fromEntries(ids.map(id => [id, Object.keys(PEOPLE_LINES[id])])), registry: peopleEventRegistry().map(e => e.id).filter(id => id.startsWith('bar:')) };
  }, playLines.toString());
  await g.done();
  assert.deepEqual(r.have, r.ids, 'lines for every topic and the two help scenes, and for nothing else');
  assert.deepEqual(r.registry, r.ids, 'the registry lists them');
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  const all = JSON.stringify(r.changed), missing = [];
  for (const [id, keys] of Object.entries(r.keys)) for (const k of keys) if (!all.includes(`@@${id}|${k}@@`)) missing.push(`${id} ${k}`);
  assert.deepEqual(missing, [], 'a line the topics never read');
  assert.equal(r.changed.length, r.base.length);
});
