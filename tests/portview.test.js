'use strict';

// The port view (#1101, docs/bible/ports.md): a port that has a layout is drawn as a place on its Port page, in a tall strip in place of the painted
// backdrop; the layout is data, and every room in it has a drawer. The look is checked by eye against docs/bible/ports-target.png.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const { PORT_LAYOUTS, PORT_ROOMS, portCast, portOpen, portWalk, portRoomAt } = load(['js/util.js', 'js/portview.js'], { Mods: { register() {} } }, ['PORT_LAYOUTS', 'PORT_ROOMS', 'portCast', 'portOpen', 'portWalk', 'portRoomAt']);

test('a port\'s layout is whole: every room has a drawer, sits on one of its levels inside its width, and the rooms of a level meet without overlapping, each level\'s run from the well (#1124)', () => {
  for (const [port, lay] of Object.entries(PORT_LAYOUTS)) {
    assert.ok(lay.place && lay.section && lay.berth, port);
    for (const rm of lay.rooms) {
      assert.equal(typeof PORT_ROOMS[rm.kind], 'function', `${port} ${rm.id}: ${rm.kind}`);
      assert.ok(lay.levels[rm.level] !== undefined, `${port} ${rm.id}: a level`);
      assert.ok(rm.x0 >= 0 && rm.x1 <= lay.width && rm.x0 < rm.x1, `${port} ${rm.id}: inside`);
    }
    lay.levels.forEach((_, L) => {
      const rooms = lay.rooms.filter(r => r.level === L || (r.level < L && r.to >= L)).sort((a, b) => a.x0 - b.x0);
      assert.ok(rooms.length > 1, `${port} level ${L} has rooms`);
      assert.equal(rooms[0].x0, 0); assert.equal(rooms[0].kind, 'well', `${port} level ${L}: every room on it is reached from the well`); assert.equal(rooms[rooms.length - 1].x1, lay.width);
      for (let i = 1; i < rooms.length; i++) assert.equal(rooms[i].x0, rooms[i - 1].x1, `${port} level ${L}: ${rooms[i - 1].id} meets ${rooms[i].id}`);
    });
  }
  assert.deepEqual(Object.keys(PORT_LAYOUTS), ['Earth'], 'Earth\'s port, Lagos Ring, first');
});

test('at Earth the Ring is the stage on every page, with the notes in a ticker under it when nothing is open, drawn at 12 px or more, and the page docks beside it on a wide window and under it on a narrower one; Close gives the view the stage and the rail opens it again; Mars keeps its strip (#1101, #1132)', async () => {
  for (const [W, H, side] of [[1440, 900, true], [1000, 760, false]]) {
    const { page, ev, errors, done } = await open({ viewport: { width: W, height: H } });
    await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); UI.tab = 'port'; UI.render(); });
    await frames(page, 3);
    const r = await ev(() => {
      const box = sel => { const e = document.querySelector(sel); if (!e) return null; const b = e.getBoundingClientRect(); return { l: b.left, r: b.right, t: b.top, b: b.bottom, w: b.width, h: b.height }; };
      const sizes = [], texts = [], real = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { const m = /(\d+(?:\.\d+)?)px/.exec(this.font); sizes.push(m ? Number(m[1]) : 0); texts.push(String(s)); return real.call(this, s, ...a); };
      try { drawViewscreen(performance.now()); } finally { CanvasRenderingContext2D.prototype.fillText = real; }
      const out = { sizes, texts, pages: {} };
      for (const b of [...document.querySelectorAll('.rail button:not([disabled])')]) {
        b.click();
        const body = document.querySelector('.page .body');
        out.pages[b.textContent] = { view: !!document.querySelector('.shell.stage #vs.view'), body: !!body, over: body ? body.scrollWidth - body.clientWidth : -1, canvas: box('#vs'), page: box('.page') };
      }
      out.tickerOpen = !!document.querySelector('.ticker');
      UI.notes = ['one', 'two', 'three', 'four <b>'];
      document.querySelector('.page-bar button[data-action="closePage"]').click();
      out.closed = { page: !!document.querySelector('.page'), canvas: box('#vs'), lit: document.querySelectorAll('.rail button.active').length };
      out.ticker = { lines: [...document.querySelectorAll('.ticker li')].map(l => l.textContent), box: box('.ticker') };
      UI.notes = []; UI.render(); out.tickerNone = !!document.querySelector('.ticker');
      [...document.querySelectorAll('.rail button')].find(b => b.textContent === 'Bar').click();
      out.reopened = { page: !!document.querySelector('.page .body'), tab: UI.tab };
      const st = G.state; st.systemId = 'mars'; st.planet = 'Mars'; UI.planet = currentPlanet(); UI.tab = 'port'; UI.render();
      out.mars = { stage: !!document.querySelector('.shell.stage'), view: document.getElementById('vs').classList.contains('view') };
      return out;
    });
    await done();
    assert.ok(r.texts.includes('LAGOS TIME 18:00') || r.texts.some(t => t.startsWith('LAGOS TIME')), r.texts.join(' | '));
    assert.ok(r.texts.includes('THE GRAVITY WELL'), r.texts.join(' | '));
    assert.ok(Math.min(...r.sizes) >= 12, `text at ${Math.min(...r.sizes)} px`);
    assert.ok(Object.keys(r.pages).length >= 8, Object.keys(r.pages).join(', '));
    for (const [name, q] of Object.entries(r.pages)) {
      assert.ok(q.view && q.body, `${W}: ${name} shows the view with its page docked`);
      assert.ok(q.over <= 0, `${W}: ${name} does not overflow sideways (${q.over})`);
      if (side) assert.ok(q.page.l >= q.canvas.r - 1, `${W}: ${name} beside the view`); else assert.ok(q.page.t >= q.canvas.b - 1, `${W}: ${name} under the view`);
    }
    const one = Object.values(r.pages)[0];
    assert.equal(r.closed.page, false); assert.equal(r.closed.lit, 0, 'nothing open, nothing lit');
    assert.ok(r.closed.canvas.w * r.closed.canvas.h > one.canvas.w * one.canvas.h * 1.5, `${W}: closed, the view has the stage`);
    assert.deepEqual(r.reopened, { page: true, tab: 'bar' });
    assert.equal(r.tickerOpen, false, 'with a page open, the notes are on the Port page'); assert.equal(r.tickerNone, false, 'no notes, no ticker');
    assert.deepEqual(JSON.parse(JSON.stringify(r.ticker.lines)), ['two', 'three', 'four <b>'], 'nothing open: the newest three notes, as text, under the view (#1132)');
    assert.ok(r.ticker.box.t >= r.closed.canvas.b - 1 && r.ticker.box.l >= r.closed.canvas.l - 1, `${W}: the ticker under the view`);
    assert.deepEqual(r.mars, { stage: false, view: false }, 'a port with no layout keeps its strip');
    assert.deepEqual(errors, []);
  }
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
  assert.ok(morning.some(c => c.kind === 'worker' && c.room === 'yard'), 'workers at the hiring boards by day'); assert.ok(at(14).some(c => c.room === 'well' && c.lv === 0), 'the lobby at a shift change');
  assert.ok(morning.some(c => c.kind === 'crew' && c.room === 'market') && evening.some(c => c.kind === 'crew' && c.room === 'bar'), 'the crew ashore: the market by day, the bar after it');
  for (const h of [6, 10, 14, 19.5, 23]) { const c = at(h), spots = c.map(x => `${x.lv}:${x.x}`); assert.equal(new Set(spots).size, spots.length, `${h}: nobody stands on anybody`); assert.equal(new Set(c.map(x => x.who)).size, c.length, `${h}: nobody twice`); }
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

// Walk the cast from `from` to `to` (each a list of cast entries) a frame at a time until nobody moves, keeping every position on the way.
function walkOut(lay, from, to, frames = 4000) {
  let w = portWalk(null, from, lay, 0, true);
  const seen = [];
  for (let i = 0; i < frames; i++) { const n = portWalk(w, to, lay, 1 / 60, false); seen.push(...n.map(p => ({ ...p }))); if (JSON.stringify(n) === JSON.stringify(w)) break; w = n; }
  return { w, seen };
}

test('the Ring\'s people walk to where the hour puts them: between levels by the well, the stair for a storey and the car for more, arrivals down the spoke and leavers up it; the walk ends in the hour\'s place (#1124)', () => {
  const lay = PORT_LAYOUTS.Earth, well = lay.rooms.find(r => r.kind === 'well'), spoke = lay.levels.length;
  const at = (who, room, lv, x, name = 'stand') => ({ who, room, lv, x, name, view: 'front', face: 1, kind: 'folk' });
  const from = [at('a', 'market', 0, 300), at('b', 'bunks', 2, 600), at('c', 'bar', 0, 700), at('gone', 'yard', 1, 300)];
  const to = [at('a', 'yard', 1, 250, 'work-sit'), at('b', 'bar', 0, 800, 'sit'), at('c', 'bar', 0, 760), at('new', 'clinic', 1, 600)];
  const { w, seen } = walkOut(lay, from, to);
  assert.deepEqual(JSON.parse(JSON.stringify(w.map(p => [p.who, p.lv, p.x, p.name]).sort())), to.map(p => [p.who, p.lv, p.x, p.name]).sort(), 'everyone ends in the hour\'s place, in its posture; the one it took is gone');
  const between = seen.filter(p => !Number.isInteger(p.lv));
  assert.ok(between.length, 'someone went between levels');
  for (const p of between) { assert.ok(p.x >= well.x0 && p.x <= well.x1, `${p.who} between levels at ${p.x}: in the well`); assert.equal(portRoomAt(lay, p), well.id); }
  assert.ok(seen.some(p => p.who === 'a' && p.via === 'stair') && !seen.some(p => p.who === 'a' && p.via === 'car'), 'one storey by the stair');
  assert.ok(seen.some(p => p.who === 'b' && p.via === 'car') && !seen.some(p => p.who === 'b' && p.via === 'stair'), 'two by the car');
  assert.ok(seen.some(p => p.who === 'new' && p.lv > lay.levels.length - 1 && p.via === 'car'), 'an arrival comes down the spoke');
  assert.ok(seen.some(p => p.who === 'gone' && p.lv > lay.levels.length - 1 && p.via === 'car'), 'a leaver goes up it');
  assert.ok(seen.filter(p => p.who === 'c').every(p => p.lv === 0), 'along a level, no well');
  assert.ok(seen.every(p => p.lv >= 0 && p.lv < spoke), 'nobody below the outermost level, and gone at the spoke');
  const snap = portWalk(portWalk(null, from, lay, 0, true), to, lay, 1 / 60, true);
  assert.deepEqual(JSON.parse(JSON.stringify(snap.map(p => [p.who, p.lv, p.x]).sort())), to.map(p => [p.who, p.lv, p.x]).sort(), 'reduced motion puts everyone in place');
  assert.equal(portRoomAt(lay, at('x', '', 1, 300)), 'yard'); assert.equal(portRoomAt(lay, at('x', '', 2, 60)), 'well'); assert.equal(portRoomAt(lay, at('x', '', 0, 860)), 'bar');
});

test('a click on a room in the Ring opens its page as the rail does: the Gravity Well the Bar, the yard offices Missions, the market the Port page; a room with no page does nothing (#1132)', async () => {
  const { page, ev, errors, done } = await open({ viewport: { width: 1440, height: 900 } });
  await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); UI.act('closePage'); });
  await frames(page, 3);
  const click = async id => {
    const pt = await ev(rid => { const c = document.getElementById('vs').getBoundingClientRect(), b = G.portRooms.find(x => x.id === rid); return { x: c.left + b.x + b.w / 2, y: c.top + b.y + b.h * 0.6 }; }, id);
    await page.mouse.move(pt.x, pt.y); const cursor = await ev(() => document.getElementById('vs').style.cursor);
    await page.mouse.click(pt.x, pt.y); await frames(page, 2);
    return ev(c => ({ tab: UI.tab, open: UI.pageOpen, cursor: c }), cursor);
  };
  const clinic = await click('clinic');
  assert.deepEqual(clinic, { tab: 'port', open: false, cursor: '' }, 'the clinic has no page: nothing opens, and no pointer');
  assert.deepEqual(await click('bar'), { tab: 'bar', open: true, cursor: 'pointer' });
  assert.deepEqual(await click('yard'), { tab: 'missions', open: true, cursor: 'pointer' }, 'a click on the view with a page open opens the room\'s page in its place');
  assert.deepEqual(await click('market'), { tab: 'port', open: true, cursor: 'pointer' });
  await done();
  assert.deepEqual(errors, []);
});
