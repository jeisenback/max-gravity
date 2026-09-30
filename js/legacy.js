'use strict';

// Milestone 5: legacy. You have a name, and when your ship is destroyed you can go on
// as your heir instead of reloading; or you can retire from the Company tab. The heir
// inherits the company (ships, stakes, the outpost), half the standing and half of
// what people thought of you, and some of the money. A retiring captain hands over
// the ship and crew; a lost ship takes its crew with it. The Company tab lists every
// captain. State: st.captain and st.captains. Loaded before game.js; only calls into
// it at runtime.

function captain() {
  const st = G.state;
  if (!st.captain) { const p = makePerson('earth'); st.captain = { name: `${p.first} ${p.last}`, since: st.day }; }
  st.captains = st.captains || [];
  return st.captain;
}

function succeed(fate, heirName) {
  const st = G.state, old = captain(), died = fate === 'died';
  const oldShip = `${shipTitle()}, ${SHIPS[st.shipId].name}`;
  st.captains.push({ name: old.name, from: old.since, to: st.day, fate: died ? `lost with ${oldShip}` : 'retired' });
  const heir = heirName || (() => { const p = makePerson(); return `${p.first} ${p.last}`; })();
  st.captain = { name: heir, since: st.day };
  st.credits = Math.round(st.credits * (died ? 0.5 : 0.7));
  for (const p of Object.values(st.people)) p.opinion = Math.trunc(p.opinion / 2);
  for (const g of Object.keys(st.rep)) st.rep[g] = Math.trunc(st.rep[g] / 2);
  st.injured = {};
  const notes = [];
  if (died) {
    for (const id of st.crew) if (st.people[id]) delete st.people[id];
    const lost = st.crew.length;
    Object.assign(st, { crew: [], shipId: 'shuttle', outfits: {}, torpedoes: 0, cargo: {}, paid: {} });
    st.missions = st.missions.filter(m => m.type === 'bounty');
    st.home = null;
    homeLog(`In memory of Captain ${old.name}${lost ? ` and the crew` : ''}, lost with ${oldShip}.`);
    notes.push(`Captain ${old.name} is gone${lost ? `, and ${lost === 1 ? 'the crew member' : `the ${lost} crew`} aboard with them` : ''}. The company passes to ${heir}, with half the money after the estate is settled, and a new Rock Hopper.`);
  } else {
    notes.push(`Captain ${old.name} retires with 30% of the money and a berth on a quiet habitat. ${heir} takes command of ${shipTitle()}, the crew, and the company.`);
    homeLog(`Captain ${old.name} retired. ${heir} took command.`);
  }
  st.fuel = ship().fuel;
  st.armor = ship().armor;
  notes.push('People remember the name, but they will judge you for themselves: standing and old friendships carry over at half strength.');
  // Where the heir starts: the outpost, else where a company ship is docked, else here.
  const o = st.outpost, docked = (st.fleet || []).find(s => !s.dest && !s.escort);
  const at = (o && planetNamed(o.site)) || (docked && planetNamed(docked.at)) || planetNamed(st.planet) || planetNamed('Earth');
  st.systemId = at.sid; st.planet = at.pl.name;
  G.transit = null; G.engage = null; G.dialog = null; G.nextEvent = null;
  resetWorld();
  save();
  landAt(at.pl, notes);
}

function legacyHtml() {
  const c = captain(), st = G.state;
  return `<h3>Captain ${c.name}</h3>
    <p class="hint">In command since ${dateOf(c.since)}.</p>
    <div class="row"><input type="text" id="capName" maxlength="30" placeholder="Your name"><button data-action="renameCaptain">Change name</button></div>
    ${G.retireAsk ? `<p class="desc">Retire, and hand ${shipTitle()} and the company to your successor? You keep 30% of the money.</p>
      <div class="row"><input type="text" id="heirName" maxlength="30" placeholder="Successor's name"><button data-action="retire" data-arg="yes">Retire</button><button data-action="retire" data-arg="no">Not yet</button></div>`
    : '<div class="row"><button data-action="retire">Retire...</button></div>'}
    ${st.captains.length ? `<h3>Captains before you</h3>${st.captains.map(x => `<div class="hint">Captain ${x.name}, ${dateOf(x.from)} to ${dateOf(x.to)}: ${x.fate}.</div>`).join('')}` : ''}`;
}

Mods.register({
  id: 'legacy', name: 'Legacy', builtin: true,
  init(M) {
    M.on('stateReady', captain);
    M.action('heir', () => succeed('died'));
    M.action('retire', arg => {
      if (arg === 'yes') {
        const el = document.getElementById('heirName'), name = cleanName(el && el.value);
        G.retireAsk = false;
        return succeed('retired', name);
      }
      G.retireAsk = !arg;
    });
    M.action('renameCaptain', () => {
      const el = document.getElementById('capName'), name = cleanName(el && el.value);
      if (name) captain().name = name;
    });
  },
});
