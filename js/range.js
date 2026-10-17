'use strict';

// The raid's range (#710): a distance in km the raid keeps and the choices move, beside the position count (engagements.js). Each beat she closes on you at her
// rate toward the range she wants (a raider the lock, a corsair a standoff, a patrol gun range); a choice can open the range or close it first; and the range decides
// three things: whether the contact is lost (she is left too far behind to follow), whether she can board (she must be alongside), and a little of each choice's odds
// (point defense and guns reach only so far, an evasive burn wants room). Pure: every function takes what it reads and returns a value, so it runs in plain Node
// (tests/range.test.js); engagements.js keeps the state and board.js draws it. Loaded before board.js.

const RANGE_FIRST = { grapple: 40, torpedo: 40, gun: 30 };  // km at the closing, as the beats' lines have them
const RANGE_WANT = { grapple: 1.5, torpedo: 10, gun: 3 };  // the range she closes to and holds: alongside, a standoff, gun range
const RANGE_BEAT_MIN = 10;  // minutes one beat covers: at a raider's or a corsair's closing rate she reaches the range she wants by the first pass, unless you have opened it
const RANGE_ESCAPE = 60;  // km she is left at, past which the sensors lose her and the contact is lost: two good beats against a slow ship, never against a fast one
const RANGE_BOARD = 3;  // km: she must be within it to board, else she stands off
const RANGE_NEAR = 6;  // km: a pass at or under it is the close pass the authored lines describe (crossing your bow); over it she is still coming
const RANGE_STEP = 0.05;  // odds a band of range moves a choice by, from the range it would have on the way things were going

// What a choice does to the range, in km: [on a win, on a loss]. Positive opens the range, negative closes it. Keyed by the choice's id, or `post.<kind>.<post>` for the post's own move.
const RANGE_SHIFT = {
  burn: [20, -10],  // an evasive burn opens the range, and a bad one lets her close
  turn: [-15, 0],  // turning into her closes it
  'post.closing.engineer': [25, -5],  // running the drive hot to open the range (its line says so)
  'post.exchange.pilot': [10, 0],  // flipping and burning across her path throws her run wide
};
const RANGE_BANDS = ['knife', 'close', 'mid', 'long'];
const rangeBand = km => (km < 3 ? 'knife' : km < 10 ? 'close' : km < 40 ? 'mid' : 'long');
const bandIndex = km => RANGE_BANDS.indexOf(rangeBand(km));

// The range for the first beat: where she was met (RANGE_FIRST), a little more where the closing beat was won by a post that sees her early.
const rangeAtContact = style => RANGE_FIRST[style] || RANGE_FIRST.grapple;

// The range at the next beat: your choice moves it first (never below nothing), then she closes at `closing` km a minute for a beat toward the range she wants. She never
// closes past it, and she does not open it by herself.
function rangeAfter(range, { style, closing, shift = 0 }) {
  const r = Math.max(0, range + shift), want = RANGE_WANT[style] || RANGE_WANT.grapple;
  return r > want ? Math.max(want, r - closing * RANGE_BEAT_MIN) : r;
}

// The range she is left at when the raid ends on your choice: it has moved by the choice and she has not had a beat to close it.
const rangeLeft = (range, shift) => Math.max(0, range + shift);

const rangeShiftOf = (key, won) => { const s = RANGE_SHIFT[key]; return s ? s[won ? 0 : 1] : 0; };
const contactLost = range => range >= RANGE_ESCAPE;
const canBoard = (range, style) => style === 'torpedo' || range <= RANGE_BOARD;  // a corsair does not board in the first place; the others must be alongside

// How far a choice's odds move because the range is not where the beat would have had it: guns and the warning round want her close, the point defense wants her inside its
// arc, an evasive burn wants room, and turning into her is harder the farther she is. `base` is the range the raid would have if no choice had moved it (the same closing, no shifts), so a
// fight that nobody moves has the odds it always had.
const RANGE_KIND = { fire: -1, warn: -1, screen: -1, turn: -1, burn: 1 };  // the sign: -1 a choice that wants her close, 1 one that wants room
const rangeEdge = (id, range, base) => (RANGE_KIND[id] || 0) * RANGE_STEP * (bandIndex(range) - bandIndex(base)) || 0;
