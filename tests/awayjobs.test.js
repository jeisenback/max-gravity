'use strict';

// Work elsewhere (js/awayjobs.js): offers at a board, putting it to the captain, and the job at the far end.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (post = 'gunner') => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.tutorial = null; G.mode = 'landed'; hired().away = [];
    return st;
  };
  window.rolls = list => { const l = [...list], real = Math.random; Math.random = () => (l.length ? l.shift() : real()); };
  window.offerOne = () => { const h = hired(), st = G.state; for (let i = 0; i < 60 && !h.away.length; i++) { Mods.emit('landed', currentPlanet()); G.dialog = null; G.nextEvent = null; } return h.away[0]; };
};

test('a board offers work elsewhere, at most two, with the names filled in, on the Missions tab', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {};
    for (let i = 0; i < 120; i++) { Mods.emit('landed', currentPlanet()); G.dialog = null; G.nextEvent = null; }
    const h = hired();
    out.n = h.away.length; out.far = h.away.every(a => a.sid !== st.systemId); out.templates = new Set(h.away.map(a => a.tpl)).size === h.away.length;
    out.html = awayHtml(); out.ok = !/\{\w+\}/.test(out.html) && /Work elsewhere/.test(out.html);
    st.day += 100; Mods.emit('landed', currentPlanet()); G.dialog = null; out.lapsed = h.away.every(a => a.until >= st.day);
    return { n: out.n, far: out.far, templates: out.templates, ok: out.ok, lapsed: out.lapsed };
  });
  assert.ok(r.n >= 1 && r.n <= 2); assert.ok(r.far); assert.ok(r.templates); assert.ok(r.ok); assert.ok(r.lapsed);
  await done();
});

test('putting it to the captain: their character decides, a yes sets the run, a no leaves it, once a stop', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {}, h = hired(), cap = hiredCaptain();
    const a = offerOne(); cap.opinion = 1;
    const pay = PITCH.find(p => p.id === 'pay'), right = PITCH.find(p => p.id === 'right');
    cap.traits = ['greedy', 'secretive']; out.greedyPay = pitchOdds(pay, a); out.greedyRight = pitchOdds(right, a);
    cap.traits = ['kind', 'pious']; out.kindPay = pitchOdds(pay, a); out.kindRight = pitchOdds(right, a);
    const owed = pitchScene(a).choices.find(c => /owes you/.test(c.label)); out.owedGated = !!owed && owed.opinion.min === OPINION.FRIEND;  // shown shut below it, by openEvent (captains.test.js)
    cap.traits = ['greedy', 'secretive']; out.labels = pitchScene(a).choices.map(c => c.label);  // each argument says its odds, and one she hates says it costs her regard
    // a no
    let e = pitchScene(a); G.dialog = { event: e, choices: e.choices }; rolls([0.999]); const no = chooseEvent(0); G.dialog = null;
    out.no = { text: no, booked: a.booked, run: currentPlan() && currentPlan().planet !== a.planet, once: pitchedNow(a), html: /disabled/.test(awayHtml()) };
    // a yes
    a.pitched = null; e = pitchScene(a); G.dialog = { event: e, choices: e.choices }; rolls([0.001]); const yes = chooseEvent(0); G.dialog = null;
    out.yes = { text: yes, booked: a.booked, planet: currentPlan().planet === a.planet, sid: currentPlan().sid === a.sid, shown: /flying you there/.test(awayHtml()) };
    return out;
  });
  assert.ok(r.greedyPay > r.greedyRight, 'a greedy captain hears the money'); assert.ok(r.kindRight > r.kindPay, 'a kind one hears what is right');
  assert.ok(r.owedGated, 'the friendly argument is always listed, and needs the captain\'s friendship');
  assert.ok(r.labels.slice(0, 4).every(l => /\[\d+%/.test(l)), r.labels.join(' | ')); assert.match(r.labels[2], /\[\d+%; if it fails: the captain marks it\]$/, r.labels[2]); assert.ok(!r.labels[0].includes('if it fails'), r.labels[0]);
  assert.ok(!r.labels[4].includes('['), `never: no roll, no note: ${r.labels[4]}`);
  assert.equal(r.no.booked, false); assert.ok(r.no.run); assert.ok(r.no.once); assert.ok(r.no.html); assert.match(r.no.text, /Not this run/);
  assert.ok(r.yes.booked && r.yes.planet && r.yes.sid && r.yes.shown); assert.match(r.yes.text, /The run is set for/);
  await done();
});

test('at the far end the job plays: every stage and choice works for every post, and the pay is your own', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const out = { bad: [], opened: false }, real = Math.random;
    const st = setup(), a = offerOne();
    // arriving at the port the job is at opens it
    const planet = SYSTEMS[a.sid].planets.find(p => p.name === a.planet), here0 = st.systemId; st.systemId = a.sid;
    G.dialog = null; G.nextEvent = null; Mods.emit('landed', planet);
    out.opened = !!G.dialog && /\{/.test(G.dialog.event.title) === false && G.dialog.event.title.includes(a.ctx.dest); out.removed = !hired().away.includes(a);
    G.dialog = null; G.nextEvent = null; st.systemId = here0;
    for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
      const s2 = setup(post);
      for (const tpl of AWAY) {
        const ctx = { dest: 'Ganymede', from: 'Earth', who: 'Mrs. Adeyemi', system: 'Jupiter' };
        for (let si = 0; si < tpl.stages.length; si++) {
          const n = jobStage(tpl, si, ctx).choices.length;
          for (let ci = 0; ci < n; ci++) for (const roll of [0.01, 0.99]) {
            hired().fund = 777; s2.credits = 1000; s2.injured = {}; hired().hurtUntil = 0;
            const e = jobStage(tpl, si, ctx); G.dialog = { event: e, choices: e.choices }; G.nextEvent = null;
            let first = true; Math.random = () => { if (first) { first = false; return roll; } return real(); };
            let text; try { text = chooseEvent(ci); } finally { Math.random = real; }
            const all = e.title + e.text + e.choices.map(c => c.label).join(' ') + text;
            if (!text || /undefined|NaN|\{\w+\}/.test(all)) out.bad.push(`${tpl.id}:${si}:${ci}:${roll}`);
            if (hired().fund !== 777) out.bad.push(`fund ${tpl.id}`);
            G.dialog = null; G.nextEvent = null;
          }
        }
      }
    }
    return out;
  });
  assert.ok(r.opened, 'the job opens on arrival'); assert.ok(r.removed); assert.deepEqual(r.bad, []);
  await done();
});

test('a run the captain agreed to is the one she flies: it stands through a day in port, a second pitch waits, a change of run is said, and a busy landing keeps the job on the page (#848)', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), out = {}, h = hired(), a = offerOne();
    out.instead = /in mind/.test(pitchScene(a).text) && !/\{\w+\}/.test(pitchScene(a).text);  // the pitch says what it would replace
    let e = pitchScene(a); G.dialog = { event: e, choices: e.choices }; rolls([0.001]); chooseEvent(0); G.dialog = null;
    st.day++; out.stands = currentPlan().planet === a.planet && currentPlan().sid === a.sid;  // the morning's remake keeps it
    const b = { ...a, pitched: null, booked: false }; h.away.push(b);
    out.shut = /data-arg="1" disabled/.test(awayHtml()); Mods.act('pitchJob', 1); out.unopened = !G.dialog;
    h.away = []; UI.notes.length = 0;  // with nothing agreed, a remade run that differs is said
    h.plan.day = st.day - 1; h.plan.run = { ...h.plan.run, sid: 'nowhere', planet: 'Nowhere Station', ballast: true };
    currentPlan(); out.said = UI.notes.find(n => /^Captain \w+ drops a light run to Nowhere Station/.test(n)) || UI.notes.join(' | ');
    // the far end, with the landing's scenes already queued: the job waits on the Missions page
    a.booked = true; h.away = [a]; UI.notes.length = 0;
    const planet = SYSTEMS[a.sid].planets.find(p => p.name === a.planet); st.systemId = a.sid; st.planet = a.planet;
    G.dialog = { event: { title: 'busy' }, choices: [] }; G.nextEvent = { title: 'also busy', choices: [] };
    Mods.emit('landed', planet);
    out.kept = h.away.includes(a) && UI.notes.some(n => /waiting for you on the Missions page/.test(n));
    G.dialog = null; G.nextEvent = null;
    out.go = /data-action="awayGo"/.test(awayHtml()); Mods.act('awayGo', 0);
    out.opened = !!G.dialog && G.dialog.event.title.includes(a.ctx.dest) && !h.away.includes(a);
    G.dialog = null;
    return out;
  });
  assert.ok(r.instead, 'the pitch names the run it would replace');
  assert.ok(r.stands, 'the agreed run stands through a day in port');
  assert.ok(r.shut, 'a second pitch is shut while one is agreed'); assert.ok(r.unopened);
  assert.match(r.said, /^Captain \w+ drops a light run to Nowhere Station/);
  assert.ok(r.kept, 'a busy landing keeps the job, and says so'); assert.ok(r.go, 'the page offers it'); assert.ok(r.opened, 'and the button opens it');
  await done();
});
