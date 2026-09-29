'use strict';

// Boarding, prizes, and injuries. Your fire can knock a ship's hull below
// DISABLE_AT: it stops fighting and drifts. Hail it from close by (H) to board:
// strip its cargo, put a prize crew aboard and add it to your company fleet, or let
// it go. Pirates fight back aboard; a gunner and more crew help. Crew can be hurt
// when your hull takes hits or a boarding goes badly; an injured crew member's perk
// stops working until they are treated, free if a medic is aboard, otherwise at the
// next port's clinic for CLINIC_FEE each. State is st.injured. Loaded before
// game.js; only calls into it at runtime.

const DISABLE_AT = 0.2, BOARD_RANGE = 200, BOARD_SPEED = 90, CLINIC_FEE = 1000;

const canBeDisabled = n => !n.bountyId && !n.story && !n.blockade && !n.enemy && !['escort', 'agent', 'ally'].includes(n.kind);
const injured = () => (G.state.injured = G.state.injured || {});

function onDamage(o, shieldHit, byPlayer, hull) {
  // Disabled, not destroyed, when your fire takes the hull low.
  if (byPlayer && o !== G.player && !o.disabled && canBeDisabled(o) && o.armor > 0 && o.armor < o.maxArmor * DISABLE_AT) {
    o.disabled = true;
    o.thrusting = false;
    msg(`${o.name} is disabled and drifting. Close in and ${Touch.on ? 'tap Hail' : 'hail it (H)'} to board.`);
  }
  // A hard hit on your hull can hurt someone aboard.
  if (o === G.player && hull > 0 && Math.random() < 0.04) hurtCrew();
}

function hurtCrew() {
  const healthy = G.state.crew.filter(id => !injured()[id]);
  if (!healthy.length) return null;
  const id = pick(healthy);
  injured()[id] = true;
  const c = person(id);
  msg(`${fullName(c)} is hurt. Their ${ROLE_NAMES[c.role].toLowerCase()} work will suffer until they are treated.`);
  return c;
}

// Treatment on docking: your medic for free, or the clinic for a fee.
function treatInjuries(planet) {
  const hurt = G.state.crew.filter(id => injured()[id]);
  if (!hurt.length) return;
  const medic = roleHolder('medic');
  if (medic) {
    for (const id of hurt) delete injured()[id];
    UI.notes.push(`${medic.first} patches up ${hurt.map(id => person(id).first).join(' and ')}.`);
  } else {
    const st = G.state, afford = hurt.slice(0, Math.floor(st.credits / CLINIC_FEE));
    for (const id of afford) delete injured()[id];
    st.credits -= afford.length * CLINIC_FEE;
    if (afford.length) UI.notes.push(`The clinic on ${planet.name} treats ${afford.map(id => person(id).first).join(' and ')} for ${fmt(afford.length * CLINIC_FEE)} cr. A medic aboard would have done it for free.`);
    if (afford.length < hurt.length) UI.notes.push(`You can't afford the clinic for everyone; ${hurt.length - afford.length} crew stay injured.`);
  }
  if (!G.dialog) UI.render();
}

// Chance of carrying a boarding against armed resistance.
const boardOdds = () => Math.min(0.9, 0.45 + roleSkill('gunner') * 0.1 + Math.min(4, G.state.crew.length) * 0.05);

// What a captured or boarded ship is carrying.
function lootFor(n) {
  const v = voyageOf(n);
  if (v) return { cid: v.cid, tons: v.tons, voyage: v };
  if (n.kind === 'pirate') return { credits: randInt(10, 30) * 100, torps: ship().launcher ? randInt(0, 2) : 0 };
  return { cid: pick(COMMODITIES).id, tons: randInt(6, 18) };
}

function consequences(n, taking) {
  if (n.kind === 'patrol') changeRep(n.gov, taking ? -25 : -12);
  else if (n.kind === 'trader') { changeRep(localGov(), taking ? -10 : -6); changeRep('Pirate', 2); }
  else if (n.kind === 'pirate') changeRep('Pirate', -3);
  if (n.persona && typeof feel === 'function') feel(n, -5, taking ? 'You took my ship.' : 'You boarded and robbed my ship.');
}

// A fight aboard, if they resist. Returns a failure message, or null on success.
function boardingFight(n) {
  if (n.kind === 'trader') return null;  // freighter crews don't die for the company's cargo
  if (Math.random() < boardOdds()) return null;
  G.player.armor = Math.max(1, G.player.armor - G.player.maxArmor * 0.15);
  G.state.armor = Math.round(G.player.armor);
  const c = hurtCrew();
  return `They were waiting in the airlock. You fight your way back to your own ship${c ? `, and ${c.first} is hurt` : ''}. The ${n.name} is still drifting.`;
}

function boardingEvent(n) {
  const p = G.player, d = dist(n, p), rel = Math.hypot(n.vx - p.vx, n.vy - p.vy);
  const title = `${n.name} (disabled)`;
  if (d > BOARD_RANGE || rel > BOARD_SPEED) {
    return { title, text: `The ${n.name} is drifting and not answering. To board, close to within ${BOARD_RANGE} and match its velocity (you are ${Math.round(d)} out, closing at ${Math.round(rel)}).`,
      choices: [{ label: 'Cut the channel', run: () => 'You cut the channel.' }] };
  }
  const st = G.state, loot = lootFor(n), prize = SHIPS[n.shipId], prizeFee = 30 * 60;
  const resists = n.kind !== 'trader';
  return {
    title,
    text: `${n.captain ? `Capt. ${n.captain}` : 'The crew'} ${resists ? 'is armed and waiting behind the inner lock' : 'has given up and is waiting to see what you do'}. The ${prize.name} is still spaceworthy, barely.${resists ? ` Boarding against resistance: about ${Math.round(boardOdds() * 100)}% to carry it${roleSkill('gunner') ? `, with ${roleName('gunner')} leading` : ''}.` : ''}`,
    choices: [
      { label: n.kind === 'pirate' ? 'Board and take what they have' : 'Board and strip the cargo',
        can: () => n.disabled !== 'stripped' && (n.kind === 'pirate' || cargoFree() > 0),
        run() {
          const fail = boardingFight(n);
          if (fail) return fail;
          consequences(n, false);
          n.disabled = 'stripped';
          if (loot.credits) {
            st.credits += loot.credits;
            st.torpedoes = Math.min(TORP_MAX, (st.torpedoes || 0) + loot.torps);
            return `You take ${fmt(loot.credits)} cr from the pirates' strongbox${loot.torps ? ` and ${loot.torps} torpedo${loot.torps > 1 ? 'es' : ''} from their rack` : ''}.`;
          }
          const q = Math.min(cargoFree(), loot.tons), name = COMMODITIES.find(c => c.id === loot.cid).name;
          st.cargo[loot.cid] = (st.cargo[loot.cid] || 0) + q;
          if (loot.voyage && (loot.voyage.tons -= q) <= 0) loseVoyage(n);  // what's left still gets delivered
          return `You haul ${q}t of ${name} across. The crew watch you do it. Somebody will report this.`;
        } },
      { label: `Take the ship as a prize (prize crew: ${fmt(prizeFee)} cr)`,
        can: () => st.credits >= prizeFee,
        run() {
          const fail = boardingFight(n);
          if (fail) return fail;
          consequences(n, true);
          st.credits -= prizeFee;
          const credits = st.credits, at = system().planets.find(pl => pl.services.includes('refuel')) || system().planets[0];
          const savedPlanet = st.planet;
          st.planet = at.name;
          buyCompanyShip(n.shipId);
          st.planet = savedPlanet;
          st.credits = credits;
          const s = fleet()[fleet().length - 1];
          s.armor = Math.round(n.armor);
          st.companyLog[0].text = `Took the ${prize.name} "${n.name.replace(/^.*"(.*)"$/, '$1')}" as a prize near ${system().name}; it waits at ${at.name}.`;
          loseVoyage(n);
          n.dead = true;
          if (G.target === n) G.target = null;
          return `Your prize crew takes the helm and limps the ${prize.name} toward ${at.name}. It's on your Company tab now, with its hull as you left it.`;
        } },
      { label: 'Let them go', run: () => (n.kind === 'pirate' ? 'You leave them drifting. They will not thank you.' : 'You leave them to call for a tow.') },
    ],
  };
}

Mods.register({
  id: 'boarding', name: 'Boarding and injuries', builtin: true,
  init(M) {
    M.on('damage', onDamage);
    M.on('landed', treatInjuries);
  },
});
