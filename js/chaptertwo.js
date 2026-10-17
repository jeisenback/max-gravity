'use strict';

// Chapter two's spine (#685): the crew who came along. Chapter one closes on a number; chapter two closes on a question, whether the people who came up the ramp with you at the yard are
// still aboard after CHAPTER_TWO_DAYS. The buy records who came (career().came, hired.js) and the day (career().bought); the Port page says where they stand; and on the first landing after the
// days have passed a scene at the ship's lock reads the record, as the close of chapter one does: everyone who came and is still aboard, some who have left, some who have died, or nobody ever
// came. The wages the owner pays at every burn (crew.js payCrew) are what keeps them: the ones who are not paid quit. crewRecord and the two pure rules take what they read as parameters, so they
// run in plain Node (tests/chaptertwo.test.js). Loaded after ownerboard.js; only called into at runtime.

const CHAPTER_TWO_DAYS = 90;  // the days from the buy to the close (to be set against the soak)

// Who of those who came is still aboard, who has left (quit, put ashore, gone to another berth) and who has died.
function crewRecord({ came, crew, people }) {
  const out = { came: came.length, aboard: [], left: [], dead: [] };
  for (const id of came) {
    const p = people[id];
    if (!p) continue;
    (p.dead ? out.dead : crew.includes(id) ? out.aboard : out.left).push(id);
  }
  return out;
}
// Which close the record gives: nobody ever came, someone died, someone left, or everyone who came is still here.
const chapterTwoEndingId = rec => (!rec.came ? 'alone' : rec.dead.length ? 'losses' : rec.left.length ? 'left' : 'together');
// The close is due on the first landing after the days have passed, once, for a game that bought its ship through chapter one.
const chapterTwoDue = (career, flags, day) => !!career && career.bought !== undefined && !flags.chapterTwo && day - career.bought >= CHAPTER_TWO_DAYS;

const chapterTwoRecord = () => { const st = G.state, c = career(); return crewRecord({ came: c.came || [], crew: st.crew, people: st.people }); };
const chapterTwoSay = (key, vars) => sceneSay('scene:chapter-two-end', key, vars);  // the words of the close are the lines of scene:chapter-two-end (hiredscenes.js)

// The record with first names in place of ids, which is what the scene says.
const namedRecord = rec => { const first = id => person(id).first; return { came: rec.came, aboard: rec.aboard.map(first), left: rec.left.map(first), dead: rec.dead.map(first) }; };

// The close, at the ship's lock: the foot and the close shared by every ending, and the middle the record (of first names) picks.
function chapterTwoEnd(rec = namedRecord(chapterTwoRecord())) {
  const st = G.state, names = list => (list.length ? listNames(list) : ''), many = list => (list.length > 1 ? 'many' : 'one');
  const id = chapterTwoEndingId(rec), vars = { days: st.day - career().bought, ship: ship().name, planet: currentPlanet().name, aboard: names(rec.aboard), gone: names(rec.left), dead: names(rec.dead), came: names([...rec.aboard, ...rec.left, ...rec.dead]) };
  const middle = id === 'together' ? chapterTwoSay(`together.text.${many(rec.aboard)}`, vars)
    : id === 'left' ? chapterTwoSay(rec.aboard.length ? 'left.text.some' : 'left.text.all', vars)
    : id === 'losses' ? `${chapterTwoSay(`losses.text.${many(rec.dead)}`, vars)}${rec.aboard.length ? ` ${chapterTwoSay(`losses.aboard.${many(rec.aboard)}`, vars)}` : ''}`
    : chapterTwoSay('alone.text', vars);
  return {
    title: chapterTwoSay(`${id}.title`), personal: true,
    text: [chapterTwoSay('foot', vars), middle, chapterTwoSay('close')].join(' '),
    choices: [{ label: chapterTwoSay('keep.label'), run: () => chapterTwoSay('keep.result') }],
  };
}

// The Port page's section while the days run: where each of the crew who came along stands.
function chapterTwoHtml() {
  const st = G.state, c = career();
  if (hired() || !c || c.bought === undefined || st.flags.chapterTwo || !(c.came || []).length) return '';
  const rec = chapterTwoRecord(), state = id => (rec.aboard.includes(id) ? 'aboard' : rec.dead.includes(id) ? 'died' : 'has left');
  return String(h`<h3>The crew who came along</h3><p class="desc">Day ${Math.min(CHAPTER_TWO_DAYS, st.day - c.bought)} of ${CHAPTER_TWO_DAYS}. ${listHtml(c.came.filter(id => st.people[id]), id => h`<span>${st.people[id].first} ${state(id)}. </span>`)}</p>`);
}

Mods.register({
  id: 'chaptertwo', name: 'Chapter two', builtin: true,
  init(M) {
    M.on('landed', () => {
      const st = G.state;
      if (hired() || G.dialog || !chapterTwoDue(career(), st.flags, st.day)) return;
      st.flags.chapterTwo = true;
      openEvent(chapterTwoEnd());
    });
  },
});
