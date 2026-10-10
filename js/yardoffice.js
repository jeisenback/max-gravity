'use strict';

// The yard office: asking to buy a ship opens a short scene with the broker before the papers. You can pay the asking price,
// haggle (what you get follows your standing here and what you know, not a roll), or have her inspected. What you settle is
// kept in `h.haggle` as a sum off the price (hired.js `buyInPrice` reads it) until you buy, or turn away.

const HAGGLE_STANDING = 15, HAGGLE_SKILL = 2, HAGGLE_STEP = 0.03, INSPECT_FEE = 150, INSPECT_OFF = 0.05;

function yardScene(id) {
  const h = hired(), st = G.state, ship = buyShip(id), price = ship.price, used = id === USED_ID;
  const say = (key, vars) => sceneSay('scene:yard-office', key, { price: fmt(price), ...vars });
  const settle = (off, text) => { h.haggle = { id, off: Math.round(off) }; h.confirm = id; return text; };
  const trusted = repOf(localGov()) >= HAGGLE_STANDING, skilled = skillLevel(h.post) >= HAGGLE_SKILL, steps = (trusted ? 1 : 0) + (skilled ? 1 : 0);
  const choices = [
    { label: say('pay.label'), run: () => settle(0, say('pay.result')) },
    { label: say('haggle.label'), run: () => steps
      ? settle(price * HAGGLE_STEP * steps, say('haggle.won', { trusted: trusted ? `${say('haggle.trusted')} ` : '', skilled: skilled ? `${say('haggle.skilled')} ` : '', off: fmt(price * HAGGLE_STEP * steps) }))
      : settle(0, say('haggle.lost')) },
  ];
  if (st.credits >= price * (1 - INSPECT_OFF) + INSPECT_FEE) choices.push({ label: h.post === 'engineer' ? say('inspect.label.engineer') : say('inspect.label.paid', { fee: INSPECT_FEE }),
    run: () => {
      if (h.post !== 'engineer') st.credits -= INSPECT_FEE; else gainSkill('engineer', 2);
      return settle(price * INSPECT_OFF, say('inspect.result', { did: say(h.post === 'engineer' ? 'inspect.did.engineer' : 'inspect.did.paid'), found: say(used ? 'inspect.found.used' : 'inspect.found.other'), off: fmt(price * INSPECT_OFF) }));
    } });
  choices.push({ label: say('away.label'), run: () => { h.confirm = null; h.haggle = null; return say('away.result'); } });
  return {
    title: say('title'), personal: true,
    text: say('text', { planet: currentPlanet().name, ship: ship.name }),
    choices,
  };
}
