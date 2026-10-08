'use strict';

// Every choice of each captain's scenes (the trouble, the secret told two ways, the goodbye), run for each of the four captains:
// each says what happened in plain text and nothing throws. The wording is not checked here (docs/prose-style.md).

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('every choice of every captain scene runs and says what happened', async () => {
  const { ev, done } = await open();
  await ev(() => {
    window.start = (key) => { startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: key }); while (G.dialog) finishEvent(); G.state.story.next = 1e9; };
  });
  const r = await ev(() => {
    const out = [], bad = [];
    const check = (at, text, event) => {
      if (typeof text !== 'string' || text.length < 40 || /undefined|NaN|\[object|\{[a-z]+\}/.test(text + event.title + event.text)) bad.push(`${at}: ${String(text).slice(0, 60)}`);
    };
    for (const key of Object.keys(CAPTAINS).sort()) {
      const d = CAPTAINS[key];
      // Each scene as the game builds it: trouble, then the secret by trust (the confiding one at a high opinion, the found-out one at a low one).
      const scenes = [['trouble', 5], ['secret', 5], ['secret', -2]];
      for (const [name, opinion] of scenes) {
        const count = (() => { start(key); hiredCaptain().opinion = opinion; return captainScene(name).choices.length; })();
        for (let i = 0; i < count; i++) {
          start(key); const cap = hiredCaptain(); cap.opinion = opinion; G.state.credits = 1000;
          const e = captainScene(name), c = e.choices[i], at = `${key}.${name}.${opinion}.${i}`;
          if (c.can && !c.can()) { bad.push(`${at}: gated shut with a thousand credits`); continue; }
          try { check(at, c.run(), e); } catch (err) { bad.push(`${at}: threw ${err}`); }
          out.push(at);
        }
      }
      // The goodbye, with the secret known and not, a loan out and not.
      for (const flags of [{}, { secretKnown: true }, { secretKnown: true, lent: true }]) {
        const count = (() => { start(key); hired().flags = { ...flags }; return captainGoodbye().choices.length; })();
        for (let i = 0; i < count; i++) {
          start(key); hired().flags = { ...flags }; G.state.credits = 1000;
          const e = captainGoodbye(), at = `${key}.goodbye.${Object.keys(flags).join('+') || 'none'}.${i}`;
          try { check(at, e.choices[i].run(), e); } catch (err) { bad.push(`${at}: threw ${err}`); }
          out.push(at);
        }
      }
    }
    return { bad, n: out.length };
  });
  assert.deepEqual(r.bad, []);
  assert.equal(r.n, 56, 'four captains: six choices in the trouble and the two secrets, and the goodbye\'s choices for three sets of flags');
  await done();
});
