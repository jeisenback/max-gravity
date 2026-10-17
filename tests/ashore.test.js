'use strict';

// The crew ashore (ashore.js, #673): a comms line at a burn's start on where one of them went, by trait and by the day; and now and then an errand
// a crew member asks you along on at a port, by culture or the clinic, remembered when you go.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; G.dialog = null; G.nextEvent = null;
    const p = makePerson('belt'); p.role = 'cook'; p.skill = 1; p.memories = []; p.opinion = 0; p.mood = null; p.traits = ['greedy', 'kind']; registerPerson(p); st.crew.push(p.id);
    return { st, p };
  };
};

test('a burn begins with one line on where a crew member went at the port, by trait and by the day, and only one', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {}, port = st.planet;
    for (const id of st.crew) if (id !== p.id && st.people[id]) st.people[id].traits = ['kind', 'brave'];  // the others have lines too; the day picks who
    out.byDay = [0, 1, 2, 3].map(d => { st.day = 100 + d; return ashoreLine(st, port); });
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    const before = G.transit.comms.length; lifeTick(0.05); updateTransit(0.01); Mods.emit('frame', 0.05); Mods.emit('frame', 0.05);
    out.lines = G.transit.comms.slice(before).filter(l => /^\[Ship\] /.test(l) && / (from|at|into|on|the stop at) /.test(l));
    return { ...out, first: p.first, greedy: ashoreLines().greedy.map(l => l.split('{n} ')[1].split('{port}')[0]) };
  });
  assert.ok(r.byDay.every(l => typeof l === 'string' && l.length > 20), 'a line on every day');
  assert.ok(new Set(r.byDay).size >= 2, 'the day picks the person or the line');
  assert.equal(r.lines.length, 1, `one ashore line at the burn's start (${r.lines})`);
  await done();
});

test('an errand is due for a friend, not inside the gap, on the days their hash picks, and is a crew candidate at a port; going along is remembered', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p } = setup(), out = {};
    for (const id of st.crew) if (id !== p.id && st.people[id]) st.people[id].opinion = 0;
    out.cold = errandDue(st);  // no regard
    p.opinion = OPINION.FRIEND; let n = 0; while (!errandDue(st) && n++ < 10) st.day++; out.due = errandDue(st) === p; out.within = n <= ERRAND_EVERY;
    const cands = Mods.filter('happenings', [], 'port', currentPlanet()).filter(c => c.errand);  // the cat and the offer to join are crew candidates too
    out.candidate = cands.length === 1; const ev = cands[0].make(); out.asked = p.errandAt === st.day; out.title = ev.title; out.kind = /water office/.test(ev.text);
    out.gapped = errandDue(st); st.day += ERRAND_GAP; while (!errandDue(st)) st.day++; out.again = errandDue(st) === p;
    const op = p.opinion; G.dialog = { event: ev, choices: ev.choices }; const res = chooseEvent(0);
    out.liked = p.opinion - op; out.mem = p.memories.slice(-1)[0]; out.res = res.length > 80;
    const ev2 = errandEvent(p); const op2 = p.opinion, m2 = p.memories.length; G.dialog = { event: ev2, choices: ev2.choices }; chooseEvent(1); out.stay = p.opinion === op2 && p.memories.length === m2;
    st.injured = { [p.id]: true }; out.clinic = /clinic/.test(errandEvent(p).text);
    return out;
  });
  assert.equal(r.cold, null); assert.ok(r.due && r.within, 'due within a hand of days once they think well of you');
  assert.ok(r.candidate && r.asked); assert.equal(r.title, 'An Errand Ashore'); assert.ok(r.kind, 'a Belt hand goes to the water office');
  assert.equal(r.gapped, null, 'not again inside the gap'); assert.ok(r.again);
  assert.equal(r.liked, 1); assert.match(r.mem, /water office/); assert.ok(r.res && r.stay); assert.ok(r.clinic, 'hurt, the errand is the clinic');
  await done();
});
