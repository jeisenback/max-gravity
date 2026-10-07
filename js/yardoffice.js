'use strict';

// The yard office: asking to buy a ship opens a short scene with the broker before the papers. You can pay the asking price,
// haggle (what you get follows your standing here and what you know, not a roll), or have her inspected. What you settle is
// kept in `h.haggle` as a sum off the price (hired.js `buyInPrice` reads it) until you buy, or turn away.

const HAGGLE_STANDING = 15, HAGGLE_SKILL = 2, HAGGLE_STEP = 0.03, INSPECT_FEE = 150, INSPECT_OFF = 0.05;

function yardScene(id) {
  const h = hired(), st = G.state, ship = buyShip(id), price = ship.price, used = id === USED_ID;
  const settle = (off, text) => { h.haggle = { id, off: Math.round(off) }; h.confirm = id; return text; };
  const trusted = repOf(localGov()) >= HAGGLE_STANDING, skilled = skillLevel(h.post) >= HAGGLE_SKILL, steps = (trusted ? 1 : 0) + (skilled ? 1 : 0);
  const choices = [
    { label: `Pay the asking price (${fmt(price)} cr)`, run: () => settle(0, 'The broker slides the papers across, and does not smile. It is a clean sale, and a quick one. "Whenever you are ready," she says.') },
    { label: 'Haggle', run: () => steps
      ? settle(price * HAGGLE_STEP * steps, (`You haggle for a quarter of an ` +
          `hour. ${trusted ? 'The broker knows your ship\'s name from the port, and it counts. ' : ''}${skilled ? 'You know what she is worth, and say so, line by line. ' : ''}She ` +
          `gives up ${fmt(price * HAGGLE_STEP * steps)} cr, and writes it on the papers.`))
      : settle(0, 'You haggle for a quarter of an hour. The broker does not know you, and you cannot show her you know the ship. She does not move by a single credit, and is polite about it.') },
  ];
  if (st.credits >= price * (1 - INSPECT_OFF) + INSPECT_FEE) choices.push({ label: h.post === 'engineer' ? '[Engineer] Go over her yourself' : `Pay the yard's inspector (${INSPECT_FEE} cr)`,
    run: () => {
      if (h.post !== 'engineer') st.credits -= INSPECT_FEE; else gainSkill('engineer', 2);
      return settle(price * INSPECT_OFF, (`${h.post === 'engineer' ? 'You spend two hours in her bilges with a light and a wrench.' :
        'The inspector spends two hours in her with a light and a clipboard.'} ${used ?
        'Her drive is sound. Her life support is tired, and the fire control cable has been spliced where it should not be.' : 'She is sound, with a sticky valve in the coolant loop and a worn seal on the cargo hatch.'} ` +
          `You put the list in front of the broker, and ${fmt(price * INSPECT_OFF)} cr comes off the price.`));
    } });
  choices.push({ label: 'Not today', run: () => { h.confirm = null; h.haggle = null; return 'You thank the broker and say you will think about it. She says the ship will still be there, and in the same tone, that it might not be.'; } });
  return {
    title: 'The Yard Office', personal: true,
    text: (`The broker at ${currentPlanet().name} keeps a small office at the head of the apron, with a window onto the pad and a ship on it that is, ` +
        `for the moment, the only thing in the room. "The ${ship.name}," she says, and puts a form on the desk. "${fmt(price)} cr, as she stands. You ` +
        `have been asking about her, so I assume you have the money. What would you like to do?"`),
    choices,
  };
}
