'use strict';

// The Comms screen (js/comms.js): contacts you can open, an inbox that links to people and filters by kind, and a marker for
// what arrived since you last docked. And the captain's sheet lists the last runs together (js/character.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// Runs in the page: starts a hired game with Hester Vance.
const helpers = () => { window.hand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'pilot', captainKey: 'hester' }); while (G.dialog) finishEvent(); }; };

test('Comms has buttons for you, the captain and the first officer, and lists the rest of the crew', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    hand();
    UI.tab = 'comms'; UI.render();
    const d = document.createElement('div'); d.innerHTML = commsPanel();
    const card = [...d.querySelectorAll('.con-card')].find(c => /Contacts/.test(c.querySelector('.eyebrow').textContent));
    const buttons = [...card.querySelectorAll('button[data-action=person]')].map(b => [b.textContent, b.dataset.arg]);
    return { buttons, captain: hiredCaptain().id, xo: crewMembers().find(c => c.role === 'xo').id, crew: crewMembers().length };
  });
  const by = Object.fromEntries(r.buttons.map(([label, arg]) => [label, arg]));
  assert.equal(by.You, 'you');
  assert.equal(by.Captain, r.captain);
  assert.equal(by['First officer'], r.xo);
  const links = r.buttons.filter(([label]) => !['You', 'Captain', 'First officer'].includes(label));
  assert.equal(links.length, r.crew - 1, 'everyone else aboard has a link, the first officer has the button');
  await ev(() => { UI.tab = 'comms'; UI.render(); });
  await page.click('#panel [data-action=person][data-arg=you]');
  assert.equal(await ev(() => UI.tab), 'person');
  assert.equal(await ev(() => G.viewPerson), 'you');
  await done();
});

test('an owner has no Captain button', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { while (G.dialog) finishEvent(); const d = document.createElement('div'); d.innerHTML = commsPanel(); return [...d.querySelectorAll('button[data-action=person]')].map(b => b.textContent); });
  assert.ok(r.includes('You'));
  assert.ok(!r.includes('Captain') && !r.includes('First officer'));
  await done();
});

test('a letter about a crewmate links to them, and what arrived since the last dock is marked new', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    hand();
    const st = G.state, wim = Object.values(st.people).find(p => p.first === 'Wim');
    st.inbox = []; st.inboxN = 0; st.dockMark = null;
    noteInbox('station', 'Old news. (Mars)');
    Mods.emit('landed', currentPlanet());                       // docking: everything so far is old
    noteInbox('ship', 'Hail from the Mercy: short of water.');  // arrived in transit
    UI.notes = [noteFor('A message for Wim at Earth: all is well.', wim.id)];
    Mods.emit('landed', currentPlanet());                       // the next dock brings the letter
    const d = document.createElement('div'); d.innerHTML = commsPanel();
    const msgs = [...d.querySelectorAll('.con-msg')].map(m => ({ text: m.querySelector('div').textContent, isNew: !!m.querySelector('.char-tag'), who: (m.querySelector('button[data-action=person]') || {}).dataset && m.querySelector('button[data-action=person]').dataset.arg }));
    return { msgs, wim: wim.id, stored: st.inbox.map(m => [m.n, !!m.pid]), mark: st.dockMark };
  });
  const byText = t => r.msgs.find(m => m.text.includes(t));
  assert.equal(byText('Old news').isNew, false);
  assert.equal(byText('Mercy').isNew, true);
  assert.equal(byText('message for Wim') === undefined, false);
  assert.equal(byText('A message for Wim').isNew, true);
  assert.equal(byText('A message for Wim').who, r.wim, 'the letter links to Wim');
  assert.equal(byText('Mercy').who, undefined, 'a hail has no person to link');
  await done();
});

test('the inbox filters by kind, and an unknown filter shows everything', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { hand(); const st = G.state; st.inbox = []; noteInbox('station', 'A call.'); noteInbox('ship', 'A hail.'); noteInbox('message', 'A note.'); noteInbox('crew', 'Aboard news.'); UI.commsFilter = undefined; UI.tab = 'comms'; UI.render(); });
  const count = () => page.$$eval('#panel .con-msg', els => els.length);
  assert.equal(await count(), 4);
  for (const [id, n] of [['station', 1], ['ship', 1], ['message', 1], ['crew', 1], ['all', 4]]) {
    await page.click(`#panel [data-action=commsFilter][data-arg=${id}]`);
    assert.equal(await count(), n, id);
  }
  await ev(() => Mods.act('commsFilter', 'nonsense'));
  assert.equal(await count(), 4, 'an unknown filter falls back to all');
  await ev(() => { G.state.inbox = []; UI.commsFilter = 'ship'; UI.render(); });
  assert.match(await page.innerText('#panel'), /Nothing yet/);
  await ev(() => { noteInbox('station', 'A call.'); UI.render(); });
  assert.match(await page.innerText('#panel'), /Nothing of that kind/);
  await done();
});

test('an older save, with messages that have no number, shows nothing as new', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const html = await ev(() => { hand(); const st = G.state; st.dockMark = undefined; st.inboxN = undefined; st.inbox = [{ day: st.day, via: 'message', text: 'From an old save.' }]; return commsPanel(); });
  assert.match(html, /From an old save/);
  assert.doesNotMatch(html, /char-tag">new/);
  await done();
});

test('the captain\'s sheet lists the last five runs, newest first, and says so when there are none', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    hand();
    const st = G.state, h = st.hired, sheet = () => { G.viewPerson = h.captain; return characterPanel(); };
    const none = sheet();
    h.ledger = Array.from({ length: 7 }, (_, i) => ({ day: st.day - i, from: `From${i}`, to: `To${i}`, good: 'water', tons: 10 + i, cost: 100, revenue: 300, profit: 200, wage: 50, share: 12 }));
    return { none, some: sheet() };
  });
  assert.match(r.none, /Recent runs/);
  assert.match(r.none, /No runs together yet/);
  assert.match(r.some, /From0 to To0/);
  assert.match(r.some, /From4 to To4/);
  assert.doesNotMatch(r.some, /From5 to To5/, 'only five');
  assert.ok(r.some.indexOf('From0') < r.some.indexOf('From4'), 'newest first');
  assert.match(r.some, /\+62 cr/, 'wage plus share');
  assert.match(r.some, /10t Water/);
  await done();
});
