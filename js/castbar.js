'use strict';

// The main characters at the bar: between burns, ashore, away from the ship. A main character who is aboard with you and has
// a scene due turns up at the bar of a port you are docked at, as a patron, and the talk with them is that scene instead of
// the usual menu. Two scenes each, the first a few days after they came aboard and the second a month in. Their effects are
// the same kinds as their other scenes (opinion, experience, a flag, a little of your own money). State: st.cast[key].bar is
// how many they have had. Loaded after cast.js; only calls into the game at runtime.

const CAST_BAR = {
  ines: [
    {
      days: 5, title: 'Third Approach',
      text: 'In the dock bar, Ines Ferreira has the stool nearest the docking screen, where a pilot is making a very poor job of an approach. "Third attempt," she says, without turning. "He is going to clip the gantry." She is not enjoying it, exactly, but she cannot look away, like a person at a surgery. "When somebody lands badly, I used to buy the controller a drink. It is not the controller\'s fault, and nobody ever remembers that."',
      choices: [
        { label: 'Watch the approach with her', run() { castLike('ines', 1, 'You watched a bad landing with me, and I enjoyed the company.'); castXp('ines', 'pilot', 3); return 'She talks you through it like a sports commentator, kindly and precisely: the flare that is a second too late, the crosswind he has not read, the thrust he will wish he had saved. He clips the gantry, gently, as she said he would, and she raises her glass to the screen. "Eleven out of ten for effort," she says. By the end you have learned more about landing than you meant to.'; } },
        { label: 'Ask about Lisbon', run() { castLike('ines', 2, 'You asked about Lisbon, and I told you.'); castFlag('ines', 'lisbon'); return 'She turns, at last, from the screen. "The ferry ran every forty minutes," she says. "Nine years. I knew the regulars by their shoes. There was an old man who rode the 6:40 every morning to feed the pigeons on the Luna side, and I never once spoke to him, and I would give a great deal to know if he still does." She drinks. "That is the thing about a route. You get fond of people you have only ever seen from the front."'; } },
      ],
    },
    {
      days: 30, title: 'The Badge',
      text: 'Someone at the end of the bar is wearing a tower controller\'s badge, and Ines has gone very still beside you. The crest is Lisbon\'s. "It could be nothing," she says, quietly, to her glass. "There are four hundred of them. It is almost certainly not the one who gave the order." She has not looked round. Her hand is flat on the bar, and quite white.',
      choices: [
        { label: 'Go over to them together', run() { castLike('ines', 3, 'You went over to the controller with me.'); castFlag('ines', 'tower'); return 'You go together, and it takes her three attempts to say her name. The controller listens to the whole thing, the pad, the order, the forty-one, and then, quite gently, says that they were on the desk that night, and that it was not their call, and that every one of them knew who had put that shuttle down. "It was the best landing I have seen," they say. Ines does not trust her voice, so she shakes the controller\'s hand, for rather too long.'; } },
        { label: 'Let her decide', run() { castLike('ines', 1, 'You let me decide about the controller.'); return 'You say nothing, and she does not go over. She finishes her drink, very slowly, and puts the glass down with a small, precise click. "Not tonight," she says. On the way out she looks, once, back at the badge, and then straight ahead. It is not defeat, quite. It is a person choosing when.'; } },
      ],
    },
  ],
  tomas: [
    {
      days: 5, title: 'Shop Talk',
      text: 'Tomas Achebe has found a welder at the bar. Not a drinking welder: a working one, in dock coveralls, with burn scars on both wrists and a nervous laugh. They have already been talking for an hour, and the whole of the bar rail, you now notice, has been welded by somebody very good. "Look at the bead," Tomas says to you, in an undertone, with something close to love. "Look at that. Nobody does that for a bar."',
      choices: [
        { label: 'Buy a round for the dock crew (40 cr)', can: () => G.state.credits >= 40, run() { G.state.credits -= 40; castLike('tomas', 2, 'You bought a round for the dock crew, and let me talk shop.'); castXp('tomas', 'engineer', 2); return 'A round for the dock crew turns into three hours. By the end, Tomas has been shown the jig they use for the rail, and a trick for a seam that has been bothering him since the ring, and has taught them one of his own. He walks back to the ship with a notebook full of sketches, and a lightness in his step you have not seen. "They talk to the work," he says, amazed. "The same as me."'; } },
        { label: 'Let him have his shop talk', run() { castLike('tomas', 1, 'You let me talk shop with a welder.'); return 'You find a stool at the other end of the bar and leave them to it. Every so often a burst of delighted, incomprehensible technical argument drifts over, with hand gestures. When he comes to find you, hours later, he is hoarse and cheerful and a little drunk on nothing but metal. "Thank you," he says. "I did not know how much I missed being a stranger among people who understood me."'; } },
      ],
    },
    {
      days: 30, title: 'A Call to Lagos Ring',
      text: 'The bar has a row of call booths at the back, and in the last of them, with the door open a hand\'s width, Tomas Achebe is on a long-distance link to his sister. You can hear only his half, soft and a little loud, the way you speak across a delay: "No, it was paid. Yes. I promise. Eat something." He sees you, and covers the handset, and, shy as a boy, beckons. "Would you say hello? She does not believe I have a crew."',
      choices: [
        { label: 'Say hello to his sister', run() { castLike('tomas', 3, 'You said hello to my sister.'); castFlag('tomas', 'sister'); return 'The delay is eleven seconds. You say your name, and wait, and a small, warm voice says, in a rush, that she is so glad he has people, that he never says, and that she hopes you are feeding him. Tomas is looking at the floor with the face of a man who has been proved right and wrong in the same moment. "Eleven seconds," he says, afterwards, quietly, "and she heard every word."'; } },
        { label: 'Wave from across the room', run() { castLike('tomas', 1, 'You waved to my sister from across the room.'); return 'You wave. He grins, helplessly, and holds the handset up to the glass, as if she could see you through it, and says something to her that makes the whole of his face change. When he comes out of the booth he is quiet for a little while, and you leave him alone with it, and you are quite sure he was grateful.'; } },
      ],
    },
  ],
  yelena: [
    {
      days: 5, title: 'Last Orders, Ravens',
      text: 'The bar is showing a ring-ball replay, and a loud man at the next table has just said something unforgivable about the Olympus Dome Ravens. Yelena Quint puts her drink down with great care. "He is wrong," she says, to you, evenly. "He is wrong about the offside rule, and he is wrong about number seven, and he is wrong about my knee." Her eyes are very bright. "I am going to explain this to him." She is already standing.',
      choices: [
        { label: 'Back her up', run() { castLike('yelena', 2, 'You backed me up when a stranger insulted the Ravens.'); castXp('yelena', 'gunner', 2); return 'She explains it to him with a fork, a beer mat and a very large number of examples, and you stand behind her with your arms folded. It does not come to blows. It comes to him buying a round, a lot of it, and apologising to the memory of number seven. At the end he asks for her autograph, which she gives, with enormous dignity, on the beer mat. "Ravens," she says, to the room, in triumph.'; } },
        { label: 'Steer her to the door', run() { castLike('yelena', 1, 'You steered me out before it turned into a thing.'); return '"He is wrong," she says, all the way to the door, and half the way down the dock. "He is so wrong." But she lets you take her arm. Halfway to the ship she stops, and laughs, a little shakily, and says it was probably for the best, and that she would have hit him. "Thank you," she adds, a bit grudgingly. "I needed somebody to be the sensible one."'; } },
      ],
    },
    {
      days: 30, title: 'Number Seven',
      text: 'A girl of about eleven is hovering at the end of the bar, clutching a shirt with a number seven on the back and the look of someone who has been working up to something for an hour. Yelena has seen her. Her whole body has become an argument about whether to notice. "Do not," she says, very quietly, to you. "Do not look at the shirt. If I look at the shirt I will have to say something."',
      choices: [
        { label: 'Offer to take their picture together', run() { castLike('yelena', 2, 'You took a picture of me with a girl in my old shirt.'); return 'You say you will take it, and the girl turns the colour of the shirt, and Yelena, with a long face of someone going over the top, crouches down and puts an arm around her. She asks the girl her name and her position. It is goalkeeper. "Good," Yelena says, very seriously. "Nobody ever thanks the goalkeeper." When the picture is taken she signs the shirt, in full, and does not say a thing about the knee.'; } },
        { label: 'Give them room', run() { castLike('yelena', 1, 'You gave me room with the girl in the old shirt.'); return 'You look away, studiously, at the bar. When you look back, Yelena is sitting with the girl in a booth, with the shirt on the table between them, teaching her something with a salt cellar and two beer mats. It lasts forty minutes. When the girl leaves, she is walking on air. Yelena says nothing at all about it, but she is humming, softly, the Ravens\' song.'; } },
      ],
    },
  ],
  ruben: [
    {
      days: 5, title: 'The Bartender Who Listens',
      text: 'Ruben Castellanos has made a friend of the bartender, or the bartender has made one of him, which at a bar is much the same. They have been exchanging news since the doors opened: who is short of what, which dock office is slow, whose cousin is getting married. "Nobody tells a bartender anything," Ruben says, to you, delighted. "They tell him everything. He is the best comms officer on the station and he does not even know it."',
      choices: [
        { label: 'Buy a round (30 cr)', can: () => G.state.credits >= 30, run() { G.state.credits -= 30; castLike('ruben', 2, 'You bought a round, and the bartender talked.'); castXp('ruben', 'slicer', 2); const tip = addRumor(); return `A round loosens the bartender\'s tongue in about a minute, and Ruben is leaning forward, with a pencil, before the glasses are down. By the end of the night you have the news of three docks, and one worth money: ${tip} Ruben tucks the pencil behind his ear. "A good listener," he says, "has no name. A good bartender has a hundred."`; } },
        { label: 'Just listen', run() { castLike('ruben', 1, 'You listened with me.'); return 'You sit with them and say very little, and it is, you find, quite remarkable how much a person can learn by holding a drink and being quiet. The bartender talks about the dock office, a wedding, a shortage. Ruben nods along with the look of a man hearing his favourite song. When you leave, he whispers, "You have the gift. People tell you things." You are not sure it is a compliment. You are rather pleased all the same.'; } },
      ],
    },
    {
      days: 30, title: 'The Council Member',
      text: 'A grey-haired woman in a good coat has just come into the bar, with two aides, and Ruben Castellanos has become very interested in the menu. He is holding it quite high. "That is Councillor Reyes," he says, from behind it, with enormous calm. "Of the Valles dome council. She is the one who signed my notice." He lowers the menu an inch. "I have been practising what I would say to her for four years. I cannot remember any of it."',
      choices: [
        { label: 'Introduce yourself to the councillor', run() { castLike('ruben', 3, 'You introduced yourself to the councillor who signed my notice.'); castFlag('ruben', 'councillor'); return 'You walk over and say you work with a man who knows more about the dome network than anyone alive, and the councillor, to your surprise, goes still. "Castellanos," she says. "The relay in the kitchen." She looks past you, at the menu, and her face softens. "We lost eleven days of band because of what he did, and we found out afterwards that he had saved the north dome. I have been trying to find him for four years." Ruben lowers the menu, all the way.'; } },
        { label: 'Let him hide', run() { castLike('ruben', 1, 'You let me hide behind the menu.'); return 'You do not move, and he stays behind the menu, and the councillor takes a table at the far end, and orders, and does not look round. After twenty minutes she leaves. Ruben puts the menu down. "Thank you," he says, a little hoarse. "I would not have been able to say it. Another day." He looks, for a moment, much older, and then he picks up the thermos and offers it to you with a half-smile.'; } },
      ],
    },
  ],
  bexa: [
    {
      days: 5, title: 'Hull Numbers',
      text: 'The bar has a salvage chit board by the door, where claims are pinned up for anyone who wants to buy a hull number and a chance. Bexa Oyelaran has been standing in front of it for ten minutes, reading, with her lips moving slightly. "I know this one," she says, and touches a card with a fingertip. "The Honest Comet. I towed her into Ceres eleven years ago. She was dark for six weeks. Everyone aboard was alive." She does not take her finger away.',
      choices: [
        { label: 'Ask about the crew', run() { castLike('bexa', 2, 'You asked about the crew of the Honest Comet.'); return 'She tells you, and it takes a while, and it is careful, and every name is in it: the engineer who sang, the child with the broken wrist, the captain, who would not leave the bridge until she was sure everyone else had gone. "She is for sale again," she says, finally, looking at the card. "They have never fixed the port thruster. I told them about the port thruster." She does not say anything for some time.'; } },
        { label: 'Buy her a drink and let her read', run() { castLike('bexa', 1, 'You bought me a drink and let me read the board.'); return 'You put a drink at her elbow and say nothing, and she reads the board from one end to the other, card by card, with a very still face, saying a ship\'s name now and then, under her breath, like a person going down a list of friends. When she has finished she lifts the glass. "Thank you," she says. "It is good to be somewhere I can be quiet. It is better with someone who knows how."'; } },
      ],
    },
    {
      days: 30, title: 'The Boy from Pallas',
      text: 'A young man of about twenty has stopped in front of Bexa at the bar, and stands there, working his mouth, holding a postcard. It has a drawing on it, in crayon: a small tug, and a big dark ship. "You pulled my ship in," he says, finally. "Eleven years ago. I was nine. I have drawn it every year since." Bexa has put down her glass very gently, as you would put down something that might break. She is looking at the postcard, and not at him.',
      choices: [
        { label: 'Leave them to talk', run() { castLike('bexa', 2, 'You left me to talk to the boy from Pallas.'); return 'You find a stool at the other end, and watch, without listening. They talk for an hour. She does the listening, mostly, with her hand around her glass, and he does the talking, with his hands, drawing the tug in the air. At the end she takes out a pen on a chain, and signs the back of the postcard, small and even, and tucks it into her jacket, where the list is. She does not say anything about it at all. She does not need to.'; } },
        { label: 'Sit with them', run() { castLike('bexa', 3, 'You sat with me while the boy from Pallas talked.'); castFlag('bexa', 'pallas'); return 'You sit down beside her, which she notices, and her shoulder comes to rest very slightly against yours, which she does not seem to notice at all. The boy tells it all: the dark, the cold, the drawing. He says that she was the first person he ever saw who was not afraid. Bexa says nothing, then, in a low and even voice, "I was terrified." The boy laughs, startled, and she smiles, and it is the first time you have seen all of her face.'; } },
      ],
    },
  ],
  pax: [
    {
      days: 5, title: 'The Dart Board',
      text: 'The dart-laser board is free, and a stranger in a ring-hand\'s jacket has seen Pax Iwu looking at it. "Fancy a game?" they say, cheerfully, over the noise. "Loser pays." Pax has gone quiet. The hands are fine. The hands are always fine. It is the people beside them. "I would be good at it," Pax says, to you, barely audibly, "if they would just not stand so close."',
      choices: [
        { label: 'Tell Pax to take the shot', run() { castLike('pax', 2, 'You told me to take the shot, and I did.'); castXp('pax', 'gunner', 3); return 'You say, "Take it," and Pax does, with the stranger standing a hand\'s width away and a crowd gathering, and the first dart goes dead centre. The second is dead centre in the first. The stranger gives a low whistle and says nothing for a long while. Pax\'s hands have not shaken once, and they look at them, astonished, as if they had grown. "That," Pax says, to you, on the walk back, "was not as bad as I thought."'; } },
        { label: 'Take the stranger\'s challenge yourself', run() { castLike('pax', 1, 'You played the stranger so that I did not have to.'); return 'You step up and play, badly, and lose, and pay, and Pax watches the whole thing from a stool, with a distinct and rising amusement. At the end they say, solemnly, "Your stance is wrong." Then they correct it, for you, standing very close, without a flinch, and the stranger, who has seen it all, gives them a slow, impressed nod. Pax does not notice. You do.'; } },
      ],
    },
    {
      days: 30, title: 'A Letter Answered',
      text: 'The bar has a message terminal at the back, a battered one, with a curtain. Pax Iwu has been in front of it for the better part of an hour, typing and deleting, with the stricken patience of someone writing the hardest letter of their life. At last they come to find you, holding the handheld at arm\'s length. "I have written back to the foreman," Pax says. "It is eleven lines. I do not know if it is right. Will you read it?"',
      choices: [
        { label: 'Read it and say it is good', run() { castLike('pax', 2, 'You read my letter to the foreman, and said it was good.'); castFlag('pax', 'letter'); return 'It is eleven lines, plain and exact, the way a person writes who has measured every word: that they are sorry, that they are not sure what for, that they are learning to stand beside the thing. "It is good," you say, and mean it. Pax reads it one more time, takes a very deep breath, and sends it, quickly, before they can change their mind. Then they sit down on the nearest stool, with the handheld on their knee, and shake, a little, in a kind of joy.'; } },
        { label: 'Ask if they really want to send it', run() { castLike('pax', 1, 'You asked me if I really wanted to send it.'); return '"I think so," Pax says. They read it over, twice, with a slowly changing face. "Yes. I think so. I am not good at saying it, and I would rather say it badly than not at all." They send it. Afterwards you have a glass of water together, and neither of you says very much, and it is, you decide, the right amount.'; } },
      ],
    },
  ],
};

// Who is at the bar tonight: the main characters aboard with you who have a scene due. At the first port with a bar after the
// scene's day, and for as long as it is still to come.
function castBarDue(key) {
  const st = G.state, rec = castRec(key), scene = (CAST_BAR[key] || [])[rec.bar || 0];
  return scene && st.crew.includes(rec.pid) && st.day - (rec.since || 0) >= scene.days ? scene : null;
}
function castPatrons() {
  return castAboard().filter(p => castBarDue(p.cast)).map(p => ({ p, known: true, cast: p.cast }));
}

// The talk with a main character at the bar is their scene. Having it removes them from the room.
function castBarEvent(pat) {
  const rec = castRec(pat.cast), scene = castBarDue(pat.cast);
  if (!scene) return { title: `${pat.p.first} ${pat.p.last}`, text: `${pat.p.first} is at the bar with a drink, and nods to you, and goes back to it.`, choices: [{ label: 'Leave them to it', run: () => `You leave ${pat.p.first} to the bar.` }] };
  rec.bar = (rec.bar || 0) + 1;
  G.patrons = (G.patrons || []).filter(x => x !== pat);
  return { title: scene.title, text: scene.text, personal: true, choices: scene.choices };
}
