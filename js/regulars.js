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
// A beat of the arc a week on: the next line is their news, or, past the last, the arc is done and a 'gone' regular leaves. Returns true when they leave.
function arcStep(p) {
  const a = p.arc, def = ARCS[a.key];
  if (!def) { p.arc = null; return false; }
  if (a.beat >= def.beats.length) { a.done = true; return def.end === 'gone'; }
  p.gossip = regularArc(a.key)[a.beat++];
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
  while (rec.ids.length < REGULARS) {
    const p = registerPerson(makePerson(cultureOf(sid)));
    p.regular = planet.name; p.location = planet.name; p.arc = { key: Object.keys(ARCS)[Math.abs(hash(p.id + 'arc')) % Object.keys(ARCS).length], beat: 0 };  // by the person, not the dice: the pins' draws stay as they were
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
