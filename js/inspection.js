'use strict';

// Port inspections (#993, docs/superpowers/specs/2026-11-10-port-inspection-design.md). Open space is policed by nobody (docs/bible/jurisdictions.md):
// a port inspects a ship on arrival under its owner's rules. The Compact, the Concord and the League inspect; independent and pirate ports do not.
// Two causes: the ship's standing with the port's owner at -15 or worse, and a good that owner licenses for import, landed without its licence (a
// licence cannot be had yet, so a ship never holds one). These take what they read and return a value.

// The good each inspecting owner licenses for import.
const LICENSED = { 'Arcology Compact': 'medical', 'Dome Concord': 'water', 'Charter League': 'industrial' };
const INSPECTING = Object.keys(LICENSED);
const to100 = n => Math.round(n / 100) * 100;

// The fine for bad standing: none above -15; 6,000 at -15, and 2,000 more for each full five points below, up to 14,000.
const standingFine = rep => (rep > -15 ? 0 : Math.min(14000, 6000 + 2000 * Math.floor((-15 - rep) / 5)));
// The duty on a licensed good landed without its licence: 15% of its value at the good's base price.
const licenceDuty = (good, tons) => to100(0.15 * tons * COMMODITIES.find(c => c.id === good).base);

// What the inspector at a port of `gov` finds on a ship with `cargo` ({ good: tons }) and `rep` standing there: null at a port that does not inspect,
// or on a clean ship; else the causes and one sum, a fifth more when the hand is Marked (traits.js).
function inspectionCause(cargo, gov, rep, marked) {
  if (!INSPECTING.includes(gov)) return null;
  const good = LICENSED[gov], tons = (cargo && cargo[good]) || 0, duty = tons > 0 ? licenceDuty(good, tons) : 0, fine = standingFine(rep);
  if (!duty && !fine) return null;
  const sum = marked ? to100((duty + fine) * 1.2) : duty + fine;
  return { gov, standing: fine ? rep : null, good: duty ? good : null, tons: duty ? tons : 0, duty, fine, sum };
}
