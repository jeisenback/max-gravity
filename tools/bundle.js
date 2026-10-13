'use strict';

// The hosted copy's build (#577): the scripts index.html lists, joined into one file, and the page rewritten to load it. A page that loads 100 scripts one by one takes about 510 ms
// to open and a bundled one about 240 ms (#402). The tests serve the same bundle (tests/helpers.js); this writes it to disk.
//   node tools/bundle.js [out]     writes the rewritten index.html, js/__bundle.js and copies of what the page loads to out (default dist/)
// No minifier and no dependencies. Development still loads the scripts one by one, so nothing changes for a developer.

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const BUNDLE = 'js/__bundle.js';
const COPIED = ['style.css', 'sw.js', 'manifest.webmanifest', 'icons', 'mods'];

// True if the text is only whitespace and whole comments (the gap between two scripts that may still be bundled). A scan, not a regex,
// so a long run of comment markers cannot make it slow.
function onlyComments(text) {
  let i = 0;
  for (;;) {
    while (i < text.length && text[i].trim() === '') i++;
    if (i >= text.length) return true;
    if (!text.startsWith('<!--', i)) return false;
    const close = text.indexOf('-->', i + 4);
    if (close < 0) return false;
    i = close + 3;
  }
}

// Scripts that are not in one run in index.html (a mod between two built-ins) are not bundled. Returns { html, js, src }, or null.
function bundleOf(html, read) {
  const tags = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)];
  if (!tags.length) return null;
  const end = t => t.index + t[0].length;
  for (let i = 1; i < tags.length; i++) if (!onlyComments(html.slice(end(tags[i - 1]), tags[i].index))) return null;
  let page = html;
  for (let i = tags.length - 1; i >= 0; i--) page = page.slice(0, tags[i].index) + (i === 0 ? `<script src="${BUNDLE}"></script>` : '') + page.slice(end(tags[i]));
  return { html: page, js: tags.map(m => read(m[1])).join('\n'), src: BUNDLE };
}

// Writes the hosted copy to out and returns what it wrote.
function writeDist(out, root = ROOT) {
  const b = bundleOf(fs.readFileSync(path.join(root, 'index.html'), 'utf8'), f => fs.readFileSync(path.join(root, f), 'utf8'));
  if (!b) throw new Error('index.html does not list its scripts in one run, so they cannot be bundled');
  fs.mkdirSync(path.join(out, 'js'), { recursive: true });
  fs.writeFileSync(path.join(out, 'index.html'), b.html);
  fs.writeFileSync(path.join(out, b.src), b.js);
  for (const f of COPIED) fs.cpSync(path.join(root, f), path.join(out, f), { recursive: true });
  return b;
}

if (require.main === module) {
  const out = path.resolve(process.argv[2] || path.join(ROOT, 'dist'));
  const b = writeDist(out);
  console.log(`${path.relative(process.cwd(), out) || '.'}: index.html, ${b.src} (${(b.js.length / 1024).toFixed(0)} kB), ${COPIED.join(', ')}`);
}

module.exports = { bundleOf, writeDist, BUNDLE };
