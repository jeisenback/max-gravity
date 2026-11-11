'use strict';

// The crew teach the hired hand's taught moves on a burn (docs/superpowers/specs/2026-11-08-post-ladders-design.md; before it the gunner's three, docs/superpowers/specs/
// 2026-10-23-gunner-moves-design.md section 2): a move pick with a teacher (picks.js) is taken on the ladder at the port, and the teacher (the post's holder, or
// the first officer) shows the hand the move as a downtime activity once they trust them. Taking it teaches the move (career().moves, which fightui.js offers in a
// fight) and a few points at the hand's post; not taking it leaves it to a later burn. The words are the lines of scene:moves (hiredscenes.js). Loaded after
// shiplife.js (ACTIVITIES), hired.js and picks.js.

// Who teaches each taught move (a post, or the first officer's role) and the level of the pick that holds it, read from the pick table.
const MOVE_TEACH = Object.fromEntries(Object.values(PICKS).filter(p => p.kind === 'move' && p.teacher).map(p => [p.move, { ...p.teacher, level: p.level }]));

// The first taught move, in the pick table's order, that is due for the career `c`: its pick taken, the move not known yet, and its teacher (`teacher(id)`, a person
// or none) with an opinion of the hand (`opinionOf`) of at least OPINION.TRUSTED. The level was proven when the pick was taken. Pure: it runs in plain Node.
function moveDue(c, teacher, opinionOf) {
  if (!c) return null;
  const known = c.moves || [], taken = takenPicks(c);  // a save from before has neither
  for (const p of Object.values(PICKS)) {
    if (!(p.move in MOVE_TEACH) || !taken.includes(p.id) || known.includes(p.move)) continue;
    const who = teacher(p.move);
    if (who && opinionOf(who) >= OPINION.TRUSTED) return p.move;
  }
  return null;
}

// The person who would teach a move: the post's holder, or the first officer, with the injured left out (stations.js, crew.js).
const teacherAboard = t => (t.post ? postHolder(t.post) : roleHolder(t.role));  // the one aboard who shows a move: { post } or { role } (picks.js), as hired.js pickTeacher asks too
const moveTeacher = id => teacherAboard(MOVE_TEACH[id]);
const moveNow = () => (hired() ? moveDue(career(), moveTeacher, p => p.opinion || 0) : null);  // a hired hand's only: no move is taught to an owner
const teachSay = (key, vars) => sceneSay('scene:moves', key, vars);

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
    gainSkill(Object.values(PICKS).find(p => p.move === id).post, 2);  // the pick's post: a move picked at the guns pays the gunner ladder, whatever post the hand works now
    return teachSay(`${id}.text`, { first: who.first });
  },
};
