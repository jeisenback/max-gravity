'use strict';

// Chapter two's start (#891, #1045, docs/superpowers/specs/2026-11-11-hand-captain-design.md): a finished chapter one goes on, the members vote the hand
// to the bridge on the registry's endorsement (paid for, or vouched by Hester), and the co-op's Ore Runner is landed at Ceres with the crew who came, Bexa and Pax.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { helpers, started } = require('./coop');

test('signing the share and going on: the hand takes the bridge, and the Ore Runner is landed at Ceres with Bexa and Pax', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare(); const over = G.dialog && G.dialog.event; const label = over && over.choices[0].label; const pick = goOnToBridge(); return { label, pick, v: chapterTwoView() }; });
  await done();
  assert.equal(r.label, 'Go on');
  assert.equal(r.pick.title, 'The Bridge');
  assert.deepEqual(r.pick.names, ['Take the bridge']);
  assert.equal(r.v.chapter, 2); assert.equal(r.v.role, 'coop'); assert.equal(r.v.captain, 'you');
  assert.equal(r.v.cap, false, 'no captain person'); assert.equal(r.v.bridge, true); assert.equal(r.v.masters, undefined, 'the lender sends no masters');
  assert.equal(r.v.papers.length, 1); assert.match(r.v.papers[0], /^endorsement/);
  assert.equal(r.v.ship, 'lightfreighter'); assert.equal(r.v.planet, 'Ceres Station'); assert.equal(r.v.mode, 'landed'); assert.equal(r.v.dialog, false);
  assert.deepEqual(r.v.condition, { drive: 70, life: 65, shields: 60, sensors: 70, fire: 45 }); assert.equal(r.v.armor, true);
  assert.ok(r.v.crew.some(c => c.cast === 'bexa' && c.role === 'icehand'), JSON.stringify(r.v.crew));
  assert.ok(r.v.crew.some(c => c.cast === 'pax' && c.role === 'gunner'), JSON.stringify(r.v.crew));
  assert.ok(r.v.crew.some(c => c.cast === 'cato'), 'Cato came');
});

test('a hand who came alone starts with Bexa and Pax, and can take off with no pilot', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare({ alone: true }); goOnToBridge(); const v = chapterTwoView(); let err = null; try { takeOff(); } catch (e) { err = String(e); } return { v, pilot: !!roleHolder('pilot'), err, mode: G.mode }; });
  await done();
  assert.deepEqual(r.v.crew.map(c => c.cast).sort(), ['bexa', 'pax']);
  assert.equal(r.pilot, false); assert.equal(r.err, null); assert.equal(r.mode, 'flight');
});

test('a chapter-two save reloads as chapter two, the hand on the bridge and nothing open', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare(); goOnToBridge(); save(); loadGame(); while (G.dialog && G.dialog.event.title !== 'The End of Chapter One' && G.dialog.event.title !== 'The Bridge') finishEvent(); return { v: chapterTwoView(), title: G.dialog && G.dialog.event.title }; });
  await done();
  assert.equal(r.title, null); assert.equal(r.v.role, 'coop'); assert.equal(r.v.bridge, true); assert.equal(r.v.cap, false);
});

test('a save from piece 1 with a master on the bridge loads with the hand on it, and the master ashore at Ceres', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    toShare(); goOnToBridge(); const h = hired(), m = captainPerson('saran'); m.role = 'captain'; m.job = 'master';
    Object.assign(h, { captainKey: 'saran', captain: m.id, masters: ['saran', 'kessler', 'mensah'] }); delete h.bridge; delete h.papers;
    save(); loadGame(); while (G.dialog && !/The Bridge|End of Chapter One/.test(G.dialog.event.title)) finishEvent();
    const p = G.state.people[m.id];
    return { v: chapterTwoView(), title: G.dialog && G.dialog.event.title, key: hired().captainKey, master: p && { role: p.role, location: p.location, last: p.last } };
  });
  await done();
  assert.equal(r.title, null, 'it goes on, with no start to play again'); assert.equal(r.v.bridge, true); assert.deepEqual(r.v.papers, ['endorsement']);
  assert.equal(r.v.cap, false); assert.equal(r.key, undefined); assert.equal(r.v.masters, undefined);
  assert.deepEqual(r.master, { role: null, location: 'Ceres Station', last: 'Saran' }, 'a person ashore');
});

test('a finished save from before chapter two goes on the same way', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.career = { ...careerOf(hired()), came: [castPerson('cato').id], signed: st.day, share: { coop: 'Ceres Station', buyIn: 57000, owed: 93000 }, finished: true };
    st.crew = [castPerson('cato').id]; st.hired = null; save(); loadGame();
    const over = G.dialog && G.dialog.event.title, pick = goOnToBridge();
    return { over, pick, v: chapterTwoView(), share: hired() && hired().share };
  });
  await done();
  assert.equal(r.over, 'The End of Chapter One'); assert.equal(r.pick.names.length, 1);
  assert.equal(r.v.chapter, 2); assert.equal(r.v.ship, 'lightfreighter');
  assert.deepEqual(r.share, { coop: 'Ceres Station', buyIn: 57000, owed: 93000 });
  assert.ok(r.v.crew.some(c => c.cast === 'cato'));
});

// ---------- Task 4: the co-op's board and exchange, and nothing of chapter one's own ----------


test('the co-op takes a contract from the board and is paid into the fund, with no wage', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), h = hired(); UI.tab = 'port'; UI.render();
    const board = document.querySelectorAll('button[data-action="takeContract"]').length;
    career().freight = { key: `${currentPlanet().name}@${st.day}`, list: [contract()] };
    const took = takeContract(0), fund0 = h.fund, c0 = st.credits; UI.notes.length = 0;
    st.day += 5; landAtPort('mars', 'Mars');
    return { board, took: !!took, paid: st.credits - c0, fund: h.fund - fund0, notes: UI.notes.join(' | ') };
  });
  await done();
  assert.ok(r.board >= 0); assert.equal(r.took, true);
  assert.equal(r.paid, 12000 - 0, `paid into the fund: ${r.notes}`); assert.equal(r.fund, 0, 'the captain\'s fund is not the co-op\'s');
  assert.doesNotMatch(r.notes, /wage/i);
});

test('the co-op trades on the exchange from its fund', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); st.credits = 50000; const ready = tabReady(currentPlanet(), 'trade'); const cid = Object.keys(currentPlanet().prices)[0]; const c0 = st.credits; UI.planet = currentPlanet(); UI.act('buy', cid); return { ready, bought: st.cargo[cid] || 0, spent: c0 - st.credits }; });
  await done();
  assert.equal(r.ready, true); assert.equal(r.bought, 1); assert.ok(r.spent > 0);
});

test('the leak test: three landings in chapter two play nothing of chapter one\'s own, and fuel is not topped up for free', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), seen = [], fuel = [];
    for (const [sid, pl] of [['mars', 'Mars'], ['earth', 'Earth'], ['ceres', 'Ceres Station']]) {
      st.day += 6; st.fuel = 50; seen.push(...landAtPort(sid, pl)); fuel.push(st.fuel);
      seen.push(...UI.notes); UI.notes.length = 0;
    }
    return { seen, fuel, offers: (G.offers || []).filter(o => o.errand).length, tutorial: st.tutorial };
  });
  await done();
  const chapterOne = /The End of Chapter One|A Member's Share|Gone From the Apron|The Empty Cradle|Settling Up|wage|savings|buy-in|hire-purchase/i;
  assert.deepEqual(r.seen.filter(t => chapterOne.test(t)), [], r.seen.join(' | '));
  assert.deepEqual(r.fuel, [50, 50, 50], 'the co-op buys its own fuel');
  assert.equal(r.offers, 0, 'no errands board'); assert.equal(r.tutorial, null);
});

test('the co-op\'s shipyard refuels, repairs and fits out, sells no ship, and the Port page has no chapter-one panels', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(); st.credits = 50000; st.fuel = 10;
    const text = tab => { UI.tab = tab; UI.render(); return document.querySelector('.shell .body').textContent.replace(/\s+/g, ' '); };
    const yard = text('shipyard'), port = text('port'), buttons = [...document.querySelectorAll('.shell button[data-action]')].map(b => b.dataset.action);
    UI.tab = 'shipyard'; UI.render(); const yardButtons = [...document.querySelectorAll('.shell button[data-action]')].map(b => b.dataset.action);
    return { yard, port, buttons, yardButtons };
  });
  await done();
  assert.doesNotMatch(r.yard, /member's share|Sign on|savings/i, r.yard.slice(0, 300));
  assert.ok(r.buttons.includes('refuel'), `the Port page refuels: ${r.buttons.join(',')}`); assert.ok(r.yardButtons.includes('buyout'), 'outfits are fitted');
  assert.ok(!r.yardButtons.includes('buyship') && !r.yardButtons.includes('buyInAsk') && !r.yardButtons.includes('cbuy'), r.yardButtons.join(','));
  assert.doesNotMatch(r.port, /member's share|buy-in|your savings/i, r.port.slice(0, 400));
});

test('a fight that ends the hand\'s life in chapter two ends the run as in chapter one, with no captain to say it', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { coopAt(); handDies({}, 'hurt'); const e = G.nextEvent; return { canDie: role().canDie, title: e && e.title, text: e && e.text, choices: e && e.choices.map(c => c.label) }; });
  await done();
  assert.equal(r.canDie, true); assert.equal(r.title, 'The Last Run'); assert.deepEqual(r.choices, ['Begin again']);
  assert.doesNotMatch(r.text, /undefined|NaN|Hester|Captain/);
});

// ---------- #1045: chapter one's stories stop at the signing, and the range is the hand's order ----------

test('chapter one\'s stories stop at the signing: the chapter condition, the strike\'s scenes on Hester\'s ship, and the mission arcs\' offers', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), h = hired(), when = id => STORYLETS.find(x => x.id === id).when || {};
    const out = { shape: conditionProblems({ chapter: 'one' }), two: [meets({ chapter: 2 }), meets({ chapter: 1 })],
      strike: ['strike-broadcast', 'strike-ceres', 'strike-captain', 'strike-tarp', 'strike-landed', 'strike-end'].map(id => when(id).chapter || null) };
    h.standing = Object.fromEntries(Object.values(MISSION_ARCS).map(a => [a.shipper, 99])); h.away = [];
    landAtPort('ceres', 'Ceres Station'); out.arcs = h.away.filter(a => a.arc).length; out.would = !!arcOffer(MISSION_ARCS.league, 'league', currentPlanet());
    return out;
  });
  await done();
  assert.deepEqual(r.shape, ['condition chapter needs a chapter number']); assert.deepEqual(r.two, [true, false]);
  assert.deepEqual(r.strike, [1, 1, 1, 1, null, null], 'Hester\'s ship\'s part of the strike is chapter one\'s; the crates landed and the end read no captain');
  assert.equal(r.would, true, 'the Hall has one for the ship'); assert.equal(r.arcs, 0, 'and none is offered to a hand on their own bridge');
});

test('the range orders: shown on the hand\'s own bridge with Hold first chosen, and the order is the range Fire plays; not in chapter one', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const fight = () => { hired().raidTold = true; G.nextEvent = null; startShipFight({ kind: 'pirate', gov: 'Arcology Pact', shipId: 'raider' }, false); const e = G.nextEvent; G.nextEvent = null; return e; };
    coopAt(); const e = fight(); const s = e.fight, rows = e.choices.filter(c => c.row === 'range');
    const shown = rows.map(c => ({ label: c.label, on: c.on }));
    s.state.me.speed = 1e6; s.state.band = 2; s.shown = { foe: [{ kind: 'broadside', target: 'hull', dmg: [1, 1] }], captain: { kind: 'hold' } };
    fireTurn(s, { guns: [null], torp: null, pdc: 'fire', range: 'open' }); const opened = s.state.band;
    return { shown, opened };
  });
  const one = await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; hired().raidTold = true; G.nextEvent = null; startShipFight({ kind: 'pirate', gov: 'Arcology Pact', shipId: 'raider' }, false); const e = G.nextEvent; G.nextEvent = null; return { rows: e.choices.filter(c => c.row === 'range').length, read: e.read }; });
  await done();
  assert.equal(r.shown.length, 3); assert.deepEqual(r.shown.map(x => x.on), [false, true, false], 'Hold, until the player orders another');
  assert.match(r.shown[0].label, /^Close \(/); assert.equal(r.opened, 3, 'Open, faster than her: the range opens');
  assert.equal(one.rows, 0, 'chapter one: the range is the captain\'s'); assert.match(one.read, /Captain Vance: (holding|closing|opening) the range\./);
});

// ---------- Task 5: last-seen prices ----------

test('the Exchange shows the best last-seen price elsewhere and its age; the map tells the co-op to plot, and how old its prices are', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(); landAtPort('mars', 'Mars'); const mars = currentPlanet();
    st.day += 4; landAtPort('ceres', 'Ceres Station'); const ceres = currentPlanet();
    const cid = Object.keys(ceres.prices).find(k => mars.prices[k]), seenAt = st.seen.Mars.prices[cid];
    UI.planet = ceres; UI.tab = 'trade'; UI.render(); const exchange = document.querySelector('.shell .body').textContent.replace(/\s+/g, ' ');
    st.dest = 'mars'; const said = []; const fill = ctx.fillText; ctx.fillText = (t, ...a) => { said.push(String(t)); return fill.call(ctx, t, ...a); };
    try { drawMap(G.W || 1200, G.H || 800); } finally { ctx.fillText = fill; }
    return { exchange, line: `Mars ${fmt(seenAt)}, 4 days ago`, map: said.join(' ') };
  });
  await done();
  assert.ok(r.exchange.includes(r.line), `${r.line} in: ${r.exchange.slice(0, 500)}`);
  assert.doesNotMatch(r.map, /The captain picks/); assert.match(r.map, /plot a burn/); assert.match(r.map, /Prices 4 days old/);
});

test('an old finished save goes on with chapter one\'s fights behind it, so pirates can come in chapter two', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.career = { ...careerOf(hired()), came: [], signed: st.day, share: { coop: 'Ceres Station', buyIn: 57000, owed: 93000 }, finished: true };
    st.hired = null; save(); loadGame(); goOnToBridge();
    return { met: ladderPirate(hired(), 0) };
  });
  await done();
  assert.ok(r.met, 'a pirate type is met');
});

test('the endorsement: a fee out of the savings, or onto what is owed when they are short; a captain who trusts the hand vouches, waives it and eases the share', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, go = (regard, credits) => {
      toShare(); const h = hired(); h.vouched = regard >= OPINION.TRUSTED; G.state.credits = credits; const owed = h.share.owed, c0 = G.state.credits;
      const s = goOnToBridge(); return { page: onTheShipCard().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' '), text: s.text, result: s.result, papers: h.papers, owedUp: h.share.owed - owed, paid: c0 - G.state.credits, owed, now: h.share.owed };
    };
    out.paid = go(0, 10000); out.short = go(0, 100); out.vouched = go(3, 10000);
    toShare(); out.signed = hired().vouched; out.fee = ENDORSEMENT_FEE;
    return out;
  });
  await done();
  assert.equal(r.signed, false, 'the signing reads her regard: a fresh hand is not trusted');
  assert.match(r.paid.text, /wants 2,500 for the endorsement/); assert.deepEqual(r.paid.papers, ['endorsement']); assert.equal(r.paid.paid, r.fee); assert.equal(r.paid.owedUp, 0);
  assert.match(r.paid.result, /comes out of your savings/);
  assert.match(r.paid.page, /Captain you, in command Papers a master's endorsement, the Belt registry's Post/, 'the hand\'s page names it'); assert.match(r.vouched.page, /vouched for by Hester Vance/);
  assert.equal(r.short.paid, 0); assert.equal(r.short.owedUp, r.fee); assert.match(r.short.result, /adds it to what you owe/);
  assert.match(r.vouched.text, /Hester Vance/); assert.deepEqual(r.vouched.papers, ['endorsement:vouched']); assert.equal(r.vouched.paid, 0);
  assert.equal(r.vouched.now, Math.round(r.vouched.owed * 0.95), 'a twentieth off what is owed'); assert.match(r.vouched.result, /waives its fee/);
});

test('nobody puts a member ashore: the captain\'s patience is chapter one\'s', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { coopAt(); const h = hired(); h.warned = true; const a = Mods.filter('happenings', [], 'port').map(x => x.make); h.warned = false; const b = Mods.filter('happenings', [], 'port').map(x => x.make); return { ashore: a.includes(putAshoreScene), warned: b.includes(warningScene) }; });
  await done();
  assert.equal(r.ashore, false); assert.equal(r.warned, false);
});

// ---------- the final review's findings (#891) ----------

test('review: the Port page\'s way off the ground is the co-op\'s takeoff, not the captain\'s sail, and sail does nothing in chapter two', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); UI.planet = currentPlanet(); const dock = UI.dockHtml(); Mods.act('sail'); return { dock, run: career().run, mode: G.mode }; });
  await done();
  assert.doesNotMatch(r.dock, /Sail with the captain|data-action="sail"/); assert.match(r.dock, /data-action="takeoff"/);
  assert.equal(r.run, null, 'no captain\'s plan is written'); assert.equal(r.mode, 'landed');
});

test('review: a damaged hull landing in chapter two opens no captain\'s repair, pays no wage and takes nothing from the captain\'s fund', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(), h = hired(); st.armor = 20; const c0 = st.credits, f0 = h.fund; const titles = landAtPort('mars', 'Mars'); return { titles, credits: st.credits - c0, fund: h.fund - f0, stay: !!stayOf(h), armor: st.armor }; });
  await done();
  assert.deepEqual(r.titles, []); assert.equal(r.credits, 0); assert.equal(r.fund, 0); assert.equal(r.stay, false); assert.equal(r.armor, 20);
});

test('review: a burn in chapter two never draws the captain\'s pay events', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); st.dest = 'mars'; takeOff(); G.player.x = BURN_DIST + 40; G.player.y = 0; tryBurn(); enterTransit(); const groups = []; const real = window.hiredEvent; window.hiredEvent = g => { groups.push(g); return null; }; try { for (const c of Mods.filter('happenings', [], 'transit')) if (c.make) try { c.make(); } catch (e) {} } finally { window.hiredEvent = real; } return groups; });
  await done();
  assert.ok(!r.includes('money'), r.join(','));
});

test('review: the tutorial ends at the share, the start is saved at the bridge, and the board and Ceres\'s prices are there at once', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    toShare({ keepTutorial: true }); const had = window.tutorialAtSigning; UI.act('choose', '0'); UI.act('choose', '0'); finishEvent();
    const st = G.state, after = { had, tutorial: st.tutorial, errands: (G.offers || []).filter(o => o.errand).length, seen: !!(st.seen || {})['Ceres Station'] };
    loadGame(); while (G.dialog && !/The Bridge|End of Chapter One/.test(G.dialog.event.title)) finishEvent();
    return { ...after, reloaded: { chapter: chapterOf(G.state), bridge: !!hired().bridge, title: G.dialog && G.dialog.event.title } };
  });
  await done();
  assert.equal(r.had, true, 'the hand\'s tutorial was on'); assert.equal(r.tutorial, null); assert.equal(r.errands, 0); assert.equal(r.seen, true);
  assert.deepEqual(r.reloaded, { chapter: 2, bridge: true, title: null });
});

test('review: the co-op\'s money is one Fund, its own, in the strip', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); st.credits = 12345; return stripItems(st, hired(), st.armor, ship().armor, st.day).map(([k, v]) => `${k}: ${v}`); });
  await done();
  assert.ok(r.includes('Fund: 12,345 cr'), r.join(' | ')); assert.ok(!r.some(x => /^Savings/.test(x)), r.join(' | '));
});

test('review: Ines flies the co-op out, and the burn is the player\'s call, not the captain\'s', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); const ines = castPerson('ines'); if (!st.crew.includes(ines.id)) st.crew.push(ines.id); ines.role = 'pilot'; st.dest = 'mars'; st.route = { dock: 'Mars', go: true }; const can = canDepart(); G.mode = 'flight'; hired().run = { sid: 'mars', planet: 'Mars' }; G.player = makeShip(st.shipId, BURN_DIST + 100, 0, 0); const t0 = !!G.transit; captainCallsBurn(); return { can, pilot: postMode('pilot'), burned: !t0 && !!G.transit }; });
  await done();
  assert.equal(r.pilot, 'crewed'); assert.equal(r.can, true); assert.equal(r.burned, false);
});

// ---------- #905: in chapter two the co-op's money is its fund (st.credits), never the captain's old one ----------

test('#905: the ship\'s-funds gate and the mourning cost read and spend the co-op\'s fund', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), h = hired(); h.fund = 0; st.credits = 5000;
    const gate = needFunds(4000), open = gate[0](); st.credits = 100; const shut = gate[0](), why = gate[1]();
    st.credits = 5000; const m = person(st.crew[0]), o = MOURN.find(x => x.fund), i = MOURN.indexOf(o), ev = mournScene(m);
    const c0 = st.credits, f0 = h.fund; ev.choices[i].run();
    return { open, shut, why, spent: c0 - st.credits, want: (o.cost || 0) + o.fund, fund: h.fund - f0 };
  });
  await done();
  assert.equal(r.open, true); assert.equal(r.shut, false); assert.match(r.why, /100 cr/);
  assert.equal(r.spent, r.want); assert.equal(r.fund, 0);
});

test('#905: nothing outside the hand\'s own code touches the captain\'s fund directly; it goes through purse and moveMoney (boarders.js)', () => {
  const fs = require('node:fs'), path = require('node:path'), dir = path.join(__dirname, '..', 'js');
  const allowed = new Set(['hired.js', 'boarders.js', 'readouts.js', 'repairs.js']);  // the hand's own code, the purse helpers, and two places gated to chapter one
  const found = [];
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js') && !allowed.has(f))) {
    fs.readFileSync(path.join(dir, f), 'utf8').split('\n').forEach((line, i) => { if (/\b(h|hd|hand|hired\(\))\.fund\b/.test(line)) found.push(`${f}:${i + 1}`); });
  }
  assert.deepEqual(found, []);
});

// #906: the wording and the options the co-op's role left behind. The co-op plots its own burns, the jobs pay its fund, and it may buy a yard overhaul.
test('the co-op\'s HUD says no burn is plotted, the jobs say they pay the fund, and the yard overhaul is for sale', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    toShare(); goOnToBridge(); while (G.dialog) finishEvent();
    const st = G.state, out = { role: role().id };
    const texts = []; const real = CanvasRenderingContext2D.prototype.fillText; CanvasRenderingContext2D.prototype.fillText = function (s, ...a) { texts.push(String(s)); return real.call(this, s, ...a); };
    try { G.player = makeShip(st.shipId, 0, 0, 0); G.mode = 'flight'; st.dest = null; drawHud(G.W || 1280, G.H || 800); } finally { CanvasRenderingContext2D.prototype.fillText = real; G.mode = 'landed'; }
    out.burn = texts.find(s => /^Burn:/.test(s));
    out.jobs = jobsHtml().replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const wear = wearHtml(); out.overhaul = /data-action="overhaul" data-arg="fire"/.test(wear);
    st.credits = 1e6; const fire0 = condition().fire, credits0 = st.credits; Mods.act('overhaul', 'fire'); out.fire = [fire0, condition().fire]; out.paid = credits0 - st.credits;
    return out;
  });
  assert.equal(r.role, 'coop');
  assert.equal(r.burn, 'Burn: none (M)', 'the co-op plots its own burns');
  assert.match(r.jobs, /for the co-op's fund/); assert.doesNotMatch(r.jobs, /your own savings|the pay is yours/);
  assert.ok(r.overhaul, 'the yard overhaul is offered'); assert.ok(r.fire[0] < 100 && r.fire[1] === 100, `the overhaul mends the fire control: ${r.fire}`); assert.ok(r.paid > 0, 'and the co-op pays for it');
  await done();
});
