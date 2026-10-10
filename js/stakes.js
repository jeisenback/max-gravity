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
  const h = hired(), cap = person(h.captain), say = (key, vars) => sceneSay('scene:warning', key, { last: cap.last, ...vars });
  h.warned = true;
  return {
    title: say('title'), personal: true,
    text: say('text'),
    choices: [
      { label: say('c0.label'), run() { like(cap, 1, 'You said you would do better, and said it plainly.'); return say('c0.result'); } },
      { label: say('c1.label'), run() { like(cap, 2, 'You named what you got wrong and apologized for it.'); return say('c1.result'); } },
      { label: say('c2.label'), run() { like(cap, -2, 'You told me I had been unfair.'); return say('c2.result'); } },
    ],
  };
}

function putAshoreScene() {
  const cap = person(hired().captain), facts = goodbyeFacts(hired().flags || {}).slice(0, 2).map(f => f.line).join(' '), say = key => sceneSay('scene:put-ashore', key, { last: cap.last });
  return {
    title: say('title'), personal: true,
    text: `${say('text')}${facts ? `</p><p>${facts}` : ''}`,  // what the hand lived through is read from the record
    choices: [{ label: say('c0.label'), run: putAshore }],
  };
}

// What the dock says of the ship you were put off: the first true fact, else the plain one.
const CARRIED = [
  ['iceBad', n => `On the dock they are still talking about the ice run on Captain ${n}'s ship.`],
  ['iceClean', n => `On the dock they say Captain ${n}'s ship brought the ice in clean.`],
  ['hurt', n => `On the dock they say Captain ${n}'s hand was hurt on duty.`],
  ['raided', n => `On the dock they say Captain ${n}'s ship fought off a raid.`],
];
function carriedLine(flags, last) {
  const hit = CARRIED.find(([id]) => flags[id]);
  return hit ? hit[1](last) : `On the dock they know whose ship you were put off.`;
}

// The hand's death (#357), the ending of the chapter: what happened, the look back (hired.js, which reads the record), and a new game.
function handDeathScene(how) {
  const cap = person(hired().captain), say = key => sceneSay('scene:hand-death', key, { last: cap.last });
  return {
    title: say('title'), personal: true,
    text: [say(`text.${how}`), say('log'), chapterRecap().text].join('</p><p>'),
    choices: [{ label: say('c0.label'), run: beginAgain }],
  };
}
// A new hand, in the same slot and under the same name, with another captain if there is one and nothing carried but a line on the dock.
function beginAgain() {
  const st = G.state, h = hired(), cap = person(h.captain), others = Object.keys(CAPTAINS).filter(k => k !== h.captainKey);
  startGame({
    slot: Saves.current,
    background: st.background,
    captain: captain().name,
    mode: 'hired',
    post: h.post,
    captainKey: others.length ? pick(others) : undefined,
    carried: `On the dock they say the hand on Captain ${cap.last}'s ship did not come back.`,
  });
  return null;
}

// The captain is lost on the bridge (#357): the articles end with the captain, so the hand goes ashore as when put off, with the same things kept.
function captainLostScene() {
  const say = key => sceneSay('scene:captain-lost', key, { last: person(hired().captain).last });
  return {
    title: say('title'), personal: true,
    text: say('text'),
    choices: [{ label: say('c0.label'), run: () => putAshore(true) }],
  };
}

// Back to the sign-on, with another captain. Savings and post experience come with you; the ship, the crew and the friends do not.
// lost: the captain did not come back, so nobody put the hand ashore.
function putAshore(lost) {
  const st = G.state, h = hired(), cap = person(h.captain), others = Object.keys(CAPTAINS).filter(k => k !== h.captainKey);
  const keep = { slot: Saves.current, name: captain().name, background: st.background, post: h.post, credits: st.credits, debt: h.debt, skill: { ...h.skill }, times: (st.putOff || 0) + (lost ? 0 : 1) };
  startGame({
    slot: keep.slot,
    background: keep.background,
    captain: keep.name,
    mode: 'hired',
    post: keep.post,
    captainKey: others.length ? pick(others) : undefined,
    credits: keep.credits,
    debt: keep.debt,
    skill: keep.skill,
    [lost ? 'captainLost' : 'putOffBy']: `Captain ${cap.last}`,
    carried: lost ? `On the dock they say Captain ${cap.last} did not come back from the bridge.` : carriedLine(h.flags || {}, cap.last)
  });
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
  const { a, b, movable } = worst, A = a.p.first, B = b.p.first, say = (key, vars) => sceneSay('scene:split', key, { A, B, last: cap.last, ...vars });
  (st.relAt = st.relAt || {}).split = st.day;
  const choices = movable.map(x => ({ label: say('let.label', { name: x.p.first }), run: () => letGo(x, x === a ? b : a) }));
  choices.push({
    label: say('keep.label'),
    run() { addBond(a, b, -1); like(a.p, -1, 'You made me stay on a ship with ' + B + '.'); like(b.p, -1, 'You made me stay on a ship with ' + A + '.'); return say('keep.result'); }
  });
  return {
    title: say('title'), personal: true,
    text: `${say('text')}${hired() ? ` ${say('ask')}` : ''}`,
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
  return sceneSay('scene:split', 'let.result', { gone: x.p.first, stays: y.p.first, job: rep.job, new: rep.first });
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
