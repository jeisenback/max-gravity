'use strict';

// The yard office (js/yardoffice.js): asking to buy opens a scene with the broker, and what you settle there sets the price.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null;
    G.mode = 'landed'; st.credits = 60000;
    return st;
  };
  window.ask = (label, id = 'courier') => {
    Mods.act('buyInAsk', id);
    const e = G.dialog && G.dialog.event; if (!e) return null;
    const i = e.choices.findIndex(c => c.label.includes(label)); chooseEvent(i); G.nextEvent = null; G.dialog = null;
    return { off: hired().haggle && hired().haggle.off, confirm: hired().confirm, price: buyInPrice(id), list: buyShip(id).price };
  };
};

test('asking to buy opens the yard office, and paying the asking price changes nothing', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => { setup(); const out = ask('Pay the asking price'); return out; });
  assert.equal(r.off, 0); assert.equal(r.confirm, 'courier'); assert.equal(r.price, r.list);
  await done();
});

test('haggling follows who you are here, not a roll: a stranger gets nothing, standing and skill each take 3 percent off', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {};
    st.rep[localGov()] = 0; st.hired.skill = {}; out.none = ask('Haggle');
    st.hired.haggle = null; st.rep[localGov()] = 20; out.one = ask('Haggle');
    st.hired.haggle = null; for (const post of Object.keys(POSTS)) for (let i = 0; i < 200; i++) gainSkill(post, 1); out.two = ask('Haggle');
    return out;
  });
  assert.equal(r.none.off, 0);
  assert.equal(r.one.off, Math.round(r.one.list * 0.03));
  assert.equal(r.two.off, Math.round(r.two.list * 0.06));
  await done();
});

test('an inspection costs the fee for most hands and is free for the engineer, who learns from it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup('gunner'), out = {}, c0 = st.credits;
    out.gunner = ask('inspector'); out.paid = c0 - st.credits;
    const st2 = setup('engineer'), c1 = st2.credits, xp = skillXp('engineer');
    out.engineer = ask('Go over her yourself'); out.engPaid = c1 - st2.credits; out.xp = skillXp('engineer') - xp;
    return out;
  });
  assert.equal(r.paid, 150); assert.equal(r.gunner.off, Math.round(r.gunner.list * 0.05));
  assert.equal(r.engPaid, 0); assert.ok(r.xp > 0); assert.equal(r.engineer.off, Math.round(r.engineer.list * 0.05));
  await done();
});

test('the settled price is what you pay, turning away clears it, and buying clears it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {};
    ask('Not today'); out.turned = { confirm: hired().confirm, haggle: hired().haggle };
    const got = ask('inspector'), before = st.credits; out.expect = got.price;
    Mods.act('buyInGo', 'courier'); while (G.dialog) finishEvent();
    out.paid = before - st.credits; out.after = { hired: !!G.state.hired };
    return out;
  });
  assert.deepEqual(r.turned, { confirm: null, haggle: null });
  assert.equal(r.paid, r.expect); assert.equal(r.after.hired, false);
  await done();
});
