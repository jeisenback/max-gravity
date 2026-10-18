'use strict';

// The service worker (sw.js) drops a returning player's old cache when its name changes (#324): the old game's scripts are not served
// from a copy kept under the old name. Run against a fake worker scope, so no browser is needed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

// existing: the cache names already there. page: the index.html the worker reads at install. response: what the network answers (null: offline).
function loadWorker(existing, { page = '', response = { ok: true, type: 'basic' } } = {}) {
  const handlers = {}, deleted = [], added = [], put = [];
  const cache = { addAll: async urls => { added.push(...urls); }, put: async req => { put.push(req); }, match: async url => (url === 'index.html' ? { text: async () => page } : undefined) };
  const scope = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting() {}, clients: { claim() {} },
    caches: { open: async () => cache, keys: async () => existing, delete: async k => { deleted.push(k); return true; }, match: async () => undefined },
    fetch: async () => { if (!response) throw new TypeError('offline'); return { ...response, clone() { return this; } }; },
    Response: { error: () => 'network error' },
  };
  scope.self = scope;
  const ctx = vm.createContext(scope);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctx);
  return { handlers, deleted, added, put, cache: vm.runInContext('CACHE', ctx) };
}
const fetchOf = async (w, url = 'js/game.js') => {
  let answer;
  w.handlers.fetch({ request: { method: 'GET', url }, respondWith: p => { answer = p; } });
  const r = await answer;
  await new Promise(res => setTimeout(res, 0));  // the copy is put after the answer
  return r;
};

// js/build.js reads the address, so it is read as text here: the version and the dev flag.
const BUILD_SRC = fs.readFileSync(path.join(__dirname, '..', 'js', 'build.js'), 'utf8');
const [, VERSION, DEV] = BUILD_SRC.match(/version: '([^']+)', dev: (true|false)/);

test('the cache is named for this version of the game', () => {
  assert.equal(loadWorker([]).cache, `max-gravity-${VERSION}`, 'a new version in js/build.js needs the same name in sw.js, or installed copies keep the old scripts (#578)');
});

test('a version ends in -dev while the tester tools are on, and not otherwise', () => {
  assert.equal(DEV === 'true', /-dev$/.test(VERSION), `dev is ${DEV} and the version is ${VERSION}: a release sets dev to false and drops -dev, a work in progress keeps both (#578)`);
});

test('activating drops the old cache and keeps the current one', async () => {
  const w = loadWorker(['max-gravity-v1', `max-gravity-${VERSION}`]);
  let waiting;
  w.handlers.activate({ waitUntil: p => { waiting = p; } });
  await waiting;
  assert.deepEqual(w.deleted, ['max-gravity-v1']);
});

// #755: a first visit can play offline. The page's scripts load before the worker is there, so the worker caches what index.html lists when it installs:
// the one bundle in the hosted copy (tools/bundle.js), every script in the repository's page.
test('installing caches the shell and every script the page lists', async () => {
  const w = loadWorker([], { page: '<script src="js/build.js"></script>\n<script src="js/game.js"></script>' });
  let waiting;
  w.handlers.install({ waitUntil: p => { waiting = p; } });
  await waiting;
  assert.ok(['./', 'index.html', 'style.css', 'manifest.webmanifest'].every(u => w.added.includes(u)), 'the shell');
  assert.ok(w.added.includes('js/build.js') && w.added.includes('js/game.js'), 'and the scripts');
  const real = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  const all = loadWorker([], { page: real });
  all.handlers.install({ waitUntil: p => { waiting = p; } });
  await waiting;
  assert.ok(all.added.filter(u => u.startsWith('js/')).length > 100, 'every script of the real page');
});

test('a cross-origin answer the page cannot read (opaque) is not kept; a readable one is', async () => {
  const opaque = loadWorker([], { response: { ok: false, type: 'opaque' } });
  await fetchOf(opaque, 'https://example.com/mod.js');
  assert.equal(opaque.put.length, 0, 'an opaque entry costs megabytes of quota and may be an error');
  const ok = loadWorker([]);
  await fetchOf(ok);
  assert.equal(ok.put.length, 1);
});

test('offline with nothing cached, the request gets a network error, not undefined', async () => {
  assert.equal(await fetchOf(loadWorker([], { response: null })), 'network error');
});
