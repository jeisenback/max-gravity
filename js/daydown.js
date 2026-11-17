'use strict';

// Going down to Lagos (#1162, docs/bible/ports.md Going down to Lagos): at the Ring, while the captain waits for a shipper (stay.js), the hand can
// take the spaceplane down to the Lagos platform and back for a day, alone, for a seat bought from their own savings. A day down is a short menu,
// as the day ashore is (dayashore.js): the arcology's tiers, the mainland market across the lagoon, or the platform's departure hall, each a line
// taken in turn by the day. The words are the lines of scene:day-down (hiredscenes.js). Once a day; the night then passes as it does in a stay.
// Loaded after dayashore.js; calls into stay.js only at runtime.

// The seat down and back (the owner, 2026-11-14); the port the spaceplane goes down from; dried crayfish for Ngozi from Surulere's market (#1164); and the
// days from the hand's word to the yard clerk until the woman from that market has the empty bay on the Ring (#1164, portview.js); and the days from
// meeting the boy in Yaba until a landing at the Ring can find him at the hiring boards (#1164).
const DOWN_FARE = 900, DOWN_PORT = 'Earth', CRAYFISH = 60, SELLER_DAYS = 5, BOY_DAYS = 10;
const DOWN_LANES = ['tiers', 'market', 'hall'];
const lagosSay = (key, vars) => sceneSay('scene:day-down', key, vars);
// Whether a day down is on offer here now, and if it is, whether it is shut (been down today, or short of the fare). `st` the save, `h` the hand, `planet` the port.
function downOffer(st, h, planet) {
  if (!h || !planet || planet.name !== DOWN_PORT || atSite(st) || !stayOf(h)) return null;
  return { shut: h.downDay === st.day || st.credits < DOWN_FARE };
}
// Something to bring up (#1164, part 1): once the hand has eaten at Ngozi's (portview.js st.portAte), the day can go on a bag of dried crayfish for her
// from Surulere's market, carried up (st.forNgozi) until her next word takes it.
const crayfishLane = st => (st.portAte === undefined || st.forNgozi ? [] : [{ label: lagosSay('crayfish.label', { cost: fmt(CRAYFISH) }), ...gated(needCr(CRAYFISH)), run() {
  st.credits -= CRAYFISH; st.forNgozi = true;
  return lagosSay('crayfish.result');
} }]);
// Back up from Tomas's parents' table, the stew Chioma sends him (#1164, part 1): his memory of it; the regard was the visit's.
function tomasStewEvent(t) {
  return { title: lagosSay('stew.title'), text: lagosSay('stew.text'), personal: true, people: [t.id], place: 'well', choices: [
    { label: lagosSay('stew.leave'), keep: true, run() { like(t, 0, lagosSay('stew.memory')); return null; } },
  ] };
}
// The boy comes up (#1164, part 3): a landing at the Ring BOY_DAYS after meeting him in Yaba finds him at the hiring boards, up on a contract. Once.
// His name is from Lagos (LAGOS_NAMES.men, portview.js), by the port's dice, and none of the Ring's own people's.
const boyDue = (st, planet) => planet.name === DOWN_PORT && st.metBoy !== undefined && !st.boyUp && st.day - st.metBoy >= BOY_DAYS;
function boyName(planet) {
  const taken = PORT_LAYOUTS[planet.name].folk.map(f => lagosName(planet, f).first), list = LAGOS_NAMES.men.filter(n => !taken.includes(n));
  return list[Math.abs(hash(`${planet.name} boy`)) % list.length];
}
function boyEvent(planet) {
  const first = boyName(planet), say = key => lagosSay(key, { first });
  return { title: say('boy.title'), text: say('boy.text'), personal: true, place: 'yard', choices: [
    { label: say('boy.how.label'), run: () => say('boy.how.result') },
    { label: say('boy.luck.label'), run: () => say('boy.luck.result') },
  ] };
}
// Lives below the Ring (#1164, part 4): one day down in BELOW_EVERY has a lane into the life below of one of the Ring's own people, the repairer and
// the keeper in turn, each once: their next word at the Ring is about it (portview.js).
const BELOW_EVERY = 4, BELOW = ['repairer', 'keeper'];
function belowLane(st, planet) {
  const key = BELOW[Math.floor(st.day / BELOW_EVERY) % BELOW.length], layout = portLayout(planet), f = layout && layout.folk.find(x => x.key === key);
  if (!f || st.day % BELOW_EVERY !== 1 || (st.belowSeen || []).includes(key)) return [];
  const first = portFolkPerson(planet, f).first;
  return [{ label: lagosSay(`below.${key}.label`, { first }), run() { (st.belowSeen = st.belowSeen || []).push(key); st.belowFor = key; return lagosSay(`below.${key}.day`, { first }); } }];
}
// Work below (part 3): the day's one of the jobs kept for Lagos (jobs.js, `down`), in turn by the day; it takes the day down, and the pay is the hand's.
const downJob = day => { const list = JOBS.filter(j => j.down); return list[day % list.length]; };
function dayDownEvent() {
  const st = G.state;
  return {
    title: lagosSay('title'), text: lagosSay('text'), personal: true, place: 'well',  // it starts at the spoke lift, on the Ring's view
    choices: [...DOWN_LANES.map(k => ({ label: lagosSay(`${k}.label`), run() {
      if (k === 'market' && st.day % 3 === 0) st.metSeller = true;  // the woman selling phone parts, who asks if the Ring is hiring (portview.js, the clerk)
      if (k === 'market' && st.day % 3 === 2 && st.metBoy === undefined) st.metBoy = st.day;  // the boy who writes the agency's name on his hand
      return lagosSay(`${k}.${st.day % 3}`);
    } })),
      { label: lagosSay('work.label'), run() { G.nextEvent = jobStage(downJob(st.day), 0); return null; } },  // the day's job below, played as a station job is (jobs.js)
      ...crayfishLane(st), ...belowLane(st, currentPlanet())],
  };
}
// Tomas's parcel (#1162, part 2; docs/bible/people/tomas.md): when Tomas is aboard and trusts the hand as a visit home asks (OPINION.TRUSTED,
// family.js), going down starts with him at the lift with a bag for his parents, Emeka and Chioma, in Surulere. Taken, the day is at their table, and
// what the hand tells them is worth his regard and a memory; not taken, the day down goes on as it would. Not again inside VISIT_GAP days of the last.
const parcelDue = (st, t) => !!t && t.opinion >= OPINION.TRUSTED && st.day - (t.parentsAt === undefined ? -VISIT_GAP : t.parentsAt) >= VISIT_GAP;
function tomasParcelEvent(t) {
  const st = G.state;
  return { title: lagosSay('parcel.title'), text: lagosSay('parcel.text'), personal: true, people: [t.id], place: 'well', choices: [
    { label: lagosSay('parcel.take'), run() { t.parentsAt = st.day; G.nextEvent = tomasParentsEvent(t); return null; } },
    { label: lagosSay('parcel.not'), run() { G.nextEvent = dayDownEvent(); return null; } },  // the day down as it would have been
  ] };
}
function tomasParentsEvent(t) {
  const told = (key, by) => ({ label: lagosSay(`parents.${key}.label`), run() { like(t, by, lagosSay(`parents.${key}.memory`)); G.nextEvent = tomasStewEvent(t); return lagosSay(`parents.${key}.result`); } });  // and back up with the stew
  return { title: lagosSay('parents.title'), text: lagosSay('parents.text'), personal: true, choices: [told('kind', 1), told('true', 2)] };
}

// At a port with a view (#1193): the day's lanes as tags on the spoke lift, each the day down on its own and paid for when it is taken, in place of the
// menu; the crayfish is a choice in the market's day, and the day's lane into a life below its own tag. Tomas's parcel is a tag over him while he is
// on the view, and nothing is paid unless it is taken. Each is { key, label, who | room, lift, take }: the view's standing offers (portview.js).
function downOffers(st, planet) {
  const h = hired(), o = G.mode === 'landed' && downOffer(st, h, planet);
  if (!o || o.shut || !portLayout(planet)) return [];
  const fare = fmt(DOWN_FARE), day = st.day, pay = () => { st.credits -= DOWN_FARE; h.downDay = day; };
  const up = { label: lagosSay('up.label'), keep: true, run: () => null };
  const dayOf = (text, more = []) => ({ title: lagosSay('title'), text, personal: true, place: 'well', choices: [...more, up] });
  const lane = k => ({ key: `down:${k}`, label: lagosSay(`tag.${k}`, { fare }), room: 'well', lift: true, take() {
    pay();
    if (k === 'market' && day % 3 === 0) st.metSeller = true;  // as the menu's market (dayDownEvent)
    if (k === 'market' && day % 3 === 2 && st.metBoy === undefined) st.metBoy = day;
    openEvent(dayOf(lagosSay(`${k}.${day % 3}`), k === 'market' ? crayfishLane(st) : []));
  } });
  const below = belowLane(st, planet)[0], key = BELOW[Math.floor(day / BELOW_EVERY) % BELOW.length], f = below && portLayout(planet).folk.find(x => x.key === key);
  const t = tomasAboard(), parcel = parcelDue(st, t);
  return [
    ...(parcel ? [{ key: 'down:parcel', label: lagosSay('tag.parcel', { first: t.first }), who: t.id, take() {
      const ev = tomasParcelEvent(t);
      openEvent({ ...ev, choices: [{ ...ev.choices[0], run() { pay(); return ev.choices[0].run(); } }, { label: ev.choices[1].label, keep: true, run: () => null }] });  // the fare when it is taken
    } }] : []),
    ...DOWN_LANES.map(lane),
    { key: 'down:work', label: lagosSay('tag.work', { fare }), room: 'well', lift: true, take() { pay(); openEvent(jobStage(downJob(day), 0)); } },
    ...(below ? [{ key: 'down:below', label: lagosSay('tag.below', { first: portFolkPerson(planet, f).first, fare }), room: 'well', lift: true, take() { pay(); openEvent(dayOf(below.run())); } }] : []),
  ];
}

Mods.register({
  id: 'daydown', name: 'Going down to Lagos', builtin: true,
  init(M) {
    M.on('landed', planet => { const st = G.state; if (hired() && boyDue(st, planet)) { st.boyUp = true; offerScene('people', boyEvent(planet)); } });  // among the landing's people
    M.action('goDown', () => {
      const st = G.state, h = hired(), o = !G.dialog && G.mode === 'landed' && downOffer(st, h, currentPlanet());
      if (!o || o.shut) return;
      st.credits -= DOWN_FARE; h.downDay = st.day;
      const t = tomasAboard();
      openEvent(parcelDue(st, t) ? tomasParcelEvent(t) : dayDownEvent());  // Tomas at the lift first, when he has something for his parents
    });
  },
});
