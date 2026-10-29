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
  window.deliver = ({ tons = 90, dueIn = 2, shipper = 'the Compact Freight Office', day = null } = {}) => {
    const st = G.state, h = hired(), here = currentPlanet();
    h.run = { contract: true, shipper, good: 'water', tons: 90, from: 'X', planet: here.name, sid: st.systemId, pay: 200000, day: day === null ? st.day - 6 : day, days: 6, due: st.day + dueIn, cost: 0, profit: 200000 };
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
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { contract: true, shipper, good: 'water', tons: 50, planet: 'Mars', sid: 'mars', pay: 90000, days: 4, due: st.day + 8, yard: false }, alts: [] };
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

test('the dock broker holds money back: the pay is less than the paper, the ledger says so, and the agent explains the handling; speaking up gets it back when the case holds', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), out = {}, broker = 'a dock broker', real = Math.random;
    const day = Array.from({ length: 400 }, (_, i) => i + 1).find(d => skimOf({ shipper: broker, planet: currentPlanet().name, day: d }, 200000, 0) > 0);
    const f0 = h.fund, e = deliver({ shipper: broker, day }); out.cut = skimOf({ shipper: broker, planet: currentPlanet().name, day }, 200000, 0);
    out.fundGain = h.fund - f0; out.row = h.ledger[0].skim; out.title = e && e.title; out.text = e && e.text; out.labels = e && e.choices.map(c => c.label); out.log = logRowsHtml(h.ledger, 1);
    const snap = JSON.stringify(G.state);
    const play = (i, roll) => { G.state = JSON.parse(snap); G.dialog = null; const hh = hired(), f1 = hh.fund, c1 = G.state.credits, s1 = hh.standing[broker]; const ev = skimScene(); Math.random = () => roll; const text = ev.choices[i].run(); Math.random = real; return { text, fund: hh.fund - f1, credits: G.state.credits - c1, standing: hh.standing[broker] - s1, ledger: hh.ledger[0].skim }; };
    window.skimScene = () => { const o = hired().off || { kind: 'skim', shipper: broker, good: 'water', tons: 90, got: 90, late: 0, due: G.state.day, cut: out.cut, owed: 200000 }; return agentScene(o, freightAgent(currentPlanet())); };
    hired().off = { kind: 'skim', shipper: broker, good: 'water', tons: 90, got: 90, late: 0, due: G.state.day, cut: out.cut, owed: 200000 };
    out.win = play(0, 0); out.lose = play(0, 0.999); out.letgo = play(1, 0.5); out.share = hired().share;
    return out;
  });
  assert.ok(r.cut > 0 && r.fundGain === 200000 - r.cut, 'the ship was paid the paper less the cut'); assert.equal(r.row, r.cut, 'the ledger keeps what was held back');
  assert.equal(r.title, 'Short on the Paper'); assert.match(r.text, /The paper says 200,000 cr\. a dock broker has paid 170,000\./); assert.match(r.text, /"Handling,"/);
  assert.equal(r.labels.length, 2); assert.match(r.labels[0], /^Speak up \[\d+%; if it fails: the shipper's regard\]$/); assert.equal(r.labels[1], 'Let it go');
  assert.match(r.log, /30,000 cr held back/);
  assert.equal(r.win.fund, r.cut, 'the case held: the difference comes back to the ship'); assert.equal(r.win.credits, Math.round(r.cut * r.share), 'and the hand\'s share of it'); assert.equal(r.win.standing, 1); assert.equal(r.win.ledger, 0); assert.match(r.win.text, /I'll put it back on the account/);
  assert.deepEqual([r.lose.fund, r.lose.credits, r.lose.standing], [0, 0, -1]); assert.match(r.lose.text, /I can't strike it/);
  assert.deepEqual([r.letgo.fund, r.letgo.credits, r.letgo.standing], [0, 0, 0]); assert.match(r.letgo.text, /initials the margin/);
});

test('a state\'s freight office reads the crew list at the lock: a crew member it wants is a scene before she sails, played once, with the customs stop\'s ways out', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), here = currentPlanet(), out = {}, office = 'the Compact Freight Office', gov = 'Arcology Compact';
    const target = st.crew.map(person).find(p => !p.cast);
    const realTies = tiesOf; window.tiesOf = p => (p.id === target.id ? { ...realTies(p), status: { ...realTies(p).status, [gov]: 'wanted' } } : realTies(p));
    const plan = shipper => { h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { contract: true, shipper, good: 'water', tons: 50, from: here.name, planet: 'Mars', sid: 'mars', pay: 90000, days: 4, due: st.day + 8, cost: 0, yard: false }, alts: [] }; h.freight = { key: `${here.name}@${st.day}`, list: [h.plan.run] }; h.run = null; G.dialog = null; };
    const fresh = () => { st.customs = {}; plan(office); G.state = JSON.parse(JSON.stringify(st)); };
    // not on a paper from another shipper, nor the first run
    plan('the Rook'); out.other = !!sideDue(currentPlan());
    hired().runsDone = 0; plan(office); out.first = !!sideDue(currentPlan());
    hired().runsDone = 1; plan(office); out.due = !!sideDue(currentPlan());
    Mods.act('sail'); const e = G.dialog && G.dialog.event; out.scene = e && { title: e.title, text: e.text, labels: e.choices.map(c => c.label), people: e.people.length }; out.sailed = !!hired().run;
    // played, it is not asked again for sixty days: the next sail goes
    G.dialog = null; out.again = !!sideDue(currentPlan());
    out.target = target.first;
    window.tiesOf = realTies;
    return out;
  });
  assert.equal(r.other, false, 'a paper from another shipper does not ask'); assert.equal(r.first, false, 'the first run is guided and does not'); assert.equal(r.due, true);
  assert.equal(r.scene.title, 'On the Manifest'); assert.equal(r.sailed, false, 'she does not sail until it is played'); assert.equal(r.scene.people, 2); assert.equal(r.again, false, 'and it is played once: the same person is not asked again');
  assert.match(r.scene.text, /the Compact Freight Office puts the names of everyone aboard on its manifest/); assert.match(r.scene.text, /"This one's wanted by the Compact,"/);
  assert.deepEqual(r.scene.labels.map(l => l.replace(r.target, 'N').replace(/ \(.*$/, '')), ['[Your Arcology Compact papers] Vouch for N as a member', 'Pay the office\'s fee', 'Say nothing and keep N below', 'Put N ashore', 'Turn the contract down']);
});

test('the side scene\'s ways out: papers and the fee clear the name, silence holds more often than not and costs the paper when it does not, a crew member put ashore is replaced, and turning the paper down leaves the day\'s board empty', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), here = currentPlanet(), out = {}, office = 'the Compact Freight Office', gov = 'Arcology Compact', real = Math.random;
    const target = st.crew.map(person).find(p => !p.cast), realTies = tiesOf;
    window.tiesOf = p => (p.id === target.id ? { ...realTies(p), status: { ...realTies(p).status, [gov]: 'wanted' } } : realTies(p));
    const run0 = { contract: true, shipper: office, good: 'water', tons: 50, from: here.name, planet: 'Mars', sid: 'mars', pay: 90000, days: 4, due: st.day + 8, cost: 0, yard: false };
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: run0, alts: [] }; h.freight = { key: `${here.name}@${st.day}`, list: [run0] }; st.customs = {};
    const snap = JSON.stringify(G.state);
    const play = (label, roll) => {
      G.state = JSON.parse(snap); G.dialog = null; const hh = hired(), s2 = G.state, due = sideDue(currentPlan()), ev = sideScene(currentPlan(), due, freightAgent(currentPlanet()));
      const c = ev.choices.find(x => x.label.startsWith(label)); const f1 = hh.fund, st1 = (hh.standing || {})[office] || 0, rep1 = repOf(gov), cap1 = person(hh.captain).opinion, t1 = person(target.id).opinion, crew1 = s2.crew.length;
      if (roll !== null) Math.random = () => roll;  // a constant random hangs the generators a new crew member is made with, so that choice rolls nothing
      const text = c.run(); Math.random = real;
      return { text, fund: hh.fund - f1, standing: ((hh.standing || {})[office] || 0) - st1, rep: repOf(gov) - rep1, captain: person(hh.captain).opinion - cap1, target: person(target.id).opinion - t1, board: hh.freight.list.length, planGone: !hh.plan, aboard: s2.crew.includes(target.id), crew: s2.crew.length - crew1 };
    };
    out.papers = play('[Your Arcology Compact papers]', 0.5); out.pay = play('Pay the office', 0.5); out.clear = play('Say nothing', 0); out.lost = play('Say nothing', 0.999); out.ashore = play('Put', null); out.decline = play('Turn the contract down', 0.5);
    window.tiesOf = realTies;
    return out;
  });
  assert.match(r.papers.text, /Yours goes on it instead/); assert.equal(r.papers.target, 2); assert.equal(r.papers.board, 1, 'the paper stands');
  assert.equal(r.pay.fund, -4000); assert.equal(r.pay.captain, -1); assert.match(r.pay.text, /stamps it/); assert.equal(r.pay.board, 1);
  assert.match(r.clear.text, /Then it's the list I was given/); assert.equal(r.clear.board, 1); assert.equal(r.clear.standing, 0);
  assert.match(r.lost.text, /No cargo for this ship/); assert.equal(r.lost.board, 0, 'the day\'s board is empty'); assert.equal(r.lost.planGone, true); assert.equal(r.lost.standing, -1); assert.equal(r.lost.rep, -2); assert.equal(r.lost.captain, -1); assert.equal(r.lost.target, -1);
  assert.equal(r.ashore.aboard, false, 'put ashore'); assert.equal(r.ashore.crew, 0, 'and someone from the dock signs on for the berth'); assert.equal(r.ashore.target, -3); assert.equal(r.ashore.rep, 1); assert.match(r.ashore.text, /strikes the name/);
  assert.equal(r.decline.board, 0); assert.equal(r.decline.planGone, true); assert.equal(r.decline.target, 2); assert.equal(r.decline.standing, 0, 'turning it down is the ship\'s call and costs the office\'s regard nothing'); assert.equal(r.decline.aboard, true);
});
