'use strict';

// Posts: crewed and manual modes, taking the controls, and orders.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

// A crew member with the given role and skill, aboard.
const helpers = () => {
  window.hire = (role, skill = 2) => {
    const c = makeCrewCandidate('belt'); c.role = role; c.skill = skill; c.mood = null; registerPerson(c); G.state.crew.push(c.id); return c;
  };
};

test('a solo captain is manual everywhere; hiring a role makes that post crewed', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.crew = []; delete st.posts;  // an old save has no posts
    const before = Object.keys(POSTS).map(id => postMode(id));
    const e = hire('engineer');
    const after = Object.keys(POSTS).map(id => postMode(id));
    st.injured = { [e.id]: 1 };
    const hurt = postMode('engineer');
    return { before, after, hurt };
  });
  assert.deepEqual(r.before, ['manual', 'manual', 'manual', 'manual']);
  assert.deepEqual(r.after, ['manual', 'manual', 'crewed', 'manual']);
  assert.equal(r.hurt, 'manual', 'an injured engineer cannot hold the post');
  await done();
});

test('taking the controls is instant; being overruled often costs the crew heart', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state; st.crew = [];
    const c = hire('pilot'); const start = c.opinion;
    takeControl('pilot');
    const taken = postMode('pilot'), calm = c.opinion;
    handBack('pilot');
    const back = postMode('pilot');
    takeControl('pilot'); handBack('pilot'); takeControl('pilot');  // the third time in a short while
    return { taken, back, calm: calm === start, after: c.opinion < start, remembered: c.memories.some(m => /keeps taking my controls/.test(m)) };
  });
  assert.equal(r.taken, 'manual'); assert.equal(r.back, 'crewed');
  assert.ok(r.calm, 'once is fine');
  assert.ok(r.after && r.remembered, 'the third time dips their opinion and they remember it');
  await done();
});

test('orders: a skilled crew member does better than the captain, once a day, within the cap', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    const st = G.state, max = ship().armor, cap = Math.floor(max * 0.75);
    st.crew = []; st.armor = 1;
    const solo = orderOdds('engineer');
    hire('engineer', 3);
    const crewed = orderOdds('engineer');
    let gained = 0; const tries = [];
    for (let i = 0; i < 40 && st.armor < cap; i++) { const a = st.armor; postState('engineer').busy = false; giveOrder('engineer', 'patch'); tries.push(st.armor - a); }
    const second = giveOrder('engineer', 'patch');  // busy after the last one, or nothing left to patch
    postState('engineer').busy = false; Mods.emit('newDay', st.day + 1);
    return { solo, crewed, armor: st.armor, cap, second, freed: postState('engineer').busy === false, tries };
  });
  assert.ok(r.crewed > r.solo, `crewed ${r.crewed} beats solo ${r.solo}`);
  assert.ok(r.armor <= r.cap && r.armor > 1, `armor patched to no more than the cap (${r.armor}/${r.cap})`);
  assert.equal(r.second, null, 'no second order while busy, or when the patch has done all it can');
  assert.ok(r.freed);
  await done();
});

test('mods can add orders, and the stations show the post', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); hire('engineer'); Mods.register({ id: 'test-orders', name: 'T', init(M) { M.filter('orders', (list, post) => post === 'gunner' ? [...list, { id: 'salute', name: 'Salute', desc: 'x', run: () => 'A crisp salute.' }] : list); } }); UI.render(); });
  await page.click('[data-action=station][data-arg=eng]');
  assert.match(await page.innerText('#panel'), /engineer post/i);
  assert.match(await page.innerText('#panel'), /has the engineer post/);
  await page.click('[data-action=takeControl][data-arg=engineer]');
  assert.match(await page.innerText('#panel'), /taken the engineer controls/);
  await page.click('[data-action=handBack][data-arg=engineer]');
  await page.click('[data-action=station][data-arg=weapons]');
  await page.click('[data-action=postOrder][data-arg="gunner:salute"]');
  assert.match(await page.innerText('#panel'), /crisp salute/);
  // Underway, the same post shows on the station sheet and its buttons work.
  await ev(() => { uatBurn('Ceres Station', 'pallas'); G.transit.times = []; });
  await page.waitForSelector('#bkeys', { state: 'visible' });
  await page.click('[data-bst=eng]');
  assert.match(await page.innerText('#bsheet'), /engineer post/i);
  await page.click('#bsheet [data-action=takeControl]');
  assert.match(await page.innerText('#bsheet'), /taken the engineer controls/);
  await done();
});
