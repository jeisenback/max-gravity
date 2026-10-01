'use strict';

// Burn events for a hired hand: the pool of their own, the owner's events hidden, and
// the work events at each post.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// window.draws: what a burn throws up over many draws, with nothing remembered between them.
const hiredHelpers = () => {
  window.draws = n => {
    const titles = new Set(), work = [];
    for (let i = 0; i < n; i++) {
      G.state.eventSeen = {}; G.transit.seen = []; G.dialog = null; G.transit.event = null;
      const e = pickHappening('transit');
      if (e) { titles.add(e.title); if (e.workId) work.push(e); }
    }
    return { titles: [...titles], work };
  };
  window.startHired = (post = 'gunner') => { startGame({ slot: 1, background: 'earth', captain: 'Ines Okafor', mode: 'hired', post }); while (G.dialog) finishEvent(); G.state.flags.classicCombat = true; G.state.story.next = 1e9; };
};

test('every post has work events of its own, all in one table of weights', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => ({
    perPost: HIRED_POSTS.map(p => WORK_EVENTS.filter(d => d.post === p).length),
    ids: new Set(WORK_EVENTS.map(d => d.id)).size, total: WORK_EVENTS.length,
    stray: WORK_EVENTS.filter(d => !HIRED_POSTS.includes(d.post)).length,
    weights: Object.keys(HIRED_WEIGHTS), ownerOnly: OWNER_ONLY_EVENTS.every(t => TRANSIT_EVENTS.some(e => e.title === t)),
  }));
  assert.ok(r.perPost.every(n => n >= 3), `at least three at each post (${r.perPost})`);
  assert.equal(r.ids, r.total, 'ids are unique'); assert.equal(r.stray, 0);
  assert.deepEqual(r.weights, ['work', 'ship']);
  assert.ok(r.ownerOnly, 'the hidden events exist');
  await done();
});

test('a hand draws from a pool of its own, and never sees an owner-only event', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  for (const post of ['pilot', 'gunner', 'engineer', 'comms']) {
    const r = await ev(post => {
      startHired(post); G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
      const d = draws(300);
      return { titles: d.titles, workPosts: [...new Set(d.work.map(e => e.owner))], work: d.work.length, owner: OWNER_ONLY_EVENTS };
    }, post);
    assert.ok(r.work > 20, `${post}: the work pool is used (${r.work})`);
    assert.deepEqual(r.workPosts, [post], `${post}: only their own post's problems`);
    assert.deepEqual(r.titles.filter(t => r.owner.includes(t)), [], `${post}: nothing that is an owner's business`);
    assert.ok(r.titles.some(t => ['Distress Call', 'Pirates Matching Course', 'Derelict Ship', 'Coolant Leak'].includes(t)), `${post}: the road still happens`);
  }
  // An owner is unchanged: the owner's events still come, and no work events.
  const o = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Ines' }); while (G.dialog) finishEvent(); G.state.tutorial = null; G.state.story.next = 1e9;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
    const d = draws(400);
    return { work: d.work.length, hasOwner: d.titles.some(t => OWNER_ONLY_EVENTS.includes(t)) };
  });
  assert.equal(o.work, 0); assert.ok(o.hasOwner, 'an owner still gets the stowaway and the merchant');
  await done();
});

test('work events move your experience at the post, and the careful way teaches more', async () => {
  const { ev, done } = await open();
  await ev(hiredHelpers);
  const r = await ev(() => {
    const out = {};
    for (const post of HIRED_POSTS) {
      startHired(post); G.state.tutorial = null; uatBurn('Ceres Station', 'pallas'); G.transit.times = [];
      out[post] = WORK_EVENTS.filter(d => d.post === post).map(d => {
        const e = workEvent(d), x0 = skillXp(post), careful = e.choices[0].run(), c = skillXp(post) - x0;
        const x1 = skillXp(post), text = e.choices[1].run(), q = skillXp(post) - x1;
        return { c, q, owner: e.owner, text: careful + text };
      });
    }
    return out;
  });
  for (const [post, list] of Object.entries(r)) for (const e of list) {
    assert.equal(e.c, 3, `${post}: careful teaches 3`); assert.ok(e.q === 4 || e.q === 1, `${post}: quick teaches 4 or 1 (${e.q})`);
    assert.equal(e.owner, post); assert.doesNotMatch(e.text, /undefined|NaN|\{|\[object/);
  }
  await done();
});
