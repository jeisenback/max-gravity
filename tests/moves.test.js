'use strict';

// The crew teach the hired hand's moves on a burn (docs/superpowers/specs/2026-11-08-post-ladders-design.md, the taught picks; before it the gunner's three,
// docs/superpowers/specs/2026-10-23-gunner-moves-design.md section 2): the due rule (moveDue) in plain Node, and the downtime activity (ACTIVITIES.teach) in a page.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const { MOVE_TEACH, moveDue } = load(['js/data.js', 'js/util.js', 'js/sheet.js', 'js/picks.js', 'js/moves.js'], { OPINION: { TRUSTED: 3 }, ACTIVITIES: {} }, ['MOVE_TEACH', 'moveDue']);
const TOMAS = { first: 'Tomas', opinion: 3 }, INES = { first: 'Ines', opinion: 3 }, CATO = { first: 'Cato', opinion: 3 };
const crew = (o = {}) => id => ({ vent: TOMAS, lead: INES, split: CATO, redline: TOMAS, 'hot-start': INES, parley: CATO, ...o })[id];
const trust = p => p.opinion;

test('a taught move is due once its pick is taken, in table order, while its teacher trusts the hand; the table is read from the picks', () => {
  assert.deepEqual(JSON.parse(JSON.stringify(MOVE_TEACH)), { vent: { post: 'engineer', level: 1 }, lead: { post: 'pilot', level: 2 }, split: { role: 'xo', level: 3 }, redline: { post: 'engineer', level: 5 }, 'hot-start': { post: 'pilot', level: 3 }, parley: { role: 'xo', level: 5 } });
  const hand = (picks, moves = [], post = 'gunner') => ({ post, picks, moves });
  assert.equal(moveDue(hand([]), crew(), trust), null, 'no pick taken, nothing to teach');
  assert.equal(moveDue(hand(['vent']), crew(), trust), 'vent');
  assert.equal(moveDue(hand(['vent'], ['vent']), crew(), trust), null, 'known: not again');
  assert.equal(moveDue(hand(['lead', 'vent']), crew(), trust), 'vent', 'table order, not the order taken');
  assert.equal(moveDue(hand(['vent', 'lead']), crew({ vent: { first: 'Tomas', opinion: 2 } }), trust), 'lead', 'an engineer short of trust passes to the next');
  assert.equal(moveDue(hand(['vent', 'called-shot']), crew(), trust), 'vent', 'an untaught move pick is not a lesson');
  assert.equal(moveDue(hand(['hot-start'], [], 'engineer'), crew(), trust), 'hot-start', 'an engineer hand is taught by the pilot');
  assert.equal(moveDue(hand(['redline'], [], 'pilot'), crew({ redline: undefined }), trust), null, 'nobody at the engineer post');
  assert.equal(moveDue({ post: 'gunner', picks: ['vent'] }, crew(), trust), 'vent', 'a save without moves');
  assert.equal(moveDue(null, crew(), trust), null);
});

test('a hurt, missing or untrusting teacher teaches nothing, and a move already known is not offered again', async () => {
  assert.equal(moveDue({ post: 'gunner', picks: ['vent', 'lead', 'split'], moves: [] }, crew({ vent: undefined, lead: undefined, split: undefined }), trust), null, 'nobody at the posts');
  assert.equal(moveDue({ post: 'gunner', picks: ['vent', 'lead', 'split'], moves: ['vent', 'lead', 'split'] }, crew(), trust), null, 'all three known');
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    const st = G.state, tomas = postHolder('engineer'), ines = postHolder('pilot');
    tomas.opinion = 3; ines.opinion = 3; hired().picks = ['vent', 'lead'];
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

test('a save without moves is offered the move picked and nothing throws', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    delete hired().moves; hired().picks = ['vent']; postHolder('engineer').opinion = 3;
    const can = ACTIVITIES.teach.can(), label = ACTIVITIES.teach.label, text = ACTIVITIES.teach.run();
    return { can, label, text, moves: hired().moves };
  });
  await done();
  assert.equal(r.can, true); assert.match(r.label, /Tomas/); assert.ok(r.text.length > 0);
  assert.deepEqual(r.moves, ['vent']);
});

test('the activity teaches the move and a few points at the post, and a burn without it leaves it due', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    G.state.tutorial = null;
    for (const p of [postHolder('engineer'), postHolder('pilot'), roleHolder('xo')]) p.opinion = 3;
    hired().picks = ['vent', 'lead'];
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
  assert.deepEqual(r.two.moves, ['vent', 'lead']); assert.equal(r.two.can, false, 'split waits for its pick');
});

test('the move taught is the one the menu showed: a teacher hurt after it was drawn shuts the choice, and teaching resumes when he is back', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    G.state.tutorial = null;
    for (const p of [postHolder('engineer'), postHolder('pilot'), roleHolder('xo')]) p.opinion = 3;
    hired().picks = ['vent', 'lead'];
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

test('a hand at another post is taught the move picked there, and no move is taught to an owner', async () => {
  const { ev, done } = await open({ scope: 'full' });
  const r = await ev(() => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'engineer', captainKey: 'hester', credits: 5000 }); while (G.dialog) finishEvent();
    for (const id of G.state.crew) person(id).opinion = 3;
    hired().picks = ['hot-start'];
    const engineer = { can: ACTIVITIES.teach.can(), label: ACTIVITIES.teach.label, text: ACTIVITIES.teach.run(), moves: [...hired().moves], xp: skillXp('engineer') };
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent();
    for (const id of G.state.crew) person(id).opinion = 3;
    G.state.career = { post: 'gunner', moves: [], picks: ['vent'], skill: { gunner: 200 } };  // a hand who bought the ship
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const owner = ACTIVITIES.teach.can(), menu = downtimeEvent(true).choices.map(c => c.label);
    return { engineer, owner, menu, label: ACTIVITIES.teach.label };
  });
  await done();
  assert.equal(r.engineer.can, true); assert.match(r.engineer.label, /Ines/, 'the pilot shows the engineer a hot start'); assert.match(r.engineer.text, /Ines/);
  assert.deepEqual(r.engineer.moves, ['hot-start']); assert.ok(r.engineer.xp >= 2, 'engineer points, not gunner');
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
    hired().picks = ['vent'];
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const label = ACTIVITIES.teach.label, menus = [];
    for (let i = 0; i < 12; i++) { G.transit.lifeUsed = {}; G.transit.lifeShown = {}; menus.push(downtimeEvent().choices.map(c => c.label)); }
    return { label, menus };
  });
  await done();
  assert.ok(r.menus.every(m => m.length <= 6), 'still five, and Not now');
  assert.ok(r.menus.every(m => m.includes(r.label)), `the move is on each: ${JSON.stringify(r.menus.find(m => !m.includes(r.label)))}`);
});
