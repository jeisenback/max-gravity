'use strict';

// Four downtime activities (#1073, #1075, #1076, #1081): a message home on the cheap relay slot, help at the bench, the medic, and an hour with
// tonight's watch. Each is offered in the downtime scene (shiplife.js downtimeScene) when it can run, tagged where it happens, and does one thing.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.onBurn = (bg = 'earth') => {
    startGame({ slot: 1, background: bg, captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.story.next = 1e9; G.state.tutorial = null;
    uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.7; t.times = []; t.chatter = 1e9; t.aboard = null; shipPeople();
    t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };  // the scene does not open by itself here
    return t;
  };
  window.onBurnAgain = () => {  // another burn in the same game: what the hand sent home is still on their record
    G.transit = null; G.mode = 'landed'; uatBurn('Earth', 'mars'); const t = G.transit; t.left = t.total * 0.7; t.times = []; t.chatter = 1e9; t.aboard = null; shipPeople();
    t.lifeOffered = { before: true, m1: true, m2: true, m3: true, after: true };
    return t;
  };
  window.act = key => HAND_DOWNTIME.find(d => activityLabel(d) === sceneSay('scene:downtime', `${key}.label`));
  window.addMedic = () => { const c = makeCrewCandidate('earth'); c.role = 'medic'; c.skill = 2; registerPerson(c); G.state.crew.push(c.id); G.transit.aboard = null; shipPeople(); return c; };
};

test('a message home: once a burn for 40 cr of the hand\'s own, tagged on the bridge; the reply comes at the first dawn of the next burn (#1073)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const t = onBurn(), a = act('message'), out = {};
    G.state.credits = 39; out.poor = a.can();
    G.state.credits = 1000; out.can = a.can(); out.where = a.where; out.on = a.on();
    out.text = a.run(); out.paid = 1000 - G.state.credits; out.again = a.can();
    t.comms = []; t.commsAt = []; t.dark = true; t.elapsed = SHIP_DAY * 0.95; lifeTick(0.016); t.elapsed = SHIP_DAY * 1.2; lifeTick(0.016);
    out.sameBurn = t.comms.filter(c => /^\[Home\]/.test(c.text || c)).length;
    G.state.day += 5; const u = onBurnAgain();
    u.comms = []; u.commsAt = []; u.dark = true; u.elapsed = SHIP_DAY * 0.95; lifeTick(0.016); u.elapsed = SHIP_DAY * 1.2; lifeTick(0.016); lifeTick(0.016);
    out.next = u.comms.filter(c => /^\[Home\]/.test(c.text || c));
    return out;
  });
  await done();
  assert.equal(r.poor, false, 'not without the price');
  assert.equal(r.can, true); assert.equal(r.where, 'bridge'); assert.match(r.on, /40 cr/);
  assert.equal(r.paid, 40); assert.match(r.text, /40 cr/); assert.equal(r.again, false, 'once a burn');
  assert.equal(r.sameBurn, 0, 'no reply on the burn it went out on');
  assert.equal(r.next.length, 1, `one reply on the next burn: ${JSON.stringify(r.next)}`);
});

test('help at the bench: with an engineer aboard and the drive worn, the drive +5 and the engineer pleased, tagged on the workshop (#1075)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    onBurn(); const a = act('bench'), c = condition(), e = roleHolder('engineer'), out = {};
    c.drive = 100; out.full = a.can();
    c.drive = 70; out.can = a.can(); out.where = a.where; out.on = a.on();
    const before = JSON.stringify([e.opinion, e.memories, e.arc]); out.text = a.run(); out.drive = c.drive; out.liked = JSON.stringify([e.opinion, e.memories, e.arc]) !== before;
    c.drive = 98; a.run(); out.capped = c.drive; out.first = e.first;
    return out;
  });
  await done();
  assert.equal(r.full, false, 'nothing to do on a drive at 100');
  assert.equal(r.can, true); assert.equal(r.where, 'workshop'); assert.match(r.on, new RegExp(r.first));
  assert.equal(r.drive, 75); assert.equal(r.capped, 100); assert.equal(r.liked, true); assert.match(r.text, /Drive condition \+5/);
});

test('the medic: only while the hand is hurt and a medic is aboard, two days off the hurt, tagged on the medic (#1076)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    onBurn(); const a = act('medic'), out = {};
    out.noMedic = a.can();
    const m = addMedic(); out.notHurt = a.can();
    career().hurtUntil = G.state.day + 12; out.can = a.can(); out.where = a.where(shipPeople()); out.id = m.id;
    out.text = a.run(); out.left = career().hurtUntil - G.state.day;
    return out;
  });
  await done();
  assert.equal(r.noMedic, false); assert.equal(r.notHurt, false);
  assert.equal(r.can, true); assert.equal(r.where, r.id);
  assert.equal(r.left, 10); assert.match(r.text, /Two days off/);
});

test('an hour with tonight\'s watch: offered when someone else has the bridge tonight, not on the hand\'s own night (#1081)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    onBurn(); const a = act('watch'), out = {};
    while (billOn(0).bridge !== 'you') G.state.day++;
    out.mine = a.can();
    G.state.day++; const keeper = billOn(0).bridge, p = person(keeper);
    out.can = a.can(); out.where = a.where(shipPeople()); out.keeper = keeper; out.on = a.on(); out.first = p.first;
    const before = JSON.stringify([p.opinion, p.memories, p.arc]); out.text = a.run(); out.liked = JSON.stringify([p.opinion, p.memories, p.arc]) !== before;
    return out;
  });
  await done();
  assert.equal(r.mine, false, 'not on the hand\'s own night');
  assert.equal(r.can, true); assert.equal(r.where, r.keeper); assert.match(r.on, new RegExp(r.first)); assert.equal(r.liked, true);
});
