'use strict';

// tests/helpers.js serves the page's scripts as one bundle, routed over the real index.html, because a page that loads
// 100 scripts one by one takes about 510 ms to open and a bundled one about 240 ms (#402). The page and the URL are the
// same; only the number of script requests differs.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { open, closeBrowser, bundleOf } = require('./helpers');

after(closeBrowser);

const root = path.resolve(__dirname, '..');
const scriptsOf = html => [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)].map(m => m[1]);

test('the bundle holds every script of index.html, in order, under one tag', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8'), srcs = scriptsOf(html);
  const b = bundleOf(html, f => fs.readFileSync(path.join(root, f), 'utf8'));
  assert.ok(b, 'a bundle is made');
  let at = -1;
  for (const s of srcs) {
    const body = fs.readFileSync(path.join(root, s), 'utf8'), i = b.js.indexOf(body);
    assert.ok(i > at, `${s} is in the bundle, after the script before it`);
    at = i;
  }
  assert.equal(scriptsOf(b.html).length, 1, 'one script tag is left');
  assert.ok(b.html.includes(b.src), 'and it is the bundle');
  assert.ok(b.html.includes('mods/example-vesta.js'), 'the comment about mods is kept');
});

test('scripts that are not in one run are not bundled', () => {
  const html = '<script src="js/a.js"></script>\n<script src="mods/m.js"></script>\n<script src="js/b.js"></script>';
  assert.equal(bundleOf(html, () => ''), null, 'a mod between two built-ins keeps its place, so nothing is bundled');
  const commented = '<script src="js/a.js"></script>\n<!-- <script src="mods/m.js"></script> -->\n<script src="js/b.js"></script>';
  assert.ok(bundleOf(commented, () => ''), 'a commented-out mod does not split the run');
});

test('a long run of comments between scripts is checked in linear time', () => {
  const gap = '<!--' + '--><!--'.repeat(24) + 'x';  // a regex that backtracks takes exponential time on this
  const html = `<script src="js/a.js"></script>${gap}<script src="js/b.js"></script>`;
  const start = process.hrtime.bigint();
  assert.equal(bundleOf(html, () => ''), null, 'text that is not a comment between the scripts means no bundle');
  assert.ok(Number(process.hrtime.bigint() - start) / 1e6 < 200, 'and it is decided quickly');
  const many = `<script src="js/a.js"></script>${'<!-- c -->'.repeat(5000)}<script src="js/b.js"></script>`;
  assert.ok(bundleOf(many, () => ''), 'any number of whole comments is fine');
});

test('a test page is bundled unless it asks not to be, and both start the game', async () => {
  const bundled = await open({});
  const a = await bundled.ev(() => ({ scripts: document.scripts.length, started: typeof G !== 'undefined' && !!G.state }));
  assert.ok(a.scripts <= 3, `bundled: ${a.scripts} script elements`); assert.equal(a.started, true);
  await bundled.done();
  const plain = await open({ bundle: false });
  const b = await plain.ev(() => ({ scripts: document.scripts.length, started: typeof G !== 'undefined' && !!G.state }));
  assert.ok(b.scripts > 50, `not bundled: ${b.scripts} script elements`); assert.equal(b.started, true);
  await plain.done();  // and the page, loaded script by script as shipped, raised no error
});
