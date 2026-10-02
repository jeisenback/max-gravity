'use strict';

// Build settings. For a public release set `dev: false`: the tester tools (js/uat.js)
// then stay hidden whatever the address or keys. `version` shows on the title screen
// and is stored with each save.
const BUILD = { version: '0.9.0', dev: true, scope: (() => { try { return localStorage.getItem('maxGravity.scope') === 'full' ? 'full' : 'earth-hired'; } catch { return 'earth-hired'; } })() };

// Scope. 'earth-hired' is the chapter being tuned: an Earth hired hand, ending when they buy a ship. The systems listed
// in SCOPE_OFF are switched off in it and come back with scope 'full' (set localStorage 'maxGravity.scope' to 'full';
// the tests do). Nothing is deleted: each gate is a scopeOff() check where the system meets the player.
const SCOPE_OFF = ['starts', 'errands', 'barwork', 'storylines', 'owner', 'community'];
const scopeNarrow = () => BUILD.scope === 'earth-hired';
const scopeOff = feature => scopeNarrow() && SCOPE_OFF.includes(feature);
