'use strict';

// A stable id for every scene of the hired chapter, whether it is data or code (#342). The scene editor's index reads this and not ids of its own.
// Most scenes already sit in a registry and take their id from where they sit: a main character's or first officer's scene is
// `cast:<who>:<scene>` (a closed reading adds `:closed`), a captain's is `captain:<who>:<trouble | secret:confide | secret:found | goodbye>`, a shared
// hired event is `hired:<id>`, an ice run scene is `ice:<n>`. The scenes built by a function have no registry, so they are listed here with their id.
// An id is never reused for another scene; tests/hiredscenes.test.js pins the whole list.

const HIRED_FUNCTION_SCENES = [
  { id: 'scene:sign-on', fn: 'signOnEvent', file: 'js/signon.js', title: 'Signing On', where: 'port', when: 'Opens a hired game: why you signed on.' },
  { id: 'scene:warning', fn: 'warningScene', file: 'js/stakes.js', title: 'A Warning', where: 'transit', when: 'Once, when the captain\'s opinion of you falls to -2.' },
  { id: 'scene:put-ashore', fn: 'putAshoreScene', file: 'js/stakes.js', title: 'Put Ashore', where: 'port', when: 'When the captain\'s opinion of you falls to -3, at a later port.' },
  { id: 'scene:hand-death', fn: 'handDeathScene', file: 'js/stakes.js', title: 'The Last Run', where: 'transit', when: 'When the hand is lost in a fight.' },
  { id: 'scene:captain-lost', fn: 'captainLostScene', file: 'js/stakes.js', title: 'Without a Captain', where: 'transit', when: 'When the captain is lost on a pirate bridge.' },
  { id: 'scene:split', fn: 'splitScene', file: 'js/stakes.js', title: 'A Feud', where: 'port', when: 'When a feud between two of the crew has been seen and has dropped to -5.' },
  { id: 'scene:walk-off', fn: 'walkOffScene', file: 'js/fate.js', title: 'Walking Off', where: 'port', when: 'When a main character leaves the ship at a port.' },
  { id: 'scene:used-ship-offer', fn: 'dealScene', file: 'js/hired.js', title: 'The Used Ship', where: 'port', when: 'When the used Ore Runner is offered, after the captain\'s two scenes.' },
  { id: 'scene:yard-office', fn: 'yardScene', file: 'js/yardoffice.js', title: 'The Yard Office', where: 'port', when: 'When you ask to buy a ship.' },
  { id: 'beats:raid', fn: 'raidScene', file: 'js/engagements.js', title: 'A Raid', where: 'transit', when: 'A pirate contact, played in beats.' },
  { id: 'beats:dead-in-space', fn: 'deadInSpaceScene', file: 'js/engagements.js', title: 'Dead in Space', where: 'transit', when: 'After a raid, when a crippled raider drifts beside you.' },
  { id: 'beats:ambush', fn: 'ambushScene', file: 'js/engagements.js', title: 'An Ambush', where: 'transit', when: 'On a dangerous lane, every 60 days at most.' },
  { id: 'beats:repel', fn: 'repelScene', file: 'js/boarders.js', title: 'Boarders', where: 'transit', when: 'When a raid ends alongside: the lock, the corridor and the bridge.' },
  { id: 'beats:assault', fn: 'repelScene', file: 'js/boarders.js', title: 'Boarding Her', where: 'transit', when: 'When you board the crippled raider.' },
];

// The words of the raid, ambush and boarding beats (#478), by the name each line has in its table: a line is found by where it sits, and the beat reads it through
// lineWords (storylets.js) by the same name. A line the table does not hold (a casualty, a name, a count, the armor, the dead-in-space scene) is written in code and is not here.
// Odds, damage and the roll are in code too. tests/beatlines.test.js plays every beat and checks that each name here is read.
function raidLines() {
  const out = {}, text = (key, line) => { out[key] = Array.isArray(line) ? line[2] : line; };
  for (const [name, table] of [['open', RAID_OPEN], ['pass', RAID_PASS]]) for (const [style, list] of Object.entries(table)) list.forEach((t, i) => text(`${name}.${style}.${i}`, t));
  const sides = (base, c) => { for (const o of ['win', 'lose']) if (c[o]) { if (Array.isArray(c[o])) text(`${base}.${o}`, c[o]); else for (const [style, line] of Object.entries(c[o])) text(`${base}.${o}.${style}`, line); } };
  for (const [kind, list] of [['closing', RAID_CLOSING], ['exchange', RAID_EXCHANGE]]) for (const c of list) { text(`${kind}.${c.id}.label`, c.label); sides(`${kind}.${c.id}`, c); }
  for (const [kind, posts] of Object.entries(RAID_POST)) for (const [post, c] of Object.entries(posts)) { text(`post.${kind}.${post}.label`, c.label); sides(`post.${kind}.${post}`, c); }
  for (const [k, v] of Object.entries(RAID_CLOSE)) { if (typeof v === 'string') text(`close.${k}`, v); else for (const [style, t] of Object.entries(v)) text(`close.${k}.${style}`, t); }
  return out;
}
function ambushLines() {
  const out = {};
  for (const [post, c] of Object.entries(AMBUSH_READ)) for (const k of ['label', 'trap', 'real']) out[`read.${post}.${k}`] = c[k];
  return out;
}
function repelLines(assault) {
  const out = {}, set = assault ? { titles: ASSAULT_TITLES, openings: ASSAULT_OPENINGS, tactics: ASSAULT_TACTICS, post: ASSAULT_POST } : { titles: REPEL_TITLES, openings: REPEL_OPENINGS, tactics: REPEL_TACTICS, post: REPEL_POST };
  set.titles.forEach((t, i) => { out[`title.${i}`] = t; });
  set.openings.forEach((list, pos) => list.forEach((t, i) => { out[`open.${pos}.${i}`] = t; }));
  for (const [k, t] of Object.entries(set.tactics)) for (const f of ['label', 'win', 'lose']) out[`tactic.${k}.${f}`] = t[f];
  if (!assault) out.tie = REPEL_TIE;
  for (const [post, t] of Object.entries(set.post)) for (const f of ['label', 'win', 'lose']) out[`post.${post}.${f}`] = t[f];
  return out;
}
// The lines of a scene built by a function, by the name each has (#463): sceneSay (storylets.js) reads them, and fills the {words} from what the scene knows. A line is the
// scene's own words; what the scene builds from the game state (a recap, who has gone, a sum worked out) is code and is not here. tests/scenelines.test.js plays every scene
// and checks that each name is read.
const SCENE_LINES = {
  'scene:warning': {
    title: 'The Captain\'s Terms',
    text: 'Captain {last} waits until the hold is shut and the others have gone ashore. "I will say this once," the captain says. "I have had enough of the last few weeks. The next port like this one, the berth goes to somebody else."',
    'c0.label': 'Say you will do better', 'c0.result': '"Then do," the captain says, and goes down the ramp.',
    'c1.label': 'Apologize for the worst of it', 'c1.result': 'You name two things, the log and the order, and say you were wrong in both. The captain listens to the end. "That is said, then," the captain says.',
    'c2.label': 'Say the captain has been unfair', 'c2.result': '"Unfair," the captain says. The captain looks at you for some time. "We will see," the captain says.',
  },
  'scene:put-ashore': {
    title: 'Put Ashore',
    text: 'Captain {last} is at the foot of the ramp with the articles in one hand and your bag in the other. "I said I would say it once," the captain says. "I did. The berth is not yours after this port." Your pay is settled to the day.',
    'c0.label': 'Take the bag',
  },
  'scene:hand-death': {
    title: 'The Last Run',
    'text.hurt': 'The first hurt was not mended when the second one came. You are on the deck, with the cold of it against your cheek, and the crew are saying your name. Captain {last} says it from the hatch, and then asks for the medic, and it is already late for that.',
    'text.bridge': 'You are laid up in the corridor, where the first hit left you, when they come through the last hatch. You do not get up. Captain {last} gives them the code to the strongbox, and the crew carry you below before the lock cycles.',
    log: 'Captain {last} writes it in the log: the day, the place, your name. The ship goes on without you.',
    'c0.label': 'Begin again',
  },
  'scene:captain-lost': {
    title: 'Without a Captain',
    text: 'The ship makes the next port on the pilot\'s hands. The articles were Captain {last}\'s, and the articles end with the captain. The owner\'s agent comes aboard, reads the log, and pays you to the day. "There is no berth," the agent says. "There is no ship until somebody is found to sign for her." Your bag is on the dock before the lock has cycled.',
    'c0.label': 'Take the bag',
  },
  'scene:split': {
    title: 'Not on the Same Ship',
    text: '{A} and {B} are both on the dock when you come down the ramp, a few meters apart. "One of us gets off here," {A} says. "I will not stand another burn with that." {B} says nothing.',
    ask: 'Captain {last} has put it to you: "They both talk to you. Who stays?"',
    'let.label': 'Let {name} go',
    'let.result': '{gone} takes a bag and goes down the ramp without looking round. {stays} watches the ramp until it is clear. By the next watch bell a new {job}, {new}, has signed on for the berth.',
    'keep.label': 'Keep both',
    'keep.result': '"Then we all sail," you say. Neither of them answers. At the next watch they take opposite ends of the galley.',
  },
  'scene:walk-off': {  // the lines each person leaves are in their own entry (cast.js, captains/cato.js), and are listed with these (walkOffLines)
    title: 'Gone Ashore',
    'c0.label': 'Close the hatch', 'c0.result': 'The berth is empty.',
  },
  'scene:used-ship-offer': {
    'tomas.title': 'A Hull on the Apron',
    'tomas.text': 'Tomas is waiting at the head of the ramp when you come back from the yard office, wiping his hands on a rag that has not been clean in years. "Come and see something," he says. He walks you the length of the apron to a long, tired Ore Runner with a mismatched hatch and primer on one flank. "I have rebuilt her three times," he says. "Three owners, and every one of them sold her, and none for bad luck. Each ran one payment short. I fixed what the last one skipped, and the next one skipped it again, because they were paying the bank and not the ship. She is for sale once more, and cheap, because the last owner let her go." He lays a palm flat on her hull. "{fault} I know every fault she has. {debt} I would rather you had her than a stranger. {tell} Give it a few weeks and she will be gone."',
    'tomas.fault': 'Her drive is all right. Her life support I would watch. Her fire control is nearly done, and you should not trust it.',
    'tomas.debt.owed': 'You owe the hall {debt} still. I looked at its book. Clear it, and you will be the first owner she has had who owes nobody.',
    'tomas.debt.clear': 'You owe nobody now. I looked at the hall\'s book. She has only ever had owners who owed everybody.',
    'tomas.tell.good': '{price} cr, and that is the price for you.',
    'tomas.tell.bad': '{price} cr, and I am not going to pretend it is a favor.',
    'tomas.tell.plain': '{price} cr.',
    'tomas.c0.label': 'Walk her with him',
    'tomas.c0.result': 'He shows you the drive housing, the patched coolant line and the place where the fire control cable has been spliced twice. He talks the whole way, and does not once sound like he is selling. The ship is on the yard list now, as the used Ore Runner, until about day {until}.',
    'broker.title': 'A Used Ore Runner',
    'broker.text': 'A broker at the yard office has been watching the board for someone with savings. "There is a used Ore Runner on the apron," the broker says. "Three owners, a lot of repairs, and the last one let her go. Her fire control is poor and her life support is tired. The yard will not warrant either. {price} cr, as she stands. Give it a few weeks and somebody else will have her."',
    'broker.c0.label': 'Look her over',
    'broker.c0.result': 'You walk the apron with the broker and look her over. She is worn, and she is a ship. She is on the yard list now, as the used Ore Runner, until about day {until}.',
  },
  'scene:yard-office': {
    title: 'The Yard Office',
    text: 'The broker at {planet} keeps a small office at the head of the apron, with a window onto the pad and a ship on it that is, for the moment, the only thing in the room. "The {ship}," she says, and puts a form on the desk. "{price} cr, as she stands. You have been asking about her, so I assume you have the money. What would you like to do?"',
    'pay.label': 'Pay the asking price ({price} cr)',
    'pay.result': 'The broker slides the papers across, and does not smile. It is a clean sale, and a quick one. "Whenever you are ready," she says.',
    'haggle.label': 'Haggle',
    'haggle.won': 'You haggle for a quarter of an hour. {trusted}{skilled}She gives up {off} cr, and writes it on the papers.',
    'haggle.trusted': 'The broker knows your ship\'s name from the port, and it counts.',
    'haggle.skilled': 'You know what she is worth, and say so, line by line.',
    'haggle.lost': 'You haggle for a quarter of an hour. The broker does not know you, and you cannot show her you know the ship. She does not move by a single credit, and is polite about it.',
    'inspect.label.engineer': '[Engineer] Go over her yourself',
    'inspect.label.paid': 'Pay the yard\'s inspector ({fee} cr)',
    'inspect.did.engineer': 'You spend two hours in her bilges with a light and a wrench.',
    'inspect.did.paid': 'The inspector spends two hours in her with a light and a clipboard.',
    'inspect.found.used': 'Her drive is sound. Her life support is tired, and the fire control cable has been spliced where it should not be.',
    'inspect.found.other': 'She is sound, with a sticky valve in the coolant loop and a worn seal on the cargo hatch.',
    'inspect.result': '{did} {found} You put the list in front of the broker, and {off} cr comes off the price.',
    'away.label': 'Not today',
    'away.result': 'You thank the broker and say you will think about it. She says the ship will still be there, and in the same tone, that it might not be.',
  },
  'scene:sign-on': {  // a captain's own introduction (their entry's `intro`), and the line on the dock a put-ashore hand carries, are not here
    title: 'Signing On',
    'text.earth': 'Earth is crowded: thirty billion people, ten thousand applicants for every berth that flies, and the berths go to people with a cousin. You have no cousin. You have a trade, and a card you found pinned to the notice board at the arcology docks: HAND WANTED, ICE HAULER, DEPARTS WHEN FULL. {ship}, an ice hauler out of {sys}, took you for what you could do.{who}',
    'text.mars': 'You grew up under the domes of Tharsis, where everyone argues about the future, and the Concord\'s navy did not want you. You spent a winter learning how many ways a no can be worded. Then a freighter at Phobos Yards put out a call for a hand, and nobody asked about your politics, only whether you could stand a watch. {ship}, an ice hauler out of {sys}, is yours to work.{who}',
    'text.belt': 'You were born in the Ceres Warren, and you know what water is worth. A hand\'s share in a freighter that crosses to the inner system and back is not much, but it is a berth, and a berth is the one thing in the Belt that is truly yours. The League\'s dock office stamped the papers and wished you luck, in the tone of people who have wished a great many people luck. {ship}, an ice hauler out of {sys}, sails.{who}',
    'money.earth': 'You work it out on the ramp, on your fingers: a wage a day, a share of every run, and no cousin needed. Ten thousand applicants, one berth.',
    'learn.earth': 'At the first bulkhead you stop and ask what the placard says, and someone tells you. By the end of the hour you have asked eleven more questions. Nobody has charged you for any of them.',
    'away.earth': 'You stow your bag and do not go back down the ramp. When the hatch closes, the arcology is one more speck among the habitat lights.',
    'money.mars': 'The Concord offered you a dome stipend. The freighter offers a wage and a share, in writing, and you read the page to the bottom before you sign.',
    'learn.mars': 'The navy would not teach you. On the first day you ask to see the coupling, and the engineer shows you, and then has you do it.',
    'away.mars': 'The domes will argue about the future without you. Aboard, nobody asks whose side you are on. The first thing anyone asks is whether you have eaten.',
    'money.belt': 'You count the wage twice and the share once. The League stamp is on the papers. Every credit of it goes into the savings line.',
    'learn.belt': 'Ceres taught you water and rock. You ask the crew how they cross to the inner system, and four people answer at once, each differently.',
    'away.belt': 'Ceres spins on behind you with its ice and its arguments. You lift a hand to it from the viewport, like a person on a dock.',
    'who.generated': '{cap}, whom the crew describe as {adj}, signed the papers.',
    'post.pilot': 'You have the helm: {cap} plots the run, and you fly it, by hand.',
    'post.gunner': 'You have the guns. When a contact closes, you choose how to meet her, and the move at the guns is yours alone.',
    'post.engineer': 'You have the plant: the reactor\'s output, the heat and the wear are yours to watch, and yours to break.',
    'post.comms': 'You have the bands: tips, hails and the inbox are yours. You are the ship\'s ear.',
    beside: 'Working beside you: {crew}.',
    'week.run': '{cap} picks each run and buys the cargo from the ship\'s funds.',
    'week.errands': 'Errands for wherever she is going come through the port, and the captain keeps a fifth.',
    'week.pay': 'You are paid {wage} a day and {share} percent of what she clears.',
    why: 'Why did you sign on?',
    'c0.label': 'For the money',
    'c1.label': 'To learn the work',
    'c2.label': 'To be somewhere else',
  },
  // The hired events written in code (#463). A part a captain can word for themselves (captains/*.js, `events`) has the part's name; the experience a choice teaches, the pay it
  // brings and the thread it starts are in code. {last} is the captain's last name, {mate} the shipmate's first name, {post} the hand's post.
  'hired:cap-order': {
    title: 'An Order You Do Not Like',
    text: 'Captain {last} wants the drive run hotter than you would, to make a berth window at the next port, and has said so once, without looking up from the board. You have a view, and so, you suspect, does everyone else aboard.',
    'c0.label': 'Do as ordered',
    ordered: 'You run it the way you were told, and the window is made, with a minute to spare. The captain says nothing, and initials the log.',
    'c1.label': 'Say what you think',
    heard: 'You say it plainly and without heat, and the captain listens, and, after a long pause, gives ground a little. "Noted," the captain says. "Run it at ninety." It is the first time anyone has been asked.',
    notHeard: 'You say it, and it lands badly. "I did not ask," the captain says, quite pleasantly, and the conversation is over. You run it hot, and it works.',
    'c2.label': '"Ninety. I will find the minutes on the approach."',
    'c2.result': 'You say it flat, like a figure and not a complaint. The captain looks up from the board for the first time. "Show me the approach," the captain says, and you do. The window is made at ninety, with two minutes to spare.',
    'c3.label': '[Engineer 2] Put the heat figures in front of the captain',
    'c3.result': 'You put the coolant temperatures and the housing margin on the board and say how long the drive lasts at that setting. The captain reads the figures twice. "Ninety," the captain says. The window is made.',
    'c4.label': '[Pilot 2] Replot the approach to make the window cooler',
    'c4.result': 'You rerun the approach with a later flip and a shallower brake and show the captain the arrival time. It is four minutes inside the window. "Run it at ninety, and fly that," the captain says.',
  },
  'hired:cap-praise': {
    title: 'A Word of Praise',
    text: 'Captain {last} catches you at the end of a watch and says, with the air of a person reading out a line item, that the {post} has not given the ship a worry in a week. It is, from this captain, practically a speech.',
    'c0.label': 'Take it modestly',
    take: '"The crew make it easy," you say, and the captain gives a short, satisfied nod, and goes aft. You stand a little straighter for the rest of the watch.',
    'c1.label': 'Ask if it is worth a bonus',
    bonusYes: 'The captain raises an eyebrow, and then, to your surprise, laughs. "Fair," the captain says. "Sixty." It lands in your account before the end of the watch.',
    bonusNo: 'The captain looks at you for a moment. "When it is a speech, it is free," the captain says. "When it is a bonus, it is earned." You have the feeling of having spent something you did not have.',
    'c2.label': '[{Post} 3] Ask for the bonus, with the week\'s figures',
    'c2.result': 'You bring the week\'s log from the post, with the figures marked. The captain reads down the column. "Sixty," the captain says. It is in your account before the end of the watch.',
  },
  'hired:cap-dressing': {
    title: 'A Dressing-Down',
    text: 'The log has a gap in it, a watch with no entry, and the captain has found it. Captain {last} does not shout. The log goes on the galley table, turned round so it faces you, and the captain waits, and the waiting is the worst of it.',
    'c0.label': 'Own it',
    own: '"That was mine," you say. "I will fix it tonight." The captain looks at you a moment longer, and nods, and takes the log back. It is not forgiveness, quite, but it is the beginning of the end of the matter.',
    'c1.label': 'Blame the old terminal',
    blame: 'You mention the terminal, which does, in fairness, lose entries. "Then we will see," the captain says, quietly.',
    'terminal.title': 'The Terminal',
    terminal: '"Then we will see," Captain {last} says, and pulls the terminal across the table. The two of you watch the log for a minute while it does nothing at all.',
    'terminal.c0.label': 'Show how it drops entries',
    showWin: 'Just as you open your mouth, it does: a line blinks out, and back, and is gone. The captain looks at it for a long time. "I will have it replaced," the captain says. "And I owe you an apology, which I am not good at."',
    showLose: 'It does nothing. Not a flicker. The log sits there, clean and obedient, and the captain looks at it, and at you, and says, with great gentleness, "Well." There is no worse word.',
    'terminal.c1.label': 'Admit it was you',
    admit: 'You say it, late, and with your eyes on the table. The captain nods. "That is the second time you have told me the truth tonight," the captain says. "The first one cost you more." The captain turns the log round and initials the line.',
  },
  'hired:cap-favour': {
    title: 'A Favor',
    text: 'Captain {last} asks whether you would stand an extra watch so a crew member can sleep, and say nothing about it. It is not in the articles.',
    'c0.label': 'Stand the watch',
    stand: 'You take it, and the long dark hours go slowly, with a flask of the galley\'s worst coffee, and nobody ever mentions it. The captain mentions it once, at the next port, in a single sentence, and it is enough.',
    'c1.label': 'Stand it for forty credits',
    fee: 'The captain pays it without comment, out of the ship\'s own pocket, and files it, you can tell, under a heading of its own. The watch passes like any other.',
    'c2.label': 'Beg off',
    beg: '"Of course," says the captain, evenly, and goes to find somebody else. It is the answer you were entitled to give, and you feel it on the back of your neck for the rest of the burn.',
  },
  'hired:crew-needle': {
    title: 'Words in the Galley',
    text: '{mate} has been needling you for a week about the {post}, calling it a soft job. Tonight, over the mess table, they say it where everyone can hear.',
    'c0.label': 'Show them the work',
    'c0.win': 'You take them through a watch at your post, slowly and without a word of argument, and by the end they are a good deal quieter. "All right," {mate} says. "Fair."',
    'c0.lose': 'You try to show them, and it goes wrong at the worst moment, in front of an audience, and {mate} is kind enough not to say anything, and that is the cruelest part.',
    'c1.label': '[{Post} 2] Take them through the post, step by step',
    'c1.result': 'You take {mate} through a full watch at your post and say each step before you do it. By the end they have stopped saying soft.',
    'c2.label': 'Let it go',
    'c2.result': 'You let it go, and finish your tea, and the table moves on. {mate} looks, for a moment, almost disappointed.',
  },
  'hired:crew-cards': {
    title: 'Card Night',
    text: 'There is a game in the galley, a long-running, ill-tempered one with a deck gone soft at the corners, and {mate} has kept you a seat. The stake is fifty credits a hand, which on a hired hand\'s pay is a great deal of money to lose.',
    'c0.label': 'Sit in (50 cr)',
    'c0.win': 'The cards fall your way for once, and you take the pot, fifty credits of other people\'s money, and {mate} slaps the table and demands a rematch. You win {net} cr net.',
    'c0.lose': 'You lose the hand, and lose it cheerfully, and {mate} pushes your last coin back across the felt with a grin. "Come again," they say. You are fifty credits poorer.',
    'c1.label': 'Watch from the side',
    'c1.result': 'You watch from the end of the bench, with your tea, and enjoy the argument more than the cards.',
  },
  'hired:money-side': {
    title: 'Work on the Side',
    text: 'A broker at the last port left word that there is a day of work going, nothing to do with the ship: loading, mostly, for a trading house that pays cash and asks nobody anything. It would be your own time. It would be, as they say, a few credits.',
    'c0.label': 'Take the work',
    'c0.result': 'You say yes, and spend your time ashore in a warehouse that smells of cold iron and old packing straw.',
    'crates.title': 'The Crates',
    'crates.text': 'The crates have no manifest, only a stencilled house mark and a seal, and the broker has stopped meeting your eye. The pay is cash, and the pay is good. Nobody has told you what you are carrying.',
    'crates.c0.label': 'Ask what is in them',
    'crates.c0.result': 'The broker says "tools, mostly, and dry goods," with a smile, and you load them anyway, with an eye on the seals. You are {n} cr richer by the time the ship sails.',
    'crates.c1.label': 'Load them and do not ask',
    'crates.c1.result': 'You load them, without a word, and the broker pays double, in clean notes, and pats your arm. You are {n} cr richer by the time the ship sails.',
    'c1.label': 'Pass',
    'c1.result': 'You pass, and spend the time ashore as you like, The broker nods and finds somebody else.',
  },
  'hired:money-loan': {
    title: 'A Loan',
    text: '{mate} asks to borrow a hundred credits, quietly, at the end of a watch, in one breath. There is a family matter, something about a debt at home, and it will, they say, be paid back.',
    'c0.label': 'Lend a hundred',
    'c0.result': 'You lend it, no questions, and {mate} takes it with both hands and cannot find the words. It is a hundred credits you may or may not see again, and a good deal more than that in other ways.',
    'c1.label': 'Lend fifty',
    'c1.result': '"It is what I can spare," you say, and {mate} says that is fine, that it is more than anyone else offered, and means it, mostly.',
    'c2.label': 'Say no',
    'c2.result': 'You say you cannot, and it is true, or true enough. {mate} nods and does not ask again, and the not asking is its own sort of silence.',
  },
  'hired:money-short': {
    title: 'Short on the Pay',
    text: 'The statement for the last run is a day short. You have counted it twice, and once more, in case. It is a small amount, {wage} cr, and it is yours, and it would be easy to say nothing.',
    'c0.label': 'Raise it quietly with the captain',
    'c0.result': 'You raise it at the end of a watch, with the statement in your hand, and the captain checks it, and winces. "My error," the captain says. "Fixed." It is fixed by morning, and you are {wage} cr up.',
    'c1.label': 'Make a scene',
    'c1.result': 'You raise it, loudly, in the galley, and the captain pays it, with ice in the voice. You are {wage} cr up. The captain is colder to you for a while.',
    'c2.label': 'Say nothing',
    'c2.result': 'You say nothing, and let it go, and the day passes. It was only a day, you tell yourself, and it was.',
  },
  'hired:road-scope': {
    title: 'Something Off the Lane',
    'where.pilot': 'From the helm',
    'where.gunner': 'On the fire-control scope',
    'where.engineer': 'In the drive room, off a stray sensor return,',
    'where.comms': 'On the band',
    text: '{where} you pick up something that does not sit right: a transponder that does not match its hull, loitering just off the lane. It is not a threat, yet. A captain would want to know. A hand is not asked.',
    'c0.label': 'Tell the captain at once',
    'c0.result': 'You report it, and Captain {last} nods, asks two questions, and changes the burn by a few degrees without another word. An hour later the loiterer is a long way astern.',
    'see.title': 'What Did You See?',
    'see.text': 'Captain {last} wants it exactly: what, where, and how sure. A chart is out, and a pencil, and the patience of a person who has done this before.',
    'see.c0.label': 'Describe it exactly',
    'see.c0.result': 'You give them the transponder, the bearing and the speed, and the captain draws it on the chart and nods. When you are done the captain says only: "That is a report."',
    'see.c1.label': 'Say you are not sure',
    'see.c1.result': 'You say you are not sure, and the captain puts the pencil down, and says, kindly, that not being sure is allowed, and that next time the captain would rather you were, one way or the other.',
    'c1.label': 'Log it and keep watching',
    'c1.result': 'You log it and keep watching, and it turns out to be nothing, or at least nothing that comes to anything. The log has a new line in it, and you have a better feel for what a quiet lane looks like.',
    'c2.label': '[Pilot 2] Plot its track and give the captain a course round it',
    'c2.result': 'You hold its bearing for twenty minutes and plot the drift. It is holding station. You give the captain a course that passes it at eight hundred kilometers. "Take it," the captain says.',
    'c3.label': '[Gunner 2] Put a passive lock on it and watch what it does',
    'c3.result': 'You paint it with the passive array, which it cannot feel, and log its heat and the angle of its antennas. It is a hauler with its drive cold, waiting for somebody. You give the captain the numbers.',
    'c4.label': '[Engineer 2] Read its drive signature off the stray return',
    'c4.result': 'The return has a drive bloom that is wrong for the hull on its transponder: too small, and too clean. You write down the figure and give it to the captain. "A smaller ship using a bigger ship\'s name," the captain says, and changes the burn.',
    'c5.label': '[Comms 2] Listen to its transponder for a minute',
    'c5.result': 'You listen on the band for a minute. It repeats a hull number that was retired two years ago. You give the captain the number. The captain checks the register and changes the burn without a word.',
    'c6.label': 'Say nothing',
    'c6.result': 'You say nothing, and it goes away, and you will never know whether it mattered. It is not your job to know, you tell yourself.',
  },
};
// A person's farewell is in their own entry (their `walk` line and the line each fact leaves), so the walk-off scene lists theirs with its own.
function walkOffLines() {
  const out = { ...SCENE_LINES['scene:walk-off'] };
  for (const [who, c] of Object.entries(CAST)) if (c.farewell) { out[`walk.${who}`] = c.farewell.walk; for (const [id, line] of c.farewell.facts) out[`fact.${who}.${id}`] = line; }
  return out;
}
const linesOf = id => (BEAT_LINES[id] ? BEAT_LINES[id]() : id === 'scene:walk-off' ? walkOffLines() : SCENE_LINES[id] || null);
const BEAT_LINES = { 'beats:raid': raidLines, 'beats:ambush': ambushLines, 'beats:repel': () => repelLines(false), 'beats:assault': () => repelLines(true) };

// Every id, with what it is and where its scene lives: { id, kind, key, name, scene } for a cast or captain scene (its scene object), { id, kind: 'work' |
// 'hand', def } for a hired event (with its `scene` when it is written as data), { id, kind: 'ice', stage } for an ice run scene, and { id, kind: 'function', ...the entry above } for the rest (a beat of the raid, the ambush or the boarding fights has its `scene`, the lines it can be given).
function hiredSceneRegistry() {
  const out = [];
  for (const [key, c] of Object.entries(CAST)) {
    for (const [name, scene] of Object.entries(c.scenes)) {
      out.push({ id: `cast:${key}:${name}`, kind: 'cast', key, name, scene });
      if (scene.closed) out.push({ id: `cast:${key}:${name}:closed`, kind: 'cast', key, name, closed: true, scene: scene.closed });
    }
  }
  for (const [key, c] of Object.entries(CAPTAINS)) {
    const s = c.scenes || {};
    if (s.trouble) out.push({ id: `captain:${key}:trouble`, kind: 'captain', key, name: 'trouble', scene: s.trouble });
    if (s.secret) {
      out.push({ id: `captain:${key}:secret:confide`, kind: 'captain', key, name: 'secret:confide', scene: s.secret.confide });
      out.push({ id: `captain:${key}:secret:found`, kind: 'captain', key, name: 'secret:found', scene: s.secret.found });
    }
    if (c.goodbye) out.push({ id: `captain:${key}:goodbye`, kind: 'captain', key, name: 'goodbye', scene: { title: c.goodbye.title, choices: c.goodbye.choices, goodbye: c.goodbye } });
  }
  for (const d of WORK_EVENTS) out.push({ id: `hired:${d.id}`, kind: 'work', def: d });
  for (const d of HAND_EVENTS.filter(x => x.group !== 'work')) out.push({ id: `hired:${d.id}`, kind: 'hand', def: d, ...(d.data ? { scene: d.data } : linesOf(`hired:${d.id}`) ? { scene: { title: linesOf(`hired:${d.id}`).title, choices: [], parts: linesOf(`hired:${d.id}`), noTitle: true } } : {}) });  // written as data, or as lines (#463)
  ICE_STAGES.forEach((stage, i) => out.push({ id: `ice:${i + 1}`, kind: 'ice', stage }));
  for (const f of HIRED_FUNCTION_SCENES) out.push({ ...f, kind: 'function', ...(linesOf(f.id) ? { scene: { title: f.title, choices: [], parts: linesOf(f.id), noTitle: true } } : {}) });  // a beat's or a function's words, line by line (#478, #463)
  return out;
}
