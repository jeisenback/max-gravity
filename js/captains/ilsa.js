'use strict';

// Ilsa Brandt, Dov Adair's first officer (js/captains/dov.js). Precise, dry, tired. She actually keeps the ship running, and
// does the work while Dov gets the love. She wants command and will not take it from him. She knows his fund does not balance
// and has been covering it from her own pay: exhaustion and loyalty, not betrayal. A first officer is a CAST entry marked xo
// and fragile (fate.js does not protect her with the floor). Her scenes follow the cast order; mid2 is "Two Orders".

// The reactor: a point each for a medic who is not hurt, a drive in fair condition, an engineer to go in with her who is not
// hurt, and a second person with her. Three or more she lives, two she is marked, fewer she dies.
const reactorPoints = backup => (roleHolder('medic') ? 1 : 0) + (condition().drive >= 60 ? 1 : 0) + (roleHolder('engineer') ? 1 : 0) + (backup ? 1 : 0);
function atTheReactor(backup) {
  const points = reactorPoints(backup), asked = castRec('ilsa').flags.asked, cap = hiredCaptain();
  const outcome = castFate('ilsa', points >= 3 ? 'live' : points === 2 ? 'mark' : 'die', `Lost at the reactor near ${system().name}.`, 'Right hand does not close properly.', 'xo');
  const lead = backup ? 'You send the engineer in with her. ' : '';
  if (outcome === 'die') {
    like(cap, -1, 'We lost Ilsa at the reactor.'); cap.mood = { kind: 'low', until: G.state.day + 30 };
    return lead + ('She goes in first, as she said she would, and the door closes behind her. The reactor board drops to nothing, and then, for a ' +
        'moment, to everything. You wait at the door for a long time after it is quiet. Captain Adair is the first one there. He does not speak. He ' +
        'puts his hand on the shielded door .')
      + (asked ? ' You asked her what she needed. She did not get to answer.' : '');
  }
  castLike('ilsa', 2, 'You let me go into the reactor, and I came out.');
  if (outcome === 'mark') {
    cap.mood = { kind: 'low', until: G.state.day + 15 };
    return lead + ('She goes in first, and the housing is hotter than the board said, and for three minutes the only sound on the bridge is the ' +
        'alarm. She comes out held up between two crew, and the hand that found the scram does not close properly, and will not. She sits down on the ' +
        'deck by the door. "It is off," she says. "Tell him the plant is off. He will want to know it is all right."');
  }
  return lead + ('She goes in, and the scram goes home, and the alarm winds down through its notes into silence. She comes out with her sleeves burnt ' +
      'through and her hands steady, and sits on the deck for a minute. "Routine," she says, and writes it in the log. Captain Adair has come down the ' +
      'passage without any of his speeches, and stands at the door.');
}

CAST.ilsa = {
  first: 'Ilsa', last: 'Brandt', culture: 'earth', home: 'Hamburg Arcology', job: 'first officer', age: 45, role: 'xo',
  traits: ['secretive', 'brave'], wage: 65, xo: true, fragile: true,
  skills: { xo: 3, engineer: 2, pilot: 1, gunner: 0, slicer: 1 }, captain: { trade: 4, nerve: 2, thrift: 4 },
  ambition: 'Wants command, but will not take it from him.',
  bio: 'She keeps the maintenance board, the night watch and the fuel orders, and when the captain is in the galley, the rest. She is dry, exact and tired, and she does not mind, and wants that on the record.',
  story: {
    left: 'a berth promised to her and given to someone with a cousin', rel: 'brother', name: 'Matthias',
    hope: 'a ship of her own, kept right, and an hour a day that is not somebody else\'s problem',
    homeDetail: 'a tram that ran on time, a bakery on the corner that opened at four, and neighbors who left each other alone',
    favor: null,
    news: {
      good: ['{who} sent a photo of the bakery with a new awning', '{who} has been made foreman at the depot, and is insufferable about it', '{who} says the tram line is being extended past the old canal'],
      bad: ['{who} says the bakery on {home} is closing at the end of the month', '{who} is ill, and the depot has not said when he can come back', '{who} says the tram was cancelled for a week, and nobody told him'],
    },
  },
  chatter: [
    'Ilsa is going through the maintenance board with a pencil. Every line she crosses off was somebody else\'s.',
    'Ilsa has fixed the recycler again, and put it down in the log as routine.',
    'Ilsa: "The captain is in the galley. The captain is always in the galley. That is how the ship is happy."',
    'Ilsa is asleep standing up against the bulkhead, mug still in hand, and has been for a minute and a half.',
    'Ilsa is correcting a fuel order the captain placed, quietly, in the margin of the form.',
    'Ilsa: "I do not mind. I want that on the record. I do not mind."',
  ],
  scenes: {
    intro: {
      title: 'The Night Watch',
      text: ('Ilsa Brandt is on the bridge at the hour the captain is asleep, with a mug and a pencil and the maintenance board open. She does not ' +
          'look round. "I do the night watch," she says. "And the maintenance, and the fuel orders, and, when the captain is in the galley, which is ' +
          'always, the rest. You will find the ship runs. Nobody will tell you why. I am telling you, so that you know whom to ask." She turns a page. ' +
          '"Ask me anything. Ask it quietly."'),
      choices: [
        { label: 'Ask how long she has had the night watch', run() {
          castLike('ilsa', 2, 'You asked how long I had had the night watch.');
          return '"Four years," she says. "Six months of it by choice." She almost laughs, and does not.';
        } },
        { label: 'Offer to take an hour of it', run() {
          castLike('ilsa', 1, 'You offered to take an hour of the night watch.');
          return '"No," she says, and then, at once, "Yes. The second hour. Do not touch the board."';
        } },
      ],
    },
    mid1: {
      days: 25, title: 'Command',
      text: ('Ilsa is at the chart table with a form in front of her. It is a command certificate application, filled in everywhere except the last ' +
          'line. "I have had this for two years," she says. "I could sign it. He would not stop me. That is the problem. He would say it was ' +
          'wonderful, and tell the galley, and then he would sit on the bridge by himself at night, and I would have taken it from him. I do not take ' +
          'things. I keep them." She lays a pencil across the form. "Tell me I am being a fool."'),
      choices: [
        { label: 'Tell her she is being a fool', run() {
          castLike('ilsa', 1, 'You told me I was being a fool.');
          return '"Good," she says, and does not smile, and does not sign. "Everyone else tells me I am being noble. I find that harder to bear."';
        } },
        { label: 'Tell her it is hers to decide, and can wait', run() {
          castLike('ilsa', 2, 'You said it was mine to decide, and could wait.'); castFlag('ilsa', 'command');
          return '"It can wait," she says. "It has been waiting. It is rather good at it." She puts the form back in the drawer, not far back.';
        } },
      ],
    },
    mid2: {
      days: 40, title: 'Two Orders',
      text: ('It is the evening, and you have two orders for the second cabin. Captain Adair\'s came with a laugh: a family is stranded at the dock ' +
          'with a child and a cat, he has said yes before anyone asked, and they are to have the second cabin. Ilsa\'s came in a flat voice, in the ' +
          'passage: the second cabin\'s air handler is down, nobody sleeps there until it is fixed, and she has not had the hours to fix it. They have ' +
          'both told you, and neither has told the other.'),
      choices: [
        { label: 'Put the family in the second cabin, as the captain said', run() {
          castLike('ilsa', -1, 'You put the family in the cabin against my order.'); captainLike(2, 'You put the family in the second cabin as I said.');
          return ('You put the family in the second cabin. The child sleeps, and the cat sleeps, and the air handler holds until morning and then ' +
              'does not, and you and Ilsa are up until four with the panel off. She does not say a word about it. In the morning the captain thanks ' +
              'everyone by name, and hers is the last on the list.');
        } },
        { label: 'Keep the cabin shut, as Ilsa said', run() {
          castLike('ilsa', 2, 'You kept the cabin shut on my word.'); captainLike(-1, 'You kept the second cabin shut against my order.');
          return ('You keep the cabin shut. The family sleeps in the galley, and the child is delighted, and the captain is the opposite of angry. ' +
              '"Of course," he says. "Of course. The air." He tells the galley, and by midnight it has become a story about Ilsa, with a good ending. ' +
              'She does not look pleased.');
        } },
      ],
    },
    late: {
      days: 55, title: 'What Ilsa Knows',
      text: ('Ilsa has the fund book open, and you can tell from the way she holds it that she has been holding it a long time. "I will say this ' +
          'once," she says. "The fund has been short every quarter for two years. He takes it out for people. He is not a thief. He is a man who ' +
          'cannot say no. I put it back, from my pay, a day before the audit. He knows the books balance and has never asked how. If he asked, I would ' +
          'stop. If he does not, I cannot." She closes it. "I am not asking you to do anything. I am telling you, because somebody ought to know who ' +
          'is holding it up."'),
      choices: [
        { label: 'Offer to put something in', ...gated(needCr(200)), run() {
          G.state.credits -= 200; castLike('ilsa', 2, 'You offered to put something into the fund.');
          return 'She looks at the two hundred for a long time. "No," she says. Then: "Yes. Not for him. For me. So that it is not only me." She writes it in the book, in a column of its own.';
        } },
        { label: 'Ask what she needs', run() {
          castLike('ilsa', 2, 'You asked me what I needed.'); castFlag('ilsa', 'asked');
          return 'Her face does something complicated. "Nobody has asked me that in four years," she says. "I do not know. I will tell you when I do."';
        } },
      ],
      // Below friendly she keeps it to herself, and the confidence (the `asked` flag) is not offered.
      closed: {
        title: 'What Ilsa Knows',
        text: ('Ilsa has the fund book open on the galley table, and she closes it when you come in and lays her hand flat on the cover. "I was going to ' +
            'tell you something about the books," she says. "I have decided it is not mine to tell, and it is not yet yours to hear." She squares the ' +
            'book with the edge of the table. "It is nothing you have done. I do not know you well enough to hand you a thing like that. If you are still ' +
            'aboard in a month, ask me."'),
        choices: [
          { label: 'Say it can wait', run: () => '"It can," she says, and slides the book into the drawer under the table and locks it. "Thank you for not asking which books."' },
        ],
      },
    },
    pivot: {
      days: 70, title: 'At the Reactor',
      get text() {
        const medic = roleHolder('medic'), worn = condition().drive < 60;
        return ('The reactor alarm is a rising note that you feel in the deck before you hear it. The coolant loop has lost pressure, and the board ' +
            'shows the pile heating faster than the pumps can carry it. Ilsa is already at the shielded door, pulling on gloves. "There is a manual ' +
            'scram at the back of the housing," she says. "I know where it is. Nobody else does. Give me three minutes." She says it to the bridge, ' +
            'item by item.')
          + (worn ? ' The drive has been run hard, and a worn plant is a bad plant to go into.' : ' The plant is in good order, which is something.')
          + (medic ? ` ${medic.first} has the med kit open at the door.` : ' There is nobody aboard who can do more than a field dressing, and she knows it.')
          + (roleHolder('engineer') ? ' The engineer is suiting up behind her.' : ' There is nobody who knows the housing but her.')
          + ' She waits for your answer, and has already started on the second glove.';
      },
      choices: [
        { label: 'Let her go in', run: () => atTheReactor(false) },
        { label: 'Send the engineer in with her', ...gated([() => !!roleHolder('engineer'), () => 'There is no engineer aboard.']), run: () => atTheReactor(true) },
        { label: 'Vent the plant and let the ship coast', run() {
          castFlag('ilsa', 'benched'); castLike('ilsa', -3, 'You vented the plant on me.'); G.state.fuel = Math.round(G.state.fuel * 0.8);
          return 'You tell her no, and hit the vent. The pile cools, and the ship coasts for two days on what is left of the cells. Ilsa stands at the shielded door with the gloves on and does not say a word. "It is your call," she says at last, and takes the gloves off one finger at a time.';
        } },
      ],
    },
  },
};

// The first arrival (captains.js arrivalScene): Ilsa settles up at the foot of the ramp.
CAST.ilsa.arrival = {
  open: 'Ilsa is at the foot of the ramp with the maintenance board under one arm and the ledger on top of it. She has the page open before you reach her.',
  memory: '"I have checked it twice, in two pencils," Ilsa says. "I do that with anything I am going to hand to somebody." She slides the page an inch toward you. "It is in your account. The header will say so."',
  column: '"That column is {cap}\'s," Ilsa says. "I do not touch it, and I do not read it either."',
  pace: '"A season of runs," Ilsa says. "More if the fuel goes up. I keep that in pencil."',
};
