'use strict';

// Ceres Station's port view (#1256, docs/bible/ports.md, Ceres: the station; the reference frame docs/bible/ceres-target.png): the second port drawn as
// a place. A cut through the crater wall: the crater floor on top, flat and at little weight, with the pad outside; the shaft; two rings, curved. Its own
// people keep Ceres's hours, a landing's offers show on it, and the clock says Ceres time.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const { PORT_LAYOUTS, portCast, portStep } = load(['js/util.js', 'js/portview.js'], { Mods: { register() {} } }, ['PORT_LAYOUTS', 'portCast', 'portStep']);
const plain = x => JSON.parse(JSON.stringify(x));
const lay = PORT_LAYOUTS['Ceres Station'];

test('Ceres keeps its own people on its hours: the Warren\'s keeper into the night, the co-op\'s clerk by day, the lock always kept', () => {
  const at = hour => plain(portCast(lay, hour, [], [], 1)).filter(c => c.kind === 'folk').map(c => c.who).sort();
  assert.ok(at(23).includes('c-keeper') && at(23).includes('c-warden') && !at(23).includes('c-clerk'), 'at night: the Warren and the lock');
  assert.ok(at(10).includes('c-clerk') && at(10).includes('c-noodles') && at(10).includes('c-buyer'), 'by day: the co-op\'s office, the stall, Kaur\'s counter');
  assert.ok(at(3).includes('c-warden') && !at(3).includes('c-keeper'), 'the Warren shut before morning');
});

test('people walk slower on the crater floor than in the rings', () => {
  const walk = lv => plain(portStep({ who: 'a', lv, x: 200, room: 'x' }, { who: 'a', lv, x: 400, name: 'stand', view: 'front', face: 1 }, lay, 1)).x - 200;
  assert.ok(walk(2) < walk(1) * 0.7, `crater floor ${walk(2)}, ring ${walk(1)}`);
});

test('at Ceres the view is drawn: Ceres time on its clock, the crater floor flat and the rings curved, and a landing\'s business waits at the co-op\'s office by the yard gate', async () => {
  const { page, ev, errors, done } = await open({ viewport: { width: 1440, height: 900 } });
  await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.systemId = 'ceres'; st.planet = 'Ceres Station'; UI.planet = currentPlanet(); G.mode = 'landed';
    G.portOffers = []; Mods.emit('landed', currentPlanet()); G.dialog = null; G.nextEvent = null; G.portHour = 12; UI.act('closePage');
    landingScenesOpen(); offerScene('business', { title: 'Late at the Lock', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); landingScenesPlay();
  });
  await frames(page, 3);
  const r = await ev(() => {
    const boxes = G.portRooms || [], room = id => boxes.find(b => b.id === id), c = document.getElementById('vs');
    const tag = (G.portOfferBoxes || []).find(b => b.offer && b.offer.label === 'Late at the Lock');
    return { drawn: !!room('bar') && !!room('yard'), view: c.classList.contains('view'), hour: G.portHour, flat: Math.abs(room('yard').y - room('lock').y) < 1, curved: Math.abs(room('bunks').y - room('bar').y) >= 1, tag: tag && tag.room };
  });
  await done();
  assert.deepEqual(errors, []);
  assert.equal(r.drawn, true); assert.equal(r.view, true);
  assert.equal(r.flat, true, 'the crater floor\'s rooms sit level'); assert.equal(r.curved, true, 'a ring\'s rooms follow its curve');
  assert.equal(r.tag, 'yard', 'business at the yard gate: the co-op\'s office is Ceres\'s `yard` (ports.md, Its scenes\' places)');
});

test('Ceres\'s own people each have three words for the day; Mei Tan sells a bowl, Yusuf\'s word opens the co-op\'s board, and the nurse sees to a hurt (#1265)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.systemId = 'ceres'; st.planet = 'Ceres Station'; UI.planet = currentPlanet(); G.mode = 'landed'; st.credits = 5000;
    const planet = currentPlanet(), lay = portLayout(planet), folk = k => lay.folk.find(f => f.key === k), word = k => portWordEvent(folk(k), portFolkPerson(planet, folk(k)), st);
    const out = { words: lay.folk.map(f => [f.key, (PORT_WORDS[f.key] || []).length]), texts: {} };
    for (const f of lay.folk) out.texts[f.key] = [0, 1, 2].map(d => { st.day = d; return word(f.key).text; });
    st.day = 5;
    const mei = word('c-noodles'), buy = mei.choices.findIndex(c => /^Buy a bowl/.test(c.label)), c0 = st.credits;
    out.bowl = buy >= 0 && { said: mei.choices[buy].run(), paid: c0 - st.credits, again: !!word('c-noodles').choices[buy].can && !word('c-noodles').choices[buy].can() };
    out.clerk = word('c-clerk').choices.map(c => c.label);
    out.nurseWell = word('c-nurse').choices.map(c => c.label);
    career().hurtUntil = st.day + 10; out.nurseHurt = word('c-nurse').choices.map(c => c.label);
    return out;
  });
  await done();
  assert.deepEqual(errors, []);
  for (const [k, n] of r.words) assert.equal(n, 3, `${k}: three words`);
  for (const [k, t] of Object.entries(r.texts)) { assert.equal(new Set(t).size, 3, `${k}: a different word each day`); for (const x of t) assert.doesNotMatch(x, /[{}]/, k); }
  assert.ok(r.bowl, 'Mei Tan sells a bowl'); assert.match(r.bowl.said, /Mei Tan/); assert.equal(r.bowl.paid, 120); assert.equal(r.bowl.again, true, 'one a day');
  assert.ok(r.clerk.includes('Ask about work'), `the co-op's board (${r.clerk})`);
  assert.ok(!r.nurseWell.some(l => /seen to/.test(l)), 'no care offered to the well'); assert.ok(r.nurseHurt.some(l => /seen to/.test(l)), 'care while hurt');
});
