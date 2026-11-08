'use strict';

// The post ladders (docs/superpowers/specs/2026-11-08-post-ladders-design.md, #963): five levels at every post, and at each a pick, one of two,
// taken at the port on the hand's own page. A pick is a move (once a fight, known when taken or when a shipmate has shown it), an edge on a
// kind of the hand's rolls (as a kit item adds one, sheet.js), a perk one place in the code reads, or a point on the sheet. The table and the
// rules are pure and read the career record they are given (hired.js career()): picks taken are its `picks`, moves known its `moves`.
// Loaded after sheet.js and before hired.js; runs under tests/nodecontext.js.

const PICK_LEVELS = 5;
// Each pick: { id, post, level, kind, name, text, ...effect }. An edge names a kind of DIFFICULTY (sheet.js); a perk names what reads it; a move
// names its FIGHT_MOVES id and, when a shipmate shows it, the teacher (a post aboard, or the first officer's role); a stat names the stat.
const PICKS = {};
const definePick = (post, level, id, kind, name, text, effect = {}) => { PICKS[id] = { id, post, level, kind, name, text, ...effect }; };

// Gunner (eye)
definePick('gunner', 1, 'vent', 'move', 'Vent the guns', 'Once a fight, the heat goes to nothing and every gun fires. Tomas shows you.', { move: 'vent', teacher: { post: 'engineer' } });
definePick('gunner', 1, 'steady-eye', 'edge', 'Steady eye', 'Your own move in a raid or a contact lands a twentieth more often.', { adds: { post: 0.05 } });
definePick('gunner', 2, 'lead', 'move', 'Lead the shot', 'Once a fight, an aimed shot takes no range penalty. Ines shows you where she will be.', { move: 'lead', teacher: { post: 'pilot' } });
definePick('gunner', 2, 'cover-eye', 'perk', 'An eye for cover', 'The cover you make in a lock fight is three points, not two.', { perk: 'cover-eye' });
definePick('gunner', 3, 'split', 'move', 'Split the turret', 'Once a fight, the held turret still fires. Cato shows you.', { move: 'split', teacher: { role: 'xo' } });
definePick('gunner', 3, 'marksman', 'perk', 'Marksman', 'Your gunnery in a ship fight counts a level higher.', { perk: 'marksman' });
definePick('gunner', 4, 'gunner-eye', 'stat', 'Eye', 'A point of eye.', { stat: 'eye' });
definePick('gunner', 4, 'pd-watch', 'perk', 'Point defense watch', 'A held turret takes half off her volley, not two fifths.', { perk: 'pd-watch' });
definePick('gunner', 5, 'called-shot', 'move', 'Called shot', 'Once a fight, the named gun takes no aim penalty and rolls the top of its range.', { move: 'called-shot' });
definePick('gunner', 5, 'gunner-nerve', 'stat', 'Nerve', 'A point of nerve.', { stat: 'nerve' });

// Pilot (nerve)
definePick('pilot', 1, 'cool-hand', 'edge', 'Cool hand', 'A bold call of your own lands a twentieth more often.', { adds: { solo: 0.05 } });
definePick('pilot', 1, 'trim', 'perk', 'Trim', 'A burn you fly costs a twentieth less reaction mass.', { perk: 'trim' });
definePick('pilot', 2, 'break-intercept', 'move', 'Break the intercept', 'Once a fight, your vote to open the range stands this turn whatever her speed.', { move: 'break-intercept' });
definePick('pilot', 2, 'soft-hands', 'perk', 'Soft hands', 'The ice run\'s approach costs no hull on a lost roll when you fly it.', { perk: 'soft-hands' });
definePick('pilot', 3, 'lane-sense', 'perk', 'Lane sense', 'A contact\'s plume is read sooner: the fight starts ten kilometers farther out.', { perk: 'lane-sense' });
definePick('pilot', 3, 'long-legs', 'perk', 'Long legs', 'Burns you fly are shorter by another twentieth.', { perk: 'long-legs' });
definePick('pilot', 4, 'pilot-nerve', 'stat', 'Nerve', 'A point of nerve.', { stat: 'nerve' });
definePick('pilot', 4, 'brace', 'perk', 'Brace', 'A run from a contact gets away a tenth more often.', { perk: 'brace' });
definePick('pilot', 5, 'redline', 'move', 'Redline', 'Once a fight, at the long band, the drive past the redline: the ship is away this turn. Tomas shows you.', { move: 'redline', teacher: { post: 'engineer' } });
definePick('pilot', 5, 'pilot-eye', 'stat', 'Eye', 'A point of eye.', { stat: 'eye' });

// Engineer (hands)
definePick('engineer', 1, 'sure-hands', 'edge', 'Sure hands', 'A job of your post, ashore or aboard, lands a twentieth more often.', { adds: { job: 0.05 } });
definePick('engineer', 1, 'cool-loop', 'perk', 'Cool loop', 'The reactor\'s heat limit is five higher.', { perk: 'cool-loop' });
definePick('engineer', 2, 'hear-it-coming', 'perk', 'Hear it coming', 'A part worn under the breakdown line is named in the ship\'s log the day it crosses it.', { perk: 'hear-it-coming' });
definePick('engineer', 2, 'patch', 'move', 'Patch', 'Once a fight, your armor back by a tenth of the fight\'s pooled maximum.', { move: 'patch' });
definePick('engineer', 3, 'melt-return', 'perk', 'Melt return', 'Every haul home puts the melt in the tanks: twenty reaction mass at the home port.', { perk: 'melt-return' });
definePick('engineer', 3, 'hot-start', 'move', 'Hot start', 'Once a fight, every shot this turn is overcharged at a plain shot\'s heat. Ines shows you.', { move: 'hot-start', teacher: { post: 'pilot' } });
definePick('engineer', 4, 'engineer-hands', 'stat', 'Hands', 'A point of hands.', { stat: 'hands' });
definePick('engineer', 4, 'yard-eye', 'perk', 'Yard eye', 'The yard\'s estimate is a tenth less when you stand over the work.', { perk: 'yard-eye' });
definePick('engineer', 5, 'bypass', 'move', 'Bypass', 'Once a fight, your drive\'s part is back to full, so a pinned drive votes on the range again.', { move: 'bypass' });
definePick('engineer', 5, 'engineer-wit', 'stat', 'Wit', 'A point of wit.', { stat: 'wit' });

// Comms (wit)
definePick('comms', 1, 'quick-word', 'edge', 'Quick word', 'A word with the captain or an agent lands a twentieth more often.', { adds: { word: 0.05 } });
definePick('comms', 1, 'long-ear', 'perk', 'Long ear', 'A market rumor you hear lasts a week longer.', { perk: 'long-ear' });
definePick('comms', 2, 'fair-copy', 'perk', 'Fair copy', 'A contract\'s dock for lateness is half when you kept the paper.', { perk: 'fair-copy' });
definePick('comms', 2, 'spoof', 'move', 'Spoof', 'Once a fight, a false transponder: she fires no volley and no salvo this turn.', { move: 'spoof' });
definePick('comms', 3, 'clear-copy', 'perk', 'Clear copy', 'The dock broker\'s skim never lands on a run whose paper you kept.', { perk: 'clear-copy' });
definePick('comms', 3, 'fair-hearing', 'edge', 'Fair hearing', 'A bar fight with nobody at your back goes your way a twentieth more often.', { adds: { brawl: 0.05 } });
definePick('comms', 4, 'comms-wit', 'stat', 'Wit', 'A point of wit.', { stat: 'wit' });
definePick('comms', 4, 'open-board', 'perk', 'Open board', 'A shipper that knows the ship draws its board as for one it trusts.', { perk: 'open-board' });
definePick('comms', 5, 'parley', 'move', 'Parley', 'Once a fight, at the mid or long band, a word on wit: landed, every foe breaks off. Cato shows you.', { move: 'parley', teacher: { role: 'xo' } });
definePick('comms', 5, 'comms-hands', 'stat', 'Hands', 'A point of hands.', { stat: 'hands' });

const picksFor = (post, level) => Object.values(PICKS).filter(p => p.post === post && p.level === level);
const takenPicks = c => (c && c.picks) || [];
// The lowest rung, 1 to `level`, with no pick of its taken; 0 when none waits. A hurt hand's lower level offers less (hired.js skillLevel).
function pickDue(c, level) {
  const taken = takenPicks(c).map(id => PICKS[id]).filter(Boolean);
  for (let l = 1; l <= Math.min(level, PICK_LEVELS); l++) if (!taken.some(p => p.post === c.post && p.level === l)) return l;
  return 0;
}
const TEACHER_WORD = { engineer: 'The engineer', pilot: 'The pilot', xo: 'The first officer' };
const STAT_FULL = { hands: 'Hands are as sure as they get', eye: 'Eye is as sharp as it gets', nerve: 'Nerve is as steady as it gets', wit: 'Wit is as quick as it gets' };
// Whether a pick may be taken: true, or the reason it is shut. A taught move needs its teacher aboard with an opinion of the hand of OPINION.TRUSTED
// or more (`teacher(pick)` is the person or null, `opinionOf(person)` their opinion); a stat at STAT_MAX is as high as it goes.
function pickOpen(p, c, { teacher, opinionOf }) {
  if (p.kind === 'move' && p.teacher) {
    const who = teacher(p);
    if (!who) return `${TEACHER_WORD[p.teacher.post || p.teacher.role] || 'The one who shows it'} is not aboard to show you`;
    if (opinionOf(who) < OPINION.TRUSTED) return `${who.first} does not trust you with it yet`;
  }
  if (p.kind === 'stat' && (c.sheet ? c.sheet[p.stat] : STAT_BASE) >= STAT_MAX) return STAT_FULL[p.stat];
  return true;
}
// Takes a pick onto the career: one a rung, at the hand's post. A stat pick moves the sheet; a move with no teacher is known at once.
// Returns the pick, or null when it cannot be taken.
function takePick(c, id) {
  const p = PICKS[id];
  if (!p || !c || p.post !== c.post) return null;
  if (takenPicks(c).some(x => PICKS[x] && PICKS[x].level === p.level && PICKS[x].post === p.post)) return null;
  c.picks = [...takenPicks(c), id];
  if (p.kind === 'stat') { c.sheet = c.sheet || Object.fromEntries(STATS.map(s => [s, STAT_BASE])); c.sheet[p.stat] = Math.min(STAT_MAX, c.sheet[p.stat] + 1); }
  if (p.kind === 'move' && !p.teacher) c.moves = [...(c.moves || []), p.move];
  return p;
}
// The edge the taken picks give a kind of roll (sheet.js check's last argument, beside kitEdge), and whether a perk is taken.
const pickEdge = (picks, kind) => (picks || []).reduce((n, id) => n + (((PICKS[id] || {}).adds || {})[kind] || 0), 0);
const hasPerk = (picks, id) => (picks || []).some(x => (PICKS[x] || {}).perk === id);
