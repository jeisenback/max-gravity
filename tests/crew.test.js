'use strict';

// The bible's crew on Hester's ship (#879, docs/superpowers/specs/2026-11-01-crew-structure-design.md): who is aboard, and first aid held by the bosun
// when there is no medic.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);


test('first aid: with no medic aboard Cato holds it, a hurt Cato gives none, a medic aboard comes first, and his own pivot does not count it', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, cato = castPerson('cato');
    st.crew = st.crew.filter(id => person(id).role !== 'medic');
    const out = { noMedic: (roleHolder('medic') || {}).cast || null };
    st.armor = 0;  // no hull point
    out.pivot = catoHoldPoints(false) - (iceHands() >= 1 ? 1 : 0);  // with the hands point taken off, only a medic other than Cato could count
    st.injured = { [cato.id]: true };
    out.hurt = roleHolder('medic') === undefined;
    st.injured = {};
    const m = makePerson('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); st.crew.push(m.id);
    out.medicFirst = roleHolder('medic').role;
    return out;
  });
  await done();
  assert.equal(r.noMedic, 'cato', 'Cato holds the first aid');
  assert.equal(r.hurt, true, 'a hurt Cato gives none');
  assert.equal(r.medicFirst, 'medic', 'a medic aboard comes first');
  assert.equal(r.pivot, 0, 'his own pivot does not count his first aid');
});

test('Hester\'s ship carries seven: the captain, two officers, the bosun, the hand, the comms rating and a deckhand', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const roles = G.state.crew.map(person).map(c => c.role);  // the captain and the hand are not in st.crew
    return { aboard: G.state.crew.length + 2, roles, deck: ROLE_NAMES.icehand, perk: ROLE_PERKS.xo(), title: ROLE_NAMES.xo };
  });
  await done();
  assert.equal(r.aboard, 7, `seven aboard: ${r.roles}`);  // the captain, Ines, Tomas, Cato, the hand, the comms rating and the deckhand
  for (const gone of ['quartermaster', 'medic', 'cook']) assert.ok(!r.roles.includes(gone), `no ${gone}`);
  assert.equal(r.deck, 'Deckhand');
  assert.equal(r.title, 'Bosun'); assert.match(r.perk, /first-aid rating/);
});

test('with no hired captain, the first officer keeps its name and its perk', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent(); return { title: ROLE_NAMES.xo, perk: ROLE_PERKS.xo() }; });
  await done();
  assert.equal(r.title, 'First officer'); assert.equal(r.perk, 'Runs the watch bill and speaks for the captain.');
});

// A run to its arrival, as captains.test.js's arriveFirst does it.
const arrive = () => {
  const st = G.state, h = hired(); delete h.stay;
  if (!sail()) throw new Error('no plan');
  while (G.dialog) finishEvent();
  const run = h.run, c0 = st.credits;
  G.transit = null; G.mode = 'landed'; st.dest = null; st.systemId = run.sid; st.planet = run.planet; st.day += run.days;
  UI.notes.length = 0; G.dialog = null; G.nextEvent = null;
  Mods.emit('landed', currentPlanet());
  return { gain: st.credits - c0, row: h.ledger[0], notes: UI.notes.join(' ') };
};

test('a rating\'s pay: the day rate less the kit, then the hall\'s cut, and no share, even for a save that signed for one', async () => {
  const { ev, done } = await open();
  const r = await ev(arriveSrc => {
    const arrive = (0, eval)(`(${arriveSrc})`);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null;
    hired().share = 0.06;  // a save from before (#879) signed for a share
    const first = arrive(); while (G.dialog) finishEvent();
    const second = arrive();
    return { wage: hired().wage, first, second, kitDay: KIT_DEDUCTION };
  }, arrive.toString());
  await done();
  assert.equal(r.kitDay, 30);
  assert.equal(r.wage, 500, 'Hester pays a rating 500 a day');
  for (const k of ['first', 'second']) {
    const { row, gain } = r[k];
    assert.equal(row.share, 0, `${k}: no share`);
    assert.equal(row.kit, 30 * row.days, `${k}: the kit is 30 a day`);
    assert.equal(gain, row.wage - row.kit - (row.hall || 0), `${k}: the wage less the kit and the hall`);
  }
  assert.match(r.second.notes, new RegExp(`less ${r.second.row.kit.toLocaleString('en-US')} cr for your kit`), r.second.notes);
});
