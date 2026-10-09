'use strict';

// The scene editor's changes to the shipped scenes (#336, #338), and nothing else. Keyed by a storylet's id, then by what changes: title, text,
// `when` (the scene's conditions, replaced whole), and choices, which is keyed by the choice's place in the scene's list (0 is the first), each
// with a label and/or a result line, and `when`, `effects` (each replaced whole) and `next` (a scene's id, or null for no link):
//   { 'port-mars-front': { title: '...', when: { day: 5 }, choices: { 0: { label: '...', result: '...', effects: { credits: 100 }, next: 'port-mars-sky' } } } }
// storyletEvent (js/storylets.js) puts these in front of the shipped scene when it builds it. Empty means the shipped game. An id that is not a
// scene, or a word that is not text, is left out with one console warning. Conditions, effects and links are held to the check addStorylet
// makes: a scene's changes to them that it would refuse are all left out.
const SCENE_OVERRIDES = {};

// Scenes the editor wrote from scratch (#339): a list of storylets, each as addStorylet takes it ({ id, where, title, text, when, choices: [...] }).
// They are added to the game's scenes when the first game starts, through addStorylet, so one it would refuse (an unknown condition, a repeated id)
// is logged and left out.
const NEW_SCENES = [];
