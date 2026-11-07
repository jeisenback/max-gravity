'use strict';

// Reporting a problem from the game (the owner, 2026-11-07): the pause menu opens a note and a snapshot of where the game is, and sends them to a new GitHub
// issue, pre-filled, for the player to read and submit. The snapshot and the link are pure (js/report.js); the menu is a page test.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { reportUrl, REPORT_REPO, REPORT_MAX } = load(['js/report.js'], {}, ['reportUrl', 'REPORT_REPO', 'REPORT_MAX']);

test('the link opens a new issue on the repository, titled by the note, with the note and the snapshot in the body', () => {
  const url = new URL(reportUrl('The guns never hit', ['Version: 0.9.0-dev', 'Day: 31']));
  assert.equal(`${url.origin}${url.pathname}`, `https://github.com/${REPORT_REPO}/issues/new`);
  assert.equal(url.searchParams.get('title'), 'Player report: The guns never hit');
  const body = url.searchParams.get('body');
  assert.match(body, /The guns never hit/); assert.match(body, /Version: 0\.9\.0-dev/); assert.match(body, /Day: 31/);
});

test('a long note is cut in the title, and the link stays under the length a browser takes, the snapshot trimmed from its end', () => {
  const long = 'x'.repeat(500), lines = Array.from({ length: 400 }, (_, i) => `Line ${i}: ${'y'.repeat(60)}`);
  const url = reportUrl(long, lines);
  assert.ok(url.length <= REPORT_MAX, `${url.length}`);
  const u = new URL(url);
  assert.ok(u.searchParams.get('title').length <= 90);
  assert.match(u.searchParams.get('body'), /Line 0:/); assert.doesNotMatch(u.searchParams.get('body'), /Line 399:/);
});

test('an empty note still makes a report', () => {
  assert.equal(new URL(reportUrl('  ', ['Day: 1'])).searchParams.get('title'), 'Player report');
});

test('the pause menu has Report a problem: a note, what will be sent, and Open on GitHub, which opens the pre-filled issue', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    window.opened = []; window.open = (u, t) => { window.opened.push([u, t]); return null; };
  });
  await page.click('[data-action="menuPause"]');
  await page.click('[data-action="menuView"][data-arg="report"]');
  await page.fill('textarea[data-report-note]', 'The fight never ends');
  const shown = await page.textContent('.report-snapshot');
  await page.click('[data-action="menuReport"]');
  const r = await ev(() => window.opened);
  await done();
  assert.match(shown, /Version: /); assert.match(shown, /Day: /); assert.match(shown, /Chapter: 1/); assert.match(shown, /Where: /);
  assert.equal(r.length, 1); assert.equal(r[0][1], '_blank');
  const u = new URL(r[0][0]); assert.equal(u.searchParams.get('title'), 'Player report: The fight never ends'); assert.match(u.searchParams.get('body'), /Chapter: 1/);
});

test('F8 opens Report a problem anywhere in a game, in the middle of a fight too, with the fight in the snapshot', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; hired().raidTold = true; G.mode = 'flight'; G.player = makeShip(G.state.shipId, 0, 0, 0);
    startShipFight({ kind: 'pirate', shipId: 'corsair' }); if (!G.dialog && G.nextEvent) finishEvent();
  });
  await page.keyboard.press('F8');
  const shown = await page.textContent('.report-snapshot');
  await page.click('[data-action="menuBack"]');
  const after = await ev(() => ({ paused: !!G.paused, dialog: G.dialog && G.dialog.event.title }));
  await done();
  assert.match(shown, /Open: Battle Stations/); assert.match(shown, /Choices: .*Fire/);
  assert.deepEqual(after, { paused: false, dialog: 'Battle Stations' }, 'Back returns to the fight');
});

test('a scene\'s text is read as plain text by the browser\'s parser: tags gone, entities read once, nothing run', async () => {
  const { ev, done } = await open();
  const r = await ev(() => [reportText('<p>She closes</p><p>fast &amp; low</p>'), reportText('<scr<script>ipt>alert(1)</script>x &amp;lt;b&amp;gt;'), window.__ran === undefined]);
  await done();
  assert.equal(r[0], 'She closes / fast & low');
  assert.doesNotMatch(r[1], /<script/i); assert.match(r[1], /&lt;b&gt;/, 'an escaped entity is read once, not twice'); assert.equal(r[2], true);
});
