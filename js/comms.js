'use strict';

// The comms station: where word reaches the ship. Every happening says how it arrived
// (a call from a station, a hail from a ship, a message, or someone aboard), the inbox
// keeps the last of them, and the comms post (a slicer) listens for market tips. A crewed
// comms officer takes the routine hails themselves, so a merchant's offer does not stop the
// burn. Loaded before game.js; only calls into it at runtime.

const VIA_LABELS = { station: 'Call from a station', ship: 'Hail from a ship', message: 'Message', crew: 'Aboard' };
const INBOX_MAX = 40;

// A landing note about a person (a letter for a crewmate) is registered here, so the inbox can link to them.
const NOTE_WHO = {};
const noteFor = (text, pid) => { NOTE_WHO[text] = pid; return text; };

// Each message gets a running number, so what arrived since you last docked can be marked new (see commsPanel).
function noteInbox(via, text, pid) {
  const st = G.state;
  st.inbox = st.inbox || [];
  st.inboxN = (st.inboxN || 0) + 1;
  st.inbox.unshift({ n: st.inboxN, day: st.day, via, text, ...(pid ? { pid } : {}) });
  st.inbox.length = Math.min(st.inbox.length, INBOX_MAX);
}

ORDERS.comms = [{
  id: 'listen', name: 'Listen on the bands', desc: 'Scan the trade bands for a market tip. Once a day.',
  run(ok, doer) {
    const who = doer ? doer.first || doer.name : 'You';
    if (!ok) return `${who} spend${doer ? 's' : ''} a watch on the bands and get${doer ? 's' : ''} nothing but static and a very long sermon.`;
    addRumor();
    const tip = G.state.rumors[G.state.rumors.length - 1];
    return `${who} pick${doer ? 's' : ''} up a tip: ${tip.text}`;
  },
}];

// The merchant's offer is routine: the officer buys the tip when there is money to spare.
{
  const hail = TRANSIT_EVENTS.find(e => e.title === 'Merchant Hail');
  if (hail) hail.auto = () => {
    const st = G.state, who = roleName('slicer');
    if (st.credits < 1500) return `${who} thanks the freighter captain and declines the tip.`;
    st.credits -= 500;
    return `${who} pays 500 cr for the freighter captain's market tip: ${addRumor()}`;
  };
}

const VIA_TAG = { station: 'station', ship: 'ship', message: 'message', crew: 'aboard' };
const COMMS_FILTERS = [['all', 'All'], ['station', 'Stations'], ['ship', 'Ships'], ['message', 'Messages'], ['crew', 'Aboard']];

// Who you can open from here: yourself, the captain and first officer on the captain's ship, and everyone else aboard.
function contactsHtml() {
  const st = G.state, cap = hired() && hiredCaptain(), crew = crewMembers(), xo = crew.find(c => c.role === 'xo');
  const buttons = [`<button data-action="person" data-arg="you">You</button>`];
  if (cap) buttons.push(`<button data-action="person" data-arg="${esc(cap.id)}">Captain</button>`);
  if (xo) buttons.push(`<button data-action="person" data-arg="${esc(xo.id)}">First officer</button>`);
  const rest = crew.filter(c => c !== xo).map(c => conRead(personLink(c), ROLE_NAMES[c.role] || c.job || '')).join('');
  return conCard('Contacts', `<div class="row">${buttons.join('')}</div>${rest ? `<div class="eyebrow" style="margin-top:8px">Crew</div>${rest}` : ''}`);
}

// The Comms station as a console: the inbox as a feed on the display, the market tips in force beside it, and the
// comms post and the programs along the bottom.
function commsPanel() {
  const st = G.state, filter = UI.commsFilter || 'all', tips = st.rumors.filter(r => r.until >= st.day), since = (st.dockMark || {}).prev || 0;
  const inbox = (st.inbox || []).filter(m => filter === 'all' || m.via === filter).slice(0, 12);
  const chips = COMMS_FILTERS.map(([id, label]) => `<button class="link${id === filter ? ' on' : ''}" data-action="commsFilter" data-arg="${id}" ${id === filter ? 'aria-pressed="true"' : ''}>${label}</button>`).join(' ');
  const feed = inbox.length ? inbox.map(m => {
    const who = m.pid && st.people[m.pid];
    return `<div class="con-msg via-${VIA_TAG[m.via] || 'message'}"><span class="tag">${VIA_TAG[m.via] || m.via}</span> <span class="hint">${dateOf(m.day)}</span>${m.n > since ? ' <b class="char-tag">new</b>' : ''}<div>${m.text}</div>${who ? `<div class="hint">About ${personLink(who)}</div>` : ''}</div>`;
  }).join('')
    : `<p class="hint">${(st.inbox || []).length ? 'Nothing of that kind.' : 'Nothing yet. Word arrives as you fly and dock.'}</p>`;
  const holder = postHolder('comms');
  return consoleHtml({
    title: 'Comms',
    status: notYours('comms') ? `${holder ? roleName('slicer') : 'Nobody'} has the bands` : postMode('comms') === 'manual' ? 'You have the bands' : `${roleName('slicer')} has the bands`,
    screen: `<div class="con-feed" role="log" aria-label="Inbox"><div class="eyebrow">Inbox</div><div class="con-filters">${chips}</div>${feed}</div>`,
    side: contactsHtml() + conCard(`Market tips in force`, tips.length ? tips.map(r => `<div class="hint">${r.text}, until ${dateOf(r.until)}</div>`).join('') : '<p class="hint">None in force.</p>'),
    controls: `${postHtml('comms')}${programsHtml()}`,
  });
}

UI.views.comms = function () { return commsPanel(); };

Mods.register({
  id: 'comms', name: 'Comms', builtin: true,
  init(M) {
    M.on('landed', () => {
      const st = G.state;
      for (const n of UI.notes) { noteInbox('message', n, NOTE_WHO[n]); delete NOTE_WHO[n]; }
      st.dockMark = { prev: (st.dockMark || {}).cur || 0, cur: st.inboxN || 0 };  // new = arrived since the last time you docked
    });
    M.action('commsFilter', id => { UI.commsFilter = COMMS_FILTERS.some(f => f[0] === id) ? id : 'all'; UI.render(); });
  },
});
