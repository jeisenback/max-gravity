'use strict';

// Ice runs (js/icerun.js): the long run out to a rock of ice, planned when water is dear, with three scenes on the way.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null;
    return st;
  };
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  window.take = (sc, re) => { G.dialog = { event: sc, choices: sc.choices }; return chooseEvent(sc.choices.findIndex(c => re.test(c.label))); };
};

test('the planner takes an ice run when water is dear, the hold is free, and one is due, as two legs to a rock it finds; and then not until the gap is up', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), here = currentPlanet(), reach = [['mars', SYSTEMS.mars]], real = window.price, out = {};
    st.fuel = 1000;  // a tank that covers both legs from Earth
    window.price = (pl, g) => (g === 'water' && pl.name === 'Mars' ? 1200 : 500);
    const o = iceOption(here, st.systemId, reach, 40);
    out.opt = o && { ice: o.ice, good: o.good, cost: o.cost, tons: o.tons, sid: o.sid, planet: o.planet, site: o.site };
    out.found = o && st.sites[o.site].found; out.days = o && o.days; out.legs = o && travelDays(st.systemId, o.site) + 3 + travelDays(o.site, 'mars');
    out.word = o && runWord(o); out.plotted = o && placeOf(o.site).name;
    window.price = () => 500; out.cheap = iceOption(here, st.systemId, reach, 40);
    window.price = (pl, g) => (g === 'water' && pl.name === 'Mars' ? 1200 : 500); out.full = iceOption(here, st.systemId, reach, 5);
    h.iceAt = st.day - ICE_GAP / 2; out.soon = iceOption(here, st.systemId, reach, 40);
    h.iceAt = st.day - ICE_GAP - 1; out.later = !!iceOption(here, st.systemId, reach, 40);
    h.iceAt = undefined; h.since = st.day - 3; out.green = iceOption(here, st.systemId, reach, 40);  // not in the first days aboard
    h.since = 1; h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { ice: true, sid: 'mars', planet: 'Mars' } }; out.stale = planStale(h);  // a plan from before the rock was a place
    window.price = real;
    return out;
  });
  assert.deepEqual(r.opt, { ice: true, good: 'water', cost: 0, tons: 40, sid: 'mars', planet: 'Mars', site: r.opt.site }); assert.match(r.opt.site, /^site:ice-/);
  assert.ok(r.found !== null, 'the captain finds her rock when she plans'); assert.equal(r.days, r.legs, 'out, three shifts, home');
  assert.equal(r.word, `the ice run to ${r.plotted} and home to Mars`);
  assert.equal(r.cheap, null); assert.equal(r.full, null); assert.equal(r.soon, null); assert.ok(r.later); assert.equal(r.green, null); assert.equal(r.stale, true);
  await done();
});

test('a burn can be plotted to a site: the departure line names the rock, the HUD and the bridge draw it, and nothing reads a system that is not there', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), id = Object.keys(sites(st))[0], out = {};
    h.run = { ice: { edge: 0 }, site: id, good: 'water', tons: 40, cost: 0, planet: 'Mars', sid: 'mars', day: st.day, from: 'Earth' };
    st.dest = id; enterTransit();
    out.to = G.transit.to; out.days = G.transit.days; out.comm = G.transit.comms.map(c => c.text || c).join(' | ');
    out.nav = navigationPanel(); out.plain = travelDays('earth', id);
    G.transit.left = G.transit.total * 0.4; drawTransit(1280, 800);  // the burn view with the destination sprite
    out.name = placeOf(id).name; out.gov = placeOf(id).gov;
    return out;
  });
  assert.match(r.to, /^site:ice-/); assert.equal(r.days, r.plain, 'the leg is a plain burn, not stretched');
  assert.match(r.comm, new RegExp(`Burn plotted for ${r.name}: \\d+ days\\. An ice run: three shifts on the rock, then home to Mars with the hold full\\.`));
  assert.ok(r.nav.includes(r.name), 'the Navigation console names the rock'); assert.equal(r.gov, 'Independent');
  await done();
});

test('arrival at the rock lands on station: no landing hooks, the rail shows The Rock, the header and vista are the rock\'s, and a reload comes back there', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), id = Object.keys(sites(st))[0], out = {}, fired = [];
    const realEmit = Mods.emit; Mods.emit = function (name, ...a) { if (['landed', 'onStation', 'arrive'].includes(name)) fired.push(name); return realEmit.call(this, name, ...a); };
    h.run = { ice: { edge: 0 }, site: id, good: 'water', tons: 40, cost: 0, planet: 'Mars', sid: 'mars', day: st.day, from: 'Earth' };
    st.dest = id; enterTransit(); const day0 = st.day; G.transit.left = 0; updateTransit(0.01);
    out.fired = fired.slice(); out.mode = G.mode; out.at = st.systemId; out.planet = st.planet; out.days = st.day - day0;
    out.dialog = G.dialog && G.dialog.event.title; if (G.dialog) { chooseEvent(0); finishEvent(); }  // the approach plays over the shell; the shell is behind it
    out.html = UI.el.innerHTML; out.tab = UI.tab; out.rail = [...UI.el.querySelectorAll('.rail button')].map(b => b.textContent);
    drawViewscreen(0);  // paints without a throw
    G.dialog = null; loadGame(); out.reload = { at: G.state.systemId, tab: UI.tab, mode: G.mode };
    Mods.emit = realEmit;
    return out;
  });
  assert.deepEqual(r.fired, ['onStation']); assert.equal(r.mode, 'landed'); assert.match(r.at, /^site:ice-/); assert.ok(r.days >= 1);
  assert.equal(r.tab, 'site'); assert.deepEqual(r.rail.slice(-1), ['The Rock']); assert.ok(!r.rail.includes('Port') && !r.rail.includes('Bar') && !r.rail.includes('Missions'));
  assert.match(r.html, /On station/); assert.match(r.html, /an ice rock at \d\.\d AU/); assert.doesNotMatch(r.html, /undefined/);
  assert.equal(r.dialog, 'The Rock', 'the approach plays on arrival');
  assert.equal(r.reload.at, r.at); assert.equal(r.reload.tab, 'site'); assert.equal(r.reload.mode, 'landed');
  await done();
});

test('three shifts on the rock: the cutting plays once on the first, the button then says home, the home burn carries the third scene, and the run sails home', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), id = Object.keys(sites(st))[0], out = {}; st.cargo = {}; st.paid = {};
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { ice: true, site: id, good: 'water', tons: 40, cost: 0, profit: 1, planet: 'Mars', sid: 'mars', days: 15, ballast: false } };
    out.sailedOut = sail(); out.out = { dest: st.dest, mode: G.mode, route: st.route };  // the captain sails for the rock, not the port (the soak found the burn going to the port, 2026-11-08)
    G.player.x = BURN_DIST + 40; G.player.y = 0; tryBurn(); if (!G.transit) enterTransit();
    G.transit.left = 0; G.transit.times = []; updateTransit(0.01);
    out.approach = G.dialog && G.dialog.event.title; take(G.dialog.event, /Match the roll/); finishEvent();
    out.stay = { left: h.stay && h.stay.left, why: h.stay && h.stay.why, button: UI.dockHtml(), noSail: sail() === false };
    const day0 = st.day; passNight(); out.cut = G.dialog && G.dialog.event.title; take(G.dialog.event, /Cut small/); finishEvent();
    out.loaded = st.cargo.water; passNight(); out.again = G.dialog && G.dialog.event.title; passNight();
    out.end = { stay: !!stayOf(h), days: st.day - day0, button: UI.dockHtml(), plan: currentPlan().home };
    out.sailed = sail(); out.to = G.transit && G.transit.to; out.mode = G.mode; out.edge = h.run.ice.edge; out.kept = h.run.site === id; out.hidden = UI.el.classList.contains('hidden');
    planOccasions(); out.ice = G.transit.occasions.filter(o => o.kind === 'ice').map(o => [o.stage, o.at]);
    out.third = occasionEvent(G.transit.occasions.find(o => o.kind === 'ice')).title;
    return out;
  });
  assert.ok(r.sailedOut); assert.match(r.out.dest, /^site:ice-/, 'the burn is for the rock'); assert.equal(r.out.mode, 'flight');
  assert.equal(r.approach, 'The Rock'); assert.equal(r.stay.left, 3); assert.equal(r.stay.why, 'ice'); assert.ok(r.stay.noSail);
  assert.match(r.stay.button, /data-action="night"[^>]*>Work the ice \(3 more shifts\)/);
  assert.equal(r.cut, 'Cutting Ice'); assert.ok(r.loaded >= 8 && r.loaded <= 40, `the cutting loads the hold (${r.loaded})`); assert.equal(r.again, null, 'the cutting plays once');
  assert.equal(r.end.stay, false); assert.equal(r.end.days, 3); assert.equal(r.end.plan, true); assert.match(r.end.button, /data-action="sail"[^>]*>Burn for Mars/);
  assert.ok(r.sailed); assert.equal(r.to, 'mars'); assert.equal(r.mode, 'transit'); assert.ok(r.hidden, 'the landed panel is hidden for the burn'); assert.ok(r.kept && r.edge !== 0, 'the run record and its haul are kept through the burn home');
  assert.deepEqual(r.ice, [[2, 0.5]]); assert.equal(r.third, 'Home With the Ice');
  await done();
});

test('the map draws a found rock as a grey dot with its name, and not an unfound one', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), ids = Object.keys(sites(st)), out = {}, texts = [];
    const real = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (t, ...a) { texts.push(String(t)); return real.call(this, t, ...a); };
    try {
      openMap(); G.mapZoom = 2; drawMap(1280, 800); out.before = texts.slice(); texts.length = 0;
      findSite(st, ids[0], st.day); drawMap(1280, 800); out.after = texts.slice(); out.pos = G.mapPos(ids[0]);
    } finally { CanvasRenderingContext2D.prototype.fillText = real; closeMap(); }
    out.name = st.sites[ids[0]].name;
    return out;
  });
  assert.ok(!r.before.includes(r.name), 'an unfound rock is not on the map'); assert.ok(r.after.includes(r.name), 'a found rock is'); assert.ok(Array.isArray(r.pos) && r.pos.length === 2);
  await done();
});

test('each scene offers three ways and your post\'s own, a good run fills the hold and a bad one does not, and the wage is doubled', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, real = Math.random;
    const run = (rollsList) => {
      Math.random = real;  // a fixed random number hangs the generators (setup makes people)
      const st = setup('engineer'), h = hired(); st.cargo = {}; st.paid = {};
      const planet = currentPlanet(), wage = h.wage;
      h.run = { ice: { edge: 0 }, good: 'water', tons: 40, cost: 0, planet: planet.name, sid: st.systemId, day: st.day - 12, from: 'X' };
      const sc = iceStageScene(0), labels = sc.choices.map(c => c.label);
      rolls(rollsList);
      take(sc, /Set the anchors/); const t1 = take(iceStageScene(1), /Cut small/); take(iceStageScene(2), /gentle/);
      const tons = st.cargo.water, xp = skillXp('engineer');
      const credits = st.credits, realPrice = window.price; window.price = () => 100;
      try { settleRun(planet); } finally { window.price = realPrice; }
      return { labels, tons, wage: (h.ledger[0] || {}).wage || 0, perDay: wage, t1, hold: /tons of ice/.test(t1), titles: [sc.title, iceStageScene(1).title, iceStageScene(2).title] };  // the wage paid, before the kit and the hall come out of it (#879)
    };
    out.good = run([0.01, 0.01, 0.01]);   // every choice works
    out.bad = run([0.99, 0.99, 0.99]);    // none does
    return out;
  });
  assert.equal(r.good.labels.length, 4); assert.ok(/^\[Engineer\]/.test(r.good.labels[3])); assert.deepEqual(r.good.titles, ['The Rock', 'Cutting Ice', 'Home With the Ice']);
  assert.ok(r.good.hold && r.bad.hold); assert.ok(r.good.tons > r.bad.tons, `a good run brings more ice (${r.good.tons} against ${r.bad.tons})`); assert.ok(r.good.tons <= 40 && r.bad.tons >= 8);
  assert.ok(r.good.wage >= r.good.perDay * 12 * 2 - 1, `the long run pays double the wage (${r.good.wage})`);
  await done();
});

test('a burn that skips the scenes comes home with a thin hold, and still pays', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(); st.cargo = {}; st.paid = {}; h.runsDone = 1;  // a later arrival: the first one is the first officer's scene
    const planet = currentPlanet();
    h.run = { ice: { edge: 0 }, good: 'water', tons: 50, cost: 0, planet: planet.name, sid: st.systemId, day: st.day - 12, from: 'X' };
    const credits = st.credits, realPrice = window.price; window.price = () => 100;
    let text; try { text = settleRun(planet); } finally { window.price = realPrice; }
    return { paid: st.credits - credits, text, ledger: h.ledger[0] };
  });
  assert.ok(r.paid > 0); assert.equal(r.ledger.tons, 20, 'two-fifths of a hold'); assert.match(r.text, /^Your pay:/, 'the sale is the captain\'s log\'s line (readouts.js); the note is the pay');
  await done();
});

test('a later ice run opens each scene with its own words, and its first scene names how the last haul went', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), planet = currentPlanet(), out = {};
    h.run = { ice: { edge: 0 }, good: 'water', tons: 40, cost: 0, planet: planet.name, sid: st.systemId, day: st.day - 12, from: 'X' };
    const opens = n => iceStageScene(n).text.split('</p>')[0];
    h.iceRuns = 1; out.first = [0, 1, 2].map(opens);
    h.iceRuns = 2;
    for (const [k, flags] of [['clean', { iceClean: 1 }], ['bad', { iceBad: 1 }], ['even', {}]]) { h.flags = flags; out[k] = opens(0); }
    out.second = [0, 1, 2].map(opens);
    return out;
  });
  r.second.forEach((t, i) => assert.notEqual(t, r.first[i], `stage ${i} differs on the second run`));
  assert.match(r.clean, /one word in it: clean/); assert.match(r.bad, /isn't in the log/); assert.match(r.even, /no remark/);
  assert.ok(!/last haul/.test(r.first[0]) && !/last haul/.test(r.second[1]), 'only the second run\'s first scene speaks of the last haul');
  await done();
});

// The whole-branch review of #968 (2026-11-08): two one-click paths crashed at the rock.
test('the map draws at the rock and on the burn to it, and a save reloaded at the rock sails home and docks', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), h = hired(), id = Object.keys(sites(st))[0], out = {};
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { ice: true, site: id, good: 'water', tons: 40, cost: 0, profit: 1, planet: 'Mars', sid: 'mars', days: 15, ballast: false } };
    sail(); G.player.x = BURN_DIST + 40; G.player.y = 0; tryBurn(); if (!G.transit) enterTransit();
    try { openMap(); drawMap(1280, 800); closeMap(); out.mapInBurn = 'ok'; } catch (e) { out.mapInBurn = String(e.message); closeMap(); }
    G.transit.left = 0; G.transit.times = []; updateTransit(0.01); while (G.dialog) { chooseEvent(0); finishEvent(); }
    try { openMap(); drawMap(1280, 800); closeMap(); out.mapAtRock = 'ok'; } catch (e) { out.mapAtRock = String(e.message); closeMap(); }
    loadGame(); while (G.dialog) { chooseEvent(0); finishEvent(); }  // the save written on station
    out.reloaded = { at: G.state.systemId, player: !!G.player };
    const h2 = hired(); while (stayOf(h2)) { passNight(); while (G.dialog) { chooseEvent(0); finishEvent(); } }
    out.sailed = sail(); G.transit.times = []; G.transit.left = 0;
    try { updateTransit(0.01); out.home = { mode: G.mode, at: G.state.systemId, player: !!G.player }; } catch (e) { out.home = String(e.message); }
    return out;
  });
  assert.equal(r.mapInBurn, 'ok'); assert.equal(r.mapAtRock, 'ok');
  assert.match(r.reloaded.at, /^site:ice-/); assert.ok(r.sailed);
  assert.deepEqual(r.home, { mode: 'flight', at: 'mars', player: true });
  await done();
});
