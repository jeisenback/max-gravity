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

// Focus (#267). A room change moves focus to the page, so a keyboard or screen-reader user starts at its top. A re-render of
// the same page never does, so it cannot take focus from a field being typed in.
function focusPage() {
  const body = document.querySelector('.shell .body');
  if (body) body.focus();
}

// A scene dialog takes focus on its first open choice, and gives it back to where it came from when it closes. A scene that
// leads straight into another keeps the first opener.
let dialogOpener = null, dialogOpen = false;
function trapDialog(opener) {
  if (!dialogOpen) { dialogOpen = true; dialogOpener = opener && opener !== document.body ? opener : null; }
  const first = document.querySelector('#panel .choices button:not(:disabled)');
  if (first) first.focus();
}
function releaseDialog() {
  if (!dialogOpen) return;
  dialogOpen = false;
  const back = dialogOpener && document.contains(dialogOpener) ? dialogOpener : null;
  dialogOpener = null;
  if (back) back.focus(); else focusPage();
}
