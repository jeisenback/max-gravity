'use strict';

// Burn events written for a hired hand. A hand draws from a pool of its own, in five groups:
// work at your post (you handle it, and learn), the captain, the crew (the main characters
// where they are aboard), money, and the road (what you see from your post). Their effects
// are your post experience, your savings, and the captain's and crew's opinion of you; none
// reaches into the run itself. Events that are an owner's business (the stowaway, the
// merchant's tip, the drifting container) are hidden from a hand. All the weights are here,
// so they can be tuned in one place. Loaded after hired.js; happenings.js reads it at runtime.

const HIRED_GROUPS = ['work', 'captain', 'crew', 'money', 'road'];
const HIRED_WEIGHTS = { work: 3, captain: 1, crew: 1, money: 1, road: 1, ship: 1 };  // against the rest of the burn's tier-2 weights
const OWNER_ONLY_EVENTS = ['Stowaway', 'Merchant Hail', 'Drifting Cargo Container'];
const WORK_SEEN_DAYS = 30;  // a problem does not come round again for this long

function workEvent(d) {
  const post = d.post, note = n => ` (+${n} experience at the ${POSTS[post].name.toLowerCase()} post.)`;
  // The editor's words for this event, if any (#462): put in front of the table's. The text and the lines are escaped, as for any override; the odds and what a win or a lose does are not touched.
  const o = sceneOverride(`hired:${d.id}`), co = i => (o.choices || {})[i] || {}, line = (mine, shipped) => (mine ? esc(mine) : shipped);
  const careful = [co(0).label || d.careful[0], line(co(0).result, d.careful[1])], quick = [co(1).label || d.quick[0], line(co(1).win, d.quick[1]), line(co(1).lose, d.quick[2])];
  return {
    title: o.title || d.title, text: line(o.text, d.text), via: 'crew', owner: post, workId: d.id, personal: true,
    choices: [
      { label: careful[0], run() { gainSkill(post, 3); return careful[1] + note(3); } },
      { label: `${quick[0]}${costNote({ xp: true, marks: true })}`, bold: true, run() {
        const won = Math.random() < soloOdds(post);
        boldWithCaptain(won);  // the captain's nerve (captains.js)
        if (won) { gainSkill(post, 4); return quick[1] + note(4); }
        gainSkill(post, 1); return quick[2] + note(1);
      } },
    ],
  };
}

// ---------- the captain, the crew, money and the road ----------
// Each is { id, group, mate, when(c), make(c) }; c is who is about: the captain, a shipmate (anyone aboard).
// `mate` marks an event that needs a shipmate.
const capLike = (c, n, memory) => like(c.cap, n, memory);
const learnNote = n => ` (+${n} experience at the ${POSTS[hired().post].name.toLowerCase()} post.)`;
const learn = n => { gainSkill(hired().post, n); return learnNote(n); };
const castKeys = () => castAboard().map(m => m.cast);
const handEvent = (title, text, choices) => ({ title, text, choices, via: 'crew', personal: true });
// The words of an event written in code (#463): the editor's line, else a captain's own wording of the part (captains/*.js, `events`), else the shipped line (SCENE_LINES,
// hiredscenes.js), with its {words} filled from `vars`.
function eventSay(id, key, vars = {}) {
  if ((sceneOverride(`hired:${id}`).parts || {})[key] === undefined) { const own = captainSays(id, key, null); if (own !== null) return own; }
  return sceneSay(`hired:${id}`, key, vars);
}
// A hired event written as data (#473): `data` is { title, text, choices: [{ label, result, effects, post?, skill? }] }, the choices played by dataChoice (js/cast.js)
// with the shipmate the event is about as their context, and the words put through the override layer (sceneWords). {mate} in any of them is the shipmate's first
// name. The event's `learn` effect gives the experience and adds its line to the result.
function dataHandEvent(d, c) {
  const mate = t => (typeof t === 'string' && c.mate ? t.replace(/\{mate\}/g, c.mate.first) : t);
  const scene = sceneWords(`hired:${d.id}`, d.data);
  return handEvent(mate(scene.title), mate(scene.text), scene.choices.map(ch => dataChoice({ ...ch, label: mate(ch.label), result: mate(ch.result) }, c)));
}
const dataEvent = def => { const d = { ...def }; d.make = c => dataHandEvent(d, c); return d; };
// A choice sets a follow-up going (stories/hired-aftermath.js) and the Journal keeps the thread.
const setLater = (name, days, log) => applyEffects({ later: { [name]: days }, log });

const HAND_EVENTS = [
  ...WORK_EVENTS.map(d => ({ id: d.id, group: 'work', post: d.post, make: () => workEvent(d) })),

  { id: 'cap-order', group: 'captain', make: c => { const say = (key, vars) => eventSay('cap-order', key, { last: c.cap.last, ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), run() { setLater(Math.random() < 0.5 ? 'h-hot-good' : 'h-hot-bad', 6, say('c0.log')); capLike(c, 1, say('c0.memory')); return `${say('ordered')}${learn(1)}`; } },
      { label: say('c1.label'), run() {
        if (c.cap.opinion >= captainHears()) { setLater('h-ninety', 7, say('c1.heard.log')); capLike(c, 2, say('c1.heard.memory')); return `${say('heard')}${learn(2)}`; }
        setLater('h-hot-bad', 6, say('c1.notHeard.log')); capLike(c, -1, say('c1.notHeard.memory'));
        return say('notHeard');
      } },
      { label: say('c2.label'), opinion: {
        who: 'captain',
        min: captainHears()
      }, run() { setLater('h-ninety', 7, say('c2.log')); capLike(c, 2, say('c2.memory')); return `${say('c2.result')}${learn(2)}`; } },
      { label: say('c3.label'), post: 'engineer', skill: 2, run() { setLater('h-ninety', 7, say('c3.log')); capLike(c, 2, say('c3.memory')); return `${say('c3.result')}${learn(2)}`; } },
      { label: say('c4.label'), post: 'pilot', skill: 2, run() { setLater('h-ninety', 7, say('c4.log')); capLike(c, 2, say('c4.memory')); return `${say('c4.result')}${learn(2)}`; } },
    ]); } },

  { id: 'cap-praise', group: 'captain', make: c => { const say = (key, vars) => eventSay('cap-praise', key, { last: c.cap.last, post: POSTS[hired().post].name.toLowerCase(), Post: POSTS[hired().post].name, ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), run() { setLater('h-praise-trust', 10, say('c0.log')); capLike(c, 1, say('c0.memory')); return `${say('take')}${learn(1)}`; } },
      { label: say('c1.label'), run() {
        if (c.cap.opinion >= captainBonus()) { G.state.credits += 60; capLike(c, 0, say('c1.bonusYes.memory')); return say('bonusYes'); }
        setLater('h-owed', 8, say('c1.bonusNo.log')); capLike(c, -1, say('c1.bonusNo.memory'));
        return say('bonusNo');
      } },
      { label: say('c2.label'), skill: 3, run() { G.state.credits += 60; capLike(c, 1, say('c2.memory')); return `${say('c2.result')}${learn(1)}`; } },
    ]); } },

  { id: 'cap-dressing', group: 'captain', make: c => { const say = (key, vars) => eventSay('cap-dressing', key, { last: c.cap.last, ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), run() { setLater('h-log-trust', 12, say('c0.log')); capLike(c, 1, say('c0.memory')); return `${say('own')}${learn(2)}`; } },
      { label: say('c1.label'), run() {
        G.nextEvent = handEvent(say('terminal.title'), say('terminal'), [
          { label: say('terminal.c0.label'), run() {
            if (Math.random() < 0.4) { capLike(c, 1, say('terminal.c0.showWin.memory')); return `${say('showWin')}${learn(1)}`; }
            capLike(c, -2, say('terminal.c0.showLose.memory'));
            return say('showLose');
          } },
          { label: say('terminal.c1.label'), run() { capLike(c, 0, say('terminal.c1.memory')); return say('admit'); } },
        ]);
        return say('blame');
      } },
    ]); } },

  { id: 'cap-favour', group: 'captain', make: c => { const say = (key, vars) => eventSay('cap-favour', key, { last: c.cap.last, ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), run() { setLater('h-favour-back', 9, say('c0.log')); capLike(c, 2, say('c0.memory')); return `${say('stand')}${learn(2)}`; } },
      { label: say('c1.label'), run() { G.state.credits += 40; capLike(c, 0, say('c1.memory')); return say('fee'); } },
      { label: say('c2.label'), run() { setLater('h-favour-cold', 5, say('c2.log')); capLike(c, -1, say('c2.memory')); return say('beg'); } },
    ]); } },

  dataEvent({
    id: 'crew-cover', mate: true, group: 'crew',
    data: {
      title: 'Cover for a Shipmate',
      text: '{mate} finds you before the watch change, looking at the deck. They have a thing to do, a message to send, a call home that cannot wait, and could you take the first hour of their watch, and not say anything about it?',
      choices: [
        {
          label: 'Cover for them',
          effects: { remember: 'cover', later: { 'h-cover-back': 10 }, log: 'Covered an hour of {thread:cover}\'s watch.', mateLike: { n: 2, memory: 'You covered an hour of my watch and said nothing.' }, learn: 1 },
          result: 'You cover it, and it is a quiet hour. When they come back, {mate} looks at you across the galley, and does not mention ' +
            'it.',
        },
        {
          label: 'Not tonight',
          effects: { remember: 'cover', later: { 'h-cover-cold': 5 }, log: 'Would not cover for {thread:cover}.', mateLike: { n: -1, memory: 'You wouldn\'t cover an hour of my watch.' } },
          result: '{mate} says it is fine. For a day or two {mate} takes the other end of the galley table.',
        },
      ],
    },
  }),

  { id: 'crew-needle', mate: true, group: 'crew', make: c => { const say = (key, vars) => eventSay('crew-needle', key, { mate: c.mate.first, post: POSTS[hired().post].name.toLowerCase(), Post: POSTS[hired().post].name, ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), run() {
        remember('needle', c.mate);
        if (Math.random() < soloOdds(hired().post)) { setLater('h-needle-ally', 8, say('c0.win.log')); like(c.mate, 1, say('c0.win.memory')); return `${say('c0.win')}${learn(2)}`; }
        setLater('h-needle-worse', 6, say('c0.lose.log')); like(c.mate, -1, say('c0.lose.memory'));
        return `${say('c0.lose')}${learn(1)}`;
      } },
      { label: say('c1.label'), skill: 2, run() { remember('needle', c.mate); like(c.mate, 2, say('c1.result.memory')); return `${say('c1.result')}${learn(1)}`; } },
      { label: say('c2.label'), run() { like(c.mate, 0, say('c2.result.memory')); return say('c2.result'); } },
    ]); } },

  { id: 'crew-cards', mate: true, group: 'crew', make: c => { const say = (key, vars) => eventSay('crew-cards', key, { mate: c.mate.first, ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), ...gated(needCr(50)), run() {
        remember('cards', c.mate); setLater('h-cards-rematch', 7, say('c0.log'));
        if (Math.random() < 0.45) { G.state.credits += 100; like(c.mate, 1, say('c0.win.memory')); return say('c0.win', { net: fmt(50) }); }
        G.state.credits -= 50; like(c.mate, 1, say('c0.lose.memory'));
        return say('c0.lose');
      } },
      { label: say('c1.label'), run() { like(c.mate, 0, say('c1.result.memory')); return say('c1.result'); } },
    ]); } },

  dataEvent({
    id: 'crew-ines', group: 'crew', when: () => castKeys().includes('ines'),
    data: {
      title: 'Ines Calls the Numbers',
      text: 'Ines is flying a hard approach by hand, a tight, ugly one, and asks you over her shoulder, without looking round, whether you would read her the numbers. "Slowly," she says. "And don\'t be clever."',
      choices: [
        {
          label: 'Read her the numbers',
          effects: { castLike: { who: 'ines', n: 1, memory: 'You read me the numbers on a hard approach and didn\'t try to be clever.' }, learn: 3 },
          result: 'You read her the numbers one by one, plainly, and she flies them, and the ship settles onto the line. "Good," says Ines.',
        },
        {
          label: '[Pilot 2] Check her numbers against your own',
          post: 'pilot',
          skill: 2,
          effects: { castLike: { who: 'ines', n: 2, memory: 'You caught a wrong figure on my approach and said it plainly.' }, learn: 2 },
          result: 'You have the approach on your own plot, half a second behind hers. On the last leg one of your figures does not match. "Say again," Ines ' +
            'says. You say it again. She finds the transposed digit on her sheet, corrects it without a word, and flies the corrected line. Afterward ' +
            'she writes the figure in her notebook.',
        },
        {
          label: '[Pilot 3] Ask to fly the last leg',
          post: 'pilot',
          skill: 3,
          effects: { castFlag: { who: 'ines', flag: 'trusted' }, castLike: { who: 'ines', n: 3, memory: 'You flew the last leg of a hard approach with me beside you, and I didn\'t touch the controls.' }, learn: 3 },
          result: '"Your line," Ines says, and takes her hands off. You fly the last leg with her reading the sheet beside you and saying nothing. The ship ' +
            'comes onto the pad. She signs the log under your name. "Don\'t tell the captain," she says. "Tell everyone else."',
        },
        {
          label: 'Say you would rather watch',
          effects: { castLike: { who: 'ines', n: 0, memory: 'You watched from the back and let me fly.' } },
          result: 'You stand behind her and watch her hands, and she does not say a word, and the approach is flawless. You do not learn much, but you do not break anything.',
        },
      ],
    },
  }),

  dataEvent({
    id: 'crew-tomas', group: 'crew', when: () => castKeys().includes('tomas'),
    data: {
      title: 'Tomas in the Engine Room',
      text: 'Tomas has a flask, two tin cups and the whole of a quiet watch, and he pours you one without asking. "Sit," he says. "She\'s running well, and I\'d like to tell somebody why."',
      choices: [
        {
          label: 'Sit and listen',
          effects: { castLike: { who: 'tomas', n: 1, memory: 'You sat with me in the engine room and listened.' }, learn: 2 },
          result: 'He tells you about the loop, and the mounts, and the three hulls he has rebuilt, with unhurried pride, and you listen, and the flask goes ' +
            'round twice.',
        },
        {
          label: '[Engineer 2] Tell him what you hear in the loop',
          post: 'engineer',
          skill: 2,
          effects: { castLike: { who: 'tomas', n: 2, memory: 'You heard a tick in the loop that I had stopped hearing.' }, learn: 2 },
          result: 'You say there is a tick on the third pump at the top of each cycle, a hair late. Tomas puts a hand flat on the housing and waits for it to ' +
            'come round. "Third pump," he says. He writes the number on the back of his hand and pours you a second cup.',
        },
        {
          label: '[Engineer 3] Ask to take the other end of the loop',
          post: 'engineer',
          skill: 3,
          effects: { castFlag: { who: 'tomas', flag: 'trusted' }, castLike: { who: 'tomas', n: 3, memory: 'You took the other end of the loop with me and didn\'t need to be told.' }, learn: 3 },
          result: 'Tomas hands you the wrench. You take the second pump out of the loop while he holds the light, and put it back, and he checks nothing. ' +
            '"Twenty years," he says, "and I\'ve never let anyone take the second pump." He pours the second cup.',
        },
        {
          label: 'Say you have work to do',
          effects: { castLike: { who: 'tomas', n: 0, memory: 'You had work to do and didn\'t stay.' } },
          result: '"Of course," he says, and caps the flask, and turns back to the loop.',
        },
      ],
    },
  }),

  dataEvent({
    id: 'crew-yelena', group: 'crew', when: () => castKeys().includes('yelena'),
    data: {
      title: 'Yelena Wants a Sparring Partner',
      text: 'Yelena has set up the range sim on its hardest setting, and is holding the second controller out to you. "No benches," she says. "Everybody plays. Come on."',
      choices: [
        {
          label: 'Take the other console',
          effects: { castLike: { who: 'yelena', n: 1, memory: 'You took the other console on the range and didn\'t sulk about losing.' }, learn: 3 },
          result: 'You take the other console, and she beats you soundly, and then shows you how: where to look, and when. You lose four rounds in a row. By ' +
            'the fifth you are less bad.',
        },
        {
          label: '[Gunner 2] Take the hard setting and hold the lead',
          post: 'gunner',
          skill: 2,
          effects: { castLike: { who: 'yelena', n: 2, memory: 'You held the lead on the hard setting for ninety seconds.' }, learn: 2 },
          result: 'You take the other console on the hard setting and hold the lead for ninety seconds before she takes it back. She finishes ahead. She sets ' +
            'the controller down and tells you where you lost it: the third target, the late lead on the crossing. The next watch she asks you ' +
            'again.',
        },
        {
          label: '[Gunner 3] Ask for her own worst setting',
          post: 'gunner',
          skill: 3,
          effects: { castFlag: { who: 'yelena', flag: 'trusted' }, castLike: { who: 'yelena', n: 3, memory: 'You beat my score on my own worst setting.' }, learn: 3 },
          result: 'She sets the sim to the setting she keeps for herself. You beat her score by four points. Yelena looks at the number, then ' +
            'writes it on the bulkhead over the console with a marker, under her own. "Again tomorrow," she says.',
        },
        {
          label: 'Say your knee is bad too',
          effects: { castLike: { who: 'yelena', n: 0, memory: 'You said you\'d sit out the range.' } },
          result: '"You don\'t have a bad knee," Yelena says. "You have a bench." But she lets it go, with a snort, and sets the sim back to something kinder for whoever comes next.',
        },
      ],
    },
  }),

  dataEvent({
    id: 'crew-ruben', group: 'crew', when: () => castKeys().includes('ruben'),
    data: {
      title: 'Ruben and the Thermos',
      text: 'Ruben has a thermos of something hot and a stack of intercepts in piles, and he offers you a cup, as he offers everyone, and a pile, as he does not. "Help me sort," he says. "Slowly. I\'ll tell you what\'s true and what\'s only lovely."',
      choices: [
        {
          label: 'Help him sort',
          effects: { castLike: { who: 'ruben', n: 1, memory: 'You helped me sort the intercepts and didn\'t mind the stories.' }, learn: 2 },
          result: 'You sort, and he talks, and by the end of the stack you have learned which dome is short of what, who is lying about it, and a good deal ' +
            'about how to listen to a lane.',
        },
        {
          label: '[Comms 2] Tell him which pile is true',
          post: 'comms',
          skill: 2,
          effects: { castLike: { who: 'ruben', n: 2, memory: 'You sorted my intercepts by the handshake tones, and you were right.' }, learn: 2 },
          result: 'You go through the stack and split it in two by the timing of the handshake tones. Ruben checks three of your picks against what he knows ' +
            'and finds all three right. He moves the thermos from his pile to yours.',
        },
        {
          label: '[Comms 3] Find the signal that is neither',
          post: 'comms',
          skill: 3,
          effects: { castFlag: { who: 'ruben', flag: 'trusted' }, castLike: { who: 'ruben', n: 3, memory: 'You found the one in my stack that was neither lovely nor true.' }, learn: 3 },
          result: 'Near the bottom of the stack there is a signal that is neither a rumor nor a story: a burst, repeated, with a pattern in the gaps. You ' +
            'hold it up. Ruben stops talking. He takes a key from his collar and unlocks the box under the console, and puts the originals in front of ' +
            'you.',
        },
        {
          label: 'Take the tea and go',
          effects: { castLike: { who: 'ruben', n: 0, memory: 'You took the tea and went.' } },
          result: 'You take the cup, and thank him, and go. "Another time," Ruben says, cheerfully, and returns to his piles, humming. He is not the kind to hold it against you.',
        },
      ],
    },
  }),

  dataEvent({
    id: 'crew-bexa', group: 'crew', when: () => castKeys().includes('bexa'),
    data: {
      title: 'Bexa\'s List',
      text: 'Bexa has a small brass tag on a string above the helm, and a notebook she keeps open on the console and does not like being looked at. Tonight she catches you looking, and turns it round instead of closing it. "It\'s a list," she says. "Ask me properly."',
      choices: [
        {
          label: 'Ask about the first name',
          effects: { castLike: { who: 'bexa', n: 2, memory: 'You asked about the list the right way, and listened.' }, learn: 2 },
          result: 'You ask about the first name, and she tells you: a ship, a year, a crew of six, and what was left. She talks for a long time. ' +
            'When she stops, she closes the book and points it at the helm. "Sit. I\'ll show you how I\'d have brought them in."',
        },
        {
          label: 'Look away',
          effects: { castLike: { who: 'bexa', n: 0, memory: 'You looked away from the list.' } },
          result: 'You look at the console, and she closes the book, with a nod, and puts it back in her pocket.',
        },
      ],
    },
  }),

  dataEvent({
    id: 'crew-pax', group: 'crew', when: () => castKeys().includes('pax'),
    data: {
      title: 'Pax Checks the Coupling',
      text: 'Pax is checking the coupling on the gun mount for the fifth time this watch. It is perfect. Pax knows it is perfect, and checks it anyway, jaw tight, and glances at you when the check is done.',
      choices: [
        {
          label: 'Check it with them',
          effects: { castLike: { who: 'pax', n: 1, memory: 'You checked the coupling with me instead of telling me to stop.' }, learn: 2 },
          result: 'You take the other side and check it together, torque by torque, and when you reach the end you both say "good" at once. Pax almost smiles.',
        },
        {
          label: '[Gunner 2] Show them the torque log',
          post: 'gunner',
          skill: 2,
          effects: { castLike: { who: 'pax', n: 2, memory: 'You showed me the torque log, and it was the same every time.' }, learn: 2 },
          result: 'You pull the mount\'s torque log for the last six watches and put it in front of Pax. The coupling has read the same figure every time. Pax ' +
            'reads the column down twice and closes the panel. They do not check it again that watch.',
        },
        {
          label: '[Gunner 3] Ask them to check your mount',
          post: 'gunner',
          skill: 3,
          effects: { castFlag: { who: 'pax', flag: 'trusted' }, castLike: { who: 'pax', n: 3, memory: 'You asked me to check your mount, and listened to what I found.' }, learn: 3 },
          result: 'You ask Pax to go over your own mount. Pax does it torque by torque, with the log open, and finds one fitting a quarter turn under. You ' +
            'fix it together. Pax signs the log next to your initials. "Yours now," Pax says, and does not check the coupling again that ' +
            'watch.',
        },
        {
          label: 'Tell them it is fine',
          effects: { castLike: { who: 'pax', n: 0, memory: 'You told me the coupling was fine.' } },
          result: '"I know it\'s fine," says Pax. "That\'s not the point." They go back to it, and you leave them to it.',
        },
      ],
    },
  }),

  { id: 'money-side', group: 'money', make: c => { const say = (key, vars) => eventSay('money-side', key, vars); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), run() {
        const n = randInt(8, 16) * 10;
        G.nextEvent = handEvent(say('crates.title'), say('crates.text'), [
          { label: say('crates.c0.label'), run() { G.state.credits += n; return say('crates.c0.result', { n: fmt(n) }); } },
          { label: say('crates.c1.label'), run() { G.state.credits += n * 2; setLater('h-side-trouble', 9, say('crates.c1.log')); return say('crates.c1.result', { n: fmt(n * 2) }); } },
        ]);
        return say('c0.result');
      } },
      { label: say('c1.label'), run: () => say('c1.result') },
    ]); } },

  { id: 'money-loan', mate: true, group: 'money', make: c => { const say = (key, vars) => eventSay('money-loan', key, { mate: c.mate.first, ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'),
      ...gated(needCr(100)),
      run() { G.state.credits -= 100; remember('loan', c.mate); setLater(Math.random() < 0.7 ? 'h-loan-repaid' : 'h-loan-default', 12, say('c0.log')); like(c.mate, 3, say('c0.result.memory')); return say('c0.result'); } },
      {
        label: say('c1.label'),
        ...gated(needCr(50)),
        run() { G.state.credits -= 50; remember('loan', c.mate); setLater('h-loan-small', 12, say('c1.log')); like(c.mate, 1, say('c1.result.memory')); return say('c1.result'); }
      },
      { label: say('c2.label'), run() { like(c.mate, -1, say('c2.result.memory')); return say('c2.result'); } },
    ]); } },

  { id: 'money-short', group: 'money', make: c => { const say = (key, vars) => eventSay('money-short', key, { wage: fmt(hired().wage), ...vars }); return handEvent(say('title'),
    say('text'), [
      { label: say('c0.label'), run() { setLater('h-short-audit', 10, say('c0.log')); G.state.credits += hired().wage; capLike(c, 0, say('c0.memory')); return say('c0.result'); } },
      { label: say('c1.label'), run() { setLater('h-scene-fallout', 6, say('c1.log')); G.state.credits += hired().wage; capLike(c, -2, say('c1.memory')); return say('c1.result'); } },
      { label: say('c2.label'), run: () => say('c2.result') },
    ]); } },

  { id: 'road-scope', group: 'road', make: c => {
    const post = hired().post, say = (key, vars) => eventSay('road-scope', key, { last: c.cap.last, ...vars });
    return handEvent(say('title'),
      say('text', { where: say(`where.${post}`) }), [
        { label: say('c0.label'), run() {
          capLike(c, 1, say('c0.memory'));
          G.nextEvent = handEvent(say('see.title'), say('see.text'), [
            { label: say('see.c0.label'), run() { setLater('h-lane-again', 9, say('see.c0.log')); return `${say('see.c0.result')}${learn(2)}`; } },
            { label: say('see.c1.label'), run() { capLike(c, -1, say('see.c1.memory')); setLater('h-lane-again', 9, say('see.c1.log')); return `${say('see.c1.result')}${learn(1)}`; } },
          ]);
          return say('c0.result');
        } },
        { label: say('c1.label'), run() { capLike(c, 0, say('c1.memory')); return `${say('c1.result')}${learn(1)}`; } },
        { label: say('c2.label'), post: 'pilot', skill: 2, run() { setLater('h-lane-again', 9, say('c2.log')); capLike(c, 2, say('c2.memory')); return `${say('c2.result')}${learn(2)}`; } },
        { label: say('c3.label'), post: 'gunner', skill: 2, run() { setLater('h-lane-again', 9, say('c3.log')); capLike(c, 2, say('c3.memory')); return `${say('c3.result')}${learn(2)}`; } },
        { label: say('c4.label'), post: 'engineer', skill: 2, run() { setLater('h-lane-again', 9, say('c4.log')); capLike(c, 2, say('c4.memory')); return `${say('c4.result')}${learn(2)}`; } },
        { label: say('c5.label'), post: 'comms', skill: 2, run() { setLater('h-lane-again', 9, say('c5.log')); capLike(c, 2, say('c5.memory')); return `${say('c5.result')}${learn(2)}`; } },
        { label: say('c6.label'), run() { setLater('h-lane-trouble', 7, say('c6.log')); return say('c6.result'); } },
      ]);
  } },
];

// Who is about on this burn: the captain, and a shipmate (the main characters are shipmates when aboard).
function handContext() {
  const mates = procedural().map(f => f.p);
  return { cap: person(hired().captain), mate: mates.length ? pick(mates) : null };
}

// An event of the group the hand has not had lately, and that has what it needs (a shipmate, the
// main character it is about being aboard).
function hiredEvent(group) {
  const h = hired(), st = G.state, seen = st.eventSeen = st.eventSeen || {}, c = handContext();
  const fresh = HAND_EVENTS.filter(d => d.group === group && (!d.post || d.post === h.post) && !(seen[d.id] > st.day - WORK_SEEN_DAYS)
    && (!d.when || d.when(c)) && (!d.mate || c.mate));
  if (!fresh.length) return null;
  // Everything fresh is shown once before anything is shown twice: a post has a handful of problems, and a game of a hundred
  // days would otherwise come round to the same one after the thirty-day gap while others had not come up at all.
  const shown = st.handShown = st.handShown || {}, least = Math.min(...fresh.map(d => shown[d.id] || 0));
  const d = pick(fresh.filter(x => (shown[x.id] || 0) === least));
  seen[d.id] = st.day;
  shown[d.id] = (shown[d.id] || 0) + 1;
  return d.make(c);
}

// ---------- downtime ----------
// What a hired hand can add to the downtime menu (shiplife.js): at most four are offered at a time, the
// main characters first, the rest in turn with the date. Effects are the same as the events': experience,
// savings and opinion. A hand's savings are their own, so the menu is a personal event.
const mates = () => procedural().map(f => f.p);
const postOfRole = role => Object.keys(POSTS).find(k => POSTS[k].role === role);
const shadowable = () => mates().filter(m => postOfRole(m.role) && postOfRole(m.role) !== hired().post);
const downSay = (key, vars) => sceneSay('scene:downtime', key, vars);  // the words of these are the lines of scene:downtime (hiredscenes.js)
const learnAt = (post, n) => { gainSkill(post, n); return ` ${downSay('learn', { n, post: POSTS[post].name.toLowerCase() })}`; };
const castDowntime = (key, post) => ({
  cast: true, get label() { return downSay(`${key}.label`); }, can: () => castKeys().includes(key),
  run() { castLike(key, 1, downSay('cast.memory')); return downSay(`${key}.result`) + learnAt(post, 3); },
});
const downtime = (key, can, run) => ({ get label() { return downSay(`${key}.label`); }, can, run });

const HAND_DOWNTIME = [
  downtime('advice', () => !!hired(),
    () => { const cap = person(hired().captain); like(cap, 1, downSay('advice.memory')); return downSay('advice.result', { cap: cap.last }) + learnAt(hired().post, 2); }),
  downtime('shadow', () => !!hired() && shadowable().length > 0,
    () => { const m = pick(shadowable()), post = postOfRole(m.role); like(m, 1, downSay('shadow.memory')); return downSay('shadow.result', { first: m.first, post: POSTS[post].name.toLowerCase() }) + learnAt(post, 3); }),
  downtime('mend', () => !!hired() && mates().length > 0,
    () => { const m = pick(mates()), n = randInt(3, 6) * 10; G.state.credits += n; like(m, 1, downSay('mend.memory')); return downSay('mend.result', { first: m.first, n: fmt(n) }); }),
  downtime('spare', () => !!hired(),
    () => { const cap = person(hired().captain); G.state.credits += 40; like(cap, 1, downSay('spare.memory')); return downSay('spare.result', { n: fmt(40) }) + learnAt(hired().post, 1); }),
  downtime('teach', () => !!hired() && mates().length > 0,
    () => { const m = pick(mates()); like(m, 2, downSay('teach.memory')); return downSay('teach.result', { first: m.first, post: POSTS[hired().post].name.toLowerCase() }) + learnAt(hired().post, 1); }),
  downtime('stories', () => !!hired() && mates().length > 0,
    () => { for (const m of mates()) like(m, 1, downSay('stories.memory')); return downSay('stories.result'); }),
  castDowntime('ines', 'pilot'),
  castDowntime('tomas', 'engineer'),
  castDowntime('yelena', 'gunner'),
  castDowntime('ruben', 'comms'),
  castDowntime('bexa', 'pilot'),
  castDowntime('pax', 'gunner'),
];

function handDowntime() {
  if (!hired()) return [];
  const ok = HAND_DOWNTIME.filter(d => d.can()), turn = G.state.day % Math.max(1, ok.filter(d => !d.cast).length);
  const rest = ok.filter(d => !d.cast), spun = rest.slice(turn).concat(rest.slice(0, turn));
  return [...ok.filter(d => d.cast).slice(0, 2), ...spun].slice(0, 4);
}
