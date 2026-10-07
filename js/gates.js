'use strict';

// Choices that can be shut, with the reason as text (#374). A scene choice carries `can` (is it open?) and `why` (what to say when it
// is not, a string or a function); UI.showEvent draws the reason under a shut button, so a touch screen sees it as well as a
// mouse. `gated(...checks)` builds both from checks, each a [test, reason] pair, and the first to fail gives the reason:
//   { label: 'Buy a round (40 cr)', ...gated(needCr(40)), run() { ... } }
// Loaded early, because the scene tables are built as the scripts load; every check reads the game only when it is asked.

const gated = (...checks) => ({
  can: () => checks.every(([ok]) => ok()),
  why: () => { const fail = checks.find(([ok]) => !ok()); return fail ? fail[1]() : ''; },
});
const needCr = cost => [() => G.state.credits >= cost, () => `You have ${fmt(G.state.credits)} cr; this costs ${fmt(cost)} cr.`];
const needMass = n => [() => G.state.fuel >= n, () => `You have ${Math.floor(G.state.fuel)} reaction mass; this takes ${n}.`];
const needFunds = cost => [() => hired().fund >= cost, () => `The ship's funds have ${fmt(hired().fund)} cr; this takes ${fmt(cost)} cr.`];
const needBerth = [() => berthsFree() > 0, () => 'There is no free berth aboard.'];
const needRoom = [() => cargoFree() > 0, () => 'There is no room in the hold.'];
const needGoods = [() => hasTradeCargo(), () => 'There is no cargo in the hold to trade.'];
const needCrew = n => [() => G.state.crew.length >= n, () => `Needs at least ${n} crew aboard.`];
const notYet = (done, text = 'You have done that already.') => [() => !done(), () => text];
