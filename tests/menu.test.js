'use strict';

// Title screen, new game, pause, save slots, export and import, settings, help, dates.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('dates start on 9 Jun 2214 and show in the header', async () => {
  const { page, ev, done } = await open();
  assert.equal(await ev(() => dateOf(1)), '9 Jun 2214');
  assert.equal(await ev(() => dateOf(23)), '1 Jul 2214');
  assert.match(await ev(() => dateOf(366)), /2215$/);
  assert.match(await page.evaluate(() => document.querySelector('.stats').innerText), /9 Jun 2214/);
  await done();
});

test('title, new game, pause, autosave, continue, slots, settings', async () => {
  const { page, ev, done } = await open({
    title: true,
    // A save from before slots existed; it should become slot 1.
    init: () => { if (!localStorage.getItem('maxGravity.slotMeta')) localStorage.setItem('maxGravity.save.v2', JSON.stringify({ credits: 4321, day: 20, systemId: 'mars', planet: 'Mars', shipId: 'shuttle', fuel: 300, armor: 50, cargo: {}, paid: {}, missions: [], rumors: [], dest: null, nextId: 1 })); },
  });
  assert.equal(await ev(() => G.mode), 'title');

  // New game in slot 2 as a Belter, with a name and a ship name.
  await page.click('[data-action=menuView][data-arg=new]');
  await page.fill('#ngCaptain', 'Ines Okafor');
  await page.fill('#ngShip', 'Tuesday Forever');
  await page.click('[data-action=menuBackground][data-arg=belt]');
  await page.click('[data-action=menuSlotPick][data-arg="2"]');
  await page.click('[data-action=menuStart]');
  const started = await ev(() => ({ mode: G.mode, captain: captain().name, ship: home().name, belt: repOf('Belt Collective'), slot: Saves.current, v: G.state.v }));
  assert.deepEqual(started, { mode: 'landed', captain: 'Ines Okafor', ship: 'Tuesday Forever', belt: started.belt, slot: 2, v: started.v });
  assert.ok(started.belt > 0, 'Belt background starts with Belt standing');

  // Pause in flight: time stops, saving is off.
  await ev(() => { G.state.tutorial = null; while (G.dialog) finishEvent(); });
  await page.click('[data-action=takeoff]');
  await page.keyboard.press('Escape');
  const t0 = await ev(() => G.time);
  await page.waitForTimeout(400);
  assert.equal(await ev(() => G.time), t0, 'time stands still while paused');
  assert.ok(await page.isDisabled('[data-action=menuSave]'), 'no saving in flight');
  await page.click('[data-action=menuResume]');
  assert.equal(await ev(() => G.paused), false);

  // Docking saves into slot 2; slot 1 is the migrated old save.
  await ev(() => { Object.assign(G.player, { x: currentPlanet().x, y: currentPlanet().y, vx: 0, vy: 0 }); G.npcs = []; G.state.credits = 9999; tryLand(); });
  const metas = await ev(() => Saves.metas());
  assert.equal(metas[1].credits, 4321);
  assert.equal(metas[2].credits, 9999);
  assert.equal(metas[2].captain, 'Ines Okafor');

  // Quit to title and continue.
  await ev(() => { while (G.dialog) finishEvent(); });
  await page.click('[data-action=menuPause]');
  await page.click('[data-action=menuSave]');
  await page.click('[data-action=menuQuit]');
  await page.click('[data-action=menuContinue]');
  assert.deepEqual(await ev(() => [G.mode, captain().name, G.state.credits]), ['landed', 'Ines Okafor', 9999]);

  // Export slot 2, import it into an empty slot, delete that copy.
  await page.click('[data-action=menuPause]');
  await page.click('[data-action=menuView][data-arg=load]');
  await page.click('[data-action=menuSlotExport][data-arg="2"]');
  const code = await ev(() => Menu.exported && Menu.exported.code);
  assert.ok(code && code.length > 50, 'export code');
  await page.fill('#importCode', code);
  await page.click('[data-action=menuImport]');
  assert.deepEqual(await ev(() => Object.keys(Saves.metas())), ['1', '2', '3']);
  await page.click('[data-action=menuSlotDelete][data-arg="3"]');
  await page.click('[data-action=menuSlotDelete][data-arg="3:yes"]');
  assert.deepEqual(await ev(() => Object.keys(Saves.metas())), ['1', '2']);

  // The slot in play has no Delete while the game is open.
  assert.equal(await page.$(`[data-action=menuSlotDelete][data-arg="${await ev(() => Saves.current)}"]`), null);

  // Load the old save: migrated to the current version.
  await page.click('[data-action=menuSlotLoad][data-arg="1"]');
  assert.deepEqual(await ev(() => [G.state.planet, G.state.credits, G.state.v === SAVE_VERSION, Array.isArray(G.state.crew), Saves.current]), ['Mars', 4321, true, true, 1]);

  // Settings are remembered.
  await page.click('[data-action=menuPause]');
  await page.click('[data-action=menuView][data-arg=settings]');
  await page.click('[data-action=menuText][data-arg="1.15"]');
  await page.check('#setMotion');
  await page.fill('#setMusic', '0');
  await page.dispatchEvent('#setMusic', 'change');
  const set = await ev(() => JSON.parse(localStorage.getItem('maxGravity.settings')));
  assert.equal(set.textScale, 1.15);
  assert.equal(set.reduceMotion, true);
  assert.equal(set.music, 0);
  await done();
});

test('help topics open from the title screen', async () => {
  const { page, ev, done } = await open({ title: true });
  await page.click('[data-action=menuView][data-arg=help]');
  const topics = await page.$$eval('[data-action=menuTopic]', b => b.length);
  assert.equal(topics, await ev(() => HELP.length));
  await page.click('[data-action=menuTopic][data-arg=combat]');
  assert.match(await page.textContent('.menu h2'), /Fights during burns/);
  await done();
});

test('music mood follows the game', async () => {
  const { ev, done } = await open();
  const moods = await ev(() => {
    const out = {};
    G.mode = 'landed'; out.landed = Music.pickMood();
    G.state.tutorial = null; takeOff(); G.npcs = []; out.flight = Music.pickMood();
    G.mode = 'engage'; out.engage = Music.pickMood();
    G.mode = 'title'; out.title = Music.pickMood();
    G.mode = 'flight';
    return out;
  });
  assert.deepEqual(moods, { landed: 'port', flight: 'burn', engage: 'tense', title: 'title' });
  await done();
});
