'use strict';

// The main characters at the bar (castbar.js): they turn up when they have a scene due, the talk is the scene, and each
// has two.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, goTo } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (bg = 'earth', post = 'gunner') => { startGame({ slot: 1, background: bg, captain: 'Sam Rowe', mode: 'hired', post }); while (G.dialog) finishEvent(); const st = G.state; st.tutorial = null; st.story.next = 1e9; st.flags.classicCombat = true; };
  window.patrons = () => { fillBar(currentPlanet()); return G.patrons.filter(x => x.cast).map(x => x.cast).sort(); };
};

test('they turn up at the bar when a scene is due, and not before, and not once they have had them', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {};
    out.day0 = patrons();
    st.day += 4; out.day4 = patrons();
    st.day += 1; out.day5 = patrons();
    // The first talk is the scene, and takes them out of the room.
    fillBar(currentPlanet()); const pat = G.patrons.find(x => x.cast === 'ines'), ev1 = talkEvent(pat);
    out.title1 = ev1.title; out.personal = ev1.personal; out.left = G.patrons.filter(x => x.cast).map(x => x.cast); out.seen1 = castRec('ines').bar;
    out.stillDay5 = patrons();   // Tomas is still due, Ines's next is a month away
    st.day += 24; out.day29 = patrons();
    st.day += 1; out.day30 = patrons();
    // Have them all (Tomas still has two to come): nobody left.
    for (let i = 0; i < 2; i++) { fillBar(currentPlanet()); for (const x of G.patrons.filter(y => y.cast)) talkEvent(x); }
    out.done = patrons(); out.rec = [castRec('ines').bar, castRec('tomas').bar];
    return out;
  });
  assert.deepEqual(r.day0, []); assert.deepEqual(r.day4, []); assert.deepEqual(r.day5, ['ines', 'tomas']);
  assert.equal(r.title1, 'Third Approach'); assert.equal(r.personal, true); assert.deepEqual(r.left, ['tomas']); assert.equal(r.seen1, 1);
  assert.deepEqual(r.stillDay5, ['tomas']);
  assert.deepEqual(r.day29, ['tomas'], 'Ines\'s second is a month in, Tomas has not had his first'); assert.deepEqual(r.day30, ['ines', 'tomas']);
  assert.deepEqual(r.done, []); assert.deepEqual(r.rec, [2, 2]);
  await done();
});

test('only the pair aboard turn up, in every background', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const [bg, pair] of Object.entries({ earth: ['ines', 'tomas'], mars: ['ruben', 'yelena'], belt: ['bexa', 'pax'] })) {
      start(bg); G.state.day += 10; out[bg] = { got: patrons(), pair: pair.slice().sort() };
    }
    // An owner who has not met them yet has nobody at the bar; once aboard, they are.
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent(); const st = G.state; st.tutorial = null; st.day += 10;
    out.ownerBefore = patrons(); const p = castPerson('ines'); st.crew.push(p.id); castRec('ines').since = st.day - 10; out.ownerAfter = patrons();
    return out;
  });
  for (const bg of ['earth', 'mars', 'belt']) assert.deepEqual(r[bg].got, r[bg].pair, bg);
  assert.deepEqual(r.ownerBefore, []); assert.deepEqual(r.ownerAfter, ['ines']);
  await done();
});

test('all twelve scenes are complete, every choice runs, and the effects are the kind they say', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(() => {
    const out = [];
    for (const [key, scenes] of Object.entries(CAST_BAR)) {
      scenes.forEach((sc, n) => sc.choices.forEach((ch, i) => {
        start(CAST[key].culture); G.state.credits = 1000; castPerson(key);
        const before = castPerson(key).opinion; let res = null, err = null;
        try { res = ch.can && !ch.can() ? 'skipped' : ch.run(); } catch (e) { err = String(e); }
        const bad = [];
        if (!sc.title || sc.text.length < 150) bad.push('text'); if (sc.choices.length !== 2) bad.push('choices');
        if (!(sc.days > 0)) bad.push('days'); if (/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(sc.text + res)) bad.push('emoji');
        if (err || typeof res !== 'string' || res.length < 100) bad.push('result');
        if (castPerson(key).opinion === before) bad.push('no change in opinion');
        out.push({ at: `${key}.${n}.${i}`, bad, err });
      }));
    }
    return out;
  });
  assert.equal(r.length, 24, 'six characters, two scenes, two choices');
  assert.deepEqual(r.filter(x => x.bad.length), []);
  await done();
});

test('the bar shows them as aboard with you, the talk opens their scene, and a round for the house leaves them out', async () => {
  const { page, ev, done } = await open({ shell: true, viewport: { width: 390, height: 844 }, mobile: true });
  await ev(helpers);
  await ev(() => { start(); G.state.day += 6; G.state.credits = 1000; fillBar(currentPlanet()); UI.render(); });
  await goTo(page, 'port');
  await page.click('[data-action=tab][data-arg=bar]');
  assert.match(await page.innerText('#panel'), /Aboard with you, and at the bar tonight/);
  const round = await ev(() => 25 * (4 + G.patrons.filter(x => !x.cast).length));
  assert.match(await page.innerText('#panel [data-action=barRound]'), new RegExp(`${round} cr`), 'the round is priced for the room, not the crew');
  const who = await ev(() => G.patrons.findIndex(x => x.cast === 'ines'));
  await page.click(`#panel [data-action=barTalk][data-arg="${who}"]`);
  assert.equal(await ev(() => G.dialog.event.title), 'Third Approach');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll at phone width');
  await done();
});

test('their money is your own savings, not the ship\'s', async () => {
  const { ev, done } = await open({ shell: true });
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state; st.credits = 500; st.hired.fund = 4000; st.day += 6;
    const e = CAST_BAR.tomas[0]; const res = e.choices[0].run();
    return { credits: st.credits, fund: st.hired.fund, opinion: person('c:tomas').opinion };
  });
  assert.deepEqual(r, { credits: 460, fund: 4000, opinion: 2 });
  await done();
});
