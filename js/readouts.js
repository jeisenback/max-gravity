'use strict';

// Readouts (#686): the figures of the hand's game shown as figures, not paragraphs. The strip on every landed screen (the contract and
// its days, the hull, the ship's fund, your savings, and your hurt if any; in a burn the HUD draws the same, game.js), the contract as a
// paper in the hold (the Operations console, bridge.js), the captain's log (the ledger as rows: the Journal page, the Port page and the
// captain's page) and the raid's position as a gauge (engagements.js). stripItems and logRowsHtml take the state they read; the
// HTML helpers draw with the view helpers (views.js, console.js). Loaded after hired.js; only calls into the game at runtime.

const goodName = id => (COMMODITIES.find(c => c.id === id) || {}).name || id || 'cargo';
// The contract the ship carries or has taken: the run under way, else the plan at the dock (currentPlan, hired.js: the plan holds its run).
const heldContract = hd => (hd.run && hd.run.contract ? hd.run : hd.plan && hd.plan.run && hd.plan.run.contract ? hd.plan.run : null);
const dayWord = n => `${n} day${n === 1 ? '' : 's'}`;
const inWord = (c, day) => { const n = c.due - day; return n < 0 ? `${dayWord(-n)} late` : n === 0 ? 'today' : `in ${dayWord(n)}`; };
const dueWord = (c, day) => (c.due < day ? inWord(c, day) : `due ${inWord(c, day)}`);

// The strip's readouts, label and value: the contract, the hull, the fund, the savings, and the hurt while it lasts.
function stripItems(st, hd, armor, maxArmor, day) {
  const c = heldContract(hd), hurt = hd.hurtUntil > day ? hd.hurtUntil - day : 0;
  return [
    ['Contract', c ? `${c.tons}t ${goodName(c.good)} to ${c.planet}, ${dueWord(c, day)}` : 'none'],
    ['Hull', `${Math.round(100 * armor / maxArmor)}%`],
    ['Fund', `${fmt(hd.fund)} cr`],
    ['Savings', `${fmt(st.credits)} cr`],
    ...(hurt ? [['Hurt', dayWord(hurt)]] : []),
  ];
}
const stripNow = () => stripItems(G.state, hired(), G.state.armor, ship().armor, G.state.day);
const stripHtml = () => (hired() ? String(h`<div class="strip" role="status">${listHtml(stripNow(), ([k, v]) => h`<span><span class="k">${k}</span> <b>${v}</b></span>`)}</div>`) : '');
// The strip as one line of text for the HUD's canvas; `skip` names the readouts the HUD already draws as bars or figures.
const stripText = (skip = []) => stripNow().filter(([k]) => !skip.includes(k)).map(([k, v]) => `${k} ${v}`).join('  ');

// The contract as the paper in the hold: what was signed, with the dock for lateness printed on it.
function contractPaperHtml(c, day) {
  const rows = [['Shipper', c.shipper], ['Load', `${c.tons}t ${goodName(c.good)}`], ['From', c.from], ['To', `${c.planet}, ${SYSTEMS[c.sid].name}`], ['Pay on delivery', `${fmt(c.pay)} cr`],
    ['Due', `${dateOf(c.due)}, ${inWord(c, day)}`], ['Signed', dateOf(c.day !== undefined ? c.day : day)]];
  return conCard('Contract', rows.map(([k, v]) => conRead(k, v)).join('') + '<p class="hint">Docked a tenth of the pay a day late, never below half. Short of the load, no pay for what did not arrive.</p>');
}

// The captain's log: the ledger's runs as rows, the pay to you on the right and the run's own figures under it.
const logRowsHtml = (ledger, n) => String(listHtml(ledger.slice(0, n), l => h`<div class="con-read"><span>${l.from} to ${l.to}</span><b>+${fmt(l.wage + l.share)} cr</b></div><div class="hint">${dateOf(l.day)}, ${l.shipper && !l.tons ? `the load for ${l.shipper} lost, no pay`
  : l.good ? `${l.tons}t ${goodName(l.good)}${l.shipper ? ` for ${l.shipper}, paid ${fmt(l.revenue)} cr` : `, profit ${fmt(l.profit)} cr`}` : 'no cargo'}${l.late ? `, ${dayWord(l.late)} late` : ''}${l.short && l.tons ? ', short' : ''}</div>`));

// The position in a raid as a gauge: from three behind to three ahead, the mark where the count stands, the word for a reader.
function positionGauge(edge, word) {
  const x = 100 + 26 * Math.max(-3, Math.min(3, edge)), color = edge >= 1 ? '#5fd35f' : edge <= -1 ? '#ff6a4a' : '#d4e4f5';
  return `<svg class="position" viewBox="0 0 200 26" role="img" aria-label="Position: ${word}"><line x1="22" y1="10" x2="178" y2="10" stroke="#34506e" stroke-width="4"/>` +
    `<line x1="100" y1="4" x2="100" y2="16" stroke="#56687a" stroke-width="2"/><circle cx="${x}" cy="10" r="6" fill="${color}"/>` +
    '<text x="22" y="25" fill="#7d93aa" font-size="8">BEHIND</text><text x="178" y="25" fill="#7d93aa" font-size="8" text-anchor="end">AHEAD</text></svg>';
}
