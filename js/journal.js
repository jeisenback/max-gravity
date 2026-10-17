'use strict';

// The Journal tab (under Interior): the things the ship keeps about the world and your part in it, which used to be
// piled on the Port screen. Your journal entries, how the factions stand with you, the feeds, and the news and rumors.
// The Port screen keeps what is about the port.

// The feeds as one line, the first headline and how many more, opening to the rest (#691): a day-one journal is not nine lines of what is on.
function feedsHtml() {
  const lines = feedHeadlines();
  if (!lines.length) return '';
  const [first, ...rest] = lines;
  return String(rest.length ? h`<details class="feeds"><summary class="hint">${first} <span class="more">and ${rest.length} more</span></summary>${listHtml(rest, l => h`<div class="hint">${l}</div>`)}</details>` : h`<div class="hint">${first}</div>`);
}

UI.views.journal = function () {
  const st = G.state;
  const elsewhere = Object.keys(SYSTEMS).filter(id => id !== st.systemId).flatMap(conditions)
    .filter((c, i, all) => all.findIndex(d => d.text === c.text) === i && !conditions(st.systemId).some(d => d.text === c.text));
  const news = String(h`${raw(UI.conditionList(elsewhere, ''))}${listHtml(st.news || [], n => h`<div class="hint">${dateOf(n.day)}: ${n.text}</div>`)}${listHtml(st.rumors, r => h`<div class="hint">${r.text} Until ${dateOf(r.until)}.</div>`)}${raw(othersNewsHtml())}`).trim();
  return String(h`
        ${raw(journalHtml(20))}
        ${hired() ? h`<h3>Captain's log</h3>${hired().ledger.length ? raw(logRowsHtml(hired().ledger, 20)) : h`<p class="hint">No runs yet. Each run settled is a line here.</p>`}` : ''}
        <h3>Standing</h3>
        <div class="standing">${listHtml(FACTIONS, g => h`<div><span style="color:${GOV_COLORS[g]}">${g === 'Pirate' ? 'Pirates' : g}</span> <b>${standingWord(repOf(g))}</b> <span class="hint">${repOf(g) > 0 ? '+' : ''}${repOf(g)}</span></div>`)}</div>
        <h3>On the feeds</h3>
        ${raw(feedsHtml())}
        ${news ? h`<h3>News</h3>${raw(news)}` : ''}`);  // no heading over nothing on day one (#691)
};
