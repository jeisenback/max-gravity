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
const { bundleOf } = require('../tools/bundle');
const STALL_MS = +process.env.TEST_STALL_MS || 120000;  // how long a page may take to answer one evaluate before the test fails (open's `stall`; 0 is no limit); the longest test takes 25 s in all
const COVERAGE_DIR = process.env.COVERAGE_DIR || '';  // set by tools/coverage.js: each page's JS coverage is written there
let coverageN = 0;
const ROOT = path.resolve(__dirname, '..');
const INDEX = path.join(ROOT, 'index.html');
const URL = 'file://' + INDEX;
let browser = null, launching = null;  // launching: the one launch in flight, so pages opened at once (tools/soak.js soaks) share a browser instead of each starting one

// The page loads about 100 scripts one by one, which takes about 510 ms to open; served as one script it takes about 240 ms (#402).
// The tests serve the bundle (tools/bundle.js, which also writes it to dist/ for the hosted copy, #577) at the same address: the document and one script are answered by a route, and every other file is read as
// it is. Coverage (tools/coverage.js) reads each script by its own address, so it loads them one by one.
let bundled;  // read once per test file
const theBundle = () => (bundled === undefined ? (bundled = bundleOf(fs.readFileSync(INDEX, 'utf8'), f => fs.readFileSync(path.join(ROOT, f), 'utf8'))) : bundled);

// A page that stops answering (a loop in the game, or Chromium blocked in its font lookup: #729) would stall the whole run with no failure to read. An evaluate that has not returned in `ms`
// fails its test instead, naming where it was called from and saying whether the page's renderer was busy (a loop) or asleep (the font lookup). Used by open() on every evaluate it makes.
async function stallReport(ms, where) {
  let cpu = 'the renderer was not measured';
  try {
    const s = await browser.newBrowserCDPSession();
    const busy = async () => (await s.send('SystemInfo.getProcessInfo')).processInfo.filter(p => p.type === 'renderer').reduce((t, p) => t + p.cpuTime, 0);
    const a = await busy(); await new Promise(r => setTimeout(r, 1000)); const b = await busy();
    cpu = `the renderers used ${(b - a).toFixed(2)} s of CPU in the next second (about 0: asleep, Chromium's blocked font lookup, #729; about 1: a loop in the page)`;
  } catch (e) { cpu = `the renderers could not be measured (${e.message})`; }
  return `the page did not answer in ${ms / 1000} s (${where}); ${cpu}`;
}
const guarded = (run, ms, where) => {
  if (!ms) return run;
  let timer;
  const late = new Promise((_, reject) => { timer = setTimeout(() => stallReport(ms, where).then(m => reject(new Error(m))), ms); });
  return Promise.race([run, late]).finally(() => clearTimeout(timer));
};
const calledFrom = () => (new Error().stack.split('\n').slice(1).find(l => !/helpers\.js|node:internal/.test(l)) || 'unknown').trim();

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
//   scope: 'earth-hired' (the default here), the narrow build the game ships with (js/build.js), or 'full' for a test of what that build switches off (the owner game, the other starts, captains and storylines)
//   bundle: false to load the scripts one by one as index.html lists them (the default serves them as one, bundleOf above)
//   stall: milliseconds a page may take to answer one evaluate before the test fails with a report of what the browser was doing (default STALL_MS; 0: no limit, for the soaks)
//   video: a folder to record the page's video into (Playwright's recordVideo, at the viewport's size; tools/playthrough.js)
//   debt: true to start a hired hand owing the hiring hall's bond (js/hired.js, #280). It is off in tests, so the many that buy a ship or
//         count a hand's pay start as they did before the bond; the soak and the tests of the bond turn it on.
//   brief: true to play the first deck fight's briefing (captains.js deckExplanation, #850). It is off in tests, so the many that open a deck fight see
//          its panel as they did before; the play-through, the soak and the briefing's own test turn it on.
async function open({ title = false, viewport = { width: 1280, height: 800 }, mobile = false, init = null, seed = 1, hash = '', scope = 'earth-hired', debt = false, brief = false, bundle = true, stall = STALL_MS, video = null } = {}) {
  if (!browser) { launching = launching || chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined }); browser = await launching; launching = null; }
  const ctx = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile, ...(video ? { recordVideo: { dir: video, size: viewport } } : {}) });
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
  // A page now and then blocks for good in Chromium's own font lookup (the renderer's main thread waits in font_service::FontServiceThread::MatchFamilyName with the browser idle, and a
  // page evaluate that is waiting then never returns: one file in thirty with four browsers on four cores, 15 pages in 100 with eight). It is not the game: the stack is Chromium's, and a
  // debugger attached to the page before it loads has never shown it (about 900 pages tried, against 15 in 100 without), so one is: Debugger.enable, with nothing paused.
  await (await ctx.newCDPSession(page)).send('Debugger.enable');
  const errors = [];
  watch(page, errors);
  if (COVERAGE_DIR) await page.coverage.startJSCoverage({ resetOnNavigation: false });  // tools/coverage.js
  const query = [scope === 'full' ? 'scope=full' : ''].filter(Boolean).join('&');
  await page.goto(URL + (query ? `?${query}` : '') + hash);  // the build's scope (js/build.js): tests run the build the game ships unless they ask for the full one
  await page.waitForFunction(() => typeof G !== 'undefined' && (G.state || G.mode === 'title'));
  // The main characters are drawn from a pool (js/cast.js). A test starts from the pair it knew (by background) unless it asks for the draw: realDrawCastPair.
  const opening = calledFrom();
  await guarded(page.evaluate(() => { window.realDrawCastPair = drawCastPair; window.drawCastPair = bg => (CAST_PAIRS[bg] ? [...CAST_PAIRS[bg]] : []); }), stall, `opening the page, ${opening}`);
  if (!debt || !brief) await guarded(page.evaluate(([debt, brief]) => { const real = startGame; window.startGame = o => { const r = real(o); if (hired() && !debt && o.debt === undefined) hired().debt = 0; if (hired() && !brief) hired().deckTold = true; return r; }; }, [debt, brief]), stall, `opening the page, ${opening}`);
  // Runs a function in the page with the random seed reset first, so a block of
  // game logic plays out the same way whatever the frame loop did before it.
  const ev = (fn, arg) => guarded(page.evaluate(([src, a, s]) => { __seed(s); return (0, eval)(`(${src})`)(a); }, [fn.toString(), arg, seed]), stall, `ev, ${calledFrom()}`);
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

// Waits until the page has drawn n animation frames, so what the game works out while drawing (G.cutHits, G.burnBoxes, the bridge sheet) has caught up with a
// change. A fixed sleep guessed at that and cost its whole length every time (#758).
const frames = (page, n = 2) => page.evaluate(n => new Promise(done => { const step = k => (k ? requestAnimationFrame(() => step(k - 1)) : done()); step(n); }), n);

module.exports = { open, watch, closeBrowser, URL, goTo , frames };
