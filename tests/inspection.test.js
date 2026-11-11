'use strict';

// Port inspections (#993, docs/superpowers/specs/2026-11-10-port-inspection-design.md): what a port's inspector finds and what it costs (js/inspection.js),
// in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const I = load(['js/data.js', 'js/inspection.js'], { Mods: { register() {}, filter: (n, v) => v } },
  ['LICENSED', 'INSPECTING', 'standingFine', 'licenceDuty', 'inspectionCause']);
const plain = o => (o ? { ...o } : o);

test('the owners that inspect, and the good each licenses', () => {
  assert.deepEqual({ ...I.LICENSED }, { 'Arcology Pact': 'medical', 'Dome Pact': 'water', 'Guild Federation': 'industrial' });
  assert.deepEqual([...I.INSPECTING], ['Arcology Pact', 'Dome Pact', 'Guild Federation']);
});

test('a fine for bad standing: none above -15, then 6,000 and 2,000 more for each five points, up to 14,000', () => {
  assert.deepEqual([-14, -15, -19, -20, -34, -35, -60].map(r => I.standingFine(r)), [0, 6000, 6000, 8000, 12000, 14000, 14000]);
});

test('the duty on a licensed good is 15% of its value, to the nearest 100', () => {
  assert.equal(I.licenceDuty('water', 100), 12000);
  assert.equal(I.licenceDuty('medical', 10), 4500);
});

test('what the inspector finds: nothing at a port that does not inspect, nothing on a clean ship, else the cause and one sum', () => {
  assert.equal(I.inspectionCause({ water: 50 }, 'Independent', -40, false), null);
  assert.equal(I.inspectionCause({ food: 10 }, 'Guild Federation', 0, false), null);
  assert.deepEqual(plain(I.inspectionCause({ water: 50 }, 'Dome Pact', 0, false)), { gov: 'Dome Pact', standing: null, good: 'water', tons: 50, duty: 6000, fine: 0, sum: 6000 });
  assert.deepEqual(plain(I.inspectionCause({}, 'Guild Federation', -22, false)), { gov: 'Guild Federation', standing: -22, good: null, tons: 0, duty: 0, fine: 8000, sum: 8000 });
  assert.equal(I.inspectionCause({ industrial: 20 }, 'Guild Federation', -15, false).sum, 12000, 'both causes, one sum');
  assert.equal(I.inspectionCause({ industrial: 20 }, 'Guild Federation', -15, true).sum, 14400, 'Marked: a fifth more');
});

// ---------- the scene on arrival (js/inspection.js inspectionScene, inspectAtLanding) ----------

const { open, closeBrowser } = require('./helpers');
const { after } = require('node:test');
after(closeBrowser);

// A hired hand at their post, landed at a port with nothing else open; cargo and standing as the case wants.
const helpers = () => {
  window.handAt = (post, port, o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null;
    uatLand(port); G.dialog = null; G.nextEvent = null; UI.notes = [];
    st.cargo = { ...(o.cargo || {}) }; if (o.rep !== undefined) st.rep[system().gov] = o.rep;
    if (o.fund !== undefined) { if (fundHeld()) hired().fund = o.fund; else st.credits = o.fund; }
    return st;
  };
  window.labels = () => G.dialog ? G.dialog.choices.map(c => c.label) : null;
  window.capRegard = () => person(hired().captain).opinion;
  window.finesOf = () => (hired().record || {}).fines || 0;
};

test('landing at a Dome Pact port with water opens the inspector, who names the cause and the sum; the move is the hand\'s by post (#1015)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const out = {};
    handAt('comms', 'Mars', { cargo: { water: 50 }, rep: 0 }); inspectAtLanding(currentPlanet());
    out.comms = { title: G.dialog && G.dialog.event.title, text: G.dialog && G.dialog.event.text, labels: labels() };
    handAt('gunner', 'Mars', { cargo: { water: 50 }, rep: 0 }); inspectAtLanding(currentPlanet());
    out.gunner = labels();
    return out;
  });
  await done();
  assert.equal(r.comms.title, 'The Inspector');
  assert.match(r.comms.text, /50t of water/); assert.match(r.comms.text, /50t/); assert.match(r.comms.text, /6,000/);
  assert.equal(r.comms.labels.length, 2); assert.match(r.comms.labels[0], /papers/i); assert.match(r.comms.labels[1], /Keep out/);
  assert.equal(r.gunner.length, 2); assert.match(r.gunner[0], /Speak up/); assert.match(r.gunner[1], /Keep out/);
});

test('a success halves the sum and wins a point of the captain\'s regard (#1059); a failure pays it all and costs one; keeping out pays it all; the hand\'s savings never move (#1015)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const run = (roll, k) => {
      handAt('comms', 'Mars', { cargo: { water: 50 }, rep: 0, fund: 100000 }); inspectAtLanding(currentPlanet());
      const savings = fundHeld() ? G.state.credits : null, regard = capRegard(), fines = finesOf();
      const real = Math.random; Math.random = () => roll; try { chooseEvent(k); } finally { Math.random = real; }
      return { paid: 100000 - purse(), regard: capRegard() - regard, fines: finesOf() - fines, savings: savings === null ? 'n/a' : G.state.credits - savings };
    };
    return { win: run(0.01, 0), lose: run(0.99, 0), out: run(0.5, 1) };
  });
  await done();
  assert.deepEqual(r.win, { paid: 3000, regard: 1, fines: 1, savings: r.win.savings });
  assert.deepEqual(r.lose, { paid: 6000, regard: -1, fines: 1, savings: r.lose.savings });
  assert.deepEqual(r.out, { paid: 6000, regard: 0, fines: 1, savings: r.out.savings });
  for (const k of ['win', 'lose', 'out']) assert.ok(r[k].savings === 'n/a' || r[k].savings === 0, `${k}: the hand's savings are not touched`);
});

test('a sum larger than the purse takes what is there (#1015)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const left = await ev(() => { handAt('comms', 'Mars', { cargo: { water: 50 }, rep: 0, fund: 1000 }); inspectAtLanding(currentPlanet()); chooseEvent(1); return purse(); });
  await done();
  assert.equal(left, 0);
});

test('a clean ship at an inspecting port gets one note and no scene; an independent port, neither (#1015)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    handAt('comms', 'Ceres Station', { rep: 0 }); inspectAtLanding(currentPlanet());
    const league = { dialog: !!G.dialog, notes: [...UI.notes] };
    const indie = SYSTEMS[Object.keys(SYSTEMS).find(id => SYSTEMS[id].gov === 'Independent')].planets[0].name;
    handAt('comms', indie, { cargo: { water: 50 }, rep: -40 }); inspectAtLanding(currentPlanet());
    return { league, indie: { dialog: !!G.dialog, notes: [...UI.notes] } };
  });
  await done();
  assert.equal(r.league.dialog, false); assert.ok(r.league.notes.includes('Customs logs the ship through.'), r.league.notes.join(' | '));
  assert.equal(r.indie.dialog, false); assert.ok(!r.indie.notes.includes('Customs logs the ship through.'));
});

test('with another scene already open, the inspection comes first and the other follows it (#1015)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    handAt('comms', 'Mars', { cargo: { water: 50 }, rep: 0 });
    openEvent({ title: 'Other', text: 'x', choices: [{ label: 'A', run: () => 'a' }] });
    inspectAtLanding(currentPlanet());
    const first = G.dialog.event.title; chooseEvent(1); finishEvent();
    return { first, then: G.dialog && G.dialog.event.title };
  });
  await done();
  assert.deepEqual(r, { first: 'The Inspector', then: 'Other' });
});

test('at the landing itself the inspection opens (the landed hook) (#1015)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const title = await ev(() => {
    const st = handAt('comms', 'Ceres Station', { rep: 0 }); st.cargo = { water: 50 }; st.rep['Dome Pact'] = 0;
    const at = planetNamed('Mars'); st.systemId = at.sid; st.planet = at.pl.name; resetWorld(); landAt(at.pl, []);
    return G.dialog && G.dialog.event.title;
  });
  await done();
  assert.equal(title, 'The Inspector');
});

test('in chapter two the co-op\'s purse pays, and the hand argues at the hatch on their own bridge, with no captain to sign or to think less of them (#1015, #1045)', async () => {
  const { ev, done } = await open();
  const src = require('fs').readFileSync(require('path').join(__dirname, 'chaptertwostart.test.js'), 'utf8'), start = src.indexOf('const helpers = () => {');
  await ev(new Function(src.slice(start + 'const helpers = () => {'.length, src.indexOf('\n};\n', start))));
  await ev(helpers);
  const r = await ev(() => {
    toShare(); goOnToBridge(); while (G.dialog) finishEvent();
    const st = G.state; st.cargo = { water: 50 }; st.rep['Dome Pact'] = 0; st.credits = 20000;
    const fund = hired().fund;
    const at = planetNamed('Mars'); st.systemId = at.sid; st.planet = at.pl.name; G.mode = 'landed'; inspectAtLanding(at.pl);
    const e = G.dialog && G.dialog.event, title = e && e.title, labels = e ? e.choices.map(c => c.label) : [], text = e && e.text;
    const real = Math.random; Math.random = () => 0.99; let res; try { res = chooseEvent(0); } finally { Math.random = real; }
    return { title, role: role().id, paid: 20000 - st.credits, fund: hired().fund - fund, moves: labels.length, text, res };
  });
  await done();
  assert.deepEqual({ title: r.title, role: r.role, paid: r.paid, fund: r.fund, moves: r.moves }, { title: 'The Inspector', role: 'coop', paid: 6000, fund: 0, moves: 2 });
  assert.doesNotMatch(r.text, /Captain/); assert.doesNotMatch(r.res, /Captain/); assert.match(r.res, /you sign for it/);
});

test('in the parked owner game the inspector is paid from the owner\'s credits, the one choice there is (#1015)', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.cargo = { water: 50 }; st.rep['Dome Pact'] = 0; st.credits = 20000;
    const at = planetNamed('Mars'); st.systemId = at.sid; st.planet = at.pl.name; G.mode = 'landed'; G.dialog = null; inspectAtLanding(at.pl);
    const ev0 = G.dialog && G.dialog.event, labels = ev0 ? ev0.choices.map(c => c.label) : null;
    chooseEvent(0);
    return { title: ev0 && ev0.title, labels, paid: 20000 - st.credits };
  });
  await done();
  assert.equal(r.title, 'The Inspector'); assert.equal(r.labels.length, 1); assert.match(r.labels[0], /Pay the inspector/); assert.equal(r.paid, 6000);
});

// ---------- the final review's findings ----------

test('the inspector reads the hold as it came in, before the captain\'s run is sold at the landing (#993 review)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = handAt('comms', 'Ceres Station', { rep: 0 }); st.rep['Dome Pact'] = 0; st.cargo = { water: 50 };
    const h = hired(), at = planetNamed('Mars');
    h.run = { planet: at.pl.name, sid: at.sid, good: 'water', tons: 50, cost: 0, day: st.day, from: 'Ceres Station' };
    st.systemId = at.sid; st.planet = at.pl.name; resetWorld(); landAt(at.pl, []);
    let title = null, text = ''; for (let g = 10; G.dialog && g--; finishEvent()) if (G.dialog.event.title === 'The Inspector') { title = G.dialog.event.title; text = G.dialog.event.text; break; }
    return { title, water: /50t/.test(text), sold: !st.cargo.water };
  });
  await done();
  assert.deepEqual(r, { title: 'The Inspector', water: true, sold: true });
});

test('loading a save is no second arrival: no inspection and no customs note (#993 review)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = handAt('comms', 'Ceres Station', { rep: 0 }); st.rep['Guild Federation'] = -20;
    save(); loadGame();
    const titles = []; for (let g = 10; G.dialog && g--; finishEvent()) titles.push(G.dialog.event.title);
    return { titles, notes: [...UI.notes] };
  });
  await done();
  assert.ok(!r.titles.includes('The Inspector'), r.titles.join(' | '));
  assert.ok(!r.notes.includes('Customs logs the ship through.'), r.notes.join(' | '));
});

test('a scene already queued behind the open one still shows after the inspection and the open one (#993 review)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    handAt('comms', 'Mars', { cargo: { water: 50 }, rep: 0 });
    openEvent({ title: 'Other', text: 'x', choices: [{ label: 'A', run: () => 'a' }] });
    inspectAtLanding(currentPlanet());
    G.nextEvent = { title: 'Queued', text: 'y', choices: [{ label: 'B', run: () => 'b' }] };  // a handler after the inspection's queued its scene
    const seen = [G.dialog.event.title];
    for (let g = 5; G.dialog && g--;) { chooseEvent(G.dialog.event.title === 'The Inspector' ? 1 : 0); finishEvent(); if (G.dialog) seen.push(G.dialog.event.title); }
    return seen;
  });
  await done();
  assert.deepEqual(r, ['The Inspector', 'Other', 'Queued']);
});

test('an owner who kept a post has no captain to argue past: only the pay choice (#993 review)', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' }); while (G.dialog) finishEvent();
    const st = G.state; st.career = { post: 'gunner', skill: {}, kit: [], picks: [] };
    const e = inspectionScene(inspectionCause({ water: 50 }, 'Dome Pact', 0, false), currentPlanet());
    return e.choices.map(c => c.label);
  });
  await done();
  assert.equal(r.length, 1); assert.match(r[0], /Pay the inspector/);
});

test('an empty purse pays nothing, and nothing is written on the record (#993)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => { handAt('comms', 'Mars', { cargo: { water: 50 }, rep: 0, fund: 0 }); inspectAtLanding(currentPlanet()); const f = finesOf(); chooseEvent(1); return { fines: finesOf() - f, purse: purse() }; });
  await done();
  assert.deepEqual(r, { fines: 0, purse: 0 });
});
