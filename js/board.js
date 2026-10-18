'use strict';

// The sensor board (#680): where a raid happens. A position model for the raid's beats (engagements.js), and the lidar plot drawn from
// it above the beat's text: range rings, your ship at the center, her return at its bearing and range, the closing rate, the point
// defense arc, the sun's side, a torpedo on its way, and what worn sensors do to the picture. The beats keep their choices, lines and
// odds; the board is the picture of them. Pure: raidBoard takes the beat, the position and the two ships, boardSvg takes a board and
// what to draw it with, so it runs in plain Node (tests/board.test.js). Loaded after sheet.js; only called into at runtime.

const BOARD_RANGES = { grapple: [40, 2, 1], gun: [30, 2, 1.5], torpedo: [40, 12, 8] };  // km at the closing, the first pass and the second, as the beats' lines have them
const BOARD_MAX = 80, BOARD_RING = 20, BOARD_PD = 15;  // the plot's reach and its rings, and how far the point defense tracks her (the closing's "hold" line)
const HEADER_CLEAR = 28;  // the lowest the sun marker may ride up the plot: the header text is in the top 20 units, and nothing else is drawn there
const CLOSING_PER = 33, BEARING_STEP = 25;  // km a minute per unit of the ships' speed difference; degrees of bearing a point of position
const SENSOR_GHOST = 60, SENSOR_STALE = 40;  // sensor condition under which the plot throws a second return, and under which it shows her late

// The position model for a beat: the range by beat and style, the bearing off the bow by the position (ahead, she is forward of the beam, where
// the guns bear; behind, she is on the quarter), the closing rate from the two ships' speeds, and her aspect.
function raidBoard({ beat, edge, style, me, foe, range: kept }) {
  const ranges = BOARD_RANGES[style] || BOARD_RANGES.grapple, range = kept !== undefined ? kept : ranges[Math.min(beat, ranges.length - 1)];  // the raid keeps the range (range.js); a board with none reads the table
  const bearing = 90 - BEARING_STEP * Math.max(-3, Math.min(3, edge || 0));
  const closing = Math.max(1, Math.round((foe.maxSpeed - me.maxSpeed) / CLOSING_PER));
  const aspect = beat === 0 ? 'closing' : style === 'torpedo' ? 'standing off' : 'crossing';
  return { range, bearing, closing, aspect };
}

// The plot. The scale is a square root, so a pass at two kilometers is still a hand's width from the center.
function boardSvg(b, { style, beat, sensors = 100, sunAngle = 0, prev = null, pack = false, word = '' }) {
  const cx = 180, cy = 120, R = 100, rOf = km => R * Math.sqrt(Math.min(km, BOARD_MAX) / BOARD_MAX);
  const pt = (km, deg) => { const a = (deg - 90) * Math.PI / 180, r = rOf(km); return [(cx + r * Math.cos(a)).toFixed(1), (cy + r * Math.sin(a)).toFixed(1)]; };
  const f = n => n.toFixed(1);
  const stale = sensors < SENSOR_STALE && prev, shown = stale ? prev : b, [hx, hy] = pt(shown.range, shown.bearing);
  const rings = Array.from({ length: BOARD_MAX / BOARD_RING }, (_, i) => `<circle class="ring" cx="${cx}" cy="${cy}" r="${f(rOf(BOARD_RING * (i + 1)))}" fill="none" stroke="#23405f" stroke-width="1"/>`).join('');
  const pdR = rOf(BOARD_PD), pd = `<path class="pd" d="M${cx} ${cy} L${f(cx - pdR * Math.sin(Math.PI / 3))} ${f(cy - pdR * Math.cos(Math.PI / 3))} A${f(pdR)} ${f(pdR)} 0 0 1 ${f(cx + pdR * Math.sin(Math.PI / 3))} ${f(cy - pdR * Math.cos(Math.PI / 3))} Z" fill="#4aa3ff" fill-opacity="0.12" stroke="#4aa3ff" stroke-opacity="0.4" stroke-width="1"/>`;
  const sunY = Math.max(cy + (R + 8) * Math.sin(sunAngle), HEADER_CLEAR);  // the sun rides the rim but not up into the header's row (#731)
  const sx = cx + Math.sign(Math.cos(sunAngle) || 1) * Math.sqrt(Math.max(0, (R + 8) ** 2 - (sunY - cy) ** 2));
  const sy = sunY;
  const sun = `<circle class="sun" cx="${f(sx)}" cy="${f(sy)}" r="5" fill="#ffd27f"/>`;
  const me = `<path class="me" d="M${cx} ${cy - 7} L${cx + 5} ${cy + 5} L${cx} ${cy + 2} L${cx - 5} ${cy + 5} Z" fill="#cfe3ff"/>`;
  const contact = `<circle class="contact" cx="${hx}" cy="${hy}" r="5" fill="#ff6a4a"/>`;
  const second = pack ? (([x, y]) => `<circle class="contact" cx="${x}" cy="${y}" r="5" fill="#ff6a4a"/>`)(pt(shown.range * 1.1, shown.bearing + 20)) : '';
  const ghost = !stale && sensors < SENSOR_GHOST ? (([x, y]) => `<circle class="ghost" cx="${x}" cy="${y}" r="5" fill="none" stroke="#ff6a4a" stroke-dasharray="2 2"/>`)(pt(b.range * 0.8, b.bearing + 35)) : '';
  const track = style === 'torpedo' && beat >= 1 ? `<line class="track" x1="${hx}" y1="${hy}" x2="${cx}" y2="${cy}" stroke="#ffcf7f" stroke-width="1.5" stroke-dasharray="4 3"/>` : '';
  const head = `RANGE ${b.range} km  CLOSING ${b.closing} km/min  BEARING ${String(Math.round(b.bearing)).padStart(3, '0')}${word ? `  ${word.toUpperCase()}` : ''}${stale ? '  STALE' : ''}`;
  const label = `Sensor board: range ${b.range} km, closing ${b.closing} km a minute, bearing ${Math.round(b.bearing)} degrees off the bow, ${b.aspect}.${word ? ` Position: ${word}.` : ''}${stale ? ' The sensors show her where she was last beat.' : ''}`;
  return `<svg class="board" viewBox="0 0 360 240" role="img" aria-label="${label}"><rect x="0" y="0" width="360" height="240" fill="#050a11"/>${rings}${pd}${sun}${track}${ghost}${second}${contact}${me}` +
    `<text x="10" y="16" fill="#7fb4ff" font-size="11" font-family="IBM Plex Mono, monospace" letter-spacing="1">${head}</text>` +
    `<text class="reach" x="10" y="234" fill="#56687a" font-size="9" font-family="IBM Plex Mono, monospace">${BOARD_MAX} km</text></svg>`  // the corner nothing else is drawn in: the sun rides a rim 108 units from the center, which stays clear of it;
}
