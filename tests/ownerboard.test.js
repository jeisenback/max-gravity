'use strict';

// The board the player picks from in chapter two (js/ownerboard.js, #685): after the ship is bought the Port page lists the day's contracts with a Take button, taking one loads the
// shipper's cargo and sets the course, and the landing at its port pays the player's credits and moves the shipper's regard.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  // A game that has bought its ship: the hand's record is gone and the career is left, docked at a port that trades.
  window.owner = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.credits = 100000; hired().kit = ['valve-keys']; hired().standing = { 'the League Freight Hall': 1 };
    buyIn('courier'); while (G.dialog) finishEvent();
    G.transit = null; G.mode = 'landed'; st.dest = null; st.systemId = 'earth'; st.planet = 'Earth'; G.dialog = null; G.nextEvent = null; UI.notes.length = 0;
    return st;
  };
  window.contract = (o = {}) => ({ shipper: 'the Compact Freight Office', good: 'water', tons: 30, from: 'Earth', sid: 'mars', planet: 'Mars', yard: false, days: 5, pay: 1200, due: G.state.day + 9, hazard: false, rumor: false, ...o });
  window.board = list => { const st = G.state; career().freight = { key: `${currentPlanet().name}@${st.day}`, list }; };
};
const run = async fn => { const t = await open(); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('the Port page of a ship the player owns lists the day\'s contracts with a Take button on each; a hand\'s Port page has none', async () => {
  const r = await run(() => {
    const out = {};
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; UI.tab = 'port'; UI.render(); out.hand = document.querySelector('.shell .body').textContent;
    const st = owner(); board([contract(), contract({ planet: 'Phobos Yards', good: 'metal', tons: 999 })]); UI.tab = 'port'; UI.render();
    out.page = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' '); out.buttons = [...document.querySelectorAll('button[data-action="takeContract"]')].map(b => b.disabled);
    board([]); UI.render(); out.empty = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    return out;
  });
  assert.ok(!/Contracts/.test(r.hand), 'a hand\'s page has no board');
  assert.match(r.page, /Contracts the Compact Freight Office: 30t of water to Mars \(Mars, 5 days\), due in 9 days\. Pays 1,200 cr\./); assert.deepEqual(r.buttons, [false, true], 'a load too big for the hold is shut');
  assert.match(r.empty, /Nothing on the board today\./);
});

test('taking a contract loads the shipper\'s cargo for nothing, sets the course, takes it off the board, and holds one at a time', async () => {
  const r = await run(() => {
    const st = owner(), out = {}; board([contract(), contract({ planet: 'Luna', sid: 'earth', good: 'metal', tons: 20 })]); const credits = st.credits;
    out.text = takeContract(0); out.cargo = { ...st.cargo }; out.credits = st.credits - credits; out.run = { planet: career().run.planet, tons: career().run.tons, contract: career().run.contract, from: career().run.from }; out.dest = st.dest;
    out.left = career().freight.list.map(k => k.planet); out.second = takeContract(0); out.page = (UI.tab = 'port', UI.render(), document.querySelector('.shell .body').textContent.replace(/\s+/g, ' '));
    return out;
  });
  assert.match(r.text, /are aboard, and the course is set for Mars\. Take off when you are ready\.|takes her out\./); assert.equal(r.cargo.water, 30); assert.equal(r.credits, 0);
  assert.deepEqual(r.run, { planet: 'Mars', tons: 30, contract: true, from: 'Earth' }); assert.equal(r.dest, 'mars'); assert.deepEqual(r.left, ['Luna']); assert.equal(r.second, '', 'one contract at a time');
  assert.match(r.page, /Contracts\s*30t of water for the Compact Freight Office, to Mars, due in 9 days\./);
});

test('the landing at the contract\'s port pays the player\'s credits and moves the shipper\'s regard: whole and on the day, up; late, short or lost, down and docked', async () => {
  const r = await run(() => {
    const st = owner(), out = {}, hall = 'the Compact Freight Office', land = (o, have, late) => {
      board([contract(o)]); takeContract(0); st.cargo.water = have; st.day += late ? 20 : 3; st.systemId = 'mars'; st.planet = 'Mars'; const c0 = st.credits, s0 = standingOf(career(), hall);
      const text = settleContract(currentPlanet()); st.systemId = 'earth'; st.planet = 'Earth';
      return { text, pay: st.credits - c0, standing: standingOf(career(), hall) - s0, run: career().run, water: st.cargo.water };
    };
    out.whole = land({}, 30, false); out.short = land({}, 18, false); out.late = land({}, 30, true); out.lost = land({}, 0, false);
    out.elsewhere = (() => { board([contract()]); takeContract(0); const t = settleContract({ name: 'Luna' }); return [t, !!career().run]; })();
    return out;
  });
  assert.equal(r.whole.pay, 1200); assert.equal(r.whole.standing, 1); assert.equal(r.whole.run, null); assert.equal(r.whole.water, undefined, 'the cargo is delivered'); assert.match(r.whole.text, /pays 1,200 cr for 30t of water\.$/);
  assert.equal(r.short.pay, 720); assert.equal(r.short.standing, -1); assert.match(r.short.text, /^Short: 12t did not arrive/);
  assert.ok(r.late.pay < 1200 && r.late.pay >= 600); assert.equal(r.late.standing, -1); assert.match(r.late.text, /days late, and the pay docked\./);
  assert.equal(r.lost.pay, 0); assert.equal(r.lost.standing, -2); assert.match(r.lost.text, /was lost on the way, and there is no pay\./);
  assert.deepEqual(r.elsewhere, ['', true], 'a landing elsewhere settles nothing');
});

test('the board is the same one the hand\'s captain sees, drawn once a day and kept, and a hand\'s own settle is not the owner\'s', async () => {
  const r = await run(() => {
    const st = owner(), here = currentPlanet(), a = contractBoard(st, here), b = contractBoard(st, here);
    st.day += 1; const c = contractBoard(st, here);
    return { same: a === b, redrawn: c !== a, key: career().freight.key, hired: hired(), settle: settleContract(here) };
  });
  assert.equal(r.same, true); assert.equal(r.redrawn, true); assert.match(r.key, /^Earth@\d+$/); assert.equal(r.hired, null); assert.equal(r.settle, '');
});
