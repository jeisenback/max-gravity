'use strict';

// A one-off audit, not a test: prints the expected value of each declared choice on the ice run (js/icerun.js) and in a work event
// (js/hiredevents.js), so the gap between a bold option and a safe one can be measured before and after a retune (#274).
//   node tools/audit-risk.js
// For each choice: its odds, the expected change in position ("edge") and the expected hull lost as a share of armor. A general
// choice's odds are as declared; the post's own choice is a half plus a tenth a level. (The ship fight has no odds to audit: npm run fights.)

const { open, closeBrowser } = require('../tests/helpers');

(async () => {
  const { ev, ctx } = await open({ scope: 'earth-hired', stall: 0 });
  const rows = await ev(() => {
    const out = [];
    const ev2 = (p, win, lose) => ({ edge: p * win[0] + (1 - p) * lose[0], hull: (1 - p) * lose[1] });
    const add = (where, id, label, p, win, lose) => {
      const e = ev2(p, win, lose || win);
      out.push({ where, id, label: label.replace(/^\[.*?\] /, '').slice(0, 44), p: Math.round(p * 100) / 100, edge: Math.round(e.edge * 100) / 100, hull: Math.round(e.hull * 1000) / 1000 });
    };
    ICE_STAGES.forEach((st, i) => {
      for (const c of st.general) add(`ice ${i + 1} ${st.title}`, '', c.label, c.odds, c.win, c.lose || c.win);
      const post = st.post && st.post.gunner;
      if (post) for (const level of [1, 2, 3]) add(`ice ${i + 1} post (gunner, level ${level})`, 'post', post.label || 'post', Math.min(0.85, 0.5 + 0.1 * level), post.win, post.lose || post.win);
    });
    for (const level of [1, 2, 3]) {
      const p = 0.45 + 0.1 * level;
      out.push({ where: `work event (level ${level})`, id: 'careful', label: 'careful', p: 1, edge: 3, hull: 0 });
      out.push({ where: `work event (level ${level})`, id: 'quick', label: 'quick', p: Math.round(p * 100) / 100, edge: Math.round((p * 4 + (1 - p) * 1) * 100) / 100, hull: 0 });
    }
    return out;
  });
  let last = '';
  for (const r of rows) {
    if (r.where !== last) { console.log(`\n${r.where}`); last = r.where; }
    console.log(`  ${r.label.padEnd(46)} odds ${String(r.p).padEnd(5)} edge ${String(r.edge).padStart(5)} hull ${String(r.hull).padStart(5)}`);
  }
  await ctx.close();
  await closeBrowser();
})();
