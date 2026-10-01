'use strict';

// The main characters (cast.js): the Earth pair, how a hired hand and an owner meet them, how they grow, their scenes,
// and who leaves with you at a buy-in.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.tutorial = null; st.story.next = 1e9; st.flags.classicCombat = true; };
  window.crewOf = () => G.state.crew.map(person);
};

test('a hired hand on Earth finds the pair aboard, on posts that never double up', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
      start({ mode: 'hired', post });
      const crew = crewOf(), roles = crew.map(c => c.role).sort();
      out[post] = { roles, cast: crew.filter(c => c.cast).map(c => c.cast).sort(), mine: POSTS[post].role };
    }
    start({ mode: 'hired', post: 'gunner' });
    const ines = person('c:ines');
    out.ines = { skill: ines.skill, skills: ines.skills, captain: ines.captain, age: ines.age, ambition: !!ines.ambition, pilot: roleSkill('pilot'), role: ines.role };
    return out;
  });
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    assert.deepEqual(r[post].cast, ['ines', 'tomas'], `${post}: both come`);
    assert.equal(new Set(r[post].roles).size, 3, `${post}: three distinct roles`);
    assert.ok(!r[post].roles.includes(r[post].mine), `${post}: nobody on your post`);
  }
  assert.equal(r.ines.role, 'pilot'); assert.equal(r.ines.skill, 3); assert.deepEqual(r.ines.captain, { trade: 3, nerve: 4, thrift: 2 });
  assert.equal(r.ines.age, 34); assert.ok(r.ines.ambition);
  assert.equal(r.ines.pilot, 3, 'their skill is the crew\'s skill');
  await done();
});

test('each background has its own pair, and the pairs do not cross', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, pairs = { earth: ['ines', 'tomas'], mars: ['ruben', 'yelena'], belt: ['bexa', 'pax'] };
    for (const [bg, keys] of Object.entries(pairs)) {
      out[bg] = {};
      for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
        start({ background: bg, mode: 'hired', post });
        const crew = crewOf();
        out[bg][post] = { cast: crew.filter(c => c.cast).map(c => c.cast).sort(), roles: crew.map(c => c.role).sort(), mine: POSTS[post].role, keys: keys.slice().sort() };
      }
      // An owner meets the first of the pair on its day, then the second, and never the other backgrounds'.
      start({ background: bg }); G.state.crew = []; G.state.day = 6; out[bg].first = castDue();
    }
    const y = castPerson('yelena'), b = castPerson('bexa'), p = castPerson('pax');
    out.stats = { yelena: [y.role, y.captain.nerve, y.age, y.culture], bexa: [b.role, b.captain.thrift, b.age, b.culture], pax: [p.role, p.captain.nerve, p.age, p.culture] };
    return out;
  });
  for (const bg of ['earth', 'mars', 'belt']) {
    for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
      const x = r[bg][post];
      assert.deepEqual(x.cast, x.keys, `${bg}/${post}: its own pair`);
      assert.equal(new Set(x.roles).size, 3, `${bg}/${post}: three distinct roles`);
      assert.ok(!x.roles.includes(x.mine), `${bg}/${post}: nobody on your post`);
    }
  }
  assert.deepEqual([r.earth.first, r.mars.first, r.belt.first], ['ines', 'yelena', 'bexa'], 'each owner meets their own first');
  assert.deepEqual(r.stats, { yelena: ['gunner', 5, 29, 'mars'], bexa: ['pilot', 4, 41, 'belt'], pax: ['gunner', 2, 23, 'belt'] });
  await done();
});

test('every authored scene is complete: a title, text, two choices with results, and a day for the mid and late ones', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = [];
    for (const [key, d] of Object.entries(CAST)) {
      start({ background: d.culture, mode: 'hired', post: 'pilot' });
      castPerson(key);
      for (const [name, sc] of Object.entries(d.scenes)) {
        const bad = [];
        if (!sc.title || sc.text.length < 100) bad.push('text');
        if (sc.choices.length !== 2 || !sc.choices.every(c => c.label)) bad.push('choices');
        if (['mid1', 'mid2', 'late'].includes(name) && !(sc.days > 0)) bad.push('days');
        if (/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(sc.text + sc.choices.map(c => c.label).join(''))) bad.push('emoji');
        out.push({ key, name, bad });
      }
    }
    return out;
  });
  assert.deepEqual(r.filter(x => x.bad.length), []);
  assert.equal(r.length, 30, 'six characters, five scenes each');
  await done();
});

test('every choice of every scene runs and says what happened', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = [];
    for (const [key, d] of Object.entries(CAST)) {
      for (const [name, sc] of Object.entries(d.scenes)) {
        sc.choices.forEach((ch, i) => {
          start({ background: d.culture, mode: 'hired', post: 'pilot' });
          G.state.credits = 1000; castPerson(key);
          let res = null, err = null;
          try { res = ch.can && !ch.can() ? 'skipped' : ch.run(); } catch (e) { err = String(e); }
          out.push({ at: `${key}.${name}.${i}`, ok: err === null && typeof res === 'string' && res.length > 40, err });
        });
      }
    }
    return out;
  });
  assert.deepEqual(r.filter(x => !x.ok), []);
  assert.equal(r.length, 60, 'six characters, five scenes, two choices');
  await done();
});

test('an owner meets them at a port, in order, and a put-off meeting comes round again', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {};
    st.crew = [];
    out.day0 = castDue();
    st.day = 6; out.first = castDue();
    const meet = () => { const e = pickHappening('port', currentPlanet()); return e && e.title; };
    out.title = meet();
    // Put off: not offered again for a week, and the second does not jump the queue.
    const first = CAST.ines.scenes.meet.choices[1].run();
    out.putOff = castRec('ines').next - st.day; out.soon = castDue();
    st.day += 8; out.again = castDue();
    // Joins: a berth is taken, they are crew, and the second is due later.
    const text = CAST.ines.scenes.meet.choices[0].run();
    out.joined = st.crew.includes('c:ines'); out.opinion = person('c:ines').opinion; out.since = castRec('ines').since === st.day;
    st.day = 13; out.tomasNow = castDue(); st.day = 14; out.tomas = castDue();
    for (let i = 0; i < 3; i++) { const c = makeCrewCandidate(st.systemId); registerPerson(c); st.crew.push(c.id); } out.full = CAST.tomas.scenes.meet.choices[0].can();
    return out;
  });
  assert.equal(r.day0, null, 'not on the first day'); assert.equal(r.first, 'ines'); assert.equal(r.title, 'A Pilot Without a Ship');
  assert.equal(r.putOff, 8); assert.equal(r.soon, null); assert.equal(r.again, 'ines');
  assert.ok(r.joined); assert.equal(r.opinion, 2); assert.ok(r.since);
  assert.equal(r.tomasNow, null, 'the second waits for its day'); assert.equal(r.tomas, 'tomas');
  assert.equal(r.full, false, 'no berth, no offer to take');
  await done();
});

test('they grow by working their post, and the scenes come in order as days pass', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'engineer' });  // Tomas is left the comms post, at skill 1
    const st = G.state, tomas = person('c:tomas'), out = {};
    out.start = { role: tomas.role, skill: tomas.skill, xp: tomas.xp.slicer };
    for (let i = 0; i < 20; i++) Mods.emit('newDay');
    out.after = { skill: tomas.skill, xp: tomas.xp.slicer };
    // The scenes: the intro at once, then by days aboard.
    const seen = [];
    const next = key => { const n = castNext(key); if (n) { castRec(key).arc++; seen.push(n.name); } return n; };
    next('ines'); out.noMid = castNext('ines'); st.day += 10; next('ines'); st.day += 15; next('ines'); out.noLate = castNext('ines'); st.day += 20; next('ines');
    out.seen = seen; out.done = castNext('ines');
    return out;
  });
  assert.deepEqual(r.start, { role: 'slicer', skill: 1, xp: 10 });
  assert.equal(r.after.xp, 30); assert.equal(r.after.skill, 2, 'twenty days at the post is a level');
  assert.equal(r.noMid, null, 'a day in, no mid scene yet'); assert.equal(r.noLate, null);
  assert.deepEqual(r.seen, ['intro', 'mid1', 'mid2', 'late']); assert.equal(r.done, null);
  await done();
});

test('their scenes move opinion and experience, and what is yours is your savings, not the ship\'s', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const st = G.state, ines = person('c:ines'), tomas = person('c:tomas');
    const out = {};
    out.intro = castScene('ines', CAST.ines.scenes.intro).personal;
    CAST.ines.scenes.intro.choices[1].run(); out.ines = { opinion: ines.opinion, xp: ines.xp.pilot, mem: ines.memories.length };
    // The loan comes out of your savings, in a burn, with the ship's funds untouched.
    st.credits = 500; st.hired.fund = 4000; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.dialog = null; G.transit.event = null;
    openEvent(castScene('tomas', CAST.tomas.scenes.mid1));
    chooseEvent(0);
    out.loan = { credits: st.credits, fund: st.hired.fund, opinion: tomas.opinion, flag: !!castRec('tomas').flags.loan };
    return out;
  });
  assert.ok(r.intro); assert.equal(r.ines.opinion, 2); assert.equal(r.ines.mem, 1);
  assert.deepEqual(r.loan, { credits: 300, fund: 4000, opinion: 3, flag: true });
  await done();
});

test('a buy-in: both come if both think well of you, otherwise the one who does, otherwise a friend', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, ids = () => buyInCompanions().map(c => c.id).sort();
    start({ mode: 'hired', post: 'gunner' });
    const ines = person('c:ines'), tomas = person('c:tomas');
    ines.opinion = 3; tomas.opinion = 2; out.both = ids();
    tomas.opinion = 1; out.one = ids();
    ines.opinion = 0; tomas.opinion = 0;
    const friend = crewOf().find(c => !c.cast); friend.opinion = 2; out.friend = buyInCompanions().map(c => !!c.cast);
    friend.opinion = 0; out.nobody = ids();
    // The buy-in itself: they leave with you, and the last scene is played as they go.
    ines.opinion = 3; tomas.opinion = 3; castRec('ines').arc = 3; castRec('tomas').arc = 1;
    const st = G.state; st.credits = 99999; G.mode = 'landed';
    const planet = SYSTEMS[st.systemId].planets.find(p => p.services.includes('shipyard')); st.planet = planet.name;
    hired().confirm = 'courier'; Mods.act('buyInGo', 'courier');
    out.crew = st.crew.slice().sort(); out.owner = !hired(); out.scene = G.dialog && G.dialog.event.title; out.arc = castRec('ines').arc;
    return out;
  });
  assert.deepEqual(r.both, ['c:ines', 'c:tomas']); assert.deepEqual(r.one, ['c:ines']);
  assert.deepEqual(r.friend, [false], 'a generated friend, not one of the pair'); assert.deepEqual(r.nobody, []);
  assert.deepEqual(r.crew, ['c:ines', 'c:tomas']); assert.ok(r.owner);
  assert.equal(r.scene, 'Permission to Land', 'the last scene plays as they leave'); assert.equal(r.arc, 4);
  await done();
});
