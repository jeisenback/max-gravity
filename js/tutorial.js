'use strict';

// The first-run tutorial: a guided Earth-to-Mars electronics run. Each step names
// one thing to do and advances on its own once it is done. State is st.tutorial
// (the step index, or null when finished or skipped; older saves have none).
// Loaded before game.js; only calls into it at runtime.

const tutKey = (touch, keyboard) => (Touch.on ? touch : keyboard);

const TUTORIAL = [
  { text: () => 'Open the Exchange tab and buy Electronics with Max. Earth makes them cheap; Mars pays well.',
    done: st => (st.cargo.equipment || 0) > 0 },
  { text: () => `Take off${tutKey('', ' (T)')}.`,
    done: () => G.mode === 'flight' },
  { text: () => tutKey('Drag the joystick toward where you want to fly. Push it far out to thrust; hold BRAKE to turn around.',
    'Turn with Left and Right, thrust with Up. Down turns you around to brake.'),
    done: () => G.tutThrust > 1.5 },
  { text: () => `Open the system map (${tutKey('Map', 'M')}) and ${tutKey('tap', 'click')} Mars to plot a burn.`,
    done: st => !!(st.dest || G.transit) },
  { text: () => `Fly well clear of Earth, then start the burn (${tutKey('Burn', 'J')}).`,
    done: () => !!G.transit },
  { text: () => 'The burn takes days of ship time. Answer anything that comes up on the way.',
    done: st => st.day > 1 && !G.transit },
  { text: () => `${tutKey('Tap Land', 'Press L')} to pick Mars, fly onto it, slow down, and ${tutKey('tap Land', 'press L')} again.`,
    done: () => G.mode === 'landed' },
  { text: () => 'Open the Exchange and sell your Electronics.',
    done: st => G.mode === 'landed' && !st.cargo.equipment },
  { text: () => `That is the trade loop. The Missions tab pays for deliveries and passengers, and the Port tab tracks your standing with each faction. Before you head into the Belt, where pirates fly heavier ships, fit a Point-defense cannon at an outfitter. If you are outgunned, hail the pirate (${tutKey('Hail', 'H')}) and pay them off. Good luck, captain.`,
    done: () => false, last: true },
];

const tutorialOn = () => G.state.tutorial != null;

// Called every frame. Advances past finished steps and refreshes the port screen.
function tutorialTick(dt) {
  const st = G.state;
  if (!tutorialOn()) return;
  if (G.mode === 'flight' && G.player && G.player.thrusting) G.tutThrust = (G.tutThrust || 0) + dt;
  const before = st.tutorial;
  while (st.tutorial < TUTORIAL.length && TUTORIAL[st.tutorial].done(st)) st.tutorial++;
  if (st.tutorial === before) return;
  Sfx.comms();
  if (G.mode === 'landed' && !G.dialog) UI.render();
}

function endTutorial() {
  G.state.tutorial = null;
  save();
}

// The banner at the top of the port screen.
function tutorialHtml() {
  if (!tutorialOn()) return '';
  const i = G.state.tutorial, step = TUTORIAL[i];
  return `
    <div class="tutorial">
      <div>
        <div class="eyebrow">${step.last ? 'Tutorial complete' : `Tutorial &middot; step ${i + 1} of ${TUTORIAL.length - 1}`}</div>
        <p>${step.text()}</p>
      </div>
      <button data-action="tutorial">${step.last ? 'Got it' : 'Skip'}</button>
    </div>`;
}

// The same prompt over the flight view, transit, and the map.
function drawTutorial(viewW) {
  if (!tutorialOn() || !['flight', 'departing', 'transit', 'map'].includes(G.mode)) return;
  const i = G.state.tutorial, step = TUTORIAL[i];
  if (step.last) return;
  const w = Math.min(viewW - 24, 440);
  const x = G.mode === 'map' && G.hudW ? viewW - w - 16 : (viewW - w) / 2;  // desktop map: clear of the orbits
  ctx.font = '13px "IBM Plex Mono", monospace';
  const lines = wrapText(step.text(), w - 28), h = 34 + lines.length * 17;
  // Clear of the map legend, the transit title, and the compact phone HUD.
  const y = G.mode === 'map' ? G.H - 150 : G.mode === 'transit' ? G.H - h - 80 : G.hudW ? 16 : 104;
  ctx.fillStyle = 'rgba(8,16,24,0.9)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = '#6fb0ff';
  ctx.fillRect(x, y, 3, h);
  ctx.textAlign = 'left';
  hudLabel(`Tutorial ${i + 1}/${TUTORIAL.length - 1}`, x + 14, y + 18, '#6fb0ff');
  ctx.font = '13px "IBM Plex Mono", monospace';
  ctx.fillStyle = '#d4e4f5';
  lines.forEach((l, n) => ctx.fillText(l, x + 14, y + 38 + n * 17));
}

Mods.register({
  id: 'tutorial', name: 'Tutorial', builtin: true,
  init(M) {
    M.on('frame', tutorialTick);
    M.on('drawOverlay', drawTutorial);
    M.filter('portBanner', html => html + tutorialHtml());
    M.action('tutorial', endTutorial);
  },
});
