import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProblem } from '../../src/core/problem.js';
import { homogeneousCountBound } from '../../src/research/bounds.js';

test('homogeneous area/count bound is rigorous and no larger than the area bound', () => {
  const problem = normalizeProblem({
    width: 2,
    height: 1,
    fillSheet: false,
    maxPieces: 1,
    triangles: [{ id: 'T', sides: [1, 1, 1] }]
  });
  const bound = homogeneousCountBound(problem);
  assert.equal(bound.rigorous, true);
  assert.equal(bound.maximumCount, 4);
  assert.ok(bound.utilization <= 1);
});
