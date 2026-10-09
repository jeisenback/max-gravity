'use strict';

// The hired-hand start: you sign on to an NPC captain's ship instead of owning one. The ship,
// its cargo and its running costs are the captain's; you man one post (manual for you) while
// the captain's crew fill the rest, and what you hold is your own savings. A hired game has
// st.hired; an owner game has none and plays as it always has. The captain plans each run
// (the best cargo and port within reach, bought from the ship's funds), you press Sail, and on
// arrival the cargo is sold and you are paid a wage and a share of the profit. Side jobs come
// with errands you can take on your own time (the captain keeps a cut), swapping posts with #60, buying in with #61.
// Loaded before game.js; only calls into it at runtime.

const HIRED_POSTS = ['pilot', 'gunner', 'engineer', 'comms'];  // the posts you can sign on to
const HIRED_SAVINGS = 300;
// The rest of the crew, beside the four posts: a first officer, a quartermaster, a medic, a cook and two ice hands.
const CHAPTER_CREW = [{ role: 'xo', skill: 2 }, { role: 'quartermaster', skill: 2 }, { role: 'medic', skill: 2 }, { role: 'cook', skill: 2 }, { role: 'icehand', skill: 1 }, { role: 'icehand', skill: 1 }];
const HIRED_FUND = 12000;  // the ship's money, which buys the cargo for the 120 t hold
const HIRED_WAGE = 40, HIRED_SHARE = 0.06;  // a day's wage and a share of each run's profit, tuned with tools/soak.js so about 20 runs reach the target
const HAND_RAID = { base: 0.08, per: 1.4 };  // a hand's chance of a pirate contact on a run: this and the lane's danger (engage.js), in place of 0.05 and 0.6
const HAND_LANE_WEIGHT = 8;  // and how much a dangerous lane weights the ship's own incidents (happenings.js)
const LIGHT_DUTY = 0.6;  // a hurt hand's wage while they work light duty
const HIRED_DEBT = 3000, DEBT_SHARE = 0.3;  // the hiring hall's bond for the berth, the passage and the kit (#280): a third of each run's pay goes to it, never more than is owed
const HIRED_TARGET = 19000;  // the used Ore Runner Tomas finds (the chapter's goal), at the price he asks a hand he thinks well enough of
// The captain heads for a yard when the used Ore Runner can be had: at the offer's threshold until she is offered, then at
// her price, and at the middle price again if the deal lapses.
const wantsYard = () => { const h = hired(); return G.state.credits >= (!h.deal ? (captainBeatsDone(h) ? USED_OFFER_AT : HIRED_TARGET) : dealOpen() ? h.deal.price : HIRED_TARGET); };
const hired = () => (G.state && G.state.hired) || null;
// A hired hand works one post. The others are the crew's, and the captain's to command.
const hiredCaptain = () => (hired() ? G.state.people[hired().captain] : null);
const notYours = post => !!hired() && hired().post !== post;

// ---------- skill at each post ----------
// Experience points per post, kept when you swap. Levels come at 0, 12, 45 and 110 points: about 0.7 a day, so a chapter of a hundred
// days ends at the second level, and the third is for someone who works at it (or the chapters after).
const SKILL_STEPS = [0, 12, 45, 110];
// Runs with the captain and what they paid you, over the whole chapter. A save from before these were kept counts what its ledger holds.
const runTotals = h => ({
  runs: h.runsDone !== undefined ? h.runsDone : h.ledger.length,
  earned: h.earnedTotal !== undefined ? h.earnedTotal : h.ledger.reduce((t, l) => t + l.wage + l.share, 0),
});
const skillXp = post => (hired() && hired().skill && hired().skill[post]) || 0;
const skillLevel = post => Math.max(0, SKILL_STEPS.filter(n => skillXp(post) >= n).length - 1 - (handHurt() ? 1 : 0));  // a hurt hand works a level lower (boarders.js)
// The step a post's points have reached, from the stored points alone: an injury (skillLevel above) lowers the level worked, not this.
const skillStep = xp => SKILL_STEPS.filter(s => xp >= s).length - 1;
function gainSkill(post, n) {
  const h = hired();
  if (!h) return;
  h.skill = h.skill || {};
  const before = skillStep(h.skill[post] || 0);
  h.skill[post] = (h.skill[post] || 0) + n;
  if (post === h.post && skillStep(h.skill[post]) > before) levelNote(post, skillStep(h.skill[post]));
}
// One plain line when the hand's own post reaches a new level, on the port screen when docked and in the flight log on a burn (as Mods' note).
function levelNote(post, level) {
  const name = POSTS[post].name, text = `Your work at the ${name.toLowerCase()} post is level ${level} now. Your own move in a raid works a tenth more often${level >= 2 ? `, and the choices marked [${name} ${level}] are open to you` : ''}.`;
  if (G.mode !== 'landed') return msg(text);
  UI.notes.push(text);
  if (!G.dialog) UI.render();
}
// Doing a job yourself: the odds are worse than a crew member's, and get better as you learn the post.
const soloOdds = post => 0.45 + 0.1 * skillLevel(post);
// What stays the captain's to do: the cargo, the contracts, the ship itself, the company.
const OWNER_TABS = ['trade', 'company'];  // contracts are the captain's too, but the board still has errands
const OWNER_ACTIONS = ['takeoff', 'buy', 'buymax', 'sell', 'sellall', 'buyship', 'cbuy', 'refuel', 'repair', 'overhaul', 'buyout', 'sellout', 'torpbuy', 'hire', 'interviewHire', 'dismiss'];

function setupHired(o) {
  const st = G.state, post = HIRED_POSTS.includes(o.post) ? o.post : scopeOff('posts') ? 'gunner' : 'pilot';
  st.shipId = 'freighter';
  st.fuel = SHIPS.freighter.fuel; st.armor = SHIPS.freighter.armor;
  st.credits = o.credits !== undefined ? o.credits : HIRED_SAVINGS;  // o.credits and o.skill: a hand put ashore (stakes.js) carries both to the next berth
  st.carried = o.carried || null;  // one line the dock says of the last ship (stakes.js); Signing On shows it once
  st.tips = {};  // the one-time tips this game has shown (help.js): a new game shows them again
  st.tutorial = o.tutorial ? 0 : null;  // the first run's steps (tutorial.js); a hand put ashore or a test starts without
  home().name = shipName(false);
  // The captain, and a crew with every role but yours. The main characters (cast.js) take their posts first.
  // An authored captain (captains.js) with their first officer; a game with none keeps a generated captain.
  const captainKey = CAPTAINS[o.captainKey] ? o.captainKey : Object.keys(CAPTAINS).length ? pickCaptainKey() : null;  // o.captainKey: a test or a tester's choice
  const cap = captainKey ? captainPerson(captainKey) : registerPerson(makePerson(cultureOf(st.systemId)));
  cap.role = 'captain'; cap.job = 'captain';
  const free = ['pilot', 'gunner', 'engineer', 'slicer'].filter(r => r !== POSTS[post].role), placed = castCrew(st.background, free);
  for (const role of free.filter(r => !placed.includes(r))) {
    const c = makeCrewCandidate(st.systemId);
    c.role = role; c.skill = 2; c.job = ROLE_NAMES[role].toLowerCase(); c.mood = null;
    registerPerson(c);
    st.crew.push(c.id);
  }
  for (const { role, skill } of CHAPTER_CREW) {
    if (role === 'xo' && captainKey) {  // the captain's own first officer
      const xo = castPerson(CAPTAINS[captainKey].xo);
      castRec(CAPTAINS[captainKey].xo).since = st.day;
      st.crew.push(xo.id);
      continue;
    }
    const c = makeCrewCandidate(st.systemId);
    c.role = role; c.skill = skill; c.job = ROLE_NAMES[role].toLowerCase(); c.mood = null;
    registerPerson(c);
    st.crew.push(c.id);
  }
  const d = captainKey && CAPTAINS[captainKey];
  st.hired = {
    captain: cap.id,
    captainKey,
    post,
    since: st.day,
    wage: d ? d.wage : HIRED_WAGE,
    share: d ? d.share : HIRED_SHARE,
    fund: HIRED_FUND,
    run: null,
    ledger: [],
    skill: {
    ...(o.skill || {}),
    [post]: Math.max((o.skill || {})[post] || 0, SKILL_STEPS[1])
  },
    asked: 0,
    raidTold: false,
    debt: o.debt !== undefined ? o.debt : HIRED_DEBT
  };  // o.debt: a hand put ashore carries what is left (stakes.js)
  // The port screen says only what Signing On (signon.js) does not: who put a hand ashore, or that the captain was lost. The ship, the captain, the post and
  // the savings are said there, once.
  if (o.captainLost) return [`${o.captainLost} did not come back from the bridge. You carry your savings and what you learned.`];
  return o.putOffBy ? [`${o.putOffBy} put you ashore. You carry your savings and what you learned.`] : [];
}

// ---------- burn events ----------
// On the captain's ship the calls on the road are the captain's, and the money is the ship's.

// A hired hand's burn events spend and earn the ship's funds, not their savings.
function hiredFunds(fn) {
  const h = hired();
  if (!h || !G.transit) return fn();
  const st = G.state, mine = st.credits;
  st.credits = h.fund;
  try { return fn(); } finally { h.fund = st.credits; st.credits = mine; }
}

// How the captain's style (captains.js) shows in a run. A captain with no entry (an older save) keeps the old behavior:
// always the best run, no fear of a dangerous lane, listens at HEARD, gives a bonus at BONUS.
const TRADE_PICKS = { 1: 4, 2: 3, 3: 2, 4: 1, 5: 1 };  // trade: how many of the best-scoring runs the captain may take one of
const laneRisk = sid => { const d = captainEntry(); return d ? 1 - 0.6 * ((5 - d.captain.nerve) / 4) * danger(sid) : 1; };  // a cautious captain marks a dangerous lane down
const captainHears = () => (captainEntry() ? captainEntry().hears : OPINION.HEARD);
const captainBonus = () => (captainEntry() ? captainEntry().bonus : OPINION.BONUS);
const captainWeight = g => HIRED_WEIGHTS[g] * (g === 'captain' && captainEntry() ? captainEntry().talk : 1);  // how often they turn up

// Who decides what: the first officer (the captain's own, if one is aboard) takes the crew-side calls and the post swaps, and
// the captain keeps money and the ship. Without a first officer (an older save, or one who has died) the captain decides all.
const hiredXo = () => { const d = captainEntry(); return (d && castAboard().find(c => c.cast === d.xo)) || null; };
const bossFor = kind => (kind === 'swap' || kind === 'crew' ? hiredXo() : null) || hiredCaptain();
const bossName = p => (p.role === 'xo' ? p.first : `Captain ${p.last}`);

// The captain leans cautious: the last way out is likelier, a fight is likelier when it comes to that,
// and nothing costly is chosen unless the ship can afford it.
function captainPick(choices) {
  const fund = hired().fund, d = captainEntry();
  const floor = 1000 * (d ? d.captain.thrift : 4), fight = d ? d.captain.nerve - 1 : 2;  // an older save's captain: 4,000 and a fight twice as likely
  const weights = choices.map((c, i) => (/pay|fine|buy/i.test(c.label) && fund < floor ? 0.2 : 1 + (i === choices.length - 1 ? 1 : 0) + (/battle stations/i.test(c.label) ? fight : 0)));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < choices.length; i++) if ((r -= weights[i]) < 0) return choices[i];
  return choices[choices.length - 1];
}

// Who decides an event: a ship-to-ship matter is the captain's; some are a post's (the engineer's coolant
// leak); the rest (the crew, your own affairs) are yours. Not yours: the first officer takes a post's call (the crew side), the captain takes the rest.
function hiredCall(ev) {
  const h = hired();
  if (!h || !G.transit || ev.decided || !ev.choices) return ev;
  const owner = ev.owner || (ev.via === 'ship' ? 'captain' : 'you');
  if (owner === 'you' || owner === h.post) return ev;
  const cap = ev.via === 'ship' || owner === 'captain' ? hiredCaptain() : bossFor('crew');
  const usable = ev.choices.filter(c => hiredFunds(() => !c.can || c.can()) && (!c.role || roleSkill(c.role)) && !/yourself/i.test(c.label));
  if (!usable.length) return ev;
  const c = captainPick(usable);
  const said = c.label.replace(/\s*\(.*?\)/g, '').replace(/\[\{crew\}\]\s*/, '').replace(/\{crew\}/g, 'the crew').replace(/\s+/g, ' ').trim();
  return { ...ev, decided: true, text: `${ev.text} ${bossName(cap)} takes the call: "${said}."`,
    choices: [{ label: 'See how it goes', run: () => { const r = c.run(); return c.role ? r.replace(/\{crew\}/g, roleName(c.role)) : r; } }] };
}

// ---------- downtime ----------
const PRACTICE = {
  pilot: 'You take the helm through the drills the old hands swear by: a flip on the sim, a docking by the numbers, a dead-stick approach with the lights out.',
  gunner: 'You spend a watch on the range sim, tracking and leading targets, until the fire control stops fighting you and starts finishing your sentences.',
  engineer: 'You go through the plant one system at a time, with the manual open and a meter in your teeth, and find three things nobody had written down.',
  comms: 'You sit on the bands for a watch, learning the rhythm of a dozen stations, and which of them are lying about their transponders.',
};
ACTIVITIES.practise = { hiredOnly: true, label: 'Practice at your post', can: () => !!hired(), run() { if (!hired()) return 'There is nothing to practice.'; gainSkill(hired().post, 3); return `${PRACTICE[hired().post]} (Experience at the ${POSTS[hired().post].name.toLowerCase()} post.)`; } };
// What a hired hand can do with downtime: not the captain's drills or rounds of the berths, and the hull is the engineer's.
const hiredMay = (id, a) => a.hiredOnly ? !!hired() : !hired() || (!['drills', 'visit'].includes(id) && (id !== 'repair' || hired().post === 'engineer'));

// ---------- the captain's runs ----------

// Every port outside this system that buys something we can carry, scored by profit per day.
let planAlts = [];  // the runs that came next, for the hand to suggest (suggest.js)
function planRun() {
  planAlts = [];
  const st = G.state, h = st.hired, here = currentPlanet(), free = cargoFree(), from = st.systemId;
  const reach = Object.entries(SYSTEMS).filter(([sid]) => sid !== from && inRange(from, sid));
  const held = COMMODITIES.filter(c => (st.cargo[c.id] || 0) > 0).sort((a, b) => st.cargo[b.id] - st.cargo[a.id])[0];
  const options = [];
  // Once your savings would buy the chapter's ship, she heads for a port with a yard when she can.
  const wantYard = wantsYard();
  for (const [sid, sys] of reach) {
    const days = Math.max(1, travelDays(from, sid));
    for (const pl of sys.planets.filter(x => x.services.includes('trade'))) {
      if (held) {  // already loaded (a run that ended somewhere else): sell what we have
        const sell = price(pl, held.id);
        if (sell !== null) options.push({ sid, planet: pl.name, yard: pl.services.includes('shipyard'), good: held.id, tons: st.cargo[held.id], cost: Math.round(st.paid[held.id] || 0), loaded: true, profit: Math.round(sell * st.cargo[held.id] - (st.paid[held.id] || 0)), days });
        continue;
      }
      if (!here.services.includes('trade')) continue;
      for (const c of COMMODITIES) {
        const buy = price(here, c.id), sell = price(pl, c.id);
        if (buy === null || sell === null || sell <= buy) continue;
        let tons = Math.min(free, Math.floor(h.fund / buy));
        while (tons > 0 && tradeTotal(here, c.id, tons, 1) > h.fund) tons--;
        if (tons > 0) options.push({ sid, planet: pl.name, yard: pl.services.includes('shipyard'), good: c.id, tons, cost: Math.round(tradeTotal(here, c.id, tons, 1)), profit: Math.round((sell - buy) * tons), days });
      }
    }
  }
  const ice = !held && typeof iceOption === 'function' ? iceOption(here, from, reach, free) : null;  // the long run, when it is due (icerun.js)
  if (ice) return ice;
  const score = o => (o.profit / o.days) * (wantYard && o.yard ? 4 : 1) * laneRisk(o.sid);
  const ranked = options.sort((a, b) => score(b) - score(a)).filter(o => o.profit > 0);
  planAlts = ranked.slice(0, 4);
  const top = ranked.slice(0, captainEntry() ? TRADE_PICKS[captainEntry().captain.trade] : 1);
  const best = top.length > 1 ? pick(top) : top[0];
  if (best) return { ...best, ballast: false };
  // Nothing worth carrying: run light to the nearest port that trades, and look for work there.
  const dest = reach.flatMap(([sid, sys]) => sys.planets.filter(x => x.services.includes('trade')).map(pl => ({ sid, planet: pl.name, yard: pl.services.includes('shipyard'), days: Math.max(1, travelDays(from, sid)) })))
    .sort((a, b) => (wantYard ? (b.yard - a.yard) : 0) || a.days - b.days)[0];
  return dest ? { ...dest, good: null, tons: 0, cost: 0, profit: 0, ballast: true } : null;
}

// The plan is made once per stop and kept, unless the hold has changed since (a plan to sell cargo that is gone).
const planStale = h => !h.plan || h.plan.day !== G.state.day || h.plan.at !== G.state.planet
  || h.plan.cargo !== JSON.stringify(G.state.cargo);
const currentPlan = () => { const h = G.state.hired; if (planStale(h)) { const run = planRun(); h.plan = {
  day: G.state.day,
  at: G.state.planet,
  cargo: JSON.stringify(G.state.cargo),
  run,
  alts: planAlts.filter(o => !run || o.sid !== run.sid || o.planet !== run.planet || o.good !== run.good).slice(0, 3)
}; } return h.plan.run; };

// Buys the cargo, sets the course, and sails: a crewed pilot flies her out, otherwise the pilot is you.
function sail() {
  const st = G.state, h = st.hired, plan = currentPlan(), here = currentPlanet();
  if (!plan || G.mode !== 'landed' || G.dialog) return false;
  let cost = plan.cost;
  if (plan.good && !plan.loaded && !plan.ice) {
    cost = Math.round(tradeTotal(here, plan.good, plan.tons, 1));
    recordTrade(here, plan.good, plan.tons, 1);
    st.cargo[plan.good] = (st.cargo[plan.good] || 0) + plan.tons;
    st.paid[plan.good] = (st.paid[plan.good] || 0) + cost;
    h.fund -= cost;
  }
  h.run = { ...plan, cost, day: st.day, from: st.planet };
  if (plan.ice) { h.run.ice = { edge: 0 }; h.iceAt = st.day; }  // the ice is cut on the way, not bought
  h.plan = null;
  st.dest = plan.sid;
  st.route = { dock: plan.planet, go: true };
  // A crewed pilot flies her out and in; if you are the pilot, you do.
  if (postMode('pilot') === 'crewed') ORDERS.pilot.find(o => o.id === 'depart').run(); else takeOff();
  return true;
}

// On arrival: sell the cargo, and pay the wage and the share.
function settleRun(planet) {
  const st = G.state, h = st.hired, run = h.run;
  if (!run || planet.name !== run.planet || st.systemId !== run.sid) return;
  if (run.ice && typeof iceFinish === 'function') iceFinish();  // a burn that skipped the scenes comes home thin
  let revenue = 0, sold = 0;
  if (run.good && st.cargo[run.good] && price(planet, run.good) !== null) {
    sold = st.cargo[run.good];
    revenue = Math.round(tradeTotal(planet, run.good, sold, -1) * (run.ice ? ICE_PREMIUM : 1));  // an ice run is sold on a contract (icerun.js)
    recordTrade(planet, run.good, sold, -1);
    delete st.cargo[run.good]; delete st.paid[run.good];
    h.fund += revenue;
  }
  const profit = revenue - run.cost, days = Math.max(1, st.day - run.day);
  const wage = Math.round(h.wage * days * (run.ice ? ICE_HAZARD : 1) * (handHurt() ? LIGHT_DUTY : 1)), owed = Math.min(h.bill || 0, Math.max(0, profit)), share = profit > 0 ? Math.round((profit - owed) * h.share) : 0;  // the yard bill (repairs.js) comes out of the profit first
  h.bill = Math.max(0, (h.bill || 0) - owed);  // (the long run pays double the wage, above)
  const toHall = Math.min(h.debt || 0, Math.round((wage + share) * DEBT_SHARE));  // the hall's cut of the pay, never more than is owed
  if (toHall) { h.debt -= toHall; if (!h.debt) captainFlag('debtCleared'); }
  st.credits += wage + share - toHall;
  const total = runTotals(h);
  h.runsDone = total.runs + 1; h.earnedTotal = total.earned + wage + share;  // the ledger keeps the last 20; these keep the whole chapter
  h.ledger.unshift({ day: st.day, from: run.from, to: planet.name, good: run.good, tons: sold, cost: run.cost, revenue, profit, wage, share, hall: toHall, days, ice: !!run.ice });
  h.ledger.length = Math.min(h.ledger.length, 20);
  // The first officer settles up on the first arrival (captains.js): keep the figures, and leave the one-line note for later arrivals.
  const settling = total.runs === 0 && arrivalWanted();
  if (settling) h.first = { good: run.good ? COMMODITIES.find(c => c.id === run.good).name.toLowerCase() : null, tons: sold, cost: run.cost, revenue, profit, forecast: run.profit, wage, share, hall: toHall, owed: h.debt || 0, days, planet: planet.name };
  h.run = null;
  h.plan = null;
  gainSkill(h.post, 2);  // a burn worked
  like(st.people[h.captain], profit > 0 ? 1 : -1, profit > 0 ? 'Good run. You pull your weight.' : 'That run lost money.');
  const name = run.good ? COMMODITIES.find(c => c.id === run.good).name : null;
  if (settling) return;
  return (`${name ? (`The captain sold ${sold}t of ${name} for ${fmt(revenue)} cr (${profit >= 0 ? `profit ${fmt(profit)}` : `loss ${fmt(-profit)}`} ` +
      `cr). `) : 'A run with no cargo. '}Your ` +
      `pay: ${fmt(wage)} cr ` +
      `wage${share ? ` and ${fmt(share)} cr share` : ''}.${owed ? ` The yard bill took ${fmt(owed)} cr of the profit first.` : ''}${toHall ? ` The hall took ${fmt(toHall)} cr of your pay. ${h.debt ? `${fmt(h.debt)} cr still owed.` : 'The bond is paid.'}` : ''}`);
}

// ---------- errands ----------
// Small jobs for the port she is sailing to: a parcel that takes no cargo space, paid less than
// a contract, and the captain keeps a fifth. They are delivered when she docks there.
const ERRAND_CUT = 0.2;
const ERRANDS = [
  ['a sealed parcel', 'A courier bag with a wax seal, and a receipt to bring back signed. It weighs about as much as a lunch.'],
  ['a message on a chip', 'A hand-written note on a data chip: somebody does not trust the public bands with it.'],
  ['a set of spare keys', 'A ring of keys for a flat somebody has not seen in years. They want them back before the lease runs out.'],
  ['a box of medicine', 'A small insulated box with a cold-chain tag. The label says to keep it upright and out of the sun.'],
  ['a crate of seedlings', 'A tray of green shoots under a grow light that has to stay on. You carry it in your bunk.'],
];

function errandsFor(planet) {
  const st = G.state, plan = currentPlan();
  if (scopeOff('errands') || !planet.services.includes('missions') || !plan) return [];
  const dest = SYSTEMS[plan.sid].planets.find(p => p.name === plan.planet);
  return Array.from({ length: randInt(1, 3) }, () => {
    const [what, blurb] = pick(ERRANDS), gross = randInt(2, 6) * 10 * Math.max(1, plan.days), cut = Math.round(gross * ERRAND_CUT);
    return {
      type: 'errand', title: `Errand: carry ${what} to ${dest.name}`, blurb: `${blurb} The captain keeps ${fmt(cut)} cr of the fee.`,
      destSystem: plan.sid, destPlanet: dest.name, pay: gross - cut, cut, deadline: st.day + plan.days * 2 + randInt(6, 12),
    };
  });
}

// ---------- swapping posts ----------

// How likely the captain is to say yes: how far they trust you, and what you know of the post.
function swapOdds(post) {
  const boss = bossFor('swap');
  return Math.max(0.1, Math.min(0.95, 0.35 + 0.1 * boss.opinion + 0.1 * skillLevel(post)));
}

function askSwap(post) {
  const st = G.state, h = hired();
  if (!h || !POSTS[post] || post === h.post || G.mode !== 'landed' || h.asked === st.day) return;
  h.asked = st.day;
  const cap = bossFor('swap'), role = POSTS[post].role, mine = POSTS[h.post].role;
  const holder = roleHolder(role) || st.crew.map(person).find(c => c.role === role);
  const who = cap.first;
  if (Math.random() >= swapOdds(post)) {
    like(cap, 0, `You asked to move to ${POSTS[post].name.toLowerCase()} and I said not yet.`);
    return M_NOTE(`${who}: "Not yet. Show me more on the ${POSTS[h.post].name.toLowerCase()} first, and ask me again after the next run."`);
  }
  if (holder) { holder.role = mine; holder.skill = Math.max(1, holder.skill - 1); holder.job = ROLE_NAMES[mine].toLowerCase(); }  // they take the post you leave
  h.post = post;
  M_NOTE(`${who}: "All right. You are the ${POSTS[post].name.toLowerCase()} from here.${holder ? ` ${holder.first} will take the ${POSTS[Object.keys(POSTS).find(k => POSTS[k].role === mine)].name.toLowerCase()}.` : ''}"`);
}
let M_NOTE = () => {};

function swapHtml() {
  const h = hired(), cap = bossFor('swap'), asked = h.asked === G.state.day;
  return `<div class="post"><div class="eyebrow">Your posts &middot; ${esc(bossName(cap))} decides</div>
    ${HIRED_POSTS.map(p => `<div class="row"><span><b>${POSTS[p].name}</b>${p === h.post ? ' <span class="tag good">yours</span>' : ''} <span class="hint">level ${skillLevel(p)} (${skillXp(p)} points)</span></span>
      ${p === h.post ? '' : `<button data-action="swapPost" data-arg="${p}" ${asked ? 'disabled' : ''}>Ask to move (${Math.round(swapOdds(p) * 100)}%)</button>`}</div>`).join('')}
    <p class="hint">Your work at a post teaches you, and what you learn stays with you. They decide, by how far they trust you and what you know. ${asked ? 'You have asked already; ask again after the next run.' : ''}</p>
  </div>`;
}

const crewView = UI.views.crew;
UI.views.crew = function () { return (hired() ? swapHtml() : '') + crewView.call(this); };

// ---------- buying in ----------

// The crew member you are closest to, if you are close to anyone at all.
function buyInFriend() {
  const crew = G.state.crew.map(person).filter(c => c.opinion >= OPINION.CLOSE);
  return crew.sort((a, b) => b.opinion - a.opinion || b.skill - a.skill)[0] || null;
}
// Who leaves with you: the main characters aboard who like you, both if both think well of you, otherwise the one who
// likes you most; and if none do, the crew member you are closest to.
function buyInCompanions() {
  const cast = G.state.crew.map(person).filter(c => c.cast && c.opinion >= OPINION.CLOSE).sort((a, b) => b.opinion - a.opinion);
  if (cast.length) return cast.length > 1 && cast[1].opinion >= CAST_GOOD ? cast.slice(0, 2) : cast.slice(0, 1);
  const friend = buyInFriend();
  return friend ? [friend] : [];
}
const namesOf = list => list.map(c => `${c.first} ${c.last}`).join(' and ');

// ---------- the used Ore Runner ----------
// The hull Tomas rebuilt three times. Once your savings reach USED_OFFER_AT (55% of her middle price), at a port with a yard,
// she is offered once (by Tomas, or by a broker if he is not aboard) for DEAL_DAYS, at a price that follows how Tomas
// thinks of you. buyIn id USED_ID buys her; she comes worn. If the deal lapses she is gone, and the ordinary list is left.
const USED_ID = 'used';
const USED_PRICE = { good: 17000, mid: HIRED_TARGET, bad: 21000 };  // the broker's price is the bad one: no favor
const USED_OFFER_AT = Math.round(0.55 * USED_PRICE.mid), DEAL_DAYS = 56;
const USED_CONDITION = { drive: 70, life: 65, shields: 60, sensors: 70, fire: 45 };
const buyShip = id => (id === USED_ID ? { ...SHIPS.lightfreighter, name: 'Ore Runner (used)', price: hired() && hired().deal ? hired().deal.price : USED_PRICE.mid, forSale: dealOpen() } : SHIPS[id]);
const dealOpen = () => !!hired() && !!hired().deal && G.state.day <= hired().deal.until;
const tomasAboard = () => castAboard().find(c => c.cast === 'tomas') || null;

function dealScene(planet) {
  const st = G.state, h = hired(), tomas = tomasAboard();
  const price = tomas ? (tomas.opinion >= OPINION.FRIEND ? USED_PRICE.good : tomas.opinion < 0 ? USED_PRICE.bad : USED_PRICE.mid) : USED_PRICE.bad;
  h.deal = { price, day: st.day, until: st.day + DEAL_DAYS, broker: !tomas };
  const fault = 'Her drive is all right. Her life support I would watch. Her fire control is nearly done, and you should not trust it.';
  const tell = price < USED_PRICE.mid ? `${fmt(price)} cr, and that is the price for you.` : price > USED_PRICE.mid && tomas ? `${fmt(price)} cr, and I am not going to pretend it is a favor.` : `${fmt(price)} cr.`;
  if (tomas) captainFlag('tomasWaited');  // the last piece of the spine (#294)
  return tomas ? {
    title: 'A Hull on the Apron', personal: true,
    text: (`Tomas is waiting at the head of the ramp when you come back from the yard office, wiping his hands on a rag that has not been clean in ` +
        `years. "Come and see something," he says. He walks you the length of the apron to a long, tired Ore Runner with a mismatched hatch and primer ` +
        `on one flank. "I have rebuilt her three times," he says. "Three owners, and every one of them sold her, and none for bad luck. Each ran one ` +
        `payment short. I fixed what the last one skipped, and the next one skipped it again, because they were paying the bank and not the ship. She ` +
        `is for sale once more, and cheap, because the last owner let her go." He lays a palm flat on her hull. "${fault} I know every fault she ` +
        `has. ${h.debt > 0 ? `You owe the hall ${fmt(h.debt)} still. I looked at its book. Clear it, and you will be the first owner she has had who owes nobody.` : `You owe nobody now. I looked at the hall\'s book. She has only ever had owners who owed everybody.`} ` +
        `I would rather you had her than a stranger. ${tell} Give it a few weeks and she will be gone."`),
    choices: [{ label: 'Walk her with him', run() { like(tomas, 1, 'The captain walked the Ore Runner with me, and listened.'); return (
        `He shows you the drive housing, the patched coolant line and the place where the fire control cable has been spliced twice. He talks the ` +
        `whole way, and does not once sound like he is selling. The ship is on the yard list now, as the used Ore Runner, until about ` +
        `day ${h.deal.until}.`); } }],
  } : {
    title: 'A Used Ore Runner', personal: true,
    text: (`A broker at the yard office has been watching the board for someone with savings. "There is a used Ore Runner on the apron," the broker ` +
        `says. "Three owners, a lot of repairs, and the last one let her go. Her fire control is poor and her life support is tired. The yard will not ` +
        `warrant either. ${fmt(price)} cr, as she stands. Give it a few weeks and somebody else will have her."`),
    choices: [{ label: 'Look her over', run: () => `You walk the apron with the broker and look her over. She is worn, and she is a ship. She is on the yard list now, as the used Ore Runner, until about day ${h.deal.until}.` }],
  };
}
// The first piece of the spine (#294): from the second arrival on, a long Ore Runner on the apron with her name painted over, and Tomas
// walks past her. Once, and only with Tomas aboard.
function hullNote() {
  const h = hired(), tomas = castAboard().find(c => c.cast === 'tomas');
  if (!h || !tomas || (h.flags || {}).sawHull || runTotals(h).runs < 2) return;
  captainFlag('sawHull');
  M_NOTE('On the apron a long Ore Runner sits on her struts with her name painted over in grey. Tomas stops at the foot of the ramp and looks at her. Then he walks on.');
}
// Offered once, at a yard, when the savings are about 55% of her middle price and the captain's two scenes have played (captains.js). A lapsed deal is noted once.
function dealCheck(planet) {
  const st = G.state, h = hired();
  if (!h) return;
  if (h.deal && !dealOpen() && !h.deal.lapsed) { h.deal.lapsed = true; M_NOTE('The used Ore Runner is gone. Somebody else bought her.'); return; }
  if (h.deal || !planet.services.includes('shipyard') || st.credits < USED_OFFER_AT || !captainBeatsDone(h) || G.dialog) return;
  openEvent(dealScene(planet));
}
const buyInPrice = id => buyShip(id).price - (hired() && hired().haggle && hired().haggle.id === id ? hired().haggle.off : 0);  // nothing to trade in: the ship you fly is the captain's
const canBuyIn = (id, planet) => !!hired() && G.mode === 'landed' && planet.services.includes('shipyard') && buyShip(id) && buyShip(id).forSale
  && !(hired().debt > 0) && G.state.credits >= buyInPrice(id) && !(buyShip(id).req && repOf(localGov()) < buyShip(id).req);

function buyIn(id) {
  const st = G.state, h = hired(), planet = currentPlanet();
  if (!canBuyIn(id, planet)) return;
  const cap = st.people[h.captain], friends = buyInCompanions(), oldName = home().name, bought = buyShip(id);
  const price = buyInPrice(id);
  st.credits -= price;
  h.haggle = null;
  st.shipId = id === USED_ID ? 'lightfreighter' : id; st.fuel = ship().fuel; st.armor = ship().armor;
  st.cargo = {}; st.paid = {};  // what was in the hold was the captain's
  // The captain stays a contact, and a known captain on the lanes.
  Object.assign(cap, { ship: { name: oldName, shipId: 'freighter', kind: 'trader' }, haunt: st.systemId, location: planet.name });
  like(cap, 2, 'You worked my ship, and then bought your own. Fair winds.');
  for (const c of st.crew.map(person)) if (!friends.includes(c)) c.location = planet.name;  // the rest stay with her
  st.crew = friends.map(c => c.id);
  for (const f of friends) like(f, 2, `We left the ${oldName} together.`);
  // A fresh ship: nothing of the old one's wear, refits or jobs comes with you.
  for (const k of ['condition', 'refits', 'projects', 'power', 'heat', 'tuned', 'route']) delete st[k];
  if (id === USED_ID) st.condition = { ...USED_CONDITION };  // but the used Ore Runner comes as she is
  home().name = shipName(false);
  st.hired = null;
  G.offers = generateMissions(planet);
  return (`You bought the ${bought.name} for ${fmt(price)} cr and left the ${oldName}. Captain ${cap.first} ${cap.last} shakes your hand on the dock ` +
      `and says they will keep an eye out for you on the lanes.${friends.length ? ` ${namesOf(friends)} came with you.` : ' You are on your own.'} She ` +
      `is yours now: the exchange, the contracts and the yard are open to you, and the crew are your wages to pay.`);
}

// The close of the hired-hand chapter (scope 'earth-hired', js/build.js): one scene at the foot of the new ship's ramp. It is read before
// buyIn takes the captain and the crew apart, and it reads the record (#132): the first ending in CHAPTER_ENDINGS whose `when` holds
// gives the scene its title and its middle; if none does, it is the ordinary "Your Own Ship".
function chapterRecord(id) {
  const st = G.state, h = hired(), cap = st.people[h.captain], friends = buyInCompanions(), oldName = home().name, days = st.day - h.since;
  const kept = key => ((st.cast || {})[key] || {}), untouched = !(st.memorial || []).length && Object.keys(st.cast || {}).every(k => !(kept(k).marks || []).length && !(kept(k).flags || {}).benched);
  return {
    id, friends, oldName, days, cap, dead: (st.memorial || []).map(m => memorialName(m)), credits: st.credits,
    berths: buyShip(id).berths, left: st.credits - buyInPrice(id), untouched,  // no mark, no loss and no one benched on the way
    promised: friends.filter(c => c.cast && (kept(c.cast).flags || {}).promised).map(c => c.first),  // who coming with you was promised something
  };
}
// The endings the chapter can close on, in priority order: loss first, then the crew, then the quiet ones. Each has a `group`, a `title`,
// a `when(record)` and a `text(record)` for the middle of the scene; the foot of the ramp before it and the line after it are shared.
const CHAPTER_ENDINGS = [
  { id: 'memorial-wall', group: 'Loss', title: 'The Memorial Wall', when: r => r.dead.length >= 2,
    text: r => (`Beside the hatch you put up a strip of tape and write the names on it in marker, one under another: ${chapterList(r.dead)}. Nobody asked you ` +
      `to. ${r.friends.length ? `${namesOf(r.friends)} ${r.friends.length > 1 ? 'wait' : 'waits'} at the foot of the ramp until you have finished.` : 'Nobody is waiting at the foot of the ramp.'} ` +
      `You came aboard the ${r.oldName} ${r.days} days ago with ${fmt(HIRED_SAVINGS)} cr and a post to learn, and you leave a hand's width of tape clear under the last name.`) },
  { id: 'empty-berths', group: 'Loss', title: 'The Empty Berths', when: r => !r.friends.length,
    text: r => (`Nobody comes up the ramp behind you, and nobody is waiting at the foot of it. The ship has ${r.berths} berths, and each has its mattress folded to the wall. ` +
      `You walk the length of the passage once and close the hatch of each, and the sound goes on a little after you do. You came aboard the ${r.oldName} ${r.days} days ago ` +
      `with ${fmt(HIRED_SAVINGS)} cr and a post to learn.${memorialNote()}`) },
  { id: 'ten-years', group: 'Crew', title: 'Ten Years, One Ship', when: r => r.promised.length > 0,
    text: r => (`${namesOf(r.friends)} ${r.friends.length > 1 ? 'go' : 'goes'} up the ramp ahead of you with ${r.friends.length > 1 ? 'their bags' : 'a bag'}. ` +
      `${chapterList(r.promised)} ${r.promised.length > 1 ? 'stop' : 'stops'} at the hatch and ${r.promised.length > 1 ? 'wait' : 'waits'} for you, and neither of you mentions what you said aboard the ${r.oldName}. ` +
      `You count the berths. The first bag goes in the first, and the next in the second, and you leave the other hatches open.${memorialNote()}`) },
  { id: 'quiet-fortune', group: 'Quiet', title: 'The Quiet Fortune', when: r => r.untouched && r.left >= QUIET_FORTUNE,
    text: r => (`The yard clerk reads the balance twice: the ship paid for, and ${fmt(r.left)} cr still in the account. ` +
      `${r.friends.length ? `${namesOf(r.friends)} ${r.friends.length > 1 ? 'are' : 'is'} already aboard, stowing a bag. ` : ''}No one aboard carries a mark, and no name is on a wall. ` +
      `You came aboard the ${r.oldName} ${r.days} days ago with ${fmt(HIRED_SAVINGS)} cr and a post to learn, and you take the ramp at a walk, with nothing to carry but the ledger.`) },
];
const QUIET_FORTUNE = 10000;  // credits left after the ship is paid for, at which a clean chapter closes quietly rich (to be reviewed)
const chapterList = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);
function chapterEnd(id) {
  if (!scopeNarrow()) return null;
  const r = chapterRecord(id), e = CHAPTER_ENDINGS.find(x => x.when(r));
  const foot = `The ${buyShip(id).name} is on the apron at ${currentPlanet().name} with her ramp down and the hold empty. The papers have your name on them.`;
  const plain = (`You came aboard the ${r.oldName} ${r.days} days ago with ${fmt(HIRED_SAVINGS)} cr and a post to learn. ` +
    `${captainEntry() ? '' : `Captain ${r.cap.last} shook your hand at the foot of the ramp and went back up it. `}${r.friends.length ? `${namesOf(r.friends)} ${r.friends.length > 1 ? 'are' : 'is'} already aboard, stowing a bag.` : 'Nobody came with you.'}${memorialNote()}`);
  return {
    title: e ? e.title : 'Your Own Ship', personal: true,
    text: [foot, e ? e.text(r) : plain, 'The exchange, the yard and the contracts are yours now. This is where the hired-hand chapter ends.'].join(' '),
    choices: [{ label: 'Keep flying', run: () => 'You walk up the ramp and shut the hatch behind you.' }],
  };
}

// The chapter in the ledger, read before buyIn takes the captain and the crew apart: the work, who you got close to, what
// they told you, and the marks left on the way. A line appears only if there is something to say.
function chapterRecap() {
  const st = G.state, h = hired(), cap = st.people[h.captain], crew = st.crew.map(person).filter(c => c && c.memories);
  const list = names => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const t = runTotals(h), days = st.day - h.since;
  const work = `${days} days aboard ${esc(shipTitle())}. ${t.runs} run${t.runs === 1 ? '' : 's'} with Captain ${cap.last}, and ${fmt(t.earned)} cr earned in wage and share. You worked the ${POSTS[h.post].name.toLowerCase()} and reached level ${skillLevel(h.post)}.`;
  const why = { money: `You signed on for the money. You came with ${fmt(HIRED_SAVINGS)} cr and have ${fmt(st.credits)} cr now.`, learn: `You signed on to learn the work. The ${POSTS[h.post].name.toLowerCase()} post is at level ${skillLevel(h.post)}, ${t.runs} run${t.runs === 1 ? '' : 's'} in.`,
    away: `You signed on to be somewhere else. It is ${days} days and ${t.runs} run${t.runs === 1 ? '' : 's'} from the dock you left.` }[h.reason] || '';
  const near = [...(cap && cap.memories ? [{ c: cap, name: `Captain ${cap.last}` }] : []), ...crew.map(c => ({ c, name: c.first }))]
    .filter(x => x.c.opinion >= OPINION.FRIEND).sort((a, b) => b.c.opinion - a.c.opinion).slice(0, 3);
  const told = crew.filter(c => c.story && c.story.beat >= 3).map(c => c.first), trusted = Object.keys(CAST).filter(k => ((st.cast[k] || {}).flags ||
    {}).trusted).map(k => castPerson(k).first), favor = crew.filter(c => c.story && c.story.beat >= 4).map(c => c.first), loyal = crew.filter(c => c.loyal).map(c => c.first);
  const people = [near.length ? `Closest to you: ${near.map(x => `${x.name} (${opinionWord(x.c.opinion)})`).join(', ')}.` : 'Nobody aboard was a friend yet.',
    told.length ? `Told you what they want: ${list(told)}.` : '', favor.length ? `You took on a favor for ${list(favor)}.` : '', loyal.length ? `Loyal to the ship: ${list(loyal)}.` : '', trusted.length ? `Let you do their work: ${list(trusted)}.` : ''].filter(Boolean).join(' ');
  const lived = goodbyeFacts(h.flags || {}).map(f => f.recap).join(' ');  // what the hand went through (captains.js)
  const lost = (st.memorial || []).length ? `Lost on the way: ${list((st.memorial || []).map(m => memorialName(m)))}.` : '';
  const ties = webTies(folk()).slice(0, 2).map(x => `${x.a.p.first} and ${x.b.p.first}: ${bondWord(x.n)}.`).join(' ');
  const marks = [cap, ...crew].flatMap(c => (c ? marksOf(c) : [])).sort((a, b) => b.day - a.day).slice(0, 3).map(m => `${dateOf(m.day)}: ${m.text}`).join(' ');
  return {
    title: 'Looking Back', personal: true, text: [work, why, lived, people, lost, ties, marks].filter(Boolean).join('</p><p>'),
    choices: [{ label: 'Go on', run: () => 'You close the ledger.' }],
  };
}

function buyInHtml() {
  const h = hired(), p = currentPlanet(), friends = buyInCompanions(), cap = G.state.people[h.captain];
  if (!p.services.includes('shipyard')) return '<p class="hint">The yard deals with the captain, not with you. A ship of your own can be bought at a shipyard.</p>';
  const rows = [...(dealOpen() ? [[USED_ID, buyShip(USED_ID)]] : []), ...Object.entries(SHIPS).filter(([, s]) => s.forSale)].map(([id, s]) => {
    const locked = s.req && repOf(localGov()) < s.req;
    return (`<div class="row"><div><b>${s.name}</b> <span class="hint">${s.cargo}t, ${s.berths} berths, ${s.guns} ` +
        `gun${s.guns > 1 ? 's' : ''}. ${fmt(s.price)} ` +
        `cr${locked ? ', needs better standing here' : ''}${id === USED_ID ? `. Worn, with her fire control close to failing. Until about day ${h.deal.until}` : ''}</span></div>
     ` +
        ` ${h.confirm === id ? `<span><button data-action="buyInGo" data-arg="${id}" class="primary">Yes, buy and leave</button> <button data-action="buyInNo">Not yet</button></span>`
      : `<button data-action="buyInAsk" data-arg="${id}" ${canBuyIn(id, p) ? '' : 'disabled'}>Buy (${fmt(s.price)})</button>`}</div>`);
  }).join('');
  return (`<div class="post"><div class="eyebrow">A ship of your own &middot; your savings ${fmt(G.state.credits)} cr</div>
    ${h.debt > 0 ? `<p class="hint">You owe the hiring hall ${fmt(h.debt)} cr. You cannot buy a ship until it is paid.</p>` : ''}
    ${rows}
    <p ` +
      `class="hint">${h.confirm ? (`Leaving means leaving Captain ${esc(cap.first)} ${esc(cap.last)} and the crew ` +
        `behind${friends.length ? `, but ${esc(namesOf(friends))} would come with you` : ', and nobody on the crew knows you well enough to come'}.`) : (
        `Buy a ship and go out on your ` +
        `own. ${friends.length ? `${esc(namesOf(friends))} would come with you.` : 'Nobody on the crew knows you well enough to come with you yet.'}`)}</p></div>`);
}

// A run in the hand's terms: the days, the ship's profit, and what that is to you. The captain's run and each suggested run say it alike.
const runTerms = r => `${r.days} days, about ${fmt(r.profit)} cr profit, so about ${fmt(r.profit * G.state.hired.share)} cr to you, plus ${fmt(G.state.hired.wage * r.days)} cr wage`;

const runHtml = () => {
  const hd = G.state.hired, plan = currentPlan(), led = hd.ledger.slice(0, 5), name = id => COMMODITIES.find(c => c.id === id).name;
  return String(h`<div class="post"><div class="eyebrow">${hiredCaptain() ? h`<span class="nowrap">Captain ${raw(personLink(hiredCaptain()))}'s</span> run` : 'The captain\'s run'} &middot; ship's funds ${fmt(hd.fund)} cr &middot; your savings ${fmt(G.state.credits)} cr</div>
    <p class="desc">${plan && plan.yard && wantsYard() ? 'The captain knows you have the money for a ship, and is heading for a port with a yard. ' : ''}${!plan ? 'The captain is waiting for a market worth the fuel.'
      : plan.ballast ? h`The captain has no cargo worth carrying and will run light to ${plan.planet}, ${SYSTEMS[plan.sid].name}, to look for work.`
      : plan.loaded ? h`The captain will take the ${plan.tons}t of ${name(plan.good)} already aboard to ${plan.planet}, ${SYSTEMS[plan.sid].name}: ${plan.days} days.`
      : h`The captain will buy ${plan.tons}t of ${name(plan.good)} here for ${fmt(plan.cost)} cr and take it to ${plan.planet}, ${SYSTEMS[plan.sid].name}: ${runTerms(plan)}.`}</p>
    ${raw(swayHtml())}
    ${led.length ? h`<div class="eyebrow">Recent runs</div>${listHtml(led, l => h`<div class="hint">${dateOf(l.day)}: ${l.from} to ${l.to}${l.good ? `, ${l.tons}t ${name(l.good)}, profit ${fmt(l.profit)} cr` : ', light'}. You earned ${fmt(l.wage + l.share)} cr.</div>`)}` : ''}
  </div>`);
};

// The captain's own habits, now and then, among the crew's chatter. The captain is not crew, so the crew's lines never name them.
const CAPTAIN_CHATTER = [
  '{cap} is going over the run again, with a pencil, in the margin of a chart nobody else is allowed to touch.',
  '{cap} stops at the hatch of the {post}, looks in, and leaves without saying a word. It is somehow reassuring.',
  '{cap} is in the galley with the ledger open, lips moving over the sums.',
  '{cap}: "Fuel is money, and money is fuel. Remember that when somebody wants to go faster."',
  '{cap} is checking the manifest against the hold, line by line, for the second time.',
  '{cap}: "I was a hand once. I remember what it was like when the captain did not know my name."',
  '{cap} is asleep in the captain\'s chair with the log open on the captain\'s chest.',
  '{cap}: "We make port on the day, or I owe somebody an explanation. I hate owing explanations."',
];
function captainChatter() {
  const c = hiredCaptain(), name = `Captain ${c.last}`, d = captainEntry();
  if (d && d.chatter) return d.chatter.map(l => l.replace(/\{post\}/g, POSTS[hired().post].name.toLowerCase()));  // their own lines, and no trait chatter
  const lines = CAPTAIN_CHATTER.map(l => l.replace('{cap}', name).replace('{post}', POSTS[hired().post].name.toLowerCase()));
  for (const t of c.traits) lines.push(pick([].concat(TRAITS[t].chatter)).replace('{first}', name).replace('{home}', c.home));
  return lines;
}

Mods.register({
  id: 'hired', name: 'Hired hand', builtin: true,
  init(M) {
    M.filter('chatter', pool => (hired() && hiredCaptain() && Math.random() < 0.2 ? captainChatter() : pool));
    // The captain pays for fuel and repairs: a hired ship is topped up whenever she docks somewhere that sells them.
    M.on('landed', planet => {
      if (!hired() || !planet.services.includes('refuel')) return;
      G.state.fuel = ship().fuel;
      if (G.state.armor >= ship().armor * (1 - REPAIR_AT)) G.state.armor = ship().armor;  // a scrape is patched on the way in; real damage is the yard's (repairs.js)
    });
    M.on('landed', planet => {
      const text = hired() && settleRun(planet);
      if (text) M.note(text);
      if (hired() && arrivalPending(planet) && !G.dialog) { hired().arrived = true; openEvent(castScene(hiredXo().cast, arrivalScene())); }  // the first officer settles up (captains.js)
    });
    M.on('landed', planet => { hullNote(); dealCheck(planet); });
    M.on('landed', planet => { if (hired()) G.offers = errandsFor(planet); });  // the board has errands, not contracts
    M_NOTE = text => M.note(text);
    M.action('sail', () => { if (hired()) sail(); });
    M.action('swapPost', post => askSwap(post));
    M.action('buyInAsk', id => {
      if (!hired() || !canBuyIn(id, currentPlanet())) return;
      if (hired().haggle && hired().haggle.id === id) hired().confirm = id;  // already settled at the yard office
      else openEvent(yardScene(id));
    });
    M.action('buyInNo', () => { if (hired()) hired().confirm = hired().haggle = null; });
    M.action('buyInGo', id => {
      if (!hired() || hired().confirm !== id) return;
      const scene = castLateAtBuyIn(), goodbye = captainGoodbye(), closing = chapterEnd(id), recap = closing ? chapterRecap() : null, text = buyIn(id);  // all read from the crew and the captain before they leave
      if (text) M.note(text);
      if (!text || G.dialog) return;
      if (closing) G.state.flags.chapterOne = true;
      const scenes = [scene, goodbye, recap, closing].filter(Boolean);  // a main character's last scene, the goodbye, the look back, then the close
      if (scenes.length) openEvent(chainEvents(scenes));
    });
  },
});
