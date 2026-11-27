'use strict';

// The rules for a journey test (tests/journey-*.test.js, #1329): ev() only for setup, before the first action; no fixed sleeps; assertions on what the
// screen shows, never on G. Read from each file's text, so a journey that breaks one fails here naming the file, the test and the rule.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// What counts as the first action: the journey helpers that press or answer, any click (a locator's too), a key, typing, and a reload.
const ACTION = /\b(?:button|choose|answerScenes|playRadar|runBurn|playUntil)\(|\.click\(|\bpage\.(?:keyboard\.press|keyboard\.type|fill|reload)\(/;

// What a journey file's text breaks, as "<test>: <rule>" lines; each test's body is the text from its `test(` to the next.
function problems(src) {
  const out = [];
  const bodies = src.split(/\btest\(/).slice(1);
  for (const body of bodies) {
    const name = (body.match(/^\s*(['"`])(.*?)\1/) || [, , '(unnamed)'])[2];
    if (/waitForTimeout\(/.test(body)) out.push(`${name}: a fixed sleep (waitForTimeout); wait on the screen instead`);
    const first = body.search(ACTION);
    if (first >= 0 && /\bev\(/.test(body.slice(first))) out.push(`${name}: ev() after the first action; only setup may use it`);
    for (const line of body.split('\n')) if (/\bassert\.\w+\(/.test(line) && /\bG\./.test(line)) out.push(`${name}: an assertion on G (${line.trim().slice(0, 80)}); assert on the screen`);
  }
  return out;
}

test('every journey keeps the rules: setup before the first action, no fixed sleeps, assertions on the screen', () => {
  const files = fs.readdirSync(__dirname).filter(f => /^journey-[\w-]+\.test\.js$/.test(f) && f !== 'journey-rules.test.js');
  for (const f of files) assert.deepEqual(problems(fs.readFileSync(path.join(__dirname, f), 'utf8')), [], f);
});

test('every way a journey acts counts as its first action: ev() after any of them is reported', () => {
  for (const act of ["await page.locator('#panel').getByRole('button').click();", 'await answerScenes(page);', 'await playRadar(page);', 'await runBurn(page, /DOCKED/);', 'await page.reload();', "await page.keyboard.press('Digit4');", "await choose(page, 'Fire');"]) {
    const p = problems(`test('acts', async () => {\n  await ev(setup);\n  ${act}\n  await ev(() => 1);\n});`);
    assert.deepEqual(p, ['acts: ev() after the first action; only setup may use it'], act);
  }
});

test('a journey that breaks a rule is reported, one line for each rule it breaks', () => {
  const bad = `
test('a bad journey', async () => {
  await ev(setup);
  await button(page, 'Sail');
  await page.waitForTimeout(500);
  await ev(() => G.state.day);
  assert.equal(await ev(() => G.state.day), 2);
});
test('a good one', async () => {
  await ev(setup);
  await button(page, 'Sail');
  assert.match(await screen(page), /Landed/);
});`;
  const p = problems(bad);
  assert.equal(p.length, 3, p.join('\n'));
  assert.ok(p.every(l => l.startsWith('a bad journey: ')));
  assert.ok(p.some(l => /fixed sleep/.test(l)) && p.some(l => /ev\(\) after/.test(l)) && p.some(l => /assertion on G/.test(l)));
});
