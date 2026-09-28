'use strict';

// Example mod: adds Vesta, a Belt Collective mining rock, with its own trade good,
// an outfit, a transit event, and a small bounty program. Enable it by uncommenting
// its script tag in index.html. Copy this file as a starting point for your own mod.

Mods.register({
  id: 'example-vesta',
  name: 'Vesta Mining Concern',
  version: '1.0',
  init(M) {
    // A new trade good. Only markets that list it in `prices` trade it.
    M.addCommodity({ id: 'basalt', name: 'Vesta Basalt', base: 260 });

    // A new location. `au` and `angle` place it on the system map; the art falls
    // back to a generic moon for bodies the game has no custom art for.
    M.addSystem('vesta', {
      name: 'Vesta', au: 2.36, angle: 290, gov: 'Belt Collective', pirates: 0.25,
      planets: [
        { name: 'Vesta Deep Mine', x: 60, y: 40, r: 55, color: '#9c8f7a',
          services: ['trade', 'missions', 'outfitter', 'refuel'],
          prices: { basalt: 'L', water: 'H', food: 'H', industrial: 'H', metal: 'L' },
          desc: 'A shaft sunk twenty kilometers into a protoplanet. The miners sell basalt for radiation shielding and buy everything else.' },
      ],
    });
    // Existing markets can buy the new good too.
    SYSTEMS.mars.planets[0].prices.basalt = 'H';
    SYSTEMS.earth.planets[0].prices.basalt = 'M';

    M.addOutfit('drill', {
      name: 'Mining laser', price: 7000, space: 2, max: 1,
      desc: 'A rock-cutting laser slaved to the fire control. Your guns hit 15% harder.',
      mod: s => { s.dmgMult *= 1.15; },
    });

    M.addEvent({
      title: 'Survey Beacon',
      text: 'An old Vesta survey beacon drifts across your path, still broadcasting a claim marker from before the Collective.',
      choices: [
        { label: 'Salvage it', run() { G.state.credits += 800; return 'The beacon\'s transmitter sells for 800 cr to the first collector who answers your ping.'; } },
        { label: 'Leave it', run: () => 'Somebody staked that claim. Let it keep watching.' },
      ],
    });

    // The Collective pays for pirates destroyed in Vesta space. M.state() is saved with the game.
    M.on('destroyed', (ship, byPlayer) => {
      if (!byPlayer || ship.kind !== 'pirate' || G.state.systemId !== 'vesta') return;
      const st = M.state();
      st.kills = (st.kills || 0) + 1;
      G.state.credits += 500;
      M.note(`Vesta Deep Mine pays a 500 cr bounty (${st.kills} pirate${st.kills > 1 ? 's' : ''} so far).`);
    });

    M.on('landed', planet => {
      const st = M.state();
      if (planet.name !== 'Vesta Deep Mine' || st.welcomed) return;
      st.welcomed = true;
      M.note('Welcome to Vesta. The mine pays 500 cr for every pirate you destroy in local space.');
    });
  },
});
