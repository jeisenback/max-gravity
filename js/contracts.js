'use strict';

// Contracts: the freight the captain carries (docs/superpowers/specs/2026-10-17-contracts-design.md). A port's board is drawn each day
// from the world: what ships from here (the goods the port prices low, and some of the middling) to a port in reach that prices them
// higher, for a shipper with a name, by a day. The captain takes the one that pays the ship most a day that her hold can fill
// (pickContract), with her card's stats as the old planner used them (TRADE_PICKS, laneRisk, hired.js). Nothing is bought: the cargo is
// the shipper's, loaded when she sails, and the pay comes on delivery (settleRun, hired.js), docked for lateness. State:
// st.hired.freight = { key: 'planet@day', list }, the day's board. The draw has dice of its own, seeded by the port, the day and the
// game (boardDice), so the board is the same however often the page draws it and no other draw in the game moves because of it (the
// job board does the same with a hash, jobs.js). Pure: each function takes the state and the dice it uses. Loaded after market.js.

const CONTRACT_RATE = 26, CONTRACT_FEE = 1200;  // cr a ton a day, and a handling fee a contract (so a short haul pays a little more a day than a long one), before premiums; set from the soak (ROADMAP.md)
const CONTRACT_LEVEL = { L: 1, M: 0.5, H: 0 };  // what ships from a port: all of what it prices low, some of the middling, none of the dear
const RUMOR_PREMIUM = 0.5, HAZARD_PREMIUM = 0.3, HAZARD_AT = 0.25;  // word of a shortage at the far end; a lane with raids on it
const LONG_HAUL = 0.02, LONG_HAUL_FLOOR = 0.5;  // the rate falls two percent a day of the burn, to half at most: a long haul pays less a day than a short one, so the chapter keeps its runs
const LATE_DOCK = 0.1, LATE_FLOOR = 0.5;  // a tenth of the pay a day late, never below half
const BOARD_ODDS = { big: [0.15, 0.45], small: [0.35], trusted: [0.1, 0.4] };  // how many a day: the chance of none, then of one (the rest is two); a big port has a yard or a mission board; a shipper that trusts the ship offers the most
const STANDING_MAX = 3, STANDING_GOOD = 2, STANDING_BAD = -2, TRUSTED_PAY = 0.1;  // a shipper's regard for the ship, -3 to 3 (st.hired.standing): from 2 it offers more and pays a tenth better, at -2 it stops offering

// Who puts freight on the board: the port's own people where it has them, else the government's freight office, else a broker.
const SHIPPERS = {
  port: { 'Hermes Foundry': 'Aquilon', Titan: 'the Tethys Shipping Consortium', Ironheart: 'the Ironheart co-op', 'Juno Commons': 'the Juno Commons families', 'The Hollows': 'the Hollows families',
    Boneyard: 'the Boneyard salvagers', 'Ring Nine': 'the Ring Nine kitchens', 'The Rook': 'the Rook', 'Eros Old Town': 'the Old Town traders', Europa: 'the Europa ice works', Enceladus: 'the Geyser Bar', 'Triton Outpost': 'the Outpost council' },
  gov: { 'Arcology Compact': 'the Compact Freight Office', 'Dome Concord': 'the Concord Freight Office', 'Charter League': 'the League Freight Hall', Pirate: 'the Rook' },
  other: 'a dock broker',
};
const shipperOf = (planet, gov) => SHIPPERS.port[planet.name] || SHIPPERS.gov[gov] || SHIPPERS.other;
// The state whose freight office this shipper is (the Rook is a port, not an office), or null.
const officeOf = shipper => Object.keys(SHIPPERS.gov).find(g => g !== 'Pirate' && SHIPPERS.gov[g] === shipper) || null;
// One shipper sometimes pays less than the paper: the dock broker takes handling off a delivery, a share of the pay, in a quarter of deliveries to a shipper that does not know
// the ship, half as often to one that does, and never to one that trusts it. The roll is the delivery's own, from its port and day, so no other draw in the game moves.
const SKIMMER = SHIPPERS.other, SKIM_CHANCE = 0.25, SKIM_CUT = 0.15;
const skimOf = (run, pay, standing) => {
  if (run.shipper !== SKIMMER) return 0;
  const chance = Math.max(0, SKIM_CHANCE * (1 - Math.max(0, standing) / STANDING_GOOD));
  return Math.abs(hash(`${run.shipper}|${run.planet}|${run.day}`)) % 100 < chance * 100 ? Math.round(pay * SKIM_CUT) : 0;
};

// The lanes freight can go from here: a good this port ships, to a port in reach that prices it higher, weighted by how much higher and
// toward the near ports (most freight is short-haul).
function freightLanes(here, from, reach) {
  const lanes = [];
  for (const [cid, level] of Object.entries(here.prices || {})) {
    if (!CONTRACT_LEVEL[level]) continue;
    for (const [sid, sys] of reach) {
      const days = Math.max(1, travelDays(from, sid));
      for (const pl of sys.planets) {
        const to = pl.prices && pl.prices[cid];
        if (to && PRICE_MULT[to] > PRICE_MULT[level]) lanes.push({ cid, sid, pl, days, w: CONTRACT_LEVEL[level] * (PRICE_MULT[to] - PRICE_MULT[level]) / Math.sqrt(days) });
      }
    }
  }
  return lanes;
}
const haulRate = days => Math.max(LONG_HAUL_FLOOR, 1 - LONG_HAUL * days);
const weightedLane = (list, rnd) => { let r = rnd() * list.reduce((t, x) => t + x.w, 0); return list.find(x => (r -= x.w) < 0) || list[list.length - 1]; };
// Dice of the board's own, from a key: the same key gives the same rolls.
const boardDice = key => { let a = hash(key) >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };

// The day's board at a port: none, one or two contracts, each on a lane of its own. `reach` is [sid, system] pairs in range, `hold` the ship's whole hold, `rnd` the dice.
function drawContracts(st, here, from, reach, hold, day, rnd, standing = 0) {
  if (standing <= STANDING_BAD) return [];  // a shipper that has lost faith in the ship puts nothing on its board
  const trusted = standing >= STANDING_GOOD, odds = trusted ? BOARD_ODDS.trusted : BOARD_ODDS[here.services.includes('shipyard') || here.services.includes('missions') ? 'big' : 'small'], r = rnd();
  const n = r < odds[0] ? 0 : odds.length < 2 || r < odds[0] + odds[1] ? 1 : 2;
  let lanes = freightLanes(here, from, reach);
  const out = [];
  for (let i = 0; i < n && lanes.length; i++) {
    const lane = weightedLane(lanes, rnd);
    lanes = lanes.filter(x => x.cid !== lane.cid || x.pl !== lane.pl);
    const days = lane.days, tons = 10 * (4 + Math.floor(rnd() * (Math.max(4, Math.floor(hold / 10)) - 3)));
    const rumor = st.rumors.some(x => x.planet === lane.pl.name && x.cid === lane.cid && x.until >= day && x.mult > 1), hazard = danger(lane.sid) >= HAZARD_AT;
    const premium = 1 + (rumor ? RUMOR_PREMIUM : 0) + (hazard ? HAZARD_PREMIUM : 0) + (trusted ? TRUSTED_PAY : 0);
    out.push({ shipper: shipperOf(here, SYSTEMS[from].gov), good: lane.cid, tons, from: here.name, sid: lane.sid, planet: lane.pl.name, yard: lane.pl.services.includes('shipyard'), days,
      pay: Math.round((CONTRACT_FEE + tons * days * CONTRACT_RATE * haulRate(days)) * premium), due: day + Math.ceil(days * 1.5) + 2 + Math.floor(rnd() * 5), hazard, rumor });
  }
  return out;
}

// The board as it stands today, drawn once a day at a port and kept (so the page does not change under you).
function contractBoard(st, here) {
  const h = st.hired, key = `${here.name}@${st.day}`;
  if (!h.freight || h.freight.key !== key) {
    const from = st.systemId, reach = Object.entries(SYSTEMS).filter(([sid]) => sid !== from && inRange(from, sid));
    h.freight = { key, list: drawContracts(st, here, from, reach, ship().cargo, st.day, boardDice(`${key}|${h.since}|${h.captain}`), standingOf(h, shipperOf(here, SYSTEMS[from].gov))) };
  }
  return h.freight.list;
}

// The captain's pick among the contracts her hold can fill: the most a day to the ship, a yard counted four times over when she wants
// one, a dangerous lane marked down by her nerve (risk), and the best `picks` of them hers to choose among (her trade stat).
function pickContract(list, { free, wantYard, risk, picks }) {
  const score = c => (c.pay / c.days) * (wantYard && c.yard ? 4 : 1) * risk(c.sid);
  const ranked = list.filter(c => c.tons <= free).sort((a, b) => score(b) - score(a));
  const top = ranked.slice(0, Math.max(1, picks));
  return { best: top.length > 1 ? pick(top) : top[0] || null, ranked };
}

// A shipper's regard for the ship (st.hired.standing, and st.career.standing after the buy; by the shipper's name; older saves have none, which is 0). A delivery moves it: on the day and whole, up one;
// each day-late fault down one, a short load down one and a lost load down two. The word is for the run panel; the shipper is named before it, so it takes no verb.
const standingOf = (h, shipper) => (h.standing || {})[shipper] || 0;
const standingDelta = (run, sold, day) => { const late = day > run.due, lost = sold <= 0, short = sold < run.tons; return !late && !short ? 1 : -((late ? 1 : 0) + (lost ? 2 : short ? 1 : 0)); };
const nextStanding = (n, d) => Math.max(-STANDING_MAX, Math.min(STANDING_MAX, n + d));
const shipperWord = n => (n >= STANDING_GOOD ? 'a shipper that trusts the ship' : n >= 1 ? 'a shipper that knows the ship' : n <= -1 ? 'a shipper that is wary of the ship' : '');
// What was off with a delivery, for the agent at the far end: the worst of it (a lost load, a short one, a late one), or null when it came in whole and on the day.
// A pay cut by the shipper (`cut`, of `owed`, the pay the paper gave) is the worst of it after a lost or short load: the money is the thing the agent has to explain.
function deliveryOff(run, sold, day, cut = 0, owed = 0) {
  const late = Math.max(0, day - run.due), lost = sold <= 0, short = sold < run.tons;
  return !late && !short && !cut ? null : { kind: lost ? 'lost' : short ? 'short' : cut ? 'skim' : 'late', shipper: run.shipper, good: run.good, tons: run.tons, got: sold, late, due: run.due, cut, owed };
}

// What a late delivery pays: docked a tenth a day, never below half.
const latePay = (pay, due, day) => Math.round(pay * Math.max(LATE_FLOOR, 1 - LATE_DOCK * Math.max(0, day - due)));
