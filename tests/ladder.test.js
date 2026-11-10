'use strict';

// The Ladder card on the hand's own page (js/picks.js ladderHtml, js/character.js, #963): the post's five rungs, the picks taken, the rung due
// with its two picks to take, and the action that takes one at the port.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; G.mode = 'landed';
    return st;
  };
  window.page = () => { G.viewPerson = 'you'; UI.tab = 'person'; UI.render(); return document.querySelector('.shell .body'); };
  window.ladder = () => { const b = page(); const card = [...b.querySelectorAll('.con-card')].find(c => /Ladder/.test(c.querySelector('.eyebrow') ? c.querySelector('.eyebrow').textContent : '')); return card; };
};

test('the Ladder card shows the rungs, offers the due rung\'s two picks, takes one at the port, shuts a pick with its reason, and takes nothing in a burn', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    career().skill.gunner = 0; let card = ladder();
    out.none = { card: !!card, waits: card ? /A pick waits/.test(card.textContent) : null, takes: card ? card.querySelectorAll('button[data-action="pick"]').length : null, rungs: card ? card.textContent.match(/Level \d/g).length : null };
    career().skill.gunner = 45; card = ladder();  // level 2: rung 1 due, rung 2 behind it
    out.due = { waits: /A pick waits/.test(card.textContent), takes: [...card.querySelectorAll('button[data-action="pick"]')].map(b => b.dataset.arg), vent: card.querySelector('button[data-arg="vent"]') };
    out.due.ventShut = out.due.vent ? out.due.vent.disabled : null; out.due.why = out.due.vent ? (out.due.vent.parentElement.textContent.match(/does not trust|not aboard/) || [''])[0] : null;
    Mods.act('pick', 'vent'); out.ventTaken = takenPicks(career()).includes('vent');
    Mods.act('pick', 'steady-eye'); card = ladder();
    out.taken = { picks: [...takenPicks(career())], names: /Steady eye/.test(card.textContent), next: [...card.querySelectorAll('button[data-action="pick"]')].map(b => b.dataset.arg) };
    G.mode = 'transit'; Mods.act('pick', 'lead'); G.mode = 'landed'; out.inBurn = [...takenPicks(career())];
    return out;
  });
  assert.deepEqual(r.none, { card: true, waits: false, takes: 0, rungs: 5 });
  assert.equal(r.due.waits, true); assert.deepEqual(r.due.takes, ['vent', 'steady-eye']);
  assert.equal(r.due.ventShut, true, 'Tomas does not trust the hand yet, so the taught move is shut'); assert.match(r.due.why, /does not trust|not aboard/);
  assert.equal(r.ventTaken, false, 'a shut pick is not taken by the action');
  assert.deepEqual(r.taken.picks, ['steady-eye']); assert.ok(r.taken.names); assert.deepEqual(r.taken.next, ['lead', 'cover-eye']);
  assert.deepEqual(r.inBurn, ['steady-eye'], 'nothing is taken in a burn');
  await done();
});

test('the Ladder card renders its golden markup at level 2 with one pick taken', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const html = await ev(() => { setup(); career().skill.gunner = 45; takePick(career(), 'steady-eye'); return ladder().outerHTML; });
  const file = 'tests/fixtures/ladder.html';
  if (process.env.UPDATE_GOLDEN || !fs.existsSync(file)) fs.writeFileSync(file, html + '\n');
  assert.equal(html + '\n', fs.readFileSync(file, 'utf8'), `ladder: the markup changed (UPDATE_GOLDEN=1 rewrites ${file})`);
  await done();
});
