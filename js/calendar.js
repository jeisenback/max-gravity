'use strict';

// The year's culture, as data: shows that premiere, air weekly and end; books released
// a few at a time; leagues with a preseason, regular season, playoffs, a final and an
// off-season; and one-off broadcasts on fixed dates. Everything is a function of the
// game date, so nothing here is saved. social.js turns it into feeds and downtime.
// Loaded after family.js (calOf) and before social.js.

const YEAR = 365, EPISODE_DAYS = 7;

// Days since 1 January of that day's year (0 to 365).
function yday(day) {
  const c = calOf(day);
  return Math.round((Date.UTC(c.y, c.m - 1, c.d) - Date.UTC(c.y, 0, 1)) / 864e5);
}

// at: the day of the year a show premieres. It airs one episode a week for eps weeks,
// then is off until next year; the next premiere may be in the new year.
const SHOWS = [
  { id: 'harbor', title: 'Cold Harbor Blues', genre: 'noir', at: 5, eps: 10 },
  { id: 'hellas', title: 'Hellas Station', genre: 'soap', at: 35, eps: 12 },
  { id: 'burn', title: 'The Long Burn', genre: 'action', at: 60, eps: 10 },
  { id: 'wars', title: 'Belt Wars', genre: 'war', at: 90, eps: 12 },
  { id: 'air', title: 'Thin Air', genre: 'horror', at: 120, eps: 8 },
  { id: 'decks', title: 'Seven Decks', genre: 'comedy', at: 150, eps: 12 },
  { id: 'haulers', title: 'Ice Hauler Diaries', genre: 'doc', at: 185, eps: 8 },
  { id: 'tharsis', title: 'Tharsis Heights', genre: 'soap', at: 215, eps: 12 },
  { id: 'lagrange', title: 'Lagrange', genre: 'romance', at: 245, eps: 10 },
  { id: 'marshals', title: 'Dust Marshals', genre: 'action', at: 275, eps: 10 },
  { id: 'nightshift', title: 'Night Shift on Ceres', genre: 'noir', at: 305, eps: 12 },
  { id: 'letters', title: 'Letters from Luna', genre: 'romance', at: 335, eps: 10 },
];

// batch: 0 to 3, the quarter it comes out in.
const BOOK_BATCHES = [0, 91, 182, 273];
const BOOKS = [
  { title: 'The Salt Orbit', author: 'Imre Vallis', genre: 'noir', batch: 0 },
  { title: 'Borrowed Water', author: 'Dunya Okafor', genre: 'soap', batch: 0 },
  { title: 'Iron Promise', author: 'Teo Marchetti', genre: 'war', batch: 0 },
  { title: 'A Garden at Hellas', author: 'Pilar Nakamura', genre: 'romance', batch: 0 },
  { title: 'The Quiet Crown', author: 'Olu Brandt', genre: 'horror', batch: 1 },
  { title: 'Rations and Other Lies', author: 'Mina Costa', genre: 'comedy', batch: 1 },
  { title: 'Ice Lanes', author: 'Hanne Roka', genre: 'doc', batch: 1 },
  { title: 'The Long Horizon', author: 'Jabari Quill', genre: 'action', batch: 1 },
  { title: 'Broken Signal', author: 'Sef Anders', genre: 'noir', batch: 2 },
  { title: 'The Hollow Tide', author: 'Ruth Imanov', genre: 'horror', batch: 2 },
  { title: 'Bright Station', author: 'Lio Parvez', genre: 'comedy', batch: 2 },
  { title: 'Letters to Pallas', author: 'Ada Kessel', genre: 'romance', batch: 2 },
  { title: 'The Red Line', author: 'Tomas Eze', genre: 'war', batch: 3 },
  { title: 'What the Smelter Knew', author: 'Wen Halloran', genre: 'doc', batch: 3 },
  { title: 'Drifting Rations', author: 'Cleo Brandt', genre: 'soap', batch: 3 },
  { title: 'Last Burn to Titan', author: 'Marek Oyelaran', genre: 'action', batch: 3 },
];

// A league runs a year from `start` (day of the year): preseason, regular season,
// playoffs among the top two, a final on one day, then the off-season.
const LEAGUES = [
  { id: 'ringball', name: 'Ring-ball League', sport: 'ring-ball', culture: 'belt', start: 0, teams: ['Ceres Breakers', 'Pallas Smelters', 'Hygiea Ghosts', 'Vesta Hammers'] },
  { id: 'dome', name: 'Dome League', sport: 'dome hockey', culture: 'mars', start: 120, teams: ['Tharsis Red Tide', 'Hellas Diggers', 'Olympus Climbers', 'Valles Runners'] },
  { id: 'lunar', name: 'Lunar Cup', sport: 'low-g football', culture: 'earth', start: 240, teams: ['Luna Grays', 'Lagos Orbitals', 'Titan Frost', 'Tycho Wanderers'] },
];
const TEAMS = Object.fromEntries(LEAGUES.flatMap(l => l.teams.map(t => [t, l.culture])));
const PRESEASON = 30, REGULAR = 200, PLAYOFFS = 30;

// Which season of a league a day is in (keyed by the year it began) and how far into it.
function leagueSeason(l, day) {
  const y = calOf(day).y, d = yday(day);
  return d >= l.start ? { key: y, off: d - l.start } : { key: y - 1, off: d + YEAR - l.start };
}

function leaguePhase(l, day) {
  const { off } = leagueSeason(l, day);
  return off < PRESEASON ? 'preseason' : off < PRESEASON + REGULAR ? 'regular' : off < PRESEASON + REGULAR + PLAYOFFS ? 'playoffs' : off === PRESEASON + REGULAR + PLAYOFFS ? 'final' : 'off-season';
}

// Shows on the air that day, each with its episode number.
function airing(day) {
  const d = yday(day);
  return SHOWS.flatMap(s => {
    const off = (d - s.at + YEAR) % YEAR;
    if (off >= s.eps * EPISODE_DAYS) return [];
    const ep = Math.floor(off / EPISODE_DAYS) + 1;
    return [{ ...s, ep, premiere: ep === 1, finale: ep === s.eps }];
  });
}

// The books from the latest release: a few at a time.
function newBooks(day) {
  const d = yday(day), batch = BOOK_BATCHES.reduce((b, at, i) => (d >= at ? i : b), 0);
  return BOOKS.filter(b => b.batch === batch);
}

const BROADCASTS = [
  { m: 3, d: 12, title: 'The Landing Day Parade', genre: 'comedy', blurb: 'Every dome on Mars sends a float, and most of them are on fire in a planned way.' },
  { m: 5, d: 5, title: 'The Golden Airlock Awards', genre: 'soap', blurb: 'The feeds hand out the year\'s prizes, and the winners are all, somehow, related.' },
  { m: 7, d: 20, title: 'Tranquility Night: the Old Footage', genre: 'doc', blurb: 'The first Moon landing, the grainy version, with the whole of Earth and Luna watching at once.' },
  { m: 8, d: 2, title: 'The First Water Vigil', genre: 'doc', blurb: 'The Belt reads out its dead by name, one station after another, in a quiet that carries.' },
  { m: 10, d: 9, title: 'The Dome Day Concert', genre: 'romance', blurb: 'Five hundred voices in a pressurized hall under red cloth, and a song everyone knows.' },
  { m: 10, d: 31, title: 'Night of Dead Air', genre: 'horror', blurb: 'Every channel goes to static at midnight, and then something comes through.' },
  { m: 11, d: 11, title: 'The Armistice Broadcast', genre: 'war', blurb: 'The old fleets are read out in order, ship by ship, and the survivors are asked to stand.' },
  { m: 12, d: 31, title: 'The Year\'s End Gala', genre: 'comedy', blurb: 'A countdown to a midnight that means nothing out here, hosted by a very tired comedian.' },
];

function broadcastsOn(day) {
  const c = calOf(day);
  return BROADCASTS.filter(b => b.m === c.m && b.d === c.d);
}
