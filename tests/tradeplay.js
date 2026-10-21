'use strict';

// Plays the trade, the missions and the jobs for the pin (tradepin.test.js, #457): what the commodities cost on every planet on some days, what a lot costs to buy or fetches
// when sold, how a trade moves a market, the best place to sell, thirty days of the world's own tick (the markets, the haulers, the unrest), the missions offered at each port, and the
// jobs a hired hand is offered and what each choice of each does. Not a test file. playTrade runs in the page; each case seeds the dice on its own, so the cases do not depend on
// one another. A change to how prices, offers or jobs are worked out is a change to this record on purpose; a refactor must leave it as it is.
const playTrade = () => {
  const out = [];
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  const note = (key, v) => out.push({ key, v });
  const r4 = x => Math.round(x * 10000) / 10000;
  const start = (hiredMode, seed) => {
    __seed(seed);
    startGame(hiredMode ? { slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 50000 } : { slot: 1, background: 'earth', captain: 'Sam Rowe', credits: 50000 });
    while (G.dialog) finishEvent();
    const st = G.state; st.tutorial = null; st.story.next = 1e9;
    return st;
  };
  const planets = () => Object.entries(SYSTEMS).flatMap(([sid, sys]) => sys.planets.map(pl => ({ sid, pl })));
  const at = (st, sid, pl) => { st.systemId = sid; st.planet = pl.name; };

  // ---------- prices ----------
  {
    const st = start(false, 1);
    for (const day of [1, 8, 30]) {
      st.day = day;
      for (const { pl } of planets()) note(`price:${day}:${pl.name}`, Object.fromEntries(Object.keys(pl.prices).map(cid => [cid, price(pl, cid)])));
    }
    // a rumor, a market pushed, and what a lot costs or fetches
    st.day = 8;
    const sample = planets().filter((m, i) => i % 5 === 0).slice(0, 6);
    for (const { pl } of sample) {
      const cids = Object.keys(pl.prices);
      for (const cid of cids.slice(0, 3)) {
        const row = {};
        for (const dir of [1, -1]) for (const qty of [1, 10, 50]) row[`${dir > 0 ? 'buy' : 'sell'}${qty}`] = tradeTotal(pl, cid, qty, dir);
        st.rumors = [{ planet: pl.name, cid, mult: 1.8, until: st.day + 5, text: 'x' }]; row.rumor = price(pl, cid); st.rumors = [];
        for (let i = 0; i < 4; i++) recordTrade(pl, cid, 30, 1);
        row.afterBuys = [r4(pressure(pl, cid)), price(pl, cid), tradeTotal(pl, cid, 10, -1)];
        for (let i = 0; i < 12; i++) recordTrade(pl, cid, 40, -1);
        row.afterSells = [r4(pressure(pl, cid)), price(pl, cid)];
        note(`trade:${pl.name}:${cid}`, row);
      }
    }
    st.market = {};
    for (const { sid, pl } of sample) { at(st, sid, pl); note(`bestSale:${pl.name}`, Object.fromEntries(Object.keys(pl.prices).map(cid => { const b = bestSale(pl, cid); return [cid, b ? [b.planet.name, b.days, b.profit, r4(b.score)] : null]; }))); }
  }

  // ---------- the world's own tick: thirty days of the markets, the haulers and the unrest ----------
  {
    const st = start(false, 2);
    st.market = {}; st.haul = [];
    for (let day = 1; day <= 30; day++) {
      st.day += 1; __seed(100 + day); worldTick();
      if (day % 5 === 0) note(`world:${day}`, {
        market: Object.fromEntries(Object.entries(st.market).sort(([a], [b]) => (a < b ? -1 : 1)).map(([k, m]) => [k, r4(m.p)])),
        haul: st.haul.map(v => [v.cid, v.tons, v.from, v.to, v.arrive]),
        unrest: Object.fromEntries(Object.keys(SYSTEMS).map(sid => [sid, r4(worldOf(sid).unrest)])),
        news: (st.news || []).map(n => n.text),
      });
    }
  }

  // ---------- the missions offered at each port ----------
  {
    const st = start(false, 3);
    for (const { sid, pl } of planets()) {
      if (!pl.services.includes('missions')) continue;
      at(st, sid, pl);
      for (const seed of [1, 2, 3]) { __seed(seed * 17); note(`missions:${pl.name}:${seed}`, generateMissions(pl)); }
    }
    // a captain the government trusts is offered a contract; and one who carries a group already is not offered it again
    const { sid, pl } = planets().find(m => m.pl.services.includes('missions') && m.sid === 'earth') || planets().find(m => m.pl.services.includes('missions'));
    at(st, sid, pl);
    for (const seed of [1, 2, 3, 4]) { st.rep[localGov()] = 40; __seed(seed * 31); note(`missions:trusted:${seed}`, generateMissions(pl)); }
    st.rep = {};
    st.missions.push({ type: 'passenger', passenger: Object.keys(PASSENGERS)[0], who: 'x', pax: 1, destSystem: 'mars', destPlanet: 'Olympus Dome', title: 't', pay: 1, deadline: st.day + 9 });
    for (const seed of [1, 2, 3, 4, 5, 6]) { __seed(seed * 43); note(`missions:carrying:${seed}`, generateMissions(pl).map(o => [o.type, o.passenger || null, o.title])); }
  }

  // ---------- the jobs a hired hand is offered, and what each choice does ----------
  {
    const st = start(true, 4);
    for (const { sid, pl } of planets().filter((m, i) => i % 4 === 0).slice(0, 8)) for (const day of [3, 9, 20]) { at(st, sid, pl); st.day = day; hired().board = null; note(`board:${pl.name}:${day}`, jobBoard().ids); }
    const odds = {};
    for (const post of Object.keys(POSTS)) for (const own of [true, false]) { hired().post = own ? post : 'gunner'; odds[`${post}:${own}`] = r4(jobOdds({ post })); }
    note('odds', odds);
    hired().post = 'gunner';
    const snap = JSON.stringify(G.state);
    // every stage of a job, and what each of its choices does on a good roll and on a bad one
    const playJobs = (list, prefix, ctx) => list.forEach(job => job.stages.forEach((stage, si) => {
      const labels = jobStage(job, si, ctx).choices.map(c => String(c.label));
      note(`${prefix}:${job.id}:${si}`, { title: jobStage(job, si, ctx).title, text: jobStage(job, si, ctx).text, labels, ...(si === 0 && prefix !== 'job' ? { blurb: job.blurb } : {}) });
      labels.forEach((label, ci) => { for (const roll of [0, 0.999]) {
        G.state = JSON.parse(snap); G.nextEvent = null; const before = { credits: G.state.credits, rep: { ...G.state.rep }, xp: JSON.stringify(hired().xp || {}), mem: (hiredCaptain().memories || []).length };
        __seed(7 + ci); const ev = jobStage(job, si, ctx); seq([roll, 0.3, 0.6]);
        const text = ev.choices[ci].run(); Math.random = real;
        const next = G.nextEvent; G.nextEvent = null;
        note(`${prefix}:${job.id}:${si}:${ci}:${roll}`, { text, credits: G.state.credits - before.credits, rep: Object.fromEntries(Object.entries(G.state.rep).filter(([k, v]) => v !== (before.rep[k] || 0)).map(([k, v]) => [k, v - (before.rep[k] || 0)])), xp: JSON.stringify(hired().xp || {}) !== before.xp, mem: (hiredCaptain().memories || []).slice(before.mem), next: next ? [next.title, next.text.slice(0, 80)] : null });
      } });
    }));
    playJobs(JOBS, 'job', { scale: 1.2, who: 'Mrs. Adeyemi' });
    // the jobs that are worked further away are played the same way, with the people and places an offer carries
    playJobs(AWAY, 'awayjob', { dest: 'Ironheart', from: 'Titan', who: 'Mrs. Adeyemi', system: 'Psyche', scale: 1.3 });
    // the page of the jobs on the station, and of the work elsewhere
    for (const { sid, pl } of planets().filter((m, i) => i % 7 === 0).slice(0, 3)) { G.state = JSON.parse(snap); at(G.state, sid, pl); G.state.day = 12; hired().board = null; note(`jobsHtml:${pl.name}`, jobsHtml()); }
    { G.state = JSON.parse(snap); __seed(5); hired().away = [awayOffer(), awayOffer()].filter(Boolean); note('awayHtml', awayHtml()); }
    // the work further away
    for (const { sid, pl } of planets().filter((m, i) => i % 6 === 0).slice(0, 8)) for (const seed of [1, 2, 3]) { G.state = JSON.parse(snap); at(G.state, sid, pl); __seed(seed * 13); note(`away:${pl.name}:${seed}`, awayOffer()); }  // from several ports, so that the work is near and far
  }
  return out;
};

module.exports = { playTrade };
