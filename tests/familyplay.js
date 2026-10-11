'use strict';

// Plays the words of js/familytext.js for the pin (familypin.test.js) and the text layer's tests (#457): the lines a crew member's story is rolled from (what they left, what they hope
// for, where they are from), what they say when there is nothing on their mind, the letters from home and the holidays. Not a test file. playFamily runs in the page and reads the
// tables only through the game's own scenes, so it plays the same before and after the text layer is put in front of them.
const playFamily = () => {
  const out = [];
  const note = (key, text) => out.push({ key, text: typeof text === 'string' ? text : JSON.stringify(text) });
  const real = Math.random;
  const seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
  __seed(1);
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe' });
  while (G.dialog) finishEvent();
  const st = G.state; st.tutorial = null; st.story.next = 1e9; st.credits = 20000;
  st.systemId = 'ceres'; st.planet = 'Ceres Station'; landAt(currentPlanet(), []); while (G.dialog) finishEvent();
  const mk = (culture, extra = {}) => { const p = makePerson(culture); Object.assign(p, { first: 'Sam', last: 'Vale', home: 'Mars', traits: ['kind', 'brave'], secret: null, opinion: 0, memories: [] }, extra); delete p.story; registerPerson(p); return p; };
  const reset = () => { st.crew = []; st.injured = {}; };
  // what a story is rolled from: what they left and what they hope for, over many dice
  for (let i = 0; i < 80; i++) { reset(); __seed(100 + i); const p = mk(['belt', 'mars', 'earth'][i % 3], { home: ['Mars', 'Ceres Station', 'Earth'][i % 3] }); const s = storyOf(p); note(`story:${i}`, [s.left, s.hope, s.rel]); }
  // the first sitting: where they are from, for each culture, and the line they left for
  ['belt', 'mars', 'earth'].forEach((c, i) => { reset(); __seed(200 + i); const p = mk(c); const e = sitBeat(p, true); note(`beat0:${c}`, [e.title, e.text, e.choices.map(x => String(x.label))]); });
  { reset(); __seed(210); const p = mk('belt'); storyOf(p).homeDetail = 'a hand-picked detail'; note('beat0:detail', sitBeat(p, true).text); }
  // what they say when there is nothing on their mind, for each trait (and for two together, and for none)
  Object.keys(TALK_IDLE).forEach((t, i) => { reset(); __seed(300 + i); const p = mk('earth', { traits: [t] }); const e = ordinaryTalk(p); note(`idle:${t}`, [e.title, e.text]); });
  { reset(); __seed(330); note('idle:two', ordinaryTalk(mk('earth', { traits: ['kind', 'brave'] })).text); }
  { reset(); __seed(331); note('idle:none', ordinaryTalk(mk('earth', { traits: [] })).text); }
  // the letters from home: each of the sixteen good and sixteen bad, by the dice that pick them
  const planet = currentPlanet();
  for (const good of [true, false]) {
    const pool = good ? GOOD_NEWS : BAD_NEWS;
    pool.forEach((_, i) => {
      reset(); __seed(400 + i); const p = mk('belt'); storyOf(p); st.crew = [p.id]; st.letterAt = undefined; p.letterDay = undefined;
      seq([0.1, good ? 0.1 : 0.9, (i + 0.5) / pool.length]);
      const notes = letters(planet); Math.random = real;
      note(`letter:${good ? 'good' : 'bad'}:${i}`, [notes, p.mood && p.mood.text, p.news]);
      const e = newsEvent(p); note(`news:${good ? 'good' : 'bad'}:${i}`, [e.title, e.text.slice(0, 160), e.choices.map(c => String(c.label))]);
    });
  }
  // the holidays: the scene, and what comes of keeping it with everyone
  HOLIDAYS.forEach((h, i) => {
    reset(); __seed(500 + i); const p = mk(h.culture || 'earth'); st.crew = [p.id];
    const e = occasionEvent({ kind: 'holiday', h, id: p.id, day: st.day + 1, year: 2214 });
    __seed(510 + i); note(`holiday:${i}`, [e.title, e.text, e.choices.map(c => String(c.label)), e.choices[0].run(), e.choices[1].run()]);
  });
  return out;
};

module.exports = { playFamily };
