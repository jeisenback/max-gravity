'use strict';

// Faction ties: whom each person belongs to (FACTIONS, data.js), their status in it, and what they think of each faction.
// Ties are drawn from the person's id and culture, so nothing is rolled and no save changes, unless TIE_NOTES says
// otherwise (the main characters). tiesOf(p) is { aff, status: { faction: word }, regard: { faction: -3..3 } }.
// They matter in four places: how the crew get on (social.js bondDay), how the crew take what you do (changeRep in
// factions.js), what a port makes of who is aboard (customs below), and your own papers (youTies). Loaded after stakes.js.

const CULTURE_FACTION = { earth: 'Arcology Compact', mars: 'Dome Concord', belt: 'Charter League' };
const FACTION_COOL = { 'Arcology Compact': { 'Charter League': -1 }, 'Dome Concord': { 'Charter League': -1 }, 'Charter League': { 'Arcology Compact': -1, 'Dome Concord': -1 } };
const TIE_NOTES = {
  ines: { aff: 'Arcology Compact', status: { 'Arcology Compact': 'exile' } },  // her license, lost over one landing
  tomas: { aff: 'Arcology Compact', status: { 'Arcology Compact': 'member' } },
  yelena: { aff: 'Dome Concord', status: { 'Dome Concord': 'member' } },
  ruben: { aff: 'Dome Concord', status: { 'Dome Concord': 'officer' } },
  bexa: { aff: 'Charter League', status: { 'Charter League': 'member' } },
  pax: { aff: 'Charter League', status: { 'Charter League': 'member' } },
};
const shortFaction = f => (f === 'Pirate' ? 'the pirates' : `the ${f.replace(/^(Arcology|Dome|Charter) /, '')}`);

function tiesOf(p) {
  const id = String(p.id || p.name || `${p.first || ''}${p.last || ''}` || 'x'), h = s => Math.abs(hash(id + s)), note = TIE_NOTES[p.cast || p.captainKey];
  const culture = p.culture || cultureOfPerson(p), home = CULTURE_FACTION[culture] || 'Arcology Compact';
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
  const st = G.state, aff = CULTURE_FACTION[(BACKGROUNDS[st.background] || {}).culture || st.background] || 'Arcology Compact';
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
  const n = Math.abs(amount) >= 10 ? 2 : 1, deed = sceneSay('scene:customs', amount > 0 ? 'reacts.for.memory' : 'reacts.against.memory', { faction: shortFaction(gov) });
  for (const id of G.state.crew) {
    const p = person(id);
    if (!p || !p.memories) continue;
    const r = tiesOf(p).regard[gov];
    if (r && Math.abs(r) >= 1) like(p, Math.sign(amount) * Math.sign(r) * n, deed);
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
// A crew member leaves the ship, and someone from the dock signs on for the berth. The words are the lines of scene:customs (hiredscenes.js).
function signReplacement(p, planet) {
  const st = G.state;
  st.crew = st.crew.filter(id => id !== p.id); p.location = planet.name;
  const rep = makeCrewCandidate(st.systemId); rep.role = p.role; rep.skill = Math.max(1, (p.skill || 1) - 1); rep.job = ROLE_NAMES[p.role] ? ROLE_NAMES[p.role].toLowerCase() : 'hand'; rep.mood = null;
  registerPerson(rep); st.crew.push(rep.id);
  return ` ${sceneSay('scene:customs', 'signs', { first: rep.first })}`;
}

// The crew member a faction wants, if any: a wanted one before an exile.
const wantedAboard = gov => dockPeople(gov, 'wanted')[0] || dockPeople(gov, 'exile')[0] || null;
// A stop is counted when it plays: the ship is not stopped again for 120 days, nor this person for 60.
function markStop(p, gov, patrol) {
  const st = G.state;
  st.customs[patrol ? 'patrolLast' : 'last'] = st.day;
  st.customs[`${p.id}:${gov}:${tiesOf(p).status[gov]}`] = st.day;
}

// The lieutenant of a patrol cutter asks one question before the crew list is read (#653). Each faction has two to ask (A: the articles and the date of the last
// landing, S: the cargo seals, W: who signed the person on and where), the first on a first stop and then whichever it did not ask last. `met` is what the journal
// (st.customs.met) holds of the last stop with that faction: { q, answer, day }. The words are the `key` lines of scene:customs (hiredscenes.js).
const PATROL_LT = {
  'Arcology Compact': { key: 'compact', asks: ['S', 'W'] },
  'Dome Concord': { key: 'concord', asks: ['W', 'A'] },
  'Charter League': { key: 'charter', asks: ['A', 'S'] },
};
const lieutenantQuestion = (met, gov) => met ? PATROL_LT[gov].asks.find(q => q !== met.q) : PATROL_LT[gov].asks[0];
const lieutenantName = gov => PATROL_LT[gov] ? sceneSay('scene:customs', `${PATROL_LT[gov].key}.name`) : '';

// The question, and three answers. Straight lifts the faction's regard, a gap makes saying nothing clear less often, and "Who's asking?" is a bold call at the
// hand's post: it ends the stop, or goes the way a gap does and costs a little regard. Every answer but the win goes on to the stop itself (customsScene).
function lieutenantScene(gov, planet) {
  const st = G.state, lt = PATROL_LT[gov], p = lt && customsDue(true) ? wantedAboard(gov) : null;
  if (!p) return null;
  const met = (st.customs.met || {})[gov], q = lieutenantQuestion(met, gov), key = lt.key;
  const say = (k, vars) => sceneSay('scene:customs', k, { n: p.first, faction: shortFaction(gov), lt: lieutenantName(gov), ...vars });
  const asked = answer => { (st.customs.met = st.customs.met || {})[gov] = { q, answer, day: st.day }; };
  const goOn = shade => { G.nextEvent = customsScene(gov, planet, true, shade); };
  return {
    title: say('title.patrol'), personal: true, via: 'ship', owner: 'you',
    text: `${met ? say(`${key}.again`, { recall: say(`${key}.recall.${met.answer}`) }) : say(`${key}.intro`)} ${say(`${key}.q.${q}`)}`,
    choices: [
      { label: say('ask.straight.label'), run() { asked('straight'); changeRep(gov, 1); goOn(0); return say(`${key}.straight`); } },
      { label: say('ask.gap.label'), run() { asked('gap'); goOn(0.2); return say(`${key}.gap`); } },
      { label: `${say('ask.asking.label')} [if it fails: the stop goes worse, and the captain marks it]`, bold: true, run() {
        const won = Math.random() < soloOdds(hired().post);
        boldWithCaptain(won);  // the captain's nerve (captains.js)
        if (won) { asked('asking.win'); markStop(p, gov, true); return say(`${key}.asking.win`); }
        asked('asking.lose'); changeRep(gov, -1); goOn(0.2); return say(`${key}.asking.lose`);
      } },
    ],
  };
}

// `shade` is how much a gap in the lieutenant's question takes off the chance that saying nothing clears.
function customsScene(gov, planet, patrol, shade = 0) {
  const st = G.state, h = hired(), cap = person(h.captain), p = customsDue(patrol) ? wantedAboard(gov) : null;
  if (!p) return null;
  markStop(p, gov, patrol);
  const officer = patrol && st.crew.map(person).find(q => q && q !== p && tiesOf(q).status[gov] === 'officer');
  const status = tiesOf(p).status[gov], n = p.first, mine = youTies(), papers = mine.aff === gov && ['member', 'officer'].includes(mine.status[gov]);
  const weight = (status === 'wanted' ? 0.55 : 0.8) - shade;  // an exile is turned back less often than a wanted one is held
  const gone = () => signReplacement(p, planet);
  const faction = shortFaction(gov), say = (key, vars) => sceneSay('scene:customs', key, { n, faction, gov, planet: planet.name, first: p.first, last: p.last, lt: lieutenantName(gov), ...vars });
  const choices = [], k = (key, vars) => say(patrol ? key.replace('.', '.patrol.') : key, vars);  // the patrol's own words for a key that names the dock
  if (officer) choices.push({ label: say('officer.label', { officer: officer.first }), run() { like(officer, 1, say('officer.memory')); return say('officer.result', { officer: officer.first }); } });
  if (papers) choices.push({ label: say('papers.label'), run() { like(p, 2, say(patrol ? 'papers.patrol.memory' : 'papers.memory')); return k('papers.result'); } });
  choices.push({ label: say('pay.label'), ...gated(needFunds(400)), run() { h.fund -= 400; like(cap, -1, say('pay.memory')); return k('pay.result'); } });
  choices.push({ label: say('silent.label'), run() {
    if (Math.random() < weight) return k('silent.clear');
    const fine = Math.min(h.fund, 800); h.fund -= fine; like(cap, -1, say('silent.captain.memory')); like(p, -1, say('silent.memory')); changeRep(gov, -2);
    if (p.cast) return k('silent.stay', { fine: fmt(fine) });  // a main character does not leave
    return k('silent.gone', { fine: fmt(fine) }) + gone();
  } });
  if (patrol && h.post === 'gunner' && skillLevel('gunner') >= 2) choices.push({  // the guns answer the hail: a lock on the cutter, and a fine if it does not back down
    label: `${say('gunner.label')} [if it fails: a fine${p.cast ? '' : ', and the patrol takes them'}]`, bold: true,
    run() {
      const won = Math.random() < soloOdds('gunner');
      boldWithCaptain(won);  // the captain's nerve (captains.js)
      if (won) { like(p, 1, say('gunner.memory')); changeRep(gov, -1); return say('gunner.win'); }
      const fine = Math.min(h.fund, 800); h.fund -= fine; like(cap, -1, say('gunner.lose.memory')); changeRep(gov, -2);
      const lost = say('gunner.lose', { fine: fmt(fine) });
      return p.cast ? lost + say('gunner.lose.stay') : lost + say('gunner.lose.gone') + gone();
    },
  });
  if (!p.cast) choices.push({
    label: say(patrol ? 'hand.label' : 'ashore.label'),
    run() { like(p, -3, say(patrol ? 'hand.memory' : 'ashore.memory')); changeRep(gov, patrol ? 2 : 1);
      for (const id of st.crew) { const q = person(id); if (q && q !== p && q.memories && tiesOf(q).aff === tiesOf(p).aff) like(q, -1, say(patrol ? 'hand.others.memory' : 'ashore.others.memory')); }
      return say(patrol ? 'hand.result' : 'ashore.result') + gone(); }
  });
  return {
    title: say(patrol ? 'title.patrol' : 'title'), personal: true, via: patrol ? 'ship' : 'crew', owner: 'you',
    text: say(patrol ? 'text.patrol' : 'text', { charge: say(status === 'wanted' ? 'charge.wanted' : 'charge.exile') }),
    choices,
  };
}

function dockFriendScene(gov, planet) {
  const st = G.state, h = hired(), p = dockPeople(gov, 'officer')[0];
  if (!p) return null;
  st.customs[`${p.id}:${gov}:officer`] = st.day;
  const say = (key, vars) => sceneSay('scene:dock-friend', key, { n: p.first, planet: planet.name, faction: shortFaction(gov), ...vars });
  return {
    title: say('title'), personal: true, via: 'crew', owner: 'you',
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() { h.fund += 150; like(p, 1, say('c0.memory')); return say('c0.result'); } },
      { label: say('c1.label'), run() { like(p, 1, say('c1.memory')); return say('c1.result'); } },
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
  const bare = f => shortFaction(f).replace('the ', '');
  const say = (key, vars) => sceneSay('scene:war-call', key, { n, faction: shortFaction(side), side: bare(side), foe: bare(foe), planet: planet.name, first: p.first, last: p.last, cap: cap.last, ...vars });
  const choices = [{ label: say('go.label'), run() {
    like(p, officer ? 1 : 2, say('go.memory')); if (officer) changeRep(side, 3);
    return `${say('go.result')} ${officer ? `${say('go.liaison')} ` : ''}${signReplacement(p, planet).trim()}`;
  } }];
  if (officer) choices.push({ label: say('refuse.label'), run() {
    like(p, -3, say('refuse.memory')); changeRep(side, -4);
    return say('refuse.result');
  } });
  else choices.push({ label: say('stay.label'), run() {
    if (p.opinion >= OPINION.CLOSE) { like(p, 1, say('stay.close.memory')); return say('stay.close'); }
    like(p, -2, say('stay.far.memory'));
    return `${say('stay.far')} ${signReplacement(p, planet).trim()}`;
  } });
  return { title: say('title'), personal: true, via: 'crew', owner: 'you', text: say(officer ? 'text.officer' : 'text.member'), choices };
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
        if (gov && customsDue(true)) list = list.concat({ tier: 1, weight: 3, via: 'ship', make: () => lieutenantScene(gov, to) });
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
