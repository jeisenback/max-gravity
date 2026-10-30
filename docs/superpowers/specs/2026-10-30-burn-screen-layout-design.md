# The burn screen's layout: the ship as the stage

Status: approved in conversation by the owner (2026-10-30), for the owner's review as written. Sub-project 2 of the burn view
redesign. It follows the living ship (docs/superpowers/specs/2026-10-30-living-ship-design.md, PR #864), which put a camera on a
lived-in cutaway but left it in the old screen box.

## Why

After #864 the cutaway still sits in a box of about 560 by 235 px at 1280x800, between Comms, the route plate, the BURN panel and the
ship's log. The crew draw about 58 px tall and the room stencils fall under the 12 px floor, so they are not drawn.

## The owner's choices (2026-10-30)

- **Layout A, the ship is the stage**: the cutaway runs the view's width and takes most of its height. The route and the burn readings
  are one bar on top. Comms is a two-line ticker under the ship.
  Mockup (private artifact): https://claude.ai/artifact/Rg73wT8WRddQhXJLPkxkG9.
- **Scenes dock to the right** on a wide screen, and rise from the bottom on a narrow one. The camera moves the hand into what is
  still visible.
- **Approach 1**: one pure layout function returns every block's box; the drawing stays thin.

## 1. The layout

`burnLayout(W, H, hudW, narrow, dialog)` in a new `js/burnlayout.js`, pure. It returns boxes in screen px: `bar`, `ship`, `ticker`,
`life` (the downtime row), `tutorial` and `dock`. `dock` is null when no dialog is open. `dialog` is `{ w, h }` of the open scene
dialog's content, or null.

**Wide** (the HUD a sidebar, `hudW > 0`), in the view beside the HUD with a 12 px gutter, top to bottom:

- `bar`, 64 px;
- `ship`, about 58% of the height;
- `ticker`, 78 px;
- `life`, one row;
- then the bridge keys, which are unchanged.

**Narrow** (phone or tablet, the HUD strip on top), the same order below the strip:

- `bar`, 72 px;
- `ship`, between 1.0 and 1.2 times the view's width in height, as the height allows;
- `ticker`, about 120 px, lines wrapping;
- the button rows, then the keys.

**Short windows** give up height in this order:

1. the ticker drops to one line;
2. the bar's dates line goes;
3. the ship shrinks.

The ship is never smaller than today's box at that size (`L * k` by `L * k * CUTAWAY_ASPECT`, as `drawTransit` computes it now).

**What each box holds:**

- `bar`: the ship's name, the route, the progress line with its flip mark and dates, the speed, and the g reading (`burnState()`).
- `ship`: `drawCutaway(box)`, from #864.
- `ticker`: the last two Comms lines, the newest brighter. A tap opens the Comms sheet, the same as the COMMS key.
- `life`: the DOM downtime buttons, placed through `G.lifeY` as now.

The Menu and System map buttons keep their DOM places where those are clear of the boxes. The overlap test checks this.

## 2. Scenes

- **Wide.** A scene's dialog (`#panel.event`) docks along the right of the ship-and-ticker area, `min(560, 45% of the view)` wide,
  from the ship's top. It scrolls inside, as now. `burnLayout` returns the `dock` box, and JS sets it on the panel as CSS variables,
  so the canvas and the DOM use the same numbers. Fight boards use the same dock.
- **Narrow.** The dialog rises from the bottom over the ticker and the buttons. Its top never goes above the middle of the ship box,
  so the upper deck stays in view.
- **The camera.** `drawCutaway(box, clear)` takes the part of the ship box left clear of the dialog. While a dialog is open, the camera
  centres the hand in that part. When the dialog closes, the camera eases back to the whole box. On a narrow screen with the hand on
  the lower deck, the camera shows the upper deck above them, and the outline still marks where the hand is.
- **Taps.** The outline stays top left of the ship box, so it is always clear of the dialog. Taps on the ship work in the clear part.
  The part under the dialog belongs to the dialog.
- **Station sheets** (`#bsheet`, the bridge keys) are not scenes and keep their places.

## 3. Where the rest goes

- **The BURN panel's detail.** Peak speed and distance move to the Bridge sheet (`nav`) as two lines. The bar shows the speed and the g
  reading. `drawBurnPanel` goes. The BURN key's sheet, the Bridge, is where the instruments are read in full.
- **The ship's log**, the contract line. Wide: a section of the HUD sidebar under the cargo and money lines. Narrow: the top of the
  Comms sheet, opened from the ticker or the COMMS key. No new button.
- **The destination** still grows ahead with progress. It is drawn in the ship box's background, at the right behind the nose.
- **The tutorial prompt** takes the ticker's box while it shows (`tutorial`). The ticker returns when it is gone.

## 4. Testing

- **`tests/burnlayout.test.js`** (Node, through `tests/nodecontext.js`). Run `burnLayout` at 1280x800, 768x1024, 390x844 and
  1280x600, each with and without a dialog. Check:
  - every box is inside the view;
  - no two boxes overlap, except the dock over the ship and ticker, which is its purpose;
  - the ship is never smaller than today's box;
  - on a wide screen the ship is at least 1.8 times today's height;
  - with a dialog, the clear part is the ship box minus the dock;
  - at 1280x600 the ticker is one line before the ship has shrunk.
- **`tests/burnview.test.js`**:
  - the overlap test at the three sizes uses the new keys (`bar`, `ship`, `ticker`, `tutorial`, `dock`), with the Menu and System
    map buttons;
  - the text test stays: 12 px or more;
  - new: with a scene open, `#panel.event` matches the dock box and the hand is drawn inside the clear part;
  - new: a tap on the ticker opens the Comms sheet;
  - new: the Bridge sheet shows the peak speed and the distance.
- **`tests/ui.test.js`**: the Comms-lines test follows the ticker.
- **Pins**: no pin should move. This is layout, not life.
- **Before pushing**: `npm test` and `npm run test:editor`.

## Not in this work

- The Sun (#865).
- New HUD content beyond the ship's log moving in.
- Manual camera control.
- Sprites.
