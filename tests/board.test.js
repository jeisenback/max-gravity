'use strict';

// The sensor board (js/board.js, #680): the raid's position model, by beat and style, and the plot drawn from it, in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const { raidBoard, boardSvg, BOARD_RANGES, BOARD_PD, SENSOR_GHOST, SENSOR_STALE } = load(['js/board.js'], {}, ['raidBoard', 'boardSvg', 'BOARD_RANGES', 'BOARD_PD', 'SENSOR_GHOST', 'SENSOR_STALE']);
const hauler = { maxSpeed: 200 }, raider = { maxSpeed: 330 }, destroyer = { maxSpeed: 230 };
const at = (beat, edge, style = 'grapple', foe = raider) => ({ ...raidBoard({ beat, edge, style, me: hauler, foe }) });

test('the position model: the range by beat and style, the bearing by the position, the closing rate by the ships', () => {
  assert.deepEqual([at(0, 0).range, at(1, 0).range, at(2, 0).range], [...BOARD_RANGES.grapple], 'a raider closes from forty kilometers to the passes');
  assert.equal(at(0, 0, 'gun').range, 30, 'a patrol opens at thirty');
  assert.ok(at(1, 0, 'torpedo').range > at(1, 0).range, 'a corsair stands off and fires');
  assert.equal(at(5, 0).range, BOARD_RANGES.grapple[2], 'a beat past the last keeps the last range');
  assert.equal(at(0, 0).bearing, 90, 'even: she is abeam');
  assert.ok(at(0, 2).bearing < 90 && at(0, -2).bearing > 90, 'ahead she is forward of the beam, behind she is on the quarter');
  assert.equal(at(0, 9).bearing, at(0, 3).bearing, 'the bearing stops at three ahead');
  assert.equal(at(0, 0).closing, 4, 'a raider against the hauler closes four kilometers a minute');
  assert.equal(at(0, 0, 'gun', destroyer).closing, 1, 'never under one');
  assert.deepEqual([at(0, 0).aspect, at(1, 0).aspect, at(1, 0, 'torpedo').aspect], ['closing', 'crossing', 'standing off']);
});

test('the plot: rings, your ship, her return at its bearing and range, the point defense arc, the sun, and the figures for a reader', () => {
  const svg = boardSvg(at(0, 0), { style: 'grapple', beat: 0, sunAngle: 0 });
  assert.match(svg, /^<svg class="board" viewBox="0 0 360 240" role="img" aria-label="Sensor board: range 40 km, closing 4 km a minute, bearing 90 degrees off the bow, closing\.">/);
  assert.equal((svg.match(/<circle class="ring"/g) || []).length, 4, 'rings every ten kilometers to forty');
  assert.match(svg, /<path class="pd"/, 'the point defense arc'); assert.match(svg, /<circle class="sun"/); assert.match(svg, /<circle class="contact"/); assert.match(svg, /RANGE 40 km/);
  assert.doesNotMatch(svg, /class="track"|class="ghost"|STALE|Position:/);
  const ahead = boardSvg(at(0, 2), { style: 'grapple', beat: 0, sunAngle: 0, word: 'ahead' });
  assert.match(ahead, /BEARING 040  AHEAD/); assert.match(ahead, /Position: ahead\./, 'the position is a readout on the board, and in its label');
  const closer = boardSvg(at(1, 0), { style: 'grapple', beat: 1, sunAngle: 0 });
  const r = s => Number(/<circle class="contact" cx="([\d.]+)" cy="([\d.]+)"/.exec(s).slice(1).reduce((d, v, i) => d + (v - [180, 120][i]) ** 2, 0) ** 0.5);
  assert.ok(r(closer) < r(svg), 'a pass is drawn closer than the closing');
  assert.match(boardSvg(at(1, 0, 'torpedo'), { style: 'torpedo', beat: 1, sunAngle: 0 }), /<line class="track"/, 'a torpedo on its way');
  assert.doesNotMatch(boardSvg(at(0, 0, 'torpedo'), { style: 'torpedo', beat: 0, sunAngle: 0 }), /class="track"/, 'none at the closing');
  assert.equal((boardSvg(at(0, 0), { style: 'grapple', beat: 0, sunAngle: 0, pack: true }).match(/<circle class="contact"/g) || []).length, 2, 'a pack is two returns');
});

test('sensor wear: worn, the plot shows a second return; failing, it shows her where she was last beat', () => {
  const now = at(1, 1), prev = at(0, 0);
  const worn = boardSvg(now, { style: 'grapple', beat: 1, sunAngle: 0, sensors: SENSOR_GHOST - 1, prev });
  assert.match(worn, /<circle class="ghost"/); assert.doesNotMatch(worn, /STALE/);
  const failing = boardSvg(now, { style: 'grapple', beat: 1, sunAngle: 0, sensors: SENSOR_STALE - 1, prev });
  assert.match(failing, /STALE/);
  assert.equal(/<circle class="contact" cx="([\d.]+)" cy="([\d.]+)"/.exec(failing)[0], /<circle class="contact" cx="([\d.]+)" cy="([\d.]+)"/.exec(boardSvg(prev, { style: 'grapple', beat: 0, sunAngle: 0 }))[0], 'her return is the last beat\'s');
  assert.doesNotMatch(boardSvg(now, { style: 'grapple', beat: 1, sunAngle: 0, sensors: SENSOR_STALE - 1 }), /STALE/, 'the first beat has nothing older to show');
  assert.ok(BOARD_PD > 0);
});
