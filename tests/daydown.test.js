'use strict';

// Going down to Lagos (#1162, docs/bible/ports.md): at the Ring, in a captain's wait, the hand takes the spaceplane down for a day from their savings,
// once a day, by a tag on the port view (downOffers, #1193): a lane's line taken in turn by the day. `take(key)` takes the tag as the view does.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a day down: offered at the Ring in a captain\'s wait only, as tags on the spoke lift (#1193), the fare from the hand\'s savings, once a day, a lane\'s line by the day, and again after the night (#1162)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), tags = () => downOffers(st, currentPlanet()).map(o => [o.label, o.room]);
    const out = { noStay: tags() };
    delete h.stay; beginStay(h, 3, 'market'); st.credits = 2000; st.belowSeen = BELOW.slice();  // the lanes into lives below are their own test
    out.open = tags();
    downOffers(st, currentPlanet()).find(o => o.key === 'down:market').take();
    out.scene = { title: G.dialog.event.title, text: G.dialog.event.text, want: sceneSay('scene:day-down', `market.${st.day % 3}`), labels: G.dialog.choices.map(c => c.label), credits: st.credits };
    finishEvent(); out.spent = tags();
    Mods.act('night'); while (G.dialog) finishEvent(); out.passed = st.day; if (!stayOf(h)) beginStay(h, 2, 'market'); out.morning = tags().length;  // a shipper may have come in the night (stay.js); the wait goes on here
    st.credits = 100; out.poor = tags();
    st.systemId = 'mars'; st.planet = 'Mars'; UI.planet = currentPlanet(); beginStay(h, 3, 'market'); out.mars = tags();
    return out;
  });
  await done();
  assert.deepEqual(r.noStay, [], 'no wait, no trip: the ship sails when the captain says');
  assert.deepEqual(r.open, [['Down to the tiers (900 cr)', 'well'], ['Down to the mainland market (900 cr)', 'well'], ['Down to the departure hall (900 cr)', 'well'], ['Down to look for work (900 cr)', 'well']]);
  assert.equal(r.scene.title, 'A Day Down'); assert.equal(r.scene.text, r.scene.want, 'the lane\'s line of the day'); assert.equal(r.scene.credits, 1100);
  assert.equal(r.scene.labels[r.scene.labels.length - 1], 'Back up the spoke');
  assert.deepEqual(r.spent, [], 'once a day');
  assert.equal(r.morning, 4, 'the next day, again');
  assert.deepEqual(r.poor, [], 'not without the fare');
  assert.deepEqual(r.mars, [], 'Lagos is under the Ring, not under Mars');
  assert.deepEqual(errors, []);
});

test('Tomas\'s parcel: when he trusts the hand, going down starts with him at the lift; taken, the day is at his parents\' table and what you tell them is his regard and a memory, and not again for a while; not taken, the day down goes on and he asks next time (#1162)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), t = tomasAboard(), keys = () => downOffers(st, currentPlanet()).map(o => o.key), take = key => { G.dialog = null; downOffers(st, currentPlanet()).find(o => o.key === key).take(); return G.dialog && G.dialog.event.title; };
    const fresh = () => { delete h.downDay; st.credits = 5000; };
    delete h.stay; beginStay(h, 9, 'market');
    const out = { tomas: !!t };
    fresh(); t.opinion = OPINION.TRUSTED - 1; out.cold = keys().includes('down:parcel');
    t.opinion = OPINION.TRUSTED; out.ask = take('down:parcel');
    UI.act('choose', 1); out.declined = { open: !!G.dialog, paid: st.credits !== 5000, lanes: keys().includes('down:market') };
    out.again = take('down:parcel');
    UI.act('choose', 0); out.table = G.dialog.event.title; out.paid = 5000 - st.credits;
    const before = t.opinion, mems = t.memories.length;
    UI.act('choose', 1); out.result = document.getElementById('event-result').textContent; finishEvent();
    while (G.dialog) finishEvent();
    out.liked = t.opinion > before; out.memory = t.memories.slice(mems).join(' | ');
    st.day += 1; fresh(); out.soon = keys().includes('down:parcel');
    st.day += VISIT_GAP; fresh(); out.later = take('down:parcel');
    return out;
  });
  await done();
  assert.equal(r.tomas, true, 'Tomas is aboard in the Earth start');
  assert.equal(r.cold, false, 'not trusted yet: no parcel');
  assert.equal(r.ask, 'Tomas\'s Parcel');
  assert.deepEqual(r.declined, { open: false, paid: false, lanes: true }, 'not this time: nothing is paid, and the day down is still on offer'); assert.equal(r.again, 'Tomas\'s Parcel', 'and he asks again next time');
  assert.equal(r.table, 'Emeka and Chioma'); assert.equal(r.paid, 900, 'the fare (DOWN_FARE) when it is taken');
  assert.match(r.result, /He was like that at ten/); assert.equal(r.liked, true); assert.match(r.memory, /You told his parents he misses the ring/);
  assert.equal(r.soon, false, 'not again so soon'); assert.equal(r.later, 'Tomas\'s Parcel', 'and again after a while');
  assert.deepEqual(errors, []);
});

test('work below: a day down offers the day\'s Lagos job, played as a station job and paid to the hand; Lagos\'s jobs never reach the station\'s board (#1162)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), out = {};
    delete h.stay; beginStay(h, 9, 'market');
    for (const k of [0, 1]) {
      st.day = Math.floor(st.day / 2) * 2 + k; delete h.downDay; st.credits = 5000; tomasAboard().opinion = 0;
      G.dialog = null; downOffers(st, currentPlanet()).find(o => o.key === 'down:work').take();
      const e = G.dialog.event; out[k] = { title: e.title, labels: G.dialog.choices.map(c => c.label) };
      UI.act('choose', G.dialog.choices.length - 1); out[k].paid = st.credits - (5000 - DOWN_FARE); finishEvent();
    }
    out.board = [];
    for (let d = 0; d < 40; d++) { st.day += 1; delete h.board; out.board.push(...jobBoard().ids); }
    return out;
  });
  await done();
  assert.deepEqual([r[0].title, r[1].title].sort(), ['A Sled Stuck on the Platform', 'The Generator on the Roof'], 'the two take turns by the day');
  assert.ok(r[0].labels.length === 4 && r[1].labels.length === 4, 'each with its four ways at it');
  assert.ok(r[0].paid > 0 && r[1].paid > 0, `the plain way pays the hand: ${r[0].paid}, ${r[1].paid}`);
  assert.deepEqual(r.board.filter(id => id.startsWith('lagos-')), [], 'never on the station\'s board');
  assert.deepEqual(errors, []);
});

test('something brought up: crayfish for Ngozi from Surulere once you have eaten at her bay, which her next word takes; and Chioma\'s stew for Tomas, back up from his parents\' table (#1164)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), t = tomasAboard(), planet = currentPlanet(), f = portLayout(planet).folk[0], ngozi = portFolkPerson(planet, f);
    const labels = () => G.dialog.choices.map(c => c.label), take = key => { delete h.downDay; G.dialog = null; downOffers(st, planet).find(o => o.key === key).take(); }, go = () => take('down:market');  // the market's day, where the crayfish is
    delete h.stay; beginStay(h, 9, 'market'); st.credits = 5000; t.opinion = 0;
    const out = {};
    go(); out.before = labels().some(l => /crayfish/.test(l)); finishEvent();
    st.portAte = st.day; go(); const i = labels().findIndex(l => /crayfish/.test(l)); out.label = labels()[i];
    UI.act('choose', i); out.bought = { credits: st.credits, carried: st.forNgozi, text: document.getElementById('event-result').textContent }; finishEvent();
    go(); out.again = labels().some(l => /crayfish/.test(l)); finishEvent();
    const mems = ngozi.memories.length, op = ngozi.opinion;
    openEvent(portWordEvent(f, ngozi, st)); out.given = G.dialog.event.text;
    UI.act('choose', G.dialog.choices.findIndex(c => c.label === 'Leave them to it'));
    out.taken = { carried: !!st.forNgozi, memory: ngozi.memories.slice(mems).join('|'), liked: ngozi.opinion > op };
    out.after = portWordEvent(f, ngozi, st).text === PORT_WORDS.ngozi[st.day % 3];
    t.opinion = OPINION.TRUSTED; delete t.parentsAt; take('down:parcel'); UI.act('choose', 0); UI.act('choose', 0); finishEvent();
    out.stew = G.dialog && G.dialog.event.title; const tm = t.memories.length;
    UI.act('choose', 0); out.stewed = { open: !!G.dialog, memory: t.memories.slice(tm).join('|') };
    return out;
  });
  await done();
  assert.equal(r.before, false, 'not before you have eaten at her bay');
  assert.equal(r.label, 'Buy dried crayfish for Ngozi in Surulere (60 cr)');
  assert.deepEqual([r.bought.credits, r.bought.carried], [3140, true]); assert.match(r.bought.text, /tarpaulin/);
  assert.equal(r.again, false, 'one bag at a time');
  assert.match(r.given, /Not the platform/);
  assert.deepEqual(r.taken, { carried: false, memory: r.taken.memory, liked: true }); assert.match(r.taken.memory, /crayfish from Surulere/);
  assert.equal(r.after, true, 'and her word is her own again');
  assert.equal(r.stew, 'His Mother\'s Stew');
  assert.equal(r.stewed.open, false); assert.match(r.stewed.memory, /his mother's stew/);
  assert.deepEqual(errors, []);
});

test('the woman gets placed: met in Surulere\'s market, mentioned to the yard clerk once, and SELLER_DAYS later she has the empty bay, with a first word that is her regard and a memory, then her own words (#1164)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), planet = currentPlanet(), t = tomasAboard(), go = () => { delete h.downDay; st.credits = 5000; G.dialog = null; downOffers(st, planet).find(o => o.key === 'down:market').take(); };  // the market's day
    const word = key => { const f = portLayout(planet, st).folk.find(x => x.key === key); return f && portWordEvent(f, portFolkPerson(planet, f), st); };
    const mention = () => word('clerk').choices.findIndex(c => c.label === 'Mention the woman from Surulere');
    delete h.stay; beginStay(h, 30, 'market'); if (t) t.opinion = 0;
    const out = { before: mention() };
    st.day += (4 - st.day % 3) % 3 + 1; go(); finishEvent(); out.notHer = !!st.metSeller;  // a day the market is Yaba
    st.day += 3 - st.day % 3; go(); out.market = G.dialog.event.text; finishEvent(); out.met = !!st.metSeller;
    const i = mention(); out.offered = i >= 0; openEvent(word('clerk')); UI.act('choose', i); out.clerk = document.getElementById('event-result').textContent; finishEvent();
    out.again = mention();
    st.day += SELLER_DAYS - 1; out.early = { here: !!word('seller'), cast: portCast(portLayout(planet, st), 12, [], [], st.day).some(c => c.who === 'seller') };
    st.day += 1; out.cast = portCast(portLayout(planet, st), 12, [], [], st.day).some(c => c.who === 'seller');
    const f = portLayout(planet, st).folk.find(x => x.key === 'seller'), p = portFolkPerson(planet, f), op = p.opinion, mems = p.memories.length;
    openEvent(word('seller')); out.title = G.dialog.event.title; out.first = G.dialog.event.text;
    UI.act('choose', G.dialog.choices.findIndex(c => c.label === 'Leave them to it'));
    out.taken = { liked: p.opinion > op, memory: p.memories.slice(mems).join('|') };
    out.name = `${p.first} ${p.last}`; out.after = word('seller').text === PORT_WORDS.seller[st.day % 3].replace(/\{first\}/g, p.first);
    return out;
  });
  await done();
  assert.equal(r.before, -1, 'not before she has been met');
  assert.equal(r.notHer, false, 'not on a day the market lane is somewhere else');
  assert.match(r.market, /phone parts/); assert.equal(r.met, true);
  assert.equal(r.offered, true); assert.match(r.clerk, /agency on that street/);
  assert.equal(r.again, -1, 'once');
  assert.deepEqual(r.early, { here: false, cast: false }, 'not before SELLER_DAYS');
  assert.equal(r.cast, true, 'then in her bay by day');
  assert.equal(r.title, r.name); assert.match(r.first, /permit in my shoe/);
  assert.equal(r.taken.liked, true); assert.match(r.taken.memory, /empty bay in the market/);
  assert.equal(r.after, true, 'and then her own words');
  assert.deepEqual(errors, []);
});

test('the boy comes up: met in Yaba on a day down, a landing at the Ring BOY_DAYS later finds him at the hiring boards, named from Lagos and none of the Ring\'s own; once (#1164)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), planet = currentPlanet(), t = tomasAboard(), go = () => { delete h.downDay; st.credits = 5000; G.dialog = null; downOffers(st, planet).find(o => o.key === 'down:market').take(); };  // the market's day
    const land = () => { while (G.dialog) finishEvent(); Mods.emit('landed', planet); const titles = []; while (G.dialog) { titles.push(G.dialog.event.title); finishEvent(); } return titles.includes('The Boy from Yaba'); };
    delete h.stay; beginStay(h, 30, 'market'); if (t) t.opinion = 0;
    const out = { before: land() };
    st.day += (2 - st.day % 3 + 3) % 3; go(); out.market = G.dialog.event.text; finishEvent(); out.met = st.metBoy === st.day;
    st.day += BOY_DAYS - 1; out.early = land();
    st.day += 1; out.up = land(); out.again = land();
    const ring = PORT_LAYOUTS[planet.name].folk.map(f => portFolkPerson(planet, f).first), boy = boyName(planet);
    out.name = { boy, men: LAGOS_NAMES.men.includes(boy), notRing: !ring.includes(boy) };
    return out;
  });
  await done();
  assert.equal(r.before, false, 'not before he has been met');
  assert.match(r.market, /writes the name on his hand/); assert.equal(r.met, true);
  assert.equal(r.early, false, 'not before BOY_DAYS');
  assert.equal(r.up, true, 'then at a landing at the Ring'); assert.equal(r.again, false, 'once');
  assert.deepEqual(r.name, { boy: r.name.boy, men: true, notRing: true });
  assert.deepEqual(errors, []);
});

test('lives below the Ring: one day down in BELOW_EVERY has a lane into the repairer\'s or the keeper\'s life below, in turn, each once; their next word is about it, their regard and a memory, then their own words again (#1164)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), planet = currentPlanet(), t = tomasAboard(), folk = k => PORT_LAYOUTS[planet.name].folk.find(f => f.key === k);
    const lane = () => { delete h.downDay; st.credits = 5000; return downOffers(st, planet).find(o => o.key === 'down:below') || null; };  // the day's tag into a life below, if it is on
    const turn = () => BELOW[Math.floor(st.day / BELOW_EVERY) % BELOW.length];
    delete h.stay; beginStay(h, 60, 'market'); if (t) t.opinion = 0;
    const out = { seen: [] };
    st.day += ((2 - st.day) % BELOW_EVERY + BELOW_EVERY) % BELOW_EVERY; out.off = lane();
    st.day += BELOW_EVERY - 1;  // a day that is 1 mod BELOW_EVERY
    for (let k = 0; k < 2; k++, st.day += BELOW_EVERY) {
      const key = turn(), p = portFolkPerson(planet, folk(key)), tag = lane();
      const seen = { key, label: tag && tag.label, first: p.first };
      G.dialog = null; tag.take(); seen.day = G.dialog.event.text; finishEvent();
      const op = p.opinion, mems = p.memories.length;
      openEvent(portWordEvent(folk(key), p, st)); seen.given = G.dialog.event.text; UI.act('choose', G.dialog.choices.findIndex(c => c.label === 'Leave them to it'));
      Object.assign(seen, { liked: p.opinion > op, memory: p.memories.slice(mems).join('|'), cleared: st.belowFor === undefined });
      seen.after = portWordEvent(folk(key), p, st).text === PORT_WORDS[key][st.day % 3].replace(/\{first\}/g, p.first);
      out.seen.push(seen);
    }
    st.day += BELOW_EVERY; out.again = [lane()]; st.day += BELOW_EVERY; out.again.push(lane());
    return out;
  });
  await done();
  assert.equal(r.off, null, 'not on the other days');
  assert.deepEqual(r.seen.map(x => x.key).sort(), ['keeper', 'repairer'], 'the two in turn');
  const want = { repairer: ['Down to see {first} (900 cr)', /under the flyover/, /By the kilo/, /seal supplier in Mushin/], keeper: ['Down to see {first} (900 cr)', /chest freezer/, /You saw my mother/, /mother in Ebute Metta/] };
  for (const x of r.seen) {
    const [label, day, given, memory] = want[x.key];
    assert.equal(x.label, label.replace('{first}', x.first)); assert.match(x.day, day); assert.match(x.given, given); assert.match(x.memory, memory);
    assert.deepEqual([x.liked, x.cleared, x.after], [true, true, true], `${x.key}: their regard, once, then their own words`);
  }
  assert.deepEqual(r.again, [null, null], 'each once');
  assert.deepEqual(errors, []);
});
