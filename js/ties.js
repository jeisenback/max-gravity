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
  if (ta.aff && ta.aff === tb.aff) d += 0.04;
  if (ta.aff && tb.aff && ta.aff !== tb.aff && (ta.regard[tb.aff] <= -2 || tb.regard[ta.aff] <= -2)) d -= 0.04;
  if (ta.aff && tb.aff && ta.status[ta.aff] === 'exile' && tb.status[tb.aff] === 'exile') d += 0.02;  // two who left under a cloud
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

// The ship is stopped at most once in 120 days at a port, and once in 120 at sea, whoever is aboard.
function customsDue(patrol) { const st = G.state; return !((st.customs || {})[patrol ? 'patrolLast' : 'last'] > st.day - 120); }

// The same stop in flight is a patrol cutter alongside, and `planet` is then only a name for where the crew member is left.
// A crew member leaves the ship, and someone from the dock signs on for the berth.
function signReplacement(p, planet) {
  const st = G.state;
  st.crew = st.crew.filter(id => id !== p.id); p.location = planet.name;
  const rep = makeCrewCandidate(st.systemId); rep.role = p.role; rep.skill = Math.max(1, (p.skill || 1) - 1); rep.job = ROLE_NAMES[p.role] ? ROLE_NAMES[p.role].toLowerCase() : 'hand'; rep.mood = null;
  registerPerson(rep); st.crew.push(rep.id);
  return ` ${rep.first} signs on for the berth.`;
}

function customsScene(gov, planet, patrol) {
  const st = G.state, h = hired(), cap = person(h.captain), p = customsDue(patrol) ? dockPeople(gov, 'wanted')[0] || dockPeople(gov, 'exile')[0] : null;
  if (!p) return null;
  st.customs[patrol ? 'patrolLast' : 'last'] = st.day;
  const officer = patrol && st.crew.map(person).find(q => q && q !== p && tiesOf(q).status[gov] === 'officer');
  const status = tiesOf(p).status[gov], n = p.first, mine = youTies(), papers = mine.aff === gov && ['member', 'officer'].includes(mine.status[gov]);
  (st.customs[`${p.id}:${gov}:${status}`] = st.day);
  const weight = status === 'wanted' ? 0.55 : 0.8;  // an exile is turned back less often than a wanted one is held
  const gone = () => signReplacement(p, planet);
  const choices = [];
  if (officer) choices.push({ label: `[${officer.first}, a ${shortFaction(gov)} officer] Let ${officer.first} answer the hail`, run() { like(officer, 1, `You let me answer a ${shortFaction(gov)} patrol.`); return (
      `${officer.first} takes the open band and gives a rank and a unit. The cutter's captain asks one question, gets the right answer, and does not ` +
      `ask for the crew list.`); } });
  if (papers) choices.push({ label: `[${gov} papers] Vouch for ${n} as a member`, run() { like(p, 2, patrol ? `You vouched for me to a patrol.` : `You vouched for me at customs on ${planet.name}.`); return (
      `You give the officer your papers and say ${n} is signed on the ship's articles. The officer reads the date, stamps the manifest, and does not ` +
      `look at ${n}.`); } });
  choices.push({ label: `Pay the officer (400 cr from the ship's fund)`, ...gated(needFunds(400)), run() { h.fund -= 400; like(cap, -1, `You paid a customs officer from the fund.`); return (
      `The envelope goes across the counter. The officer takes the manifest into the back and brings it out stamped, and the number on it is not the ` +
      `number it was.`); } });
  choices.push({ label: `Say nothing and keep ${n} below`, run() {
    if (Math.random() < weight) return `The officer checks the crew list against the register for ten minutes. The ship is cleared, and ${n} is in the engine room the whole time.`;
    const fine = Math.min(h.fund, 800); h.fund -= fine; like(cap, -1, `A wanted crew member was found aboard.`); like(p, -1, `You kept me aboard and I was found.`);
    if (p.cast) return `They search the ship and find ${n}. The fine is ${fmt(fine)} cr from the ship's fund. ${n} is released at the foot of the ramp, and walks back up it.`;  // a main character does not leave
    return `They search the ship and find ${n}. The fine is ${fmt(fine)} cr from the ship's fund, and ${n} goes ashore under escort.${gone()}`;
  } });
  if (!p.cast) choices.push({
    label: patrol ? `Hand ${n} over to the cutter` : `Put ${n} ashore`,
    run() { like(p, -3, patrol ? `You handed me to a ${shortFaction(gov)} patrol.` : `You put me ashore at customs on ${planet.name}.`);
      for (const id of st.crew) { const q = person(id); if (q && q !== p && q.memories && tiesOf(q).aff === tiesOf(p).aff) like(q, -1, `You ${patrol ? 'handed' :
      'put'} ${n} ${patrol ? 'over to a patrol' : 'ashore at customs'}.`); } return patrol ?
      `${n} goes across in the cutter's launch without a word. The cutter's captain thanks you for your cooperation and breaks off.${gone()}` :
      `${n} takes a bag down the ramp. They do not say anything, and the officer clears the ship.${gone()}`; }
  });
  return {
    title: patrol ? 'A Patrol Cutter' : 'The Customs Officer', personal: true, via: patrol ? 'ship' : 'crew', owner: 'you',
    text: patrol ? (`A ${shortFaction(gov)} patrol cutter matches your course and asks for the crew list. Its captain reads it aloud, slowly, and ` +
        `stops at ${p.first} ${p.last}. ` +
        `"${status === 'wanted' ? `This one is wanted by ${shortFaction(gov)}` : `This one left ${shortFaction(gov)} with a mark against them`}," the ` +
        `captain says, and waits.`) : (
        `The customs officer at ${planet.name} runs the crew list against the ${gov} register and stops at ${p.first} ${p.last}. ` +
        `"${status === 'wanted' ? `This one is wanted by ${shortFaction(gov)}` : `This one left ${shortFaction(gov)} with a mark against them`}," the ` +
        `officer says, and waits.`),
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

// A war between two of the states calls its people home. Crew of either side take it to heart, the two sides get on worse and
// each side better, and a member who asks for leave, or an officer who is recalled, is a scene at the next port.
const warSide = (p, w) => { const a = tiesOf(p).aff; return a === w.a || a === w.b ? a : null; };

function warBonds() {
  const st = G.state, w = factionState().war;
  if (!w || st.warBond === w.start) return;
  st.warBond = w.start;
  for (const [a, b] of pairs(folk().filter(f => f.crew))) {
    const sa = warSide(a.p, w), sb = warSide(b.p, w);
    if (sa && sb) addBond(a, b, sa === sb ? 1 : -2);
  }
}

// Crew who could go: a member or an officer of a side at war, who is not a main character, and not asked this war already.
function warCallable() {
  const st = G.state, w = factionState().war;
  if (!w || (st.warCalled || {}).last > st.day - 15) return [];  // one at a time, and not back to back
  return st.crew.map(person).filter(p => p && !p.cast && warSide(p, w) && ['member', 'officer'].includes(tiesOf(p).status[warSide(p, w)]) && (st.warCalled || {})[p.id] !== w.start);
}

function warCallScene(planet) {
  const st = G.state, w = factionState().war, p = warCallable()[0];
  if (!p) return null;
  (st.warCalled = st.warCalled || {})[p.id] = w.start; st.warCalled.last = st.day;
  const side = warSide(p, w), foe = side === w.a ? w.b : w.a, n = p.first, officer = tiesOf(p).status[side] === 'officer', cap = person(hired().captain);
  const choices = [{ label: `Let ${n} go`, run() {
    like(p, officer ? 1 : 2, `You let me go when ${shortFaction(side)} went to war.`); if (officer) changeRep(side, 3);
    return `${n} shakes every hand aboard and takes a bag down the ramp. ${officer ? `A ${shortFaction(side)} liaison is waiting at the foot of it with orders. ` : ''}${signReplacement(p, planet).trim()}`;
  } }];
  if (officer) choices.push({ label: `Refuse to release ${n}`, run() {
    like(p, -3, `You would not release me when I was recalled.`); changeRep(side, -4);
    return `${n} reads the recall order twice and puts it away. ${n} does not leave. The liaison logs the ship as having obstructed a recall, and ${n} does not speak to you for the rest of the watch.`;
  } });
  else choices.push({ label: `Ask ${n} to stay`, run() {
    if (p.opinion >= OPINION.CLOSE) { like(p, 1, `You asked me to stay and I did, because of you.`); return `${n} thinks about it for a long minute. "I would rather be here," ${n} says, and means it. It is not the same as being glad.`; }
    like(p, -2, `You asked me to stay when my people were at war.`);
    return `${n} hears you out and goes anyway, because it is not the sort of thing a person can be talked out of. ${signReplacement(p, planet).trim()}`;
  } });
  return {
    title: 'Word From Home', personal: true, via: 'crew', owner: 'you',
    text: officer ? (`A courier from the ${shortFaction(side).replace('the ', '')} navy is waiting at the foot of the ramp on ${planet.name} with a ` +
        `recall for ${p.first} ${p.last}. The ${shortFaction(side).replace('the ', '')} are at war with the ${shortFaction(foe).replace('the ', '')}, ` +
        `and an officer's leave is over. Captain ${cap.last} says it is your call.`) : (
        `${p.first} has been at the news feed in the galley since the war began between the ${shortFaction(side).replace('the ', '')} and ` +
        `the ${shortFaction(foe).replace('the ', '')}. At ${planet.name} ${p.first} finds you. "My people are in it," ${p.first} says. "I would like ` +
        `to go home and see if I can help. I will understand if you say no."`),
    choices,
  };
}

Mods.register({
  id: 'ties', name: 'Faction ties', builtin: true,
  init(M) {
    M.on('newDay', warBonds);
    M.filter('happenings', (list, where, planet) => {
      if (!hired() || G.state.day - hired().since < 3) return list;
      if (where === 'port' && planet && warCallable().length) list = list.concat({ tier: 1, weight: 4, via: 'crew', make: () => warCallScene(planet) });
      if (where === 'transit' && G.transit) {  // a patrol stops a burn in or out of a faction's space
        const to = SYSTEMS[G.transit.to], gov = [to.gov, system().gov].find(g => isFaction(g) && g !== 'Pirate' && dockPeople(g, 'wanted').concat(dockPeople(g, 'exile')).length);
        if (gov && customsDue(true)) list = list.concat({ tier: 1, weight: 3, via: 'ship', make: () => customsScene(gov, to, true) });
        return list;
      }
      if (where !== 'port' || !planet) return list;
      const gov = system().gov;
      if (!isFaction(gov) || gov === 'Pirate') return list;
      const out = [];
      if (customsDue() && (dockPeople(gov, 'wanted').length || dockPeople(gov, 'exile').length)) out.push({ tier: 1, weight: 4, via: 'crew', make: () => customsScene(gov, planet) });
      if (dockPeople(gov, 'officer').length) out.push({ tier: 1, weight: 2, via: 'crew', make: () => dockFriendScene(gov, planet) });
      return list.concat(out);
    });
  },
});
