import test from 'node:test';
import assert from 'node:assert/strict';
import { latticePortfolio } from '../../src/constructions/latticePortfolio.js';
import { adaptiveBoundarySearch } from '../../src/solvers/adaptive.js';

test('adaptive boundary search preserves validity and never removes the baseline', () => {
  const specification = { id: 'adaptive-test', name: 'Adaptive test', sides: [1, 1, 1], width: 5, height: 4, maxPieces: 80 };
  const baseline = latticePortfolio(specification);
  const result = adaptiveBoundarySearch({
    ...specification,
    initialState: baseline.state,
    orientationCount: 12,
    passes: 1
  });
  assert.equal(result.verification.valid, true);
  assert.ok(result.state.length >= baseline.state.length);
  assert.ok(result.verification.metrics.utilization >= baseline.metrics.utilization - 1e-10);
});
