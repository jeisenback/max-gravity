'use strict';

// The game reads tags and ids, not words (#570). What the captain does with a choice (captainPick, hired.js) and which line the bar puts up for a condition of the world
// (roomLines, bar.js; troubleAhead, barwork.js) used to come from matching the words of a label or a sentence, so a prose pass could change them without a test saying so.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const begin = () => { window.begin = () => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; return G.state; }; };

test('the captain weighs a choice by its tags, whatever its words say', async () => {
  const g = await open();
  await g.ev(begin);
  const r = await g.ev(() => {
    begin();
    const h = hired(); h.captainKey = null;  // an older save's captain: a costly choice below 4,000 weighs 0.2, a fight 2 more
    const share = (choices, pick) => { let n = 0; for (let i = 0; i < 2000; i++) if (captainPick(choices) === choices[pick]) n++; return n / 2000; };
    const run = () => '';
    h.fund = 100;
    const out = {};
    out.costTagged = share([{ label: 'Reworded entirely', cost: true, run }, { label: 'Wait', run }], 0);
    out.costWordsOnly = share([{ label: 'Pay them off', run }, { label: 'Wait', run }], 0);
    h.fund = 100000;
    out.costRich = share([{ label: 'Reworded entirely', cost: true, run }, { label: 'Wait', run }], 0);
    out.fightTagged = share([{ label: 'Something else', fight: true, run }, { label: 'Wait', run }], 0);
    out.fightWordsOnly = share([{ label: 'Battle stations', run }, { label: 'Wait', run }], 0);
    return out;
  });
  await g.done();
  assert.ok(r.costTagged < 0.15, `a costly choice is rare when the fund is low: ${r.costTagged}`);
  assert.ok(r.costWordsOnly > 0.28, `the word "pay" alone no longer makes a choice costly: ${r.costWordsOnly}`);
  assert.ok(r.costRich > 0.28, `and it is not rare when the ship can afford it: ${r.costRich}`);
  assert.ok(r.fightTagged > 0.5, `a fight is likelier: ${r.fightTagged}`);
  assert.ok(r.fightWordsOnly < 0.4, `"Battle stations" alone is not a fight: ${r.fightWordsOnly}`);
});

test('a choice tagged self is left to the hand, whatever its words say, and the events that offer money, a fight or a tip carry their tags', async () => {
  const g = await open({ scope: 'full' });
  await g.ev(begin);
  const r = await g.ev(() => {
    const st = begin(); st.credits = 99999; st.hired.fund = 99999; uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    const run = () => 'done';
    const ev = hiredCall({ title: 'T', text: 'x', via: 'ship', choices: [{ label: 'Elsewhere', self: true, run }, { label: 'Wait', run }] });
    const out = { decided: ev.decided, said: ev.text };
    // every choice of the events a captain can decide that looks like a payment or a fight carries the tag for it
    const looksCostly = l => /pay|fine|buy/i.test(l), looksFight = l => /battle stations/i.test(l);
    const events = [...TRANSIT_EVENTS];
    for (const kind of ['pirate', 'patrol', 'bounty', 'hunter']) events.push(contactEvent({ kind, gov: 'Arcology Compact', mission: { targetName: 'X' }, person: { first: 'A', last: 'B' } }));
    events.push(agentConsoleEvent(false), agentConsoleEvent(true));
    for (const s of STORYLETS) if (s.via === 'ship') events.push(storyletEvent(s));
    out.untagged = [];
    for (const e of events) for (const c of e.choices || []) {
      const label = String(c.label);
      if (looksCostly(label) && !c.cost && !/Take payment/.test(label)) out.untagged.push(`${e.title}: ${label} (cost)`);
      if (looksFight(label) && !c.fight) out.untagged.push(`${e.title}: ${label} (fight)`);
    }
    out.count = events.length;
    return out;
  });
  await g.done();
  assert.equal(r.decided, true);
  assert.ok(!/Elsewhere/.test(r.said) || /Wait/.test(r.said), r.said);
  assert.match(r.said, /Wait/, 'the captain took the call that was not the hand\'s own');
  assert.ok(r.count > 10, `${r.count} events looked at`);
  assert.deepEqual(r.untagged, [], 'a choice that looks like a payment or a fight has its tag');
});

test('the bar and the lanes read a condition of the world by its id, not by its sentence', async () => {
  const g = await open();
  await g.ev(begin);
  const r = await g.ev(() => {
    begin();
    const real = conditions;
    window.conditions = () => [
      { id: 'shortage-water', bad: true, text: 'Dry taps' }, { id: 'war', bad: true, text: 'Trouble' }, { id: 'raids', bad: true, text: 'Noise on the band' },
      { id: 'boom', bad: false, text: 'Good times' }, { id: 'slump', bad: true, text: 'Hard times' }, { id: 'glut-water', bad: false, text: 'Water everywhere' },
    ];
    const lines = roomLines(currentPlanet()), trouble = troubleAhead();
    window.conditions = real;
    return { lines, trouble };
  });
  await g.done();
  for (const part of ['watered down', 'navy recruiter', 'raids', 'Money is loose', 'half empty']) assert.ok(r.lines.some(l => l.includes(part)), `a line with "${part}" in ${r.lines.join(' / ')}`);
  assert.ok(r.trouble.includes('Noise on the band'), `${r.trouble.join(' / ')}`);
  assert.ok(!r.trouble.includes('Trouble') && !r.trouble.includes('Hard times'), 'only the raids are trouble ahead');
});

test('every real condition of the world has an id, and a war, a boom and a slump have the ones the bar reads', async () => {
  const g = await open();
  await g.ev(begin);
  const r = await g.ev(() => {
    begin();
    const fs = factionState(), st = G.state;
    fs.war = { a: 'Arcology Compact', b: 'Dome Concord', start: st.day, until: st.day + 40, score: { 'Arcology Compact': 0, 'Dome Concord': 0 } };
    fs.prosperity['Arcology Compact'] = 0.9; fs.prosperity['Charter League'] = 0.1;
    const ids = new Set(), missing = [];
    for (const sid of Object.keys(SYSTEMS)) for (const c of conditions(sid)) { if (typeof c.id !== 'string') missing.push(c.text); ids.add(c.id.replace(/-.*/, '')); }
    return { ids: [...ids], missing };
  });
  await g.done();
  assert.deepEqual(r.missing, []);
  for (const id of ['war', 'boom', 'slump']) assert.ok(r.ids.includes(id), `${id} in ${r.ids.join()}`);
});
