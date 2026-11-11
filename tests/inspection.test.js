'use strict';

// Port inspections (#993, docs/superpowers/specs/2026-11-10-port-inspection-design.md): what a port's inspector finds and what it costs (js/inspection.js),
// in plain Node.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('./nodecontext');

const I = load(['js/data.js', 'js/inspection.js'], { Mods: { register() {}, filter: (n, v) => v } },
  ['LICENSED', 'INSPECTING', 'standingFine', 'licenceDuty', 'inspectionCause']);
const plain = o => (o ? { ...o } : o);

test('the owners that inspect, and the good each licenses', () => {
  assert.deepEqual({ ...I.LICENSED }, { 'Arcology Compact': 'medical', 'Dome Concord': 'water', 'Charter League': 'industrial' });
  assert.deepEqual([...I.INSPECTING], ['Arcology Compact', 'Dome Concord', 'Charter League']);
});

test('a fine for bad standing: none above -15, then 6,000 and 2,000 more for each five points, up to 14,000', () => {
  assert.deepEqual([-14, -15, -19, -20, -34, -35, -60].map(r => I.standingFine(r)), [0, 6000, 6000, 8000, 12000, 14000, 14000]);
});

test('the duty on a licensed good is 15% of its value, to the nearest 100', () => {
  assert.equal(I.licenceDuty('water', 100), 12000);
  assert.equal(I.licenceDuty('medical', 10), 4500);
});

test('what the inspector finds: nothing at a port that does not inspect, nothing on a clean ship, else the cause and one sum', () => {
  assert.equal(I.inspectionCause({ water: 50 }, 'Independent', -40, false), null);
  assert.equal(I.inspectionCause({ food: 10 }, 'Charter League', 0, false), null);
  assert.deepEqual(plain(I.inspectionCause({ water: 50 }, 'Dome Concord', 0, false)), { gov: 'Dome Concord', standing: null, good: 'water', tons: 50, duty: 6000, fine: 0, sum: 6000 });
  assert.deepEqual(plain(I.inspectionCause({}, 'Charter League', -22, false)), { gov: 'Charter League', standing: -22, good: null, tons: 0, duty: 0, fine: 8000, sum: 8000 });
  assert.equal(I.inspectionCause({ industrial: 20 }, 'Charter League', -15, false).sum, 12000, 'both causes, one sum');
  assert.equal(I.inspectionCause({ industrial: 20 }, 'Charter League', -15, true).sum, 14400, 'Marked: a fifth more');
});
