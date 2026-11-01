'use strict';

// The hired hand's opening scene (signon.js): a story for each background, the post you chose, the people you work
// beside, and the one choice about why you signed on.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('every background and post opens with Signing On, naming the ship, the captain, the pair and the post', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    const out = [], marks = { earth: 'kept by the berth book', mars: 'domes of Tharsis', belt: 'Ceres Warren' }, lines = { pilot: 'the helm', gunner: 'the guns', engineer: 'the plant', comms: 'the bands' };
    for (const bg of ['earth', 'mars', 'belt']) {
      for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
        startGame({ slot: 1, background: bg, captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'imre' });  // a first officer with no walk-through of their own: the opening names the pair
        const e = G.dialog && G.dialog.event, st = G.state, cap = st.people[st.hired.captain];
        const pair = st.crew.map(person).filter(c => c.cast).map(c => fullName(c));
        const text = e ? e.text : '';
        out.push({
          at: `${bg}/${post}`, title: e && e.title, choices: e && e.choices.map(c => c.label),
          ship: text.includes(shipTitle().replace(/^./, ch => ch.toUpperCase())), cap: text.includes(`Captain ${cap.first} ${cap.last}`), pair: pair.length === 3 && pair.every(n => text.includes(n)),  // the pair and the first officer
          bg: text.includes(marks[bg]), post: text.includes(lines[post]), paragraphs: text.split('</p><p>').length,
          emoji: /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(text), undefinedText: /undefined|NaN/.test(text),
        });
      }
    }
    return out;
  });
  assert.equal(r.length, 12);
  for (const x of r) {
    assert.equal(x.title, 'Signing On', x.at);
    assert.deepEqual(x.choices, ['For the money', 'To learn the work', 'To be somewhere else'], x.at);
    assert.ok(x.ship && x.cap && x.pair && x.bg && x.post, `${x.at}: names the ship, captain, pair, background and post`);
    assert.equal(x.paragraphs, 3, `${x.at}: three paragraphs`);
    assert.ok(!x.emoji && !x.undefinedText, `${x.at}: clean text`);
  }
  await done();
});

test('each reason has its own small, permanent effect', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = {};
    for (const [i, reason] of ['money', 'learn', 'away'].entries()) {
      startGame({ slot: 1, background: 'mars', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });  // one captain, so one base share
      const st = G.state, h = st.hired, cap = st.people[h.captain], pair = st.crew.map(person).filter(c => c.cast);
      const before = { wage: h.wage, xp: skillXp('gunner'), cap: cap.opinion, pair: pair.map(c => c.opinion) };
      const text = chooseEvent(i);
      out[reason] = { text: text.length > 40, reason: h.reason, wage: h.wage, xp: skillXp('gunner') - before.xp, cap: cap.opinion - before.cap, pair: pair.map((c, k) => c.opinion - before.pair[k]) };
      out.base = before.wage;
    }
    return out;
  });
  assert.equal(r.base, 500, 'the captain\'s own day rate (a rating\'s, #879)');
  assert.deepEqual(r.money, { text: true, reason: 'money', wage: r.base + 25, xp: 0, cap: 0, pair: [0, 0, 0] });
  assert.deepEqual(r.learn, { text: true, reason: 'learn', wage: r.base, xp: 8, cap: 0, pair: [0, 0, 0] });
  assert.deepEqual(r.away, { text: true, reason: 'away', wage: r.base, xp: 0, cap: 1, pair: [1, 1, 1] });
  await done();
});

test('it works with any captain, and an owner does not get it', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'belt', captain: 'Sam Rowe', mode: 'hired', post: 'comms' }); while (G.dialog) finishEvent();
    const st = G.state, cap = st.people[st.hired.captain], bad = [];
    delete st.hired.captainKey;  // a generated captain (an older save): the crew describe them by their traits
    for (const t of Object.keys(TRAITS)) { cap.traits[0] = t; const e = signOnEvent(); if (/undefined|NaN/.test(e.text) || !e.text.includes(TRAITS[t].adj)) bad.push(t); }
    startGame({ slot: 1, background: 'belt', captain: 'Sam Rowe' });
    return { bad, owner: !!(G.dialog && G.dialog.event && G.dialog.event.title === 'Signing On') };
  });
  assert.deepEqual(r.bad, []);
  assert.equal(r.owner, false);
  await done();
});

test('the opening says nothing of the interface, and the look back echoes why you signed on', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = {};
    for (const [i, reason] of ['money', 'learn', 'away'].entries()) {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });
      out.opening = signOnEvent().text;
      chooseEvent(i);
      out[reason] = chapterRecap().text;
    }
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });
    out.none = chapterRecap().text;
    return out;
  });
  assert.doesNotMatch(r.opening, /press Sail|Save toward|credits to your name/);
  assert.match(r.money, /You signed on for the money\. You came with 3,000 cr and have /);
  assert.match(r.learn, /You signed on to learn the work\. The gunner post is at level \d/);
  assert.match(r.away, /You signed on to be somewhere else\. It is \d+ days and \d+ runs? from the dock you left\./);
  assert.doesNotMatch(r.none, /You signed on/, 'a save with no reason says nothing');
  await done();
});

test('each answer to Signing On is in the stored game, so quitting before the first dock keeps it', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = {};
    for (const [i, reason] of ['money', 'learn', 'away'].entries()) {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });
      const h = hired(), pair = G.state.crew.map(person).filter(c => c.cast), cap = person(h.captain);
      const live = { wage: h.wage, xp: skillXp('gunner'), cap: cap.opinion, pair: pair.map(c => c.opinion) };
      chooseEvent(i);
      const now = { wage: h.wage, xp: skillXp('gunner'), cap: cap.opinion, pair: pair.map(c => c.opinion), reason: h.reason };
      Saves.use(1); loadGame();   // as Continue does, after quitting before the next dock
      const g = hired(), c2 = person(g.captain), p2 = G.state.crew.map(person).filter(c => c.cast);
      out[reason] = { live, now, stored: { wage: g.wage, xp: skillXp('gunner'), cap: c2.opinion, pair: p2.map(c => c.opinion), reason: g.reason } };
    }
    return out;
  });
  for (const reason of ['money', 'learn', 'away']) {
    const x = r[reason];
    assert.deepEqual(x.stored, x.now, `${reason}: the stored game has what the choice did`);
    assert.equal(x.stored.reason, reason);
  }
  assert.ok(r.money.stored.wage > r.money.live.wage); assert.ok(r.learn.stored.xp > r.learn.live.xp); assert.ok(r.away.stored.cap > r.away.live.cap);
  await done();
});

test('signing on for the money says the day rate went up, with the figure the hand now has (#736, #879)', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });
    const h = G.state.hired, base = h.wage, text = chooseEvent(0);
    return { base, now: h.wage, text: String(text) };
  });
  assert.equal(r.now, r.base + 25, 'the day rate is 25 up');
  assert.ok(r.text.includes(`${r.now} a day now, 25 up on what you were offered`), r.text);
  await done();
});

test('Signing On says what the pay goes to: the hall\'s bond, the cheapest ship a hand saves toward, and the papers; the Port page keeps the count (#849)', async () => {
  const { ev, done } = await open({ debt: true });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' });
    const text = G.dialog.event.text; while (G.dialog) finishEvent();
    const st = G.state, h = hired(), port = () => goalLine(st, h);
    const before = port();
    h.deal = { price: 170000, day: st.day, until: st.day + 10, broker: false }; const offered = port();
    st.day += 11; const lapsed = port();
    return { text, before, offered, lapsed };
  });
  assert.match(r.text, /you owe it 30,000 cr for them: 30 percent of each run's pay goes to the hall/);
  assert.match(r.text, /the cheapest at a yard, a Dust Skiff, is 100,000 cr/);
  assert.match(r.text, /Your papers name you a member of the Arcology Compact/);
  assert.doesNotMatch(r.text, /Ore Runner/, 'the used ship is Tomas\'s to find');
  assert.equal(r.before, 'Owed to the hall: 30,000 cr. The cheapest ship at a yard, a Dust Skiff, is 100,000 cr, and you have 3,000 cr.');
  assert.match(r.offered, /The used Ore Runner is 170,000 cr/, 'named while she is offered');
  assert.match(r.lapsed, /Dust Skiff/, 'and not once she is gone');
  await done();
});
