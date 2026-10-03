'use strict';

// The raid engagement for a hired hand: pirates make contact, and it plays in beats instead of the card duel.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.raid = (post = 'gunner', shipId = 'raider') => {
    __seed(1);  // a constant random (rolls, below) hangs the generators, so every game starts from the seeded one
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy;
    const spare = window.realMakeEnemy({ kind: 'pirate' });  // made now: the enemy's person cannot be made under a constant random
    window.makeEnemy = () => Object.assign(spare, { shipId });  // the style of the raider or the corsair
    return st;
  };
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  window.begin = () => { const e = G.nextEvent; G.nextEvent = null; openEvent(e); };  // the first scene; later ones open from finishEvent
  window.choose = (label) => { const i = G.dialog.choices.findIndex(c => c.label.includes(label)); const t = chooseEvent(i); return t; };
};

test('a pirate contact for a hired hand opens the raid, not the card duel, and the scenes are yours to decide', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('pilot'); const text = startDuel({ kind: 'pirate' }, false);
    begin();
    return { text: /Battle stations/.test(text), title: G.dialog.event.title, duel: !!G.duel, decided: !!G.dialog.event.decided, labels: G.dialog.choices.map(c => c.label), pos: /Position: even/.test(G.dialog.event.text) };
  });
  assert.ok(r.text); assert.equal(r.title, 'The Closing'); assert.equal(r.duel, false); assert.ok(!r.decided, 'the captain does not take this call');
  assert.equal(r.labels.length, 4); assert.ok(r.labels.some(l => l === '[Pilot] Put the sun behind us')); assert.ok(r.pos);
  await done();
});

test('winning the beats makes her break off, and costs nothing but a log line and some experience', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), cap = person(hired().captain), op = cap.opinion, xp = skillXp('gunner'), armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.01, 0.01]);  // the post choice works at the closing and the first pass: +2 each, and she is far enough behind to break off
    const a = choose('Get a lock'); finishEvent();
    const mid = /Position: ahead/.test(G.dialog.event.text);
    const c = choose('Walk a burst');
    return { mid, off: /breaks off/.test(c), opinion: cap.opinion - op, xp: skillXp('gunner') - xp, armor: st.armor === armor, next: !!G.nextEvent };
  });
  assert.ok(r.mid, 'ahead after the first'); assert.ok(r.off); assert.equal(r.opinion, 1); assert.equal(r.xp, 3); assert.ok(r.armor); assert.equal(r.next, false);
  await done();
});

test('losing the beats puts her alongside, and the fight goes to the lock', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('engineer'), armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.99, 0.99, 0.99, 0.99, 0.99, 0.99]);  // every choice fails: -1, -1, -1 or worse
    const out = {};
    out.a = choose('Turn into her'); finishEvent();  // -2, and hull
    out.second = G.dialog.event.title;
    out.b = choose('Burn evasive');
    out.next = G.nextEvent && G.nextEvent.title; out.alongside = /alongside/.test(out.b); out.hull = st.armor < armor;
    return out;
  });
  assert.equal(r.second, 'First Pass'); assert.ok(r.alongside, r.b); assert.equal(r.next, 'The Corridor', 'a raider comes in at the corridor'); assert.ok(r.hull);
  await done();
});

test('a corsair is a torpedo fight and a raider a grapple fight, in the words and in the boarding', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const shipId of ['raider', 'corsair']) {
      raid('gunner', shipId); startDuel({ kind: 'pirate' }, false); begin();
      out[shipId] = { open: G.dialog.event.text.slice(0, 20) };
      rolls([0.99, 0.99, 0.99]);
      choose('Turn into her'); finishEvent();
      out[shipId].pass = G.dialog.event.text.slice(0, 30);
      const t = choose('Return fire');
      out[shipId].boarded = t.includes('torpedo takes') ? 'torpedo' : t.includes('grapples') ? 'grapple' : '';
      out[shipId].pos = G.nextEvent && G.nextEvent.text.includes('Boarders: ');
      const n = G.nextEvent.text.match(/Boarders: (\d+)/); out[shipId].boarders = n && +n[1];
    }
    return out;
  });
  assert.notEqual(r.raider.open, r.corsair.open); assert.notEqual(r.raider.pass, r.corsair.pass);
  assert.equal(r.raider.boarded, 'grapple'); assert.equal(r.corsair.boarded, 'torpedo');
  assert.ok(r.raider.pos && r.corsair.pos);
  assert.ok(r.raider.boarders > r.corsair.boarders - 3, 'a full run for a raider, a short one for a corsair');
  await done();
});

test('burning hard can get clear before there is a fight, and failing costs hull and starts one behind', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('pilot'), armor = st.armor, out = {};
    rolls([0.01]); out.clear = startDuel({ kind: 'pirate' }, true); out.none = !G.nextEvent;
    rolls([0.99]); out.text = startDuel({ kind: 'pirate' }, true); out.next = G.nextEvent && G.nextEvent.title; out.hull = st.armor < armor; out.behind = /Position: even/.test(G.nextEvent.text) === false;
    return out;
  });
  assert.match(r.clear, /opens the range/); assert.ok(r.none);
  assert.equal(r.next, 'The Closing'); assert.ok(r.hull); assert.ok(r.behind, 'one behind from the start');
  await done();
});

test('other contacts for a hired hand are still the card duel', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => { raid('gunner'); startDuel({ kind: 'patrol', gov: 'Earth Coalition' }, false); return { duel: !!G.duel, next: G.nextEvent && G.nextEvent.title }; });
  assert.ok(r.duel); assert.match(r.next, /Contact: exchange/);
  await done();
});
