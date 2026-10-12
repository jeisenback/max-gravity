'use strict';

// The service worker (sw.js) drops a returning player's old cache when its name changes (#324): the old game's scripts are not served
// from a copy kept under the old name. Run against a fake worker scope, so no browser is needed.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function loadWorker(existing) {
  const handlers = {}, deleted = [];
  const scope = {
    addEventListener: (type, fn) => { handlers[type] = fn; },
    skipWaiting() {}, clients: { claim() {} },
    caches: { open: async () => ({ addAll: async () => {}, put: async () => {} }), keys: async () => existing, delete: async k => { deleted.push(k); return true; }, match: async () => undefined },
    fetch: async () => ({ ok: true, clone() { return this; } }),
  };
  scope.self = scope;
  const ctx = vm.createContext(scope);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8'), ctx);
  return { handlers, deleted, cache: vm.runInContext('CACHE', ctx) };
}

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
