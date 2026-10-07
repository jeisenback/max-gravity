'use strict';

// The view helpers (js/views.js, ship interface step 3, #321): a tagged template that escapes what it prints, and the helpers on it.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('h escapes data and passes raw and nested h through', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => ({
    data: String(h`<b>${'<i>&"'}</b>`),
    raw: String(h`${raw('<i>x</i>')}`),
    nested: String(h`${h`<u>${'<'}</u>`}`),
    inTemplate: `a${h`<b>${'&'}</b>`}z`,
  }));
  assert.equal(r.data, '<b>&lt;i&gt;&amp;&quot;</b>');
  assert.equal(r.raw, '<i>x</i>');
  assert.equal(r.nested, '<u>&lt;</u>');
  assert.equal(r.inTemplate, 'a<b>&amp;</b>z', 'a result converts to its string inside a template literal');
  await done();
});

test('h joins arrays and prints nothing for null, undefined and false', async () => {
  const { ev, done } = await open({});
  const r = await ev(() => ({
    list: String(h`${['<a>', raw('<b>')]}`),
    nothing: String(h`[${null}${undefined}${false}${[]}]`),
    numbers: String(h`${0}|${12}`),
  }));
  assert.equal(r.list, '&lt;a&gt;<b>');
  assert.equal(r.nothing, '[]');
  assert.equal(r.numbers, '0|12');
  await done();
});

test('panelHtml, listHtml, personCardHtml and choiceBlockHtml escape what they are given', async () => {
  const { ev, done } = await open({ scope: 'earth-hired' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    const box = document.createElement('div'), p = person(G.state.crew[0]);
    p.first = 'Kay "Q"'; p.last = '<b>x';
    box.innerHTML = [
      panelHtml({ eyebrow: '<em>e</em>', title: '<script>', body: raw('<p>body</p>') }),
      listHtml(['<i>', 'two'], item => h`<li>${item}</li>`),
      personCardHtml(p, { sub: 'a <u>line</u>', actions: raw('<button data-action="x">Go</button>'), ring: 'warn' }),
      choiceBlockHtml([{ label: '<i>pick</i>', run() {} }, { label: 'shut', can: () => false, why: 'because <b>' }]),
    ].join('');
    const card = box.querySelector('.mission'), link = card.querySelector('button.link');
    return {
      eyebrow: box.querySelector('.eyebrow').textContent, title: box.querySelector('h3').textContent, body: !!box.querySelector('p'),
      items: [...box.querySelectorAll('li')].map(li => li.textContent), injected: box.querySelectorAll('script, em, i, u').length + box.querySelectorAll('.choices b, .hint.why b, h3 b, .mission b b').length,
      link: { text: link.textContent, action: link.dataset.action, arg: link.dataset.arg, id: p.id }, sub: card.textContent.includes('a <u>line</u>'),
      face: !!card.querySelector('.crew-face.warn svg'), go: !!card.querySelector('button[data-action=x]'),
      choices: [...box.querySelectorAll('.choices button')].map(b => ({ text: b.textContent, arg: b.dataset.arg, off: b.disabled })), why: box.querySelector('.hint.why').textContent,
    };
  });
  assert.equal(r.eyebrow, '<em>e</em>'); assert.equal(r.title, '<script>'); assert.ok(r.body, 'the body is raw');
  assert.deepEqual(r.items, ['<i>', 'two']);
  assert.equal(r.injected, 0, 'nothing a name or label carried became an element');
  assert.deepEqual(r.link, { text: 'Kay "Q" <b>x', action: 'person', arg: r.link.id, id: r.link.id });
  assert.ok(r.sub && r.face && r.go);
  assert.deepEqual(r.choices, [{ text: '<i>pick</i>', arg: '0', off: false }, { text: 'shut', arg: '1', off: true }]);
  assert.equal(r.why, 'because <b>');
  await done();
});

test('no template in js/ has an inline handler, and data-select selects', async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(files.length > 50, 'the scripts are listed');
  const offenders = [];
  for (const f of files) {
    const text = fs.readFileSync(f, 'utf8').split('\n').filter(l => !/^\s*\/\//.test(l)).join('\n');
    if (/\son(click|mouse[a-z]*|error|load|change|input|focus|blur|key[a-z]*|submit)\s*=\s*\\?["']/.test(text)) offenders.push(f);
  }
  assert.deepEqual(offenders, [], 'inline handlers (the Content Security Policy forbids them)');
  const { page, ev, done } = await open({});
  await ev(() => { const input = document.createElement('input'); input.id = 'sel'; input.value = 'a code to copy'; input.setAttribute('data-select', ''); document.body.appendChild(input); });
  await page.click('#sel');
  assert.equal(await ev(() => { const el = document.getElementById('sel'); return el.value.slice(el.selectionStart, el.selectionEnd); }), 'a code to copy');
  await done();
});

// ---------- hostile data (#321, #251) ----------

// Two hostile strings: one that breaks out of an attribute, one that is a tag. They go straight into the state, past the cleaning
// on the way in (cleanName, stripTags), as if an import or a mod had missed a field: the templates must hold on their own.
const HOSTILE_A = 'x" onmouseover="alert(1)', HOSTILE_B = '<img src=x onerror="window.pwned=1">';

const hostileGame = ([HOSTILE_A, HOSTILE_B]) => {
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
  const st = G.state; st.tutorial = null; st.story.next = 1e9;
  const crew = person(st.crew.find(id => !person(id).cast));
  Object.assign(crew, { first: 'Kay' + HOSTILE_A, last: HOSTILE_B, home: HOSTILE_A });
  const stranger = registerPerson(Object.assign(makePerson(), { first: HOSTILE_A, last: HOSTILE_B, opinion: 2, location: HOSTILE_A }));
  stranger.memories.push(`Day 1: ${HOSTILE_B}`);
  const patron = registerPerson(Object.assign(makePerson(), { first: HOSTILE_A, last: HOSTILE_B, opinion: 2, location: st.planet }));  // at the bar tonight
  patron.memories.push(`Day 1: ${HOSTILE_B}`); G.patrons = null;  // the bar is filled again on the next look
  captain().name = HOSTILE_A + HOSTILE_B;
  home().name = HOSTILE_A + HOSTILE_B;
  st.journal = [{ day: 1, text: HOSTILE_A + HOSTILE_B }];
  return crew.id;
};

// What the page must not contain: an element or attribute the hostile strings could have made.
const injected = () => ({
  elements: document.querySelectorAll('#panel img, #panel script, #panel iframe').length,
  attrs: [...document.querySelectorAll('#panel *')].filter(el => [...el.attributes].some(a => /^on/i.test(a.name))).map(el => el.tagName.toLowerCase()),
  pwned: !!window.pwned,
});

test('a hostile name breaks no rail page, the scene dialog or the menu', async () => {
  const { page, ev, done } = await open({ scope: 'earth-hired', shell: 'default' });
  await page.evaluate(`window.injected = ${injected.toString()}`);
  await ev(hostileGame, [HOSTILE_A, HOSTILE_B]);
  const tabs = await ev(() => { UI.tab = 'port'; UI.render(); return [...document.querySelectorAll('.rail button:not([disabled])')].map(b => b.dataset.arg); });
  const failures = [];
  for (const tab of tabs) {
    await page.click(`.rail [data-action=tab][data-arg=${tab}]`);
    const r = await ev(() => injected());
    if (r.elements || r.attrs.length || r.pwned) failures.push(`${tab}: ${JSON.stringify(r)}`);
  }
  assert.ok(await ev(() => { UI.tab = 'bar'; UI.render(); return /Tonight/.test(document.getElementById('panel').textContent) && G.patrons.some(x => x.p.first.includes('onmouseover')); }), 'a hostile patron is at the bar');
  // the Crew page shows the hostile name as literal text
  await page.click('.rail [data-action=tab][data-arg=crew]');
  assert.ok((await ev(() => document.getElementById('panel').textContent)).includes(HOSTILE_A), 'the name is on the Crew page as text');
  // a scene whose title and text carry the name, and the menu
  await ev(([a, b]) => openEvent({ title: `The ${a}`, text: `${a} says hello.`, choices: [{ label: `Ask ${a}`, run: () => `${a} nods.` }] }), [HOSTILE_A, HOSTILE_B]);
  const scene = await ev(() => ({ ...injected(), label: document.querySelector('.event-body').getAttribute('aria-label') }));
  if (scene.elements || scene.attrs.length || scene.pwned) failures.push(`scene: ${JSON.stringify(scene)}`);
  assert.equal(scene.label, `The ${HOSTILE_A}`, 'the dialog label is the title, as text');
  await ev(() => { while (G.dialog) finishEvent(); Menu.pause(); Menu.view = 'load'; Menu.render(); });
  const menu = await ev(() => injected());
  if (menu.elements || menu.attrs.length || menu.pwned) failures.push(`menu: ${JSON.stringify(menu)}`);
  assert.deepEqual(failures, [], 'the pages a hostile name reaches');
  await done();
});

// ---------- golden markup: the pages keep their markup as they move onto the helpers (#321) ----------

// An ordinary seeded hired game, no hostile data: the page's markup is the same every run. UPDATE_GOLDEN=1 rewrites the fixtures (do it
// in the same commit as any intended change to what a page says).
const ordinaryGame = () => {
  startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
  const st = G.state; st.tutorial = null; st.story.next = 1e9;
};

for (const tab of ['crew', 'bar']) {
  test(`the ${tab} page renders the golden markup for an ordinary game`, async () => {
    const { page, ev, done } = await open({ scope: 'earth-hired', shell: 'default' });
    await ev(ordinaryGame);
    await page.click(`.rail [data-action=tab][data-arg=${tab}]`);
    const html = await ev(() => document.querySelector('.shell .body').innerHTML);
    const file = `tests/fixtures/${tab}.html`;
    if (process.env.UPDATE_GOLDEN) fs.writeFileSync(file, html + '\n');
    assert.equal(html + '\n', fs.readFileSync(file, 'utf8'), `${tab}: the markup changed (UPDATE_GOLDEN=1 rewrites ${file})`);
    await done();
  });
}

// ---------- the scene dialog on the helpers (#321) ----------

test('no authored event title or choice label carries markup or an entity', async () => {
  const html = fs.readFileSync('index.html', 'utf8');
  const files = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  const offenders = [];
  for (const f of files) {
    for (const [n, line] of fs.readFileSync(f, 'utf8').split('\n').entries()) {
      for (const m of line.matchAll(/\b(title|label):\s*[`'"]([^`'"]*)/g)) if (/<[a-z/]|&[a-z#0-9]+;/i.test(m[2])) offenders.push(`${f}:${n + 1} ${m[1]}: ${m[2].slice(0, 50)}`);
    }
  }
  assert.deepEqual(offenders, [], 'a title or label with markup would show literally once it is escaped');
});

test('the scene dialog escapes the title and the aria-label, leaves the text raw, and shows a shut choice with its reason', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', shell: 'default' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    openEvent({ title: 'A <b>', text: 'Some <i>text</i> &middot; more.', choices: [{ label: 'Pay <up>', ...gated(needCr(1e9)), run: () => 'ok' }, { label: 'Leave', run: () => 'ok' }] });
    const body = document.querySelector('.event-body'), shut = body.querySelector('button[disabled]');
    return {
      heading: body.querySelector('h1').textContent, headingEls: body.querySelectorAll('h1 b').length, label: body.getAttribute('aria-label'),
      italic: !!body.querySelector('p i'), entity: body.querySelector('p').textContent.includes('·'),
      shut: shut && shut.textContent, why: (body.querySelector('.hint.why') || {}).textContent, buttons: body.querySelectorAll('.choices button').length,
    };
  });
  assert.equal(r.heading, 'A <b>'); assert.equal(r.headingEls, 0); assert.equal(r.label, 'A <b>');
  assert.ok(r.italic, 'the text keeps its markup'); assert.ok(r.entity, 'and its entities');
  assert.equal(r.shut, 'Pay <up>'); assert.ok(r.why && r.why.length > 3, `the shut choice says why: ${r.why}`); assert.equal(r.buttons, 2);
  await done();
});

test('the result screen escapes its title and keeps its text raw', async () => {
  const { ev, done } = await open({ scope: 'earth-hired', shell: 'default' });
  const r = await ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester' }); while (G.dialog) finishEvent();
    UI.showEventResult('Done <b>', 'It went <i>well</i>.', []);
    const body = document.querySelector('.event-body');
    return { heading: body.querySelector('h1').textContent, bold: body.querySelectorAll('h1 b').length, italic: !!body.querySelector('p i') };
  });
  assert.deepEqual(r, { heading: 'Done <b>', bold: 0, italic: true });
  await done();
});
