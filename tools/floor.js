'use strict';

// The coverage floor (#397): the narrow build's files may not fall under a minimum line coverage. Pure, so a test can hand it rows.
// floor: { default, globs: ['js/hired*.js', ...], files: { 'js/hired.js': 96, ... } }; a glob has `*` for a run of characters inside one folder.

const globToRegExp = glob => new RegExp(`^${glob.split('*').map(s => s.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('[^/]*')}$`);

// rows: [{ file, code, hit, missed }] from the report; onDisk: every js file in the repository, so a listed file no test loads is found.
function checkFloor(rows, floor, onDisk = []) {
  const res = (floor.globs || []).map(globToRegExp), listed = file => res.some(re => re.test(file));
  const byFile = new Map(rows.map(r => [r.file, r]));
  const names = new Set([...rows.map(r => r.file), ...onDisk].filter(listed).concat(Object.keys(floor.files || {})));
  const failures = [];
  for (const file of [...names].sort()) {
    const min = (floor.files || {})[file] ?? floor.default, r = byFile.get(file);
    if (!r) failures.push({ file, min, missing: true });
    else if (r.pct === undefined ? (100 * r.hit) / r.code < min : r.pct < min) {
      const pct = r.pct === undefined ? (100 * r.hit) / r.code : r.pct;
      failures.push({ file, min, pct, short: Math.ceil((min / 100) * r.code) - r.hit, missed: r.missed || [] });
    }
  }
  return { checked: names.size, failures };
}

// What to print for the files that fell, so the failure says what to test.
function describe({ checked, failures }) {
  if (!failures.length) return `Coverage floor: ${checked} files, none under.`;
  return [`Coverage floor: ${failures.length} of ${checked} files under.`].concat(failures.map(f => f.missing
    ? `  ${f.file}: no coverage data (is it loaded by any test?), floor ${f.min}`
    : `  ${f.file}: ${f.pct.toFixed(1)} percent, floor ${f.min}; about ${f.short} more lines to test, uncovered ${f.missed.slice(0, 12).join(', ')}${f.missed.length > 12 ? ', ...' : ''}`)).join('\n');
}

// Whether a pull request that changes these files (repo-relative) runs the coverage pass in CI (#754): a file the floor names, or what measures and checks it.
// A change elsewhere that lowers a floor file's coverage (a test taken out) is caught by the run on main after the merge.
const COVERAGE_TOOLS = ['tools/coverage.js', 'tools/floor.js', 'tools/coverage-floor.json', 'tests/helpers.js', '.github/workflows/test.yml'];
const touchesFloor = (changed, floor) => {
  const res = (floor.globs || []).map(globToRegExp), named = Object.keys(floor.files || {});
  return changed.some(f => COVERAGE_TOOLS.includes(f) || named.includes(f) || res.some(re => re.test(f)));
};

module.exports = { checkFloor, describe, globToRegExp, touchesFloor };
