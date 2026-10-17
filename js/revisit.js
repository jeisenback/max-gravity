'use strict';

// Returning to a port (#671): the dock says what changed since you were last here. One stamp a port (st.visited[planet] =
// { day, snap }), written at every landing after the line is made; the snapshot holds only what the line can speak to: the
// economy's state, the war, the lanes, and who the bar's regulars were. The line is a port note, not a scene, and there is none
// on a first landing or inside REVISIT_GAP days. revisitSnap and revisitFacts take the state they read and return a value; the
// mod's landed hook reads G. Loaded after regulars.js (the regulars' record); only calls into it at runtime.

const REVISIT_GAP = 4;
const REVISIT_LINES = {  // lines:port-return
  frame: 'Last here {days} days ago. Since then, {what}.',
  quiet: 'Last here {days} days ago. Nothing here has moved: the same faces at the bar, the same numbers on the board.',
  'war.on': '{a} and {b} have gone to war',
  'war.off': 'the war between {a} and {b} is over',
  'eco.boom': 'the money has come in, and the dock is full',
  'eco.bust': 'the money has gone out of the place',
  'eco.settled': 'the boom is over and the prices have settled',
  'eco.lifted': 'the slump has lifted',
  'lanes.bad': 'the lanes have gone bad and the dock has hired guards',
  'lanes.quiet': 'the lanes are quiet again',
  gone: '{name} is gone from the bar',
};
const revisitLines = () => linedText('lines:port-return', REVISIT_LINES);

// What a port looks like at a landing, as far as the line can tell.
function revisitSnap(st, planet) {
  const w = factionState().war, bar = (st.bars || {})[planet.name];
  return { eco: economy(SYSTEMS[st.systemId].gov), war: w ? [w.a, w.b].sort() : null, lanes: excessUnrest(st.systemId) > 0.05, regs: bar ? [...bar.ids] : [] };
}

// What changed between two snapshots, in a fixed order (the war, the money, the lanes, a regular gone), at most three, as the lines say them. `name`
// gives a regular's first name by id.
function revisitFacts(before, now, name, say = revisitLines()) {
  const out = [], fill = (k, v = {}) => out.push(fillLine(say[k], v));
  const warKey = w => (w ? w.join('|') : null);
  if (warKey(now.war) !== warKey(before.war)) { const w = now.war || before.war; fill(now.war ? 'war.on' : 'war.off', { a: w[0], b: w[1] }); }
  if (now.eco !== before.eco) fill(now.eco === 'boom' ? 'eco.boom' : now.eco === 'bust' ? 'eco.bust' : before.eco === 'boom' ? 'eco.settled' : 'eco.lifted');
  if (now.lanes !== before.lanes) fill(now.lanes ? 'lanes.bad' : 'lanes.quiet');
  const gone = before.regs.filter(id => !now.regs.includes(id)).map(name).filter(Boolean);
  if (gone.length) fill('gone', { name: gone.join(' and ') });
  return out.slice(0, 3);
}

// The line for this landing, or null (a first landing, or one inside the gap). Does not write the stamp: revisitStamp does, after.
function revisitLine(st, planet) {
  const was = (st.visited || {})[planet.name];
  if (!was || st.day - was.day < REVISIT_GAP) return null;
  const say = revisitLines(), facts = revisitFacts(was.snap, revisitSnap(st, planet), id => st.people[id] && st.people[id].first, say);
  const what = facts.length > 1 ? `${facts.slice(0, -1).join(', ')} and ${facts[facts.length - 1]}` : facts[0];
  return fillLine(say[facts.length ? 'frame' : 'quiet'], { days: st.day - was.day, what });
}
function revisitStamp(st, planet) { (st.visited = st.visited || {})[planet.name] = { day: st.day, snap: revisitSnap(st, planet) }; }

Mods.register({
  id: 'revisit', name: 'Since you were here', builtin: true,
  init(M) {
    M.on('landed', planet => {
      const st = G.state, line = revisitLine(st, planet);
      revisitStamp(st, planet);
      if (line) M.note(line);
    });
  },
});
