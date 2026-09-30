'use strict';

// The hired-hand start: you sign on to an NPC captain's ship instead of owning one. The ship,
// its cargo and its running costs are the captain's; you man one post (manual for you) while
// the captain's crew fill the rest, and what you hold is your own savings. A hired game has
// st.hired; an owner game has none and plays as it always has. The captain's runs, wage and
// share come with #58, side jobs with #59, swapping posts with #60, buying in with #61.
// Loaded before game.js; only calls into it at runtime.

const HIRED_POSTS = ['pilot', 'gunner', 'engineer', 'comms'];  // the posts you can sign on to
const HIRED_SAVINGS = 300;
const hired = () => (G.state && G.state.hired) || null;
// What stays the captain's to do: the cargo, the contracts, the ship itself, the company.
const OWNER_TABS = ['trade', 'missions', 'company'];
const OWNER_ACTIONS = ['buy', 'buymax', 'sell', 'sellall', 'accept', 'buyship', 'cbuy', 'refuel', 'repair', 'overhaul', 'buyout', 'sellout', 'torpbuy', 'hire', 'dismiss'];

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
  st.hired = { captain: cap.id, post, since: st.day, wage: 40, share: 0.1 };
  return [
    `You signed on to the ${home().name}, a light freighter out of ${system().name}, under Captain ${cap.first} ${cap.last}. You are her ${POSTS[post].name.toLowerCase()}: the post is yours to work, and the captain picks where she goes.`,
    `You have ${HIRED_SAVINGS} credits to your name. Save toward a ship of your own.`,
  ];
}

Mods.register({
  id: 'hired', name: 'Hired hand', builtin: true,
  init(M) {
    // The captain pays for fuel and repairs: a hired ship is topped up whenever she docks somewhere that sells them.
    M.on('landed', planet => {
      if (!hired() || !planet.services.includes('refuel')) return;
      G.state.fuel = ship().fuel; G.state.armor = ship().armor;
    });
  },
});
