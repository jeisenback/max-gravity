'use strict';

// The talk scenes in the editor (#457): every row is lines in a burn, and each plays in the preview with the shipmate it is about. Played in six parts,
// tests/editortalk-1..6.test.js, each the rows whose place in the list leaves k over by six: one test of all 413 filled most of a CI shard on its own
// (#950), and --test-shard deals out whole files in their sorted order, one to each shard in turn, so six files with neighbouring names go to the six
// shards (.github/workflows/test.yml). In four parts a part took up to three minutes and its shard ran past five.

const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const { watch, closeBrowser } = require('./helpers');

const URL = 'file://' + path.resolve(__dirname, '..', 'editor.html');
const PARTS = 6;
const SHARED = { 'family:visit-home': 'kind.label', 'family:room-offer': 'c0.label', 'family:room-return': 'c0.label' };

function talkPart(k) {
  let browser, page, errors;
  before(async () => {
    browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined });
    const ctx = await browser.newContext({ viewport: { width: 1700, height: 1000 } });
    await ctx.route(/fonts\.(googleapis|gstatic)\.com/, route => route.fulfill({ status: 200, contentType: 'text/css', body: '' }));
    page = await ctx.newPage();
    errors = [];
    watch(page, errors);
    await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload();
    await page.waitForFunction(() => SceneIndex.rows, null, { timeout: 30000 });
  });
  after(async () => {
    try { assert.deepEqual(errors, [], 'page errors'); } finally { await browser.close(); await closeBrowser(); }
  });
  const select = async id => { await page.fill('#q', id); await page.click(`button[data-id="${id}"]`); };
  async function play() {
    await page.evaluate(() => { document.querySelector('#pv-report').replaceChildren(); document.querySelector('#pv-effects').replaceChildren(); });
    await page.click('[data-action="play"]');
    await page.waitForFunction(() => document.querySelector('#pv-report').textContent.length > 0, null, { timeout: 30000 });
    const f = page.frames().find(x => /editor-preview/.test(x.url()));
    await f.waitForFunction(() => typeof G !== 'undefined' && G.dialog, null, { timeout: 30000 });
    return f;
  }

  test(`the talk scenes are rows with a field for every line, and each plays in a burn with a shipmate it is about (#457): part ${k + 1} of ${PARTS}`, async () => {
    const r = await page.evaluate(() => {
      const rows = SceneIndex.rows.filter(x => x.id.startsWith('family:'));
      return { ids: rows.map(x => x.id), shape: rows.every(x => x.kind === 'data' && x.noTitle && x.where === (x.id === 'family:errand' ? 'port' : 'transit') && x.file === 'js/family.js') };
    });
    if (k === 0) {
      assert.equal(r.ids.length, 413, 'with the scenes by place of Lisbon, Lagos, Rotterdam, Chittagong, Ceres (#871), Hermes Foundry, Luna, Mars, Phobos Yards, the rest of the Belt and the outer moons (#885): with by place (#871), the talk scenes, Ines\'s, Tomas\'s and Cato\'s own three sittings and their talk after them, the talk going on, the visit home, the room that is theirs (its offer and its return), the errand, the picker, the birthday and holidays, the news, the traditions, the cat and the offer to stay');
      assert.ok(r.shape, 'each is lines, in a burn (the errand at a port), in js/family.js');
      const parts = Array.from({ length: PARTS }, (_, j) => `editortalk-${j + 1}.test.js`).filter(f => fs.existsSync(path.join(__dirname, f)));
      assert.equal(parts.length, PARTS, `every part is there, or a share of the rows goes unplayed: ${parts.join()}`);
    }
    const mine = r.ids.filter((_, i) => i % PARTS === k);
    for (const id of mine) {
      await select(id);
      const line = id === 'family:holiday' ? 'c0.label' : id.endsWith('-story') ? 'hope' : 'title';  // the holidays take their titles from their names; a module's story shows as the hope in the visit's choice (#871)
      const paths = await page.locator('#detail textarea[data-path]').evaluateAll(els => els.map(e => e.dataset.path));
      if (SHARED[id]) await page.fill(`textarea[data-path="part.${SHARED[id]}"]`, `Typed ${id}.`);  // the shared visit and room under every place (#885): a choice, so the rest of the rows still read their own (its title is the cast's, under a place's own)
      else if (paths.includes(`part.${line}`)) await page.fill(`textarea[data-path="part.${line}"]`, `Typed ${id}.`);
      else for (const pth of paths) await page.fill(`textarea[data-path="${pth}"]`, `Typed ${id}.`);  // a circumstance's place lines, with no title of their own (#871): one of them shows
      const f = await play();
      const seen = await f.evaluate(() => JSON.stringify([G.dialog.event.title, G.dialog.event.text, G.dialog.choices.map(c => c.label)]));
      assert.ok(seen.includes(`Typed ${id}.`), `${id} plays the typed ${line}: ${seen.slice(0, 200)}`);
    }
  });
}

module.exports = { talkPart, PARTS };
