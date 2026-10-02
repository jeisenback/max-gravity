'use strict';

// Bar work and leads (barwork.js): a hand's side work and berth leads, an owner's contract and trouble ahead.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (mode = 'owner') => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode, post: 'gunner' }); while (G.dialog) finishEvent(); const st = G.state; st.tutorial = null; st.story.next = 1e9; st.flags.classicCombat = true; };
  window.act = (a, arg) => { Mods.act(a, arg) || UI.act(a, arg); };
  // The bar rolls for a lead (cool-down 12 days): come back on later days until the predicate holds.
  window.until = (pred, n = 60) => { for (let i = 0; i < n && !pred(); i++) { G.state.day += 13; fillBar(currentPlanet()); } };
};

test('side work is for a hand, pays from their savings and takes the visit', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start('hired'); const st = G.state, out = {}; fillBar(currentPlanet());
    out.html = /Work for yourself/.test(barHtml());
    const c0 = st.credits, fund = st.hired.fund, xp0 = skillXp(st.hired.post); out.want = 60 + 40 * skillLevel(st.hired.post);
    act('sideWork', 'dock'); out.dockPaid = st.credits - c0; out.xp = skillXp(st.hired.post) - xp0; out.fund = st.hired.fund === fund;
    const c1 = st.credits; act('sideWork', 'odd'); out.second = st.credits - c1;   // one job a visit
    fillBar(currentPlanet()); const c2 = st.credits; act('sideWork', 'odd'); out.odd = st.credits - c2;
    // The card game, both ways, once a visit.
    st.credits = 1000; fillBar(currentPlanet()); const rr = Math.random;
    Math.random = () => 0.1; act('sideWork', 'cards'); out.win = st.credits; act('sideWork', 'cards'); out.again = st.credits; Math.random = rr;
    fillBar(currentPlanet()); Math.random = () => 0.9; act('sideWork', 'cards'); Math.random = rr; out.lose = st.credits;
    st.credits = 50; fillBar(currentPlanet()); out.poor = SIDE_WORK.cards.can();
    start('owner'); fillBar(currentPlanet()); out.owner = /Work for yourself/.test(barHtml()); const own = G.state.credits; act('sideWork', 'odd'); out.ownerPaid = G.state.credits - own;
    return out;
  });
  assert.ok(r.html); assert.equal(r.dockPaid, r.want); assert.equal(r.xp, 2); assert.ok(r.fund);
  assert.equal(r.second, 0); assert.ok(r.odd >= 40 && r.odd <= 60);
  assert.equal(r.win, 1100); assert.equal(r.again, 1100); assert.equal(r.lose, 1000); assert.equal(r.poor, false);
  assert.equal(r.owner, false); assert.equal(r.ownerPaid, 0);
  await done();
});

test('a hand hears of a real ship that is hiring, and the lead persists', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start('hired'); const st = G.state, out = {};
    until(() => (st.leads || []).length > 0);
    out.n = st.leads.length; const l = st.leads[0], cap = st.people[l.pid];
    out.real = !!cap && !!cap.ship && !!cap.captain && !!SYSTEMS[cap.haunt] && l.wage > 0 && l.share > 0 && !!l.treat && !!st.people[l.from];
    out.html = barHtml().includes(cap.ship.name);
    out.saved = JSON.parse(JSON.stringify(st)).leads.length;
    const have = st.leads.length; st.day += 3; fillBar(currentPlanet()); out.cool = st.leads.length - have;   // the regulars have nothing more yet
    for (let i = 0; i < 40; i++) { st.day += 13; fillBar(currentPlanet()); } out.cap = st.leads.length;
    start('owner'); for (let i = 0; i < 20; i++) { G.state.day += 13; fillBar(currentPlanet()); } out.ownerLeads = (G.state.leads || []).length;
    return out;
  });
  assert.ok(r.n >= 1); assert.ok(r.real); assert.ok(r.html); assert.equal(r.saved, r.n); assert.equal(r.cool, 0);
  assert.ok(r.cap <= 4); assert.equal(r.ownerLeads, 0);
  await done();
});

test('an owner gets a regular\'s contract on the board and trouble from the real world; a hand does not', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start('owner'); const st = G.state, out = {};
    G.offers = []; until(() => G.offers.some(o => o.contact && o.type === 'delivery'));
    const job = G.offers.find(o => o.contact && o.type === 'delivery'); out.job = !!job;
    if (job) { out.contact = !!st.people[job.contact]; out.valid = job.type === 'delivery' && !!SYSTEMS[job.destSystem] && job.pay > 0 && job.deadline > st.day; const n = st.missions.length; act('accept', G.offers.indexOf(job)); out.accepted = st.missions.length - n; }
    // Trouble ahead is only what the world's conditions say about systems in range.
    const real = troubleAhead(), all = Object.keys(SYSTEMS).filter(id => id !== st.systemId && inRange(st.systemId, id)).flatMap(id => conditions(id).map(c => c.text));
    out.matches = real.every(t => all.includes(t) && /pirate/i.test(t));
    start('hired'); G.offers = []; for (let i = 0; i < 20; i++) { G.state.day += 13; fillBar(currentPlanet()); } out.handJob = G.offers.some(o => o.contact);
    return out;
  });
  assert.ok(r.job); assert.ok(r.contact); assert.ok(r.valid); assert.equal(r.accepted, 1); assert.ok(r.matches); assert.equal(r.handJob, false);
  await done();
});
