'use strict';

// Prices and trading: the market pressure a trade leaves behind, the price per ton, what a lot costs or fetches, the trade
// itself, and the best place to sell. Pure but for G.state (the day, the markets, the rumors) and Mods, so it loads and runs
// without a browser: tests/market.test.js. Loaded after data.js, util.js and orbits.js, before game.js.

// Trading moves markets: each ton bought raises the local price and each ton sold
// lowers it, up to MARKET_CAP either way. Local use and NPC haulers move them too
// (world.js). A Dust Skiff barely dents a market; an Ice Hauler has to spread its
// trade around.
const MARKET_PER_TON = 0.002, MARKET_CAP = 0.4;

function pressure(planet, cid) {
  const m = G.state.market[`${planet.name}|${cid}`];
  return m ? m.p : 0;
}

const pushed = (p, tons) => Math.max(-MARKET_CAP, Math.min(MARKET_CAP, p + tons * MARKET_PER_TON));

// Price per ton; `p` overrides the market pressure (see tradeTotal).
function price(planet, cid, p = pressure(planet, cid)) {
  const level = planet.prices[cid];
  if (!level) return null;
  const c = COMMODITIES.find(c => c.id === cid);
  const wobble = 1 + 0.08 * Math.sin(G.state.day * 0.9 + hash(planet.name + cid));
  const rumor = G.state.rumors.find(r => r.planet === planet.name && r.cid === cid && r.until >= G.state.day);
  return Math.round(Mods.filter('price', c.base * PRICE_MULT[level] * wobble * (rumor ? rumor.mult : 1) * (1 + p), planet, cid));
}

// What `qty` tons cost to buy (dir 1) or fetch when sold (dir -1): the price moves as
// you trade, so the whole lot goes at the average of the before and after prices.
function tradeTotal(planet, cid, qty, dir) {
  const p0 = pressure(planet, cid);
  return qty * price(planet, cid, (p0 + pushed(p0, qty * dir)) / 2);
}

function recordTrade(planet, cid, qty, dir) {
  G.state.market[`${planet.name}|${cid}`] = { p: pushed(pressure(planet, cid), qty * dir), day: G.state.day };
  Mods.emit('trade', planet, cid, qty, dir);
}

// Most profitable place within one full tank to sell a commodity bought here, at today's
// prices, weighing profit against travel days.
function bestSale(planet, cid) {
  const buy = price(planet, cid), here = G.state.systemId;
  if (buy === null) return null;
  let best = null;
  for (const [sid, sys] of Object.entries(SYSTEMS)) {
    if (!inRange(here, sid)) continue;
    const days = sid === here ? 0 : travelDays(here, sid);
    for (const pl of sys.planets) {
      const sell = price(pl, cid);
      if (pl === planet || sell === null || sell <= buy) continue;
      const score = (sell - buy) / Math.max(1, days);
      if (!best || score > best.score) best = { planet: pl, days, profit: sell - buy, score };
    }
  }
  return best;
}

// Last-seen prices (chapter two, #891, docs/bible/trade-and-law.md): what a ship knows of another port's exchange is what it saw when it last
// docked there. seenPrices records a port's prices on the day; bestSeen gives the highest last-seen price for a good at a port other than `here`,
// with how many days old it is, or null when nothing is known. Pure: the state and the price function are passed in.
function seenPrices(st, planet, day, priceOf) {
  st.seen = st.seen || {};
  st.seen[planet.name] = { day, prices: Object.fromEntries(Object.keys(planet.prices).map(cid => [cid, priceOf(planet, cid)])) };
}
function bestSeen(st, cid, here) {
  let best = null;
  for (const [planet, s] of Object.entries(st.seen || {})) {
    const p = s.prices[cid];
    if (planet !== here && p != null && (!best || p > best.price)) best = { planet, price: p, age: st.day - s.day };
  }
  return best;
}

