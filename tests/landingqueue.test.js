'use strict';

// A landing's scenes (#1096, js/transit.js offerScene): every landed handler hands its scene over with a rank, and when they have all run the
// scenes play in rank order (customs, the settling up, the run's business, people, what the port brings), none dropped and none written over.
// The inbox reads the notes once every handler has added its own.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.hand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; G.state.tutorial = null; G.dialog = null; G.nextEvent = null; return G.state; };
  window.scene = t => ({ title: t, text: t, choices: [{ label: 'A', run: () => 'a' }] });
  window.playAll = () => { const seen = []; for (let g = 10; G.dialog && g--;) { seen.push(G.dialog.event.title); chooseEvent(0); G.nextEvent = null; finishEvent(); } return seen; };
};
const run = async fn => { const t = await open(); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('the freight agent and the yard both play at a landing that has the settling up, after it, and the delivery is settled once', async () => {
  const r = await run(() => {
    const st = hand(), h = hired();
    st.armor = Math.round(ship().armor * 0.5);  // the yard's: the hull well down
    h.off = { kind: 'late', shipper: 'the Arcology Pact Freight Office', good: 'water', tons: 90, got: 90, late: 2, due: st.day - 2, cut: 0, owed: 0 };
    landingScenesOpen();
    offerScene('settle', scene('Settling Up'));
    Mods.emit('landed', currentPlanet());
    landingScenesPlay();
    return { seen: playAll(), off: h.off };
  });
  assert.deepEqual(r.seen, ['Settling Up', 'Late at the Lock', 'Hull Damage'], 'the agent no longer gives way to an open scene, and the yard no longer writes over it');
  assert.equal(r.off, null, 'the delivery is settled once');
});

test('a scene offered while another is open waits behind the open one and its own follow-on, and none is written over', async () => {
  const r = await run(() => {
    hand(); openEvent(scene('Open')); G.nextEvent = scene('Follow-on');
    queueScene(scene('First')); queueScene(scene('Second'));
    const seen = [G.dialog.event.title]; for (let g = 6; G.dialog && g--;) { chooseEvent(0); finishEvent(); if (G.dialog) seen.push(G.dialog.event.title); }
    return seen;
  });
  assert.deepEqual(r, ['Open', 'Follow-on', 'First', 'Second']);
});

test('the ranks hold whatever order the handlers offer in, and the order offered within a rank', async () => {
  const r = await run(() => {
    hand(); landingScenesOpen();
    offerScene('ambient', scene('Port')); offerScene('people', scene('Visit')); offerScene('business', scene('Yard')); offerScene('people', scene('Mourning'));
    offerScene('customs', scene('Customs')); offerScene('settle', scene('Settling'));
    const count = landingSceneCount();
    landingScenesPlay();
    return { seen: playAll(), count, after: landingSceneCount() };
  });
  assert.deepEqual(r.seen, ['Customs', 'Settling', 'Yard', 'Visit', 'Mourning', 'Port']);
  assert.equal(r.count, 6); assert.equal(r.after, 0, 'outside a landing there is none');
});

test('the inbox gets the notes every landing handler adds, the late ones too', async () => {
  const r = await run(() => {
    const st = hand(); st.inbox = []; st.inboxN = 0; UI.notes.length = 0;
    UI.notes.push('a late note');  // as a handler after comms's own would have
    Mods.emit('arrived', currentPlanet());
    return st.inbox.map(m => m.text);
  });
  assert.ok(r.includes('a late note'), r.join(' | '));
});
