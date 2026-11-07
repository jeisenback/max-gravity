'use strict';

// View helpers (the ship interface, step 3, #321): a tagged template that escapes what it prints, and four helpers on it. A page
// built with them gets escaping by construction instead of a separate pass. h`<b>${name}</b>` escapes `name`; raw(markup) marks a
// string that is already trusted HTML (scene text, entities such as &middot;, SVG); an array is joined, each element by the same
// rule; null, undefined and false print nothing. A helper's result is itself raw, so helpers nest, and it converts to its string in
// a template literal. Loaded after ui.js (it uses esc, personLink and portraitSvg at call time only).

const raw = s => ({ isRaw: true, html: String(s), toString() { return this.html; } });
const viewText = v => (v === null || v === undefined || v === false ? '' : Array.isArray(v) ? v.map(viewText).join('') : v && v.isRaw ? v.html : esc(v));
const h = (strings, ...values) => raw(strings.reduce((out, s, i) => out + s + (i < values.length ? viewText(values[i]) : ''), ''));

// A heading block: an optional eyebrow, an optional <h3>, then the body.
const panelHtml = ({ eyebrow, title, body }) => h`${eyebrow ? h`<div class="eyebrow">${eyebrow}</div>` : ''}${title ? h`<h3>${title}</h3>` : ''}${body}`;

// A list: one row per item, each built by `row(item, i)` (use h). An empty list prints nothing.
const listHtml = (items, row) => raw(items.map((item, i) => viewText(row(item, i))).join(''));

// A person's row, as the Crew page draws it: the face, the name as a link to their screen, a line under it, and the buttons. The
// whitespace is the Crew page's own, so the page keeps its markup exactly (tests/fixtures/crew.html).
const personCardHtml = (person, { sub, actions, ring } = {}) => h`<div class="mission">
          <div class="crew-face ${ring || ''}">${raw(portraitSvg(person))}</div>
          <div><b>${raw(personLink(person))}</b>${sub}</div>
          ${actions}
        </div>`;

// A choice's button; shut, it says why as text (gates.js). The label and the reason are text, so they are escaped.
// A label that ends in a cost note (costNote, js/engagements.js: " [Pilot, 53%; if it fails: ...]") is two lines: the label, then the note as a
// readout under it, its odds toned by the condition thresholds (condColor, js/console.js). A prefix in brackets ("[Gunner] ...") is part of the
// label. The button's text is the whole label either way (#689).
const choiceTone = pct => (pct >= 70 ? 'good' : pct >= 40 ? 'warn' : 'bad');
const choiceLabelHtml = label => {
  const m = /^(.*\S)(\s*)(\[[^\[\]]*\])$/s.exec(label);
  if (!m) return label;
  const [, pick, gap, note] = m, odds = /^(.*?)(\d+)%(.*)$/s.exec(note);
  return h`<span class="pick">${pick}${gap}</span><span class="odds">${odds ? h`${odds[1]}<b class="${choiceTone(+odds[2])}">${odds[2]}%</b>${odds[3]}` : note}</span>`;
};
const choiceButtonHtml = (c, i) => {
  const shut = c.can && !c.can(), why = shut && (typeof c.why === 'function' ? c.why() : c.why);
  const mark = c.primary ? raw('class="primary" ') : c.on ? raw('class="on" aria-pressed="true" ') : c.row ? raw('aria-pressed="false" ') : '';  // on: the one picked in its row
  return h`<button data-action="choose" data-arg="${i}" ${mark}${shut ? 'disabled' : ''}>${choiceLabelHtml(c.label)}</button>${why ? h`<div class="hint why">${why}</div>` : ''}`;  // primary: the one that ends the turn
};
// A scene's choices, as the dialog draws them. `only` keeps some of them, each at its own index, in a block of class `cls` (#846: a fight's orders flow with the
// scene and only its Fire is pinned). A choice with a `group` opens a labelled run of them; choices next to each other with the same `row` are one row of
// buttons under the first one's `rowLabel` (a gun's targets, #916).
const choiceBlockHtml = (choices, only = null, cls = 'choices') => {
  const out = [];
  choices.forEach((c, i) => {
    if (only && !only(c)) return;
    const head = c.group ? h`<div class="group">${c.group}</div>` : '', last = out[out.length - 1];
    if (c.row && last && last.row === c.row) last.buttons.push(choiceButtonHtml(c, i));
    else out.push({ row: c.row, head, label: c.rowLabel, buttons: [choiceButtonHtml(c, i)] });
  });
  return h`<div class="${cls}">${out.map(r => (r.row ? h`${r.head}<div class="choice-row" role="group" aria-label="${r.label}"><span class="row-label">${r.label}</span><span class="row-picks">${r.buttons}</span></div>` : h`${r.head}${r.buttons}`))}</div>`;
};
