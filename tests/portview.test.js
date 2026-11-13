'use strict';

// The port view (#1101, docs/bible/ports.md): a port that has a layout is drawn as a place on its Port page, in a tall strip in place of the painted
// backdrop; the layout is data, and every room in it has a drawer. The look is checked by eye against docs/bible/ports-target.png.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const { PORT_LAYOUTS, PORT_ROOMS, portCast, portOpen } = load(['js/util.js', 'js/portview.js'], { Mods: { register() {} } }, ['PORT_LAYOUTS', 'PORT_ROOMS', 'portCast', 'portOpen']);

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

test('the Ring\'s people keep its hours: the port\'s own at work in their hours, the bar\'s patrons while it is open, workers at the boards by day and the lobby at a shift, the crew ashore (#1102)', () => {
  const lay = PORT_LAYOUTS.Earth, plain = x => JSON.parse(JSON.stringify(x));
  const patrons = [1, 2, 3, 4, 5].map(i => ({ id: `patron:${i}` })), crew = [{ id: 'c1', role: 'engineer' }, { id: 'c2', role: 'pilot' }];
  const at = h => plain(portCast(lay, h, patrons, crew, 40)), folk = h => at(h).filter(c => c.kind === 'folk').map(c => c.who).sort();
  assert.deepEqual(folk(10), ['clerk', 'ngozi', 'nurse', 'repairer'], 'a morning: the keeper is not in yet');
  assert.deepEqual(folk(19.5), ['keeper', 'ngozi', 'nurse']);
  assert.deepEqual(folk(23), ['keeper']); assert.deepEqual(folk(1), ['keeper'], 'the Gravity Well is open past midnight'); assert.deepEqual(folk(3), []);
  assert.equal(portOpen([11, 26], 1), true); assert.equal(portOpen([11, 26], 3), false); assert.equal(portOpen([6, 21], 21), false);
  const evening = at(20), morning = at(10), night = at(3);
  assert.ok(evening.filter(c => c.kind === 'patron').length >= 4, 'the stools fill after five'); assert.equal(morning.filter(c => c.kind === 'patron').length, 0, 'the bar is shut in the morning');
  assert.equal(night.length, 0, 'at three in the morning nobody is about');
  assert.ok(morning.some(c => c.kind === 'worker' && c.room === 'yard'), 'workers at the hiring boards by day'); assert.ok(at(14).some(c => c.room === 'lift'), 'the lobby at a shift change');
  assert.ok(morning.some(c => c.kind === 'crew' && c.room === 'market') && evening.some(c => c.kind === 'crew' && c.room === 'bar'), 'the crew ashore: the market by day, the bar after it');
  for (const h of [6, 10, 14, 19.5, 23]) { const c = at(h), spots = c.map(x => `${x.room}:${x.x}`); assert.equal(new Set(spots).size, spots.length, `${h}: nobody stands on anybody`); assert.equal(new Set(c.map(x => x.who)).size, c.length, `${h}: nobody twice`); }
  assert.deepEqual(at(10), at(10), 'the same hour and day, the same people');
});

test('the Ring\'s clock: a landing comes in at an hour of its own, runs while the port is on screen, stops at night and under a scene, and a night passed wakes at seven; its own people are the same on every visit and stay off the bar\'s stools (#1102)', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const out = { arrived: G.portHour };
    G.portHour = 10; Mods.emit('frame', 8); out.ran = +(G.portHour - 10).toFixed(3);
    G.portHour = 21.9; Mods.emit('frame', 80); out.night = G.portHour;
    openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); G.portHour = 12; Mods.emit('frame', 8); out.held = G.portHour; G.dialog = null;
    Mods.emit('newDay', G.state.day + 1); out.morning = G.portHour;
    const planet = currentPlanet(), lay = portLayout(planet), a = portFolkPerson(planet, lay.folk[0]), b = portFolkPerson(planet, lay.folk[0]);
    out.ngozi = [a.first, a.last, a.id === b.id, a.portFolk];
    fillBar(planet); out.onStools = (G.patrons || []).some(x => x.p.portFolk);
    const st = G.state; st.systemId = 'mars'; st.planet = 'Mars'; Mods.emit('landed', currentPlanet()); out.mars = G.portHour;
    return out;
  });
  await done();
  assert.ok(r.arrived >= 8 && r.arrived < 20, `a landing at ${r.arrived}`);
  assert.equal(r.ran, 2.4, 'eight seconds at the burn view\'s pace is 2.4 hours'); assert.equal(r.night, 22, 'it stops at night'); assert.equal(r.held, 12, 'and under a scene');
  assert.equal(r.morning, 7); assert.deepEqual(r.ngozi, ['Ngozi', 'Achebe', true, 'Earth']); assert.equal(r.onStools, false); assert.equal(r.mars, null, 'a port with no view has no clock');
});
