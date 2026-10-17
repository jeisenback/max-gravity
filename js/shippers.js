'use strict';

// Shippers as people (#682): a shipper has a regard for the ship, kept in st.hired.standing by the shipper's name (the rules are pure, in
// contracts.js: a delivery on the day and whole raises it, each fault lowers it; from 2 a shipper offers more and pays better, at -2 it stops offering),
// and the delivery port has a face: the freight agent, one person at each port, the same every time, who meets the ship at the ramp when a delivery was late,
// short or lost, or when the dock broker (the shipper that sometimes pays less than the paper) held money back. The hand answers for the ship there, and what they
// say moves the shipper's regard and the agent's. A contract from a state's freight office, on a ship with a crew member that state wants, is a scene at the lock before
// she sails (sideScene), on the pattern of the customs stop (ties.js). Loaded after readouts.js; only calls into the game at runtime.

const freightAgent = planet => portPerson(planet, 'agents', 'agent', 'agent', 'freight agent', 'Agent');
// The shipper's regard moves by `d`, kept in range.
function moveStanding(shipper, d) { const h = hired(); if (!h) return; h.standing = h.standing || {}; h.standing[shipper] = nextStanding(standingOf(h, shipper), d); }
// The shipper of the port the ship is docked at has shut its board to her.
const closedHere = () => standingOf(hired(), shipperOf(currentPlanet(), system().gov)) <= STANDING_BAD;

// A contract settled (settleRun, hired.js): the shipper's regard moves with how it came in, and a delivery that was late, short or lost is kept for the agent.
function shipperSettled(run, sold, day, cut = 0, owed = 0) {
  moveStanding(run.shipper, standingDelta(run, sold, day));
  hired().off = deliveryOff(run, sold, day, cut, owed);
}
// What a shipper held back comes back to the ship's fund when the hand's case holds, with the hand's share of it, and the ledger's line is mended.
function restoreSkim(off) {
  const st = G.state, h = hired(), extra = Math.round(off.cut * h.share), e = h.ledger[0];
  h.fund += off.cut; st.credits += extra; h.earnedTotal = (h.earnedTotal || 0) + extra;
  if (e && e.skim === off.cut) { e.revenue += off.cut; e.profit += off.cut; e.share += extra; e.skim = 0; }
}

// The agent at the ramp. `off` is deliveryOff's record, `agent` the port's person. The hand can own it (the agent's regard), make the case (a word, on wit: if it holds
// the shipper's regard comes back up, if not it goes down again), or say nothing.
function agentScene(off, agent) {
  const say = (key, vars) => sceneSay('scene:freight-agent', key, { agent: `${agent.title} ${agent.last}`, shipper: off.shipper, good: goodName(off.good).toLowerCase(), tons: off.tons, got: off.got, late: dayWord(off.late), due: dateOf(off.due), pay: fmt(off.owed), paid: fmt(off.owed - off.cut), ...vars });
  const odds = handCheck('wit', 0, 'word', 0.05 * Math.max(-2, Math.min(2, agent.opinion)));
  return {
    title: say(`title.${off.kind}`), personal: true, people: [agent.id],
    text: say(`text.${off.kind}`),
    choices: off.kind === 'skim' ? [  // the money: speak up (a word, as below; if the case holds the shipper pays the difference), or let it go
      { label: `${say('skim.c0.label')}${costNote({ standing: true }, odds)}`, run() {
        const won = Math.random() < odds;
        if (won) restoreSkim(off);
        moveStanding(off.shipper, won ? 1 : -1); like(agent, won ? 1 : -1, say(won ? 'skim.c0.win.memory' : 'skim.c0.lose.memory'));
        return say(won ? 'skim.c0.win' : 'skim.c0.lose');
      } },
      { label: say('skim.c1.label'), run: () => say('skim.c1.result') },
    ] : [
      { label: say('c0.label'), run() { like(agent, 1, say('c0.memory')); return say('c0.result'); } },
      { label: `${say('c1.label')}${costNote({ standing: true }, odds)}`, run() {
        const won = Math.random() < odds;
        moveStanding(off.shipper, won ? 1 : -1); like(agent, won ? 1 : -1, say(won ? 'c1.win.memory' : 'c1.lose.memory'));
        return say(won ? 'c1.win' : 'c1.lose');
      } },
      { label: say('c2.label'), run: () => say('c2.result') },
    ],
  };
}

// A contract from a state's freight office (contracts.js officeOf) on a ship with a crew member that state wants (ties.js 'wanted'; an exile is the customs' business):
// the office puts the names of everyone aboard on its manifest. Once a person in sixty days, on the clock the customs stop shares, and not on the first run, which is guided.
function sideDue(plan) {
  const gov = plan && plan.contract ? officeOf(plan.shipper) : null, p = gov && runTotals(hired()).runs > 0 ? dockPeople(gov, 'wanted')[0] : null;
  return p ? { gov, p } : null;
}
// A side on the paper has its choices on the customs stop's pattern: vouch with your own papers, pay the office, say nothing and keep them below (it holds more often than not),
// put them ashore, or turn the paper down. A paper that is lost leaves the day's board empty and the office's standing with the ship down one.
function sideScene(plan, { gov, p }, agent) {
  const st = G.state, h = hired(), cap = person(h.captain), n = p.first, mine = youTies(), papers = mine.aff === gov && ['member', 'officer'].includes(mine.status[gov]);
  const say = (key, vars) => sceneSay('scene:freight-side', key, { n, first: p.first, last: p.last, gov, faction: shortFaction(gov), office: plan.shipper, agent: `${agent.title} ${agent.last}`, ...vars });
  const voidPaper = () => { h.freight = { ...h.freight, list: [] }; h.plan = null; };  // the day's board is empty, and she plans again
  const choices = [];
  if (papers) choices.push({ label: say('papers.label'), run() { like(p, 2, say('papers.memory')); return say('papers.result'); } });
  choices.push({ label: say('pay.label'), ...gated(needFunds(400)), run() { h.fund -= 400; like(cap, -1, say('pay.memory')); return say('pay.result'); } });
  choices.push({ label: say('silent.label'), run() {
    if (Math.random() < 0.55) return say('silent.clear');
    voidPaper(); moveStanding(plan.shipper, -1); changeRep(gov, -2); like(cap, -1, say('silent.captain.memory')); like(p, -1, say('silent.memory'));
    return say('silent.lost');
  } });
  if (!p.cast) choices.push({ label: say('ashore.label'), run() {
    like(p, -3, say('ashore.memory')); changeRep(gov, 1);
    for (const id of st.crew) { const q = person(id); if (q && q !== p && q.memories && tiesOf(q).aff === tiesOf(p).aff) like(q, -1, say('ashore.others.memory')); }
    return say('ashore.result') + signReplacement(p, currentPlanet());
  } });
  choices.push({ label: say('decline.label'), run() { voidPaper(); like(p, 2, say('decline.memory')); return say('decline.result'); } });
  return { title: say('title'), personal: true, people: [agent.id, p.id], text: say('text'), choices };
}
// The sail action asks first: if a side is due the scene opens at the lock and the ship does not sail until it is played (the sail key and the dock's button both come here).
function sideBeforeSail() {
  const st = G.state, h = hired();
  if (G.mode !== 'landed' || G.dialog || stayOf(h)) return false;
  const due = sideDue(currentPlan());
  if (!due) return false;
  st.customs[`${due.p.id}:${due.gov}:wanted`] = st.day;
  openEvent(sideScene(currentPlan(), due, freightAgent(currentPlanet())));
  return true;
}

Mods.register({
  id: 'shippers', name: 'Shippers', builtin: true,
  init(M) {
    // After the settlement (hired.js): the agent meets the ship if the delivery was off. A first arrival that already opened its scene (captains.js) keeps the floor; the regard has moved all the same.
    M.on('landed', planet => {
      const h = hired();
      if (!h || !h.off) return;
      const off = h.off; h.off = null;
      if (!G.dialog) openEvent(agentScene(off, freightAgent(planet)));
    });
  },
});
