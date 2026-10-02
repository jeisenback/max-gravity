'use strict';

// Regulars and match night (regulars.js): the same two at a bar, with news that changes between visits and a memory
// of you, and a match shown only when a live league has played.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'owner' }); while (G.dialog) finishEvent(); const st = G.state; st.tutorial = null; st.story.next = 1e9; st.flags.classicCombat = true; };
  window.regs = () => { fillBar(currentPlanet()); return G.patrons.filter(x => x.regular); };
};

test('two regulars stay the same, their news changes after a few days, and they remember you', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {};
    const a = regs(); out.n = a.length; out.ids = a.map(x => x.p.id); out.news0 = a.map(x => x.p.news);
    st.day += 1; out.same = regs().map(x => x.p.id); out.news1 = regs().map(x => x.p.news);
    like(a[0].p, 1, 'The captain bought me a drink at the bar.');
    st.day += 5; const b = regs(); out.ids2 = b.map(x => x.p.id); out.news2 = b.map(x => x.p.news);
    const t = talkEvent(b[0]); out.text = t.text; out.html = barHtml();
    return out;
  });
  assert.equal(r.n, 2); assert.deepEqual(r.news0, [undefined, undefined]); assert.deepEqual(r.same, r.ids); assert.deepEqual(r.news1, [undefined, undefined]);
  assert.deepEqual(r.ids2, r.ids);
  assert.ok(r.news2.every(n => typeof n === 'string' && n.length > 10), 'news after a few days');
  assert.match(r.text, /Since you were last here/); assert.match(r.text, /bought me a drink/);
  assert.match(r.html, /A regular here/);
  await done();
});

test('match night shows only when a live league has played in the last day', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {}, l = LEAGUES[2];
    // Put the day inside the Lunar Cup's regular season, with no match played yet.
    while (leaguePhase(l, st.day) !== 'regular') st.day++;
    culture(); delete st.culture.lg[l.id]; season(l).last = null;
    out.none = matchNight();
    playMatch(l); out.on = matchNight() && matchNight().text; out.html = barHtml();
    st.day += 3; out.old = matchNight();
    // Off-season: even a recent result is not shown.
    st.day = 0; while (leaguePhase(l, st.day) !== 'off-season') st.day++;
    st.culture.lg[l.id] = { key: -1, table: {}, next: st.day, champ: null, last: { a: 'x', b: 'y', sa: 1, sb: 0, winner: 'x', loser: 'y', day: st.day } };
    out.off = matchNight();
    return out;
  });
  assert.equal(r.none, null); assert.match(r.on, /^Match night\./); assert.match(r.html, /Match night/); assert.equal(r.old, null); assert.equal(r.off, null);
  await done();
});
