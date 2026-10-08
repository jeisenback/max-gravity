'use strict';

// The living solar system: a daily tick for pirate unrest and the goods economy.
// Each location's unrest drifts back toward its normal pirate level, flares up now
// and then, and drops when you kill pirates there.
//
// Markets have real stock. Every day, markets that import a good (H) use some up and
// its price creeps up; markets that export it (L) pile it up and its price sags. NPC
// haulers even this out: each voyage buys a real load where a good is cheap and
// delivers it days later where it is dear, moving both prices. Haulers stay off
// lanes where raids are running, so a raided station runs short of what it imports
// and drowns in what it exports until the lanes are safe or someone hauls the goods
// in. The traders you meet in flight are these voyages: rob one and its cargo is
// yours, destroy one and the delivery never arrives. Voyages live in st.haul.
// Loaded before game.js; only calls into it at runtime.

const UNREST_DRIFT = 0.035;    // share of the gap to normal closed each day (~20-day half-life)
const FLARE_CHANCE = 0.005;    // per location per day, where pirates operate at all
const FLARE_SIZE = 0.35;
const USE_RATE = 0.005;        // daily price push from local use where a good is imported (H), 2.5t
const MAKE_RATE = 0.009;       // and from output where it is exported (L): fewer exporters, so each makes more
const SETTLE = 0.9;            // markets that neither import nor export settle locally
const SHORTAGE_RATE = 0.05;     // extra daily push per unit of excess unrest: raided stations run down fast
const VOYAGES_PER_DAY = 12;       // at most; haulers only sail when a run is worth it
const HAUL_GAP = 0.05;           // how much scarcer (in price pressure) the far end must be
const HAUL_TONS = [20, 40];

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
  noteInbox('message', text);
  st.news.length = Math.min(st.news.length, 8);
}

const haul = () => (G.state.haul = G.state.haul || []);
const nudge = (pl, cid, dp) => {
  const key = `${pl.name}|${cid}`, p = Math.max(-MARKET_CAP, Math.min(MARKET_CAP, pressure(pl, cid) + dp));
  if (Math.abs(p) < 0.005) delete G.state.market[key];
  else G.state.market[key] = { p, day: G.state.day };
};

function worldTick() {
  for (const [sid, sys] of Object.entries(SYSTEMS)) {
    const w = worldOf(sid);
    if (sys.pirates > 0 && Math.random() < FLARE_CHANCE) {
      w.unrest = Math.min(1, w.unrest + FLARE_SIZE);
      worldNews(pick([
        `Pirate raids reported around ${sys.name}. Shipping there is thinning out.`,
        `A string of pirate attacks near ${sys.name} has haulers taking the long way round.`,
        `Insurance rates around ${sys.name} have doubled after a run of raids, and some captains are refusing the lane.`,
        `Pirate raiders are reported at ${sys.name}: two freighters missing, and the navy is "looking into it".`
      ]));
    }
    w.unrest += (sys.pirates - w.unrest) * UNREST_DRIFT;
    const raid = excessUnrest(sid) * SHORTAGE_RATE;
    for (const pl of sys.planets) {
      for (const [cid, level] of Object.entries(pl.prices)) {
        if (level === 'M') nudge(pl, cid, pressure(pl, cid) * (SETTLE - 1));
        else nudge(pl, cid, level === 'H' ? USE_RATE + raid : -MAKE_RATE - raid);
      }
    }
  }
  haulTick();
}

// ---------- NPC haulers ----------
const voyageDays = (a, b) => (a === b ? 1 : baseDays(a, b));

// Deliveries due today land; new voyages set out on the best spreads they can safely run.
function haulTick() {
  const st = G.state;
  for (const v of haul().filter(v => v.arrive <= st.day)) nudge(planetNamed(v.to).pl, v.cid, -v.tons * MARKET_PER_TON);
  st.haul = haul().filter(v => v.arrive > st.day);
  const markets = Object.entries(SYSTEMS).flatMap(([sid, sys]) => sys.planets.map(pl => ({ sid, pl })));
  const safe = sid => Math.random() > excessUnrest(sid) * 10;  // raids above 0.1 close a lane
  const open = markets.filter(m => safe(m.sid));
  for (let i = 0; i < VOYAGES_PER_DAY; i++) {
    // Haulers go where a good will be scarcer than usual when they arrive, counting what is
    // used up on the way and what is already inbound, so they don't all chase one shortage.
    let best = null;
    for (const b of open) {
      for (const cid of Object.keys(b.pl.prices)) {
        const due = inbound(b.pl, cid).reduce((t, v) => t + v.tons, 0) * MARKET_PER_TON;
        const use = b.pl.prices[cid] === 'H' ? USE_RATE : 0, now = pressure(b.pl, cid) - due;
        for (const a of open) {
          if (a === b || !a.pl.prices[cid] || price(b.pl, cid) <= price(a.pl, cid)) continue;
          const gap = now + use * voyageDays(a.sid, b.sid) - pressure(a.pl, cid);
          if (gap > HAUL_GAP && (!best || gap > best.gap)) best = { a, b, cid, gap };
        }
      }
    }
    if (!best) break;
    const e = economy(SYSTEMS[best.b.sid].gov), boost = e === 'boom' ? 1.3 : e === 'bust' ? 0.7 : 1;
    const tons = Math.round(randInt(...HAUL_TONS) * boost);
    nudge(best.a.pl, best.cid, tons * MARKET_PER_TON);
    haul().push({
      ship: `"${shipName(false)}"`, cid: best.cid, tons, from: best.a.pl.name, to: best.b.pl.name, fromSid: best.a.sid, toSid: best.b.sid,
      arrive: st.day + voyageDays(best.a.sid, best.b.sid),
    });
  }
}

// Ships in local space aren't saved, so a trader's voyage is always one in st.haul now.
const voyageOf = n => (n && haul().includes(n.voyage) ? n.voyage : null);

// A trader appearing in local space takes on a voyage passing through here (called
// from spawnNpc; captains you have met keep their own ships).
function boardVoyage(n) {
  if (n.kind !== 'trader') return;
  const here = G.state.systemId, taken = G.npcs.map(o => o.voyage);
  const v = pick(haul().filter(v => (v.fromSid === here || v.toSid === here) && !taken.includes(v)).concat([null]));
  if (!v) return;
  n.voyage = v;
  n.name = v.ship;
  if (v.toSid === here) n.goal = planetNamed(v.to).pl;  // bound for a planet here
}

// A voyage whose ship is destroyed or taken never delivers.
function loseVoyage(n) {
  const v = voyageOf(n);
  if (!v) return;
  G.state.haul = haul().filter(x => x !== v);
  if (v.tons > 0) worldNews(`The hauler ${v.ship}, carrying ${v.tons}t of ${COMMODITIES.find(c => c.id === v.cid).name} to ${v.to}, never arrived.`);
}

// Deliveries on their way to a planet, for the Port's conditions.
const inbound = (pl, cid) => haul().filter(v => v.to === pl.name && v.cid === cid);

// What a captain would hear about a location: raids, quiet lanes, shortages, gluts.
function conditions(sid) {
  const sys = SYSTEMS[sid], out = factionConditions(sys.gov), excess = excessUnrest(sid);
  if (excess > 0.2) out.push({ bad: true, text: `Heavy pirate activity around ${sys.name}` });
  else if (excess > 0.05) out.push({ bad: true, text: `Pirate raids around ${sys.name}` });
  else if (sys.pirates >= 0.15 && danger(sid) < sys.pirates * 0.6) out.push({ bad: false, text: `Lanes around ${sys.name} are quiet` });
  for (const pl of sys.planets) {
    for (const cid of Object.keys(pl.prices)) {
      const p = pressure(pl, cid), name = COMMODITIES.find(c => c.id === cid).name;
      if (p > 0.2) {
        const due = inbound(pl, cid), tons = due.reduce((t, v) => t + v.tons, 0);
        const eta = due.length ? `${tons}t inbound, first due ${dateOf(Math.min(...due.map(v => v.arrive)))}` : 'no haulers inbound';
        out.push({ bad: true, text: `Shortage of ${name} at ${pl.name} (+${Math.round(p * 100)}%, ${eta})` });
      }
      else if (p < -0.2) out.push({ bad: false, text: `Glut of ${name} at ${pl.name} (${Math.round(p * 100)}%)` });
    }
  }
  return out;
}

// ---------- faction states ----------
// Each faction's prosperity drifts toward normal, rises with trade in its markets,
// and falls with raids and war: above BOOM it booms (contracts pay more, NPC
// shipping is quick), below BUST it slumps. Tension between two factions grows with
// incidents; when it boils over they go to war, their navies fight in each other's
// space, and their markets want medical supplies, machine parts, and metal. The side
// that wins more battles (your kills and war goods count) takes the peace.

const STATE_FACTIONS = ['Arcology Compact', 'Dome Concord', 'Charter League'];
const BOOM = 0.75, BUST = 0.25, WAR_GOODS = ['medical', 'industrial', 'metal'];
const INCIDENTS = [
  'The {a} and the {b} trade accusations after a patrol standoff near {s}.',
  'The {b} impounds a freighter flagged to the {a}. Diplomats are recalled.',
  'The {b} accuses the {a} of arming pirates. The {a} denies it.',
  'Shots fired between {a} and {b} patrols near {s}. Nobody admits to firing first.',
  'The {a} closes a lane near {s} to {b} shipping, citing "security concerns". The {b} calls it an act of hostility.',
  'A {a} survey ship is turned away from {s} by {b} patrols. Both sides release very different accounts.',
  'The {b} expels three {a} traders from {s} on charges of smuggling. The {a} calls it a fabrication.',
  'An {a} envoy walks out of talks with the {b} at {s}, and refuses to say why.',
  'A {b} cutter is found drifting near {s}, its crew unharmed and very quiet. The {a} says it knows nothing.',
  'Feeds in both the {a} and the {b} are running clips of the standoff near {s}, and each is, of course, shot from a different angle.',
];

function factionState() {
  const st = G.state;
  st.factions = st.factions || { prosperity: {}, tension: {}, war: null };
  for (const f of STATE_FACTIONS) if (st.factions.prosperity[f] === undefined) st.factions.prosperity[f] = 0.5;
  return st.factions;
}

const pairKey = (a, b) => [a, b].sort().join('|');
const systemsOf = gov => Object.keys(SYSTEMS).filter(id => SYSTEMS[id].gov === gov);
const atWar = gov => { const w = factionState().war; return w && (w.a === gov || w.b === gov) ? w : null; };
const warFoe = gov => { const w = atWar(gov); return w ? (w.a === gov ? w.b : w.a) : null; };
const economy = gov => { const p = factionState().prosperity[gov]; return p === undefined ? null : p >= BOOM ? 'boom' : p <= BUST ? 'bust' : null; };

function factionTick() {
  const fs = factionState(), st = G.state;
  for (const f of STATE_FACTIONS) {
    let p = fs.prosperity[f];
    p += (0.5 - p) * 0.02;
    for (const id of systemsOf(f)) if (excessUnrest(id) > 0.05) p -= 0.004;
    if (atWar(f)) p -= 0.006;
    const before = economy(f);
    fs.prosperity[f] = Math.max(0, Math.min(1, p));
    const after = economy(f);
    if (after !== before) worldNews(after === 'boom' ? `The ${f} economy is booming.` : after === 'bust' ? `The ${f} economy is in a slump.` : `The ${f} economy is back to normal.`);
  }
  // Tension: incidents now and then, cooling otherwise.
  for (let i = 0; i < STATE_FACTIONS.length; i++) {
    for (let j = i + 1; j < STATE_FACTIONS.length; j++) {
      const a = STATE_FACTIONS[i], b = STATE_FACTIONS[j], k = pairKey(a, b);
      let t = (fs.tension[k] || 0) * 0.995;
      if (!fs.war && Math.random() < 0.016) {
        t += 0.25;
        const [x, y] = Math.random() < 0.5 ? [a, b] : [b, a];
        worldNews(pick(INCIDENTS).replace(/\{a\}/g, x).replace(/\{b\}/g, y).replace('{s}', SYSTEMS[pick(systemsOf(y))].name));
      }
      fs.tension[k] = t;
      if (!fs.war && t >= 1) {
        fs.war = { a, b, start: st.day, until: st.day + randInt(30, 60), score: { [a]: 0, [b]: 0 } };
        fs.tension[k] = 0;
        worldNews(`War: the ${a} and the ${b} are fighting. Their navies are raiding each other's space.`);
      }
    }
  }
  const w = fs.war;
  if (!w) return;
  // War demand in both sides' markets.
  for (const gov of [w.a, w.b]) {
    for (const id of systemsOf(gov)) {
      for (const pl of SYSTEMS[id].planets) {
        for (const cid of WAR_GOODS) {
          if (!pl.prices[cid]) continue;
          const key = `${pl.name}|${cid}`, p0 = st.market[key] ? st.market[key].p : 0;
          st.market[key] = { p: Math.min(MARKET_CAP, p0 + 0.02), day: st.day };
        }
      }
    }
  }
  if (st.day >= w.until) {
    const sa = w.score[w.a] + Math.random(), sb = w.score[w.b] + Math.random();
    const [win, lose] = sa >= sb ? [w.a, w.b] : [w.b, w.a];
    fs.prosperity[win] = Math.min(1, fs.prosperity[win] + 0.2);
    fs.prosperity[lose] = Math.max(0, fs.prosperity[lose] - 0.25);
    for (const id of systemsOf(lose)) worldOf(id).unrest = Math.min(1, worldOf(id).unrest + 0.2);
    fs.war = null;
    worldNews(`Ceasefire. The ${win} came out ahead; the ${lose} is counting its losses.`);
  }
}

// On arrival in a warring faction's space, its navy and the enemy's are already at it.
function warSkirmish() {
  const gov = localGov(), foe = warFoe(gov);
  if (!foe) return;
  const spawn = (side, enemyOf, n) => {
    for (let i = 0; i < n; i++) {
      const s = spawnNpc('patrol', true, true);
      Object.assign(s, { gov: side, hunts: `war:${enemyOf}`, war: true, hostile: repOf(side) <= -15,
        name: `${PATROL_NAMES[side]} "${shipName(false)}"` });
      if (side !== gov) s.x += rand(-600, 600), s.y += rand(-600, 600);
    }
  };
  spawn(gov, foe, 2);
  spawn(foe, gov, 2);
  msg(`Warning: ${foe} warships are engaging ${gov} patrols in local space.`);
}

function factionConditions(gov) {
  const out = [], w = atWar(gov), e = economy(gov);
  if (w) out.push({ bad: true, text: `The ${gov} is at war with the ${warFoe(gov)} (since ${dateOf(w.start)}). Its markets want medical supplies, machine parts, and metal.` });
  if (e === 'boom') out.push({ bad: false, text: `The ${gov} economy is booming: contracts pay 25% more.` });
  if (e === 'bust') out.push({ bad: true, text: `The ${gov} economy is in a slump: contracts pay 25% less.` });
  return out;
}

Mods.register({
  id: 'world', name: 'Living solar system', builtin: true,
  init(M) {
    M.on('newDay', worldTick);
    M.on('newDay', factionTick);
    M.on('enterSystem', warSkirmish);
    M.on('destroyed', (ship, byPlayer) => {
      const w = factionState().war;
      if (w && ship.kind === 'patrol' && w.score[ship.gov] !== undefined) {
        const other = ship.gov === w.a ? w.b : w.a;
        w.score[other] += byPlayer ? 2 : 1;
        if (byPlayer && ship.war) changeRep(other, 4);
      }
      loseVoyage(ship);
      if (!byPlayer) return;
      const u = worldOf(G.state.systemId);
      if (ship.kind === 'pirate') u.unrest = Math.max(0, u.unrest - 0.06);
      else if (ship.kind === 'trader') u.unrest = Math.min(1, u.unrest + 0.05);
    });
    M.on('trade', (planet, cid, tons, dir) => {
      const sid = Object.keys(SYSTEMS).find(id => SYSTEMS[id].planets.includes(planet));
      const gov = SYSTEMS[sid].gov, fs = factionState();  // where the market is, not where you are
      if (dir !== -1 || fs.prosperity[gov] === undefined) return;
      fs.prosperity[gov] = Math.min(1, fs.prosperity[gov] + tons * 0.0008);
      const w = atWar(gov);
      if (w && WAR_GOODS.includes(cid)) w.score[gov] += tons / 20;
    });
    M.filter('missionPay', pay => {
      const e = economy(localGov());
      return e === 'boom' ? pay * 1.25 : e === 'bust' ? pay * 0.75 : pay;
    });
  },
});
