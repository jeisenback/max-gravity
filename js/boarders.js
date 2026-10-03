'use strict';

// Repelling boarders: the authored fight for a hired hand when a boarding run lands in the ship duel (duel.js). Three
// places, the lock, the corridor and the bridge, and a track between them. Each exchange you choose a tactic (hold beats
// go-round, rush beats hold, go-round beats rush) or do the job of your own post. Winning an exchange pushes them back a
// place and losing it lets them in a place; out of the lock and they are repelled, onto the bridge and they have the ship.
// Casualties come with it: someone is hurt (an injured hand's perk stops until treated, and a hurt hand works a level
// lower), and one who is hurt twice in a fight is dead if generated, or marked if a main character (fate.js). Loaded
// after duel.js; only called into at runtime.

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
const REPEL_LEAN = { pirate: { rush: 0.5, hold: 0.2, flank: 0.3 }, patrol: { hold: 0.5, rush: 0.2, flank: 0.3 } };
const REPEL_HURT = { lose: 0.45, win: 0.15 };  // the chance someone is hurt in an exchange, by how it went

const handHurt = () => !!(hired() && hired().hurtUntil > G.state.day);

// The fight: where they are (0 the lock, 1 the corridor, 2 the bridge), how many they are, who is hurt and who has fallen.
function repelStart(d, outcome) {
  const crew = FOE_CREW[d.foe.shipId] || 3, healthy = G.state.crew.filter(id => !(G.state.injured || {})[id]).length;
  return { d, pos: outcome === 'full' ? 1 : 0, boarders: Math.max(1, crew + (outcome === 'full' ? 1 : -1)), base: Math.min(6, healthy + 1), hurt: new Set(), dead: [], marked: [], youHurt: false, round: 0, lines: [] };
}
const repelStanding = s => Math.max(1, s.base - s.hurt.size - s.dead.length);

function repelEvent(d, outcome) { return repelScene(repelStart(d, outcome)); }

function repelScene(s) {
  const h = hired(), post = h.post, spec = REPEL_POST[post];
  const choices = Object.entries(REPEL_TACTICS).map(([k, t]) => ({ label: t.label, run: () => repelStep(s, k) }));
  choices.push({ label: `[${POSTS[post].name}] ${spec.label}`, run: () => repelStep(s, 'post') });
  return {
    title: REPEL_TITLES[s.pos], personal: true, via: 'crew',
    text: `${REPEL_OPENINGS[s.pos][s.round % 2]}</p><p>Boarders: ${s.boarders}. With you: ${repelStanding(s) - 1}.`,
    choices,
  };
}

// One exchange. Returns what happened; sets the next scene, or settles the fight and goes back to the duel.
function repelStep(s, kind) {
  const h = hired(), post = h.post, theirs = kind === 'post' ? null : pickWeighted(REPEL_LEAN[s.d.foe.kind] || { rush: 0.34, hold: 0.33, flank: 0.33 });
  let result, text;  // 'win', 'lose' or 'tie'
  if (kind === 'post') {
    result = Math.random() < Math.min(0.85, 0.5 + 0.1 * skillLevel(post)) ? 'win' : 'lose';
    text = REPEL_POST[post][result];
  } else if (kind === theirs) {
    const mine = repelStanding(s);
    result = mine > s.boarders ? 'win' : mine < s.boarders ? 'lose' : 'tie';
    text = result === 'tie' ? REPEL_TIE : REPEL_TACTICS[kind][result];
  } else {
    result = REPEL_TACTICS[kind].beats === theirs ? 'win' : 'lose';
    text = REPEL_TACTICS[kind][result];
  }
  if (result === 'win') { s.pos--; if (kind === 'post' && post === 'gunner') s.boarders = Math.max(1, s.boarders - 1); }
  if (result === 'lose') s.pos++;
  s.round++;
  if (result !== 'tie' && Math.random() < REPEL_HURT[result]) text += ` ${repelCasualty(s)}`;
  if (s.pos < 0 || s.pos > 2) return `${text} ${repelSettle(s)}`;
  G.nextEvent = repelScene(s);
  return text;
}

const pickWeighted = table => { let r = Math.random() * Object.values(table).reduce((a, b) => a + b, 0); for (const [k, w] of Object.entries(table)) if ((r -= w) < 0) return k; return Object.keys(table)[0]; };

// Someone goes down. The hand can be hurt but not killed. A crew member hurt twice in one fight is dead, or marked if a main character.
function repelCasualty(s) {
  const st = G.state, pool = [...st.crew.filter(id => !(st.injured || {})[id] || s.hurt.has(id)), 'you'];
  const who = pick(pool);
  if (who === 'you') {
    const h = hired(), again = s.youHurt || handHurt();
    h.hurtUntil = st.day + (again ? 18 : 12);
    s.youHurt = true;
    return again ? 'You are hurt again, and you stay down. It will be some time before you are any use.' : 'You are hurt. For a while your work will be a level worse.';
  }
  const c = person(who);
  if (s.hurt.has(who)) {
    if (c.cast) {
      castFate(c.cast, 'mark', `Hurt twice repelling boarders near ${system().name}.`, 'Carried off the bridge after the boarding.');
      s.marked.push(c);
      return `${c.first} is hit again and does not get up. ${c.first} is alive, and ${c.first} is not fit to work.`;
    }
    killCrew(c);
    s.dead.push(c);
    return `${c.first} is hit again and does not get up.`;
  }
  (st.injured = st.injured || {})[who] = true;
  s.hurt.add(who);
  return `${c.first} is hurt.`;
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
  return `They are on the bridge. Captain ${cap.last} gives them the code to the strongbox because there is no choice, and they take ${fmt(taken)} cr of the ship's fund and go. The ship still flies.${lost}`;
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
