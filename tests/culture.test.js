'use strict';

// The yearly culture calendar: leagues, shows, books and one-off broadcasts by game
// date, what downtime offers, tastes, and saves from before the calendar.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('authored content, and a full year runs in order', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = { shows: SHOWS.length, books: BOOKS.length, cultures: LEAGUES.map(l => l.culture).sort(), broadcasts: BROADCASTS.length };
    const phases = {}, showDays = {}, books = new Set();
    let busiest = 0, empty = 0;
    for (let day = 1; day <= 365; day++) {
      for (const l of LEAGUES) { const p = leaguePhase(l, day), a = phases[l.id] = phases[l.id] || []; if (a[a.length - 1] !== p) a.push(p); }
      const on = airing(day);
      busiest = Math.max(busiest, on.length); if (!on.length) empty++;
      for (const s of on) { const a = showDays[s.id] = showDays[s.id] || []; a.push([day, s.ep, s.premiere, s.finale]); }
      for (const b of newBooks(day)) books.add(b.title);
    }
    out.phases = phases; out.busiest = busiest; out.empty = empty; out.books = books.size;
    // Each show runs its episodes a week apiece (a show may straddle the window's ends), premiere on the first, finale on the last.
    out.showsOrdered = SHOWS.every(s => {
      const d = showDays[s.id]; if (!d || d.length !== s.eps * 7) return false;
      const n = {}; for (const x of d) n[x[1]] = (n[x[1]] || 0) + 1;
      return Object.keys(n).length === s.eps && Object.values(n).every(v => v === 7) && d.every(x => x[2] === (x[1] === 1) && x[3] === (x[1] === s.eps));
    });
    // Leagues play on through the year and crown a champion each.
    const champs = [], crowned = crown;
    crown = (l, s, t) => { champs.push(l.id); crowned(l, s, t); };
    const st = G.state; st.day = 1;
    for (let i = 0; i < 400; i++) { st.day++; cultureDay(); }
    crown = crowned;
    out.champs = [...new Set(champs)].sort();
    out.played = Object.values(culture().lg).every(s => Object.values(s.table).some(n => n > 0));
    return out;
  });
  assert.equal(r.shows, 12); assert.equal(r.books, 16); assert.equal(r.broadcasts, 8);
  assert.deepEqual(r.cultures, ['belt', 'earth', 'mars']);
  const order = ['preseason', 'regular', 'playoffs', 'final', 'off-season'];
  for (const [id, seq] of Object.entries(r.phases)) {
    assert.ok(order.every(p => seq.includes(p)), `${id} goes through every phase: ${seq}`);
    assert.ok(seq.every((p, i) => i === 0 || order.indexOf(p) === (order.indexOf(seq[i - 1]) + 1) % order.length), `${id} phases in order: ${seq}`);
  }
  assert.ok(r.showsOrdered, 'every show premieres, airs weekly and finishes');
  assert.ok(r.busiest >= 3, `several shows overlap (${r.busiest})`);
  assert.equal(r.empty, 0, 'something is always on');
  assert.equal(r.books, 16, 'books come out a few at a time, all year');
  assert.deepEqual(r.champs, ['dome', 'lunar', 'ringball'], 'every league crowns a champion');
  assert.ok(r.played, 'leagues play matches');
  await done();
});

test('one-off broadcasts fall on their dates', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const hits = BROADCASTS.map(b => {
      const days = []; for (let day = 1; day <= 365; day++) if (broadcastsOn(day).includes(b)) days.push(day);
      return { title: b.title, n: days.length, ok: days.length === 1 && calOf(days[0]).m === b.m && calOf(days[0]).d === b.d };
    });
    return hits;
  });
  for (const h of r) { assert.equal(h.n, 1, `${h.title} airs once a year`); assert.ok(h.ok, `${h.title} is on its date`); }
  await done();
});

test('downtime offers what is on, and tastes decide who enjoys it', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state; st.tutorial = null;
    st.crew.push('kit');
    takeOff(); st.dest = 'mars'; G.player.x = 6000; tryBurn(); enterTransit();
    const out = {};
    // Mid-October, 9 Oct: the Dome Day Concert is on, with shows and a league.
    st.day = Math.round((Date.UTC(2214, 9, 9) - START_DATE) / 864e5) + 1;
    const menu = downtimeEvent(true).choices.map(c => c.label), now = onNow();
    out.now = now.map(a => a.label); out.menu = menu;
    out.airing = airing(cultureToday()).map(s => s.title);
    out.books = newBooks(cultureToday()).map(b => b.title);
    // Another day with no one-off: shows, a league and a book.
    st.day += 3; out.plain = onNow().map(a => a.label); out.plainAiring = airing(cultureToday()).map(s => s.title);
    // Tastes: two crew who share a genre enjoy a show of it more than a show they do not like.
    const mk = () => { const c = makeCrewCandidate('ceres'); registerPerson(c); st.crew.push(c.id); return c; };
    st.crew = []; const pool = []; while (pool.length < 40) pool.push(mk());
    st.crew = [];
    const byGenre = {}; for (const c of pool) (byGenre[tastes({ id: c.id, p: c }).genre] = byGenre[tastes({ id: c.id, p: c }).genre] || []).push(c);
    const [g, [a, b]] = Object.entries(byGenre).find(([, v]) => v.length >= 2);
    const other = SHOWS.find(s => s.genre !== g), fav = SHOWS.find(s => s.genre === g);
    const delta = show => { st.crew = [a.id, b.id]; st.bonds = {}; a.opinion = b.opinion = 0; watchShow({ ...show, ep: 1, premiere: false, finale: false }).run(); return { bond: bond({ id: a.id }, { id: b.id }), like: a.opinion }; };
    out.fan = delta(fav); out.cold = delta(other);
    return out;
  });
  assert.equal(r.now.length, 3, `three things on: ${r.now}`);
  assert.ok(r.now[0].includes('Dome Day Concert'), 'the one-off comes first');
  assert.ok(r.now.some(l => r.airing.some(t => l.includes(`"${t}"`))), 'a real show title is offered');
  assert.ok(r.menu.length >= 5 && r.menu.includes('Share a meal') && r.menu.includes('Not now'), 'the existing items are still there');
  for (const l of r.now) assert.ok(r.menu.includes(l), `${l} is in the menu`);
  assert.equal(r.plain.length, 3);
  assert.ok(r.plain.some(l => l.startsWith('Watch "')) && r.plain.some(l => l.startsWith('Stream the')) && r.plain.some(l => l.startsWith('Pass around "')), `a show, a match and a book: ${r.plain}`);
  assert.ok(r.fan.bond > r.cold.bond, `fans bond more over their genre (${r.fan.bond} vs ${r.cold.bond})`);
  assert.ok(r.fan.like > r.cold.like, 'fans like the captain more after');
  await done();
});

test('a save from before the calendar loads', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state; st.crew.push('kit');
    st.culture = { season: 3, start: st.day - 10, episode: 4, vid: { title: 'Old Vid', genre: 'noir' }, book: { title: 'Old Book', genre: 'war', author: 'A B' }, song: { title: 'Old Song', band: 'Low Orbit' }, stars: ['A', 'B'], table: { 'Ceres Breakers': 2 }, last: null, nextMatch: st.day };
    const out = { v: culture().v };
    cultureDay();
    out.feed = !!feedLine(); out.social = socialLines().length > 0; out.headlines = feedHeadlines().length; out.on = onNow().length;
    out.bar = typeof roomLines === 'function' ? roomLines(currentPlanet()).length > 0 : true;
    return out;
  });
  assert.equal(r.v, 2);
  assert.ok(r.feed && r.social && r.bar);
  assert.ok(r.headlines >= 5);
  assert.equal(r.on, 3);
  await done();
});
