'use strict';

// The engagements for a hired hand: pirates or a navy patrol make contact, and the hand fights it turn by turn on the sensor board (js/fightui.js) instead
// of the card duel; what comes after it (the crippled ship, the deck fights); the ambush; the Gunner's orders; and the cost notes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser, frames } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.raid = (post = 'gunner', shipId = 'raider') => {
    __seed(1);  // a constant random (rolls, below) hangs the generators, so every game starts from the seeded one
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; hired().raidTold = true;  // the first fight is explained once (below); these are about the fights
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    __seed(2);  // the burn draws a time for each happening, and how many follows its length: the foe is drawn from a seed of its own, so a change to the length does not change the fight these scripted rolls expect
    if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy;
    const spare = window.realMakeEnemy({ kind: 'pirate' });  // made now: the enemy's person cannot be made under a constant random
    window.makeEnemy = () => Object.assign(spare, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor });  // the style of the raider or the corsair
    return st;
  };
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  window.begin = () => { const e = G.nextEvent; G.nextEvent = null; openEvent(e); };  // the first scene; later ones open from finishEvent
  window.choose = (label) => { const i = G.dialog.choices.findIndex(c => c.label.includes(label)); const t = chooseEvent(i); return t; };
  // The fight's own state (fightui.js), and Fire played as the dialog plays a kept choice: the panel again, or on to what the end queued.
  window.fightNow = () => G.dialog.event.fight;
  window.fireOrders = () => { const t = chooseEvent(G.dialog.choices.findIndex(c => c.label.startsWith('Fire'))); if (t) openEvent(t); else finishEvent(); return t; };
  window.shownMoves = (foe, captain = { kind: 'hold' }) => { fightNow().shown = { foe: [foe], captain }; };  // the moves the next Fire plays
};

test('a pirate contact for a hired hand opens the ship fight, not the card duel, and the orders are yours to give', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('pilot'); const text = startDuel({ kind: 'pirate' }, false);
    begin();
    return { text: /Battle stations/.test(text), title: G.dialog.event.title, duel: !!G.duel, decided: !!G.dialog.event.decided, labels: G.dialog.choices.map(c => c.label), board: /^<svg class="board"/.test(G.dialog.event.board) };
  });
  assert.ok(r.text); assert.equal(r.title, 'Battle Stations'); assert.equal(r.duel, false); assert.ok(!r.decided, 'the captain does not take this call');
  assert.deepEqual(r.labels, ['Gun 1: aim at her weapons', 'Fire: heat 1 of 4'], 'a pilot hand still runs the guns: the hauler has one'); assert.ok(r.board);
  await done();
});

test('when she breaks off it costs nothing but a log line and some experience', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), cap = person(hired().captain), op = cap.opinion, xp = skillXp('gunner'), armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    const f = fightNow().state; f.foes.forEach(foe => { foe.shields = 0; foe.armor = 10; });  // badly hurt: she turns to break off, and says so
    fightNow().shown = { foe: f.foes.map((_, i) => foeMove(f, i)), captain: captainMove(f) }; openEvent(shipFightEvent(fightNow(), { guns: [null], torp: null, pdc: 'fire' }));
    const read = G.dialog.event.read;
    const ret = fireOrders(), close = G.dialog.event;
    const out = { read: /turning to break off/.test(read), ret, title: close.title, off: /breaks off/.test(close.text), log: /Captain Vance writes it in the log and nothing else\. \(\+3 experience at the gunner post\.\)$/.test(close.text), opinion: cap.opinion - op, xp: skillXp('gunner') - xp, armor: st.armor === armor };
    out.down = G.dialog.choices.map(c => c.label); chooseEvent(0); finishEvent(); out.after = !!G.dialog;
    return out;
  });
  assert.ok(r.read, 'her move is shown before it is made'); assert.equal(r.ret, null); assert.equal(r.title, 'Battle Stations');
  assert.ok(r.off); assert.ok(r.log); assert.equal(r.opinion, 1); assert.equal(r.xp, 3); assert.ok(r.armor);
  assert.deepEqual(r.down, ['Stand down']); assert.equal(r.after, false, 'and the burn goes on');
  await done();
});

test('played out, the panel goes turn by turn to an end: she closes firing, her guns are shot away, and she breaks off', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('engineer'), h = hired(), cap = person(h.captain), op = cap.opinion, xp = skillXp('engineer'), out = { bands: [], reads: [] };
    startDuel({ kind: 'pirate' }, false); begin();
    while (G.dialog.choices.some(c => c.label.startsWith('Fire'))) { out.bands.push(RANGE_BANDS[fightNow().state.band]); out.reads.push(G.dialog.event.read.replace(/^.*?": /, '')); fireOrders(); }
    out.log = fightNow().state.log.slice(1); out.title = G.dialog.event.title; out.labels = G.dialog.choices.map(c => c.label); out.close = G.dialog.event.text.split('</p><p>').pop();
    out.opinion = cap.opinion - op; out.xp = skillXp('engineer') - xp; out.shields = fightNow().state.me.shields;
    return out;
  });
  assert.deepEqual(r.bands, ['long', 'mid', 'close'], 'she is the faster ship, and closes a band a turn');
  assert.deepEqual(r.reads, ['closing, and firing at your hull as she comes, 19 to 27 damage. Captain Vance: holding the range.', 'closing, and firing at your hull as she comes, 20 to 29 damage. Captain Vance: holding the range.',
    'turning to break off. Captain Vance: holding the range.'], 'her move is shown before it is made, and her volley grows as she closes');
  assert.deepEqual(r.log, ['Turn 1: you hit her weapons for 13, she hits your hull for 27.', 'Turn 2: you hit her weapons for 7.', 'Turn 3: nothing left of the weapons to hit.'], 'her guns go in two shots, and with nothing left to fire she breaks off (the gunner post is crewed here, so the crew gunner\'s level counts, R22)');
  assert.equal(r.title, 'Battle Stations'); assert.deepEqual(r.labels, ['Stand down']);
  assert.match(r.close, /^She breaks off with her grapple arms folded.* Captain Vance writes it in the log and nothing else\. \(\+3 experience at the engineer post\.\)$/);
  assert.deepEqual([r.opinion, r.xp], [1, 3]);
  await done();
});

test('a corsair is a torpedo fight and a raider a grapple fight, in the words and in the boarding', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const shipId of ['raider', 'corsair']) {
      raid('gunner', shipId); startDuel({ kind: 'pirate' }, false); begin();
      out[shipId] = { open: G.dialog.event.text.slice(0, 20) };
      fightNow().state.band = RANGE_BANDS.indexOf('knife'); shownMoves({ kind: 'board' });
      fireOrders();
      const t = G.dialog.event.text;
      out[shipId].boarded = t.includes('your drive is slow') ? 'torpedo' : t.includes('grapples bang on the hull in four places') ? 'grapple' : '';
      out[shipId].boarders = G.dialog.event.fight.state.began; out[shipId].title = G.dialog.event.title;
    }
    return out;
  });
  assert.notEqual(r.raider.open, r.corsair.open);
  assert.equal(r.raider.boarded, 'grapple'); assert.equal(r.corsair.boarded, 'torpedo');
  assert.deepEqual([r.raider.title, r.corsair.title], ['The Lock', 'The Lock'], 'both open the deck fight at the lock');
  assert.equal(r.raider.boarders, r.corsair.boarders + 1, 'a full run for a raider (her two and two more), a short one for a corsair (her three and no more), at the same grade');
  await done();
});

test('burning hard can get clear before there is a fight, and failing costs hull and gives her the first volley', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('pilot'), armor = st.armor, out = {};
    rolls([0.01]); out.clear = startDuel({ kind: 'pirate' }, true); out.none = !G.nextEvent;
    rolls([0.99]); out.text = startDuel({ kind: 'pirate' }, true); out.next = G.nextEvent && G.nextEvent.title; out.hull = armor - st.armor; out.first = /She fires first: she hits your hull for \d+\./.test(G.nextEvent.text);
    return out;
  });
  assert.match(r.clear, /opens the range/); assert.ok(r.none);
  assert.equal(r.next, 'Battle Stations'); assert.equal(r.hull, 21, 'eight percent of the hauler\'s 260'); assert.ok(r.first, 'she has the first volley');
  await done();
});

test('other contacts for a hired hand are still the card duel', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => { raid('gunner'); startDuel({ kind: 'hunter', person: { first: 'Ana', last: 'Voss' } }, false); return { duel: !!G.duel, next: G.nextEvent && G.nextEvent.title }; });
  assert.ok(r.duel); assert.match(r.next, /Contact: exchange/);
  await done();
});

test('crippling her brings her alongside dead in space, and boarding her is the deck fight run the other way: a win takes her strongbox', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion, xp = skillXp('gunner'), fund = h.fund, out = {};
    startDuel({ kind: 'pirate' }, false); begin();
    const f = fightNow().state; f.foes.forEach(foe => { foe.parts.weapons.hp = 0; foe.parts.drive.hp = 0; });  // her guns and her drive are gone
    shownMoves({ kind: 'hold' });
    out.ret = fireOrders(); out.title = G.dialog.event.title; out.crippled = /grapple arms go slack|drive cone splits/.test(G.dialog.event.text); out.labels = G.dialog.choices.map(c => c.label);
    rolls([0.99, 0.99, 0.99]);  // no one is hurt
    choose('Board her'); finishEvent();
    out.first = G.dialog.event.title; out.heads = fightNow().state.began; out.assault = fightNow().state.assault;
    const s = fightNow(); s.state.sections.forEach(x => { x.theirs = 0; }); s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };  // the last of her people down
    out.mid = choose('Fight'); finishEvent();
    out.end = G.dialog.event.text;
    out.taken = /strongbox/.test(out.end); out.fund = h.fund - fund; out.opinion = cap.opinion - op; out.xp = skillXp('gunner') - xp;
    choose('Stand down'); out.next = G.nextEvent;
    return out;
  });
  assert.equal(r.ret, null); assert.equal(r.title, 'Dead in Space'); assert.ok(r.crippled, 'the line that says how'); assert.deepEqual(r.labels, ['Board her', 'Let her drift']);
  assert.equal(r.first, 'Her Lock'); assert.equal(r.assault, true); assert.ok(r.heads >= 3, 'her crew and one more'); assert.equal(r.mid, null, 'the fight ends on the panel');
  assert.ok(r.taken, r.end); assert.ok(r.fund >= 1000 && r.fund <= 3000, `fund ${r.fund}`); assert.equal(r.opinion, 2, 'the strongbox'); assert.equal(r.xp, 5);
  assert.equal(r.next, null);
  await done();
});

test('losing the boarding drives you back to your lock, and she drifts on', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion, fund = h.fund, armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    fightNow().state.foes.forEach(foe => { foe.parts.weapons.hp = 0; foe.parts.drive.hp = 0; }); shownMoves({ kind: 'hold' }); fireOrders();
    rolls([0.99, 0.99, 0.99, 0.99]);
    choose('Board her'); finishEvent();
    const s = fightNow(); s.state.sections.forEach(x => { x.mine = 0; }); s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };  // none of ours left standing
    choose('Fight'); finishEvent();
    const end = G.dialog.event.text; choose('Stand down');
    return { end: /driven back/.test(end), fund: h.fund === fund, opinion: cap.opinion - op, armor: st.armor < armor, next: G.nextEvent };
  });
  assert.ok(r.end); assert.ok(r.fund); assert.equal(r.opinion, -1, 'the boarding lost'); assert.ok(r.armor); assert.equal(r.next, null);
  await done();
});

test('she can be let drift instead: the same as breaking her off', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion, xp = skillXp('gunner');
    startDuel({ kind: 'pirate' }, false); begin();
    fightNow().state.foes.forEach(foe => { foe.parts.weapons.hp = 0; foe.parts.drive.hp = 0; }); shownMoves({ kind: 'hold' }); fireOrders();
    const t = choose('Let her drift');
    return { t: /experience/.test(t), opinion: cap.opinion - op, xp: skillXp('gunner') - xp, next: G.nextEvent };
  });
  assert.ok(r.t); assert.equal(r.opinion, 1, 'she broke off'); assert.equal(r.xp, 3); assert.equal(r.next, null);
  await done();
});

test('a freighter in trouble is offered on a burn through unsettled space, and not again for sixty days', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), t1 = () => Mods.filter('happenings', [], 'transit').filter(c => c.tier === 2).length;
    worldOf(st.systemId).unrest = 0; worldOf(G.transit.to).unrest = 0;
    const calm = ambushDue(), n0 = t1();
    worldOf(G.transit.to).unrest = 0.4;
    const unsettled = ambushDue(), n1 = t1();
    rolls([0.01]); ambushScene();  // made, so the gap starts
    return { calm, unsettled, extra: n1 - n0, again: ambushDue() };
  });
  assert.equal(r.calm, false); assert.equal(r.unsettled, true); assert.equal(r.extra, 1); assert.equal(r.again, false);
  await done();
});

test('answering a trap blind springs it, and she has the first volley', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('pilot'); rolls([0.01]);  // a trap
    const e = ambushScene(); G.dialog = { event: e, choices: e.choices };
    const labels = e.choices.map(c => c.label);
    const t = chooseEvent(e.choices.findIndex(c => c.label === 'Go to her'));
    return { title: e.title, labels, sprung: /lights a drive/.test(t), next: G.nextEvent && G.nextEvent.title, behind: G.nextEvent && /She fires first/.test(G.nextEvent.text), waiting: G.nextEvent && /waiting on the far side/.test(G.nextEvent.text) };
  });
  assert.equal(r.title, 'A Freighter in Trouble'); assert.deepEqual(r.labels, ['Go to her', 'Leave it', '[Pilot] Match her tumble']);
  assert.ok(r.sprung); assert.equal(r.next, 'Battle Stations'); assert.ok(r.behind && r.waiting);
  await done();
});

test('a good read shows you the trap, and you can hit them first or turn away', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), cap = person(hired().captain), op = cap.opinion, xp = skillXp('gunner'), out = {};
    rolls([0.01, 0.01]);  // a trap, and the read works
    const e = ambushScene(); G.dialog = { event: e, choices: e.choices };
    const t = chooseEvent(e.choices.findIndex(c => /Scan her hull/.test(c.label)));
    out.read = /gun housing/.test(t); finishEvent();
    out.labels = G.dialog.event.choices.map(c => c.label);
    const hit = chooseEvent(out.labels.indexOf("Hit them before they're ready")); out.hit = /not ready/.test(hit); finishEvent();
    out.ahead = /You fire first: you hit her weapons for \d+\./.test(G.dialog.event.text);
    return out;
  });
  assert.ok(r.read); assert.deepEqual(r.labels, ["Hit them before they're ready", 'Turn away and leave it']); assert.ok(r.hit && r.ahead);
  await done();
});

test('turning away from a trap you read earns the captain\'s regard and some experience; a real call pays, and leaving it costs', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), out = {};
    let op = cap.opinion, xp = skillXp('gunner');
    rolls([0.01, 0.01]);
    let e = ambushScene(); G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /Scan her hull/.test(c.label))); finishEvent();
    const away = chooseEvent(G.dialog.choices.findIndex(c => /Turn away/.test(c.label)));
    out.away = /burn for the lane/.test(away); out.awayOp = cap.opinion - op; out.xp = skillXp('gunner') - xp;
    st.ambushAt = -1000; h.fund = 1000; op = cap.opinion;
    rolls([0.99]);  // a real freighter, answered blind
    e = ambushScene(); G.dialog = { event: e, choices: e.choices };
    const real = chooseEvent(e.choices.findIndex(c => c.label === 'Go to her')); out.real = /She's real/.test(real); out.fund = h.fund; out.realOp = cap.opinion - op;
    st.ambushAt = -1000; op = cap.opinion; rolls([0.99, 0.01]);  // real, and the read shows it
    e = ambushScene(); G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /Scan her hull/.test(c.label))); finishEvent();
    chooseEvent(G.dialog.choices.findIndex(c => c.label === 'Leave her')); out.leftOp = cap.opinion - op;
    return out;
  });
  assert.ok(r.away); assert.equal(r.awayOp, 1); assert.equal(r.xp, 2);
  assert.ok(r.real); assert.equal(r.fund, 1500); assert.equal(r.realOp, 1); assert.equal(r.leftOp, -1);
  await done();
});

test('a hostile patrol is a navy stop for a hired hand: the same fight with guns, firing on her costs your standing, and she is never boarded', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), gov = 'Arcology Compact', before = repOf(gov);
    const spare = window.realMakeEnemy({ kind: 'patrol', gov }); window.makeEnemy = () => Object.assign(spare, { shipId: 'cutter', armor: SHIPS.cutter.armor, maxArmor: SHIPS.cutter.armor });
    const text = startDuel({ kind: 'patrol', gov }, false); begin();
    const out = { duel: !!G.duel, title: G.dialog.event.title, open: /navy ship/.test(G.dialog.event.text), rep: repOf(gov) - before, text: /Battle stations/.test(text), band: RANGE_BANDS[fightNow().state.band] };
    fightNow().state.foes.forEach(foe => { foe.parts.weapons.hp = 0; foe.parts.drive.hp = 0; }); shownMoves({ kind: 'hold' });  // a cripple, which would leave a raider dead in space
    fireOrders();
    out.off = /registry has been logged/.test(G.dialog.event.text); out.boardable = G.dialog.event.title === 'Dead in Space'; out.pirate = repOf('Pirate');
    return out;
  });
  assert.equal(r.duel, false); assert.equal(r.title, 'Battle Stations'); assert.ok(r.open && r.text); assert.equal(r.rep, -8); assert.equal(r.band, 'mid', 'a patrol is met at thirty kilometers');
  assert.ok(r.off, 'she breaks off with a warning'); assert.ok(!r.boardable, 'a navy ship is not boarded');
  await done();
});

test('a hired hand can heave to and let the ship pay a quarter of its fund, instead of fighting', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), gov = 'Arcology Compact', cap = person(h.captain), op = cap.opinion;
    st.rep[gov] = -30; h.fund = 2000;
    const e = contactEvent({ kind: 'patrol', gov }), i = e.choices.findIndex(c => /Heave to/.test(c.label));
    G.dialog = { event: e, choices: e.choices };
    const t = chooseEvent(i);
    return { i, fund: h.fund, rep: st.rep[gov], opinion: cap.opinion - op, text: /500 cr/.test(t) };
  });
  assert.ok(r.i >= 0); assert.equal(r.fund, 1500); assert.equal(r.rep, -10); assert.equal(r.opinion, -1); assert.ok(r.text);
  await done();
});

test('a patrol that boards a hired hand\'s ship levies the fund and does not rob it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), gov = 'Arcology Compact';
    const spare = window.realMakeEnemy({ kind: 'patrol', gov }); Object.assign(spare, { shipId: 'cutter' });
    h.fund = 1000;
    const d = { foe: spare, foeHp: 0, init: 'foe' }, s = repelStart(d, 'full');
    s.state.sections[2] = { mine: 0, theirs: 3, cover: 1 }; s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };  // they hold the bridge
    rolls([0.99, 0.99, 0.99, 0.99]);  // no one is hurt
    const e = deckFightEvent(s); e.choices[e.choices.length - 1].run(); const text = G.nextEvent.text; G.nextEvent = null;
    return { levy: /levy of 300 cr/.test(text), fund: h.fund };
  });
  assert.ok(r.levy); assert.equal(r.fund, 700);
  await done();
});

test('a turn that takes a heavy share of the armor can hurt you: a clinic bill without a medic; a light one hurts nobody', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), out = {};
    st.crew = st.crew.filter(id => person(id).role !== 'medic'); st.injured = {};
    startDuel({ kind: 'pirate' }, false); begin();
    const cred = st.credits, me = fightNow().state.me; me.shields = 0;
    shownMoves({ kind: 'broadside', target: 'hull', dmg: [60, 60] });  // 60 of 260: more than fifteen percent
    rolls([0.5, 0.5, 0.99, 0.01]);  // our shot, her volley, no casualty, and the hand's own roll
    fireOrders();
    out.hurt = handHurt(); out.line = fightNow().state.log.slice(-1)[0]; out.paid = cred - st.credits; out.armor = st.armor;
    hired().hurtUntil = 0; fightNow().state.me.shields = 0; fightNow().state.foes.forEach(f => { f.parts.weapons.hp = f.parts.weapons.max; });  // her guns whole again, so she fires
    shownMoves({ kind: 'broadside', target: 'hull', dmg: [20, 20] });  // 20 of 260: not
    rolls([0.5, 0.5, 0.01, 0.01]); fireOrders(); out.light = handHurt(); out.lightLine = fightNow().state.log.slice(-1)[0];
    return out;
  });
  assert.ok(r.hurt, 'hurt on a heavy hit'); assert.match(r.line, /she hits your hull for 60\. You are hurt\. Your work counts a level lower until the clinic clears you\. The clinic is 150 cr of your own, with no medic aboard\.$/, r.line);
  assert.equal(r.paid, 150); assert.equal(r.armor, 200, 'the hit stays on the ship');
  assert.equal(r.light, false); assert.match(r.lightLine, /she hits your hull for 20\.$/);
  await done();
});

test('a medic aboard treats you free', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'); const medic = makePerson('earth'); medic.role = 'medic'; medic.skill = 1; registerPerson(medic); st.crew.push(medic.id); st.injured = {};
    startDuel({ kind: 'pirate' }, false); begin(); const cred = st.credits;
    fightNow().state.me.shields = 0; shownMoves({ kind: 'broadside', target: 'hull', dmg: [60, 60] });
    rolls([0.5, 0.5, 0.99, 0.01]); fireOrders();
    return { hurt: handHurt(), paid: cred - st.credits, bill: /clinic is/.test(fightNow().state.log.slice(-1)[0]) };
  });
  assert.deepEqual(r, { hurt: true, paid: 0, bill: false });
  await done();
});

test('the first fight of a new game is explained once, by the first officer, before the panel', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'); hired().raidTold = false;
    const text = startDuel({ kind: 'pirate' }, false);
    const first = G.nextEvent; begin();
    const out = { text: /Battle stations/.test(text), title: G.dialog.event.title, body: G.dialog.event.text, labels: G.dialog.choices.map(c => c.label), told: hired().raidTold };
    chooseEvent(0); finishEvent();
    out.next = G.dialog && G.dialog.event.title;
    // a later fight goes straight to the panel
    G.dialog = null; G.nextEvent = null;
    startDuel({ kind: 'pirate' }, false); begin();
    out.later = G.dialog.event.title;
    return out;
  });
  assert.equal(r.title, 'The Guns Hatch'); assert.match(r.body, /what she means to do next/); assert.match(r.body, /her guns, her drive, her lock, her hull\. Then Fire/); assert.match(r.body, /a level lower/); assert.doesNotMatch(r.body, /Position|brackets/);
  assert.deepEqual(r.labels, ['Take your post']); assert.equal(r.told, true);
  assert.equal(r.next, 'Battle Stations', 'the fight follows'); assert.equal(r.later, 'Battle Stations', 'and it is not said twice');
  await done();
});

test('a save from before the explanation has no flag, and its first fight goes straight to the panel', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('gunner'); delete hired().raidTold;
    startDuel({ kind: 'pirate' }, false); begin();
    return G.dialog.event.title;
  });
  assert.equal(r, 'Battle Stations');
  await done();
});

test('a hired Gunner has two orders: a drill that teaches, and boresighting that makes the guns hit as a level better in the next fight, until the next port', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('gunner'); const out = {};
    const skill = () => { G.dialog = null; G.nextEvent = null; startDuel({ kind: 'pirate' }, false); const s = G.nextEvent.fight; G.nextEvent = null; return s.state.me.skill; };
    out.ids = postOrders('gunner').map(o => o.id);
    const real = Math.random;
    out.base = skill();
    const xp = skillXp('gunner');
    Math.random = () => 0.9; const miss = giveOrder('gunner', 'boresight'); Math.random = real;
    out.missed = { text: miss, skill: skill(), busy: postState('gunner').busy, xp: skillXp('gunner') - xp };
    out.again = giveOrder('gunner', 'drill');
    postState('gunner').busy = false;
    Math.random = () => 0.01; const hit = giveOrder('gunner', 'boresight'); Math.random = real;
    out.hit = { text: hit, skill: skill() };
    postState('gunner').busy = false;
    Math.random = () => 0.01; const drill = giveOrder('gunner', 'drill'); Math.random = real;
    out.drill = { text: drill, xp: skillXp('gunner') - xp };
    Mods.emit('landed', currentPlanet());
    out.landed = skill();
    return out;
  });
  assert.deepEqual(r.ids, ['drill', 'boresight']);
  assert.match(r.missed.text, /the third drifts a finger/i); assert.equal(r.missed.skill, r.base, 'a failed boresight changes nothing'); assert.equal(r.missed.busy, true); assert.equal(r.missed.xp, 1, 'your own work teaches');
  assert.equal(r.again, null, 'one order a day');
  assert.match(r.hit.text, /target plate at four hundred meters/); assert.equal(r.hit.skill, r.base + 1, 'a level better');
  assert.match(r.drill.text, /three times in four/); assert.equal(r.drill.xp, 3, 'a miss, a hit and a drill each taught one');
  assert.equal(r.landed, r.base, 'the next port clears it');
  await done();
});

test('the fight carries its sensor board: a plot each turn, at the band she is in, drawn from the last turn when the sensors fail (#680)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    raid('gunner'); const out = {};
    startDuel({ kind: 'pirate' }, false); begin();
    const e0 = G.dialog.event; out.first = { board: /^<svg class="board"/.test(e0.board), head: /RANGE 50 km/.test(e0.board), bearing: /BEARING 090/.test(e0.board), word: /LONG/.test(e0.board) };
    fireOrders(); const e1 = G.dialog.event; out.second = { head: /RANGE 25 km/.test(e1.board), stale: /STALE/.test(e1.board) };
    condition().sensors = 30; fireOrders(); const e2 = G.dialog.event; out.failing = { stale: /STALE/.test(e2.board), head: /RANGE 6 km/.test(e2.board) };
    out.drawn = !!document.querySelector('#panel .event-body svg.board') && !!document.querySelector('#panel .event-body svg.bars');
    return out;
  });
  assert.deepEqual(r.first, { board: true, head: true, bearing: true, word: true }, 'long range, abeam');
  assert.deepEqual(r.second, { head: true, stale: false }, 'she closed to mid range');
  assert.deepEqual(r.failing, { stale: true, head: true }, 'failing sensors show her where she was last turn, and say so');
  assert.equal(r.drawn, true, 'the dialog draws the board and the bars above the text');
  await done();
});

test('an owner does not get the Gunner\'s orders', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'owner' }); return postOrders('gunner').map(o => o.id); });
  assert.deepEqual(r, []);
  await done();
});

test('each hand makes the call in a pirate contact, rolled on their own skill, and a patrol contact stays the captain\'s', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    const contact = (post, kind = 'pirate') => { raid(post); G.dialog = null; openEvent(contactEvent({ kind, gov: 'Arcology Compact' })); const d = G.dialog; return { decided: !!d.event.decided, labels: d.choices.map(c => c.label), text: d.event.text }; };
    for (const post of ['comms', 'pilot', 'gunner', 'engineer']) out[post] = contact(post);
    out.patrols = ['comms', 'pilot', 'gunner', 'engineer'].map(post => contact(post, 'patrol').decided);
    const spoof = (level, roll) => {
      raid('comms'); hired().skill.comms = SKILL_STEPS[level]; G.dialog = null; openEvent(contactEvent({ kind: 'pirate' }));
      const i = G.dialog.choices.findIndex(c => /^\[Comms\] Spoof/.test(c.label));
      rolls([roll]); return chooseEvent(i);
    };
    out.low = spoof(1, 0.7); out.high = spoof(3, 0.7);
    // The other three: a win gives you the first volley, a loss gives it to her (and a share of the hull for the Pilot and the Engineer).
    const move = (post, level, roll) => {
      const st = raid(post); hired().skill[post] = SKILL_STEPS[level]; G.dialog = null; openEvent(contactEvent({ kind: 'pirate' }));
      const i = G.dialog.choices.findIndex(c => c.label.startsWith(`[${POSTS[post].name}]`)), armor = st.armor;
      G.nextEvent = null; rolls([roll]); const text = chooseEvent(i), scene = G.nextEvent;
      return { text, first: scene && (/You fire first/.test(scene.text) ? 'ours' : /She fires first/.test(scene.text) ? 'hers' : ''), band: scene && RANGE_BANDS[scene.fight.state.band], hit: armor - st.armor, title: scene && scene.title };
    };
    for (const post of ['pilot', 'gunner', 'engineer']) out[`${post}Level1`] = { low: move(post, 1, 0.7), high: move(post, 3, 0.7), win: move(post, 3, 0.01) };
    return out;
  });
  assert.equal(r.comms.decided, false, 'the hand picks'); assert.ok(r.comms.labels.includes('[Comms] Spoof a pirate transponder'));
  assert.ok(r.comms.labels.length >= 4, 'every choice is shown'); assert.doesNotMatch(r.comms.text, /takes the call/);
  const names = { pilot: 'Take the helm and break her intercept', gunner: 'Put a burst across her bow', engineer: 'Cut the drive and go dark' };
  for (const post of ['pilot', 'gunner', 'engineer']) {
    const Name = post[0].toUpperCase() + post.slice(1);
    assert.equal(r[post].decided, false, `${post}: the hand picks`); assert.doesNotMatch(r[post].text, /takes the call/);
    assert.ok(r[post].labels.some(l => l.startsWith(`[${Name}] ${names[post]}`)), `${post}: its own option`);
    assert.equal(r[post].labels.filter(l => /^\[(Pilot|Gunner|Engineer)\]/.test(l)).length, 1, `${post}: only its own`);
    const m = r[`${post}Level1`];
    assert.equal(m.low.first, 'hers', `${post}: level 1 is 0.6, so 0.7 loses`); assert.equal(m.high.first, 'ours', `${post}: level 3 is 0.8, so 0.7 wins`); assert.equal(m.win.first, 'ours');
    assert.equal(m.low.title, 'Battle Stations', 'the fight goes on either way'); assert.match(m.low.text, /Battle stations/);
    assert.deepEqual([m.win.band, m.low.band], ['long', 'mid'], `${post}: the move opens the range the fight starts at (40 km for a pirate), and a loss closes it by ten (#710)`);
    assert.match(r[post].labels.find(l => l.startsWith(`[${Name}]`)), /opens the range/);
    const hull = post !== 'gunner';
    assert.equal(m.low.hit > 0, hull, `${post}: a loss ${hull ? 'costs' : 'does not cost'} hull`); assert.equal(m.high.hit, 0, 'a win costs none');
  }
  assert.deepEqual(r.patrols, [true, true, true, true], 'no option fits a patrol contact: the captain\'s call');
  assert.match(r.low, /^They see through it/, 'level 1 is 0.6'); assert.match(r.high, /^Your fake transponder/, 'level 3 is 0.8');
  await done();
});

test('the ice run and the work events say what an option can cost, from what it declares, and an option with no stake says nothing', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = { ice: [], work: [] };
    const text = label => { const b = document.createElement('div'); b.innerHTML = label; return b.textContent; };
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    hired().run = { ice: { edge: 0 } };
    // the ice run: every general choice and the post's own, against its declared lost-roll hull and bold flag
    ICE_STAGES.forEach((stage, n) => {
      const labels = iceStageScene(n).choices.map(c => text(c.label)), specs = [...stage.general, stage.post.gunner];
      specs.forEach((c, i) => out.ice.push({ label: labels[i], hull: (c.lose || c.win)[1] > 0, bold: !!c.bold }));
    });
    // the work events: the careful option has no stake, the quick one is bold and pays less on a miss
    for (const d of WORK_EVENTS) { const e = workEvent(d); out.work.push(e.choices.map(c => text(c.label))); }
    return out;
  });
  assert.ok(r.ice.length >= 12);
  for (const x of r.ice) {
    assert.equal(x.label.includes('hull damage, a crew casualty'), x.hull, `${x.label}: hull cost matches`);
    assert.equal(x.label.includes('the captain marks it'), x.bold, `${x.label}: a bold call is marked`);
    assert.equal(x.label.includes('if it fails:'), x.hull || x.bold, `${x.label}: nothing at stake, no cost`);
    assert.match(x.label, /\[\d+%/, `${x.label}: every ice choice is a roll, and says its odds`);
  }
  assert.ok(r.ice.some(x => !x.hull && !x.bold) && r.ice.some(x => x.hull && !x.bold) && r.ice.some(x => x.hull && x.bold), 'the run has each kind');
  for (const [careful, quick] of r.work) { assert.ok(!careful.includes('['), careful); assert.match(quick, /\[\d+%; if it fails: you learn less, and the captain marks it\]$/, quick); }
  await done();
});

// ---------- the note on the button (#491) ----------

test('the cost note shows on the rendered button as text, with no markup, in an ice run scene and a work event', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const buttons = choices => { const d = document.createElement('div'); d.innerHTML = choiceBlockHtml(choices); return [...d.querySelectorAll('button')].map(b => b.textContent); };
    raid('gunner');
    hired().run = { ice: { edge: 0 } };
    return {
      ice: buttons(iceStageScene(0).choices),
      work: buttons(workEvent(WORK_EVENTS[0]).choices),
    };
  });
  for (const [name, labels] of Object.entries(r)) {
    assert.ok(labels.some(l => /\[\d+%; if it fails:/.test(l)), `${name}: a button carries the note`);
    for (const l of labels) assert.doesNotMatch(l, /[<>]|class=/, `${name}: ${l}`);
  }
  await done();
});

test('on the page, the board\'s header, its reach label and its sun marker do not overlap (#731)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    const b = { range: 40, bearing: 90, closing: 4, aspect: 'closing' }, out = [];
    const hit = (a, c) => !(a.right <= c.left || c.right <= a.left || a.bottom <= c.top || c.bottom <= a.top);
    for (const angle of [-Math.PI / 2, 0, Math.PI / 2, Math.PI, -2.2, 2.2]) {
      const box = document.createElement('div'); box.innerHTML = boardSvg(b, { style: 'grapple', beat: 0, sunAngle: angle, word: 'even' }); document.body.appendChild(box);
      const svg = box.querySelector('svg'), head = svg.querySelector('text'), reach = svg.querySelector('text.reach'), sun = svg.querySelector('circle.sun');
      const h = head.getBoundingClientRect(), rr = reach.getBoundingClientRect(), sb = sun.getBoundingClientRect();
      out.push({ angle, headReach: hit(h, rr), headSun: hit(h, sb), reachSun: hit(rr, sb) });
      box.remove();
    }
    return out;
  });
  for (const x of r) assert.deepEqual([x.headReach, x.headSun, x.reachSun], [false, false, false], `sun at ${x.angle}`);
  await done();
});

test('the fight panel shows her move and the captain\'s above the pinned orders without scrolling, at the three screen sizes (#734)', async () => {
  for (const [name, viewport, mobile] of [['desktop', { width: 1280, height: 800 }, false], ['tablet', { width: 768, height: 1024 }, false], ['phone', { width: 390, height: 844 }, true]]) {
    const { ev, page, done } = await open({ scope: 'earth-hired', viewport, mobile });
    await ev(helpers);
    await ev(() => { raid('gunner'); startDuel({ kind: 'pirate' }, false); begin(); });
    await frames(page);
    const r = await ev(() => {
      const el = document.querySelector('#panel.event'), read = el.querySelector('p.read'), panel = el.getBoundingClientRect();
      const box = read && read.getBoundingClientRect(), choices = el.querySelector('.choices').getBoundingClientRect();
      return { read: read && read.textContent, readTop: box && box.top, readBottom: box && box.bottom, panelTop: panel.top, choicesTop: choices.top };
    });
    assert.match(r.read, /: closing, and firing at your hull as she comes, \d+ to \d+ damage\. Captain Vance: holding the range\.$/, `${name}: the read line is drawn`);
    assert.ok(r.readTop >= r.panelTop && r.readBottom <= r.choicesTop, `${name}: the read line (${r.readTop} to ${r.readBottom}) is in view above the choices, which start at ${r.choicesTop}`);
    await done();
  }
});

test('the standoff line agrees with the board: close in when she is in the close bands, at long range when she is past them (#733)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    const stand = band => { const st = raid('gunner'), armor = st.armor; startDuel({ kind: 'pirate' }, false); begin(); const f = fightNow().state; f.band = RANGE_BANDS.indexOf(band); f.turn = FIGHT.TURNS - 1; shownMoves({ kind: 'hold' }); fireOrders(); return { text: G.dialog.event.text.split('</p><p>').pop(), armor: armor - st.armor }; };
    out.knife = stand('knife'); out.close = stand('close'); out.mid = stand('mid'); out.long = stand('long');
    return out;
  });
  for (const band of ['knife', 'close']) assert.equal(r[band].text, 'She turns away close in and drags her drive plume across your bow, and it scorches the plating forward. Armor -13.', band);
  for (const band of ['mid', 'long']) assert.equal(r[band].text, 'She turns away with the range still open, and her last burst clips the hull aft. Armor -13.', band);
  assert.equal(r.close.armor, 13, 'five percent of the hull');
  await done();
});

test('an owner who kept a post meets a pirate or a patrol in the ship fight (#721): the helm takes the captain\'s part, a hurt lays them up and never kills, and the close goes in the log; one who never was a hand keeps the card duel', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.credits = 100000; buyIn('courier'); while (G.dialog) finishEvent();
    st.day += 30; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    out.owner = !hired() && lockPost() === 'gunner';
    const real = Math.random;  // a foe is made with the dice back: people are drawn until they differ
    window.rateFoe = f => { f.grade = 0; f.pack = false; return f; };  // an ordinary foe, whatever the seed draws
    const fresh = kind => { Math.random = real; st.armor = ship().armor; G.duel = null; G.nextEvent = null; const text = startDuel({ kind, gov: 'Arcology Compact' }, false); begin(); return text; };
    out.text = fresh('pirate'); out.title = G.dialog.event.title; out.duel = !!G.duel; out.read = G.dialog.event.read;
    // a heavy hit, and the hurt that follows it (the dice are set after the foe is made)
    const xp = skillXp('gunner'); fightNow().state.me.shields = 0; shownMoves({ kind: 'broadside', target: 'hull', dmg: [30, 30] });
    rolls([0.5, 0.5, 0.99, 0.01, 0.01]);  // our shot, her volley, no casualty, the hand's roll, and the roll that would kill a hand
    fireOrders(); out.lost = fightNow().state.log.slice(-1)[0]; out.hurtUntil = career().hurtUntil - st.day; out.alive = !!G.state && !G.state.fallen && G.dialog.event.title === 'Battle Stations';
    // she breaks off, and the owner writes it in the log
    fresh('pirate'); fightNow().state.foes[0].armor = 5; fightNow().state.foes[0].shields = 0; shownMoves({ kind: 'break' }); openEvent(shipFightEvent(fightNow(), { guns: [null], torp: null, pdc: 'fire' }));
    fireOrders(); out.off = G.dialog.event.text; out.xp = skillXp('gunner') - xp;
    out.patrol = (fresh('patrol'), G.dialog.event.title); out.patrolDuel = !!G.duel;
    G.state.career = undefined; out.never = lockPost(); G.dialog = null; G.nextEvent = null; startDuel({ kind: 'pirate' }, false); out.neverDuel = !!G.duel;
    return out;
  });
  assert.ok(r.owner); assert.match(r.text, /Battle stations/); assert.equal(r.title, 'Battle Stations'); assert.equal(r.duel, false, 'no card duel');
  assert.match(r.read, /: (holding|closing|opening) the range\.$/); assert.doesNotMatch(r.read, /Captain/, 'there is no captain: the helm');
  assert.match(r.lost, /You are hurt/); assert.ok(r.hurtUntil >= 12, 'laid up'); assert.ok(r.alive, 'and the fight goes on');
  assert.match(r.off, /breaks off/); assert.match(r.off, /You write it in the log and nothing else/); assert.doesNotMatch(r.off, /Captain/); assert.ok(r.xp >= 3, 'the post learns from a stand');
  assert.equal(r.patrol, 'Battle Stations'); assert.equal(r.patrolDuel, false);
  assert.equal(r.never, null); assert.equal(r.neverDuel, true, 'an owner who never was a hand keeps the card duel');
  await done();
});

// ---------- the final review's fixes (#786) ----------

test('dead in space counts her crew as the boarding will: a veteran pair is more of hers than a lone raider, and Board her opens that same fight', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const [name, grade, pack] of [['lone', 0, false], ['pair', 2, true]]) {
      raid('gunner');
      const s = { foe: makeEnemy({ kind: 'pirate' }), grade, pack };
      const e = deadInSpaceScene(s), said = Number((/against (\d+) of hers/.exec(e.text) || [])[1]);
      G.nextEvent = null; e.choices.find(c => c.label === 'Board her').run();
      out[name] = { said, heads: G.nextEvent.fight.state.began };
    }
    return out;
  });
  assert.equal(r.lone.said, r.lone.heads); assert.equal(r.pair.said, r.pair.heads, JSON.stringify(r));
  assert.ok(r.pair.heads > r.lone.heads, 'a veteran pair has more crew');
  await done();
});

test('a heavy turn whose casualty falls on the hand does not hurt the hand a second time', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired();
    st.crew = st.crew.filter(id => person(id).role !== 'medic'); st.injured = {}; delete h.hurtUntil;
    for (const id of st.crew) { person(id).opinion = 0; delete person(id).owes; }  // nobody to take it for you
    startDuel({ kind: 'pirate' }, false); begin();
    fightNow().state.me.shields = 0;
    shownMoves({ kind: 'broadside', target: 'hull', dmg: [60, 60] });
    rolls([0.5, 0.5, 0.01, 0.999, 0.99, 0.01, 0.99]);  // our shot, her volley, a casualty, on the hand (the last of the pool), no death; then the hand's own roll, and no death
    fireOrders();
    return { line: fightNow().state.log.slice(-1)[0], days: h.hurtUntil - st.day };
  });
  assert.match(r.line, /You are hurt\./, r.line);
  assert.doesNotMatch(r.line, /hurt again/, 'one hurt on one turn');
  assert.equal(r.days, 12, 'laid up as a first hurt');
  await done();
});

test('what the captain remembers says what happened: a raider let drift, and a navy ship that broke off', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    raid('gunner'); let cap = person(hired().captain);
    startDuel({ kind: 'pirate' }, false); begin();
    fightNow().state.foes.forEach(foe => { foe.parts.weapons.hp = 0; foe.parts.drive.hp = 0; }); shownMoves({ kind: 'hold' }); fireOrders();
    choose('Let her drift'); out.drift = cap.memories[cap.memories.length - 1];
    raid('gunner'); cap = person(hired().captain);
    const gov = 'Arcology Compact', spare = window.realMakeEnemy({ kind: 'patrol', gov }); window.makeEnemy = () => Object.assign(spare, { shipId: 'cutter', armor: SHIPS.cutter.armor, maxArmor: SHIPS.cutter.armor });
    startDuel({ kind: 'patrol', gov }, false); begin();
    fightNow().state.foes.forEach(foe => { foe.parts.weapons.hp = 0; }); shownMoves({ kind: 'break' }); fireOrders();
    out.navy = cap.memories[cap.memories.length - 1];
    return out;
  });
  assert.doesNotMatch(r.drift, /broke off/, r.drift); assert.match(r.drift, /drift/, r.drift);
  assert.doesNotMatch(r.navy, /raid/, r.navy); assert.match(r.navy, /navy/, r.navy);
  await done();
});
