'use strict';

// Shippers as people (#682, the first half): a shipper has a regard for the ship, kept in st.hired.standing by the shipper's name (the rules are pure, in
// contracts.js: a delivery on the day and whole raises it, each fault lowers it; from 2 a shipper offers more and pays better, at -2 it stops offering),
// and the delivery port has a face: the freight agent, one person at each port, the same every time, who meets the ship at the ramp when a delivery was late,
// short or lost. The hand answers for the ship there, and what they say moves the shipper's regard and the agent's. Loaded after readouts.js; only calls into
// the game at runtime.

const freightAgent = planet => portPerson(planet, 'agents', 'agent', 'agent', 'freight agent', 'Agent');
// The shipper's regard moves by `d`, kept in range.
function moveStanding(shipper, d) { const h = hired(); h.standing = h.standing || {}; h.standing[shipper] = nextStanding(standingOf(h, shipper), d); }
// The shipper of the port the ship is docked at has shut its board to her.
const closedHere = () => standingOf(hired(), shipperOf(currentPlanet(), system().gov)) <= STANDING_BAD;

// A contract settled (settleRun, hired.js): the shipper's regard moves with how it came in, and a delivery that was late, short or lost is kept for the agent.
function shipperSettled(run, sold, day) {
  moveStanding(run.shipper, standingDelta(run, sold, day));
  hired().off = deliveryOff(run, sold, day);
}

// The agent at the ramp. `off` is deliveryOff's record, `agent` the port's person. The hand can own it (the agent's regard), make the case (a word, on wit: if it holds
// the shipper's regard comes back up, if not it goes down again), or say nothing.
function agentScene(off, agent) {
  const say = (key, vars) => sceneSay('scene:freight-agent', key, { agent: `${agent.title} ${agent.last}`, shipper: off.shipper, good: goodName(off.good).toLowerCase(), tons: off.tons, got: off.got, late: dayWord(off.late), due: dateOf(off.due), ...vars });
  const odds = check(handStat('wit'), 0, DIFFICULTY.word, 0.05 * Math.max(-2, Math.min(2, agent.opinion)));
  return {
    title: say(`title.${off.kind}`), personal: true, people: [agent.id],
    text: say(`text.${off.kind}`),
    choices: [
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
