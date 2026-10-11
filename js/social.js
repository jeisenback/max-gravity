'use strict';

// Life between people, and the culture they share. Everyone aboard (crew, and passengers
// you know by name) has a bond with everyone else in st.bonds: it drifts with shared
// tastes and clashing traits over a burn, and moves with what happens aboard. Each
// person has tastes (a favorite kind of vid or book, and a ring-ball team from home).
//
// The culture: what is on follows the yearly calendar in calendar.js (shows, books,
// leagues, one-off broadcasts), with a song and a couple of stars for the gossip feeds
// each year, and each league's table and results in st.culture. It reaches you as feed
// chatter in transit, crew reactions, and headlines at port. Downtime activities (watching together, passing
// a book around, streaming a match, card night) and relationship scenes in transit
// build or break bonds. Passengers who liked the trip may be waiting at a later port
// to book again. Loaded before game.js; only calls into it at runtime.

const MATCH_EVERY = 4;
const GENRES = {
  noir: 'Warren noir', war: 'war drama', soap: 'station soap', romance: 'romance',
  comedy: 'comedy', horror: 'horror', doc: 'documentary', action: 'action serial',
};
const BANDS = ['The Pallas Smelt', 'Nine Sector', 'Dust Choir', 'Red Tide Brass', 'Luna Static', 'Hollow Moons', 'Vesna and the Welders', 'Low Orbit', 'The Ration Cards', 'Kez Ghosh Trio'];
const TITLE_A = ['Cold', 'Silent', 'Last', 'Red', 'Hollow', 'Burning', 'Long', 'Bright', 'Broken', 'Iron', 'Quiet', 'Drifting', 'Borrowed', 'Salt'];
const TITLE_N = ['Orbit', 'Harbor', 'Tide', 'Signal', 'Dust', 'Ice', 'Garden', 'Line', 'Horizon', 'Station', 'Promise', 'Crown', 'Rations', 'Water'];
const PLACES = ['Ceres', 'Luna', 'the Belt', 'Tharsis', 'Europa', 'Titan', 'Pallas', 'Hellas', 'Ganymede', 'Hygiea'];
const HOME_CULTURE = { 'Ceres Station': 'belt', 'The Rook': 'belt', Mars: 'mars', Luna: 'earth', Ganymede: 'earth' };

const title = () => pick([
  () => `The ${pick(TITLE_A)} ${pick(TITLE_N)}`, () => `${pick(TITLE_N)} of ${pick(PLACES)}`,
  () => `${pick(TITLE_A)} ${pick(TITLE_N)}`, () => `Beyond ${pick(PLACES)}`, () => `${pick(TITLE_N)} Over ${pick(PLACES)}`,
])();
const who = () => { const p = makePerson(); return `${p.first} ${p.last}`; };

// ---------- the year ----------
// The game date a downtime or a feed is about: mid-burn, the day the ship has reached.
function cultureToday() {
  const st = G.state, t = G.transit;
  return t && t.total > 0 ? st.day + Math.floor((1 - t.left / t.total) * t.days) : st.day;
}

function culture() {
  const st = G.state, y = calOf(st.day).y;
  // Saves from before the calendar (one hit show a season) start the calendar here.
  if (!st.culture || st.culture.v !== 2) st.culture = { v: 2, lg: {}, last: null };
  const c = st.culture;
  if (c.year !== y) {
    c.year = y;
    c.song = { title: title(), band: pick(BANDS) };
    c.stars = [who(), who()];
  }
  return c;
}

// A league's table and results for the season it is in, started fresh with each one.
function season(l) {
  const c = culture(), { key } = leagueSeason(l, G.state.day);
  if (!c.lg[l.id] || c.lg[l.id].key !== key) c.lg[l.id] = { key, table: Object.fromEntries(l.teams.map(t => [t, 0])), next: G.state.day, champ: null, last: null };
  return c.lg[l.id];
}

const leader = s => Object.entries(s.table).sort((a, b) => b[1] - a[1])[0];
const topTwo = s => Object.entries(s.table).sort((a, b) => b[1] - a[1]).slice(0, 2).map(e => e[0]);
const leagueOf = team => LEAGUES.find(l => l.teams.includes(team));

// A match between two teams of a league (random ones if not given). Returns the result.
function playMatch(l, a, b) {
  const s = season(l), c = culture();
  if (!a) a = pick(l.teams);
  while (!b || b === a) b = pick(l.teams);
  let sa = randInt(0, 5), sb = randInt(0, 5);
  if (sa === sb) (Math.random() < 0.5 ? sa++ : sb++);  // no draws
  s.table[sa > sb ? a : b]++;
  return (s.last = c.last = { league: l.id, a, b, sa, sb, winner: sa > sb ? a : b, loser: sa > sb ? b : a, day: G.state.day });
}

function crown(l, s, team) {
  s.champ = team;
  worldNews(`The ${team} win the ${l.name}. Their fans will be unbearable for months.`);
}

// The final between the top two; it is only played once.
function playFinal(l) {
  const s = season(l);
  if (s.champ) return s.last;
  const [a, b] = topTwo(s), m = playMatch(l, a, b);
  crown(l, s, m.winner);
  return m;
}

function cultureDay() {
  const day = G.state.day;
  for (const l of LEAGUES) {
    const s = season(l), ph = leaguePhase(l, day);
    if (ph === 'regular' || ph === 'playoffs') {
      if (day >= s.next) { ph === 'regular' ? playMatch(l) : playMatch(l, ...topTwo(s)); s.next = day + MATCH_EVERY; }
    } else if (ph === 'final') playFinal(l);
    else if (ph === 'off-season' && !s.champ && s.last) crown(l, s, leader(s)[0]);  // the final was missed
  }
}

// ---------- people aboard, tastes, and bonds ----------
function folk() {
  const st = G.state, out = st.crew.map(id => ({ id, p: person(id), crew: true }));
  for (const m of paxAboard()) if (m.pid && st.people[m.pid]) out.push({ id: m.pid, p: st.people[m.pid], crew: false });
  return out;
}

function tastes(f) {
  const h = s => Math.abs(hash(f.id + s)), culture = f.p.culture || HOME_CULTURE[f.p.home] || 'earth';
  const teams = Object.keys(TEAMS).filter(t => TEAMS[t] === culture);
  return { genre: Object.keys(GENRES)[h('g') % 8], team: teams[h('t') % teams.length] };
}

const bondKey = (a, b) => [a.id, b.id].sort().join('|');
const bonds = () => (G.state.bonds = G.state.bonds || {});
const bond = (a, b) => bonds()[bondKey(a, b)] || 0;
function addBond(a, b, n) {
  const k = bondKey(a, b);
  if (n > 0) n *= Math.max(0.15, 1 - Math.max(0, (bonds()[k] || 0) - 1) / 6);  // a close bond is slower to deepen
  bonds()[k] = Math.max(-10, Math.min(10, (bonds()[k] || 0) + n));
  if (G.shifts && n) G.shifts.push({ a: a.p, b: b.p, n });
}
function bondWord(n) {
  return n >= 6 ? 'close' : n >= 3 ? 'friends' : n >= 1 ? 'friendly' : n > -1 ? null : n > -3 ? 'prickly' : n > -6 ? 'rivals' : 'can\'t stand each other';
}
const pairs = list => list.flatMap((a, i) => list.slice(i + 1).map(b => [a, b]));
const has = (f, t) => (f.p.traits || []).includes(t);
const CLASHES = [['rude', 'nervous'], ['drunk', 'pious'], ['greedy', 'generous'], ['talkative', 'secretive'], ['rude', 'kind']];
const clash = (a, b) => CLASHES.some(([x, y]) => (has(a, x) && has(b, y)) || (has(a, y) && has(b, x)));

// A day together aboard: shared tastes pull people together, clashing habits apart.
function bondDay() {
  if (!G.transit) return;
  for (const [a, b] of pairs(folk())) {
    const ta = tastes(a), tb = tastes(b);
    let d = (ta.genre === tb.genre ? 0.1 : 0) + (ta.team === tb.team ? 0.06 : 0) + (clash(a, b) ? -0.2 : 0) + factionPull(a.p, b.p);
    if (bond(a, b) >= 6 && clash(a, b)) d += 0.2;  // love conquers some things
    addBond(a, b, d);
  }
}

// ---------- the feeds ----------
function feedLine() {
  const c = culture(), st = G.state, day = cultureToday(), show = pick(airing(day)), book = pick(newBooks(day)), g = GENRES[show.genre], [s1, s2] = c.stars;
  const lines = [
    `"${show.title}" is the most-watched ${g} on the Mars feeds this week.`,
    `Critics on Luna call "${show.title}" ${pick(['"a triumph"', '"two hours I want back"', '"overlong but gorgeous"', '"a crime against drama"', '"the best thing since the Belt Wars series"'])}.`,
    `Episode ${show.ep} of "${show.title}" ends on a cliffhanger. Half the Belt is furious.`,
    `"${book.title}" by ${book.author} tops the reading lists again.`,
    `${book.author} denies that "${book.title}" is about a real Compact admiral.`,
    `"${c.song.title}" by ${c.song.band} is on every station playlist from Mercury to Titan.`,
    `${c.song.band} cancel their Ceres concert, citing "water ration reasons".`,
    `${s1}, star of "${show.title}", was spotted on ${pick(PLACES)} with ${s2}. Nobody is confirming anything.`,
    `${s1} walked off the set of "${show.title}" after a fight about the lighting.`,
    `${s2} and ${s1} are feuding on the feeds again. It is the best thing on.`,
    `A leaked script says ${s1}'s character dies in the "${show.title}" finale.`,
    `${s2} gives a two-hour interview about "${show.title}" and does not mention ${s1} once. The comments are on fire.`,
    `Fans of "${show.title}" on Ceres have started a petition to bring back a character nobody remembers. It has four hundred thousand signatures.`,
    `A bootleg cut of "${show.title}" is doing the rounds on the Belt stations, with a much better ending and a much worse soundtrack.`,
    `${book.author} announces a sequel to "${book.title}", and a small riot breaks out in a bookshop on Luna.`,
    `Somebody on Mars has started a podcast that only discusses one chapter of "${book.title}", and it is somehow already on its ninth season.`,
    `${c.song.band} play a surprise show at a smelter on Pallas, and the crowd sings every word back. The refinery has the footage.`,
    `A cover of "${c.song.title}" sung by a hauler crew in the ice lanes is quietly going around, and it is, by any measure, better than the original.`,
    `The feeds report that the water price on Ceres has become, once more, the only story anyone wants to talk about.`,
    `An old Belt comedian retires, after fifty years, with a last show that ends with a joke about recyclers. Every station stops to watch.`,
    `A kid on Ganymede beats the record for most consecutive ring-ball goals, and the entire agri-dome has declared a holiday.`,
    `Somebody in the Compact's press office accidentally posts the wrong file, and spends an afternoon being the most-quoted person in the system.`,
    `A new food craze sweeps the outer stations: it is noodles, again, but this time with, of all things, cheese.`,
    `Weather on Earth: rain for the ninth day running. The feeds, by popular demand, have started a rain channel, and it is astonishingly popular in the Belt.`,
    `A long, gentle documentary about the ice haulers of Europa is being watched on every ship in the outer system. It has no plot. People are crying anyway.`,
  ];
  if (show.premiere) lines.push(`"${show.title}" premieres this week, and the feeds are already calling it the show of the year.`);
  if (show.finale) lines.push(`The finale of "${show.title}" is on this week. Half the system has cleared its schedule.`);
  for (const b of broadcastsOn(day)) lines.push(`Tonight on every feed: "${b.title}". ${b.blurb}`);
  const l = pick(LEAGUES), ls = season(l), ph = leaguePhase(l, day), top = leader(ls);
  if (ph === 'preseason') lines.push(`The ${l.name} is back in a few weeks, and the ${pick(l.teams)} have signed a new striker, or so they say.`);
  else if (ph === 'playoffs') lines.push(`${l.name} playoffs: the ${topTwo(ls).join(' and the ')} are through, and everyone else is pretending to be fine.`);
  else if (ph === 'final') lines.push(`It is the ${l.name} final tonight, ${topTwo(ls).join(' against ')}. Every bar from here to Titan is full.`);
  else if (ls.last && ph === 'regular') lines.push(`${l.sport[0].toUpperCase()}${l.sport.slice(1)}: ${ls.last.a} ${ls.last.sa}, ${ls.last.b} ${ls.last.sb}.`);
  if (ph === 'regular' && top[1] > 0) lines.push(`The ${top[0]} lead the ${l.name} with ${top[1]} wins.`);
  if (ph === 'off-season' && ls.champ) lines.push(`The ${ls.champ} are still celebrating their ${l.name} title, and the other fans are sick of it.`);
  const w = factionState().war;
  if (w) lines.push(`War dramas are all anyone in ${w.a} space watches now, and the ${w.b} feeds are no better.`);
  // Dock gossip about people you know.
  const known = Object.values(st.people).filter(p => p.location && p.memories.length && Math.abs(p.opinion) >= OPINION.NOTABLE);
  if (known.length) {
    const p = pick(known), mem = p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '');
    lines.push(`Dock gossip from ${p.location}: ${p.first} ${p.last} is still telling anyone who listens, "${mem}"`);
  }
  return `[Feed] ${pick(lines)}`;
}

// What people aboard say about the culture and each other.
function socialLines() {
  const c = culture(), list = folk(), out = [], day = cultureToday(), on = airing(day), books = newBooks(day), show = pick(on), book = pick(books);
  for (const f of list) {
    const t = tastes(f), n = f.p.first;
    if (c.last && c.last.day >= G.state.day - 3 && (t.team === c.last.winner || t.team === c.last.loser)) {
      const rival = list.find(o => o !== f && tastes(o).team === (t.team === c.last.winner ? c.last.loser : c.last.winner));
      out.push(t.team === c.last.winner
        ? `${n}: "${t.team}, ${Math.max(c.last.sa, c.last.sb)} to ${Math.min(c.last.sa, c.last.sb)}!${rival ? ` Pay up, ${rival.p.first}.` : ''}"`
        : `${n} does not want to talk about the ${t.team} game.`);
    }
    const fav = on.find(x => x.genre === t.genre), read = books.find(x => x.genre === t.genre);
    if (fav) out.push(`${n} is ${fav.finale ? 'dreading the finale of' : 'rewatching'} "${fav.title}" in their bunk${fav.finale ? '' : '. Again'}.`);
    if (read) out.push(`${n} is halfway through "${read.title}" and keeps reading bits aloud.`);
  }
  out.push(`Someone has had "${c.song.title}" stuck in their head since the last port, and now so does everyone.`);
  if (list.length) out.push(`${pick(list).p.first} is humming the theme from "${show.title}" in the corridor, and does not know they are doing it.`,
    `The galley wall now has a hand-lettered ring-ball league table, and it is being updated with a great deal of feeling.`,
    `There is a heated, low-voiced debate in the galley about whether "${book.title}" is better than the vid. It has been going on since breakfast.`,
    `Somebody has left a mug of cold tea on every flat surface in the ship, and nobody will admit to it.`);
  for (const [a, b] of pairs(list)) {
    const n = bond(a, b), A = a.p.first, B = b.p.first;
    if (n >= 6) out.push(`${A} and ${B} have pushed their bunks together. Nobody says anything.`, `${A} saved ${B} the last of the good coffee.`);
    else if (n >= 3) out.push(`${A} and ${B} are laughing at something on ${A}'s terminal.`, `${A} is teaching ${B} a card game from ${a.p.home}.`);
    else if (n <= -3) out.push(`${A} and ${B} are not speaking. It is a small ship.`, `${A} ate ${B}'s labeled rations. On purpose, according to ${B}.`);
  }
  return out;
}

// ---------- downtime together ----------
const everyone = () => { for (const p of shipPeople()) goTo(p, 'galley'); };
const names = list => (list.length > 1 ? `${list.slice(0, -1).map(f => f.p.first).join(', ')} and ${list[list.length - 1].p.first}` : list[0].p.first);

function shareActivity(genre, fanBonus) {
  const list = folk(), fans = list.filter(f => tastes(f).genre === genre);
  for (const [a, b] of pairs(list)) addBond(a, b, 0.5 + (fans.includes(a) && fans.includes(b) ? fanBonus : 0));
  for (const f of fans) like(f.p, 1, null);
  return { list, fans, bored: list.filter(f => !fans.includes(f)) };
}

// What the ship can do with what is on: each takes the show, book or league and
// returns a downtime choice. Tastes decide who enjoys it.
const watchShow = show => ({
  label: `Watch "${show.title}", ${show.premiere ? 'the premiere' : show.finale ? 'the finale' : `episode ${show.ep}`}`, can: () => folk().length > 0,
  run() {
    const { fans, bored, list } = shareActivity(show.genre, 1.5);
    everyone();
    const feud = pairs(list).find(([a, b]) => bond(a, b) <= -3);
    return [`You crowd into the galley for ${show.premiere ? 'the premiere' : show.finale ? 'the finale' : `episode ${show.ep}`} of "${show.title}", a ${GENRES[show.genre]}.`,
      fans.length ? `${names(fans)} ${fans.length > 1 ? 'know' : 'knows'} every line.` : 'Nobody is a fan.',
      bored.length ? `${pick(bored).p.first} falls asleep before the first act break.` : '',
      feud ? `${feud[0].p.first} and ${feud[1].p.first} argue about the ending for an hour, which is almost friendly.` : ''].filter(Boolean).join(' ');
  },
});

const readBook = book => ({
  label: `Pass around "${book.title}"`, can: () => folk().length > 0,
  run() {
    const { fans, bored } = shareActivity(book.genre, 2);
    return [`The ship's one printed copy of "${book.title}" by ${book.author} does the rounds.`,
      fans.length ? `${names(fans)} ${fans.length > 1 ? 'fight over who reads it next' : 'reads it twice'}.` : '',
      bored.length ? `${pick(bored).p.first} leaves pointed notes in the margins.` : '',
      fans.length > 1 ? 'By the end of the burn there is a book club, and it has opinions.' : ''].filter(Boolean).join(' ');
  },
});

const watchBroadcast = b => ({
  label: `Watch "${b.title}", tonight only`, can: () => folk().length > 0,
  run() {
    const { fans, bored } = shareActivity(b.genre, 1.5);
    everyone();
    return [`Everyone crowds into the galley for "${b.title}". ${b.blurb}`,
      fans.length ? `${names(fans)} ${fans.length > 1 ? 'were' : 'was'} not going to miss it for anything.` : 'Nobody aboard is a fan, but nobody leaves, either.',
      bored.length ? `${pick(bored).p.first} complains the whole way through, and stays to the end.` : ''].filter(Boolean).join(' ');
  },
});

const streamMatch = l => ({
  label: `Stream the ${l.name} ${{ final: 'final', playoffs: 'playoffs' }[leaguePhase(l, cultureToday())] || 'match'}`, can: () => folk().length > 0,
  run() {
    const list = folk(), mine = [...new Set(list.map(f => tastes(f).team))].filter(t => l.teams.includes(t)), ph = leaguePhase(l, cultureToday());
    const m = ph === 'final' ? playFinal(l) : playMatch(l, ...(ph === 'playoffs' ? topTwo(season(l)) : mine));
    const won = list.filter(f => tastes(f).team === m.winner), lost = list.filter(f => tastes(f).team === m.loser);
    for (const [a, b] of pairs(list)) {
      const ta = tastes(a).team, tb = tastes(b).team;
      addBond(a, b, ta === tb ? 1.5 : (won.includes(a) && lost.includes(b)) || (won.includes(b) && lost.includes(a)) ? (has(a, 'rude') || has(b, 'rude') ? -1 : 0.5) : 0.5);
    }
    for (const f of won) like(f.p, 1, null);
    everyone();
    return [`The lagged stream from ${pick(PLACES)} comes in: ${m.a} against ${m.b}, ${l.sport}. Final score ${m.sa} to ${m.sb}.`,
      won.length ? `${names(won)} ${won.length > 1 ? 'are' : 'is'} unbearable for the rest of the day.` : '',
      lost.length ? `${names(lost)} ${lost.length > 1 ? 'take' : 'takes'} it ${lost.some(f => has(f, 'rude')) ? 'badly' : 'with some grace'}.` : '',
      !won.length && !lost.length ? 'Nobody aboard cares who wins, so everyone picks a side for the fun of it.' : ''].filter(Boolean).join(' ');
  },
});

// Up to three things that are on now: a one-off if there is one, then shows, a live
// league and a new book in turn, rotating with the date so it is not always the same.
function onNow() {
  const day = cultureToday(), spin = xs => (xs.length ? xs.slice(day % xs.length).concat(xs.slice(0, day % xs.length)) : xs);
  const mine = new Set(folk().map(f => tastes(f).team));
  const live = LEAGUES.filter(l => ['regular', 'playoffs', 'final'].includes(leaguePhase(l, day))).sort((a, b) => b.teams.filter(t => mine.has(t)).length - a.teams.filter(t => mine.has(t)).length);
  const lanes = [spin(airing(day)).map(watchShow), live.map(streamMatch), spin(newBooks(day)).map(readBook)];
  const out = broadcastsOn(day).slice(0, 1).map(watchBroadcast);
  for (let i = 0; out.length < 3 && lanes.some(l => l.length > i); i++) for (const lane of lanes) if (lane[i] && out.length < 3) out.push(lane[i]);
  return out;
}

const SOCIAL_ACTIVITIES = {
  cards: {
    label: () => 'Card night', can: () => folk().length > 0,
    run() {
      const list = folk(), st = G.state;
      for (const [a, b] of pairs(list)) addBond(a, b, 0.7);
      everyone();
      if (Math.random() < 0.35) {
        const won = randInt(2, 6) * 100;
        st.credits += won;
        return `You clean everyone out for ${fmt(won)} cr. ${pick(list).p.first} swears the deck is marked. It isn't. Probably.`;
      }
      const w = pick(list), lost = Math.min(st.credits, randInt(1, 4) * 100), gossip = socialLines().filter(l => / and /.test(l));
      st.credits -= lost;
      return `${w.p.first} takes the pot, and ${fmt(lost)} cr of yours with it. Over the last hand you hear the ship's gossip${gossip.length ? `: ${pick(gossip)}` : ', which is mostly about you.'}`;
    },
  },
};

// ---------- relationship scenes in transit ----------
const CAUSES = [
  'the last of the coffee',
  'music in the berths at all hours',
  'a ring-ball bet',
  'whose turn it is to scrub the recycler',
  'a borrowed jacket that came back torn',
  'the thermostat',
  'who left the galley light on',
  'a joke that went too far at breakfast',
  'a book that was never returned',
  'the way somebody chews',
  'a promise about a shift swap',
  'the good pillow',
  'whether the cat is allowed on the console',
  'a sock that has been in the corridor for a week'
];
// A repeatable scene waits its turn per pair, so the same two people do not have the
// same talk every burn: isCooled asks, cool starts the wait.
const isCooled = (a, b, what, days) => { const d = (G.state.qualities || {})[`social:cool:${what}:${bondKey(a, b)}`]; return d !== undefined && G.state.day - d < days; };
const cool = (a, b, what) => { (G.state.qualities = G.state.qualities || {})[`social:cool:${what}:${bondKey(a, b)}`] = G.state.day; };
const stamped = (a, b, what) => {
  const st = G.state.qualities = G.state.qualities || {}, k = `social:${what}:${bondKey(a, b)}`;
  if (st[k]) return true;
  st[k] = 1;
  return false;
};

// The scenes that came up most often: each kind waits this many days crew-wide, however many pairs could have one.
const REL_GAP = { feud: 20, match: 20, roots: 25, cover: 30, word: 30 };
const relReady = kind => { const at = (G.state.relAt || {})[kind]; return at === undefined || G.state.day - at >= REL_GAP[kind]; };
const relMark = kind => { (G.state.relAt = G.state.relAt || {})[kind] = G.state.day; };

// More shapes for the scenes that came up most, so the same four titles do not carry most of the talk: a feud over the watch log
// or in silence as well as in the galley, a match argued over after the fact, and a dish from home.
function feudHandover(a, b, A, B) {
  const say = socialSay('handover');
  return {
    title: say('title'), text: say('text', { A, B }),
    choices: [
      { label: say('c0.label'), run() { const [w, l] = pick([[a, b], [b, a]]); like(w.p, 1, null); like(l.p, -1, `You ruled against me on the log.`); addBond(a, b, -0.5); return say('c0.result', { winner: w.p.first, loser: l.p.first }); } },
      { label: say('c1.label'), run() { addBond(a, b, -0.5); return say('c1.result', { A, B }); } },
      { label: say('c2.label'), run() {
        if (Math.random() < 0.5) { addBond(a, b, 2); return say('c2.win', { B, A }); }
        addBond(a, b, -1); return say('c2.lose');
      } },
    ],
  };
}

function feudShoulders(a, b, A, B) {
  const say = socialSay('cold-shoulders');
  const cook = G.state.crew.map(person).find(c => c && c.role === 'cook' && c !== a.p && c !== b.p);
  return {
    title: say('title'), text: say('text', { A, B, via: cook ? cook.first : 'whoever is nearest' }),
    choices: [
      { label: say('c0.label'), run() {
        if (Math.random() < 0.55) { addBond(a, b, 2); return say('c0.win'); }
        addBond(a, b, -1); return say('c0.lose');
      } },
      { label: say('c1.label'), run() { addBond(a, b, 0.5); like(a.p, 1, null); like(b.p, 1, null); return say('c1.result', { A, B }); } },
      { label: say('c2.label'), run() { addBond(a, b, -1); return say('c2.result', { via2: cook ? cook.first : 'anyone' }); } },
    ],
  };
}

function matchReplay(a, b, ta, tb) {
  const say = socialSay('replay');
  return {
    title: say('title'), text: say('text', { A: a.p.first, ta, B: b.p.first, tb }),
    choices: [
      { label: say('c0.label'), run() {
        const m = playMatch(leagueOf(ta), ta, tb), [w, l] = m.winner === ta ? [a, b] : [b, a];
        like(w.p, 1, null); addBond(a, b, has(l, 'rude') ? -1 : 0.5);
        return say('c0.result', { ma: m.a, msa: m.sa, mb: m.b, msb: m.sb, winner: w.p.first, loser: l.p.first });
      } },
      { label: say('c1.label'), run() { const [w, l] = pick([[a, b], [b, a]]); like(w.p, 1, null); like(l.p, -1, `You ruled against my side on the old call.`); return say('c1.result', { winner: w.p.first, loser: l.p.first }); } },
      { label: say('c2.label'), run() { addBond(a, b, 0.5); return say('c2.result'); } },
    ],
  };
}

function rootsRecipe(a, b, A, B) {
  const say = socialSay('recipe');
  const home = a.p.home === b.p.home ? a.p.home : 'home';
  return {
    title: say('title'), text: say('text', { A, B, home }),
    choices: [
      { label: say('c0.label'), can: () => G.state.credits >= 150, run() { G.state.credits -= 150; addBond(a, b, 3); like(a.p, 1, null); like(b.p, 1, null); return say('c0.result', { A, B }); } },
      { label: say('c1.label'), run() { addBond(a, b, 1.5); return say('c1.result'); } },
    ],
  };
}

function coverWatchScene(p) {
  const say = socialSay('cover-watch');
  const post = postOfRole(p.role), n = p.first;
  relMark('cover');
  return {
    title: say('title'), text: say('text', { n, post: POSTS[post].name.toLowerCase() }),
    choices: [
      { label: say('c0.label', { n }), run() { like(p, 2, `You covered my watch so I could make a call.`); p.owes = G.state.day; return say('c0.result', { n, post: POSTS[post].name.toLowerCase(), learn: learnAt(post, 3) }); } },
      { label: say('c1.label'), run() { return say('c1.result', { n }); } },
    ],
  };
}

// The scenes two people aboard can have, one function each, so that a scene can be built on its own: the scene editor plays one (#457), and relationshipScene picks among them.
function galleyDuty(a, b, ta, tb) {
  const say = socialSay('galley-duty');
  const st = G.state;
  return {
      title: say('title'), text: pick([
        say('text.0', { A: a.p.first, B: b.p.first, ta, tb }),
        say('text.1', { B: b.p.first, A: a.p.first, ta, tb }),
        say('text.2', { A: a.p.first, ta, B: b.p.first, tb }),
        say('text.3', { ta, tb, A: a.p.first, B: b.p.first }),
      ]),
      choices: [
        { label: say('c0.label'), run() {
          const m = playMatch(leagueOf(ta), ta, tb), [w, l] = m.winner === ta ? [a, b] : [b, a];
          addBond(a, b, has(l, 'rude') ? -1 : 1);
          like(w.p, 1, null);
          return `${m.a} ${m.sa}, ${m.b} ${m.sb}. ${say(has(l, 'rude') ? 'c0.rude' : 'c0.easy', { loser: l.p.first })}`;
        } },
        { label: say('c1.label', { ta }), can: () => st.credits >= 300, run() {
          const m = playMatch(leagueOf(ta), ta, tb), won = m.winner === ta;
          st.credits += won ? 300 : -300;
          like(a.p, won ? 1 : 0, null); like(b.p, won ? -1 : 1, null);
          return `${m.a} ${m.sa}, ${m.b} ${m.sb}. ${say(won ? 'c1.win' : 'c1.lose', { A: a.p.first, B: b.p.first })}`;
        } },
        { label: say('c2.label'), run: () => say('c2.result') },
    ],
  };
}

function wordScene(a, b, n) {
  const say = socialSay('word');
  return {
    title: say(hired() ? 'title.hired' : 'title'), text: say(hired() ? 'text.hired' : 'text', { A: a.p.first, B: b.p.first, mood: say(n > 0 ? 'mood.warm' : 'mood.tight') }),
    choices: [
      { label: say('c0.label', { B: b.p.first }), run() { addBond(a, b, n > 0 ? 2 : 1.5); return say(n > 0 ? 'c0.warm' : 'c0.tight', { A: a.p.first }); } },
      hired() ? { label: say('c1.hired.label'), run() { like(a.p, -1, null); return say('c1.hired.result', { A: a.p.first }); } }
        : { label: say('c1.label'), run() { like(a.p, -1, null); return say('c1.result', { A: a.p.first }); } },
      { label: say('c2.label', { B: b.p.first }), run() {
        like(a.p, 1, null);
        const adj = (b.p.traits || []).length ? TRAITS[b.p.traits[0]].adj : '';
        return say('c2.result', { A: a.p.first, B: b.p.first, trait: adj ? `${adj[0].toUpperCase()}${adj.slice(1)}, mostly. ` : '', genre: GENRES[tastes(b).genre] });
      } },
    ],
  };
}

function grandTour(c, p) {
  const say = socialSay('grand-tour');
  return {
        title: say('title'), text: say('text', { host: c.p.first, guest: p.p.first, visitor: say(has(p, 'nervous') ? 'visitor.nervous' : 'visitor.keen', { guest: p.p.first }) }),
        choices: [
          { label: say('c0.label'), run() { addBond(c, p, 2.5); like(p.p, 1, `${c.p.first} showed me around the ship.`); return say('c0.result', { guest: p.p.first, host: c.p.first }); } },
          { label: say('c1.label'), run() { addBond(c, p, -0.5); return say('c1.result', { host: c.p.first, guest: p.p.first }); } },
      ] };
}

function smallSystem(a, b, A, B) {
  const say = socialSay('small-system');
  const st = G.state;
  return {
      title: say('title'), text: a.p.home === b.p.home
        ? pick([
          say('text.home.0', { A, B, home: a.p.home, team: tastes(a).team }),
          say('text.home.1', { A, B, home: a.p.home }),
        ])
        : pick([
          say('text.culture.0', { A, B }),
          say('text.culture.1', { B, A }),
        ]),
      choices: [
        { label: say('c0.label'), can: () => st.credits >= 200, run() { st.credits -= 200; addBond(a, b, 3); like(a.p, 1, null); like(b.p, 1, null); return say('c0.result', { where: a.p.home === b.p.home ? a.p.home : 'home', A, B }); } },
        { label: say('c1.label'), run() { addBond(a, b, 1.5); return say('c1.result'); } },
      ] };
}

function smallShip(a, b, A, B) {
  const say = socialSay('small-ship');
  const cause = pick(CAUSES);
  return {
        title: say('title'), text: pick([
          say('text.0', { A, B, cause }),
          say('text.1', { A, B, cause }),
          say('text.2', { A, B, cause }),
          say('text.3', { A, B, cause }),
        ]),
        choices: [
          { label: say('c0.label', { A }), run() { like(a.p, 1, null); like(b.p, -2, `You sided with ${A} against me.`); addBond(a, b, -1); return say('c0.result', { A, B }); } },
          { label: say('c1.label', { B }), run() { like(b.p, 1, null); like(a.p, -2, `You sided with ${B} against me.`); addBond(a, b, -1); return say('c1.result', { B, A }); } },
          { label: say('c2.label'), run() {
            if (Math.random() < 0.55) { addBond(a, b, 3); return say('c2.win', { A }); }
            addBond(a, b, -1);
            return say('c2.lose', { armor: hurt(0.01) });
          } },
          { label: say('c3.label'), run() { addBond(a, b, 1.5); const [w, l] = pick([[A, B], [B, A]]); return say('c3.result', { winner: w, loser: l }); } },
      ],
  };
}

function closeQuarters(a, b, A, B) {
  const say = socialSay('close-quarters');
  return {
      title: say('title'), text: say('text', { A, B }),
      choices: [
        { label: say('c0.label'), run() { addBond(a, b, 2); like(a.p, 1, null); like(b.p, 1, null); return say('c0.result', { A, B }); } },
        { label: say('c1.label'), run: () => say('c1.result') },
      ] };
}

function shipsRules(a, b, A, B) {
  const say = socialSay('ships-rules');
  return {
      title: say('title'), text: say('text', { A, B }),
      choices: [
        { label: say('c0.label'), run() { like(a.p, 2, `You gave ${B} and me your blessing.`); like(b.p, 2, `You gave ${A} and me your blessing.`); return say('c0.result'); } },
        { label: say('c1.label'), run() { like(a.p, 1, null); like(b.p, 1, null); return say('c1.result', { A, B }); } },
        { label: say('c2.label'), run() { addBond(a, b, -2); like(a.p, -2, `You told ${B} and me to keep it professional.`); like(b.p, -2, `You told ${A} and me to keep it professional.`); return say('c2.result', { A, B }); } },
      ] };
}

// The relationship scenes by id (#457), each built for two people aboard (as folk() lists them): the scene editor plays one this way. Their words are lines (peopletext.js).
const SOCIAL_SCENES = {
  'handover': (a, b) => feudHandover(a, b, a.p.first, b.p.first),
  'cold-shoulders': (a, b) => feudShoulders(a, b, a.p.first, b.p.first),
  'replay': (a, b) => matchReplay(a, b, tastes(a).team, tastes(b).team),
  'recipe': (a, b) => rootsRecipe(a, b, a.p.first, b.p.first),
  'cover-watch': a => coverWatchScene(a.p),
  'ships-rules': (a, b) => shipsRules(a, b, a.p.first, b.p.first),
  'close-quarters': (a, b) => closeQuarters(a, b, a.p.first, b.p.first),
  'small-ship': (a, b) => smallShip(a, b, a.p.first, b.p.first),
  'small-system': (a, b) => smallSystem(a, b, a.p.first, b.p.first),
  'grand-tour': (a, b) => grandTour(a, b),
  'word': (a, b) => wordScene(a, b, 1.5),
  'galley-duty': (a, b) => galleyDuty(a, b, tastes(a).team, tastes(b).team),
  'welcome-back': () => welcomeBack(),
};

function relationshipScene() {
  const list = folk(), st = G.state;
  if (list.length < 2) return null;
  const all = pairs(list), scenes = [];
  for (const [a, b] of all) {
    const n = bond(a, b), A = a.p.first, B = b.p.first;
    if (!hired() && n >= 6 && a.crew && b.crew) scenes.push(() => !stamped(a, b, 'together') && shipsRules(a, b, A, B));
    else if (!hired() && n >= 3 && !isCooled(a, b, 'close', 40)) scenes.push(() => cool(a, b, 'close') || closeQuarters(a, b, A, B));
    if ((n <= -2 || clash(a, b)) && !isCooled(a, b, 'feud', 45) && relReady('feud')) scenes.push(() => {
      cool(a, b, 'feud'); relMark('feud');
      const fk = bondKey(a, b); (st.feuds = st.feuds || {})[fk] = (st.feuds[fk] || 0) + 1;  // a feud that is seen can split the ship (stakes.js)
      const shape = pick(['galley', 'handover', 'shoulders']);
      if (shape === 'handover') return feudHandover(a, b, A, B);
      if (shape === 'shoulders') return feudShoulders(a, b, A, B);
      return smallShip(a, b, A, B);
    });
    if ((a.p.home === b.p.home || (a.p.culture && a.p.culture === b.p.culture)) && n < 3 && relReady('roots')) scenes.push(() => !stamped(a, b, 'roots') && (relMark('roots'), Math.random() < 0.4 ? rootsRecipe(a, b, A, B) : smallSystem(a, b, A, B)));
    if (a.crew !== b.crew) {
      const [c, p] = a.crew ? [a, b] : [b, a];
      scenes.push(() => !stamped(a, b, 'tour') && grandTour(c, p));
    }
  }
  const crew = list.filter(f => f.crew);
  if (crew.length >= 2) {
    const [a, b] = pick(pairs(crew)), n = bond(a, b);
    if (Math.abs(n) >= 1 && !isCooled(a, b, 'word', 30) && relReady('word')) scenes.push(() => (cool(a, b, 'word'), relMark('word'), wordScene(a, b, n)));
  }
  // A friend asks you to cover their watch: you learn their post for a night, and they owe you one.
  const askers = hired() && relReady('cover') ? crew.filter(f => f.p.opinion >= OPINION.CLOSE && postOfRole(f.p.role) && postOfRole(f.p.role) !== hired().post && !f.p.owes) : [];
  // Two fans of different teams, and a match coming up.
  const fans = all.find(([a, b]) => tastes(a).team !== tastes(b).team && leagueOf(tastes(a).team) === leagueOf(tastes(b).team) && !isCooled(a, b, 'match', 25));
  if (fans && relReady('match')) scenes.push(() => {
    const [a, b] = fans, ta = tastes(a).team, tb = tastes(b).team;
    cool(a, b, 'match'); relMark('match');
    if (Math.random() < 0.4) return matchReplay(a, b, ta, tb);
    return galleyDuty(a, b, ta, tb);
  });
  if (askers.length && Math.random() < 0.4) return coverWatchScene(pick(askers).p);  // a friend's ask is not one among a hundred pairs' scenes
  const options = scenes.map(f => f).sort(() => Math.random() - 0.5);
  for (const make of options) { const ev = make(); if (ev) return ev; }
  return null;
}

// A regular back aboard: the crew remember them.
function welcomeBack() {
  const m = paxAboard().find(x => x.regular && !x.welcomed);
  if (!m) return null;
  m.welcomed = true;
  const p = G.state.people[m.pid], me = { id: m.pid, p }, say = socialSay('welcome-back');
  const friends = folk().filter(f => f.crew && bond(f, me) >= 2);
  const mem = p.memories.length ? p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '') : null;
  return {
    title: say('title'), text: [say('text', { first: p.first, last: p.last }), mem ? say('text.memory', { memory: `${mem.charAt(0).toLowerCase()}${mem.slice(1)}` }) : '', friends.length ? say(friends.length > 1 ? 'text.friends' : 'text.friend', { names: names(friends) }) : ''].filter(Boolean).join(' '),
    choices: [
      { label: say('c0.label'), run() { like(p, 1, 'The captain welcomed me back.'); for (const f of friends) addBond(f, me, 1); return say('c0.result', { first: p.first }); } },
    ],
  };
}

// ---------- regulars ----------
// A passenger who liked the trip may be at a later port, asking for your ship by name.
function regularsAt(planet) {
  const st = G.state, aboard = new Set(paxAboard().map(m => m.pid));
  for (const p of Object.values(st.people)) {
    if (!p.trips || p.location !== planet.name || p.opinion < OPINION.FRIEND || st.crew.includes(p.id) || aboard.has(p.id) || (p.nextAsk || 0) > st.day || p.ship) continue;
    p.nextAsk = st.day + 20;
    if (Math.random() > 0.6) continue;
    const reachable = Object.keys(SYSTEMS).filter(id => id !== st.systemId && inRange(st.systemId, id));
    if (!reachable.length) return;
    const sid = pick(reachable), dest = pick(SYSTEMS[sid].planets), days = baseDays(st.systemId, sid);
    const o = makePassengerOffer(st.systemId, sid, dest, days, st.day + days * 2 + 5);
    Object.assign(o, {
      person: p, who: `${p.first} ${p.last}`, pax: 1, regular: true, pay: Math.round(o.pay * 1.25),
      title: `Regular: ${p.first} ${p.last} wants passage to ${dest.name}`,
      blurb: `Asked for your ship by name. ${describe(p)}`,
    });
    G.offers.unshift(o);
    return `${p.first} ${p.last} is at ${planet.name} and asked for your ship by name. The job is on the mission board.`;
  }
  return null;
}

// ---------- port pages ----------
function feedHeadlines() {
  const day = cultureToday(), c = culture(), out = [];
  for (const b of broadcastsOn(day)) out.push(`Tonight only: "${b.title}".`);
  for (const x of airing(day).slice(0, 3)) out.push(`Watching: "${x.title}", a ${GENRES[x.genre]}, ${x.premiere ? 'the premiere' : x.finale ? 'the finale' : `episode ${x.ep} of ${x.eps}`}.`);
  for (const x of newBooks(day).slice(0, 2)) out.push(`Reading: "${x.title}" by ${x.author}.`);
  out.push(`Listening: "${c.song.title}" by ${c.song.band}.`);
  for (const l of LEAGUES) {
    const s = season(l), ph = leaguePhase(l, day), top = leader(s);
    out.push(`${l.name}: ${ph === 'off-season' ? (s.champ ? `the ${s.champ} are champions.` : 'off-season.') : ph === 'preseason' ? 'preseason.' : (
        `${s.last ? `${s.last.a} ${s.last.sa}, ${s.last.b} ${s.last.sb}. ` : ''}${ph === 'final' ? 'The final is tonight.' : ph === 'playoffs' ? `Playoffs: ${topTwo(s).join(' and ')}.` : top[1] ? `The ${top[0]} lead with ${top[1]} wins.` : 'The season has just started.'}`)}`);
  }
  return out;
}

function bondsHtml() {
  const list = folk(), lines = [];
  for (const [a, b] of pairs(list)) {
    const w = bondWord(bond(a, b));
    if (w) lines.push(`<div class="hint">${a.p.first} and ${b.p.first}: ${w}</div>`);
  }
  const taste = list.map(f => { const t = tastes(f); return `${f.p.first} (${GENRES[t.genre]}, ${t.team})`; });
  return `<h3>Aboard</h3>${lines.join('') || '<p class="hint">Nobody aboard has strong feelings about anyone else yet.</p>'}${taste.length ? `<p class="hint">Likes: ${taste.join('; ')}.</p>` : ''}`;
}

Mods.register({
  id: 'social', name: 'Crew life and culture', builtin: true,
  init(M) {
    Object.assign(ACTIVITIES, SOCIAL_ACTIVITIES);
    M.on('newDay', () => { cultureDay(); bondDay(); });
    M.filter('chatter', pool => {
      const r = Math.random();
      if (r < 0.3) return [feedLine()];
      if (r < 0.55) { const s = socialLines(); if (s.length) return s; }
      return pool;
    });
    M.on('missionDone', m => { if (m.pid && G.state.people[m.pid]) G.state.people[m.pid].trips = (G.state.people[m.pid].trips || 0) + 1; });
    M.on('landed', planet => { const note = regularsAt(planet); if (note) M.note(note); });
  },
});
