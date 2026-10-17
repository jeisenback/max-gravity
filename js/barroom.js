'use strict';

// The bar as a room (#687): the patrons of a night drawn where they sit, in a 640 by 300 plan, and tapped to talk to. The main characters
// and the people you know sit at the rail, the regulars at their table, strangers stand by the door. Pure: barLayout takes the kinds of the
// patrons in order and returns where each one is, so it runs in plain Node (tests/barroom.test.js); barRoomSvg (below) draws it with the
// game's state. Loaded after bar.js and regulars.js; only calls into the game at runtime.

// Where each kind sits. A place is [x, y]; a full group spills into the next free place anywhere, so two people never share one.
const ROOM_RAIL = Array.from({ length: 6 }, (_, i) => [80 + i * 56, 176]);
const ROOM_TABLE = [[595, 195], [565, 247], [505, 247], [475, 195], [505, 143], [565, 143]];  // six seats round the table at (535, 195)
const ROOM_DOOR = Array.from({ length: 5 }, (_, i) => [110 + i * 52, 262]);
const ROOM_SPOTS = { cast: ROOM_RAIL, known: ROOM_RAIL, regular: ROOM_TABLE, stranger: ROOM_DOOR };

// kinds: 'cast' | 'known' | 'regular' | 'stranger' for each patron in the order of G.patrons. Returns [{ x, y }] in the same order, or null for
// a patron the room has no place for (more than its 17 places).
function barLayout(kinds) {
  const used = new Set(), key = ([x, y]) => `${x},${y}`;
  const free = list => list.find(s => !used.has(key(s)));
  return kinds.map(k => {
    const spot = free(ROOM_SPOTS[k] || ROOM_DOOR) || free([...ROOM_RAIL, ...ROOM_TABLE, ...ROOM_DOOR]);
    if (!spot) return null;
    used.add(key(spot));
    return { x: spot[0], y: spot[1] };
  });
}

// The room drawn: the back wall with the shelf and the screen, the counter with the bartender behind it, the table, the door, and the patrons. A patron
// is a token: a ring (warm for someone you know, dashed for a stranger, orange when they are having a hard time), their initial and their first name; it
// is a button that opens the talk, as the Talk button in the list under the room does, and Enter or Space on it does the same (barRoomKeys).
function barRoomSvg(patrons, name, screen) {
  const places = barLayout(patrons.map(x => (x.cast ? 'cast' : x.regular ? 'regular' : x.known ? 'known' : 'stranger')));
  const bottles = Array.from({ length: 9 }, (_, i) => `<rect x="${60 + i * 34}" y="${52 + (i % 3) * 2}" width="9" height="${22 - (i % 3) * 2}" rx="2" fill="${['#3b5d7a', '#7a5a3b', '#4d7a5a'][i % 3]}" opacity=".8"/>`).join('');
  const tokens = patrons.map((x, i) => {
    const at = places[i];
    if (!at) return '';
    const ring = moodLow(x.p) ? '#ff9a3c' : x.cast ? '#6fb0ff' : x.known ? '#e8d17a' : '#8aa0b5', who = `${x.p.first} ${x.p.last}`;
    return `<g class="room-patron" data-action="barTalk" data-arg="${i}" role="button" tabindex="0" aria-label="Talk to ${esc(who)}"><circle cx="${at.x}" cy="${at.y}" r="16" fill="#12202f" stroke="${ring}" stroke-width="3"${x.known || x.cast ? '' : ' stroke-dasharray="4 3"'}/>`
      + `<text x="${at.x}" y="${at.y + 5}" fill="#d4e4f5" font-size="14" text-anchor="middle">${esc((x.p.first || '?')[0])}</text><text x="${at.x}" y="${at.y + 31}" fill="#9ab" font-size="11" text-anchor="middle">${esc(x.p.first)}</text></g>`;
  }).join('');
  return `<svg class="con-plant bar-room" viewBox="0 0 640 300" role="group" aria-label="${esc(name)}, with ${patrons.length} ${patrons.length === 1 ? 'person' : 'people'} in it">`
    + `<defs><radialGradient id="bar-lamp"><stop offset="0" stop-color="#e8d17a" stop-opacity=".35"/><stop offset="1" stop-color="#e8d17a" stop-opacity="0"/></radialGradient><linearGradient id="bar-floor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b1522"/><stop offset="1" stop-color="#070d16"/></linearGradient></defs>`
    + `<rect width="640" height="300" fill="#050a11"/><rect x="10" y="100" width="620" height="190" rx="6" fill="url(#bar-floor)" stroke="#16243a"/><rect x="10" y="10" width="620" height="90" rx="6" fill="#0a1320" stroke="#16243a"/>`
    + `<text x="24" y="28" fill="#7f95ab" font-size="11" letter-spacing="2">${esc(name.toUpperCase())}</text>${bottles}`
    + `<rect x="400" y="30" width="200" height="56" rx="4" fill="#0e1b2c" stroke="#34506e"/><text x="500" y="62" fill="#9fd0ff" font-size="12" text-anchor="middle">${esc(screen)}</text>`
    + `<circle cx="150" cy="100" r="60" fill="url(#bar-lamp)"/><circle cx="330" cy="100" r="60" fill="url(#bar-lamp)"/>`
    + `<circle cx="240" cy="116" r="11" fill="#2a3b52" aria-hidden="true"/><rect x="40" y="128" width="360" height="20" rx="4" fill="#1d2a3a" stroke="#34506e"/>`
    + `<circle cx="535" cy="195" r="26" fill="#16202e" stroke="#34506e"/><rect x="22" y="236" width="40" height="54" rx="3" fill="#0a1320" stroke="#34506e"/><text x="42" y="268" fill="#7f95ab" font-size="9" text-anchor="middle">DOOR</text>`
    + tokens + `</svg>`;
}

// What the screen over the bar shows: the match if there is one tonight, else the show on the feeds, shortened to fit.
function barScreen() {
  const m = typeof matchNight === 'function' ? matchNight() : null, show = airing(cultureToday())[0];
  const line = m ? `${m.match.a} ${m.match.sa} : ${m.match.sb} ${m.match.b}` : show ? show.title : '';
  return line.length > 30 ? `${line.slice(0, 28)}...` : line;
}

const barRoomHtml = (patrons, name) => barRoomSvg(patrons, name, barScreen());

// Enter or Space on a patron's token does what a tap does, so the room is open to the keyboard (a11y.js keeps the focus).
function barRoomKeys(e) {
  const t = e.target;
  if (!t || !t.classList || !t.classList.contains('room-patron') || (e.key !== 'Enter' && e.key !== ' ')) return;
  e.preventDefault();
  t.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
if (typeof document !== 'undefined') document.addEventListener('keydown', barRoomKeys);  // not in the plain-Node test of the layout
