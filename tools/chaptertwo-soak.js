'use strict';

// Sails chapter two (#685) for a run of days and reports what the 90-day close (js/chaptertwo.js CHAPTER_TWO_DAYS) would read: after the buy, the player takes the best contract on
// the board at each port that trades (js/ownerboard.js) and flies it, the crew who came along are paid at every burn (crew.js payCrew), and a crew member quits when the credits run out.
// For each seed it reports the days to the first quit (if any), the contracts delivered, the credits at 30, 60, 90, 120, 180 and 240 days, and who was still aboard at each.
//   node tools/chaptertwo-soak.js --seeds 1,2,3,4,5,6 [--days 240] [--left 30000] [--raw] [--coop [--salvage]]
// `--left` is the credits the player has after the buy (chapter one closes with the price of the ship and what is over). Not part of `npm test`.
// `--coop` plays the co-op's chapter two instead (the share signed and the hand voted to the bridge, as tests/coop.js does, Bexa and Pax aboard)
// rather than the parked owner's buy. With `--salvage` the co-op also takes a salvage or survey job when one is on the board (salvage.js, #965)
// and cuts by a fixed rule: cut each section whose read is not bad; on a bad one cut carefully if the client's find is in it, else haul home. The
// goods cut are sold at the next Exchange and the spares at the next outfitter, and the tank is filled before a job is taken.

const { open, closeBrowser } = require('../tests/helpers');
const { helpers, started } = require('../tests/coop');

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i < 0 ? d : process.argv[i + 1]; };
const seeds = String(arg('seeds', '1,2,3,4,5,6')).split(',').map(Number), days = +arg('days', 240), left = +arg('left', 30000);
const coop = process.argv.includes('--coop'), salvage = process.argv.includes('--salvage');

async function one(seed) {
  const { ev, done } = await open(coop ? { seed, stall: 0 } : { scope: 'earth-hired', seed, stall: 0 });
  if (coop) { await ev(helpers); await ev(started); }
  const r = await ev(([maxDays, over, coop, salvage]) => {
    let st;
    if (coop) { st = coopAt(); st.credits = over; } else {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
      st = G.state; st.story.next = 1e9; st.tutorial = null;
      for (const id of st.crew) person(id).opinion = OPINION.FRIEND + 1;  // everyone is a friend: all come along
      st.systemId = 'earth'; st.planet = 'Earth'; G.transit = null; G.mode = 'landed'; st.dest = null; G.dialog = null; G.nextEvent = null;
      hired().deal = { price: BUY_IN.mid, day: st.day }; hired().debt = 0; st.credits = buyInPrice(USED_ID) + over; buyIn(USED_ID);  // the chapter's goal: the used Ore Runner while (G.dialog) finishEvent();
    }
    const day0 = st.day, came = coop ? st.crew.filter(id => person(id)) : [...career().came], marks = {}, out = { came: came.length, delivered: 0, firstQuit: null, snap: {}, stuck: 0, jobs: 0, paidJobs: 0, cut: 0, hurt: 0 };
    const settleJob0 = settleJob; window.settleJob = function () { const t = settleJob0.apply(this, arguments); if (t) out.paidJobs++; return t; };
    // On station: play the arrival's scene (the approach, or the survey), then cut by the rule, then burn for the client's port.
    const atSiteWork = () => {
      while (G.dialog) { chooseEvent(0); finishEvent(); }
      const site = siteOf(st, st.systemId), w = site && site.wreck;
      while (w && !wreckDone(w)) {
        const depth = w.cut + 1, read = readWord(sectionRisk(depth, false), 3), hurt0 = Object.keys(st.injured || {}).length;
        Mods.act('cutWreck'); if (!G.dialog) break;
        const want = career().job && career().job.site === site.id && !career().job.got && w.find === depth;  // the client's find is in this section
        const labels = G.dialog.event.choices.map(c => c.label), pick = labels.findIndex(l => (read !== 'bad' ? /^Cut it$/ : want ? /carefully/ : /Haul home/).test(l));
        chooseEvent(pick); finishEvent(); while (G.dialog) finishEvent();
        if (read !== 'bad' || want) out.cut++;
        out.hurt += Object.keys(st.injured || {}).length - hurt0;
      }
      const job = career().job, home = job ? job.sid : 'ceres';
      st.dest = home; sailFromSite(st, home);
    };
    const sellUp = planet => {
      UI.planet = planet;
      if (planet.services.includes('trade')) for (const g of ['metal', 'industrial', 'equipment']) if ((st.cargo[g] || 0) > freightHeld(g) && planet.prices && planet.prices[g]) UI.act('sellall', g);
      if ((planet.services || []).includes('outfitter')) while ((st.spares || []).length) spareSell(st, planet, 0);
    };
    const crewNow = () => st.crew.filter(id => came.includes(id)).length;
    const snap = () => { for (const n of [30, 60, 90, 120, 180, 240]) if (st.day - day0 >= n && !(n in out.snap)) out.snap[n] = { credits: st.credits, aboard: crewNow() }; };
    let guard = 0; const settle0 = settleContract; window.settleContract = function (p) { const t = settle0.apply(this, arguments); if (t) { out.delivered++; out.paid = (out.paid || 0) + 1; } return t; };
    while (st.day - day0 < maxDays && guard++ < 400) {
      try {
        if (G.mode !== 'landed') { G.mode = 'landed'; G.transit = null; }
        while (G.dialog) finishEvent();
        G.nextEvent = null;
        const planet = currentPlanet(), before = career().run || career().job; out.landings = (out.landings || 0) + 1;
        if (salvage && !atSite(st)) sellUp(planet);
        if (salvage && !atSite(st) && planet.services.includes('trade') && !before) {
          const jobs = jobsAt(st, planet, st.day);
          if (jobs.length) { UI.planet = planet; UI.act('refuel'); }  // a job is offered on a full tank's reach, so the tank is filled before it is taken
          if (jobs.length && takeJob(0)) out.jobs++;
        }
        if (planet.services.includes('trade') && !before && !career().job) {
          const list = contractBoard(st, planet).map((k, i) => ({ k, i })).filter(x => x.k.tons <= cargoFree()).sort((a, b) => b.k.pay / b.k.days - a.k.pay / a.k.days);
          out.boards = (out.boards || 0) + (list.length ? 1 : 0);
          if (list.length) { out.took = (out.took || 0) + 1; takeContract(list[0].i); }
          else {  // nothing fits: a day passes, and after four such days she goes light to the next port that trades
            st.day++; Mods.emit('newDay', st.day); out.stuck++;
            const sys = out.stuck % 4 === 0 && Object.entries(SYSTEMS).find(([sid, y]) => sid !== st.systemId && inRange(st.systemId, sid) && y.planets.some(p => p.services.includes('trade')));
            if (!sys) continue;
            st.dest = sys[0]; st.route = { dock: sys[1].planets.find(p => p.services.includes('trade')).name, go: true };
          }
        }
        const dest = st.dest, route = st.route;
        if (!dest) { st.day++; if (coop) Mods.emit('newDay', st.day); continue; }  // the co-op's days turn as a burn's do, so a job's deadline passes
        const crew0 = st.crew.length;
        G.player = makeShip(st.shipId, 0, 0, 0); G.npcs = []; G.player.x = BURN_DIST + 40; G.player.y = 0; tryBurn(); enterTransit(); G.transit.times = []; G.transit.event = null;
        if (G.transit) arrive();
        if (atSite(st)) { atSiteWork(); if (G.transit) arrive(); }
        if (G.mode !== 'landed') { G.player = makeShip(st.shipId, 0, 0, 0); G.npcs = []; land(system().planets.find(p => p.name === (route && route.dock)) || system().planets[0]); }
        if (st.crew.length < crew0 && out.firstQuit === null) out.firstQuit = st.day - day0;
        snap();
      } catch (e) { out.error = String(e && e.stack || e).slice(0, 300); break; }
    }
    snap(); out.days = st.day - day0; out.credits = st.credits; out.aboard = crewNow(); out.where = st.systemId; out.job = career().job; out.mode = G.mode;
    return out;
  }, [days, left, coop, salvage]);
  await done();
  return r;
}

(async () => {
  const rows = [];
  for (const s of seeds) { const r = await one(s); rows.push(r); if (process.argv.includes('--raw')) console.log(JSON.stringify(r)); console.log(`seed ${s}: came ${r.came}, delivered ${r.delivered},${salvage ? ` jobs ${r.jobs} (paid ${r.paidJobs}), sections cut ${r.cut}, hurt ${r.hurt},` : ''} days ${r.days}, first quit ${r.firstQuit === null ? 'never' : `day ${r.firstQuit}`}, credits ${r.credits}${r.error ? `, ERROR ${r.error}` : ''}\n   ${Object.entries(r.snap).map(([n, v]) => `d${n}: ${v.credits} cr, ${v.aboard} aboard`).join('; ')}`); }
  for (const n of [30, 60, 90, 120, 180, 240]) {
    const at = rows.map(r => r.snap[n]).filter(Boolean);
    console.log(`day ${n}: ${at.length} seeds reached it; everyone who came still aboard in ${rows.filter((r, i) => r.snap[n] && r.snap[n].aboard === r.came).length}; credits median ${at.map(v => v.credits).sort((a, b) => a - b)[Math.floor(at.length / 2)]}, mean ${Math.round(at.reduce((t, v) => t + v.credits, 0) / Math.max(1, at.length))}, spread ${Math.min(...at.map(v => v.credits))} to ${Math.max(...at.map(v => v.credits))}`);
  }
  await closeBrowser();
})();
