'use strict';

// The scene editor's changes to the shipped words (#336), and nothing else. Keyed by a storylet's id, then by what changes: title, text, and
// choices, which is keyed by the choice's place in the scene's list (0 is the first), each with a label and/or a result line:
//   { 'port-mars-front': { title: '...', text: '...', choices: { 0: { label: '...', result: '...' } } } }
// storyletEvent (js/storylets.js) puts these in front of the shipped text when it builds the scene. Empty means the shipped game. An id that is
// not a scene, or a value that is not text, is left out with one console warning.
const SCENE_OVERRIDES = {};
