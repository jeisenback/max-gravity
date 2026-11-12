'use strict';

// The port view (#1101, docs/bible/ports.md): a port that has a layout is drawn as a place on its Port page, in a tall strip in place of the painted
// backdrop; the layout is data, and every room in it has a drawer. The look is checked by eye against docs/bible/ports-target.png.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const { PORT_LAYOUTS, PORT_ROOMS } = load(['js/portview.js'], {}, ['PORT_LAYOUTS', 'PORT_ROOMS']);

test('a port\'s layout is whole: every room has a drawer, sits on one of its levels inside its width, and the rooms of a level meet without overlapping', () => {
  for (const [port, lay] of Object.entries(PORT_LAYOUTS)) {
    assert.ok(lay.place && lay.section && lay.berth, port);
    for (const rm of lay.rooms) {
      assert.equal(typeof PORT_ROOMS[rm.kind], 'function', `${port} ${rm.id}: ${rm.kind}`);
      assert.ok(lay.levels[rm.level] !== undefined, `${port} ${rm.id}: a level`);
      assert.ok(rm.x0 >= 0 && rm.x1 <= lay.width && rm.x0 < rm.x1, `${port} ${rm.id}: inside`);
    }
    lay.levels.forEach((_, L) => {
      const rooms = lay.rooms.filter(r => r.level === L).sort((a, b) => a.x0 - b.x0);
      assert.ok(rooms.length, `${port} level ${L} has rooms`);
      assert.equal(rooms[0].x0, 0); assert.equal(rooms[rooms.length - 1].x1, lay.width);
      for (let i = 1; i < rooms.length; i++) assert.equal(rooms[i].x0, rooms[i - 1].x1, `${port} level ${L}: ${rooms[i - 1].id} meets ${rooms[i].id}`);
    });
  }
  assert.deepEqual(Object.keys(PORT_LAYOUTS), ['Earth'], 'Earth\'s port, Lagos Ring, first');
});

test('at Earth the Port page draws the Ring in a tall strip, at 12 px or more; another page, or another port, keeps the painted strip', async () => {
  const { page, ev, errors, done } = await open();
  await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); UI.tab = 'port'; UI.render(); });
  await frames(page, 3);
  const r = await ev(() => {
    const strip = () => { const c = document.getElementById('vs'); return { view: c.classList.contains('view'), h: c.clientHeight }; };
    const sizes = [], texts = [], real = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); sizes.push(m ? Number(m[1]) : 0); texts.push(String(s)); return real.call(this, s, ...a); };
    try { drawViewscreen(performance.now()); } finally { CanvasRenderingContext2D.prototype.fillText = real; }
    const out = { earth: strip(), sizes, texts };
    UI.tab = 'bar'; UI.render(); out.bar = strip();
    const st = G.state; st.systemId = 'mars'; st.planet = 'Mars'; UI.planet = currentPlanet(); UI.tab = 'port'; UI.render(); out.mars = strip();
    return out;
  });
  await done();
  assert.equal(r.earth.view, true); assert.ok(r.earth.h > 300, `a tall strip: ${r.earth.h}`);
  assert.ok(r.texts.includes('LAGOS RING  -  RIM, SECTION 14') && r.texts.includes('THE GRAVITY WELL'), r.texts.join(' | '));
  assert.ok(Math.min(...r.sizes) >= 12, `text at ${Math.min(...r.sizes)} px`);
  assert.equal(r.bar.view, false, 'the Bar page keeps the painted strip'); assert.equal(r.mars.view, false, 'a port with no layout keeps it');
  assert.deepEqual(errors, []);
});
