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
