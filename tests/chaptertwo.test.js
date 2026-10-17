'use strict';

// Chapter two's close (js/chaptertwo.js, #685): who of the crew who came along is still aboard, which ending the record gives, and when the close is due, in plain Node; and the scene and
// the Port page's section in the page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { crewRecord, chapterTwoEndingId, chapterTwoDue, CHAPTER_TWO_DAYS } = load(['js/chaptertwo.js'], { Mods: { register() {} } }, ['crewRecord', 'chapterTwoEndingId', 'chapterTwoDue', 'CHAPTER_TWO_DAYS']);
const people = { a: { first: 'Ana' }, b: { first: 'Ben' }, c: { first: 'Cy', dead: true } };
const rec = (came, crew) => JSON.parse(JSON.stringify(crewRecord({ came, crew, people })));  // out of the context's realm

test('the record sorts the crew who came into aboard, left and dead, and ignores a person the registry has forgotten', () => {
  assert.deepEqual(rec(['a', 'b'], ['a', 'b', 'x']), { came: 2, aboard: ['a', 'b'], left: [], dead: [] });
  assert.deepEqual(rec(['a', 'b'], ['a']), { came: 2, aboard: ['a'], left: ['b'], dead: [] });
  assert.deepEqual(rec(['a', 'c'], ['a']), { came: 2, aboard: ['a'], left: [], dead: ['c'] });
  assert.deepEqual(rec(['c'], ['c']), { came: 1, aboard: [], left: [], dead: ['c'] }, 'dead is dead, whatever the crew list says');
  assert.deepEqual(rec([], ['a']), { came: 0, aboard: [], left: [], dead: [] }); assert.equal(rec(['gone'], []).left.length, 0, 'someone no longer in the registry is not counted');
});

test('the ending: nobody came, someone died, someone left, or everyone who came is still here, in that order of weight', () => {
  assert.equal(chapterTwoEndingId(rec([], ['a'])), 'alone'); assert.equal(chapterTwoEndingId(rec(['a', 'b'], ['a', 'b'])), 'together');
  assert.equal(chapterTwoEndingId(rec(['a', 'b'], ['a'])), 'left'); assert.equal(chapterTwoEndingId(rec(['a', 'c'], ['a'])), 'losses');
  assert.equal(chapterTwoEndingId({ came: 3, aboard: [], left: ['a'], dead: ['c'] }), 'losses', 'a death outweighs a departure');
});

test('the close is due once, on a game that bought its ship, when the days since the buy have passed', () => {
  const c = { bought: 40 };
  assert.equal(CHAPTER_TWO_DAYS, 90); assert.equal(chapterTwoDue(c, {}, 129), false); assert.equal(chapterTwoDue(c, {}, 130), true); assert.equal(chapterTwoDue(c, {}, 400), true);
  assert.equal(chapterTwoDue(c, { chapterTwo: true }, 130), false, 'once'); assert.equal(chapterTwoDue(null, {}, 999), false, 'no career, no chapter two');
  assert.equal(chapterTwoDue({}, {}, 999), false, 'a career from before the record');
});

const helpers = () => {
  // A game that has bought its ship with `friends` aboard, `days` days ago, docked at a port.
  window.owned = (friends = 2) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.credits = 100000; st.crew = []; crewOf(friends); for (const id of st.crew) st.people[id].opinion = 4;
    buyIn('courier'); while (G.dialog) finishEvent(); G.transit = null; G.mode = 'landed'; st.dest = null; st.systemId = 'earth'; st.planet = 'Earth'; G.dialog = null; G.nextEvent = null; UI.notes.length = 0;
    return st;
  };
  window.crewOf = n => { const st = G.state; for (let i = 0; i < n; i++) { const p = makePerson('earth'); p.role = ['pilot', 'engineer', 'cook'][i % 3]; p.skill = 1; registerPerson(p); st.crew.push(p.id); } };
  window.landed = () => { G.dialog = null; G.nextEvent = null; G.state.customs = { ...(G.state.customs || {}), last: G.state.day }; Mods.emit('landed', currentPlanet()); const e = G.dialog && G.dialog.event; return e; };  // the port stop (ties.js) is not what these are about
};
const run = async fn => { const t = await open(); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('the buy records who came along and the day, and the Port page says where each stands while the days run', async () => {
  const r = await run(() => {
    const st = owned(2), c = st.career, out = { came: c.came.length, crew: st.crew.length, bought: c.bought === st.day, ids: c.came.every(id => st.crew.includes(id)) };
    st.day += 20; UI.tab = 'port'; UI.render(); out.page = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    const gone = c.came[0]; st.crew = st.crew.filter(id => id !== gone); UI.render(); out.left = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    st.flags.chapterTwo = true; UI.render(); out.after = document.querySelector('.shell .body').textContent;
    return out;
  });
  assert.equal(r.came, r.crew); assert.ok(r.came >= 1); assert.equal(r.bought, true); assert.equal(r.ids, true);
  assert.match(r.page, /The crew who came along\s*Day 20 of 90\. \S+ aboard\./); assert.match(r.left, /has left\./); assert.ok(!/The crew who came along/.test(r.after), 'gone once the close has played');
});

test('on the first landing 90 days on the close plays once, by who is still aboard', async () => {
  const r = await run(() => {
    const st = owned(2), out = {}, names = st.career.came.map(id => st.people[id].first);
    st.day += 60; const early = landed(); out.early = early ? early.title : null;
    st.day += 30; const e = landed(); out.title = e && e.title; out.text = e && e.text; out.labels = e && e.choices.map(c => c.label); out.flag = st.flags.chapterTwo; out.names = names;
    out.again = landed(); out.keep = e.choices[0].run();
    return out;
  });
  assert.notEqual(r.early, 'Everyone Who Came', 'not before the days have passed'); assert.equal(r.title, 'Everyone Who Came'); assert.equal(r.flag, true); assert.deepEqual(r.labels, ['Keep flying']);
  assert.match(r.text, /^It has been 90 days since you took the ramp at the yard\./); assert.match(r.text, /came aboard with you on the first day/); assert.match(r.text, /This is where the second chapter ends\.$/);
  for (const n of r.names) assert.ok(r.text.includes(n), `${n} is named`);
  assert.ok(!r.again || r.again.title !== 'Everyone Who Came', 'once'); assert.equal(r.keep, 'You walk up the ramp and shut the hatch behind you.');
});

test('the close reads the record: someone who left, someone who died, and nobody who came', async () => {
  const r = await run(() => {
    const out = {};
    const two = st => { const p = makePerson('earth'); p.role = 'cook'; p.skill = 1; registerPerson(p); st.crew.push(p.id); st.career.came.push(p.id); };  // a second who came along
    for (const [key, friends, edit] of [['left', 2, (st, c) => { two(st); st.crew = st.crew.filter(id => id !== c.came[0]); }], ['leftall', 2, (st, c) => { st.crew = st.crew.filter(id => !c.came.includes(id)); }], ['died', 2, (st, c) => { two(st); st.people[c.came[0]].dead = true; }], ['diedall', 2, (st, c) => { two(st); for (const id of c.came) st.people[id].dead = true; }], ['alone', 0, () => {}]]) {
      const st = owned(friends); edit(st, st.career); st.day += 95; const e = landed(); out[key] = { title: e.title, text: e.text };
    }
    return out;
  });
  assert.equal(r.left.title, 'The Berth Left Open'); assert.match(r.left.text, /is still here\. \S+ is not: there is a bunk made up and nobody in it/);
  assert.match(r.leftall.text, /By now every one of them has put a bag on a dock somewhere/);
  assert.equal(r.died.title, 'The Names on the Tape'); assert.match(r.died.text, /did not see the end of it\. By the hatch there is a strip of tape with the name on it.*reads the tape on the way past/);
  assert.match(r.diedall.text, /\S+ and \S+ came aboard with you on the first day and did not see the end of it\. By the hatch there is a strip of tape with the names on it/);
  assert.equal(r.alone.title, 'The Ship You Fly'); assert.match(r.alone.text, /Nobody came aboard with you at the yard\. The berths have been open for 9\d days/);
});
