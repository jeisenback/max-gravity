'use strict';

// The Journal tab (under Interior): the things the ship keeps about the world and your part in it, which used to be
// piled on the Port screen. Your journal entries, how the factions stand with you, the feeds, and the news and rumors.
// The Port screen keeps what is about the port.

UI.views.journal = function () {
  const st = G.state;
  return `
        ${journalHtml(20)}
        <h3>Standing</h3>
        <div class="standing">${FACTIONS.map(g => `<div><span style="color:${GOV_COLORS[g]}">${g === 'Pirate' ? 'Pirates' : g}</span> <b>${standingWord(repOf(g))}</b> <span class="hint">${repOf(g) > 0 ? '+' : ''}${repOf(g)}</span></div>`).join('')}</div>
        <h3>On the feeds</h3>
        ${feedHeadlines().map(l => `<div class="hint">${l}</div>`).join('')}
        <h3>News</h3>
        ${UI.conditionList(Object.keys(SYSTEMS).filter(id => id !== st.systemId).flatMap(conditions)
          .filter((c, i, all) => all.findIndex(d => d.text === c.text) === i && !conditions(st.systemId).some(d => d.text === c.text)), '')}
        ${(st.news || []).map(n => `<div class="hint">${dateOf(n.day)}: ${n.text}</div>`).join('')}
        ${st.rumors.map(r => `<div class="hint">${r.text} Until ${dateOf(r.until)}.</div>`).join('')}
        ${!(st.news || []).length && !st.rumors.length ? '<p class="hint">Listen to the comms in transit for more.</p>' : ''}
        ${othersNewsHtml()}
        <p class="hint">What the port offers is on the Port tab, under Operations.</p>`;
};
