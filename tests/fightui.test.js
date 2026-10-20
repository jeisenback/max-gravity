'use strict';

// The fight panel's dialog (turn-based combat, #786): a choice marked `keep` redraws the same dialog in place, with no result page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a keep choice runs, then redraws the dialog with the event it returns, with no result page', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    const first = { title: 'Standoff', text: 'first', choices: [] };
    first.choices = [
      { label: 'A', keep: true, run: () => ({ title: 'Standoff', text: 'second', choices: [{ label: 'End', run: () => 'It ends.' }] }) },
      { label: 'B', run: () => 'Plain result.' },
    ];
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    openEvent(first);
  });
  await page.click('[data-action="choose"][data-arg="0"]');
  const kept = await ev(() => ({ text: document.querySelector('.event-body').textContent, result: !!document.querySelector('#event-result'), shown: G.dialog && G.dialog.event.text }));
  assert.match(kept.text, /second/);
  assert.equal(kept.result, false);
  assert.equal(kept.shown, 'second');
  await page.click('[data-action="choose"][data-arg="0"]');  // a choice without keep still gives its result page
  assert.equal((await page.textContent('#event-result')).trim(), 'It ends.');
  await done();
});
