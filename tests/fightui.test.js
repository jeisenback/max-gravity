'use strict';

// The fight panel's dialog (turn-based combat, #786): a choice marked `keep` redraws the same dialog in place, with no result page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a keep choice runs, then redraws the dialog with the event it returns, with no result page', async () => {
  const { page, ev, done } = await open();
  await ev(() => {
    const first = { title: 'Standoff', text: 'first', choices: [] };
    first.choices = [
      { label: 'A', keep: true, run: () => ({ title: 'Standoff', text: 'second', choices: [{ label: 'End', run: () => 'It ends.' }] }) },
      { label: 'B', run: () => 'Plain result.' },
    ];
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    openEvent(first);
  });
  await page.click('[data-action="choose"][data-arg="0"]');
  const kept = await ev(() => ({ text: document.querySelector('.event-body').textContent, result: !!document.querySelector('#event-result'), shown: G.dialog && G.dialog.event.text }));
  assert.match(kept.text, /second/);
  assert.equal(kept.result, false);
  assert.equal(kept.shown, 'second');
  await page.click('[data-action="choose"][data-arg="0"]');  // a choice without keep still gives its result page
  assert.equal((await page.textContent('#event-result')).trim(), 'It ends.');
  await done();
});

// ---------- the ship fight's start and ends (js/fightui.js), fought on the radar (js/radarui.js) ----------

const helpers = () => {
  window.fightGame = (post = 'gunner', shipId = 'raider') => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; hired().raidTold = true;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    __seed(2);
    if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy;
    const spare = window.realMakeEnemy({ kind: 'pirate' });
    window.makeEnemy = () => Object.assign(spare, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor });
    window.rateFoe = s => { s.grade = 0; s.pack = false; return s; };  // an ordinary foe, whatever the seed draws
    return st;
  };
  window.battle = () => { startDuel({ kind: 'pirate' }, false); const e = G.nextEvent; G.nextEvent = null; openEvent(e); return G.dialog.event.fight; };
  window.choiceAt = label => G.dialog.choices.findIndex(c => c.label.startsWith(label));
  window.endAs = (s, end) => { G.radar = null; G.dialog = null; G.nextEvent = null; shipFightEnd(s, end); return G.nextEvent; };  // the fight on the radar ending, as radarui.js ends it
};

test('a fight\'s end lands in its scene: crippled to dead in space, boarded to the deck fight, lost to the taken consequences and the close', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    fightGame('gunner'); let next = endAs(battle(), 'crippled');
    out.crippled = { next: next && next.title, line: !!next && /grapple arms go slack|drive cone splits/.test(next.text) };
    fightGame('gunner'); next = endAs(battle(), 'boarded');
    out.boarded = { next: next && next.title, line: !!next && /grapples bang on the hull/.test(next.text) };
    fightGame('gunner'); const h = hired(); h.fund = 1000; const cap = person(h.captain), op = cap.opinion;
    const real = Math.random; Math.random = () => 0.99;  // the captain is not lost on her bridge (a roll of one in three)
    const close = endAs(battle(), 'lost'); Math.random = real;
    out.lost = { title: close && close.title, text: close && close.text, fund: h.fund, opinion: cap.opinion - op };
    openEvent(close); out.lost.labels = G.dialog.choices.map(c => c.label); out.lost.down = chooseEvent(0); out.lost.then = G.nextEvent;
    return out;
  });
  assert.deepEqual(r.crippled, { next: 'Dead in Space', line: true });
  assert.deepEqual(r.boarded, { next: 'Boarders', line: true }, 'the deck fight opens on the deck plan');
  assert.equal(r.lost.title, 'Battle Stations');
  assert.match(r.lost.text, /They're on the bridge\. Captain Vance gives them the code to the strongbox because there's no choice, and they take 300 cr of the ship's fund and go\./);
  assert.equal(r.lost.fund, 700); assert.equal(r.lost.opinion, -1, 'the captain marks it');
  assert.deepEqual(r.lost.labels, ['Stand down']); assert.equal(r.lost.down, null); assert.equal(r.lost.then, null, 'and nothing follows it');
  await done();
});

test('a head start from the contact screen is a free first volley: ours at her weapons when ahead, hers at our hull when behind', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const [name, edge, shift] of [['ahead', 2, 10], ['behind', -1, -10], ['even', 0, 0]]) {
      const st = fightGame('gunner'), armor = st.armor;
      startShipFight({ kind: 'pirate' }, false, { edge, shift, text: 'Battle stations.' });
      const s = G.nextEvent.fight, f = s.state;
      out[name] = { weapons: f.foes[0].parts.weapons.hp, hull: f.me.armor, full: f.me.maxArmor, opening: f.opening, kind: f.kind, last: f.log[f.log.length - 1], armor: st.armor === armor };
    }
    return out;
  });
  assert.ok(r.ahead.weapons < 63 && r.ahead.hull === r.ahead.full, `ours first, at her weapons: ${JSON.stringify(r.ahead)}`);
  assert.match(r.ahead.last, /^You fire first: you hit her weapons for \d+, you hit her weapons for \d+\.$/); assert.equal(r.ahead.opening, 'long', 'fifty kilometers: met far out');
  assert.equal(r.ahead.kind, 'radar', 'the fight is on the radar');
  assert.ok(r.behind.weapons === 63 && r.behind.hull < r.behind.full, `hers first, at our hull: ${JSON.stringify(r.behind)}`);
  assert.match(r.behind.last, /^She fires first: she hits your hull for \d+\.$/); assert.equal(r.behind.opening, 'short', 'thirty kilometers: met inside mid range');
  assert.ok(r.even.weapons === 63 && r.even.hull === r.even.full, 'no head start, no volley'); assert.equal(r.even.opening, 'long');
  await done();
});

test('a save made mid-raid in an old version loads with no fight open and no error', async () => {
  const fs = require('node:fs'), path = require('node:path');
  const text = fs.readFileSync(path.join(__dirname, 'fixtures', 'v3-hired-save.json'), 'utf8');
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(saved => {
    // the raid kept nothing of its own in the save: what a raid in an old version left behind is its hull lost, its flag and a hurt hand
    const old = JSON.parse(saved); old.armor = 40; old.hired.flags = { ...(old.hired.flags || {}), raided: true }; old.hired.raidTold = true; old.hired.hurtUntil = old.day + 6;
    const refused = Saves.import(JSON.stringify(old), 2); Saves.use(2); loadGame();
    const out = { refused, mode: G.mode, dialog: G.dialog && [G.dialog.event.title, !!G.dialog.event.fight], next: sceneQueue[0] && [sceneQueue[0].title, !!sceneQueue[0].fight], armor: G.state.armor };  // the landing's next scene waits its turn (#1096)
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    startDuel({ kind: 'pirate' }, false); out.fight = G.nextEvent && G.nextEvent.title; out.me = G.nextEvent && G.nextEvent.fight.state.me.armor;
    return out;
  }, text);
  assert.deepEqual(r, { refused: null, mode: 'landed', dialog: ['Hull Damage', false], next: ['The Old Days', false], armor: 220, fight: 'Battle Stations', me: 99 }, 'the landing\'s own scenes, and no fight; a fight after it starts from the hull the save kept, with the Ice Hauler\'s 180 shield points folded in (#1208: 220, at FIGHT.POOL 0.45)');
  await done();
});

// ---------- the deck fight on the deck plan, from a ship fight (js/deckplanui.js planFightEvent) ----------

const deckHelpers = () => {
  // Math.random answers from a list, then 0.99: 0.01 passes a chance, 0.99 fails it.
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  // boarded from a ship fight (her lock whole, she came alongside); returns the deck fight opened
  window.boarded = () => { const deck = endAs(battle(), 'boarded'); G.nextEvent = null; openEvent(deck); return deck.fight; };
  // the rules' turn answered with these events: for what the scene makes of each kind of event
  window.stubTurn = events => { window.realTurn = window.realTurn || planTurn; planTurn = st => { const state = JSON.parse(JSON.stringify(st)); state.turn++; return { state, events, end: null }; }; };
  window.unstub = () => { planTurn = window.realTurn; };
  window.quiet = () => ({ moves: [], shots: [], charge: null, cut: null, seal: null, feint: false, storm: null });
  window.handLevel = s => s.state.figures.find(f => f.hand).level;
};

test('a hurt hand works the level below: the hand on the decks is that level\'s', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const out = {};
    fightGame('gunner'); hired().skill.gunner = 110; out.well = [lockPost(), handLevel(boarded())];
    fightGame('gunner'); hired().skill.gunner = 110; career().hurtUntil = G.state.day + 5; out.hurt = handLevel(boarded());
    return out;
  });
  assert.deepEqual(r.well, ['gunner', 3]); assert.equal(r.hurt, 2);
  await done();
});

// The navy's party (Task 6): the panel names it, never marks a feint, and says what each of them put down costs; a search's close names the fine.
test('a navy party\'s fight counts to its own turn cap, says the standing its downed heads have cost, and it never feints', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    fightGame('gunner'); const foe = window.realMakeEnemy({ kind: 'patrol', gov: 'Arcology Pact', shipId: 'cutter' });
    const s = repelStart({ foe, foeHp: 0, init: 'foe', grade: 2 }, 'half'), raider = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    const feints = [0, 0.001, 0.5].map(x => planTheirMove(s.state, () => x).feint);
    s.state.navyDown = 2; const line = sceneSay('scene:fight', 'plan.navy.down', { gov: 'Arcology Pact', n: 2 * DECK.NAVY_STANDING });
    return { party: s.state.party, count: planCountText(s), raider: planCountText(raider), feints, line, navyPage: planFightEvent(s).board, raiderPage: planFightEvent(raider).board };
  });
  assert.equal(r.party, 'navy');
  assert.match(r.count, new RegExp(`^Turn 1 of ${8}\\.`), r.count);  // PLAN.NAVY_TURNS, the soak's range (#1355)
  assert.match(r.raider, new RegExp(`^Turn 1 of ${12}\\.`), r.raider);  // PLAN.TURNS
  assert.deepEqual(r.feints, [false, false, false], 'a navy push is never feinted');
  assert.ok(r.navyPage.includes(r.line), 'the page says the standing its heads put down have cost so far (#1396)'); assert.match(r.line, /Arcology Pact\. 4 lost so far/);
  assert.doesNotMatch(r.raiderPage, /costs standing/, 'a raider\'s page has no such line');
  await done();
});

test('repelled, taken, and an assault won or lost each settle through the existing outcomes', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const out = {};
    const play = (s, set) => {  // the state set by hand, their move a hold and ours too, the hand holding fire, and Fight with nothing rolling for us
      set(s.state); s.theirs = quiet(); s.intent = 'hold'; s.pick = { move: null, act: { kind: 'holdfire' }, order: null };
      const real = Math.random; rolls([]); const go = planResolve(s); Math.random = real;
      const close = G.nextEvent; G.nextEvent = null;
      const down = close && close.choices[0]; const after = down && down.run();
      return { go, title: close && close.title, text: close && close.text, labels: close && close.choices.map(c => c.label), after, then: G.nextEvent && G.nextEvent.title };
    };
    const them = f => f.figures.filter(x => x.side === 'them'), us = f => f.figures.filter(x => x.side === 'us' && !x.hand);
    // repelled: none of them left, and none to land
    let st = fightGame('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion;
    let s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    out.repelled = { ...play(s, f => { them(f).forEach(x => { x.hp = 0; }); f.wave = 0; }), opinion: cap.opinion - op };
    // taken: three of them on our bridge and none of ours there
    st = fightGame('gunner'); h = hired(); h.fund = 1000; cap = person(h.captain); op = cap.opinion;
    s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    out.taken = { ...play(s, f => { us(f).forEach(x => { x.hp = 0; }); them(f).slice(0, 3).forEach(x => { x.spot = 'helm'; }); }), fund: h.fund, opinion: cap.opinion - op };
    // an assault won: ours on her bridge, and hers gone from it
    st = fightGame('gunner'); h = hired(); let fund = h.fund; const foe = makeEnemy({ kind: 'pirate' });
    s = assaultStart(foe);
    out.won = { ...play(s, f => { const bridge = planBridge(f); them(f).filter(x => bridge.includes(x.spot)).forEach(x => { x.hp = 0; }); us(f)[0].spot = 'helm'; }), fundUp: h.fund > fund, dead: !!foe.dead };
    // an assault lost: none of ours left standing but the hand
    st = fightGame('gunner'); const armor = st.armor; const foe2 = makeEnemy({ kind: 'pirate' });
    s = assaultStart(foe2);
    out.lost = { ...play(s, f => { us(f).forEach(x => { x.hp = 0; }); }), armorDown: st.armor < armor, drifting: !foe2.dead };
    return out;
  });
  assert.equal(r.repelled.go, false); assert.equal(r.repelled.title, 'Boarders', 'the close is shown on the scene');
  assert.match(r.repelled.text, /The last of them go back through the lock/); assert.equal(r.repelled.opinion, 1, 'the captain remembers it');
  assert.deepEqual(r.repelled.labels, ['Stand down']); assert.equal(r.repelled.after, null);
  assert.match(r.taken.text, /They're on the bridge\. Captain Vance gives them the code to the strongbox/); assert.equal(r.taken.fund, 700); assert.equal(r.taken.opinion, -1);
  assert.match(r.won.text, /Her captain puts the weapon down\. Her strongbox/); assert.ok(r.won.fundUp && r.won.dead);
  assert.match(r.lost.text, /You're driven back to the lock/); assert.ok(r.lost.armorDown && r.lost.drifting);
  await done();
});

// ---------- the rework's orders and ends (docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md) ----------

test('the captain running ends the fight as a loss and she getting away gives no experience', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const end of ['ran', 'away']) {
      fightGame('gunner'); const s = battle(), cap = person(hired().captain), op = cap.opinion, m0 = (cap.memories || []).length, post = lockPost(), xp = () => (career().skill || {})[post] || 0, x0 = xp(), rep = G.state.rep ? JSON.stringify(G.state.rep) : '';
      shipFightEnd(s, end);
      const ev = G.nextEvent;
      out[end] = { xp: xp() - x0, like: cap.opinion - op, mem: (cap.memories || []).slice(m0).map(m => m.text || m), text: ev.text, labels: ev.choices.map(c => c.label), rep: (G.state.rep ? JSON.stringify(G.state.rep) : '') === rep };
    }
    return out;
  });
  assert.equal(r.ran.xp, 0); assert.equal(r.away.xp, 0);
  assert.equal(r.ran.like, -1); assert.equal(r.ran.mem.length, 1); assert.match(String(r.ran.mem[0]), /run from a fight/);
  assert.match(r.ran.text, /Captain Vance calls it off\..*lost fight/); assert.doesNotMatch(r.ran.text, /experience/);
  assert.equal(r.away.like, 0); assert.deepEqual(r.away.mem, []); assert.match(r.away.text, /she got away/); assert.doesNotMatch(r.away.text, /experience/);
  assert.deepEqual(r.ran.labels, ['Stand down']); assert.deepEqual(r.away.labels, ['Stand down']);
  await done();
});

// ---------- a lost fight costs cargo (#809) ----------

test('when the captain runs, a third of the hold goes and the contract comes in short', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'), h = hired(), here = currentPlanet();
    h.run = { contract: true, shipper: 'the Arcology Pact Freight Office', good: 'water', tons: 30, from: 'X', planet: here.name, sid: st.systemId, pay: 90000, day: st.day - 6, days: 6, due: st.day + 5, cost: 0, profit: 90000 };
    st.cargo = { water: 30 }; st.paid = {};  // a contract's load has no price paid
    const s = battle(); shipFightEnd(s, 'ran');
    const held = st.cargo.water, text = G.nextEvent.text;
    settleRun(here);
    return { held, text, short: h.ledger[0].short, tons: h.ledger[0].tons, paid: st.paid.water };
  });
  assert.equal(r.held, 21); assert.equal(r.short, true); assert.equal(r.tons, 21);
  assert.match(r.text, /calls it off.*lost fight.*Captain Vance has 9t of Water dumped to run lighter\.$/s); assert.doesNotMatch(r.text, /You jettison/); assert.ok(r.paid === undefined || Number.isFinite(r.paid), String(r.paid));
  await done();
});

test('a contract load that is not the fullest good stays whole and the delivery is not short', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'), h = hired(), here = currentPlanet();
    h.run = { contract: true, shipper: 'the Arcology Pact Freight Office', good: 'water', tons: 10, from: 'X', planet: here.name, sid: st.systemId, pay: 30000, day: st.day - 6, days: 6, due: st.day + 5, cost: 0, profit: 30000 };
    st.cargo = { water: 10, metal: 30 }; st.paid = { metal: 300 };
    const s = battle(); shipFightEnd(s, 'ran');
    const left = { ...st.cargo }, paid = { ...st.paid }; settleRun(here);
    return { left, paid, short: h.ledger[0].short };
  });
  assert.deepEqual(r.left, { water: 10, metal: 21 }); assert.equal(r.short, false); assert.ok(Number.isFinite(r.paid.metal) && !('water' in r.paid), JSON.stringify(r.paid));
  await done();
});

test('when she takes the ship, she takes cargo as well as the fund', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); st.cargo = { water: 30, metal: 10 }; st.paid = { water: 300, metal: 100 };
    const s = battle(), real = Math.random; Math.random = () => 0.99;  // the captain is not lost
    const text = shipTaken(s); Math.random = real;
    const out = { water: st.cargo.water, metal: st.cargo.metal, text };
    st.cargo = { water: 30 }; s.d.foe.kind = 'patrol'; Math.random = () => 0.99; out.navy = shipTaken(s); Math.random = real;
    return out;
  });
  assert.match(r.navy, /The boarding officer has 9t of Water taken off as part of the levy\./); assert.doesNotMatch(r.navy, /They take 9t/);
  assert.equal(r.water, 21); assert.equal(r.metal, 10); assert.match(r.text, /They take 9t of Water from the hold as well\./); assert.doesNotMatch(r.text, /jettison/);
  await done();
});

test('a lost fight\'s armor is billed at the next yard', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); const s = battle(); st.armor = Math.round(ship().armor * 0.4);
    shipFightEnd(s, 'ran');
    return repairPlan({ ...currentPlanet(), services: ['shipyard', 'trade'] });
  });
  assert.ok(r.total > 0 && r.yard && r.lost > 0, JSON.stringify(r));
  await done();
});

test('armor lost in a fight past its skin comes back to the ship at full scale, and a fight never repairs it (HULL_SKIN, #1208)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = [];
    for (const less of [0, 11, -3]) {  // whole, an odd amount down (its scaled armor rounds up), and at 3
      const st = fightGame('gunner'), real = less < 0 ? -less : ship().armor - less; st.armor = real;
      const s = battle(), me = s.state.me, start = me.armor, skin = HULL_SKIN * me.maxArmor, row = { real, start, max: me.maxArmor, ship: ship().armor, pool: FIGHT.POOL, skin };
      row.atStart = st.armor;
      fightTook(s, []); row.unhurt = st.armor;
      me.armor = Math.max(0, start - 7); fightTook(s, []); row.after7 = st.armor;
      me.armor = Math.max(0, start - Math.ceil(skin) - 7); fightTook(s, []); row.past7 = st.armor;
      me.armor = 0; fightTook(s, []); row.atZero = st.armor;
      out.push(row);
    }
    return out;
  });
  for (const x of r) {
    assert.equal(x.start, Math.min(x.max, Math.round(x.real * x.pool)), `the fight armor is the real armor scaled: ${JSON.stringify(x)}`);
    assert.equal(x.max, Math.round(x.pool * x.ship), 'her maximum is the ship\'s scaled');
    assert.equal(x.atStart, x.real, 'starting a fight changes nothing');
    assert.equal(x.unhurt, x.real, `a turn with no armor lost leaves the real armor as it was, rounding or not: ${JSON.stringify(x)}`);
    const past = lost => Math.max(1, x.real - Math.max(0, Math.round((Math.min(lost, x.start) - x.skin) / x.pool)));
    assert.equal(x.after7, past(7), `seven fight armor lost lands on the skin: ${JSON.stringify(x)}`);
    assert.equal(x.past7, past(Math.ceil(x.skin) + 7), `past the skin, what is lost is lost / POOL real: ${JSON.stringify(x)}`);
    assert.equal(x.atZero, past(x.start), `all of it: what was past the skin, and never under 1: ${JSON.stringify(x)}`);
  }
  await done();
});

test('a ship at real armor 1 starts the fight at 1, and a cycle with her out of range does not end it lost', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); st.armor = 1;
    const s = battle(), start = s.state.me.armor;
    s.state = radarCycle(s.state, {}, () => 0.99).state;  // she is met far out: no shot reaches us in the first cycle
    return { start, end: radarEnd(s.state), armor: st.armor };
  });
  assert.equal(r.start, 1, 'the fight armor is at least 1');
  assert.notEqual(r.end, 'lost', JSON.stringify(r)); assert.equal(r.armor, 1);
  await done();
});

test('the yard bills the real armor lost', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); st.armor = ship().armor;
    const s = battle(); s.state.me.armor -= Math.round(HULL_SKIN * s.state.me.maxArmor) + 10; fightTook(s, []);  // ten past the skin (#1208)
    shipFightEnd(s, 'broke');
    const plan = repairPlan({ ...currentPlanet(), services: ['shipyard', 'trade'] });
    return { lost: plan.lost, max: ship().armor, armor: st.armor, pool: FIGHT.POOL };
  });
  assert.equal(r.lost, Math.round(10 / r.pool), JSON.stringify(r));
  assert.equal(r.lost, r.max - r.armor);
  await done();
});

test('with an empty hold nothing is jettisoned and nothing throws', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const end of ['ran', 'lost']) {
      const st = fightGame('gunner'); st.cargo = {}; const s = battle(), real = Math.random; Math.random = () => 0.99;
      shipFightEnd(s, end); Math.random = real;
      out[end] = { text: G.nextEvent.text, cargo: JSON.stringify(st.cargo) };
    }
    return out;
  });
  for (const end of ['ran', 'lost']) { assert.equal(r[end].cargo, '{}'); assert.doesNotMatch(r[end].text, /jettison|dump|\dt of/i, end); }
  await done();
});

// ---------- the final review's fixes (#786) ----------

test('a head start that hurts the hand bills the clinic to the hand\'s own credits, not the ship\'s fund', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const st = fightGame('gunner'), h = hired();
    st.crew = st.crew.filter(id => person(id).role !== 'medic' && !(CAST[person(id).cast] || {}).firstAid)  // no medic, and no first aid (the bosun's, #879); delete h.hurtUntil;
    h.fund = 10000; st.credits = 5000;
    const real = headStart;
    headStart = state => { const s2 = JSON.parse(JSON.stringify(state)); s2.me.armor -= 100; return { state: s2, events: [{ who: 'foe', foe: 0, part: 'hull', dmg: 100 }] }; };  // a heavy first volley
    rolls([0.99, 0.99, 0.01, 0.99]);  // the run fails, no casualty, the hand's own roll, and no death
    try { hiredFunds(() => startDuel({ kind: 'pirate' }, true)); } finally { headStart = real; }
    return { fund: h.fund, credits: st.credits, hurt: handHurt() };
  });
  assert.equal(r.hurt, true, 'the hand is hurt');
  assert.equal(r.fund, 10000, 'the fund is the ship\'s'); assert.equal(r.credits, 3500, 'the clinic is 1,500 cr of the hand\'s own');
  await done();
});

test('in the deck fight, the one beside the hand takes the first hit meant for them, and one who owed the hand says they are even (#1388)', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const st = fightGame('gunner'), h = hired(); delete h.hurtUntil;
    for (const id of st.crew) { person(id).opinion = 0; delete person(id).owes; }
    const turn = owes => {
      const s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full'), mate = s.state.figures.find(f => f.side === 'us' && !f.hand && !f.captain);
      if (owes) person(mate.id).owes = true;
      stubTurn([{ kind: 'shielded', id: mate.id }]); rolls([0.99]); try { fightTurn(s); } finally { unstub(); }
      return { line: s.state.log[s.state.log.length - 1], first: mate.name, owes: !!person(mate.id).owes };
    };
    window.fightTurn = s => { if (!s.theirs) planBegin(s); return planResolve(s); };
    return { plain: turn(false), even: turn(true), youHurt: handHurt() };
  });
  assert.match(r.plain.line, new RegExp(`${r.plain.first} pulls you down behind the closer and takes it\\.`), r.plain.line);
  assert.match(r.even.line, /We are even/, r.even.line); assert.equal(r.even.owes, false, 'the debt is paid');
  assert.equal(r.youHurt, false);
  await done();
});

// Hold fire: offered in every deck fight; the turn fires at nobody and spends nothing.
test('hold fire is offered in every deck fight, and a turn of it fires no shot and spends no cover', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const acts = s => planChoices(s.state).acts.map(a => a.kind);
    fightGame('gunner'); const s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    const repel = acts(s), assault = acts(assaultStart(makeEnemy({ kind: 'pirate' })));
    s.theirs = quiet(); s.intent = 'hold'; s.pick = { move: null, act: { kind: 'holdfire' }, order: null };
    const real = planTurn; let events = [];
    planTurn = (...a) => { const t = real(...a); events = t.events; return t; };
    rolls([]); try { planResolve(s); } finally { planTurn = real; }  // every roll a miss: a shot the hand fired would show as one
    return { repel, assault, fired: events.filter(e => e.id === 'hand' && (e.kind === 'miss' || e.kind === 'ability')).length, used: s.state.coverUsed };
  });
  for (const k of ['repel', 'assault']) assert.ok(r[k].includes('holdfire'), `${k}: ${r[k].join(' | ')}`);
  assert.equal(r.fired, 0, 'no shot and no ability'); assert.equal(r.used, false, 'the cover is not spent');
  await done();
});

test('the tester panel drops a hired hand into each kind of fight, early and late in the chapter (js/uat.js)', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = {}, item = id => UAT_ITEMS.find(i => i.id === id);
    const now = () => { const e = G.dialog && G.dialog.event; return e && e.fight ? e.fight : null; };
    for (const id of ['fight-raider', 'fight-pack', 'fight-veteran', 'fight-patrol']) {
      item(id).setup(); const f = now();
      out[id] = { title: G.dialog.event.title, kind: f && f.state.kind, foes: f && f.state.foes.length, ship: f && f.foe.shipId, grade: f && f.grade, patrol: f && f.spec.kind === 'patrol', torp: !!(f && f.state.foes[0].torps > 0), post: hired().post };
    }
    item('deck-repel').setup(); out.repel = { kind: now() && now().state.kind, assault: now() && now().state.assault, grade: now() && now().state.grade };
    item('deck-navy').setup(); out.navy = { kind: now().state.kind, party: now().state.party, assault: now().state.assault, grade: now().state.grade, gov: now().d.foe.gov, ship: now().d.foe.shipId, board: G.dialog.event.board || '' };
    item('deck-assault').setup(); out.dead = G.dialog.event.title; const n = /(\d+) of yours against (\d+) of hers/.exec(G.dialog.event.text);
    chooseEvent(G.dialog.choices.findIndex(c => /Board/.test(c.label))); const e = G.nextEvent; G.nextEvent = null; openEvent(e);
    out.assault = { kind: now().state.kind, assault: now().state.assault, stated: n && Number(n[2]), began: now().state.began };
    // Late in the chapter: the same fights a grade harder, with the gunner at the top, the guns boresighted, the keys carried, and friends aboard.
    item('late-fight-raider').setup(); out.late = { grade: now().grade, skill: now().state.me.skill, level: skillLevel('gunner'), sighted: boresighted(), kit: career().kit.slice(), friends: G.state.crew.map(person).every(p => p.opinion >= OPINION.FRIEND) };
    item('late-deck-repel').setup(); out.lateRepel = now().state.grade;
    out.lateIds = UAT_ITEMS.filter(i => i.group === 'Turn-based fights, late chapter').map(i => i.id);
    return out;
  });
  for (const id of ['fight-raider', 'fight-pack', 'fight-veteran', 'fight-patrol']) { assert.equal(r[id].title, 'Battle Stations', id); assert.equal(r[id].kind, 'radar', id); assert.equal(r[id].post, 'gunner', id); }
  assert.deepEqual([r['fight-raider'].ship, r['fight-raider'].foes], ['raider', 1]);
  assert.equal(r['fight-pack'].foes, 2, 'two raiders in company');
  assert.deepEqual([r['fight-veteran'].ship, r['fight-veteran'].grade, r['fight-veteran'].torp], ['corsair', 2, true]);
  assert.ok(r['fight-patrol'].patrol);
  assert.deepEqual(r.repel, { kind: 'plan', assault: false, grade: 1 });
  assert.deepEqual([r.navy.kind, r.navy.party, r.navy.assault, r.navy.grade, r.navy.ship], ['plan', 'navy', false, 1, 'cutter'], 'a navy patrol boards: her party, on our deck');
  assert.ok(r.navy.gov && /Turn 1 of 8\./.test(r.navy.board), 'its own cap (PLAN.NAVY_TURNS)');
  assert.equal(r.dead, 'Dead in Space');
  assert.deepEqual([r.assault.kind, r.assault.assault], ['plan', true]); assert.equal(r.assault.stated, r.assault.began, 'the count she states is the fight that opens');
  assert.deepEqual(r.late, { grade: 1, skill: 6, level: 5, sighted: true, kit: ['valve-keys'], friends: true }, 'the late hand: the top of the ladder, level 5, and boresighted (skill 6 in the fight), the keys, friends aboard, and a raider a grade better');
  assert.equal(r.lateRepel, 2);
  assert.deepEqual(r.lateIds, ['late-fight-raider', 'late-fight-pack', 'late-fight-veteran', 'late-fight-patrol', 'late-deck-repel', 'late-deck-navy', 'late-deck-assault']);
  await done();
});

// ---------- the fight perks (picks.js, #963): marksman, pd-watch and cover-eye for a gunner, brace and lane-sense for a pilot ----------

test('the fight perks read the picks taken: a level more at the guns, the point defence reaching further, three points of cover, a tenth more on a run, ten km more at contact', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    fightGame('gunner'); const g0 = battle(), repel = () => repelStart({ foe: window.realMakeEnemy({ kind: 'pirate', shipId: 'raider' }), foeHp: 0, init: 'foe' }, 'half').state.made;
    out.before = { skill: g0.state.me.skill, reach: radarPdcReach(g0.state), made: repel(), card: fightCard().replace(/<[^>]+>/g, ' ') };
    takePick(career(), 'marksman'); takePick(career(), 'pd-watch'); takePick(career(), 'cover-eye'); const g1 = battle();
    out.after = { skill: g1.state.me.skill, reach: radarPdcReach(g1.state), made: repel(), perks: [handPerk('marksman'), handPerk('trim')], card: fightCard().replace(/<[^>]+>/g, ' ') };
    out.radar = { plain: RADAR.PDC_R, watch: RADAR.PDC_WATCH };
    fightGame('pilot', 'cutter'); const flee0 = fleeOdds(), open0 = battle().state.opening;
    takePick(career(), 'brace'); takePick(career(), 'lane-sense');
    out.pilot = { flee: Math.round((fleeOdds() - flee0) * 100), open0, open1: battle().state.opening };
    return out;
  });
  assert.deepEqual([r.after.skill - r.before.skill, r.before.made, r.after.made, r.after.perks], [1, 2, 3, [true, false]]);
  assert.deepEqual([r.before.reach, r.after.reach], [r.radar.plain, r.radar.watch], 'pd-watch: the point defence reaches further (the owner, #1377)');
  assert.match(r.before.card, new RegExp(`reaches ${r.radar.plain} km`)); assert.match(r.after.card, new RegExp(`reaches ${r.radar.watch} km`), 'the Weapons card quotes the reach the fight uses');
  assert.deepEqual(r.pilot, { flee: 10, open0: 'short', open1: 'long' }, 'brace and lane-sense: a cutter is met with guns at 30 km (inside mid range), 40 with the pick');
  await done();
});

// ---------- the gunner moves (docs/superpowers/specs/2026-10-23-gunner-moves-design.md) ----------

test('a hand who buys the ship keeps the moves', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ kept: careerOf({ post: 'gunner', moves: ['vent', 'split'] }).moves, older: careerOf({ post: 'gunner' }).moves }));
  assert.deepEqual(r.kept, ['vent', 'split']);
  assert.deepEqual(r.older, [], 'a save from before has none');
  await done();
});

// ---------- the panel reads true (the owner, 2026-11-07): the bars stay in view and say what each turn took; the sidebar follows the fight; the gun orders read as orders ----------

test('while a ship fight is up the sidebar shows the fight\'s own armor, the numbers the panel shows', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { fightGame('gunner'); battle(); const me = G.dialog.event.fight.state.me; return { hud: hudHull(G.player, G.dialog), me: [me.armor, me.maxArmor], none: (G.dialog = null, hudHull({ armor: 6, maxArmor: 9 }, null)) }; });
  await done();
  assert.deepEqual(r.hud, r.me); assert.deepEqual(r.none, [6, 9]);
});
