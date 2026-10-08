# Prose and World Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the game's writing a repeatable system: revised prose rules, voice registers and character cards, dialogue rules, a world bible, a writing workflow, and a tic report that measures the text.

**Architecture:** Tasks 1 to 9 are markdown under `docs/` (`docs/voices/`, `docs/world/`, `docs/writing-a-scene.md`) and are checked by shell commands. Tasks 10 and 11 are the one piece of code, `tools/prose-lint.js`, a pure CommonJS module with a small CLI, tested in plain Node like `tools/changed-tests.js`. Nothing under `js/` changes and no scene is rewritten.

**Tech Stack:** Markdown; Node (CommonJS, `node:test`, `node:assert/strict`); no new dependencies.

**Spec:** `docs/superpowers/specs/2026-10-08-prose-and-world-design.md`. Read it before starting; the north stars, the eight dialogue rules, the register fields and the entry kinds are defined there.

## Global Constraints

- No emojis anywhere (code, text, docs, commits). Doc check, run on every file a task writes: `! LC_ALL=C.UTF-8 grep -nP '[\x{1F000}-\x{1FFFF}\x{2600}-\x{27BF}]' <files>` (exit 0 means none found).
- Before editing, read `.claude/heartbeat.json`; if another session is active on the branch (updated in the last few minutes), stop and tell the user. Write it when starting a task, update it at each step, mark it `done` at the end. It is git-ignored; never commit it.
- Work on branch `claude/upbeat-cannon-8myhy5`. No pull request unless asked. End commit messages with the attribution lines the session gives.
- Run the full suite before pushing: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` (about three minutes). While working, `npm run test:changed`.
- Keep it small: build what the spec asks for, nothing extra.
- Samples, cards and bible entries are original text. Do not copy or closely imitate a passage from Corey, Le Guin, O'Brian, Leonard, Ishiguro, Leckie or Bujold.
- American spelling. Samples are second person, present tense where they address the player.
- Code is the authority for mechanics; docs are the authority for texture. A doc that states a fact the code also states names the file and does not copy the number, except where this plan says to quote.
- A fact that is not in the code or the README and is invented for a sample or an entry is marked `Status: proposed` in the bible. The owner confirms proposed facts at review.

## Review Focus

Failure modes the spec implies that its tests would not otherwise touch, most likely first. Each has a test in the task named.

1. A `//` inside a string, an apostrophe in a comment, or a nested template literal makes the extractor read the wrong text or hang (Task 10, `extractProse`).
2. A sentence that ends in a closing quote (`."`) is not split, or is split into a stray quote mark (Task 10, `shape`).
3. An empty list of strings yields NaN in the mean or spread (Task 10, `shape`).
4. `--compare` with no baseline written crashes instead of saying what to do (Task 11, `main`).
5. A directory with none of the narrative files (a fresh checkout of another branch, a temp dir) makes the report throw (Task 11, `narrativeFiles` and `main`).

---

### Task 1: Reference passages and dialogue rules

**Files:**
- Create: `docs/voices/reference.md`
- Create: `docs/voices/dialogue.md`

**Interfaces:**
- Produces: `docs/voices/reference.md` with five `## ` sections titled exactly `1. Hester, a speech built on a figure`, `2. Tomas, running on to the pump`, `3. The galley quarrel`, `4. The ship's night`, `5. The bridge, tense register`. Later tasks cite them by number. `docs/voices/dialogue.md` with the eight rules numbered 1 to 8, which cards cite by number.

- [ ] **Step 1: Write `docs/voices/reference.md`.** A short intro (what the file is: the passages the owner reviewed on 2026-10-08, the reference for every register and card; names, prices and details in them are invented for the samples and are not canon until they are in `docs/world/`), then the five sections, each with its passage as a blockquote, exactly as below.

  1. Hester:
  > "Forty-one a day for the berth," Captain Vance says, not looking up from the notebook, "and we are there four days, which is a hundred and sixty-four, and then there is the pilotage on top of it, because Ganymede will not let us dock without a tug, and the tug is another thirty-eight whether we want it or not. So when you tell me the longer run is cheaper, I would like you to show me the line where it is. I have been down this column three times and I keep arriving at the same place."

  2. Tomas:
  > Tomas has his arm in the pump housing to the shoulder, and he is talking while he works, to the pump and not to you. "No, I know, I know, you have been at it since Ceres and nobody has said a word, and I am not going to either, I am going to take this gasket off you and put a new one on, and you will run cold for an hour afterward, and that is the whole of the arrangement." He pulls the gasket free. It is the color of old tea.

  3. The galley quarrel:
  > "If you had said something," Ines says, "I would have moved it. I am not going to stand here and be told I did it on purpose, when I did not know it was a problem until Pax mentioned it at the watch change."
  >
  > "I said something." Mara puts the spoon down on the counter, bowl up. "Tuesday, at the watch change, in front of Pax, and you said you would look at it when you had a minute, and it has been six days, and the minute has not come."
  >
  > "Then I forgot."
  >
  > "You forgot." Mara looks around the table. "Did anyone hear me say it?"
  >
  > Nobody answers.

  4. The ship's night:
  > On a ship of eleven people the night is kept by whoever has the watch and by the lights, which go down to a third at twenty-two hundred and come back up at six, and in between it is understood that you do not use the corridor unless you have to, and that if you have to you go in your socks, because the deck rings under a boot and the lower bunks are a meter and a half beneath it. Nobody has written this down. Pax, who came aboard in March, was told once, by Tomas, at the end of her first watch, and has not needed telling since.

  5. The bridge:
  > The contact resolves at four thousand kilometers into a corsair with her torpedo bays open. Captain Vance comes onto the bridge with the notebook still in her hand and does not put it down. "Hold it," she says. "Hold it until she is inside two thousand, because we have six torpedoes and I am not buying more at Ganymede prices, and if she is going to open fire at four thousand then she has more nerve than ammunition."

  After each passage, one italic line "Shows:" naming what it demonstrates (1: speech built around a figure; 2: run-on speech to a machine; 3: fuller lines on both sides of a quarrel and one use of silence; 4: a custom carried in one long sentence; 5: a short fact sentence, then one breath of command).

- [ ] **Step 2: Write `docs/voices/dialogue.md`.** One paragraph of purpose (sentence-level rules for narration do not protect speech; these rules do), then the eight rules from the spec's `dialogue.md` bullet, numbered 1 to 8 with the spec's wording and each followed by a one-line pointer to the reference passage that shows it (rule 1: passage 3; rule 2: passages 1 and 2; rule 3: passage 3; rule 4: passages 1 and 5; rule 5: passage 3; rule 6: passages 1 and 2; rule 7: passage 3; rule 8: passage 3). Mark the file's status line "Draft, for the owner to confirm".

- [ ] **Step 3: Verify.**
  Run: `grep -c '^## ' docs/voices/reference.md` Expected: `5`.
  Run: `grep -c '^[1-8]\. ' docs/voices/dialogue.md` Expected: `8`.
  Run: `grep -c 'bowl up' docs/voices/reference.md` Expected: `1`.
  Run the emoji check on both files. Expected: exit 0.

- [ ] **Step 4: Commit** `docs/voices/reference.md` and `docs/voices/dialogue.md` ("Add the reference passages and the dialogue rules").

---

### Task 2: Revise `docs/prose-style.md`

**Files:**
- Modify: `docs/prose-style.md` (the lines naming Hester and Tomas, rule 6, the worked example's "After" block, the checking list)

**Interfaces:**
- Consumes: Task 1's files.

- [ ] **Step 1: Replace the reference-passages sentence.** The sentence "In the game, the Hester Vance and Tomas Achebe passages (`js/captains/hester.js`, `js/cast.js`) already do this best." becomes: "The reference passages are in `docs/voices/reference.md`, the dialogue rules in `docs/voices/dialogue.md`, and the narrator registers and character cards beside them in `docs/voices/`. The existing text in the game is too clipped to be the model."

- [ ] **Step 2: Replace rule 6** with: `6. **Vary the sentences.** Mix lengths and constructions: coordinate and subordinate, open on something other than the subject, put a hard fact in a short sentence. No run of four short declaratives in a row. A long sentence earns its place by carrying a custom or a sequence of actions, never by chaining "and, X, and, Y" with commas around the conjunction.`

- [ ] **Step 3: Replace the worked example's "After" blockquote** with the galley quarrel exactly as in reference passage 3 (Task 1). Leave the "Before" block and the "Side with Mara" paragraph as they are.

- [ ] **Step 4: In "Checking a passage",** replace "Read it after a Hester passage. Does it sound like the same book?" with "Read it after the reference passages in `docs/voices/reference.md`. Does it sound like the same book?" and add a bullet before it: "Does the speech follow `docs/voices/dialogue.md`, and does each speaker sound like their card?"

- [ ] **Step 5: Verify.**
  Run: `grep -c 'Hester Vance and Tomas Achebe passages' docs/prose-style.md` Expected: `0`.
  Run: `grep -c '^6\. \*\*Vary the sentences' docs/prose-style.md` Expected: `1`.
  Run: `grep -c 'Did anyone hear me say it' docs/prose-style.md` Expected: `1`.
  Run the emoji check. Expected: exit 0.

- [ ] **Step 6: Commit** ("Replace the short-sentence rule with a variation rule and point the style guide at the reference passages").

**CHECKPOINT: stop here and ask the owner to review Tasks 1 and 2** (the spec's step 0). Do not start Task 3 until they approve or change them.

---

### Task 3: Narrator registers

**Files:**
- Create: `docs/voices/narrator.md`

**Interfaces:**
- Produces: four registers headed exactly `## plain`, `## dry`, `## tense`, `## quiet`. Task 4, 5 and 6 cite them by these names.

- [ ] **Step 1: Write `docs/voices/narrator.md`.** An intro paragraph (the base voice is `docs/prose-style.md`: Corey for the crew, Le Guin for the narrator; each register is a tuning of it; the dial is choosing one per scene or per beat). Then the four registers. Each has these fields as `Field: value` lines, in this order: `Sentence length:` (a range in words and a usual mean), `Build:` (coordination and subordination, openings other than subject-verb, fragments allowed or not, parallel structure), `Rhythm:` (how a passage opens, where it lengthens, how it ends), `Humor:`, `Custom:` (how much the narrator explains what is done and not done), `North star:` (one supplemental author from the spec with "take" and "leave"), then `Sample:` and the same moment retold in that register, 80 to 140 words.
  - The moment is the galley quarrel of reference passage 3; plain's sample is that passage itself.
  - Starting values, to be tuned against the samples: plain, 6 to 40 words, mean about 17; dry, 8 to 35, mean about 16; tense, 4 to 30, mean about 12, no run of more than three short sentences; quiet, 10 to 45, mean about 20.
  - North stars: plain, O'Brian; dry, Bujold; tense, none (Corey is primary); quiet, Ishiguro. Leckie is cited under `Custom:` in plain and quiet.
  - Every sample must show varied lengths and constructions and must follow rule 8 of `docs/prose-style.md` (no narrator opinion). A sample made of uniformly short sentences fails the register.

- [ ] **Step 2: Verify.**
  Run: `grep -c '^## ' docs/voices/narrator.md` Expected: `4`.
  Run: `for f in 'Sentence length:' 'Build:' 'Rhythm:' 'Humor:' 'Custom:' 'North star:' 'Sample:'; do echo "$f $(grep -c "^$f" docs/voices/narrator.md)"; done` Expected: each `4`.
  Run the emoji check. Expected: exit 0.

- [ ] **Step 3: Commit** ("Add the narrator registers").

---

### Task 4: Character cards for the captain and first officer

**Files:**
- Create: `docs/voices/hester.md`, `docs/voices/cato.md`

**Interfaces:**
- Consumes: `js/captains/hester.js`, `js/captains/cato.js` (read the `bio`, `wants`, `fears`, `traits`, `chatter`, `intro` and event text to find how they speak); `docs/voices/dialogue.md` rule numbers; `docs/voices/reference.md`.
- Produces: the card format used by Task 5: `## Source`, `## Diction`, `## Syntax in speech`, `## Habits`, `## Never says`, `## Steers toward`, `## North star` (optional), `## Sample lines`, `## Dialogue risks`.

- [ ] **Step 1: Write `docs/voices/hester.md`.** Source: link `js/captains/hester.js` and name the fields (`bio`, `wants`, `fears`, `traits`); do not copy them. Syntax in speech: flat declaratives built around a figure, fuller when she is working a sum aloud (passage 1). Never says: anything about feelings directly. North star: Leonard (take the sideways answers; leave the slang). Sample lines: 4 to 6 original lines, at least one over 20 words and one under 8, none copied from the game. Dialogue risks: the dialogue rules most likely to be broken for her (for example rule 6, speeches that explain), by number.

- [ ] **Step 2: Write `docs/voices/cato.md`** with the same sections. Source: `js/captains/cato.js`. He is the first officer who is generous with time where she is generous with nothing (comment in `js/captains/hester.js`); write his diction and syntax from his text in `cato.js`, and set them apart from Hester's so that with the tags hidden they cannot be swapped (dialogue rule 2).

- [ ] **Step 3: Verify.**
  Run: `for f in hester cato; do for h in Source Diction 'Syntax in speech' Habits 'Never says' 'Steers toward' 'Sample lines' 'Dialogue risks'; do grep -q "^## $h" docs/voices/$f.md || echo "$f missing $h"; done; awk '/^## Sample lines/{f=1;next} /^## /{f=0} f&&/^- /{n++} END{print FILENAME, n}' docs/voices/$f.md; done` Expected: no "missing" lines; each count between `4` and `6`.
  Run the emoji check. Expected: exit 0.

- [ ] **Step 4: Commit** ("Add the voice cards for Hester and Cato").

---

### Task 5: Cards for the pilot, the engineer and the gunner

**Files:**
- Create: `docs/voices/ines.md`, `docs/voices/tomas.md`, `docs/voices/gunner.md`

**Interfaces:**
- Consumes: Task 4's card format; `js/cast.js` (Ines Ferreira, ferry pilot, Lisbon Arcology, starts near line 17; Tomas Achebe, dockyard welder, Lagos Ring, starts near line 141); for the gunner, `js/signon.js` and the choice labels in `js/hiredevents.js`.

- [ ] **Step 1: Write `docs/voices/ines.md` and `docs/voices/tomas.md`** in the card format. Tomas's syntax in speech: runs on when he is talking to an engine (passage 2), plain with people. Ines: build her syntax from her authored scenes in `js/cast.js` and make it distinct from Tomas's and Hester's. Each: 4 to 6 original sample lines, one over 20 words and one under 8, except where the card states why a speaker never runs long.

- [ ] **Step 2: Write `docs/voices/gunner.md`.** This card covers the hired hand: the narration addressed to "you" and how the hand's choices are phrased as options, not speech the hand has been given. Source: `js/signon.js` and `js/hiredevents.js`. Replace `Sample lines` with `Sample choices` (4 to 6 original choice labels with their result lines), and replace `Never says` with `Never does`: the narrator never decides what the hand feels or thinks.

- [ ] **Step 3: Verify.**
  Run the Task 4 loop for `ines tomas` (and for `gunner`, with `Sample choices` in place of `Sample lines` and `Never does` in place of `Never says`). Expected: no "missing" lines; sample counts between `4` and `6`.
  Run the emoji check on all three. Expected: exit 0.

- [ ] **Step 4: Commit** ("Add the voice cards for Ines, Tomas and the gunner").

---

### Task 6: Writing workflow

**Files:**
- Create: `docs/writing-a-scene.md`

- [ ] **Step 1: Write `docs/writing-a-scene.md`,** one page, numbered steps: (1) pick the register in `docs/voices/narrator.md`; (2) read the card of each speaker in `docs/voices/`; (3) read the bible entries for the place, faction, trade and custom, and use the `Use in scenes` line of each; (4) write; (5) check against `docs/prose-style.md` "Checking a passage" and `docs/voices/dialogue.md`; (6) run `npm run prose -- --compare` and read the sentence-shape and tic lines for the files touched; (7) if a fact was invented, add it to `docs/world/` with `Status: proposed`. State at the top that the report only measures and never fails a build.

- [ ] **Step 2: Verify.**
  Run: `grep -c '^[1-7]\. ' docs/writing-a-scene.md` Expected: `7`.
  Run the emoji check. Expected: exit 0.

- [ ] **Step 3: Commit** ("Add the scene-writing workflow").

---

### Task 7: World bible, backgrounds and customs

**Files:**
- Create: `docs/world/backgrounds.md`, `docs/world/customs.md`

**Interfaces:**
- Produces the entry format used by Tasks 8 and 9: each entry is a `### <id>` heading, then `- Field: value` lines, ending with `- Use in scenes:` (one or two concrete details) and `- Status:` (`from code (<path>)` or `proposed`).
- Ids: `bg.earth`, `bg.mars`, `bg.belt`; `custom.<slug>`.
- Fields, backgrounds: `Source`, `Home`, `Family`, `Schooling`, `Why they left`. Fields, customs: `Where`, `Done`, `Not done`, `Why`.

- [ ] **Step 1: Write `docs/world/backgrounds.md`:** one entry for each key of `BACKGROUNDS` in `js/menu.js` (`earth`, `mars`, `belt`), Earth first. Quote the one-line `text` from the code in `Source` and cite the file. The Earth start is the one in play in the narrow build; write it with the most care. Where the code says nothing (family, schooling, why they left), write original text and mark the entry `Status: proposed`.

- [ ] **Step 2: Write `docs/world/customs.md`,** at least these entries: `custom.no-slamming-doors` (door closers, from `docs/prose-style.md`), `custom.water-ration`, `custom.galley-meal`, `custom.watch-change`, and `custom.ship-night` (lights to a third at 22:00 and back up at 06:00; boots ring on the deck; lower bunks a meter and a half below; from reference passage 4, `Status: proposed` until the owner confirms). At most 10 entries. Each states what is done, what is not, and why, and no one's feelings about it.

- [ ] **Step 3: Verify.**
  Run: `for f in docs/world/backgrounds.md docs/world/customs.md; do echo "$f $(grep -c '^### ' $f) $(grep -c '^- Use in scenes:' $f) $(grep -c '^- Status:' $f)"; done` Expected: the three numbers on each line are equal; backgrounds `3`, customs between `5` and `10`.
  Run: `grep -h '^### ' docs/world/*.md | sort | uniq -d` Expected: no output.
  Run the emoji check. Expected: exit 0.

- [ ] **Step 4: Commit** ("Add the world bible: backgrounds and customs").

---

### Task 8: World bible, places and factions

**Files:**
- Create: `docs/world/places.md`, `docs/world/factions.md`

**Interfaces:**
- Fields, places: `Source`, `Day there`, `Work`, `Sound and smell`, `Custom`. Fields, factions: `Source`, `Wants`, `Treats a hand`, `Shows up as`.

- [ ] **Step 1: Write `docs/world/places.md`** with exactly these eight entries: `place.earth`, `place.mars`, `place.ceres`, `place.jupiter` (with Ganymede and Europa described inside it), and the home arcologies `place.rotterdam-arcology` (Hester), `place.lisbon-arcology` (Ines), `place.lagos-ring` (Tomas), `place.chittagong-arcology` (Cato). Take the system facts (government, pirate level) from `SYSTEMS` in `js/data.js` and cite the file without copying numbers; take the homes from the `home` fields in `js/captains/*.js` and `js/cast.js`. More places are added when a scene needs them, not now.

- [ ] **Step 2: Write `docs/world/factions.md`** with one entry for each name in `FACTIONS` in `js/data.js` (`faction.earth-coalition`, `faction.mars-republic`, `faction.belt-collective`, `faction.pirate`). Take what the code and `js/ties.js` already say about how each treats a hand and a crew member with that affiliation; add texture marked `proposed`.

- [ ] **Step 3: Verify** with the Task 7 count command for both files. Expected: places `8 8 8`, factions `4 4 4`; no duplicate ids across `docs/world/*.md`; the emoji check exits 0.

- [ ] **Step 4: Commit** ("Add the world bible: places and factions").

---

### Task 9: World bible, trades and timeline

**Files:**
- Create: `docs/world/trades.md`, `docs/world/timeline.md`

**Interfaces:**
- Fields, trades: `Source`, `Post`, `Work`, `Jargon`, `Wage`. Fields, timeline: `When`, `What`, `Who remembers it`.

- [ ] **Step 1: Write `docs/world/trades.md`** with five entries: `trade.gunner`, `trade.pilot`, `trade.engineer`, `trade.first-officer`, `trade.ice-hand`. Take posts from `ROLE_NAMES` in `js/people.js` and wages from the code (cite `js/hired.js` or the file that holds them; do not copy a figure that may change). Jargon is original and marked `proposed`.

- [ ] **Step 2: Write `docs/world/timeline.md`** with 8 to 12 entries about what happened before the game starts, in years before day 1 of the game. Sources, in order: `README.md`, `docs/superpowers/specs/2026-10-02-hired-chapter-design.md`, and the intro text of `js/stories/cold-water.js`. Anything with no source is `Status: proposed`.

- [ ] **Step 3: Verify.** Counts: trades `5 5 5`; timeline between `8` and `12` for each of the three numbers; no duplicate ids across `docs/world/*.md`; the emoji check exits 0.
  Run: `grep -c 'Status: proposed' docs/world/*.md` and report the totals to the owner in the review message.

- [ ] **Step 4: Commit** ("Add the world bible: trades and timeline").

---

### Task 10: Tic report, the counting functions

**Files:**
- Create: `tools/prose-lint.js`
- Test: `tests/prose-lint.test.js`

**Interfaces:**
- Produces, all exported with `module.exports`:
  - `extractProse(src: string) -> string[]`: the contents of the string literals in a JavaScript source that have four or more whitespace-separated words, in order. Skips `//` and `/* */` comments. Handles `'`, `"` and template literals with escapes; unescapes `\n`, `\'`, `\"`, `\\`; replaces each `${...}` (including nested braces and nested templates) with `X`. A character scan, not a parser; a regex literal containing a quote is a known limit.
  - `TICS: { id: string, re: RegExp }[]` with ids `hedge` (`a little`, `a small`, `very slightly`), `nods` (`nods`), `andThen` (`and then,`), `asIf` (`as if`, `as though`), `forAWhile` (`for a while`), `longMoment` (`for a long moment`), `adverb` (`somehow`, `oddly`, `strangely`), `aside` (`which is worse`, `which is how`, `in a way that`, `a kind of`); all case-insensitive, word-bounded.
  - `countTics(text: string) -> Record<string, number>`: every id present, zero when absent.
  - `shape(strings: string[]) -> { count, mean, sd, shortShare, shortRuns }`: sentences per string (split after `.`, `!` or `?` plus any closing quote or bracket, then whitespace); words are `\S+` tokens; short is under 6 words; `sd` is the population standard deviation; `shortRuns` counts, per string, maximal runs of 4 or more consecutive short sentences, summed; `mean`, `sd` and `shortShare` rounded to two decimals; all zeros for no sentences.
  - `speech(strings: string[]) -> { quoted, reported }`: `quoted` counts `"..."` spans of two or more characters; `reported` counts `/\b(?:says|said|answers|answered|replies|replied|asks|asked|(?:tells|told) \w+) (?:that|if|whether)\b/gi`.

- [ ] **Step 1: Write the failing tests in `tests/prose-lint.test.js`** (header comment: what the file tests, plain Node, no browser, like `tests/changed-tests.test.js`):

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { extractProse, countTics, shape, speech } = require('../tools/prose-lint');

test('extractProse keeps prose strings and skips comments and short ids', () => {
  const src = [
    "// a comment with several words in it",
    "const a = 'short';",
    "const b = \"She said \\\"no\\\" to the offer today.\";",
    "const c = `Day ${n} at the port with the crew.`;",
    "/* a block comment with \"quoted words inside it\" */",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['She said "no" to the offer today.', 'Day X at the port with the crew.']);
});

test('extractProse is not fooled by // in a string, an apostrophe in a comment, or a nested template', () => {
  const src = [
    "// don't stop here",
    "const u = 'See http://example.org for the long list of ports.';",
    "const t = `Docked at ${port ? `the ${port}` : 'Ceres'} with the ice aboard.`;",
  ].join('\n');
  assert.deepEqual(extractProse(src), ['See http://example.org for the long list of ports.', 'Docked at X with the ice aboard.']);
});

test('countTics counts each pattern once per occurrence and reports zeros', () => {
  const text = 'He nods. She nods, and then, a little later, as if nothing had happened, it was somehow fine. For a while they sat. For a long moment nobody spoke, as though waiting.';
  assert.deepEqual(countTics(text), { hedge: 1, nods: 2, andThen: 1, asIf: 2, forAWhile: 1, longMoment: 1, adverb: 1, aside: 0 });
  assert.equal(countTics('It is, which is worse, a kind of mercy, in a way that nobody likes.').aside, 3);
});

test('shape measures sentence length, spread and runs of short sentences', () => {
  const r = shape(['One two three. Four five six seven eight nine ten eleven twelve.', 'A b. C d. E f. G h. I j k l m n o p.']);
  assert.deepEqual(r, { count: 7, mean: 4, sd: 2.88, shortShare: 0.71, shortRuns: 1 });
});

test('shape splits after a closing quote, and gives zeros for no text', () => {
  assert.equal(shape(['"Hold it," she says. "Hold it until she is inside two thousand."']).count, 2);
  assert.deepEqual(shape([]), { count: 0, mean: 0, sd: 0, shortShare: 0, shortRuns: 0 });
});

test('speech counts quoted spans and reported speech', () => {
  const r = speech(['"I said something," Mara says. She says that she did.', 'Ines asks if it is on. He told her that it was.']);
  assert.deepEqual(r, { quoted: 1, reported: 3 });
});
```

- [ ] **Step 2: Run to verify they fail.**
  Run: `node --test tests/prose-lint.test.js` Expected: FAIL, `Cannot find module '../tools/prose-lint'`.

- [ ] **Step 3: Implement the four functions and `TICS` in `tools/prose-lint.js`** (`'use strict'` and a header comment in the style of `tools/changed-tests.js`: what it does, how to run it, that it reports and never fails). `extractProse` is a single pass over characters with a state for each quote kind and for comments; for a template literal track brace depth after `${` and recurse for a nested template by running the same scan on the inner text. Export everything with `module.exports`.

- [ ] **Step 4: Run to verify they pass.**
  Run: `node --test tests/prose-lint.test.js` Expected: 6 passing.

- [ ] **Step 5: Commit** `tools/prose-lint.js` and `tests/prose-lint.test.js` ("Add the prose report's counting functions").

---

### Task 11: Tic report, the report, the baseline and the command

**Files:**
- Modify: `tools/prose-lint.js`, `tests/prose-lint.test.js`, `package.json` (scripts), `README.md` (the tools list near line 126), `ROADMAP.md` (item 8, the narrative layer)
- Create: `docs/prose-baseline.json` (generated)

**Interfaces:**
- Consumes: `extractProse`, `countTics`, `shape`, `speech`, `TICS` from Task 10.
- Produces, exported:
  - `lint(files: Record<string, string>) -> { files: Record<string, { strings: number, tics: Record<string, number>, shape: Shape, speech: Speech }>, total: { strings: number, tics: Record<string, number>, shape: Shape, speech: Speech } }`; the total's `shape` and `speech` are computed over all strings together, not averaged.
  - `report(result) -> string`: a `total` line, then one line per file with its strings, tic total, mean, sd, short share, runs, and quoted and reported counts.
  - `compare(base, now) -> string`: one line per difference in the totals, `<id>: <a> -> <b> (<+/-diff>)` for each tic and for `mean`, `shortShare`, `shortRuns`, `quoted` and `reported`; exactly `no change` when there is none.
  - `narrativeFiles(root: string) -> string[]`: repo-relative, sorted, existing files only: `js/stories/*.js`, `js/captains/*.js`, and `js/cast.js`, `js/castbar.js`, `js/people.js`, `js/peopletext.js`, `js/familytext.js`, `js/bartopics.js`, `js/hiredeventstext.js`, `js/social.js`, `js/family.js`.
  - `main(args: string[], { root, out }) -> number` (exit code): no args prints `report`; `--write` writes `docs/prose-baseline.json` under `root` and prints its path; `--compare` prints `compare` against that file, or, when the file is missing, prints a line containing `no baseline` and `--write` and returns `1`.
  - When run directly (`require.main === module`), calls `main` with `process.argv.slice(2)`, the repo root and `console.log`, and sets `process.exitCode`.

- [ ] **Step 1: Add the failing tests:**

```js
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { lint, report, compare, narrativeFiles, main } = require('../tools/prose-lint');

const tmp = files => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'prose-'));
  for (const [f, src] of Object.entries(files)) { fs.mkdirSync(path.dirname(path.join(root, f)), { recursive: true }); fs.writeFileSync(path.join(root, f), src); }
  return root;
};

test('lint totals the tics, strings and shape across files', () => {
  const r = lint({ 'a.js': "const x = 'He nods and sits down at the table.';", 'b.js': 'const y = "She nods and leaves the galley now.";' });
  assert.equal(r.total.tics.nods, 2);
  assert.equal(r.files['a.js'].strings, 1);
  assert.equal(r.total.shape.count, 2);
  for (const p of ['a.js', 'b.js', 'total']) assert.ok(report(r).includes(p));
});

test('compare names each difference, and says no change when there is none', () => {
  const base = lint({ 'a.js': "const x = 'He nods and she nods at the door.';" });
  const now = lint({ 'a.js': "const x = 'He nods and she waits at the door.';" });
  assert.ok(compare(base, now).includes('nods: 2 -> 1 (-1)'));
  assert.equal(compare(base, base), 'no change');
});

test('narrativeFiles lists the real narrative files and nothing from tests', () => {
  const root = path.resolve(__dirname, '..');
  const files = narrativeFiles(root);
  for (const f of ['js/cast.js', 'js/captains/hester.js', 'js/stories/aftermath.js']) assert.ok(files.includes(f), f);
  assert.ok(files.every(f => fs.existsSync(path.join(root, f)) && !f.startsWith('tests/')));
  assert.deepEqual(narrativeFiles(tmp({})), []);
});

test('main writes a baseline, compares to it, and explains when there is none', () => {
  const root = tmp({ 'js/cast.js': "const a = 'He nods and sits down at the table.';" });
  const lines = []; const out = s => lines.push(s);
  assert.equal(main(['--compare'], { root, out }), 1);
  assert.ok(lines.join('\n').includes('no baseline') && lines.join('\n').includes('--write'));
  assert.equal(main(['--write'], { root, out }), 0);
  assert.equal(JSON.parse(fs.readFileSync(path.join(root, 'docs/prose-baseline.json'), 'utf8')).total.strings, 1);
  lines.length = 0;
  assert.equal(main(['--compare'], { root, out }), 0);
  assert.equal(lines.join('\n'), 'no change');
  assert.equal(main([], { root: tmp({}), out }), 0);
});
```

- [ ] **Step 2: Run to verify they fail.**
  Run: `node --test tests/prose-lint.test.js` Expected: FAIL (`lint is not a function` or similar).

- [ ] **Step 3: Implement `lint`, `report`, `compare`, `narrativeFiles` and `main`, and the direct-run guard** per the Interfaces block. `main` reads each file in `narrativeFiles(root)` and passes the sources to `lint`.

- [ ] **Step 4: Run to verify they pass.**
  Run: `node --test tests/prose-lint.test.js` Expected: 10 passing.

- [ ] **Step 5: Add the command and the notes.** In `package.json` scripts add `"prose": "node tools/prose-lint.js"`. In `README.md`, after the `tools/soak.js` line, add one line for `tools/prose-lint.js` in the same style (what it does, `npm run prose`, `--write`, `--compare`; reports only and is not part of `npm test`). In `ROADMAP.md` item 8, after the mention of "the prose passes (#255, #136)", add: "which use the voice cards, the world bible and the prose report (`docs/superpowers/specs/2026-10-08-prose-and-world-design.md`)".

- [ ] **Step 6: Write the baseline and check it.**
  Run: `npm run prose -- --write` then `npm run prose -- --compare` Expected: the first prints the baseline path; the second prints `no change`.
  Run: `npm run prose` and read it. Expected: a `total` line and one line per narrative file, none throwing. Report the totals and the five highest files by tic count to the owner.

- [ ] **Step 7: Full suite, then commit and push.**
  Run: `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm test` Expected: all passing, including `tests/prose-lint.test.js`.
  Commit `tools/prose-lint.js`, `tests/prose-lint.test.js`, `package.json`, `README.md`, `ROADMAP.md` and `docs/prose-baseline.json` ("Add the prose report, its baseline and the npm run prose command"), then `git push -u origin claude/upbeat-cannon-8myhy5`.

---

## Self-Review Notes

- Spec coverage: voice registers with syntax (Task 3); cards (Tasks 4 and 5); north stars (Tasks 3 to 5); dialogue rules (Task 1); reference passages (Task 1); prose-style changes (Task 2); writing workflow (Task 6); bible (Tasks 7 to 9); tic report with tics, sentence shape and reported speech (Tasks 10 and 11); roadmap and README pointers (Task 11). The spec's order of work is the task order, with the step 0 checkpoint after Task 2.
- Not in this plan, by the spec: rewriting scenes, engine changes, runtime variants, a bible consistency test, and filing the umbrella issue (drafted for the owner's approval, to be filed separately).
