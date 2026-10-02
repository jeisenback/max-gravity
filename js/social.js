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
  noir: 'Belter noir', war: 'war drama', soap: 'station soap', romance: 'romance',
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
  bonds()[k] = Math.max(-10, Math.min(10, (bonds()[k] || 0) + n));
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
    let d = (ta.genre === tb.genre ? 0.15 : 0) + (ta.team === tb.team ? 0.1 : 0) + (clash(a, b) ? -0.2 : 0.03);
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
    `${book.author} denies that "${book.title}" is about a real Coalition admiral.`,
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
    `Somebody in the Coalition's press office accidentally posts the wrong file, and spends an afternoon being the most-quoted person in the system.`,
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
      fans.length ? `${names(fans)} ${fans.length > 1 ? 'know' : 'knows'} every line.` : 'Nobody is a fan, which somehow makes it funnier.',
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
const CAUSES = ['the last of the coffee', 'music in the berths at all hours', 'a ring-ball bet', 'whose turn it is to scrub the recycler', 'a borrowed jacket that came back torn', 'the thermostat', 'who left the galley light on', 'a joke that went too far at breakfast', 'a book that was never returned', 'the way somebody chews', 'a promise about a shift swap', 'the good pillow', 'whether the cat is allowed on the console', 'a sock that has been in the corridor for a week'];
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

function relationshipScene() {
  const list = folk(), st = G.state;
  if (list.length < 2) return null;
  const all = pairs(list), scenes = [];
  for (const [a, b] of all) {
    const n = bond(a, b), A = a.p.first, B = b.p.first;
    if (!hired() && n >= 6 && a.crew && b.crew) scenes.push(() => !stamped(a, b, 'together') && {
      title: 'Ship\'s Rules', text: `${A} and ${B} find you on the bridge at the end of the watch, standing a little closer together than they need to, in a way that has, over the last few days, become impossible not to notice. ${A} clears their throat twice. ${B} studies the ceiling with fierce concentration. Finally, in a rush, ${A} says: "Captain. Does the ship have rules about crew who are, um. Together?" They both look at you. Their hands, you notice, are very nearly touching.`,
      choices: [
        { label: '"No rules. Be happy."', run() { like(a.p, 2, `You gave ${B} and me your blessing.`); like(b.p, 2, `You gave ${A} and me your blessing.`); return 'They leave hand in hand, smiling at the deck, in the slow, dazed way of people who have been carrying something heavy and just set it down. By dinner the whole ship knows, and somehow the galley smells better, and, that night, someone hangs a small string of fairy lights outside their berth without a word.'; } },
        { label: '"Keep it off the bridge."', run() { like(a.p, 1, null); like(b.p, 1, null); return `"Deal," says ${A}, instantly, and ${B} laughs, delighted, and the two of them practically float out of the cockpit. For the next few days, they are careful, and visibly so, with a great show of professionalism on the bridge, and, every so often, when they think you are not looking, a small, private, ridiculous smile.`; } },
        { label: '"It stays professional."', run() { addBond(a, b, -2); like(a.p, -2, `You told ${B} and me to keep it professional.`); like(b.p, -2, `You told ${A} and me to keep it professional.`); return `They nod, stiffly, in unison, and thank you for your time, with the careful politeness of people who have just been told something they both expected and had hoped not to hear. The ship gets a lot quieter. In the days after, they keep a visible, awkward distance in the corridors, and ${A} eats alone, and ${B}, more than once, looks like someone who has lost a small, precious thing.`; } },
      ] });
    else if (!hired() && n >= 3 && !isCooled(a, b, 'close', 40)) scenes.push(() => cool(a, b, 'close') || ({
      title: 'Close Quarters', text: `${A} and ${B} keep finding reasons to share the same watch. It started as a coincidence, then a scheduling quirk, and now it is a small, cheerful conspiracy, with elaborate trades and favors and carefully-timed sick days. They talk through the long quiet hours, in low voices, and, when someone else comes in, they both stop, and smile, and look at nothing at all. It is, honestly, adorable.`,
      choices: [
        { label: 'Put them on the same rotation', run() { addBond(a, b, 2); like(a.p, 1, null); like(b.p, 1, null); return `You pencil them onto the same rotation, and hand over the new roster, without comment. ${A} pretends not to be pleased, and studies the paper with immense, fake seriousness. ${B} doesn't bother pretending, and beams, openly, and squeezes ${A}'s arm, and is immediately embarrassed. It is very sweet, and it is going to be a problem, and you feel, for the moment, quite good about it.`; } },
        { label: 'Leave the rotation alone', run: () => 'You leave the roster as it is, and say nothing, and, by the end of the week, they have found each other on the same watch anyway, by a route that involves three trades and a forged note. Some things find their own way. You pretend, at the next meal, not to notice, and everyone, magnificently, does the same.' },
      ] }));
    if ((n <= -2 || clash(a, b)) && !isCooled(a, b, 'feud', 20)) scenes.push(() => {
      cool(a, b, 'feud');
      const cause = pick(CAUSES);
      return {
        title: 'A Small Ship', text: `${A} and ${B} are shouting at each other in the galley about ${cause}. It started small, with a raised eyebrow and a pointed remark, and has, over ten minutes, grown into a hot, ringing, wonderfully unreasonable row, with both of them standing, and one of them waving a spoon. It is not really about ${cause}. It never is. The rest of the crew has gone very quiet, and is pretending, with a rigid intensity, to study their food.`,
        choices: [
          { label: `Side with ${A}`, run() { like(a.p, 1, null); like(b.p, -2, `You sided with ${A} against me.`); addBond(a, b, -1); return `${B} stares at you for a long moment, incredulous, and then storms off to their bunk, and the door slams with a noise like a small explosion. ${A} looks smug, which helps nobody, and, when nobody else is looking, a little bit ashamed.`; } },
          { label: `Side with ${B}`, run() { like(b.p, 1, null); like(a.p, -2, `You sided with ${B} against me.`); addBond(a, b, -1); return `${A} stares at you for a long moment, incredulous, and then storms off to their bunk, and the door slams with a noise like a small explosion. ${B} looks smug, which helps nobody, and, when nobody else is looking, a little bit ashamed.`; } },
          { label: 'Lock them in the galley until they sort it out', run() {
            if (Math.random() < 0.55) { addBond(a, b, 3); return `You shut the hatch on them, and stand outside it, listening to a muffled, escalating quarrel, and then a long, strange silence, and then, unexpectedly, a laugh. Two hours later they come out, red-faced and hoarse, laughing about something else entirely, with their arms just barely, cautiously, not touching. Grudging respect, at the very least.`; }
            addBond(a, b, -1);
            return `You shut the hatch on them, and, for a while, there is shouting, and then a crash, and then a long, cold silence. Two hours later they come out not speaking, without looking at each other, and the galley needs a new cupboard door (${hurt(0.01)} points of hull, somehow). Someone, at dinner, quietly sits between them, and nobody comments.`;
          } },
          { label: 'Settle it over cards', run() { addBond(a, b, 1.5); return `You produce a deck, and deal three hands, and, for half an hour, there is no talking, only the click and slap of the cards, and the small intense noises of two people who both hate to lose. ${pick([A, B])} wins, the loser does the chores, and honor is satisfied. By the last hand, they are both, without noticing, grinning.`; } },
        ],
      };
    });
    if ((a.p.home === b.p.home || (a.p.culture && a.p.culture === b.p.culture)) && n < 3) scenes.push(() => !stamped(a, b, 'roots') && {
      title: 'Small System', text: a.p.home === b.p.home
        ? `${A} and ${B} discover, halfway through an ordinary argument about coffee, that they grew up a few decks apart on ${a.p.home}. They stop, and stare, and begin to compare notes, and, within minutes, they are shouting in delighted recognition. They know the same bars, the same teachers, the same street with the bad smell, and the same terrible ${tastes(a).team} seasons. It is uncanny, and, for the rest of the shift, they are inseparable.`
        : `${A} and ${B} have worked out that they share half a childhood's worth of songs and slang, and have spent the whole morning trading old rhymes and half-forgotten proverbs, in a fast, delighted, private shorthand. The rest of the ship understands one word in three, and looks on with polite, bewildered envy.`,
      choices: [
        { label: `Break out something to toast ${a.p.home} (200 cr)`, can: () => st.credits >= 200, run() { st.credits -= 200; addBond(a, b, 3); like(a.p, 1, null); like(b.p, 1, null); return `You crack open something worth cracking, and, around the galley table, they toast ${a.p.home}, and the streets, and the old teachers, and the ones who did not make it out. The toasts get longer and the stories get less true, and, at some point, a chorus of an old ${a.p.home} song breaks out. It is a good night, and, when it is over, ${A} and ${B} walk back to their bunks together, arm in arm, not quite steady.`; } },
        { label: 'Leave them to it', run() { addBond(a, b, 1.5); return 'You leave them the galley, and go up to the bridge, and shut the hatch. You can hear them laughing from the bridge, faint and warm through the deck, for a long time, in the peculiar rhythm of two people who have found, unexpectedly, someone who speaks their language.'; } },
      ] });
    if (a.crew !== b.crew) {
      const [c, p] = a.crew ? [a, b] : [b, a];
      scenes.push(() => !stamped(a, b, 'tour') && {
        title: 'The Grand Tour', text: `${c.p.first} has been showing ${p.p.first} how the ship works, starting at the cargo bay and working slowly aft, with a running commentary that is half explanation and half proud, rambling love letter. ${has(p, 'nervous') ? `${p.p.first} jumps at every clank, and clings, white-knuckled, to a handrail, but is listening hard, and, every so often, asks a small, careful, intelligent question.` : `${p.p.first} has a hundred questions, and asks all of them, at speed, and, at each answer, nods and writes something down.`} The two of them keep vanishing around corners together, and reappearing, talking.`,
        choices: [
          { label: 'Let them', run() { addBond(c, p, 2.5); like(p.p, 1, `${c.p.first} showed me around the ship.`); return `By the end of the burn ${p.p.first} can name every valve on the ship, and knows which pipe rattles in which key, and has, in a small notebook, a hand-drawn diagram of the whole drive. ${c.p.first} has a new friend, and, at the end of the last watch, catches your eye across the galley, and gives you a small, secret, entirely triumphant nod.`; } },
          { label: 'Passengers stay out of the engine room', run() { addBond(c, p, -0.5); return `Rules are rules, and you say so, gently. ${c.p.first} nods, without protest, and steers ${p.p.first} back to the galley, and the tour ends mid-sentence, on a small, awkward, slightly deflated note. For the rest of the burn, ${p.p.first} looks wistfully at the engine room hatch, and ${c.p.first} does not quite meet your eye.`; } },
        ] });
    }
  }
  const crew = list.filter(f => f.crew);
  if (crew.length >= 2) {
    const [a, b] = pick(pairs(crew)), n = bond(a, b);
    if (!hired() && Math.abs(n) >= 1 && !isCooled(a, b, 'word', 30)) scenes.push(() => cool(a, b, 'word') || ({
      title: 'A Word, Captain', text: `${a.p.first} catches you alone, in the corridor outside the cockpit, with the elaborate carelessness of someone who has rehearsed this in the mirror. "Captain. Can I ask you something about ${b.p.first}?" ${n > 0 ? 'They are trying hard to sound casual, and failing, in a warm and endearing way, and their ears have gone slightly pink.' : 'They are trying hard to sound calm, and only partly succeeding, and there is a small, brittle edge in their voice, like a hairline crack in glass.'} They wait, and watch your face, and their hands, at their sides, are very still.`,
      choices: [
        { label: `"Talk to ${b.p.first}, not me."`, run() { addBond(a, b, n > 0 ? 2 : 1.5); return n > 0 ? `${a.p.first} takes a deep breath, and nods, and goes, and, later, you see the two of them in the galley, heads close together, talking quietly, over two untouched cups of tea. Good. When they notice you, they both look up, and neither looks away.` : `${a.p.first} takes a deep breath, and nods, and goes. They do. It is loud for a while, with the door closed and the low, furious murmur of two people saying all the things, and then, gradually, it is quieter, and then, unmistakably, it is better. When they come out, both are red-eyed, and both, somehow, are lighter.`; } },
        { label: '"Keep your head down and do your job."', run() { like(a.p, -1, null); return `${a.p.first} nods, disappointed, in a small, controlled way, and says, "Aye, captain," and goes. It is, technically, the right call, and it is efficient, and it costs you something you cannot name. For a while, ${a.p.first} is brisk and correct and closed, and the ship feels a degree colder.`; } },
        { label: `"What's ${b.p.first} really like?"`, run() { like(a.p, 1, null); return `"${b.p.first}? ${(b.p.traits || []).length ? `${TRAITS[b.p.traits[0]].adj[0].toUpperCase()}${TRAITS[b.p.traits[0]].adj.slice(1)}, mostly. ` : ''}Watches too much ${GENRES[tastes(b).genre]}. Would go down with the ship for you, though." ${a.p.first} stops, and blinks, and seems surprised to have said it, and then, slowly, embarrassed, and then, oddly, proud, and looks at the deck. "Anyway," they say. "That is what ${b.p.first} is like." It is, you realize, the most honest thing anyone has said to you all week.`; } },
      ] }));
  }
  // Two fans of different teams, and a match coming up.
  const fans = all.find(([a, b]) => tastes(a).team !== tastes(b).team && leagueOf(tastes(a).team) === leagueOf(tastes(b).team) && !isCooled(a, b, 'match', 25));
  if (fans) scenes.push(() => {
    const [a, b] = fans, ta = tastes(a).team, tb = tastes(b).team;
    cool(a, b, 'match');
    return {
      title: 'Galley Duty', text: `${a.p.first} (${ta}) and ${b.p.first} (${tb}) have bet a week of galley duty on tonight's match.`,
      choices: [
        { label: 'Stream it for everyone', run() {
          const m = playMatch(leagueOf(ta), ta, tb), [w, l] = m.winner === ta ? [a, b] : [b, a];
          addBond(a, b, has(l, 'rude') ? -1 : 1);
          like(w.p, 1, null);
          return `${m.a} ${m.sa}, ${m.b} ${m.sb}. ${l.p.first} does a week of galley duty ${has(l, 'rude') ? 'and makes sure everyone suffers for it' : 'in a borrowed apron, with dignity'}.`;
        } },
        { label: `Put 300 cr on the ${ta} yourself`, can: () => st.credits >= 300, run() {
          const m = playMatch(leagueOf(ta), ta, tb), won = m.winner === ta;
          st.credits += won ? 300 : -300;
          like(a.p, won ? 1 : 0, null); like(b.p, won ? -1 : 1, null);
          return `${m.a} ${m.sa}, ${m.b} ${m.sb}. ${won ? `You collect 300 cr, and ${a.p.first} hugs you.` : `You lose 300 cr, and ${b.p.first} will be mentioning it for weeks.`}`;
        } },
        { label: 'Stay out of it', run: () => 'You hear the result from the cheering, and the groaning.' },
      ],
    };
  });
  const options = scenes.map(f => f).sort(() => Math.random() - 0.5);
  for (const make of options) { const ev = make(); if (ev) return ev; }
  return null;
}

// A regular back aboard: the crew remember them.
function welcomeBack() {
  const m = paxAboard().find(x => x.regular && !x.welcomed);
  if (!m) return null;
  m.welcomed = true;
  const p = G.state.people[m.pid], me = { id: m.pid, p };
  const friends = folk().filter(f => f.crew && bond(f, me) >= 2);
  const mem = p.memories.length ? p.memories[p.memories.length - 1].replace(/^(Day \d+|\d+ \w+ \d+): /, '') : null;
  return {
    title: 'Welcome Back', text: `${p.first} ${p.last} settles into the same berth as last time.${mem ? ` "Last time, ${mem.charAt(0).toLowerCase()}${mem.slice(1)}"` : ''}${friends.length ? ` ${names(friends)} ${friends.length > 1 ? 'have' : 'has'} saved them the good mug.` : ''}`,
    choices: [
      { label: '"Good to have you aboard again."', run() { like(p, 1, 'The captain welcomed me back.'); for (const f of friends) addBond(f, me, 1); return `${p.first} beams. Regulars are what keep a ship like this flying.`; } },
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
    out.push(`${l.name}: ${ph === 'off-season' ? (s.champ ? `the ${s.champ} are champions.` : 'off-season.') : ph === 'preseason' ? 'preseason.' : `${s.last ? `${s.last.a} ${s.last.sa}, ${s.last.b} ${s.last.sb}. ` : ''}${ph === 'final' ? 'The final is tonight.' : ph === 'playoffs' ? `Playoffs: ${topTwo(s).join(' and ')}.` : top[1] ? `The ${top[0]} lead with ${top[1]} wins.` : 'The season has just started.'}`}`);
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
