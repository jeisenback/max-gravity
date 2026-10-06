'use strict';

// What a hired hand's screens show: no owner tabs, a Suggest button shut with its reason, and no empty mission headings.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.startHand = () => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'dov' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.tutorial = null; G.mode = 'landed';
    return st;
  };
  window.subTabs = () => { const d = document.createElement('div'); d.innerHTML = bridgeKeys(currentPlanet(), 'port'); return [...d.querySelectorAll('.tabs.sub button')].map(b => b.textContent); };
};

test('a hired hand has no Exchange or Company sub-tab, and an owner keeps them', async () => {
  const hand = await open({ scope: 'earth-hired' });
  await hand.ev(helpers);
  const h = await hand.ev(() => { startHand(); return subTabs(); });
  assert.deepEqual(h, ['Port', 'Missions', 'Bar']);
  await hand.done();
  const owner = await open({ scope: 'full' });
  await owner.ev(helpers);
  const o = await owner.ev(() => { G.state = newState(); G.mode = 'landed'; return subTabs(); });
  assert.ok(o.includes('Exchange') && o.includes('Company'));
  await owner.done();
});

test('Suggest is shut with a visible reason until the captain listens', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = startHand(), h = hired(), base = { good: 'water', tons: 5, cost: 100, planet: 'Mars', ballast: false, sid: 'mars', profit: 400 };
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: { ...base, profit: 1000 }, alts: [base] };
    const html = () => { const d = document.createElement('div'); d.innerHTML = swayHtml(); return { disabled: d.querySelector('button').disabled, text: d.textContent }; };
    const cap = person(h.captain), out = {};
    cap.opinion = captainHears() - 1; out.shut = html();
    cap.opinion = captainHears(); out.open = html();
    return out;
  });
  assert.ok(r.shut.disabled); assert.match(r.shut.text, /does not take suggestions from a hand they do not know yet/);
  assert.ok(!r.open.disabled); assert.doesNotMatch(r.open.text, /do not know yet/);
  await done();
});

test('the Missions tab shows no empty headings for a hand, and shows them once there is content', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    startHand(); G.offers = [];
    const text = () => { const d = document.createElement('div'); d.innerHTML = UI.views.missions.call(UI); return d.textContent; };
    const out = { empty: text() };
    G.state.missions = [{ type: 'delivery', tons: 1, destSystem: G.state.systemId, reward: 100, title: 'Test', id: 1 }];
    out.filled = text();
    return out;
  });
  assert.doesNotMatch(r.empty, /Available work|Active missions|None/);
  assert.match(r.filled, /Active missions/); assert.doesNotMatch(r.filled, /Available work/);
  await done();
});

test('a suggested run reads in the captain\'s terms, and the deck plan draws a face for each person', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const st = startHand(), h = hired(), base = { good: 'water', tons: 5, cost: 100, planet: 'Mars', ballast: false, sid: 'mars', days: 5, profit: 1000 };
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: base, alts: [{ ...base }] };
    const dock = document.createElement('div'); dock.innerHTML = runHtml();
    return { captain: dock.querySelector('p.desc').textContent, alt: dock.querySelector('.row .hint').textContent, terms: runTerms(base) };
  });
  assert.ok(r.captain.includes(r.terms) && r.alt.includes(r.terms), 'the same terms, from one formula');
  assert.match(r.alt, /cr to you, plus .* cr wage/);
  const n = await ev(() => { G.mode = 'landed'; UI.render(); return crewMembers().length + 2; });
  for (const [w, h] of [[1280, 800], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await page.click('[data-action=station][data-arg=interior]');
    const faces = await page.$$eval('#panel .con-plant circle.person', c => c.length), portraits = await page.$$eval('#panel .con-plant .face svg.char-portrait', c => c.length);
    assert.equal(faces, n, `a token for everyone at ${w}px`); assert.equal(portraits, n - 1, `a portrait for everyone but you at ${w}px`);
  }
  await done();
});

test('a hired hand\'s map says what it is for and shows the captain\'s plan; an owner\'s map is unchanged', async () => {
  const hand = await open({ scope: 'earth-hired' });
  await hand.ev(helpers);
  await hand.ev(() => {
    window.drawIt = () => {
      const said = [], rings = [], text = ctx.fillText, arc = ctx.arc;
      ctx.fillText = function (t, ...a) { said.push(String(t)); return text.call(this, t, ...a); };
      ctx.arc = function (x, y, r, ...a) { if (r === 15 && ctx.strokeStyle === '#5fd35f') rings.push([x, y]); return arc.call(this, x, y, r, ...a); };
      try { drawMap(900, 700); } finally { ctx.fillText = text; ctx.arc = arc; }
      return { said: said.join(' '), rings: rings.length };
    };
  });
  const r = await hand.ev(() => {
    const st = startHand(), h = hired(), out = {}, base = { good: 'water', tons: 5, cost: 100, planet: 'Mars', ballast: false, sid: 'mars', days: 5, profit: 1000 };
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: base, alts: [] };
    out.port = drawIt();
    h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: null, alts: [] };
    out.none = drawIt();
    return out;
  });
  assert.match(r.port.said, /The captain picks where she goes\. Look around; you cannot plot a burn\./);
  assert.doesNotMatch(r.port.said, /to plot a burn\.|full tank|No burn plotted/);
  assert.match(r.port.said, /The captain's run: Earth to Mars, 5 days\./); assert.equal(r.port.rings, 1, 'the destination is ringed');
  assert.match(r.none.said, /waiting for a market/); assert.equal(r.none.rings, 0);
  await hand.done();
  const owner = await open({ scope: 'full' });
  await owner.ev(() => { window.drawIt = () => { const said = [], text = ctx.fillText; ctx.fillText = function (t, ...a) { said.push(String(t)); return text.call(this, t, ...a); }; try { drawMap(900, 700); } finally { ctx.fillText = text; } return said.join(' '); }; });
  const o = await owner.ev(() => { G.state = newState(); return drawIt(); });
  assert.match(o, /to plot a burn\./); assert.match(o, /beyond a full tank/); assert.match(o, /No burn plotted/);
  await owner.done();
});

test('crew names in the bar link to their pages', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    startHand();
    let html = '';  // each crew member is at the bar six times in ten: a few dozen evenings show every one
    for (let i = 0; i < 40; i++) html += roomLines(currentPlanet()).map(l => `<div class="hint">${l}</div>`).join('');
    const d = document.createElement('div'); d.innerHTML = html;
    const links = [...d.querySelectorAll('.hint button.link[data-action=person]')].map(b => b.dataset.arg);
    return { links, crew: crewMembers().filter(c => CREW_AT_BAR[c.role]).map(c => c.id), raw: /\{n\}/.test(html) };
  });
  assert.ok(!r.raw, 'no name left unfilled');
  for (const id of r.crew) assert.ok(r.links.includes(id), `${id} is a link`);
  await done();
});

test('the person page puts where you stand first, and explains the Ties card', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired', viewport: { width: 1280, height: 800 } });
  await ev(helpers);
  const r = await ev(() => {
    startHand();
    const out = { crew: crewMembers()[0].id, cap: hired().captain };
    return out;
  });
  for (const id of [r.cap, r.crew]) {
    await ev(arg => { G.bridgeOpen = null; Mods.act('person', arg); UI.render(); }, id);
    const heads = await page.$$eval('#panel .con:has(.char-id) .con-side .con-card .eyebrow', e => e.map(x => x.textContent));
    assert.equal(heads[0], 'Standing with you', `first card for ${id}`);
    if (heads.includes('Ties')) assert.match(await page.innerText('#panel .con:has(.char-id) .con-side'), /Whom they answer to/, 'the Ties card says what it is for');
    const box = await page.$eval('#panel .con:has(.char-id) .con-side .con-card', e => { const b = e.getBoundingClientRect(); return { top: b.top, bottom: b.bottom, h: window.innerHeight }; });
    assert.ok(box.top >= 0 && box.bottom <= box.h, `Standing is in view at 1280 by 800 for ${id}`);
  }
  await done();
});

test('a hired pilot on a touch screen has the burn called once the ship is clear of local space', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', viewport: { width: 390, height: 844 }, mobile: true });
  await ev(helpers);
  const r = await ev(() => {
    const out = {}, go = (post, far) => {
      startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
      const st = G.state, h = hired(); st.story.next = 1e9; st.tutorial = null; G.mode = 'landed'; h.fund = 20000;
      const base = { good: 'water', tons: 5, cost: 100, planet: 'Mars', ballast: false, sid: 'mars', days: 5, profit: 1000 };
      h.plan = { day: st.day, at: st.planet, cargo: JSON.stringify(st.cargo), run: base, alts: [] };
      sail();
      if (far !== null) { G.player.x = far; G.player.y = 0; }
      update(0.016);
      return G.mode;
    };
    out.near = go('pilot', 100);                    // still close: nothing starts
    out.far = go('pilot', BURN_DIST + 100);         // clear: the captain calls it
    out.gunner = go('gunner', null);                // the other posts depart as before: the autopilot flies out first
    return out;
  });
  assert.equal(r.near, 'flight'); assert.equal(r.far, 'departing');
  assert.equal(r.gunner, 'flight');
  await done();
});
