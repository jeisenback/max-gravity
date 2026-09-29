'use strict';

// Crew and passengers: the five handcrafted crew and passenger groups, and the
// role-based perks that handcrafted and procedural crew (people.js) share.
// Loaded before game.js; only calls into it at runtime.

// Crew ids are either keys of CREW (handcrafted) or procedural person ids.
const person = id => CREW[id] || G.state.people[id];
const fullName = c => c.name || `${c.first} ${c.last}`;
const crewMembers = () => G.state.crew.map(person);
// Injured crew (boarding.js) can't do their jobs until they are treated.
const roleHolder = role => G.state.crew.filter(id => !(G.state.injured || {})[id]).map(person)
  .filter(c => c.role === role).sort((a, b) => b.skill - a.skill)[0];
// A transponder spoofer outfit stands in for a skill-1 slicer.
// Bad news from home (family.js) costs a skill level until it lifts.
const roleSkill = role => { const h = roleHolder(role); return Math.max(h ? h.skill - (moodLow(h) ? 1 : 0) : 0, role === 'slicer' && ship().spoofer ? 1 : 0); };
const roleName = role => (roleHolder(role) || { first: 'Your spoofer' }).first;
const paxAboard = () => G.state.missions.filter(m => m.type === 'passenger');
const berthsUsed = () => G.state.crew.length + paxAboard().reduce((t, m) => t + m.pax, 0);
const berthsFree = () => ship().berths - berthsUsed();
const playerGuns = () => ship().guns + (roleSkill('gunner') ? 1 : 0);
const fightOdds = () => 0.3 + playerGuns() * 0.15 + roleSkill('gunner') * 0.03 + (G.state.flags.kitSharp ? 0.1 : 0)
  + (G.state.fleet || []).filter(s => s.escort).length * 0.1  // escorts fly with you
  + (G.transit && G.transit.drilled ? 0.15 : 0);  // drills on this burn (shiplife.js)
const slicerOdds = () => 0.6 + roleSkill('slicer') * 0.1;
const wage = id => person(id).wage * (id === 'rosa' && G.state.flags.rosaHalfWage ? 0.5 : 1);

function payCrew(days) {
  const st = G.state;
  const total = Math.round(st.crew.reduce((t, id) => t + wage(id), 0) * days);
  if (!total) return;
  st.credits -= total;
  msg(`Crew wages for ${days} days: ${fmt(total)} cr.`);
  if (st.credits < 0) {
    st.credits = 0;
    const id = st.crew.pop(), c = person(id);
    if (!CREW[id]) c.location = system().planets[0].name;
    msg(`${fullName(c)} quits over unpaid wages.`);
  }
}

function leaveCrew(id) {
  G.state.crew = G.state.crew.filter(c => c !== id);
}

// Each crew member: where they can be hired, what they do, what they say,
// and a two-part personal storyline that plays out during transits.
const CREW = {
  rosa: {
    name: 'Rosa Okafor', first: 'Rosa', role: 'engineer', skill: 3, home: 'Ceres Station', fee: 3000, wage: 60,
    perk: 'Burns use 15% less reaction mass. Handles reactor trouble.',
    bio: 'Ceres-born drive tech who can fix anything with sealant, a spanner, and enough swearing. Left Ceres in a hurry and does not talk about why.',
    chatter: ['Rosa: "If you hear a clank, that is normal. If you hear two clanks, wake me."', 'Rosa is humming in the engine room again.'],
    events: [
      { title: "Rosa's Proposal",
        text: 'Rosa corners you in the galley, grease to the elbows. "Give me 2,500 credits for parts and I will squeeze another ten percent out of this drive. Permanently."',
        choices: [
          { label: 'Fund it (2,500 cr)', can: () => G.state.credits >= 2500, run() {
            G.state.credits -= 2500;
            G.state.flags.rosaTuned = true;
            return 'Two days of swearing later, the drive runs cooler and leaner. Burns now use 10% less reaction mass.';
          } },
          { label: 'Not right now', run: () => 'She shrugs. "Your ship, captain." She goes back to work.' },
        ] },
      { title: 'Old Debts',
        text: 'A Ceres dock boss comes over comms demanding 3,000 credits Rosa owes him. "Or everyone on Ceres hears why she really left." Rosa goes very quiet.',
        choices: [
          { label: 'Pay him (3,000 cr)', can: () => G.state.credits >= 3000, run() {
            G.state.credits -= 3000;
            G.state.flags.rosaHalfWage = true;
            return 'Rosa says nothing for an hour. Then: "I will work at half wages until it is square." You do not argue. (Rosa\'s wage is halved.)';
          } },
          { label: 'Tell him to get lost', run: () => 'He curses and cuts the channel. Rosa nods once. "Thanks, captain."' },
        ] },
    ],
  },
  dima: {
    name: 'Dmitri "Dima" Sokolov', first: 'Dima', role: 'pilot', skill: 3, home: 'Mars', fee: 4000, wage: 80,
    perk: 'Burns take 20% fewer days.',
    bio: 'Ex-Mars Republic Navy pilot, discharged for "creative interpretation of orders". Flies like he is still being shot at.',
    chatter: ['Dima: "Smooth as glass. You are welcome."', 'Dima is arguing with the nav computer again. He is winning.'],
    events: [
      { title: 'Slingshot',
        text: 'Dima grins at the nav display. "There is a moon on our way. We slingshot around it, we save a day. Probably."',
        choices: [
          { label: 'Do it', run() {
            if (Math.random() < 0.7) {
              delay(-15);
              G.transit.days = Math.max(1, G.transit.days - 1);
              return 'Dima threads the gravity well like a needle. A full day saved, and he will not let you forget it.';
            }
            return `You clip a debris field on the way around for ${hurt(0.2)} points of armor damage. Dima is uncharacteristically quiet.`;
          } },
          { label: 'By the book, Dima', run: () => 'He sighs theatrically and flies it by the book.' },
        ] },
      { title: 'Mars Calling',
        text: 'A priority message from the Mars Republic Navy: they are offering Dima his commission back. He asks what you think.',
        choices: [
          { label: 'Tell him to take it', run() {
            leaveCrew('dima');
            G.state.credits += 3000;
            return 'He hugs you hard enough to crack a rib. The Navy pays you a 3,000 cr transfer fee, and Dima transfers to a Navy cutter as soon as it can match your course.';
          } },
          { label: 'Ask him to stay', run: () => 'He deletes the message without replying. "Someone has to keep you alive."' },
        ] },
    ],
  },
  kit: {
    name: 'Kit Halloran', first: 'Kit', role: 'gunner', skill: 3, home: 'Luna', fee: 3500, wage: 70,
    perk: 'Adds one gun in combat. Better odds when fighting in transit.',
    bio: 'Earth Coalition Navy gunnery sergeant, retired early. Talks to her guns. They seem to listen.',
    chatter: ['Kit: "Guns are clean. Guns are always clean."', 'Kit is running targeting drills against passing ice.'],
    events: [
      { title: 'Target Practice',
        text: 'Kit wants to put a few hundred rounds into a passing rock. "Keeps me sharp. Ammo is about 300 credits."',
        choices: [
          { label: 'Let her (300 cr)', can: () => G.state.credits >= 300, run() {
            G.state.credits -= 300;
            G.state.flags.kitSharp = true;
            return 'The rock does not survive. Kit is visibly happier. (Better odds in fights during transit.)';
          } },
          { label: 'Not today', run: () => 'Kit shrugs and goes back to cleaning her already clean guns.' },
        ] },
      { title: 'A Name She Knows',
        text: 'Kit goes pale reading a Coalition bounty list. "Harlan Voss. He killed my squad. I know where he hides: Hygiea."',
        choices: [
          { label: 'We hunt him down', run() {
            const st = G.state;
            st.missions.push({ id: st.nextId++, type: 'bounty', targetSystem: 'hygiea', targetName: 'Harlan Voss',
              title: 'Bounty: destroy Harlan Voss near Hygiea', pay: 20000, deadline: st.day + 60 });
            return 'Kit cleans her guns all night. (New mission: destroy Harlan Voss near Hygiea, 20,000 cr.)';
          } },
          { label: '"Revenge is not our business"', run: () => 'Kit does not argue. She does not talk much for the rest of the trip, either.' },
        ] },
    ],
  },
  josef: {
    name: 'Josef Brandt', first: 'Josef', role: 'quartermaster', skill: 3, home: 'Ganymede', fee: 2500, wage: 50,
    perk: 'Hears things: one extra market rumor on every burn.',
    bio: 'Has worked every market from Mercury to Titan. Remembers every price he has ever seen and everyone who ever cheated him.',
    chatter: ['Josef: "The price of water on Ceres tells you everything about the Belt."', 'Josef is reorganizing the cargo manifest. Again.'],
    events: [
      { title: 'The Ledger',
        text: 'Josef found a discrepancy in your last trades. "Someone at the last port shorted you. Let me make a call."',
        choices: [
          { label: 'Make the call', run() {
            const c = randInt(8, 20) * 100;
            G.state.credits += c;
            return `Josef speaks softly for five minutes. ${fmt(c)} cr appears in your account with a very polite apology.`;
          } },
          { label: 'Let it go', run: () => '"Generous," says Josef, in a tone that means "foolish".' },
        ] },
      { title: 'Old Stories',
        text: 'Over a bulb of terrible coffee, Josef starts talking about the old days, and about which markets are about to move.',
        choices: [
          { label: 'Listen', run: () => `He mentions two things worth knowing. "${addRumor()}" And: "${addRumor()}"` },
          { label: 'Another time', run: () => 'Josef nods and finishes his coffee alone.' },
        ] },
    ],
  },
  wren: {
    name: 'Wren', first: 'Wren', role: 'slicer', skill: 3, home: 'The Rook', fee: 5000, wage: 100,
    perk: 'Can spoof transponders when pirates come calling.',
    bio: 'Belter slicer who talks mostly to machines. Nobody knows her real name, possibly including Wren.',
    chatter: ['Wren: "Your ship\'s firmware is a crime. I am fixing it."', 'Wren is listening to pirate channels. She laughs at something.'],
    events: [
      { title: 'Ghost Transponder',
        text: 'Wren offers to rewrite your transponder history. "Half the pirates out here will read you as one of theirs. 3,000 for the parts."',
        choices: [
          { label: 'Do it (3,000 cr)', can: () => G.state.credits >= 3000, run() {
            G.state.credits -= 3000;
            G.state.flags.ghost = true;
            return 'Wren works through the night. Your ship now has a very interesting past. (Some pirates will ignore you.)';
          } },
          { label: 'Too shady', run: () => 'Wren shrugs. "Your funeral."' },
        ] },
      { title: 'Old Crew',
        text: 'Wren\'s old crew hails: "Come home, Wren. Or we take the cargo as your exit fee."',
        choices: [
          { label: 'Let Wren handle it', run() {
            if (Math.random() < 0.6) return 'Wren says three quiet words in Belter dialect. The channel goes dead, and so do their running lights.';
            return `They open fire before she finishes talking. ${hurt(0.25)} points of armor damage before they break off.`;
          } },
          { label: 'Pay them off (2,000 cr)', can: () => G.state.credits >= 2000, run() {
            G.state.credits -= 2000;
            return 'They take the money. Wren stares at the screen for a long time afterward.';
          } },
        ] },
    ],
  },
};

// Passenger groups. `event(m)` builds their transit event for the mission `m`;
// choices adjust `m.bonus`, which is added to the fare on arrival.
const PASSENGERS = {
  adeyemi: { name: 'the Adeyemi family', pax: 3, fare: 1.0, event: m => ({
    title: 'Sick Child',
    text: 'Mrs. Adeyemi knocks on the cockpit hatch, frightened. Her youngest has a fever that will not break, and you are days from anywhere.',
    choices: [
      { label: "Open the ship's medkit (500 cr of supplies)", can: () => G.state.credits >= 500, run() {
        G.state.credits -= 500;
        m.bonus += 1500;
        return 'The fever breaks overnight. The family insists on paying you extra when you arrive.';
      } },
      { label: 'Burn harder to get there sooner (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        delay(-10);
        m.bonus += 500;
        return 'The child is miserable but stable, and the family is grateful for every hour saved.';
      } },
      { label: '"Keep them hydrated. There is nothing else to do."', run() {
        m.bonus -= 500;
        return 'The child recovers, slowly. The family does not speak to you for the rest of the trip.';
      } },
    ] }) },
  varn: { name: 'Dr. Ilse Varn', pax: 1, fare: 1.2, event: m => ({
    title: 'Comet Sample',
    text: 'Dr. Varn has spotted a long-period comet a few hours off your trajectory. "A sample from that would make my career. I will pay for the detour."',
    choices: [
      { label: 'Match orbits and grab a sample (costs time)', run() {
        delay(20);
        m.bonus += 2500;
        return 'She spends six hours in a vac suit, giggling. She promises to name something after you.';
      } },
      { label: 'Stay on course', run: () => 'She watches it slide past the window and does not say a word.' },
    ] }) },
  hale: { name: 'Undersecretary Hale', pax: 1, fare: 1.5, event: m => ({
    title: 'An Important Man',
    text: 'Undersecretary Hale of the Earth Coalition informs you that his meeting cannot wait, and that he had expected a faster ship.',
    choices: [
      { label: 'Hard burn to shave a day (50 reaction mass)', can: () => G.state.fuel >= 50, run() {
        G.state.fuel -= 50;
        m.bonus += Math.round(m.pay * 0.4);
        return 'Hale spends the burn pinned to his couch, too crushed to complain. He tips generously.';
      } },
      { label: '[{crew}] Find a faster line', role: 'pilot', run() {
        m.bonus += Math.round(m.pay * 0.4);
        return '{crew} finds a gravity assist nobody else would try. Hale is impressed despite himself.';
      } },
      { label: 'Tell him physics does not negotiate', run() {
        m.bonus -= Math.round(m.pay * 0.2);
        return 'He files a formal complaint with somebody. It will come out of your fare.';
      } },
    ] }) },
  sable: { name: 'a woman who calls herself Sable', pax: 1, fare: 2.0, event: m => ({
    title: 'Someone Wants Her',
    text: 'A ship with no transponder matches your burn. "You have a passenger named Sable. Hand her over and there is 2,000 credits in it. Refuse and we take her anyway." Sable watches you from the galley, very still.',
    choices: [
      { label: 'Hand her over (+2,000 cr)', run() {
        G.state.credits += 2000;
        G.state.missions = G.state.missions.filter(x => x !== m);
        return 'The airlock cycles. You try not to think about it.';
      } },
      { label: '[{crew}] Spoof a Navy transponder', role: 'slicer', run() {
        m.bonus += 1000;
        return 'Suddenly you are a Coalition Navy frigate. They scatter. Sable laughs for the first time since she came aboard.';
      } },
      { label: '[{crew}] Answer them with the guns', role: 'gunner', run() {
        m.bonus += 3000;
        return `{crew} answers with the guns. They do not ask again. You take ${hurt(0.1)} points of armor damage, and Sable quietly doubles her fare.`;
      } },
      { label: 'Refuse, and fight if you have to', run() {
        if (Math.random() < fightOdds()) {
          m.bonus += 3000;
          return `You drive them off with ${hurt(0.2)} points of armor damage. Sable presses a credit chip into your hand. "For your trouble."`;
        }
        return `They pound your hull for ${hurt(0.4)} points of armor damage before breaking off. Sable squeezes your hand. "Thank you for not selling me."`;
      } },
    ] }) },
  pilgrims: { name: 'pilgrims of the Long Walk', pax: 4, fare: 0.9, event: m => ({
    title: 'A Request for Stillness',
    text: 'The pilgrims ask you to cut the drive for a few hours so they can hold their float service in zero g.',
    choices: [
      { label: 'Cut thrust for them (costs time)', run() {
        delay(12);
        m.bonus += 1200;
        return 'They drift through the cargo bay singing. Afterwards they pass a collection for the ship.';
      } },
      { label: 'Decline politely', run: () => 'They pray at one g instead, a little stiffly.' },
    ] }) },
};
