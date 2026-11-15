'use strict';

// Going down to Lagos (#1162, docs/bible/ports.md): at the Ring, in a captain's wait, the hand takes the spaceplane down for a day from their savings,
// once a day, and plays a day down: a lane's line taken in turn by the day.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('a day down: offered at the Ring in a captain\'s wait only, the fare from the hand\'s savings, once a day, a lane\'s line by the day, and again after the night (#1162)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), row = () => { UI.tab = 'port'; UI.render(); const b = document.querySelector('button[data-action="goDown"]'); return b && { label: b.textContent, shut: b.disabled, hint: (b.parentElement.querySelector('.hint') || {}).textContent || '' }; };
    const out = { noStay: row() };
    delete h.stay; beginStay(h, 3, 'market'); st.credits = 2000; st.belowSeen = BELOW.slice();  // the lanes into lives below are their own test
    out.open = row();
    Mods.act('goDown');
    out.scene = { title: G.dialog.event.title, labels: G.dialog.choices.map(c => c.label), credits: st.credits };
    UI.act('choose', 1); out.line = document.getElementById('event-result').textContent; out.want = sceneSay('scene:day-down', `market.${st.day % 3}`); finishEvent();
    out.spent = row();
    Mods.act('goDown'); out.twice = !!G.dialog;
    Mods.act('night'); while (G.dialog) finishEvent(); out.passed = st.day; if (!stayOf(h)) beginStay(h, 2, 'market'); out.morning = row();  // a shipper may have come in the night (stay.js); the wait goes on here
    st.credits = 100; out.poor = row();
    st.systemId = 'mars'; st.planet = 'Mars'; UI.planet = currentPlanet(); beginStay(h, 3, 'market'); out.mars = row();
    return out;
  });
  await done();
  assert.equal(r.noStay, null, 'no wait, no trip: the ship sails when the captain says');
  assert.deepEqual(r.open, { label: 'Go down to Lagos (900 cr)', shut: false, hint: '' });
  assert.deepEqual(r.scene, { title: 'A Day Down', labels: ['Walk the arcology\'s tiers', 'Cross the lagoon to the mainland market', 'Wait it out in the departure hall', 'Look for work'], credits: 1100 });
  assert.equal(r.line, r.want, 'the lane\'s line of the day');
  assert.deepEqual([r.spent.shut, r.spent.hint, r.twice], [true, 'You\'ve been down today.', false], 'once a day');
  assert.deepEqual([r.morning.shut, r.morning.hint], [false, ''], 'the next day, again');
  assert.equal(r.poor.shut, true); assert.match(r.poor.hint, /this costs 900 cr/);
  assert.equal(r.mars, null, 'Lagos is under the Ring, not under Mars');
  assert.deepEqual(errors, []);
});

test('Tomas\'s parcel: when he trusts the hand, going down starts with him at the lift; taken, the day is at his parents\' table and what you tell them is his regard and a memory, and not again for a while; not taken, the day down goes on and he asks next time (#1162)', async () => {
  const { ev, errors, done } = await open();
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const st = G.state, h = hired(), t = tomasAboard(), go = () => { delete h.downDay; st.credits = 5000; Mods.act('goDown'); return G.dialog && G.dialog.event.title; };
    delete h.stay; beginStay(h, 9, 'market');
    const out = { tomas: !!t };
    t.opinion = OPINION.TRUSTED - 1; out.cold = go(); finishEvent();
    t.opinion = OPINION.TRUSTED; out.ask = go();
    UI.act('choose', 1); out.declined = G.dialog.event.title; finishEvent();
    out.again = go();
    UI.act('choose', 0); out.table = G.dialog.event.title;
    const before = t.opinion, mems = t.memories.length;
    UI.act('choose', 1); out.result = document.getElementById('event-result').textContent; finishEvent();
    while (G.dialog) finishEvent();
    out.liked = t.opinion > before; out.memory = t.memories.slice(mems).join(' | ');
    st.day += 1; out.soon = go(); finishEvent();
    st.day += VISIT_GAP; out.later = go();
    return out;
  });
  await done();
  assert.equal(r.tomas, true, 'Tomas is aboard in the Earth start');
  assert.equal(r.cold, 'A Day Down', 'not trusted yet: the day down');
  assert.equal(r.ask, 'Tomas\'s Parcel');
  assert.equal(r.declined, 'A Day Down', 'not this time: the day down goes on'); assert.equal(r.again, 'Tomas\'s Parcel', 'and he asks again next time');
  assert.equal(r.table, 'Emeka and Chioma');
  assert.match(r.result, /He was like that at ten/); assert.equal(r.liked, true); assert.match(r.memory, /You told his parents he misses the ring/);
  assert.equal(r.soon, 'A Day Down', 'not again so soon'); assert.equal(r.later, 'Tomas\'s Parcel', 'and again after a while');
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
      Mods.act('goDown'); UI.act('choose', G.dialog.choices.findIndex(c => c.label === 'Look for work'));
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
    const labels = () => G.dialog.choices.map(c => c.label), go = () => { delete h.downDay; Mods.act('goDown'); };
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
    t.opinion = OPINION.TRUSTED; delete t.parentsAt; go(); UI.act('choose', 0); UI.act('choose', 0); finishEvent();
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
    const st = G.state, h = hired(), planet = currentPlanet(), t = tomasAboard(), go = () => { delete h.downDay; st.credits = 5000; Mods.act('goDown'); };
    const word = key => { const f = portLayout(planet, st).folk.find(x => x.key === key); return f && portWordEvent(f, portFolkPerson(planet, f), st); };
    const mention = () => word('clerk').choices.findIndex(c => c.label === 'Mention the woman from Surulere');
    delete h.stay; beginStay(h, 30, 'market'); if (t) t.opinion = 0;
    const out = { before: mention() };
    st.day += (4 - st.day % 3) % 3 + 1; go(); UI.act('choose', 1); finishEvent(); out.notHer = !!st.metSeller;  // a day the market is Yaba
    st.day += 3 - st.day % 3; go(); UI.act('choose', 1); out.market = document.getElementById('event-result').textContent; finishEvent(); out.met = !!st.metSeller;
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
    const st = G.state, h = hired(), planet = currentPlanet(), t = tomasAboard(), go = () => { delete h.downDay; st.credits = 5000; Mods.act('goDown'); };
    const land = () => { while (G.dialog) finishEvent(); Mods.emit('landed', planet); const titles = []; while (G.dialog) { titles.push(G.dialog.event.title); finishEvent(); } return titles.includes('The Boy from Yaba'); };
    delete h.stay; beginStay(h, 30, 'market'); if (t) t.opinion = 0;
    const out = { before: land() };
    st.day += (2 - st.day % 3 + 3) % 3; go(); UI.act('choose', 1); out.market = document.getElementById('event-result').textContent; finishEvent(); out.met = st.metBoy === st.day;
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
    const lane = () => { delete h.downDay; st.credits = 5000; Mods.act('goDown'); const c = G.dialog.choices, i = c.length - 1; return /Mushin|Ebute Metta/.test(c[i].label) ? i : -1; };
    const turn = () => BELOW[Math.floor(st.day / BELOW_EVERY) % BELOW.length];
    delete h.stay; beginStay(h, 60, 'market'); if (t) t.opinion = 0;
    const out = { seen: [] };
    st.day += ((2 - st.day) % BELOW_EVERY + BELOW_EVERY) % BELOW_EVERY; out.off = lane(); finishEvent();
    st.day += BELOW_EVERY - 1;  // a day that is 1 mod BELOW_EVERY
    for (let k = 0; k < 2; k++, st.day += BELOW_EVERY) {
      const key = turn(), p = portFolkPerson(planet, folk(key)), i = lane();
      const seen = { key, label: i >= 0 && G.dialog.choices[i].label, first: p.first };
      UI.act('choose', i); seen.day = document.getElementById('event-result').textContent; finishEvent();
      const op = p.opinion, mems = p.memories.length;
      openEvent(portWordEvent(folk(key), p, st)); seen.given = G.dialog.event.text; UI.act('choose', G.dialog.choices.findIndex(c => c.label === 'Leave them to it'));
      Object.assign(seen, { liked: p.opinion > op, memory: p.memories.slice(mems).join('|'), cleared: st.belowFor === undefined });
      seen.after = portWordEvent(folk(key), p, st).text === PORT_WORDS[key][st.day % 3].replace(/\{first\}/g, p.first);
      out.seen.push(seen);
    }
    st.day += BELOW_EVERY; out.again = [lane()]; finishEvent(); st.day += BELOW_EVERY; out.again.push(lane()); finishEvent();
    return out;
  });
  await done();
  assert.equal(r.off, -1, 'not on the other days');
  assert.deepEqual(r.seen.map(x => x.key).sort(), ['keeper', 'repairer'], 'the two in turn');
  const want = { repairer: ['Find {first}\'s seal supplier in Mushin', /under the flyover/, /By the kilo/, /seal supplier in Mushin/], keeper: ['Visit {first}\'s mother in Ebute Metta', /chest freezer/, /You saw my mother/, /mother in Ebute Metta/] };
  for (const x of r.seen) {
    const [label, day, given, memory] = want[x.key];
    assert.equal(x.label, label.replace('{first}', x.first)); assert.match(x.day, day); assert.match(x.given, given); assert.match(x.memory, memory);
    assert.deepEqual([x.liked, x.cleared, x.after], [true, true, true], `${x.key}: their regard, once, then their own words`);
  }
  assert.deepEqual(r.again, [-1, -1], 'each once');
  assert.deepEqual(errors, []);
});
