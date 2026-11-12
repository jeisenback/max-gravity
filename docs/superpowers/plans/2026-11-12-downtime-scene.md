# Downtime as a Scene Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Downtime comes to the player once a slot as one scene saying what's on in the ship, with each place tagged in the cutaway; the downtime buttons and the comms ticker go, and comms lines fade over the ship.

**Architecture:**
- **Pure logic in `js/shiplife.js`:**
  - `downtimeDue` says when the scene opens;
  - `onDeck` says where each choice is tagged;
  - `sitPerson` names the one person to sit with;
  - `commsShown` says which comms lines show and how faded.
- **Each activity gains `on()` and `where`.** `on()` returns its "what's on" line; `where` is a room id, or a function returning a person's id.
- **`downtimeScene()` replaces the menu (`downtimeEvent`).** `lifeTick` opens it.
- **The cutaway** draws the tags while that scene is open.
- **`drawTransit`** draws the comms lines over the ship instead of in a ticker box.

**Tech Stack:** vanilla JS classic scripts on one global scope, canvas, Node's test runner, and Playwright through `tests/helpers.js`.

**Spec:** `docs/superpowers/specs/2026-11-12-downtime-scene-design.md`

## Global Constraints

- Classic scripts, one global scope. Every new top-level name is unique (`tests/globals.test.js`). No new script files.
- No new field on `G` beyond what is declared, with a comment, in `js/game.js` (`tests/gfields.test.js`). `G.lifeY` is removed from that literal. New burn state lives on the burn record `G.transit`:
  - `lifeOffered`: `{ [slotKey]: true }`;
  - `lifeBlock`: the last block seen;
  - `commsAt`: the real time each comms line was added, parallel to `comms`.
- New logic takes its state as parameters and returns a value, and runs through `tests/nodecontext.js`.
- All new words are lines of a scene or line table (`scene:downtime`, `lines:life`, and the social and family line tables), written to `docs/bible/voice.md`: flat, specific, no explaining, no aphorisms, the player's feelings never named.
- No emojis anywhere.
- Desktop only (#937): test and check at 1280x800, no phone layouts.
- The slots (`lifeSlotCount`, `lifeSlotOf`, `lifeFree`, `spendLife`), the rotation (`downtimeFive`, `menuFive`) and `role().mayDowntime` are unchanged.
- The scene opens only at a change to `breakfast`, `shift`, `meal` or `supper`, with the lights up, the crew not on the couches (`phase() === 'move'`), and no `t.event` or `G.dialog`.
- A comms line shows for 6 real seconds, at most 3 at once.
- The tags are a stand-in amber `#e8b84a`, on a dark plate.
- Test command for browser tests: `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/<file>.test.js`.

## Review Focus

1. **A burn from an older save,** with no `lifeOffered`, `lifeBlock` or `commsAt`, loads mid-slot. Nothing throws, the scene can still come this slot, and old comms lines are not drawn over the ship. (Task 3 and Task 5 tests.)
2. **A scene is already open at the moment of a change.** The downtime scene does not stack on it; it opens at the next change in the same slot. (Task 3 test.)
3. **A slot where none of the five can run** (every `can()` false). No scene opens, and nothing throws. (Task 3 test.)
4. **A tagged person who is out of the camera's view or not drawn,** for example asleep or off-screen. Their tag is not drawn, nothing throws, and the room tags still draw. (Task 4 test.)
5. **The tutorial's prompt is up when the downtime scene opens.** The prompt is hidden while the scene is open, as now, and comes back after. The scene choice that sets `hired().did.downtime` completes the tutorial step. (Task 5 test.)

---

### Task 1: The pure rules: when the scene is due, who to sit with, where the tags go

**Files:**
- Modify: `js/shiplife.js`, next to `lifeSlotOf`, `lifeFree` and `spendLife` (about lines 1060-1071)
- Test: `tests/downtimescene.test.js` (new)

**Interfaces:**
- Produces:
  - `DOWNTIME_BLOCKS = ['breakfast', 'shift', 'meal', 'supper']`
  - `downtimeDue(t, block, prevBlock) -> boolean`: true when `block !== prevBlock`, `block` is in `DOWNTIME_BLOCKS`, `lifeFree(t)`, and `!(t.lifeOffered || {})[lifeSlotOf(t)]`.
  - `sitPerson(cands, day) -> cand | null`: `cands` is `[{ id, low, hurt }]` in the picker's order. The first one with `low` or `hurt` wins; otherwise `cands[day % cands.length]`; `null` when empty.
  - `onDeck(acts, people) -> [{ label, room } | { label, id }]`: for each `{ label, where }` in `acts`, a string `where` gives `{ label, room: where }` and a function gives `{ label, id: where(people) }`. An activity with no `where`, or a function returning a falsy id, gives nothing.

- [ ] **Step 1: Write the failing tests** in `tests/downtimescene.test.js`, loading `js/data.js`, `js/util.js`, `js/figures.js`, `js/layouts.js`, `js/camera.js`, `js/rooms.js`, `js/shiplife.js` and `js/burnspeed.js` with `load()` as `tests/watchbill.test.js` does:

```js
test('the downtime scene is due at a change to breakfast, a shift, the meal or supper, once a slot', () => {
  const t = { total: 100, left: 90, slots: 2 };  // the 'before' slot
  assert.equal(downtimeDue(t, 'shift', 'breakfast'), true);
  assert.equal(downtimeDue(t, 'shift', 'shift'), false, 'no change');
  for (const b of ['handover', 'night', 'wake']) assert.equal(downtimeDue(t, b, 'supper'), false, b);
  assert.equal(downtimeDue({ ...t, lifeOffered: { before: true } }, 'meal', 'shift'), false, 'offered');
  assert.equal(downtimeDue({ ...t, lifeUsed: { before: true } }, 'meal', 'shift'), false, 'spent');
  assert.equal(downtimeDue({ ...t, lifeOffered: { before: true }, left: 40, flipped: true }, 'meal', 'shift'), true, 'the next slot');
});
test('the shortest slot still has a change that is due', () => {
  // a 2-slot burn of 1.2 ship days: each slot 0.6 ship days long holds at least one start of breakfast, a shift, the meal or supper
  const blocks = []; for (let e = 0; e < 0.6 * SHIP_DAY; e += 0.5) blocks.push(shipDay(e).block);
  assert.ok(blocks.some((b, i) => i && b !== blocks[i - 1] && DOWNTIME_BLOCKS.includes(b)));
});
test('sit with someone: one having a hard time or hurt first, else by the day', () => {
  const c = [{ id: 'a' }, { id: 'b' }, { id: 'c', low: true }];
  assert.equal(sitPerson(c, 0).id, 'c');
  assert.equal(sitPerson([{ id: 'a' }, { id: 'b', hurt: true }], 4).id, 'b');
  assert.equal(sitPerson([{ id: 'a' }, { id: 'b' }], 3).id, 'b');
  assert.equal(sitPerson([], 1), null);
});
test('onDeck: a room for a place, an id for a person, nothing without a where', () => {
  const people = [{ id: 'c:ines', role: 'pilot' }];
  assert.deepEqual(plain(onDeck([{ label: 'Cards', where: 'galley' }, { label: 'Ask', where: ps => ps[0].id }, { label: 'X' }, { label: 'Y', where: () => null }], people)),
    [{ label: 'Cards', room: 'galley' }, { label: 'Ask', id: 'c:ines' }]);
});
```

- [ ] **Step 2: Run the test to see it fail**

Run: `node --test tests/downtimescene.test.js`
Expected: FAIL, `downtimeDue is not defined`.

- [ ] **Step 3: Implement `DOWNTIME_BLOCKS`, `downtimeDue`, `sitPerson` and `onDeck`** in `js/shiplife.js` with the signatures above, each with a one-line comment naming the spec.

- [ ] **Step 4: Run the test to see it pass**

Run: `node --test tests/downtimescene.test.js`
Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add js/shiplife.js tests/downtimescene.test.js
git commit -m "Downtime scene: when it is due, who to sit with, where the tags go"
```

---

### Task 2: Every activity says what's on and where; the two paid jobs go

**Files:**
- Modify:
  - `js/shiplife.js` (`ACTIVITIES`: `meal`, `drills`, `repair`, `visit`)
  - `js/hired.js` (`ACTIVITIES.practise`, `ACTIVITIES.figures`)
  - `js/moves.js` (`ACTIVITIES.teach`)
  - `js/family.js` (`ACTIVITIES.sit`)
  - `js/social.js` (`SOCIAL_ACTIVITIES`, and `watchShow`, `streamMatch`, `readBook` and `watchBroadcast`, which build the on-now activities)
  - `js/hiredevents.js` (`HAND_DOWNTIME`, `downtime()`, `castDowntime`)
  - `js/hiredscenes.js` (`scene:downtime` and `lines:life` lines; drop `mend.*` and `spare.*`)
- Test: `tests/downtimescene.test.js`

**Interfaces:**
- Produces, on every activity object that can be offered:
  - `on()`: returns its "what's on" line, a string;
  - `where`: a room id, or a function of the people aboard returning a person's id.
  
  The rooms and people come from the spec's table:

  | Activity | `where` |
  |---|---|
  | meal, stories, cards, a show, a broadcast or a match | `'galley'` |
  | a book | `'berths'` |
  | practise, figures | the hand's post room: `postOf(POSTS[hired().post].role)` |
  | repair | `'engine'` |
  | drills | `'bridge'` |
  | advice | the captain's id |
  | shadow, teach a mate | that mate's id |
  | the taught move | the teacher's id |
  | a cast member's scene | that cast member's id |
  | visit | the first passenger's id |
  | sit | `sitPerson(...)`'s id (Task 3 builds that choice) |

- Removes the `mend` and `spare` entries from `HAND_DOWNTIME`.
- A shadow or teach choice must name the same mate in its `on()`, its `where` and its `run`. The mate is picked once, when the activity is offered (store it on the activity object the five return, as `teaching` already does through the drawn label), not inside `run`.

- [ ] **Step 1: Write the failing tests** in `tests/downtimescene.test.js`, as browser tests using `open()` from `tests/helpers.js`, on a hired burn set up as `tests/watchbill.test.js`'s `burnHelpers` does:

```js
test('every activity a burn can offer says what is on, and where it is', async () => {
  // with all three lanes listed (baseActivities(), handDowntime(), onNow()), each activity has on() returning a non-empty string
  // with no '{' left in it, and a where that is a room in ROOMS or a function returning the id of someone aboard
});
test('the paid odd jobs are gone', async () => {
  // HAND_DOWNTIME has no entry whose label is the old mend or spare label; sceneLines('scene:downtime') has no 'mend.' or 'spare.' key
});
test('a shadowed or taught mate is the same in the line, the tag and the run', async () => {
  // with Math.random fixed, for the shadow and teach activities: the first name in on() is that of the person where(people) returns,
  // and after run() that person's liking went up
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js`
Expected: FAIL. `on` is not a function on the first activity checked.

- [ ] **Step 3: Write the lines and add `on`/`where` to each activity.** For example:
  - `'cards.on': '{first} has the cards out.'`
  - `'meal.on': 'There\'s a pot on, and the table\'s laid.'`
  - `'practise.on': 'The {post} is clear if you want an hour on it.'`
  
  Read `docs/bible/voice.md` before writing. Then drop `mend` and `spare` and their lines.

- [ ] **Step 4: Run them to see them pass**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js tests/hiredevents.test.js tests/downtime.test.js`
Expected: the new tests PASS.

Where `tests/hiredevents.test.js` or `tests/downtime.test.js` assert on mend or spare, change them to the remaining activities. Record that in the commit message.

- [ ] **Step 5: Commit**

```bash
git add js/ tests/
git commit -m "Downtime: every activity says what's on and where; mend and spare go"
```

---

### Task 3: The downtime scene opens itself, once a slot

**Files:**
- Modify:
  - `js/shiplife.js` (`downtimeEvent` replaced by `downtimeScene`; `lifeTick` opens it; `buildLifeButtons` and `syncLifeButtons` removed);
  - `js/bridge.js:212` (the Crew sheet's "Spend some downtime" button and its `data-bdown` handler removed);
  - `js/help.js:73` (the burn tip rewritten without the button);
  - `js/hiredscenes.js` (`scene:downtime` gains `title.<block>` and `pass.label`/`pass.result`; `lines:life` `text.hired` and `text` are no longer used and go).
- Test: `tests/downtimescene.test.js`; update `tests/downtime.test.js`, `tests/lifeslots.test.js`, `tests/hired.test.js`, `tests/hiredevents.test.js`, `tests/moves.test.js`, `tests/culture.test.js`, `tests/people.test.js`, `tests/sittalk.test.js` and `tests/sceneplay.js` where they open `downtimeEvent` or click the button.

**Interfaces:**
- Consumes:
  - `downtimeDue`, `sitPerson` and `onDeck` (Task 1);
  - `on()` and `where` on each activity (Task 2).
- Produces:
  - `downtimeScene() -> event`. Its fields:
    - `title`: from `scene:downtime` `title.<block>`;
    - `text`: the five's `on()` lines joined with spaces;
    - `choices`: the five, then Pass;
    - `downtime: true`;
    - `tags`: `onDeck(five, shipPeople())`.
    
    A choice's `run`:
    - calls `spendLife(t)`;
    - sets `hired().did.downtime`;
    - writes the `[Ship]` log line exactly as `downtimeEvent` did;
    - calls `toActivity(you, room)`, where `room` is the activity's room, or the room of the tagged person;
    - returns the activity's result.
    
    Pass returns `pass.result` and spends nothing.
  - **Sit with someone** is offered as "Sit with {first}" for `sitPerson` of the picker's candidates (`procedural()` and the passengers with a `pid`), with `low = moodLow(p)` and `hurt = !!injured[id]`. Its `run` sets `G.nextEvent = sitBeat(p, !pax)` and returns null, as the picker's choice does.
  - In `lifeTick`, after `stageScene`:
    - `t.lifeBlock` is set to `shipDay(t.elapsed).block` every tick;
    - when `downtimeDue(t, block, t.lifeBlock)` holds (with the block read before the update), `!isDark()`, `phase() === 'move'`, `!t.event`, `!G.dialog`, and `downtimeScene()` has at least one activity: set `(t.lifeOffered = t.lifeOffered || {})[lifeSlotOf(t)] = true` and `openEvent(downtimeScene())`.

- [ ] **Step 1: Write the failing tests** in `tests/downtimescene.test.js` (browser):

```js
test('on a burn the downtime scene opens once a slot, at a change of the ship day, at 1x and at 16x', async () => {
  // for speed of 1 and 16: start a hired burn (tutorial off, story.next far off), setBurnSpeed(speed), run updateTransit in steps until
  // arrival, closing any non-downtime event with finishEvent and choosing Pass on the downtime scene; record each time a downtime scene
  // opens (G.dialog.event.downtime) with its slot (lifeSlot()) and its block. Expect one per slot (t.slots of them), each at a block in
  // DOWNTIME_BLOCKS, none while isDark() or phase() !== 'move'
});
test('choosing an activity runs it, spends the slot, logs it and sends the hand there; Pass spends nothing and it does not come back', async () => {});
test('Sit with someone names one person, the one having a hard time first, and opens the sitting with them', async () => {});
test('with a scene already open at the change, the downtime scene waits for the next change in the slot', async () => {});
test('a slot where nothing can run opens no scene', async () => {});
test('a burn from an older save, with no lifeOffered or lifeBlock, still gets its scene and nothing throws', async () => {});
test('there is no Spend some downtime button anywhere: not under the ship, not on the Crew sheet', async () => {
  // document.getElementById('tlife') === null; the Crew sheet's HTML has no 'Spend some downtime' and no data-bdown
});
```

- [ ] **Step 2: Run them to see them fail**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js`
Expected: FAIL. No downtime scene opens (`downtimeScene is not defined`).

- [ ] **Step 3: Implement `downtimeScene`, the `lifeTick` check, and the Sit choice.** Then:
  - remove `buildLifeButtons`, `syncLifeButtons`, `#tlife` and its CSS, the Crew sheet's button and its handler, and `menu.js:153`'s `tlife`;
  - rewrite the help tip: `[Tip] During a burn, downtime comes round once or twice: ...` (written to the voice guide).

- [ ] **Step 4: Update the tests that opened the menu or clicked the button** to use `downtimeScene()`, choosing by label. Then run them:

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js tests/downtime.test.js tests/lifeslots.test.js tests/hired.test.js tests/hiredevents.test.js tests/moves.test.js tests/culture.test.js tests/people.test.js tests/sittalk.test.js`
Expected: PASS.

- [ ] **Step 5: Rewrite the scene pin.** `tests/sceneplay.js` plays `downtimeScene()` in place of `downtimeEvent`.

Run: `PIN_WRITE=1 CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/scenepin.test.js && git diff --stat tests/fixtures/scene-lines-pin.json`
Expected: the pin changes only in `scene:downtime`, `lines:life` and the sit lines. Then run `tests/scenelines.test.js` and expect PASS (every line is read).

- [ ] **Step 6: Commit**

```bash
git add js/ tests/ css/ index.html
git commit -m "Downtime comes as a scene once a slot; the downtime buttons go"
```

---

### Task 4: The tags in the cutaway while the scene is open

**Files:**
- Modify: `js/shiplife.js` (`drawCutaway`: the room tag in the room-name loop, and the person tag after the people are drawn, from `hits`)
- Test: `tests/downtimescene.test.js`

**Interfaces:**
- Consumes: `G.dialog.event.downtime` and `G.dialog.event.tags` (Task 3).
- Produces:
  - `G.burnBoxes.tags`: `[{ label, x, y, w, h }]`, the screen boxes of the tags drawn this frame, for the tests (an existing `G` field);
  - the tags are drawn only while `G.dialog && G.dialog.event.downtime`;
  - a room tag sits at the room's top right, opposite its name, in `#e8b84a` on a dark plate, at 12px;
  - a person tag sits above that person's head (`hits[].head`), only when they were drawn this frame.

- [ ] **Step 1: Write the failing tests:**

```js
test('while the downtime scene is open its choices are tagged: on the room for a place, over the person for a person; none after', async () => {
  // open downtimeScene() with a known five (one room activity in view, one person activity whose person is in view), draw a frame;
  // G.burnBoxes.tags has a box per tag in view, the room's inside that room's screen box, the person's above their head;
  // after finishEvent and a frame, G.burnBoxes.tags is empty
});
test('a tagged person out of view gets no tag, and nothing throws', async () => {});
```

- [ ] **Step 2: Run them to see them fail**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js`
Expected: FAIL, because `G.burnBoxes.tags` is undefined.

- [ ] **Step 3: Draw the tags in `drawCutaway`** as above.

- [ ] **Step 4: Run them to see them pass**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js tests/burnview.test.js`
Expected: PASS.

- [ ] **Step 5: Take a 1280x800 screenshot** of the scene open with tags, at `deviceScaleFactor: 2`, and look at it. Expected: the tags read, and nothing overlaps the room names. Send it to the user.

- [ ] **Step 6: Commit**

```bash
git add js/shiplife.js tests/downtimescene.test.js
git commit -m "Downtime scene: its choices tagged in the cutaway"
```

---

### Task 5: Comms over the ship; the ticker and the life row go

**Files:**
- Modify:
  - `js/transit.js`: `comm()` records `t.commsAt`; `drawTransit` draws `commsShown` over the ship's box in place of `drawCommsTicker`, and the tutorial's prompt goes in the same place; `drawCommsTicker` and `G.lifeY` go;
  - `js/burnlayout.js`: the `ticker` and `life` rows and their sizes (`ticker`, `ticker1`, `life`, `life1`) go, and the ship takes their height; the tutorial's prompt box sits inside the ship box's bottom left;
  - `js/game.js`: the ticker's tap handler and the `lifeY` field go;
  - `js/tutorial.js`: the downtime step's text.
- Test: `tests/downtimescene.test.js`; update `tests/burnlayout.test.js`, `tests/burnview.test.js` (the ticker tap at line 219, and the ticker beside the dock at line 72) and `tests/firstrun.test.js`.

**Interfaces:**
- Produces:
  - `COMMS_SHOW = 6`, `COMMS_MAX = 3`;
  - `commsShown(comms, at, now) -> [{ text, alpha }]`:
    - the last `COMMS_MAX` lines whose `now - at[i] < COMMS_SHOW`;
    - `alpha` is 1 for the newest, fading over the last second of each line's time, and older lines dimmer (×0.6 per step back);
    - a line with no `at` is not shown;
  - `burnLayout(W, H, hudW, narrow, dialogSize, tutorialH)` keeps its signature but returns no `ticker`, `tickerLines` or `life`;
  - `tutorial` is a box inside the bottom left of `ship`, `tutorialH` high, or `null` when 0.

- [ ] **Step 1: Write the failing tests:**

```js
test('commsShown: the newest three of the last six seconds, the newest brightest, none without a time', () => {
  const at = [0, 10, 11, 12, 13], c = ['a', 'b', 'c', 'd', 'e'];
  assert.deepEqual(commsShown(c, at, 14).map(x => x.text), ['c', 'd', 'e']);
  assert.deepEqual(commsShown(c, at, 18.5).map(x => x.text), ['d', 'e']);
  assert.equal(commsShown(['x'], [], 1).length, 0);
  const s = commsShown(c, at, 13); assert.ok(s[2].alpha > s[1].alpha);
});
test('the burn layout keeps no ticker or life row: the ship runs down to the menu row, and the prompt sits inside it', () => {
  const L = burnLayout(1280, 800, 220, false, null, 0), P = burnLayout(1280, 800, 220, false, null, 68);
  assert.equal(L.ticker, undefined); assert.equal(L.life, undefined);
  assert.ok(P.tutorial.y + P.tutorial.h <= P.ship.y + P.ship.h && P.tutorial.x >= P.ship.x);
});
test('at 1280x800 the cutaway shows all four decks, and a comms line is drawn over it and gone after six seconds', async () => {});
test('the tutorial prompt stays over the ship until its step is done, and is hidden under a scene', async () => {});
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/burnlayout.test.js && CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js`
Expected: FAIL. `commsShown` is not defined, and `L.ticker` is defined.

- [ ] **Step 3: Implement the changes as above.**
  - Draw each line in 13px, at the ship box's bottom left, with a black shadow (blur 3).
  - Tutorial text: "Work your post: open the Gunnery page and give an order, or take up something in downtime when it comes round, once before the flip and once after."
  - Update `tests/burnlayout.test.js` to the new shape. Its "the keys fit" and "the ship is no smaller than before" assertions stay.
  - The old `tickerLines` tests go.

- [ ] **Step 4: Run them to see them pass**

Run: `node --test tests/burnlayout.test.js tests/gfields.test.js tests/globals.test.js && CHROMIUM_PATH=/opt/pw-browsers/chromium node --test tests/downtimescene.test.js tests/burnview.test.js tests/firstrun.test.js tests/ui.test.js`
Expected: PASS.

- [ ] **Step 5: Take a 1280x800 screenshot of the burn view** at `deviceScaleFactor: 2`. Expected: all four decks show, and the comms lines are over the bottom left. Send it to the user.

- [ ] **Step 6: Commit**

```bash
git add js/ tests/
git commit -m "Burn view: comms lines fade over the ship; the ticker and the life row go"
```

---

### Task 6: The whole suite, the editor, coverage and the soak

**Files:**
- Modify: `tools/coverage-floor.json`, only to raise a number that went up
- Test: everything

- [ ] **Step 1: Run the full suite**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium npm test > /tmp/full.log 2>&1; grep -E '^# (pass|fail)' /tmp/full.log`
Expected: `# fail 0`.

Fix anything that fails at its cause.

- [ ] **Step 2: Run the editor tests**

Run: `CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:editor`
Expected: PASS. Update `tests/editorhired.test.js`'s registry counts if the line tables changed size, and say why in the commit.

- [ ] **Step 3: Check coverage**

Run: `npm run coverage -- --check`
Expected: PASS. If `js/shiplife.js` rose, raise its number in `tools/coverage-floor.json`.

- [ ] **Step 4: Run the soak** (the pay changed: mend and spare are gone)

Run: `npm run soak`
Expected: every target holds. If a pay target moves out of tolerance, report the numbers to the user. Don't retune.

- [ ] **Step 5: Commit**

```bash
git add tools/coverage-floor.json tests/
git commit -m "Downtime scene: suite, editor, coverage and soak"
```
