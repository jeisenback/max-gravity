'use strict';

// Hand to hand on the sheet (#684): what the lock fight (boarders.js) adds to the triangle and the post's move. Each post has two abilities more, each a check on the post's stat
// and skill (sheet.js) that costs the exchange and wins no ground: a steady one that leaves one of them fewer, and one that makes cover (once a fight). A miss holds the ground but
// gives them a shot at someone. The ship has cover by section, which turns the hurt chance down for the section it is fought in: the lock and the bridge a point,
// the corridor by the ship's length (a long ship has berth doors to stand behind, a cramped one has none), and the kit adds to it (sheet.js kitCover). A point of cover over the
// ship's own is a fifth off the chance of a casualty, and a point under it a fifth on; the triangle, the head count and the casualty rules are as they were. fightStrip draws
// the three sections with who holds each hatch. Pure: it reads nothing of the game, so it runs in plain Node (tests/handtohand.test.js). Loaded before boarders.js.

const ABILITY_EDGE = { steady: 0.1, cover: 0.05 };  // what the check gains over the post's own move: both are easier gambles, for smaller prizes, and the steady one the easier
const COVER_BASE = 1, COVER_MAX = 3, COVER_STEP = 0.2, COVER_FLOOR = 0.4, COVER_MADE = 2;  // a worked cover ability makes two points where the fight is
const ABILITY_NOTE = { steady: 'one fewer of them, no ground', cover: 'cover here, once' };  // what the label says an ability wins (the odds and what a miss costs come after, costNote)

// The abilities of each post, in the words of both fights (the assault and the repel use the same lines: they name the section and the front, not who is who).
const FIGHT_ABILITY = {
  gunner: {
    steady: { label: 'Pick off a runner', win: 'You wait for the one who breaks from cover and put a single round through him. The others see it, and the line slows.', lose: 'You wait for a runner and none runs. The round goes high, and they use the noise to put fire down the line.' },
    cover: { label: 'Covering burst', win: 'You lay a long burst along the wall at head height. Nobody comes through it, and the crew get behind the closer with their heads down.', lose: 'You open up and the burst goes where the wall is, not where they are. It does nothing but tell them where you stand.' },
  },
  pilot: {
    steady: { label: 'Cycle a hatch on them', win: 'You cycle the section hatch as the first of them steps into it. It takes him in the shoulder and he goes back, and the next waits.', lose: 'You cycle the hatch a beat late, and it closes on nothing, and they fire through the gap before it opens again.' },
    cover: { label: 'Cut the lights', win: 'You cut the lights in the section from the helm. The crew know the corridor in the dark and the boarders do not, and they stop.', lose: 'You cut the lights, and your own people cannot see the closer either. The boarders have lamps.' },
  },
  engineer: {
    steady: { label: 'Vent a coolant line', win: 'You open the coolant line behind the front of them. The corridor fills with white, and the ones in it back out coughing.', lose: 'You open the wrong coolant line. It vents into the section you are standing in.' },
    cover: { label: 'Drop the pressure door', win: 'You drop the pressure door half across the corridor. It is a wall to stand behind, with a gap to shoot through.', lose: 'The pressure door sticks a hand short of the deck, and a shot comes through the gap before the crew are behind it.' },
  },
  comms: {
    steady: { label: 'A false order on their band', win: 'You put a voice on their band: "Fall back to the lock." One of them does, and the rest hear it too late.', lose: 'You put a voice on their band and the voice is wrong. Somebody laughs, and a burst comes down the line.' },
    cover: { label: 'Jam their band', win: 'You put the jammer on their channel. They cannot call the next in, and cannot hear who is ahead, and they fight where they stand while the crew take the cover.', lose: 'You jam their band and your own with it, and nobody can tell the crew which hatch to hold.' },
  },
};

// The cover of each section (0 the first, 1 the middle, 2 the last) for a ship of this size, with the kit's and the fight's own (`extra`, made by the cover ability) on top.
const baseCover = (size, pos) => (pos === 1 ? (size >= 16 ? COVER_BASE + 1 : size <= 11 ? COVER_BASE - 1 : COVER_BASE) : COVER_BASE);
const fightCover = ({ size, kit, extra }) => [0, 1, 2].map(pos => Math.min(COVER_MAX, baseCover(size, pos) + kitCover(kit, pos) + ((extra || [])[pos] || 0)));
// The chance of a casualty is scaled by the cover of the section the exchange was fought in: a point over the ship's own takes a fifth off, a point under puts a fifth on.
const hurtScale = cover => Math.max(COVER_FLOOR, 1 - COVER_STEP * (cover - COVER_BASE));

// What an ability does. It costs the exchange and wins no ground: when it works the steady one thins them and the cover one makes cover in the section where the fight is, and the
// exchange stands (a tie); when it misses the ground holds too, but they get a shot at someone (`press`: a casualty is rolled as for a lost exchange). Returns the result, whether
// they press, the new count of them and the new cover made.
function abilityStep(kind, worked, { pos, boarders, extra }) {
  if (!worked) return { result: 'tie', press: true, boarders, extra };
  if (kind === 'steady') return { result: 'tie', press: false, boarders: Math.max(1, boarders - 1), extra };
  return { result: 'tie', press: false, boarders, extra: extra.map((n, i) => (i === pos ? n + COVER_MADE : n)) };
}

// The three sections drawn: who holds each hatch (the sections the front has passed are theirs, the ones it has not reached are yours), the cover in each as pips, and how many are
// at the front. The same in both fights: the sections before the front are theirs, the ones after it are yours.
function fightStrip({ titles, pos, boarders, cover }) {
  const w = 110, f = n => n.toFixed(0), cells = titles.map((t, i) => {
    const x = 6 + i * (w + 6), holder = i === pos ? 'FRONT' : i < pos ? 'THEIRS' : 'YOURS';
    const pips = Array.from({ length: COVER_MAX }, (_, k) => `<circle class="${k < cover[i] ? 'pip' : 'nopip'}" cx="${x + 14 + k * 14}" cy="50" r="4" fill="${k < cover[i] ? '#7fb4ff' : 'none'}" stroke="#3a587a"/>`).join('');
    const fill = i === pos ? '#2a1a14' : holder === 'THEIRS' ? '#1c1218' : '#0d1a26', edge = i === pos ? '#ff6a4a' : '#23405f';
    const count = i === pos ? `<text x="${x + w - 8}" y="52" fill="#ff6a4a" font-size="11" text-anchor="end" font-family="IBM Plex Mono, monospace">${boarders}</text>` : '';
    return `<rect class="section" x="${x}" y="22" width="${w}" height="44" fill="${fill}" stroke="${edge}" stroke-width="1.5"/>` +
      `<text x="${x + 6}" y="17" fill="#7fb4ff" font-size="9" font-family="IBM Plex Mono, monospace" letter-spacing="1">${holder}</text>` +
      `<text x="${x + 6}" y="38" fill="#cfe3ff" font-size="10" font-family="IBM Plex Mono, monospace">${t.toUpperCase()}</text>${pips}${count}`;
  }).join('');
  const label = `The ship in three sections. ${titles.map((t, i) => `${t}: ${i === pos ? `the front, ${boarders} of them` : i < pos ? 'theirs' : 'yours'}, cover ${cover[i]}`).join('. ')}.`;
  return `<svg class="board" viewBox="0 0 360 72" role="img" aria-label="${label}"><rect x="0" y="0" width="360" height="72" fill="#050a11"/>${cells}</svg>`;
}
