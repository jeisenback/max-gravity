'use strict';

// The Ice Haulers' Strike for the hand (js/stories/ice-strike.js, #1044, docs/bible/chapter-1.md): the broadcast starts the month, the organiser at Ceres asks what
// the hand will do (stand with it, carry for it, keep out, or cross it), the captain keeps the ship off the ice only when asked by someone she or her bosun trusts,
// the crates under the tarp cost the hand if she finds them, and the end is the strike's own roll, tipped by the hand's weight.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { strikeEnd, strikeRoll } = load(['js/util.js', 'js/stories/ice-strike.js'], { Mods: { register() {} } }, ['strikeEnd', 'strikeRoll']);

test('the strike ends on its own roll, tipped a tenth a point of the hand\'s weight, held to -3..5', () => {
  assert.equal(strikeEnd(0.7, 0), 'won'); assert.equal(strikeEnd(0.69, 0), 'held'); assert.equal(strikeEnd(0.3, 0), 'held'); assert.equal(strikeEnd(0.29, 0), 'broke');
  assert.equal(strikeEnd(0.2, 5), 'won', 'a hand who stood with it and carried for it tips a poor roll to a win');
  assert.equal(strikeEnd(0.55, -3), 'broke', 'a hand who crossed it tips a middling roll to a break');
  assert.equal(strikeEnd(0.2, 9), strikeEnd(0.2, 5), 'the weight is held at 5'); assert.equal(strikeEnd(0.65, -9), strikeEnd(0.65, -3), 'and at -3');
  const a = strikeRoll({ captain: 'p1', since: 3 });
  assert.ok(a >= 0 && a < 1); assert.equal(strikeRoll({ captain: 'p1', since: 3 }), a, 'the same run rolls the same');
});

const helpers = () => {
  window.start = () => { startGame({ slot: 1, background: 'earth', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; st.tutorial = null; hired().runsDone = 3; return st; };
  window.land = (sid, planet) => { const st = G.state; G.transit = null; G.mode = 'landed'; st.dest = null; st.systemId = sid; st.planet = planet; UI.notes.length = 0; G.dialog = null; G.nextEvent = null;
    st.customs = { ...(st.customs || {}), last: st.day }; Mods.emit('landed', currentPlanet()); return G.dialog && G.dialog.event; };
  window.scene = id => storyletEvent(STORYLETS.find(s => s.id === id));
  window.pick1 = (e, label) => { const c = e.choices.find(x => x.label === label) || e.choices.find(x => x.label.startsWith(label)); if (!c) throw new Error(`no choice "${label}" in ${e.title}: ${e.choices.map(x => x.label)}`); const shut = !!c.can && !c.can(); const text = shut ? null : c.run(); const next = G.nextEvent; G.nextEvent = null; G.dialog = null; return { text, next, shut }; };
  window.q = () => ({ ...G.state.qualities });
};
const run = async fn => { const t = await open(); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('the broadcast starts the month, and the organiser at Ceres asks what the hand will do', async () => {
  const r = await run(() => {
    const st = start(), out = {};
    const b = scene('strike-broadcast'); out.broadcast = { title: b.title, labels: b.choices.map(c => c.label) }; out.wrote = pick1(b, 'Write the frequency down').text; out.q = q(); out.day = st.day;
    const m = land('ceres', 'Ceres Station'); out.ceres = m && { title: m.title, labels: m.choices.map(c => c.label), text: m.text };
    return out;
  });
  assert.equal(r.broadcast.title, 'On the Band'); assert.deepEqual(r.broadcast.labels, ['Write the frequency down', 'Let the batch run on']);
  assert.match(r.wrote, /The captain's ship hauls ice between contracts/); assert.equal(r.q.strikeOn, 1); assert.equal(r.q.strike, 1); assert.equal(r.q['due:strike-end'], r.day + 30, 'a month');
  assert.equal(r.ceres.title, 'Mirela Sandoval'); assert.match(r.ceres.text, /Your captain runs ice between contracts/);
  assert.deepEqual(r.ceres.labels, ['Say you will ask the captain to stay off the ice', 'Say you will carry for the Guild', 'Say it is not your fight', 'Say the ship hauls, and take the buyers\' bonus']);
});

test('the captain keeps the ship off the ice when the bosun or her own trust stands behind the ask, and not otherwise; the ice comes back when it is settled', async () => {
  const r = await run(() => {
    const out = {}, ask = (cato, cap) => {
      const st = start(); pick1(scene('strike-broadcast'), 'Let the batch run on'); opinionOf('xo').opinion = cato; opinionOf('captain').opinion = cap;
      const first = pick1(land('ceres', 'Ceres Station'), 'Say you will ask the captain'); const e = first.next, before = opinionOf('captain').opinion;
      return { title: e.title, st, e, before };
    };
    let a = ask(3, 0); out.cato = { title: a.title, res: pick1(a.e, 'Ask her with Cato beside you'), held: iceHeld(a.st), drop: opinionOf('captain').opinion - a.before, q: q() };
    a.st.day = a.st.qualities['due:strike-end']; out.after = iceHeld(a.st);
    a = ask(0, 3); out.own = { res: pick1(a.e, 'Ask her yourself'), held: iceHeld(a.st) };
    a = ask(0, 0); out.shut = [pick1(a.e, 'Ask her with Cato').shut, pick1(a.e, 'Ask her yourself').shut]; out.no = { res: pick1(a.e, 'Ask her'), held: iceHeld(a.st), q: q() };
    return out;
  });
  assert.equal(r.cato.res.shut, false); assert.match(r.cato.res.text, /Contracts only, until it is settled/); assert.equal(r.cato.held, true, 'no ice while it runs');
  assert.equal(r.cato.drop, -1, 'she writes down what it costs'); assert.deepEqual([r.cato.q.markGuild, r.cato.q.markKaur, r.cato.q.strike], [1, 1, 3]);
  assert.equal(r.after, false, 'the ice comes back when the month is out');
  assert.equal(r.own.res.shut, false); assert.equal(r.own.held, true);
  assert.deepEqual(r.shut, [true, true], 'nobody she trusts behind the ask'); assert.match(r.no.res.text, /the house is not on strike/); assert.equal(r.no.held, false); assert.equal(r.no.q.markGuild || 0, 0);
});

test('the crates under the tarp: aboard at Ceres, found on a burn at the hand\'s cost, landed at the next Belt dock', async () => {
  const r = await run(() => {
    const out = {}, aboard = () => { const st = start(); pick1(scene('strike-broadcast'), 'Let the batch run on'); out.carry = pick1(land('ceres', 'Ceres Station'), 'Say you will carry').text; return st; };
    let st = aboard(); out.q = q(); let c0 = st.credits, o0 = opinionOf('captain').opinion;
    out.told = { res: pick1(scene('strike-tarp'), 'Tell her what is in the crates').text, credits: st.credits - c0, opinion: opinionOf('captain').opinion - o0, found: q().strikeFound };
    st = aboard(); c0 = st.credits; o0 = opinionOf('captain').opinion;
    out.mine = { credits: (pick1(scene('strike-tarp'), 'Say they are yours'), st.credits - c0), opinion: opinionOf('captain').opinion - o0 };
    const e = land('pallas', 'Pallas Refinery'); out.landed = e && e.title; if (e) pick1(e, 'Help them load the sled'); out.after = q();
    return out;
  });
  assert.match(r.carry, /behind the water tank/); assert.deepEqual([r.q.strikeCarry, r.q.strike, r.q.markGuild, r.q.markKaur], [1, 2, 1, 1]);
  assert.match(r.told.res, /Two tonnes of mass is fuel/); assert.deepEqual([r.told.credits, r.told.opinion, r.told.found], [-300, -1, 1]);
  assert.deepEqual([r.mine.credits, r.mine.opinion], [-300, -2], 'a lie costs her regard more');
  assert.equal(r.landed, 'Off at the Lock'); assert.equal(r.after.strikeCarried, 1); assert.equal(r.after.strike, 3);
});

test('crossing it pays the buyers\' bonus, less than a run, and the Guild keeps the name', async () => {
  const r = await run(() => {
    const st = start(); pick1(scene('strike-broadcast'), 'Let the batch run on'); const c0 = st.credits;
    pick1(land('ceres', 'Ceres Station'), 'Say the ship hauls'); return { credits: st.credits - c0, q: q() };
  });
  assert.equal(r.credits, 600); assert.deepEqual([r.q.scab, r.q.strike, r.q.markGuild], [1, -3, -1]);
});

test('the end plays at a Belt dock when the month is out: the end the roll and the weight give, in the news, and the strike done', async () => {
  const r = await run(() => {
    const out = [];
    for (const weight of [5, 0, -3]) {
      const st = start(); pick1(scene('strike-broadcast'), 'Let the batch run on'); st.qualities.strike = weight;
      out.push({ early: (land('pallas', 'Pallas Refinery') || {}).title });
      st.day = st.qualities['due:strike-end']; const unrest = worldOf('ceres').unrest;
      const e = land('pallas', 'Pallas Refinery'), res = e && e.title === 'The Guild Calls the Hulls In' ? pick1(e, 'Listen').text : null;
      Object.assign(out[out.length - 1], { title: e && e.title, res, news: (st.news || [])[0] && st.news[0].text, unrest: +(worldOf('ceres').unrest - unrest).toFixed(3),
        want: strikeEnd(strikeRoll(hired()), weight), done: q().strikeDone, again: (land('pallas', 'Pallas Refinery') || {}).title });
    }
    return out;
  });
  const words = { won: [/raised the price a tonne by a tenth/, /buyers raise the price a tonne/, -0.1], held: [/a review of the price in the spring/, /word of a review/, 0], broke: [/a twentieth less a tonne/, /a twentieth less a tonne/, 0.1] };
  for (const e of r) {
    assert.notEqual(e.early, 'The Guild Calls the Hulls In', 'not before the month is out');
    assert.equal(e.title, 'The Guild Calls the Hulls In'); const [said, news, unrest] = words[e.want];
    assert.match(e.res, said, `the ${e.want} end`); assert.match(e.news, news); assert.equal(e.unrest, unrest); assert.equal(e.done, 1);
    assert.notEqual(e.again, 'The Guild Calls the Hulls In', 'once');
  }
});

test('a captain who kept the ship off the ice has a stake in the end: the win raises her regard by two, the break lowers it by one (#1060)', async () => {
  const r = await run(() => {
    const out = [];
    for (const [weight, hold] of [[5, 1], [-3, 1], [0, 1], [5, 0]]) {
      const st = start(); pick1(scene('strike-broadcast'), 'Let the batch run on'); st.qualities.strike = weight; st.qualities.strikeHold = hold;
      st.day = st.qualities['due:strike-end']; const cap = opinionOf('captain'); cap.opinion = 0;
      const e = land('pallas', 'Pallas Refinery'), res = pick1(e, 'Listen').text;
      out.push({ hold, want: strikeEnd(strikeRoll(hired()), weight), regard: cap.opinion, res, kept: q().strikeHold });
    }
    return out;
  });
  for (const e of r) {
    const n = !e.hold ? 0 : e.want === 'won' ? 2 : e.want === 'broke' ? -1 : 0;
    assert.equal(e.regard, n, `${e.want}, held ${e.hold}: her regard`);
    assert.equal(/Captain Vance writes/.test(e.res), n !== 0, 'her words only when it moved her');
    assert.equal(e.kept, 0, 'the hold ends with the strike');
  }
});
