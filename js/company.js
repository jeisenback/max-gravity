'use strict';

// Your shipping company: ships you own but don't fly, each with a hired captain,
// running a trade route between two ports. Every game day they move along the route;
// at each end they sell what they carry and buy what pays at the other end, through
// the same markets you use, so their trade moves prices too. Raids along the route
// can cost cargo, repairs, or rarely the ship. The company never spends the last
// COMPANY_RESERVE credits. State is st.fleet and st.companyLog. Loaded before
// game.js; only calls into it at runtime.

const COMPANY_RESERVE = 5000;

function fleet() {
  const st = G.state;
  st.fleet = st.fleet || [];
  st.companyLog = st.companyLog || [];
  return st.fleet;
}

const planetNamed = name => {
  for (const [sid, s] of Object.entries(SYSTEMS)) {
    const pl = s.planets.find(p => p.name === name);
    if (pl) return { sid, pl };
  }
  return null;
};

function companyLog(text) {
  const st = G.state;
  st.companyLog.unshift({ day: st.day, text });
  st.companyLog.length = Math.min(st.companyLog.length, 12);
}

// The most profitable load for one leg, bought 10 tons at a time while each chunk
// still pays at the far end: { lot: { cid: tons }, cost, gain }.
function bestLoad(from, to, cap, cash) {
  const lot = {};
  let cost = 0, gain = 0;
  for (let room = cap; room > 0;) {
    const chunk = Math.min(10, room);
    let pick = null;
    for (const c of COMMODITIES) {
      if (!price(from, c.id) || !price(to, c.id)) continue;
      const q0 = lot[c.id] || 0, q1 = q0 + chunk;
      const buy = tradeTotal(from, c.id, q1, 1) - tradeTotal(from, c.id, q0, 1);
      const sell = tradeTotal(to, c.id, q1, -1) - tradeTotal(to, c.id, q0, -1);
      if (cost + buy > cash || sell <= buy) continue;
      if (!pick || sell - buy > pick.m) pick = { cid: c.id, m: sell - buy, buy };
    }
    if (!pick) break;
    lot[pick.cid] = (lot[pick.cid] || 0) + chunk;
    cost += pick.buy; gain += pick.m; room -= chunk;
  }
  return { lot, cost, gain };
}

// Round trips from a port, best first, with estimated profit per day after fuel and wages.
function routeOptions(ship) {
  const here = planetNamed(ship.at), s = SHIPS[ship.shipId], out = [];
  for (const [sid, sys] of Object.entries(SYSTEMS)) {
    if (sid === here.sid || burnFuel(here.sid, sid) > s.fuel) continue;
    for (const pl of sys.planets) {
      if (!pl.services.includes('trade')) continue;
      const days = 2 * Math.max(1, baseDays(here.sid, sid));
      const out1 = bestLoad(here.pl, pl, s.cargo, Infinity), back = bestLoad(pl, here.pl, s.cargo, Infinity);
      const net = out1.gain + back.gain - 2 * burnFuel(here.sid, sid) * FUEL_PRICE - days * ship.captain.wage;
      out.push({ to: pl.name, perDay: Math.round(net / days) });
    }
  }
  return out.sort((a, b) => b.perDay - a.perDay).slice(0, 4);
}

function buyCompanyShip(shipId) {
  const st = G.state, here = currentPlanet();
  const captain = registerPerson(makeCrewCandidate(st.systemId));
  captain.opinion = 1;
  st.credits -= SHIPS[shipId].price;
  fleet().push({
    id: st.nextId++, shipId, name: shipName(false), at: here.name, captain: { pid: captain.id, wage: captain.wage, skill: captain.skill },
    route: null, dest: null, daysLeft: 0, cargo: {}, paid: 0, earned: 0, lastTrip: null,
  });
  companyLog(`Bought the ${SHIPS[shipId].name} "${fleet()[fleet().length - 1].name}" at ${here.name}; Capt. ${captain.first} ${captain.last} in command.`);
}

// Leave port: buy the best load for the other end of the route and pay for the burn.
function startLeg(ship) {
  const st = G.state, from = planetNamed(ship.at), toName = ship.at === ship.route[0] ? ship.route[1] : ship.route[0], to = planetNamed(toName);
  const fuelCost = burnFuel(from.sid, to.sid) * FUEL_PRICE;
  const cash = Math.max(0, st.credits - COMPANY_RESERVE - fuelCost);
  const load = bestLoad(from.pl, to.pl, SHIPS[ship.shipId].cargo, cash);
  for (const [cid, q] of Object.entries(load.lot)) recordTrade(from.pl, cid, q, 1);
  st.credits -= load.cost + fuelCost;
  Object.assign(ship, { cargo: load.lot, paid: load.cost + fuelCost, dest: toName, daysLeft: Math.max(1, baseDays(from.sid, to.sid)) });
}

// Arrive: sell the load unless trouble on the way took it.
function endLeg(ship) {
  const st = G.state, from = planetNamed(ship.at), to = planetNamed(ship.dest);
  const risk = (danger(from.sid) + danger(to.sid)) / 2 * 0.3 * (1 - 0.2 * (ship.captain.skill - 1));
  const label = `${SHIPS[ship.shipId].name} "${ship.name}"`;
  let income = 0, note = '';
  if (Math.random() < risk) {
    const roll = Math.random();
    if (roll < 0.05 && risk > 0.12) {
      const c = st.people[ship.captain.pid];
      if (c) c.location = to.pl.name;
      fleet().splice(fleet().indexOf(ship), 1);
      companyLog(`The ${label} was lost to pirates between ${from.pl.name} and ${to.pl.name}. Capt. ${c ? `${c.first} ${c.last}` : 'the captain'} made it to ${to.pl.name} in a lifeboat.`);
      return -ship.paid;
    }
    if (roll < 0.75) { ship.cargo = {}; note = ' Pirates seized the cargo.'; }
    else { income -= Math.round(SHIPS[ship.shipId].price * 0.05); note = ' Pirates shot up the hull; repairs were paid.'; }
  }
  for (const [cid, q] of Object.entries(ship.cargo)) {
    income += tradeTotal(to.pl, cid, q, -1);
    recordTrade(to.pl, cid, q, -1);
  }
  st.credits += income;
  const profit = income - ship.paid;
  ship.earned += profit;
  ship.lastTrip = { from: from.pl.name, to: to.pl.name, profit };
  if (note) companyLog(`The ${label}, ${from.pl.name} to ${to.pl.name}:${note} Net ${profit >= 0 ? '+' : ''}${fmt(profit)} cr.`);
  Object.assign(ship, { at: to.pl.name, dest: null, cargo: {}, paid: 0 });
  return profit;
}

function companyTick() {
  const st = G.state;
  st.companyWeek = st.companyWeek || 0;
  for (const ship of [...fleet()]) {
    if (st.credits >= ship.captain.wage) {
      st.credits -= ship.captain.wage;
      st.companyWeek = (st.companyWeek || 0) - ship.captain.wage;
    } else if (ship.route) {
      ship.route = null;  // unpaid: finish this leg, then stay in port
      companyLog(`The captain of the "${ship.name}" will park at the end of this leg until wages can be paid.`);
    }
    if (ship.daysLeft > 0 && --ship.daysLeft === 0) st.companyWeek += endLeg(ship);
    if (ship.daysLeft === 0 && ship.route && fleet().includes(ship)) startLeg(ship);
  }
}

// ---------- escorts ----------
// A company ship docked where you are can fly with you instead of trading (up to
// MAX_ESCORTS). Escorts hold formation, fight whatever is hostile to you, follow you
// through burns their tanks can make (you pay their reaction mass), and are repaired
// at your cost when you dock somewhere with repairs. Damage carries over between fights.

const MAX_ESCORTS = 2;
const escorts = () => fleet().filter(s => s.escort);

function spawnEscorts() {
  const p = G.player;
  if (!p) return;
  escorts().forEach((s, i) => {
    const st = SHIPS[s.shipId], c = G.state.people[s.captain.pid];
    const n = makeShip(s.shipId, p.x - 80, p.y + (i ? 70 : -70), p.angle);
    Object.assign(n, {
      kind: 'escort', hunts: 'hostiles', fleetId: s.id, name: `${st.name} "${s.name}"`, slotX: -90, slotY: i ? 80 : -80,
      armor: s.armor === undefined ? st.armor : s.armor, maxArmor: st.armor,
      persona: c || makePerson(), captain: c ? `${c.first} ${c.last}` : 'unknown', vx: p.vx, vy: p.vy,
    });
    G.npcs.push(n);
  });
}

// Keep each escort's damage on its company record, so it survives landing and burns.
function trackEscorts() {
  for (const n of G.npcs) {
    if (n.kind !== 'escort' || n.dead) continue;
    const s = fleet().find(f => f.id === n.fleetId);
    if (s) s.armor = Math.max(0, Math.round(n.armor));
  }
}

function escortBurn(dest) {
  const st = G.state;
  for (const s of escorts()) {
    const need = burnFuel(st.systemId, dest);
    if (need > SHIPS[s.shipId].fuel) {
      s.escort = false;
      s.at = system().planets.find(pl => pl.services.includes('refuel')).name;
      msg(`The "${s.name}" can't make that burn on one tank; it will wait for you at ${s.at}.`);
      continue;
    }
    st.credits -= need * FUEL_PRICE;
  }
}

function escortsDock(planet) {
  const st = G.state;
  let cost = 0;
  for (const s of escorts()) {
    s.at = planet.name;
    const hurt = SHIPS[s.shipId].armor - (s.armor === undefined ? SHIPS[s.shipId].armor : s.armor);
    if (hurt > 0 && planet.services.includes('refuel')) {
      const pay = Math.min(hurt, Math.floor(st.credits / REPAIR_PRICE));
      st.credits -= pay * REPAIR_PRICE; cost += pay * REPAIR_PRICE;
      s.armor = SHIPS[s.shipId].armor - hurt + pay;
    }
  }
  if (!cost) return;
  UI.notes.push(`Escort repairs: ${fmt(cost)} cr.`);
  if (!G.dialog) UI.render();
}

function escortLost(n) {
  const s = fleet().find(f => f.id === n.fleetId);
  if (!s) return;
  const c = G.state.people[s.captain.pid];
  if (c) c.location = G.state.planet;
  fleet().splice(fleet().indexOf(s), 1);
  msg(`Your escort ${n.name} is destroyed. Capt. ${c ? `${c.first} ${c.last}` : 'the captain'} ejects safely.`);
  companyLog(`The ${n.name} was destroyed flying escort near ${system().name}.`);
}

function sellCompanyShip(i) {
  const st = G.state, ship = fleet()[i], c = st.people[ship.captain.pid];
  st.credits += Math.round(SHIPS[ship.shipId].price * 0.6);
  if (c) c.location = ship.at;
  fleet().splice(i, 1);
  companyLog(`Sold the ${SHIPS[ship.shipId].name} "${ship.name}" at ${ship.at}.`);
}

function companyView() {
  const st = G.state, ships = fleet();
  const status = (s) => {
    const load = Object.entries(s.cargo).map(([cid, q]) => `${q}t ${COMMODITIES.find(c => c.id === cid).name}`).join(', ');
    if (s.escort) return `Flying escort with you (hull ${s.armor === undefined ? SHIPS[s.shipId].armor : s.armor}/${SHIPS[s.shipId].armor}).`;
    if (s.dest) return `En route ${s.at} to ${s.dest}, ${s.daysLeft} day${s.daysLeft > 1 ? 's' : ''} out${load ? `, carrying ${load}` : ', empty'}.`;
    return `Docked at ${s.at}${s.route ? '' : ', parked'}.`;
  };
  const cards = ships.map((s, i) => {
    const c = st.people[s.captain.pid], picking = UI.companyPick === s.id;
    const options = picking && !s.dest ? routeOptions(s).map(o => `<button data-action="croute" data-arg="${i}|${o.to}">${s.at} and ${o.to} &middot; about ${o.perDay >= 0 ? '' : '-'}${fmt(Math.abs(o.perDay))} cr/day</button>`).join('') : '';
    return `<div class="mission company">
      <div><b>${SHIPS[s.shipId].name} "${s.name}"</b> &middot; Capt. ${c ? `${c.first} ${c.last}` : 'unknown'}, skill ${s.captain.skill}/3, ${fmt(s.captain.wage)} cr/day
        <div class="hint">Route: ${s.route ? `${s.route[0]} and ${s.route[1]}` : 'none'}. ${status(s)}</div>
        <div class="hint">Last trip: ${s.lastTrip ? `${s.lastTrip.from} to ${s.lastTrip.to}, ${s.lastTrip.profit >= 0 ? '+' : ''}${fmt(s.lastTrip.profit)} cr` : 'none yet'}. Total: ${s.earned >= 0 ? '+' : ''}${fmt(s.earned)} cr.</div>
        ${picking ? `<div class="row">${s.dest ? '<span class="hint">Routes can be set once the ship is docked; it finishes this leg first.</span>' : options || '<span class="hint">No profitable route in range.</span>'}</div>` : ''}</div>
      <div class="row" style="margin:0">
        <button data-action="cescort" data-arg="${i}" ${s.escort || (!s.dest && s.at === st.planet && escorts().length < MAX_ESCORTS) ? '' : 'disabled'}>${s.escort ? 'Release' : 'Escort'}</button>
        <button data-action="cpick" data-arg="${s.id}" ${s.escort ? 'disabled' : ''}>${picking ? 'Close' : 'Route'}</button>
        <button data-action="cpark" data-arg="${i}" ${s.route ? '' : 'disabled'}>Park</button>
        <button data-action="csell" data-arg="${i}" ${s.dest ? 'disabled' : ''}>Sell (${fmt(SHIPS[s.shipId].price * 0.6)})</button>
      </div>
    </div>`;
  }).join('');
  return `
    <h3>Your company</h3>
    ${cards || '<p class="hint">No ships yet. At any shipyard, buy a ship for the company: it comes with a captain and runs a trade route while you fly.</p>'}
    <p class="hint">Company ships trade with your credits but never touch the last ${fmt(COMPANY_RESERVE)} cr. Captains are paid daily. Raids on a route can cost cargo or repairs; skilled captains get through more often. Up to ${MAX_ESCORTS} ships docked where you are can fly with you as escorts instead; you pay their reaction mass and repairs.</p>
    <h3>Company log</h3>
    ${st.companyLog.length ? st.companyLog.map(l => `<div class="hint">Day ${l.day}: ${l.text}</div>`).join('') : '<p class="hint">Nothing yet.</p>'}`;
}

Mods.register({
  id: 'company', name: 'Shipping company', builtin: true,
  init(M) {
    M.on('newDay', companyTick);
    // A report on landing: what the company made since you last docked.
    M.on('landed', () => {
      const st = G.state;
      if (!fleet().length || !st.companyWeek) return;
      M.note(`Company report: ${st.companyWeek >= 0 ? '+' : ''}${fmt(st.companyWeek)} cr since you last docked, after wages.`);
      st.companyWeek = 0;
    });
    M.action('cbuy', id => buyCompanyShip(id));
    M.action('cpick', id => { UI.companyPick = UI.companyPick === Number(id) ? null : Number(id); });
    M.action('croute', arg => {
      const [i, to] = arg.split('|'), s = fleet()[Number(i)];
      s.route = [s.at, to];
      UI.companyPick = null;
      companyLog(`The "${s.name}" now runs ${s.at} and ${to}.`);
    });
    M.action('cpark', i => { fleet()[Number(i)].route = null; });
    M.action('cescort', i => {
      const s = fleet()[Number(i)];
      s.escort = !s.escort;
      s.route = null;
      s.at = G.state.planet;
      UI.companyPick = null;
      companyLog(s.escort ? `The "${s.name}" joins you as an escort.` : `The "${s.name}" stays at ${s.at}.`);
    });
    M.on('enterSystem', spawnEscorts);
    M.on('frame', trackEscorts);
    M.on('burnStart', escortBurn);
    M.on('landed', escortsDock);
    M.on('destroyed', n => { if (n.kind === 'escort') escortLost(n); });
    M.action('csell', i => sellCompanyShip(Number(i)));
  },
});
