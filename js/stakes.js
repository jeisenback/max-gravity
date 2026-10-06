'use strict';

// What a hired hand can lose. Two things, both scenes at a port (happenings.js), for a hired hand only:
// - The captain's patience. A captain whose opinion of you falls to -2 says so once. If it has not recovered and falls to -3 at a later port,
//   you are put ashore: the chapter starts again with another captain, and you keep your savings and what you learned.
// - A feud that is not mended. Two of the crew who have had a feud scene (social.js) and have not made it up split the
//   ship: one of them gets off at the next port, and someone from the dock takes the berth. Loaded after captains.js.

// A random-choice player's lowest opinion of the captain in a game is 0 to 2 (measured over 20 chapters), so the bar is a hostile habit, not bad luck.
const PATIENCE = { warn: OPINION.ENEMY, end: OPINION.GRUDGE };  // -2 and -3
const SPLIT_BOND = -5, SPLIT_GAP = 30;  // a bond this low, and at most one split in this many days

function warningScene() {
  const h = hired(), cap = person(h.captain);
  h.warned = true;
  return {
    title: 'The Captain\'s Terms', personal: true,
    text: `Captain ${cap.last} waits until the hold is shut and the others have gone ashore. "I will say this once," the captain says. "I have had enough of the last few weeks. The next port like this one, the berth goes to somebody else."`,
    choices: [
      { label: 'Say you will do better', run() { like(cap, 1, 'You said you would do better, and said it plainly.'); return '"Then do," the captain says, and goes down the ramp.'; } },
      { label: 'Apologize for the worst of it', run() { like(cap, 2, 'You named what you got wrong and apologized for it.'); return 'You name two things, the log and the order, and say you were wrong in both. The captain listens to the end. "That is said, then," the captain says.'; } },
      { label: 'Say the captain has been unfair', run() { like(cap, -2, 'You told me I had been unfair.'); return '"Unfair," the captain says. The captain looks at you for some time. "We will see," the captain says.'; } },
    ],
  };
}

function putAshoreScene() {
  const cap = person(hired().captain);
  return {
    title: 'Put Ashore', personal: true,
    text: `Captain ${cap.last} is at the foot of the ramp with the articles in one hand and your bag in the other. "I said I would say it once," the captain says. "I did. The berth is not yours after this port." Your pay is settled to the day.`,
    choices: [{ label: 'Take the bag', run: putAshore }],
  };
}

// Back to the sign-on, with another captain. Savings and post experience come with you; the ship, the crew and the friends do not.
function putAshore() {
  const st = G.state, h = hired(), cap = person(h.captain), others = Object.keys(CAPTAINS).filter(k => k !== h.captainKey);
  const keep = { slot: Saves.current, name: captain().name, background: st.background, post: h.post, credits: st.credits, debt: h.debt, skill: { ...h.skill }, times: (st.putOff || 0) + 1 };
  startGame({ slot: keep.slot, background: keep.background, captain: keep.name, mode: 'hired', post: keep.post, captainKey: others.length ? pick(others) : undefined, credits: keep.credits, debt: keep.debt, skill: keep.skill, putOffBy: `Captain ${cap.last}` });
  G.state.putOff = keep.times;
  return null;
}

// The pair that has split worst: a feud that has been seen, a bond at the floor, and one of them not a main character.
function splitPair() {
  const st = G.state;
  if (st.relAt && st.relAt.split !== undefined && st.day - st.relAt.split < SPLIT_GAP) return null;
  let worst = null;
  for (const [a, b] of pairs(folk().filter(f => f.crew))) {
    const n = bond(a, b), movable = [a, b].filter(x => !x.p.cast);  // a main character does not leave
    if (n <= SPLIT_BOND && ((st.feuds || {})[bondKey(a, b)] || 0) >= 1 && movable.length && (!worst || n < worst.n)) worst = { a, b, n, movable };
  }
  return worst;
}

function splitScene() {
  const st = G.state, h = hired(), cap = person(h.captain), worst = splitPair();
  if (!worst) return null;
  const { a, b, movable } = worst, A = a.p.first, B = b.p.first;
  (st.relAt = st.relAt || {}).split = st.day;
  const choices = movable.map(x => ({ label: `Let ${x.p.first} go`, run: () => letGo(x, x === a ? b : a) }));
  choices.push({ label: 'Keep both', run() { addBond(a, b, -1); like(a.p, -1, 'You made me stay on a ship with ' + B + '.'); like(b.p, -1, 'You made me stay on a ship with ' + A + '.'); return '"Then we all sail," you say. Neither of them answers. At the next watch they take opposite ends of the galley.'; } });
  return {
    title: 'Not on the Same Ship', personal: true,
    text: `${A} and ${B} are both on the dock when you come down the ramp, a few meters apart. "One of us gets off here," ${A} says. "I will not stand another burn with that." ${B} says nothing.${hired() ? ` Captain ${cap.last} has put it to you: "They both talk to you. Who stays?"` : ''}`,
    choices,
  };
}

// One of them leaves the crew; someone from the dock takes the berth, so the ship is not short of a post.
function letGo(x, y) {
  const st = G.state, role = x.p.role, skill = x.p.skill || 1;
  st.crew = st.crew.filter(id => id !== x.id);
  x.p.location = st.planet;
  like(x.p, -3, `${y.p.first} and I could not share a ship, and you let me go.`);
  like(y.p, 2, `You kept me aboard when ${x.p.first} and I could not share a ship.`);
  const rep = makeCrewCandidate(st.systemId);
  rep.role = role; rep.skill = Math.max(1, skill - 1); rep.job = ROLE_NAMES[role] ? ROLE_NAMES[role].toLowerCase() : 'hand'; rep.mood = null;
  registerPerson(rep); st.crew.push(rep.id);
  homeLog(`${x.p.first} ${x.p.last} left the ship at ${st.planet}.`);
  return `${x.p.first} takes a bag and goes down the ramp without looking round. ${y.p.first} watches the ramp until it is clear. By the next watch bell a new ${rep.job}, ${rep.first}, has signed on for the berth.`;
}

Mods.register({
  id: 'stakes', name: 'What a hired hand can lose', builtin: true,
  init(M) {
    M.filter('happenings', (list, where) => {
      const h = hired();
      if (!h || where !== 'port') return list;
      const cap = person(h.captain), out = [];
      if (cap && cap.memories) {
        if (cap.opinion >= 0) h.warned = false;  // a captain who has come round forgets
        if (cap.opinion <= PATIENCE.end && h.warned) out.push({ tier: 0, weight: 1, via: 'crew', make: putAshoreScene });
        else if (cap.opinion <= PATIENCE.warn && !h.warned) out.push({ tier: 0, weight: 1, via: 'crew', make: warningScene });
      }
      if (splitPair()) out.push({ tier: 1, weight: 3, via: 'crew', make: splitScene });  // only when there is one, so a quiet port draws nothing extra
      return list.concat(out);
    });
  },
});
