'use strict';

// Faction ties: whom each person belongs to (FACTIONS, data.js), their status in it, and what they think of each faction.
// Ties are drawn from the person's id and culture, so nothing is rolled and no save changes, unless TIE_NOTES says
// otherwise (the main characters). tiesOf(p) is { aff, status: { faction: word }, regard: { faction: -3..3 } }.
// They matter in four places: how the crew get on (social.js bondDay), how the crew take what you do (changeRep in
// factions.js), what a port makes of who is aboard (customs below), and your own papers (youTies). Loaded after stakes.js.

const CULTURE_FACTION = { earth: 'Earth Coalition', mars: 'Mars Republic', belt: 'Belt Collective' };
const FACTION_COOL = { 'Earth Coalition': { 'Belt Collective': -1 }, 'Mars Republic': { 'Belt Collective': -1 }, 'Belt Collective': { 'Earth Coalition': -1, 'Mars Republic': -1 } };
const TIE_NOTES = {
  ines: { aff: 'Earth Coalition', status: { 'Earth Coalition': 'exile' } },  // her license, lost over one landing
  tomas: { aff: 'Earth Coalition', status: { 'Earth Coalition': 'member' } },
  yelena: { aff: 'Mars Republic', status: { 'Mars Republic': 'member' } },
  ruben: { aff: 'Mars Republic', status: { 'Mars Republic': 'officer' } },
  bexa: { aff: 'Belt Collective', status: { 'Belt Collective': 'member' } },
  pax: { aff: 'Belt Collective', status: { 'Belt Collective': 'member' } },
};
const shortFaction = f => (f === 'Pirate' ? 'the pirates' : `the ${f.replace(/^(Earth|Mars|Belt) /, '')}`);

function tiesOf(p) {
  const id = String(p.id || p.name || `${p.first || ''}${p.last || ''}` || 'x'), h = s => Math.abs(hash(id + s)), note = TIE_NOTES[p.cast || p.captainKey];
  const culture = p.culture || (typeof cultureOfPerson === 'function' ? cultureOfPerson(p) : 'earth'), home = CULTURE_FACTION[culture] || 'Earth Coalition';
  const others = FACTIONS.filter(f => f !== home && f !== 'Pirate'), roll = h('aff') % 100;
  const aff = note ? note.aff : roll < 70 ? home : roll < 82 ? others[h('other') % others.length] : roll < 90 ? 'Pirate' : null;
  const status = note ? { ...note.status } : {};
  if (aff && !status[aff]) { const s = h('st') % 100; status[aff] = s < 65 ? 'member' : s < 77 ? 'officer' : s < 92 ? 'exile' : 'wanted'; }
  if (h('w') % 100 < 8) { const f = FACTIONS.filter(x => x !== aff)[h('wf') % (FACTIONS.length - 1)]; if (f && !status[f]) status[f] = 'wanted'; }
  const regard = {};
  for (const f of FACTIONS) {
    let r = f === aff ? (status[f] === 'exile' ? -1 : status[f] === 'wanted' ? -2 : 2) : aff === 'Pirate' ? -1 : f === 'Pirate' ? -2 : ((FACTION_COOL[aff] || {})[f] || 0);
    if (status[f] === 'wanted' && f !== aff) r -= 1;  // they are hunted by it
    regard[f] = Math.max(-3, Math.min(3, r + (h(f) % 3) - 1));
  }
  return { aff, status, regard };
}
const regardWord = n => (n >= 2 ? 'loyal' : n === 1 ? 'warm' : n === 0 ? 'neutral' : n === -1 ? 'cool' : 'hostile');

// You: your background's faction, a member, with your standing as the factions' regard for you (factions.js).
function youTies() {
  const st = G.state, aff = CULTURE_FACTION[(BACKGROUNDS[st.background] || {}).culture || st.background] || 'Earth Coalition';
  return { aff, status: { [aff]: 'member' }, standing: Object.fromEntries(FACTIONS.map(f => [f, standingWord(repOf(f))])) };
}

// Two people's pull on each other, per day aboard: the same faction draws them together, a faction one holds against the other's pushes them apart.
function factionPull(a, b) {
  const ta = tiesOf(a), tb = tiesOf(b);
  let d = 0;
  if (ta.aff && ta.aff === tb.aff) d += 0.06;
  if (ta.aff && tb.aff && ta.aff !== tb.aff && (ta.regard[tb.aff] <= -2 || tb.regard[ta.aff] <= -2)) d -= 0.1;
  if (ta.aff && tb.aff && ta.status[ta.aff] === 'exile' && tb.status[tb.aff] === 'exile') d += 0.04;  // two who left under a cloud
  return d;
}
// Why, for the person page.
function factionReason(a, b) {
  const ta = tiesOf(a), tb = tiesOf(b);
  if (ta.aff && ta.aff === tb.aff) return `both ${shortFaction(ta.aff).replace('the ', '')}`;
  if (ta.aff && tb.aff && (ta.regard[tb.aff] <= -2 || tb.regard[ta.aff] <= -2)) return `${shortFaction(ta.aff).replace('the ', '')} and ${shortFaction(tb.aff).replace('the ', '')} do not mix`;
  return '';
}

// What you do with a faction changes what the crew think of you, by what each of them thinks of it.
function crewReacts(gov, amount) {
  if (!amount || Math.abs(amount) < 3 || !G.state.crew) return;
  const n = Math.abs(amount) >= 10 ? 2 : 1, deed = amount > 0 ? `stood with ${shortFaction(gov)}` : `set yourself against ${shortFaction(gov)}`;
  for (const id of G.state.crew) {
    const p = person(id);
    if (!p || !p.memories) continue;
    const r = tiesOf(p).regard[gov];
    if (r && Math.abs(r) >= 1) like(p, Math.sign(amount) * Math.sign(r) * n, `You ${deed}.`);
  }
}

// At a port in a faction's space: a crew member that faction wants is a customs matter, and one of its officers has a friend on the dock.
// Once for each person in a faction's space in sixty days.
function dockPeople(gov, status) {
  const st = G.state, seen = st.customs = st.customs || {};
  return st.crew.map(person).filter(p => p && tiesOf(p).status[gov] === status && !(seen[`${p.id}:${gov}:${status}`] > st.day - 60));
}

// The ship is stopped at most once in 120 days, whoever is aboard.
function customsDue() { const st = G.state; return !((st.customs || {}).last > st.day - 120); }

function customsScene(gov, planet) {
  const st = G.state, h = hired(), cap = person(h.captain), p = customsDue() ? dockPeople(gov, 'wanted')[0] || dockPeople(gov, 'exile')[0] : null;
  if (!p) return null;
  st.customs.last = st.day;
  const status = tiesOf(p).status[gov], n = p.first, mine = youTies(), papers = mine.aff === gov && ['member', 'officer'].includes(mine.status[gov]);
  (st.customs[`${p.id}:${gov}:${status}`] = st.day);
  const weight = status === 'wanted' ? 0.55 : 0.8;  // an exile is turned back less often than a wanted one is held
  const gone = () => {
    st.crew = st.crew.filter(id => id !== p.id); p.location = planet.name;
    const rep = makeCrewCandidate(st.systemId); rep.role = p.role; rep.skill = Math.max(1, (p.skill || 1) - 1); rep.job = ROLE_NAMES[p.role] ? ROLE_NAMES[p.role].toLowerCase() : 'hand'; rep.mood = null;
    registerPerson(rep); st.crew.push(rep.id);
    return ` ${rep.first} signs on for the berth.`;
  };
  const choices = [];
  if (papers) choices.push({ label: `[${gov} papers] Vouch for ${n} as a member`, run() { like(p, 2, `You vouched for me at customs on ${planet.name}.`); return `You give the officer your papers and say ${n} is signed on the ship's articles. The officer reads the date, stamps the manifest, and does not look at ${n}.`; } });
  choices.push({ label: `Pay the officer (400 cr from the ship's fund)`, can: () => h.fund >= 400, run() { h.fund -= 400; like(cap, -1, `You paid a customs officer from the fund.`); return `The envelope goes across the counter. The officer takes the manifest into the back and brings it out stamped, and the number on it is not the number it was.`; } });
  choices.push({ label: `Say nothing and keep ${n} below`, run() {
    if (Math.random() < weight) return `The officer checks the crew list against the register for ten minutes. The ship is cleared, and ${n} is in the engine room the whole time.`;
    const fine = Math.min(h.fund, 800); h.fund -= fine; like(cap, -1, `A wanted crew member was found aboard.`); like(p, -1, `You kept me aboard and I was found.`);
    if (p.cast) return `They search the ship and find ${n}. The fine is ${fmt(fine)} cr from the ship's fund. ${n} is released at the foot of the ramp, and walks back up it.`;  // a main character does not leave
    return `They search the ship and find ${n}. The fine is ${fmt(fine)} cr from the ship's fund, and ${n} goes ashore under escort.${gone()}`;
  } });
  if (!p.cast) choices.push({ label: `Put ${n} ashore`, run() { like(p, -3, `You put me ashore at customs on ${planet.name}.`); for (const id of st.crew) { const q = person(id); if (q && q !== p && q.memories && tiesOf(q).aff === tiesOf(p).aff) like(q, -1, `You put ${n} ashore at customs.`); } return `${n} takes a bag down the ramp. They do not say anything, and the officer clears the ship.${gone()}`; } });
  return {
    title: 'The Customs Officer', personal: true, via: 'crew', owner: 'you',
    text: `The customs officer at ${planet.name} runs the crew list against the ${gov} register and stops at ${p.first} ${p.last}. "${status === 'wanted' ? `This one is wanted by ${shortFaction(gov)}` : `This one left ${shortFaction(gov)} with a mark against them`}," the officer says, and waits.`,
    choices,
  };
}

function dockFriendScene(gov, planet) {
  const st = G.state, h = hired(), p = dockPeople(gov, 'officer')[0];
  if (!p) return null;
  st.customs[`${p.id}:${gov}:officer`] = st.day;
  const n = p.first;
  return {
    title: 'A Friend at the Dock', personal: true, via: 'crew', owner: 'you',
    text: `${n} stops at the foot of the ramp. The harbor master at ${planet.name} is in ${shortFaction(gov)}'s uniform, and served under ${n} once. They are shaking hands. "${n} says you can have the berth at the old rate," the harbor master says to you, "if ${n} asks."`,
    choices: [
      { label: `Let ${n} ask`, run() { h.fund += 150; like(p, 1, `You let me call in a favor at ${planet.name}.`); return `${n} asks. The harbor master writes a lower number on the berth slip. It saves the fund 150 cr, and ${n} is quiet about it for the rest of the watch.`; } },
      { label: 'Pay the full rate', run() { like(p, 1, `You would not use my old unit's name.`); return `You pay the full rate. ${n} nods and says nothing.`; } },
    ],
  };
}

Mods.register({
  id: 'ties', name: 'Faction ties', builtin: true,
  init(M) {
    M.filter('happenings', (list, where, planet) => {
      if (!hired() || where !== 'port' || !planet || G.state.day - hired().since < 3) return list;
      const gov = system().gov;
      if (!isFaction(gov) || gov === 'Pirate') return list;
      const out = [];
      if (customsDue() && (dockPeople(gov, 'wanted').length || dockPeople(gov, 'exile').length)) out.push({ tier: 1, weight: 4, via: 'crew', make: () => customsScene(gov, planet) });
      if (dockPeople(gov, 'officer').length) out.push({ tier: 1, weight: 2, via: 'crew', make: () => dockFriendScene(gov, planet) });
      return list.concat(out);
    });
  },
});
