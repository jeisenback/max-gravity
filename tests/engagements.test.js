'use strict';

// The engagements for a hired hand: pirates or a navy patrol make contact, and the hand fights it on the radar (js/fightui.js, js/radarui.js) instead
// of the card duel; what comes after it (the crippled ship, the deck fights); the ambush; the Gunner's orders; and the cost notes.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

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
  // The fight's own state (fightui.js); the fight on the radar ending as radarui.js ends it, and opening what the end queued; and a step of the fight that
  // took `dmg` off our hull, as radarui.js costs it (fightTook), returning what it said.
  window.fightNow = () => G.dialog.event.fight;
  window.endAs = end => { const s = fightNow(); G.radar = null; G.dialog = null; G.nextEvent = null; shipFightEnd(s, end); begin(); return s; };
  window.heavy = dmg => { const s = fightNow(); s.state.me.armor -= dmg; s.state.log.push(''); fightTook(s, [{ who: 'foe', foe: 0, part: 'hull', dmg }]); return s.state.log.pop().trim(); };
};

test('a pirate contact for a hired hand opens the ship fight on the radar, not the card duel, and the hand works the post', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('pilot'); const text = startDuel({ kind: 'pirate' }, false);
    begin();
    const me = fightNow().state.me;
    return { text: /Battle stations/.test(text), title: G.dialog.event.title, duel: !!G.duel, decided: !!G.dialog.event.decided, choices: G.dialog.choices.length, board: /^<div class="radar-fight"/.test(G.dialog.event.board),
      radar: !!G.radar && G.radar.s === fightNow(), post: G.radar && G.radar.post, guns: me.guns, torps: me.torps };
  });
  assert.ok(r.text); assert.equal(r.title, 'Battle Stations'); assert.equal(r.duel, false); assert.ok(!r.decided, 'the captain does not take this call');
  assert.ok(r.board && r.radar, 'the radar fight'); assert.equal(r.choices, 0, 'it is played on the radar, not by choices');
  assert.equal(r.post, 'pilot', 'the hand works the post'); assert.deepEqual([r.guns, r.torps], [2, 2], 'the hauler has two guns and a launcher with two torpedoes');
  await done();
});

test('when she breaks off it costs nothing but a log line and some experience', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), cap = person(hired().captain), op = cap.opinion, xp = skillXp('gunner'), armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    endAs('broke'); const close = G.dialog.event;
    const out = { title: close.title, off: /breaks off/.test(close.text), log: /Captain Vance writes it in the log and nothing else\. \(\+3 experience at the gunner post\.\)$/.test(close.text), opinion: cap.opinion - op, xp: skillXp('gunner') - xp, armor: st.armor === armor };
    out.down = G.dialog.choices.map(c => c.label); chooseEvent(0); finishEvent(); out.after = !!G.dialog;
    return out;
  });
  assert.equal(r.title, 'Battle Stations');
  assert.ok(r.off); assert.ok(r.log); assert.equal(r.opinion, 1); assert.equal(r.xp, 3); assert.ok(r.armor);
  assert.deepEqual(r.down, ['Stand down']); assert.equal(r.after, false, 'and the burn goes on');
  await done();
});

test('she gets away with her guns gone and her hull whole: a weak end, with nothing for you', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('engineer'); const cap = person(hired().captain), op = cap.opinion, xp = skillXp('engineer');
    startDuel({ kind: 'pirate' }, false); begin();
    endAs('away');
    return { title: G.dialog.event.title, labels: G.dialog.choices.map(c => c.label), close: G.dialog.event.text.split('</p><p>').pop(), opinion: cap.opinion - op, xp: skillXp('engineer') - xp };
  });
  assert.equal(r.title, 'Battle Stations'); assert.deepEqual(r.labels, ['Stand down']);
  assert.equal(r.close, 'She breaks off with her guns gone and her hull whole, and she is clear before you can stop her. There is nothing to log but that she got away.');
  assert.deepEqual([r.opinion, r.xp], [0, 0], 'she got away with nothing for you');
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
      endAs('boarded');
      const t = G.dialog.event.text;
      out[shipId].boarded = t.includes('your drive is slow') ? 'torpedo' : t.includes('grapples bang on the hull in four places') ? 'grapple' : '';
      out[shipId].boarders = G.dialog.event.fight.state.began; out[shipId].title = G.dialog.event.title;
    }
    return out;
  });
  assert.notEqual(r.raider.open, r.corsair.open);
  assert.equal(r.raider.boarded, 'grapple'); assert.equal(r.corsair.boarded, 'torpedo');
  assert.deepEqual([r.raider.title, r.corsair.title], ['The Lock', 'The Lock'], 'both open the deck fight at the lock');
  assert.equal(r.raider.boarders, r.corsair.boarders + 3, 'a full run for a raider (her two and four more), a short one for a corsair (her three and no more), at the same grade');
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
  assert.equal(r.next, 'Battle Stations'); assert.equal(r.hull, 21, 'eight percent of the 260 past the skin (FIGHT.SKIN, #1208); her first volley lands on the skin'); assert.ok(r.first, 'she has the first volley');
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
    endAs('crippled'); out.title = G.dialog.event.title; out.crippled = /grapple arms go slack|drive cone splits/.test(G.dialog.event.text); out.labels = G.dialog.choices.map(c => c.label);
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
  assert.equal(r.title, 'Dead in Space'); assert.ok(r.crippled, 'the line that says how'); assert.deepEqual(r.labels, ['Board her', 'Let her drift']);
  assert.equal(r.first, 'Her Lock'); assert.equal(r.assault, true); assert.ok(r.heads >= 3, 'her crew and one more'); assert.equal(r.mid, null, 'the fight ends on the panel');
  assert.ok(r.taken, r.end); assert.ok(r.fund >= 10000 && r.fund <= 30000, `fund ${r.fund}`); assert.equal(r.opinion, 2, 'the strongbox'); assert.equal(r.xp, 5);
  assert.equal(r.next, null);
  await done();
});

test('losing the boarding drives you back to your lock, and she drifts on', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion, fund = h.fund, armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    endAs('crippled');
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
    endAs('crippled');
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
    out.ahead = /You fire first: you hit her weapons for \d+, you hit her weapons for \d+\./.test(G.dialog.event.text);
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
    st.ambushAt = -1000; h.fund = 10000; op = cap.opinion;
    rolls([0.99]);  // a real freighter, answered blind
    e = ambushScene(); G.dialog = { event: e, choices: e.choices };
    const real = chooseEvent(e.choices.findIndex(c => c.label === 'Go to her')); out.real = /She's real/.test(real); out.fund = h.fund; out.realOp = cap.opinion - op;
    st.ambushAt = -1000; op = cap.opinion; rolls([0.99, 0.01]);  // real, and the read shows it
    e = ambushScene(); G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /Scan her hull/.test(c.label))); finishEvent();
    chooseEvent(G.dialog.choices.findIndex(c => c.label === 'Leave her')); out.leftOp = cap.opinion - op;
    return out;
  });
  assert.ok(r.away); assert.equal(r.awayOp, 1); assert.equal(r.xp, 2);
  assert.ok(r.real); assert.equal(r.fund, 15000); assert.equal(r.realOp, 1); assert.equal(r.leftOp, -1);
  await done();
});

test('a hostile patrol is a navy stop for a hired hand: the same fight with guns, firing on her costs your standing, and she is never boarded', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), gov = 'Arcology Pact', before = repOf(gov);
    const spare = window.realMakeEnemy({ kind: 'patrol', gov }); window.makeEnemy = () => Object.assign(spare, { shipId: 'cutter', armor: SHIPS.cutter.armor, maxArmor: SHIPS.cutter.armor });
    const text = startDuel({ kind: 'patrol', gov }, false); begin();
    const out = { duel: !!G.duel, title: G.dialog.event.title, open: /navy ship/.test(G.dialog.event.text), rep: repOf(gov) - before, text: /Battle stations/.test(text), opening: fightNow().state.opening };
    const s = endAs('crippled');  // a cripple, which would leave a raider dead in space
    out.off = /calls the stop off/.test(G.dialog.event.text); out.warned = /registry has been logged/.test(G.dialog.event.text);
    out.boardable = G.dialog.event.title === 'Dead in Space'; out.pirate = repOf('Pirate');
    // A crewmate killed in the stop is logged as killed in it, not by boarders.
    const c = st.crew.map(person).find(p => p && !p.cast); loseCrew(c, killedHow(s));  // the stop's own fight, as a heavy hit in it is logged (fightTook, repelCasualty)
    out.log = (st.home || {}).log.slice(-1)[0];
    return out;
  });
  assert.equal(r.duel, false); assert.equal(r.title, 'Battle Stations'); assert.ok(r.open && r.text); assert.equal(r.rep, -8); assert.equal(r.opening, 'short', 'a patrol is met at thirty kilometers, inside mid range');
  assert.ok(r.off && !r.warned, 'crippled, she calls the stop off; she does not break off'); assert.ok(!r.boardable, 'a navy ship is not boarded');
  assert.match(JSON.stringify(r.log), /was killed in a navy stop near /);
  await done();
});

test('a patrol that boards a hired hand\'s ship and holds the bridge searches it, fining the fund the heave-to\'s quarter, and does not rob it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), gov = 'Arcology Pact';
    const spare = window.realMakeEnemy({ kind: 'patrol', gov }); Object.assign(spare, { shipId: 'cutter' });
    h.fund = 10000;
    const d = { foe: spare, foeHp: 0, init: 'foe' }, s = repelStart(d, 'full');
    s.state.sections[2] = { mine: 0, theirs: 3, cover: 1 }; s.shown = { kind: 'hold', from: 0, to: 0, n: 0, feint: false };  // they hold the bridge
    rolls([0.99, 0.99, 0.99, 0.99]);  // no one is hurt
    const e = deckFightEvent(s); e.choices[e.choices.length - 1].run(); const text = G.nextEvent.text; G.nextEvent = null;
    return { fine: /writes the citation: 2,500 cr/.test(text), robbed: /They're on the bridge/.test(text), fund: h.fund };
  });
  assert.ok(r.fine); assert.equal(r.robbed, false); assert.equal(r.fund, 7500);
  await done();
});

test('a turn that takes a heavy share of the armor can hurt you: a clinic bill without a medic; a light one hurts nobody', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), out = {};
    st.crew = st.crew.filter(id => person(id).role !== 'medic' && !(CAST[person(id).cast] || {}).firstAid)  // no medic, and no first aid (the bosun's, #879); st.injured = {};
    startDuel({ kind: 'pirate' }, false); begin();
    const cred = st.credits, me = fightNow().state.me; fightNow().armor0.fight += Math.round(HULL_SKIN * me.maxArmor);  // the skin spent earlier in the fight (HULL_SKIN, #1208): what she does now stays on the ship
    rolls([0.99, 0.01]);  // no casualty, and the hand's own roll
    out.line = heavy(60);  // 60: more than a fifth of the 260 past the skin (FIGHT.HEAVY_HIT of the real 440 less FIGHT.SKIN)
    out.hurt = handHurt(); out.paid = cred - st.credits; out.armor = st.armor;
    hired().hurtUntil = 0;
    rolls([0.01, 0.01]); out.lightLine = heavy(20); out.light = handHurt();  // 20: not
    return out;
  });
  assert.ok(r.hurt, 'hurt on a heavy hit'); assert.match(r.line, /^You are hurt\. Your work counts a level lower until the clinic clears you, and another hit before then could kill you\. The clinic is 1,500 cr of your own, with no medic aboard\.$/, r.line);
  assert.equal(r.paid, 1500); assert.equal(r.armor, 440 - Math.round(60 / 0.45), 'past the skin the hit stays on the ship, at the ship\'s scale: 60 of the fight\'s armor is 133 of the real');
  assert.equal(r.light, false); assert.equal(r.lightLine, '', 'nothing said');
  await done();
});

test('a medic aboard treats you free', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'); const medic = makePerson('earth'); medic.role = 'medic'; medic.skill = 1; registerPerson(medic); st.crew.push(medic.id); st.injured = {};
    startDuel({ kind: 'pirate' }, false); begin(); const cred = st.credits;
    rolls([0.99, 0.01]); const line = heavy(60);
    return { hurt: handHurt(), paid: cred - st.credits, bill: /clinic is/.test(line) };
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
    const contact = (post, kind = 'pirate') => { raid(post); G.dialog = null; openEvent(contactEvent({ kind, gov: 'Arcology Pact' })); const d = G.dialog; return { decided: !!d.event.decided, labels: d.choices.map(c => c.label), text: d.event.text }; };
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
      return { text, first: scene && (/You fire first/.test(scene.text) ? 'ours' : /She fires first/.test(scene.text) ? 'hers' : ''), opening: scene && scene.fight.state.opening, hit: armor - st.armor, title: scene && scene.title };
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
    assert.deepEqual([m.win.opening, m.low.opening], ['long', 'short'], `${post}: the move opens the range the fight starts at (40 km for a pirate), and a loss closes it by ten, inside mid range (#710)`);
    assert.match(r[post].labels.find(l => l.startsWith(`[${Name}]`)), /opens the range/);
    const hull = post !== 'gunner';
    assert.equal(m.low.hit > 0, hull, `${post}: a loss ${hull ? 'costs' : 'does not cost'} hull (her first volley lands on the skin, FIGHT.SKIN)`); assert.equal(m.high.hit, 0, 'a win costs none');
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
      specs.forEach((c, i) => out.ice.push({ label: labels[i], hull: (c.lose || c.win)[1] > 0, haul: (c.lose || c.win)[0] < 0, bold: !!c.bold }));  // haul: a lost roll that takes from the haul (#854, #926)
    });
    // the work events: the careful option has no stake, the quick one is bold and pays less on a miss
    for (const d of WORK_EVENTS) { const e = workEvent(d); out.work.push(e.choices.map(c => text(c.label))); }
    return out;
  });
  assert.ok(r.ice.length >= 12);
  for (const x of r.ice) {
    assert.equal(x.label.includes('hull damage, a crew casualty'), x.hull, `${x.label}: hull cost matches`);
    assert.equal(x.label.includes('the captain marks it'), x.bold, `${x.label}: a bold call is marked`);
    assert.equal(x.label.includes('a thinner haul'), x.haul, `${x.label}: a haul cost matches`);
    assert.equal(x.label.includes('if it fails:'), x.hull || x.bold || x.haul, `${x.label}: nothing at stake, no cost`);
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

test('at the cap, the less hurt side wins it: she breaks off, or the captain runs and it is a lost fight', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const cap = end => { raid('gunner'); const xp = skillXp('gunner'); startDuel({ kind: 'pirate' }, false); begin(); endAs(end); return { text: G.dialog.event.text.split('</p><p>').pop(), xp: skillXp('gunner') - xp }; };
    return { broke: cap('broke'), ran: cap('ran') };
  });
  assert.match(r.broke.text, /^She breaks off with her grapple arms folded, and the range opens\. Captain Vance writes it in the log.* \(\+3 experience/); assert.equal(r.broke.xp, 3);
  assert.equal(r.ran.text, 'The ship is the worse hurt, and Captain Vance calls it off. The guns go quiet on both sides with nothing settled. It goes in the log as a lost fight.'); assert.equal(r.ran.xp, 0);
  await done();
});

test('an owner who kept a post meets a pirate or a patrol in the ship fight (#721): with no captain the order is picked at a steady nerve, a hurt lays them up and never kills, and the close goes in the log; one who never was a hand keeps the card duel', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; st.credits = 1000000; buyIn('courier'); while (G.dialog) finishEvent();
    st.day += 30; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    out.owner = !hired() && lockPost() === 'gunner';
    const real = Math.random;  // a foe is made with the dice back: people are drawn until they differ
    window.rateFoe = f => { f.grade = 0; f.pack = false; return f; };  // an ordinary foe, whatever the seed draws
    const fresh = kind => { Math.random = real; st.armor = ship().armor; G.duel = null; G.nextEvent = null; const text = startDuel({ kind, gov: 'Arcology Pact' }, false); begin(); return text; };
    out.text = fresh('pirate'); out.title = G.dialog.event.title; out.duel = !!G.duel; out.radar = !!G.radar; out.nerve = fightNow().state.nerve;
    // a heavy hit, and the hurt that follows it (the dice are set after the foe is made)
    const xp = skillXp('gunner');
    rolls([0.99, 0.01, 0.01]);  // no casualty, the hand's roll, and the roll that would kill a hand
    out.lost = heavy(30); out.hurtUntil = career().hurtUntil - st.day; out.alive = !!G.state && !G.state.fallen && G.dialog.event.title === 'Battle Stations';
    // she breaks off, and the owner writes it in the log
    fresh('pirate'); endAs('broke'); out.off = G.dialog.event.text; out.xp = skillXp('gunner') - xp;
    out.patrol = (fresh('patrol'), G.dialog.event.title); out.patrolDuel = !!G.duel;
    G.state.career = undefined; out.never = lockPost(); G.dialog = null; G.nextEvent = null; startDuel({ kind: 'pirate' }, false); out.neverDuel = !!G.duel;
    return out;
  });
  assert.ok(r.owner); assert.match(r.text, /Battle stations/); assert.equal(r.title, 'Battle Stations'); assert.equal(r.duel, false, 'no card duel');
  assert.ok(r.radar, 'on the radar'); assert.equal(r.nerve, 3, 'there is no captain: the order is picked at a steady nerve');
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
    st.crew = st.crew.filter(id => person(id).role !== 'medic' && !(CAST[person(id).cast] || {}).firstAid)  // no medic, and no first aid (the bosun's, #879); st.injured = {}; delete h.hurtUntil;
    for (const id of st.crew) { person(id).opinion = 0; delete person(id).owes; }  // nobody to take it for you
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.01, 0.999, 0.99, 0.01, 0.99]);  // a casualty, on the hand (the last of the pool), no death; then the hand's own roll, and no death
    return { line: heavy(60), days: h.hurtUntil - st.day };
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
    endAs('crippled');
    choose('Let her drift'); out.drift = cap.memories[cap.memories.length - 1];
    raid('gunner'); cap = person(hired().captain);
    const gov = 'Arcology Pact', spare = window.realMakeEnemy({ kind: 'patrol', gov }); window.makeEnemy = () => Object.assign(spare, { shipId: 'cutter', armor: SHIPS.cutter.armor, maxArmor: SHIPS.cutter.armor });
    startDuel({ kind: 'patrol', gov }, false); begin();
    endAs('broke');  // she breaks off, and does not just get away
    out.navy = cap.memories[cap.memories.length - 1];
    return out;
  });
  assert.doesNotMatch(r.drift, /broke off/, r.drift); assert.match(r.drift, /drift/, r.drift);
  assert.doesNotMatch(r.navy, /raid/, r.navy); assert.match(r.navy, /navy/, r.navy);
  await done();
});

test('outrunning a contact adds RUN_DAYS to the burn and says so', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('pilot'); const t = G.transit, eta0 = transitEta(t), days0 = transitDays(t), out = { runDays: RUN_DAYS };
    rolls([0.01]); out.text = startDuel({ kind: 'pirate' }, true);
    out.eta = transitEta(t) - eta0; out.days = transitDays(t) - days0;
    return out;
  });
  assert.equal(r.runDays, 2); assert.equal(r.eta, 2, 'the burn ends two days later'); assert.equal(r.days, 2, 'and arrival moves the date by them');
  assert.match(r.text, /opens the range/); assert.match(r.text, /The run costs 2 days on the burn\./);
  await done();
});

test('a spoof and a pay-off cost the same days', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, pick = (re, roll) => {
      const st = raid('comms'); st.credits = 100000; hired().skill.comms = SKILL_STEPS[3]; G.dialog = null; openEvent(contactEvent({ kind: 'pirate' }));
      const t = G.transit, eta0 = transitEta(t), i = G.dialog.choices.findIndex(c => re.test(c.label));
      rolls([roll]); const text = chooseEvent(i);
      return { text, eta: transitEta(t) - eta0 };
    };
    out.spoof = pick(/Spoof/, 0.01); out.pay = pick(/^Pay them off/, 0.5);
    out.failed = pick(/Spoof/, 0.99);  // a spoof that fails goes on into the fight, and costs no days
    return out;
  });
  for (const k of ['spoof', 'pay']) { assert.equal(r[k].eta, 2, k); assert.match(r[k].text, /The run costs 2 days on the burn\./, k); }
  assert.equal(r.failed.eta, 0); assert.doesNotMatch(r.failed.text, /costs/);
  await done();
});

test('a ladder step run from stays due and comes again on the next burn', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('pilot'), h = hired(); h.runsDone = 1;
    const spec = ladderNext(h, st, 'mars').spec;
    G.dialog = null; openEvent(contactEvent(spec));
    const shown = ((h.fights || { done: [] }).done.slice());
    rolls([0.01]); chooseEvent(G.dialog.choices.findIndex(c => /outrun/.test(c.label)));
    return { shown, done: ((h.fights || { done: [] }).done.slice()), next: (ladderNext(h, st, 'mars') || {}).id, again: handIntercept(h, st, 'mars', 0).ladder };
  });
  assert.deepEqual(r.shown, [], 'showing the contact does not meet it'); assert.deepEqual(r.done, [], 'an outrun does not either');
  assert.equal(r.next, 'raider'); assert.equal(r.again, 'raider');
  await done();
});

test('a ladder step is met when its fight starts, also after a failed run', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    for (const [name, flee, roll] of [['battle', false, 0.5], ['failedRun', true, 0.99], ['clearRun', true, 0.01]]) {
      const st = raid('pilot'), h = hired(); h.runsDone = 1; const spec = ladderNext(h, st, 'mars').spec;
      rolls([roll]); startDuel(spec, flee); out[name] = ((h.fights || { done: [] }).done.slice());
    }
    return out;
  });
  assert.deepEqual(r.battle, ['raider']); assert.deepEqual(r.failedRun, ['raider']); assert.deepEqual(r.clearRun, []);
  await done();
});

test('a contract due on the arrival day is late after a run', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('pilot'), h = hired(), t = G.transit, due = transitEta(t), before = transitEta(t) > due;
    const planet = system().planets[0];
    h.run = { contract: true, good: 'water', tons: 10, pay: 1000, due, shipper: 'Test Shipper', cost: 0, day: st.day, from: 'Earth', planet: planet.name, sid: t.to, profit: 0, days: t.days };
    st.cargo = { water: 10 }; st.paid = { water: 0 };
    rolls([0.01]); startDuel({ kind: 'pirate' }, true); __seed(3);
    const eta = transitEta(t), lateBy = eta - due;
    arrive(); settleRun(planet);
    return { before, lateBy, day: st.day, late: h.ledger[0] && h.ledger[0].late, due };
  });
  assert.equal(r.before, false); assert.equal(r.lateBy, 2); assert.equal(r.late, 2, 'delivered two days late');
  await done();
});
