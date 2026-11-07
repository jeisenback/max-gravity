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

// ---------- Task 4: the co-op's board and exchange, and nothing of chapter one's own ----------

const started = () => {
  window.coopAt = (i = 0) => { toShare(); goOnAndPick(i); const st = G.state; st.story.next = 1e9; G.dialog = null; G.nextEvent = null; UI.notes.length = 0; return st; };
  window.contract = (o = {}) => ({ shipper: 'the Compact Freight Office', good: 'water', tons: 20, from: 'Ceres Station', sid: 'mars', planet: 'Mars', yard: false, days: 5, pay: 12000, due: G.state.day + 9, hazard: false, rumor: false, ...o });
  window.landAtPort = (sid, planet) => { const st = G.state; G.transit = null; st.systemId = sid; st.planet = planet; G.mode = 'landed'; G.dialog = null; G.nextEvent = null; st.customs = { ...(st.customs || {}), last: st.day };
    const titles = []; Mods.emit('landed', currentPlanet()); let guard = 10; while (G.dialog && guard--) { titles.push(G.dialog.event.title); chooseEvent(0); finishEvent(); } return titles; };
};

test('the co-op takes a contract from the board and is paid into the fund, with no wage', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), h = hired(); UI.tab = 'port'; UI.render();
    const board = document.querySelectorAll('button[data-action="takeContract"]').length;
    career().freight = { key: `${currentPlanet().name}@${st.day}`, list: [contract()] };
    const took = takeContract(0), fund0 = h.fund, c0 = st.credits; UI.notes.length = 0;
    st.day += 5; landAtPort('mars', 'Mars');
    return { board, took: !!took, paid: st.credits - c0, fund: h.fund - fund0, notes: UI.notes.join(' | ') };
  });
  await done();
  assert.ok(r.board >= 0); assert.equal(r.took, true);
  assert.equal(r.paid, 12000 - 0, `paid into the fund: ${r.notes}`); assert.equal(r.fund, 0, 'the captain\'s fund is not the co-op\'s');
  assert.doesNotMatch(r.notes, /wage/i);
});

test('the co-op trades on the exchange from its fund', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); st.credits = 50000; const ready = tabReady(currentPlanet(), 'trade'); const cid = Object.keys(currentPlanet().prices)[0]; const c0 = st.credits; UI.planet = currentPlanet(); UI.act('buy', cid); return { ready, bought: st.cargo[cid] || 0, spent: c0 - st.credits }; });
  await done();
  assert.equal(r.ready, true); assert.equal(r.bought, 1); assert.ok(r.spent > 0);
});

test('the leak test: three landings in chapter two play nothing of chapter one\'s own, and fuel is not topped up for free', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), seen = [], fuel = [];
    for (const [sid, pl] of [['mars', 'Mars'], ['earth', 'Earth'], ['ceres', 'Ceres Station']]) {
      st.day += 6; st.fuel = 50; seen.push(...landAtPort(sid, pl)); fuel.push(st.fuel);
      seen.push(...UI.notes); UI.notes.length = 0;
    }
    return { seen, fuel, offers: (G.offers || []).filter(o => o.errand).length, tutorial: st.tutorial };
  });
  await done();
  const chapterOne = /The End of Chapter One|A Member's Share|Gone From the Apron|The Empty Cradle|Settling Up|wage|savings|buy-in|hire-purchase/i;
  assert.deepEqual(r.seen.filter(t => chapterOne.test(t)), [], r.seen.join(' | '));
  assert.deepEqual(r.fuel, [50, 50, 50], 'the co-op buys its own fuel');
  assert.equal(r.offers, 0, 'no errands board'); assert.equal(r.tutorial, null);
});

test('the co-op\'s shipyard refuels, repairs and fits out, sells no ship, and the Port page has no chapter-one panels', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(); st.credits = 50000; st.fuel = 10;
    const text = tab => { UI.tab = tab; UI.render(); return document.querySelector('.shell .body').textContent.replace(/\s+/g, ' '); };
    const yard = text('shipyard'), port = text('port'), buttons = [...document.querySelectorAll('.shell button[data-action]')].map(b => b.dataset.action);
    UI.tab = 'shipyard'; UI.render(); const yardButtons = [...document.querySelectorAll('.shell button[data-action]')].map(b => b.dataset.action);
    return { yard, port, buttons, yardButtons };
  });
  await done();
  assert.doesNotMatch(r.yard, /member's share|Sign on|savings/i, r.yard.slice(0, 300));
  assert.ok(r.buttons.includes('refuel'), `the Port page refuels: ${r.buttons.join(',')}`); assert.ok(r.yardButtons.includes('buyout'), 'outfits are fitted');
  assert.ok(!r.yardButtons.includes('buyship') && !r.yardButtons.includes('buyInAsk') && !r.yardButtons.includes('cbuy'), r.yardButtons.join(','));
  assert.doesNotMatch(r.port, /member's share|buy-in|your savings/i, r.port.slice(0, 400));
});

test('a fight that ends the hand\'s life in chapter two ends the run as in chapter one, naming the master', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); const cap = hiredCaptain(); handDies({}, 'first'); const e = G.nextEvent; return { canDie: role().canDie, title: e && e.title, text: e && e.text, choices: e && e.choices.map(c => c.label), last: cap.last }; });
  await done();
  assert.equal(r.canDie, true); assert.equal(r.title, 'The Last Run'); assert.deepEqual(r.choices, ['Begin again']);
  assert.ok(r.text.includes(r.last), 'the master says it'); assert.doesNotMatch(r.text, /undefined|NaN|Hester/);
});
