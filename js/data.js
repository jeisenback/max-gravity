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
  shuttle:   { name: 'Rock Hopper',  price: 10000,  cargo: 20,  fuel: 300, berths: 3, shields: 60,  armor: 50,  accel: 170, maxSpeed: 260, turn: 3.0, guns: 1, size: 10, forSale: true,
               desc: 'A patched-up Belter skiff held together with sealant and optimism. Every captain starts somewhere.' },
  lightfreighter: { name: 'Ore Runner', price: 28000, cargo: 50, fuel: 300, berths: 3, shields: 90, armor: 100, accel: 150, maxSpeed: 250, turn: 2.6, guns: 1, size: 13, forSale: true,
               desc: 'The first real step up for an independent hauler. Two and a half times the hold of a Rock Hopper.' },
  courier:   { name: 'Torch Courier', price: 45000, cargo: 35,  fuel: 380, berths: 5, shields: 110, armor: 80,  accel: 260, maxSpeed: 380, turn: 3.8, guns: 1, size: 11, forSale: true,
               desc: 'All drive and very little else. Mail runners and smugglers swear by them.' },
  freighter: { name: 'Ice Hauler',   price: 90000,  cargo: 120, fuel: 450, berths: 6, shields: 180, armor: 260, accel: 100, maxSpeed: 200, turn: 1.8, guns: 1, size: 18, forSale: true,
               desc: 'A water tank the size of a city block with a drive bolted on. Slow, sturdy, and long-legged enough to reach Triton.' },
  gunship:   { name: 'Corvette',     price: 160000, cargo: 15,  fuel: 380, berths: 5, shields: 300, armor: 220, accel: 300, maxSpeed: 400, turn: 4.4, guns: 3, size: 12, forSale: true,
               desc: 'Decommissioned fast-attack ship with three forward gun mounts. Pirates give it a wide berth.' },
  raider:    { name: 'Raider',  price: 0, cargo: 10, fuel: 300, shields: 70,  armor: 60,  accel: 230, maxSpeed: 330, turn: 3.6, guns: 1, size: 10 },
  corsair:   { name: 'Corsair', price: 0, cargo: 20, fuel: 300, shields: 140, armor: 120, accel: 250, maxSpeed: 340, turn: 3.6, guns: 2, size: 13 },
};

const GOV_COLORS = {
  'Earth Coalition': '#5fa8ff',
  'Mars Republic': '#ff8a4a',
  'Belt Collective': '#e8d17a',
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
        desc: 'Solar furnaces the size of cities, running day and night in the glare. The foundry workers are well paid and badly homesick.' },
    ],
  },
  earth: {
    name: 'Earth', au: 1.0, angle: 100, gov: 'Earth Coalition', pirates: 0,
    planets: [
      { name: 'Earth', x: -150, y: 80, r: 95, color: '#3a7bd5', services: ['trade', 'missions', 'shipyard', 'refuel'],
        prices: { water: 'M', food: 'M', industrial: 'L', medical: 'L', luxury: 'H', metal: 'H', equipment: 'L' },
        desc: 'Thirty billion people, most of them on basic assistance. The orbital elevator ports never sleep.' },
      { name: 'Luna', x: 380, y: -260, r: 40, color: '#b8b8b8', services: ['missions', 'shipyard', 'refuel'],
        prices: {},
        desc: 'Coalition shipyards and navy drydocks under a black sky. Everyone here has an opinion about Mars.' },
    ],
  },
  mars: {
    name: 'Mars', au: 1.52, angle: 60, gov: 'Mars Republic', pirates: 0.05,
    planets: [
      { name: 'Mars', x: 100, y: -120, r: 70, color: '#c1440e', services: ['trade', 'missions', 'refuel'],
        prices: { equipment: 'H', food: 'H', water: 'H', medical: 'M', industrial: 'M', metal: 'L', luxury: 'M' },
        desc: 'Domed cities in the Mariner Valley, and a people who have spent generations fighting to make a dead world breathe.' },
      { name: 'Phobos Yards', x: -300, y: 220, r: 30, color: '#8d6e63', services: ['shipyard', 'refuel'],
        prices: {},
        desc: 'Military-grade shipwrights on a potato-shaped moon. Martian engineering is precise, and the price shows it.' },
    ],
  },
  ceres: {
    name: 'Ceres', au: 2.77, angle: 130, gov: 'Belt Collective', pirates: 0.2,
    planets: [
      { name: 'Ceres Station', x: -60, y: -40, r: 60, color: '#90a4ae', services: ['trade', 'missions', 'shipyard', 'refuel'],
        prices: { water: 'H', food: 'H', medical: 'H', metal: 'L', luxury: 'M', equipment: 'M', industrial: 'M' },
        desc: 'Six million people spun up inside a dwarf planet. Belters with long limbs and short tempers, and water rationing on every wall.' },
    ],
  },
  pallas: {
    name: 'Pallas', au: 2.77, angle: 20, gov: 'Belt Collective', pirates: 0.3,
    planets: [
      { name: 'Pallas Refinery', x: 200, y: 150, r: 45, color: '#78909c', services: ['trade', 'missions', 'refuel'],
        prices: { metal: 'L', industrial: 'H', food: 'H', water: 'H', equipment: 'H' },
        desc: 'Smelters glowing along the asteroid\'s spine. The refinery crews pay well for anything that is not rock.' },
    ],
  },
  hygiea: {
    name: 'Hygiea', au: 3.14, angle: 230, gov: 'Pirate', pirates: 0.8,
    planets: [
      { name: 'The Rook', x: -120, y: -60, r: 45, color: '#455a64', services: ['trade', 'missions', 'refuel'],
        prices: { luxury: 'L', equipment: 'H', medical: 'H', food: 'H', water: 'M' },
        desc: 'A hollowed-out rock nobody officially admits exists. Stolen luxury goods go cheap here, if you can get them out alive.' },
    ],
  },
  jupiter: {
    name: 'Jupiter', au: 5.2, angle: 160, gov: 'Independent', pirates: 0.2,
    planets: [
      { name: 'Ganymede', x: 150, y: 50, r: 70, color: '#a1887f', services: ['trade', 'missions', 'refuel'],
        prices: { food: 'L', medical: 'M', luxury: 'H', equipment: 'H' },
        desc: 'The breadbasket of the outer planets. Mirror arrays feed sunlight to agri-domes that grow food for half the Belt.' },
      { name: 'Europa', x: -350, y: -200, r: 55, color: '#d7ccc8', services: ['trade', 'refuel'],
        prices: { water: 'L', industrial: 'H' },
        desc: 'An ice shell over a hidden ocean. Europa\'s ice haulers fill the Belt\'s cisterns.' },
    ],
  },
  saturn: {
    name: 'Saturn', au: 9.54, angle: 110, gov: 'Belt Collective', pirates: 0.35,
    planets: [
      { name: 'Titan', x: -80, y: 160, r: 75, color: '#e0a040', services: ['trade', 'missions', 'shipyard', 'refuel'],
        prices: { medical: 'L', luxury: 'M', equipment: 'H', industrial: 'H' },
        desc: 'Orange haze and methane rain over the research domes. Titan\'s biolabs make the best pharmaceuticals this side of Earth.' },
      { name: 'Enceladus', x: 350, y: -250, r: 35, color: '#eceff1', services: ['trade', 'refuel'],
        prices: { water: 'L', food: 'H', metal: 'H' },
        desc: 'Ice geysers blasting into space. Haulers queue for hours to scoop the purest water in the system.' },
    ],
  },
  neptune: {
    name: 'Neptune', au: 30.1, angle: 70, gov: 'Independent', pirates: 0.45,
    planets: [
      { name: 'Triton Outpost', x: 60, y: 200, r: 45, color: '#9575cd', services: ['trade', 'missions', 'refuel'],
        prices: { medical: 'H', equipment: 'H', luxury: 'H', metal: 'L', water: 'L', food: 'M' },
        desc: 'The edge of human space, weeks from anywhere. Settlers here trade ore and ice for anything that keeps them alive another season.' },
    ],
  },
};

const MISSION_GOODS = ['medical crates', 'reactor parts', 'sealed diplomatic pouches', 'hydroponics kits', 'prefab habitat panels', 'scientific samples'];
const PIRATE_NAMES = ['Red Mag Varga', 'Silas Thorn', 'The Widow Kade', 'Jax Morrow', 'Captain Ruin', 'Old Iron Tess'];
