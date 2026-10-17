'use strict';

// The board the player picks from (#685, chapter two): after the ship is bought the contracts are the economy still, and the player is the captain who chooses among them (in chapter one the
// captain's planner chooses, planRun, hired.js). The day's board (contracts.js contractBoard, the same draw the hand's captain sees) is a section of the Port page with a Take button on each
// contract: taking one loads the shipper's cargo at no cost, sets the course, and has the pilot take the ship out if one is crewed (autopilot.js), else the player takes off. The run is kept on the
// career (career().run), and on the landing at the contract's port the shipper pays, docked for lateness and short or lost loads, to the player's credits, and its regard for the ship moves
// (shippers.js). Only the owner has a board; the hand's is the captain's. Loaded after readouts.js; only called into at runtime.

const ownerHasBoard = () => !hired() && !!career() && currentPlanet().services.includes('trade');

// Tons of a good in the hold that are a shipper's, on their way to its port: not the owner's to sell at the Exchange (ui.js), whatever the market pays.
const freightHeld = good => { const run = !hired() && career() && career().run; return run && run.good === good ? run.tons : 0; };

// The Port page's section: the run under way, or the day's contracts, each with its pay and when it is due.
function ownerBoardHtml() {
  if (!ownerHasBoard()) return '';
  const st = G.state, c = career(), run = c.run;
  if (run) return String(h`<h3>Contracts</h3><p class="desc">${run.tons}t of ${goodName(run.good).toLowerCase()} for ${run.shipper}, to ${run.planet}, ${dueWord(run, st.day)}.</p>`);
  const list = contractBoard(st, currentPlanet());
  if (!list.length) return String(h`<h3>Contracts</h3><p class="hint">Nothing on the board today.</p>`);
  const free = cargoFree();
  return String(h`<h3>Contracts</h3>${listHtml(list, (k, i) => h`<div class="row">
      <span>${k.shipper}: ${k.tons}t of ${goodName(k.good).toLowerCase()} to ${k.planet} (${SYSTEMS[k.sid].name}, ${dayWord(k.days)}), ${dueWord(k, st.day)}. Pays ${fmt(k.pay)} cr.</span>
      <button data-action="takeContract" data-arg="${i}" ${k.tons <= free ? '' : raw('disabled title="Not enough cargo space"')}>Take it</button></div>`)}`);
}

// Takes the i-th contract on the board: the shipper's cargo goes aboard, the course is set, and the ship leaves if a pilot is crewed to take her out.
function takeContract(i) {
  if (!ownerHasBoard() || career().run || G.mode !== 'landed' || G.dialog) return '';
  const st = G.state, c = career(), list = contractBoard(st, currentPlanet()), k = list[i];
  if (!k || k.tons > cargoFree()) return '';
  st.cargo[k.good] = (st.cargo[k.good] || 0) + k.tons;  // the shipper's cargo, loaded at no cost (contracts.js)
  c.run = { ...k, day: st.day, from: st.planet, contract: true };
  c.freight = { ...c.freight, list: list.filter((_, j) => j !== i) };
  st.dest = k.sid; st.route = { dock: k.planet, go: true };
  const depart = ORDERS.pilot.find(o => o.id === 'depart');
  return depart.can() ? depart.run() : `${k.shipper}'s ${k.tons}t of ${goodName(k.good).toLowerCase()} are aboard, and the course is set for ${k.planet}. Take off when you are ready.`;
}

// The landing at the contract's port: the shipper pays for what arrived, docked for lateness, less what a dock broker held back, to the player's credits; its regard for the ship moves with
// how it came in. Returns the note, or '' when this is not the contract's port.
function settleContract(planet) {
  const st = G.state, c = career(), run = !hired() && c && c.run;
  if (!run || planet.name !== run.planet || st.systemId !== run.sid) return '';
  const have = Math.min(run.tons, st.cargo[run.good] || 0), paper = latePay(Math.round(run.pay * have / run.tons), run.due, st.day), cut = skimOf(run, paper, standingOf(c, run.shipper)), pay = paper - cut;
  moveStanding(run.shipper, standingDelta(run, have, st.day));
  if (st.cargo[run.good] > have) st.cargo[run.good] -= have; else { delete st.cargo[run.good]; delete st.paid[run.good]; }
  st.credits += pay;
  c.run = null;
  gainSkill(c.post, 2);  // a run worked teaches the player's own post, as a burn does the hand's (hired.js settleRun)
  const late = Math.max(0, st.day - run.due), off = [];
  if (have < run.tons) off.push(have ? `Short: ${run.tons - have}t did not arrive, and ${run.shipper} paid for what did.` : `The load for ${run.shipper} was lost on the way, and there is no pay.`);
  if (late) off.push(`${dayWord(late)} late, and the pay docked.`);
  if (cut) off.push(`${run.shipper} held back ${fmt(cut)} cr for handling.`);
  return `${off.length ? `${off.join(' ')} ` : ''}${run.shipper} pays ${fmt(pay)} cr for ${have}t of ${goodName(run.good).toLowerCase()}.`;
}

Mods.register({
  id: 'ownerboard', name: 'The contracts board', builtin: true,
  init(M) {
    M.action('takeContract', i => { const text = takeContract(Number(i)); if (text) UI.notes.push(text); });
    M.on('landed', planet => { const text = settleContract(planet); if (text) M.note(text); });
  },
});
