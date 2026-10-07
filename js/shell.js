'use strict';

// The ship-interface shell (docs/superpowers/specs/2026-10-05-ship-interface-design.md): a landed screen whose
// navigation is a rail of the ship's rooms and an Ashore group, in place of the station keys and tabs. It is off unless
// the address says shell=on (shellOn in js/build.js), and UI.render hands over to shellHtml when it is on.
// Each page is the existing UI.views[tab] function, looked up when the screen is drawn, so the wrappers other scripts
// put around a view still apply. Loaded before game.js; only calls into it at runtime.

// The rail, one entry per page that has a place on it. `shown` says whether the entry is drawn at all: a page that can never be used
// in this game (the owner's pages, for a hired hand) is hidden, not greyed out (#264). `ready` returns true, or the reason an entry
// that is drawn is unavailable at this port, which the rail prints as text. The hold and the medbay have no page yet, so no entry.
const ownerOnly = tab => !hired() && !(tab === 'company' && scopeOff('owner'));
const railEntry = (id, label, group, tab, more = {}) => ({ id, label, group, tab, shown: () => true, ready: () => true, ...more });
const RAIL = [
  railEntry('bridge', 'Bridge', 'ship', 'nav'),
  railEntry('comms', 'Comms', 'ship', 'comms'),
  railEntry('gunnery', 'Gunnery', 'ship', 'weapons'),
  railEntry('engine', 'Engine', 'ship', 'shipyard', { ready: p => tabReady(p, 'shipyard') || 'No shipyard here' }),
  railEntry('crew', 'Crew', 'ship', 'crew'),
  railEntry('bonds', 'Bonds', 'ship', 'web'),
  railEntry('journal', 'Journal', 'ship', 'journal'),
  railEntry('port', 'Port', 'ashore', 'port'),
  railEntry('missions', 'Missions', 'ashore', 'missions', { ready: p => tabReady(p, 'missions') || 'No work board here' }),
  railEntry('bar', 'Bar', 'ashore', 'bar'),
  railEntry('exchange', 'Exchange', 'ashore', 'trade', { shown: () => ownerOnly('trade'), ready: p => tabReady(p, 'trade') || 'No exchange at this port' }),
  railEntry('company', 'Company', 'ashore', 'company', { shown: () => ownerOnly('company') }),
];
// The entries drawn at this port, in table order.
const railEntries = p => RAIL.filter(e => e.shown(p));
const RAIL_GROUPS = [['ship', 'Ship'], ['ashore', 'Ashore']];

// The pages the shell can show. `under` names the page whose rail entry a page without an entry of its own belongs to: the
// character screen is opened from a name on the crew list, and keeps the Crew entry lit.
const SHELL_PAGES = { nav: {}, comms: {}, weapons: {}, shipyard: {}, crew: {}, web: {}, journal: {}, port: {}, missions: {}, bar: {}, trade: {}, company: {}, person: { under: 'crew' } };

// A page the shell does not know, or whose entry is hidden in this game (an older UI.tab, say), falls back to Port.
const shellTab = tab => {
  if (!SHELL_PAGES[tab]) return 'port';
  const entry = RAIL.find(e => e.tab === tab);
  return entry && !entry.shown(UI.planet) ? 'port' : tab;
};

// One rail button. An unavailable entry is disabled and says why, as text under the button.
function railEntryHtml(entry, p, activeId) {
  const ok = entry.ready(p), on = entry.id === activeId;
  return `<button data-action="tab" data-arg="${entry.tab}" class="${on ? 'active' : ''}"${on ? ' aria-current="page"' : ''}${ok === true ? '' : ' disabled'}>${esc(entry.label)}</button>`
    + (ok === true ? '' : `<span class="rail-why">${esc(ok)}</span>`);
}

function railHtml(p, tab) {
  const lit = RAIL.find(e => e.tab === ((SHELL_PAGES[tab] || {}).under || tab)), activeId = lit && lit.id;  // the entry that opens this page, or the one it sits under
  return `<nav class="rail" aria-label="Ship">${RAIL_GROUPS.map(([group, label]) => {
    const entries = railEntries(p).filter(e => e.group === group);
    return entries.length ? `<div class="rail-group"><h3>${label}</h3>${entries.map(e => railEntryHtml(e, p, activeId)).join('')}</div>` : '';
  }).join('')}</nav>`;
}

// The whole landed screen: the header, the rail beside the page, and the dock.
function shellHtml(ui, p) {
  ui.tab = shellTab(ui.tab);
  return `${ui.headerHtml(p)}
    <canvas id="vs" class="vs" aria-hidden="true"></canvas>
    ${Mods.filter('portBanner', '')}
    <div class="shell">${railHtml(p, ui.tab)}<div class="body">${ui.views[ui.tab].call(ui)}</div></div>${ui.dockHtml()}`;
}
