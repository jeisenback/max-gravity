'use strict';

// The chapter's goal as a member's share in the Ceres co-op's Ore Runner (#882, docs/superpowers/specs/2026-11-02-coop-share-design.md).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('the share\'s figures: a buy-in by the vote, the full share, and the rest owed', async () => {
  const { ev, done } = await open();
  const r = await ev(() => ({ share: typeof SHARE_PRICE === 'undefined' ? null : SHARE_PRICE, buyIn: typeof BUY_IN === 'undefined' ? null : BUY_IN, target: HIRED_TARGET, debt: HIRED_DEBT,
    port: typeof COOP_PORT === 'undefined' ? null : COOP_PORT, stopgap: typeof STOPGAP_FACTOR }));
  await done();
  assert.equal(r.share, 150000);
  assert.deepEqual(r.buyIn, { good: 51000, mid: 57000, bad: 63000 });
  assert.equal(r.target, 57000); assert.equal(r.debt, 9000); assert.equal(r.port, 'Ceres Station');
  assert.equal(r.stopgap, 'undefined');
});

// A hand with the captain's two scenes behind them, the hull seen, and the co-op's offer open at the middle buy-in.
const withDeal = () => {
  window.handWithDeal = (o = {}) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(); st.story.next = 1e9; st.tutorial = null;
    Object.assign(h, { beats: 2, beatRun: -2, flags: { sawHull: true }, debt: o.debt || 0 });
    h.deal = { price: BUY_IN.mid, day: st.day, broker: false };
    st.credits = o.credits === undefined ? 60000 : o.credits;
    return st;
  };
  window.at = (sid, planet) => { const st = G.state; st.systemId = sid; st.planet = planet; G.mode = 'landed'; return currentPlanet(); };
};

test('the share is signed at Ceres only: another yard shows the notice and no button', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => {
    handWithDeal();
    const earth = currentPlanet(), there = { html: buyInHtml(), can: canBuyIn(USED_ID, earth), yard: earth.services.includes('shipyard') };
    const ceres = at('ceres', 'Ceres Station'), here = { html: buyInHtml(), can: canBuyIn(USED_ID, ceres), coop: isCoop(ceres), other: isCoop(earth) };
    return { there, here };
  });
  await done();
  assert.equal(r.there.yard, true, 'the start port has a yard');
  assert.match(r.there.html, /signed at Ceres/); assert.doesNotMatch(r.there.html, /data-action="buyInAsk"/); assert.equal(r.there.can, false);
  assert.equal(r.here.coop, true); assert.equal(r.here.other, false); assert.equal(r.here.can, true);
  assert.match(r.here.html, /data-action="buyInAsk" data-arg="used"/); assert.match(r.here.html, />Sign on/);
  assert.match(r.here.html, /150,000/); assert.match(r.here.html, /93,000/, 'what will still be owed');
});

test('the yard\'s ships are not on the hand\'s page in the narrow build, and stay in the full build', async () => {
  const narrow = await open(); await narrow.ev(withDeal);
  const n = await narrow.ev(() => { handWithDeal(); at('ceres', 'Ceres Station'); return buyInHtml(); });
  await narrow.done();
  assert.doesNotMatch(n, /Dust Skiff/);
  const full = await open({ scope: 'full' }); await full.ev(withDeal);
  const f = await full.ev(() => { handWithDeal(); at('ceres', 'Ceres Station'); return buyInHtml(); });
  await full.done();
  assert.match(f, /Dust Skiff/); assert.match(f, />Sign on/);
});

test('an unpaid bond at Ceres shows the bond and a disabled button', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => { handWithDeal({ debt: 3000 }); at('ceres', 'Ceres Station'); return { html: buyInHtml(), can: canBuyIn(USED_ID, currentPlanet()) }; });
  await done();
  assert.equal(r.can, false); assert.match(r.html, /hiring hall 3,000/); assert.match(r.html, /data-action="buyInAsk" data-arg="used" disabled/);
});

test('asking for the share opens no haggle', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => { handWithDeal(); at('ceres', 'Ceres Station'); Mods.act('buyInAsk', USED_ID); return { confirm: hired().confirm, dialog: !!G.dialog }; });
  await done();
  assert.equal(r.confirm, 'used'); assert.equal(r.dialog, false);
});

test('the captain heads for Ceres with the buy-in in hand', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => {
    handWithDeal(); at('pallas', 'Pallas Refinery'); G.state.cargo = {};
    const wants = wantsYard(), plan = planRun();
    const board = [{ pay: 9000, days: 3, sid: 'juno', planet: 'Juno Commons', tons: 10 }, { pay: 5000, days: 3, sid: 'ceres', planet: 'Ceres Station', tons: 10 }];
    const pickBest = pickContract(board, { free: 50, goal: c => c.planet === COOP_PORT, risk: () => 1, picks: 1 }).best.planet;
    return { wants, dest: plan && plan.planet, pickBest };
  });
  await done();
  assert.equal(r.wants, true); assert.equal(r.dest, 'Ceres Station'); assert.equal(r.pickBest, 'Ceres Station', 'a contract to Ceres counts four times over');
});

// Sign at Ceres: play the chain the buyInGo action opens, choosing the first choice of each scene, and return the titles in order.
const signAndPlay = () => {
  window.signAndPlay = () => {
    at('ceres', 'Ceres Station'); hired().confirm = USED_ID; Mods.act('buyInGo', USED_ID);
    const titles = []; let guard = 20;
    while (G.dialog && guard--) { titles.push(G.dialog.event.title); chooseEvent(0); finishEvent(); }
    return titles;
  };
};

test('Cato signs on with you whatever he thinks of you, and the others who like you come too', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => {
    handWithDeal(); at('ceres', 'Ceres Station'); const cato = castPerson('cato'), ines = castPerson('ines');
    cato.opinion = -1; ines.opinion = OPINION.CLOSE; castPerson('tomas').opinion = 0;
    const both = buyInCompanions().map(c => c.cast);
    ines.opinion = 0; const catoOnly = buyInCompanions().map(c => c.cast);
    G.state.people[cato.id].dead = true; G.state.crew = G.state.crew.filter(id => id !== cato.id); const without = buyInCompanions().map(c => c.cast);
    return { both, catoOnly, without };
  });
  await done();
  assert.deepEqual(r.both, ['cato', 'ines']); assert.deepEqual(r.catoOnly, ['cato']); assert.ok(!r.without.includes('cato'));
  // and only for the share: at another yard, or buying another ship, the old rule stands
});

test('signing takes the buy-in, keeps the share on the career, and leaves the captain her ship', async () => {
  const { ev, done } = await open();
  await ev(withDeal); await ev(signAndPlay);
  const r = await ev(() => {
    const st = handWithDeal(), ship0 = st.shipId, c0 = st.credits, price = hired().deal.price, cap = hiredCaptain();
    const titles = signAndPlay();
    return { titles, spent: c0 - st.credits, price, share: st.career && st.career.share, hired: st.hired, ship: st.shipId, ship0, finished: st.career && st.career.finished, bought: st.career && st.career.bought, capShip: !!cap.ship };
  });
  await done();
  assert.equal(r.spent, r.price); assert.deepEqual(r.share, { coop: 'Ceres Station', buyIn: 57000, owed: 93000 });
  assert.equal(r.hired, null); assert.equal(r.ship, r.ship0, 'the hand owns no ship'); assert.equal(r.capShip, true, 'the captain stays a contact with her ship');
  assert.equal(r.finished, true); assert.equal(r.bought, undefined, 'chapter two\'s owner close does not start');
  assert.ok(r.titles.includes("A Member's Share"), r.titles.join(' | ')); assert.equal(r.titles[r.titles.length - 1], 'The End of Chapter One');
});

test('the close names Cato first and says what is owed, and reads without him when he is gone', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => {
    handWithDeal(); at('ceres', 'Ceres Station'); const close = chapterEnd(USED_ID).text;
    const cato = castPerson('cato'); G.state.people[cato.id].dead = true; G.state.crew = G.state.crew.filter(id => id !== cato.id);
    return { close, without: chapterEnd(USED_ID).text, title: chapterEnd(USED_ID).title };
  });
  await done();
  assert.equal(r.title, "A Member's Share");
  assert.match(r.close, /Cato/); assert.match(r.close, /93,000/); assert.match(r.close, /Ceres/);
  assert.doesNotMatch(r.without, /Cato/);
});

test('after the close the chapter ends at the title, and a finished save reopens on the end', async () => {
  const { ev, done } = await open();
  await ev(withDeal); await ev(signAndPlay);
  const r = await ev(() => {
    handWithDeal(); signAndPlay(); const mode = G.mode;
    save(); loadGame(); const reopened = G.dialog ? G.dialog.event.title : null;
    return { mode, reopened };
  });
  await done();
  assert.equal(r.mode, 'title'); assert.equal(r.reopened, 'The End of Chapter One');
});

test('a save that bought her before reopens as it was', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.career = { ...careerOf(hired()), came: [], bought: st.day }; st.hired = null; st.shipId = 'lightfreighter';
    save(); loadGame(); return { dialog: G.dialog ? G.dialog.event.title : null, ship: G.state.shipId };
  });
  await done();
  assert.notEqual(r.dialog, 'The End of Chapter One'); assert.equal(r.ship, 'lightfreighter');
});

test('an open deal from before signs at its price', async () => {
  const { ev, done } = await open();
  await ev(withDeal); await ev(signAndPlay);
  const r = await ev(() => { const st = handWithDeal({ credits: 70000 }); hired().deal.price = 61000; const c0 = st.credits; signAndPlay(); return { spent: c0 - st.credits, owed: st.career.share.owed }; });
  await done();
  assert.equal(r.spent, 61000); assert.equal(r.owed, 89000);
});

test('Cato\'s rule is the share\'s: away from the co-op\'s office he comes only if he likes you', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => { handWithDeal(); castPerson('cato').opinion = -1; for (const k of ['ines', 'tomas']) castPerson(k).opinion = 0; return buyInCompanions().map(c => c.cast); });
  await done();
  assert.ok(!r.includes('cato'), r.join(','));
});

test('the hand\'s text says a member\'s share, not a ship', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const help = HELP.find(t => t.id === 'hand'), helpText = help.title + ' ' + help.text().join(' ');
    return { help: helpText, goal: goalLine(G.state, hired()), cato: CAST.cato.scenes.mid1.text + ' ' + CAST.cato.scenes.mid1.choices[0].result, hope: PEOPLE_LINES['family:cato-hope']['text.0'] };
  });
  await done();
  for (const [k, t] of Object.entries(r)) assert.doesNotMatch(t, /ship of your own|buy a ship|Dust Skiff|cheapest ship|two members|old carrier/, `${k}: ${t}`);
  assert.match(r.help, /co-op/); assert.match(r.goal, /buy-in/); assert.match(r.cato, /Ore Runner/); assert.match(r.hope, /five/);
});

test('the end scene\'s choice, taken through the page, leaves the title menu up with nothing over it', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    openEvent(chapterOverScene()); UI.act('choose', '0');
    const menu = document.getElementById('menu') || document.querySelector('[data-action=menuView]');
    return { mode: G.mode, dialog: !!G.dialog, menuButtons: document.querySelectorAll('[data-action=menuView]').length, hidden: !!(menu && menu.closest('[hidden]')) };
  });
  await done();
  assert.equal(r.mode, 'title'); assert.equal(r.dialog, false, 'no result card over the title'); assert.ok(r.menuButtons > 0, 'the menu has its buttons'); assert.equal(r.hidden, false);
});

test('a finished save opens on its end without running the landing\'s handlers', async () => {
  const { ev, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    G.state.career = { ...careerOf(hired()), came: [], finished: true }; G.state.hired = null; save();
    const emit = Mods.emit, seen = []; Mods.emit = (name, ...a) => { seen.push(name); return emit.call(Mods, name, ...a); };
    try { loadGame(); } finally { Mods.emit = emit; }
    return { landed: seen.filter(n => n === 'landed').length, title: G.dialog && G.dialog.event.title };
  });
  await done();
  assert.equal(r.title, 'The End of Chapter One'); assert.equal(r.landed, 0);
});

test('the co-op holds the berth until you sign: long after the offer, it stands and nothing lapses', async () => {
  const { ev, done } = await open();
  await ev(withDeal);
  const r = await ev(() => {
    const st = handWithDeal({ credits: 40000 }); st.day += 400; G.mode = 'landed'; Mods.emit('landed', currentPlanet());
    const lapse = G.dialog && ['The Empty Cradle', 'Gone From the Apron'].includes(G.dialog.event.title) ? G.dialog.event.title : null; G.dialog = null; G.nextEvent = null;  // a landing may open other scenes
    return { open: dealOpen(), lapse, page: buyInHtml(), wants: (st.credits = 60000, wantsYard()) };
  });
  await done();
  assert.equal(r.open, true); assert.equal(r.lapse, null); assert.match(r.page, /member's share/); assert.doesNotMatch(r.page, /until about day/); assert.equal(r.wants, true);
});
