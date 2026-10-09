# The painted world: a visual pass on everything that is not the flight view

Status: approved in conversation, 2026-10-09. Branch `ccr-5931a887-267enf`.

## Context

The in-system flight view is the best-looking part of the game: painted planets with clouds, atmosphere and shading from the sun's real direction (`bodySprite`, `drawBody` in `js/art.js`), a sun glow, parallax stars, one subject on a dark field. Everything else looks flat next to it. The landed window is an opaque navy box whose 96px viewscreen strip draws a plain disc and a ring. The title is a panel over drifting stars. The system map is dots on a dark field. The burn view's canvas cards and the scene dialog are flat panels of their own.

The ship-interface overhaul (#316) left "restyling the art" out of scope on purpose. This is that pass. It changes surfaces and light, not navigation, layout or play.

## What the owner wants

All four qualities of the flight view, everywhere: the painted art, depth and light, room to breathe, and the sense of being somewhere. All four screens: the landed shell, the burn view, scenes, and the title and map. Drawn in code now; hand-made images may come later, so leave a slot.

## Decisions

1. **One material: glass over a painted world.** Every panel, HTML or canvas, is a translucent dark glass over whatever the game canvas paints behind it. The HTML panel and the burn view's canvas cards share one recipe: `rgba(11,17,27,0.86)` fill, a one pixel `#22384f` line, the bracketed accent corners that exist today, and a soft accent glow bleeding in from the top edge. No backdrop blur anywhere: it is too costly on a phone over an animating canvas.
2. **Panels have a light direction.** A CSS custom property `--light-x` (a percentage across the panel) is set from the sun's real direction, `sunLight().angle`, each time the landed screen or a scene renders. The header gradient and the accent glow fall from that side. The title uses a fixed sun.
3. **The body painters can paint anywhere.** `drawBody` and the helpers it calls take an optional target context (default: the main canvas) and an optional sun (default: `sunLight()`), and the sprite cache is keyed by name and radius so a 7px map dot, a 95px flight body and a 360px vista limb do not collide. Sprites with a radius over 200px are drawn at device ratio 1, like the gas giants, to bound memory. This is the one refactor; everything else calls it.
4. **The landed vista.** The viewscreen strip becomes the port seen from the dock: the docked body painted large, its limb across the bottom of the strip with sky above it, lit from the sun's real direction, with its lights, rings or geysers. Where the port is a moon or a station, its parent world hangs small in the background with distance haze (the system's first body, or the gas giant `BACKDROPS` already names). Stars behind and the station ring turning ahead, as now. A dock faces the day side: when the real sun is below the horizon its angle is mirrored above it, so the limb is never a black band. A station port (Hermes Foundry) is not a world: it hangs whole in the middle of the strip instead of rising as a limb. The strip grows from 96px to 150px from 700px wide; on a phone it stays 92px because height is scarce there.
5. **The title.** The menu panel is glass over a painted scene: Earth's limb across the lower quarter of the screen, a sun glow rising at the limb on one side, the drifting stars kept. No save state is needed to paint it.
6. **The system map.** Each system's first body is a small painted sprite lit from the map's sun, ringed thinly in its faction's colour so that information is kept. The sun gets the flight view's glow. A faint radial gradient under the orbit rings and a soft vignette at the rim give the field depth. Labels, scale, zoom, rim pointers and the raid, mission and destination rings do not change.
7. **The burn view.** The canvas cards (Comms, Burn, Ship's Log, the route plate) take the glass recipe. The destination's first body is painted ahead on the glow side, under the Burn panel, and grows with progress. On a phone, where the Comms card spans the width, the destination is not drawn. The cutaway, the key bar and the sheets do not change.
8. **Scenes.** The event dialog is glass with its accent glow from the light side. Its markup does not change, so the golden fixtures hold.
9. **The image slot.** `VISTA_IMAGES`, a table from port name to image path, empty for now. When a port has one and it has loaded, the vista painter draws it instead of the procedural scene. Nothing else knows the difference. A missing or failed image falls back to the procedural scene.
10. **Reduce motion.** The ring stops and the stars hold still when the setting is on, as today. No parallax is added anywhere.
11. **Identity unchanged.** Chakra Petch labels, IBM Plex Mono text, the faction accent, the clipped console keys and the scanline texture stay. Text stays 12px or more.

## Build order

One PR per step, each shippable on its own and leaving `main` working.

1. The painter refactor and the glass tokens. No pixel a player sees changes except the panel's translucency and light.
2. The landed vista and the image slot.
3. The title.
4. The system map.
5. The burn cards and the destination ahead.
6. The scene dialog, then the roadmap note and screenshots at the three sizes.

## Testing

Mostly existing tests: the layout test's boxes at three screen sizes, the burn view's overlap and font-size checks, the golden fixtures, the globals and bundle tests, the coverage floor (`js/ui.js` and `js/shell.js` are in it). New and small, in one file `tests/paint.test.js`: the painter targets a second canvas and the cache does not collide between sizes; the vista paints every port in the full build and is not blank; the image slot draws an image and falls back without one; the title paints with no save state; the map paints a body at each system; the burn view's destination has a box on a wide screen and none on a phone; the panel's light property and translucency are set. Each step is screenshotted at 1280x800, 768x1024 and 390x844 and sent to the owner before its push.

## Risks

- **Legibility over a bright body.** At 86 percent opacity the worst case behind text is a white cloud; the text colour on the blended result stays above 7:1. If a screenshot shows otherwise, raise the opacity rather than add blur.
- **Memory for large sprites.** Bounded by decision 3 (device ratio 1 over 200px, vista radius capped at 360px, title at 720px). A growing-radius sprite is never cached per frame: the destination ahead is one 40px sprite drawn scaled.
- **The strip's extra 54px on desktop** comes out of the page's content window. Accepted for the room it gives; the phone keeps its height.

## Out of scope

Portraits, the cutaway drawing, the burn view's layout, phone layout beyond the strip height, the editor pages, new per-port art data, any image files, and moving the remaining pages onto the view helpers.
