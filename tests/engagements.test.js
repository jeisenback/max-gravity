'use strict';

// The raid engagement for a hired hand: pirates make contact, and it plays in beats instead of the card duel.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.raid = (post = 'gunner', shipId = 'raider') => {
    __seed(1);  // a constant random (rolls, below) hangs the generators, so every game starts from the seeded one
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy;
    const spare = window.realMakeEnemy({ kind: 'pirate' });  // made now: the enemy's person cannot be made under a constant random
    window.makeEnemy = () => Object.assign(spare, { shipId });  // the style of the raider or the corsair
    return st;
  };
  window.rolls = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : 0.99); };
  window.begin = () => { const e = G.nextEvent; G.nextEvent = null; openEvent(e); };  // the first scene; later ones open from finishEvent
  window.choose = (label) => { const i = G.dialog.choices.findIndex(c => c.label.includes(label)); const t = chooseEvent(i); return t; };
};

test('a pirate contact for a hired hand opens the raid, not the card duel, and the scenes are yours to decide', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('pilot'); const text = startDuel({ kind: 'pirate' }, false);
    begin();
    return { text: /Battle stations/.test(text), title: G.dialog.event.title, duel: !!G.duel, decided: !!G.dialog.event.decided, labels: G.dialog.choices.map(c => c.label), pos: /Position: even/.test(G.dialog.event.text) };
  });
  assert.ok(r.text); assert.equal(r.title, 'The Closing'); assert.equal(r.duel, false); assert.ok(!r.decided, 'the captain does not take this call');
  assert.equal(r.labels.length, 4); assert.ok(r.labels.some(l => l === '[Pilot] Put the sun behind us')); assert.ok(r.pos);
  await done();
});

test('winning the beats makes her break off, and costs nothing but a log line and some experience', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), cap = person(hired().captain), op = cap.opinion, xp = skillXp('gunner'), armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.01, 0.01]);  // the screen and the burn both work: +1 each, ahead by two at the close, so she breaks off
    choose('Hold course'); finishEvent();
    choose('Fire the point defense'); finishEvent();
    const mid = /Position: ahead|Position: even/.test(G.dialog.event.text);
    const c = choose('Burn evasive');
    return { mid, off: /breaks off/.test(c), opinion: cap.opinion - op, xp: skillXp('gunner') - xp, armor: st.armor === armor, next: !!G.nextEvent };
  });
  assert.ok(r.mid); assert.ok(r.off); assert.equal(r.opinion, 1); assert.equal(r.xp, 3); assert.ok(r.armor); assert.equal(r.next, false);
  await done();
});

test('losing the beats puts her alongside, and the fight goes to the lock', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('engineer'), armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.99, 0.99, 0.99, 0.99, 0.99, 0.99]);  // every choice fails: -1, -1, -1 or worse
    const out = {};
    out.a = choose('Turn into her'); finishEvent();  // -2, and hull
    out.second = G.dialog.event.title;
    out.b = choose('Burn evasive');
    out.next = G.nextEvent && G.nextEvent.title; out.alongside = /alongside/.test(out.b); out.hull = st.armor < armor;
    return out;
  });
  assert.equal(r.second, 'First Pass'); assert.ok(r.alongside, r.b); assert.equal(r.next, 'The Corridor', 'a raider comes in at the corridor'); assert.ok(r.hull);
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
      rolls([0.99, 0.99, 0.99]);
      choose('Turn into her'); finishEvent();
      out[shipId].pass = G.dialog.event.text.slice(0, 30);
      const t = choose('Return fire');
      out[shipId].boarded = t.includes('torpedo takes') ? 'torpedo' : t.includes('grapples') ? 'grapple' : '';
      out[shipId].pos = G.nextEvent && G.nextEvent.text.includes('Boarders: ');
      const n = G.nextEvent.text.match(/Boarders: (\d+)/); out[shipId].boarders = n && +n[1];
    }
    return out;
  });
  assert.notEqual(r.raider.open, r.corsair.open); assert.notEqual(r.raider.pass, r.corsair.pass);
  assert.equal(r.raider.boarded, 'grapple'); assert.equal(r.corsair.boarded, 'torpedo');
  assert.ok(r.raider.pos && r.corsair.pos);
  assert.ok(r.raider.boarders > r.corsair.boarders - 3, 'a full run for a raider, a short one for a corsair');
  await done();
});

test('burning hard can get clear before there is a fight, and failing costs hull and starts one behind', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('pilot'), armor = st.armor, out = {};
    rolls([0.01]); out.clear = startDuel({ kind: 'pirate' }, true); out.none = !G.nextEvent;
    rolls([0.99]); out.text = startDuel({ kind: 'pirate' }, true); out.next = G.nextEvent && G.nextEvent.title; out.hull = st.armor < armor; out.behind = /Position: even/.test(G.nextEvent.text) === false;
    return out;
  });
  assert.match(r.clear, /opens the range/); assert.ok(r.none);
  assert.equal(r.next, 'The Closing'); assert.ok(r.hull); assert.ok(r.behind, 'one behind from the start');
  await done();
});

test('other contacts for a hired hand are still the card duel', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => { raid('gunner'); startDuel({ kind: 'hunter', person: { first: 'Ana', last: 'Voss' } }, false); return { duel: !!G.duel, next: G.nextEvent && G.nextEvent.title }; });
  assert.ok(r.duel); assert.match(r.next, /Contact: exchange/);
  await done();
});

test('winning every beat cripples her, and boarding her is the lock fight run the other way: a win takes her strongbox', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion, xp = skillXp('gunner'), fund = h.fund, out = {};
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.01, 0.01]);  // the post choice works twice: +2 and +2
    choose('Get a lock'); finishEvent();
    const t = choose('Walk a burst');
    out.crippled = /takes her drive|plume goes out/.test(t); out.title = G.nextEvent.title; out.labels = G.nextEvent.choices.map(c => c.label);
    begin();  // Dead in Space
    rolls([0.01, 0.99, 0.01, 0.99]);  // a post win and no one hurt, twice: to the corridor and to her bridge, and the bridge is taken
    choose('Board her'); finishEvent();
    out.first = G.dialog.event.title; out.defenders = /Defenders: \d+/.test(G.dialog.event.text);
    out.mid = choose('Put fire down the corridor'); finishEvent();
    out.second = G.dialog.event.title;
    out.end = choose('Put fire down the corridor');
    out.taken = /strongbox/.test(out.end); out.fund = h.fund - fund; out.opinion = cap.opinion - op; out.xp = skillXp('gunner') - xp; out.next = G.nextEvent;
    return out;
  });
  assert.ok(r.crippled, 'a clear win cripples her'); assert.equal(r.title, 'Dead in Space'); assert.deepEqual(r.labels, ['Board her', 'Let her drift']);
  assert.equal(r.first, 'Her Corridor'); assert.ok(r.defenders); assert.equal(r.second, 'Her Bridge');
  assert.ok(r.taken, r.end); assert.ok(r.fund >= 1000 && r.fund <= 3000, `fund ${r.fund}`); assert.equal(r.opinion, 4, 'two calls that turned it, and the strongbox'); assert.equal(r.xp, 5);
  assert.equal(r.next, null);
  await done();
});

test('losing the boarding drives you back to your lock, and she drifts on', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion, fund = h.fund, armor = st.armor;
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.01, 0.01]); choose('Get a lock'); finishEvent(); choose('Walk a burst'); begin();
    rolls([0.99, 0.99, 0.99, 0.99]);  // every exchange fails
    choose('Board her'); finishEvent();
    choose('Put fire down the corridor'); finishEvent();
    const end = choose('Put fire down the corridor');
    return { end: /driven back/.test(end), fund: h.fund === fund, opinion: cap.opinion - op, armor: st.armor < armor, next: G.nextEvent };
  });
  assert.ok(r.end); assert.ok(r.fund); assert.equal(r.opinion, 1, 'two winning calls, and the boarding lost'); assert.ok(r.armor); assert.equal(r.next, null);
  await done();
});

test('she can be let drift instead: the same as breaking her off', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), cap = person(h.captain), op = cap.opinion, xp = skillXp('gunner');
    startDuel({ kind: 'pirate' }, false); begin();
    rolls([0.01, 0.01]); choose('Get a lock'); finishEvent(); choose('Walk a burst'); begin();
    const t = choose('Let her drift');
    return { t: /experience/.test(t), opinion: cap.opinion - op, xp: skillXp('gunner') - xp, next: G.nextEvent };
  });
  assert.ok(r.t); assert.equal(r.opinion, 3, 'two winning calls, and she broke off'); assert.equal(r.xp, 3); assert.equal(r.next, null);
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

test('answering a trap blind springs it, and you start the raid two behind', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    raid('pilot'); rolls([0.01]);  // a trap
    const e = ambushScene(); G.dialog = { event: e, choices: e.choices };
    const labels = e.choices.map(c => c.label);
    const t = chooseEvent(e.choices.findIndex(c => c.label === 'Go to her'));
    return { title: e.title, labels, sprung: /lights a drive/.test(t), next: G.nextEvent && G.nextEvent.title, behind: G.nextEvent && /Position: behind/.test(G.nextEvent.text), waiting: G.nextEvent && /waiting on the far side/.test(G.nextEvent.text) };
  });
  assert.equal(r.title, 'A Freighter in Trouble'); assert.deepEqual(r.labels, ['Go to her', 'Leave it', '[Pilot] Match her tumble']);
  assert.ok(r.sprung); assert.equal(r.next, 'The Closing'); assert.ok(r.behind && r.waiting);
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
    const hit = chooseEvent(out.labels.indexOf('Hit them before they are ready')); out.hit = /not ready/.test(hit); finishEvent();
    out.ahead = /Position: ahead/.test(G.dialog.event.text);
    return out;
  });
  assert.ok(r.read); assert.deepEqual(r.labels, ['Hit them before they are ready', 'Turn away and leave it']); assert.ok(r.hit && r.ahead);
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
    const real = chooseEvent(e.choices.findIndex(c => c.label === 'Go to her')); out.real = /She is real/.test(real); out.fund = h.fund; out.realOp = cap.opinion - op;
    st.ambushAt = -1000; op = cap.opinion; rolls([0.99, 0.01]);  // real, and the read shows it
    e = ambushScene(); G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /Scan her hull/.test(c.label))); finishEvent();
    chooseEvent(G.dialog.choices.findIndex(c => c.label === 'Leave her')); out.leftOp = cap.opinion - op;
    return out;
  });
  assert.ok(r.away); assert.equal(r.awayOp, 1); assert.equal(r.xp, 2);
  assert.ok(r.real); assert.equal(r.fund, 1500); assert.equal(r.realOp, 1); assert.equal(r.leftOp, -1);
  await done();
});

test('a hostile patrol is a navy stop for a hired hand: the same beats with guns, and firing on her costs your standing', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), gov = 'Earth Coalition', before = repOf(gov);
    const spare = window.realMakeEnemy({ kind: 'patrol', gov }); window.makeEnemy = () => Object.assign(spare, { shipId: 'cutter' });
    const text = startDuel({ kind: 'patrol', gov }, false); begin();
    const out = { duel: !!G.duel, title: G.dialog.event.title, open: /patrol/.test(G.dialog.event.text), rep: repOf(gov) - before, text: /Battle stations/.test(text) };
    rolls([0.01, 0.01]);  // two post wins: +2 and +2, which would cripple a raider
    choose('Get a lock'); finishEvent();
    const t = choose('Walk a burst');
    out.off = /registry has been logged/.test(t); out.boardable = !!(G.nextEvent && G.nextEvent.title === 'Dead in Space');
    return out;
  });
  assert.equal(r.duel, false); assert.equal(r.title, 'The Closing'); assert.ok(r.open && r.text); assert.equal(r.rep, -8);
  assert.ok(r.off, 'she breaks off with a warning'); assert.ok(!r.boardable, 'a navy ship is not boarded');
  await done();
});

test('a hired hand can heave to and let the ship pay a quarter of its fund, instead of fighting', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), h = hired(), gov = 'Earth Coalition', cap = person(h.captain), op = cap.opinion;
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
    const st = raid('gunner'), h = hired(), gov = 'Earth Coalition';
    const spare = window.realMakeEnemy({ kind: 'patrol', gov }); Object.assign(spare, { shipId: 'cutter' });
    h.fund = 1000;
    const d = { foe: spare, foeHp: 0, init: 'foe' }, s = repelStart(d, 'full');
    rolls([0.99, 0.99, 0.99, 0.99]);  // every exchange fails, and no one is hurt
    repelStep(s, 'post');
    const text = repelStep(s, 'post');
    return { levy: /levy of 300 cr/.test(text), fund: h.fund };
  });
  assert.ok(r.levy); assert.equal(r.fund, 700);
  await done();
});

test('your own bold call can go wrong on you: hurt, a clinic bill without a medic, and the captain remembers it', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), out = {}, h = hired(), cap = person(h.captain);
    st.crew = st.crew.filter(id => person(id).role !== 'medic'); st.injured = {};
    startDuel({ kind: 'pirate' }, false); begin();
    cap.opinion = 0; const cred = st.credits;
    rolls([0.99, 0.01]);  // the call fails, and it is the kind that hurts you
    const text = choose('Turn into her');
    out.hurt = handHurt(); out.text = text; out.paid = cred - st.credits; out.cap = cap.opinion;
    // a cautious choice does not risk you, even when it fails
    const st2 = raid('gunner'); st2.crew = st2.crew.filter(id => person(id).role !== 'medic');
    startDuel({ kind: 'pirate' }, false); begin(); hired().hurtUntil = 0;
    rolls([0.99, 0.01]); choose('Hold course'); out.safeHurt = handHurt();
    return out;
  });
  assert.ok(r.hurt, 'hurt on a bold call'); assert.match(r.text, /clinic is 150 cr of your own/); assert.equal(r.paid, 150); assert.ok(r.cap < 0, 'the captain notes a call that went wrong');
  assert.equal(r.safeHurt, false);
  await done();
});

test('a medic aboard treats you free, and a bold call that wins earns the captain\'s regard', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = raid('gunner'), out = {}, h = hired(), cap = person(h.captain);
    startDuel({ kind: 'pirate' }, false); begin();
    cap.opinion = 0; rolls([0.01]);  // the call works
    choose('Turn into her'); out.won = cap.opinion;
    const st2 = raid('gunner'); const medic = makePerson('earth'); medic.role = 'medic'; medic.skill = 1; registerPerson(medic); st2.crew.push(medic.id); st2.injured = {};
    startDuel({ kind: 'pirate' }, false); begin(); const cred = st2.credits;
    rolls([0.99, 0.01]); const text = choose('Turn into her'); out.free = { hurt: handHurt(), paid: cred - st2.credits, bill: /clinic is/.test(text) };
    return out;
  });
  assert.ok(r.won > 0); assert.deepEqual(r.free, { hurt: true, paid: 0, bill: false });
  await done();
});
