'use strict';

// The authored captains of the hired chapter. Each is one entry in CAPTAINS, assigned by its own file under js/captains/ and
// linked after this one. An entry has who they are (name, pronouns, culture, home, age, two traits, bio, what they want and
// fear), how they run a ship (captain stats trade, nerve and thrift from 1 to 5, wage and share, and `hears`, `bonus` and
// `talk`: how they take being challenged, and how often they turn up in the captain events), and `xo`, the key of their
// first officer. First officers are CAST entries (cast.js) marked xo and fragile, so they are people, scenes and fate the
// way the main characters are. A hired save with no `captainKey` keeps the generated captain it was made with.

const CAPTAINS = {};

const captainEntry = () => { const h = hired(); return (h && h.captainKey && CAPTAINS[h.captainKey]) || null; };
const pickCaptainKey = () => pick(Object.keys(CAPTAINS));

// The captain's person record, built from the entry the way castPerson builds a main character's.
function captainPerson(key) {
  const d = CAPTAINS[key];
  return registerPerson({
    captainKey: key, first: d.first, last: d.last, culture: d.culture, home: d.home, job: 'captain', role: 'captain', age: d.age, bio: d.bio,
    traits: [...d.traits], goal: 'job', wealth: 2, secret: null, opinion: 0, memories: [], location: null, mood: null, captain: { ...d.captain },
  });
}
