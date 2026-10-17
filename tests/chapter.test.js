'use strict';

// The hired chapter's roster, fund and pacing (js/hired.js, js/people.js).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const CHAPTER_ROLES = ['xo', 'cook', 'icehand'];

test('the chapter\'s roles have a name, a wage and a perk', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ names: [ROLE_NAMES.xo, ROLE_NAMES.cook, ROLE_NAMES.icehand],
    wages: ['xo', 'cook', 'icehand'].map(k => typeof ROLE_WAGE[k]), perks: ['xo', 'cook', 'icehand'].map(k => ROLE_PERKS[k](2)) }));
  assert.deepEqual(r.names, ['First officer', 'Cook', 'Ice hand']);
  assert.deepEqual(r.wages, ['number', 'number', 'number']);
  assert.ok(r.perks.every(p => typeof p === 'string' && p.length > 0));
  await done();
});

test('the chapter\'s roles are never hireable', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ hireable: HIREABLE_ROLES, roles: Array.from({ length: 300 }, () => makeCrewCandidate('Earth').role) }));
  assert.deepEqual(r.hireable, ['engineer', 'pilot', 'gunner', 'quartermaster', 'slicer', 'medic']);
  assert.ok(r.roles.every(x => r.hireable.includes(x)));
  await done();
});

test('a passenger who joins the crew never takes a chapter role', async () => {
  const { ev, done } = await open();
  const roles = await ev(() => Array.from({ length: 300 }, () => jobRole('')));
  assert.ok(roles.every(x => !CHAPTER_ROLES.includes(x)), roles.filter(x => CHAPTER_ROLES.includes(x)).join());
  await done();
});

const helpers = () => {
  window.start = (o = {}) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', ...o }); while (G.dialog) finishEvent(); const st = G.state; st.story.next = 1e9; return st; };
  window.underway = () => { if (!sail()) throw new Error('no plan'); answerAll(); tryBurn(); enterTransit(); G.transit.times = []; };
  window.answerAll = () => { for (let k = 0; k < 8 && G.dialog; k++) { const d = G.dialog, ok = d.choices.map((c, i) => i).filter(i => !d.choices[i].can || d.choices[i].can()); if (ok.length) chooseEvent(ok[0]); finishEvent(); } while (G.dialog) finishEvent(); };
};
const ROSTER = ['cook', 'engineer', 'icehand', 'icehand', 'medic', 'pilot', 'quartermaster', 'slicer', 'xo'];
const hauler = async o => { const t = await open(o); await t.ev(helpers); return t; };

test('a hired hand starts on an Ice Hauler', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => { const st = start(); return { ship: st.shipId, fuel: st.fuel === SHIPS.freighter.fuel, armor: st.armor === SHIPS.freighter.armor }; });
  assert.equal(r.ship, 'freighter'); assert.ok(r.fuel); assert.ok(r.armor);
  const intro = await ev(() => { startGame({ slot: 2, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner' }); return (G.dialog ? G.dialog.event.text : '') + UI.notes.join(' '); });
  assert.match(intro, /ice hauler/i); assert.doesNotMatch(intro, /light freighter/i);
  await done();
});

test('the crew is nine, in the ten berths, whatever the background', async () => {
  for (const background of ['earth', 'mars', 'belt']) {
    const { ev, done } = await hauler();
    const r = await ev(bg => { const st = start({ background: bg }); return { roles: crewMembers().map(c => c.role).sort(), used: berthsUsed(), free: berthsFree(), cast: crewMembers().filter(c => c.cast && !CAST[c.cast].xo).length }; }, background);
    assert.deepEqual(r.roles, ROSTER, background);
    assert.equal(r.used, 9); assert.equal(r.free, 1); assert.equal(r.cast, 2, 'Ines and Tomas are aboard');
    await done();
  }
});

test('every post but yours is held once', async () => {
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    const { ev, done } = await hauler();
    const r = await ev(p => { start({ post: p }); const mine = POSTS[p].role; return Object.values(POSTS).map(x => x.role).map(role => [role, crewMembers().filter(c => c.role === role).length, role === mine]); }, post);
    for (const [role, n, mine] of r) assert.equal(n, mine ? 0 : 1, `${post}: ${role}`);
    await done();
  }
});

test('an old hired save still plays', async () => {
  const { ev, done } = await hauler({ scope: 'full' });  // the full build keeps the pair alive; the shipped build can lose one of the three in thirty events (the floor there is 0)
  const r = await ev(() => {
    const st = start(); st.shipId = 'lightfreighter'; st.crew = st.crew.filter(id => ['pilot', 'engineer', 'slicer'].includes(person(id).role));
    underway();
    for (let i = 0; i < 20; i++) { startHappening(); answerAll(); }
    for (let i = 0; i < 10; i++) { const e = hiredEvent('crew'); if (e) { openEvent(e); answerAll(); } }
    return st.crew.length;
  });
  assert.equal(r, 3);
  await done();
});

test('crew events cope with roles that have no post', async () => {
  const { ev, done } = await hauler();
  const bad = await ev(() => {
    const st = start(), bad = [];
    underway();
    for (let i = 0; i < 30; i++) for (const g of ['crew', 'money']) { const e = hiredEvent(g); if (!e) continue; if (/undefined|NaN|\[object/.test(e.text)) bad.push(e.text.slice(0, 80)); openEvent(e); answerAll(); }
    for (let i = 0; i < 20; i++) { startHappening(); answerAll(); }
    return bad;
  });
  assert.deepEqual(bad, []);
  await done();
});

test('after the buy-in the old captain\'s ship is an Ice Hauler', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => { const st = start(); st.credits = 100000; const cap = hiredCaptain(); buyIn('courier'); return cap.ship.shipId; });
  assert.equal(r, 'freighter');
  await done();
});

test('the fund starts whole, the hold empty, and the first contract costs the ship nothing', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => { const st = start(); const plan = currentPlan(); return { fund: HIRED_FUND, have: st.hired.fund, cost: plan && plan.cost, contract: !!(plan && (plan.contract || plan.ballast || plan.ice)), free: cargoFree(), hold: SHIPS.freighter.cargo }; });
  assert.ok(r.fund >= 12000); assert.equal(r.have, r.fund, 'the fund is for the yard and the ship\'s bills, not cargo (contracts.js)');
  assert.equal(r.free, r.hold, 'the hold starts empty');
  assert.ok(r.contract && r.cost === 0, 'the cargo is the shipper\'s');
  await done();
});

test('the captain heads for a yard at the chapter\'s price, not the cheapest ship\'s', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => {
    const st = start(), out = { target: HIRED_TARGET };
    st.hired.deal = { price: HIRED_TARGET, day: st.day, until: st.day - 1 };  // a lapsed deal: back to the chapter's price
    st.credits = HIRED_TARGET - 1; out.below = wantsYard();
    st.credits = HIRED_TARGET; out.at = wantsYard();
    st.credits = Math.min(...Object.values(SHIPS).filter(x => x.forSale).map(x => x.price)); out.cheapShip = wantsYard();
    return out;
  });
  assert.equal(r.target, 19000); assert.equal(r.below, false); assert.equal(r.at, true);
  assert.equal(r.cheapShip, false, 'the Dust Skiff price is not the signal');
  await done();
});

test('the sheet, the kit and the shippers\' regard outlive the buy as the career, and what reads them reads the career when there is no hand (#685)', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => {
    const st = start(), h = hired(), out = {}, hall = 'the League Freight Hall';
    h.sheet = { hands: 4, eye: 3, nerve: 3, wit: 5 }; h.kit = ['valve-keys']; h.standing = { [hall]: 2 };
    out.during = career() === h; out.hands = handStat('hands');
    st.credits = 100000; buyIn('courier');
    const c = st.career;
    out.gone = hired(); out.career = { sheet: { ...c.sheet }, kit: [...c.kit], standing: { ...c.standing } }; out.after = career() === c;
    out.hands2 = handStat('hands'); out.wit = handStat('wit');
    out.kitOdds = handCheck('hands', 0, 'job') - check(4, 0, DIFFICULTY.job, 0);
    moveStanding(hall, 1); out.standing = standingOf(career(), hall); out.kept = c.standing[hall];
    out.addNew = addKit('audit-seal'); out.addTwice = addKit('audit-seal'); out.kit2 = [...career().kit]; out.cover = [0, 1, 2].map(p => kitCover(career().kit, p));
    out.copy = c.kit !== h.kit && c.standing !== h.standing && c.sheet !== h.sheet;
    return out;
  });
  assert.equal(r.during, true, 'while there is a hand, the career is the hand\'s own record'); assert.equal(r.hands, 4);
  assert.equal(r.gone, null); assert.equal(r.after, true, 'after the buy it is the career the hand left');
  assert.deepEqual(r.career, { sheet: { hands: 4, eye: 3, nerve: 3, wit: 5 }, kit: ['valve-keys'], standing: { 'the League Freight Hall': 2 } });
  assert.equal(r.hands2, 4); assert.equal(r.wit, 5); assert.ok(Math.abs(r.kitOdds - 0.05) < 1e-9, `the keys still add five points to a job (${r.kitOdds})`);
  assert.equal(r.standing, 3); assert.equal(r.kept, 3, 'a shipper\'s regard moves in the career'); assert.equal(r.addNew, 'You carry a Fleet audit seal now.'); assert.equal(r.addTwice, '');
  assert.deepEqual(r.kit2, ['valve-keys', 'audit-seal']); assert.deepEqual(r.cover, [0, 1, 0]); assert.equal(r.copy, true, 'the sheet, the kit and the regard are copied, so the old record cannot change them');
  await done();
});

test('the post the player works and what they have learned at it outlive the buy, and go on counting after it (#685)', async () => {
  const { ev, done } = await hauler();
  const r = await ev(() => {
    const st = start(), h = hired(), out = {};
    h.skill = { gunner: 40, pilot: 5 }; out.before = [skillLevel('gunner'), skillLevel('pilot')];
    st.credits = 100000; buyIn('courier'); const c = st.career;
    out.career = { post: c.post, skill: { ...c.skill } }; out.hired = hired(); out.level = [skillLevel('gunner'), skillLevel('pilot'), skillXp('gunner')];
    G.mode = 'landed'; UI.notes.length = 0; G.dialog = null;
    gainSkill('gunner', 3); out.quiet = UI.notes.join(' '); gainSkill('gunner', 3); out.xp = c.skill.gunner; out.levelUp = UI.notes.join(' ');
    out.copy = c.skill !== h.skill;
    return out;
  });
  assert.deepEqual(r.before, [1, 0]); assert.deepEqual(r.career, { post: 'gunner', skill: { gunner: 40, pilot: 5 } }); assert.equal(r.hired, null);
  assert.deepEqual(r.level, [1, 0, 40], 'the same levels after the buy'); assert.equal(r.xp, 46); assert.equal(r.quiet, '', 'no note until a level is reached');
  assert.match(r.levelUp, /Your work at the gunner post is level 2 now\. When you take it yourself it works a tenth more often\./);
  assert.ok(!/raid/.test(r.levelUp), 'an owner\'s note does not speak of the hand\'s raid move'); assert.equal(r.copy, true);
  await done();
});
