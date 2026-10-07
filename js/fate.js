'use strict';

// Life and loss for the main characters (cast.js): who is alive, marked or dead, and the record of the dead.
// State: st.cast[key].status ('dead'; missing means alive), st.cast[key].marks [{ text, day }] and
// st.memorial [{ key, day, place, cause }]. All optional, so an older save loads as alive and unmarked.
// castFate is the only way a main character is marked or dies, and it keeps the last CAST_FLOOR of them alive.
// A fragile character (an authored first officer, CAST[key].fragile) is not part of that: they are not protected by the floor and do
// not count toward it, so a death outcome for them stays a death.
// Loaded after cast.js; only calls into the game at runtime.

const CAST_FLOOR = 2;
// The narrow build has no floor: a main character can die (#357). What keeps the chapter going is the captain, the first officer and the hand,
// and the warnings below, so a loss is seen coming.
const castFloor = () => (scopeNarrow() ? 0 : CAST_FLOOR);

const castDead = key => ((G.state.cast || {})[key] || {}).status === 'dead';
// Main characters who have joined you, wherever they are posted, and are not dead.
const castFragile = key => !!(CAST[key] && CAST[key].fragile);
const castLiving = () => Object.keys(G.state.cast || {}).filter(key => typeof G.state.cast[key].since === 'number' && !castDead(key) && !castFragile(key));

// Everyone in the people registry except main characters who have died, for anything that asks who still knows you.
const alivePeople = () => Object.values(G.state.people).filter(p => !(p.cast && castDead(p.cast)));

// outcome is 'live', 'mark' or 'die'. A death that would leave fewer than the floor (castFloor) alive becomes a mark. A mark is a
// line of text and one lost point at the skill named by role (the post they hold, if none is given), with the experience
// set back so it is not earned again the next day (at skill 0 that sets progress toward level 1 back to nothing).
// A character who has not joined you is ignored. Returns what happened.
function castFate(key, outcome, cause, markText, role) {
  if (castDead(key)) return 'die';
  const joined = ((G.state.cast || {})[key] || {}).since;
  if (typeof joined !== 'number') return 'live';
  if (outcome === 'die' && !castFragile(key) && castLiving().filter(k => k !== key).length < castFloor()) outcome = 'mark';
  const st = G.state, p = castPerson(key), rec = castRec(key);
  if (outcome === 'mark') {
    (rec.marks = rec.marks || []).push({ text: markText, day: st.day });
    const at = role || p.role;
    p.skills[at] = Math.max(0, p.skills[at] - 1);
    p.xp[at] = SKILL_STEPS[p.skills[at]];
    if (at === p.role) p.skill = p.skills[at];
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
    (st.memorial = st.memorial || []).push({ key, day: st.day, place: system().name, cause: stripTags(cause) });  // the ship's title is the player's: no markup
  }
  return outcome;
}

// A lost ship takes its main characters through the same floor: all but the floor's worth of them die, and the rest come out
// of the wreck marked. Returns who died and who was spared.
function castShipLoss(cause) {
  const out = { dead: [], saved: [] };
  for (const p of castAboard()) (castFate(p.cast, 'die', cause, 'Pulled from the wreck.') === 'die' ? out.dead : out.saved).push(p.cast);
  return out;
}

// The ladder before a loss (#357): hurt, then marked, then dead. A named person (a main character or the first officer) who is already marked
// and is hit again dies, and the first hurt says so, so that nobody is lost without a warning.
const secondStrike = c => !!(c && c.cast && marksOf(c).length);
const hurtWarning = c => (c && c.cast ? ` Another hit like that could kill ${c.first}.` : '');

// ---------- what the player sees ----------
// A character's marks beside them, the memorial as a list, and a line in the chapter's goodbye. Everything from a record is
// escaped here: the cause can carry the player's ship title, and an old or imported save carries whatever it carries.
const marksOf = p => (p.cast && ((G.state.cast || {})[p.cast] || {}).marks) || [];
const marksHtml = p => marksOf(p).map(m => `<div class="hint">Marked, ${esc(dateOf(m.day))}: ${esc(m.text)}</div>`).join('');
const memorialName = m => m.name || (CAST[m.key] ? `${CAST[m.key].first} ${CAST[m.key].last}` : String(m.key));
function memorialHtml() {
  const list = G.state.memorial || [];
  if (!list.length) return '';
  return `<h3>In memory</h3>${list.map(m => `<div class="hint"><b>${esc(memorialName(m))}</b>, ${esc(dateOf(m.day))}, ${esc(m.place)}: ${esc(m.cause)}</div>`).join('')}`;
}
// For the goodbye: who flew with you and did not live to see it. Names are authored, not typed by the player.
function memorialNote() {
  const names = (G.state.memorial || []).map(m => memorialName(m));
  return names.length ? ` ${names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} are` : `${names[0]} is`} not here to see it.` : '';
}

// A farewell (#356): what the hand did with a person who has a `farewell` in their cast entry (cast.js, captains/cato.js), read when they
// leave or die. Each fact is a flag on their record and the line it leaves behind, in priority order; at most two are shown, so it stays
// a scene. A person with no `farewell`, or no true fact, gets none.
function farewellFacts(key) {
  const d = CAST[key] && CAST[key].farewell, flags = (G.state.cast && G.state.cast[key] && G.state.cast[key].flags) || {};
  return d ? d.facts.filter(([id]) => flags[id]).slice(0, 2).map(f => f[1]) : [];
}

// They walk off at a port (game.js): their own leaving line, then the facts, and a record of it for the soak and the look back.
function walkOffScene(c, planet) {
  const st = G.state, d = CAST[c.cast].farewell;
  (st.departed = st.departed || []).push({ key: c.cast, day: st.day, place: planet.name, why: 'opinion' });
  return {
    title: 'Gone Ashore', personal: true,
    text: [d.walk.replace('{planet}', planet.name), ...farewellFacts(c.cast)].join('</p><p>'),
    choices: [{ label: 'Close the hatch', run: () => 'The berth is empty.' }],
  };
}
