'use strict';

// Hand to hand on the sheet (#684): what the hand and the crew can do in the deck fight (fight.js resolveDeckTurn) besides shoot. Each post has two abilities, each a check on
// the post's stat and skill (sheet.js): a steady one that leaves one of them fewer, and one that makes cover (once a fight). A miss gives them a shot at someone. The ship has cover
// by section, which cuts what the defenders of a section lose: the lock and the bridge a point, the corridor by the ship's length (a long ship has berth doors to stand behind, a
// cramped one has none), and the kit adds to it (sheet.js kitCover). fightStrip draws the deck. Pure: it reads nothing of the game, so it runs in plain Node
// (tests/handtohand.test.js). Loaded before boarders.js.

const ABILITY_EDGE = { steady: -0.1, cover: 0.05 };  // what the check gains over the post's own move: the cover one is an easier gamble for a smaller prize; the steady one a harder one, since the last of them going down, or the few left breaking, wins the fight
const COVER_BASE = 1, COVER_MAX = 3, COVER_MADE = 2;  // a worked cover ability makes two points where the fight is

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

// The crew at the lock (#711): a small sheet each, from what they already are, and orders given to them by name. A crew member whose role is a post (the gunner, the pilot, the
// engineer, and the slicer, who is Comms) has the post's stat a point over the base, as the hand's has at the sign-on, and their skill as it stands (a level less while bad news from home
// weighs on them); a brave one is a point up, a nervous or drunk one a point down. The rule is the hand's (check, sheet.js): the same two abilities at their own skill, a tenth easier or
// harder as the hand's are, and a tenth harder for one already hurt in this fight. The lines are what the crew member does, after their name (the code puts it there), in the words of both fights.
const ORDER_POST = { gunner: 'gunner', pilot: 'pilot', engineer: 'engineer', slicer: 'comms' };  // a crew role to the post whose abilities they have
const CREW_TRAIT = { brave: 1, nervous: -1, drunk: -1 };  // a point of stat, for the traits that matter in a fight
const CREW_HURT = 0.1;  // off an order's odds for one already hurt in this fight
const ORDERS_MAX = 3;  // named orders on offer in an exchange
const CREW_ABILITY = {
  gunner: {
    steady: { label: 'picks off a runner', win: 'waits for the one who breaks from cover and puts a single round through him. The others see it, and the line slows.', lose: 'waits for a runner and none runs. The round goes high, and they use the noise to push.' },
    cover: { label: 'lays covering fire', win: 'lays a long burst along the wall at head height. Nobody comes through it, and the others get behind the closer.', lose: 'opens up and the burst goes where the wall is, not where they are.' },
  },
  pilot: {
    steady: { label: 'cycles a hatch on them', win: 'cycles the section hatch as the first of them steps into it. It takes him in the shoulder and he goes back.', lose: 'cycles the hatch a beat late, and it closes on nothing.' },
    cover: { label: 'cuts the lights', win: 'cuts the lights in the section from the helm. The crew know the corridor in the dark and the boarders do not.', lose: 'cuts the lights, and the crew cannot see the closer either.' },
  },
  engineer: {
    steady: { label: 'vents a coolant line', win: 'opens the coolant line behind the front of them. The corridor fills with white, and the ones in it back out coughing.', lose: 'opens the wrong coolant line, and it vents into the section.' },
    cover: { label: 'drops the pressure door', win: 'drops the pressure door half across the corridor: a wall to stand behind, with a gap to shoot through.', lose: 'drops the pressure door, and it sticks a hand short of the deck.' },
  },
  comms: {
    steady: { label: 'puts a false order on their band', win: 'puts a voice on their band: "Fall back to the lock." One of them does, and the rest hear it too late.', lose: 'puts a voice on their band and the voice is wrong. Somebody laughs.' },
    cover: { label: 'jams their band', win: 'puts the jammer on their channel. They cannot call the next in, and they fight where they stand while the crew take the cover.', lose: 'jams their band and the crew\'s with it.' },
  },
};

// A crew member's sheet: { post, stat, skill }, or null for a role with no post (the cook, the medic, the first officer fight as a head count and no more). `low`: bad news from home.
function crewSheet({ role, skill, traits, low }) {
  const post = ORDER_POST[role];
  if (!post) return null;
  const stat = STAT_BASE + 1 + (traits || []).reduce((n, t) => n + (CREW_TRAIT[t] || 0), 0);
  return { post, stat: Math.max(1, Math.min(STAT_MAX, stat)), skill: Math.max(0, skill - (low ? 1 : 0)) };
}
// The orders that are a hatch worked at a section of the crew's choosing (fight.js resolveDeckTurn), by post: the pilot's cycle and the engineer's pressure door.
const HATCH_ORDER = { pilot: 'steady', engineer: 'cover' };
const crewOrderOdds = (sheet, kind, hurt) => check(sheet.stat, sheet.skill, DIFFICULTY.post, ABILITY_EDGE[kind] - (hurt ? CREW_HURT : 0));
// Who can be sent, as { id, first, sheet }: up to ORDERS_MAX of those who have a post, the most skilled first. The first is given the cover while the fight still has it to make
// (once a fight, the hand's own counts), and the rest the steady ability. Returns each with the `kind` of the order.
const crewOrders = (crew, coverUsed) => crew.filter(c => c.sheet).sort((a, b) => b.sheet.skill - a.sheet.skill).slice(0, ORDERS_MAX).map((c, i) => ({ ...c, kind: i === 0 && !coverUsed ? 'cover' : 'steady' }));

// The cover of each section (0 the first, 1 the middle, 2 the last) for a ship of this size, with the kit's and the fight's own (`extra`, made by the cover ability) on top.
const baseCover = (size, pos) => (pos === 1 ? (size >= 16 ? COVER_BASE + 1 : size <= 11 ? COVER_BASE - 1 : COVER_BASE) : COVER_BASE);
const fightCover = ({ size, kit, extra }) => [0, 1, 2].map(pos => Math.min(COVER_MAX, baseCover(size, pos) + kitCover(kit, pos) + ((extra || [])[pos] || 0)));

// What an ability does. It costs the exchange and wins no ground: when it works the steady one thins them and the cover one makes cover in the section where the fight is, and the
// exchange stands (a tie); when it misses the ground holds too, but they get a shot at someone (`press`: a casualty is rolled as for a lost exchange). Returns the result, whether
// they press, the new count of them and the new cover made.
function abilityStep(kind, worked, { pos, boarders, extra }) {
  if (!worked) return { result: 'tie', press: true, boarders, extra };
  if (kind === 'steady') return { result: 'tie', press: false, boarders: Math.max(0, boarders - 1), extra };
  return { result: 'tie', press: false, boarders, extra: extra.map((n, i) => (i === pos ? n + COVER_MADE : n)) };
}

// The deck drawn (#786): a cell a section, with both sides' heads in it (ours on the left, theirs on the right, a hollow count beside each for the wounded among them), its cover as pips and the hand where they stand (beside the pips, clear of the counts), and
// their shown move as an arrow from where they are to where they say they go, marked MAY FEINT at a veteran grade. A section shows the cover of the side that
// holds it: hers (`hers`) where only theirs stand, ours (`cover`) otherwise. `titles` names the sections; `move` is { from, to, n } (a rush adds `via`, the section it goes through), or null for a hold;
// a corsair's charge ({ kind: 'charge', at }) is marked CHARGE on the section it blows in, with no arrow. `wave`, when given, is the line for the heads still to land, drawn under the deck.
// `began` and `breakAt`, when given, draw her count under the deck: a mark a head she started with, filled while it stands, dashed for the `pending` heads still to land
// (a repel's wave, which `comeSay` words), hollow once down, and the line at which she breaks, which counts the whole party (spec Section 3).
function fightStrip({ titles, sections, hand, move, feint, began = 0, breakAt = 0, pending = 0, wave = '', hurtSay = n => `${n} of them wounded`, oursSay = n => `${n} of ours wounded`, comeSay = (n, m) => `${n} aboard, ${m} still to come` }) {
  const n = sections.length, w = Math.floor(348 / n) - 6, mid = i => 6 + i * (w + 6) + w / 2, font = 'font-family="IBM Plex Mono, monospace"', charge = !!move && move.kind === 'charge';
  const pip = s => (s.theirs && !s.mine ? s.hers || 0 : s.cover);
  const cells = sections.map((s, i) => {
    const x = 6 + i * (w + 6), fill = s.mine && s.theirs ? '#2a1a14' : s.theirs ? '#1c1218' : '#0d1a26', edge = i === hand ? '#ffcf7f' : s.theirs ? '#ff6a4a' : '#23405f';
    const pips = Array.from({ length: COVER_MAX }, (_, k) => `<circle class="${k < pip(s) ? 'pip' : 'nopip'}" cx="${x + 10 + k * 12}" cy="56" r="4" fill="${k < pip(s) ? '#7fb4ff' : 'none'}" stroke="#3a587a"/>`).join('');
    return `<rect class="section" x="${x}" y="22" width="${w}" height="44" fill="${fill}" stroke="${edge}" stroke-width="1.5"/>` +
      `<text x="${x + 4}" y="17" fill="#7fb4ff" font-size="8" ${font} letter-spacing="1">${titles[i].toUpperCase()}</text>` +
      `<text x="${x + 6}" y="40" fill="#7fb4ff" font-size="12" ${font}>${s.mine}</text><text x="${x + w - 6}" y="40" fill="#ff6a4a" font-size="12" text-anchor="end" ${font}>${s.theirs}</text>` +
      `${s.mineHurt ? `<circle class="hurt" cx="${x + 26}" cy="36" r="4" fill="none" stroke="#7fb4ff"/><text x="${x + 32}" y="40" fill="#7fb4ff" font-size="9" ${font}>${s.mineHurt}</text>` : ''}` +
      `${s.theirsHurt ? `<circle class="hurt" cx="${x + w - 26}" cy="36" r="4" fill="none" stroke="#ff6a4a"/><text x="${x + w - 32}" y="40" fill="#ff6a4a" font-size="9" text-anchor="end" ${font}>${s.theirsHurt}</text>` : ''}` +
      `${i === hand ? `<text class="you" x="${x + w - 6}" y="59" fill="#ffcf7f" font-size="9" text-anchor="end" ${font}>YOU</text>` : ''}${pips}` +
      `${charge && move.at === i ? `<text class="charge" x="${x + w / 2}" y="80" fill="#ff6a4a" font-size="9" text-anchor="middle" ${font} letter-spacing="1">CHARGE</text>` : ''}`;
  }).join('');
  const arrow = move && !charge ? `<path class="move" d="M${mid(move.from)} 80${move.via === undefined ? '' : ` L${mid(move.via)} 80`} L${mid(move.to)} 80" stroke="#ff6a4a" stroke-width="1.5"/><circle cx="${mid(move.to)}" cy="80" r="3" fill="#ff6a4a"/>` +
    `<text x="${(mid(move.from) + mid(move.to)) / 2}" y="92" fill="#ff6a4a" font-size="9" text-anchor="middle" ${font}>${move.n}${feint ? ' MAY FEINT' : ''}</text>` : '';
  const left = sections.reduce((k, s) => k + s.theirs, 0), H = (began ? 112 : 98) + (wave ? 14 : 0);
  const mark = k => (k < left ? 'head' : k < left + pending ? 'comehead' : 'nohead');
  const count = began ? Array.from({ length: began }, (_, k) => `<rect class="${mark(k)}" x="${6 + k * 10}" y="100" width="7" height="7" fill="${k < left ? '#ff6a4a' : 'none'}" stroke="${mark(k) === 'comehead' ? '#ffcf7f' : '#ff6a4a'}"${mark(k) === 'comehead' ? ' stroke-dasharray="2 1.5"' : ''}/>`).join('') +
    `<path class="break" d="M${4.5 + breakAt * 10} 97 L${4.5 + breakAt * 10} 110" stroke="#ffcf7f" stroke-width="1.5"/><text x="${10 + began * 10}" y="107" fill="#ffcf7f" font-size="8" ${font} letter-spacing="1">${breakAt ? `BREAKS AT ${breakAt}` : 'FIGHTS TO THE LAST'}</text>` : '';
  const waveLine = wave ? `<text class="wave" x="6" y="${H - 4}" fill="#ffcf7f" font-size="9" ${font}>${wave}</text>` : '';
  const heads = s => [s.mine ? `${s.mine} of ours${s.mineHurt ? `, ${oursSay(s.mineHurt)}` : ''}` : '', s.theirs ? `${s.theirs} of theirs${s.theirsHurt ? `, ${hurtSay(s.theirsHurt)}` : ''}` : ''].filter(Boolean).join(' and ') || 'empty';
  const their = charge ? `a charge on ${titles[move.at]}` : move ? `${move.n} from ${titles[move.from]}${move.via === undefined ? '' : ` through ${titles[move.via]}`} into ${titles[move.to]}` : 'they hold';
  const label = `The deck in ${['three', 'four'][n - 3]} sections. ${sections.map((s, i) => `${titles[i]}: ${heads(s)}, cover ${pip(s)}${i === hand ? ', you stand here' : ''}`).join('. ')}. Their move: ${their}${feint ? ', may feint' : ''}.${began ? ` ${pending ? comeSay(left, pending) : `${left} of their ${began} still up`}; ${breakAt ? `they break at ${breakAt}` : 'they fight to the last'}.` : ''}${wave ? ` ${wave}` : ''}`;
  return `<svg class="board" viewBox="0 0 360 ${H}" role="img" aria-label="${label}"><rect x="0" y="0" width="360" height="${H}" fill="#050a11"/>${cells}${arrow}${count}${waveLine}</svg>`;
}
