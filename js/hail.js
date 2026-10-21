'use strict';

// Hailing ships in flight. Every NPC ship has a procedural captain (`n.persona`) whose
// first trait sets the tone. Captains you deal with are saved and can turn up again
// in their home system, remembering you. Hails pause the game and use the shared
// choice dialog.
// Loaded before game.js; only calls into it at runtime.

const HAIL_RANGE = 3000;

const GREETINGS = {
  talkative: ['Well, hello there! Always nice to hear a new voice out here.', 'Oh, a visitor! Do you know, you\'re the first ship I\'ve talked to in three days, and I have so much to tell you.', 'Ah, company! Hold on, let me put the kettle on. No, go ahead, I can hear you.'],
  nervous: ['Uh, this is {ship}. We\'re just passing through. Please.', 'Oh. Oh, hello. We weren\'t, um, expecting anyone. We\'re not carrying anything. Anything valuable.', 'This is {ship}. We mean no harm. Please don\'t, um. We mean no harm.'],
  rude: ['What do you want?', 'This is a working channel. Say what you need, and be brief about it.', 'You\'re cutting into my burn. Talk, or get off the band.'],
  kind: ['Good to hear from you, friend. Safe burns.', 'Hello, hello! It\'s a lonely lane, and a friendly voice is a gift. How can we help?', 'This is {ship}. We\'re glad to see you. Are you all right out there?'],
  greedy: ['Time is money, captain. Make it quick.', 'Every minute on this channel costs me something. State your business, and name your price.', 'This is {ship}. I\'m always open to a profitable conversation. Is this one?'],
  pious: ['Peace on your burn, traveler.', 'Blessings on your ship and all who fly in her. What brings you to our band?', 'May the long dark be kind to you, friend. How may we serve?'],
  curious: ['Oh, a {yours}! What are you hauling?', 'Hello! Is that a {yours}? I\'ve always wondered how they handle. Tell me everything!', 'This is {ship}, and I have a hundred questions. Do you have a minute?'],
  drunk: ['Heyyy. Who\'s this? Who\'s anybody?', 'Hello, hello, who\'s this, hold on, hold on, I know this one.', 'This is, uh, this is the good ship {ship}. I think. Say again?'],
  secretive: ['...This is {ship}. State your business.', 'Go ahead. And, before you ask, no.', 'You\'ve reached {ship}. Keep it short, and keep it vague.'],
  generous: ['Hello there! Need anything?', 'Well, hello! There\'s always room on the band for a friend. What can we do for you?', 'This is {ship}. If you\'re in any trouble at all, say so, and we\'ll see what we can do.'],
  brave: ['This is {ship}. Go ahead.', 'This is {ship}. Whatever it is, we\'re listening, and we\'re not afraid.', 'Go ahead, stranger. We\'re all ears, and our guns are all business.'],
  homesick: ['This is {ship}, out of {home}. Go ahead.', 'Hello. This is {ship}. We haven\'t heard a friendly voice from {home} in a long while. Are you from around there?', 'This is {ship}, out of {home}, a long way from it. It\'s good to hear someone.'],
};

const PIRATE_DEMANDS = {
  rude: ['Cargo. Now. Or we cut it out of your hull.', 'You have exactly ten seconds to make me not want to shoot you. Start counting.', 'Your cargo, your credits, and your attitude, in that order. Move.'],
  greedy: ['Everything has a price, including your ship. Let\'s negotiate.', 'I\'m prepared to be very reasonable. Everything you have, for the privilege of continuing to breathe.', 'Consider this a tax. A large one. Payable now.'],
  nervous: ['We, uh, we\'re pirates! Cut your drive and hand over your cargo!', 'Stand and, um, deliver! We have guns! Real ones! Please don\'t make us use them.', 'This is a robbery! It is, um, a serious one! Please cooperate!'],
  talkative: ['Now, I know what you\'re thinking, and the answer is yes, we really are going to rob you.', ('Good day to you, captain! I hate to be a ' +
      'bother, but we are, as it happens, pirates, and, well, you know how it goes.'), 'Lovely burn you\'re having. Shame if anything were to happen to it. Which is where we come in.'],
  drunk: ['Stand and deliver! Wait, no. Cut your drive! That\'s the one.', 'Hold it right there! Or, well, not right there. Just, um. Nearby. Give us money.', 'We are, hic, pirates. Hand over the, the, the stuff.'],
  brave: ['This is a boarding action. Cut your drive, and I promise we\'ll be quick, and, mostly, gentle.', 'We\'re going to take what we came for. You can fight, but I wouldn\'t.'],
  kind: ['I really do hate to do this. Cargo, please, and nobody has to get hurt.', 'I\'m sorry, truly, but times are hard. Your cargo, and we\'ll leave your crew alone.'],
  secretive: ['You know what this is. You know what we want. Don\'t make it complicated.', 'Cut your drive. We\'ll take what we need, and you\'ll never see us again.'],
  pious: ['The dark provides, and tonight it provides through us. Give up your cargo, and go in peace.', 'Forgive us, for we\'re doing what we must. Your cargo, and your blessing.'],
  curious: ['Before we rob you, I have to ask: what\'s that drive? That\'s a fascinating configuration. Now, cargo, please.', 'This is a robbery, but, while we\'re here, I\'ve got to know how you got that hull finish.'],
  generous: ['We\'ll take your cargo, but we\'ll leave you enough to get home. That\'s the pirate\'s code.', 'Cut your drive. We\'re taking a share, not everything. We\'re not animals.'],
  homesick: ['We\'re not doing this for fun. There are people back home who need to eat. Cargo, please.', 'I\'m sorry. I have a family. Give us your cargo, and I\'ll pretend this never happened.'],
};
const PIRATE_DEMAND = ['This is {ship}. Cut your drive and prepare to be boarded.', 'This is {ship}. You\'re in our space. Cut your drive, and this will go easily.', 'Attention, freighter. This is {ship}. Heave to and prepare to be boarded.'];

function voice(n, table, fallback) {
  const c = n.persona, line = pick([].concat(table[c.traits[0]] || fallback));
  return line.replace('{ship}', n.name).replace('{yours}', ship().name).replace('{home}', c.home);
}

// Pirates announce themselves when they first close in.
const hailSay = (key, vars) => sceneSay('scene:hail-notes', key, vars);  // the notes of a hail are in the text layer (js/hiredscenes.js)

function demandLine(n) {
  const c = n.persona;
  if (n.payer) return hailSay('demand.paid', { payer: n.payer });
  if (c.id && c.opinion <= OPINION.GRUDGE) return hailSay('demand.grudge');
  if (c.tributes) return hailSay('demand.tribute');
  return voice(n, PIRATE_DEMANDS, PIRATE_DEMAND);
}

function pirateDemand(n) {
  if (n.hailed || n.bountyId) return;
  n.hailed = true;
  msg(hailSay('say', { name: n.name, line: demandLine(n) }));
}

function tryHail() {
  const p = G.player;
  if (!G.target || G.target.dead) {
    G.target = G.npcs.filter(n => n.kind !== 'escort' && dist(n, p) < HAIL_RANGE).sort((a, b) => dist(a, p) - dist(b, p))[0] || null;
  }
  if (!G.target) return msg(hailSay('none'));
  if (G.target.kind === 'escort') return msg(hailSay('escort', { name: G.target.name }));
  if (dist(G.target, p) > HAIL_RANGE) return msg(hailSay('far', { name: G.target.name }));
  G.mode = 'hail';
  openEvent(hailEvent(G.target));
}

// Send a ship away from the player and out of local space.
function leave(n) {
  n.hostile = false;
  const a = Math.atan2(n.y - G.player.y, n.x - G.player.x);
  n.goal = { x: Math.cos(a) * 4500, y: Math.sin(a) * 4500, r: 150 };
}

const damaged = n => n.armor < n.maxArmor * 0.3;

function threatOdds(n) {
  const t = n.persona.traits;
  return Math.max(0.05, Math.min(0.9, 0.25 + (playerGuns() - SHIPS[n.shipId].guns) * 0.2 + (damaged(n) ? 0.3 : 0)
    + (t.includes('nervous') ? 0.2 : 0) - (t.includes('brave') ? 0.2 : 0)));
}

function bigCargo() {
  const st = G.state;
  return Object.keys(st.cargo).filter(c => st.cargo[c] > 0).sort((a, b) => st.cargo[b] - st.cargo[a])[0];
}

// ---------- recurring captains ----------

// Captains are saved once you deal with them, so they can turn up again in their
// home system. Bounty targets and hired guns are one-offs.
function registerCaptain(n) {
  if (n.bountyId || n.payer || n.story) return;
  const p = n.persona;
  if (!p.id) registerPerson(p);
  p.ship = { name: n.name, shipId: n.shipId, kind: n.kind };
  p.haunt = G.state.systemId;
}

function feel(n, amount, memory) {
  registerCaptain(n);
  like(n.persona, amount, memory);
}

// Captains with strong feelings about you are the ones most likely to show up.
function pickKnownCaptain(kind) {
  const known = Object.values(G.state.people).filter(p => p.ship && p.ship.kind === kind
    && p.haunt === G.state.systemId && !G.npcs.some(n => n.persona === p));
  if (!known.length) return null;
  const keen = known.filter(p => Math.abs(p.opinion) >= OPINION.STRONG);
  return Math.random() < (keen.length ? 0.6 : 0.35) ? pick(keen.length ? keen : known) : null;
}

function hailEvent(n) {
  const c = n.persona, captain = `Capt. ${c.first} ${c.last}`, st = G.state;
  const title = `${n.name}${c.id ? ` (${opinionWord(c.opinion)})` : ''}`;
  const signOff = { label: 'Cut the channel', run: () => 'You cut the channel.' };
  if (n.disabled) return boardingEvent(n);  // boarding.js
  if (n.blockade || n.kind === 'ally') return blockadeHail(n);
  if (n.kind === 'patrol') return patrolHail(n);
  if (n.kind === 'agent') return agentHail(n);

  if (n.bountyId) {
    const m = st.missions.find(x => x.id === n.bountyId);
    return {
      title, text: `${n.name} answers with a laugh, a long, easy, unafraid laugh, that carries clearly over the band. "Come and collect, bounty hunter," says a voice like warm gravel. "I've been collected by better than you."`,
      choices: [
        { label: 'Offer them a chance to surrender', run() {
          if (!damaged(n) || Math.random() < 0.3) return '"Surrender? To you?" More laughter, longer and richer, and, at the end of it, a single click. The channel goes dead, and, on your scope, the ship\'s drive flares, and doesn\'t falter.';
          n.dead = true;
          if (m) {
            st.credits += m.pay;
            st.missions = st.missions.filter(x => x !== m);
          }
          return (`There's a long silence on the channel. Then a tired voice says, "All right. All right, that's enough." ${n.name} powers down, ` +
              `drive by drive, until she's a dark hull in the dark, and a patrol cutter, called in, takes custody. ` +
              `The ${m ? `${fmt(m.pay)} cr ` : ''}bounty is yours without firing another shot, and you feel, oddly, not triumphant but tired.`);
        } },
        signOff,
      ],
    };
  }

  if (n.kind === 'pirate' && n.hostile) {
    const hired = !!n.payer, grudge = c.id && c.opinion <= OPINION.GRUDGE;
    const tribute = Math.round(Math.max(5000, st.credits * 0.08) * (1 + 0.5 * (c.tributes || 0)));
    const choices = [];
    if (grudge) {
      const price = 20000 + 5000 * -c.opinion;
      choices.push({ label: `Offer compensation (${fmt(price)} cr)`, ...gated(needCr(price)), run() {
        st.credits -= price;
        feel(n, 4, 'You paid to settle things between us.');
        leave(n);
        return (`A long silence on the band, so long you think the channel has dropped. Then, low and flat: "...Fine. We're square." It's not ` +
            `forgiveness, but it's an end to it. ${n.name} breaks off, slowly, and her drive dwindles into the dark, and the tightness, in your ` +
            `chest, and in your shoulders, comes down, one notch at a time.`);
      } });
    } else if (hired) {
      choices.push({ label: 'Outbid whoever paid you (30,000 cr)', ...gated(needCr(30000)), run() {
        st.credits -= 30000;
        leave(n);
        return (`${captain} considers it, for a long moment, with a faint, ironic hum. "Your money spends the same as ${n.payer}'s," they say at ` +
            `last, and there's even a little respect in it. "Honor among thieves, and so on." They break off, and, as they go, a last, dry joke: ` +
            `"Tell ${n.payer} I said hello."`);
      } });
    } else {
      choices.push({ label: `Pay tribute (${fmt(tribute)} cr)`, ...gated(needCr(tribute)), run() {
        st.credits -= tribute;
        c.tributes = (c.tributes || 0) + 1;
        feel(n, 1, 'You paid me off.');
        changeRep('Pirate', 1);
        leave(n);
        return (`The credits clear, with a small, soft, satisfied chime. "Pleasure doing business," says ${captain}, and means it, in the courteous, ` +
            `faintly sinister manner of a man who has been told his price and is content. ${n.name} peels away, running lights blinking, in a lazy, ` +
            `contented arc, and you feel, for a while, very small.`);
      } });
      choices.push({ label: 'Dump half your biggest cargo', ...gated(needGoods), run() {
        const text = loseCargo(0.5);
        feel(n, 1, 'You dumped cargo for me.');
        leave(n);
        return `${text} The crates tumble away in a glinting, expensive spread, and ${n.name} goes after them, whooping, on a great, greedy curve. You're forgotten in about four seconds, and you burn on, in a very quiet cockpit, counting what it cost.`;
      } });
    }
    if (damaged(n) && !hired) {
      choices.push({ label: 'Demand their cargo instead', run() {
        const free = cargoFree();
        feel(n, -3, 'You robbed my ship.');
        changeRep('Pirate', -2);
        leave(n);
        if (free <= 0) return `They offer their hold, in a shaking, hasty voice, but you have no room. You let them limp away, trailing vapor, and, as they go, you find you're not proud of it, only tired.`;
        const good = pick(COMMODITIES), tons = Math.min(free, randInt(4, 10));
        st.cargo[good.id] = (st.cargo[good.id] || 0) + tons;
        return `"All right, all right!" a cracked, terrified voice shouts, and, with a flurry of thruster bursts, they jettison ${tons}t of ${good.name} and run. You scoop it up, in a long, careful arc, and the crates knock softly against your hull. It's a good haul, and it's not a good feeling.`;
      } });
    }
    choices.push({ label: 'Threaten them', run() {
      if (Math.random() < threatOdds(n) - (grudge ? 0.2 : 0)) {
        feel(n, -1, 'You scared me off.');
        leave(n);
        return (`There's a long pause, and you can almost hear ${captain} looking at your guns, then at theirs, and doing the sum. "Not worth it," ` +
            `they say at last, in a voice like a shrug. They break off, and the sudden, enormous quiet, in your cockpit, is the sound of a very long ` +
            `breath being let out.`);
      }
      return `${captain} laughs at you, low and warm and entirely unimpressed. "Brave words." They keep coming, closing steadily, and your instruments, one by one, light up with targeting lock.`;
    } });
    choices.push({ label: '[{crew}] Claim you\'re one of theirs', role: 'slicer', run() {
      if (Math.random() < slicerOdds()) {
        leave(n);
        return '{crew} spoofs a pirate transponder and some convincing gang chatter, in a low, gravelly, wholly ridiculous accent that you\'ll make fun of for weeks. They wave you off, with a burst of raucous laughter, and one of them calls you "cousin".';
      }
      return `{crew}'s spoof doesn't fool them, not for a second. "Nice try," says the voice, in a tone of almost professional appreciation, and, behind it, the sound of weapons arming.`;
    } });
    choices.push(signOff);
    return { title, text: `${captain}: "${demandLine(n)}"`, choices };
  }

  if (n.kind === 'pirate') {
    return {
      title, text: `${captain} ${c.id && c.opinion >= OPINION.TRUSTED ? 'recognizes you. "Our favorite customer.' : 'reads your transponder and relaxes. "One of ours.'} What do you need?"`,
      choices: [
        { label: 'Any news?', ...gated(notYet(() => n.gossiped, 'They\'ve told you what they know.')), run() { n.gossiped = true; return `"${addRumor()}"`; } },
        { label: 'Buy stolen luxury goods (5t at 2,500 cr/t)', ...gated(notYet(() => n.fenced, 'They have sold you what they had.'), [() => cargoFree() >= 5, () => 'This needs 5t of room in the hold.'], needCr(12500)), run() {
          n.fenced = true;
          feel(n, 1, 'You bought our goods.');
          changeRep('Pirate', 2);
          st.credits -= 12500;
          st.cargo.luxury = (st.cargo.luxury || 0) + 5;
          st.paid.luxury = (st.paid.luxury || 0) + 12500;
          return ('Five tons of "slightly used" luxury goods drift across on a tether, in a line of dented, glittering crates, stamped with the marks ' +
              'of at least three different owners, none of them a pirate. No questions asked. There\'s a faint smell of spilled perfume in the airlock ' +
              'for days, and, somewhere in the stack, an unopened bottle of very good wine.');
        } },
        signOff,
      ],
    };
  }

  // A trader you shot at, just now or on an earlier meeting.
  if (n.hostile || (c.id && c.opinion <= OPINION.GRUDGE)) {
    const price = n.hostile && !(c.id && c.opinion <= OPINION.GRUDGE) ? 5000 : 15000;
    return {
      title, text: n.hostile && !n.wasShot ? `${captain}: "You! I remember you. Keep your distance."` : n.hostile ? `${captain}: "You shot at us! What kind of lunatic are you?"` : `${captain}: "Oh. It's you. We have nothing to say to you."`,
      choices: [
        { label: `Apologize and pay for the damage (${fmt(price)} cr)`, ...gated(needCr(price)), run() {
          st.credits -= price;
          n.hostile = false;
          feel(n, 3, 'You apologized and paid for the damage.');
          return (`${captain} grumbles, in a long, aggrieved mutter, but takes the money, and, after a while, the aggrieved mutter turns into a sort ` +
              `of grudging thanks. "Well," they say, "I've had worse days." They stand down, and, as they fall behind, you hear, very faintly, a ` +
              `small, weary laugh.`);
        } },
        signOff,
      ],
    };
  }

  // A peaceful trader.
  const cid = bigCargo(), good = cid && COMMODITIES.find(x => x.id === cid);
  const friend = c.id && c.opinion >= OPINION.TRUSTED;
  const offer = good && Math.round(good.base * rand(0.95, 1.25) * (friend ? 1.1 : 1));
  const qty = cid && Math.min(10, st.cargo[cid]);
  const s = ship(), spare = Math.min(40, s.fuel - st.fuel);
  const free = friend || c.traits.includes('kind') || c.traits.includes('generous');
  const v = voyageOf(n), hauling = v ? ` Hauling ${v.tons}t of ${goodName(v.cid)} from ${v.from} to ${v.to}.` : '';
  return {
    title, text: `${captain}: "${friend ? 'Captain! Good to see you again. ' : ''}${voice(n, GREETINGS, 'This is {ship}. Go ahead.')}${hauling}"`,
    choices: [
      { label: 'Any news?', ...gated(notYet(() => n.gossiped, 'They\'ve told you what they know.')), run() {
        n.gossiped = true;
        return c.traits.includes('secretive') ? '"Nothing I care to share." Fair enough.' : `"${addRumor()}"`;
      } },
      ...(spare > 0 ? [{ label: free ? `Could you spare ${spare} units of reaction mass?` : `Buy ${spare} units of reaction mass (${fmt(spare * 40)} cr)`,
        ...gated(notYet(() => n.soldFuel, 'They have sold you fuel already.'), [() => free || st.credits >= spare * 40, () => `You have ${fmt(st.credits)} cr; this costs ${fmt(spare * 40)} cr.`]), run() {
          n.soldFuel = true;
          st.fuel += spare;
          feel(n, 1, free ? 'We helped you out with reaction mass.' : 'You bought reaction mass from us.');
          if (free) return (`"Of course. We all need help out here," ${captain} says, warmly, without a moment's hesitation. They pass it over on a ` +
              `hose, free, in a long, low, gurgling stream, and, when the tank is full, they wave you off with a hand that you can see through the ` +
              `cockpit glass. It's a small kindness, and it sits in your chest for a long time.`);
          st.credits -= spare * 40;
          return 'You match velocity, in a long, careful dance, and they pump it across, in a steady, humming stream, with a brisk professional silence on the channel. Not cheap, but you\'re not stuck, and you tip your hand to the cockpit glass as they peel away.';
        } }] : []),
      ...(good ? [{ label: `Sell them ${qty}t of ${good.name} (${fmt(offer)} cr/t)`, ...gated(notYet(() => n.bought, 'They have bought from you already.')), run() {
        n.bought = true;
        feel(n, 1, 'We did business.');
        const held = st.cargo[cid];
        st.paid[cid] -= st.paid[cid] * qty / held;
        st.cargo[cid] -= qty;
        st.credits += qty * offer;
        return (`A cargo tender flits across, small and quick as a dragonfly, and the crates go over in three neat trips. ${captain} ` +
            `pays ${fmt(qty * offer)} cr for the lot, over the open band, in a clipped, cheerful tone, and signs off with a friendly "Pleasure." It's ` +
            `a good, clean, ordinary deal, the kind that keeps the lanes turning.`);
      } }] : []),
      { label: 'Sign off', run: () => c.traits.includes('rude') ? '"Finally," says the voice, and the channel closes with a small, sharp click.' : (
          '"Safe burns, captain," says the voice, warmly, and, for a moment, the channel hums, open and companionable, before it closes, and you\'re ' +
          'alone again, in the long dark, with your own small light.') },
    ],
  };
}
