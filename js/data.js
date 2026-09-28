'use strict';

// Static game content: commodities, ships, and the galaxy.

const COMMODITIES = [
  { id: 'food', name: 'Food', base: 100 },
  { id: 'industrial', name: 'Industrial', base: 200 },
  { id: 'medical', name: 'Medical Supplies', base: 300 },
  { id: 'luxury', name: 'Luxury Goods', base: 450 },
  { id: 'metal', name: 'Metal', base: 150 },
  { id: 'equipment', name: 'Equipment', base: 350 },
];

// Price levels a planet can have for a commodity: Low, Medium, High.
const PRICE_MULT = { L: 0.75, M: 1.0, H: 1.3 };

const SHIPS = {
  shuttle:   { name: 'Shuttle',        price: 10000,  cargo: 20,  fuel: 300, shields: 60,  armor: 50,  accel: 170, maxSpeed: 260, turn: 3.0, guns: 1, size: 10, forSale: true,
               desc: 'A dependable little ship. Every captain starts somewhere.' },
  courier:   { name: 'Courier',        price: 45000,  cargo: 35,  fuel: 500, shields: 110, armor: 80,  accel: 260, maxSpeed: 380, turn: 3.8, guns: 1, size: 11, forSale: true,
               desc: 'Fast and long-legged. Popular with mail runners and smugglers.' },
  freighter: { name: 'Bulk Freighter', price: 90000,  cargo: 120, fuel: 400, shields: 180, armor: 260, accel: 100, maxSpeed: 200, turn: 1.8, guns: 1, size: 18, forSale: true,
               desc: 'A flying warehouse. Slow, sturdy, and very profitable.' },
  gunship:   { name: 'Viper Gunship',  price: 160000, cargo: 15,  fuel: 400, shields: 300, armor: 220, accel: 300, maxSpeed: 400, turn: 4.4, guns: 3, size: 12, forSale: true,
               desc: 'Three forward cannons and an attitude. Pirates hate it.' },
  raider:    { name: 'Raider',  price: 0, cargo: 10, fuel: 300, shields: 70,  armor: 60,  accel: 230, maxSpeed: 330, turn: 3.6, guns: 1, size: 10 },
  corsair:   { name: 'Corsair', price: 0, cargo: 20, fuel: 300, shields: 140, armor: 120, accel: 250, maxSpeed: 340, turn: 3.6, guns: 2, size: 13 },
};

const GOV_COLORS = { Federation: '#5fa8ff', Independent: '#d0d0d0', Pirate: '#ff5f5f' };

// Map coordinates (x, y) are for the galaxy map. Planet coordinates are in-system.
const SYSTEMS = {
  sol: {
    name: 'Sol', x: 400, y: 260, gov: 'Federation', pirates: 0, links: ['centauri', 'sirius', 'vega'],
    planets: [
      { name: 'Earth', x: -150, y: 80, r: 90, color: '#3a7bd5', services: ['trade', 'missions', 'shipyard', 'refuel'],
        prices: { food: 'M', industrial: 'L', medical: 'L', luxury: 'H', metal: 'H', equipment: 'L' },
        desc: 'The cradle of humanity and seat of the Federation. The spaceport sprawls across what used to be the Atlantic seaboard.' },
      { name: 'Mars', x: 380, y: -260, r: 55, color: '#c1440e', services: ['trade', 'missions', 'refuel'],
        prices: { food: 'H', industrial: 'M', metal: 'L', equipment: 'M' },
        desc: 'Terraforming is three centuries behind schedule. The domes of Olympus City glitter against the rust.' },
    ],
  },
  centauri: {
    name: 'Alpha Centauri', x: 300, y: 330, gov: 'Federation', pirates: 0.1, links: ['sol', 'tauceti', 'procyon'],
    planets: [
      { name: 'New Kent', x: 100, y: -120, r: 80, color: '#4caf50', services: ['trade', 'missions', 'refuel'],
        prices: { food: 'L', medical: 'H', luxury: 'M', equipment: 'H' },
        desc: 'Endless golden wheat fields feed half the Federation. The locals are friendly, if a little slow to haggle.' },
    ],
  },
  sirius: {
    name: 'Sirius', x: 500, y: 190, gov: 'Federation', pirates: 0.1, links: ['sol', 'altair', 'rigel'],
    planets: [
      { name: 'Sirius Anchorage', x: -60, y: -40, r: 45, color: '#b0bec5', services: ['trade', 'missions', 'shipyard', 'refuel'],
        prices: { industrial: 'M', medical: 'M', luxury: 'M', equipment: 'M', food: 'H' },
        desc: 'A vast orbital station and the Federation navy\'s forward base. Shipwrights here build to military spec.' },
    ],
  },
  vega: {
    name: 'Vega', x: 470, y: 350, gov: 'Federation', pirates: 0.15, links: ['sol', 'altair', 'deneb'],
    planets: [
      { name: 'Vega Prime', x: 200, y: 150, r: 85, color: '#8d6e63', services: ['trade', 'missions', 'refuel'],
        prices: { industrial: 'L', equipment: 'L', metal: 'H', food: 'H' },
        desc: 'Factory smog hides the surface from orbit. If it has moving parts, it was probably made on Vega Prime.' },
      { name: 'Lyra Station', x: -330, y: -200, r: 35, color: '#90a4ae', services: ['trade', 'refuel'],
        prices: { luxury: 'M', medical: 'M', food: 'M' },
        desc: 'A cramped waystation. The bar serves something called "coolant punch". Nobody asks what is in it.' },
    ],
  },
  tauceti: {
    name: 'Tau Ceti', x: 180, y: 400, gov: 'Independent', pirates: 0.3, links: ['centauri', 'procyon'],
    planets: [
      { name: 'Haven', x: -80, y: 160, r: 70, color: '#26a69a', services: ['trade', 'missions', 'refuel'],
        prices: { medical: 'L', food: 'L', luxury: 'H', industrial: 'H' },
        desc: 'A hospital world run by a medical cooperative. Their pharmaceuticals are the best and cheapest in the sector.' },
    ],
  },
  procyon: {
    name: 'Procyon', x: 170, y: 260, gov: 'Independent', pirates: 0.35, links: ['centauri', 'tauceti', 'kestrel'],
    planets: [
      { name: 'Procyon Dock', x: 150, y: 50, r: 50, color: '#a1887f', services: ['trade', 'missions', 'shipyard', 'refuel'],
        prices: { metal: 'M', equipment: 'H', food: 'M', industrial: 'M' },
        desc: 'Independent shipyards and no questions asked. Half the hulls here have had their registry numbers filed off.' },
    ],
  },
  altair: {
    name: 'Altair', x: 620, y: 260, gov: 'Independent', pirates: 0.25, links: ['sirius', 'vega', 'deneb'],
    planets: [
      { name: 'Altair Bazaar', x: -200, y: -100, r: 75, color: '#ffb74d', services: ['trade', 'missions', 'refuel'],
        prices: { luxury: 'L', food: 'H', medical: 'H' },
        desc: 'Silk, spice, and synthetic gemstones. The bazaar never closes and the merchants never stop talking.' },
    ],
  },
  rigel: {
    name: 'Rigel', x: 600, y: 100, gov: 'Independent', pirates: 0.4, links: ['sirius', 'kestrel'],
    planets: [
      { name: 'Rigel IV', x: 250, y: -150, r: 65, color: '#78909c', services: ['trade', 'missions', 'refuel'],
        prices: { metal: 'L', industrial: 'H', food: 'H', equipment: 'H' },
        desc: 'A mining colony strip-mined down to the mantle. The miners pay well for anything that is not rock.' },
    ],
  },
  deneb: {
    name: 'Deneb', x: 680, y: 410, gov: 'Independent', pirates: 0.45, links: ['vega', 'altair'],
    planets: [
      { name: 'Deneb Outpost', x: 60, y: 200, r: 40, color: '#9575cd', services: ['trade', 'missions', 'refuel'],
        prices: { medical: 'H', equipment: 'H', metal: 'L', food: 'M' },
        desc: 'The edge of charted space. Frontier settlers trade ore for anything that keeps them alive another season.' },
    ],
  },
  kestrel: {
    name: "Kestrel's Reach", x: 340, y: 90, gov: 'Pirate', pirates: 0.8, links: ['rigel', 'procyon'],
    planets: [
      { name: 'Blackrock', x: -120, y: -60, r: 60, color: '#455a64', services: ['trade', 'missions', 'refuel'],
        prices: { luxury: 'L', equipment: 'H', medical: 'H', food: 'H' },
        desc: 'A hollowed-out asteroid and pirate haven. Stolen luxury goods go cheap here, if you can get them out alive.' },
    ],
  },
};

const MISSION_GOODS = ['medical crates', 'machine parts', 'sealed diplomatic pouches', 'agricultural drones', 'prefab habitat panels', 'scientific samples'];
const PIRATE_NAMES = ['Red Mag Varga', 'Silas Thorn', 'The Widow Kade', 'Jax Morrow', 'Captain Ruin', 'Old Iron Tess'];
