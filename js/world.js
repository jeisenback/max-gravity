'use strict';

// The living solar system: a daily tick for pirate unrest and NPC shipping.
// Each location's unrest drifts back toward its normal pirate level, flares up now
// and then, and drops when you kill pirates there. Market pressure (see price() in
// game.js) recovers each day as NPC traders restock; when unrest runs above normal,
// they stay away, so imports run short and exports pile up until the lanes are safe
// or someone hauls the goods in. State lives in st.world. Loaded before game.js;
// only calls into it at runtime.

const UNREST_DRIFT = 0.035;    // share of the gap to normal closed each day (~20-day half-life)
const FLARE_CHANCE = 0.005;    // per location per day, where pirates operate at all
const FLARE_SIZE = 0.35;
const SHORTAGE_RATE = 0.15;    // daily price push per unit of excess unrest

function worldOf(sid) {
  const st = G.state;
  st.world = st.world || {};
  return (st.world[sid] = st.world[sid] || { unrest: SYSTEMS[sid].pirates });
}

// How dangerous a location is right now; pirates spawn and arm by this.
const danger = sid => worldOf(sid).unrest;
// Unrest beyond what is normal there, which is what drives NPC shipping away.
const excessUnrest = sid => Math.max(0, danger(sid) - SYSTEMS[sid].pirates - 0.08);

function worldNews(text) {
  const st = G.state;
  st.news = st.news || [];
  st.news.unshift({ day: st.day, text });
  st.news.length = Math.min(st.news.length, 8);
}

function worldTick() {
  const st = G.state;
  for (const [sid, sys] of Object.entries(SYSTEMS)) {
    const w = worldOf(sid);
    if (sys.pirates > 0 && Math.random() < FLARE_CHANCE) {
      w.unrest = Math.min(1, w.unrest + FLARE_SIZE);
      worldNews(`Pirate raids reported around ${sys.name}. Shipping there is thinning out.`);
    }
    w.unrest += (sys.pirates - w.unrest) * UNREST_DRIFT;
    const excess = excessUnrest(sid);
    const recover = Math.pow(0.5, 1 / (MARKET_HALF_LIFE * (1 + 4 * excess)));
    for (const pl of sys.planets) {
      for (const [cid, level] of Object.entries(pl.prices)) {
        const key = `${pl.name}|${cid}`;
        let p = (st.market[key] ? st.market[key].p : 0) * recover;
        if (excess) p += (level === 'H' ? 1 : level === 'L' ? -1 : 0) * SHORTAGE_RATE * excess;
        p = Math.max(-MARKET_CAP, Math.min(MARKET_CAP, p));
        if (Math.abs(p) < 0.005) delete st.market[key];
        else st.market[key] = { p, day: st.day };
      }
    }
  }
}

// What a captain would hear about a location: raids, quiet lanes, shortages, gluts.
function conditions(sid) {
  const sys = SYSTEMS[sid], out = [], excess = excessUnrest(sid);
  if (excess > 0.2) out.push({ bad: true, text: `Heavy pirate activity around ${sys.name}` });
  else if (excess > 0.05) out.push({ bad: true, text: `Pirate raids around ${sys.name}` });
  else if (sys.pirates >= 0.15 && danger(sid) < sys.pirates * 0.6) out.push({ bad: false, text: `Lanes around ${sys.name} are quiet` });
  for (const pl of sys.planets) {
    for (const cid of Object.keys(pl.prices)) {
      const p = pressure(pl, cid), name = COMMODITIES.find(c => c.id === cid).name;
      if (p > 0.2) out.push({ bad: true, text: `Shortage of ${name} at ${pl.name} (+${Math.round(p * 100)}%)` });
      else if (p < -0.2) out.push({ bad: false, text: `Glut of ${name} at ${pl.name} (${Math.round(p * 100)}%)` });
    }
  }
  return out;
}

Mods.register({
  id: 'world', name: 'Living solar system', builtin: true,
  init(M) {
    M.on('newDay', worldTick);
    M.on('destroyed', (ship, byPlayer) => {
      if (!byPlayer) return;
      const w = worldOf(G.state.systemId);
      if (ship.kind === 'pirate') w.unrest = Math.max(0, w.unrest - 0.06);
      else if (ship.kind === 'trader') w.unrest = Math.min(1, w.unrest + 0.05);
    });
  },
});
