'use strict';

// How the suite splits between the two builds (#571): the shipped narrow build (the default of open() in tests/helpers.js) and the full one, which a test asks for with
// `scope: 'full'`. A count of the calls in the test files by what they name, so a drift back to the full build stays visible.
//   npm run scopes

const fs = require('node:fs');
const path = require('node:path');

// sources: { path: text } of the tests/*.test.js files. A call that builds its scope (a loop over both) counts once, under what it names.
function countScopes(sources) {
  let calls = 0, full = 0, narrow = 0;
  for (const text of Object.values(sources)) {
    calls += (text.match(/\bopen\(/g) || []).length;
    full += (text.match(/scope: 'full'/g) || []).length;
    narrow += (text.match(/scope: 'earth-hired'/g) || []).length;
  }
  return { calls, full, narrow, byDefault: Math.max(0, calls - full - narrow) };
}

function main() {
  const dir = path.join(__dirname, '..', 'tests');
  const sources = Object.fromEntries(fs.readdirSync(dir).filter(f => f.endsWith('.test.js') && f !== 'scopes.test.js').map(f => [f, fs.readFileSync(path.join(dir, f), 'utf8')]));
  const r = countScopes(sources);
  console.log(`open() calls in the tests: ${r.calls}. The full build is named by ${r.full}, the shipped build by ${r.narrow}, and ${r.byDefault} take the default (the shipped build).`);
}

if (require.main === module) main();
module.exports = { countScopes };
