'use strict';

// Risk and reward (#274): in a raid and on the ice run, the bold option's expected change in position sits within 15 percent of the best
// safe option's, with more spread and a worse worst case, so it is a choice about style and not a trap or a free win. tools/audit-risk.js
// prints the same numbers for every choice. The odds here are as declared (the pilot's and the post's own choices are by design better).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the bold option in a raid and on the ice run is within 15 percent of the best safe one, and never beats every safe one outright', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const sets = await ev(() => {
    const ex = (p, win, lose) => ({ edge: p * win[0] + (1 - p) * lose[0], hull: (1 - p) * lose[1] });
    const out = [];
    const pick = (x, style) => (Array.isArray(x) ? x : (x[style] || x.grapple));
    for (const style of ['grapple', 'torpedo', 'gun']) {
      const row = c => ex(c.odds(style), pick(c.win, style), pick(c.lose || c.win, style));
      out.push({ name: `closing (${style})`, bold: row(RAID_CLOSING.find(c => c.id === 'turn')), safe: ['hold', 'warn'].map(id => row(RAID_CLOSING.find(c => c.id === id))) });
      out.push({ name: `pass (${style})`, bold: row(RAID_EXCHANGE.find(c => c.id === 'fire')), safe: ['screen', 'burn'].map(id => row(RAID_EXCHANGE.find(c => c.id === id))) });
    }
    ICE_STAGES.forEach((st, i) => {
      const row = c => ex(c.odds, c.win, c.lose || c.win);
      out.push({ name: `ice ${i + 1}`, bold: row(st.general[1]), safe: [st.general[0], st.general[2]].map(row) });
    });
    return out;
  });
  for (const s of sets) {
    const best = Math.max(...s.safe.map(x => x.edge));
    assert.ok(Math.abs(s.bold.edge - best) <= Math.max(0.05, 0.15 * best), `${s.name}: bold ${s.bold.edge.toFixed(2)} against the best safe ${best.toFixed(2)}`);
    assert.ok(!s.safe.every(x => s.bold.edge > x.edge && s.bold.hull <= x.hull), `${s.name}: the bold option beats every safe one at no extra cost`);
  }
  await done();
});
