import assert from 'node:assert/strict';
import test from 'node:test';
import { boundaryGapInsertion } from '../../src/solvers/boundaryRepair.js';

test('boundary-gap insertion adds independently valid pieces', () => {
  const result = boundaryGapInsertion({
    sides: [Math.SQRT2, 1, 1],
    width: 2,
    height: 1,
    step: 0.25,
    maxPieces: 8
  });
  assert.equal(result.verification.valid, true);
  assert.ok(result.inserted >= 4);
  assert.ok(result.attempts > 0);
});
