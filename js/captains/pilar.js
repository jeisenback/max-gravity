'use strict';

// Pilar Quesada, Imre Sato's first officer (js/captains/imre.js). A self-taught hauler lifer with no certificates, who knows the
// ship's real tricks and bends every rule Imre writes, and gets results. They respect each other and clash daily. She wants to be
// respected, not noted, and fears the day the rules are used against her. A first officer is a CAST entry marked xo and fragile
// (fate.js does not protect her with the floor). Her scenes follow the cast order; mid2 is "Two Orders".

// A docking emergency at the helm: a point each for a medic who is not hurt, a hull above 60 percent, a drive in fair condition
// (the thrusters take what the drive has left), and a second hand on the console with her. Three or more she lives, two she is
// marked, fewer she dies.
const dockingPoints = backup => (roleHolder('medic') ? 1 : 0) + (G.state.armor > ship().armor * 0.6 ? 1 : 0) + (condition().drive >= 60 ? 1 : 0) + (backup ? 1 : 0);
function atTheHelm(backup) {
  const points = dockingPoints(backup), spoke = castRec('pilar').flags.spoke, cap = hiredCaptain();
  const outcome = castFate('pilar', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Lost at the helm near ${system().name}.`, 'Right hand does not close properly.', 'xo');
  const lead = backup ? 'You put a second hand on the console beside her. ' : '';
  if (outcome === 'die') {
    like(cap, -1, 'We lost Pilar at the helm.'); cap.mood = { kind: 'low', until: G.state.day + 30 };
    return lead + 'She brings her in by hand. The crosswind takes the ship at the last moment, and for a long second the bridge is the sound of the stick in her hands. The gate crew say afterwards it was the cleanest approach they had seen, until the last four meters. Captain Sato enters it in the log, in the same hand as every other entry, and then sits for a long time with the pen over the next line.'
      + (spoke ? ' You spoke to the captain about the rule. It was not in time.' : '');
  }
  castLike('pilar', 2, 'You let me fly the approach by hand, and I came out.');
  if (outcome === 'mark') {
    cap.mood = { kind: 'low', until: G.state.day + 15 };
    return lead + 'She brings her in by hand, and the crosswind catches the ship at the last four meters, and the stick kicks. She lands her by main strength and nothing else, and the hand that held the stick does not close properly, and will not. "It is in the berth," she says. "Enter that."';
  }
  return lead + 'She brings her in by hand, and the ship settles into the berth like a coin into a slot. Pilar lets go of the stick and flexes her fingers. "Four minutes," she says. "Enter that." Captain Sato enters it, word for word, and under it, in their own hand, writes: Correct.';
}

CAST.pilar = {
  first: 'Pilar', last: 'Quesada', culture: 'earth', home: 'Callao Arcology', job: 'first officer', age: 49, role: 'xo',
  traits: ['brave', 'curious'], wage: 65, xo: true, fragile: true,
  skills: { xo: 2, pilot: 3, engineer: 2, gunner: 1, slicer: 0 }, captain: { trade: 3, nerve: 4, thrift: 3 },
  ambition: 'Wants to be respected, not noted.',
  bio: 'A self-taught hauler lifer with no certificates, who flies the approach by feel and knows the ship\'s real tricks. She bends every rule the captain writes, and gets results.',
  story: {
    left: 'ten years on hauler berths with no certificate to show for any of them', rel: 'daughter', name: 'Marisol',
    hope: 'a certificate with her name on it, signed by someone who has watched her fly',
    homeDetail: 'a harbor wall you could sit on at dusk, and a dozen families arguing about football from their balconies',
    favor: null,
    news: {
      good: ['{who} passed the pilot\'s theory exam at the first sitting', '{who} sent a photo of the harbor wall at dusk, with someone\'s feet in it', '{who} has a new job at the port authority, and a desk by a window'],
      bad: ['{who} failed the practical by one point, and is not speaking about it', '{who} says the balcony upstairs has been condemned', '{who} is ill, and the port clinic has a month\'s queue'],
    },
  },
  chatter: [
    'Pilar is flying the approach by feel, with the nav display turned off, and getting it exactly right.',
    'Pilar has a spanner in her back pocket that is not on the tool list.',
    'Pilar: "The manual says do it this way. The manual has never docked at this port."',
    'Pilar has been fixing something that is not broken yet, which she says is the only way to fix it.',
    'Pilar, reading a new standing order: "I will note it. I will note it with a very good pen."',
    'Pilar has left the captain\'s coffee on the rail, hot, with no comment. She does that. It is how she says it.',
  ],
  scenes: {
    intro: {
      title: 'The Approach',
      text: 'Pilar Quesada has the helm for the approach, with the nav display off and her hands light on the stick. "Do not tell the captain," she says, not turning. "The manual says the display stays on. The manual has never docked at this port. The crosswind at the gate is a fifteen-second window, and the display lags by twelve." She brings the ship in without a tremor, and then looks at you for the first time. "You can tell them. I would rather you knew than guessed."',
      choices: [
        { label: 'Ask her to show you the window', run() {
          castLike('pilar', 2, 'You asked me to show you the crosswind window.');
          return 'She makes you count it with her, out loud, on the next approach, with the display off. You get it wrong twice. The third time you feel it, a thing in the stick rather than the numbers. "That is it," she says, and does not say anything else, and her shoulders drop an inch.';
        } },
        { label: 'Say you will keep it to yourself', run() {
          castLike('pilar', 1, 'You said you would keep my approach to yourself.');
          return '"Good," she says. "It is not a secret. It is a courtesy. The captain will find out, and when they do I would rather it was from the log." She goes back to the stick.';
        } },
      ],
    },
    mid1: {
      days: 25, title: 'No Certificate',
      text: 'Pilar has a folder of thirty-one reference letters, and no certificate. "Ten years on hauler berths, and every one of them signed off by someone who was sacked or retired or dead before the inspector came," she says. "The paper says I am not a pilot. The ship says otherwise. I would like, once, for the paper to agree." She taps the folder. "The captain says I am the best helm on any ship they have served on. They put it in the log. The log is not a certificate."',
      choices: [
        { label: 'Offer to write a reference', run() {
          castLike('pilar', 2, 'You wrote me a reference.'); castFlag('pilar', 'reference');
          return 'You write it that night, and it says what you have seen: the window, the approach, the four meters. She reads it standing up, twice. "Thirty-two," she says, and puts it at the front of the folder, where the best ones go.';
        } },
        { label: 'Tell her the helm matters more than the paper', run() {
          castLike('pilar', 1, 'You said the helm mattered more than the paper.');
          return '"It does," she says. "It matters more to everybody but the ones who issue the paper." She almost laughs. "That is not a complaint. That is the whole of the trade."';
        } },
      ],
    },
    mid2: {
      days: 40, title: 'Two Orders',
      text: 'You are ten minutes from the gate, and you have two orders for the approach. Captain Sato\'s is written on a card: the posted rate, the display on, the full checklist before the gate. Pilar\'s came aloud, from the helm: skip the checklist, come in on the crosswind window, and run the checklist in the berth. She says it will make the gate by four minutes. Neither will tell you what the other said, and both are looking at the gate.',
      choices: [
        { label: 'Follow the posted rate, as the captain wrote it', run() {
          castLike('pilar', -1, 'You followed the posted rate against my window.'); captainLike(2, 'You followed the posted rate as I wrote it.');
          return 'You run the full checklist. The ship misses the window and waits at the gate for forty minutes, in the correct order, with the correct lights on. Captain Sato enters it. Pilar, on the bridge, stands with her arms folded and says nothing, and the nothing is a lot.';
        } },
        { label: 'Come in on the window, as Pilar said', run() {
          castLike('pilar', 2, 'You came in on my window.'); captainLike(-1, 'You came in on the window against the posted rate.');
          return 'You come in on the crosswind window. It works, by four minutes, and the gate crew applaud the approach. Captain Sato reads the log entry, which you have written accurately, and writes no comment under it. For the first time there is a blank where there should be a line.';
        } },
      ],
    },
    late: {
      days: 55, title: 'The Rules Turned',
      text: 'Pilar has a standing order in her hand, the one Captain Sato wrote last week, and a flat look. "It says that a helm without a certificate may not take the approach unless the captain is on the bridge," she says. "It is a good rule. It is a fair rule. It is the rule I have been waiting for them to write. It is the day, you understand, that the rules get used against me." She folds it small. "I do not think they meant it so. That is the part I cannot say to them."',
      choices: [
        { label: 'Offer to speak to the captain', run() {
          castLike('pilar', 2, 'You offered to speak to the captain about the rule.'); castFlag('pilar', 'spoke');
          return '"Do," she says. "Not about me. About the rule." She holds your eye. "They will hear it better from somebody with a certificate." She says the last word slowly.';
        } },
        { label: 'Tell her to keep flying, and let the rule wait', run() {
          castLike('pilar', 1, 'You told me to keep flying and let the rule wait.');
          return '"It will not wait," she says. "But I will. That is the difference between a rule and a person." She takes the order, and flattens it, and puts it in her pocket with the spanner.';
        } },
      ],
    },
    pivot: {
      days: 70, title: 'The Docking Emergency',
      get text() {
        const medic = roleHolder('medic'), low = G.state.armor <= ship().armor * 0.6, worn = condition().drive < 60;
        return 'The gate\'s tractor beam fails twenty seconds out, and the ship is carrying forty tonnes of ice at a closing speed the berth was never meant for. The nav display is lagging. Captain Sato, on the bridge, has the checklist open. Pilar has the stick. "I can bring her in by hand," she says, "if you let me, and if you do not put anything on the display." She says it item by item.'
          + (low ? ' The hull has taken a beating, and a bad hull is a bad thing to put against a berth wall.' : ' The hull is sound, which is something.')
          + (worn ? ' The drive has been run hard, and the thrusters take what it has left.' : ' The drive is in good order.')
          + (medic ? ` ${medic.first} has the med kit open at the hatch.` : ' There is nobody aboard who can do more than a field dressing, and she knows it.')
          + ' She waits for your answer, and her hands are already light on the stick.';
      },
      choices: [
        { label: 'Let her fly it', run: () => atTheHelm(false) },
        { label: 'Put a second hand on the console with her', can: () => G.state.crew.length >= 2, run: () => atTheHelm(true) },
        { label: 'Take the ship off the approach and go round', run() {
          castFlag('pilar', 'benched'); castLike('pilar', -3, 'You took the ship off the approach on me.'); G.state.fuel = Math.round(G.state.fuel * 0.8);
          return 'You tell her no, and call the go-round. The ship stands off from the gate, and the ice sits in the hold, and the cells burn for the second pass. Pilar takes her hands off the stick one at a time. "It is your call," she says. "It was always going to be somebody\'s."';
        } },
      ],
    },
  },
};
