# Parts: Repairs and the Hand's Own Station

Status: proposed to the owner on 2026-11-13. The first step before wrecks and salvage (#965), which will hand out parts, and the prospecting line (#1003), which rises with that work. The order agreed: parts, then #965, then #966 (the scan), then #1003.

## Why

A ship in this game wears: the drive, fire control, shields, life support and sensors each have a condition that falls with use and can break down on a burn (`js/wear.js`). But nothing is ever fitted. In chapter 1 Hester's ship is kept up only by the engineer's service order in flight, the breakdown scene and the bench; an owner or the co-op pays a flat yard price to put a system back to 100. And the hand has nothing of their own on the ship to spend their savings on but the share.

The technology bible already says how ships are kept running: "Parts are made new at the big yards, printed from licensed files on the ship's fabricator, or taken off ships being broken up. A printed part that isn't rated for its job is logged as temporary." Wrecks (#965) are meant to hand out parts marked by where they have been. So parts come first, and start in chapter 1, where the hand learns what a part is worth before they ever cut one off a dead ship.

## What it is

A **part** is a physical thing with a **source** and, if used, a **history**. It either repairs one of the ship's systems or improves the hand's own station.

- **Repairs are the ship's.** When a system is worn, the ship needs a part. In chapter 1 Hester pays from the ship's fund and decides; the hand's part is the work and the judgment: knowing the used part is half the price, warning that a printed one won't hold, helping the engineer fit it. A good call earns the captain's regard.
- **Enhancements to the hand's own station are the hand's.** The hand buys parts for their post's station from their own savings and fits them with the captain's leave. They are the hand's, like the kit, and go with them into the co-op. Every credit spent is a credit not saved toward the share.

## Goals

- A repair is a choice with a cost, a risk and a story, not a flat price.
- The hand has something of their own to buy and keep, with a real trade against the share.
- A used part's history changes how it plays (one quirk, a plus and a minus) and says where it came from in a line.
- The machinery is ready for wrecks: a part cut off a wreck is another used part with another history.

## Non-goals

- A parts inventory, a locker or a fitting screen (Starsector's refit screen). One fitted part per system; the hand's station has a few slots.
- Parts for the hull's outfits (armor plating, the turret, the tank): those stay the outfitter's, as they are.
- Wrecks, salvage or towing (#965), and the co-op's customization of the Ore Runner beyond what this gives.
- Station parts for posts other than the guns while the shipped build fixes the post (`scopeOff('posts')`); the table is by post, so the others are data to add.

## Anti-goals

- A shopping chore: the repair choice comes to the player at most once a port stay, and only when a system needs it.
- A part that is strictly best: a yard part costs most, a printed one fails sooner, a used one has a catch.
- Chapter 1's pay broken: the fund's spending must not take the captain's pay day or the hand's savings rate out of the band the soak holds (ROADMAP: about 160 days to the share).

## Approaches

Three were weighed (2026-11-13):

- **A. One part per system, on the wear system (chosen).** Each system has one fitted part on record; a repair is a scene in port that offers a yard, a used and a printed part; the fitted part sets how fast the system wears and adds its quirk. The hand's station parts are a short list like the kit, bought at a parts counter in port. It reuses the wear, the scenes, the kit's pattern and the check rule, and grows into wrecks as one more source.
- **B. A full parts inventory**: a locker, several slots per system, a fitting screen. The most flexible, and a large new screen and system; more than chapter 1 needs, where the hand does not own the ship. Left for chapter 2's customization if it wants it.
- **C. Outfits with a source tag**: yard, used and printed versions of each outfit, repair a flat price scaled by source. The smallest, but repair stays a price, not a choice, and the outfitter is the owner's screen, which the hand cannot use in chapter 1.

The owner picked A.

## Decisions

### Parts and their sources (`js/parts.js`, new; loaded after `wear.js`)

- `PART_SOURCES`: three sources, each with a price as a share of the system's yard price, how much condition it restores, and how fast it wears after:
  - **yard**: new and rated. Restores to 100; wears at the normal rate. Full price.
  - **used**: off a ship broken up (later, off a wreck). Restores to 90; wears at the normal rate; carries one quirk. About 45% of the yard price.
  - **printed**: from the fabricator, logged as temporary. Restores to 85; wears at 1.75 times the rate. About 20% of the yard price.
- A system's yard price is today's `overhaulCost` at a full repair: 80 cr a point, 8,000 for a system from nothing (unchanged), so an owner's or the co-op's yard overhaul costs what it does now.
- **The fitted parts** are kept on the save as `st.parts`, by system: `{ drive: { source, quirk, day }, ... }`. A system with no entry has its original part: a yard part with no quirk (so no save changes shape, and a ship that was never repaired wears as it does today). `st.parts` belongs to the ship: it is cleared with `st.condition` when the ship changes (`signOn`, the buy).
- **Wear** (`wear()` in `js/wear.js`) multiplies the amount by the fitted part's rate (`partWear(st, part)`: 1, or 1.75 for printed, times a quirk's own factor). `perf` and the breakdown line read the condition as now.

### Quirks (`js/parts.js`)

- `PART_QUIRKS`: a table of used parts' histories. Each has a `system` it fits, a `from` line (where it came from, in the voice: "a feed off a Compact patrol cutter"), and one effect with a plus and a minus, drawn from a small set of effect kinds the wear and the fight already read:
  - wear rate (slower or faster), for one system;
  - the system's performance (`perf`) a step up or a step down at a band of condition;
  - a fight number the system gives (for fire control, the guns' rate or damage, `dmgMult`; for shields, their recharge), small;
  - a check's edge for the post that works the system (`post`, the kit's kinds), small.
- About three quirks a system to start, fifteen in all, written to `docs/bible/voice.md`; the builder writes them and the owner reads them with the PR. A used part offered at a port draws its quirk from that system's list by the day and the port, with no draw of the game's dice (`hash`, as the sites are seeded), so a port offers the same used part for the length of a stay.
- A quirk's minus is never a breakdown by itself; it is a cost the player can see in the offer's words.

### The repair in port (chapter 1: Hester's call)

- **When.** On landing at a port with an outfitter (the yards, the Boneyard, the bigger ports), the worst system under the repair line (`REPAIR_BELOW`, 60, the band where `perf` starts to fall) is put up for repair, once a stay, as a scene through the happenings picker as the breakdown scene is (`partsEvent(part)`), when the fund can pay for at least the printed part. At a port with no outfitter, nothing.
- **The scene.** The engineer (or Cato when there is none, as the bosun covers, #1093) lays out the three: the yard part and its price, the used part with its history and quirk in a line, the printed part and that it is temporary. The text says what the fund holds. Hester decides by her captain's card (`thrift` weighs the price, `nerve` the risk), as the captain's calls are made today (`hiredCall`); the hand's choices are the post's words:
  - **say nothing**: the captain's pick stands;
  - **argue for one** (each of the three that differs from hers): a `word` check (`check`, `DIFFICULTY.word`, the hand's sheet and skill); on a pass the captain takes it, on a fail her pick stands, and either way she remembers the hand's say (`like`, a memory of the part).
  - **Regard**: when the part the hand argued for turns out well (no breakdown of that system before its next repair, or the quirk's plus used in a fight) the captain's regard rises a little at the next repair; when it fails early, it falls a little. Kept small (one point), so it colours the captain without moving chapter 1's ending.
- **Paying.** The fund pays (`h.fund`, `h.bill`, as the torpedoes are bought: `js/hired.js`). The log says what was fitted and what it cost.
- **The hand helps fit it.** If the hand's post works the system (the guns and fire control for the gunner), the fitting is a `post` check; on a pass the part goes in at two points more condition, on a fail nothing worse. Otherwise no roll.

### The owner and the co-op

- The Engineering station's yard overhaul (`wearHtml`, the `overhaul` action) offers the three sources where it offers one price now: yard at today's price, used (its quirk named) and printed. The player picks and pays from `st.credits`. Same parts, same table; no scene, since the player is the one who decides (`role().decides`). A gate at the edge: the scene is the hand's (`if (!hired() || chapterOf(st) > 1)` the scene does not fire), the station's buttons are the payer's (`role().mayAct('overhaul')`, as now).

### The hand's own station (`js/parts.js`, `js/sheet.js`)

- `STATION_PARTS`: the parts a hand may fit to their post's station, by post. For the gunner (the shipped build's one post), four to start, for example:
  - a **gunsight** off a patrol boat: `post` checks +5%;
  - a **rebuilt feed**: the guns' rate of fire a step up, fire control wears a little faster;
  - a **cooled barrel liner**: the guns' damage a step up in a long fight;
  - a **harness and grips**: the gunner's checks at the flip and in a hard burn +5%.
  Each has a price (2,000 to 6,000 cr, against a share of about 93,000: one is a choice, all four a real dent), a source (yard or used; a used station part has its quirk), and what it adds, in the kit's terms (`adds` by check kind) or as a fight number the gunnery already reads.
- **Slots**: two. A third part replaces one (the old one is sold back for a third of its price).
- **Kept on the hand's record**: `h.station`, a list of `{ id, source, quirk }`, carried by `careerOf` into chapter 2 with the kit (`js/sheet.js`), so the co-op's hand has them on the Ore Runner's guns.
- **Fitting needs the captain's leave**: the first time, a short word with the captain (her card decides; a captain who trusts the hand, regard 1 or more, says yes). Refused, the part stays in the hand's kit bag and can be fitted after the next voyage.
- **Bought** at a parts counter on the Port page of a port with an outfitter, under the hand's own purse (`role().purse`: "your own savings"), built on the view helpers (`js/views.js`). Used station parts are sold at the Boneyard and the yards; yard ones at the yards.

### Where parts are sold

- Ports with `outfitter` in their services sell yard and printed parts; the Boneyard (Hygiea) and Phobos Yards sell used ones too, the Boneyard the cheapest. The repair scene offers a used part only where one is sold; elsewhere it offers yard and printed.

## Testing

- `tests/parts.test.js` (node, `tests/nodecontext.js`): a system's wear with a printed part is 1.75 times; a system with no fitted part wears as now; a used part's quirk is drawn the same for a port and a day and differs between ports; the prices are the shares of the yard price; `st.parts` is cleared with the ship.
- `tests/partsscene.test.js` (browser): landing at a port with an outfitter with a system under 60 offers the repair scene once a stay; the captain's pick follows her card; arguing passes and fails by the check; the fund pays and the log says what was fitted; no scene at a port with no outfitter, none in chapter 2 or for an owner.
- The owner's and the co-op's overhaul buttons: three sources, yard at today's price (the existing wear tests hold).
- `STATION_PARTS`: buying spends the hand's savings, two slots, a third replaces; the part adds what it says to a check and a fight number; it carries into chapter 2 (`careerOf`).
- Golden copies (`tests/fixtures`) for the Port page's parts counter and the Engineering station's overhaul.
- `tests/gfields.test.js`, `tests/globals.test.js`: the new file linked; nothing new on `G`.
- `npm run soak`: the chapter's days to the share and the captain's pay, since the fund now spends on parts and the hand on station parts; and the fights' targets (`tests/distribution/fights.test.js`), since station parts and quirks move fight numbers.
- `npm run coverage -- --check`: `js/parts.js` added to the floor once tested.

## What is left to the builder

- The quirks' and station parts' words and exact numbers, within the bounds above; the owner reads them with the PR.
- The scene's words (`scene:parts` lines, as `scene:trouble`), in the voice.
- Where on the Port page the parts counter sits, and its look, on the helpers.

## Assumptions to confirm

- Sixty is the repair line and once a stay is the pace; a port with an outfitter is where repairs happen.
- The fund pays repairs in chapter 1, as it pays torpedoes; the soak will say whether the fund holds.
- Two station slots, four gunner parts to start, priced 2,000 to 6,000.
- A used part restores to 90, a printed one to 85 and wears at 1.75 times.
