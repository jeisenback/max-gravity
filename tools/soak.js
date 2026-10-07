'use strict';

// Sails the hired hand's captain for N runs with random answers and reports runs, days and pay: the tuning tool for the
// chapter's economy (HIRED_FUND, HIRED_WAGE, HIRED_SHARE, HIRED_TARGET in js/hired.js).
//   node tools/soak.js --seeds 1,2,3 --legs 40 [--captain hester] [--real-draw]
// With no captain named, the narrow build's captain (Hester, with Cato) sails every seed, as a gunner.
// Each chapter also reports who was lost or left, when (days since sign-on) and why, and how it ended if it ended early (#357):
// the hand's death (The Last Run) or the captain's loss (Without a Captain). The totals follow the last seed. Not part of `npm test`.

const { open, closeBrowser } = require('../tests/helpers');

// realDraw: the two main characters come from the pool as in the game; tests start from the pair they knew (tests/helpers.js).
async function soak({ seed = 1, legs = 40, scope = 'earth-hired', captainKey = null, realDraw = false } = {}) {
  const { ev, errors, ctx } = await open({ scope, seed, debt: true });  // the chapter's economy includes the hiring hall's bond
  const r = await ev(([maxLegs, key, real]) => {
    if (real) window.drawCastPair = realDrawCastPair;
    const scenes = {}, bad = [], paid = [], losses = [], ending = { v: null };
    const odd = t => /undefined|NaN|\[object|\{[a-z]+\}/.test(String(t));
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: key });
    const st = G.state;
    const target = typeof HIRED_TARGET === 'undefined' ? 19000 : HIRED_TARGET;
    const answer = () => {
      for (let k = 0; k < 8 && G.dialog; k++) {
        const d = G.dialog;
        if (/^(The Last Run|Without a Captain)$/.test(d.event.title)) { ending.v = { day: G.state.day - hired().since, title: d.event.title, how: (hired().died || hired().captainLost || {}).how }; G.dialog = null; return; }  // the endings start a new game: the chapter is over
        scenes[d.event.title] = (scenes[d.event.title] || 0) + 1;
        if (odd(d.event.title + d.event.text)) bad.push('text: ' + d.event.title);
        const ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can());
        if (ok.length) { const res = chooseEvent(pick(ok)); if (odd(res)) bad.push('result: ' + String(res).slice(0, 80)); }
        finishEvent();
      }
      while (G.dialog) finishEvent();
    };
    answer();
    // Who is gone from the crew since the last look: dead (the memorial or the fallen) or walked off.
    let seen = [...st.crew], marksSeen = 0;
    const tally = () => {
      const day = st.day - hired().since;
      for (const id of seen.filter(id => !st.crew.includes(id))) {
        const c = person(id), name = fullName(c), m = (st.memorial || []).find(m => m.key === id || (c.cast && m.key === c.cast)), f = (st.fallen || []).find(f => f.name === name);
        losses.push({ day, who: name, what: m || f || (c.cast && castDead(c.cast)) ? 'died' : 'left', why: m ? m.cause : f ? 'killed repelling boarders' : (dep => dep ? `opinion, at ${dep.place}` : 'opinion')((st.departed || []).find(x => x.key === c.cast)) });
      }
      seen = [...st.crew];
      const marks = Object.values(st.cast || {}).reduce((t, c) => t + (c.marks || []).length, 0);
      if (marks > marksSeen) losses.push({ day, who: `${marks - marksSeen} named`, what: 'marked', why: 'a skill point lost' });
      marksSeen = marks;
    };
    let runs = 0, stuck = 0, reached = null, offerDay = null;
    const beatDays = [], xoDays = [], waits = [], burns = [], dueBurns = {}, introRun = {};  // introRun: the run in which each main character's first scene played  // waits: days from a captain scene becoming due to its playing; burns: burns sailed with it due, the playing one included  // the day each of the captain's scenes played, and when the used ship was offered
    while (runs < maxLegs && stuck < 5 && !reached && !ending.v) {
      try {
        UI.tab = 'bar'; UI.render();
        if (G.patrons && G.patrons.length) { openEvent(talkEvent(pick(G.patrons))); answer(); }
        if (!sail()) { stuck++; st.day += 1; continue; }
        const to = hired().run.sid, runPlanet = hired().run.planet, creditsBefore = st.credits;
        answer();
        tryBurn(); enterTransit(); const draws = G.transit.times.length; G.transit.times = [];  // as many draws as the burn would make
        planOccasions();
        for (const o of G.transit.occasions) { openEvent(occasionEvent(o)); answer(); }
        const due = captainBeat(); if (due) dueBurns[due] = (dueBurns[due] || 0) + 1;  // a burn sailed with the scene due
        for (let h = 0; h < draws; h++) { startHappening(); answer(); }
        for (const c of castAboard()) if ((castRec(c.cast).arc || 0) >= 1 && !(c.cast in introRun)) introRun[c.cast] = runs + 1;
        while (beatDays.length < (hired().beats || 0)) {  // read on the day she left, before the burn's days pass
          const name = CAPTAIN_BEATS[beatDays.length];
          beatDays.push(st.day - hired().since); waits.push(st.day - hired().since - CAPTAIN_BEAT_DAYS[name]); burns.push(dueBurns[name]);
        }
        const acts = Object.values(ACTIVITIES).filter(a => a.can());
        if (acts.length) pick(acts).run();
        const rs = relationshipScene(); if (rs) { openEvent(rs); answer(); }
        const days = G.transit.days; G.transit = null;
        for (let d = 0; d < days; d++) { st.day++; Mods.emit('newDay', st.day); }
        st.systemId = to; G.player = makeShip(st.shipId, 0, 0, 0); G.mode = 'flight'; G.npcs = [];
        land(system().planets.find(p => p.name === runPlanet) || pick(system().planets));
        answer();
        tally();
        runs++;
        paid.push(st.credits - creditsBefore);
        if (hired().deal && offerDay === null) offerDay = hired().deal.day - hired().since;
        const xoKey = CAPTAINS[hired().captainKey] && CAPTAINS[hired().captainKey].xo;
        while (xoKey && xoDays.length < (castRec(xoKey).arc || 0)) xoDays.push(st.day - hired().since);
        const d = hired().deal, price = d && dealOpen() ? d.price : target;  // she is bought when the deal's price is in hand, or the chapter's if it lapsed
        if (st.credits >= price) reached = { runs, day: st.day, credits: st.credits, deal: d ? { price: d.price, offered: d.day, lapsed: !dealOpen() } : null };
        for (const n of UI.notes) if (odd(n)) bad.push('note: ' + n.slice(0, 80));
      } catch (e) { bad.push('threw: ' + String(e).slice(0, 120)); break; }
    }
    const avg = (a, n) => Math.round(a / Math.max(1, n));
    if (!ending.v) tally();
    return { losses, ending: ending.v, runs, days: st.day, credits: st.credits, reached, stuck, scenes, bad, beatDays, xoDays, waits, burns, introRun, firstOfficers: Object.keys(CAST).filter(k => CAST[k].xo), offerDay,
      avgPayPerRun: avg(paid.reduce((a, b) => a + b, 0), paid.length), avgDaysPerRun: Math.round(10 * st.day / Math.max(1, runs)) / 10 };
  }, [legs, captainKey, realDraw]);
  await ctx.close();
  return { seed, ...r, errors };
}

// Who was lost, left or marked, per chapter, and the totals across the seeds.
function report(runs) {
  const total = {};
  for (const r of runs) {
    const items = r.losses.map(l => `${l.who} ${l.what} day ${l.day} (${l.why})`);
    if (r.ending) items.push(`ENDED day ${r.ending.day}: ${r.ending.title}${r.ending.how ? ' (' + r.ending.how + ')' : ''}`);
    console.log(`seed ${r.seed} lost or left: ${items.join('; ') || 'nobody'}`);
    const seen = new Set();
    for (const l of r.losses) { const k = `${l.what} ${/^(Ines|Tomas|Cato)/.test(l.who) ? l.who.split(' ')[0] : l.who.endsWith('named') ? 'a main character' : 'crew'}`; if (!seen.has(k)) { seen.add(k); total[k] = (total[k] || 0) + 1; } }
    if (r.ending) total[r.ending.title] = (total[r.ending.title] || 0) + 1;
  }
  console.log(`${runs.length} chapters, chapters with: ${Object.entries(total).sort().map(([k, v]) => `${k} ${v}`).join(', ') || 'no losses'}`);
}

module.exports = { soak, report };

if (require.main === module) {
  const arg = n => { const i = process.argv.indexOf('--' + n); return i > 0 ? process.argv[i + 1] : null; };
  const seeds = (arg('seeds') || '1').split(',').map(Number), legs = Number(arg('legs') || 40), captainKey = arg('captain'), realDraw = process.argv.includes('--real-draw');
  (async () => {
    const all = [];
    for (const seed of seeds) {
      const r = await soak({ seed, legs, captainKey, realDraw });
      all.push(r);
      console.log(`seed ${seed} runs ${r.runs} days ${r.days} credits ${r.credits} reached ${JSON.stringify(r.reached)} pay/run ${r.avgPayPerRun} days/run ${r.avgDaysPerRun} stuck ${r.stuck} trouble ${r.beatDays[0] ?? '-'} secret ${r.beatDays[1] ?? '-'} (due ${r.waits.join(',') || '-'} days, ${r.burns.join(',') || '-'} burns) offer ${r.offerDay ?? '-'} intros ${Object.entries(r.introRun).map(([k, v]) => `${k}:${v}`).join(',') || '-'} xo [${r.xoDays.join(',')}] (days since sign-on) bad ${r.bad.length} errors ${r.errors.length}`);
    }
    report(all);
    await closeBrowser();
  })();
}
