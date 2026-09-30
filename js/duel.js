'use strict';

// Combat on the console (design: COMBAT.md). "Battle stations" on a contact plays out as
// up to eight exchanges of threat and answer, fought by a crewed gunner or, with none,
// by you. The ship with the initiative plays a threat, the other an answer, both face
// down. A threat that lands keeps the initiative; one that is stopped passes it. Each
// ship's decks are built from its fit, so torpedoes, PDCs, pilot and crew all count.
// Fits and discards are public; hands are not. Loaded before game.js; only calls into
// it at runtime.

const DUEL_CARDS = {
  torp: { name: 'Torpedo', low: 'torpedo', threat: true },
  gun: { name: 'Gun run', low: 'gun run', threat: true },
  board: { name: 'Boarding run', low: 'boarding run', threat: true },
  pdc: { name: 'PDC screen', low: 'PDC screen' },
  burn: { name: 'Evasive burn', low: 'evasive burn' },
  locks: { name: 'Crew to the locks', low: 'crew to the locks' },
};
const DUEL_THREATS = ['torp', 'gun', 'board'], DUEL_ANSWERS = ['pdc', 'burn', 'locks'];
// DUEL_OUTCOME[threat][answer]
const DUEL_OUTCOME = {
  torp: { pdc: 'stop', burn: 'half', locks: 'full' },
  gun: { pdc: 'half', burn: 'stop', locks: 'full' },
  board: { pdc: 'half', burn: 'full', locks: 'stop' },
};
// Hull points a threat does when it lands in full; half is half. Until the boarding
// duel exists, boarders who get across sabotage what they can and pull back.
const DUEL_HIT = { torp: 4, gun: 2, board: 2 };
const DUEL_ROUNDS = 8, DUEL_HAND = 3, ARMOR_PER_POINT = 0.07;
const FOE_CREW = { raider: 2, corsair: 3, cutter: 4, destroyer: 6 };
// Each kind of captain leans toward a card, on top of the odds.
const FOE_LEAN = { pirate: 'board', patrol: 'gun', bounty: 'burn', hunter: 'torp' };

// A crewed gunner fights the duel. With nobody on the post, or the post taken over, you do,
// without a gunner's skill.
const duelGunner = () => (postMode('gunner') === 'crewed' ? roleHolder('gunner') : null);
const helmName = () => (roleHolder('pilot') ? roleName('pilot') : 'The helm');

const hitPoints = (threat, outcome) => (outcome === 'full' ? DUEL_HIT[threat] : outcome === 'half' ? DUEL_HIT[threat] / 2 : 0);

// The two decks, from the fit.
function playerCounts() {
  const st = G.state, s = ship(), crew = st.crew.length;
  return {
    torp: s.launcher ? Math.min(TORP_MAX, st.torpedoes || 0) : 0,
    // The engineer's power shares, the fire control's wear and any refit all change the deck (#32, #33, #34).
    gun: Math.max(1, 2 + s.guns + Math.round((power().weapons - 30) / 20) - Math.round((1 - perf('fire')) * 4) + (refits().fire || 0)),
    board: crew >= 2 ? 1 + (duelGunner() ? 1 : 0) : 0,
    pdc: 1 + 2 * ((st.outfits || {}).pdc || 0),
    burn: Math.max(1, 2 + roleSkill('pilot') + Math.round((power().drive - 40) / 20)),
    locks: 1 + Math.floor(crew / 2),
  };
}
function foeCounts(foe) {
  const s = SHIPS[foe.shipId], crew = FOE_CREW[foe.shipId] || 3, heavy = s.guns >= 2;
  return {
    torp: foe.torps || 0, gun: 2 + s.guns, board: crew >= 2 ? 1 + (heavy ? 1 : 0) : 0,
    pdc: 1 + (heavy ? 2 : 0), burn: 3, locks: 1 + Math.floor(crew / 2),
  };
}

function shuffleCards(a) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
function makeSide(counts) {
  const pile = types => ({ deck: shuffleCards(types.flatMap(t => Array(counts[t]).fill(t))), hand: [], discard: [] });
  const side = { counts, spent: 0, threat: pile(DUEL_THREATS), answer: pile(DUEL_ANSWERS) };
  drawHand(side.threat); drawHand(side.answer);
  return side;
}
function drawHand(p) {
  while (p.hand.length < DUEL_HAND) {
    if (!p.deck.length) { if (!p.discard.length) return; p.deck = shuffleCards(p.discard); p.discard = []; }
    p.hand.push(p.deck.pop());
  }
}
// Plays a card from hand. A torpedo is spent for good; anything else is discarded.
function playCard(side, t) {
  const p = side[DUEL_CARDS[t].threat ? 'threat' : 'answer'];
  const i = p.hand.indexOf(t);
  if (i < 0) return;
  p.hand.splice(i, 1);
  if (t === 'torp') side.spent++; else p.discard.push(t);
  drawHand(p);
}
// Cards of a type the other side can't account for: in the deck or the hand.
const unseen = (side, t) => side.counts[t] - (t === 'torp' ? side.spent : side[DUEL_CARDS[t].threat ? 'threat' : 'answer'].discard.filter(x => x === t).length);

// The enemy's play: expected value against the player's likely card, from public
// information only (the player's fit and discards), picked with a softmax.
function foePlay() {
  const d = G.duel, attacking = d.init === 'foe', mine = attacking ? DUEL_THREATS : DUEL_ANSWERS, theirs = attacking ? DUEL_ANSWERS : DUEL_THREATS;
  const hand = [...new Set(d.them[attacking ? 'threat' : 'answer'].hand)];
  const odds = theirs.map(t => Math.max(0, unseen(d.me, t))), total = odds.reduce((a, b) => a + b, 0) || 1;
  const scores = hand.map(t => {
    let v = t === FOE_LEAN[d.spec.kind] ? 0.5 : 0;
    theirs.forEach((o, i) => {
      const out = attacking ? DUEL_OUTCOME[t][o] : DUEL_OUTCOME[o][t], pts = hitPoints(attacking ? t : o, out);
      v += (odds[i] / total) * (attacking ? pts + (out === 'stop' ? -1 : 0.5) : -pts + (out === 'stop' ? 1 : -0.5));
    });
    return v - (t === 'torp' ? 0.3 : 0);
  });
  const w = scores.map(s => Math.exp(s)), sum = w.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < hand.length; i++) if ((r -= w[i]) < 0) return hand[i];
  return hand[hand.length - 1] || mine[0];
}

function startDuel(spec, flee) {
  const st = G.state, foe = makeEnemy(spec);
  const foeHp = Math.max(4, Math.min(10, Math.round(foe.maxArmor / 30)));
  // Shields: with a healthy 40% or more of the reactor behind them, the first half hit does nothing.
  // Worn sensors blur what you can tell of her cards, by a card either way.
  G.duel = { spec, foe, foeHp, foeMax: foeHp, round: 0, init: 'foe', me: makeSide(playerCounts()), them: makeSide(foeCounts(foe)),
    deflector: power().shields >= 40 && perf('shields') >= 0.9,
    blur: Object.fromEntries(Object.keys(DUEL_CARDS).map(t => [t, perf('sensors') < 0.8 ? randInt(-1, 1) : 0])) };
  let text = `Battle stations. ${duelGunner() ? `${roleName('gunner')} takes the guns.` : 'You take the guns yourself.'} ${theShip(foe)} made the intercept, and she has the initiative.`;
  if (flee) {
    if (Math.random() < 0.4 + 0.12 * roleSkill('pilot')) { G.duel = null; return `${helmName()} winds the drive past the redline and opens the range. Their plume fades.`; }
    st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.08));
    text = `${helmName()} runs, but ${theShip(foe).replace(/^The/, 'the')} gets a burst in first. Battle stations.`;
  }
  G.nextEvent = duelEvent();
  return text;
}

function duelEvent() {
  const d = G.duel, st = G.state, foe = theShip(d.foe), attacking = d.init === 'me';
  const hand = d.me[attacking ? 'threat' : 'answer'].hand, types = [...new Set(hand)];
  const list = ts => ts.map(t => [t, Math.max(0, unseen(d.them, t) + d.blur[t])]).filter(([, n]) => n > 0).map(([t, n]) => `${DUEL_CARDS[t].low} x${n}`).join(', ') || 'nothing';
  const read = attacking
    ? `You have the initiative: pick a threat. She could still answer with ${list(DUEL_ANSWERS)}.`
    : `${foe} has the initiative: pick an answer. She could still throw ${list(DUEL_THREATS)}.`;
  return {
    title: `Contact: exchange ${d.round + 1} of ${DUEL_ROUNDS}`,
    text: `${foe}: ${'#'.repeat(d.foeHp)}${'-'.repeat(Math.max(0, d.foeMax - d.foeHp))}. Your armor ${st.armor}/${ship().armor}. ${read} PDCs stop torpedoes, burns stop gun runs, crew at the locks stop boarders.`,
    choices: types.map(t => ({ label: `${DUEL_CARDS[t].name}${hand.filter(x => x === t).length > 1 ? ` (${hand.filter(x => x === t).length})` : ''}`, run: () => duelExchange(t, foePlay()) })),
  };
}

// One line for each threat and how it went, from the attacker's side: stopped, half, full.
const DUEL_LINES = {
  me: {
    torp: ['The torpedo goes down the line, and her point defense shreds it short.', 'The torpedo chases her through a hard burn and bursts close. Not clean, but it hurts.', 'The torpedo walks straight in. She never turned a gun on it.'],
    gun: ['The guns rake the space where she was. She is already burning clear.', 'Her PDCs swing onto your rounds and trade fire. Some of yours get through.', 'The guns walk a long burst down her flank.'],
    board: ['Your boarders cross and find her crew waiting at the locks. They pull back.', 'Her PDCs chew up the boarding line, but a charge still goes off on her hull.', 'Your boarders get across while she is busy burning, cut what they can, and pull back.'],
  },
  foe: {
    torp: ['Her torpedo comes in fast, and your PDCs catch it a kilometer out.', '{pilot} throws the ship sideways. The torpedo bursts close enough to shake the hull.', 'Her torpedo walks straight in while your crew wait at the locks.'],
    gun: ['{pilot} burns hard, and her burst goes wide.', 'Your PDCs trade fire with her guns. Some of hers get through.', 'Her guns rake your hull while your crew wait at the locks.'],
    board: ['Her boarders hit the lock and find your crew waiting. They go back the way they came.', 'Your PDCs chew up her boarding line, but a charge still goes off on your hull.', 'Her boarders get across while you are burning, cut what they can, and pull back.'],
  },
};

// Settles a kill, and says what it paid.
function duelFinish(foe) {
  const st = G.state, pre = st.credits;
  settleKill(foe, true);
  return st.credits > pre ? ` Bounty +${fmt(st.credits - pre)} cr.` : '';
}

// A beaten ship that can be boarded (boarding.js) drifts, disabled, beside you.
function duelDisabledEvent(f) {
  const p = G.player;
  Object.assign(f, { disabled: true, armor: f.maxArmor * 0.15 }, p ? { x: p.x, y: p.y, vx: p.vx, vy: p.vy } : {});
  return {
    title: `${f.name} (disabled)`,
    text: 'Her drive is dark and her guns are silent. You can board her, finish her, or leave her to drift.',
    choices: [
      { label: 'Close in and board', run: () => { G.nextEvent = boardingEvent(f); return 'You match her drift and put the grapples out.'; } },
      { label: 'Finish her', run: () => `${theShip(f)} breaks up on your screens.${duelFinish(f)}` },
      { label: 'Leave her drifting', run: () => 'You leave her drifting behind you. The burn goes on.' },
    ],
  };
}

function duelExchange(mine, theirs) {
  const d = G.duel, st = G.state, max = ship().armor, foe = theShip(d.foe), attacker = d.init;
  const threat = attacker === 'me' ? mine : theirs, answer = attacker === 'me' ? theirs : mine;
  let out = DUEL_OUTCOME[threat][answer], pts = hitPoints(threat, out);
  const before = st.armor;
  let soaked = false;
  if (attacker === 'foe' && out === 'half' && d.deflector) { pts = 0; d.deflector = false; soaked = true; }  // the capacitor takes it
  playCard(d.me, mine); playCard(d.them, theirs);
  if (mine === 'torp') st.torpedoes = Math.max(0, (st.torpedoes || 0) - 1);
  if (attacker === 'me') d.foeHp = Math.max(0, d.foeHp - pts);
  else st.armor = Math.max(1, st.armor - Math.round(max * ARMOR_PER_POINT * pts));
  if (out === 'stop') d.init = attacker === 'me' ? 'foe' : 'me';
  d.round++;
  if (mine === 'gun' || mine === 'torp') wear('fire', mine === 'gun' ? 1.5 : 0.5);  // wear, from use (wear.js)
  if (attacker === 'foe' && pts) wear('shields', 1.5);
  let text = DUEL_LINES[attacker][threat][['stop', 'half', 'full'].indexOf(out)].replace(/\{pilot\}/g, helmName())
    + ` She played ${DUEL_CARDS[theirs].low}.${attacker === 'me' && pts ? ` ${foe} takes ${pts >= 4 ? 'a heavy hit' : 'a hit'}.` : ''}${before > st.armor ? ` Armor -${before - st.armor}.` : ''}`
    + (soaked ? ' The deflector capacitor soaks it.' : '') + (out === 'stop' ? ` ${d.init === 'me' ? 'You have' : 'She has'} the initiative.` : '');
  if (d.foeHp <= 0 && canBeDisabled(d.foe)) {
    text += ` ${foe} is dead in space, drifting.`;
    G.nextEvent = duelDisabledEvent(d.foe);
  } else if (d.foeHp <= 0) {
    text += ` ${foe} is finished.${duelFinish(d.foe)}`;
  } else if (st.armor <= max * 0.25) {
    const c = Math.min(st.credits, Math.max(200, Math.round(st.credits * 0.1)));
    st.credits -= c;
    text += ` The hull cannot take another round. ${helmName()} calls it, and you yield${c ? `, paying ${fmt(c)} cr to be let go` : ''}.`;
    d.foeHp = -1;
  } else if (d.round >= DUEL_ROUNDS) {
    text += ` Neither of you can finish it, and ${foe} breaks off.`;
    d.foeHp = -1;
  }
  if (d.foeHp > 0) G.nextEvent = duelEvent(); else G.duel = null;
  return text;
}
