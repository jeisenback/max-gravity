'use strict';

// Jobs on the station (js/jobs.js): the board, the checks, the danger, and the pay going to your own savings.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed';
    return st;
  };
  window.rolls = list => { const l = [...list], real = Math.random; Math.random = () => (l.length ? l.shift() : real()); };
};

test('a hand sees two jobs, the same two all visit, and works one a visit', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {};
    const a = jobBoard().ids.join(), b = jobBoard().ids.join();
    out.n = jobBoard().ids.length; out.stable = a === b; out.html = /Jobs on the station/.test(jobsHtml());
    Mods.act('takeJob', jobBoard().ids[0]); out.opened = !!G.dialog; G.dialog = null; G.nextEvent = null;
    Mods.act('takeJob', jobBoard().ids[1]); out.second = !!G.dialog;
    st.day += 3; out.sameVisit = jobBoard().done === true;  // a day passing in port (a job's own day, a night of a stay) is no second board
    G.dialog = null; G.nextEvent = null; Mods.emit('landed', currentPlanet()); while (G.dialog) finishEvent(); out.next = jobBoard().done === false;
    return out;
  });
  assert.equal(r.n, 2); assert.ok(r.stable); assert.ok(r.html); assert.ok(r.opened); assert.equal(r.second, false, 'one a visit'); assert.ok(r.sameVisit, 'the board is the visit\'s'); assert.ok(r.next, 'a new board at a new landing');
  await done();
});

test('every choice of every job works for every post, pays your savings and takes the day', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = { bad: [], paid: 0, days: [] }, real = Math.random;
    for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
      const st = setup(post);
      for (const job of JOBS) {
        for (let si = 0; si < job.stages.length; si++) {
          const n = jobStage(job, si).choices.length;
          for (let ci = 0; ci < n; ci++) for (const roll of [0.01, 0.99]) {
            hired().fund = 777; st.credits = 1000; st.injured = {}; hired().hurtUntil = 0;
            const e = jobStage(job, si); G.dialog = { event: e, choices: e.choices }; G.nextEvent = null;
            const day0 = st.day; let first = true; Math.random = () => { if (first) { first = false; return roll; } return real(); };  // only the check roll is forced: a constant random hangs the generators when the day passes
            let text; try { text = chooseEvent(ci); } finally { Math.random = real; }
            if (!text || /undefined|NaN|\{[a-z]/.test(text) || /undefined|NaN|\{[a-z]/.test(e.text + e.choices.map(c => c.label).join(' '))) out.bad.push(`${job.id}:${si}:${ci}:${roll}`);
            if (hired().fund !== 777) out.bad.push(`fund ${job.id}`);
            out.paid += Math.max(0, st.credits - 1000); if (!G.nextEvent) out.days.push(st.day - day0);
            G.dialog = null; G.nextEvent = null;
          }
        }
      }
    }
    out.minDay = Math.min(...out.days); out.maxDay = Math.max(...out.days);
    return out;
  });
  assert.deepEqual(r.bad, []); assert.ok(r.paid > 0); assert.equal(r.minDay, 1); assert.equal(r.maxDay, 1);
  await done();
});

test('the checks follow your post and level and a crew member\'s help, and a lost one can hurt you', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup('engineer'), out = {};
    const noCrew = st.crew.slice(); st.crew = [];
    const h = hired(); h.skill = {}; out.low = jobOdds({ post: 'engineer' }); h.skill.engineer = 200; out.high = jobOdds({ post: 'engineer' }); out.other = jobOdds({ post: 'comms' });
    st.crew = noCrew; const base = jobOdds({ post: 'engineer' });
    // a lost danger roll hurts you
    st.crew = []; st.injured = {}; h.hurtUntil = 0; const lock = JOBS.find(j => j.id === 'lock'), e = jobStage(lock, 0); G.dialog = { event: e, choices: e.choices };
    rolls([0.99]); const text = chooseEvent(e.choices.findIndex(c => /Cut the manual release/.test(c.label)));
    out.hurt = handHurt(); out.text = text; out.label = e.choices[0].label; out.labels = e.choices.map(c => c.label);
    out.message = jobStage(JOBS.find(j => j.id === 'message'), 0).choices.map(c => c.label);
    return out;
  });
  assert.ok(r.high > r.low); assert.ok(r.high > r.other);
  assert.ok(r.hurt); assert.match(r.text, /You are hurt/);
  // the note: the post the check is on, the odds the roll uses, and what the lost roll declares
  assert.match(r.label, new RegExp(`\\[Engineer, ${Math.round(r.high * 100)}%; if it fails: you may be hurt\\]$`), r.label);
  assert.match(r.labels[1], /\[Comms, \d+%; if it fails: the captain marks it\]$/, r.labels[1]);
  assert.ok(!r.labels[3].includes('['), `a sure choice carries no note: ${r.labels[3]}`);
  assert.match(r.message[0], /\[Comms, \d+%; if it fails: 60 cr of your own, your standing here\]$/, r.message[0]);
  await done();
});
