'use strict';

// Readouts (js/readouts.js, #686): the strip of the hand's figures, the contract as a paper in the hold, the captain's log as rows, and the settlement as a note of what was off and the pay.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.startHand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.tutorial = null; G.state.story.next = 1e9; };
  window.aContract = (st, extra = {}) => ({ contract: true, shipper: 'the Compact Freight Office', good: 'water', tons: 90, from: st.planet, planet: 'Ironheart', sid: 'psyche', pay: 22002, due: st.day + 8, days: 6, ...extra });
};

test('the strip: the contract and its days, the hull, the fund, the savings, and a hurt while it lasts, under the header of every landed screen', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startHand(); const st = G.state, hd = hired(), out = {};
    hd.plan = { run: aContract(st) }; st.credits = 300;
    out.plan = stripItems(st, hd, st.armor, ship().armor, st.day);
    hd.plan = null; hd.run = { ...aContract(st), due: st.day - 2 }; st.armor = Math.round(ship().armor / 2); hd.hurtUntil = st.day + 4;
    out.late = stripItems(st, hd, st.armor, ship().armor, st.day);
    hd.run = { ...hd.run, due: st.day }; out.today = stripItems(st, hd, st.armor, ship().armor, st.day)[0][1];
    hd.run = null; hd.hurtUntil = 0; out.none = stripItems(st, hd, st.armor, ship().armor, st.day).map(([k]) => k);
    hd.plan = { run: aContract(st) }; st.armor = ship().armor; out.text = stripText(['Hull', 'Savings']);
    UI.render(); const el = document.querySelector('.hdr + .strip');  // the page draws the captain's real plan, so the DOM is read for its shape
    out.dom = el && [...el.children].map(c => c.textContent).join(' | '); out.role = el && el.getAttribute('role');
    for (const tab of ['crew', 'bar', 'journal']) { UI.tab = tab; UI.render(); out[tab] = !!document.querySelector('.strip'); }
    return out;
  });
  assert.deepEqual(r.plan, [['Contract', '90t Water to Ironheart, due in 8 days'], ['Hull', '100%'], ['Fund', '12,000 cr'], ['Savings', '300 cr']]);
  assert.deepEqual(r.late, [['Contract', '90t Water to Ironheart, 2 days late'], ['Hull', '50%'], ['Fund', '12,000 cr'], ['Savings', '300 cr'], ['Hurt', '4 days']]);
  assert.equal(r.today, '90t Water to Ironheart, due today');
  assert.deepEqual(r.none, ['Contract', 'Hull', 'Fund', 'Savings'], 'no contract is still a readout; a hurt that has passed is not');
  assert.match(r.dom, /^Contract [^|]+ \| Hull 100% \| Fund 12,000 cr \| Savings 300 cr$/); assert.equal(r.role, 'status');
  assert.ok(r.crew && r.bar && r.journal, 'the strip is on every landed screen');
  assert.equal(r.text, 'Contract 90t Water to Ironheart, due in 8 days  Fund 12,000 cr', 'the HUD\'s line skips what it draws as a bar or a figure');
  await done();
});

test('the contract is a paper in the hold: the shipper, the load, the ports, the pay, the due day and the dock printed on it', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startHand(); const st = G.state, hd = hired(), out = {};
    hd.plan = null; hd.run = null; out.none = operationsPanel();
    hd.run = { ...aContract(st), day: st.day - 3 }; out.paper = operationsPanel();
    return out;
  });
  assert.doesNotMatch(r.none, /class="eyebrow">Contract</, 'no contract, no paper');
  assert.match(r.paper, /class="eyebrow">Contract</);
  for (const line of ['Shipper</span><b >the Compact Freight Office', 'Load</span><b >90t Water', 'To</span><b >Ironheart, Psyche', 'Pay on delivery</span><b >22,002 cr', 'Due</span><b >', ', in 8 days</b>', 'Signed</span><b >', 'Docked a tenth of the pay a day late']) assert.ok(r.paper.includes(line), `the paper says ${line}`);
  await done();
});

test('a delivery takes the contract\'s tons and leaves the rest of the good in the hold; a good no longer in the game does not stop the arrival (#748, #750)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startHand(); const st = G.state, hd = hired(), here = currentPlanet(), out = {};
    hd.runsDone = 1;
    hd.run = { ...aContract(st), planet: here.name, sid: st.systemId, day: st.day - 6, cost: 0, due: st.day + 2 };
    st.cargo.water = hd.run.tons + 30; st.paid.water = 100;
    settleRun(here);
    out.left = st.cargo.water; out.paid = st.paid.water;
    hd.run = { ...aContract(st), good: 'gone', planet: here.name, sid: st.systemId, day: st.day - 6, cost: 0, due: st.day + 2 };
    try { out.note = settleRun(here); } catch (e) { out.error = String(e); }
    return out;
  });
  assert.equal(r.left, 30, 'the 30t beyond the contract stay aboard');
  assert.equal(r.paid, 100, 'and keep what was paid for them');
  assert.equal(r.error, undefined, 'a removed mod\'s good does not throw');
  assert.match(r.note, /^The load for .* was lost on the way/);
  await done();
});

test('the captain\'s log: each settled run is a row with the shipper, the load, the pay and late or short, on the Journal and Port pages and the captain\'s page; the note says what was off, then the pay', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startHand(); const st = G.state, hd = hired(), out = {}, here = currentPlanet();
    hd.runsDone = 1;  // a later arrival: the first is the first officer's scene
    const deliver = (tons, days, due) => { hd.run = { ...aContract(st), planet: here.name, sid: st.systemId, day: st.day - days, cost: 0, due: st.day + due }; st.cargo.water = tons; return settleRun(here); };
    out.clean = deliver(90, 6, 2);
    out.late = deliver(90, 6, -3);
    out.short = deliver(60, 6, 2);
    out.lost = deliver(0, 6, 2);
    out.rows = logRowsHtml(hd.ledger, 20);
    UI.tab = 'journal'; UI.render(); out.journal = document.querySelector('.shell .body').innerHTML;
    UI.tab = 'port'; UI.render(); out.port = document.querySelector('.shell .body').innerHTML;
    G.viewPerson = hd.captain; UI.tab = 'person'; UI.render(); out.captain = document.querySelector('.shell .body').innerHTML;
    return out;
  });
  assert.match(r.clean, /^Your pay: [\d,]+ cr wage and [\d,]+ cr share\./, 'nothing off: the pay alone');
  assert.match(r.late, /^3 days late, and the pay docked\. Your pay:/);
  assert.match(r.short, /^Short: 30t of the water did not arrive, and the Compact Freight Office paid for what did\. Your pay:/);
  assert.match(r.lost, /^The load for the Compact Freight Office was lost on the way, and there is no pay\. Your pay:/);
  const rows = r.rows.match(/<div class="con-read">/g);
  assert.equal(rows.length, 4);
  assert.match(r.rows, /90t Water for the Compact Freight Office, paid 22,002 cr<\/div>/, 'the clean run');
  assert.match(r.rows, /paid [\d,]+ cr, 3 days late<\/div>/); assert.match(r.rows, /60t Water for the Compact Freight Office, paid [\d,]+ cr, short<\/div>/); assert.match(r.rows, /the load for the Compact Freight Office lost, no pay<\/div>/);
  assert.match(r.journal, /<h3>Captain's log<\/h3>/); assert.equal((r.journal.match(/<div class="con-read">/g) || []).length, 4, 'the Journal page holds the log');
  assert.match(r.port, /class="eyebrow">Captain's log</); assert.ok(r.captain.includes('Recent runs') && r.captain.includes('paid 22,002 cr'), 'the captain\'s page shows the same rows');
  await done();
});
