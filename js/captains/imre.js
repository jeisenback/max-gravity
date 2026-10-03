'use strict';

// Imre Sato and their first officer Pilar Quesada (js/captains/pilar.js). The by-the-book ex-navy: logs everything, wears the
// same jacket, says "Noted." They want a clean record at last, and fear a dishonorable discharge coming out. Their text uses
// "they" (plural verbs). {post} is the hand's post and {names} who left with them.

CAPTAINS.imre = {
  first: 'Imre', last: 'Sato', pronouns: 'they', culture: 'earth', home: 'Osaka Arcology', age: 55, traits: ['secretive', 'brave'],
  bio: 'Eleven years in the navy and eleven out, and the same jacket for most of it. Every watch is in the log, and every rule is on the galley wall, and the rules apply to everyone, including them.',
  wants: 'A clean record, at last.', fears: 'The discharge coming out.',
  captain: { trade: 3, nerve: 2, thrift: 4 }, wage: 45, share: 0.07, hears: 2, bonus: 3, talk: 1.0,
  xo: 'pilar',

  intro: (wage, share) => `Captain Imre Sato reads your papers once, straight through, and writes the time on them. The jacket is navy, and has been worn for years without a mark on it. "${wage} a day and ${share} percent," they say. "The rules are on the wall of the galley. They apply to everyone, including me. Noted that you are aboard."`,

  chatter: [
    'Captain Sato is entering something in the log. It is the same size and shape as everything else in the log.',
    'Captain Sato: "Noted."',
    'Captain Sato has hung the standing orders on the galley wall, squared to the edge of the panel, and is straightening them again.',
    'Pilar has propped the galley hatch with a spanner, against standing order nine. Captain Sato has written it down and has not moved the spanner.',
    'Captain Sato is polishing a button on the jacket that is already bright.',
    'Captain Sato checks every transponder return against the log, and then, as if it were a different task, checks the log.',
    'Captain Sato: "If it is not in the log, it did not happen. If it is in the log, I will see to it that it did."',
    'Captain Sato eats lunch at noon, and not a minute before, with a book that is a manual.',
  ],

  events: {
    'cap-order': {
      text: 'Captain Sato has the berth window in the log: closing at 0600, with arrival at 0612 on the current burn. The log says to correct. "Standing order eleven," they say. "Burn to the window." They have written the burn figure on a card and set it on your console.',
      ordered: 'You run it as the card says. The window is made, with a minute in hand. Captain Sato enters it, in the same hand as every other entry, and the entry says that it was done.',
      heard: 'You point out that the housing rating is on page four of the same manual. Captain Sato reads page four. "Noted," they say, and strike out a figure on the card, and write another beside it. "Ninety."',
      notHeard: '"Noted," Captain Sato says, in the tone of someone closing a file. You run it as written, and it works, and the log records that it did.',
    },
    'cap-praise': {
      text: 'Captain Sato hands you a slip with your name on it and a line in their own handwriting: No faults, this run. That is the whole of it. It has been filed.',
      take: 'You thank them. "Noted," they say, and file it. You find, an hour later, that you are still holding the slip.',
      bonusYes: '"Provision seven allows a discretionary award," they say. "Sixty." They fill in a form for it, and have you sign for it, and it is, you realize, the warmest thing that has happened to you all week.',
      bonusNo: '"Provision seven requires that an award follow a standing," Captain Sato says. "You have not the standing yet. It is noted that you asked." It is not unkind. It is a ruling.',
    },
    'cap-dressing': {
      text: 'There is a watch with no entry in the log, and Captain Sato has marked it with a red tag. They do not raise their voice. They read the date, the hour and the standing order aloud, and then the rule the gap breaks, and then they stop.',
      own: '"That was mine," you say. "Noted," they say, and then, because it is you: "Thank you for saying so. The tag stays on until it is corrected."',
      blame: 'You mention the terminal. "The terminal is checked on the first of the month," Captain Sato says. "It was checked on the first. We will check it again."',
      terminal: '"We will check it," Captain Sato says, and has the terminal\'s own audit log up before you have drawn breath. The two of you read it together.',
      showWin: 'There, in the audit log, is a dropped entry, timestamped inside your gap. Captain Sato reads it twice. "Noted," they say. "The entry is struck. The terminal is to be replaced. The record is amended." They hold out a form. "Sign here. This is an apology."',
      showLose: 'The audit log shows nothing. No dropped entry, no fault. Captain Sato closes it. "The log is correct," they say. "The gap is yours. It will be entered as yours, and it will stay entered."',
      admit: 'You say it late. "The gap is yours," Captain Sato says. "It is entered. You came to it second, and it is noted that you came." That is, you understand, mercy.',
    },
    'cap-favour': {
      text: 'Captain Sato asks whether you would stand an extra watch so a crew member can sleep. They have written the request out, with the reason, the hours, and a line for your name. "It is outside the articles," they say. "So it is a request, and a request can be refused. I have written that down too."',
      stand: 'You sign. The hours go slowly. In the morning the log has a line in Captain Sato\'s hand: Extra watch, volunteered. It is the nicest thing you have been written down as.',
      fee: 'They pay it from the ship\'s contingency, forty, and enter it under the heading for it. The watch passes like any other.',
      beg: '"Entered," Captain Sato says, and puts the paper away. It was a request, and you refused, and nothing is held against you, which is its own kind of cold.',
    },
  },

  scenes: {
    trouble: {
      title: 'The Inspection',
      text: 'A port inspector is aboard, in a clean uniform, with a tablet. Captain Sato has been up since four with every log, certificate and manifest laid out in order, and is perfectly calm, in a way that costs them. One certificate has lapsed by two days: a berth renewal, signed at the wrong office. The inspector is polite and writes it down. "A four hundred fine, or a correction order," the inspector says. Captain Sato looks at the form, and at Pilar, who is not looking at them. The renewal was hers to file. Nobody has said so.',
      choices: [
        { label: 'Say you took the form to the wrong office', run() {
          captainLike(-1, 'You said you filed the renewal at the wrong office, and I do not think you did.'); castLike('pilar', 3, 'You took the blame for my renewal.'); captainFlag('covered');
          return 'You say it. Captain Sato looks at you for a long moment, and then at the form, and enters it, because it is what has been said. The correction order is yours. Pilar says nothing until the inspector has gone, and then says, quietly, "I will not forget that." Captain Sato says nothing at all, and you suspect that is because Captain Sato knows.';
        } },
        { label: 'Let the captain answer', run() {
          captainLike(1, 'You let me answer for the renewal.'); castLike('pilar', -1, 'You let the captain answer for my renewal.');
          return 'You say nothing. Captain Sato takes the correction order, and signs for it, and the inspector goes. "The renewal was filed at the wrong office," Captain Sato says to the empty galley, in the voice of a person reading it into the record. "It is entered as an error of the ship. It is not entered by whom." Pilar looks at the deck for some time.';
        } },
      ],
    },
    secret: {
      confide: {
        title: 'The Same Jacket',
        text: 'Captain Sato has the jacket on the back of the galley chair, and not on. It is the first time you have seen it off. The shirt under it has the left sleeve cut away at the shoulder: a stripe\'s width of cloth, gone. "I left the navy with an other-than-honourable discharge," they say. "Eleven years ago. For an order I did not give and a report I did not write. I have kept every log since, in case anyone asks." They look at the jacket. "Pilar knows. You are the second. I would like it noted that I told you."',
        choices: [
          { label: 'Say it is noted', run() {
            captainLike(2, 'You said it was noted.'); captainFlag('secretKnown');
            return '"Noted," you say. Captain Sato looks at you, and something at the corner of their mouth moves, very slightly, and settles again. They put the jacket back on. It is the same jacket, and it is not.';
          } },
          { label: 'Ask what the order was', run() {
            captainLike(1, 'You asked what the order was.'); captainFlag('secretKnown');
            return 'They tell you, in order, with the date and the hour and the name of the officer who gave it, as if reading it into a log. It takes four minutes. It is the longest you have heard them speak. At the end of it they say, "That is the whole of it," and it is.';
          } },
        ],
      },
      found: {
        title: 'The Stripe',
        text: 'You are looking for a manual in the captain\'s locker and find a navy service record in a drawer, under a clean set of logs. It is stamped in red at the foot of the second page: OTHER THAN HONORABLE. Captain Sato\'s name is on every line. You have read the stamp before you understand it is not yours to read. The locker door closes behind you. "That is not on the manifest," Captain Sato says.',
        choices: [
          { label: 'Say you were looking for the manual', run() {
            captainLike(-1, 'You said you were looking for a manual, and you had read the record.'); captainFlag('secretKnown'); captainFlag('secretAngry');
            return '"The manual is on the second shelf," Captain Sato says, and holds the door. "The record is not a manual. You read it. It is noted that you did, and that you said otherwise." The door closes on the drawer. It will be a long time before you are given another key.';
          } },
          { label: 'Say you will not mention it', run() {
            captainLike(0, 'You said you would not mention the record.'); captainFlag('secretKnown'); captainFlag('secretAngry');
            return 'Captain Sato is very still. "It is not a secret," they say. "It is a record. It is accurate." They close the drawer. "Noted that you will not mention it." The jacket, on its hook, is the only thing in the locker that has not moved.';
          } },
        ],
      },
    },
  },

  goodbye: {
    title: 'The Foot of the Ramp',
    warm: 'Captain Sato is at the foot of the ramp in the same jacket, with a paper folded in four. It is your reference, in their own hand, entered and stamped. "You will want this," they say. "It is accurate."',
    neutral: 'Captain Sato meets you at the foot of the ramp with the final pay slip, countersigned, and the log page for your last watch. It is in order.',
    cold: 'Captain Sato is at the foot of the ramp with the papers, and the log, and the red tag from the gap you left in it. "The record is complete," they say. "It will not be amended."',
    crew: '{names} will go with you. Captain Sato enters it. "It is noted," they say, and then, a beat later, and more quietly, "It is regretted."',
    secret: 'They do not mention the discharge, and neither do you. Their hand goes, once, to the left sleeve of the jacket. "I keep a clean record," they say. "I intend to go on."',
    xoDead: 'There is a line struck through in the watch bill, in Captain Sato\'s hand, and next to it, in a different ink, a date. "I amended the record," they say. "I have entered her as a casualty of the service. She would have found that very funny."',
    xo: 'Pilar is at the hatch with her arms folded and a spanner in one hand. "Do not let anybody tell you the book is the ship," she says. "And do not tell them I said so. I need them to go on writing it."',
    parting: 'They offer a hand. It is a single, formal handshake, firm and exactly as long as it should be. "Fair winds," they say. "Noted."',
    choices: [
      { label: 'Thank them for the work', run: () => { captainLike(2, 'You thanked me for the work.'); return 'You thank them. "Entered," they say, and, after a moment, "Appreciated." It is the only time you hear the second word.'; } },
      { label: 'Wish them a clean record', can: flags => !!flags.secretKnown, run: () => { captainLike(3, 'You wished me a clean record.'); return 'Captain Sato is silent for a long moment. "Thank you," they say, which is not in any standing order, and is not entered anywhere.'; } },
      { label: 'Take the papers and go', run: () => { captainLike(0, 'You took the papers and went.'); return 'You take the papers and go. When you look back from the dock, Captain Sato is at the foot of the ramp, writing something down.'; } },
    ],
  },
};
