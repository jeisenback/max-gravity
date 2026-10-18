'use strict';

// A day ashore (js/dayashore.js, #675): the hand's hour at a port, once a landing, in a menu of five from three lanes that turns with the day, and Not now. The turn in plain Node, the
// button and the once-a-landing rule in the page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { menuFive, ashoreOpen, walkKind } = load(['js/shiplife.js', 'js/dayashore.js'], { Mods: { register() {} } }, ['menuFive', 'ashoreOpen', 'walkKind']);
const lane = (tag, n) => Array.from({ length: n }, (_, i) => `${tag}${i}`);

test('the menu is five at most, one from each lane in turn, started at the day\'s place in each lane; fewer than five are all shown; the days turn it', () => {
  const lanes = [lane('p', 3), lane('h', 1), lane('n', 4)];
  assert.deepEqual([...menuFive(lanes, 0)], ['p0', 'h0', 'n0', 'p1', 'n1']);
  assert.deepEqual([...menuFive(lanes, 1)], ['p1', 'h0', 'n1', 'p2', 'n2']);
  assert.notDeepEqual([...menuFive(lanes, 2)], [...menuFive(lanes, 0)]);
  const seen = new Set(); for (let d = 0; d < 12; d++) for (const e of menuFive(lanes, d)) seen.add(e);
  assert.equal(seen.size, 8, 'every entry comes round');
  assert.deepEqual([...menuFive([['a'], [], ['b', 'c']], 5)].sort(), ['a', 'b', 'c'], 'few are all shown');
  assert.deepEqual([...menuFive([[], [], []], 3)], []);
});

test('the hour is open until it is spent, and a walk reads the port: the talk, the yard, else the market', () => {
  assert.equal(ashoreOpen({}), true); assert.equal(ashoreOpen({ dayAshore: { used: false } }), true); assert.equal(ashoreOpen({ dayAshore: { used: true } }), false);
  const planet = services => ({ services });
  assert.equal(walkKind(planet(['trade', 'shipyard']), true), 'rumor'); assert.equal(walkKind(planet(['trade', 'shipyard']), false), 'yard');
  assert.equal(walkKind(planet(['trade']), false), 'market'); assert.equal(walkKind(planet(['shipyard']), false), 'yard');
});

const helpers = () => {
  window.landed = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.day += 30; G.transit = null; G.mode = 'landed'; st.dest = null; G.dialog = null; G.nextEvent = null; UI.notes.length = 0;
    Mods.emit('landed', currentPlanet()); G.dialog = null; G.nextEvent = null;
    return st;
  };
};
const run = async fn => { const t = await open(); await t.ev(helpers); const r = await t.ev(fn); await t.done(); return r; };

test('each landing offers one day ashore: the Port page has the button, taking an entry shuts it until the next landing, Not now spends nothing, and it takes no game day', async () => {
  const r = await run(() => {
    const st = landed(), out = {};
    UI.tab = 'port'; UI.render(); const btn = () => document.querySelector('button[data-action="dayAshore"]');
    out.open = !!btn() && !btn().disabled; out.hint = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    let ev = dayAshoreEvent(); out.title = ev.title; out.n = ev.choices.length; out.last = String(ev.choices[ev.choices.length - 1].label);
    out.none = ev.choices[ev.choices.length - 1].run(); out.afterNone = ashoreOpen(st);
    const day = st.day; const walk = ev.choices.find(c => /^Walk through/.test(c.label)); out.walk = walk.run(); out.afterWalk = ashoreOpen(st); out.day = st.day - day;
    UI.render(); out.shut = !!btn() && btn().disabled; out.hintSpent = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    Mods.emit('landed', currentPlanet()); G.dialog = null; G.nextEvent = null; out.again = ashoreOpen(st);
    return out;
  });
  assert.ok(r.open); assert.match(r.hint, /One hour of your own at each landing\./); assert.equal(r.title, 'A Day Ashore'); assert.ok(r.n >= 2 && r.n <= 6, 'five at most, and Not now'); assert.equal(r.last, 'Not now');
  assert.match(r.none, /watch the dock go by/); assert.equal(r.afterNone, true, 'Not now spends nothing');
  assert.ok(r.walk.length > 40); assert.equal(r.afterWalk, false); assert.equal(r.day, 0, 'no game day');
  assert.ok(r.shut); assert.match(r.hintSpent, /You have had your hour here\./); assert.equal(r.again, true, 'the next landing opens it again');
});

test('the hour is the hand\'s: an owner\'s Port page has no button, and the action does nothing', async () => {
  const r = await run(() => {
    const st = landed(); st.hired = null; st.career = { post: 'gunner' }; UI.tab = 'port'; UI.render();
    return { button: !!document.querySelector('button[data-action="dayAshore"]'), html: dayAshoreHtml() };
  });
  assert.equal(r.button, false); assert.equal(r.html, '');
});
