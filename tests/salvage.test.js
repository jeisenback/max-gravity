'use strict';

// Wrecks and salvage (#965, js/salvage.js): the cutting's numbers in plain Node; the board, the scenes and delivery in the browser.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const NAMES = ['WRECK_TYPES', 'SECTION_RISK', 'CAREFUL', 'sectionRisk', 'sectionTake', 'sectionPart', 'riskOutcome', 'readWord', 'seedSite', 'surveyQuality', 'check', 'STAT_BASE'];
const pure = () => load(['js/data.js', 'js/util.js', 'js/sheet.js', 'js/orbits.js', 'js/sites.js', 'js/salvage.js'], { G: { state: {} }, Mods: { register() {}, on() {} } }, NAMES);

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

test('a survey is good well under the check, poor over it, and fair between', () => {
  const { surveyQuality, check, STAT_BASE } = pure();
  const p = check(STAT_BASE, 2, 0);
  assert.equal(surveyQuality(2, 0), 'good'); assert.equal(surveyQuality(2, p - 0.3), 'good');
  assert.equal(surveyQuality(2, p - 0.1), 'fair'); assert.equal(surveyQuality(2, p + 0.01), 'poor'); assert.equal(surveyQuality(2, 0.99), 'poor');
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
    const jobs = jobsAt(st, currentPlanet(), st.day), rows = [...document.querySelectorAll('button[data-action="takeSalvageJob"]')].map(b => b.parentElement.textContent);
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

// ---------- on station at a wreck (browser) ----------

// A co-op on station at a wreck it has a job for, the approach played; `o` sets the wreck's fields.
const wreckHelpers = () => {
  window.atWreck = (o = {}) => {
    const st = coopAt(), id = 'site:wreck-1', site = sites(st)[id];
    Object.assign(site.wreck, { find: 3, lead: null, leadAt: null }, o);
    findSite(st, id, st.day);
    career().job = { kind: 'salvage', site: id, client: 'Hask Mutual', find: WRECK_TYPES[site.wreck.type].find, sid: 'ceres', planet: 'Ceres Station', deadline: st.day + 60, pay: 9000, taken: st.day, got: false, quality: null };
    G.player = null; landAtSite(site);
    const approach = G.dialog && G.dialog.event.title;
    while (G.dialog) { chooseEvent(0); finishEvent(); }
    UI.notes.length = 0;
    return { st, site, approach };
  };
  // One shift: the scene for the next section, and the i-th choice played with the rolls given (then the page's own random).
  window.shift = (pickLabel, rolls = [0.99]) => {
    const real = Math.random, l = [...rolls]; Math.random = () => (l.length ? l.shift() : real());
    try {
      Mods.act('cutWreck');
      const ev = G.dialog && G.dialog.event; if (!ev) return null;
      const i = ev.choices.findIndex(c => pickLabel.test(c.label));
      const out = { title: ev.title, text: ev.text, labels: ev.choices.map(c => c.label), i };
      if (i >= 0) { out.result = chooseEvent(i); finishEvent(); }
      return out;
    } finally { Math.random = real; }
  };
  window.cast = key => G.state.crew.map(person).find(p => p && p.cast === key);
};

test('arriving at the wreck plays the approach once, and a reload on station does not play it again', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st, site, approach } = atWreck();
    landAtSite(site);  // as a save loaded on station does (game.js)
    return { approach, name: site.name, again: !!G.dialog, seen: site.wreck.seen, mode: G.mode, at: st.systemId };
  });
  await done();
  assert.match(r.approach, new RegExp(r.name)); assert.equal(r.again, false); assert.equal(r.seen, true);
  assert.equal(r.mode, 'landed'); assert.equal(r.at, 'site:wreck-1');
});

test('each shift cuts the next section: the take goes in the hold within its room, a day passes, and careful is offered from the second', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st, site } = atWreck(); const w = site.wreck, day0 = st.day, used0 = cargoUsed();
    const dock = document.querySelector('.dock').textContent;
    const one = shift(/^Cut it/);
    const after1 = { cut: w.cut, used: cargoUsed() - used0, day: st.day - day0 };
    st.cargo.metal = (st.cargo.metal || 0) + cargoFree();  // the hold full
    const full0 = cargoUsed(), two = shift(/^Cut it/);
    return { dock, one, after1, two, full: cargoUsed() - full0, cut: w.cut, record: hired().record.wrecksCut };
  });
  await done();
  assert.match(r.dock, /Cut into the wreck \(section 1\)/);
  assert.ok(!r.one.labels.some(l => /carefully/.test(l)), 'no careful cut on the first section');
  assert.ok(r.two.labels.some(l => /carefully/.test(l)), 'careful from the second');
  assert.ok(r.one.labels.some(l => /Haul home/.test(l)));
  assert.equal(r.after1.cut, 1); assert.equal(r.after1.used, 3); assert.equal(r.after1.day, 1);
  assert.equal(r.full, 0, 'a full hold takes nothing'); assert.equal(r.cut, 2); assert.equal(r.record, 1, 'one wreck cut');
});

test('a part section gives a spare with the wreck\'s history even with the hold full', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    let seed = 0; const probe = { name: '', seed: 0 };
    const { st, site } = atWreck(); probe.name = site.wreck.name;
    while (!sectionPart({ ...probe, seed }, 2)) seed++;
    site.wreck.seed = seed; st.spares = [];
    shift(/^Cut it/); st.cargo.metal = (st.cargo.metal || 0) + cargoFree();
    const used = cargoUsed(); shift(/^Cut it/);
    return { spares: st.spares, name: site.wreck.name, grew: cargoUsed() - used };
  });
  await done();
  assert.equal(r.spares.length, 1); assert.equal(r.grew, 0);
  assert.equal(r.spares[0].from, `off the wreck of the ${r.name}`); assert.ok(r.spares[0].system); assert.equal(r.spares[0].quirk.from, r.spares[0].from);
});

test('a failed cut hurts a crew member and never the player, hits a system, or loses the section, by the roll', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const out = {};
    for (const [k, roll] of [['hurt', 0.01], ['system', 0.05], ['lost', 0.09]]) {
      const { st } = atWreck(); const cond = { ...st.condition }, used = cargoUsed(), hurt0 = Object.keys(st.injured || {}).length;
      const s = shift(/^Cut it/, [roll]);
      out[k] = { text: s.result, hurt: Object.keys(st.injured || {}).length - hurt0, you: !!(st.injured || {}).you, sys: Object.keys(cond).filter(x => st.condition[x] < cond[x]).map(x => cond[x] - st.condition[x]), took: cargoUsed() - used };
    }
    return out;
  });
  await done();
  assert.equal(r.hurt.hurt, 1); assert.equal(r.hurt.you, false); assert.deepEqual(r.hurt.sys, []);
  assert.equal(r.system.hurt, 0); assert.deepEqual(r.system.sys, [15]);
  assert.equal(r.lost.took, 0); assert.equal(r.lost.hurt, 0);
});

test('the find\'s section sets the job\'s find aboard, and a lead\'s section finds the other wreck', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st } = atWreck({ find: 1, lead: 'site:wreck-4', leadAt: 1 });
    const before = st.sites['site:wreck-4'].found;
    const s = shift(/^Cut it/);
    return { got: career().job.got, before, after: st.sites['site:wreck-4'].found, text: s.result, other: st.sites['site:wreck-4'].name };
  });
  await done();
  assert.equal(r.got, true); assert.equal(r.before, null); assert.notEqual(r.after, null); assert.match(r.text, new RegExp(r.other));
});

test('Bexa reads the risk; with her not aboard the engineer does; Pax speaks up only on a read that is not clean', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const out = {};
    atWreck(); out.first = Math.random() < 2 && (() => { Mods.act('cutWreck'); const t = G.dialog.event.text; G.dialog = null; return t; })();
    const { st, site } = atWreck(); site.wreck.cut = 2;  // the third section reads bad
    Mods.act('cutWreck'); out.third = G.dialog.event.text; G.dialog = null;
    const bexa = cast('bexa'); st.crew = st.crew.filter(id => id !== bexa.id);
    Mods.act('cutWreck'); out.noBexa = G.dialog.event.text; G.dialog = null;
    out.engineer = (roleHolder('engineer') || roleHolder('bosun') || {}).first;
    const pax = cast('pax'); st.crew = st.crew.filter(id => id !== pax.id);
    Mods.act('cutWreck'); out.noPax = G.dialog.event.text; G.dialog = null;
    return out;
  });
  await done();
  assert.match(r.first, /Bexa/); assert.doesNotMatch(r.first, /Pax/, 'a clean read: Pax says nothing');
  assert.match(r.third, /Bexa/); assert.match(r.third, /Pax/);
  assert.doesNotMatch(r.noBexa, /Bexa/); if (r.engineer) assert.match(r.noBexa, new RegExp(r.engineer));
  assert.doesNotMatch(r.noPax, /Pax/);
});

test('heeding Bexa\'s bad read pleases her; cutting on over Pax and someone hurt costs you with Pax', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    let { site } = atWreck(); site.wreck.cut = 2;
    const b0 = cast('bexa').opinion; shift(/Haul home/); const b1 = cast('bexa').opinion, mem = cast('bexa').memories.slice(-1)[0];
    ({ site } = atWreck()); site.wreck.cut = 2;
    const p0 = cast('pax').opinion; shift(/^Cut it/, [0.01]); const p1 = cast('pax').opinion;
    ({ site } = atWreck()); site.wreck.cut = 2;
    const q0 = cast('pax').opinion; shift(/^Cut it/, [0.99]); const q1 = cast('pax').opinion;
    return { bexa: b1 - b0, mem, pax: p1 - p0, paxSafe: q1 - q0 };
  });
  await done();
  assert.equal(r.bexa, 1); assert.ok(r.mem); assert.equal(r.pax, -1); assert.equal(r.paxSafe, 0);
});

test('landing at the job\'s rock plays the survey once, and its quality is the job\'s', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), id = 'site:rock-1', site = sites(st)[id];
    findSite(st, id, st.day);
    career().job = { kind: 'survey', site: id, client: 'Brannock Minerals', find: 'survey', sid: 'ceres', planet: 'Ceres Station', deadline: st.day + 60, pay: 4000, taken: st.day, got: false, quality: null };
    G.player = null; landAtSite(site);
    const title = G.dialog && G.dialog.event.title;
    const real = Math.random; Math.random = () => 0; const text = chooseEvent(0); Math.random = real; finishEvent();
    landAtSite(site); const again = !!G.dialog;
    return { title, name: site.name, text, again, job: career().job, record: hired().record.rocksSurveyed };
  });
  await done();
  assert.match(r.title, new RegExp(r.name)); assert.equal(r.again, false);
  assert.equal(r.job.quality, 'good'); assert.equal(r.job.got, true); assert.equal(r.record, 1); assert.ok(r.text);
});

// ---------- leaving, delivery and the supply (browser) ----------

test('cut out and hauled home: the map\'s pick burns straight from the wreck, and the used-up wreck is replaced', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st, site } = atWreck(); const name = site.name;
    shift(/Haul home/);
    const before = document.querySelector('.dock').textContent;
    st.dest = 'ceres'; UI.render();
    const dock = document.querySelector('.dock').textContent;
    Mods.act('burnFromSite');
    const mode = G.mode, to = G.transit && G.transit.to, route = st.route;
    arrive(); if (G.mode !== 'landed') land(system().planets.find(p => p.name === 'Ceres Station') || system().planets[0]);  // replaced once she is elsewhere (#1146)
    const s = st.sites['site:wreck-1'];
    return { before, dock, mode, to, route, gen: s.gen, found: s.found, renamed: s.name !== name || s.gen === 1 };
  });
  await done();
  assert.doesNotMatch(r.before, /Cut into/); assert.match(r.dock, /Burn for Ceres/);
  assert.equal(r.mode, 'transit'); assert.equal(r.to, 'ceres'); assert.equal(r.route.dock, 'Ceres Station');
  assert.equal(r.gen, 1); assert.equal(r.found, null);
});

test('delivered with the find, the client pays in full by the deadline and half after it; a survey pays by its report', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const pay = (o, late) => {
      const st = coopAt();
      career().job = { kind: 'salvage', site: 'site:wreck-1', client: 'Hask Mutual', find: 'recorder', sid: 'ceres', planet: 'Ceres Station', name: 'Dorran Sky', au: 3.1, type: 'courier', deadline: st.day + 10, pay: 9000, taken: st.day, got: true, quality: null, ...o };
      if (late) st.day += 12;
      const c0 = st.credits; landAtPort('ceres', 'Ceres Station');
      return { paid: st.credits - c0, job: career().job, notes: UI.notes.join(' | '), record: hired().record };
    };
    return { full: pay({}), late: pay({}, true), good: pay({ kind: 'survey', quality: 'good', pay: 4000 }), poor: pay({ kind: 'survey', quality: 'poor', pay: 4000 }), none: pay({ got: false }) };
  });
  await done();
  assert.equal(r.full.paid, 9000); assert.equal(r.full.job, null); assert.match(r.full.notes, /Hask Mutual/); assert.equal(r.full.record.salvageDone, 1);
  assert.equal(r.late.paid, 4500);
  assert.equal(r.good.paid, 5600); assert.equal(r.poor.paid, 2000);
  assert.equal(r.none.paid, 0); assert.ok(r.none.job, 'no find, no pay, and the job goes on');
});

test('past the deadline with no find the job ends unpaid, and the board offers jobs again', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt();
    career().job = { kind: 'salvage', site: 'site:wreck-1', client: 'Hask Mutual', find: 'recorder', sid: 'ceres', planet: 'Ceres Station', name: 'Dorran Sky', au: 3.1, type: 'courier', deadline: st.day + 1, pay: 9000, taken: st.day, got: false, quality: null };
    st.day += 1; Mods.emit('newDay', st.day); const still = !!career().job;
    findSite(st, 'site:wreck-1', st.day); const gen = st.sites['site:wreck-1'].gen;
    st.day += 1; Mods.emit('newDay', st.day);
    return { still, job: career().job, notes: UI.notes.join(' | '), gen: st.sites['site:wreck-1'].gen - gen, found: st.sites['site:wreck-1'].found };
  });
  await done();
  assert.equal(r.still, true, 'on the deadline it still stands'); assert.equal(r.job, null); assert.match(r.notes, /Hask Mutual/);
  assert.equal(r.gen, 1, 'the job\'s site, found and never worked, takes a new one'); assert.equal(r.found, null);
});

// Found by the co-op soak: the stay's landing hook asked the hired hand's planner for a run, which in chapter two names a captain who is not there.
test('landing back at a port where an old plan was made raises no error in chapter two', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt();
    hired().plan = { day: st.day - 1, at: 'Ceres Station', cargo: '{}', run: { sid: 'mars', planet: 'Mars', good: 'water', tons: 5 }, alts: [] };
    st.cargo.metal = 3;
    landAtPort('ceres', 'Ceres Station');
    return { mode: G.mode };
  });
  await done();
  assert.equal(r.mode, 'landed');
});

// ---------- the final review's findings (#965) ----------

test('a found site can be picked on the map, and from a site the burn can be for another site', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st } = atWreck(); shift(/Haul home/);
    const other = 'site:wreck-3'; findSite(st, other, st.day);
    G.mode = 'map'; drawMap(G.W, G.H); const [x, y] = G.mapPos(other);
    canvas.dispatchEvent(new MouseEvent('click', { clientX: x, clientY: y, bubbles: true }));
    const dest = st.dest; G.mode = 'landed'; UI.render();
    const dock = document.querySelector('.dock').textContent, name = st.sites[other].name;
    Mods.act('burnFromSite');
    return { dest, dock, name, to: G.transit && G.transit.to };
  });
  await done();
  assert.equal(r.dest, 'site:wreck-3'); assert.match(r.dock, new RegExp(`Burn for ${r.name}`)); assert.equal(r.to, 'site:wreck-3');
});

test('a reload before the survey is run plays it again', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started);
  const r = await ev(() => {
    const st = coopAt(), id = 'site:rock-1', site = sites(st)[id];
    findSite(st, id, st.day);
    career().job = { kind: 'survey', site: id, client: 'Brannock Minerals', find: 'survey', sid: 'ceres', planet: 'Ceres Station', name: site.name, au: site.au, deadline: st.day + 60, pay: 4000, taken: st.day, got: false, quality: null };
    G.player = null; landAtSite(site); G.dialog = null;  // the page closed with the scene open
    landAtSite(site);
    return { again: !!G.dialog };
  });
  await done();
  assert.equal(r.again, true);
});

test('at a site the pilot\'s depart order is not offered', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => { const { st } = atWreck(); shift(/Haul home/); person(st.crew[0]).role = 'pilot'; st.dest = 'ceres'; return ORDERS.pilot.find(o => o.id === 'depart').can(); });
  await done();
  assert.equal(r, false);
});

test('a job ends unpaid as soon as its find is lost, or the ship leaves the wreck without it', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    atWreck({ find: 1 }); shift(/^Cut it/, [0.09]); const lost = career().job;
    const { st } = atWreck({ find: 3 }); shift(/Haul home/); st.dest = 'ceres'; Mods.act('burnFromSite');
    return { lost, left: career().job, notes: UI.notes.join(' | ') };
  });
  await done();
  assert.equal(r.lost, null); assert.equal(r.left, null); assert.match(r.notes, /Hask Mutual/);
});

test('a burn to a site needs the mass to come back, and a burn home from a site never leaves the tank below empty', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const st = coopAt(), id = 'site:wreck-1'; findSite(st, id, st.day);
    takeOff(); G.player.x = BURN_DIST + 40; G.player.y = 0;
    st.dest = id; st.fuel = burnFuel(st.systemId, id) + 1; tryBurn(); const short = G.mode;
    const w = atWreck(); shift(/Haul home/); w.st.fuel = 1; w.st.dest = 'ceres'; Mods.act('burnFromSite');
    return { short, fuel: w.st.fuel, mode: G.mode };
  });
  await done();
  assert.notEqual(r.short, 'departing'); assert.ok(r.fuel >= 0, `${r.fuel}`); assert.equal(r.mode, 'transit');
});

test('with nobody to read the section, the player reads it', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st, site } = atWreck(); site.wreck.cut = 2;
    st.crew = st.crew.filter(id => { const p = person(id); return p && p.cast === 'pax'; });
    Mods.act('cutWreck'); const text = G.dialog.event.text; G.dialog = null; return text;
  });
  await done();
  assert.match(r, /You /); assert.match(r, /Pax/);
});

// ---------- #1146: the final review's small findings ----------

test('a cut whose day passes the deadline does not report the find on the job just called off (#1146)', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st } = atWreck({ find: 1 }); const job = career().job; job.deadline = st.day;  // the cut's day is past it
    const s = shift(/^Cut it/);
    return { text: s.result, job: career().job, got: job.got };
  });
  await done();
  assert.equal(r.job, null, 'the job is off'); assert.equal(r.got, false); assert.doesNotMatch(r.text, /sealed bag/);
});

test('a cut, a haul home and a survey are saved as they are made, so a reload does not roll them again (#1146)', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const saved = () => Saves.read(Saves.current);
    const { site } = atWreck(); shift(/^Cut it/);
    const cut = saved().sites[site.id].wreck.cut;
    shift(/Haul home/); const left = saved().sites[site.id].wreck.left;
    return { cut, left };
  });
  await done();
  assert.equal(r.cut, 1); assert.equal(r.left, true);
});

test('the site left keeps its name until the ship arrives where it is bound, then takes a new one (#1146)', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st, site } = atWreck(); const name = site.name, id = site.id;
    shift(/Haul home/); st.dest = 'ceres'; Mods.act('burnFromSite');
    const during = { name: st.sites[id].name, gen: st.sites[id].gen };
    arrive(); if (G.mode !== 'landed') land(system().planets.find(p => p.name === 'Ceres Station') || system().planets[0]);
    return { name, during, after: { gen: st.sites[id].gen, found: st.sites[id].found } };
  });
  await done();
  assert.equal(r.during.name, r.name); assert.equal(r.during.gen, 0);
  assert.equal(r.after.gen, 1); assert.equal(r.after.found, null);
});

test('the read is the reader\'s own skill: a bosun reads with the bosun\'s (#1146)', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    const { st } = atWreck();
    st.crew = st.crew.filter(id => { const p = person(id); return p && p.cast !== 'bexa' && p.role !== 'engineer'; });
    const b = person(st.crew[0]); b.role = 'bosun'; b.skill = 4; b.skills = { ...(b.skills || {}), bosun: 4 };
    return { skill: wreckReadSkill(st, wreckReader(st)), reader: (wreckReader(st) || {}).id, bosun: b.id };
  });
  await done();
  assert.equal(r.reader, r.bosun); assert.equal(r.skill, 4);
});

test('the Ashore tab reads The Wreck at a wreck and The Rock at a rock (#1146)', async () => {
  const { ev, done } = await open();
  await ev(helpers); await ev(started); await ev(wreckHelpers);
  const r = await ev(() => {
    atWreck(); const wreck = RAIL.find(e => e.tab === 'site').label;
    G.state.systemId = 'site:rock-1'; const rock = RAIL.find(e => e.tab === 'site').label;
    return { wreck, rock };
  });
  await done();
  assert.equal(r.wreck, 'The Wreck'); assert.equal(r.rock, 'The Rock');
});
