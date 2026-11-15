'use strict';

// A landing's scenes as offers on the port view (#1192, docs/bible/ports.md, A landing's scenes at a port with a view; js/portview.js, js/transit.js
// landingScenesPlay): at a port with a view the customs, the settling up and the mourning open at once, in that order, and every other landing scene
// waits as a tag on the view, over its person or on its room, at most four at once; they lapse at a night or a sailing, and a people scene comes round
// at a later landing at the same port. A port with no view plays as before (landingqueue.test.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const { portOfferWhere, portOffersShown } = load(['js/util.js', 'js/portview.js'], { Mods: { register() {} } }, ['portOfferWhere', 'portOffersShown']);
const plain = x => JSON.parse(JSON.stringify(x));

test('an offer shows over its person while the view has them, not while they are out of their hours, and on its room for someone the view never has', () => {
  const rooms = ['well', 'market', 'bar', 'yard', 'clinic', 'bunks'], o = (kind, place) => ({ kind, ev: { place } });
  assert.deepEqual(plain(portOfferWhere(o('people'), ['ngozi'], ['ngozi', 'p1'], ['ngozi'], rooms)), { id: 'ngozi' }, 'over her, while she is on the view');
  assert.equal(portOfferWhere(o('people'), ['ngozi'], ['p1'], ['ngozi'], rooms), null, 'out of her hours: it waits');
  assert.deepEqual(plain(portOfferWhere(o('business'), ['p9'], [], [], rooms)), { room: 'yard' }, 'business, with nobody the view has, at the yard office');
  assert.deepEqual(plain(portOfferWhere(o('people', 'bar'), [], [], [], rooms)), { room: 'bar' }, 'where its scene happens');
  assert.deepEqual(plain(portOfferWhere(o('ambient', 'deck'), [], [], [], rooms)), { room: 'market' }, 'a place the view has not: the market');
});

test('at most four show, in the order made, skipping one that cannot show now', () => {
  const offers = ['a', 'b', 'c', 'd', 'e', 'f'].map(k => ({ kind: 'people', key: k, label: k, ev: {} }));
  const whoOf = o => [o.key], castIds = ['a', 'c', 'd', 'e', 'f'], castable = ['a', 'b', 'c', 'd', 'e', 'f'];
  assert.deepEqual(plain(portOffersShown(offers, whoOf, castIds, castable, ['market']).map(s => s.label)), ['a', 'c', 'd', 'e'], 'b is out of the view: the next takes its place');
});

test('the day down\'s lanes on the spoke lift count as one against the four', () => {
  const lift = ['t', 'm', 'h', 'w'].map(k => ({ key: k, label: k, room: 'well', lift: true }));
  const offers = [...['a', 'b', 'c'].map(k => ({ key: k, label: k, room: 'market' })), ...lift, { key: 'z', label: 'z', room: 'bar' }];
  assert.deepEqual(plain(portOffersShown(offers, () => [], [], [], ['market', 'well', 'bar']).map(s => s.label)), ['a', 'b', 'c', 't', 'm', 'h', 'w'], 'three and the lift make four; the fifth waits');
});

const helpers = () => {
  window.hand = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; G.state.tutorial = null; G.dialog = null; G.nextEvent = null; G.portOffers = []; G.portLater = []; return G.state; };
  window.scene = (t, extra = {}) => ({ title: t, text: t, choices: [{ label: 'A', run: () => 'a' }], ...extra });
  window.playAll = () => { const seen = []; for (let g = 10; G.dialog && g--;) { seen.push(G.dialog.event.title); chooseEvent(0); G.nextEvent = null; finishEvent(); } return seen; };
  window.land = (offers) => { landingScenesOpen(); offers(); landingScenesPlay(); };
};
const run = async fn => { const t = await open(); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('at the Ring the customs, the settling up and the mourning open at once in that order; the business, the people and the port\'s own wait as offers', async () => {
  const r = await run(() => {
    hand();
    land(() => {
      offerScene('ambient', scene('Port')); offerScene('people', scene('Visit')); offerScene('business', scene('Yard')); offerScene('mourn', scene('Mourning'));
      offerScene('customs', scene('Customs')); offerScene('settle', scene('Settling'));
    });
    return { seen: playAll(), offers: G.portOffers.map(o => [o.kind, o.label, o.planet]) };
  });
  assert.deepEqual(r.seen, ['Customs', 'Settling', 'Mourning']);
  assert.deepEqual(r.offers, [['business', 'Yard', 'Earth'], ['people', 'Visit', 'Earth'], ['ambient', 'Port', 'Earth']]);
});

test('offers lapse at a night and at a sailing; a people scene comes round at a later landing at the same port, business and the port\'s own do not', async () => {
  const r = await run(() => {
    const st = hand(), out = {};
    land(() => { offerScene('business', scene('Yard')); offerScene('people', scene('Visit')); offerScene('ambient', scene('Port')); });
    Mods.emit('newDay', st.day + 1);
    out.night = [G.portOffers.length, G.portLater.map(o => o.label)];
    st.systemId = 'mars'; st.planet = 'Mars'; land(() => {}); out.mars = [G.portOffers.length, playAll()];
    st.systemId = 'earth'; st.planet = 'Earth'; land(() => {}); out.back = G.portOffers.map(o => [o.kind, o.label]);
    land(() => { offerScene('people', scene('Another')); }); takeOff(); out.sailed = [G.portOffers.length, G.portLater.map(o => o.label)];
    return out;
  });
  assert.deepEqual(r.night, [0, ['Visit']]);
  assert.deepEqual(r.mars, [0, []], 'not at another port');
  assert.deepEqual(r.back, [['people', 'Visit']], 'back at the Ring, among the landing\'s offers');
  assert.deepEqual(r.sailed[0], 0, 'sailing clears them'); assert.ok(r.sailed[1].includes('Another'));
});

test('an offer is a tag on the Ring\'s view, over its person or on its room, and a click on it opens its scene, docked, and takes it from the queue', async () => {
  const { page, ev, errors, done } = await open({ viewport: { width: 1440, height: 900 } });
  await ev(helpers);
  await ev(() => { hand(); UI.act('closePage'); G.portHour = 12; land(() => offerScene('business', scene('Late at the Lock'))); });
  await frames(page, 3);
  const tag = await ev(() => {
    const c = document.getElementById('vs').getBoundingClientRect(), b = (G.portOfferBoxes || []).find(x => x.offer && x.offer.label === 'Late at the Lock');
    return b ? { x: c.left + b.x + b.w / 2, y: c.top + b.y + b.h / 2, room: b.room } : null;
  });
  assert.ok(tag, 'the tag is drawn'); assert.equal(tag.room, 'yard', 'on the yard office');
  await page.mouse.click(tag.x, tag.y); await frames(page, 2);
  const after = await ev(() => ({ open: G.dialog && G.dialog.event.title, left: G.portOffers.length }));
  assert.deepEqual(after, { open: 'Late at the Lock', left: 0 });
  await done();
  assert.deepEqual(errors, []);
});

test('a story\'s turn opens at once at the Ring, after the mourning and before the offers; with no view it plays among what the port brings, as before', async () => {
  const r = await run(() => {
    const st = hand(), out = {};
    land(() => { offerScene('ambient', scene('Port')); offerScene('turn', scene('Turn')); offerScene('mourn', scene('Mourning')); });
    out.ring = [playAll(), G.portOffers.map(o => o.label)];
    st.systemId = 'mars'; st.planet = 'Mars';
    land(() => { offerScene('ambient', scene('Port')); offerScene('turn', scene('Turn')); offerScene('people', scene('Visit')); });
    out.mars = playAll();
    return out;
  });
  assert.deepEqual(r.ring, [['Mourning', 'Turn'], ['Port']]);
  assert.deepEqual(r.mars, ['Visit', 'Port', 'Turn'], 'in the order offered among what the port brings');
});

test('at the Ring the day ashore is tags, not a button: a walk on the market, whatever is on at the bar, a regular over them; taking one spends the hour', async () => {
  const r = await run(() => {
    const st = hand(), out = {}, planet = currentPlanet();
    Mods.emit('landed', planet); G.dialog = null; G.nextEvent = null; fillBar(planet);
    out.tags = ashoreOffers(st, planet).map(o => [o.key, o.room || null, !!o.who]);
    UI.tab = 'port'; UI.render(); out.button = !!document.querySelector('button[data-action="dayAshore"]');
    ashoreOffers(st, planet).find(o => o.key === 'ashore:walk').take();
    out.scene = [G.dialog.event.title, G.dialog.event.text.length > 40, G.dialog.choices.map(c => c.label)];
    finishEvent(); out.after = ashoreOffers(st, planet).length;
    return out;
  });
  assert.ok(r.tags.some(t => t[0] === 'ashore:walk' && t[1] === 'market'));
  const table = r.tags.find(t => t[0] === 'ashore:table'); assert.ok(!table || table[2], 'the regulars\' table over a regular');
  assert.equal(r.button, false, 'no button on the Port page at the Ring');
  assert.deepEqual(r.scene, ['A Day Ashore', true, ['Go on']]);
  assert.equal(r.after, 0, 'the hour is spent');
});

test('the day down\'s tags: the crayfish is a choice in the market\'s day; Tomas\'s parcel is a tag over him, paid for only when it is taken', async () => {
  const r = await run(() => {
    const st = hand(), h = hired(), planet = currentPlanet(), out = {}, t = tomasAboard();
    delete h.stay; beginStay(h, 9, 'market'); st.credits = 5000; st.portAte = st.day - 1; st.belowSeen = BELOW.slice();
    downOffers(st, planet).find(o => o.key === 'down:market').take(); out.market = G.dialog.choices.map(c => c.label); finishEvent();
    if (t) { delete h.downDay; st.credits = 5000; t.opinion = OPINION.TRUSTED; delete t.parentsAt;
      const p = downOffers(st, planet).find(o => o.key === 'down:parcel'); out.parcel = p && [p.who === t.id, p.label];
      p.take(); const c = G.dialog.choices; out.not = [c.map(x => x.label)]; chooseEvent(1); finishEvent(); out.notPaid = st.credits;
      downOffers(st, planet).find(o => o.key === 'down:parcel').take(); chooseEvent(0); out.paid = st.credits; while (G.dialog) finishEvent(); }
    return out;
  });
  assert.ok(r.market.some(l => /crayfish/i.test(l)), 'the crayfish, in the market\'s day'); assert.equal(r.market[r.market.length - 1], 'Back up the spoke');
  if (r.parcel) { assert.equal(r.parcel[0], true); assert.match(r.parcel[1], /bag for his parents/); assert.equal(r.notPaid, 5000, 'not taken, nothing paid'); assert.equal(r.paid, 4100, 'taken, the fare'); }
});

test('a port with no view plays its landing as before: nothing waits', async () => {
  const r = await run(() => {
    const st = hand(); st.systemId = 'mars'; st.planet = 'Mars';
    land(() => { offerScene('people', scene('Visit')); offerScene('mourn', scene('Mourning')); offerScene('business', scene('Yard')); });
    return { seen: playAll(), offers: G.portOffers.length };
  });
  assert.deepEqual(r.seen, ['Yard', 'Visit', 'Mourning'], 'the mourning among the people, in its turn, as before');
  assert.equal(r.offers, 0);
});
