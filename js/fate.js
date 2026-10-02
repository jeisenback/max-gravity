'use strict';

// Life and loss for the main characters (cast.js): who is alive, marked or dead, and the record of the dead.
// State: st.cast[key].status ('dead'; missing means alive), st.cast[key].marks [{ text, day }] and
// st.memorial [{ key, day, place, cause }]. All optional, so an older save loads as alive and unmarked.
// castFate is the only way a main character is marked or dies, and it keeps the last CAST_FLOOR of them alive.
// Loaded after cast.js; only calls into the game at runtime.

const CAST_FLOOR = 2;

const castDead = key => ((G.state.cast || {})[key] || {}).status === 'dead';
// Main characters who have joined you, wherever they are posted, and are not dead.
const castLiving = () => Object.keys(G.state.cast || {}).filter(key => typeof G.state.cast[key].since === 'number' && !castDead(key));

// outcome is 'live', 'mark' or 'die'. A death that would leave fewer than CAST_FLOOR alive becomes a mark. A mark is a
// line of text and one lost point at their post, with the experience set back so it is not earned again the next day.
// Returns what happened.
function castFate(key, outcome, cause, markText) {
  if (castDead(key)) return 'die';
  if (outcome === 'die' && castLiving().filter(k => k !== key).length < CAST_FLOOR) outcome = 'mark';
  const st = G.state, p = castPerson(key), rec = castRec(key);
  if (outcome === 'mark') {
    (rec.marks = rec.marks || []).push({ text: markText, day: st.day });
    p.skills[p.role] = Math.max(0, p.skills[p.role] - 1);
    p.xp[p.role] = SKILL_STEPS[p.skills[p.role]];
    p.skill = p.skills[p.role];
  } else if (outcome === 'die') {
    rec.status = 'dead';
    st.crew = st.crew.filter(id => id !== p.id);
    if (st.injured) delete st.injured[p.id];
    for (const ship of fleet()) {
      if (ship.captain.pid !== p.id) continue;
      const hand = registerPerson(makeCrewCandidate(st.systemId));
      hand.opinion = 1;
      ship.captain = { pid: hand.id, wage: hand.wage, skill: hand.skill };
    }
    (st.memorial = st.memorial || []).push({ key, day: st.day, place: system().name, cause });
  }
  return outcome;
}

// A lost ship takes its main characters through the same floor: all but CAST_FLOOR of them die, and the rest come out
// of the wreck marked. Returns who died and who was spared.
function castShipLoss(cause) {
  const out = { dead: [], saved: [] };
  for (const p of castAboard()) (castFate(p.cast, 'die', cause, 'Pulled from the wreck.') === 'die' ? out.dead : out.saved).push(p.cast);
  return out;
}
