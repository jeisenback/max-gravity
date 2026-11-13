'use strict';

// Wrecks and salvage (#965, js/salvage.js): the cutting's numbers in plain Node; the board, the scenes and delivery in the browser.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const NAMES = ['WRECK_TYPES', 'SECTION_RISK', 'CAREFUL', 'sectionRisk', 'sectionTake', 'sectionPart', 'riskOutcome', 'readWord', 'seedSite'];
const pure = () => load(['js/data.js', 'js/util.js', 'js/orbits.js', 'js/sites.js', 'js/salvage.js'], { G: { state: {} }, Mods: { register() {}, on() {} } }, NAMES);

test('the risk of a section rises with depth and halves when cut carefully', () => {
  const { sectionRisk, SECTION_RISK, CAREFUL } = pure();
  assert.deepEqual([...SECTION_RISK], [0.1, 0.25, 0.4]); assert.equal(CAREFUL, 0.5);
  assert.equal(sectionRisk(1, false), 0.1); assert.equal(sectionRisk(3, false), 0.4); assert.equal(sectionRisk(2, true), 0.125);
});

test('the take of a section is 3, 5 or 8 tons by depth, halved carefully, never more than the room, in one of the type\'s goods', () => {
  const { sectionTake, WRECK_TYPES } = pure();
  assert.equal(sectionTake('orehauler', 1, false, 100).tons, 3); assert.equal(sectionTake('orehauler', 2, false, 100).tons, 5);
  assert.equal(sectionTake('orehauler', 3, false, 100).tons, 8); assert.equal(sectionTake('orehauler', 3, true, 100).tons, 4);
  assert.equal(sectionTake('orehauler', 3, false, 2).tons, 2); assert.equal(sectionTake('orehauler', 3, false, 0).tons, 0);
  for (const type of Object.keys(WRECK_TYPES)) for (const d of [1, 2, 3]) assert.ok(WRECK_TYPES[type].goods.includes(sectionTake(type, d, false, 50).good));
});

test('an intact part is on a later section of some wrecks, the same every time, and never on the first', () => {
  const { sectionPart, seedSite } = pure();
  let two = 0, three = 0;
  for (let i = 0; i < 300; i++) {
    const w = seedSite(i * 7919, 'wreck', 1, 0).wreck;
    assert.equal(sectionPart(w, 1), false); assert.equal(sectionPart(w, 2), sectionPart(w, 2));
    if (sectionPart(w, 2)) two++; if (sectionPart(w, 3)) three++;
  }
  assert.ok(two > 60 && two < 140, `about a third on section 2: ${two}`); assert.ok(three > 110 && three < 190, `about half on section 3: ${three}`);
});

test('a failed cut is an injury, a system hit or the section lost, by thirds of the roll', () => {
  const { riskOutcome } = pure();
  assert.equal(riskOutcome(0.1), 'hurt'); assert.equal(riskOutcome(0.5), 'system'); assert.equal(riskOutcome(0.9), 'lost');
});

test('the read of a section is clean, some or bad, never more than a band off, and a skilled reader reads true', () => {
  const { readWord } = pure();
  const band = r => (r < 0.15 ? 0 : r < 0.33 ? 1 : 2), words = ['clean', 'some', 'bad'];
  assert.equal(readWord(0.1, 0), 'clean'); assert.equal(readWord(0.1, 3), 'clean');
  assert.equal(readWord(0.4, 3), 'bad'); assert.equal(readWord(0.25, 3), 'some');
  for (const r of [0.05, 0.1, 0.125, 0.2, 0.25, 0.4]) assert.ok(Math.abs(words.indexOf(readWord(r, 0)) - band(r)) <= 1, `${r}`);
});

// ---------- the board (browser) ----------

const { helpers, started } = require('./coop');

test('the co-op\'s board offers at most one salvage and one survey job, the same for a port and a day, with what the job is', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(); st.fuel = ship().fuel;
    const days = [];
    for (let d = 0; d < 12; d++) days.push(jobsAt(st, currentPlanet(), st.day + d).map(j => j.kind));
    const again = JSON.stringify(jobsAt(st, currentPlanet(), st.day)) === JSON.stringify(jobsAt(st, currentPlanet(), st.day));
    let day = st.day; while (!jobsAt(st, currentPlanet(), day).length && day < st.day + 60) day++;
    st.day = day; UI.tab = 'port'; UI.render();
    const jobs = jobsAt(st, currentPlanet(), st.day), rows = [...document.querySelectorAll('button[data-action="takeJob"]')].map(b => b.parentElement.textContent);
    return { days, again, jobs, rows, role: role().id };
  });
  await done();
  assert.equal(r.role, 'coop'); assert.equal(r.again, true);
  for (const d of r.days) { assert.ok(d.filter(k => k === 'salvage').length <= 1); assert.ok(d.filter(k => k === 'survey').length <= 1); }
  assert.ok(r.days.some(d => d.length), 'some days have a job');
  assert.equal(r.rows.length, r.jobs.length);
  for (const [i, j] of r.jobs.entries()) {
    assert.ok(j.pay > 0 && j.deadline > 0 && j.site.startsWith('site:'));
    assert.match(r.rows[i], new RegExp(j.client)); assert.match(r.rows[i], /AU/); assert.match(r.rows[i], /Ceres/); assert.match(r.rows[i], /cr/);
    if (j.kind === 'salvage') assert.match(r.rows[i], /a courier|an ore hauler|a raider|a yacht/);
  }
});

test('an owner\'s board has no salvage jobs', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'owner', shipId: 'shuttle' }); while (G.dialog) finishEvent();
    const st = G.state; let n = 0; for (let d = 0; d < 20; d++) n += jobsAt(st, currentPlanet(), st.day + d).length;
    return { n, role: role().id };
  });
  await done();
  assert.notEqual(r.role, 'coop'); assert.equal(r.n, 0);
});

test('taking a salvage job finds the wreck and sets the course; with a contract under way it is refused', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(); st.fuel = ship().fuel;
    let day = st.day; while (!jobsAt(st, currentPlanet(), day).some(j => j.kind === 'salvage') && day < st.day + 90) day++;
    st.day = day;
    const i = jobsAt(st, currentPlanet(), st.day).findIndex(j => j.kind === 'salvage'), j = jobsAt(st, currentPlanet(), st.day)[i];
    career().run = { contract: true }; const refused = takeJob(i); career().run = null;
    const took = takeJob(i), job = career().job;
    const again = takeJob(0);
    return { refused, took, kind: job && job.kind, site: j.site, found: G.state.sites[j.site].found, dest: st.dest, again, jobsNow: jobsAt(st, currentPlanet(), st.day).length };
  });
  await done();
  assert.equal(r.refused, ''); assert.ok(r.took); assert.equal(r.kind, 'salvage');
  assert.notEqual(r.found, null); assert.equal(r.dest, r.site); assert.equal(r.again, '', 'one job at a time');
});
