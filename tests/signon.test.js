'use strict';

// The hired hand's opening scene (signon.js): a story for each background, the post you chose, the people you work
// beside, and the one choice about why you signed on.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('every background and post opens with Signing On, naming the ship, the captain, the pair and the post', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = [], marks = { earth: 'Earth is crowded', mars: 'domes of Tharsis', belt: 'Ceres spin' }, lines = { pilot: 'the helm', gunner: 'the guns', engineer: 'the plant', comms: 'the bands' };
    for (const bg of ['earth', 'mars', 'belt']) {
      for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
        startGame({ slot: 1, background: bg, captain: 'Sam Rowe', mode: 'hired', post });
        const e = G.dialog && G.dialog.event, st = G.state, cap = st.people[st.hired.captain];
        const pair = st.crew.map(person).filter(c => c.cast).map(c => fullName(c));
        const text = e ? e.text : '';
        out.push({
          at: `${bg}/${post}`, title: e && e.title, choices: e && e.choices.map(c => c.label),
          ship: text.includes(shipTitle().replace(/^./, ch => ch.toUpperCase())), cap: text.includes(`Captain ${cap.first} ${cap.last}`), pair: pair.length === 2 && pair.every(n => text.includes(n)),
          bg: text.includes(marks[bg]), post: text.includes(lines[post]), savings: text.includes('300 credits'), paragraphs: text.split('</p><p>').length,
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
    assert.ok(x.ship && x.cap && x.pair && x.bg && x.post && x.savings, `${x.at}: names the ship, captain, pair, background, post and savings`);
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
      startGame({ slot: 1, background: 'mars', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' });
      const st = G.state, h = st.hired, cap = st.people[h.captain], pair = st.crew.map(person).filter(c => c.cast);
      const before = { share: h.share, xp: skillXp('gunner'), cap: cap.opinion, pair: pair.map(c => c.opinion) };
      const text = chooseEvent(i);
      out[reason] = { text: text.length > 40, reason: h.reason, share: h.share, xp: skillXp('gunner') - before.xp, cap: cap.opinion - before.cap, pair: pair.map((c, k) => c.opinion - before.pair[k]) };
      out.base = before.share;
    }
    return out;
  });
  assert.equal(r.base, 0.1);
  assert.deepEqual(r.money, { text: true, reason: 'money', share: 0.12, xp: 0, cap: 0, pair: [0, 0] });
  assert.deepEqual(r.learn, { text: true, reason: 'learn', share: 0.1, xp: 8, cap: 0, pair: [0, 0] });
  assert.deepEqual(r.away, { text: true, reason: 'away', share: 0.1, xp: 0, cap: 1, pair: [1, 1] });
  await done();
});

test('it works with any captain, and an owner does not get it', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'belt', captain: 'Sam Rowe', mode: 'hired', post: 'comms' }); while (G.dialog) finishEvent();
    const st = G.state, cap = st.people[st.hired.captain], bad = [];
    for (const t of Object.keys(TRAITS)) { cap.traits[0] = t; const e = signOnEvent(); if (/undefined|NaN/.test(e.text) || !e.text.includes(TRAITS[t].adj)) bad.push(t); }
    startGame({ slot: 1, background: 'belt', captain: 'Sam Rowe' });
    return { bad, owner: !!(G.dialog && G.dialog.event && G.dialog.event.title === 'Signing On') };
  });
  assert.deepEqual(r.bad, []);
  assert.equal(r.owner, false);
  await done();
});
