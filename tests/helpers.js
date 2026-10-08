'use strict';

// Shared set-up for the browser tests: a fresh page per test (its own empty
// localStorage), a seeded Math.random so runs repeat, and a list of page errors
// that every test checks at the end.
//
// Opening a page is most of a test's cost (about 0.5 s on the headless shell, 0.8 s on full Chromium, with four files running), so
// prefer the headless shell. CHROMIUM_PATH points at a browser binary when Playwright's own download is not
// installed (npx playwright install chromium).

const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');

const fs = require('node:fs');
const COVERAGE_DIR = process.env.COVERAGE_DIR || '';  // set by tools/coverage.js: each page's JS coverage is written there
let coverageN = 0;
const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const URL = 'file://' + INDEX;
let browser = null;

// The page loads about 100 scripts one by one, which takes about 510 ms to open; served as one script it takes about 240 ms (#402).
// The tests serve the bundle at the same address: the document and one script are answered by a route, and every other file is read as
// it is. Scripts that are not in one run in index.html (a mod between two built-ins) are not bundled. bundleOf(html, read) returns
// { html, js, src }, or null. Coverage (tools/coverage.js) reads each script by its own address, so it loads them one by one.
const BUNDLE = 'js/__bundle.js';
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
function bundleOf(html, read) {
  const tags = [...html.matchAll(/<script src="(js\/[^"]+)"><\/script>/g)];
  if (!tags.length) return null;
  const end = t => t.index + t[0].length;
  for (let i = 1; i < tags.length; i++) if (!onlyComments(html.slice(end(tags[i - 1]), tags[i].index))) return null;
  let page = html;
  for (let i = tags.length - 1; i >= 0; i--) page = page.slice(0, tags[i].index) + (i === 0 ? `<script src="${BUNDLE}"></script>` : '') + page.slice(end(tags[i]));
  return { html: page, js: tags.map(m => read(m[1])).join('\n'), src: BUNDLE };
}
let bundled;  // read once per test file
const theBundle = () => (bundled === undefined ? (bundled = bundleOf(fs.readFileSync(INDEX, 'utf8'), f => fs.readFileSync(path.join(ROOT, f), 'utf8'))) : bundled);

// Runs in the page before any game script. mulberry32: small, fast, good enough.
function seedScript(seed) {
  window.__seed = s => {
    let a = s >>> 0;
    Math.random = () => {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = a;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  };
  window.__seed(seed);
}

// Opens the game. Options:
//   title: true to see the title screen (otherwise automated runs start straight in a game)
//   viewport, mobile: page size and touch
//   init: a function to run in the page before the game loads
//   seed: the random seed
//   scope: 'full' (the default here) or 'earth-hired', the narrow build the game ships with (js/build.js)
//   bundle: false to load the scripts one by one as index.html lists them (the default serves them as one, bundleOf above)
//   debt: true to start a hired hand owing the hiring hall's bond (js/hired.js, #280). It is off in tests, so the many that buy a ship or
//         count a hand's pay start as they did before the bond; the soak and the tests of the bond turn it on.
//   shell: true to open the ship-interface shell (js/shell.js, shell=on), false (the default) to open the old screens (shell=off), or
//          'default' to add nothing, so the build's own default applies (on in the narrow build). SHELL_TESTS=on makes true the default.
async function open({ title = false, viewport = { width: 1280, height: 800 }, mobile = false, init = null, seed = 1, hash = '', scope = 'full', shell = process.env.SHELL_TESTS === 'on', debt = false, bundle = true } = {}) {
  browser = browser || await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(seedScript, seed);
  if (title) await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  if (init) await ctx.addInitScript(init);
  // The page links Google Fonts. A test should not depend on the network (a dropped tunnel is a page error), so answer those requests here.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const b = bundle && !COVERAGE_DIR && theBundle();
  if (b) {
    await ctx.route(u => u.protocol === 'file:' && u.pathname === INDEX, route => route.fulfill({ status: 200, contentType: 'text/html', body: b.html }));
    await ctx.route(u => u.protocol === 'file:' && u.pathname.endsWith('/' + b.src), route => route.fulfill({ status: 200, contentType: 'text/javascript', body: b.js }));
  }
  const page = await ctx.newPage();
  const errors = [];
  watch(page, errors);
  if (COVERAGE_DIR) await page.coverage.startJSCoverage({ resetOnNavigation: false });  // tools/coverage.js
  const query = [scope === 'full' ? 'scope=full' : '', shell === 'default' ? '' : shell ? 'shell=on' : 'shell=off'].filter(Boolean).join('&');
  await page.goto(URL + (query ? `?${query}` : '') + hash);  // the build's scope (js/build.js): tests run everything unless they ask for the narrow one
  await page.waitForFunction(() => typeof G !== 'undefined' && (G.state || G.mode === 'title'));
  // The main characters are drawn from a pool (js/cast.js). A test starts from the pair it knew (by background) unless it asks for the draw: realDrawCastPair.
  await page.evaluate(() => { window.realDrawCastPair = drawCastPair; window.drawCastPair = bg => (CAST_PAIRS[bg] ? [...CAST_PAIRS[bg]] : []); });
  if (!debt) await page.evaluate(() => { const real = startGame; window.startGame = o => { const r = real(o); if (hired() && o.debt === undefined) hired().debt = 0; return r; }; });
  // Runs a function in the page with the random seed reset first, so a block of
  // game logic plays out the same way whatever the frame loop did before it.
  const ev = (fn, arg) => page.evaluate(([src, a, s]) => { __seed(s); return (0, eval)(`(${src})`)(a); }, [fn.toString(), arg, seed]);
  const done = async () => {
    if (COVERAGE_DIR) {  // the scripts this page ran, kept for tools/coverage.js to merge
      const entries = await page.coverage.stopJSCoverage();
      fs.writeFileSync(path.join(COVERAGE_DIR, `${process.pid}-${coverageN++}.json`), JSON.stringify(entries.filter(e => e.url.includes('/js/')).map(e => ({ url: e.url, length: e.source.length, functions: e.functions }))));
    }
    await ctx.close();
    assert.deepEqual(errors, [], 'page errors');
  };
  return { page, ctx, ev, errors, done, url: URL };
}

function watch(page, errors) {
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !/ERR_CERT|font/i.test(m.text())) errors.push('console: ' + m.text()); });
}

async function closeBrowser() {
  if (browser) await browser.close();
  browser = null;
}

// Opens a page on the shell's rail (js/shell.js) by clicking its entry. A shut entry is not clicked: it throws the reason the rail prints under it.
async function goTo(page, tab) {
  const entry = await page.$(`.rail [data-action=tab][data-arg="${tab}"]`);
  if (!entry) throw new Error(`no rail entry for ${tab}`);
  if (await entry.isDisabled()) throw new Error(`the ${tab} entry is shut: ${await entry.evaluate(b => (b.nextElementSibling && b.nextElementSibling.className === 'rail-why' ? b.nextElementSibling.textContent : ''))}`);
  await entry.click();
}

module.exports = { open, watch, closeBrowser, bundleOf, URL, goTo };
