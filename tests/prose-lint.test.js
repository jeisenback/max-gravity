'use strict';

// tools/prose-lint.js: the prose report (docs/superpowers/specs/2026-10-08-prose-and-world-design.md). It counts tic phrases, sentence
// shape and reported speech in the text of the narrative files. These are pure functions, so there is no browser here.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { extractProse, unpricedChoices, mispricedChoices, creditFigures, countTics, shape, speech, lint, report, compare, narrativeFiles, main } = require('../tools/prose-lint');

const tmp = files => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prose-'));
  for (const [f, src] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), src); }
  return root;
};

test('extractProse keeps prose strings and skips comments and short ids', () => {
  const src = [
    "// a comment with several words in it",
    "const a = 'short';",
    "const b = \"She said \\\"no\\\" to the offer today.\";",
    "const c = `Day ${n} at the port with the crew.`;",
    "/* a block comment with \"quoted words inside it\" */",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['She said "no" to the offer today.', 'Day X at the port with the crew.']);
});

test('extractProse is not fooled by // in a string, an apostrophe in a comment, or a nested template', () => {
  const src = [
    "// don't stop here",
    "const u = 'See http://example.org for the long list of ports.';",
    "const t = `Docked at ${port ? `the ${port}` : 'Ceres'} with the ice aboard.`;",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['See http://example.org for the long list of ports.', 'Docked at X with the ice aboard.']);
});

test('countTics counts each pattern once per occurrence and reports zeros', () => {
  const text = 'He nods. She nods, and then, a little later, as if nothing had happened, it was somehow fine. For a while they sat. For a long moment nobody spoke, as though waiting.';
  assert.deepEqual(countTics(text), { hedge: 1, nods: 2, andThen: 1, asIf: 2, forAWhile: 1, longMoment: 1, adverb: 1, aside: 0 });
  assert.equal(countTics('It is, which is worse, a kind of mercy, in a way that nobody likes.').aside, 3);
});

test('shape measures sentence length, spread and runs of short sentences', () => {
  const r = shape(['One two three. Four five six seven eight nine ten eleven twelve.', 'A b. C d. E f. G h. I j k l m n o p.']);
  assert.deepEqual(r, { count: 7, mean: 4, sd: 2.88, shortShare: 0.71, shortRuns: 1 });
});

test('shape splits after a closing quote, and gives zeros for no text', () => {
  assert.equal(shape(['"Hold it," she says. "Hold it until she is inside two thousand."']).count, 2);
  assert.equal(shape(['\u201CHold it,\u201D she says. \u201CHold it until she is inside two thousand.\u201D']).count, 2, 'curly closing quotes split too (#429)');
  assert.deepEqual(shape([]), { count: 0, mean: 0, sd: 0, shortShare: 0, shortRuns: 0 });
});

test('speech counts quoted spans and reported speech', () => {
  const r = speech(['"I said something," Mara says. She says that she did.', 'Ines asks if it is on. He told her that it was.']);
  assert.deepEqual(r, { quoted: 1, reported: 3, uncontracted: 0, narrated: 1 });
});

test('speech counts a quoted span that is not contracted, and not narration or a possessive "have"', () => {
  const r = speech(['"I do not know," she says. "It\'s fine."', '"I will see," he says, and he does not smile.', '"I have a column for each."', '"We cannot go back."']);
  assert.equal(r.uncontracted, 3, '"I do not", "I will see" and "We cannot" count; "It\'s fine", the narration and "I have a column" do not');
  assert.equal(r.narrated, 1, '"he does not smile" is narration that is not contracted');
});

test('lint totals the tics, strings and shape across files', () => {
  const r = lint({ 'a.js': "const x = 'He nods and sits down at the table.';", 'b.js': 'const y = "She nods and leaves the galley now.";' });
  assert.equal(r.total.tics.nods, 2);
  assert.equal(r.files['a.js'].strings, 1);
  assert.equal(r.total.shape.count, 2);
  for (const p of ['a.js', 'b.js', 'total']) assert.ok(report(r).includes(p));
});

test('compare names each difference, and says no change when there is none', () => {
  const base = lint({ 'a.js': "const x = 'He nods and she nods at the door.';" });
  const now = lint({ 'a.js': "const x = 'He nods and she waits at the door.';" });
  assert.ok(compare(base, now).includes('nods: 2 -> 1 (-1)'));
  assert.equal(compare(base, base), 'no change');
});

test('narrativeFiles lists the real narrative files and nothing from tests', () => {
  const root = path.resolve(__dirname, '..');
  const files = narrativeFiles(root);
  for (const f of ['js/cast.js', 'js/captains/hester.js', 'js/stories/aftermath.js', 'js/hiredscenes.js', 'js/engagements.js', 'js/world.js', 'js/transit.js', 'js/game.js', 'js/barwork.js']) assert.ok(files.includes(f), f);
  assert.ok(files.every(f => fs.existsSync(path.join(root, f)) && !f.startsWith('tests/')));
  assert.deepEqual(narrativeFiles(tmp({})), []);
});

test('main writes a baseline, compares to it, and explains when there is none', () => {
  const root = tmp({ 'js/cast.js': "const a = 'He nods and sits down at the table.';" });
  const lines = []; const out = s => lines.push(s);
  assert.equal(main(['--compare'], { root, out }), 0, 'the report never fails a script, so a missing baseline exits 0 (#431)');
  assert.ok(lines.join('\n').includes('no baseline') && lines.join('\n').includes('--write'));
  assert.equal(main(['--write'], { root, out }), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'docs/prose-baseline.json'), 'utf8')).total.strings, 1);
  lines.length = 0;
  assert.equal(main(['--compare'], { root, out }), 0);
  assert.equal(lines.join('\n'), 'no change');
  assert.equal(main([], { root: tmp({}), out }), 0);
});

test('extractProse reads string literals joined with + as one passage', () => {
  const src = [
    "const t = 'Cato finds you at the end of the watch. \"I ' +",
    "  'do the watch bill,\" he says. He holds out a mug.';",
    "const n = 1 + 2; const s = 'a separate string with four words';",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['Cato finds you at the end of the watch. "I do the watch bill," he says. He holds out a mug.', 'a separate string with four words']);
});

test('extractProse skips a regex literal that holds a quote mark', () => {
  const src = "const r = /it's/; const s = 'the real string with four words';";
  assert.deepEqual(extractProse(src), ['the real string with four words']);
});

test('extractProse survives a regex with a quote inside a template expression, and still reads a division', () => {
  const src = [
    "const t = `Hello ${x.replace(/'/g, '')} there and welcome aboard.`;",
    "const h = total / 2; const s = 'another string with four words';",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['Hello X there and welcome aboard.', 'another string with four words']);
});

test('countTics also counts the asides listed in the tic table', () => {
  assert.equal(countTics('She is very interested in the log, and gives a look you would like back.').aside, 2);
});

test('compare shows the spread, and reads an older baseline that lacks a tic id', () => {
  const base = lint({ 'a.js': "const x = 'He sits. She stands up. They wait at the door for the others to come.';" });
  const now = lint({ 'a.js': "const x = 'He sits down at the table. She stands up beside him and waits. They wait at the door for the others to come.';" });
  assert.ok(/^sd: /m.test(compare(base, now)), compare(base, now));
  const old = JSON.parse(JSON.stringify(base)); delete old.total.tics.aside;
  assert.ok(!/NaN|undefined/.test(compare(old, now)), compare(old, now));
});

test('unpricedChoices finds a choice that costs something and shows no figure in its label', () => {
  const src = [
    "scene({ id: 'a', title: 'Pickpocket', choices: [",
    "  { label: 'Let it go', effects: { credits: -250 }, result: 'You cancel the chit; they spent 250 cr of it.' },",
    "  { label: 'Pay the fine (250 cr)', effects: { credits: -250 }, result: 'Paid.' },",
    "  { label: 'Pay them off', cost: true, run() {} },",
    "  { label: `Pay ${fine} cr`, cost: true },",
    "  { label: 'Offer to put something in', when: { credits: 200 }, effects: {} },",
    "  { label: 'Walk past', result: 'You lose 250 credits in the telling.' },",
    "  { label: 'Battle stations', fight: true },",
    "  { label: 'Give two tons', cost: 2 },",
    "] });",
  ].join('\n');
  assert.deepEqual(unpricedChoices(src), [
    { id: 'Pickpocket', label: 'Let it go', why: 'effect' },
    { id: 'Pickpocket', label: 'Pay them off', why: 'tag' },
    { id: 'Pickpocket', label: 'Offer to put something in', why: 'gate' },
  ]);
});

test('unpricedChoices reads code only: a comment or a result that says cost: true is not a stake', () => {
  const src = "// cost: true\nscene({ id: 'b', choices: [{ label: 'Stay out of it', result: 'It cost: 5 credits: -3 to watch.' }] });";
  assert.deepEqual(unpricedChoices(src), []);
});

test('the report lists unpriced choices per file, and compare names the ones that come and go', () => {
  const costly = "scene({ id: 'x', choices: [{ label: 'Let it go', effects: { credits: -250 } }] });";
  const priced = "scene({ id: 'x', choices: [{ label: 'Let it go (250 cr)', effects: { credits: -250 } }] });";
  const base = lint({ 'a.js': costly }), now = lint({ 'a.js': priced });
  assert.ok(report(base).includes('show no figure in the label: 1') && report(base).includes('a.js: 1') && report(base).includes('x: Let it go [effect]'));
  assert.ok(compare(base, now).includes('unpriced: 1 -> 0 (-1)') && compare(base, now).includes('gone: a.js  x: Let it go [effect]'));
  assert.equal(compare({ total: { ...base.total, unpriced: undefined } , }, base).includes('unpriced: 0 -> 1'), true, 'an older baseline has none');
});

test('creditFigures finds credit figures written in the text, in digits and in words, and not the ones filled from code (#779)', () => {
  const src = [
    "const A = { text: 'The fare is 300 cr, and she wants it now.', label: 'Pay (1,500 cr)' };",
    "const B = 'A shave costs six credits. The tea is nine credits, and the seed is eleven credits.';",
    "const C = `You owe ${fine} cr, and ${n} credits more.`;",
    "const D = 'Forty-two hundred credits for the cargo.';",
    "const E = 'Two crew, three days, a credit chit.';",
    "// a comment: 500 cr",
  ].join('\n');
  assert.deepEqual(creditFigures(src).map(f => f.figure), ['300 cr', '1,500 cr', 'six credits', 'nine credits', 'eleven credits', 'Forty-two hundred credits']);
  assert.match(creditFigures(src)[0].text, /^The fare is 300 cr/);
});

test('the report lists credit figures per file, and compare names the ones that come and go (#779)', () => {
  const base = lint({ 'a.js': "const t = 'The fare is 300 cr.';" }), now = lint({ 'a.js': "const t = `The fare is ${fare} cr.`;" });
  assert.ok(report(base).includes('credit figures written in the text: 1') && report(base).includes('300 cr: The fare is 300 cr.'));
  assert.ok(compare(base, now).includes('credits: 1 -> 0 (-1)') && compare(base, now).includes('gone: a.js  300 cr: The fare is 300 cr.'));
  assert.equal(compare({ total: { ...base.total, credits: undefined } }, base).includes('credits: 0 -> 1'), true, 'an older baseline has none');
});

test('mispricedChoices finds a choice whose label names a price its effect or gate does not move (#779)', () => {
  const src = [
    "scene({ id: 'a', choices: [",
    "  { label: 'Pay it (200 cr)', when: { credits: 200 }, effects: { credits: -200 } },",
    "  { label: 'Pay it (200 cr)', effects: { credits: -150 } },",
    "  { label: 'Hand her over (+2,000 cr)', effects: { credits: 2000 } },",
    "  { label: 'Buy five tons (5t at 250 cr/t)', effects: { credits: -1250 } },",
    "  { label: 'Pay what you like (60 cr)', run() {} },",
    "] });",
  ].join('\n');
  assert.deepEqual(mispricedChoices(src), [{ id: 'a', label: 'Pay it (200 cr)', says: '200', code: '150' }]);
});

test('in the game, every choice written as data names the price its effect or gate moves (#779)', () => {
  const root = path.resolve(__dirname, '..'), files = [];
  const walk = d => { for (const f of fs.readdirSync(path.join(root, d))) { const p = `${d}/${f}`; if (fs.statSync(path.join(root, p)).isDirectory()) walk(p); else if (p.endsWith('.js')) files.push(p); } };
  walk('js');
  const wrong = files.flatMap(f => mispricedChoices(fs.readFileSync(path.join(root, f), 'utf8')).map(c => `${f}  ${c.id}: ${c.label} (the code moves ${c.code})`));
  assert.deepEqual(wrong, [], 'the figure in the label and the credits in the code must move together');
});
