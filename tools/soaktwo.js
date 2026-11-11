'use strict';

// Chapter two's soak (#891, docs/superpowers/specs/2026-11-07-chapter-two-start-design.md): a hand signs the share, goes on, takes the bridge (#1045),
// and flies the co-op's Ore Runner on the board's contracts for a stretch of days, buying its own fuel and repairs, with the burn's contact
// answered as chapter one's soak answers it (a fight fought with the orders as they stand, anything else at random). It reports the pay a day into the
// co-op's fund, the runs, the raids, the hull lost and who was lost. Not part of `npm test`: tests/distribution/fights.test.js and pacing.test.js read it.
//   node tools/soaktwo.js --seeds 1,2,3 --days 60

const { open } = require('../tests/helpers');

const SOAK_STALL = 900000;

async function soakTwo({ seed = 1, days = 60 } = {}) {
  const { ev, errors, ctx } = await open({ seed, stall: SOAK_STALL });
  const r = await ev(chapterTwo, [days]);
  await ctx.close();
  return { seed, ...r, errors };
}

// Run in the page.
async function chapterTwo([days]) {
  const ENDINGS = /^(The Last Run|Without a Captain|Put Ashore)$/;
  const pickOf = ok => ok[Math.floor(Math.random() * ok.length)];
  const answer = (first = false) => {  // first: the start's chain is taken on its first choice (Go on, Take the bridge)
    for (let k = 0; G.dialog && k < 60; k++) {
      const d = G.dialog;
      if (ENDINGS.test(d.event.title)) return d.event.title;
      const ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can());
      if (!ok.length) break;
      const fire = d.event.fight ? ok.find(i => /^(Fire\b|Fight$)/.test(d.choices[i].label)) : undefined;
      const i = first ? ok[0] : fire !== undefined ? fire : pickOf(ok), c = d.choices[i];
      const res = chooseEvent(i);
      if (c.keep && res) { openEvent(res); continue; }
      finishEvent();
    }
    while (G.dialog) finishEvent();
    return null;
  };
  // Chapter one, to the share: as tests/chaptertwostart.test.js signs it.
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
  const st = G.state, h = hired(); st.story.next = 1e9; st.tutorial = null;
  Object.assign(h, { beats: 2, beatRun: -2, flags: { sawHull: true }, debt: 0, fights: { done: FIGHT_LADDER.filter(x => !x.parked).map(x => x.id) } });  // a chapter one fought through its ladder
  h.deal = { price: BUY_IN.mid, day: st.day, broker: false }; st.credits = 60000;
  st.systemId = 'ceres'; st.planet = 'Ceres Station'; G.mode = 'landed';
  h.confirm = USED_ID; Mods.act('buyInGo', USED_ID);
  answer(true);
  if (chapterOf(st) !== 2 || !hired().bridge) return { bad: ['the start did not reach chapter two'] };
  let raids = 0; { const real = window.startShipFight; window.startShipFight = function (...a) { raids++; return real.apply(this, a); }; }
  const start = st.day, credits0 = st.credits, crew0 = st.crew.length, bad = [];
  let runs = 0, idle = 0, hull = 0, ending = null;
  while (st.day - start < days && !ending && idle < 30) {
    try {
      UI.planet = currentPlanet();
      if (UI.planet.services.includes('refuel')) UI.act('refuel');
      if (UI.planet.services.includes('shipyard') && st.armor < ship().armor) UI.act('repair');
      const board = contractBoard(st, currentPlanet()), i = board.findIndex(k => k.tons <= cargoFree() && burnFuel(st.systemId, k.sid) <= st.fuel);
      if (i < 0) { st.day += 1; idle++; continue; }
      const k = board[i];
      takeContract(i); answer();
      if (G.mode === 'landed') takeOff();
      G.player.x = BURN_DIST + 40; G.player.y = 0;
      const armor0 = st.armor;
      tryBurn(); enterTransit(); G.transit.times = [];
      G.transit.interceptPlanned = false; G.transit.event = null; planIntercept();
      if (G.transit.intercept) { const sp = G.transit.intercept.spec; G.transit.intercept = null; G.dialog = null; openEvent(contactEvent(sp)); ending = answer(); }
      if (ending) break;
      hull += Math.max(0, armor0 - st.armor);
      if (G.transit) arrive();
      if (G.mode !== 'landed') { G.player = makeShip(st.shipId, 0, 0, 0); G.npcs = []; land(system().planets.find(p => p.name === k.planet) || system().planets[0]); }
      ending = answer();
      if (G.state !== st) { ending = ending || 'a new game'; break; }
      runs++; idle = 0;
    } catch (e) { bad.push(`threw: ${String(e).slice(0, 160)}`); break; }
  }
  const sailed = Math.max(1, st.day - start);
  return { days: sailed, runs, raids, hull, perDay: Math.round((st.credits - credits0) / sailed), crewLost: crew0 - st.crew.length, ending, bad };
}

async function soaksTwo(seeds, opts = {}, width = 4) {
  const out = [], queue = seeds.map((seed, i) => [i, seed]);
  const worker = async () => { for (let next = queue.shift(); next; next = queue.shift()) out[next[0]] = await soakTwo({ ...opts, seed: next[1] }); };
  await Promise.all(Array.from({ length: Math.min(width, queue.length) }, worker));
  return out;
}

module.exports = { soakTwo, soaksTwo, chapterTwo };

if (require.main === module) {
  const arg = (name, d) => { const i = process.argv.indexOf(`--${name}`); return i < 0 ? d : process.argv[i + 1]; };
  const seeds = arg('seeds', '1,2,3').split(',').map(Number), days = Number(arg('days', 60));
  soaksTwo(seeds, { days }).then(rs => { for (const r of rs) console.log(JSON.stringify(r)); return require('../tests/helpers').closeBrowser(); });
}
