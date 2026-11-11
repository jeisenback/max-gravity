# A rotating watch bill, the hand included

Issue: #1034, a follow-up to #951 (the watch a scene hands out, PR #1037, #1039). Approved in conversation on 2026-11-11. Chapter one, the hired gunner, Captain Hester's crew.

## What it is for

The ship keeps a watch the way a real one does. Different people stand it on different nights, the hand included, and everyone else sleeps. The bill can be read, and on the hand's own nights, what happens at night happens with them up at their post. Who decides is unchanged: the ship's business at night is still the captain's call. Only who is up, where, and how the night's scenes and contacts are staged change.

Out of scope: any cost of standing a watch (tiredness, opinion), the hand taking the captain's calls on their watch, a drawn watch bill prop (#936), and new night scenes written for the hand's watch.

## 1. The rota

**Two watches a night.** The bridge watch and the engine-room watch, the two places the night watch keeps today (`NIGHT_WATCH = ['pilot', 'engineer']`, `js/shiplife.js`).

**Who stands which.**
- The bridge watch rotates through the roles `['pilot', 'slicer', 'you', 'xo']`, in that order, one a night. `'you'` is the hand, whatever their post.
- The engine-room watch rotates through `['engineer', 'icehand']`.
- The captain is not on the rota.
- A role nobody aboard holds is skipped, and so is anyone hurt that night. The next one in the order stands it instead. When nobody can stand a watch, it is left empty.

**Which night.** The night's number is the game's day plus the ship's day into the burn: `G.state.day + shipDay(t.elapsed).day`, the same number the morning wash uses (`state.morning`). So the rota carries on across burns instead of restarting with each one.

**The rule.** `watchBill(roster, night)` is a pure function in `js/shiplife.js`. `roster` is the list of `{ id, role, hurt }` of the crew and the hand. It returns `{ bridge, engine }`, each an id or `null`:
- The bridge is the first able holder of the roles in the bridge order, starting at index `night % 4` and going round.
- The engine room is the same, over its order, starting at `night % 2`.
- Within one role, the first able holder in crew order stands it.

**Who is where.** In the handover and the night:
- tonight's bridge watch is at the bridge's post: `{ room: 'bridge', at: 'post' }`, in the helm seat when it is free;
- tonight's engine watch is at the engine room's post;
- everyone else turns in, the pilot and the engineer included, whenever they are not on the bill.

A scene's one-night watch (`G.transit.watch`, #951) replaces the rota's stander for its post on its night. Its stander goes to its post, the one it relieves goes where it says, and the rota's stander for that post turns in. The medbay comes first for the hurt, as it does now.

**What replaces `NIGHT_WATCH`.** The fixed list goes. Everything that reads it reads the bill through the ship's state instead: `routineSpot`, `isAsleep`, `nightHaunts`, `HEAD_SKIPS`, and the handover wait in `routineGo`. The ship's state (`shipState`) gains `bill: { bridge, engine }` for the current night, next to `watch`.

## 2. Seeing it and talking about it

- **The handover line.** When a burn's handover block begins, one line goes into the comms:
  - "The watch tonight: Mateo on the bridge, Hana in the engine room."
  - On the hand's night: "The watch tonight: you on the bridge, Tomas in the engine room."
  - When a scene has moved a watch, the line names who now stands it.
  
  The words are lines of the hired scenes (`scene:screens` or a new `scene:watch-bill` in `js/hiredscenes.js`), written to `docs/bible/voice.md`, flat and without announcing.
- **The Watch bill card.** On the hand's page (`js/character.js`), beside the Ladder and the Record, a card shows tonight and the next three nights: who has the bridge and who has the engine room, with the hand's nights marked. It is shown only on a burn. At port the next burn's nights depend on its length.
- **No new chatter.** The lines the crew already have ("the watch bill propped against the salt", Cato's "has taken the cold watch again") fit as they are.

## 3. The hand's nights

Who decides stays as today. Only the staging and the words change.

- **The night scenes follow the bill.**
  - "The Middle Watch" (`road-night-watch`, `js/stories/on-the-road.js`) plays when someone other than the hand has the bridge watch, and names them with the new text word `{watch:bridge}` in place of `{crew:pilot}`. Its condition is `onWatch: false` and a bridge watch that is not empty.
  - "The Number Two Pump" (`road-night-pump`) names the engine-room watch with `{watch:engine}`, and plays when someone has it.
  - "Bread" (`road-night-bread`) is the cook's, and stays as it is.
- **A new condition, `onWatch`** (`CONDITIONS`, `js/storylets.js`). It holds when the hand has tonight's watch, by the bill or by a scene's record, and the lights are down. The editor's condition table gets it.
- **A contact on the hand's watch.** A contact on a burn at night (`contactEvent`, `js/engage.js`) on the hand's watch opens its text with one line, "You have the watch when the board lights up." The line is a line of `scene:contact`.
- **Staging.** A scene staged at night on the hand's watch (`sceneStage`, `js/shiplife.js`) starts the hand from their post, not from their bunk.

## Testing

- **Node** (`tests/watch.test.js` or a new `tests/watchbill.test.js`):
  - `watchBill` over eight nights: the bridge cycles pilot, slicer, you, xo; the engine room cycles engineer, icehand.
  - A missing role and a hurt crew member are skipped.
  - With nobody able, the watch is `null`.
  - `routineSpot` at night with a bill, and with a bill and a scene's record: the record wins for its post, and the rota's stander turns in.
- **Browser:**
  - The handover line, on the hand's night and on another's.
  - The card on a burn, and not at port.
  - The cutaway at night with the hand on the bridge, and the pilot asleep in a bunk.
  - `onWatch`.
  - The three night scenes' conditions and words.
  - The contact's opening line on the hand's watch, and not on another's.
- **Pins and the editor:** the scene pin and the message pin move only where the night watch or the handover line differs. The editor's condition table and its tests include `onWatch`.

## Done when

On a burn, each night's watch is stood by the people the bill names, the hand among them in turn, and the rest are asleep. The bill can be read on the hand's page and is said at the handover. On the hand's nights, the night's scenes and contacts are staged with the hand up at their post.
