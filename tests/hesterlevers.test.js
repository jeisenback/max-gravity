'use strict';

// The levers on Hester's regard (#1059, docs/bible/chapter-1.md, Hester's regard): when the hand may check her figures, when she asks the hand to wait for their pay
// and how it is paid back, and which runs come in on her figure. What each lever says and does, choice by choice, is pinned (scene-lines-pin.json, scenepin.test.js);
// the inspection's landed move is inspection.test.js's.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const run = async (fn, o) => { const t = await open(o); const r = await t.ev(fn); await t.done(); return r; };

test('her figures are a hand\'s downtime on a captain who keeps a notebook, every fifteen days at most', async () => {
  const r = await run(() => {
    const start = (o = {}) => { startGame({ slot: 1, background: 'earth', mode: 'hired', post: 'gunner', captainKey: 'hester', ...o }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; G.state.tutorial = null; G.dialog = null; G.nextEvent = null; return G.state; };
    const st = start(), h = hired(), out = {};
    out.fresh = figuresDue(st, h);
    h.figuresAt = st.day; out.same = figuresDue(st, h);
    st.day += FIGURES_GAP - 1; out.early = figuresDue(st, h);
    st.day += 1; out.due = figuresDue(st, h);
    out.listed = baseActivities().includes(ACTIVITIES.figures);
    start({ captainKey: 'dov' }); out.dov = figuresDue(G.state, hired());
    return out;
  }, { scope: 'full' });
  assert.deepEqual([r.fresh, r.same, r.early, r.due], [true, false, false, true]);
  assert.equal(r.listed, true, 'a hand\'s downtime'); assert.equal(r.dov, false, 'a captain with no notebook has no figures to check');
});

test('a short month asks once a month, after her own first-of-the-month scene, while the fund is short; the pay held comes back on landing with its interest', async () => {
  const r = await run(() => {
    const start = (o = {}) => { startGame({ slot: 1, background: 'earth', mode: 'hired', post: 'gunner', captainKey: 'hester', ...o }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; G.state.tutorial = null; G.dialog = null; G.nextEvent = null; return G.state; };
    const st = start(), h = hired(), out = {};
    h.fund = SHORT_FUND - 1; h.beats = 0; out.beforeTrouble = shortMonthDue(st, h);
    h.beats = 1; out.due = shortMonthDue(st, h);
    h.fund = SHORT_FUND; out.flush = shortMonthDue(st, h); h.fund = SHORT_FUND - 1;
    const ev = HAND_EVENTS.find(x => x.id === 'cap-short').make(handContext()); out.again = shortMonthDue(st, h);
    st.day += 31; out.nextMonth = shortMonthDue(st, h);
    st.credits = SHORT_PAY - 1; out.shut = !!ev.choices[0].can && !ev.choices[0].can();
    st.credits = 5000; ev.choices[0].run(); out.held = h.heldPay; out.paid = st.credits;
    UI.notes.length = 0; G.dialog = null; Mods.emit('landed', currentPlanet()); out.back = st.credits; out.after = h.heldPay; out.note = UI.notes.join(' ');
    return out;
  });
  assert.equal(r.beforeTrouble, false, 'not before her first-of-the-month scene'); assert.equal(r.due, true); assert.equal(r.flush, false, 'not with the fund at the mark');
  assert.equal(r.again, false, 'once a month'); assert.equal(r.nextMonth, true, 'and again the next');
  assert.equal(r.shut, true, 'shut to a hand without the pay to hold');
  assert.equal(r.held, 1030); assert.equal(r.paid, 4000); assert.equal(r.back, 5030); assert.equal(r.after, 0); assert.match(r.note, /pays back the 1,030 she held/);
});

test('a run comes in on her figure when it is delivered on its day, whole, with the hull as it left', async () => {
  const r = await run(() => {
    const run = { contract: true, tons: 10, due: 20 };
    return [onFigure(run, 10, 20, 100, 100), onFigure(run, 10, 21, 100, 100), onFigure(run, 9, 20, 100, 100), onFigure(run, 10, 20, 90, 100), onFigure({ ...run, contract: false }, 10, 20, 100, 100)];
  });
  assert.deepEqual(r, [true, false, false, false, false], 'on its day and whole and unhurt, and a contract');
});
