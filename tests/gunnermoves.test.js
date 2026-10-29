'use strict';

// The crew teach the hired hand's gunner moves on a burn (docs/superpowers/specs/2026-10-23-gunner-moves-design.md, section 2): the due rule (moveDue) in plain
// Node, and the downtime activity (ACTIVITIES.teach) in a page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { MOVE_TEACH, moveDue } = load(['js/gunnermoves.js'], { OPINION: { TRUSTED: 3 }, ACTIVITIES: {} }, ['MOVE_TEACH', 'moveDue']);
const TOMAS = { first: 'Tomas', opinion: 3 }, INES = { first: 'Ines', opinion: 3 }, CATO = { first: 'Cato', opinion: 3 };
const crew = (o = {}) => id => ({ vent: TOMAS, lead: INES, split: CATO, ...o })[id];
const trust = p => p.opinion;

test('moves are due in order, each at its level and the teacher\'s trust', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(MOVE_TEACH)), { vent: { post: 'engineer', level: 1 }, lead: { post: 'pilot', level: 1 }, split: { role: 'xo', level: 2 } });
  const hand = moves => ({ post: 'gunner', moves });
  assert.equal(moveDue(hand([]), 1, crew(), trust), 'vent');
  assert.equal(moveDue(hand(['vent']), 1, crew(), trust), 'lead');
  assert.equal(moveDue(hand(['vent', 'lead']), 1, crew(), trust), null, 'split waits for level 2');
  assert.equal(moveDue(hand(['vent', 'lead']), 2, crew(), trust), 'split');
  assert.equal(moveDue(hand([]), 0, crew(), trust), null, 'nothing at level 0');
  assert.equal(moveDue(hand([]), 1, crew({ vent: { first: 'Tomas', opinion: 2 } }), trust), 'lead', 'an engineer short of trust passes to the next');
  assert.equal(moveDue(hand(['lead']), 2, crew(), trust), 'vent', 'the order is vent, lead, split');
});

test('a hurt, missing or untrusting teacher teaches nothing, and a move already known is not offered again', async () => {
  assert.equal(moveDue({ post: 'gunner', moves: [] }, 2, crew({ vent: undefined, lead: undefined, split: undefined }), trust), null, 'nobody at the posts');
  assert.equal(moveDue({ post: 'gunner', moves: ['vent', 'lead', 'split'] }, 3, crew(), trust), null, 'all three known');
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    const st = G.state, tomas = postHolder('engineer'), ines = postHolder('pilot');
    tomas.opinion = 3; ines.opinion = 3;
    const due = () => ({ can: ACTIVITIES.teach.can(), label: ACTIVITIES.teach.label });
    const out = { trusted: due() };
    st.injured = { [tomas.id]: true }; out.hurt = due();
    st.injured = { [tomas.id]: true, [ines.id]: true }; out.bothHurt = due();
    st.injured = {}; out.back = due();
    st.crew = st.crew.filter(id => id !== tomas.id); out.ashore = due();
    st.crew.push(tomas.id); tomas.opinion = 2; out.cool = due();
    tomas.opinion = 3; hired().moves = ['vent']; out.known = due();
    return out;
  });
  await done();
  assert.equal(r.trusted.can, true); assert.match(r.trusted.label, /Tomas/);
  assert.equal(r.hurt.can, true); assert.match(r.hurt.label, /Ines/, 'Tomas hurt: Ines teaches hers first');
  assert.equal(r.bothHurt.can, false, 'both hurt: nobody teaches');
  assert.match(r.back.label, /Tomas/, 'teaching resumes when he is back');
  assert.match(r.ashore.label, /Ines/, 'Tomas off the ship');
  assert.match(r.cool.label, /Ines/, 'Tomas short of trust');
  assert.match(r.known.label, /Ines/, 'vent known: not offered again');
});

test('a save without moves is offered the first move and nothing throws', async () => {
  assert.equal(moveDue({ post: 'gunner' }, 1, crew(), trust), 'vent');
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    delete hired().moves; postHolder('engineer').opinion = 3;
    const can = ACTIVITIES.teach.can(), label = ACTIVITIES.teach.label, text = ACTIVITIES.teach.run();
    return { can, label, text, moves: hired().moves };
  });
  await done();
  assert.equal(r.can, true); assert.match(r.label, /Tomas/); assert.ok(r.text.length > 0);
  assert.deepEqual(r.moves, ['vent']);
});

test('the activity teaches the move and a few gunner points, and a burn without it leaves it due', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    G.state.tutorial = null;
    for (const p of [postHolder('engineer'), postHolder('pilot'), roleHolder('xo')]) p.opinion = 3;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const menu = () => { G.transit.lifeUsed = {}; return downtimeEvent(true); };
    const label = ACTIVITIES.teach.label, offered = menu().choices.some(c => c.label === label && c.can());
    const meal = menu(); meal.choices.find(c => c.label === ACTIVITIES.meal.label).run();  // the burn's downtime spent on something else
    const still = { can: ACTIVITIES.teach.can(), label: ACTIVITIES.teach.label };
    const xp0 = skillXp('gunner'), m = menu(), text = m.choices.find(c => c.label === label).run();
    const after = { moves: [...hired().moves], gained: skillXp('gunner') - xp0, next: ACTIVITIES.teach.label, log: G.transit.comms[G.transit.comms.length - 1] };
    ACTIVITIES.teach.run();
    const two = { moves: [...hired().moves], can: ACTIVITIES.teach.can() };
    return { label, offered, still, text, after, two };
  });
  await done();
  assert.equal(r.offered, true, 'on the downtime menu');
  assert.equal(r.still.can, true); assert.equal(r.still.label, r.label, 'declined: still due');
  assert.match(r.text, /Tomas/);
  assert.deepEqual(r.after.moves, ['vent']); assert.equal(r.after.gained, 2);
  assert.match(r.after.next, /Ines/, 'lead is next');
  assert.ok(r.after.log.includes(r.label), 'Comms names what was taught, not what is due now');
  assert.deepEqual(r.two.moves, ['vent', 'lead']); assert.equal(r.two.can, false, 'split waits for level 2');
});

test('the move taught is the one the menu showed: a teacher hurt after it was drawn shuts the choice, and teaching resumes when he is back', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    G.state.tutorial = null;
    for (const p of [postHolder('engineer'), postHolder('pilot'), roleHolder('xo')]) p.opinion = 3;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const tomas = postHolder('engineer'), label = ACTIVITIES.teach.label, choice = downtimeEvent(true).choices.find(c => c.label === label);
    G.state.injured = { [tomas.id]: true };  // hurt between the menu and the click: lead (Ines) is due now
    const shut = { can: choice.can(), dueNow: ACTIVITIES.teach.label, text: choice.run(), moves: [...(hired().moves || [])] };
    G.state.injured = {}; G.transit.lifeUsed = {};
    const again = downtimeEvent(true).choices.find(c => c.label === label), back = { can: again.can() };
    again.run();
    return { label, shut, back, moves: [...hired().moves] };
  });
  await done();
  assert.match(r.label, /Tomas/);
  assert.match(r.shut.dueNow, /Ines/, 'the move due now is lead');
  assert.equal(r.shut.can, false, 'the vent choice is shut');
  assert.equal(r.shut.text, '', 'and clicking it teaches nothing');
  assert.deepEqual(r.shut.moves, [], 'not lead in its place');
  assert.equal(r.back.can, true, 'Tomas back: vent is offered again');
  assert.deepEqual(r.moves, ['vent']);
});

test('no move is taught to an owner or a non-gunner', async () => {
  assert.equal(moveDue({ post: 'engineer', moves: [] }, 3, crew(), trust), null);
  assert.equal(moveDue(null, 3, crew(), trust), null);
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'engineer', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    for (const id of G.state.crew) person(id).opinion = 3;
    G.state.hired.skill = { ...G.state.hired.skill, gunner: 200 };
    const engineer = ACTIVITIES.teach.can();
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    for (const id of G.state.crew) person(id).opinion = 3;
    G.state.career = { post: 'gunner', moves: [], skill: { gunner: 200 } };  // a hand who bought the ship
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const owner = ACTIVITIES.teach.can(), menu = downtimeEvent(true).choices.map(c => c.label);
    return { engineer, owner, menu, label: ACTIVITIES.teach.label };
  });
  await done();
  assert.equal(r.engineer, false);
  assert.equal(r.owner, false);
  assert.ok(!r.menu.includes(r.label), 'not on an owner\'s menu');
});

test('a move that is due is on every downtime menu of five, however the menu turns (#850)', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    G.state.tutorial = null;
    for (const p of [postHolder('engineer'), postHolder('pilot'), roleHolder('xo')]) p.opinion = 3;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const label = ACTIVITIES.teach.label, menus = [];
    for (let i = 0; i < 12; i++) { G.transit.lifeUsed = {}; G.transit.lifeShown = {}; menus.push(downtimeEvent().choices.map(c => c.label)); }
    return { label, menus };
  });
  await done();
  assert.ok(r.menus.every(m => m.length <= 6), 'still five, and Not now');
  assert.ok(r.menus.every(m => m.includes(r.label)), `the move is on each: ${JSON.stringify(r.menus.find(m => !m.includes(r.label)))}`);
});
