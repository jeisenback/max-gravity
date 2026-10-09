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

// The burn view's canvas blocks, at the three screen sizes (#262): none overlaps another, and each is inside the view.
const BURN_SIZES = [['desktop', { width: 1280, height: 800 }, false], ['tablet', { width: 768, height: 1024 }, false], ['phone', { width: 390, height: 844 }, true]];

test('the burn view\'s blocks do not overlap, at the three screen sizes (#262)', async () => {
  for (const [name, viewport, mobile] of BURN_SIZES) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => {
      burn(); G.transit.left = G.transit.total * 0.5;
      for (const c of ['[Comms] The station refuses to say what it is carrying or where it is going, and logs a hail twice.', 'Rosa: "If you hear a clank, that is normal."', '[Market] Water is up at Ceres by a tenth after the strike.']) comm(c);
    });
    await page.waitForTimeout(300);
    const r = await ev(() => ({ boxes: G.burnBoxes, viewW: innerWidth - G.hudW, H: innerHeight }));
    const names = Object.keys(r.boxes);
    for (const n of names) {
      const b = r.boxes[n];
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= r.viewW && b.y + b.h <= r.H, `${name}: ${n} is inside the view ${JSON.stringify(b)}`);
    }
    for (let i = 0; i < names.length; i++) for (let j = i + 1; j < names.length; j++) {
      const a = r.boxes[names[i]], b = r.boxes[names[j]];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${name}: ${names[i]} ${JSON.stringify(a)} overlaps ${names[j]} ${JSON.stringify(b)}`);
    }
    await done();
  }
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
test('every room has a box inside the window, the boxes do not overlap, and they are empty mid-turn', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = { bad: [], midTurn: true }, W = innerWidth, H = innerHeight;
    for (const shipId of ['shuttle', 'lightfreighter', 'courier', 'freighter', 'gunship']) {
      burn(shipId); const t = G.transit;
      for (const [angle, flipped] of [[-Math.PI / 2, false], [Math.PI / 2, true]]) {
        t.left = t.total * 0.6; t.angle = angle; t.flipped = flipped; drawTransit(W, H);
        const b = G.cutRooms;
        if (b.length !== ROOMS.length) out.bad.push(`${shipId}: ${b.length} boxes`);
        for (const x of b) if (x.x < 0 || x.y < 0 || x.x + x.w > W || x.y + x.h > H) out.bad.push(`${shipId}: ${x.id} outside`);
        for (let i = 0; i < b.length; i++) for (let j = i + 1; j < b.length; j++) {
          const p = b[i], q = b[j];
          if (!(p.x + p.w <= q.x + 0.01 || q.x + q.w <= p.x + 0.01 || p.y + p.h <= q.y + 0.01 || q.y + q.h <= p.y + 0.01)) out.bad.push(`${shipId}: ${p.id} overlaps ${q.id}`);
        }
      }
      t.angle = 0; drawTransit(W, H); if (G.cutRooms.length) out.midTurn = false;
    }
    return out;
  });
  assert.deepEqual(r.bad, []); assert.ok(r.midTurn, 'no boxes mid-turn');
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
          for (const b of G.cutRooms) {
            const hit = roomAtPoint(b.x + b.w / 2, b.y + b.h / 2);
            if (hit !== b.id) out.wrong.push(`${shipId}: ${b.id} found ${hit}`);
          }
          const top = Math.min(...G.cutRooms.map(b => b.y));
          if (roomAtPoint(G.cutRooms[0].x + 2, top - 20) !== null) out.gap.push(shipId);
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
  await page.waitForTimeout(300);
  // The point in a room's box that is farthest from everyone in it, so a tap there is a room's and not a person's.
  const pick = id => ev(id => {
    const b = G.cutRooms.find(r => r.id === id); let best = null;
    for (let fx = 0.15; fx <= 0.85; fx += 0.1) for (let fy = 0.15; fy <= 0.85; fy += 0.1) {
      const x = b.x + b.w * fx, y = b.y + b.h * fy, d = Math.min(99, ...G.cutHits.map(h => Math.hypot(x - h.x, y - h.y)));
      if (!best || d > best.d) best = { x, y, d };
    }
    return best;
  }, id);
  for (const id of ['bridge', 'gunnery', 'engine', 'berths', 'galley', 'hold', 'medbay']) {
    await ev(() => { G.bridgeOpen = null; });
    await page.waitForTimeout(120);
    const p = await pick(id);
    assert.ok(p.d > 14, `${id}: a point clear of people (${Math.round(p.d)}px)`);
    await page.mouse.click(p.x, p.y);
    await page.waitForTimeout(150);
    assert.equal(await ev(() => G.bridgeOpen), await ev(id => roomSheet(id), id), `${id}: its sheet is open`);
    assert.equal(await ev(() => document.getElementById('bsheet').hidden), false, `${id}: the sheet is shown`);
    if (await ev(([x, y]) => document.elementFromPoint(x, y) === canvas, [p.x, p.y])) {  // a sheet can cover the room it came from; the key closes it then
      await page.mouse.click(p.x, p.y);
      await page.waitForTimeout(150);
      assert.equal(await ev(() => G.bridgeOpen), null, `${id}: a second tap closes it`);
    }
  }
  await done();
});

test('a tap on a person opens the person, not the room under them; and a tap does nothing while a scene is open', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.7; G.transit.angle = -Math.PI / 2; G.transit.flipped = false; });
  await page.waitForTimeout(300);
  const hit = await ev(() => G.cutHits[0]);
  await page.mouse.click(hit.x, hit.y);
  await page.waitForTimeout(150);
  assert.equal(await ev(() => G.bridgeOpen), 'person', 'the person came first');
  await ev(() => { G.bridgeOpen = null; openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); });
  const b = await ev(() => G.cutRooms.find(r => r.id === 'bridge'));
  await page.mouse.click(b.x + 2, b.y + 2);
  await page.waitForTimeout(150);
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
  const r = await ev(() => { __faces = 0; drawTransit(innerWidth, innerHeight); return { faces: __faces, awake: shipPeople().filter(p => p.role !== 'cat' && !isAsleep(p)).length }; });
  assert.ok(r.faces > 0 && r.faces === r.awake, `a face for each of the ${r.awake} people awake, drawn ${r.faces}`);
  await done();
});

test('a face is built from the person alone, and a name puts no markup in the picture', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const src = await ev(() => decodeURIComponent(faceSource({ id: 'x2', name: '<script>x</script>', role: 'pilot' })));
  assert.ok(src.startsWith('data:image/svg+xml'), 'a picture as a data URL');
  assert.ok(!src.includes('<script>'), 'the name is escaped');
  await done();
});
