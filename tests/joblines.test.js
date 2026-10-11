'use strict';

// The text layer for the jobs a hired hand works on the station and further away (js/jobs.js, js/awayjobs.js; #457): a job has an id (`job:lock`, `away:package`) for its title
// and its blurb, and each stage one (`job:lock:0`) for its title, text and, for each choice, the label and the lines for a win and a lose. The odds, the pay and what a choice
// does are in code. The pin (tradepin.test.js) shows that the shipped words are as they were; this shows that the editor's words reach the player.

const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const { open, closeBrowser } = require('./helpers');

after(closeBrowser);

test('every title, blurb, text, label and line of every job is read: an override for each shows to the player, and what a choice does is the same', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 });
    while (G.dialog) finishEvent();
    const st = G.state, real = Math.random, seq = list => { const l = [...list]; Math.random = () => (l.length ? l.shift() : real()); };
    const out = { unread: [], differs: [], warned: [], seen: 0 };
    const ctx = { dest: 'Ironheart', from: 'Titan', who: 'Mrs. Adeyemi', system: 'Psyche', scale: 1.2 };
    const mark = (id, k) => `@@${id}|${k}@@`;
    const overrides = {};
    const lists = [['job', JOBS], ['away', AWAY]];
    for (const [pre, list] of lists) for (const job of list) {
      const eid = `${pre}:${job.id}`;
      overrides[eid] = { title: mark(eid, 'title'), text: mark(eid, 'text') };
      job.stages.forEach((stage, i) => {
        const sid = `${eid}:${i}`;
        overrides[sid] = { title: mark(sid, 'title'), text: mark(sid, 'text'), choices: Object.fromEntries(stage.choices.map((c, k) => [k, { label: mark(sid, `c${k}.label`), win: mark(sid, `c${k}.win`), ...(c.lose ? { lose: mark(sid, `c${k}.lose`) } : {}) }])) };
      });
    }
    const snap = JSON.stringify(G.state), warn = console.warn; console.warn = m => out.warned.push(m);
    const effect = () => ({ credits: G.state.credits, rep: JSON.stringify(G.state.rep), xp: JSON.stringify(hired().xp || {}) });
    const play = (job, i, k, roll) => {
      G.state = JSON.parse(snap); G.nextEvent = null; hired().post = job.stages[i].choices[k].when ? job.stages[i].choices[k].when.post : 'gunner';
      const ev = jobStage(job, i, ctx), c = ev.choices.find((x, n) => n === ev.choices.findIndex(y => y === x));
      const idx = job.stages[i].choices.filter(y => !y.when || hired().post === y.when.post).indexOf(job.stages[i].choices[k]);
      seq([roll, 0.3, 0.6]); const text = ev.choices[idx].run(); Math.random = real; G.nextEvent = null;
      return { text, label: String(ev.choices[idx].label), title: ev.title, stext: ev.text, e: effect() };
    };
    const base = {};
    for (const [pre, list] of lists) for (const job of list) job.stages.forEach((stage, i) => stage.choices.forEach((c, k) => { for (const roll of [0, 0.999]) base[`${pre}:${job.id}:${i}:${k}:${roll}`] = play(job, i, k, roll).e; }));
    useOverrides(overrides);
    console.warn = warn;
    for (const [pre, list] of lists) for (const job of list) {
      const eid = `${pre}:${job.id}`;
      if (jobTitle(job) !== mark(eid, 'title')) out.unread.push(`${eid} title`);
      if (jobBlurb(job) !== mark(eid, 'text')) out.unread.push(`${eid} text`);
      G.state = JSON.parse(snap);
      if (pre === 'job') { hired().board = { key: `${G.state.planet}@${G.state.day}`, ids: [job.id], done: false }; const html = jobsHtml(); for (const k of ['title', 'text']) if (!html.includes(mark(eid, k))) out.unread.push(`${eid} ${k} on the board`); }
      else { hired().away = [{ tpl: job.id, ctx, sid: 'mars', planet: 'Olympus Dome', days: 5, until: G.state.day + 20, pitched: null, booked: false }]; const html = awayHtml(); for (const k of ['title', 'text']) if (!html.includes(mark(eid, k))) out.unread.push(`${eid} ${k} on the page`); }
      job.stages.forEach((stage, i) => {
        const sid = `${eid}:${i}`;
        stage.choices.forEach((c, k) => {
          for (const roll of [0, 0.999]) {
            const p = play(job, i, k, roll);
            out.seen++;
            if (!p.title.includes(mark(sid, 'title'))) out.unread.push(`${sid} title`);
            if (!p.stext.includes(mark(sid, 'text'))) out.unread.push(`${sid} text`);
            if (!p.label.includes(mark(sid, `c${k}.label`))) out.unread.push(`${sid} c${k}.label`);
            const win = roll === 0 || !c.lose, want = mark(sid, win || !c.lose ? `c${k}.win` : `c${k}.lose`);
            if (!p.text.includes(want)) out.unread.push(`${sid} c${k}.${win ? 'win' : 'lose'}`);
            if (JSON.stringify(p.e) !== JSON.stringify(base[`${pre}:${job.id}:${i}:${k}:${roll}`])) out.differs.push(`${sid}:${k}:${roll}`);
          }
        });
      });
    }
    useOverrides({});
    return out;
  });
  await g.done();
  assert.deepEqual(r.warned, [], 'the game keeps every line');
  assert.ok(r.seen >= 60, `${r.seen} plays`);
  assert.deepEqual([...new Set(r.unread)], [], 'a line that the player never sees');
  assert.deepEqual(r.differs, [], 'what a choice does is the same');
});

test('a label and a title are plain (the page escapes them), a text and a line are escaped, and the blurb is escaped once', async () => {
  const g = await open({ scope: 'full' });
  const r = await g.ev(() => {
    startGame({ slot: 1, background: 'earth', captain: 'Sam Rowe', mode: 'hired', post: 'gunner', captainKey: 'hester', credits: 5000 });
    while (G.dialog) finishEvent();
    useOverrides({ 'job:lock': { title: 'Locks & <b>docks</b>', text: 'Stuck & <i>stuck</i>' }, 'job:lock:0': { text: 'Text <b>b</b> & more', choices: { 3: { label: 'Go <i>now</i>', win: 'Won <b>big</b> & tall' } } } });
    hired().board = { key: `${G.state.planet}@${G.state.day}`, ids: ['lock'], done: false };
    const ev = jobStage(JOBS.find(j => j.id === 'lock'), 0, {}), html = jobsHtml();
    hired().post = 'gunner';
    const c = ev.choices.find(x => /Go <i>now<\/i>/.test(x.label));
    const out = { title: ev.title, text: ev.text, label: c && c.label, html };
    useOverrides({});
    return out;
  });
  await g.done();
  assert.equal(r.title, 'Locks & <b>docks</b>', 'a title is left to the page to escape');
  assert.equal(r.text, 'Text &lt;b&gt;b&lt;/b&gt; &amp; more');
  assert.ok(r.label.startsWith('Go <i>now</i>'), 'a label is plain, with the odds after it');
  assert.ok(r.html.includes('Locks &amp; &lt;b&gt;docks&lt;/b&gt;') && r.html.includes('Stuck &amp; &lt;i&gt;stuck&lt;/i&gt;') && !r.html.includes('&amp;amp;'), 'the board escapes the title and the blurb once');
});
