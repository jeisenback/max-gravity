# Progression

Status: agreed with the owner in conversation on 2026-11-08; this page is the write-up, for review. Built on `shape.md`, `work.md`, `trade-and-law.md` and `later-chapters.md`. The first piece of code is `docs/superpowers/specs/2026-11-08-post-ladders-design.md`.

## What it is

How a hand grows over a run, from a rating on Hester's ship to whatever chapter 6 makes of them, without the rules underneath changing. Six layers, each earned a different way, all read by the one check rule (`js/sheet.js`): even odds at the base stat, a twentieth a point of stat, a tenth a level of skill, less the scene's difficulty, plus an edge. Nothing below adds a second rule; every layer adds a stat, a level, an edge or a move to that one.

Nothing on the sheet is bought with credits. That is the rule that stays. The older rule, that a stat moves only when a scene moves it, produced nothing in a month, because a scene that changes who you are for good is rare by nature; it is dropped. A scene may still move a stat when a writer wants it, as the exception.

## The six layers

1. **The sheet.** Four stats, who you are: hands, eye, nerve, wit. Set at the sign-on from the background and the post, 1 to 5. A stat point is one of the picks on a ladder (below), so the sheet moves slowly and by the player's choice. Cap 5 in the hand's chapters, 6 later.
2. **Skill lines.** The four posts are the first four lines (gunner on eye, pilot on nerve, engineer on hands, comms on wit). Each later chapter adds lines for the work it brings, and a line rises only by doing the work: **books** (the co-op's ledger, chapter 2), **prospecting** (sites, wrecks, survey), **organising** (the meeting, the votes, later the bloc), **command** (the bridge, from the master's licence, chapter 3), **smuggling** (customs, hidden holds, the outside path), **steward** (the outpost, chapter 5). Five levels each, spaced so chapter 1 reaches 2 at a post and chapter 6 can reach 5 in two or three lines. Nobody has every line high; the lines you did not work are the people you hire.
3. **Picks.** Each level in a line offers two or three, and you take one at the port on your own page. A pick is a **move** (once a fight or a scene), a **passive** (always on), or a **stat point**. Some picks have a gate besides the level, and the gates are the tree's cross-links: a teacher aboard who trusts you (the gunner's moves work this way already), a kit item, a fact in the record (you have held a boarding), or a level in another line. Holding a post also gives the ship that post's crew perk at your level, with no pick: a level 3 pilot hand shortens every burn.
4. **Traits.** Earned, never picked. The record keeps facts: clean hauls, boardings held, a shipmate lost, a lie to an auditor. A trait is what a run of facts makes you (Cool Head, Salvager, Marked): a small passive, and a change in how people and bodies read you. This is the layer that ties progression to the endings, which read the same record.
5. **Papers.** A master's licence, a registry endorsement, a rigging licence, a carrier licence (`work.md`, `luna.md`, `trade-and-law.md`). Gates on what you may hold: the bridge, a hull under a registry. Earned by examination, training debt and someone vouching; lost by a mark. Progression as a career in the world, not on the sheet.
6. **Standing.** With shippers, lenders, masters, freeholds, blocs (`trade-and-law.md`; shippers already keep it). From chapter 6 it is the currency of the alliances. Standing is spent, which no other layer is.

## How it reads by chapter

- **Chapter 1:** a post line to level 2, a pick or two, the first trait, the kit. The sheet page shows the post's ladder with the next pick visible, so a level is something you are heading for.
- **Chapter 2:** books, prospecting and organising open as you do them; a second post line if you swap; picks start to cross lines; papers matter for the first time (Ines's endorsement, the registry vote).
- **Chapter 3:** command or smuggling by the path; the licence as a chapter goal, with an examination that rolls on your lines; traits begin to open and close doors with the people of the war.
- **Chapters 4 to 6:** the lines you lack are the people you hire, and their sheets are the same shape as yours, so a hired master is read by the same rules; the organiser line and standing become the main game; a pick at level 5 is a thing one hand in the Belt can do.
- **Chapter 7:** nothing new is learned; what you built is tested.

## Where to hold the line

- One rule for every roll. Picks add edges and moves to it, never a second rule.
- No credits buy anything on the sheet. Lines rise by doing, picks are taken at a level, traits are earned, papers are a career, standing is a relationship.
- Few numbers on screen. A pick says what it does in a sentence; the odds show on the choice as they do now.
- Small tables, not systems: a line's picks are a short table a writer can read whole.

## Order of building

1. Layers 2 and 3 for the four posts, with the crew perks as the automatic passives and the gunner's three moves folded in as picks (`2026-11-08-post-ladders-design.md`).
2. Traits, read from a record of counts the hand keeps (`2026-11-10-traits-design.md`, built).
3. Each later line and the papers with the chapter that brings them; standing as the alliances' currency in chapter 6.

## Assumptions to confirm

- Six layers: sheet, lines, picks, traits, papers, standing; each earned differently and all read by the one check rule.
- The scene-only rule for stats is dropped; a stat point is a pick, and nothing on the sheet is bought with credits.
- Lines are five levels, the later ones spaced for the later chapters; new lines come with the chapters that need them and rise only by doing.
- A pick is one of two or three a level, taken at the port; gates (a teacher, the kit, the record, another line) are the cross-links.
- Holding a post gives the ship that post's crew perk at the hand's level, without a pick.
- Traits are earned from the record and never picked.
