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
  window.marsHired = () => start({ background: 'mars', mode: 'hired', post: 'pilot' });
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
        if (sc.choices.length !== (name === 'pivot' ? 3 : 2) || !sc.choices.every(c => c.label)) bad.push('choices');
        if (['mid1', 'mid2', 'late', 'pivot'].includes(name) && !(sc.days > 0)) bad.push('days');
        if (/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(sc.text + sc.choices.map(c => c.label).join(''))) bad.push('emoji');
        out.push({ key, name, bad });
      }
    }
    return out;
  });
  assert.deepEqual(r.filter(x => x.bad.length), []);
  assert.equal(r.length, 31, 'six characters, five scenes each, and Yelena\'s pivot');
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
  assert.equal(r.length, 63, 'six characters, five scenes, two choices, and the pivot\'s three');
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

test('the pivot comes after late, after sixty days, and only for Yelena', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    marsHired();
    const st = G.state, rec = castRec('yelena'), out = {};
    rec.arc = 4;
    st.day = rec.since + 59; out.early = castNext('yelena');
    st.day = rec.since + 60; out.on = (castNext('yelena') || {}).name;
    start({ mode: 'hired' }); castRec('ines').arc = 4; out.ines = castNext('ines');
    return out;
  });
  assert.equal(r.early, null); assert.equal(r.on, 'pivot'); assert.equal(r.ines, null, 'nobody else has a pivot yet');
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
