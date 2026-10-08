'use strict';

// Static game content: commodities, ships, and the solar system.

const COMMODITIES = [
  { id: 'water', name: 'Water', base: 80 },
  { id: 'food', name: 'Food', base: 100 },
  { id: 'industrial', name: 'Machine Parts', base: 200 },
  { id: 'medical', name: 'Medical Supplies', base: 300 },
  { id: 'luxury', name: 'Luxury Goods', base: 450 },
  { id: 'metal', name: 'Refined Metals', base: 150 },
  { id: 'equipment', name: 'Electronics', base: 350 },
];

// Price levels a market can have for a commodity: Low, Medium, High.
const PRICE_MULT = { L: 0.75, M: 1.0, H: 1.3 };

// `fuel` is reaction mass. Burn costs scale with distance (see burnFuel in game.js).
// `berths` are shared by crew and passengers.
const SHIPS = {
  shuttle:   { name: 'Dust Skiff',  price: 10000,  cargo: 20,  fuel: 300, berths: 4, shields: 60,  armor: 50,  accel: 170, maxSpeed: 260, turn: 3.0, guns: 1, size: 10, forSale: true,
               desc: 'A patched-up skiff held together with sealant and optimism. Every captain starts somewhere.' },
  lightfreighter: { name: 'Ore Runner', price: 28000, cargo: 50, fuel: 300, berths: 5, shields: 90, armor: 100, accel: 150, maxSpeed: 250, turn: 2.6, guns: 1, size: 13, forSale: true,
               desc: 'The first real step up for an independent hauler. Two and a half times the hold of a Dust Skiff.' },
  courier:   { name: 'Needle courier', price: 45000, cargo: 35,  fuel: 380, berths: 7, shields: 110, armor: 80,  accel: 260, maxSpeed: 380, turn: 3.8, guns: 1, size: 11, forSale: true,
               desc: 'All drive and very little else. Mail runners and smugglers swear by them.' },
  freighter: { name: 'Ice Hauler',   price: 90000,  cargo: 120, fuel: 450, berths: 10, shields: 180, armor: 260, accel: 100, maxSpeed: 200, turn: 1.8, guns: 1, size: 18, forSale: true,
               desc: 'A water tank the size of a city block with a drive bolted on. Slow, sturdy, and long-legged enough to reach Triton.' },
  gunship:   { name: 'Corvette',     price: 160000, cargo: 15,  fuel: 380, berths: 6, shields: 300, armor: 220, accel: 300, maxSpeed: 400, turn: 4.4, guns: 3, size: 12, forSale: true,
               req: 15, desc: 'Decommissioned fast-attack ship with three forward gun mounts. Pirates give it a wide berth. Sold only to captains the local government trusts.' },
  raider:    { name: 'Raider',  price: 22000, cargo: 10, fuel: 300, shields: 70,  armor: 60,  accel: 230, maxSpeed: 330, turn: 3.6, guns: 1, size: 10 },
  destroyer: { name: 'Destroyer', price: 240000, cargo: 40, fuel: 600, shields: 320, armor: 480, accel: 150, maxSpeed: 230, turn: 2.2, guns: 3, size: 22 },
  cutter:    { name: 'Patrol Cutter', price: 60000, cargo: 10, fuel: 300, shields: 150, armor: 140, accel: 260, maxSpeed: 350, turn: 3.8, guns: 2, size: 12 },
  corsair:   { name: 'Corsair', price: 55000, cargo: 20, fuel: 300, shields: 140, armor: 120, accel: 250, maxSpeed: 340, turn: 3.6, guns: 2, size: 13 },
};

const GOV_COLORS = {
  'Arcology Compact': '#5fa8ff',
  'Dome Concord': '#ff8a4a',
  'Charter League': '#e8d17a',
  'Independent': '#d0d0d0',
  'Pirate': '#d05fff',
};

// Bodies at the same location must not trade a commodity at different price levels,
// or players could hop between them for free profit.
// Each location sits on an orbit (`au` from the Sun, at `angle` degrees) for travel
// distances and the system map. Body coordinates (x, y) are local, for flight.
const SYSTEMS = {
  mercury: {
    name: 'Mercury', au: 0.39, angle: 200, gov: 'Independent', pirates: 0,
    planets: [
      { name: 'Hermes Foundry', x: 60, y: -40, r: 50, color: '#b0a090', services: ['trade', 'missions', 'refuel'],
        prices: { industrial: 'L', equipment: 'L', metal: 'M', food: 'H', water: 'H', luxury: 'M' },
        desc: ('Solar furnaces the size of cities, running day and night in the glare, and a skyline of radiator fins that glow cherry-red at the ' +
            'edges. The foundry workers are well paid and badly homesick: they earn hazard rates for every shift out under the Sun, and they spend it ' +
            'on long calls home and on food that tastes like somewhere else. Nobody stays a whole career. Everybody says they are only here for two ' +
            'more years.') },
    ],
  },
  earth: {
    name: 'Earth', au: 1.0, angle: 100, gov: 'Arcology Compact', pirates: 0,
    planets: [
      { name: 'Earth', x: -150, y: 80, r: 95, color: '#3a7bd5', services: ['trade', 'missions', 'shipyard', 'outfitter', 'refuel'],
        prices: { water: 'M', food: 'M', industrial: 'L', medical: 'L', luxury: 'H', metal: 'H', equipment: 'L' },
        desc: ('Arcology cities on every coast, each keeping its own sea wall by rota, and the orbital elevator ports never sleep. From the dock you can see the ' +
            'ribbon of lit cable dropping into a cloud deck the color of old pearls, and the freight climbing it in an endless string. Down there are ' +
            'oceans, and forests, and lines around the block for a job. Up here it is all customs queues, noodle stalls, and men in good suits looking ' +
            'for someone to blame.') },
      { name: 'Luna', x: 380, y: -260, r: 40, color: '#b8b8b8', services: ['missions', 'shipyard', 'outfitter', 'refuel'],
        prices: {},
        desc: ('Compact shipyards and licensed drydocks under a black sky, spread across the gray plain in long, hard-lit rows. The dust here gets into ' +
            'everything and never quite leaves, and every dockhand has a story about the one time they saw it float. Officers in pressed uniforms move ' +
            'through crowds of civilian riggers who resent them. Every yard here works under a Compact license, and every rigger can tell you what theirs cost.') },
    ],
  },
  mars: {
    name: 'Mars', au: 1.52, angle: 60, gov: 'Dome Concord', pirates: 0.05,
    planets: [
      { name: 'Mars', x: 100, y: -120, r: 70, color: '#c1440e', services: ['trade', 'missions', 'refuel'],
        prices: { equipment: 'H', food: 'H', water: 'H', medical: 'M', industrial: 'M', metal: 'L', luxury: 'M' },
        desc: ('Domed cities in the Mariner Valley, under a butterscotch sky, and a people who have spent generations fighting to make a dead world ' +
            'breathe. The air outside is still deadly, but the air inside the domes smells of green things and hot metal, and every tenth building has ' +
            'a mural of the day the first lake filled. Each dome keeps its own council and its own air accounts, and the budget meetings are held in the open, ' +
            'with a good deal of shouting. They also make excellent coffee.') },
      { name: 'Phobos Yards', x: -300, y: 220, r: 30, color: '#8d6e63', services: ['shipyard', 'outfitter', 'refuel'],
        prices: {},
        desc: ('Fleet shipwrights on a potato-shaped moon, so small that a good jump would put you into orbit, kept in work by the domes\' air levy. The yards are all clean lines ' +
            'and quiet efficiency: the same twenty engineers have been rebuilding the same class of hull since before you were born, and they will ' +
            'tell you, without emotion, exactly what is wrong with yours. Martian engineering is precise, and the price shows it. Nobody haggles here. ' +
            'It would be insulting to both sides.') },
    ],
  },
  ceres: {
    name: 'Ceres', au: 2.77, angle: 130, gov: 'Charter League', pirates: 0.2,
    planets: [
      { name: 'Ceres Station', x: -60, y: -40, r: 60, color: '#90a4ae', services: ['trade', 'missions', 'shipyard', 'outfitter', 'refuel'],
        prices: { water: 'H', food: 'H', medical: 'H', metal: 'L', luxury: 'M', equipment: 'M', industrial: 'M' },
        desc: ('Six million people burrowed into a dwarf planet, quick to argue and exact about what they are owed, and water rationing on every wall. The ' +
            'corridors curve upward in both directions, lined with hydroponic troughs, guild halls and hand-lettered notices about the day\'s allotment and the next berth vote. Children ' +
            'play in the low gravity with the easy grace of people who have never known any other. Everyone knows the price of a liter of water to the ' +
            'credit, and everyone will tell you when it changes.') },
      { name: 'Ring Nine', x: 260, y: 190, r: 22, color: '#8a8f86', services: ['trade', 'refuel'],
        prices: { water: 'H', food: 'H', medical: 'H' },
        desc: ('A squatter habitat bolted to a gutted ore carrier in Ceres\'s shadow: four thousand people who could not make Ceres rent, and the ' +
            'best noodles in the Belt. The corridors are the old cargo bays, hung with laundry and string lights, and the whole place smells of ginger ' +
            'and hot oil. There is no police force, but there is a rota, and nobody has ever been able to explain how it works. Strangers are fed ' +
            'before they are asked their business.') },
    ],
  },
  pallas: {
    name: 'Pallas', au: 2.77, angle: 20, gov: 'Charter League', pirates: 0.3,
    planets: [
      { name: 'Pallas Refinery', x: 200, y: 150, r: 45, color: '#78909c', services: ['trade', 'missions', 'refuel'],
        prices: { metal: 'L', industrial: 'H', food: 'H', water: 'H', equipment: 'H' },
        desc: ('Smelters glowing along the asteroid\'s spine in the black, feeding a river of slag into casting bays where the shifts change on the ' +
            'hour. The refinery crews pay well for anything that is not rock: fresh food, real coffee, a book with actual paper pages. Everyone here ' +
            'works hard and sleeps badly, and the company store on the main deck sells the only luxuries within a week\'s burn, at prices that are ' +
            'almost fair.') },
      { name: 'The Hollows', x: -170, y: -130, r: 24, color: '#7d8a80', services: ['trade', 'refuel'],
        prices: { food: 'H', water: 'H' },
        desc: ('The refinery families live here, in worked-out tunnels a short hop from the smelters, warm and dim and hung with quilts against the ' +
            'rock. Kids play ring-ball in the old ore chutes, their shouts carrying for a hundred meters, and every corner has a shrine to somebody\'s ' +
            'grandmother. It is a small place, and proud of it. Strangers get a cup of hot tea before a single question, and a great many questions ' +
            'after.') },
    ],
  },
  hygiea: {
    name: 'Hygiea', au: 3.14, angle: 230, gov: 'Pirate', pirates: 0.8,
    planets: [
      { name: 'The Rook', x: -120, y: -60, r: 45, color: '#455a64', services: ['trade', 'missions', 'outfitter', 'refuel'],
        prices: { luxury: 'L', equipment: 'H', medical: 'H', food: 'H', water: 'M' },
        desc: ('A hollowed-out rock nobody officially admits exists, with a dock authority that answers to no flag and a great many signs in a dozen ' +
            'languages that say the same thing: no weapons, no trouble. Stolen luxury goods go cheap here, if you can get them out alive. The ' +
            'bartenders are more polite than any you have ever met, and the polite ones are the ones you watch.') },
      { name: 'Boneyard', x: 230, y: 170, r: 28, color: '#6b6152', services: ['trade', 'outfitter', 'refuel'],
        prices: { medical: 'H', food: 'H' },
        desc: ('Three hundred dead ships lashed together into a town, their hulls welded into streets, their cargo bays turned into shops and homes. ' +
            'The salvagers who live here will sell you anything that came off a wreck, from a hull plate to a wedding ring, and never ask where your ' +
            'ship came from. At night the old running lights are turned on in patterns, and it looks like a fleet that never quite left port.') },
    ],
  },
  psyche: {
    name: 'Psyche', au: 2.92, angle: 320, gov: 'Independent', pirates: 0.25,
    planets: [
      { name: 'Ironheart', x: 40, y: -30, r: 40, color: '#8b8378', services: ['trade', 'missions', 'refuel'],
        prices: { metal: 'L', industrial: 'L', food: 'H', water: 'H', luxury: 'H', medical: 'M' },
        desc: ('The bare iron core of a dead protoplanet, riddled with the shafts of a hundred generations of prospectors, and a co-op meeting hall ' +
            'so worn from use that the floor has a groove in it. The prospectors vote on everything, including, once, whether to let you dock. They ' +
            'argue in long, cheerful, endlessly patient sessions, and the decisions somehow come out better than most governments manage. It is best ' +
            'not to be in a hurry.') },
    ],
  },
  juno: {
    name: 'Juno', au: 2.67, angle: 75, gov: 'Charter League', pirates: 0.15,
    planets: [
      { name: 'Juno Commons', x: -40, y: 50, r: 38, color: '#8f9c7a', services: ['trade', 'missions', 'refuel'],
        prices: { food: 'L', luxury: 'H', equipment: 'H', medical: 'H', water: 'M' },
        desc: ('Three thousand families and their greenhouses in a spun-up rock, every cabin with a window box and every corridor with a herb garden. ' +
            'Everyone knows everyone, and by the end of your shore leave they will know you: your name, your ship, and how you take your tea. The ' +
            'children hold the doors for strangers. The elders hold court in the shade of the lemon trees, and remember every ship that ever put in ' +
            'here and what it brought.') },
    ],
  },
  eros: {
    name: 'Eros', au: 1.46, angle: 250, gov: 'Independent', pirates: 0.1,
    planets: [
      { name: 'Eros Old Town', x: 30, y: 40, r: 32, color: '#a08a70', services: ['trade', 'missions', 'refuel'],
        prices: { metal: 'M', water: 'H', industrial: 'H', luxury: 'L', equipment: 'M' },
        desc: ('The first great mining boomtown, from when the Belt was a gold rush. Half the town is sealed off now, its corridors dark and cold, ' +
            'the signs still advertising assayers and dance halls. The half that is left drinks to the old days, and sells off the family silver a ' +
            'piece at a time. The barkeeps tell stories about fortunes that were made and lost in a single night, and about a vein of platinum that ' +
            'nobody ever found.') },
    ],
  },
  jupiter: {
    name: 'Jupiter', au: 5.2, angle: 160, gov: 'Independent', pirates: 0.2,
    planets: [
      { name: 'Ganymede', x: 150, y: 50, r: 70, color: '#a1887f', services: ['trade', 'missions', 'refuel'],
        prices: { food: 'L', medical: 'M', luxury: 'H', equipment: 'H' },
        desc: ('A moon of leasehold terraces: mirror arrays turning slowly overhead, feeding sunlight to agri-domes worked under leases that pass from parent to child, whose crops feed half ' +
            'the Belt. From the dock it looks like a small green sea under glass, with crop rows running to the horizon and irrigation booms tracing ' +
            'their slow arcs. The farmers are practical, sunburned, and wary of anyone who talks like a lease agent. They will feed you very well, and ' +
            'they will watch how you pay.') },
      { name: 'Europa', x: -350, y: -200, r: 55, color: '#d7ccc8', services: ['trade', 'refuel'],
        prices: { water: 'L', industrial: 'H' },
        desc: ('An ice shell over a hidden ocean, and the pumping stations that drink from it. The haulers here fill the Belt\'s cisterns, and the ' +
            'docks are a forest of long white hoses, each frozen to a glittering fringe. Beneath your feet the ice hums. The Water Authority runs ' +
            'everything with polite, unblinking efficiency, and every worker wears a small pin with a drop of blue enamel, which they touch when they ' +
            'talk about the crisis at Ceres.') },
    ],
  },
  saturn: {
    name: 'Saturn', au: 9.54, angle: 110, gov: 'Charter League', pirates: 0.35,
    planets: [
      { name: 'Titan', x: -80, y: 160, r: 75, color: '#e0a040', services: ['trade', 'missions', 'shipyard', 'outfitter', 'refuel'],
        prices: { medical: 'L', luxury: 'M', equipment: 'H', industrial: 'H' },
        desc: ('Orange haze and methane rain over the research domes, and a sky so thick that the light always seems to be late afternoon. Titan\'s ' +
            'biolabs make the best pharmaceuticals this side of Earth, and the scientists who run them are a tightly knit, slightly odd community who ' +
            'work in shifts and eat at the same long tables. They love visitors, and they love even more the news, the gossip, and the odd fresh ' +
            'vegetable that you bring.') },
      { name: 'Enceladus', x: 350, y: -250, r: 35, color: '#eceff1', services: ['trade', 'refuel'],
        prices: { water: 'L', food: 'H', metal: 'H' },
        desc: ('Ice geysers blasting into space in tall white plumes that catch the light of a distant Sun. Haulers queue for hours to scoop the ' +
            'purest water in the system, drifting in loose orbit while their crews watch the glittering fountain and swap news over the radio. There ' +
            'is a small dock crew, a smaller shop, and a great deal of quiet. Nobody who works here talks much, and everybody who visits leaves a ' +
            'little calmer.') },
    ],
  },
  neptune: {
    name: 'Neptune', au: 30.1, angle: 70, gov: 'Independent', pirates: 0.45,
    planets: [
      { name: 'Triton Outpost', x: 60, y: 200, r: 45, color: '#9575cd', services: ['trade', 'missions', 'refuel'],
        prices: { medical: 'H', equipment: 'H', luxury: 'H', metal: 'L', water: 'L', food: 'M' },
        desc: ('The edge of human space, weeks from anywhere, a handful of pressurized domes on a frozen world with a retrograde orbit. Settlers here ' +
            'trade ore and ice for anything that keeps them alive another season, and they measure time by supply ships. It is cold, and silent, and ' +
            'the sky is very dark, but the community is so tight-knit that nobody is ever lonely for long. They will remember your name for years.') },
    ],
  },
};

// Factions that track your standing. Independent ports do not.
const FACTIONS = ['Arcology Compact', 'Dome Concord', 'Charter League', 'Pirate'];
const PATROL_NAMES = { 'Arcology Compact': 'Compact cutter', 'Dome Concord': 'Concord frigate', 'Charter League': 'League militia' };

// Outfits take cargo space (`space`, tons) and modify the ship's stats; `max` per ship.
// `req` needs that much standing with the faction running the shop; `pirate` gear is
// only sold in pirate ports. Outfits move with you when you change ships.
const OUTFITS = {
  pdc:     { name: 'Close-defense turret', price: 6000, space: 3, max: 2, desc: 'An extra forward gun that also shoots down incoming torpedoes on its own.', mod: s => { s.guns += 1; } },
  launcher: { name: 'Torpedo launcher', price: 12000, space: 3, max: 1, desc: 'Fires homing torpedoes at your target (F). Slow off the rail, fast and hard-hitting after. Buy torpedoes at any outfitter.', mod: s => { s.launcher = true; } },
  heavy:   { name: 'Heavy rounds', price: 12000, space: 2, max: 1, req: 15, desc: 'Tungsten-cored ammunition. Your guns hit 40% harder.', mod: s => { s.dmgMult *= 1.4; } },
  armor:   { name: 'Armor plating', price: 4000, space: 4, max: 3, desc: '+40 armor.', mod: s => { s.armor += 40; } },
  shield:  { name: 'Deflector capacitor', price: 5000, space: 2, max: 3, desc: '+50 shields.', mod: s => { s.shields += 50; } },
  tank:    { name: 'Reaction mass tank', price: 3000, space: 5, max: 3, desc: '+100 reaction mass capacity.', mod: s => { s.fuel += 100; } },
  pod:     { name: 'Cargo pod', price: 2500, space: 0, max: 2, desc: '+15t cargo, at 5% less top speed.', mod: s => { s.cargo += 15; s.maxSpeed *= 0.95; } },
  drive:   { name: 'Drive tuning', price: 8000, space: 1, max: 1, desc: '+15% acceleration and top speed.', mod: s => { s.accel *= 1.15; s.maxSpeed *= 1.15; } },
  berth:   { name: 'Passenger berth', price: 3000, space: 3, max: 2, desc: '+1 berth for crew or passengers.', mod: s => { s.berths += 1; } },
  spoofer: { name: 'Transponder spoofer', price: 9000, space: 1, max: 1, req: 15, pirate: true, desc: 'Fakes transponders like a skill-1 slicer when you have none aboard.', mod: s => { s.spoofer = true; } },
};

const MISSION_GOODS = ['medical crates', 'reactor parts', 'sealed diplomatic pouches', 'hydroponics kits', 'prefab habitat panels', 'scientific samples'];
const PIRATE_NAMES = ['Red Mag Varga', 'Silas Thorn', 'The Widow Kade', 'Jax Morrow', 'Captain Ruin', 'Old Iron Tess'];
