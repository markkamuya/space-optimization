import assert from 'node:assert/strict';
import test from 'node:test';
import { describePhaseSelection, phaseGridDestination } from '../../src/ui/phaseGrid.js';

test('grid navigation follows rows, columns, and boundaries', () => {
  const move = (key, index, ctrlKey = false) => phaseGridDestination({ key, index, columns: 4, count: 10, ctrlKey });
  assert.equal(move('ArrowRight', 3), 4);
  assert.equal(move('ArrowLeft', 0), 0);
  assert.equal(move('ArrowDown', 7), 9);
  assert.equal(move('ArrowUp', 2), 0);
  assert.equal(move('Home', 6), 4);
  assert.equal(move('End', 6), 7);
  assert.equal(move('Home', 6, true), 0);
  assert.equal(move('End', 6, true), 9);
  assert.equal(move('Enter', 6), null);
});

test('selection description communicates geometry, fill, and evidence without color', () => {
  const verified = describePhaseSelection({
    angle: 60,
    ratio: 1.5,
    phase: { name: 'alternating rows', status: 'verified construction', utilization: 0.875 },
    nearestDistance: 0.0123
  });
  assert.match(verified, /60 degree triangle/);
  assert.match(verified, /87\.5% filled and 12\.5% empty/);
  assert.match(verified, /nearest verified sample is 0\.012/);

  const preview = describePhaseSelection({
    angle: 61,
    ratio: 1.55,
    phase: { name: 'modeled rows', status: 'preview', utilization: 0.8 }
  });
  assert.match(preview, /modeled preview, not a verified sampled result/);
});
