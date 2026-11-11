# Chatter that matches the ship, and the watch the scenes hand out

Issues: #987 (ship messages in the comms don't match what is happening on the ship) and #951 (the watch is not shown in the burn view). Approved in conversation on 2026-11-11. Chapter one, the hired gunner, Captain Hester's crew. Follow-ups split off: a rotating watch bill (#1034) and a screen in the galley (#1035).

## What it is for

A player who reads a comms line or a scene can look at the cutaway and see that it's true. Today the crew's chatter is drawn without regard to where anyone is: the comms says Tomas is swearing at a seized valve while the cutaway has him at the galley table. A scene can hand someone a watch, but the cutaway keeps the fixed night watch (the pilot and the engineer) and puts everyone else, the hand included, to bed.

Out of scope: a rotating watch bill (#1034), the length of the ship's day (#951's second half, which the burn's own pace, #992, already changed), a screen in the galley (#1035), and the parked captains and storylines.

## 1. Chatter by place (#987)

**Where each line happens.** A chatter list is either a plain list, whose lines happen anywhere, or lists grouped by room, the way the ship's own lines are (`LIFE_LINES`, `js/shiplife.js`): `{ any: [...], engine: [...], galley: [...] }`. The keys are the cutaway's room ids (`ROOMS`, `js/rooms.js`). The editor's line tables already flatten that shape by its keys (`linedText`), so a line's place is the group it is in, and its words stay editable as they are.

The lists this covers:
- a crew member's own lines (`chatter` on a cast entry, `js/cast.js`);
- the trait lines (`TRAITS[...].chatter`, `js/peopletext.js`);
- the captain's own lines (`chatter` on Hester's entry, `js/captains/hester.js`, read by `captainChatter`, `js/hired.js`).

The generic comms traffic (`CHATTER`, `lines:comms-chatter`: pickets, beacons, other ships) is radio, not a person, and stays a plain list. The lines other mods add through the `chatter` filter (`js/family.js`, `js/social.js`, `js/community.js`) stay as they are: none of them names a room in the ship.

**Picking a line.** When a line of chatter is due (three a burn, as now, `updateTransit`, `js/transit.js`), each person's lines are the ones that fit where the cutaway shows them at that moment: their room's group and the `any` group. A person asleep, or on the couches, contributes no lines. At the couches and the flip nobody is anywhere but strapped in, so only the generic traffic and the `any` lines of those awake can be said. Everything else is as today: the 60/40 split between the crew and the generic traffic, `pickFresh`, `Mods.filter('chatter', ...)`, the quiet setting.

**Where someone is.** The room comes from the burn's people (`shipPeople()`, `js/shiplife.js`), the same records the `[Ship]` lines read, matched by the person's id (`'you'` is never a speaker; the captain by role). A small pure function does the choosing, so it runs in Node:

`chatterAt(lines, room)` takes a chatter list (plain or grouped) and a room id, or `null` for asleep or strapped in, and returns the lines that may be said there: the whole list when it is plain and `room` is not null; the `any` group plus `lines[room]` when grouped; `[]` when `room` is null.

**The writing pass.** Every chapter-one chatter line that names or implies a place moves into that room's group: Tomas's seized valve to `engine`, Yelena arguing with the ring-ball feed to `galley`, Hester eating standing up at the galley counter to `galley`, her stop at the `{post}` station to the hand's post room. A line that names no place stays in `any`. A test lists the room words (galley, engine room, bunk, berth, bridge, helm, hold, medbay, the guns) and fails on a chapter-one line in `any`, or in a plain list, that contains one. A line that names a room without being in it (Cato's blanket "on the berth of whoever has the cold watch") goes on a short list in the test, by its words, with a comment saying why.

## 2. The watch a scene hands out (#951)

**A record for one night.** A scene can hand a watch to someone for one night of the current burn. It is kept on the burn, `G.transit.watch = { night, stands, post, relieved, relievedAt }`:
- `night`: the ship's day (`shipDay(elapsed).day`, `js/shiplife.js`) whose handover and night the record covers: tonight when the scene plays in the handover or the night, else the coming night.
- `stands`: who stands it, a person's id or `'you'`.
- `post`: the room they stand it in.
- `relieved`: who would have had it, an id, or `null` when the watch is an extra one.
- `relievedAt`: where the relieved person goes instead: `'bunk'`, or a room id (they sit at its table or post).

It is a field of the burn, not of `G` or the save: `G.transit` is the burn's own record and goes with it. A scene at a port, with no burn, records nothing.

**The effect.** One new scene effect, `standWatch: { stands, post, relieved, relievedAt }`, usable in a choice's `effects` and, from code, as `standWatch(t, day, stands, post, relieved, relievedAt)`, a pure function that takes the burn and the day and writes the record. Its runner fills `night` from the burn's elapsed time. It writes nothing else and adds no line to the scene.

**What the cutaway does.** In the handover and the night, `routineSpot` (`js/shiplife.js`) reads the record before the timetable when its `night` is the ship's day:
- the one standing the watch is at the post room (`{ room: post, at: 'post' }`), awake, and not counted asleep (`isAsleep`);
- the one relieved goes where `relievedAt` says: their bunk (`{ room: 'berths', at: 'bunk' }`), or the room named, at its table or seat;
- everyone else as the timetable says.

The record is dropped at the wake block of the next day. The ship's state ahead of the timetable keeps its precedence: someone hurt is in the medbay whatever the record says.

**The scenes.**
- Yelena, "The Final" (`yelena.mid2`, `js/cast.js`):
  - "Take her watch": `standWatch: { stands: 'you', post: 'gunnery', relieved: 'yelena', relievedAt: 'galley' }`. You stand her watch at the guns, and she is in the galley for the match, which the result text already has her in ("you hear the roar from the galley").
  - "It's your watch.": `standWatch: { stands: 'yelena', post: 'gunnery', relieved: null }`. She stands it at the guns; the hand goes to bed as on any night.
- Captain Vance's favour (`cap-favour`, Hester's entry, played from `js/captains.js`): "stand" calls `standWatch` with the hand standing the engineer's night watch in the engine room, and the engineer relieved to their bunk.
- Ines's intro ("You have the bridge watch when Ines comes up for the flip") needs nothing: at the flip the hand's couch is on the bridge already.

Ids: the cast's person ids are looked up by cast key (`castPerson`), and the post rooms are the ones the routine uses (`postOf`). The exact room ids for the guns and the engine come from `ROOMS` when the plan is written.

## Testing

- Node (`tests/nodecontext.js`): `chatterAt` on plain and grouped lists, with a room, with another room, and with `null`; `standWatch` writes tonight's or the coming night's day; `routineSpot` in the night with and without a record, for the one standing, the one relieved and someone else, and a hurt person with a record.
- Browser: chatter with a person moved between rooms draws only lines of their room or `any`, and none from someone asleep; each of the three choices leaves the record, and at night the cutaway has the person standing at the post and the relieved one where the record says; the record is gone at the next wake.
- The room-word test over the chapter-one chatter lists.
- Pins: the message pin (`tests/msgpin.test.js`) and the scene pin change only where chatter is drawn differently; the rewrite is read and its commit says so.

## Done when

On a burn, every comms line about a crew member or the captain describes something they could be doing where the cutaway shows them, and on the night a scene hands out a watch, the cutaway shows who stands it and where the relieved one went.
