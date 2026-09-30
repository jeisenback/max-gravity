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
  if (st.hired) return;  // the captain pays the crew
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
    bio: 'Ceres-born drive tech who can fix anything with sealant, a spanner, and enough swearing. She learned the trade under a dockyard crane before she was tall enough to reach the controls, and she treats every ship she works on as a patient with a long history of neglect. She left Ceres in a hurry three years ago, and she does not talk about why.',
    chatter: ['Rosa: "If you hear a clank, that is normal. If you hear two clanks, wake me. If you hear three, it is already too late and we should have a nice dinner."', 'Rosa is humming in the engine room again, something slow and Belter, with her whole arm inside a coolant housing.', 'Rosa: "You know what the difference is between a good engineer and a great one? A great one is never quite sure it is going to hold. That is what keeps her checking."', 'Rosa is asleep upright against the reactor housing, one hand still on a torque wrench. Nobody wakes her.', 'Rosa: "Ceres taught me the first rule. You do not waste water, you do not waste air, and you do not waste a good weld. Everything else is optional."', 'Rosa has named the drive. She will not tell you what it is called, but she pats it every morning and apologizes when it groans.', 'Rosa: "Somebody rebuilt this coolant loop with a bicycle pump and a prayer. I would like to shake their hand and then take away their tools."', 'Rosa is swearing in three languages at a stuck valve, and, one by one, in every language, it gives in.'],
    events: [
      { title: "Rosa's Proposal",
        text: 'Rosa corners you in the galley, grease to the elbows and a fresh burn on one wrist she has clearly not noticed. "Captain. I need to talk to you about the drive." She lays a sheet of scratched paper on the table: a hand-drawn diagram, with numbers in the margins. "Give me 2,500 credits for parts and I will squeeze another ten percent out of it. Permanently. I have been designing it for a year." She does not say who she was designing it for before you.',
        choices: [
          { label: 'Fund it (2,500 cr)', can: () => G.state.credits >= 2500, run() {
            G.state.credits -= 2500;
            G.state.flags.rosaTuned = true;
            return 'Two days of swearing, one small fire, and one nearly-lost finger later, the drive runs cooler and leaner than it ever did. Rosa comes out of the engine room smelling of scorched flux and looking, for the first time since she came aboard, wholly satisfied. "There," she says, wiping her hands. "That is how she was meant to sound." Burns now use 10% less reaction mass.';
          } },
          { label: 'Not right now', run: () => 'She folds the paper very carefully and puts it back in her pocket. "Your ship, captain." It is said evenly, without reproach, and it lands harder than an argument would have. She goes back to work, and for a few days the engine room is quieter than it should be.' },
        ] },
      { title: 'Old Debts',
        text: 'The comm chirps with a Ceres dock boss, a heavy man with a heavier voice, sitting in a booth with a glass of something amber. "Captain, I do not want to trouble you. But your engineer owes me three thousand credits, and she has been a long time paying. Settle it, or everyone on Ceres will hear why she really left." Behind you, Rosa has stopped moving. She is standing very still in the hatchway, with her hands at her sides, looking at the floor.',
        choices: [
          { label: 'Pay him (3,000 cr)', can: () => G.state.credits >= 3000, run() {
            G.state.credits -= 3000;
            G.state.flags.rosaHalfWage = true;
            return 'The channel closes. Rosa says nothing for an hour, then finds you in the galley with a mug of the good coffee she has been saving. "I was not going to ask," she says. "I will work at half wages until it is square. And, captain, I never got to say thank you to anyone for anything, so. This is me, being bad at it." You do not argue. (Rosa\'s wage is halved.)';
          } },
          { label: 'Tell him to get lost', run: () => 'You say what you think of him, in some detail, and cut the channel before he can answer. Rosa lets out a breath that seems to have been in her lungs for three years. "Thanks, captain," she says, and this time there is nothing to add. That night you find a cup of something hot outside your cabin door, and a note in pencil: "Not a bribe."' },
        ] },
    ],
  },
  dima: {
    name: 'Dmitri "Dima" Sokolov', first: 'Dima', role: 'pilot', skill: 3, home: 'Mars', fee: 4000, wage: 80,
    perk: 'Burns take 20% fewer days.',
    bio: 'Ex-Mars Republic Navy pilot, discharged for "creative interpretation of orders". Flies like he is still being shot at, and talks like it is a joke. He kept his flight jacket, his call sign, and a small framed photograph of a squadron that no longer exists, and he will tell you the story of how he lost the rest of it if you buy the drinks.',
    chatter: ['Dima: "Smooth as glass. You are welcome."', 'Dima is arguing with the nav computer again. He is winning.', 'Dima: "Everyone says the good pilots are the ones who never get scared. That is a lie. The good ones get scared very precisely."', 'Dima is tapping out a rhythm on the console with two fingers, in time to a song only he can hear. The ship, oddly, seems to be flying in time with it.', 'Dima: "I once flew under the ring of Saturn with a busted stabilizer and a full load of live torpedoes. I will tell you about it when you are older."', 'Dima has stuck a tiny paper flag of Mars on the edge of the nav display. It is slightly crooked, and he will not let anyone straighten it.', 'Dima: "You do not fly a ship. You persuade it. It knows when you are lying."', 'Dima is whistling the Martian anthem, very slowly, very badly, and clearly on purpose.'],
    events: [
      { title: 'Slingshot',
        text: 'Dima leans back from the nav display with a grin you have learned to be wary of. "Captain. There is a moon on our way. Small, ugly, and the gravity well is just the right shape. We swing around it, we save a day. Probably." He has already plotted it. The line on the display curves close to the surface, closer than you would like, and the gap between the words "probably" and "definitely" seems to keep opening in your mind.',
        choices: [
          { label: 'Do it', run() {
            if (Math.random() < 0.7) {
              delay(-15);
              G.transit.days = Math.max(1, G.transit.days - 1);
              return 'Dima threads the gravity well like a needle through cloth. For eleven seconds the whole ship sings, the walls hum, and the moon fills every viewport, grey and enormous and close enough to count the craters. Then the tug lets go and you are flung out the far side, a full day ahead of schedule. He does not stop grinning until the flip, and he will not let you forget it.';
            }
            return `A shard of something too small to have been on the chart comes out of the dark. You clip it on the way around, and the hull rings like a bell. ${hurt(0.2)} points of armor damage. Dima is uncharacteristically quiet for the rest of the shift, and when he speaks again it is to say, very softly, "That was my fault."`;
          } },
          { label: 'By the book, Dima', run: () => 'He sighs theatrically, gestures at the sky as though at a great injustice, and flies it by the book. It is textbook flying, perfect and dull. Halfway through, he mutters, "You know, in the Navy they gave me a medal for that. A little tin one." Then he laughs at himself and it clears the air.' },
        ] },
      { title: 'Mars Calling',
        text: 'A priority message comes in on a Navy band, sealed and formal, and Dima goes still when he reads it. The Mars Republic Navy is offering him his commission back: a cutter of his own, a squadron, an official apology. He does not say anything for a long time. Then he says, very carefully, not looking at you, "I did not think they would ever ask. What do you think, captain?"',
        choices: [
          { label: 'Tell him to take it', run() {
            leaveCrew('dima');
            G.state.credits += 3000;
            return 'He hugs you hard enough to crack a rib, then holds you at arm\'s length and does not quite meet your eye. "You are a good captain," he says, and then, because he is Dima, "The best I have had. The others were sad and boring." The Navy pays you a 3,000 cr transfer fee, and a cutter matches your course within the hour. He shakes every hand aboard, and salutes the ship, and goes.';
          } },
          { label: 'Ask him to stay', run: () => 'He looks at the message for a long moment. Then he deletes it, without replying, and turns back to the console. "Someone has to keep you alive," he says lightly, and the ship gives the small shudder of a good pilot resuming a good course. Later you find that he has taped the little tin medal above the nav display, and says nothing about it.' },
        ] },
    ],
  },
  kit: {
    name: 'Kit Halloran', first: 'Kit', role: 'gunner', skill: 3, home: 'Luna', fee: 3500, wage: 70,
    perk: 'Adds one gun in combat. Better odds when fighting in transit.',
    bio: 'Earth Coalition Navy gunnery sergeant, retired early. Talks to her guns. They seem to listen. She served twelve years and lost a squad, and she does not drink, does not gamble, and does not sleep more than five hours a night, but she remembers every birthday aboard, and will bake you a cake with a real candle if you look sad.',
    chatter: ['Kit: "Guns are clean. Guns are always clean."', 'Kit is running targeting drills against passing ice.', 'Kit: "Everybody thinks a gunner\'s job is to shoot. It is not. It is to know when not to, and then to be very good at the rest."', 'Kit is speaking softly to the port gun mount. You catch the words "good girl" and decide you did not hear them.', 'Kit: "The Navy taught me to count things: rounds, seconds, exits, and the number of people I would rather have beside me. It is a short list."', 'Kit has a battered tin of tea by the gun bay and has offered you a cup three times without ever once asking you to say yes.', 'Kit: "You do not get better at fighting. You get better at leaving. That is the whole skill."', 'Kit is oiling a firing pin and humming a Luna lullaby, which is faintly terrifying and utterly sweet.'],
    events: [
      { title: 'Target Practice',
        text: 'Kit appears at the hatch with a shipping crate under one arm and the look of someone who has thought this through. "Captain. There is a rock coming up, a good big one, drifting slow. I would like to put a few hundred rounds into it. Keeps me sharp. Ammo is about 300 credits." She sets the crate down. "I am not asking for me. I am asking because the day I am not sharp, someone on this ship is going to get hurt."',
        choices: [
          { label: 'Let her (300 cr)', can: () => G.state.credits >= 300, run() {
            G.state.credits -= 300;
            G.state.flags.kitSharp = true;
            return 'The rock does not survive. It goes to gravel in six seconds, in a pretty sweep of tracer fire, and the chunks scatter in a slow silver fan. Kit lowers her guns and, for a moment, is simply happy, in the plain uncomplicated way of a person doing exactly what she is for. "Thank you, captain," she says, and means it. (Better odds in fights during transit.)';
          } },
          { label: 'Not today', run: () => 'Kit shrugs and goes back to cleaning her already clean guns. It is an easy gesture, but she does it slowly, and for a while the gun bay has an unhappy hum. She does not hold it against you. She does, however, check every latch in the ship twice that night, quietly, with her jaw set.' },
        ] },
      { title: 'A Name She Knows',
        text: 'Kit is reading a Coalition bounty list in the galley, the way you might read a menu, and then she is not reading at all. The color has gone from her face. "Harlan Voss," she says. "Ex-Coalition. He walked out on a firefight and left my squad in it. Eleven people. He is on the list, now, for something else. I know where he hides: Hygiea." She looks up, and there is no anger in her face at all, which is worse than anger.',
        choices: [
          { label: 'We hunt him down', run() {
            const st = G.state;
            st.missions.push({ id: st.nextId++, type: 'bounty', targetSystem: 'hygiea', targetName: 'Harlan Voss',
              title: 'Bounty: destroy Harlan Voss near Hygiea', pay: 20000, deadline: st.day + 60 });
            return 'Kit does not say thank you. She does not have to. She stands, and nods once, and goes to the gun bay, and cleans her guns all night with a kind of exact, tender attention that you feel in the walls. In the morning the tin of tea has two cups out. (New mission: destroy Harlan Voss near Hygiea, 20,000 cr.)';
          } },
          { label: '"Revenge is not our business"', run: () => 'Kit does not argue. She folds the list and puts it away in her breast pocket. She does not talk much for the rest of the trip, and the guns stay very clean. It is not resentment. It is the quiet of someone deciding, privately, what she owes to people who are not in the room.' },
        ] },
    ],
  },
  josef: {
    name: 'Josef Brandt', first: 'Josef', role: 'quartermaster', skill: 3, home: 'Ganymede', fee: 2500, wage: 50,
    perk: 'Hears things: one extra market rumor on every burn.',
    bio: 'Has worked every market from Mercury to Titan. Remembers every price he has ever seen and everyone who ever cheated him, in that order, and has a small black notebook, kept in a chest pocket, where the second list goes. He has a soft spot for farmers, dislikes anyone who says "synergy", and is quietly saving for a plot of land on Ganymede.',
    chatter: ['Josef: "The price of water on Ceres tells you everything about the Belt."', 'Josef is reorganizing the cargo manifest. Again.', 'Josef: "A man who will not haggle is either rich or lying. In neither case do you want to sell him a used pump."', 'Josef is mumbling numbers to himself in a low, soothing voice, like a man praying in a very specific language.', 'Josef: "Everything moves eventually. Prices, people, mountains. The trick is knowing which way, and having a little something to sell when it does."', 'Josef has pinned a hand-drawn chart of Titan pharmaceuticals to the cargo bay wall. It is, by any standard, a work of art.', 'Josef: "Never trust a dock that smells of lavender. It is hiding something."', 'Josef is peeling an orange, very slowly, as if it were rare. It is: the last one this side of Ganymede.'],
    events: [
      { title: 'The Ledger',
        text: 'Josef comes to find you with the ledger open under his arm and a thin, dangerous smile. "Captain. I have gone over the last three trades. At the last port, somebody shorted you. Not badly. Just enough that nobody would notice. Nobody but me." He taps a column of figures with a blunt finger. "I know the man. I know his mother. Let me make a call. It will be very civilized."',
        choices: [
          { label: 'Make the call', run() {
            const c = randInt(8, 20) * 100;
            G.state.credits += c;
            return `Josef speaks softly into the channel for five minutes, never once raising his voice, and using the name of the man\'s mother twice. When he hangs up, ${fmt(c)} cr has already arrived in your account, with a very polite apology and a small gift of dried figs. "He is a good man, in the end," says Josef mildly. "He just needed reminding."`;
          } },
          { label: 'Let it go', run: () => '"Generous," says Josef, in a tone that means "foolish". He closes the ledger with great care and puts it away. Later you hear him in the galley, quietly adding the man\'s name to the small black notebook, and you cannot quite bring yourself to ask what is written in it.' },
        ] },
      { title: 'Old Stories',
        text: 'Over a bulb of terrible coffee in the galley, Josef starts talking, in the low, comfortable voice of a man with nowhere to be. He talks about the old days, when Ceres was half its size, when there were no rules on the water price, and a good quartermaster could make a fortune before breakfast. Somewhere in there, he starts to talk about which markets are about to move.',
        choices: [
          { label: 'Listen', run: () => `He talks for an hour, and you learn more than in a week of trading. He mentions two things worth knowing. "${addRumor()}" And, with a wink: "${addRumor()}" When he is done, he pours you another bulb of the terrible coffee and says nothing, which is his way of saying you are good company.` },
          { label: 'Another time', run: () => 'Josef nods, without offense, and finishes his coffee alone. He looks out at the stars for a while, and you realize you have missed something, though you could not say what. The galley feels smaller for a while.' },
        ] },
    ],
  },
  wren: {
    name: 'Wren', first: 'Wren', role: 'slicer', skill: 3, home: 'The Rook', fee: 5000, wage: 100,
    perk: 'Can spoof transponders when pirates come calling.',
    bio: 'Belter slicer who talks mostly to machines. Nobody knows her real name, possibly including Wren. She works in the dark, with three screens and a mug of cold tea, and she is far kinder than she lets on: the ship\'s smaller machines, the thermostat and the coffee maker among them, all seem to have been quietly fixed in her first week aboard.',
    chatter: ['Wren: "Your ship\'s firmware is a crime. I am fixing it."', 'Wren is listening to pirate channels. She laughs at something.', 'Wren: "People think secrets are the valuable thing. They are wrong. Habits are. Everyone is predictable, and everyone thinks they are not."', 'Wren has taped a sticky note to her console. It reads, in tiny neat capitals: "TRUST NOTHING, EAT SOMETHING."', 'Wren: "I once spent a month in a hostile network. Nobody noticed. I read their mail, and I left a small kind message in their logs. They never found it."', 'Wren is talking, very softly, to the coffee maker. It is making a noise like it is very sorry.', 'Wren: "You can be brave, or you can be careful. I picked careful. It has been very good for my health."', 'Wren is humming something with no tune at all, like the noise a cursor makes when it is thinking.'],
    events: [
      { title: 'Ghost Transponder',
        text: 'Wren emerges from behind her screens at an odd hour, with dark circles under her eyes and a small smile that makes you want to check your pockets. "Captain. I have an idea. It is a little illegal, and a great deal smart. I can rewrite your transponder history: your ship, its papers, its past. Half the pirates out here will read you as one of theirs. It will take three thousand credits in parts, and one very long night."',
        choices: [
          { label: 'Do it (3,000 cr)', can: () => G.state.credits >= 3000, run() {
            G.state.credits -= 3000;
            G.state.flags.ghost = true;
            return 'Wren works through the night, her hands moving in the blue of three screens like a pianist\'s, murmuring to the machines in a language you do not know. In the morning your ship has a very interesting past: three false owners, a smuggling record in Ceres, and a fine for jaywalking on Luna, entered with the delicate touch of a person who takes pleasure in small details. (Some pirates will ignore you.)';
          } },
          { label: 'Too shady', run: () => 'Wren shrugs, without offense, and returns to her screens. "Your funeral," she says, with a small dry smile, and then, as an afterthought, "But it would have been a nice funeral." She does not mention it again. That night she fixes your cabin lock without being asked, and leaves no note.' },
        ] },
      { title: 'Old Crew',
        text: 'A channel opens that Wren did not open. It is a voice she knows, and she goes utterly still. "Come home, Wren," it says, warm as a knife. "We miss you. We miss what you know. Come home, or we take your cargo as your exit fee." Around her the screens flicker, one after another, as though the ship itself were holding its breath. She does not look at you, but you can see her hands, and they are shaking.',
        choices: [
          { label: 'Let Wren handle it', run() {
            if (Math.random() < 0.6) return 'Wren says three quiet words in Belter dialect, and her fingers move across the console with the speed of a card sharp. The channel goes dead. So do their running lights, one at a time, and you watch four ships go black in the distance. Wren lets out a long breath, and, very quietly, begins to laugh, in the shaky, helpless way of a person who has just survived something.';
            return `They open fire before she finishes speaking. The first rounds ring down the hull, and ${hurt(0.25)} points of armor go with them before they break off, laughing. Wren says nothing for a long time. Then she says, in a flat little voice, "That was my fault. I should have known." She is wrong, and you tell her so, and she does not believe you yet.`;
          } },
          { label: 'Pay them off (2,000 cr)', can: () => G.state.credits >= 2000, run() {
            G.state.credits -= 2000;
            return 'They take the money, and the channel closes with a soft, satisfied click. Wren stares at the dark screen for a long time afterward, her hands quite still. When she finally speaks it is to nobody in particular: "I have never had anyone pay for me before." She does not say more, but that night, on your console, there is a small unexplained folder titled "for the captain", and inside it are all your passwords, every one of them, unchanged and safe.';
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
    text: 'Mrs. Adeyemi knocks on the cockpit hatch, and it takes you a moment to realize she is shaking. She has a small damp cloth in one hand. Her youngest, a serious little girl who spent the first day asking every crew member what their job was, has a fever that will not break, and the thermometer has stopped reading at a number that makes her voice crack. You are days from anywhere. Behind her, in the corridor, her husband is trying very hard to look calm, and failing.',
    choices: [
      { label: "Open the ship's medkit (500 cr of supplies)", can: () => G.state.credits >= 500, run() {
        G.state.credits -= 500;
        m.bonus += 1500;
        return 'You spend the good antibiotics without a second thought, and sit by the little girl\'s bunk with a bulb of water and a very bad story about a talking wrench. The fever breaks in the small hours, with a long sigh, and she is asking for breakfast by morning. The family insists on paying you extra when you arrive, and Mrs. Adeyemi presses a paper bird into your hand. "She made it for the captain," she says. "It is a ship."';
      } },
      { label: 'Burn harder to get there sooner (40 reaction mass)', can: () => G.state.fuel >= 40, run() {
        G.state.fuel -= 40;
        delay(-10);
        m.bonus += 500;
        return 'You give the drive everything it will bear, and the little girl sleeps through the worst of it in her mother\'s arms, pale and damp. She is miserable but stable when you arrive, and the family is grateful for every hour saved. Mr. Adeyemi shakes your hand for a long time, without a word, and you feel the tremor in his fingers all the way down the corridor.';
      } },
      { label: '"Keep them hydrated. There is nothing else to do."', run() {
        m.bonus -= 500;
        return 'The child recovers, slowly, over three long days, and the family hovers over her bunk without ever looking up. Nobody says anything to you. The silence in the galley is worse than any complaint could be, and when they disembark, the little girl does not wave. You tell yourself you were being practical. It does not help.';
      } },
    ] }) },
  varn: { name: 'Dr. Ilse Varn', pax: 1, fare: 1.2, event: m => ({
    title: 'Comet Sample',
    text: 'Dr. Varn has been at the observation blister for six hours, hunched over a notebook of cramped calculations, and now she is standing in front of you with her hair coming out of its clip and her eyes very bright. She has spotted a long-period comet a few hours off your trajectory, on its first pass in some ten thousand years. "A sample from that would make my career. I know it is a bother. I will pay for the detour. Please. It will not come this way again in any of our lifetimes."',
    choices: [
      { label: 'Match orbits and grab a sample (costs time)', run() {
        delay(20);
        m.bonus += 2500;
        return 'She spends six hours in a vac suit on the comet\'s black surface, tethered to the hull, giggling into the suit radio like a child in a snowfield. When she comes back in, frosted, shaking, and beaming, she is holding a vial of dirty ice as if it were a newborn. "Ten thousand years," she keeps whispering. She promises to name something after you, and, though you would not have believed it, she means it.';
      } },
      { label: 'Stay on course', run: () => 'She watches it slide past the window, a long ghost of a tail in the black, and does not say a word. She stays at the glass until it is gone. Later you find she has drawn it in the margin of her notebook, very neatly, with the date, and the words "if only." She is polite for the rest of the trip, and very quiet.' },
    ] }) },
  hale: { name: 'Undersecretary Hale', pax: 1, fare: 1.5, event: m => ({
    title: 'An Important Man',
    text: 'Undersecretary Hale of the Earth Coalition appears in the cockpit in a tailored coat and an expression of measured distaste. He informs you that his meeting cannot wait, that it concerns matters he is not at liberty to discuss, and that he had expected a faster ship. He glances at your control panel as though it were a plate of something regrettable, and lets the silence do the rest of the work.',
    choices: [
      { label: 'Hard burn to shave a day (50 reaction mass)', can: () => G.state.fuel >= 50, run() {
        G.state.fuel -= 50;
        m.bonus += Math.round(m.pay * 0.4);
        return 'Hale spends the burn pinned to his couch, too crushed by the acceleration to complain, his fine coat twisted awkwardly about him and a small bubble of spit at the corner of his mouth. When it ends he straightens his cuffs with great dignity and does not look at anyone. He tips generously, and he never once mentions the couch.';
      } },
      { label: '[{crew}] Find a faster line', role: 'pilot', run() {
        m.bonus += Math.round(m.pay * 0.4);
        return '{crew} bends over the nav display for an hour, muttering, and then finds a gravity assist nobody else would try, a swoop around a rock so small it does not have a name. It works, and it works beautifully. Hale watches the plot unfold in silence and is impressed despite himself. "That," he says, in the tone of a man handing out a rare medal, "was competent."';
      } },
      { label: 'Tell him physics does not negotiate', run() {
        m.bonus -= Math.round(m.pay * 0.2);
        return 'He goes an interesting color, opens his mouth, closes it, and files a formal complaint with somebody. It will come out of your fare, with a small note about "the quality of service". You feel, distantly, the pleasure of having said the true thing, and the rest of the burn is a study in exquisitely polite silence.';
      } },
    ] }) },
  sable: { name: 'a woman who calls herself Sable', pax: 1, fare: 2.0, event: m => ({
    title: 'Someone Wants Her',
    text: 'A ship with no transponder matches your burn, close, in the dark, and then a voice, smooth as oil, on the open band: "You have a passenger named Sable. Hand her over and there is 2,000 credits in it. Refuse and we take her anyway." The transmission is not a bluff. Sable watches you from the galley door, very still, a cup of tea untouched in her hands. She has not said a word since the channel opened, and she is waiting to see what kind of captain you are.',
    choices: [
      { label: 'Hand her over (+2,000 cr)', run() {
        G.state.credits += 2000;
        G.state.missions = G.state.missions.filter(x => x !== m);
        return 'Sable does not argue. She sets down her tea, gathers her one small bag, and walks into the airlock as though it were a hallway, with her chin up. The airlock cycles. You try not to think about it, and for a good long while you do not think about anything else, and the tea sits where she left it, going cold.';
      } },
      { label: '[{crew}] Spoof a Navy transponder', role: 'slicer', run() {
        m.bonus += 1000;
        return '{crew} bends to the console with a soft, private smile. A second later, on every scope in range, you are a Coalition Navy frigate, with a full crew and an ugly reputation. The unmarked ship scatters like startled pigeons. Sable laughs, for the first time since she came aboard, a short startled bark, then a longer, warmer sound. "Oh," she says, wiping her eyes. "Oh, that is very good."';
      } },
      { label: '[{crew}] Answer them with the guns', role: 'gunner', run() {
        m.bonus += 3000;
        return `{crew} answers with the guns, a single, exact burst that takes their antenna array off in a sheet of sparks. They do not ask again. You take ${hurt(0.1)} points of armor damage from a wild return shot, and Sable, watching from the galley, quietly doubles her fare and does not say why. When you look up, she is nodding, very slightly, in a way that feels like respect.`;
      } },
      { label: 'Refuse, and fight if you have to', run() {
        if (Math.random() < fightOdds()) {
          m.bonus += 3000;
          return `You drive them off in a long, ugly exchange, with ${hurt(0.2)} points of armor damage and a burnt-out gun barrel. Sable finds you in the cockpit afterwards, hollow-eyed, and presses a credit chip into your hand. "For your trouble," she says, and then, quieter, "Nobody has ever fought for me before."`;
        }
        return `They pound your hull for ${hurt(0.4)} points of armor damage before breaking off, and the whole ship rings like a struck bell. Sable finds you afterward, shaking, and squeezes your hand hard. "Thank you," she says. "For not selling me. You could have. Thank you." She does not let go for a long moment.`;
      } },
    ] }) },
  pilgrims: { name: 'pilgrims of the Long Walk', pax: 4, fare: 0.9, event: m => ({
    title: 'A Request for Stillness',
    text: 'The eldest of the pilgrims, a small woman in grey robes with a voice like paper, asks whether you might cut the drive for a few hours. It is not a demand. Her people are bound for the far edge of the system on a walk that will take the rest of their lives, and today is a holy day, and their float service must be held in zero g, for the old prayers say it is the only place a person is truly walked by the universe. The others wait behind her, hands folded, patient as stone.',
    choices: [
      { label: 'Cut thrust for them (costs time)', run() {
        delay(12);
        m.bonus += 1200;
        return 'The drive falls silent, and the whole ship seems to exhale. The pilgrims drift through the cargo bay in a slow, holy circle, robes floating like pale sails, singing in a language older than any port you have ever docked at. You find that you have stopped work to listen. When it is over, they pass a collection for the ship, small coins and a folded prayer, and the eldest touches the bulkhead once, gently, in blessing.';
      } },
      { label: 'Decline politely', run: () => 'They nod, with no reproach at all, and thank you for hearing them. They pray at one g instead, kneeling in a line on the cold deck, a little stiffly, a little less at home, and the quiet in the cargo bay is the quiet of people making do. You feel, uneasily, that you have just missed something rare.' },
    ] }) },
};
