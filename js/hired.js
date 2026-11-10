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
const HIRED_SAVINGS = 3000;
// The rest of the crew, beside the four posts: the bosun (the xo slot) and a deckhand (the icehand key), as docs/bible/ship.md has it (#879). With the
// captain, the two officers (the main characters at pilot and engineer), the hand and the rating at the post the hand doesn't hold (comms, in the narrow
// build), that is seven: three officers, the bosun and three ratings. The bosun holds the first aid (crew.js roleHolder).
const CHAPTER_CREW = [{ role: 'xo', skill: 2 }, { role: 'icehand', skill: 1 }];
const HIRED_FUND = 120000;  // the ship's money: repairs and fuel, since the cargo is the shipper's (contracts.js)
// A rating's pay (#879, docs/bible/work.md): a day rate and no share, less the kit the captain rents to the ratings (KIT_DEDUCTION a day). The day rate is the hired
// captain's own (their entry's wage); HIRED_WAGE is a generated captain's. HIRED_SHARE stays, at 0, so a save that signed for a share is paid none.
const HIRED_WAGE = 550, HIRED_SHARE = 0, KIT_DEDUCTION = 30;
const HAND_RAID = { base: 0.08, per: 1.4 };  // a hand's chance of a pirate contact on a run: this and the lane's danger (engage.js), in place of 0.05 and 0.6
const HAND_LANE_WEIGHT = 8;  // and how much a dangerous lane weights the ship's own incidents (happenings.js)
const LIGHT_DUTY = 0.6;  // a hurt hand's wage while they work light duty
const DEBT_SHARE = 0.3;  // the hiring hall's bond for the berth, the passage and the kit (#280): 30 percent of each run's pay goes to it, never more than is owed
// The chapter's goal (#882, docs/bible/ceres-coop.md): a member's share in the Ceres Crew Co-operative's Ore Runner, the hull Tomas rebuilt three times. The
// share is 150,000 (a fifth of the hull, her refit and the loan's cost); a new member puts down a buy-in set by the members' vote, and owes the rest out of
// their earnings. The buy-ins keep the chapter's length at a rating's pay: a mean of 17.7 runs and 144 days over seeds 1 to 6 (node tools/soak.js --seeds
// 1,2,3,4,5,6 --legs 40 --captain hester).
const SHARE_PRICE = 150000, BUY_IN = { good: 51000, mid: 57000, bad: 63000 };  // the vote: a member speaks for you, a plain vote, nobody speaks for you
const HIRED_TARGET = BUY_IN.mid, COOP_PORT = 'Ceres Station';  // the co-op's office, where the share is signed
const isCoop = planet => !!planet && planet.name === COOP_PORT;
const HIRED_DEBT = 9000;  // the hall's bond: a rating's recruitment debt for the berth, the passage and the kit
const OLD_BOND_SCALE = 0.3;  // what a save from before (#879) owes the hall, scaled as the bond was then
// A save signed before (#879) holds a share, the old day rate and the old bond: its terms as a rating's, for migrate() (menu.js) to write. The captain's day
// rate (and the 25 more a hand who signed for the money asked, signon.js), no share, and what is left of the bond scaled by OLD_BOND_SCALE.
const ratingTerms = h => ({ share: 0, wage: ((CAPTAINS[h.captainKey] || {}).wage || HIRED_WAGE) + (h.reason === 'money' ? SIGN_WAGE_UP : 0), debt: Math.round((h.debt || 0) * OLD_BOND_SCALE / 1000) * 1000 });
// The captain heads for Ceres when the co-op's share can be had: at the offer's threshold until it is offered, then at the buy-in it
// was offered at (#882).
// Before the offer, only once it can come (#954): with the captain's scenes still to play, a yard has nothing for the hand.
const wantsYard = () => { const h = hired(); return h.deal ? G.state.credits >= h.deal.price : captainBeatsDone(h) && G.state.credits >= USED_OFFER_AT; };
const hired = () => (G.state && G.state.hired) || null;
// The hand's sheet, kit and standing, which outlive the buy (#685): the hand's own record while there is one, else the career it left (st.career, made at the buy by careerOf, sheet.js).
// The same field names as the hand's record, so a reader of a sheet, a kit or a shipper's regard asks this and not hired().
const career = () => hired() || (G.state && G.state.career) || null;
// A hired hand works one post. The others are the crew's, and the captain's to command.
const hiredCaptain = () => (hired() ? G.state.people[hired().captain] : null);
const notYours = post => !!hired() && hired().post !== post;

// ---------- skill at each post ----------
// Experience points per post, kept when you swap. Levels come at 12, 45, 110, 220 and 400 points: about 0.7 a day, so a chapter of a hundred
// days ends at the second level, and the third is for someone who works at it (or the chapters after). Each level offers a pick (picks.js).
const SKILL_STEPS = [0, 12, 45, 110, 220, 400];  // five levels (#963): the first three as they were, 220 a hand who works at it through chapter two, 400 the later chapters
// Runs with the captain and what they paid you, over the whole chapter. A save from before these were kept counts what its ledger holds.
const runTotals = h => ({
  runs: h.runsDone !== undefined ? h.runsDone : h.ledger.length,
  earned: h.earnedTotal !== undefined ? h.earnedTotal : h.ledger.reduce((t, l) => t + l.wage - (l.kit || 0) + l.share, 0),
});
const skillXp = post => (career() && career().skill && career().skill[post]) || 0;  // the player's own, which the buy keeps (career())
const skillLevel = post => Math.max(0, SKILL_STEPS.filter(n => skillXp(post) >= n).length - 1 - (handHurt() ? 1 : 0));  // a hurt hand works a level lower (boarders.js)
// The step a post's points have reached, from the stored points alone: an injury (skillLevel above) lowers the level worked, not this.
const skillStep = xp => SKILL_STEPS.filter(s => xp >= s).length - 1;
function gainSkill(post, n) {
  const c = career();
  if (!c) return;
  c.skill = c.skill || {};
  const before = skillStep(c.skill[post] || 0);
  c.skill[post] = (c.skill[post] || 0) + n;
  if (post === c.post && skillStep(c.skill[post]) > before) levelNote(post, skillStep(c.skill[post]));
}
// One plain line when the hand's own post reaches a new level, on the port screen when docked and in the flight log on a burn (as Mods' note).
function levelNote(post, level) {
  const name = POSTS[post].name, text = role().canTrade ? `Your work at the ${name.toLowerCase()} post is level ${level} now. When you take it yourself it works a tenth more often.`  // an owner's post: taken by hand at the station (stations.js)
    : `Your work at the ${name.toLowerCase()} post is level ${level} now. ${post === 'gunner' ? 'Your shots in a ship fight hit harder, and your' : 'Your'} two abilities in a deck fight work more often${level >= 2 ? `. The choices marked [${name} ${level}] are open to you` : ''}.${pickDue(career(), level) ? ' A pick waits on your page.' : ''}`;  // the ladder's pick (picks.js, #963)
  if (G.mode !== 'landed') return msg(text);
  UI.notes.push(text);
  if (!G.dialog) UI.render();
}
// What the record makes of the hand (traits.js): recordHand is the one line every site calls (an owner has no record), and traitNote says a trait's
// moment once, by the person who would notice (the trait's `by`: a post's holder aboard and unhurt, else the captain), as a message in a burn and a
// note at a port, as the level note is; the shipper's is a note in the inbox, and Jonah's is said by nobody.
const traitSay = (key, vars) => sceneSay('scene:traits', key, vars);
function recordHand(key, n = 1) { const h = hired(); if (!h) return; for (const id of recordAdd(h, key, n)) traitNote(id); }
function traitNote(id) {
  const h = hired(), t = HAND_TRAITS.find(x => x.id === id);
  if (!h || !t || (h.traitsTold || []).includes(id)) return;
  h.traitsTold = [...(h.traitsTold || []), id];
  if (!t.by) return;
  if (t.by === 'shipper') { noteInbox('station', traitSay('inbox.reliable'), null, 'market'); return; }
  const who = (t.by === 'captain' ? null : postHolder(t.by)) || person(h.captain), text = traitSay(`${id}.moment`, { first: who.first });
  if (G.mode !== 'landed') return msg(text);
  UI.notes.push(text);
  if (!G.dialog) UI.render();
}
// A stat of the hand's sheet (sheet.js): the base for an owner, and for a hand from before the sheet was kept.
const handStat = stat => { const c = career(); return c && c.sheet ? c.sheet[stat] : STAT_BASE; };
// Doing a job yourself: the odds are worse than a crew member's, and get better as you learn the post.
// A roll of the hand's: the sheet's rule (sheet.js) with the stat named, the level, the kind of roll (DIFFICULTY's keys) and an edge, and what the kit adds to that kind.
const handCheck = (stat, skill, kind, edge = 0) => check(handStat(stat), skill, DIFFICULTY[kind], edge + kitEdge(career() && career().kit, kind) + pickEdge(takenPicks(career()), kind));  // the kit's edge and the picks' (picks.js)
// Whether the hand has taken a perk pick (picks.js): the one reader every perk's hook calls; false with no hand.
const handPerk = id => { const c = career(); return !!c && !!PICKS[id] && PICKS[id].post === c.post && hasPerk(takenPicks(c), id); };  // a perk counts at the post of its pick: a burn you fly, your gunnery; a hand who swapped posts leaves it in the chair
// Who would show the hand a taught move pick (picks.js): the post's holder, or the first officer, with the injured left out (stations.js, crew.js).
const pickTeacher = p => (p.teacher.post ? postHolder(p.teacher.post) : roleHolder(p.teacher.role));
const soloOdds = post => handCheck(POST_STAT[post], skillLevel(post), 'solo');
// The job of your own post in a fight, an ice run or a contact: half a chance at the base, a tenth better for each level.
const postOdds = post => handCheck(POST_STAT[post], skillLevel(post), 'post');
// The Ice Hauler's magazine: the captain keeps it full from the ship's fund at a port with an outfitter. `launcher` is whether the ship has one (ship().launcher):
// a save from before the fitting has none, and buys nothing. Returns the line said, or ''.
const HAND_TORPS = 2;
function restockTorps(st, h, planet, launcher) {
  if (!launcher || !planet.services.includes('outfitter')) return '';
  const n = Math.min(HAND_TORPS - (st.torpedoes || 0), Math.floor(h.fund / TORP_PRICE));
  if (!(n > 0)) return '';
  const cost = n * TORP_PRICE;
  st.torpedoes = (st.torpedoes || 0) + n; h.fund -= cost; h.bill = (h.bill || 0) + cost;
  return sceneSay('scene:screens', 'torps.restock', { n, cost: fmt(cost) });
}
function setupHired(o) {
  const st = G.state, post = HIRED_POSTS.includes(o.post) ? o.post : scopeOff('posts') ? 'gunner' : 'pilot';
  st.shipId = 'freighter';
  st.outfits = { pdc: 1, launcher: 1 }; st.torpedoes = HAND_TORPS;  // a close-defense turret and a launcher with two torpedoes
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
    share: HIRED_SHARE,  // a rating's: none (#879)
    fund: HIRED_FUND,
    run: null,
    ledger: [],
    skill: {
    ...(o.skill || {}),
    [post]: Math.max((o.skill || {})[post] || 0, SKILL_STEPS[1])
  },
    sheet: newSheet(st.background, post),  // the hand's stats (sheet.js)
    standing: {},  // each shipper's regard for the ship, by name (shippers.js)
    record: {},  // the counts a trait is earned from (traits.js), and the traits whose moment has played
    traitsTold: [],
    kit: [],  // what the hand carries, by id (KIT_ITEMS, sheet.js)
    off: null,  // a delivery that was late, short or lost, for the agent at the dock to meet (shippers.js)
    asked: 0,
    raidTold: false,
    deckTold: false,  // the first deck fight's briefing is given (captains.js deckExplanation, #850)
    debt: o.debt !== undefined ? o.debt : HIRED_DEBT
  };  // o.debt: a hand put ashore carries what is left (stakes.js)
  // The port screen says only what Signing On (signon.js) does not: who put a hand ashore, or that the captain was lost. The ship, the captain, the post and
  // the savings are said there, once.
  if (o.captainLost) return [`${o.captainLost} didn't come back from the bridge. You carry your savings and what you learned.`];
  return o.putOffBy ? [`${o.putOffBy} put you ashore. You carry your savings and what you learned.`] : [];
}

// ---------- burn events ----------
// On the captain's ship the calls on the road are the captain's, and the money is the ship's.

// A hired hand's burn events spend and earn the ship's funds, not their savings. While they do, the savings are kept in `handPurse` (one at a time: a call
// inside another runs as it stands), for what the hand pays in person (handPays).
let handPurse = null;
function hiredFunds(fn) {
  if (!G.transit || role().paysFrom('burn') !== 'fund' || handPurse) return fn();
  const h = hired(), st = G.state;
  handPurse = { credits: st.credits };
  st.credits = h.fund;
  try { return fn(); } finally { h.fund = st.credits; st.credits = handPurse.credits; handPurse = null; }
}
// What the hand pays out of their own savings, up to what they have, even inside a burn event that spends the fund (a clinic, boarders.js hurtHand). Returns what was paid.
function handPays(n) {
  const p = handPurse || G.state, paid = Math.min(p.credits, n);
  p.credits -= paid;
  return paid;
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
// and nothing costly is chosen unless the ship can afford it. What a choice is comes from the tags on it (cost: it spends money, fight: it is a fight,
// self: it needs the hand in person), not from its words: an event sets them where it builds the choice, and the words are free to change.
function captainPick(choices) {
  const fund = hired().fund, d = captainEntry();
  const floor = 10000 * (d ? d.captain.thrift : 4), fight = d ? d.captain.nerve - 1 : 2;  // an older save's captain: 40,000 and a fight twice as likely
  const weights = choices.map((c, i) => (c.cost && fund < floor ? 0.2 : 1 + (i === choices.length - 1 ? 1 : 0) + (c.fight ? fight : 0)));
  let r = Math.random() * weights.reduce((a, b) => a + b, 0);
  for (let i = 0; i < choices.length; i++) if ((r -= weights[i]) < 0) return choices[i];
  return choices[choices.length - 1];
}

// Who decides an event: a ship-to-ship matter is the captain's; some are a post's (the engineer's coolant
// leak); the rest (the crew, your own affairs) are yours. Not yours: the first officer takes a post's call (the crew side), the captain takes the rest.
function hiredCall(ev) {
  const h = hired();
  if (!G.transit || ev.decided || !ev.choices || role().decides(ev, h && h.post)) return ev;
  const owner = ev.owner || (ev.via === 'ship' ? 'captain' : 'you');
  const cap = ev.via === 'ship' || owner === 'captain' ? hiredCaptain() : bossFor('crew');
  const usable = ev.choices.filter(c => hiredFunds(() => !c.can || c.can()) && (!c.role || roleSkill(c.role)) && !c.self);
  if (!usable.length) return ev;
  const c = captainPick(usable);
  const said = c.label.replace(/\s*<span class="hint">.*?<\/span>/g, '').replace(/\s*\[(?:\d+%(?:; if it fails:[^\]]*)?|if it fails:[^\]]*)\]/g, '').replace(/\s*\(.*?\)/g, '').replace(/\[\{crew\}\]\s*/, '').replace(/\{crew\}/g, 'the crew').replace(/\s+/g, ' ').trim();
  return { ...ev, decided: true, text: `${ev.text} ${bossName(cap)} takes the call: "${said}."`,
    choices: [{ label: 'See how it goes', run: () => { const r = c.run(); return c.role ? r.replace(/\{crew\}/g, roleName(c.role)) : r; } }] };
}

// ---------- downtime ----------
const practiceSay = (key, vars) => sceneSay('scene:screens', key, vars);  // the words are the lines of scene:screens (hiredscenes.js)
ACTIVITIES.practise = { hiredOnly: true, get label() { return practiceSay('practise.label'); }, can: () => !!hired(), run() { if (!hired()) return practiceSay('practise.none'); const n = 3; gainSkill(hired().post, n); return `${practiceSay(`practise.${hired().post}`)} ${practiceSay('practise.learn', { n, post: POSTS[hired().post].name.toLowerCase() })}`; } };

// ---------- the captain's runs ----------

// The captain's run: the ice run when it is due (icerun.js), else the contract on the board she picks (contracts.js), else a light run to the
// nearest port that trades, to look for work there. A contract's profit is its pay: nothing is bought, the cargo is the shipper's.
let planAlts = [], planRanked = [];  // the contracts that came next, for the hand to suggest (suggest.js), and the whole ranking, for the room's port (room.js)
// A contract on the board as a run, the shape the captain's pick takes and a suggested one must too: the shipper's cargo, no cost, the pay as the profit.
const asRun = c => ({ ...c, cost: 0, profit: c.pay, contract: true, ballast: false });
function planRun() {
  planAlts = []; planRanked = [];
  const st = G.state, here = currentPlanet(), free = cargoFree(), from = st.systemId;
  const reach = Object.entries(SYSTEMS).filter(([sid]) => sid !== from && inRange(from, sid));
  const wantYard = wantsYard();  // once your savings would take up the share, she heads for the co-op's office at Ceres when she can
  const ice = iceOption(from, free);
  if (ice) return ice;
  const { best, ranked } = pickContract(here.services.includes('trade') ? contractBoard(st, here) : [], { free, wantYard, risk: laneRisk, picks: captainEntry() ? TRADE_PICKS[captainEntry().captain.trade] : 1, goal: c => wantYard && c.planet === COOP_PORT });
  planAlts = ranked.slice(0, 4).map(asRun); planRanked = ranked;
  const take = wantYard ? ranked.find(c => c.planet === COOP_PORT) || null : best;  // with your money in hand, a contract to Ceres if the board has one, else light toward Ceres (below)
  if (take) return asRun(take);
  // Nothing on the board (or nothing to Ceres when she wants it): run light to the nearest port that trades, Ceres first when she wants it, and look for work there.
  const dest = reach.flatMap(([sid, sys]) => sys.planets.filter(x => x.services.includes('trade')).map(pl => ({ sid, planet: pl.name, yard: isCoop(pl), days: Math.max(1, travelDays(from, sid)) })))
    .sort((a, b) => (wantYard ? (b.yard - a.yard) : 0) || a.days - b.days)[0];
  return dest ? { ...dest, good: null, tons: 0, cost: 0, profit: 0, ballast: true } : null;
}

// The plan is made once a day in port and kept, unless the hold has changed since (a plan to sell cargo that is gone). A run the captain
// agreed to (a pitched job, awayjobs.js) stands through the remaking; any other change of run is said, so the stated run is the one she flies (#848).
const planStale = h => !h.plan || h.plan.day !== G.state.day || h.plan.at !== G.state.planet
  || h.plan.cargo !== JSON.stringify(G.state.cargo) || !!(h.plan.run && h.plan.run.ice && !h.plan.run.site);  // an ice plan from before the rock was a place (#948)
const sameRun = (a, b) => !!a && !!b && a.sid === b.sid && a.planet === b.planet && a.good === b.good && !!a.ice === !!b.ice && a.site === b.site;
const runWord = r => (r.ice ? (r.site ? `the ice run to ${placeOf(r.site).name} and home to ${r.planet}` : `the ice run to ${r.planet}`) : r.ballast ? `a light run to ${r.planet}` : `${r.tons}t of ${goodName(r.good).toLowerCase()} to ${r.planet}`);
const currentPlan = () => { const h = G.state.hired; if (atSite(G.state)) return homeRun(h); if (planStale(h)) { const was = h.plan && h.plan.at === G.state.planet ? h.plan.run : null, run = planRun(); h.plan = {
  day: G.state.day,
  at: G.state.planet,
  cargo: JSON.stringify(G.state.cargo),
  run,
  alts: [...roomAlts(run), ...planAlts.filter(o => !run || o.sid !== run.sid || o.planet !== run.planet || o.good !== run.good)].slice(0, 3)  // the room's port first (room.js)
};
  const booked = (h.away || []).find(a => a.booked && (a.sid !== G.state.systemId || a.planet !== G.state.planet));
  if (booked) bookRun(booked, h.plan);
  else if (was && !sameRun(was, h.plan.run)) UI.notes.push(`Captain ${hiredCaptain().last} drops ${runWord(was)}${h.plan.run ? ` for ${runWord(h.plan.run)}` : ', and waits for a shipper'}.`);
} return h.plan.run; };

// Buys the cargo, sets the course, and sails: a crewed pilot flies her out, otherwise the pilot is you.
function sail() {
  const st = G.state, h = st.hired, plan = currentPlan(), here = currentPlanet();
  if (!plan || G.mode !== 'landed' || G.dialog || stayOf(h)) return false;  // a stay in port passes as nights first (stay.js)
  if (atSite(st)) return sailHome();  // from the rock, straight into the burn home (icerun.js)
  const cost = 0;
  if (plan.contract) st.cargo[plan.good] = (st.cargo[plan.good] || 0) + plan.tons;  // the shipper's cargo, loaded at no cost (contracts.js)
  h.run = { ...plan, cost, day: st.day, from: st.planet };
  if (plan.ice) { h.run.ice = { edge: 0 }; h.iceAt = st.day; h.iceRuns = (h.iceRuns || 0) + 1; }  // the ice is cut on the way, not bought
  h.plan = null;
  st.dest = plan.ice && plan.site ? plan.site : plan.sid;  // an ice run's first leg is to the rock (icerun.js); the burn home is sailHome's
  st.route = plan.ice && plan.site ? null : { dock: plan.planet, go: true };
  // A crewed pilot flies her out and in; if you are the pilot, you do.
  if (pilotFlier(st)) ORDERS.pilot.find(o => o.id === 'depart').run(); else { takeOff(); const told = nobodyFlies(st); if (told) msg(told); }  // the pilot, or a stand-in with the pilot hurt (#953)
  return true;
}

// On arrival: sell the cargo, and pay the wage and the share.
function settleRun(planet) {
  const st = G.state, h = st.hired, run = h.run;
  if (!run || planet.name !== run.planet || st.systemId !== run.sid) return;
  if (run.ice) iceFinish();  // a burn that skipped the scenes comes home thin
  let revenue = 0, sold = 0, paper = 0, cut = 0;  // paper: the pay the contract gave; cut: what the shipper held back
  if (run.contract) {  // the shipper pays on delivery for what arrives, docked for lateness; a load lost on the way is pay lost (contracts.js)
    const have = Math.min(run.tons, st.cargo[run.good] || 0);
    sold = have; revenue = latePay(Math.round(run.pay * have / run.tons), run.due, st.day);
    paper = revenue; cut = skimOf(run, revenue, standingOf(h, run.shipper)); revenue -= cut;  // a shipper that skims pays less than the paper (contracts.js)
    if (have < run.tons) captainFlag(have ? 'contractShort' : 'contractLost');
    if (st.day > run.due) captainFlag('late');
    recordHand(st.day > run.due ? 'late' : 'onTime');  // the record (traits.js)
    shipperSettled(run, have, st.day, cut, paper);  // the shipper's regard, and a word with the agent if it was off (shippers.js)
    if (st.cargo[run.good] > have) st.cargo[run.good] -= have; else { delete st.cargo[run.good]; delete st.paid[run.good]; }
    h.fund += revenue;
  } else if (run.good && st.cargo[run.good] && price(planet, run.good) !== null) {
    sold = st.cargo[run.good];
    revenue = Math.round(tradeTotal(planet, run.good, sold, -1) * (run.ice ? ICE_PREMIUM : 1));  // an ice run is sold on a contract (icerun.js)
    recordTrade(planet, run.good, sold, -1);
    delete st.cargo[run.good]; delete st.paid[run.good];
    h.fund += revenue;
  }
  const profit = revenue - run.cost, days = Math.max(1, st.day - run.day);
  const wage = Math.round(h.wage * days * (run.ice ? ICE_HAZARD : 1) * (handHurt() ? LIGHT_DUTY : 1)), owed = Math.min(h.bill || 0, Math.max(0, profit)), share = profit > 0 ? Math.round((profit - owed) * HIRED_SHARE) : 0;  // the yard bill (repairs.js) comes out of the profit first; a rating has no share (#879), whatever an old save signed for
  h.bill = Math.max(0, (h.bill || 0) - owed);  // (the long run pays double the wage, above)
  const kit = Math.min(wage, KIT_DEDUCTION * days);  // the suit and kit the captain rents to the ratings, out of the wage (docs/bible/ship.md)
  const toHall = Math.min(h.debt || 0, Math.round((wage - kit + share) * DEBT_SHARE));  // the hall's cut of the pay, never more than is owed
  if (toHall) { h.debt -= toHall; if (!h.debt) captainFlag('debtCleared'); }
  st.credits += wage - kit + share - toHall;
  const total = runTotals(h);
  h.runsDone = total.runs + 1; h.earnedTotal = total.earned + wage - kit + share;  // the ledger keeps the last 20; these keep the whole chapter
  h.ledger.unshift({ day: st.day, from: run.from, to: planet.name, good: run.good, tons: sold, cost: run.cost, revenue, profit, wage, kit, share, hall: toHall, days, ice: !!run.ice, shipper: run.shipper, late: run.contract ? Math.max(0, st.day - run.due) : 0, short: !!run.contract && sold < run.tons, skim: cut });
  h.ledger.length = Math.min(h.ledger.length, 20);
  // The first officer settles up on the first arrival (captains.js): keep the figures, and leave the one-line note for later arrivals.
  const settling = total.runs === 0 && arrivalWanted();
  if (settling) h.first = { good: run.good ? goodName(run.good).toLowerCase() : null, tons: sold, cost: run.cost, revenue, profit, forecast: run.profit, wage, kit, share, hall: toHall, owed: h.debt || 0, days, planet: planet.name };
  h.run = null;
  h.plan = null;
  gainSkill(h.post, 2);  // a burn worked
  like(st.people[h.captain], profit > 0 ? 1 : -1, sceneSay('scene:screens', profit > 0 ? 'run.good.memory' : 'run.bad.memory'));
  const name = run.good ? goodName(run.good) : null;
  if (settling) return;
  // The figures are the captain's log's (readouts.js); the note says what was off, then the pay.
  const off = [];
  if (run.contract && sold < run.tons) off.push(sold ? `Short: ${run.tons - sold}t of the ${name.toLowerCase()} did not arrive, and ${run.shipper} paid for what did.` : `The load for ${run.shipper} was lost on the way, and there is no pay.`);
  if (run.contract && st.day > run.due) off.push(`${st.day - run.due} day${st.day - run.due === 1 ? '' : 's'} late, and the pay docked.`);
  if (profit < 0) off.push(`The run lost ${fmt(-profit)} cr.`);
  return (`${off.length ? `${off.join(' ')} ` : ''}Your ` +
      `pay: ${fmt(wage)} cr ` +
      `wage${kit ? `, less ${fmt(kit)} cr for your kit` : ''}${share ? ` and ${fmt(share)} cr share` : ''}.${owed ? ` The yard bill took ${fmt(owed)} cr of the profit first.` : ''}${toHall ? ` The hall took ${fmt(toHall)} cr of your pay. ${h.debt ? `${fmt(h.debt)} cr still owed.` : 'The bond is paid.'}` : ''}`);
}

// ---------- errands ----------
// Small jobs for the port she is sailing to: a parcel that takes no cargo space, paid less than
// a contract, and the captain keeps a fifth. They are delivered when she docks there.
const ERRAND_CUT = 0.2;
const ERRANDS = [
  ['a sealed parcel', 'A courier bag with a wax seal, and a receipt to bring back signed. It weighs about as much as a lunch.'],
  ['a message on a chip', 'A hand-written note on a data chip: somebody doesn\'t trust the public bands with it.'],
  ['a set of spare keys', 'A ring of keys for a flat somebody hasn\'t seen in years. They want them back before the lease runs out.'],
  ['a box of medicine', 'An insulated box with a cold-chain tag. The label says to keep it upright and out of the sun.'],
  ['a crate of seedlings', 'A tray of green shoots under a grow light that has to stay on. You carry it in your bunk.'],
];

function errandsFor(planet) {
  const st = G.state, plan = currentPlan();
  if (scopeOff('errands') || !planet.services.includes('missions') || !plan) return [];
  const dest = SYSTEMS[plan.sid].planets.find(p => p.name === plan.planet);
  return Array.from({ length: randInt(1, 3) }, () => {
    const [what, blurb] = pick(linedText('lines:errands', ERRANDS)), gross = randInt(2, 6) * 100 * Math.max(1, plan.days), cut = Math.round(gross * ERRAND_CUT);
    return {
      type: 'errand', what, title: jobSay('errand', { what, dest: dest.name }), blurb: `${blurb} ${jobSay('errand.cut', { cut: fmt(cut) })}`,
      destSystem: plan.sid, destPlanet: dest.name, pay: gross - cut, cut, deadline: st.day + plan.days * 2 + randInt(6, 12),
    };
  });
}

// ---------- swapping posts ----------

// How likely the captain is to say yes: a word with them, on how far they trust you and what you know of the post.
function swapOdds(post) {
  const boss = bossFor('swap');
  return handCheck('wit', skillLevel(post), 'word', 0.1 * boss.opinion);
}

function askSwap(post) {
  const st = G.state, h = hired();
  if (!h || !POSTS[post] || post === h.post || G.mode !== 'landed' || h.asked === st.day) return;
  h.asked = st.day;
  const cap = bossFor('swap'), role = POSTS[post].role, mine = POSTS[h.post].role;
  const holder = roleHolder(role) || st.crew.map(person).find(c => c.role === role);
  const who = cap.first;
  if (Math.random() >= swapOdds(post)) {
    like(cap, 0, sceneSay('scene:screens', 'swap.refused.memory', { post: POSTS[post].name.toLowerCase() }));
    return M_NOTE(sceneSay('scene:screens', 'swap.refused', { who, mine: POSTS[h.post].name.toLowerCase() }));
  }
  if (holder) { holder.role = mine; holder.skill = Math.max(1, holder.skill - 1); holder.job = ROLE_NAMES[mine].toLowerCase(); }  // they take the post you leave
  h.post = post;
  M_NOTE(sceneSay('scene:screens', 'swap.yes', { who, post: POSTS[post].name.toLowerCase(), holder: holder ? ` ${sceneSay('scene:screens', 'swap.holder', { first: holder.first, mine: POSTS[Object.keys(POSTS).find(k => POSTS[k].role === mine)].name.toLowerCase() })}` : '' }));
}
let M_NOTE = () => {};

// Your own post first (#854), then the others you could ask for.
function swapHtml() {
  const hd = hired(), cap = bossFor('swap'), asked = hd.asked === G.state.day, posts = [hd.post, ...HIRED_POSTS.filter(p => p !== hd.post)];
  return String(h`<div class="post"><div class="eyebrow">Your posts &middot; ${bossName(cap)} decides</div>
    ${listHtml(posts, p => h`<div class="row"><span><b>${POSTS[p].name}</b>${p === hd.post ? h` <span class="tag good">yours</span>` : ''} <span class="hint">level ${skillLevel(p)} (${skillXp(p)} points)</span></span>
      ${p === hd.post ? '' : h`<button data-action="swapPost" data-arg="${p}" ${asked ? 'disabled' : ''}>Ask to move (${Math.round(swapOdds(p) * 100)}%)</button>`}</div>`)}
    <p class="hint">Your work at a post teaches you, and what you learn stays with you. They decide, by how far they trust you and what you know. ${asked ? 'You have asked already; ask again after the next run.' : ''}</p>
  </div>`);
}

const crewView = UI.views.crew;
UI.views.crew = function () { return (hired() ? swapHtml() : '') + crewView.call(this); };

// ---------- buying in ----------

// The crew member you are closest to, if you are close to anyone at all.
function buyInFriend() {
  const crew = G.state.crew.map(person).filter(c => c.opinion >= OPINION.CLOSE);
  return crew.sort((a, b) => b.opinion - a.opinion || b.skill - a.skill)[0] || null;
}
// Who leaves with you. For the co-op's share (at its office, with the berths open), Cato, whenever he is aboard: he has saved for this co-op for years,
// and signs on whatever he thinks of you (#882). Then the other main characters who like you, both if both think well of you, otherwise the one who
// likes you most; and if none do, the crew member you are closest to.
const forShare = () => dealOpen() && isCoop(currentPlanet());
function buyInCompanions(share = forShare()) {
  const crew = G.state.crew.map(person), cato = share ? crew.filter(c => c && c.cast === 'cato' && !c.dead) : [];
  const cast = crew.filter(c => c.cast && c.cast !== 'cato' && c.opinion >= OPINION.CLOSE).sort((a, b) => b.opinion - a.opinion);
  if (cast.length) return [...cato, ...(cast.length > 1 && cast[1].opinion >= CAST_GOOD ? cast.slice(0, 2) : cast.slice(0, 1))];
  const friend = crew.filter(c => c.cast !== 'cato' && c.opinion >= OPINION.CLOSE).sort((a, b) => b.opinion - a.opinion || b.skill - a.skill)[0];
  return [...cato, ...(friend ? [friend] : [])];
}
const namesOf = list => list.map(c => `${c.first} ${c.last}`).join(' and ');

// ---------- the used Ore Runner ----------
// The hull Tomas rebuilt three times. Once your savings reach USED_OFFER_AT (55% of her middle price), at a port with a yard,
// she is offered once (by Tomas, or by the co-op's notice if he is not aboard), and the co-op holds the berth until you sign (#882), at a price that follows how Tomas
// thinks of you. signOn signs for the share at Ceres (#882).
const USED_ID = 'used';
const USED_OFFER_AT = Math.round(0.55 * BUY_IN.mid);
const USED_CONDITION = { drive: 70, life: 65, shields: 60, sensors: 70, fire: 45 };
const buyShip = id => (id === USED_ID ? { ...SHIPS.lightfreighter, name: 'Ore Runner (used)', price: hired() && hired().deal ? hired().deal.price : BUY_IN.mid, forSale: dealOpen() } : SHIPS[id]);
const dealOpen = () => !!hired() && !!hired().deal;  // the berth is held until you sign (the owner, 2026-11-03, #882)
const tomasAboard = () => castAboard().find(c => c.cast === 'tomas') || null;

function dealScene(planet) {
  const st = G.state, h = hired(), tomas = tomasAboard();
  const price = tomas ? (tomas.opinion >= OPINION.FRIEND ? BUY_IN.good : tomas.opinion < 0 ? BUY_IN.bad : BUY_IN.mid) : BUY_IN.bad;
  h.deal = { price, day: st.day, broker: !tomas };
  const say = (key, vars) => sceneSay('scene:used-ship-offer', key, { price: fmt(price), share: fmt(SHARE_PRICE), owed: fmt(SHARE_PRICE - price), ...vars });
  const tellKey = price < BUY_IN.mid ? 'good' : price > BUY_IN.mid && tomas ? 'bad' : 'plain';  // how the price is put: a favor, a price he will not call one, or only the figure
  if (tomas) captainFlag('tomasWaited');  // the last piece of the spine (#294)
  return tomas ? {
    title: say('tomas.title'), personal: true,
    text: say('tomas.text', { fault: say('tomas.fault'), debt: h.debt > 0 ? say('tomas.debt.owed', { debt: fmt(h.debt) }) : say('tomas.debt.clear'), tell: say(`tomas.tell.${tellKey}`) }),
    choices: [{ label: say('tomas.c0.label'), run() { like(tomas, 1, say('tomas.c0.memory')); return say('tomas.c0.result'); } }],
  } : {
    title: say('broker.title'), personal: true,
    text: say('broker.text'),
    choices: [{ label: say('broker.c0.label'), run: () => say('broker.c0.result') }],
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
// Offered once, at a yard, when the savings are about 55% of her middle price and the captain's two scenes have played (captains.js).
function dealCheck(planet) {
  const st = G.state, h = hired();
  if (!h) return;
  if (h.deal || !planet.services.includes('shipyard') || st.credits < USED_OFFER_AT || !captainBeatsDone(h) || G.dialog) return;
  openEvent(dealScene(planet));
}
const buyInPrice = id => buyShip(id).price - (hired() && hired().haggle && hired().haggle.id === id ? hired().haggle.off : 0);  // nothing to trade in: the ship you fly is the captain's
const canBuyIn = (id, planet) => !!hired() && G.mode === 'landed' && planet.services.includes('shipyard') && (id !== USED_ID || isCoop(planet)) && buyShip(id) && buyShip(id).forSale
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
  like(cap, 2, sceneSay('scene:screens', 'buyin.captain.memory'));
  for (const c of st.crew.map(person)) if (!friends.includes(c)) c.location = planet.name;  // the rest stay with her
  st.crew = friends.map(c => c.id);
  for (const f of friends) like(f, 2, sceneSay('scene:screens', 'buyin.friend.memory', { ship: oldName }));
  // A fresh ship: nothing of the old one's wear, refits or jobs comes with you.
  for (const k of ['condition', 'refits', 'projects', 'power', 'heat', 'tuned', 'route']) delete st[k];
  st.outfits = {}; st.torpedoes = 0;  // the turret and the launcher stay on the captain's Ice Hauler
  if (id === USED_ID) st.condition = { ...USED_CONDITION };  // but the used Ore Runner comes as she is
  home().name = shipName(false);
  st.career = { ...careerOf(h), came: friends.map(c => c.id), bought: st.day };  // the sheet, the kit and the shippers' regard go on into the next chapter, with who came along and the day (chaptertwo.js)
  st.hired = null;
  G.offers = generateMissions(planet);
  return sceneSay('scene:screens', 'buyin.result', { ship: bought.name, price: fmt(price), old: oldName, first: cap.first, last: cap.last, company: ` ${friends.length ? sceneSay('scene:screens', 'buyin.with', { names: namesOf(friends) }) : sceneSay('scene:screens', 'buyin.alone')}` });
}

// Signing on for the share (#882): the buy-in comes out of your savings, and you leave the captain's ship with those who sign on with you. The captain
// keeps her ship, her fund and the rest of her crew; you own no ship. The career keeps the share, who came and the day, and the chapter is finished.
function signOn(id) {
  const st = G.state, h = hired(), planet = currentPlanet();
  if (id !== USED_ID || !canBuyIn(id, planet)) return;
  const cap = st.people[h.captain], friends = buyInCompanions(), price = buyInPrice(id), oldName = home().name, say = (key, vars) => sceneSay('scene:screens', key, vars);
  st.credits -= price;
  h.haggle = null;
  Object.assign(cap, { ship: { name: oldName, shipId: st.shipId, kind: 'trader' }, haunt: st.systemId, location: planet.name });
  like(cap, 2, say('coop.captain.memory'));
  for (const c of st.crew.map(person)) if (!friends.includes(c)) c.location = planet.name;  // the rest stay with her
  st.crew = friends.map(c => c.id);
  for (const f of friends) like(f, 2, say('coop.friend.memory', { ship: oldName }));
  // The record carries on into chapter two (#891): the hand is a member now, with the share, who came and the day. The captain on it stays Hester
  // until the player goes on and picks the master (goOn, pickMaster): the end of chapter one is still read with her name.
  Object.assign(h, { chapter: 2, share: { coop: COOP_PORT, buyIn: price, owed: SHARE_PRICE - price }, came: friends.map(c => c.id), signed: st.day, run: null, deal: null, confirm: null });
  st.tutorial = null;  // the hand's first run is long done
  return say('coop.result', { price: fmt(price), old: oldName, first: cap.first, last: cap.last, owed: fmt(SHARE_PRICE - price),
    company: ` ${friends.length ? sceneSay('scene:screens', 'buyin.with', { names: namesOf(friends) }) : sceneSay('scene:screens', 'buyin.alone')}` });
}

// The end of chapter one (#882): after the close. Its one choice goes on into chapter two (#891); a save between the two reopens on it.
const overSay = key => sceneSay('scene:chapter-over', key);
function chapterOverScene() { return { title: overSay('title'), personal: true, text: overSay('text'), choices: [{ label: overSay('label'), run() { G.nextEvent = goOn(G.state); return null; } }] }; }
// A save at the end of chapter one: one from before chapter two (the record cleared, the career finished), or a member's record with no master picked yet.
const masterPicked = h => !!(h && MASTER_CAPTAINS[h.captainKey]);
const finishedSave = () => { const st = G.state || {}; return (!st.hired && !!(st.career || {}).finished) || (chapterOf(st) === 2 && !masterPicked(st.hired)); };

// ---------- chapter two's start (#891, docs/superpowers/specs/2026-11-07-chapter-two-start-design.md) ----------

// Going on: a save from before chapter two has its record rebuilt from the career; then the lender sends three masters, and the start scene opens.
function goOn(st) {
  if (!st.hired && st.career) {
    const c = st.career;
    st.hired = { ...c, chapter: 2, share: c.share, came: c.came || [], signed: c.signed === undefined ? st.day : c.signed, fund: 0, debt: 0, flags: {}, wage: 0, ledger: [], run: null, off: null, asked: 0, raidTold: true, deckTold: true, fights: { done: FIGHT_LADDER.filter(x => !x.parked).map(x => x.id) } };  // the fields a hand's record has (setupHired); the briefings were given and the ladder's fights fought in chapter one
    delete c.finished;
  }
  const h = st.hired;
  if (!h.masters) h.masters = masterDraw(coopRand(st));
  return chapterTwoStartScene();
}

// The co-op's hull: the used Ore Runner as she is, tanks and armor full, nothing fitted, an empty hold. Her name waits for the members' first meeting.
function chapterTwoShip(st) {
  st.shipId = 'lightfreighter'; st.fuel = SHIPS.lightfreighter.fuel; st.armor = SHIPS.lightfreighter.armor;
  st.condition = { ...USED_CONDITION }; st.outfits = {}; st.torpedoes = 0; st.cargo = {}; st.paid = {};
  for (const k of ['refits', 'projects', 'power', 'heat', 'tuned', 'route']) delete st[k];
  home().name = 'Ore Runner';
}

// Who is aboard: who came, with their posts; Bexa on the deck and Pax at the gun beside the hand. A berth left by someone who did not come stays
// empty until the members vote on who joins. The master is not crew, as a captain is not. Returns the crew's ids.
function chapterTwoCrew(st, h) {
  const ids = (h.came || []).filter(id => st.people[id] && !st.people[id].dead);
  for (const [key, role] of [['bexa', 'icehand'], ['pax', 'gunner']]) {
    const p = castPerson(key);
    Object.assign(p, { role, skill: role === 'icehand' ? 1 : (p.skills.gunner || 1), location: null });
    if (!ids.includes(p.id)) ids.push(p.id);
  }
  return ids;
}

// The start: the members at the ramp, the lender's letter, a choice for each master. The pick puts the master on the bridge and the co-op at Ceres.
const twoSay = (key, vars) => sceneSay('scene:chapter-two-start', key, vars);
function chapterTwoStartScene() {
  const h = G.state.hired, came = (h.came || []).map(id => G.state.people[id]).filter(p => p && !p.dead), names = came.map(p => p.first);
  const members = names.length ? twoSay('members', { names: namesOf(came) }) : twoSay('members.alone');
  const intros = h.masters.map(k => MASTER_CAPTAINS[k].intro()).join('</p><p>');
  return {
    title: twoSay('title'), personal: true,
    text: [twoSay('ramp'), members, twoSay('letter'), intros].join('</p><p>'),
    choices: h.masters.map(k => ({ label: `${MASTER_CAPTAINS[k].first} ${MASTER_CAPTAINS[k].last}`, run() { return pickMaster(G.state, k); } })),
  };
}
function pickMaster(st, key) {
  const h = st.hired, cap = captainPerson(key);
  cap.role = 'captain'; cap.job = 'master';
  Object.assign(h, { captainKey: key, captain: cap.id });
  chapterTwoShip(st);
  st.crew = chapterTwoCrew(st, h);
  st.systemId = 'ceres'; st.planet = COOP_PORT; G.mode = 'landed';
  const port = currentPlanet();
  G.offers = [];  // the hand's errands are chapter one's; the co-op's work comes with its first landing, as the owner's does (game.js), with no draw here
  if (port.services.includes('trade')) seenPrices(st, port, st.day, price);
  save();  // the start is kept: a reload before the first landing reopens in chapter two
  const ines = st.crew.map(id => st.people[id]).find(p => p && p.cast === 'ines');
  return [twoSay('picked', { first: cap.first, last: cap.last }), ines ? twoSay('ines') : twoSay('noines')].join(' ');
}

// The close of the hired-hand chapter (scope 'earth-hired', js/build.js): one scene at the foot of the new ship's ramp, read before buyIn takes the
// captain and the crew apart. It closes the chapter, not the game: the game's own endings (docs/endings-parked.md, #132) wait for the end of the last
// chapter, and the losses and who came are told here in a line and in the recap that follows (chapterRecap).
const endSay = (key, vars) => sceneSay('scene:chapter-end', key, vars);  // the words of the closing scene are the lines of scene:chapter-end (hiredscenes.js)
const endMany = (list, key, vars) => endSay(`${key}.${list.length > 1 ? 'many' : 'one'}`, vars);  // a line for one and a line for more, for the verb that follows
function chapterEnd(id) {
  if (!scopeNarrow()) return null;
  const st = G.state, h = hired(), cap = st.people[h.captain], friends = buyInCompanions();
  if (id === USED_ID) return shareEnd(st, h, cap, friends);
  const foot = endSay('foot', { ship: buyShip(id).name, planet: currentPlanet().name });
  const plain = endSay('plain', { old: home().name, days: st.day - h.since, savings: fmt(HIRED_SAVINGS), memorial: memorialNote(),
    captain: captainEntry() ? '' : `${endSay('plain.captain', { last: cap.last })} `, company: friends.length ? endMany(friends, 'plain.aboard', { names: namesOf(friends) }) : endSay('plain.alone') });
  return {
    title: endSay('plain.title'), personal: true,
    text: [foot, plain, endSay('close')].join(' '),
    choices: [{ label: endSay('keep.label'), run: () => endSay('keep.result') }],
  };
}

// The close for the share (#882): at the foot of the co-op's Ore Runner at Ceres, Cato first by how he thinks of you, the others, what is still owed.
function shareEnd(st, h, cap, friends) {
  const price = h.deal ? h.deal.price : BUY_IN.mid, cato = friends.find(c => c.cast === 'cato'), others = friends.filter(c => c !== cato);  // no offer open: the editor's preview, at the middle buy-in
  const company = [cato ? endSay(cato.opinion >= OPINION.CLOSE ? 'share.cato.warm' : 'share.cato.cool', { first: cato.first }) : '',
    others.length ? endMany(others, 'share.aboard', { names: namesOf(others) }) : '', friends.length ? '' : endSay('share.alone')].filter(Boolean).join(' ');
  return {
    title: endSay('share.title'), personal: true,
    text: [endSay('share.foot', { planet: COOP_PORT }), endSay('share.plain', { old: home().name, days: st.day - h.since, savings: fmt(HIRED_SAVINGS), memorial: memorialNote(),
      captain: captainEntry() ? '' : `${endSay('plain.captain', { last: cap.last })} `, company }), endSay('share.owed', { price: fmt(price), owed: fmt(SHARE_PRICE - price) }), endSay('share.close')].join(' '),
    choices: [{ label: endSay('share.label'), run: () => endSay('share.result') }],
  };
}

// The chapter in the ledger, read before buyIn takes the captain and the crew apart: the work, who you got close to, what
// they told you, and the marks left on the way. A line appears only if there is something to say.
const lookSay = (key, vars) => sceneSay('scene:chapter-recap', key, vars);  // the words of the look back are the lines of scene:chapter-recap (hiredscenes.js)
function chapterRecap() {
  const st = G.state, h = hired(), cap = st.people[h.captain], crew = st.crew.map(person).filter(c => c && c.memories);
  const list = names => names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  const t = runTotals(h), days = st.day - h.since;
  const runs = lookSay(t.runs === 1 ? 'runs.one' : 'runs.many', { n: t.runs }), post = POSTS[h.post].name.toLowerCase(), level = skillLevel(h.post);
  const work = lookSay('work', { days, ship: esc(shipTitle()), runs, captain: cap.last, earned: fmt(t.earned), post, level }), sheet = h.sheet ? [lookSay('sheet', h.sheet), ...((h.kit || []).length ? [lookSay('kit', { list: h.kit.map(id => (KIT_ITEMS[id] || { name: id }).name).join(', ') })] : [])].join(' ') : '';
  const why = { money: lookSay('why.money', { savings: fmt(HIRED_SAVINGS), credits: fmt(st.credits) }), learn: lookSay('why.learn', { post, level, runs }),
    away: lookSay('why.away', { days, runs }) }[h.reason] || '';
  const near = [...(cap && cap.memories ? [{ c: cap, name: lookSay('near.captain', { last: cap.last }) }] : []), ...crew.map(c => ({ c, name: c.first }))]
    .filter(x => x.c.opinion >= OPINION.FRIEND).sort((a, b) => b.c.opinion - a.c.opinion).slice(0, 3);
  const told = crew.filter(c => c.story && c.story.beat >= 3).map(c => c.first), trusted = Object.keys(CAST).filter(k => ((st.cast[k] || {}).flags ||
    {}).trusted).map(k => castPerson(k).first), favor = crew.filter(c => c.story && c.story.beat >= 4).map(c => c.first), loyal = crew.filter(c => c.loyal).map(c => c.first);
  const people = [near.length ? lookSay('near', { list: near.map(x => lookSay('near.item', { name: x.name, word: opinionWord(x.c.opinion) })).join(', ') }) : lookSay('nobody'),
    told.length ? lookSay('told', { list: list(told) }) : '', favor.length ? lookSay('favor', { list: list(favor) }) : '', loyal.length ? lookSay('loyal', { list: list(loyal) }) : '', trusted.length ? lookSay('trusted', { list: list(trusted) }) : ''].filter(Boolean).join(' ');
  const closest = near.find(x => x.c.memories.length), kept = closest ? lookSay('kept', { name: closest.name, line: esc(closest.c.memories[closest.c.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '')) }) : '';  // the closest one's latest memory, in their words
  const lived = goodbyeFacts(h.flags || {}).map(f => f.recap).join(' ');  // what the hand went through (captains.js)
  const lost = (st.memorial || []).length ? lookSay('lost', { list: list((st.memorial || []).map(m => memorialName(m))) }) : '';
  const ties = webTies(folk()).slice(0, 2).map(x => lookSay('ties', { a: x.a.p.first, b: x.b.p.first, word: bondWord(x.n) })).join(' ');
  const marks = [cap, ...crew].flatMap(c => (c ? marksOf(c) : [])).sort((a, b) => b.day - a.day).slice(0, 3).map(m => `${dateOf(m.day)}: ${m.text}`).join(' ');
  return {
    title: lookSay('title'), personal: true, text: [work, sheet, why, lived, people, kept, lost, ties, marks].filter(Boolean).join('</p><p>'),
    choices: [{ label: lookSay('label'), run: () => lookSay('result') }],
  };
}

function buyInHtml() {
  const h = hired(), p = currentPlanet(), friends = buyInCompanions(), cap = G.state.people[h.captain], say = (key, vars) => sceneSay('scene:screens', key, vars);
  if (!p.services.includes('shipyard')) return `<p class="hint">${say('coop.noyard')}</p>`;
  // The co-op's berth (#882): signed at its office at Ceres; at any other yard its notice says so.
  const coop = !dealOpen() ? '' : !isCoop(p) ? `<div class="row"><div><b>${say('coop.row', { price: fmt(h.deal.price) })}</b> <span class="hint">${say('coop.notice')}</span></div></div>`
    : (`<div class="row"><div><b>${say('coop.row', { price: fmt(h.deal.price) })}</b> <span class="hint">${say('coop.terms', { share: fmt(SHARE_PRICE), owed: fmt(SHARE_PRICE - h.deal.price) })}</span></div>
     ` + ` ${h.confirm === USED_ID ? `<span><button data-action="buyInGo" data-arg="${USED_ID}" class="primary">${say('coop.confirm')}</button> <button data-action="buyInNo">Not yet</button></span>`
      : `<button data-action="buyInAsk" data-arg="${USED_ID}" ${canBuyIn(USED_ID, p) ? '' : 'disabled'}>${say('coop.sign', { price: fmt(h.deal.price) })}</button>`}</div>`);
  // The yard's own ships, for the full build's hand only: the shipped build's goal is the share.
  const ships = scopeNarrow() ? '' : Object.entries(SHIPS).filter(([, s]) => s.forSale).map(([id, s]) => {
    const locked = s.req && repOf(localGov()) < s.req;
    return (`<div class="row"><div><b>${s.name}</b> <span class="hint">${s.cargo}t, ${s.berths} berths, ${s.guns} ` +
        `gun${s.guns > 1 ? 's' : ''}. ${fmt(s.price)} cr${locked ? ', needs better standing here' : ''}</span></div>
     ` +
        ` ${h.confirm === id ? `<span><button data-action="buyInGo" data-arg="${id}" class="primary">Yes, buy and leave</button> <button data-action="buyInNo">Not yet</button></span>`
      : `<button data-action="buyInAsk" data-arg="${id}" ${canBuyIn(id, p) ? '' : 'disabled'}>Buy (${fmt(s.price)})</button>`}</div>`);
  }).join('');
  const who = friends.length ? esc(namesOf(friends)) : '';
  return (`<div class="post"><div class="eyebrow">${say('coop.eyebrow', { savings: fmt(G.state.credits) })}</div>
    ${h.debt > 0 ? `<p class="hint">${say('coop.bond', { debt: fmt(h.debt) })}</p>` : ''}
    ${coop || `<p class="hint">${say('coop.none')}</p>`}${ships}
    <p class="hint">${h.confirm ? say(who ? 'coop.leave.with' : 'coop.leave.alone', { first: esc(cap.first), last: esc(cap.last), names: who }) : say(who ? 'coop.with' : 'coop.alone', { names: who })}</p></div>`);
}

// A run in the hand's terms: the days, the ship's profit, and what that is to you. The captain's run and each suggested run say it alike.
const runTerms = r => `${r.days} days, ${fmt(r.pay !== undefined ? r.pay : r.profit)} cr ${r.pay !== undefined ? 'on delivery' : 'profit'}, so ${fmt(G.state.hired.wage * r.days)} cr wage to you, less ${fmt(KIT_DEDUCTION * r.days)} cr for your kit`;  // a rating's pay: the days at the day rate (#879)

// Where the hand stands on the way to a ship (#849): what the hall is still owed, the ship's price, and the savings. The used Ore Runner is named
// only while she is offered (the day-0 text does not give the deal away); otherwise it is the yard's cheapest.
const goalLine = (st, hd) => {
  const ship = dealOpen() ? `The co-op's buy-in for you is ${fmt(hd.deal.price)} cr` : `A co-op buy-in on a plain vote is ${fmt(BUY_IN.mid)} cr`;  // the goal is the share (#882)
  return `${hd.debt > 0 ? `Owed to the hall: ${fmt(hd.debt)} cr. ` : ''}${ship}, and you have ${fmt(st.credits)} cr.${coopWait(st, hd)}`;
};
// What the co-op's offer still waits for, once the savings are there (#954): the captain's scenes, or the runs after them.
function coopWait(st, hd) {
  if (hd.deal || st.credits < USED_OFFER_AT || captainBeatsDone(hd)) return '';
  const cap = hiredCaptain();
  if ((hd.beats || 0) < CAPTAIN_BEATS.length) return ` The co-op won't talk to you yet: Captain ${cap.first} ${cap.last} has something to tell you first.`;
  const left = 2 - (runTotals(hd).runs - (hd.beatRun || 0));
  return left > 0 ? ` The co-op will offer you a berth after ${left === 1 ? 'one more run' : 'two more runs'}.` : '';
}
const runHtml = () => {
  const hd = G.state.hired, plan = currentPlan(), led = hd.ledger.slice(0, 5), name = goodName;
  return String(h`<div class="post"><div class="eyebrow">${hiredCaptain() ? h`<span class="nowrap">Captain ${raw(personLink(hiredCaptain()))}'s</span> run` : 'The captain\'s run'}</div>
    <p class="desc">${plan && plan.planet === COOP_PORT && wantsYard() ? sceneSay('scene:screens', 'coop.heading') : ''}${!plan ? 'Nothing on the board, and nowhere in reach to look. The captain is waiting for a shipper.'
      : plan.ballast ? h`Nothing on the board here.${closedHere() ? ' The shipper here has closed its board to the ship.' : ''} The captain will run light to ${plan.planet}, ${SYSTEMS[plan.sid].name}, to look for work.`
      : plan.contract ? h`The captain has a contract from ${plan.shipper}${shipperWord(standingOf(hd, plan.shipper)) ? `, ${shipperWord(standingOf(hd, plan.shipper))}` : ''}: ${plan.tons}t of ${name(plan.good)} to ${plan.planet}, ${SYSTEMS[plan.sid].name}, due by ${dateOf(plan.due)}: ${runTerms(plan)}.${plan.hazard ? ' The lane has raids on it.' : ''}`
      : h`The captain will take the ${plan.tons}t of ${name(plan.good)} aboard to ${plan.planet}, ${SYSTEMS[plan.sid].name}: ${runTerms(plan)}.`}</p>
    <p class="hint">${goalLine(G.state, hd)}</p>${canAskCaptain() ? raw('<div class="row"><button data-action="askCaptain">Ask the captain about the co-op</button></div>') : ''}
    ${raw(swayHtml())}
    ${led.length ? h`<div class="eyebrow">Captain's log</div>${raw(logRowsHtml(led, 5))}` : ''}
  </div>`);
};

// The captain's own habits, now and then, among the crew's chatter. The captain is not crew, so the crew's lines never name them.
const CAPTAIN_CHATTER = [
  '{cap} is going over the run again, with a pencil, in the margin of a chart nobody else is allowed to touch.',
  '{cap} stops at the hatch of the {post}, looks in, and leaves without saying a word.',
  '{cap} is in the galley with the ledger open, lips moving over the sums.',
  '{cap}: "Fuel comes out of the share. Remember that when somebody wants to go faster."',
  '{cap} is checking the manifest against the hold, line by line, for the second time.',
  '{cap}: "I was a hand once. I remember what it was like when the captain didn\'t know my name."',
  '{cap} is asleep in the captain\'s chair with the log open on the captain\'s chest.',
  '{cap}: "We make port on the day, or I owe somebody an explanation. I hate owing explanations."',
];
function captainChatter() {
  const c = hiredCaptain(), name = `Captain ${c.last}`, d = captainEntry();
  if (d && d.chatter) return d.chatter.map(l => l.replace(/\{post\}/g, POSTS[hired().post].name.toLowerCase()));  // their own lines, and no trait chatter
  const lines = linedText('lines:captain-chatter', CAPTAIN_CHATTER).map(l => l.replace('{cap}', name).replace('{post}', POSTS[hired().post].name.toLowerCase()));
  for (const t of c.traits) lines.push(pick(traitChatter(t)).replace('{first}', name).replace('{home}', c.home));
  return lines;
}

Mods.register({
  id: 'hired', name: 'Hired hand', builtin: true,
  init(M) {
    M.filter('chatter', pool => (hired() && hiredCaptain() && Math.random() < 0.2 ? captainChatter() : pool));
    // The captain pays for fuel and repairs: a hired ship is topped up whenever she docks somewhere that sells them.
    M.on('landed', planet => {
      if (!hired() || chapterOf(G.state) > 1 || !planet.services.includes('refuel')) return;  // the captain's; the co-op buys its own (#891)
      G.state.fuel = ship().fuel;
      if (G.state.armor >= ship().armor * (1 - REPAIR_AT)) G.state.armor = ship().armor;  // a scrape is patched on the way in; real damage is the yard's (repairs.js)
    });
    M.on('landed', planet => {
      const text = hired() && chapterOf(G.state) === 1 && settleRun(planet);  // the captain's run and the hand's wage; the co-op's contracts settle on its board (ownerboard.js)
      if (text) M.note(text);
      if (hired() && chapterOf(G.state) === 1 && arrivalPending(planet) && !G.dialog) { hired().arrived = true; openEvent(castScene(hiredXo().cast, arrivalScene())); }  // the first officer settles up (captains.js)
    });
    M.on('landed', planet => { if (chapterOf(G.state) > 1) return; hullNote(); dealCheck(planet); });  // the share's offer is chapter one's
    M.on('landed', planet => { const h = hired(), line = h && chapterOf(G.state) === 1 && restockTorps(G.state, h, planet, ship().launcher); if (line) M.note(line); });  // the captain restocks hers; the co-op buys its own
    M.on('landed', planet => { if (hired() && chapterOf(G.state) === 1) G.offers = errandsFor(planet); });
    M.on('landed', planet => { if (chapterOf(G.state) > 1 && planet.services.includes('trade')) seenPrices(G.state, planet, G.state.day, price); });  // the co-op remembers each exchange it docks at (market.js, #891)  // a hand's board has errands, not contracts; the co-op's has the contracts (ownerboard.js)
    M_NOTE = text => M.note(text);
    M.action('sail', () => { if (hired() && chapterOf(G.state) === 1 && !sideBeforeSail()) sail(); });  // the captain's sail is chapter one's; the co-op takes off (#891)  // a side on the paper is a scene at the lock first (shippers.js)
    M.action('swapPost', post => askSwap(post));
    M.action('pick', id => {  // a pick on the ladder, taken at the port on the hand's own page (picks.js, #963)
      const c = career(), p = PICKS[id];
      if (!hired() || !c || !p || G.mode !== 'landed' || G.dialog) return;
      if (pickDue(c, skillLevel(c.post)) !== p.level || pickOpen(p, c, { teacher: pickTeacher, opinionOf: x => x.opinion || 0 }) !== true) return;
      takePick(c, id); UI.render();
    });
    M.action('askCaptain', () => askCaptain());  // the captain's next scene, now (#954)
    M.action('buyInAsk', id => {
      if (!hired() || !canBuyIn(id, currentPlanet())) return;
      if (id === USED_ID || (hired().haggle && hired().haggle.id === id)) hired().confirm = id;  // the share's buy-in is the vote's, with nothing to haggle; another ship already settled at the yard office
      else openEvent(yardScene(id));
    });
    M.action('buyInNo', () => { if (hired()) hired().confirm = hired().haggle = null; });
    M.action('buyInGo', id => {
      if (!hired() || hired().confirm !== id) return;
      const share = id === USED_ID, scene = castLateAtBuyIn(), goodbye = captainGoodbye(), closing = chapterEnd(id), recap = closing ? chapterRecap() : null, text = share ? signOn(id) : buyIn(id);  // all read from the crew and the captain before they leave
      if (text) M.note(text);
      if (!text || G.dialog) return;
      if (closing) G.state.flags.chapterOne = true;
      const scenes = [scene, goodbye, recap, closing, share ? chapterOverScene() : null].filter(Boolean);  // a main character's last scene, the goodbye, the look back, the close, then the end of chapter one
      if (scenes.length) openEvent(chainEvents(scenes));
    });
  },
});
