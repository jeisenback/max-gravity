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
  assert.match(r.read, /^The Pirate "[^"]+": closing, and firing at your hull as she comes, 6 to 14 damage\. Captain Vance: holding the range\.$/, r.read);
  assert.equal(r.band, 'long', 'a raider is met at forty kilometers');
  assert.equal(r.guns, 2, 'the hauler\'s gun and the turret'); assert.equal(r.ready, 2);
  assert.deepEqual(r.labels.map(l => l.replace(/\d+ to \d+ damage/, 'N to M damage')), ['Gun 1: aim at her weapons, N to M damage', 'Gun 1: normal charge', 'Gun 2: aim at her weapons, N to M damage', 'Gun 2: normal charge', 'Torpedo, 2 left: hold fire', 'Turret: fire with the guns', 'Fire: heat 2 of 4']);
  assert.deepEqual(r.keep, [true, true, true, true, true, true, true], 'every order and Fire redraw in place');
  assert.ok(r.board, 'the sensor board'); assert.match(r.bars, /^You: shields 81 of 81, armor 117 of 117, weapons 126 of 126, drive 34 of 34, lock 7 of 7, heat 0 of 4\. Her: shields 32 of 32, armor 27 of 27, weapons 63 of 63, drive 34 of 34, lock 7 of 7\.$/, r.bars);
  assert.match(r.text, /raider|plume|forty kilometers/i, 'the opening line is the first line of the log');
  await done();
});

test('setting a gun\'s target redraws in place; Fire resolves a turn and the log gains a line', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { fightGame('gunner'); battle(); });
  await page.click('[data-action="choose"][data-arg="0"]');
  const a = await ev(() => ({ result: !!document.querySelector('#event-result'), label: G.dialog.choices[0].label, title: G.dialog.event.title, turn: G.dialog.event.fight.state.turn }));
  assert.deepEqual(a, { result: false, label: 'Gun 1: aim at her drive, 2 to 3 damage', title: 'Battle Stations', turn: 0 });
  for (let i = 0; i < 4; i++) await page.click('[data-action="choose"][data-arg="0"]');
  assert.equal(await ev(() => G.dialog.choices[0].label), 'Gun 1: aim at her weapons, 7 to 11 damage', 'the targets go round: drive, lock, hull, hold, weapons');
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
  assert.ok(r.ahead.weapons < 63 && r.ahead.hull === r.ahead.full, `ours first, at her weapons: ${JSON.stringify(r.ahead)}`);
  assert.match(r.ahead.last, /^You fire first: you hit her weapons for \d+, you hit her weapons for \d+\.$/); assert.equal(r.ahead.band, 'long', 'fifty kilometers'); assert.equal(r.ahead.turn, 0, 'the free volley is not a turn');
  assert.ok(r.behind.weapons === 63 && r.behind.hull < r.behind.full, `hers first, at our hull: ${JSON.stringify(r.behind)}`);
  assert.match(r.behind.last, /^She fires first: she hits your hull for \d+\.$/); assert.equal(r.behind.band, 'mid', 'thirty kilometers');
  assert.ok(r.even.weapons === 63 && r.even.hull === r.even.full, 'no head start, no volley'); assert.equal(r.even.band, 'long');
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
  assert.deepEqual(r, { refused: null, mode: 'landed', dialog: ['Hull Damage', false], next: ['The Old Days', false], armor: 40, fight: 'Battle Stations', me: 18 }, 'the landing\'s own scenes, and no fight; a fight after it starts from the hull the save kept (40, at FIGHT.POOL 0.45)');
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
  assert.deepEqual(r.heads, [[1, 2, 1], [1, 0, 2], [2, 0, 1], [1, 0, 1]], 'two of the four in the lock (the other two are the wave); five of ours spread, the odd one on the bridge; the ship\'s cover by section');
  assert.equal(r.hand, 0);
  assert.deepEqual(r.shown, { kind: 'hold', from: 0, to: 0, n: 0, feint: false }, 'one of ours stands in the lock with them, so they cannot push on (R29)');
  assert.equal(r.read, 'Turn 1 of 8. Boarders: holding where they are.', 'the turn of the cap, and their move');
  assert.equal(r.strip, 'The deck in four sections. The Lock: 1 of ours and 2 of theirs, cover 1, you stand here. The Corridor: 1 of ours, cover 2. The Bridge: 2 of ours, cover 1. The Cargo Bay: 1 of ours, cover 1. Their move: they hold. 2 of their 4 still up; they break at 1. 2 more at the lock next turn.');
  assert.deepEqual(r.labels.slice(0, 2), ['Stand: The Lock', 'Shoot: 1 to 2 of them hit'], 'a new hand works at level 0');
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
  assert.equal(t.used, true, 'the cover is spent'); assert.equal(t.acts, 'Shoot: 1 to 2 of them hit', 'and the act goes back to the sidearm');
  await done();
});

test('the panel words a raider\'s rush, the second wave at the lock until it lands, and the hatch by section', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const out = {};
    fightGame('gunner'); let s = boarded();
    out.wave = { before: /more at the lock next turn/.test(document.querySelector('#panel .event-body svg.board').outerHTML), n: pendingWave(s.state) };
    rolls([]); const turned = G.dialog.choices[G.dialog.choices.length - 1].run();
    out.wave.after = /more at the lock next turn/.test(turned.board); out.wave.log = s.state.log[0];
    fightGame('gunner'); s = boarded(); const f = s.state;  // none of ours in the lock or the corridor, the hand on the bridge: they rush through the corridor
    f.party = 'raider'; f.wave = null; f.hand = 2; f.sections[0].mine = 0; f.sections[1].mine = 0; f.sections[0].theirs = 3; s.shown = null;
    const e = deckFightEvent(s); out.read = e.read; out.arrow = /<path class="move"/.test(e.board);
    rolls([]); e.choices[e.choices.length - 1].run(); out.rushLog = s.state.log[0];
    fightGame('gunner'); const st = G.state; st.crew = []; const bo = makePerson('earth'); Object.assign(bo, { first: 'Bo', role: 'pilot', skill: 1, opinion: 30 }); registerPerson(bo); st.crew.push(bo.id);
    s = boarded(); out.plain = deckFightEvent(s, { act: 'cover', order: bo.id }).choices.map(c => c.label);  // with the cover spent, the pilot is given the steady one: the hatch
    const hatch = deckFightEvent(s, { act: 'cover', order: bo.id }), i = hatch.choices.findIndex(c => c.label.startsWith('At '));
    out.at = [hatch.choices[i].label, hatch.choices[i].keep]; out.next = hatch.choices[i].run().choices[i].label;
    out.cover = deckFightEvent(s, { act: 'steady', order: bo.id }).choices.map(c => c.label).filter(l => l.startsWith('At '));
    out.none = deckFightEvent(s, { act: 'steady' }).choices.map(c => c.label).filter(l => l.startsWith('At '));
    return out;
  });
  assert.equal(r.wave.before, true, 'the lock fight shows the rest coming'); assert.ok(r.wave.n >= 1);
  assert.equal(r.wave.after, false, 'and not once they have landed'); assert.match(r.wave.log, /more come through the lock/);
  assert.match(r.read, /^Turn 1 of 8\. Boarders: \d+ rushing through the Corridor into the Bridge\.$/); assert.ok(r.arrow, 'the arrow is drawn');
  assert.match(r.rushLog, /3 of them rush into the Bridge/);
  assert.equal(r.at[0], 'At the Bridge', 'where the hand stands, a crew of one holding the bridge'); assert.equal(r.at[1], true); assert.equal(r.next, 'At the Cargo Bay', 'the section goes round the deck');
  assert.deepEqual(r.cover, [], 'an order that is not a hatch has no place'); assert.deepEqual(r.none, [], 'nor does none');
  await done();
});

test('from level 2 the shot is aimed: the shoot choice offers a section, and the turn shoots there', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const out = {}, ats = e => e.choices.map(c => c.label).filter(l => l.startsWith('At '));
    fightGame('gunner'); let s = boarded(); s.state.level = 2; s.state.sections.forEach(x => { x.theirs = 0; }); s.state.sections[0].theirs = 3; s.state.sections[1].theirs = 3; s.state.hand = 0; s.state.wave = null; s.shown = { kind: 'hold', from: 0, to: 0, n: 0 };
    let e = deckFightEvent(s); out.two = ats(e); const i = e.choices.findIndex(c => c.label.startsWith('At ')); out.next = ats(e.choices[i].run());
    s.state.sections.forEach(x => { x.mine = 0; }); s.state.sections[0].mine = 1;
    rolls(Array(40).fill(0)); const turned = deckFightEvent(s, { shootAt: 1 }).choices.at(-1).run(); out.hit = [s.state.sections[0].theirs, s.state.sections[1].theirs];
    fightGame('gunner'); s = boarded(); s.state.level = 1; out.one = ats(deckFightEvent(s));
    return out;
  });
  assert.equal(r.two.length, 1, 'level 2 offers the shot a section'); assert.match(r.two[0], /^At the Lock$/); assert.match(r.next[0], /^At the Corridor$/, 'and the choice goes to the one next to the hand');
  assert.deepEqual(r.hit, [3, 2], 'the shot went to the corridor: two heads of it, one wounded and then downed'); assert.deepEqual(r.one, [], 'level 1 has no aim');
  await done();
});

test('a hurt hand works the level below: the sidearm on the panel is that level\'s', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(deckHelpers);
  const r = await ev(() => {
    const out = {};
    fightGame('gunner'); hired().skill.gunner = 110; out.well = [lockPost(), boarded().state.level, G.dialog.choices[1].label];
    fightGame('gunner'); hired().skill.gunner = 110; career().hurtUntil = G.state.day + 5; out.hurt = [boarded().state.level, G.dialog.choices[1].label];
    return out;
  });
  assert.deepEqual(r.well, ['gunner', 3, 'Shoot: 3 to 4 of them hit']); assert.deepEqual(r.hurt, [2, 'Shoot: 2 to 3 of them hit']);
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
    out.repelled = { ...play(s, f => { f.sections.forEach(x => { x.theirs = 0; }); f.sections[0].theirs = 1; f.wave = null; }), opinion: cap.opinion - op };
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

// ---------- the rework's orders and ends (docs/superpowers/specs/2026-10-21-ship-fight-rework-design.md) ----------

test('against a corsair the panel offers her launcher as a target, and her arming is shown above the board', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    fightGame('gunner', 'corsair'); const s = battle();
    const first = G.dialog.choices.map(c => c.label);
    s.shown = { foe: [{ kind: 'arm', n: 2 }], captain: { kind: 'hold' } }; openEvent(shipFightEvent(s, { guns: [{ foe: 0, part: 'lock' }, null], torp: null, pdc: 'fire' }));
    const arming = G.dialog.event.read;
    openEvent(chooseEvent(0)); const afterLock = G.dialog.choices[0].label;  // gun 1: lock to launcher
    s.shown = { foe: [{ kind: 'salvo', target: 'hull', n: 2, dmg: [60, 90] }], captain: { kind: 'hold' } }; openEvent(shipFightEvent(s, { guns: [null, null], torp: null, pdc: 'fire' }));
    const salvo = G.dialog.event.read;
    const bars = document.querySelector('svg.bars').getAttribute('aria-label');
    fightGame('gunner', 'raider'); const t = battle();
    const reach = []; let o = { foe: 0, part: 'lock' };
    openEvent(shipFightEvent(t, { guns: [o, null], torp: null, pdc: 'fire' })); openEvent(chooseEvent(0)); reach.push(G.dialog.choices[0].label);
    return { first, arming, afterLock, salvo, bars, reach };
  });
  assert.match(r.arming, /is loading torpedoes: 2 next turn\./, r.arming);
  assert.match(r.afterLock, /^Gun 1: aim at her launcher, \d+ to \d+ damage$/, 'after the lock comes her launcher');
  assert.match(r.salvo, /fires a salvo of 2 at your hull, 60 to 90\./, r.salvo);
  assert.match(r.bars, /launcher 10 of 10/, 'her launcher has its bar');
  assert.match(r.reach[0], /aim at her hull/, 'a raider has no launcher to offer: after the lock comes the hull');
  await done();
});

test('a gun can be overcharged and the Fire label counts the heat it adds', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    fightGame('gunner'); battle();
    const labels = () => G.dialog.choices.map(c => c.label);
    const before = labels();
    openEvent(chooseEvent(1));  // gun 1: overcharge on
    const on = labels();
    openEvent(chooseEvent(0));  // the target goes round, the charge stays
    const kept = labels();
    return { before, on, kept };
  });
  assert.match(r.before[0], /^Gun 1: aim at her weapons, \d+ to \d+ damage$/); assert.match(r.before[2], /^Gun 2: aim at her weapons, \d+ to \d+ damage$/); assert.equal(r.before[3], 'Gun 2: normal charge');
  assert.equal(r.before[1], 'Gun 1: normal charge'); assert.equal(r.before[r.before.length - 1], 'Fire: heat 2 of 4');
  assert.equal(r.on[1], 'Gun 1: overcharged, heat 2'); assert.equal(r.on[r.on.length - 1], 'Fire: heat 3 of 4', 'one gun overcharged adds one more heat than a plain shot');
  assert.equal(r.kept[1], 'Gun 1: overcharged, heat 2'); assert.match(r.kept[0], /aim at her drive/); assert.equal(r.kept[r.kept.length - 1], 'Fire: heat 3 of 4');
  await done();
});

test('a gun aimed at the launcher lands on the hull of a ship that has none', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    fightGame('gunner'); window.rateFoe = s => { s.grade = 0; s.pack = true; return s; };
    const s = battle(), [lead, consort] = s.state.foes, was = [lead.shields + lead.armor, consort.shields + consort.armor];
    s.shown = { foe: [{ kind: 'hold' }, { kind: 'hold' }], captain: { kind: 'hold' } };
    let threw = null;
    try { fireTurn(s, { guns: [{ foe: 0, part: 'launcher' }], torp: null, pdc: 'fire' }); } catch (e) { threw = String(e); }
    const [a, b] = s.state.foes;
    return { threw, lead: a.shields + a.armor - was[0], consort: b.shields + b.armor - was[1], last: s.state.log[s.state.log.length - 1], launcher: !!a.parts.launcher };
  });
  assert.equal(r.threw, null); assert.equal(r.launcher, false);
  assert.ok(r.lead < 0, `the lead's hull is hit: ${JSON.stringify(r)}`); assert.equal(r.consort, 0);
  assert.match(r.last, /you hit her hull for \d+/, r.last);
  await done();
});

test('with no torpedoes and no fund to restock, the torpedo order is not offered and the turret still is', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); st.torpedoes = 0; hired().fund = 0;
    battle(); return G.dialog.choices.map(c => c.label);
  });
  assert.ok(!r.some(l => l.startsWith('Torpedo')), r.join('|')); assert.ok(r.includes('Turret: fire with the guns'), r.join('|'));
  await done();
});

test('a save from before the fitting fights with one gun and Fire', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); delete st.outfits.pdc; delete st.outfits.launcher;
    battle(); return G.dialog.choices.map(c => c.label);
  });
  assert.equal(r.filter(l => l.startsWith('Gun')).map(l => l.slice(0, 5)).filter((l, i, a) => a.indexOf(l) === i).join(), 'Gun 1', 'one gun (and its charge toggle)');
  assert.ok(!r.some(l => /^(Torpedo|Turret)/.test(l)), r.join('|')); assert.match(r[r.length - 1], /^Fire/);
  await done();
});

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
    h.run = { contract: true, shipper: 'the Compact Freight Office', good: 'water', tons: 30, from: 'X', planet: here.name, sid: st.systemId, pay: 90000, day: st.day - 6, days: 6, due: st.day + 5, cost: 0, profit: 90000 };
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
    h.run = { contract: true, shipper: 'the Compact Freight Office', good: 'water', tons: 10, from: 'X', planet: here.name, sid: st.systemId, pay: 30000, day: st.day - 6, days: 6, due: st.day + 5, cost: 0, profit: 30000 };
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

test('armor lost in a fight comes back to the ship at full scale, and a fight never repairs it', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = [];
    for (const less of [0, 11, -3]) {  // whole, an odd amount down (its scaled armor rounds up), and at 3
      const st = fightGame('gunner'), real = less < 0 ? -less : ship().armor - less; st.armor = real;
      const s = battle(), me = s.state.me, start = me.armor, row = { real, start, max: me.maxArmor, ship: ship().armor, pool: FIGHT.POOL };
      row.atStart = st.armor;
      fightTook(s, []); row.unhurt = st.armor;
      me.armor = Math.max(0, start - 7); fightTook(s, []); row.after7 = st.armor;
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
    assert.equal(x.after7, Math.max(1, x.real - Math.round(Math.min(7, x.start) / x.pool)), `seven fight armor lost is 7 / POOL real: ${JSON.stringify(x)}`);
    assert.equal(x.atZero, 1, 'and it never goes under 1');
  }
  await done();
});

test('a ship at real armor 1 starts the fight at 1, and the first Fire does not end it lost', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = fightGame('gunner'); st.armor = 1;
    const s = battle(), start = s.state.me.armor;
    s.shown = { foe: [{ kind: 'hold' }], captain: { kind: 'hold' } };  // she does not shoot this turn
    const real = Math.random; Math.random = () => 0.99;
    const ret = chooseEvent(choiceAt('Fire')); Math.random = real;
    return { start, ret, end: shipEnd(s.state), armor: st.armor, over: G.nextEvent && G.nextEvent.title };
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
    const s = battle(); s.state.me.armor -= 10; fightTook(s, []);
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

// ---------- the gunner moves on the panel (docs/superpowers/specs/2026-10-23-gunner-moves-design.md, section 3) ----------

test('a known move shows on the panel, applies on Fire, and shows spent after', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    fightGame('gunner'); hired().moves = ['vent'];
    const s = battle(); s.state.locked = [0]; s.state.heat = 3; s.shown = { foe: [{ kind: 'broadside', target: 'hull', dmg: [1, 2] }], captain: { kind: 'hold' } };
    openEvent(shipFightEvent(s, { guns: [{ foe: 0, part: 'weapons' }, { foe: 0, part: 'weapons' }], torp: null, pdc: 'fire' }));
    const labels = () => G.dialog.choices.map(c => c.label), at = () => G.dialog.choices.findIndex(c => c.label.includes('Vent the guns'));
    const before = labels();
    openEvent(chooseEvent(at()));  // order it
    const ordered = labels(), fire = G.dialog.choices.length - 1;
    const shotsReady = gunsReady(s.state);
    openEvent(chooseEvent(fire));
    const after = labels(), log = s.state.log[s.state.log.length - 1], spent = G.dialog.choices[at()];
    return { before, ordered, after, log, known: s.known, state: s.state.spent, heat: s.state.heat, locked: s.state.locked, shotsReady, spentOff: !!(spent.can && !spent.can()) };
  });
  assert.deepEqual(r.known, ['vent']);
  assert.match(r.before.find(l => l.startsWith('Vent the guns')), /^Vent the guns: heat 3 to 0, locks off/);
  assert.match(r.ordered.find(l => l.includes('Vent the guns')), /^Vent the guns.*\(ordered\)$/);
  assert.equal(r.shotsReady, 1, 'a gun was locked');
  assert.deepEqual(r.state, ['vent']);
  assert.match(r.log, /you vent the guns/);
  assert.equal(r.locked.length, 0); assert.ok(r.heat <= 2, 'the heat of the two shots only');
  assert.ok(r.after.includes('Vent the guns: spent')); assert.equal(r.spentOff, true, 'a spent move is greyed');
  await done();
});

test('no move is offered to a hand who knows none, to a non-gunner, or on a save without moves', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const offered = (post, moves) => {
      fightGame(post); if (moves) hired().moves = moves; else delete hired().moves;
      const s = battle(); s.state.heat = 3; s.state.locked = [0]; s.shown = { foe: [{ kind: 'broadside', target: 'hull', dmg: [1, 2] }], captain: { kind: 'hold' } };
      let threw = null; try { openEvent(shipFightEvent(s, { guns: [{ foe: 0, part: 'drive' }, null], torp: null, pdc: 'hold' })); } catch (e) { threw = String(e); }
      return { threw, known: s.known, moves: G.dialog.choices.map(c => c.label).filter(l => /Vent|Lead|Split/.test(l)) };
    };
    return { none: offered('gunner', []), nonGunner: offered('engineer', ['vent', 'lead', 'split']), absent: offered('gunner', null), pure: [knownMoves(null), knownMoves({}), knownMoves({ moves: ['lead'] })] };
  });
  for (const k of ['none', 'nonGunner', 'absent']) { assert.equal(r[k].threw, null, k); assert.deepEqual(r[k].moves, [], k); assert.deepEqual(r[k].known, [], k); }
  assert.deepEqual(r.pure, [[], [], ['lead']]);
  await done();
});

test('lead names a gun, shows its damage with no range penalty, and the turn leads that shot', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    fightGame('gunner'); hired().moves = ['lead', 'split'];
    const s = battle(); s.state.band = RANGE_BANDS.indexOf('long'); s.shown = { foe: [{ kind: 'broadside', target: 'hull', dmg: [1, 2] }], captain: { kind: 'hold' } };
    openEvent(shipFightEvent(s, { guns: [{ foe: 0, part: 'drive' }, { foe: 0, part: 'drive' }], torp: null, pdc: 'fire' }));
    const lead = () => G.dialog.choices.findIndex(c => /Lead the shot/.test(c.label)), label = () => G.dialog.choices[lead()].label;
    const off = label(), plain = shotRange(s.state, { foe: 0, part: 'drive' }), led = shotRange(s.state, { foe: 0, part: 'drive' }, true);
    openEvent(chooseEvent(lead())); const one = label();
    openEvent(chooseEvent(lead())); const two = label();
    openEvent(chooseEvent(lead())); const back = label();
    openEvent(shipFightEvent(s, { guns: [{ foe: 0, part: 'drive' }, { foe: 0, part: 'drive' }], torp: null, pdc: 'hold' }));
    const split = G.dialog.choices.find(c => /Split the turret/.test(c.label)).label;
    return { off, one, two, back, plain, led, split };
  });
  assert.match(r.off, /^Lead the shot: name a gun/);
  assert.ok(r.led[1] > r.plain[1], 'at long range the aimed shot is hit by the range penalty');
  assert.equal(r.one, `Lead the shot, gun 1: ${r.led[0]} to ${r.led[1]} damage with no range penalty, once a fight (ordered)`);
  assert.match(r.two, /^Lead the shot, gun 2: .*\(ordered\)$/);
  assert.equal(r.back, r.off, 'the toggle goes round to none');
  assert.match(r.split, /^Split the turret: /);
  await done();
});

test('lead is idle where there is no range penalty, the led gun shows the led range, and a retargeted gun is not shown as led', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    fightGame('gunner'); hired().moves = ['lead'];
    const s = battle(); s.shown = { foe: [{ kind: 'broadside', target: 'hull', dmg: [1, 2] }], captain: { kind: 'hold' } };
    const labels = orders => { openEvent(shipFightEvent(s, orders)); return G.dialog.choices.map(c => c.label); };
    const drive = { foe: 0, part: 'drive' }, two = { guns: [drive, drive], torp: null, pdc: 'fire' };
    s.state.band = RANGE_BANDS.indexOf('close');
    const close = labels({ ...two, move: 'lead', gun: 0 }).find(l => /Lead the shot/.test(l));
    s.state.band = RANGE_BANDS.indexOf('long');
    const led = shotRange(s.state, drive, true), plain = shotRange(s.state, drive);
    const ordered = labels({ ...two, move: 'lead', gun: 0 });
    const launcher = { foe: 0, part: 'launcher' };
    delete s.state.foes[0].parts.launcher;
    const gone = labels({ guns: [launcher, drive], torp: null, pdc: 'fire', move: 'lead', gun: 0 }).find(l => /Lead the shot/.test(l));
    return { close, led, plain, ordered: ordered.filter(l => /damage/.test(l)), gone };
  });
  assert.match(r.close, /nothing to act on/);
  assert.ok(r.ordered.some(l => l.includes(`${r.led[0]} to ${r.led[1]} damage`) && !/Lead the shot/.test(l)), `the led gun shows the led range: ${JSON.stringify(r.ordered)}`);
  assert.ok(r.ordered.some(l => l.includes(`${r.plain[0]} to ${r.plain[1]} damage`) && !/Lead the shot/.test(l)), 'the other gun keeps its penalty');
  assert.match(r.gone, /^Lead the shot: name a gun/, 'gun 1 still has an aimed shot; gun 0 was retargeted to the hull and is not shown as led');
  assert.doesNotMatch(r.gone, /ordered/);
  await done();
});

test('a hand who buys the ship keeps the moves', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ kept: careerOf({ post: 'gunner', moves: ['vent', 'split'] }).moves, older: careerOf({ post: 'gunner' }).moves }));
  assert.deepEqual(r.kept, ['vent', 'split']);
  assert.deepEqual(r.older, [], 'a save from before has none');
  await done();
});

test('the Fire label counts the heat of a split as the engine does, and a split with no shot to save is greyed', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    fightGame('gunner'); hired().moves = ['split'];
    const s = battle(); s.state.heat = 3; s.shown = { foe: [{ kind: 'broadside', target: 'hull', dmg: [1, 2] }], captain: { kind: 'hold' } };
    const guns = [{ foe: 0, part: 'drive' }, { foe: 0, part: 'drive' }], splitAt = () => G.dialog.choices.findIndex(c => /^Split the turret/.test(c.label));
    openEvent(shipFightEvent(s, { guns, torp: null, pdc: 'hold' }));
    openEvent(chooseEvent(splitAt()));  // ordered
    const label = G.dialog.choices[G.dialog.choices.length - 1].label;
    openEvent(shipFightEvent(s, { guns: [null, null], torp: null, pdc: 'hold', move: 'split' }));
    const idle = G.dialog.choices[splitAt()];
    openEvent(shipFightEvent(s, { guns, torp: null, pdc: 'hold', move: 'split' }));
    openEvent(chooseEvent(G.dialog.choices.length - 1));  // Fire
    return { label, idle: [idle.label, !!(idle.can && !idle.can())], locked: s.state.locked.length, spent: s.state.spent };
  });
  assert.equal(r.label, 'Fire: heat 5 of 4, and a gun locks next turn', 'two shots on top of 3: the turret still fires');
  assert.equal(r.locked, 1, 'and the engine locked the gun');
  assert.deepEqual(r.spent, ['split']);
  assert.deepEqual(r.idle, ['Split the turret: nothing to act on this turn', true]);
  await done();
});
