'use strict';

// Two regulars at each bar, and match night. A regular is a person in the registry who
// is always at their bar, so you come to know them; what they have been doing changes
// each time you are back after a few days (p.gossip, not p.news, which is a crew member's letter from home in family.js), and they remember how you treated
// them like anyone you know. Match night is a live league's match in the last day, shown
// on the screens with the room's reaction. Loaded after bar.js; only calls into it at runtime.

const REGULARS = 2, NEWS_AFTER = 4, ARC_AFTER = 7;
// A regular's life (#672): an arc of three beats that moves one beat a visit when you are back a week or more after the last, told as their
// news (after the name, as NEWS is), drawn when the regular is made (p.arc = { key, beat }). How it ends: 'gone' leaves the bar at the visit
// after the last beat (the stool goes to someone new, and the dock's return line can say so, revisit.js); 'stays' goes back to the news.
const ARCS = {  // lines:regular-arcs
  berth: { end: 'gone', beats: [
    'is asking every captain who comes in whether they have a berth, and keeps a bag packed under the stool.',
    'has a berth promised on a hauler that keeps not arriving, and reads the arrivals board between drinks.',
    'has the hauler\'s name on a slip of paper and a date under it, and buys the round. "Tuesday," they say. "Ask anyone."'] },
  flat: { end: 'stays', beats: [
    'is behind on the rent, and says so to the glass and not to you.',
    'is sleeping in the back room here, by arrangement with the owner, and has the key out on the bar to prove it.',
    'has a flat on the lower ring, two rooms and a plant, and the plant is doing well. You hear about the plant.'] },
  sister: { end: 'gone', beats: [
    'has a sister visiting, who sits at the far end and does not drink and watches the door.',
    'is arguing with the sister in the low voice people use for an argument they have had before.',
    'has paid the tab in full, for the first time anyone here remembers, and is leaving with the sister on the morning boat.'] },
  cough: { end: 'stays', beats: [
    'has the cough half the port has, and a bottle of something for it that does not work.',
    'has been to the clinic at last, and come back with a paper and a worse cough.',
    'is over it, and thinner, and eats two bowls of the bar\'s noodles a night now, on the owner\'s orders.'] },
  fiddle: { end: 'stays', beats: [
    'is learning the fiddle, and has been asked twice to practice elsewhere.',
    'has been asked a third time, and practices in the stairwell now, where the whole port can hear.',
    'plays on match nights, badly, and the room has decided it likes it.'] },
  debt: { end: 'gone', beats: [
    'owes money to a man who comes in on Fridays, and leaves before he does.',
    'has stopped leaving on Fridays, and sits with their back to the door.',
    'paid the man in front of everyone, counted out, and is on the first drink bought with their own money in a year, and reading the ships on the board.'] },
};
const regularArc = key => linedText('lines:regular-arcs', ARCS[key].beats, key);

// Written regulars (#1242, docs/bible/regulars.md): a port's own pool of people at its bar, each with an arc of their own, three beats told as
// their news as ARCS are, ending 'gone' or 'stays'. Each run deals the pool in an order of its own (writtenOrder), seeded by the run and the port,
// so a port's faces differ between runs and stay the same within one; they take the bar's stools first, and generated regulars fill what is left.
// A regular written for somewhere other than the bar (a stall, a bench, a desk) waits for that place (the owner, 2026-11-15). `left`, for one who
// goes: what the dock's return line says of them (revisit.js), in place of "is gone from the bar". By the port's planet: Earth's is Lagos Ring.
const WRITTEN_REGULARS = {
  Earth: {
    biodun: { first: 'Biodun', last: 'Okafor-Lane', job: 'rigger', end: 'gone' },
    chidinma: { first: 'Chidinma', last: 'Eze-Walters', job: 'tug pilot', end: 'stays' },
    segun: { first: 'Segun', last: 'Adeyinka', job: 'welder', end: 'stays' },
    grace: { first: 'Grace', last: 'Obi-Hartmann', job: 'clinic nurse, retired', end: 'stays' },
  },
  'Ceres Station': {
    dunya: { first: 'Dunya', last: 'Achterberg', job: 'ice-house foreman, retired', end: 'stays' },
    kofi: { first: 'Kofi', last: 'Lenz', job: 'dock rigger', end: 'gone' },
    ilka: { first: 'Ilka', last: 'Ferrante', job: 'clinic orderly', end: 'stays' },
    pell: { first: 'Pell', last: 'Sorensen', job: 'gambler', end: 'gone' },
    nadia: { first: 'Nadia', last: 'Ruiz', job: 'Guild steward', end: 'stays' },
  },
};
const WRITTEN_LINES = {  // lines:written-regulars: each one's beats, and for one who goes, the return line's words for it
  Earth: {
    biodun: { beats: [
      'has read the hiring board twice since he sat down, and it hasn\'t changed. "They want them under forty," he says. "They don\'t put it on the board."',
      'has a contract: a refit at Luna, three months, rigging. He shows you the stamp on it as if you might doubt it.'],
      left: 'Biodun\'s stool is someone else\'s, and the keeper says he went up on the Thursday spaceplane' },
    chidinma: { beats: [
      'has the deposit for a tug lease saved, all of it, in a scrip account she checks between drinks.',
      'has a new letter from the holding company: the lease terms changed, and the deposit is now a third short.',
      'has a tug, an old one, with "EZE-WALTERS" painted on the hatch in letters a hand high. She\'ll show you the picture if you ask.'] },
    segun: { beats: [
      'has six days left on his first contract and doesn\'t want to talk about the seventh.',
      'has been on the board a week. He eats one meal a day at Ngozi\'s and makes it last.',
      'has another contract, eight months, and bought Ngozi\'s whole pot for his shift. The shift is still talking about it.'] },
    grace: { beats: [
      'has the clinic\'s tender papers spread on the end of the bar and is reading every clause.',
      'says the contract\'s gone to a firm on the mainland. "They\'ve never worked in half a g," she says. "They\'ll learn."',
      'has two of the new nurses at her end of the bar, and is showing them how to splint a wrist with a menu card.'] },
  },
  'Ceres Station': {
    dunya: { beats: [
      'has a letter from the station\'s owner turning down her pension again, and has stuck it to the bar with her glass.',
      'has a Guild lawyer who\'ll take the case for nothing. "Nothing," she says. "I asked twice."',
      'got the first payment this morning, and the round on the bar is hers.'] },
    kofi: { beats: [
      'was turned down at the co-op\'s meeting, eleven votes to nine. He knows who the eleven were.',
      'is working a cousin\'s claim rock between shifts, and has the dust in his cuffs to show for it.',
      'has the buy-in saved, and asks if you\'d speak for him at the meeting.'],
      left: 'Kofi is on a co-op hull now' },
    ilka: { beats: [
      'comes in straight off her shift. Her brother is on the ice crews, and she says that\'s the trouble.',
      'says her brother was hurt on the ice: a hand, not the worst. The clinic has a training course, and she\'s put his name down.',
      'says her brother is on a co-op hull now. It\'s her first night off in a year, and she doesn\'t know what to do with it.'] },
    pell: { beats: [
      'is ahead tonight and buying, and tells you the debt will be gone by the end of the week.',
      'is behind, and asks if you could lend him a hundred until Friday.'],
      left: 'Pell has gone on a hauler to Pallas, owing the bar, and the keeper has his name on the slate' },
    nadia: { beats: [
      'has a list of names from the ice house, and adds one while you\'re there.',
      'says the owner sacked two of the names. She has their pictures on the bar beside her drink.',
      'says the ice house is organised. She drinks to the two who were sacked, and doesn\'t say anything else.'] },
  },
};
const writtenLines = () => linedText('lines:written-regulars', WRITTEN_LINES);
// A written regular's arc key is `port|key`; its beats and how it ends, or null for one of ARCS.
const writtenArc = key => { const [port, k] = String(key).split('|'), w = (WRITTEN_REGULARS[port] || {})[k]; return w ? { end: w.end, beats: writtenLines()[port][k].beats } : null; };
// What the return line says of a regular who left (revisit.js), or null for the plain words.
const writtenLeft = p => { const [port, k] = String((p && p.arc && p.arc.key) || '').split('|'), l = ((writtenLines()[port] || {})[k] || {}).left; return l || null; };
// The run's order of a port's pool: by the run (the hand's name and the run's main characters) and the port, not the game's dice.
const writtenOrder = (port, run) => Object.keys(WRITTEN_REGULARS[port] || {}).sort((a, b) => hash(`${run} ${port} ${a}`) - hash(`${run} ${port} ${b}`));
// A beat of the arc a week on: the next line is their news, or, past the last, the arc is done and a 'gone' regular leaves. Returns true when they leave.
function arcStep(p) {
  const a = p.arc, def = ARCS[a.key] || writtenArc(a.key);
  if (!def) { p.arc = null; return false; }
  if (a.beat >= def.beats.length) { a.done = true; return def.end === 'gone'; }
  p.gossip = (ARCS[a.key] ? regularArc(a.key) : def.beats)[a.beat++];
  return false;
}
const NEWS = [
  'has a new job, and comes in straight off the shift in a work jacket.', 'lost a month\'s pay at cards, and is telling everyone.',
  'has a sister visiting, and talks about nothing else.', 'is off the drink, and orders water loudly.',
  'got engaged since you were last here. The bar has bought them four rounds.', 'was in a fight, and has the black eye to show for it.',
  'is learning the fiddle, and has been asked twice to practice elsewhere.', 'was passed over for a promotion, and says so to anyone who asks.',
  'is saving for a passage out, and counting every coin aloud.', 'is minding a stray cat that has moved in under the bench.',
  'is on a long streak of bad luck, and laughs when it happens.', 'has a cough that has been going round the whole port.',
];

// The regulars of this planet's bar, made on the first visit and given a new line of news
// when you are back after a few days. A regular the registry has forgotten is replaced.
function barRegulars(planet) {
  const st = G.state, sid = st.systemId;
  st.bars = st.bars || {};
  const rec = st.bars[planet.name] = st.bars[planet.name] || { ids: [], seen: null };
  rec.ids = rec.ids.filter(id => st.people[id]);
  const fresh = rec.seen !== null && st.day - rec.seen >= NEWS_AFTER;  // the first visit has no "since" to tell
  const week = rec.seen !== null && st.day - rec.seen >= ARC_AFTER;  // a beat of a regular's life
  for (const id of [...rec.ids]) {  // the lives move first: one whose arc ended in leaving is gone, and the stool below is filled
    const p = st.people[id];
    const news = fresh ? pick(NEWS.filter(n => n !== p.gossip)) : null;  // drawn as it always was, a beat or not, so the dice of a game stay where they were
    let left = false, told = false;
    if (week && p.arc && !p.arc.done) { const at = p.arc.beat; left = arcStep(p); told = p.arc.beat !== at; }  // told: a beat was their news this visit; an arc that only finished leaves room for the news
    if (left) { rec.ids = rec.ids.filter(x => x !== id); p.regular = null; p.location = null; }
    else if (fresh && !told) p.gossip = news;
  }
  rec.written = rec.written || [];  // the port's written regulars this run has seated, in or gone
  const run = `${captain().name} ${(st.castPair || []).join(' ')}`;
  while (rec.ids.length < REGULARS) {
    const p = registerPerson(makePerson(cultureOf(sid))), next = writtenOrder(planet.name, run).find(k => !rec.written.includes(k));
    p.regular = planet.name; p.location = planet.name; p.arc = { key: Object.keys(ARCS)[Math.abs(hash(p.id + 'arc')) % Object.keys(ARCS).length], beat: 0 };  // by the person, not the dice: the pins' draws stay as they were
    if (next) { const w = WRITTEN_REGULARS[planet.name][next]; Object.assign(p, { first: w.first, last: w.last, job: w.job }); p.arc = { key: `${planet.name}|${next}`, beat: 0 }; rec.written.push(next); }  // a written one first (#1242)
    rec.ids.push(p.id);
  }
  rec.seen = rec.seen === null || fresh ? st.day : rec.seen;
  return rec.ids.map(id => ({ p: st.people[id], known: true, regular: true }));
}

// A live league's match played today or yesterday, if there is one, with how the room takes it.
function matchNight() {
  const day = cultureToday();
  for (const l of LEAGUES) {
    const ph = leaguePhase(l, day);
    if (!['regular', 'playoffs', 'final'].includes(ph)) continue;
    const m = season(l).last;
    if (!m || day - m.day > 1) continue;
    const mine = l.culture === cultureOf(G.state.systemId), close = Math.abs(m.sa - m.sb) <= 1;
    const room = mine
      ? (close ? `The room is on its feet for every minute. The ${m.winner} fans are buying, and the ${m.loser} fans are not speaking.` : `It was never close. The ${m.loser} fans are leaving early while the ${m.winner} fans sing.`)
      : (close ? 'Nobody here has a team in it, but there is money on the table anyway.' : 'Nobody here has a team in it. The screens go back to the weather after the second goal.');
    return { league: l, match: m, text: `Match night. ${l.name}, ${l.sport}: ${m.a} ${m.sa}, ${m.b} ${m.sb}${ph === 'final' ? ', in the final' : ''}. ${room}` };
  }
  return null;
}
