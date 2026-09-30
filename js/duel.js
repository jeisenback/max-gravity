'use strict';

// Combat the gunner settles on the console. When the gunner post is crewed, "Battle
// stations" on a contact plays out as up to five rounds of rock, paper, scissors instead
// of the real-time fight (engage.js, which a manual gunner still gets): run guns beats
// boarders, run dark beats guns, and boarders catch a ship that runs. Crew and weapons
// decide how good each stance is and how well you can read the other captain.
// Loaded before game.js; only calls into it at runtime.

const STANCES = {
  guns: { name: 'Run guns', beats: 'board' },
  dark: { name: 'Run dark', beats: 'guns' },
  board: { name: 'Ready boarders', beats: 'dark' },
};
const DUEL_ROUNDS = 5;
// How each kind of captain tends to play, in percent.
const FOE_PLAY = {
  pirate: { guns: 50, board: 30, dark: 20 },
  patrol: { guns: 60, board: 10, dark: 30 },
  bounty: { guns: 35, board: 15, dark: 50 },
  hunter: { guns: 55, board: 35, dark: 10 },
};
// One line for each stance and how it went: lost, level, won.
const DUEL_LINES = {
  guns: ['{foe} closes inside your guns, and the boarding lines are out before {gunner} can get the mounts around.', 'Both ships trade fire and nobody gets the better of it.', '{foe} sends her boarders across, and {gunner} cuts the lines and the plating under them with a long, patient burst.'],
  dark: ['You cut the drive glow and turn away, and {foe} is already there, guns out, waiting for exactly that.', 'You both go dark. For a long minute nobody knows where anybody is.', '{foe} opens fire on the place you were. You are somewhere else, and the burst goes wide.'],
  board: ['Your boarders are in their couches, ready, and {foe} never gives them a hull to grab. She opens the range instead.', 'The two ships tangle for a minute, and neither crew gets across.', '{foe} runs, and runs into the grapples. Your boarders are over the rail before she can spool her drive.'],
};

const clampEdge = x => Math.max(0.1, Math.min(0.9, x));
const duelEdges = () => {
  const g = roleSkill('gunner'), p = roleSkill('pilot');
  return {
    guns: clampEdge(0.25 + 0.1 * playerGuns() + 0.08 * g),
    dark: clampEdge(0.25 + 0.1 * p + ship().accel / 1000),
    board: clampEdge(0.2 + 0.05 * G.state.crew.length + 0.05 * g),
  };
};

// What the crew make of the other captain: near the truth when the crew are good.
function duelHints(kind) {
  const amp = Math.max(3, 18 - 4 * (roleSkill('gunner') + roleSkill('pilot')));
  return Object.fromEntries(Object.entries(FOE_PLAY[kind] || FOE_PLAY.pirate).map(([k, v]) => [k, Math.max(5, Math.round((v + rand(-amp, amp)) / 5) * 5)]));
}
const foeStance = kind => {
  let r = Math.random() * 100;
  for (const [k, v] of Object.entries(FOE_PLAY[kind] || FOE_PLAY.pirate)) { if ((r -= v) < 0) return k; }
  return 'guns';
};

function startDuel(spec, flee) {
  const st = G.state, foe = makeEnemy(spec);
  G.duel = { spec, foe, foeHp: Math.max(3, Math.min(7, Math.round(foe.maxArmor / 40))), round: 0, hints: duelHints(spec.kind) };
  let text = `Battle stations. ${roleName('gunner')} takes the guns.`;
  if (flee) {
    if (Math.random() < 0.4 + 0.12 * roleSkill('pilot')) { G.duel = null; return `${roleName('pilot')} winds the drive past the redline and opens the range. Their plume fades.`; }
    st.armor = Math.max(1, st.armor - Math.round(ship().armor * 0.08));
    text = `${roleName('pilot')} runs, but ${theShip(foe).replace(/^The/, 'the')} gets a burst in first. Battle stations.`;
  }
  G.nextEvent = duelEvent();
  return text;
}

function duelEvent() {
  const d = G.duel, st = G.state, edges = duelEdges(), foe = theShip(d.foe);
  const hint = k => `${STANCES[k].name.toLowerCase()} ~${d.hints[k]}%`;
  return {
    title: `Contact: round ${d.round + 1} of ${DUEL_ROUNDS}`,
    text: `${foe}: ${'#'.repeat(d.foeHp)}${'-'.repeat(Math.max(0, 7 - d.foeHp))}. Your armor ${st.armor}/${ship().armor}. ${roleName('gunner')} and ${roleName('pilot')} read her as likely to ${hint('guns')}, ${hint('board')}, ${hint('dark')}.`,
    choices: Object.keys(STANCES).map(k => ({ label: `${STANCES[k].name} (edge ${edges[k].toFixed(2)})`, run: () => duelRound(k, foeStance(d.spec.kind)) })),
  };
}

function duelRound(mine, theirs) {
  const d = G.duel, st = G.state, max = ship().armor, luck = Math.random() < duelEdges()[mine];
  const res = mine === theirs ? 0 : STANCES[mine].beats === theirs ? 1 : -1;
  const hit = res > 0 ? (luck ? 2 : 1) : res === 0 && luck ? 1 : 0;
  const took = res < 0 ? (luck ? 0.06 : 0.12) : res === 0 && !luck ? 0.05 : 0;
  const before = st.armor, foe = theShip(d.foe);
  d.foeHp = Math.max(0, d.foeHp - hit);
  st.armor = Math.max(1, st.armor - Math.round(max * took));
  d.round++;
  let text = DUEL_LINES[mine][res + 1].replace(/\{foe\}/g, foe).replace(/\{gunner\}/g, roleName('gunner'))
    + ` They played ${STANCES[theirs].name.toLowerCase()}.${hit ? ` ${foe} takes ${hit > 1 ? 'a heavy hit' : 'a hit'}.` : ''}${before > st.armor ? ` Armor -${before - st.armor}.` : ''}`;
  if (d.foeHp <= 0) {
    const pre = st.credits;
    settleKill(d.foe, true);
    text += ` ${foe} is finished.${st.credits > pre ? ` Bounty +${fmt(st.credits - pre)} cr.` : ''}`;
  } else if (st.armor <= max * 0.25) {
    const c = Math.min(st.credits, Math.max(200, Math.round(st.credits * 0.1)));
    st.credits -= c;
    text += ` The hull cannot take another round. ${roleName('pilot')} calls it, and you yield${c ? `, paying ${fmt(c)} cr to be let go` : ''}.`;
    d.foeHp = -1;
  } else if (d.round >= DUEL_ROUNDS) {
    text += ` Neither of you can finish it, and ${foe} breaks off.`;
    d.foeHp = -1;
  }
  if (d.foeHp > 0) G.nextEvent = duelEvent(); else G.duel = null;
  return text;
}
