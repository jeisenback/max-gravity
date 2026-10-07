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
const choiceButtonHtml = (c, i) => {
  const shut = c.can && !c.can(), why = shut && (typeof c.why === 'function' ? c.why() : c.why);
  return h`<button data-action="choose" data-arg="${i}" ${shut ? 'disabled' : ''}>${c.label}</button>${why ? h`<div class="hint why">${why}</div>` : ''}`;
};
// A scene's choices, as the dialog draws them.
const choiceBlockHtml = choices => h`<div class="choices">${choices.map((c, i) => choiceButtonHtml(c, i))}</div>`;
