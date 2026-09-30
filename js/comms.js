'use strict';

// The comms station: where word reaches the ship. Every happening says how it arrived
// (a call from a station, a hail from a ship, a message, or someone aboard), the inbox
// keeps the last of them, and the comms post (a slicer) listens for market tips. A crewed
// comms officer takes the routine hails themselves, so a merchant's offer does not stop the
// burn. Loaded before game.js; only calls into it at runtime.

const VIA_LABELS = { station: 'Call from a station', ship: 'Hail from a ship', message: 'Message', crew: 'Aboard' };
const INBOX_MAX = 40;

function noteInbox(via, text) {
  const st = G.state;
  st.inbox = st.inbox || [];
  st.inbox.unshift({ day: st.day, via, text });
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

function commsPanel() {
  const st = G.state, inbox = (st.inbox || []).slice(0, 10), live = st.rumors.length;
  return `<h3>Comms</h3>
    <p class="desc">${live ? `${live} market tip${live > 1 ? 's' : ''} in force.` : 'No market tips in force.'}</p>
    ${postHtml('comms')}${programsHtml()}
    <div class="post"><div class="eyebrow">Inbox</div>
      ${inbox.length ? inbox.map(m => `<div class="hint"><span class="tag">${VIA_TAG[m.via] || m.via}</span> ${dateOf(m.day)}: ${m.text}</div>`).join('') : '<p class="hint">Nothing yet. Word arrives as you fly and dock.</p>'}
    </div>`;
}

UI.views.comms = function () { return commsPanel(); };

Mods.register({
  id: 'comms', name: 'Comms', builtin: true,
  init(M) {
    M.on('landed', () => { for (const n of UI.notes) noteInbox('message', n); });
  },
});
