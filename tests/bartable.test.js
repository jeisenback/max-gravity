'use strict';

// The table at the bar: which things you can do with a stranger depends on the person, and what happens is not the same each time.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; st.credits = 2000;
    fillBar(currentPlanet());
    return st;
  };
  window.take = (e, re) => { G.dialog = { event: e, choices: e.choices }; return chooseEvent(e.choices.findIndex(c => re.test(c.label))); };
};

// Draws the table until the topic comes up (the menu rotates), and returns that event.
const drawHelpers = () => {
  window.draw = (pat, re, tries = 120) => { for (let i = 0; i < tries; i++) { const e = talkEvent(pat); if (e.choices.some(c => re.test(c.label))) return e; } return null; };
  window.person2 = (traits, goal, extra = {}) => { const p = makePerson('earth'); p.traits = traits; p.goal = goal; p.secret = null; Object.assign(p, extra); registerPerson(p); return p; };
};

test('a person offers three topics and a goodbye, which rotate, and fit who they are', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(drawHelpers);
  const r = await ev(() => {
    setup();
    const p = person2(['talkative', 'kind'], 'home'), pat = { p, known: false }, menus = new Set(), labels = new Set(), sizes = new Set();
    let prev = '', same = 0;
    for (let i = 0; i < 12; i++) { const e = talkEvent(pat), m = e.choices.map(c => c.label.replace(p.first, 'N')).join('|'); if (m === prev) same++; prev = m; menus.add(m); sizes.add(e.choices.length); e.choices.forEach(c => labels.add(c.label.replace(p.first, 'N'))); }
    const fit = { homesick: 0, other: 0, pious: 0 };
    for (let i = 0; i < 60; i++) {
      const h = person2(['homesick', 'kind'], 'home'), o = person2(['talkative', 'kind'], 'home'), q = person2(['pious', 'kind'], 'home');
      if (talkEvent({ p: h, known: false }).choices.some(c => /Ask about /.test(c.label) && c.label.includes(h.home))) fit.homesick++;
      if (talkEvent({ p: o, known: false }).choices.some(c => /Ask about /.test(c.label) && c.label.includes(o.home))) fit.other++;
      if (talkEvent({ p: q, known: false }).choices.some(c => /blessing/.test(c.label))) fit.pious++;
    }
    return { menus: menus.size, labels: labels.size, sizes: [...sizes], same, fit };
  });
  assert.deepEqual(r.sizes, [4], 'three topics and the goodbye');
  assert.ok(r.menus >= 6, `${r.menus} different menus in 12`); assert.ok(r.labels >= 8, `${r.labels} different topics`);
  assert.ok(r.same <= 3, 'a menu is rarely the same twice running');
  assert.equal(r.fit.other, 0, 'someone who is not homesick does not offer it'); assert.ok(r.fit.homesick > 20, 'the homesick usually do'); assert.ok(r.fit.pious > 20, 'the pious offer a blessing');
  await done();
});

test('the same topic lands differently on different people', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(drawHelpers);
  const r = await ev(() => {
    setup(); const out = {};
    for (const [key, traits] of [['shy', ['nervous', 'kind']], ['talker', ['talkative', 'drunk']]]) {
      const p = person2(traits, 'home', { opinion: 0 }), pat = { p, known: false }, e = draw(pat, /say nothing/);
      G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /say nothing/.test(c.label)));
      out[key] = { liked: p.opinion, done: !!p.barDone.quiet };
    }
    return out;
  });
  assert.ok(r.shy.liked > 0, 'a quiet word helps the shy'); assert.ok(r.talker.liked < 0, 'and is taken badly by the talker'); assert.ok(r.shy.done);
  await done();
});

test('their work teaches a hand of the same post, and a goal opens a scene where how you help lands by who they are', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(drawHelpers);
  const r = await ev(() => {
    const st = setup(), out = {};
    hired().post = 'engineer';
    const tech = person2(['kind', 'curious'], 'home', { job: 'hydroponics technician' }), tp = { p: tech, known: false }, xp = skillXp('engineer');
    let e = draw(tp, /about their work/); G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /about their work/.test(c.label)));
    out.xp = skillXp('engineer') - xp;
    const help = (traits, goal, pick) => {
      const p = person2(traits, goal), pat = { p, known: false }, e1 = draw(pat, new RegExp(GOAL_HELP[goal].ask));
      G.dialog = { event: e1, choices: e1.choices }; chooseEvent(e1.choices.findIndex(c => c.label === GOAL_HELP[goal].ask));
      const next = G.nextEvent; G.nextEvent = null; G.dialog = { event: next, choices: next.choices };
      st.credits = 2000; const before = p.opinion, cr = st.credits;
      const text = chooseEvent(next.choices.findIndex(c => pick.test(c.label)));
      return { n: next.choices.length, liked: p.opinion - before, paid: cr - st.credits, text };
    };
    out.greedyGift = help(['greedy', 'kind'], 'home', /Pay part/); out.rudeGift = help(['rude', 'brave'], 'home', /Pay part/);
    out.listen = help(['homesick', 'kind'], 'job', /talk it through/);
    // a secret, once they trust you
    const debtor = person2(['kind', 'brave'], 'home', { opinion: 2, secret: 'debt' }), dp = { p: debtor, known: false };
    e = draw(dp, /weighing on them/); G.dialog = { event: e, choices: e.choices }; chooseEvent(e.choices.findIndex(c => /weighing on them/.test(c.label)));
    const sc = G.nextEvent; G.nextEvent = null; G.dialog = { event: sc, choices: sc.choices }; st.credits = 2000; const o0 = debtor.opinion;
    chooseEvent(sc.choices.findIndex(c => /Cover part/.test(c.label))); out.debt = { paid: 2000 - st.credits, liked: debtor.opinion - o0 };
    return out;
  });
  assert.equal(r.xp, 3, 'the engineer learns from the technician');
  assert.equal(r.greedyGift.n, 4); assert.equal(r.greedyGift.paid, 60); assert.ok(r.greedyGift.liked >= 1, 'the greedy take it well');
  assert.ok(r.rudeGift.liked < 0, 'the proud take charity badly'); assert.ok(r.listen.liked >= 1);
  assert.deepEqual(r.debt, { paid: 200, liked: r.debt.liked }); assert.ok(r.debt.liked >= 1);
  await done();
});

test('cards, a drink and a goodbye do not always end the same way', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(drawHelpers);
  const r = await ev(() => {
    const st = setup(), cards = new Set(), leaves = new Set(), out = {};
    for (let i = 0; i < 120; i++) {
      st.credits = 2000;
      const p = makePerson('earth'), pat = { p, known: false }, e = draw(pat, /cards/), norm = t => t.replace(new RegExp(p.first, 'g'), 'N').replace(new RegExp(p.home, 'g'), 'H');
      cards.add(norm(take(e, /cards/)).split('.')[0]);
      leaves.add(norm(take(e, /Leave/)));
    }
    out.cards = cards.size; out.leaves = leaves.size;
    out.clean = ![...cards, ...leaves].some(t => /\{|undefined|NaN/.test(t));
    return out;
  });
  assert.ok(r.cards >= 6, `${r.cards} openings at cards`); assert.ok(r.leaves >= 3, `${r.leaves} goodbyes`); assert.ok(r.clean);
  await done();
});

test('what someone says at the table is theirs: their traits, their goal, and how they feel about you', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers); await ev(drawHelpers);
  const r = await ev(() => {
    const st = setup(), real = Math.random, out = {};
    const topic = (p, id) => BAR_TOPICS.find(t => t.id === id).make(p, { p, known: false }, { st, bar: 'Bar' }).run();
    const greedy = person2(['greedy', 'kind'], 'medical'), pious = person2(['pious', 'kind'], 'pilgrim'), friend = person2(['kind', 'brave'], 'home');
    friend.opinion = OPINION.FRIEND;
    try {
      Math.random = () => 0.01;  // the person's own line, a win at cards, the first of anything picked
      st.credits = 2000;
      out.greedy = topic(greedy, 'cards');
      out.pious = take(talkEvent({ p: pious, known: false }), /Leave/);
      out.medical = topic(greedy, 'heard');
      out.pilgrim = topic(pious, 'heard');
      out.friend = take(talkEvent({ p: friend, known: true }), /Leave/);
      out.stranger = take(talkEvent({ p: friend, known: false }), /Leave/);
      Math.random = () => 0.99;  // the shared pool instead
      out.shared = take(talkEvent({ p: greedy, known: false }), /Leave/);
    } finally { Math.random = real; }
    return out;
  });
  assert.match(r.greedy, /counts the pot twice/); assert.match(r.pious, /Fair winds/);
  assert.match(r.medical, /medic/); assert.match(r.pilgrim, /holy/);
  assert.match(r.friend, /Same again, next port/); assert.doesNotMatch(r.stranger, /Same again/);
  assert.doesNotMatch(r.shared, /bigger purse/, 'a shared goodbye some of the time');
  await done();
});

test('every topic and every follow-up scene runs for every kind of person, with clean text', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = setup(), bad = [], bar = 'Bar', clean = t => typeof t === 'string' && t.length > 10 && !/\{|undefined|NaN/.test(t);
    for (let i = 0; i < 150; i++) {
      const p = makePerson(Math.random() < 0.5 ? 'earth' : undefined); p.opinion = randInt(-3, 4); if (i % 3 === 0) p.secret = Object.keys(SECRET_HELP)[i % 5];
      for (const t of BAR_TOPICS) {
        const pat = { p, known: i % 2 === 0, drank: true };
        if (!(t.w(p, pat) > 0) && !t.must && !['peace'].includes(t.id)) continue;
        st.credits = 5000; G.nextEvent = null;
        const o = t.make(p, pat, { st, bar }), text = o.run();
        if (!clean(text)) bad.push(`${t.id}:${text}`);
        const next = G.nextEvent; G.nextEvent = null;
        if (next) for (let k = 0; k < next.choices.length; k++) { st.credits = 5000; const c = next.choices[k], t2 = c.run(); if (!clean(t2) || !clean(next.text)) bad.push(`${t.id}/${c.label}:${t2}`); }
      }
    }
    return bad.slice(0, 5);
  });
  assert.deepEqual(r, []);
  await done();
});
