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
      text: ('In the dock bar, Ines Ferreira has the stool nearest the docking screen. A pilot on it is making a poor job of an approach. "Third ' +
          'attempt," she says, without turning. "He is going to clip the gantry." She keeps her eyes on the screen. "When somebody lands badly, I used ' +
          'to buy the controller a drink. It is not the controller\'s fault. Nobody remembers that."'),
      choices: [
        { label: 'Watch the approach with her', run() { castLike('ines', 1, 'You watched a bad landing with me, and I enjoyed the company.'); castXp('ines', 'pilot', 3); return (
            'She talks you through it like a commentator: the flare a second too late, the crosswind he has not read, the thrust he will wish he had ' +
            'saved. He clips the gantry, gently, as she said he would, and she raises her glass to the screen. "Eleven out of ten for effort," she ' +
            'says. By the end of the hour you know more about landing than you did.'); } },
        { label: 'Ask about Lisbon', run() { castLike('ines', 2, 'You asked about Lisbon, and I told you.'); castFlag('ines', 'lisbon'); return (
            'She turns from the screen. "The ferry ran every forty minutes," she says. "Nine years. I knew the regulars by their shoes. There was an ' +
            'old man who rode the 6:40 every morning to feed the pigeons on the Luna side. I never spoke to him once. I would give a great deal to ' +
            'know if he still does." She drinks. "That is a route. You get fond of people you have only ever seen from the front."'); } },
      ],
    },
    {
      days: 30, title: 'The Badge',
      text: ('Someone at the end of the bar is wearing a tower controller\'s badge, and Ines has stopped moving. The crest is Lisbon\'s. "It could be ' +
          'nothing," she says to her glass. "There are four hundred of them. It is almost certainly not the one who gave the order." She has not ' +
          'looked round. Her hand is flat on the bar, and the knuckles are white.'),
      choices: [
        { label: 'Go over to them together', run() { castLike('ines', 3, 'You went over to the controller with me.'); castFlag('ines', 'tower'); return (
            'You go together, and it takes her three tries to say her name. The controller hears all of it: the pad, the order, the forty-one. Then ' +
            'the controller says that they were on the desk that night, that it was not their call, and that everyone on the desk knew who had put ' +
            'that shuttle down. "It was the best landing I have seen," they say. Ines says nothing. She shakes the controller\'s hand, and keeps hold ' +
            'of it.'); } },
        { label: 'Let her decide', run() { castLike('ines', 1, 'You let me decide about the controller.'); return (
            'You say nothing, and she does not go over. She finishes her drink and puts the glass down with a click. "Not tonight," she says. On the ' +
            'way out she looks back once at the badge, and then straight ahead.'); } },
      ],
    },
  ],
  tomas: [
    {
      days: 5, title: 'Shop Talk',
      text: ('Tomas Achebe has found a welder at the bar: a working one, in dock coveralls, with burn scars on both wrists and a nervous laugh. They ' +
          'have been talking for an hour. The whole of the bar rail, you see now, was welded by somebody very good. "Look at the bead," Tomas says to ' +
          'you, low. "Look at that. Nobody does that for a bar."'),
      choices: [
        { label: 'Buy a round for the dock crew (40 cr)', can: () => G.state.credits >= 40, run() { G.state.credits -= 40; castLike('tomas', 2, 'You bought a round for the dock crew, and let me talk shop.'); castXp('tomas', 'engineer', 2); return (
            'A round for the dock crew turns into three hours. Tomas is shown the jig they use for the rail, and a trick for a seam that has given ' +
            'him trouble since the ring, and he shows them one of his own. He walks back to the ship with a notebook full of sketches. "They talk to ' +
            'the work," he says. "The same as me."'); } },
        { label: 'Let him have his shop talk', run() { castLike('tomas', 1, 'You let me talk shop with a welder.'); return (
            'You take a stool at the other end of the bar and leave them to it. Every so often a burst of technical argument comes down the bar, with ' +
            'hand gestures. When Tomas finds you, hours later, he is hoarse and cheerful. "Thank you," he says. "I did not know how much I missed ' +
            'being a stranger among people who understood me."'); } },
      ],
    },
    {
      days: 30, title: 'A Call to Lagos Ring',
      text: ('The bar has a row of call booths at the back. In the last one, with the door open a hand\'s width, Tomas Achebe is on a long-distance ' +
          'link to his sister. You can hear his half, loud the way people are across a delay: "No, it was paid. Yes. I promise. Eat something." He ' +
          'sees you, covers the handset, and beckons. "Would you say hello? She does not believe I have a crew."'),
      choices: [
        { label: 'Say hello to his sister', run() { castLike('tomas', 3, 'You said hello to my sister.'); castFlag('tomas', 'sister'); return (
            'The delay is eleven seconds. You say your name and wait. A small voice says, in a rush, that she is glad he has people, that he never ' +
            'says, and that she hopes you are feeding him. Tomas looks at the floor. "Eleven seconds," he says afterwards, quietly, "and she heard ' +
            'every word."'); } },
        { label: 'Wave from across the room', run() { castLike('tomas', 1, 'You waved to my sister from across the room.'); return (
            'You wave. He grins, holds the handset up to the glass, and says something to her in Igbo. When he comes out of the booth he does not ' +
            'talk for a while, and you leave him to it.'); } },
      ],
    },
  ],
  yelena: [
    {
      days: 5, title: 'Last Orders, Ravens',
      text: ('The bar is showing a ring-ball replay, and a loud man at the next table has said something about the Olympus Dome Ravens. Yelena Quint ' +
          'puts her drink down. "He is wrong," she says to you, evenly. "He is wrong about the offside rule, and he is wrong about number seven, and ' +
          'he is wrong about my knee." She is already standing. "I am going to explain this to him."'),
      choices: [
        { label: 'Back her up', run() { castLike('yelena', 2, 'You backed me up when a stranger insulted the Ravens.'); castXp('yelena', 'gunner', 2); return (
            'She explains it to him with a fork, a beer mat and a great many examples, and you stand behind her with your arms folded. It does not ' +
            'come to blows. It comes to him buying a round and apologizing to the memory of number seven. At the end he asks for her autograph. She ' +
            'signs the beer mat. "Ravens," she says to the room.'); } },
        { label: 'Steer her to the door', run() { castLike('yelena', 1, 'You steered me out before it turned into a thing.'); return (
            '"He is wrong," she says, all the way to the door and halfway down the dock. "He is so wrong." She lets you take her arm. Halfway to the ' +
            'ship she stops, and laughs, and says it was probably for the best, because she would have hit him. "Thank you," she says. "I needed ' +
            'somebody to be the sensible one."'); } },
      ],
    },
    {
      days: 30, title: 'Number Seven',
      text: ('A girl of about eleven is at the end of the bar, holding a shirt with a seven on the back. She has been there for an hour. Yelena has ' +
          'seen her, and is watching the screen. "Do not," she says to you, quietly. "Do not look at the shirt. If I look at the shirt I will have to ' +
          'say something."'),
      choices: [
        { label: 'Offer to take their picture together', run() { castLike('yelena', 2, 'You took a picture of me with a girl in my old shirt.'); return (
            'You say you will take it. The girl goes red, and Yelena crouches down and puts an arm around her. She asks the girl her name and her ' +
            'position. It is goalkeeper. "Good," Yelena says. "Nobody ever thanks the goalkeeper." When the picture is taken she signs the shirt in ' +
            'full, and says nothing about the knee.'); } },
        { label: 'Give them room', run() { castLike('yelena', 1, 'You gave me room with the girl in the old shirt.'); return (
            'You look at the bar. When you look back, Yelena is in a booth with the girl, the shirt on the table between them, showing her something ' +
            'with a salt cellar and two beer mats. It goes on for forty minutes. When the girl leaves she is almost running. Yelena says nothing about ' +
            'it. She is humming the Ravens\' song.'); } },
      ],
    },
  ],
  ruben: [
    {
      days: 5, title: 'The Bartender Who Listens',
      text: ('Ruben Castellanos has made a friend of the bartender, or the bartender of him. They have been trading news since the doors opened: who ' +
          'is short of what, which dock office is slow, whose cousin is getting married. "Nobody tells a bartender anything," Ruben says to you. "They ' +
          'tell him everything. He is the best comms officer on the station and he does not know it."'),
      choices: [
        { label: 'Buy a round (30 cr)', can: () => G.state.credits >= 30, run() { G.state.credits -= 30; castLike('ruben', 2, 'You bought a round, and the bartender talked.'); castXp('ruben', 'slicer', 2); const tip = addRumor(); return (
            `A round loosens the bartender in about a minute, and Ruben is leaning forward with a pencil before the glasses are down. By the end of ` +
            `the night you have the news of three docks, and one item worth money: ${tip} Ruben puts the pencil behind his ear. "A good listener has ` +
            `no name," he says. "A good bartender has a hundred."`); } },
        { label: 'Just listen', run() { castLike('ruben', 1, 'You listened with me.'); return 'You sit with them and say little. The bartender talks about the dock office, a wedding, a shortage. Ruben nods. When you leave, he says, "You have the gift. People tell you things."'; } },
      ],
    },
    {
      days: 30, title: 'The Council Member',
      text: ('A gray-haired woman in a good coat has come into the bar with two aides, and Ruben Castellanos has picked up the menu and is holding it ' +
          'high. "That is Councillor Reyes," he says, from behind it. "Of the Valles dome council. She signed my notice." He lowers it an inch. "I ' +
          'have practiced what I would say to her for four years. I cannot remember any of it."'),
      choices: [
        { label: 'Introduce yourself to the councillor', run() { castLike('ruben', 3, 'You introduced yourself to the councillor who signed my notice.'); castFlag('ruben', 'councillor'); return (
            'You walk over and say you work with a man who knows more about the dome network than anyone alive. The councillor goes still. ' +
            '"Castellanos," she says. "The relay in the kitchen." She looks past you at the menu. "We lost eleven days of band because of what he did, ' +
            'and afterward we found out he had saved the north dome. I have been trying to find him for four years." Ruben lowers the menu all the ' +
            'way.'); } },
        { label: 'Let him hide', run() { castLike('ruben', 1, 'You let me hide behind the menu.'); return ('You do not move. Ruben stays behind the ' +
            'menu, and the councillor takes a table at the far end, orders, and does not look round. After twenty minutes she leaves. Ruben puts the ' +
            'menu down. "Thank you," he says. "I could not have said it. Another day." He picks up the thermos and offers it to you.'); } },
      ],
    },
  ],
  bexa: [
    {
      days: 5, title: 'Hull Numbers',
      text: ('The bar has a salvage chit board by the door, where claims are pinned for anyone who wants to buy a hull number and a chance. Bexa ' +
          'Oyelaran has been standing in front of it for ten minutes, reading, her lips moving. "I know this one," she says, and touches a card. "The ' +
          'Honest Comet. I towed her into Ceres eleven years ago. She was dark for six weeks. Everyone aboard was alive." She keeps her finger on the ' +
          'card.'),
      choices: [
        { label: 'Ask about the crew', run() { castLike('bexa', 2, 'You asked about the crew of the Honest Comet.'); return (
            'She tells you, and it takes a while, and every name is in it: the engineer who sang, the child with the broken wrist, the captain, who ' +
            'would not leave the bridge until everyone else was off. "She is for sale again," she says, looking at the card. "They never fixed the ' +
            'port thruster. I told them about the port thruster." She says nothing else for a time.'); } },
        { label: 'Buy her a drink and let her read', run() { castLike('bexa', 1, 'You bought me a drink and let me read the board.'); return (
            'You put a drink at her elbow and say nothing. She reads the board from one end to the other, card by card, saying a ship\'s name now and ' +
            'then under her breath. When she has finished she lifts the glass. "Thank you," she says. "It is good to be somewhere I can be quiet. It ' +
            'is better with someone who knows how."'); } },
      ],
    },
    {
      days: 30, title: 'The Boy from Pallas',
      text: ('A young man of about twenty has stopped in front of Bexa at the bar, holding a postcard. It has a crayon drawing on it: a small tug and ' +
          'a big dark ship. "You pulled my ship in," he says. "Eleven years ago. I was nine. I have drawn it every year since." Bexa puts down her ' +
          'glass. She is looking at the postcard, and not at him.'),
      choices: [
        { label: 'Leave them to talk', run() { castLike('bexa', 2, 'You left me to talk to the boy from Pallas.'); return (
            'You take a stool at the other end and watch, without listening. They talk for an hour. She listens, mostly, with her hand around her ' +
            'glass, and he talks with his hands, drawing the tug in the air. At the end she takes a pen on a chain from her jacket and signs the back ' +
            'of the postcard, small and even. She puts it in her jacket, where the list is.'); } },
        { label: 'Sit with them', run() { castLike('bexa', 3, 'You sat with me while the boy from Pallas talked.'); castFlag('bexa', 'pallas'); return (
            'You sit down beside her. Her shoulder comes to rest against yours. The boy tells it all: the dark, the cold, the drawing. He says she ' +
            'was the first person he ever saw who was not afraid. Bexa says, in a low voice, "I was terrified." The boy laughs, startled. She smiles. ' +
            'It is the first time you have seen all of her face.'); } },
      ],
    },
  ],
  pax: [
    {
      days: 5, title: 'The Dart Board',
      text: ('The dart-laser board is free, and a stranger in a ring-hand\'s jacket has seen Pax Iwu looking at it. "Fancy a game?" they say over the ' +
          'noise. "Loser pays." Pax has gone quiet. "The hands are fine," Pax says. "The hands are always fine. It is the people beside them." Then, ' +
          'to you, barely audible: "I would be good at it if they would not stand so close."'),
      choices: [
        { label: 'Tell Pax to take the shot', run() { castLike('pax', 2, 'You told me to take the shot, and I did.'); castXp('pax', 'gunner', 3); return (
            'You say, "Take it," and Pax does, with the stranger a hand\'s width away and a crowd gathering. The first dart goes dead center. The ' +
            'second goes into the first. The stranger whistles low. Pax\'s hands have not shaken, and Pax looks at them. "That," Pax says to you on ' +
            'the walk back, "was not as bad as I thought."'); } },
        { label: 'Take the stranger\'s challenge yourself', run() { castLike('pax', 1, 'You played the stranger so that I did not have to.'); return (
            'You step up and play badly and lose and pay. Pax watches from a stool, grinning. At the end Pax says, solemnly, "Your stance is wrong," ' +
            'and corrects it, standing very close, without a flinch. The stranger gives a slow nod. Pax does not see it. You do.'); } },
      ],
    },
    {
      days: 30, title: 'A Letter Answered',
      text: ('The bar has a message terminal at the back, a battered one, with a curtain. Pax Iwu has been in front of it for the better part of an ' +
          'hour, typing and deleting. At last Pax comes to find you, holding the handheld at arm\'s length. "I have written back to the foreman," Pax ' +
          'says. "It is eleven lines. I do not know if it is right. Will you read it?"'),
      choices: [
        { label: 'Read it and say it is good', run() { castLike('pax', 2, 'You read my letter to the foreman, and said it was good.'); castFlag('pax', 'letter'); return (
            'It is eleven lines, plain and exact: that Pax is sorry, that Pax is not sure what for, that Pax is learning to stand beside the thing. ' +
            '"It is good," you say. Pax reads it once more, breathes in, and sends it fast, before changing their mind. Then Pax sits down on the ' +
            'nearest stool with the handheld on their knee, and shakes.'); } },
        { label: 'Ask if they really want to send it', run() { castLike('pax', 1, 'You asked me if I really wanted to send it.'); return (
            '"I think so," Pax says. Pax reads it over twice. "Yes. I think so. I am not good at saying it, and I would rather say it badly than not ' +
            'at all." Pax sends it. Afterward you have a glass of water together, and neither of you says much.'); } },
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
