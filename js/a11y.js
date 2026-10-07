'use strict';

// Access for a keyboard and a screen reader (#267). One polite live region, #live, sits outside #panel so a re-render
// does not drop what it holds. Loaded before game.js; only calls into it at runtime.

// Reads a line aloud. The region is cleared first and filled a moment later, so a line that repeats is read again.
function announce(text) {
  const el = document.getElementById('live');
  if (!el || !text) return;
  el.textContent = '';
  setTimeout(() => { el.textContent = text; }, 50);
}
