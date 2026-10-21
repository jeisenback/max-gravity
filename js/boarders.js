'use strict';

// Boarding, both ways: who comes over the side (shipcombat.js boardersFor) and who of the crew stands with you (repelCrew), the deck they fight on with each side's
// cover (deckStart), the named casualties of it (repelCasualty, hurtHand), and how it ends (repelSettle, assaultSettle, shipTaken). The fight is the deck fight
// (fight.js), played turn by turn on the deck panel (fightui.js deckFightEvent): when a ship fight ends alongside, when a boarding run lands in the card duel
// (duel.js repelEvent), and when you board a ship you have crippled (engagements.js deadInSpaceScene), where a win carries her bridge. A hurt hand works a level
// lower until treated; one hurt twice in a fight is dead (a main character too, unless a floor of them holds, fate.js). Loaded after duel.js and handtohand.js,
// before fight.js and fightui.js; only called into at runtime. The words are the beats' tables below (hiredscenes.js repelLines).

const REPEL_TITLES = ['The Lock', 'The Corridor', 'The Bridge'];
const REPEL_OPENINGS = [
  [`The outer lock is cycling from the outside. The inner door has a thin bright seam in it where a cutter is working. Everyone who can be here's here, behind the closer, and the captain's voice on the intercom says to hold it.`,
    `Something hits the hull aft and the deck rings. The lock indicator goes amber, then red. Through the inner window there are three suits in the lock and a fourth coming.`],
  [`They're through the lock. It's eleven meters from there to the galley hatch, with the berth doors on one side and the cargo bay on the other. The air handler is running flat out and the lights are off at the lock end.`,
    `The lock door is down and the corridor is theirs as far as the first berth door. Somebody's firing from the bay. The deck smells of cut metal.`],
  [`The last hatch before the bridge is the one the captain closed by hand. They're working at it from the other side. The pilot has the helm and hasn't looked round.`,
    `There's one door left, and the closer on it's hissing. Behind it, the bridge. In front of it, everyone still standing.`],
];
// What the captain and the crew remember of a boarding, as lines of the beat: `memory.<name>` (hiredscenes.js repelLines).
const REPEL_MEMORY = { held: 'You held the ship when boarders came.', together: 'We held the ship together.', taken: 'The bridge was taken on your watch.' };
const ASSAULT_MEMORY = { took: 'You took a ship for us.', together: 'We took her bridge together.', left: 'You went onto a crippled ship and came back without it.' };
// How a fight is won short of a bridge: the last of them is down, or so few are left that the rest break (the shipped line by fight).
const FIGHT_END = {
  repel: { last: 'The last of them goes down in the passage, and nobody comes through behind him.', broke: 'Most of them are down, and the rest have had enough. They break and run for the lock, and nobody follows them.' },
  assault: { last: 'The last of her people goes down at the console, and the bridge is quiet.', broke: 'Most of her people are down, and the rest back away from the hatch with their hands open.' },
};
// Boarding her: the same three places from the other side, named from her bridge (0) to her lock (2).
const ASSAULT_TITLES = ['Her Bridge', 'Her Corridor', 'Her Lock'];
const ASSAULT_OPENINGS = [
  [`The last hatch before her bridge has a wheel on it, and somebody on the other side is holding the wheel. Her pilot is a name on a transponder. Behind you the air handler is running, and the captain's voice on the intercom says to go.`,
    `There's one door left. It's thin, and the light under it moves. Whatever is on her bridge has heard you coming for some time.`],
  [`You're in through her lock. It's a corridor like yours, with the berth doors the wrong way round and a smell of fried oil and old smoke. Somebody's behind a crate at the far end, and somebody else is calling to them.`,
    `Her corridor is dark and the deck is tilted a few degrees, because her gravity plates are out. They're at the galley hatch. You can hear a gun being checked.`],
  [`The cutter has bitten through her outer lock and the inner door is open a hand's width. It's dark inside. A light comes on, and something small and metal skips across the deck toward you.`,
    `Her lock is wide open and empty, and nobody has fired. Beyond the inner door there's a corridor, and in the corridor somebody's waiting.`],
];
const REPEL_HURT = { lose: 0.45 };  // the chance the hand is hurt in a contested section, before the suit (fight.js DECK.SUIT)

// A line of the repel or the assault fight, read through the editor's words (lineWords, storylets.js) by the name it has in the set's tables (hiredscenes.js lists them).
const repelWords = (s, key, shipped) => lineWords(s.assault ? 'beats:assault' : 'beats:repel', key, shipped);

// The post the player fights at: a hand's, or the post an owner keeps through the buy (career, hired.js). None for an owner who never was a hand: the card duel is theirs (duel.js).
const lockPost = () => { const c = career(); return c && c.post ? c.post : null; };
const handHurt = () => { const c = career(); return !!(c && c.hurtUntil > G.state.day); };
// The money a fight moves is the ship's fund for a hand and the player's credits for an owner (role.js paysFrom).
const purse = () => (role().paysFrom() === 'fund' ? hired().fund : G.state.credits);
const moveMoney = n => { if (role().paysFrom() === 'fund') hired().fund += n; else G.state.credits += n; };

// Who stands with you. A crew member who cannot stand you keeps to their berth, and of two who are at each other's throats
// (the bond at which a split is on the cards, stakes.js) the one who thinks less of you will not stand in the same section.
// A crew member close to you covers you: the first hit that would have been yours is theirs.
function repelCrew() {
  const st = G.state, ids = st.crew.filter(id => !(st.injured || {})[id]), held = new Map(), fighters = ids.map(id => ({ id, p: person(id) })).filter(f => f.p);
  for (const f of fighters) if (f.p.opinion <= OPINION.ENEMY) held.set(f.id, `${f.p.first} won't fight for you.`);
  const live = fighters.filter(f => !held.has(f.id));
  for (const [a, b] of pairs(live)) {
    if (held.has(a.id) || held.has(b.id) || bond(a, b) > SPLIT_BOND) continue;
    const [out, stays] = a.p.opinion <= b.p.opinion ? [a, b] : [b, a];
    held.set(out.id, `${out.p.first} won't stand in the same section as ${stays.p.first}.`);
  }
  return { fight: fighters.filter(f => !held.has(f.id)).map(f => f.id), held: [...held.values()] };
}

// The fight: the deck fight's state on our deck (fight.js deckFight), with who stands with you, who is hurt and who has fallen. Kept with the scene, as the
// lock fight was, so nothing of it is in the save. Up to five of the crew are heads on the deck, as the lock fight counted them; `outcome` is how the
// boarding run landed ('full' two more of them than 'half', shipcombat.js boardersFor). A long ship (16 and over) has the cargo bay to go round by.
function repelStart(d, outcome) {
  return deckStart({ d, boarders: boardersFor(d.foe, outcome, d), grade: d.grade || 0, size: SHIPS[G.state.shipId].size });
}

// Boarding a crippled ship: the same fight on her deck, ours pushing from her lock to her bridge.
function assaultStart(foe, rate = {}) {
  captainFlag('raided');  // kept for the goodbye (captains.js)
  return deckStart({ d: { foe, foeHp: 0 }, boarders: boardersFor(foe, 'full', rate), grade: rate.grade || 0, size: SHIPS[foe.shipId].size, assault: true });
}

// Each side's cover is its own (R31): on our deck the ship's cover and the kit's are ours; on hers her ship's is hers, and ours is only what the kit opens up.
function deckStart({ d, boarders, grade, size, assault = false }) {
  const w = repelCrew(), kit = career().kit, ship = [...fightCover({ size, kit: assault ? [] : kit }), COVER_BASE];  // the cargo bay has the ship's own cover
  const cover = assault ? [...[0, 1, 2].map(pos => kitCover(kit, pos)), 0] : ship, hers = assault ? ship : [];
  const state = deckFight({ boarders, crew: Math.min(5, w.fight.length), cover, hers, grade, assault, side: size >= 16 });
  return { d, assault, state, grade, fight: w.fight, held: w.held, hurt: new Set(), dead: [], marked: [], youHurt: false };
}

function repelEvent(d, outcome) { return deckFightEvent(repelStart(d, outcome)); }

// Who can be sent: the crew who are on their feet and have a post, with their sheets (handtohand.js crewSheet), the most skilled first; the first is given the
// cover while the fight has it to make.
const repelOrders = (s, coverUsed) => crewOrders((s.fight || []).filter(id => !s.dead.some(c => c.id === id) && !s.marked.some(c => c.id === id)).map(person).filter(Boolean)
  .map(c => ({ id: c.id, first: c.first, sheet: crewSheet({ role: c.role, skill: c.skill, traits: c.traits, low: moodLow(c) }) })), coverUsed);
// The odds of an ability: the post's stat and skill on the sheet, with the kit's edge (handCheck), easier for the cover one (handtohand.js).
const abilityOdds = (post, kind) => handCheck(POST_STAT[post], skillLevel(post), 'post', ABILITY_EDGE[kind]);

const pickWeighted = table => { let r = Math.random() * Object.values(table).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(table)) if ((r -= w) < 0) return k; return Object.keys(table)[0]; };

// The hand is hurt: laid up for a while (a level worse, light duty), longer if already hurt, and with no medic aboard the clinic is on
// their own savings. Used when a hit falls on the hand (repelCasualty, below), on a heavy turn of the ship fight (fightui.js fightTook), and on a job ashore (jobs.js).
const HAND_CLINIC = 150;
// The hand can die (#357): hurt a second time while still hurt, or with the bridge taken while laid up, is a roll of one in four, and a first hurt
// is a roll of one in twelve; each is halved with a medic aboard (the factor crew deaths use, losses.js). The hand is hurt about 0.4 times a chapter
// and rarely twice inside the 12 days it takes to mend, so the first-hurt roll is what puts a death near 3 in 100 chapters (as the captain's loss is).
// The next scene is the ending (stakes.js), so a caller that queues a scene after this one checks `s.handDied` first.
const HAND_DEATH = 0.25, HAND_DEATH_FIRST = 1 / 12;
const handDeathOdds = (again = true) => (again ? HAND_DEATH : HAND_DEATH_FIRST) * (roleHolder('medic') ? LOSS_MEDIC : 1);
// The captain can be lost (#357): a pirate bridge taken is a roll of one in three. The next scene is the captain's loss (stakes.js).
const CAPTAIN_LOST = 1 / 3;
function handDies(s, how) {
  const st = G.state, h = hired();
  s.handDied = true; h.died = { day: st.day, how };
  G.nextEvent = handDeathScene(how);
}
// `s.ashore`: a hurt on a job ashore (jobs.js), which costs the clinic and the days but never the hand's life: that is the fights' own.
function hurtHand(s) {
  const st = G.state, c = career(), again = s.youHurt || handHurt();
  c.hurtUntil = st.day + (again ? 18 : 12);
  s.youHurt = true; s.hits = (s.hits || 0) + 1;  // hits: how many times this fight (fightui.js fightTook)
  captainFlag('hurt');  // kept for the goodbye (captains.js)
  if (!s.ashore && role().canDie && Math.random() < handDeathOdds(again)) { handDies(s, again ? 'hurt' : 'first'); return again ? 'You\'re hurt again, and you stay down.' : 'You\'re hit.'; }
  const bill = roleHolder('medic') ? 0 : handPays(HAND_CLINIC);  // the hand's own savings, also in a fight that a burn event started (hired.js hiredFunds)
  const pay = bill ? ` The clinic is ${fmt(bill)} cr of your own, with no medic aboard.` : '';
  return `${again ? 'You are hurt again, and you stay down.' : 'You are hurt. Your work counts a level lower until the clinic clears you.'}${pay}`;
}

// The memorial's cause of a death in a fight: the ship fight's (fightui.js), boarding her, or holding our own deck.
const killedHow = s => `${s.state && s.state.kind === 'ship' ? (s.spec.kind === 'patrol' ? 'Killed in a navy stop' : 'Killed in a raid') : s.assault ? 'Killed boarding a crippled ship' : 'Killed repelling boarders'} near ${system().name}.`;

// Someone goes down. On the hand it is the hand's hurt (hurtHand), which a friend may take once a fight. A crew member hurt twice in one fight is dead, and so is a named person marked before; where a floor of main
// characters holds (the full build, fate.js) they are marked instead.
function repelCasualty(s, only) {  // `only`: the one it falls on, when the exchange was an order to them
  const st = G.state, pool = [...st.crew.filter(id => !(st.injured || {})[id] || s.hurt.has(id)), 'you'];
  let who = only || pick(pool), cover = '';
  if (who === 'you' && !s.covered) {  // a friend takes it for you, once in a fight
    const friend = st.crew.map(person).find(c => c && (c.opinion >= OPINION.FRIEND || c.owes) && !(st.injured || {})[c.id] && !s.hurt.has(c.id) && !(s.held || []).some(l => l.startsWith(c.first)));
    if (friend) { who = friend.id; s.covered = true; cover = `${friend.first} pulls you down behind the closer and takes it${friend.owes ? ` ("We are even," ${friend.first} says later)` : ''}. `; delete friend.owes; }
  }
  if (who === 'you') return hurtHand(s);
  const c = person(who);
  if (s.hurt.has(who) || secondStrike(c)) {  // hurt twice in a fight, or marked before and hit again: the second strike
    if (loseCrew(c, killedHow(s)) === 'marked') {  // a floor held them (the full build)
      s.marked.push(c);
      return `${c.first} is hit again and doesn't get up. ${c.first} is alive, and ${c.first} isn't fit to work.`;
    }
    s.dead.push(c);
    return `${c.first} is hit again and doesn't get up.`;
  }
  if (Math.random() < lossOdds(c, true)) {  // a hard hit that does not stop at hurt (losses.js)
    if (loseCrew(c, killedHow(s)) === 'dead') { s.dead.push(c); return `${cover}${c.first} is hit, and doesn't get up, and won't.`; }
    s.marked.push(c); return `${cover}${c.first} is hit, and carried below, and is alive, and isn't fit to work.`;
  }
  (st.injured = st.injured || {})[who] = true;
  s.hurt.add(who);
  return `${cover}${c.first} is hurt.${hurtWarning(c)}`;
}

// A generated crew member dies: off the crew, on the record, and the berth is offered at the next port.
function killCrew(c, cause) {
  const st = G.state;
  st.crew = st.crew.filter(id => id !== c.id);
  delete (st.injured || {})[c.id];
  c.dead = true;
  (st.fallen = st.fallen || []).push({ name: fullName(c), role: c.role, day: st.day });
  (st.vacancies = st.vacancies || []).push(c.role);
  const how = stripTags(cause);  // the memorial's cause ("Killed in a raid near Sol."), read on from the name
  homeLog(sceneSay('scene:ship-log', 'killed.log', { first: c.first, last: c.last, how: how.charAt(0).toLowerCase() + how.slice(1) }));
}

// Who died in a fight, said after its close.
const deadNote = s => (s.dead.length ? ` ${listNames(s.dead.map(c => c.first))} ${s.dead.length > 1 ? 'are' : 'is'} dead.` : '');

// How it ends (`s.won`, fightui.js deckClose): repelled (the duel goes on with the initiative yours), or the bridge taken (shipTaken).
function repelSettle(s) {
  const st = G.state, h = hired(), cap = h && person(h.captain), d = s.d, repelled = s.won;  // an owner has no captain
  const lost = deadNote(s);
  if (s.assault) return assaultSettle(s, repelled, lost);
  if (repelled) {
    if (cap) like(cap, 1, repelWords(s, 'memory.held', REPEL_MEMORY.held));
    for (const id of st.crew) { const c = person(id); if (c && !s.hurt.has(id) && s.state.turn >= 3) like(c, 1, repelWords(s, 'memory.together', REPEL_MEMORY.together)); }
    d.init = 'me';
    G.nextEvent = d.foeHp > 0 ? duelEvent() : null;
    return `The last of them go back through the lock. The outer door closes from the other side, and the drive of the ${theShip(d.foe).replace(/^The /, '')} lights, and she breaks away from the hull.${lost}`;
  }
  return shipTaken(s);
}

// The ship taken: her people are on the bridge, the ship's fund is stripped and they cut loose. The end of a deck fight lost, and of a ship fight
// whose hull is gone (fightui.js).
function shipTaken(s) {
  const st = G.state, h = hired(), cap = h && person(h.captain), d = s.d, lost = deadNote(s);  // an owner has no captain
  const taken = Math.round(purse() * 0.3);
  moveMoney(-taken);
  if (cap) like(cap, -1, repelWords(s, 'memory.taken', REPEL_MEMORY.taken));
  st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.1));
  d.foeHp = -1; G.duel = null; G.nextEvent = null;
  if ((s.youHurt || handHurt()) && role().canDie && Math.random() < handDeathOdds()) handDies(s, 'bridge');  // laid up when they came through
  if (cap && d.foe.kind !== 'patrol' && !s.handDied && Math.random() < CAPTAIN_LOST) {
    h.captainLost = { day: st.day, how: 'bridge' };
    G.nextEvent = captainLostScene();
    return `They're on the bridge. Captain ${cap.last} is at the console and doesn't give them the code, so they take it. They take ${fmt(taken)} cr of the ship's fund and go. The ship still flies. Captain ${cap.last} doesn't get up.${lost}`;
  }
  if (!cap) return d.foe.kind === 'patrol'  // the owner's own words: the ship is theirs to surrender, and the money theirs to lose
    ? `They're on the bridge. You surrender the ship to the ${d.foe.gov} Navy, and the boarding officer writes a levy of ${fmt(taken)} cr, which is collected on the spot. The cutter lets you go, with a citation.${lost}`
    : `They're on the bridge. You give them the code to the strongbox because there's no choice, and they take ${fmt(taken)} cr and go. The ship still flies.${lost}`;
  if (d.foe.kind === 'patrol') return `They're on the bridge. Captain ${cap.last} surrenders the ship to the ${d.foe.gov} Navy, and the boarding officer writes a levy of ${fmt(taken)} cr against the ship's fund, which is collected on the spot. The cutter lets you go, with a citation.${lost}`;
  return `They're on the bridge. Captain ${cap.last} gives them the code to the strongbox because there's no choice, and they take ${fmt(taken)} cr of the ship's fund and go. The ship still flies.${lost}`;
}

// Boarding her ends with her bridge taken (her strongbox goes into the ship's fund) or you driven back to your own lock.
function assaultSettle(s, won, lost) {
  const st = G.state, h = hired(), cap = h && person(h.captain), foe = s.d.foe, post = lockPost();
  if (won) {
    const take = lootFor(foe).credits || randInt(10, 30) * 100;
    moveMoney(take);
    if (cap) like(cap, 2, repelWords(s, 'memory.took', ASSAULT_MEMORY.took));
    for (const id of st.crew) { const c = person(id); if (c && !s.hurt.has(id)) like(c, 1, repelWords(s, 'memory.together', ASSAULT_MEMORY.together)); }
    gainSkill(post, 5);
    changeRep('Pirate', -3);
    foe.dead = true;
    return `Her captain puts the weapon down. Her strongbox is under the plot table, and ${fmt(take)} cr of it goes into ${cap ? "the ship's fund" : 'your credits'}. ${cap ? `Captain ${cap.last} has` : 'You have'} the cutter cast off while her people are still being counted. (+5 experience at the ${POSTS[post].name.toLowerCase()} post.)${lost}`;
  }
  if (cap) like(cap, -1, repelWords(s, 'memory.left', ASSAULT_MEMORY.left));
  st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.05));
  return `You're driven back to the lock, and the cutter pulls away with the door half closed. Her drive is dead and she's still drifting. Armor -${Math.round(ship().armor * 0.05)}.${lost}`;
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
      const h = career();
      if (h && h.hurtUntil && roleHolder('medic')) { delete h.hurtUntil; UI.notes.push(`${roleHolder('medic').first} treats you.`); }
    });
  },
});
