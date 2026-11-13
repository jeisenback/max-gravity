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
    G.transit.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };  // the downtime scene (shiplife.js) does not come into these tests
    return st;
  };
  window.securePr = t => { const s = burnStages(t.days); return 0.5 - (s.secure + s.float) / 2; };  // strapped in before the float, in ship time (#992)
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
    frame: G.cutOutline.view, zoom: viewOf(G.burnBoxes.ship, LAYOUTS.freighter, outlineLeft(G.burnBoxes.ship, G.cutOutline)).zoom, tutorial: G.burnBoxes.tutorial || null, comms: G.burnBoxes.comms || null || null, scrolls: el.scrollHeight - el.clientHeight > 1, docked: el.classList.contains('docked') };
};
const near = (a, b) => ['x', 'y', 'w', 'h'].every(k => Math.abs(a[k] - b[k]) <= 1);
// In the dock: at its x, y and width (as the page rounds them to px), and as tall as the scene up to the dock's height.
const inDock = (r, d) => ['x', 'y', 'w'].every(k => r[k] === Math.round(d[k])) && r.h <= Math.round(d.h);
const apart = (a, b) => a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
const inside = (p, b) => p.x >= b.x && p.x <= b.x + b.w && p.y >= b.y && p.y <= b.y + b.h;

test('with a scene open, the dialog sits in the dock, clear of the outline, and the hand is drawn in the clear part', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['small', { width: 1000, height: 640 }, false]]) {
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
      assert.ok(Math.abs(r.frame.span * r.zoom - r.clear.h) < 1, `${name}: the outline's frame is the clear part's height (${r.frame.span * r.zoom} against ${r.clear.h})`);
      assert.equal(r.tutorial, null, `${name}: the tutorial's prompt is hidden while a scene is open`);
      if (r.comms) assert.ok(apart(r.comms, r.dock), `${name}: the comms lines keep clear of the dock`);
      assert.ok(!r.scrolls, `${name}: the short scene does not scroll`);
      if (name === 'wide') assert.ok(r.rect.h < r.dock.h - 100, `${name}: the short scene's panel is as tall as the scene (${r.rect.h}), not the dock (${r.dock.h})`);
    }
    await done();
  }
});

test('a scene taller than the dock scrolls inside it, and the dialog stays the dock', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['small', { width: 1000, height: 640 }, false]]) {
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
  await page.setViewportSize({ width: 1000, height: 640 });
  await page.waitForFunction(() => G.W === 1000);
  await frames(page, 2);
  const small = await ev(dockState);
  assert.ok(small.dock.w !== wide.dock.w || small.dock.x !== wide.dock.x, 'the dock is the smaller window\'s');
  assert.ok(inDock(small.rect, small.dock), `small: the dialog ${JSON.stringify(small.rect)} is in the new dock ${JSON.stringify(small.dock)}`);
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
const BURN_SIZES = [['desktop', { width: 1280, height: 800 }, false], ['small', { width: 1000, height: 640 }, false], ['wide', { width: 1920, height: 1080 }, false], ['short', { width: 1280, height: 600 }, false]];

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
    assert.deepEqual(Object.keys(r.boxes).filter(k => !['dest', 'comms'].includes(k)).sort(), ['bar', 'ship', 'tutorial'], `${name}: the blocks drawn`);  // the prompt and the comms lines are over the ship (2026-11-12)
    assert.ok(r.buttons.menu && r.buttons.map, `${name}: the Menu and System map buttons are shown`);
    const names = Object.keys(r.boxes);
    for (const n of names) {
      const b = r.boxes[n];
      assert.ok(b.x >= 0 && b.y >= 0 && b.x + b.w <= r.viewW && b.y + b.h <= r.H, `${name}: ${n} is inside the view ${JSON.stringify(b)}`);
    }
    const all = { ...r.boxes, ...r.buttons }, keys = Object.keys(all);
    for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) {
      if (['dest,ship', 'comms,ship', 'ship,tutorial'].includes([keys[i], keys[j]].sort().join())) continue;  // drawn over the ship box: the destination behind, the prompt and the comms lines in front
      const a = all[keys[i]], b = all[keys[j]];
      const apart = a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y;
      assert.ok(apart, `${name}: ${keys[i]} ${JSON.stringify(a)} overlaps ${keys[j]} ${JSON.stringify(b)}`);
    }
    await done();
  }
});

test('without the prompt the comms lines are drawn over the bottom of the ship, clear of the buttons, at the three screen sizes', async () => {
  for (const [name, viewport, mobile] of BURN_SIZES) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => { burn(); G.transit.left = G.transit.total * 0.3; comm('A line.'); });
    await frames(page);
    const r = await ev(() => {
      const c = canvas.getBoundingClientRect(), rect = el => { const b = el.getBoundingClientRect(); return { x: b.left - c.left, y: b.top - c.top, w: b.width, h: b.height }; };
      return { boxes: G.burnBoxes, buttons: [rect(document.getElementById('menuBtn')), rect(document.getElementById('tmap'))] };
    });
    const { comms, ship } = r.boxes;
    assert.ok(comms && comms.h > 0, `${name}: the line is drawn`);
    assert.equal(r.boxes.tutorial, undefined, `${name}: no prompt`);
    assert.ok(comms.y >= ship.y && comms.y + comms.h <= ship.y + ship.h, `${name}: over the ship`);
    for (const b of r.buttons) assert.ok(b.x + b.w <= comms.x || comms.x + comms.w <= b.x || b.y + b.h <= comms.y || comms.y + comms.h <= b.y, `${name}: a button ${JSON.stringify(b)} is over the comms lines`);
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

test('a tap at the centre of each room finds that room, on every ship, both ways round, wide and small', async () => {
  for (const [name, viewport, mobile] of [['wide', { width: 1280, height: 800 }, false], ['small', { width: 1000, height: 640 }, false]]) {
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
          // A point outside the tower's skin at the box's left edge, under the outline (in the box's top left), and left of every room in view.
          const box = G.burnBoxes.ship, px = box.x + 4, py = box.y + box.h - 8;
          if (px >= Math.min(...G.cutRooms.map(b => b.x)) || outlineRoomAt(G.cutOutline, px, py) !== null || roomAtPoint(px, py) !== null) out.gap.push(shipId);
        }
      }
      return out;
    });
    assert.deepEqual(r.wrong, [], `${name}: wrong rooms`); assert.deepEqual(r.gap, [], `${name}: a point outside the tower finds a room`);
    await done();
  }
});

// The outline in the corner is over the view: nobody, and no room's name, is drawn under it (#972).
test('the outline covers no one and no room\'s name, wide and small (#972)', async () => {
  for (const [name, viewport] of [['small', { width: 1000, height: 640 }], ['wide', { width: 1280, height: 800 }]]) {
    const { ev, done } = await open({ scope: 'earth-hired', viewport });
    await ev(helpers);
    const r = await ev(() => {
      burn(); const t = G.transit, lay = LAYOUTS.freighter, out = { under: [], hits: 0, plates: 0 }, names = new Set(ROOMS.map(x => x.name.toUpperCase()));
      t.left = t.total * 0.7; t.angle = -Math.PI / 2; t.flipped = false;
      const real = window.worldText, plates = [];
      window.worldText = (c, zoom, text, x, y, size, ...a) => { if (names.has(text)) { const m = c.getTransform(); plates.push({ text, at: m.transformPoint(new DOMPoint(x - 4 / zoom, y - size)), foot: m.transformPoint(new DOMPoint(x - 4 / zoom, y + size * 0.3)) }); } return real(c, zoom, text, x, y, size, ...a); };
      try {
        for (const room of ['bridge', 'galley', 'berths', 'gunnery', 'engine']) {  // everyone at the far left of a room, the camera on its deck
          const rm = roomAt(room); for (const p of shipPeople()) Object.assign(p, { room, x: rm.x0 + 0.02, dk: rm.deck, tdk: rm.deck, tx: null, wait: 999, staged: undefined });
          G.cam = { y: layoutBox(lay, room).floor - HULL.deck / 2, t: G.time }; plates.length = 0; drawTransit(innerWidth, innerHeight);
          const o = G.cutOutline, x0 = o.x - 4, x1 = o.x + o.w + 4, y0 = o.y - 4, y1 = o.y + o.h + 4, inside = q => q.x >= x0 && q.x <= x1 && q.y >= y0 && q.y <= y1;
          for (const h of G.cutHits) { out.hits++; for (const q of [h, h.head, h.foot]) if (inside(q)) out.under.push(`${room}: ${h.id} at ${Math.round(q.x)},${Math.round(q.y)}`); }
          for (const pl of plates) { out.plates++; if (!(pl.at.x > x1 || pl.at.y > y1) || inside(pl.foot)) out.under.push(`${room}: the ${pl.text} plate at ${Math.round(pl.at.x)},${Math.round(pl.at.y)}`); }
        }
      } finally { window.worldText = real; }
      return out;
    });
    assert.ok(r.hits > 10 && r.plates > 5, `${name}: people and names in view (${r.hits}, ${r.plates})`);
    assert.deepEqual(r.under, [], `${name}: under the outline`);
    await done();
  }
});

// At night the ship's sleepers lie on the bunks, and the berths' name plate stays clear of them, wide and small: the top bunk under the plate is
// the last one taken.
test('the sleepers on the bunks leave the berths\' name clear, wide and small (#972)', async () => {
  for (const [name, viewport] of [['small', { width: 1000, height: 700 }], ['wide', { width: 1600, height: 900 }]]) {
    const { ev, done } = await open({ scope: 'earth-hired', viewport });
    await ev(helpers);
    const r = await ev(() => {
      burn(); const t = G.transit, lay = LAYOUTS.freighter, b = roomAt('berths'), out = { over: [], sleepers: 0, plate: null };
      t.left = t.total * 0.7; t.angle = -Math.PI / 2; t.flipped = false; t.elapsed = 50; t.dark = true;  // night, the lights down
      shipPeople().forEach((p, i) => Object.assign(p, { room: 'berths', x: b.x0 + (0.05 + i * 0.05) * CUT_K, dk: b.deck, tdk: b.deck, tx: null, wait: 999, staged: undefined }));
      const real = window.worldText;
      window.worldText = (c, zoom, text, x, y, size, ...a) => {
        if (text === 'BERTHS') { const m = c.getTransform(), w = c.measureText(text).width / zoom; out.plate = { a: m.transformPoint(new DOMPoint(x - 4 / zoom, y - size)), b: m.transformPoint(new DOMPoint(x + w + 4 / zoom, y + size * 0.3)) }; }
        return real(c, zoom, text, x, y, size, ...a);
      };
      try { G.cam = { y: layoutBox(lay, 'berths').floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); } finally { window.worldText = real; }
      const pl = out.plate, inPlate = q => q.x >= pl.a.x - 2 && q.x <= pl.b.x + 2 && q.y >= pl.a.y - 2 && q.y <= pl.b.y + 2;
      for (const p of shipPeople().filter(isAsleep)) {
        const h = G.cutHits.find(q => q.id === p.id); if (!h) continue; out.sleepers++;
        for (let s = 0; s <= 10; s++) { const q = { x: h.head.x + (h.foot.x - h.head.x) * s / 10, y: h.head.y + (h.foot.y - h.head.y) * s / 10 }; if (inPlate(q)) { out.over.push(`${p.name} at ${Math.round(q.x)},${Math.round(q.y)}`); break; } }
      }
      return out;
    });
    assert.ok(r.plate, `${name}: the berths' name is drawn`);
    assert.ok(r.sleepers >= 5, `${name}: five asleep on the bunks (${r.sleepers})`);
    assert.deepEqual(r.over, [], `${name}: sleepers over the berths' name ${JSON.stringify(r.plate)}`);
    await done();
  }
});

// The bunks stack three high (#1023): each sleeper is drawn lying on the mattress of their own bunk (#934: bunkOwners, the k-th of the ship's
// company on bunk k), one to a bunk, and the five asleep fill all three tiers.
test('each sleeper lies in their own bunk, in every tier (#1023, #934)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, lay = LAYOUTS.freighter, b = roomAt('berths'), drawn = [];
    t.left = t.total * 0.7; t.angle = -Math.PI / 2; t.flipped = false; t.elapsed = 50; t.dark = true;  // night, the lights down
    shipPeople().forEach((p, i) => Object.assign(p, { room: 'berths', x: b.x0 + (0.05 + i * 0.05) * CUT_K, dk: b.deck, tdk: b.deck, tx: null, wait: 999, staged: undefined }));
    const real = window.drawPerson;
    window.drawPerson = (c, pose, x, y, look) => { drawn.push({ v: look.v, pose: pose.name, x, y }); return real(c, pose, x, y, look); };
    try { G.cam = { y: layoutBox(lay, 'berths').floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); } finally { window.drawPerson = real; }
    const box = layoutBox(lay, 'berths'), W = lay.width, well = { x0: (lay.well.x - lay.well.w / 2) * W, x1: (lay.well.x + lay.well.w / 2) * W }, nb = Math.min(12, ship().berths);
    const owners = bunkOwners(shipPeople(), nb);
    return shipPeople().filter(isAsleep).map(p => {
      const k = owners.indexOf(p), bunk = berthBunk(box, nb, k, well), d = drawn.find(q => q.v === portraitLook({ id: p.id, name: p.name }).v);
      return { name: p.name, k, bunk, d };
    });
  });
  await done();
  assert.ok(r.length >= 5, `five asleep (${r.length})`);
  for (const { name, k, bunk, d } of r) {
    assert.ok(d && d.pose === 'bunk', `${name} drawn lying down (${d && d.pose})`);
    assert.ok(d.x > bunk.x && d.x < bunk.x + bunk.w && Math.abs(d.y - (bunk.y - 5)) < 1e-9, `${name} on bunk ${k}'s mattress (${bunk.x} to ${bunk.x + bunk.w}, ${bunk.y - 5}): at ${d.x}, ${d.y}`);
  }
  assert.equal(new Set(r.map(q => `${q.bunk.x},${q.bunk.y}`)).size, r.length, 'one sleeper to a bunk');
  assert.equal(new Set(r.map(q => q.bunk.y)).size, 3, 'sleepers in all three tiers');
  assert.ok(r.every(q => q.k >= 0), 'each in a bunk of their own');
});

// #934: the cutaway gives the berths each bunk's owner, asleep or not, with their own things: the hand's first, the captain's next, then the
// crew's as they signed on; the bunks past them spare. When one of the crew leaves and another signs on, the leaver's things go with them.
test('the cutaway puts each one\'s own things in their bunk, and a crew change changes them (#934)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, lay = LAYOUTS.freighter, st = G.state;
    t.left = t.total * 0.7; t.elapsed = 50; t.dark = true;
    const drawnBunks = () => {
      let got = null; const real = window.drawRoom;
      window.drawRoom = (c, id, q, s) => { if (id === 'berths') got = s.bunks; return real(c, id, q, s); };
      try { G.cam = { y: layoutBox(lay, 'berths').floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); } finally { window.drawRoom = real; }
      const owners = bunkOwners(shipPeople(), Math.min(12, ship().berths));
      return got.map((b, k) => b && { who: owners[k].id, role: owners[k].role, slept: b.slept, asleep: isAsleep(owners[k]), things: [...b.shelf, ...b.photos, b.screen, b.keep].filter(Boolean) });
    };
    const crew = [...st.crew], company = shipPeople().filter(p => p.role !== 'cat').length, before = drawnBunks(), cast = st.crew.find(id => person(id).cast), keyOf = id => person(id).cast;
    const left = keyOf(cast);
    st.crew = st.crew.filter(id => id !== cast); shipPeople();  // they leave at a port
    const other = Object.keys(CAST).find(k => !CAST[k].xo && !st.crew.some(id => person(id).cast === k) && k !== left), p = castPerson(other);
    st.crew.push(p.id); t.aboard = null; shipPeople();  // and another signs on for the next burn
    return { before, after: drawnBunks(), left, leftId: cast, joined: other, joinedId: p.id, kits: { left: bunkKit(person(cast)), joined: bunkKit(person(p.id)) }, crew, company, cap: hired().captain };
  });
  await done();
  const things = k => [...k.shelf, ...k.photos, k.screen, k.keep].filter(Boolean);
  assert.equal(r.before[0].who, 'you', 'the hand\'s bunk is the first');
  assert.equal(r.before[1].who, r.cap, 'the captain\'s the next');
  assert.deepEqual(r.before.slice(2, 2 + r.crew.length).map(b => b.who), r.crew, 'then the crew, in the order they signed on');
  for (const b of r.before.filter(Boolean)) assert.equal(b.slept, b.asleep, `${b.who}: slept in when asleep`);
  assert.ok(r.before.length > r.company && r.before.every((b, k) => (k < r.company) === !!b), `the ${r.before.length - r.company} bunks past the company spare`);
  const was = r.before.find(b => b && b.who === r.leftId), now = r.after.find(b => b && b.who === r.joinedId);
  assert.deepEqual(was.things, things(r.kits.left), `${r.left}'s own things in their bunk before`);
  assert.ok(!r.after.some(b => b && b.who === r.leftId), `${r.left} has no bunk after leaving`);
  assert.ok(now && now.things.join() === things(r.kits.joined).join(), `${r.joined}'s own things in their bunk after signing on`);
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
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.7; G.transit.angle = -Math.PI / 2; G.transit.flipped = false;
    const block = shipDay(G.transit.elapsed).block; for (const p of shipPeople()) Object.assign(p, { block, tx: null, wait: 999 }); });  // everyone still where they are, so the tap lands on them
  await frames(page);
  // The view keeps moving between reading where someone is and the click landing; on a loaded machine they can step off the spot, so try again (a room under them would win every try).
  for (let k = 0; k < 3 && (await ev(() => G.bridgeOpen)) !== 'person'; k++) {
    await ev(() => { G.bridgeOpen = null; syncBridge(true); });
    const hit = await ev(() => G.cutHits[0]);
    await page.mouse.click(hit.x, hit.y);
    await frames(page);
  }
  assert.equal(await ev(() => G.bridgeOpen), 'person', 'the person came first');
  await ev(() => { G.bridgeOpen = null; openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); });
  const b = await ev(() => G.cutRooms[0]);
  await page.mouse.click(b.x + 2, b.y + 2);
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), null, 'no sheet opens under a scene');
  await done();
});

// Faces on the cutaway's people (#297, step 5 task 4).
test('each figure has its portrait\'s skin and hair, and no picture is drawn into the cutaway', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit; t.left = t.total * 0.7; t.angle = -Math.PI / 2; t.flipped = false;
    let pictures = 0; const real = ctx.drawImage.bind(ctx); ctx.drawImage = (...a) => { if (a[0] instanceof HTMLImageElement) pictures++; return real(...a); };
    const fills = []; const desc = Object.getOwnPropertyDescriptor(CanvasRenderingContext2D.prototype, 'fillStyle');
    Object.defineProperty(ctx, 'fillStyle', { configurable: true, get() { return desc.get.call(this); }, set(v) { fills.push(String(v).toLowerCase()); desc.set.call(this, v); } });
    drawTransit(innerWidth, innerHeight); delete ctx.fillStyle; ctx.drawImage = real;
    const awake = shipPeople().filter(p => p.role !== 'cat' && !isAsleep(p) && G.cutHits.some(h => h.id === p.id));
    return { pictures, people: awake.length, matched: awake.filter(p => { const l = portraitLook({ id: p.id, name: p.name }); return fills.includes(l.skin.toLowerCase()) && fills.includes(l.hair.toLowerCase()); }).length };
  });
  assert.equal(r.pictures, 0, 'no portrait picture in the cutaway');
  assert.ok(r.people > 0 && r.matched === r.people, `the skin and hair of each of the ${r.people} people in view (${r.matched})`);
  await done();
});

test('the hired captain is aboard in the cutaway, and spends the day on the bridge', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => { burn(); const cap = hiredCaptain(), p = shipPeople().find(x => x.role === 'captain'); return { id: p && p.id, cap: cap.id, haunt: HAUNTS.captain, color: ROLE_COLORS.captain }; });
  await done();
  assert.equal(r.id, r.cap); assert.deepEqual(r.haunt, { bridge: 6, galley: 2, berths: 1 }); assert.equal(r.color, '#b9c4d0');
});

// Scenes staged (docs/superpowers/specs/2026-11-05-scenes-staged-design.md): a burn in the move phase, a scene opened, and the ship's life ticked on.
const stageHelpers = () => {
  window.stageBurn = (at = 0.7) => { burn(); while (G.state.day % 4) G.state.day++; const t = G.transit; t.left = t.total * (1 - at); t.elapsed = 0; shipPeople(); return t; };  // the burn's first night is the pilot's and the engineer's on the watch bill (#1034)
  window.tickFor = secs => { for (let i = 0; i < secs * 30; i++) lifeTick(1 / 30); };
  window.sayScene = (title, text) => openEvent({ title, text, choices: [{ label: 'Go on', run: () => 'Done.' }] });
  window.inRoom = (p, id) => { const r = ROOMS.find(x => x.id === id); return p.dk === r.deck && p.x >= r.x0 && p.x <= r.x1 && p.tx === null; };
  window.aboardBy = id => shipPeople().find(p => p.id === id);
};

test('someone bound for another deck walks to the ladder, and climbs only on it (#986)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    stageBurn(); const p = { ...shipPeople().find(x => x.role !== 'cat'), staged: undefined, at: undefined, tdk: 1, tx: 0.3 }, pose = o => posture({ ...p, ...o }, phase(), 0, false).name;
    return { phase: phase(), toLadder: pose({ x: 0.2, dk: 0 }), atLadder: pose({ x: LADDER, dk: 0 }), between: pose({ x: LADDER, dk: 0.5 }) };
  });
  await done();
  assert.equal(r.phase, 'move');
  assert.equal(r.toLadder, 'walk', 'along the deck to the ladder, a walk, not the arms up on rungs that are not there');
  assert.equal(r.atLadder, 'climb'); assert.equal(r.between, 'climb', 'on the ladder between decks');
});

test('a scene during a burn brings the people in it and you to its room, facing each other, and closing it lets them go', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    const t = stageBurn(), mate = person(G.state.crew[0]), out = {};
    sayScene(`With ${mate.first}`, `${mate.first} is in the galley with a cup going cold.`); tickFor(20);
    const you = aboardBy('you'), m = aboardBy(mate.id);
    out.inGalley = [you, m].every(p => inRoom(p, 'galley'));
    out.facing = you.face === Math.sign(m.x - you.x) && m.face === -you.face;
    out.poses = [you, m].map(p => posture(p, phase(), 0, false).name);
    G.dialog = null; t.event = null; tickFor(10);
    out.released = [you, m].every(p => !p.staged);
    return out;
  });
  await done();
  assert.ok(r.inGalley, 'both in the galley, standing still'); assert.ok(r.facing, 'facing each other');
  assert.deepEqual(r.poses, ['sit', 'sit'], 'seated at the galley table'); assert.ok(r.released, 'let go when it closes');
});

// Beside a docked scene the tower is wider than the clear part, and the camera pans across to keep the scene's people and the hand in it, the
// way the old side view panned along the ship (#972); with none open the tower stands across the middle of the box right of the outline.
test('beside a docked scene the camera pans across to the scene, and with none the tower stands where it did (#972)', async () => {
  {
    const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
    await ev(helpers); await ev(stageHelpers);
    const r = await ev(() => {
      const t = stageBurn(), mate = person(G.state.crew[0]); t.angle = -Math.PI / 2; t.flipped = false;
      sayScene(`With ${mate.first}`, `${mate.first} is in the galley with a cup going cold.`); tickFor(20);
      const ids = shipPeople().filter(p => p.staged || p.id === 'you').map(p => p.id), out = { ids, outside: [] };
      for (const held of [null, 'centre']) {  // snapped, and eased from the tower's middle
        G.cam = held ? { x: LAYOUTS.freighter.width / 2, y: G.cam.y, t: G.time - 5 } : null; drawTransit(innerWidth, innerHeight);
        const box = G.burnBoxes.ship, clear = G.burnBoxes.clear, x0 = Math.max(clear.x, box.x + outlineLeft(box, G.cutOutline)), x1 = clear.x + clear.w;
        out.docked = !!G.burnBoxes.dock;
        for (const id of ids) { const h = G.cutHits.find(q => q.id === id); if (!h) { out.outside.push(`${held}: ${id} not drawn`); continue; } for (const q of [h, h.head, h.foot]) if (q.x < x0 || q.x > x1) out.outside.push(`${held}: ${id} at ${Math.round(q.x)} outside ${Math.round(x0)} to ${Math.round(x1)}`); }
      }
      return out;
    });
    assert.ok(r.docked, 'the scene is docked'); assert.ok(r.ids.length >= 2, `the scene's people and you (${r.ids})`);
    assert.deepEqual(r.outside, [], 'everyone in the scene is in the clear part');
    await done();
  }
  {
    const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: 1600, height: 900 } });
    await ev(helpers);
    const r = await ev(() => {
      burn(); const t = G.transit, you = shipPeople()[0]; t.left = t.total * 0.7; t.angle = -Math.PI / 2; t.flipped = false;
      Object.assign(you, { x: LADDER, dk: 0, tdk: 0, tx: null, wait: 999 }); G.cam = null; drawTransit(innerWidth, innerHeight);
      const box = G.burnBoxes.ship;
      return { camX: G.cam.x, W: LAYOUTS.freighter.width, hand: G.cutHits[0].x, mid: box.x + (outlineLeft(box, G.cutOutline) + box.w) / 2 };
    });
    assert.equal(r.camX, r.W / 2, 'the camera on the tower\'s middle');
    assert.ok(Math.abs(r.hand - r.mid) < 1, `the well across the middle right of the outline (${r.hand} against ${r.mid})`);
    await done();
  }
});

test('someone on the ladder when a scene opens finishes onto a deck and comes', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    stageBurn(); const mate = person(G.state.crew[0]), m = aboardBy(mate.id);
    Object.assign(m, { x: LADDER, dk: 0.5, tdk: 1, tx: null });
    sayScene(`With ${mate.first}`, `${mate.first} waits at the bridge rail.`); tickFor(25);
    return { dk: m.dk, there: inRoom(m, 'bridge') };
  });
  await done();
  assert.ok(r.dk === 0 || r.dk === 1, `on a deck (${r.dk})`); assert.ok(r.there, 'and at the scene');
});

test('a scene at night wakes the one it is about, and the rest sleep on', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    const t = stageBurn(); t.elapsed = 50; t.dark = true;  // night, the lights already down
    const sleepers = shipPeople().filter(p => p.id && p.id !== 'you' && p.role !== 'cat' && !onWatchTonight(p, nightState())).slice(0, 2);
    const b = ROOMS.find(x => x.id === 'berths');
    sleepers.forEach((p, i) => Object.assign(p, { room: 'berths', x: b.x0 + (0.05 + i * 0.05) * CUT_K, dk: b.deck, tdk: b.deck, tx: null, wait: 999 }));
    const [one, other] = sleepers;
    sayScene(`With ${one.name}`, `${one.name} is in the galley, unable to sleep.`); tickFor(25);
    return { dark: isDark(), came: inRoom(one, 'galley'), slept: isAsleep(other), n: sleepers.length };
  });
  await done();
  assert.ok(r.dark && r.n === 2, 'night, with two asleep'); assert.ok(r.came, 'the one in the scene got up and came'); assert.ok(r.slept, 'the other sleeps on');
});

test('a scene that leads into another moves its people to the next room, and lets go of those not in it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    stageBurn(); const mate = person(G.state.crew[0]), cap = hiredCaptain();
    sayScene(`With ${mate.first}`, `${mate.first} is in the galley.`); tickFor(20);
    sayScene('The Captain', `${cap.first} wants a word.`); tickFor(25);
    return { mate: !!aboardBy(mate.id).staged, cap: inRoom(aboardBy(cap.id), 'bridge'), you: inRoom(aboardBy('you'), 'bridge') };
  });
  await done();
  assert.equal(r.mate, false, 'the first scene\'s mate is let go'); assert.ok(r.cap && r.you, 'the captain and you on the bridge');
});

test('someone in the way of a scene, who is not in it, leaves for their next room', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    stageBurn(); const cap = hiredCaptain(), b = ROOMS.find(x => x.id === 'bridge');
    const other = shipPeople().find(p => p.id && p.id !== 'you' && p.role !== 'captain' && p.role !== 'cat');
    Object.assign(other, { room: 'bridge', x: b.mid, dk: b.deck, tdk: b.deck, tx: null, wait: 999 });
    sayScene('The Captain', `${cap.first} wants a word.`); tickFor(25);
    return { left: !inRoom(other, 'bridge') && other.room !== 'bridge', cap: inRoom(aboardBy(cap.id), 'bridge') };
  });
  await done();
  assert.ok(r.left, 'the one in the way is gone to another room'); assert.ok(r.cap, 'and the scene is on the bridge');
});

test('a scene in the berths at night does not get the sleepers up, and arriving at a scene draws none of the game\'s dice', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    const t = stageBurn(); t.elapsed = 50; t.dark = true;  // night, the lights already down
    const b = ROOMS.find(x => x.id === 'berths'), sleeper = shipPeople().find(p => p.id && p.id !== 'you' && p.role !== 'cat' && p.role !== 'captain' && !onWatchTonight(p, nightState()));
    Object.assign(sleeper, { room: 'berths', x: b.x0 + b.w * 0.3, dk: b.deck, tdk: b.deck, tx: null, wait: 999, block: shipDay(t.elapsed).block, at: 'bunk' });  // in their bunk for the night (off the well, which runs through the berths' middle)
    const mate = shipPeople().find(p => p.id && p.id !== 'you' && p !== sleeper && p.role !== 'cat' && p.role !== 'captain');
    sayScene(`With ${mate.name}`, `${mate.name} is sitting on a bunk, awake.`); tickFor(25);
    const real = Math.random; let draws = 0; Math.random = () => { draws++; return real(); };
    const you = aboardBy('you'); Object.assign(you, { tx: you.x + 0.001 * CUT_K }); lifeTick(1 / 30); Math.random = real;  // arriving at the spot
    return { asleep: isAsleep(sleeper), x: sleeper.x, mid: b.x0 + b.w * 0.3, staged: !!mate.staged, draws };
  });
  await done();
  assert.ok(r.staged, 'the scene is staged in the berths'); assert.ok(r.asleep && Math.abs(r.x - r.mid) < 1e-6, 'the sleeper sleeps on where they lie');
  assert.equal(r.draws, 0, 'arriving at a scene draws no dice');
});

test('a scene at the couches moves nobody', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    stageBurn(0.02); const mate = person(G.state.crew[0]); tickFor(5);
    sayScene(`With ${mate.first}`, `${mate.first} is in the galley.`); tickFor(20);
    return shipPeople().every(p => Math.abs(p.x - p.seat) < 1e-6 && p.dk === p.seatDk && !p.staged);
  });
  await done();
  assert.ok(r, 'everyone at their couch, nobody staged');
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
    burn(); const t = G.transit, W = innerWidth, H = innerHeight, lay = LAYOUTS.freighter, gal = roomAt('galley'), eng = roomAt('engine'), you = shipPeople()[0];
    t.left = t.total * 0.3; Object.assign(you, { room: 'engine', x: eng.mid, dk: eng.deck, tdk: eng.deck, tx: null, wait: 999 }); G.cam = null; drawTransit(W, H);  // the hand at the drive, six decks down
    const from = G.cam.y, span = viewOf(G.burnBoxes.ship, lay, outlineLeft(G.burnBoxes.ship, G.cutOutline)).span, floor = deckFloor(lay, gal.deck);
    ACTIVITIES.meal.run();
    let steps = 0;
    for (; steps < 900 && !(you.dk === gal.deck && Math.abs(G.cam.y - (floor - HULL.deck / 2)) <= span / 6 + 1); steps++) { lifeTick(0.1); G.time += 0.1; drawTransit(W, H); }
    return { from, to: G.cam.y, steps, floor, span, top: floor - HULL.deck };
  });
  assert.ok(r.from > r.floor + r.span / 2, `the camera starts at the drive, the galley out of view (${Math.round(r.from)})`);
  assert.ok(Math.abs(r.to - r.floor) < r.span / 6, `the camera is near the galley's floor (${Math.round(r.floor)}): ${Math.round(r.to)} after ${r.steps} steps`);
  assert.ok(r.to - r.span / 2 <= r.top && r.to + r.span / 2 >= r.floor, 'with the mess deck in view');
  await done();
});

// Under reduced motion the camera holds on a deck: one cut as the hand reaches the next, and still in between (#972).
test('under reduced motion the camera cuts from deck to deck on a climb, and holds between (#972)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, you = shipPeople()[0], at = {}, seen = new Set();
    t.left = t.total * 0.3; t.angle = -Math.PI / 2; t.flipped = false; Settings.reduceMotion = true;
    try {
      for (const d of [1, 2, 3]) { Object.assign(you, { x: LADDER, dk: d, tdk: d, tx: null, wait: 999 }); drawTransit(innerWidth, innerHeight); at[d] = Math.round(G.cam.y * 100) / 100; }
      for (let k = 0; k <= 40; k++) { Object.assign(you, { x: LADDER, dk: 1 + k / 20, tdk: 3 }); G.time += 0.1; drawTransit(innerWidth, innerHeight); seen.add(Math.round(G.cam.y * 100) / 100); }
    } finally { Settings.reduceMotion = false; }
    return { at, seen: [...seen] };
  });
  const decks = Object.values(r.at);
  assert.equal(new Set(decks).size, 3, `a place for each deck: ${decks}`);
  assert.deepEqual(r.seen.filter(y => !decks.includes(y)), [], `only the decks' places (${decks}) on the climb: ${r.seen}`);
  await done();
});

// The mess table is drawn while the galley is in view, and not when the camera is decks away from it (#972).
test('the mess table is drawn with the galley in view, and not when it is out of view (#972)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, lay = LAYOUTS.freighter, real = window.roomMessTable, out = {};
    t.left = t.total * 0.3; t.angle = -Math.PI / 2; t.flipped = false;
    let n = 0; window.roomMessTable = (...a) => { n++; return real(...a); };
    try {
      for (const id of ['galley', 'medbay', 'engine']) {
        n = 0; G.cam = { y: layoutBox(lay, id).floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight);
        const g = layoutBox(lay, 'galley'), half = viewOf(G.burnBoxes.ship, lay, outlineLeft(G.burnBoxes.ship, G.cutOutline)).span / 2;
        out[id] = { drawn: n > 0, inView: g.floor >= G.cam.y - half && g.top <= G.cam.y + half };
      }
    } finally { window.roomMessTable = real; }
    return out;
  });
  assert.deepEqual(r.galley, { drawn: true, inView: true }, 'on the galley\'s deck');
  for (const id of ['medbay', 'engine']) assert.deepEqual(r[id], { drawn: false, inView: false }, `the camera on the ${id}'s deck`);
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

test('when the crew secure for the flip they strap in where they are, and someone on the ladder ends on a deck', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit; t.left = t.total * 0.7; updateTransit(0.1);
    const ps = shipPeople(), [a, b, c, d] = ps, g = roomAt('galley');
    Object.assign(a, { x: g.mid, room: 'galley', dk: g.deck, tdk: g.deck, tx: null }); Object.assign(b, { x: LADDER, dk: 0.4, tdk: 1 });
    Object.assign(c, { x: LADDER, dk: 5.4, tdk: 6, tx: roomAt('engine').mid }); Object.assign(d, { x: LADDER, dk: 5.6, tdk: 5, tx: 0.2 });  // in the tube through the tank (#972): short of its middle going down, past it going up
    const sg = burnStages(t.days); t.left = t.total * (0.5 + (sg.secure + sg.float) / 2); for (let i = 0; i < 40; i++) lifeTick(0.1);  // strapped in before the float (#992)
    return { phase: phase(), ax: a.x, gx: g.mid, bdk: b.dk, btx: b.tx, tube: [c, d].map(p => ({ dk: p.dk, tx: p.tx, y: towerDeckY(LAYOUTS.freighter, p.dk), floor: deckFloor(LAYOUTS.freighter, Math.round(p.dk)) })), decks: LAYOUTS.freighter.decks.length };
  });
  assert.equal(r.phase, 'secure'); assert.equal(r.ax, r.gx, 'stays where they were'); assert.ok(r.bdk === 0 || r.bdk === 1, `on a deck: ${r.bdk}`); assert.equal(r.btx, null);
  for (const p of r.tube) { assert.ok(Number.isInteger(p.dk) && p.dk >= 0 && p.dk < r.decks, `out of the tube onto a whole deck that exists: ${p.dk}`); assert.equal(p.y, p.floor, 'standing on its floor'); assert.equal(p.tx, null); }
  assert.deepEqual(r.tube.map(p => p.dk), [5, 6], 'the plant deck short of the tank\'s middle, the drive deck past it');
  await done();
});

test('a climber in the tube through the tank is drawn inside it (#972)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, lay = LAYOUTS.freighter, W = lay.width, o = towerOutline(lay); t.left = t.total * 0.3; t.angle = -Math.PI / 2; t.flipped = false;
    const mate = shipPeople().find(p => p.id && p.id !== 'you' && p.role !== 'cat');
    Object.assign(mate, { x: LADDER, dk: 5.5, tdk: 6, tx: roomAt('engine').mid, wait: 999, staged: undefined });  // halfway down the tube
    G.cam = { y: towerDeckY(lay, 5.5) - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight);
    const hit = G.cutHits.find(h => h.id === mate.id), box = G.burnBoxes.ship, left = outlineLeft(box, G.cutOutline), zoom = viewOf(box, lay, left).zoom, sx = x => box.x + (left + box.w) / 2 + (x - W / 2) * zoom, sy = y => box.y + box.h / 2 + (y - G.cam.y) * zoom;
    const half = lay.well.w * W / 2;
    return { hit, pose: posture(mate, phase(), 0, false).name, tube: [sx(LADDER * W - half), sx(LADDER * W + half)], tank: [sy(o.tank.top), sy(o.tank.bottom)] };
  });
  assert.equal(r.pose, 'climb', 'on the ladder');
  assert.ok(r.hit, 'the climber is drawn in view');
  assert.ok(r.hit.x >= r.tube[0] && r.hit.x <= r.tube[1], `inside the tube's width on screen: ${r.hit.x.toFixed(1)} in ${r.tube.map(v => v.toFixed(1))}`);
  assert.ok(r.hit.y >= r.tank[0] && r.hit.y <= r.tank[1], `and between the tank's top and bottom: ${r.hit.y.toFixed(1)} in ${r.tank.map(v => v.toFixed(1))}`);
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

test('the ship\'s log is in the HUD', async () => {
  const wide = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await wide.ev(helpers);
  await wide.ev(([src]) => { window.drawnText = (0, eval)(`(${src})`); }, [`() => { const drawn = [], fill = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, x, ...a) { drawn.push([String(t), x]); return fill.call(this, t, x, ...a); }; return () => { CanvasRenderingContext2D.prototype.fillText = fill; return drawn; }; }`]);
  const w = await wide.ev(() => {
    burn(); G.transit.left = G.transit.total * 0.5;
    ctx.font = '12px "IBM Plex Mono", monospace';  // the log's own font, so the lines break where the HUD breaks them
    const lines = burnShipLog().flatMap(l => wrapText(l, HUD_W - 28)), stop = drawnText(); drawHud(G.W, G.H); const drawn = stop();
    return { lines, drawn, x0: G.W - HUD_W, hudW: G.hudW, label: drawn.some(d => d[0] === "SHIP'S LOG") };
  });
  assert.ok(w.hudW > 0 && w.lines.length > 0 && w.label, 'a wide screen draws the log label');
  for (const l of w.lines) assert.ok(w.drawn.some(d => d[0] === l && d[1] >= w.x0), `HUD line: ${l}`);
  await wide.done();
});

test('a whole burn of ship life draws none of the game\'s dice', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    const t = stageBurn(0), real = Math.random, start = shipPeople().map(p => p.x); let draws = 0, moved = 0;
    G.state.armor = Math.round(ship().armor / 2); (G.state.injured = G.state.injured || {})[G.state.crew[0]] = true; person(G.state.crew[1]).mood = { kind: 'low', until: G.state.day + 10, text: '' };  // damage, a patient and someone low aboard
    Math.random = () => { draws++; return real(); };
    try { for (let el = 0; t.left > 0; el += 1 / 30) { t.left -= 1 / 30; t.elapsed = el; lifeTick(1 / 30); shipPeople().forEach((p, i) => { if (Math.abs(p.x - start[i]) > 0.05) moved++; }); } } finally { Math.random = real; }
    return { draws, moved };
  });
  await done();
  assert.equal(r.draws, 0, 'ship life used only its own dice');
  assert.ok(r.moved > 0, 'and people did move');
});

test('ship life on a burn from an old save starts its own dice and runs', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => { const t = stageBurn(); delete t.lifeRng; tickFor(15); return typeof t.lifeRng; });  // long enough for someone to reach the table (#924: the crew set off one by one)
  await done();
  assert.equal(r, 'number', 'the dice started themselves');
});

// The working routine (docs/superpowers/specs/2026-11-05-working-routine-design.md): a burn in the move phase at a set time of the ship's day.
const dayAt = f => ((f * SHIP_DAY - 6) % SHIP_DAY + SHIP_DAY) % SHIP_DAY;  // the elapsed time at a share of the ship's day

test('at breakfast the crew are at the galley table, seated, the cook at the stove', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.04);
    G.state.crew.push('p:cook'); G.state.people['p:cook'] = { id: 'p:cook', first: 'Cook', role: 'cook', skill: 1, traits: [] }; shipPeople().push({ name: 'Cook', role: 'cook', id: 'p:cook', room: 'berths', x: 0.3, dk: roomAt('berths').deck, tdk: roomAt('berths').deck, seatDk: roomAt('berths').deck, tx: null, wait: 1, seat: 0.3 });  // the narrow build's crew has no cook
    for (let i = 0; shipPeople().filter(p => p.role !== 'cat').length < 8; i++) shipPeople().push({ name: `P${i}`, role: 'passenger', id: `p:t${i}`, room: 'berths', x: 0.3, dk: roomAt('berths').deck, tdk: roomAt('berths').deck, seatDk: roomAt('berths').deck, tx: null, wait: 1, seat: 0.3 });
    tickFor(30);
    const g = ROOMS.find(x => x.id === 'galley'), at = shipPeople().filter(p => p.role !== 'cat');
    return { block: shipDay(t.elapsed).block, n: at.length, g: [g.x0, g.x1, g.w], k: CUT_K,
      eat: at.filter(p => p.role !== 'cook').map(p => ({ id: p.id, in: inRoom(p, 'galley'), pose: posture(p, phase(), 0, isAsleep(p)).name, x: p.x })),
      cook: at.filter(p => p.role === 'cook').map(p => ({ in: inRoom(p, 'galley'), x: p.x, pose: posture(p, phase(), 0, isAsleep(p)).name })) };
  }, dayAt.toString());
  await done();
  assert.equal(r.block, 'breakfast'); assert.ok(r.n >= 8, 'eight aboard');
  for (const p of r.eat) { assert.ok(p.in, `${p.id} at the table`); assert.equal(p.pose, 'sit', `${p.id} seated`); assert.ok(p.x > r.g[0] && p.x < r.g[1], `${p.id} inside the galley`); }
  assert.equal(r.cook.length, 1, 'a cook aboard'); for (const c of r.cook) { assert.ok(c.in && Math.abs(c.x - (r.g[0] + 0.15 * r.g[2])) < 0.003 * r.k, 'the cook at the stove'); assert.equal(c.pose, 'work', 'working at it'); }
});

test('in the wake block some of the crew queue for the head, one inside at a time, and go on to breakfast (#973)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(), st = G.state, deck = roomAt('berths').deck;
    ['quartermaster', 'icehand', 'icehand', 'medic', 'xo', 'slicer'].forEach((role, i) => { const id = `p:h${i}`; st.crew.push(id); st.people[id] = { id, first: `H${i}`, role, skill: 1, traits: [] }; shipPeople().push({ name: `H${i}`, role, id, room: 'berths', x: 0.2 + 0.05 * i, dk: deck, tdk: deck, seatDk: deck, tx: null, wait: 1, seat: 0.3, block: 'night' }); });
    t.elapsed = dayAt(0.91);
    const going = () => shipPeople().filter(p => routineSpot(p, 'wake', { marks: [], hurt: [], low: [], repairs: {}, morning: st.day + shipDay(t.elapsed).day }).room === 'head');
    for (let k = 0; going().length < 4 && k < 200; k++) st.day++;  // a morning with four going
    const out = { block: shipDay(t.elapsed).block, going: going().map(p => p.id), inside: 0, door: 0, wentIn: new Set(), waited: new Set(), firsts: 0 };
    for (let i = 0; i < 40 * 30; i++) {
      lifeTick(1 / 30);
      const head = shipPeople().filter(p => p.room === 'head' && p.at === 'head'), r = roomAt('head');
      const inside = head.filter(p => p.queue === 'inside'), door = head.filter(p => p.queue === 'door' && p.tx === null);
      out.inside = Math.max(out.inside, inside.length); out.door = Math.max(out.door, door.length);
      inside.forEach(p => { if (p.tx === null) out.wentIn.add(p.id); }); door.forEach(p => { out.waited.add(p.id); if (p.x < r.x0 || p.x > r.x0 + r.w * 0.25) out.doorOut = p.x; });
      out.firsts = Math.max(out.firsts, inside.filter(p => p.first).length);
    }
    out.wentIn = [...out.wentIn]; out.waited = [...out.waited];
    out.others = shipPeople().filter(p => p.role !== 'cat' && !out.going.includes(p.id) && p.room === 'head').map(p => p.id);
    out.galley = shipPeople().filter(p => out.wentIn.includes(p.id)).map(p => p.room);
    t.elapsed = dayAt(0.02); tickFor(20);
    out.breakfast = shipPeople().filter(p => p.role !== 'cat' && p.role !== 'captain').map(p => `${p.id}:${inRoom(p, 'galley')}`);
    return out;
  }, dayAt.toString());
  await done();
  assert.equal(r.block, 'wake'); assert.ok(r.going.length >= 4, `four going this morning (${r.going})`);
  assert.ok(r.wentIn.length >= 2, `some went in (${r.wentIn} of ${r.going})`);
  assert.ok(r.wentIn.every(id => r.going.includes(id)), 'only those going today');
  assert.equal(r.inside, 1, 'one inside at a time');
  assert.ok(r.door <= 2, `at most two at the door (${r.door})`);
  assert.equal(r.doorOut, undefined, 'waiting by the door, in the head');
  assert.equal(r.firsts, 1, 'the first in is marked');
  assert.deepEqual(r.others, [], 'nobody else goes');
  assert.ok(r.galley.every(room => room === 'galley'), `once done, to the galley (${r.galley})`);
  assert.deepEqual(r.breakfast.filter(s => s.endsWith('false')), [], 'and all at breakfast');
});

test('in a shift the crew are at their posts, you on rounds, and a scene ends back at the post', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.15);
    tickFor(25);
    const eng = shipPeople().find(p => p.role === 'engineer'), pilot = shipPeople().find(p => p.role === 'pilot'), you = aboardBy('you'), out = { block: shipDay(t.elapsed).block, engine: 0, bridge: 0, frames: 0, rooms: new Set() };
    for (let i = 0; i < 200 * 30; i++) { lifeTick(1 / 30); out.frames++; if (inRoom(eng, 'engine')) out.engine++; if (inRoom(pilot, 'bridge')) out.bridge++; if (you.tx === null) out.rooms.add(you.room); }
    out.rooms = out.rooms.size;
    sayScene(`With ${eng.name}`, `${eng.name} is at the table with a mug.`); tickFor(12);
    out.staged = eng.staged; G.dialog = null; t.event = null;
    out.back = false; for (let i = 0; i < 20 * 30; i++) { lifeTick(1 / 30); out.back = out.back || inRoom(eng, 'engine'); }  // reaches the post within the stretch (a short errand from it may follow)
    return out;
  }, dayAt.toString());
  await done();
  assert.equal(r.block, 'shift');
  assert.ok(r.engine / r.frames > 0.6, `the engineer mostly in the engine room (${r.engine} of ${r.frames})`);
  assert.ok(r.bridge / r.frames > 0.6, `the pilot mostly on the bridge (${r.bridge} of ${r.frames})`);
  assert.ok(r.rooms >= 2, 'you went the rounds');
  assert.equal(r.staged, 'galley', 'the scene had the engineer'); assert.ok(r.back, 'and after it the engineer is back at the post');
});

test('a block that changes while someone is on the ladder takes them to the new place', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.45); tickFor(25);
    const eng = shipPeople().find(p => p.role === 'engineer');
    Object.assign(eng, { x: LADDER, dk: 5.5, tdk: 6 });  // halfway up the tube through the tank from the engine deck, on the way back down
    t.elapsed = dayAt(0.5); tickFor(25);  // supper
    return { in: inRoom(eng, 'galley'), dk: eng.dk, galley: roomAt('galley').deck };
  }, dayAt.toString());
  await done();
  assert.ok(r.in, 'at the table for supper'); assert.equal(r.dk, r.galley, 'up on the galley deck');
});

test('in a shift the engineer works at the drive and the pilot at the controls', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.15); tickFor(25);
    const pose = p => posture(p, phase(), 0, isAsleep(p)).name, eng = shipPeople().find(p => p.role === 'engineer'), pilot = shipPeople().find(p => p.role === 'pilot'), you = aboardBy('you'), seen = { eng: new Set(), pilot: new Set(), you: new Set() };
    for (let i = 0; i < 30 * 30; i++) { lifeTick(1 / 30); if (inRoom(eng, 'engine')) seen.eng.add(pose(eng)); if (inRoom(pilot, 'bridge')) seen.pilot.add(pose(pilot)); seen.you.add(pose(you)); }
    return { eng: [...seen.eng], pilot: [...seen.pilot], you: [...seen.you] };
  }, dayAt.toString());
  await done();
  assert.deepEqual(r.eng, ['work'], 'the engineer at the drive, working'); assert.deepEqual(r.pilot, ['work-sit'], 'the pilot at the controls');
  assert.ok(!r.you.includes('work') && !r.you.includes('work-sit'), 'you on your rounds, not at a post');
});

test('at dusk the captain waits on the bridge for the pilot, they face each other, and then the captain turns in', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.5); tickFor(25);  // supper: the captain on the bridge, the pilot at the table
    const cap = shipPeople().find(p => p.role === 'captain'), pilot = shipPeople().find(p => p.role === 'pilot'), out = { before: [inRoom(cap, 'bridge'), inRoom(pilot, 'galley')], waited: true };
    t.elapsed = dayAt(0.56);
    let arrived = null;
    for (let i = 0; i < 40 * 30; i++) {
      lifeTick(1 / 30);
      const here = inRoom(pilot, 'bridge');
      if (!here && !arrived && !inRoom(cap, 'bridge')) out.waited = false;
      if (here && arrived === null) { arrived = i; out.apart = Math.abs(pilot.x - cap.x); out.faces = [Math.sign(cap.face) === Math.sign(pilot.x - cap.x), null]; }
      if (arrived !== null && i === arrived + 15) out.faces[1] = Math.sign(pilot.face) === Math.sign(cap.x - pilot.x);  // half a second on, both turned to each other
      if (arrived !== null && cap.tx !== null && out.left === undefined) out.left = (i - arrived) / 30;
    }
    out.berths = inRoom(cap, 'berths') || (cap.room === 'berths');
    return out;
  }, dayAt.toString());
  await done();
  assert.deepEqual(r.before, [true, true], 'at supper the captain keeps the bridge and the pilot eats');
  assert.ok(r.waited, 'the captain stays on the bridge until the pilot is there');
  assert.ok(r.apart > 0.02, `each at their own place on the bridge (${r.apart})`); assert.deepEqual(r.faces, [true, true], 'they face each other');
  assert.ok(r.left >= 1.5 && r.left <= 2.5, `the captain turns in about two seconds after (${r.left})`);
  assert.ok(r.berths, 'and is in the berths');
});

test('with no night watch aboard nobody waits at dusk', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.aboard = t.aboard.filter(p => !Object.values(WATCH_ORDER).flat().includes(p.role));  // nobody aboard who could keep a watch (#1034)
    t.elapsed = dayAt(0.5); tickFor(25); t.elapsed = dayAt(0.56); tickFor(1);
    const cap = shipPeople().find(p => p.role === 'captain');
    return { room: cap.room, going: cap.tx !== null || cap.dk !== cap.tdk };
  }, dayAt.toString());
  await done();
  assert.deepEqual(r, { room: 'berths', going: true }, 'the captain is on the way to the berths');
});

test('a watch-keeper held in a scene at dusk leaves the one waiting to turn in by night', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.5); tickFor(25);
    const cap = shipPeople().find(p => p.role === 'captain'), pilot = shipPeople().find(p => p.role === 'pilot');
    sayScene(`With ${pilot.name}`, `${pilot.name} is at the table with the last of the bread.`); tickFor(3);
    t.elapsed = dayAt(0.56); tickFor(10); t.elapsed = dayAt(0.7); tickFor(30);
    return { staged: pilot.staged, berths: cap.room === 'berths' && cap.tx === null };
  }, dayAt.toString());
  await done();
  assert.equal(r.staged, 'galley', 'the pilot was held at the table'); assert.ok(r.berths, 'and the captain is in the berths by night');
});

test('people who share a post each have their own place in the room, and at dusk they hand over across it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.15); tickFor(25);
    const clash = new Set(); let bridge = 0;
    for (let s = 0; s < 60; s++) {  // a second at a time through a minute of the shift: the errands up and down the ladder take people off their posts a while (#972)
      const on = shipPeople().filter(p => p.block === 'shift' && p.at === 'post' && p.tx === null && !p.errand && p.dk === p.tdk);
      for (const a of on) for (const b of on) if (a !== b && a.room === b.room && Math.abs(a.x - b.x) < 0.02 * CUT_K) clash.add(`${a.name}/${b.name} in ${a.room}`);
      bridge = Math.max(bridge, on.filter(p => p.room === 'bridge').length); tickFor(1);
    }
    return { clash: [...clash], bridge };
  }, dayAt.toString());
  await done();
  assert.ok(r.bridge >= 2, 'two at the bridge'); assert.deepEqual(r.clash, [], 'no two in one place');
});

test('after the straps at the flip, everyone goes on to their place in the same block', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(0.3); t.elapsed = dayAt(0.15); tickFor(25);
    const eng = shipPeople().find(p => p.role === 'engineer');
    Object.assign(eng, { room: 'engine', x: roomAt('galley').mid, dk: roomAt('galley').deck, tdk: roomAt('engine').deck, tx: roomAt('engine').mid, errand: false, wait: 999 });  // on the mess deck on the way down to the drive, with no errand to rescue them
    t.left = t.total * (1 - securePr(t)); tickFor(2);  // strapped in where they are
    t.left = t.total * (1 - 0.6); let got = false; for (let k = 0; k < 25 && !got; k++) { tickFor(1); got = inRoom(eng, 'engine'); }  // under way again, the same shift: at the drive (from where the shift's errands may take them on, #973)
    return got && (inRoom(eng, 'engine') || eng.errand);  // and still there, or gone on an errand from it
  }, dayAt.toString());
  await done();
  assert.ok(r, 'the engineer got to the drive');
});

test('someone who stepped aside for a scene goes back to their post when it closes, and does not work in the other room', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.15); tickFor(25);
    const eng = shipPeople().find(p => p.role === 'engineer'), mate = shipPeople().find(p => p.role === 'pilot'), e = roomAt('engine');
    Object.assign(eng, { room: 'engine', x: e.mid, dk: e.deck, tdk: e.deck, tx: null, errand: false, wait: 999 });  // at the drive, in the middle of the room
    sayScene(`With ${mate.name}`, `${mate.name} is down in the engine room, by the drive.`); tickFor(20);
    const out = { aside: eng.room, pose: posture(eng, phase(), 0, isAsleep(eng)).name };
    G.dialog = null; t.event = null; out.back = false;
    for (let i = 0; i < 25 * 30 && !out.back; i++) { lifeTick(1 / 30); out.back = inRoom(eng, 'engine'); }  // back at the drive within 25 s (the routine may send them on an errand after, #990)
    return out;
  }, dayAt.toString());
  await done();
  assert.notEqual(r.aside, 'engine', 'stepped aside'); assert.notEqual(r.pose, 'work', 'not working in another room'); assert.ok(r.back, 'back at the drive after');
});

test('a captain waiting at dusk for the pilot goes to a scene that needs them', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.5); tickFor(25);
    const cap = shipPeople().find(p => p.role === 'captain'), pilot = shipPeople().find(p => p.role === 'pilot');
    Object.assign(pilot, { block: 'handover', room: 'galley', x: roomAt('galley').mid, tx: null, dk: roomAt('galley').deck, tdk: roomAt('galley').deck, wait: 999 });  // the pilot dawdles at the table
    t.elapsed = dayAt(0.56); tickFor(1);
    const waiting = !!cap.relief;
    sayScene(`With ${cap.name}`, `${cap.name} is at the table with a mug.`); tickFor(15);
    return { waiting, staged: cap.staged, there: inRoom(cap, 'galley') };
  }, dayAt.toString());
  await done();
  assert.ok(r.waiting, 'the captain was waiting on the bridge'); assert.equal(r.staged, 'galley'); assert.ok(r.there, 'and went to the table for the scene');
});

test('the cook sent on a drill does not work at the stove from the hold', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); t.elapsed = dayAt(0.15);
    G.state.crew.push('p:cook'); G.state.people['p:cook'] = { id: 'p:cook', first: 'Cook', role: 'cook', skill: 1, traits: [] }; shipPeople().push({ name: 'Cook', role: 'cook', id: 'p:cook', room: 'berths', x: 0.3, dk: roomAt('berths').deck, tdk: roomAt('berths').deck, seatDk: roomAt('berths').deck, tx: null, wait: 1, seat: 0.3 });
    tickFor(25); const cook = shipPeople().find(p => p.role === 'cook'); toActivity(cook, 'hold');
    const out = { reached: false, worked: false };  // through the visit, frame by frame: the timetable may take them back to the stove before it ends
    for (let i = 0; i < 20 * 30; i++) { lifeTick(1 / 30); if (inRoom(cook, 'hold')) { out.reached = true; if (posture(cook, phase(), 0, isAsleep(cook)).name === 'work') out.worked = true; } }
    return out;
  }, dayAt.toString());
  await done();
  assert.ok(r.reached, 'the cook got to the hold'); assert.equal(r.worked, false, 'no stove in the hold');
});

// The ship's state (docs/superpowers/specs/2026-11-06-ship-state-design.md).
test('a hurt crew member lies in the medbay all day, and whoever gives first aid works by them in a shift', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(), pilot = shipPeople().find(p => p.role === 'pilot'), pose = p => posture(p, phase(), 0, isAsleep(p)).name, out = {};
    (G.state.injured = G.state.injured || {})[pilot.id] = true;
    for (const [k, f] of [['breakfast', 0.04], ['shift', 0.15], ['supper', 0.5]]) { t.elapsed = dayAt(f); tickFor(30); out[k] = [inRoom(pilot, 'medbay'), pose(pilot)]; if (k === 'shift') { const aid = shipPeople().find(p => p.id === roleHolder('medic').id); out.aid = [inRoom(aid, 'medbay'), pose(aid)]; } }
    delete G.state.injured[pilot.id]; t.elapsed = dayAt(0.15); out.back = false;
    for (let i = 0; i < 30 * 30 && !out.back; i++) { lifeTick(1 / 30); out.back = inRoom(pilot, 'bridge'); }  // gets there (a later errand may take them out again)
    return out;
  }, dayAt.toString());
  await done();
  for (const k of ['breakfast', 'shift', 'supper']) assert.deepEqual(r[k], [true, 'bunk'], `the pilot in a medbay bunk at ${k}`);
  assert.deepEqual(r.aid, [true, 'work'], 'first aid at work by the bunk'); assert.ok(r.back, 'treated, back on the bridge');
});

test('with damage the engineer works at a marked room in a shift, keeps the drive at night, and goes back to it when the hull is mended', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(), eng = shipPeople().find(p => p.role === 'engineer'), pose = p => posture(p, phase(), 0, isAsleep(p)).name, out = {};
    G.state.armor = Math.round(ship().armor * 0.6);  // 0.4 lost: two marks
    t.elapsed = dayAt(0.15); tickFor(30); out.marks = [...(t.marks || [])]; out.shift = [out.marks.includes(eng.room) && eng.tx === null, pose(eng)];
    t.elapsed = dayAt(0.7); tickFor(30); out.night = inRoom(eng, 'engine');
    t.elapsed = dayAt(0.15); tickFor(30); G.state.armor = ship().armor;
    let back = false; for (let i = 0; i < 30 * 30; i++) { lifeTick(1 / 30); back = back || inRoom(eng, 'engine'); }  // reaches the drive within the half minute (a short errand from it may follow)
    out.mended = [t.marks.length, back];
    return out;
  }, dayAt.toString());
  await done();
  assert.equal(r.marks.length, 2, 'two rooms marked'); assert.deepEqual(r.shift, [true, 'work'], 'the engineer at work at a mark');
  assert.ok(r.night, 'the drive at night'); assert.deepEqual(r.mended, [0, true], 'mended: no marks, back at the drive');
});

test('with more marks than hands the hands take the nearest and nobody is stuck', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(); G.state.armor = 1; t.elapsed = dayAt(0.15); tickFor(35);
    const hands = shipPeople().filter(p => p.role === 'engineer' || p.role === 'icehand');
    return { marks: t.marks.length, at: hands.map(h => t.marks.includes(h.room) && h.tx === null && h.dk === h.tdk), rooms: new Set(hands.map(h => h.room)).size, hands: hands.length };
  }, dayAt.toString());
  await done();
  assert.equal(r.marks, 3); assert.ok(r.at.every(Boolean), 'each hand at a mark'); assert.equal(r.rooms, r.hands, 'one hand to a room');
});

test('someone having a hard time eats alone in the berths', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(), gun = shipPeople().find(p => p.id && p.role !== 'you' && p.role !== 'captain' && !onWatchTonight(p, nightState()) && G.state.crew.includes(p.id) && p.role !== 'cook');
    person(gun.id).mood = { kind: 'low', until: G.state.day + 10, text: '' };
    t.elapsed = dayAt(0.33); tickFor(30);
    const others = shipPeople().filter(p => p !== gun && p.role !== 'cat' && G.state.crew.includes(p.id) && p.role !== 'cook');
    return { alone: inRoom(gun, 'berths'), pose: posture(gun, phase(), 0, isAsleep(gun)).name, table: others.every(p => inRoom(p, 'galley')) };
  }, dayAt.toString());
  await done();
  assert.ok(r.alone, 'in the berths'); assert.equal(r.pose, 'sit'); assert.ok(r.table, 'the rest at the table');
});

test('you, hurt, sleep in the medbay and walk slower', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(), you = aboardBy('you'), mate = shipPeople().find(p => p.role === 'pilot');
    const pace = p => { Object.assign(p, { room: 'galley', x: 0.05, dk: roomAt('galley').deck, tdk: roomAt('galley').deck, tx: 0.05 + 0.2 * CUT_K, staged: undefined, block: 'x', wait: 99, leave: 0, go: 1 }); const b = shipDay(t.elapsed).block; p.block = b; const x0 = p.x; lifeTick(0.5); return p.x - x0; };  // under way, at their own pace (#924)
    career().hurtUntil = G.state.day + 5;
    t.elapsed = dayAt(0.7); tickFor(35);
    const out = { bed: inRoom(you, 'medbay'), pose: posture(you, phase(), 0, isAsleep(you)).name };
    t.elapsed = dayAt(0.15); out.paces = [pace(you)]; career().hurtUntil = 0; out.paces.push(pace(you));  // hurt, then well: the same person's two paces
    return out;
  }, dayAt.toString());
  await done();
  assert.ok(r.bed, 'in the medbay at night'); assert.equal(r.pose, 'bunk');
  assert.ok(Math.abs(r.paces[0] / r.paces[1] - 2 / 3) < 0.05, `two thirds of the pace (${r.paces})`);
});

test('with no first-aid giver up, nobody waits by the bunks', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(), aid = roleHolder('medic');
    (G.state.injured = G.state.injured || {})[aid.id] = true;
    const left = roleHolder('medic'); t.elapsed = dayAt(0.15); tickFor(30);
    return { left: left ? left.id : null, aiding: shipPeople().filter(p => p.at === 'aid').map(p => p.id) };
  }, dayAt.toString());
  await done();
  assert.equal(r.left, null, 'the only one with first aid is the one hurt'); assert.deepEqual(r.aiding, [], 'nobody by the bunks');
});

test('a patient stays on the medbay cot through the hard burn and the flip, and is not walked to a couch (#976)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    const t = stageBurn(0.3), pose = p => posture(p, phase(), 0, isAsleep(p)), pt = shipPeople().find(p => p.id && G.state.crew.includes(p.id));
    (G.state.injured = G.state.injured || {})[pt.id] = true; tickFor(60);
    const at = () => ({ inBed: inRoom(pt, 'medbay') && pt.at === 'bed', pose: pose(pt).name, strapped: !!pose(pt).strapped });
    const out = { before: at() };
    t.left = t.total * (1 - 0.97); tickFor(3); out.burn = at();
    t.left = t.total * (1 - 0.5); tickFor(2); out.flip = at();
    return out;
  });
  await done();
  assert.deepEqual(r.before, { inBed: true, pose: 'bunk', strapped: false }, 'in bed in the cruise');
  assert.deepEqual(r.burn, { inBed: true, pose: 'bunk', strapped: false }, 'still on the cot in the hard burn');
  assert.deepEqual(r.flip, { inBed: true, pose: 'bunk', strapped: true }, 'strapped down on the cot at the flip');
});

test('a burn with half its armor draws its two marked rooms without an error', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => { const t = stageBurn(); G.state.armor = Math.round(ship().armor / 2); tickFor(1); drawTransit(innerWidth, innerHeight); return t.marks.length; });
  await done();
  assert.equal(r, 2);
});

test('someone having a hard time sits up alone in the dusk, the wounded stay in bed through a medbay scene and the straps', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(dayAtSrc => {
    const dayAt = eval(dayAtSrc), t = stageBurn(), pose = p => posture(p, phase(), 0, isAsleep(p)).name, out = {};
    const low = shipPeople().find(p => p.id && G.state.crew.includes(p.id) && !onWatchTonight(p, nightState()) && p.role !== 'cook' && p.role !== 'xo');
    person(low.id).mood = { kind: 'low', until: G.state.day + 10, text: '' };
    t.elapsed = dayAt(0.6); tickFor(25); out.dusk = [isAsleep(low), pose(low)];
    const pilot = shipPeople().find(p => p.role === 'pilot'), mate = shipPeople().find(p => p.role === 'engineer');
    (G.state.injured = G.state.injured || {})[pilot.id] = true; t.elapsed = dayAt(0.15); tickFor(30);
    sayScene(`With ${mate.name}`, `${mate.name} is in the medbay, by the cot.`); tickFor(15);
    out.scene = [pilot.room, inRoom(pilot, 'medbay'), pose(pilot)]; G.dialog = null; t.event = null; tickFor(5);
    delete G.state.injured[pilot.id]; tickFor(2); (G.state.injured)[pilot.id] = true; Object.assign(pilot, { room: 'galley', x: 0.2, dk: roomAt('galley').deck, tdk: roomAt('galley').deck, tx: 0.2 + 0.05 * CUT_K, block: undefined });
    lifeTick(1 / 30); t.left = t.total * (1 - securePr(t)); tickFor(1); out.strapped = pose(pilot);
    return out;
  }, dayAt.toString());
  await done();
  assert.deepEqual(r.dusk, [false, 'sit'], 'awake and sitting at dusk');
  assert.deepEqual(r.scene, ['medbay', true, 'bunk'], 'the patient stays in bed through the scene');
  assert.notEqual(r.strapped, 'bunk', 'not lying in the air on the way to the medbay at the straps');
});

// #919: Comms has a place in the ship. A comms rack at the back of the bridge opens the Comms sheet, as a room opens its console; the rest
// of the bridge still opens the bridge. And the COMMS box under the ship says that a tap opens it.
test('the comms rack on the bridge opens Comms and the rest of the bridge opens the bridge', async () => {
  const { ev, page, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => {
    burn(); G.transit.left = G.transit.total * 0.7; G.transit.angle = -Math.PI / 2; G.transit.flipped = false;
    const br = roomAt('bridge'); for (const p of shipPeople()) Object.assign(p, { x: br.x0 + (br.x1 - br.x0) * 0.6, dk: br.deck, tdk: br.deck, tx: null, wait: 999 });  // everyone at the front of the bridge, the camera on it
    G.cam = null;
  });
  await frames(page);
  const rack = await ev(() => G.cutRack);
  assert.ok(rack && rack.w > 8 && rack.h > 20, `the rack is drawn in view: ${JSON.stringify(rack)}`);
  await page.mouse.click(rack.x + rack.w / 2, rack.y + rack.h / 2);
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), 'comms', 'a tap on the rack opens Comms');
  await ev(() => { G.bridgeOpen = null; syncBridge(true); });  // the sheet is over the ship now; it closes with its own Close (#913)
  await frames(page);
  const elsewhere = await ev(r => { const b = G.cutRooms.find(x => x.id === 'bridge'); return { x: Math.max(b.x + 4, r.x - 30), y: r.y + r.h / 2 }; }, rack);
  await page.mouse.click(elsewhere.x, elsewhere.y);
  await frames(page);
  assert.equal(await ev(() => G.bridgeOpen), 'nav', 'beside the rack is still the bridge');
  await done();
});

// #925: a seat under everyone who sits, and crash couches that fold out of the deck.
test('people sit only on a seat the cutaway draws, and the table and the posts at the bridge and the guns are seats (#925)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); G.transit.left = G.transit.total * 0.7; G.transit.angle = -Math.PI / 2; G.transit.flipped = false;
    const out = { rooms: {} }, base = { role: 'engineer', dk: roomAt('bridge').deck, tdk: roomAt('bridge').deck, tx: null, block: 'linger' };
    for (const room of ['galley', 'gunnery', 'bridge', 'medbay']) {
      const rm = roomAt(room), seats = SEATS[room].map(f => rm.x0 + rm.w * f);
      const at = x => posture({ ...base, room, x, dk: rm.deck, tdk: rm.deck }, 'move', 0, false).name;
      out.rooms[room] = { onSeat: seats.map(at), off: at(rm.x0 + rm.w * 0.1) };  // a tenth of the way in: no seat there
    }
    // the table and the posts go to the seats, as many as there are
    const g = roomAt('galley'), b = roomAt('bridge');
    out.table = [0, 1, 2, 3].map(i => routineTarget({}, { at: 'table' }, g, i, 4, () => 0.5)).map(x => +((x - g.x0) / g.w).toFixed(2));
    out.post = [0, 1].map(i => routineTarget({}, { at: 'post', room: 'bridge' }, b, i, 2, () => 0.5)).map(x => +((x - b.x0) / b.w).toFixed(2));
    out.workOff = posture({ ...base, room: 'bridge', x: b.x0 + b.w * 0.56, at: 'post', block: 'shift' }, 'move', 0, false).name;  // between two of its seats
    out.workOn = posture({ ...base, room: 'bridge', x: b.x0 + b.w * SEATS.bridge[0], at: 'post', block: 'shift' }, 'move', 0, false).name;
    // and the cutaway draws a seat at each: a stool, a pilot's seat on the bridge (#933), or in the galley one bench the length of the table's places
    const drawn = [], benches = [], real = window.roomStool, realBench = window.roomBench, realPilot = window.roomBridgeSeat;
    window.roomStool = (c, x, F, ...a) => { drawn.push([Math.round(x), Math.round(F)]); return real(c, x, F, ...a); };
    window.roomBridgeSeat = (c, x, F) => { drawn.push([Math.round(x), Math.round(F)]); return realPilot(c, x, F); };
    window.roomBench = (c, x0, x1, F) => { benches.push([x0, x1]); return realBench(c, x0, x1, F); };
    const lay = LAYOUTS.freighter;
    for (const room of Object.keys(SEATS)) { G.cam = { y: layoutBox(lay, room).floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); }  // the camera held on the room's deck
    window.roomStool = real; window.roomBench = realBench; window.roomBridgeSeat = realPilot;
    const len = lay.width, seatAt = (room, f) => (roomAt(room).x0 + roomAt(room).w * f) * len, on = (room, f) => drawn.some(([x, F]) => Math.abs(x - seatAt(room, f)) <= 1 && F === Math.round(deckFloor(lay, roomAt(room).deck)));  // the place and its deck
    out.missing = Object.entries(SEATS).filter(([room]) => room !== 'galley').flatMap(([room, fs]) => fs.filter(f => !on(room, f)).map(f => [room, f]));
    out.bench = SEATS.galley.every(f => benches.some(([a, b]) => seatAt('galley', f) > a && seatAt('galley', f) < b));
    out.galleyStools = SEATS.galley.filter(f => on('galley', f)).length;
    return out;
  });
  for (const [room, v] of Object.entries(r.rooms)) {
    assert.ok(v.onSeat.every(n => n === 'sit'), `${room}: on a seat, they sit (${v.onSeat})`);
    assert.equal(v.off, 'stand', `${room}: off a seat, they stand`);
  }
  assert.deepEqual(r.table, SEATS_EXPECTED.galley, 'the table\'s places are the galley\'s seats');
  assert.deepEqual(r.post, SEATS_EXPECTED.bridge, 'the bridge posts are its seats');
  assert.equal(r.workOff, 'work', 'at work off a seat: standing'); assert.equal(r.workOn, 'work-sit', 'at work on a seat: sitting');
  assert.deepEqual(r.missing, [], 'every seat is drawn'); assert.ok(r.bench, 'the galley\'s places are one bench'); assert.equal(r.galleyStools, 0, 'not a row of stools');
  await done();
});
const SEATS_EXPECTED = { galley: [0.28, 0.35, 0.42, 0.49], bridge: [0.12, 0.3] };

// #933, #956: the gunnery's rack holds the torpedoes the ship carries, so the cutaway hands the rooms that count, clamped to the rack's six cradles.
test('the cutaway hands the rooms the torpedoes aboard, clamped to the rack\'s cradles, the magazine\'s six (#933)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); G.transit.left = G.transit.total * 0.7;
    const seen = {}, real = window.drawRoom;
    window.drawRoom = (c, id, q, s) => { if (id === 'gunnery') seen.n = s.torpedoes; return real(c, id, q, s); };
    const out = { carried: G.state.torpedoes, cradles: GUN_CRADLES, max: TORP_MAX, at: {} };
    G.cam = { y: layoutBox(LAYOUTS.freighter, 'gunnery').floor - HULL.deck / 2, t: G.time };
    for (const n of [undefined, -1, 0, 2, 6, 9]) { G.state.torpedoes = n; seen.n = 'none'; drawTransit(innerWidth, innerHeight); out.at[String(n)] = seen.n; }
    window.drawRoom = real;
    return out;
  });
  assert.equal(r.carried, 2, 'Hester\'s ship carries two (HAND_TORPS, #956)');
  assert.equal(r.cradles, r.max, 'the rack\'s cradles are the magazine\'s six');
  assert.deepEqual(r.at, { undefined: 0, '-1': 0, 0: 0, 2: 2, 6: 6, 9: 6 }, 'the count the rooms are given');
  await done();
});

test('the crash couches are fixed in the rooms, the bridge\'s station chairs among them, and in the hard burn each of the company lies on their own (#925, #990)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, people = shipPeople().filter(p => p.role !== 'cat'), lay = LAYOUTS.freighter;
    // the racks drawn (rooms.js roomCouchRack: x, the deck's floor, its tiers, its first couch, the couches taken), the camera on the bridge and on the berths
    const racks = () => { const seen = []; const real = window.roomCouchRack; window.roomCouchRack = (c, x, F, n, first, on) => { seen.push({ x, F, n, first, on: [...(on || [])] }); return real(c, x, F, n, first, on); };
      for (const id of ['bridge', 'berths']) { G.cam = { y: layoutBox(lay, id).floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); }
      window.roomCouchRack = real; return seen; };
    const run = s => { for (let k = 0; k < s * 20; k++) lifeTick(0.05); };
    const lying = () => people.filter(p => posture(p, phase(), 0, false).name === 'couch');
    const out = {};
    t.left = t.total * 0.99; run(2);  // the burn out: everyone on their couch
    const start = racks(), order = bunkOwners(people, people.length), plan = couchPlan(order.map(p => p.role), POSTS[hired().post].role);
    // the bridge's station couches as drawn (rooms.js roomBridgeSeat: x, the deck's floor, how far reclined)
    const seats = () => { const seen = []; const real = window.roomBridgeSeat; window.roomBridgeSeat = (c, x, F, rec) => { seen.push(rec); return real(c, x, F, rec); };
      G.cam = { y: layoutBox(lay, 'bridge').floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); window.roomBridgeSeat = real; return seen.join(); };
    out.start = { lying: lying().length, n: people.length, own: people.map(p => { const q = plan[order.indexOf(p)]; return q.at === 'station' ? p.station === q.seat : p.couchAt === q.k; }), racks: [...new Set(start.map(k => `${k.first}:${k.n}`))].join(' '),
      on: [...new Set(start.flatMap(k => k.on))].sort((a, b) => a - b).join(), want: people.filter(p => p.couchAt !== null).map(p => p.couchAt).sort((a, b) => a - b).join(),
      lifted: people.every(p => p.lift === (p.station !== null ? 23 : couchPlaces()[p.couchAt].lift)), bridge: people.filter(p => p.room === 'bridge').map(p => p.role).sort().join(), seats: seats() };
    t.left = t.total * 0.5 - t.total * 0.1; run(3);  // under way: off the couches, which are still there, their harness loose
    const cruise = racks(); out.cruise = { racks: [...new Set(cruise.map(k => `${k.first}:${k.n}`))].join(' '), on: cruise.flatMap(k => k.on).length, off: people.every(p => p.couch === 0), seats: seats() };
    // the hard burn in: they start away from their couches, on the couch's deck, toward the middle; and one from the berths up on the bridge
    for (const p of people) Object.assign(p, { x: p.seat + (p.seat < 0.5 ? 1 : -1) * 0.1 * CUT_K, dk: p.seatDk, tdk: p.seatDk, tx: null });
    const up = people.find(p => p.seatDk === roomAt('berths').deck); Object.assign(up, { x: 0.2, dk: roomAt('bridge').deck, tdk: roomAt('bridge').deck });
    out.decks = [...new Set(people.map(p => p.seatDk))].sort();
    t.left = t.total * 0.03; lifeTick(0.05);
    out.away = lying().length;
    out.floors = [];  // nobody passes through a floor: a deck changes only on the ladder in the well (#972)
    for (let k = 0; k < 12 * 20; k++) {
      const was = people.map(p => p.dk); lifeTick(0.05);
      people.forEach((p, i) => { if (p.dk !== was[i] && Math.abs(p.x - LADDER) > 0.003 * CUT_K) out.floors.push(`${p.name} at ${p.x.toFixed(3)}: ${was[i]} to ${p.dk}`); });
    }
    out.end = { lying: lying().length, on: people.every(p => p.dk === p.seatDk), upOn: up.dk === up.seatDk };
    // a company larger than the couches: four passengers more, who lie strapped into a bunk
    for (const k of [1, 2, 3, 4]) G.state.missions.push({ id: 900 + k, type: 'passenger', who: `Pax Nine${k}`, pax: 1, bonus: 0, destSystem: G.state.systemId, destPlanet: 'x', title: 'x', pay: 1, deadline: G.state.day + 60, eventDone: true });
    t.aboard = null; const more = shipPeople().filter(p => p.role !== 'cat'); t.left = t.total * 0.99; run(2);
    const seen = [], real = window.drawPerson; window.drawPerson = (c, pose, x, y, o) => { seen.push({ name: pose.name, strapped: !!pose.strapped }); return real(c, pose, x, y, o); };
    G.cam = { y: layoutBox(lay, 'berths').floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); window.drawPerson = real;
    out.more = { n: more.length, couched: more.filter(p => p.couchAt !== null || p.station !== null).length, bunked: more.filter(p => p.couchAt === null && p.station === null).map(p => p.role).join(), bunks: seen.filter(q => q.name === 'bunk' && q.strapped).length };
    return out;
  });
  assert.equal(r.start.lying, r.start.n, `the burn out: everyone on a couch ${JSON.stringify(r.start)}`);
  assert.ok(r.start.own.every(Boolean), 'the k-th of the company on couch k');
  assert.ok(r.start.lifted, 'each at their couch\'s height');
  assert.equal(r.start.bridge, 'captain,pilot,slicer,you', 'the hand, the captain, the pilot and the slicer on the bridge\'s station couches');
  assert.equal(r.start.seats, '1,1,1,1', 'every station couch reclined flat in the hard burn'); assert.equal(r.cruise.seats, '0,0,0,0', 'and upright under way');
  assert.equal(r.start.racks, '0:3', 'the berths\' rack');
  assert.equal(r.start.on, r.start.want, 'each taken rack couch drawn with its person strapped in');
  assert.equal(r.cruise.racks, r.start.racks, 'under way the couches are still there'); assert.equal(r.cruise.on, 0, 'and empty'); assert.ok(r.cruise.off, 'everyone up');
  assert.deepEqual(r.decks, [0, 2], 'couches on the bridge and in the berths');
  assert.equal(r.away, 0, 'at the start of the hard burn nobody lies back on the air');
  assert.deepEqual(r.floors, [], 'nobody passes through a floor on the way to a couch');
  assert.ok(r.end.upOn, 'the one on the wrong deck took the ladder down to their couch');
  assert.ok(r.end.on && r.end.lying === r.start.n, `once at their couches, everyone lies on one ${JSON.stringify(r.end)}`);
  assert.deepEqual([r.more.n, r.more.couched, r.more.bunked, r.more.bunks], [11, 7, 'passenger,passenger,passenger,passenger', 4], `past the couches, strapped into a bunk ${JSON.stringify(r.more)}`);
  await done();
});

test('on a small ship past the couches each straps into the bunk they walked to, and every name on the rack shows (#990)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn('gunship'); const t = G.transit, lay = LAYOUTS.freighter;
    for (const k of [1, 2]) G.state.missions.push({ id: 900 + k, type: 'passenger', who: `Pax Nine${k}`, pax: 1, bonus: 0, destSystem: G.state.systemId, destPlanet: 'x', title: 'x', pay: 1, deadline: G.state.day + 60, eventDone: true });
    t.aboard = null; const people = shipPeople().filter(p => p.role !== 'cat'); t.left = t.total * 0.99;
    for (let k = 0; k < 2 * 20; k++) lifeTick(0.05);
    const drawn = [], texts = [], real = window.drawPerson, realText = window.worldText;
    window.drawPerson = (c, pose, x, y, o) => { drawn.push({ name: pose.name, x }); return real(c, pose, x, y, o); };
    window.worldText = (c, zoom, text, x, y, px, col, align) => { texts.push({ text, x, y, w: c.measureText(text).width / zoom }); return realText(c, zoom, text, x, y, px, col, align); };
    G.cam = { y: layoutBox(lay, 'berths').floor - HULL.deck / 2, t: G.time }; drawTransit(innerWidth, innerHeight); window.drawPerson = real; window.worldText = realText;
    const bunked = people.filter(p => p.couchAt === null && p.station === null), rack = people.filter(p => p.couchAt !== null);
    return { berths: ship().berths, n: people.length, bunked: bunked.map(p => ({ seat: p.seat * lay.width, bunk: p.bunk, couch: p.couch })), bunks: drawn.filter(q => q.name === 'bunk').map(q => q.x),
      names: rack.map(p => p.name), labels: texts.filter(q => rack.some(p => p.name === q.text)) };
  });
  await done();
  assert.equal(r.berths, 6, 'the gunship'); assert.equal(r.bunked.length, 2, `two past the couches ${JSON.stringify(r)}`);
  assert.equal(new Set(r.bunked.map(q => q.bunk)).size, 2, 'in two bunks');
  for (const q of r.bunked) assert.ok(q.couch >= 0.6 && r.bunks.some(x => Math.abs(x - q.seat) < 0.01), `drawn in the bunk they walked to (${q.seat}; drawn at ${r.bunks})`);
  assert.equal(r.labels.length, r.names.length, `every name on the rack shows (${r.labels.map(q => q.text)} of ${r.names})`);
  for (let i = 0; i < r.labels.length; i++) for (let j = i + 1; j < r.labels.length; j++) {
    const a = r.labels[i], b = r.labels[j];
    assert.ok(Math.abs(a.x - b.x) >= (a.w + b.w) / 2 || Math.abs(a.y - b.y) >= 10, `${a.text} and ${b.text} apart`);
  }
});

// #927: at the flip someone asleep stays in their bunk, strapped, and everyone strapped in sits in a jump seat that folds down from the wall.
test('at the flip a sleeper stays in the bunk, and every strapped person has a jump seat under them (#927)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit;
    for (let f = 0; f < 1 && !isDark(); f += 0.01) t.elapsed = f * SHIP_DAY;  // a night
    const b = roomAt('berths'), sleeper = shipPeople().find(p => p.role !== 'cat' && !onWatchTonight(p, nightState()));
    Object.assign(sleeper, { room: 'berths', x: b.x0 + b.w * 0.3, dk: b.deck, tdk: b.deck, tx: null, staged: undefined, at: undefined });
    t.left = t.total * (1 - 0.3); const moving = isAsleep(sleeper);
    t.left = t.total * (1 - securePr(t)); const securing = [isAsleep(sleeper), posture(sleeper, phase(), 0, isAsleep(sleeper)).name];
    t.left = t.total * (1 - 0.5); const floating = [isAsleep(sleeper), posture(sleeper, phase(), 0, isAsleep(sleeper)).name];
    // and the jump seats: one drawn for each person drawn strapped in, at the flip and while securing
    const counts = [];
    for (const pr of [securePr(t), 0.5]) {
      t.left = t.total * (1 - pr);
      for (const p of shipPeople()) if (p !== sleeper && p.role !== 'cat') Object.assign(p, { room: 'galley', x: roomAt('galley').x0 + roomAt('galley').w * 0.1, dk: roomAt('galley').deck, tdk: roomAt('galley').deck, tx: null });
      G.cam = null;
      let seats = 0, strapped = 0; const realSeat = window.roomJumpSeat, realPerson = window.drawPerson;
      window.roomJumpSeat = (...a) => { seats++; return realSeat(...a); };
      window.drawPerson = (c, pose, ...a) => { if (pose.name === 'strap') strapped++; return realPerson(c, pose, ...a); };
      drawTransit(innerWidth, innerHeight);
      window.roomJumpSeat = realSeat; window.drawPerson = realPerson;
      counts.push([seats, strapped]);
    }
    return { moving, securing, floating, counts };
  });
  assert.equal(r.moving, true, 'asleep at night under way');
  assert.deepEqual(r.securing, [true, 'bunk'], 'still asleep in the bunk while the crew straps in');
  assert.deepEqual(r.floating, [true, 'bunk'], 'and through the float');
  for (const [seats, strapped] of r.counts) { assert.ok(strapped > 0, 'someone strapped in is drawn'); assert.equal(seats, strapped, 'a jump seat for each'); }
  await done();
});

// #924: the crew set off one by one when the day moves on, each at their own pace, and stop clear of one another.
test('crew sent to the same place set off one by one, and stop apart (#924)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(stageHelpers);
  const r = await ev(() => {
    const t = stageBurn(); const crew = shipPeople().filter(p => p.role !== 'cat' && p.role !== 'captain');
    const h = roomAt('hold'), g = roomAt('galley');
    for (const p of crew) Object.assign(p, { room: 'galley', x: g.mid, dk: g.deck, tdk: g.deck, tx: null, wait: 999, block: 'shift', staged: undefined, errand: false, aside: false });
    const start = crew.map(p => p.x);
    for (const p of crew) { routineGo(p, 'meal', crew, false, () => 0.5, shipState(G.state, t, ship().armor, () => 0.5, {})); p.block = 'meal'; }  // all sent to the table at once
    for (let i = 0; i < 15; i++) lifeTick(1 / 30);  // half a second
    const moved = crew.map((p, i) => Math.abs(p.x - start[i]) > 0.001 * CUT_K);
    // three sent to the same spot in the hold
    const three = crew.slice(0, 3);
    for (const p of three) { Object.assign(p, { block: 'activity', errand: false, wait: 999, leave: 0 }); goTo(p, 'hold', () => 0.5, three); }
    for (let i = 0; i < 40 * 30 && three.some(p => p.tx !== null); i++) lifeTick(1 / 30);
    const xs = three.map(p => p.x), gaps = [Math.abs(xs[0] - xs[1]), Math.abs(xs[0] - xs[2]), Math.abs(xs[1] - xs[2])];
    return { moved, arrived: three.every(p => p.tx === null && p.room === 'hold' && p.dk === h.deck), gaps, inHold: xs.every(x => x >= h.x0 && x <= h.x1), k: CUT_K };
  });
  assert.ok(r.moved.some(Boolean) && r.moved.some(m => !m), `half a second in, some have set off and some not yet: ${r.moved}`);
  assert.ok(r.arrived && r.inHold, 'the three got to the hold');
  assert.ok(Math.min(...r.gaps) >= 0.009 * r.k, `and stand apart: ${r.gaps.map(g => g.toFixed(3))}`);
  await done();
});

// #946: the burn view's "today" moves with the burn (transitNow), and the HUD beside it printed the departure day until the arrival.
test('in a burn the HUD\'s date is the burn\'s today, the same date the burn bar prints', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, st = G.state;
    t.days = Math.max(6, t.days); t.elapsed = t.total * 0.6; t.left = t.total * 0.4;  // well past the midpoint, so today is days on from the departure
    const texts = []; const real = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { texts.push(String(s)); return real.call(this, s, ...a); };
    try { render(); } finally { CanvasRenderingContext2D.prototype.fillText = real; }
    const departure = dateOf(st.day), today = dateOf(transitNow(t));
    return { departure, today, hudDates: texts.filter(s => s === departure || s === today || s.startsWith(`${departure}  `) || s.startsWith(`${today}  `)), bar: texts.find(s => s.includes('arriving')) };
  });
  assert.notEqual(r.today, r.departure, 'the burn has moved the date on');
  assert.ok(r.bar && r.bar.includes(r.today), `the burn bar prints today: ${r.bar}`);
  assert.ok(r.hudDates.length >= 1 && r.hudDates.every(s => s.startsWith(r.today)), `every date on the HUD is the burn's today, not the departure: ${r.hudDates}`);
  await done();
});

test('the Gunnery sheet opens with the post\'s orders in view, above the diagram (#975)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await ev(helpers);
  const r = await ev(() => {
    burn(); G.bridgeOpen = 'weapons'; syncBridge(true);
    const body = document.querySelector('#bsheet .bsheet-body'), b = document.querySelector('#bsheet [data-action="postOrder"][data-arg="gunner:boresight"]');
    return { scrolled: body.scrollTop, inView: b.getBoundingClientRect().bottom <= body.getBoundingClientRect().bottom, first: !!(b.compareDocumentPosition(document.querySelector('#bsheet .con-grid')) & Node.DOCUMENT_POSITION_FOLLOWING) };
  });
  assert.equal(r.scrolled, 0);
  assert.equal(r.inView, true, 'Boresight the guns can be pressed without scrolling the sheet');
  assert.ok(r.first, 'the orders come before the diagram and the readouts');
  await done();
});

// ---------- the burn at its own pace (#992, docs/superpowers/specs/2026-11-10-burn-speed-design.md) ----------

test('a burn takes a cutaway day for each ship day, starts at 1x and keeps today\'s number of scenes (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const real = enterTransit; window.enterTransit = () => { real(); window.entered = { times: G.transit.times.length, walk: walkPending() }; };
    try { burn(); } finally { window.enterTransit = real; }
    const t = G.transit;
    return { eleven: transitSeconds(11), total: t.total, days: t.days, speed: G.speed, pace: t.pace, oldPace: oldBurnSeconds(t.days) / t.total, times: entered.times, want: burnSceneCount(t.days) + (entered.walk ? 1 : 0) };
  });
  await done();
  assert.equal(r.eleven, 880); assert.equal(r.total, r.days * 80);
  assert.equal(r.speed, 1); assert.equal(r.pace, r.oldPace); assert.equal(r.times, r.want);
});

test('the burn moves on at the chosen speed, stands still paused, and plays the flip in 25 real seconds at 16x (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, out = {}, at = pr => { t.left = t.total * (1 - pr); t.elapsed = 0; };
    for (const s of [1, 4, 0]) { at(0.3); G.speed = s; const left = t.left; updateTransit(1); out[s] = { fell: left - t.left, elapsed: t.elapsed, drive: burnSpeed() }; }
    const sec = burnStages(t.days).secure; at(0.5 - sec); G.speed = 16; t.times = []; let secs = 0;
    while (1 - t.left / t.total <= 0.5 + sec && secs < 100) { updateTransit(1 / 30); secs += 1 / 30; }
    out.flip = secs;
    at(0.5 - 15 / (1440 * t.days)); out.secure = phase(); at(0.01); out.couch = phase();
    return out;
  });
  await done();
  assert.ok(Math.abs(r[1].fell - r[1].drive) < 1e-9 && r[1].elapsed === 1, JSON.stringify(r[1]));
  assert.ok(Math.abs(r[4].fell - 4 * r[4].drive) < 1e-9 && r[4].elapsed === 4, JSON.stringify(r[4]));
  assert.deepEqual([r[0].fell, r[0].elapsed], [0, 0], 'paused');
  assert.ok(Math.abs(r.flip - 25) < 0.1, `the flip took ${r.flip} s at 16x`);
  assert.equal(r.secure, 'secure'); assert.equal(r.couch, 'couch');
});

test('paused, the crew stands still; a scene stops time and the speed carries on after it (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit; t.left = t.total * 0.7; t.times = []; G.speed = 1;
    for (let i = 0; i < 120; i++) Mods.emit('frame', 1 / 30);
    const xs = () => shipPeople().map(p => [p.x, p.dk]);
    G.speed = 0; const before = JSON.stringify(xs()); for (let i = 0; i < 60; i++) Mods.emit('frame', 1 / 30);
    const still = JSON.stringify(xs()) === before;
    G.speed = 16; openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', run: () => 'a' }] }); const left = t.left; updateTransit(1);
    const stopped = t.left === left; finishEvent();
    return { still, stopped, after: G.speed };
  });
  await done();
  assert.equal(r.still, true, 'nobody moves while paused'); assert.equal(r.stopped, true, 'a scene stops time'); assert.equal(r.after, 16);
});

test('the burn bar shows the real time left at the chosen speed, and the speed or the flip beside it (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit; t.left = t.total * 0.7; t.times = [];
    const bar = () => { const texts = [], real = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { texts.push(String(s)); return real.call(this, s, ...a); }; try { render(); } finally { CanvasRenderingContext2D.prototype.fillText = real; } return texts.find(s => s.includes('remaining')); };
    const mss = s => { s = Math.ceil(s); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
    const out = {};
    for (const s of [1, 2, 0]) { G.speed = s; out[s] = { bar: bar(), want: mss(realLeft(t, s, burnSpeed())) }; }
    G.speed = 16; t.left = t.total * 0.5; out.flip = bar();
    return out;
  });
  await done();
  assert.ok(r[1].bar.startsWith(`${r[1].want} remaining -`), r[1].bar);
  assert.ok(r[2].bar.startsWith(`${r[2].want} remaining 2x`), r[2].bar);
  assert.ok(r[0].bar.startsWith(`${r[0].want} remaining paused`), r[0].bar);
  assert.match(r.flip, /remaining flip/);
});

test('a burn wears the ship, runs a project and burns the drive\'s fuel as much as before, at any speed, and none of it while paused (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const run = (speed, dt) => {
      burn(); const t = G.transit, st = G.state; t.interceptPlanned = true; Object.assign(power(), { drive: 40, weapons: 30, shields: 30 }); setPower('drive', 60);
      condition().life = 100; st.projects = { x: { id: 'x', left: 1e6 } }; t.fuelOwed = 0; const fuel0 = st.fuel; G.speed = speed;
      for (let n = 0; 1 - t.left / t.total < 0.98 && n < 20000; n++) { t.times = []; t.event = null; G.dialog = null; st.heat = 0; update(dt); Mods.emit('frame', dt); }
      const got = { life: 100 - condition().life, project: 1e6 - st.projects.x.left, fuel: fuel0 - st.fuel + t.fuelOwed };
      const secs = 0.98 * oldBurnSeconds(t.days) / burnSpeed(), want = { life: 0.01 * wearRate() * secs, project: secs, fuel: 0.98 * t.fuelCost * 0.2 };
      G.speed = 0; const still = JSON.stringify([condition().life, st.projects.x.left, st.fuel, t.fuelOwed]);
      for (let i = 0; i < 60; i++) { update(dt); Mods.emit('frame', dt); }
      return { got, want, still: still === JSON.stringify([condition().life, st.projects.x.left, st.fuel, t.fuelOwed]) };
    };
    return { one: run(1, 0.25), top: run(16, 1 / 30) };
  });
  await done();
  for (const k of ['one', 'top']) {
    for (const f of ['life', 'project', 'fuel']) assert.ok(Math.abs(r[k].got[f] / r[k].want[f] - 1) < 0.02, `${k} ${f}: ${r[k].got[f]} against ${r[k].want[f]}`);
    assert.equal(r[k].still, true, `${k}: nothing moves while paused`);
  }
});

test('in a burn Space pauses and resumes, and 1, 2 and 3 pick the speed; the buttons by the burn bar do the same (#992)', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); G.transit.left = G.transit.total * 0.7; });
  const speed = () => ev(() => G.speed), seen = [];
  for (const k of ['Space', 'Space', 'Digit2', 'Digit3', 'Digit1']) { await page.keyboard.press(k); seen.push(await speed()); }
  assert.deepEqual(seen, [0, 1, 2, 16, 1]);
  await page.waitForSelector('#bspeed:not([hidden])');
  await page.click('#bspeed [data-speed="16"]');
  const r = await ev(() => ({ speed: G.speed, lit: [...document.querySelectorAll('#bspeed button.active')].map(b => b.dataset.speed), labels: [...document.querySelectorAll('#bspeed button')].map(b => b.textContent) }));
  assert.deepEqual(r, { speed: 16, lit: ['16'], labels: ['Pause', '1x', '2x', '16x'] });
  await page.click('#bspeed [data-speed="0"]');
  assert.equal(await speed(), 0);
  await ev(() => { G.speed = 2; openEvent({ title: 'T', text: 'x', choices: [{ label: 'A', keep: true, run: () => ({ title: 'T', text: 'pressed', choices: [] }) }] }); });
  await page.keyboard.press('Space'); await page.keyboard.press('Digit3');
  assert.equal(await ev(() => G.speed), 2, 'under a scene the speed is left alone');
  await done();
});

test('paused, a screen opens and works, and nothing in it runs on; landed, the keys and the buttons do nothing (#992)', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const st = G.state; G.transit.left = G.transit.total * 0.7; G.transit.times = []; setPower('drive', 80); st.heat = 10; G.speed = 0;
    G.bridgeOpen = 'weapons'; syncBridge(true);
    for (let i = 0; i < 60; i++) { update(1 / 30); Mods.emit('frame', 1 / 30); }
    return { sheet: !document.getElementById('bsheet').hidden, heat: st.heat };
  });
  assert.deepEqual(r, { sheet: true, heat: 10 });
  await ev(() => { G.transit = null; G.mode = 'landed'; G.speed = 1; Mods.emit('frame', 1 / 30); });
  for (const k of ['Space', 'Digit3']) await page.keyboard.press(k);
  assert.deepEqual(await ev(() => [G.speed, document.getElementById('bspeed').hidden]), [1, true]);
  await done();
});

test('the controls page lists the burn\'s keys (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const text = await ev(() => { Menu.view = 'controls'; Menu.render(); return document.getElementById('panel').textContent; });
  assert.match(text, /Space: pause or resume the burn/); assert.match(text, /1 \/ 2 \/ 3: normal, 2x, 16x/);
  await done();
});

test('a delay costs the same share of the burn as before, and one just after the flip does not play the flip again (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, total = t.total; t.left = t.total * 0.7; delay(15);
    const share = (t.total - total) * t.pace;
    const sec = burnStages(t.days).secure; t.left = t.total * (0.5 - sec - 0.001); t.flipped = true; delay(20);
    return { share, after: 1 - t.left / t.total >= 0.5 + sec, stage: phase(), rate: burnRate(t, 16, burnSpeed()) };
  });
  await done();
  assert.ok(Math.abs(r.share - 15) < 1e-9, `the delay is today's 15 s of the burn's share: ${r.share}`);
  assert.deepEqual([r.after, r.stage, r.rate], [true, 'move', 16], 'past the flip it stays past it');
});

test('a new burn starts at 1x, and a pause on it resumes at 1x whatever the last burn ran at (#992)', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  await ev(() => { burn(); setBurnSpeed(16); G.transit = null; G.mode = 'landed'; burn(); G.transit.left = G.transit.total * 0.7; });
  await page.keyboard.press('Space'); await page.keyboard.press('Space');
  assert.equal(await ev(() => G.speed), 1);
  await done();
});

test('the burn bar\'s phase and g, and the float\'s build, follow the flip in ship time (#992)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const t = G.transit, sg = burnStages(t.days), at = pr => { t.left = t.total * (1 - pr); const b = burnState(); return [phase(), b.phase, b.g > 0]; };
    return { before: at(0.5 - 2 * sg.secure), strapping: at(0.5 - (sg.secure + sg.float) / 2), mid: at(0.5), weights: phaseWeights(0.5 - 2 * sg.secure, sg).flip };
  });
  await done();
  assert.deepEqual(r.before, ['move', 'BURN', true], 'under thrust just before the flip, the bar says so');
  assert.deepEqual(r.strapping, ['secure', 'BURN', true], 'strapped in, still under thrust');
  assert.deepEqual(r.mid, ['float', 'FLIP', false], 'weightless at the midpoint');
  assert.equal(r.weights, 0, 'no flip light before the flip');
});

// #932, the lighting pass, read from the pixels each room draws on a canvas of its own at twice the world's scale: the light is what the
// room draws less what it draws with its lamp (drawPhaseLight) taken away.
const lightKit = () => {
  const K = 2, lay = LAYOUTS.freighter, W = lay.width, FW = { x0: (lay.well.x - lay.well.w / 2) * W, x1: (lay.well.x + lay.well.w / 2) * W };
  const S = o => ({ w: phaseWeights(o.pr === undefined ? 0.3 : o.pr), time: o.time || 3, zoom: 1.17, spin: 0, still: !!o.still, berths: 12, cargo: 0.5, torpedoes: 2, fuel: 0.5, burning: true,
    night: o.night || 0, asleep: o.asleep || 0, well: FW, damage: { marks: new Set(), severe: false }, patient: false, headIn: false });
  window.lightDraw = (id, o = {}, stub = null) => {
    const r = layoutBox(lay, id), c = document.createElement('canvas'); c.width = Math.round((r.x1 - r.x0) * K); c.height = Math.round((r.floor - r.top) * K);
    const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, c.width, c.height); g.setTransform(K, 0, 0, K, -r.x0 * K, -r.top * K);
    const real = stub && window[stub]; if (stub) window[stub] = stub === 'berthReading' ? () => [] : () => {};
    try { drawRoom(g, id, r, S(o)); } finally { if (stub) window[stub] = real; }
    const d = g.getImageData(0, 0, c.width, c.height).data;
    const mean = (x0, y0, x1, y1) => {  // the mean colour over a box in world units
      const out = [0, 0, 0]; let n = 0;
      for (let y = Math.round((y0 - r.top) * K); y < Math.round((y1 - r.top) * K); y++) for (let x = Math.round((x0 - r.x0) * K); x < Math.round((x1 - r.x0) * K); x++) { const i = (y * c.width + x) * 4; out[0] += d[i]; out[1] += d[i + 1]; out[2] += d[i + 2]; n++; }
      return out.map(v => v / n);
    };
    return { r, d, cw: c.width, K, mean };
  };
  // the light's own colour in a box: what the room draws there less what it draws without its lamp
  window.lightAt = (id, o, box) => { const a = lightDraw(id, o).mean(...box), b = lightDraw(id, o, 'drawPhaseLight').mean(...box); return { lit: a, d: a.map((v, i) => v - b[i]) }; };
};
const luma = c => 0.3 * c[0] + 0.59 * c[1] + 0.11 * c[2];

test('the lamps make pools of warm light on the floor under them, with dark corners away from them, darker at night (#932)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(lightKit);
  const rooms = await ev(() => ROOMS.map(({ id }) => {
    const r = layoutBox(LAYOUTS.freighter, id), F = r.floor, lamps = roomLamps(id, r), corners = [[r.x0 + 2, r.top + 2, r.x0 + 24, r.top + 16], [r.x1 - 24, r.top + 2, r.x1 - 2, r.top + 16]].filter(b => lamps.every(x => Math.abs(x - (b[0] + b[2]) / 2) > 100));  // the top corners away from the lamps
    return { id, under: roomLamps(id, r).map(x => lightAt(id, {}, [x - 10, F - 6, x + 10, F - 1]).d), underLit: roomLamps(id, r).map(x => lightDraw(id, {}).mean(x - 10, F - 6, x + 10, F - 1)), corners: corners.map(b => lightAt(id, {}, b).d),
      day: corners.map(b => lightDraw(id, {}).mean(...b)), night: corners.map(b => lightDraw(id, { night: 1 }).mean(...b)) };
  }));
  for (const { id, under, underLit, corners, day, night } of rooms) {
    for (const u of under) {
      assert.ok(luma(u) > 4, `${id}: the floor under each lamp lit (${u.map(Math.round)})`);
      for (const c of corners) {
        assert.ok(luma(u) > luma(c), `${id}: brighter under the lamp than in the corner`);
        assert.ok(u[0] - u[2] > c[0] - c[2] + 4, `${id}: warmer under the lamp (${u.map(Math.round)}) than in the corner (${c.map(Math.round)})`);
      }
    }
    assert.ok(corners.length > 0, `${id}: a corner away from the lamps`);
    for (const c of day) for (const u of underLit) assert.ok(luma(c) < luma(u), `${id}: the corner (${c.map(Math.round)}) darker than the floor under the lamp (${u.map(Math.round)})`);
    day.forEach((c, k) => assert.ok(luma(night[k]) < luma(c), `${id}: the corner darker at night (${night[k].map(Math.round)}) than by day (${c.map(Math.round)})`));
  }
  await done();
});

test('the burn\'s light is red, the flip\'s amber, and the galley\'s the warmest in cruise (#932)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(lightKit);
  const r = await ev(() => ROOMS.map(({ id }) => {
    const q = layoutBox(LAYOUTS.freighter, id), [x] = roomLamps(id, q), box = [x - 10, q.floor - 6, x + 10, q.floor - 1];
    return { id, burn: lightAt(id, { pr: 0.02 }, box).d, flip: lightAt(id, { pr: 0.5 }, box).d, cruise: lightAt(id, {}, box).d };
  }));
  for (const { id, burn, flip } of r) {
    assert.ok(burn[0] > 8 && burn[0] > burn[1] + 8 && burn[0] > burn[2] + 8, `${id}: the burn's pool red (${burn.map(Math.round)})`);
    assert.ok(flip[0] > flip[1] + 4 && flip[1] > flip[2] + 8, `${id}: the flip's pool amber (${flip.map(Math.round)})`);
  }
  const warm = c => c[0] - c[2], galley = r.find(q => q.id === 'galley').cruise;
  for (const { id, cruise } of r) if (id !== 'galley') assert.ok(warm(galley) > warm(cruise) + 4 && luma(galley) > luma(cruise), `the galley's pool (${galley.map(Math.round)}) warmer and stronger than the ${id}'s (${cruise.map(Math.round)})`);
  await done();
});

test('a bunk\'s reading lamp lights its pillow end, inside the bunk, in cruise in the evening when nobody sleeps there (#932)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(lightKit);
  const cases = await ev(() => [{ night: 0.5, asleep: 3 }, { night: 0.2, asleep: 0 }, { night: 0, asleep: 3 }, { night: 1, asleep: 3 }, { night: 0.5, asleep: 3, pr: 0.02 }, { night: 0.5, asleep: 3, pr: 0.5 }].map(o => {
    const a = lightDraw('berths', o), b = lightDraw('berths', o, 'berthReading'), n = Math.min(12, ship().berths || 12), r = a.r, well = { x0: (LAYOUTS.freighter.well.x - LAYOUTS.freighter.well.w / 2) * LAYOUTS.freighter.width, x1: (LAYOUTS.freighter.well.x + LAYOUTS.freighter.well.w / 2) * LAYOUTS.freighter.width };
    const bunks = Array.from({ length: 12 }, (_, k) => berthBunk(r, 12, k, well)), lit = bunks.map(() => ({ n: 0, x: 0 })); let outside = 0;
    for (let i = 0; i < a.d.length; i += 4) {
      if (Math.abs(a.d[i] - b.d[i]) + Math.abs(a.d[i + 1] - b.d[i + 1]) + Math.abs(a.d[i + 2] - b.d[i + 2]) < 3) continue;
      const x = r.x0 + ((i / 4) % a.cw) / a.K, y = r.top + Math.floor(i / 4 / a.cw) / a.K, k = bunks.findIndex(q => x >= q.x && x <= q.x + q.w && y >= q.y - 27 && y <= q.y);
      if (k < 0) outside++; else { lit[k].n++; lit[k].x += (x - bunks[k].x) / bunks[k].w; }
    }
    return { o, n, outside, lit: lit.map(q => ({ n: q.n, at: q.n ? q.x / q.n : null })) };
  }));
  const [evening, dusk, ...dark] = cases;
  assert.equal(evening.outside, 0, 'every reading lamp\'s light inside its bunk');
  evening.lit.forEach((q, k) => {
    if (k < 3) assert.equal(q.n, 0, `bunk ${k}: its sleeper asleep, its lamp out`);
    else { assert.ok(q.n > 20, `bunk ${k}: awake in the evening, its lamp lit`); assert.ok(q.at < 0.4, `bunk ${k}: the light on the pillow end (${q.at})`); }
  });
  assert.equal(dusk.lit[2].n, 0, 'the bunk with its curtain shut stays dark');
  assert.ok(dusk.lit[0].n > 20 && dusk.outside === 0, 'at dusk, nobody asleep yet, the lamps lit');
  for (const c of dark) assert.ok(c.lit.every(q => q.n === 0) && c.outside === 0, `no reading lamp at ${JSON.stringify(c.o)}`);
  await done();
});

test('under reduced motion each room\'s light holds still: the flip drawn at two times is the same frame (#932)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(lightKit);
  const moved = await ev(() => ROOMS.map(({ id }) => id).filter(id => {
    const a = lightDraw(id, { pr: 0.5, still: true, time: 1 }).d, b = lightDraw(id, { pr: 0.5, still: true, time: 4.3 }).d;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return true;
    return false;
  }));
  assert.deepEqual(moved, []);
  const moving = await ev(() => { const a = lightDraw('galley', { pr: 0.5, time: 1 }).d, b = lightDraw('galley', { pr: 0.5, time: 1.3 }).d; return a.some((v, i) => v !== b[i]); });
  assert.ok(moving, 'and without it the flip pulses');
  await done();
});

test('in time-lapse at 16x a walk is not drawn: the walker fades out of the old place, out of sight between, and fades into the new; at 1x and 2x as they are', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {}; burn(); const t = G.transit;
    t.left = t.total * 0.3;  // under way, clear of the couches and the flip
    setBurnSpeed(16); out.on16 = lapseOn(); setBurnSpeed(2); out.on2 = lapseOn(); setBurnSpeed(1); out.on1 = lapseOn();
    setBurnSpeed(16); scene(); out.scene = lapseOn(); G.dialog = null;
    const p = { x: 0.1 * CUT_K, dk: 1, tdk: 1, tx: null, at: 'post', room: 'bridge' }, frame = (n = 1) => { for (let i = 0; i < n; i++) lapseTick([p], true, 0.05); return { ...p.lapse }; };
    out.rest = frame();
    p.x += 0.005 * CUT_K; out.nudge = frame();  // a small move is followed
    p.tx = 0.8 * CUT_K; p.x = 0.5 * CUT_K; out.leaving = frame(); out.gone = frame(10);  // walking: fading out where they were, then out of sight
    p.x = 0.8 * CUT_K; p.tx = null; p.at = 'galley'; out.arrived = frame(); out.back = frame(10);
    lapseTick([p], false, 0.05); out.off = p.lapse;
    return out;
  });
  await done();
  assert.deepEqual([r.on16, r.on2, r.on1, r.scene], [true, false, false, false], 'at 16x, and not under a scene');
  assert.equal(r.rest.a, 1);
  assert.ok(Math.abs(r.nudge.x - r.rest.x) > 0 && r.nudge.a === 1, 'followed, not faded');
  assert.equal(r.leaving.x, r.nudge.x, 'drawn where they were'); assert.ok(r.leaving.a < 1 && r.leaving.a > 0, 'fading out');
  assert.equal(r.gone.a, 0);
  assert.ok(Math.abs(r.arrived.x - 0.8 * r.rest.x / 0.1) < 1e-6 && r.arrived.at === 'galley', 'there once they rest'); assert.equal(r.back.a, 1, 'and faded in');
  assert.equal(r.off, null, 'at 1x drawn as they are');
});
// #936: her name on the nose stays clear of the speed buttons and inside the camera's run, at every desktop width, for the longest name a
// ship can have (cleanName keeps 30 characters; the rename's field takes 30).
test('her name on the nose keeps clear of the speed buttons and inside the camera\'s view, for a name of 30 characters (#936)', async () => {
  for (const width of [1000, 1280, 1600]) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport: { width, height: 800 } });
    await ev(helpers);
    await ev(() => { burn(); home().name = 'W'.repeat(30); shipPeople(); });
    await frames(page, 2);
    const r = await ev(() => {
      window.requestAnimationFrame = () => 0; G.cam = null; G.transit.aboard[0].dk = 0; drawTransit(innerWidth, innerHeight);
      const b = document.getElementById('bspeed').getBoundingClientRect(), q = layoutBox(LAYOUTS.freighter, 'bridge'), room = G.cutRooms.find(x => x.id === 'bridge'), k = room.w / (q.x1 - q.x0);
      const o = towerOutline(LAYOUTS.freighter), c = document.createElement('canvas').getContext('2d');
      const L = hullNameLayout(o, k, hullPlate(G.state, cleanName(home().name)), (t, px) => { c.font = `600 ${px}px ${roomFont}`; return c.measureText(t).width; });
      const sx = x => room.x + (x - q.x0) * k, sy = y => room.y + (y - q.top) * k;
      return { hidden: document.getElementById('bspeed').hidden, btn: { x0: b.left, y0: b.top, y1: b.bottom }, x0: sx(L.x0), x1: sx(L.x1), top: sy(L.top), base: sy(L.base), px: L.px, viewTop: sy(-CAM_RUN.above), ceiling: sy(o.top) };
    });
    assert.ok(!r.hidden, `${width}: the speed buttons shown`);
    assert.ok(r.x1 < r.btn.x0 - 4, `${width}: the name (to ${r.x1.toFixed(1)}) ends left of the speed buttons (${r.btn.x0})`);
    assert.ok(r.px >= 12, `${width}: never under 12px (${r.px})`);
    assert.ok(r.top >= r.viewTop && r.base < r.ceiling, `${width}: inside the camera's run (${r.top.toFixed(1)} under ${r.viewTop.toFixed(1)}) and over the flight deck`);
    await done();
  }
});
// #936, #914: the hand's tab on the bill's middle watch reads the memory Cato's choice leaves, as played (an override of its words included),
// and only while he is aboard.
test('your tab on the middle watch: after you asked Cato, by the words the scene played, while he is aboard (#936)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    burn(); const st = G.state, out = {};
    out.before = askedMiddle(st, CAST.cato.middleAsk());
    useOverrides({ 'cast:cato:intro': { choices: { 0: { effects: { castLike: { who: 'cato', n: 2, memory: 'You asked for the middle watch, and it is yours.' } } } } } });
    const c = castScene('cato', CAST.cato.scenes.intro).choices[0]; c.run.call(c);
    out.memory = castPerson('cato').memories.slice(-1)[0]; out.asks = CAST.cato.middleAsk(); out.asked = askedMiddle(st, out.asks);
    out.bill = billSheet(crewRoster(st), {}, null, 0, out.asked).middle === ROLE_COLORS.you;
    const pid = castRec('cato').pid; st.crew = st.crew.filter(id => id !== pid); out.gone = askedMiddle(st, CAST.cato.middleAsk());
    useOverrides({});
    return out;
  });
  await done();
  assert.equal(r.before, false, 'not asked yet');
  assert.ok(r.memory.endsWith('You asked for the middle watch, and it is yours.'), r.memory);
  assert.ok(r.asks.includes('You asked for the middle watch, and it is yours.') && r.asks.includes('You told me what you needed, and I put it on the bill.'), 'the words as written and as played');
  assert.ok(r.asked && r.bill, 'asked under the override: your tab on the middle watch');
  assert.equal(r.gone, false, 'Cato gone from the crew: no tab');
});
