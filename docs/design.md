# Max Gravity: the design

Status: draft for the owner's review, 2026-11-11. Written from a read of everything in `docs/` (the bible, the 30 specs, the plans' goals, `editor.md`, `pins.md`, `endings-parked.md`) and of `README.md`, `ROADMAP.md`, `COMBAT.md`, `js/build.js` and `js/role.js`.

This page is the one place that says what the game is, what is built, which document governs each part, where the documents disagree, and what still has to be written down before the next work can start. It does not repeat what the other documents hold. It points to them.

## 1. What the game is

A run is one life (`docs/bible/shape.md`). A hand signs on as a rating on someone else's ship in our own solar system, a century on, where only owners own and everyone else rents (`docs/bible/README.md`, the owner's decisions). The world opens chapter by chapter until it is a sandbox: the first chapter is mostly spine, and by the third or fourth the world is the game. A run ends when the life does or when it gets somewhere, and leaves a thin trace on the next run.

The game is role-playing first. "The captain decides and the crew flies" (`COMBAT.md`): people, what they think of you, and a ship you live in matter more than piloting or reflexes. Fights are turn-based puzzles with real risk. The writing is plain, and it states the economics flatly without comment (`docs/bible/voice.md`). The burn view shows a clean frame around a worn, cramped ship (`docs/bible/look.md`).

It is an homage to *Escape Velocity*: a static site in vanilla JS and canvas, with no build step, played with a mouse and keyboard on a desktop at least 1000px wide (#937).

### Pillars

1. **One life, many endings.** Plot endings (an arc seen through) and goal endings (somewhere the player chose to get). Each reads the run's record.
2. **The world runs without you.** Owners' rivalries, shortages, a war. The player can take part, steer between them, or go outside.
3. **People with stakes.** Named people with families, debts and wants, who remember. Casualties are real.
4. **One rule for every check** (`js/sheet.js`). Everything on the sheet adds a stat, a level, an edge or a move to that one rule.
5. **The ship is the interface and the home.** Navigation is by its rooms, and the burn view is a lived-in cutaway.
6. **Measured before kept.** Pins guard words. The soak's distributions guard outcomes. Each system rolls its own dice.

### The current focus

The shipped build is narrow (`BUILD.scope` `'earth-hired'`, `js/build.js`). It has a gunner, an Earth start, Ines and Tomas, and Hester's ship with Cato as bosun. `SCOPE_OFF` turns off other starts, errands, bar work, storylines, the owner game, community, other posts and other captains. Nothing is deleted, and `?scope=full` plays the rest. The owner game is parked: new code is written for the hand, and what the player may trade, decide or pay for is asked of `role()` (`js/role.js`: `hand`, `coop`, `owner`).

## 2. Which document governs what

Where the code and a document disagree, the code wins and the document is amended (the owner, 2026-11-11; it replaces the rule of 2026-10-31 that the game changes to fit the bible). Where two documents disagree, the one higher in this list wins.

1. **The bible** (`docs/bible/`): the world, the people, the shape of the game, the voice and the look. Pages marked approved are settled. `later-chapters.md` and `progression.md` are still drafts for review.
2. **The specs** (`docs/superpowers/specs/`): how a system was built. A spec's own status line and `ROADMAP.md` say whether it is built. No new specs are written (the owner, 2026-11-11); new design goes into the bible.
3. **`COMBAT.md`**: the fights' rules and measured targets.
4. **`ROADMAP.md`**: order and status. It is the build log, not a design.
5. **`README.md`**: the player-facing description. Much of it describes the full build under the old world (section 5).

The tool documents (`docs/editor.md`, `docs/pins.md`) govern their tools only.

## 3. Chapters

| Chapter | Where the player stands | Governing doc | Status |
|---|---|---|---|
| 1, the hand | a rating on Hester's ship, saving for a member's share | `chapter-1.md`, `shape.md`, `work.md`, `ship.md`; specs `hired-chapter`, `coop-share` | Built and tuned (about 160 days to the share, `ROADMAP.md`). Not built: the three places where the hand reaches the world (`chapter-1.md`). |
| 2, the co-op | a member of the Ceres co-op and the Ore Runner's captain, under the members' vote | `chapter-2.md`, `ceres-coop.md`, `the-fuel-war.md`; spec `chapter-two-start` | Piece 1 of 6 built (the start, the co-op's role), with the hand as captain on the registry's endorsement and the masters in the war (#1045). Pieces 2 to 6 are not built: the work and the law, the meeting, the books and the share, the squeeze, the last vote. |
| 3 | organiser, master or outside, set by chapter 2's last vote | `shape.md`, `the-fuel-war.md` | Paths sketched. No chapter page. |
| 4 to 7 | more hulls, a place, alliances, a threat | `later-chapters.md` (draft) | Draft. The chapter 7 threat is not chosen. |

## 4. Systems

Status key: **built** means in the narrow build, **full** means full build only, **parked** means kept in code but off, **designed** means a spec exists but the work is not built, **note** means a roadmap line with no design.

| System | Status | Code | Governing doc |
|---|---|---|---|
| Travel, orbits and windows | built | `orbits.js`, `transit.js` | README; ROADMAP 1 (windows "started") |
| Burn view: tower cutaway, camera, routine, staged scenes, ship state, burn speed | built | `shiplife.js`, `layouts.js`, `rooms.js`, `camera.js`, `figures.js`, `burnlayout.js`, `burnspeed.js` | `look.md`; specs `living-ship`, `burn-screen-layout`, `tower-ship`, `scenes-staged`, `working-routine`, `ship-state`, `burn-speed` |
| Room box in perspective | built, steps 1 and 2 of the spec | `rooms.js` | `look.md`; spec `room-box` |
| Ship interface (rail, pages, view helpers) | built | `shell.js`, `views.js`, `a11y.js` | spec `ship-interface` (its phone and tablet step is superseded by #937) |
| Painted world | built apart from images | `art.js` | spec `painted-world` |
| Contracts and shippers | built; step 6 (shippers as people) half built | `contracts.js`, `shippers.js` | spec `contracts` |
| Market and exchange | built engine; the hand does not trade; the co-op does | `market.js`, `world.js` | README |
| Port inspections | built | `inspection.js` | `trade-and-law.md`; spec `port-inspection` |
| Ship fight | built | `fight.js`, `fightui.js`, `board.js`, `fightladder.js` | `COMBAT.md`; specs `turn-combat`, `ship-fight-rework`, `gunner-moves` |
| Deck fight | built | `fight.js`, `boarders.js`, `handtohand.js` | `COMBAT.md`; spec `deck-fight-rework` |
| Card duel | parked (owner) | `duel.js` | `COMBAT.md` |
| Sheet and check rule | built | `sheet.js`, `character.js` | `progression.md` layer 1; spec `next-chapters` |
| Post ladders and picks | built | `picks.js`, `moves.js` | `progression.md` layers 2-3; spec `post-ladders` |
| Traits and the record | built | `traits.js` | `progression.md` layer 4; spec `traits` |
| Papers and standing | designed in the bible only | | `progression.md` layers 5-6; `trade-and-law.md` |
| Crew, people, opinion, bonds, origins | built (origins for Earth and Ceres only) | `people.js`, `crew.js`, `family.js`, `social.js` | `people/`, place pages; spec `crew-origins`, `crew-structure` |
| Life, loss and the memorial | built | `fate.js`, `losses.js` | specs `life-and-loss`, `death-and-departure` |
| Hired-chapter spine (captains, cast scenes, stakes, the close) | built | `hired.js`, `captains/`, `cast.js`, `stakes.js` | spec `hired-chapter` |
| Sites and the ice run | built, step 1 of exploration | `sites.js`, `icerun.js` | spec `sites-and-ice-run`; ROADMAP 7 |
| Wrecks, salvage, leads, scans | designed (ROADMAP only) | | ROADMAP 7 |
| Bar, regulars, the dock official | built | `bar.js`, `barroom.js`, `regulars.js`, `official.js` | ROADMAP 7 |
| Mission arcs (League water, Concord audit, Compact licence) | built | `arcs.js`, `stories/arc-*` | spec `next-chapters` |
| Factions and ties | built, to be replaced (conflict 9) | `factions.js`, `ties.js` | `jurisdictions.md` (replacement undesigned) |
| Storylines (Cold Water and four more) | full | `story.js`, `storylets.js` | README |
| Shipping company, stakes, outposts, heirs | full | `company.js`, `outpost.js`, `legacy.js` | README; `later-chapters.md` maps them to chapters 4-5 |
| Ship customization | note | | ROADMAP 7 |
| Player industry, fleet combat | note ("no design yet") | | ROADMAP 7; `later-chapters.md` |
| Scene editor and override layer | built | `editor.js`, `overrides.js` | `docs/editor.md` |
| Saves, menus, offline | built | `menu.js`, `sw.js` | README |
| Mods and community | API in both builds; features full | `mods.js`, `community.js` | README |
| Tests, pins, soak, coverage | built | `tests/`, `tools/` | `CLAUDE.md`, `docs/pins.md` |

## 5. Where the documents disagree

Each item says which document is right by the order in section 2, and what changes.

1. **Hester's ship.** Resolved (2026-11-11, the code wins): she is the Ice Hauler, a tower over her water tank, and the ice runs stand. `ship.md`, the bible README's decision 11 and its conflict 4 are amended.
2. **Chapter two in code.** The 2026-10-17 spec `chapter-two-design` built an owner's chapter two (`ROLES.owner`, `ownerboard.js`, `chaptertwo.js`, a close at 90 days). The bible's `chapter-2.md` and the 2026-11-07 spec replace it with the co-op. Both paths are in `js/role.js`. The 10-17 spec should say it is superseded. Piece 6 of the co-op chapter replaces `chaptertwo.js`'s close. The co-op chapter is amended in turn (2026-11-11): the hand is the co-op's captain on a registry's endorsement, and the four masters are met in the war. `chapter-2.md` and the people sheets say so; the code change is described in `2026-11-11-hand-captain-design.md`, the last spec, written before the owner chose documents over specs.
3. **The old three powers.** The bible retires the Arcology Compact, the Dome Concord and the Charter League as powers (`jurisdictions.md`, conflict 9), and the owner decided (2026-11-11) that the game needs new ones, so the code does not win here. `owners.md` (draft) has them in two layers: a bloc for each region's law where the code's powers sat, and the owners inside them. The code has the blocs' names since #1043 (step 1); the world's wars between powers, the powers' standing by name and the war are steps 2 to 4.
4. **Stale framing of the later chapters.** `docs/endings-parked.md` and `ROADMAP.md` line 106 say chapter two is the owner's career, chapter three building a company and chapter four outposts. `shape.md` and `later-chapters.md` say otherwise. The chapter one close they name, "Your Own Ship", is now "A Member's Share" (spec `coop-share`).
5. **`README.md`** still offers Earth, Mars or Belt starts on New Game (narrow: Earth only). It describes factions, Cold Water and the shipping company as the game. It has an empty "Roadmap" heading. It needs a pass that leads with the narrow build and marks the rest as the full build.
6. **`COMBAT.md`** describes Hardcore mode, which `ROADMAP.md` marks not planned. Its opening says "the rest isn't yet", which is out of date.
7. **`ROADMAP.md`** has two Ports bullets that disagree on #670 and #675. Contracts step 6 is marked not started in one place and done in another.
8. **Small bible fixes.** (`look.md` rule 1's hull width is fixed to 720.) `shape.md` says chapter two's page is "to come" (it exists). The bible README says the people sheets are drafts (all twelve are marked approved). `chapter-2.md` still names Olympus and Valles domes, which `mars.md` does not have.
9. **Specs left at "draft"** that are built: `life-and-loss`, `crew-structure`, `coop-share`, `crew-origins`. `prose-and-world` is superseded by the bible (#869) and should say so.

Items 4 to 9 were fixed on 2026-11-11: the stale lines in `README.md`, `COMBAT.md`, `ROADMAP.md`, `endings-parked.md`, `shape.md` and the bible's README, the Mars domes in `chapter-2.md`, and the specs' status lines. Item 3 waits on the owner's review of `owners.md`.

## 6. What needs writing down

The rule here is the repo's rule: write what the next work needs, nothing extra. Each item names the work it unblocks. The first three block chapter two's remaining pieces. The rest can wait for the work that needs them.

### Needed before chapter two goes on

1. **The powers (`docs/bible/owners.md`), drafted 2026-11-11 for review.** Two layers: the blocs (the Arcology Pact, the Dome Pact, the Guild Federation) as each region's law, and the powers inside them in two tiers: nine major powers (four in play from chapter 2, five coming in with chapters 2 and 3) and the minor powers the bible already has, with the blocs of chapter 6 to come and one entry shape for adding more. It also sets how far the player reaches, a ring of powers a chapter. It lists what the code changes, in order, and unblocks chapter two pieces 2 and 5, and standing as a currency (`progression.md` layer 6).
2. **The hand as captain, built** (#1045). `role().captain` says who holds the bridge, which pieces 2 to 6 read.
3. **Chapter two's pieces in the bible.** No more specs are written (the owner, 2026-11-11): a piece's design goes into the bible's pages, and the code follows them. `chapter-2.md` has the outline. The meeting and the vote (piece 3) is the one new kind of system, and its rule (who votes how, and what moves a member) is stated once, in `chapter-2.md` or a page of its own, so pieces 5 and 6 read it rather than restate it.

4. **Chapter one's reach, built** (`chapter-1.md`, What the game changes to fit): the marks on the League and Concord arcs, the strike for the hand, the record, and the soak. It can go before or beside the hand as captain, since it touches only chapter one.

### Worth a page when the work comes

5. **A rules reference (`docs/rules.md`).** The numbers that the specs and `ROADMAP.md` hold, gathered as tables and not systems: the check rule and its terms, `SKILL_STEPS`, the pay and deductions, the share figures, the fines and duty, and the soak's target bands with where each is tested. It is not a second source of truth. It names the constant and its file, so a writer or a reviewer can read the game's arithmetic in one place. Write it when chapter two's books (piece 4) start, because that is where the hand's money and the co-op's money first have to be read side by side.
6. **The record and the endings.** `shape.md` says endings read the run's record. `traits.js` keeps counts, `fate.js` keeps the memorial, the captain flags keep the rest, and four endings wait in `endings-parked.md`. A short page should say what the record holds and which endings read it. Write it with chapter two's last vote (piece 6), the first ending since chapter one's close.
7. **The interface's look.** `look.md` covers the burn view only and says the interface, the ports and the portraits come later. Write it when a port or page pass is next. Until then the specs `ship-interface` and `painted-world` stand.
8. **The bible's own "still to write"**: everyday life, history before day 1, start backgrounds, customs aboard, the posts aboard. These feed writing, not systems. Write each when the scenes that need it are written. The posts aboard can be short, because `progression.md` and `js/picks.js` already hold the ladders.

### Not needed now

These are a save-format page, a standalone storylet schema guide, ship-customization and fleet-combat designs, and the chapter 7 threat. The save shape is defined by the literal in `js/game.js` and the migrations in `menu.js`. The storylet schema is `CONDITIONS` and `EFFECTS` in `js/storylets.js`, which the editor reads. The rest belong to chapters that are drafts.

## 7. Decisions for the owner

1. Read the amended `chapter-2.md` and the masters' sheets, or say what changes.
2. Approve `progression.md` and `later-chapters.md`, or say what changes. Both are built on, and both are still drafts.
3. Read `owners.md`: the two layers, the names, the major and minor powers, and the player's reach by chapter.

## Assumptions to confirm

- The authority order in section 2: the code, then the bible, the specs, `COMBAT.md`, `ROADMAP.md` and `README.md`.
- This page stays an index and points to other documents. It is updated when a chapter or a governing document changes, not with every PR.
- The three items in section 6 under "needed before chapter two goes on" are the next documentation work, in that order.
