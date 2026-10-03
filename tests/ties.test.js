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
      same: JSON.stringify(t0) === JSON.stringify(again), coalition: affs['Earth Coalition'] / 300, pirate: !!affs.Pirate, none: !!affs.null, exile: !!status.exile, wanted: !!status.wanted, officer: !!status.officer,
      ines: tiesOf(castPerson('ines')).status['Earth Coalition'], tomas: tiesOf(castPerson('tomas')).status['Earth Coalition'], ruben: tiesOf(castPerson('ruben')).status['Mars Republic'], pax: tiesOf(castPerson('pax')).aff,
    };
  });
  assert.ok(!r.bad, 'regard stays in -3 to 3'); assert.ok(r.same);
  assert.ok(r.coalition > 0.5 && r.coalition < 0.85, `most are Coalition (${r.coalition})`);
  assert.ok(r.pirate && r.none && r.exile && r.wanted && r.officer, 'and the rest are drawn too');
  assert.equal(r.ines, 'exile'); assert.equal(r.tomas, 'member'); assert.equal(r.ruben, 'officer'); assert.equal(r.pax, 'Belt Collective');
  await done();
});

test('the same faction draws two people together, and a faction one holds against the other pushes them apart', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start();
    const a = find(t => t.aff === 'Earth Coalition'), b = find(t => t.aff === 'Earth Coalition'), c = find(t => t.aff === 'Belt Collective' && t.regard['Earth Coalition'] <= -2), d = find(t => t.aff === 'Earth Coalition');
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
    const p = find(t => t.status[gov] === 'wanted' || t.status['Earth Coalition'] === 'wanted'); 
    st.day += 5; out.offered = Mods.filter('happenings', [], 'port', planet).some(c => c.tier === 1);
    const e = customsScene('Earth Coalition', planet);
    out.labels = e.choices.map(c => c.label); out.title = e.title;
    out.again = customsScene('Earth Coalition', planet);  // the ship is stopped once in 120 days
    st.day += 121; out.later = !!customsScene('Earth Coalition', planet); st.day -= 121;
    const op = p.opinion; G.dialog = { event: e, choices: e.choices };
    const i = e.choices.findIndex(c => /papers/.test(c.label)); const text = chooseEvent(i);
    out.papers = /stamps the manifest/.test(text); out.opinion = p.opinion - op; out.stays = st.crew.includes(p.id);
    return out;
  });
  assert.equal(r.gov, 'Earth Coalition'); assert.equal(r.title, 'The Customs Officer'); assert.ok(r.offered, 'offered at the port');
  assert.ok(r.labels.some(l => /^\[Earth Coalition papers\]/.test(l)), 'you are Coalition, so you have papers');
  assert.ok(r.labels.length >= 4); assert.equal(r.again, null); assert.ok(r.later, 'and again after the cooldown');
  assert.ok(r.papers && r.opinion === 2 && r.stays);
  await done();
});

test('putting them ashore, or being caught, costs you the crew member, and a replacement signs on', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = start(), h = hired(), planet = currentPlanet(), out = {};
    const p = find(t => t.status['Earth Coalition'] === 'wanted'), n = st.crew.length;
    const e = customsScene('Earth Coalition', planet), i = e.choices.findIndex(c => /ashore/.test(c.label)), op = p.opinion;
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
    const e = customsScene('Earth Coalition', planet);  // Ines is an exile from the Coalition
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
    const p = find(t => t.status['Earth Coalition'] === 'officer');
    const e = dockFriendScene('Earth Coalition', planet), fund = h.fund, op = p.opinion;
    G.dialog = { event: e, choices: e.choices }; chooseEvent(0);
    return { title: e.title, fund: h.fund - fund, opinion: p.opinion - op, again: dockFriendScene('Earth Coalition', planet) };
  });
  assert.equal(r.title, 'A Friend at the Dock'); assert.equal(r.fund, 150); assert.equal(r.opinion, 1); assert.equal(r.again, null);
  await done();
});

test('the person page shows their ties, and yours shows what each faction thinks of you', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { const st = start(); st.rep['Belt Collective'] = -30; G.viewPerson = 'c:ines'; UI.tab = 'person'; UI.render(); });
  let text = await page.innerText('#panel');
  assert.match(text, /Affiliation\s+Earth Coalition \(exile\)/); assert.match(text, /Pirates\s+(hostile|cool|neutral|warm|loyal)/);
  await ev(() => { G.viewPerson = 'you'; UI.render(); });
  text = await page.innerText('#panel');
  assert.match(text, /YOUR TIES/i); assert.match(text, /Affiliation\s+Earth Coalition \(member\)/); assert.match(text, /Belt Collective\s+regards you as distrusted/);
  await done();
});
