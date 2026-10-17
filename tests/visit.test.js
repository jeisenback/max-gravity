'use strict';

// A visit home (family.js): landing at a crew member's home when they think well of you, or when a promise to take them home is kept there, they ask you up to
// eat with the one they miss; what you tell the family is remembered, and the family writes afterward.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

const helpers = () => {
  window.setup = (opinion = OPINION.TRUSTED) => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state; st.story.next = 1e9; st.day += 30;
    const p = makePerson('earth'); p.role = 'cook'; p.skill = 1; p.memories = []; p.opinion = opinion; p.mood = null; p.home = currentPlanet().name; registerPerson(p); st.crew.push(p.id);
    G.dialog = null; G.nextEvent = null; UI.hide();
    return { st, p, planet: currentPlanet() };
  };
};

test('landing at their home with their regard, they ask you up; going up opens the table at once, and what you tell the family is remembered', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p, planet } = setup(), out = {}, s = storyOf(p);
    Mods.emit('landed', planet);
    out.asked = G.dialog && G.dialog.event.title; out.marked = p.visitedAt === st.day;
    out.lockText = G.dialog && G.dialog.event.text.includes(s.name);
    UI.act('choose', 0);
    out.table = G.dialog && G.dialog.event.title; out.tableButtons = [...UI.el.querySelectorAll('.choices button')].map(b => b.textContent);
    const op = p.opinion; UI.act('choose', 1);
    out.liked = p.opinion - op; out.mem = p.memories.slice(-1)[0]; out.result = document.getElementById('event-result').textContent;
    while (G.dialog) finishEvent();
    // not again at this landing, nor the next one within the gap
    Mods.emit('landed', planet); out.again = G.dialog && G.dialog.event.title;
    // a later sitting brings it back
    out.comesBack = talkTopics(p).some(t => t.choices[0].label === 'Bring it up' && /told my/.test(t.open));
    return { ...out, who: s.name, hope: s.hope };
  });
  assert.equal(r.asked, 'At the Lock'); assert.ok(r.marked && r.lockText);
  assert.equal(r.table, `At ${r.who}'s Table`); assert.ok(!r.tableButtons.includes('Continue'), `the table, not a screen before it (${r.tableButtons})`);
  assert.ok(r.liked >= 1, `regard rises (${r.liked}; two points, eased for someone who already thinks well of you)`); assert.match(r.mem, /You told my \w+( \w+)? what I want, because I couldn't\.$/); assert.ok(r.result.includes(r.hope) && /For the galley|Next time, longer/.test(r.result), 'the true thing, and the parting');
  assert.ok(!r.again || r.again !== 'At the Lock', `not asked twice (${r.again})`); assert.ok(r.comesBack);
  await done();
});

test('without the regard nothing plays, a promise kept brings the visit anyway, and declining leaves them to go alone', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p, planet } = setup(0), out = {};
    Mods.emit('landed', planet); out.cold = G.dialog && G.dialog.event.title;
    while (G.dialog) finishEvent();
    Mods.emit('missionDone', { favorPid: p.id }); out.kept = st.favorKept === p.id;
    Mods.emit('landed', planet); out.favor = G.dialog && G.dialog.event.title; out.cleared = st.favorKept === null;
    const op = p.opinion, n = p.memories.length; UI.act('choose', 1);
    out.declined = document.getElementById('event-result').textContent; out.unmoved = p.opinion === op && p.memories.length === n;
    while (G.dialog) finishEvent();
    return out;
  });
  assert.notEqual(r.cold, 'At the Lock'); assert.ok(r.kept); assert.equal(r.favor, 'At the Lock'); assert.ok(r.cleared);
  assert.match(r.declined, /red eyes/); assert.ok(r.unmoved);
  await done();
});

test('the family writes once, ten days on, and the letter is good news for the next burn', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  await ev(helpers);
  const r = await ev(() => {
    const { st, p, planet } = setup(), out = {}, s = storyOf(p);
    st.letterAt = undefined; p.visitedAt = st.day - 5; out.early = letters(planet).some(t => /plate is laid/.test(t));
    st.letterAt = undefined; p.visitedAt = st.day - 10; const notes = letters(planet);  // the gap since any letter the early call drew does not count here
    out.note = notes[0]; out.news = p.news; out.mood = p.mood && p.mood.kind; out.once = p.visitLetter;
    st.letterAt = undefined; out.second = letters(planet).some(t => t.includes(s.name) && /plate is laid/.test(t));
    return { ...out, who: s.name };
  });
  assert.equal(r.early, false, 'not before ten days'); assert.match(r.note, new RegExp(`A message for .* at .*: their \\w+( \\w+)? ${r.who} writes that a plate is laid`)); assert.ok(r.news && r.news.good); assert.equal(r.mood, 'high'); assert.ok(r.once);
  assert.equal(r.second, false, 'the family writes once');
  await done();
});
