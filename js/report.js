'use strict';

// Reporting a problem from the game (the owner, 2026-11-07): the pause menu's Report a problem takes a note and a snapshot of where the game is,
// and opens a new GitHub issue with both filled in, for the player to read and submit (they need a GitHub account). Nothing is sent by the game itself:
// it is a static site with no server. A link has a length limit, so the snapshot is trimmed from its end to fit. reportUrl is pure (tests/report.test.js);
// reportSnapshot reads the state it is given. Loaded before menu.js.

const REPORT_REPO = 'jeisenback/max-gravity', REPORT_MAX = 7500, REPORT_NOTE_MAX = 2000;

function reportUrl(note, lines) {
  const n = String(note || '').trim().slice(0, REPORT_NOTE_MAX);
  const title = n ? `Player report: ${n.length > 70 ? `${n.slice(0, 70)}...` : n}` : 'Player report';
  const make = ls => `https://github.com/${REPORT_REPO}/issues/new?title=${encodeURIComponent(title)}&body=${encodeURIComponent(`${n || '(no note)'}\n\n## Where the game was\n\n${ls.join('\n')}\n`)}`;
  const ls = [...lines];
  let url = make(ls);
  while (url.length > REPORT_MAX && ls.length) { ls.pop(); url = make(ls); }
  return url;
}

// What the game was doing, one line each: the build, the day, the chapter, where the ship is, her state, and the scene that is open with its last lines.
const reportText = html => String(html || '').replace(/<\/p><p>/g, ' / ').replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim();
function reportSnapshot(st, g, build) {
  if (!st) return [`Version: ${build.version} (${build.scope})`, 'No game is running.'];
  const h = st.hired, d = g.dialog, f = d && d.event && d.event.fight && d.event.fight.state;
  const where = g.transit ? `in transit to ${SYSTEMS[g.transit.to] ? SYSTEMS[g.transit.to].name : g.transit.to}` : `${st.planet || '?'} (${st.systemId})`;
  const lines = [
    `Version: ${build.version} (${build.scope})`,
    `Day: ${st.day}`,
    `Chapter: ${h ? h.chapter || 1 : 'none (owner)'}${h ? `, post ${h.post}, captain ${h.captainKey || '?'}` : ''}`,
    `Where: ${where}, mode ${g.mode}`,
    `Ship: ${st.shipId}, armor ${st.armor}, mass ${st.fuel}, credits ${st.credits}, crew ${(st.crew || []).length}`,
  ];
  if (d && d.event) {
    lines.push(`Open: ${d.event.title}`);
    if (f && f.log) lines.push(...f.log.slice(-4).map(l => `  ${reportText(l)}`));
    else if (d.event.text) lines.push(`  ${reportText(d.event.text).slice(0, 400)}`);
    lines.push(`Choices: ${d.choices.map(c => reportText(c.label)).join(' | ')}`);
  }
  return lines;
}
