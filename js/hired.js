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
const HIRED_FUND = 5000;  // the ship's money, which buys the cargo
const hired = () => (G.state && G.state.hired) || null;

// ---------- skill at each post ----------
// Experience points per post, kept when you swap. Levels come at 0, 10, 30 and 60 points.
const SKILL_STEPS = [0, 10, 30, 60];
const skillXp = post => (hired() && hired().skill && hired().skill[post]) || 0;
const skillLevel = post => SKILL_STEPS.filter(n => skillXp(post) >= n).length - 1;
function gainSkill(post, n) {
  const h = hired();
  if (!h) return;
  h.skill = h.skill || {};
  h.skill[post] = (h.skill[post] || 0) + n;
}
// Doing a job yourself: the odds are worse than a crew member's, and get better as you learn the post.
const soloOdds = post => 0.45 + 0.1 * skillLevel(post);
// What stays the captain's to do: the cargo, the contracts, the ship itself, the company.
const OWNER_TABS = ['trade', 'company'];  // contracts are the captain's too, but the board still has errands
const OWNER_ACTIONS = ['takeoff', 'buy', 'buymax', 'sell', 'sellall', 'buyship', 'cbuy', 'refuel', 'repair', 'overhaul', 'buyout', 'sellout', 'torpbuy', 'hire', 'dismiss'];

function setupHired(o) {
  const st = G.state, post = HIRED_POSTS.includes(o.post) ? o.post : 'pilot';
  st.shipId = 'lightfreighter';
  st.fuel = SHIPS.lightfreighter.fuel; st.armor = SHIPS.lightfreighter.armor;
  st.credits = HIRED_SAVINGS;
  st.tutorial = null;
  home().name = shipName(false);
  // The captain, and a crew with every role but yours.
  const cap = registerPerson(makePerson(cultureOf(st.systemId)));
  cap.role = 'captain'; cap.job = 'captain';
  for (const role of ['pilot', 'gunner', 'engineer', 'slicer'].filter(r => r !== POSTS[post].role)) {
    const c = makeCrewCandidate(st.systemId);
    c.role = role; c.skill = 2; c.job = ROLE_NAMES[role].toLowerCase(); c.mood = null;
    registerPerson(c);
    st.crew.push(c.id);
  }
  st.hired = { captain: cap.id, post, since: st.day, wage: 40, share: 0.1, fund: HIRED_FUND, run: null, ledger: [], skill: { [post]: SKILL_STEPS[1] }, asked: 0 };
  return [
    `You signed on to the ${home().name}, a light freighter out of ${system().name}, under Captain ${cap.first} ${cap.last}. You are her ${POSTS[post].name.toLowerCase()}: the post is yours to work, and the captain picks where she goes.`,
    `You have ${HIRED_SAVINGS} credits to your name. Save toward a ship of your own.`,
  ];
}

// ---------- the captain's runs ----------

// Every port outside this system that buys something we can carry, scored by profit per day.
function planRun() {
  const st = G.state, h = st.hired, here = currentPlanet(), free = cargoFree(), from = st.systemId;
  const reach = Object.entries(SYSTEMS).filter(([sid]) => sid !== from && inRange(from, sid));
  const held = COMMODITIES.filter(c => (st.cargo[c.id] || 0) > 0).sort((a, b) => st.cargo[b.id] - st.cargo[a.id])[0];
  const options = [];
  for (const [sid, sys] of reach) {
    const days = Math.max(1, travelDays(from, sid));
    for (const pl of sys.planets.filter(x => x.services.includes('trade'))) {
      if (held) {  // already loaded (a run that ended somewhere else): sell what we have
        const sell = price(pl, held.id);
        if (sell !== null) options.push({ sid, planet: pl.name, good: held.id, tons: st.cargo[held.id], cost: Math.round(st.paid[held.id] || 0), loaded: true, profit: Math.round(sell * st.cargo[held.id] - (st.paid[held.id] || 0)), days });
        continue;
      }
      if (!here.services.includes('trade')) continue;
      for (const c of COMMODITIES) {
        const buy = price(here, c.id), sell = price(pl, c.id);
        if (buy === null || sell === null || sell <= buy) continue;
        let tons = Math.min(free, Math.floor(h.fund / buy));
        while (tons > 0 && tradeTotal(here, c.id, tons, 1) > h.fund) tons--;
        if (tons > 0) options.push({ sid, planet: pl.name, good: c.id, tons, cost: Math.round(tradeTotal(here, c.id, tons, 1)), profit: Math.round((sell - buy) * tons), days });
      }
    }
  }
  const score = o => o.profit / o.days;
  const best = options.sort((a, b) => score(b) - score(a))[0];
  if (best && best.profit > 0) return { ...best, ballast: false };
  // Nothing worth carrying: run light to the nearest port that trades, and look for work there.
  const dest = reach.flatMap(([sid, sys]) => sys.planets.filter(x => x.services.includes('trade')).map(pl => ({ sid, planet: pl.name, days: Math.max(1, travelDays(from, sid)) }))).sort((a, b) => a.days - b.days)[0];
  return dest ? { ...dest, good: null, tons: 0, cost: 0, profit: 0, ballast: true } : null;
}

const currentPlan = () => { const h = G.state.hired; if (!h.plan || h.plan.day !== G.state.day || h.plan.at !== G.state.planet) h.plan = { day: G.state.day, at: G.state.planet, run: planRun() }; return h.plan.run; };

// Buys the cargo, sets the course, and sails: a crewed pilot flies her out, otherwise the pilot is you.
function sail() {
  const st = G.state, h = st.hired, plan = currentPlan(), here = currentPlanet();
  if (!plan || G.mode !== 'landed' || G.dialog) return false;
  let cost = plan.cost;
  if (plan.good && !plan.loaded) {
    cost = Math.round(tradeTotal(here, plan.good, plan.tons, 1));
    recordTrade(here, plan.good, plan.tons, 1);
    st.cargo[plan.good] = (st.cargo[plan.good] || 0) + plan.tons;
    st.paid[plan.good] = (st.paid[plan.good] || 0) + cost;
    h.fund -= cost;
  }
  h.run = { ...plan, cost, day: st.day, from: st.planet };
  h.plan = null;
  st.dest = plan.sid;
  st.route = { dock: plan.planet, go: true };
  if (!giveOrder('pilot', 'depart')) takeOff();  // a manual pilot flies her out
  return true;
}

// On arrival: sell the cargo, and pay the wage and the share.
function settleRun(planet) {
  const st = G.state, h = st.hired, run = h.run;
  if (!run || planet.name !== run.planet || st.systemId !== run.sid) return;
  let revenue = 0, sold = 0;
  if (run.good && st.cargo[run.good] && price(planet, run.good) !== null) {
    sold = st.cargo[run.good];
    revenue = Math.round(tradeTotal(planet, run.good, sold, -1));
    recordTrade(planet, run.good, sold, -1);
    delete st.cargo[run.good]; delete st.paid[run.good];
    h.fund += revenue;
  }
  const profit = revenue - run.cost, days = Math.max(1, st.day - run.day);
  const wage = h.wage * days, share = profit > 0 ? Math.round(profit * h.share) : 0;
  st.credits += wage + share;
  h.ledger.unshift({ day: st.day, from: run.from, to: planet.name, good: run.good, tons: sold, cost: run.cost, revenue, profit, wage, share });
  h.ledger.length = Math.min(h.ledger.length, 20);
  h.run = null;
  gainSkill(h.post, 2);  // a burn worked
  like(st.people[h.captain], profit > 0 ? 1 : -1, profit > 0 ? 'Good run. You pull your weight.' : 'That run lost money.');
  const name = run.good ? COMMODITIES.find(c => c.id === run.good).name : null;
  return `${name ? `The captain sold ${sold}t of ${name} for ${fmt(revenue)} cr (${profit >= 0 ? `profit ${fmt(profit)}` : `loss ${fmt(-profit)}`} cr). ` : 'A run with no cargo. '}Your pay: ${fmt(wage)} cr wage${share ? ` and ${fmt(share)} cr share` : ''}.`;
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
  if (!planet.services.includes('missions') || !plan) return [];
  const dest = SYSTEMS[plan.sid].planets.find(p => p.name === plan.planet);
  return Array.from({ length: randInt(1, 3) }, () => {
    const [what, blurb] = pick(ERRANDS), gross = randInt(10, 30) * 10 * Math.max(1, plan.days), cut = Math.round(gross * ERRAND_CUT);
    return {
      type: 'errand', title: `Errand: carry ${what} to ${dest.name}`, blurb: `${blurb} The captain keeps ${fmt(cut)} cr of the fee.`,
      destSystem: plan.sid, destPlanet: dest.name, pay: gross - cut, cut, deadline: st.day + plan.days * 2 + randInt(6, 12),
    };
  });
}

// ---------- swapping posts ----------

// How likely the captain is to say yes: how far they trust you, and what you know of the post.
function swapOdds(post) {
  const cap = G.state.people[hired().captain];
  return Math.max(0.1, Math.min(0.95, 0.35 + 0.1 * cap.opinion + 0.1 * skillLevel(post)));
}

function askSwap(post) {
  const st = G.state, h = hired();
  if (!h || !POSTS[post] || post === h.post || G.mode !== 'landed' || h.asked === st.day) return;
  h.asked = st.day;
  const cap = st.people[h.captain], role = POSTS[post].role, mine = POSTS[h.post].role;
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
  const h = hired(), cap = G.state.people[h.captain], asked = h.asked === G.state.day;
  return `<div class="post"><div class="eyebrow">Your posts &middot; Captain ${esc(cap.first)} ${esc(cap.last)}</div>
    ${HIRED_POSTS.map(p => `<div class="row"><span><b>${POSTS[p].name}</b>${p === h.post ? ' <span class="tag good">yours</span>' : ''} <span class="hint">level ${skillLevel(p)} (${skillXp(p)} points)</span></span>
      ${p === h.post ? '' : `<button data-action="swapPost" data-arg="${p}" ${asked ? 'disabled' : ''}>Ask to move (${Math.round(swapOdds(p) * 100)}%)</button>`}</div>`).join('')}
    <p class="hint">Your work at a post teaches you, and what you learn stays with you. The captain decides, by how far they trust you and what you know. ${asked ? 'You have asked already; ask again after the next run.' : ''}</p>
  </div>`;
}

const crewView = UI.views.crew;
UI.views.crew = function () { return (hired() ? swapHtml() : '') + crewView.call(this); };

// ---------- buying in ----------

// The crew member you are closest to, if you are close to anyone at all.
function buyInFriend() {
  const crew = G.state.crew.map(person).filter(c => c.opinion >= 1);
  return crew.sort((a, b) => b.opinion - a.opinion || b.skill - a.skill)[0] || null;
}
const buyInPrice = id => SHIPS[id].price;  // nothing to trade in: the ship you fly is the captain's
const canBuyIn = (id, planet) => !!hired() && G.mode === 'landed' && planet.services.includes('shipyard') && SHIPS[id] && SHIPS[id].forSale
  && G.state.credits >= buyInPrice(id) && !(SHIPS[id].req && repOf(localGov()) < SHIPS[id].req);

function buyIn(id) {
  const st = G.state, h = hired(), planet = currentPlanet();
  if (!canBuyIn(id, planet)) return;
  const cap = st.people[h.captain], friend = buyInFriend(), oldName = home().name;
  st.credits -= buyInPrice(id);
  st.shipId = id; st.fuel = ship().fuel; st.armor = ship().armor;
  st.cargo = {}; st.paid = {};  // what was in the hold was the captain's
  // The captain stays a contact, and a known captain on the lanes.
  Object.assign(cap, { ship: { name: oldName, shipId: 'lightfreighter', kind: 'trader' }, haunt: st.systemId, location: planet.name });
  like(cap, 2, 'You worked my ship, and then bought your own. Fair winds.');
  for (const c of st.crew.map(person)) if (c !== friend) c.location = planet.name;  // the rest stay with her
  st.crew = friend ? [friend.id] : [];
  if (friend) like(friend, 2, `We left the ${oldName} together.`);
  // A fresh ship: nothing of the old one's wear, refits or jobs comes with you.
  for (const k of ['condition', 'refits', 'projects', 'power', 'heat', 'tuned', 'route']) delete st[k];
  home().name = shipName(false);
  st.hired = null;
  G.offers = generateMissions(planet);
  return `You bought the ${SHIPS[id].name} for ${fmt(SHIPS[id].price)} cr and left the ${oldName}. Captain ${cap.first} ${cap.last} shakes your hand on the dock and says they will keep an eye out for you on the lanes.${friend ? ` ${friend.first} ${friend.last} came with you.` : ' You are on your own.'} She is yours now: the exchange, the contracts and the yard are open to you, and the crew are your wages to pay.`;
}

function buyInHtml() {
  const h = hired(), p = currentPlanet(), friend = buyInFriend(), cap = G.state.people[h.captain];
  if (!p.services.includes('shipyard')) return '<p class="hint">The yard deals with the captain, not with you. A ship of your own can be bought at a shipyard.</p>';
  const rows = Object.entries(SHIPS).filter(([, s]) => s.forSale).map(([id, s]) => {
    const locked = s.req && repOf(localGov()) < s.req;
    return `<div class="row"><div><b>${s.name}</b> <span class="hint">${s.cargo}t, ${s.berths} berths, ${s.guns} gun${s.guns > 1 ? 's' : ''}. ${fmt(s.price)} cr${locked ? ', needs better standing here' : ''}</span></div>
      ${h.confirm === id ? `<span><button data-action="buyInGo" data-arg="${id}" class="primary">Yes, buy and leave</button> <button data-action="buyInNo">Not yet</button></span>`
      : `<button data-action="buyInAsk" data-arg="${id}" ${canBuyIn(id, p) ? '' : 'disabled'}>Buy (${fmt(s.price)})</button>`}</div>`;
  }).join('');
  return `<div class="post"><div class="eyebrow">A ship of your own &middot; your savings ${fmt(G.state.credits)} cr</div>
    ${rows}
    <p class="hint">${h.confirm ? `Leaving means leaving Captain ${esc(cap.first)} ${esc(cap.last)} and the crew behind${friend ? `, but ${esc(friend.first)} ${esc(friend.last)} would come with you` : ', and nobody on the crew knows you well enough to come'}.` : `Buy a ship and go out on your own. ${friend ? `${esc(friend.first)} ${esc(friend.last)} would come with you.` : 'Nobody on the crew knows you well enough to come with you yet.'}`}</p></div>`;
}

const runHtml = () => {
  const h = G.state.hired, plan = currentPlan(), led = h.ledger.slice(0, 5), name = id => COMMODITIES.find(c => c.id === id).name;
  return `<div class="post"><div class="eyebrow">The captain's run &middot; ship's funds ${fmt(h.fund)} cr &middot; your savings ${fmt(G.state.credits)} cr</div>
    <p class="desc">${!plan ? 'The captain is waiting for a market worth the fuel.'
      : plan.ballast ? `The captain has no cargo worth carrying and will run light to ${plan.planet}, ${SYSTEMS[plan.sid].name}, to look for work.`
      : plan.loaded ? `The captain will take the ${plan.tons}t of ${name(plan.good)} already aboard to ${plan.planet}, ${SYSTEMS[plan.sid].name}: ${plan.days} days.`
      : `The captain will buy ${plan.tons}t of ${name(plan.good)} here for ${fmt(plan.cost)} cr and take it to ${plan.planet}, ${SYSTEMS[plan.sid].name}: ${plan.days} days, about ${fmt(plan.profit)} cr profit, so about ${fmt(plan.profit * G.state.hired.share)} cr to you, plus ${fmt(h.wage * plan.days)} cr wage.`}</p>
    ${led.length ? `<div class="eyebrow">Recent runs</div>${led.map(l => `<div class="hint">${dateOf(l.day)}: ${l.from} to ${l.to}${l.good ? `, ${l.tons}t ${name(l.good)}, profit ${fmt(l.profit)} cr` : ', light'}. You earned ${fmt(l.wage + l.share)} cr.</div>`).join('')}` : ''}
  </div>`;
};

Mods.register({
  id: 'hired', name: 'Hired hand', builtin: true,
  init(M) {
    // The captain pays for fuel and repairs: a hired ship is topped up whenever she docks somewhere that sells them.
    M.on('landed', planet => {
      if (!hired() || !planet.services.includes('refuel')) return;
      G.state.fuel = ship().fuel; G.state.armor = ship().armor;
    });
    M.on('landed', planet => { const text = hired() && settleRun(planet); if (text) M.note(text); });
    M.on('landed', planet => { if (hired()) G.offers = errandsFor(planet); });  // the board has errands, not contracts
    M_NOTE = text => M.note(text);
    M.action('sail', () => { if (hired()) sail(); });
    M.action('swapPost', post => askSwap(post));
    M.action('buyInAsk', id => { if (hired() && canBuyIn(id, currentPlanet())) hired().confirm = id; });
    M.action('buyInNo', () => { if (hired()) hired().confirm = null; });
    M.action('buyInGo', id => { if (hired() && hired().confirm === id) { const text = buyIn(id); if (text) M.note(text); } });
  },
});
