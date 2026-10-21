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

// ---------- the ship fight's panel, in place of the raid (js/fightui.js) ----------

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
};

test('battle stations opens the fight panel with both sides\' bars, her move and the captain\'s, and one order per gun', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); const s = battle(), f = s.state;
    const bars = document.querySelector('#panel .event-body svg.bars');
    return {
      title: G.dialog.event.title, duel: !!G.duel, read: G.dialog.event.read, labels: G.dialog.choices.map(c => c.label), keep: G.dialog.choices.map(c => !!c.keep),
      board: !!document.querySelector('#panel .event-body svg.board'), bars: bars && bars.getAttribute('aria-label'),
      guns: f.me.guns, ready: gunsReady(f), band: RANGE_BANDS[f.band], text: G.dialog.event.text,
    };
  });
  assert.equal(r.title, 'Battle Stations'); assert.equal(r.duel, false);
  assert.match(r.read, /^The Pirate "[^"]+": closing, and firing at your hull as she comes, 14 to 21 damage\. Captain Vance: holding the range\.$/, r.read);
  assert.equal(r.band, 'long', 'a raider is met at forty kilometers');
  assert.equal(r.guns, 2, 'the hauler\'s gun and the turret'); assert.equal(r.ready, 2);
  assert.deepEqual(r.labels, ['Gun 1: aim at her weapons', 'Gun 2: aim at her weapons', 'Torpedo, 2 left: hold fire', 'Turret: fire with the guns', 'Fire: heat 2 of 4']);
  assert.deepEqual(r.keep, [true, true, true, true, true], 'every order and Fire redraw in place');
  assert.ok(r.board, 'the sensor board'); assert.match(r.bars, /^You: shields 180 of 180, armor 260 of 260, weapons 80 of 80, drive 15 of 15, lock 10 of 10, heat 0 of 4\. Her: shields 70 of 70, armor 60 of 60, weapons 40 of 40, drive 15 of 15, lock 10 of 10\.$/, r.bars);
  assert.match(r.text, /raider|plume|forty kilometers/i, 'the opening line is the first line of the log');
  await done();
});

test('setting a gun\'s target redraws in place; Fire resolves a turn and the log gains a line', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { fightGame('gunner'); battle(); });
  await page.click('[data-action="choose"][data-arg="0"]');
  const a = await ev(() => ({ result: !!document.querySelector('#event-result'), label: G.dialog.choices[0].label, title: G.dialog.event.title, turn: G.dialog.event.fight.state.turn }));
  assert.deepEqual(a, { result: false, label: 'Gun 1: aim at her drive', title: 'Battle Stations', turn: 0 });
  for (let i = 0; i < 4; i++) await page.click('[data-action="choose"][data-arg="0"]');
  assert.equal(await ev(() => G.dialog.choices[0].label), 'Gun 1: aim at her weapons', 'the targets go round: drive, lock, hull, hold, weapons');
  await page.click('[data-action="choose"][data-arg="0"]');
  await ev(() => { const d = G.dialog.event.fight.state.foes[0].parts.drive; d.hp = d.max = 100; });  // one shot cannot take her drive, so she can close as she said (the roll moves with the page's frames)
  const fire = await ev(() => G.dialog.choices.findIndex(c => c.label.startsWith('Fire')));
  await page.click(`[data-action="choose"][data-arg="${fire}"]`);
  const b = await ev(() => { const s = G.dialog.event.fight; return { result: !!document.querySelector('#event-result'), turn: s.state.turn, log: s.state.log.length, last: s.state.log[s.state.log.length - 1], text: G.dialog.event.text, drive: s.state.foes[0].parts.drive.hp, band: RANGE_BANDS[s.state.band] }; });
  assert.equal(b.result, false, 'no result page between turns'); assert.equal(b.turn, 1); assert.equal(b.log, 2, 'the opening and the first turn');
  assert.match(b.last, /^Turn 1: you hit her drive for \d+/, b.last); assert.ok(b.text.endsWith(b.last), 'the panel shows the newest line last');
  assert.ok(b.drive < 100, 'the shot is on her drive'); assert.equal(b.band, 'mid', 'she closed a band, as she said she would');
  await done();
});

test('a fight played to each end lands in its scene: crippled to dead in space, boarded to the lock, lost to the taken consequences', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    // crippled: her weapons gone, her drive one shot from gone, the gun on it
    fightGame('gunner'); let s = battle();
    s.state.foes[0].parts.weapons.hp = 0; s.state.foes[0].parts.drive.hp = 1; s.state.band = RANGE_BANDS.indexOf('close');
    openEvent(chooseEvent(0));  // gun 1 at her drive
    s.shown = { foe: [{ kind: 'hold' }], captain: { kind: 'hold' } };
    out.crippled = { ret: chooseEvent(choiceAt('Fire')), next: G.nextEvent && G.nextEvent.title, line: G.nextEvent && /grapple arms go slack|drive cone splits/.test(G.nextEvent.text) };
    // boarded: alongside, her lock whole, and her shown move is the boarding
    fightGame('gunner'); s = battle(); s.state.band = RANGE_BANDS.indexOf('knife'); s.shown = { foe: [{ kind: 'board' }], captain: { kind: 'hold' } };
    out.boarded = { ret: chooseEvent(choiceAt('Fire')), next: G.nextEvent && G.nextEvent.title, line: G.nextEvent && /grapples bang on the hull/.test(G.nextEvent.text) };
    // lost: the hull is one point from gone, and her broadside is at it
    const st = fightGame('gunner'), h = hired(); h.fund = 1000; const cap = person(h.captain), op = cap.opinion;
    s = battle(); s.state.foes.forEach(f => { f.parts.weapons.hp = f.parts.weapons.max = 90; });  // two guns would shoot away her weapons (20) before she fires
    Object.assign(s.state.me, { shields: 0, armor: 1 }); s.shown = { foe: [{ kind: 'broadside', target: 'hull', dmg: [10, 10] }], captain: { kind: 'hold' } };
    const real = Math.random; Math.random = () => 0.99;  // the captain is not lost on her bridge (a roll of one in three)
    const ret = chooseEvent(choiceAt('Fire')), close = G.nextEvent; Math.random = real;
    out.lost = { ret, title: close && close.title, text: close && close.text, fund: h.fund, opinion: cap.opinion - op, armor: st.armor };
    finishEvent(); out.lost.shown = G.dialog && G.dialog.event.title; out.lost.labels = G.dialog.choices.map(c => c.label);
    out.lost.down = chooseEvent(0); out.lost.then = G.nextEvent;
    return out;
  });
  assert.deepEqual(r.crippled, { ret: null, next: 'Dead in Space', line: true });
  assert.deepEqual(r.boarded, { ret: null, next: 'The Lock', line: true }, 'the deck fight opens at the lock');
  assert.equal(r.lost.ret, null); assert.equal(r.lost.title, 'Battle Stations');
  assert.match(r.lost.text, /They're on the bridge\. Captain Vance gives them the code to the strongbox because there's no choice, and they take 300 cr of the ship's fund and go\./);
  assert.equal(r.lost.fund, 700); assert.equal(r.lost.opinion, -1, 'the captain marks it');
  assert.equal(r.lost.armor, 1, 'the hull at its last point');
  assert.equal(r.lost.shown, 'Battle Stations', 'the close is shown on the panel'); assert.deepEqual(r.lost.labels, ['Stand down']); assert.equal(r.lost.down, null); assert.equal(r.lost.then, null, 'and nothing follows it');
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
      out[name] = { weapons: f.foes[0].parts.weapons.hp, hull: f.me.shields + f.me.armor, full: f.me.maxShields + f.me.maxArmor, band: RANGE_BANDS[f.band], turn: f.turn, last: f.log[f.log.length - 1], armor: st.armor === armor };
    }
    return out;
  });
  assert.ok(r.ahead.weapons < 40 && r.ahead.hull === r.ahead.full, `ours first, at her weapons: ${JSON.stringify(r.ahead)}`);
  assert.match(r.ahead.last, /^You fire first: you hit her weapons for \d+, you hit her weapons for \d+\.$/); assert.equal(r.ahead.band, 'long', 'fifty kilometers'); assert.equal(r.ahead.turn, 0, 'the free volley is not a turn');
  assert.ok(r.behind.weapons === 40 && r.behind.hull < r.behind.full, `hers first, at our hull: ${JSON.stringify(r.behind)}`);
  assert.match(r.behind.last, /^She fires first: she hits your hull for \d+\.$/); assert.equal(r.behind.band, 'mid', 'thirty kilometers');
  assert.ok(r.even.weapons === 40 && r.even.hull === r.even.full, 'no head start, no volley'); assert.equal(r.even.band, 'long');
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
    const out = { refused, mode: G.mode, dialog: G.dialog && [G.dialog.event.title, !!G.dialog.event.fight], next: G.nextEvent && [G.nextEvent.title, !!G.nextEvent.fight], armor: G.state.armor };
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    startDuel({ kind: 'pirate' }, false); out.fight = G.nextEvent && G.nextEvent.title; out.me = G.nextEvent && G.nextEvent.fight.state.me.armor;
    return out;
  }, text);
  assert.deepEqual(r, { refused: null, mode: 'landed', dialog: ['Hull Damage', false], next: ['The Old Days', false], armor: 40, fight: 'Battle Stations', me: 40 }, 'the landing\'s own scenes, and no fight; a fight after it starts from the hull the save kept');
  await done();
});

// ---------- the deck panel, in place of the lock fight (js/fightui.js deckFightEvent) ----------

const deckHelpers = () => {
  // Math.random answers from a list, then 0.99: 0.01 passes a chance, 0.99 fails it.
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  // boarded from a ship fight: alongside, her lock whole, and her shown move is the boarding; returns the deck panel opened
  window.boarded = () => {
    const s = battle(); s.state.band = RANGE_BANDS.indexOf('knife'); s.shown = { foe: [{ kind: 'board' }], captain: { kind: 'hold' } };
    chooseEvent(choiceAt('Fire')); const deck = G.nextEvent; G.nextEvent = null; openEvent(deck); return deck.fight;
  };
};

test('being boarded opens the deck panel: heads and cover by section, the hand\'s place, their shown move', async () => {
  const { page, ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    fightGame('gunner'); const s = boarded(), f = s.state, e = G.dialog.event;
    return {
      title: e.title, read: e.read, labels: G.dialog.choices.map(c => c.label), keep: G.dialog.choices.map(c => !!c.keep),
      strip: document.querySelector('#panel .event-body svg.board').getAttribute('aria-label'),
      heads: f.sections.map(x => [x.mine, x.theirs, x.cover]), hand: f.hand, shown: s.shown, size: SHIPS[G.state.shipId].size,
      text: e.text,
    };
  });
  assert.equal(r.title, 'The Lock', 'the panel is named for where the hand stands');
  assert.ok(r.size >= 16, 'the hauler is long: a cargo bay to go round by');
  assert.deepEqual(r.heads, [[1, 4, 1], [1, 0, 2], [2, 0, 1], [1, 0, 1]], 'four of hers in the lock; five of ours spread, the odd one on the bridge; the ship\'s cover by section');
  assert.equal(r.hand, 0);
  assert.deepEqual(r.shown, { kind: 'hold', from: 0, to: 0, n: 0, feint: false }, 'one of ours stands in the lock with them, so they cannot push on (R29)');
  assert.equal(r.read, 'Turn 1 of 8. Boarders: holding where they are.', 'the turn of the cap, and their move');
  assert.equal(r.strip, 'The deck in four sections. The Lock: 1 of ours and 4 of theirs, cover 1, you stand here. The Corridor: 1 of ours, cover 2. The Bridge: 2 of ours, cover 1. The Cargo Bay: 1 of ours, cover 1. Their move: they hold. 4 of their 4 still up; they break at 1.');
  assert.deepEqual(r.labels.slice(0, 2), ['Stand: The Lock', 'Shoot: 2 to 3 of them down']);
  assert.equal(r.labels[r.labels.length - 1], 'Fight');
  assert.ok(r.keep.every(Boolean), 'every choice redraws in place');
  assert.match(r.text, /outer lock is cycling|hits the hull aft/, 'the opening of the lock');
  await page.click('[data-action="choose"][data-arg="0"]');
  assert.equal(await ev(() => G.dialog.choices[0].label), 'Move to: The Corridor', 'the hand\'s place goes round the sections next to it');
  await page.click('[data-action="choose"][data-arg="0"]');
  assert.equal(await ev(() => G.dialog.choices[0].label), 'Move to: The Cargo Bay');
  await page.click('[data-action="choose"][data-arg="0"]');
  assert.equal(await ev(() => G.dialog.choices[0].label), 'Stand: The Lock');
  await page.click('[data-action="choose"][data-arg="1"]');
  assert.equal(await ev(() => G.dialog.choices[1].label), 'Pick off a runner: one of them down if it works');
  await page.click('[data-action="choose"][data-arg="1"]');
  assert.equal(await ev(() => G.dialog.choices[1].label), 'Covering burst: two points of cover here, once a fight');
  const fight = await ev(() => G.dialog.choices.length - 1);
  await page.click(`[data-action="choose"][data-arg="${fight}"]`);
  const t = await ev(() => { const s = G.dialog.event.fight; return { result: !!document.querySelector('#event-result'), turn: s.state.turn, last: s.state.log[s.state.log.length - 1], used: s.state.used.cover, acts: G.dialog.choices[1].label }; });
  assert.equal(t.result, false, 'no result page between turns'); assert.equal(t.turn, 1);
  assert.match(t.last, /^Turn 1: /, t.last);
  assert.equal(t.used, true, 'the cover is spent'); assert.equal(t.acts, 'Shoot: 2 to 3 of them down', 'and the act goes back to the sidearm');
  await done();
});

test('a veteran\'s shown move is marked may feint', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const out = {};
    for (const grade of [0, 1, 2]) {
      fightGame('gunner'); const foe = makeEnemy({ kind: 'pirate' });
      rolls([0.99]); const e = deckFightEvent(repelStart({ foe, foeHp: 0, init: 'foe', grade }, 'full'));
      out[grade] = { read: e.read, strip: /may feint/.test(e.board) };
    }
    return out;
  });
  assert.equal(r[0].read, 'Turn 1 of 8. Boarders: holding where they are.'); assert.equal(r[0].strip, false);
  for (const g of [1, 2]) { assert.match(r[g].read, / They may feint\.$/, `grade ${g}`); assert.equal(r[g].strip, true, `grade ${g}: on the strip`); }
  await done();
});

test('repelled, taken, and an assault won or lost each settle through the existing outcomes', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const out = {};
    const play = (s, set) => {  // the state set by hand, their move a hold, and Fight with nothing rolling for us
      set(s.state); s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };
      const real = Math.random; rolls([]); const ev0 = deckFightEvent(s); const ret = ev0.choices[ev0.choices.length - 1].run(); Math.random = real;
      const close = G.nextEvent; G.nextEvent = null;
      const down = close && close.choices[0]; const after = down && down.run();
      return { ret, title: close && close.title, text: close && close.text, labels: close && close.choices.map(c => c.label), after, then: G.nextEvent && G.nextEvent.title };
    };
    // repelled: one of three left, in the lock, against two of ours
    let st = fightGame('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion;
    let s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    out.repelled = { ...play(s, f => { f.sections.forEach(x => { x.theirs = 0; }); f.sections[0].theirs = 1; }), opinion: cap.opinion - op };
    // taken: three of them on the bridge and none of ours there
    st = fightGame('gunner'); h = hired(); h.fund = 1000; cap = person(h.captain); op = cap.opinion;
    s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    out.taken = { ...play(s, f => { f.sections.forEach(x => { x.theirs = 0; }); f.sections[2].theirs = 3; f.sections[2].mine = 0; }), fund: h.fund, opinion: cap.opinion - op };
    // an assault won: ours on her bridge, and hers gone from it
    st = fightGame('gunner'); h = hired(); let fund = h.fund; const foe = makeEnemy({ kind: 'pirate' });
    s = assaultStart(foe);
    out.won = { ...play(s, f => { f.sections.forEach(x => { x.theirs = x === f.sections[0] ? 0 : x.theirs; }); f.sections[2].theirs = 0; f.sections[2].mine = 2; f.sections[0].mine = 1; }), fundUp: h.fund > fund, dead: !!foe.dead };
    // an assault lost: none of ours left standing
    st = fightGame('gunner'); const armor = st.armor; const foe2 = makeEnemy({ kind: 'pirate' });
    s = assaultStart(foe2);
    out.lost = { ...play(s, f => { f.sections.forEach(x => { x.mine = 0; }); }), armorDown: st.armor < armor, drifting: !foe2.dead };
    return out;
  });
  assert.equal(r.repelled.ret, null); assert.equal(r.repelled.title, 'The Lock', 'the close is shown on the panel');
  assert.match(r.repelled.text, /The last of them go back through the lock/); assert.equal(r.repelled.opinion, 1, 'the captain remembers it');
  assert.deepEqual(r.repelled.labels, ['Stand down']); assert.equal(r.repelled.after, null);
  assert.match(r.taken.text, /They're on the bridge\. Captain Vance gives them the code to the strongbox/); assert.equal(r.taken.fund, 700); assert.equal(r.taken.opinion, -1);
  assert.match(r.won.text, /Her captain puts the weapon down\. Her strongbox/); assert.ok(r.won.fundUp && r.won.dead);
  assert.match(r.lost.text, /You're driven back to the lock/); assert.ok(r.lost.armorDown && r.lost.drifting);
  await done();
});

// ---------- the final review's fixes (#786) ----------

test('in a pack fight, a shot at her hull or her lock goes to the ship still in it, not to the one crippled', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const part of ['hull', 'lock']) {
      fightGame('gunner'); window.rateFoe = s => { s.grade = 0; s.pack = true; return s; };
      const s = battle(), [lead, consort] = s.state.foes;
      lead.parts.weapons.hp = 0; lead.parts.drive.hp = 0;  // the lead is crippled: out of the fight, with her armor left
      const was = [lead.shields + lead.armor + lead.parts.lock.hp, consort.shields + consort.armor + consort.parts.lock.hp];
      s.shown = { foe: [{ kind: 'hold' }, { kind: 'hold' }], captain: { kind: 'hold' } };
      fireTurn(s, { guns: [{ foe: 0, part }], torp: null, pdc: 'fire' });
      const [a, b] = s.state.foes;
      out[part] = { lead: a.shields + a.armor + a.parts.lock.hp - was[0], consort: b.shields + b.armor + b.parts.lock.hp - was[1], line: s.state.log[s.state.log.length - 1] };
    }
    return out;
  });
  for (const part of ['hull', 'lock']) {
    assert.equal(r[part].lead, 0, `${part}: the crippled lead is not hit`);
    assert.ok(r[part].consort < 0, `${part}: the consort is: ${JSON.stringify(r[part])}`);
    assert.match(r[part].line, new RegExp(`you hit her consort's ${part} for \\d+`), r[part].line);
  }
  await done();
});

test('a head start that hurts the hand bills the clinic to the hand\'s own credits, not the ship\'s fund', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const st = fightGame('gunner'), h = hired();
    st.crew = st.crew.filter(id => person(id).role !== 'medic'); delete h.hurtUntil;
    h.fund = 10000; st.credits = 5000;
    const real = headStart;
    headStart = state => { const s2 = JSON.parse(JSON.stringify(state)); s2.me.shields = 0; s2.me.armor -= 100; return { state: s2, events: [{ who: 'foe', foe: 0, part: 'hull', dmg: 100 }] }; };  // a heavy first volley
    rolls([0.99, 0.99, 0.01, 0.99]);  // the run fails, no casualty, the hand's own roll, and no death
    try { hiredFunds(() => startDuel({ kind: 'pirate' }, true)); } finally { headStart = real; }
    return { fund: h.fund, credits: st.credits, hurt: handHurt() };
  });
  assert.equal(r.hurt, true, 'the hand is hurt');
  assert.equal(r.fund, 10000, 'the fund is the ship\'s'); assert.equal(r.credits, 3500, 'the clinic is 1,500 cr of the hand\'s own');
  await done();
});

test('in the deck fight, a friend takes the first hit meant for the hand', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const st = fightGame('gunner'), h = hired(); delete h.hurtUntil;
    for (const id of st.crew) { person(id).opinion = 0; delete person(id).owes; }
    const friend = person(st.crew[0]); friend.opinion = OPINION.FRIEND;
    const s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    const real = resolveDeckTurn;
    resolveDeckTurn = st0 => { const state = JSON.parse(JSON.stringify(st0)); state.turn++; return { state, events: [{ kind: 'hurt', hurt: true }] }; };
    rolls([0.99]);  // the friend is hurt, not killed
    try { const e = deckFightEvent(s); e.choices[e.choices.length - 1].run(); } finally { resolveDeckTurn = real; }
    return { line: s.state.log[s.state.log.length - 1], youHurt: handHurt(), first: friend.first, friendHurt: s.hurt.has(friend.id) };
  });
  assert.match(r.line, new RegExp(`${r.first} pulls you down behind the closer and takes it\\. ${r.first} is hurt`), r.line);
  assert.equal(r.youHurt, false); assert.equal(r.friendHurt, true);
  await done();
});

test('a shot where none of them stand says so, as a steady one does', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    fightGame('gunner');
    const s = repelStart({ foe: makeEnemy({ kind: 'pirate' }), foeHp: 0, init: 'foe' }, 'full');
    s.state.hand = 2; s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };  // the hand on the bridge, and all of them in the lock
    rolls([]); const e = deckFightEvent(s, { act: 'shoot' }); e.choices[e.choices.length - 1].run();
    return s.state.log[s.state.log.length - 1];
  });
  assert.match(r, /None of them are where you stand\./, r);
  await done();
});

test('the tester panel drops a hired hand into each kind of fight, early and late in the chapter (js/uat.js)', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    const out = {}, item = id => UAT_ITEMS.find(i => i.id === id);
    const now = () => { const e = G.dialog && G.dialog.event; return e && e.fight ? e.fight : null; };
    for (const id of ['fight-raider', 'fight-pack', 'fight-veteran', 'fight-patrol']) {
      item(id).setup(); const f = now();
      out[id] = { title: G.dialog.event.title, kind: f && f.state.kind, foes: f && f.state.foes.length, ship: f && f.foe.shipId, grade: f && f.grade, patrol: f && f.spec.kind === 'patrol', torp: G.dialog.choices.some(c => /orpedo/.test(c.label)), post: hired().post };
    }
    item('deck-repel').setup(); out.repel = { kind: now() && now().state.kind, assault: now() && now().state.assault, grade: now() && now().state.grade };
    item('deck-assault').setup(); out.dead = G.dialog.event.title; const n = /(\d+) of yours against (\d+) of hers/.exec(G.dialog.event.text);
    chooseEvent(G.dialog.choices.findIndex(c => /Board/.test(c.label))); const e = G.nextEvent; G.nextEvent = null; openEvent(e);
    out.assault = { kind: now().state.kind, assault: now().state.assault, stated: n && Number(n[2]), began: now().state.began };
    // Late in the chapter: the same fights a grade harder, with the gunner at the top, the guns boresighted, the keys carried, and friends aboard.
    item('late-fight-raider').setup(); out.late = { grade: now().grade, skill: now().state.me.skill, level: skillLevel('gunner'), sighted: boresighted(), kit: career().kit.slice(), friends: G.state.crew.map(person).every(p => p.opinion >= OPINION.FRIEND) };
    item('late-deck-repel').setup(); out.lateRepel = now().state.grade;
    out.lateIds = UAT_ITEMS.filter(i => i.group === 'Turn-based fights, late chapter').map(i => i.id);
    return out;
  });
  for (const id of ['fight-raider', 'fight-pack', 'fight-veteran', 'fight-patrol']) { assert.equal(r[id].title, 'Battle Stations', id); assert.equal(r[id].kind, 'ship', id); assert.equal(r[id].post, 'gunner', id); }
  assert.deepEqual([r['fight-raider'].ship, r['fight-raider'].foes], ['raider', 1]);
  assert.equal(r['fight-pack'].foes, 2, 'two raiders in company');
  assert.deepEqual([r['fight-veteran'].ship, r['fight-veteran'].grade, r['fight-veteran'].torp], ['corsair', 2, true]);
  assert.ok(r['fight-patrol'].patrol);
  assert.deepEqual(r.repel, { kind: 'deck', assault: false, grade: 1 });
  assert.equal(r.dead, 'Dead in Space');
  assert.deepEqual([r.assault.kind, r.assault.assault], ['deck', true]); assert.equal(r.assault.stated, r.assault.began, 'the count she states is the fight that opens');
  assert.deepEqual(r.late, { grade: 1, skill: 4, level: 3, sighted: true, kit: ['valve-keys'], friends: true }, 'the late hand: level 3 and boresighted (skill 4 in the fight), the keys, friends aboard, and a raider a grade better');
  assert.equal(r.lateRepel, 2);
  assert.deepEqual(r.lateIds, ['late-fight-raider', 'late-fight-pack', 'late-fight-veteran', 'late-fight-patrol', 'late-deck-repel', 'late-deck-assault']);
  await done();
});
