'use strict';

// Repelling boarders: the authored fight for a hired hand when a boarding run lands in the ship duel (duel.js). Three
// places, the lock, the corridor and the bridge, and a track between them. Each exchange you choose a tactic (hold beats
// go-round, rush beats hold, go-round beats rush) or do the job of your own post. Winning an exchange pushes them back a
// place and losing it lets them in a place; out of the lock and they are repelled, onto the bridge and they have the ship.
// Casualties come with it: someone is hurt (an injured hand's perk stops until treated, and a hurt hand works a level
// lower), and one who is hurt twice in a fight is dead (a main character too, unless a floor of them holds, fate.js). Loaded
// after duel.js; only called into at runtime. The same fight, run the other way, is boarding a ship you have crippled
// (engagements.js): the choices are the same and a win carries her bridge instead of holding yours (assault, below).

const REPEL_TITLES = ['The Lock', 'The Corridor', 'The Bridge'];
const REPEL_OPENINGS = [
  [`The outer lock is cycling from the outside. The inner door has a thin bright seam in it where a cutter is working. Everyone who can be here's here, behind the closer, and the captain's voice on the intercom says to hold it.`,
    `Something hits the hull aft and the deck rings. The lock indicator goes amber, then red. Through the inner window there are three suits in the lock and a fourth coming.`],
  [`They're through the lock. It's eleven meters from there to the galley hatch, with the berth doors on one side and the cargo bay on the other. The air handler is running flat out and the lights are off at the lock end.`,
    `The lock door is down and the corridor is theirs as far as the first berth door. Somebody's firing from the bay. The deck smells of cut metal.`],
  [`The last hatch before the bridge is the one the captain closed by hand. They're working at it from the other side. The pilot has the helm and hasn't looked round.`,
    `There's one door left, and the closer on it's hissing. Behind it, the bridge. In front of it, everyone still standing.`],
];
const REPEL_TACTICS = {
  hold: { label: 'Hold the line', beats: 'flank',
    win: 'You hold the line. The first one through takes the closer in the face and goes back out, and the others don\'t come again for a minute.',
    lose: 'The line doesn\'t hold. They come through two at a time, and you\'re pushed back a section.' },
  rush: { label: 'Rush them', beats: 'hold',
    win: 'You go in low, all together, before they have set themselves. They break at the first contact and go back the way they came.',
    lose: 'You rush and they\'re ready. A gun goes off in the corridor, too close, and you fall back with fewer than you went in with.' },
  flank: { label: 'Go round them', beats: 'rush',
    win: 'You go through the cargo bay and come out on their side. They turn too late, and the line goes back.',
    lose: 'You go round and find nobody there. When you come back they\'re two meters further in.' },
};
// What the captain and the crew remember of a boarding, as lines of the beat: `memory.<name>` (hiredscenes.js repelLines).
const REPEL_MEMORY = { held: 'You held the ship when boarders came.', together: 'We held the ship together.', taken: 'The bridge was taken on your watch.' };
const ASSAULT_MEMORY = { took: 'You took a ship for us.', together: 'We took her bridge together.', left: 'You went onto a crippled ship and came back without it.' };
const BREAK_AT = 1 / 3;  // the share of their number at which the rest of them break and run
// How a fight ends short of the front reaching the lock: the last of them is down, or so few are left that the rest break (the shipped line by fight).
const FIGHT_END = {
  repel: { last: 'The last of them goes down in the passage, and nobody comes through behind him.', broke: 'Most of them are down, and the rest have had enough. They break and run for the lock, and nobody follows them.' },
  assault: { last: 'The last of her people goes down at the console, and the bridge is quiet.', broke: 'Most of her people are down, and the rest back away from the hatch with their hands open.' },
};
const REPEL_TIE = 'Neither side gives. The air handler runs, somebody coughs, and the fighting goes on in the same place.';
const REPEL_POST = {
  gunner: { label: 'Fire down the line', win: ('You put three rounds down the line at the seam, one at a time, and the ones in front go down across ' +
      'the ones behind. They go back toward the lock.'), lose: 'You fire, and the round goes through a berth door. They use the noise and come a section deeper.' },
  engineer: { label: 'Seal the bulkhead behind them', win: 'You close the section bulkhead by hand, behind the front of them, and run the lock cutter to overload. The hull groans. They\'re on the wrong side of the ship.', lose: 'The bulkhead jams a hand short of shut. They use the gap.' },
  pilot: { label: 'Roll the ship', win: 'You roll the ship thirty degrees, hard. The boarders, in their suits, go into the corridor wall. The crew were braced, and go the other way.', lose: 'You roll, and your own people aren\'t braced either. The boarders come up first.' },
  comms: { label: 'Lock the doors from the console', win: 'You lock every door between them and the bridge from the console, then open the one that leads back to the lock. They follow the open door.', lose: 'You lock the wrong door. It\'s the one behind you.' },
};
// Boarding her: the same three places from the other side, so a win here is a place gained. The post lines are the job of your
// post in the assault.
const ASSAULT_TITLES = ['Her Bridge', 'Her Corridor', 'Her Lock'];
const ASSAULT_OPENINGS = [
  [`The last hatch before her bridge has a wheel on it, and somebody on the other side is holding the wheel. Her pilot is a name on a transponder. Behind you the air handler is running, and the captain's voice on the intercom says to go.`,
    `There's one door left. It's thin, and the light under it moves. Whatever is on her bridge has heard you coming for some time.`],
  [`You're in through her lock. It's a corridor like yours, with the berth doors the wrong way round and a smell of fried oil and old smoke. Somebody's behind a crate at the far end, and somebody else is calling to them.`,
    `Her corridor is dark and the deck is tilted a few degrees, because her gravity plates are out. They're at the galley hatch. You can hear a gun being checked.`],
  [`The cutter has bitten through her outer lock and the inner door is open a hand's width. It's dark inside. A light comes on, and something small and metal skips across the deck toward you.`,
    `Her lock is wide open and empty, and nobody has fired. Beyond the inner door there's a corridor, and in the corridor somebody's waiting.`],
];
const ASSAULT_TACTICS = {
  hold: { label: 'Cover and advance', beats: 'flank',
    win: 'You go along the wall in pairs, one covering and one moving. They can\'t find a gap in it, and you\'re a section further in.',
    lose: 'You go along the wall and they have it covered from two sides. You come back to where you started, with fewer than you went with.' },
  rush: { label: 'Rush them', beats: 'hold',
    win: 'You go in low and fast, all together. They\'re not set, and the first of them breaks and the rest follow.',
    lose: 'You rush and they\'re set. A gun goes off in the corridor, too close, and you fall back a section.' },
  flank: { label: 'Go round them', beats: 'rush',
    win: 'You go through her cargo bay and come out behind them. They turn too late, and you take the section.',
    lose: 'You go round and find a bulkhead where her plan said there was a door. When you come back they\'ve moved up.' },
};
const ASSAULT_POST = {
  gunner: { label: 'Put fire down the corridor', win: 'You put three rounds down the corridor at the crate, one at a time. The one behind it stops firing and the others pull back.', lose: 'You fire, and the rounds go into the deck. They use the noise to move up.' },
  engineer: { label: 'Cut her power', win: 'You find her breaker panel by the lock and pull it. Every light in the section goes out, and you have your helmet lamps and they don\'t.', lose: 'You pull the wrong breaker and her emergency lights come on instead, all of them, in your eyes.' },
  pilot: { label: 'Bring the ship round to her hatch', win: ('You take the cutter along her side to the hatch by the bridge. The crew go out of the ' +
      'second lock behind them and the corridor is a pincer.'), lose: 'You bring her round and misjudge it by a meter. The hull scrapes and the crew in the lock go over.' },
  comms: { label: 'Take her intercom', win: 'You find her intercom and put the captain on it. "Your ship is lost," the captain says, "and the lock is open." Some of them go.', lose: 'You find her intercom and it\'s a recording, which says something unrepeatable about your mother.' },
};

const REPEL_LEAN = { pirate: { rush: 0.38, hold: 0.3, flank: 0.32 }, patrol: { hold: 0.38, rush: 0.3, flank: 0.32 } };
const REPEL_HURT = { lose: 0.45, win: 0.15 };  // the chance someone is hurt in an exchange, by how it went

const repelSet = s => (s.assault ? { titles: ASSAULT_TITLES, openings: ASSAULT_OPENINGS, tactics: ASSAULT_TACTICS, post: ASSAULT_POST } : { titles: REPEL_TITLES, openings: REPEL_OPENINGS, tactics: REPEL_TACTICS, post: REPEL_POST });

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

// The fight: where they are (0 the lock, 1 the corridor, 2 the bridge), how many they are, who is hurt and who has fallen.
function repelStart(d, outcome) {
  const crew = FOE_CREW[d.foe.shipId] || 3, w = repelCrew(), boarders = boardersFor(d.foe, outcome, d);
  return { d, pos: outcome === 'full' ? 1 : 0, boarders, began: boarders, grade: d.grade || 0, base: Math.min(6, w.fight.length + 1), fight: w.fight, held: w.held, hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0, lines: [], extra: [0, 0, 0], used: {} };
}
const repelStanding = s => Math.max(1, s.base - s.hurt.size - s.dead.length);

function repelEvent(d, outcome) { return repelScene(repelStart(d, outcome)); }

// Boarding a crippled ship: her people hold the middle, and you are a section in.
function assaultStart(foe, rate = {}) {
  const w = repelCrew(), boarders = boardersFor(foe, 'full', rate);
  captainFlag('raided');  // kept for the goodbye (captains.js)
  return { d: { foe, foeHp: 0 }, assault: true, pos: 1, boarders, began: boarders, grade: rate.grade || 0, base: Math.min(6, w.fight.length + 1), fight: w.fight, held: w.held, hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0, lines: [], extra: [0, 0, 0], used: {} };
}

function repelScene(s) {
  const post = lockPost(), set = repelSet(s), spec = set.post[post];
  const stake = { casualty: true, hand: true };  // any exchange can cost someone, and the hand is among them
  const choices = Object.entries(set.tactics).map(([k, t]) => ({ label: `${repelWords(s, `tactic.${k}.label`, t.label)}${costNote(stake, tacticOdds(s, k))}`, run: () => repelStep(s, k) }));
  choices.push({ label: `[${POSTS[post].name}] ${repelWords(s, `post.${post}.label`, spec.label)}${costNote(stake, postOdds(post))}`, run: () => repelStep(s, 'post') });
  for (const kind of Object.keys(ABILITY_EDGE)) {  // the post's other abilities (handtohand.js): each costs the exchange, as the post's move does
    const shut = kind === 'cover' && s.used.cover;
    choices.push({ label: `[${POSTS[post].name}] ${repelWords(s, `ability.${post}.${kind}.label`, FIGHT_ABILITY[post][kind].label)} (${ABILITY_NOTE[kind]})${costNote(stake, abilityOdds(post, kind))}`, run: () => repelStep(s, kind), can: () => !shut, why: 'Once a fight.' });
  }
  repelOrders(s).forEach((o, n) => {  // and orders to the crew who have a post, by name (handtohand.js): their ability, at their skill, and a miss lands on the one sent
    const post = o.sheet.post;
    choices.push({ order: true, group: n === 0 ? 'Orders to the crew' : undefined, label: `${o.first} ${repelWords(s, `crew.${post}.${o.kind}.label`, CREW_ABILITY[post][o.kind].label)} (${ABILITY_NOTE[o.kind]})${costNote({ sent: `${o.first} may be ${s.hurt.has(o.id) ? 'lost' : 'hurt'}` }, crewOrderOdds(o.sheet, o.kind, s.hurt.has(o.id)))}`, run: () => repelStep(s, o.kind, o) });
  });
  return {
    title: repelWords(s, `title.${s.pos}`, set.titles[s.pos]), personal: true, via: 'crew', board: fightStrip({ titles: set.titles, pos: s.pos, boarders: s.boarders, cover: repelCover(s) }),
    text: `${repelWords(s, `open.${s.pos}.${s.round % 2}`, set.openings[s.pos][s.round % 2])}</p><p>${s.assault ? 'Defenders' : 'Boarders'}: ${s.boarders}. With you: ${repelStanding(s) - 1}.${(s.held || []).length ? ` ${s.held.join(' ')}` : ''} ${layoutHint()}`.trim(),
    choices,
  };
}

// Who can be sent: the crew who are on their feet and have a post, with their sheets (handtohand.js crewSheet), the most skilled first.
const repelOrders = s => crewOrders((s.fight || []).filter(id => !s.dead.some(c => c.id === id) && !s.marked.some(c => c.id === id)).map(person).filter(Boolean)
  .map(c => ({ id: c.id, first: c.first, sheet: crewSheet({ role: c.role, skill: c.skill, traits: c.traits, low: moodLow(c) }) })), s.used.cover);
// The odds of an ability: the post's stat and skill on the sheet, with the kit's edge (handCheck), easier for the steady one (handtohand.js).
const abilityOdds = (post, kind) => handCheck(POST_STAT[post], skillLevel(post), 'post', ABILITY_EDGE[kind]);
// The cover of each section as the fight stands: the ship's, the kit's, and what the cover ability has made.
const repelCover = s => fightCover({ size: SHIPS[G.state.shipId].size, kit: career().kit, extra: s.extra });

// What a tactic does against theirs: the triangle, or the numbers when both chose the same.
function tacticResult(s, set, kind, theirs) {
  if (kind !== theirs) return set.tactics[kind].beats === theirs ? 'win' : 'lose';
  const mine = repelStanding(s);
  return mine > s.boarders ? 'win' : mine < s.boarders ? 'lose' : 'tie';
}
// The chance a tactic wins the exchange, the way repelStep rolls it: their lean and a veteran's counter decide theirs, the triangle or the
// numbers decide the exchange, and the ship's layout can turn it. Shown on the tactic's button (repelScene).
function tacticOdds(s, kind) {
  const set = repelSet(s), cun = Math.min(1, CUNNING * (s.grade || 0)), lean = foeLean(s), sum = Object.values(lean).reduce((a, b) => a + b, 0);
  const p = { win: 0, lose: 0, tie: 0 }, counter = counterOf(set.tactics, kind);
  for (const t of Object.keys(set.tactics)) p[tacticResult(s, set, kind, t)] += cun * (t === counter ? 1 : 0) + (1 - cun) * (lean[t] || 0) / sum;
  const edge = layoutEdge(kind);
  return p.win * (edge < 0 ? 1 + edge : 1) + p.lose * (edge > 0 ? edge : 0);
}

// One exchange. Returns what happened; sets the next scene, or settles the fight and goes back to the duel.
function repelStep(s, kind, who) {  // `who`: the crew member sent, when an ability is an order to them (repelScene)
  const post = lockPost(), set = repelSet(s), theirs = kind === 'post' || kind in ABILITY_EDGE ? null : (CUNNING * (s.grade || 0) > 0 && Math.random() < CUNNING * s.grade ? counterOf(set.tactics, kind) : pickWeighted(foeLean(s)));
  let result, text, press = false;  // 'win', 'lose' or 'tie'; `press`: an ability that missed, which gives them a shot at someone without costing the ground
  if (kind === 'post') {
    result = Math.random() < postOdds(post) ? 'win' : 'lose';
    text = repelWords(s, `post.${post}.${result}`, set.post[post][result]);
  } else if (kind in ABILITY_EDGE) {
    const worked = Math.random() < (who ? crewOrderOdds(who.sheet, kind, s.hurt.has(who.id)) : abilityOdds(post, kind)), step = abilityStep(kind, worked, s);
    result = step.result; press = step.press; s.boarders = step.boarders; s.extra = step.extra;
    if (kind === 'cover') s.used.cover = true;
    const side = worked ? 'win' : 'lose';
    text = who ? `${who.first} ${repelWords(s, `crew.${who.sheet.post}.${kind}.${side}`, CREW_ABILITY[who.sheet.post][kind][side])}` : repelWords(s, `ability.${post}.${kind}.${side}`, FIGHT_ABILITY[post][kind][side]);
  } else {
    result = tacticResult(s, set, kind, theirs);
    text = result === 'tie' ? repelWords(s, 'tie', REPEL_TIE) : repelWords(s, `tactic.${kind}.${result}`, set.tactics[kind][result]);
  }
  const edge = kind === 'post' || kind in ABILITY_EDGE ? 0 : layoutEdge(kind);  // the ship you fight in (shipcombat.js)
  if (edge && result !== 'tie' && Math.random() < Math.abs(edge)) {
    const flipped = edge > 0 && result === 'lose' ? 'win' : edge < 0 && result === 'win' ? 'lose' : result;
    if (flipped !== result) { result = flipped; text = repelWords(s, `tactic.${kind}.${result}`, set.tactics[kind][result]); }
  }
  const here = s.pos;  // the section the exchange was fought in, for its cover
  if (result === 'win') { s.pos--; if (kind === 'post' && post === 'gunner') s.boarders = Math.max(0, s.boarders - 1); }
  if (result === 'lose') s.pos++;
  s.round++;
  const costs = result !== 'tie' || press || kind === 'steady';  // a pick-off that works is a won exchange for what it costs (it is one of them down, and the others shoot back)
  if (costs && Math.random() < REPEL_HURT[press ? 'lose' : result === 'tie' ? 'win' : result] * (1 + 0.15 * (s.grade || 0)) * hurtScale(repelCover(s)[here])) text += ` ${repelCasualty(s, press && who ? who.id : undefined)}`;  // a miss on an order lands on the one sent
  if (s.handDied) return text;  // the hand is dead: the ending is queued, and the fight does not go on
  const ended = s.pos >= 0 && s.pos <= 2 && (s.boarders <= 0 ? 'last' : s.boarders <= s.began * BREAK_AT && s.pos === 0 ? 'broke' : null);  // none left, or so few, and pushed back to the lock, that the rest break: the fight is won where it stands
  if (ended) { s.pos = -1; text += ` ${repelWords(s, `end.${ended}`, FIGHT_END[s.assault ? 'assault' : 'repel'][ended])}`; }
  if (s.pos < 0 || s.pos > 2) return `${text} ${repelSettle(s)}`;
  G.nextEvent = repelScene(s);
  return text;
}

const pickWeighted = table => { let r = Math.random() * Object.values(table).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(table)) if ((r -= w) < 0) return k; return Object.keys(table)[0]; };

// The hand is hurt: laid up for a while (a level worse, light duty), longer if already hurt, and with no medic aboard the clinic is on
// their own savings. Used when a crew member is hit (below) and when the hand's own call in a raid goes wrong (engagements.js).
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
  s.youHurt = true;
  captainFlag('hurt');  // kept for the goodbye (captains.js)
  if (!s.ashore && role().canDie && Math.random() < handDeathOdds(again)) { handDies(s, again ? 'hurt' : 'first'); return again ? 'You\'re hurt again, and you stay down.' : 'You\'re hit.'; }
  const bill = roleHolder('medic') ? 0 : Math.min(st.credits, HAND_CLINIC);
  st.credits -= bill;
  const pay = bill ? ` The clinic is ${fmt(bill)} cr of your own, with no medic aboard.` : '';
  return `${again ? 'You are hurt again, and you stay down.' : 'You are hurt. Your work counts a level lower until the clinic clears you.'}${pay}`;
}

// Someone goes down. The hand can be hurt but not killed. A crew member hurt twice in one fight is dead, and so is a named person marked before; where a floor of main
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
    if (loseCrew(c, `Killed repelling boarders near ${system().name}.`) === 'marked') {  // a floor held them (the full build)
      s.marked.push(c);
      return `${c.first} is hit again and doesn't get up. ${c.first} is alive, and ${c.first} isn't fit to work.`;
    }
    s.dead.push(c);
    return `${c.first} is hit again and doesn't get up.`;
  }
  if (Math.random() < lossOdds(c, true)) {  // a hard hit that does not stop at hurt (losses.js)
    if (loseCrew(c, `Killed repelling boarders near ${system().name}.`) === 'dead') { s.dead.push(c); return `${cover}${c.first} is hit, and doesn't get up, and won't.`; }
    s.marked.push(c); return `${cover}${c.first} is hit, and carried below, and is alive, and isn't fit to work.`;
  }
  (st.injured = st.injured || {})[who] = true;
  s.hurt.add(who);
  return `${cover}${c.first} is hurt.${hurtWarning(c)}`;
}

// A generated crew member dies: off the crew, on the record, and the berth is offered at the next port.
function killCrew(c) {
  const st = G.state;
  st.crew = st.crew.filter(id => id !== c.id);
  delete (st.injured || {})[c.id];
  c.dead = true;
  (st.fallen = st.fallen || []).push({ name: fullName(c), role: c.role, day: st.day });
  (st.vacancies = st.vacancies || []).push(c.role);
  homeLog(sceneSay('scene:ship-log', 'killed.log', { first: c.first, last: c.last, system: system().name }));
}

// How it ends: repelled (the duel goes on with the initiative yours), or the bridge taken (the ship's fund is stripped and they cut loose).
function repelSettle(s) {
  const st = G.state, h = hired(), cap = h && person(h.captain), d = s.d, repelled = s.pos < 0;  // an owner has no captain
  const lost = s.dead.length ? ` ${listNames(s.dead.map(c => c.first))} ${s.dead.length > 1 ? 'are' : 'is'} dead.` : '';
  if (s.assault) return assaultSettle(s, repelled, lost);
  if (repelled) {
    if (cap) like(cap, 1, repelWords(s, 'memory.held', REPEL_MEMORY.held));
    for (const id of st.crew) { const c = person(id); if (c && !s.hurt.has(id) && s.round >= 3) like(c, 1, repelWords(s, 'memory.together', REPEL_MEMORY.together)); }
    d.init = 'me';
    G.nextEvent = d.foeHp > 0 ? duelEvent() : null;
    return `The last of them go back through the lock. The outer door closes from the other side, and the drive of the ${theShip(d.foe).replace(/^The /, '')} lights, and she breaks away from the hull.${lost}`;
  }
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
