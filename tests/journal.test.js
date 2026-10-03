'use strict';

// The Journal tab (js/journal.js), under Interior: what the ship keeps about the world and your part in it. The Port screen
// keeps what is about the port.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => { window.hand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent(); }; };

test('Interior has a Crew tab and a Journal tab, and the Journal holds the journal, standing, feeds and news', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { hand(); const st = G.state; st.journal = [{ day: st.day, text: 'You covered the watch.' }, { day: st.day - 3, text: 'The captain made the window.' }]; UI.tab = 'crew'; UI.render(); });
  const tabs = await page.$$eval('.tabs.sub button', b => b.map(x => x.textContent));
  assert.deepEqual(tabs, ['Crew', 'Bonds', 'Journal']);
  await page.click('.tabs.sub [data-arg=journal]');
  const text = await page.innerText('#panel .body');
  for (const part of [/Journal/i, /You covered the watch/, /The captain made the window/, /Standing/i, /On the feeds/i, /News/i]) assert.match(text, part);  // headings are upper-cased by the page
  assert.equal(await ev(() => UI.tab), 'journal');
  assert.equal(await ev(() => stationOf(UI.tab).id), 'interior', 'it sits under Interior');
  await page.click('.tabs.sub [data-arg=crew]');
  assert.match(await page.innerText('#panel'), /Posts/i, 'the Crew tab is the deck as before');
  await done();
});

test('the Port screen no longer carries the journal, standing, feeds or news, but keeps the conditions', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const html = await ev(() => { while (G.dialog) finishEvent(); G.state.journal = [{ day: G.state.day, text: 'A thing happened.' }]; return UI.views.port.call(UI); });
  for (const gone of [/<h3>Journal<\/h3>/, /<h3>Standing<\/h3>/, /<h3>On the feeds<\/h3>/, /<h3>News<\/h3>/, /A thing happened/]) assert.doesNotMatch(html, gone);
  assert.match(html, /<h3>Local conditions<\/h3>/);
  assert.match(html, /<h3>Active missions<\/h3>/);
  const journal = await ev(() => UI.views.journal.call(UI));
  assert.match(journal, /A thing happened/);
  await done();
});

test('the Journal shows up to 20 entries and says so when there are none', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    while (G.dialog) finishEvent();
    const st = G.state; st.journal = [];
    const none = UI.views.journal.call(UI);
    st.journal = Array.from({ length: 20 }, (_, i) => ({ day: st.day - i, text: `Entry number ${i}.` }));
    return { none, full: UI.views.journal.call(UI) };
  });
  assert.match(r.none, /Nothing yet/);
  assert.equal((r.full.match(/Entry number \d+/g) || []).length, 20);
  await done();
});
