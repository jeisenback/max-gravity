'use strict';

// The crew teach the hired hand's gunner moves on a burn (docs/superpowers/specs/2026-10-23-gunner-moves-design.md, section 2): whoever holds the teaching post
// (the engineer for vent, the pilot for lead, the first officer for split) shows the hand one, as a downtime activity, once the hand works the gunner post at the
// move's level and the teacher trusts them. Taking it teaches the move (career().moves, which fightui.js offers in a fight) and a few gunner points; not taking it
// leaves it to a later burn. The words are the lines of scene:gunner-moves (hiredscenes.js). Loaded after shiplife.js (ACTIVITIES) and hired.js.

// Who teaches each move (a post, or the first officer's role) and the gunner level it is taught at.
const MOVE_TEACH = { vent: { post: 'engineer', level: 1 }, lead: { post: 'pilot', level: 1 }, split: { role: 'xo', level: 2 } };

// The first move, in vent, lead, split order, that is due for the career `c` at `gunnerLevel`: a gunner who does not know it yet, at its level, whose teacher
// (`teacher(id)`, a person or none) has an opinion of them (`opinionOf`) of at least OPINION.TRUSTED. Pure: it runs in plain Node.
function moveDue(c, gunnerLevel, teacher, opinionOf) {
  if (!c || c.post !== 'gunner') return null;
  const known = c.moves || [];  // a save from before has none
  for (const [id, t] of Object.entries(MOVE_TEACH)) {
    if (gunnerLevel < t.level || known.includes(id)) continue;
    const p = teacher(id);
    if (p && opinionOf(p) >= OPINION.TRUSTED) return id;
  }
  return null;
}

// The person who would teach a move: the post's holder, or the first officer, with the injured left out (stations.js, crew.js).
const moveTeacher = id => (MOVE_TEACH[id].post ? postHolder(MOVE_TEACH[id].post) : roleHolder(MOVE_TEACH[id].role));
const moveNow = () => (hired() ? moveDue(career(), skillLevel('gunner'), moveTeacher, p => p.opinion || 0) : null);  // a hired hand's only: no move is taught to an owner
const teachSay = (key, vars) => sceneSay('scene:gunner-moves', key, vars);

const teachLabel = id => teachSay(`${id}.label`, { first: moveTeacher(id).first });
// The move due now, if it is the one `shown` names (the label the menu was drawn with; none: whatever is due). A teacher hurt since the menu was drawn
// shuts the choice rather than teach another move.
const teachDue = shown => { const id = moveNow(); return id && (shown === undefined || teachLabel(id) === shown) ? id : null; };

ACTIVITIES.teach = {
  hiredOnly: true,
  get label() { const id = moveNow(); return id ? teachLabel(id) : teachSay('idle.label'); },
  can: shown => !!teachDue(shown),
  run(shown) {
    const id = teachDue(shown);
    if (!id) return '';
    const c = career(), who = moveTeacher(id);
    c.moves = [...(c.moves || []), id];
    gainSkill('gunner', 2);
    return teachSay(`${id}.text`, { first: who.first });
  },
};
