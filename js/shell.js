'use strict';

// The ship-interface shell (docs/superpowers/specs/2026-10-05-ship-interface-design.md): a landed screen whose
// navigation is a rail of the ship's rooms and an Ashore group, in place of the station keys and tabs. It is off unless
// the address says shell=on (shellOn in js/build.js), and UI.render hands over to shellHtml when it is on.
// Each page is the existing UI.views[tab] function, looked up when the screen is drawn, so the wrappers other scripts
// put around a view still apply. Loaded before game.js; only calls into it at runtime.

// The rail, one entry per page that has a place on it. `ready` returns true, or the reason the entry is unavailable;
// `shown` says whether the entry is on this player's rail at all: a page that can never be used (the owner's Exchange and
// Company, for a hired hand) is left off, not greyed.
const RAIL = [
  { id: 'bridge', label: 'Bridge', group: 'ship', tab: 'nav', ready: p => tabReady(p, 'nav') || 'Not available here' },
  { id: 'comms', label: 'Comms', group: 'ship', tab: 'comms', ready: p => tabReady(p, 'comms') || 'Not available here' },
  { id: 'gunnery', label: 'Gunnery', group: 'ship', tab: 'weapons', ready: p => tabReady(p, 'weapons') || 'Not available here' },
  { id: 'engine', label: 'Engine', group: 'ship', tab: 'shipyard', ready: p => tabReady(p, 'shipyard') || 'No shipyard here' },
  { id: 'crew', label: 'Crew', group: 'ship', tab: 'crew', ready: p => tabReady(p, 'crew') || 'Not available here' },
  { id: 'bonds', label: 'Bonds', group: 'ship', tab: 'web', ready: p => tabReady(p, 'web') || 'Not available here' },
  { id: 'journal', label: 'Journal', group: 'ship', tab: 'journal', ready: p => tabReady(p, 'journal') || 'Not available here' },
  { id: 'port', label: 'Port', group: 'ashore', tab: 'port', ready: p => tabReady(p, 'port') || 'Not available here' },
  { id: 'missions', label: 'Missions', group: 'ashore', tab: 'missions', ready: p => tabReady(p, 'missions') || 'No work board here' },
  { id: 'bar', label: 'Bar', group: 'ashore', tab: 'bar', ready: p => tabReady(p, 'bar') || 'No bar here' },
  { id: 'exchange', label: 'Exchange', group: 'ashore', tab: 'trade', shown: () => !hired(), ready: p => tabReady(p, 'trade') || 'No exchange at this port' },
  { id: 'company', label: 'Company', group: 'ashore', tab: 'company', shown: () => !hired() && !scopeOff('owner'), ready: p => tabReady(p, 'company') || 'Not available here' },
];
const railEntries = p => RAIL.filter(e => !e.shown || e.shown(p));
const RAIL_GROUPS = [['ship', 'Ship'], ['ashore', 'Ashore']];

// The pages the shell can show. `under` names the rail entry a page without an entry of its own belongs to: the
// character screen is opened from a name on the crew list, and keeps Crew lit.
const SHELL_PAGES = {
  nav: {}, comms: {}, weapons: {}, shipyard: {}, crew: {}, web: {}, journal: {}, port: {}, missions: {}, bar: {}, trade: {}, company: {},
  person: { under: 'crew' },
};

// A page the shell does not know falls back to Port.
const shellTab = tab => (SHELL_PAGES[tab] ? tab : 'port');

// One rail button. An unavailable entry is disabled and says why, as text under the button.
function railEntryHtml(entry, p, activeId) {
  const ok = entry.ready(p), on = entry.id === activeId;
  return `<button data-action="tab" data-arg="${entry.tab}" class="${on ? 'active' : ''}"${on ? ' aria-current="page"' : ''}${ok === true ? '' : ' disabled'}>${esc(entry.label)}</button>`
    + (ok === true ? '' : `<span class="rail-why">${esc(ok)}</span>`);
}

function railHtml(p, tab) {
  const under = (SHELL_PAGES[tab] || {}).under || tab, lit = RAIL.find(e => e.tab === under), activeId = lit ? lit.id : under;
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
