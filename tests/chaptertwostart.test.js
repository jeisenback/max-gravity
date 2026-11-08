'use strict';

// Chapter two's start (#891, docs/superpowers/specs/2026-11-07-chapter-two-start-design.md): a finished chapter one goes on, the lender sends three
// masters and the player picks one, and the co-op's Ore Runner is landed at Ceres with the crew who came, Bexa and Pax.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A hand at Ceres with the share's offer open, signed through the page, the chain played to the end of chapter one.
const helpers = () => {
  window.toShare = (o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(); st.story.next = 1e9; st.tutorial = o.keepTutorial ? 0 : null;  // 0: the hand's first-run steps, left on
    Object.assign(h, { beats: 2, beatRun: -2, flags: { sawHull: true }, debt: 0 });
    h.deal = { price: BUY_IN.mid, day: st.day, broker: false }; st.credits = 60000;
    if (o.alone) for (const id of [...st.crew]) { const p = person(id); if (p && p.cast) p.opinion = -3; }
    if (o.alone) { const cato = castPerson('cato'); G.state.people[cato.id].dead = true; st.crew = st.crew.filter(id => id !== cato.id); }
    st.systemId = 'ceres'; st.planet = 'Ceres Station'; G.mode = 'landed';
    window.tutorialAtSigning = st.tutorial != null; hired().confirm = USED_ID; Mods.act('buyInGo', USED_ID);
    const titles = []; let guard = 20;
    while (G.dialog && G.dialog.event.title !== 'The End of Chapter One' && guard--) { titles.push(G.dialog.event.title); chooseEvent(0); finishEvent(); }
    return titles;
  };
  window.goOnAndPick = (i = 0) => {
    UI.act('choose', '0');  // Go on
    const start = G.dialog && G.dialog.event, names = start ? start.choices.map(c => c.label) : [];
    UI.act('choose', String(i)); finishEvent();
    return { title: start && start.title, names };
  };
  window.chapterTwoView = () => {
    const st = G.state, h = st.hired, cap = hiredCaptain();
    return { chapter: chapterOf(st), role: role().id, masters: h && h.masters, key: cap && cap.captainKey, ship: st.shipId, planet: st.planet, mode: G.mode,
      crew: st.crew.map(person).map(p => ({ cast: p.cast, role: p.role })), gunner: postHolder('gunner') === null || (postHolder('gunner') && postHolder('gunner').role === 'you'),
      dialog: !!G.dialog, condition: st.condition, armor: st.armor === ship().armor };
  };
};

test('signing the share and going on: three masters, one picked, the Ore Runner landed at Ceres with Bexa and Pax', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare(); const over = G.dialog && G.dialog.event; const label = over && over.choices[0].label; const pick = goOnAndPick(0); return { label, pick, v: chapterTwoView() }; });
  await done();
  assert.equal(r.label, 'Go on');
  assert.equal(r.pick.title, 'Three Names');
  assert.equal(r.pick.names.length, 3);
  assert.equal(r.v.chapter, 2); assert.equal(r.v.role, 'coop');
  assert.equal(r.v.masters.length, 3); assert.equal(r.v.key, r.v.masters[0]);
  assert.equal(r.v.ship, 'lightfreighter'); assert.equal(r.v.planet, 'Ceres Station'); assert.equal(r.v.mode, 'landed'); assert.equal(r.v.dialog, false);
  assert.deepEqual(r.v.condition, { drive: 70, life: 65, shields: 60, sensors: 70, fire: 45 }); assert.equal(r.v.armor, true);
  assert.ok(r.v.crew.some(c => c.cast === 'bexa' && c.role === 'icehand'), JSON.stringify(r.v.crew));
  assert.ok(r.v.crew.some(c => c.cast === 'pax' && c.role === 'gunner'), JSON.stringify(r.v.crew));
  assert.ok(r.v.crew.some(c => c.cast === 'cato'), 'Cato came');
});

test('a hand who came alone starts with Bexa, Pax and the master, and can take off with no pilot', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare({ alone: true }); goOnAndPick(1); const v = chapterTwoView(); let err = null; try { takeOff(); } catch (e) { err = String(e); } return { v, pilot: !!roleHolder('pilot'), err, mode: G.mode }; });
  await done();
  assert.deepEqual(r.v.crew.map(c => c.cast).sort(), ['bexa', 'pax']);
  assert.equal(r.pilot, false); assert.equal(r.err, null); assert.equal(r.mode, 'flight');
});

test('a chapter-two save reloads as chapter two, the master aboard and nothing open', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { toShare(); goOnAndPick(2); const key = hiredCaptain().captainKey; save(); loadGame(); while (G.dialog && G.dialog.event.title !== 'The End of Chapter One' && G.dialog.event.title !== 'Three Names') finishEvent(); return { key, v: chapterTwoView(), title: G.dialog && G.dialog.event.title }; });
  await done();
  assert.equal(r.title, null); assert.equal(r.v.role, 'coop'); assert.equal(r.v.key, r.key);
});

test('a finished save from before chapter two goes on the same way', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.career = { ...careerOf(hired()), came: [castPerson('cato').id], signed: st.day, share: { coop: 'Ceres Station', buyIn: 57000, owed: 93000 }, finished: true };
    st.crew = [castPerson('cato').id]; st.hired = null; save(); loadGame();
    const over = G.dialog && G.dialog.event.title, pick = goOnAndPick(0);
    return { over, pick, v: chapterTwoView(), share: hired() && hired().share };
  });
  await done();
  assert.equal(r.over, 'The End of Chapter One'); assert.equal(r.pick.names.length, 3);
  assert.equal(r.v.chapter, 2); assert.equal(r.v.ship, 'lightfreighter');
  assert.deepEqual(r.share, { coop: 'Ceres Station', buyIn: 57000, owed: 93000 });
  assert.ok(r.v.crew.some(c => c.cast === 'cato'));
});

// ---------- Task 4: the co-op's board and exchange, and nothing of chapter one's own ----------

const started = () => {
  window.coopAt = (i = 0) => { toShare(); goOnAndPick(i); const st = G.state; st.story.next = 1e9; G.dialog = null; G.nextEvent = null; UI.notes.length = 0; return st; };
  window.contract = (o = {}) => ({ shipper: 'the Compact Freight Office', good: 'water', tons: 20, from: 'Ceres Station', sid: 'mars', planet: 'Mars', yard: false, days: 5, pay: 12000, due: G.state.day + 9, hazard: false, rumor: false, ...o });
  window.landAtPort = (sid, planet) => { const st = G.state; G.transit = null; st.systemId = sid; st.planet = planet; G.mode = 'landed'; G.dialog = null; G.nextEvent = null; st.customs = { ...(st.customs || {}), last: st.day };
    const titles = []; Mods.emit('landed', currentPlanet()); let guard = 10; while (G.dialog && guard--) { titles.push(G.dialog.event.title); chooseEvent(0); finishEvent(); } return titles; };
};

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

test('a fight that ends the hand\'s life in chapter two ends the run as in chapter one, naming the master', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { const st = coopAt(); const cap = hiredCaptain(); handDies({}, 'first'); const e = G.nextEvent; return { canDie: role().canDie, title: e && e.title, text: e && e.text, choices: e && e.choices.map(c => c.label), last: cap.last }; });
  await done();
  assert.equal(r.canDie, true); assert.equal(r.title, 'The Last Run'); assert.deepEqual(r.choices, ['Begin again']);
  assert.ok(r.text.includes(r.last), 'the master says it'); assert.doesNotMatch(r.text, /undefined|NaN|Hester/);
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
    st.hired = null; save(); loadGame(); goOnAndPick(0);
    return { met: ladderPirate(hired(), 0) };
  });
  await done();
  assert.ok(r.met, 'a pirate type is met');
});

test('the lender\'s three names differ from game to game, not only by the day the share was signed', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { const firsts = new Set(); for (let s = 1; s <= 8; s++) { __seed(s); toShare(); goOnAndPick(0); firsts.add(hiredCaptain().captainKey); } return [...firsts]; });
  await done();
  assert.ok(r.length >= 2, `the first name sent: ${r.join(', ')}`);
});

test('the master cannot put a member ashore: the captain\'s patience is chapter one\'s', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => { coopAt(); const h = hired(); hiredCaptain().opinion = -5; h.warned = true; const a = Mods.filter('happenings', [], 'port').map(x => x.make); h.warned = false; const b = Mods.filter('happenings', [], 'port').map(x => x.make); return { ashore: a.includes(putAshoreScene), warned: b.includes(warningScene) }; });
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

test('review: the tutorial ends at the share, the start is saved at the pick, and the board and Ceres\'s prices are there at once', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    toShare({ keepTutorial: true }); const had = window.tutorialAtSigning; UI.act('choose', '0'); UI.act('choose', '0'); finishEvent();
    const st = G.state, after = { had, tutorial: st.tutorial, errands: (G.offers || []).filter(o => o.errand).length, seen: !!(st.seen || {})['Ceres Station'] };
    loadGame(); while (G.dialog && !/Three Names|End of Chapter One/.test(G.dialog.event.title)) finishEvent();
    return { ...after, reloaded: { chapter: chapterOf(G.state), master: !!MASTER_CAPTAINS[hired().captainKey], title: G.dialog && G.dialog.event.title } };
  });
  await done();
  assert.equal(r.had, true, 'the hand\'s tutorial was on'); assert.equal(r.tutorial, null); assert.equal(r.errands, 0); assert.equal(r.seen, true);
  assert.deepEqual(r.reloaded, { chapter: 2, master: true, title: null });
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
    toShare(); goOnAndPick(0); while (G.dialog) finishEvent();
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
