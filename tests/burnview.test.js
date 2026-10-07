'use strict';

// The burn view: the instruments follow a real constant-thrust burn, the cutaway is drawn larger on a wide screen with the hull's
// detail, and a click still finds the person it was aimed at.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.burn = (shipId) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; if (shipId) st.shipId = shipId;
    sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null;
    return st;
  };
};

test('the instruments follow the burn: from rest up to a peak at the flip, then back, with the thrust steady either side', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, out = {};
    const at = f => { t.left = t.total * (1 - f); return burnState(); };
    const a = at(0.02), b = at(0.25), c = at(0.5), d = at(0.75), e = at(0.98);
    out.rises = a.v < b.v && b.v < c.v; out.falls = c.v > d.v && d.v > e.v; out.peak = Math.abs(c.v - c.peak) < c.peak * 0.01;
    out.steady = Math.abs(b.g - d.g) < 1e-9 && b.g > 0 && at(0.5).phase === 'FLIP' && at(0.5).g === 0;
    out.covered = at(0.5).covered / at(0.5).dist; out.end = at(1).covered / at(1).dist; out.text = fmtKms(c.v);
    out.phases = [a.phase, d.phase, c.phase];
    return out;
  });
  assert.ok(r.rises && r.falls && r.peak && r.steady); assert.ok(Math.abs(r.covered - 0.5) < 0.01 && Math.abs(r.end - 1) < 0.01);
  assert.match(r.text, /^\d[\d,]* km\/s$/); assert.deepEqual(r.phases, ['BURN', 'BRAKE', 'FLIP']);
  await done();
});

test('with an event open, the Comms box stays clear of the dialog on a wide screen and a phone (#262)', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => {
      burn(); G.transit.left = G.transit.total * 0.5;
      for (const c of ['[Comms] The station refuses to say what it is carrying or where it is going, and logs a hail twice.', 'Rosa: "If you hear a clank, that is normal."', '[Market] Water is up at Ceres by a tenth after the strike.']) comm(c);
      openEvent({ title: 'Distress Call', text: 'A ship is drifting across your path with her drive dark: disabled, and armed, going by the way she is not answering. The captain says it is your call.', choices: [{ label: 'See how it goes', run: () => 'Done.' }] });
    });
    await page.waitForTimeout(400);
    const r = await ev(() => {
      const d = document.querySelector('#panel.event').getBoundingClientRect(), c = canvas.getBoundingClientRect(), box = G.commsBox;
      return { box, dialog: { x: d.left - c.left, y: d.top - c.top } };
    });
    assert.ok(r.box, `${name}: the Comms box is drawn`);
    if (name === 'wide') assert.ok(r.box.x + r.box.w <= r.dialog.x - 8, `wide: the box ends at ${r.box.x + r.box.w}, the dialog starts at ${r.dialog.x}`);
    else assert.ok(r.box.y + r.box.h <= r.dialog.y - 4, `phone: the box ends at ${r.box.y + r.box.h}, the dialog starts at ${r.dialog.y}`);
    await done();
  }
});

test('the burn view draws for every ship and every turn of the hull without an error, and the click targets stay put', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = { drawn: 0, errors: [] }, W = innerWidth, H = innerHeight;
    for (const shipId of ['shuttle', 'lightfreighter', 'courier', 'freighter', 'gunship']) {
      burn(shipId); const t = G.transit; G.state.armor = Math.round(ship().armor * 0.4);  // scarred, too
      for (const [frac, angle, flipped] of [[0.05, -Math.PI / 2, false], [0.4, -Math.PI / 2, false], [0.5, 0, false], [0.6, Math.PI / 2, true], [0.95, Math.PI / 2, true]]) {
        t.left = t.total * (1 - frac); t.angle = angle; t.flipped = flipped;
        try { drawTransit(W, H); out.drawn++; } catch (e) { out.errors.push(`${shipId}:${frac}:${e.message}`); }
      }
    }
    burn(); const t = G.transit; t.left = t.total * 0.4; t.angle = -Math.PI / 2; t.flipped = false;
    drawTransit(W, H); const first = JSON.stringify(G.cutHits); drawTransit(W, H); out.stable = first === JSON.stringify(G.cutHits); out.hits = G.cutHits.length;
    out.inside = G.cutHits.every(h => h.x > 0 && h.x < W && h.y > 0 && h.y < H);
    t.angle = 0; drawTransit(W, H); out.midTurn = G.cutHits.length === 0;
    return out;
  });
  assert.deepEqual(r.errors, []); assert.equal(r.drawn, 25); assert.ok(r.stable, 'the hits do not drift'); assert.ok(r.hits > 3); assert.ok(r.inside); assert.ok(r.midTurn);
  await done();
});
