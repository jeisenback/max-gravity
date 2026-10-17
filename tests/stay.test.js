'use strict';

// A stay in port (js/stay.js): the yard's days and a wait for the market pass as nights the hand can fill, the bar filling
// again each night and the dock bringing what it brings, with the job board the visit's and the ship sailing only after.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed'; hired().fund = 50000; hired().iceAt = st.day; hired().runsDone = 1;  // past the port she signed on at: the market wait is on
    G.dialog = null; G.nextEvent = null;
    return st;
  };
  window.landHere = () => { G.dialog = null; G.nextEvent = null; Mods.emit('landed', currentPlanet()); while (G.dialog) finishEvent(); };
};

test('a yard stay passes a night at a time: the day turns, the bar fills again, the board is the visit\'s, and she sails after', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {}, max = ship().armor;
    landHere();
    st.armor = max - Math.floor(max * 0.4); Mods.emit('landed', currentPlanet());  // real damage: the yard scene
    const d = G.dialog; chooseEvent(d.choices.findIndex(c => /Stand by/.test(c.label))); G.dialog = null; G.nextEvent = null;
    const left = h.stay.left, day0 = st.day, patrons0 = G.patrons, board0 = jobBoard(); board0.done = true;
    out.stay = { left, why: h.stay.why, dayHeld: st.day === day0, noSail: sail() === false, button: UI.dockHtml() };
    out.night = passNight(); G.dialog = null; G.nextEvent = null;
    out.after = { day: st.day - day0, left: h.stay ? h.stay.left : 0, newPatrons: G.patrons !== patrons0, boardKey: jobBoard().key === board0.key, boardDone: jobBoard().done, button: UI.dockHtml() };
    while (stayOf(h)) { passNight(); G.dialog = null; G.nextEvent = null; }
    out.end = { stay: !!h.stay, days: st.day - day0, button: UI.dockHtml(), idle: passNight() };
    return out;
  });
  assert.ok(r.stay.left >= 1 && r.stay.why === 'yard' && r.stay.dayHeld && r.stay.noSail, JSON.stringify(r.stay));
  assert.match(r.stay.button, /data-action="night"[^>]*>Pass the night \(the hull is in the yard, \d+ more days?\)/); assert.doesNotMatch(r.stay.button, /data-action="sail"/);
  assert.ok(r.night); assert.equal(r.after.day, 1); assert.equal(r.after.left, r.stay.left - 1);
  assert.ok(r.after.newPatrons, 'the bar fills again'); assert.ok(r.after.boardKey && r.after.boardDone, 'the job board is the visit\'s, and the job worked stays worked');
  assert.equal(r.end.days, r.stay.left); assert.ok(!r.end.stay); assert.match(r.end.button, /Sail with the captain/); assert.equal(r.end.idle, false, 'no stay, no night');
  await done();
});

test('when nothing here is worth the fuel the captain waits three days for the market, not when a yard is in reach with your money', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    h.freight = { key: `${st.planet}@${st.day}`, list: [] }; h.plan = null;  // nothing on the board: a light run
    out.ballast = !!(currentPlan() && currentPlan().ballast);
    UI.notes.length = 0; landHere();
    out.wait = h.stay ? { ...h.stay } : null; out.note = UI.notes.find(n => /waiting 3 days for a shipper/.test(n)) || '';
    out.visit = h.visit && h.visit.planet === st.planet && h.visit.day === st.day;
    while (stayOf(h)) { passNight(); G.dialog = null; G.nextEvent = null; }
    out.planned = !!currentPlan();
    // a longer stay takes over, a shorter one never shortens
    beginStay(h, 2, 'market'); beginStay(h, 5, 'yard'); out.longer = { ...h.stay }; beginStay(h, 1, 'market'); out.kept = h.stay.left;
    delete h.stay;
    // with the money for a ship she heads for a yard instead of waiting
    st.credits = 60000; h.plan = null; landHere(); out.yardBound = h.stay ? { ...h.stay } : null;
    // a port that does not trade is no market to wait for
    st.credits = 500; h.plan = null; G.dialog = null; Mods.emit('landed', { ...currentPlanet(), services: ['refuel'] }); out.noTrade = h.stay ? { ...h.stay } : null;
    return out;
  });
  assert.ok(r.ballast, 'the test starts from a light run');
  assert.deepEqual(r.wait, { left: 3, why: 'market' }); assert.ok(r.note, 'the port page says so'); assert.ok(r.visit);
  assert.ok(r.planned, 'after the stay the captain plans again');
  assert.deepEqual(r.longer, { left: 5, why: 'yard' }); assert.equal(r.kept, 5);
  assert.equal(r.yardBound, null); assert.equal(r.noTrade, null);
  await done();
});

test('a night can bring something to the dock, and the T key passes the night while a stay is on', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), out = {};
    landHere(); delete h.stay; beginStay(h, 2, 'yard');
    const real = pickHappening; window.pickHappening = (where, planet) => (where === 'port' && planet.name === st.planet ? { title: 'Night Test', text: 'x', choices: [{ label: 'ok', run: () => 'y' }] } : null);
    const day0 = st.day;
    G.paused = false; window.dispatchEvent(new KeyboardEvent('keydown', { code: 'KeyT' }));
    out.scene = G.dialog ? G.dialog.event.title : null; out.day = st.day - day0; out.left = h.stay.left;
    out.busy = passNight();  // a scene is open: the night waits
    G.dialog = null; window.pickHappening = real;
    return out;
  });
  assert.equal(r.scene, 'Night Test'); assert.equal(r.day, 1); assert.equal(r.left, 1); assert.equal(r.busy, false);
  await done();
});
