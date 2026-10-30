'use strict';

// The figures aboard in the burn view: the postures a person or the cat can be drawn in (shiplife.js posture() picks one),
// each with its frame count and frames per second. The sprite sheets are drawn to this list.
const POSTURES = {
  couch: { frames: 1, fps: 0 },
  stand: { frames: 2, fps: 1 },
  walk: { frames: 8, fps: 10 },
  climb: { frames: 4, fps: 6 },
  sit: { frames: 2, fps: 1 },
  bunk: { frames: 1, fps: 0 },
  strap: { frames: 2, fps: 1 },
  tether: { frames: 8, fps: 4 },
  'cat-walk': { frames: 6, fps: 8 },
  'cat-sit': { frames: 2, fps: 1 },
  'cat-sleep': { frames: 1, fps: 0 },
  'cat-float': { frames: 6, fps: 4 },
};
