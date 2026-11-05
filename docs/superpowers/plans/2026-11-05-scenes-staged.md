# Scenes Staged Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** While a scene is open during a burn, the people in it gather in its room in the cutaway and act it out; the hired captain is drawn aboard.

**Architecture:** A pure function `sceneStage(ev, aboard)` in js/shiplife.js decides the room and who goes there. `lifeTick` applies it each frame while `G.dialog` is open in a burn: it walks those staged to spots in the room, holds them there facing each other, and releases them when the scene closes or changes. `posture` sits or stands the staged. `shipPeople` adds the hired captain.

**Tech Stack:** Vanilla JS classic scripts, canvas; Node's test runner with `tests/nodecontext.js` (Node) and Playwright via `tests/helpers.js` (page).

**Spec:** docs/superpowers/specs/2026-11-05-scenes-staged-design.md

## Global Constraints

- Staging happens only when `G.mode === 'transit'`, `phase() === 'move'`, and the open scene is not a fight (a fight's event has `board`).
- Room words (whole words, case-insensitive, earliest in title then text): galley `galley|mess|the table`; bridge `bridge|cockpit`; engine `engine room|the drive`; hold `hold|cargo bay`; medbay `medbay|clinic bunk`; berths `berths?|bunks?`; gunnery `gunnery|the guns`.
- Order of the room: `ev.room` (a room id in `ROOMS`) → first room word → `captain` staged: `bridge` → a `passenger` staged: `berths` → `galley`.
- Staged walking pace: 1.5 times the wandering pace (`0.06 * dt` becomes `0.09 * dt`).
- Release: a wait of 2 to 5 seconds (`rand(2, 5)`) before the routine resumes.
- Captain figure (hired game only): role `captain`, `HAUNTS.captain = { bridge: 6, galley: 2, berths: 1 }`, `ROLE_COLORS.captain = '#b9c4d0'`.
- New logic takes its state as parameters and returns a value (CLAUDE.md); `sceneStage` reads no global.
- No emojis; heartbeat in `.claude/heartbeat.json` updated at each step and never committed.

## Review Focus

1. A scene opens while someone it names is on the ladder: they finish onto a deck and walk on to the scene; nobody is left between decks.
2. A scene names someone asleep at night: they get up and come; others asleep stay asleep.
3. A scene names someone not aboard (a bar stranger, a dead crew member): they are skipped, with no error, and the rest are staged.
4. One scene leads straight into another with a different room: the people move to the new room, and anyone not in the new scene is released.
5. A scene opens in the couch, secure or float phase: nobody moves from their couch or straps.

---

### Task 1: `sceneStage`, the stage of a scene

**Files:**
- Modify: `js/shiplife.js` (beside `ROOMS`)
- Test: `tests/livingship.test.js` (add `sceneStage` to the `load` names)

**Interfaces:**
- Produces: `sceneStage(ev, aboard, staged) -> { room: string, ids: string[] } | null`, where `ev` is the open scene (`{ title, text, room?, board? }`), `aboard` is `[{ id, role }]` (the cutaway's people), and `staged` is the ids of the people the scene names (`scenePeople(ev).map(c => c.id)`, given by the caller so the function stays pure). `ids` holds `'you'` and the named people who are aboard, in `staged` order after `'you'`.

- [ ] **Step 1: Write the failing tests** in `tests/livingship.test.js`:

```js
test('a scene is staged where it says, by its words, or by who is in it', () => {
  const aboard = [{ id: 'you', role: 'you' }, { id: 'c:tomas', role: 'engineer' }, { id: 'cap', role: 'captain' }, { id: 'p1', role: 'passenger' }];
  const st = (ev, ids) => JSON.parse(JSON.stringify(sceneStage({ title: 'With Tomas', text: '', ...ev }, aboard, ids)));
  assert.deepEqual(st({ room: 'hold', text: 'in the galley' }, ['c:tomas']), { room: 'hold', ids: ['you', 'c:tomas'] }, 'the room it sets');
  assert.equal(st({ text: 'He is on the bench in the engine room, and later in the galley.' }, ['c:tomas']).room, 'engine', 'the first room it names');
  assert.equal(st({ text: 'They talk at the table.' }, ['c:tomas']).room, 'galley');
  assert.equal(st({ text: 'Nothing about a room.' }, ['cap']).room, 'bridge', 'the captain');
  assert.equal(st({ text: 'Nothing about a room.' }, ['p1']).room, 'berths', 'a passenger');
  assert.equal(st({ text: 'Nothing about a room.' }, ['c:tomas']).room, 'galley', 'otherwise the galley');
  assert.deepEqual(st({ text: 'In the galley.' }, ['c:tomas', 'bar:stranger']).ids, ['you', 'c:tomas'], 'only those aboard');
  assert.equal(st({ text: 'In the galley.' }, ['bar:stranger']), null, 'nobody aboard: no stage');
  assert.equal(st({ text: 'In the galley.', board: '<svg/>' }, ['c:tomas']), null, 'a fight: no stage');
  assert.equal(st({ text: 'The holdout says no.' }, ['c:tomas']).room, 'galley', 'whole words only');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `node --test tests/livingship.test.js`
Expected: FAIL, `sceneStage` is not defined.

- [ ] **Step 3: Implement `sceneStage` in js/shiplife.js**, with the room words of Global Constraints as a table `SCENE_ROOM_WORDS` (room id → regex). The room words are searched in `${ev.title} ${ev.text}`; the earliest match index wins.

- [ ] **Step 4: Run it to see it pass**

Run: `node --test tests/livingship.test.js`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add js/shiplife.js tests/livingship.test.js
git commit   # "Burn view: where a scene is staged and who goes (sceneStage)", with the session's trailer
```

### Task 2: The captain aboard

**Files:**
- Modify: `js/shiplife.js` (`HAUNTS`, `ROLE_COLORS`, `shipPeople`, `nightHaunts`)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: `hiredCaptain()` (js/hired.js) gives the captain's person record in the hired game, else null.
- Produces: `shipPeople()` includes `{ name: <first>, role: 'captain', id: <captain's person id> }` in the hired game, after the crew.

- [ ] **Step 1: Write the failing test** in `tests/burnview.test.js`, with the file's `helpers` and `burn()`:

```js
test('the hired captain is aboard in the cutaway, and spends the day on the bridge', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => { burn(); const cap = hiredCaptain(), p = shipPeople().find(x => x.role === 'captain'); return { id: p && p.id, cap: cap.id, haunt: HAUNTS.captain, color: ROLE_COLORS.captain }; });
  await done();
  assert.equal(r.id, r.cap); assert.deepEqual(r.haunt, { bridge: 6, galley: 2, berths: 1 }); assert.equal(r.color, '#b9c4d0');
});
```

- [ ] **Step 2: Run it to see it fail**

Run: `npx node --test --test-name-pattern="hired captain is aboard" tests/burnview.test.js` (with `CHROMIUM_PATH` as in CLAUDE.md)
Expected: FAIL, no captain aboard.

- [ ] **Step 3: Implement**: add the captain to `shipPeople` (when `hiredCaptain()` is a person), `HAUNTS.captain`, `ROLE_COLORS.captain`. At night the captain sleeps in the berths (the default of `nightHaunts`); the captain is not on the night watch.

- [ ] **Step 4: Run it to see it pass**, then `npm run test:changed`.
Expected: PASS; no other test fails (a test that counts the people aboard in a hired burn may need the captain added: update its count and say so in the commit).

- [ ] **Step 5: Commit**

```bash
git add js/shiplife.js tests/burnview.test.js
git commit   # "Burn view: the hired captain aboard"
```

### Task 3: Staging the scene in the cutaway

**Files:**
- Modify: `js/shiplife.js` (`lifeTick`, `posture`)
- Test: `tests/burnview.test.js`

**Interfaces:**
- Consumes: `sceneStage(ev, aboard, staged)` (Task 1); `scenePeople(ev)` (js/character.js); the captain in `shipPeople()` (Task 2).
- Produces: on each person in `shipPeople()`: `p.staged` (the room id while staged, else undefined) and `p.spot` (the x they stand at). On `G.transit`: `stageOf` (the event the stage was made for). `posture(p, ph, time, asleep)` returns `sit` for a staged person who has arrived in the galley or the berths, or who is the captain at the bridge, gunnery or medbay; otherwise `stand`; facing toward the group's middle.

- [ ] **Step 1: Write the failing tests** in `tests/burnview.test.js`:

```js
test('a scene during a burn brings the people in it and you to its room, facing each other, and closing it lets them go', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(async () => {
    burn(); const t = G.transit; t.left = t.total * 0.7;  // the move phase
    const mate = person(G.state.crew[0]), out = {};
    openEvent({ title: `With ${mate.first}`, text: `${mate.first} is in the galley with a cup going cold.`, choices: [{ label: 'Sit down', run: () => 'Done.' }] });
    for (let i = 0; i < 600; i++) lifeTick(1 / 30);  // twenty seconds
    const ps = shipPeople(), you = ps[0], m = ps.find(p => p.id === mate.id), g = ROOMS.find(x => x.id === 'galley');
    out.inGalley = [you, m].every(p => p.dk === 0 && p.x >= g.x0 && p.x <= g.x1 && p.tx === null);
    out.facing = you.face === Math.sign(m.x - you.x) && m.face === -you.face;
    out.poses = [you, m].map(p => posture(p, phase(), 0, false).name);
    G.dialog = null; t.event = null; for (let i = 0; i < 300; i++) lifeTick(1 / 30);
    out.released = [you, m].every(p => !p.staged);
    return out;
  });
  await done();
  assert.ok(r.inGalley, 'both in the galley, standing still'); assert.ok(r.facing, 'facing each other');
  assert.deepEqual(r.poses, ['sit', 'sit'], 'seated at the galley table'); assert.ok(r.released, 'let go when it closes');
});
```

Add one test each for Review Focus items 1, 2, 4 and 5 (item 3 is Task 1's "only those aboard"), in the same style:
  - **ladder:** put the named crew member at `dk: 0.5` before `openEvent`; after the ticks they are on a whole deck (`dk` is 0 or 1) and in the room.
  - **asleep:** set `G.transit` to night (as `isDark()` reads it) with the named crew member in the berths; they leave the berths for the scene, and another sleeper does not.
  - **chained:** open a galley scene, tick, then open a bridge scene naming only you and the captain; the crew member from the first is released and the captain and you are on the bridge.
  - **couch phase:** with `t.left = t.total * 0.98`, open the galley scene; after the ticks everyone is at their `seat` (`p.x === p.seat`).

- [ ] **Step 2: Run them to see them fail**

Run: `npx node --test --test-name-pattern="scene during a burn|ladder|asleep|chained|couch phase" tests/burnview.test.js`
Expected: FAIL, nobody moves for a scene.

- [ ] **Step 3: Implement in `lifeTick`**: when `G.dialog && G.dialog.event !== G.transit.stageOf`, compute the stage with `sceneStage(G.dialog.event, people, scenePeople(G.dialog.event).map(c => c.id))` (only in the `move` phase), release anyone staged who is not in the new stage, and give each staged person `p.staged = room` and a `p.spot`: the room's middle, people spread `0.03` apart, centred. While staged, a person walks to the room's deck and spot at `0.09 * dt` and then waits there (`p.wait` held). When the dialog closes (`!G.dialog`), clear `p.staged` and set `p.wait = rand(2, 5)`. A staged person is never asleep (`isAsleep` returns false for `p.staged`). Faces: once arrived, each faces the group's middle; the one in the middle faces you.

- [ ] **Step 4: Implement the posture** in `posture` as Interfaces says.

- [ ] **Step 5: Run the tests to see them pass**, then `npm run test:changed`.
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add js/shiplife.js tests/burnview.test.js
git commit   # "Burn view: a scene staged in its room"
```

### Task 4: Screenshots, full tests, and the owner's look

**Files:** none in the repo (screenshots in the scratchpad).

- [ ] **Step 1:** Screenshot three scenes staged during a burn: a sitting in the galley with a crew member, the captain's talk on the bridge, and a scene naming the engine room. Send them to the owner.
- [ ] **Step 2:** Run `npm test` and `npm run test:editor` (with `CHROMIUM_PATH`), and `node -e` the floor check (`touchesFloor`); run `npm run coverage -- --check` if it is true.
Expected: all pass.
- [ ] **Step 3:** Push, and offer the PR.
