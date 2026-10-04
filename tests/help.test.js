'use strict';

// Help (js/help.js): in the narrow build no topic promises a feature that is switched off, and a hired hand's topics say
// what a hired hand has; with scope 'full' every topic is still there.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const OFF = ['company', 'outpost', 'story', 'legacy'];
const topics = () => helpTopics().map(h => ({ id: h.id, text: helpText(h).join(' ') }));

test('the narrow build hides the topics for what is off, and says what a hand has', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(topics);
  const ids = r.map(t => t.id);
  for (const id of OFF) assert.ok(!ids.includes(id), `${id} is hidden`);
  assert.ok(ids.includes('hand') && ids.includes('trading') && ids.includes('crew') && ids.includes('saves'));
  const text = Object.fromEntries(r.map(t => [t.id, t.text]));
  assert.match(text.hand, /first officer/); assert.match(text.hand, /ship of your own/);
  assert.doesNotMatch(text.hand, /Tomas|Ore Runner|weeks|17,000|21,000/, 'the day-0 text does not give away the used-ship deal');
  assert.match(text.trading, /The captain trades/); assert.doesNotMatch(text.trading, /Buy where a good is cheap/);
  assert.match(text.crew, /first officer/); assert.doesNotMatch(text.crew, /Hire crew in the Bar/);
  assert.match(text.travel, /Press Sail/);
  for (const [id, t] of Object.entries(text)) assert.doesNotMatch(t, /\b(company|outpost|stake|campaign|heir|Cold Water|Mars Navy)\b/i, `${id} promises something that is off`);
  await done();
});

test('every topic is plain text, in both builds, and the full build keeps its topics', async () => {
  for (const scope of ['earth-hired', 'full']) {
    const { ev, done } = await open({ scope });
    const r = await ev(topics);
    for (const t of r) { assert.ok(t.text.length > 40, `${scope}/${t.id}`); assert.doesNotMatch(t.text, /undefined|NaN|\{|[\u{1F300}-\u{1FAFF}☀-➿]/u, `${scope}/${t.id}`); }
    if (scope === 'full') {
      const ids = r.map(t => t.id);
      for (const id of OFF) assert.ok(ids.includes(id), `${id} is back`);
      assert.ok(!ids.includes('hand'), 'an owner has no hand topic');
      assert.ok(!/The captain trades/.test(r.find(t => t.id === 'trading').text), 'an owner reads the owner text');
    }
    await done();
  }
});

test('a hired hand in the full build gets the hand topics, and the Help screen lists what the build has', async () => {
  const { ev, done } = await open({ scope: 'full', title: true });
  const r = await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot' }); while (G.dialog) finishEvent(); return helpTopics().map(h => h.id); });
  assert.ok(r.includes('hand') && r.includes('company'));
  await done();
});

test('the tips do not point at an outpost the build does not have', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => { const claim = TIPS.find(t => t.id === 'claim'); G.mode = 'landed'; return claim.when(); });
  assert.equal(r, false);
  await done();
});
