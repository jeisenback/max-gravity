'use strict';

// Hailing ships in flight. Every NPC ship has a procedural captain (`n.persona`) whose
// first trait sets the tone. Hails pause the game and use the shared choice dialog.
// Loaded before game.js; only calls into it at runtime.

const HAIL_RANGE = 3000;

const GREETINGS = {
  talkative: 'Well, hello there! Always nice to hear a new voice out here.',
  nervous: 'Uh, this is {ship}. We are just passing through. Please.',
  rude: 'What do you want?',
  kind: 'Good to hear from you, friend. Safe burns.',
  greedy: 'Time is money, captain. Make it quick.',
  pious: 'Peace on your burn, traveler.',
  curious: 'Oh, a {yours}! What are you hauling?',
  drunk: 'Heyyy. Who is this? Who is anybody?',
  secretive: '...This is {ship}. State your business.',
  generous: 'Hello there! Need anything?',
  brave: 'This is {ship}. Go ahead.',
  homesick: 'This is {ship}, out of {home}. Go ahead.',
};

const PIRATE_DEMANDS = {
  rude: 'Cargo. Now. Or we cut it out of your hull.',
  greedy: 'Everything has a price, including your ship. Let us negotiate.',
  nervous: 'We, uh, we are pirates! Cut your drive and hand over your cargo!',
  talkative: 'Now, I know what you are thinking, and the answer is yes, we really are going to rob you.',
  drunk: 'Stand and deliver! Wait, no. Cut your drive! That is the one.',
};
const PIRATE_DEMAND = 'This is {ship}. Cut your drive and prepare to be boarded.';

function voice(n, table, fallback) {
  const c = n.persona, line = table[c.traits[0]] || fallback;
  return line.replace('{ship}', n.name).replace('{yours}', ship().name).replace('{home}', c.home);
}

// Pirates announce themselves when they first close in.
function demandLine(n) {
  return n.payer ? `Nothing personal, captain. ${n.payer} paid good money for your ship.` : voice(n, PIRATE_DEMANDS, PIRATE_DEMAND);
}

function pirateDemand(n) {
  if (n.hailed || n.bountyId) return;
  n.hailed = true;
  msg(`${n.name}: "${demandLine(n)}" (H to answer)`);
}

function tryHail() {
  const p = G.player;
  if (!G.target || G.target.dead) {
    G.target = G.npcs.filter(n => dist(n, p) < HAIL_RANGE).sort((a, b) => dist(a, p) - dist(b, p))[0] || null;
  }
  if (!G.target) return msg('No ships in comms range.');
  if (dist(G.target, p) > HAIL_RANGE) return msg(`${G.target.name} is out of comms range.`);
  G.mode = 'hail';
  openEvent(hailEvent(G.target));
}

// Send a ship away from the player and out of local space.
function leave(n) {
  n.hostile = false;
  const a = Math.atan2(n.y - G.player.y, n.x - G.player.x);
  n.goal = { x: Math.cos(a) * 4500, y: Math.sin(a) * 4500, r: 150 };
}

const damaged = n => n.armor < n.maxArmor * 0.3;

function threatOdds(n) {
  const t = n.persona.traits;
  return Math.max(0.05, Math.min(0.9, 0.25 + (playerGuns() - SHIPS[n.shipId].guns) * 0.2 + (damaged(n) ? 0.3 : 0)
    + (t.includes('nervous') ? 0.2 : 0) - (t.includes('brave') ? 0.2 : 0)));
}

function bigCargo() {
  const st = G.state;
  return Object.keys(st.cargo).filter(c => st.cargo[c] > 0).sort((a, b) => st.cargo[b] - st.cargo[a])[0];
}

function hailEvent(n) {
  const c = n.persona, captain = `Capt. ${c.first} ${c.last}`, st = G.state;
  const title = `${n.name}`;
  const signOff = { label: 'Cut the channel', run: () => 'You cut the channel.' };

  if (n.bountyId) {
    const m = st.missions.find(x => x.id === n.bountyId);
    return {
      title, text: `${n.name} answers with a laugh. "Come and collect, bounty hunter."`,
      choices: [
        { label: 'Offer them a chance to surrender', run() {
          if (!damaged(n) || Math.random() < 0.3) return '"Surrender? To you?" More laughter. The channel goes dead.';
          n.dead = true;
          if (m) {
            st.credits += m.pay;
            st.missions = st.missions.filter(x => x !== m);
          }
          return `${n.name} powers down and surrenders. A patrol cutter takes custody, and the ${m ? `${fmt(m.pay)} cr ` : ''}bounty is yours without firing another shot.`;
        } },
        signOff,
      ],
    };
  }

  if (n.kind === 'pirate' && n.hostile) {
    const hired = !!n.payer;
    const tribute = Math.max(500, Math.round(st.credits * 0.08));
    const choices = [];
    if (hired) {
      choices.push({ label: 'Outbid whoever paid you (3,000 cr)', can: () => st.credits >= 3000, run() {
        st.credits -= 3000;
        leave(n);
        return `${captain} considers it. "Your money spends the same as ${n.payer}'s." They break off.`;
      } });
    } else {
      choices.push({ label: `Pay tribute (${fmt(tribute)} cr)`, can: () => st.credits >= tribute, run() {
        st.credits -= tribute;
        leave(n);
        return `The credits clear. "Pleasure doing business." ${n.name} peels away.`;
      } });
      choices.push({ label: 'Dump half your biggest cargo', can: hasTradeCargo, run() {
        const text = loseCargo(0.5);
        leave(n);
        return `${text} ${n.name} goes after it, and you are forgotten.`;
      } });
    }
    if (damaged(n) && !hired) {
      choices.push({ label: 'Demand their cargo instead', run() {
        const free = cargoFree();
        leave(n);
        if (free <= 0) return `They offer their hold, but you have no room. You let them limp away.`;
        const good = pick(COMMODITIES), tons = Math.min(free, randInt(4, 10));
        st.cargo[good.id] = (st.cargo[good.id] || 0) + tons;
        return `"All right, all right!" They jettison ${tons}t of ${good.name} and run. You scoop it up.`;
      } });
    }
    choices.push({ label: 'Threaten them', run() {
      if (Math.random() < threatOdds(n)) {
        leave(n);
        return `${captain} looks at your guns, then at theirs. "Not worth it." They break off.`;
      }
      return `${captain} laughs at you. "Brave words." They keep coming.`;
    } });
    choices.push({ label: '[{crew}] Claim you are one of theirs', role: 'slicer', run() {
      if (Math.random() < slicerOdds()) {
        leave(n);
        return '{crew} spoofs a pirate transponder and some convincing gang chatter. They wave you off.';
      }
      return `{crew}'s spoof does not fool them. "Nice try."`;
    } });
    choices.push(signOff);
    return { title, text: `${captain}: "${demandLine(n)}"`, choices };
  }

  if (n.kind === 'pirate') {
    return {
      title, text: `${captain} reads your transponder and relaxes. "One of ours. What do you need?"`,
      choices: [
        { label: 'Any news?', can: () => !n.gossiped, run() { n.gossiped = true; return `"${addRumor()}"`; } },
        { label: 'Buy stolen luxury goods (5t at 250 cr/t)', can: () => !n.fenced && cargoFree() >= 5 && st.credits >= 1250, run() {
          n.fenced = true;
          st.credits -= 1250;
          st.cargo.luxury = (st.cargo.luxury || 0) + 5;
          st.paid.luxury = (st.paid.luxury || 0) + 1250;
          return 'Five tons of "slightly used" luxury goods drift across on a tether. No questions asked.';
        } },
        signOff,
      ],
    };
  }

  if (n.hostile) {
    return {
      title, text: `${captain}: "You shot at us! What kind of lunatic are you?"`,
      choices: [
        { label: 'Apologize and pay for the damage (500 cr)', can: () => st.credits >= 500, run() {
          st.credits -= 500;
          n.hostile = false;
          return `${captain} grumbles, but takes the money and stands down.`;
        } },
        signOff,
      ],
    };
  }

  // A peaceful trader.
  const cid = bigCargo(), good = cid && COMMODITIES.find(x => x.id === cid);
  const offer = good && Math.round(good.base * rand(0.95, 1.25));
  const qty = cid && Math.min(10, st.cargo[cid]);
  const s = ship(), spare = Math.min(40, s.fuel - st.fuel);
  const free = c.traits.includes('kind') || c.traits.includes('generous');
  return {
    title, text: `${captain}: "${voice(n, GREETINGS, 'This is {ship}. Go ahead.')}"`,
    choices: [
      { label: 'Any news?', can: () => !n.gossiped, run() {
        n.gossiped = true;
        return c.traits.includes('secretive') ? '"Nothing I care to share." Fair enough.' : `"${addRumor()}"`;
      } },
      ...(spare > 0 ? [{ label: free ? `Could you spare ${spare} units of reaction mass?` : `Buy ${spare} units of reaction mass (${fmt(spare * 4)} cr)`,
        can: () => !n.soldFuel && (free || st.credits >= spare * 4), run() {
          n.soldFuel = true;
          st.fuel += spare;
          if (free) return `"Of course. We all need help out here." They pass it over on a hose, free.`;
          st.credits -= spare * 4;
          return 'You match velocity and they pump it across. Not cheap, but you are not stuck.';
        } }] : []),
      ...(good ? [{ label: `Sell them ${qty}t of ${good.name} (${fmt(offer)} cr/t)`, can: () => !n.bought, run() {
        n.bought = true;
        const held = st.cargo[cid];
        st.paid[cid] -= st.paid[cid] * qty / held;
        st.cargo[cid] -= qty;
        st.credits += qty * offer;
        return `A cargo tender flits across. ${captain} pays ${fmt(qty * offer)} cr for the lot.`;
      } }] : []),
      { label: 'Sign off', run: () => `"${c.traits.includes('rude') ? 'Finally.' : 'Safe burns, captain.'}"` },
    ],
  };
}
