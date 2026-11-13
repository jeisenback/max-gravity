'use strict';

// The repair in port (#1135, parts.js): on landing at a port with an outfitter, the worst system under REPAIR_BELOW is put up for repair once a
// stay, when the fund can pay at least the printed part. The engineer lays out a yard part, a used one when the port has one, and a printed one;
// the captain's pick is a fixed score from her card (no dice); the hand may say nothing or argue for another, a word with the captain; the fund
// pays. Not in chapter two, not for an owner, not at a port with no outfitter.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the captain\'s pick is a fixed score: a careful, thrifty captain with a full fund takes the yard part; with a thin fund the printed one', () => {
  const { captainPartPick } = load(['js/util.js', 'js/parts.js'], { Mods: { register() {} } }, ['captainPartPick']);
  const offers = [{ source: 'yard', price: 2400 }, { source: 'used', price: 1080 }, { source: 'printed', price: 480 }];
  const hester = { trade: 4, nerve: 1, thrift: 5 };
  assert.equal(captainPartPick(hester, offers, 120000), 0, 'a full fund: the yard part');
  assert.equal(captainPartPick(hester, offers, 5000), 2, 'a thin fund: the printed part');
  assert.equal(captainPartPick(hester, offers, 120000), captainPartPick(hester, offers, 120000), 'the same every time');
  assert.ok(captainPartPick({ trade: 3, nerve: 5, thrift: 5 }, offers, 20000) > 0, 'a bold captain short of money takes a cheaper part than the yard\'s');
});

const setup = () => {
  window.landed = (o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    const c = condition(); Object.assign(c, { drive: 100, fire: 100, shields: 100, life: 100, sensors: 100 }, o.condition || {});
    if (o.fund !== undefined) hired().fund = o.fund;
    return c;
  };
  // the scene the landing at a port offers, if any (repairs.js: one yard scene a landing)
  window.offered = planetName => {
    const planet = Object.values(SYSTEMS).flatMap(y => y.planets).find(p => p.name === planetName);
    const seen = []; const real = window.offerScene; window.offerScene = (rank, ev) => { if (ev) seen.push(ev); };
    try { Mods.emit('landed', planet); } finally { window.offerScene = real; }
    return seen.filter(e => e.parts);
  };
};

test('a system under the line at a port with an outfitter is put up for repair, once a stay; none above it, none at a port with no outfitter, none with no money', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => {
    const out = {};
    landed({ condition: { fire: 70 } }); const first = offered('Earth'); out.first = first.map(e => e.title); out.again = offered('Earth').length;
    landed({ condition: { fire: 80 } }); out.above = offered('Earth').length;
    landed({ condition: { fire: 70 } }); out.noOutfitter = offered('Mars').length;
    landed({ condition: { fire: 70 }, fund: 10 }); out.broke = offered('Earth').length;
    return out;
  });
  await done();
  assert.equal(r.first.length, 1); assert.match(r.first[0], /Fire Control/);
  assert.equal(r.again, 0, 'once a stay'); assert.equal(r.above, 0); assert.equal(r.broke, 0, 'not when the fund cannot pay the printed part');
});

test('the scene: the captain\'s pick stands when the hand says nothing; arguing passes or fails by a word with the captain; the fund pays and the line names the part', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => {
    const out = {};
    const play = (label, roll) => {
      landed({ condition: { fire: 70 } }); const fund = hired().fund, e = offered('Earth')[0];
      const c = label ? e.choices.find(x => x.label.startsWith(label)) : e.choices[0];
      const real = Math.random; Math.random = () => (roll ? 0 : 0.999);  // the word with the captain won or lost
      let text; try { text = c.run(); } finally { Math.random = real; }
      return { text, paid: fund - hired().fund, source: fittedPart(G.state, 'fire').source, labels: e.choices.map(x => x.label) };
    };
    out.quiet = play(null, 0);
    out.argueWin = play('Argue for the printed', 1);
    out.argueLose = play('Argue for the printed', 0);
    return out;
  });
  await done();
  assert.equal(r.quiet.source, 'yard', 'Hester, with a full fund, takes the yard part');
  assert.ok(r.quiet.paid > 0 && /cr/.test(r.quiet.text), r.quiet.text);
  assert.ok(r.quiet.labels.some(l => /^Argue for the printed/.test(l)), r.quiet.labels.join(' | '));
  assert.equal(r.argueWin.source, 'printed', 'a pass: the argued part'); assert.ok(r.argueWin.paid < r.quiet.paid);
  assert.equal(r.argueLose.source, 'yard', 'a fail: her pick');
});

test('no repair scene in chapter two', async () => {
  const { ev, done } = await open();
  await ev(setup);
  const r = await ev(() => { landed({ condition: { fire: 70 } }); hired().chapter = 2; return offered('Earth').length; });
  await done();
  assert.equal(r, 0);
});
