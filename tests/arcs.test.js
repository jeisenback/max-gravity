'use strict';

// Mission arcs hung on a shipper (js/arcs.js, #683) and the water dispute at Pallas (js/stories/arc-league.js): the offer on the Missions page once the shipper knows the
// ship, the pitch to the captain, the arc's scenes in their order down each way, and what each way ends in (a person, an item for the kit, a fee).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; st.tutorial = null; hired().runsDone = 3; return st; };
  window.goTo = (sid, planet) => { const st = G.state; G.transit = null; G.mode = 'landed'; st.dest = null; st.systemId = sid; st.planet = planet; UI.notes.length = 0; G.dialog = null; G.nextEvent = null; };
  // Lands at the port the way a ship does, so the landing's scenes are picked; returns the scene that opened, if any.
  window.land = (sid, planet) => { goTo(sid, planet); G.state.customs = { ...(G.state.customs || {}), last: G.state.day }; Mods.emit('landed', currentPlanet()); const e = G.dialog && G.dialog.event; return e; };  // the port stop (ties.js) is not what these are about
  window.pick1 = (e, label) => { const i = e.choices.findIndex(c => c.label.startsWith(label)); if (i < 0) throw new Error(`no choice "${label}" in ${e.title}: ${e.choices.map(c => c.label)}`); const text = e.choices[i].run(); const next = G.nextEvent; G.nextEvent = null; G.dialog = null; return { text, next }; };
  window.days = n => { G.state.day += n; };
};
const run = async (fn, o) => { const t = await open(o); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('a shipper that knows the ship offers its arc on the Missions page, once, at its own port, to a ship with room on the board', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), hall = 'the League Freight Hall', out = {};
    h.away = []; goTo('ceres', 'Ceres Station'); Mods.emit('landed', currentPlanet()); out.stranger = h.away.filter(a => a.arc).length;
    h.standing = { [hall]: 1 }; goTo('ceres', 'Ceres Station'); Mods.emit('landed', currentPlanet());
    out.offer = h.away.filter(a => a.arc).map(a => ({ arc: a.arc, planet: a.planet, sid: a.sid, who: a.ctx.who, days: a.days })); out.note = UI.notes.join(' ');
    goTo('ceres', 'Ceres Station'); Mods.emit('landed', currentPlanet()); out.again = h.away.filter(a => a.arc === 'league').length;
    h.away = []; goTo('ceres', 'Ring Nine'); Mods.emit('landed', currentPlanet()); out.elsewhere = h.away.filter(a => a.arc).length;
    h.away = [{ tpl: 'package' }, { tpl: 'stranded' }]; goTo('ceres', 'Ceres Station'); Mods.emit('landed', currentPlanet()); out.full = h.away.filter(a => a.arc).length;
    h.away = []; UI.tab = 'missions'; goTo('ceres', 'Ceres Station'); Mods.emit('landed', currentPlanet()); h.away = h.away.filter(a => a.arc); UI.render(); out.page = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    return out;
  });
  assert.equal(r.stranger, 0, 'a shipper that does not know the ship offers nothing'); assert.equal(r.offer.length, 1);
  assert.deepEqual([r.offer[0].arc, r.offer[0].planet, r.offer[0].sid], ['league', 'The Hollows', 'pallas']); assert.match(r.offer[0].who, /^Agent \S+$/);
  assert.match(r.note, /has something for the ship that is not freight\. It is on the Missions page\./);
  assert.equal(r.again, 1, 'one at a time'); assert.equal(r.elsewhere, 0, 'not at another port of the League'); assert.equal(r.full, 0, 'not onto a full board');
  assert.match(r.page, /A Crate for The Hollows/); assert.match(r.page, /a sealed crate for the Hollows that the Hall will not put on a bill of lading/); assert.match(r.page, /Put it to the captain/);
});

test('the offer goes to the captain through the pitch, and at the far end the arc\'s first scene plays', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), hall = 'the League Freight Hall', out = {};
    h.standing = { [hall]: 1 }; h.away = []; goTo('ceres', 'Ceres Station'); Mods.emit('landed', currentPlanet()); const a = h.away[0];
    const real = Math.random, ev = pitchScene(a); out.labels = ev.choices.map(c => c.label.replace(/ \[.*$/, '')); out.text = ev.text;
    Math.random = () => 0; const text = ev.choices[0].run(); Math.random = real; out.booked = a.booked; out.text2 = text;
    out.run = currentPlan() && { planet: currentPlan().planet, sid: currentPlan().sid };
    const e = land('pallas', 'The Hollows'); out.first = e && { title: e.title, text: e.text, labels: e.choices.map(c => c.label) }; out.board = h.away.length;
    return out;
  });
  assert.equal(r.booked, true, 'the captain agreed'); assert.deepEqual(r.run, { planet: 'The Hollows', sid: 'pallas' });
  assert.match(r.text, /a sealed crate for the Hollows/);
  assert.equal(r.first.title, 'A Crate for the Hollows'); assert.match(r.first.text, /Wen Haraldsen meets the ship at the Hollows lock with a flask of tea in each hand/);
  assert.deepEqual(r.first.labels, ['Say you will, at the vote', 'Say the Hall\'s name is the Hall\'s to give']); assert.equal(r.board, 0, 'the offer is taken off the board');
});

test('the water dispute, with the Hollows: the crate, the floor, the count and the pump crew\'s keys, which join the kit and sharpen a job', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), hall = 'the League Freight Hall', out = {};
    h.standing = { [hall]: 1 }; h.away = [{ tpl: 'arc:league', arc: 'league', ctx: { dest: 'The Hollows', who: 'Agent X' }, sid: 'pallas', planet: 'The Hollows', days: 3, until: st.day + 40, pitched: null }];
    const first = land('pallas', 'The Hollows'); out.c1 = pick1(first, 'Say you will, at the vote').text; out.q1 = { ...G.state.qualities };
    out.early = (land('pallas', 'Pallas Refinery') || {}).title; days(6);
    const floor = land('pallas', 'Pallas Refinery'); out.floor = { title: floor.title, labels: floor.choices.map(c => c.label), disabled: floor.choices.map(c => !!c.can && !c.can()) };
    const f = pick1(floor, 'Tell her it was sealed'); out.countTitle = f.next.title; G.nextEvent = f.next;
    const count = f.next; out.count = { labels: count.choices.map(c => c.label), text: count.text };
    const s = pick1(count, 'Speak'); out.speak = s.text; out.q2 = { ...G.state.qualities };
    out.before = jobOdds({ post: 'engineer' }); days(5);
    out.elsewhere = (land('ceres', 'Ceres Station') || {}).title;
    const coda = land('pallas', 'The Hollows'); out.coda = { title: coda.title, labels: coda.choices.map(c => c.label) };
    const k = pick1(coda, 'Take the keys'); out.keys = k.text; out.kit = [...h.kit]; out.after = jobOdds({ post: 'engineer' }); out.hall = h.standing[hall]; out.again = (land('pallas', 'The Hollows') || {}).title;
    const wen = Object.values(G.state.people).find(p => p.arcPerson === 'wen'); out.wen = wen && { name: `${wen.first} ${wen.last}`, opinion: wen.opinion, at: wen.location };
    out.log = (G.state.journal || []).map(j => j.text); out.recap = chapterRecap().text;
    return out;
  });
  assert.match(r.c1, /Six days/); assert.equal(r.q1.league, 1); assert.equal(r.q1.leagueSide, 1); assert.equal(r.q1['league-open'], 1);
  assert.notEqual(r.early, 'The Floor Before the Vote', 'nothing of the arc at the Refinery before the vote is due');
  assert.equal(r.floor.title, 'The Floor Before the Vote'); assert.deepEqual(r.floor.labels.slice(0, 3), ['Tell her what was in it', 'Tell her it was sealed', 'Tell her you will speak at the vote']); assert.match(r.floor.labels[3], /^Ask (Dockmaster|Officer|Collector) \S+ for the lock log$/);
  assert.deepEqual(r.floor.disabled, [false, false, false, true], 'the dock official\'s log is shut to a ship they do not know');
  assert.equal(r.countTitle, 'The Count'); assert.deepEqual(r.count.labels, ['Speak', 'Stay at the back']);
  assert.match(r.speak, /three hundred and four to two hundred and ninety-one/); assert.equal(r.q2.leagueSide, 3); assert.ok(r.q2['due:league-end'] > 0);
  assert.notEqual(r.elsewhere, 'The Pump Crew\'s Keys', 'the end waits at the Hollows');
  assert.equal(r.coda.title, 'The Pump Crew\'s Keys'); assert.deepEqual(r.coda.labels, ['Take the keys', 'Say the keys belong to the pump crew']);
  assert.match(r.keys, /Wen closes your fingers round the grip/); assert.match(r.keys, /You carry a roll of valve keys now\./); assert.deepEqual(r.kit, ['valve-keys']);
  assert.ok(Math.abs(r.after - r.before - 0.05) < 1e-9, 'the keys add five points to a job'); assert.equal(r.hall, 2, 'the Hall heard');
  assert.notEqual(r.again, 'The Pump Crew\'s Keys', 'it plays once'); assert.equal(r.wen.name, 'Wen Haraldsen'); assert.ok(r.wen.opinion >= 4, `Wen thinks well of the ship (${r.wen.opinion})`); assert.equal(r.wen.at, 'The Hollows');
  assert.ok(r.log.some(l => /Spoke at the Pallas vote/.test(l)) && r.log.some(l => /valve keys/.test(l)), 'the journal keeps the line');
  assert.match(r.recap, /You carry a roll of valve keys\./);
});

test('the water dispute, with the Refinery: not speaking and the count for the refinery end in a fee and Marit, and the keys stay with the Hollows', async () => {
  const r = await run(() => {
    const st = start(), h = hired(), hall = 'the League Freight Hall', out = {};
    h.standing = { [hall]: 1 }; h.away = [{ tpl: 'arc:league', arc: 'league', ctx: { dest: 'The Hollows', who: 'Agent X' }, sid: 'pallas', planet: 'The Hollows', days: 3, until: st.day + 40, pitched: null }];
    pick1(land('pallas', 'The Hollows'), 'Say the Hall\'s name is the Hall\'s to give'); days(6);
    const floor = land('pallas', 'Pallas Refinery'), f = pick1(floor, 'Tell her what was in it'); G.nextEvent = f.next;
    const s = pick1(f.next, 'Stay at the back'); out.back = s.text; out.q = { ...G.state.qualities }; days(5);
    const coda = land('pallas', 'Pallas Refinery'); out.coda = { title: coda.title, labels: coda.choices.map(c => c.label) };
    const c0 = G.state.credits; const k = pick1(coda, 'Take the envelope'); out.fee = k.text; out.credits = G.state.credits - c0; out.kit = [...(h.kit || [])];
    const marit = Object.values(G.state.people).find(p => p.arcPerson === 'marit'), wen = Object.values(G.state.people).find(p => p.arcPerson === 'wen');
    out.marit = marit && marit.opinion; out.wen = wen && wen.opinion; out.hollows = (land('pallas', 'The Hollows') || {}).title;
    return out;
  });
  assert.match(r.back, /The ledger is not read\. The count comes out for the refinery, three hundred and fourteen to two hundred and ninety\./); assert.equal(r.q.leagueSide, -1);
  assert.equal(r.coda.title, 'The Courier Rate'); assert.deepEqual(r.coda.labels, ['Take the envelope (400 cr)', 'Leave it on the table']);
  assert.equal(r.credits, 400); assert.match(r.fee, /The envelope is thinner than the sum on it/); assert.deepEqual(r.kit, []);
  assert.ok(r.marit >= 3 && r.wen < 0, `Marit warm (${r.marit}), Wen cooler (${r.wen})`); assert.notEqual(r.hollows, 'The Pump Crew\'s Keys', 'the Hollows have nothing for a ship that stood aside');
});

test('the arcs\' people are the same people each time, stay off the bar\'s stools and are not forgotten when the registry is full', async () => {
  const r = await run(() => {
    const st = start(), out = {}, a = arcPerson('wen'), b = arcPerson('wen'), m = arcPerson('marit');
    out.same = a.id === b.id && a.id !== m.id; out.names = [`${a.first} ${a.last}`, `${m.first} ${m.last}`]; out.job = a.job;
    for (let i = 0; i < 120; i++) { const p = makePerson(cultureOf(st.systemId)); registerPerson(p); }
    out.kept = !!st.people[a.id] && !!st.people[m.id]; out.stillSame = arcPerson('wen').id === a.id;
    goTo('pallas', 'The Hollows'); fillBar(currentPlanet()); out.bar = G.patrons.some(x => x.p && x.p.id === a.id);
    return out;
  });
  assert.equal(r.same, true); assert.deepEqual(r.names, ['Wen Haraldsen', 'Marit Okafor']); assert.equal(r.job, 'delegate of the Hollows');
  assert.equal(r.kept, true, 'kept however full the registry gets'); assert.equal(r.stillSame, true); assert.equal(r.bar, false);
});
