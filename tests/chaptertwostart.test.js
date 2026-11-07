'use strict';

// Chapter two's start (#891, docs/superpowers/specs/2026-11-07-chapter-two-start-design.md): a finished chapter one goes on, the lender sends three
// masters and the player picks one, and the co-op's Ore Runner is landed at Ceres with the crew who came, Bexa and Pax.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A hand at Ceres with the share's offer open, signed through the page, the chain played to the end of chapter one.
const helpers = () => {
  window.toShare = (o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(); st.story.next = 1e9; st.tutorial = null;
    Object.assign(h, { beats: 2, beatRun: -2, flags: { sawHull: true }, debt: 0 });
    h.deal = { price: BUY_IN.mid, day: st.day, broker: false }; st.credits = 60000;
    if (o.alone) for (const id of [...st.crew]) { const p = person(id); if (p && p.cast) p.opinion = -3; }
    if (o.alone) { const cato = castPerson('cato'); G.state.people[cato.id].dead = true; st.crew = st.crew.filter(id => id !== cato.id); }
    st.systemId = 'ceres'; st.planet = 'Ceres Station'; G.mode = 'landed';
    hired().confirm = USED_ID; Mods.act('buyInGo', USED_ID);
    const titles = []; let guard = 20;
    while (G.dialog && G.dialog.event.title !== 'The End of Chapter One' && guard--) { titles.push(G.dialog.event.title); chooseEvent(0); finishEvent(); }
    return titles;
  };
  window.goOnAndPick = (i = 0) => {
    UI.act('choose', '0');  // Go on
    const start = G.dialog && G.dialog.event, names = start ? start.choices.map(c => c.label) : [];
    UI.act('choose', String(i)); finishEvent();
    return { title: start && start.title, names };
  };
  window.chapterTwoView = () => {
    const st = G.state, h = st.hired, cap = hiredCaptain();
    return { chapter: chapterOf(st), role: role().id, masters: h && h.masters, key: cap && cap.captainKey, ship: st.shipId, planet: st.planet, mode: G.mode,
      crew: st.crew.map(person).map(p => ({ cast: p.cast, role: p.role })), gunner: postHolder('gunner') === null || (postHolder('gunner') && postHolder('gunner').role === 'you'),
      dialog: !!G.dialog, condition: st.condition, armor: st.armor === ship().armor };
  };
};

test('signing the share and going on: three masters, one picked, the Ore Runner landed at Ceres with Bexa and Pax', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare(); const over = G.dialog && G.dialog.event; const label = over && over.choices[0].label; const pick = goOnAndPick(0); return { label, pick, v: chapterTwoView() }; });
  await done();
  assert.equal(r.label, 'Go on');
  assert.equal(r.pick.title, 'Three Names');
  assert.equal(r.pick.names.length, 3);
  assert.equal(r.v.chapter, 2); assert.equal(r.v.role, 'coop');
  assert.equal(r.v.masters.length, 3); assert.equal(r.v.key, r.v.masters[0]);
  assert.equal(r.v.ship, 'lightfreighter'); assert.equal(r.v.planet, 'Ceres Station'); assert.equal(r.v.mode, 'landed'); assert.equal(r.v.dialog, false);
  assert.deepEqual(r.v.condition, { drive: 70, life: 65, shields: 60, sensors: 70, fire: 45 }); assert.equal(r.v.armor, true);
  assert.ok(r.v.crew.some(c => c.cast === 'bexa' && c.role === 'icehand'), JSON.stringify(r.v.crew));
  assert.ok(r.v.crew.some(c => c.cast === 'pax' && c.role === 'gunner'), JSON.stringify(r.v.crew));
  assert.ok(r.v.crew.some(c => c.cast === 'cato'), 'Cato came');
});

test('a hand who came alone starts with Bexa, Pax and the master, and can take off with no pilot', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare({ alone: true }); goOnAndPick(1); const v = chapterTwoView(); let err = null; try { takeOff(); } catch (e) { err = String(e); } return { v, pilot: !!roleHolder('pilot'), err, mode: G.mode }; });
  await done();
  assert.deepEqual(r.v.crew.map(c => c.cast).sort(), ['bexa', 'pax']);
  assert.equal(r.pilot, false); assert.equal(r.err, null); assert.equal(r.mode, 'flight');
});

test('a chapter-two save reloads as chapter two, the master aboard and nothing open', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare(); goOnAndPick(2); const key = hiredCaptain().captainKey; save(); loadGame(); while (G.dialog && G.dialog.event.title !== 'The End of Chapter One' && G.dialog.event.title !== 'Three Names') finishEvent(); return { key, v: chapterTwoView(), title: G.dialog && G.dialog.event.title }; });
  await done();
  assert.equal(r.title, null); assert.equal(r.v.role, 'coop'); assert.equal(r.v.key, r.key);
});

test('a finished save from before chapter two goes on the same way', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.career = { ...careerOf(hired()), came: [castPerson('cato').id], signed: st.day, share: { coop: 'Ceres Station', buyIn: 57000, owed: 93000 }, finished: true };
    st.crew = [castPerson('cato').id]; st.hired = null; save(); loadGame();
    const over = G.dialog && G.dialog.event.title, pick = goOnAndPick(0);
    return { over, pick, v: chapterTwoView(), share: hired() && hired().share };
  });
  await done();
  assert.equal(r.over, 'The End of Chapter One'); assert.equal(r.pick.names.length, 3);
  assert.equal(r.v.chapter, 2); assert.equal(r.v.ship, 'lightfreighter');
  assert.deepEqual(r.share, { coop: 'Ceres Station', buyIn: 57000, owed: 93000 });
  assert.ok(r.v.crew.some(c => c.cast === 'cato'));
});
