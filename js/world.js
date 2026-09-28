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
    const e = economy(sys.gov), pace = e === 'boom' ? 0.6 : e === 'bust' ? 1.5 : 1;  // booming economies ship more
    const recover = Math.pow(0.5, 1 / (MARKET_HALF_LIFE * pace * (1 + 4 * excess)));
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
  const sys = SYSTEMS[sid], out = factionConditions(sys.gov), excess = excessUnrest(sid);
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

// ---------- faction states ----------
// Each faction's prosperity drifts toward normal, rises with trade in its markets,
// and falls with raids and war: above BOOM it booms (contracts pay more, NPC
// shipping is quick), below BUST it slumps. Tension between two factions grows with
// incidents; when it boils over they go to war, their navies fight in each other's
// space, and their markets want medical supplies, machine parts, and metal. The side
// that wins more battles (your kills and war goods count) takes the peace.

const STATE_FACTIONS = ['Earth Coalition', 'Mars Republic', 'Belt Collective'];
const BOOM = 0.75, BUST = 0.25, WAR_GOODS = ['medical', 'industrial', 'metal'];
const INCIDENTS = [
  'The {a} and the {b} trade accusations after a patrol standoff near {s}.',
  'The {b} impounds a freighter flagged to the {a}. Diplomats are recalled.',
  'The {b} accuses the {a} of arming pirates. The {a} denies it.',
  'Shots fired between {a} and {b} patrols near {s}. Nobody admits to firing first.',
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
  if (w) out.push({ bad: true, text: `The ${gov} is at war with the ${warFoe(gov)} (day ${G.state.day - w.start + 1}). Its markets want medical supplies, machine parts, and metal.` });
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
      if (!byPlayer) return;
      const u = worldOf(G.state.systemId);
      if (ship.kind === 'pirate') u.unrest = Math.max(0, u.unrest - 0.06);
      else if (ship.kind === 'trader') u.unrest = Math.min(1, u.unrest + 0.05);
    });
    M.on('trade', (planet, cid, tons, dir) => {
      const gov = localGov(), fs = factionState();
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
