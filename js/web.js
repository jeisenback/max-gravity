'use strict';

// The Bonds tab (under Interior): who aboard gets on with whom, as a web. Everyone aboard stands on a ring, and a line joins two
// people with a bond between them: green for friends, orange for rivals, thicker the stronger it is. The bonds are the ones
// js/social.js keeps (they grow and fray a day at a time); this only draws them.

const WEB_COLORS = { good: '#5fd35f', bad: '#ff8a3c' };

// Where each of n people stands: spread round an ellipse in the 640 by 300 plot, starting at the top.
const webSpots = n => Array.from({ length: n }, (_, i) => {
  const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
  return [320 + Math.cos(a) * 230, 150 + Math.sin(a) * 100];
});

// The ties worth drawing (a word for them exists), strongest first.
function webTies(list) {
  return pairs(list).map(([a, b]) => ({ a, b, n: bond(a.p, b.p) })).filter(t => bondWord(t.n)).sort((x, y) => Math.abs(y.n) - Math.abs(x.n));
}

function webSvg(list) {
  const spots = webSpots(list.length), at = new Map(list.map((f, i) => [f.id, spots[i]]));
  const lines = webTies(list).map(({ a, b, n }) => {
    const [x1, y1] = at.get(a.id), [x2, y2] = at.get(b.id);
    return `<line data-tie="${esc(a.id)}|${esc(b.id)}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${n > 0 ? WEB_COLORS.good : WEB_COLORS.bad}" stroke-width="${(1 + Math.abs(n) / 2).toFixed(1)}" opacity="${(0.35 + Math.abs(n) / 16).toFixed(2)}"/>`;
  }).join('');
  const nodes = list.map((f, i) => {
    const [x, y] = spots[i], ring = moodLow(f.p) ? '#ff9a3c' : '#6fb0ff', below = y > 150 ? 32 : -24;
    return `<g data-action="person" data-arg="${esc(f.id)}" class="web-node" role="button"><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="16" fill="#12202f" stroke="${ring}" stroke-width="3"${f.crew ? '' : ' stroke-dasharray="4 3"'}/><text x="${x.toFixed(1)}" y="${(y + 5).toFixed(1)}" fill="#d4e4f5" font-size="13" text-anchor="middle">${esc((f.p.first || '?')[0])}</text><text x="${x.toFixed(1)}" y="${(y + below).toFixed(1)}" fill="#9ab" font-size="11" text-anchor="middle">${esc(f.p.first)}</text></g>`;
  }).join('');
  return `<svg class="con-plant" viewBox="0 0 640 300" role="img" aria-label="Who aboard gets on with whom"><rect width="640" height="300" fill="#050a11"/>${lines}${nodes}<text x="14" y="24" fill="#7f95ab" font-size="11" letter-spacing="2">BONDS</text></svg>`;
}

const webLink = p => `<button class="link" data-action="person" data-arg="${esc(p.id)}">${esc(p.first)}</button>`;

UI.views.web = function () {
  const list = folk(), ties = webTies(list);
  const strongest = ties.length
    ? ties.slice(0, 8).map(t => conRead(`${webLink(t.a.p)} and ${webLink(t.b.p)}`, bondWord(t.n))).join('')
    : '<p class="hint">Nobody aboard has strong feelings about anyone else yet. Bonds grow as people share days.</p>';
  return consoleHtml({
    title: 'Bonds',
    status: `${list.length} aboard`,
    screen: webSvg(list),
    side: conCard('Strongest ties', strongest) + conCard('Reading the web', `<div class="hint"><span style="color:${WEB_COLORS.good}">Green</span> lines join friends, <span style="color:${WEB_COLORS.bad}">orange</span> lines join rivals; thicker is stronger. An orange ring is someone having a hard time. Click a name to open them.</div>`),
  });
};
