'use strict';

// The hired hand's sheet, and the one rule every roll of theirs goes through. Four stats, each 1 to 5, set at the sign-on from the
// start background and the post and moved only by scenes, never bought: hands (the work, the fight), eye (the shot, the read, the
// watch), nerve (the bold call, the standoff) and wit (the word, the relay, the sum). The posts are the skills, each on a stat, with
// their points and levels as before (skillLevel, hired.js). Pure: it reads nothing of the game, so it runs in plain Node
// (tests/sheet.test.js); the callers pass the stat and the level in. Loaded after util.js.
//
// The rule: check(stat, skill, difficulty, edge) is the odds a roll goes the hand's way, from even odds at the base stat with no
// skill: a twentieth for each point of stat above or below the base, a tenth for each level of the skill, less the scene's
// difficulty, plus whatever edge the scene gives (a crew member's help, the captain's trust, the boresighted guns), clamped so no
// roll is hopeless or sure. The difficulties are set so a roll at the base stat lands where its own formula did before the sheet
// (#679): the post's own move even, the solo roll a twentieth under, a job and a word with the captain three twentieths under.

const STATS = ['hands', 'eye', 'nerve', 'wit'];
const POST_STAT = { gunner: 'eye', pilot: 'nerve', engineer: 'hands', comms: 'wit' };
const BACKGROUND_STAT = { earth: 'wit', mars: 'nerve', belt: 'hands' };
const STAT_BASE = 3, STAT_MAX = 5, STAT_STEP = 0.05, SKILL_STEP = 0.1, CHECK_MIN = 0.05, CHECK_MAX = 0.9;
// What a kind of roll takes off even odds: the post's own move in a fight or a contact, the job of a post done alone (a bold call, an
// order given yourself), a job ashore, a word put to the captain (the pitch, a post asked for), and a bar fight with nobody at your back.
const DIFFICULTY = { post: 0, solo: 0.05, job: 0.15, word: 0.15, brawl: 0.1 };

// The sheet at the sign-on: every stat at the base, the post's stat a point up, and the background's a point up.
function newSheet(background, post) {
  const sheet = Object.fromEntries(STATS.map(s => [s, STAT_BASE]));
  for (const s of [POST_STAT[post], BACKGROUND_STAT[background]]) if (s) sheet[s] = Math.min(STAT_MAX, sheet[s] + 1);
  return sheet;
}

const check = (stat, skill, difficulty, edge = 0) => Math.max(CHECK_MIN, Math.min(CHECK_MAX, 0.5 + STAT_STEP * (stat - STAT_BASE) + SKILL_STEP * skill - difficulty + edge));

// The kit (#683): things the hand carries, each adding to a kind of check (the keys of DIFFICULTY). They come from arcs and scenes (arcs.js), never from a shop; the
// hand's save keeps their ids (st.hired.kit) and this table says what each is and does. kitEdge is the edge the kit gives a kind of roll, for check's last argument.
const KIT_ITEMS = {
  'valve-keys': { name: 'a roll of valve keys', adds: { job: 0.05 }, cover: [0, 1, 0] },  // the Hollows' pump crew, from the water dispute (stories/arc-league.js); they open the service crawl, so the corridor has a point more cover in a lock fight
  'audit-seal': { name: 'a Fleet audit seal', adds: { word: 0.05 } },  // the auditor's, from the air audit (stories/arc-concord.js)
  'carrier-license': { name: 'a Compact carrier license', adds: { solo: 0.05 } },  // the licensing officer's, from the license inspection (stories/arc-compact.js)
};
// The cover the kit gives a section of the ship in a lock fight (handtohand.js): the sum over the items, by the section's place (0 to 2).
const kitCover = (kit, pos) => (kit || []).reduce((n, id) => n + (((KIT_ITEMS[id] || {}).cover || [])[pos] || 0), 0);
// What the hand takes with them when the chapter ends and the ship is bought (#685): the sheet, the kit and the shippers' regard (the post they work and what they have learned at each, and the day they signed on and the captain's id, for the board's dice), as the record the next chapter reads. It has the hand's own
// field names, so what reads a hand's sheet, kit or standing reads this the same (hired.js career()). An old save with no sheet has none, which is every stat at the base.
const careerOf = h => ({ sheet: h.sheet ? { ...h.sheet } : null, kit: [...(h.kit || [])], standing: { ...(h.standing || {}) }, post: h.post, skill: { ...(h.skill || {}) }, since: h.since, captain: h.captain });  // since and captain only seed the day's board, so it is not the same in every game (contracts.js)
const kitEdge = (kit, kind) => (kit || []).reduce((n, id) => n + (((KIT_ITEMS[id] || {}).adds || {})[kind] || 0), 0);

// The sheet as rows for the sheet console (#687): each stat with its value, and the posts that sit on it; the kit with what each item adds, in
// words. Pure: the caller passes the hand's sheet and kit. A hand from before the sheet was kept has every stat at the base.
const KIND_WORDS = { post: 'your own move in a fight', solo: 'a bold call of your own', job: 'jobs ashore', word: 'a word with the captain', brawl: 'a bar fight' };
const COVER_WORDS = ['the lock', 'the corridor', 'the bridge'];  // the sections of the ship a kit item's cover is indexed by (handtohand.js)
function sheetRows(sheet, kit) {
  return {
    stats: STATS.map(stat => ({ stat, value: sheet && sheet[stat] !== undefined ? sheet[stat] : STAT_BASE, posts: Object.keys(POST_STAT).filter(p => POST_STAT[p] === stat) })),
    kit: (kit || []).filter(id => KIT_ITEMS[id]).map(id => ({ id, name: KIT_ITEMS[id].name, adds: [...Object.entries(KIT_ITEMS[id].adds || {}).map(([kind, n]) => `${KIND_WORDS[kind] || kind} +${Math.round(n * 100)}%`), ...(KIT_ITEMS[id].cover || []).map((n, i) => (n ? `+${n} cover in ${COVER_WORDS[i]}` : '')).filter(Boolean)].join(', ') })),
  };
}

