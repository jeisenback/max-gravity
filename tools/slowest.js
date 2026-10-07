'use strict';

// A test reporter that lists the ten slowest tests after a run (#403), so a slow test is seen when it is added.
// `npm test` runs it beside the TAP reporter; the TAP output is unchanged.

// rows: [{ ms, name }]. Returns the n slowest, slowest first, one per line.
function slowest(rows, n = 10) {
  return [...rows].sort((a, b) => b.ms - a.ms).slice(0, n).map(r => `${(r.ms / 1000).toFixed(1).padStart(6)} s  ${r.name}`).join('\n');
}

module.exports = async function* (source) {
  const rows = [];
  for await (const event of source) {
    const d = event.data;
    // A top-level test, not the file that holds it (a file shows up as a test only when it fails to load).
    if ((event.type === 'test:pass' || event.type === 'test:fail') && d.nesting === 0 && !d.name.endsWith('.js')) rows.push({ ms: d.details.duration_ms, name: d.name });
  }
  if (rows.length) yield `\n# slowest ${Math.min(10, rows.length)} tests\n${slowest(rows)}\n`;
};
module.exports.slowest = slowest;
