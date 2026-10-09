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
  // The pivot scenes count what is aboard (a medic is a point), so these tests start with the four posts only, not the chapter's wider crew.
  window.POST_ROLES = ['pilot', 'gunner', 'engineer', 'slicer'];
  window.postsOnly = () => { const st = G.state; st.crew = st.crew.filter(id => ['pilot', 'gunner', 'engineer', 'slicer'].includes(person(id).role)); };
  window.marsHired = () => { start({ background: 'mars', mode: 'hired', post: 'pilot' }); postsOnly(); };
  // A third joined core character, which lifts the two-survivor floor.
  window.addThird = () => { castRec('ines').since = G.state.day; };
  // An owner at Earth with both of the pair aboard and a company ship docked in port with a hired captain.
  window.ownerSetup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9; st.crew = []; st.credits = 200000;
    for (const key of ['ines', 'tomas']) { const p = castPerson(key); p.role = CAST[key].role; p.skill = p.skills[p.role]; st.crew.push(p.id); castRec(key).since = st.day; }
    buyCompanyShip('lightfreighter');
    G.mode = 'landed';
    return fleet()[0];
  };
};

test('a hired hand on Earth finds the pair aboard, on posts that never double up', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
      start({ mode: 'hired', post });
      const crew = crewOf(), roles = crew.map(c => c.role).filter(r => POST_ROLES.includes(r)).sort();
      out[post] = { roles, cast: crew.filter(c => c.cast && !CAST[c.cast].xo).map(c => c.cast).sort(), mine: POSTS[post].role };
    }
    start({ mode: 'hired', post: 'gunner' });
    const ines = person('c:ines');
    out.ines = { skill: ines.skill, skills: ines.skills, captain: ines.captain, age: ines.age, ambition: !!ines.ambition, pilot: roleSkill('pilot'), role: ines.role };
    return out;
  });
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    assert.deepEqual(r[post].cast, ['ines', 'tomas'], `${post}: both come`);
    assert.equal(new Set(r[post].roles).size, 3, `${post}: the three other posts held`);
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
        out[bg][post] = { cast: crew.filter(c => c.cast && !CAST[c.cast].xo).map(c => c.cast).sort(), roles: crew.map(c => c.role).filter(r => POST_ROLES.includes(r)).sort(), mine: POSTS[post].role, keys: keys.slice().sort() };
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
      assert.equal(new Set(x.roles).size, 3, `${bg}/${post}: the three other posts held`);
      assert.ok(!x.roles.includes(x.mine), `${bg}/${post}: nobody on your post`);
    }
  }
  assert.deepEqual([r.earth.first, r.mars.first, r.belt.first], ['ines', 'yelena', 'bexa'], 'each owner meets their own first');
  assert.deepEqual(r.stats, { yelena: ['gunner', 5, 29, 'mars'], bexa: ['pilot', 4, 41, 'belt'], pax: ['gunner', 2, 23, 'belt'] });
  await done();
});

test('every authored scene is complete: a title, text, two choices (and a gated one where a scene has it) with results, and a day for the mid and late ones', async () => {
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
        if (sc.choices.length !== (name === 'pivot' ? 3 : 2 + sc.choices.filter(c => c.opinion).length) || !sc.choices.every(c => c.label)) bad.push('choices');  // a choice that needs someone's regard (#345) is one more
        if (['mid1', 'mid2', 'late', 'pivot'].includes(name) && !(sc.days > 0)) bad.push('days');
        if (/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(sc.text + sc.choices.map(c => c.label).join(''))) bad.push('emoji');
        out.push({ key, name, bad });
      }
    }
    return out;
  });
  assert.deepEqual(r.filter(x => x.bad.length), []);
  assert.equal(r.length, 56, 'six characters, five scenes each, the pivots of all six main characters, and the first officers\' five each');
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
  assert.equal(r.length, 124, 'six characters, five scenes, two choices, and the pivots\' three; and the first officers\' five scenes each; and the two gated choices of Ines and Tomas');
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
    out.steps = SKILL_STEPS;
    for (let i = 0; i < SKILL_STEPS[2] - SKILL_STEPS[1]; i++) Mods.emit('newDay');  // a day is a point, so the second level is this many days on
    out.after = { skill: tomas.skill, xp: tomas.xp.slicer };
    // The scenes: the intro at once, then by days aboard.
    const seen = [];
    const next = key => { const n = castNext(key); if (n) { castRec(key).arc++; seen.push(n.name); } return n; };
    next('ines'); out.noMid = castNext('ines'); st.day += 10; next('ines'); st.day += 15; next('ines'); out.noLate = castNext('ines'); st.day += 20; next('ines');
    out.seen = seen; out.done = castNext('ines');
    return out;
  });
  assert.deepEqual(r.start, { role: 'slicer', skill: 1, xp: r.steps[1] });
  assert.equal(r.after.xp, r.steps[2]); assert.equal(r.after.skill, 2, 'a stretch of days at the post is a level');
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

// ---------- life and loss (fate.js) ----------

test('a death with only the pair becomes a mark', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired();
    const st = G.state, y = person('c:yelena'), out = {};
    out.result = castFate('yelena', 'die', 'Cause.', 'Hand ruined.');
    out.dead = castDead('yelena'); out.marks = castRec('yelena').marks; out.day = st.day;
    out.skills = [y.skills.gunner, y.skill]; out.memorial = st.memorial || [];
    castXp('yelena', 'gunner', 1); out.afterXp = y.skills.gunner;
    return out;
  });
  assert.equal(r.result, 'mark'); assert.equal(r.dead, false);
  assert.deepEqual(r.marks, [{ text: 'Hand ruined.', day: r.day }]);
  assert.deepEqual(r.skills, [2, 2]); assert.deepEqual(r.memorial, []);
  assert.equal(r.afterXp, 2, 'the next day of experience does not restore the lost point');
  await done();
});

test('a death with a third core character kills, once', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired(); addThird();
    const st = G.state, out = {};
    st.injured = { 'c:yelena': true };
    out.result = castFate('yelena', 'die', 'Cause.', 'x');
    out.status = castRec('yelena').status; out.inCrew = st.crew.includes('c:yelena'); out.injured = st.injured['c:yelena'];
    out.memorial = st.memorial; out.expect = [{ key: 'yelena', day: st.day, place: system().name, cause: 'Cause.' }];
    out.again = castFate('yelena', 'die', 'Again.', 'x'); out.count = st.memorial.length; out.kept = !!st.people['c:yelena'];
    return out;
  });
  assert.equal(r.result, 'die'); assert.equal(r.status, 'dead'); assert.equal(r.inCrew, false); assert.equal(r.injured, undefined);
  assert.deepEqual(r.memorial, r.expect);
  assert.equal(r.again, 'die'); assert.equal(r.count, 1); assert.ok(r.kept, 'the person record stays');
  await done();
});

test('a mark never takes a skill below zero', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired();
    for (let i = 0; i < 4; i++) castFate('yelena', 'mark', 'x', 'x');
    return { gunner: person('c:yelena').skills.gunner, marks: castRec('yelena').marks.length };
  });
  assert.deepEqual(r, { gunner: 0, marks: 4 });
  await done();
});

test('only core characters who have joined count as living', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { marsHired(); return castLiving().sort(); });
  assert.deepEqual(r, ['ruben', 'yelena']);
  await done();
});

test('a captained company ship reverts when its captain dies', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const ship = ownerSetup();
    castRec('yelena').since = G.state.day;
    postCaptain(0, 'ines');
    const out = { posted: !!castCaptain(ship) };
    out.result = castFate('ines', 'die', 'x', 'x');
    out.captain = !!castCaptain(fleet()[0]); out.pid = fleet()[0].captain.pid;
    return out;
  });
  assert.ok(r.posted); assert.equal(r.result, 'die'); assert.equal(r.captain, false); assert.notEqual(r.pid, 'c:ines');
  await done();
});

test('an old save without the new fields behaves as alive', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired();
    delete castRec('yelena').status; delete castRec('yelena').marks; delete G.state.memorial;
    return { dead: castDead('yelena'), living: castLiving().length, live: castFate('yelena', 'live', 'x', 'x') };
  });
  assert.deepEqual(r, { dead: false, living: 2, live: 'live' });
  await done();
});

test('a dead character is never offered a meeting, and the next one is not stuck behind them', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state, out = {};
    st.crew = []; castRec('ines').status = 'dead';
    st.day = 6; out.early = castDue();
    st.day = 14; out.later = castDue();
    return out;
  });
  assert.equal(r.early, null, 'Ines is not offered, and Tomas waits for his own day');
  assert.equal(r.later, 'tomas');
  await done();
});

test('a dead character is not returned to the crew', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired(); addThird();
    castFate('yelena', 'die', 'x', 'x');
    castReturn(person('c:yelena'));
    return G.state.crew.includes('c:yelena');
  });
  assert.equal(r, false);
  await done();
});

test('a lost ship with only the pair aboard spares both', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired();
    succeed('died');
    const st = G.state, out = {};
    for (const key of ['yelena', 'ruben']) out[key] = { dead: castDead(key), marks: (castRec(key).marks || []).map(m => m.text), crew: st.crew.includes(`c:${key}`), person: !!st.people[`c:${key}`] };
    out.memorial = st.memorial || [];
    return out;
  });
  for (const key of ['yelena', 'ruben']) assert.deepEqual(r[key], { dead: false, marks: ['Pulled from the wreck.'], crew: true, person: true }, key);
  assert.deepEqual(r.memorial, []);
  await done();
});

test('a lost ship with three core characters aboard kills at most one', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired(); castJoin('ines', '');
    succeed('died');
    const st = G.state, keys = ['yelena', 'ruben', 'ines'];
    return { dead: keys.filter(castDead), marked: keys.filter(k => !castDead(k) && (castRec(k).marks || []).length === 1), memorial: st.memorial };
  });
  assert.equal(r.dead.length, 1); assert.equal(r.marked.length, 2);
  assert.equal(r.memorial.length, 1); assert.ok(r.memorial[0].cause.startsWith('Lost with'), r.memorial[0].cause);
  await done();
});

test('a lost ship with no core characters aboard is unchanged', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired' }); G.state.crew = [];
    succeed('died');
    return { crew: G.state.crew, memorial: G.state.memorial || [] };
  });
  assert.deepEqual(r, { crew: [], memorial: [] });
  await done();
});

test('the pivot comes after late, after sixty days', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired();
    const st = G.state, rec = castRec('yelena'), out = {};
    rec.arc = 4;
    st.day = rec.since + 59; out.early = castNext('yelena');
    st.day = rec.since + 60; out.on = (castNext('yelena') || {}).name;
    start({ mode: 'hired' }); castRec('ines').arc = 4; castRec('ines').since = G.state.day - 60; out.ines = (castNext('ines') || {}).name;
    return out;
  });
  assert.equal(r.early, null); assert.equal(r.on, 'pivot'); assert.equal(r.ines, 'pivot', 'Ines has one too');
  await done();
});

test('the pivot outcome follows the state', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const run = ({ medic = false, injured = false, hull = 'good', gunner = 3, third = true, backup = false }) => {
      marsHired(); if (third) addThird();
      const st = G.state; st.injured = {};
      if (medic) { const m = makeCrewCandidate('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); st.crew.push(m.id); if (injured) st.injured[m.id] = true; }
      st.armor = hull === 'good' ? ship().armor : hull === 'edge' ? ship().armor * 0.6 : Math.floor(ship().armor * 0.5);
      person('c:yelena').skills.gunner = gunner;
      const text = CAST.yelena.scenes.pivot.choices[backup ? 1 : 0].run();
      const m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('yelena'), marks: (castRec('yelena').marks || []).length, cause: m ? m.cause : null };
    };
    return {
      protected: run({ medic: true }), hullAndGun: run({}), bare: run({ hull: 'low' }), backup: run({ hull: 'low', backup: true }),
      edge: run({ hull: 'edge' }), injuredMedic: run({ medic: true, injured: true, hull: 'low' }), rusty: run({ medic: true, gunner: 2 }),
      pairOnly: run({ hull: 'low', third: false }),
    };
  });
  assert.deepEqual(r.protected, { text: true, dead: false, marks: 0, cause: null }, 'three points: she lives');
  assert.deepEqual(r.hullAndGun, { text: true, dead: false, marks: 1, cause: null }, 'two points: marked');
  assert.equal(r.bare.dead, true, 'one point: dead'); assert.match(r.bare.cause, /^Went over the hull first near /);
  assert.deepEqual(r.backup, { text: true, dead: false, marks: 1, cause: null }, 'backup is a point');
  assert.equal(r.edge.dead, true, 'exactly 60 percent is not above it');
  assert.equal(r.injuredMedic.dead, true, 'an injured medic does not count');
  assert.equal(r.rusty.marks, 1, 'a gunner below 3 loses a point');
  assert.deepEqual(r.pairOnly, { text: true, dead: false, marks: 1, cause: null }, 'with only the pair the floor turns it into a mark');
  await done();
});

test('the pivots of Ines and Tomas follow the state, and the narrow build lets them die', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const run = (key, { medic = false, hull = 'good', flag = false, backup = false }) => {
      __seed(1); start({ mode: 'hired', post: 'gunner' }); postsOnly();
      const st = G.state; st.injured = {};
      if (medic) { const m = makeCrewCandidate('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); st.crew.push(m.id); }
      st.armor = hull === 'good' ? ship().armor : Math.floor(ship().armor * 0.5);
      if (flag) castFlag(key, key === 'ines' ? 'practiced' : 'plan');
      const text = CAST[key].scenes.pivot.choices[backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead(key), marks: (castRec(key).marks || []).length, cause: m ? m.cause : null };
    };
    const out = {};
    for (const key of ['ines', 'tomas']) out[key] = { live: run(key, { medic: true, flag: true }), mark: run(key, { flag: true }), die: run(key, { hull: 'low' }), backup: run(key, { hull: 'low', flag: true, backup: true }) };
    return out;
  });
  for (const key of ['ines', 'tomas']) {
    assert.deepEqual(r[key].live, { text: true, dead: false, marks: 0, cause: null }, `${key}: three points live`);
    assert.deepEqual(r[key].mark, { text: true, dead: false, marks: 1, cause: null }, `${key}: two points are marked`);
    assert.equal(r[key].die.dead, true, `${key}: one point dies`); assert.match(r[key].die.cause, /near /);
    assert.equal(r[key].backup.dead, false, `${key}: a second hand is a point`); assert.equal(r[key].backup.marks, 1);
  }
  await done();
});

test('Bexa\'s pivot, The Tow, follows the state, and calling it off costs opinion only (#130)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const run = ({ medic = false, hull = 'good', mass = true, backup = false, promised = false, pick = null }) => {
      __seed(1); start({ mode: 'hired', post: 'gunner' }); postsOnly();
      const st = G.state; st.injured = {};
      castPerson('bexa'); castRec('bexa').since = st.day;
      if (medic) { const m = makeCrewCandidate('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); st.crew.push(m.id); }
      st.armor = hull === 'good' ? ship().armor : Math.floor(ship().armor * 0.5);
      st.fuel = mass ? ship().fuel : Math.floor(ship().fuel * 0.4);
      if (promised) castFlag('bexa', 'promised');
      const p = person('c:bexa'), before = p.opinion;
      const text = CAST.bexa.scenes.pivot.choices[pick !== null ? pick : backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('bexa'), marks: (castRec('bexa').marks || []).length, cause: m ? m.cause : null, delta: p.opinion - before, raw: text, bench: !!castRec('bexa').flags.benched };
    };
    const shown = (() => { __seed(1); start({ mode: 'hired', post: 'gunner' }); postsOnly(); castPerson('bexa'); G.state.fuel = 1; const t1 = CAST.bexa.scenes.pivot.text; G.state.fuel = ship().fuel; return { low: t1, full: CAST.bexa.scenes.pivot.text }; })();
    return {
      live: run({ medic: true }), mark: run({}), die: run({ hull: 'low', mass: false }), backup: run({ hull: 'low', backup: true }),
      noMass: run({ medic: true, mass: false }), off: run({ pick: 2, promised: true }), dieP: run({ hull: 'low', mass: false, promised: true }), shown,
    };
  });
  assert.deepEqual({ ...r.live, raw: 0 }, { text: true, dead: false, marks: 0, cause: null, delta: 2, raw: 0, bench: false }, 'medic, hull and reaction mass: she lives');
  assert.equal(r.mark.dead, false); assert.equal(r.mark.marks, 1, 'two points: marked');
  assert.equal(r.die.dead, true, 'no medic, a bad hull, low mass: dies'); assert.match(r.die.cause, /^Went out on the tow line near /);
  assert.equal(r.backup.dead, false, 'a second hand is a point'); assert.equal(r.backup.marks, 1);
  assert.equal(r.noMass.marks, 1, 'low reaction mass loses a point');
  assert.deepEqual({ delta: r.off.delta, dead: r.off.dead, marks: r.off.marks, bench: r.off.bench }, { delta: -3, dead: false, marks: 0, bench: true }, 'cutting the line benches her and costs opinion only');
  assert.match(r.dieP.raw, /you promised her/); assert.doesNotMatch(r.die.raw, /you promised her/);
  assert.match(r.shown.low, /tanks are low/); assert.match(r.shown.full, /tanks are over half/);
  await done();
});

test('Ruben\'s pivot, The Last Relay, follows the state, and calling it off costs opinion only (#130)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const run = ({ medic = false, hull = 'good', named = false, backup = false, promised = false, pick = null }) => {
      __seed(1); start({ mode: 'hired', post: 'gunner' }); postsOnly();
      const st = G.state; st.injured = {};
      castPerson('ruben'); castRec('ruben').since = st.day;
      if (medic) { const m = makeCrewCandidate('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); st.crew.push(m.id); }
      st.armor = hull === 'good' ? ship().armor : Math.floor(ship().armor * 0.5);
      if (named) castFlag('ruben', 'councillor');
      if (promised) castFlag('ruben', 'promised');
      const p = person('c:ruben'), before = p.opinion;
      const text = CAST.ruben.scenes.pivot.choices[pick !== null ? pick : backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('ruben'), marks: (castRec('ruben').marks || []).length, cause: m ? m.cause : null, delta: p.opinion - before, raw: text, bench: !!castRec('ruben').flags.benched };
    };
    const shown = (() => { __seed(1); start({ mode: 'hired', post: 'gunner' }); postsOnly(); castPerson('ruben'); const a = CAST.ruben.scenes.pivot.text; castFlag('ruben', 'councillor'); return { without: a, withName: CAST.ruben.scenes.pivot.text }; })();
    return {
      live: run({ medic: true, named: true }), mark: run({ named: true }), die: run({ hull: 'low' }), backup: run({ hull: 'low', named: true, backup: true }),
      noName: run({ medic: true }), off: run({ pick: 2, promised: true }), dieP: run({ hull: 'low', promised: true }), shown,
    };
  });
  assert.deepEqual({ ...r.live, raw: 0 }, { text: true, dead: false, marks: 0, cause: null, delta: 2, raw: 0, bench: false }, 'medic, hull and the councillor: he lives');
  assert.equal(r.mark.dead, false); assert.equal(r.mark.marks, 1, 'two points: marked');
  assert.equal(r.die.dead, true, 'one point: dies'); assert.match(r.die.cause, /^Went out to the north mast to hold the band open near /);
  assert.equal(r.backup.dead, false, 'a second person is a point'); assert.equal(r.backup.marks, 1);
  assert.equal(r.noName.marks, 1, 'without the councillor he loses a point');
  assert.deepEqual({ delta: r.off.delta, dead: r.off.dead, marks: r.off.marks, bench: r.off.bench }, { delta: -3, dead: false, marks: 0, bench: true }, 'holding him at the console benches him and costs opinion only');
  assert.match(r.dieP.raw, /room for a relay you told him/); assert.doesNotMatch(r.die.raw, /room for a relay you told him/);
  assert.match(r.shown.without, /No councillor on Hellas has your name/); assert.match(r.shown.withName, /Councillor Reyes\'s name is on the relay/);
  await done();
});

test('Pax\'s pivot, The Coupling Again, follows the state, and calling it off costs opinion only (#130)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const run = ({ medic = false, hull = 'good', read = false, backup = false, promised = false, pick = null }) => {
      __seed(1); start({ mode: 'hired', post: 'pilot' }); postsOnly();
      const st = G.state; st.injured = {};
      castPerson('pax'); castRec('pax').since = st.day;
      if (medic) { const m = makeCrewCandidate('earth'); m.role = 'medic'; m.skill = 1; registerPerson(m); st.crew.push(m.id); }
      st.armor = hull === 'good' ? ship().armor : Math.floor(ship().armor * 0.5);
      if (read) castFlag('pax', 'foreman');
      if (promised) castFlag('pax', 'promised');
      const p = person('c:pax'), before = p.opinion;
      const text = CAST.pax.scenes.pivot.choices[pick !== null ? pick : backup ? 1 : 0].run(), m = (st.memorial || [])[0];
      return { text: typeof text === 'string' && text.length > 40, dead: castDead('pax'), marks: (castRec('pax').marks || []).length, cause: m ? m.cause : null, delta: p.opinion - before, raw: text, bench: !!castRec('pax').flags.benched };
    };
    const shown = (() => { __seed(1); start({ mode: 'hired', post: 'pilot' }); postsOnly(); castPerson('pax'); const a = CAST.pax.scenes.pivot.text; castFlag('pax', 'foreman'); return { unread: a, read: CAST.pax.scenes.pivot.text }; })();
    return {
      live: run({ medic: true, read: true }), mark: run({ read: true }), die: run({ hull: 'low' }), backup: run({ hull: 'low', read: true, backup: true }),
      unread: run({ medic: true }), off: run({ pick: 2, promised: true }), dieP: run({ hull: 'low', promised: true }), shown,
    };
  });
  assert.deepEqual({ ...r.live, raw: 0 }, { text: true, dead: false, marks: 0, cause: null, delta: 2, raw: 0, bench: false }, 'medic, hull and the message read: Pax lives');
  assert.equal(r.mark.dead, false); assert.equal(r.mark.marks, 1, 'two points: marked');
  assert.equal(r.die.dead, true, 'one point: dies'); assert.match(r.die.cause, /^Held the gun mount at the coupling near /);
  assert.equal(r.backup.dead, false, 'a second hand at the rack is a point'); assert.equal(r.backup.marks, 1);
  assert.equal(r.unread.marks, 1, 'with the message unread Pax loses a point');
  assert.deepEqual({ delta: r.off.delta, dead: r.off.dead, marks: r.off.marks, bench: r.off.bench }, { delta: -3, dead: false, marks: 0, bench: true }, 'cutting the power benches Pax and costs opinion only');
  assert.match(r.dieP.raw, /you promised them/); assert.doesNotMatch(r.die.raw, /you promised them/);
  assert.match(r.shown.unread, /still unopened in the queue/); assert.match(r.shown.read, /the last line showing: practice/);
  await done();
});

test('the earlier scenes set what the pivots count, and calling them off costs opinion only', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' }); postsOnly();
    CAST.ines.scenes.mid1.choices[0].run(); CAST.tomas.scenes.mid2.choices[0].run();
    const out = { practiced: !!castRec('ines').flags.practiced, plan: !!castRec('tomas').flags.plan };
    CAST.tomas.scenes.mid2.choices[1].run && (castRec('tomas').flags = {});
    for (const key of ['ines', 'tomas']) { const p = person('c:' + key), before = p.opinion; CAST[key].scenes.pivot.choices[2].run(); out[key] = { delta: p.opinion - before, dead: castDead(key), marks: (castRec(key).marks || []).length }; }
    return out;
  });
  assert.equal(r.practiced, true); assert.equal(r.plan, true);
  assert.deepEqual(r.ines, { delta: -3, dead: false, marks: 0 }); assert.deepEqual(r.tomas, { delta: -3, dead: false, marks: 0 });
  await done();
});

// ---------- the farewell (#356) ----------

test('a farewell reads at most two true facts, in priority order, and none when none are true', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const out = { none: ['ines', 'tomas', 'cato'].map(farewellFacts) };
    for (const f of ['practiced', 'promised', 'reference']) castFlag('ines', f);
    out.ines = farewellFacts('ines');
    castFlag('cato', 'share'); castFlag('cato', 'benched'); castFlag('cato', 'told');
    out.cato = farewellFacts('cato');
    out.other = farewellFacts('yelena');
    return out;
  });
  assert.deepEqual(r.none, [[], [], []]);
  assert.equal(r.ines.length, 2); assert.match(r.ines[0], /reference for the Lisbon board/); assert.match(r.ines[1], /dead-stick flip/);
  assert.match(r.cato[0], /hold you sealed on him/); assert.match(r.cato[1], /tell them if it goes badly/);
  assert.deepEqual(r.other, [], 'someone with no farewell reads nothing');
  await done();
});

test('a main character who walks off is a scene with their leaving line and what you did, and is on the record; other crew keep the message', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const st = G.state, planet = system().planets[0], ines = person('c:ines'), tomas = person('c:tomas'), out = {};
    castFlag('ines', 'promised'); ines.opinion = OPINION.BITTER; tomas.opinion = OPINION.BITTER; tomas.loyal = true;
    const other = st.crew.map(person).find(c => c && !c.cast && c.role !== 'xo'); other.opinion = OPINION.BITTER;
    G.dialog = null; G.nextEvent = null; G.player = makeShip(st.shipId, 0, 0, 0);
    land(planet);
    const e = G.dialog && G.dialog.event;
    out.title = e && e.title; out.text = e && e.text; out.choices = e && G.dialog.choices.map(c => c.label);
    out.gone = [!st.crew.includes(ines.id), !st.crew.includes(other.id), st.crew.includes(tomas.id)];
    out.departed = st.departed; out.planet = planet.name;
    out.message = G.messages.some(m => m.text.includes(`${fullName(other)} has had enough`)) && !G.messages.some(m => m.text.includes('Ines Ferreira has had enough'));
    return out;
  });
  assert.equal(r.title, 'Gone Ashore'); assert.deepEqual(r.choices, ['Close the hatch']);
  assert.ok(r.text.startsWith(`Ines does not ask for leave. At the foot of the ramp on ${r.planet}`));
  assert.ok(r.text.includes('the word someday'), 'what you did with her');
  assert.deepEqual(r.gone, [true, true, true], 'Ines and the crew member go, loyal Tomas stays');
  assert.equal(r.departed.length, 1); assert.equal(r.departed[0].key, 'ines'); assert.equal(r.departed[0].why, 'opinion');
  assert.ok(r.message, 'a crew member with no farewell keeps the one line');
  await done();
});

test('a main character lost outside their own pivot has what you did added to After the Loss', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const st = G.state, tomas = person('c:tomas'), plain = st.crew.map(person).find(c => c && !c.cast && c.role !== 'xo');
    castFlag('tomas', 'plan'); castFlag('tomas', 'loan');
    const out = {};
    out.tomas = loseCrew(tomas, 'Cause.');
    out.plain = loseCrew(plain, 'Cause.');
    const scenes = st.mourn.map(m => mournScene(m).text);
    return { ...out, scenes, cast: st.mourn.map(m => m.cast || null) };
  });
  assert.equal(r.tomas, 'dead');
  assert.match(r.scenes[0], /ring of braided wire/); assert.match(r.scenes[0], /say the plant back/);
  assert.doesNotMatch(r.scenes[1], /braided|plant back/, 'a crew member with no farewell reads as before');
  await done();
});

test('calling off the boarding costs her the bench', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired(); addThird();
    const y = person('c:yelena'), before = y.opinion;
    const text = CAST.yelena.scenes.pivot.choices[2].run();
    return { text: typeof text === 'string' && text.length > 40, benched: !!castRec('yelena').flags.benched, delta: y.opinion - before, dead: castDead('yelena'), marks: (castRec('yelena').marks || []).length, memorial: G.state.memorial || [] };
  });
  assert.deepEqual(r, { text: true, benched: true, delta: -3, dead: false, marks: 0, memorial: [] });
  await done();
});

test('a dead core character is not a contact, a blockade ally or a friend at the ending', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const run = opinion => {
      marsHired(); addThird();
      story().ending = Object.keys(ENDINGS)[0];
      person('c:yelena').opinion = opinion;
      castFate('yelena', 'die', 'x', 'x');
      G.mode = 'landed'; UI.tab = 'crew'; UI.render();
      // the memorial names her; the contacts do not
      return { listed: document.body.innerHTML.replace(/<h3>In memory<\/h3>[\s\S]*?(?=<h3>)/, '').includes('Yelena'), allies: blockadeForces().allies, friends: +/Across the solar system, (\d+)/.exec(epilogueEvent().text)[1] };
    };
    return { loved: run(6), unloved: run(0) };
  });
  assert.equal(r.loved.listed, false, 'not in the crew screen contacts');
  assert.equal(r.loved.allies, r.unloved.allies, 'does not answer the blockade call');
  assert.equal(r.loved.friends, r.unloved.friends, 'is not counted among those who would cross a burn');
  await done();
});

test('her mark takes a gunner point even when she is posted somewhere else', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ background: 'mars', mode: 'hired', post: 'gunner' }); postsOnly(); addThird();
    const y = person('c:yelena'), st = G.state, before = { role: y.role, pilot: y.skills.pilot, skill: y.skill, gunner: y.skills.gunner };
    st.armor = ship().armor;  // sound hull and a gunner at 3: two points, a mark
    CAST.yelena.scenes.pivot.choices[0].run();
    return { before, after: { pilot: y.skills.pilot, skill: y.skill, gunner: y.skills.gunner }, marks: (castRec('yelena').marks || []).length };
  });
  assert.notEqual(r.before.role, 'gunner'); assert.equal(r.before.gunner, 3);
  assert.deepEqual(r.after, { pilot: r.before.pilot, skill: r.before.skill, gunner: 2 });
  assert.equal(r.marks, 1);
  await done();
});

// ---------- authored personal stories (family.js reads them from cast.js) ----------

test('an authored character plays their own story, not an invented one', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const t = person('c:tomas'), i = person('c:ines');
    return { tomas: [storyOf(t).authored, storyOf(t).rel, storyOf(t).name, missed(t)], ines: [storyOf(i).authored, missed(i)] };
  });
  assert.deepEqual(r.tomas, [true, 'sister', 'Ngozi', 'sister Ngozi']);
  assert.deepEqual(r.ines, [true, 'old ferry chief Duarte']);
  await done();
});

test('a generated crew member still gets a rolled story', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const g = makeCrewCandidate('earth'); registerPerson(g);
    const s = storyOf(g);
    return { authored: !!s.authored, left: LEFT.includes(s.left), rel: RELATIONS.includes(s.rel) };
  });
  assert.deepEqual(r, { authored: false, left: true, rel: true });
  await done();
});

test('a save with an invented story loses it and keeps the progress made', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const t = person('c:tomas');
    t.story = { left: 'x', rel: 'son', name: 'Diego', hope: 'y', favor: 'debt', debt: 1000, beat: 2 };
    const s = storyOf(t);
    return [s.authored, s.rel, s.name, s.beat];
  });
  assert.deepEqual(r, [true, 'sister', 'Ngozi', 2]);
  await done();
});

test('the sit-down beats are about their own life, and there is no invented favor', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const t = person('c:tomas'), s = storyOf(t), out = {};
    t.opinion = 5;
    s.beat = 0; out.b0 = sitBeat(t, true).text;
    s.beat = 1; out.b1 = sitBeat(t, true).text;
    s.beat = 2; out.b2 = sitBeat(t, true).text;
    s.beat = 3; out.b3 = sitBeat(t, true).title; out.home = homeHtml();
    return out;
  });
  assert.match(r.b0, /Lagos Ring/); assert.match(r.b0, /weld shops/); assert.match(r.b0, /three owners who each sold the same hull/);
  assert.doesNotMatch(r.b0, /arcology/);
  assert.match(r.b1, /sister Ngozi/); assert.match(r.b2, /his sister's flat/);
  assert.equal(r.b3, 'With Tomas', 'no generic favor beat');
  assert.doesNotMatch(r.home, /Tomas:[^<]*favor/);
  await done();
});

test('letters from home are about their own people', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    for (const f of procedural()) storyOf(f.p);  // roll everyone's story first: a fixed random number cannot make two different traits
    const run = seq => {
      let k = 0; const real = Math.random; Math.random = () => seq[k++ % seq.length];
      for (const f of procedural()) delete f.p.letterDay;
      const out = [];
      try { for (let i = 0; i < 6; i++) { delete G.state.letterAt; const l = letters(currentPlanet()); if (!l.length) break; out.push(...l); } return out.join(' '); } finally { Math.random = real; }  // one letter a landing, so one landing for each of them
    };
    return { good: run([0, 0, 0]), bad: run([0, 0.9, 0]) };  // each person draws: whether to write, good or bad, which
  });
  assert.match(r.good, /their sister Ngozi got the lease on the flat renewed/);
  assert.match(r.good, /their old ferry chief Duarte stood up for her at the license board/);
  assert.match(r.bad, /their sister Ngozi says the rent on Lagos Ring has gone up again/);
  assert.match(r.bad, /their old ferry chief Duarte is ill, and the old ferry crew are passing a hat/);
  await done();
});

test('every authored story is complete, and the Earth pair have one', async () => {
  const { ev, done } = await open();
  const r = await ev(() => Object.fromEntries(Object.entries(CAST).filter(([, d]) => d.story).map(([k, d]) => [k, {
    fields: ['left', 'rel', 'name', 'hope'].every(f => typeof d.story[f] === 'string' && d.story[f].length > 3),
    news: d.story.news && d.story.news.good.length >= 3 && d.story.news.bad.length >= 3,
    emoji: /[\u{1F300}-\u{1FAFF}☀-➿]/u.test(JSON.stringify(d.story)),
  }])));
  assert.deepEqual(Object.keys(r).sort(), ['ansel', 'cato', 'ilsa', 'ines', 'pilar', 'tomas'], 'the Earth pair and the first officers have stories');
  for (const [k, v] of Object.entries(r)) assert.deepEqual(v, { fields: true, news: true, emoji: false }, k);
  await done();
});

// ---------- fragile characters, and the fate follow-ups (#146) ----------

const fragileHelpers = () => {
  // An authored first officer stands in until the real ones exist: marked fragile, joined the way the cast joins.
  window.addFragile = () => { CAST.testxo = { ...CAST.tomas, first: 'Test', last: 'Xo', fragile: true, role: 'gunner', skills: { gunner: 2 } }; castRec('testxo').since = G.state.day; return castPerson('testxo'); };
};

test('a fragile character dies even when only the pair would be left', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(fragileHelpers);
  const r = await ev(() => {
    marsHired(); const xo = addFragile(), st = G.state, out = {};
    st.crew.push(xo.id);
    out.living = castLiving().sort();
    out.result = castFate('testxo', 'die', 'Lost on the ice.', 'x');
    out.dead = castDead('testxo'); out.inCrew = st.crew.includes(xo.id); out.memorial = st.memorial;
    out.pair = ['yelena', 'ruben'].map(k => castDead(k));
    return out;
  });
  assert.deepEqual(r.living, ['ruben', 'yelena'], 'a fragile character does not count toward the floor');
  assert.equal(r.result, 'die'); assert.equal(r.dead, true); assert.equal(r.inCrew, false);
  assert.equal(r.memorial.length, 1); assert.equal(r.memorial[0].key, 'testxo'); assert.equal(r.memorial[0].cause, 'Lost on the ice.');
  assert.deepEqual(r.pair, [false, false]);
  await done();
});

test('a fragile character does not lift the floor for the pair', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(fragileHelpers);
  const r = await ev(() => { marsHired(); addFragile(); return { result: castFate('yelena', 'die', 'x', 'x'), dead: castDead('yelena') }; });
  assert.deepEqual(r, { result: 'mark', dead: false });
  await done();
});

test('a ship lost takes a fragile character and leaves the pair marked', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(fragileHelpers);
  const r = await ev(() => {
    marsHired(); const xo = addFragile(); G.state.crew.push(xo.id);
    const out = castShipLoss('Lost with the ship.');
    return { out, dead: castDead('testxo'), pair: ['yelena', 'ruben'].map(k => castDead(k)) };
  });
  assert.deepEqual(r.out.dead, ['testxo']); assert.deepEqual(r.out.saved.sort(), ['ruben', 'yelena']);
  assert.deepEqual(r.pair, [false, false]);
  await done();
});

test('a fate for a character who never joined is ignored', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start(); const st = G.state;
    const result = castFate('ines', 'die', 'x', 'x');
    return { result, dead: castDead('ines'), memorial: st.memorial || [], marks: ((st.cast || {}).ines || {}).marks };
  });
  assert.deepEqual(r, { result: 'live', dead: false, memorial: [], marks: undefined });
  await done();
});

test('a dead character\'s record survives registry pruning', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired(); addThird();
    const st = G.state; person('c:yelena').opinion = 0; castFate('yelena', 'die', 'x', 'x');
    for (let i = 0; i < 120; i++) registerPerson(makePerson());
    return { kept: !!st.people['c:yelena'], same: castPerson('yelena') === st.people['c:yelena'], dead: castDead('yelena'), size: Object.keys(st.people).length };
  });
  assert.equal(r.kept, true); assert.equal(r.same, true); assert.equal(r.dead, true); assert.ok(r.size <= 82);
  await done();
});

test('the memorial cause carries no markup, when written or when a save is loaded', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired(); addThird();
    castFate('yelena', 'die', 'Lost with the <img src=x onerror=1> Ship.', 'x');
    const written = G.state.memorial[0].cause;
    const loaded = migrate({ memorial: [{ key: 'ruben', day: 3, place: 'Ceres', cause: '<b>bold</b>' }] }).memorial[0].cause;
    return { written, loaded };
  });
  assert.doesNotMatch(r.written, /[<>]/); assert.doesNotMatch(r.loaded, /[<>]/);
  await done();
});

// ---------- marks and the memorial, shown (#131) ----------

test('a mark is shown on the crew screen and on the character sheet', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired();
    const crew = () => UI.views.crew.call(UI), sheet = () => { G.viewPerson = 'c:yelena'; return characterPanel(); };
    const before = { crew: crew().includes('Hand ruined.'), sheet: sheet().includes('Hand ruined.') };
    castFate('yelena', 'mark', 'x', 'Hand ruined, <b>badly</b>.');
    return { before, crew: crew(), sheet: sheet() };
  });
  assert.deepEqual(r.before, { crew: false, sheet: false });
  for (const html of [r.crew, r.sheet]) { assert.match(html, /Hand ruined, /); assert.doesNotMatch(html, /<b>badly<\/b>/, 'the text is escaped'); }
  await done();
});

test('the memorial lists who, when, where and the cause, and escapes all of it', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired(); addThird();
    const none = memorialHtml();
    castFate('yelena', 'die', 'Lost with the "Iron & Ash".', 'x');
    const st = G.state, e = st.memorial[0];
    st.memorial.push({ key: 'ruben', day: 3, place: '<i>Ceres</i>', cause: '<script>alert(1)</script>' });  // an old or imported save
    return { none, html: UI.views.crew.call(UI), day: dateOf(e.day), place: e.place };
  });
  assert.equal(r.none, '');
  assert.match(r.html, /In memory/); assert.match(r.html, /Yelena/); assert.ok(r.html.includes(r.day)); assert.ok(r.html.includes(r.place));
  assert.match(r.html, /Lost with the &quot;Iron &amp; Ash&quot;/);
  assert.doesNotMatch(r.html, /<script|<i>/i, 'markup in the record is escaped');
  await done();
});

test('the chapter\'s closing scene remembers who did not make it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(fragileHelpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const xo = addFragile(); G.state.crew.push(xo.id);
    const clean = chapterEnd('shuttle').text;
    castFate('testxo', 'die', 'Lost on the ice.', 'x');
    return { clean, text: chapterEnd('shuttle').text };
  });
  assert.doesNotMatch(r.clean, /Test Xo/); assert.match(r.text, /Test Xo/);
  await done();
});

test('the chapter\'s closing scene reads the record: two losses close on The Memorial Wall, fewer on Your Own Ship (#132)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' }); person('c:ines').opinion = OPINION.CLOSE;  // someone comes with you, so it is not the empty ship
    const none = chapterEnd('shuttle'), grave = (key, day) => ({ key, day, place: 'Ceres', cause: 'Lost on the way.' });
    G.state.memorial = [grave('ines', 5)]; const one = chapterEnd('shuttle');
    G.state.memorial = [grave('ines', 5), grave('tomas', 9)]; const two = chapterEnd('shuttle');
    return { none: { title: none.title, text: none.text }, one: { title: one.title, text: one.text }, two: { title: two.title, text: two.text, labels: two.choices.map(c => c.label) }, endings: CHAPTER_ENDINGS.map(e => e.id), firstTwo: CHAPTER_ENDINGS[0].when({ dead: ['a', 'b'] }), firstOne: CHAPTER_ENDINGS[0].when({ dead: ['a'] }) };
  });
  assert.equal(r.none.title, 'Your Own Ship'); assert.equal(r.one.title, 'Your Own Ship'); assert.match(r.one.text, /Ines Ferreira is not here to see it/, 'one loss is a line in the ordinary scene');
  assert.equal(r.two.title, 'The Memorial Wall'); assert.match(r.two.text, /Ines Ferreira and Tomas Achebe/); assert.match(r.two.text, /hand's width of tape/);
  for (const k of ['none', 'one', 'two']) { assert.match(r[k].text, /is on the apron at /, `${k}: the foot of the ramp is shared`); assert.match(r[k].text, /This is where the hired-hand chapter ends\.$/, `${k}: the closing line is shared`); }
  assert.deepEqual(r.two.labels, ['Keep flying']);
  assert.equal(r.endings[0], 'memorial-wall'); assert.equal(r.firstTwo, true); assert.equal(r.firstOne, false);
  await done();
});

test('the chapter\'s other endings read the record: nobody aboard, a promise kept, and a clean chapter that ends rich (#132)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const fresh = () => { start({ mode: 'hired', post: 'gunner' }); postsOnly(); const st = G.state; st.memorial = []; for (const k of Object.keys(st.cast || {})) { delete st.cast[k].marks; st.cast[k].flags = {}; } for (const id of st.crew) person(id).opinion = 0; st.credits = 19000; return st; };
    const out = {};
    let st = fresh(); out.alone = chapterEnd('shuttle');
    st = fresh(); person('c:ines').opinion = OPINION.CLOSE; out.plain = chapterEnd('shuttle');
    st = fresh(); person('c:ines').opinion = OPINION.CLOSE; castRec('ines').flags.promised = true; out.promised = chapterEnd('shuttle');
    st = fresh(); person('c:ines').opinion = OPINION.CLOSE; st.credits = 19000 + SHIPS.shuttle.price + 15000; out.rich = chapterEnd('shuttle');
    st = fresh(); person('c:ines').opinion = OPINION.CLOSE; st.credits = 19000 + SHIPS.shuttle.price + 15000; castRec('ines').marks = [{ text: 'x', day: 1 }]; out.richMarked = chapterEnd('shuttle');
    st = fresh(); person('c:ines').opinion = OPINION.CLOSE; castRec('ines').flags.promised = true; st.credits = 19000 + SHIPS.shuttle.price + 15000; out.both = chapterEnd('shuttle');
    st = fresh(); st.memorial = [{ key: 'ines', day: 1, place: 'x', cause: 'y' }, { key: 'tomas', day: 2, place: 'x', cause: 'y' }]; out.lossBeatsAlone = chapterEnd('shuttle');
    out.order = CHAPTER_ENDINGS.map(e => e.id); out.berths = SHIPS.shuttle.berths;
    return JSON.parse(JSON.stringify({ ...out, alone: { t: out.alone.title, x: out.alone.text }, plain: { t: out.plain.title }, promised: { t: out.promised.title, x: out.promised.text }, rich: { t: out.rich.title, x: out.rich.text }, richMarked: { t: out.richMarked.title }, both: { t: out.both.title }, lossBeatsAlone: { t: out.lossBeatsAlone.title } }));
  });
  assert.deepEqual(r.order, ['memorial-wall', 'empty-berths', 'ten-years', 'quiet-fortune'], 'loss first, then the crew, then the quiet one');
  assert.equal(r.alone.t, 'The Empty Berths'); assert.ok(r.alone.x.includes(`${r.berths} berths`)); assert.match(r.alone.x, /Nobody comes up the ramp/);
  assert.equal(r.plain.t, 'Your Own Ship', 'someone comes, nothing else to read');
  assert.equal(r.promised.t, 'Ten Years, One Ship'); assert.match(r.promised.x, /Ines/);
  assert.equal(r.rich.t, 'The Quiet Fortune'); assert.match(r.rich.x, /still in the account/);
  assert.equal(r.richMarked.t, 'Your Own Ship', 'a mark on anyone spoils a quiet fortune');
  assert.equal(r.both.t, 'Ten Years, One Ship', 'the crew beats the quiet one');
  assert.equal(r.lossBeatsAlone.t, 'The Memorial Wall', 'loss beats an empty ship');
  await done();
});

test('the chapter endings agree with how many came: one friend, two friends, and a wall with nobody at the ramp (#398)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const fresh = () => { start({ mode: 'hired', post: 'gunner' }); postsOnly(); const st = G.state; st.memorial = []; for (const k of Object.keys(st.cast || {})) { delete st.cast[k].marks; st.cast[k].flags = {}; } for (const id of st.crew) person(id).opinion = 0; st.credits = 19000; return st; };
    const grave = key => ({ key, day: 1, place: 'x', cause: 'y' }), rich = 19000 + SHIPS.shuttle.price + 15000, out = {};
    fresh(); person('c:ines').opinion = OPINION.CLOSE; castRec('ines').flags.promised = true; out.promisedOne = chapterEnd('shuttle').text;
    fresh(); for (const k of ['ines', 'tomas']) { person('c:' + k).opinion = CAST_GOOD; castRec(k).flags.promised = true; } out.promisedTwo = chapterEnd('shuttle').text;
    let st = fresh(); st.credits = rich; for (const k of ['ines', 'tomas']) person('c:' + k).opinion = CAST_GOOD; out.richTwo = chapterEnd('shuttle').text;
    st = fresh(); st.credits = rich; person('c:ines').opinion = OPINION.CLOSE; out.richOne = chapterEnd('shuttle').text;
    st = fresh(); st.memorial = [grave('ines'), grave('tomas')]; out.wallNobody = chapterEnd('shuttle').text;
    st = fresh(); st.memorial = [grave('ines'), grave('tomas')]; person('c:tomas').opinion = OPINION.CLOSE; out.wallOne = chapterEnd('shuttle').text;
    st = fresh(); st.memorial = [grave('ines')]; out.berthsLoss = chapterEnd('shuttle').text;
    st = fresh(); out.berthsPlain = chapterEnd('shuttle').text;
    return out;
  });
  assert.match(r.promisedOne, /Ines Ferreira goes up the ramp ahead of you with a bag/); assert.match(r.promisedOne, /Ines stops at the hatch and waits for you/);
  assert.match(r.promisedTwo, /Ines Ferreira and Tomas Achebe go up the ramp ahead of you with their bags/); assert.match(r.promisedTwo, /Ines and Tomas stop at the hatch and wait for you/);
  assert.match(r.richOne, /Ines Ferreira is already aboard/); assert.match(r.richTwo, /Ines Ferreira and Tomas Achebe are already aboard/);
  assert.match(r.wallNobody, /Nobody is waiting at the foot of the ramp/);
  assert.match(r.wallOne, /Tomas Achebe waits at the foot of the ramp until you have finished/);
  assert.match(r.berthsLoss, /Ines Ferreira is not here/, 'a loss shows in the empty berths');
  assert.doesNotMatch(r.berthsPlain, /is not here/, 'and no loss, no line');
  await done();
});

test('an old save with no captain entry keeps the default hearing, bonus, lane risk and caution (#398)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const h = G.state.hired, real = Math.random, out = {};
    h.captainKey = null;
    out.entry = captainEntry(); out.hears = captainHears(); out.bonus = captainBonus(); out.risk = laneRisk(G.state.systemId);
    const choose = (fund, labels, roll) => { h.fund = fund; Math.random = () => roll; try { return captainPick(labels.map(label => ({ label }))).label; } finally { Math.random = real; } };
    out.poor = choose(3000, ['Pay the fine', 'Run for it'], 0.1);  // under the 4,000 floor the costly choice is a fifth as likely
    out.flush = choose(5000, ['Pay the fine', 'Run for it'], 0.1);
    out.fight = choose(5000, ['Battle stations', 'Run for it'], 0.5);  // the fight weighs 3 against 2 for a captain of no recorded nerve
    out.heard = OPINION.HEARD; out.bonusDefault = OPINION.BONUS;
    return out;
  });
  assert.equal(r.entry, null); assert.equal(r.hears, r.heard); assert.equal(r.bonus, r.bonusDefault); assert.equal(r.risk, 1);
  assert.equal(r.poor, 'Run for it'); assert.equal(r.flush, 'Pay the fine'); assert.equal(r.fight, 'Battle stations');
  await done();
});

test('letters from home come at most one landing in LETTER_GAP days, however many people are aboard', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    const st = G.state, real = Math.random;
    for (const f of procedural()) storyOf(f.p);  // roll everyone's story first: a fixed random number cannot make two different traits
    for (const f of procedural()) delete f.p.letterDay;
    Math.random = () => 0;  // everyone would write
    try {
      st.day = 100; const first = letters(currentPlanet()).length;
      for (const f of procedural()) delete f.p.letterDay;
      st.day = 100 + LETTER_GAP / 2; const soon = letters(currentPlanet()).length;
      for (const f of procedural()) delete f.p.letterDay;
      st.day = 100 + LETTER_GAP; const later = letters(currentPlanet()).length;
      return { first, soon, later };
    } finally { Math.random = real; }
  });
  assert.ok(r.first > 0, 'a landing can bring letters');
  assert.equal(r.soon, 0, 'none half a gap later');
  assert.ok(r.later > 0, 'letters again after the gap');
  await done();
});

test('the crew list shows a face for each crew member, ringed by how they are doing', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    const st = G.state; st.tutorial = null; while (G.dialog) finishEvent();
    for (const role of ['engineer', 'pilot', 'gunner']) { const p = makePerson('earth'); p.role = role; p.skills = { [role]: 1 }; p.skill = 1; registerPerson(p); st.crew.push(p.id); }
    const [a, b] = st.crew.map(person);
    a.mood = { kind: 'low', until: st.day + 10, text: 'their sister is sick' };
    b.mood = { kind: 'high', until: st.day + 10, text: 'their sister is well' };
    UI.tab = 'crew'; UI.render();
  });
  const rings = await page.$$eval('#panel .crew-face', els => els.map(e => [e.classList.contains('warn'), e.classList.contains('good'), !!e.querySelector('svg')]));
  assert.deepEqual(rings, [[true, false, true], [false, true, true], [false, false, true]]);
  await done();
});

test('the most common relationship scenes wait their turn crew-wide, and Small System has four openings', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const st = G.state; st.tutorial = null; while (G.dialog) finishEvent();
    const mk = (home, culture, traits) => { const p = makePerson('belt'); p.home = home; p.culture = culture; p.traits = traits; p.role = 'cook'; registerPerson(p); st.crew.push(p.id); return p; };
    mk('Ceres Station', 'belt', ['rude']); mk('Ceres Station', 'belt', ['kind']); mk('Pallas', 'belt', ['nervous']); mk('Hellas', 'belt', ['talkative']);
    const reset = () => { st.qualities = {}; delete st.relAt; };
    const gap = {}; reset(); gap.fresh = relReady('feud'); relMark('feud'); gap.after = relReady('feud'); st.day += 19; gap.day19 = relReady('feud'); st.day += 1; gap.day20 = relReady('feud');
    const heavy = ['A Small Ship', 'Galley Duty', 'Small System'], blocked = new Set();
    for (let i = 0; i < 60; i++) { st.qualities = {}; st.relAt = { feud: st.day, match: st.day, roots: st.day }; const e = relationshipScene(); if (e && heavy.includes(e.title)) blocked.add(e.title); }
    const open_ = new Set(), roots = new Set();
    for (let i = 0; i < 200; i++) { reset(); const e = relationshipScene(); if (e && heavy.includes(e.title)) open_.add(e.title); if (e && e.title === 'Small System') roots.add(e.text.replace(/[A-Z][a-z]+/g, 'N')); }
    return { gap, blocked: [...blocked], open: [...open_], roots: roots.size };
  });
  assert.deepEqual(r.gap, { fresh: true, after: false, day19: false, day20: true });
  assert.deepEqual(r.blocked, [], 'none of the three while each is waiting');
  assert.ok(r.open.includes('A Small Ship') && r.open.includes('Small System'), `and they come back when it is over (${r.open})`);
  assert.ok(r.roots >= 3, `Small System opens in at least three ways (${r.roots})`);
  await done();
});

test('a waiting introduction gains weight for each draw it misses, and the ones still waiting carry on once another plays', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ mode: 'hired', post: 'gunner' });
    sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.dialog = null;
    const intros = () => Mods.filter('happenings', [], 'transit').filter(c => c.tier > 0 && String(c.make).includes('castScene'));
    const waiting = () => castAboard().filter(c => (castRec(c.cast).arc || 0) === 0);
    const out = { aboard: waiting().length };
    out.draws = [intros(), intros(), intros()].map(list => list.map(c => `${c.tier}:${c.weight}`));
    const first = intros()[0];  // a fourth draw: weight 11, and this one plays
    first.make();
    out.afterPlay = { played: castAboard().filter(c => castRec(c.cast).arc === 1).length, waits: castAboard().map(c => castRec(c.cast).wait) };
    out.next = intros().map(c => `${c.tier}:${c.weight}`);
    return out;
  });
  assert.equal(r.aboard, 3, 'the two main characters and the first officer are all waiting to be introduced');
  assert.deepEqual(r.draws, [['1:2', '1:2', '1:2'], ['1:5', '1:5', '1:5'], ['1:8', '1:8', '1:8']], 'weight 2, then 3 more for each draw missed');
  assert.equal(r.afterPlay.played, 1);
  assert.ok(r.afterPlay.waits.includes(0), 'the one that played starts again at zero');
  assert.deepEqual(r.next, ['1:14', '1:14'], 'the two still waiting have each missed four draws, and carry on from there');
  await done();
});

// ---------- opinion-gated choices in the mid scenes (#345) ----------

test('Ines\'s Board and Tomas\'s Third Hull each have a choice that needs their trust: shut below it, open at it, and it does what it says', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    start({ post: 'gunner', captainKey: 'hester' });
    const out = {};
    for (const [key, sceneId, label, flag] of [['ines', 'mid2', 'Offer to say it to the board in person', 'reference'], ['tomas', 'mid2', 'Ask him to write it down', null]]) {
      const p = castAboard().find(c => c.cast === key), probe = op => {
        p.opinion = op; G.dialog = null; if (G.transit) G.transit.event = null;
        openEvent(castScene(key, CAST[key].scenes[sceneId]));
        const i = G.dialog.choices.findIndex(c => c.label.includes(label));
        return { i, can: G.dialog.choices[i].can(), label: G.dialog.choices[i].label, count: G.dialog.choices.length };
      };
      const below = probe(OPINION.TRUSTED - 1), open = probe(OPINION.TRUSTED), before = p.opinion, text = chooseEvent(open.i);
      out[key] = { below, open, gain: p.opinion - before, text, flag: flag ? !!castRec(key).flags && !!castRec(key).flags[flag] : null, first: p.first };
    }
    return out;
  });
  for (const key of ['ines', 'tomas']) {
    const k = r[key];
    assert.equal(k.below.can, false, `${key} shut below the minimum`); assert.ok(k.below.label.includes(`needs ${k.first}'s trust`), k.below.label);
    assert.equal(k.open.can, true, `${key} open at it`); assert.ok(!k.open.label.includes('needs'), 'no reason once open');
    assert.ok(k.below.count >= 3, 'shut, never hidden'); assert.ok(k.text.length > 200, 'it says what happened');
  }
  assert.ok(r.ines.gain >= 2 && r.tomas.gain >= 1, 'it lifts their regard (opinion tops out, so from the minimum it is less than the full gain)'); assert.ok(r.ines.flag, 'the reference flag is set');
  await done();
});
