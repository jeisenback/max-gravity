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
    const a = regs(); out.n = a.length; out.ids = a.map(x => x.p.id); out.news0 = a.map(x => x.p.gossip);
    st.day += 1; out.same = regs().map(x => x.p.id); out.news1 = regs().map(x => x.p.gossip);
    like(a[0].p, 1, 'The captain bought me a drink at the bar.');
    st.day += 5; const b = regs(); out.ids2 = b.map(x => x.p.id); out.news2 = b.map(x => x.p.gossip);
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

test('a regular who joins the crew does not have their bar gossip taken for a letter from home', async () => {
  const { ev, done } = await open({ scope: 'full' });
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state;
    regs(); st.day += 7; const a = regs();  // a week on, the regulars have fresh gossip
    const p = a[0].p; st.crew.push(p.id);
    const told = procedural().find(f => f.p.news);
    return { gossip: typeof p.gossip, told: !!told, news: p.news === undefined || p.news === null || typeof p.news === 'object' };
  });
  assert.equal(r.told, false, 'their gossip is not a letter the crew has to be told about');
  assert.ok(r.news, 'p.news is only ever a letter from home');
  assert.equal(r.gossip, 'string', 'the bar gossip is kept');
  await done();
});

test('a regular\'s life moves a beat a visit when you are back a week or more later, and one that ends in leaving leaves the bar to someone new', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {}, planet = currentPlanet();
    const a = regs(); const [p, q] = a.map(x => x.p); out.arcs = a.map(x => x.p.arc && x.p.arc.key);
    p.arc = { key: 'berth', beat: 0 }; q.arc = { key: 'flat', beat: 0 };  // one who leaves, one who stays
    st.day += 5; regs(); out.soon = [p.arc.beat, q.arc.beat, p.gossip === regularArc('berth')[0]];  // news after four days, no beat before seven
    st.day += 7; regs(); out.beat1 = [p.arc.beat, p.gossip, q.gossip];
    st.day += 7; regs(); st.day += 7; regs(); out.beat3 = [p.arc.beat, p.gossip];
    st.day += 7; const b = regs(); out.after = { ids: b.map(x => x.p.id), gone: !st.bars[planet.name].ids.includes(p.id), left: p.regular === null && p.location === null, stayed: st.bars[planet.name].ids.includes(q.id), qDone: !!q.arc.done, qNews: typeof q.gossip === 'string' && !regularArc('flat').includes(q.gossip), newArc: b.find(x => x.p.id !== q.id).p.arc.key };
    return { ...out, berth: regularArc('berth'), flat: regularArc('flat') };
  });
  assert.ok(r.arcs.every(k => typeof k === 'string'), 'new regulars are given a life');
  assert.deepEqual(r.soon, [0, 0, false]);
  assert.deepEqual(r.beat1, [1, r.berth[0], r.flat[0]]);
  assert.deepEqual(r.beat3, [3, r.berth[2]]);
  assert.equal(r.after.ids.length, 2); assert.ok(r.after.gone && r.after.left, 'the one whose life ended in leaving is gone'); assert.ok(r.after.stayed && r.after.qDone && r.after.qNews, 'the one who stays is back on the news');
  assert.ok(typeof r.after.newArc === 'string', 'the new regular has a life of their own');
  await done();
});

test('a port with a written pool seats its written regulars first, in the run\'s own order, with their own arcs; one who goes is said in their own words, and the next written one takes the stool (#1242)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, planet = currentPlanet(), out = {};
    const names = () => regs().map(x => `${x.p.first} ${x.p.last}`);
    out.earth = names(); out.order = writtenOrder('Earth', `${captain().name} ${(st.castPair || []).join(' ')}`);
    out.other = writtenOrder('Earth', 'Somebody Else');
    // move the lives a week at a time until a written regular who goes has gone
    const rec = st.bars[planet.name]; out.beats = {}; out.notes = [];
    for (let w = 0; w < 6; w++) {
      st.visited = { [planet.name]: { day: st.day, snap: revisitSnap(st, planet) } };
      st.day += 7; const now = regs(); now.forEach(x => { (out.beats[x.p.first] = out.beats[x.p.first] || []).push(x.p.gossip); });
      const line = revisitLine(st, planet); if (line) out.notes.push(line);
    }
    out.seated = rec.written.slice(); out.final = names();
    return out;
  });
  const pool = ['Biodun Okafor-Lane', 'Chidinma Eze-Walters', 'Segun Adeyinka', 'Grace Obi-Hartmann'];
  assert.equal(r.earth.length, 2); assert.ok(r.earth.every(n => pool.includes(n)), `Lagos Ring's written regulars: ${r.earth}`);
  assert.deepEqual(r.earth.map(n => n.split(' ')[0].toLowerCase()), r.order.slice(0, 2), 'the first two of the run\'s order');
  assert.deepEqual([...r.order].sort(), [...r.other].sort()); assert.notDeepEqual(r.order, r.other, 'another run deals them in another order');
  const told = Object.values(r.beats).flat().filter(Boolean).join(' ');
  assert.ok(/hiring board|deposit for a tug lease|first contract|tender papers/.test(told), 'their own arcs as their news');
  if (r.seated.includes('biodun') && !r.final.includes('Biodun Okafor-Lane')) assert.ok(r.notes.some(n => /keeper says he went up on the Thursday spaceplane/.test(n)), `Biodun's own words for going: ${r.notes}`);
  assert.ok(r.seated.length >= 2 && r.seated.length <= 4);
  await done();
});

test('written regulars at Ceres Station, Pallas Refinery, the Hollows, Eros Old Town, Luna and Mars, and a port with no pool keeps generated ones (#1242)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {};
    uatLand('Ceres Station'); G.dialog = null; out.ceres = regs().map(x => x.p.first);
    for (const port of ['Pallas Refinery', 'The Hollows', 'Eros Old Town', 'Luna', 'Mars']) { uatLand(port); G.dialog = null; out[port] = regs().map(x => x.p.first); }
    uatLand('Ironheart'); G.dialog = null; out.ironheart = regs().map(x => x.p.arc && x.p.arc.key);
    return out;
  });
  assert.equal(r.ceres.length, 2); assert.ok(r.ceres.every(n => ['Dunya', 'Kofi', 'Ilka', 'Pell', 'Nadia'].includes(n)), `${r.ceres}`);
  const pools = { 'Pallas Refinery': ['Teodor', 'Amara', 'Jem', 'Sister', 'Cass'], 'The Hollows': ['Lio', 'Ezra', 'Pim', 'Tamsin'], 'Eros Old Town': ['Hesper', 'Ottilie', 'Ray', 'Benedetta'], Luna: ['Calla', 'Viktor', 'Sunny', 'Orla'], Mars: ['Anika', 'Grigor', 'Lena', 'Teo', 'Halima'] };
  for (const [port, names] of Object.entries(pools)) { assert.equal(r[port].length, 2); assert.ok(r[port].every(n => names.includes(n)), `${port}: ${r[port]}`); }
  assert.ok(r.ironheart.every(k => k && !k.includes('|')), 'generated, with the arc library');
  await done();
});

test('a written regular who goes leaves at the visit after their last beat, the return line says it in their words, and the next of the pool sits (#1242)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, planet = currentPlanet(), rec = (regs(), st.bars[planet.name]);
    const p = st.people[rec.ids[0]];
    Object.assign(p, { first: 'Biodun', last: 'Okafor-Lane', arc: { key: 'Earth|biodun', beat: 2 } });
    st.visited = { [planet.name]: { day: st.day, snap: revisitSnap(st, planet) } };
    st.day += 7; const now = regs().map(x => x.p);
    return { gone: !now.includes(p) && p.regular === null, line: revisitLine(st, planet), seated: rec.written.slice(), firsts: now.map(x => x.first) };
  });
  assert.equal(r.gone, true, 'gone from the bar');
  assert.match(r.line, /Biodun's stool is someone else's, and the keeper says he went up on the Thursday spaceplane/);
  assert.doesNotMatch(r.line, /Biodun is gone from the bar/);
  assert.equal(r.seated.length, 3, 'a third of the pool sits');
  assert.ok(r.firsts.every(n => ['Biodun', 'Chidinma', 'Segun', 'Grace'].includes(n) && n !== 'Biodun'));
  await done();
});
