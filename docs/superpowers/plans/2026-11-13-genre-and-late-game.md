# What the game is, and how the later chapters play: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The project's documents describe the game as it plays (a narrative saga about work in space, with tactical ship fights) and draw the later chapters as the design says.

**Architecture:** Docs only. Three tasks, one per group of pages that change together: the openings, the two bible pages on the game's shape, the roadmap and the parked endings.

**Tech Stack:** Markdown.

**Spec:** `docs/superpowers/specs/2026-11-13-genre-and-late-game-design.md`

## Global Constraints

- No emojis anywhere.
- The bible's voice for any in-world wording (`docs/bible/voice.md`); plain, flat design prose elsewhere, as the pages already read.
- Not changed: the dated specs in `docs/superpowers/specs`, the chapters and their order, chapters 1 to 3, `owners.md`, any code, "only owners own".
- `shape.md` was approved: its status line gains "changed 2026-11-13 for the owner's review (genre and late game)". Other pages keep their status lines.
- *Escape Velocity* stays named as the game's origin, never as what it is.
- Neighbours named as in the spec: *Citizen Sleeper*, *Sunless Sea*, *FTL*, *King of Dragon Pass*. The word "roguelite" is not used.

## Review Focus

- A page left calling the game an *Escape Velocity* homage or a game about trading up to a better ship: `grep -rn -i "homage\|trade up to a better ship" --include=*.md . | grep -v superpowers` prints nothing.
- "A run is one life" left unqualified where the run's shape is stated: `grep -rn "one life" docs/bible/shape.md docs/design.md docs/bible/README.md` shows each with succession from chapter 4 beside it.
- The fleet, the place and the war written as the only endings: each page that lists them also says endings are many and open.
- Holdings written as always kept: `later-chapters.md` says what a path keeps stays, and that the sell path keeps less.
- The coarser step written as settled: it reads as an assumption to test.

---

### Task 1: The openings

**Files:**
- Modify: `README.md:1-4` (the first paragraph)
- Modify: `CLAUDE.md:3` (first line under the title)
- Modify: `docs/design.md` section 1 (line 9, pillar 1 at line 17, line 13), section 3 (Chapters), the systems row for heirs (line 79)
- Modify: `docs/bible/README.md:44` (index line for `shape.md`)

- [ ] **Step 1:** `README.md` opening: what the game is (a narrative saga: a hired hand on someone else's ship, scenes with the odds shown, turn-based fights, one long run with many endings), its neighbours, and that it grew from an homage to *Escape Velocity*. The paragraphs after it describe the full build and stay.
- [ ] **Step 2:** `CLAUDE.md` line 3: "A narrative saga about work in space, grown from an *Escape Velocity* homage, in vanilla JS and canvas." The rest of the line stays.
- [ ] **Step 3:** `docs/design.md`: section 1 as in Step 1; pillar 1 becomes "One life, and from chapter 4 the line after it, many endings"; section 3 gains a short paragraph on how the later chapters play (the ring, one pool, holdings a path keeps, the coarser step as an assumption to test, succession, the levers), pointing at `later-chapters.md`; the heirs row notes succession from chapter 4.
- [ ] **Step 4:** `docs/bible/README.md:44`: "a run is one life, and from chapter 4 the line after it".
- [ ] **Step 5: Verify:** the first Review Focus grep prints nothing; the second shows succession beside each hit in these files.
- [ ] **Step 6: Commit** `git add README.md CLAUDE.md docs/design.md docs/bible/README.md && git commit -m "Docs: say what the game is now"`

### Task 2: The game's shape

**Files:**
- Modify: `docs/bible/shape.md` (status line; What it is; A run; Endings; Assumptions to confirm)
- Modify: `docs/bible/later-chapters.md` (new section after "What this is"; Assumptions to confirm)

- [ ] **Step 1:** `shape.md`: status line as in Global Constraints. "A run is one life" becomes one life, and from chapter 4 the line after it: someone from the ring goes on at a cost, holdings kept, standing and regard cut; before chapter 4 a death ends the run. The thin legacy bullet says it is the trace between runs, waiting for the starts to open. Endings' goal list adds a fleet (most often a co-op's or a charter's; owning it outright the hardest end), a place run, and the war tipped, as some among many. Add the succession line to Assumptions to confirm.
- [ ] **Step 2:** `later-chapters.md`: a section "How the later chapters play" with the spec's six bullets in short (the ring, the calendar and the pool, holdings a path keeps with the sell path keeping less, the coarser step as an assumption to test with the drop into a day, succession, the levers), naming *King of Dragon Pass* as the model and saying what it lacks. The chapters below it stay. Add the coarser step and succession to Assumptions to confirm.
- [ ] **Step 3: Verify:** the last three Review Focus lines hold on these two pages, read by eye.
- [ ] **Step 4: Commit** `git add docs/bible/shape.md docs/bible/later-chapters.md && git commit -m "Bible: succession, holdings and the later step"`

### Task 3: The roadmap and the parked endings

**Files:**
- Modify: `ROADMAP.md` (the parked milestones: shipping company, 5 frontier and legacy, faction states)
- Modify: `docs/endings-parked.md` (first paragraph)

- [ ] **Step 1:** `ROADMAP.md`: each parked milestone gets one line naming the chapter that brings it back (`later-chapters.md`): the shipping company chapter 4, the frontier chapter 5, the faction states chapter 6 as the blocs' states, legacy as succession from chapter 4 plus the trace between runs once the starts open. Nothing marked done changes.
- [ ] **Step 2:** `endings-parked.md`: "These wait, whole, for the end of the last chapter" becomes: they wait for the game's endings, which can come in any chapter, and each reads the record of the run so far.
- [ ] **Step 3: Verify:** `CHROMIUM_PATH=$(ls /opt/pw-browsers/chromium_headless_shell-*/chrome-linux/headless_shell | tail -1) npm run test:changed -- --list` prints "run: nothing" (no test reads these pages).
- [ ] **Step 4: Commit and push** `git add ROADMAP.md docs/endings-parked.md && git commit -m "Roadmap: parked milestones by chapter" && git push -u origin ccr-9c1b3d04-tatkhn`
