'use strict';

// The deck fight on the deck plan, as a scene (js/deckplanui.js, #1353), behind its setting: the checkbox, the opening, the hand's choices on the
// ship and in "This turn", a turn fought, a charge stopped at its setter, the hand killed mid-turn, and a repel lost to today's settle.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.fightGame = (post = 'gunner', shipId = 'raider') => {
    __seed(1);
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post, captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30; hired().raidTold = true;
    uatBurn('Ceres Station', 'pallas'); G.transit.times = []; G.transit.event = null; G.dialog = null;
    __seed(2);
    if (!window.realMakeEnemy) window.realMakeEnemy = makeEnemy;
    const spare = window.realMakeEnemy({ kind: 'pirate' });
    window.makeEnemy = () => Object.assign(spare, { shipId, armor: SHIPS[shipId].armor, maxArmor: SHIPS[shipId].armor });
    window.rateFoe = s => { s.grade = 0; s.pack = false; return s; };
    return st;
  };
  window.battle = () => { startDuel({ kind: 'pirate' }, false); const e = G.nextEvent; G.nextEvent = null; openEvent(e); return G.dialog.event.fight; };
  // boarded from a ship fight (she came alongside); the deck fight opened, and the fight returned
  window.boarded = () => { const s = battle(); G.radar = null; G.dialog = null; G.nextEvent = null; shipFightEnd(s, 'boarded'); const deck = G.nextEvent; G.nextEvent = null; openEvent(deck); return deck.fight; };
  // a test's own deck: figures moved where it says (id -> spot), the rest of theirs downed when `only` is set; the page drawn again
  window.stage = (s, where, only = false) => { for (const f of s.state.figures) if (f.id in where) f.spot = where[f.id]; else if (only && f.side === 'them') f.hp = 0; s.theirs = null; UI.redraw(planFightEvent(s)); };
  window.sawText = sel => (document.querySelector(sel) || {}).textContent || '';
};

test('the setting chooses which deck fight a boarding opens: the checkbox on, the deck plan; off, today\'s', async () => {
  const { page, ev, done } = await open({ title: true });
  await ev(helpers);
  await page.click('[data-action="menuView"][data-arg="settings"]');
  await page.click('input[data-action="planFight"]');
  const on = await ev(() => { const was = Settings.planFight; fightGame('gunner'); const s = boarded(); return { was, title: G.dialog.event.title, kind: s.state.kind, saved: JSON.parse(localStorage.getItem('maxGravity.settings')).planFight }; });
  assert.deepEqual(on, { was: true, title: 'Boarders', kind: 'plan', saved: true });
  const off = await ev(() => { Settings.planFight = false; fightGame('gunner'); const s = boarded(); return { title: G.dialog.event.title, kind: s.state.kind }; });
  assert.deepEqual(off, { title: 'The Lock', kind: 'deck' }, 'today\'s strip');
  await done();
});

test('with every crewmate kept to their berth, the deck-plan fight still opens with the hand and the captain (Review Focus 4)', async () => {
  const { ev, done } = await open();
  await ev(helpers);
  const r = await ev(() => {
    Settings.planFight = true; fightGame('gunner');
    const st = G.state; st.injured = Object.fromEntries(st.crew.filter(id => id !== hired().captain).map(id => [id, { until: st.day + 9 }]));
    const s = boarded();
    return { title: G.dialog.event.title, ours: s.state.figures.filter(f => f.side === 'us').map(f => f.id === 'hand' ? 'hand' : f.captain ? 'captain' : 'crew'), fight: !!document.querySelector('canvas.plan-cut') };
  });
  assert.equal(r.title, 'Boarders');
  assert.deepEqual(r.ours.sort(), ['captain', 'hand']);
  assert.ok(r.fight, 'the cutaway is drawn');
  await done();
});

test('a ringed spot, an act, an order and a suggestion show in "This turn" and on the ship, and Fight resolves the turn', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  const first = await ev(() => { Settings.planFight = true; fightGame('gunner'); const s = boarded(); return { at: s.state.figures.find(f => f.hand).spot, drawn: document.querySelector('canvas.plan-cut').dataset.drawn || '' }; });
  assert.equal(first.at, 'gunseat', 'the gunner at the gun seat');
  await page.waitForFunction(() => !!document.querySelector('canvas.plan-cut').dataset.drawn);
  await page.click('[data-action="planMove"][data-arg="magazine"]');
  assert.match(await ev(() => sawText('.plan-you')), /^You move to the magazine\./);
  assert.equal(await ev(() => !!document.querySelector('[data-action="planMove"][data-arg="magazine"].on')), true, 'the spot is ringed as the one chosen');
  await page.click('[data-action="planAct"][data-arg="holdfire"]');
  assert.match(await ev(() => sawText('.plan-you')), /You hold your fire\./);
  await page.click('[data-action="planOrder"][data-arg="c:ines|hold|"]');
  const full = await ev(() => { const s = G.dialog.event.fight; for (const f of s.state.figures) if (['captain', 'c:tomas', 'c:cato'].includes(f.id)) f.spot = 'w0'; UI.redraw(planFightEvent(s));
    return [...document.querySelectorAll('[data-action="planOrder"]')].map(b => b.dataset.arg).filter(a => a.startsWith('c:ines|move|')); });
  assert.deepEqual(full, [], 'the well at the flight deck holds three of ours: no step there for Ines');
  assert.match(await ev(() => sawText('.plan-you')), /Ines stays put\./);
  await page.click('[data-action="planSuggest"][data-arg="fall"]');
  assert.match(await ev(() => sawText('.plan-side')), /"(All right, fall back\.|No\. We stay on it\.)"/);
  assert.equal(await ev(() => document.querySelectorAll('[data-action="planSuggest"]').length), 0, 'once a turn');
  await page.waitForFunction(() => /holdfire/.test(document.querySelector('canvas.plan-cut').dataset.drawn), null, { timeout: 5000 });
  await page.click('[data-action="planFightGo"]');
  const t = await ev(() => { const s = G.dialog.event.fight; return { turn: s.state.turn, hand: s.state.figures.find(f => f.hand).spot, last: sawText('.plan-last'), you: sawText('.plan-you') }; });
  assert.equal(t.turn, 1);
  assert.equal(t.hand, 'magazine');
  assert.match(t.last, /^Turn 1: /);
  assert.match(t.you, /^You stand at the magazine\./, 'the next turn opens with the hand where they went');
  await done();
});

test('a charge shown on the ship is stopped by shooting its setter', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => {
    Settings.planFight = true; fightGame('gunner', 'corsair'); const s = boarded();
    stage(s, { t1: 'w3', hand: 'gunseat', 'c:ines': 'magazine', 'c:tomas': 'magazine' }, true);
  });
  const shown = await ev(() => ({ charge: sawText('.plan-charge'), set: G.dialog.event.fight.theirs.charge }));
  assert.match(shown.charge, /setting a charge on the magazine from the well at the gun deck/);
  assert.deepEqual(shown.set, { on: 'magazine', from: 'w3', setter: 't1' });
  await page.click('[data-action="planAct"][data-arg="shoot:w3"]');
  await ev(() => { Math.random = () => 0.01; });  // every shot hits (the game's frame loop draws rolls too, so no list of them)
  await page.click('[data-action="planFightGo"]');
  const log = await ev(() => { const s = G.dialog.event.fight; return s.state.log[s.state.log.length - 1]; });  // the setter, alone, is down: the fight may be over
  assert.match(log, /The charge at the magazine never goes off\./);
  await done();
});

test('the hand killed mid-turn stops the fight after the turn and queues the ending (Review Focus 3)', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => {
    Settings.planFight = true; fightGame('gunner'); const s = boarded();
    career().hurtUntil = G.state.day + 5; s.covered = true; s.state.friend = false; s.state.figures.find(f => f.hand).hp = 1;  // already hurt and wounded, so a hit downs the hand and can kill; and no friend left to take it
    stage(s, { t1: 'magazine', hand: 'gunseat' }, true);
    for (const f of s.state.figures) if (f.side === 'us' && !f.hand) f.spot = 'helm';
    s.theirs = { moves: [], shots: [{ id: 't1', at: 'gunseat', odds: 0.5 }], charge: null, cut: null, seal: null, feint: false };
    UI.redraw(planFightEvent(s));
  });
  await ev(() => { Math.random = () => 0; });  // the shot hits, the hurt and the death roll pass
  await page.click('[data-action="planFightGo"]');
  const r = await ev(() => ({ died: !!hired().died, title: G.dialog && G.dialog.event.title, fight: !!(G.dialog && G.dialog.event.fight) }));
  assert.equal(r.died, true);
  assert.equal(r.fight, false, 'no more of the fight');
  assert.notEqual(r.title, 'Boarders');
  await done();
});

test('a repel lost on our bridge goes to today\'s settle: the ship taken', async () => {
  const { page, ev, done } = await open();
  await ev(helpers);
  await ev(() => {
    Settings.planFight = true; fightGame('gunner'); const h = hired(); h.fund = 1000; const s = boarded();
    stage(s, { t1: 'w0', t2: 'w0' }, false);
    for (const f of s.state.figures) if (f.side === 'us' && !f.hand) f.hp = 0;
    s.theirs = { moves: [], shots: [], charge: null, cut: null, seal: null, feint: false };
    UI.redraw(planFightEvent(s));
  });
  await ev(() => { Math.random = () => 0.99; });  // nobody is hit, and the captain is not lost on her bridge
  await page.click('[data-action="planFightGo"]');
  const r = await ev(() => ({ title: G.dialog.event.title, text: G.dialog.event.text, fund: hired().fund, labels: G.dialog.choices.map(c => c.label) }));
  assert.equal(r.title, 'Boarders');
  assert.match(r.text, /They're on the bridge\./);
  assert.equal(r.fund, 700, 'the fund stripped as today');
  assert.deepEqual(r.labels, ['Stand down']);
  await done();
});
