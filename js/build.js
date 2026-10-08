'use strict';

// Build settings. For a public release set `dev: false`: the tester tools (js/uat.js)
// then stay hidden whatever the address or keys. `version` shows on the title screen
// and is stored with each save.
const BUILD = {
  version: '0.9.0', dev: true,
  scope: /[?&]scope=full(&|$)/.test(location.search) ? 'full' : 'earth-hired',
};

// Scope. 'earth-hired' is the chapter being tuned: an Earth hired hand, ending when they buy a ship. The systems listed
// in SCOPE_OFF are switched off in it and come back with scope 'full' (open the game with ?scope=full on the address;
// the tests do). Nothing is deleted: each gate is a scopeOff() check where the system meets the player.
// 'posts' and 'captains' narrow it to one path (#289): the New Game form offers no post, the hand works the guns, and the
// captain is Hester with her first officer Cato. A test or a tester can still name another post or captain (hired.js, captains.js).
const SCOPE_OFF = ['starts', 'errands', 'barwork', 'storylines', 'owner', 'community', 'posts', 'captains'];
const scopeNarrow = () => BUILD.scope === 'earth-hired';
const scopeOff = feature => scopeNarrow() && SCOPE_OFF.includes(feature);
