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
    out.pivot = catoHoldPoints(false) - (iceHands() >= 2 ? 1 : 0);  // with the hands point taken off, only a medic other than Cato could count
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
