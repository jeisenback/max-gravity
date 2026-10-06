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

const URL = 'file://' + path.resolve(__dirname, '..', 'index.html');
let browser = null;

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
//   shell: true to open the ship-interface shell (js/shell.js), which is off unless the address says shell=on
async function open({ title = false, viewport = { width: 1280, height: 800 }, mobile = false, init = null, seed = 1, hash = '', scope = 'full', shell = false } = {}) {
  browser = browser || await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript(seedScript, seed);
  if (title) await ctx.addInitScript(() => Object.defineProperty(navigator, 'webdriver', { get: () => false }));
  if (init) await ctx.addInitScript(init);
  // The page links Google Fonts. A test should not depend on the network (a dropped tunnel is a page error), so answer those requests here.
  await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  const page = await ctx.newPage();
  const errors = [];
  watch(page, errors);
  const query = [scope === 'full' ? 'scope=full' : '', shell ? 'shell=on' : ''].filter(Boolean).join('&');
  await page.goto(URL + (query ? `?${query}` : '') + hash);  // the build's scope (js/build.js): tests run everything unless they ask for the narrow one
  await page.waitForFunction(() => typeof G !== 'undefined' && (G.state || G.mode === 'title'));
  // The main characters are drawn from a pool (js/cast.js). A test starts from the pair it knew (by background) unless it asks for the draw: realDrawCastPair.
  await page.evaluate(() => { window.realDrawCastPair = drawCastPair; window.drawCastPair = bg => (CAST_PAIRS[bg] ? [...CAST_PAIRS[bg]] : []); });
  // Runs a function in the page with the random seed reset first, so a block of
  // game logic plays out the same way whatever the frame loop did before it.
  const ev = (fn, arg) => page.evaluate(([src, a, s]) => { __seed(s); return (0, eval)(`(${src})`)(a); }, [fn.toString(), arg, seed]);
  const done = async () => { await ctx.close(); assert.deepEqual(errors, [], 'page errors'); };
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

module.exports = { open, watch, closeBrowser, URL };
