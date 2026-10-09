'use strict';

// A stable id for every scene of the hired chapter, whether it is data or code (#342). The scene editor's index reads this and not ids of its own.
// Most scenes already sit in a registry and take their id from where they sit: a main character's or first officer's scene is
// `cast:<who>:<scene>` (a closed reading adds `:closed`), a captain's is `captain:<who>:<trouble | secret:confide | secret:found | goodbye>`, a shared
// hired event is `hired:<id>`, an ice run scene is `ice:<n>`. The scenes built by a function have no registry, so they are listed here with their id.
// An id is never reused for another scene; tests/hiredscenes.test.js pins the whole list.

const HIRED_FUNCTION_SCENES = [
  { id: 'scene:sign-on', fn: 'signOnEvent', file: 'js/signon.js', title: 'Signing On', where: 'port', when: 'Opens a hired game: why you signed on.' },
  { id: 'scene:warning', fn: 'warningScene', file: 'js/stakes.js', title: 'A Warning', where: 'transit', when: 'Once, when the captain\'s opinion of you falls to -2.' },
  { id: 'scene:put-ashore', fn: 'putAshoreScene', file: 'js/stakes.js', title: 'Put Ashore', where: 'port', when: 'When the captain\'s opinion of you falls to -3, at a later port.' },
  { id: 'scene:hand-death', fn: 'handDeathScene', file: 'js/stakes.js', title: 'The Last Run', where: 'transit', when: 'When the hand is lost in a fight.' },
  { id: 'scene:captain-lost', fn: 'captainLostScene', file: 'js/stakes.js', title: 'Without a Captain', where: 'transit', when: 'When the captain is lost on a pirate bridge.' },
  { id: 'scene:split', fn: 'splitScene', file: 'js/stakes.js', title: 'A Feud', where: 'port', when: 'When a feud between two of the crew has been seen and has dropped to -5.' },
  { id: 'scene:walk-off', fn: 'walkOffScene', file: 'js/fate.js', title: 'Walking Off', where: 'port', when: 'When a main character leaves the ship at a port.' },
  { id: 'scene:used-ship-offer', fn: 'dealScene', file: 'js/hired.js', title: 'The Used Ship', where: 'port', when: 'When the used Ore Runner is offered, after the captain\'s two scenes.' },
  { id: 'scene:yard-office', fn: 'yardScene', file: 'js/yardoffice.js', title: 'The Yard Office', where: 'port', when: 'When you ask to buy a ship.' },
  { id: 'beats:raid', fn: 'raidScene', file: 'js/engagements.js', title: 'A Raid', where: 'transit', when: 'A pirate contact, played in beats.' },
  { id: 'beats:dead-in-space', fn: 'deadInSpaceScene', file: 'js/engagements.js', title: 'Dead in Space', where: 'transit', when: 'After a raid, when a crippled raider drifts beside you.' },
  { id: 'beats:ambush', fn: 'ambushScene', file: 'js/engagements.js', title: 'An Ambush', where: 'transit', when: 'On a dangerous lane, every 60 days at most.' },
  { id: 'beats:repel', fn: 'repelScene', file: 'js/boarders.js', title: 'Boarders', where: 'transit', when: 'When a raid ends alongside: the lock, the corridor and the bridge.' },
  { id: 'beats:assault', fn: 'repelScene', file: 'js/boarders.js', title: 'Boarding Her', where: 'transit', when: 'When you board the crippled raider.' },
];

// The words of a captain's goodbye, by part (captains.js builds the scene from the parts that apply). `repay` is a sum, not words.
const GOODBYE_PARTS = ['cold', 'neutral', 'warm', 'crew', 'secret', 'xo', 'xoDead', 'repaid', 'parting'];
const goodbyeParts = g => Object.fromEntries(GOODBYE_PARTS.filter(k => g[k]).map(k => [k, g[k]]));

// The words of the raid, ambush and boarding beats (#478), by the name each line has in its table: a line is found by where it sits, and the beat reads it through
// lineWords (storylets.js) by the same name. A line the table does not hold (a casualty, a name, a count, the armor, the dead-in-space scene) is written in code and is not here.
// Odds, damage and the roll are in code too. tests/beatlines.test.js plays every beat and checks that each name here is read.
function raidLines() {
  const out = {}, text = (key, line) => { out[key] = Array.isArray(line) ? line[2] : line; };
  for (const [name, table] of [['open', RAID_OPEN], ['pass', RAID_PASS]]) for (const [style, list] of Object.entries(table)) list.forEach((t, i) => text(`${name}.${style}.${i}`, t));
  const sides = (base, c) => { for (const o of ['win', 'lose']) if (c[o]) { if (Array.isArray(c[o])) text(`${base}.${o}`, c[o]); else for (const [style, line] of Object.entries(c[o])) text(`${base}.${o}.${style}`, line); } };
  for (const [kind, list] of [['closing', RAID_CLOSING], ['exchange', RAID_EXCHANGE]]) for (const c of list) { text(`${kind}.${c.id}.label`, c.label); sides(`${kind}.${c.id}`, c); }
  for (const [kind, posts] of Object.entries(RAID_POST)) for (const [post, c] of Object.entries(posts)) { text(`post.${kind}.${post}.label`, c.label); sides(`post.${kind}.${post}`, c); }
  for (const [k, v] of Object.entries(RAID_CLOSE)) { if (typeof v === 'string') text(`close.${k}`, v); else for (const [style, t] of Object.entries(v)) text(`close.${k}.${style}`, t); }
  return out;
}
function ambushLines() {
  const out = {};
  for (const [post, c] of Object.entries(AMBUSH_READ)) for (const k of ['label', 'trap', 'real']) out[`read.${post}.${k}`] = c[k];
  return out;
}
function repelLines(assault) {
  const out = {}, set = assault ? { titles: ASSAULT_TITLES, openings: ASSAULT_OPENINGS, tactics: ASSAULT_TACTICS, post: ASSAULT_POST } : { titles: REPEL_TITLES, openings: REPEL_OPENINGS, tactics: REPEL_TACTICS, post: REPEL_POST };
  set.titles.forEach((t, i) => { out[`title.${i}`] = t; });
  set.openings.forEach((list, pos) => list.forEach((t, i) => { out[`open.${pos}.${i}`] = t; }));
  for (const [k, t] of Object.entries(set.tactics)) for (const f of ['label', 'win', 'lose']) out[`tactic.${k}.${f}`] = t[f];
  if (!assault) out.tie = REPEL_TIE;
  for (const [post, t] of Object.entries(set.post)) for (const f of ['label', 'win', 'lose']) out[`post.${post}.${f}`] = t[f];
  return out;
}
const BEAT_LINES = { 'beats:raid': raidLines, 'beats:ambush': ambushLines, 'beats:repel': () => repelLines(false), 'beats:assault': () => repelLines(true) };

// Every id, with what it is and where its scene lives: { id, kind, key, name, scene } for a cast or captain scene (its scene object), { id, kind: 'work' |
// 'hand', def } for a hired event (with its `scene` when it is written as data), { id, kind: 'ice', stage } for an ice run scene, and { id, kind: 'function', ...the entry above } for the rest (a beat of the raid, the ambush or the boarding fights has its `scene`, the lines it can be given).
function hiredSceneRegistry() {
  const out = [];
  for (const [key, c] of Object.entries(CAST)) {
    for (const [name, scene] of Object.entries(c.scenes)) {
      out.push({ id: `cast:${key}:${name}`, kind: 'cast', key, name, scene });
      if (scene.closed) out.push({ id: `cast:${key}:${name}:closed`, kind: 'cast', key, name, closed: true, scene: scene.closed });
    }
  }
  for (const [key, c] of Object.entries(CAPTAINS)) {
    const s = c.scenes || {};
    if (s.trouble) out.push({ id: `captain:${key}:trouble`, kind: 'captain', key, name: 'trouble', scene: s.trouble });
    if (s.secret) {
      out.push({ id: `captain:${key}:secret:confide`, kind: 'captain', key, name: 'secret:confide', scene: s.secret.confide });
      out.push({ id: `captain:${key}:secret:found`, kind: 'captain', key, name: 'secret:found', scene: s.secret.found });
    }
    if (c.goodbye) out.push({ id: `captain:${key}:goodbye`, kind: 'captain', key, name: 'goodbye', scene: { title: c.goodbye.title, choices: c.goodbye.choices, parts: goodbyeParts(c.goodbye), goodbye: c.goodbye } });
  }
  for (const d of WORK_EVENTS) out.push({ id: `hired:${d.id}`, kind: 'work', def: d });
  for (const d of HAND_EVENTS.filter(x => x.group !== 'work')) out.push({ id: `hired:${d.id}`, kind: 'hand', def: d, ...(d.data ? { scene: d.data } : {}) });
  ICE_STAGES.forEach((stage, i) => out.push({ id: `ice:${i + 1}`, kind: 'ice', stage }));
  for (const f of HIRED_FUNCTION_SCENES) out.push({ ...f, kind: 'function', ...(BEAT_LINES[f.id] ? { scene: { title: f.title, choices: [], parts: BEAT_LINES[f.id](), noTitle: true } } : {}) });  // a beat's words, line by line (#478)
  return out;
}
