'use strict';

// Shippers as people (js/shippers.js, #682): a shipper's regard moves with each delivery and the board reads it; the freight agent at the delivery port is
// one person, the same every time, who meets the ship when a delivery was late, short or lost.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; st.tutorial = null; hired().runsDone = 1; return st; };
  // The ship arrives at the port she is docked at with a contract run to it: `tons` of 90 aboard, `dueIn` days from today the paper's day.
  window.deliver = ({ tons = 90, dueIn = 2, shipper = 'the Compact Freight Office' } = {}) => {
    const st = G.state, h = hired(), here = currentPlanet();
    h.run = { contract: true, shipper, good: 'water', tons: 90, from: 'X', planet: here.name, sid: st.systemId, pay: 20000, day: st.day - 6, days: 6, due: st.day + dueIn, cost: 0, profit: 20000 };
    st.cargo = tons ? { water: tons } : {}; st.paid = {}; h.plan = null; h.off = null;
    G.dialog = null; G.nextEvent = null; UI.notes.length = 0;
    Mods.emit('landed', here);
    return G.dialog && G.dialog.event;
  };
};
const run = async (fn, o) => { const t = await open(o); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('a delivery on the day and whole raises the shipper\'s regard and meets nobody at the ramp; each fault lowers it and brings the agent', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), out = {}, name = 'the Compact Freight Office', agentTitles = /^(Late at the Lock|Short at the Lock|Nothing to Sign For)$/;
    const e0 = deliver(); out.clean = { standing: h.standing[name], scene: !!e0 && agentTitles.test(e0.title), off: h.off };
    const e1 = deliver({ dueIn: -2 }); out.late = { standing: h.standing[name], title: e1 && e1.title, text: e1 && e1.text, labels: e1 && e1.choices.map(c => c.label), people: e1 && e1.people };
    G.dialog = null; const e2 = deliver({ tons: 60 }); out.short = { standing: h.standing[name], title: e2 && e2.title, text: e2 && e2.text };
    G.dialog = null; const e3 = deliver({ tons: 0 }); out.lost = { standing: h.standing[name], title: e3 && e3.title, text: e3 && e3.text, people: e3 && e3.people };
    out.agentId = e1.people[0]; const a = person(out.agentId); out.agent = { job: a.job, title: a.title, agent: a.agent === currentPlanet().name, at: a.location === currentPlanet().name, map: st.agents[currentPlanet().name] };
    out.barSees = (G.bar || []).some(p => p.id === out.agentId);
    return out;
  });
  assert.deepEqual(r.clean, { standing: 1, scene: false, off: null }, 'a clean delivery: up one, and nothing at the ramp');
  assert.equal(r.late.standing, 0, 'late takes it from 1 to 0'); assert.equal(r.late.title, 'Late at the Lock');
  assert.match(r.late.text, /The paper said [\d]+ \w+ 2214\. The ship is 2 days past it\./); assert.match(r.late.text, /the Compact Freight Office docks a tenth/);
  assert.equal(r.late.labels.length, 3); assert.equal(r.late.labels[0], 'Own it'); assert.match(r.late.labels[1], /^Make the case \[\d+%; if it fails: the shipper's regard\]$/); assert.equal(r.late.labels[2], 'Say nothing');
  assert.equal(r.short.standing, -1, 'short takes it from 0 to -1'); assert.equal(r.short.title, 'Short at the Lock'); assert.match(r.short.text, /The paper says 90t of water\. \S+ \S+ makes it 60t\./);
  assert.equal(r.lost.standing, -3, 'lost takes it down two more'); assert.equal(r.lost.title, 'Nothing to Sign For'); assert.match(r.lost.text, /The paper says 90t of water for the Compact Freight Office\. The hold is empty\./);
  assert.equal(r.lost.people[0], r.agentId, 'the same agent every time at the port');
  assert.deepEqual(r.agent, { job: 'freight agent', title: 'Agent', agent: true, at: true, map: r.agentId });
  assert.equal(r.barSees, false, 'the agent keeps off the bar\'s stools');
});

test('the hand\'s answer: owning it warms the agent, making the case is a roll on the shipper\'s regard and the agent\'s, saying nothing changes nothing', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), out = {}, name = 'the Compact Freight Office';
    const real = Math.random;  // the roll is set only around the choice: a constant random hangs the generators the landing uses
    const play = (i, roll) => { const e = deliver({ dueIn: -1 }); const agent = person(e.people[0]); const s0 = h.standing[name], o0 = agent.opinion; Math.random = () => roll; const text = e.choices[i].run(); Math.random = real; return { text, standing: h.standing[name] - s0, agent: agent.opinion - o0, mem: agent.memories.slice(-1)[0] }; };
    out.own = play(0, 0.5); out.win = play(1, 0); out.lose = play(1, 0.999); out.silent = play(2, 0.5);
    return out;
  });
  assert.equal(r.own.agent, 1); assert.equal(r.own.standing, 0); assert.match(r.own.text, /That's a short note/); assert.match(r.own.mem, /You owned the delivery to me at the lock\./);
  assert.equal(r.win.standing, 1, 'the case held: the regard comes back up'); assert.equal(r.win.agent, 1); assert.match(r.win.text, /each line holds/);
  assert.equal(r.lose.standing, -1, 'the case did not hold: down again'); assert.equal(r.lose.agent, -1); assert.match(r.lose.text, /Nobody can check it\./);
  assert.deepEqual([r.silent.standing, r.silent.agent], [0, 0]); assert.match(r.silent.text, /waits through it/);
});

test('the board reads the regard: a shipper that trusts the ship is named on the run panel, one that has lost faith closes its board, and the pay is a tenth better', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), here = currentPlanet(), shipper = shipperOf(here, system().gov), out = { shipper };
    h.standing = {}; h.freight = null; const plain = contractBoard(st, here).map(c => c.pay);
    h.standing = { [shipper]: 2 }; h.freight = null; const trusted = contractBoard(st, here); out.trusted = trusted.length; out.payUp = plain.length && trusted.length ? trusted[0].pay >= plain[0] : true;
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { contract: true, shipper, good: 'water', tons: 50, planet: 'Mars', sid: 'mars', pay: 9000, days: 4, due: st.day + 8, yard: false }, alts: [] };
    out.panelTrusted = runHtml();
    h.standing = { [shipper]: -1 }; h.plan.at = st.planet; out.panelWary = runHtml();
    h.standing = { [shipper]: -2 }; h.freight = null; out.closed = contractBoard(st, here).length; out.closedHere = closedHere();
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { ballast: true, planet: 'Mars', sid: 'mars', days: 4 }, alts: [] }; out.panelClosed = runHtml();
    delete h.standing; out.old = standingOf(h, shipper);  // a save from before the regard was kept
    return out;
  });
  assert.match(r.panelTrusted, new RegExp(`a contract from ${r.shipper}, a shipper that trusts the ship: `));
  assert.match(r.panelWary, /, a shipper that is wary of the ship: /);
  assert.equal(r.closed, 0, 'nothing on a closed shipper\'s board'); assert.equal(r.closedHere, true);
  assert.match(r.panelClosed, /Nothing on the board here\. The shipper here has closed its board to the ship\./);
  assert.equal(r.old, 0); assert.ok(r.payUp, 'a trusted board pays at least what a plain one did');
});

test('an older save with no regard kept settles a delivery without error and starts the shipper at nothing', async () => {
  const r = await run(() => {
    const st = start(), h = hired(); delete h.standing; delete h.off;
    const e = deliver(); return { standing: h.standing && h.standing['the Compact Freight Office'], scene: !!e && /Lock|Sign/.test(e.title) };
  });
  assert.deepEqual(r, { standing: 1, scene: false });
});
