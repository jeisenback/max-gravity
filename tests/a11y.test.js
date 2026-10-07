'use strict';

// Keyboard and screen-reader access to the shell (docs/superpowers/plans/2026-10-07-ship-interface-step4-phone-tablet-access.md, #322, #267).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A hired gunner landed at Earth, with a spy on announce() that records each line it is given.
async function landed() {
  const g = await open({ scope: 'earth-hired', shell: 'default' });
  await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); G.state.story.next = 1e9;
    window.__told = []; const real = window.announce; window.announce = t => { __told.push(t); return real(t); };
  });
  return g;
}
const live = page => page.evaluate(() => (document.getElementById('live') || {}).textContent);

test('a ship\'s-log message and a Comms line are announced once', async () => {
  const g = await landed();
  await g.ev(() => msg('Hull sound.'));
  await g.page.waitForFunction(() => (document.getElementById('live') || {}).textContent === 'Hull sound.');
  await g.ev(() => { G.transit = { comms: [] }; comm('A plume sweeps past.'); });
  await g.page.waitForFunction(() => (document.getElementById('live') || {}).textContent === 'A plume sweeps past.');
  assert.deepEqual(await g.ev(() => __told), ['Hull sound.', 'A plume sweeps past.'], 'each line was announced once');
  await g.done();
});

test('a muted Comms line is not announced', async () => {
  const g = await landed();
  await g.ev(() => { G.transit = { comms: [] }; Settings.quiet.market = true; comm('[Market] Prices rise at Mars.'); });
  await g.page.waitForTimeout(150);
  assert.deepEqual(await g.ev(() => __told), [], 'nothing announced');
  assert.ok(!(await live(g.page)).includes('Prices rise'), 'the live region does not read it');
  await g.done();
});

test('the live region survives a re-render', async () => {
  const g = await landed();
  await g.ev(() => msg('Hull sound.'));
  await g.page.waitForFunction(() => (document.getElementById('live') || {}).textContent === 'Hull sound.');
  const r = await g.ev(() => {
    const el = document.getElementById('live'); UI.render();
    return { same: document.getElementById('live') === el, text: el.textContent, polite: el.getAttribute('aria-live'), atomic: el.getAttribute('aria-atomic'), inPanel: !!el.closest('#panel') };
  });
  assert.equal(r.same, true, 'the same element is still in the page');
  assert.equal(r.text, 'Hull sound.', 'its text is kept');
  assert.equal(r.polite, 'polite'); assert.equal(r.atomic, 'true');
  assert.equal(r.inPanel, false, 'it sits outside #panel');
  await g.done();
});

const active = page => page.evaluate(() => { const a = document.activeElement; return { page: !!a.closest && a.matches('.shell .body'), text: a.textContent.slice(0, 40), tag: a.tagName }; });

test('a room change focuses the page, and a re-render of the same page does not', async () => {
  const g = await landed();
  await g.page.click('.rail button[data-arg="crew"]');
  let a = await active(g.page);
  assert.equal(a.page, true, 'the page has focus after a room change');
  const body = await g.ev(() => { const b = document.querySelector('.shell .body'); return { role: b.getAttribute('role'), label: b.getAttribute('aria-label') }; });
  assert.equal(body.role, 'region'); assert.equal(body.label, 'Crew');
  await g.ev(() => { document.querySelector('.rail button[data-arg="journal"]').focus(); UI.render(); });
  a = await active(g.page);
  assert.equal(a.page, false, 'a re-render of the same page leaves focus alone');
  await g.done();
});

test('the active rail entry has aria-current', async () => {
  const g = await landed();
  await g.page.click('.rail button[data-arg="crew"]');
  assert.equal(await g.ev(() => document.querySelector('.rail button[aria-current="page"]').textContent), 'Crew');
  await g.done();
});

test('a scene dialog is modal, takes focus on its first enabled choice, and gives it back', async () => {
  const g = await landed();
  await g.page.click('.rail button[data-arg="crew"]');
  await g.ev(() => openEvent({ title: 'Two doors', text: 'Pick.', choices: [
    { label: 'Shut', can: () => false, why: () => 'Not yet.', run: () => 'no' }, { label: 'Open', run: () => 'You went through.' }] }));
  assert.equal(await g.ev(() => document.querySelector('.event-body').getAttribute('aria-modal')), 'true');
  assert.equal(await g.ev(() => document.activeElement.textContent), 'Open', 'focus is on the first enabled choice');
  await g.page.keyboard.press('Enter');
  const c = await g.ev(() => { const a = document.activeElement; return { text: a.textContent, d: a.getAttribute('aria-describedby'), dt: document.getElementById(a.getAttribute('aria-describedby') || 'none')?.textContent }; });
  assert.equal(c.text, 'Continue', 'Continue has focus after a choice');
  assert.ok(c.dt && c.dt.includes('You went through.'), 'Continue is described by the result');
  await g.page.keyboard.press('Enter');
  assert.equal((await active(g.page)).page, true, 'focus returns to the page when the opener is gone');
  await g.done();
});

test('a link button shows a focus ring', async () => {
  const g = await landed();
  const r = await g.ev(() => {
    const b = document.createElement('button'); b.className = 'link'; b.textContent = 'x'; document.body.appendChild(b);
    b.focus(); return b.matches(':focus-visible') ? getComputedStyle(b).outlineStyle : 'not-visible';
  });
  assert.notEqual(r, 'none');
  await g.done();
});
