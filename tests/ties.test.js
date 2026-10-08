'use strict';

// Faction ties: affiliation, status and regard, and where they matter (the crew's bonds, how they take what you do,
// customs at a port, and your own papers).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; st.day += 30; return st; };
  // A made person with the ties wanted, found by drawing until one fits (the ties come from the id, so they cannot be set).
  window.find = (pred, role = 'cook') => { for (let i = 0; i < 600; i++) { const p = makePerson('earth'); p.role = role; p.skill = 1; registerPerson(p); if (pred(tiesOf(p), p)) { G.state.crew.push(p.id); return p; } } return null; };  // into the crew at once: the registry forgets strangers after eighty
};

test('ties are drawn from the person, the same each time, and the main characters have their own', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start();
    const people = Array.from({ length: 300 }, () => makePerson('earth')), t0 = tiesOf(people[0]), again = tiesOf(people[0]);
    const affs = {}, status = {};
    for (const p of people) { const t = tiesOf(p); affs[t.aff] = (affs[t.aff] || 0) + 1; const s = t.aff && t.status[t.aff]; status[s] = (status[s] || 0) + 1; for (const f of FACTIONS) if (t.regard[f] < -3 || t.regard[f] > 3) return { bad: true }; }
    return {
      same: JSON.stringify(t0) === JSON.stringify(again), coalition: affs['Arcology Compact'] / 300, pirate: !!affs.Pirate, none: !!affs.null, exile: !!status.exile, wanted: !!status.wanted, officer: !!status.officer,
      ines: tiesOf(castPerson('ines')).status['Arcology Compact'], tomas: tiesOf(castPerson('tomas')).status['Arcology Compact'], ruben: tiesOf(castPerson('ruben')).status['Dome Concord'], pax: tiesOf(castPerson('pax')).aff,
    };
  });
  assert.ok(!r.bad, 'regard stays in -3 to 3'); assert.ok(r.same);
  assert.ok(r.coalition > 0.5 && r.coalition < 0.85, `most are Compact (${r.coalition})`);
  assert.ok(r.pirate && r.none && r.exile && r.wanted && r.officer, 'and the rest are drawn too');
  assert.equal(r.ines, 'exile'); assert.equal(r.tomas, 'member'); assert.equal(r.ruben, 'officer'); assert.equal(r.pax, 'Charter League');
  await done();
});

test('the same faction draws two people together, and a faction one holds against the other pushes them apart', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start();
    const a = find(t => t.aff === 'Arcology Compact'), b = find(t => t.aff === 'Arcology Compact'), c = find(t => t.aff === 'Charter League' && t.regard['Arcology Compact'] <= -2), d = find(t => t.aff === 'Arcology Compact');
    return { same: factionPull(a, b), apart: factionPull(c, d), reasonSame: factionReason(a, b), reasonApart: factionReason(c, d) };
  });
  assert.ok(r.same > 0, `${r.same}`); assert.ok(r.apart < 0, `${r.apart}`);
  assert.match(r.reasonSame, /^both /); assert.match(r.reasonApart, /do not mix/);
  await done();
});

test('what you do with a faction changes what the crew think of you, by what each thinks of it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start();
    const foe = find(t => t.regard.Pirate <= -2), friend = find(t => t.regard.Pirate >= 1), none = find(t => t.regard.Pirate === 0);
        const before = [foe.opinion, friend.opinion, none ? none.opinion : 0];
    changeRep('Pirate', -5);   // you set yourself against the pirates
    const after = [foe.opinion - before[0], friend.opinion - before[1], none ? none.opinion - before[2] : 0];
    const small = foe.opinion; changeRep('Pirate', 1); const quiet = foe.opinion === small;
    return { after, quiet, memory: foe.memories[foe.memories.length - 1] };
  });
  assert.deepEqual(r.after, [1, -1, 0], 'those who dislike the pirates like it, those who like them do not');
  assert.ok(r.quiet, 'a small change is not noticed'); assert.match(r.memory, /set yourself against the pirates/);
  await done();
});

test('a crew member the port\'s faction wants is a customs matter, and your own papers get them through', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), planet = currentPlanet(), gov = system().gov, out = { gov };
    const p = find(t => t.status[gov] === 'wanted' || t.status['Arcology Compact'] === 'wanted'); 
    st.day += 5; out.offered = Mods.filter('happenings', [], 'port', planet).some(c => c.tier === 1);
    const e = customsScene('Arcology Compact', planet);
    out.labels = e.choices.map(c => c.label); out.title = e.title;
    out.again = customsScene('Arcology Compact', planet);  // the ship is stopped once in 120 days
    st.day += 121; out.later = !!customsScene('Arcology Compact', planet); st.day -= 121;
    const op = p.opinion; G.dialog = { event: e, choices: e.choices };
    const i = e.choices.findIndex(c => /papers/.test(c.label)); const text = chooseEvent(i);
    out.papers = /stamps the manifest/.test(text); out.opinion = p.opinion - op; out.stays = st.crew.includes(p.id);
    return out;
  });
  assert.equal(r.gov, 'Arcology Compact'); assert.equal(r.title, 'The Customs Officer'); assert.ok(r.offered, 'offered at the port');
  assert.ok(r.labels.some(l => /^\[Arcology Compact papers\]/.test(l)), 'you are Compact, so you have papers');
  assert.ok(r.labels.length >= 4); assert.equal(r.again, null); assert.ok(r.later, 'and again after the cooldown');
  assert.ok(r.papers && r.opinion === 2 && r.stays);
  await done();
});

test('putting them ashore, or being caught, costs you the crew member, and a replacement signs on', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), planet = currentPlanet(), out = {};
    const p = find(t => t.status['Arcology Compact'] === 'wanted'), n = st.crew.length;
    const e = customsScene('Arcology Compact', planet), i = e.choices.findIndex(c => /ashore/.test(c.label)), op = p.opinion;
    G.dialog = { event: e, choices: e.choices }; const text = chooseEvent(i);
    out.gone = !st.crew.includes(p.id); out.size = st.crew.length === n; out.opinion = p.opinion - op; out.text = /signs on for the berth/.test(text);
    return out;
  });
  assert.ok(r.gone && r.size && r.text); assert.equal(r.opinion, -3);
  await done();
});

test('a main character is not put ashore at customs: the choice is not offered, and being caught is a fine', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), planet = currentPlanet(), ines = castPerson('ines');
    st.customs = {};  // the first landing may already have used it
    if (!st.crew.includes(ines.id)) st.crew.push(ines.id);
    const e = customsScene('Arcology Compact', planet);  // Ines is an exile from the Compact
    const labels = e.choices.map(c => c.label), i = e.choices.findIndex(c => /Say nothing/.test(c.label)), fund = h.fund;
    G.dialog = { event: e, choices: e.choices };
    const text = (() => { const real = Math.random; Math.random = () => 0.99; try { return chooseEvent(i); } finally { Math.random = real; } })();
    return { title: e.title, ashore: labels.some(l => /ashore/.test(l)), text: /walks back up it/.test(text), here: st.crew.includes(ines.id), fine: fund - h.fund };
  });
  assert.equal(r.title, 'The Customs Officer'); assert.ok(!r.ashore); assert.ok(r.text && r.here); assert.ok(r.fine > 0);
  await done();
});

test('an officer of the port\'s faction has a friend on the dock, and a small saving for the ship', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), planet = currentPlanet();
    const p = find(t => t.status['Arcology Compact'] === 'officer');
    const e = dockFriendScene('Arcology Compact', planet), fund = h.fund, op = p.opinion;
    G.dialog = { event: e, choices: e.choices }; chooseEvent(0);
    return { title: e.title, fund: h.fund - fund, opinion: p.opinion - op, again: dockFriendScene('Arcology Compact', planet) };
  });
  assert.equal(r.title, 'A Friend at the Dock'); assert.equal(r.fund, 150); assert.equal(r.opinion, 1); assert.equal(r.again, null);
  await done();
});

test('the person page shows their ties, and yours shows what each faction thinks of you', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { const st = start(); st.rep['Charter League'] = -30; G.viewPerson = 'c:ines'; UI.tab = 'person'; UI.render(); });
  let text = await page.innerText('#panel');
  assert.match(text, /Affiliation\s+Arcology Compact \(exile\)/); assert.match(text, /Pirates\s+(hostile|cool|neutral|warm|loyal)/);
  await ev(() => { G.viewPerson = 'you'; UI.render(); });
  text = await page.innerText('#panel');
  assert.match(text, /YOUR TIES/i); assert.match(text, /Affiliation\s+Arcology Compact \(member\)/); assert.match(text, /Charter League\s+regards you as distrusted/);
  await done();
});

test('a patrol stops a burn for the crew it wants, an officer of theirs can answer for you, and handing a person over costs them', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), gov = system().gov, out = {};
    G.transit = { to: st.systemId, seen: [] };
    st.crew = st.crew.filter(id => { const t = tiesOf(person(id)).status[gov]; return t !== 'wanted' && t !== 'exile' && t !== 'officer'; });  // a clean ship to start with
    const tier1 = () => Mods.filter('happenings', [], 'transit').filter(c => c.tier === 1).length, n0 = tier1();  // other mods add their own
    const p = find(t => t.status[gov] === 'wanted' || t.status[gov] === 'exile'), o = find(t => t.status[gov] === 'officer');
    out.offered = tier1() === n0 + 1;
    const e = customsScene(gov, system(), true);
    out.title = e.title; out.labels = e.choices.map(c => c.label);
    out.portStillDue = customsDue(false); out.patrolSpent = !customsDue(true);
    const before = o.opinion; G.dialog = { event: e, choices: e.choices };
    const text = chooseEvent(e.choices.findIndex(c => /answer the hail/.test(c.label)));
    out.answered = /rank and a unit/.test(text); out.liked = o.opinion - before; out.stays = st.crew.includes(p.id);
    st.customs.patrolLast = -1000; st.customs[`${p.id}:${gov}:${tiesOf(p).status[gov]}`] = -1000;
    const e2 = customsScene(gov, system(), true), n = st.crew.length;
    G.dialog = { event: e2, choices: e2.choices };
    const hand = e2.choices.findIndex(c => /Hand .* over/.test(c.label)); out.hand = hand;
    if (hand >= 0 && !p.cast) { chooseEvent(hand); out.left = !st.crew.includes(p.id); out.sameCrew = st.crew.length === n; }
    return out;
  });
  assert.ok(r.offered, 'a stop is offered in flight once someone wanted is aboard, and not before');
  assert.equal(r.title, 'A Patrol Cutter'); assert.ok(r.labels.some(l => /answer the hail/.test(l)));
  assert.ok(r.portStillDue && r.patrolSpent, 'the sea stop and the port stop are counted apart');
  assert.ok(r.answered && r.liked === 1 && r.stays);
  assert.ok(r.hand >= 0 && r.left && r.sameCrew, 'handed over: gone, and a replacement signs on');
  await done();
});

test('a war puts the two sides at odds and each side together, once, and the call home is a scene at the next port', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), planet = currentPlanet(), out = {};
    st.crew = []; st.bonds = {};
    const e1 = find(t => t.aff === 'Arcology Compact' && t.status['Arcology Compact'] === 'member'), e2 = find(t => t.aff === 'Arcology Compact' && t.status['Arcology Compact'] === 'member'), m1 = find(t => t.aff === 'Dome Concord' && t.status['Dome Concord'] === 'member');
    const port = () => Mods.filter('happenings', [], 'port', planet).filter(c => c.tier === 1).length;
    const n0 = port();
    factionState().war = { a: 'Arcology Compact', b: 'Dome Concord', start: st.day, until: st.day + 40, score: { 'Arcology Compact': 0, 'Dome Concord': 0 } };
    warBonds(); warBonds();  // once
    const f = x => ({ id: x.id, p: x });
    out.apart = bond(f(e1), f(m1)); out.together = bond(f(e1), f(e2));
    out.offered = port() === n0 + 1;
    const sc = warCallScene(planet);
    out.title = sc.title; out.labels = sc.choices.map(c => c.label); out.next = warCallScene(planet); st.day += 16; out.later = !!warCallScene(planet);
    return out;
  });
  assert.equal(r.apart, -2); assert.equal(r.together, 1); assert.ok(r.offered); assert.equal(r.title, 'Word From Home');
  assert.ok(r.labels[0].startsWith('Let ') && r.labels[1].startsWith('Ask ')); assert.equal(r.next, null, 'not back to back'); assert.ok(r.later, 'and the next person fifteen days on');
  await done();
});

test('a member who asks for leave goes if you let them, or stays if they like you, and an officer who is recalled is yours to release or refuse', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), planet = currentPlanet(), out = {};
    const war = () => { factionState().war = { a: 'Arcology Compact', b: 'Dome Concord', start: st.day, until: st.day + 40, score: { 'Arcology Compact': 0, 'Dome Concord': 0 } }; };
    const go = (sc, re) => { G.dialog = { event: sc, choices: sc.choices }; return chooseEvent(sc.choices.findIndex(c => re.test(c.label))); };
    // a member, let go
    st.crew = []; war();
    let m = find(t => t.aff === 'Arcology Compact' && t.status['Arcology Compact'] === 'member'), op = m.opinion, n = st.crew.length;
    let t = go(warCallScene(planet), /^Let /);
    out.go = { left: !st.crew.includes(m.id), same: st.crew.length === n, liked: m.opinion - op, text: /signs on/.test(t) };
    // a member who likes you, asked to stay
    st.crew = []; st.warCalled = {}; war();
    m = find(t => t.aff === 'Arcology Compact' && t.status['Arcology Compact'] === 'member'); m.opinion = OPINION.CLOSE; op = m.opinion;
    t = go(warCallScene(planet), /^Ask /);
    out.stay = { here: st.crew.includes(m.id), liked: m.opinion - op };
    // one who does not, asked to stay, goes anyway and minds
    st.crew = []; st.warCalled = {}; war();
    m = find(t => t.aff === 'Arcology Compact' && t.status['Arcology Compact'] === 'member'); m.opinion = -1; op = m.opinion;
    t = go(warCallScene(planet), /^Ask /);
    out.minds = { left: !st.crew.includes(m.id), liked: m.opinion - op };
    // an officer, refused
    st.crew = []; st.warCalled = {}; war(); const before = repOf('Arcology Compact');
    m = find(t => t.aff === 'Arcology Compact' && t.status['Arcology Compact'] === 'officer'); op = m.opinion;
    const sc = warCallScene(planet); out.officerLabels = sc.choices.map(c => c.label);
    t = go(sc, /^Refuse /);
    out.refused = { here: st.crew.includes(m.id), liked: m.opinion - op, rep: repOf('Arcology Compact') - before };
    // an officer, released: the faction thanks you
    st.crew = []; st.warCalled = {}; war(); const b2 = repOf('Arcology Compact');
    m = find(t => t.aff === 'Arcology Compact' && t.status['Arcology Compact'] === 'officer');
    go(warCallScene(planet), /^Let /); out.released = { left: !st.crew.includes(m.id), rep: repOf('Arcology Compact') - b2 };
    return out;
  });
  assert.deepEqual(r.go, { left: true, same: true, liked: 2, text: true });
  assert.deepEqual(r.stay, { here: true, liked: 1 }); assert.deepEqual(r.minds, { left: true, liked: -2 });
  assert.deepEqual(r.officerLabels.map(l => l.split(' ')[0]), ['Let', 'Refuse']);
  assert.deepEqual(r.refused, { here: true, liked: -4, rep: -4 });  // -3 for the refusal, and -1 more because they love the faction you have just set yourself against (crewReacts) assert.deepEqual(r.released, { left: true, rep: 3 });
  await done();
});
