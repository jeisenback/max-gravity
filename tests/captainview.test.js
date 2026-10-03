'use strict';

// The captain on the screens: Interior (the deck plan and the posts), the port header, Operations, Navigation, the burn HUD
// and the character screen, and in the chatter. For an owner, you are in command, in the same places.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const startHired = (bg = 'earth', post = 'gunner') => { startGame({ slot: 1, background: bg, captain: 'Sam Rowe', mode: 'hired', post }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; st.flags.classicCombat = true; };

test('a hired hand sees the captain on Interior, the header, Operations and Navigation', async () => {
  const { page, ev, done } = await open({ viewport: { width: 390, height: 844 }, mobile: true });
  await ev(`(${startHired})`);
  const cap = await ev(() => { const c = hiredCaptain(); return { id: c.id, name: `${c.first} ${c.last}`, wage: hired().wage, share: Math.round(hired().share * 100) }; });
  assert.match(await page.innerText('#panel .hdr, .hdr'), new RegExp(`Capt\\. ${cap.name}`), 'the port header says whose ship it is');
  await page.click('[data-action=station][data-arg=interior]');
  const row = await page.$$eval('#panel .con-read', rows => rows.map(r => [r.firstElementChild.textContent, r.lastElementChild.textContent]));
  assert.deepEqual(row[0], ['Captain', cap.name], 'the first row of the posts card');
  assert.ok(await page.$(`#panel .con-read [data-action=person][data-arg="${cap.id}"]`), 'and a link to their screen');
  const cabins = await page.$$eval('#panel .con-plant text.lbl', t => t.map(x => x.textContent));
  assert.ok(cabins.includes('CAPTAIN'), 'the captain\'s cabin is on the deck plan');
  assert.equal(await page.$$eval('#panel .con-plant circle[r="16"]', n => n.length), 5, 'three crew on the posts you do not hold, the captain, and you on yours');
  await page.click('[data-action=station][data-arg=ops]');
  assert.match(await page.innerText('#panel .con-head'), new RegExp(`captain's hold.*Capt\\. ${cap.name}`, 'i'));
  await page.click('[data-action=station][data-arg=nav]');
  assert.ok(await page.$(`#panel .eyebrow [data-action=person][data-arg="${cap.id}"]`), 'the run is the captain\'s, named and linked');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'no sideways scroll at phone width');
  await done();
});

test('the captain\'s screen has no post skills: what they pay you, and what you earn with them', async () => {
  const { page, ev, done } = await open();
  await ev(`(${startHired})`);
  const cap = await ev(() => { const c = hiredCaptain(); hired().ledger.push({ day: 1, from: 'A', to: 'B', good: 'water', tons: 5, profit: 500, wage: 120, share: 50 }); return { id: c.id, name: `${c.first} ${c.last}`, wage: hired().wage, share: Math.round(hired().share * 100) }; });
  await page.click('[data-action=station][data-arg=interior]');
  await page.click(`#panel .con-read [data-action=person][data-arg="${cap.id}"]`);
  const text = await page.innerText('#panel');
  assert.match(text, new RegExp(cap.name)); assert.match(text, /Captain, /);
  assert.doesNotMatch(text, /Post skills/i, 'a captain holds no post');
  assert.match(text, new RegExp(`Your wage\\s*${cap.wage} cr/day`)); assert.match(text, new RegExp(`Your share\\s*${cap.share}% of each run`)); assert.match(text, /Runs together\s*1/); assert.match(text, /You earned\s*170 cr/);
  assert.match(text, /captain of the .*, docked at/i);
  await done();
});

test('an owner is in command in the same places', async () => {
  const { page, ev, done } = await open();
  await ev(() => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent(); G.state.tutorial = null; UI.render(); });
  await page.click('[data-action=station][data-arg=interior]');
  const first = await page.$$eval('#panel .con-read', rows => [rows[0].firstElementChild.textContent, rows[0].lastElementChild.textContent]);
  assert.deepEqual(first, ['Captain', 'You, in command']);
  assert.ok((await page.$$eval('#panel .con-plant text.lbl', t => t.map(x => x.textContent))).includes('CAPTAIN'));
  assert.doesNotMatch(await page.innerText('.hdr'), /Capt\./, 'the header has no captain line: you are it');
  await page.click('#panel .con-read [data-action=person][data-arg=you]');
  const text = await page.innerText('#panel');
  assert.match(text, /playing as/i); assert.match(text, /command/i); assert.match(text, /Crew\s*\d/); assert.doesNotMatch(text, /Post skills/i);
  await done();
});

test('the burn HUD names the captain, and the chatter gives the captain their own lines', async () => {
  const { ev, done } = await open();
  await ev(`(${startHired})`);
  const r = await ev(() => {
    const out = {}, c = hiredCaptain(), spoken = [], real = ctx.fillText;
    ctx.fillText = function (t, ...a) { spoken.push(String(t)); return real.call(this, t, ...a); };
    try { drawHud(900, 700); } finally { ctx.fillText = real; }
    out.hud = spoken.some(t => t === `Capt. ${c.first} ${c.last}`);
    const r0 = Math.random;
    culture();  // the year's culture draws names until they differ: build it before the random is pinned
    Math.random = () => 0.1; out.authored = Mods.filter('chatter', ['the crew']);
    out.entry = captainEntry().chatter.length;
    delete hired().captainKey;  // a generated captain: eight habits and a line for each trait
    out.lines = Mods.filter('chatter', ['the crew']);
    Math.random = () => 0.9; out.pool = Mods.filter('chatter', ['the crew']);
    Math.random = r0;
    out.named = out.lines.every(l => l.includes(`Captain ${c.last}`)); out.clean = !out.lines.some(l => /\{|undefined/.test(l)) && !out.authored.some(l => /\{|undefined/.test(l));
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); culture(); Math.random = () => 0.1; out.owner = Mods.filter('chatter', ['the crew']); Math.random = r0;
    return out;
  });
  assert.ok(r.hud, 'the HUD has the captain\'s line');
  assert.equal(r.authored.length, r.entry, 'an authored captain has their own lines'); assert.ok(r.authored.length >= 8);
  assert.ok(r.lines.length >= 8 && r.named && r.clean, 'eight habits and a line for each trait, all naming the captain');
  assert.deepEqual(r.pool, ['the crew'], 'most of the time the crew speak');
  assert.ok(!r.owner.some(l => /Captain /.test(l)), 'an owner has no captain to hear from');
  await done();
});

test('runs together and what you earned keep counting past the 20 runs the ledger holds', async () => {
  const { ev, done } = await open();
  await ev(`(${startHired})`);
  const r = await ev(() => {
    const h = hired(), st = G.state, planet = currentPlanet();
    const settle = () => { h.run = { good: null, cost: 0, day: st.day - 1, from: 'Earth', planet: planet.name, sid: st.systemId, tons: 0 }; st.day += 1; settleRun(planet); };
    const start = { runs: runTotals(h).runs, earned: runTotals(h).earned };
    for (let i = 0; i < 25; i++) settle();
    const after = runTotals(h);
    // a save from before the totals were kept: they come from the ledger
    const old = { ledger: [{ wage: 100, share: 10 }, { wage: 50, share: 0 }] };
    return { start, after, held: h.ledger.length, wage: h.wage, oldSave: runTotals(old) };
  });
  assert.equal(r.held, 20, 'the ledger still holds only the last 20');
  assert.equal(r.after.runs - r.start.runs, 25, 'but the count goes on');
  assert.ok(r.after.earned - r.start.earned >= 25 * r.wage, 'and so does what you earned');
  assert.deepEqual(r.oldSave, { runs: 2, earned: 160 }, 'an older save counts what its ledger holds');
  await done();
});
