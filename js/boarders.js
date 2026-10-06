'use strict';

// Repelling boarders: the authored fight for a hired hand when a boarding run lands in the ship duel (duel.js). Three
// places, the lock, the corridor and the bridge, and a track between them. Each exchange you choose a tactic (hold beats
// go-round, rush beats hold, go-round beats rush) or do the job of your own post. Winning an exchange pushes them back a
// place and losing it lets them in a place; out of the lock and they are repelled, onto the bridge and they have the ship.
// Casualties come with it: someone is hurt (an injured hand's perk stops until treated, and a hurt hand works a level
// lower), and one who is hurt twice in a fight is dead if generated, or marked if a main character (fate.js). Loaded
// after duel.js; only called into at runtime. The same fight, run the other way, is boarding a ship you have crippled
// (engagements.js): the choices are the same and a win carries her bridge instead of holding yours (assault, below).

const REPEL_TITLES = ['The Lock', 'The Corridor', 'The Bridge'];
const REPEL_OPENINGS = [
  [`The outer lock is cycling from the outside. The inner door has a thin bright seam in it where a cutter is working. Everyone who can be here is here, behind the closer, and the captain's voice on the intercom says to hold it.`,
    `Something hits the hull aft and the deck rings. The lock indicator goes amber, then red. Through the inner window there are three suits in the lock and a fourth coming.`],
  [`They are through the lock. It is eleven meters from there to the galley hatch, with the berth doors on one side and the cargo bay on the other. The air handler is running flat out and the lights are off at the lock end.`,
    `The lock door is down and the corridor is theirs as far as the first berth door. Somebody is firing from the bay. The deck smells of cut metal.`],
  [`The last hatch before the bridge is the one the captain closed by hand. They are working at it from the other side. The pilot has the helm and has not looked round.`,
    `There is one door left, and the closer on it is hissing. Behind it, the bridge. In front of it, everyone still standing.`],
];
const REPEL_TACTICS = {
  hold: { label: 'Hold the line', beats: 'flank',
    win: 'You hold the line. The first one through takes the closer in the face and goes back out, and the others do not come again for a minute.',
    lose: 'The line does not hold. They come through two at a time, and you are pushed back a section.' },
  rush: { label: 'Rush them', beats: 'hold',
    win: 'You go in low, all together, before they have set themselves. They break at the first contact and go back the way they came.',
    lose: 'You rush and they are ready. A gun goes off in the corridor, too close, and you fall back with fewer than you went in with.' },
  flank: { label: 'Go round them', beats: 'rush',
    win: 'You go through the cargo bay and come out on their side. They turn too late, and the line goes back.',
    lose: 'You go round and find nobody there. When you come back they are two meters further in.' },
};
const REPEL_TIE = 'Neither side gives. The air handler runs, somebody coughs, and the fighting goes on in the same place.';
const REPEL_POST = {
  gunner: { label: 'Fire down the line', win: 'You put three rounds down the line at the seam, one at a time, and the ones in front go down across the ones behind. They go back toward the lock.', lose: 'You fire, and the round goes through a berth door. They use the noise and come a section deeper.' },
  engineer: { label: 'Seal the bulkhead behind them', win: 'You close the section bulkhead by hand, behind the front of them, and run the lock cutter to overload. The hull groans. They are on the wrong side of the ship.', lose: 'The bulkhead jams a hand short of shut. They use the gap.' },
  pilot: { label: 'Roll the ship', win: 'You roll the ship thirty degrees, hard. The boarders, in their suits, go into the corridor wall. The crew were braced, and go the other way.', lose: 'You roll, and your own people are not braced either. The boarders come up first.' },
  comms: { label: 'Lock the doors from the console', win: 'You lock every door between them and the bridge from the console, then open the one that leads back to the lock. They follow the open door.', lose: 'You lock the wrong door. It is the one behind you.' },
};
// Boarding her: the same three places from the other side, so a win here is a place gained. The post lines are the job of your
// post in the assault.
const ASSAULT_TITLES = ['Her Bridge', 'Her Corridor', 'Her Lock'];
const ASSAULT_OPENINGS = [
  [`The last hatch before her bridge has a wheel on it, and somebody on the other side is holding the wheel. Her pilot is a name on a transponder. Behind you the air handler is running, and the captain's voice on the intercom says to go.`,
    `There is one door left. It is thin, and the light under it moves. Whatever is on her bridge has heard you coming for some time.`],
  [`You are in through her lock. It is a corridor like yours, with the berth doors the wrong way round and a smell of fried oil and old smoke. Somebody is behind a crate at the far end, and somebody else is calling to them.`,
    `Her corridor is dark and the deck is tilted a few degrees, because her gravity plates are out. They are at the galley hatch. You can hear a gun being checked.`],
  [`The cutter has bitten through her outer lock and the inner door is open a hand's width. It is dark inside. A light comes on, and something small and metal skips across the deck toward you.`,
    `Her lock is wide open and empty, and nobody has fired. That is the part that bothers you. Beyond the inner door there is a corridor, and in the corridor somebody is waiting.`],
];
const ASSAULT_TACTICS = {
  hold: { label: 'Cover and advance', beats: 'flank',
    win: 'You go along the wall in pairs, one covering and one moving. They cannot find a gap in it, and you are a section further in.',
    lose: 'You go along the wall and they have it covered from two sides. You come back to where you started, with fewer than you went with.' },
  rush: { label: 'Rush them', beats: 'hold',
    win: 'You go in low and fast, all together. They are not set, and the first of them breaks and the rest follow.',
    lose: 'You rush and they are set. A gun goes off in the corridor, too close, and you fall back a section.' },
  flank: { label: 'Go round them', beats: 'rush',
    win: 'You go through her cargo bay and come out behind them. They turn too late, and you take the section.',
    lose: 'You go round and find a bulkhead where her plan said there was a door. When you come back they have moved up.' },
};
const ASSAULT_POST = {
  gunner: { label: 'Put fire down the corridor', win: 'You put three rounds down the corridor at the crate, one at a time. The one behind it stops firing and the others pull back.', lose: 'You fire, and the rounds go into the deck. They use the noise to move up.' },
  engineer: { label: 'Cut her power', win: 'You find her breaker panel by the lock and pull it. Every light in the section goes out, and you have your helmet lamps and they do not.', lose: 'You pull the wrong breaker and her emergency lights come on instead, all of them, in your eyes.' },
  pilot: { label: 'Bring the ship round to her hatch', win: 'You take the cutter along her side to the hatch by the bridge. The crew go out of the second lock behind them and the corridor is a pincer.', lose: 'You bring her round and misjudge it by a meter. The hull scrapes and the crew in the lock go over like skittles.' },
  comms: { label: 'Take her intercom', win: 'You find her intercom and put the captain on it, calmly, telling her people the ship is lost and the lock is open. Some of them go.', lose: 'You find her intercom and it is a recording, which says something unrepeatable about your mother.' },
};

const REPEL_LEAN = { pirate: { rush: 0.5, hold: 0.2, flank: 0.3 }, patrol: { hold: 0.5, rush: 0.2, flank: 0.3 } };
const REPEL_HURT = { lose: 0.45, win: 0.15 };  // the chance someone is hurt in an exchange, by how it went

const repelSet = s => (s.assault ? { titles: ASSAULT_TITLES, openings: ASSAULT_OPENINGS, tactics: ASSAULT_TACTICS, post: ASSAULT_POST } : { titles: REPEL_TITLES, openings: REPEL_OPENINGS, tactics: REPEL_TACTICS, post: REPEL_POST });

const handHurt = () => !!(hired() && hired().hurtUntil > G.state.day);

// Who stands with you. A crew member who cannot stand you keeps to their berth, and of two who are at each other's throats
// (the bond at which a split is on the cards, stakes.js) the one who thinks less of you will not stand in the same section.
// A crew member close to you covers you: the first hit that would have been yours is theirs.
function repelCrew() {
  const st = G.state, ids = st.crew.filter(id => !(st.injured || {})[id]), held = new Map(), fighters = ids.map(id => ({ id, p: person(id) })).filter(f => f.p);
  for (const f of fighters) if (f.p.opinion <= OPINION.ENEMY) held.set(f.id, `${f.p.first} will not fight for you.`);
  const live = fighters.filter(f => !held.has(f.id));
  for (const [a, b] of pairs(live)) {
    if (held.has(a.id) || held.has(b.id) || bond(a, b) > SPLIT_BOND) continue;
    const [out, stays] = a.p.opinion <= b.p.opinion ? [a, b] : [b, a];
    held.set(out.id, `${out.p.first} will not stand in the same section as ${stays.p.first}.`);
  }
  return { fight: fighters.filter(f => !held.has(f.id)).map(f => f.id), held: [...held.values()] };
}

// The fight: where they are (0 the lock, 1 the corridor, 2 the bridge), how many they are, who is hurt and who has fallen.
function repelStart(d, outcome) {
  const crew = FOE_CREW[d.foe.shipId] || 3, w = repelCrew();
  return { d, pos: outcome === 'full' ? 1 : 0, boarders: boardersFor(d.foe, outcome, d), grade: d.grade || 0, base: Math.min(6, w.fight.length + 1), held: w.held, hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0, lines: [] };
}
const repelStanding = s => Math.max(1, s.base - s.hurt.size - s.dead.length);

function repelEvent(d, outcome) { return repelScene(repelStart(d, outcome)); }

// Boarding a crippled ship: her people hold the middle, and you are a section in.
function assaultStart(foe, rate = {}) {
  const w = repelCrew();
  captainFlag('raided');  // kept for the goodbye (captains.js)
  return { d: { foe, foeHp: 0 }, assault: true, pos: 1, boarders: boardersFor(foe, 'full', rate), grade: rate.grade || 0, base: Math.min(6, w.fight.length + 1), held: w.held, hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0, lines: [] };
}

function repelScene(s) {
  const h = hired(), post = h.post, set = repelSet(s), spec = set.post[post];
  const choices = Object.entries(set.tactics).map(([k, t]) => ({ label: t.label, run: () => repelStep(s, k) }));
  choices.push({ label: `[${POSTS[post].name}] ${spec.label}`, run: () => repelStep(s, 'post') });
  return {
    title: set.titles[s.pos], personal: true, via: 'crew',
    text: `${set.openings[s.pos][s.round % 2]}</p><p>${s.assault ? 'Defenders' : 'Boarders'}: ${s.boarders}. With you: ${repelStanding(s) - 1}.${(s.held || []).length ? ` ${s.held.join(' ')}` : ''} ${layoutHint()}`.trim(),
    choices,
  };
}

// One exchange. Returns what happened; sets the next scene, or settles the fight and goes back to the duel.
function repelStep(s, kind) {
  const h = hired(), post = h.post, set = repelSet(s), theirs = kind === 'post' ? null : (CUNNING * (s.grade || 0) > 0 && Math.random() < CUNNING * s.grade ? counterOf(set.tactics, kind) : pickWeighted(foeLean(s)));
  let result, text;  // 'win', 'lose' or 'tie'
  if (kind === 'post') {
    result = Math.random() < Math.min(0.85, 0.5 + 0.1 * skillLevel(post)) ? 'win' : 'lose';
    text = set.post[post][result];
  } else if (kind === theirs) {
    const mine = repelStanding(s);
    result = mine > s.boarders ? 'win' : mine < s.boarders ? 'lose' : 'tie';
    text = result === 'tie' ? REPEL_TIE : set.tactics[kind][result];
  } else {
    result = set.tactics[kind].beats === theirs ? 'win' : 'lose';
    text = set.tactics[kind][result];
  }
  const edge = kind === 'post' ? 0 : layoutEdge(kind);  // the ship you fight in (shipcombat.js)
  if (edge && result !== 'tie' && Math.random() < Math.abs(edge)) {
    const flipped = edge > 0 && result === 'lose' ? 'win' : edge < 0 && result === 'win' ? 'lose' : result;
    if (flipped !== result) { result = flipped; text = set.tactics[kind][result]; }
  }
  if (result === 'win') { s.pos--; if (kind === 'post' && post === 'gunner') s.boarders = Math.max(1, s.boarders - 1); }
  if (result === 'lose') s.pos++;
  s.round++;
  if (result !== 'tie' && Math.random() < REPEL_HURT[result] * (1 + 0.15 * (s.grade || 0))) text += ` ${repelCasualty(s)}`;
  if (s.pos < 0 || s.pos > 2) return `${text} ${repelSettle(s)}`;
  G.nextEvent = repelScene(s);
  return text;
}

const pickWeighted = table => { let r = Math.random() * Object.values(table).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(table)) if ((r -= w) < 0) return k; return Object.keys(table)[0]; };

// The hand is hurt: laid up for a while (a level worse, light duty), longer if already hurt, and with no medic aboard the clinic is on
// their own savings. Used when a crew member is hit (below) and when the hand's own call in a raid goes wrong (engagements.js).
const HAND_CLINIC = 150;
function hurtHand(s) {
  const st = G.state, h = hired(), again = s.youHurt || handHurt();
  h.hurtUntil = st.day + (again ? 18 : 12);
  s.youHurt = true;
  captainFlag('hurt');  // kept for the goodbye (captains.js)
  const bill = roleHolder('medic') ? 0 : Math.min(st.credits, HAND_CLINIC);
  st.credits -= bill;
  const pay = bill ? ` The clinic is ${fmt(bill)} cr of your own, with no medic aboard.` : '';
  return `${again ? 'You are hurt again, and you stay down. It will be some time before you are any use.' : 'You are hurt. For a while your work will be a level worse.'}${pay}`;
}

// Someone goes down. The hand can be hurt but not killed. A crew member hurt twice in one fight is dead, or marked if a main character.
function repelCasualty(s) {
  const st = G.state, pool = [...st.crew.filter(id => !(st.injured || {})[id] || s.hurt.has(id)), 'you'];
  let who = pick(pool), cover = '';
  if (who === 'you' && !s.covered) {  // a friend takes it for you, once in a fight
    const friend = st.crew.map(person).find(c => c && (c.opinion >= OPINION.FRIEND || c.owes) && !(st.injured || {})[c.id] && !s.hurt.has(c.id) && !(s.held || []).some(l => l.startsWith(c.first)));
    if (friend) { who = friend.id; s.covered = true; cover = `${friend.first} pulls you down behind the closer and takes it${friend.owes ? ` ("We are even," ${friend.first} says later)` : ''}. `; delete friend.owes; }
  }
  if (who === 'you') return hurtHand(s);
  const c = person(who);
  if (s.hurt.has(who)) {
    if (c.cast) {
      castFate(c.cast, 'mark', `Hurt twice repelling boarders near ${system().name}.`, 'Carried off the bridge after the boarding.');
      s.marked.push(c);
      return `${c.first} is hit again and does not get up. ${c.first} is alive, and ${c.first} is not fit to work.`;
    }
    loseCrew(c, `Killed repelling boarders near ${system().name}.`);
    s.dead.push(c);
    return `${c.first} is hit again and does not get up.`;
  }
  if (Math.random() < lossOdds(c, true)) {  // a hard hit that does not stop at hurt (losses.js)
    if (loseCrew(c, `Killed repelling boarders near ${system().name}.`) === 'dead') { s.dead.push(c); return `${cover}${c.first} is hit, and does not get up, and will not.`; }
    s.marked.push(c); return `${cover}${c.first} is hit, and carried below, and is alive, and is not fit to work.`;
  }
  (st.injured = st.injured || {})[who] = true;
  s.hurt.add(who);
  return `${cover}${c.first} is hurt.`;
}

// A generated crew member dies: off the crew, on the record, and the berth is offered at the next port.
function killCrew(c) {
  const st = G.state;
  st.crew = st.crew.filter(id => id !== c.id);
  delete (st.injured || {})[c.id];
  c.dead = true;
  (st.fallen = st.fallen || []).push({ name: fullName(c), role: c.role, day: st.day });
  (st.vacancies = st.vacancies || []).push(c.role);
  homeLog(`${c.first} ${c.last} was killed when ${system().name}'s boarders came aboard.`);
}

// How it ends: repelled (the duel goes on with the initiative yours), or the bridge taken (the ship's fund is stripped and they cut loose).
function repelSettle(s) {
  const st = G.state, h = hired(), cap = person(h.captain), d = s.d, repelled = s.pos < 0;
  const lost = s.dead.length ? ` ${listNames(s.dead.map(c => c.first))} ${s.dead.length > 1 ? 'are' : 'is'} dead.` : '';
  if (s.assault) return assaultSettle(s, repelled, lost);
  if (repelled) {
    like(cap, 1, 'You held the ship when boarders came.');
    for (const id of st.crew) { const c = person(id); if (c && !s.hurt.has(id) && s.round >= 3) like(c, 1, 'We held the ship together.'); }
    d.init = 'me';
    G.nextEvent = d.foeHp > 0 ? duelEvent() : null;
    return `The last of them go back through the lock. The outer door closes from the other side, and the drive of the ${theShip(d.foe).replace(/^The /, '')} lights, and she breaks away from the hull.${lost}`;
  }
  const taken = Math.round(h.fund * 0.3);
  h.fund -= taken;
  like(cap, -1, 'The bridge was taken on your watch.');
  st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.1));
  d.foeHp = -1; G.duel = null; G.nextEvent = null;
  if (d.foe.kind === 'patrol') return `They are on the bridge. Captain ${cap.last} surrenders the ship to the ${d.foe.gov} Navy, and the boarding officer writes a levy of ${fmt(taken)} cr against the ship's fund, which is collected on the spot. The cutter lets you go, with a citation.${lost}`;
  return `They are on the bridge. Captain ${cap.last} gives them the code to the strongbox because there is no choice, and they take ${fmt(taken)} cr of the ship's fund and go. The ship still flies.${lost}`;
}

// Boarding her ends with her bridge taken (her strongbox goes into the ship's fund) or you driven back to your own lock.
function assaultSettle(s, won, lost) {
  const st = G.state, h = hired(), cap = person(h.captain), foe = s.d.foe;
  if (won) {
    const take = lootFor(foe).credits || randInt(10, 30) * 100;
    h.fund += take;
    like(cap, 2, 'You took a ship for us.');
    for (const id of st.crew) { const c = person(id); if (c && !s.hurt.has(id)) like(c, 1, 'We took her bridge together.'); }
    gainSkill(h.post, 5);
    changeRep('Pirate', -3);
    foe.dead = true;
    return `Her captain puts the weapon down. Her strongbox is under the plot table, and ${fmt(take)} cr of it goes into the ship's fund. Captain ${cap.last} has the cutter cast off while her people are still being counted. (+5 experience at the ${POSTS[h.post].name.toLowerCase()} post.)${lost}`;
  }
  like(cap, -1, 'You went onto a crippled ship and came back without it.');
  st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.05));
  return `You are driven back to the lock, and the cutter pulls away with the door half closed. Her drive is dead and she is still drifting. Armor -${Math.round(ship().armor * 0.05)}.${lost}`;
}

const listNames = names => (names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0]);

// At a port: the berths of the dead are offered to someone from the dock, and a hand with a medic aboard is treated.
Mods.register({
  id: 'boarders', name: 'Repelling boarders', builtin: true,
  init(M) {
    M.on('landed', planet => {
      const st = G.state;
      for (const role of (st.vacancies || []).splice(0)) {
        const c = makeCrewCandidate(st.systemId);
        c.role = role; c.skill = 1; c.job = ROLE_NAMES[role] ? ROLE_NAMES[role].toLowerCase() : 'hand'; c.mood = null;
        registerPerson(c); st.crew.push(c.id);
        UI.notes.push(`A new ${c.job}, ${c.first} ${c.last}, signs on at ${planet.name} for the berth.`);
      }
      const h = hired();
      if (h && h.hurtUntil && roleHolder('medic')) { delete h.hurtUntil; UI.notes.push(`${roleHolder('medic').first} treats you.`); }
    });
  },
});
