'use strict';

// The burn view: the instruments follow a real constant-thrust burn, the cutaway is drawn larger on a wide screen with the hull's
// detail, and a click still finds the person it was aimed at.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.burn = (shipId) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; if (shipId) st.shipId = shipId;
    sail(); while (G.dialog) finishEvent(); tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null; G.dialog = null;
    return st;
  };
  window.scene = (text = 'A ship is drifting across your path with her drive dark: disabled, and armed, going by the way she is not answering. The captain says it is your call.') => {
    for (const c of ['[Comms] The station refuses to say what it is carrying or where it is going, and logs a hail twice.', 'Rosa: "If you hear a clank, that is normal."', '[Market] Water is up at Ceres by a tenth after the strike.']) comm(c);
    openEvent({ title: 'Distress Call', text, choices: [{ label: 'See how it goes', run: () => 'Done.' }] });
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

// The dialog's rect and the boxes the burn view drew around it, in canvas px.
const dockState = () => {
  const d = document.querySelector('#panel.event').getBoundingClientRect(), c = canvas.getBoundingClientRect(), el = document.querySelector('#panel.event');
  return { rect: { x: d.left - c.left, y: d.top - c.top, w: d.width, h: d.height }, dock: G.burnBoxes.dock, clear: G.burnBoxes.clear, outline: G.cutOutline, hand: G.cutHits[0], handId: shipPeople()[0].id,
    frame: G.cutOutline.view, zoom: G.burnBoxes.ship.h / 290, tutorial: G.burnBoxes.tutorial || null, ticker: G.burnBoxes.ticker || null, scrolls: el.scrollHeight - el.clientHeight > 1, docked: el.classList.contains('docked') };
};
const near = (a, b) => ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= 1);
// In the dock: at its x, y and width (as the page rounds them to px), and as tall as the scene up to the dock's height.
const inDock = (r, d) => ['x', 'y', 'w'].every(k => r[k] === Math.round(d[k])) && r.h <= Math.round(d.h);
const apart = (a, b) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const inside = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

test('with a scene open, the dialog sits in the dock, clear of the outline, and the hand is drawn in the clear part', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => { burn(); G.transit.left = G.transit.total * 0.5; scene(); });
    await frames(page, 3);
    for (const tutorial of [null, 1]) {
      await ev(t => { G.state.tutorial = t; }, tutorial);
      await frames(page, 3);
      const r = await ev(dockState);
      assert.ok(r.dock && r.docked, `${name}: the dialog is docked`);
      assert.ok(inDock(r.rect, r.dock), `${name}: the dialog ${JSON.stringify(r.rect)} is in the dock ${JSON.stringify(r.dock)}`);
      assert.ok(apart(r.rect, r.outline), `${name}: the dialog keeps off the outline ${JSON.stringify(r.outline)}`);
      assert.ok(r.hand && r.hand.id === r.handId && inside(r.hand, r.clear), `${name}: the hand ${JSON.stringify(r.hand)} is in the clear part ${JSON.stringify(r.clear)}`);
      assert.ok(Math.abs(r.frame.span * r.zoom - r.clear.w) < 1, `${name}: the outline's frame is the clear part's width (${r.frame.span * r.zoom} against ${r.clear.w})`);
      assert.equal(r.tutorial, null, `${name}: the tutorial's prompt is hidden while a scene is open`);
      if (name === 'wide') assert.ok(r.ticker && apart(r.ticker, r.dock), `${name}: the ticker is drawn beside the dock`);
      assert.ok(!r.scrolls, `${name}: the short scene does not scroll`);
      if (name === 'wide') assert.ok(r.rect.h < r.dock.h - 100, `${name}: the short scene's panel is as tall as the scene (${r.rect.h}), not the dock (${r.dock.h})`);
    }
    await done();
  }
});

test('a scene taller than the dock scrolls inside it, and the dialog stays the dock', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => { burn(); scene(Array(30).fill('The drive hums and the long night goes on, and someone down the passage is singing.').join(' ')); });
    await frames(page, 3);
    const r = await ev(dockState);
    assert.ok(r.scrolls, `${name}: the dialog scrolls`);
    assert.ok(inDock(r.rect, r.dock) && near(r.rect, r.dock), `${name}: the dialog ${JSON.stringify(r.rect)} fills the dock ${JSON.stringify(r.dock)}`);
    await done();
  }
});

test('a resize with a scene open moves the dialog into the new dock, and closing it undocks the panel', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await ev(helpers);
  await ev(() => { burn(); scene(); });
  await frames(page, 3);
  const wide = await ev(dockState);
  assert.ok(inDock(wide.rect, wide.dock), 'wide: the dialog is in the dock');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => G.W === 390);
  await frames(page, 2);
  const phone = await ev(dockState);
  assert.ok(phone.dock.w > wide.dock.w || phone.dock.x < wide.dock.x, 'the dock is the phone\'s');
  assert.ok(inDock(phone.rect, phone.dock), `phone: the dialog ${JSON.stringify(phone.rect)} is in the new dock ${JSON.stringify(phone.dock)}`);
  await ev(() => finishEvent());
  await frames(page, 2);
  const after = await ev(() => { const el = document.querySelector('#panel'); return { docked: el.classList.contains('docked'), x: el.style.getPropertyValue('--dock-x'), dock: G.burnBoxes.dock, clear: G.burnBoxes.clear }; });
  assert.ok(!after.docked && !after.x, 'closed: the panel is not docked and has no dock left on it');
  assert.equal(after.dock, undefined, 'closed: no dock'); assert.equal(after.clear, undefined);
  await done();
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
    t.angle = 0; drawTransit(W, H); out.midTurn = G.cutHits.length;
    return out;
  });
  assert.deepEqual(r.errors, []); assert.equal(r.drawn, 25); assert.ok(r.stable, 'the hits do not drift'); assert.ok(r.hits >= 1, 'the hand is in view'); assert.ok(r.inside);
  assert.ok(r.midTurn > 0, 'the crew are drawn through the turn');
  await done();
});

test('crew who die on a burn leave the cutaway, and are not drawn again after the flip', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, st = G.state, W = innerWidth, H = innerHeight;
    t.left = t.total * 0.8; drawTransit(W, H);
    const drawn = () => { drawTransit(W, H); return [...new Set([...G.cutHits.map(h => h.id), ...G.cutOutline.ids])]; };
    const before = drawn(), lost = st.crew.slice(0, 3);
    for (const id of lost) loseCrew(person(id), 'Killed repelling boarders.');
    const after = drawn();
    t.left = t.total * 0.49; for (let i = 0; i < 30; i++) updateTransit(0.1);
    const flipped = drawn();
    return { lost, before, after, flipped, crew: [...st.crew], isFlipped: t.flipped };
  });
  assert.ok(r.isFlipped, 'the burn is past the flip');
  for (const id of r.lost) assert.ok(r.before.includes(id), `${id} was drawn while alive`);
  for (const [when, ids] of [['straight after', r.after], ['after the flip', r.flipped]]) {
    for (const id of r.lost) assert.ok(!ids.includes(id), `${id} is dead and not drawn ${when}`);
    for (const id of r.crew) assert.ok(ids.includes(id), `${id} is still aboard and drawn ${when}`);
  }
  await done();
});

// The burn view's canvas blocks, at the three screen sizes (#262): none overlaps another, and each is inside the view.
const BURN_SIZES = [['desktop', { width: 1280, height: 800 }, false], ['tablet', { width: 768, height: 1024 }, false], ['phone', { width: 390, height: 844 }, true], ['short', { width: 1280, height: 600 }, false]];

test('the burn view\'s blocks do not overlap, at the three screen sizes (#262)', async () => {
  for (const [name, viewport, mobile] of BURN_SIZES) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => {
      burn(); G.transit.left = G.transit.total * 0.5; G.state.tutorial = 1;  // the first run's prompt shows (#735)
      for (const c of ['[Comms] The station refuses to say what it is carrying or where it is going, and logs a hail twice.', 'Rosa: "If you hear a clank, that is normal."', '[Market] Water is up at Ceres by a tenth after the strike.']) comm(c);
    });
    await frames(page);
    const r = await ev(() => {
      const c = canvas.getBoundingClientRect(), rect = el => { if (!el || el.hidden) return null; const b = el.getBoundingClientRect(); return b.width ? { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height } : null; };
      return { boxes: G.burnBoxes, viewW: innerWidth - G.hudW, H: innerHeight, buttons: { menu: rect(document.getElementById('menuBtn')), map: rect(document.getElementById('tmap')) } };
    });
    assert.ok(r.boxes.tutorial, `${name}: the tutorial box is drawn`);
    assert.deepEqual(Object.keys(r.boxes).filter(k => k !== 'dest').sort(), ['bar', 'ship', 'tutorial'], `${name}: the blocks drawn`);  // the prompt takes the ticker's place
    assert.ok(r.buttons.menu && r.buttons.map, `${name}: the Menu and System map buttons are shown`);
    const names = Object.keys(r.boxes);
    for (const n of names) {
      const b = r.boxes[n];
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= r.viewW && b.y + b.h <= r.H, `${name}: ${n} is inside the view ${JSON.stringify(b)}`);
    }
    const all = { ...r.boxes, ...r.buttons }, keys = Object.keys(all);
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      if ([keys[i], keys[j]].sort().join() === 'dest,ship') continue;  // the destination is drawn in the ship box's background
      const a = all[keys[i]], b = all[keys[j]];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${name}: ${keys[i]} ${JSON.stringify(a)} overlaps ${keys[j]} ${JSON.stringify(b)}`);
    }
    await done();
  }
});

test('without the prompt the ticker is drawn under the ship, clear of the bar, the ship and the buttons, at the three screen sizes', async () => {
  for (const [name, viewport, mobile] of BURN_SIZES) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => { burn(); G.transit.left = G.transit.total * 0.3; comm('A line.'); });
    await frames(page);
    const r = await ev(() => {
      const c = canvas.getBoundingClientRect(), rect = el => { const b = el.getBoundingClientRect(); return { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height }; };
      return { boxes: G.burnBoxes, buttons: [rect(document.getElementById('menuBtn')), rect(document.getElementById('tmap'))] };
    });
    const { ticker, ship, bar } = r.boxes;
    assert.ok(ticker && ticker.h > 0, `${name}: the ticker is drawn`);
    assert.equal(r.boxes.tutorial, undefined, `${name}: no prompt`);
    assert.ok(bar.y + bar.h <= ship.y && ship.y + ship.h <= ticker.y, `${name}: bar, ship, ticker, top to bottom`);
    for (const b of r.buttons) assert.ok(b.x + b.w <= ticker.x || ticker.x + ticker.w <= b.x || b.y + b.h <= ticker.y || ticker.y + ticker.h <= b.y, `${name}: a button ${JSON.stringify(b)} is over the ticker`);
    await done();
  }
});

test('a tap on the ticker opens the Comms sheet, and does nothing while a scene is open', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.3; comm('A line.'); G.bridgeOpen = null; });
  await frames(page);
  const mid = async () => ev(() => { const b = G.burnBoxes.ticker; return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; });
  let p = await mid();
  await page.mouse.click(p.x, p.y);
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), 'comms', 'the Comms sheet is open');
  await ev(() => { G.bridgeOpen = null; syncBridge(true); openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); });
  await frames(page);
  await ev(([x, y]) => canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true })), [p.x, p.y]);  // on the canvas, under the scene
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), null, 'no sheet opens under a scene');
  await done();
});

test('canvas text in the burn view is 12px or more (#265)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const sizes = await ev(() => {
    burn(); const seen = new Set(), proto = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'font');
    Object.defineProperty(ctx, 'font', { configurable: true, get() { return proto.get.call(this); }, set(v) { proto.set.call(this, v); const m = /(\d+(?:\.\d+)?)px/.exec(v); if (m) seen.add(Number(m[1])); } });
    G.transit.left = G.transit.total * 0.5; comm('A line.'); drawTransit(innerWidth, innerHeight);
    delete ctx.font; return [...seen];
  });
  assert.ok(sizes.length > 0, 'the spy saw the fonts');
  assert.ok(sizes.every(s => s >= 12), `font sizes drawn: ${sizes.join(', ')}`);
  await done();
});

// The rooms of the cutaway, as boxes a tap can find (#323, step 5 task 2).
test('the rooms in view have boxes inside the window that do not overlap, and the outline reaches every room', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = { bad: [] }, W = innerWidth, H = innerHeight, all = ROOMS.map(x => x.id).sort().join();
    for (const shipId of ['shuttle', 'lightfreighter', 'courier', 'freighter', 'gunship']) {
      burn(shipId); const t = G.transit;
      for (const [angle, flipped] of [[-Math.PI / 2, false], [Math.PI / 2, true]]) {
        t.left = t.total * 0.6; t.angle = angle; t.flipped = flipped; drawTransit(W, H);
        const b = G.cutRooms;
        if (b.length < 1) out.bad.push(`${shipId}: no room in view`);
        const outlined = [...new Set(G.cutOutline.rooms.map(x => x.id))].sort().join();
        if (outlined !== all) out.bad.push(`${shipId}: the outline has ${outlined}`);
        for (const x of b) if (x.x < 0 || x.y < 0 || x.x + x.w > W || x.y + x.h > H) out.bad.push(`${shipId}: ${x.id} outside`);
        for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
          const p = b[i], q = b[j];
          if (!(p.x + p.w <= q.x + 0.01 || q.x + q.w <= p.x + 0.01 || p.y + p.h <= q.y + 0.01 || q.y + q.h <= p.y + 0.01)) out.bad.push(`${shipId}: ${p.id} overlaps ${q.id}`);
        }
      }
    }
    return out;
  });
  assert.deepEqual(r.bad, []);
  await done();
});

test('a tap at the centre of each room finds that room, on every ship, both ways round, wide and phone', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    const r = await ev(() => {
      const out = { wrong: [], gap: [] }, W = innerWidth, H = innerHeight;
      for (const shipId of ['shuttle', 'lightfreighter', 'courier', 'freighter', 'gunship']) {
        burn(shipId); const t = G.transit;
        for (const [angle, flipped] of [[-Math.PI / 2, false], [Math.PI / 2, true]]) {
          t.left = t.total * 0.6; t.angle = angle; t.flipped = flipped; drawTransit(W, H);
          for (const [where, boxes] of [['view', G.cutRooms], ['outline', G.cutOutline.rooms]]) for (const b of boxes) {
            const hit = roomAtPoint(b.x + b.w / 2, b.y + b.h / 2);
            if (hit !== b.id) out.wrong.push(`${shipId} (${where}): ${b.id} found ${hit}`);
          }
          // A point above the hull, past the outline (which ends left of the box's middle), and above every room in view.
          const box = G.burnBoxes.ship, px = box.x + box.w * 0.6, py = box.y + 4;
          if (py >= Math.min(...G.cutRooms.map(b => b.y)) || outlineRoomAt(G.cutOutline, px, py) !== null || roomAtPoint(px, py) !== null) out.gap.push(shipId);
        }
      }
      return out;
    });
    assert.deepEqual(r.wrong, [], `${name}: wrong rooms`); assert.deepEqual(r.gap, [], `${name}: a point above the hull finds a room`);
    await done();
  }
});

// A tap on a room opens its console as a sheet (#323, step 5 task 3).
test('every room has a sheet, and every sheet is a station', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => ({ rooms: ROOMS.map(x => x.id).sort(), mapped: Object.keys(ROOM_SHEETS).sort(), stations: STATIONS.map(s => s.id), sheets: Object.values(ROOM_SHEETS) }));
  assert.deepEqual(r.mapped, r.rooms, 'one sheet per room');
  for (const s of r.sheets) assert.ok(r.stations.includes(s), `${s} is a station`);
  await done();
});

test('a tap on a room opens its console as a sheet, and a second tap on the room closes it when the sheet has not covered it', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.7; G.transit.angle = -Math.PI / 2; G.transit.flipped = false; });
  await frames(page);
  // The centre of the room's box in the outline: the outline reaches every room, wherever the camera is.
  const pick = id => ev(id => { const b = G.cutOutline.rooms.find(r => r.id === id); return { x: b.x + b.w / 2, y: b.y + b.h / 2 }; }, id);
  for (const id of ['bridge', 'gunnery', 'engine', 'berths', 'galley', 'hold', 'medbay']) {
    await ev(() => { G.bridgeOpen = null; });
    await frames(page);
    const p = await pick(id);
    await page.mouse.click(p.x, p.y);
    await frames(page);
    assert.equal(await ev(() => G.bridgeOpen), await ev(id => roomSheet(id), id), `${id}: its sheet is open`);
    assert.equal(await ev(() => document.getElementById('bsheet').hidden), false, `${id}: the sheet is shown`);
    if (await ev(([x, y]) => document.elementFromPoint(x, y) === canvas, [p.x, p.y])) {  // a sheet can cover the room it came from; the key closes it then
      await page.mouse.click(p.x, p.y);
      await frames(page);
      assert.equal(await ev(() => G.bridgeOpen), null, `${id}: a second tap closes it`);
    }
  }
  // And a room in view: the point of its box farthest from everyone, clear of the outline, so a tap there is the room's.
  await ev(() => { G.bridgeOpen = null; });
  await frames(page);
  const v = await ev(() => {
    let best = null;
    for (const b of G.cutRooms) for (let fx = 0.15; fx <= 0.85; fx += 0.1) for (let fy = 0.15; fy <= 0.85; fy += 0.1) {
      const x = b.x + b.w * fx, y = b.y + b.h * fy, d = Math.min(99, ...G.cutHits.map(h => Math.hypot(x - h.x, y - h.y)));
      if (!outlineRoomAt(G.cutOutline, x, y) && (!best || d > best.d)) best = { x, y, d, id: b.id };
    }
    return best;
  });
  assert.ok(v.d > 24, `a point in view clear of people (${Math.round(v.d)}px)`);
  await page.mouse.click(v.x, v.y);
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), await ev(id => roomSheet(id), v.id), `${v.id} in view: its sheet is open`);
  await done();
});

test('a tap on a person opens the person, not the room under them; and a tap does nothing while a scene is open', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.7; G.transit.angle = -Math.PI / 2; G.transit.flipped = false; });
  await frames(page);
  const hit = await ev(() => G.cutHits[0]);
  await page.mouse.click(hit.x, hit.y);
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), 'person', 'the person came first');
  await ev(() => { G.bridgeOpen = null; openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); });
  const b = await ev(() => G.cutRooms[0]);
  await page.mouse.click(b.x + 2, b.y + 2);
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), null, 'no sheet opens under a scene');
  await done();
});

// Faces on the cutaway's people (#297, step 5 task 4).
test('a face is not there until its picture has loaded, and is drawn for each person once it has', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const first = await ev(() => { const p = { id: `new-${Math.random()}`, name: 'Newcomer', role: 'pilot' }; window.__p = p; return faceImage(p); });
  assert.equal(first, null, 'null at first: the figure is drawn');
  await page.waitForFunction(() => faceImage(__p) !== null, null, { timeout: 5000 });
  await ev(() => {
    burn(); const t = G.transit; t.left = t.total * 0.7; t.angle = -Math.PI / 2; t.flipped = false;
    window.__faces = 0; const real = ctx.drawImage.bind(ctx); ctx.drawImage = (...a) => { if (a[0] instanceof HTMLImageElement) __faces++; return real(...a); };  // a face is an Image; the destination ahead is a sprite canvas
  });
  await page.waitForFunction(() => shipPeople().filter(p => p.role !== 'cat').every(p => faceImage(p) !== null), null, { timeout: 5000 });
  const r = await ev(() => { __faces = 0; drawTransit(innerWidth, innerHeight); return { faces: __faces, awake: G.cutHits.filter(h => !shipPeople().find(p => p.id === h.id && (p.role === 'cat' || isAsleep(p)))).length }; });
  assert.ok(r.faces > 0 && r.faces === r.awake, `a face for each of the ${r.awake} people awake in view, drawn ${r.faces}`);
  await done();
});

test('a tap on a person\'s head opens the person', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.3; G.transit.angle = -Math.PI / 2; G.transit.flipped = false; G.transit.event = null; G.dialog = null; });
  await frames(page);
  // In one go, so the head is where it was drawn: the hand's head, at least 14px from the torso's middle on a desktop.
  const r = await ev(() => {
    drawTransit(innerWidth, innerHeight); const h = G.cutHits[0]; G.bridgeOpen = null;
    canvas.dispatchEvent(new MouseEvent('click', { clientX: h.head.x, clientY: h.head.y, bubbles: true }));
    return { open: G.bridgeOpen, apart: Math.hypot(h.head.x - h.x, h.head.y - h.y) };
  });
  assert.ok(r.apart > 14, `the head is beyond the torso's reach (${Math.round(r.apart)}px)`);
  assert.equal(r.open, 'person');
  await done();
});

test('the camera goes with the hand to an activity\'s room', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, W = innerWidth, H = innerHeight, len = hullLength(SHIPS[G.state.shipId].size), gal = roomAt('galley');
    t.left = t.total * 0.3; drawTransit(W, H); const from = G.cam.x;
    ACTIVITIES.meal.run();
    let steps = 0;
    for (; steps < 600 && !(G.cam.x >= gal.x0 * len && G.cam.x <= gal.x1 * len); steps++) { lifeTick(0.1); G.time += 0.1; drawTransit(W, H); }
    return { from, to: G.cam.x, steps, galley: [gal.x0 * len, gal.x1 * len] };
  });
  assert.ok(r.from > r.galley[1], `the camera starts on the bridge (${Math.round(r.from)})`);
  assert.ok(r.to >= r.galley[0] && r.to <= r.galley[1], `the camera is in the galley ${JSON.stringify(r.galley)}: ${Math.round(r.to)} after ${r.steps} steps`);
  await done();
});

test('a tap on the outline opens the outline\'s room even with a person behind it', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.7; G.transit.angle = -Math.PI / 2; G.transit.flipped = false; });
  await frames(page);
  // In one go, so no frame redraws the hits between: the hand's hit is put under the outline's first room, and that point is tapped.
  const r = await ev(() => {
    const b = G.cutOutline.rooms[0], x = b.x + b.w / 2, y = b.y + b.h / 2;
    G.bridgeOpen = null; G.cutHits[0].x = x; G.cutHits[0].y = y;
    canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
    return { open: G.bridgeOpen, sheet: roomSheet(b.id) };
  });
  assert.ok(r.sheet, 'the room has a sheet');
  assert.equal(r.open, r.sheet, 'the outline came first');
  await done();
});

test('a face is built from the person alone, and a name puts no markup in the picture', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const src = await ev(() => decodeURIComponent(faceSource({ id: 'x2', name: '<script>x</script>', role: 'pilot' })));
  assert.ok(src.startsWith('data:image/svg+xml'), 'a picture as a data URL');
  assert.ok(!src.includes('<script>'), 'the name is escaped');
  await done();
});

test('when the crew secure for the flip they strap in where they are, and someone on the ladder ends on a deck', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit; t.left = t.total * 0.7; updateTransit(0.1);
    const ps = shipPeople(), a = ps[0], b = ps[1];
    a.x = 0.5; a.room = 'galley'; a.tx = null; b.x = LADDER; b.dk = 0.4; b.tdk = 1;
    t.left = t.total * (1 - 0.455); for (let i = 0; i < 40; i++) lifeTick(0.1);
    return { phase: phase(), ax: a.x, bdk: b.dk, btx: b.tx };
  });
  assert.equal(r.phase, 'secure'); assert.equal(r.ax, 0.5, 'stays where they were'); assert.ok(r.bdk === 0 || r.bdk === 1, `on a deck: ${r.bdk}`); assert.equal(r.btx, null);
  await done();
});

test('the Bridge sheet reads the peak speed and the distance in a burn', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); G.transit.left = G.transit.total * 0.4; const b = burnState();
    G.bridgeOpen = 'nav'; syncBridge(true);
    const text = document.getElementById('bsheet').textContent.replace(/\s+/g, ' ');
    return { text, peak: fmtKms(b.peak), dist: `${(b.covered / 1e6).toFixed(1)} of ${(b.dist / 1e6).toFixed(1)} million km` };
  });
  assert.ok(r.text.includes(`Peak${r.peak}`), `the peak: ${r.text}`);
  assert.ok(r.text.includes(`Distance${r.dist}`), `the distance: ${r.text}`);
  await done();
});

test('shipLogLines: the carried contract, its due date and whether the ship is on time', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = burn(), t = G.transit, run = hired().run, carried = heldContract(hired()), out = { contract: !!carried };
    out.due = dateOf(carried.due); out.onTime = shipLogLines(st, t, carried);
    carried.due = transitEta(t) - 2; out.lateDue = dateOf(carried.due); out.late = shipLogLines(st, t, carried);
    out.none = shipLogLines(st, t, null);
    const mission = { title: 'Haul ore', deadline: st.day + 3 }, saved = G.state;
    out.same = JSON.stringify(shipLogLines({ ...st, missions: [mission], crew: ['x'], hired: null }, t, null, ['Ann Lee (Pilot)']));
    G.state = { ...st, day: st.day + 40, crew: [], missions: [], hired: null };  // whatever G.state holds, the lines follow the st given
    out.same2 = JSON.stringify(shipLogLines({ ...saved, missions: [mission], crew: ['x'], hired: null }, t, null, ['Ann Lee (Pilot)']));
    G.state = saved;
    out.handMissions = shipLogLines({ ...st, missions: [mission] }, t, null).length;
    return out;
  });
  assert.ok(r.contract);
  assert.equal(r.onTime.length, 1); assert.match(r.onTime[0], / for .*, due .*, on time$/); assert.ok(r.onTime[0].includes(`due ${r.due}`));
  assert.match(r.late[0], / for .*, due .*, late by \d+ days$/); assert.ok(r.late[0].includes(`due ${r.lateDue}`));
  assert.ok(!r.onTime.some(l => /^Cargo:/.test(l)), 'the contract line says what is aboard');
  assert.equal(r.same, r.same2, 'the lines depend on the st given, not on G.state'); assert.match(r.same, /No active missions|Haul ore/); assert.ok(r.same.includes('Crew: Ann Lee (Pilot)'));
  assert.equal(r.handMissions, 2, 'a hand sees the missions too, then the cargo line');
  assert.equal(r.none.length, 1); assert.match(r.none[0], /^Cargo: /, 'with no contract the log says what is aboard');
  await done();
});

test('the ship\'s log is in the HUD on a wide screen and at the top of Comms on a phone', async () => {
  const wide = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await wide.ev(helpers);
  await wide.ev(([src]) => { window.drawnText = (0, eval)(`(${src})`); }, [`() => { const drawn = [], fill = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, x, ...a) { drawn.push([String(t), x]); return fill.call(this, t, x, ...a); }; return () => { CanvasRenderingContext2D.prototype.fillText = fill; return drawn; }; }`]);
  const w = await wide.ev(() => {
    burn(); G.transit.left = G.transit.total * 0.5;
    const lines = burnShipLog().flatMap(l => wrapText(l, HUD_W - 28)), stop = drawnText(); drawHud(G.W, G.H); const drawn = stop();
    return { lines, drawn, x0: G.W - HUD_W, hudW: G.hudW, label: drawn.some(d => d[0] === "SHIP'S LOG") };
  });
  assert.ok(w.hudW > 0 && w.lines.length > 0 && w.label, 'a wide screen draws the log label');
  for (const l of w.lines) assert.ok(w.drawn.some(d => d[0] === l && d[1] >= w.x0), `HUD line: ${l}`);
  await wide.done();
  const narrow = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true });
  await narrow.ev(helpers);
  const n = await narrow.ev(() => {
    burn(); G.state.inbox = [{ day: 1, n: 1, via: 'message', text: 'INBOXMARK' }];
    const html = commsPanel(), lines = burnShipLog();
    return { hudW: G.hudW, html, lines, inbox: html.indexOf('INBOXMARK') };
  });
  assert.equal(n.hudW, 0);
  assert.ok(n.lines.length > 0);
  for (const l of n.lines) { const i = n.html.indexOf(l.replace(/&/g, '&amp;')); assert.ok(i >= 0 && i < n.inbox, `Comms line: ${l}`); }
  const off = await narrow.ev(() => { const t = G.transit; G.transit = null; const r = commsPanel().includes("Ship's log"); G.transit = t; return r; });
  assert.ok(!off, 'no log outside a burn');
  await narrow.done();
});
