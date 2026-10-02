'use strict';

// Sails the hired hand's captain for N runs with random answers and reports runs, days and pay: the tuning tool for the
// chapter's economy (HIRED_FUND, HIRED_WAGE, HIRED_SHARE, HIRED_TARGET in js/hired.js).
//   node tools/soak.js --seeds 1,2,3 --legs 40

const { open, closeBrowser } = require('../tests/helpers');

async function soak({ seed = 1, legs = 40, scope = 'earth-hired' } = {}) {
  const { ev, errors, ctx } = await open({ scope, seed });
  const r = await ev(maxLegs => {
    const scenes = {}, bad = [], paid = [];
    const odd = t => /undefined|NaN|\[object|\{[a-z]+\}/.test(String(t));
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' });
    const st = G.state;
    const target = typeof HIRED_TARGET === 'undefined' ? 19000 : HIRED_TARGET;
    const answer = () => {
      for (let k = 0; k < 8 && G.dialog; k++) {
        const d = G.dialog;
        scenes[d.event.title] = (scenes[d.event.title] || 0) + 1;
        if (odd(d.event.title + d.event.text)) bad.push('text: ' + d.event.title);
        const ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can());
        if (ok.length) { const res = chooseEvent(pick(ok)); if (odd(res)) bad.push('result: ' + String(res).slice(0, 80)); }
        finishEvent();
      }
      while (G.dialog) finishEvent();
    };
    answer();
    let runs = 0, stuck = 0, reached = null;
    while (runs < maxLegs && stuck < 5 && !reached) {
      try {
        UI.tab = 'bar'; UI.render();
        if (G.patrons && G.patrons.length) { openEvent(talkEvent(pick(G.patrons))); answer(); }
        if (!sail()) { stuck++; st.day += 1; continue; }
        const to = hired().run.sid, runPlanet = hired().run.planet, creditsBefore = st.credits;
        answer();
        tryBurn(); enterTransit(); G.transit.times = [];
        planOccasions();
        for (const o of G.transit.occasions) { openEvent(occasionEvent(o)); answer(); }
        for (let h = 0; h < 4; h++) { startHappening(); answer(); }
        const acts = Object.values(ACTIVITIES).filter(a => a.can());
        if (acts.length) pick(acts).run();
        const rs = relationshipScene(); if (rs) { openEvent(rs); answer(); }
        const days = G.transit.days; G.transit = null;
        for (let d = 0; d < days; d++) { st.day++; Mods.emit('newDay', st.day); }
        st.systemId = to; G.player = makeShip(st.shipId, 0, 0, 0); G.mode = 'flight'; G.npcs = [];
        land(system().planets.find(p => p.name === runPlanet) || pick(system().planets));
        answer();
        runs++;
        paid.push(st.credits - creditsBefore);
        if (st.credits >= target) reached = { runs, day: st.day, credits: st.credits };
        for (const n of UI.notes) if (odd(n)) bad.push('note: ' + n.slice(0, 80));
      } catch (e) { bad.push('threw: ' + String(e).slice(0, 120)); break; }
    }
    const avg = (a, n) => Math.round(a / Math.max(1, n));
    return { runs, days: st.day, credits: st.credits, reached, stuck, scenes, bad,
      avgPayPerRun: avg(paid.reduce((a, b) => a + b, 0), paid.length), avgDaysPerRun: Math.round(10 * st.day / Math.max(1, runs)) / 10 };
  }, legs);
  await ctx.close();
  return { seed, ...r, errors };
}

module.exports = { soak };

if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1').split(',').map(Number), legs = Number(arg('legs') || 40);
  (async () => {
    for (const seed of seeds) {
      const r = await soak({ seed, legs });
      console.log(`seed ${seed} runs ${r.runs} days ${r.days} credits ${r.credits} reached ${JSON.stringify(r.reached)} pay/run ${r.avgPayPerRun} days/run ${r.avgDaysPerRun} stuck ${r.stuck} bad ${r.bad.length} errors ${r.errors.length}`);
    }
    await closeBrowser();
  })();
}
