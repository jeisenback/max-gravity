'use strict';

// The rest of the people's scenes on a burn as offers (#1198, stage 2 of #1184; docs/bible/burn.md, What stops the burn): the hand's crew and money
// events, relationship scenes, trait events, traditions and colour storylets are tags on the ship, who each is about chosen when it is offered; taken,
// the scene plays and is used up; let lapse, it is not, and comes round again. The work, the road and the ship's own trouble stay urgent.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.burn = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9;
    sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null;
    G.transit.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };
    G.transit.offers = [];
    return st;
  };
  // Draw with only the candidates `keep` passes; the result, what is queued, and the queue's first offer.
  window.drawOnly = keep => {
    const real = Mods.filter, call = (...a) => real.apply(Mods, a);
    Mods.filter = (n, v, ...a) => (n === 'happenings' ? call(n, v, ...a).filter(keep) : call(n, v, ...a));
    try { const got = pickHappening('transit'); return { opened: !!got || !!G.dialog, offers: (G.transit.offers || []).map(o => ({ who: o.who, room: o.room || null, label: o.label })) }; } finally { Mods.filter = real; }
  };
  window.lapse = () => { const t = G.transit; t.offers = offersTick(t.offers, shipPeople(), OFFER_LIFE, OFFER_REAL); return t.offers.length; };
  window.take = () => { const o = G.transit.offers[0]; offerClick({ offer: o }); const title = G.dialog && G.dialog.event.title; while (G.dialog) finishEvent(); return title; };
};
const run = async fn => { const t = await open({ scope: 'earth-hired' }); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('a crew event is an offer over the shipmate it is about; let lapse, it is not marked seen and comes round again; taken, it plays and is seen', async () => {
  const r = await run(() => {
    const st = burn(), out = {};
    const crewCand = c => c.group === 'crew';
    out.first = drawOnly(crewCand); out.seen0 = Object.keys(st.eventSeen || {}).filter(k => k.startsWith('crew-')).length;
    out.left = lapse(); out.seen1 = Object.keys(st.eventSeen || {}).filter(k => k.startsWith('crew-')).length;
    out.again = drawOnly(crewCand).offers.length;
    out.taken = take(); out.seen2 = Object.keys(st.eventSeen || {}).filter(k => k.startsWith('crew-')).length;
    return out;
  });
  assert.equal(r.first.opened, false, 'no scene opens'); assert.equal(r.first.offers.length, 1);
  assert.ok(r.first.offers[0].who, 'over the one it is about'); assert.match(r.first.offers[0].label, /has something to ask|has a minute/);
  assert.equal(r.seen0, 0, 'offered, not used'); assert.equal(r.left, 0, 'lapsed'); assert.equal(r.seen1, 0, 'lapsed, still unused');
  assert.equal(r.again, 1, 'it comes round again'); assert.ok(r.taken, 'taken, it plays'); assert.equal(r.seen2, 1, 'and is used up');
});

test('a trait event, a tradition and a relationship scene are offers over their person; a colour storylet is an offer in the galley', async () => {
  const r = await run(() => {
    const st = burn(), out = {}, h = home(); h.burns = 3;
    const kind = k => c => c.group === k;
    out.trait = drawOnly(kind('trait')).offers; G.transit.offers = [];
    const proposed0 = h.proposed.length; out.tradition = drawOnly(kind('tradition')).offers; out.notProposed = h.proposed.length === proposed0;
    lapse(); out.tradTaken = !!drawOnly(kind('tradition')).offers.length && !!take() && h.proposed.length === proposed0 + 1; G.transit.offers = [];
    const crew = st.crew.map(person).filter(Boolean); if (crew.length >= 2) addBond({ id: crew[0].id }, { id: crew[1].id }, -4);
    out.pair = drawOnly(kind('pair')).offers; G.transit.offers = [];
    out.colour = drawOnly(c => c.offer && c.offer.kind === 'colour').offers;
    return out;
  });
  for (const k of ['trait', 'tradition']) { assert.equal(r[k].length, 1, `${k}: ${JSON.stringify(r)}`); assert.ok(r[k][0].who, `${k}: over a person`); }
  assert.equal(r.notProposed, true, 'offered, the tradition is not proposed'); assert.equal(r.tradTaken, true, 'taken, it is');
  if (r.pair.length) { assert.ok(r.pair[0].who); assert.match(r.pair[0].label, / and |has something to ask/); }
  if (r.colour.length) assert.deepEqual([r.colour[0].room, r.colour[0].label], ['galley', 'Something in the galley']);
});

test('the work, the road and the ship\'s own trouble stay urgent: no offer', async () => {
  const r = await run(() => {
    burn(); const real = Mods.filter, call = (...a) => real.apply(Mods, a);
    const list = call('happenings', [], 'transit');
    return ['work', 'road', 'captain'].map(g => list.filter(c => c.group === g).every(c => !c.offerOf && !c.offer));
  });
  assert.deepEqual(r, [true, true, true]);
});
