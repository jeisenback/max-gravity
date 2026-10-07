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
  return {
    title: d.title, text: d.text, via: 'crew', owner: post, workId: d.id, personal: true,
    choices: [
      { label: d.careful[0], run() { gainSkill(post, 3); return d.careful[1] + note(3); } },
      { label: `${d.quick[0]}${costNote({ xp: true, marks: true })}`, bold: true, run() {
        const won = Math.random() < soloOdds(post);
        boldWithCaptain(won);  // the captain's nerve (captains.js)
        if (won) { gainSkill(post, 4); return d.quick[1] + note(4); }
        gainSkill(post, 1); return d.quick[2] + note(1);
      } },
    ],
  };
}

// ---------- the captain, the crew, money and the road ----------
// Each is { id, group, mate, when(c), make(c) }; c is who is about: the captain, a shipmate (anyone aboard).
// `mate` marks an event that needs a shipmate.
const capLike = (c, n, memory) => like(c.cap, n, memory);
const learn = n => { gainSkill(hired().post, n); return ` (+${n} experience at the ${POSTS[hired().post].name.toLowerCase()} post.)`; };
const castKeys = () => castAboard().map(m => m.cast);
const handEvent = (title, text, choices) => ({ title, text, choices, via: 'crew', personal: true });
// A choice sets a follow-up going (stories/hired-aftermath.js) and the Journal keeps the thread.
const setLater = (name, days, log) => applyEffects({ later: { [name]: days }, log });

const HAND_EVENTS = [
  ...WORK_EVENTS.map(d => ({ id: d.id, group: 'work', post: d.post, make: () => workEvent(d) })),

  { id: 'cap-order', group: 'captain', make: c => handEvent('An Order You Do Not Like',
    captainSays('cap-order', 'text', `Captain ${c.cap.last} wants the drive run hotter than you would, to make a berth window at the next port, and has said so once, without looking up from the board. You have a view, and so, you suspect, does everyone else aboard.`), [
      { label: 'Do as ordered', run() { setLater(Math.random() < 0.5 ? 'h-hot-good' : 'h-hot-bad', 6, 'Ran the drive hot on {captain}\'s order.'); capLike(c, 1, 'You did as you were told on the hot burn.'); return (
          `${captainSays('cap-order', 'ordered', 'You run it the way you were told, and the window is made, with a minute to spare. The captain says nothing, and initials the log.')}${learn(1)}`); } },
      { label: 'Say what you think', run() {
        if (c.cap.opinion >= captainHears()) { setLater('h-ninety', 7, 'Told {captain} what I thought of the hot burn, and was heard.'); capLike(c, 2, 'You told me plainly what you thought, and you were right to.'); return (
            `${captainSays('cap-order', 'heard', (
            'You say it plainly and without heat, and the captain listens, and, after a long pause, gives ground a little. "Noted," the captain says. ' +
            '"Run it at ninety." It is the first time anyone has been asked.'))}${learn(2)}`); }
        setLater('h-hot-bad', 6, 'Argued the hot burn with {captain} and lost.'); capLike(c, -1, 'You argued the burn with me when I had decided.');
        return captainSays('cap-order', 'notHeard', 'You say it, and it lands badly. "I did not ask," the captain says, quite pleasantly, and the conversation is over. You run it hot, and it works.');
      } },
      { label: '"Ninety. I will find the minutes on the approach."', opinion: {
        who: 'captain',
        min: captainHears()
      }, run() { setLater('h-ninety', 7, 'Offered {captain} ninety and the minutes on the approach, and was heard.'); capLike(c, 2, 'You gave me a figure and a plan, not a complaint.'); return (
          `You say it flat, like a figure and not a complaint. The captain looks up from the board for the first time. "Show me the approach," the ` +
          `captain says, and you do. The window is made at ninety, with two minutes to spare.${learn(2)}`); } },
      { label: '[Engineer 2] Put the heat figures in front of the captain', post: 'engineer', skill: 2, run() { setLater('h-ninety', 7, 'Showed {captain} the heat figures on a hot burn, and was heard.'); capLike(c, 2, 'You showed me the figures on the hot burn, and they were right.'); return (
          `You put the coolant temperatures and the housing margin on the board and say how long the drive lasts at that setting. The captain reads ` +
          `the figures twice. "Ninety," the captain says. The window is made.${learn(2)}`); } },
      { label: '[Pilot 2] Replot the approach to make the window cooler', post: 'pilot', skill: 2, run() { setLater('h-ninety', 7, 'Replotted the approach on a hot burn, and was heard.'); capLike(c, 2, 'You replotted the burn so the window was made without the hot drive.'); return (
          `You rerun the approach with a later flip and a shallower brake and show the captain the arrival time. It is four minutes inside the ` +
          `window. "Run it at ninety, and fly that," the captain says.${learn(2)}`); } },
    ]) },

  { id: 'cap-praise', group: 'captain', make: c => handEvent('A Word of Praise',
    captainSays('cap-praise', 'text', `Captain ${c.cap.last} catches you at the end of a watch and says, with the air of a person reading out a line item, that the ${POSTS[hired().post].name.toLowerCase()} has not given the ship a worry in a week. It is, from this captain, practically a speech.`), [
      { label: 'Take it modestly', run() { setLater('h-praise-trust', 10, '{captain} said something kind and I did not make a thing of it.'); capLike(c, 1, 'You took my thanks without making a thing of it.'); return (
          `${captainSays('cap-praise', 'take', (
          '"The crew make it easy," you say, and the captain gives a short, satisfied nod, and goes aft. You stand a little straighter for the rest ' +
          'of the watch.'))}${learn(1)}`); } },
      { label: 'Ask if it is worth a bonus', run() {
        if (c.cap.opinion >= captainBonus()) { G.state.credits += 60; capLike(c, 0, 'You asked for a bonus and had earned it.'); return captainSays('cap-praise', 'bonusYes', (
            'The captain raises an eyebrow, and then, to your surprise, laughs. "Fair," the captain says. "Sixty." It lands in your account before ' +
            'the end of the watch.')); }
        setLater('h-owed', 8, 'Asked {captain} for a bonus before I had earned one.'); capLike(c, -1, 'You asked for a bonus before you had earned one.');
        return captainSays('cap-praise', 'bonusNo', 'The captain looks at you for a moment. "When it is a speech, it is free," the captain says. "When it is a bonus, it is earned." You have the feeling of having spent something you did not have.');
      } },
      { label: `[${POSTS[hired().post].name} 3] Ask for the bonus, with the week's figures`, skill: 3, run() { G.state.credits += 60; capLike(c, 1, 'You asked for a bonus and brought the figures to show it.'); return (
          `You bring the week's log from the post, with the figures marked. The captain reads down the column. "Sixty," the captain says. It is in ` +
          `your account before the end of the watch.${learn(1)}`); } },
    ]) },

  { id: 'cap-dressing', group: 'captain', make: c => handEvent('A Dressing-Down',
    captainSays('cap-dressing', 'text', `The log has a gap in it, a watch with no entry, and the captain has found it. Captain ${c.cap.last} does not shout. The log goes on the galley table, turned round so it faces you, and the captain waits, and the waiting is the worst of it.`), [
      { label: 'Own it', run() { setLater('h-log-trust', 12, 'Owned a gap in the ship\'s log without being made to.'); capLike(c, 1, 'You owned a mistake in the log without being made to.'); return (
          `${captainSays('cap-dressing', 'own', (
          '"That was mine," you say. "I will fix it tonight." The captain looks at you a moment longer, and nods, and takes the log back. It is not ' +
          'forgiveness, quite, but it is the beginning of the end of the matter.'))}${learn(2)}`); } },
      { label: 'Blame the old terminal', run() {
        G.nextEvent = handEvent('The Terminal', captainSays('cap-dressing', 'terminal', `"Then we will see," Captain ${c.cap.last} says, and pulls the terminal across the table. The two of you watch the log for a minute while it does nothing at all.`), [
          { label: 'Show how it drops entries', run() {
            if (Math.random() < 0.4) { capLike(c, 1, 'The terminal really did drop an entry, and you showed me.'); return (
                `${captainSays('cap-dressing', 'showWin', (
                'Just as you open your mouth, it does: a line blinks out, and back, and is gone. The captain looks at it for a long time. "I will ' +
                'have it replaced," the captain says. "And I owe you an apology, which I am not good at."'))}${learn(1)}`); }
            capLike(c, -2, 'You blamed the terminal and the terminal was fine.');
            return captainSays('cap-dressing', 'showLose', 'It does nothing. Not a flicker. The log sits there, clean and obedient, and the captain looks at it, and at you, and says, with great gentleness, "Well." There is no worse word.');
          } },
          { label: 'Admit it was you', run() { capLike(c, 0, 'You admitted the gap in the log after blaming the terminal.'); return captainSays('cap-dressing', 'admit', (
              'You say it, late, and with your eyes on the table. The captain nods. "That is the second time you have told me the truth tonight," the ' +
              'captain says. "The first one cost you more." It is not forgiveness. It is arithmetic.')); } },
        ]);
        return captainSays('cap-dressing', 'blame', 'You mention the terminal, which does, in fairness, lose entries. "Then we will see," the captain says, quietly.');
      } },
    ]) },

  { id: 'cap-favour', group: 'captain', make: c => handEvent('A Favor',
    captainSays('cap-favour', 'text', `Captain ${c.cap.last} asks whether you would stand an extra watch so a crew member can sleep, and say nothing about it. It is not in the articles.`), [
      { label: 'Stand the watch', run() { setLater('h-favour-back', 9, 'Stood an extra watch for {captain}.'); capLike(c, 2, 'You stood a watch for me without being paid for it.'); return (
          `${captainSays('cap-favour', 'stand', (
          'You take it, and the long dark hours go slowly, with a flask of the galley\'s worst coffee, and nobody ever mentions it. The captain ' +
          'mentions it once, at the next port, in a single sentence, and it is enough.'))}${learn(2)}`); } },
      { label: 'Stand it for forty credits', run() { G.state.credits += 40; capLike(c, 0, 'You stood a watch for me for a fee.'); return captainSays('cap-favour', 'fee', (
          'The captain pays it without comment, out of the ship\'s own pocket, and files it, you can tell, under a heading of its own. The watch ' +
          'passes like any other.')); } },
      { label: 'Beg off', run() { setLater('h-favour-cold', 5, 'Would not stand an extra watch for {captain}.'); capLike(c, -1, 'You would not stand an extra watch.'); return captainSays('cap-favour', 'beg', (
          '"Of course," says the captain, evenly, and goes to find somebody else. It is the answer you were entitled to give, and you feel it on the ' +
          'back of your neck for the rest of the burn.')); } },
    ]) },

  { id: 'crew-cover', mate: true, group: 'crew', make: c => handEvent('Cover for a Shipmate',
    `${c.mate.first} finds you before the watch change, looking at the deck. They have a thing to do, a message to send, a call home that cannot wait, and could you take the first hour of their watch, and not say anything about it?`, [
      { label: 'Cover for them', run() { remember('cover', c.mate); setLater('h-cover-back', 10, 'Covered an hour of {thread:cover}\'s watch.'); like(c.mate, 2, 'You covered an hour of my watch and said nothing.'); return (
          `You cover it, and it is a quiet hour. When they come back, ${c.mate.first} looks at you across the galley, and does not mention ` +
          `it.${learn(1)}`); } },
      { label: 'Not tonight', run() { remember('cover', c.mate); setLater('h-cover-cold', 5, 'Would not cover for {thread:cover}.'); like(c.mate, -1, 'You would not cover an hour of my watch.'); return `${c.mate.first} nods and says it is fine. For a day or two the galley table is colder.`; } },
    ]) },

  { id: 'crew-needle', mate: true, group: 'crew', make: c => handEvent('Words in the Galley',
    `${c.mate.first} has been needling you for a week about the ${POSTS[hired().post].name.toLowerCase()}, calling it a soft job. Tonight, over the mess table, they say it where everyone can hear.`, [
      { label: 'Show them the work', run() {
        remember('needle', c.mate);
        if (Math.random() < soloOdds(hired().post)) { setLater('h-needle-ally', 8, 'Showed {thread:needle} my post, and they came round.'); like(c.mate, 1, 'You showed me what the post is really like.'); return (
            `You take them through a watch at your post, slowly and without a word of argument, and by the end they are a good deal quieter. "All ` +
            `right," ${c.mate.first} says. "Fair."${learn(2)}`); }
        setLater('h-needle-worse', 6, 'Tried to prove a point to {thread:needle} and it went badly.'); like(c.mate, -1, 'You tried to prove a point about your post and it went badly.');
        return `You try to show them, and it goes wrong at the worst moment, in front of an audience, and ${c.mate.first} is kind enough not to say anything, and that is the cruelest part.${learn(1)}`;
      } },
      { label: `[${POSTS[hired().post].name} 2] Take them through the post, step by step`, skill: 2, run() { remember('needle', c.mate); like(c.mate, 2, 'You took me through your post, one step at a time.'); return (
          `You take ${c.mate.first} through a full watch at your post and say each step before you do it. By the end they have stopped saying ` +
          `soft.${learn(1)}`); } },
      { label: 'Let it go', run() { like(c.mate, 0, 'You let a needling go.'); return `You let it go, and finish your tea, and the table moves on. ${c.mate.first} looks, for a moment, almost disappointed.`; } },
    ]) },

  { id: 'crew-cards', mate: true, group: 'crew', make: c => handEvent('Card Night',
    `There is a game in the galley, a long-running, ill-tempered one with a deck gone soft at the corners, and ${c.mate.first} has kept you a seat. The stake is fifty credits a hand, which on a hired hand's pay is a great deal of money to lose.`, [
      { label: 'Sit in (50 cr)', ...gated(needCr(50)), run() {
        remember('cards', c.mate); setLater('h-cards-rematch', 7, 'Played cards with {thread:cards}. They want a rematch.');
        if (Math.random() < 0.45) { G.state.credits += 100; like(c.mate, 1, 'You took the pot off me fair and square.'); return (
            `The cards fall your way for once, and you take the pot, fifty credits of other people's money, and ${c.mate.first} slaps the table and ` +
            `demands a rematch. You win ${fmt(50)} cr net.`); }
        G.state.credits -= 50; like(c.mate, 1, 'You sat in at cards and lost like a good sport.');
        return `You lose the hand, and lose it cheerfully, and ${c.mate.first} pushes your last coin back across the felt with a grin. "Come again," they say. You are fifty credits poorer.`;
      } },
      { label: 'Watch from the side', run() { like(c.mate, 0, 'You watched the card game and kept your credits.'); return 'You watch from the end of the bench, with your tea, and enjoy the argument more than the cards.'; } },
    ]) },

  { id: 'crew-ines', group: 'crew', when: () => castKeys().includes('ines'), make: c => handEvent('Ines Calls the Numbers',
    'Ines is flying a hard approach by hand, a tight, ugly one, and asks you over her shoulder, without looking round, whether you would read her the numbers. "Slowly," she says. "And do not be clever."', [
      { label: 'Read her the numbers', run() { castLike('ines', 1, 'You read me the numbers on a hard approach and did not try to be clever.'); return (
          `You read her the numbers one by one, plainly, and she flies them, and the ship settles onto the line. "Good," says Ines. You have learned ` +
          `more in ten minutes than in the last week.${learn(3)}`); } },
      { label: '[Pilot 2] Check her numbers against your own', post: 'pilot', skill: 2, run() { castLike('ines', 2, 'You caught a wrong figure on my approach and said it plainly.'); return (
          `You have the approach on your own plot, half a second behind hers. On the last leg one of your figures does not match. "Say again," Ines ` +
          `says. You say it again. She finds the transposed digit on her sheet, corrects it without a word, and flies the corrected line. Afterward ` +
          `she writes the figure in her notebook.${learn(2)}`); } },
      { label: '[Pilot 3] Ask to fly the last leg', post: 'pilot', skill: 3, run() { castFlag('ines', 'trusted'); castLike('ines', 3, 'You flew the last leg of a hard approach with me beside you, and I did not touch the controls.'); return (
          `"Your line," Ines says, and takes her hands off. You fly the last leg with her reading the sheet beside you and saying nothing. The ship ` +
          `comes onto the pad. She signs the log under your name. "Do not tell the captain," she says. "Tell everyone else."${learn(3)}`); } },
      { label: 'Say you would rather watch', run() { castLike('ines', 0, 'You watched from the back and let me fly.'); return 'You stand behind her and watch her hands, and she does not say a word, and the approach is flawless. You do not learn much, but you do not break anything.'; } },
    ]) },

  { id: 'crew-tomas', group: 'crew', when: () => castKeys().includes('tomas'), make: c => handEvent('Tomas in the Engine Room',
    'Tomas has a flask, two tin cups and the whole of a quiet watch, and he pours you one without asking. "Sit," he says. "She is running well, and I would like to tell somebody why."', [
      { label: 'Sit and listen', run() { castLike('tomas', 1, 'You sat with me in the engine room and listened.'); return (
          `He tells you about the loop, and the mounts, and the three hulls he has rebuilt, with unhurried pride, and you listen, and the flask goes ` +
          `round twice. By the end you know something about machines you did not before.${learn(2)}`); } },
      { label: '[Engineer 2] Tell him what you hear in the loop', post: 'engineer', skill: 2, run() { castLike('tomas', 2, 'You heard a tick in the loop that I had stopped hearing.'); return (
          `You say there is a tick on the third pump at the top of each cycle, a hair late. Tomas puts a hand flat on the housing and waits for it to ` +
          `come round. "Third pump," he says. He writes the number on the back of his hand and pours you a second cup.${learn(2)}`); } },
      { label: '[Engineer 3] Ask to take the other end of the loop', post: 'engineer', skill: 3, run() { castFlag('tomas', 'trusted'); castLike('tomas', 3, 'You took the other end of the loop with me and did not need to be told.'); return (
          `Tomas hands you the wrench. You take the second pump out of the loop while he holds the light, and put it back, and he checks nothing. ` +
          `"Twenty years," he says, "and I have never let anyone take the second pump." He pours the second cup.${learn(3)}`); } },
      { label: 'Say you have work to do', run() { castLike('tomas', 0, 'You had work to do and did not stay.'); return '"Of course," he says, and caps the flask, and turns back to the loop. He goes back to the loop.'; } },
    ]) },

  { id: 'crew-yelena', group: 'crew', when: () => castKeys().includes('yelena'), make: c => handEvent('Yelena Wants a Sparring Partner',
    'Yelena has set up the range sim on its hardest setting, and is holding the second controller out to you. "No benches," she says. "Everybody plays. Come on."', [
      { label: 'Take the other console', run() { castLike('yelena', 1, 'You took the other console on the range and did not sulk about losing.'); return (
          `You take the other console, and she beats you soundly, and then shows you how: where to look, and when. You lose four rounds in a row. By ` +
          `the fifth you are less bad.${learn(3)}`); } },
      { label: '[Gunner 2] Take the hard setting and hold the lead', post: 'gunner', skill: 2, run() { castLike('yelena', 2, 'You held the lead on the hard setting for ninety seconds.'); return (
          `You take the other console on the hard setting and hold the lead for ninety seconds before she takes it back. She finishes ahead. She sets ` +
          `the controller down and tells you where you lost it: the third target, the late lead on the crossing. The next watch she asks you ` +
          `again.${learn(2)}`); } },
      { label: '[Gunner 3] Ask for her own worst setting', post: 'gunner', skill: 3, run() { castFlag('yelena', 'trusted'); castLike('yelena', 3, 'You beat my score on my own worst setting.'); return (
          `She sets the sim to the setting she keeps for herself. You beat her score by four points. Yelena looks at the number for a while, then ` +
          `writes it on the bulkhead over the console with a marker, under her own. "Again tomorrow," she says.${learn(3)}`); } },
      { label: 'Say your knee is bad too', run() { castLike('yelena', 0, 'You said you would sit out the range.'); return '"You do not have a bad knee," Yelena says. "You have a bench." But she lets it go, with a snort, and sets the sim back to something kinder for whoever comes next.'; } },
    ]) },

  { id: 'crew-ruben', group: 'crew', when: () => castKeys().includes('ruben'), make: c => handEvent('Ruben and the Thermos',
    'Ruben has a thermos of something hot and a stack of intercepts in piles, and he offers you a cup, as he offers everyone, and a pile, as he does not. "Help me sort," he says. "Slowly. I will tell you what is true and what is only lovely."', [
      { label: 'Help him sort', run() { castLike('ruben', 1, 'You helped me sort the intercepts and did not mind the stories.'); return (
          `You sort, and he talks, and by the end of the stack you have learned which dome is short of what, who is lying about it, and a good deal ` +
          `about how to listen to a lane. It is the best hour of the burn.${learn(2)}`); } },
      { label: '[Comms 2] Tell him which pile is true', post: 'comms', skill: 2, run() { castLike('ruben', 2, 'You sorted my intercepts by the handshake tones, and you were right.'); return (
          `You go through the stack and split it in two by the timing of the handshake tones. Ruben checks three of your picks against what he knows ` +
          `and finds all three right. He moves the thermos from his pile to yours.${learn(2)}`); } },
      { label: '[Comms 3] Find the signal that is neither', post: 'comms', skill: 3, run() { castFlag('ruben', 'trusted'); castLike('ruben', 3, 'You found the one in my stack that was neither lovely nor true.'); return (
          `Near the bottom of the stack there is a signal that is neither a rumor nor a story: a burst, repeated, with a pattern in the gaps. You ` +
          `hold it up. Ruben stops talking. He takes a key from his collar and unlocks the box under the console, and puts the originals in front of ` +
          `you.${learn(3)}`); } },
      { label: 'Take the tea and go', run() { castLike('ruben', 0, 'You took the tea and went.'); return 'You take the cup, and thank him, and go. "Another time," Ruben says, cheerfully, and returns to his piles, humming. He is not the kind to hold it against you.'; } },
    ]) },

  { id: 'crew-bexa', group: 'crew', when: () => castKeys().includes('bexa'), make: c => handEvent('Bexa\'s List',
    'Bexa has a small brass tag on a string above the helm, and a notebook she keeps open on the console and does not like being looked at. Tonight she catches you looking, and turns it round instead of closing it. "It is a list," she says. "Ask me properly."', [
      { label: 'Ask about the first name', run() { castLike('bexa', 2, 'You asked about the list the right way, and listened.'); return (
          `You ask about the first name, quietly, and she tells you: a ship, a year, a crew of six, and what was left. She talks for a long time. ` +
          `When she stops, she closes the book and nods at the helm. "Sit. I will show you how I would have brought them in."${learn(2)}`); } },
      { label: 'Look away', run() { castLike('bexa', 0, 'You looked away from the list.'); return 'You look at the console, and she closes the book, with a nod, and puts it back in her pocket.'; } },
    ]) },

  { id: 'crew-pax', group: 'crew', when: () => castKeys().includes('pax'), make: c => handEvent('Pax Checks the Coupling',
    'Pax is checking the coupling on the gun mount for the fifth time this watch. It is perfect. Pax knows it is perfect, and checks it anyway, jaw tight, and glances at you when the check is done.', [
      { label: 'Check it with them', run() { castLike('pax', 1, 'You checked the coupling with me instead of telling me to stop.'); return `You take the other side and check it together, torque by torque, and when you reach the end you both say "good" at once. Pax almost smiles.${learn(2)}`; } },
      { label: '[Gunner 2] Show them the torque log', post: 'gunner', skill: 2, run() { castLike('pax', 2, 'You showed me the torque log, and it was the same every time.'); return (
          `You pull the mount's torque log for the last six watches and put it in front of Pax. The coupling has read the same figure every time. Pax ` +
          `reads the column down twice and closes the panel. They do not check it again that watch.${learn(2)}`); } },
      { label: '[Gunner 3] Ask them to check your mount', post: 'gunner', skill: 3, run() { castFlag('pax', 'trusted'); castLike('pax', 3, 'You asked me to check your mount, and listened to what I found.'); return (
          `You ask Pax to go over your own mount. Pax does it torque by torque, with the log open, and finds one fitting a quarter turn under. You ` +
          `fix it together. Pax signs the log next to your initials. "Yours now," Pax says, and does not check the coupling again that ` +
          `watch.${learn(3)}`); } },
      { label: 'Tell them it is fine', run() { castLike('pax', 0, 'You told me the coupling was fine.'); return '"I know it is fine," says Pax. "That is not the point." They go back to it, and you leave them to it, feeling that you have said the true thing in the wrong way.'; } },
    ]) },

  { id: 'money-side', group: 'money', make: c => handEvent('Work on the Side',
    'A broker at the last port left word that there is a day of work going, nothing to do with the ship: loading, mostly, for a trading house that pays cash and asks nobody anything. It would be your own time. It would be, as they say, a few credits.', [
      { label: 'Take the work', run() {
        const n = randInt(8, 16) * 10;
        G.nextEvent = handEvent('The Crates', 'The crates have no manifest, only a stencilled house mark and a seal, and the broker has stopped meeting your eye. The pay is cash, and the pay is good. Nobody has told you what you are carrying.', [
          { label: 'Ask what is in them', run() { G.state.credits += n; return `The broker says "tools, mostly, and dry goods," with a smile, and you load them anyway, with an eye on the seals. You are ${fmt(n)} cr richer by the time the ship sails.`; } },
          { label: 'Load them and do not ask', run() { G.state.credits += n * 2; setLater('h-side-trouble', 9, 'Loaded crates for a trading house and did not ask what was in them.'); return (
              `You load them, without a word, and the broker pays double, in clean notes, and pats your arm. You are ${fmt(n * 2)} cr richer by the ` +
              `time the ship sails.`); } },
        ]);
        return 'You say yes, and spend your time ashore in a warehouse that smells of cold iron and old packing straw.';
      } },
      { label: 'Pass', run: () => 'You pass, and spend the time ashore as you like, The broker nods and finds somebody else.' },
    ]) },

  { id: 'money-loan', mate: true, group: 'money', make: c => handEvent('A Loan',
    `${c.mate.first} asks to borrow a hundred credits, quietly, at the end of a watch, in one breath. There is a family matter, something about a debt at home, and it will, they say, be paid back.`, [
      { label: 'Lend a hundred',
      ...gated(needCr(100)),
      run() { G.state.credits -= 100; remember('loan', c.mate); setLater(Math.random() < 0.7 ? 'h-loan-repaid' : 'h-loan-default', 12, 'Lent {thread:loan} a hundred credits.'); like(c.mate, 3, 'You lent me a hundred credits when I needed it.'); return (
          `You lend it, no questions, and ${c.mate.first} takes it with both hands and cannot find the words. It is a hundred credits you may or may ` +
          `not see again, and a good deal more than that in other ways.`); } },
      {
        label: 'Lend fifty',
        ...gated(needCr(50)),
        run() { G.state.credits -= 50; remember('loan', c.mate); setLater('h-loan-small', 12, 'Lent {thread:loan} fifty credits.'); like(c.mate, 1, 'You lent me fifty credits, which was what you could spare.'); return (
            `"It is what I can spare," you say, and ${c.mate.first} says that is fine, that it is more than anyone else offered, and means it, ` +
            `mostly.`); }
      },
      { label: 'Say no', run() { like(c.mate, -1, 'You would not lend me anything.'); return `You say you cannot, and it is true, or true enough. ${c.mate.first} nods and does not ask again, and the not asking is its own sort of silence.`; } },
    ]) },

  { id: 'money-short', group: 'money', make: c => handEvent('Short on the Pay',
    `The statement for the last run is a day short. You have counted it twice, and once more, in case. It is a small amount, ${fmt(hired().wage)} cr, and it is yours, and it would be easy to say nothing.`, [
      { label: 'Raise it quietly with the captain', run() { setLater('h-short-audit', 10, 'Raised a short pay statement quietly with {captain}.'); G.state.credits += hired().wage; capLike(c, 0, 'You raised a short statement politely.'); return (
          `You raise it at the end of a watch, with the statement in your hand, and the captain checks it, and winces. "My error," the captain says. ` +
          `"Fixed." It is fixed by morning, and you are ${fmt(hired().wage)} cr up.`); } },
      { label: 'Make a scene', run() { setLater('h-scene-fallout', 6, 'Made a scene about my pay statement.'); G.state.credits += hired().wage; capLike(c, -2, 'You made a scene about a short statement.'); return (
          `You raise it, loudly, in the galley, and the captain pays it, with ice in the voice. You are ${fmt(hired().wage)} cr up. The captain is ` +
          `colder to you for a while.`); } },
      { label: 'Say nothing', run: () => 'You say nothing, and let it go, and the day passes. It was only a day, you tell yourself, and it was.' },
    ]) },

  { id: 'road-scope', group: 'road', make: c => {
    const post = hired().post, where = { pilot: 'From the helm', gunner: 'On the fire-control scope', engineer: 'In the drive room, off a stray sensor return,', comms: 'On the band' }[post];
    return handEvent('Something Off the Lane',
      `${where} you pick up something that does not sit right: a transponder that does not match its hull, loitering just off the lane. It is not a threat, yet. A captain would want to know. A hand is not asked.`, [
        { label: 'Tell the captain at once', run() {
          capLike(c, 1, 'You brought me something off the lane when you saw it.');
          G.nextEvent = handEvent('What Did You See?', `Captain ${c.cap.last} wants it exactly: what, where, and how sure. A chart is out, and a pencil, and the patience of a person who has done this before.`, [
            { label: 'Describe it exactly', run() { setLater('h-lane-again', 9, 'Reported something off the lane, in detail.'); return (
                `You give them the transponder, the bearing and the speed, and the captain draws it on the chart and nods. When you are done the ` +
                `captain says only: "That is a report."${learn(2)}`); } },
            { label: 'Say you are not sure', run() { capLike(c, -1, 'You were not sure what you saw.'); setLater('h-lane-again', 9, 'Reported something off the lane, but was not sure of it.'); return (
                `You say you are not sure, and the captain puts the pencil down, and says, kindly, that not being sure is allowed, and that next time ` +
                `the captain would rather you were, one way or the other.${learn(1)}`); } },
          ]);
          return `You report it, and Captain ${c.cap.last} nods, asks two questions, and changes the burn by a few degrees without another word. An hour later the loiterer is a long way astern.`;
        } },
        { label: 'Log it and keep watching', run() { capLike(c, 0, 'You logged something off the lane.'); return (
            `You log it and keep watching, and it turns out to be nothing, or at least nothing that comes to anything. The log has a new line in it, ` +
            `and you have a better feel for what a quiet lane looks like.${learn(1)}`); } },
        { label: '[Pilot 2] Plot its track and give the captain a course round it', post: 'pilot', skill: 2, run() { setLater('h-lane-again', 9, 'Plotted something off the lane and gave a course round it.'); capLike(c, 2, 'You brought me a track and a course round it.'); return (
            `You hold its bearing for twenty minutes and plot the drift. It is holding station. You give the captain a course that passes it at eight ` +
            `hundred kilometers. "Take it," the captain says.${learn(2)}`); } },
        { label: '[Gunner 2] Put a passive lock on it and watch what it does', post: 'gunner', skill: 2, run() { setLater('h-lane-again', 9, 'Put a passive lock on something off the lane.'); capLike(c, 2, 'You watched something off the lane without it knowing.'); return (
            `You paint it with the passive array, which it cannot feel, and log its heat and the angle of its antennas. It is a hauler with its drive ` +
            `cold, waiting for somebody. You give the captain the numbers.${learn(2)}`); } },
        { label: '[Engineer 2] Read its drive signature off the stray return', post: 'engineer', skill: 2, run() { setLater('h-lane-again', 9, 'Read a drive signature off something on the lane.'); capLike(c, 2, 'You read a drive signature that did not match its hull.'); return (
            `The return has a drive bloom that is wrong for the hull on its transponder: too small, and too clean. You write down the figure and give ` +
            `it to the captain. "A smaller ship using a bigger ship's name," the captain says, and changes the burn.${learn(2)}`); } },
        { label: '[Comms 2] Listen to its transponder for a minute', post: 'comms', skill: 2, run() { setLater('h-lane-again', 9, 'Listened to the transponder of something off the lane.'); capLike(c, 2, 'You listened to a transponder and brought me what was wrong with it.'); return (
            `You listen on the band for a minute. It repeats a hull number that was retired two years ago. You give the captain the number. The ` +
            `captain checks the register and changes the burn without a word.${learn(2)}`); } },
        { label: 'Say nothing', run() { setLater('h-lane-trouble', 7, 'Saw something off the lane and said nothing.'); return 'You say nothing, and it goes away, and you will never know whether it mattered. It is not your job to know, you tell yourself.'; } },
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
const learnAt = (post, n) => { gainSkill(post, n); return ` (+${n} experience at the ${POSTS[post].name.toLowerCase()} post.)`; };
const castDowntime = (key, label, post, text) => ({
  cast: true, label, can: () => castKeys().includes(key),
  run() { castLike(key, 1, 'We spent some downtime together.'); return text(castPerson(key)) + learnAt(post, 3); },
});

const HAND_DOWNTIME = [
  { label: 'Ask the captain for advice', can: () => !!hired(),
    run() { const cap = person(hired().captain); like(cap, 1, 'You asked me for advice.'); return (`You find Captain ${cap.last} in the galley, and ` +
        `ask how the captain would do your job, and the captain tells you, at length and with surprising warmth, what went wrong at your ` +
        `age.${learnAt(hired().post, 2)}`); } },
  { label: 'Shadow a shipmate at their post', can: () => !!hired() && shadowable().length > 0,
    run() { const m = pick(shadowable()), post = postOfRole(m.role); like(m, 1, 'You spent a watch at my post to learn it.'); return (
        `You spend a watch at ${m.first}'s elbow, at the ${POSTS[post].name.toLowerCase()}, asking the questions a beginner asks, and ${m.first} ` +
        `answers every one.${learnAt(post, 3)}`); } },
  { label: 'Mend a shipmate\'s gear for pay', can: () => !!hired() && mates().length > 0,
    run() { const m = pick(mates()), n = randInt(3, 6) * 10; G.state.credits += n; like(m, 1, 'You mended my gear and would not take too much.'); return (
        `You spend the watch re-seating ${m.first}'s suit seals and re-soldering a handlamp, and ${m.first} pays you ${fmt(n)} cr and says it is the ` +
        `best job anyone has done on the ship.`); } },
  { label: 'Stand a spare watch for the captain', can: () => !!hired(),
    run() { const cap = person(hired().captain); G.state.credits += 40; like(cap, 1, 'You stood a spare watch for me.'); return (
        `You stand a watch the captain would otherwise have stood, and ${fmt(40)} cr arrives in your account with no note attached. The captain's ` +
        `door is open when you pass.${learnAt(hired().post, 1)}`); } },
  { label: 'Teach a shipmate what you know', can: () => !!hired() && mates().length > 0,
    run() { const m = pick(mates()); like(m, 2, 'You spent a watch teaching me your post.'); return (`You spend a watch showing ${m.first} ` +
        `the ${POSTS[hired().post].name.toLowerCase()}, from the bottom, and teaching it turns out to be the best way to find the gaps in your own ` +
        `understanding.${learnAt(hired().post, 1)}`); } },
  { label: 'Swap stories in the galley', can: () => !!hired() && mates().length > 0,
    run() { for (const m of mates()) like(m, 1, 'We swapped stories in the galley.'); return 'You sit in the galley until the small hours, and everybody has a story, and somebody has a better one. By the end, nobody is a stranger.'; } },
  castDowntime('ines', 'Fly a sim with Ines', 'pilot', c => `Ines puts you on the second seat of the sim and runs you through a bad approach until it is a good one, correcting without being asked, in the voice of a woman who has waited a long time to be asked.`),
  castDowntime('tomas', 'Learn the loop from Tomas', 'engineer', c => 'Tomas takes you down the coolant loop on a slow watch, valve by valve, talking to the pipes as he goes, and explains what each of them is for, and what each is telling him.'),
  castDowntime('yelena', 'Spar on the range with Yelena', 'gunner', c => 'Yelena runs the range sim and you take the second console, and she explains, between rounds and with great impatience, where a gun is going to be, and why you were looking at where it was.'),
  castDowntime('ruben', 'Sort intercepts with Ruben', 'comms', c => 'Ruben hands you a thermos and half a stack of intercepts, and the two of you work through them until the piles marked TRUE and FALSE and LOVELY are all neat, and you have learned how to tell them apart.'),
  castDowntime('bexa', 'Fly a tug approach with Bexa', 'pilot', c => 'Bexa runs the sim as a salvage approach, slowly, on a ship with no power and no cooperation, and talks you through each thing she would check before she put a line across.'),
  castDowntime('pax', 'Run the range with Pax', 'gunner', c => 'Pax sets up the range sim, and the two of you take it in turns, calling the numbers to each other, and Pax, to their evident surprise, relaxes about halfway through.'),
];

function handDowntime() {
  if (!hired()) return [];
  const ok = HAND_DOWNTIME.filter(d => d.can()), turn = G.state.day % Math.max(1, ok.filter(d => !d.cast).length);
  const rest = ok.filter(d => !d.cast), spun = rest.slice(turn).concat(rest.slice(0, turn));
  return [...ok.filter(d => d.cast).slice(0, 2), ...spun].slice(0, 4);
}
