'use strict';

// Mission arcs hung on a shipper (#683). A shipper that knows the ship (standing 1, shippers.js) offers a contract that is not freight: a sealed crate, a
// passenger, a run to a port the board would not draw. The offer is work elsewhere on the Missions page (awayjobs.js), so it goes to the captain through the pitch, and
// the hand's regard with the captain gates the arc. At the far end the arc's first scene plays, and the rest are storylets (js/stories/arc-*.js) that read and write
// qualities, as any storyline does. An arc ends in a shipper's regard, a person, an item for the kit (sheet.js) or a line in the journal; the chapter's end is still the ship.
// The arcs' own people are authored (first and last names fixed, the rest drawn from dice of their own so the game's are not touched) and live in the registry like
// the dock official (official.js). Loaded after shippers.js; only calls into the game at runtime.

const ARC_STANDING = 1;  // the regard a shipper must have for the ship before it offers its arc
const MISSION_ARCS = {
  league: { shipper: 'the League Freight Hall', at: ['Ceres Station'], sid: 'pallas', dest: 'The Hollows', first: 'league-crate',
    title: 'A Crate for {dest}', blurb: '{who} has a sealed crate for the Hollows that the Hall will not put on a bill of lading. It has no weight to speak of, and a day on it.' },
};
const ARC_PEOPLE = {
  wen: { first: 'Wen', last: 'Haraldsen', job: 'delegate of the Hollows', at: 'The Hollows' },
  marit: { first: 'Marit', last: 'Okafor', job: 'guild clerk', at: 'Pallas Refinery' },
};

// An offer in the shape the Missions page and the pitch read (awayjobs.js): no stages, only a title and a blurb; the far end is the arc's first scene.
const arcJob = a => ({ id: `arc-${a.arc}`, title: MISSION_ARCS[a.arc].title, blurb: MISSION_ARCS[a.arc].blurb, stages: [] });
// The scene that opens at the far end of an arc's offer (a storylet marked `chained`, so the landings do not pick it).
function arcBeginning(a) { const s = STORYLETS.find(x => x.id === MISSION_ARCS[a.arc].first); return s ? storyletEvent(s) : null; }

// The hand takes an item into the kit (once); the line says so, for the choice's result.
function addKit(id) {
  const h = hired();
  if (!h || !KIT_ITEMS[id] || (h.kit || []).includes(id)) return '';
  h.kit = [...(h.kit || []), id];
  return `You carry ${KIT_ITEMS[id].name} now.`;
}

// An arc's person, made at the first asking and the same after, with the name the arc gives them.
function arcPerson(key) {
  const st = G.state, ids = st.arcPeople = st.arcPeople || {};
  let p = ids[key] && st.people[ids[key]];
  if (p) return p;
  const d = ARC_PEOPLE[key], real = Math.random;
  Math.random = seededRandom(Math.abs(hash(`arc ${key}`)));
  try { p = makePerson(cultureOf(st.systemId)); } finally { Math.random = real; }
  Object.assign(p, { first: d.first, last: d.last, job: d.job, location: d.at, arcPerson: key });
  registerPerson(p);
  ids[key] = p.id;
  return p;
}

// A shipper that knows the ship, at the port the arc starts from, with the work not begun and nothing else of its kind waiting: the offer goes on the board.
function arcOffer(arc, id, planet) {
  const st = G.state, h = hired();
  if (!h || arc.shipper !== shipperOf(planet, system().gov) || !arc.at.includes(planet.name) || quality(id) > 0 || (h.away || []).some(a => a.arc === id)) return null;
  if (standingOf(h, arc.shipper) < ARC_STANDING || (h.away || []).length >= AWAY_MAX || !inRange(st.systemId, arc.sid)) return null;
  const days = Math.max(1, travelDays(st.systemId, arc.sid)), agent = freightAgent(planet);
  return { tpl: `arc:${id}`, arc: id, ctx: { dest: arc.dest, from: planet.name, who: `${agent.title} ${agent.last}`, system: SYSTEMS[arc.sid].name, scale: 1 }, sid: arc.sid, planet: arc.dest, days, until: st.day + days * 2 + 14, pitched: null };
}

Mods.register({
  id: 'arcs', name: 'Mission arcs', builtin: true,
  init(M) {
    M.on('landed', planet => {
      const h = hired();
      if (!h) return;
      h.away = h.away || [];
      for (const [id, arc] of Object.entries(MISSION_ARCS)) {
        const o = arcOffer(arc, id, planet);
        if (o) { h.away.push(o); UI.notes.push(`${o.ctx.who} has something for the ship that is not freight. It is on the Missions page.`); }
      }
    });
    // do: ['arcLike', who, n, 'what they remember']: an arc's person thinks more or less of you, and keeps the words.
    M.addAction('arcLike', (who, n, memory) => { like(arcPerson(who), n, memory || null); return ''; });
    // do: ['shipper', name, n]: a shipper's regard for the ship moves.
    M.addAction('shipper', (name, n) => { moveStanding(name, n); return ''; });
    // do: ['kit', id]: the hand takes an item into the kit; the choice's result says so.
    M.addAction('kit', id => addKit(id));
  },
});
