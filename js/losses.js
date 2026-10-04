'use strict';

// Crew who can be lost. A hit on a crew member is a chance of dying, not only of being hurt: it is likelier in a severe
// hit (a lost beat of a raid, an accident on the ice), much likelier for someone already hurt and unhealed, and less likely
// with a medic aboard. A main character is marked in place of dying when the floor of main characters (fate.js) says so. A
// death goes on the record, leaves the berth open, grieves the crew who were close to them, and at the next landing opens
// a scene where you choose how the ship marks it; each of the crew takes that choice by who they are (barReact, bartopics.js).
// Loaded after boarders.js and fate.js; only called into at runtime.

const LOSS_BASE = 0.15, LOSS_MEDIC = 0.5, LOSS_NO_MEDIC = 1.3, LOSS_HURT = 2.5, LOSS_MAX = 0.6, MILD_SHARE = 1 / 3;
const lossOdds = (c, severe) => Math.min(LOSS_MAX, LOSS_BASE * (severe ? 1 : MILD_SHARE) * (roleHolder('medic') ? LOSS_MEDIC : LOSS_NO_MEDIC) * ((G.state.injured || {})[c.id] ? LOSS_HURT : 1));

// Returns 'dead' or 'marked'. A generated crew member is killed (boarders.js killCrew) and a main character goes through the floor.
function loseCrew(c, cause) {
  const st = G.state, name = fullName(c);
  if (c.cast) { if (castFate(c.cast, 'die', cause, 'Pulled from the wreck.') !== 'die') return 'marked'; }
  else { killCrew(c); (st.memorial = st.memorial || []).push({ key: c.id, name, day: st.day, place: system().name, cause: stripTags(cause) }); }
  for (const p of st.crew.map(person)) {  // the ones who were close to them take it hard, for as long as they were close
    const b = p && bond(c, p);
    if (b >= 3) p.mood = { kind: 'low', until: st.day + Math.min(30, 10 + 2 * b), text: `${c.first} is gone` };
  }
  c.dead = true;
  (st.mourn = st.mourn || []).push({ id: c.id, first: c.first, last: c.last, role: c.role, home: c.home });
  return 'dead';
}

// ---------- the scene afterwards ----------
// Each way of marking it is loved and hated by traits; the crew answer in their own voice.
const MOURN = [
  { label: 'Hold a service at the port, and stand the crew a meal (150 cr from the ship)', loves: ['pious', 'kind', 'homesick', 'generous'], hates: ['rude', 'greedy'], fund: 150,
    text: 'You find the port\'s chapel, a plain room with a rail and a window, and the crew stand in it for a while with their hands at their sides. Afterward there is a meal, and nobody eats much, and everybody stays.' },
  { label: 'Write to their family, and send a month\'s savings (100 cr of yours)', loves: ['kind', 'homesick', 'generous'], hates: ['greedy'], cost: 100, like: 'cap',
    text: 'It takes you an evening and four drafts. The letter says what they were like aboard, which was true, and that there is something enclosed, which is not enough. You send it on the next outbound packet.' },
  { label: 'Say a few words aboard, and go on', loves: ['talkative', 'kind', 'brave'], hates: [],
    text: 'You gather the crew in the galley and say what you can. It is short. Then everyone goes back to their post, and the berth stays empty at the table.' },
  { label: 'Say nothing, and keep working', loves: ['rude', 'greedy', 'brave'], hates: ['kind', 'pious', 'homesick', 'generous'],
    text: 'There is a run to make and a clock on it. You do not mention it, and neither does anyone else for a while, which is its own kind of mention.' },
];
function mournScene(m) {
  const st = G.state, h = hired(), cap = h && hiredCaptain();
  const who = `${m.first} ${m.last}`, crew = st.crew.map(person).filter(Boolean);
  return { title: 'After the Loss', personal: true,
    text: `${who}, the ${ROLE_NAMES[m.role] ? ROLE_NAMES[m.role].toLowerCase() : 'hand'}, is on the ship's memorial now, and the ship is in port. There is a berth with a made bunk and a locker nobody has opened. The crew are waiting to see what you do.`,
    choices: MOURN.map(o => ({ label: o.label, can: () => !o.cost || st.credits >= o.cost, run() {
      if (o.cost) st.credits -= o.cost;
      if (o.fund && h) h.fund = Math.max(0, h.fund - o.fund);
      const lines = [];
      for (const p of crew) { const r = barReact(p, o.loves, o.hates), n = r.n === 2 ? 1 : r.n === -1 ? -1 : 0; if (n) like(p, n, n > 0 ? `The captain marked ${m.first}'s death the way ${m.first} deserved.` : `The captain did not give ${m.first} their due.`); if (r.line && lines.length < 2) lines.push(r.line); }
      if (cap && o.like === 'cap') like(cap, 1, `You wrote to ${m.first}'s family.`);
      return `${o.text} ${lines.join(' ')}`.trim();
    } })),
  };
}

Mods.register({
  id: 'losses', name: 'Losses', builtin: true,
  init(M) {
    // At a port, once, the scene for the oldest loss: after the repairs, before the bar.
    M.on('landed', () => {
      const st = G.state;
      if (!hired() || !(st.mourn || []).length) return;
      if (G.dialog && G.nextEvent) return;  // nowhere to put it yet: it waits for the next port
      const ev = mournScene(st.mourn.shift());
      if (G.dialog) G.nextEvent = ev; else openEvent(ev);
    });
  },
});
