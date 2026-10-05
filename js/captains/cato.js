'use strict';

// Cato Rahman, Hester Vance's first officer (js/captains/hester.js). Big and calm, came up through the hold, and knows every
// crew member's family. He covers for the crew against her rules. A first officer is a CAST entry marked xo and fragile:
// fate.js does not protect them with the floor. His scenes follow the cast order (intro, mid1, mid2, late, pivot); mid2 is
// "Two Orders", where he and the captain give the hand opposite orders.

// The ice hold: a point each for a medic who is not hurt, a hull above 60 percent, both ice hands aboard, and a second person
// with him. Three or more he lives, two he is marked, fewer he dies.
const iceHands = () => G.state.crew.map(person).filter(c => c && c.role === 'icehand').length;
const catoHoldPoints = backup => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0) + (iceHands() >= 2 ? 1 : 0) + (backup ? 1 : 0);
function inTheIceHold(backup) {
  const points = catoHoldPoints(backup), told = castRec('cato').flags.told, cap = hiredCaptain();
  const outcome = castFate('cato', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Lost in the ice hold near ${system().name}.`, 'Left hand does not close properly.', 'xo');
  const lead = backup ? 'You send an ice hand in with him. ' : '';
  if (outcome === 'die') {
    like(cap, -1, 'We lost Cato in the ice hold.'); cap.mood = { kind: 'low', until: G.state.day + 30 };
    return lead + 'He goes in first, as he said he would. The strap holds, and the pod does not, and for a moment the board shows nothing you can read. You get the hatch open from your side. By then the hold is quiet. Captain Vance is at the hatch before you have finished. She looks for a while, and then she closes the notebook. "Take him out," she says, in a voice you have not heard her use.'
      + (told ? ' He asked you to find him if it went badly. It is the other way round now.' : '');
  }
  castLike('cato', 2, 'You let me go into the hold, and I came out.');
  if (outcome === 'mark') {
    cap.mood = { kind: 'low', until: G.state.day + 15 };
    return lead + 'He goes in first, and it goes wrong at the number two strap, and for a long minute the hold is nothing but ice and shouting. He comes out carried, and the hand that held the strap does not close properly, and will not. The med kit is already open. He says, from the deck, "It is in the right place now."';
  }
  return lead + 'He goes in, and the pod is lashed, and the load stops. He comes out with ice in his beard and a cut across one knuckle, and sits down on the hatch coaming to get his breath. "That is where it goes," he says. Captain Vance looks at the hold, and at him, and says nothing, and writes it down.';
}

CAST.cato = {
  first: 'Cato', last: 'Rahman', culture: 'earth', home: 'Chittagong Arcology', job: 'first officer', age: 44, role: 'xo',
  traits: ['kind', 'generous'], wage: 65, xo: true, fragile: true,
  skills: { xo: 2, engineer: 1, pilot: 0, gunner: 1, slicer: 0 }, captain: { trade: 3, nerve: 3, thrift: 2 },
  ambition: 'Wants a share of a ship, someday, so the crew he came up with could work one deck again.',
  bio: 'He came up through the hold, and he knows every crew member by name and by family. He keeps the watch bill, and covers for the crew where the captain\'s rules would not.',
  story: {
    left: 'a ship sold out from under her crew, and a hold gang scattered across three ports', rel: 'mother', name: 'Samira',
    hope: 'a share of a ship, so the hold gang he came up with could work one deck again',
    homeDetail: 'a flat above a cargo exchange where the lift ran all night and nobody in the building kept the same shift',
    favor: null,
    news: {
      good: ['{who} sent a photo of the whole stairwell at a wedding', '{who} has a new lift technician, who actually comes when called', '{who} says the rent is frozen for another year'],
      bad: ['{who} says the lift has been broken for a month', '{who} is ill, and the clinic on {home} has a waiting list', '{who} says the exchange is closing the flats for repairs'],
    },
  },
  chatter: [
    'Cato is walking the hold with a mug, checking lashings that are fine.',
    'Cato has taken the cold watch again. Nobody asked him to.',
    'Cato is teaching one of the ice hands to read a manifest, slowly, one line at a time.',
    'Cato: "She is not a bad captain. She is a captain who has been counted against. It is different."',
    'Cato has written someone\'s mother\'s name on the back of the watch bill so that he remembers to ask.',
    'Cato is humming something with no tune. It is the sound of the hold gang he came up with.',
  ],
  scenes: {
    intro: {
      title: 'The Watch Bill',
      text: 'Cato Rahman finds you at the end of your first watch with a mug in each hand. He is a big man, and he moves slowly in the passages. "I do the watch bill," he says. "I know who has a child at home and who is waiting on a letter, and I try to put the bad hours where they hurt least. I will do the same for you, if you tell me what you need. The captain does not like it when I do. She is right to count it. I do it anyway." He holds out one of the mugs.',
      choices: [
        { label: 'Tell him what you need', run() {
          castLike('cato', 2, 'You told me what you needed, and I put it on the bill.');
          return 'You tell him you would rather have the middle watch than the cold one, and that you sleep badly after a hard burn. He writes it on the back of his hand with a stub of pencil. "Done," he says. Nobody has asked you that on a ship before, and it takes you a moment to find the rest of your coffee.';
        } },
        { label: 'Say you are fine', run() {
          castLike('cato', 1, 'You said you were fine, and I left it there.');
          return 'You say you are fine. "Good," he says, and means it, and does not believe it. He leaves the mug on the rail beside you, and the offer with it, and goes aft to see about somebody else\'s watch.';
        } },
      ],
    },
    mid1: {
      days: 25, title: 'A Share of a Ship',
      text: 'Cato is sitting on a cargo lashing with a small notebook, the kind that goes in a shirt pocket. It is not the captain\'s; it has no columns. "Twelve years," he says, "and a bit over nine thousand in the jar. A share of a ship costs more than that, a lot more. I do the sum when I cannot sleep." He turns it round so you can see: a ship\'s name crossed out, and another, and a third with a question mark. "I do not want to own her. I want a share, and a deck, and the same hold gang on it at the end. That is all." He puts the notebook away. "Do you think that is a stupid thing to want?"',
      choices: [
        { label: 'Ask which ship has the question mark', run() {
          castLike('cato', 2, 'You asked about the ship with the question mark.'); castFlag('cato', 'share');
          return 'He tells you, and it is a hull you have seen on the lanes: old, slow, honest. "Her owner wants out in two years," he says. "I have been watching her price like the weather." He talks about her for ten minutes without stopping, and when he is done he looks slightly embarrassed, and slightly lighter.';
        } },
        { label: 'Say it is not stupid, but it is a long way off', run() {
          castLike('cato', 1, 'You said it was not stupid, but a long way off.');
          return '"It is," he says. "It is a long way off every day, and then it is one day nearer. That is how I came up through the hold." He puts a hand on the lashing.';
        } },
      ],
    },
    mid2: {
      days: 40, title: 'Two Orders',
      text: 'It is the middle of the cold watch, and you have two orders for it. Captain Vance\'s came first, on paper, in pencil: the watch holds the deck until the cargo has been counted twice, no relief. Cato\'s came a minute ago, aloud, in the passage: stand the cold watch down, he will cover it, they have had four hours\' sleep in two days. Neither of them is wrong. Both are somewhere aft of you, not looking at each other, and neither will tell you what the other said.',
      choices: [
        { label: 'Hold the deck, as the captain wrote it', run() {
          castLike('cato', -1, 'You held the deck against my order.'); captainLike(2, 'You held the deck as I wrote it.');
          return 'You hold the deck. The count comes out right the second time and wrong by one crate the first. Captain Vance writes it in the notebook and does not look up. Cato says nothing at all, and takes the cold watch himself the next night, without being asked, which is worse.';
        } },
        { label: 'Stand the watch down, as Cato said', run() {
          castLike('cato', 2, 'You stood the watch down on my word.'); captainLike(-1, 'You stood the watch down against my order.');
          return 'You stand them down. Cato covers the watch. The count is not done until morning, and Captain Vance finds the gap in it, and finds you. "Whose order?" she says. You tell her. "I see," she says, and writes something down. Cato, passing in the passage, does not look at either of you, and puts a hand on the bulkhead for a moment as he goes.';
        } },
      ],
    },
    late: {
      days: 55, title: 'What Cato Knows',
      text: 'Cato has the watch bill open on the galley table, and he is not looking at it. "I have to say something, and I do not want it to sound like a favor," he says. "The captain keeps the books where I can see them. I have known about the bank since the spring. If she loses the ship, the hold gang goes in three directions by the end of the month. I have seen that happen once. I will not see it twice." He rubs his face. "I am not asking you for anything. I am telling you where I stand. If it goes badly, I would rather you were somewhere I could find you."',
      choices: [
        { label: 'Ask him to tell you if it goes badly', run() {
          castLike('cato', 2, 'You asked me to tell you if it went badly.'); castFlag('cato', 'told');
          return 'He nods slowly. "I will," he says. "I will put it on the bill." He tries to smile at it, and it does not quite come. "It is something, to have somebody to tell."';
        } },
        { label: 'Tell him it is not yours to carry', run() {
          castLike('cato', 1, 'You said it was not yours to carry.');
          return '"No," he says. "It is not." He sounds relieved, and sorry to be. "I wanted somebody to hear it said, that is all. It is a lot to carry in the hold."';
        } },
      ],
    },
    pivot: {
      days: 70, title: 'In the Ice Hold',
      get text() {
        const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6, hands = iceHands();
        return 'The alarm is a flat two-tone from the hold, and the board shows the number two ice pod with a seal gone and the load moving. Cato is already at the hatch with a lashing strap over one shoulder. "I know where the load goes," he says. "It is my hold. Give me ten minutes." Ice does not move quickly, but it does not stop, either, and the pod it is leaning on is not rated for it.'
          + (low ? ' The hull has taken a beating, and a bad hull is a bad place for a load to shift.' : ' The hull is sound, which is something.')
          + (medic ? ` ${medic.first} has the med kit open at the hatch.` : ' There is nobody aboard who can do more than a field dressing, and he knows it.')
          + (hands >= 2 ? ' Both ice hands are suited and waiting.' : ' There are not enough hands on the ice for a load like this.')
          + ' He waits for your answer, and has already started on the strap.';
      },
      choices: [
        { label: 'Let him go in', run: () => inTheIceHold(false) },
        { label: 'Send an ice hand in with him', can: () => iceHands() >= 1, run: () => inTheIceHold(true) },
        { label: 'Seal the hold and let the ice go', run() {
          castFlag('cato', 'benched'); castLike('cato', -3, 'You sealed the hold on me.');
          return 'You tell him no, and shut the hatch. The ice goes where ice goes, and the pod will not be the same. Cato stands at the hatch with the strap in his hands and says nothing for a while. "It is your call," he says at last, and means it, and it costs you.';
        } },
      ],
    },
  },
};

// The walk-through on the first burn (captains.js plays it once, before anything else): Cato takes the new hand round the ship. The
// names are the crew's own; a role nobody holds reads as the job. Only the Gunner's post gets a line of its own.
CAST.cato.round = () => {
  const ice = G.state.crew.map(person).filter(c => c && c.role === 'icehand').map(c => c.first);
  const [cook, medic, qm, eng, pilot, comms] = ['cook', 'medic', 'quartermaster', 'engineer', 'pilot', 'slicer'].map(crewNamed);
  const iceA = ice[0] || 'one ice hand', iceB = ice[1] || 'the other';
  const guns = hired().post === 'gunner'
    ? 'The last stop is at the foot of the guns. "And these are yours, which I should say plainly, since I have been talking about everyone else. When something closes on us, the captain tells you who and how far, and you play it: what they are threatening, what we answer. You will get one wrong. I did, and I am still here, and so is the ship."' : '';
  const walk = [
    `He starts at the galley, because he says everyone should. "It is eleven feet across, I measured it once, and that is where we eat and where we argue, mostly at the same time. ${cook} runs it. The water ration is on the wall in chalk. Do not rub it out, I know it looks like something you could rub out. And tell ${cook} what you will not eat. Once, early. ${cook} is fine about it if you say it the first week. After that it is a complaint, and then there is a conversation."`,
    `Two doors down, he knocks on the frame of the medical bay without going in. "${medic}. This is the one I said. ${medic} keeps the kit and the log, and I will tell you what I tell everybody, which is come in when you are hurt, not when it is bad. By the time it is bad it is a different conversation." ${medic} says something to him that you do not catch, and he laughs.`,
    `In the hold he slows down, and his voice changes a little, the way it does when he talks about the place he came up. "${qm} has the count. Everything aboard, twice. If a number looks off to you, ask ${qm} before you go to the captain, because it has already been found and it is sitting on a list somewhere. And these two," he says, nodding at ${iceA} and ${iceB}, who are lashing something that does not look loose, "they will ask you to hold a strap. Just hold it. It is not a test. I mean, it is a bit."`,
    `The engine room is warm and the passage floor hums under your boots. "${eng}'s plant. I would not touch anything with a tag on it, and everything has a tag. If ${eng} hands you a spanner, though, you can take that how you like. I have been aboard four years and I have had it twice." Up forward he points at the helm without going in. "${pilot} flies her. Talks to the board the whole time. Do not answer. It is not for you." Beside it, ${comms} has the bands. "Anything that comes in for you comes through there, and ${comms} reads it first. It is not rude. That is the job, and it is how you will know it has been looked at."`,
    `At a row of doors on the left he stops. "Third one is yours. It is on a closer, so it hisses, it does not slam. You will try to slam it once. Everyone does. It is all right."`,
    guns,
    `He finishes the tea and looks into the empty mug. "That is everyone. You have the middle watch with ${pilot}, it is on the bill, and I wrote it on the back of my hand as well, in case the bill goes missing. It has, before."`,
  ].filter(Boolean);
  return {
    title: 'The Round', personal: true,
    text: 'Cato Rahman finds you in the passage an hour after the burn starts. He has a mug in each hand, and he gives you one before you can say anything. "I do this for everyone," he says. "The captain says I should do it on the dock, but on the dock nobody is listening, they are looking for their bunk. Walk with me. It is not far. It feels far, the first time."',
    choices: [
      { label: 'Walk it with him', run: () => walk.join('</p><p>') },
      { label: 'Another time', run: () => '"Fair enough," Cato says. "The watch bill is on the galley wall. Everything else you will find by walking into it, and I will be somewhere nearby when you do." He takes the mug back, which seems to be the point of the mug.' },
    ],
  };
};

// The first arrival (captains.js arrivalScene): Cato settles up at the foot of the ramp.
CAST.cato.arrival = {
  open: 'The ramp is down. Cato has the ledger open on a crate on the apron, and he turns it round so you can read it.',
  memory: '"My first share was ninety," he says. "I bought boots with it. They were the wrong boots, and I wore them for six years." He taps the page. "Yours is in your account. Look at the header."',
  column: '"That column is {cap}\'s," Cato says. "I only keep the money."',
  pace: '"A season," Cato says. "{cap} was a hand on this ship before she owned it. It took her three."',
};
