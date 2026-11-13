'use strict';

// Traits (docs/superpowers/specs/2026-11-10-traits-design.md, progression layer 4): what the record makes of the hired hand. The hand keeps a record of plain
// counts (h.record, a key absent reads as zero), written one line where each event settles (hired.js recordHand); a trait is a row below that a run of counts
// earns, once and for the run, named on the hand's page, said once when it lands (hired.js traitNote), and opening a door or turning a reading at its site.
// Pure: it reads no G, so it runs in plain Node (tests/traits.test.js). Loaded after picks.js. TRAITS is the crew's personalities; this table is HAND_TRAITS.

const RECORD_KEYS = ['haulsClean', 'haulsBad', 'repelsHeld', 'repelsLost', 'boardingsWon', 'boardingsLost', 'fightsWon', 'fightsRan', 'fled', 'hurts', 'matesHurt', 'matesLost', 'onTime', 'late', 'fines', 'ranFromNavy', 'barWon', 'barLost', 'rocksFound', 'wrecksCut', 'salvageDone', 'rocksSurveyed'];  // the last three: the co-op's salvage and surveys (salvage.js, #965)
const recordOf = h => (h && h.record) || {};
const count = (r, key) => r[key] || 0;

// The table: who says the moment (`by`: the captain, a post's holder, the shipper's note, or nobody), and the rule on the record that earns it.
const HAND_TRAITS = [
  { id: 'cool-head', name: 'Cool Head', by: 'captain', earned: r => count(r, 'repelsHeld') >= 2 },
  { id: 'salvager', name: 'Salvager', by: 'engineer', earned: r => count(r, 'haulsClean') >= 2 || count(r, 'rocksFound') >= 3 },
  { id: 'marked', name: 'Marked', by: 'captain', earned: r => count(r, 'fines') >= 2 || count(r, 'ranFromNavy') >= 1 },  // said by a patrol's officer at the next stop (engage.js); the captain's name is the fallback
  { id: 'reliable', name: 'Reliable', by: 'shipper', earned: r => count(r, 'onTime') >= 5 },
  { id: 'scarred', name: 'Scarred', by: 'engineer', earned: r => count(r, 'hurts') >= 2 },
  { id: 'hard-case', name: 'Hard Case', by: 'captain', earned: r => count(r, 'boardingsWon') >= 2 },
  { id: 'runner', name: 'Runner', by: 'captain', earned: r => count(r, 'fightsRan') + count(r, 'fled') >= 3 },
  { id: 'jonah', name: 'Jonah', by: null, earned: r => count(r, 'matesLost') >= 2 },
];

function handTraits(h) { const r = recordOf(h); return HAND_TRAITS.filter(t => t.earned(r)).map(t => t.id); }  // a declaration: the scene registry names it (hiredscenes.js)
const hasTrait = (h, id) => handTraits(h).includes(id);

// Adds n to the count (a late delivery starts the on-time count again) and returns the traits this add earned and the record did not hold before.
function recordAdd(h, key, n = 1) {
  const before = handTraits(h);
  h.record = h.record || {};
  h.record[key] = count(h.record, key) + n;
  if (key === 'late') h.record.onTime = 0;
  return handTraits(h).filter(id => !before.includes(id));
}

// The counts above zero in words, in the record's order: "Two hauls clean. One boarding held. Hurt once."
const NUMBER_WORDS = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty'];
const numberWord = n => NUMBER_WORDS[n] || String(n);
const RECORD_WORDS = {
  haulsClean: ['One haul clean', '{n} hauls clean'], haulsBad: ['One haul bad', '{n} hauls bad'],
  repelsHeld: ['One boarding held', '{n} boardings held'], repelsLost: ['One boarding lost', '{n} boardings lost'],
  boardingsWon: ['One ship carried', '{n} ships carried'], boardingsLost: ['One boarding of hers failed', '{n} boardings of hers failed'],
  fightsWon: ['One fight won', '{n} fights won'], fightsRan: ['One fight run from', '{n} fights run from'], fled: ['One contact run from', '{n} contacts run from'],
  hurts: ['Hurt once', 'Hurt {n} times'], matesHurt: ['One shipmate hurt', '{n} shipmates hurt'], matesLost: ['One shipmate lost', '{n} shipmates lost'],
  onTime: ['One delivery on time', '{n} deliveries on time'], late: ['One delivery late', '{n} deliveries late'],
  fines: ['Fined once', 'Fined {n} times'], ranFromNavy: ['Ran from the navy once', 'Ran from the navy {n} times'],
  barWon: ['One bar fight won', '{n} bar fights won'], barLost: ['One bar fight lost', '{n} bar fights lost'], rocksFound: ['One rock found', '{n} rocks found'],
  wrecksCut: ['One wreck cut', '{n} wrecks cut'], salvageDone: ['One salvage job delivered', '{n} salvage jobs delivered'], rocksSurveyed: ['One rock surveyed', '{n} rocks surveyed'],
};
const capital = s => s.charAt(0).toUpperCase() + s.slice(1);
const recordWords = record => RECORD_KEYS.filter(k => count(record, k) > 0).map(k => { const n = count(record, k); return `${n === 1 ? RECORD_WORDS[k][0] : capital(RECORD_WORDS[k][1].replace('{n}', numberWord(n)))}.`; }).join(' ');
